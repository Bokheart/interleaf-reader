import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import { resolveOccurrence } from '../pwa-reader/identity/identity-resolver.mjs';
const get = (sentence, word, extra = {}) => resolveOccurrence({ sentence, targetOffset: sentence.indexOf(word), ...extra });
const terms = result => result.candidates.map(c => c.canonicalTerm).sort();

test('required C6 identities preserve frozen v0 behavior without WSD', () => {
  for (const [sentence, surface, canonical] of [
    ['They went home.', 'went', 'go'],
    ['Someone stole it.', 'stole', 'steal'],
    ['It was stolen.', 'stolen', 'steal'],
    ['They gave up.', 'gave up', 'give up'],
    ['The bank lends money.', 'bank', 'bank'],
    ['The river bank flooded.', 'bank', 'bank'],
  ]) {
    const result = get(sentence, surface);
    assert.equal(result.status, 'resolved');
    assert.equal(result.canonicalTerm, canonical);
    assert.equal(result.libraryKey, `en:${encodeURIComponent(canonical)}`);
  }
  for (const surface of ['run out', 'run out of', 'ran out', 'ran out of']) {
    const result = get(`We ${surface} water.`, surface);
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.canonicalTerm, null);
    assert.equal(result.libraryKey, null);
  }
});

test('production identity policy and lexicon retain frozen A3 LF hashes', async () => {
  for (const [file, expected] of [
    ['identity-resolver.mjs', '57762a2a2e7673cb53f7789f6925e91baa2da640e8780dea5e9881687e1ea153'],
    ['identity-lexicon.mjs', 'd74db19d6a95bdbce9cb6a68da02e810988ca0508538fabc5ba068a2f1a35726'],
  ]) {
    const source = await readFile(new URL(`../pwa-reader/identity/${file}`, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex'), expected);
  }
});

test('resolved outputs carry auditable evidence and the only writable key', () => {
  const result = get('Someone stole my umbrella.', 'stole');
  assert.equal(result.status, 'resolved');
  assert.equal(result.canonicalTerm, 'steal');
  assert.equal(result.libraryKey, 'en:steal');
  assert.ok(result.evidence.length);
  assert.ok(result.candidates[0].evidence.length);
  assert.equal(result.candidates[0].canonicalTerm, 'steal');
});

test('same-POS homographs preserve all licensed candidates', () => {
  const result = get('They saw it.', 'saw');
  assert.equal(result.status, 'ambiguous');
  assert.deepEqual(terms(result), ['saw', 'see']);
  assert.equal(result.canonicalTerm, null);
  assert.equal(result.libraryKey, null);
});

test('predicted POS annotates but cannot collapse morphological ambiguity', () => {
  for (const predictedPos of ['noun', 'verb', 'adjective', 'proper-noun']) {
    const result = get('It lives nearby.', 'lives', { predictedPos });
    assert.equal(result.status, 'ambiguous');
    assert.deepEqual(terms(result), ['life', 'live']);
    assert.equal(result.libraryKey, null);
    assert.ok(result.evidence.includes(`predicted-pos:${predictedPos}`));
  }
});

test('verified POS may narrow candidates, while impossible/conflicting tags do not erase them', () => {
  assert.equal(get('It lives nearby.', 'lives', { posHint: 'verb' }).canonicalTerm, 'live');
  const conflict = get('It lives nearby.', 'lives', { posHint: 'adjective' });
  assert.deepEqual(terms(conflict), ['life', 'live']);
  assert.equal(conflict.libraryKey, null);
});

test('name collisions survive predicted verb tags; explicit names are excluded', () => {
  for (const name of ['Rose', 'Will', 'Mark', 'Grace', 'May', 'Hope']) {
    const result = get(`${name} answered softly.`, name, { predictedPos: 'verb' });
    assert.equal(result.status, 'ambiguous', name);
    assert.equal(result.libraryKey, null, name);
  }
  assert.equal(get('A bank waited.', 'bank', { properName: true }).status, 'excluded');
  assert.equal(get('Doctor Light arrived.', 'Light', { predictedPos: 'noun' }).status, 'excluded');
});

test('normal sentence/dialogue capitalization is not a name exclusion rule', () => {
  for (const [word, lemma] of [['Walk', 'walk'], ['Books', 'book'], ['Light', 'light'], ['STOLEN', 'steal']]) {
    const result = get(`“${word}!”`, word, { predictedPos: 'proper-noun' });
    assert.equal(result.status, 'resolved', word);
    assert.equal(result.canonicalTerm, lemma);
  }
  assert.equal(get('Please Mark this spot.', 'Mark', { predictedPos: 'proper-noun' }).canonicalTerm, 'mark');
  assert.equal(get('A Rose survived.', 'Rose', { predictedPos: 'verb' }).canonicalTerm, 'rose');
});

test('POS metadata covers lexical noun/verb/adjective overlap without splitting identity', () => {
  for (const posHint of ['noun', 'verb', 'adjective']) assert.equal(get('Light.', 'Light', { posHint }).canonicalTerm, 'light');
  assert.equal(get('The live broadcast.', 'live', { posHint: 'adjective' }).canonicalTerm, 'live');
  assert.equal(get('Her left sleeve.', 'left', { posHint: 'adjective' }).canonicalTerm, 'left');
  assert.equal(get('A plan existed.', 'plan', { posHint: 'noun' }).canonicalTerm, 'plan');
});

test('complex, coordinated, relative and interpolated objects cannot silently yield bare verbs', () => {
  for (const [sentence, head, phrase] of [
    ['Turn the device under that loose shelf off.', 'Turn', 'turn off'],
    ['Pick the dish and two spoons up.', 'Pick', 'pick up'],
    ['Take the hat which was made yesterday off.', 'Take', 'take off'],
    ['Give the desire you kept hidden for so many years up.', 'Give', 'give up'],
    ['Look that alias, unfamiliar to everyone, up.', 'Look', 'look up'],
  ]) {
    const result = get(sentence, head, { predictedPos: 'verb' });
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.libraryKey, null);
    assert.ok(terms(result).includes(phrase));
    assert.ok(terms(result).includes(head.toLowerCase()));
  }
});

test('literal particle frames retain both word and phrase hypotheses', () => {
  for (const [sentence, word, candidates] of [
    ['Look up through a skylight.', 'Look', ['look', 'look up']],
    ['They ran out of shelter.', 'ran', ['run', 'run out', 'run out of']],
    ['Turn off into a valley.', 'Turn', ['turn', 'turn off']],
  ]) {
    const result = get(sentence, word);
    assert.equal(result.status, 'ambiguous');
    for (const candidate of candidates) assert.ok(terms(result).includes(candidate));
    assert.equal(result.libraryKey, null);
  }
});

test('certain separated phrases keep lexical segments while excluding their object', () => {
  const sentence = 'We picked a green suitcase up.';
  for (const word of ['picked', 'up']) {
    const result = get(sentence, word);
    assert.equal(result.status, 'resolved');
    assert.equal(result.canonicalTerm, 'pick up');
    assert.deepEqual(result.phraseMatch.segments.map(s => sentence.slice(s.start, s.end)), ['picked', 'up']);
  }
  assert.equal(get(sentence, 'suitcase').phraseMatch, undefined);
});

test('hard sentence boundaries prevent unrelated particles from capturing a word', () => {
  assert.equal(get('She turned a leaf. Off went the bell.', 'turned').canonicalTerm, 'turn');
  assert.equal(get('Look! Up there.', 'Look').canonicalTerm, 'look');
});

test('exclusion, uncertainty and ignorance are distinct, with no writable fallback keys', () => {
  assert.equal(get('We won’t agree.', 'won’t').status, 'excluded');
  assert.equal(get('A florbnack.', 'florbnack').status, 'unresolved');
  for (const result of [get('Rose spoke.', 'Rose'), get('A florbnack.', 'florbnack'), get('We won’t agree.', 'won’t')]) {
    assert.equal(result.libraryKey, null);
    assert.equal(result.canonicalTerm, null);
    assert.ok(result.evidence.length);
  }
});

test('candidate arrays cannot mutate future answers and carry no gloss fields', () => {
  const result = get('I saw it.', 'saw');
  result.candidates[0].evidence.push('tampered');
  const next = get('I saw it.', 'saw');
  assert.equal(next.candidates.some(c => c.evidence.includes('tampered')), false);
  assert.equal(JSON.stringify(next).includes('gloss'), false);
});
