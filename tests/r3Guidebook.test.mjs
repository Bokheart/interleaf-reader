import assert from "node:assert/strict";
import test from "node:test";

import {
  GUIDE_BOOK_KEY,
  createGuideBook,
  isGuideBookKey
} from "../pwa-reader/guideBook.js";
import { createReaderAdapter } from "../pwa-reader/adapters/readerAdapter.js";
import { createModesAdapter } from "../pwa-reader/adapters/modesAdapter.js";
import { createHomeView } from "../pwa-reader/ui-r3/views/homeView.js";
import { createR3Controller } from "../pwa-reader/ui-r3/controller.js";
import { createR3Store } from "../pwa-reader/ui-r3/store.js";
import { R3_ROUTES } from "../pwa-reader/ui-r3/routes.js";
import { createTranslator } from "../pwa-reader/i18n.js";
import { MODES } from "../pwa-reader/readingModes.js";

function createMockNode(tagName = "div") {
  const node = {
    tagName: String(tagName).toUpperCase(),
    className: "",
    hidden: false,
    disabled: false,
    children: [],
    dataset: {},
    attributes: {},
    parentNode: null,
    style: {},
    _textContent: "",
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "disabled") this.disabled = true;
      if (name.startsWith("data-")) {
        const key = name
          .slice(5)
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        this.dataset[key] = String(value);
      }
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
    querySelectorAll() {
      return [];
    },
    set textContent(value) {
      this._textContent = String(value ?? "");
      this.children = [];
    },
    get textContent() {
      return `${this._textContent}${this.children.map((child) => child.textContent).join("")}`;
    }
  };
  return node;
}

function createMockDocument() {
  return {
    createElement(tagName) {
      return createMockNode(tagName);
    },
    createElementNS(_ns, tagName) {
      return createMockNode(tagName);
    },
    createDocumentFragment() {
      return createMockNode("fragment");
    }
  };
}

function collect(node, predicate, results = []) {
  if (!node) return results;
  if (predicate(node)) results.push(node);
  for (const child of node.children || []) {
    collect(child, predicate, results);
  }
  return results;
}

