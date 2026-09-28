import test from 'node:test';
import assert from 'node:assert/strict';
import { createVocabularyAdapter } from '../pwa-reader/adapters/vocabularyAdapter.js';
import { getVocabularyPersonalizationState } from '../pwa-reader/levelBaselineEngine.js';
import { captureOccurrence, resolveCapture } from '../pwa-reader/identity/runtime.mjs';

function setup(profile = {}, terms = ['go', 'steal', 'give up', 'run out', 'run out of', 'bank', 'light', 'anxious']) {
  const writes = [];
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => profile,
    loadVocabularyData: async () => terms.map(term => ({ term, englishDefinition: `metadata:${term}` })),
    loadEffectiveKnownWordsForProfile: async p => getVocabularyPersonalizationState(['go'], p),
    addLearningWord: async term => writes.push(['learning', term]),
    markWordKnown: async term => writes.push(['known', term]),
    ignoreVocabularyWord: async term => writes.push(['hidden', term]),
  });
  return { adapter, writes };
}
const capture = (sentence, surface) => ({ sentence, targetOffset: sentence.indexOf(surface), targetEnd: sentence.indexOf(surface) + surface.length });

test('resolver-driven writes use canonical terms in the existing storage schema', async () => {
  const { adapter, writes } = setup();
  for (const [surface, canonical] of [['went', 'go'], ['stole', 'steal'], ['stolen', 'steal'], ['gave up', 'give up']]) {
    for (const state of ['known', 'learning', 'hidden']) {
      await adapter.setTermState(surface, state, capture(`They ${surface}.`, surface));
      assert.deepEqual(writes.at(-1), [state, canonical]);
    }
  }
});

test('uncertain and excluded resolver-driven writes cannot use guessed or forged keys', async () => {
  const { adapter, writes } = setup();
  for (const [sentence, term] of [['We run out.', 'run out'], ['We run out of water.', 'run out of'], ['Doctor Light arrived.', 'Light'], ['A florbnack.', 'florbnack']]) {
    await assert.rejects(adapter.setTermState(term, 'learning', { ...capture(sentence, term), canonicalTerm: 'go', libraryKey: 'en:go' }));
  }
  assert.deepEqual(writes, []);
});

test('manual Library and explicit freeform selection retain surface capture', async () => {
  const { adapter, writes } = setup();
  await adapter.addLibraryLearningTerm('florbnack');
  await adapter.setTermState('personal phrase', 'learning');
  await adapter.setTermState('run out', 'learning', { ...capture('We run out.', 'run out'), freeform: true });
  assert.deepEqual(writes, [['learning', 'florbnack'], ['learning', 'personal phrase'], ['learning', 'run out']]);
});

test('Preview deduplicates resolved forms, keeps metadata, and uses canonical profile eligibility', async () => {
  const chapter = { plainText: 'They went. Someone stole it. It was stolen. They gave up. A bank lends. The river bank flooded.' };
  const { adapter } = setup({ learningWords: ['go', 'steal'], knownWords: ['bank'], ignoredWords: ['give up'] });
  const vocabulary = await adapter.getReaderVocabulary(chapter);
  const rows = adapter.getChapterPreview(chapter, vocabulary.items);
  assert.deepEqual(rows.map(row => row.term).sort(), ['go', 'steal']);
  assert.equal(rows.find(row => row.term === 'steal').englishDefinition, 'metadata:steal');
  assert.equal(rows.find(row => row.term === 'go').personalization.boostedByLearningWords, true);
});

test('Preview excludes titled names and never canonicalizes ambiguous phrases', async () => {
  const chapter = { plainText: 'Doctor Light arrived. The light faded. We run out of water. An anxious child waited.' };
  const { adapter, writes } = setup();
  const vocabulary = await adapter.getReaderVocabulary(chapter);
  const rows = adapter.getChapterPreview(chapter, vocabulary.items);
  const light = rows.find(row => row.term === 'light');
  assert.equal(rows.some(row => row.term.startsWith('run out')), false);
  assert.ok(light);
  assert.ok(light.capture.sentence.slice(light.capture.targetOffset).startsWith('light faded'));
  const anxious = rows.find(row => row.term === 'anxious');
  assert.equal(anxious.capture.freeform, true);
  await adapter.setTermState(anxious.term, 'learning', anxious.capture);
  assert.deepEqual(writes, [['learning', 'anxious']]);
});

test('resolved surface entries obey canonical Known/Hidden and Learning lookups', async () => {
  const chapter = { plainText: 'They went. It was stolen.' };
  for (const profile of [{ knownWords: ['go', 'steal'] }, { ignoredWords: ['go', 'steal'] }]) {
    const { adapter } = setup(profile, ['went', 'stolen']);
    const vocabulary = await adapter.getReaderVocabulary(chapter);
    assert.deepEqual(adapter.getChapterPreview(chapter, vocabulary.items), []);
  }
  const { adapter } = setup({ learningWords: ['go', 'steal'] }, ['went', 'stolen']);
  const vocabulary = await adapter.getReaderVocabulary(chapter);
  const rows = adapter.getChapterPreview(chapter, vocabulary.items);
  assert.deepEqual(rows.map(row => row.term).sort(), ['go', 'steal']);
  assert.ok(rows.every(row => row.personalization.boostedByLearningWords));
});

test('capture rejects partial tokens and phrases instead of inventing identity', async () => {
  const { adapter, writes } = setup();
  for (const [sentence, surface] of [['We went home.', 'went home'], ['They gave up.', 'gave'], ['They went.', 'wen']]) {
    await assert.rejects(adapter.setTermState(surface, 'learning', capture(sentence, surface)));
  }
  await assert.rejects(adapter.setTermState('go', 'learning', {}));
  await assert.rejects(adapter.setTermState('go', 'learning', capture('It was stolen.', 'stolen')));
  assert.deepEqual(writes, []);
});

test('bounded capture preserves title abbreviations and declines pathological context', () => {
  const text = 'We waited. Dr. Light arrived. The light faded.';
  const occurrence = captureOccurrence(text, text.indexOf('Light'), text.indexOf('Light') + 5);
  assert.equal(resolveCapture(occurrence).status, 'excluded');
  for (const sentence of ['Dr\nLight arrived.', 'Dr.\r\nLight arrived.']) {
    assert.equal(resolveCapture(capture(sentence, 'Light')).status, 'excluded');
  }
  assert.equal(resolveCapture(capture('word '.repeat(1000) + 'went', 'went')), null);
  assert.equal(resolveCapture(capture('turn '.repeat(400) + '.', 'turn')), null);
});

test('selection in a long multi-sentence paragraph still resolves its own occurrence', async () => {
  const { adapter, writes } = setup();
  const sentence = 'A short sentence. '.repeat(300) + 'They went home.';
  await adapter.setTermState('went', 'learning', { ...capture(sentence, 'went'), freeform: true });
  assert.deepEqual(writes, [['learning', 'go']]);
});

test('oversized contexts produce no automatic controls with unwritable captures', async () => {
  const { adapter } = setup({}, ['turn']);
  const chapter = { plainText: 'turn '.repeat(400) + '.' };
  const vocabulary = await adapter.getReaderVocabulary(chapter);
  assert.deepEqual(adapter.getChapterPreview(chapter, vocabulary.items), []);
});
