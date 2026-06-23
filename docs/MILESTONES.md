# Interleaf Reader — Milestones

## 1. Document Purpose

This document defines the delivery order, scope boundaries, and exit criteria for Interleaf Reader milestones.

It answers:

* which milestone is currently active;
* what outcome that milestone must deliver;
* what work is included;
* what work is explicitly excluded;
* what evidence is required before the milestone can close;
* which milestone may begin next.

This document does not define:

* product identity or user requirements;
* current repository or verification status;
* detailed technical architecture;
* implementation tasks;
* test execution history;
* AI-agent instructions;
* future feature commitments without an approved milestone.

The canonical product definition remains in:

```text
docs/INTERLEAF_READER_PRD.md
```

The current implementation and repository state remain in:

```text
docs/PROJECT_STATE.md
```

The former roadmap is archived at `docs/archive/governance/ROADMAP.md`. It organized work as a sequence of feature categories such as persistence, vocabulary ranking, translation, Chinese Mode, Mixed Mode, export, and an AO3 helper.

That file remains useful as historical evidence of early product direction, but it no longer controls delivery order.

Its content is handled as follows:

* the existing English reading, persistence, and vocabulary work is represented by the current product baseline;
* translation, Chinese Mode, Mixed Mode, enhanced EPUB export, and AO3-related ideas move to Later / uncommitted directions;
* glossary and vocabulary-ranking ideas remain possible future work but are not active commitments;
* the old phase order is superseded by this milestone system;
* the old Roadmap is archived and superseded by this milestone system.

---

## 2. Milestone Rules

### One active milestone

Interleaf Reader may have only one active milestone at a time.

The active milestone receives implementation attention, verification work, and project-control updates.

The next and following milestones may be prepared at a product level, but implementation must not begin before their entry conditions are satisfied.

### Work-in-progress limit

The project-wide milestone WIP limit is:

* one Active milestone;
* one Next milestone;
* one Following milestone.

All other ideas remain Later / uncommitted.

A feature does not become active merely because:

* it has a design document;
* UI has been mocked;
* a placeholder exists;
* code has been partially written;
* an AI agent recommends it;
* it appears adjacent to the current task.

### New requirements

New requirements enter Later / uncommitted by default.

They may interrupt the active milestone only when they address:

* an application startup blocker;
* an EPUB import or chapter-render blocker;
* a core reading regression;
* data loss or data corruption;
* a privacy or security issue;
* a legal release blocker;
* an active milestone exit blocker.

All other requests wait for milestone review.

### Scope changes

Adding scope to an active milestone requires one of the following:

1. **Scope exchange**
   A comparable item is removed or deferred so that the milestone remains bounded.

2. **Formal rebaseline**
   The outcome, included scope, excluded scope, risks, and exit criteria are deliberately rewritten and approved.

Adding another task without changing the milestone definition is not valid change control.

### Completion evidence

A milestone cannot close because source code merely exists.

The following status does not count as completion:

> Implemented but unverified

Closing a milestone requires the exit criteria to be supported by current evidence appropriate to the milestone, such as:

* repository inspection;
* automated checks;
* browser verification;
* mobile-sized verification;
* deployment verification;
* documentation consistency;
* review of unresolved risks.

Historical completion claims may support investigation, but they do not replace current evidence for the baseline being closed.

### Change-set discipline

Large recovery or milestone work should be split into reviewable change sets.

For R0, runtime, canonical documentation, historical archive moves, and unresolved experiments must not be silently combined into one undifferentiated commit.

### Milestone ownership

The product owner decides:

* milestone outcomes;
* delivery order;
* scope exchanges;
* formal rebaselines;
* whether a milestone may close;
* whether a Later direction becomes committed work.

AI tools may inspect, propose, implement, and verify.

They must not silently change milestone scope.

---

## 3. Current Baseline

Interleaf Reader currently has an English-reading product baseline centered on:

* personal EPUB import;
* English Study Mode;
* chapter navigation;
* Local Library;
* local reading-progress persistence;
* Vocabulary Preview;
* in-text vocabulary assistance;
* Known, Save, and Hide;
* Vocabulary Library;
* manual vocabulary capture;
* vocabulary export.

