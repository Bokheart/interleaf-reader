import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { R3_ACTIONS, r3Actions } from "../pwa-reader/ui-r3/actions.js";
import {
  bootstrapR3App,
  collectVocabularyOccurrences,
  getReaderSelectionCapture,
  getReaderSelectionTerm,
  scrollToVocabularyHit
} from "../pwa-reader/ui-r3/bootstrap.js";
import { createR3Controller } from "../pwa-reader/ui-r3/controller.js";
import { bindReaderHistory } from "../pwa-reader/ui-r3/readerHistory.js";
import { R3_OVERLAYS, R3_ROUTES } from "../pwa-reader/ui-r3/routes.js";
import { createAppShellView } from "../pwa-reader/ui-r3/views/appShellView.js";
import { createReaderView } from "../pwa-reader/ui-r3/views/readerView.js";
import {
  createInitialR3State,
  createR3Store,
  r3Reducer
} from "../pwa-reader/ui-r3/store.js";

test('R3 bubble loads dynamic metadata without changing vocabulary identity or state', async () => {
  const { adapters, readerRuntime } = createAdapters();
  const pending = createDeferred();
  const item = { term: 'go', capture: { sentence: 'They went.', targetOffset: 5, targetEnd: 9 } };
  adapters.modes.resolveModeFromProgress = () => 'english-study';
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: { learningWords: ['go'] }, items: [item] });
  adapters.vocabulary.getTermMetadata = () => item;
  adapters.vocabulary.resolveTermMetadata = () => pending.promise;
  adapters.modes.renderChapter = () => ({ html: '<p>They went.</p>', vocabularyPreview: [item] });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook('recent');
  controller.toggleVocabularyBubble('go', { x: 20, y: 40 });
  const before = structuredClone(store.getState().reader);
  assert.deepEqual(store.getState().reader.vocabularyBubble.item, item);
  pending.resolve({ chineseMeaning: '去', englishDefinition: 'move to another place', source: 'authored', status: 'dictionary', term: 'evil', capture: null, libraryKey: 'en:evil' });
  await new Promise(resolve => setImmediate(resolve));
  const reader = store.getState().reader;
  assert.equal(reader.vocabularyBubble.item.chineseMeaning, '去');
  assert.equal(reader.vocabularyBubble.item.englishDefinition, 'move to another place');
  assert.equal(reader.vocabularyBubble.item.term, 'go');
  assert.deepEqual(reader.vocabularyBubble.item.capture, item.capture);
  assert.equal('libraryKey' in reader.vocabularyBubble.item, false);
  assert.deepEqual(reader.learningWords, before.learningWords);
  assert.deepEqual(reader.vocabularyItems, before.vocabularyItems);
  const nodes = collectNodes(createReaderView(createMockDocument(), store.getState()));
  const bubble = nodes.find(node => node.className === 'r3-vocabulary-bubble');
  assert.equal(bubble.dataset.metadataSource, 'authored');
  assert.equal(bubble.dataset.metadataStatus, 'dictionary');
  assert.ok(nodes.some(node => node.textContent === '去'));
  assert.ok(nodes.some(node => node.textContent === 'move to another place'));
});

test('R3 bubble keeps usable fallback on miss/failure and ignores late closed, replaced or navigated lookups', async () => {
  for (const outcome of ['miss', 'failure', 'closed', 'replaced', 'chapter']) {
    const { adapters, readerRuntime } = createAdapters();
    const pending = createDeferred();
    const items = [{ term: 'go', englishDefinition: 'fallback' }, { term: 'steal' }];
    adapters.modes.resolveModeFromProgress = () => 'english-study';
    adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items });
    adapters.vocabulary.getTermMetadata = term => items.find(item => item.term === term);
    adapters.vocabulary.resolveTermMetadata = term => term === 'go' ? pending.promise : Promise.resolve(items[1]);
    adapters.modes.renderChapter = () => ({ html: '<p>go steal</p>', vocabularyPreview: items });
    const store = createR3Store();
    const controller = createR3Controller({ store, adapters, readerRuntime });
    await controller.resumeBook('recent');
    controller.toggleVocabularyBubble('go');
    if (outcome === 'closed') controller.closeVocabularyBubble();
    if (outcome === 'replaced') controller.toggleVocabularyBubble('steal');
    if (outcome === 'chapter') await controller.selectReaderChapter(0);
    if (outcome === 'failure') pending.reject(new Error('offline'));
    else pending.resolve({ status: outcome === 'miss' ? 'miss' : 'dictionary', source: '', englishDefinition: outcome === 'miss' ? '' : 'late' });
    await new Promise(resolve => setImmediate(resolve));
    const bubble = store.getState().reader.vocabularyBubble;
    if (['miss', 'failure'].includes(outcome)) assert.equal(bubble.item.englishDefinition, 'fallback');
    if (['closed', 'chapter'].includes(outcome)) assert.equal(bubble, null);
    if (outcome === 'replaced') assert.equal(bubble.term, 'steal');
  }
});

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

test("R3 reading survives an unavailable or failing identity module with the real corpus adapter", async () => {
  const adapterUrl = new URL('../pwa-reader/adapters/vocabularyAdapter.js', import.meta.url);
  const source = await readFile(adapterUrl, 'utf8');
  const { loadEffectiveKnownWordsForProfile } = await import('../pwa-reader/levelBaselineEngine.js');
  const readerRoot = new URL('../pwa-reader/', import.meta.url);
  for (const identityUrl of [
    new URL('../generated/r1-convergence/absent-identity.mjs', import.meta.url).href,
    'data:text/javascript,' + encodeURIComponent('export function addOccurrenceForms() { throw new Error("identity failure"); } export function captureOccurrence() {} export function resolveCapture() {}')
  ]) {
    // Fault injection changes only the optional module URL; the adapter and
    // controller execute their production loading and recovery paths.
    const isolatedSource = source.replace(/from "(\.\.\/[^\"]+)"/g, (_, path) => `from "${new URL(path, adapterUrl).href}"`)
      .replaceAll('import("../identity/runtime.mjs")', `import(${JSON.stringify(identityUrl)})`);
    const { createVocabularyAdapter } = await import(`data:text/javascript;base64,${Buffer.from(isolatedSource).toString('base64')}`);
    const { adapters, readerRuntime } = createAdapters();
    adapters.vocabulary = createVocabularyAdapter({
      getVocabularyProfile: async () => ({ selectedLevel: 'level1' }),
      loadVocabularyData: async () => [{ term: 'go' }],
      loadEffectiveKnownWordsForProfile: profile => loadEffectiveKnownWordsForProfile(profile, {
        fetchImpl: async path => ({ ok: true, json: async () => JSON.parse(await readFile(new URL(path, readerRoot), 'utf8')) })
      })
    });
    adapters.modes.resolveModeFromProgress = () => 'english-study';
    adapters.modes.renderChapter = chapter => ({ html: chapter.originalHtml, vocabularyPreview: [] });
    readerRuntime.loadChapterContent = async () => ({ id: 'chapter-2', title: 'Chapter 2', plainText: 'They went home.', originalHtml: '<p>They went home.</p>' });
    const store = createR3Store();
    const controller = createR3Controller({ store, adapters, readerRuntime });
    await controller.resumeBook('recent');
    assert.equal(store.getState().reader.status, 'ready');
    assert.equal(store.getState().reader.html, '<p>They went home.</p>');
    assert.ok(store.getState().reader.vocabularyMessage);
    assert.deepEqual(store.getState().reader.vocabularyItems, []);
  }
});

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
    createTextNode(text) {
      return {
        nodeType: 3,
        textContent: String(text || ""),
        children: [],
        parentNode: null,
        ownerDocument: documentRef
      };
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

function collectNodes(root) {
  const nodes = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.shift();
    nodes.push(node);
    stack.push(...(node.children || []));
  }
  return nodes;
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
    getPreferences: 0,
    setUiLanguage: [],
    setReadingLayout: [],
    setReaderAppearance: []
  };
  let preferences = {
    uiLanguage: "en",
    hasChosenUiLanguage: true,
    guideVisibleInLibrary: true,
    readingLayout: "page",
    readerAppearance: {
      fontSize: "md",
      lineHeight: "normal",
      margin: "medium",
      theme: "light"
    }
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
        resolveModeFromProgress(progress, fallback = "english-study") {
          calls.resolveModeFromProgress.push({ progress, fallback });
          return progress?.currentMode || fallback;
        },
        // This renderer supplies synthetic readable prose for every fixture mode.
        // Production unavailable representations are covered by languageModePersistence.
        getModeRepresentation(mode) {
          return { requestedMode: mode, effectiveMode: mode, representationStatus: "ready" };
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
          return { ...preferences };
        },
        setUiLanguage(language) {
          calls.setUiLanguage.push(language);
          preferences = {
            ...preferences,
            uiLanguage: language,
            hasChosenUiLanguage: true
          };
          return { ...preferences };
        },
        setReadingLayout(layout) {
          calls.setReadingLayout.push(layout);
          preferences = {
            ...preferences,
            readingLayout: layout === "scroll" ? "scroll" : "page"
          };
          return { ...preferences };
        },
        setReaderAppearance(appearance) {
          calls.setReaderAppearance.push(appearance);
          const current = preferences.readerAppearance || {};
          preferences = {
            ...preferences,
            readerAppearance: {
              fontSize: ["sm", "md", "lg", "xl"].includes(appearance?.fontSize) ? appearance.fontSize : (current.fontSize || "md"),
              lineHeight: ["tight", "normal", "relaxed"].includes(appearance?.lineHeight) ? appearance.lineHeight : (current.lineHeight || "normal"),
              margin: ["narrow", "medium", "wide"].includes(appearance?.margin) ? appearance.margin : (current.margin || "medium"),
              theme: ["light", "dark"].includes(appearance?.theme) ? appearance.theme : (current.theme || "light")
            }
          };
          return { ...preferences };
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

test("R3 chrome toggles without rebuilding prose and excludes interactive or selected content", async () => {
  const document = createMockDocument();
  const chromeTimers = createTimerHarness();
  document.defaultView = { ...chromeTimers.timers, addEventListener() {} };
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const app = await bootstrapR3App({ document, store, controller });
  await app.controller.resumeBook("recent");
  const root = document.getElementById("r3-root");
  const click = root.eventListeners.get("click")[0];
  const content = collectNodes(root).find(node => node.className === "r3-reader-content");
  click({ target: content, detail: 1 });
  click({ target: content, detail: 2 });
  chromeTimers.runAll();
  assert.equal(app.store.getState().reader.chromeVisible, true, "double-click selection must not hide chrome");
  click({ target: content });
  chromeTimers.runAll();
  assert.equal(app.store.getState().reader.chromeVisible, false);
  assert.equal(collectNodes(root).find(node => node.className === "r3-reader-content"), content);
  click({ target: content });
  chromeTimers.runAll();
  assert.equal(app.store.getState().reader.chromeVisible, true);
  for (const tag of ["button", "a", "input", "select", "textarea"]) {
    const target = document.createElement(tag);
    content.appendChild(target);
    click({ target });
    chromeTimers.runAll();
    assert.equal(app.store.getState().reader.chromeVisible, true, tag);
  }
  const hit = document.createElement("span");
  hit.className = "vocab-hit";
  content.appendChild(hit);
  click({ target: hit });
  document.getSelection = () => ({ isCollapsed: false, toString: () => "selected prose" });
  click({ target: content });
  chromeTimers.runAll();
  assert.equal(app.store.getState().reader.chromeVisible, true);
  document.getSelection = () => null;
  app.controller.openReaderContents();
  app.controller.toggleReaderChrome();
  assert.equal(app.store.getState().reader.chromeVisible, true);
});

test("R3 chrome has left icon Back, four quick controls, Contents scrim and Progress navigation", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  const document = createMockDocument();
  let nodes = collectNodes(createReaderView(document, store.getState()));
  const header = nodes.find(node => node.className === "r3-reader-header");
  assert.equal(header.children[0].dataset.action, "reader-back");
  assert.equal(header.children[0].children[0].tagName, "SVG");
  assert.equal(header.children[0].textContent, "");
  const footer = nodes.find(node => node.className === "r3-reader-quick-controls");
  assert.deepEqual(footer.children.map(node => node.dataset.action), ["reader-contents", "reader-progress", "vocabulary-preview-open", "reader-mode"]);
  controller.openReaderContents();
  nodes = collectNodes(createReaderView(document, store.getState()));
  assert.equal(nodes.find(node => node.className === "r3-reader-scrim").dataset.action, "reader-close-contents");
  controller.closeOverlay();
  controller.openReaderProgress();
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.PROGRESS);
  nodes = collectNodes(createReaderView(document, store.getState()));
  const slider = nodes.find(node => node.dataset.action === "reader-progress-page");
  assert.equal(slider.value, 0);
  await controller.seekReaderPosition(0, { chapterId: "chapter-1", textOffset: 25 });
  await controller.flushReaderProgress();
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.PROGRESS);
  assert.equal(calls.savePosition.at(-1).currentChapterId, "chapter-1");
});

test("R3 Page removes persistent arrow buttons while Scroll appends boundary-aware chapter actions", () => {
  const document = createMockDocument();
  const base = {
    status: "ready",
    chapterTitle: "Chapter",
    html: "<p>Reader text</p>",
    pagination: { status: "ready", pageIndex: 1, pageCount: 3 }
  };
  const page = collectNodes(createReaderView(document, createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    reader: { ...base, readingLayout: "page", hasPrevious: true, hasNext: true }
  })));
  assert.equal(page.some(node => ["reader-page-previous", "reader-page-next"].includes(node.dataset?.action)), false);
  assert.ok(page.some(node => node.dataset?.role === "reader-page-label"));
  assert.equal(page.some(node => node.className === "r3-reader-chapter-end-nav"), false);

  const first = collectNodes(createReaderView(document, createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    reader: { ...base, readingLayout: "scroll", hasPrevious: false, hasNext: true }
  })));
  assert.deepEqual(first.filter(node => node.parentNode?.className === "r3-reader-chapter-end-nav").map(node => node.dataset.action), ["reader-next"]);

  const last = collectNodes(createReaderView(document, createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    reader: { ...base, readingLayout: "scroll", hasPrevious: true, hasNext: false }
  })));
  assert.deepEqual(last.filter(node => node.parentNode?.className === "r3-reader-chapter-end-nav").map(node => node.dataset.action), ["reader-previous"]);
});

