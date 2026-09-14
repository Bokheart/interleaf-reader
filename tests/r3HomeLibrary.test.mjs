import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { bootstrapR3App } from "../pwa-reader/ui-r3/bootstrap.js";
import { createR3Controller } from "../pwa-reader/ui-r3/controller.js";
import { R3_OVERLAYS, R3_ROUTES } from "../pwa-reader/ui-r3/routes.js";
import { createR3Store } from "../pwa-reader/ui-r3/store.js";
import { createAppShellView } from "../pwa-reader/ui-r3/views/appShellView.js";
import { createHomeView } from "../pwa-reader/ui-r3/views/homeView.js";
import { createLibraryView } from "../pwa-reader/ui-r3/views/libraryView.js";

class MockElement {
  constructor(tagName, ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.eventListeners = new Map();
    this.style = {};
    this.parentNode = null;
    this.id = "";
    this.className = "";
    this.disabled = false;
    this.type = "";
    this.accept = "";
    this.value = "";
    this.files = [];
    this._textContent = "";
    this._innerHTML = "";
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  get textContent() {
    return `${this._textContent}${this.children.map((child) => child.textContent).join("")}`;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  append(...children) {
    children.forEach((child) => {
      if (typeof child === "string") {
        const textNode = new MockElement("#text", this.ownerDocument);
        textNode.textContent = child;
        this.appendChild(textNode);
        return;
      }
      this.appendChild(child);
    });
  }

  replaceChildren(...children) {
    this._textContent = "";
    this.children = [];
    this.append(...children);
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === "id") {
      this.id = stringValue;
    }
    if (name === "class") {
      this.className = stringValue;
    }
    if (name === "type") {
      this.type = stringValue;
    }
    if (name === "accept") {
      this.accept = stringValue;
    }
    if (name === "disabled") {
      this.disabled = true;
    }
    if (name.startsWith("data-")) {
      const key = name
        .slice(5)
        .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      this.dataset[key] = stringValue;
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "disabled") {
      this.disabled = false;
    }
  }

  addEventListener(type, listener) {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }
}

function createMockDocument() {
  const listeners = [];
  const documentRef = {
    readyState: "complete",
    body: null,
    createElement(tagName) {
      return new MockElement(tagName, documentRef);
    },
    createElementNS(_namespace, tagName) {
      return new MockElement(tagName, documentRef);
    },
    getElementById(id) {
      return findAll(documentRef.body, (node) => node.id === id)[0] || null;
    },
    querySelectorAll(selector) {
      if (selector === "#r3-root") {
        return findAll(documentRef.body, (node) => node.id === "r3-root");
      }
      return [];
    },
    addEventListener(type, listener, options) {
      listeners.push({ type, listener, options });
    },
    get listeners() {
      return [...listeners];
    }
  };
  documentRef.body = new MockElement("body", documentRef);
  return documentRef;
}

function findAll(root, predicate) {
  const matches = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const current = stack.shift();
    if (predicate(current)) {
      matches.push(current);
    }
    stack.push(...current.children);
  }
  return matches;
}

function findByDataAction(root, action) {
  return findAll(root, (node) => node.dataset?.action === action);
}

function createBook(overrides = {}) {
  return {
    bookKey: "book-one",
    title: "The Wind in the Willows",
    author: "Kenneth Grahame",
    fileName: "wind.epub",
    chapterCount: 8,
    currentChapterIndex: 2,
    progressLabel: "Chapter 3 / 8",
    updatedAt: 20,
    ...overrides
  };
}

function createContinueReading(overrides = {}) {
  return {
    bookKey: "book-one",
    title: "The Wind in the Willows",
    author: "Kenneth Grahame",
    chapterCount: 8,
    hasFileBlob: true,
    progress: {
      bookKey: "book-one",
      currentChapterIndex: 2,
      progressText: "Chapter 3 / 8",
      currentMode: "english-study"
    },
    ...overrides
  };
}

