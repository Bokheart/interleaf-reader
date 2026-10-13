import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { GUIDE_BOOK_KEY } from '../pwa-reader/guideBook.js';
import { createReaderAdapter, resumeBook } from '../pwa-reader/adapters/readerAdapter.js';
import { createBooksAdapter } from '../pwa-reader/adapters/booksAdapter.js';
import { createModesAdapter } from '../pwa-reader/adapters/modesAdapter.js';
import { createVocabularyAdapter } from '../pwa-reader/adapters/vocabularyAdapter.js';
import { createLocalShardMetadataProvider } from '../pwa-reader/dictionaryMetadata.js';
import { buildVocabularyPreview } from '../pwa-reader/vocabEngine.js';
import { loadEffectiveKnownWordsForProfile } from '../pwa-reader/levelBaselineEngine.js';
import { resolveCapture } from '../pwa-reader/identity/runtime.mjs';
import { createR3Controller } from '../pwa-reader/ui-r3/controller.js';
import { createR3Store } from '../pwa-reader/ui-r3/store.js';
import { bindReaderHistory } from '../pwa-reader/ui-r3/readerHistory.js';
import { R3_ROUTES } from '../pwa-reader/ui-r3/routes.js';

const readerRoot = new URL('../pwa-reader/', import.meta.url);
const readJson = async url => JSON.parse(await readFile(url, 'utf8'));
const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

async function harness(options = {}) {
  const progress = options.progress || new Map();
  let profile = { selectedLevel: 'level1', knownWords: [], ignoredWords: [], learningWords: ['move', 'go', 'steal'], ...options.profile };
  const writes = [];
  const imported = {
    bookKey: 'imported-fixture', title: 'Imported fixture', fileBlob: new Blob(['fixture']),
    chapters: [
      { id: 'imported-1', title: 'One', plainText: 'They went home. It was stolen.', originalHtml: '<p>They went home. It was stolen.</p>' },
      { id: 'imported-2', title: 'Two', plainText: 'They went again.', originalHtml: '<p>They went again.</p>' }
    ]
  };
  const stored = new Map([[imported.bookKey, imported]]);
  const storage = {
    getReadingProgress: async key => progress.get(key),
    getStoredBook: async key => stored.get(key),
    getMostRecentStoredBook: async () => imported,
    listSavedBooks: async () => [...stored.values()],
    saveReadingProgress: async record => { progress.set(record.bookKey, record); return record; }
  };
  const dictionaryRequests = [];
  const dictionary = createLocalShardMetadataProvider({
    baseUrl: new URL('./fixtures/dictionary/', import.meta.url),
    fetchImpl: async url => {
      const path = url.pathname.split('/dictionary/')[1];
      dictionaryRequests.push(path);
      if (options.gate) { options.started?.resolve(); await options.gate.promise; }
      if (options.miss) return { ok: false };
      if (path === 'manifest.json') {
        const manifest = await readJson(url);
        return { ok: true, json: async () => ({ ...manifest, leaves: { ...manifest.leaves, mo: ['mo'] } }) };
      }
      // Original test-only metadata for a resolved occurrence in the authored Guide.
      if (path === 'shards/mo.json') return { ok: true, json: async () => ({ move: { englishDefinition: 'change position', chineseMeaning: '移动', canonicalTerm: 'forged', libraryKey: 'en:forged' } }) };
      return { ok: true, json: async () => readJson(url) };
    }
  });
  const mutate = field => async term => {
    writes.push([field, term]);
    for (const key of ['knownWords', 'learningWords', 'ignoredWords']) profile[key] = profile[key].filter(value => value !== term);
    if (field) profile[field].push(term);
    return structuredClone(profile);
  };
  const vocabulary = createVocabularyAdapter({
    loadVocabularyData: async () => (await readJson(new URL('../data/vocabulary.json', readerRoot))).concat(await readJson(new URL('../data/slang_idioms.json', readerRoot))),
    getVocabularyProfile: async () => structuredClone(profile),
    loadEffectiveKnownWordsForProfile: value => loadEffectiveKnownWordsForProfile(value, {
      fetchImpl: async path => ({ ok: true, json: async () => readJson(new URL(path, readerRoot)) })
    }),
    dictionaryMetadataProvider: dictionary,
    markWordKnown: mutate('knownWords'), addLearningWord: mutate('learningWords'), ignoreVocabularyWord: mutate('ignoredWords'), restoreVocabularyWord: mutate(null)
  });
  const metadataLookups = [];
  const resolveMetadata = vocabulary.resolveTermMetadata.bind(vocabulary);
  vocabulary.resolveTermMetadata = (...args) => {
    const lookup = resolveMetadata(...args);
    metadataLookups.push(lookup);
    return lookup;
  };
  const adapters = {
    books: createBooksAdapter(storage),
    reader: createReaderAdapter({ ...storage, createFile: () => ({ name: 'fixture.epub' }) }),
    vocabulary,
    // Node has no DOM. Keep real occurrence matching and Guide content, and
    // substitute only HTML annotation. Browser QA exercises the actual renderer.
    modes: createModesAdapter({ renderChapterForMode: (chapter, mode, opts) => ({
      html: chapter.originalHtml,
      vocabularyPreview: buildVocabularyPreview(chapter.plainText, opts.vocabularyItems, { resolveMatch: opts.resolveVocabularyMatch })
    }) }),
    settings: { getPreferences: () => ({ uiLanguage: 'en', hasChosenUiLanguage: true }) }
  };
  const createController = () => {
    const store = createR3Store();
    const controller = createR3Controller({ store, adapters, readerRuntime: {
      loadEpubFromFile: async () => ({ book: structuredClone(imported), handle: { destroy() {} } }),
      loadChapterContent: async (_handle, chapter) => chapter
    } });
    return { store, controller };
  };
  const h = { ...createController(), createController, adapters, progress, stored, writes, dictionaryRequests, metadataLookups, profile: () => structuredClone(profile) };
  await h.controller.initialize();
  return h;
}

