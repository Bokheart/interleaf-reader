# Interleaf Reader Handoff

## Product requirements

Canonical product specs live in:

- `docs/INTERLEAF_READER_PRD.md` (English, canonical)
- `docs/INTERLEAF_READER_PRD_CN.md` (Chinese mirror)
- `docs/PRD_SOURCE_AUDIT.md` (implementation inventory input for the PRD)

Before major feature work, read the PRD + `PRD_SOURCE_AUDIT.md`, then use this handoff for current implementation detail.

## Governance docs

Agent and contributor workflow:

- `AGENTS.md` — concise root instructions for future AI agents; read this first before repository work
- `docs/PROJECT_STATE.md` — current phase, implemented vs planned, backlog
- `docs/DECISION_LOG.md` — dated product/engineering decisions
- `docs/AI_WORKFLOW_PROTOCOL.md` — reading order, task rules, safety constraints

Also read `PRIVACY.md` before adding analytics, upload flows, cloud sync, provider calls, or API key storage.

Contributors and AI agents should follow `CONTRIBUTING.md` plus `docs/AI_WORKFLOW_PROTOCOL.md`: one focused task, small diffs, no copyrighted sample content, no frontend secrets, and docs updated when behavior/status changes.

GitHub issue templates exist for bug reports, feature requests, and docs tasks, and `.github/pull_request_template.md` should be used for PR summaries, checks run, privacy/security notes, copyright/source-material checks, and follow-up risks.

Read root `AGENTS.md` first, then `PROJECT_STATE.md` and `AI_WORKFLOW_PROTOCOL.md` before starting an AI-assisted task.

GitHub Pages deployment prep is documented in `docs/GITHUB_PAGES_DEPLOYMENT.md`. Use branch/root Pages deployment first: Source `Deploy from a branch`, branch `main`, folder `/ (root)`, then open `https://<owner>.github.io/<repo-name>/pwa-reader/`. A root `index.html` redirects to `./pwa-reader/`. Keep the app served from repo root so `pwa-reader/` can fetch `../data/`. `pwa-reader/manifest.webmanifest` provides minimal PWA metadata with relative `start_url`/`scope` and basic self-authored icons from `pwa-reader/assets/icons/`; there is still no service worker/offline cache.

Read `docs/PWA_OFFLINE_CACHE_PLAN.md` before creating or registering any service worker. The first service worker must be app-shell-only, must not cache user EPUBs or private files, and must not add analytics, provider calls, cloud sync, or API key storage.

## Project Summary

Interleaf Reader, formerly Slash Reader v2, is a web/PWA EPUB learning reader for non-native English readers. The target user wants to read English novels or fanfiction while staying inside the story instead of constantly leaving the reader to look up vocabulary.

The core product goal is a controlled browser reading environment with learning overlays: EPUB import, chapter navigation, English Study Mode, vocabulary preview, inline vocabulary bubbles, and future translation modes.

The primary product path is the PWA reader. Enhanced EPUB export and AO3 import helper tooling are future optional features, not the main architecture.

## Current Implemented Features

