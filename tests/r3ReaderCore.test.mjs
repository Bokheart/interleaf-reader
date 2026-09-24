import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { locateBookPage, pageForOffset, measureChapterPages } from "../pwa-reader/ui-r3/readerLayout.js";
import { bindReaderHistory } from "../pwa-reader/ui-r3/readerHistory.js";
import { createR3Store } from "../pwa-reader/ui-r3/store.js";
import { r3Actions } from "../pwa-reader/ui-r3/actions.js";
import { R3_ROUTES } from "../pwa-reader/ui-r3/routes.js";
import { createReadingProgressRecord } from "../pwa-reader/readerProgress.js";
import { normalizeReadingProgress } from "../pwa-reader/storage.js";

test("Book-page indexing crosses chapters and clamps without persisting page numbers", () => {
  const chapters = [{ id: "a", index: 0, pages: [0, 100, 210] }, { id: "b", index: 1, pages: [0, 140] }];
  assert.deepEqual(locateBookPage(chapters, 2), { chapterIndex: 0, position: { chapterId: "a", textOffset: 210 } });
  assert.deepEqual(locateBookPage(chapters, 3), { chapterIndex: 1, position: { chapterId: "b", textOffset: 0 } });
  assert.equal(locateBookPage(chapters, 999).position.textOffset, 140);
  assert.equal(locateBookPage(chapters, -1).position.textOffset, 0);
  assert.equal(locateBookPage([], 1), null);
  assert.equal(pageForOffset(chapters[0].pages, 100), 1);
  assert.equal(pageForOffset([0, 50, 110, 170], 125), 2); // viewport changed; same logical offset
});

test("Existing progress overrides preserve logical anchors and old fields without making layout durable", () => {
  const record = normalizeReadingProgress(createReadingProgressRecord({ bookKey: "book", chapters: [{ id: "a" }], currentChapterId: "a",
    scrollTop: 20, scrollHeight: 200, clientHeight: 100,
    overrides: { logicalPosition: { chapterId: "a", textOffset: 210 } }
  }));
  assert.deepEqual(record.logicalPosition, { chapterId: "a", textOffset: 210 });
  assert.equal(record.scrollRatio, 0.2);
  assert.equal(record.currentChapterId, "a");
  assert.equal("readingLayout" in record, false);
  assert.equal("pageIndex" in record, false);
  const stale = normalizeReadingProgress({ bookKey: "old", scrollRatio: 0.5, readingLayout: "scroll" });
  assert.equal(stale.scrollRatio, 0.5);
  assert.equal(stale.readingLayout, "scroll");
});

function historyHarness(initial = null) {
  const entries = [initial];
  let index = 0;
  const listeners = new Map();
  const history = {
    get state() { return entries[index]; },
    replaceState(entry) { entries[index] = entry; },
    pushState(entry) { entries.splice(++index); entries[index] = entry; },
    back() { if (index) { index -= 1; listeners.get("popstate")?.({ state: entries[index] }); } },
    forward() { if (index < entries.length - 1) { index += 1; listeners.get("popstate")?.({ state: entries[index] }); } }
  };
  const store = createR3Store();
  const controller = {
    async navigate(screen) { store.dispatch(r3Actions.navigate(screen)); },
    async selectBook(bookId) {
      store.dispatch(r3Actions.setActiveBook({ bookId }));
      store.dispatch(r3Actions.navigate(R3_ROUTES.READER));
    }
  };
  const bridge = bindReaderHistory({ history, addEventListener: (key, value) => listeners.set(key, value), removeEventListener: key => listeners.delete(key) }, store, controller);
  return { entries, history, store, controller, bridge };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("Viewport page boundaries use rendered ranges and survive vocabulary wrapper changes", () => {
  const rect = offset => ({ left: Math.floor(offset / 50) * 393 + 24, top: offset % 50, bottom: offset % 50 + 1 });
  const node = (start, length) => ({ nodeType: 3, textContent: "a".repeat(length), start });
  const document = { createRange() {
    let start = 0;
    return { setStart(node, offset) { start = node.start + offset; }, setEnd() {}, getClientRects: () => [rect(start)] };
  } };
  const content = { scrollWidth: 1524, ownerDocument: document, childNodes: [node(0, 200)], getBoundingClientRect: () => rect(0) };
  assert.deepEqual(measureChapterPages(content, 393), [0, 50, 100, 150]);
  content.childNodes = [node(0, 70), { tagName: "BUTTON", childNodes: [node(70, 20)] }, node(90, 110)];
  assert.deepEqual(measureChapterPages(content, 393), [0, 50, 100, 150]);
  content.scrollWidth = 345;
  assert.deepEqual(measureChapterPages(content, 393), [0]);
});

test("Reader creates one internal entry; native Back returns to Library and Forward restores the book", async () => {
  const { entries, history, store, controller, bridge } = historyHarness();
  await controller.navigate(R3_ROUTES.LIBRARY);
  await controller.selectBook("book");
  assert.equal(entries.length, 2);
  store.dispatch(r3Actions.setActiveChapter("next", 2));
  assert.equal(entries.length, 2);
  history.back(); await settle();
  assert.equal(store.getState().activeScreen, R3_ROUTES.LIBRARY);
  history.forward(); await settle();
  assert.equal(store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(store.getState().activeBookId, "book");
  assert.equal(bridge.back(), true); await settle();
  assert.equal(store.getState().activeScreen, R3_ROUTES.LIBRARY);
  assert.equal(entries.length, 2);
});

test("Reader reload retains its internal entry and no-history Back uses the explicit fallback", async () => {
  const existing = { interleafR3: { screen: R3_ROUTES.READER, bookId: "saved", returnScreen: R3_ROUTES.HOME } };
  const h = historyHarness(existing);
  await h.bridge.restoreInitial();
  assert.equal(h.entries.length, 1);
  assert.equal(h.history.state.interleafR3.bookId, "saved");
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.READER);
  const fresh = historyHarness();
  assert.equal(fresh.bridge.back(), false);
});

test("Rapid history events serialize and leave the latest requested screen visible", async () => {
  const h = historyHarness();
  await h.controller.navigate(R3_ROUTES.LIBRARY);
  await h.controller.selectBook("book");
  h.history.back(); h.history.forward(); h.history.back();
  await settle();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.LIBRARY);
  assert.equal(h.entries.length, 2);
});

test("Reader chrome is overlay-only and Page columns retain selectable source prose", async () => {
  const css = await readFile(new URL("../pwa-reader/ui-r3/styles/base.css", import.meta.url), "utf8");
  for (const selector of ["header", "footer", "scroll"]) {
    assert.match(css, new RegExp(`\\.r3-reader-${selector} \\{\\s+position: absolute;`));
  }
  assert.match(css, /column-fill: auto/);
  assert.doesNotMatch(css, /user-select:\s*none/);
});
