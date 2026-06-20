# M2 Autonomous Runbook

## Mission

Execute remaining M2 tasks from linked specs without requiring a new user prompt after every task.

The autonomous controller must preserve M2 scope, record evidence, and stop only for defined blockers.

## Read order

Read in this order:

1. `AGENTS.md`
2. Canonical project docs:
   - `docs/INTERLEAF_READER_PRD.md`
   - `docs/PROJECT_STATE.md`
   - `docs/DECISION_LOG.md`
   - `docs/HANDOFF.md`
   - `docs/AI_WORKFLOW_PROTOCOL.md`
3. `docs/M2_HARNESS_SPEC.md`
4. `docs/M2_HELP_AND_LANGUAGE_SPEC.md`
5. `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md`
6. `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md`
7. `docs/M2_ACCEPTANCE_MATRIX.md`
8. `docs/M2_EXECUTION_STATE.md`
9. Task-specific files

Use targeted reads. Do not scan `source_materials/`, `generated/`, large artifacts, or unrelated files unless a later task explicitly requires it.

## Autonomous behavior

The controller must:

- Build an internal task queue from this runbook.
- Use Superpowers subagents when available.
- Run subagents sequentially when they touch shared UI/controller files.
- Avoid parallel edits to `app.js`, `index.html`, `styles.css`, `storage.js`, or shared docs.
- Execute Localization Phases 0 through 8 strictly in order.
- Do not run localization implementation agents in parallel when they may touch any shared production file; complete and verify the active phase before starting the next phase.
- Continue automatically after successful task verification.
- Not wait for user approval between normal tasks.
- Update `docs/M2_EXECUTION_STATE.md` after every task.
- Update acceptance statuses only with evidence.
- Attempt focused fixes for failed tests.
- Rerun failed checks after a fix.
- Avoid unrelated refactors.
- Conserve tokens with targeted reads.

## Execution order

| Phase | Task | Acceptance IDs |
|---|---|---|
| Phase 0 | Baseline verification: verify current Level selector and Guide implementation, record manual gaps, do not rebuild working features. | `HARNESS-001`-`HARNESS-003`, `GUIDE-001`, `GUIDE-003`, `GUIDE-006`, `REGRESSION-001`-`REGRESSION-011` as applicable |
| Phase 1 | i18n foundation and first-run chooser. | `LANG-001`-`LANG-007` |
| Phase 2 | Settings view and app preferences. | `SETTINGS-001`-`SETTINGS-003`, `LANG-003` |
| Phase 3 | Guide Hide / Restore and Help Center. | `GUIDE-002`, `GUIDE-004`, `GUIDE-005`, `HELP-001`-`HELP-004` |
| Phase 4 | Reader contextual help. | `CONTEXT-001`-`CONTEXT-006`, `HELP-002`, `HELP-004` |
| Phase 5 | Guide content expansion and version verification. | `GUIDE-006`, `GUIDE-007`, `REGRESSION-003`-`REGRESSION-006` |
| Phase 6 | 不背单词 TXT export. | `TXT-001`-`TXT-005` |
| Phase 7 | Vocabulary profile JSON Backup / Restore. | `BACKUP-001`-`BACKUP-006` |
| Phase 8 | Regression tests, manual smoke where possible, docs sync, M2 verdict. | `REGRESSION-001`-`REGRESSION-011`, `DOCS-001`-`DOCS-003`, all open P0/P1 IDs |

The completed/implemented phases above remain historical M2 evidence. The active remaining queue is the sequential localization closeout below.

