# Interleaf Reader

**Interleaf Reader helps non-native English readers become comfortable with long-form English through stories they genuinely want to read.**

**Interleaf Reader 帮助你用真正喜欢的故事，逐渐习惯阅读长篇英文。**

Interleaf Reader is a mobile-first, local-first, reading-first browser application for English novels, web fiction, fanfiction, and other long-form EPUB content.

It is designed for readers who:

* already have some English foundation;
* want to improve over time;
* lack sustained English-language exposure;
* feel resistance or anxiety when facing long English texts;
* are more willing to read when the story itself is personally meaningful.

Vocabulary support exists to protect reading continuity, not replace reading with exercises.

---

## Current Capabilities

The current tracked runtime includes:

* local EPUB import;
* vertical long-form reading;
* chapter navigation and progress controls;
* browser-local books and reading progress;
* Vocabulary Preview;
* lightweight in-text vocabulary bubbles;
* Known, Save, and Hide;
* external manual vocabulary capture;
* Vocabulary Library;
* copy, CSV, and TXT vocabulary export;
* vocabulary-profile JSON backup and restore;
* a built-in virtual Guide;
* Settings and Help;
* interface-language foundations;
* browser-local preferences.

The reproducible runtime baseline was established in commit:

```text
91d6914 — feat: establish reproducible M2 runtime baseline
```

Current implementation and verification truth is maintained in:

[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)

Do not infer completion solely from the presence of source code.

---

## Reading and Vocabulary Boundaries

Interleaf Reader supports two distinct vocabulary workflows.

### Reading-context assistance

The user taps an interactive term in the current text and receives concise information sufficient to continue reading.

This may include:

* a short Chinese meaning;
* a brief English definition;
* limited usage information.

This is not general dictionary search.

### External manual capture

The user may record a word or short phrase encountered in television, films, games, websites, advertisements, classes, conversations, or daily life.

Manual Add is capture, not lookup.

A manually entered term is not automatically promised:

* a definition;
* translation;
* example sentence;
* pronunciation;
* morphology;
* synonyms;
* automatic enrichment.

### Vocabulary Library

Vocabulary Library is a:

* collection layer;
* organization layer;
* local backup layer;
* export layer.

It is not a flashcard, quiz, drill, spaced-repetition, or complete vocabulary-learning application.

---

## Reading Modes

For user-imported EPUBs:

* **English Study Mode** is the supported core path.
* **Chinese Reading Mode** is a placeholder.
* **Mixed Mode** is a placeholder.
* No real translation provider is integrated.

The built-in Guide may contain human-authored English, Chinese, or Mixed content.

This Guide-specific exception does not mean imported EPUBs can currently be translated or converted into real Chinese or Mixed versions.

Interface Language changes application labels and Help content. It does not translate imported book text or change Reading Mode.

---

## What Interleaf Reader Is Not

Interleaf Reader is not:

* an IELTS practice application;
* a general dictionary;
* a generic translation service;
* a flashcard or spaced-repetition application;
* a public book or translation library;
* a social reading platform;
* an AO3 scraper;
* a cloud bookshelf.

The application is not a place to publish copyrighted books, fanfiction exports, or public translated works.

---

## Quick Start

From the repository root:

```powershell
python -m http.server 8000
```

If needed:

```powershell
py -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/pwa-reader/
```

Start the server from the repository root, not from `pwa-reader/`, because the application loads shared files from directories such as `data/`.

Opening the HTML file directly through `file://` is not supported.

For setup, tests, smoke checks, and troubleshooting, see:

[`docs/HANDOFF.md`](docs/HANDOFF.md)

---

## Local-First Data and Privacy

Current browser-local data may include:

* imported EPUB files;
* saved-book metadata;
* reading progress;
* preferences;
* vocabulary profile.

The current product has:

* no required account;
* no cloud library;
* no cross-device synchronization;
* no automatic upload of imported books;
* no analytics.

Browser storage belongs to the exact origin and browser profile.

Changing hostname, port, browser profile, or private-browsing context may make existing data appear unavailable.

Clearing browser data may permanently remove books, progress, preferences, and vocabulary.

The application currently depends on CDN-hosted JSZip and epub.js, so local-first does not mean fully offline.

See:

[`PRIVACY.md`](PRIVACY.md)

---

## Deployment

Interleaf Reader can be served as a static browser application.

Deployment guidance:

[`docs/GITHUB_PAGES_DEPLOYMENT.md`](docs/GITHUB_PAGES_DEPLOYMENT.md)

Current deployment and verification status:

[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)

An HTTP 200 response alone does not prove JavaScript startup, dependency loading, EPUB import, IndexedDB persistence, or Reader behavior.

Do not advertise installability, offline support, or service-worker behavior unless Project State records them as verified.

---

## Project Structure

```text
pwa-reader/   Browser application
data/         App-ready vocabulary and configuration data
tests/        Pure tests and copyright-safe fixtures
scripts/      Validation and fixture utilities
docs/         Product and engineering documentation
```

Current module boundaries:

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/INTERLEAF_READER_PRD.md`](docs/INTERLEAF_READER_PRD.md) | Canonical product truth |
| [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) | Current implementation and verification |
| [`docs/MILESTONES.md`](docs/MILESTONES.md) | Milestone scope and delivery order |
| [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md) | Durable decisions |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Current technical structure |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Persisted-data contracts |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Setup, tests, smoke, troubleshooting |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution workflow |
| [`AGENTS.md`](AGENTS.md) | AI-assisted repository rules |
| [`PRIVACY.md`](PRIVACY.md) | Privacy and local-data posture |
| [`docs/LICENSE_DECISION.md`](docs/LICENSE_DECISION.md) | License rationale and commercial-permission process |

Historical audits, reports, roadmaps, AI protocols, and milestone execution records are stored under `docs/archive/` and are not ordinary required reading.

---

## Project Status

Interleaf Reader is under active development.

The active phase is:

```text
R0 — Project Truth and Structure Reset
```

The runtime baseline is reconciled and pushed.

Canonical documentation and remaining file classification are still being finalized.

Use Project State for the current snapshot and Milestones for delivery scope:

* [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md)
* [`docs/MILESTONES.md`](docs/MILESTONES.md)

---

## Contributing

See:

[`CONTRIBUTING.md`](CONTRIBUTING.md)

Contributions should:

* follow the Active milestone;
* remain focused;
* avoid secrets and frontend credentials;
* exclude private and copyrighted books;
* preserve compatibility-sensitive local data;
* avoid unapproved product expansion or storage migration.

Submitting an idea does not guarantee milestone inclusion.

---

## License

The controlling license is:

[`LICENSE`](LICENSE)

Interleaf Reader uses a custom non-commercial, source-available license.

It is not MIT-licensed or OSI-approved open source.

Commercial use requires separate written permission.

See [`docs/LICENSE_DECISION.md`](docs/LICENSE_DECISION.md) for explanatory context.

---

*Interleaf Reader is built around a simple principle: the best English reading practice is often the story you are genuinely willing to keep reading.*
