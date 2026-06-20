# M2 Execution State

This file is a mutable recovery and evidence record. It is not a product specification.

- Last updated: 2026-06-20
- Active branch: `feature/m2-reader-toc`
- Active phase: Localization Phase 0 - string inventory, locale parity, and English-leak tests (queued, `NOT_STARTED`)
- Active task: Begin Localization Phase 0; localization implementation has not started
- Overall status: IMPLEMENTED_UNVERIFIED
- Localization implementation status: NOT_STARTED
- Last completed task: Interrupted Guide content-model recovery, startup fix, truth-table tests, focused browser smoke, and docs sync
- Current blockers: No defined blocker. Completed Guide/startup work remains preserved. M2 is not marked CLOSED because the frozen localization contract is now active, all new localization acceptance IDs are `NOT_STARTED`, and earlier targeted evidence gaps remain.
- Manual checks still required: The complete browser/responsive/accessibility matrix in `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md`; Settings language-switch smoke; Help Center full-Guide action; contextual-help Help Center/Guide actions; downloaded 不背单词 TXT file review; downloaded vocabulary profile JSON review; UI restore of valid/malformed/unsupported profile JSON files.

## Task table

| Order | Task | Status | Acceptance IDs | Files expected | Evidence |
| ----- | ---- | ------ | -------------- | -------------- | -------- |
| 0.1 | M2 impact map | PASS | `HARNESS-001` | docs only | Prior M2 planning completed before this harness round. |
| 0.2 | Parent harness spec | PASS | `HARNESS-001` | `docs/M2_HARNESS_SPEC.md` | Parent spec exists and links child execution files. |
| 0.3 | Written guide alignment | IMPLEMENTED_UNVERIFIED | `DOCS-001` | `docs/USER_GUIDE.md`, `docs/USER_GUIDE_CN.md`, `docs/USER_GUIDE_BILINGUAL.md` | Guides were aligned in prior docs round; final behavior sync still required. |
| 0.4 | Vocabulary Level selector implementation | IMPLEMENTED_UNVERIFIED | `REGRESSION-009` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, tests | Prior implementation reported syntax/homeState/storage/levelBaseline tests; final M2 regression still pending. |
| 0.5 | Virtual Default User Guide Book implementation | PASS | `GUIDE-001`, `GUIDE-003`, `GUIDE-006` | `pwa-reader/guideBook.js`, `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, tests | Recovery removed the circular module dependency; automated Guide assertions and focused browser truth table pass. |
| 0.6 | Default User Guide Book browser smoke | PASS | `GUIDE-001`, `GUIDE-003`, `GUIDE-006`, `GUIDE-007`, `REGRESSION-001`, `REGRESSION-002`, `REGRESSION-010`, `REGRESSION-011` | no new files expected | 2026-06-20 smoke verified startup, built-in Guide, all six language/mode cases, chapter preservation, imported English EPUB rendering, and imported Chinese/Mixed placeholders. |
| 1.1 | i18n foundation | IMPLEMENTED_UNVERIFIED | `LANG-004`, `LANG-006`, `LANG-007` | `pwa-reader/i18n.js`, `pwa-reader/locales/en.js`, `pwa-reader/locales/zh-CN.js`, shared UI files, tests | Key-based i18n module, locale files, and UI text application were added; JS syntax, `homeState`, and `storage` passed. Browser smoke still required. |
| 1.2 | First-run UI language choice | IMPLEMENTED_UNVERIFIED | `LANG-001`, `LANG-002`, `LANG-005` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, tests | First-run bilingual language gate and local app-preferences persistence were added; `homeState` and `storage` passed. Browser smoke still required. |
| 2.1 | Settings view | IMPLEMENTED_UNVERIFIED | `SETTINGS-001`, `SETTINGS-002`, `SETTINGS-003`, `LANG-003` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, storage helper only if justified, tests | Standalone Settings view, Home/Settings navigation, UI language select, and Help Center entry point were added; JS syntax, `homeState`, and `storage` passed. Browser smoke still required. |
| 3.1 | Guide hide/restore | IMPLEMENTED_UNVERIFIED | `GUIDE-002`, `GUIDE-004`, `GUIDE-005` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `pwa-reader/guideBook.js`, tests | Guide Hide from Library and Show/restore Guide in Library were added through app preferences; JS syntax, `homeState`, `storage`, and `navigationEngine` passed. Browser smoke still required. |
| 3.2 | Help Center | IMPLEMENTED_UNVERIFIED | `HELP-001`, `HELP-002`, `HELP-003`, `HELP-004` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, i18n files, tests | Settings Help Center panel with required categories and Guide actions was added; JS syntax, `homeState`, `storage`, and `navigationEngine` passed. Browser smoke still required. |
| 4.1 | Reader contextual help | IMPLEMENTED_UNVERIFIED | `CONTEXT-001`-`CONTEXT-006` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, i18n files, tests | Reader `?` control, localized help panel, Help Center action, and Guide action were added; JS syntax, `homeState`, and `navigationEngine` passed. Browser placement smoke still required. |
| 5.1 | Guide content expansion | PASS | `GUIDE-006`, `GUIDE-007`, `REGRESSION-003`-`REGRESSION-006` | `pwa-reader/guideBook.js`, relevant tests | Six chapters expose English, Chinese, and mixed variants on one virtual book; Reading Mode selects content and browser truth-table smoke passes. |
| 6.1 | 不背单词 TXT export | IMPLEMENTED_UNVERIFIED | `TXT-001`-`TXT-005` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, relevant tests | Added dedicated learning-only BBDC TXT download using normalized Learning words only; JS syntax, `homeState`, and `storage` passed. Browser download review still required. |
| 7.1 | Vocabulary profile JSON Backup / Restore | IMPLEMENTED_UNVERIFIED | `BACKUP-001`-`BACKUP-006` | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `pwa-reader/storage.js` only if justified, relevant tests | Added profile-only JSON backup/restore helpers and UI; JS syntax, `storage`, and `homeState` passed. Browser backup/restore smoke still required. |
| 8.1 | Final regression and M2 closeout | IMPLEMENTED_UNVERIFIED | `REGRESSION-001`-`REGRESSION-011`, `DOCS-001`-`DOCS-003`, all open P0/P1 IDs | tests, status docs, user guides if explicitly scoped | Automated regression passed; focused browser smoke passed for Guide, imported EPUB, Preview, bubble, placeholders, Local Library restore/Forget, Settings/Help Center, Guide hide/restore, Contents, Progress, and docs sync. M2 remains implemented-unverified until remaining language-switch and downloaded-file evidence gaps are closed. |
| L0 | Localization Phase 0 - string inventory, locale parity, and English-leak tests | NOT_STARTED | `ILC-003`, `ILC-004`, `PRESERVE-001`, `DEVLANG-001` evidence foundation | shared localization tests/audit files and execution docs; exact files determined by the active phase | Localization implementation has not started. First incomplete task. Establish failing baseline evidence before production-copy changes. |
| L1 | Localization Phase 1 - shared locale keys and formatting helpers | NOT_STARTED | `ILC-001`-`ILC-006`, `PRESERVE-001` as applicable | shared locale/controller files, relevant tests, execution/acceptance docs | Must follow and use Phase 0 inventory/tests. |
| L2 | Localization Phase 2 - Home, import, library, Guide card, confirmations | NOT_STARTED | `ILC-002`, `ILC-003`, `ILC-005`, `ILC-006`, `CONTENT-003`, `PRESERVE-001` | shared UI/controller/locale files, relevant tests, execution/acceptance docs | Must preserve imported content and existing Guide/startup behavior. |
| L3 | Localization Phase 3 - Settings, Help Center, contextual help | NOT_STARTED | `ILC-002`, `ILC-003`, `ILC-005`, `ILC-006` | shared UI/controller/locale files, relevant tests, execution/acceptance docs | Current open surfaces must update immediately on Interface Language switch. |
| L4 | Localization Phase 4 - Reader chrome, Contents, Progress, Mode, Preview, bubble | NOT_STARTED | `ILC-001`-`ILC-006`, `CONTENT-003`, `PRESERVE-001` | shared Reader/controller/locale files, relevant tests, execution/acceptance docs | Imported EPUB Chinese/Mixed remain localized placeholders. |
| L5 | Localization Phase 5 - Vocabulary Library, Level help, manual actions, export, Backup/Restore | NOT_STARTED | `ILC-002`-`ILC-006`, `PRESERVE-001` | shared UI/controller/locale/storage-boundary files only as justified, relevant tests, execution/acceptance docs | Preserve vocabulary values, export formats, and backup schema while localizing UI frames. |
| L6 | Localization Phase 6 - diagnostics boundary and raw-error isolation | NOT_STARTED | `ILC-006`, `DEVLANG-001` | shared import/error/controller/locale files, relevant tests, execution/acceptance docs | Raw diagnostics remain developer-only; user errors become localized and actionable. |
| L7 | Localization Phase 7 - Chinese Guide and target-list-based Mixed rewrite | NOT_STARTED | `CONTENT-001`, `CONTENT-002`, `MIXED-001`-`MIXED-005`, `PRESERVE-001`, `DEVLANG-001` | `pwa-reader/guideBook.js`, target-list representation, relevant tests, execution/acceptance docs | Preserve six chapters, Guide startup/mode behavior, and chapter-index preservation; replace paired bilingual Mixed content. |
| L8 | Localization Phase 8 - browser, responsive, and accessibility evidence closeout | NOT_STARTED | `BROWSER-LOC-001` and every remaining localization acceptance ID | tests/evidence/status docs; production fixes only when a focused gap requires them | Execute the full coverage-matrix evidence plan before any localization `PASS` or M2 closeout. |

## Test evidence log

- 2026-06-19: Documentation harness round. No app tests required because no app files were edited.
- 2026-06-20 localization harness activation: documentation-only update linked the frozen contract/coverage matrix, added localization acceptance IDs as `NOT_STARTED`, queued Localization Phases 0-8, and preserved prior Guide/startup evidence. No app tests were required because no production or test files were edited by this activation task.
- Prior evidence to preserve: Vocabulary Level selector and virtual Guide implementation previously reported JS syntax, `tests/homeState.test.mjs`, and `tests/navigationEngine.test.mjs` passing. Re-run during Phase 0 before relying on this for final M2 closeout.
- 2026-06-19 Phase 0: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 0: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 0: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs` passed.
- 2026-06-19 Phase 0: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\levelBaselineEngine.test.mjs` passed.
- 2026-06-19 Phase 0: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed.
- 2026-06-19 Phase 0: Node inspection confirmed built-in guide metadata has `isBuiltInGuide: true`, `canForget: false`, pre-authored content variants, and no `fileBlob`; later recovery evidence confirms six current chapters. Level selector state exposes `level1`-`level5` and selected `level4` correctly.
- 2026-06-19 Phase 1 red tests: `tests\homeState.test.mjs` failed before implementation because `pwa-reader/i18n.js` was missing; `tests\storage.test.mjs` failed before implementation because app-preference helpers were missing.
- 2026-06-19 Phase 1: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 1: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 1: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed.
- 2026-06-19 Phase 2 red test: `tests\homeState.test.mjs` failed before implementation because Settings was not part of app view visibility.
- 2026-06-19 Phase 2: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 2: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 2: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed.
- 2026-06-19 Phase 3 red test: `tests\homeState.test.mjs` failed before implementation because Settings lacked `settingsShowGuideButton` and Help Center categories.
- 2026-06-19 Phase 3: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 3: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 3: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed.
- 2026-06-19 Phase 3: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs` passed.
- 2026-06-19 Phase 4 red test: `tests\homeState.test.mjs` failed before implementation because Reader contextual help markup was missing.
- 2026-06-19 Phase 4: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 4: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 4: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs` passed.
- 2026-06-19 Phase 5 red test: `tests\homeState.test.mjs` failed before implementation because the built-in Guide still had fewer than six instructional chapters per version.
- 2026-06-19 Phase 5: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 5: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 5: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs` passed.
- 2026-06-19 Phase 5: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\vocabEngine.test.mjs` passed.
- 2026-06-19 Phase 6 red test: `tests\homeState.test.mjs` failed before implementation because export state lacked `downloadLearningTxtDisabled` and the dedicated BBDC TXT action was missing.
- 2026-06-19 Phase 6: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 6: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 6: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed.
- 2026-06-19 Phase 7 red tests: `tests\storage.test.mjs` failed before implementation because `createVocabularyProfileBackup` was missing; `tests\homeState.test.mjs` failed before implementation because Backup/Restore controls were missing.
- 2026-06-19 Phase 7: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 7: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed.
- 2026-06-19 Phase 7: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 8: JS syntax passed with `Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }`.
- 2026-06-19 Phase 8: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed.
- 2026-06-19 Phase 8: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed.
- 2026-06-19 Phase 8: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\levelBaselineEngine.test.mjs` passed.
- 2026-06-19 Phase 8: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs` passed.
- 2026-06-19 Phase 8: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\vocabEngine.test.mjs` passed.
- 2026-06-19 Phase 8: `git diff -- ...` was attempted for targeted changed files but failed with local permission error: `git` could not run, access denied. Per runbook, this is not a blocker.
- 2026-06-20 Guide recovery red evidence: `tests\homeState.test.mjs` failed before the fix with `ReferenceError: Cannot access 'MODES' before initialization` at `pwa-reader/guideBook.js:14`, proving the `guideBook.js` <-> `readingModes.js` circular import blocked module evaluation before `init()`.
- 2026-06-20 recovery fix: `guideBook.js` no longer imports `MODES`; stable compatibility mode strings remain `english-study`, `chinese`, and `cloze-mixed`.
- 2026-06-20: JS syntax passed with `Get-ChildItem -Path 'pwa-reader' -Filter '*.js' | ForEach-Object { & 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check $_.FullName }`.
- 2026-06-20: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs` passed with the six-case Interface Language x Reading Mode Guide truth table and imported Chinese/Mixed placeholder assertions.
- 2026-06-20: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs` passed, preserving legacy `guideVersion` compatibility storage without runtime Guide control.
- 2026-06-20: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs` passed.
- 2026-06-20: `C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\vocabEngine.test.mjs` passed.

## Manual evidence log

- 2026-06-20 focused browser recovery smoke used local Playwright after the in-app Browser worker was denied by the Windows sandbox. The app's pinned CDN scripts were routed from temporary local copies for the imported-EPUB pass; no dependency or repo files were added.
- Startup reached initialized Home state with `Level 3`, one built-in Guide card, no `#guideVersionSelect`, and Settings opening successfully.
- Six-case truth table passed: English and Chinese Interface Language each rendered English Guide content in `english-study`, Chinese Guide content in `chinese`, and mixed Guide content in `cloze-mixed`.
- Guide chapter `guide-reader-tools` remained selected while switching from Mixed Mode to English Study.
- Imported `tests/fixtures/interleaf_smoke.epub` rendered `Interleaf Smoke Test Book`, `Preface · 1 / 3`, original fixture text, and no placeholder in English Study.
- The imported fixture rendered explicit `Chinese translation is not implemented yet` and `Mixed Mode is not implemented yet` placeholder panels in Chinese and Mixed modes, with no browser console errors during the routed-dependency pass.