function createShellState(overrides = {}) {
  const books = overrides.books || [createBook()];
  const continueReading = overrides.continueReading === undefined
    ? createContinueReading()
    : overrides.continueReading;

  return {
    initialized: true,
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
    books,
    savedBookCount: books.length,
    continueReading,
    home: {
      continueReading,
      recentBooks: books.slice(0, 3),
      snapshot: {
        readingMode: "english-study",
        vocabularyPreviewCount: null,
        currentBookVersionStatus: continueReading ? "original-only" : null,
        bookDetailsAvailable: false
      },
      helpful: []
    },
    library: {
      status: books.length ? "populated" : "empty",
      books
    },
    importStatus: {
      isImporting: false,
      fileName: null,
      lastImportedBookKey: null,
      error: null
    },
    adapterStatus: {
      books: true,
      reader: true,
      vocabulary: true,
      modes: true,
      settings: true
    },
    loading: {
      isLoading: false,
      operation: null
    },
    error: null,
    ...overrides
  };
}

function createAdapters(options = {}) {
  const calls = {
    listBooks: 0,
    getContinueReading: 0,
    importBook: [],
    openBook: [],
    resumeBook: [],
    savePosition: [],
    restorePosition: [],
    loadEpubFromFile: [],
    loadChapterContent: [],
    destroyHandle: 0,
    renderChapter: [],
    getModeConstants: 0,
    getPreferences: 0
  };
  const chapters = [
    { id: "chapter-1", title: "Chapter 1", order: 1 },
    { id: "chapter-2", title: "Chapter 2", order: 2 },
    { id: "chapter-3", title: "Chapter 3", order: 3 }
  ];
  const handle = {
    destroy() {
      calls.destroyHandle += 1;
    }
  };
  let books = options.books === undefined ? [createBook()] : options.books;
  let continueReading = options.continueReading === undefined
    ? createContinueReading()
    : options.continueReading;
  let importResolver;
  let importRejecter;
  const importPromise = options.deferredImport
    ? new Promise((resolve, reject) => {
        importResolver = resolve;
        importRejecter = reject;
      })
    : null;

  return {
    calls,
    resolveImport(value) {
      importResolver?.(value);
    },
    rejectImport(error) {
      importRejecter?.(error);
    },
    setBooks(nextBooks) {
      books = nextBooks;
    },
    setContinueReading(nextContinueReading) {
      continueReading = nextContinueReading;
    },
    adapters: {
      books: {
        async listBooks() {
          calls.listBooks += 1;
          return books;
        },
        async getContinueReading() {
          calls.getContinueReading += 1;
          return continueReading;
        },
        async importBook(file) {
          calls.importBook.push(file);
          if (options.importError) {
            throw options.importError;
          }
          if (importPromise) {
            return importPromise;
          }
          books = [createBook({ bookKey: "imported", title: "Imported Book" }), ...books];
          if (options.importCreatesProgress !== false) {
            continueReading = createContinueReading({ bookKey: "imported", title: "Imported Book" });
          }
          return { storedMetadata: { bookKey: "imported" } };
        }
      },
      reader: {
        async openBook(bookKey) {
          calls.openBook.push(bookKey);
          return {
            bookKey,
            savedBook: createBook({ bookKey }),
            progress: { currentChapterIndex: 0, currentMode: "english-study" },
            file: { name: `${bookKey}.epub` }
          };
        },
        async resumeBook(bookKey = null) {
          calls.resumeBook.push(bookKey);
          return {
            bookKey: bookKey || "book-one",
            savedBook: createBook({ bookKey: bookKey || "book-one" }),
            progress: { currentChapterIndex: 2, currentMode: "english-study" },
            file: { name: "book-one.epub" }
          };
        },
        restorePosition(progress, chapterId, metrics) {
          calls.restorePosition.push({ progress, chapterId, metrics });
          return null;
        },
        async savePosition(options) {
          calls.savePosition.push(options);
          return options;
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
          return { ENGLISH_STUDY: "english-study" };
        },
        resolveModeFromProgress(progress, fallback) {
          return progress?.currentMode || fallback;
        },
        getModeAvailability() {
          return [{ value: "english-study", available: true }];
        },
        renderChapter(chapter, mode) {
          calls.renderChapter.push({ chapter, mode });
          return {
            html: `<article><p>${chapter.title} loaded from EPUB</p></article>`,
            vocabularyPreview: []
          };
        }
      },
      settings: {
        getPreferences() {
          calls.getPreferences += 1;
          return { uiLanguage: "en" };
        }
      }
    },
    readerRuntime: {
      async loadEpubFromFile(file) {
        calls.loadEpubFromFile.push(file);
        return {
          handle,
          book: {
            title: "The Wind in the Willows",
            author: "Kenneth Grahame",
            chapters
          }
        };
      },
      async loadChapterContent(inputHandle, chapter) {
        calls.loadChapterContent.push({ handle: inputHandle, chapter });
        return {
          ...chapter,
          originalHtml: `<p>${chapter.title} loaded from EPUB</p>`,
          plainText: `${chapter.title} loaded from EPUB`,
          renderError: null
        };
      }
    }
  };
}

