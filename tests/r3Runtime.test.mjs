import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { R3_ACTIONS, r3Actions } from "../pwa-reader/ui-r3/actions.js";
import { bootstrapR3App } from "../pwa-reader/ui-r3/bootstrap.js";
import { createR3Controller } from "../pwa-reader/ui-r3/controller.js";
import { R3_OVERLAYS, R3_ROUTES } from "../pwa-reader/ui-r3/routes.js";
import {
  createInitialR3State,
  createR3Store,
  r3Reducer
} from "../pwa-reader/ui-r3/store.js";

function createMockElement(tagName = "div") {
  return {
    tagName: tagName.toUpperCase(),
    id: "",
    className: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    attributes: new Map(),
    eventListeners: new Map(),
    style: {},
    children: [],
    ownerDocument: null,
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    replaceChildren(...children) {
      this.children = [];
      children.forEach((child) => this.appendChild(child));
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === "id") {
        this.id = String(value);
      }
      if (name === "class") {
        this.className = String(value);
      }
    },
    getAttribute(name) {
      return this.attributes.get(name) || null;
    },
    addEventListener(type, listener) {
      const listeners = this.eventListeners.get(type) || [];
      listeners.push(listener);
      this.eventListeners.set(type, listeners);
    }
  };
}

function createMockDocument() {
  const body = createMockElement("body");
  const listeners = [];
  const documentRef = {
    readyState: "complete",
    body,
    listenerCount: 0,
    createElement(tagName) {
      const element = createMockElement(tagName);
      element.ownerDocument = documentRef;
      return element;
    },
    createElementNS(_namespace, tagName) {
      const element = createMockElement(tagName);
      element.ownerDocument = documentRef;
      return element;
    },
    getElementById(id) {
      const stack = [body];
      while (stack.length) {
        const current = stack.shift();
        if (current.id === id) {
          return current;
        }
        stack.push(...current.children);
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector !== "#r3-root") {
        return [];
      }
      const matches = [];
      const stack = [body];
      while (stack.length) {
        const current = stack.shift();
        if (current.id === "r3-root") {
          matches.push(current);
        }
        stack.push(...current.children);
      }
      return matches;
    },
    addEventListener(type, listener, options) {
      listeners.push({ type, listener, options });
      documentRef.listenerCount += 1;
    },
    get listeners() {
      return [...listeners];
    }
  };
  body.ownerDocument = documentRef;
  return documentRef;
}