The tracked runtime also contains Guide, Settings, Help, interface-language foundations, additional export, and vocabulary-profile backup and restore.

The historical M2 runtime-baseline commit is:

```text
91d6914 — feat: establish reproducible M2 runtime baseline
```

The accepted R0 runtime closure baseline is:

```text
99ad1e3 — fix: align Guide labels with mode contract
```

Commit `91d6914` is an ancestor of accepted runtime baseline `99ad1e3`. The baseline is contained in the pushed history of `origin/feature/m2-reader-toc`, tagged `r0-closure-99ad1e3`, and accepted by product owner 孙书心 on `2026-06-22`.

The responsive Vocabulary Preview prototype retained under `design-lab/` is version-controlled non-runtime experimental material. It is not imported by production, is not approved implementation, and does not count as milestone-completion evidence.

A separate six-file Guide redesign and interaction draft was preserved externally and removed from the R0 working tree. It remains deferred input and was not applied to the accepted baseline.

R1 Interface Language implementation is complete through `R1-L10N-06` at starting baseline `b2f1ab1`. English and Simplified Chinese locale catalogs have 253 / 253 matching keys, and seven Node suites passed at that baseline. `R1-GOV-01` completed the read-only vocabulary/Mixed repository audit; `R1-GOV-02` completed the canonical vocabulary and Mixed semantics reconciliation; `R1-GOV-03 — R1 Closure Readiness and Product-Owner Acceptance Review` is the current L2 documentation task—a read-only closure-readiness and product-owner acceptance review, not runtime implementation.

Current verification evidence and closure status are maintained in `docs/PROJECT_STATE.md`.

Chinese Reading Mode and imported-book Mixed Mode remain placeholders.

R0 is **Closed** as of `2026-06-22`.

R1 is **Active**. Localization and canonical governance reconciliation are complete, but closure-readiness review, closure evidence, and explicit product-owner acceptance remain outstanding. R1 must not be marked Closed merely because locale parity and canonical reconciliation are complete.

R2 remains **Following** and has not started.

---

## 4. Closed Milestone — R0: Project Truth and Structure Reset

**Status: Closed (`2026-06-22`)**

**Accepted runtime baseline:** `99ad1e3`

**Closure baseline tag:** `r0-closure-99ad1e3`

**Product-owner acceptance:** 孙书心 — `2026-06-22`

### Outcome

Interleaf Reader has a consistent, reproducible, and trusted development baseline with no critical internal contradiction between product definition, current state, milestone scope, agent instructions, repository contents, and verification evidence.

A new maintainer or AI agent should be able to determine:

* what the product is;
* what is currently implemented;
* what remains unverified;
* what is only a placeholder;
* which documents are authoritative;
* which files belong to the current baseline;
* what work is allowed next.

### Completed inside R0

The following R0 work is complete:

* the canonical product specification was rebuilt;
* milestone control was centralized in this document;
* active AI instructions were centralized in root `AGENTS.md`;
* historical AI workflow material was separated from active instructions;
* runtime dependencies were reconciled;
* previously untracked Guide and locale modules were added to Git;
* the runtime baseline was verified;
* the runtime baseline was committed as `91d6914`;
* the runtime baseline was pushed to the remote branch;
* subsequent R0 governance, canonical-document, persistence, and archive reconciliation was committed;
* the Guide vocabulary-annotation regression repair was committed;
* the approved Guide mode-label and semantic-test regression correction was committed as `99ad1e3`;
* unresolved localization design records were archived;
* the responsive Vocabulary Preview design-lab prototype was retained as version-controlled non-runtime experimentation;
* the unapproved Guide redesign draft was preserved outside the repository and removed from the R0 working tree;
* the repository working tree was reconciled to runtime candidate commit `99ad1e3` after the approved Guide label and semantic-test regression correction;
* closure verification completed for syntax, tests, Guide contract, desktop/mobile smoke, EPUB import, navigation, placeholders, persistence, restore, and data integrity;
* product-owner acceptance was recorded on `2026-06-22`;
* runtime baseline `99ad1e3` was accepted and tagged `r0-closure-99ad1e3`.

