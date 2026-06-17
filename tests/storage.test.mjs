import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const levelBaselineSource = await readFile(new URL("../pwa-reader/levelBaselineEngine.js", import.meta.url), "utf8");
const levelBaselineModuleUrl = `data:text/javascript;base64,${Buffer.from(levelBaselineSource).toString("base64")}`;
const source = (await readFile(new URL("../pwa-reader/storage.js", import.meta.url), "utf8"))
  .replace('from "./levelBaselineEngine.js";', `from "${levelBaselineModuleUrl}";`);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {
  addLearningWord,
  buildBookKey,
  calculateScrollRatio,
  calculateScrollTopFromRatio,
  clampScrollRatio,
  createStoredBookMetadata,
  formatSavedBookProgressLabel,
  getDefaultVocabularyProfile,
  getReadingProgress,
  getVocabularyProfile,
  ignoreVocabularyWord,
  markWordKnown,
  mergeSavedBookListItem,
  normalizeReadingProgress,
  normalizeVocabularyProfileForStorage,
  pickEffectiveUpdatedAt,
  restoreVocabularyWord,
  resolveProgressChapterId,
  saveReadingProgress,
  saveVocabularyProfile,
  setVocabularyComfortLevel,
  shouldRestoreScrollForProgress,
  sortSavedBooksByUpdatedAt
} = await import(moduleUrl);

function createRequestFromOperation(operation) {
  const request = {
    error: null,
    result: undefined,
    onerror: null,
    onsuccess: null
  };

  queueMicrotask(() => {
    try {
      request.result = operation();
      request.onsuccess?.();
    } catch (error) {
      request.error = error;
      request.onerror?.();
    }
  });

  return request;
}

function createMockStore(storeRecord) {
  return {
    put(record) {
      return createRequestFromOperation(() => {
        const key = record?.[storeRecord.keyPath];

        if (!key) {
          throw new Error(`Missing keyPath ${storeRecord.keyPath}.`);
        }

        storeRecord.rows.set(key, { ...record });
        return key;
      });
    },

    get(key) {
      return createRequestFromOperation(() => {
        const record = storeRecord.rows.get(key);
        return record ? { ...record } : undefined;
      });
    },

    getAll() {
      return createRequestFromOperation(() => {
        return [...storeRecord.rows.values()].map((record) => ({ ...record }));
      });
    },

    delete(key) {
      return createRequestFromOperation(() => {
        storeRecord.rows.delete(key);
        return undefined;
      });
    }
  };
}

function createMockDatabase(databaseRecord) {
  return {
    objectStoreNames: {
      contains(storeName) {
        return databaseRecord.stores.has(storeName);
      }
    },

    createObjectStore(storeName, options = {}) {
      const storeRecord = {
        keyPath: options.keyPath,
        rows: new Map()
      };

      databaseRecord.stores.set(storeName, storeRecord);
      return createMockStore(storeRecord);
    },

    transaction(storeName) {
      const storeRecord = databaseRecord.stores.get(storeName);

      if (!storeRecord) {
        throw new Error(`Missing object store: ${storeName}`);
      }

      return {
        objectStore() {
          return createMockStore(storeRecord);
        }
      };
    },

    close() {}
  };
}

function createMockIndexedDB() {
  const databases = new Map();

  return {
    open(name, version) {
      const request = {
        error: null,
        result: undefined,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null
      };

      queueMicrotask(() => {
        try {
          let databaseRecord = databases.get(name);

          if (!databaseRecord) {
            databaseRecord = {
              version: 0,
              stores: new Map()
            };
            databases.set(name, databaseRecord);
          }

          const oldVersion = databaseRecord.version;
          const targetVersion = version || oldVersion || 1;
          request.result = createMockDatabase(databaseRecord);

          if (targetVersion > oldVersion) {
            databaseRecord.version = targetVersion;
            request.onupgradeneeded?.({ oldVersion, newVersion: targetVersion });
          }

          request.onsuccess?.();
        } catch (error) {
          request.error = error;
          request.onerror?.();
        }
      });

      return request;
    },

    seed(name, version, stores) {
      const seededStores = new Map();

      for (const [storeName, storeConfig] of Object.entries(stores)) {
        seededStores.set(storeName, {
          keyPath: storeConfig.keyPath,
          rows: new Map((storeConfig.records || []).map((record) => [record[storeConfig.keyPath], { ...record }]))
        });
      }

      databases.set(name, {
        version,
        stores: seededStores
      });
    }
  };
}