function createAdapters() {
  const calls = {
    listBooks: 0,
    getContinueReading: 0,
    openBook: [],
    resumeBook: [],
    getTableOfContents: [],
    savePosition: [],
    restorePosition: [],
    loadEpubFromFile: [],
    loadChapterContent: [],
    destroyHandle: 0,
    getModeConstants: 0,
    resolveModeFromProgress: [],
    renderChapter: [],
    getPreferences: 0
  };
  const chapters = [
    { id: "chapter-1", title: "Chapter 1", order: 1 },
    { id: "chapter-2", title: "Chapter 2", order: 2 }
  ];
  const books = [
    { bookKey: "older", title: "Older Book", progressLabel: "12%" },
    { bookKey: "recent", title: "Recent Book", progressLabel: "52%" }
  ];
  const file = { name: "recent.epub" };
  const handle = {
    id: "private-epub-handle",
    destroy() {
      calls.destroyHandle += 1;
    }
  };
  const restoration = {
    bookKey: "recent",
    savedBook: {
      bookKey: "recent",
      title: "Recent Book",
      chapters
    },
    progress: {
      bookKey: "recent",
      currentChapterId: "chapter-2",
      currentChapterIndex: 1,
      currentMode: "cloze-mixed",
      scrollRatio: 0.4
    },
    file
  };

  return {
    calls,
    adapters: {
      books: {
        async listBooks() {
          calls.listBooks += 1;
          return books;
        },
        async getContinueReading() {
          calls.getContinueReading += 1;
          return {
            bookKey: "recent",
            title: "Recent Book",
            hasFileBlob: true,
            progress: {
              currentChapterIndex: 1,
              progressText: "Chapter 2 / 2",
              currentMode: "english-study"
            }
          };
        }
      },
      reader: {
        async openBook(bookKey) {
          calls.openBook.push(bookKey);
          return { ...restoration, bookKey };
        },
        async resumeBook(bookKey = null) {
          calls.resumeBook.push(bookKey);
          return restoration;
        },
        getTableOfContents(book = {}, currentChapterId = "") {
          calls.getTableOfContents.push({ book, currentChapterId });
          return (book.chapters || []).map((chapter, index) => ({
            id: chapter.id,
            title: chapter.title,
            index,
            isCurrent: chapter.id === currentChapterId
          }));
        },
        restorePosition(progress, chapterId, metrics) {
          calls.restorePosition.push({ progress, chapterId, metrics });
          if (!progress || progress.scrollRatio === undefined || progress.currentChapterId !== chapterId) {
            return null;
          }
          const maxScrollTop = Math.max(0, Number(metrics.scrollHeight) - Number(metrics.clientHeight));
          return Math.round(Math.max(0, Math.min(1, Number(progress.scrollRatio))) * maxScrollTop);
        },
        async savePosition(options) {
          calls.savePosition.push(options);
          return {
            bookKey: options.bookKey,
            currentChapterId: options.currentChapterId,
            currentMode: options.currentMode,
            scrollTop: options.scrollTop
          };
        }
      },
      vocabulary: {
        async getVocabularyProfile() {
          return { knownWords: [], learningWords: [], ignoredWords: [] };
        }
      },
      modes: {
        getModeConstants() {
          calls.getModeConstants += 1;
          return {
            ENGLISH_STUDY: "english-study",
            CHINESE: "chinese",
            CLOZE_MIXED: "cloze-mixed"
          };
        },
        resolveModeFromProgress(progress, fallback) {
          calls.resolveModeFromProgress.push({ progress, fallback });
          return progress?.currentMode || fallback;
        },
        getModeAvailability() {
          return [
            { value: "english-study", available: true },
            { value: "chinese", available: false },
            { value: "cloze-mixed", available: false }
          ];
        },
        renderChapter(chapter, mode, options) {
          calls.renderChapter.push({ chapter, mode, options });
          return {
            html: `<p>${chapter.title} rendered in ${mode}</p>`,
            vocabularyPreview: []
          };
        }
      },
      settings: {
        getPreferences() {
          calls.getPreferences += 1;
          return { uiLanguage: "en", guideVisible: true };
        }
      }
    },
    readerRuntime: {
      async loadEpubFromFile(inputFile) {
        calls.loadEpubFromFile.push(inputFile);
        return {
          handle,
          book: {
            title: "Recent Book",
            author: "Fixture Author",
            chapters
          }
        };
      },
      async loadChapterContent(inputHandle, chapter) {
        calls.loadChapterContent.push({ handle: inputHandle, chapter });
        return {
          ...chapter,
          originalHtml: `<p>${chapter.title} real EPUB content</p>`,
          plainText: `${chapter.title} real EPUB content`,
          renderError: null
        };
      }
    }
  };
}

