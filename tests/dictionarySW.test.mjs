import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../pwa-reader/sw.js', import.meta.url), 'utf8');
function harness() {
  const handlers = {};
  const buckets = new Map();
  const deleted = [];
  const fetched = [];
  const precached = [];
  let offline = false;
  let cacheFailure = '';
  let status = 200;
  let contentType = 'application/json';
  const cacheApi = {
    async open(name) {
      if (cacheFailure === 'open') throw new Error('cache unavailable');
      if (!buckets.has(name)) buckets.set(name, new Map());
      const bucket = buckets.get(name);
      return {
        async addAll(assets) { precached.push(...assets); },
        async match(request) { if (cacheFailure === 'match') throw new Error('cache read failure'); return bucket.get(request.url)?.clone(); },
        async put(request, response) { if (cacheFailure === 'put') throw new Error('quota'); bucket.set(request.url, response.clone()); }
      };
    },
    async keys() { return [...buckets.keys()]; },
    async delete(name) { deleted.push(name); return buckets.delete(name); },
    async match() { return undefined; }
  };
  const scope = 'https://example.test/project/pwa-reader/';
  const context = vm.createContext({ URL, Response, console,
    self: { registration: { scope }, addEventListener: (type, handler) => { handlers[type] = handler; } },
    location: { origin: 'https://example.test' }, caches: cacheApi,
    fetch: async request => {
      fetched.push(request.url);
      if (offline) throw new Error('offline');
      return new Response('{}', { status, headers: { 'content-type': contentType } });
    }
  });
  vm.runInContext(source + '\n globalThis.names = { static: CACHE_NAME, dictionary: DICTIONARY_CACHE_NAME };', context);
  return { buckets, deleted, fetched, precached, names: context.names,
    setOffline: value => { offline = value; }, setCacheFailure: value => { cacheFailure = value; },
    setStatus: value => { status = value; }, setContentType: value => { contentType = value; },
    async lifecycle(type) { let pending; handlers[type]({ waitUntil: promise => { pending = promise; } }); await pending; },
    async request(path = '/project/data/dictionary/shards/go.json', overrides = {}) {
      let pending;
      handlers.fetch({ request: { url: new URL(path, scope).href, method: 'GET', mode: 'cors', headers: new Headers(), ...overrides },
        respondWith: promise => { pending = promise; } });
      return pending ? await pending : null;
    }
  };
}

test('SW installs foundation module without dictionary manifest or full shard precache', async () => {
  const h = harness();
  await h.lifecycle('install');
  assert.ok(h.precached.includes('./dictionaryMetadata.js'));
  assert.ok(!h.precached.some(path => path.includes('data/dictionary/')));
  assert.ok(h.precached.includes('./readerAppearance.js'));
  assert.ok(h.precached.includes('./identity/runtime.mjs'));
  assert.ok(h.precached.some(path => path.includes('form_index.json')));
  assert.notEqual(h.names.static, h.names.dictionary);
});

test('SW lazily caches successful shard and manifest fetches, then serves offline', async () => {
  const h = harness();
  assert.equal((await h.request()).status, 200);
  assert.equal((await h.request('/project/data/dictionary/manifest.json')).status, 200);
  h.setOffline(true);
  assert.equal((await h.request()).status, 200);
  assert.equal(h.fetched.length, 2);
  assert.equal((await h.request('/project/data/dictionary/shards/st.json')).status, 504);
});

test('SW failed responses and HTML fallbacks are never dictionary cached', async () => {
  const h = harness();
  h.setStatus(404);
  assert.equal((await h.request()).status, 404);
  h.setStatus(200);
  h.setContentType('text/html');
  await h.request();
  h.setOffline(true);
  assert.equal((await h.request()).status, 504);
  assert.equal(h.buckets.get(h.names.dictionary).size, 0);
});

test('SW cache open/read/write failures never swallow a successful network response', async () => {
  for (const failure of ['open', 'match', 'put']) {
    const h = harness();
    h.setCacheFailure(failure);
    assert.equal((await h.request()).status, 200);
    h.setOffline(true);
    assert.equal((await h.request()).status, 504);
  }
});

test('SW retires stale dictionary/static caches and preserves current and unrelated caches', async () => {
  const h = harness();
  for (const name of [h.names.static, h.names.dictionary, 'interleaf-reader-static-v4', 'interleaf-reader-dictionary-v1', 'interleaf-reader-dictionary-metadata-v0', 'other-app']) h.buckets.set(name, new Map());
  await h.lifecycle('activate');
  assert.deepEqual(h.deleted.sort(), ['interleaf-reader-dictionary-metadata-v0', 'interleaf-reader-dictionary-v1', 'interleaf-reader-static-v4']);
  assert.deepEqual([...h.buckets.keys()].sort(), [h.names.static, h.names.dictionary, 'other-app'].sort());
});

test('SW dictionary cache ignores wrong deployment paths, queries, private data, Range, non-GET and cross-origin', async () => {
  const h = harness();
  for (const [path, overrides] of [
    ['/project/data/dictionary/shards/go.json', { method: 'POST' }],
    ['https://outside.test/project/data/dictionary/shards/go.json', {}],
    ['/project/data/dictionary/shards/go.json', { headers: new Headers({ range: 'bytes=0-2' }) }],
    ['/other/data/dictionary/shards/go.json', {}],
    ['/project/data/dictionary/private.epub', {}],
    ['/project/data/dictionary/shards/go.json?private=1', {}]
  ]) await h.request(path, overrides);
  assert.equal(h.buckets.has(h.names.dictionary), false);
});