### Closure record

Technical exit evidence and product-owner acceptance are complete. R0 closed on `2026-06-22`.

### Included

R0 includes:

* rebuilding the canonical control documents;
* aligning PRD, Project State, Milestones, and AGENTS;
* repairing critical encoding corruption;
* identifying stale, duplicated, superseded, historical, and future documents;
* deciding which documents should be kept, rewritten, merged, archived, or deleted;
* reconciling the dirty working tree;
* reviewing modified tracked files;
* reviewing untracked files;
* deciding the disposition of untracked runtime dependencies;
* deciding the disposition of M2 harness and evidence documents;
* preserving Git reproducibility;
* confirming that required runtime files remain tracked;
* preserving compatibility-sensitive identifiers;
* retaining current automated-check evidence and rerunning checks when later changes require it;
* retaining current desktop and mobile-sized browser-smoke evidence and rerunning it when later changes require it;
* checking core desktop and mobile-sized reading paths;
* confirming that placeholders remain honest;
* resolving open P0 regressions in the core product path;
* creating a trusted baseline commit or tag;
* recording remaining non-blocking debt without implementing it.

### Excluded

R0 does not include:

* new product features;
* full interface-localization implementation;
* new Guide features or content expansion;
* real Chinese Reading Mode;
* real imported-book Mixed Mode;
* translation-provider integration;
* Translation Version implementation;
* Book Project storage migration;
* chapter or paragraph alignment;
* service-worker implementation;
* new offline behavior;
* general dictionary search;
* automatic enrichment of manually entered words;
* new vocabulary-learning workflows;
* broad JavaScript refactoring;
* broad CSS restructuring;
* UI redesign;
* page-flip pagination;
* cloud accounts or synchronization;
* AO3 integration;
* enhanced EPUB export.

Issues discovered during R0 may be recorded for later work.

They do not automatically enter R0 implementation scope.

### Exit Criteria

R0 may close only when all of the following are true:

* `docs/INTERLEAF_READER_PRD.md` expresses the approved product truth;
* `docs/PROJECT_STATE.md` accurately reflects the current baseline;
* `docs/MILESTONES.md` defines one active delivery sequence;
* `AGENTS.md` is consistent with the PRD, Project State, and milestone system;
* the core control documents do not contain critical internal contradictions;
* no critical encoding corruption remains in active authoritative documents;
* every modified tracked file has an approved disposition;
* every untracked runtime dependency has been tracked or intentionally removed;
* untracked M2 evidence has been adopted, archived, superseded, or intentionally discarded;
* duplicate and temporary repository artifacts have an approved disposition;
* the repository can reproduce the intended application state from tracked files;
* required automated checks pass against the reconciled baseline;
* the copyright-safe browser smoke flow passes against the reconciled baseline;
* core mobile-sized Reader behavior is checked;
* no open P0 startup, import, rendering, navigation, persistence, or data-loss regression remains;
* Chinese and Mixed placeholders remain truthful;
* unresolved non-blocking issues are recorded as debt or Later work;
* a reproducible baseline commit or tag is created;
* the product owner explicitly accepts R0 closure.

---

## 5. Active Milestone — R1: Complete Interface Localization and Onboarding

**Status: Active**

### Entry Condition

R1 entry conditions are satisfied. R0 closed on `2026-06-22` with accepted runtime baseline `99ad1e3` and tag `r0-closure-99ad1e3`.

R1 localization implementation is complete through `R1-L10N-06` at `b2f1ab1`, with 253 / 253 locale-key parity and seven passing Node suites. `R1-GOV-01` and `R1-GOV-02 — Canonical Vocabulary and Mixed Semantics Reconciliation` are complete; `R1-GOV-03 — R1 Closure Readiness and Product-Owner Acceptance Review` is the current Active L2 documentation task—a read-only closure-readiness and product-owner acceptance review, not runtime implementation. Profile migration, backup schema version 2, Preview redesign, UI redesign, dictionary enrichment, and real Mixed Mode remain outside current R1 implementation unless formally rebaselined. The externally preserved Guide draft remains deferred review input, not accepted implementation or milestone evidence, and must not be restored automatically.