async function finishMetadata(h) {
  await settle();
  await Promise.all(h.metadataLookups);
  await settle();
}

async function guideVocabulary(h) {
  await h.controller.openGuide();
  h.controller.openReaderContents();
  await h.controller.selectReaderChapter(3);
  assert.equal(h.store.getState().activeChapterId, 'guide-vocabulary');
}

test('Guide demo bubbles, Known/Learning/Hide and stable Preview coexist with optional dictionary lookup', async () => {
  const h = await harness();
  assert.equal(h.store.getState().activeScreen, R3_ROUTES.HOME);
  await guideVocabulary(h);
  const item = h.store.getState().reader.vocabularyItems.find(item => item.term === 'anxious');
  assert.ok(item?.capture);
  assert.equal(item.capture.freeform, true);
  h.controller.toggleVocabularyBubble('anxious');
  await settle();
  assert.equal(h.store.getState().reader.vocabularyBubble.item.chineseMeaning, item.chineseMeaning);
  assert.deepEqual(h.dictionaryRequests, []);
  h.controller.openVocabularyPreview();
  const initial = h.store.getState().reader.vocabularyPreview.rows.map(row => row.term);
  assert.ok(initial.includes('anxious'));
  for (const [choice, field] of [['known', 'knownWords'], ['learning', 'learningWords'], ['hidden', 'ignoredWords']]) {
    await h.controller.setReaderVocabularyState(choice, 'anxious');
    assert.ok(h.profile()[field].includes('anxious'));
    const preview = h.store.getState().reader.vocabularyPreview;
    assert.deepEqual(preview.rows.map(row => row.term), initial);
    assert.equal(preview.rows.find(row => row.term === 'anxious').state, choice);
  }
  assert.deepEqual(h.writes, [['knownWords', 'anxious'], ['learningWords', 'anxious'], ['ignoredWords', 'anxious']]);
  assert.deepEqual([...h.stored.keys()], ['imported-fixture']);
});

test('resolved Guide occurrence gets dynamic metadata without changing capture, identity or profile', async () => {
  const h = await harness();
  await guideVocabulary(h);
  const item = h.store.getState().reader.vocabularyItems.find(item => item.term === 'move');
  assert.ok(item);
  const identity = resolveCapture(item.capture);
  assert.equal(identity.status, 'resolved');
  const before = structuredClone(item);
  h.controller.toggleVocabularyBubble('move');
  await finishMetadata(h);
  const enriched = h.store.getState().reader.vocabularyBubble.item;
  assert.equal(enriched.englishDefinition, 'change position');
  assert.equal(enriched.term, 'move');
  assert.deepEqual(enriched.capture, before.capture);
  assert.deepEqual(resolveCapture(enriched.capture), identity);
  assert.equal(enriched.canonicalTerm, before.canonicalTerm);
  assert.equal(enriched.libraryKey, before.libraryKey);
  assert.deepEqual(h.writes, []);
});

