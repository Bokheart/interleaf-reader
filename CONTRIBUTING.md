# Contributing to Interleaf Reader

## 1. Project Scope

Interleaf Reader is a mobile-first, local-first, reading-first application for long-form English reading.

Contributions should preserve reading continuity and remain within the current Active milestone.

Do not silently turn the project into:

* a flashcard, quiz, drill, streak, or spaced-repetition application;
* a general dictionary;
* a generic translation service;
* an IELTS training application;
* a social reading platform;
* a public book or translation library;
* an AO3 scraper.

Manual Add is vocabulary capture, not dictionary lookup.

Vocabulary Library is a collection, organization, backup, and export layer, not a complete learning engine.

---

## 2. Read Before Contributing

Start with:

1. `docs/PROJECT_STATE.md`
2. `docs/MILESTONES.md`
3. the directly relevant files

Read more only when the change requires it:

| Change area | Read |
| --- | --- |
| Product meaning | `docs/INTERLEAF_READER_PRD.md` |
| Durable decision | relevant entries in `docs/DECISION_LOG.md` |
| Runtime structure | `docs/ARCHITECTURE.md` |
| Persisted data or migration | `docs/DATA_MODEL.md` |
| Setup, tests, smoke, troubleshooting | `docs/HANDOFF.md` |
| Privacy or external data flow | `PRIVACY.md` |
| AI-assisted repository work | `AGENTS.md` |
| License or commercial use | `LICENSE` and `docs/LICENSE_DECISION.md` |

The former AI workflow protocol is superseded.

Archived reports, roadmaps, and milestone execution records are historical evidence, not current authority.

If documents conflict, report the conflict instead of silently choosing one.

---

## 3. Current Milestone

Check the Active milestone in:

```text
docs/PROJECT_STATE.md
```

Scope and exit criteria are defined in:

```text
docs/MILESTONES.md
```

A contribution should normally belong to the Active milestone.

New ideas default to Later / uncommitted.

While R0 is Active, focus on:

* documentation truth;
* file classification;
* Git reproducibility;
* verification;
* baseline cleanup.

Do not independently begin:

* new product features;
* localization expansion;
* translation-provider integration;
* real imported-book Chinese or Mixed Mode;
* a service worker;
* Book Project migration;
* broad refactoring;
* UI redesign.

---

## 4. Before Editing

Define:

1. one focused goal;
2. task type;
3. acceptance criteria;
4. files expected to change;
5. files that must not change;
6. out-of-scope behavior;
7. required tests and manual checks;
8. privacy, copyright, compatibility, and migration impact.

Prefer the smallest safe change.

Avoid unrelated cleanup and formatting churn.

Major product, architecture, storage, privacy, or licensing changes require prior approval.

---

## 5. Branches and Commits

Use lowercase branch names with a short prefix:

* `docs/`
* `fix/`
* `feature/`
* `test/`
* `chore/`

Examples:

```text
docs/update-handoff
fix/chapter-navigation
feature/approved-reader-control
test/storage-restore
chore/baseline-cleanup
```

Use `feature/` only for approved feature scope.

Commits should:

* represent one focused purpose;
* use a clear message;
* avoid unrelated changes;
* exclude generated clutter, private data, and copyrighted material;
* include only reviewed files.

Do not:

* use `git add .` when unrelated changes exist;
* force-push a shared protected branch;
* rewrite shared history without approval;
* hard-reset or delete another contributor’s work;
* commit secrets or private machine data.

---

## 6. Pull Requests

A pull request should include:

### Goal

What problem does the change solve?

### Scope

What is included and excluded?

### Files changed

List code, tests, data, and documentation.

### Behavior changed

Describe user-visible or system-visible effects.

### Verification

List exact commands and manual checks.

Use:

* **Passed**
* **Failed**
* **Not run**
* **Blocked**
* **Partially verified**

Do not write “all tests pass” unless those tests were run.

### Privacy and security impact

State whether the change introduces:

* external requests;
* credentials;
* analytics;
* uploads;
* accounts;
* cloud sync;
* provider calls;
* new stored user data.

### Copyright and source impact

State the source and permission basis of added text, vocabulary data, images, fixtures, icons, or examples.

### Compatibility impact

State whether the change affects:

* IndexedDB;
* localStorage;
* backup schemas;
* persisted fields;
* Reading Mode identifiers;
* existing saved data.

### Remaining risk

Report limitations and unverified behavior.

Use `.github/pull_request_template.md` when available.

Screenshots must not expose private books, filenames, vocabulary exports, account data, or reading history.

---

## 7. Verification Expectations

Use `docs/HANDOFF.md` for commands and smoke procedures.

