# Interleaf Reader — Decision Log

## 1. Purpose and Rules

This document is the chronological record of durable Interleaf Reader decisions.

It records decisions about:

* product direction and boundaries;
* architecture;
* persisted data and compatibility;
* privacy and security;
* licensing and governance;
* milestone and change-control policy.

This document does not record:

* current implementation status;
* branch, commit, or working-tree state;
* task lists;
* test execution results;
* temporary blockers;
* milestone execution logs;
* complete architecture specifications;
* Codex session summaries.

Those responsibilities belong to:

| Document                              | Responsibility                                |
| ------------------------------------- | --------------------------------------------- |
| `docs/INTERLEAF_READER_PRD.md`        | Canonical product truth                       |
| `docs/PROJECT_STATE.md`               | Current implementation and verification truth |
| `docs/MILESTONES.md`                  | Milestone order, scope, and exit criteria     |
| `docs/ARCHITECTURE.md`                | Current technical architecture                |
| `docs/DATA_MODEL.md`                  | Persisted-data contracts                      |
| `AGENTS.md`                           | AI repository working rules                   |
| `docs/HANDOFF.md` / `CONTRIBUTING.md` | Setup, testing, and contributor procedures    |
| `LICENSE`                             | Controlling license terms                     |
| `docs/LICENSE_DECISION.md`            | Licensing rationale and permission process    |

Historical decisions are not silently rewritten.

When a decision changes:

1. preserve the original decision;
2. mark it `Superseded`;
3. create a new decision;
4. link the old and new decision IDs.

Implementation progress does not change a decision’s historical wording.

Current status details belong in `PROJECT_STATE.md`, not here.

---

## 2. Status Legend

| Status         | Meaning                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| **Active**     | The decision currently controls product or engineering behavior               |
| **Completed**  | The decision was carried out and remains part of project history              |
| **Superseded** | A later decision replaced or materially revised it                            |
| **Deferred**   | The direction remains possible, but implementation is intentionally postponed |
| **Proposed**   | The idea has been recorded but is not yet an approved controlling decision    |

---

## 3. Decision Index

| ID      | Date       | Area                     | Decision                                                     | Status     | Replaced by               |
| ------- | ---------- | ------------------------ | ------------------------------------------------------------ | ---------- | ------------------------- |
| DEC-001 | 2026-06-16 | Product identity         | Official product name and internal brand                     | Active     | —                         |
| DEC-002 | 2026-06-16 | Compatibility            | Public rename while preserving internal identifiers          | Active     | —                         |
| DEC-003 | 2026-06-16 | Product terminology      | Use Mixed Mode in user-facing copy                           | Active     | —                         |
| DEC-004 | 2026-06-16 | Product scope            | Original English Study MVP scope                             | Superseded | DEC-019, DEC-020, DEC-022 |
| DEC-005 | 2026-06-16 | Vocabulary               | Original Known / Save / Hide and reading-derived-only model  | Superseded | DEC-020, DEC-022          |
| DEC-006 | 2026-06-16 | Vocabulary               | Mastered is the Known archive in the current model           | Active     | —                         |
| DEC-007 | 2026-06-16 | Reading modes            | Imported-book Chinese and Mixed modes remain placeholders    | Active     | —                         |
| DEC-008 | 2026-06-16 | Translation architecture | Translation boundary must be provider-agnostic               | Active     | —                         |
| DEC-009 | 2026-06-16 | Security                 | No provider credentials in public frontend code              | Active     | —                         |
| DEC-010 | 2026-06-16 | Delivery architecture    | Static web delivery is the baseline                          | Active     | —                         |
| DEC-011 | 2026-06-16 | Privacy                  | No accounts or cloud sync in the current product baseline    | Active     | —                         |
| DEC-012 | 2026-06-16 | Development process      | One focused task per AI implementation session               | Active     | —                         |
| DEC-013 | 2026-06-16 | Licensing                | Select a custom non-commercial license direction             | Superseded | DEC-014                   |
| DEC-014 | 2026-06-16 | Licensing                | Create the final custom source-available license             | Completed  | —                         |
| DEC-015 | 2026-06-17 | Licensing                | Commercial use requires separate written permission          | Active     | —                         |
| DEC-016 | 2026-06-18 | Future architecture      | Organize multilingual work around Book Projects and versions | Active     | —                         |
| DEC-017 | 2026-06-18 | Future data model        | Keep Book Project modeling conceptual before migration       | Deferred   | —                         |
| DEC-018 | 2026-06-19 | Guide                    | Model the built-in Guide as a virtual book                   | Active     | —                         |
| DEC-019 | 2026-06-20 | Product positioning      | Refine the core user and interest-driven reading mission     | Active     | —                         |
| DEC-020 | 2026-06-20 | Vocabulary               | Separate reading-context assistance from external capture    | Active     | —                         |
| DEC-021 | 2026-06-20 | Product boundary         | Manual Add is capture, not general dictionary lookup         | Active     | —                         |
| DEC-022 | 2026-06-20 | Vocabulary               | Vocabulary Library is a collection and export layer          | Active     | —                         |
| DEC-023 | 2026-06-20 | Documentation governance | Assign one responsibility to each control document           | Active     | —                         |
| DEC-024 | 2026-06-20 | Milestone governance     | Adopt one Active milestone and formal change control         | Active     | —                         |