test('closed, replaced, reopened, navigated and mode-switched Guide bubbles reject delayed metadata', async t => {
  for (const action of ['close', 'replace', 'reopen', 'chapter', 'home', 'imported', 'mode', 'preview']) {
    await t.test(action, async () => {
      const gate = deferred();
      const started = deferred();
      const h = await harness({ gate, started });
      await guideVocabulary(h);
      h.controller.toggleVocabularyBubble('move');
      await started.promise;
      if (action === 'close') h.controller.closeVocabularyBubble();
      if (action === 'replace') h.controller.toggleVocabularyBubble('anxious');
      if (action === 'reopen') { h.controller.closeVocabularyBubble(); h.controller.toggleVocabularyBubble('move'); }
      if (action === 'chapter') await h.controller.selectReaderChapter(4);
      if (action === 'home') await h.controller.navigate(R3_ROUTES.HOME);
      if (action === 'imported') await h.controller.selectBook('imported-fixture');
      if (action === 'mode') await h.controller.setReaderMode('chinese');
      if (action === 'preview') h.controller.openVocabularyPreview();
      // Reopening the same term launches a valid new lookup; count only the
      // obsolete result by replacing that lookup with an immediate distinct result.
      if (action === 'reopen') {
        h.controller.closeVocabularyBubble();
        h.adapters.vocabulary.resolveTermMetadata = async () => ({ englishDefinition: 'new bubble', status: 'dictionary' });
        h.controller.toggleVocabularyBubble('move');
        await settle();
      }
      const bubble = structuredClone(h.store.getState().reader.vocabularyBubble);
      gate.resolve();
      await finishMetadata(h);
      assert.deepEqual(h.store.getState().reader.vocabularyBubble, bubble);
    });
  }
});

test('dictionary miss keeps Guide bubble and explicit vocabulary actions usable', async () => {
  const h = await harness({ miss: true });
  await guideVocabulary(h);
  h.controller.toggleVocabularyBubble('move');
  await finishMetadata(h);
  assert.equal(h.store.getState().reader.vocabularyBubble.item.status, 'miss');
  await h.controller.setReaderVocabularyState('known');
  assert.ok(h.profile().knownWords.includes('move'));
});

test('imported book uses canonical dictionary metadata and switches to/from Guide without state leaks', async () => {
  const h = await harness();
  await guideVocabulary(h);
  await h.controller.setReaderMode('cloze-mixed');
  await h.controller.exitReader();
  await h.controller.selectBook('imported-fixture');
  assert.equal(h.store.getState().activeReadingMode, 'english-study');
  assert.equal(h.store.getState().reader.bookTitle, 'Imported fixture');
  const item = h.store.getState().reader.vocabularyItems.find(item => item.term === 'go');
  assert.equal(resolveCapture(item.capture).canonicalTerm, 'go');
  h.controller.toggleVocabularyBubble('go');
  await finishMetadata(h);
  assert.equal(h.store.getState().reader.vocabularyBubble.item.englishDefinition, 'move to another place');
  h.controller.openReaderMode();
  assert.equal(h.store.getState().reader.modeAvailability.find(mode => mode.value === 'chinese').available, false);
  await h.controller.setReaderMode('chinese');
  assert.equal(h.store.getState().activeReadingMode, 'english-study');
  await h.controller.exitReader();
  await h.controller.openGuide();
  assert.equal(h.store.getState().activeBookId, GUIDE_BOOK_KEY);
  assert.equal(h.store.getState().activeReadingMode, 'cloze-mixed');
  assert.equal(h.store.getState().activeChapterId, 'guide-vocabulary');
  assert.equal(h.store.getState().reader.vocabularyBubble, null);
  assert.deepEqual((await h.adapters.books.listBooks()).map(book => book.bookKey), ['imported-fixture']);
});

test('authored Chinese and Mixed Guide variants preserve demo captures and never acquire dictionary authority', async () => {
  const h = await harness();
  await guideVocabulary(h);
  for (const [mode, text] of [['chinese', '不离开故事也能理解词汇'], ['cloze-mixed', '让故事继续']]) {
    await h.controller.setReaderMode(mode);
    const state = h.store.getState();
    assert.ok(state.reader.html.includes(text));
    const item = state.reader.vocabularyItems.find(row => row.term === 'anxious');
    assert.ok(item?.capture.freeform);
    const before = structuredClone(item);
    h.controller.toggleVocabularyBubble('anxious');
    await settle();
    assert.deepEqual(h.store.getState().reader.vocabularyBubble.item, before);
    assert.equal(resolveCapture(item.capture).canonicalTerm, null);
  }
  assert.deepEqual(h.dictionaryRequests, []);
  assert.deepEqual(h.writes, []);
});

