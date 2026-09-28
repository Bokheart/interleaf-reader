import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createVocabularyAdapter } from '../pwa-reader/adapters/vocabularyAdapter.js';
import { loadEffectiveKnownWordsForProfile, resolveCanonicalForm } from '../pwa-reader/levelBaselineEngine.js';
import { resolveCapture } from '../pwa-reader/identity/runtime.mjs';

const readerRoot = new URL('../pwa-reader/', import.meta.url);
const fetchImpl = async path => ({ ok: true, json: async () => JSON.parse(await readFile(new URL(path, readerRoot), 'utf8')) });
const capture = (sentence, surface) => ({ sentence, targetOffset: sentence.indexOf(surface), targetEnd: sentence.indexOf(surface) + surface.length });

async function setup(profile = {}, terms = ['go', 'steal', 'give up', 'run out', 'run out of'], overrides = {}) {
  const writes = [];
  const state = await loadEffectiveKnownWordsForProfile({ selectedLevel: 'level1', ...profile }, { fetchImpl });
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => state.normalizedProfile,
    loadVocabularyData: async () => terms.map(term => ({ term, englishDefinition: `metadata:${term}` })),
    loadEffectiveKnownWordsForProfile: async () => ({ ...state, ...overrides }),
    addLearningWord: async term => writes.push(['learning', term]),
    markWordKnown: async term => writes.push(['known', term]),
    ignoreVocabularyWord: async term => writes.push(['hidden', term]),
  });
  const preview = async plainText => {
    const chapter = { plainText };
    const vocabulary = await adapter.getReaderVocabulary(chapter);
    return adapter.getChapterPreview(chapter, vocabulary.items);
  };
  return { adapter, writes, state, preview };
}

test('went resolves to go and inherits the actual L1 baseline', async () => {
  const { state, preview } = await setup({}, ['went']);
  assert.equal(resolveCapture(capture('They went home.', 'went')).canonicalTerm, 'go');
  assert.equal(resolveCanonicalForm('went', state.formIndex), 'go');
  assert.equal(state.effectiveKnownWords.has('go'), true);
  assert.deepEqual(await preview('They went home.'), []);
});

test('canonical Learning overrides the actual baseline for went', async () => {
  const { preview } = await setup({ learningWords: ['go'] }, ['went']);
  const rows = await preview('They went home.');
  assert.deepEqual(rows.map(row => row.term), ['go']);
  assert.equal(rows[0].personalization.boostedByLearningWords, true);
});

test('stolen uses steal for Known, Hide, Learning and profile writes', async () => {
  for (const field of ['knownWords', 'ignoredWords', 'learningWords']) {
    const { adapter, preview, writes } = await setup({ [field]: ['steal'] }, ['stolen']);
    const rows = await preview('It was stolen.');
    assert.deepEqual(rows.map(row => row.term), field === 'learningWords' ? ['steal'] : []);
    for (const state of ['known', 'hidden', 'learning']) {
      await adapter.setTermState('stolen', state, capture('It was stolen.', 'stolen'));
      assert.deepEqual(writes.at(-1), [state, 'steal']);
    }
  }
});

test('gave up remains a whole give up identity despite known component words', async () => {
  const { state, preview } = await setup({}, ['give up']);
  assert.equal(state.effectiveKnownWords.has('give'), true);
  assert.equal(state.effectiveKnownWords.has('up'), true);
  const rows = await preview('They gave up.');
  assert.deepEqual(rows.map(row => row.term), ['give up']);
  assert.ok(rows[0].matchTerms.includes('gave up'));
});

test('phrase inventory cannot promote ambiguous run out occurrences', async () => {
  const inventory = await (await fetchImpl('../data/level-corpus/interleaf-level-corpus-v2.0.0-frozen/phrase_inventory.json')).json();
  assert.match(JSON.stringify(inventory), /run out/);
  const { state, preview, adapter, writes } = await setup();
  for (const surface of ['run out', 'run out of']) {
    const occurrence = capture(`We ${surface} water.`, surface);
    const identity = resolveCapture(occurrence);
    assert.equal(identity.status, 'ambiguous');
    assert.equal(identity.canonicalTerm, null);
    assert.equal(identity.libraryKey, null);
    assert.equal(state.effectiveKnownWords.has(surface), false);
    assert.deepEqual(await preview(occurrence.sentence), []);
    await assert.rejects(adapter.setTermState(surface, 'learning', occurrence));
  }
  assert.deepEqual(writes, []);
});