---

## 4. Decisions

### DEC-001 — Official product name and internal brand

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Product identity
* **Decision:** The official product name is **Interleaf Reader**. **BookHeart** is the creator and internal brand. **Slash Reader v2** is the former codename.
* **Context:** The project needed a stable public identity aligned with layered multilingual reading.
* **Consequences:**

  * Public-facing product copy should use Interleaf Reader.
  * BookHeart may appear as creator or internal brand.
  * Slash Reader v2 may remain in historical or compatibility contexts.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `README.md`

---

### DEC-002 — Public rename while preserving internal identifiers

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Compatibility
* **Decision:** User-facing naming should be updated to Interleaf Reader without casually renaming internal compatibility identifiers.
* **Context:** Existing storage, paths, scripts, and debug surfaces used Slash-era identifiers.
* **Consequences:**

  * User-facing stale naming may be cleaned.
  * IndexedDB names, localStorage keys, persisted fields, debug globals, and other compatibility identifiers require an explicit migration task before renaming.
  * Historical internal names do not mean the public product name remains Slash Reader.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`

---

### DEC-003 — Use Mixed Mode in user-facing copy

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Product terminology
* **Decision:** User-facing product and interface copy should use **Mixed Mode**, not **Cloze Mixed**.
* **Context:** The older internal term did not match the intended reading experience.
* **Consequences:**

  * Internal values such as `cloze-mixed` and `clozeHtml` remain compatibility identifiers.
  * Renaming those identifiers requires an explicit migration.
  * User-facing documentation should not describe the mode as a cloze exercise.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `AGENTS.md`

---

### DEC-004 — Original English Study MVP scope

* **Date:** 2026-06-16
* **Status:** Superseded
* **Area:** Product scope
* **Decision:** The original MVP was defined as English Study Mode, EPUB import, navigation, local persistence, vocabulary assistance, manual add, and basic export, while excluding real translation, accounts, cloud sync, and spaced repetition.
* **Context:** The project needed a bounded first vertical slice.
* **Consequences:**

  * The decision established English Study Mode as the core path.
  * Its detailed user definition and vocabulary boundaries were later refined.
  * Current product scope must be read from PRD v2, not this historical MVP list.
* **Supersedes:** None
* **Superseded by:** DEC-019, DEC-020, DEC-022
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `docs/PROJECT_STATE.md`

---

### DEC-005 — Original Known / Save / Hide and reading-derived-only model

* **Date:** 2026-06-16
* **Status:** Superseded
* **Area:** Vocabulary
* **Decision:** The original vocabulary model defined Known, Save, and Hide and described Vocabulary Library as reading-derived.
* **Context:** Early vocabulary work focused on terms discovered inside imported chapters.
* **Consequences:**

  * The three action semantics influenced the current storage model.
  * The reading-derived-only limitation is no longer valid.
  * External manual capture is now a separate approved workflow.
* **Supersedes:** None
* **Superseded by:** DEC-020, DEC-022
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, vocabulary planning documents

---

### DEC-006 — Mastered is the Known archive in the current model

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Vocabulary
* **Decision:** The current **Mastered** tab may display terms stored in `knownWords`.
* **Context:** The application had a Mastered label without a true learning-to-mastered assessment lifecycle.
* **Consequences:**

  * Mastered currently means an archive of terms the user reports already knowing.
  * It does not prove that Interleaf taught, tested, or verified mastery.
  * A true learning-to-mastered lifecycle requires a separate product decision.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `docs/DATA_MODEL.md`

---

### DEC-007 — Imported-book Chinese and Mixed modes remain placeholders

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Reading modes
* **Decision:** Chinese Reading Mode and Mixed Mode for user-imported books remain explicit placeholders until real multilingual data and architecture exist.
* **Context:** The English Study vertical slice was usable before translation architecture, providers, provenance, and alignment were decided.
* **Consequences:**

  * Placeholder panels must not imply real translation.
  * Switching to a placeholder must not falsely create generated content.
  * Guide-authored Chinese or Mixed content is a Guide-specific exception.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `docs/PROJECT_STATE.md`

---

### DEC-008 — Translation boundary must be provider-agnostic

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Translation architecture
* **Decision:** Future translation architecture must use a provider-agnostic boundary. DeepL must not be treated as the only permitted provider.
* **Context:** Provider quality, cost, credentials, regional availability, and user preference may differ.
* **Consequences:**

  * Provider-specific behavior must remain behind a stable boundary.
  * Provider choice is not an implementation commitment.
  * A future milestone must define the first supported provider and its data flow.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** future multilingual architecture documents, `docs/INTERLEAF_READER_PRD.md`

---

### DEC-009 — No provider credentials in public frontend code

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Security
* **Decision:** Developer-owned or user provider credentials must not be embedded in committed public frontend JavaScript.
* **Context:** Static frontend code cannot protect secrets.
* **Consequences:**

  * Real provider integration requires a separately approved credential boundary.
  * Privacy and architecture documents must be updated before provider calls are added.
  * Companion services, proxies, custom endpoints, or local providers remain undecided options.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `PRIVACY.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`

---

### DEC-010 — Static web delivery is the baseline

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Delivery architecture
* **Decision:** Interleaf Reader should remain deliverable as a static web application, with GitHub Pages or equivalent static hosting as the baseline distribution model.
* **Context:** The project uses browser ES modules, local storage, and no mandatory backend.
* **Consequences:**

  * Core reading must not require an Interleaf account server.
  * Installability and offline capability require separate verification.
  * Current deployment status belongs in `PROJECT_STATE.md`, not this decision.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/MILESTONES.md`, `docs/GITHUB_PAGES_DEPLOYMENT.md`, `docs/PWA_OFFLINE_CACHE_PLAN.md`

