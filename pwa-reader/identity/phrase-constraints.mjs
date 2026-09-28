// Bounded syntax heuristics, not a parser or semantic classifier. These words
// license object structure only; they do not create canonical lexical entries.
const determiners = new Set('a an the this that these those my your his her its our their each every some any no'.split(' '));
const pronouns = new Set('it him her them me us you'.split(' '));
const modifiers = new Set('big small little large old young new long short heavy light bright dark red blue green black white wooden'.split(' '));
const barriers = new Set('who whom whose which that when where why how if because while although after before until since and or but nor then there here to of at in on off up out down over under into through from with without is are was were be been being am can could will would shall should may might must do does did has have had not'.split(' '));
const subjectPronouns = new Set('i he she we they'.split(' '));

export const isDeterminer = word => determiners.has(word);
export const startsComplement = word => determiners.has(word) || pronouns.has(word);

/** DET + at most four modifiers/compound nouns + NOUN, or one object pronoun.
 * Unknown single heads are permitted only after DET; unknown modifiers are not.
 * POS can license compounds/participial adjectives. Prepositions, relatives,
 * coordination and interpolated punctuation remain outside this bounded grammar.
 */
export function objectShape(tokens, candidatesFor, hintFor) {
  if (tokens.length === 1 && pronouns.has(tokens[0].word)) return 'accepted';
  if (tokens.length < 2 || tokens.length > 6 || !determiners.has(tokens[0].word)) return 'unsupported';
  const content = tokens.slice(1);
  if (content.some(t => barriers.has(t.word) || subjectPronouns.has(t.word) || t.word.includes("'"))) return 'clause-or-complex';
  // Inspect the whole gap before an unknown modifier can short-circuit it.
  if (content.some(t => {
    const pos = hintFor(t);
    if (pos) return ['verb', 'adverb', 'proper-noun'].includes(pos);
    const candidates = candidatesFor(t.word, null);
    return !candidates.some(c => c.pos === 'noun' || c.pos === 'adjective')
      && (candidates.some(c => c.pos === 'verb') || /(?:ed|ing|ly)$/.test(t.word));
  })) return 'clause-or-complex';
  for (let i = 0; i < content.length; i++) {
    const token = content[i];
    const pos = hintFor(token);
    const last = i === content.length - 1;
    if (pos) {
      if (last ? pos !== 'noun' : !['noun', 'adjective'].includes(pos)) return 'unsupported';
      continue;
    }
    const candidates = candidatesFor(token.word, null);
    if (candidates.some(c => c.pos === 'noun')) continue;
    if (!last && (modifiers.has(token.word) || candidates.some(c => c.pos === 'adjective') || /(?:ous|ful|less|ive|able|ible|ic|ish)$/.test(token.word))) continue;
    // Do not mistake a finite verb or adverb for an unknown noun in a clause.
    if (candidates.some(c => c.pos === 'verb') || /(?:ed|ing|ly)$/.test(token.word)) return 'clause-or-complex';
    if (!last || !/^[a-z]+$/.test(token.word)) return 'unsupported';
  }
  return 'accepted';
}

export function phraseRisk(phrase, gap, following, shape) {
  if (gap && shape !== 'accepted') return 'unsupported-separable-object';
  if (phrase.ambiguous) return 'literal-or-idiomatic';
  if (!gap && phrase.requiresSeparation) return 'particle-or-preposition';
  if (phrase.separable && startsComplement(following)) return 'particle-or-preposition';
  if (phrase.ambiguousDeterminedComplement && isDeterminer(following)) return 'argument-frame-ambiguity';
  return null;
}