const bookInput = {
  fileName: "Well Jung.epub",
  fileSize: 12345,
  lastModified: 1710000000000,
  title: "Well Jung",
  author: "C. G. Jung"
};

assert.equal(
  buildBookKey(bookInput),
  buildBookKey({ ...bookInput }),
  "builds a deterministic book key for the same metadata"
);

assert.match(
  buildBookKey(bookInput),
  /^well-jung-epub:12345:1710000000000:well-jung:c-g-jung$/,
  "includes file and metadata parts in a safe key"
);

const metadata = createStoredBookMetadata(
  {
    name: "Well Jung.epub",
    size: 12345,
    type: "application/epub+zip",
    lastModified: 1710000000000
  },
  {
    title: "Well Jung",
    author: "C. G. Jung",
    chapters: [{ id: "preface" }, { id: "chapter-1" }]
  },
  1720000000000
);

assert.deepEqual(
  {
    fileName: metadata.fileName,
    fileSize: metadata.fileSize,
    fileType: metadata.fileType,
    lastModified: metadata.lastModified,
    title: metadata.title,
    author: metadata.author,
    chapterCount: metadata.chapterCount,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt
  },
  {
    fileName: "Well Jung.epub",
    fileSize: 12345,
    fileType: "application/epub+zip",
    lastModified: 1710000000000,
    title: "Well Jung",
    author: "C. G. Jung",
    chapterCount: 2,
    createdAt: 1720000000000,
    updatedAt: 1720000000000
  },
  "creates stable stored book metadata"
);

const chapters = [
  { id: "preface" },
  { id: "chapter-1" },
  { id: "chapter-2" }
];

assert.equal(
  resolveProgressChapterId(chapters, { currentChapterId: "chapter-2", currentChapterIndex: 0 }),
  "chapter-2",
  "restores by chapter id first"
);

assert.equal(
  resolveProgressChapterId(chapters, { currentChapterId: "missing", currentChapterIndex: 1 }),
  "chapter-1",
  "falls back to zero-based chapter index"
);

assert.equal(
  resolveProgressChapterId(chapters, { currentChapterId: "missing", currentChapterIndex: 3 }),
  "chapter-2",
  "falls back to one-based chapter index when needed"
);

assert.equal(
  resolveProgressChapterId(chapters, {}),
  "preface",
  "falls back to first chapter"
);

assert.equal(clampScrollRatio(-0.2), 0, "clamps negative scroll ratios to 0");
assert.equal(clampScrollRatio(1.4), 1, "clamps high scroll ratios to 1");
assert.equal(clampScrollRatio("not a number"), 0, "invalid scroll ratios fall back to 0");

assert.equal(
  calculateScrollRatio(500, 2000, 1000),
  0.5,
  "calculates scroll ratio from scrollTop and scrollable distance"
);

assert.equal(
  calculateScrollRatio(1400, 2000, 1000),
  1,
  "clamps calculated scroll ratio at the bottom"
);

assert.equal(
  calculateScrollRatio(0, 800, 1000),
  0,
  "uses 0 ratio when content is not scrollable"
);

assert.equal(
  calculateScrollTopFromRatio(0.5, 2000, 1000),
  500,
  "restores scrollTop from ratio and scrollable distance"
);

assert.equal(
  calculateScrollTopFromRatio(2, 2000, 1000),
  1000,
  "clamps restored scrollTop to the bottom"
);

assert.deepEqual(
  normalizeReadingProgress({
    bookKey: "book-a",
    currentChapterId: "chapter-1",
    currentChapterIndex: 0,
    scrollTop: -20,
    scrollRatio: 1.5
  }, 6000),
  {
    bookKey: "book-a",
    currentChapterId: "chapter-1",
    currentChapterIndex: 0,
    scrollTop: 0,
    scrollRatio: 1,
    updatedAt: 6000
  },
  "normalizes optional scroll fields on progress records"
);

assert.deepEqual(
  normalizeReadingProgress({
    bookKey: "old-record",
    currentChapterId: "preface",
    currentChapterIndex: 0,
    progressText: "Preface - 1 / 9"
  }, 7000),
  {
    bookKey: "old-record",
    currentChapterId: "preface",
    currentChapterIndex: 0,
    progressText: "Preface - 1 / 9",
    updatedAt: 7000
  },
  "keeps old progress records valid when scroll fields are missing"
);