function createGuideHarness(options = {}) {
  const calls = {
    openGuide: [],
    openBook: [],
    loadEpubFromFile: [],
    loadChapterContent: [],
    savePosition: [],
    renderChapter: [],
    getReaderVocabulary: []
  };
  let progress = options.progress === undefined
    ? {
        bookKey: GUIDE_BOOK_KEY,
        currentChapterId: "guide-vocabulary",
        currentChapterIndex: 3,
        currentMode: MODES.ENGLISH_STUDY
      }
    : options.progress;
  const savedProgress = [];

  const adapters = {
    books: {
      async listBooks() {
        return options.books || [{
          bookKey: "imported-one",
          title: "Imported One",
          progressLabel: "Chapter 1 / 2"
        }];
      },
      async getContinueReading() {
        return options.continueReading === undefined
          ? {
              bookKey: "imported-one",
              title: "Imported One",
              hasFileBlob: true,
              progress: {
                bookKey: "imported-one",
                currentChapterIndex: 0,
                currentMode: MODES.ENGLISH_STUDY
              }
            }
          : options.continueReading;
      }
    },
    reader: {
      async openGuide(openOptions = {}) {
        calls.openGuide.push(openOptions);
        return {
          bookKey: GUIDE_BOOK_KEY,
          guideBook: createGuideBook(openOptions.mode || progress?.currentMode || MODES.ENGLISH_STUDY),
          progress,
          isBuiltInGuide: true
        };
      },
      async openBook(bookKey) {
        calls.openBook.push(bookKey);
        return {
          bookKey,
          savedBook: {
            bookKey,
            title: "Imported One",
            chapters: [
              { id: "c1", title: "One", order: 1 },
              { id: "c2", title: "Two", order: 2 }
            ]
          },
          progress: {
            bookKey,
            currentChapterIndex: 0,
            currentMode: MODES.ENGLISH_STUDY
          },
          file: { name: `${bookKey}.epub` }
        };
      },
      async resumeBook(bookKey = null) {
        return this.openBook(bookKey || "imported-one");
      },
      getTableOfContents(book = {}, currentChapterId = "") {
        return (book.chapters || []).map((chapter, index) => ({
          id: chapter.id,
          title: chapter.title,
          index,
          isCurrent: chapter.id === currentChapterId
        }));
      },
      restorePosition() {
        return null;
      },
      async savePosition(payload) {
        calls.savePosition.push(payload);
        const record = {
          bookKey: payload.bookKey,
          currentChapterId: payload.currentChapterId,
          currentChapterIndex: (payload.chapters || []).findIndex((chapter) => chapter.id === payload.currentChapterId),
          currentMode: payload.currentMode
        };
        savedProgress.push(record);
        if (payload.bookKey === GUIDE_BOOK_KEY) {
          progress = record;
        }
        return record;
      }
    },
    vocabulary: {
      async getReaderVocabulary(chapter) {
        calls.getReaderVocabulary.push(chapter?.id || null);
        return {
          items: [
            { term: "preview", type: "guide" },
            { term: "known", type: "guide" },
            { term: "learning", type: "guide" }
          ],
          profile: {
            knownWords: ["known"],
            learningWords: ["learning"],
            ignoredWords: ["hidden"],
            selectedLevel: "level3"
          },
          resolveMatch: null
        };
      },
      getChapterPreview(chapter, items = []) {
        return items;
      },
      getTermMetadata(term, items = []) {
        return items.find((item) => item.term === term) || { term };
      },
      async setTermState() {
        return {
          knownWords: ["known"],
          learningWords: ["learning"],
          ignoredWords: ["hidden"],
          selectedLevel: "level3"
        };
      }
    },
    modes: {
      getModeConstants() {
        return { ...MODES };
      },
      resolveModeFromProgress(nextProgress, fallback) {
        return nextProgress?.currentMode || fallback || MODES.ENGLISH_STUDY;
      },
      getModeAvailability(context = {}) {
        return createModesAdapter().getModeAvailability(context);
      },
      renderChapter(chapter, mode, renderOptions = {}) {
        calls.renderChapter.push({
          chapterId: chapter?.id,
          mode,
          isBuiltInGuide: Boolean(renderOptions.isBuiltInGuide)
        });
        const guideHtml = chapter?.contentVariants
          ? (mode === MODES.CHINESE
            ? chapter.contentVariants.chinese?.html
            : mode === MODES.CLOZE_MIXED
              ? chapter.contentVariants.bilingual?.html
              : chapter.contentVariants.english?.html)
          : chapter?.originalHtml;
        return {
          html: `<section data-mode="${mode}">${guideHtml || chapter?.title || ""}</section>`,
          vocabularyPreview: renderOptions.vocabularyItems || []
        };
      }
    },
    settings: {
      getPreferences() {
        return {
          uiLanguage: "en",
          hasChosenUiLanguage: true,
          readingLayout: "page"
        };
      },
      setReadingLayout(layout) {
        return { readingLayout: layout };
      }
    }
  };

  const readerRuntime = {
    async loadEpubFromFile(file) {
      calls.loadEpubFromFile.push(file);
      return {
        handle: { destroy() {} },
        book: {
          title: "Imported One",
          chapters: [
            { id: "c1", title: "One", order: 1, originalHtml: "<p>One</p>", plainText: "One" },
            { id: "c2", title: "Two", order: 2, originalHtml: "<p>Two</p>", plainText: "Two" }
          ]
        }
      };
    },
    async loadChapterContent(handle, chapter) {
      calls.loadChapterContent.push(chapter?.id || null);
      return {
        ...chapter,
        originalHtml: chapter.originalHtml || `<p>${chapter.title}</p>`,
        plainText: chapter.plainText || chapter.title,
        renderError: null
      };
    },
    destroyHandle() {}
  };

  return {
    calls,
    adapters,
    readerRuntime,
    getProgress: () => progress,
    getSavedProgress: () => savedProgress
  };
}

