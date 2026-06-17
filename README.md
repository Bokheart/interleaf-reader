# Interleaf Reader

Former codename: **Slash Reader v2**.

Interleaf Reader is a local-first English fiction and long-form EPUB reading PWA for non-native English readers. Users import their own EPUB files and read in a controlled browser reader where vocabulary help, and future translation features, support immersive reading without turning the product into a memorization app or generic translator.

## Core Idea

Interleaf Reader is a reading app first. Its modes are designed around staying inside the story:

- **English Study Mode**: original English text plus lightweight vocabulary help.
- **Chinese Reading Mode**: future plot-comprehension mode for reading a Chinese translation.
- **Mixed Mode**: future contextual-memory mode with mostly Chinese text and selected English kept in context.

Example:

```text
English: Dean opened the door.
Chinese target: Dean打开了门。
Mixed target: Dean opened 门。
```

## Current Status

| Area | Status | Notes |
|---|---|---|
| English Study Mode | **Implemented** | Original chapter rendering with Vocabulary Preview, underlines, and bubbles. |
| EPUB import | **Implemented** | File picker, drag-and-drop, diagnostics, metadata/spine loading through epub.js and JSZip. |
| Reader navigation | **Implemented** | Chapter list, Previous/Next, progress text, vertical scroll, mobile tap overlay. |
| Home / Reader / Vocabulary Library views | **Implemented** | Three app views with view-isolation guards. |
| Local Library | **Implemented** | Browser-local saved EPUBs and reading progress through IndexedDB. |
| Vocabulary Library v1 | **Implemented** | Learning / Mastered / Hidden tabs, manual add, remove, Copy Learning, Copy All, CSV export. |
| Vocabulary personalization | **Partial** | Local profile and level-baseline filtering exist; comfort-level onboarding and full scoring are not built. |
| Book Glossary | **Partial** | Rule-based skeleton and mock classifier exist; not wired into translation. |
| Chinese Reading Mode | **Placeholder** | No real translation output yet. |
| Mixed Mode | **Placeholder** | Code may still call this Cloze Mixed Mode; no real mixed output yet. |
| Translation Provider system | **Planned** | Provider-agnostic architecture is planned; DeepL is not integrated. |
| PWA installability | **Partial** | Static PWA-oriented app has a minimal manifest and basic self-authored icons; service worker/offline support is still missing. |
| GitHub Pages deployment | **Planned** | Not necessarily configured yet. |

## Features

### Reader Features

- EPUB import through file picker and drag/drop.
- EPUB diagnostics for file metadata, load step, epub.js / JSZip status, spine count, and errors.
- Chapter navigation with fallback labels, custom chapter list, Previous/Next, and progress display.
- English Study Mode as the main working reading mode.
- Vertical scrolling reader with approximate scroll progress restore.
- Mobile reader overlay with Home, Preview, Mode, Chapters, Previous, and Next controls.
- Home, Reader, and Vocabulary Library views.
- Local Library for saved EPUBs in this browser.

### Vocabulary Features

- Chapter-level Vocabulary Preview from curated seed data.
- Underlined vocabulary terms in English text.
- Lightweight tap/click bubble with short vocabulary details.
- Preview actions:
  - **Known**: mark already known; hide from future Preview.
  - **Save**: keep in Learning list.
  - **Hide**: stop prompting this term.
- Saved-state badge for Learning words.
- Manual vocabulary add to Learning.
- Vocabulary Library tabs:
  - Learning
  - Mastered
  - Hidden
- Term-only local export:
  - Copy Learning
  - Copy All
  - Download CSV

### Local-first Storage

- Saved EPUB blobs, metadata, and reading progress are stored in browser IndexedDB.
- Reading progress includes chapter state and approximate scroll position.
- Vocabulary profile is stored locally with `knownWords`, `learningWords`, `ignoredWords`, selected level, and preferences.
- No account system or cloud sync exists in the MVP.

### Planned Translation Features

- Provider-agnostic Translation Provider architecture.
- Secure key/provider boundary before any real provider integration.
- Chinese Reading Mode with real translated chapter output.
- Mixed Mode with Chinese context and selected English preserved.
- Protected terms / glossary support for names, objects, fandom terms, and user overrides.
- Local translation cache for generated chapter output.

DeepL is not integrated. API keys must not be placed in frontend code.

## What This Project Is Not

Interleaf Reader is:

- not a flashcard or vocabulary-drill app
- not a general translator
- not a public translation library
- not an AO3 scraper
- not a cloud-sync reading platform
- not a place to host copyrighted books or public translated works

Vocabulary and future translation features exist to support reading, not replace the reading experience.

## Local-first Privacy Note

Users import their own EPUB files. In the current MVP, saved books, reading progress, and vocabulary lists live in this browser's IndexedDB on this device.

There is no account system, cloud sync, or cross-device library in the MVP. Future translation providers may send chapter text to the provider selected by the user or deployer; that architecture is planned but not implemented yet. Do not commit API keys or secrets to frontend code.