test("Home renders populated Continue Reading, quick actions, snapshot, and recent books", () => {
  const documentRef = createMockDocument();
  const view = createHomeView(documentRef, createShellState());
  const text = view.textContent;

  assert.match(text, /Interleaf Reader/);
  assert.match(text, /Continue Reading/);
  assert.match(text, /The Wind in the Willows/);
  assert.match(text, /Chapter 3 \/ 8/);
  assert.match(text, /Resume Reading/);
  assert.match(text, /Import Book/);
  assert.match(text, /Open Library/);
  assert.match(text, /Current Book Snapshot/);
  assert.match(text, /Recent & Helpful/);
});

test("Home hides Continue Reading when no resumable adapter DTO exists", () => {
  const documentRef = createMockDocument();
  const view = createHomeView(documentRef, createShellState({
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
    library: { status: "empty", books: [] }
  }));

  assert.doesNotMatch(view.textContent, /Resume Reading/);
  assert.match(view.textContent, /Import Book/);
  assert.match(view.textContent, /Open Library/);
  assert.doesNotMatch(view.textContent, /Current Book Snapshot/);
  assert.doesNotMatch(view.textContent, /English Study/);
  assert.doesNotMatch(view.textContent, /Available in Reader/);
  assert.doesNotMatch(view.textContent, /Book Details/);
});

test("Home keeps saved-book count separate from current-book version status", () => {
  const documentRef = createMockDocument();
  const books = Array.from({ length: 10 }, (_, index) => createBook({
    bookKey: `book-${index + 1}`,
    title: `Book ${index + 1}`
  }));
  const view = createHomeView(documentRef, createShellState({
    books,
    savedBookCount: 10,
    continueReading: createContinueReading({ bookKey: "book-1", title: "Book 1" }),
    home: {
      continueReading: createContinueReading({ bookKey: "book-1", title: "Book 1" }),
      recentBooks: books.slice(0, 3),
      snapshot: {
        readingMode: "english-study",
        vocabularyPreviewCount: null,
        currentBookVersionStatus: "original-only",
        bookDetailsAvailable: false
      },
      helpful: []
    }
  }));

  assert.match(view.textContent, /Original only/);
  assert.doesNotMatch(view.textContent, /10 local EPUBs/);
  assert.doesNotMatch(view.textContent, /10 versions/);
});

test("Home does not render a fake version count without a current book", () => {
  const documentRef = createMockDocument();
  const view = createHomeView(documentRef, createShellState({
    books: [createBook({ bookKey: "one-book" })],
    savedBookCount: 1,
    continueReading: null,
    home: {
      continueReading: null,
      recentBooks: [createBook({ bookKey: "one-book" })],
      snapshot: {
        readingMode: "english-study",
        vocabularyPreviewCount: null,
        currentBookVersionStatus: null,
        bookDetailsAvailable: false
      },
      helpful: []
    }
  }));

  assert.doesNotMatch(view.textContent, /Current Book Snapshot/);
  assert.doesNotMatch(view.textContent, /No active book/);
  assert.doesNotMatch(view.textContent, /1 local EPUB/);
  assert.doesNotMatch(view.textContent, /1 version/);
});

test("Home renders imported-book placeholder modes as Original only", () => {
  const documentRef = createMockDocument();
  const chineseView = createHomeView(documentRef, createShellState({
    activeReadingMode: "chinese",
    home: {
      continueReading: createContinueReading(),
      recentBooks: [createBook()],
      snapshot: {
        readingMode: "chinese",
        vocabularyPreviewCount: null,
        currentBookVersionStatus: "original-only",
        bookDetailsAvailable: false
      },
      helpful: []
    }
  }));
  const mixedView = createHomeView(documentRef, createShellState({
    activeReadingMode: "cloze-mixed",
    home: {
      continueReading: createContinueReading(),
      recentBooks: [createBook()],
      snapshot: {
        readingMode: "cloze-mixed",
        vocabularyPreviewCount: null,
        currentBookVersionStatus: "original-only",
        bookDetailsAvailable: false
      },
      helpful: []
    }
  }));

  assert.match(chineseView.textContent, /Original only/);
  assert.doesNotMatch(chineseView.textContent, /2 versions/);
  assert.match(mixedView.textContent, /Original only/);
  assert.doesNotMatch(mixedView.textContent, /3 versions/);
});