test("R3 Page swipe and Arrow keys turn once while selection, controls, overlays and multitouch arbitrate", async () => {
  const document = createMockDocument();
  document.defaultView = { innerWidth: 393, addEventListener() {} };
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const app = await bootstrapR3App({ document, store, controller });
  await controller.resumeBook("recent");
  const root = app.root;
  const content = collectNodes(root).find(node => node.className === "r3-reader-content");
  const scroll = collectNodes(root).find(node => node.className === "r3-reader-scroll");
  const turns = [];
  root.__readerLayout = { turn: direction => turns.push(direction) };
  const down = root.eventListeners.get("pointerdown")[0];
  const up = root.eventListeners.get("pointerup")[0];
  const cancel = root.eventListeners.get("pointercancel")[0];
  const move = root.eventListeners.get("pointermove")[0];
  const keydown = root.eventListeners.get("keydown")[0];
  const pointer = (target, pointerId, x, y, extras = {}) => ({
    target, pointerId, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, ...extras
  });

  down(pointer(content, 1, 300, 420));
  up(pointer(content, 1, 220, 428));
  down(pointer(content, 2, 90, 420));
  up(pointer(content, 2, 180, 414));
  assert.deepEqual(turns, [1, -1]);

  down(pointer(content, 3, 200, 420));
  up(pointer(content, 3, 165, 422));
  down(pointer(content, 4, 260, 300));
  up(pointer(content, 4, 190, 410));
  assert.deepEqual(turns, [1, -1]);

  document.getSelection = () => ({ isCollapsed: false, toString: () => "selected prose" });
  down(pointer(content, 5, 300, 420));
  up(pointer(content, 5, 220, 428));
  document.getSelection = () => null;
  for (const target of [
    document.createElement("button"),
    document.createElement("a"),
    Object.assign(document.createElement("span"), { className: "vocab-hit" }),
    Object.assign(document.createElement("div"), { className: "r3-vocabulary-bubble" })
  ]) {
    content.appendChild(target);
    down(pointer(target, 6, 300, 420));
    up(pointer(target, 6, 220, 428));
  }
  controller.openReaderMode();
  down(pointer(content, 7, 300, 420));
  up(pointer(content, 7, 220, 428));
  controller.closeOverlay();
  down(pointer(content, 8, 300, 420));
  down(pointer(content, 9, 290, 420, { isPrimary: false }));
  up(pointer(content, 8, 220, 428));
  cancel(pointer(content, 9, 290, 420, { isPrimary: false }));
  assert.deepEqual(turns, [1, -1]);

  down(pointer(content, 10, 10, 400, { timeStamp: 100 }));
  move(pointer(content, 10, 70, 400, { timeStamp: 140 }));
  up(pointer(content, 10, 140, 400, { timeStamp: 180 }));
  down(pointer(content, 11, 250, 400, { timeStamp: 100 }));
  move(pointer(content, 11, 248, 430, { timeStamp: 130 }));
  up(pointer(content, 11, 120, 430, { timeStamp: 180 }));
  down(pointer(content, 12, 250, 400, { timeStamp: 100 }));
  move(pointer(content, 12, 120, 400, { timeStamp: 480 }));
  up(pointer(content, 12, 120, 400, { timeStamp: 500 }));
  assert.deepEqual(turns, [1, -1], "edge, vertical-then-horizontal, and long-press never turn");
  down(pointer(content, 13, 250, 400, { timeStamp: 100 }));
  let prevented = false;
  move(pointer(content, 13, 225, 402, { timeStamp: 130, cancelable: true, preventDefault() { prevented = true; } }));
  assert.equal(prevented, true, "horizontal intent is claimed before pointerup");
  document.getSelection = () => ({ isCollapsed: false, toString: () => "selection" });
  move(pointer(content, 13, 200, 402, { timeStamp: 150 }));
  document.getSelection = () => null;
  up(pointer(content, 13, 100, 402, { timeStamp: 200 }));
  assert.deepEqual(turns, [1, -1], "selection rejection remains sticky after deselection");

  keydown({ key: "ArrowLeft", target: scroll, preventDefault() {} });
  keydown({ key: "ArrowRight", target: scroll, preventDefault() {} });
  assert.deepEqual(turns, [1, -1, -1, 1]);

  down(pointer(content, 20, 280, 400));
  // Safari may retarget the terminal event outside the shell after replacement.
  // A fresh primary pointer establishes a new touch session even if it was lost.
  down(pointer(content, 21, 280, 400));
  up(pointer(content, 21, 100, 400));
  assert.deepEqual(turns, [1, -1, -1, 1, 1], "lost terminal cannot permanently poison multitouch arbitration");
});

test("R3 Mode uses adapter availability and persists only a successful available mode", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openReaderMode();
  const nodes = collectNodes(createReaderView(createMockDocument(), store.getState()));
  const choices = nodes.filter(node => node.dataset.action === "reader-select-mode");
  assert.deepEqual(choices.map(node => [node.dataset.mode, Boolean(node.disabled)]), [["english-study", false], ["chinese", true], ["cloze-mixed", true]]);
  await controller.setReaderMode("chinese");
  assert.equal(store.getState().activeReadingMode, "english-study");
  adapters.modes.getModeAvailability = () => [{ value: "english-study", available: true }, { value: "chinese", available: true }];
  await controller.setReaderMode("chinese");
  await controller.flushReaderProgress();
  assert.equal(store.getState().activeReadingMode, "chinese");
  assert.match(store.getState().reader.html, /rendered in chinese/);
  assert.equal(store.getState().openOverlay, null);
  assert.equal(calls.savePosition.at(-1).currentMode, "chinese");
  controller.openReaderMode();
  adapters.modes.renderChapter = () => { throw new Error("render failed"); };
  await controller.setReaderMode("english-study");
  assert.equal(store.getState().activeReadingMode, "chinese");
  assert.match(store.getState().reader.html, /rendered in chinese/);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.MODE);
  assert.ok(store.getState().reader.modeMessage);
});

test("R3 bubble closes after successful mutation before refresh but remains on failed mutation", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter", englishDefinition: "to speak quietly" };
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items: [item] });
  adapters.vocabulary.getTermMetadata = () => item;
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [item] });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.toggleVocabularyBubble("mutter", { x: 1, y: 2 });
  adapters.vocabulary.setTermState = async () => { throw new Error("storage failed"); };
  await controller.setReaderVocabularyState("known");
  assert.equal(store.getState().reader.vocabularyBubble.term, "mutter");
  assert.ok(store.getState().reader.vocabularyMessage);
  const refresh = createDeferred();
  const started = createDeferred();
  adapters.vocabulary.setTermState = async () => {};
  adapters.vocabulary.getReaderVocabulary = () => { started.resolve(); return refresh.promise; };
  const saving = controller.setReaderVocabularyState("learning");
  await started.promise;
  assert.equal(store.getState().reader.vocabularyBubble, null);
  refresh.resolve({ profile: { learningWords: ["mutter"] }, items: [item] });
  await saving;
  assert.deepEqual(store.getState().reader.learningWords, ["mutter"]);
});

test("R3 slow mode change cannot overwrite a newer chapter", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  const pending = createDeferred();
  const started = createDeferred();
  let reads = 0;
  adapters.vocabulary.getReaderVocabulary = async () => {
    if (++reads === 1) { started.resolve(); return pending.promise; }
    return { profile: {}, items: [] };
  };
  controller.openReaderMode();
  const switching = controller.setReaderMode("english-study");
  await started.promise;
  await controller.selectReaderChapter(0);
  pending.resolve({ profile: {}, items: [] });
  await switching;
  await controller.flushReaderProgress();
  assert.equal(store.getState().activeChapterId, "chapter-1");
  assert.equal(store.getState().activeReadingMode, "cloze-mixed");
  assert.match(store.getState().reader.html, /Chapter 1 rendered in cloze-mixed/);
  assert.equal(store.getState().reader.modeSaving, false);
  assert.equal(calls.savePosition.at(-1).currentChapterId, "chapter-1");
});

test("R3 Progress and Mode close preserve scroll and wire chapter controls without chrome toggling", async () => {
  const document = createMockDocument();
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const app = await bootstrapR3App({ document, store, controller });
  await controller.resumeBook("recent");
  const root = app.root;
  const find = className => collectNodes(root).find(node => node.className === className);
  const action = name => collectNodes(root).find(node => node.dataset?.action === name);
  const click = root.eventListeners.get("click")[0];
  const scroll = find("r3-reader-scroll");
  scroll.scrollTop = 240;
  scroll.scrollHeight = 1000;
  scroll.clientHeight = 200;
  controller.recordReaderScroll(scroll);
  for (const name of ["reader-progress", "reader-mode"]) {
    click({ target: action(name) });
    assert.ok(store.getState().openOverlay);
    click({ target: action("reader-close-surface") });
    assert.equal(store.getState().openOverlay, null);
    assert.equal(find("r3-reader-scroll").scrollTop, 240);
    assert.equal(store.getState().reader.chromeVisible, true);
  }
  click({ target: action("reader-progress") });
  const slider = action("reader-progress-page");
  root.__readerLayout = { seek: () => controller.seekReaderPosition(0, { chapterId: "chapter-1", textOffset: 0 }) };
  slider.value = "0";
  root.eventListeners.get("input")[0]({ target: slider });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.getState().activeChapterIndex, 0);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.PROGRESS);
});

test("R3 Page/Scroll share one global layout and keep logical position per book", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  assert.equal(store.getState().reader.readingLayout, "page");
  const position = { chapterId: "chapter-2", textOffset: 123 };
  controller.recordReaderPosition(position, { scrollTop: 240, scrollHeight: 1000, clientHeight: 200 });
  controller.openReaderMode();
  const nodes = collectNodes(createReaderView(createMockDocument(), store.getState()));
  assert.deepEqual(nodes.filter(node => node.dataset.action === "reader-select-layout").map(node => node.dataset.layout), ["page", "scroll"]);
  await controller.setReadingLayout("scroll");
  await controller.flushReaderProgress();
  const payload = calls.savePosition.at(-1);
  assert.deepEqual(payload.overrides.logicalPosition, position);
  assert.equal("readingLayout" in payload.overrides, false);
  assert.equal("pageIndex" in payload.overrides, false);
  assert.equal(payload.currentMode, "cloze-mixed");
  assert.equal(store.getState().settings.readingLayout, "scroll");
  const restoration = await adapters.reader.resumeBook("recent");
  adapters.reader.resumeBook = async () => ({
    ...restoration,
    progress: { ...restoration.progress, ...payload.overrides, readingLayout: "page" }
  });
  await controller.exitReader();
  await controller.resumeBook("recent");
  assert.equal(store.getState().reader.readingLayout, "scroll");
  assert.deepEqual(store.getState().reader.positionRequest.position, position);
  adapters.reader.openBook = async () => ({
    ...restoration,
    bookKey: "older",
    savedBook: { ...restoration.savedBook, bookKey: "older", title: "Older Book" },
    progress: { bookKey: "older", currentChapterId: "chapter-1", currentChapterIndex: 0, readingLayout: "page" }
  });
  await controller.selectBook("older");
  assert.equal(store.getState().reader.readingLayout, "scroll");
  assert.equal(store.getState().settings.readingLayout, "scroll");
});

test("R3 Reader Appearance is global, persists locally, and keeps logical position", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.initialize();
  await controller.resumeBook("recent");
  assert.deepEqual(store.getState().reader.readerAppearance, {
    fontSize: "md",
    lineHeight: "normal",
    margin: "medium",
    theme: "light"
  });
  const position = { chapterId: "chapter-2", textOffset: 246 };
  controller.recordReaderPosition(position, { scrollTop: 320, scrollHeight: 1200, clientHeight: 240 });
  controller.openReaderAppearance();
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.APPEARANCE);
  const nodes = collectNodes(createReaderView(createMockDocument(), store.getState()));
  assert.ok(nodes.some(node => node.dataset.action === "reader-set-appearance" && node.dataset.appearanceKey === "fontSize"));
  assert.ok(nodes.some(node => node.className === "r3-reader-aa-button" || node.dataset?.action === "reader-appearance"));
  await controller.setReaderAppearance({ fontSize: "xl", theme: "dark", lineHeight: "relaxed", margin: "wide" });
  await controller.flushReaderProgress();
  const payload = calls.savePosition.at(-1);
  assert.deepEqual(payload.overrides.logicalPosition, position);
  assert.equal("readerAppearance" in payload.overrides, false);
  assert.equal("pageIndex" in payload.overrides, false);
  assert.equal("readingLayout" in payload.overrides, false);
  assert.deepEqual(store.getState().settings.readerAppearance, {
    fontSize: "xl",
    lineHeight: "relaxed",
    margin: "wide",
    theme: "dark"
  });
  assert.deepEqual(store.getState().reader.readerAppearance, {
    fontSize: "xl",
    lineHeight: "relaxed",
    margin: "wide",
    theme: "dark"
  });
  assert.deepEqual(calls.setReaderAppearance.at(-1), {
    fontSize: "xl",
    lineHeight: "relaxed",
    margin: "wide",
    theme: "dark"
  });

  await controller.setReadingLayout("page");
  await controller.setReaderAppearance({ fontSize: "sm" });
  await controller.flushReaderProgress();
  assert.deepEqual(calls.savePosition.at(-1).overrides.logicalPosition, position);
  assert.equal("pageIndex" in (calls.savePosition.at(-1).overrides || {}), false);

  await controller.setReadingLayout("scroll");
  await controller.setReaderAppearance({ margin: "narrow" });
  await controller.flushReaderProgress();
  assert.deepEqual(calls.savePosition.at(-1).overrides.logicalPosition, position);

  const restoration = await adapters.reader.resumeBook("recent");
  adapters.reader.resumeBook = async () => ({
    ...restoration,
    progress: { ...restoration.progress, ...payload.overrides, pageIndex: 9 }
  });
  await controller.exitReader();
  await controller.resumeBook("recent");
  assert.deepEqual(store.getState().reader.readerAppearance, {
    fontSize: "sm",
    lineHeight: "relaxed",
    margin: "narrow",
    theme: "dark"
  });
  assert.deepEqual(store.getState().reader.positionRequest.position, position);
  assert.equal(store.getState().reader.positionRequest.position.textOffset, 246);
});

test("R3 invalid Reader Appearance values fall back without changing history semantics", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.initialize();
  await controller.resumeBook("recent");
  adapters.settings.setReaderAppearance = appearance => {
    calls.setReaderAppearance.push(appearance);
    return {
      readerAppearance: {
        fontSize: "huge",
        lineHeight: "loose",
        margin: "giant",
        theme: "sepia"
      }
    };
  };
  await controller.setReaderAppearance({ fontSize: "huge", theme: "sepia" });
  assert.deepEqual(store.getState().reader.readerAppearance, {
    fontSize: "md",
    lineHeight: "normal",
    margin: "medium",
    theme: "light"
  });
  assert.equal(store.getState().activeScreen, R3_ROUTES.READER);
});

test("R3 rapid book-page seeks cannot publish an older chapter or locator", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openReaderProgress();
  const pending = createDeferred();
  const started = createDeferred();
  const load = readerRuntime.loadChapterContent;
  // Controller owns a copy of this runtime; use a fresh controller for controlled I/O.
  const runtime = { ...readerRuntime, loadChapterContent: async (handle, chapter) => {
    if (chapter.id === "chapter-1") { started.resolve(); await pending.promise; }
    return load(handle, chapter);
  } };
  const next = createR3Controller({ store, adapters, readerRuntime: runtime });
  await next.resumeBook("recent");
  next.openReaderProgress();
  const old = next.seekReaderPosition(0, { chapterId: "chapter-1", textOffset: 18 });
  await started.promise;
  await next.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 35 });
  pending.resolve();
  await old;
  await next.flushReaderProgress();
  assert.equal(store.getState().activeChapterIndex, 1);
  assert.equal(store.getState().reader.positionRequest.position.textOffset, 35);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.PROGRESS);
  assert.equal(calls.savePosition.at(-1).overrides.logicalPosition.textOffset, 35);
  next.closeOverlay();
  assert.equal(store.getState().activeChapterIndex, 1);
});

test("R3 open and reopen load only the current chapter and do not expose an eager indexer", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  assert.equal(store.getState().reader.status, "ready");
  assert.equal(calls.loadChapterContent.length, 1);
  assert.equal(controller.getPaginationChapters, undefined);
  await controller.selectReaderChapter(0);
  await controller.selectReaderChapter(1);
  assert.equal(calls.loadChapterContent.length, 2, "recent source body is reused");
  await controller.exitReader();
  await controller.resumeBook("recent");
  assert.equal(calls.loadChapterContent.length, 3, "reopen loads one chapter, never the full book");
});

test("R3 failed seek rendering keeps the last successful chapter and persisted anchor", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  const position = { chapterId: "chapter-2", textOffset: 35 };
  controller.recordReaderPosition(position, { scrollTop: 10, scrollHeight: 200, clientHeight: 100 });
  controller.openReaderProgress();
  adapters.modes.renderChapter = () => { throw new Error("Chapter render failed"); };
  await controller.seekReaderPosition(0, { chapterId: "chapter-1", textOffset: 28 });
  await controller.flushReaderProgress();
  assert.equal(store.getState().activeChapterIndex, 1);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.PROGRESS);
  assert.match(store.getState().reader.error.message, /render failed/);
  assert.equal(calls.savePosition.at(-1).currentChapterId, "chapter-2");
  assert.deepEqual(calls.savePosition.at(-1).overrides.logicalPosition, position);
});

