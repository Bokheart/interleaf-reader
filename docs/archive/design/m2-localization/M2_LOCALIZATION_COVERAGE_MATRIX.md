# M2 Localization Coverage Matrix

Status: current-state audit; no row in this document is an acceptance `PASS`.  
Date: 2026-06-20  
Companion contract: `docs/M2_LOCALIZATION_AND_CONTENT_SPEC.md`

## 1. Classification legend

Every row uses one of the required primary classifications:

- **LOCALIZE** — localize to Chinese.
- **PRODUCT/TECH TOKEN** — preserve as an approved product or technical token.
- **IMPORTED CONTENT** — preserve because it is imported user content.
- **TARGET VOCABULARY** — preserve because it is declared Mixed target vocabulary.
- **DEVELOPER-ONLY** — must not be user-facing.

Current-audit values are `COVERED`, `PARTIAL`, `GAP`, `VIOLATION`, and `DEV-BOUNDARY`. They describe audit state only and are not acceptance statuses.

## 2. Surface coverage audit

| Surface | Visible string or string group | Primary classification | Chinese contract | Current implementation audit | Proposed key group / action | Verification |
|---|---|---|---|---|---|---|
| First-run language chooser | Product eyebrow `Interleaf Reader` | PRODUCT/TECH TOKEN | Preserve exactly. | COVERED | Existing `app.name` or protected token. | Browser visual + accessible-name inspection. |
| First-run language chooser | “Choose interface language” / “选择界面语言” | LOCALIZE | The pre-choice surface is intentionally bilingual. | PARTIAL: visible bilingual copy exists; Chinese key for the English title remains English by design. | Document bilingual exception; add a bilingual accessible-name key. | Test both browser-language preselection cases. |
| First-run language chooser | Choice labels `English`, `中文` | PRODUCT/TECH TOKEN | Preserve self-names. | COVERED | No translation required. | Browser selection and persistence. |
| First-run language chooser | “You can change this later in Settings.” | LOCALIZE | Complete Chinese sentence after Chinese preselection/choice. | PARTIAL: keyed and translated. | Keep `languageGate.note`; review visible language before commitment. | Browser with English and Chinese browser preference. |
| First-run language chooser | Language-choice group `aria-label` | LOCALIZE | Bilingual before commitment; localized after selection if still present. | GAP: hard-coded English in `index.html`. | `languageGate.choicesAria`. | Accessibility tree inspection. |
| Home | Product title and tagline | LOCALIZE | Preserve `Interleaf Reader`; localize the tagline, including “English Study” as 英语学习 in explanatory prose. | PARTIAL: keyed; Chinese tagline retains English mode label. | Review `app.tagline`. | Switch language while Home is visible. |
| Home | Page title, Settings action | LOCALIZE | Fully Chinese on Chinese UI. | COVERED structurally; existing keys present. | Existing `home.title`, `settings.open`. | Browser switch without reload. |
| Import area | Import heading, description, drop-zone labels, waiting status | LOCALIZE | Localize sentence frames; preserve `EPUB`. | COVERED structurally; existing keys present. | Existing `home.import.*`; copy review. | English/Chinese Home smoke. |
| Import feedback | No file, empty file, invalid extension, loading, loaded, save failure, no chapters, import failure | LOCALIZE | Complete, calm, actionable messages; preserve filename/`EPUB` parameters. | GAP: hard-coded English in `app.js`. | `import.feedback.noFile`, `.empty`, `.invalidExtension`, `.loading`, `.loaded`, `.saveFailed`, `.noChapters`, `.failed`. | Trigger every normal validation/outcome path. |
| Import error details | Raw cause name/message appended to normal error | DEVELOPER-ONLY | Log only; never append to normal user-facing error. | VIOLATION: `getUserFacingImportError` can expose raw causes. | Separate localized user message from diagnostic log. | Malformed EPUB browser test. |
| Import diagnostics boundary | “EPUB import diagnostics”, File/Size/Type/Extension/Current step/Last error | DEVELOPER-ONLY | Not visible in normal product flow; may exist only in explicit developer mode. | DEV-BOUNDARY: visible collapsible panel in normal DOM. | Gate or remove from normal UI. | Confirm absent/inert in production user flow. |
| Import diagnostics boundary | `epub.js`, `JSZip`, `ArrayBuffer`, metadata, spine, raw error class | DEVELOPER-ONLY | Developer mode only. | VIOLATION in current normal diagnostics panel. | No locale keys; enforce developer-only boundary. | Production DOM/accessibility-tree inspection. |
| Continue Reading | Heading, hint, action, dismiss | LOCALIZE | Fully Chinese on Chinese UI. | COVERED structurally; existing keys present. | Existing `home.continue.*`. | Saved-book refresh smoke. |
| Continue Reading | Saved-book fallback/status frame and chapter count | LOCALIZE | Localize frame/count; preserve injected title/author. | GAP: hard-coded English in HTML/`app.js`. | `home.continue.savedBook`, `.savedLocal`, `.chapters`, `.details`. | Browser with and without metadata. |
| Continue Reading | Imported title and author parameters | IMPORTED CONTENT | Preserve exactly. | COVERED behaviorally. | Parameterize localized frames without transforming values. | Compare imported metadata before/after UI switch. |
| Resume current session | Title, hint, action, “Current book”, “No chapter loaded” | LOCALIZE | Fully Chinese on Chinese UI. | GAP: hard-coded English in HTML and `HOME_ENTRY_COPY`. | `home.resume.title`, `.hint`, `.action`, `.currentBook`, `.noChapter`. | Switch language while resume card is visible. |
| Home Vocabulary summary | “Vocabulary Library”, hint, View words | LOCALIZE | 词汇库 and Chinese actions. | PARTIAL: keys exist, but Chinese title remains English. | Review `home.vocabulary.*`. | Chinese Home smoke. |
| Home Vocabulary summary | Learning/Mastered/Hidden, Level display, counts group `aria-label` | LOCALIZE | Localize status labels/group name; preserve `Level 1`–`Level 5`. | GAP: hard-coded English labels and aria-label. | `vocabulary.status.*`, `vocabulary.summary.countsAria`, `vocabulary.level.display`. | Browser + accessibility tree. |
| Home Vocabulary summary | Empty, active, unavailable messages | LOCALIZE | Complete Chinese live/status copy. | GAP: hard-coded in `app.js`. | `vocabulary.summary.empty`, `.active`, `.unavailable`. | Empty/non-empty/storage-error states. |
| Local Library | Heading, hint, empty state, Open, Forget | LOCALIZE | 本地书库 and Chinese actions; preserve `EPUB`. | PARTIAL: keyed; Chinese heading currently retains `Local Library`. | Review `home.library.*`. | Empty and populated library smoke. |
| Local Library | User book title, author, filename, chapter title | IMPORTED CONTENT | Preserve exactly. | COVERED behaviorally. | Keep values as parameters/content. | Switch UI language and compare DOM text. |
| Local Library | “Untitled book”, “Unknown author”, “Last read {date}”, progress frame | LOCALIZE | Localize fallbacks/frame/date formatting. | GAP: hard-coded English and browser-default date locale. | `library.untitled`, `.unknownAuthor`, `.lastRead`, `.progress`; locale-aware formatter. | Metadata edge cases and both languages. |
| Built-in Guide card | Official title `Interleaf Reader Guide`, author `BookHeart` | PRODUCT/TECH TOKEN | Preserve official title/author. | COVERED. | Protected product metadata. | Verify unchanged after UI/mode switches. |
| Built-in Guide card | Badge, progress descriptor, note, Open, Hide from Library | LOCALIZE | Fully Chinese surrounding UI. | PARTIAL: keyed; Chinese note retains `Reader`; actions keyed. | Review `home.guide.*`, `guide.hide`. | Home in both languages. |
| Built-in Guide content | English variant chapter titles/body | LOCALIZE | Reading Content is fully English; selected only by `english-study`. | COVERED by mode shape; editorial review still required. | Content audit, not UI keying. | Guide truth table in browser. |
| Built-in Guide content | Chinese variant chapter titles/body | LOCALIZE | Reading Content is fully Chinese except protected tokens/proper names. | PARTIAL: Chinese-base text exists but retains many unapproved English feature labels and developer terms. | Editorial rewrite under `CONTENT-001`. | Chinese mode browser/editorial review. |
| Built-in Guide content | Mixed variant target terms | TARGET VOCABULARY | Only chapter-declared targets remain English. | VIOLATION: no explicit target lists; current content is paired bilingual. | Add editorial target manifests before rewrite. | Automated English-span-to-target-list audit. |
| Built-in Guide content | Product/file tokens inside Guide (`Interleaf Reader`, `BookHeart`, `EPUB`, `TXT`, `CSV`, `JSON`, `IELTS`, Levels) | PRODUCT/TECH TOKEN | Preserve exact token; localize surrounding prose. | PARTIAL: tokens present, but surrounding prose includes unapproved English/developer language. | Apply preservation taxonomy. | Editorial protected-token scan. |
| Reader chrome | Back/Home, saved-local status, Forget saved book | LOCALIZE | Fully Chinese frames/actions; preserve injected book title. | PARTIAL: Back keyed; other copy hard-coded. | `reader.home`, `reader.saved.*`. | Open imported book and switch UI language. |
| Reader chrome | Top title/chapter title parameters | IMPORTED CONTENT | Preserve imported values; Guide chapter title follows Reading Mode. | COVERED behaviorally. | Keep parameter/content boundary. | Imported and Guide comparison. |
| Reader chrome | Reader quick controls group, workspace, mobile-tools group `aria-label`s | LOCALIZE | Complete Chinese accessibility names. | GAP: hard-coded English. | `reader.aria.quickControls`, `.workspace`, `.mobileTools`. | Accessibility tree desktop/mobile. |
| Reader chrome | Previous/Next Chapter, Back to Top, scroll instruction | LOCALIZE | Fully Chinese. | GAP: hard-coded English. | `reader.navigation.previous`, `.next`, `.top`, `.scrollHint`. | Desktop and bottom controls. |
| Contents | Contents/Chapters headings, Close, table-of-contents/list labels | LOCALIZE | 目录/章节 and localized accessible names. | PARTIAL: quick control keyed; panels/headings/aria hard-coded. | `reader.contents.*`. | Desktop sidebar and mobile sheet. |
| Contents | No book/no chapters/import-to-see-chapters/fallback selector | LOCALIZE | Complete Chinese empty/fallback states. | GAP: hard-coded in HTML/`app.js`. | `reader.contents.empty.*`, `.selectorAria`. | No-book, malformed-book, loaded-book states. |
| Contents | Imported chapter titles | IMPORTED CONTENT | Preserve exactly. | COVERED behaviorally. | No translation key. | Switch UI language with Contents open. |
| Progress | Progress heading, Close, Previous/Next, chapter-controls group | LOCALIZE | Fully Chinese including accessibility names. | PARTIAL: quick control keyed; sheet content hard-coded. | `reader.progress.*`. | Mobile/tap Progress sheet. |
| Progress | “No chapter loaded”, “Chapter {n}: {title}”, “Choose a chapter” | LOCALIZE | Localize frame; preserve imported/Guide title parameter. | GAP: hard-coded English. | `reader.progress.noChapter`, `.preview`, `.choose`. | Empty and loaded states. |
| Progress | Numeric position `{current} / {total}` and percentage | PRODUCT/TECH TOKEN | Preserve digits/separators; localize any surrounding words. | COVERED for bare numeric display. | Formatting helper. | Both languages. |
| Vocabulary Preview (production) | Heading, quick/mobile label, term count, Close | LOCALIZE | 词汇预览 and localized singular/plural/count frame. | PARTIAL: one quick key exists; headings and generated count hard-coded. | `preview.title`, `.close`, `.count`. | 0/1/many terms, desktop/mobile. |
| Vocabulary Preview (production) | Empty/load/render/failure states | LOCALIZE | Complete Chinese and no developer instructions. | GAP: hard-coded English; one error tells users to inspect data folder. | `preview.empty.*`, `.unavailable`, `.loadFailed`. | No chapter, no matches, render error, dataset error. |
| Vocabulary Preview (production) | Known/Save/Saved/Hide and action-group accessible names | LOCALIZE | Localize actions and generated accessible frame; preserve term parameter. | GAP: hard-coded generated English. | `vocabulary.action.*`, `preview.actionsAria`. | Each action/state with screen reader. |
| Vocabulary Preview (production) | Vocabulary headwords and phrases | TARGET VOCABULARY | Preserve vocabulary term exactly. | COVERED behaviorally. | Parameter/content, not UI translation. | Compare dataset term text. |
| Vocabulary Preview (design lab) | Title, instructions, filters, tips, legends, actions, empty state | LOCALIZE | Localize if this prototype remains an acceptance surface. | GAP: complete prototype UI is hard-coded English. | A dedicated prototype locale layer or exclude it from product acceptance. | Design-lab browser review. |
| Vocabulary Preview (design lab) | Sample headwords, meanings, definitions, quotation | TARGET VOCABULARY | Preserve declared headwords/phrases; other sample content follows the prototype content brief, not Interface Language. | PARTIAL: content is mixed by design but no classification metadata exists. | Mark sample content vs interface explicitly. | Editorial review. |
| Vocabulary Preview (design lab) | Back/Close/Hide meanings/status/pronunciation/passage/filter aria-labels | LOCALIZE | Complete Chinese accessibility names. | GAP: all hard-coded English. | `previewLab.aria.*` if retained. | Accessibility tree. |
| Vocabulary bubble | Dialog name, Close, Chinese/English/IELTS usage labels | LOCALIZE | Localize labels; preserve `IELTS`. | GAP: hard-coded in HTML/`app.js`. | `vocabBubble.aria`, `.close`, `.chinese`, `.english`, `.ieltsUsage`. | Open bubble in both languages. |
| Vocabulary bubble | Headword, definitions, usage values | TARGET VOCABULARY | Preserve term and authored vocabulary content; do not translate because UI language changed. | COVERED behaviorally. | Content fields remain unchanged. | Switch language with same term. |
| Mode | Reading Mode heading and three display labels | LOCALIZE | 阅读模式 / 英语学习 / 中文阅读 / 混合阅读. | PARTIAL: keys exist for some controls; Chinese locale retains English labels; generated labels hard-coded. | Review `reader.mode.*`; key dynamic/compact labels. | All mode controls desktop/mobile/tap. |
| Mode | `english-study`, `chinese`, `cloze-mixed` values | DEVELOPER-ONLY | Never visible or spoken. | COVERED currently as internal DOM values. | Keep internal. | DOM/accessibility inspection. |
| Mode | Imported Chinese/Mixed placeholder headings/body/errors | LOCALIZE | Complete Interface-Language copy; clearly state unavailable for imported books. | GAP: placeholder generation is outside locale flow. | `reader.mode.placeholder.chinese.*`, `.mixed.*`. | Imported EPUB in both UI languages and all modes. |
| Vocabulary Library | Page eyebrow/title/subtitle/local-only explanation/Back Home | LOCALIZE | Fully Chinese; update claims to match current export behavior. | GAP: hard-coded English; “not exported yet” is stale because export exists. | `vocabulary.page.*`. | Browser copy review. |
| Vocabulary Library | Learning/Mastered/Hidden labels, counts, tabs, lists `aria-label`s | LOCALIZE | Localized statuses and accessible names. | GAP: hard-coded/static and generated English. | `vocabulary.status.*`, `vocabulary.tabs.*`, `vocabulary.aria.*`. | Empty/non-empty tabs and accessibility tree. |
| Vocabulary Library | Saved vocabulary terms | TARGET VOCABULARY | Preserve exactly. | COVERED behaviorally. | No translation key. | Switch UI language and compare list. |
| Vocabulary Library | Tab empty states, unavailable status, Remove action/feedback | LOCALIZE | Fully Chinese. | GAP: hard-coded in `app.js`. | `vocabulary.list.empty.*`, `.unavailable`, `.remove`, `.feedback.*`. | Each tab, removal race/error. |
| Vocabulary Level help | Label, help accessible name, explanatory paragraph, saving/saved/error feedback | LOCALIZE | Fully Chinese; must include “not a test score” and “not a full dictionary completeness level.” | GAP: all hard-coded English outside locales. | `vocabulary.level.*`. | Open help and change each level. |
| Vocabulary Level help | `Level 1` through `Level 5` | PRODUCT/TECH TOKEN | Preserve exact labels. | COVERED. | No translation required. | Selector in both UI languages. |
| Manual vocabulary actions | Add label, placeholder, Add to Learning, Remove | LOCALIZE | Fully Chinese actions/placeholders. | GAP: hard-coded English. | `vocabulary.manual.*`. | Keyboard and pointer flows. |
| Manual vocabulary actions | Empty/too-long/already-learning/moved/added/no-longer-present/update-failed feedback | LOCALIZE | Complete Chinese live-region messages. | GAP: hard-coded English in state helpers and handlers. | `vocabulary.manual.feedback.*`. | Trigger each validation/outcome. |
| Manual vocabulary actions | Entered/saved term | TARGET VOCABULARY | Preserve normalized term; never translate it. | COVERED behaviorally. | Parameter only. | Compare input and list value. |
| TXT export | Heading/explanation, Copy Learning, Download TXT, empty/success/failure feedback | LOCALIZE | Fully Chinese surrounding copy; preserve `TXT` and 不背单词. | GAP: hard-coded English. | `export.txt.*`, shared `export.*`. | Empty and non-empty download/copy. |
| TXT export | Exported Learning terms | TARGET VOCABULARY | Preserve exactly; one term/phrase per line. | COVERED by formatter, not localization. | Content rule only. | Downloaded file review. |
| CSV export | Download CSV, explanation, copied/exported/failure feedback | LOCALIZE | Fully Chinese surrounding copy; preserve `CSV`. | GAP: hard-coded English. | `export.csv.*`, shared `export.*`. | Downloaded file and feedback review. |
| CSV export | CSV headers/status values currently `term,status`, `learning/mastered/hidden` | PRODUCT/TECH TOKEN | Freeze machine-readable export vocabulary separately from UI locale; do not silently localize file schema. | PARTIAL: stable English schema exists but is undocumented. | Document export schema contract before implementation. | File review in both UI languages. |
| JSON Backup/Restore | Heading, scope explanation, buttons, restoring/success/failure feedback | LOCALIZE | Fully Chinese surrounding copy; preserve `JSON`. | GAP: hard-coded English. | `backup.*`, `restore.*`. | Valid backup/restore and all feedback. |
| JSON Backup/Restore | Raw backup field names | DEVELOPER-ONLY | May exist inside the downloaded machine-readable JSON file; must not appear in normal UI/Guide prose. | VIOLATION in current Guide prose; not a violation inside JSON payload. | Keep payload schema internal/machine-readable; use plain UI concepts. | UI scan + downloaded JSON review. |
| JSON Backup/Restore | Raw parser/storage error text | DEVELOPER-ONLY | Map to localized, actionable user errors; log raw error separately. | VIOLATION risk: `error.message` is displayed directly. | `restore.error.malformed`, `.unsupported`, `.readFailed`, `.saveFailed`. | Malformed/unsupported/read/storage failure tests. |
| Settings | Title, Back Home, Language, Interface Language, saved feedback | LOCALIZE | Fully Chinese. | COVERED structurally; existing keys present. | Existing `settings.*`; copy review. | Switch while Settings is visible. |
| Settings | Language option labels English/中文 | PRODUCT/TECH TOKEN | Preserve self-names. | COVERED. | No translation required. | Selector review. |
| Settings | Help actions, storage/status explanations | LOCALIZE | Fully Chinese; localize mode/status labels in prose. | PARTIAL: keyed, but several Chinese values retain English feature labels. | Review `settings.help.*`, `.storage.*`, `.status.*`. | Chinese Settings smoke. |
| Help Center | Title, category headings, note, Guide actions | LOCALIZE | Fully Chinese. | PARTIAL: keyed; title remains `Help Center` in Chinese locale. | Review `settings.helpCenter.*`. | Switch with panel open. |
| Help Center | Five explanatory category paragraphs | LOCALIZE | Complete Chinese paragraphs. | GAP: all hard-coded English in `index.html`. | `helpCenter.gettingStarted.body`, `.reading.body`, `.vocabulary.body`, `.storage.body`, `.featureStatus.body`. | Both languages with panel open. |
| Help Center | Categories group `aria-label` | LOCALIZE | Complete Chinese accessible group name. | GAP: hard-coded English. | `helpCenter.categoriesAria`. | Accessibility tree. |
| Reader contextual help | Title, body paragraphs, actions, Close, help-button aria-label | LOCALIZE | Complete Chinese and current-context copy. | PARTIAL: keyed and translated, but Chinese retains unapproved English control labels. | Review `reader.help.*`; add context-specific keys if implemented. | Both languages from each Reader context. |
| Guide hide/restore confirmation | Hide action, confirmation, hidden/restored feedback | LOCALIZE | Complete Chinese; no mixed English path labels. | PARTIAL: keyed, but Chinese confirmation/feedback retains `Local Library` and `Help Center`. | Review `guide.hide.*`, `guide.restore.*`. | Confirm/cancel/hide/restore in both languages. |
| Forget modal | Title, body frame, Cancel, Forget book | LOCALIZE | Fully Chinese; preserve inserted imported title. | GAP: hard-coded English. | `forget.title`, `.body`, `.cancel`, `.confirm`, `.success`, `.failed`. | Confirm/cancel and title escaping. |
| Forget modal | Inserted user book title | IMPORTED CONTENT | Preserve exactly. | COVERED behaviorally. | Parameter only. | Compare title before/after switch. |
| Empty states | Home/library/vocabulary/reader/contents/progress/preview/glossary | LOCALIZE | Every normal empty state is complete Chinese. | GAP: most are hard-coded English; only some Home states are keyed. | Namespace by owning surface; no generic English fallback. | Exercise every empty state. |
| Normal success/error feedback | Import/open/save/delete/chapter/vocabulary/export/backup/restore/Guide/settings | LOCALIZE | Complete Chinese, actionable, live-region compatible. | GAP: most dynamic feedback is hard-coded English. | Namespace by owning surface with parameterized frames. | Trigger every normal outcome. |
| aria-labels and tooltips | Static HTML names | LOCALIZE | Localize all user-facing names. | GAP: only Reader help button is keyed. | Add `data-i18n-aria-label`/equivalent key coverage. | Automated DOM key audit + accessibility tree. |
| aria-labels and tooltips | Generated vocabulary/chapter/action names and “Already saved to vocabulary” title | LOCALIZE | Re-render/localize on language switch; preserve term/title parameters. | GAP: generated English in `app.js`. | Generated-string formatter keys. | Switch while generated controls are visible. |
| Imported content globally | Titles, authors, filenames, chapter titles, body | IMPORTED CONTENT | Preserve exactly across Interface Language changes. | PARTIAL evidence in prior smoke; requires localization regression coverage. | Parameter/content boundary test. | Snapshot before/after switch. |
| Declared Mixed targets globally | Chapter target terms and complete phrases | TARGET VOCABULARY | Preserve only in Mixed Guide content. | VIOLATION: no declaration list and current Mixed content retains full English segments. | Chapter target manifest + validator. | Automated target audit + editorial review. |
| Approved global tokens | `Interleaf Reader`, `BookHeart`, `EPUB`, `TXT`, `CSV`, `JSON`, `IELTS`, `Level 1`–`Level 5` | PRODUCT/TECH TOKEN | Preserve exact token only; localize surrounding copy. | PARTIAL: preservation is inconsistent with over-preservation of unrelated English labels. | Protected-token allowlist and English-leak audit. | Automated scan + Chinese UI review. |
| Internal implementation terms | `M2`, profile field names, schema names, storage/database names, raw mode IDs, `blob`, raw diagnostics | DEVELOPER-ONLY | Never visible in normal UI or Guide content. | VIOLATION in Guide and diagnostics; raw restore/import errors may leak. | `DEVLANG-001`; developer-mode boundary. | Static string scan + browser failure paths. |

