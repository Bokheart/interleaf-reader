# Interleaf Reader — Project State

**Last updated:** 2026-06-24
**Canonical product specification:** `docs/INTERLEAF_READER_PRD.md`
**Active control phase:** `R2 — Installable Local-First Release`

---

## 1. Snapshot

| Field | Current state |
| --- | --- |
| **Repository branch** | `feature/m2-reader-toc` |
| **Accepted runtime baseline** | `99ad1e3` — `fix: align Guide labels with mode contract` |
| **Runtime baseline tag** | `r0-closure-99ad1e3` (annotated tag on `99ad1e3`) |
| **Product-owner acceptance** | 孙书心 accepted the R0 runtime baseline on `2026-06-22` |
| **R1 acceptance candidate** | `4b7e94e` — `fix: align Known terminology and Guide facts` on `feature/m2-reader-toc` |
| **R1 product-owner acceptance** | 孙书心 accepted runtime candidate `4b7e94e` and authorized R1 closure on `2026-06-24` |
| **Pre-closure documentation baseline** | `b7b0852` — accepted documentation sync baseline |
| **R0 status** | **Closed** (`2026-06-22`) |
| **R1 status** | **Closed** (`2026-06-24`) |
| **R2 status** | **Active** |
| **First R1 implementation commit** | `74ce309` — `feat: localize reader chrome` |
| **R1-GOV-02 starting baseline** | `b2f1ab1` — `feat: close application localization gaps` |
| **Repository state rule** | Read the current repository HEAD from Git; do not treat HEAD as the runtime baseline |
| **Documentation baseline** | Canonical and historical archive work is committed and reconciled; later documentation-only commits do not change the accepted runtime baseline |
| **Localization status** | **Complete through `R1-L10N-06`**; English and Simplified Chinese locale catalogs have **253 / 253 matching keys** |
| **Verification status** | At `4b7e94e`, 7 / 7 Node suites passed and locale parity remained 253 English / 253 Simplified Chinese keys |
| **Governance status** | R1 localization, governance reconciliation, Guide restoration, Known terminology correction, bounded acceptance checks, and closure documentation are complete |
| **Feature-development status** | `R2-PWA-01` complete; App Shell SW implemented and verified locally |
| **Current priority** | `R2-RLS-01 — GitHub Pages Installability and Offline Verification` |

The earlier runtime reproducibility risk is resolved. The current application no longer depends on untracked Guide or localization modules.

R0 closure evidence is complete. No verified R0 P0 blocker remains. The product owner explicitly accepted runtime baseline `99ad1e3` on `2026-06-22`.

The exact repository HEAD is intentionally not hard-coded in this document because documentation-only commits may advance it. Git is the source of truth for the current HEAD; `99ad1e3` remains the fixed accepted runtime baseline regardless of later documentation commits.

`b2f1ab1` remains the historical localization baseline. `4b7e94e` is the accepted R1 runtime candidate, and `b7b0852` is the accepted pre-closure documentation baseline. Neither replaces the accepted and tagged R0 baseline.

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
* complete English and Simplified Chinese Interface Language coverage through `R1-L10N-06`.

R1 localization implementation is complete through `R1-L10N-06` with 253 matching English and Simplified Chinese locale keys. Vocabulary and Mixed canonical reconciliation, Guide restoration, Known terminology correction, closure-readiness review, candidate corrections, and bounded acceptance checks are complete. The product owner accepted candidate `4b7e94e`; R1 is Closed and R2 is Active.

The approved target vocabulary model is one global profile across all books and chapters with mutually exclusive Known, Learning, and Hidden outcomes. Current storage and runtime behavior have not been migrated to a new schema or chapter-analysis model.

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

## 3. Accepted R0 Runtime Baseline

**Status: Accepted, locked, and tagged as `r0-closure-99ad1e3`**

Commit `91d6914` is the historical M2 runtime-baseline commit. It is an ancestor of runtime candidate commit `99ad1e3`, with thirteen committed changes following it. Those commits contain R0 governance and archive reconciliation, canonical-document alignment, architecture and persistence documentation, the Guide vocabulary-annotation regression repair, archived localization design records, the retained non-runtime design-lab prototype, and the approved Guide mode-label and semantic-test regression correction.

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

* `tests/glossaryEngine.test.mjs`
* `tests/homeState.test.mjs`
* `tests/levelBaselineEngine.test.mjs`
* `tests/navigationEngine.test.mjs`
* `tests/readingModes.test.mjs`
* `tests/storage.test.mjs`
* `tests/vocabEngine.test.mjs`

