import { entries, phrases } from './lexicon.mjs';
import { objectShape, phraseRisk, isDeterminer } from './phrase-constraints.mjs';

export function normalize(text) {
  return String(text).normalize('NFKC').replace(/[\u2018\u2019]/g, "'")
    .toLowerCase().trim().replace(/\s+/gu, ' ');
}

// Experimental key namespace, not a persisted-data migration. POS and sense are
// intentionally absent: bank's financial and river meanings share one key.
export function libraryKey(term) {
  const value = normalize(term);
  if (!value || !/^[\p{L}\p{M}]+(?:[' -][\p{L}\p{M}]+)*$/u.test(value)) return null;
  return `en:${encodeURIComponent(value)}`;
}

export function tokenize(sentence) {
  return [...sentence.matchAll(/[\p{L}\p{M}]+(?:['\u2018\u2019][\p{L}\p{M}]+)*(?:[-\u2010\u2011][\p{L}\p{M}]+)*/gu)]
    .map(match => ({ raw: match[0], word: normalize(match[0]), start: match.index, end: match.index + match[0].length }));
}

function plural(base) {
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ies';
  return base + (/(s|x|z|ch|sh|o)$/.test(base) ? 'es' : 's');
}

function regularForms(entry) {
  const { term, pos, double, invariant } = entry;
  if (invariant) return [];
  if (pos === 'noun') return entry.irregular ? [] : [plural(term)];
  if (pos !== 'verb') return [];
  const stem = double ? term + term.at(-1) : term;
  const ing = term.endsWith('ie') ? term.slice(0, -2) + 'ying'
    : /[^e]e$/.test(term) ? term.slice(0, -1) + 'ing' : stem + 'ing';
  const ed = /[^aeiou]y$/.test(term) ? term.slice(0, -1) + 'ied'
    : term.endsWith('e') ? term + 'd' : stem + 'ed';
  return [plural(term), ing, ...(entry.irregular ? [] : [ed])];
}

const forms = new Map();
for (const entry of entries) {
  for (const [kind, values] of [
    ['identity', [entry.term]], ['irregular', entry.irregular || []], ['regular', regularForms(entry)],
  ]) {
    for (const value of values) {
      const candidates = forms.get(value) || [];
      if (!candidates.some(c => c.term === entry.term && c.pos === entry.pos)) {
        candidates.push({ term: entry.term, pos: entry.pos, kind });
      }
      forms.set(value, candidates);
    }
  }
}

const nameCollisions = new Set(['rose', 'will', 'may', 'mark', 'grace']);
const posValues = new Set(['noun', 'verb', 'adjective', 'adverb', 'proper-noun']);

// This is a deliberately narrow local cue system, NOT a POS tagger. It only
// disambiguates directly adjacent determiners/possessives, to, and auxiliaries.
function localPos(tokens, index, sentence) {
  const previous = tokens[index - 1];
  if (!previous || !/^\s+$/u.test(sentence.slice(previous.end, tokens[index].start))) return null;
  if (['a', 'an', 'the', 'this', 'these', 'those', 'my', 'your', 'his', 'her', 'our', 'their'].includes(previous.word)) return 'noun';
  if (['to', 'will', 'would', 'could', 'should', 'must', 'has', 'have', 'had'].includes(previous.word)) return 'verb';
  return null;
}

function candidatesFor(word, pos) {
  return (forms.get(word) || []).filter(c => !pos || c.pos === pos);
}

function phraseMatches(sentence, tokens, target, hintFor) {
  const matches = [];
  for (let start = 0; start <= target; start++) {
    for (const phrase of phrases) {
      const words = phrase.term.split(' ');
      const head = tokens[start];
      const verbPhrase = phrase.kind === 'phrasal-verb';
      if (verbPhrase) {
        // A supplied POS hint describes the selected token, not an earlier head.
        const headPos = hintFor(head) || localPos(tokens, start, sentence);
        if (headPos && headPos !== 'verb') continue;
        if (!candidatesFor(head.word, 'verb').some(c => c.term === words[0])) continue;
      } else if (head.word !== words[0]) continue;
      for (const gap of phrase.separable ? [0, 1, 2, 3, 4, 5, 6] : [0]) {
        const indices = [start, ...words.slice(1).map((_, i) => start + i + 1 + gap)];
        if (!indices.includes(target)) continue;
        if (!indices.slice(1).every((index, i) => tokens[index]?.word === words[i + 1])) continue;
        const end = indices.at(-1);
        // Do not bridge commas, quotes, dashes, sentence breaks or hyphens.
        if (tokens.slice(start, end).some((token, i) => !/^\s+$/u.test(sentence.slice(token.end, tokens[start + i + 1].start)))) continue;
        const shape = gap ? objectShape(tokens.slice(start + 1, start + 1 + gap), candidatesFor, hintFor) : null;
        if (gap && shape !== 'accepted') {
          // A clause is not a separable object. A plausible but unsupported NP
          // remains unresolved instead of silently persisting the bare verb.
          if (shape === 'clause-or-complex' || !isDeterminer(tokens[start + 1]?.word)) continue;
        }
        const following = tokens[end + 1];
        const adjacentFollowing = following && /^\s+$/u.test(sentence.slice(tokens[end].end, following.start)) ? following.word : null;
        matches.push({ phrase, indices, gap, risk: phraseRisk(phrase, gap, adjacentFollowing, shape) });
      }
    }
  }
  return matches.sort((a, b) => b.indices.length - a.indices.length || a.gap - b.gap);
}

/** Resolve the token containing targetOffset (UTF-16 offset in the original sentence).
 * posHint is optional, externally supplied, and never inferred from benchmark gold.
 * Unknown/ambiguous occurrences have null keys; callers must not persist them.
 * Confidence is an evidence label, not a calibrated probability. No sense/gloss API.
 */
export function resolveOccurrence({ sentence, targetOffset, posHint = null, properName = false, tokenHints = [] }) {
  if (typeof sentence !== 'string' || !Number.isInteger(targetOffset) || targetOffset < 0 || targetOffset >= sentence.length) {
    throw new TypeError('Expected a sentence and an in-range UTF-16 targetOffset');
  }
  if (posHint !== null && !posValues.has(posHint)) throw new TypeError('Unsupported posHint');
  if (!Array.isArray(tokenHints) || tokenHints.some(h => !h || !Number.isInteger(h.start) || !Number.isInteger(h.end)
    || h.start < 0 || h.end <= h.start || h.end > sentence.length || !posValues.has(h.pos))) {
    throw new TypeError('Expected bounded token POS hints');
  }
  const tokens = tokenize(sentence);
  const index = tokens.findIndex(t => t.start <= targetOffset && targetOffset < t.end);
  const token = tokens[index];
  // Require exact original offsets; never align a model token by array index.
  const hintFor = t => {
    if (t === token && posHint) return posHint;
    const hints = tokenHints.filter(h => h.start === t.start && h.end === t.end);
    const values = [...new Set(hints.map(h => h.pos))];
    return values.length === 1 ? values[0] : null;
  };
  const targetPos = token ? hintFor(token) : null;
  const base = { surfaceForm: token?.raw || '', canonicalTerm: null, libraryKey: null, confidence: 'unresolved' };
  const unresolved = (reason, candidates = []) => ({ ...base, reason, candidates: [...new Set(candidates.map(c => c.term))].sort() });
  if (!token) return unresolved('not-a-lexical-token');
  if (properName || targetPos === 'proper-noun') return unresolved('proper-name');
  const capitalized = token.raw !== token.raw.toLowerCase();
  if (!targetPos && capitalized && nameCollisions.has(token.word)) return unresolved('name-or-lexeme');
  if (token.word.includes("'")) return unresolved('contraction-or-possessive');
  const matches = phraseMatches(sentence, tokens, index, hintFor);
  if (matches.length) {
    const best = matches[0];
    if (best.risk) return unresolved(best.risk);
    const tied = matches.filter(m => m.indices.length === best.indices.length && m.gap === best.gap);
    if (new Set(tied.map(m => m.phrase.term)).size > 1) return unresolved('phrase-ambiguity');
    const selected = best.indices.map(i => tokens[i]);
    const head = selected[0];
    return {
      ...base,
      surfaceForm: sentence.slice(head.start, selected.at(-1).end),
      canonicalTerm: best.phrase.term, libraryKey: libraryKey(best.phrase.term), confidence: 'lexical-match',
      phraseMatch: {
        kind: best.phrase.kind, separable: Boolean(best.gap),
        // The enclosing surface includes the object; segments exclude it.
        segments: selected.map(t => ({ start: t.start, end: t.end })),
      },
      ...(best.phrase.kind === 'phrasal-verb' ? { morphology: {
        source: head.raw, lemma: best.phrase.term.split(' ')[0], kind: candidatesFor(head.word, 'verb').find(c => c.term === best.phrase.term.split(' ')[0]).kind,
      } } : {}),
    };
  }
  const all = forms.get(token.word) || [];
  const pos = targetPos || localPos(tokens, index, sentence);
  const candidates = candidatesFor(token.word, pos);
  if (!all.length) return unresolved(capitalized ? 'possible-name-or-unknown' : 'out-of-inventory');
  if (!candidates.length) return unresolved('pos-conflict', all);
  const terms = [...new Set(candidates.map(c => c.term))];
  if (terms.length !== 1) return unresolved('ambiguous-lemma', candidates);
  const selected = candidates[0];
  return {
    ...base, canonicalTerm: selected.term, libraryKey: libraryKey(selected.term),
    confidence: pos ? (targetPos ? 'pos-supplied' : 'local-pos-cue') : 'lexical-match',
    morphology: { source: token.raw, lemma: selected.term, kind: selected.kind },
  };
}
