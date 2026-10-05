import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCuratedMetadataProvider, createLocalShardMetadataProvider, createDictionaryMetadataProvider, dictionaryShardId } from '../pwa-reader/dictionaryMetadata.js';
import { createVocabularyAdapter } from '../pwa-reader/adapters/vocabularyAdapter.js';

const baseUrl = new URL('./fixtures/dictionary/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', baseUrl), 'utf8'));
function fixtureProvider(options = {}) {
  const calls = [];
  let offline = false;
  const provider = createLocalShardMetadataProvider({ baseUrl, ...options, fetchImpl: async url => {
    calls.push(String(url).slice(baseUrl.href.length));
    if (offline) throw new Error('offline');
    try { return { ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) }; }
    catch { return { ok: false }; }
  } });
  return { provider, calls, setOffline: value => { offline = value; } };
}

test('manifest routes by longest prefix, lazily fetches and caches canonical metadata', async () => {
  const { provider, calls } = fixtureProvider();
  assert.equal(dictionaryShardId('globe', manifest.leaves), 'glob');
  assert.equal(dictionaryShardId('glow', manifest.leaves), 'glo');
  assert.deepEqual(calls, []);
  const hit = await provider.resolveMetadata('globe');
  assert.deepEqual(hit, { status: 'dictionary', source: 'interleaf-authored-fixture', chineseMeaning: '球体', englishDefinition: 'a round object' });
  await provider.resolveMetadata('globe');
  await provider.resolveMetadata('glow');
  assert.deepEqual(calls, ['manifest.json', 'shards/glob.json', 'shards/glo.json']);
});

test('curated provider wins; alternate providers fail open and cannot supply identity fields', async () => {
  const { provider, calls } = fixtureProvider();
  const chain = createDictionaryMetadataProvider([
    createCuratedMetadataProvider([{ term: 'go', chineseMeaning: '前往', englishDefinition: 'authored priority' }]), provider
  ]);
  assert.equal((await chain.resolveMetadata('go')).status, 'curated');
  assert.deepEqual(calls, []);
  const alternate = createDictionaryMetadataProvider([
    { resolveMetadata() { throw new Error('unavailable'); } },
    { resolveMetadata: async () => ({ status: 'dictionary', source: 'alternate', englishDefinition: 'alternate gloss', term: 'went', canonicalTerm: 'went', libraryKey: 'en:went' }) }
  ]);
  assert.deepEqual(await alternate.resolveMetadata('go'), { status: 'dictionary', source: 'alternate', chineseMeaning: '', englishDefinition: 'alternate gloss' });
});

test('misses, offline lookup and retry leave cached shards usable', async () => {
  const { provider, calls, setOffline } = fixtureProvider();
  assert.equal((await provider.resolveMetadata('quartz')).status, 'miss');
  assert.deepEqual(calls, ['manifest.json']);
  await provider.resolveMetadata('go');
  setOffline(true);
  assert.equal((await provider.resolveMetadata('go')).status, 'dictionary');
  assert.equal((await provider.resolveMetadata('steal')).status, 'miss');
  setOffline(false);
  assert.equal((await provider.resolveMetadata('steal')).status, 'dictionary');
  const retry = fixtureProvider();
  retry.setOffline(true);
  assert.equal((await retry.provider.resolveMetadata('go')).status, 'miss');
  retry.setOffline(false);
  assert.equal((await retry.provider.resolveMetadata('go')).status, 'dictionary');
});

test('bounded LRU refreshes recently read shards and isolates provider instances', async () => {
  const { provider, calls } = fixtureProvider({ maxCachedShards: 2 });
  for (const term of ['go', 'globe', 'go', 'steal', 'globe']) await provider.resolveMetadata(term);
  assert.deepEqual(calls, ['manifest.json', 'shards/go.json', 'shards/glob.json', 'shards/st.json', 'shards/glob.json']);
  const isolated = fixtureProvider();
  await isolated.provider.resolveMetadata('go');
  assert.deepEqual(isolated.calls, ['manifest.json', 'shards/go.json']);
});

test('default LRU retains at most four shards and ignores morphology/identity fields in records', async () => {
  const { provider, calls } = fixtureProvider();
  for (const term of ['go', 'globe', 'glow', 'steal', 'bank', 'go']) await provider.resolveMetadata(term);
  assert.equal(calls.filter(path => path === 'shards/go.json').length, 2);
  const result = await provider.resolveMetadata('go');
  assert.deepEqual(Object.keys(result).sort(), ['chineseMeaning', 'englishDefinition', 'source', 'status']);
  assert.equal('exchange' in result, false);
});

