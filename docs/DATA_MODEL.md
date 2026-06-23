# Interleaf Reader — Current Data Model

## 1. Purpose

This document defines the current persisted and runtime data contract for Interleaf Reader.

It covers:

* IndexedDB and localStorage schemas;
* imported-book records;
* reading progress;
* vocabulary profile data;
* preferences;
* backup, restore, export, and deletion behavior;
* runtime-only and derived values;
* compatibility-sensitive identifiers;
* remaining browser-level unknowns.

It does not define:

* future Book Project storage;
* Source Version or Translation Version schemas;
* alignment models;
* provider provenance;
* generated or paired Mixed artifacts;
* product requirements;
* milestone scope;
* UI layout.

Current architecture is documented in:

```text
docs/ARCHITECTURE.md
```

Future multilingual proposals are documented separately and do not modify the current persisted contract.

---

## 2. Storage Context

Interleaf Reader uses browser-local storage.

Current storage mechanisms:

* IndexedDB for structured and binary persisted records;
* localStorage for small preferences and compatibility state;
* in-memory runtime records;
* downloadable vocabulary export and backup files.

There is currently no:

* account system;
* cloud book library;
* cross-device synchronization;
* server-owned reading profile;
* automatic remote backup.

Browser storage is scoped to the exact origin.

For example:

```text
http://localhost:8000
```

and:

```text
http://127.0.0.1:8000
```

use different IndexedDB and localStorage data.

Changing hostname, port, protocol, browser profile, or private-browsing context may make existing data appear unavailable.

Persisted names and identifiers are compatibility-sensitive.

---

## 3. IndexedDB Schema

The current IndexedDB database is:

| Property | Value |
| --- | --- |
| Database name | `slash-reader-v2-books` |
| Database version | `2` |

Object stores:

| Store | Key path | Indexes | Purpose |
| --- | --- | --- | --- |
| `books` | `bookKey` | None | Imported EPUB records |
| `progress` | `bookKey` | None | Per-book reading progress |
| `vocabularyProfile` | `profileKey` | None | Singleton vocabulary profile |

Upgrade behavior:

* missing stores are created in `onupgradeneeded`;
* version 2 adds `vocabularyProfile`;
* existing version-1 `books` and `progress` records are retained;
* existing records are not transformed or revalidated;
* the vocabulary singleton uses `profileKey: "local"`.

Each storage operation opens the database and closes the connection after request handling.

---

## 4. localStorage Contract

localStorage values use the prefix:

```text
slash-reader-v2
```

Current keys:

| Full key | Persisted value | Notes |
| --- | --- | --- |
| `slash-reader-v2:app-preferences` | JSON preference object | Primary UI and onboarding preferences |
| `slash-reader-v2:last-mode` | Reading Mode string | Missing value defaults to `english-study`; read value is not validated |
| `slash-reader-v2:last-book-summary` | `{id,title,author,chapterCount}` | Written after EPUB load; currently not authoritative restore data |
| `slash-reader-v2:storage-test` | Temporary `"ok"` | Availability probe; removed immediately after a successful test |

### App-preference fields

| Field | Default | Normalization |
| --- | --- | --- |
| `uiLanguage` | `en`, or caller-provided browser preference | Values beginning with `zh` become `zh-CN`; values beginning with `en` become `en`; otherwise `en` |
| `hasChosenUiLanguage` | `false` | Only literal `true` becomes true |
| `guideVisibleInLibrary` | `true` | Only literal `false` hides the Guide |
| `guideVersion` | `english` | Allowed values: `english`, `chinese`, `bilingual`; retained legacy field |
| `hasChosenGuideVersion` | `false` | Only literal `true` becomes true |
| `updatedAt` | `null` before first save | Save helpers assign `Date.now()` |

`guideVersion` does not currently control Guide content. Reading Mode controls the Guide content variant.

Invalid JSON or unavailable localStorage returns the caller-provided fallback.

---

## 5. Entity Overview

```text
IndexedDB
├── books
│   └── ImportedBook
├── progress
│   └── ReadingProgress
└── vocabularyProfile
    └── VocabularyProfile singleton

localStorage
├── AppPreferences
├── last-mode
└── last-book-summary

Runtime only
├── BuiltInGuide
├── RuntimeBook
├── RuntimeChapter
├── VocabularyPreview
├── VocabularyBubble
└── GlossaryCandidate
```

Local Library cards are derived from `books` and `progress`.

There is no separate Local Library metadata store.

---

## 6. Imported Book Record

Imported-book metadata is created by `createStoredBookMetadata()` and persisted through `saveStoredBook()`.