assert.deepEqual(
  normalizeReadingProgress({
    bookKey: "book-a",
    currentChapterId: "chapter-7",
    currentChapterIndex: 6,
    currentMode: "chinese",
    scrollTop: 420,
    scrollRatio: 0.42
  }, 8000),
  {
    bookKey: "book-a",
    currentChapterId: "chapter-7",
    currentChapterIndex: 6,
    currentMode: "chinese",
    scrollTop: 420,
    scrollRatio: 0.42,
    updatedAt: 8000
  },
  "accepts mode fields without changing chapter or scroll progress"
);

const modeSwitchProgress = normalizeReadingProgress({
  bookKey: "book-a",
  currentChapterId: "chapter-7",
  currentChapterIndex: 6,
  currentMode: "cloze-mixed",
  scrollTop: 420,
  scrollRatio: 0.42,
  progressText: "Bonus Chapter: Processing - 7 / 9"
}, 9000);

assert.equal(modeSwitchProgress.currentChapterId, "chapter-7", "mode switch progress preserves chapter id");
assert.equal(modeSwitchProgress.currentChapterIndex, 6, "mode switch progress preserves chapter index");
assert.equal(modeSwitchProgress.scrollRatio, 0.42, "mode switch progress preserves scroll ratio");

assert.equal(
  shouldRestoreScrollForProgress(modeSwitchProgress, "chapter-7"),
  true,
  "restores scroll when mode changes but chapter stays the same"
);

assert.equal(
  shouldRestoreScrollForProgress(modeSwitchProgress, "chapter-8"),
  false,
  "does not apply old scroll when chapter changes"
);

assert.equal(
  shouldRestoreScrollForProgress({ currentChapterId: "chapter-7", currentChapterIndex: 6 }, "chapter-7"),
  false,
  "old progress records without scroll fields still skip scroll restore safely"
);

const bookRecord = {
  bookKey: "book-a",
  title: "Well Jung",
  author: "C. G. Jung",
  fileName: "Well Jung.epub",
  chapterCount: 9,
  updatedAt: 1000
};

const progressRecord = {
  bookKey: "book-a",
  currentChapterId: "chapter-7",
  currentChapterIndex: 6,
  progressText: "Bonus Chapter: Processing · 7 / 9",
  updatedAt: 5000
};

assert.deepEqual(
  mergeSavedBookListItem(bookRecord, progressRecord),
  {
    bookKey: "book-a",
    title: "Well Jung",
    author: "C. G. Jung",
    fileName: "Well Jung.epub",
    chapterCount: 9,
    currentChapterIndex: 6,
    currentChapterId: "chapter-7",
    progressText: "Bonus Chapter: Processing · 7 / 9",
    updatedAt: 5000
  },
  "merges saved book metadata with progress into a lightweight list item"
);

assert.equal(
  pickEffectiveUpdatedAt(bookRecord, progressRecord),
  5000,
  "uses the latest progress timestamp for recency"
);

assert.deepEqual(
  sortSavedBooksByUpdatedAt([
    { bookKey: "older", updatedAt: 1000 },
    { bookKey: "newer", updatedAt: 3000 },
    { bookKey: "middle", updatedAt: 2000 }
  ]).map((item) => item.bookKey),
  ["newer", "middle", "older"],
  "sorts saved books by updatedAt descending"
);

assert.equal(
  formatSavedBookProgressLabel(progressRecord),
  "Bonus Chapter: Processing · 7 / 9",
  "prefers saved progress text when available"
);

assert.equal(
  formatSavedBookProgressLabel({
    currentChapterIndex: 6,
    chapterCount: 9
  }),
  "Chapter 7 / 9",
  "formats chapter progress when progress text is missing"
);

assert.deepEqual(
  getDefaultVocabularyProfile(1000),
  {
    selectedLevel: "level3",
    knownWords: [],
    learningWords: [],
    ignoredWords: [],
    preferredCategories: ["ielts", "fiction", "slang"],
    updatedAt: 1000
  },
  "returns a normalized default vocabulary profile"
);

assert.deepEqual(
  normalizeVocabularyProfileForStorage({
    selectedLevel: " level4 ",
    knownWords: ["Relentless", "relentless", "  TERM "],
    learningWords: ["Learn"],
    ignoredWords: ["Ignore!"],
    preferredCategories: ["IELTS", "fiction", "ielts"],
    updatedAt: 2000
  }, 3000),
  {
    selectedLevel: "level4",
    knownWords: ["relentless", "term"],
    learningWords: ["learn"],
    ignoredWords: ["ignore"],
    preferredCategories: ["ielts", "fiction"],
    updatedAt: 2000
  },
  "normalizes vocabulary profile fields for storage"
);

