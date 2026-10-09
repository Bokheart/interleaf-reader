import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getReaderPageSwipeDirection,
  getReaderPageStep,
  readerSwipeIntent,
  locateBookPage,
  pageForOffset,
  measureChapterPages
} from "../pwa-reader/ui-r3/readerLayout.js";
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
  assert.equal("readerAppearance" in record, false);
  assert.equal("pageIndex" in record, false);
  const stale = normalizeReadingProgress({ bookKey: "old", scrollRatio: 0.5, readingLayout: "scroll" });
  assert.equal(stale.scrollRatio, 0.5);
  assert.equal(stale.readingLayout, "scroll");
});

function historyHarness(initial = null, savedEntries = null, savedIndex = 0) {
  const entries = savedEntries || [initial];
  let index = savedIndex;
  const listeners = new Map();
  const history = {
    get state() { return entries[index]; },
    replaceState(entry) { entries[index] = entry; },
    pushState(entry) { entries.splice(++index); entries[index] = entry; },
    go(delta) { const next = index + delta; if (next >= 0 && next < entries.length) { index = next; listeners.get("popstate")?.({ state: entries[index] }); } },
    back() { this.go(-1); },
    forward() { this.go(1); }
  };
  const store = createR3Store();
  let settingsOrigin = R3_ROUTES.HOME;
  const controller = {
    async navigate(screen) {
      if (screen.startsWith("settings.") && !store.getState().activeScreen.startsWith("settings.")) settingsOrigin = store.getState().activeScreen;
      store.dispatch(r3Actions.navigate(screen));
    },
    async returnFromSettings() { store.dispatch(r3Actions.navigate(settingsOrigin)); },
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

test("Page swipe direction maps touch movement to the locked next and previous contract", () => {
  assert.equal(getReaderPageSwipeDirection({ startX: 300, startY: 420, endX: 220, endY: 428, viewportWidth: 393 }), 1);
  assert.equal(getReaderPageSwipeDirection({ startX: 90, startY: 420, endX: 180, endY: 414, viewportWidth: 393 }), -1);
});

test("Page swipe rejects movement below its centralized threshold or dominated by vertical travel", () => {
  assert.equal(getReaderPageSwipeDirection({ startX: 200, startY: 420, endX: 165, endY: 422, viewportWidth: 393 }), 0);
  assert.equal(getReaderPageSwipeDirection({ startX: 260, startY: 300, endX: 190, endY: 410, viewportWidth: 393 }), 0);
});
test("gesture ownership protects edges selection and long press without timing out an owned deliberate swipe", () => {
  const gesture = { startX: 280, startY: 400, startTime: 100, viewportWidth: 393, intent: "pending" };
  assert.equal(readerSwipeIntent(gesture, 275, 402, 120), "pending");
  assert.equal(readerSwipeIntent(gesture, 260, 402, 140), "horizontal");
  assert.equal(readerSwipeIntent({ ...gesture, intent: "horizontal" }, 100, 402, 900), "horizontal");
  assert.equal(readerSwipeIntent(gesture, 260, 402, 480), "rejected");
  assert.equal(readerSwipeIntent({ ...gesture, startX: 10 }, 100, 400, 150), "rejected");
  assert.equal(readerSwipeIntent({ ...gesture, startX: 385 }, 240, 400, 150), "rejected");
  assert.equal(readerSwipeIntent(gesture, 275, 420, 150), "rejected");
  assert.equal(readerSwipeIntent({ ...gesture, intent: "rejected" }, 100, 400, 150), "rejected");
  const reasons = [];
  readerSwipeIntent({ ...gesture, startX: 10 }, 100, 400, 150, reason => reasons.push(reason));
  readerSwipeIntent(gesture, 260, 402, 480, reason => reasons.push(reason));
  assert.deepEqual(reasons, ["native-edge", "pending-expired"]);
});

test("Page step follows the rendered column gap so wide margins cannot reveal the next page", () => {
  assert.equal(getReaderPageStep(640, 120), 760);
  assert.equal(getReaderPageStep(345, "normal"), 393);
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

test("Temporary Settings returns to live Reader A without a stale Forward entry", async () => {
  const h = historyHarness();
  await h.controller.selectBook("book-b");
  await h.controller.selectBook("book-a");
  await h.controller.navigate(R3_ROUTES.SETTINGS_HOME);
  assert.equal(h.entries.length, 3, "Settings owns one temporary entry over its origin");
  assert.equal(h.bridge.backFromSettings(), true);
  await settle();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(h.store.getState().activeBookId, "book-a");
  h.history.forward(); await settle();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(h.history.state.interleafR3.screen, R3_ROUTES.READER);
  h.history.back(); await settle();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.HOME);
});

for (const origin of Object.values(R3_ROUTES).filter(route => !route.startsWith("settings."))) {
  for (const native of [true, false]) test(`Settings ${native ? "native Back" : "Return"} preserves ${origin} through nested screens and Forward`, async () => {
    const h = historyHarness();
    if (origin === R3_ROUTES.READER) { await h.controller.selectBook("a"); await h.controller.selectBook("b"); }
    else await h.controller.navigate(origin);
    const originLength = h.entries.length;
    await h.controller.navigate(R3_ROUTES.SETTINGS_HOME);
    await h.controller.navigate(R3_ROUTES.SETTINGS_LANGUAGE);
    await h.controller.navigate(R3_ROUTES.SETTINGS_APPEARANCE);
    assert.equal(h.entries.length, originLength + 1);
    if (native) h.history.back(); else assert.equal(h.bridge.backFromSettings(), true);
    await settle();
    assert.equal(h.store.getState().activeScreen, origin);
    if (origin === R3_ROUTES.READER) assert.equal(h.store.getState().activeBookId, "b");
    h.history.forward(); await settle();
    assert.equal(h.store.getState().activeScreen, origin);
    assert.equal(h.history.state.interleafR3.screen, origin);
  });
}

test("legacy Settings Forward entries normalize to their live origin", async () => {
  const h = historyHarness(); await h.controller.selectBook("b");
  h.history.pushState({ interleafR3: { screen: R3_ROUTES.SETTINGS_HOME } });
  h.history.back(); await settle(); h.history.forward(); await settle();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(h.store.getState().activeBookId, "b");
  assert.equal(h.history.state.interleafR3.screen, R3_ROUTES.READER);
});

test("dismissal survives reload at the origin before Forward", async () => {
  const h = historyHarness(); await h.controller.selectBook("b");
  await h.controller.navigate(R3_ROUTES.SETTINGS_HOME); h.history.back(); await settle();
  const saved = structuredClone(h.entries), restored = historyHarness(saved[1], saved, 1);
  await restored.bridge.restoreInitial(); restored.history.forward(); await settle();
  assert.equal(restored.store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(restored.store.getState().activeBookId, "b");
});

test("Settings reopened from a consumed Forward slot retains origin and normal Reader Back", async () => {
  const h = historyHarness(); await h.controller.navigate(R3_ROUTES.LIBRARY); await h.controller.selectBook("b");
  for (let repeat = 0; repeat < 3; repeat += 1) {
    await h.controller.navigate(R3_ROUTES.SETTINGS_HOME);
    // Direct controller callers and the UI bridge must share dismissal semantics.
    await h.controller.returnFromSettings(); await settle();
    assert.equal(h.store.getState().activeScreen, R3_ROUTES.READER);
    h.history.forward(); await settle();
    assert.equal(h.store.getState().activeBookId, "b");
    assert.equal(h.store.getState().activeScreen, R3_ROUTES.READER);
  }
  h.history.back(); await settle();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.LIBRARY);
});

test("unidentified legacy Settings reload falls back safely instead of reopening Settings", async () => {
  const h = historyHarness({ interleafR3: { screen: R3_ROUTES.SETTINGS_LANGUAGE } });
  await h.bridge.restoreInitial();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.HOME);
  assert.equal(h.history.state.interleafR3.screen, R3_ROUTES.HOME);
});

test("Reader Page columns retain selectable source prose and reserve stable device safe areas and minimal HUD space", async () => {
  const css = await readFile(new URL("../pwa-reader/ui-r3/styles/base.css", import.meta.url), "utf8");
  for (const selector of ["header", "footer", "scroll"]) {
    assert.match(css, new RegExp(`\\.r3-reader-${selector} \\{\\s+position: absolute;`));
  }
  assert.match(css, /column-fill: auto/);
  assert.doesNotMatch(css, /user-select:\s*none/);
  assert.match(css, /--r3-reader-page-safe-top:/);
  assert.match(css, /--r3-reader-page-safe-bottom:/);
  assert.match(css, /\.r3-reader-scroll\[data-layout="page"\][\s\S]*padding-top:\s*var\(--r3-reader-page-safe-top\)/);
  assert.match(css, /\.r3-reader-scroll\[data-layout="page"\][\s\S]*padding-bottom:\s*var\(--r3-reader-page-safe-bottom\)/);
  assert.match(css, /column-gap:\s*calc\(48px \+ var\(--r3-reader-margin-inline\)\)/);
});