test("R3 invalid locators cannot change progress", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  const before = store.getState().reader.positionRequest;
  await controller.seekReaderPosition(0, { chapterId: "chapter-2", textOffset: 20 });
  await controller.seekReaderPosition(0, { chapterId: "chapter-1", textOffset: -2 });
  assert.deepEqual(store.getState().reader.positionRequest, before);
  await controller.exitReader();
});

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
      chromeVisible: true,
      readingLayout: "page",
      readerAppearance: {
        fontSize: "md",
        lineHeight: "normal",
        margin: "medium",
        theme: "light"
      },
      pagination: { status: "loading", pageIndex: 0, pageCount: 0 },
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
    vocabulary: {
      status: "idle",
      activeTab: "learning",
      profile: {
        selectedLevel: "level3",
        knownWords: [],
        learningWords: [],
        ignoredWords: [],
        preferredCategories: []
      },
      busy: false,
      draft: "",
      feedback: {
        message: "",
        tone: "neutral"
      }
    },
    settings: {
      status: "loading",
      uiLanguage: "en",
      hasChosenUiLanguage: null,
      readingLayout: "page",
      readerAppearance: {
        fontSize: "md",
        lineHeight: "normal",
        margin: "medium",
        theme: "light"
      },
      busy: false,
      error: null
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
  assert.deepEqual(store.getState().settings, {
    status: "ready",
    uiLanguage: "en",
    hasChosenUiLanguage: true,
    readingLayout: "page",
    readerAppearance: {
      fontSize: "md",
      lineHeight: "normal",
      margin: "medium",
      theme: "light"
    },
    busy: false,
    error: null
  });
});

test("R3 first-run language gate is shown until an existing preference has been chosen", () => {
  const documentRef = createMockDocument();
  const firstRunState = createInitialR3State({
    initialized: true,
    settings: {
      status: "ready",
      uiLanguage: "en",
      hasChosenUiLanguage: false,
      busy: false,
      error: null
    }
  });
  const firstRunNodes = collectNodes(createAppShellView(documentRef, firstRunState));
  const gate = firstRunNodes.find(node => String(node.className || "").split(/\s+/).includes("r3-language-gate"));
  const gateText = firstRunNodes.map(node => node.textContent).filter(Boolean).join(" ");
  const choices = firstRunNodes.filter(node => node.dataset?.action === "set-ui-language");

  assert.ok(gate);
  assert.equal(gate.getAttribute("role"), "dialog");
  assert.equal(gate.getAttribute("aria-modal"), "true");
  assert.match(gateText, /Choose interface language/);
  assert.match(gateText, /选择界面语言/);
  assert.deepEqual(choices.map(choice => choice.dataset.uiLanguage), ["zh-CN", "en"]);
  assert.deepEqual(choices.map(choice => choice.textContent), ["中文", "English"]);

  const chosenNodes = collectNodes(createAppShellView(documentRef, createInitialR3State({
    initialized: true,
    settings: {
      status: "ready",
      uiLanguage: "zh-CN",
      hasChosenUiLanguage: true,
      busy: false,
      error: null
    }
  })));
  assert.equal(chosenNodes.some(node => String(node.className || "").split(/\s+/).includes("r3-language-gate")), false);
});

test("R3 interface language selection persists across reinitialization without mutating active data", async () => {
  const base = createAdapters();
  let preferences = {
    uiLanguage: "en",
    hasChosenUiLanguage: false,
    guideVisibleInLibrary: true
  };
  base.adapters.settings = {
    getPreferences() {
      return { ...preferences };
    },
    setUiLanguage(language) {
      preferences = {
        ...preferences,
        uiLanguage: language,
        hasChosenUiLanguage: true
      };
      return { ...preferences };
    }
  };
  const preservedReader = {
    status: "ready",
    bookTitle: "Original Book Title",
    chapterTitle: "Original Chapter Title",
    html: "<p>Original English book text.</p>"
  };
  const preservedProfile = {
    selectedLevel: "level4",
    knownWords: ["known"],
    learningWords: ["learning"],
    ignoredWords: ["hidden"],
    preferredCategories: []
  };
  const store = createR3Store(createInitialR3State({
    reader: preservedReader,
    vocabulary: {
      ...createInitialR3State().vocabulary,
      profile: preservedProfile
    }
  }));
  const controller = createR3Controller({ store, adapters: base.adapters });

  await controller.initialize();
  assert.equal(store.getState().settings.hasChosenUiLanguage, false);
  assert.equal(typeof controller.setUiLanguage, "function");
  await controller.setUiLanguage("zh-CN");

  const changedState = store.getState();
  assert.equal(changedState.settings.uiLanguage, "zh-CN");
  assert.equal(changedState.settings.hasChosenUiLanguage, true);
  assert.deepEqual(changedState.reader, preservedReader);
  assert.deepEqual(changedState.vocabulary.profile, preservedProfile);
  assert.deepEqual(changedState.books.map(book => book.bookKey), ["older", "recent"]);

  const reloadStore = createR3Store();
  const reloadController = createR3Controller({ store: reloadStore, adapters: base.adapters });
  await reloadController.initialize();
  assert.equal(reloadStore.getState().settings.uiLanguage, "zh-CN");
  assert.equal(reloadStore.getState().settings.hasChosenUiLanguage, true);

  await reloadController.setUiLanguage("en");
  assert.equal(reloadStore.getState().settings.uiLanguage, "en");
  const englishReloadStore = createR3Store();
  await createR3Controller({ store: englishReloadStore, adapters: base.adapters }).initialize();
  assert.equal(englishReloadStore.getState().settings.uiLanguage, "en");
  assert.equal(englishReloadStore.getState().settings.hasChosenUiLanguage, true);
});

test("R3 Settings is a secondary localized route with origin-aware back navigation", () => {
  const documentRef = createMockDocument();
  const settingsState = createInitialR3State({
    initialized: true,
    activeScreen: R3_ROUTES.SETTINGS_HOME,
    settings: {
      status: "ready",
      uiLanguage: "zh-CN",
      hasChosenUiLanguage: true,
      busy: false,
      error: null
    }
  });
  const settingsNodes = collectNodes(createAppShellView(documentRef, settingsState));
  const settingsScreen = settingsNodes.find(node => node.getAttribute?.("data-screen") === "settings");
  const back = settingsNodes.find(node => node.dataset?.action === "settings-return");
  const languageChoices = settingsNodes.filter(node => node.dataset?.action === "set-ui-language");
  const settingsText = settingsNodes.map(node => node.textContent).filter(Boolean).join(" ");

  assert.ok(settingsScreen);
  assert.ok(back);
  assert.equal(back.getAttribute("aria-label"), "返回主页");
  assert.equal(settingsNodes.some(node => String(node.className || "").includes("r3-bottom-nav")), false);
  assert.deepEqual(languageChoices.map(choice => [choice.dataset.uiLanguage, choice.getAttribute("aria-pressed")]), [
    ["zh-CN", "true"],
    ["en", "false"]
  ]);
  assert.match(settingsText, /设置/);
  assert.match(settingsText, /界面语言/);
  assert.match(settingsText, /书籍、进度、词汇和偏好/);

  const homeNodes = collectNodes(createAppShellView(documentRef, createInitialR3State({
    initialized: true,
    settings: {
      status: "ready",
      uiLanguage: "en",
      hasChosenUiLanguage: true,
      busy: false,
      error: null
    }
  })));
  const settingsEntry = homeNodes.find(node => node.dataset?.route === R3_ROUTES.SETTINGS_HOME);
  assert.ok(settingsEntry);
  assert.equal(settingsEntry.dataset.action, "navigate");
  assert.equal(settingsEntry.disabled, undefined);
  assert.equal(settingsEntry.getAttribute("aria-label"), "Settings");
  const libraryNodes = collectNodes(createAppShellView(documentRef, createInitialR3State({
    initialized: true, activeScreen: R3_ROUTES.LIBRARY,
    settings: { status: "ready", uiLanguage: "en", hasChosenUiLanguage: true }
  })));
  assert.ok(libraryNodes.some(node => node.dataset?.action === "navigate"
    && node.dataset?.route === R3_ROUTES.SETTINGS_HOME));
});

test("R3 localized chrome changes while imported book content and vocabulary data remain unchanged", () => {
  const documentRef = createMockDocument();
  const settings = {
    status: "ready",
    uiLanguage: "zh-CN",
    hasChosenUiLanguage: true,
    busy: false,
    error: null
  };
  const book = {
    bookKey: "original-book",
    title: "The Untranslated Book",
    author: "Original Author",
    progressLabel: "Original progress label"
  };
  const surfaces = [
    createInitialR3State({
      initialized: true,
      settings,
      books: [book],
      library: { status: "populated", books: [book] },
      home: {
        ...createInitialR3State().home,
        recentBooks: [book]
      }
    }),
    createInitialR3State({
      initialized: true,
      activeScreen: R3_ROUTES.LIBRARY,
      settings,
      books: [book],
      library: { status: "populated", books: [book] }
    }),
    createInitialR3State({
      initialized: true,
      activeScreen: R3_ROUTES.VOCABULARY,
      settings,
      vocabulary: {
        ...createInitialR3State().vocabulary,
        status: "ready",
        profile: {
          selectedLevel: "level3",
          knownWords: ["known-term"],
          learningWords: ["learning-term"],
          ignoredWords: ["hidden-term"],
          preferredCategories: []
        }
      }
    }),
    createInitialR3State({
      initialized: true,
      activeScreen: R3_ROUTES.READER,
      activeBookId: "original-book",
      activeChapterId: "original-chapter",
      openOverlay: R3_OVERLAYS.VOCABULARY_PREVIEW,
      settings,
      reader: {
        ...createInitialR3State().reader,
        status: "ready",
        bookTitle: "The Untranslated Book",
        chapterTitle: "Original Chapter Title",
        progressLabel: "Original Chapter Title · 1 / 1",
        html: "<p>Original English book text.</p>",
        vocabularyPreview: {
          chapterId: "original-chapter",
          detailsOpen: false,
          rows: [{ term: "learning-term", state: "learning", occurrences: [] }]
        }
      }
    })
  ];

  const rendered = surfaces.map(state => collectNodes(createAppShellView(documentRef, state)));
  const text = rendered.map(nodes => nodes.map(node => node.textContent).filter(Boolean).join(" "));

  assert.match(text[0], /快速操作/);
  assert.match(text[1], /本地书库/);
  assert.match(text[2], /生词本/);
  assert.match(text[2], /学习中/);
  assert.match(text[2], /已认识/);
  assert.match(text[2], /已隐藏/);
  assert.match(text[3], /词汇预览/);
  assert.match(text[3], /详细信息/);
  assert.ok(text[0].includes("The Untranslated Book"));
  assert.ok(text[1].includes("Original Author"));
  assert.ok(text[2].includes("learning-term"));
  const readerContent = rendered[3].find(node => String(node.className || "").includes("r3-reader-content"));
  assert.equal(readerContent.innerHTML, "<p>Original English book text.</p>");

  const bubbleState = createInitialR3State({
    initialized: true,
    activeScreen: R3_ROUTES.READER,
    settings,
    reader: {
      ...createInitialR3State().reader,
      status: "ready",
      bookTitle: "The Untranslated Book",
      chapterTitle: "Original Chapter Title",
      html: "<p>Original English book text.</p>",
      learningWords: [],
      vocabularyBubble: {
        term: "reverie",
        item: { term: "reverie", chineseMeaning: "幻想", englishDefinition: "a daydream" }
      }
    }
  });
  const bubbleNodes = collectNodes(createAppShellView(documentRef, bubbleState));
  const bubbleText = bubbleNodes.map(node => node.textContent).filter(Boolean).join(" ");
  const selectionSave = bubbleNodes.find(node => node.dataset?.action === "reader-selection-save");
  assert.match(bubbleText, /已认识/);
  assert.match(bubbleText, /保存/);
  assert.match(bubbleText, /隐藏/);
  assert.equal(selectionSave.children.at(-1).textContent, "保存");
  assert.equal(selectionSave.getAttribute("aria-label"), "将所选文本保存到学习中");
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

test("returning to a previously saved source anchor supersedes a different in-flight write", async () => {
  const { calls, adapters, readerRuntime } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  const position = offset => ({ chapterId: store.getState().activeChapterId, textOffset: offset });
  const metrics = { scrollTop: 0, scrollHeight: 1000, clientHeight: 200 };
  controller.recordReaderPosition(position(0), metrics); await controller.flushReaderProgress();
  const delayed = createDeferred();
  adapters.reader.savePosition = async options => { calls.savePosition.push(options); await delayed.promise; return options; };
  controller.recordReaderPosition(position(100), metrics);
  const first = controller.flushReaderProgress();
  await new Promise(resolve => setImmediate(resolve));
  controller.recordReaderPosition(position(0), metrics);
  const latest = controller.flushReaderProgress();
  delayed.resolve(); await Promise.all([first, latest]);
  assert.deepEqual(calls.savePosition.at(-1).overrides.logicalPosition, position(0));
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

test("R3 Selection Save accepts 1-8 lexical tokens and rejects sentences or unsafe ranges", () => {
  const documentRef = createMockDocument();
  const content = createMockElement("div");
  content.className = "r3-reader-content";
  const paragraph = createMockElement("p");
  const textNode = {
    nodeType: 3,
    textContent: "  “Personal\nphrase!”  ",
    parentNode: null
  };
  content.appendChild(paragraph);
  paragraph.appendChild(textNode);
  const range = { startContainer: textNode, endContainer: textNode };
  const selection = {
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => range,
    toString: () => textNode.textContent,
    removeAllRanges() {
      throw new Error("native selection must not be cleared");
    }
  };
  documentRef.getSelection = () => selection;

  const eligibleSelections = [
    ["reverie", "reverie"],
    ["  Look\nup  ", "look up"],
    ["once in a blue moon", "once in a blue moon"],
    ["one two three four five six seven eight", "one two three four five six seven eight"],
    ["x".repeat(80), "x".repeat(80)]
  ];
  for (const [selectionText, expected] of eligibleSelections) {
    textNode.textContent = selectionText;
    assert.equal(getReaderSelectionTerm(documentRef), expected);
  }

  textNode.textContent = "one two three four five six seven eight nine";
  assert.equal(getReaderSelectionTerm(documentRef), "");

  textNode.textContent = "x".repeat(81);
  assert.equal(getReaderSelectionTerm(documentRef), "");

  range.endContainer = { nodeType: 3, parentNode: paragraph };
  assert.equal(getReaderSelectionTerm(documentRef), "");

  range.endContainer = textNode;
  const hit = createMockElement("button");
  hit.className = "vocab-hit";
  hit.appendChild(textNode);
  paragraph.appendChild(hit);
  textNode.textContent = "personal";
  assert.equal(getReaderSelectionTerm(documentRef), "");
});

test("R3 controller saves explicit selected text through the existing Learning refresh", async () => {
  const { adapters, readerRuntime } = createAdapters();
  let savedTerm = "";
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: { knownWords: [], ignoredWords: [], learningWords: savedTerm ? [savedTerm] : [] },
    items: savedTerm ? [{ term: savedTerm }] : []
  });
  adapters.vocabulary.setTermState = async (term, state) => {
    assert.equal(state, "learning");
    savedTerm = term;
  };
  adapters.vocabulary.getTermMetadata = (term, items) => (
    items.find(item => item.term === term) || null
  );
  adapters.modes.renderChapter = (chapter, mode, options) => ({
    html: `<p>${chapter.title} ${options.vocabularyItems.map(item => item.term).join(" ")}</p>`,
    vocabularyPreview: options.vocabularyItems
  });

  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  await controller.setReaderVocabularyState("learning", "personal phrase");

  assert.equal(savedTerm, "personal phrase");
  assert.deepEqual(store.getState().reader.learningWords, ["personal phrase"]);
  assert.match(store.getState().reader.html, /personal phrase/);
  controller.toggleVocabularyBubble("personal phrase", { x: 20, y: 40 });
  assert.equal(store.getState().reader.vocabularyBubble.item.term, "personal phrase");
});

test("R3 selection capture keeps case and offsets and supersedes an unrelated bubble", async () => {
  const content = { className: "r3-reader-content" };
  const paragraph = { textContent: "Doctor Light arrived. They went home.", parentNode: content };
  paragraph.closest = () => paragraph;
  const textNode = { nodeType: 3, textContent: paragraph.textContent, parentElement: paragraph, parentNode: paragraph };
  const start = paragraph.textContent.indexOf("went");
  const documentRef = {
    getSelection: () => ({ isCollapsed: false, rangeCount: 1, toString: () => "went",
      getRangeAt: () => ({ startContainer: textNode, endContainer: textNode, startOffset: start, endOffset: start + 4 }) }),
    createRange: () => ({ selectNodeContents() {}, setEnd() {}, toString: () => paragraph.textContent.slice(0, start) })
  };
  const capture = getReaderSelectionCapture(documentRef);
  assert.deepEqual(capture, { sentence: paragraph.textContent, targetOffset: start, targetEnd: start + 4, freeform: true });

  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  let received;
  adapters.vocabulary.setTermState = async (...args) => { received = args; };
  await controller.resumeBook("recent");
  store.dispatch(r3Actions.setReaderState({ vocabularyBubble: { term: "stolen", item: { capture: { unrelated: true } } } }));
  await controller.setReaderVocabularyState("learning", "went", capture);
  assert.deepEqual(received, ["went", "learning", capture]);
});

test("R3 controller replaces and toggles vocabulary bubbles by term", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const items = [
    { term: "mutter", englishDefinition: "to speak quietly" },
    { term: "linger", englishDefinition: "to remain" }
  ];
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: { knownWords: [], learningWords: [], ignoredWords: [] },
    items
  });
  adapters.vocabulary.getTermMetadata = (term, vocabularyItems) => (
    vocabularyItems.find(item => item.term === term) || null
  );
  adapters.modes.renderChapter = (_chapter, _mode, options) => ({
    html: "<p>mutter linger</p>",
    vocabularyPreview: options.vocabularyItems
  });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });

  await controller.resumeBook("recent");
  controller.toggleVocabularyBubble("mutter", { x: 20, y: 40 });
  assert.equal(store.getState().reader.vocabularyBubble.term, "mutter");

  controller.toggleVocabularyBubble("linger", { x: 32, y: 52 });
  assert.equal(store.getState().reader.vocabularyBubble.term, "linger");

  controller.toggleVocabularyBubble("linger", { x: 32, y: 52 });
  assert.equal(store.getState().reader.vocabularyBubble, null);
});

