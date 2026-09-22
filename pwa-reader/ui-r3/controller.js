import * as booksAdapter from "../adapters/booksAdapter.js";
import * as modesAdapter from "../adapters/modesAdapter.js";
import * as readerAdapter from "../adapters/readerAdapter.js";
import * as settingsAdapter from "../adapters/settingsAdapter.js";
import * as vocabularyAdapter from "../adapters/vocabularyAdapter.js";
import { normalizeManualVocabularyTerm, VOCABULARY_LEVELS } from "../adapters/vocabularyAdapter.js";
import { loadChapterContent, loadEpubFromFile } from "../epubLoader.js";
import { normalizeTerm } from "../vocabEngine.js";
import { createTranslator, normalizeUiLanguage } from "../i18n.js";
import {
  formatChapterProgress,
  getAdjacentChapterIndex,
  getChapterIndex
} from "../navigationEngine.js";
import { r3Actions } from "./actions.js";
import { R3_OVERLAYS, R3_ROUTES } from "./routes.js";

function createDefaultAdapters() {
  return {
    books: booksAdapter,
    reader: readerAdapter,
    vocabulary: vocabularyAdapter,
    modes: modesAdapter,
    settings: settingsAdapter
  };
}

function allAdaptersReady() {
  return {
    books: true,
    reader: true,
    vocabulary: true,
    modes: true,
    settings: true
  };
}

function getProgressChapterId(progress = {}) {
  return progress.currentChapterId || progress.chapterId || null;
}

function getProgressChapterIndex(progress = {}) {
  if (Number.isInteger(progress.currentChapterIndex)) {
    return progress.currentChapterIndex;
  }

  if (Number.isInteger(progress.chapterIndex)) {
    return progress.chapterIndex;
  }

  return -1;
}

function getSelectionPayload(restoration, store, adapters) {
  const progress = restoration?.progress || {};
  const fallbackMode = store.getState().activeReadingMode;
  const readingMode = adapters.modes.resolveModeFromProgress(progress, fallbackMode);

  return {
    bookId: restoration?.bookKey || restoration?.savedBook?.bookKey || null,
    chapterId: getProgressChapterId(progress),
    chapterIndex: getProgressChapterIndex(progress),
    readingMode
  };
}

function createDefaultReaderRuntime() {
  return {
    loadEpubFromFile,
    loadChapterContent,
    destroyHandle(handle) {
      if (typeof handle?.destroy === "function") {
        handle.destroy();
      }
    }
  };
}

function getFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeScrollMetrics(metrics = {}) {
  return {
    scrollTop: Math.max(0, getFiniteNumber(metrics.scrollTop)),
    scrollHeight: Math.max(0, getFiniteNumber(metrics.scrollHeight)),
    clientHeight: Math.max(0, getFiniteNumber(metrics.clientHeight))
  };
}

function resolveChapterIndex(chapters = [], progress = {}) {
  if (!chapters.length) {
    return -1;
  }

  const progressChapterId = getProgressChapterId(progress);
  const idIndex = getChapterIndex(chapters, progressChapterId);
  if (idIndex !== -1) {
    return idIndex;
  }

  const progressIndex = getProgressChapterIndex(progress);
  if (progressIndex >= 0 && progressIndex < chapters.length) {
    return progressIndex;
  }

  return 0;
}

function getReaderStateFromChapter(activeReader, chapter, chapterIndex, rendered, status = "ready") {
  const chapterCount = activeReader.book?.chapters?.length || 0;

  return {
    status,
    bookTitle: activeReader.book?.title || activeReader.restoration?.savedBook?.title || "",
    chapterTitle: chapter?.title || "",
    html: rendered?.html || "",
    chapterIndex,
    chapterCount,
    progressLabel: formatChapterProgress(activeReader.book?.chapters || [], chapterIndex),
    hasPrevious: getAdjacentChapterIndex(chapterIndex, chapterCount, "previous") !== -1,
    hasNext: getAdjacentChapterIndex(chapterIndex, chapterCount, "next") !== -1,
    error: null
  };
}

function shouldRestoreProgressForChapter(progress = {}, chapterId = "", chapterIndex = -1) {
  if (!progress || progress.scrollRatio === undefined) {
    return false;
  }

  if (progress.currentChapterId) {
    return progress.currentChapterId === chapterId;
  }

  return Number.isInteger(progress.currentChapterIndex) && progress.currentChapterIndex === chapterIndex;
}

function clampScrollTop(scrollTop, metrics = {}) {
  const numericScrollTop = Number(scrollTop);
  if (!Number.isFinite(numericScrollTop)) {
    return null;
  }

  const maxScrollTop = Math.max(0, Number(metrics.scrollHeight) - Number(metrics.clientHeight));
  return Math.min(maxScrollTop, Math.max(0, numericScrollTop));
}

function createSaveSignature(payload = {}) {
  return JSON.stringify({
    bookKey: payload.bookKey || null,
    currentChapterId: payload.currentChapterId || null,
    currentMode: payload.currentMode || null,
    scrollTop: payload.scrollTop || 0,
    scrollHeight: payload.scrollHeight || 0,
    clientHeight: payload.clientHeight || 0,
    overrideScrollRatio: payload.overrides?.scrollRatio ?? null,
    overrideScrollTop: payload.overrides?.scrollTop ?? null
  });
}

async function runControllerOperation(store, operation, callback) {
  store.dispatch(r3Actions.setLoading(true, operation));
  store.dispatch(r3Actions.clearError());

  try {
    return await callback();
  } catch (error) {
    store.dispatch(r3Actions.setError(error));
    return store.getState();
  } finally {
    store.dispatch(r3Actions.setLoading(false));
  }
}

