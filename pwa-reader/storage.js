import { normalizeUserVocabularyProfile, normalizeWord } from "./levelBaselineEngine.js";

const STORAGE_PREFIX = "slash-reader-v2";
const BOOK_DB_NAME = "slash-reader-v2-books";
const BOOK_DB_VERSION = 2;
const BOOK_STORE = "books";
const PROGRESS_STORE = "progress";
const VOCABULARY_PROFILE_STORE = "vocabularyProfile";
const VOCABULARY_PROFILE_KEY = "local";
const DEFAULT_VOCABULARY_LEVEL = "level3";
const DEFAULT_VOCABULARY_CATEGORIES = ["ielts", "fiction", "slang"];
const VALID_VOCABULARY_LEVELS = ["level1", "level2", "level3", "level4", "level5"];
const VOCABULARY_PROFILE_BACKUP_SCHEMA_VERSION = 1;
const VOCABULARY_PROFILE_BACKUP_FIELDS = Object.freeze([
  "schemaVersion",
  "exportedAt",
  "selectedLevel",
  "knownWords",
  "learningWords",
  "ignoredWords",
  "preferredCategories"
]);
const APP_PREFERENCES_KEY = "app-preferences";
const DEFAULT_UI_LANGUAGE = "en";
const VALID_UI_LANGUAGES = ["en", "zh-CN"];
const VALID_GUIDE_VERSIONS = ["english", "chinese", "bilingual"];

// Small wrapper around localStorage so future library/progress data stays namespaced.
function keyFor(name) {
  return `${STORAGE_PREFIX}:${name}`;
}