test("R3 controller serializes vocabulary writes through their rendered refresh", async () => {
  const delayedLearningRefresh = createDeferred();
  const learningRefreshStarted = createDeferred();
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter", chineseMeaning: "低声嘟囔", englishDefinition: "to speak quietly" };
  const termStates = [];
  let persistedState = "";
  let vocabularyReadCount = 0;

  const snapshotVocabulary = () => ({
    profile: {
      knownWords: persistedState === "known" ? [item.term] : [],
      learningWords: persistedState === "learning" ? [item.term] : [],
      ignoredWords: persistedState === "hidden" ? [item.term] : []
    },
    items: ["known", "hidden"].includes(persistedState) ? [] : [item]
  });

  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = (chapter, mode, options) => ({
    html: `<p>${chapter.title} rendered in ${mode}: ${options.vocabularyItems.map(entry => entry.term).join(",")}</p>`,
    vocabularyPreview: options.vocabularyItems
  });
  adapters.vocabulary.getReaderVocabulary = async () => {
    vocabularyReadCount += 1;
    const snapshot = snapshotVocabulary();
    if (vocabularyReadCount === 2) {
      learningRefreshStarted.resolve();
      await delayedLearningRefresh.promise;
    }
    return snapshot;
  };
  adapters.vocabulary.getTermMetadata = (term, items) => items.find(entry => entry.term === term) || null;
  adapters.vocabulary.setTermState = async (term, nextState) => {
    assert.equal(term, item.term);
    termStates.push(nextState);
    persistedState = nextState;
  };

  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.toggleVocabularyBubble(item.term, { x: 24, y: 48 });

  const learningOperation = controller.setReaderVocabularyState("learning");
  await learningRefreshStarted.promise;
  // Successful Save now closes its bubble; another hit may open a new one.
  controller.toggleVocabularyBubble(item.term, { x: 24, y: 48 });
  const knownOperation = controller.setReaderVocabularyState("known");

  // Let an incorrectly unlocked Known operation finish before releasing the
  // older Learning refresh. A correctly serialized operation remains queued.
  await new Promise(resolve => setImmediate(resolve));
  const savingBeforeLearningRefreshCompletes = store.getState().reader.vocabularySaving;

  delayedLearningRefresh.resolve();
  await Promise.all([learningOperation, knownOperation]);

  const state = store.getState();
  assert.deepEqual(termStates, ["learning", "known"]);
  assert.equal(persistedState, "known");
  assert.equal(state.reader.html.includes(item.term), false);
  assert.deepEqual(state.reader.vocabularyItems, []);
  assert.deepEqual(state.reader.learningWords, []);
  assert.equal(state.reader.vocabularyBubble, null);
  assert.equal(savingBeforeLearningRefreshCompletes, true);
  assert.equal(state.reader.vocabularySaving, false);
});

test("R3 vocabulary intent is visible before storage and rolls back on failure", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter" };
  const pending = createDeferred();
  let persisted = null;
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [item] });
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: { knownWords: persisted === "known" ? [item.term] : [], learningWords: persisted === "learning" ? [item.term] : [], ignoredWords: persisted === "hidden" ? [item.term] : [] },
    items: [item]
  });
  adapters.vocabulary.getChapterPreview = () => [item];
  adapters.vocabulary.setTermState = async (_term, state) => { await pending.promise; persisted = state; };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview();
  const actions = [];
  store.subscribe((_state, action) => actions.push(action));
  const saving = controller.setReaderVocabularyState("learning", item.term);
  assert.equal(store.getState().reader.vocabularyPreview.rows[0].state, "learning");
  assert.deepEqual(store.getState().reader.learningWords, [item.term]);
  pending.reject(new Error("storage failed"));
  await saving;
  assert.equal(store.getState().reader.vocabularyPreview.rows[0].state, null);
  assert.deepEqual(store.getState().reader.learningWords, []);
  assert.ok(store.getState().reader.vocabularyMessage);
  assert.notEqual(actions.find(action => action.payload?.reader?.vocabularyMessage)?.optimisticVocabulary, true);
});

test("R3 rapid Learning Known Hide stays on latest intent through serialized refresh", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter" };
  const firstRefresh = createDeferred();
  const firstRefreshStarted = createDeferred();
  const writes = [];
  let persisted = null;
  let reads = 0;
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [item] });
  adapters.vocabulary.getReaderVocabulary = async () => {
    reads += 1;
    const state = persisted;
    if (reads === 2) { firstRefreshStarted.resolve(); await firstRefresh.promise; }
    return { profile: {
      knownWords: state === "known" ? [item.term] : [],
      learningWords: state === "learning" ? [item.term] : [],
      ignoredWords: state === "hidden" ? [item.term] : []
    }, items: [item] };
  };
  adapters.vocabulary.getChapterPreview = () => [item];
  adapters.vocabulary.setTermState = async (_term, next) => { writes.push(next); persisted = next; };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview();
  const learning = controller.setReaderVocabularyState("learning", item.term);
  assert.equal(store.getState().reader.vocabularyPreview.rows[0].state, "learning");
  await firstRefreshStarted.promise;
  const known = controller.setReaderVocabularyState("known", item.term);
  assert.equal(store.getState().reader.vocabularyPreview.rows[0].state, "known");
  const hidden = controller.setReaderVocabularyState("hidden", item.term);
  assert.equal(store.getState().reader.vocabularyPreview.rows[0].state, "hidden");
  assert.deepEqual(store.getState().reader.learningWords, []);
  firstRefresh.resolve();
  await Promise.all([learning, known, hidden]);
  assert.deepEqual(writes, ["learning", "known", "hidden"]);
  assert.equal(persisted, "hidden");
  assert.equal(store.getState().reader.vocabularyPreview.rows[0].state, "hidden");
  assert.deepEqual(store.getState().reader.learningWords, []);
  assert.equal(store.getState().reader.vocabularySaving, false);
});

test("R3 Preview opens with a snapshot generated for the current chapter", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter", chineseMeaning: "低声嘟囔", englishDefinition: "to speak quietly" };
  const previewCalls = [];
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = (chapter, mode, options) => ({
    html: `<p>${chapter.title} rendered in ${mode}</p>`,
    vocabularyPreview: options.vocabularyItems
  });
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: { knownWords: [], learningWords: [item.term], ignoredWords: [] },
    items: [item]
  });
  adapters.vocabulary.getChapterPreview = (chapter, items) => {
    previewCalls.push({ chapter, items });
    return items;
  };

  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  const state = controller.openVocabularyPreview({
    mutter: [
      { occurrenceIndex: 0, snippet: "…she began to mutter under her breath…" },
      { occurrenceIndex: 1, snippet: "…mutter another warning…" }
    ]
  });

  assert.equal(state.openOverlay, R3_OVERLAYS.VOCABULARY_PREVIEW);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].chapter.id, "chapter-2");
  assert.equal(state.reader.vocabularyPreview.detailsOpen, false);
  assert.deepEqual(state.reader.vocabularyPreview.rows, [{
    ...item,
    state: "learning",
    isExpanded: false,
    contextOpen: false,
    occurrences: [
      { occurrenceIndex: 0, snippet: "…she began to mutter under her breath…" },
      { occurrenceIndex: 1, snippet: "…mutter another warning…" }
    ],
    hasLiveAnnotation: true
  }]);
});

test("R3 Preview shell opens before occurrence work and ignores a closed load", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const frames = [];
  const tasks = [];
  let builds = 0;
  let scans = 0;
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [{ term: "mutter" }] });
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items: [{ term: "mutter" }] });
  adapters.vocabulary.getChapterPreview = () => { builds += 1; return [{ term: "mutter" }]; };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime, timers: {
    requestAnimationFrame: callback => frames.push(callback),
    setTimeout: callback => tasks.push(callback),
    clearTimeout: () => {}
  } });
  await controller.resumeBook("recent");
  const openActions = [];
  const stopTracking = store.subscribe((_state, action) => openActions.push(action.type));
  controller.openVocabularyPreview(() => { scans += 1; return {}; }, { defer: true });
  stopTracking();
  assert.deepEqual(openActions, [R3_ACTIONS.OPEN_OVERLAY]);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.VOCABULARY_PREVIEW);
  assert.equal(store.getState().reader.vocabularyPreview.loading, true);
  const shellNodes = collectNodes(createReaderView(createMockDocument(), store.getState()));
  assert.ok(shellNodes.some(node => String(node.className || "").includes("r3-reader-quick-control is-active")));
  assert.ok(shellNodes.some(node => node.textContent === "Loading vocabulary…"));
  assert.equal(builds, 0);
  assert.equal(scans, 0);
  frames.shift()();
  tasks.shift()();
  assert.equal(store.getState().reader.vocabularyPreview.loading, false);
  assert.equal(builds, 1);
  assert.equal(scans, 1);
  controller.closeVocabularyPreview();
  controller.openVocabularyPreview(() => { scans += 1; return {}; }, { defer: true });
  controller.closeVocabularyPreview();
  frames.shift()();
  tasks.shift()();
  assert.equal(builds, 1);
  assert.equal(scans, 1);
  assert.equal(store.getState().openOverlay, null);
  assert.equal(store.getState().reader.vocabularyPreview, null);
  controller.openVocabularyPreview(() => { scans += 1; return {}; }, { defer: true });
  controller.closeVocabularyPreview();
  controller.openVocabularyPreview(() => { scans += 1; return {}; }, { defer: true });
  frames.shift()();
  tasks.shift()();
  assert.equal(store.getState().reader.vocabularyPreview.loading, true);
  assert.equal(builds, 1);
  frames.shift()();
  tasks.shift()();
  assert.equal(store.getState().reader.vocabularyPreview.loading, false);
  assert.equal(builds, 2);
});

test("R3 Preview defaults to compact collapsed rows with icon state and no empty-choice copy", () => {
  const documentRef = createMockDocument();
  const item = { term: "mutter", chineseMeaning: "低声嘟囔", englishDefinition: "to speak quietly" };
  const state = createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    openOverlay: R3_OVERLAYS.VOCABULARY_PREVIEW,
    reader: {
      status: "ready",
      html: "<p>Chapter text</p>",
      vocabularyPreview: {
        chapterId: "chapter-1",
        detailsOpen: false,
        rows: [{ ...item, state: "learning", isExpanded: false, contextOpen: false, occurrences: [] }]
      }
    }
  });

  const view = createReaderView(documentRef, state);
  const stack = [view];
  const nodes = [];
  while (stack.length) {
    const node = stack.shift();
    nodes.push(node);
    stack.push(...(node.children || []));
  }
  const text = nodes.map(node => node.textContent).filter(Boolean).join(" ");
  const stateButtons = nodes.filter(node => node.dataset?.action === "vocabulary-preview-state");
  const rowToggle = nodes.find(node => node.dataset?.action === "vocabulary-preview-row-toggle");
  const detailsToggle = nodes.find(node => node.dataset?.action === "vocabulary-preview-details");
  const backButton = nodes.find(node => node.getAttribute?.("aria-label") === "Back to reader");
  const previewHeading = nodes.find(node => (
    String(node.className || "").split(/\s+/).includes("r3-vocabulary-preview-heading")
  ));
  const previewScrim = nodes.find(node => (
    String(node.className || "").split(/\s+/).includes("r3-reader-scrim")
    && node.dataset?.action === "vocabulary-preview-close"
  ));

  assert.match(text, /mutter/);
  assert.match(text, /Details Off/);
  assert.match(text, /Known Save \/ Learning Hide/);
  assert.doesNotMatch(text, /低声嘟囔/);
  assert.doesNotMatch(text, /to speak quietly/);
  assert.doesNotMatch(text, /No choice yet/);
  assert.equal(rowToggle.getAttribute("aria-expanded"), "false");
  assert.equal(detailsToggle.getAttribute("role"), "switch");
  assert.equal(detailsToggle.getAttribute("aria-checked"), "false");
  assert.ok(backButton);
  assert.equal(backButton.dataset.action, "vocabulary-preview-close");
  assert.doesNotMatch(backButton.textContent, /Close/i);
  assert.equal(previewHeading.children[0], backButton);
  assert.equal(previewHeading.children[1].className, "r3-vocabulary-preview-title");
  assert.equal(detailsToggle.parentNode.className, "r3-vocabulary-preview-header-actions");
  assert.notEqual(detailsToggle.parentNode, previewHeading);
  assert.ok(previewScrim);
  assert.equal(nodes.some(node => (
    node.dataset?.action === "vocabulary-preview-close"
    && /Close/i.test(node.textContent || "")
  )), false);
  assert.deepEqual(stateButtons.map(button => button.getAttribute("aria-label")), ["Known", "Save to Learning", "Hide"]);
  assert.equal(stateButtons.find(button => button.dataset.vocabularyState === "learning").getAttribute("aria-pressed"), "true");
});

test("R3 Preview supports independent row expansion and a strong global Details toggle", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const items = [{ term: "mutter" }, { term: "linger" }];
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items });
  adapters.vocabulary.getChapterPreview = (_chapter, vocabularyItems) => vocabularyItems;
  adapters.modes.renderChapter = (_chapter, _mode, options) => ({ html: "<p>text</p>", vocabularyPreview: options.vocabularyItems });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview();

  controller.toggleVocabularyPreviewRow("mutter");
  controller.toggleVocabularyPreviewRow("linger");
  let preview = store.getState().reader.vocabularyPreview;
  assert.deepEqual(preview.rows.map(row => row.isExpanded), [true, true]);

  controller.toggleVocabularyPreviewRow("mutter");
  preview = store.getState().reader.vocabularyPreview;
  assert.deepEqual(preview.rows.map(row => row.isExpanded), [false, true]);

  controller.toggleVocabularyPreviewDetails(true);
  preview = store.getState().reader.vocabularyPreview;
  assert.equal(preview.detailsOpen, true);

  controller.toggleVocabularyPreviewDetails(false);
  preview = store.getState().reader.vocabularyPreview;
  assert.equal(preview.detailsOpen, false);
  assert.deepEqual(preview.rows.map(row => row.isExpanded), [false, false]);
});

