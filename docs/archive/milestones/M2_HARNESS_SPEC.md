# M2 Harness Spec - Reader UX + Vocabulary Workflow + Storage Trust

## 1. Purpose

This document is the parent M2 milestone harness for Codex / Superpowers subagent work.

M2 closes out Reader UX, vocabulary workflow clarity, and local-storage trust. It defines the milestone contract, product boundaries, allowed work areas, evidence requirements, and acceptance flow for later implementation tasks.

This file does not implement app behavior. It is the M2-specific contract.

## 2. Source of truth

Project-level sources remain authoritative:

- `AGENTS.md`
- `docs/INTERLEAF_READER_PRD.md`
- `docs/PROJECT_STATE.md`
- `docs/DECISION_LOG.md`
- `docs/HANDOFF.md`
- `docs/AI_WORKFLOW_PROTOCOL.md`

`AGENTS.md` remains the project-level rule source. This file is the M2-specific contract and must be read after the project-level sources for any M2 task.

If this file conflicts with `AGENTS.md`, the PRD, `docs/PROJECT_STATE.md`, `docs/DECISION_LOG.md`, or `docs/HANDOFF.md`, stop and reconcile the conflict before implementation.

## 2.1 Active child specifications and execution files

M2 autonomous execution must also read:

- `docs/M2_HELP_AND_LANGUAGE_SPEC.md`
- `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md`
- `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md`
- `docs/M2_ACCEPTANCE_MATRIX.md`
- `docs/M2_AUTONOMOUS_RUNBOOK.md`
- `docs/M2_EXECUTION_STATE.md`

For Interface Language, localization completeness, Guide body variants, Mixed-content authoring, preservation classes, accessibility localization, feedback/error localization, and developer-language boundaries, `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md` is the controlling child contract. `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md` is the controlling surface inventory and browser/responsive/accessibility evidence map. Older child-spec wording must not be interpreted to permit paired bilingual Mixed content or untranslated explanatory English on Chinese UI surfaces.

Authority order:

1. `AGENTS.md` and the canonical PRD.
2. `docs/PROJECT_STATE.md`, `docs/DECISION_LOG.md`, and `docs/HANDOFF.md`.
3. `docs/M2_HARNESS_SPEC.md`.
4. Linked M2 child specs, with the frozen localization/content contract controlling its defined areas.
5. `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md` for localization inventory and evidence scope.
6. `docs/M2_ACCEPTANCE_MATRIX.md`.
7. `docs/M2_AUTONOMOUS_RUNBOOK.md`.
8. `docs/M2_EXECUTION_STATE.md` as a progress and evidence record, not a product authority.

## 3. M2 contract

M2 is Reader UX + Vocabulary workflow + Storage trust closeout.

M2 in scope:

- Maintain the virtual built-in Default User Guide Book in the Local Library / Reader flow.
- Complete manual smoke for the Default User Guide Book.
- Add Chinese / English UI language support through a key-based interface-language system.
- Complete Chinese UI coverage for all contracted M2 surfaces, including dynamic copy, accessibility text, feedback, errors, confirmations, and empty states.
- Add first-run interface-language selection.
- Add a Settings view.
- Add Guide Hide from Library, Help Center restore/open, and long-term Guide access.
- Add Reader contextual help through a small circular `?` control.
- Expand built-in Guide content and strengthen the instructional flow.
- Preserve the Vocabulary Level selector with `?` help.
- Add 不背单词 TXT export.
- Add vocabulary profile JSON Backup / Restore.
- Keep multilingual strategy docs-only for M2.
- Re-author the built-in Guide Chinese variant as complete Chinese and the Mixed variant as Chinese-base prose retaining only declared chapter target terms.
- Keep user-facing docs aligned with actual behavior.

M2 out of scope:

- No real Chinese Reading Mode.
- No real Mixed Mode.
- No translation provider integration.
- No DeepL / Google / GPT API call.
- No frontend API keys, secrets, analytics, upload flows, account system, cloud sync, backend, or cross-device sync.
- No IndexedDB database rename.
- No localStorage key rename.
- No debug global rename.
- No `cloze-mixed` or `clozeHtml` rename.
- No broad refactor.
- No changes to `data/vocabulary.json`, `data/slang_idioms.json`, or `data/levels/**` unless a later explicit task proves a direct need.
- No real EPUB generation for the built-in Guide.

Current M2 queue:

Completed or implemented:

