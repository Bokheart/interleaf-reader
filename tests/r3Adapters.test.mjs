import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createBooksAdapter } from "../pwa-reader/adapters/booksAdapter.js";
import { createModesAdapter } from "../pwa-reader/adapters/modesAdapter.js";
import {
  createReaderAdapter,
  createReadingProgressRecord,
  resolveRestoredScrollTop
} from "../pwa-reader/adapters/readerAdapter.js";
import { createSettingsAdapter } from "../pwa-reader/adapters/settingsAdapter.js";
import { createVocabularyAdapter } from "../pwa-reader/adapters/vocabularyAdapter.js";

test("booksAdapter lists saved books through storage and preserves progress labels", async () => {
  const calls = [];
  const adapter = createBooksAdapter({
    listSavedBooks: async () => {
      calls.push("listSavedBooks");
      return [
        { bookKey: "new", title: "Newest", updatedAt: 20, progressText: "Chapter 2 / 3" },
        { bookKey: "old", title: "Oldest", updatedAt: 10, chapterCount: 4 }
      ];
    }
  });

  const books = await adapter.listBooks();

  assert.deepEqual(calls, ["listSavedBooks"]);
  assert.deepEqual(books.map((book) => book.bookKey), ["new", "old"]);
  assert.equal(books[0].progressLabel, "Chapter 2 / 3");
  assert.equal(books[1].progressLabel, "4 chapters");
});

test("booksAdapter imports through epubLoader and storage without changing book-key generation", async () => {
  const file = { name: "Story.epub", size: 12, lastModified: 99, type: "application/epub+zip" };
  const adapter = createBooksAdapter({
    loadEpubFromFile: async (inputFile) => {
      assert.equal(inputFile, file);
      return {
        handle: { tag: "epub-handle" },
        book: {
          id: "story-12-99",
          title: "Story",
          author: "Writer",
          chapters: [{ id: "c1", title: "", order: 1 }]
        }
      };
    },
    normalizeChapterList: (chapters) => chapters.map((chapter) => ({ ...chapter, title: "Chapter 1" })),
    saveStoredBook: async (inputFile, book) => {
      assert.equal(inputFile, file);
      assert.equal(book.chapters[0].title, "Chapter 1");
      return { bookKey: "story-key", title: book.title };
    }
  });

  const result = await adapter.importBook(file);

  assert.equal(result.book.title, "Story");
  assert.equal(result.book.chapters[0].title, "Chapter 1");
  assert.deepEqual(result.storedMetadata, { bookKey: "story-key", title: "Story" });
});

test("booksAdapter returns pure book detail data without exposing the stored blob", async () => {
  const adapter = createBooksAdapter({
    getStoredBook: async (bookKey) => ({
      bookKey,
      title: "Stored",
      author: "Author",
      fileBlob: { privateBlob: true },
      chapterCount: 7,
      updatedAt: 12
    }),
    getReadingProgress: async (bookKey) => ({
      bookKey,
      currentChapterId: "c2",
      currentChapterIndex: 1,
      progressText: "Chapter 2 / 7",
      currentMode: "english-study"
    })
  });

  const detail = await adapter.getBookDetail("stored-key");

  assert.equal(detail.bookKey, "stored-key");
  assert.equal(detail.hasFileBlob, true);
  assert.equal("fileBlob" in detail, false);
  assert.equal(detail.progress.currentChapterId, "c2");
});

test("booksAdapter continue reading uses the actual most-recent stored-book rule", async () => {
  const adapter = createBooksAdapter({
    getMostRecentStoredBook: async () => ({
      bookKey: "latest",
      title: "Latest",
      fileBlob: { byteLength: 1 }
    }),
    getReadingProgress: async (bookKey) => ({
      bookKey,
      currentChapterIndex: 1,
      scrollRatio: 0.5
    })
  });

  const item = await adapter.getContinueReading();

  assert.equal(item.bookKey, "latest");
  assert.equal(item.progress.scrollRatio, 0.5);
  assert.equal(item.hasFileBlob, true);
});

test("booksAdapter returns no continue reading DTO when the stored book has no progress record", async () => {
  const adapter = createBooksAdapter({
    getMostRecentStoredBook: async () => ({
      bookKey: "imported",
      title: "Imported",
      fileBlob: { byteLength: 1 }
    }),
    getReadingProgress: async () => null
  });

  assert.equal(await adapter.getContinueReading(), null);
});

test("booksAdapter keeps zero-percent compatible progress eligible for continue reading", async () => {
  const adapter = createBooksAdapter({
    getMostRecentStoredBook: async () => ({
      bookKey: "zero-progress",
      title: "Zero Progress",
      fileBlob: { byteLength: 1 }
    }),
    getReadingProgress: async (bookKey) => ({
      bookKey,
      currentChapterId: "chapter-1",
      currentChapterIndex: 0,
      currentMode: "english-study",
      scrollRatio: 0
    })
  });

  const item = await adapter.getContinueReading();

  assert.equal(item.bookKey, "zero-progress");
  assert.equal(item.progress.currentChapterIndex, 0);
  assert.equal(item.progress.scrollRatio, 0);
});