test("R3 Home Guide card is enabled and targets the stable built-in Guide identity", () => {
  const documentRef = createMockDocument();
  const view = createHomeView(documentRef, {
    home: {
      recentBooks: [],
      continueReading: null,
      snapshot: null
    }
  }, createTranslator("en"));
  const guideCard = collect(view, (node) => node.dataset?.action === "open-guide")[0];

  assert.ok(guideCard, "Guide card exists");
  assert.equal(guideCard.disabled, false);
  assert.equal(guideCard.getAttribute("aria-disabled"), null);
  assert.equal(guideCard.dataset.bookKey, GUIDE_BOOK_KEY);
  assert.match(guideCard.textContent, /Built-in Guide/);
  assert.match(guideCard.textContent, /Not a user-imported EPUB/);
  assert.equal(collect(view, (node) => node.dataset?.action === "unsupported" && node.className.includes("r3-guide-card")).length, 0);
});

test("readerAdapter opens Guide without treating it as an imported EPUB blob", async () => {
  const progressCalls = [];
  const adapter = createReaderAdapter({
    getReadingProgress: async (bookKey) => {
      progressCalls.push(bookKey);
      return {
        bookKey,
        currentChapterId: "guide-first-book",
        currentChapterIndex: 1,
        currentMode: MODES.CHINESE
      };
    },
    getStoredBook: async () => {
      throw new Error("Guide must not look up a stored EPUB");
    }
  });

  const payload = await adapter.openGuide();

  assert.deepEqual(progressCalls, [GUIDE_BOOK_KEY]);
  assert.equal(payload.bookKey, GUIDE_BOOK_KEY);
  assert.equal(payload.isBuiltInGuide, true);
  assert.equal(payload.guideBook.id, GUIDE_BOOK_KEY);
  assert.equal(payload.guideBook.isBuiltInGuide, true);
  assert.equal("file" in payload, false);
  assert.equal("savedBook" in payload, false);
  assert.equal(payload.guideBook.chapters.length, 6);
  assert.equal(isGuideBookKey(payload.bookKey), true);

  await assert.rejects(
    () => adapter.openBook(GUIDE_BOOK_KEY),
    /openGuide/
  );
});

test("R3 openGuide restores Guide chapter progress and skips EPUB loading", async () => {
  const harness = createGuideHarness();
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  await controller.initialize();
  const state = await controller.openGuide();

  assert.equal(state.activeScreen, R3_ROUTES.READER);
  assert.equal(state.activeBookId, GUIDE_BOOK_KEY);
  assert.equal(state.activeChapterId, "guide-vocabulary");
  assert.equal(state.activeChapterIndex, 3);
  assert.equal(state.reader.status, "ready");
  assert.equal(state.reader.bookTitle, "Interleaf Reader Guide");
  assert.equal(harness.calls.openGuide.length, 1);
  assert.equal(harness.calls.loadEpubFromFile.length, 0);
  assert.equal(harness.calls.loadChapterContent.length, 0);
  assert.equal(harness.calls.renderChapter[0].isBuiltInGuide, true);
  assert.ok(harness.calls.getReaderVocabulary.includes("guide-vocabulary"));
});

test("R3 openGuide starts at chapter 0 when Guide has no saved progress", async () => {
  const harness = createGuideHarness({ progress: null });
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  const state = await controller.openGuide();

  assert.equal(state.reader.status, "ready");
  assert.equal(state.activeBookId, GUIDE_BOOK_KEY);
  assert.equal(state.activeChapterId, "guide-welcome");
  assert.equal(state.activeChapterIndex, 0);
  assert.equal(state.error, null);
});

test("R3 Guide chapter navigation stays inside the built-in virtual book", async () => {
  const harness = createGuideHarness({
    progress: {
      bookKey: GUIDE_BOOK_KEY,
      currentChapterId: "guide-welcome",
      currentChapterIndex: 0,
      currentMode: MODES.ENGLISH_STUDY
    }
  });
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  await controller.openGuide();
  await controller.goToReaderChapter("next");
  let state = store.getState();
  assert.equal(state.activeChapterId, "guide-first-book");
  assert.equal(state.activeChapterIndex, 1);

  await controller.selectReaderChapter(4);
  state = store.getState();
  assert.equal(state.activeChapterId, "guide-level-export-backup");
  assert.equal(state.activeChapterIndex, 4);
  assert.equal(state.activeBookId, GUIDE_BOOK_KEY);
  assert.equal(harness.calls.loadChapterContent.length, 0);
});