- EPUB import through file picker and drag-and-drop.
- User-facing browser title and Home branding now use Interleaf Reader. Legacy internal compatibility names such as the `slash-reader-v2` path, IndexedDB/localStorage namespaces, `window.slashReaderScriptStatus`, and `window.__slashReaderDebug` remain unchanged unless a future migration explicitly targets them.
- EPUB import diagnostics panel showing file name, size, MIME type, extension, load step, epub.js/JSZip status, ArrayBuffer status, metadata, spine count, and last error.
- epub.js loading path with JSZip preflight and clearer failure causes.
- Chapter list generation from EPUB spine entries.
- Fallback chapter labels such as `Chapter 1`, `Preface`, and `Title Page`.
- Reader navigation with a custom clickable table of contents, synchronized hidden dropdown fallback, top and bottom Previous/Next controls, Back to Top, readable progress text, and first/last disabled states.
- Reader tap controls: tapping/clicking the reader text toggles compact floating controls on mobile and desktop. The controls include Preview, Home, Mode, Contents, current chapter/progress text, and Previous/Next navigation. Contents opens the existing chapter list in a sheet and can jump to any chapter. Interactive targets such as vocabulary terms, bubbles, sheets, links, buttons, and form controls are ignored by the tap toggle.
- Chapter sidebar click-to-jump bug is fixed. Root cause was `escapeHtml()` returning empty strings for rendered chapter attributes/labels, which blanked `data-chapter-id` and made `selectChapter("")` return early; temporary navigation instrumentation was removed after verification.
- Local book persistence through IndexedDB. The last imported EPUB file blob, file metadata, EPUB title/author, chapter count, and reading progress are stored in the browser so refresh can restore the book without re-uploading.
- Reading progress now includes optional chapter scroll data: `scrollTop`, clamped `scrollRatio`, and `updatedAt`. Restore uses the saved ratio after chapter render, so scroll-level resume is approximate and tolerant of layout/content height changes.
- Reading progress can also include `currentMode`. Mode switching saves the current chapter/scroll before rendering the new mode, preserves the selected chapter, restores the approximate scroll ratio, and avoids overwriting progress with a placeholder-mode top position.
- Restore UI offers `Restore`, `Dismiss`, and `Forget saved book`; after a book is saved/restored, `Forget saved book` clears the local EPUB and progress data for that saved book.
- Minimal Home/Reader/Vocabulary Library view split: Home shows import, one primary reading action, Vocabulary Library summary, and a Local Library list from IndexedDB; Reader contains the existing reading workspace plus Back to Home; Vocabulary Library is a standalone app view for local vocabulary lists. Import and restore switch to Reader; Back to Home keeps the loaded book in memory.
- View isolation regression guard: Home, Reader, and Vocabulary Library must be mutually exclusive. The app uses `getAppViewVisibility()` and `showView()` to keep inactive views hidden, and hidden app views must not intercept pointer events. A prior Vocabulary Library refactor risked breaking Reader navigation because new view bindings/view state were mixed into the old Home/Reader-only assumptions; future view additions must not let optional view controls abort Reader event binding or leave inactive views covering Reader controls.
- Dev-only browser diagnostics are available from the console with `window.__slashReaderDebug.getDiagnostics()`. This read-only helper reports active app view, Home/Reader/Vocabulary Library hidden state, Reader navigation control counts, `bindEvents()` completion, and Vocabulary Library control counts. It is not user-facing and must not trigger imports, renders, storage writes, or profile loading; it exists to debug view-state and Reader navigation binding regressions.
- Home primary reading action priority: `Resume current session` appears when a book is already loaded in memory and returns to Reader without re-import or IndexedDB restore. `Continue Reading` appears only when there is no in-memory book and a recent saved local book exists. Continue Reading is hidden when Resume is available to avoid duplicate large reading cards for the same book.
- Home Local Library lists browser-local saved EPUB metadata only (title, author, progress, last read). Open restores a selected saved book through the existing IndexedDB path; Forget removes that saved book and its progress from this browser only.
- Home Vocabulary Library summary is a small secondary card showing local vocabulary profile counts: Learning (`learningWords`), Mastered (`knownWords`), Hidden (`ignoredWords`), plus selected level. Its `View words` button switches to the independent Vocabulary Library view with Learning / Mastered / Hidden tabs and terms only. Local Library means saved EPUB books; Vocabulary Library means saved vocabulary profile state. The Vocabulary Library view is not a modal and includes a quiet note that word lists are saved locally in this browser on this device. It supports a compact manual Add to Learning form, small row-level Remove actions, and basic local export through Copy Learning, Copy All, and Download CSV. There is still no sync, review mode, external app integration, or definitions/examples.
- Local Library Forget uses an in-app confirmation modal with Cancel / Forget book actions. Browser-native `confirm()` is no longer used for this path.
- Mobile-first reader UX pass: narrow screens hide the permanent sidebar, give the reading pane full width, and use compact mobile controls for Chapters, Vocabulary Preview, and Reading Mode.
- Mobile Chapters and Vocabulary Preview open as bottom sheets. The desktop sidebar remains available on wider screens.
- Reader UX polish for AO3/web-novel-style vertical reading, active chapter highlighting, calmer empty states, and collapsed safer Book Glossary display.
- Phase 1 reading behavior is vertical scrolling, not pagination. Page-flip pagination remains a future feature.
- Chinese Reading Mode and Mixed Mode are still placeholders. Switching into either placeholder must preserve book, chapter, navigation state, and approximate reading position; it must not behave like a chapter change. Internal mode values may still use `cloze-mixed` for compatibility.
- English Study Mode renders the selected chapter.
- Plain text extraction from chapter HTML.
- Vocabulary Preview from a curated MVP seed dataset: 77 IELTS/fiction/general vocabulary entries and 35 slang/idiom/phrasal verb entries.
- Seed vocabulary entries include compact Chinese meanings, short English definitions, IELTS usage phrases where useful, priority scores, and `user_curated_seed` source tags.
- Vocabulary seed quality can be checked with `python scripts\check_vocabulary_dataset.py`; it writes `generated/reports/vocabulary_quality_report.md`.
- Vocabulary Preview rendering bug is fixed. Root cause was `vocabEngine.escapeHtml()` using a template pattern that blanked rendered fields, leaving dash-only cards.
- Vocabulary Preview now applies stored profile filtering after chapter render. The app lazy-loads personalization-only helpers, reads the local vocabulary profile, resolves effective known words from the selected level baseline, hides known/ignored words, keeps learning words, and falls back to the original unfiltered Preview if helper loading, profile loading, baseline loading, or filtering fails. Personalization must never block app startup, EPUB import, or chapter rendering.
- Vocabulary Preview cards have minimal `Known`, `Save`, and `Hide` actions. These update the local IndexedDB vocabulary profile: Known and Hide hide the term after refresh, while Save uses the existing `addLearningWord()` storage helper and keeps the term visible as a learning word. Saved learning words show a small `Saved` state in Preview. Storage function names and profile schema are unchanged. The Vocabulary Library view now offers minimal local list management and term-only local export, but still has no definitions/examples, review mode, external app integration, or external sync.
- Underlined vocabulary terms in chapter text.
- Click/tap vocabulary bubble with lightweight fields only: term, Chinese meaning, English definition when available, and IELTS usage when available. Tapping the same underlined term again closes the bubble; tapping a different term switches it.
- Vocabulary Preview remains the place for richer study details such as source sentence, context note, type badge, usage note, examples, and priority/source metadata.
- This seed is not a full dictionary. Source PDFs are not copied into the dataset; dictionary providers can later enrich missing fields, but any ECDICT or English-English provider data should be compiled into a small app-ready subset instead of loaded directly in the PWA.
- Book Glossary skeleton with rule-based candidate extraction and mock classifier.
- In-memory Book Glossary panel for current loaded chapter text.
- IndexedDB vocabulary profile storage helpers for one local profile. They support a default `level3` profile, normalized save/readback, comfort-level updates, and known/learning/ignored word helpers used by the minimal Preview actions.
- Lightweight tests for vocabulary matching, glossary candidate extraction, navigation helpers, storage helpers, and Home entry state/copy helpers.
- Repeatable copyright-safe EPUB smoke fixture workflow: `scripts/generate_smoke_epub.py` writes `tests/fixtures/interleaf_smoke.epub` for M1 browser import/navigation/Preview checks.
- PWA icon generation uses `scripts/generate_pwa_icons.py` to create the self-authored SVG/PNG icons in `pwa-reader/assets/icons/`.

