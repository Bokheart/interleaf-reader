# Interleaf Reader — Project State

**Last updated:** 2026-06-20
**Canonical product specification:** `docs/INTERLEAF_READER_PRD.md`
**Active control phase:** `R0 — Project Truth and Structure Reset`

---

## 1. Snapshot

| Field | Current state |
| --- | --- |
| **Repository branch** | `feature/m2-reader-toc` |
| **HEAD** | `91d6914` — `feat: establish reproducible M2 runtime baseline` |
| **Remote status** | Pushed to `origin/feature/m2-reader-toc` |
| **Runtime baseline** | Reconciled, verified, committed, and pushed |
| **Working tree** | Dirty; remaining changes are documentation, archive moves, and unresolved design material |
| **Documentation baseline** | Rebuilt in the working tree but not yet fully reconciled and committed |
| **Current delivery status** | M2 remains unresolved and is not formally closed |
| **Localization status** | Foundation implemented; complete coverage remains unfinished |
| **Feature-development status** | Paused during R0 |
| **Current priority** | Finalize the canonical documentation and historical archive baseline |

The earlier runtime reproducibility risk is resolved. The current application no longer depends on untracked Guide or localization modules.

R0 is not closed. The remaining work concerns documentation truth, historical archive pairing, unresolved design references, and local-only artifacts.

---

## 2. Current Product Baseline

Interleaf Reader is a mobile-first, local-first, reading-first application for non-native English readers who want to build tolerance for long English texts through personally engaging material.

The current supported baseline includes:

* personal EPUB import;
* English Study Mode;
* chapter rendering and navigation;
* Home and Reader flows;
* Local Library;
* local book and progress persistence;
* Vocabulary Preview;
* in-text vocabulary assistance;
* Known, Save, and Hide actions;
* Vocabulary Library;
* external manual vocabulary capture;
* vocabulary copy and export;
* vocabulary profile backup and restore;
* a built-in virtual Guide;
* Settings and Help surfaces;
* interface-language foundations.

The canonical user, product, and vocabulary boundaries are defined in:

```text
docs/INTERLEAF_READER_PRD.md
```

The product remains separate from:

* general dictionary search;
* flashcards, quizzes, drills, and spaced repetition;
* accounts and cloud synchronization;
* real imported-book translation;
* real imported-book Chinese Reading Mode;
* real imported-book Mixed Mode.

---

## 3. Reconciled Runtime Baseline

**Status: Verified and committed**

Commit `91d6914` establishes the reproducible runtime baseline for the current M2 working-copy implementation.

The baseline includes:

### Runtime

* `pwa-reader/app.js`
* `pwa-reader/index.html`
* `pwa-reader/readingModes.js`
* `pwa-reader/storage.js`
* `pwa-reader/styles.css`
* `pwa-reader/guideBook.js`
* `pwa-reader/i18n.js`
* `pwa-reader/locales/en.js`
* `pwa-reader/locales/zh-CN.js`

### Supporting tests

* `tests/homeState.test.mjs`
* `tests/storage.test.mjs`

The four modules that were previously untracked runtime dependencies are now tracked:

* `pwa-reader/guideBook.js`
* `pwa-reader/i18n.js`
* `pwa-reader/locales/en.js`
* `pwa-reader/locales/zh-CN.js`

The baseline was pushed to:

```text
origin/feature/m2-reader-toc
```

---

## 4. Verification Evidence

**Status: Verified within the recorded environment**

| Check | Result |
| --- | --- |
| Local runtime imports and references | Passed |
| JavaScript syntax | 13 of 13 files passed |
| Existing Node test suites | 6 of 6 passed |
| Vocabulary dataset validation | 112 items; 0 errors, warnings, or duplicates |
| `git diff --check` | Passed; line-ending warnings only |
| Desktop browser smoke | Passed at 1280 × 900 |
| Mobile browser smoke | Passed at 393 × 852 |
| Mobile horizontal overflow | None detected |
| First-run language selection and persistence | Passed |
| Settings language switch | Passed |
| Settings and Help Center | Passed |
| Guide open, hide, restore, and Reader Help routing | Passed |
| Vocabulary-level selection and persistence | Passed |
| Learning-only TXT export | Passed |
| Vocabulary-profile JSON backup | Passed |
| Valid profile restore | Passed |
| Malformed restore rejection without mutation | Passed |