test("R3 vocabulary bubble dismisses from non-actions without swallowing state controls", async () => {
  const documentRef = createMockDocument();
  const store = createR3Store(createInitialR3State({
    initialized: true,
    activeScreen: R3_ROUTES.READER,
    activeBookId: "recent",
    activeChapterId: "chapter-2",
    reader: {
      status: "ready",
      chapterTitle: "Chapter 2",
      html: "<p>Reader text</p>",
      learningWords: [],
      vocabularyBubble: {
        term: "mutter",
        item: {
          term: "mutter",
          englishDefinition: "to speak quietly"
        },
        x: 24,
        y: 48
      }
    }
  }));
  let closeCalls = 0;
  const stateCalls = [];
  const controller = {
    async initialize() {},
    applyReaderScrollRestoration() {},
    recordReaderScroll() {},
    flushReaderProgress() {},
    closeVocabularyPreview() {},
    closeVocabularyBubble() {
      closeCalls += 1;
    },
    setReaderVocabularyState(state) {
      stateCalls.push(state);
    }
  };
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  const nodes = [];
  const stack = [app.root];
  while (stack.length) {
    const node = stack.shift();
    nodes.push(node);
    stack.push(...(node.children || []));
  }
  const bubble = nodes.find(node => (
    String(node.className || "").split(/\s+/).includes("r3-vocabulary-bubble")
  ));
  const bubbleHeading = bubble.children[0].children[0];
  const stateButtons = nodes.filter(node => node.dataset?.action === "vocabulary-state");
  const outsideReaderHeader = nodes.find(node => (
    String(node.className || "").split(/\s+/).includes("r3-reader-title-group")
  ));
  const clickListener = app.root.eventListeners.get("click")[0];

  assert.equal(nodes.some(node => node.dataset?.action === "vocabulary-close"), false);
  assert.deepEqual(stateButtons.map(node => node.children[0].textContent), ["Known", "Save", "Hide"]);

  clickListener({ target: bubbleHeading });
  assert.equal(closeCalls, 1);

  stateButtons.forEach(button => clickListener({ target: button }));
  assert.deepEqual(stateCalls, ["known", "learning", "hidden"]);
  assert.equal(closeCalls, 1);

  clickListener({ target: outsideReaderHeader });
  assert.equal(closeCalls, 2);

  app.root.eventListeners.get("keydown")[0]({ key: "Escape", target: app.root });
  assert.equal(closeCalls, 3);
});

test("R3 Preview renders only source-backed metadata in expanded rows", () => {
  const documentRef = createMockDocument();
  const state = createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    openOverlay: R3_OVERLAYS.VOCABULARY_PREVIEW,
    reader: {
      status: "ready",
      chapterTitle: "Chapter 35",
      html: "<p>Chapter text</p>",
      vocabularyPreview: {
        chapterId: "chapter-1",
        detailsOpen: false,
        rows: [{
          term: "mutter",
          type: "fiction",
          chineseMeaning: "低声嘟囔",
          englishDefinition: "to speak quietly",
          ieltsUsage: "mutter under one's breath",
          usageNote: "Often signals frustration.",
          isExpanded: true,
          contextOpen: false,
          occurrences: [{ occurrenceIndex: 0, snippet: "…she began to mutter…" }]
        }]
      }
    }
  });
  const view = createReaderView(documentRef, state);
  const stack = [view];
  const nodes = [];
  while (stack.length) {
    const node = stack.shift();
    nodes.push(node);
    stack.push(...(node.children || []));
  }
  const text = nodes.map(node => node.textContent).filter(Boolean).join(" ");
  assert.match(text, /Chapter 35 · 1 word/);
  assert.match(text, /fiction/);
  assert.match(text, /低声嘟囔/);
  assert.match(text, /EN to speak quietly/);
  assert.match(text, /IELTS mutter under one's breath/);
  assert.match(text, /USE Often signals frustration/);
  assert.doesNotMatch(text, /Example/);
});

test("R3 Preview Context derives repeated-term snippets from each live hit and preserves indices", () => {
  const root = createMockElement("main");
  const paragraph = createMockElement("p");
  paragraph.textContent = [
    "Opening context ".repeat(12),
    "first nearby reluctant",
    " middle context ".repeat(16),
    "second nearby reluctant",
    " closing context ".repeat(12)
  ].join("");
  const firstHit = createMockElement("button");
  firstHit.className = "vocab-hit";
  firstHit.dataset.vocabTerm = "reluctant";
  const secondHit = createMockElement("button");
  secondHit.className = "vocab-hit";
  secondHit.dataset.vocabTerm = "reluctant";
  paragraph.appendChild(firstHit);
  paragraph.appendChild(secondHit);
  root.appendChild(paragraph);

  const occurrences = collectVocabularyOccurrences(root);
  assert.deepEqual(occurrences.reluctant.map(occurrence => occurrence.occurrenceIndex), [0, 1]);
  assert.match(occurrences.reluctant[0].snippet, /first nearby reluctant/);
  assert.doesNotMatch(occurrences.reluctant[0].snippet, /second nearby reluctant/);
  assert.match(occurrences.reluctant[1].snippet, /second nearby reluctant/);
  assert.doesNotMatch(occurrences.reluctant[1].snippet, /first nearby reluctant/);

  let firstScroll = null;
  let secondScroll = null;
  firstHit.scrollIntoView = options => { firstScroll = options; };
  secondHit.scrollIntoView = options => { secondScroll = options; };
  assert.equal(scrollToVocabularyHit(root, "reluctant", 1), true);
  assert.equal(firstScroll, null);
  assert.deepEqual(secondScroll, { block: "center", behavior: "smooth" });
});

test("R3 Preview keeps a row stable while a persisted state refreshes live annotations", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter", chineseMeaning: "低声嘟囔", englishDefinition: "to speak quietly" };
  let persistedState = "";
  const persistedStates = [];
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: {
      knownWords: persistedState === "known" ? [item.term] : [],
      learningWords: persistedState === "learning" ? [item.term] : [],
      ignoredWords: persistedState === "hidden" ? [item.term] : []
    },
    items: ["known", "hidden"].includes(persistedState) ? [] : [item]
  });
  adapters.vocabulary.getChapterPreview = (_chapter, items) => items;
  adapters.vocabulary.setTermState = async (_term, nextState) => {
    persistedState = nextState;
    persistedStates.push(nextState);
  };
  adapters.modes.renderChapter = (chapter, mode, options) => ({
    html: `<p>${chapter.title} rendered in ${mode}</p>`,
    vocabularyPreview: options.vocabularyItems
  });
  const collectVocabularyOccurrences = () => ["known", "hidden"].includes(persistedState)
    ? {}
    : { mutter: [{ occurrenceIndex: 0, snippet: "Current mutter context." }] };

  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters,
    readerRuntime,
    collectVocabularyOccurrences
  });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview();
  controller.toggleVocabularyPreviewRow(item.term);
  await controller.setReaderVocabularyState("learning", item.term);

  let state = store.getState();
  assert.equal(state.reader.vocabularyPreview.rows.length, 1);
  assert.equal(state.reader.vocabularyPreview.rows[0].state, "learning");
  assert.equal(state.reader.vocabularyPreview.rows[0].isExpanded, true);
  assert.equal(state.reader.vocabularyPreview.rows[0].hasLiveAnnotation, true);
  assert.deepEqual(state.reader.vocabularyPreview.rows[0].occurrences, [
    { occurrenceIndex: 0, snippet: "Current mutter context." }
  ]);

  await controller.setReaderVocabularyState("hidden", item.term);
  state = store.getState();
  assert.equal(state.reader.vocabularyPreview.rows.length, 1);
  assert.equal(state.reader.vocabularyPreview.rows[0].state, "hidden");
  assert.equal(state.reader.vocabularyPreview.rows[0].hasLiveAnnotation, false);
  assert.deepEqual(state.reader.vocabularyPreview.rows[0].occurrences, []);

  await controller.setReaderVocabularyState("learning", item.term);

  state = store.getState();
  assert.equal(state.openOverlay, R3_OVERLAYS.VOCABULARY_PREVIEW);
  assert.equal(state.reader.vocabularyPreview.rows.length, 1);
  assert.equal(state.reader.vocabularyPreview.rows[0].state, "learning");
  assert.equal(state.reader.vocabularyPreview.rows[0].hasLiveAnnotation, true);
  assert.deepEqual(state.reader.vocabularyPreview.rows[0].occurrences, [
    { occurrenceIndex: 0, snippet: "Current mutter context." }
  ]);
  assert.deepEqual(persistedStates, ["learning", "hidden", "learning"]);

  controller.closeVocabularyPreview();
  state = controller.openVocabularyPreview();
  assert.equal(state.reader.vocabularyPreview.rows.length, 1);
});

test("R3 Preview clears stale occurrences when post-refresh annotations are unavailable", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter" };
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: { learningWords: [item.term] },
    items: [item]
  });
  adapters.vocabulary.getChapterPreview = (_chapter, items) => items;
  adapters.vocabulary.setTermState = async () => {};
  adapters.modes.renderChapter = (_chapter, _mode, options) => ({
    html: "<p>Reader remains available</p>",
    vocabularyPreview: options.vocabularyItems
  });

  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters,
    readerRuntime,
    collectVocabularyOccurrences() {
      throw new Error("Reader annotations unavailable");
    }
  });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview({
    mutter: [{ occurrenceIndex: 0, snippet: "Stale mutter context." }]
  });

  await controller.setReaderVocabularyState("learning", item.term);

  const row = store.getState().reader.vocabularyPreview.rows[0];
  assert.deepEqual(row.occurrences, []);
  assert.equal(row.hasLiveAnnotation, false);
  assert.equal(row.contextOpen, false);
  assert.equal(controller.goToVocabularyPreviewOccurrence(item.term, 0), false);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.VOCABULARY_PREVIEW);
});

test("R3 Preview invalidates its snapshot when the chapter changes", async () => {
  const { adapters, readerRuntime } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items: [{ term: "chapter" }] });
  adapters.vocabulary.getChapterPreview = chapter => [{ term: chapter.id }];
  adapters.modes.renderChapter = chapter => ({ html: `<p>${chapter.title}</p>`, vocabularyPreview: [] });

  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview();
  await controller.goToReaderChapter("previous");

  const state = store.getState();
  assert.equal(state.activeChapterId, "chapter-1");
  assert.equal(state.openOverlay, null);
  assert.equal(state.reader.vocabularyPreview, null);
});

test("R3 Preview passage navigation only closes for a live annotation", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter" };
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items: [item] });
  adapters.vocabulary.getChapterPreview = (_chapter, items) => items;
  adapters.modes.renderChapter = (_chapter, _mode, options) => ({ html: "<p>mutter</p>", vocabularyPreview: options.vocabularyItems });

  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview({ mutter: [{ occurrenceIndex: 0, snippet: "mutter" }] });

  assert.equal(controller.goToVocabularyPreviewTerm(item.term), true);
  assert.equal(store.getState().openOverlay, null);

  controller.openVocabularyPreview();
  store.dispatch(r3Actions.setReaderState({
    vocabularyPreview: {
      ...store.getState().reader.vocabularyPreview,
      rows: [{ ...item, state: "known", hasLiveAnnotation: false }]
    }
  }));
  assert.equal(controller.goToVocabularyPreviewTerm(item.term), false);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.VOCABULARY_PREVIEW);
});

test("R3 Preview Context renders each occurrence and Known removes every passage target", async () => {
  const documentRef = createMockDocument();
  const occurrences = [
    { occurrenceIndex: 0, snippet: "She <img src=x onerror=alert(1)> began to mutter under her breath." },
    { occurrenceIndex: 1, snippet: "He heard her mutter another warning." }
  ];
  const state = createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    openOverlay: R3_OVERLAYS.VOCABULARY_PREVIEW,
    reader: {
      status: "ready",
      html: "<p>Chapter text</p>",
      vocabularyPreview: {
        chapterId: "chapter-1",
        detailsOpen: false,
        rows: [{ term: "mutter", isExpanded: true, contextOpen: true, occurrences }]
      }
    }
  });
  const view = createReaderView(documentRef, state);
  const stack = [view];
  const nodes = [];
  while (stack.length) {
    const node = stack.shift();
    nodes.push(node);
    stack.push(...(node.children || []));
  }
  const passageButtons = nodes.filter(node => node.dataset?.action === "vocabulary-preview-passage");
  const highlightedTerms = nodes.filter(node => String(node.tagName || "").toUpperCase() === "MARK");
  assert.deepEqual(passageButtons.map(button => button.dataset.occurrenceIndex), ["0", "1"]);
  assert.deepEqual(highlightedTerms.map(node => node.textContent), ["mutter", "mutter"]);
  assert.equal(nodes.some(node => String(node.tagName || "").toUpperCase() === "IMG"), false);
  assert.match(nodes.map(node => node.textContent).join(" "), /<img src=x onerror=alert\(1\)>/);
  assert.match(nodes.map(node => node.textContent).join(" "), /Context 2×/);

  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter" };
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items: [item] });
  adapters.vocabulary.getChapterPreview = (_chapter, items) => items;
  adapters.vocabulary.setTermState = async () => {};
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [] });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.openVocabularyPreview({ mutter: occurrences });
  await controller.setReaderVocabularyState("known", "mutter");
  const row = store.getState().reader.vocabularyPreview.rows[0];
  assert.deepEqual(row.occurrences, []);
  assert.equal(row.hasLiveAnnotation, false);
  assert.equal(controller.goToVocabularyPreviewOccurrence("mutter", 1), false);
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.VOCABULARY_PREVIEW);
});

test("R3 Preview scrolls to a matching live annotation without replacing native selection", () => {
  const root = createMockElement("main");
  const article = createMockElement("article");
  const firstHit = createMockElement("button");
  firstHit.className = "vocab-hit";
  firstHit.dataset.vocabTerm = "mutter";
  const secondHit = createMockElement("button");
  secondHit.className = "vocab-hit";
  secondHit.dataset.vocabTerm = "mutter";
  let scrollOptions = null;
  let timeoutCalls = 0;
  const ownerDocument = {
    defaultView: {
      matchMedia: () => ({ matches: false }),
      setTimeout() {
        timeoutCalls += 1;
      }
    }
  };
  firstHit.ownerDocument = ownerDocument;
  secondHit.ownerDocument = ownerDocument;
  firstHit.scrollIntoView = options => { scrollOptions = options; };
  secondHit.scrollIntoView = options => { scrollOptions = options; };
  article.appendChild(firstHit);
  article.appendChild(secondHit);
  root.appendChild(article);

  assert.equal(scrollToVocabularyHit(root, "Mutter"), true);
  assert.deepEqual(scrollOptions, { block: "center", behavior: "smooth" });
  assert.match(firstHit.className, /is-passage-target/);
  assert.doesNotMatch(secondHit.className, /is-passage-target/);
  assert.equal(timeoutCalls, 0);

  assert.equal(scrollToVocabularyHit(root, "mutter", 1), true);
  assert.doesNotMatch(firstHit.className, /is-passage-target/);
  assert.match(secondHit.className, /is-passage-target/);
  assert.equal(secondHit.dataset.passageOccurrenceIndex, "1");

  ownerDocument.defaultView.matchMedia = () => ({ matches: true });
  assert.equal(scrollToVocabularyHit(root, "mutter", 0), true);
  assert.deepEqual(scrollOptions, { block: "center", behavior: "auto" });
  assert.match(firstHit.className, /is-passage-target/);
  assert.doesNotMatch(secondHit.className, /is-passage-target/);
  assert.equal(scrollToVocabularyHit(root, "missing"), false);
  assert.match(firstHit.className, /is-passage-target/);
});

