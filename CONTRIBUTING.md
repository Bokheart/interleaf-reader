# Contributing to Interleaf Reader

Thanks for helping improve Interleaf Reader. The project is early-stage, local-first, and reading-first: it helps non-native English readers stay inside English fiction and long-form EPUB reading while getting lightweight vocabulary support.

The current MVP is English Study Mode plus local EPUB import, Local Library, reading progress restore, Vocabulary Preview, and Vocabulary Library. Chinese Reading Mode, Mixed Mode, and real translation providers are planned placeholders. Please do not treat them as implemented features.

## Before Contributing

Please read these first:

- `README.md`
- `docs/INTERLEAF_READER_PRD.md`
- `docs/PROJECT_STATE.md`
- `docs/DECISION_LOG.md`
- `docs/AI_WORKFLOW_PROTOCOL.md`
- `docs/HANDOFF.md`
- `PRIVACY.md`

The short version:

- Interleaf Reader is a reading app, not a flashcard/drill app.
- It is local-first.
- EPUB import, English Study Mode, Local Library, Vocabulary Preview, and Vocabulary Library are the MVP paths to protect.
- Translation is future work and needs architecture/security decisions first.

## Contribution License

Interleaf Reader uses the Interleaf Reader Non-Commercial Community License, a custom source-available, non-commercial community license. By contributing, you agree that your contribution will be licensed under the project license unless otherwise agreed in writing. Please do not submit code, text, data, or assets unless you have the right to license them to the project.

Commercial use requires separate written permission. Opening an issue, pull request, fork, or discussion does not grant commercial permission. The commercial permission request process is documented in `docs/LICENSE_DECISION.md`; maintainer contact is still TBD.

## Good Contribution Types

Helpful contributions include:

- bug reports
- documentation fixes
- small UI polish
- focused tests
- vocabulary dataset improvements
- PWA/deployment work
- translation architecture discussion
- accessibility improvements
- mobile reading improvements

Keep contributions focused. One goal per pull request is much easier to review and safer for the reader.

GitHub issue templates are available for bug reports, feature requests, and documentation tasks. A pull request template is also available; use it to summarize scope, tests, privacy/security impact, copyright/source-material checks, and follow-up risks.

## What Not To Submit

Please do not submit:

- copyrighted EPUBs
- fanfiction exports
- paid books
- song lyrics
- copied dictionary entries
- bulk extracted PDF/book text
- private EPUB samples
- API keys
- secrets or tokens
- analytics, upload, or cloud-sync code without a prior decision
- translation provider integrations that expose keys in frontend code
- broad refactors without an issue or discussion
- features that turn Interleaf Reader into a flashcard/drill app

Interleaf Reader does not host copyrighted books, public translated works, or scraped AO3 content.

## Branch Naming

Use lowercase branch names with a short prefix:

- `docs/...`
- `fix/...`
- `feature/...`
- `polish/...`
- `test/...`
- `experiment/...`

Examples:

- `docs/privacy-link`
- `fix/chapter-navigation`
- `polish/mobile-reader-overlay`
- `test/storage-progress`

## Development Workflow

Recommended workflow:

1. Create one branch per task.
2. Keep changes small.
3. Prefer one goal per pull request.
4. Read the current PRD and handoff before changing behavior.
5. Update docs when behavior changes.
6. Update `docs/PROJECT_STATE.md` when project status changes.
7. Update `docs/DECISION_LOG.md` when a product or architecture decision changes.
8. Update `docs/HANDOFF.md` when implementation behavior changes.

For AI-assisted work, follow `docs/AI_WORKFLOW_PROTOCOL.md`.

## Local Setup

Run the app as a static site from the project root:

```powershell
cd "D:\BookHeart\slash reader\slash-reader-v2"
python -m http.server 5173
```

Open:

```text
http://localhost:5173/pwa-reader/
```

Serve from the project root, not directly from `pwa-reader/`, because the app fetches JSON from `data/`.

If `localhost` behaves oddly in a Windows/browser automation context, try:

```text
http://127.0.0.1:5173/pwa-reader/
```

## Smoke Test Fixture

Generate the copyright-safe smoke EPUB:

```powershell
python scripts\generate_smoke_epub.py
```

If plain `python` resolves incorrectly, use the bundled runtime documented in `README.md` / `docs/HANDOFF.md`.

The script writes:

```text
tests\fixtures\interleaf_smoke.epub
```