test("booksAdapter rejects orphan or malformed continue reading progress", async () => {
  const adapterWithOrphanProgress = createBooksAdapter({
    getMostRecentStoredBook: async () => ({
      bookKey: "stored",
      title: "Stored",
      fileBlob: { byteLength: 1 }
    }),
    getReadingProgress: async () => ({
      bookKey: "orphan",
      currentChapterIndex: 0,
      scrollRatio: 0
    })
  });
  const adapterWithMalformedProgress = createBooksAdapter({
    getMostRecentStoredBook: async () => ({
      bookKey: "stored",
      title: "Stored",
      fileBlob: { byteLength: 1 }
    }),
    getReadingProgress: async () => ({
      bookKey: "stored",
      scrollRatio: 0.2
    })
  });

  assert.equal(await adapterWithOrphanProgress.getContinueReading(), null);
  assert.equal(await adapterWithMalformedProgress.getContinueReading(), null);
});

test("readerAdapter opens stored books as a pure restoration payload", async () => {
  const adapter = createReaderAdapter({
    getStoredBook: async (bookKey) => ({
      bookKey,
      fileName: "Stored.epub",
      fileType: "application/epub+zip",
      lastModified: 77,
      fileBlob: { blob: true }
    }),
    getReadingProgress: async (bookKey) => ({
      bookKey,
      currentChapterId: "chap-2",
      currentMode: "cloze-mixed"
    }),
    createFile: (parts, name, options) => ({ parts, name, options })
  });

  const payload = await adapter.openBook("stored-key");

  assert.equal(payload.bookKey, "stored-key");
  assert.equal(payload.file.name, "Stored.epub");
  assert.equal(payload.progress.currentMode, "cloze-mixed");
});

test("readerAdapter preserves chapter IDs and adjacent-index behavior", () => {
  const adapter = createReaderAdapter();
  const chapters = [
    { id: "intro", title: "Intro" },
    { id: "chapter-1", title: "Chapter 1" },
    { id: "chapter-2", title: "Chapter 2" }
  ];

  assert.deepEqual(adapter.getTableOfContents({ chapters }, "chapter-1"), [
    { id: "intro", title: "Intro", index: 0, isCurrent: false },
    { id: "chapter-1", title: "Chapter 1", index: 1, isCurrent: true },
    { id: "chapter-2", title: "Chapter 2", index: 2, isCurrent: false }
  ]);
  assert.deepEqual(adapter.getAdjacentChapter(chapters, "chapter-1", "next"), {
    chapter: chapters[2],
    index: 2,
    direction: "next"
  });
  assert.equal(adapter.getAdjacentChapter(chapters, "intro", "previous"), null);
});

test("reader progress helper preserves current scroll-ratio restoration behavior", () => {
  const progress = { currentChapterId: "c1", scrollRatio: 0.5 };

  assert.equal(resolveRestoredScrollTop(progress, "c1", { scrollHeight: 1000, clientHeight: 200 }), 400);
  assert.equal(resolveRestoredScrollTop(progress, "c2", { scrollHeight: 1000, clientHeight: 200 }), null);
});

test("readerAdapter saves progress with mode values and chapter progress text unchanged", async () => {
  const records = [];
  const adapter = createReaderAdapter({
    saveReadingProgress: async (record) => {
      records.push(record);
      return record;
    },
    now: () => 1234
  });
  const chapters = [{ id: "c1", title: "One" }, { id: "c2", title: "Two" }];

  const record = await adapter.savePosition({
    bookKey: "book",
    chapters,
    currentChapterId: "c2",
    currentMode: "chinese",
    scrollTop: 25,
    scrollHeight: 125,
    clientHeight: 25
  });

  assert.equal(record.currentMode, "chinese");
  assert.equal(record.currentChapterIndex, 1);
  assert.equal(record.progressText, "Two · 2 / 2");
  assert.equal(record.scrollRatio, 0.25);
  assert.deepEqual(records, [record]);
});

test("vocabularyAdapter keeps Known, Learning, and Hidden mutually exclusive through storage helpers", async () => {
  const calls = [];
  const adapter = createVocabularyAdapter({
    markWordKnown: async (term) => calls.push(["known", term]),
    addLearningWord: async (term) => calls.push(["learning", term]),
    ignoreVocabularyWord: async (term) => calls.push(["hidden", term]),
    restoreVocabularyWord: async (term) => calls.push(["unset", term])
  });

  await adapter.setTermState("Anxious", "known");
  await adapter.setTermState("Anxious", "learning");
  await adapter.setTermState("Anxious", "hidden");
  await adapter.setTermState("Anxious", null);

  assert.deepEqual(calls, [
    ["known", "Anxious"],
    ["learning", "Anxious"],
    ["hidden", "Anxious"],
    ["unset", "Anxious"]
  ]);
});