function createTimerHarness() {
  let nextId = 1;
  const pendingTimers = new Map();
  return {
    timers: {
      setTimeout(callback, delay) {
        const id = nextId;
        nextId += 1;
        pendingTimers.set(id, { callback, delay });
        return id;
      },
      clearTimeout(id) {
        pendingTimers.delete(id);
      }
    },
    pendingCount() {
      return pendingTimers.size;
    },
    pendingDelays() {
      return [...pendingTimers.values()].map((entry) => entry.delay);
    },
    runNext() {
      const [id, entry] = pendingTimers.entries().next().value || [];
      if (!entry) {
        return false;
      }
      pendingTimers.delete(id);
      entry.callback();
      return true;
    },
    runAll() {
      while (this.runNext()) {
        // Drain pending fake timers.
      }
    }
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

test("R3 store creates the expected initial runtime state", () => {
  assert.deepEqual(createInitialR3State(), {
    initialized: false,
    activeScreen: R3_ROUTES.HOME,
    activeBookId: null,
    activeChapterId: null,
    activeChapterIndex: -1,
    activeReadingMode: "english-study",
    openOverlay: null,
    reader: {
      status: "idle",
      bookTitle: "",
      chapterTitle: "",
      html: "",
      chapterIndex: -1,
      chapterCount: 0,
      progressLabel: "No chapter loaded",
      hasPrevious: false,
      hasNext: false,
      toc: [],
      error: null
    },
    books: [],
    savedBookCount: 0,
    continueReading: null,
    home: {
      continueReading: null,
      recentBooks: [],
      snapshot: {
      readingMode: "english-study",
      vocabularyPreviewCount: null,
      currentBookVersionStatus: null,
      bookDetailsAvailable: false
      },
      helpful: []
    },
    library: {
      status: "empty",
      books: []
    },
    importStatus: {
      isImporting: false,
      fileName: null,
      lastImportedBookKey: null,
      error: null
    },
    adapterStatus: {
      books: false,
      reader: false,
      vocabulary: false,
      modes: false,
      settings: false
    },
    loading: {
      isLoading: false,
      operation: null
    },
    error: null
  });
});

test("R3 reducer handles route, chapter, mode, overlay, loading, and error actions", () => {
  let state = createInitialR3State();
  state = r3Reducer(state, r3Actions.navigate(R3_ROUTES.LIBRARY));
  assert.equal(state.activeScreen, R3_ROUTES.LIBRARY);

  state = r3Reducer(state, r3Actions.setActiveChapter("chapter-7", 6));
  assert.equal(state.activeChapterId, "chapter-7");
  assert.equal(state.activeChapterIndex, 6);

  state = r3Reducer(state, r3Actions.setActiveMode("cloze-mixed"));
  assert.equal(state.activeReadingMode, "cloze-mixed");

  state = r3Reducer(state, r3Actions.openOverlay(R3_OVERLAYS.MODE));
  assert.equal(state.openOverlay, R3_OVERLAYS.MODE);
  state = r3Reducer(state, r3Actions.closeOverlay());
  assert.equal(state.openOverlay, null);

  state = r3Reducer(state, r3Actions.setLoading(true, "books"));
  assert.deepEqual(state.loading, { isLoading: true, operation: "books" });
  state = r3Reducer(state, r3Actions.setError(new Error("boom")));
  assert.equal(state.error.message, "boom");
  state = r3Reducer(state, r3Actions.clearError());
  assert.equal(state.error, null);
});

test("R3 store subscriptions unsubscribe and state reads cannot mutate store internals", () => {
  const store = createR3Store();
  let notificationCount = 0;
  const unsubscribe = store.subscribe((state, action) => {
    notificationCount += 1;
    assert.equal(action.type, R3_ACTIONS.NAVIGATE);
    assert.equal(state.activeScreen, R3_ROUTES.VOCABULARY);
  });

  store.dispatch(r3Actions.navigate(R3_ROUTES.VOCABULARY));
  unsubscribe();
  store.dispatch(r3Actions.navigate(R3_ROUTES.SETTINGS_HOME));
  assert.equal(notificationCount, 1);

  const externalState = store.getState();
  externalState.books.push({ bookKey: "mutated" });
  externalState.loading.operation = "mutated";
  assert.deepEqual(store.getState().books, []);
  assert.equal(store.getState().loading.operation, null);
});

test("R3 initial-state factory avoids mutable shared nested defaults", () => {
  const first = createInitialR3State();
  const second = createInitialR3State();
  first.books.push({ bookKey: "leak" });
  first.adapterStatus.books = true;
  assert.deepEqual(second.books, []);
  assert.equal(second.adapterStatus.books, false);
});

test("R3 shell data keeps library count separate from current-book version status", () => {
  const books = Array.from({ length: 10 }, (_, index) => ({
    bookKey: `book-${index + 1}`,
    title: `Book ${index + 1}`
  }));
  const state = r3Reducer(
    createInitialR3State(),
    r3Actions.setShellData({
      books,
      continueReading: {
        bookKey: "book-1",
        title: "Book 1",
        hasFileBlob: true,
        progress: {
          bookKey: "book-1",
          currentChapterIndex: 0,
          currentMode: "english-study"
        }
      }
    })
  );

  assert.equal(state.savedBookCount, 10);
  assert.equal(state.home.snapshot.currentBookVersionStatus, "original-only");
  assert.equal(state.home.snapshot.availableVersions, undefined);
});

test("R3 shell data does not fabricate a current-book version status without a current book", () => {
  const state = r3Reducer(
    createInitialR3State(),
    r3Actions.setShellData({
      books: [{ bookKey: "book-1", title: "Book 1" }],
      continueReading: null
    })
  );

  assert.equal(state.savedBookCount, 1);
  assert.equal(state.home.snapshot.currentBookVersionStatus, null);
  assert.equal(state.home.snapshot.availableVersions, undefined);
});

test("R3 controller initializes once and loads books through adapters", async () => {
  const { calls, adapters } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters });

  const first = await controller.initialize();
  const second = await controller.initialize();

  assert.equal(first.initialized, true);
  assert.equal(second.initialized, true);
  assert.equal(calls.listBooks, 1);
  assert.equal(calls.getContinueReading, 1);
  assert.equal(calls.getModeConstants, 1);
  assert.equal(calls.getPreferences, 1);
  assert.equal(store.getState().savedBookCount, 2);
  assert.deepEqual(store.getState().adapterStatus, {
    books: true,
    reader: true,
    vocabulary: true,
    modes: true,
    settings: true
  });
});

