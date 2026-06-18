# Interleaf Reader User Guide

Interleaf Reader is a local-first EPUB reader for English fiction and long-form reading. It helps non-native English readers stay in the story while checking useful vocabulary in context.

This guide describes the current MVP. Chinese Reading Mode and Mixed Mode are visible as placeholders, but they do not translate book text yet.

## 1. Import an EPUB

1. Open Interleaf Reader in your browser.
2. On the Home screen, choose an EPUB file with the import button, or drag and drop an EPUB into the import area.
3. Wait for the book to load. Interleaf Reader reads the EPUB in your browser and stores the imported book locally.
4. If import fails, check the diagnostics message. Some EPUB files have unusual structures or unsupported content.

Only import books you have the right to use. Do not upload or commit copyrighted EPUB files into the project repository.

## 2. Read and Navigate

After import, the Reader opens the book in English Study Mode.

- Use Previous and Next to move between chapters.
- Use Back to Top to return to the beginning of the current chapter.
- Use the chapter list or Contents panel to jump to another chapter.
- Your approximate scroll position is saved locally, so reopening the book can restore your progress.
- On mobile-sized screens, reader controls may appear as an overlay.

Interleaf Reader is reading-first. Vocabulary tools are meant to support the reading flow, not turn the app into a flashcard drill system.

## 3. Reader Panels: Contents, Progress, Preview, Mode

The Reader chrome gives quick access to four main areas:

- Contents: browse the book's chapter list and jump to a chapter.
- Progress: view and adjust chapter progress with the chapter slider.
- Preview: review vocabulary candidates found for the current reading context.
- Mode: view reading mode options.

Current mode status:

- English Study Mode is implemented.
- Chinese Reading Mode is a placeholder.
- Mixed Mode is a placeholder.

Placeholder modes may appear in the interface, but they should not be treated as working translation features.

## 4. Vocabulary Preview and Vocabulary Bubbles

Vocabulary Preview identifies useful words and phrases from the current book text using bundled vocabulary datasets.

In the reader:

- Vocabulary terms may appear underlined.
- Click or tap an underlined term to open a vocabulary bubble.
- The bubble can show the term, an English definition, and IELTS-related usage when available.
- If the optional vocabulary engine cannot load, reading should still continue.

Vocabulary suggestions are local reading aids. They are not a complete dictionary and may not cover every word you expect.

## 5. Known, Save, and Hide

Vocabulary actions personalize what Interleaf Reader shows you.

- Known: mark a word as already familiar. It moves into the Mastered/Known area and is treated as less important for preview.
- Save: add a word to your Learning list in the Vocabulary Library.
- Hide: hide a word from future vocabulary previews.

These actions update your local profile only. They do not modify the global bundled vocabulary datasets.

## 6. Vocabulary Library

Open the Vocabulary Library from the app navigation to review and manage saved vocabulary.

The library currently includes:

- Learning: words you saved while reading or added manually.
- Mastered: words marked as Known.
- Hidden: words you chose to Hide.

You can manually add a word to Learning and remove items from your personal lists.

The current Mastered/Known behavior is simple. It records familiarity; it is not a full spaced-repetition or learning-cycle system.

## 7. Local-Only Storage Warning

Interleaf Reader stores imported books, reading progress, and vocabulary profile data locally in your browser, using browser storage such as IndexedDB.

Important limits:

- Data is not synced to an account or cloud service.
- Clearing browser data can delete imported books, progress, and vocabulary lists.
- Using a different browser, device, or private/incognito session may show an empty library.
- Browser storage quotas can affect very large EPUBs.

Treat Interleaf Reader's local storage as convenient browser storage, not as a permanent backup.

## 8. Export Basics

The Vocabulary Library includes basic export tools:

- Copy Learning: copy your Learning list.
- Copy All: copy all personal vocabulary lists.
- Download CSV: export vocabulary data as a CSV file.

Exports are intended for personal backup or review. Review the exported content before sharing it, especially if it includes book-specific context.

## 9. What Is Not Implemented Yet

The following features are planned or placeholder-only:

- Chinese Reading Mode translation.
- Mixed Mode translation or cloze-style mixed-language reading.
- Translation providers such as DeepL.
- Cloud sync, accounts, or cross-device profile sync.
- A full flashcard or spaced-repetition system.

Interleaf Reader should not ask for translation API keys in the current MVP.