## 3. Missing Chinese key inventory

The current English and Chinese locale files each define 75 identical keys. The following are not “missing from `zh-CN.js`” by parity; they are missing from the localization model entirely because their source copy is hard-coded or generated outside locale files.

Proposed namespaces and groups:

| Proposed group | Required strings |
|---|---|
| `languageGate.*` additions | choice-group aria-label and any post-selection accessibility copy |
| `home.resume.*` | title, hint, action, current-book fallback, no-chapter fallback |
| `home.continue.*` additions | saved-book fallback, local status, chapter-count/detail frame |
| `home.vocabulary.*` additions | Learning/Mastered/Hidden, counts aria-label, empty/active/unavailable notes, Level display frame |
| `import.feedback.*` | validation, loading, success, persistence warning, no-chapter, generic failure |
| `library.*` | untitled/unknown fallbacks, progress, last-read frame, open/delete outcomes, load failure |
| `forget.*` | modal title/body/actions and success/error feedback |
| `helpCenter.*` | five explanatory body paragraphs and categories aria-label |
| `reader.saved.*` | saved-local frame, Forget action, cleared/missing/error feedback |
| `reader.aria.*` | workspace, quick controls, mobile tools, chapter navigation/control groups |
| `reader.navigation.*` | previous, next, back to top, scroll hint, no-chapter labels |
| `reader.contents.*` | headings, Close, selector/list aria-labels, empty states |
| `reader.progress.*` | headings, Close, chapter control labels, no-chapter/choose/preview frames |
| `reader.mode.*` additions | compact/dynamic display labels and imported Chinese/Mixed placeholder copy |
| `reader.render.*` | empty chapter, render failure, load/render progress and errors |
| `preview.*` | headings, Close, count formatting, empty/unavailable/failure states, action labels and groups |
| `vocabBubble.*` | dialog name, close, Chinese/English/IELTS labels |
| `vocabulary.page.*` | page heading, subtitle, local-only explanation, Back Home |
| `vocabulary.status.*` | Learning/Mastered/Hidden and status descriptions |
| `vocabulary.tabs.*` | tab labels and per-tab empty states |
| `vocabulary.aria.*` | summary/page counts, lists, tabs, actions |
| `vocabulary.level.*` | label, help aria-label/body, saving/saved/validation/error feedback |
| `vocabulary.manual.*` | label, placeholder, add/remove actions, validation and result feedback |
| `export.*`, `export.txt.*`, `export.csv.*` | explanations, buttons, empty/copy/download/success/error feedback |
| `backup.*`, `restore.*` | scope copy, buttons, progress/success and categorized failure feedback |
| `guide.*` review | replace partial Chinese path labels and any developer terminology in Guide-related UI |
| `empty.*` only if shared | shared empty-state grammar; prefer surface-specific keys where context differs |
| `previewLab.*` | all design-lab interface and accessibility strings, only if the prototype remains in acceptance scope |