export function createR3Controller(options = {}) {
  const store = options.store;
  if (!store) {
    throw new Error("createR3Controller requires a store.");
  }

  const adapters = {
    ...createDefaultAdapters(),
    ...(options.adapters || {})
  };
  const readerRuntime = {
    ...createDefaultReaderRuntime(),
    ...(options.readerRuntime || {})
  };
  const timerApi = {
    setTimeout: options.timers?.setTimeout || globalThis.setTimeout?.bind(globalThis),
    clearTimeout: options.timers?.clearTimeout || globalThis.clearTimeout?.bind(globalThis)
  };
  const collectVocabularyOccurrences = options.collectVocabularyOccurrences;
  const scrollSaveDelayMs = Number.isFinite(Number(options.scrollSaveDelayMs))
    ? Math.max(0, Number(options.scrollSaveDelayMs))
    : 600;
  let initializePromise = null;
  let activeImportPromise = null;
  let activeReader = null;
  let refreshSequence = 0;
  let readerSequence = 0;
  let vocabularyOperation = null;
  let pendingVocabularyOperations = 0;
  let vocabularyProfileReadSequence = 0;

  function translate(key, params = {}) {
    return createTranslator(store.getState().settings?.uiLanguage)(key, params);
  }

  function setVocabularyFeedback(message = "", tone = "neutral") {
    return store.dispatch(r3Actions.setVocabularyState({
      feedback: { message, tone }
    }));
  }

  function readVocabularyLibraryProfile() {
    const reader = adapters.vocabulary.getLibraryProfile
      || adapters.vocabulary.getVocabularyProfile;
    if (typeof reader !== "function") {
      throw new Error(translate("vocabulary.panel.unavailable"));
    }
    return reader.call(adapters.vocabulary);
  }

  async function refreshVocabularyLibrary(options = {}) {
    const sequence = ++vocabularyProfileReadSequence;
    if (vocabularyOperation) {
      await Promise.resolve(vocabularyOperation).catch(() => null);
    }
    if (sequence !== vocabularyProfileReadSequence) return store.getState();
    if (!options.silent) {
      store.dispatch(r3Actions.setVocabularyState({
        status: "loading",
        feedback: { message: "", tone: "neutral" }
      }));
    }
    try {
      const profile = await readVocabularyLibraryProfile();
      if (sequence !== vocabularyProfileReadSequence) return store.getState();
      return store.dispatch(r3Actions.setVocabularyState({
        status: "ready",
        profile: profile || {},
        busy: false
      }));
    } catch (error) {
      if (sequence !== vocabularyProfileReadSequence) return store.getState();
      return store.dispatch(r3Actions.setVocabularyState({
        status: "error",
        busy: false,
        feedback: {
          message: error?.message || translate("vocabulary.panel.unavailable"),
          tone: "error"
        }
      }));
    }
  }

  function runVocabularyLibraryMutation(mutation, successMessage, options = {}) {
    vocabularyProfileReadSequence += 1;
    const previousOperation = vocabularyOperation;
    pendingVocabularyOperations += 1;
    store.dispatch(r3Actions.setVocabularyState({
      busy: true,
      draft: options.draft ?? store.getState().vocabulary.draft,
      feedback: { message: "", tone: "neutral" }
    }));
    const operation = Promise.resolve(previousOperation)
      .catch(() => null)
      .then(async () => {
        await mutation();
        const sequence = ++vocabularyProfileReadSequence;
        const profile = await readVocabularyLibraryProfile();
        if (sequence !== vocabularyProfileReadSequence) return store.getState();
        return store.dispatch(r3Actions.setVocabularyState({
          status: "ready",
          profile: profile || {},
          draft: options.clearDraft ? "" : store.getState().vocabulary.draft,
          feedback: {
            message: typeof successMessage === "function" ? successMessage() : successMessage,
            tone: "success"
          }
        }));
      })
      .catch(async error => {
        const message = error?.message || translate("vocabulary.manual.feedback.error");
        const sequence = ++vocabularyProfileReadSequence;
        try {
          const profile = await readVocabularyLibraryProfile();
          if (sequence !== vocabularyProfileReadSequence) return store.getState();
          return store.dispatch(r3Actions.setVocabularyState({
            status: "ready",
            profile: profile || {},
            feedback: { message, tone: "error" }
          }));
        } catch (readError) {
          if (sequence !== vocabularyProfileReadSequence) return store.getState();
          return store.dispatch(r3Actions.setVocabularyState({
            status: "error",
            feedback: { message, tone: "error" }
          }));
        }
      });
    vocabularyOperation = operation;
    return operation.finally(() => {
      pendingVocabularyOperations -= 1;
      if (vocabularyOperation === operation) vocabularyOperation = null;
      if (pendingVocabularyOperations === 0) {
        store.dispatch(r3Actions.setVocabularyState({ busy: false }));
      }
    });
  }

  function selectVocabularyTab(tab) {
    if (!["learning", "known", "hidden"].includes(tab)) return store.getState();
    return store.dispatch(r3Actions.setVocabularyState({ activeTab: tab }));
  }

  function addVocabularyLearningTerm(input) {
    const normalized = normalizeManualVocabularyTerm(input);
    if (!normalized.ok) {
      return Promise.resolve(store.dispatch(r3Actions.setVocabularyState({
        draft: String(input ?? ""),
        feedback: {
          message: translate(
            normalized.reason === "too-long"
              ? "vocabulary.manual.feedback.tooLong"
              : "vocabulary.manual.feedback.empty",
            { maxLength: 80 }
          ),
          tone: "error"
        }
      })));
    }
    const profile = store.getState().vocabulary.profile || {};
    const term = normalized.term;
    const hasTerm = field => (profile[field] || []).some(item => normalizeTerm(item) === term);
    if (hasTerm("learningWords")) {
      return Promise.resolve(store.dispatch(r3Actions.setVocabularyState({
        draft: String(input ?? ""),
        feedback: { message: translate("vocabulary.manual.feedback.alreadyLearning"), tone: "neutral" }
      })));
    }
    const messageKey = hasTerm("knownWords") || hasTerm("ignoredWords")
      ? "r3.vocabulary.moved"
      : "vocabulary.manual.feedback.added";
    return runVocabularyLibraryMutation(
      () => typeof adapters.vocabulary.addLibraryLearningTerm === "function"
        ? adapters.vocabulary.addLibraryLearningTerm(term)
        : adapters.vocabulary.setTermState(term, "learning"),
      () => translate(messageKey),
      { draft: String(input ?? ""), clearDraft: true }
    );
  }

  function removeVocabularyTerm(term) {
    const normalized = normalizeManualVocabularyTerm(term);
    if (!normalized.ok) {
      return Promise.resolve(setVocabularyFeedback(
        translate(normalized.reason === "too-long"
          ? "vocabulary.manual.feedback.tooLong"
          : "vocabulary.manual.feedback.empty", { maxLength: 80 }),
        "error"
      ));
    }
    return runVocabularyLibraryMutation(
      () => typeof adapters.vocabulary.removeLibraryTerm === "function"
        ? adapters.vocabulary.removeLibraryTerm(normalized.term)
        : adapters.vocabulary.setTermState(normalized.term, null),
      () => translate("r3.vocabulary.removed")
    );
  }

  function setVocabularyLevel(level) {
    if (!VOCABULARY_LEVELS.includes(level)) {
      return Promise.resolve(setVocabularyFeedback(translate("vocabulary.level.feedback.invalid"), "error"));
    }
    return runVocabularyLibraryMutation(
      () => adapters.vocabulary.setLibraryLevel(level),
      () => translate("r3.vocabulary.levelSaved", { level: level.replace("level", "") })
    );
  }

  async function prepareVocabularyExport(kind) {
    if (vocabularyOperation) await Promise.resolve(vocabularyOperation).catch(() => null);
    const payload = await adapters.vocabulary.createLibraryExport(kind);
    if (!payload?.text) {
      throw new Error(translate("vocabulary.export.feedback.empty"));
    }
    return payload;
  }

  async function prepareVocabularyBackup() {
    if (vocabularyOperation) await Promise.resolve(vocabularyOperation).catch(() => null);
    return adapters.vocabulary.createLibraryBackup();
  }

  function restoreVocabularyBackup(jsonText) {
    return runVocabularyLibraryMutation(
      () => adapters.vocabulary.restoreLibraryBackup(jsonText),
      () => translate("vocabulary.backup.feedback.restored")
    );
  }

  async function renderWithVocabulary(reader, chapter, options = {}) {
    // Vocabulary is optional: failure must leave the original chapter readable.
    let vocabulary = { items: [], profile: {} };
    let vocabularyMessage = "";
    try {
      if (reader.readingMode === "english-study" && adapters.vocabulary.getReaderVocabulary) {
        if (options.waitForVocabularyOperation !== false) {
          await vocabularyOperation;
        }
        vocabulary = await adapters.vocabulary.getReaderVocabulary();
      }
    } catch (error) {
      vocabularyMessage = translate("r3.vocabulary.assistanceUnavailable");
    }
    const rendered = adapters.modes.renderChapter(chapter, reader.readingMode, {
      vocabularyItems: vocabulary.items,
      protectedTerms: [],
      isBuiltInGuide: Boolean(reader.book?.isBuiltInGuide)
    });
    return { rendered, vocabulary, vocabularyMessage };
  }

  function getVocabularyTermState(profile = {}, term = "") {
    const key = normalizeTerm(term);
    if ((profile.knownWords || []).some(word => normalizeTerm(word) === key)) return "known";
    if ((profile.learningWords || []).some(word => normalizeTerm(word) === key)) return "learning";
    if ((profile.ignoredWords || []).some(word => normalizeTerm(word) === key)) return "hidden";
    return null;
  }

  function openVocabularyPreview(occurrencesByTerm = {}) {
    const state = store.getState();
    const chapter = getCurrentReaderChapter();
    if (!activeReader || !chapter || state.reader.status !== "ready") return state;

    const items = adapters.vocabulary.getChapterPreview?.(
      chapter,
      activeReader.vocabularyItems || []
    ) || [];
    const liveTerms = new Set((state.reader.vocabularyItems || []).map(item => normalizeTerm(item.term)));
    store.dispatch(r3Actions.setReaderState({
      vocabularyBubble: null,
      vocabularyPreview: {
        chapterId: chapter.id,
        detailsOpen: false,
        rows: items.map(item => ({
          ...item,
          state: getVocabularyTermState(activeReader.vocabularyProfile, item.term),
          isExpanded: false,
          contextOpen: false,
          occurrences: Array.isArray(occurrencesByTerm[normalizeTerm(item.term)])
            ? occurrencesByTerm[normalizeTerm(item.term)].map(occurrence => ({ ...occurrence }))
            : [],
          hasLiveAnnotation: Array.isArray(occurrencesByTerm[normalizeTerm(item.term)])
            ? occurrencesByTerm[normalizeTerm(item.term)].length > 0
            : liveTerms.has(normalizeTerm(item.term))
        }))
      }
    }));
    return store.dispatch(r3Actions.openOverlay(R3_OVERLAYS.VOCABULARY_PREVIEW));
  }

  function closeVocabularyPreview() {
    const state = store.getState();
    if (state.openOverlay !== R3_OVERLAYS.VOCABULARY_PREVIEW) return state;
    store.dispatch(r3Actions.setReaderState({ vocabularyPreview: null }));
    return store.dispatch(r3Actions.closeOverlay());
  }

  function updateVocabularyPreview(updater) {
    const state = store.getState();
    const preview = state.reader.vocabularyPreview;
    if (state.openOverlay !== R3_OVERLAYS.VOCABULARY_PREVIEW || !preview) return state;
    return store.dispatch(r3Actions.setReaderState({ vocabularyPreview: updater(preview) }));
  }

  function toggleVocabularyPreviewRow(term) {
    const key = normalizeTerm(term);
    return updateVocabularyPreview(preview => preview.detailsOpen ? preview : ({
      ...preview,
      rows: preview.rows.map(row => normalizeTerm(row.term) === key
        ? { ...row, isExpanded: !row.isExpanded, contextOpen: row.isExpanded ? false : row.contextOpen }
        : row)
    }));
  }

  function toggleVocabularyPreviewDetails(nextOpen) {
    return updateVocabularyPreview(preview => {
      const detailsOpen = typeof nextOpen === "boolean" ? nextOpen : !preview.detailsOpen;
      return {
        ...preview,
        detailsOpen,
        rows: detailsOpen
          ? preview.rows
          : preview.rows.map(row => ({ ...row, isExpanded: false, contextOpen: false }))
      };
    });
  }

  function toggleVocabularyPreviewContext(term) {
    const key = normalizeTerm(term);
    return updateVocabularyPreview(preview => ({
      ...preview,
      rows: preview.rows.map(row => normalizeTerm(row.term) === key
        ? { ...row, contextOpen: !row.contextOpen }
        : row)
    }));
  }

  function goToVocabularyPreviewOccurrence(term, occurrenceIndex = 0) {
    const state = store.getState();
    const key = normalizeTerm(term);
    const row = state.reader.vocabularyPreview?.rows?.find(item => normalizeTerm(item.term) === key);
    const index = Number(occurrenceIndex);
    const hasOccurrence = Array.isArray(row?.occurrences)
      ? row.occurrences.some(occurrence => Number(occurrence.occurrenceIndex) === index)
      : row?.hasLiveAnnotation && index === 0;
    if (state.openOverlay !== R3_OVERLAYS.VOCABULARY_PREVIEW || !hasOccurrence) return false;
    closeVocabularyPreview();
    return true;
  }

  function goToVocabularyPreviewTerm(term) {
    return goToVocabularyPreviewOccurrence(term, 0);
  }

  function closeVocabularyBubble() {
    if (!store.getState().reader.vocabularyBubble) return store.getState();
    return store.dispatch(r3Actions.setReaderState({ vocabularyBubble: null }));
  }

  function toggleVocabularyBubble(term, anchor = {}) {
    const state = store.getState();
    const key = normalizeTerm(term);
    if (!activeReader || state.reader.status !== "ready" || state.openOverlay) return state;
    const item = adapters.vocabulary.getTermMetadata?.(key, state.reader.vocabularyItems || []);
    if (!item) return state;
    if (state.reader.vocabularyBubble?.term === key) return closeVocabularyBubble();
    return store.dispatch(r3Actions.setReaderState({
      vocabularyBubble: { term: key, item, x: getFiniteNumber(anchor.x), y: getFiniteNumber(anchor.y) }
    }));
  }

  async function setReaderVocabularyState(nextState, requestedTerm = null) {
    const state = store.getState();
    const bubble = state.reader.vocabularyBubble;
    const preview = state.openOverlay === R3_OVERLAYS.VOCABULARY_PREVIEW
      ? state.reader.vocabularyPreview
      : null;
    const term = normalizeTerm(requestedTerm || bubble?.term);
    const previewRow = preview?.rows?.find(item => normalizeTerm(item.term) === term);
    const isSelectionSave = nextState === "learning" && Boolean(requestedTerm) && Boolean(term);
    if (!activeReader || (!bubble && !previewRow && !isSelectionSave) || !["known", "learning", "hidden"].includes(nextState)) return state;
    const reader = activeReader;
    const sequence = readerSequence;
    const chapter = getCurrentReaderChapter(reader);
    const previousOperation = vocabularyOperation;
    pendingVocabularyOperations += 1;
    store.dispatch(r3Actions.setReaderState({ vocabularySaving: true, vocabularyMessage: "" }));
    // Serialize the write and its Reader refresh so an older snapshot cannot apply last.
    const operation = Promise.resolve(previousOperation)
      .catch(() => null)
      .then(async () => {
        try {
          await adapters.vocabulary.setTermState(term, nextState);
        } catch (error) {
          if (activeReader === reader && sequence === readerSequence) {
            store.dispatch(r3Actions.setReaderState({
              vocabularyMessage: translate("r3.vocabulary.choiceError")
            }));
          }
          return store.getState();
        }
        if (activeReader !== reader || sequence !== readerSequence) return store.getState();
        const result = await renderWithVocabulary(reader, chapter, { waitForVocabularyOperation: false });
        if (activeReader !== reader || sequence !== readerSequence) return store.getState();
        reader.vocabularyProfile = result.vocabulary.profile;
        reader.vocabularyItems = result.vocabulary.items;
        const currentBubble = store.getState().reader.vocabularyBubble;
        const items = result.rendered.vocabularyPreview || [];
        store.dispatch(r3Actions.setReaderState({
          html: result.rendered.html,
          vocabularyItems: items,
          learningWords: result.vocabulary.profile.learningWords || [],
          vocabularyMessage: result.vocabularyMessage,
          vocabularyBubble: currentBubble && items.some(item => normalizeTerm(item.term) === currentBubble.term) ? currentBubble : null
        }));
        let occurrencesByTerm = {};
        try {
          occurrencesByTerm = collectVocabularyOccurrences?.() || {};
        } catch (error) {
          occurrencesByTerm = {};
        }
        const currentPreview = store.getState().reader.vocabularyPreview;
        const vocabularyPreview = currentPreview?.chapterId === chapter?.id
          ? {
              ...currentPreview,
              rows: currentPreview.rows.map(item => {
                const itemTerm = normalizeTerm(item.term);
                const occurrences = Array.isArray(occurrencesByTerm[itemTerm])
                  ? occurrencesByTerm[itemTerm].map(occurrence => ({ ...occurrence }))
                  : [];
                return {
                  ...item,
                  state: itemTerm === term ? nextState : item.state,
                  occurrences,
                  contextOpen: occurrences.length ? item.contextOpen : false,
                  hasLiveAnnotation: occurrences.length > 0
                };
              })
            }
          : currentPreview;
        return store.dispatch(r3Actions.setReaderState({
          vocabularyPreview
        }));
      });
    vocabularyOperation = operation;

    try {
      return await operation;
    } finally {
      pendingVocabularyOperations -= 1;
      if (vocabularyOperation === operation) {
        vocabularyOperation = null;
      }
      if (pendingVocabularyOperations === 0) {
        store.dispatch(r3Actions.setReaderState({ vocabularySaving: false }));
      }
    }
  }

  function clearPendingScrollSave(reader = activeReader) {
    if (!reader?.pendingScrollTimer) {
      return;
    }

    timerApi.clearTimeout?.(reader.pendingScrollTimer);
    reader.pendingScrollTimer = null;
  }

  function getCurrentReaderChapter(reader = activeReader) {
    const chapters = reader?.book?.chapters || [];
    return chapters[reader?.currentIndex] || null;
  }

  function captureValidReaderState(reader = activeReader) {
    const state = store.getState();
    if (
      reader
      && state.reader?.status === "ready"
      && state.activeChapterId === reader.renderedChapterId
      && state.activeChapterIndex === reader.renderedChapterIndex
      && state.reader.chapterIndex === reader.renderedChapterIndex
    ) {
      reader.lastValidReaderState = state.reader;
    }

    return reader?.lastValidReaderState || null;
  }

  function buildReaderToc(reader = activeReader) {
    const chapters = reader?.book?.chapters || [];
    const currentChapter = getCurrentReaderChapter(reader);
    const currentChapterId = currentChapter?.id || null;
    const rawToc = typeof adapters.reader.getTableOfContents === "function"
      ? adapters.reader.getTableOfContents(reader?.book || {}, currentChapterId || "")
      : chapters.map((chapter, index) => ({
          id: chapter.id,
          title: chapter.title,
          index,
          isCurrent: chapter.id === currentChapterId
        }));

    return (Array.isArray(rawToc) ? rawToc : []).map((item = {}, fallbackIndex) => {
      const index = Number.isInteger(item.index) ? item.index : fallbackIndex;
      const chapter = chapters[index] || null;
      const id = typeof item.id === "string" ? item.id : chapter?.id || "";
      const title = item.title || chapter?.title || translate("r3.reader.chapterFallback", { number: index + 1 });
      const isReadable = Boolean(chapter && id && chapter.id === id);

      return {
        id,
        title,
        index,
        isCurrent: Boolean(item.isCurrent || id === currentChapterId),
        isReadable
      };
    });
  }

  function buildProgressSavePayload(reader = activeReader) {
    const chapter = getCurrentReaderChapter(reader);
    if (!reader?.bookKey || !chapter?.id || typeof adapters.reader.savePosition !== "function") {
      return null;
    }

    if (reader.renderedChapterId !== chapter.id || reader.renderedChapterIndex !== reader.currentIndex) {
      return null;
    }

    const metrics = normalizeScrollMetrics(reader.scrollMetrics);
    const payload = {
      bookKey: reader.bookKey,
      chapters: reader.book?.chapters || [],
      currentChapterId: chapter.id,
      currentMode: reader.readingMode,
      ...metrics
    };

    const pendingRestore = reader.pendingScrollRestore;
    if (pendingRestore && !pendingRestore.userScrolled && pendingRestore.progress?.scrollRatio !== undefined) {
      payload.overrides = {
        scrollRatio: pendingRestore.progress.scrollRatio,
        scrollTop: pendingRestore.progress.scrollTop ?? metrics.scrollTop
      };
    }

    return payload;
  }

  function runLatestProgressSave(reader) {
    if (!reader || reader.saveInFlight) {
      return reader?.saveInFlight || Promise.resolve(null);
    }

    const pendingSave = reader.pendingSave;
    if (!pendingSave || pendingSave.version === reader.lastStartedSaveVersion) {
      return Promise.resolve(null);
    }

    reader.lastStartedSaveVersion = pendingSave.version;
    reader.inFlightSaveSignature = pendingSave.signature;
    reader.saveInFlight = Promise.resolve()
      .then(() => adapters.reader.savePosition(pendingSave.payload))
      .then((result) => {
        reader.lastCompletedSaveSignature = pendingSave.signature;
        return result;
      })
      .catch((error) => {
        console.warn("R3 Reader progress save failed.", error);
        return null;
      })
      .finally(() => {
        if (reader.inFlightSaveSignature === pendingSave.signature) {
          reader.inFlightSaveSignature = null;
        }
        reader.saveInFlight = null;

        if (reader.pendingSave && reader.pendingSave.version > reader.lastStartedSaveVersion) {
          return runLatestProgressSave(reader);
        }

        return null;
      });

    return reader.saveInFlight;
  }

  function queueProgressSave(reader = activeReader) {
    const payload = buildProgressSavePayload(reader);
    if (!payload) {
      return Promise.resolve(null);
    }

    const signature = createSaveSignature(payload);
    if (
      signature === reader.pendingSave?.signature
      || signature === reader.inFlightSaveSignature
      || signature === reader.lastCompletedSaveSignature
    ) {
      return reader.saveInFlight || Promise.resolve(null);
    }

    reader.saveVersion = (reader.saveVersion || 0) + 1;
    reader.pendingSave = {
      version: reader.saveVersion,
      signature,
      payload
    };

    return runLatestProgressSave(reader);
  }

  async function flushReaderProgress(reader = activeReader) {
    if (!reader) {
      return store.getState();
    }

    clearPendingScrollSave(reader);
    await queueProgressSave(reader);
    return store.getState();
  }

  function cleanupReaderRuntime() {
    const reader = activeReader;
    activeReader = null;
    readerSequence += 1;
    clearPendingScrollSave(reader);

    if (!reader?.handle) {
      return;
    }

    try {
      readerRuntime.destroyHandle(reader.handle);
    } catch (error) {
      console.warn("R3 Reader EPUB cleanup failed.", error);
    }
  }

  async function renderReaderChapter(chapterIndex) {
    const reader = activeReader;
    if (!reader) {
      return store.getState();
    }

    const chapters = reader.book?.chapters || [];
    if (chapterIndex < 0 || chapterIndex >= chapters.length) {
      return store.getState();
    }

    if (store.getState().openOverlay === R3_OVERLAYS.VOCABULARY_PREVIEW) {
      store.dispatch(r3Actions.closeOverlay());
    }

    const sequence = ++readerSequence;
    const chapter = chapters[chapterIndex];
    const previousReaderState = captureValidReaderState(reader);
    await flushReaderProgress(reader);
    if (sequence !== readerSequence || activeReader !== reader) {
      return store.getState();
    }

    store.dispatch(r3Actions.setReaderState({
      status: "loading",
      vocabularyBubble: null,
      vocabularyPreview: null,
      vocabularyItems: [],
      vocabularyMessage: "",
      bookTitle: reader.book?.title || reader.restoration?.savedBook?.title || translate("r3.common.untitledBook"),
      chapterTitle: chapter.title || "",
      html: "",
      chapterIndex,
      chapterCount: chapters.length,
      progressLabel: formatChapterProgress(chapters, chapterIndex),
      hasPrevious: getAdjacentChapterIndex(chapterIndex, chapters.length, "previous") !== -1,
      hasNext: getAdjacentChapterIndex(chapterIndex, chapters.length, "next") !== -1,
      error: null
    }));

    try {
      const loadedChapter = await readerRuntime.loadChapterContent(reader.handle, chapter);
      if (sequence !== readerSequence || activeReader !== reader) {
        return store.getState();
      }

      reader.book.chapters = chapters.map((entry, index) => {
        return index === chapterIndex ? loadedChapter : entry;
      });
      reader.currentIndex = chapterIndex;
      reader.renderedChapterId = loadedChapter.id;
      reader.renderedChapterIndex = chapterIndex;
      reader.scrollMetrics = normalizeScrollMetrics();
      reader.pendingScrollRestore = shouldRestoreProgressForChapter(
        reader.restoration?.progress,
        loadedChapter.id,
        chapterIndex
      )
        ? {
            progress: reader.restoration.progress,
            chapterId: loadedChapter.id,
            chapterIndex,
            applied: false,
            targetTop: null,
            userScrolled: false
          }
        : null;

      const { rendered, vocabulary, vocabularyMessage } = await renderWithVocabulary(reader, loadedChapter);
      if (sequence !== readerSequence || activeReader !== reader) return store.getState();
      reader.vocabularyProfile = vocabulary.profile;
      reader.vocabularyItems = vocabulary.items;

      const currentState = store.getState();
      const shouldUpdateToc = currentState.openOverlay === R3_OVERLAYS.CONTENTS
        || currentState.reader?.toc?.length > 0;

      store.dispatch(r3Actions.setActiveChapter(loadedChapter.id, chapterIndex));
      const nextState = store.dispatch(r3Actions.setReaderState(
        {
          ...getReaderStateFromChapter(reader, loadedChapter, chapterIndex, rendered),
          vocabularyItems: rendered.vocabularyPreview || [],
          learningWords: vocabulary.profile.learningWords || [],
          vocabularyMessage,
          vocabularyBubble: null,
          vocabularyPreview: null,
          toc: shouldUpdateToc ? buildReaderToc(reader) : []
        }
      ));
      reader.lastValidReaderState = nextState.reader;
      queueProgressSave(reader);
      return nextState;
    } catch (error) {
      if (sequence !== readerSequence || activeReader !== reader) {
        return store.getState();
      }

      store.dispatch(r3Actions.setError(error));
      return store.dispatch(r3Actions.setReaderState({
        ...(previousReaderState || {}),
        status: "error",
        html: previousReaderState?.html || "",
        error
      }));
    }
  }

  async function openReaderFromRestoration(restoration) {
    await flushReaderProgress();
    cleanupReaderRuntime();

    if (!restoration?.file) {
      throw new Error(translate("r3.reader.savedMissing"));
    }

    const selection = getSelectionPayload(restoration, store, adapters);
    const readingMode = selection.readingMode;
    store.dispatch(r3Actions.setActiveBook({
      ...selection,
      chapterId: null,
      chapterIndex: -1
    }));
    store.dispatch(r3Actions.setReaderState({
      status: "loading",
      bookTitle: restoration.savedBook?.title || translate("r3.common.untitledBook"),
      chapterTitle: "",
      html: "",
      chapterIndex: -1,
      chapterCount: 0,
      progressLabel: translate("reader.status.chapterLoading"),
      hasPrevious: false,
      hasNext: false,
      error: null
    }));

    let loaded;
    try {
      loaded = await readerRuntime.loadEpubFromFile(restoration.file);
    } catch (error) {
      store.dispatch(r3Actions.setReaderState({
        status: "error",
        html: "",
        progressLabel: translate("reader.empty.noChapter"),
        hasPrevious: false,
        hasNext: false,
        error
      }));
      throw error;
    }

    const book = {
      ...(restoration.savedBook || {}),
      ...(loaded.book || {}),
      chapters: loaded.book?.chapters || restoration.savedBook?.chapters || []
    };
    const chapterIndex = resolveChapterIndex(book.chapters, restoration.progress);

    activeReader = {
      bookKey: selection.bookId,
      restoration: {
        bookKey: restoration.bookKey,
        savedBook: restoration.savedBook,
        progress: restoration.progress
      },
      handle: loaded.handle,
      book,
      currentIndex: chapterIndex,
      renderedChapterId: null,
      renderedChapterIndex: -1,
      readingMode,
      scrollMetrics: normalizeScrollMetrics(),
      pendingScrollTimer: null,
      pendingScrollRestore: null,
      saveVersion: 0,
      lastStartedSaveVersion: 0,
      lastCompletedSaveSignature: null,
      inFlightSaveSignature: null,
      pendingSave: null,
      saveInFlight: null,
      lastValidReaderState: null
    };

    store.dispatch(r3Actions.setActiveBook({
      bookId: selection.bookId,
      chapterId: book.chapters[chapterIndex]?.id || null,
      chapterIndex,
      readingMode
    }));
    store.dispatch(r3Actions.navigate(R3_ROUTES.READER));
    return renderReaderChapter(chapterIndex);
  }

  async function refreshShellData(options = {}) {
    const sequence = ++refreshSequence;
    const operation = options.operation || "shell.refresh";
    const load = async () => {
      const [books, continueReading] = await Promise.all([
        adapters.books.listBooks(),
        adapters.books.getContinueReading()
      ]);

      if (sequence !== refreshSequence) {
        return store.getState();
      }

      return store.dispatch(r3Actions.setShellData({ books, continueReading }));
    };

    if (options.silent) {
      return load();
    }

    return runControllerOperation(store, operation, load);
  }

  async function loadBooks() {
    return refreshShellData({ operation: "books.load" });
  }

  async function initialize() {
    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = runControllerOperation(store, "app.initialize", async () => {
      const [books, continueReading] = await Promise.all([
        adapters.books.listBooks(),
        adapters.books.getContinueReading()
      ]);
      adapters.modes.getModeConstants();
      const preferences = await Promise.resolve(adapters.settings.getPreferences());

      store.dispatch(r3Actions.setAdapterStatus(allAdaptersReady()));
      store.dispatch(r3Actions.setSettingsState({
        status: "ready",
        uiLanguage: normalizeUiLanguage(preferences?.uiLanguage),
        hasChosenUiLanguage: preferences?.hasChosenUiLanguage === true,
        busy: false,
        error: null
      }));
      store.dispatch(r3Actions.setShellData({ books, continueReading }));
      return store.dispatch(r3Actions.appInitialized({ adapterStatus: allAdaptersReady() }));
    });

    return initializePromise;
  }

  async function selectBook(bookKey) {
    return runControllerOperation(store, "reader.openBook", async () => {
      const restoration = await adapters.reader.openBook(bookKey);
      return openReaderFromRestoration(restoration);
    });
  }

  async function resumeBook(bookKey = null) {
    return runControllerOperation(store, "reader.resumeBook", async () => {
      const restoration = await adapters.reader.resumeBook(bookKey);
      return openReaderFromRestoration(restoration);
    });
  }

  async function importBook(file) {
    if (!file) {
      return store.getState();
    }

    if (activeImportPromise) {
      return activeImportPromise;
    }

    activeImportPromise = (async () => {
      store.dispatch(r3Actions.setLoading(true, "book.import"));
      store.dispatch(r3Actions.clearError());
      store.dispatch(r3Actions.setImportStatus({
        isImporting: true,
        fileName: file.name || "EPUB",
        error: null
      }));

      try {
        const result = await adapters.books.importBook(file);
        await refreshShellData({ operation: "shell.refreshAfterImport", silent: true });
        return store.dispatch(r3Actions.setImportStatus({
          isImporting: false,
          fileName: null,
          lastImportedBookKey: result?.storedMetadata?.bookKey || result?.book?.bookKey || null,
          error: null
        }));
      } catch (error) {
        store.dispatch(r3Actions.setImportStatus({
          isImporting: false,
          fileName: null,
          error
        }));
        store.dispatch(r3Actions.setError(error));
        return store.getState();
      } finally {
        store.dispatch(r3Actions.setLoading(false));
        activeImportPromise = null;
      }
    })();

    return activeImportPromise;
  }

  function recordReaderScroll(metrics = {}) {
    const reader = activeReader;
    if (!reader) {
      return store.getState();
    }

    const normalizedMetrics = normalizeScrollMetrics(metrics);
    reader.scrollMetrics = normalizedMetrics;

    const pendingRestore = reader.pendingScrollRestore;
    if (pendingRestore?.applied) {
      const targetTop = Number(pendingRestore.targetTop);
      if (!Number.isFinite(targetTop) || Math.abs(normalizedMetrics.scrollTop - targetTop) > 2) {
        pendingRestore.userScrolled = true;
      }
    }

    clearPendingScrollSave(reader);
    reader.pendingScrollTimer = timerApi.setTimeout?.(() => {
      reader.pendingScrollTimer = null;
      queueProgressSave(reader);
    }, scrollSaveDelayMs);

    return store.getState();
  }

  function applyReaderScrollRestoration(scrollElement) {
    const reader = activeReader;
    const pendingRestore = reader?.pendingScrollRestore;
    if (!reader || !pendingRestore || pendingRestore.userScrolled || !scrollElement) {
      return false;
    }

    const chapter = getCurrentReaderChapter(reader);
    if (!chapter?.id || chapter.id !== pendingRestore.chapterId) {
      return false;
    }

    const metrics = normalizeScrollMetrics(scrollElement);
    if (metrics.scrollHeight <= 0 || metrics.clientHeight <= 0) {
      return false;
    }

    const restoreRatio = Number(pendingRestore.progress?.scrollRatio);
    if (!Number.isFinite(restoreRatio)) {
      pendingRestore.userScrolled = true;
      return false;
    }

    if (Math.max(0, metrics.scrollHeight - metrics.clientHeight) <= 0 && restoreRatio > 0) {
      return false;
    }

    let targetTop = pendingRestore.targetTop;
    if (targetTop === null || targetTop === undefined) {
      const restoredTop = adapters.reader.restorePosition?.(
        pendingRestore.progress,
        pendingRestore.chapterId,
        metrics
      );
      targetTop = clampScrollTop(restoredTop, metrics);
    } else {
      targetTop = clampScrollTop(targetTop, metrics);
    }

    if (targetTop === null) {
      pendingRestore.userScrolled = true;
      return false;
    }

    if (pendingRestore.applied && Math.abs(metrics.scrollTop - targetTop) <= 2) {
      return false;
    }

    if (pendingRestore.applied && metrics.scrollTop > 0) {
      return false;
    }

    scrollElement.scrollTop = targetTop;
    reader.scrollMetrics = {
      ...metrics,
      scrollTop: targetTop
    };
    pendingRestore.applied = true;
    pendingRestore.targetTop = targetTop;
    return true;
  }

  function openReaderContents() {
    if (!activeReader) {
      return store.getState();
    }

    store.dispatch(r3Actions.setReaderState({
      vocabularyBubble: null,
      toc: buildReaderToc(activeReader)
    }));
    return store.dispatch(r3Actions.openOverlay(R3_OVERLAYS.CONTENTS));
  }

  async function selectReaderChapter(chapterIndex) {
    const reader = activeReader;
    if (!reader || !Number.isInteger(chapterIndex)) {
      return store.getState();
    }

    const tocItem = buildReaderToc(reader).find((item) => item.index === chapterIndex);
    if (!tocItem?.isReadable) {
      return store.getState();
    }

    const stateAfterRender = await renderReaderChapter(chapterIndex);
    const currentState = store.getState();
    if (
      activeReader === reader
      && currentState.reader?.status === "ready"
      && currentState.activeChapterIndex === chapterIndex
      && stateAfterRender.reader?.status === "ready"
    ) {
      return store.dispatch(r3Actions.closeOverlay());
    }

    return store.getState();
  }

  return {
    initialize,
    loadBooks,
    refreshShellData,
    importBook,
    selectBook,
    resumeBook,
    async goToReaderChapter(direction) {
      if (!activeReader) {
        return store.getState();
      }

      const chapters = activeReader.book?.chapters || [];
      const targetIndex = getAdjacentChapterIndex(activeReader.currentIndex, chapters.length, direction);
      if (targetIndex === -1) {
        return store.getState();
      }

      return renderReaderChapter(targetIndex);
    },

    async exitReader() {
      await flushReaderProgress();
      cleanupReaderRuntime();
      store.dispatch(r3Actions.clearReader());
      store.dispatch(r3Actions.navigate(R3_ROUTES.HOME));
      await refreshShellData({ operation: "shell.refreshAfterReaderExit", silent: true });
      return store.getState();
    },

    async navigate(screen) {
      if (
        store.getState().activeScreen === R3_ROUTES.VOCABULARY
        && screen !== R3_ROUTES.VOCABULARY
      ) {
        setVocabularyFeedback();
      }
      if (screen !== R3_ROUTES.READER && activeReader) {
        await flushReaderProgress();
        cleanupReaderRuntime();
        store.dispatch(r3Actions.clearReader());
        store.dispatch(r3Actions.navigate(screen));
        await refreshShellData({ operation: "shell.refreshAfterReaderExit", silent: true });
        if (screen === R3_ROUTES.VOCABULARY) {
          await refreshVocabularyLibrary();
        }
        return store.getState();
      }
      store.dispatch(r3Actions.navigate(screen));
      if (screen === R3_ROUTES.VOCABULARY) {
        await refreshVocabularyLibrary();
      }
      return store.getState();
    },

    recordReaderScroll,
    applyReaderScrollRestoration,
    flushReaderProgress,
    openReaderContents,
    selectReaderChapter,
    openVocabularyPreview,
    closeVocabularyPreview,
    toggleVocabularyPreviewRow,
    toggleVocabularyPreviewDetails,
    toggleVocabularyPreviewContext,
    goToVocabularyPreviewOccurrence,
    goToVocabularyPreviewTerm,
    toggleVocabularyBubble,
    closeVocabularyBubble,
    setReaderVocabularyState,
    refreshVocabularyLibrary,
    selectVocabularyTab,
    addVocabularyLearningTerm,
    removeVocabularyTerm,
    setVocabularyLevel,
    prepareVocabularyExport,
    prepareVocabularyBackup,
    restoreVocabularyBackup,
    setVocabularyFeedback,

    async setUiLanguage(language) {
      const normalizedLanguage = normalizeUiLanguage(language);
      store.dispatch(r3Actions.setSettingsState({ busy: true, error: null }));
      try {
        const preferences = await Promise.resolve(adapters.settings.setUiLanguage(normalizedLanguage));
        store.dispatch(r3Actions.setSettingsState({
          status: "ready",
          uiLanguage: normalizeUiLanguage(preferences?.uiLanguage || normalizedLanguage),
          hasChosenUiLanguage: preferences?.hasChosenUiLanguage === true,
          busy: false,
          error: null
        }));
        setVocabularyFeedback();
        if (store.getState().reader?.vocabularyMessage) {
          store.dispatch(r3Actions.setReaderState({ vocabularyMessage: "" }));
        }
        return store.getState();
      } catch (error) {
        return store.dispatch(r3Actions.setSettingsState({
          busy: false,
          error: new Error(translate("r3.settings.languageError"))
        }));
      }
    },

    getTranslation(key, params = {}) {
      return translate(key, params);
    },

    setActiveChapter(chapterId, chapterIndex = -1) {
      return store.dispatch(r3Actions.setActiveChapter(chapterId, chapterIndex));
    },

    setActiveMode(mode) {
      return store.dispatch(r3Actions.setActiveMode(mode));
    },

    openOverlay(overlay) {
      return store.dispatch(r3Actions.openOverlay(overlay));
    },

    closeOverlay() {
      return store.dispatch(r3Actions.closeOverlay());
    },

    setLoading(isLoading, operation = null) {
      return store.dispatch(r3Actions.setLoading(isLoading, operation));
    },

    setError(error) {
      return store.dispatch(r3Actions.setError(error));
    },

    clearError() {
      return store.dispatch(r3Actions.clearError());
    }
  };
}