This fixture is self-authored and copyright-safe. It exists so browser smoke tests do not depend on private EPUBs or copyrighted samples. Do not commit private EPUB samples.

## Testing

Generate the smoke EPUB:

```powershell
python scripts\generate_smoke_epub.py
```

JavaScript syntax check:

```powershell
$node = "C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
Get-ChildItem -Path "pwa-reader" -Filter "*.js" | ForEach-Object { & $node --check $_.FullName }
```

Pure-logic tests:

```powershell
& $node tests\levelBaselineEngine.test.mjs
& $node tests\navigationEngine.test.mjs
& $node tests\vocabEngine.test.mjs
& $node tests\glossaryEngine.test.mjs
& $node tests\storage.test.mjs
& $node tests\homeState.test.mjs
```

Vocabulary dataset check:

```powershell
python scripts\check_vocabulary_dataset.py
```

If plain Python resolves incorrectly, use the bundled Python runtime documented in `README.md` / `docs/HANDOFF.md`.

## Manual Browser Checklist

For reader-facing changes, check the browser manually:

- import `tests\fixtures\interleaf_smoke.epub`
- confirm Reader opens
- confirm chapter navigation works
- confirm Vocabulary Preview appears
- confirm vocabulary bubble opens and closes
- confirm Known / Save / Hide actions work
- confirm Vocabulary Library opens
- confirm manual Add to Learning works
- confirm Copy Learning / Copy All / CSV export works
- confirm Local Library Open works
- confirm Forget modal works
- refresh and confirm Continue Reading restore works
- confirm Chinese Reading Mode remains a placeholder
- confirm Mixed Mode remains a placeholder
- check mobile viewport if the change affects layout or reader controls

## Documentation Rules

Use the docs this way:

- `docs/INTERLEAF_READER_PRD.md` is the product source of truth.
- `docs/HANDOFF.md` is the current implementation handoff.
- `docs/PROJECT_STATE.md` is the current milestone/status snapshot.
- `docs/DECISION_LOG.md` is the decision history.
- `docs/AI_WORKFLOW_PROTOCOL.md` is the agent/contributor workflow.
- `PRIVACY.md` describes the current MVP privacy posture.

If docs disagree, do not guess silently. Update the right document or call out the drift.

## Privacy and Security Rules

Do not put API keys, secrets, or tokens in frontend code or committed files.

Do not add analytics, upload flows, cloud sync, translation provider calls, or API key storage without:

- a prior product/architecture decision
- an update to `PRIVACY.md`
- an update to `docs/DECISION_LOG.md`

Optional modules must fail open. Vocabulary personalization, translation, glossary enrichment, and future providers must not block:

- app startup
- EPUB import
- first chapter render
- English Study Mode reading

Translation provider data flow must be documented before implementation.

## Vocabulary and Data Rules

Vocabulary/data contributions should be small, curated, and source-safe.

Do:

- keep entries compact
- use original wording
- include only data that is safe to ship
- run `python scripts\check_vocabulary_dataset.py` after dataset changes

Do not:

- copy dictionary definitions
- copy examples from books, lyrics, fanfiction, or paid sources
- bulk extract text from PDFs or books into app datasets
- mutate global vocabulary datasets from runtime user actions

User vocabulary personalization belongs in the local IndexedDB profile, not in shared JSON datasets.

## Pull Request Expectations

Use `.github/pull_request_template.md` when opening a pull request. A useful pull request should include:

- summary of the change
- files changed
- screenshots for UI changes
- exact tests/checks run
- manual browser result if relevant
- docs updated
- what was not implemented
- any risks or follow-up tasks

If a change touches user-visible behavior, update docs before asking for review.

## Code Style and Architecture Guardrails

- Keep existing module boundaries.
- Avoid growing `pwa-reader/app.js` unless the UI controller truly owns the behavior.
- Prefer pure helpers for testable logic.
- Preserve IndexedDB and `localStorage` compatibility names unless a migration is explicitly planned.
- Do not casually rename internal compatibility values such as `cloze-mixed` or `clozeHtml`.
- Do not rename debug globals such as `window.__slashReaderDebug`.
- Do not regress English Study Mode.
- Do not regress EPUB import.
- Do not regress Local Library.
- Do not regress Vocabulary Preview, underlines, bubbles, Known / Save / Hide, or Vocabulary Library.

When in doubt, make the smaller change and document the remaining follow-up.