## 4. Current gap summary by severity

### Contract-blocking

- All six Mixed Guide chapters are bilingual paired content rather than Chinese-base Mixed content.
- The Guide exposes `M2`, raw vocabulary-profile field names, `schemaVersion`, and `blob` to users.
- Most dynamic UI strings bypass localization, so a Chinese UI cannot satisfy the no-English-explanatory-paragraph gate.
- Raw import/restore error details can reach normal user-facing feedback.

### High

- Vocabulary Library, Vocabulary Level help, manual vocabulary actions, export, and backup/restore are almost entirely hard-coded English.
- Reader secondary chrome, sheets, progress/contents states, vocabulary actions, and bubble copy are mostly hard-coded English.
- Help Center headings are keyed but all explanatory paragraphs are hard-coded English.
- Accessibility localization covers only one known control (`Reader help`); most aria-labels and tooltips remain English.

### Medium

- Existing Chinese keys over-preserve feature labels that are not approved tokens.
- Home and Local Library dynamic fallbacks/date/progress frames remain English.
- The design-lab Vocabulary Preview is not localization-ready if it remains an acceptance surface.
- The CSV machine-readable header/status vocabulary is stable but not explicitly documented as locale-independent.

## 5. Browser verification matrix

Do not use this table to mark localization acceptance rows `PASS`; it identifies required future evidence.