test("R3 Guide English, Chinese, and Mixed variants remain Guide-only authored content", async () => {
  const harness = createGuideHarness({
    progress: {
      bookKey: GUIDE_BOOK_KEY,
      currentChapterId: "guide-welcome",
      currentChapterIndex: 0,
      currentMode: MODES.ENGLISH_STUDY
    }
  });
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  await controller.openGuide();

  for (const mode of [MODES.ENGLISH_STUDY, MODES.CHINESE, MODES.CLOZE_MIXED]) {
    await controller.setReaderMode(mode);
    const state = store.getState();
    assert.equal(state.activeReadingMode, mode);
    assert.equal(state.reader.status, "ready");
    const lastRender = harness.calls.renderChapter.at(-1);
    assert.equal(lastRender.mode, mode);
    assert.equal(lastRender.isBuiltInGuide, true);
    assert.match(state.reader.html, new RegExp(`data-mode="${mode}"`));
  }

  const availability = createModesAdapter().getModeAvailability({ isBuiltInGuide: true });
  assert.deepEqual(availability.map((mode) => [mode.value, mode.available]), [
    [MODES.ENGLISH_STUDY, true],
    [MODES.CHINESE, true],
    [MODES.CLOZE_MIXED, true]
  ]);

  const importedAvailability = createModesAdapter().getModeAvailability({ isBuiltInGuide: false });
  assert.deepEqual(importedAvailability.map((mode) => [mode.value, mode.available]), [
    [MODES.ENGLISH_STUDY, true],
    [MODES.CHINESE, false],
    [MODES.CLOZE_MIXED, false]
  ]);
});

test("Normal imported-book opening remains unchanged beside Guide", async () => {
  const harness = createGuideHarness();
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  await controller.openGuide();
  await controller.exitReader();
  const state = await controller.selectBook("imported-one");

  assert.equal(state.activeBookId, "imported-one");
  assert.equal(state.reader.bookTitle, "Imported One");
  assert.equal(harness.calls.openBook.at(-1), "imported-one");
  assert.equal(harness.calls.loadEpubFromFile.length, 1);
  assert.ok(harness.calls.loadChapterContent.includes("c1"));
  assert.equal(state.activeBookId !== GUIDE_BOOK_KEY, true);
});

test("Guide vocabulary assistance still loads while Guide is open", async () => {
  const harness = createGuideHarness({
    progress: {
      bookKey: GUIDE_BOOK_KEY,
      currentChapterId: "guide-vocabulary",
      currentChapterIndex: 3,
      currentMode: MODES.ENGLISH_STUDY
    }
  });
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  const state = await controller.openGuide();

  assert.equal(state.reader.status, "ready");
  assert.deepEqual(
    state.reader.vocabularyItems.map((item) => item.term),
    ["preview", "known", "learning"]
  );
  assert.ok(harness.calls.getReaderVocabulary.includes("guide-vocabulary"));
});

test("Guide progress can restore without entering Local Library as an imported EPUB", async () => {
  const harness = createGuideHarness({
    progress: {
      bookKey: GUIDE_BOOK_KEY,
      currentChapterId: "guide-reader-tools",
      currentChapterIndex: 2,
      currentMode: MODES.ENGLISH_STUDY
    }
  });
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: harness.adapters,
    readerRuntime: harness.readerRuntime
  });

  await controller.openGuide();
  await controller.goToReaderChapter("next");
  await controller.flushReaderProgress();

  const saved = harness.getSavedProgress().filter((record) => record.bookKey === GUIDE_BOOK_KEY);
  assert.ok(saved.length >= 1);
  assert.equal(saved.at(-1).currentChapterId, "guide-vocabulary");
  assert.equal(isGuideBookKey(saved.at(-1).bookKey), true);

  const books = await harness.adapters.books.listBooks();
  assert.equal(books.some((book) => book.bookKey === GUIDE_BOOK_KEY), false);
});