The current app loads epub.js and JSZip from a CDN, which should be documented before broad public release.

Privacy: see [`PRIVACY.md`](PRIVACY.md).

Contributing: see [`CONTRIBUTING.md`](CONTRIBUTING.md).

License: Interleaf Reader Non-Commercial Community License. The project is source-available for personal, educational, research, hobby, and other non-commercial use. Commercial use requires separate written permission.

GitHub issue and pull request templates are available under `.github/` for future public collaboration.

## How To Run Locally

From PowerShell:

```powershell
cd "D:\BookHeart\slash reader\slash-reader-v2"
python -m http.server 5173
```

Open:

```text
http://localhost:5173/pwa-reader/
```

Serve from the project root, not from `pwa-reader/`, because the app fetches JSON from `data/`.

## GitHub Pages Deployment

Recommended Pages source: **Deploy from a branch**, branch `main`, folder `/ (root)`.

Expected app URL:

```text
https://<owner>.github.io/<repo-name>/pwa-reader/
```

The repository root `index.html` redirects to `./pwa-reader/` for visitors who open the project-site root.

The app should be served from the repository root so `pwa-reader/` can fetch JSON from `../data/`. GitHub Pages is static hosting only: user EPUBs remain local in browser IndexedDB, and there is no Interleaf Reader backend or cloud sync. The current app loads epub.js and JSZip from a CDN, so the browser may contact that CDN when loading the app.

`pwa-reader/manifest.webmanifest` provides minimal PWA metadata using relative `start_url` and `scope`, plus basic self-authored icons under `pwa-reader/assets/icons/`. Full installability still needs a service worker/offline strategy.

Service worker/offline caching is planned, not implemented. See [`docs/PWA_OFFLINE_CACHE_PLAN.md`](docs/PWA_OFFLINE_CACHE_PLAN.md).

Deployment checklist: see [`docs/GITHUB_PAGES_DEPLOYMENT.md`](docs/GITHUB_PAGES_DEPLOYMENT.md).

## How To Test

Use the bundled Node runtime if plain `node` is not available:

```powershell
cd "D:\BookHeart\slash reader\slash-reader-v2"
$node = "C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { & $node --check $_.FullName }
```

Run the pure-logic tests:

```powershell
& $node tests\levelBaselineEngine.test.mjs
& $node tests\navigationEngine.test.mjs
& $node tests\vocabEngine.test.mjs
& $node tests\glossaryEngine.test.mjs
& $node tests\storage.test.mjs
& $node tests\homeState.test.mjs
```

Check the vocabulary dataset:

```powershell
python scripts\check_vocabulary_dataset.py
```

If plain `python` resolves incorrectly, use the bundled Python runtime:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe scripts\check_vocabulary_dataset.py
```

Generate the copyright-safe browser smoke EPUB:

```powershell
python scripts\generate_smoke_epub.py
```

This writes `tests\fixtures\interleaf_smoke.epub`, a self-authored three-chapter fixture for import, navigation, Vocabulary Preview, bubble, and Local Library smoke tests.

## Documentation Map

- `docs/INTERLEAF_READER_PRD.md` - canonical English product requirements.
- `docs/INTERLEAF_READER_PRD_CN.md` - Chinese mirror of the PRD.
- `docs/PROJECT_STATE.md` - current milestone, implemented state, risks, and next task.
- `docs/DECISION_LOG.md` - dated product and engineering decisions.
- `docs/AI_WORKFLOW_PROTOCOL.md` - workflow rules for Codex, Cursor, and contributors.
- `docs/HANDOFF.md` - current engineering handoff and run/test details.

## Roadmap

- **M0 Governance docs**: PRD, state, decision log, workflow protocol, README refresh.
- **M1 Reader MVP stabilization**: stable import/read/resume loop, regression pass, remaining legacy-copy audit.
- **M2 Vocabulary Library v1**: vocabulary profile, library, manual add/remove, export, semantic polish.
- **M3 PWA / open-source release readiness**: GitHub Pages deployment verification, service worker, vendored scripts, license/privacy/contributing docs.
- **M4 Translation architecture**: provider abstraction, secure key strategy, translation queue/cache design.
- **M5 Chinese/Mixed mode**: real translated and mixed chapter output.
- **M6 Enrichment/export/sync**: dictionary enrichment, richer export, profile import/export, optional sync or integrations.

## Open-source Status

Public release preparation is in progress.

- License: **Interleaf Reader Non-Commercial Community License**. The project is source-available for personal, educational, research, hobby, and other non-commercial use. Commercial use requires separate written permission.
- `CONTRIBUTING.md`: **Drafted**.
- `PRIVACY.md`: **Drafted** for the local-first MVP.
- Issue and pull request templates: **Drafted**.
- GitHub Pages deployment prep: **Documented**; remote enablement and smoke test still pending.
- Source-material policy: still needs final review before broad public release.

Before public launch, the project should clearly document local storage, CDN dependencies, future translation-provider data flow, copyright expectations, and contribution rules.
