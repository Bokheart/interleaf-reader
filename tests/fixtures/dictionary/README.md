# Authored dictionary metadata fixtures

All meanings in this directory were authored for these tests. They were not
copied from ECDICT or another dictionary. The `exchange` field on `go` is an
adversarial fixture: providers must ignore it rather than create `went` aliases.
The bank entry deliberately supplies multiple meanings; no contextual WSD is
performed. These files are test assets, never install-precached or shipped as
the application's production dictionary.

## Runtime contract

`pwa-reader/dictionaryMetadata.js` defines providers with
`resolveMetadata(canonicalTerm)`. Ordered providers return only `status`
(`curated`, `dictionary`, or `miss`), `source`, `chineseMeaning`, and
`englishDefinition`. They cannot return authoritative identity or mutate a
profile. Alternate providers can implement the same interface without exposing
their dataset to the caller.

The local provider reads `manifest.json` lazily. Schema 1 requires `source`,
`version`, and a `leaves` object grouping actual shard IDs by the first two
ASCII alphanumeric characters of the key (or `other`). It chooses the longest
matching prefix. `shards/<id>.json` maps **canonical keys only** to objects with
string metadata fields. Other fields, including exchange/morphology and forged
identity fields, are ignored. No aliases or sense selection are generated.

Each provider instance has a four-shard LRU by default and coalesces concurrent
manifest/shard loads. Failed reads are not permanently memoized. Cached shards
can assist offline; an unavailable shard returns a miss. The default optional
location is `data/dictionary/`; this task intentionally supplies no production
manifest or gloss shards there. An approved source can use an immutable version
subdirectory and inject `baseUrl` through the provider boundary.

The adapter's synchronous `getTermMetadata` retains its existing behavior.
`resolveTermMetadata` resolves the existing occurrence upstream, looks up the
canonical key in original curated items first, then the dictionary provider.
Manual terms and non-resolved captures retain existing metadata without new
dictionary lookup. Metadata never changes term, capture, Library state or
write authority. A miss keeps the existing bubble fallback. The bubble exposes
source/status as data attributes and renders meanings through text content.

The SW uses static cache v5 and a separate dictionary metadata v1 cache. It
caches successful non-redirected JSON responses lazily at the deployment's
`data/dictionary/[version/]manifest.json` and `shards/<id>.json` paths. It does
not install-precache datasets. Activation removes old static and dictionary
namespaces, preserving the current caches and unrelated caches. Cache Storage
failure cannot hide a successful network response; uncached offline lookups
return HTTP 504 and the provider returns a miss. Dataset updates must use
immutable versioned URLs **and** advance the dictionary cache generation when
retiring a release; never overwrite data under an already cached URL.

## Production dataset shipping gate

No ECDICT production data or dataset builder is included in this task. The
upstream repository's MIT license alone does not establish redistribution
rights for every compiled gloss from external sources. This foundation makes
no legal conclusion about those rights.

Before adding any production dataset, a reviewable release must include:

1. **Source/version:** provider ID, upstream URL, exact release/tag/commit, and
   acquisition date. Assign an immutable local dataset version and URL.
2. **License:** exact license text and version, coverage of definitions,
   translations and examples, and evidence of permission for every included
   upstream component. Unresolved provenance or permission blocks shipping.
3. **Provenance:** a component inventory tracing retained fields to source
   material; record exclusions, transformations and authorship. Architecture
   support does not authorize an external network provider.
4. **Attribution/NOTICE:** retain required license files and attribution;
   record the approved NOTICE text and its distribution/display location.
5. **Source hash:** SHA-256 of each exact raw input, with source filenames and
   byte sizes. Raw proprietary inputs must not enter the runtime or repository.
6. **Builder inputs:** reviewed builder source/revision and SHA-256, schema
   version, runtime/tool versions, full command, input paths/hashes, selected
   fields, canonical-key policy, filters, ordering/encoding, gloss limits and
   shard byte budget. Do not reuse the prototype's exchange-alias expansion.
   Emit canonical entries only; fail on invalid or conflicting duplicate keys
   and unsplittable over-budget shards. Verify deterministic repeat builds.
7. **Generated artifact hashes:** SHA-256 and byte size for the manifest,
   every shard, license and NOTICE file; include record counts and a complete
   artifact inventory. Verify routes reach the intended keys and that emitted
   hashes match the release before approval.
8. **Integration evidence:** provider, adapter, identity, bubble and SW tests;
   deployed-path MIME checks, no full install precache, cache generation and
   stale cleanup, offline hit/miss, core reading and persistence regression
   checks. Approval must cover provenance and redistribution as well as the
   technical release; passing fixture tests is not dataset approval.