- 2026-06-19 Phase 8 browser smoke: `python -m http.server 8000` served `http://127.0.0.1:8000/pwa-reader/`.
- First-run language gate appeared before Home interaction; English UI selection dismissed the gate and persisted for later browser sessions.
- Local Library showed `Interleaf Reader Guide` as a built-in guide entry with no normal Forget action.
- Opening the Guide switched to Reader. Reading Mode selected English, Chinese, or mixed pre-authored Guide content while Interface Language remained independent.
- Reader contextual `?` help opened and exposed `Reader help` aria-label.
- Vocabulary Library showed level1-level5 selector, disabled empty Learning TXT export, Backup profile JSON control, Restore profile JSON control, and profile-only Backup / Restore scope copy.
- Importing `tests\fixtures\interleaf_smoke.epub` opened Reader, rendered `Interleaf Smoke Test Book`, showed 3 chapters, showed 5 Vocabulary Preview terms, and opened a vocabulary bubble for `anxious`.
- Chinese Reading Mode rendered explicit placeholder text and did not perform provider translation.
- Local Library restored the imported smoke EPUB through saved-book Open; user-book Forget removed that EPUB and left the built-in Guide visible.
- IndexedDB `books` store was empty after Forget, confirming no Guide EPUB blob was stored as a user book during smoke.
- Follow-up browser pass verified Settings opens and returns Home, Help Center opens with Getting Started / Reading / Vocabulary / Storage / Feature Status categories, and Help Center exposes full Guide and restore-Guide actions.
- Guide Hide from Library removed only the Guide card; Help Center Show/restore Guide restored it; the restored Guide still had no normal user-book Forget action.
- Opening the Guide after restore showed Reader progress `Welcome to Interleaf Reader · 1 / 6`; mobile Contents opened with 6 guide chapters; Progress opened with an enabled chapter slider max of 6.
- Final imported-EPUB pass re-imported `tests\fixtures\interleaf_smoke.epub`; mobile Contents opened with 3 imported chapters; Progress opened with an enabled chapter slider max of 3; Mixed Mode rendered explicit placeholder text and did not perform provider translation.
- Remaining evidence gaps are unrelated to this Guide recovery: broader Settings localization follow-through, Help Center/contextual-help action clicks, actual downloaded TXT/JSON review, and UI restore of valid/malformed/unsupported profile JSON files.