test('concurrent shard requests coalesce; malformed and unsafe routing fail open', async () => {
  const { provider, calls } = fixtureProvider();
  await Promise.all([provider.resolveMetadata('go'), provider.resolveMetadata('go')]);
  assert.deepEqual(calls, ['manifest.json', 'shards/go.json']);
  for (const body of [[], null, { schemaVersion: 99, source: 'bad', version: '1', leaves: { go: ['go'] } },
    { ...manifest, leaves: { go: ['../../go'] } }]) {
    const bad = createLocalShardMetadataProvider({ baseUrl, fetchImpl: async () => ({ ok: true, json: async () => body }) });
    assert.equal((await bad.resolveMetadata('go')).status, 'miss');
  }
});

const capture = (sentence, term) => ({ sentence, targetOffset: sentence.indexOf(term), targetEnd: sentence.indexOf(term) + term.length });
function adapterSetup(curated = []) {
  const fixture = fixtureProvider();
  const writes = [];
  const adapter = createVocabularyAdapter({ dictionaryMetadataProvider: fixture.provider,
    loadVocabularyData: async () => curated, getVocabularyProfile: async () => ({}),
    addLearningWord: async term => writes.push(term) });
  return { ...fixture, adapter, writes };
}

test('went resolves upstream to go; exchange forms never become dictionary identity', async () => {
  const { adapter, calls, writes } = adapterSetup();
  const item = { term: 'went', capture: capture('They went.', 'went') };
  const before = structuredClone(item);
  const metadata = await adapter.resolveTermMetadata('went', [item]);
  assert.equal(metadata.englishDefinition, 'move to another place');
  assert.deepEqual(calls, ['manifest.json', 'shards/go.json']);
  assert.equal(metadata.term, 'went');
  assert.equal('canonicalTerm' in metadata, false);
  assert.deepEqual(item, before);
  assert.deepEqual(writes, []);
  await adapter.setTermState('went', 'learning', item.capture);
  assert.deepEqual(writes, ['go']);
  const { provider } = fixtureProvider();
  assert.equal((await provider.resolveMetadata('went')).status, 'miss');
});

test('canonical curated metadata precedes dictionary and remapped surface metadata', async () => {
  const curated = [{ term: 'go', englishDefinition: 'canonical curated', chineseMeaning: '前往' }, { term: 'went', englishDefinition: 'surface curated' }];
  const { adapter, calls } = adapterSetup(curated);
  const result = await adapter.resolveTermMetadata('go', [{ term: 'go', englishDefinition: 'surface curated', capture: capture('They went.', 'went') }]);
  assert.equal(result.englishDefinition, 'canonical curated');
  assert.equal(result.status, 'curated');
  assert.deepEqual(calls, []);
});

test('ambiguous, excluded and manual freeform captures never trigger dictionary identity', async () => {
  const { adapter, calls, writes } = adapterSetup();
  for (const item of [ { term: 'go' }, { term: 'run out', capture: capture('We run out.', 'run out') },
    { term: 'go', capture: capture('Someone stole it.', 'stole') },
    { term: 'light', capture: capture('Doctor Light arrived.', 'Light') },
    { term: 'florbnack', capture: { ...capture('A florbnack.', 'florbnack'), freeform: true } } ]) {
    assert.equal(await adapter.resolveTermMetadata(item.term, [item]), item);
  }
  assert.equal(await adapter.resolveTermMetadata('absent', []), null);
  assert.deepEqual(calls, []);
  await adapter.addLibraryLearningTerm('went');
  assert.deepEqual(writes, ['went']);
});

test('canonical hit replaces mismatched surface meanings, while missing curated assistance can use a provider', async () => {
  const { adapter } = adapterSetup([{ term: 'went', chineseMeaning: 'surface-only gloss' }]);
  const result = await adapter.resolveTermMetadata('go', [{ term: 'go', chineseMeaning: 'surface-only gloss', capture: capture('They went.', 'went') }]);
  assert.equal(result.chineseMeaning, '去');
  assert.equal(result.status, 'dictionary');
  const fixture = fixtureProvider();
  const failingCurated = createVocabularyAdapter({ dictionaryMetadataProvider: fixture.provider, loadVocabularyData: async () => { throw new Error('curated unavailable'); } });
  assert.equal((await failingCurated.resolveTermMetadata('go', [{ term: 'go', capture: capture('They went.', 'went') }])).status, 'dictionary');
});

test('dictionary miss preserves existing bubble fields and capture', async () => {
  const { adapter, setOffline } = adapterSetup();
  setOffline(true);
  const item = { term: 'go', englishDefinition: 'existing usable fallback', capture: capture('They went.', 'went') };
  const result = await adapter.resolveTermMetadata('go', [item]);
  assert.equal(result.englishDefinition, 'existing usable fallback');
  assert.equal(result.status, 'miss');
  assert.deepEqual(result.capture, item.capture);
});
