# M2 Interface Language and Reading Content Contract

Status: frozen contract and current-state audit  
Date: 2026-06-20  
Scope: documentation and audit only; this document does not authorize translation or production-code changes.

This specification is normative for later localization and Guide-content work. It refines the M2 language model without changing the milestone boundary: imported EPUB translation remains unimplemented, and imported Chinese and Mixed modes remain placeholders.

## 1. Contract vocabulary

Use these terms consistently in product copy, requirements, tests, and review:

| Term | Meaning | Controls | Must not control |
|---|---|---|---|
| **Interface Language** | Language of the application interface. | Navigation, labels, buttons, descriptions, Help Center, contextual help, confirmations, empty states, feedback, errors, accessibility names, tooltips, and placeholders. | Reading Mode, built-in Guide body or chapter content, imported titles/authors/body, saved vocabulary terms. |
| **Reading Mode** | Content presentation selected for the current book. | Built-in Guide content variant; imported EPUB English rendering or placeholder panel. | Interface Language. |
| **Reading Content** | Book-owned text rather than application chrome. | Built-in Guide chapters and imported EPUB metadata/body. | It is not translated merely because Interface Language changes. |
| **Mixed content** | Chinese-base Guide prose with only declared vocabulary targets retained in English. | Built-in Guide `cloze-mixed` variant only. | It is not bilingual paired text and is not automatic translation. |
| **Target term** | A chapter-declared English word or complete phrase intentionally retained in Mixed content. | Only the occurrences authored for that chapter. | It does not authorize retaining unrelated English words. |

The UI may use localized display labels, but compatibility identifiers remain internal:

| Concept | Internal value | English UI label | Chinese UI label |
|---|---|---|---|
| Interface Language | `en` | English | English |
| Interface Language | `zh-CN` | 中文 | 中文 |
| Reading Mode | `english-study` | English Study | 英语学习 |
| Reading Mode | `chinese` | Chinese | 中文阅读 |
| Reading Mode | `cloze-mixed` | Mixed Mode | 混合阅读 |

The internal values above must never be rendered as user-facing labels.

## 2. Frozen behavior model

### 2.1 Interface Language

- Options are English and 中文.
- It controls UI copy only.
- A language change must update the currently visible UI immediately, including dynamic text, open panels, live regions, accessibility names, tooltips, placeholders, and generated controls.
- It must not change Reading Mode, current Guide chapter, Guide body content, imported EPUB metadata/body, progress, or vocabulary profile data.
- The first-run chooser is intentionally bilingual before a choice is committed. Its accessible name must also communicate the choice in both languages.

### 2.2 Reading Mode

For the built-in Guide:

| Mode | Required content |
|---|---|
| `english-study` | Fully English Guide chapter title and body. |
| `chinese` | Fully Chinese Guide chapter title and body, except approved protected terms and proper names. |
| `cloze-mixed` | Chinese sentence and paragraph structure with only declared target vocabulary retained in English. |

For an imported EPUB:

| Mode | Required content |
|---|---|
| `english-study` | Render the imported book without translation. |
| `chinese` | Show a localized placeholder explaining that Chinese reading is not implemented for imported books. |
| `cloze-mixed` | Show a localized placeholder explaining that Mixed reading is not implemented for imported books. |

The placeholder panel is interface/status copy and follows Interface Language. It is not book content and does not claim translation occurred.

### 2.3 Guide metadata boundary

- `Interleaf Reader Guide` is the official built-in book title and may remain stable as product-owned metadata.
- `BookHeart` is the Guide author and is preserved.
- The Guide card badge, note, actions, progress description, and surrounding labels are interface copy and must localize.
- Guide chapter titles and bodies are Reading Content and must follow Reading Mode, not Interface Language.
- Switching Reading Mode while the Guide is open must keep the current chapter index.
- There is no user-facing Guide Version selector.
- A legacy internal key such as `bilingual` may remain for compatibility, but it does not define the product model and must never be displayed to users.

## 3. Guide body variant rules

Each Guide chapter must have three meaning-equivalent, independently authored variants:

1. English: natural instructional English.
2. Chinese: natural instructional Chinese, not a sentence-by-sentence display of the English source.
3. Mixed: natural Chinese-base instructional prose containing only declared English target terms.

All three variants must:

- teach the same product behavior and avoid contradictory claims;
- use self-authored text;
- describe only implemented behavior or clearly identify placeholders;
- avoid raw implementation details and internal field names;
- keep actions understandable in the selected Reading Mode;
- remain valid if Interface Language is independently switched.

The Chinese and Mixed variants must not depend on the reader having an English UI. When a control must be identified, use the localized concept in prose; an approved short product label may be included only when necessary for disambiguation.

## 4. Mixed-content authoring contract

Mixed content is a cloze-like reading aid for readers who experience resistance to long English passages. Chinese is the grammatical and narrative base.

### 4.1 Required example

English:

> It is not a test score or a full dictionary completeness level.

Chinese:

> 它不是考试分数，也不是完整词典等级。

Mixed:

> 它不是考试分数，也不是 completeness 词典等级。

In this example, `completeness` must be declared in the chapter vocabulary target list.

### 4.2 Authoring rules

- Start from the natural Chinese variant, not from the English sentence.
- Retain only target terms declared for the chapter.
- Preserve a declared multiword phrase as one complete unit; do not translate or split part of it.
- A sentence containing no target term may remain fully Chinese.
- Do not force a target into a sentence where it makes the Chinese unnatural.
- Do not retain random common English words, UI labels, function words, or whole English clauses merely because they appeared in the English variant.
- English spans must be short enough that Chinese remains the dominant reading experience. A span longer than four words requires review and is acceptable only when it is one declared multiword target or an approved proper name.
- Prefer one target occurrence per sentence. More than three retained targets in one sentence requires editorial review for reading comfort.
- Chinese punctuation and sentence order remain the default unless the target phrase itself conventionally contains punctuation.
- Matching meaning across variants does not require matching sentence boundaries.

### 4.3 Forbidden Mixed patterns

The following are contract failures:

- a full English sentence followed by `/` and a full Chinese sentence;
- an English heading followed by `/` and its Chinese translation;
- duplicated paragraph translations in any separator format;
- alternating full English and full Chinese paragraphs;
- retaining an English clause that is not one declared target phrase;
- retaining random common English words automatically;
- translating only part of a declared multiword target;
- treating every English word found by the vocabulary engine as a Mixed target.

The slash character remains valid inside approved labels such as `Backup / Restore`; the prohibition is against paired translation structure, not the punctuation character itself.

## 5. Target-term rules

Each Guide chapter must have an explicit vocabulary target list owned by the chapter content. The list is an editorial contract, not an automatically inferred set.

- A target entry is a word or a complete multiword phrase.
- The authored Mixed text must be reviewable against the chapter list: every non-protected English lexical span must match a declared target.
- Phrase matching uses the declared phrase as a unit. For example, `figure out` must not become `figure 出` or `弄清 out`.
- Inflected or capitalization variants require explicit editorial approval or an explicit accepted-form entry; they are not assumed.
- A target can be omitted from Mixed prose when retaining it would damage comprehension.
- Target density is a reading-comfort decision, not a completeness score.
- The vocabulary preview may surface more terms than the Mixed chapter retains. Preview candidates and Mixed targets are separate concepts.
- Product names, file-format tokens, proper nouns, and imported content belong to preservation classes; they must not be added to the vocabulary target list solely to justify their presence.

## 6. Localization and preservation taxonomy

Every user-facing string must be assigned exactly one primary class in the coverage matrix.

### 6.1 Localize to Chinese

Localize application navigation, feature labels, explanatory copy, actions, statuses, errors, confirmations, empty states, accessibility text, tooltips, and placeholders. Examples include Home, Local Library, Vocabulary Library, Reader controls, Contents, Progress, Vocabulary Preview, Mode, Help Center, Settings, Known, Save, Hide, Learning, Mastered, and Hidden.

### 6.2 Protected and untranslated product or technical terms

Approved preservation tokens are:

- `Interleaf Reader`
- `BookHeart`
- `EPUB`
- `TXT`
- `CSV`
- `JSON`
- `IELTS`
- `Level 1` through `Level 5`
- a file extension or filename when the exact technical value matters
- the self-names `English` and `中文` in the language chooser

Preserving a token does not preserve the surrounding sentence. For example, a Chinese export explanation may retain `TXT` while every explanatory word around it is Chinese.

### 6.3 Preserve because it is imported user content

Do not translate or rewrite imported EPUB titles, authors, chapter titles, filenames, or book body content. Localize only the surrounding UI frame, such as `正在打开《{title}》…`.

### 6.4 Preserve because it is target vocabulary