The four modules that were previously untracked runtime dependencies are now tracked:

* `pwa-reader/guideBook.js`
* `pwa-reader/i18n.js`
* `pwa-reader/locales/en.js`
* `pwa-reader/locales/zh-CN.js`

The accepted runtime baseline commit is contained in the pushed history of `origin/feature/m2-reader-toc` and is tagged:

```text
r0-closure-99ad1e3 → 99ad1e3
```

Commit `817d902` retains the responsive Vocabulary Preview prototype under `design-lab/` as version-controlled non-runtime experimental material. Production files do not import it. It is not approved runtime implementation and does not count as milestone-completion evidence.

At R0 closure, a separate six-file Guide redesign and interaction draft was preserved outside the repository and was not part of runtime candidate commit `99ad1e3`. That historical state was later superseded when the approved authored-content redesign was selectively restored in R1 candidate `4b7e94e` while retaining the existing Guide key and six chapter IDs.

---

## 4. Verification Evidence

### Historical runtime-baseline evidence

**Status: Historical evidence; not current R0 closure-candidate verification**

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

The preserved Guide draft also passed all seven Node suites in its isolated verification worktree. That historical result established patch recoverability only and did not count as R0 closure-candidate evidence; the later restored Guide was separately verified as part of R1 candidate `4b7e94e`.

### R0 closure evidence for accepted baseline `99ad1e3`

**Status: Complete — accepted by product owner on `2026-06-22`**

| Check | Result |
| --- | --- |
| Runtime JavaScript syntax (`node --check`) | 11 of 11 passed |
| Node test suites | 7 of 7 passed |
| Guide contract | Verified — Mode-owned selection; approved labels; Interface Language independence |
| Desktop browser smoke | Passed at 1280 × 900 |
| Mobile core browser smoke | Passed at 393 × 852 |
| Mobile scrolling | Passed (direct mobile scrolling evidence supersedes the earlier isolated pane-scroll probe limitation) |
| EPUB import (`interleaf_smoke.epub`) | Passed |
| Chapter rendering and navigation | Passed |
| Chinese and Mixed imported-book placeholders | Honest not-implemented placeholders verified |
| Local Library persistence | Passed |
| First reload persistence | Passed |
| Resume/reopen | Passed |
| Approximate chapter/progress restoration | Passed |
| Second reload and restore | Passed |
| IndexedDB / data integrity | No corruption or obvious user-data loss observed |
| Independent evidence review | `R0 READY FOR PRODUCT-OWNER ACCEPTANCE` |
| Product-owner acceptance | 孙书心 — `2026-06-22` |
| Verified R0 P0 blockers | None remaining |

### Bounded regression evidence (historical context)

**Status: Historical supporting evidence; incorporated into R0 closure**

The Guide mode-label and semantic-test regression correction in `99ad1e3` received independent read-only review with verdict `APPROVE`.

| Check | Result |
| --- | --- |
| `node --check pwa-reader/guideBook.js` | Passed |
| `node --check tests/homeState.test.mjs` | Passed |
| Current Node test suites | 7 of 7 passed |
| Guide mode labels | `English Guide`, `中文指南`, and `混合指南` passed |
| Mode-only Guide selection | Passed semantic regression checks |
| Interface Language independence | Passed semantic regression checks |
| `git diff --check` | Passed; line-ending warnings only |
| Independent post-implementation review | `APPROVE` |

This evidence supported the accepted baseline correction and is part of the completed R0 closure record.

### R1-L10N-01 through R1-L10N-06 — Interface Localization

**Status: Complete through the `b2f1ab1` localization baseline**

| Check | Result |
| --- | --- |
| Scope | Approved application Interface Language surfaces through `R1-L10N-06` |
| Locale catalogs | English and Simplified Chinese — **253 / 253 matching keys** |
| Node test suites | 7 of 7 passed |
| Commit sequence after `R1-L10N-01` | `c3d64c7`, `e49acd1`, `3ad0009`, `4f9e1eb`, `b2f1ab1` |
| Completed surfaces | Reader Help and glossary chrome, resume/saved-book UI, Vocabulary Library, application UI sweep, and final localization-gap closure |
| Interface Language boundary | Application UI chrome and feedback only |
| Reading Mode contract | Unchanged — mode selection and persisted values unchanged |
| Guide content contract | Unchanged — Guide metadata, chapter titles, and body remain Reading-Mode-owned |
| Imported book content | Unchanged — title, author, chapters, and body not localized by Interface Language |
| Storage and progress contracts | Unchanged |

