# Interleaf Reader Agent Instructions

## 1. Product Boundary

Interleaf Reader is a mobile-first, local-first, reading-first long-form English reader for non-native English readers.

Its purpose is to help users:

* stay immersed in personally interesting stories;
* receive lightweight vocabulary help;
* preserve local reading progress;
* collect useful vocabulary;
* export vocabulary into an existing study workflow.

Vocabulary support is subordinate to reading.

The product has two distinct vocabulary workflows:

1. **Reading-context assistance**
   * The user taps an interactive term in the current text.
   * Interleaf provides concise information sufficient to continue reading.

2. **External manual capture**
   * The user records a word or short phrase encountered outside Interleaf.
   * The term is stored for later export.

Manual Add is capture, not dictionary lookup.

Vocabulary Library is a collection, organization, backup, and export layer. It is not a complete learning engine.

Do not add without an approved product decision:

* general dictionary search;
* automatic enrichment of manually entered terms;
* flashcards, quizzes, drills, streaks, or spaced repetition;
* IELTS exercises or score prediction;
* accounts, cloud sync, analytics, or uploads;
* real translation-provider behavior;
* real imported-book Chinese Reading Mode;
* real imported-book Mixed Mode;
* public book hosting, translated-book hosting, or AO3 scraping.

The built-in Guide may contain human-authored English, Chinese, or Mixed content. This is a Guide-specific exception and does not prove imported-book multilingual generation.

---

## 2. Minimum Sources of Truth

For an ordinary focused task, read only:

1. `AGENTS.md`
2. `docs/PROJECT_STATE.md`
3. the directly relevant source or documentation files

Read additional control documents only when needed:

| Change | Additional source |
| --- | --- |
| Product behavior or meaning | `docs/INTERLEAF_READER_PRD.md` |
| Durable decision | relevant entries in `docs/DECISION_LOG.md` |
| Milestone scope or priority | `docs/MILESTONES.md` |
| Runtime architecture | `docs/ARCHITECTURE.md` |
| Persisted data or migration | `docs/DATA_MODEL.md` |
| Setup, tests, or contributor process | relevant parts of `docs/HANDOFF.md` or `CONTRIBUTING.md` |
| Privacy or external data flow | `PRIVACY.md` |

Do not automatically read:

* `docs/archive/`;
* `source_materials/`;
* `generated/`;
* ZIP backups;
* private EPUBs;
* large PDFs;
* superseded planning documents.

Do not treat `docs/HANDOFF.md`, archived reports, old roadmaps, recovery notes, or prior AI summaries as current implementation truth.

When sources conflict:

* do not guess;
* report the conflict;
* use current source code and executable evidence for code reality;
* update only the document responsible for the affected truth.

---

## 3. Active Milestone and Scope

The active phase is recorded in:

```text
docs/PROJECT_STATE.md
```

Milestone scope and order are controlled by:

```text
docs/MILESTONES.md
```

Only one milestone may be Active.

New ideas enter Later / uncommitted by default.

A request may interrupt the Active milestone only for:

* startup, import, chapter-render, or core reading failure;
* data loss or corruption;
* privacy or security risk;
* legal release blocker;
* an Active-milestone exit blocker.

Do not implement adjacent features because they are convenient.

During R0, do not add product features.

---

## 4. Task Contract

Use one focused task per implementation session.

Before editing, identify:

* goal;
* task type;
* acceptance criteria;
* allowed files;
* forbidden files;
* out of scope;
* checks to run.

Choose the smallest safe interpretation.

Do not:

* make unrelated “also” changes;
* perform a broad refactor unless explicitly scoped;
* silently resolve an open product decision;
* expand scope without reporting it;
* describe source code as complete without verification.

If the request conflicts with repository truth, stop and report the conflict before editing.

---

## 5. Hard Guardrails

Never:

* commit API keys, tokens, credentials, private endpoints, or secrets;
* expose developer-owned provider credentials in frontend code;
* add an external data flow without prior product, privacy, and architecture approval;
* commit private EPUBs, fanfiction exports, user reading data, song lyrics, or copyrighted source text;
* copy dictionary definitions or examples into shipped data without source-safe permission;
* bulk-extract books, PDFs, or dictionaries into runtime datasets;
* claim placeholder behavior is implemented;
* display fake Chinese or Mixed output;
* add unrelated behavior during cleanup or bugfix work.

Always protect:

* application startup;
* EPUB import;
* first-chapter rendering;
* English Study Mode;
* chapter navigation;
* local persistence;
* existing saved-book restore.

Optional Guide, vocabulary, localization, glossary, and future translation features should fail without unnecessarily blocking core reading.

The repository uses a custom non-commercial, source-available license. Do not describe it as MIT-licensed or OSI open source.

---

## 6. Compatibility

