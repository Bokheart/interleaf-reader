import { getChapterIndex, getAdjacentChapterIndex } from "../navigationEngine.js";
import { createReadingProgressRecord, resolveRestoredScrollTop } from "../readerProgress.js";
import {
  getMostRecentStoredBook,
  getReadingProgress,
  getStoredBook,
  saveReadingProgress
} from "../storage.js";

function defaultCreateFile(parts, name, options) {
  return new File(parts, name, options);
}

function createOpenPayload(savedBook, progress, createFile) {
  if (!savedBook?.fileBlob) {
    throw new Error("Saved EPUB file data is missing.");
  }

  const file = createFile([savedBook.fileBlob], savedBook.fileName || "saved-book.epub", {
    type: savedBook.fileType || "application/epub+zip",
    lastModified: savedBook.lastModified || Date.now()
  });

  return {
    bookKey: savedBook.bookKey,
    savedBook,
    progress,
    file
  };
}

export { createReadingProgressRecord, resolveRestoredScrollTop };

export function createReaderAdapter(deps = {}) {
  const api = {
    getStoredBook: deps.getStoredBook || getStoredBook,
    getMostRecentStoredBook: deps.getMostRecentStoredBook || getMostRecentStoredBook,
    getReadingProgress: deps.getReadingProgress || getReadingProgress,
    saveReadingProgress: deps.saveReadingProgress || saveReadingProgress,
    createFile: deps.createFile || defaultCreateFile,
    now: deps.now || Date.now
  };

  return {
    async openBook(bookKey) {
      const savedBook = await api.getStoredBook(bookKey);
      const progress = await api.getReadingProgress(bookKey);
      return createOpenPayload(savedBook, progress, api.createFile);
    },

    async resumeBook(bookKey = null) {
      const savedBook = bookKey
        ? await api.getStoredBook(bookKey)
        : await api.getMostRecentStoredBook();
      const progress = await api.getReadingProgress(savedBook?.bookKey);
      return createOpenPayload(savedBook, progress, api.createFile);
    },

    getTableOfContents(book = {}, currentChapterId = "") {
      return (book.chapters || []).map((chapter, index) => ({
        id: chapter.id,
        title: chapter.title,
        index,
        isCurrent: chapter.id === currentChapterId
      }));
    },

    getAdjacentChapter(chapters = [], currentChapterId = "", direction = "next") {
      const currentIndex = getChapterIndex(chapters, currentChapterId);
      const adjacentIndex = getAdjacentChapterIndex(currentIndex, chapters.length, direction);

      if (adjacentIndex === -1) {
        return null;
      }

      return {
        chapter: chapters[adjacentIndex],
        index: adjacentIndex,
        direction
      };
    },

    restorePosition(progress = {}, chapterId = "", metrics = {}) {
      return resolveRestoredScrollTop(progress, chapterId, metrics);
    },

    async savePosition(options = {}) {
      const record = createReadingProgressRecord({
        ...options,
        now: api.now()
      });
      return api.saveReadingProgress(record);
    }
  };
}

const readerAdapter = createReaderAdapter();

export const openBook = readerAdapter.openBook;
export const resumeBook = readerAdapter.resumeBook;
export const getTableOfContents = readerAdapter.getTableOfContents;
export const getAdjacentChapter = readerAdapter.getAdjacentChapter;
export const restorePosition = readerAdapter.restorePosition;
export const savePosition = readerAdapter.savePosition;