Preserve vocabulary values when they are shown in Preview, the vocabulary bubble, Vocabulary Library, or manual vocabulary flows; Interface Language must not translate the word being studied. This display preservation does not automatically authorize the term for Mixed prose. In Mixed Guide content, only the chapter-declared subset may remain in English, exactly as authorized by Section 5. Target terms are content, not interface copy.

### 6.5 Developer-only and never user-facing

Developer diagnostics, raw exceptions, internal IDs, compatibility keys, storage implementation details, and schema property names must not appear in normal product UI or Guide prose. They may appear in source, tests, developer documentation, or a deliberately gated developer diagnostic mode.

## 7. Forbidden user-facing developer language

The following raw terms are forbidden in normal UI, Help, Guide content, confirmations, and user-facing errors:

| Forbidden raw term | User-facing concept |
|---|---|
| `M2` | omit it, or say “this version” only when time context matters |
| `selectedLevel` | Vocabulary Level |
| `knownWords` | words marked as known |
| `learningWords` | words saved for learning |
| `ignoredWords` | hidden words |
| `preferredCategories` | preferred vocabulary categories |
| `schemaVersion` | backup format version, only if the user must know |
| internal mode IDs such as `english-study` and `cloze-mixed` | localized Reading Mode label |
| storage/database names or localStorage keys | “saved in this browser/on this device” |
| `blob`, `ArrayBuffer`, stack traces, exception class names | a plain-language file or import explanation |

`epub.js`, `JSZip`, `ArrayBuffer`, metadata/spine debug state, raw error names, and similar import diagnostics are developer-only. The current visible diagnostics panel must be removed from normal user flow or placed behind an explicit developer boundary in a later implementation task.

## 8. Localization quality gates

A localization implementation is not acceptable unless all gates pass:

1. **Key coverage:** Every localizable visible string, generated string, accessibility name, tooltip, placeholder, feedback message, and error has a translation key or a documented preservation classification.
2. **Locale parity:** English and Chinese locale files have identical key sets. Key parity alone is not sufficient when a surface is hard-coded outside locale files.
3. **Chinese completeness:** No untranslated explanatory English paragraph remains on a Chinese UI surface.
4. **Approved English only:** English may remain only for approved tokens, imported content, proper nouns, and declared target vocabulary.
5. **Long-English review:** Any user-facing English sentence longer than a short approved label on a Chinese UI is flagged for review.
6. **Immediate switch:** Switching Interface Language updates the current visible UI without changing Reading Mode, Guide chapter, or Guide content.
7. **No fallback leakage:** Missing Chinese keys must be detected during review; silently falling back to an English sentence is not acceptable for release.
8. **Complete dialogs:** Chinese help, errors, confirmations, and success feedback are complete rather than partially translated.
9. **Parameter safety:** Imported titles, authors, filenames, target terms, counts, and other parameters remain unchanged while the sentence frame localizes.
10. **Mixed validation:** Every Mixed English span is either an approved protected token/proper noun or a chapter-declared target; paired bilingual text is rejected.
11. **Reading comfort:** Mixed paragraphs remain predominantly Chinese and do not recreate the resistance of long English passages.
12. **Browser evidence:** Desktop and mobile renderings are reviewed for clipping, stale dynamic copy, focus behavior, and screen-reader naming.

## 9. Accessibility localization

- Localize `aria-label`, `aria-labelledby` source text, `aria-describedby` source text, `title`, placeholders, visually hidden text, dialog names/descriptions, live-region messages, tab names, list names, and control group names.
- Keep imported book titles and target vocabulary unchanged when included as parameters in an accessible name.
- Icon-only controls must have complete localized names. The visible `?` may remain language-neutral; its accessible name must localize.
- Generated controls, including chapter rows and vocabulary actions, must update their accessible names after an Interface Language switch.
- State conveyed in `aria-pressed`, `aria-selected`, `aria-expanded`, and `aria-disabled` remains semantic; any accompanying spoken text must localize.
- Do not expose internal IDs or raw property names through accessibility APIs.
- The first-run chooser must have a bilingual accessible group name before a language is selected.

## 10. Feedback and error localization

