import { normalize, tokenize, libraryKey, resolveOccurrence as resolveA2 } from './resolver.mjs';
import { lexicalCandidates, phrases, nameCollisions } from './identity-lexicon.mjs';

const posValues = new Set(['noun', 'verb', 'adjective', 'adverb', 'proper-noun']);
const titles = new Set('mr mrs ms miss dr doctor professor captain sir lady lord reverend'.split(' '));
const nominal = new Set('a an the this these those my your his her our their'.split(' '));
const hardBoundary = /[.!?;\r\n]/u;

function localEvidence(sentence, tokens, index) {
  const previous = tokens[index - 1];
  if (!previous || !/^\s+$/u.test(sentence.slice(previous.end, tokens[index].start))) return null;
  if (previous.word === 'please') return 'imperative';
  if (nominal.has(previous.word)) return 'nominal';
  return null;
}

// Detect hypotheses across complex objects, even when the bounded A2 grammar
// cannot accept them. Soft punctuation may weaken a phrase, never license it.
// No fixed distance cutoff that could silently turn a long phrase into a word.
function phraseHypotheses(sentence, tokens, target) {
  const hypotheses = [];
  for (let start = 0; start <= target; start++) {
    for (const phrase of phrases) {
      const words = phrase.term.split(' ');
      const head = tokens[start];
      const inflectHead = phrase.kind === 'phrasal-verb' || phrase.ambiguous;
      if (inflectHead ? !lexicalCandidates(head.word).some(c => c.pos === 'verb' && c.term === words[0]) : head.word !== words[0]) continue;
      const lastStart = phrase.separable ? tokens.length - 1 : start + 1;
      for (let tail = start + 1; tail <= lastStart; tail++) {
        const indices = [start, ...words.slice(1).map((_, i) => tail + i)];
        if (!indices.includes(target)) continue;
        if (!indices.slice(1).every((i, j) => tokens[i]?.word === words[j + 1])) continue;
        const end = indices.at(-1);
        if (tokens.slice(start, end).some((t, i) => hardBoundary.test(sentence.slice(t.end, tokens[start + i + 1].start)))) continue;
        hypotheses.push({ term: phrase.term, indices, head: words[0] });
      }
    }
  }
  return hypotheses;
}

function groupCandidates(items, predictedPos) {
  const grouped = new Map();
  for (const item of items) {
    const candidate = grouped.get(item.term) || { canonicalTerm: item.term, evidence: [], confidence: 'lexical' };
    for (const proof of item.evidence || [`lexicon:${item.pos}:${item.kind}`]) {
      if (!candidate.evidence.includes(proof)) candidate.evidence.push(proof);
    }
    if (predictedPos && item.pos === predictedPos) {
      const proof = `predicted-pos-support:${predictedPos}`;
      if (!candidate.evidence.includes(proof)) candidate.evidence.push(proof);
      candidate.confidence = 'corroborated';
    }
    grouped.set(item.term, candidate);
  }
  return [...grouped.values()].sort((a, b) => a.canonicalTerm.localeCompare(b.canonicalTerm));
}

/** Only status=resolved carries a libraryKey. Confidence labels describe evidence,
 * not calibrated probabilities. posHint is verified caller evidence; predictedPos
 * is explicitly advisory. Neither a predicted tag nor candidate ordering selects
 * an identity. Name hypotheses and unresolved phrase structure take precedence.
 */