---

### DEC-011 — No accounts or cloud sync in the current baseline

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Privacy
* **Decision:** The current product baseline has no user accounts, cloud library, or cross-device synchronization.
* **Context:** Local-first storage reduces privacy, infrastructure, and maintenance complexity.
* **Consequences:**

  * Books, progress, preferences, and vocabulary remain local by default.
  * Backup and export may provide limited portability.
  * Any future cloud feature requires a new product, privacy, security, and architecture decision.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `PRIVACY.md`, `docs/INTERLEAF_READER_PRD.md`

---

### DEC-012 — One focused task per AI implementation session

* **Date:** 2026-06-16
* **Status:** Active
* **Area:** Development process
* **Decision:** AI-assisted implementation sessions should normally execute one focused task with bounded files, acceptance criteria, exclusions, and checks.
* **Context:** Broad sessions created scope creep, regressions, repeated reading, and unclear completion claims.
* **Consequences:**

  * A session should not silently implement adjacent work.
  * One session is normally a task, not an entire milestone.
  * The detailed operational rules are maintained in `AGENTS.md`.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `AGENTS.md`, `docs/MILESTONES.md`

---

### DEC-013 — Select a custom non-commercial license direction

* **Date:** 2026-06-16
* **Status:** Superseded
* **Area:** Licensing
* **Decision:** The project should use a custom non-commercial community license rather than MIT, GPL, or AGPL.
* **Context:** The owner wanted source visibility and non-commercial community use without automatically permitting commercial reuse.
* **Consequences:**

  * This entry recorded the license direction before the final license file existed.
  * It is superseded by the completed license decision.