| Localization phase | Task | Acceptance IDs |
|---|---|---|
| Localization Phase 0 | String inventory, locale parity, and English-leak tests. | `ILC-003`, `ILC-004`, `PRESERVE-001`, `DEVLANG-001` evidence foundation |
| Localization Phase 1 | Shared locale keys and formatting helpers. | `ILC-001`-`ILC-006`, `PRESERVE-001` as applicable |
| Localization Phase 2 | Home, import, library, Guide card, confirmations. | `ILC-002`, `ILC-003`, `ILC-005`, `ILC-006`, `CONTENT-003`, `PRESERVE-001` |
| Localization Phase 3 | Settings, Help Center, contextual help. | `ILC-002`, `ILC-003`, `ILC-005`, `ILC-006` |
| Localization Phase 4 | Reader chrome, Contents, Progress, Mode, Preview, bubble. | `ILC-001`-`ILC-006`, `CONTENT-003`, `PRESERVE-001` |
| Localization Phase 5 | Vocabulary Library, Level help, manual actions, export, Backup/Restore. | `ILC-002`-`ILC-006`, `PRESERVE-001` |
| Localization Phase 6 | Diagnostics boundary and raw-error isolation. | `ILC-006`, `DEVLANG-001` |
| Localization Phase 7 | Chinese Guide editorial rewrite and target-list-based Mixed rewrite. | `CONTENT-001`, `CONTENT-002`, `MIXED-001`-`MIXED-005`, `PRESERVE-001`, `DEVLANG-001` |
| Localization Phase 8 | Browser, responsive, and accessibility evidence closeout. | `BROWSER-LOC-001` and every remaining localization acceptance ID |

## Localization phase requirements

The frozen behavior, authoring, preservation, quality-gate, accessibility, feedback/error, and browser requirements are defined by:

- `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md`
- `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md`

The frozen contract controls Interface Language, Reading Mode, Guide variants, Chinese completeness, Mixed authoring, preservation classes, and developer-language boundaries. The coverage matrix controls surface inventory and required browser/responsive/accessibility evidence.

### Localization Phase 0

- Inventory static and generated user-facing strings, accessibility names, tooltips, placeholders, feedback, errors, Guide content, and preserved values.
- Add locale-key parity and hard-coded English/English-leak checks before changing production copy.
- Encode the approved protected-token and forbidden-developer-term classifications from the contract.
- Record the baseline failures without marking any new localization acceptance ID `PASS`.

### Localization Phase 1

- Add shared locale namespaces and parameterized formatting helpers for dynamic copy.
- Preserve imported values, target vocabulary, product tokens, and stable machine-readable export values.
- Ensure current-visible static, generated, accessibility, and live-region copy can re-render after an Interface Language switch.

### Localization Phase 2

- Localize Home, import feedback, Continue Reading/resume, Local Library, the built-in Guide card, Guide hide/restore, and the user-book Forget flow.
- Keep imported titles, authors, filenames, chapter titles, and book body unchanged.
- Verify normal, empty, success, validation, confirmation, and failure states for these surfaces.

### Localization Phase 3

- Localize Settings, every Help Center heading/body/action, and Reader contextual help.
- Localize accessibility names and confirm the current open panel updates without a reload.
- Preserve the distinction between Interface Language and Reading Mode.

### Localization Phase 4

- Localize Reader chrome, Contents, Progress, Mode labels and imported-book placeholders, Vocabulary Preview, generated vocabulary actions, and the vocabulary bubble.
- Cover desktop, mobile, tap controls, sheets, dynamic counts, empty/error states, tooltips, and generated accessible names.
- Keep imported EPUB Chinese and Mixed modes as localized placeholders; do not implement translation.

### Localization Phase 5

- Localize Vocabulary Library, Vocabulary Level help, manual add/remove actions, TXT/CSV UI, and JSON Backup/Restore UI.
- Preserve `Level 1` through `Level 5`, vocabulary values, file-format tokens, and stable machine-readable file content.
- Isolate raw parser/storage errors from user-facing restore feedback.

### Localization Phase 6

- Remove normal-user exposure to developer diagnostics or place diagnostics behind an explicit developer-only boundary.
- Keep raw causes, exception names, schema fields, storage/database names, internal mode IDs, and stack details out of visible and assistive UI.
- Verify plain-language localized error paths while retaining developer logging.

### Localization Phase 7