Do not rename or change without an explicit migration task:

* IndexedDB database or store names;
* localStorage keys;
* backup schema identifiers or versions;
* persisted book, progress, preference, or vocabulary fields;
* persisted Reading Mode values;
* `cloze-mixed`;
* `clozeHtml`;
* debug globals such as `window.__slashReaderDebug`.

User-facing stale naming may be cleaned when in scope.

Historical internal identifiers may remain intentionally.

Before removing an apparently unused export, field, or identifier, check repository references and stored-data impact.

---

## 7. Verification Triggers

### JavaScript

Run syntax checks for affected files.

For startup or cross-module risk, check all `pwa-reader/*.js`.

### Pure logic

Run the relevant Node test.

Common suites:

* `tests/levelBaselineEngine.test.mjs`
* `tests/navigationEngine.test.mjs`
* `tests/vocabEngine.test.mjs`
* `tests/glossaryEngine.test.mjs`
* `tests/storage.test.mjs`
* `tests/homeState.test.mjs`

### Storage or backup

Run relevant tests and, where applicable, browser checks for:

* save;
* refresh;
* restore;
* malformed input;
* no partial mutation.

### Reader behavior

Use the copyright-safe fixture:

```text
tests/fixtures/interleaf_smoke.epub
```

Check the affected flow and adjacent core behavior where relevant.

### Mobile UI

Check an appropriate mobile-sized viewport.

### Localization

Verify the affected language and ensure Interface Language does not alter imported title, author, chapters, body content, or Reading Mode.

### Vocabulary data

Run:

```text
scripts/check_vocabulary_dataset.py
```

only when vocabulary data changes.

### PWA or deployment

Check the deployed path, assets, manifest, installability or fallback, offline boundary, update behavior, and private-data cache boundaries as applicable.

### Documentation-only

Do not run full application tests unless executable claims, links, commands, or generated facts require validation.

Report skipped checks honestly.

---

## 8. Definition of Done

A task is Done only when all applicable conditions are satisfied:

* the requested behavior or document change exists;
* the diff stays inside scope;
* triggered checks pass;
* browser or mobile verification is complete when required;
* persistence is checked in a real browser when required;
* failure and empty states are checked when relevant;
* no core reading regression is introduced;
* changed files are reviewed;
* only responsible documents are updated;
* placeholders remain honest;
* remaining limitations are reported.

Use these status labels:

* **Verified**
* **Implemented but not fully verified**
* **Placeholder**
* **Planned / not started**
* **Unknown**

Source code existence alone is not completion evidence.

---

## 9. Documentation Ownership

Update only the responsible document.

| Truth changed | Document |
| --- | --- |
| Product meaning, target user, journey, or boundary | `docs/INTERLEAF_READER_PRD.md` |
| Current implementation, verification, blocker, or next action | `docs/PROJECT_STATE.md` |
| Milestone order, scope, status, or exit criteria | `docs/MILESTONES.md` |
| Durable product, architecture, privacy, compatibility, or licensing decision | `docs/DECISION_LOG.md` |
| Runtime structure | `docs/ARCHITECTURE.md` |
| Persisted-data contract | `docs/DATA_MODEL.md` |
| Setup, tests, smoke, or troubleshooting | `docs/HANDOFF.md` |
| Contributor process | `CONTRIBUTING.md` |
| Public project entry information | `README.md` |

Do not create a new planning document when an existing canonical document owns the information.

Do not put execution logs in the PRD or Project State.

---

## 10. Token and Context Discipline

Prefer targeted reads.

The initial read budget should normally be:

* `AGENTS.md`;
* `docs/PROJECT_STATE.md`;
* one to three task-specific files.

Expand only when necessary.

Do not repeat the full PRD or milestone text in responses.

Do not regenerate reports during unrelated or docs-only work.

Reuse valid evidence rather than rediscovering the entire repository.

Keep final summaries concise and evidence-based.

---

## 11. Standard Response

Return:

### A. What changed

### B. Behavior or decision summary

### C. What was verified

### D. What remains unverified

### E. What was not implemented

### F. Files updated

### G. Risks or blockers

### H. Recommended next action

For documentation-only tasks, state when application tests were not required.

Do not automatically generate another implementation prompt unless requested.

---

## 12. R0 Temporary Restrictions

Until `docs/PROJECT_STATE.md` records R0 as closed:

* do not add new product features;
* do not begin full localization implementation;
* do not integrate a translation provider;
* do not implement real imported-book Chinese or Mixed Mode;
* do not implement a service worker;
* do not migrate to Book Project storage;
* do not redesign the UI;
* do not perform broad refactors;
* do not change IndexedDB compatibility;
* do not expand Vocabulary Library into a learning engine.

Prioritize repository truth, file classification, Git reproducibility, documentation consistency, verification, and baseline locking.