test("R3 passage locator survives same-chapter rerenders and clears on chapter change", async () => {
  const documentRef = createMockDocument();
  documentRef.defaultView = {
    innerWidth: 393,
    innerHeight: 852,
    addEventListener() {},
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    matchMedia: () => ({ matches: true })
  };
  const createElement = documentRef.createElement.bind(documentRef);
  documentRef.createElement = tagName => {
    const element = createElement(tagName);
    if (String(tagName).toLowerCase() === "div") {
      let html = "";
      Object.defineProperty(element, "innerHTML", {
        configurable: true,
        get() {
          return html;
        },
        set(value) {
          html = String(value || "");
          element.children = [];
          if (!html.includes("data-vocab-term=\"mutter\"")) return;
          for (let index = 0; index < 2; index += 1) {
            const hit = createElement("button");
            hit.className = "vocab-hit";
            hit.dataset.vocabTerm = "mutter";
            hit.scrollIntoView = () => {};
            element.appendChild(hit);
          }
        }
      });
    }
    return element;
  };

  const store = createR3Store(createInitialR3State({
    initialized: true,
    activeScreen: R3_ROUTES.READER,
    activeBookId: "recent",
    activeChapterId: "chapter-2",
    activeChapterIndex: 1,
    reader: {
      status: "ready",
      chapterTitle: "Chapter 2",
      html: "<button class=\"vocab-hit\" data-vocab-term=\"mutter\">mutter</button>",
      vocabularyBubble: null
    }
  }));
  const controller = {
    async initialize() {},
    applyReaderScrollRestoration() {},
    recordReaderScroll() {},
    flushReaderProgress() {}
  };
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  const findHits = () => {
    const hits = [];
    const stack = [app.root];
    while (stack.length) {
      const node = stack.shift();
      if (String(node.className || "").split(/\s+/).includes("vocab-hit")) hits.push(node);
      stack.push(...(node.children || []));
    }
    return hits;
  };

  assert.equal(scrollToVocabularyHit(app.root, "mutter", 1), true);
  assert.doesNotMatch(findHits()[0].className, /is-passage-target/);
  assert.match(findHits()[1].className, /is-passage-target/);

  store.dispatch(r3Actions.setReaderState({ vocabularyMessage: "same chapter update" }));
  assert.doesNotMatch(findHits()[0].className, /is-passage-target/);
  assert.match(findHits()[1].className, /is-passage-target/);
  assert.equal(findHits()[1].dataset.passageOccurrenceIndex, "1");

  store.dispatch(r3Actions.navigate(R3_ROUTES.HOME));
  assert.equal(findHits().length, 0);
  store.dispatch(r3Actions.navigate(R3_ROUTES.READER));
  assert.equal(findHits().some(hit => /is-passage-target/.test(hit.className)), false);

  assert.equal(scrollToVocabularyHit(app.root, "mutter", 1), true);
  store.dispatch(r3Actions.setActiveChapter("chapter-1", 0));
  assert.equal(findHits().some(hit => /is-passage-target/.test(hit.className)), false);
});

test("R3 View in passage applies a persistent locator after Preview closes", async () => {
  const documentRef = createMockDocument();
  documentRef.defaultView = {
    innerWidth: 393,
    innerHeight: 852,
    addEventListener() {},
    matchMedia: () => ({ matches: false }),
    setTimeout() {
      throw new Error("passage locator must not use a timeout");
    }
  };
  const createElement = documentRef.createElement.bind(documentRef);
  documentRef.createElement = tagName => {
    const element = createElement(tagName);
    if (String(tagName).toLowerCase() === "div") {
      let html = "";
      Object.defineProperty(element, "innerHTML", {
        configurable: true,
        get() {
          return html;
        },
        set(value) {
          html = String(value || "");
          element.children = [];
          if (!html.includes("data-vocab-term=\"mutter\"")) return;
          for (let index = 0; index < 2; index += 1) {
            const hit = createElement("button");
            hit.className = "vocab-hit";
            hit.dataset.vocabTerm = "mutter";
            hit.scrollIntoView = () => {};
            element.appendChild(hit);
          }
        }
      });
    }
    return element;
  };

  const store = createR3Store(createInitialR3State({
    initialized: true,
    activeScreen: R3_ROUTES.READER,
    activeBookId: "recent",
    activeChapterId: "chapter-2",
    activeChapterIndex: 1,
    openOverlay: R3_OVERLAYS.VOCABULARY_PREVIEW,
    reader: {
      status: "ready",
      chapterTitle: "Chapter 2",
      html: "<button class=\"vocab-hit\" data-vocab-term=\"mutter\">mutter</button>",
      vocabularyPreview: {
        chapterId: "chapter-2",
        detailsOpen: false,
        rows: [{
          term: "mutter",
          isExpanded: true,
          contextOpen: true,
          hasLiveAnnotation: true,
          occurrences: [
            { occurrenceIndex: 0, snippet: "first mutter" },
            { occurrenceIndex: 1, snippet: "second mutter" }
          ]
        }]
      }
    }
  }));
  const controller = {
    async initialize() {},
    applyReaderScrollRestoration() {},
    recordReaderScroll() {},
    flushReaderProgress() {},
    goToVocabularyPreviewOccurrence(term, occurrenceIndex) {
      if (term !== "mutter" || Number(occurrenceIndex) !== 1) return false;
      store.dispatch(r3Actions.closeOverlay());
      return true;
    }
  };
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  const findAll = predicate => {
    const matches = [];
    const stack = [app.root];
    while (stack.length) {
      const node = stack.shift();
      if (predicate(node)) matches.push(node);
      stack.push(...(node.children || []));
    }
    return matches;
  };
  const passageButton = findAll(node => (
    node.dataset?.action === "vocabulary-preview-passage"
    && node.dataset?.occurrenceIndex === "1"
  ))[0];

  app.root.eventListeners.get("click")[0]({ target: passageButton });

  const hits = findAll(node => String(node.className || "").split(/\s+/).includes("vocab-hit"));
  assert.equal(store.getState().openOverlay, null);
  assert.doesNotMatch(hits[0].className, /is-passage-target/);
  assert.match(hits[1].className, /is-passage-target/);
  assert.equal(hits[1].dataset.passageOccurrenceIndex, "1");

  store.dispatch(r3Actions.setReaderState({ vocabularyMessage: "same chapter after locate" }));
  const rerenderedHits = findAll(node => String(node.className || "").split(/\s+/).includes("vocab-hit"));
  assert.match(rerenderedHits[1].className, /is-passage-target/);
});

test("R3 Preview open and ordinary close preserve the Reader scroll position", async () => {
  const frameCallbacks = [];
  const documentRef = createMockDocument();
  documentRef.defaultView = {
    innerWidth: 393,
    innerHeight: 852,
    addEventListener() {},
    requestAnimationFrame(callback) {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }
  };
  const { adapters, readerRuntime } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items: [{ term: "mutter" }] });
  adapters.vocabulary.getChapterPreview = (_chapter, items) => items;
  adapters.vocabulary.setTermState = async () => {};
  adapters.modes.renderChapter = (_chapter, _mode, options) => ({ html: "<p>mutter</p>", vocabularyPreview: options.vocabularyItems });

  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  await controller.resumeBook("recent");
  const findByClass = (root, className) => {
    const stack = [root];
    while (stack.length) {
      const node = stack.shift();
      if (String(node.className || "").split(/\s+/).includes(className)) return node;
      stack.push(...(node.children || []));
    }
    return null;
  };
  let scroll = findByClass(app.root, "r3-reader-scroll");
  scroll.scrollTop = 176;

  controller.openVocabularyPreview();
  scroll = findByClass(app.root, "r3-reader-scroll");
  assert.equal(scroll.scrollTop, 176);

  let previewScroll = findByClass(app.root, "r3-vocabulary-preview-list");
  previewScroll.scrollTop = 238;
  controller.toggleVocabularyPreviewDetails(true);
  previewScroll = findByClass(app.root, "r3-vocabulary-preview-list");
  assert.equal(previewScroll.scrollTop, 238);

  controller.toggleVocabularyPreviewContext("mutter");
  previewScroll = findByClass(app.root, "r3-vocabulary-preview-list");
  assert.equal(previewScroll.scrollTop, 238);

  await controller.setReaderVocabularyState("learning", "mutter");
  previewScroll = findByClass(app.root, "r3-vocabulary-preview-list");
  assert.equal(previewScroll.scrollTop, 238);

  const clickListener = app.root.eventListeners.get("click")[0];
  const previewPanel = findByClass(app.root, "r3-vocabulary-preview");
  clickListener({ target: previewPanel });
  assert.equal(store.getState().openOverlay, R3_OVERLAYS.VOCABULARY_PREVIEW);
  const previewScrim = findByClass(app.root, "r3-reader-scrim");
  clickListener({ target: previewScrim });
  assert.equal(store.getState().openOverlay, null);

  scroll = findByClass(app.root, "r3-reader-scroll");
  assert.equal(scroll.scrollTop, 176);
  frameCallbacks.splice(0).forEach(callback => callback());
});

test("R3 bootstrap shows Selection Save DOM-locally without clearing native selection", async () => {
  const documentRef = createMockDocument();
  documentRef.defaultView = {
    innerWidth: 393,
    innerHeight: 852,
    addEventListener() {},
    requestAnimationFrame(callback) {
      callback();
      return 1;
    }
  };
  let saved = null;
  let nativeSelectionClears = 0;
  const controller = {
    async initialize() {},
    setReaderVocabularyState(state, term) {
      saved = { state, term };
    }
  };
  const store = createR3Store(createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    activeBookId: "recent",
    activeChapterId: "chapter-1",
    activeChapterIndex: 0,
    reader: {
      status: "ready",
      html: "<p>Personal phrase appears here.</p>",
      bookTitle: "Recent Book",
      chapterTitle: "Chapter 1",
      chapterIndex: 0,
      chapterCount: 1,
      progressLabel: "Chapter 1 / 1",
      hasPrevious: false,
      hasNext: false
    }
  }));
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  const findBy = predicate => {
    const stack = [app.root];
    while (stack.length) {
      const node = stack.shift();
      if (predicate(node)) return node;
      stack.push(...(node.children || []));
    }
    return null;
  };
  const content = findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-content"));
  const textNode = { nodeType: 3, textContent: "Personal phrase", parentNode: content };
  content.children.push(textNode);
  const nativeSelection = {
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => ({ startContainer: textNode, endContainer: textNode }),
    toString: () => textNode.textContent,
    removeAllRanges() {
      nativeSelectionClears += 1;
    }
  };
  documentRef.getSelection = () => nativeSelection;

  documentRef.listeners.find(listener => listener.type === "selectionchange").listener();

  const bar = findBy(node => node.dataset?.role === "reader-selection-save");
  const saveButton = findBy(node => node.dataset?.action === "reader-selection-save");
  assert.equal(bar.hidden, false);
  assert.equal(saveButton.dataset.selectionTerm, "personal phrase");
  assert.equal(saveButton.children.at(-1).textContent, "Save");
  assert.equal(saveButton.children[0].tagName, "SVG");
  assert.equal(saveButton.children[0].getAttribute("aria-hidden"), "true");
  assert.notEqual(saveButton.children.at(-1).textContent, "Save to Learning");
  assert.equal(nativeSelectionClears, 0);

  nativeSelection.toString = () => "one two three four five six seven eight nine";
  documentRef.listeners.find(listener => listener.type === "selectionchange").listener();
  assert.equal(bar.hidden, true);
  assert.equal(saveButton.dataset.selectionTerm, undefined);
  assert.equal(nativeSelectionClears, 0);

  nativeSelection.toString = () => "personal phrase";
  documentRef.listeners.find(listener => listener.type === "selectionchange").listener();
  assert.equal(bar.hidden, false);

  app.root.eventListeners.get("click")[0]({ target: saveButton });
  assert.deepEqual(saved, { state: "learning", term: "personal phrase" });
  assert.equal(nativeSelectionClears, 0);
});

test("R3 live AppShell keeps Reader DOM on optimistic Save", async () => {
  const frameCallbacks = [];
  const documentRef = createMockDocument();
  documentRef.defaultView = {
    innerWidth: 393,
    innerHeight: 852,
    addEventListener() {},
    requestAnimationFrame(callback) {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }
  };

  const pending = createDeferred();
  let persisted = null;
  const item = { term: "mutter" };
  const { adapters, readerRuntime } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [item] });
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: {
      knownWords: [],
      learningWords: persisted === "learning" ? [item.term] : [],
      ignoredWords: []
    },
    items: [item]
  });
  adapters.vocabulary.getChapterPreview = () => [item];
  adapters.vocabulary.setTermState = async (_term, state) => {
    await pending.promise;
    persisted = state;
  };

  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters,
    readerRuntime,
    collectVocabularyOccurrences: () => ({})
  });
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  await controller.resumeBook("recent");

  const findBy = predicate => {
    const stack = [app.root];
    while (stack.length) {
      const node = stack.shift();
      if (predicate(node)) return node;
      stack.push(...(node.children || []));
    }
    return null;
  };

  controller.openVocabularyPreview();
  const content = findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-content"));
  const scroll = findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-scroll"));
  assert.ok(content && scroll);

  app.root.querySelectorAll = (selector) => {
    if (String(selector).includes("vocabulary-state")) return [];
    return [];
  };

  const forwarded = [];
  const stopForwardWatch = store.subscribe((_state, action) => {
    if (action?.optimisticVocabulary) forwarded.push(action);
  });
  const saving = controller.setReaderVocabularyState("learning", item.term);
  stopForwardWatch();

  assert.equal(forwarded.length > 0, true, "optimisticVocabulary must reach live-shell subscribers");
  assert.equal(store.getState().reader.vocabularyPreview.rows[0].state, "learning");
  assert.deepEqual(store.getState().reader.learningWords, [item.term]);
  assert.equal(
    findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-content")),
    content,
    "optimistic Save must not rebuild Reader prose"
  );
  assert.equal(
    findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-scroll")),
    scroll
  );

  pending.resolve();
  await saving;
  assert.equal(persisted, "learning");
  assert.deepEqual(store.getState().reader.learningWords, [item.term]);

  const afterPersistContent = findBy(node => (
    String(node.className || "").split(/\s+/).includes("r3-reader-content")
  ));
  controller.openReaderContents();
  assert.notEqual(
    findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-content")),
    afterPersistContent,
    "ordinary Reader updates must still rebuild"
  );
  controller.closeOverlay();
  frameCallbacks.splice(0).forEach(callback => callback());
});

test("R3 live AppShell Selection Save paints pending underline without rebuilding prose", async () => {
  const frameCallbacks = [];
  const documentRef = createMockDocument();
  documentRef.defaultView = {
    innerWidth: 393,
    innerHeight: 852,
    addEventListener() {},
    requestAnimationFrame(callback) {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }
  };

  const term = "mutter";
  const { adapters, readerRuntime } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [] });
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: { knownWords: [], learningWords: [term], ignoredWords: [] },
    items: [{ term }]
  });
  adapters.vocabulary.getChapterPreview = () => [];
  adapters.vocabulary.setTermState = async () => {};

  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters,
    readerRuntime,
    collectVocabularyOccurrences: () => ({})
  });
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  await controller.resumeBook("recent");

  const findBy = predicate => {
    const stack = [app.root];
    while (stack.length) {
      const node = stack.shift();
      if (predicate(node)) return node;
      stack.push(...(node.children || []));
    }
    return null;
  };

  const content = findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-content"));
  documentRef.createRange = () => {
    let contents = null;
    let endOffset = 0;
    let startNode = null;
    let startOffset = 0;
    let finishOffset = 0;
    return {
      selectNodeContents(node) { contents = node; },
      setEnd(_node, offset) {
        if (startNode) {
          finishOffset = offset;
          return;
        }
        endOffset = offset;
      },
      setStart(node, offset) {
        startNode = node;
        startOffset = offset;
      },
      toString() {
        return String(contents?.textContent || "").slice(0, endOffset);
      },
      surroundContents(mark) {
        const parent = startNode.parentElement || startNode.parentNode;
        const text = String(startNode.textContent || "");
        mark.textContent = text.slice(startOffset, finishOffset);
        parent.children = [mark];
        mark.parentNode = parent;
        parent.textContent = text;
      }
    };
  };
  documentRef.createTreeWalker = (rootNode) => {
    const nodes = [];
    const visit = (node) => {
      if (node?.nodeType === 3) nodes.push(node);
      for (const child of node?.children || []) visit(child);
    };
    visit(rootNode);
    let index = 0;
    return { nextNode() { return nodes[index++] || null; } };
  };

  const paragraph = documentRef.createElement("p");
  paragraph.textContent = term;
  paragraph.closest = () => paragraph;
  const textNode = {
    nodeType: 3,
    textContent: term,
    parentNode: paragraph,
    parentElement: paragraph,
    ownerDocument: documentRef
  };
  paragraph.appendChild(textNode);
  content.appendChild(paragraph);
  app.root.querySelectorAll = (selector) => {
    if (!String(selector).includes(".r3-reader-content p")) return [];
    return [paragraph];
  };
  documentRef.getSelection = () => ({
    isCollapsed: false,
    rangeCount: 1,
    toString: () => term,
    getRangeAt: () => ({
      startContainer: textNode,
      endContainer: textNode,
      startOffset: 0,
      endOffset: term.length
    })
  });
  documentRef.listeners.find(listener => listener.type === "selectionchange").listener();
  frameCallbacks.splice(0).forEach(callback => callback());
  const saveButton = findBy(node => node.dataset?.action === "reader-selection-save");
  assert.equal(saveButton.dataset.selectionTerm, term);

  const pending = createDeferred();
  adapters.vocabulary.setTermState = async () => {
    await pending.promise;
  };
  let savePromise = null;
  const originalSetState = controller.setReaderVocabularyState.bind(controller);
  controller.setReaderVocabularyState = (...args) => {
    savePromise = originalSetState(...args);
    return savePromise;
  };
  app.root.eventListeners.get("click")[0]({ target: saveButton });
  assert.equal(
    findBy(node => String(node.className || "").split(/\s+/).includes("r3-reader-content")),
    content,
    "optimistic Selection Save must not rebuild Reader prose"
  );
  const pendingMark = collectNodes(content).find(node => (
    String(node.className || "").split(/\s+/).includes("r3-vocabulary-pending")
  ));
  assert.ok(pendingMark, "pending underline must paint on the preserved DOM");
  assert.equal(pendingMark.textContent, term);
  assert.ok(savePromise);
  pending.resolve();
  await savePromise;
  frameCallbacks.splice(0).forEach(callback => callback());
});