function isStorageAvailable() {
  try {
    const testKey = keyFor("storage-test");
    window.localStorage.setItem(testKey, "ok");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

export const storage = {
  get(name, fallbackValue = null) {
    if (!isStorageAvailable()) {
      return fallbackValue;
    }

    const rawValue = window.localStorage.getItem(keyFor(name));
    if (rawValue === null) {
      return fallbackValue;
    }

    try {
      return JSON.parse(rawValue);
    } catch (error) {
      console.warn(`Could not parse stored value for ${name}.`, error);
      return fallbackValue;
    }
  },

  set(name, value) {
    if (!isStorageAvailable()) {
      return;
    }

    window.localStorage.setItem(keyFor(name), JSON.stringify(value));
  },

  remove(name) {
    if (!isStorageAvailable()) {
      return;
    }

    window.localStorage.removeItem(keyFor(name));
  }
};

function normalizeUiLanguagePreference(language) {
  const normalized = String(language || "").trim().toLowerCase();

  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return DEFAULT_UI_LANGUAGE;
}


function normalizeGuideVersionPreference(versionId, fallback = "english") {
  const normalized = String(versionId || "").trim().toLowerCase();
  return VALID_GUIDE_VERSIONS.includes(normalized) ? normalized : fallback;
}

export function getDefaultAppPreferences(options = {}) {
  const uiLanguage = normalizeUiLanguagePreference(options.uiLanguage);

  return {
    uiLanguage,
    hasChosenUiLanguage: false,
    guideVisibleInLibrary: true,
    guideVersion: "english",
    hasChosenGuideVersion: false,
    updatedAt: null
  };
}

export function normalizeAppPreferencesForStorage(preferences = {}, now = Date.now()) {
  const safePreferences = preferences && typeof preferences === "object" ? preferences : {};
  const uiLanguage = normalizeUiLanguagePreference(safePreferences.uiLanguage);

  return {
    uiLanguage,
    hasChosenUiLanguage: safePreferences.hasChosenUiLanguage === true,
    guideVisibleInLibrary: safePreferences.guideVisibleInLibrary !== false,
    guideVersion: normalizeGuideVersionPreference(safePreferences.guideVersion, "english"),
    hasChosenGuideVersion: safePreferences.hasChosenGuideVersion === true,
    updatedAt: safePreferences.updatedAt || now
  };
}

export function getAppPreferences(options = {}) {
  const fallback = getDefaultAppPreferences(options);
  const storedPreferences = storage.get(APP_PREFERENCES_KEY, null);

  if (!storedPreferences) {
    return fallback;
  }

  return normalizeAppPreferencesForStorage({
    ...fallback,
    ...storedPreferences
  }, storedPreferences.updatedAt || Date.now());
}

export function saveAppPreferences(preferences = {}) {
  const now = Date.now();
  const normalizedPreferences = normalizeAppPreferencesForStorage(preferences, now);
  storage.set(APP_PREFERENCES_KEY, normalizedPreferences);
  return normalizedPreferences;
}

export function setUiLanguagePreference(language) {
  const currentPreferences = getAppPreferences();
  return saveAppPreferences({
    ...currentPreferences,
    uiLanguage: normalizeUiLanguagePreference(language),
    hasChosenUiLanguage: true,
    updatedAt: Date.now()
  });
}

export function setGuideVisibilityPreference(isVisible) {
  const currentPreferences = getAppPreferences();
  return saveAppPreferences({
    ...currentPreferences,
    guideVisibleInLibrary: isVisible !== false,
    updatedAt: Date.now()
  });
}

export function setGuideVersionPreference(versionId) {
  const currentPreferences = getAppPreferences();
  return saveAppPreferences({
    ...currentPreferences,
    guideVersion: normalizeGuideVersionPreference(versionId, "english"),
    hasChosenGuideVersion: true,
    updatedAt: Date.now()
  });
}

function normalizeKeyPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

export function buildBookKey(input = {}) {
  return [
    normalizeKeyPart(input.fileName || input.name || "book"),
    Number(input.fileSize ?? input.size ?? 0) || 0,
    Number(input.lastModified ?? 0) || 0,
    normalizeKeyPart(input.title || ""),
    normalizeKeyPart(input.author || "")
  ].join(":");
}

export function createStoredBookMetadata(file, book, now = Date.now()) {
  const metadata = {
    bookKey: buildBookKey({
      fileName: file?.name,
      fileSize: file?.size,
      lastModified: file?.lastModified,
      title: book?.title,
      author: book?.author
    }),
    fileName: file?.name || "book.epub",
    fileSize: file?.size || 0,
    fileType: file?.type || "application/epub+zip",
    lastModified: file?.lastModified || 0,
    title: book?.title || file?.name?.replace(/\.epub$/i, "") || "Untitled book",
    author: book?.author || "Unknown author",
    chapterCount: book?.chapters?.length || 0,
    createdAt: now,
    updatedAt: now
  };

  return metadata;
}

export function resolveProgressChapterId(chapters = [], progress = {}) {
  if (!chapters.length) {
    return null;
  }

  if (progress.currentChapterId && chapters.some((chapter) => chapter.id === progress.currentChapterId)) {
    return progress.currentChapterId;
  }

  if (Number.isInteger(progress.currentChapterIndex)) {
    const byZeroBasedIndex = chapters[progress.currentChapterIndex];

    if (byZeroBasedIndex) {
      return byZeroBasedIndex.id;
    }

    const byOneBasedIndex = chapters[progress.currentChapterIndex - 1];

    if (byOneBasedIndex) {
      return byOneBasedIndex.id;
    }
  }

  return chapters[0].id;
}

export function clampScrollRatio(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, numericValue));
}

export function calculateScrollRatio(scrollTop = 0, scrollHeight = 0, clientHeight = 0) {
  const maxScrollTop = Math.max(0, Number(scrollHeight) - Number(clientHeight));

  if (!maxScrollTop) {
    return 0;
  }

  return clampScrollRatio(Number(scrollTop) / maxScrollTop);
}

export function calculateScrollTopFromRatio(scrollRatio = 0, scrollHeight = 0, clientHeight = 0) {
  const maxScrollTop = Math.max(0, Number(scrollHeight) - Number(clientHeight));

  if (!maxScrollTop) {
    return 0;
  }

  return Math.round(clampScrollRatio(scrollRatio) * maxScrollTop);
}