| Scenario | English UI | Chinese UI | Required checks |
|---|---:|---:|---|
| First run, English browser preference | Required | Required after choice | Bilingual chooser, focus, accessible name, persistence. |
| First run, Chinese browser preference | Required after choice | Required | Preselection without silent lock, complete note. |
| Home empty/non-empty/import error/success | Required | Required | No stale copy; imported metadata preserved. |
| Continue Reading and resume-current-session | Required | Required | Dynamic frames/counts localized. |
| Local Library, Guide hide/restore, Forget | Required | Required | Correct dialogs/actions; title parameters unchanged. |
| Settings and open Help Center | Required | Required | Immediate current-panel update. |
| Guide `english-study` | Required | Required | English body unchanged by UI switch. |
| Guide `chinese` | Required | Required | Chinese body unchanged by UI switch. |
| Guide `cloze-mixed` | Required | Required | Chinese-base target-only Mixed body; chapter preserved. |
| Imported EPUB `english-study` | Required | Required | Original title/author/chapter/body unchanged. |
| Imported EPUB Chinese placeholder | Required | Required | Localized placeholder; no translation claim. |
| Imported EPUB Mixed placeholder | Required | Required | Localized placeholder; no translation claim. |
| Reader desktop chrome/Contents/Preview/Mode | Required | Required | Visible and accessible labels, empty/error states. |
| Reader mobile/tap controls/Progress/sheets | Required | Required | Labels, clipping, focus, dynamic counts. |
| Vocabulary bubble and preview actions | Required | Required | Term preserved; labels/tooltips localized. |
| Vocabulary Library/Level/manual actions | Required | Required | All tabs, empty states, validation, live feedback. |
| TXT/CSV export | Required | Required | UI feedback localized; files stable and content-correct. |
| JSON backup/valid restore | Required | Required | UI localized; payload schema stable and not rendered as prose. |
| JSON malformed/unsupported/read/save failure | Required | Required | Categorized localized error; no raw exception leak. |
| Keyboard and accessibility-tree pass | Required | Required | Dialogs, sheets, groups, lists, tabs, icon names, live regions. |
| Design-lab Vocabulary Preview, if retained | Required | Required | Interface localization and sample-content classification. |

## 6. Proposed acceptance mapping

| Acceptance ID | Principal coverage rows |
|---|---|
| `ILC-001` | Interface Language/Reading Mode boundary, Guide and imported-content rows. |
| `ILC-002` | Every current-visible dynamic surface and generated accessibility row. |
| `ILC-003` | All LOCALIZE rows plus approved-token rows. |
| `ILC-004` | Missing-key inventory and automated coverage audit. |
| `ILC-005` | All aria-label, tooltip, placeholder, dialog, and live-region rows. |
| `ILC-006` | Import, storage, chapter, vocabulary, export, backup/restore, modal feedback rows. |
| `CONTENT-001` | English and Chinese Guide content rows. |
| `CONTENT-002` | Guide truth-table and chapter-preservation rows. |
| `CONTENT-003` | All IMPORTED CONTENT rows. |
| `MIXED-001`–`MIXED-005` | Mixed target, paired-content, phrase, and comfort rows. |
| `PRESERVE-001` | Product/technical token, imported-content, and target-vocabulary rows. |
| `DEVLANG-001` | Diagnostics, raw errors, Guide developer terms, internal ID/schema rows. |
| `BROWSER-LOC-001` | Entire browser verification matrix. |

