// Original, deliberately small experimental inventory. No production dataset imports.
// Inflections are licensed by entries, never inferred for arbitrary unknown strings.
export const entries = [
  ...[
    ['steal', 'stole stolen'], ['go', 'went gone'], ['run', 'ran'],
    ['take', 'took taken'], ['give', 'gave given'], ['write', 'wrote written'],
    ['eat', 'ate eaten'], ['break', 'broke broken'], ['speak', 'spoke spoken'],
    ['choose', 'chose chosen'], ['bring', 'brought'], ['buy', 'bought'],
    ['think', 'thought'], ['catch', 'caught'], ['teach', 'taught'],
    ['see', 'saw seen'], ['wind', 'wound'], ['leave', 'left'],
    ['find', 'found'], ['fall', 'fell fallen'], ['rise', 'rose risen'],
    ['lie', 'lay lain'], ['lay', 'laid'], ['read', 'read'], ['put', 'put'], ['set', 'set'],
  ].map(([term, forms]) => ({ term, pos: 'verb', irregular: forms.split(' '), double: ['run', 'put', 'set'].includes(term) })),
  // The second lie entry licenses lied (deceive); lay/lain above license recline.
  // Both senses intentionally retain the same canonical identity.
  ...['walk', 'watch', 'study', 'carry', 'love', 'move', 'dance', 'hope',
    'turn', 'look', 'pick', 'kick', 'record', 'object', 'saw', 'wound',
    'found', 'lie', 'will', 'mark', 'grace'].map(term => ({ term, pos: 'verb' })),
  { term: 'may', pos: 'verb', invariant: true },
  ...['stop', 'plan', 'drop'].map(term => ({ term, pos: 'verb', double: true })),
  ...['bank', 'bat', 'seal', 'light', 'match', 'record', 'object', 'saw', 'wound',
    'book', 'box', 'story', 'bus', 'glass', 'news', 'series', 'rose', 'will', 'mark', 'grace',
    'bucket', 'door', 'water'].map(term => ({ term, pos: 'noun', invariant: ['news', 'series'].includes(term) })),
  { term: 'leaf', pos: 'noun', irregular: ['leaves'] },
  { term: 'life', pos: 'noun', irregular: ['lives'] },
  { term: 'child', pos: 'noun', irregular: ['children'] },
  { term: 'mouse', pos: 'noun', irregular: ['mice'] },
  { term: 'axe', pos: 'noun', irregular: ['axes'] },
  { term: 'axis', pos: 'noun', irregular: ['axes'] },
  { term: 'live', pos: 'verb' },
  ...['blue', 'good', 'better'].map(term => ({ term, pos: 'adjective' })),
];

// Longest lexical-token match wins. Frame metadata requests abstention where
// syntax alone cannot distinguish a lexical particle from a literal path.
export const phrases = [
  { term: 'run out of', kind: 'phrasal-verb', ambiguousDeterminedComplement: true },
  { term: 'run out', kind: 'phrasal-verb' },
  { term: 'give up', kind: 'phrasal-verb', separable: true },
  { term: 'take off', kind: 'phrasal-verb', separable: true },
  { term: 'turn off', kind: 'phrasal-verb', separable: true },
  { term: 'turn on', kind: 'phrasal-verb', separable: true },
  { term: 'pick up', kind: 'phrasal-verb', separable: true },
  { term: 'look up', kind: 'phrasal-verb', separable: true, requiresSeparation: true },
  { term: 'look after', kind: 'phrasal-verb' },
  { term: 'put up with', kind: 'phrasal-verb' },
  { term: 'in spite of', kind: 'fixed' },
  { term: 'by and large', kind: 'fixed' },
  { term: 'of course', kind: 'fixed' },
  { term: 'at once', kind: 'fixed' },
  { term: 'kick the bucket', kind: 'fixed', ambiguous: true },
];