Stored fields:

| Field | Stored value or fallback |
| --- | --- |
| `bookKey` | Deterministic metadata-derived string |
| `fileName` | File name, otherwise `book.epub` |
| `fileSize` | File size, otherwise `0` |
| `fileType` | MIME type, otherwise `application/epub+zip` |
| `lastModified` | File timestamp, otherwise `0` |
| `title` | EPUB title → filename without `.epub` → `Untitled book` |
| `author` | EPUB author → `Unknown author` |
| `chapterCount` | `book.chapters.length` → `0` |
| `createdAt` | Current timestamp when saved |
| `updatedAt` | Same current timestamp |
| `fileBlob` | `file.slice(...)` Blob in browsers, otherwise supplied file value |

### Book-key generation

`bookKey` is derived from:

```text
normalized filename
:
file size
:
lastModified
:
normalized title
:
normalized author
```

Normalization:

* lowercases text;
* replaces non-alphanumeric runs with `-`;
* removes leading and trailing hyphens;
* falls back to `unknown`.

Re-importing the same key uses `put`, replaces the complete book record, and resets both timestamps.

### Restore boundary

The saved EPUB Blob is the source for rebuilding runtime metadata and chapters.

Normalized chapters and rendered HTML are not persistently stored as part of the book record.

A legacy book may still appear in Local Library with fallback metadata, but restoring the book requires `fileBlob`.

---

## 7. Local Library Derivation

Local Library metadata is derived by joining book and progress records.

Possible displayed values include:

* `bookKey`;
* title;
* author;
* chapter count;
* progress text;
* current chapter;
* last-updated time;
* availability of the saved EPUB Blob.

Local Library ordering is derived from the most recent relevant book or progress `updatedAt`.

The built-in Guide may appear beside imported books, but it is not a record in `books`.

---

## 8. Reading Progress Record

Application-created progress records contain:

| Field | Behavior |
| --- | --- |
| `bookKey` | Required; a missing key returns `null` without writing |
| `currentChapterId` | Current chapter identity |
| `currentChapterIndex` | Zero-based chapter index |
| `currentMode` | Reading Mode at save time |
| `progressText` | Persisted display text |
| `scrollTop` | Non-negative finite number; invalid input becomes `0` |
| `scrollRatio` | Clamped to `0..1`; invalid input becomes `0` |
| `updatedAt` | Existing truthy value or current timestamp |

`normalizeReadingProgress()` preserves additional supplied fields.

`getReadingProgress()` returns the stored record directly without normalizing it.

### Chapter restore precedence

1. Matching `currentChapterId`.
2. `currentChapterIndex` interpreted as zero-based.
3. The same index interpreted as one-based.
4. First available chapter.
5. `null` when no chapters exist.

The stored index is not clamped before these array lookups.

### Scroll restoration

Initial scroll restoration:

* uses `scrollRatio`;
* requires stored `currentChapterId` to equal the resolved current chapter;
* derives a new pixel `scrollTop` from the current layout;
* does not restore using persisted `scrollTop`.

Legacy records that restore only through an index can restore the chapter but do not receive initial scroll restoration.

### Reading Mode persistence

Reading Mode is persisted in two places:

* global localStorage key `last-mode`;
* per-book progress field `currentMode`.

The current restore caller uses global `last-mode`.

It does not currently restore from `progress.currentMode`.

Allowed written mode values include:

```text
english-study
chinese
cloze-mixed
```

The stored `last-mode` value is read without validation.

---

## 9. Vocabulary Profile

The vocabulary profile is one global singleton across all books and chapters. Current records do not contain a book key, chapter key, Book Project key, version key, or other vocabulary-scope field.

The IndexedDB singleton record is:

```json
{
  "profileKey": "local",
  "selectedLevel": "level3",
  "knownWords": [],
  "learningWords": [],
  "ignoredWords": [],
  "preferredCategories": ["ielts", "fiction", "slang"],
  "updatedAt": 0
}
```

`profileKey` is stored but omitted from the profile returned to ordinary callers.

### Defaults

| Field | Default |
| --- | --- |
| `selectedLevel` | `level3` |
| `knownWords` | `[]` |
| `learningWords` | `[]` |
| `ignoredWords` | `[]` |
| `preferredCategories` | `["ielts", "fiction", "slang"]` |
| `updatedAt` | overwritten with current time on save |

Valid levels:

```text
level1
level2
level3
level4
level5
```

Invalid levels fall back to `level3`.

### Term normalization

Vocabulary terms are:

* string-coerced;
* trimmed;
* lowercased;
* stripped of unsupported leading and trailing characters;
* deduplicated within each collection.

Original display casing is not preserved.

Internal spaces, apostrophes, and hyphens may remain.

Preferred categories are trimmed, lowercased, and deduplicated.

Unknown profile fields are discarded during normalization and save.

### Collection meanings

| Collection | Meaning |
| --- | --- |
| `knownWords` | User reports already knowing the term |
| `learningWords` | User wants to retain or export the term |
| `ignoredWords` | User hides the term from ordinary assistance |

Approved product terminology is **Known / 已认识**. The current internal UI/export identifier `mastered` remains temporarily as a compatibility alias derived from `knownWords`.

There is no `masteredWords` field.

Current storage uses `ignoredWords` for the product's global Hidden outcome. Hidden is semantically separate from Known even though the current personalization helper may combine both for filtering.

### Approved target mapping

The following is a future conceptual mapping, not an implemented schema:

| Current compatibility field | Approved target concept |
| --- | --- |
| `selectedLevel` | `baseLevel` |
| `knownWords` | `knownAdditions` |
| `learningWords` | `learningWords` |
| `ignoredWords` | `hiddenWords` |

The target calculation is:

```text
EffectiveKnown = BaseWhitelist + KnownAdditions - LearningWords
```

Preview eligibility additionally excludes global Hidden. No book-specific vocabulary state and no default persistent Unknown Exceptions collection are part of the target model.

Renaming any current field requires an explicit versioned migration, rollback behavior, compatibility tests, and real-browser verification. No such migration is authorized.

### Action transitions

| Action | Known | Learning | Hidden |
| --- | --- | --- | --- |
| Known | Add | Remove | Remove |
| Save / Manual Add | Remove | Add | Remove |
| Hide | Remove | Remove | Add |
| Remove / restore term | Remove | Remove | Remove |

An empty normalized term returns the current profile without writing.

### Cross-list conflicts

Action helpers enforce exclusive transitions.

Generic normalization and `saveVocabularyProfile()` do not resolve cross-list conflicts.

A supplied profile may contain the same normalized term in multiple collections.

Backup restore may therefore recreate a term in more than one current collection. The future precedence or rejection rule is unresolved and must not be inferred. Known, Learning, and Hidden remain mutually exclusive approved user outcomes even though generic current save/restore does not enforce that target invariant.

---

## 10. Vocabulary Backup and Restore

### Backup filename

```text
interleaf-reader-vocabulary-profile.json
```

### Backup shape

There is no explicit schema-name field.

The version field is:

```text
schemaVersion
```

Current version:

```text
1
```

Backup fields:

```text
schemaVersion
exportedAt
selectedLevel
knownWords
learningWords
ignoredWords
preferredCategories
```

Schema version 1 contains neither a baseline asset version nor a Base Whitelist snapshot. It also has no per-term timestamps, phrase identity/state structure, or chapter-analysis/artifact provenance.

### Validation

Restore rejects:

* invalid JSON;
* `null`;
* arrays;
* non-object top levels;
* unsupported `schemaVersion`;
* unsupported top-level fields.

`exportedAt` is allowed but is not required or validated.

Other fields are not individually required.

Missing or invalid profile fields normalize to defaults.

Non-array word fields become empty arrays.

Array entries are string-coerced rather than strictly type-rejected.

Parsed output excludes:

* `schemaVersion`;
* `exportedAt`;
* `profileKey`;
* `updatedAt`.

### Replacement behavior

Restore performs:

```text
read complete file
→ parse
→ validate
→ normalize
→ save complete singleton profile
```

Malformed input throws before persistence and therefore performs no profile mutation.

A successful restore performs one `put` of the complete singleton record.

It is not an incremental field-by-field mutation.

### Atomicity and concurrency

A successful restore is a single-record replacement in one `vocabularyProfile` read/write transaction.

The wrapper awaits the `put` request success but does not explicitly await `IDBTransaction.oncomplete`.

Restore is not serialized against concurrent vocabulary writes.

Overlapping operations remain last-writer-wins.

### Exact-restoration limitation and future options

`selectedLevel` alone cannot reproduce the original EffectiveKnown set if the corresponding level baseline asset changes. The current `data/levels/*.json` assets have no persisted version identifier, and schema version 1 does not embed their word lists.

A future backup that claims exact restoration must choose one of the following without silently changing schema version 1:

* an immutable historical baseline registry referenced by version;
* an embedded Base Whitelist snapshot with integrity metadata;
* an approved hybrid that uses a version reference with snapshot fallback.