### User Outcome

A Chinese-interface user can complete the application onboarding and current supported workflows in Chinese, including:

* first entry;
* Home;
* Settings;
* Help;
* the built-in Guide;
* Reader controls;
* Vocabulary Preview controls;
* Vocabulary Library;
* vocabulary export;
* vocabulary backup and restore.

Changing Interface Language must not alter or translate the user’s imported book text.

### Product Boundary

R1 concerns **Interface Language** and authored onboarding content.

It is not:

* imported-book Chinese Reading Mode;
* machine translation;
* a Translation Version;
* imported-book Mixed Mode;
* a translation-provider milestone.

The built-in Guide may contain human-authored English, Chinese, or Mixed variants as a Guide-specific content exception.

This exception does not establish multilingual generation for user-imported books.

### Included

R1 includes:

* a complete inventory of user-visible interface strings;
* consistent English and Chinese interface coverage;
* first-run language selection;
* Settings language controls;
* Home and Local Library copy;
* Reader navigation and panel copy;
* Vocabulary Preview actions;
* Vocabulary Library labels and feedback;
* export and backup/restore messages;
* errors, empty states, confirmations, and success feedback;
* dialogs, tooltips, titles, and contextual Help;
* accessibility labels associated with localized controls;
* editorial review of the Chinese Guide;
* a deliberate Guide Mixed-content contract;
* preservation of imported titles, authors, chapter labels, and body text;
* verification that Interface Language and Reading Mode remain independent;
* desktop and mobile-sized localization verification;
* bounded canonical governance reconciliation required to keep current UI wording, future vocabulary semantics, and placeholder boundaries honest.

### Excluded

R1 does not include:

* translation-provider integration;
* translating an imported EPUB;
* real Chinese Reading Mode for imported books;
* real Mixed Mode for imported books;
* Book Project migration;
* source-to-translation alignment;
* Vocabulary Profile schema migration;
* backup schema version 2;
* persisted `ChapterVocabularyAnalysis`;
* vocabulary dictionary enrichment;
* general dictionary search;
* cloud localization services;
* automatic translation of user content;
* service-worker or release-platform implementation;
* vocabulary or Reader UI redesign;
* long-press Save or other new gestures;
* unrelated UI redesign.

### Exit Criteria

R1 may close only when:

* all approved current interface surfaces have English and Chinese coverage;
* no critical hard-coded English leakage remains in the Chinese interface;
* dynamic success, error, and confirmation feedback is localized;
* accessibility labels follow the selected Interface Language;
* changing Interface Language does not alter imported content;
* changing Interface Language does not change Reading Mode;
* changing Reading Mode does not silently change Interface Language;
* the built-in Guide behaves consistently across supported authored variants;
* Guide Mixed content satisfies its approved product contract;
* Home, Settings, Help, Reader controls, Vocabulary Library, export, and backup/restore pass the localization acceptance flow;
* desktop and mobile-sized verification pass;
* no P0 regression is introduced into English Study Mode;
* R1 evidence is recorded in the current-state source;
* the canonical product, architecture, and persisted-data documents agree on current versus future vocabulary and Mixed boundaries;
* the product owner explicitly accepts R1 closure.

---

## 6. Following Milestone — R2: Installable Local-First Release

### Entry Condition

R2 may begin only after:

* R0 is closed;
* R1 is closed or deliberately deferred through a formal rebaseline;
* the current application baseline is reproducible;
* release privacy and licensing boundaries are understood.

### User Outcome

A user can access Interleaf Reader from the official deployment location and, where supported by the chosen release implementation:

* load the application shell;
* install or save the application through an appropriate browser path;
* import a local EPUB;
* read in English Study Mode;
* restore local books and progress;
* understand what works offline;
* understand what remains device-local;
* understand which external network dependencies exist;
* understand that private EPUB content is not uploaded by Interleaf Reader.

### Included

R2 includes release outcomes for:

* the official deployment path;
* manifest and icon correctness;
* installability or an explicitly documented bookmarkable fallback;
* app-shell loading behavior;
* offline-boundary definition;
* local-data preservation;
* update and refresh behavior;
* dependency availability;
* deployment-path correctness;
* privacy disclosures;
* release documentation;
* source-available licensing language;
* copyright-safe screenshots or smoke assets;
* remote functional verification;
* release regression checks.

Candidate technical work may include:

* a service worker;
* dependency vendoring;
* app-shell caching;
* cache versioning;
* update handling;
* deployment configuration changes.

These are implementation options, not automatic requirements.

The required result is the verified release outcome, not a specific technology chosen in advance.

### Excluded

R2 does not include:

* caching private EPUB content in inappropriate shared caches;
* cloud accounts;
* cloud book storage;
* cross-device synchronization;
* analytics by default;
* translation-provider integration;
* real Chinese Reading Mode;
* real Mixed Mode;
* Book Project migration;
* public book hosting;
* public translated-book hosting;
* AO3 scraping;
* unrelated product-feature expansion.

### Exit Criteria

R2 may close only when:

* the official application URL passes a functional smoke test;
* the release path loads required application assets;
* manifest and icons are valid for the supported release experience;
* installability or the chosen fallback is accurately documented;
* the app-shell offline boundary is implemented or explicitly documented as unsupported;
* refresh and update behavior are verified;
* user-imported EPUB content remains local to the intended browser storage;
* private book data is not placed in an inappropriate service-worker cache;
* external dependencies and network requests are documented;
* local books, progress, preferences, and vocabulary survive supported refresh and restart flows;
* privacy, license, README, contribution, and release documentation match actual behavior;
* no critical startup, import, reading, persistence, or update regression remains;
* release verification includes an appropriate mobile browser path;
* the product owner explicitly accepts R2 closure.

---

## 7. Later / Uncommitted Directions

The following directions are not committed milestones.

They have no delivery date and must not be implemented as part of R0, R1, or R2 unless a formal rebaseline explicitly changes scope.

### Multilingual book architecture

* Translation Version import;
* generated Translation Versions;
* translation providers;
* protected-term provider enforcement;
* real Chinese Reading Mode;
* real Mixed Mode;
* Book Project migration;
* source and translation provenance;
* chapter alignment;
* paragraph or sentence alignment;
* alignment-repair workflows;
* generated-artifact fingerprints, staleness, regeneration, and cross-view position continuity.

### Vocabulary depth

* a future global Vocabulary Profile migration from current compatibility fields;
* baseline asset versioning or restorable snapshots;
* reproducible `ChapterVocabularyAnalysis` records;
* broad Preview and narrower Mixed candidate projections;
* intact phrase identity across analysis and future alignment;
* richer reading-context vocabulary enrichment;
* pronunciation and morphology;
* collocations and richer usage data;
* contextual source references that do not create book- or chapter-specific vocabulary state;
* any future assessed mastery lifecycle, only after a separate product decision;
* additional external export formats.

General dictionary search is not part of the current product direction.

Automatically enriching every manually entered word is also not an assumed extension.

Either change would require a deliberate product decision.

### Entry gates for a future vocabulary or multilingual milestone

No future milestone may implement Profile migration, backup v2, chapter analysis, alignment, or real Mixed Mode until its entry conditions include:

* the approved global Known / Learning / Hidden semantics and compatibility mapping;
* a phrase-identity contract;
* a baseline version, snapshot, or approved hybrid restoration policy;
* reproducible chapter-analysis inputs and broad Preview versus narrower Mixed outputs;
* Translation Version and alignment identity where multilingual output is required;
* generated-artifact fingerprints, staleness, and regeneration policy;
* a canonical cross-view position-continuity contract;
* migration, rollback, compatibility, and real-browser verification plans.

These gates are architecture prerequisites, not evidence that the corresponding runtime or schema exists.

### Reading and platform expansion

* cloud accounts;
* cross-device synchronization;
* public or shared bookshelves;
* page-flip pagination;
* enhanced EPUB export;
* AO3 import helper;
* browser extension support;
* additional source formats;
* hosted or public translated-book services.