test('stealed gets neither a corpus guess nor an authoritative steal write', async () => {
  const { state, preview, adapter, writes } = await setup({}, ['steal', 'stealed']);
  const occurrence = capture('They stealed it.', 'stealed');
  assert.equal(resolveCanonicalForm('stealed', state.formIndex), 'stealed');
  assert.equal(resolveCapture(occurrence).status, 'unresolved');
  assert.equal(resolveCapture(occurrence).canonicalTerm, null);
  assert.deepEqual((await preview(occurrence.sentence)).map(row => row.term), ['stealed']);
  await assert.rejects(adapter.setTermState('stealed', 'learning', occurrence));
  assert.deepEqual(writes, []);
});

test('resolved forms share one Preview row and one canonical Library write', async () => {
  const { preview, adapter, writes } = await setup({ learningWords: ['steal'] }, ['stole', 'stolen']);
  const rows = await preview('Someone stole it. It was stolen.');
  assert.deepEqual(rows.map(row => row.term), ['steal']);
  assert.ok(rows[0].matchTerms.includes('stole'));
  assert.ok(rows[0].matchTerms.includes('stolen'));
  await adapter.setTermState(rows[0].term, 'learning', rows[0].capture);
  assert.deepEqual(writes, [['learning', 'steal']]);
});

test('ambiguous captures cannot forge a canonical global state through corpus forms', async () => {
  const { adapter, writes } = await setup();
  await assert.rejects(adapter.setTermState('run out of', 'known', {
    ...capture('We run out of water.', 'run out of'), canonicalTerm: 'run out of', libraryKey: 'en:run%20out%20of'
  }));
  assert.deepEqual(writes, []);
});

test('explicit manual and freeform capture keep surfaces without resolver authority', async () => {
  const { adapter, writes } = await setup();
  await adapter.addLibraryLearningTerm('florbnack');
  await adapter.setTermState('run out of', 'learning', { ...capture('We run out of water.', 'run out of'), freeform: true });
  assert.deepEqual(writes, [['learning', 'florbnack'], ['learning', 'run out of']]);
});

test('actual corpus levels produce different assistance density after identity resolution', async () => {
  const terms = ['go', 'steal', 'anxious', 'relentless', 'umbrella'];
  const text = 'They went. It was stolen. An anxious child carried an umbrella through relentless rain.';
  const l1 = await setup({ selectedLevel: 'level1' }, terms);
  const l5 = await setup({ selectedLevel: 'level5' }, terms);
  const lowRows = await l1.preview(text);
  const highRows = await l5.preview(text);
  assert.ok(lowRows.length > highRows.length, `${lowRows.length} > ${highRows.length}`);
});

test('invalid selectedLevel loads the exact level3 baseline with identity enabled', async () => {
  const { state, preview } = await setup({ selectedLevel: 'invalid', learningWords: ['go'] });
  assert.equal(state.selectedLevel, 'level3');
  assert.equal(state.counts.levelWords, 4333);
  assert.deepEqual((await preview('They went.')).map(row => row.term), ['go']);
});

test('resolved identity wins over conflicting form mappings for baseline and profile semantics', async () => {
  // A deliberately conflicting index proves precedence, independent of current corpus agreement.
  const { preview } = await setup({}, ['steal', 'give up'], {
    formIndex: { steal: 'go', 'give up': 'go' }, effectiveKnownWords: new Set(['go'])
  });
  assert.deepEqual((await preview('It was stolen. They gave up.')).map(row => row.term).sort(), ['give up', 'steal']);
  const learning = await setup({ learningWords: ['go'] }, ['steal'], {
    formIndex: { steal: 'go' }, effectiveKnownWords: new Set(['steal'])
  });
  assert.deepEqual(await learning.preview('It was stolen.'), []);
});

test('corpus morphology still filters exact out-of-inventory surfaces without changing their identity', async () => {
  const { adapter, writes } = await setup({}, ['umbrellas'], {
    formIndex: { umbrellas: 'umbrella' }, effectiveKnownWords: new Set(['umbrella'])
  });
  const chapter = { plainText: 'Many umbrellas opened.' };
  const vocabulary = await adapter.getReaderVocabulary(chapter);
  assert.deepEqual(adapter.getChapterPreview(chapter, vocabulary.items), []);
  assert.deepEqual(writes, []);
});

test('SW precaches the converged identity dependency graph and retires the level-only cache', async () => {
  const source = await readFile(new URL('sw.js', readerRoot), 'utf8');
  const assets = [...source.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  for (const module of ['runtime', 'identity-resolver', 'identity-lexicon', 'resolver', 'lexicon', 'phrase-constraints']) {
    assert.ok(assets.includes(`./identity/${module}.mjs`), `${module} available under SW control`);
  }
  assert.doesNotMatch(source, /CACHE_NAME = 'interleaf-reader-static-v2'/);
});