test("R3 controller restores and renders the requested EPUB chapter without storing the File or handle", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  const state = store.getState();

  assert.deepEqual(calls.resumeBook, ["recent"]);
  assert.equal(calls.loadEpubFromFile.length, 1);
  assert.equal(calls.loadEpubFromFile[0].name, "recent.epub");
  assert.equal(calls.loadChapterContent.length, 1);
  assert.equal(calls.loadChapterContent[0].chapter.id, "chapter-2");
  assert.equal(state.activeScreen, R3_ROUTES.READER);
  assert.equal(state.activeBookId, "recent");
  assert.equal(state.activeChapterId, "chapter-2");
  assert.equal(state.activeChapterIndex, 1);
  assert.equal(state.activeReadingMode, "cloze-mixed");
  assert.equal(state.activeBookRestoration, undefined);
  assert.equal(state.reader.bookTitle, "Recent Book");
  assert.equal(state.reader.chapterTitle, "Chapter 2");
  assert.equal(state.reader.html, "<p>Chapter 2 rendered in cloze-mixed</p>");
  assert.equal(state.reader.chapterIndex, 1);
  assert.equal(state.reader.chapterCount, 2);
  assert.equal(state.reader.progressLabel, "Chapter 2 · 2 / 2");
  assert.equal(state.reader.hasPrevious, true);
  assert.equal(state.reader.hasNext, false);
  assert.equal(JSON.stringify(state).includes("private-epub-handle"), false);
  assert.equal(JSON.stringify(state).includes("recent.epub"), false);
});

test("R3 controller opens Contents from the real EPUB chapter list and marks the current chapter", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  const state = controller.openReaderContents();

  assert.equal(calls.getTableOfContents.length, 1);
  assert.equal(calls.getTableOfContents[0].currentChapterId, "chapter-2");
  assert.equal(state.openOverlay, R3_OVERLAYS.CONTENTS);
  assert.deepEqual(state.reader.toc, [
    { id: "chapter-1", title: "Chapter 1", index: 0, isCurrent: false, isReadable: true },
    { id: "chapter-2", title: "Chapter 2", index: 1, isCurrent: true, isReadable: true }
  ]);
  assert.equal(JSON.stringify(state.reader.toc).includes("private-epub-handle"), false);
});

test("R3 controller selects a Contents chapter through the guarded render and save pipeline", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  controller.openReaderContents();
  calls.savePosition.length = 0;
  const state = await controller.selectReaderChapter(0);
  await controller.flushReaderProgress();

  assert.equal(state.openOverlay, null);
  assert.equal(state.activeChapterId, "chapter-1");
  assert.equal(state.activeChapterIndex, 0);
  assert.equal(state.reader.chapterTitle, "Chapter 1");
  assert.equal(state.reader.hasPrevious, false);
  assert.equal(state.reader.hasNext, true);
  assert.deepEqual(state.reader.toc.map((item) => [item.id, item.isCurrent]), [
    ["chapter-1", true],
    ["chapter-2", false]
  ]);
  assert.equal(calls.loadChapterContent.at(-1).chapter.id, "chapter-1");
  assert.equal(calls.savePosition.at(-1).currentChapterId, "chapter-1");
  assert.equal(calls.savePosition.at(-1).scrollTop, 0);
});