Guide metadata, Guide chapter titles, and Guide body content remain **Reading-Mode-owned** and must not be localized through Interface Language.

Localization completion and the restored authored Guide do not implement real imported-book Chinese or Mixed content, change vocabulary persistence, add gestures, or authorize UI redesign.

### R1-GOV-01 — Global Vocabulary Profile and Mixed-Mode Repository Audit

**Status: Complete — read-only audit against `b2f1ab1`**

The audit confirmed the current singleton profile, curated-only Preview, backup schema-v1 limitations, internal `mastered` compatibility surfaces, and missing future `ChapterVocabularyAnalysis`, alignment, and generated-artifact contracts. It made no repository changes.

### R1-GOV-02 — Canonical Vocabulary and Mixed Semantics Reconciliation

**Status: Complete — documentation-only canonicalization**

This task records approved global vocabulary, explicit-action, stable-snapshot, Preview/Mixed, phrase-integrity, backup, and artifact-reproducibility semantics in the six canonical control documents. It does not implement the future runtime or schema.

### R1 closure and acceptance sequence

| Task | Status | Evidence or result |
| --- | --- | --- |
| `R1-GOV-03` | Complete | Closure-readiness review identified the narrow terminology, Guide-fact, and browser-verification gaps. |
| `R1-CLOSE-01` | Complete | Visible terminology changed to `Known / 已认识`; internal compatibility value `mastered` remained unchanged; current export, backup, and placeholder facts were corrected. |
| `R1-CLOSE-01A` | Complete | Approved redesigned Guide content was restored while preserving the Guide key, six chapter IDs, Reading Mode ownership, and imported-book placeholder boundaries. |
| `R1-CLOSE-01B` | Complete | Story-specific personal names remain in English: Elizabeth, Darcy, and Bingley. |
| `R1-ACCEPT-01` | Complete | Product owner manually checked Chinese and Mixed Guide rendering and desktop/mobile layout; no blocking UI issue or visible `Mastered / 已掌握` remained in the checked surfaces. |
| `R1-CLOSE-02` | Complete | Acceptance evidence and English/Chinese User Guides were synchronized in documentation baseline `b7b0852`. |
| `R1-CLOSE-03` | Complete | Product owner accepted `4b7e94e`, closed R1, and activated R2 on `2026-06-24`. |

The R1 acceptance candidate is commit `4b7e94e` (`fix: align Known terminology and Guide facts`) on `feature/m2-reader-toc`. The working tree was clean after the commit, the local branch was synchronized with origin, all 7 Node suites passed, and locale parity remained 253 English / 253 Simplified Chinese keys.

The built-in Guide now has independently authored English and Chinese variants and purpose-written Mixed content rather than sentence-by-sentence slash translation. Reading Mode owns the Guide variant; Interface Language owns application chrome. Manual product-owner checks covered restored Chinese and Mixed Guide rendering and desktop/mobile Guide layout only; they are not evidence of a broader automated browser matrix.

Accepted automated evidence for `4b7e94e` is bounded to 7 / 7 passing Node suites, 253 / 253 locale parity, passing JavaScript syntax checks, and passing diff checks. Accepted manual evidence is bounded to correct restored Chinese and Mixed Guide rendering, no blocking desktop/mobile Guide layout issue, visible `Known / 已认识` terminology, and English personal names Elizabeth, Darcy, and Bingley.

UI terminology such as Home, Reader, Preview, Known, Save, and Hide inside Chinese Guide prose remains deferred content polish after the future UI redesign. This is not an R1 closure blocker.

---

## 5. Post-R0 Monitoring and Remaining Limits

R0 closure verification is complete for baseline `99ad1e3`. No further R0 verification is required unless runtime code changes or a confirmed baseline defect requires governance correction.

The following remain outside the accepted R0 baseline or are deferred to later milestones:

* non-Chromium browser behavior;
* complete accessibility coverage;
* deliberate overlapping vocabulary writes and restore operations beyond the accepted smoke scope;
* deployed behavior matching the accepted baseline on Pages;
* installability and offline application-shell behavior;
* real imported-book Chinese Reading Mode;
* real imported-book Mixed Mode;
* translation-provider behavior;
* R2 installability and offline-baseline verification.

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

### Vocabulary profile, Preview, and backup limitations

The current runtime still uses IndexedDB database `slash-reader-v2-books`, database version `2`, the `vocabularyProfile` singleton key `local`, and the fields `selectedLevel`, `knownWords`, `learningWords`, `ignoredWords`, `preferredCategories`, and `updatedAt`.

