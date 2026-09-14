import { loadEpubFromFile } from "../epubLoader.js";
import { normalizeChapterList } from "../navigationEngine.js";
import {
  deleteStoredBook,
  formatSavedBookProgressLabel,
  getMostRecentStoredBook,
  getReadingProgress,
  getStoredBook,
  listSavedBooks,
  saveStoredBook
} from "../storage.js";

function toBookListItem(book = {}) {
  return {
    ...book,
    progressLabel: formatSavedBookProgressLabel(book)
  };
}

function toBookDetail(savedBook = null, progress = null) {
  if (!savedBook) {
    return null;
  }

  const { fileBlob, ...book } = savedBook;

  return {
    ...book,
    hasFileBlob: Boolean(fileBlob),
    progress
  };
}

function hasCompatibleReadingProgress(savedBook = {}, progress = null) {
  if (!savedBook?.bookKey || !progress || typeof progress !== "object") {
    return false;
  }

  if (progress.bookKey !== savedBook.bookKey) {
    return false;
  }

  return Boolean(
    typeof progress.currentChapterId === "string" && progress.currentChapterId.trim()
      || Number.isInteger(progress.currentChapterIndex)
  );
}

export function createBooksAdapter(deps = {}) {
  const api = {
    loadEpubFromFile: deps.loadEpubFromFile || loadEpubFromFile,
    normalizeChapterList: deps.normalizeChapterList || normalizeChapterList,
    saveStoredBook: deps.saveStoredBook || saveStoredBook,
    listSavedBooks: deps.listSavedBooks || listSavedBooks,
    getMostRecentStoredBook: deps.getMostRecentStoredBook || getMostRecentStoredBook,
    getStoredBook: deps.getStoredBook || getStoredBook,
    getReadingProgress: deps.getReadingProgress || getReadingProgress,
    deleteStoredBook: deps.deleteStoredBook || deleteStoredBook
  };

  return {
    async listBooks() {
      const books = await api.listSavedBooks();
      return books.map(toBookListItem);
    },

    async importBook(file, options = {}) {
      const result = await api.loadEpubFromFile(file, options.loaderOptions || {});
      const book = {
        ...result.book,
        chapters: api.normalizeChapterList(result.book?.chapters || [])
      };
      const shouldPersist = options.persist !== false;
      const storedMetadata = shouldPersist
        ? await api.saveStoredBook(file, book)
        : null;

      return {
        handle: result.handle,
        book,
        storedMetadata
      };
    },

    async getContinueReading() {
      const savedBook = await api.getMostRecentStoredBook();

      if (!savedBook?.fileBlob) {
        return null;
      }

      const progress = await api.getReadingProgress(savedBook.bookKey);
      if (!hasCompatibleReadingProgress(savedBook, progress)) {
        return null;
      }

      return toBookDetail(savedBook, progress);
    },

    async getBookDetail(bookKey) {
      const savedBook = await api.getStoredBook(bookKey);

      if (!savedBook) {
        return null;
      }

      const progress = await api.getReadingProgress(bookKey);
      return toBookDetail(savedBook, progress);
    },

    async forgetBook(bookKey) {
      await api.deleteStoredBook(bookKey);
      return { bookKey };
    }
  };
}

const booksAdapter = createBooksAdapter();

export const listBooks = booksAdapter.listBooks;
export const importBook = booksAdapter.importBook;
export const getContinueReading = booksAdapter.getContinueReading;
export const getBookDetail = booksAdapter.getBookDetail;
export const forgetBook = booksAdapter.forgetBook;