test("vocabularyAdapter exposes profile lists and source-backed term metadata only", async () => {
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => ({
      knownWords: ["known"],
      learningWords: ["learning"],
      ignoredWords: ["hidden"],
      selectedLevel: "level3"
    })
  });

  assert.deepEqual(await adapter.listVocabulary("learning"), ["learning"]);
  assert.deepEqual(await adapter.listVocabulary(), {
    known: ["known"],
    learning: ["learning"],
    hidden: ["hidden"]
  });
  assert.deepEqual(
    adapter.getTermMetadata("Learning", [{ term: "learning", englishDefinition: "in progress" }]),
    { term: "learning", englishDefinition: "in progress" }
  );
  assert.equal(adapter.getTermMetadata("missing"), null);
});

test("vocabularyAdapter builds chapter preview from full text and vocabulary arrays", () => {
  const adapter = createVocabularyAdapter({
    buildVocabularyPreview: (plainText, vocabularyItems, options) => ({ plainText, vocabularyItems, options })
  });

  assert.deepEqual(
    adapter.getChapterPreview({ plainText: "The anxious pilot waited." }, [{ term: "anxious" }], { limit: 5 }),
    {
      plainText: "The anxious pilot waited.",
      vocabularyItems: [{ term: "anxious" }],
      options: { limit: 5 }
    }
  );
});

test("modesAdapter preserves mode constants and honest imported-book availability", () => {
  const adapter = createModesAdapter();

  assert.deepEqual(adapter.getModeConstants(), {
    ENGLISH_STUDY: "english-study",
    CHINESE: "chinese",
    CLOZE_MIXED: "cloze-mixed"
  });
  assert.equal(adapter.resolveModeFromProgress({ currentMode: "cloze-mixed" }), "cloze-mixed");
  assert.deepEqual(adapter.getModeAvailability({ isBuiltInGuide: false }).map((mode) => [mode.value, mode.status]), [
    ["english-study", "ready"],
    ["chinese", "placeholder-unavailable"],
    ["cloze-mixed", "placeholder-unavailable"]
  ]);
  assert.deepEqual(adapter.getModeAvailability({ isBuiltInGuide: true }).map((mode) => [mode.value, mode.status]), [
    ["english-study", "ready"],
    ["chinese", "ready-guide-only"],
    ["cloze-mixed", "ready-guide-only"]
  ]);
});

test("modesAdapter transforms chapters only through renderChapterForMode", () => {
  const adapter = createModesAdapter({
    renderChapterForMode: (chapter, mode, options) => ({ chapter, mode, options })
  });

  assert.deepEqual(adapter.renderChapter({ id: "c1" }, "english-study", { vocabularyItems: [] }), {
    chapter: { id: "c1" },
    mode: "english-study",
    options: { vocabularyItems: [] }
  });
});

test("settingsAdapter preserves existing preferences and marks future-only settings honestly", () => {
  const calls = [];
  const adapter = createSettingsAdapter({
    getAppPreferences: () => ({ uiLanguage: "zh-CN", guideVisibleInLibrary: true }),
    setUiLanguagePreference: (language) => calls.push(["language", language]),
    setGuideVisibilityPreference: (visible) => calls.push(["guide", visible])
  });

  assert.deepEqual(adapter.getPreferences(), { uiLanguage: "zh-CN", guideVisibleInLibrary: true });
  adapter.setUiLanguage("en");
  adapter.setGuideVisibility(false);
  assert.deepEqual(calls, [["language", "en"], ["guide", false]]);
  assert.deepEqual(adapter.getFutureSettingsContracts().map((item) => item.persistence), [
    "future-only",
    "future-only"
  ]);
});

test("adapters do not bind DOM listeners or open IndexedDB directly", async () => {
  const files = [
    "booksAdapter.js",
    "readerAdapter.js",
    "vocabularyAdapter.js",
    "modesAdapter.js",
    "settingsAdapter.js"
  ];

  for (const file of files) {
    const source = await readFile(new URL(`../pwa-reader/adapters/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /indexedDB\.open|window\.indexedDB/);
    assert.doesNotMatch(source, /addEventListener|querySelector|getElementById/);
  }
});

test("createReadingProgressRecord is pure and supports tests without DOM", () => {
  const record = createReadingProgressRecord({
    bookKey: "book",
    chapters: [{ id: "c1", title: "One" }],
    currentChapterId: "c1",
    currentMode: "english-study",
    scrollTop: 1,
    scrollHeight: 11,
    clientHeight: 1,
    now: 10
  });

  assert.deepEqual(record, {
    bookKey: "book",
    currentChapterId: "c1",
    currentChapterIndex: 0,
    currentMode: "english-study",
    progressText: "One · 1 / 1",
    scrollTop: 1,
    scrollRatio: 0.1,
    updatedAt: 10
  });
});