test("R3 bootstrap preserves an open vocabulary bubble through same-chapter scroll restoration", async () => {
  const frameCallbacks = [];
  const documentRef = createMockDocument();
  documentRef.defaultView = {
    innerWidth: 393,
    innerHeight: 852,
    addEventListener() {},
    requestAnimationFrame(callback) {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }
  };
  const { adapters, readerRuntime } = createAdapters();
  const item = { term: "mutter", chineseMeaning: "低声嘟囔", englishDefinition: "to speak quietly" };
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.modes.renderChapter = (chapter, mode, options) => ({
    html: `<p>${chapter.title} rendered in ${mode}</p>`,
    vocabularyPreview: options.vocabularyItems
  });
  adapters.vocabulary.getReaderVocabulary = async () => ({
    profile: { knownWords: [], learningWords: [], ignoredWords: [] },
    items: [item]
  });
  adapters.vocabulary.getTermMetadata = (term, items) => items.find(entry => entry.term === term) || null;

  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  const app = await bootstrapR3App({ document: documentRef, store, controller });
  await app.controller.resumeBook("recent");
  const findByClass = (root, className) => {
    const stack = [root];
    while (stack.length) {
      const current = stack.shift();
      if (String(current.className || "").split(/\s+/).includes(className)) return current;
      stack.push(...(current.children || []));
    }
    return null;
  };
  const previousScroll = findByClass(app.root, "r3-reader-scroll");
  previousScroll.scrollTop = 120;

  app.controller.toggleVocabularyBubble("mutter", { x: 24, y: 48 });
  const restoredScroll = findByClass(app.root, "r3-reader-scroll");
  const scrollListener = app.root.eventListeners.get("scroll")[0];
  scrollListener({ target: previousScroll });
  scrollListener({ target: restoredScroll });

  assert.equal(restoredScroll.scrollTop, 120);
  assert.equal(app.store.getState().reader.vocabularyBubble.term, "mutter");
  assert.equal(app.store.getState().reader.vocabularyBubble.item.englishDefinition, "to speak quietly");

  frameCallbacks.splice(0).forEach(callback => callback());
  restoredScroll.scrollTop = 160;
  restoredScroll.scrollHeight = 1000;
  restoredScroll.clientHeight = 200;
  scrollListener({ target: restoredScroll });
  assert.equal(app.store.getState().reader.vocabularyBubble, null);
  await app.controller.flushReaderProgress();
});

test("R3 bootstrap mounts exactly one development root and prevents duplicate initialization", async () => {
  const documentRef = createMockDocument();
  const { calls, adapters } = createAdapters();

  const first = await bootstrapR3App({ document: documentRef, adapters });
  const second = await bootstrapR3App({ document: documentRef, adapters });

  assert.equal(first, second);
  assert.equal(documentRef.querySelectorAll("#r3-root").length, 1);
  assert.equal(calls.listBooks, 1);
  assert.equal(documentRef.listenerCount, 3); // selection, gesture lifecycle, progress lifecycle
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

test("R3 loading copy interpolates chapter titles and uses neutral copy without a title", async () => {
  const { createTranslator } = await import("../pwa-reader/i18n.js");
  for (const language of ["en", "zh-CN"]) {
    for (const chapterTitle of ["", "Title Page"]) {
      const state = createInitialR3State();
      state.reader = { ...state.reader, status: "loading", chapterTitle };
      const nodes = collectNodes(createReaderView(createMockDocument(), state, createTranslator(language)));
      const text = nodes.map(node => node.textContent).join(" ");
      assert.doesNotMatch(text, /\{title\}/);
      if (chapterTitle) assert.ok(text.includes(chapterTitle));
    }
  }
});

test("R3 source cache evicts old chapter bodies and retains the recent return path", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const original = readerRuntime.loadEpubFromFile;
  readerRuntime.loadEpubFromFile = async file => {
    const loaded = await original(file);
    loaded.book.chapters = Array.from({ length: 7 }, (_, i) => ({ id: "chapter-" + (i + 1), title: "Chapter " + (i + 1), order: i + 1 }));
    return loaded;
  };
  const controller = createR3Controller({ store: createR3Store(), adapters, readerRuntime });
  await controller.resumeBook("recent");
  for (const index of [2, 3, 4, 5, 6]) await controller.selectReaderChapter(index);
  const loaded = calls.loadChapterContent.length;
  await controller.selectReaderChapter(5);
  assert.equal(calls.loadChapterContent.length, loaded);
  await controller.selectReaderChapter(1);
  assert.equal(calls.loadChapterContent.length, loaded + 1);
});

test("R3 source progress seeks restore a source fraction without enumerating chapters or persisting page numbers", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  await controller.setReadingLayout("scroll");
  assert.equal(typeof controller.seekReaderSourceFraction, "function");
  await controller.seekReaderSourceFraction(0.25);
  assert.equal(store.getState().activeChapterIndex, 0);
  assert.equal(store.getState().reader.positionRequest.sourceFraction, 0.5);
  assert.equal(calls.loadChapterContent.length, 2);
  await controller.seekReaderSourceFraction(0.4);
  assert.equal(calls.loadChapterContent.length, 2);
  assert.equal(store.getState().reader.positionRequest.sourceFraction, 0.8);
  await controller.flushReaderProgress();
  assert.equal("sourceFraction" in (calls.savePosition.at(-1).overrides || {}), false);
  assert.equal("pageIndex" in (calls.savePosition.at(-1).overrides || {}), false);
});

test("dismissed Settings cannot reopen when its origin progress write completes", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  await controller.setReaderAppearance({ theme: "dark" });
  const save = createDeferred();
  adapters.reader.savePosition = () => save.promise;
  const entering = controller.navigate(R3_ROUTES.SETTINGS_HOME);
  await controller.returnFromSettings();
  save.resolve(); await entering;
  assert.equal(store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(store.getState().settings.returnScreen, null);
  assert.equal(store.getState().reader.readerAppearance.theme, "dark");
});

for (const phase of ["adapter", "epub", "bookmarks"]) test(`abandoned ${phase} Reader restore cannot reopen a route`, async () => {
  const { adapters, readerRuntime } = createAdapters();
  const pending = createDeferred(), entered = createDeferred();
  const hold = original => async (...args) => {
    entered.resolve(); await pending.promise; return original(...args);
  };
  if (phase === "adapter") adapters.reader.openBook = hold(adapters.reader.openBook);
  if (phase === "epub") readerRuntime.loadEpubFromFile = hold(readerRuntime.loadEpubFromFile);
  if (phase === "bookmarks") adapters.bookmarks = { list: hold(async () => []) };
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  const opening = controller.selectBook("recent"); await entered.promise;
  await controller.navigate(R3_ROUTES.LIBRARY);
  pending.resolve(); await opening;
  assert.equal(store.getState().activeScreen, R3_ROUTES.LIBRARY);
  assert.equal(store.getState().activeBookId, null);
  assert.equal(store.getState().openOverlay, null);
});

test("Reader exit never publishes Light Reader between Dark Reader and Library", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent"); await controller.setReaderAppearance({ theme: "dark" });
  const appearances = [];
  const unsubscribe = store.subscribe(state => {
    if (state.activeScreen === R3_ROUTES.READER) appearances.push(state.reader.readerAppearance.theme);
  });
  await controller.navigate(R3_ROUTES.LIBRARY); unsubscribe();
  assert.ok(appearances.every(theme => theme === "dark"), JSON.stringify(appearances));
});

test("Forward to live Reader cancels an already running Back restore before progress resolves", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  const entries = [{}], listeners = new Map(); let index = 0;
  const history = {
    get state() { return entries[index]; },
    replaceState(entry) { entries[index] = entry; },
    pushState(entry) { entries.splice(++index); entries[index] = entry; },
    go(delta) { index += delta; listeners.get("popstate")({ state: entries[index] }); },
    back() { this.go(-1); }, forward() { this.go(1); }
  };
  const bridge = bindReaderHistory({ history, addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: key => listeners.delete(key) }, store, controller);
  await controller.navigate(R3_ROUTES.LIBRARY); await controller.selectBook("recent");
  controller.recordReaderPosition({ chapterId: "chapter-2", textOffset: 12 });
  const save = createDeferred(), entered = createDeferred();
  adapters.reader.savePosition = () => { entered.resolve(); return save.promise; };
  history.back(); await entered.promise; history.forward();
  const routes = [];
  const unsubscribe = store.subscribe(state => routes.push(state.activeScreen));
  save.resolve(); await bridge.whenSettled();
  unsubscribe();
  assert.equal(history.state.interleafR3.screen, R3_ROUTES.READER);
  assert.equal(store.getState().activeScreen, R3_ROUTES.READER);
  assert.ok(!routes.includes(R3_ROUTES.LIBRARY), "obsolete Back must never publish Library after Forward");
  bridge.destroy();
});

test("queued history restore cannot cancel a newer explicit book choice", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const open = adapters.reader.openBook;
  adapters.reader.openBook = async key => ({ ...(await open(key)), bookKey: key });
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  const entries = [{}], listeners = new Map(); let index = 0;
  const history = {
    get state() { return entries[index]; },
    replaceState(entry) { entries[index] = entry; },
    pushState(entry) { entries.splice(++index); entries[index] = entry; },
    go(delta) { index += delta; listeners.get("popstate")({ state: entries[index] }); },
    back() { this.go(-1); }, forward() { this.go(1); }
  };
  const bridge = bindReaderHistory({ history, addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: key => listeners.delete(key) }, store, controller);
  await controller.navigate(R3_ROUTES.LIBRARY); await controller.selectBook("recent");
  history.back(); await bridge.whenSettled();
  history.forward();
  await controller.selectBook("older"); await bridge.whenSettled();
  assert.equal(store.getState().activeBookId, "older");
  assert.equal(history.state.interleafR3.bookId, "older");
  bridge.destroy();
});

test("obsolete book open failure cannot overwrite a newer navigation loading or error state", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const old = createDeferred(), latest = createDeferred();
  adapters.reader.openBook = key => key === "old" ? old.promise : latest.promise;
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  const abandoned = controller.selectBook("old"), opening = controller.selectBook("latest");
  old.reject(new Error("obsolete open failed")); await abandoned;
  assert.equal(store.getState().loading.isLoading, true);
  assert.equal(store.getState().error, null);
  await controller.navigate(R3_ROUTES.LIBRARY);
  assert.equal(store.getState().loading.isLoading, false);
  latest.reject(new Error("dismissed open failed")); await opening;
  assert.equal(store.getState().error, null);
});

test("chapter restore awaiting a progress write is canceled before Settings is dismissed", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.recordReaderPosition({ chapterId: "chapter-2", textOffset: 12 });
  const save = createDeferred(), entered = createDeferred();
  adapters.reader.savePosition = () => { entered.resolve(); return save.promise; };
  const chapter = controller.selectReaderChapter(0); await entered.promise;
  const entering = controller.navigate(R3_ROUTES.SETTINGS_HOME);
  await controller.returnFromSettings();
  save.resolve(); await Promise.all([entering, chapter]);
  assert.equal(store.getState().activeScreen, R3_ROUTES.READER);
  assert.equal(store.getState().activeChapterId, "chapter-2");
});

test("superseded Settings entry clears origin metadata before a later Reader visit", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.recordReaderPosition({ chapterId: "chapter-2", textOffset: 12 });
  const save = createDeferred(); adapters.reader.savePosition = () => save.promise;
  const entering = controller.navigate(R3_ROUTES.SETTINGS_HOME);
  const leaving = controller.navigate(R3_ROUTES.LIBRARY);
  save.resolve(); await Promise.all([entering, leaving]);
  assert.equal(store.getState().settings.returnScreen, null);
  assert.equal(store.getState().activeScreen, R3_ROUTES.LIBRARY);
});

test("Settings cancellation releases mode controls while a mode change awaits progress", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  controller.recordReaderPosition({ chapterId: "chapter-2", textOffset: 12 });
  const save = createDeferred(), entered = createDeferred();
  adapters.reader.savePosition = () => { entered.resolve(); return save.promise; };
  const mode = controller.setReaderMode("english-study"); await entered.promise;
  const entering = controller.navigate(R3_ROUTES.SETTINGS_HOME); await controller.returnFromSettings();
  save.resolve(); await Promise.all([mode, entering]);
  assert.equal(store.getState().reader.modeSaving, false);
  await controller.setReaderMode("english-study");
  assert.equal(store.getState().activeReadingMode, "english-study");
});

test("Settings returns to the exact live Reader A session after language change", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.initialize();
  await controller.selectBook("older");
  await controller.selectBook("recent");
  await controller.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 37 });
  const loadCount = calls.loadEpubFromFile.length;
  await controller.navigate(R3_ROUTES.SETTINGS_HOME);
  await controller.setUiLanguage("zh-CN");
  await controller.returnFromSettings();
  const state = store.getState();
  assert.equal(state.activeScreen, R3_ROUTES.READER);
  assert.equal(state.activeBookId, "recent");
  assert.equal(state.activeChapterId, "chapter-2");
  assert.deepEqual(state.reader.positionRequest.position, { chapterId: "chapter-2", textOffset: 37 });
  assert.equal(state.activeReadingMode, "cloze-mixed");
  assert.equal(state.reader.readingLayout, "page");
  assert.equal(state.reader.readerAppearance.fontSize, "md");
  assert.equal(state.settings.uiLanguage, "zh-CN");
  assert.equal(calls.loadEpubFromFile.length, loadCount);
  assert.deepEqual(calls.openBook, ["older", "recent"]);
  assert.deepEqual(calls.resumeBook, []);

  await controller.selectBook("older");
  await controller.seekReaderPosition(0, { chapterId: "chapter-1", textOffset: 9 });
  await controller.navigate(R3_ROUTES.SETTINGS_HOME);
  await controller.returnFromSettings();
  assert.equal(store.getState().activeBookId, "older");
  assert.deepEqual(store.getState().reader.positionRequest.position,
    { chapterId: "chapter-1", textOffset: 9 });
});

