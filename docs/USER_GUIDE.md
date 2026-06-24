# Interleaf Reader User Guide

Interleaf Reader is a mobile-first, local-first reader for long-form English reading.

It helps non-native English readers stay inside a story while receiving lightweight vocabulary assistance.

This guide describes current user-facing behavior.

For implementation and verification status, see `docs/PROJECT_STATE.md`.

This guide is synchronized to R1 acceptance candidate `4b7e94e`.

---

## 1. Current Capability Boundary

For user-imported EPUBs:

* **English Study Mode** is the supported reading mode.
* **Chinese Reading Mode** is a placeholder.
* **Mixed Mode** is a placeholder.
* No real translation provider is integrated.

The built-in Interleaf Reader Guide contains authored English, independently authored Chinese, and purpose-written Mixed content.

This Guide-specific content does not mean that imported EPUBs can currently be translated.

Interleaf Reader is not a general dictionary, flashcard application, spaced-repetition system, public book library, or cloud bookshelf.

---

## 2. First Run, Interface Language, and Help

On first use, choose the Interface Language:

* English
* 中文

Interface Language changes application labels, dialogs, Settings, Help, and related accessibility text.

It does not translate or alter:

* imported title or author;
* chapter text;
* book content;
* Reading Mode;
* vocabulary decisions.

Settings includes Help, local-storage information, vocabulary profile backup and restore, vocabulary level, and Guide visibility controls where available.

The Reader also provides contextual Help.

---

## 3. Built-in Guide

The built-in **Interleaf Reader Guide** appears as a special virtual book in Local Library.

You can:

* open it through Reader;
* navigate its chapters;
* use Reading Mode to view its authored English, Chinese, or Mixed content;
* hide it from Local Library;
* restore it later through Settings.

The Guide is not a user-imported EPUB.

Hiding the Guide does not delete an imported book.

Reading Mode selects the Guide's English, Chinese, or Mixed authored variant. Interface Language changes app chrome and does not change Guide content.

Mixed Guide content is purpose-written mixed reading, not sentence-by-sentence slash translation. Guide multilingual content is authored locally and is not machine-generated translation.

---

## 4. Import an EPUB

1. Open Interleaf Reader through its supported HTTP address.
2. On Home, choose an EPUB file or drag it into the import area.
3. Wait for the book to load.
4. Reader opens the imported book when loading succeeds.

Interleaf stores the EPUB locally in the current browser origin.

If import fails:

* read the displayed error or diagnostics;
* confirm the page was served from the repository root;
* confirm JSZip and epub.js loaded;
* try the copyright-safe smoke fixture when testing the project.

Only import books you have the right to access.

Do not commit private or copyrighted EPUBs to the repository.

---

## 5. Home and Local Library

Home provides entry points for:

* importing a book;
* Continue Reading;
* Local Library;
* the built-in Guide;
* Vocabulary Library;
* Settings.

Local Library contains books stored in the current browser origin.

A book stored under one hostname or port may not appear under another.

For example:

```text
http://localhost:8000
```

and:

```text
http://127.0.0.1:8000
```

use different browser storage.

### Continue Reading

Continue Reading opens the most recently available local reading session where supported.

### Forget Book

Forget removes the saved EPUB and its saved progress from browser persistence.

The confirmation must be completed before deletion.

Forgetting the currently open book may remove its saved copy while leaving the already loaded in-memory Reader open until navigation changes.

---

## 6. Reader and Navigation

After import, Reader opens the book in English Study Mode.

Reader supports:

* vertical long-form reading;
* Contents;
* Previous and Next chapter navigation;
* Progress controls;
* Vocabulary Preview;
* Reading Mode controls;
* returning Home;
* approximate progress restoration;
* mobile-accessible Reader controls.

Reading position is approximate rather than paragraph-exact.

Changes to viewport, fonts, layout, chapter HTML, or vocabulary annotations can slightly change the restored position.

---

## 7. Reader Panels

### Contents

Shows normalized readable chapters and allows chapter navigation.

### Progress

Shows chapter or reading progress and provides chapter navigation controls where available.

### Preview

Shows a limited list of vocabulary terms matched in the current chapter.

Preview is a reading-assistance surface, not a complete dictionary or required study list.

### Mode

Shows:

* English Study Mode;
* Chinese Reading Mode;
* Mixed Mode.

For imported EPUBs, Chinese and Mixed currently show explicit placeholder behavior.

They do not generate translation.

Real imported-book Chinese or Mixed remains future work requiring Translation Version, alignment, candidate analysis, and generation contracts; provider availability alone is insufficient.

---

## 8. Vocabulary Preview and Bubbles

Vocabulary Preview uses bundled app-ready vocabulary data to identify selected words and phrases in the current chapter.

Matched terms may appear as interactive text in Reader.

Tap or click an interactive term to open a compact vocabulary bubble.

Depending on available data, the bubble may show:

* the term;
* a short Chinese meaning;
* a brief English definition;
* limited usage information.

The bubble is intended to provide enough help to continue reading.

It is not a full dictionary page and does not cover every English word.

If optional vocabulary data fails, the preferred behavior is that the original chapter remains readable.

---

## 9. Known, Save, and Hide

Vocabulary actions update the browser-local vocabulary profile.