assert.equal(
  normalizeVocabularyProfileForStorage({ selectedLevel: "level9" }, 3000).selectedLevel,
  "level3",
  "falls back to level3 for invalid comfort levels"
);

const originalWindow = globalThis.window;
const originalDateNow = Date.now;
const mockIndexedDB = createMockIndexedDB();
globalThis.window = {
  indexedDB: mockIndexedDB,
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {}
  }
};

Date.now = () => 4000;

assert.deepEqual(
  await getVocabularyProfile(),
  {
    selectedLevel: "level3",
    knownWords: [],
    learningWords: [],
    ignoredWords: [],
    preferredCategories: ["ielts", "fiction", "slang"],
    updatedAt: 4000
  },
  "returns the default vocabulary profile when none exists"
);

Date.now = () => 5000;
const savedProfile = await saveVocabularyProfile({
  selectedLevel: " level5 ",
  knownWords: ["Impala", "impala", "Dean"],
  learningWords: ["Relentless", "Impala"],
  ignoredWords: ["The"],
  preferredCategories: ["Fiction", "slang", "fiction"],
  updatedAt: 100
});

assert.deepEqual(
  savedProfile,
  {
    selectedLevel: "level5",
    knownWords: ["impala", "dean"],
    learningWords: ["relentless", "impala"],
    ignoredWords: ["the"],
    preferredCategories: ["fiction", "slang"],
    updatedAt: 5000
  },
  "saveVocabularyProfile normalizes and timestamps the profile"
);

assert.deepEqual(
  await getVocabularyProfile(),
  savedProfile,
  "reads back the saved vocabulary profile"
);

Date.now = () => 6000;
assert.equal(
  (await setVocabularyComfortLevel("level2")).selectedLevel,
  "level2",
  "updates vocabulary comfort level"
);

Date.now = () => 7000;
const knownProfile = await markWordKnown("  Relentless! ");
assert.ok(knownProfile.knownWords.includes("relentless"), "markWordKnown adds normalized known word");
assert.equal(knownProfile.learningWords.includes("relentless"), false, "markWordKnown removes learning word");

Date.now = () => 8000;
const learningProfile = await addLearningWord("Dean");
assert.ok(learningProfile.learningWords.includes("dean"), "addLearningWord adds normalized learning word");
assert.equal(learningProfile.knownWords.includes("dean"), false, "addLearningWord removes known word");

Date.now = () => 9000;
const ignoredProfile = await ignoreVocabularyWord("Dean");
assert.ok(ignoredProfile.ignoredWords.includes("dean"), "ignoreVocabularyWord adds ignored word");
assert.equal(ignoredProfile.learningWords.includes("dean"), false, "ignoreVocabularyWord removes learning word");

Date.now = () => 10000;
const restoredProfile = await restoreVocabularyWord("Dean");
assert.equal(restoredProfile.knownWords.includes("dean"), false, "restoreVocabularyWord removes known word");
assert.equal(restoredProfile.learningWords.includes("dean"), false, "restoreVocabularyWord removes learning word");
assert.equal(restoredProfile.ignoredWords.includes("dean"), false, "restoreVocabularyWord removes ignored word");

mockIndexedDB.seed("slash-reader-v2-books", 1, {
  books: {
    keyPath: "bookKey",
    records: [
      {
        bookKey: "legacy-book",
        title: "Legacy Book",
        author: "Unknown author",
        fileName: "legacy.epub",
        chapterCount: 1,
        updatedAt: 11000
      }
    ]
  },
  progress: {
    keyPath: "bookKey",
    records: [
      {
        bookKey: "legacy-book",
        currentChapterId: "chapter-1",
        currentChapterIndex: 0,
        updatedAt: 11000
      }
    ]
  }
});

Date.now = () => 12000;
await saveVocabularyProfile({ knownWords: ["migration"] });
assert.deepEqual(
  await getReadingProgress("legacy-book"),
  {
    bookKey: "legacy-book",
    currentChapterId: "chapter-1",
    currentChapterIndex: 0,
    updatedAt: 11000
  },
  "database migration keeps old progress records readable"
);

const progressAfterProfileMigration = await saveReadingProgress({
  bookKey: "legacy-book",
  currentChapterId: "chapter-1",
  currentChapterIndex: 0,
  scrollRatio: 0.25
});
assert.equal(progressAfterProfileMigration.scrollRatio, 0.25, "book progress still saves after vocabulary profile migration");

Date.now = originalDateNow;
globalThis.window = originalWindow;

console.log("storage tests passed");