## Current Placeholders / Not Implemented

- Chinese Reading Mode is placeholder only.
- Mixed Mode is placeholder only. Internal code/data compatibility names may still use `cloze-mixed` and `clozeHtml`.
- No real DeepL integration.
- No real GPT glossary classifier.
- No enhanced EPUB export.
- No AO3 browser extension.
- No cloud library or cross-device sync.
- IndexedDB persistence stores saved EPUBs and reading progress locally in this browser on this device.
- Local Library list UI is browser-local only. IndexedDB stores EPUB blobs and reading progress in this browser; there is no cloud sync, account system, or cross-device library.
- Forget/Delete in Home Local Library or Reader removes that saved EPUB and progress from IndexedDB. An in-memory loaded book may remain open until refresh.
- No user glossary override editing UI.
- No backend server or login.
- Vocabulary personalization planning, level baseline helpers, IndexedDB profile storage helpers, live Preview filtering, minimal Preview actions, saved-state badges, the Home count summary, and an independent Vocabulary Library view exist. Vocabulary Library supports local manual Add to Learning, row-level Remove actions, and term-only copy/CSV export. There is still no external dictionary sync, batch import, review mode, rich metadata export, definitions/examples, or comfort-level onboarding UI.

## Planning Documents

- `docs/VOCABULARY_PERSONALIZATION_PLAN.md` — comfort levels, user vocabulary profile, scoring, Preview/bubble rules, enrichment stages, and Phase 2 roadmap for personalized vocabulary learning.
- `docs/VOCABULARY_INTERACTION_SEMANTICS.md` — product semantics for Vocabulary Preview vs Vocabulary Library / 生词本, vocabulary filtering, candidate/learning/mastered/known/ignored lifecycle, Known / Save / Hide / Mastered behavior, and future source grouping. Do not expand vocabulary UI until the Known / Save / Hide / Mastered semantics are followed.
- `data/levels/level1_basic_words.json` … `level5_basic_words.json` — placeholder comfort-level known-word baseline skeletons aligned with the personalization plan. Small hand-curated seed lists only; not complete frequency lists; not wired into runtime yet.
- `pwa-reader/levelBaselineEngine.js` — pure helper module for normalizing vocabulary profile word lists, resolving effective known words from level baselines plus user known/ignored/learning words, loading/validating `data/levels/*.json` via `loadLevelBaseline(levelId, { fetchImpl })`, and combining both through `loadEffectiveKnownWordsForProfile(userProfile, options)`. It is integrated with Preview through a best-effort, lazy-loaded app path.
- `pwa-reader/storage.js` also owns the local vocabulary profile IndexedDB store. The profile helpers are used by the minimal Preview actions and are intentionally not connected to candidate extraction yet. `vocabEngine.js` has pure Preview filtering helpers used by the live Preview path.

