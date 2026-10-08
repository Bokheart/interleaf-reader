import test from "node:test";
import assert from "node:assert/strict";
import { createReaderBookmarkStore } from "../pwa-reader/readerBookmarks.js";

test("bookmarks persist source anchors per book without page or progress fields", () => {
  const data = new Map();
  const backing = {
    get(key, fallback) { return data.has(key) ? JSON.parse(data.get(key)) : fallback; },
    set(key, value) { data.set(key, JSON.stringify(value)); }
  };
  const first = createReaderBookmarkStore(backing, { now: () => 123, createId: () => "one" });
  const anchor = { bookKey: "a", chapterId: "c2", textOffset: 54, chapterTitle: "Two", pageIndex: 9 };
  first.toggle(anchor);
  assert.deepEqual(first.list("a"), [{ id: "one", bookKey: "a", chapterId: "c2",
    textOffset: 54, chapterTitle: "Two", createdAt: 123 }]);
  assert.deepEqual(first.list("b"), []);
  const reloaded = createReaderBookmarkStore(backing);
  assert.equal(reloaded.list("a").length, 1);
  reloaded.toggle(anchor);
  assert.deepEqual(reloaded.list("a"), []);
});

test("bookmark delete ignores another book and malformed stored records", () => {
  const data = new Map();
  const backing = {
    get(key, fallback) { return data.has(key) ? JSON.parse(data.get(key)) : fallback; },
    set(key, value) { data.set(key, JSON.stringify(value)); }
  };
  const bookmarks = createReaderBookmarkStore(backing, { now: () => 1, createId: () => "mark" });
  bookmarks.toggle({ bookKey: "a", chapterId: "c1", textOffset: 0, chapterTitle: "One" });
  bookmarks.remove("b", "mark");
  assert.equal(bookmarks.list("a").length, 1);
  data.set("reader-bookmarks-v1:a", JSON.stringify([
    { id: "mark", bookKey: "a", chapterId: "c1", textOffset: 0, chapterTitle: "One", createdAt: 1 },
    { id: "bad", bookKey: "b", chapterId: "c2", textOffset: -1 }
  ]));
  assert.equal(bookmarks.list("a").length, 1);
  bookmarks.remove("a", "mark");
  assert.deepEqual(bookmarks.list("a"), []);
});
