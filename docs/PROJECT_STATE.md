# Interleaf Reader — Project State

**Last updated:** 2026-06-22
**Canonical product specification:** `docs/INTERLEAF_READER_PRD.md`
**Active control phase:** `R1 — Complete Interface Localization and Onboarding`

---

## 1. Snapshot

| Field | Current state |
| --- | --- |
| **Repository branch** | `feature/m2-reader-toc` |
| **Accepted runtime baseline** | `99ad1e3` — `fix: align Guide labels with mode contract` |
| **Runtime baseline tag** | `r0-closure-99ad1e3` (annotated tag on `99ad1e3`) |
| **Product-owner acceptance** | 孙书心 accepted the R0 runtime baseline on `2026-06-22` |
| **R0 status** | **Closed** (`2026-06-22`) |
| **R1 status** | **Active** — planning and scope confirmation; broad implementation has not started |
| **R2 status** | **Following** |
| **Repository state rule** | Read the current repository HEAD from Git; do not treat HEAD as the runtime baseline |
| **Documentation baseline** | Canonical and historical archive work is committed and reconciled; later documentation-only commits do not change the accepted runtime baseline |
| **Localization status** | Interface-language foundation exists; complete localization is R1 work and has not started |
| **Feature-development status** | R1 active for bounded planning only |
| **Current priority** | Read-only R1 entry audit and bounded task-plan proposal |

The earlier runtime reproducibility risk is resolved. The current application no longer depends on untracked Guide or localization modules.

R0 closure evidence is complete. No verified R0 P0 blocker remains. The product owner explicitly accepted runtime baseline `99ad1e3` on `2026-06-22`.

The exact repository HEAD is intentionally not hard-coded in this document because documentation-only commits may advance it. Git is the source of truth for the current HEAD; `99ad1e3` remains the fixed accepted runtime baseline regardless of later documentation commits.

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

A separate six-file Guide redesign and interaction draft was preserved outside the repository, verified as recoverable in an isolated worktree, and removed from the R0 working tree. It is unapproved R1 work, is not part of runtime candidate commit `99ad1e3`, and leaves Guide chapter-ID and editorial decisions deferred.

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

The preserved Guide draft also passed all seven Node suites in its isolated verification worktree. That result establishes patch recoverability only; it does not verify runtime candidate commit `99ad1e3` and does not count as R0 closure-candidate evidence.

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

---

## 5. Post-R0 Monitoring and Remaining Limits

R0 closure verification is complete for baseline `99ad1e3`. No further R0 verification is required unless runtime code changes or a confirmed baseline defect requires governance correction.

The following remain outside the accepted R0 baseline or are deferred to later milestones:

* non-Chromium browser behavior;
* complete interface-localization coverage;
* complete accessibility coverage;
* deliberate overlapping vocabulary writes and restore operations beyond the accepted smoke scope;
* deployed behavior matching the accepted baseline on Pages;
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

Interface-language infrastructure exists, but complete English and Chinese Interface Language localization is R1 work and has not started.

Known remaining areas include:

* hard-coded user-facing strings;
* dynamic feedback and error messages;
* accessibility labels;
* complete Chinese interface coverage;
* final Guide Mixed-content compliance.

The preserved Guide redesign draft is not localization implementation and is not part of runtime candidate commit `99ad1e3`.

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

### Preserved Guide draft

The six-file Guide redesign and interaction draft is preserved externally as verified, recoverable, unapproved R1 work. It is absent from runtime candidate commit `99ad1e3`. Guide chapter-ID and editorial decisions remain deferred until R1 review.

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

> Perform a read-only R1 entry audit and propose a bounded R1 task plan.

The first R1 action is planning and scope confirmation, not immediate broad implementation.

The next R1 change set should:

1. audit externally preserved Guide redesign input and R1 localization scope boundaries;
2. confirm what is in scope for Interface Language, onboarding, and Guide editorial review;
3. propose bounded implementation tasks without restoring the external Guide patch automatically;
4. keep Codex reserved for narrow implementation after Antigravity analysis;
5. record the plan without implementing localization or Guide redesign yet.

No broad R1 feature implementation should begin without an approved bounded task plan.

---

## 12. Remaining Unknowns

* whether the deployed Pages build matches accepted runtime baseline `99ad1e3`;
* whether non-Chromium browsers pass supported flows;
* whether complete localization satisfies the R1 contract once R1 implementation begins;
* whether manifest and icons produce a verified installable experience;
* whether service-worker work belongs in R2;
* whether maintainer contact and legal review are complete;
* how the externally preserved Guide redesign should be reviewed and sequenced within R1.

---

*Update this file only when repository state, verification state, the active control phase, or the immediate next action materially changes.*