test('reload history restores each book with its own mode, chapter and logical anchor', async () => {
  const h = await harness();
  await guideVocabulary(h);
  h.controller.recordReaderPosition({ chapterId: 'guide-vocabulary', textOffset: 35 });
  await h.controller.setReaderMode('chinese');
  await h.controller.exitReader();
  await h.controller.selectBook('imported-fixture');
  await h.controller.selectReaderChapter(1);
  h.controller.recordReaderPosition({ chapterId: 'imported-2', textOffset: 10 });
  await h.controller.flushReaderProgress();
  for (const [bookId, chapterId, mode, offset] of [[GUIDE_BOOK_KEY, 'guide-vocabulary', 'chinese', 35], ['imported-fixture', 'imported-2', 'english-study', 10]]) {
    const { controller, store } = h.createController();
    const windowRef = { history: { state: { interleafR3: { screen: R3_ROUTES.READER, bookId, returnScreen: R3_ROUTES.HOME } }, pushState() {}, replaceState() {} }, addEventListener() {}, removeEventListener() {} };
    const bridge = bindReaderHistory(windowRef, store, controller);
    await controller.initialize();
    await bridge.restoreInitial();
    assert.equal(store.getState().activeBookId, bookId);
    assert.equal(store.getState().activeChapterId, chapterId);
    assert.equal(store.getState().activeReadingMode, mode);
    assert.deepEqual(store.getState().reader.positionRequest.position, { chapterId, textOffset: offset });
    bridge.destroy();
  }
});

test('failed Guide variant render leaves English chapter metadata and progress intact', async () => {
  const h = await harness();
  await guideVocabulary(h);
  const render = h.adapters.modes.renderChapter;
  h.adapters.modes.renderChapter = (chapter, mode, options) => {
    if (mode === 'chinese') throw new Error('render unavailable');
    return render(chapter, mode, options);
  };
  await h.controller.setReaderMode('chinese');
  assert.equal(h.store.getState().activeReadingMode, 'english-study');
  assert.ok(h.store.getState().reader.modeMessage);
  await h.controller.selectReaderChapter(4);
  assert.equal(h.store.getState().reader.chapterTitle, 'Build, Export, and Back Up');
  assert.match(h.store.getState().reader.html, /<h2>Build, Export, and Back Up<\/h2>/);
  await h.controller.flushReaderProgress();
  assert.equal(h.progress.get(GUIDE_BOOK_KEY).currentMode, 'english-study');
});

test('chapter navigation supersedes a delayed Guide mode switch without leaking authored variant metadata', async () => {
  const h = await harness();
  await guideVocabulary(h);
  const gate = deferred();
  const started = deferred();
  const getVocabulary = h.adapters.vocabulary.getReaderVocabulary.bind(h.adapters.vocabulary);
  let delayed = false;
  h.adapters.vocabulary.getReaderVocabulary = async chapter => {
    if (!delayed) { delayed = true; started.resolve(); await gate.promise; }
    return getVocabulary(chapter);
  };
  const changing = h.controller.setReaderMode('chinese');
  await started.promise;
  await h.controller.selectReaderChapter(4);
  gate.resolve();
  await changing;
  assert.equal(h.store.getState().activeReadingMode, 'english-study');
  assert.equal(h.store.getState().reader.chapterTitle, 'Build, Export, and Back Up');
  assert.match(h.store.getState().reader.html, /<h2>Build, Export, and Back Up<\/h2>/);
  assert.equal(h.store.getState().reader.modeSaving, false);
});

test('named Guide resume export reaches progress storage without requiring a receiver', async () => {
  // Node has no IndexedDB. The export must forward to real progress storage,
  // rather than throw on this.openGuide; browser QA verifies the successful path.
  await assert.rejects(() => resumeBook(GUIDE_BOOK_KEY), /IndexedDB is not available/);
});

test('current cache preserves every base precache asset and adds dictionary and R3 runtime dependencies', async () => {
  const assets = source => [...source.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  const base = execFileSync('git', ['show', 'd7f42c0:pwa-reader/sw.js'], { encoding: 'utf8' });
  const current = await readFile(new URL('sw.js', readerRoot), 'utf8');
  const before = assets(base);
  const after = assets(current);
  assert.deepEqual(before.filter(asset => !after.includes(asset)), []);
  assert.ok(after.includes('./dictionaryMetadata.js'));
  for (const asset of after.filter(asset => !before.includes(asset))) {
    assert.match(asset, /^\.\/(?:dictionaryMetadata\.js|readerBookmarks\.js|readerProgress\.js|r3\.html|manifest-r3\.webmanifest|ui-r3\/|adapters\/)/);
  }
  assert.match(current, /CACHE_NAME = 'interleaf-reader-static-v10'/);
  assert.ok(!after.some(asset => asset.includes('data/dictionary/')));
});
