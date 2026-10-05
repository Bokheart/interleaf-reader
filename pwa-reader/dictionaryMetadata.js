// Metadata only: callers supply lexical identity. No morphology, aliases, WSD,
// profile storage or vocabulary write authority belongs in this module.
const DEFAULT_SHARD_LIMIT = 4;
const keyFor = term => typeof term === 'string' ? term.trim().toLowerCase().replace(/\s+/g, ' ') : '';
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' ? value : '';
const miss = () => ({ status: 'miss', source: '', chineseMeaning: '', englishDefinition: '' });

function metadataOnly(result) {
  if (!isRecord(result) || !['curated', 'dictionary'].includes(result.status)) return miss();
  const chineseMeaning = text(result.chineseMeaning);
  const englishDefinition = text(result.englishDefinition);
  if (!chineseMeaning && !englishDefinition) return miss();
  return { status: result.status, source: text(result.source), chineseMeaning, englishDefinition };
}

/** DictionaryMetadataProvider: resolveMetadata(canonicalTerm) -> Promise<Metadata>.
 * Results deliberately carry no term, canonicalTerm, libraryKey or alias fields.
 */
export function createDictionaryMetadataProvider(providers = []) {
  return {
    async resolveMetadata(canonicalTerm) {
      const key = keyFor(canonicalTerm);
      if (!key) return miss();
      for (const provider of providers) {
        try {
          const metadata = metadataOnly(await provider.resolveMetadata(key));
          if (metadata.status !== 'miss') return metadata;
        } catch { /* Optional providers must never block reading. */ }
      }
      return miss();
    }
  };
}

export function createCuratedMetadataProvider(items = []) {
  return {
    async resolveMetadata(canonicalTerm) {
      const key = keyFor(canonicalTerm);
      const item = Array.isArray(items) ? items.find(item => keyFor(item?.term) === key) : null;
      return metadataOnly(item ? { ...item, status: 'curated', source: 'curated' } : null);
    }
  };
}

export function dictionaryShardId(canonicalTerm, leaves = {}) {
  const chars = keyFor(canonicalTerm).replace(/[^a-z0-9]/g, '');
  const root = chars ? chars.slice(0, 2) : 'other';
  const candidates = Object.hasOwn(leaves, root) && Array.isArray(leaves[root]) ? leaves[root] : [];
  let longest = null;
  for (const id of candidates) {
    // Manifest paths cannot escape the provider's shard directory.
    if (typeof id !== 'string' || !/^(?:[a-z0-9]+|other)$/.test(id)) continue;
    if ((id === 'other' ? !chars : chars.startsWith(id)) && (!longest || id.length > longest.length)) longest = id;
  }
  return longest;
}

export function createLocalShardMetadataProvider(options = {}) {
  const baseUrl = options.baseUrl || new URL('../data/dictionary/', import.meta.url);
  const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  const limit = Number.isInteger(options.maxCachedShards) && options.maxCachedShards > 0
    ? options.maxCachedShards : DEFAULT_SHARD_LIMIT;
  const shards = new Map();
  const pendingShards = new Map();
  let manifestPromise = null;

  async function readJson(path) {
    if (typeof fetchImpl !== 'function') return null;
    const response = await fetchImpl(new URL(path, baseUrl));
    return response?.ok ? response.json() : null;
  }

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = Promise.resolve().then(() => readJson('manifest.json'))
        .then(manifest => isRecord(manifest) && manifest.schemaVersion === 1
          && text(manifest.source) && text(manifest.version) && isRecord(manifest.leaves) ? manifest : null)
        .catch(() => null)
        .then(manifest => {
          // Do not permanently cache transient offline failures or invalid data.
          if (!manifest) manifestPromise = null;
          return manifest;
        });
    }
    return manifestPromise;
  }

  function remember(id, records) {
    shards.delete(id);
    shards.set(id, records);
    while (shards.size > limit) shards.delete(shards.keys().next().value);
    return records;
  }

  function loadShard(id) {
    if (shards.has(id)) return Promise.resolve(remember(id, shards.get(id)));
    if (!pendingShards.has(id)) {
      const pending = Promise.resolve().then(() => readJson(`shards/${id}.json`))
        .then(records => isRecord(records) ? remember(id, records) : null)
        .catch(() => null)
        .finally(() => pendingShards.delete(id));
      pendingShards.set(id, pending);
    }
    return pendingShards.get(id);
  }

  return {
    async resolveMetadata(canonicalTerm) {
      const key = keyFor(canonicalTerm);
      if (!key) return miss();
      try {
        const manifest = await loadManifest();
        if (!manifest) return miss();
        const id = dictionaryShardId(key, manifest.leaves);
        if (!id) return miss();
        const records = await loadShard(id);
        const record = records && Object.hasOwn(records, key) ? records[key] : null;
        return metadataOnly(isRecord(record) ? { ...record, status: 'dictionary', source: manifest.source } : null);
      } catch { return miss(); }
    }
  };
}