test("Home removes the Current Book Snapshot when the current DTO becomes null", () => {
  const documentRef = createMockDocument();
  const populatedView = createHomeView(documentRef, createShellState());
  const clearedView = createHomeView(documentRef, createShellState({
    continueReading: null,
    home: {
      continueReading: null,
      recentBooks: [createBook()],
      snapshot: {
        readingMode: "english-study",
        vocabularyPreviewCount: null,
        currentBookVersionStatus: null,
        bookDetailsAvailable: false
      },
      helpful: []
    }
  }));

  assert.match(populatedView.textContent, /Current Book Snapshot/);
  assert.match(populatedView.textContent, /Original only/);
  assert.doesNotMatch(clearedView.textContent, /Current Book Snapshot/);
  assert.doesNotMatch(clearedView.textContent, /Original only/);
});

test("Library renders populated saved-book rows with stable book-key event payloads", () => {
  const documentRef = createMockDocument();
  const unsafeTitle = "<img src=x onerror=alert(1)>";
  const book = createBook({ bookKey: "stable-book-key", title: unsafeTitle });
  const view = createLibraryView(documentRef, createShellState({ books: [book] }));
  const rows = findByDataAction(view, "select-book");

  assert.equal(rows.length, 1);
  assert.equal(rows[0].dataset.bookKey, "stable-book-key");
  assert.equal(rows[0].dataset.figmaNodeId, undefined);
  assert.match(view.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(findAll(view, (node) => node.tagName === "SCRIPT").length, 0);
});

test("Library renders empty local-storage explanation and import CTA", () => {
  const documentRef = createMockDocument();
  const view = createLibraryView(documentRef, createShellState({
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
    library: { status: "empty", books: [] }
  }));

  assert.match(view.textContent, /Your library is empty/);
  assert.match(view.textContent, /EPUB files are stored locally/);
  assert.match(view.textContent, /Import Book/);
});

test("App Shell switches active bottom navigation between Home and Library", () => {
  const documentRef = createMockDocument();
  const homeShell = createAppShellView(documentRef, createShellState({ activeScreen: R3_ROUTES.HOME }));
  const libraryShell = createAppShellView(documentRef, createShellState({ activeScreen: R3_ROUTES.LIBRARY }));

  const homeActive = findAll(homeShell, (node) => node.getAttribute("aria-current") === "page");
  const libraryActive = findAll(libraryShell, (node) => node.getAttribute("aria-current") === "page");

  assert.equal(homeActive.length, 1);
  assert.equal(homeActive[0].dataset.route, R3_ROUTES.HOME);
  assert.equal(libraryActive.length, 1);
  assert.equal(libraryActive[0].dataset.route, R3_ROUTES.LIBRARY);
});

test("App Shell renders the real Reader state instead of the old placeholder", () => {
  const documentRef = createMockDocument();
  const shell = createAppShellView(documentRef, createShellState({
    activeScreen: R3_ROUTES.READER,
    activeBookId: "book-one",
    activeChapterId: "chapter-2",
    activeChapterIndex: 1,
    reader: {
      status: "ready",
      bookTitle: "The Wind in the Willows",
      chapterTitle: "The River Bank",
      html: "<article><p>Real fixture chapter text.</p></article>",
      chapterIndex: 1,
      chapterCount: 3,
      progressLabel: "The River Bank · 2 / 3",
      hasPrevious: true,
      hasNext: true,
      toc: [],
      error: null
    }
  }));
  const readerContent = findAll(shell, (node) => node.className === "r3-reader-content")[0];
  const backButton = findByDataAction(shell, "reader-back")[0];
  const contentsButton = findByDataAction(shell, "reader-contents")[0];
  const previousButton = findByDataAction(shell, "reader-previous")[0];
  const nextButton = findByDataAction(shell, "reader-next")[0];

  assert.doesNotMatch(shell.textContent, /Reader restoration prepared/);
  assert.match(shell.textContent, /The Wind in the Willows/);
  assert.match(shell.textContent, /The River Bank/);
  assert.equal(readerContent.innerHTML, "<article><p>Real fixture chapter text.</p></article>");
  assert.ok(backButton);
  assert.ok(contentsButton);
  assert.equal(previousButton.disabled, false);
  assert.equal(nextButton.disabled, false);
});

test("App Shell renders Reader Contents with current chapter and selectable rows", () => {
  const documentRef = createMockDocument();
  const shell = createAppShellView(documentRef, createShellState({
    activeScreen: R3_ROUTES.READER,
    activeBookId: "book-one",
    activeChapterId: "chapter-2",
    activeChapterIndex: 1,
    openOverlay: R3_OVERLAYS.CONTENTS,
    reader: {
      status: "ready",
      bookTitle: "The Wind in the Willows",
      chapterTitle: "The River Bank",
      html: "<article><p>Real fixture chapter text.</p></article>",
      chapterIndex: 1,
      chapterCount: 3,
      progressLabel: "The River Bank · 2 / 3",
      hasPrevious: true,
      hasNext: true,
      toc: [
        { id: "chapter-1", title: "The Open Road", index: 0, isCurrent: false, isReadable: true },
        { id: "chapter-2", title: "The River Bank", index: 1, isCurrent: true, isReadable: true },
        { id: "", title: "Appendix", index: 2, isCurrent: false, isReadable: false }
      ],
      error: null
    }
  }));
  const rows = findByDataAction(shell, "reader-select-chapter");
  const closeButton = findByDataAction(shell, "reader-close-contents")[0];
  const currentRows = findAll(shell, (node) => node.getAttribute("aria-current") === "true");

  assert.match(shell.textContent, /Contents/);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].dataset.chapterIndex, "0");
  assert.equal(rows[1].dataset.chapterIndex, "1");
  assert.equal(rows[1].className.includes("is-current"), true);
  assert.equal(rows[2].disabled, true);
  assert.equal(currentRows.length, 1);
  assert.equal(currentRows[0].dataset.chapterIndex, "1");
  assert.ok(closeButton);
});