## Architecture Overview

### `pwa-reader/app.js`

Main browser controller. Owns UI state, event wiring, Home/Reader view switching, import flow, selected chapter, reading mode, guarded mode switching, Vocabulary Preview rendering, Book Glossary rendering, bubble display, diagnostics panel updates, chapter navigation controls, mobile tap controls, and scroll-progress save/restore.

### `pwa-reader/epubLoader.js`

EPUB boundary module. Accepts a browser `File`, validates readable EPUB/ZIP structure, creates the epub.js book object, loads metadata/navigation/spine, normalizes chapter records, and loads chapter HTML on demand.

### `pwa-reader/vocabEngine.js`

Vocabulary matching module. Loads vocabulary/slang/idiom JSON, normalizes terms, finds non-duplicate chapter matches, extracts source sentences, builds Vocabulary Preview items, exposes pure personalization filtering/explanation helpers, and annotates chapter HTML with clickable underlined terms. `app.js` now calls the filtering helper for live Preview rendering after resolving the stored vocabulary profile.

### `pwa-reader/levelBaselineEngine.js`

Pure vocabulary personalization helper. Normalizes word lists and user profile shapes, resolves effective known words from level baseline + known + ignored lists while excluding learning words, exposes summary counts, loads level baseline JSON with schema validation through injectable `fetchImpl`, and provides `loadEffectiveKnownWordsForProfile(userProfile, options)` to load the selected baseline and return effective known words plus counts. Not integrated with Preview yet.

### `pwa-reader/glossaryEngine.js`

Book Glossary Builder skeleton. Extracts rule-based candidates from loaded chapter text, merges Global Glossary protected terms, and classifies candidates with a mock local classifier. No API calls.

### `pwa-reader/navigationEngine.js`

Pure navigation helper module. Generates fallback chapter labels, normalizes chapter lists, computes current/adjacent chapter indexes, and formats progress text.

### `pwa-reader/readingModes.js`

Mode rendering boundary. English Study Mode renders original HTML plus vocabulary annotations. Chinese and Mixed modes intentionally return placeholders. Internal mode id `cloze-mixed` remains unchanged.