| Change | Expected verification |
| --- | --- |
| JavaScript | Relevant syntax checks |
| Pure logic | Relevant Node tests |
| Reader UI or navigation | Browser smoke for the affected path |
| Storage or backup | Pure tests plus browser save, refresh, restore, malformed-input, and failure checks |
| Localization | Each affected language and surface |
| Mobile UI | Appropriate mobile-sized viewport |
| Vocabulary data | Dataset checker |
| PWA or deployment | Official path, assets, manifest, update behavior, and offline boundary |
| Documentation only | No full app tests unless executable claims or commands changed |

Pure-module tests do not replace browser verification for DOM events, IndexedDB, downloads, layout, module startup, or CDN behavior.

Report skipped checks as unverified.

---

## 8. Product and Compatibility Guardrails

Do not add general dictionary search or automatic manual-term enrichment without an approved product decision.

Do not add flashcards, drills, quizzes, spaced repetition, streaks, or mandatory review as incidental vocabulary work.

Imported-book Chinese Reading Mode and Mixed Mode must not display fake translated content.

Guide-authored multilingual content is a Guide exception.

Changes must protect:

* startup;
* EPUB import;
* first chapter;
* English Study Mode;
* chapter navigation;
* local persistence;
* saved-book restore.

Do not change without an approved migration:

* IndexedDB database or store names;
* localStorage keys;
* backup schema names or versions;
* persisted fields;
* Reading Mode values;
* `cloze-mixed`;
* `clozeHtml`;
* debug globals;
* Slash-era compatibility identifiers.

A migration proposal must include existing-data impact, fallback, rollback, tests, and browser verification.

---

## 9. Privacy, Security, and Copyright

Never commit:

* API keys, tokens, passwords, credentials, or secrets;
* private EPUBs;
* reading history;
* private filenames;
* user vocabulary exports;
* browser database dumps;
* copyrighted EPUBs, fanfiction exports, paid books, song lyrics, copied dictionary entries, or bulk-extracted source text.

Do not add analytics, uploads, accounts, cloud sync, provider calls, or remote user-data storage without approval.

Any new external data flow requires review of:

* `PRIVACY.md`;
* `docs/DECISION_LOG.md`;
* `docs/ARCHITECTURE.md`;
* credential and threat boundaries.

Test and demonstration content should be self-authored, public domain, clearly licensed, or generated as a safe fixture.

`source_materials/` is reference material, not an automatically publishable dataset.

---

## 10. Documentation Ownership

Update only the responsible document.

| Change | Document |
| --- | --- |
| Product meaning or boundary | `docs/INTERLEAF_READER_PRD.md` |
| Current implementation or verification | `docs/PROJECT_STATE.md` |
| Milestone scope or order | `docs/MILESTONES.md` |
| Durable decision | `docs/DECISION_LOG.md` |
| Runtime architecture | `docs/ARCHITECTURE.md` |
| Persisted data | `docs/DATA_MODEL.md` |
| Setup, tests, smoke, troubleshooting | `docs/HANDOFF.md` |
| Public project entry | `README.md` |
| Privacy | `PRIVACY.md` |

Do not put execution logs into the PRD or Project State.

Do not create a new planning document when a canonical document owns the information.

---

## 11. AI-Assisted Contributions

AI-assisted work is allowed, but the human contributor remains responsible.

Before submission:

* review the complete diff;
* verify referenced files and APIs;
* remove fabricated status or behavior;
* run required checks;
* inspect generated data;
* confirm no private or copyrighted content entered the repository;
* confirm scope stayed focused;
* label unverified behavior honestly.

Repository-specific AI rules are in `AGENTS.md`.

Archived AI workflow material is not current instruction.

---

## 12. License and Commercial Use

The controlling license is:

```text
LICENSE
```

Interleaf Reader uses a custom non-commercial, source-available license.

It is not MIT-licensed or OSI-approved open source.

By contributing, you confirm that:

* you have the right to provide the material;
* it does not violate another license or copyright;
* it may be distributed under the project license unless otherwise agreed in writing.

Contributing, forking, opening an issue, or submitting a pull request does not grant commercial-use permission.

Commercial use requires separate written permission.

See `docs/LICENSE_DECISION.md` for explanatory context.

---

## 13. Contact and Conduct

A formal Code of Conduct and public private-reporting contact have not yet been published.

Until then:

* communicate respectfully;
* keep discussions project-focused;
* do not publish sensitive security details;
* do not share private user data;
* use the public issue tracker only for non-sensitive reports.

Do not invent or publish a private contact address.

---

*Keep contributions focused, reproducible, source-safe, compatible with existing local data, and aligned with the current Active milestone.*
