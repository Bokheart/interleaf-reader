import test from "node:test";
import assert from "node:assert/strict";
import { createModesAdapter } from "../pwa-reader/adapters/modesAdapter.js";
import { createReaderAdapter } from "../pwa-reader/adapters/readerAdapter.js";
import { createBooksAdapter } from "../pwa-reader/adapters/booksAdapter.js";
import { normalizeReadingProgress } from "../pwa-reader/storage.js";
import { createR3Controller } from "../pwa-reader/ui-r3/controller.js";
import { createR3Store } from "../pwa-reader/ui-r3/store.js";
import { GUIDE_BOOK_KEY } from "../pwa-reader/guideBook.js";
import { r3Actions } from "../pwa-reader/ui-r3/actions.js";

const modes = ["english-study", "chinese", "cloze-mixed"];
const metrics = { scrollTop: 100, scrollHeight: 1000, clientHeight: 500 };

function fixtureBook(key) {
  return {
    bookKey: key, title: key, fileBlob: new Blob(["safe fixture"]), fileName: key + ".epub",
    chapters: [{ id: key + "-1", title: "One", plainText: "Original safe source text.",
      originalHtml: "<p>Original safe source text.</p>" }]
  };
}

function harness({ records = [], globalMode = null, layout = "page" } = {}) {
  const progress = new Map(records.map(record => [record.bookKey, structuredClone(record)]));
  const books = new Map(["A", "B", "C", "new"].map(key => [key, fixtureBook(key)]));
  const globals = new Map([["last-mode", globalMode]]);
  const writes = [];
  let preferences = { uiLanguage: "en", hasChosenUiLanguage: true, readingLayout: layout };
  const profile = { selectedLevel: "level1", knownWords: [], learningWords: [], ignoredWords: [] };
  const persistence = {
    getStoredBook: async key => structuredClone(books.get(key)),
    getMostRecentStoredBook: async () => structuredClone(books.get("A")),
    getReadingProgress: async key => structuredClone(progress.get(key)),
    listSavedBooks: async () => [...books.values()].map(book => structuredClone(book)),
    saveReadingProgress: async record => {
      const saved = normalizeReadingProgress(record);
      writes.push(structuredClone(saved));
      progress.set(saved.bookKey, structuredClone(saved));
      return saved;
    }
  };
  const modeAdapter = createModesAdapter({
    storage: { get: key => globals.get(key) },
    // Substitute DOM annotation only; use production availability and resolution.
    renderChapterForMode: (chapter, mode, options) => ({
      html: options.isBuiltInGuide || mode === "english-study"
        ? chapter.originalHtml : "<p>Translation is not implemented yet.</p>",
      vocabularyPreview: []
    })
  });
  const adapters = {
    reader: createReaderAdapter({ ...persistence,
      createFile: (_parts, name) => ({ name }), now: () => 42 }),
    books: createBooksAdapter(persistence),
    modes: modeAdapter,
    settings: {
      getPreferences: () => preferences,
      setReadingLayout: value => (preferences = { ...preferences, readingLayout: value })
    },
    vocabulary: { getReaderVocabulary: async () => ({ items: [], profile: structuredClone(profile) }) }
  };
  function fresh() {
    const store = createR3Store();
    const controller = createR3Controller({ store, adapters, timers: {
      setTimeout: () => 1, clearTimeout() {}
    }, readerRuntime: {
      loadEpubFromFile: async file => ({ book: fixtureBook(file.name.replace(".epub", "")),
        handle: { destroy() {} } }),
      loadChapterContent: async (_handle, chapter) => chapter
    } });
    return { store, controller };
  }
  return { ...fresh(), fresh, adapters, progress, books, globals, writes, profile };
}

function record(bookKey, currentMode, textOffset = 12) {
  return { bookKey, currentMode, currentChapterId: bookKey + "-1", currentChapterIndex: 0,
    logicalPosition: { chapterId: bookKey + "-1", textOffset }, scrollRatio: 0.3 };
}