test("Controller initializes Home and Library data through books adapter DTOs", async () => {
  const { calls, adapters } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters });

  await controller.initialize();
  const state = store.getState();

  assert.equal(calls.listBooks, 1);
  assert.equal(calls.getContinueReading, 1);
  assert.equal(state.savedBookCount, 1);
  assert.equal(state.home.continueReading.bookKey, "book-one");
  assert.equal(state.library.status, "populated");
});

test("Controller supports Home and Library navigation without adapter calls", () => {
  const { calls, adapters } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters });

  controller.navigate(R3_ROUTES.LIBRARY);
  controller.navigate(R3_ROUTES.HOME);

  assert.equal(store.getState().activeScreen, R3_ROUTES.HOME);
  assert.equal(calls.listBooks, 0);
});

test("Controller delegates EPUB import and refreshes Library without creating fake Continue Reading", async () => {
  const { calls, adapters } = createAdapters({
    books: [],
    continueReading: null,
    importCreatesProgress: false
  });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters });
  const file = { name: "upload.epub", type: "application/epub+zip" };

  await controller.importBook(file);
  const state = store.getState();

  assert.deepEqual(calls.importBook, [file]);
  assert.equal(calls.listBooks, 1);
  assert.equal(calls.getContinueReading, 1);
  assert.equal(state.importStatus.isImporting, false);
  assert.equal(state.importStatus.lastImportedBookKey, "imported");
  assert.equal(state.library.status, "populated");
  assert.equal(state.savedBookCount, 1);
  assert.equal(state.home.snapshot.currentBookVersionStatus, null);
  assert.equal(state.home.snapshot.availableVersions, undefined);
  assert.equal(state.home.continueReading, null);

  const documentRef = createMockDocument();
  const view = createHomeView(documentRef, state);
  assert.doesNotMatch(view.textContent, /Current Book Snapshot/);
  assert.doesNotMatch(view.textContent, /Original only/);
});

