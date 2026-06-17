# Interleaf Reader Agent Instructions

## 1. Product identity

- Product name: Interleaf Reader
- Former codename: Slash Reader v2
- Internal brand: BookHeart
- Interleaf Reader is a local-first English fiction / long-form EPUB reading PWA for non-native English readers.
- It is reading-first.
- Vocabulary and future translation support immersive reading.
- It is not a vocabulary memorization app, generic translator, social reading platform, public translation library, or AO3 scraper.

## 2. Required reading order

For major work, read in this order:

1. `docs/INTERLEAF_READER_PRD.md`
2. `docs/PROJECT_STATE.md`
3. `docs/DECISION_LOG.md`
4. `docs/HANDOFF.md`
5. `docs/AI_WORKFLOW_PROTOCOL.md`
6. Task-specific files

For small docs-only tasks, read only the files named in the user prompt plus `docs/PROJECT_STATE.md` if status changes.

## 3. Current MVP boundary

Current MVP / implemented main path:

- English Study Mode
- EPUB import
- chapter navigation
- Home / Reader / Vocabulary Library views
- Local Library
- IndexedDB local persistence
- scroll progress restore
- mobile reader overlay
- Vocabulary Preview
- underlined vocabulary terms
- vocabulary bubble
- Known / Save / Hide actions
- manual vocabulary add
- Copy Learning / Copy All / CSV export

Placeholder / planned:

- Chinese Reading Mode is placeholder only
- Mixed Mode is placeholder only
- Translation providers are not implemented
- DeepL is not integrated
- full PWA installability is not complete yet
- GitHub Pages deployment is planned

## 4. Hard rules

Never:

- Put API keys or secrets in frontend code.
- Implement DeepL or any paid translation provider directly in the browser with exposed keys.
- Add analytics, upload flows, cloud sync, provider calls, or API key storage without updating `PRIVACY.md` and `docs/DECISION_LOG.md`.
- Commit copyrighted EPUBs, fanfiction exports, lyrics, copied dictionary entries, bulk extracted book/PDF/dictionary text, or private test files.
- Rename IndexedDB database names, localStorage keys, debug globals, `cloze-mixed`, or `clozeHtml` without an explicit migration task.
- Claim Chinese Reading Mode, Mixed Mode, or Translation Providers are implemented when they are placeholders/planned.
- Turn the project into a flashcard/drill app.
- Do broad refactors unless explicitly requested.

Always:

- Keep EPUB import and chapter rendering fail-open and stable.
- Lazy-load optional modules when possible.
- Preserve local-first behavior.
- Keep changes small and scoped.
- Update docs when behavior, status, or decisions change.

## 5. Task discipline

Use one task per session.

Before editing, identify:

- goal
- allowed files
- forbidden files
- what is not being implemented
- tests/checks to run

Do not "also" implement nearby features.

If the task is ambiguous, ask for clarification or choose the smallest safe interpretation.

## 6. Recommended model / effort levels

Use low effort for:

- docs-only edits
- README / PROJECT_STATE / HANDOFF updates
- issue templates
- PR templates
- copy-only changes

Use medium effort for:

- small bugfixes
- small UI behavior fixes
- small storage helper changes
- tests around existing modules

Use high effort for:

- IndexedDB migrations
- PWA manifest/service worker
- GitHub Pages deployment
- translation provider architecture
- cross-module behavior changes
- startup/import/render regressions

Avoid very high effort unless the user explicitly asks for a complex architecture or recovery task.

## 7. Token-saving rules

Prefer targeted reads over broad repo scans.

Do not read `source_materials/`, `generated/`, or large artifacts unless explicitly needed.

Do not repeat PRD content in responses. Summarize only what changed.

Use `PROJECT_STATE.md` for current progress instead of rediscovering the whole project.

For docs-only tasks, do not run full app tests.

## 8. Testing rules

If JavaScript changes:

- run syntax check for `pwa-reader/*.js`

If a pure module changes:

- run the relevant Node test

Common tests:

- `tests/levelBaselineEngine.test.mjs`
- `tests/navigationEngine.test.mjs`
- `tests/vocabEngine.test.mjs`
- `tests/glossaryEngine.test.mjs`
- `tests/storage.test.mjs`
- `tests/homeState.test.mjs`

Vocabulary dataset:

- run `scripts/check_vocabulary_dataset.py` only if vocabulary data or dataset scripts change

Browser smoke:

- use `tests/fixtures/interleaf_smoke.epub`
- verify import, chapter navigation, Vocabulary Preview, bubble, Vocabulary Library, Local Library restore, Forget modal, and placeholders

## 9. Documentation update rules

Update `docs/PROJECT_STATE.md` when:

- phase changes
- active task changes
- release-readiness status changes
- major implementation status changes

Update `docs/DECISION_LOG.md` when:

- product direction changes
- license/security/privacy decisions change
- architecture decisions change

Update `docs/HANDOFF.md` when:

- app behavior changes
- testing workflow changes
- implementation caveats change

Update `README.md` only for user-facing project entry information.

## 10. Standard response format

Return concise summaries using:

A. What changed
B. Behavior / decision summary
C. What was tested
D. What was not implemented
E. Docs updated
F. Recommended next prompt

For documentation-only tasks, say that no app tests were required.

## 11. Licensing and contribution guardrails

The project license direction is custom non-commercial community/source-available licensing.

Commercial use requires separate permission.

Contributions are expected to be licensed under the same project license unless otherwise stated.

Do not describe the project as MIT-licensed unless a final LICENSE explicitly says so.

Do not call it OSI-open-source if the final license is non-commercial/source-available.