export function shouldRestoreScrollForProgress(progress = {}, chapterId = "") {
  return Boolean(
    progress &&
    progress.scrollRatio !== undefined &&
    (!progress.currentChapterId || progress.currentChapterId === chapterId)
  );
}

export function normalizeReadingProgress(progress = {}, now = Date.now()) {
  const record = {
    ...progress,
    updatedAt: progress.updatedAt || now
  };

  if (progress.scrollRatio !== undefined) {
    record.scrollRatio = clampScrollRatio(progress.scrollRatio);
  }

  if (progress.scrollTop !== undefined) {
    const numericScrollTop = Number(progress.scrollTop);
    record.scrollTop = Number.isFinite(numericScrollTop) ? Math.max(0, numericScrollTop) : 0;
  }

  return record;
}

function normalizeVocabularyLevel(levelId) {
  const normalizedLevel = String(levelId || "").trim();
  return VALID_VOCABULARY_LEVELS.includes(normalizedLevel)
    ? normalizedLevel
    : DEFAULT_VOCABULARY_LEVEL;
}

function normalizePreferredCategories(categories) {
  const sourceCategories = Array.isArray(categories) && categories.length
    ? categories
    : DEFAULT_VOCABULARY_CATEGORIES;
  const seen = new Set();
  const normalizedCategories = [];

  for (const category of sourceCategories) {
    const normalized = String(category || "").trim().toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    normalizedCategories.push(normalized);
  }

  return normalizedCategories.length ? normalizedCategories : [...DEFAULT_VOCABULARY_CATEGORIES];
}

export function normalizeVocabularyProfileForStorage(profile = {}, now = Date.now()) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};
  const normalizedProfile = normalizeUserVocabularyProfile({
    selectedLevel: DEFAULT_VOCABULARY_LEVEL,
    knownWords: [],
    learningWords: [],
    ignoredWords: [],
    preferredCategories: DEFAULT_VOCABULARY_CATEGORIES,
    ...safeProfile
  });

  return {
    ...normalizedProfile,
    selectedLevel: normalizeVocabularyLevel(normalizedProfile.selectedLevel),
    preferredCategories: normalizePreferredCategories(normalizedProfile.preferredCategories),
    updatedAt: safeProfile.updatedAt || now
  };
}

function pickVocabularyProfileBackupFields(profile = {}) {
  return {
    selectedLevel: profile.selectedLevel,
    knownWords: [...(profile.knownWords || [])],
    learningWords: [...(profile.learningWords || [])],
    ignoredWords: [...(profile.ignoredWords || [])],
    preferredCategories: [...(profile.preferredCategories || [])]
  };
}

export function createVocabularyProfileBackup(profile = {}, now = Date.now()) {
  const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const normalizedProfile = normalizeVocabularyProfileForStorage(profile, profile?.updatedAt || timestamp);

  return {
    schemaVersion: VOCABULARY_PROFILE_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date(timestamp).toISOString(),
    ...pickVocabularyProfileBackupFields(normalizedProfile)
  };
}

export function parseVocabularyProfileBackupJson(jsonText = "") {
  let payload;

  try {
    payload = JSON.parse(String(jsonText || ""));
  } catch (error) {
    throw new Error("Vocabulary profile backup must be valid JSON.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Vocabulary profile backup must be valid JSON.");
  }

  if (payload.schemaVersion !== VOCABULARY_PROFILE_BACKUP_SCHEMA_VERSION) {
    throw new Error("Unsupported vocabulary profile backup schema.");
  }

  const allowedFields = new Set(VOCABULARY_PROFILE_BACKUP_FIELDS);
  const unsupportedField = Object.keys(payload).find((key) => !allowedFields.has(key));

  if (unsupportedField) {
    throw new Error(`Unsupported vocabulary profile backup field: ${unsupportedField}`);
  }

  const normalizedProfile = normalizeVocabularyProfileForStorage({
    selectedLevel: payload.selectedLevel,
    knownWords: payload.knownWords,
    learningWords: payload.learningWords,
    ignoredWords: payload.ignoredWords,
    preferredCategories: payload.preferredCategories
  });

  return pickVocabularyProfileBackupFields(normalizedProfile);
}