- M2 impact map.
- M2 harness parent spec.
- Three written user guides aligned.
- Vocabulary Level selector + `?` help implemented.
- Virtual Default User Guide Book implemented.
- Old Home expandable guide removed.
- The initial key-based UI language foundation, first-run choice, Settings, Guide hide/restore, Help Center, Reader contextual help, six-chapter Guide structure, TXT export, and profile Backup / Restore are implemented; complete localization remains pending.
- Guide selection wiring is corrected: Interface Language controls UI text only and Reading Mode selects the Guide variant. The current legacy Mixed body is paired bilingual text and does not satisfy the frozen Mixed-content contract.
- Automated syntax, `homeState`, `storage`, `navigationEngine`, and `vocabEngine` checks pass after the Guide recovery.
- Focused browser smoke passes the six Interface Language x Reading Mode Guide cases, chapter preservation, startup Home state, and imported-EPUB placeholder regression checks.

Still pending:

- Localization implementation defined by the frozen contract and coverage matrix has not started.
- Full Chinese UI completeness across all contracted static, dynamic, feedback/error, and accessibility surfaces.
- Chinese Guide editorial cleanup and Chinese-base, target-list-driven Mixed Guide rewrite; paired bilingual Mixed content is not acceptable.
- Remaining targeted evidence for language localization, contextual-help actions, downloaded TXT/JSON files, and restore rejection UI.
- Final regression and M2 closeout.

Definition of done:

- All P0/P1 acceptance criteria in `docs/M2_ACCEPTANCE_MATRIX.md` are PASS or explicitly accepted by the user when manual-only.
- The built-in Guide is visible by default unless hidden by the user, opens Reader, exposes English / Chinese / mixed content variants through Reading Mode, and remains separate from user EPUB storage.
- Interface Language controls UI text only. Reading Mode controls book content, including built-in Guide content variants.
- Chinese UI has no untranslated explanatory English beyond approved preservation classes and updates the currently visible UI without changing Reading Mode or Reading Content.
- The Guide Chinese variant is complete Chinese except approved protected terms, and the Mixed variant uses Chinese sentence/paragraph structure with only declared chapter target terms retained in English.
- Mixed Guide content contains no paired English/Chinese headings, sentences, duplicated paragraph translations, random common-English retention, or split multiword targets.
- Chinese Reading Mode, Mixed Mode, and translation providers remain Placeholder / Planned.
- TXT export is learning-only, UTF-8, and one term per line with no book context.
- Profile JSON Backup / Restore includes only the allowed vocabulary profile fields.
- EPUB import, Reader, Contents, Progress, Preview, vocabulary bubble, Local Library restore, and user-book Forget do not regress.
- Required automated and manual evidence is recorded in `docs/M2_EXECUTION_STATE.md`.

## 4. Current repository baseline

Existing baseline evidence:

- The three user guides already exist:
  - `docs/USER_GUIDE.md`
  - `docs/USER_GUIDE_CN.md`
  - `docs/USER_GUIDE_BILINGUAL.md`
- Multilingual strategy docs already exist:
  - `docs/MULTILINGUAL_BOOK_PROJECT_STRATEGY.md`
  - `docs/BOOK_PROJECT_DATA_MODEL_PROPOSAL.md`
- Those multilingual docs are future-direction docs, not M2 implementation instructions.
- `selectedLevel`, level baseline support, and vocabulary profile storage already exist.
- Vocabulary Level selector + `?` help has been implemented.
- Copy Learning / Copy All / CSV export already exist.
- The virtual Default User Guide Book has been implemented in the Local Library / Reader flow.
- The old Home expandable guide has been removed as the primary guide model.
- Focused browser smoke verifies the corrected Guide content model and imported-EPUB placeholders.
- 不背单词 TXT export and vocabulary profile JSON Backup / Restore are implemented but retain separate acceptance-evidence gaps.
- UI language, Settings, Help Center, contextual Reader help, Guide hide/restore, and expanded Guide content are implemented; remaining acceptance status is tracked in the matrix.

## 5. Module contracts

### 5.1 Default User Guide Book

The built-in `Interleaf Reader Guide` must remain a virtual built-in guide book opened from Local Library / Reader, not a user-imported EPUB and not a fake EPUB blob in IndexedDB.

Requirements:

- Guide appears as a book-like Local Library entry by default.
- Guide opens Reader.
- Guide is one virtual book with a fully English variant, a fully Chinese variant, and a Chinese-base target-list-driven Mixed variant selected by Reading Mode.
- Switching Reading Mode while the Guide is open preserves the current chapter index.
- Contents, chapter navigation, Progress, Preview, Mode awareness, Vocabulary Preview, and vocabulary bubble work or fail gracefully.
- Guide is visually distinguished from user-imported books.
- Guide does not use the normal user EPUB Forget/delete path.
- Imported EPUB behavior must not regress.
- Home expandable guide panel must not return as the primary guide model.

### 5.2 Help, Guide, and UI Language

Detailed requirements live in `docs/M2_HELP_AND_LANGUAGE_SPEC.md`.