* **Supersedes:** None
* **Superseded by:** DEC-014
* **Related documents:** `docs/LICENSE_DECISION.md`, `LICENSE`

---

### DEC-014 — Create the final custom source-available license

* **Date:** 2026-06-16
* **Status:** Completed
* **Area:** Licensing
* **Decision:** The repository uses the **Interleaf Reader Non-Commercial Community License**, a custom non-commercial, source-available license.
* **Context:** The license direction required a controlling repository artifact.
* **Consequences:**

  * `LICENSE` controls the legal terms.
  * `docs/LICENSE_DECISION.md` records rationale and process but does not override `LICENSE`.
  * The project must not be described as MIT-licensed.
  * The project must not be described as OSI open source.
  * Personal, educational, research, hobby, and other permitted non-commercial uses follow the controlling `LICENSE`.
  * Legal review remains separate from the completed selection.
* **Supersedes:** DEC-013
* **Superseded by:** None
* **Related documents:** `LICENSE`, `CONTRIBUTING.md`, `README.md`

---

### DEC-015 — Commercial use requires separate written permission

* **Date:** 2026-06-17
* **Status:** Active
* **Area:** Licensing
* **Decision:** Commercial use requires separate written permission from the project owner or authorized maintainer.
* **Context:** The custom license separates permitted non-commercial use from commercial permission.
* **Consequences:**

  * Issues, pull requests, forks, discussions, or maintainer silence do not grant commercial permission.
  * Commercial requests should describe the requester, use, distribution, monetization, modifications, branding, privacy flow, audience, and timeline.
  * Maintainer contact and legal review remain pending questions.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `LICENSE`, `docs/LICENSE_DECISION.md`, `CONTRIBUTING.md`

---

### DEC-016 — Organize multilingual work around Book Projects and versions

* **Date:** 2026-06-18
* **Status:** Active
* **Area:** Future architecture
* **Decision:** Future multilingual support should be organized around a Book Project containing a source version and one or more Translation Versions.
* **Context:** Translation, provenance, Chinese Mode, Mixed Mode, and alignment should not be designed as unrelated features.
* **Consequences:**

  * Translation Versions may eventually be user-provided or generated.
  * Generated Mixed and paired-version Mixed should remain conceptually distinct.
  * Alignment should begin at chapter level before deeper alignment.
  * This direction is not current implementation scope.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/MULTILINGUAL_BOOK_PROJECT_STRATEGY.md`, `docs/BOOK_PROJECT_DATA_MODEL_PROPOSAL.md`

---

### DEC-017 — Keep Book Project modeling conceptual before migration

* **Date:** 2026-06-18
* **Status:** Deferred
* **Area:** Future data model
* **Decision:** Book Project, Book Version, Translation Version, alignment, Mixed artifact, and progress concepts should remain conceptual until an explicit migration milestone is approved.
* **Context:** The project needed architectural clarity without destabilizing current IndexedDB records.
* **Consequences:**

  * Current persisted data must not be migrated merely because a proposal exists.
  * Existing records should be wrapped, referenced, or migrated conservatively in future work.
  * Storage schema, migration, repair UX, and tests remain undecided.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/BOOK_PROJECT_DATA_MODEL_PROPOSAL.md`, `docs/DATA_MODEL.md`

---

### DEC-018 — Model the built-in Guide as a virtual book