for (const [perBook, globalMode, expected] of [
  ["english-study", "chinese", "english-study"],
  ["chinese", "cloze-mixed", "chinese"],
  [undefined, "cloze-mixed", "cloze-mixed"],
  ["invalid", "chinese", "chinese"],
  [null, "bad-global", "english-study"],
  [undefined, null, "english-study"]
]) {
  test("resolution: " + JSON.stringify([perBook, globalMode, expected]), () => {
    const h = harness({ globalMode });
    assert.equal(h.adapters.modes.resolveModeFromProgress({ currentMode: perBook }), expected);
    assert.equal(h.adapters.modes.resolveModeFromProgress(null, "invalid"), "english-study");
  });
}

test("A/B/A and all three modes round trip through production progress adapters and reload", async () => {
  const h = harness({ globalMode: "cloze-mixed" });
  for (const [index, key] of ["A", "B", "C"].entries()) {
    await h.adapters.reader.savePosition({ bookKey: key, chapters: h.books.get(key).chapters,
      currentChapterId: key + "-1", currentMode: modes[index],
      overrides: { logicalPosition: { chapterId: key + "-1", textOffset: 20 + index } } });
  }
  for (const key of ["A", "B", "A", "C", "B"]) {
    await h.controller.selectBook(key);
    await h.controller.flushReaderProgress();
    const expected = modes[["A", "B", "C"].indexOf(key)];
    assert.equal(h.store.getState().activeReadingMode, expected);
    assert.equal(h.progress.get(key).currentMode, expected);
  }
  const reloaded = h.fresh();
  await reloaded.controller.resumeBook("B");
  assert.equal(reloaded.store.getState().activeReadingMode, "chinese");
  assert.deepEqual(reloaded.store.getState().reader.positionRequest.position,
    { chapterId: "B-1", textOffset: 21 });
  assert.equal(h.progress.get("A").currentMode, "english-study");
  assert.equal(h.progress.get("C").currentMode, "cloze-mixed");
});

test("missing/invalid progress uses persisted global, never the in-memory active mode", async () => {
  const h = harness({ globalMode: "chinese", records: [record("A", "cloze-mixed"), record("B", "invalid")] });
  await h.controller.selectBook("A");
  await h.controller.selectBook("new");
  assert.equal(h.store.getState().activeReadingMode, "chinese");
  await h.controller.selectBook("B");
  assert.equal(h.store.getState().activeReadingMode, "chinese");
  h.globals.set("last-mode", "invalid");
  h.store.dispatch(r3Actions.setActiveMode("cloze-mixed"));
  await h.controller.selectBook("C");
  assert.equal(h.store.getState().activeReadingMode, "english-study");
});

test("Guide and imported modes stay independent and Guide remains outside imported Library/profile", async () => {
  const h = harness({ globalMode: "english-study", records: [record("A", "cloze-mixed")] });
  const beforeBooks = structuredClone([...h.books.values()]);
  const beforeProfile = structuredClone(h.profile);
  await h.controller.openGuide();
  await h.controller.setReaderMode("chinese");
  await h.controller.flushReaderProgress();
  assert.equal(h.progress.get(GUIDE_BOOK_KEY).currentMode, "chinese");
  await h.controller.selectBook("new");
  assert.equal(h.store.getState().activeReadingMode, "english-study");
  await h.controller.selectBook("A");
  assert.equal(h.store.getState().activeReadingMode, "cloze-mixed");
  await h.controller.openGuide();
  assert.equal(h.store.getState().activeReadingMode, "chinese");
  await h.controller.setReaderMode("cloze-mixed");
  await h.controller.flushReaderProgress();
  const reload = h.fresh();
  await reload.controller.openGuide();
  assert.equal(reload.store.getState().activeReadingMode, "cloze-mixed");
  assert.equal(h.globals.get("last-mode"), "english-study");
  assert.deepEqual(await h.adapters.books.listBooks(), beforeBooks.map(book => ({ ...book, progressLabel: "No progress yet" })));
  assert.deepEqual([...h.books.values()], beforeBooks);
  assert.deepEqual(h.profile, beforeProfile);
  assert.ok(!h.books.has(GUIDE_BOOK_KEY));
});

