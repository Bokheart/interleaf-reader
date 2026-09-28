import { entries as a2Entries, phrases } from './lexicon.mjs';
export { phrases };

// POS completion of the existing small inventory, not a production dictionary.
// Identity is shared across POS; left is an independent adjective/adverb entry
// as well as an inflection of leave. No held-out-driven sentence rules.
const additions = [
  ...'walk watch study love move dance hope turn look pick kick run plan stop drop leave wind'.split(' ').map(term => ({ term, pos: 'noun' })),
  ...'bank bat seal light match book box water'.split(' ').map(term => ({ term, pos: 'verb', double: term === 'bat' })),
  ...'light live left'.split(' ').map(term => ({ term, pos: 'adjective' })),
  { term: 'left', pos: 'adverb' },
];
const entries = [...a2Entries, ...additions];
export const nameCollisions = new Set('rose will may mark grace hope'.split(' '));

function plural(term) {
  if (/[^aeiou]y$/.test(term)) return term.slice(0, -1) + 'ies';
  return term + (/(s|x|z|ch|sh|o)$/.test(term) ? 'es' : 's');
}

function regular(entry) {
  const { term, pos, invariant, double, irregular } = entry;
  if (invariant) return [];
  if (pos === 'noun') return irregular ? [] : [plural(term)];
  if (pos !== 'verb') return [];
  const stem = double ? term + term.at(-1) : term;
  const ing = term.endsWith('ie') ? term.slice(0, -2) + 'ying' : /[^e]e$/.test(term) ? term.slice(0, -1) + 'ing' : stem + 'ing';
  const ed = /[^aeiou]y$/.test(term) ? term.slice(0, -1) + 'ied' : term.endsWith('e') ? term + 'd' : stem + 'ed';
  return [plural(term), ing, ...(irregular ? [] : [ed])];
}

const index = new Map();
for (const entry of entries) {
  for (const [kind, words] of [['identity', [entry.term]], ['irregular', entry.irregular || []], ['regular', regular(entry)]]) {
    for (const word of words) {
      const items = index.get(word) || [];
      if (!items.some(c => c.term === entry.term && c.pos === entry.pos && c.kind === kind)) items.push({ term: entry.term, pos: entry.pos, kind });
      index.set(word, items);
    }
  }
}

export function lexicalCandidates(word) {
  return (index.get(word) || []).map(c => ({ ...c }));
}