test("Controller reports import loading and failure without stale success state", async () => {
  const error = new Error("Import failed");
  const { calls, adapters } = createAdapters({ books: [], continueReading: null, importError: error });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters });

  await controller.importBook({ name: "bad.epub" });
  const state = store.getState();

  assert.equal(calls.importBook.length, 1);
  assert.equal(state.importStatus.isImporting, false);
  assert.equal(state.importStatus.error.message, "Import failed");
  assert.equal(state.error.message, "Import failed");
  assert.equal(state.savedBookCount, 0);
});

test("Controller prevents duplicate concurrent imports", async () => {
  const harness = createAdapters({ deferredImport: true, books: [], continueReading: null });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters: harness.adapters });
  const first = controller.importBook({ name: "first.epub" });
  const second = controller.importBook({ name: "second.epub" });

  assert.equal(store.getState().importStatus.isImporting, true);
  assert.equal(harness.calls.importBook.length, 1);

  harness.setBooks([createBook({ bookKey: "after-import" })]);
  harness.setContinueReading(createContinueReading({ bookKey: "after-import" }));
  harness.resolveImport({ storedMetadata: { bookKey: "after-import" } });
  await Promise.all([first, second]);

  assert.equal(harness.calls.importBook.length, 1);
  assert.equal(store.getState().importStatus.lastImportedBookKey, "after-import");
});

test("Controller resume delegates to reader adapter and renders the real Reader", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("book-one");

  assert.deepEqual(calls.resumeBook, ["book-one"]);
  assert.equal(store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(store.getState().activeBookId, "book-one");
  assert.match(store.getState().reader.html, /Chapter 3 loaded from EPUB/);
});

test("Controller refreshes Home and Library from persisted adapter data after leaving Reader", async () => {
  const harness = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  await controller.initialize();
  await controller.resumeBook("book-one");
  harness.setBooks([
    createBook({
      bookKey: "book-one",
      currentChapterIndex: 1,
      progressLabel: "Chapter 2 / 3"
    })
  ]);
  harness.setContinueReading(createContinueReading({
    bookKey: "book-one",
    progress: {
      bookKey: "book-one",
      currentChapterIndex: 1,
      progressText: "Chapter 2 / 3",
      currentMode: "english-study"
    }
  }));

  await controller.exitReader();

  const state = store.getState();
  assert.equal(harness.calls.listBooks, 2);
  assert.equal(harness.calls.getContinueReading, 2);
  assert.equal(state.activeScreen, R3_ROUTES.HOME);
  assert.equal(state.home.continueReading.progress.progressText, "Chapter 2 / 3");
  assert.equal(state.library.books[0].progressLabel, "Chapter 2 / 3");
});

test("Unsupported actions are visibly disabled or marked unavailable", () => {
  const documentRef = createMockDocument();
  const shell = createAppShellView(documentRef, createShellState());
  const unsupported = findByDataAction(shell, "unsupported");
  const vocabularyNav = findAll(shell, (node) => node.dataset?.route === R3_ROUTES.VOCABULARY)[0];

  assert.ok(unsupported.length >= 3);
  assert.ok(unsupported.every((node) => node.disabled || node.getAttribute("aria-disabled") === "true"));
  assert.equal(vocabularyNav.getAttribute("aria-disabled"), "true");
});

test("Bootstrap binds one file-change, delegated click, reader-scroll, and lifecycle path", async () => {
  const documentRef = createMockDocument();
  const { calls, adapters } = createAdapters();

  const first = await bootstrapR3App({ document: documentRef, adapters });
  const second = await bootstrapR3App({ document: documentRef, adapters });
  const fileInputs = findAll(first.root, (node) => node.tagName === "INPUT" && node.type === "file");

  assert.equal(first, second);
  assert.equal(calls.listBooks, 1);
  assert.equal(fileInputs.length, 1);
  assert.equal(fileInputs[0].accept, ".epub,application/epub+zip");
  assert.equal(first.root.eventListeners.get("click").length, 1);
  assert.equal(first.root.eventListeners.get("change").length, 1);
  assert.equal(first.root.eventListeners.get("scroll").length, 1);
  assert.equal(documentRef.listeners.filter((entry) => entry.type === "visibilitychange").length, 1);
});