test("R3 controller persists pending outgoing progress before selecting a Contents chapter", async () => {
  const timerHarness = createTimerHarness();
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters,
    readerRuntime,
    timers: timerHarness.timers,
    scrollSaveDelayMs: 1000
  });

  await controller.resumeBook("recent");
  await controller.flushReaderProgress();
  calls.savePosition.length = 0;

  controller.recordReaderScroll({ scrollTop: 240, scrollHeight: 1000, clientHeight: 200 });
  controller.openReaderContents();
  const state = await controller.selectReaderChapter(0);
  await controller.flushReaderProgress();

  assert.equal(timerHarness.pendingCount(), 0);
  assert.deepEqual(
    calls.savePosition.map((entry) => ({
      currentChapterId: entry.currentChapterId,
      currentChapterIndex: entry.chapters.findIndex((chapter) => chapter.id === entry.currentChapterId),
      scrollTop: entry.scrollTop,
      scrollHeight: entry.scrollHeight,
      clientHeight: entry.clientHeight
    })),
    [
      {
        currentChapterId: "chapter-2",
        currentChapterIndex: 1,
        scrollTop: 240,
        scrollHeight: 1000,
        clientHeight: 200
      },
      {
        currentChapterId: "chapter-1",
        currentChapterIndex: 0,
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0
      }
    ]
  );
  assert.equal(state.activeChapterId, "chapter-1");
  assert.equal(state.activeChapterIndex, 0);
  assert.equal(state.openOverlay, null);
});

test("R3 controller rejects invalid and non-readable Contents entries without rendering or closing Contents", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  controller.openReaderContents();
  const loadCount = calls.loadChapterContent.length;

  let state = await controller.selectReaderChapter(99);
  assert.equal(state.openOverlay, R3_OVERLAYS.CONTENTS);
  assert.equal(state.activeChapterId, "chapter-2");
  assert.equal(calls.loadChapterContent.length, loadCount);

  state = await controller.selectReaderChapter("0");
  assert.equal(state.openOverlay, R3_OVERLAYS.CONTENTS);
  assert.equal(calls.loadChapterContent.length, loadCount);
});

test("R3 controller keeps Contents open and skips save when selected chapter render fails", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const originalLoadChapter = readerRuntime.loadChapterContent;
  readerRuntime.loadChapterContent = async (handle, chapter) => {
    if (chapter.id === "chapter-1") {
      throw new Error("chapter failed");
    }
    return originalLoadChapter(handle, chapter);
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  controller.openReaderContents();
  calls.savePosition.length = 0;
  const state = await controller.selectReaderChapter(0);
  await controller.flushReaderProgress();

  assert.equal(state.openOverlay, R3_OVERLAYS.CONTENTS);
  assert.equal(state.activeChapterId, "chapter-2");
  assert.equal(state.reader.status, "error");
  assert.equal(calls.savePosition.length, 0);
});

test("R3 controller preserves the previous valid Reader presentation when Contents selection fails", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const originalLoadChapter = readerRuntime.loadChapterContent;
  readerRuntime.loadChapterContent = async (handle, chapter) => {
    if (chapter.id === "chapter-1") {
      throw new Error("chapter failed");
    }
    return originalLoadChapter(handle, chapter);
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  await controller.flushReaderProgress();
  controller.openReaderContents();
  const previousState = store.getState();
  calls.savePosition.length = 0;

  const state = await controller.selectReaderChapter(0);
  await controller.flushReaderProgress();

  assert.equal(state.openOverlay, R3_OVERLAYS.CONTENTS);
  assert.equal(state.activeChapterId, "chapter-2");
  assert.equal(state.activeChapterIndex, 1);
  assert.equal(state.reader.status, "error");
  assert.equal(state.reader.error.message, "chapter failed");
  assert.equal(state.reader.html, previousState.reader.html);
  assert.equal(state.reader.chapterTitle, previousState.reader.chapterTitle);
  assert.equal(state.reader.chapterIndex, previousState.reader.chapterIndex);
  assert.equal(state.reader.progressLabel, previousState.reader.progressLabel);
  assert.equal(state.reader.hasPrevious, previousState.reader.hasPrevious);
  assert.equal(state.reader.hasNext, previousState.reader.hasNext);
  assert.deepEqual(state.reader.toc, previousState.reader.toc);
  assert.equal(calls.savePosition.some((entry) => entry.currentChapterId === "chapter-1"), false);
});