The choice remains open. A future format must also define cross-list conflict handling, phrase identity, and any per-term timestamps before a backup schema migration is authorized.

---

## 11. Vocabulary Export

Term exports are derived outputs, not complete profile backups.

Current surfaces may include:

* Copy Learning;
* Copy All;
* CSV download;
* Learning-only TXT export.

Exports may contain only normalized terms or limited tabular fields.

They do not preserve complete profile state unless the format explicitly includes it.

Vocabulary profile backup and vocabulary term export are different contracts.

---

## 12. Built-in Guide

The Guide is a virtual runtime entity.

It has:

* stable built-in identity;
* Guide metadata;
* ordered chapters;
* authored English, Chinese, and Mixed variants;
* Reader-compatible records;
* a persisted visibility preference.

It does not have:

* a user EPUB Blob;
* an ordinary `books` record;
* normal Forget Book deletion;
* a Translation Version;
* provider output;
* a generated Mixed artifact.

Guide visibility is persisted through `app-preferences`.

Guide content variant is derived from current Reading Mode.

The retained legacy `guideVersion` preference does not currently control the Guide content variant.

---

## 13. Runtime-Only and Derived Data

| Value | Persistence status |
| --- | --- |
| EPUB Blob and book metadata | IndexedDB |
| Reading progress | IndexedDB |
| Vocabulary profile | IndexedDB |
| App preferences | localStorage |
| Global last Reading Mode | localStorage |
| `last-book-summary` | localStorage, currently unused |
| Local Library cards | Derived from books and progress |
| Local Library ordering | Derived |
| Vocabulary counts | Derived |
| Runtime Book and chapters | Runtime only |
| Original loaded chapter HTML | Runtime only |
| Annotated chapter HTML | Runtime only |
| Vocabulary Preview | Runtime only |
| Vocabulary bubble state | Runtime only |
| Glossary candidates | Runtime only |
| Built-in Guide chapters | Runtime only |
| Guide visibility | localStorage preference |
| Guide content variant | Derived from Reading Mode |
| Restored pixel scroll position | Derived from `scrollRatio` and current layout |

### `clozeHtml`

`clozeHtml` is a compatibility-sensitive runtime or legacy field.

Its presence does not prove that real Mixed content is generated or persisted.

It must not be removed or renamed without an explicit migration task.

---

## 14. Deletion and Lifecycle

### Forget imported book

`deleteStoredBook()` performs:

1. delete the key from `books` in one read/write transaction;
2. delete the same key from `progress` in a second read/write transaction.

Book and progress deletion are not atomic together.

If the second operation fails, the book may be deleted while orphaned progress remains.

A missing or falsy key performs no operation.

Forgetting a currently open book clears persisted and saved-library state, but the in-memory runtime book remains open.

### Guide hide and restore

Guide hide and restore update preferences only.

They do not perform IndexedDB deletion.

### Vocabulary removal

Removing a term rewrites the singleton vocabulary profile after removing the term from all three collections.

It does not delete seed vocabulary data, EPUB text, chapter matches, or unrelated profile data.

### Profile restore

A successful profile restore replaces supported vocabulary-profile fields only.

It does not replace saved books, reading progress, Guide content, app-wide preferences, or translation data.

---

## 15. Legacy and Compatibility Behavior

Current legacy behavior includes:

* version-1 databases upgrade to version 2 by adding `vocabularyProfile`;
* existing `books` and `progress` records remain unchanged;
* progress records without scroll fields remain readable;
* stale or missing chapter IDs fall back through index rules;
* missing preference fields merge with defaults;
* invalid preference values normalize safely, except unvalidated `last-mode`;
* partial vocabulary profiles normalize missing fields;
* unknown vocabulary-profile fields are discarded;
* unknown progress fields are preserved when progress is resaved;
* legacy book records may appear in library listings with fallback values;
* book restore requires `fileBlob`.

Compatibility-sensitive identifiers:

| Category | Value |
| --- | --- |
| IndexedDB database | `slash-reader-v2-books` |
| Database version | `2` |
| Stores | `books`, `progress`, `vocabularyProfile` |
| Store key paths | `bookKey`, `bookKey`, `profileKey` |
| Vocabulary singleton key | `local` |
| localStorage prefix | `slash-reader-v2` |
| localStorage logical keys | `app-preferences`, `last-mode`, `last-book-summary` |
| Reading Modes | `english-study`, `chinese`, `cloze-mixed` |
| Backup version field | `schemaVersion` |
| Backup version | `1` |
| Internal UI/export vocabulary identifier | `mastered` (compatibility alias for `knownWords`) |
| Runtime compatibility field | `clozeHtml` |
| Debug global | `window.__slashReaderDebug` |
| Script-status global | `window.slashReaderScriptStatus` |

