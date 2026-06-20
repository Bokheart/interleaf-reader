# Vocabulary Interaction Semantics

## 1. Core Distinction

Vocabulary Preview is a chapter-level recommendation surface.

It answers:

```text
What vocabulary might help me read this chapter right now?
```

Vocabulary Library / 生词本 is a user-owned long-term learning list.

It answers:

```text
What words have I chosen to learn, review, export, or mark as mastered?
```

They are related, but not the same.

Preview is temporary and chapter-specific. It should stay focused, lightweight, and useful while reading.

Vocabulary Library is persistent and user-owned. It should preserve the user's learning decisions across books, chapters, and sessions.

## 2. Vocabulary Filtering Model

Chapter words are divided into two broad groups:

- effective known words
- candidate learning words

Effective known words include:

- selected level baseline
- user `knownWords`
- user `ignoredWords`

Candidate learning words include:

- `learningWords` appearing in the chapter
- curated IELTS / fiction / slang / phrase items
- unknown candidates

Important: not being in the whitelist does not mean a word should automatically be shown. It only enters the candidate pool.

Preview should still rank candidates and show only the most useful top items, usually around 15-30 per chapter.

## 3. Word Lifecycle

### Candidate

A candidate is a word or phrase detected in the current chapter and considered potentially useful.

Transitions:

- Candidate -> Learning when the user saves it.
- Candidate -> Known when the user says they already know it.
- Candidate -> Ignored when the user hides it.

### Learning

A learning word is a user-owned study target. It belongs in the future Vocabulary Library / 生词本.

Transitions:

- Learning -> Mastered when the user has learned it and wants to keep completed history.
- Learning -> Ignored/Hidden if the user decides it is not worth studying.
- Learning -> Removed if the user deletes it from the future library.

### Mastered

A mastered word is a word the user previously saved and later completed.

Transitions:

- Mastered -> Learning if the user restores it for review.
- Mastered -> Removed if the user deletes the history entry.

### Known

A known word is an English word the user already knows and does not need to save.

Transitions:

- Known -> Learning only if the user later decides to save it.
- Known -> Candidate only if the user restores/removes it from `knownWords`.

### Ignored

An ignored word is not a learning target.

Transitions:

- Ignored -> Candidate if restored.
- Ignored -> Learning if restored and saved later.

## 4. Button Semantics

### Known / 已掌握

Meaning:

```text
I already know this English word.
```

Behavior:

- add to `knownWords`
- hide from future Preview
- does not enter the long-term Vocabulary Library by default
- not exported or reviewed by default

### Save / Add to vocab / 存入生词本

Meaning:

```text
I want to learn or review this word.
```

Behavior:

- add to `learningWords`
- add to future Vocabulary Library / 生词本
- can appear later as a saved word if it occurs in a chapter
- can be exported later
- can later become mastered

### Hide / Ignore / 不再提示

Meaning:

```text
This is not my learning target.
```

Behavior:

- add to `ignoredWords`
- hide from Preview
- useful for names, proper nouns, typos, irrelevant terms, tags, and unwanted recommendations

### Mastered / 已掌握并留档

Meaning:

```text
I saved this word before, learned it, and want to keep completed history.
```

Behavior:

- no longer appears as a normal learning target
- remains in Vocabulary Library history
- can support future review statistics, export history, and learning progress

## 5. Known Vs Hide Vs Mastered

Known = "I know this English word, no need to save it."

Hide = "This is not my learning target."

Mastered = "I learned/saved it before and now want to keep it as completed history."

Examples:

- `anxious` -> Known if already known.
- `bring up` -> Save if worth learning.
- `Dean` / `Winchester` -> Hide if treated as proper nouns.
- `unorthodox` -> Save, later Mastered.
- Weird typo/tag -> Hide.

## 6. Save/Add Behavior

Save/Add does not mean the word should dominate Preview forever.

Save/Add means the word enters the long-term Vocabulary Library.

If a saved word appears in the current chapter, it may appear in a special section:

```text
Saved words in this chapter
```

Otherwise, Preview should still prioritize useful new candidates from the current chapter.

Saved words should help the user review in context, but they should not drown out new chapter-level recommendations.

## 7. Suggested UX Behavior

After clicking Known, avoid an interruptive modal.

Optional toast:

```text
Marked as known.
```

Toast actions:

- Save to history
- Undo

Recommended Preview button labels:

- Known / 已掌握
- Save / 存入生词本
- Hide / 不再提示

`Save` is clearer than `Add` because it says what the user is doing: keeping the word for future study. `Add` is ambiguous unless the UI also says exactly where the word is being added.

## 8. Future Vocabulary Library

Expected future Home card:

- Learning count
- Mastered count
- Hidden count
- Open Vocabulary button

Expected future Vocabulary Library page/panel:

- tabs: Learning / Mastered / Hidden
- sort: A-Z / Source
- future filters: type, book, date added

Each entry can show:

- term
- Chinese meaning
- English definition
- IELTS usage
- source book/chapter
- status
- actions: mark mastered, restore, remove, export later

The Vocabulary Library should be the deliberate study space. Preview should remain the in-reading recommendation surface.

## 9. Source Grouping

Source can mean the book/chapter where a word was first saved.

Sorting or grouping by source helps users review words from a specific fic/book.

A-Z sorting helps dictionary-style lookup.

Status grouping helps learning workflow:

- Learning: active study
- Mastered: completed history
- Hidden: suppressed recommendations

## 10. Implementation Implications

Future steps:

- rename Add button to Save
- add saved-state badge
- add mastered status to future vocabulary entry model
- build Vocabulary Library Home card
- build Vocabulary Library panel/page
- add export later
- add candidate extraction later
- add dictionary enrichment later

Do not continue expanding vocabulary UI until new work follows the Known / Save / Hide / Mastered semantics in this document.