test("R3 controller ignores stale rapid Contents selections and saves only the latest successful chapter", async () => {
  const slowChapter = createDeferred();
  const { calls, adapters, readerRuntime } = createAdapters();
  const originalLoadEpub = readerRuntime.loadEpubFromFile;
  readerRuntime.loadEpubFromFile = async (inputFile) => {
    const loaded = await originalLoadEpub(inputFile);
    return {
      ...loaded,
      book: {
        ...loaded.book,
        chapters: [
          ...loaded.book.chapters,
          { id: "chapter-3", title: "Chapter 3", order: 3 }
        ]
      }
    };
  };
  const originalLoadChapter = readerRuntime.loadChapterContent;
  readerRuntime.loadChapterContent = async (handle, chapter) => {
    if (chapter.id === "chapter-1") {
      await slowChapter.promise;
    }
    return originalLoadChapter(handle, chapter);
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  controller.openReaderContents();
  calls.savePosition.length = 0;
  const firstSelection = controller.selectReaderChapter(0);
  const secondSelection = controller.selectReaderChapter(2);
  slowChapter.resolve();
  await Promise.all([firstSelection, secondSelection]);
  await controller.flushReaderProgress();
  const state = store.getState();

  assert.equal(state.activeChapterId, "chapter-3");
  assert.equal(state.activeChapterIndex, 2);
  assert.equal(state.reader.chapterTitle, "Chapter 3");
  assert.equal(calls.savePosition.at(-1).currentChapterId, "chapter-3");
  assert.equal(calls.savePosition.some((entry) => entry.currentChapterId === "chapter-1"), false);
});

test("R3 controller saves chapter progress only after successful chapter render", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  await controller.flushReaderProgress();

  assert.equal(calls.loadChapterContent.length, 1);
  assert.equal(calls.savePosition.length, 1);
  assert.equal(calls.savePosition[0].bookKey, "recent");
  assert.equal(calls.savePosition[0].currentChapterId, "chapter-2");
  assert.equal(calls.savePosition[0].currentMode, "cloze-mixed");
  assert.equal(calls.savePosition[0].scrollTop, 0);
  assert.equal(calls.savePosition[0].scrollHeight, 0);
  assert.equal(calls.savePosition[0].clientHeight, 0);
});

test("R3 controller does not persist a requested chapter when rendering fails", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  readerRuntime.loadChapterContent = async () => {
    throw new Error("chapter failed");
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  await controller.flushReaderProgress();

  assert.equal(store.getState().reader.status, "error");
  assert.equal(calls.savePosition.length, 0);
});

test("R3 controller falls back to the first chapter when restored progress is invalid", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  adapters.reader.resumeBook = async () => ({
    bookKey: "recent",
    savedBook: { bookKey: "recent", title: "Recent Book" },
    progress: {
      bookKey: "recent",
      currentChapterId: "missing",
      currentChapterIndex: 99,
      currentMode: "english-study"
    },
    file: { name: "recent.epub" }
  });

  await controller.resumeBook("recent");

  assert.equal(store.getState().activeChapterId, "chapter-1");
  assert.equal(store.getState().activeChapterIndex, 0);
  assert.equal(store.getState().reader.chapterTitle, "Chapter 1");
  assert.equal(store.getState().reader.hasPrevious, false);
  assert.equal(store.getState().reader.hasNext, true);
});

test("R3 controller applies saved scroll only to the matching rendered chapter", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const scrollElement = { scrollTop: 0, scrollHeight: 1000, clientHeight: 200 };

  await controller.resumeBook("recent");
  const applied = controller.applyReaderScrollRestoration(scrollElement);
  const reapplied = controller.applyReaderScrollRestoration(scrollElement);

  assert.equal(applied, true);
  assert.equal(reapplied, false);
  assert.equal(scrollElement.scrollTop, 320);
  assert.equal(calls.restorePosition.length, 1);
  assert.equal(calls.restorePosition[0].chapterId, "chapter-2");
});