The book-key generation format and all persisted field names are also compatibility-sensitive.

`clozeHtml` and runtime globals are not persisted by `storage.js`, but remain compatibility-sensitive.

R1 localization implementation through `R1-L10N-06` and starting baseline `b2f1ab1` did not change this IndexedDB or backup schema.

---

## 16. Validation and Failure Boundaries

### Invalid EPUB

An invalid EPUB should not create a valid saved-book record.

### Malformed vocabulary backup

Malformed or unsupported backup input is rejected before profile persistence.

### Optional vocabulary data

Optional Preview personalization may fail open to a simpler vocabulary result.

### Invalid preferences

Invalid preference values fall back through normalization where implemented.

### Unknown migrations

The application must not guess incompatible migration behavior.

### Storage failure

Storage, blocked-origin, quota, or transaction failure should be reported without silently claiming success.

---

## 17. Remaining Browser-Level Unknowns

Source inspection and tests establish the current code contract.

The following still require browser or existing-origin verification:

* whether every historical user origin has the expected key paths;
* Blob round-trip behavior in each supported browser;
* storage quota limits and quota-exhaustion behavior;
* exact durability timing because request success is awaited rather than explicit transaction completion;
* failure behavior between separate book and progress deletion transactions;
* overlapping vocabulary mutations and restore;
* private-browsing and blocked-storage behavior;
* non-Chromium behavior.

These are browser implementation or existing-origin questions, not unresolved source-schema questions.

---

## 18. Future Model Boundary

The following are not part of the current persisted contract:

* `BookProject`;
* `BookVersion`;
* `SourceVersion`;
* `TranslationVersion`;
* `AlignmentMap`;
* generated or paired Mixed artifacts;
* provider provenance;
* translation state;
* alignment repair data;
* Book Project migration metadata;
* `baseLevel`, `baseWhitelistVersion`, or a Base Whitelist snapshot;
* `knownAdditions` or `hiddenWords` fields;
* structured `phraseStates`;
* per-term timestamps;
* `ChapterVocabularyAnalysis`;
* Preview or Mixed candidate-set artifacts;
* `GeneratedMixedArtifact` input fingerprints or staleness records;
* a canonical cross-view position anchor.

Possible future phrase handling remains undecided. Phrases may continue to use the ordinary global Known, Learning, and Hidden term collections, or a future schema may add structured phrase identity/state when alignment or reproducibility requires it. The current schema does not decide that question.

A future `ChapterVocabularyAnalysis` would be a reproducible derived record, not a book-specific vocabulary profile. It would need source/chapter identity and content fingerprint, a global-profile snapshot/reference, baseline identity, dataset and phrase-policy versions, and candidate-policy inputs. It would expose relatively broad Preview candidates and a smaller prioritized Mixed subset.

A future `GeneratedMixedArtifact` would need reproducibility inputs including source and Translation Version identity, alignment revision, chapter-analysis identity, global-profile/baseline input, phrase/candidate policy versions, generation settings, and staleness state. No Translation Version, Alignment Map, `ChapterVocabularyAnalysis`, or `GeneratedMixedArtifact` is currently persisted.

Future design documents do not authorize changing IndexedDB or migrating current records.

A future migration requires:

* an approved milestone;
* a durable decision;
* an exact schema;
* migration and rollback behavior;
* compatibility tests;
* real-browser verification.

The following remain open and must not be resolved by implication:

* Hide cancellation restoration behavior;
* same-chapter reopening or regeneration policy;
* legacy cross-list conflict precedence;
* baseline registry versus embedded snapshot versus hybrid;
* ordinary phrase terms versus structured `phraseStates`;
* per-term timestamp requirements;
* Mixed thresholds and caps;
* stale-artifact regeneration policy;
* the canonical cross-view position anchor.

---

## 19. Update Rule

Update this document when there is a material change to:

* IndexedDB database or stores;
* localStorage keys;
* persisted fields;
* book-key generation;
* progress restore semantics;
* Vocabulary Profile shape;
* preference normalization;
* backup schema;
* restore mutation behavior;
* deletion behavior;
* migration behavior;
* compatibility identifiers.

Do not update it merely because UI wording, verification status, milestone status, or future design proposals change.

---

*This document describes the current persisted and runtime data contract. Browser-specific durability and historical-origin behavior must be verified separately rather than inferred.*