* **Date:** 2026-06-19
* **Status:** Active
* **Area:** Guide
* **Decision:** The built-in user Guide should behave as a virtual book opened through Local Library and Reader rather than as a separate expandable Home help panel.
* **Context:** The Guide should teach the product through the same Reader surfaces the user must learn.
* **Consequences:**

  * The Guide may use Contents, Progress, Preview, vocabulary interactions, and authored language variants.
  * It must not be stored as a user-imported EPUB blob.
  * Guide-authored Chinese or Mixed content does not enable those modes for imported books.
* **Supersedes:** The earlier standalone expandable Home-guide model, which did not have a decision ID
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, Guide implementation files

---

### DEC-019 — Refine the core user and interest-driven reading mission

* **Date:** 2026-06-20
* **Status:** Active
* **Area:** Product positioning
* **Decision:** Interleaf Reader primarily serves non-native English readers who have some English ability and an ongoing learning goal but experience resistance to long English texts because they lack sustained English-language exposure.
* **Context:** The earlier description was too broad and did not explain the psychological barrier or the role of interest-driven reading.
* **Consequences:**

  * Novels, web fiction, fanfiction, and other personally engaging texts are valid entry points for sustained English exposure.
  * IELTS or other exam goals may motivate users, but Interleaf is not an IELTS training application.
  * Product decisions should prioritize long-form reading tolerance and immersion.
