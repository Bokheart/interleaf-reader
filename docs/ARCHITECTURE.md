# Interleaf Reader — Current Architecture

## 1. Purpose

This document describes the current runtime architecture of Interleaf Reader.

It covers:

* runtime model;
* startup flow;
* module responsibilities;
* application-view boundaries;
* reading, vocabulary, Guide, localization, and persistence subsystems;
* external dependencies;
* compatibility-sensitive surfaces;
* current architectural pressure points.

It does not define product requirements, milestone status, test history, AI workflow, or the future Book Project schema.

Use:

| Document | Responsibility |
| --- | --- |
| `docs/INTERLEAF_READER_PRD.md` | Product truth |
| `docs/PROJECT_STATE.md` | Current implementation and verification truth |
| `docs/MILESTONES.md` | Milestone scope and order |
| `docs/DECISION_LOG.md` | Durable decisions |
| `docs/DATA_MODEL.md` | Persisted-data contracts |
| `docs/HANDOFF.md` | Setup, tests, smoke, troubleshooting |
| `AGENTS.md` | AI-assisted repository rules |

---

## 2. Architectural Principles

### Static browser application

Interleaf Reader is a static browser application built with HTML, CSS, JavaScript ES modules, and browser storage.

The standard runtime does not require:

* a frontend build step;
* an application backend;
* an account service;
* a cloud book library.

### Local-first persistence

Imported books, reading progress, preferences, and vocabulary profile data remain in browser-local storage.

The exact browser origin determines which IndexedDB and localStorage data is visible.

### Protected reading core

The protected path is:

```text
Startup
→ EPUB import or saved-book restore
→ chapter normalization
→ first chapter render
→ English Study Mode
→ chapter navigation
→ progress persistence
```

Optional Guide, localization, vocabulary, glossary, and future translation support should not unnecessarily block this path.

### Honest placeholders

For user-imported books:

* English Study Mode is the supported core mode;
* Chinese Reading Mode is a placeholder;
* Mixed Mode is a placeholder;
* no real translation provider is integrated.

### Compatibility preservation

Persisted names and compatibility identifiers must not be renamed without an explicit migration task.

User-facing terminology may change while internal compatibility values remain.

### Source-safe runtime data

Runtime datasets must remain compact, reviewed, and legally safe.

Reference PDFs and bulk source material are not browser runtime assets.

---

## 3. System Context

```text
User
  → static browser application
      → user-imported EPUB
      → built-in virtual Guide
      → Reader and vocabulary support
      → browser-local persistence
```

External runtime dependencies currently include CDN-hosted:

* JSZip
* epub.js

No Interleaf-owned backend is required.

No real translation provider is part of the current runtime.

---

## 4. Startup Flow

The application entry point is:

```text
pwa-reader/index.html
```

A simplified startup flow is:

```text
Load HTML shell
→ load external browser dependencies
→ evaluate ES modules
→ initialize application state
→ bind events
→ load preferences and local state
→ render Home
→ offer import, Guide, or saved-book restore
```

A failure during static import or module evaluation may prevent:

* initialization;
* event binding;
* Home refresh;
* Reader controls;
* preference loading;
* diagnostics registration.

Startup debugging should therefore distinguish:

1. external dependency loading;
2. local module resolution;
3. ES module evaluation;
4. application initialization;
5. event binding;
6. user interaction.

The application must be served from the repository root because code under `pwa-reader/` accesses shared resources under `data/`.

---

## 5. Application Views

The main top-level views are:

* Home
* Reader
* Vocabulary Library
* Settings

Only the active main view should remain interactive.

An inactive view must not intercept pointer events, retain unintended focus, or cover active controls.

### Home

Home provides access to:

* EPUB import;
* Continue Reading;
* Local Library;
* built-in Guide;
* Vocabulary Library;
* Settings.

### Reader

Reader hosts:

* chapter content;
* Contents;
* Progress;
* Vocabulary Preview;
* Reading Mode controls;
* vocabulary bubbles;
* Reader chrome.

### Vocabulary Library

Vocabulary Library manages the browser-local vocabulary profile.

It is distinct from Local Library.

### Settings and Help

Settings owns interface preferences and Help access.

Help Center may appear as an overlay or nested Settings flow rather than a separate top-level view.

---

## 6. Core Reading Pipeline

```text
Application startup
→ Home and local state
→ EPUB import or saved-book restore
→ epubLoader
→ normalized book and chapter records
→ chapter selection
→ readingModes
→ English Study Mode
→ vocabulary matching and annotation
→ Reader render
→ progress persistence
```

### EPUB boundary

`epubLoader.js` owns EPUB validation, epub.js interaction, metadata loading, navigation loading, spine normalization, and chapter HTML loading.

Other modules should consume normalized records instead of raw epub.js structures where practical.

### Chapter boundary

Chapters are loaded by normalized identifiers and indexes.

