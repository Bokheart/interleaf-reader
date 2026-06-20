# M2 Help, Guide, and UI Language Specification

> **R0 status:** Retained design reference only. M2 remains unresolved and is not formally closed. Historical M2 harness, acceptance, runbook, and execution-state files are archived under `docs/archive/milestones/`; they are not current instructions or sources of truth. Current AI instructions are in `AGENTS.md`, current implementation truth is in `docs/PROJECT_STATE.md`, and milestone control is in `docs/MILESTONES.md`.

## 3.1 Purpose

This child spec defines the M2 help, guide, and UI language work for the approved product model.

M2 support has four layers:

1. Built-in Guide Book for first-use onboarding.
2. Settings -> Help Center for long-term access.
3. Reader contextual help through a small circular `?` button.
4. Chinese / English interface-language system.

Functional completion is the M2 priority. Visual polish and final styling are not M2 blockers unless usability or accessibility is broken.

## 3.2 Product language model

### Interface Language

Controls app UI, buttons, labels, feedback, dialogs, Help Center, and contextual help.

Options:

- 中文
- English

Rules:

- Interface Language controls UI text only.
- Changing Interface Language must not change Guide content or Reading Mode.

### Reading Mode

Controls book content for the current book, including the built-in Interleaf Reader Guide.

Options:

- English Study (`english-study`)
- Chinese Reading Mode (`chinese`)
- Mixed Mode (`cloze-mixed`)

Rules:

- Reading Mode controls how the current book is rendered.
- For imported EPUBs, Chinese Reading Mode and Mixed Mode remain placeholders until a translation provider exists.
- Only the built-in Guide may render pre-authored Chinese and mixed content without a translation provider.

### Built-in Guide content variants

The built-in Interleaf Reader Guide behaves like one virtual EPUB with three pre-authored content variants exposed through Reading Mode:

- `english-study` → fully English Guide content
- `chinese` → fully Chinese Guide content
- `cloze-mixed` → mixed Chinese-English Guide content

Rules:

- The Guide is one virtual book whose chapters expose mode-specific content variants.
- There is no separate user-facing Guide Version selector.
- Switching Reading Mode while the Guide is open must preserve the current Guide chapter index.
- Legacy `guideVersion` preference fields may remain stored for compatibility but must not control Guide content.
- Do not rename existing IndexedDB names, localStorage keys, `cloze-mixed`, or `clozeHtml`.
- Do not perform a destructive preference migration.

## 3.3 First-run language selection

On first use, before normal Home interaction, show a minimal bilingual language choice.

Copy:

- Choose interface language
- 选择界面语言

Choices:

- 中文
- English

Browser language may preselect a choice but must not silently lock it. Save the selected interface language locally. The user can change it later in Settings.

Imported book titles, authors, and book content are not translated by the UI language system.

## 3.4 Localization scope

M2 core surfaces that must support 中文 / English:

- Home
- import area and normal import feedback
- Continue Reading / Resume
- Local Library
- built-in Guide card
- Reader chrome
- Contents
- Progress
- Preview
- Mode
- Vocabulary Library
- Vocabulary Level help
- Settings
- Help Center
- contextual help
- Hide/restore Guide confirmation and feedback
- TXT export and Backup/Restore feedback when implemented
- normal empty/error states used by these M2 flows

Explicit exemptions:

- Developer diagnostics may remain English in M2.
- Imported EPUB metadata and content are not translated.
- Internal IDs and compatibility names remain unchanged.

Require a key-based translation system, not duplicate HTML pages.

Suggested implementation shape:

- `pwa-reader/i18n.js`
- `pwa-reader/locales/en.js`
- `pwa-reader/locales/zh-CN.js`

Do not require an external i18n dependency.

## 3.5 App preferences model

M2 may introduce a separate local app-preferences concept. It is not the vocabulary profile and not book progress.

Minimum preference fields:

- `uiLanguage: "en" or "zh-CN"`
- `hasChosenUiLanguage: boolean`
- `guideVisibleInLibrary: boolean`
- `guideVersion: "english" | "chinese" | "bilingual"` (legacy compatibility only; ignored for Guide rendering)

Rules:

- Default `guideVisibleInLibrary` is `true`.
- `guideVersion` and `hasChosenGuideVersion` may remain stored for compatibility but must not control built-in Guide content.
- Changing Interface Language must not overwrite Reading Mode or Guide content selection.
- Hiding the Guide does not delete Guide content or its saved preference.
- Do not rename existing storage keys or database names.
- A new namespaced app-preferences record may be introduced through the existing storage boundary.

## 3.6 Settings information architecture

For M2 functional implementation, use a standalone Settings app view consistent with the current Home / Reader / Vocabulary Library view model.

Minimum Settings sections:

Language / 语言:

- Interface Language
- 中文
- English

Help / 帮助:

- Open Interleaf Reader Guide
- Show Guide in Library toggle/action
- Help Center

Storage and status:

- local-only storage explanation
- no account or cloud sync
- feature status:
  - English Study implemented
  - Chinese Reading Mode placeholder
  - Mixed Mode placeholder
  - translation providers not implemented