test("Bootstrap delegates Reader Contents actions to the controller", async () => {
  const documentRef = createMockDocument();
  const calls = [];
  const store = createR3Store(createShellState({
    activeScreen: R3_ROUTES.READER,
    activeBookId: "book-one",
    activeChapterId: "chapter-2",
    activeChapterIndex: 1,
    openOverlay: R3_OVERLAYS.CONTENTS,
    reader: {
      status: "ready",
      bookTitle: "The Wind in the Willows",
      chapterTitle: "The River Bank",
      html: "<article><p>Real fixture chapter text.</p></article>",
      chapterIndex: 1,
      chapterCount: 3,
      progressLabel: "The River Bank · 2 / 3",
      hasPrevious: true,
      hasNext: true,
      toc: [
        { id: "chapter-1", title: "The Open Road", index: 0, isCurrent: false, isReadable: true },
        { id: "chapter-2", title: "The River Bank", index: 1, isCurrent: true, isReadable: true }
      ],
      error: null
    }
  }));
  const controller = {
    async initialize() {
      calls.push(["initialize"]);
    },
    openReaderContents() {
      calls.push(["openReaderContents"]);
    },
    selectReaderChapter(index) {
      calls.push(["selectReaderChapter", index]);
    },
    closeOverlay() {
      calls.push(["closeOverlay"]);
    },
    applyReaderScrollRestoration() {},
    recordReaderScroll() {},
    flushReaderProgress() {}
  };

  const app = await bootstrapR3App({ document: documentRef, store, controller });
  const clickListener = app.root.eventListeners.get("click")[0];
  clickListener({ target: findByDataAction(app.root, "reader-contents")[0] });
  clickListener({ target: findByDataAction(app.root, "reader-select-chapter")[0] });
  clickListener({ target: findByDataAction(app.root, "reader-close-contents")[0] });

  assert.deepEqual(calls, [
    ["initialize"],
    ["openReaderContents"],
    ["selectReaderChapter", 0],
    ["closeOverlay"]
  ]);
});

test("R3 Home and Library views do not import adapters, engines, or unsafe HTML insertion", async () => {
  const viewDir = new URL("../pwa-reader/ui-r3/views/", import.meta.url);
  const componentDir = new URL("../pwa-reader/ui-r3/components/", import.meta.url);
  const files = [
    ...(await readdir(viewDir)).map((file) => new URL(file, viewDir)),
    ...(await readdir(componentDir)).map((file) => new URL(file, componentDir))
  ].filter((url) => url.pathname.endsWith(".js"));

  for (const fileUrl of files) {
    const source = await readFile(fileUrl, "utf8");
    const label = path.basename(fileUrl.pathname);
    assert.doesNotMatch(source, /adapters\//, label);
    assert.doesNotMatch(source, /storage\.js/, label);
    assert.doesNotMatch(source, /epubLoader\.js/, label);
    assert.doesNotMatch(source, /navigationEngine\.js/, label);
    assert.doesNotMatch(source, /vocabEngine\.js/, label);
    if (label !== "readerView.js") {
      assert.doesNotMatch(source, /innerHTML/, label);
    }
  }
});

test("R3 Home view does not use savedBookCount as version-status fallback", async () => {
  const source = await readFile(new URL("../pwa-reader/ui-r3/views/homeView.js", import.meta.url), "utf8");

  assert.doesNotMatch(source, /availableVersions\s*\?\?\s*state\.savedBookCount/);
  assert.doesNotMatch(source, /savedBookCount.*version/i);
});

test("R3 scoped CSS separates the fluid application shell from the bounded reading measure", async () => {
  const css = await readFile(new URL("../pwa-reader/ui-r3/styles/base.css", import.meta.url), "utf8");
  const tokens = await readFile(new URL("../pwa-reader/ui-r3/styles/tokens.css", import.meta.url), "utf8");
  const appFrameRule = css.match(/\.r3-app-frame\s*\{([^}]*)\}/s)?.[1] || "";
  const readerArticleRule = css.match(/\.r3-reader-article\s*\{([^}]*)\}/s)?.[1] || "";

  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(appFrameRule, /width:\s*100%/);
  assert.doesNotMatch(appFrameRule, /max-width:/);
  assert.match(tokens, /--r3-content-max:/);
  assert.match(tokens, /--r3-reading-measure:/);
  assert.match(tokens, /--r3-navigation-rail-width:/);
  assert.match(readerArticleRule, /max-width:\s*var\(--r3-reading-measure\)/);
});