The frozen localization/content rules and surface evidence requirements live in:

- `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md`
- `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md`

Parent contract:

- Interface Language controls UI strings, Help Center, feedback, dialogs, and contextual help.
- Reading Mode controls book content for imported EPUBs and built-in Guide content variants.
- There is no separate user-facing Guide Version selector.
- Legacy `guideVersion` preference fields may remain stored but must not control Guide content.
- Chinese Reading Mode and Mixed Mode remain placeholders for imported EPUBs only.
- Translation providers remain planned, not implemented.
- Chinese UI completeness is required for M2 closeout; existing key parity is not sufficient while visible or generated English bypasses locale files.
- Built-in Guide Mixed content must be Chinese-base and target-list-driven. Full English/Chinese paired headings, sentences, or paragraphs are forbidden.

### 5.3 Multilingual Strategy Boundary

Existing multilingual architecture docs remain future direction.

M2 does not implement translation, alignment, Book Project storage, provider integration, translation import workflows, or real Mixed Mode rendering for imported EPUBs. The built-in Guide's pre-authored Chinese-base Mixed content is an explicit exception and is not translation; it retains only declared chapter target terms in English and must not use paired bilingual text. M2 does not create provider settings, API key UI, backend flows, account flows, upload flows, or cloud sync.

### 5.4 Vocabulary Level Selector + `?` Help

The implemented selector must continue to reuse existing `selectedLevel`, `level1`-`level5`, level baseline, and vocabulary profile behavior.

Help must explain:

- Vocabulary Level controls which basic words are treated as already known.
- Changing the level changes which words may be filtered from Vocabulary Preview.
- It is not a test score.
- It is not a full dictionary completeness level.
- It can be changed anytime.

Reader import, Reader render, and chapter render must remain fail-open if profile loading, baseline loading, or Preview filtering fails.

### 5.5 不背单词 TXT Export

TXT export must be local and learning-only:

- UTF-8 plain text.
- One word or phrase per line.
- No definitions, examples, source sentences, book text, copyrighted context, API, login, upload, sync, or external service call.
- Empty Learning list is handled calmly.

### 5.6 Vocabulary Profile JSON Backup / Restore

Backup / Restore is vocabulary-profile-only.

Allowed fields:

- `schemaVersion`
- `exportedAt`
- `selectedLevel`
- `knownWords`
- `learningWords`
- `ignoredWords`
- `preferredCategories`

Backup / Restore must not include EPUB blobs, book text, source sentences, Local Library files, or reading progress. Restore must use existing profile normalization/storage and reject malformed or unsupported input without partial unsafe changes.

## 6. Affected files map

| Task | Likely files | Risk | Why |
|---|---|---|---|
| i18n foundation | `pwa-reader/i18n.js`, `pwa-reader/locales/en.js`, `pwa-reader/locales/zh-CN.js`, `pwa-reader/app.js`, `pwa-reader/index.html`, tests | High | Core UI text flow, startup state, and local preference handling. |
| First-run language choice | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, storage helper only if justified, tests | Medium | Blocks normal Home interaction until the user chooses UI language. |
| Settings + preferences | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, storage helper only if justified, tests | Medium | Adds a new app view and local preferences distinct from vocabulary profile/progress. |
| Guide hide/restore + Help Center | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `pwa-reader/guideBook.js`, tests | Medium | Must distinguish hiding from deleting and avoid user-book Forget path. |
| Reader contextual help | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, tests | Medium | Adds Reader UI without covering text or Mode controls. |
| Guide content expansion | `pwa-reader/guideBook.js`, `tests/navigationEngine.test.mjs`, `tests/vocabEngine.test.mjs` if matching changes | Low/Medium | Content-only unless chapter shape or vocabulary matching changes. |
| 不背单词 TXT export | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `tests/homeState.test.mjs` | Low/Medium | Local download only; must avoid book context. |
| Profile Backup / Restore | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `pwa-reader/storage.js` only if justified, tests | Medium | Must validate schema and avoid backing up book/progress data. |
| Docs sync | `docs/USER_GUIDE.md`, `docs/USER_GUIDE_CN.md`, `docs/USER_GUIDE_BILINGUAL.md`, status docs when behavior changes | Low | Must reflect actual implemented behavior only. |

## 7. Subagent task plan

Use the sequential subagent boundaries in `docs/M2_HELP_AND_LANGUAGE_SPEC.md`.

Current order:

1. Phase 0 baseline verification.
2. i18n Foundation Agent.
3. Settings + Preferences Agent.
4. Guide Visibility + Help Center Agent.
5. Reader Contextual Help Agent.
6. Guide Content Expansion Agent.
7. TXT Export Agent.
8. Profile Backup / Restore Agent.
9. Final Reviewer + Docs Sync Agent.