Settings must have a clear Back to Home action.

Do not design fonts, animation, decorative styling, or final visual polish in this spec.

## 3.7 Guide visibility lifecycle

Default:

- Guide appears in Local Library.

User action:

- Use "Hide from Library" / "从书库隐藏".
- Do not use Delete Guide or Forget Guide.

Confirmation:

- Explain that the Guide can still be opened or restored from Settings -> Help Center.

Hidden state:

- Guide card disappears from Local Library.
- Guide is not deleted.
- Guide is still directly openable from Help Center.
- "Show Guide in Library" restores the card.

The Guide must never use the user EPUB Forget/delete path.

## 3.8 Help Center

Help Center lives inside Settings for M2.

Minimum categories:

- Getting Started / 开始使用
- Reading / 阅读
- Vocabulary / 词汇
- Storage / 存储
- Feature Status / 功能状态

Minimum actions:

- Open full Guide Book
- Show/restore Guide in Library

Questions should be concise and localized through the UI language system.

Do not duplicate the full Guide text inside Help Center.

## 3.9 Reader contextual help

Add a small circular `?` control at the bottom-right of the Reader bar.

Requirements:

- No visible text label beside the icon.
- Accessible hit target of approximately 44 x 44 CSS pixels.
- Localized aria-label:
  - Reader help
  - 阅读帮助
- Must not cover Reader text or Mode controls.
- Opens a simple sheet/dialog/panel.
- Content follows selected Interface Language.
- Help content should reflect the current context where practical:
  - general Reader
  - Contents
  - Progress
  - Preview
  - Mode
- Include actions:
  - Open Help Center
  - Open Guide Book

Clarify:

- Progress slider changes chapters, not paragraph position.
- Preview explains current vocabulary support.
- Chinese Reading Mode and Mixed Mode remain placeholders.

## 3.10 Guide content redesign

Keep the Guide as a virtual built-in book.

Expand it to at least six instructional chapters:

1. Welcome to Interleaf Reader / 欢迎使用
2. Your First Book / 阅读第一本书
3. Reader Tools / 阅读工具
4. Vocabulary Support / 词汇辅助
5. Level, Export and Backup / 等级、导出与备份
6. Local-first and Future Features / 本地优先与未来功能

Content requirements:

- English, Chinese, and mixed pre-authored variants match in meaning.
- Use self-authored instructional content only.
- Include clear actions for users to try.
- Include a small number of existing vocabulary-dataset terms so Preview/bubble can demonstrate real behavior.
- Do not copy dictionary definitions, copyrighted books, or third-party guide text.
- Explain that Reading Mode controls built-in Guide content variants for the Guide only.
- Explain that Interface Language controls UI text only.
- Explain how to reopen the Guide after hiding it.
- Avoid claiming pending features are implemented.

## 3.11 Out of scope

M2 explicitly excludes:

- visual redesign or aesthetic polish
- real Chinese Reading Mode
- real Mixed Mode
- translation provider integration
- API keys
- backend
- cloud sync
- accounts
- external Help service
- analytics
- onboarding telemetry
- new large dependencies
- storage/database renames
- real EPUB generation for the Guide

## 3.12 Affected file map

| Work area | Likely files | Risk | Notes |
|---|---|---|---|
| i18n foundation | `pwa-reader/i18n.js`, `pwa-reader/locales/en.js`, `pwa-reader/locales/zh-CN.js`, `pwa-reader/app.js`, `pwa-reader/index.html`, tests | High | Core UI labels and startup behavior. |
| first-run language choice | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, storage helper only if justified, tests | Medium | Must not block import/render after choice is saved. |
| Settings | `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, storage helper only if justified, tests | Medium | New app view and preferences state. |
| Guide hide/restore | `pwa-reader/app.js`, `pwa-reader/index.html`, `pwa-reader/styles.css`, `pwa-reader/guideBook.js`, tests | Medium | Must not use user EPUB Forget/delete. |
| Help Center | `pwa-reader/app.js`, `pwa-reader/index.html`, `pwa-reader/styles.css`, i18n files, tests | Medium | Localized categories and Guide actions. |
| contextual help | `pwa-reader/app.js`, `pwa-reader/index.html`, `pwa-reader/styles.css`, i18n files, tests | Medium | Must not cover Reader text or Mode controls. |
| Guide content expansion | `pwa-reader/guideBook.js`, `tests/navigationEngine.test.mjs`, `tests/vocabEngine.test.mjs` if matching changes | Low/Medium | Content and chapter structure. |
| tests | `tests/homeState.test.mjs`, `tests/storage.test.mjs`, `tests/navigationEngine.test.mjs`, `tests/vocabEngine.test.mjs` as relevant | Medium | Evidence must map to acceptance IDs. |
| documentation sync | user guides, `docs/PROJECT_STATE.md`, `docs/HANDOFF.md`, acceptance/execution files | Low | Must describe actual behavior only. |

## 3.13 Subagent boundaries

Run these agents sequentially unless a controller proves they do not touch shared files.

### 1. i18n Foundation Agent

- Goal: create key-based UI translation foundation and first-run language choice.
- Historical allowed-file record: `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, new i18n/locales files, and relevant tests. Any current status update belongs in `docs/PROJECT_STATE.md`; the archived M2 execution and acceptance records must not be resumed as active control files.
- Forbidden files: `data/**`, provider code, package/dependency files, storage key/database renames.
- Required tests: JS syntax, `tests/homeState.test.mjs`, storage test if preferences storage changes.
- Acceptance IDs: `LANG-001` through `LANG-007`, `HARNESS-003`.
- Stop conditions: implementing the foundation would require duplicating the app HTML or renaming existing storage/database keys.