- Rewrite the Chinese Guide variant as natural, complete Chinese except approved protected terms.
- Declare a chapter vocabulary target list before authoring each Mixed chapter.
- Rewrite Mixed content from the Chinese base, retaining only declared targets or approved protected terms/proper nouns.
- Reject paired English/Chinese headings, sentences, duplicated paragraphs, random English retention, and split multiword targets.
- Preserve completed Guide/startup behavior, one-book/three-mode structure, and chapter-index preservation.

### Localization Phase 8

- Execute every applicable scenario in the coverage matrix across English/Chinese UI, Guide modes, imported EPUB modes, desktop/mobile/responsive layouts, dynamic feedback, keyboard use, and accessibility trees.
- Record evidence per acceptance ID in `docs/M2_EXECUTION_STATE.md`.
- Do not close M2 or mark localization rows `PASS` until their exact matrix evidence is present.

## Stop conditions

The autonomous run may stop and ask the user only when:

- Canonical docs conflict and no safe interpretation exists.
- A destructive migration is required.
- A secret/API/provider decision is required.
- An existing storage/database key would need renaming.
- A test fails and cannot be fixed within the current task scope.
- Required files are missing or corrupted.
- Environment permissions prevent all meaningful progress.
- Implementation would violate copyright/privacy rules.

Do not stop merely because:

- `git status` or `git diff` is unavailable.
- Browser automation is unavailable.
- A manual smoke step remains.
- One optional tool is unavailable.

For those cases:

- Continue all safe automated work.
- Record the limitation precisely.
- Leave manual criteria as `IMPLEMENTED_UNVERIFIED`.

## Evidence rules

For each phase, record in `docs/M2_EXECUTION_STATE.md`:

- files changed
- exact commands
- pass/fail
- acceptance IDs addressed
- manual smoke status
- remaining risks
- next phase

Localization evidence must additionally cite the relevant quality gate and surface row from `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md` and `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md`.

Do not claim `PASS` without evidence.

Acceptance status updates must be conservative:

- Use `NOT_STARTED` before work begins.
- Use `IN_PROGRESS` while a task is actively being implemented.
- Use `IMPLEMENTED_UNVERIFIED` when code exists but manual or full regression evidence is missing.
- Use `PASS` only with recorded automated and/or manual evidence matching the matrix row.
- Use `BLOCKED` only for a stop condition.
- Use `DEFERRED` only when explicitly accepted out of M2.

## Test commands

JS syntax:

```powershell
Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check $_.FullName }
```

Home state:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\homeState.test.mjs
```

Storage:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\storage.test.mjs
```

Level baseline:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\levelBaselineEngine.test.mjs
```

Navigation:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\navigationEngine.test.mjs
```

Vocabulary engine, only when Preview filtering or vocabulary matching changes:

```powershell
C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests\vocabEngine.test.mjs
```

Dataset check, only when data changes:

```powershell
python scripts\check_vocabulary_dataset.py
```

Manual browser smoke, when UI changes:

```powershell
python -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/pwa-reader/
```

Use `tests/fixtures/interleaf_smoke.epub` for imported EPUB regression smoke.

## Phase completion protocol

At the end of each phase:

1. Run required automated checks.
2. Run available browser smoke or record why it was not run.
3. Update `docs/M2_EXECUTION_STATE.md`.
4. Update `docs/M2_ACCEPTANCE_MATRIX.md` only when evidence supports a status change.
5. Continue to the next phase unless a stop condition applies.

## Final verdict

M2 may be CLOSED only if:

- all P0/P1 acceptance criteria pass
- no blocking regression exists
- manual-only gaps are either passed or explicitly accepted by the user
- docs reflect actual behavior
- Chinese UI completeness satisfies the frozen localization contract
- the built-in Guide Chinese variant is complete Chinese and its Mixed variant is Chinese-base, target-list-driven content with no paired bilingual text
- Chinese Reading Mode, Mixed Mode, and translation providers remain honestly labeled as Placeholder / Planned

If the final run cannot close M2, return the first blocking acceptance IDs, evidence collected, and the smallest next prompt needed.