Navigation should use stable normalized chapter identity where available, with safe index fallback.

### Reading Mode boundary

`readingModes.js` selects the representation for the current mode.

For imported books:

* English Study Mode uses original chapter content;
* Chinese Reading Mode returns placeholder behavior;
* Mixed Mode returns placeholder behavior.

### Persistence boundary

`storage.js` owns persistence helpers.

`app.js` coordinates save timing around chapter changes, reading position, mode state, restore, and related user actions.

---

## 7. Module Responsibilities

| Module | Primary responsibility | Boundary |
| --- | --- | --- |
| `pwa-reader/app.js` | Application state, views, event binding, import/restore coordination, Reader rendering, vocabulary UI, Guide, Settings, Help, localization orchestration, progress saves | Central controller |
| `pwa-reader/epubLoader.js` | EPUB validation, epub.js interaction, metadata, navigation, spine normalization, chapter loading | Core reading input |
| `pwa-reader/navigationEngine.js` | Pure chapter normalization, fallback labels, adjacent indexes, progress formatting | Pure navigation support |
| `pwa-reader/readingModes.js` | Mode-specific chapter representation and placeholder enforcement | Reading presentation boundary |
| `pwa-reader/vocabEngine.js` | Vocabulary loading, normalization, matching, Preview construction, filtering, chapter annotation | Reading-context vocabulary |
| `pwa-reader/levelBaselineEngine.js` | Level dataset loading, validation, effective-known-word calculation, pure helpers | Optional vocabulary personalization |
| `pwa-reader/glossaryEngine.js` | Protected-term and candidate extraction helpers | Optional glossary support |
| `pwa-reader/storage.js` | Books, progress, preferences, vocabulary profile, backup, restore | Persistence boundary |
| `pwa-reader/guideBook.js` | Built-in Guide metadata, chapters, authored variants, Reader-compatible records | Virtual built-in content |
| `pwa-reader/i18n.js` | Interface-language normalization, lookup, and fallback | Interface localization boundary |
| `pwa-reader/locales/en.js` | English interface strings | Locale data |
| `pwa-reader/locales/zh-CN.js` | Simplified Chinese interface strings | Locale data |
| `pwa-reader/translationEngine.js` | Future provider-neutral translation boundary and protected-term preparation | Future-only boundary |

No provider credentials belong in frontend modules.

---

## 8. Central Controller Pressure

`app.js` currently coordinates many concerns:

* application state;
* view visibility;
* EPUB import;
* saved-book restore;
* Reader rendering;
* navigation;
* Reading Mode;
* vocabulary interactions;
* Vocabulary Library;
* Guide;
* Settings;
* Help;
* interface language;
* progress persistence;
* diagnostics.

This concentration creates cross-feature coupling.

A change in one area may affect startup, storage orchestration, Reader navigation, Guide behavior, localization, or vocabulary UI.

Future extraction should be incremental and explicitly scoped.

R0 must not become a broad controller rewrite.

---

## 9. Vocabulary Architecture

### Reading-context assistance

```text
Rendered chapter
→ derive readable text
→ match app-ready vocabulary
→ build Vocabulary Preview
→ annotate chapter
→ open lightweight bubble
→ Known / Save / Hide
```

Primary modules:

* `vocabEngine.js`
* `levelBaselineEngine.js`
* `storage.js`
* `app.js`

If optional profile or level data cannot load, the preferred fallback is a simpler non-personalized reading experience rather than blocked chapter rendering.

### External manual capture

```text
User enters term
→ normalize
→ save to vocabulary profile
→ display in Learning
→ export or back up later
```

Manual capture does not perform general dictionary search and does not inherently require definitions, translations, examples, pronunciation, morphology, or enrichment.

### Vocabulary Library

Vocabulary Library owns collection, organization, local persistence, status changes, removal, export, backup, and restore.

It does not own flashcards, quizzes, drills, or spaced repetition.

---

## 10. Persistence Architecture

`storage.js` is the browser persistence boundary.

It supports:

* imported EPUB blobs;
* book metadata;
* local saved-book records;
* reading chapter and progress;
* approximate scroll restoration;
* application preferences;
* vocabulary profile;
* vocabulary backup and restore.

IndexedDB is used for structured and binary local data.

localStorage may be used for small preferences or compatibility metadata.

Exact names, stores, keys, schemas, and fields belong in `docs/DATA_MODEL.md`.

Constraints:

* storage is origin-scoped;
* no account or cloud sync exists;
* restore must not silently mutate unrelated data;
* malformed input must not corrupt current profile state;
* compatibility identifiers require an explicit migration before change.

---

## 11. Guide and Localization

### Built-in Guide

The Guide is a virtual book.

It:

* appears through book-oriented UI;
* opens in Reader;
* contains ordered chapters;
* may expose authored English, Chinese, and Mixed variants;
* is not parsed by `epubLoader.js`;
* is not stored as a normal imported EPUB blob;
* is not deleted through the ordinary Forget Book path.