- All normal import, storage, chapter, vocabulary, export, backup, restore, hide/restore, and forget outcomes must localize.
- Messages must state what happened and, for recoverable errors, the next user action.
- Raw exception messages and diagnostic causes must be logged for developers, not appended to normal user-facing errors.
- Dynamic frames must localize while preserving imported values: titles, authors, filenames, chapter titles, terms, and counts.
- Success and error states in `aria-live` regions must switch language with the visible UI and must not combine an English lead-in with a Chinese remainder.
- Placeholder status for imported Chinese and Mixed modes must be complete in both languages and must not imply that a provider call was attempted.

## 11. Current implementation audit

This section records gaps; it does not assign acceptance `PASS` status.

### 11.1 Locale coverage

- `pwa-reader/locales/en.js` and `pwa-reader/locales/zh-CN.js` currently have equal key sets: 75 keys in each.
- Therefore there are no parity-only “missing Chinese keys” among the keys that already exist.
- The material gap is missing keys for entire surfaces. Hard-coded English bypasses both locale files, especially Vocabulary Library, Reader secondary chrome/sheets, generated feedback, empty/error states, Help Center body paragraphs, confirmations, import feedback, and accessibility labels/tooltips.
- Several existing Chinese values retain unapproved English feature labels (`Vocabulary Library`, `Local Library`, `Help Center`, `Contents`, `Progress`, `Preview`, `Mode`, `Chinese Reading Mode`, `Mixed Mode`) and require Chinese copy review.

The proposed missing-key inventory is grouped in `docs/M2_LOCALIZATION_COVERAGE_MATRIX.md` rather than treated as an implementation instruction.

### 11.2 Hard-coded English outside locale files

Major current groups are:

- Home resume-current-session copy, vocabulary counts/labels, summary feedback, and Forget modal in `pwa-reader/index.html` and `pwa-reader/app.js`.
- All Help Center explanatory paragraphs and category-group accessibility text in `pwa-reader/index.html`.
- Nearly the entire Vocabulary Library page, Vocabulary Level help, manual actions, export, backup/restore, tabs, empty states, and feedback in `pwa-reader/index.html` and `pwa-reader/app.js`.
- Reader secondary chrome, Contents/Progress/mobile sheets, chapter navigation, generated mode labels, preview actions, glossary panel, bubble labels, empty states, and render errors in `pwa-reader/index.html`, `pwa-reader/app.js`, and `pwa-reader/readingModes.js`.
- Import validation, progress, success, storage, and failure feedback in `pwa-reader/app.js`.
- The complete `design-lab/vocabulary-preview.html` and `design-lab/vocabulary-preview.js` prototype UI is hard-coded; vocabulary headwords, sample quotations, and declared terms are content and should be preserved, while its interface labels and accessibility names require localization if the prototype becomes an acceptance surface.

### 11.3 Guide Mixed-content violations

All six current `bilingual` Guide variants are bilingual paired text, not Mixed content. The audit finds:

- six paired chapter display titles;
- six paired visible `<h2>` headings;
- nineteen paired English/Chinese paragraphs;
- twenty-five visible paired strings in total across the six chapters.

Every paired paragraph uses a full English segment, ` / `, and a Chinese translation. This directly violates the frozen Mixed model. The `cloze-mixed` mapping currently points to the legacy content key `bilingual`; the key may remain internal for compatibility, but its content must eventually be re-authored as Chinese-base Mixed prose.

### 11.4 User-facing developer language

Current Guide prose exposes forbidden terms:

- `M2` in the Level/Export/Backup and Local-first chapters;
- `selectedLevel`, `knownWords`, `learningWords`, `ignoredWords`, `preferredCategories`, and `schemaVersion` in Guide backup explanations;
- `EPUB blob`/`blob` in Guide onboarding copy.

The import diagnostics panel also exposes developer-only implementation terms in the normal DOM. Internal mode IDs currently appear only as HTML/control values and may remain internal; they become violations only if rendered as labels or assistive text.

### 11.5 Untranslated accessibility labels and tooltips

Only the Reader-help button currently uses `data-i18n-aria-label`. Unlocalized examples include:

- first-run language-choice group;
- Vocabulary Library count/list/tab groups and Vocabulary Level help;
- Reader workspace, quick controls, chapter selectors/lists, mobile tools, chapter navigation, progress controls, and vocabulary-note dialog;
- generated vocabulary action groups and the `Already saved to vocabulary` tooltip;
- vocabulary-bubble close control;
- all accessibility labels in the Vocabulary Preview design-lab prototype.

### 11.6 Screens requiring browser verification

Later implementation must capture browser evidence for:

1. First-run chooser in both browser-language preselection cases, selection persistence, and bilingual accessible naming.
2. Home in both Interface Languages, including import feedback, resume/continue cards, empty/non-empty library, Guide card, and Vocabulary summary.
3. Settings and Help Center, including immediate language switching with the current panel open.
4. Reader desktop and mobile chrome, Contents, Progress, Vocabulary Preview, Mode, contextual help, and dynamic labels.
5. Six Guide combinations: two Interface Languages by three Reading Modes, with chapter preservation and unchanged body on Interface Language switch.
6. Imported EPUB in all three Reading Modes, verifying original metadata/body preservation and localized Chinese/Mixed placeholders.
7. Vocabulary bubble and manual Known/Save/Hide actions, including accessible names and tooltips.
8. Vocabulary Library, Level help, manual add/remove, all empty/error states, and live feedback.
9. TXT/CSV export and JSON Backup/Restore success, empty, malformed, and unsupported-input feedback.
10. Guide hide/restore confirmation and user-book Forget modal.
11. Keyboard and screen-reader inspection for dialogs, icon controls, sheets, tabs, lists, tooltips, and live regions.
12. Vocabulary Preview design-lab screen if it remains a deliverable or visual acceptance reference.

## 12. Proposed acceptance IDs

These IDs are proposed for later addition to the acceptance matrix. They are intentionally not marked `PASS` here.

| ID | Requirement |
|---|---|
| `ILC-001` | Interface Language changes UI only and never changes Reading Mode or Reading Content. |
| `ILC-002` | Interface Language switch updates all currently visible static, dynamic, and accessibility copy without reload. |
| `ILC-003` | Chinese UI contains no untranslated explanatory English beyond approved preservation classes. |
| `ILC-004` | Every localizable string has a key and English/Chinese locale key parity is enforced. |
| `ILC-005` | Accessibility labels, tooltips, placeholders, dialog descriptions, and live regions are fully localized. |
| `ILC-006` | Feedback, errors, confirmations, and success messages are complete in both languages and do not expose raw exceptions. |
| `CONTENT-001` | Guide `english-study` is fully English and Guide `chinese` is fully Chinese except approved protected terms. |
| `CONTENT-002` | Guide content follows Reading Mode only; Guide chapter remains stable across mode and UI-language changes. |
| `CONTENT-003` | Imported EPUB titles, authors, chapter titles, filenames, and body remain unchanged by Interface Language. |
| `MIXED-001` | Mixed Guide prose uses Chinese grammatical structure as its base. |
| `MIXED-002` | Every retained English lexical span is a declared chapter target or approved protected term/proper noun. |
| `MIXED-003` | No paired English/Chinese heading, sentence, or duplicated paragraph appears in Mixed content. |
| `MIXED-004` | Declared multiword target phrases are retained as complete units. |
| `MIXED-005` | Mixed content passes reading-comfort review and sentences without targets may remain fully Chinese. |
| `PRESERVE-001` | Product/technical tokens, imported content, and target vocabulary follow the preservation taxonomy. |
| `DEVLANG-001` | No forbidden developer terminology, internal ID, raw schema field, database/storage name, or diagnostic detail is user-facing. |
| `BROWSER-LOC-001` | Required desktop, mobile, language, mode, dynamic-feedback, and accessibility browser evidence is recorded. |

## 13. Recommended implementation order

1. Add automated string inventory and locale-coverage tests; establish missing-key and English-leak detection before changing copy.
2. Extend locale namespaces for shared navigation, dynamic feedback/errors, accessibility, and formatting helpers.
3. Localize Home, import feedback, Continue Reading, Local Library, Guide card, hide/restore, and Forget flows.
4. Localize Settings, Help Center body copy, and Reader contextual help.
5. Localize Reader chrome, Contents, Progress, Mode labels/placeholders, Preview, vocabulary bubble, and all generated accessibility text.
6. Localize Vocabulary Library, Level help, manual actions, TXT/CSV export, and JSON Backup/Restore feedback.
7. Move developer diagnostics behind a developer-only boundary and replace raw user errors with localized plain-language messages.
8. Re-author all six Chinese Guide variants for fully Chinese quality, then re-author all six Mixed variants from those Chinese bases using explicit chapter target lists.
9. Localize the design-lab Vocabulary Preview only if it remains an active acceptance surface.
10. Run the browser matrix and accessibility review; only then consider updating acceptance statuses.