export function resolveOccurrence({ sentence, targetOffset, posHint = null, predictedPos = null, properName = false }) {
  if (typeof sentence !== 'string' || !Number.isInteger(targetOffset) || targetOffset < 0 || targetOffset >= sentence.length) throw new TypeError('Expected sentence and in-range UTF-16 offset');
  if ((posHint !== null && !posValues.has(posHint)) || (predictedPos !== null && !posValues.has(predictedPos))) throw new TypeError('Unsupported POS evidence');
  if (typeof properName !== 'boolean') throw new TypeError('properName must be boolean');
  const tokens = tokenize(sentence);
  const index = tokens.findIndex(t => t.start <= targetOffset && targetOffset < t.end);
  const token = tokens[index];
  const evidence = predictedPos ? [`predicted-pos:${predictedPos}`] : [];
  const output = (status, reason, items = [], extra = {}) => {
    const candidates = groupCandidates(items, predictedPos);
    const resolved = status === 'resolved' && candidates.length === 1;
    if (status === 'resolved' && !resolved) throw new Error('Resolved identity must have exactly one candidate');
    return {
      surfaceForm: token?.raw || '', canonicalTerm: resolved ? candidates[0].canonicalTerm : null,
      libraryKey: resolved ? libraryKey(candidates[0].canonicalTerm) : null,
      status, confidence: resolved ? 'supported' : status === 'excluded' ? 'excluded' : 'uncertain',
      evidence: [...evidence, reason], candidates, reason, ...extra,
    };
  };
  if (!token) return output('unresolved', 'not-a-lexical-token');
  const all = lexicalCandidates(token.word);
  const previous = tokens[index - 1];
  const capitalized = /^\p{Lu}/u.test(token.raw);
  const titled = capitalized && previous && titles.has(previous.word)
    && /^\.?\s+$/u.test(sentence.slice(previous.end, token.start));
  if (properName || posHint === 'proper-noun' || titled) return output('excluded', 'explicit-name-evidence');
  if (token.word.includes("'")) return output('excluded', 'contraction-or-possessive');

  const cue = localEvidence(sentence, tokens, index);
  if (cue) evidence.push(`local-context:${cue}`);
  let candidates = all;
  if (capitalized && nameCollisions.has(token.word)) {
    // A specific lexical context may lift a known collision. Predicted POS and
    // sentence-initial capitalization alone never do so. Other capitalized words
    // are not blanket-excluded or blanket-treated as names.
    const lexicalContext = cue === 'nominal' ? all.filter(c => c.pos === 'noun')
      : cue === 'imperative' ? all.filter(c => c.pos === 'verb' && c.kind === 'identity') : [];
    if (!lexicalContext.length) return output('ambiguous', 'name-or-lexeme', all);
    candidates = lexicalContext;
    evidence.push('lexical-context-over-name-hypothesis');
  }

  const hypotheses = phraseHypotheses(sentence, tokens, index);
  if (hypotheses.length) {
    const inherited = resolveA2({ sentence, targetOffset });
    const term = inherited.canonicalTerm;
    const phrase = phrases.find(p => p.term === term);
    // Motion vs depletion and look-after's temporal/care readings require
    // contextual evidence. Contiguous turn + directional particle is also weak.
    const weakFrame = term?.startsWith('run out') || term === 'look after'
      || (term?.startsWith('turn ') && !inherited.phraseMatch?.separable);
    const verifiedConflict = posHint && posHint !== 'verb' && hypotheses.some(h => h.indices[0] === index && phrases.find(p => p.term === h.term)?.kind === 'phrasal-verb');
    if (inherited.phraseMatch && phrase && !weakFrame && !verifiedConflict) {
      return output('resolved', 'licensed-phrase-boundaries', [{ term, evidence: ['lexical-phrase', 'deterministic-boundaries'] }], {
        surfaceForm: inherited.surfaceForm, phraseMatch: inherited.phraseMatch,
        ...(inherited.morphology ? { morphology: inherited.morphology } : {}),
      });
    }
    const items = [...candidates];
    for (const h of hypotheses) {
      items.push({ term: h.term, evidence: ['suspected-lexical-phrase', 'unverified-boundaries'] });
      items.push({ term: h.head, evidence: ['possible-literal-head'] });
    }
    return output('ambiguous', 'phrase-or-literal-unresolved', items);
  }

  if (!all.length) return output('unresolved', 'out-of-inventory');
  if (posHint) {
    evidence.push(`verified-pos:${posHint}`);
    const compatible = candidates.filter(c => c.pos === posHint);
    if (!compatible.length) return output(candidates.length > 1 ? 'ambiguous' : 'unresolved', 'verified-pos-conflict', candidates);
    candidates = compatible;
  }
  if (predictedPos && !candidates.some(c => c.pos === predictedPos)) evidence.push('predicted-pos-conflict-retained-lexical-evidence');
  const identities = [...new Set(candidates.map(c => c.term))];
  if (identities.length !== 1) return output('ambiguous', 'multiple-licensed-identities', candidates);
  const selected = candidates[0];
  return output('resolved', 'unique-licensed-identity', candidates, {
    morphology: { source: token.raw, lemma: selected.term, kind: selected.kind },
  });
}