test("R3 controller waits for measurable scroll range before consuming saved scroll", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const unmeasurableElement = { scrollTop: 0, scrollHeight: 200, clientHeight: 200 };
  const measurableElement = { scrollTop: 0, scrollHeight: 1000, clientHeight: 200 };

  await controller.resumeBook("recent");
  const earlyApplied = controller.applyReaderScrollRestoration(unmeasurableElement);
  const finalApplied = controller.applyReaderScrollRestoration(measurableElement);

  assert.equal(earlyApplied, false);
  assert.equal(finalApplied, true);
  assert.equal(measurableElement.scrollTop, 320);
  assert.equal(calls.restorePosition.length, 1);
});

test("R3 controller ignores invalid saved scroll for fallback chapters", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  adapters.reader.resumeBook = async () => ({
    bookKey: "recent",
    savedBook: { bookKey: "recent", title: "Recent Book" },
    progress: {
      bookKey: "recent",
      currentChapterId: "missing",
      currentChapterIndex: 99,
      currentMode: "english-study",
      scrollRatio: 0.75
    },
    file: { name: "recent.epub" }
  });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const scrollElement = { scrollTop: 0, scrollHeight: 1000, clientHeight: 200 };

  await controller.resumeBook("recent");
  const applied = controller.applyReaderScrollRestoration(scrollElement);

  assert.equal(applied, false);
  assert.equal(scrollElement.scrollTop, 0);
  assert.equal(calls.restorePosition.length, 0);
});

test("R3 controller records a serializable reader error when EPUB open fails", async () => {
  const { adapters, readerRuntime } = createAdapters();
  readerRuntime.loadEpubFromFile = async () => {
    throw new Error("EPUB open failed");
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  const state = await controller.resumeBook("recent");

  assert.equal(state.error.message, "EPUB open failed");
  assert.equal(state.reader.status, "error");
  assert.equal(state.reader.error.message, "EPUB open failed");
  assert.equal(state.reader.html, "");
  assert.equal(JSON.stringify(state).includes("recent.epub"), false);
});

test("R3 controller renders adjacent chapters and disables navigation at boundaries", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  await controller.goToReaderChapter("previous");
  let state = store.getState();

  assert.equal(state.activeChapterId, "chapter-1");
  assert.equal(state.reader.chapterTitle, "Chapter 1");
  assert.equal(state.reader.hasPrevious, false);
  assert.equal(state.reader.hasNext, true);

  await controller.goToReaderChapter("previous");
  state = store.getState();
  assert.equal(state.activeChapterId, "chapter-1");
  assert.equal(calls.loadChapterContent.length, 2);

  await controller.goToReaderChapter("next");
  state = store.getState();
  assert.equal(state.activeChapterId, "chapter-2");
  assert.equal(state.reader.hasPrevious, true);
  assert.equal(state.reader.hasNext, false);
});

test("R3 controller debounces scroll progress writes for the current chapter", async () => {
  const timerHarness = createTimerHarness();
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters,
    readerRuntime,
    timers: timerHarness.timers,
    scrollSaveDelayMs: 250
  });

  await controller.resumeBook("recent");
  calls.savePosition.length = 0;

  controller.recordReaderScroll({ scrollTop: 20, scrollHeight: 1000, clientHeight: 200 });
  controller.recordReaderScroll({ scrollTop: 160, scrollHeight: 1000, clientHeight: 200 });

  assert.equal(timerHarness.pendingCount(), 1);
  assert.deepEqual(timerHarness.pendingDelays(), [250]);
  assert.equal(calls.savePosition.length, 0);

  timerHarness.runAll();
  await controller.flushReaderProgress();

  assert.equal(calls.savePosition.length, 1);
  assert.equal(calls.savePosition[0].currentChapterId, "chapter-2");
  assert.equal(calls.savePosition[0].scrollTop, 160);
});