The profile is global: Known, Learning, and Hidden outcomes apply across every book and chapter in this browser profile.

### Known

Use Known when:

> I already know this term.

Current effect:

* add the normalized term to the Known collection;
* remove it from Learning and Hidden;
* reduce or remove future ordinary Preview recommendations.

The Vocabulary Library displays these words under the **Known** tab. Known means the user explicitly marked the term as already known; it is not a tested mastery claim.

### Save

Use Save when:

> I want to keep this term for later study or export.

Current effect:

* add the normalized term to Learning;
* remove it from Known and Hidden;
* make it available in Vocabulary Library and relevant exports.

### Hide

Use Hide when:

> This term is not useful as a learning target.

Current effect:

* add the normalized term to Hidden;
* remove it from Known and Learning;
* suppress it from ordinary vocabulary recommendations.

A term is normalized before storage. Original casing may not be preserved.

---

## 10. Vocabulary Level

Vocabulary Level helps determine which common words are treated as already familiar when building Preview.

It is:

* a filtering preference;
* adjustable at any time;
* local to the current browser profile.

It is not:

* an IELTS score;
* a proficiency diagnosis;
* a mandatory placement test;
* a complete dictionary level;
* a restriction on which books you may read.

---

## 11. Vocabulary Library

Vocabulary Library contains three current collections:

### Learning

Terms saved while reading or added manually.

### Known

Terms explicitly marked as already known. This does not represent tested or scheduled mastery.

### Hidden

Terms suppressed from ordinary recommendations.

Vocabulary Library supports:

* reviewing local collections;
* manually adding a word or short phrase to Learning;
* removing terms;
* copying or downloading exports;
* vocabulary profile backup and restore.

Manual Add is capture, not dictionary lookup.

A manually added term is not automatically promised:

* a definition;
* translation;
* example sentence;
* pronunciation;
* morphology;
* synonyms;
* automatic enrichment.

---

## 12. Remove and Restore Behavior

Removing or restoring a vocabulary term removes it from the relevant stored status collections so it may become available for a later choice.

The current system does not maintain a separate historical mastery record.

Changing status through Known, Save, or Hide makes the selected status exclusive through the corresponding action helper.

A restored backup may still contain the same term in multiple collections if the imported backup contains cross-list duplicates.

---

## 13. Vocabulary Export

Current export surfaces include:

* Copy Learning;
* Copy All;
* Download CSV;
* 不背单词 TXT.

The 不背单词 TXT export contains Learning terms only as UTF-8 plain text, one word or phrase per line.

Term exports are intended for transfer or review.

They are not complete Interleaf backups and do not preserve every profile setting or collection relationship unless the export format explicitly includes it.

Interleaf does not log in to, upload to, or synchronize with 不背单词.

---

## 14. Vocabulary Profile Backup and Restore

Vocabulary profile backup downloads:

```text
interleaf-reader-vocabulary-profile.json
```

The current backup format uses:

```text
schemaVersion: 1
```

It may include:

* `exportedAt`;
* `selectedLevel`;
* `knownWords`;
* `learningWords`;
* `ignoredWords`;
* `preferredCategories`.

Backup and restore cover the vocabulary profile only.

They do not include:

* EPUB files;
* Local Library books;
* reading progress;
* preferences unrelated to the vocabulary profile;
* Guide content;
* book text;
* definitions or source sentences;
* translation data.

A successful restore replaces the supported vocabulary profile fields.

Malformed or unsupported backup input should be rejected without replacing the current profile.

Before restoring an important profile, download a current backup first.

---

## 15. Local Storage and Privacy

Current local data may include:

* imported EPUB Blobs;
* book metadata;
* reading progress;
* preferences;
* vocabulary profile.

Current product boundaries:

* no required account;
* no cloud library;
* no cross-device sync;
* no automatic upload of imported books;
* no analytics.

Clearing browser data may permanently delete local books, progress, settings, and vocabulary.

Private or incognito browsing may use temporary or unavailable storage.

Browser storage quotas may affect large EPUBs.

Treat browser-local storage as convenient local persistence, not a guaranteed permanent archive.

---

## 16. Current Network and Offline Boundary

Interleaf Reader is local-first but not fully offline.

The application currently depends on CDN-hosted JSZip and epub.js.

If those dependencies cannot load, EPUB import may fail.

Current runtime does not include verified service-worker or full offline startup support.

---

## 17. Not Implemented

The following are not current imported-book capabilities:

* real Chinese Reading Mode;
* real Mixed Mode;
* DeepL, Google, GPT, or another translation provider;
* translation API-key entry;
* automatic whole-book translation;
* accounts or cloud sync;
* public book or translation hosting;
* general dictionary search;
* automatic enrichment for every manually added term;
* flashcards, quizzes, drills, streaks, or spaced repetition;
* a tested mastery-learning lifecycle.

Placeholder features must not be interpreted as completed functionality.

---

## 18. Data Safety Checklist

To reduce accidental data loss:

1. Use the same browser, profile, hostname, and port.
2. Do not clear site data unless you intend to remove local information.
3. Export the vocabulary profile before replacing it.
4. Keep original EPUB files outside the browser.
5. Treat term exports and vocabulary backup as different formats.
6. Do not rely on Interleaf as the only permanent copy of important data.