Browser verification used bundled Playwright with isolated ephemeral storage because the in-app browser bridge was unavailable.

Two apparent failures were traced to test timing rather than product defects:

* restore was triggered before an earlier manual-add write completed;
* vocabulary level was read before asynchronous library rendering completed.

The sequential user flows passed when synchronized against persisted IndexedDB state. No application fix was required.

---

## 5. Remaining Verification Limits

The runtime-baseline checks do not establish complete M2 acceptance.

The following remain unverified or incomplete:

* EPUB import in the validation environment, because network policy blocked CDN-hosted JSZip and epub.js;
* non-Chromium browser behavior;
* complete interface-localization coverage;
* complete accessibility coverage;
* deliberate overlapping vocabulary writes and restore operations;
* deployed behavior matching the current branch;
* installability and offline application-shell behavior;
* real imported-book Chinese Reading Mode;
* real imported-book Mixed Mode;
* translation-provider behavior.

These limits must not be represented as completed functionality.

---

## 6. Placeholders

### Chinese Reading Mode

**Status: Placeholder**

Chinese Reading Mode does not currently translate or display a real Translation Version for user-imported books.

Guide-specific authored Chinese content is a Guide exception and does not change imported-book capability.

### Mixed Mode

**Status: Placeholder**

Imported-book Mixed Mode does not currently generate real Chinese-base mixed content.

The compatibility value `cloze-mixed` may remain in source code and persisted state.

Guide-specific authored Mixed content does not prove imported-book Mixed Mode support.

### Translation-provider behavior

**Status: Placeholder**

No production translation provider is integrated.

No user-imported book should be described as translated by Interleaf Reader in the current baseline.

---

## 7. Planned / Not Started

### Translation providers

No production provider, credential boundary, cost model, consent flow, or secure execution path has been approved or implemented.

### Translation Version workflow

The application does not currently provide a complete workflow for:

* importing a Translation Version;
* generating a Translation Version;
* preserving translation provenance;
* aligning source and translated chapters;
* repairing alignment;
* switching imported books to a real translated version.

### Book Project migration

The current persisted book model has not been migrated to the proposed Book Project, Book Version, Translation Version, or Alignment Map model.

### Service worker and offline application shell

A manifest and planning documents exist, but no service worker is implemented or registered.

### Complete localization

Interface-language infrastructure exists, but complete English and Chinese coverage remains unfinished.

Known remaining areas include:

* hard-coded user-facing strings;
* dynamic feedback and error messages;
* accessibility labels;
* complete Chinese interface coverage;
* final Guide Mixed-content compliance.

---

## 8. Documentation and Archive Baseline

**Status: In progress**

The R0 documentation rebuild currently includes:

* canonical product truth in `docs/INTERLEAF_READER_PRD.md`;
* milestone control in `docs/MILESTONES.md`;
* current-state truth in `docs/PROJECT_STATE.md`;
* durable decisions in `docs/DECISION_LOG.md`;
* active AI instructions in root `AGENTS.md`;
* operational procedures in `docs/HANDOFF.md`;
* technical structure in `docs/ARCHITECTURE.md`;
* persisted-data contracts in `docs/DATA_MODEL.md`;
* contributor workflow in `CONTRIBUTING.md`;
* public project entry information in `README.md`.

The former AI workflow has been replaced by:

* a superseded stub at `docs/AI_WORKFLOW_PROTOCOL.md`;
* a dated historical copy at `docs/archive/AI_WORKFLOW_PROTOCOL_2026-06-20.md`.

Historical PRD, roadmap, audit, report, and M2 execution records are being moved under `docs/archive/`.