Guide-authored multilingual content is not imported-book translation.

### Interface localization

`i18n.js` and `locales/*.js` provide the Interface Language boundary.

Interface Language may affect buttons, labels, dialogs, feedback, accessibility text, Help, and Settings.

It must not alter:

* imported title or author;
* imported chapter text;
* Reading Mode;
* user book content.

Localization completeness belongs in `docs/PROJECT_STATE.md`, not here.

---

## 12. Reading Modes and Translation

### English Study Mode

Uses original English chapter content with optional vocabulary annotations.

### Chinese Reading Mode

For imported books, remains a placeholder.

It does not represent a stored or generated Translation Version.

### Mixed Mode

For imported books, remains a placeholder.

The internal value `cloze-mixed` may remain for compatibility.

This does not make the product a cloze-testing application.

### Guide exception

Guide content variants are authored local content, not provider output.

### Translation engine

`translationEngine.js` is a future provider-neutral boundary.

It may support request shapes, protected-term preparation, and future output structures.

It does not currently provide production translation.

---

## 13. Runtime Data Assets

### `data/vocabulary.json`

Compact app-ready vocabulary entries for reading-context matching and Preview.

Not a complete dictionary.

### `data/slang_idioms.json`

Compact multiword expressions, slang, idioms, and phrasal-verb-like entries.

Not a general phrase dictionary.

### `data/protected_terms.json`

Seed protected terms for glossary and future translation preparation.

Its presence does not mean translation is implemented.

### `data/levels/*.json`

Small app-ready vocabulary-level baselines.

They are not complete proficiency inventories or formal score definitions.

### Source-material boundary

Reference PDFs and other research material must not be fetched by the PWA or copied wholesale into shipped datasets.

---

## 14. Failure and Fallback Boundaries

### Core failures

These may prevent reading and should be surfaced clearly:

* external dependency failure;
* EPUB validation or parsing failure;
* chapter loading failure;
* essential module evaluation failure;
* selected chapter rendering failure.

### Vocabulary failure

Preferred fallback:

* original chapter remains readable;
* Preview may be unavailable;
* annotation may be skipped;
* failure remains observable.

### Profile or level failure

Preferred fallback:

* retain non-personalized results;
* avoid destructive mutation;
* do not block import or chapter rendering.

### Locale failure

Prefer fallback to a stable default string.

Imported book content must remain unchanged.

### Guide failure

Must not prevent normal EPUB import and reading.

### CDN failure

If JSZip or epub.js cannot load, EPUB import may be unavailable.

The UI should expose a clear failure rather than appear unresponsive.

### Placeholder modes

Must not:

* claim provider output;
* fabricate translation;
* mutate original content;
* reset progress incorrectly.

---

## 15. Compatibility-Sensitive Surfaces

Do not change without an explicit migration task:

* IndexedDB database names;
* object-store names;
* database version;
* localStorage keys and prefixes;
* persisted book and progress identifiers;
* vocabulary-profile fields;
* backup schema identifiers and versions;
* persisted Reading Mode values;
* `cloze-mixed`;
* `clozeHtml`;
* Slash-era debug globals;
* script-status globals still used by diagnostics.

A user-facing rename does not authorize an internal migration.

---

## 16. Current Pressure Points

### Large controller

`app.js` concentrates application integration.

### Broad persistence module

`storage.js` spans books, progress, preferences, vocabulary profile, backup, and restore.

### Browser integration risk

Critical behavior depends on DOM structure, event binding, IndexedDB, downloads, viewport layout, module startup order, and CDN availability.

### Localization coverage

The localization boundary exists, but hard-coded user-facing strings may remain.

### Current/future model separation

Current storage does not implement Book Project, Translation Version, alignment, or generated multilingual artifacts.

Future design documents do not authorize migration.

These are architectural risks, not an automatic refactoring backlog.

---

## 17. Current vs Future Architecture

### Current

* static browser application;
* imported-book-oriented local persistence;
* English Study Mode;
* chapter navigation;
* local progress;
* vocabulary assistance;
* local vocabulary profile;
* virtual Guide;
* interface-localization modules;
* imported-book Chinese and Mixed placeholders;
* no real provider;
* no alignment system.

### Future proposals

May include:

* Book Project;
* Source Version;
* Translation Version;
* Alignment Map;
* generated or paired-version Mixed artifacts;
* provenance;
* chapter-first alignment.

These remain proposals until `docs/PROJECT_STATE.md` records implementation and `docs/DATA_MODEL.md` records the real persisted contract.

---

## 18. Update Rule

Update this file only when runtime structure materially changes, including startup flow, module boundaries, view architecture, persistence ownership, external dependencies, Guide/localization boundaries, Reading Mode boundaries, or compatibility contracts.

Do not use this file as a status report, roadmap, task log, or product specification.