The next active queue is Localization Phase 0 through Localization Phase 8 as defined in `docs/M2_AUTONOMOUS_RUNBOOK.md`. Localization phases and any agents touching shared production files must run strictly sequentially, with phase verification recorded before the next phase begins.

Because `app.js`, `index.html`, `styles.css`, storage helpers, and shared docs are common edit surfaces, do not run implementation subagents in parallel when they may touch those files.

## 8. Test evidence requirements

For JavaScript changes, run:

```powershell
Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }
```

Run relevant Node tests:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\levelBaselineEngine.test.mjs
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs
```

Run this only if Preview filtering or vocabulary matching behavior changes:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\vocabEngine.test.mjs
```

Run this only if vocabulary data or dataset scripts change:

```powershell
python scripts\check_vocabulary_dataset.py
```

For docs-only edits:

- No app tests are required.
- Read the edited docs and confirm harness consistency.

## 9. Manual smoke checklist

Start the local static server from the repo root:

```powershell
python -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/pwa-reader/
```

Smoke steps:

- Hard refresh.
- Confirm Local Library shows `Interleaf Reader Guide` by default.
- Open the Guide and confirm Reader view.
- Switch Reading Mode through English Study, Chinese, and Mixed; confirm the Guide follows Reading Mode while Interface Language does not change Guide content. Confirm Chinese Guide content is complete Chinese and Mixed Guide content is Chinese-base, target-list-driven prose rather than paired bilingual text.
- Open Contents and jump chapters.
- Open Progress and use chapter navigation.
- Open Preview.
- Tap/click an underlined vocabulary term if present.
- Open Mode and confirm Chinese Reading Mode and Mixed Mode use pre-authored variants for the built-in Guide but remain placeholders for imported EPUBs.
- Confirm Guide Hide from Library and Settings / Help Center restore after those features are implemented.
- Confirm Reader contextual help opens and follows Interface Language after implemented.
- Import `tests/fixtures/interleaf_smoke.epub`.
- Confirm imported EPUB Reader, Contents, Progress, Preview, bubble, Local Library restore, and Forget still work.
- Confirm 不背单词 TXT export and Backup / Restore behavior after those features are implemented.
- Confirm no provider, API key, account, cloud sync, upload, or backend UI was added.

## 10. M2 closeout checklist

- [ ] Child specs, acceptance matrix, runbook, and execution state exist and are linked.
- [ ] Manual Default User Guide Book smoke is complete or explicitly accepted as a gap.
- [ ] Interface Language and Reading Mode are independent, and no separate user-facing Guide Version selector exists.
- [ ] First-run UI language choice works.
- [ ] Settings view works and returns Home.
- [ ] Help Center opens, is localized, and can open/restore the Guide.
- [ ] Guide can be hidden from Local Library without deletion.
- [ ] Guide can be restored to Local Library.
- [ ] Reader contextual help uses a circular `?`, is accessible, localized, and does not block controls.
- [ ] Built-in Guide has at least six instructional chapters with fully English, fully Chinese, and Chinese-base target-list-driven Mixed variants selected by Reading Mode.
- [ ] Chinese UI completeness passes the frozen localization contract across visible, generated, feedback/error, and accessibility copy.
- [ ] Built-in Guide Chinese content is complete Chinese except approved protected terms.
- [ ] Built-in Guide Mixed content is Chinese-base, retains only declared chapter target terms, preserves complete multiword phrases, and contains no paired bilingual text.
- [ ] Vocabulary Level selector and help still work.
- [ ] 不背单词 TXT export is learning-only, UTF-8, one term per line, and contains no book context.
- [ ] Profile JSON Backup contains only allowed fields.
- [ ] Profile JSON Restore validates schema and uses existing profile normalization/storage.
- [ ] Imported EPUB behavior and user-book Forget still work.
- [ ] Chinese Reading Mode remains Placeholder.
- [ ] Mixed Mode remains Placeholder.
- [ ] Translation providers remain Planned / not implemented.
- [ ] No forbidden storage key/database/debug/global renames occurred.
- [ ] No `data/**` changes occurred unless explicitly scoped and checked.
- [ ] Automated and manual evidence is recorded in `docs/M2_EXECUTION_STATE.md`.

## 11. Standard return format for M2 subagents

M2 subagents must return:

A. What changed

B. Behavior / decision summary

C. Tests run with exact commands and pass/fail

D. Manual smoke status

E. What was not implemented

F. Recommended next prompt

Important:

- Do not claim features are implemented unless they are implemented.
- Mark Chinese Reading Mode, Mixed Mode, and translation providers as Placeholder / Planned.
- Keep each M2 task small and scoped.
- Preserve local-first behavior.