### 2. Settings + Preferences Agent

- Goal: add Settings view and app preferences separate from vocabulary profile and book progress.
- Allowed files: `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, storage helper only if justified, relevant tests, execution/acceptance docs.
- Forbidden files: provider code, account/cloud/backend logic, storage/database renames.
- Required tests: JS syntax, `tests/homeState.test.mjs`, `tests/storage.test.mjs` if storage helpers change.
- Acceptance IDs: `SETTINGS-001` through `SETTINGS-003`, `LANG-003`.
- Stop conditions: preference storage requires destructive migration or conflicts with existing storage boundary.

### 3. Guide Visibility + Help Center Agent

- Goal: implement Hide from Library, Show Guide in Library, and Settings Help Center access.
- Allowed files: `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `pwa-reader/guideBook.js`, i18n files, relevant tests, execution/acceptance docs.
- Forbidden files: user EPUB Forget/delete reuse for Guide, IndexedDB EPUB blob storage for Guide, provider/account/cloud logic.
- Required tests: JS syntax, `tests/homeState.test.mjs`, `tests/navigationEngine.test.mjs` if Reader-opening behavior changes.
- Acceptance IDs: `GUIDE-001` through `GUIDE-005`, `HELP-001` through `HELP-004`.
- Stop conditions: implementation would make the Guide deletable through normal user-book deletion.

### 4. Reader Contextual Help Agent

- Goal: add localized circular Reader `?` contextual help with Help Center and Guide actions.
- Allowed files: `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, i18n files, relevant tests, execution/acceptance docs.
- Forbidden files: provider integrations, analytics, onboarding telemetry, visual redesign.
- Required tests: JS syntax, `tests/homeState.test.mjs`; manual smoke for Reader bar placement.
- Acceptance IDs: `CONTEXT-001` through `CONTEXT-006`, `HELP-004`.
- Stop conditions: the help control cannot be placed without blocking Reader text or existing Mode controls.

### 5. Guide Content Expansion Agent

- Goal: expand virtual Guide to at least six instructional chapters with English, Chinese, and mixed content variants on one virtual book.
- Allowed files: `pwa-reader/guideBook.js`, relevant tests, user guides only if explicitly tasked, execution/acceptance docs.
- Forbidden files: copyrighted text, copied dictionary definitions, provider-generated translations, data changes.
- Required tests: JS syntax, `tests/navigationEngine.test.mjs`; `tests/vocabEngine.test.mjs` if vocabulary matching changes.
- Acceptance IDs: `GUIDE-006`, `GUIDE-007`, `REGRESSION-002` through `REGRESSION-006`.
- Stop conditions: requested content would require copyrighted source text or third-party guide text.

### 6. TXT Export Agent

- Goal: add 不背单词 TXT export for Learning words only.
- Allowed files: `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, relevant tests, execution/acceptance docs.
- Forbidden files: external APIs, login/sync/upload, book context export, provider code.
- Required tests: JS syntax, `tests/homeState.test.mjs`.
- Acceptance IDs: `TXT-001` through `TXT-005`.
- Stop conditions: implementation would export definitions, examples, source sentences, or book text.

### 7. Profile Backup / Restore Agent

- Goal: add vocabulary profile JSON Backup / Restore using allowed fields only.
- Allowed files: `pwa-reader/index.html`, `pwa-reader/app.js`, `pwa-reader/styles.css`, `pwa-reader/storage.js` only if justified, relevant tests, execution/acceptance docs.
- Forbidden files: EPUB blob backup, Local Library file backup, reading progress backup, cloud/account/backend/sync logic.
- Required tests: JS syntax, `tests/homeState.test.mjs`, `tests/storage.test.mjs`.
- Acceptance IDs: `BACKUP-001` through `BACKUP-006`.
- Stop conditions: implementation requires storage/database rename or destructive migration.

### 8. Final Reviewer + Docs Sync Agent

- Goal: verify M2 acceptance, run regression checks, update docs to actual behavior, and produce closeout verdict.
- Allowed files: docs/status/user guides as explicitly scoped, relevant tests if fixes are required, execution/acceptance docs.
- Forbidden files: product scope expansion, provider/cloud/account work, unrelated refactors.
- Required tests: all relevant M2 commands and manual smoke where possible.
- Acceptance IDs: `REGRESSION-001` through `REGRESSION-011`, `DOCS-001` through `DOCS-003`, all remaining P0/P1 IDs.
- Stop conditions: P0/P1 acceptance cannot pass and no focused in-scope fix is available.
