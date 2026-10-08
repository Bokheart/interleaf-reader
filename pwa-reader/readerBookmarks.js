import { storage } from "./storage.js";

const STORAGE_KEY = "reader-bookmarks-v1";
const keyForBook = bookKey => `${STORAGE_KEY}:${bookKey}`;

function validBookmark(item, bookKey) {
  return item && typeof item.id === "string" && item.id.length > 0
    && item.bookKey === bookKey && typeof item.chapterId === "string" && item.chapterId.length > 0
    && Number.isInteger(item.textOffset) && item.textOffset >= 0
    && typeof item.chapterTitle === "string" && Number.isFinite(item.createdAt);
}

export function createReaderBookmarkStore(backing = storage, options = {}) {
  const now = options.now || Date.now;
  const createId = options.createId || (() => globalThis.crypto?.randomUUID?.()
    || `${now()}-${Math.random().toString(36).slice(2)}`);

  function list(bookKey) {
    if (typeof bookKey !== "string" || !bookKey) return [];
    const records = backing.get(keyForBook(bookKey), []);
    return Array.isArray(records) ? records.filter(item => validBookmark(item, bookKey))
      .map(item => ({ id: item.id, bookKey, chapterId: item.chapterId,
        textOffset: item.textOffset, chapterTitle: item.chapterTitle, createdAt: item.createdAt })) : [];
  }

  function save(bookKey, records) {
    backing.set(keyForBook(bookKey), records);
    if (JSON.stringify(list(bookKey)) !== JSON.stringify(records)) {
      throw new Error("Bookmarks could not be saved on this device.");
    }
    return records;
  }

  return {
    list,
    toggle(anchor) {
      if (!anchor?.bookKey || !anchor.chapterId || !Number.isInteger(anchor.textOffset)
        || anchor.textOffset < 0) return list(anchor?.bookKey);
      const current = list(anchor.bookKey);
      const existing = current.find(item => item.chapterId === anchor.chapterId
        && item.textOffset === anchor.textOffset);
      if (existing) return save(anchor.bookKey, current.filter(item => item.id !== existing.id));
      const record = { id: createId(), bookKey: anchor.bookKey, chapterId: anchor.chapterId,
        textOffset: anchor.textOffset, chapterTitle: String(anchor.chapterTitle || ""), createdAt: now() };
      return save(anchor.bookKey, [...current, record]);
    },
    remove(bookKey, id) {
      return save(bookKey, list(bookKey).filter(item => item.id !== id));
    }
  };
}

const bookmarkStore = createReaderBookmarkStore();
export const list = bookmarkStore.list;
export const toggle = bookmarkStore.toggle;
export const remove = bookmarkStore.remove;