export function getDefaultVocabularyProfile(now = Date.now()) {
  return normalizeVocabularyProfileForStorage({
    selectedLevel: DEFAULT_VOCABULARY_LEVEL,
    knownWords: [],
    learningWords: [],
    ignoredWords: [],
    preferredCategories: DEFAULT_VOCABULARY_CATEGORIES,
    updatedAt: now
  }, now);
}

export function pickEffectiveUpdatedAt(bookRecord = {}, progressRecord = null) {
  return Math.max(bookRecord?.updatedAt || 0, progressRecord?.updatedAt || 0);
}

export function mergeSavedBookListItem(bookRecord = {}, progressRecord = null) {
  return {
    bookKey: bookRecord.bookKey,
    title: bookRecord.title,
    author: bookRecord.author,
    fileName: bookRecord.fileName,
    chapterCount: bookRecord.chapterCount || 0,
    currentChapterIndex: Number.isInteger(progressRecord?.currentChapterIndex)
      ? progressRecord.currentChapterIndex
      : null,
    currentChapterId: progressRecord?.currentChapterId ?? null,
    progressText: progressRecord?.progressText ?? null,
    updatedAt: pickEffectiveUpdatedAt(bookRecord, progressRecord)
  };
}

export function sortSavedBooksByUpdatedAt(books = []) {
  return [...books].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function formatSavedBookProgressLabel(item = {}) {
  if (item.progressText) {
    return item.progressText;
  }

  if (Number.isInteger(item.currentChapterIndex) && item.chapterCount) {
    return `Chapter ${item.currentChapterIndex + 1} / ${item.chapterCount}`;
  }

  if (item.chapterCount) {
    return `${item.chapterCount} chapters`;
  }

  return "No progress yet";
}

function isIndexedDbAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openBookDatabase() {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(BOOK_DB_NAME, BOOK_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        db.createObjectStore(BOOK_STORE, { keyPath: "bookKey" });
      }

      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: "bookKey" });
      }

      if (!db.objectStoreNames.contains(VOCABULARY_PROFILE_STORE)) {
        db.createObjectStore(VOCABULARY_PROFILE_STORE, { keyPath: "profileKey" });
      }
    };

    request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openBookDatabase();

  try {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return await callback(store);
  } finally {
    db.close();
  }
}

export async function saveStoredBook(file, book) {
  const now = Date.now();
  const metadata = createStoredBookMetadata(file, book, now);
  const record = {
    ...metadata,
    fileBlob: file instanceof Blob ? file.slice(0, file.size, metadata.fileType) : file
  };

  await withStore(BOOK_STORE, "readwrite", (store) => requestToPromise(store.put(record)));
  return metadata;
}

export async function getStoredBook(bookKey) {
  if (!bookKey) {
    return null;
  }

  return withStore(BOOK_STORE, "readonly", (store) => requestToPromise(store.get(bookKey)));
}

export async function getMostRecentStoredBook() {
  const books = await listSavedBooks();

  if (!books.length) {
    return null;
  }

  return getStoredBook(books[0].bookKey);
}

export async function listSavedBooks() {
  const bookRecords = await withStore(BOOK_STORE, "readonly", (store) => requestToPromise(store.getAll()));
  const progressRecords = await withStore(PROGRESS_STORE, "readonly", (store) => requestToPromise(store.getAll()));
  const progressByKey = new Map((progressRecords || []).map((record) => [record.bookKey, record]));

  const items = (bookRecords || []).map((bookRecord) => {
    return mergeSavedBookListItem(bookRecord, progressByKey.get(bookRecord.bookKey));
  });

  return sortSavedBooksByUpdatedAt(items);
}