## Decisions/assumptions made during execution

- The built-in Guide is a virtual guide book, not a user-imported EPUB and not an EPUB blob in IndexedDB.
- Interface Language and Reading Mode are independent concepts. There is no separate user-facing Guide Version; legacy `guideVersion` fields remain compatibility-only.
- Hiding the Guide means removing it from Local Library view only; it does not delete Guide content or use user-book Forget.
- Help Center lives inside Settings for M2.
- Functional completion matters before final visual polish; polish is not a blocker unless usability or accessibility is broken.
- Chinese Reading Mode and Mixed Mode remain placeholders.
- Translation providers remain planned and not implemented.
- No provider keys, analytics, backend, account, upload, cloud sync, or cross-device sync are in M2.
- `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md` is the frozen authority for Interface Language completeness and Guide content authoring; `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md` controls surface/evidence coverage.
- Chinese UI completeness and Chinese-base, target-list-driven Mixed Guide content are required for M2 closeout; paired bilingual Mixed content is not acceptable.

## Files changed by phase

| Phase | Files changed |
|---|---|
| Harness preparation | `AGENTS.md`, `docs/M2_HARNESS_SPEC.md`, `docs/M2_HELP_AND_LANGUAGE_SPEC.md`, `docs/M2_ACCEPTANCE_MATRIX.md`, `docs/M2_AUTONOMOUS_RUNBOOK.md`, `docs/M2_EXECUTION_STATE.md` |
| Phase 0 | Automated baseline only: no implementation files changed; execution/acceptance docs updated. |
| Phase 1 | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `pwa-reader/storage.js`, `pwa-reader/i18n.js`, `pwa-reader/locales/en.js`, `pwa-reader/locales/zh-CN.js`, `tests/homeState.test.mjs`, `tests/storage.test.mjs`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Phase 2 | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, locale files, `tests/homeState.test.mjs`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Phase 3 | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, locale files, `tests/homeState.test.mjs`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Phase 4 | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, locale files, `tests/homeState.test.mjs`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Phase 5 | `pwa-reader/guideBook.js`, `tests/homeState.test.mjs`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Phase 6 | `pwa-reader/index.html`, `pwa-reader/app.js`, `tests/homeState.test.mjs`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Phase 7 | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/storage.js`, `tests/homeState.test.mjs`, `tests/storage.test.mjs`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Phase 8 | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/storage.js`, `pwa-reader/guideBook.js`, `tests/homeState.test.mjs`, `tests/storage.test.mjs`, `docs/PROJECT_STATE.md`, `docs/HANDOFF.md`, `docs/USER_GUIDE.md`, `docs/USER_GUIDE_CN.md`, `docs/USER_GUIDE_BILINGUAL.md`, `docs/M2_EXECUTION_STATE.md`, `docs/M2_ACCEPTANCE_MATRIX.md` |
| Guide recovery | `pwa-reader/guideBook.js`, `tests/homeState.test.mjs`, `docs/M2_HARNESS_SPEC.md`, `docs/M2_HELP_AND_LANGUAGE_SPEC.md`, `docs/M2_ACCEPTANCE_MATRIX.md`, `docs/M2_EXECUTION_STATE.md`, `docs/HANDOFF.md`, and affected user guides. |
| Localization harness activation | `docs/M2_HARNESS_SPEC.md`, `docs/M2_ACCEPTANCE_MATRIX.md`, `docs/M2_AUTONOMOUS_RUNBOOK.md`, `docs/M2_EXECUTION_STATE.md`; no production or test files changed. |

## Resume instructions

1. Read this file after the project docs, parent harness spec, Help/Language child spec, frozen localization/content spec, localization coverage matrix, acceptance matrix, and runbook.
2. Resume Localization Phase 0, the first `NOT_STARTED` localization task. Localization implementation has not started.
3. Do not repeat `PASS` tasks unless a regression or dependency change requires it.
4. Reconcile task statuses against acceptance evidence before continuing.
5. Update this file after every autonomous task with files changed, exact commands, pass/fail, acceptance IDs addressed, manual smoke status, remaining risks, and next phase.
6. Do not mark acceptance criteria `PASS` without evidence.