test("Settings return during a chapter load restores the last valid source instead of stranding loading", async () => {
  const { adapters, readerRuntime } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  const delayed = createDeferred(), entered = createDeferred();
  const load = readerRuntime.loadChapterContent;
  let block = false;
  readerRuntime.loadChapterContent = async (...args) => {
    if (block) { entered.resolve(); await delayed.promise; }
    return load(...args);
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.selectBook("older");
  const origin = store.getState();
  block = true;
  const turning = controller.turnReaderChapter(-1);
  await entered.promise;
  assert.equal(store.getState().reader.status, "loading");
  await controller.navigate(R3_ROUTES.SETTINGS_HOME);
  await controller.returnFromSettings();
  delayed.resolve(); await turning;
  assert.equal(store.getState().reader.status, "ready");
  assert.equal(store.getState().activeChapterId, origin.activeChapterId);
  assert.equal(store.getState().reader.chapterIndex, origin.reader.chapterIndex);
  assert.equal(store.getState().reader.html, origin.reader.html);
  await controller.turnReaderChapter(-1);
  assert.equal(store.getState().reader.status, "ready");
  assert.notEqual(store.getState().activeChapterId, origin.activeChapterId);
});

test("Settings return without language change and Library origin never fabricate a Reader", async () => {
  const { adapters, readerRuntime } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.initialize();
  await controller.selectBook("recent");
  await controller.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 14 });
  await controller.navigate(R3_ROUTES.SETTINGS_HOME);
  await controller.returnFromSettings();
  assert.equal(store.getState().activeBookId, "recent");
  assert.deepEqual(store.getState().reader.positionRequest.position, { chapterId: "chapter-2", textOffset: 14 });
  await controller.navigate(R3_ROUTES.LIBRARY);
  await controller.navigate(R3_ROUTES.SETTINGS_HOME);
  await controller.returnFromSettings();
  assert.equal(store.getState().activeScreen, R3_ROUTES.LIBRARY);
  assert.equal(store.getState().activeBookId, null);
});

test("a pending chapter cannot commit behind Settings before its Return action", async () => {
  const { adapters, readerRuntime } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  const delayed = createDeferred(), entered = createDeferred();
  const load = readerRuntime.loadChapterContent;
  let block = false;
  readerRuntime.loadChapterContent = async (...args) => {
    if (block) { entered.resolve(); await delayed.promise; }
    return load(...args);
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  const origin = store.getState().activeChapterId;
  block = true;
  const turning = controller.turnReaderChapter(-1); await entered.promise;
  await controller.navigate(R3_ROUTES.SETTINGS_HOME);
  delayed.resolve(); await turning;
  assert.equal(store.getState().activeChapterId, origin);
  await controller.returnFromSettings();
  assert.equal(store.getState().reader.status, "ready");
  assert.equal(store.getState().activeChapterId, origin);
});

test("Passage detour crosses chapters without saving destination and returns to source anchor", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  await controller.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 48 });
  await controller.flushReaderProgress();
  const before = calls.savePosition.length;
  await controller.startPassageDetour({ chapterId: "chapter-1", textOffset: 17 });
  assert.equal(store.getState().activeChapterId, "chapter-1");
  assert.equal(store.getState().reader.passageReturn, true);
  await controller.flushReaderProgress();
  assert.equal(calls.savePosition.length, before);
  await controller.returnFromPassageDetour();
  assert.equal(store.getState().activeChapterId, "chapter-2");
  assert.deepEqual(store.getState().reader.positionRequest.position, { chapterId: "chapter-2", textOffset: 48 });
  assert.equal(store.getState().reader.passageReturn, false);
});

test("Passage detour is canceled by book switch and only explicit continue saves destination", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  await controller.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 40 });
  await controller.flushReaderProgress();
  await controller.startPassageDetour({ chapterId: "chapter-1", textOffset: 8 });
  await controller.continueFromPassageDetour();
  assert.equal(calls.savePosition.at(-1).currentChapterId, "chapter-1");
  assert.deepEqual(calls.savePosition.at(-1).overrides.logicalPosition,
    { chapterId: "chapter-1", textOffset: 8 });
  await controller.startPassageDetour({ chapterId: "chapter-2", textOffset: 21 });
  await controller.selectBook("older");
  assert.equal(store.getState().reader.passageReturn, false);
  await controller.returnFromPassageDetour();
  assert.equal(store.getState().activeBookId, "older");
});

test("Reader bookmark toggles exact source anchors, seeks across chapters, and isolates books", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const saved = new Map();
  let nextId = 0;
  adapters.bookmarks = {
    list(bookKey) { return saved.get(bookKey) || []; },
    toggle(anchor) {
      const items = saved.get(anchor.bookKey) || [];
      const existing = items.find(item => item.chapterId === anchor.chapterId && item.textOffset === anchor.textOffset);
      const next = existing ? items.filter(item => item !== existing)
        : [...items, { ...anchor, id: `mark-${++nextId}`, createdAt: nextId }];
      saved.set(anchor.bookKey, next);
      return next;
    },
    remove(bookKey, id) {
      const next = (saved.get(bookKey) || []).filter(item => item.id !== id);
      saved.set(bookKey, next);
      return next;
    }
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.selectBook("recent");
  await controller.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 35 });
  await controller.toggleReaderBookmark();
  assert.equal(store.getState().reader.bookmarkActive, true);
  assert.equal(store.getState().reader.bookmarks.length, 1);
  assert.equal(store.getState().reader.bookmarks[0].chapterTitle, "Chapter 2");
  await controller.toggleReaderBookmark();
  assert.equal(store.getState().reader.bookmarks.length, 0);
  await controller.toggleReaderBookmark();
  const bookmarkId = store.getState().reader.bookmarks[0].id;
  await controller.seekReaderPosition(0, { chapterId: "chapter-1", textOffset: 4 });
  await controller.seekReaderBookmark(bookmarkId);
  assert.deepEqual(store.getState().reader.positionRequest.position, { chapterId: "chapter-2", textOffset: 35 });
  const beforeDelete = calls.savePosition.length;
  await controller.deleteReaderBookmark(bookmarkId);
  assert.equal(store.getState().reader.bookmarks.length, 0);
  assert.equal(calls.savePosition.length, beforeDelete);
  await controller.selectBook("older");
  assert.equal(store.getState().reader.bookmarks.length, 0);
});

test("Reader chrome and Contents expose bookmark toggle, seek, and delete", () => {
  const documentRef = createMockDocument();
  const state = createInitialR3State({
    activeScreen: R3_ROUTES.READER,
    activeBookId: "recent",
    activeChapterId: "chapter-2",
    openOverlay: R3_OVERLAYS.CONTENTS,
    reader: { status: "ready", bookTitle: "Recent Book", chapterTitle: "Chapter 2",
      html: "<p>Story</p>", chapterIndex: 1, chapterCount: 2, bookmarkActive: true,
      bookmarks: [{ id: "mark", bookKey: "recent", chapterId: "chapter-1",
        textOffset: 12, chapterTitle: "Chapter 1", createdAt: 1 }], toc: [] }
  });
  const nodes = collectNodes(createReaderView(documentRef, state));
  const toggle = nodes.find(node => node.dataset?.action === "reader-toggle-bookmark");
  assert.equal(toggle?.getAttribute?.("aria-pressed"), "true");
  assert.ok(nodes.find(node => node.dataset?.action === "reader-seek-bookmark" && node.dataset?.bookmarkId === "mark"));
  assert.ok(nodes.find(node => node.dataset?.action === "reader-delete-bookmark" && node.dataset?.bookmarkId === "mark"));
});

test("Preview passage occurrence carries a source offset through annotation wrappers", () => {
  const root = createMockElement("main");
  const content = createMockElement("div");
  content.className = "r3-reader-content";
  const paragraph = createMockElement("p");
  paragraph.textContent = "Before mutter after";
  const hit = createMockElement("button");
  hit.className = "vocab-hit";
  hit.dataset.vocabTerm = "mutter";
  hit.textContent = "mutter";
  paragraph.appendChild(hit);
  content.appendChild(paragraph);
  root.appendChild(content);
  paragraph.childNodes = [{ nodeType: 3, textContent: "Before " }, hit,
    { nodeType: 3, textContent: " after" }];
  content.childNodes = [paragraph];
  assert.deepEqual(collectVocabularyOccurrences(root, "chapter-2").mutter[0], {
    occurrenceIndex: 0, snippet: "Before mutter after", chapterId: "chapter-2", textOffset: 7
  });
});

test("Preview View in passage starts a transient detour and reload starts without one", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  adapters.modes.resolveModeFromProgress = () => "english-study";
  adapters.vocabulary.getReaderVocabulary = async () => ({ profile: {}, items: [{ term: "mutter" }] });
  adapters.vocabulary.getChapterPreview = (_chapter, items) => items;
  adapters.modes.renderChapter = () => ({ html: "<p>mutter</p>", vocabularyPreview: [] });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  await controller.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 31 });
  controller.openVocabularyPreview({ mutter: [{ occurrenceIndex: 0, snippet: "mutter",
    chapterId: "chapter-2", textOffset: 9 }] });
  const before = calls.savePosition.length;
  assert.equal(controller.goToVocabularyPreviewOccurrence("mutter", 0), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.getState().reader.passageReturn, true);
  await controller.flushReaderProgress();
  assert.ok(calls.savePosition.slice(before).every(save =>
    save.overrides?.logicalPosition?.textOffset === 31));
  await controller.returnFromPassageDetour();
  assert.deepEqual(store.getState().reader.positionRequest.position, { chapterId: "chapter-2", textOffset: 31 });
  const reloadStore = createR3Store();
  const reloaded = createR3Controller({ store: reloadStore, adapters, readerRuntime });
  await reloaded.resumeBook("recent");
  assert.equal(reloadStore.getState().reader.passageReturn, false);
});

test("bookmarks keep source anchors through Page Scroll appearance changes and Reader reopen", async () => {
  const { adapters, readerRuntime, calls } = createAdapters();
  const saved = new Map();
  adapters.bookmarks = {
    list(key) { return saved.get(key) || []; },
    toggle(anchor) {
      const next = [{ ...anchor, id: "mark", createdAt: 1 }];
      saved.set(anchor.bookKey, next);
      return next;
    },
    remove(key) { saved.set(key, []); return []; }
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters, readerRuntime });
  await controller.resumeBook("recent");
  await controller.seekReaderPosition(1, { chapterId: "chapter-2", textOffset: 63 });
  const progressSaves = calls.savePosition.length;
  await controller.toggleReaderBookmark();
  assert.equal(calls.savePosition.length, progressSaves);
  await controller.setReadingLayout("scroll");
  await controller.setReaderAppearance({ fontSize: "xl" });
  assert.deepEqual(saved.get("recent")[0].textOffset, 63);
  assert.equal("pageIndex" in saved.get("recent")[0], false);
  assert.equal(store.getState().activeReadingMode, "cloze-mixed");
  assert.equal(store.getState().reader.bookmarkActive, true);
  await controller.exitReader();
  await controller.resumeBook("recent");
  assert.equal(store.getState().reader.bookmarks.length, 1);
  await controller.seekReaderBookmark("mark");
  assert.deepEqual(store.getState().reader.positionRequest.position,
    { chapterId: "chapter-2", textOffset: 63 });
});


test("delayed failed Save cannot publish rollback after Reader exit", async () => {
 const {adapters,readerRuntime}=createAdapters();
 const readStarted=createDeferred(),readDone=createDeferred();let reads=0;
 adapters.modes.resolveModeFromProgress=()=>"english-study";
 adapters.vocabulary.getReaderVocabulary=async()=>{if(++reads===2){readStarted.resolve();await readDone.promise;}return {profile:{learningWords:[]},items:[]};};
 adapters.vocabulary.setTermState=async()=>{throw Error("failed write");};
 const store=createR3Store();const controller=createR3Controller({store,adapters,readerRuntime});
 await controller.resumeBook("recent");const saving=controller.setReaderVocabularyState("learning","visitor");await readStarted.promise;
 await controller.exitReader();const cleared=store.getState().reader;
 readDone.resolve();await saving;
 assert.equal(store.getState().reader.vocabularyMessage,cleared.vocabularyMessage);
 assert.equal(store.getState().activeBookId,null);
});

test("failed Save waits for a turn started during authoritative rollback read", async () => {
 const {adapters,readerRuntime}=createAdapters();
 const readStarted=createDeferred(),readDone=createDeferred(),turnDone=createDeferred();let reads=0,waits=0;
 adapters.modes.resolveModeFromProgress=()=>"english-study";
 adapters.vocabulary.getReaderVocabulary=async()=>{if(++reads===2){readStarted.resolve();await readDone.promise;}return {profile:{learningWords:[]},items:[]};};
 adapters.vocabulary.setTermState=async()=>{throw Error("failed write");};
 const store=createR3Store();const controller=createR3Controller({store,adapters,readerRuntime,waitForReaderTurn:()=>++waits===1?Promise.resolve():turnDone.promise});
 await controller.resumeBook("recent");const saving=controller.setReaderVocabularyState("learning","visitor");await readStarted.promise;
 readDone.resolve();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(waits,2,"rollback must recheck the visual transaction after its async read");
 assert.equal(store.getState().reader.vocabularyMessage,"");
 turnDone.resolve();await saving;
 assert.ok(store.getState().reader.vocabularyMessage);
 assert.deepEqual(store.getState().reader.learningWords,[]);
});

for (const navigation of ["Settings return", "same-chapter seek", "cancelled chapter load and Settings return"]) {
  for (const fail of [false, true]) {
    test(`pending selection Save ${fail ? "rollback" : "success"} survives ${navigation} in the same Reader context`, async () => {
      const { adapters, readerRuntime } = createAdapters();
      const entered = createDeferred(), release = createDeferred();
      const loadEntered = createDeferred(), releaseLoad = createDeferred();
      const loadChapter = readerRuntime.loadChapterContent;
      let holdLoad = false;
      readerRuntime.loadChapterContent = async (...args) => {
        if (holdLoad) { loadEntered.resolve(); await releaseLoad.promise; }
        return loadChapter(...args);
      };
      let confirmed = false;
      adapters.modes.resolveModeFromProgress = () => "english-study";
      adapters.vocabulary.getReaderVocabulary = async () => ({
        profile: { learningWords: confirmed ? ["mutter"] : [] }, items: []
      });
      adapters.modes.renderChapter = () => ({
        html: `<p>${confirmed ? "confirmed" : "unconfirmed"} mutter</p>`, vocabularyPreview: []
      });
      adapters.vocabulary.setTermState = async () => {
        entered.resolve(); await release.promise;
        if (fail) throw Error("Authored persistence failure");
        confirmed = true;
      };
      const store = createR3Store(), controller = createR3Controller({ store, adapters, readerRuntime });
      await controller.resumeBook("recent");
      const chapterId = store.getState().activeChapterId;
      const saving = controller.setReaderVocabularyState("learning", "mutter");
      await entered.promise;
      const originalRequest = store.getState().reader.positionRequest.sequence;
      if (navigation === "cancelled chapter load and Settings return") {
        holdLoad = true;
        const loading = controller.selectReaderChapter(store.getState().activeChapterIndex === 0 ? 1 : 0);
        await loadEntered.promise;
        await controller.navigate(R3_ROUTES.SETTINGS_HOME); await controller.returnFromSettings();
        releaseLoad.resolve(); await loading;
      } else if (navigation === "Settings return") {
        await controller.navigate(R3_ROUTES.SETTINGS_HOME); await controller.returnFromSettings();
      } else {
        await controller.seekReaderPosition(store.getState().activeChapterIndex, { chapterId, textOffset: 0 });
      }
      assert.notEqual(store.getState().reader.positionRequest.sequence, originalRequest);
      assert.deepEqual(store.getState().reader.learningWords, ["mutter"]);
      release.resolve(); await saving;
      const state = store.getState();
      assert.equal(state.activeScreen, R3_ROUTES.READER); assert.equal(state.activeBookId, "recent");
      assert.equal(state.activeChapterId, chapterId); assert.equal(state.reader.vocabularySaving, false);
      assert.deepEqual(state.reader.pendingVocabularyTerms, []);
      assert.deepEqual(state.reader.learningWords, fail ? [] : ["mutter"]);
      assert.equal(Boolean(state.reader.vocabularyMessage), fail);
      assert.equal(state.reader.html, `<p>${fail ? "unconfirmed" : "confirmed"} mutter</p>`);
    });
  }
}