Current limitations include:

* internal UI/export compatibility identifier `mastered`, while visible product terminology is `Known / 已认识`;
* curated-only Preview generation;
* personalization applied after candidate generation;
* immediate current-Preview refiltering, which does not match the approved future stable-snapshot contract;
* no baseline asset version or snapshot;
* backup schema version `1` only;
* possible cross-list conflicts through generic save/restore;
* no persisted `ChapterVocabularyAnalysis`;
* no persisted Translation Version, Alignment Map, or `GeneratedMixedArtifact`.

No Profile migration, backup v2, Preview behavior change, dictionary enrichment, long-press Save, or UI redesign is implemented or authorized by the governance documents.

### Service worker and offline application shell

A manifest and planning documents exist. JSZip 3.10.1 and epub.js 0.3.93 are now locally vendored. The initial App Shell and static-data service worker now exists and precaches local JSON datasets. Exact cache scope excludes cross-origin and dynamic requests. Imported EPUBs and profile data remain IndexedDB-only; no private book content is stored in Cache Storage. Local offline browser verification passed manually. Remote GitHub Pages installability/offline verification is still pending.

### Governance reconciliation

Localization implementation is complete through `R1-L10N-06`; canonical vocabulary and Mixed reconciliation, Guide restoration, acceptance-candidate corrections, bounded manual acceptance checks, and product-owner acceptance are complete. R1 is Closed. R2 is Active, with `R2-ENTRY-01 — Installability and Offline Baseline Audit` as the current read-only L2 task.

---

## 8. Documentation and Archive Baseline

**Status: Committed and reconciled**

The R0 documentation rebuild includes:

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

Historical PRD, roadmap, audit, report, M2 execution, redundant guide, vocabulary-semantics, and localization-design records have been committed under `docs/archive/` where applicable.

The post-`91d6914` documentation and archive changes are committed history, not pending working-tree changes. Later documentation-only commits do not alter runtime candidate commit `99ad1e3`.

---

## 9. Remaining Repository Decisions

### Historical archive material

The verified archive moves and preserved M2 records are committed. The former bilingual guide and vocabulary-semantics document were archived in commit `c62ab70`; unresolved localization design records were archived in `9f9d67d`. Archived material remains historical evidence and does not control current milestones.

### Design-lab material

Commit `817d902` retains the responsive Vocabulary Preview prototype under `design-lab/` as version-controlled non-runtime experimental material. It is not imported by the production application, is not approved for production, and is not evidence that responsive Vocabulary Preview has been implemented.

### Restored Guide redesign

The externally preserved Guide draft was used as source evidence for the approved authored-content restoration now included in R1 acceptance candidate `4b7e94e`. It was not applied wholesale: the current Guide key and six chapter IDs remain unchanged, current `Known / 已认识` and export/backup facts were preserved, Chinese content is independently authored, and Mixed content is purpose-written rather than sentence-by-sentence slash translation.

### Local-only material

External backups, source material, generated candidates, and other local-only artifacts are not part of the tracked repository baseline and must not enter the public baseline without separate review.

---

## 10. Closed R0 Scope (Historical Record)

R0 closed on `2026-06-22` with accepted runtime baseline `99ad1e3` and tag `r0-closure-99ad1e3`.

### Included (completed)

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
* lock the accepted runtime baseline and record closure evidence honestly.

### Excluded (remains out of scope)

* new product features beyond the accepted baseline;
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

R0 may be reopened only for a confirmed baseline defect or governance correction.

---

## 11. Immediate Next Action

> **`R2-RLS-01 — GitHub Pages Installability and Offline Verification`**

Verify the application deployment on GitHub Pages.

---

## 12. Remaining Unknowns

* whether the deployed Pages build matches accepted R1 runtime candidate `4b7e94e`;
* whether non-Chromium browsers pass supported flows;
* whether manifest and icons produce a verified installable experience;
* whether service-worker work belongs in R2;
* whether maintainer contact and legal review are complete;
* Hide cancellation restoration behavior;
* same-chapter Preview reopening or regeneration policy;
* legacy cross-list conflict precedence;
* historical baseline registry versus embedded snapshot versus hybrid;
* ordinary phrase terms versus structured `phraseStates`;
* per-term timestamp requirements;
* Mixed thresholds and caps;
* stale-artifact regeneration policy;
* the canonical cross-view position anchor.

---

*Update this file only when repository state, verification state, the active control phase, or the immediate next action materially changes.*