export async function saveReadingProgress(progress) {
  if (!progress?.bookKey) {
    return null;
  }

  const record = normalizeReadingProgress(progress);

  await withStore(PROGRESS_STORE, "readwrite", (store) => requestToPromise(store.put(record)));
  return record;
}

export async function getReadingProgress(bookKey) {
  if (!bookKey) {
    return null;
  }

  return withStore(PROGRESS_STORE, "readonly", (store) => requestToPromise(store.get(bookKey)));
}

export async function getVocabularyProfile() {
  try {
    const record = await withStore(
      VOCABULARY_PROFILE_STORE,
      "readonly",
      (store) => requestToPromise(store.get(VOCABULARY_PROFILE_KEY))
    );

    if (!record) {
      return getDefaultVocabularyProfile();
    }

    return normalizeVocabularyProfileForStorage(record, record.updatedAt || Date.now());
  } catch (error) {
    if (error?.message?.includes("IndexedDB is not available")) {
      return getDefaultVocabularyProfile();
    }

    throw error;
  }
}

export async function saveVocabularyProfile(profile) {
  const now = Date.now();
  const normalizedProfile = normalizeVocabularyProfileForStorage({
    ...profile,
    updatedAt: now
  }, now);
  const record = {
    profileKey: VOCABULARY_PROFILE_KEY,
    ...normalizedProfile
  };

  await withStore(
    VOCABULARY_PROFILE_STORE,
    "readwrite",
    (store) => requestToPromise(store.put(record))
  );

  return normalizedProfile;
}

export async function setVocabularyComfortLevel(levelId) {
  const profile = await getVocabularyProfile();
  return saveVocabularyProfile({
    ...profile,
    selectedLevel: normalizeVocabularyLevel(levelId)
  });
}

export async function markWordKnown(word) {
  const normalizedWord = normalizeWord(word);
  const profile = await getVocabularyProfile();

  if (!normalizedWord) {
    return profile;
  }

  return saveVocabularyProfile({
    ...profile,
    knownWords: [...profile.knownWords, normalizedWord],
    learningWords: profile.learningWords.filter((item) => item !== normalizedWord),
    ignoredWords: profile.ignoredWords.filter((item) => item !== normalizedWord)
  });
}

export async function addLearningWord(word) {
  const normalizedWord = normalizeWord(word);
  const profile = await getVocabularyProfile();

  if (!normalizedWord) {
    return profile;
  }

  return saveVocabularyProfile({
    ...profile,
    knownWords: profile.knownWords.filter((item) => item !== normalizedWord),
    learningWords: [...profile.learningWords, normalizedWord],
    ignoredWords: profile.ignoredWords.filter((item) => item !== normalizedWord)
  });
}

export async function ignoreVocabularyWord(word) {
  const normalizedWord = normalizeWord(word);
  const profile = await getVocabularyProfile();

  if (!normalizedWord) {
    return profile;
  }

  return saveVocabularyProfile({
    ...profile,
    knownWords: profile.knownWords.filter((item) => item !== normalizedWord),
    learningWords: profile.learningWords.filter((item) => item !== normalizedWord),
    ignoredWords: [...profile.ignoredWords, normalizedWord]
  });
}

export async function restoreVocabularyWord(word) {
  const normalizedWord = normalizeWord(word);
  const profile = await getVocabularyProfile();

  if (!normalizedWord) {
    return profile;
  }

  return saveVocabularyProfile({
    ...profile,
    knownWords: profile.knownWords.filter((item) => item !== normalizedWord),
    learningWords: profile.learningWords.filter((item) => item !== normalizedWord),
    ignoredWords: profile.ignoredWords.filter((item) => item !== normalizedWord)
  });
}

export async function deleteStoredBook(bookKey) {
  if (!bookKey) {
    return;
  }

  await withStore(BOOK_STORE, "readwrite", (store) => requestToPromise(store.delete(bookKey)));
  await withStore(PROGRESS_STORE, "readwrite", (store) => requestToPromise(store.delete(bookKey)));
}