### `pwa-reader/translationEngine.js`

Future translation boundary. Loads protected terms and exposes placeholder translation request/output helpers. No provider integration yet.

### `pwa-reader/storage.js`

Small namespaced `localStorage` wrapper plus IndexedDB helpers for saved EPUB blobs, reading progress, optional mode/scroll progress fields, scroll ratio helpers, lightweight saved-book library metadata via `listSavedBooks()`, and one local vocabulary user profile via `getVocabularyProfile()` / `saveVocabularyProfile()`.

### `data/vocabulary.json`

Seed IELTS/general vocabulary items used by English Study Mode.

### `data/protected_terms.json`

Global Glossary seed. Contains general protected terms and preservation flags. Future translation prep should combine this with Book Glossary and User Overrides.

### `data/slang_idioms.json`

Seed slang, idiom, and fandom-like phrase vocabulary for preview and matching.

## Data Flow

```text
EPUB file
  -> import diagnostics
  -> epubLoader
  -> normalized chapter list
  -> selected chapter render
  -> chapter HTML
  -> plain text extraction
  -> vocabulary matching
  -> Vocabulary Preview
  -> underlined chapter terms
  -> click/tap bubble
  -> Book Glossary candidate generation from loaded plain text
  -> scroll progress save as chapter id/index plus approximate scroll ratio
```

Book Glossary output is not used for translation yet. It is intended to feed future protected-term handling for DeepL/local translation, Chinese Reading Mode, and Mixed Mode.

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

## Smoke EPUB Fixture

Generate the repeatable browser smoke-test EPUB:

```powershell
cd "D:\BookHeart\slash reader\slash-reader-v2"
python scripts\generate_smoke_epub.py
```

If plain `python` resolves incorrectly, use the bundled runtime:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe scripts\generate_smoke_epub.py
```

The script writes:

```text
tests\fixtures\interleaf_smoke.epub
```

The fixture book is `Interleaf Smoke Test Book` by `Interleaf Test Fixture`. It contains self-authored test text only and intentionally includes vocabulary seed terms such as `anxious`, `reluctant`, `glance`, `mutter`, `tension`, `figure out`, `bring up`, and `back off`.

Use it for M1 browser smoke checks:

1. Start the local static server from the project root.
2. Open `http://127.0.0.1:5173/pwa-reader/` or `http://localhost:5173/pwa-reader/`.
3. Import `tests\fixtures\interleaf_smoke.epub`.
4. Confirm Reader opens, three chapters appear, Vocabulary Preview has matches, bubbles work, Local Library save/restore works, and Chinese/Mixed modes remain placeholders.

## Browser Diagnostics Smoke Test

Open DevTools Console and run:

```js
window.__slashReaderDebug.getDiagnostics()
```

On Home:

- `activeView` should be `home`.
- `views.home.exists` should be true and `views.home.hidden` should be false.
- `views.reader.hidden` and `views.vocabularyLibrary.hidden` should be true.
- `readerNavigation.bindEventsCompleted` should be true.

On Reader:

- `activeView` should be `reader`.
- `views.reader.exists` should be true and `views.reader.hidden` should be false.
- `views.home.hidden` and `views.vocabularyLibrary.hidden` should be true.
- `readerNavigation.previousButtonsFound` and `readerNavigation.nextButtonsFound` should be greater than zero.
- `readerNavigation.chapterListFound` should be true when the chapter list markup is present.

On Vocabulary Library:

- `activeView` should be `vocabulary-library`.
- `views.vocabularyLibrary.exists` should be true and `views.vocabularyLibrary.hidden` should be false.
- `views.home.hidden` and `views.reader.hidden` should be true.

Regression workflow:

1. Hard refresh the app.
2. Run diagnostics on Home.
3. Import or restore `Well_Jung.epub`.
4. Open Reader.
5. Run diagnostics.
6. Click Next chapter.
7. Go Home.
8. Open Vocabulary Library.
9. Run diagnostics.
10. Back to Home.
11. Resume Reader.
12. Confirm Next chapter still works.

Troubleshooting notes:

- If buttons do not respond but diagnostics shows the wrong `activeView`, inspect `showView()`.
- If an inactive view is visible or not hidden, inspect app view hidden state and CSS.
- If `bindEventsCompleted` is false, inspect `bindEvents()` for null element binding errors.
- If Previous/Next count is zero, inspect Reader control selectors and markup.
- Optional modules must remain lazy-loaded or isolated behind fallback so startup, EPUB import, and chapter render do not depend on them.

## How To Run Tests

Use the bundled Node runtime:

```powershell
cd "D:\BookHeart\slash reader\slash-reader-v2"
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\vocabEngine.test.mjs
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\glossaryEngine.test.mjs
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs
```

For vocabulary dataset quality:

```powershell
cd "D:\BookHeart\slash reader\slash-reader-v2"
python scripts\check_vocabulary_dataset.py
```

For JS syntax checks:

```powershell
cd "D:\BookHeart\slash reader\slash-reader-v2"
Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }
```

## Known Issues

- The reader currently depends on CDN scripts for JSZip and epub.js.
- Browser visual automation may not run in the Windows sandbox, so manual browser checks are still important.
- No translation provider exists yet.
- No API keys should exist in this frontend.
- `PRIVACY.md` documents the current local-first MVP. Future analytics, upload flows, cloud sync, translation provider calls, or API key storage require a `PRIVACY.md` update and a `docs/DECISION_LOG.md` entry before implementation.
- IndexedDB stores EPUB files locally in the user's browser only. There is no backend, login, cloud sync, cross-device sync, or multi-book shelf UI.
- Users can clear saved EPUB/progress data with `Forget saved book` in the restore/saved-book panel.
- EPUB compatibility is limited by epub.js and the current simple spine/chapter loading path.
- Navigation is chapter-based with approximate scroll-ratio restore. There is no page-flip pagination or EPUB CFI position tracking yet.
- Mobile overlay controls are functional and lightly polished, but full novel-reader visual design remains future work.
- The visible chapter selector is a custom list because native select rendering was unreliable in the browser environment.
- Book Glossary is generated from loaded chapter text only, not the entire EPUB upfront.
- `git status` may be unavailable in the sandbox due to local permission restrictions.

## Development Rules For Future Agents

- Do not implement DeepL directly in the browser.
- Do not expose API keys in frontend code.
- Do not add analytics, upload flows, cloud sync, translation provider calls, or API key storage without updating `PRIVACY.md` and `docs/DECISION_LOG.md`.
- Do not casually rename compatibility surfaces such as IndexedDB database names, object stores, localStorage prefixes, debug namespaces, script-status globals, CSS hooks, or repo paths during user-facing copy cleanup.
- Do not delete or regress working Phase 1 features: import diagnostics, English Study Mode, Vocabulary Preview, underlines, bubbles, Book Glossary skeleton, and navigation.
- Optional modules such as vocabulary personalization, translation providers, and enrichment helpers must be lazy-loaded or isolated behind safe fallback. EPUB import and chapter render are primary paths and must not depend on optional module success.
- Keep changes small and testable.
- Add tests for pure logic modules.
- Preserve the PWA as the primary product path.
- Treat enhanced EPUB export as a future feature.
- Treat the AO3 extension as a future import helper, not the main product.
- Keep Chinese Reading Mode and Mixed Mode placeholder-only until translation architecture is ready. Do not rename internal `cloze-mixed` / `clozeHtml` compatibility fields during copy-only cleanup.
- Prefer module boundaries already present instead of putting all logic into `app.js`.

## Next Recommended Phases

1. Reader Navigation polish
2. Handoff docs
3. Persistent reading progress
4. Translation architecture skeleton
5. Translation demo panel
6. Secure local translation provider
7. Real DeepL one-paragraph test
8. Real DeepL one-chapter test
9. Chinese Reading Mode
10. Mixed Mode
11. Enhanced EPUB export
12. AO3 import helper extension

## Future Agent Notes

The most important constraint is security: translation provider keys must not be placed in frontend JavaScript. Add a secure local provider or backend boundary before any real DeepL call.

The second most important constraint is product direction: Interleaf Reader is a controlled PWA reader first. Do not pivot back to generated EPUB as the primary product path.