* **Supersedes:** The target-user portion of DEC-004
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`

---

### DEC-020 — Separate reading-context assistance from external capture

* **Date:** 2026-06-20
* **Status:** Active
* **Area:** Vocabulary
* **Decision:** Interleaf Reader has two distinct vocabulary workflows.
* **Context:** The older reading-derived-only model did not reflect Manual Add or vocabulary encountered outside the Reader.
* **Consequences:**

  1. **Reading-context assistance**

     * Applies to interactive terms in the current reading text.
     * Provides lightweight information so the user can continue reading.
  2. **External manual capture**

     * Records terms encountered in media, websites, advertisements, classes, or daily life.
     * Supports accumulation and later export to another study application.

  * The workflows may share Vocabulary Library storage without having identical metadata.
* **Supersedes:** The reading-derived-only boundary in DEC-005
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `docs/DATA_MODEL.md`

---

### DEC-021 — Manual Add is capture, not general dictionary lookup

* **Date:** 2026-06-20
* **Status:** Active
* **Area:** Product boundary
* **Decision:** Interleaf Reader does not currently provide arbitrary or general dictionary search. Manual Add records a term; it is not a lookup operation.
* **Context:** Manual capture could otherwise be mistaken for a promise to build a generic dictionary.
* **Consequences:**

  * Manual Add does not promise a definition, translation, example sentence, pronunciation, morphology, synonym, collocation, or automatic enrichment.
  * A manually entered term is successful when it is reliably normalized, stored, and exportable.
  * Changing this boundary requires a PRD update and a new durable decision before implementation.
* **Supersedes:** None
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `AGENTS.md`

---

### DEC-022 — Vocabulary Library is a collection and export layer

* **Date:** 2026-06-20
* **Status:** Active
* **Area:** Vocabulary
* **Decision:** Vocabulary Library is a collection, organization, backup, and export layer rather than a complete vocabulary-learning engine.
* **Context:** Expanding vocabulary management could displace reading as the product center.
* **Consequences:**

  * Known, Save, Hide, Manual Add, Remove, backup, and export may be supported.
  * Flashcards, quizzes, drills, spaced repetition, streaks, and mandatory review are outside the current product boundary.
  * `Mastered` may remain a Known archive label and must not imply tested mastery.
  * Vocabulary work must remain subordinate to reading continuity.
* **Supersedes:** The product-boundary portion of DEC-005
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `AGENTS.md`

---

### DEC-023 — Assign one responsibility to each control document

* **Date:** 2026-06-20
* **Status:** Active
* **Area:** Documentation governance
* **Decision:** Each control document has one primary responsibility.
* **Context:** Product truth, current state, implementation notes, roadmap, and agent instructions had become duplicated and contradictory.
* **Consequences:**

  * PRD controls product truth.
  * PROJECT_STATE controls current implementation and verification truth.
  * MILESTONES controls milestone order, scope, and exit criteria.
  * DECISION_LOG controls durable decisions.
  * ARCHITECTURE and the `docs/DATA_MODEL.md` control technical contracts.
  * AGENTS controls AI working rules.
  * HANDOFF and CONTRIBUTING control operational procedures.
  * `PRD_SOURCE_AUDIT.md` is historical evidence, not required authority.
  * HANDOFF is not canonical implementation truth.
* **Supersedes:** The legacy documentation hierarchy in PRD v1 and earlier workflow documents
* **Superseded by:** None
* **Related documents:** `docs/INTERLEAF_READER_PRD.md`, `docs/PROJECT_STATE.md`, `docs/MILESTONES.md`, `AGENTS.md`

---

### DEC-024 — Adopt one Active milestone and formal change control

* **Date:** 2026-06-20
* **Status:** Active
* **Area:** Milestone governance
* **Decision:** Interleaf Reader may have only one Active milestone. New ideas default to Later / uncommitted.
* **Context:** Feature-category roadmaps and repeated scope additions made completion and priority difficult to determine.
* **Consequences:**

  * Scope additions require a scope exchange or formal rebaseline.
  * `Implemented but not fully verified` does not count as milestone completion.
  * R0 — Project Truth and Structure Reset is adopted as the current Active control milestone.
  * R0 does not add product features.
  * M2 is not declared Closed by this decision; its final disposition remains unresolved until the repository baseline is reconciled.
* **Supersedes:** The old phase-only Roadmap as the controlling delivery model
* **Superseded by:** None
* **Related documents:** `docs/MILESTONES.md`, `docs/PROJECT_STATE.md`, `AGENTS.md`

---

## 5. Pending Decision Questions

Pending questions are not approved features or delivery commitments.

### PDQ-001 — Translation credential boundary

Decide how future provider credentials are supplied, stored, transmitted, revoked, and protected.

Possible approaches require architecture and privacy review.

### PDQ-002 — Translation Version import format

Decide the supported import format, metadata requirements, provenance fields, validation, and failure behavior for user-provided Translation Versions.

### PDQ-003 — Book Project migration

Decide whether current book records are wrapped, referenced, copied, or migrated into a future Book Project model.

The decision must include rollback and compatibility behavior.

### PDQ-004 — Alignment and repair UX

Decide the initial alignment granularity and how users inspect or repair mismatched source and translation chapters.

### PDQ-005 — Translation-provider selection

Decide whether the first real provider is remote, local, self-hosted, user-configured, or accessed through a secure companion service.

### PDQ-006 — Storage quota and eviction

Decide how the product detects storage pressure, warns users, and evicts generated translation or cache data without losing original books or user vocabulary.

### PDQ-007 — Source-material retention

Decide how local reference PDFs and other source materials are retained, backed up, excluded from publication, and documented without creating copyright risk.

### PDQ-008 — Maintainer contact and legal review

Decide the public contact channel for commercial permission and complete appropriate review of the custom license and release language.

### PDQ-009 — M2 disposition

After R0 repository reconciliation, decide whether M2 should be:

* closed with verified evidence;
* superseded by the new milestone system;
* split into completed and deferred scope;
* retained as historical milestone evidence.

### PDQ-010 — Mastered terminology

Decide whether the current Known archive should continue to be labeled Mastered or be renamed to reduce learning-lifecycle ambiguity.

### PDQ-011 — General dictionary or manual enrichment boundary

General dictionary search and automatic enrichment remain outside the current product direction.

Any future proposal must define:

* the user problem;
* data source and licensing;
* offline and privacy behavior;
* relationship to reading-first scope;
* whether the capability applies to manually captured terms.

---

*Add a new decision only when a durable product, architecture, compatibility, privacy, licensing, or milestone rule is approved. Do not use this file as a task or status log.*