### Promotion to a milestone

A Later direction may become a milestone only when:

* the user problem is clearly defined;
* the outcome supports the PRD;
* dependencies and privacy boundaries are understood;
* entry and exit criteria can be written;
* the current active milestone is closed;
* the product owner approves its delivery priority.

A design document alone does not promote Later work into a committed milestone.

---

## 8. Change-Control Process

### Recording a new idea

A new idea should first be recorded as one of:

* Later / uncommitted direction;
* product decision question;
* experiment;
* bug;
* active milestone blocker.

It must not be assigned directly to an implementation agent unless it belongs to the active milestone or qualifies for interruption.

### Classifying the request

Before implementation, determine whether the request is:

* a milestone deliverable;
* a feature;
* a task;
* a bug;
* an experiment;
* documentation maintenance;
* technical debt;
* information debt;
* a product decision.

A request that cannot be classified is not ready for implementation.

### Promoting Later work

Later work may be promoted only through milestone planning.

Promotion requires:

* a complete outcome;
* an entry condition;
* Included scope;
* Excluded scope;
* Exit Criteria;
* known dependencies;
* explicit product-owner approval.

### Scope exchange

When an approved new requirement enters the active milestone, the milestone must either:

* remove or defer another item;
* or be formally rebaselined.

“Small additional work” is still scope and must be visible.

### Required document updates

Update `docs/INTERLEAF_READER_PRD.md` when:

* the target user changes;
* product meaning changes;
* a core user journey changes;
* a product boundary changes;
* a non-goal becomes a goal.

Update `docs/DECISION_LOG.md` when:

* a durable product decision is made;
* architecture or compatibility policy changes;
* privacy, licensing, or external-data behavior changes;
* a milestone is formally rebaselined.

Update `docs/PROJECT_STATE.md` when:

* implementation or verification status changes;
* the active control phase changes;
* a blocker appears or is resolved;
* the immediate next action changes.

Update `docs/MILESTONES.md` when:

* milestone order changes;
* Included or Excluded scope changes;
* entry or exit criteria change;
* a milestone becomes Active, Next, Following, or Closed.

### Preventing scope creep

During an active milestone:

* record new ideas;
* do not implement them automatically;
* do not expand nearby features;
* do not create placeholder UI for unapproved future work;
* do not treat documentation proposals as delivery commitments;
* do not let an AI agent add “helpful” adjacent changes;
* close or formally rebaseline the milestone before changing its outcome.

---

## 9. Milestone Status Summary

| Milestone                                                     | Outcome                                                                                                     | Status                  | Entry condition                                    | Exit condition                                                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **R0 — Project Truth and Structure Reset**                    | A consistent, reproducible, trusted development baseline                                                    | **Closed** (`2026-06-22`) | Project reset approved; feature development paused | Canonical docs and archive reconciled, repository reproducible, evidence current, trusted baselines locked |
| **R1 — Complete Interface Localization and Onboarding**       | Chinese-interface users can complete all current supported workflows without altering imported content      | **Active**              | R0 closed (`2026-06-22`)                           | Localization and onboarding acceptance flows pass without English Study regression                         |
| **R2 — Installable Local-First Release**                      | Users can access the official release, understand install/offline boundaries, and retain local reading data | **Following**           | R0 closed and R1 closed or formally deferred       | Release, privacy, deployment, installability or fallback, update, and local-data verification pass         |
| **Translation and multilingual book system**                  | Real Translation Versions, Chinese Mode, and Mixed Mode                                                     | **Later / uncommitted** | Separate approved milestone                        | Not defined                                                                                                |
| **Vocabulary enrichment and additional exports**              | Greater vocabulary depth without replacing reading                                                          | **Later / uncommitted** | Separate approved milestone                        | Not defined                                                                                                |
| **Cloud, AO3, enhanced EPUB, and reading-platform expansion** | Optional platform expansion                                                                                 | **Later / uncommitted** | Separate approved milestone                        | Not defined                                                                                                |

---

*Update this document only when milestone scope, sequence, status, entry conditions, or exit criteria materially change.*