test("R3 controller flushes pending scroll progress before cleanup", async () => {
  const timerHarness = createTimerHarness();
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters,
    readerRuntime,
    timers: timerHarness.timers,
    scrollSaveDelayMs: 1000
  });

  await controller.resumeBook("recent");
  calls.savePosition.length = 0;

  controller.recordReaderScroll({ scrollTop: 220, scrollHeight: 1000, clientHeight: 200 });
  const state = await controller.exitReader();

  assert.equal(timerHarness.pendingCount(), 0);
  assert.equal(calls.savePosition.length, 1);
  assert.equal(calls.savePosition[0].scrollTop, 220);
  assert.equal(calls.destroyHandle, 1);
  assert.equal(state.activeScreen, R3_ROUTES.HOME);
});

test("R3 controller serializes progress saves so stale writes cannot finish last", async () => {
  const firstSave = createDeferred();
  const { calls, adapters, readerRuntime } = createAdapters();
  adapters.reader.savePosition = async (options) => {
    calls.savePosition.push(options);
    if (calls.savePosition.length === 1) {
      await firstSave.promise;
    }
    return options;
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  controller.recordReaderScroll({ scrollTop: 320, scrollHeight: 1000, clientHeight: 200 });
  const flushPromise = controller.flushReaderProgress();

  assert.equal(calls.savePosition.length, 1);
  assert.equal(calls.savePosition[0].scrollTop, 0);
  firstSave.resolve();
  await flushPromise;

  assert.equal(calls.savePosition.length, 2);
  assert.equal(calls.savePosition[1].scrollTop, 320);
  assert.equal(calls.savePosition[1].currentChapterId, "chapter-2");
});

test("R3 controller Back action destroys the EPUB runtime before returning Home", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  const state = await controller.exitReader();

  assert.equal(calls.destroyHandle, 1);
  assert.equal(state.activeScreen, R3_ROUTES.HOME);
  assert.equal(state.activeBookId, null);
  assert.equal(state.reader.status, "idle");
  assert.equal(state.reader.html, "");
});

test("R3 controller delegates open-book orchestration and exposes local UI actions", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.selectBook("older");
  controller.setActiveChapter("chapter-1", 0);
  controller.setActiveMode("english-study");
  controller.openOverlay(R3_OVERLAYS.CONTENTS);
  controller.closeOverlay();

  const state = store.getState();
  assert.deepEqual(calls.openBook, ["older"]);
  assert.equal(state.activeScreen, R3_ROUTES.READER);
  assert.equal(state.activeBookId, "older");
  assert.equal(state.activeChapterId, "chapter-1");
  assert.equal(state.activeChapterIndex, 0);
  assert.equal(state.activeReadingMode, "english-study");
  assert.equal(state.openOverlay, null);
});

test("R3 bootstrap mounts exactly one development root and prevents duplicate initialization", async () => {
  const documentRef = createMockDocument();
  const { calls, adapters } = createAdapters();

  const first = await bootstrapR3App({ document: documentRef, adapters });
  const second = await bootstrapR3App({ document: documentRef, adapters });

  assert.equal(first, second);
  assert.equal(documentRef.querySelectorAll("#r3-root").length, 1);
  assert.equal(calls.listBooks, 1);
  assert.equal(documentRef.listenerCount, 1);
  assert.equal(first.root.dataset.r3Initialized, "true");
  assert.equal(first.root.dataset.r3SavedBookCount, "2");
  assert.equal(first.root.dataset.r3ActiveScreen, R3_ROUTES.HOME);
  assert.ok(first.root.children.length > 0);
});

test("R3 development entry is isolated from the legacy production bootstrap", async () => {
  const html = await readFile(new URL("../pwa-reader/r3.html", import.meta.url), "utf8");
  assert.match(html, /<meta charset="UTF-8">/i);
  assert.match(html, /id="r3-root"/);
  assert.match(html, /type="module" src="\.\/ui-r3\/bootstrap\.js"/);
  assert.doesNotMatch(html, /app\.js/);
});

test("R3 store and diagnostic view do not import storage, engines, or IndexedDB", async () => {
  const files = [
    "../pwa-reader/ui-r3/store.js",
    "../pwa-reader/ui-r3/views/diagnosticView.js"
  ];

  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /indexedDB/i, file);
    assert.doesNotMatch(source, /storage\.js/i, file);
    assert.doesNotMatch(source, /epubLoader\.js/i, file);
    assert.doesNotMatch(source, /readingModes\.js/i, file);
    assert.doesNotMatch(source, /vocabEngine\.js/i, file);
  }
});