for (const layout of ["page", "scroll"]) {
  test(layout + ": unavailable representation cannot overwrite the source anchor; English recovery preserves it", async () => {
    const h = harness({ layout, records: [record("B", "chinese", 67)] });
    await h.controller.selectBook("B");
    assert.equal(h.store.getState().reader.requestedMode, "chinese");
    assert.equal(h.store.getState().reader.effectiveMode, null);
    assert.equal(h.store.getState().reader.representationStatus, "placeholder-unavailable");
    assert.match(h.store.getState().reader.html, /not implemented/);
    h.controller.recordReaderPosition({ chapterId: "B-1", textOffset: 3 }, metrics);
    await h.controller.seekReaderPosition(0, { chapterId: "B-1", textOffset: 4 });
    h.controller.recordReaderScroll(metrics);
    await h.controller.setReadingLayout(layout === "page" ? "scroll" : "page");
    await h.controller.flushReaderProgress();
    assert.deepEqual(h.progress.get("B").logicalPosition, { chapterId: "B-1", textOffset: 67 });
    assert.equal(h.progress.get("B").currentMode, "chinese");
    h.controller.openReaderMode();
    await h.controller.setReaderMode("cloze-mixed");
    assert.equal(h.store.getState().activeReadingMode, "chinese"); // availability still enforced
    await h.controller.setReaderMode("english-study");
    assert.equal(h.store.getState().reader.effectiveMode, "english-study");
    assert.deepEqual(h.store.getState().reader.positionRequest.position, { chapterId: "B-1", textOffset: 67 });
    await h.controller.flushReaderProgress();
    const reload = h.fresh();
    await reload.controller.selectBook("B");
    assert.deepEqual(reload.store.getState().reader.positionRequest.position, { chapterId: "B-1", textOffset: 67 });
    for (const saved of h.writes) {
      assert.ok(!("pageIndex" in saved));
      assert.ok(!("pageCount" in saved));
      assert.ok(!("readingLayout" in saved));
      assert.ok(!("effectiveMode" in saved));
    }
  });
}

test("Guide mode change preserves the logical anchor through Page/Scroll and reload", async () => {
  const h = harness();
  await h.controller.openGuide();
  const chapterId = h.store.getState().activeChapterId;
  h.controller.recordReaderPosition({ chapterId, textOffset: 24 }, metrics);
  await h.controller.setReaderMode("chinese");
  assert.deepEqual(h.store.getState().reader.positionRequest.position, { chapterId, textOffset: 24 });
  await h.controller.setReadingLayout("scroll");
  await h.controller.flushReaderProgress();
  const reload = h.fresh();
  await reload.controller.openGuide();
  assert.equal(reload.store.getState().activeReadingMode, "chinese");
  assert.deepEqual(reload.store.getState().reader.positionRequest.position, { chapterId, textOffset: 24 });
});

test("legacy scroll ratio survives unavailable mode until English can resolve a source offset", async () => {
  const legacy = { bookKey: "B", currentChapterId: "B-1", currentChapterIndex: 0,
    currentMode: "chinese", scrollTop: 300, scrollRatio: 0.6 };
  const h = harness({ records: [legacy] });
  await h.controller.selectBook("B");
  h.controller.recordReaderPosition({ chapterId: "B-1", textOffset: 2 }, metrics);
  await h.controller.flushReaderProgress();
  assert.equal(h.progress.get("B").scrollRatio, 0.6);
  assert.ok(!h.progress.get("B").logicalPosition);
  await h.controller.setReaderMode("english-study");
  assert.equal(h.store.getState().reader.positionRequest.legacyProgress.scrollRatio, 0.6);
  assert.equal(h.store.getState().reader.positionRequest.position, null);
});