The documentation/history baseline remains incomplete because the working tree still contains:

* modified canonical documents;
* tracked documents moved to archive;
* restored documents whose final location must be decided;
* unresolved M2 design references;
* an unresolved design-lab prototype;
* local-only backup and source material.

---

## 9. Remaining Repository Decisions

### Historical archive moves

A tracked deletion must be committed together with its corresponding archive addition.

Verified historical moves include the former:

* Chinese PRD;
* product specification;
* roadmap;
* PRD source audit;
* M1 stabilization report.

### Restored documents

The following documents were restored to prevent accidental data loss:

* `docs/LICENSE_DECISION.md`
* `docs/USER_GUIDE_BILINGUAL.md`
* `docs/VOCABULARY_INTERACTION_SEMANTICS.md`

`docs/LICENSE_DECISION.md` remains an active licensing-rationale document.

The bilingual guide and vocabulary-semantics document require a deliberate keep/archive decision.

### M2 design references

The following documents require product-owner disposition:

* `docs/M2_HELP_AND_LANGUAGE_SPEC.md`
* `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md`
* `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md`

They may become governed R1 input or historical archive material. They are not current milestone authority.

### Design-lab material

`design-lab/` and `docs/VOCABULARY_PREVIEW_RESPONSIVE_SPEC.md` must be handled as one unit.

They are not part of the production runtime baseline.

### Local-only material

The following must not enter the public baseline without separate review:

* `source_materials/` PDFs;
* generated reports and candidates;
* Python cache files;
* external project backups;
* `docs.current.zip`.

`docs.current.zip` is a stale recovery snapshot rather than a verified duplicate. Keep it local until document recovery and archive reconciliation are complete.

---

## 10. Active R0 Scope

### Included

* align the canonical control documents;
* remove active encoding corruption;
* separate product truth from implementation truth;
* maintain one milestone authority;
* reduce overlapping AI instructions;
* classify stale, historical, future, and experimental documents;
* reconcile documentation and archive changes;
* preserve historical records without allowing them to control current work;
* confirm tracked runtime reproducibility;
* record verification evidence and limits honestly;
* lock a trusted documentation/history baseline;
* record remaining non-blocking debt.

### Excluded

* new product features;
* real Chinese Reading Mode;
* real Mixed Mode;
* translation-provider integration;
* Book Project storage migration;
* alignment implementation;
* service-worker implementation;
* new vocabulary-learning behavior;
* general dictionary search;
* broad UI redesign;
* broad JavaScript refactoring;
* IndexedDB compatibility migrations.

New findings may be recorded during R0.

They do not automatically become implementation work.

---

## 11. Immediate Next Action

> Reconcile and commit the canonical documentation and historical archive baseline without mixing in unresolved M2 design references, design-lab experiments, or local-only artifacts.

The next R0 change set should:

1. finalize the core state, milestone, decision, release, and licensing documents;
2. commit canonical control-document changes;
3. commit verified historical archive moves with their paired deletions;
4. decide the location of the restored bilingual-guide and vocabulary-semantics records;
5. leave unresolved M2 design references and design-lab material outside the commit until separately classified.

No new product-feature implementation should begin during this step.

---

## 12. Remaining Unknowns

* whether the three M2 design-reference documents become R1 inputs or archive records;
* whether `design-lab/` remains versioned experimentation or local-only material;
* whether the restored bilingual guide and vocabulary-semantics document should remain active or move to archive;
* whether the deployed Pages build matches commit `91d6914`;
* whether EPUB import passes when CDN dependencies are available;
* whether non-Chromium browsers pass supported flows;
* whether complete localization satisfies the future R1 contract;
* whether manifest and icons produce a verified installable experience;
* whether service-worker work belongs in R2;
* whether maintainer contact and legal review are complete;
* how local source PDFs are retained without publication risk;
* when `docs.current.zip` may be safely removed.

---

*Update this file only when repository state, verification state, the active control phase, or the immediate next action materially changes.*
