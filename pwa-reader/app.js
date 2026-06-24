import { loadEpubFromFile, loadChapterContent } from "./epubLoader.js";
import {
  createVocabularyIndex,
  loadVocabularyData,
  normalizeTerm,
  renderVocabularyPreviewItem
} from "./vocabEngine.js";
import { buildBookGlossary, normalizeGlossaryTerm } from "./glossaryEngine.js";
import {
  formatChapterProgress,
  getAdjacentChapterIndex,
  getChapterIndex,
  normalizeChapterList
} from "./navigationEngine.js";
import { MODES, renderChapterForMode } from "./readingModes.js";
import { loadProtectedTerms } from "./translationEngine.js";
import {
  DEFAULT_UI_LANGUAGE,
  detectPreferredUiLanguage,
  getFirstRunLanguageChoiceState,
  getTranslation,
  normalizeUiLanguage
} from "./i18n.js";
import {
  GUIDE_BOOK_KEY,
  createGuideBook,
  createGuideLibraryItem,
  isGuideBookKey,
  syncGuideBookForReadingMode
} from "./guideBook.js";
import {
  calculateScrollRatio,
  calculateScrollTopFromRatio,
  deleteStoredBook,
  formatSavedBookProgressLabel,
  getAppPreferences,
  getMostRecentStoredBook,
  getReadingProgress,
  getStoredBook,
  listSavedBooks,
  resolveProgressChapterId,
  saveReadingProgress,
  shouldRestoreScrollForProgress,
  saveStoredBook,
  setGuideVisibilityPreference,
  setUiLanguagePreference,
  storage
} from "./storage.js";

export const HOME_ENTRY_COPY = Object.freeze({
  resumeTitle: "Resume current session",
  resumeHint: "Back to your open reader. No reload needed.",
  resumeAction: "Resume",
  continueReadingHint: "Restore your most recently saved local book.",
  localLibraryHint: "Saved in this browser on this device.",
  libraryEmptyState: "No saved books yet. Import an EPUB to start your local library.",
  libraryOpenAction: "Open"
});

export const VOCABULARY_LEVEL_OPTIONS = Object.freeze([
  { value: "level1", label: "Level 1" },
  { value: "level2", label: "Level 2" },
  { value: "level3", label: "Level 3" },
  { value: "level4", label: "Level 4" },
  { value: "level5", label: "Level 5" }
]);

export const VOCABULARY_LEVEL_HELP_TEXT =
  "Vocabulary Level controls which basic words are treated as already known. Changing the level changes which words may be filtered from Vocabulary Preview. It is not a test score, not a full dictionary completeness level, and can be changed anytime.";

const DEFAULT_VOCABULARY_LEVEL = "level3";
const VOCABULARY_LEVEL_VALUES = new Set(VOCABULARY_LEVEL_OPTIONS.map((option) => option.value));

export function formatVocabularyLevelDisplay(selectedLevel) {
  const normalizedLevel = VOCABULARY_LEVEL_VALUES.has(selectedLevel)
    ? selectedLevel
    : DEFAULT_VOCABULARY_LEVEL;
  const option = VOCABULARY_LEVEL_OPTIONS.find((levelOption) => levelOption.value === normalizedLevel);
  return option?.label || "-";
}

export function shouldShowReturnToReader(appState = {}) {
  return Boolean(appState.book);
}

export function shouldShowContinueReading(savedBooks = [], options = {}) {
  return Array.isArray(savedBooks) &&
    savedBooks.length > 0 &&
    !options.hasInMemoryBook &&
    !options.isContinueReadingDismissed;
}

export function shouldShowLibraryEmptyState(savedBooks = [], options = {}) {
  const includeBuiltInGuide = options.includeBuiltInGuide !== false;
  return !includeBuiltInGuide && (!Array.isArray(savedBooks) || savedBooks.length === 0);
}

export function getLocalLibraryViewState(savedBooks = [], options = {}) {
  const normalizedSavedBooks = Array.isArray(savedBooks) ? savedBooks.filter(Boolean) : [];
  const includeBuiltInGuide = options.includeBuiltInGuide !== false;
  const items = includeBuiltInGuide
    ? [createGuideLibraryItem(), ...normalizedSavedBooks]
    : normalizedSavedBooks;

  return {
    items,
    hasUserBooks: normalizedSavedBooks.length > 0,
    hasVisibleItems: items.length > 0,
    showEmptyState: shouldShowLibraryEmptyState(normalizedSavedBooks, { includeBuiltInGuide }),
    emptyText: HOME_ENTRY_COPY.libraryEmptyState
  };
}

export function getHomeEntryState(appState = {}, savedBooks = [], options = {}) {
  const normalizedSavedBooks = Array.isArray(savedBooks) ? savedBooks.filter(Boolean) : [];
  const showResumeCurrentSession = shouldShowReturnToReader(appState);
  const showContinueReading = shouldShowContinueReading(normalizedSavedBooks, {
    ...options,
    hasInMemoryBook: showResumeCurrentSession
  });

  const libraryState = getLocalLibraryViewState(normalizedSavedBooks);

  return {
    primaryAction: showResumeCurrentSession
      ? "resume-current-session"
      : showContinueReading
        ? "continue-reading"
        : null,
    showReturnToReader: showResumeCurrentSession,
    showResumeCurrentSession,
    showContinueReading,
    showLibraryEmptyState: libraryState.showEmptyState,
    showLibraryItems: libraryState.hasVisibleItems,
    savedBookCount: normalizedSavedBooks.length
  };
}

export function formatReturnToReaderSubtext(book, progressText = "No chapter loaded", translate = null) {
  const translateText = typeof translate === "function" ? translate : null;
  const fallbackTitle = translateText ? translateText("home.returnToReader.currentBook") : "Current book";
  const fallbackProgress = translateText ? translateText("reader.empty.noChapter") : "No chapter loaded";
  return `${book?.title || fallbackTitle} · ${progressText || fallbackProgress}`;
}

export function formatContinueReadingSubtext(savedBook = {}, translate = null) {
  const translateText = typeof translate === "function" ? translate : null;
  return [
    savedBook.author && savedBook.author !== "Unknown author" ? savedBook.author : "",
    savedBook.chapterCount
      ? translateText
        ? translateText("home.continue.chapterCount", { count: savedBook.chapterCount })
        : `${savedBook.chapterCount} chapters`
      : "",
    savedBook.fileSize ? formatBytes(savedBook.fileSize) : ""
  ].filter(Boolean).join(" · ") || (translateText
    ? translateText("reader.saved.status")
    : "Saved locally in this browser.");
}

export function getVocabularyLibrarySummaryState(profile = {}, options = {}) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};
  const countList = (items) => Array.isArray(items) ? items.length : 0;
  const learningCount = countList(safeProfile.learningWords);
  const masteredCount = countList(safeProfile.knownWords);
  const hiddenCount = countList(safeProfile.ignoredWords);

  return {
    learningCount,
    masteredCount,
    hiddenCount,
    selectedLevel: safeProfile.selectedLevel || "level3",
    isEmpty: learningCount + masteredCount + hiddenCount === 0,
    hasError: options.hasError === true,
    note: options.hasError
      ? "Vocabulary counts are unavailable right now."
      : learningCount + masteredCount + hiddenCount === 0
        ? "Save words from Vocabulary Preview to build your library."
        : "Word lists are saved locally in this browser."
  };
}

export function getVocabularyLevelSelectorState(profile = {}, options = {}) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};
  const selectedLevel = VOCABULARY_LEVEL_VALUES.has(safeProfile.selectedLevel)
    ? safeProfile.selectedLevel
    : DEFAULT_VOCABULARY_LEVEL;

  return {
    selectedLevel,
    disabled: options.hasError === true,
    helpText: VOCABULARY_LEVEL_HELP_TEXT,
    options: VOCABULARY_LEVEL_OPTIONS.map((levelOption) => ({
      ...levelOption,
      selected: levelOption.value === selectedLevel
    }))
  };
}

const VOCABULARY_LIBRARY_TABS = Object.freeze({
  learning: {
    label: "Learning",
    profileKey: "learningWords",
    emptyText: "Saved words will appear here."
  },
  mastered: {
    label: "Known",
    profileKey: "knownWords",
    emptyText: "Words marked Known will appear here."
  },
  hidden: {
    label: "Hidden",
    profileKey: "ignoredWords",
    emptyText: "Hidden words will appear here."
  }
});

const MANUAL_VOCABULARY_MAX_LENGTH = 80;

export function getVocabularyLibraryDetailState(profile = {}, activeTab = "learning", options = {}) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};
  const normalizeList = (items) => {
    if (!Array.isArray(items)) {
      return [];
    }

    const seen = new Set();
    return items
      .map((item) => typeof item === "string" ? item.trim() : "")
      .filter(Boolean)
      .filter((item) => {
        const key = item.toLocaleLowerCase();
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  };
  const tabs = Object.entries(VOCABULARY_LIBRARY_TABS).map(([id, config]) => {
    return {
      id,
      label: config.label,
      terms: normalizeList(safeProfile[config.profileKey]),
      emptyText: config.emptyText
    };
  });
  const fallbackTab = tabs[0]?.id || "learning";
  const selectedTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : fallbackTab;
  const active = tabs.find((tab) => tab.id === selectedTab) || tabs[0];

  return {
    tabs: tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      count: tab.terms.length,
      isActive: tab.id === selectedTab
    })),
    activeTab: selectedTab,
    terms: active?.terms || [],
    emptyText: active?.emptyText || "No words yet.",
    hasError: options.hasError === true,
    statusText: options.hasError ? "Vocabulary Library is unavailable right now." : ""
  };
}

export function normalizeManualVocabularyInput(input = "", options = {}) {
  const maxLength = Number(options.maxLength) || MANUAL_VOCABULARY_MAX_LENGTH;
  const rawValue = String(input ?? "").trim().replace(/\s+/g, " ");

  if (!rawValue) {
    return {
      ok: false,
      term: "",
      reason: "empty",
      message: "Enter a word first."
    };
  }

  if (rawValue.length > maxLength) {
    return {
      ok: false,
      term: "",
      reason: "too-long",
      message: `Keep it under ${maxLength} characters.`
    };
  }

  const term = rawValue
    .toLowerCase()
    .replace(/^[^a-z0-9'-]+/i, "")
    .replace(/[^a-z0-9'-]+$/i, "")
    .trim();

  if (!term) {
    return {
      ok: false,
      term: "",
      reason: "empty",
      message: "Enter a word first."
    };
  }

  return {
    ok: true,
    term,
    reason: "ok",
    message: ""
  };
}

export function getVocabularyTermStatus(profile = {}, term = "") {
  const normalizedTerm = normalizeManualVocabularyInput(term).term;

  if (!normalizedTerm) {
    return "none";
  }

  const containsTerm = (items) => {
    return Array.isArray(items) &&
      items.some((item) => normalizeManualVocabularyInput(item).term === normalizedTerm);
  };

  if (containsTerm(profile.learningWords)) {
    return "learning";
  }

  if (containsTerm(profile.knownWords)) {
    return "mastered";
  }

  if (containsTerm(profile.ignoredWords)) {
    return "hidden";
  }

  return "none";
}

export function getManualVocabularyAddState(profile = {}, input = "", options = {}) {
  const normalized = normalizeManualVocabularyInput(input, options);

  if (!normalized.ok) {
    return {
      ok: false,
      shouldSave: false,
      term: normalized.term,
      reason: normalized.reason,
      message: normalized.message
    };
  }

  const currentStatus = getVocabularyTermStatus(profile, normalized.term);

  if (currentStatus === "learning") {
    return {
      ok: false,
      shouldSave: false,
      term: normalized.term,
      reason: "already-learning",
      message: "Already in Learning."
    };
  }

  return {
    ok: true,
    shouldSave: true,
    term: normalized.term,
    reason: currentStatus === "mastered" || currentStatus === "hidden"
      ? `move-from-${currentStatus}`
      : "new",
    message: currentStatus === "mastered" || currentStatus === "hidden"
      ? "Moved to Learning."
      : "Added to Learning."
  };
}

export function getVocabularyRemoveState(profile = {}, term = "", activeTab = "learning", options = {}) {
  const normalized = normalizeManualVocabularyInput(term, options);
  const tabStatus = {
    learning: "learning",
    mastered: "mastered",
    hidden: "hidden"
  };
  const tabLabel = {
    learning: "Learning",
    mastered: "Known",
    hidden: "Hidden"
  };
  const expectedStatus = tabStatus[activeTab] || "learning";

  if (!normalized.ok) {
    return {
      ok: false,
      shouldRemove: false,
      term: "",
      reason: normalized.reason,
      message: normalized.message
    };
  }

  const currentStatus = getVocabularyTermStatus(profile, normalized.term);

  if (currentStatus !== expectedStatus) {
    return {
      ok: false,
      shouldRemove: false,
      term: normalized.term,
      reason: "not-in-current-list",
      message: "Word is no longer in this list."
    };
  }

  return {
    ok: true,
    shouldRemove: true,
    term: normalized.term,
    reason: `remove-${expectedStatus}`,
    message: `Removed from ${tabLabel[activeTab] || "this list"}.`
  };
}

const VOCABULARY_EXPORT_SECTIONS = Object.freeze([
  {
    key: "learningWords",
    label: "Learning",
    status: "learning"
  },
  {
    key: "knownWords",
    label: "Known",
    status: "mastered"
  },
  {
    key: "ignoredWords",
    label: "Hidden",
    status: "hidden"
  }
]);

function normalizeVocabularyExportList(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set();
  return items
    .map((item) => normalizeManualVocabularyInput(item).term)
    .filter(Boolean)
    .filter((term) => {
      if (seen.has(term)) {
        return false;
      }

      seen.add(term);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

export function getVocabularyExportSections(profile = {}) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};

  return VOCABULARY_EXPORT_SECTIONS.map((section) => ({
    label: section.label,
    status: section.status,
    terms: normalizeVocabularyExportList(safeProfile[section.key])
  }));
}

export function getVocabularyExportRows(profile = {}) {
  return getVocabularyExportSections(profile).flatMap((section) => {
    return section.terms.map((term) => ({
      term,
      status: section.status
    }));
  });
}

export function formatVocabularyLearningExportText(profile = {}) {
  const learningSection = getVocabularyExportSections(profile)
    .find((section) => section.status === "learning");

  return (learningSection?.terms || []).join("\n");
}

export function formatVocabularyAllExportText(profile = {}) {
  return getVocabularyExportSections(profile)
    .map((section) => [section.label, ...section.terms].join("\n"))
    .join("\n\n");
}

function escapeCsvValue(value = "") {
  const text = String(value ?? "");

  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function formatVocabularyCsvExport(profile = {}) {
  const rows = getVocabularyExportRows(profile)
    .map((row) => `${escapeCsvValue(row.term)},${escapeCsvValue(row.status)}`);

  return ["term,status", ...rows].join("\n");
}

export function getVocabularyExportState(profile = {}, options = {}) {
  const sections = getVocabularyExportSections(profile);
  const learningCount = sections.find((section) => section.status === "learning")?.terms.length || 0;
  const totalCount = sections.reduce((sum, section) => sum + section.terms.length, 0);
  const hasError = options.hasError === true;

  return {
    hasError,
    hasWords: totalCount > 0,
    learningCount,
    totalCount,
    copyLearningDisabled: hasError || learningCount === 0,
    downloadLearningTxtDisabled: hasError || learningCount === 0,
    copyAllDisabled: hasError || totalCount === 0,
    downloadCsvDisabled: hasError || totalCount === 0,
    message: hasError
      ? "Export is unavailable right now."
      : totalCount === 0
        ? "No words to export yet."
        : ""
  };
}

export function getAppViewVisibility(view = "home") {
  const currentView = ["home", "reader", "vocabulary-library", "settings"].includes(view) ? view : "home";

  return {
    currentView,
    homeHidden: currentView !== "home",
    readerHidden: currentView !== "reader",
    vocabularyLibraryHidden: currentView !== "vocabulary-library",
    settingsHidden: currentView !== "settings"
  };
}

export function getAppRuntimeDiagnostics(options = {}) {
  const appState = options.appState || state;
  const refs = options.elements || elements;
  const documentRef = options.documentRef || (typeof document !== "undefined" ? document : null);
  const getElement = (key, selector) => refs[key] || documentRef?.querySelector?.(selector) || null;
  const countElements = (selector, fallbackElements = []) => {
    const found = documentRef?.querySelectorAll?.(selector);

    if (found) {
      return found.length;
    }

    return fallbackElements.filter(Boolean).length;
  };
  const viewState = (key, selector) => {
    const element = getElement(key, selector);

    return {
      exists: Boolean(element),
      hidden: element ? Boolean(element.hidden) : true
    };
  };
  const activeView = ["home", "reader", "vocabulary-library", "settings"].includes(appState.currentView)
    ? appState.currentView
    : "unknown";

  return {
    activeView,
    views: {
      home: viewState("homeView", "#homeView"),
      reader: viewState("readerView", "#readerView"),
      vocabularyLibrary: viewState("vocabularyLibraryView", "#vocabularyLibraryView"),
      settings: viewState("settingsView", "#settingsView")
    },
    readerNavigation: {
      previousButtonsFound: countElements("#prevChapterButton, #bottomPrevChapterButton, #tapPrevChapterButton", [
        refs.prevChapterButton,
        refs.bottomPrevChapterButton,
        refs.tapPrevChapterButton
      ]),
      nextButtonsFound: countElements("#nextChapterButton, #bottomNextChapterButton, #tapNextChapterButton", [
        refs.nextChapterButton,
        refs.bottomNextChapterButton,
        refs.tapNextChapterButton
      ]),
      chapterListFound: Boolean(getElement("chapterList", "#chapterList")),
      bindEventsCompleted: Boolean(appState.eventsBound)
    },
    vocabularyLibrary: {
      viewWordsButtonFound: Boolean(getElement("openVocabularyLibraryButton", "#openVocabularyLibraryButton")),
      backToHomeButtonFound: Boolean(getElement("vocabularyBackHomeButton", "#vocabularyBackHomeButton")),
      tabButtonsFound: countElements("[data-vocabulary-tab]", refs.vocabularyLibraryTabs || [])
    }
  };
}

const state = {
  book: null,
  epubHandle: null,
  currentChapterId: null,
  currentMode: storage.get("last-mode", MODES.ENGLISH_STUDY),
  vocabularyItems: [],
  vocabularyIndex: new Map(),
  vocabularyLoadError: null,
  protectedTerms: [],
  bookGlossary: [],
  isLoadingChapter: false,
  currentBookKey: null,
  restoreCandidate: null,
  isContinueReadingDismissed: false,
  lastScrollProgress: null,
  readerControlsVisible: false,
  pendingChapterIndex: -1,
  activeBubbleTerm: null,
  pendingForgetBook: null,
  vocabularyPersonalizationState: null,
  vocabularyPersonalizationCacheKey: "",
  vocabularyPersonalizationPromise: null,
  vocabularyPersonalizationWarningShown: false,
  vocabularyPreviewRenderVersion: 0,
  vocabularyLibraryActiveTab: "learning",
  isBuiltInGuideOpen: false,
  appPreferences: null,
  uiLanguage: DEFAULT_UI_LANGUAGE,
  eventsBound: false,
  importDiagnostics: createEmptyImportDiagnostics(),
  currentView: "home"
};

const elements = {};
let scrollProgressSaveTimer = null;
let suppressScrollProgressSaveUntil = 0;
let vocabularyPersonalizationModulesPromise = null;
let vocabularyProfileActionHelpersPromise = null;
let vocabularyProfileBackupHelpersPromise = null;
let vocabularyProfileReaderPromise = null;
let vocabularyLevelSetterPromise = null;

function installSlashReaderDebugApi() {
  if (typeof window === "undefined") {
    return;
  }

  window.__slashReaderDebug = {
    ...(window.__slashReaderDebug || {}),
    getDiagnostics: () => getAppRuntimeDiagnostics()
  };
}

async function loadVocabularyProfileReader() {
  if (!vocabularyProfileReaderPromise) {
    vocabularyProfileReaderPromise = import("./storage.js")
      .then((storageModule) => {
        if (typeof storageModule.getVocabularyProfile !== "function") {
          throw new Error("Vocabulary profile storage helper is unavailable.");
        }

        return storageModule.getVocabularyProfile;
      })
      .catch((error) => {
        vocabularyProfileReaderPromise = null;
        throw error;
      });
  }

  return vocabularyProfileReaderPromise;
}

async function loadVocabularyProfileActionHelpers() {
  if (!vocabularyProfileActionHelpersPromise) {
    vocabularyProfileActionHelpersPromise = import("./storage.js")
      .then((storageModule) => {
        const helpers = {
          known: storageModule.markWordKnown,
          add: storageModule.addLearningWord,
          ignore: storageModule.ignoreVocabularyWord,
          restore: storageModule.restoreVocabularyWord
        };

        for (const [action, helper] of Object.entries(helpers)) {
          if (typeof helper !== "function") {
            throw new Error(`Vocabulary profile action helper is unavailable: ${action}.`);
          }
        }

        return helpers;
      })
      .catch((error) => {
        vocabularyProfileActionHelpersPromise = null;
        throw error;
      });
  }

  return vocabularyProfileActionHelpersPromise;
}

async function loadVocabularyLevelSetter() {
  if (!vocabularyLevelSetterPromise) {
    vocabularyLevelSetterPromise = import("./storage.js")
      .then((storageModule) => {
        if (typeof storageModule.setVocabularyComfortLevel !== "function") {
          throw new Error("Vocabulary level storage helper is unavailable.");
        }

        return storageModule.setVocabularyComfortLevel;
      })
      .catch((error) => {
        vocabularyLevelSetterPromise = null;
        throw error;
      });
  }

  return vocabularyLevelSetterPromise;
}

async function loadVocabularyProfileBackupHelpers() {
  if (!vocabularyProfileBackupHelpersPromise) {
    vocabularyProfileBackupHelpersPromise = import("./storage.js")
      .then((storageModule) => {
        const helpers = {
          createVocabularyProfileBackup: storageModule.createVocabularyProfileBackup,
          parseVocabularyProfileBackupJson: storageModule.parseVocabularyProfileBackupJson,
          saveVocabularyProfile: storageModule.saveVocabularyProfile
        };

        for (const [name, helper] of Object.entries(helpers)) {
          if (typeof helper !== "function") {
            throw new Error(`Vocabulary profile backup helper is unavailable: ${name}.`);
          }
        }

        return helpers;
      })
      .catch((error) => {
        vocabularyProfileBackupHelpersPromise = null;
        throw error;
      });
  }

  return vocabularyProfileBackupHelpersPromise;
}

async function loadVocabularyPersonalizationModules() {
  if (!vocabularyPersonalizationModulesPromise) {
    vocabularyPersonalizationModulesPromise = Promise.all([
      import("./vocabEngine.js"),
      import("./levelBaselineEngine.js"),
      import("./storage.js")
    ]).then(([vocabModule, levelModule, storageModule]) => {
      if (typeof vocabModule.filterVocabularyPreviewItems !== "function") {
        throw new Error("Vocabulary Preview filtering helper is unavailable.");
      }

      if (typeof levelModule.loadEffectiveKnownWordsForProfile !== "function") {
        throw new Error("Vocabulary level baseline helper is unavailable.");
      }

      if (typeof storageModule.getVocabularyProfile !== "function") {
        throw new Error("Vocabulary profile storage helper is unavailable.");
      }

      return {
        filterVocabularyPreviewItems: vocabModule.filterVocabularyPreviewItems,
        loadEffectiveKnownWordsForProfile: levelModule.loadEffectiveKnownWordsForProfile,
        getVocabularyProfile: storageModule.getVocabularyProfile
      };
    }).catch((error) => {
      vocabularyPersonalizationModulesPromise = null;
      throw error;
    });
  }

  return vocabularyPersonalizationModulesPromise;
}

function vocabularyProfileCacheKey(profile = {}) {
  const normalizedProfile = profile && typeof profile === "object" ? profile : {};
  const listKey = (words) => Array.isArray(words) ? words.join(",") : "";

  return [
    normalizedProfile.selectedLevel || "",
    listKey(normalizedProfile.knownWords),
    listKey(normalizedProfile.learningWords),
    listKey(normalizedProfile.ignoredWords),
    listKey(normalizedProfile.preferredCategories)
  ].join("|");
}

async function loadVocabularyPersonalizationState(options = {}) {
  const modules = options.personalizationModules || await loadVocabularyPersonalizationModules();
  const getProfile = options.getVocabularyProfile || modules.getVocabularyProfile;
  const loadEffectiveKnownWords = options.loadEffectiveKnownWordsForProfile ||
    modules.loadEffectiveKnownWordsForProfile;
  const profile = await getProfile();
  const cacheKey = vocabularyProfileCacheKey(profile);

  if (state.vocabularyPersonalizationState && state.vocabularyPersonalizationCacheKey === cacheKey) {
    return state.vocabularyPersonalizationState;
  }

  if (
    state.vocabularyPersonalizationPromise &&
    state.vocabularyPersonalizationPromise.cacheKey === cacheKey
  ) {
    return state.vocabularyPersonalizationPromise.promise;
  }

  const fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  const promise = loadEffectiveKnownWords(profile, { fetchImpl })
    .then((personalizationState) => {
      state.vocabularyPersonalizationState = personalizationState;
      state.vocabularyPersonalizationCacheKey = cacheKey;
      return personalizationState;
    })
    .finally(() => {
      if (state.vocabularyPersonalizationPromise?.cacheKey === cacheKey) {
        state.vocabularyPersonalizationPromise = null;
      }
    });

  state.vocabularyPersonalizationPromise = {
    cacheKey,
    promise
  };

  return promise;
}

export async function getPersonalizedVocabularyPreviewItems(items = [], options = {}) {
  const sourceItems = Array.isArray(items) ? items : [];

  try {
    const loadPersonalizationModules = options.loadPersonalizationModules ||
      loadVocabularyPersonalizationModules;
    const modules = options.personalizationModules || await loadPersonalizationModules();
    const loadPersonalizationState = options.loadPersonalizationState || loadVocabularyPersonalizationState;
    const filterItems = options.filterItems || modules.filterVocabularyPreviewItems;
    const personalizationState = await loadPersonalizationState({
      ...options,
      personalizationModules: modules
    });

    return filterItems(sourceItems, personalizationState, options.filterOptions || {});
  } catch (error) {
    if (typeof options.onError === "function") {
      options.onError(error);
    }

    return sourceItems;
  }
}

export function getVocabularyPreviewItemTerm(item = {}) {
  return item?.term || item?.headword || "";
}

export function isVocabularyPreviewItemSaved(item = {}, personalizationState = {}) {
  const term = normalizeTerm(getVocabularyPreviewItemTerm(item));

  if (!term) {
    return false;
  }

  if (item?.personalization?.boostedByLearningWords || item?.personalization?.reason === "learning-word") {
    return true;
  }

  const learningWords = personalizationState?.normalizedProfile?.learningWords;

  if (!Array.isArray(learningWords)) {
    return false;
  }

  return learningWords.some((word) => normalizeTerm(word) === term);
}

function resetVocabularyPersonalizationCache() {
  state.vocabularyPersonalizationState = null;
  state.vocabularyPersonalizationCacheKey = "";
  state.vocabularyPersonalizationPromise = null;
}

export async function applyVocabularyPreviewAction(action, term, options = {}) {
  const normalizedTerm = normalizeTerm(term);

  if (!normalizedTerm) {
    return {
      ok: false,
      reason: "empty-term"
    };
  }

  try {
    const helpers = options.actionHelpers || await loadVocabularyProfileActionHelpers();
    const helper = helpers[action];

    if (typeof helper !== "function") {
      throw new Error(`Unknown vocabulary action: ${action}`);
    }

    const profile = await helper(normalizedTerm);

    if (typeof options.invalidateCache === "function") {
      options.invalidateCache();
    }

    return {
      ok: true,
      action,
      term: normalizedTerm,
      profile
    };
  } catch (error) {
    if (typeof options.onError === "function") {
      options.onError(error);
    }

    return {
      ok: false,
      action,
      term: normalizedTerm,
      error
    };
  }
}

installSlashReaderDebugApi();

function scheduleAppInit() {
  if (typeof document === "undefined") {
    return;
  }

  const start = () => {
    init().catch((error) => {
      console.error("Interleaf Reader: startup failed.", error);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

scheduleAppInit();

// app.js owns UI wiring and state. EPUB parsing, matching, translation, and
// persistence are delegated to small modules so Phase 1 can grow safely.
async function init() {
  cacheElements();
  initializeAppPreferences();
  applyInterfaceLanguage();

  try {
    bindEvents();
  } catch (error) {
    console.error("Interleaf Reader: event binding failed before startup completed.", error);
  }

  await refreshHomeLibraryState();
  renderLanguageGate();
  syncModeControls();
  await loadSeedData();
  renderCurrentChapter();
  showView("home");
}

function getNavigatorLanguagePreference() {
  if (typeof navigator === "undefined") {
    return DEFAULT_UI_LANGUAGE;
  }

  return detectPreferredUiLanguage(navigator);
}

function initializeAppPreferences() {
  const preferredLanguage = getNavigatorLanguagePreference();
  state.appPreferences = getAppPreferences({ uiLanguage: preferredLanguage });
  state.uiLanguage = normalizeUiLanguage(state.appPreferences.uiLanguage);

}

function t(key, params = {}) {
  return getTranslation(state.uiLanguage, key, params);
}

function resolveI18nParams(params = {}) {
  if (!params.labelKey) {
    return params;
  }

  const { labelKey, ...rest } = params;
  return {
    ...rest,
    label: t(labelKey)
  };
}

function getI18nNodeParams(node) {
  if (!node?.dataset?.i18nParams) {
    return {};
  }

  try {
    return resolveI18nParams(JSON.parse(node.dataset.i18nParams));
  } catch {
    return {};
  }
}

function setTranslatedText(node, key = "", params = {}) {
  if (!node) {
    return;
  }

  if (!key) {
    node.textContent = "";
    delete node.dataset.i18n;
    delete node.dataset.i18nParams;
    return;
  }

  node.dataset.i18n = key;
  node.dataset.i18nParams = JSON.stringify(params);
  node.textContent = t(key, resolveI18nParams(params));
}

function applyInterfaceLanguage() {
  const language = normalizeUiLanguage(state.uiLanguage);
  state.uiLanguage = language;

  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = language;
  document.title = t("app.name");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n, getI18nNodeParams(node));
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
}

function renderLanguageGate() {
  if (!elements.languageGate) {
    return;
  }

  const languageState = getFirstRunLanguageChoiceState(state.appPreferences || {}, {
    navigatorLike: typeof navigator === "undefined" ? {} : navigator
  });

  elements.languageGate.hidden = !languageState.shouldShow;

  if (elements.languageChoiceButtons) {
    for (const button of elements.languageChoiceButtons) {
      const isSelected = button.dataset.uiLanguageChoice === languageState.selectedLanguage;
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
      button.classList.toggle("is-selected", isSelected);
    }
  }
}

function handleUiLanguageChoice(language) {
  const nextPreferences = setUiLanguagePreference(language);
  state.appPreferences = nextPreferences;
  state.uiLanguage = normalizeUiLanguage(nextPreferences.uiLanguage);

  applyInterfaceLanguage();
  renderLanguageGate();
  renderSettingsView();
  renderLocalLibrary();
  renderVocabularyLibrarySummary();
  updateReturnToReaderPanel();
  refreshContinueReadingLanguage();
  refreshReaderChromeLanguage();
}

function handleSettingsUiLanguageChange(event) {
  handleUiLanguageChoice(event.target.value);
  setLocalizedSettingsFeedback("settings.language.feedback", "success");
}

function renderSettingsView() {
  if (!elements.settingsView) {
    return;
  }

  if (elements.settingsUiLanguageSelect) {
    elements.settingsUiLanguageSelect.value = normalizeUiLanguage(state.uiLanguage);
  }

  if (elements.settingsShowGuideButton) {
    const isVisible = state.appPreferences?.guideVisibleInLibrary !== false;
    elements.settingsShowGuideButton.disabled = isVisible;
    elements.settingsShowGuideButton.textContent = isVisible
      ? t("settings.help.guideVisible")
      : t("settings.help.showGuide");
  }
}

function setSettingsFeedback(message = "", tone = "info") {
  if (!elements.settingsFeedback) {
    return;
  }

  setTranslatedText(elements.settingsFeedback, "");
  elements.settingsFeedback.textContent = message;
  elements.settingsFeedback.dataset.tone = tone;
}

function setLocalizedSettingsFeedback(key = "", tone = "info", params = {}) {
  if (!elements.settingsFeedback) {
    return;
  }

  setTranslatedText(elements.settingsFeedback, key, params);
  elements.settingsFeedback.dataset.tone = tone;
}

function openHelpCenter() {
  if (elements.helpCenterPanel) {
    elements.helpCenterPanel.hidden = false;
    elements.helpCenterPanel.scrollIntoView({ block: "nearest" });
  }

  setSettingsFeedback("");
}

function confirmGuideHide() {
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return true;
  }

  return window.confirm(t("guide.hide.confirm"));
}

function hideGuideFromLibrary() {
  if (!confirmGuideHide()) {
    return;
  }

  state.appPreferences = setGuideVisibilityPreference(false);
  renderLocalLibrary();
  renderSettingsView();
  setLocalizedStatus("guide.hide.done", "success");
  setLocalizedSettingsFeedback("guide.hide.done", "success");
}

function showGuideInLibrary() {
  state.appPreferences = setGuideVisibilityPreference(true);
  renderLocalLibrary();
  renderSettingsView();
  setLocalizedSettingsFeedback("guide.restore.done", "success");
  setLocalizedStatus("guide.restore.done", "success");
}

function cacheElements() {
  elements.languageGate = document.querySelector("#languageGate");
  elements.languageChoiceButtons = [...document.querySelectorAll("[data-ui-language-choice]")];
  elements.homeView = document.querySelector("#homeView");
  elements.readerView = document.querySelector("#readerView");
  elements.settingsView = document.querySelector("#settingsView");
  elements.openSettingsButton = document.querySelector("#openSettingsButton");
  elements.settingsBackHomeButton = document.querySelector("#settingsBackHomeButton");
  elements.settingsUiLanguageSelect = document.querySelector("#settingsUiLanguageSelect");
  elements.settingsOpenGuideButton = document.querySelector("#settingsOpenGuideButton");
  elements.settingsShowGuideButton = document.querySelector("#settingsShowGuideButton");
  elements.openHelpCenterButton = document.querySelector("#openHelpCenterButton");
  elements.helpCenterPanel = document.querySelector("#helpCenterPanel");
  elements.helpCenterOpenGuideButton = document.querySelector("#helpCenterOpenGuideButton");
  elements.helpCenterShowGuideButton = document.querySelector("#helpCenterShowGuideButton");
  elements.settingsFeedback = document.querySelector("#settingsFeedback");
  elements.backToHomeButton = document.querySelector("#backToHomeButton");
  elements.epubInput = document.querySelector("#epubInput");
  elements.dropZone = document.querySelector("#dropZone");
  elements.statusText = document.querySelector("#statusText");
  elements.continueReadingPanel = document.querySelector("#continueReadingPanel");
  elements.returnToReaderPanel = document.querySelector("#returnToReaderPanel");
  elements.returnToReaderSubtext = document.querySelector("#returnToReaderSubtext");
  elements.libraryList = document.querySelector("#libraryList");
  elements.libraryEmpty = document.querySelector("#libraryEmpty");
  elements.vocabularyLibraryLevel = document.querySelector("#vocabularyLibraryLevel");
  elements.vocabularyLearningCount = document.querySelector("#vocabularyLearningCount");
  elements.vocabularyMasteredCount = document.querySelector("#vocabularyMasteredCount");
  elements.vocabularyHiddenCount = document.querySelector("#vocabularyHiddenCount");
  elements.vocabularyLibraryEmpty = document.querySelector("#vocabularyLibraryEmpty");
  elements.openVocabularyLibraryButton = document.querySelector("#openVocabularyLibraryButton");
  elements.vocabularyLibraryView = document.querySelector("#vocabularyLibraryView");
  elements.vocabularyBackHomeButton = document.querySelector("#vocabularyBackHomeButton");
  elements.vocabularyPageLearningCount = document.querySelector("#vocabularyPageLearningCount");
  elements.vocabularyPageMasteredCount = document.querySelector("#vocabularyPageMasteredCount");
  elements.vocabularyPageHiddenCount = document.querySelector("#vocabularyPageHiddenCount");
  elements.vocabularyPageLevel = document.querySelector("#vocabularyPageLevel");
  elements.vocabularyLevelSelect = document.querySelector("#vocabularyLevelSelect");
  elements.vocabularyLevelHelp = document.querySelector("#vocabularyLevelHelp");
  elements.vocabularyLevelFeedback = document.querySelector("#vocabularyLevelFeedback");
  elements.vocabularyManualAddForm = document.querySelector("#vocabularyManualAddForm");
  elements.vocabularyManualAddInput = document.querySelector("#vocabularyManualAddInput");
  elements.vocabularyManualAddButton = document.querySelector("#vocabularyManualAddButton");
  elements.vocabularyManualFeedback = document.querySelector("#vocabularyManualFeedback");
  elements.copyLearningButton = document.querySelector("#copyLearningButton");
  elements.downloadLearningTxtButton = document.querySelector("#downloadLearningTxtButton");
  elements.copyAllVocabularyButton = document.querySelector("#copyAllVocabularyButton");
  elements.downloadVocabularyCsvButton = document.querySelector("#downloadVocabularyCsvButton");
  elements.vocabularyExportFeedback = document.querySelector("#vocabularyExportFeedback");
  elements.backupVocabularyProfileButton = document.querySelector("#backupVocabularyProfileButton");
  elements.restoreVocabularyProfileInput = document.querySelector("#restoreVocabularyProfileInput");
  elements.restoreVocabularyProfileButton = document.querySelector("#restoreVocabularyProfileButton");
  elements.vocabularyBackupFeedback = document.querySelector("#vocabularyBackupFeedback");
  elements.vocabularyLibraryTabs = [...document.querySelectorAll("[data-vocabulary-tab]")];
  elements.vocabularyLibraryPanelStatus = document.querySelector("#vocabularyLibraryPanelStatus");
  elements.vocabularyLibraryTermList = document.querySelector("#vocabularyLibraryTermList");
  elements.forgetBookModal = document.querySelector("#forgetBookModal");
  elements.forgetBookBody = document.querySelector("#forgetBookBody");
  elements.cancelForgetBookButton = document.querySelector("#cancelForgetBookButton");
  elements.confirmForgetBookButton = document.querySelector("#confirmForgetBookButton");
  elements.restoreTitle = document.querySelector("#restoreTitle");
  elements.restoreText = document.querySelector("#restoreText");
  elements.restoreBookButton = document.querySelector("#restoreBookButton");
  elements.dismissRestoreButton = document.querySelector("#dismissRestoreButton");
  elements.readerSavedPanel = document.querySelector("#readerSavedPanel");
  elements.readerSavedText = document.querySelector("#readerSavedText");
  elements.clearSavedBookButton = document.querySelector("#clearSavedBookButton");
  elements.readerTapControls = document.querySelector("#readerTapControls");
  elements.tapHomeButton = document.querySelector("#tapHomeButton");
  elements.tapBookTitle = document.querySelector("#tapBookTitle");
  elements.tapChapterTitle = document.querySelector("#tapChapterTitle");
  elements.tapChapterProgress = document.querySelector("#tapChapterProgress");
  elements.tapChapterProgressTitle = document.querySelector("#tapChapterProgressTitle");
  elements.tapChapterSlider = document.querySelector("#tapChapterSlider");
  elements.tapChapterSliderPreview = document.querySelector("#tapChapterSliderPreview");
  elements.tapChaptersButton = document.querySelector("#tapChaptersButton");
  elements.tapProgressButton = document.querySelector("#tapProgressButton");
  elements.tapVocabButton = document.querySelector("#tapVocabButton");
  elements.tapModeButton = document.querySelector("#tapModeButton");
  elements.readerHelpButton = document.querySelector("#readerHelpButton");
  elements.readerHelpPanel = document.querySelector("#readerHelpPanel");
  elements.readerHelpCloseButton = document.querySelector("#readerHelpCloseButton");
  elements.readerHelpOpenHelpCenterButton = document.querySelector("#readerHelpOpenHelpCenterButton");
  elements.readerHelpOpenGuideButton = document.querySelector("#readerHelpOpenGuideButton");
  elements.tapPrevChapterButton = document.querySelector("#tapPrevChapterButton");
  elements.tapNextChapterButton = document.querySelector("#tapNextChapterButton");
  elements.debugPanel = document.querySelector("#debugPanel");
  elements.debugFileName = document.querySelector("#debugFileName");
  elements.debugFileSize = document.querySelector("#debugFileSize");
  elements.debugFileType = document.querySelector("#debugFileType");
  elements.debugFileExtension = document.querySelector("#debugFileExtension");
  elements.debugStep = document.querySelector("#debugStep");
  elements.debugEpubJs = document.querySelector("#debugEpubJs");
  elements.debugJsZip = document.querySelector("#debugJsZip");
  elements.debugArrayBuffer = document.querySelector("#debugArrayBuffer");
  elements.debugMetadata = document.querySelector("#debugMetadata");
  elements.debugSpine = document.querySelector("#debugSpine");
  elements.debugError = document.querySelector("#debugError");
  elements.chapterSelect = document.querySelector("#chapterSelect");
  elements.chapterList = document.querySelector("#chapterList");
  elements.mobileChapterList = document.querySelector("#mobileChapterList");
  elements.chapterCount = document.querySelector("#chapterCount");
  elements.sidebarChapterProgress = document.querySelector("#sidebarChapterProgress");
  elements.mobileChaptersButton = document.querySelector("#mobileChaptersButton");
  elements.mobileVocabButton = document.querySelector("#mobileVocabButton");
  elements.mobileModeButton = document.querySelector("#mobileModeButton");
  elements.mobileSheetBackdrop = document.querySelector("#mobileSheetBackdrop");
  elements.mobileChapterSheet = document.querySelector("#mobileChapterSheet");
  elements.mobileProgressSheet = document.querySelector("#mobileProgressSheet");
  elements.mobileVocabSheet = document.querySelector("#mobileVocabSheet");
  elements.mobileModeSheet = document.querySelector("#mobileModeSheet");
  elements.mobileVocabList = document.querySelector("#mobileVocabList");
  elements.mobileModeButtons = [...document.querySelectorAll("[data-mobile-mode]")];
  elements.prevChapterButton = document.querySelector("#prevChapterButton");
  elements.nextChapterButton = document.querySelector("#nextChapterButton");
  elements.bottomPrevChapterButton = document.querySelector("#bottomPrevChapterButton");
  elements.bottomNextChapterButton = document.querySelector("#bottomNextChapterButton");
  elements.backToTopButton = document.querySelector("#backToTopButton");
  elements.chapterProgress = document.querySelector("#chapterProgress");
  elements.bookMeta = document.querySelector("#bookMeta");
  elements.readerPane = document.querySelector(".reader-pane");
  elements.chapterContent = document.querySelector("#chapterContent");
  elements.vocabList = document.querySelector("#vocabList");
  elements.glossaryList = document.querySelector("#glossaryList");
  elements.glossaryCount = document.querySelector("#glossaryCount");
  elements.vocabBubble = document.querySelector("#vocabBubble");
  elements.modeInputs = [...document.querySelectorAll("input[name='readingMode']")];
}

function bindEvents() {
  state.eventsBound = false;

  for (const languageButton of elements.languageChoiceButtons || []) {
    languageButton.addEventListener("click", () => {
      handleUiLanguageChoice(languageButton.dataset.uiLanguageChoice);
    });
  }

  elements.epubInput.addEventListener("change", (event) => {
    handleSelectedFile(event.target.files?.[0]).finally(() => {
      event.target.value = "";
    });
  });

  elements.restoreBookButton.addEventListener("click", restoreSavedBook);
  elements.dismissRestoreButton.addEventListener("click", dismissContinueReading);
  elements.clearSavedBookButton.addEventListener("click", clearSavedBook);
  elements.backToHomeButton.addEventListener("click", () => {
    saveCurrentReadingProgress({ force: true });
    hideBubble();
    closeMobileSheets();
    hideReaderTapControls();
    showView("home");
  });

  elements.returnToReaderPanel.addEventListener("click", () => {
    showView("reader");
    restoreReaderScrollFromProgress(state.lastScrollProgress);
  });

  elements.libraryList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-book-key]");

    if (!card) {
      return;
    }

    const bookKey = card.dataset.bookKey;

    if (event.target.closest("[data-hide-guide]")) {
      if (isGuideBookKey(bookKey)) {
        hideGuideFromLibrary();
      }
      return;
    }

    if (event.target.closest("[data-open-book]")) {
      if (isGuideBookKey(bookKey)) {
        openBuiltInGuide();
        return;
      }

      openSavedBookFromLibrary(bookKey);
      return;
    }

    if (event.target.closest("[data-delete-book]")) {
      if (isGuideBookKey(bookKey)) {
        return;
      }

      const title = card.querySelector(".library-card-title")?.textContent || "this book";
      openForgetBookModal(bookKey, title);
    }
  });

  elements.cancelForgetBookButton.addEventListener("click", closeForgetBookModal);
  elements.confirmForgetBookButton.addEventListener("click", confirmForgetBook);
  elements.forgetBookModal.addEventListener("click", (event) => {
    if (event.target === elements.forgetBookModal) {
      closeForgetBookModal();
    }
  });
  bindClick(elements.openVocabularyLibraryButton, openVocabularyLibraryView, "Vocabulary Library entry");
  bindClick(elements.vocabularyBackHomeButton, () => {
    showView("home");
  }, "Vocabulary Library Back to Home");
  bindClick(elements.openSettingsButton, () => {
    showView("settings");
  }, "Settings entry");
  bindClick(elements.settingsBackHomeButton, () => {
    showView("home");
  }, "Settings Back to Home");
  bindClick(elements.settingsOpenGuideButton, () => {
    openBuiltInGuide();
  }, "Settings Open Guide");
  bindClick(elements.settingsShowGuideButton, () => {
    showGuideInLibrary();
  }, "Settings Show Guide in Library");
  bindClick(elements.openHelpCenterButton, () => {
    openHelpCenter();
  }, "Settings Help Center");
  bindClick(elements.helpCenterOpenGuideButton, () => {
    openBuiltInGuide();
  }, "Help Center Open Guide");
  bindClick(elements.helpCenterShowGuideButton, () => {
    showGuideInLibrary();
  }, "Help Center Show Guide in Library");

  if (elements.settingsUiLanguageSelect) {
    elements.settingsUiLanguageSelect.addEventListener("change", handleSettingsUiLanguageChange);
  }

  for (const tab of elements.vocabularyLibraryTabs) {
    tab.addEventListener("click", () => {
      state.vocabularyLibraryActiveTab = tab.dataset.vocabularyTab || "learning";
      setVocabularyManualFeedback("");
      renderVocabularyLibraryView();
    });
  }

  if (elements.vocabularyManualAddForm) {
    elements.vocabularyManualAddForm.addEventListener("submit", handleManualVocabularyAdd);
  } else {
    console.warn("Vocabulary Library manual add form is unavailable; leaving other controls active.");
  }

  if (elements.vocabularyLevelSelect) {
    elements.vocabularyLevelSelect.addEventListener("change", handleVocabularyLevelChange);
  } else {
    console.warn("Vocabulary Level selector is unavailable; leaving other controls active.");
  }

  if (elements.vocabularyLibraryTermList) {
    elements.vocabularyLibraryTermList.addEventListener("click", handleVocabularyLibraryTermListClick);
  } else {
    console.warn("Vocabulary Library term list is unavailable; leaving other controls active.");
  }

  bindClick(elements.copyLearningButton, () => handleVocabularyExportAction("copy-learning"), "Copy Learning export");
  bindClick(
    elements.downloadLearningTxtButton,
    () => handleVocabularyExportAction("download-learning-txt"),
    "Download Learning TXT export"
  );
  bindClick(elements.copyAllVocabularyButton, () => handleVocabularyExportAction("copy-all"), "Copy All export");
  bindClick(
    elements.downloadVocabularyCsvButton,
    () => handleVocabularyExportAction("download-csv"),
    "Download vocabulary CSV"
  );
  bindClick(elements.backupVocabularyProfileButton, handleVocabularyProfileBackup, "Backup vocabulary profile");
  bindClick(elements.restoreVocabularyProfileButton, () => {
    if (elements.restoreVocabularyProfileInput) {
      elements.restoreVocabularyProfileInput.value = "";
      elements.restoreVocabularyProfileInput.click();
    }
  }, "Restore vocabulary profile");

  if (elements.restoreVocabularyProfileInput) {
    elements.restoreVocabularyProfileInput.addEventListener("change", handleVocabularyProfileRestore);
    elements.restoreVocabularyProfileInput.addEventListener("cancel", () => {
      setVocabularyBackupFeedback("vocabulary.backup.feedback.cancelled");
    });
  }

  elements.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });

  elements.dropZone.addEventListener("dragleave", () => {
    elements.dropZone.classList.remove("is-dragging");
  });

  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
    handleSelectedFile(event.dataTransfer.files?.[0]);
  });

  elements.chapterSelect.addEventListener("change", () => {
    selectChapter(elements.chapterSelect.value);
  });

  elements.chapterList.addEventListener("click", (event) => {
    const chapterRow = event.target.closest("[data-chapter-id]");

    if (!chapterRow || state.isLoadingChapter) {
      return;
    }

    selectChapter(chapterRow.dataset.chapterId);
  });

  elements.mobileChapterList.addEventListener("click", (event) => {
    const chapterRow = event.target.closest("[data-chapter-id]");

    if (!chapterRow || state.isLoadingChapter) {
      return;
    }

    selectChapter(chapterRow.dataset.chapterId);
    closeMobileSheets();
  });

  elements.mobileChaptersButton.addEventListener("click", () => {
    openMobileSheet(elements.mobileChapterSheet);
  });

  elements.mobileVocabButton.addEventListener("click", () => {
    openMobileSheet(elements.mobileVocabSheet);
  });

  elements.mobileModeButton.addEventListener("click", () => {
    openMobileSheet(elements.mobileModeSheet);
  });

  elements.tapHomeButton.addEventListener("click", () => {
    saveCurrentReadingProgress({ force: true });
    hideBubble();
    closeMobileSheets();
    hideReaderTapControls();
    showView("home");
  });

  elements.tapChaptersButton.addEventListener("click", () => {
    openMobileSheet(elements.mobileChapterSheet);
  });

  elements.tapProgressButton.addEventListener("click", () => {
    openMobileSheet(elements.mobileProgressSheet);
  });

  if (elements.tapChapterSlider) {
    elements.tapChapterSlider.addEventListener("input", () => {
      updateProgressSliderPreview(Number(elements.tapChapterSlider.value) - 1);
    });

    elements.tapChapterSlider.addEventListener("change", () => {
      commitProgressSliderChapter(Number(elements.tapChapterSlider.value) - 1);
    });
  }

  elements.tapVocabButton.addEventListener("click", () => {
    openMobileSheet(elements.mobileVocabSheet);
  });

  elements.tapModeButton.addEventListener("click", () => {
    openMobileSheet(elements.mobileModeSheet);
  });
  bindClick(elements.readerHelpButton, openReaderHelp, "Reader contextual help");
  bindClick(elements.readerHelpCloseButton, closeReaderHelp, "Reader contextual help close");
  bindClick(elements.readerHelpOpenHelpCenterButton, () => {
    closeReaderHelp();
    showView("settings");
    openHelpCenter();
  }, "Reader contextual help Help Center action");
  bindClick(elements.readerHelpOpenGuideButton, () => {
    closeReaderHelp();
    openBuiltInGuide();
  }, "Reader contextual help Guide action");

  elements.tapPrevChapterButton.addEventListener("click", () => {
    goToAdjacentChapter("previous");
  });

  elements.tapNextChapterButton.addEventListener("click", () => {
    goToAdjacentChapter("next");
  });

  elements.mobileSheetBackdrop.addEventListener("click", closeMobileSheets);

  document.querySelectorAll("[data-close-mobile-sheet]").forEach((button) => {
    button.addEventListener("click", closeMobileSheets);
  });

  elements.prevChapterButton.addEventListener("click", () => {
    goToAdjacentChapter("previous");
  });

  elements.nextChapterButton.addEventListener("click", () => {
    goToAdjacentChapter("next");
  });

  elements.bottomPrevChapterButton.addEventListener("click", () => {
    goToAdjacentChapter("previous");
  });

  elements.bottomNextChapterButton.addEventListener("click", () => {
    goToAdjacentChapter("next");
  });

  elements.backToTopButton.addEventListener("click", () => {
    resetReaderScroll();
  });

  for (const input of elements.modeInputs) {
    input.addEventListener("change", () => {
      switchReadingMode(input.value);
    });
  }

  for (const button of elements.mobileModeButtons) {
    button.addEventListener("click", () => {
      switchReadingMode(button.dataset.mobileMode);
      closeMobileSheets();
    });
  }

  elements.chapterContent.addEventListener("click", (event) => {
    const hit = event.target.closest("[data-vocab-term]");

    if (!hit) {
      hideBubble();
      return;
    }

    toggleBubble(hit.dataset.vocabTerm, event.clientX, event.clientY);
  });

  elements.chapterContent.addEventListener("keydown", (event) => {
    const hit = event.target.closest("[data-vocab-term]");

    if (!hit || !["Enter", " "].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const box = hit.getBoundingClientRect();
    toggleBubble(hit.dataset.vocabTerm, box.left, box.bottom);
  });

  elements.vocabList.addEventListener("click", (event) => {
    handleVocabularyPreviewClick(event);
  });

  elements.mobileVocabList.addEventListener("click", (event) => {
    const result = handleVocabularyPreviewClick(event);

    if (result !== "action") {
      closeMobileSheets();
    }
  });

  elements.vocabBubble.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-bubble]")) {
      hideBubble();
    }
  });

  elements.readerPane.addEventListener("click", handleReaderPaneTap);
  elements.readerPane.addEventListener("scroll", scheduleScrollProgressSave, { passive: true });

  document.addEventListener("click", (event) => {
    const clickedVocabularyTrigger = event.target.closest("[data-vocab-term]");
    const clickedBubble = event.target.closest("#vocabBubble");

    if (!clickedVocabularyTrigger && !clickedBubble) {
      hideBubble();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!elements.forgetBookModal.hidden) {
        closeForgetBookModal();
      }

      hideBubble();
      closeMobileSheets();
      hideReaderTapControls();
    }
  });

  window.addEventListener("resize", hideBubble);
  window.addEventListener("scroll", hideBubble, true);
  window.addEventListener("scroll", scheduleScrollProgressSave, { passive: true });
  window.addEventListener("beforeunload", () => {
    saveCurrentReadingProgress({ force: true });
  });
  updateScriptDiagnostics();
  renderImportDiagnostics();
  renderBookGlossary();
  renderNavigationControls();
  state.eventsBound = true;
}

function bindClick(element, handler, label = "control") {
  if (!element) {
    console.warn(`${label} is unavailable; leaving the rest of the app controls active.`);
    return;
  }

  element.addEventListener("click", handler);
}

async function loadSeedData() {
  try {
    const coreVocabulary = await loadVocabularyData(["../data/vocabulary.json"]);
    let slangAndIdioms = [];

    try {
      slangAndIdioms = await loadVocabularyData(["../data/slang_idioms.json"]);
    } catch (error) {
      console.warn("Optional slang/idiom data could not be loaded.", error);
    }

    state.vocabularyItems = [...coreVocabulary, ...slangAndIdioms];
    state.vocabularyIndex = createVocabularyIndex(state.vocabularyItems);
    state.vocabularyLoadError = null;
    setLocalizedStatus("home.import.status.vocabularyLoaded", "info", {
      count: state.vocabularyItems.length
    });
  } catch (error) {
    console.warn(error);
    state.vocabularyItems = [];
    state.vocabularyIndex = new Map();
    state.vocabularyLoadError = error;
    setLocalizedStatus("home.import.status.vocabularyUnavailable", "error");
  }

  try {
    state.protectedTerms = await loadProtectedTerms();
    refreshBookGlossary();
  } catch (error) {
    console.warn("Protected terms could not be loaded.", error);
  }
}

function syncModeControls() {
  for (const input of elements.modeInputs) {
    input.checked = input.value === state.currentMode;
  }

  if (elements.mobileModeButton) {
    elements.mobileModeButton.textContent = t("reader.mobile.modeSummary", {
      mode: getModeLabel(state.currentMode)
    });
  }

  if (elements.tapModeButton) {
    elements.tapModeButton.textContent = getCompactModeLabel(state.currentMode);
  }

  for (const button of elements.mobileModeButtons || []) {
    const isActive = button.dataset.mobileMode === state.currentMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function getModeLabel(mode) {
  if (mode === MODES.CHINESE) {
    return t("reader.mode.chinese");
  }

  if (mode === MODES.CLOZE_MIXED) {
    return t("reader.mode.mixed");
  }

  return t("reader.mode.english");
}

function getCompactModeLabel() {
  return t("reader.controls.mode");
}

function refreshReaderChromeLanguage() {
  if (!elements.bookMeta) {
    return;
  }

  syncModeControls();
  renderBookMeta();
  renderChapterOptions();
  renderBookGlossary();
  const chapter = getCurrentChapter();
  if (!chapter || chapter.renderError) {
    renderCurrentChapter();
  } else {
    renderVocabularyPreview(chapter.vocabularyPreview || [], chapter);
  }
  const previewCount = Number(elements.mobileVocabButton?.dataset.previewCount || 0);
  updateMobileVocabButton(previewCount);
  refreshOpenVocabularyBubbleLanguage();
}

function switchReadingMode(nextMode) {
  if (!nextMode || nextMode === state.currentMode) {
    syncModeControls();
    return;
  }

  if (state.isBuiltInGuideOpen && state.book?.isBuiltInGuide) {
    state.currentMode = nextMode;
    storage.set("last-mode", state.currentMode);
    syncModeControls();
    syncGuideBookForReadingMode(state.book, nextMode);
    renderBookMeta();
    renderChapterOptions();
    renderCurrentChapter();
    return;
  }

  if (!state.book || !state.currentChapterId) {
    state.currentMode = nextMode;
    storage.set("last-mode", state.currentMode);
    syncModeControls();
    renderCurrentChapter();
    return;
  }

  const progressBeforeSwitch = createCurrentReadingProgressRecord({
    currentMode: nextMode
  });
  const preservedHeight = elements.chapterContent?.scrollHeight || 0;

  suppressScrollProgressSaves();
  preserveChapterContentHeight(preservedHeight);
  state.currentMode = nextMode;
  storage.set("last-mode", state.currentMode);
  state.lastScrollProgress = progressBeforeSwitch;

  hideBubble();
  clearLocatedHighlights();
  syncModeControls();
  renderCurrentChapter();
  restoreReaderScrollFromProgress(progressBeforeSwitch);
  persistReadingProgressRecord(progressBeforeSwitch);
}

function preserveChapterContentHeight(height) {
  if (!elements.chapterContent || !height) {
    return;
  }

  elements.chapterContent.style.minHeight = `${Math.ceil(height)}px`;
}

function clearPreservedChapterContentHeight() {
  if (elements.chapterContent) {
    elements.chapterContent.style.minHeight = "";
  }
}

function openMobileSheet(sheet) {
  if (!sheet) {
    return;
  }

  hideBubble();
  closeReaderHelp();
  hideReaderTapControls();
  closeMobileSheets();
  if (sheet === elements.mobileProgressSheet) {
    resetProgressSliderPreview();
  }
  elements.mobileSheetBackdrop.hidden = false;
  sheet.hidden = false;
  sheet.querySelector("button")?.focus({ preventScroll: true });
}

function closeMobileSheets() {
  if (elements.mobileSheetBackdrop) {
    elements.mobileSheetBackdrop.hidden = true;
  }

  [
    elements.mobileChapterSheet,
    elements.mobileProgressSheet,
    elements.mobileVocabSheet,
    elements.mobileModeSheet
  ].forEach((sheet) => {
    if (sheet) {
      sheet.hidden = true;
    }
  });
}

function openReaderHelp() {
  if (!elements.readerHelpPanel) {
    return;
  }

  hideBubble();
  closeMobileSheets();
  elements.readerHelpPanel.hidden = false;
  elements.readerHelpPanel.querySelector("button")?.focus({ preventScroll: true });
}

function closeReaderHelp() {
  if (elements.readerHelpPanel) {
    elements.readerHelpPanel.hidden = true;
  }
}

function resetProgressSliderPreview() {
  state.pendingChapterIndex = getCurrentChapterIndex();
  renderProgressPanel();
}

function updateProgressSliderPreview(targetIndex) {
  const chapters = state.book?.chapters || [];
  const safeIndex = clampIndexForChapters(targetIndex, chapters.length);
  state.pendingChapterIndex = safeIndex;
  renderProgressPanel({ usePendingIndex: true });
}

function commitProgressSliderChapter(targetIndex) {
  const chapters = state.book?.chapters || [];
  const safeIndex = clampIndexForChapters(targetIndex, chapters.length);

  if (safeIndex === -1) {
    renderProgressPanel();
    return;
  }

  state.pendingChapterIndex = safeIndex;
  renderProgressPanel({ usePendingIndex: true });

  const currentIndex = getCurrentChapterIndex();
  if (safeIndex === currentIndex) {
    return;
  }

  selectChapter(chapters[safeIndex].id);
}

function clampIndexForChapters(index, total) {
  const numericIndex = Number(index);

  if (!Number.isFinite(numericIndex) || total <= 0) {
    return -1;
  }

  return Math.min(Math.max(Math.round(numericIndex), 0), total - 1);
}

function handleReaderPaneTap(event) {
  if (state.currentView !== "reader" || shouldIgnoreReaderTap(event.target)) {
    return;
  }

  toggleReaderTapControls();
}

function shouldIgnoreReaderTap(target) {
  return Boolean(target?.closest(`
    button,
    a,
    input,
    select,
    textarea,
    label,
    summary,
    [data-no-reader-toggle],
    [data-vocab-term],
    .vocab-bubble,
    .mobile-sheet,
    .mobile-sheet-backdrop,
    .reader-controls,
    .mobile-reader-actions,
    .reader-sidebar
  `));
}

function toggleReaderTapControls() {
  setReaderTapControlsVisible(!state.readerControlsVisible);
}

function hideReaderTapControls() {
  closeReaderHelp();
  setReaderTapControlsVisible(false, { skipProgressSave: true });
}

function setReaderTapControlsVisible(isVisible, options = {}) {
  state.readerControlsVisible = Boolean(isVisible);

  if (elements.readerTapControls) {
    elements.readerTapControls.hidden = !state.readerControlsVisible;
  }

  if (state.readerControlsVisible) {
    renderNavigationControls();
  }

  if (!options.skipProgressSave) {
    saveCurrentReadingProgress();
  }
}

async function handleSelectedFile(file) {
  resetImportDiagnostics(file);
  if (elements.debugPanel) {
    elements.debugPanel.open = false;
  }
  updateScriptDiagnostics();
  renderImportDiagnostics();

  if (!file) {
    setLocalizedStatus("home.import.status.noFile", "error");
    updateImportDiagnostics({
      currentStep: "No file selected",
      lastErrorName: "NoFileSelected",
      lastErrorMessage: "The file picker did not return a file."
    });
    revealDebugPanel();
    return;
  }

  if (file.size === 0) {
    setLocalizedStatus("home.import.status.emptyFile", "error");
    updateImportDiagnostics({
      currentStep: "Rejected empty file",
      lastErrorName: "EmptyFile",
      lastErrorMessage: "The selected file has 0 bytes."
    });
    revealDebugPanel();
    return;
  }

  if (!file.name.toLowerCase().endsWith(".epub")) {
    setLocalizedStatus("home.import.status.invalidFile", "error");
    updateImportDiagnostics({
      currentStep: "Rejected file extension",
      lastErrorName: "InvalidExtension",
      lastErrorMessage: `Expected .epub but got ${getFileExtension(file.name) || "no extension"}.`
    });
    revealDebugPanel();
    return;
  }

  setLocalizedStatus("home.import.status.loading", "info", { fileName: file.name });
  hideBubble();

  await loadAndOpenEpubFile(file, {
    persist: true
  });
}

async function loadAndOpenEpubFile(file, options = {}) {
  try {
    const result = await loadEpubFromFile(file, {
      onDiagnostic: updateImportDiagnostics
    });
    state.book = {
      ...result.book,
      chapters: normalizeChapterList(result.book.chapters)
    };
    state.epubHandle = result.handle;
    state.currentChapterId = state.book.chapters[0]?.id || null;
    state.bookGlossary = [];
    state.lastScrollProgress = options.progress || null;
    state.isBuiltInGuideOpen = false;

    renderBookMeta();
    renderChapterOptions();
    renderNavigationControls();
    renderBookGlossary();
    storage.set("last-book-summary", {
      id: state.book.id,
      title: state.book.title,
      author: state.book.author,
      chapterCount: state.book.chapters.length
    });

    if (options.persist) {
      try {
        const savedMetadata = await saveStoredBook(file, state.book);
        state.currentBookKey = savedMetadata.bookKey;
        showSavedBookControls(savedMetadata);
      } catch (error) {
        console.warn("Could not save EPUB locally.", error);
        setLocalizedStatus("home.import.status.saveFailed", "error");
      }
    } else if (options.bookKey) {
      state.currentBookKey = options.bookKey;
    }

    if (!state.book.chapters.length) {
      setLocalizedStatus("home.import.status.noReadableChapters", "error");
      renderCurrentChapter();
      return;
    }

    const restoreChapterId = options.progress
      ? resolveProgressChapterId(state.book.chapters, options.progress)
      : null;
    state.currentChapterId = restoreChapterId || state.currentChapterId;
    const shouldRestoreScroll =
      Boolean(options.progress?.scrollRatio !== undefined) &&
      options.progress?.currentChapterId === state.currentChapterId;

    if (state.currentChapterId) {
      await selectChapter(state.currentChapterId, {
        skipCurrentProgressSave: true,
        skipProgressSave: Boolean(options.progress) || !state.currentBookKey
      });
    }

    const currentChapter = getCurrentChapter();

    if (!currentChapter?.renderError) {
      setLocalizedStatus("home.import.status.loaded", "success", {
        title: state.book.title,
        count: state.book.chapters.length
      });
    }

    showView("reader");

    if (shouldRestoreScroll) {
      restoreReaderScrollFromProgress(options.progress);
    }
  } catch (error) {
    console.error("[Slash Reader EPUB] Import failed", error);
    if (error.cause) {
      console.error("[Slash Reader EPUB] Underlying cause", error.cause);
    }

    updateImportDiagnostics({
      currentStep: error.step || state.importDiagnostics.currentStep || "Load failed",
      lastErrorName: error.name || "Error",
      lastErrorMessage: error.message || "EPUB failed to load."
    });
    revealDebugPanel();
    setLocalizedStatus("home.import.status.failed", "error");
  }
}

async function refreshHomeLibraryState() {
  await Promise.all([
    refreshContinueReading(),
    renderLocalLibrary(),
    renderVocabularyLibrarySummary()
  ]);
}

async function renderVocabularyLibrarySummary() {
  if (
    !elements.vocabularyLearningCount ||
    !elements.vocabularyMasteredCount ||
    !elements.vocabularyHiddenCount ||
    !elements.vocabularyLibraryLevel ||
    !elements.vocabularyLibraryEmpty
  ) {
    return;
  }

  try {
    const getProfile = await loadVocabularyProfileReader();
    const profile = await getProfile();
    renderVocabularyLibrarySummaryState(getVocabularyLibrarySummaryState(profile));
  } catch (error) {
    console.warn("Could not render Vocabulary Library summary.", error);
    renderVocabularyLibrarySummaryState(getVocabularyLibrarySummaryState(null, { hasError: true }));
  }
}

async function openVocabularyLibraryView() {
  hideBubble();
  closeMobileSheets();
  hideReaderTapControls();
  showView("vocabulary-library");
}

async function renderVocabularyLibraryView() {
  if (
    state.currentView !== "vocabulary-library" ||
    !elements.vocabularyLibraryView ||
    !elements.vocabularyLibraryTermList ||
    !elements.vocabularyLibraryPanelStatus
  ) {
    return;
  }

  try {
    const getProfile = await loadVocabularyProfileReader();
    const profile = await getProfile();
    renderVocabularyLibraryPageSummaryState(getVocabularyLibrarySummaryState(profile));
    renderVocabularyExportState(getVocabularyExportState(profile));
    renderVocabularyLibraryPanelState(getVocabularyLibraryDetailState(profile, state.vocabularyLibraryActiveTab));
  } catch (error) {
    console.warn("Could not render Vocabulary Library view.", error);
    renderVocabularyLibraryPageSummaryState(getVocabularyLibrarySummaryState(null, { hasError: true }));
    renderVocabularyExportState(getVocabularyExportState(null, { hasError: true }));
    renderVocabularyLibraryPanelState(getVocabularyLibraryDetailState(null, state.vocabularyLibraryActiveTab, {
      hasError: true
    }));
  }
}

function renderVocabularyLibraryPageSummaryState(summary) {
  if (
    !elements.vocabularyPageLearningCount ||
    !elements.vocabularyPageMasteredCount ||
    !elements.vocabularyPageHiddenCount ||
    !elements.vocabularyPageLevel
  ) {
    return;
  }

  elements.vocabularyPageLearningCount.textContent = String(summary.learningCount);
  elements.vocabularyPageMasteredCount.textContent = String(summary.masteredCount);
  elements.vocabularyPageHiddenCount.textContent = String(summary.hiddenCount);
  setTranslatedText(elements.vocabularyPageLevel, "vocabulary.level.current", {
    level: String(summary.selectedLevel || "").replace(/^level/, "") || "-"
  });
  renderVocabularyLevelSelectorState(getVocabularyLevelSelectorState(summary, {
    hasError: summary.hasError
  }));
}

function renderVocabularyLevelSelectorState(levelState) {
  if (!elements.vocabularyLevelSelect) {
    return;
  }

  elements.vocabularyLevelSelect.value = levelState.selectedLevel;
  elements.vocabularyLevelSelect.disabled = levelState.disabled;

  for (const optionElement of elements.vocabularyLevelSelect.options || []) {
    optionElement.selected = optionElement.value === levelState.selectedLevel;
    setTranslatedText(optionElement, "vocabulary.level.option", {
      level: String(optionElement.value || "").replace(/^level/, "") || "-"
    });
  }

  if (elements.vocabularyLevelHelp) {
    setTranslatedText(elements.vocabularyLevelHelp, "vocabulary.level.help");
  }
}

function renderVocabularyExportState(exportState) {
  if (elements.copyLearningButton) {
    elements.copyLearningButton.disabled = exportState.copyLearningDisabled;
  }

  if (elements.downloadLearningTxtButton) {
    elements.downloadLearningTxtButton.disabled = exportState.downloadLearningTxtDisabled;
  }

  if (elements.copyAllVocabularyButton) {
    elements.copyAllVocabularyButton.disabled = exportState.copyAllDisabled;
  }

  if (elements.downloadVocabularyCsvButton) {
    elements.downloadVocabularyCsvButton.disabled = exportState.downloadCsvDisabled;
  }

  if (exportState.hasError) {
    setVocabularyExportFeedback("vocabulary.export.feedback.unavailable", "error");
  } else if (exportState.totalCount === 0) {
    setVocabularyExportFeedback("vocabulary.export.feedback.empty");
  } else {
    setVocabularyExportFeedback("");
  }
}

function renderVocabularyLibraryPanelState(detailState) {
  for (const tabButton of elements.vocabularyLibraryTabs || []) {
    const tabState = detailState.tabs.find((tab) => tab.id === tabButton.dataset.vocabularyTab);

    if (!tabState) {
      continue;
    }

    const labelKey = `vocabulary.tabs.${tabState.id}`;
    setTranslatedText(tabButton, "vocabulary.tabs.labelCount", {
      labelKey,
      count: tabState.count
    });
    tabButton.setAttribute("aria-selected", tabState.isActive ? "true" : "false");
    tabButton.classList.toggle("is-active", tabState.isActive);
  }

  elements.vocabularyLibraryPanelStatus.hidden = !detailState.hasError;
  if (detailState.hasError) {
    setTranslatedText(elements.vocabularyLibraryPanelStatus, "vocabulary.panel.unavailable");
  } else {
    setTranslatedText(elements.vocabularyLibraryPanelStatus, "");
  }

  if (detailState.hasError) {
    elements.vocabularyLibraryTermList.innerHTML = "";
    return;
  }

  if (!detailState.terms.length) {
    const emptyKey = {
      learning: "vocabulary.tabs.empty.learning",
      mastered: "vocabulary.tabs.empty.mastered",
      hidden: "vocabulary.tabs.empty.hidden"
    }[detailState.activeTab] || "vocabulary.tabs.empty.default";
    elements.vocabularyLibraryTermList.innerHTML = `
      <li class="empty-state" data-i18n="${escapeHtml(emptyKey)}">${escapeHtml(t(emptyKey))}</li>
    `;
    return;
  }

  elements.vocabularyLibraryTermList.innerHTML = detailState.terms
    .map((term) => `
      <li>
        <span class="vocabulary-term-text">${escapeHtml(term)}</span>
        <button
          type="button"
          class="vocabulary-remove-button"
          data-vocabulary-remove
          data-vocabulary-term="${escapeHtml(term)}"
          data-i18n="vocabulary.row.remove"
        >${escapeHtml(t("vocabulary.row.remove"))}</button>
      </li>
    `)
    .join("");
}

function setVocabularyFeedbackElement(element, key = "", tone = "neutral", params = {}) {
  if (!element) {
    return;
  }

  setTranslatedText(element, key, params);
  element.dataset.tone = tone;
}

function setVocabularyManualFeedback(key = "", tone = "neutral", params = {}) {
  setVocabularyFeedbackElement(elements.vocabularyManualFeedback, key, tone, params);
}

function setVocabularyExportFeedback(key = "", tone = "neutral", params = {}) {
  setVocabularyFeedbackElement(elements.vocabularyExportFeedback, key, tone, params);
}

function setVocabularyBackupFeedback(key = "", tone = "neutral", params = {}) {
  setVocabularyFeedbackElement(elements.vocabularyBackupFeedback, key, tone, params);
}

function setVocabularyLevelFeedback(key = "", tone = "neutral", params = {}) {
  setVocabularyFeedbackElement(elements.vocabularyLevelFeedback, key, tone, params);
}

async function handleVocabularyLevelChange(event) {
  const select = event.currentTarget;
  const nextLevel = select?.value;

  if (!VOCABULARY_LEVEL_VALUES.has(nextLevel)) {
    setVocabularyLevelFeedback("vocabulary.level.feedback.invalid", "error");
    await renderVocabularyLibraryView();
    return;
  }

  select.disabled = true;
  setVocabularyLevelFeedback("vocabulary.level.feedback.saving");

  try {
    const setVocabularyComfortLevel = await loadVocabularyLevelSetter();
    const profile = await setVocabularyComfortLevel(nextLevel);

    resetVocabularyPersonalizationCache();
    renderVocabularyLibraryPageSummaryState(getVocabularyLibrarySummaryState(profile));
    await renderVocabularyLibraryView();
    renderVocabularyLibrarySummary();
    refreshCurrentVocabularyPreviewPersonalization();
    setVocabularyLevelFeedback("vocabulary.level.feedback.saved", "success");
  } catch (error) {
    console.warn("Could not update Vocabulary Level.", error);
    setVocabularyLevelFeedback("vocabulary.level.feedback.error", "error");
    await renderVocabularyLibraryView();
  } finally {
    if (elements.vocabularyLevelSelect) {
      elements.vocabularyLevelSelect.disabled = false;
    }
  }
}

async function copyTextToClipboard(text) {
  const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;

  if (!clipboard?.writeText) {
    throw new Error("Clipboard API is unavailable.");
  }

  await clipboard.writeText(text);
}

function downloadTextFile(contents, filename, mimeType) {
  if (
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function" ||
    typeof document === "undefined" ||
    !document.body
  ) {
    throw new Error("Download APIs are unavailable.");
  }

  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function readTextFile(file) {
  if (!file) {
    throw new Error("Choose a JSON backup file.");
  }

  if (typeof file.text === "function") {
    return file.text();
  }

  if (typeof FileReader === "undefined") {
    throw new Error("File reading APIs are unavailable.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read backup file."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file, "utf-8");
  });
}

async function handleVocabularyProfileBackup() {
  const button = elements.backupVocabularyProfileButton;

  if (button) {
    button.disabled = true;
  }

  try {
    const getProfile = await loadVocabularyProfileReader();
    const helpers = await loadVocabularyProfileBackupHelpers();
    const profile = await getProfile();
    const backup = helpers.createVocabularyProfileBackup(profile);

    downloadTextFile(
      JSON.stringify(backup, null, 2),
      "interleaf-reader-vocabulary-profile.json",
      "application/json;charset=utf-8"
    );
    setVocabularyBackupFeedback("vocabulary.backup.feedback.downloaded", "success");
  } catch (error) {
    console.warn("Vocabulary profile backup failed.", error);
    setVocabularyBackupFeedback("vocabulary.backup.feedback.failed", "error");
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function getVocabularyRestoreFeedbackKey(error) {
  const message = String(error?.message || "");

  if (/valid JSON/i.test(message)) {
    return "vocabulary.backup.feedback.malformed";
  }

  if (/Unsupported vocabulary profile backup (schema|field)/i.test(message)) {
    return "vocabulary.backup.feedback.schema";
  }

  return "vocabulary.backup.feedback.restoreFailed";
}

async function handleVocabularyProfileRestore(event) {
  const input = event.currentTarget;
  const file = input?.files?.[0] || null;

  if (!file) {
    setVocabularyBackupFeedback("vocabulary.backup.feedback.cancelled");
    return;
  }

  if (elements.restoreVocabularyProfileButton) {
    elements.restoreVocabularyProfileButton.disabled = true;
  }

  setVocabularyBackupFeedback("vocabulary.backup.feedback.restoring");

  try {
    const helpers = await loadVocabularyProfileBackupHelpers();
    const jsonText = await readTextFile(file);
    const profile = helpers.parseVocabularyProfileBackupJson(jsonText);

    await helpers.saveVocabularyProfile(profile);
    resetVocabularyPersonalizationCache();
    await renderVocabularyLibraryView();
    renderVocabularyLibrarySummary();
    refreshCurrentVocabularyPreviewPersonalization();
    setVocabularyBackupFeedback("vocabulary.backup.feedback.restored", "success");
  } catch (error) {
    console.warn("Vocabulary profile restore failed.", error);
    setVocabularyBackupFeedback(getVocabularyRestoreFeedbackKey(error), "error");
  } finally {
    if (elements.restoreVocabularyProfileButton) {
      elements.restoreVocabularyProfileButton.disabled = false;
    }

    if (input) {
      input.value = "";
    }
  }
}

async function handleVocabularyExportAction(action) {
  const actionButton = {
    "copy-learning": elements.copyLearningButton,
    "download-learning-txt": elements.downloadLearningTxtButton,
    "copy-all": elements.copyAllVocabularyButton,
    "download-csv": elements.downloadVocabularyCsvButton
  }[action];
  let latestExportState = null;

  if (actionButton) {
    actionButton.disabled = true;
  }

  try {
    const getProfile = await loadVocabularyProfileReader();
    const profile = await getProfile();
    const exportState = getVocabularyExportState(profile);
    latestExportState = exportState;

    renderVocabularyExportState(exportState);

    if (
      (action === "copy-learning" && exportState.copyLearningDisabled) ||
      (action === "download-learning-txt" && exportState.downloadLearningTxtDisabled)
    ) {
      setVocabularyExportFeedback("vocabulary.export.feedback.empty");
      return;
    }

    if ((action === "copy-all" || action === "download-csv") && exportState.totalCount === 0) {
      setVocabularyExportFeedback("vocabulary.export.feedback.empty");
      return;
    }

    if (action === "copy-learning") {
      await copyTextToClipboard(formatVocabularyLearningExportText(profile));
      setVocabularyExportFeedback("vocabulary.export.feedback.copiedLearning", "success");
      return;
    }

    if (action === "download-learning-txt") {
      downloadTextFile(
        formatVocabularyLearningExportText(profile),
        "interleaf-reader-bbdc-learning-words.txt",
        "text/plain;charset=utf-8"
      );
      setVocabularyExportFeedback("vocabulary.export.feedback.downloadedLearningTxt", "success");
      return;
    }

    if (action === "copy-all") {
      await copyTextToClipboard(formatVocabularyAllExportText(profile));
      setVocabularyExportFeedback("vocabulary.export.feedback.copiedAll", "success");
      return;
    }

    if (action === "download-csv") {
      downloadTextFile(
        formatVocabularyCsvExport(profile),
        "interleaf-reader-vocabulary.csv",
        "text/csv;charset=utf-8"
      );
      setVocabularyExportFeedback("vocabulary.export.feedback.downloadedCsv", "success");
    }
  } catch (error) {
    console.warn("Vocabulary export failed.", error);
    const feedbackKey = action === "copy-learning" || action === "copy-all"
      ? "vocabulary.export.feedback.copyFailed"
      : "vocabulary.export.feedback.failed";
    setVocabularyExportFeedback(feedbackKey, "error");
  } finally {
    if (actionButton) {
      const disabledByState = latestExportState
        ? {
          "copy-learning": latestExportState.copyLearningDisabled,
          "download-learning-txt": latestExportState.downloadLearningTxtDisabled,
          "copy-all": latestExportState.copyAllDisabled,
          "download-csv": latestExportState.downloadCsvDisabled
        }[action]
        : false;
      actionButton.disabled = Boolean(disabledByState);
    }
  }
}

async function handleManualVocabularyAdd(event) {
  event.preventDefault();

  const input = elements.vocabularyManualAddInput;
  const addButton = elements.vocabularyManualAddButton;

  if (!input) {
    setVocabularyManualFeedback("vocabulary.manual.feedback.inputUnavailable", "error");
    return;
  }

  if (addButton) {
    addButton.disabled = true;
  }

  try {
    const getProfile = await loadVocabularyProfileReader();
    const profile = await getProfile();
    const addState = getManualVocabularyAddState(profile, input.value);

    if (!addState.shouldSave) {
      const feedbackKey = {
        empty: "vocabulary.manual.feedback.empty",
        "too-long": "vocabulary.manual.feedback.tooLong",
        "already-learning": "vocabulary.manual.feedback.alreadyLearning"
      }[addState.reason] || "vocabulary.manual.feedback.error";
      setVocabularyManualFeedback(
        feedbackKey,
        addState.reason === "already-learning" ? "neutral" : "error",
        { maxLength: MANUAL_VOCABULARY_MAX_LENGTH }
      );
      return;
    }

    const helpers = await loadVocabularyProfileActionHelpers();
    await helpers.add(addState.term);
    resetVocabularyPersonalizationCache();
    input.value = "";
    await renderVocabularyLibraryView();
    renderVocabularyLibrarySummary();
    const feedbackKey = {
      "move-from-mastered": "vocabulary.manual.feedback.movedFromMastered",
      "move-from-hidden": "vocabulary.manual.feedback.movedFromHidden",
      new: "vocabulary.manual.feedback.added"
    }[addState.reason] || "vocabulary.manual.feedback.added";
    setVocabularyManualFeedback(feedbackKey, "success");
  } catch (error) {
    console.warn("Could not add manual vocabulary word.", error);
    setVocabularyManualFeedback("vocabulary.manual.feedback.error", "error");
  } finally {
    if (addButton) {
      addButton.disabled = false;
    }
  }
}

async function handleVocabularyLibraryTermListClick(event) {
  const removeButton = event.target.closest("[data-vocabulary-remove]");

  if (!removeButton) {
    return;
  }

  event.preventDefault();
  removeButton.disabled = true;

  try {
    const getProfile = await loadVocabularyProfileReader();
    const profile = await getProfile();
    const removeState = getVocabularyRemoveState(
      profile,
      removeButton.dataset.vocabularyTerm,
      state.vocabularyLibraryActiveTab
    );

    if (!removeState.shouldRemove) {
      setVocabularyManualFeedback(
        removeState.reason === "not-in-current-list"
          ? "vocabulary.remove.feedback.notInList"
          : "vocabulary.remove.feedback.error",
        removeState.reason === "not-in-current-list" ? "neutral" : "error"
      );
      await renderVocabularyLibraryView();
      return;
    }

    const helpers = await loadVocabularyProfileActionHelpers();
    await helpers.restore(removeState.term);
    resetVocabularyPersonalizationCache();
    await renderVocabularyLibraryView();
    renderVocabularyLibrarySummary();
    const feedbackKey = {
      "remove-learning": "vocabulary.remove.feedback.removedLearning",
      "remove-mastered": "vocabulary.remove.feedback.removedMastered",
      "remove-hidden": "vocabulary.remove.feedback.removedHidden"
    }[removeState.reason] || "vocabulary.remove.feedback.error";
    setVocabularyManualFeedback(feedbackKey, "success");
  } catch (error) {
    console.warn("Could not remove vocabulary word.", error);
    setVocabularyManualFeedback("vocabulary.remove.feedback.error", "error");
  } finally {
    removeButton.disabled = false;
  }
}

function renderVocabularyLibrarySummaryState(summary) {
  elements.vocabularyLearningCount.textContent = String(summary.learningCount);
  elements.vocabularyMasteredCount.textContent = String(summary.masteredCount);
  elements.vocabularyHiddenCount.textContent = String(summary.hiddenCount);
  setTranslatedText(elements.vocabularyLibraryLevel, "home.vocabulary.level", {
    level: String(summary.selectedLevel || "").replace(/^level/, "") || "-"
  });
  const noteKey = summary.hasError
    ? "home.vocabulary.note.unavailable"
    : summary.isEmpty
      ? "home.vocabulary.note.empty"
      : "home.vocabulary.note.saved";
  setTranslatedText(elements.vocabularyLibraryEmpty, noteKey);
  elements.vocabularyLibraryEmpty.dataset.state = summary.hasError
    ? "error"
    : summary.isEmpty
      ? "empty"
      : "active";
}

async function refreshContinueReading() {
  try {
    const savedBook = await getMostRecentStoredBook();

    if (state.book) {
      state.restoreCandidate = savedBook?.fileBlob ? savedBook : null;
      hideRestorePrompt();
      return;
    }

    if (!savedBook?.fileBlob) {
      state.restoreCandidate = null;
      state.isContinueReadingDismissed = false;
      hideRestorePrompt();
      return;
    }

    state.restoreCandidate = savedBook;

    if (!shouldShowContinueReading([savedBook], {
      hasInMemoryBook: Boolean(state.book),
      isContinueReadingDismissed: state.isContinueReadingDismissed
    })) {
      hideRestorePrompt();
      return;
    }

    showRestorePrompt(savedBook);
  } catch (error) {
    console.warn("Could not check for saved EPUB.", error);
  }
}

async function renderLocalLibrary() {
  if (!elements.libraryList || !elements.libraryEmpty) {
    return;
  }

  try {
    const books = await listSavedBooks();
    const libraryState = getLocalLibraryViewState(books, {
      includeBuiltInGuide: state.appPreferences?.guideVisibleInLibrary !== false
    });

    elements.libraryEmpty.hidden = !libraryState.showEmptyState;
    elements.libraryList.hidden = !libraryState.hasVisibleItems;

    if (!libraryState.hasVisibleItems) {
      setTranslatedText(elements.libraryEmpty, "home.library.empty");
      elements.libraryList.innerHTML = "";
      return;
    }

    elements.libraryList.innerHTML = libraryState.items
      .map((book) => book.isBuiltInGuide ? renderGuideLibraryCard(book) : renderLibraryCard(book))
      .join("");
  } catch (error) {
    console.warn("Could not render local library.", error);
    elements.libraryEmpty.hidden = false;
    elements.libraryList.hidden = true;
    setTranslatedText(elements.libraryEmpty, "home.library.unavailable");
    elements.libraryList.innerHTML = "";
  }
}

function renderGuideLibraryCard(book) {
  const title = book.title || "Interleaf Reader Guide";
  const author = book.author || "BookHeart";
  const progress = t("home.guide.progress");

  return `
    <article class="library-card library-card-guide" role="listitem" data-book-key="${escapeHtml(book.bookKey)}" data-book-kind="built-in-guide">
      <div class="library-card-body">
        <p class="library-card-badge">${escapeHtml(t("home.guide.badge"))}</p>
        <h3 class="library-card-title">${escapeHtml(title)}</h3>
        <p class="library-card-author">${escapeHtml(author)}</p>
        <p class="library-card-progress">${escapeHtml(progress)}</p>
        <p class="library-card-updated">${escapeHtml(t("home.guide.note"))}</p>
      </div>
      <div class="library-card-actions">
        <button type="button" class="library-open-button" data-open-book>${escapeHtml(t("home.library.open"))}</button>
        <button type="button" class="library-delete-button" data-hide-guide>${escapeHtml(t("guide.hide"))}</button>
      </div>
    </article>
  `;
}

function renderLibraryCard(book) {
  const title = book.title || book.fileName || t("home.library.untitled");
  const author = book.author && book.author !== "Unknown author" ? book.author : "";
  const showFileName = !book.title && book.fileName;
  const progress = formatSavedBookProgressLabel(book);
  const updated = book.updatedAt ? formatLibraryTimestamp(book.updatedAt) : "";

  return `
    <article class="library-card" role="listitem" data-book-key="${escapeHtml(book.bookKey)}">
      <div class="library-card-body">
        <h3 class="library-card-title">${escapeHtml(title)}</h3>
        ${author ? `<p class="library-card-author">${escapeHtml(author)}</p>` : ""}
        ${showFileName ? `<p class="library-card-filename">${escapeHtml(book.fileName)}</p>` : ""}
        <p class="library-card-progress">${escapeHtml(progress)}</p>
        ${updated ? `<p class="library-card-updated">${escapeHtml(t("home.library.lastRead", { date: updated }))}</p>` : ""}
      </div>
      <div class="library-card-actions">
        <button type="button" class="library-open-button" data-open-book>${escapeHtml(t("home.library.open"))}</button>
        <button type="button" class="library-delete-button" data-delete-book>${escapeHtml(t("home.library.forget"))}</button>
      </div>
    </article>
  `;
}

function formatLibraryTimestamp(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

async function openStoredBookRecord(savedBook, progress) {
  if (!savedBook?.fileBlob) {
    throw new Error("Saved EPUB file data is missing.");
  }

  setLocalizedStatus("home.library.opening", "info", {
    title: savedBook.title || savedBook.fileName || t("home.library.untitled")
  });
  hideBubble();

  const file = new File([savedBook.fileBlob], savedBook.fileName || "saved-book.epub", {
    type: savedBook.fileType || "application/epub+zip",
    lastModified: savedBook.lastModified || Date.now()
  });

  resetImportDiagnostics(file);
  updateScriptDiagnostics();
  renderImportDiagnostics();

  await loadAndOpenEpubFile(file, {
    persist: false,
    bookKey: savedBook.bookKey,
    progress
  });

  showSavedBookControls(savedBook);
  state.restoreCandidate = savedBook;
}

async function openSavedBookFromLibrary(bookKey) {
  try {
    const savedBook = await getStoredBook(bookKey);

    if (!savedBook?.fileBlob) {
      setLocalizedStatus("home.library.openMissing", "error");
      await refreshHomeLibraryState();
      return;
    }

    const progress = await getReadingProgress(bookKey);
    await openStoredBookRecord(savedBook, progress);
  } catch (error) {
    console.error("Saved EPUB open failed.", error);
    setLocalizedStatus("home.library.openFailed", "error");
    revealDebugPanel();
  }
}

async function openBuiltInGuide(options = {}) {
  const readingMode = options.mode || state.currentMode || MODES.ENGLISH_STUDY;
  const guideBook = syncGuideBookForReadingMode(createGuideBook(), readingMode);
  const requestedChapterIndex = Number.isInteger(options.chapterIndex) ? options.chapterIndex : 0;
  const safeChapterIndex = guideBook.chapters.length
    ? Math.min(Math.max(requestedChapterIndex, 0), guideBook.chapters.length - 1)
    : -1;

  setLocalizedStatus("home.library.opening", "info", { title: guideBook.title });
  hideBubble();
  closeMobileSheets();
  hideReaderTapControls();
  hideRestorePrompt();
  hideReaderSavedPanel();

  state.book = guideBook;
  state.epubHandle = null;
  state.currentBookKey = null;
  state.currentChapterId = safeChapterIndex >= 0 ? guideBook.chapters[safeChapterIndex].id : null;
  state.bookGlossary = [];
  state.lastScrollProgress = null;
  state.isBuiltInGuideOpen = true;
  state.currentMode = readingMode;
  storage.set("last-mode", state.currentMode);
  syncModeControls();

  renderBookMeta();
  renderChapterOptions();
  renderNavigationControls();
  renderBookGlossary();

  if (state.currentChapterId) {
    await selectChapter(state.currentChapterId, {
      skipCurrentProgressSave: true,
      skipProgressSave: true
    });
  } else {
    renderCurrentChapter();
  }

  showView("reader");
  setLocalizedStatus("home.library.opened", "success", { title: guideBook.title });
}

function openForgetBookModal(bookKey, displayTitle = "this book") {
  if (!bookKey || !elements.forgetBookModal) {
    return;
  }

  state.pendingForgetBook = {
    bookKey,
    displayTitle
  };

  elements.forgetBookBody.textContent = t("savedBook.forget.explanation");
  elements.forgetBookModal.hidden = false;
  hideBubble();
  closeMobileSheets();
  elements.confirmForgetBookButton.focus({ preventScroll: true });
}

function closeForgetBookModal() {
  if (elements.forgetBookModal) {
    elements.forgetBookModal.hidden = true;
  }

  state.pendingForgetBook = null;
}

async function confirmForgetBook() {
  const pendingBook = state.pendingForgetBook;

  if (!pendingBook?.bookKey) {
    closeForgetBookModal();
    await refreshHomeLibraryState();
    return;
  }

  elements.confirmForgetBookButton.disabled = true;

  try {
    await deleteSavedBookFromLibrary(pendingBook.bookKey, pendingBook.displayTitle);
  } finally {
    elements.confirmForgetBookButton.disabled = false;
    closeForgetBookModal();
  }
}

async function deleteSavedBookFromLibrary(bookKey, displayTitle) {
  try {
    await deleteStoredBook(bookKey);

    if (state.currentBookKey === bookKey) {
      state.currentBookKey = null;
      hideReaderSavedPanel();
    }

    if (state.restoreCandidate?.bookKey === bookKey) {
      state.restoreCandidate = null;
    }

    setLocalizedStatus("home.library.removed", "success", { title: displayTitle });
    await refreshHomeLibraryState();
  } catch (error) {
    console.error("Could not delete saved book.", error);
    setLocalizedStatus("home.library.removeFailed", "error");
    await refreshHomeLibraryState();
  }
}

function showView(view) {
  const visibility = getAppViewVisibility(view);
  state.currentView = visibility.currentView;

  if (elements.homeView) {
    elements.homeView.hidden = visibility.homeHidden;
  }

  if (elements.readerView) {
    elements.readerView.hidden = visibility.readerHidden;
  }

  if (elements.vocabularyLibraryView) {
    elements.vocabularyLibraryView.hidden = visibility.vocabularyLibraryHidden;
  }

  if (elements.settingsView) {
    elements.settingsView.hidden = visibility.settingsHidden;
  }

  if (visibility.currentView === "home") {
    window.scrollTo({ top: 0, behavior: "auto" });
    updateReturnToReaderPanel();
    renderLocalLibrary();
    renderVocabularyLibrarySummary();
  } else if (visibility.currentView === "vocabulary-library") {
    window.scrollTo({ top: 0, behavior: "auto" });
    renderVocabularyLibraryView();
  } else if (visibility.currentView === "settings") {
    window.scrollTo({ top: 0, behavior: "auto" });
    renderSettingsView();
  }
}

function updateReturnToReaderPanel() {
  if (!elements.returnToReaderPanel) {
    return;
  }

  if (!state.book) {
    elements.returnToReaderPanel.hidden = true;
    return;
  }

  const currentIndex = getCurrentChapterIndex();
  const progressText = formatChapterProgress(state.book.chapters, currentIndex);

  elements.returnToReaderSubtext.textContent = formatReturnToReaderSubtext(state.book, progressText, t);
  elements.returnToReaderPanel.hidden = false;
  hideRestorePrompt();
}

function renderRestorePromptCopy(savedBook = null) {
  setTranslatedText(elements.restoreTitle, "");
  const savedTitle = savedBook?.title || savedBook?.fileName;
  if (savedTitle) {
    elements.restoreTitle.textContent = savedTitle;
  } else {
    setTranslatedText(elements.restoreTitle, "home.continue.savedBook");
  }

  if (savedBook) {
    setTranslatedText(elements.restoreText, "");
    elements.restoreText.textContent = formatContinueReadingSubtext(savedBook, t);
  } else {
    setTranslatedText(elements.restoreText, "reader.saved.status");
  }
}

function showRestorePrompt(savedBook) {
  if (!elements.continueReadingPanel) {
    return;
  }

  renderRestorePromptCopy(savedBook);
  elements.continueReadingPanel.hidden = false;
}

function refreshContinueReadingLanguage() {
  if (!elements.continueReadingPanel) {
    return;
  }

  const wasHidden = elements.continueReadingPanel.hidden;
  renderRestorePromptCopy(state.restoreCandidate);
  elements.continueReadingPanel.hidden = wasHidden;
}

function showSavedBookControls(savedBook) {
  if (!elements.readerSavedPanel) {
    return;
  }

  elements.readerSavedText.textContent = t("reader.saved.status");
  elements.readerSavedPanel.hidden = false;
}

function hideRestorePrompt() {
  if (elements.continueReadingPanel) {
    elements.continueReadingPanel.hidden = true;
  }
}

function dismissContinueReading() {
  state.isContinueReadingDismissed = true;
  hideRestorePrompt();
}

function hideReaderSavedPanel() {
  if (elements.readerSavedPanel) {
    elements.readerSavedPanel.hidden = true;
  }
}

async function restoreSavedBook() {
  const savedBook = state.restoreCandidate;

  if (!savedBook?.fileBlob) {
    setLocalizedStatus("home.library.restoreMissing", "error");
    hideRestorePrompt();
    return;
  }

  try {
    const progress = await getReadingProgress(savedBook.bookKey);
    await openStoredBookRecord(savedBook, progress);
  } catch (error) {
    console.error("Saved EPUB restore failed.", error);
    setLocalizedStatus("home.library.restoreFailed", "error");
    revealDebugPanel();
  }
}

async function clearSavedBook() {
  const bookKey = state.currentBookKey || state.restoreCandidate?.bookKey;

  if (!bookKey) {
    hideRestorePrompt();
    setLocalizedStatus("home.library.noSavedData", "info");
    return;
  }

  try {
    await deleteStoredBook(bookKey);
    state.currentBookKey = null;
    state.restoreCandidate = null;
    hideRestorePrompt();
    hideReaderSavedPanel();
    setLocalizedStatus("home.library.cleared", "success");
    await refreshHomeLibraryState();
  } catch (error) {
    console.error("Could not clear saved book data.", error);
    setLocalizedStatus("home.library.clearFailed", "error");
  }
}

function renderBookMeta() {
  if (!state.book) {
    elements.bookMeta.innerHTML = `
      <p class="eyebrow" data-i18n="reader.empty.noBook">${escapeHtml(t("reader.empty.noBook"))}</p>
      <h2 data-i18n="reader.empty.chooseBook">${escapeHtml(t("reader.empty.chooseBook"))}</h2>
    `;
    return;
  }

  const metaLabel = state.book.isBuiltInGuide && state.book.guideModeLabel
    ? `${state.book.author} · ${state.book.guideModeLabel}`
    : state.book.author;

  elements.bookMeta.innerHTML = `
    <p class="eyebrow">${escapeHtml(metaLabel)}</p>
    <h2>${escapeHtml(state.book.title)}</h2>
  `;
}

function renderChapterOptions() {
  if (!state.book) {
    elements.chapterSelect.disabled = true;
    elements.chapterSelect.innerHTML = `<option data-i18n="reader.empty.noBook">${escapeHtml(t("reader.empty.noBook"))}</option>`;
    renderChapterList([]);
    renderNavigationControls();
    return;
  }

  if (!state.book.chapters.length) {
    elements.chapterSelect.disabled = true;
    elements.chapterSelect.innerHTML = `<option data-i18n="reader.empty.noChapters">${escapeHtml(t("reader.empty.noChapters"))}</option>`;
    renderChapterList([]);
    renderNavigationControls();
    return;
  }

  elements.chapterSelect.disabled = state.isLoadingChapter;
  elements.chapterSelect.innerHTML = state.book.chapters
    .map((chapter, index) => `
      <option value="${escapeHtml(chapter.id)}">${escapeHtml(chapter.title || t("reader.chapter.fallback", { number: index + 1 }))}</option>
    `)
    .join("");
  elements.chapterSelect.value = state.currentChapterId;
  renderChapterList(state.book.chapters);
  renderNavigationControls();
}

function setChapterListMarkup(markup) {
  if (elements.chapterList) {
    elements.chapterList.innerHTML = markup;
  }

  if (elements.mobileChapterList) {
    elements.mobileChapterList.innerHTML = markup;
  }
}

function renderChapterList(chapters) {
  if (!elements.chapterList && !elements.mobileChapterList) {
    return;
  }

  if (!state.book) {
    setChapterListMarkup(`<p class="empty-state compact-empty" data-i18n="reader.empty.importForChapters">${escapeHtml(t("reader.empty.importForChapters"))}</p>`);
    return;
  }

  if (!chapters.length) {
    setChapterListMarkup(`<p class="empty-state compact-empty" data-i18n="reader.empty.noReadableChapters">${escapeHtml(t("reader.empty.noReadableChapters"))}</p>`);
    return;
  }

  const total = chapters.length;
  const rows = chapters
    .map((chapter, index) => {
      const isActive = chapter.id === state.currentChapterId;
      const label = chapter.title || t("reader.chapter.fallback", { number: index + 1 });

      return `
        <button
          type="button"
          class="chapter-row${isActive ? " is-active" : ""}"
          data-chapter-id="${escapeHtml(chapter.id)}"
          role="option"
          aria-selected="${isActive ? "true" : "false"}"
          ${isActive ? "aria-current=\"page\"" : ""}
          ${state.isLoadingChapter ? "disabled" : ""}
        >
          <span class="chapter-row-label">${escapeHtml(label)}</span>
          <span class="chapter-row-index">${index + 1} / ${total}</span>
        </button>
      `;
    })
    .join("");

  setChapterListMarkup(rows);
}

async function selectChapter(chapterId, options = {}) {
  if (!state.book || !chapterId || state.isLoadingChapter) {
    return;
  }

  const chapterIndex = getChapterIndex(state.book.chapters, chapterId);

  if (chapterIndex === -1) {
    setLocalizedStatus("reader.status.chapterMissing", "error");
    return;
  }

  if (state.currentChapterId && state.currentChapterId !== chapterId && !options.skipCurrentProgressSave) {
    saveCurrentReadingProgress();
  }

  state.currentChapterId = chapterId;
  elements.chapterSelect.value = chapterId;
  hideBubble();
  hideReaderTapControls();
  clearPreservedChapterContentHeight();
  state.isLoadingChapter = true;
  renderNavigationControls();

  let chapter = getCurrentChapter();

  try {
    if (chapter && !chapter.originalHtml && !chapter.renderError) {
      setLocalizedStatus("reader.status.chapterLoading", "info", { title: chapter.title });

      chapter = await loadChapterContent(state.epubHandle, chapter);
      replaceChapter(chapter);
      refreshBookGlossary();
      setLocalizedStatus("reader.status.chapterRendered", "success", { title: chapter.title });
    }
  } catch (error) {
      console.error(error);
      replaceChapter({
        ...chapter,
        renderError: error.message || "Chapter failed to render.",
        originalHtml: "",
        plainText: ""
      });
      setLocalizedStatus("reader.status.chapterFailed", "error");
  } finally {
    state.isLoadingChapter = false;
    renderChapterOptions();
  }

  renderCurrentChapter();
  refreshBookGlossary();
  resetReaderScroll();

  if (!options.skipProgressSave) {
    saveCurrentReadingProgressAfterLayout();
  }
}

function renderCurrentChapter() {
  const chapter = getCurrentChapter();
  let rendered;
  const renderErrorPanel = () => {
    const title = chapter?.title || t("reader.chapter.errorFallbackTitle");
    return {
      html: `
        <section class="placeholder-panel">
          <h2>${escapeHtml(t("reader.chapter.errorTitle", { title }))}</h2>
          <p>${escapeHtml(t("reader.chapter.errorBody"))}</p>
        </section>
      `,
      vocabularyPreview: []
    };
  };

  if (!chapter) {
    rendered = {
      html: `
        <section class="placeholder-panel">
          <h2>${escapeHtml(t("reader.chapter.emptyTitle"))}</h2>
          <p>${escapeHtml(t("reader.chapter.emptyBody"))}</p>
        </section>
      `,
      vocabularyPreview: []
    };
  } else if (chapter.renderError) {
    rendered = renderErrorPanel();
  } else {
    try {
      rendered = renderChapterForMode(chapter, state.currentMode, {
        vocabularyItems: state.vocabularyItems,
        protectedTerms: state.protectedTerms,
        isBuiltInGuide: Boolean(state.book?.isBuiltInGuide)
      });
    } catch (error) {
      console.error(error);
      rendered = renderErrorPanel();
      setLocalizedStatus("reader.status.chapterFailed", "error");
    }
  }

  if (chapter) {
    chapter.unfilteredVocabularyPreview = rendered.vocabularyPreview;
    chapter.vocabularyPreview = rendered.vocabularyPreview;
  }

  elements.chapterContent.innerHTML = rendered.html;
  renderVocabularyPreview(rendered.vocabularyPreview, chapter);
  personalizeVocabularyPreviewForCurrentChapter(rendered.vocabularyPreview, chapter);
  renderNavigationControls();
}

function personalizeVocabularyPreviewForCurrentChapter(items = [], chapter = null) {
  const renderVersion = ++state.vocabularyPreviewRenderVersion;

  if (!chapter || !Array.isArray(items) || !items.length || state.vocabularyLoadError) {
    return;
  }

  getPersonalizedVocabularyPreviewItems(items, {
    onError: warnVocabularyPersonalizationFallback
  }).then((personalizedItems) => {
    if (renderVersion !== state.vocabularyPreviewRenderVersion) {
      return;
    }

    if (chapter !== getCurrentChapter()) {
      return;
    }

    if (chapter) {
      chapter.vocabularyPreview = personalizedItems;
    }

    renderVocabularyPreview(personalizedItems, chapter);
  }).catch((error) => {
    warnVocabularyPersonalizationFallback(error);
  });
}

function warnVocabularyPersonalizationFallback(error) {
  if (state.vocabularyPersonalizationWarningShown) {
    return;
  }

  console.warn("Vocabulary Preview personalization unavailable; showing unfiltered Preview.", error);
  state.vocabularyPersonalizationWarningShown = true;
}

function renderVocabularyPreview(items = [], chapter = null) {
  updateMobileVocabButton(0);

  if (state.vocabularyLoadError) {
    const html = `
      <li class="empty-state" data-i18n="reader.empty.previewLoadError">${escapeHtml(t("reader.empty.previewLoadError"))}</li>
    `;
    elements.vocabList.innerHTML = html;
    elements.mobileVocabList.innerHTML = html;
    return;
  }

  if (!chapter) {
    const html = `<li class="empty-state" data-i18n="reader.empty.previewWaiting">${escapeHtml(t("reader.empty.previewWaiting"))}</li>`;
    elements.vocabList.innerHTML = html;
    elements.mobileVocabList.innerHTML = html;
    return;
  }

  if (chapter.renderError) {
    const html = `<li class="empty-state" data-i18n="reader.empty.previewUnavailable">${escapeHtml(t("reader.empty.previewUnavailable"))}</li>`;
    elements.vocabList.innerHTML = html;
    elements.mobileVocabList.innerHTML = html;
    return;
  }

  if (!items.length) {
    const html = `<li class="empty-state" data-i18n="reader.empty.previewNone">${escapeHtml(t("reader.empty.previewNone"))}</li>`;
    elements.vocabList.innerHTML = html;
    elements.mobileVocabList.innerHTML = html;
    return;
  }

  const renderedItems = items
    .map(renderVocabularyPreviewItem)
    .filter(Boolean);

  if (!renderedItems.length) {
    const html = `<li class="empty-state" data-i18n="reader.empty.previewNone">${escapeHtml(t("reader.empty.previewNone"))}</li>`;
    elements.vocabList.innerHTML = html;
    elements.mobileVocabList.innerHTML = html;
    return;
  }

  updateMobileVocabButton(renderedItems.length);
  const html = items
    .map((item) => renderVocabularyPreviewListItem(item))
    .filter(Boolean)
    .join("");
  elements.vocabList.innerHTML = html;
  elements.mobileVocabList.innerHTML = html;
}

function renderVocabularyPreviewListItem(item, personalizationState = state.vocabularyPersonalizationState) {
  const previewHtml = renderVocabularyPreviewItem(item);

  if (!previewHtml) {
    return "";
  }

  const term = getVocabularyPreviewItemTerm(item);
  const normalizedTerm = normalizeTerm(term);
  const isSaved = isVocabularyPreviewItemSaved(item, personalizationState);
  const savedBadgeHtml = isSaved
    ? `<span class="vocab-saved-badge">${escapeHtml(t("reader.vocabularyNote.saved"))}</span>`
    : "";
  const saveButtonAttributes = isSaved
    ? ` class="vocab-action-save is-saved" disabled aria-disabled="true" title="${escapeHtml(t("reader.vocabularyNote.alreadySaved"))}"`
    : ` class="vocab-action-save"`;
  const actionsHtml = normalizedTerm
    ? `
      <div class="vocab-actions" aria-label="${escapeHtml(t("reader.vocabularyNote.actionsAria", { term }))}">
        <button type="button" data-vocab-action="known" data-vocab-term="${escapeHtml(normalizedTerm)}">${escapeHtml(t("reader.vocabularyNote.known"))}</button>
        <button type="button" data-vocab-action="add" data-vocab-term="${escapeHtml(normalizedTerm)}"${saveButtonAttributes}>${escapeHtml(t(isSaved ? "reader.vocabularyNote.saved" : "reader.vocabularyNote.save"))}</button>
        <button type="button" data-vocab-action="ignore" data-vocab-term="${escapeHtml(normalizedTerm)}">${escapeHtml(t("reader.vocabularyNote.hide"))}</button>
        ${savedBadgeHtml}
      </div>
    `
    : "";

  return `<li>${previewHtml}${actionsHtml}</li>`;
}

function updateMobileVocabButton(count) {
  if (elements.mobileVocabButton) {
    elements.mobileVocabButton.dataset.previewCount = String(count);
    elements.mobileVocabButton.textContent = t(
      count === 1 ? "reader.mobile.previewCount.one" : "reader.mobile.previewCount.other",
      { count }
    );
  }

  if (elements.tapVocabButton) {
    elements.tapVocabButton.textContent = t("reader.controls.preview");
  }
}

function handleVocabularyPreviewClick(event) {
  const actionButton = event.target.closest("[data-vocab-action]");

  if (actionButton) {
    event.preventDefault();
    event.stopPropagation();
    handleVocabularyPreviewAction(actionButton);
    return "action";
  }

  const trigger = event.target.closest("[data-vocab-term]");

  if (!trigger) {
    return null;
  }

  const box = trigger.getBoundingClientRect();
  const didLocate = locateVocabularyTerm(trigger.dataset.vocabTerm);

  if (!didLocate) {
    showBubble(trigger.dataset.vocabTerm, box.right, box.top);
  }

  return "term";
}

async function handleVocabularyPreviewAction(actionButton) {
  const action = actionButton.dataset.vocabAction;
  const term = actionButton.dataset.vocabTerm;

  actionButton.disabled = true;

  const result = await applyVocabularyPreviewAction(action, term, {
    invalidateCache: resetVocabularyPersonalizationCache,
    onError(error) {
      console.warn("Vocabulary profile action failed.", error);
    }
  });

  if (result.ok) {
    refreshCurrentVocabularyPreviewPersonalization();
    if (state.currentView === "vocabulary-library") {
      renderVocabularyLibraryView();
    } else {
      renderVocabularyLibrarySummary();
    }
  }

  actionButton.disabled = false;
}

function refreshCurrentVocabularyPreviewPersonalization() {
  const chapter = getCurrentChapter();

  if (!chapter) {
    return;
  }

  const sourceItems = chapter.unfilteredVocabularyPreview || chapter.vocabularyPreview || [];
  renderVocabularyPreview(sourceItems, chapter);
  personalizeVocabularyPreviewForCurrentChapter(sourceItems, chapter);
}

function refreshBookGlossary() {
  if (!state.book) {
    state.bookGlossary = [];
    renderBookGlossary();
    return;
  }

  const loadedChapters = state.book.chapters.filter((chapter) => {
    return chapter.plainText && !chapter.renderError;
  });

  state.bookGlossary = buildBookGlossary(loadedChapters, state.protectedTerms, {
    limit: 30
  });
  renderBookGlossary();
}

function renderBookGlossary() {
  if (!elements.glossaryList || !elements.glossaryCount) {
    return;
  }

  const items = (state.bookGlossary || [])
    .map(normalizeGlossaryTerm)
    .filter(isDisplayableGlossaryTerm);
  elements.glossaryCount.textContent = String(items.length);

  if (!state.book) {
    elements.glossaryList.innerHTML = `<li class="empty-state" data-i18n="reader.glossary.empty.import">${escapeHtml(t("reader.glossary.empty.import"))}</li>`;
    return;
  }

  if (!state.book.chapters.some((chapter) => chapter.plainText)) {
    elements.glossaryList.innerHTML = `<li class="empty-state" data-i18n="reader.glossary.empty.waiting">${escapeHtml(t("reader.glossary.empty.waiting"))}</li>`;
    return;
  }

  if (!items.length) {
    elements.glossaryList.innerHTML = `<li class="empty-state" data-i18n="reader.glossary.empty.none">${escapeHtml(t("reader.glossary.empty.none"))}</li>`;
    return;
  }

  const visibleItems = items.slice(0, 10);
  const hiddenCount = items.length - visibleItems.length;
  elements.glossaryList.innerHTML = visibleItems
    .map((item) => `
      <li>
        <span class="glossary-term">${escapeHtml(item.term)}</span>
        <span class="glossary-meta">${escapeHtml(item.category)} &middot; ${escapeHtml(item.recommendedAction)} &middot; ${Math.round(item.confidence * 100)}%</span>
        ${item.reason ? `<span class="glossary-reason">${escapeHtml(item.reason)}</span>` : ""}
      </li>
    `)
    .join("") + (hiddenCount > 0
      ? `<li class="empty-state">${escapeHtml(t("reader.glossary.showingCount", { visible: visibleItems.length, total: items.length }))}</li>`
      : "");
}

function getCurrentChapter() {
  return state.book?.chapters.find((chapter) => chapter.id === state.currentChapterId) || null;
}

function getCurrentChapterIndex() {
  return getChapterIndex(state.book?.chapters || [], state.currentChapterId);
}

function goToAdjacentChapter(direction) {
  const chapters = state.book?.chapters || [];
  const currentIndex = getCurrentChapterIndex();
  const targetIndex = getAdjacentChapterIndex(currentIndex, chapters.length, direction);

  if (targetIndex === -1) {
    return;
  }

  selectChapter(chapters[targetIndex].id);
}

function renderNavigationControls() {
  if (!elements.prevChapterButton || !elements.nextChapterButton || !elements.chapterProgress) {
    return;
  }

  const chapters = state.book?.chapters || [];
  const currentIndex = getCurrentChapterIndex();
  const total = chapters.length;

  const progressText = currentIndex >= 0
    ? formatChapterProgress(chapters, currentIndex)
    : t("reader.empty.noChapter");
  const currentChapter = currentIndex >= 0 ? chapters[currentIndex] : null;
  elements.chapterProgress.textContent = progressText;
  if (elements.tapBookTitle) {
    elements.tapBookTitle.textContent = state.book?.title || "Interleaf Reader";
  }
  if (elements.tapChapterTitle) {
    elements.tapChapterTitle.textContent = currentChapter?.title || progressText;
  }
  if (elements.tapChapterProgress) {
    elements.tapChapterProgress.textContent = formatReaderPositionText(progressText);
  }
  renderProgressPanel();
  if (elements.sidebarChapterProgress) {
    elements.sidebarChapterProgress.textContent = state.book
      ? progressText
      : t("reader.empty.noBook");
  }
  if (elements.chapterCount) {
    elements.chapterCount.textContent = String(total);
  }
  const previousDisabled =
    state.isLoadingChapter || getAdjacentChapterIndex(currentIndex, total, "previous") === -1;
  const nextDisabled =
    state.isLoadingChapter || getAdjacentChapterIndex(currentIndex, total, "next") === -1;
  const readerControlsDisabled = state.isLoadingChapter || currentIndex === -1;

  elements.prevChapterButton.disabled = previousDisabled;
  elements.nextChapterButton.disabled = nextDisabled;

  if (elements.tapPrevChapterButton) {
    elements.tapPrevChapterButton.disabled = previousDisabled;
  }

  if (elements.tapNextChapterButton) {
    elements.tapNextChapterButton.disabled = nextDisabled;
  }

  if (elements.bottomPrevChapterButton) {
    elements.bottomPrevChapterButton.disabled = previousDisabled;
  }

  if (elements.bottomNextChapterButton) {
    elements.bottomNextChapterButton.disabled = nextDisabled;
  }

  if (elements.backToTopButton) {
    elements.backToTopButton.disabled = readerControlsDisabled;
  }

  renderChapterList(chapters);
}

function renderProgressPanel(options = {}) {
  const chapters = state.book?.chapters || [];
  const total = chapters.length;
  const currentIndex = getCurrentChapterIndex();
  const usePendingIndex = options.usePendingIndex === true;
  const displayIndex = usePendingIndex
    ? clampIndexForChapters(state.pendingChapterIndex, total)
    : currentIndex;
  const displayChapter = displayIndex >= 0 ? chapters[displayIndex] : null;
  const displayTitle = displayChapter?.title || t("reader.empty.noChapter");
  const positionText = displayIndex >= 0 && total > 0
    ? `${displayIndex + 1} / ${total}`
    : t("reader.empty.noChapter");

  if (elements.tapChapterProgressTitle) {
    elements.tapChapterProgressTitle.textContent = displayTitle;
  }

  if (elements.tapChapterProgress) {
    elements.tapChapterProgress.textContent = positionText;
  }

  if (elements.tapChapterSliderPreview) {
    elements.tapChapterSliderPreview.textContent = displayIndex >= 0
      ? t("reader.chapter.sliderPreview", { number: displayIndex + 1, title: displayTitle })
      : t("reader.chapter.choose");
  }

  if (elements.tapChapterSlider) {
    elements.tapChapterSlider.min = "1";
    elements.tapChapterSlider.max = String(Math.max(1, total));
    elements.tapChapterSlider.value = String(displayIndex >= 0 ? displayIndex + 1 : 1);
    elements.tapChapterSlider.disabled = state.isLoadingChapter || total <= 1;
  }
}

function saveCurrentReadingProgress(options = {}) {
  if (!state.currentBookKey || !state.book || !state.currentChapterId) {
    return;
  }

  if (!options.force && isScrollProgressSaveSuppressed()) {
    return;
  }

  persistReadingProgressRecord(createCurrentReadingProgressRecord(options.progressOverrides));
}

function createCurrentReadingProgressRecord(overrides = {}) {
  const currentIndex = getCurrentChapterIndex();
  const progressText = formatChapterProgress(state.book.chapters, currentIndex);
  const scrollProgress = getScrollProgressSnapshot();

  return {
    bookKey: state.currentBookKey,
    currentChapterId: state.currentChapterId,
    currentChapterIndex: currentIndex,
    currentMode: state.currentMode,
    progressText,
    ...scrollProgress,
    updatedAt: Date.now(),
    ...overrides
  };
}

function persistReadingProgressRecord(progressRecord) {
  if (!progressRecord?.bookKey) {
    return;
  }

  state.lastScrollProgress = progressRecord;
  saveReadingProgress(progressRecord).catch((error) => {
    console.warn("Could not save reading progress.", error);
  });
}

function saveCurrentReadingProgressAfterLayout() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      saveCurrentReadingProgress();
      renderNavigationControls();
    });
  });
}

function scheduleScrollProgressSave() {
  if (state.currentView !== "reader" || !state.currentBookKey || isScrollProgressSaveSuppressed()) {
    return;
  }

  window.clearTimeout(scrollProgressSaveTimer);
  scrollProgressSaveTimer = window.setTimeout(() => {
    saveCurrentReadingProgress();
  }, 700);
}

function suppressScrollProgressSaves(duration = 1000) {
  suppressScrollProgressSaveUntil = Math.max(suppressScrollProgressSaveUntil, Date.now() + duration);
  window.clearTimeout(scrollProgressSaveTimer);
}

function isScrollProgressSaveSuppressed() {
  return Date.now() < suppressScrollProgressSaveUntil;
}

function getScrollProgressSnapshot() {
  const metrics = getReaderScrollMetrics();

  return {
    scrollTop: metrics.scrollTop,
    scrollRatio: calculateScrollRatio(metrics.scrollTop, metrics.scrollHeight, metrics.clientHeight)
  };
}

function getReaderScrollMetrics() {
  const scrollElement = getActiveReaderScrollElement();

  return {
    scrollElement,
    scrollTop: scrollElement?.scrollTop || 0,
    scrollHeight: scrollElement?.scrollHeight || 0,
    clientHeight: scrollElement?.clientHeight || 0
  };
}

function getActiveReaderScrollElement() {
  if (elements.readerPane && elements.readerPane.scrollHeight > elements.readerPane.clientHeight + 2) {
    return elements.readerPane;
  }

  return document.scrollingElement || document.documentElement;
}

function restoreReaderScrollFromProgress(progress = {}) {
  if (!shouldRestoreScrollForProgress(progress, state.currentChapterId)) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const metrics = getReaderScrollMetrics();
      const scrollTop = calculateScrollTopFromRatio(
        progress.scrollRatio,
        metrics.scrollHeight,
        metrics.clientHeight
      );

      setReaderScrollTop(metrics.scrollElement, scrollTop);
      renderNavigationControls();
    });
  });
}

function setReaderScrollTop(scrollElement, scrollTop) {
  if (!scrollElement) {
    return;
  }

  if (scrollElement === document.scrollingElement || scrollElement === document.documentElement || scrollElement === document.body) {
    window.scrollTo({ top: scrollTop, behavior: "auto" });
    return;
  }

  scrollElement.scrollTop = scrollTop;
}

function getReaderScrollPercent() {
  return Math.round(getScrollProgressSnapshot().scrollRatio * 100);
}

function formatReaderPositionText(progressText) {
  if (!state.book || !state.currentChapterId) {
    return progressText;
  }

  return `${progressText} · ${getReaderScrollPercent()}%`;
}

// Phase 1 uses a normal vertical-scrolling reading pane. Page-like pagination
// can be added later without changing the chapter loading contract.
function resetReaderScroll() {
  if (elements.readerPane) {
    elements.readerPane.scrollTop = 0;
  }

  if (elements.chapterContent) {
    elements.chapterContent.scrollTop = 0;
  }

  requestAnimationFrame(() => {
    if (elements.bookMeta) {
      elements.bookMeta.focus({ preventScroll: true });
    }

    const paneTop = elements.readerPane?.getBoundingClientRect().top ?? 0;
    const comfortableTop = 18;

    if (paneTop < comfortableTop || paneTop > window.innerHeight * 0.35) {
      window.scrollTo({
        top: Math.max(0, window.scrollY + paneTop - comfortableTop),
        behavior: "auto"
      });
    }
  });
}

function isDisplayableGlossaryTerm(item) {
  return Boolean(
    item &&
    item.term &&
    item.category &&
    item.recommendedAction &&
    Number.isFinite(item.confidence)
  );
}

function replaceChapter(updatedChapter) {
  state.book.chapters = state.book.chapters.map((chapter) => {
    if (chapter.id === updatedChapter.id) {
      return updatedChapter;
    }

    return chapter;
  });
}

function getVocabularyBubbleItem(normalizedTerm) {
  const chapterItem = getCurrentChapter()?.vocabularyPreview?.find((item) => {
    return normalizeTerm(item.term) === normalizedTerm;
  });
  return chapterItem || state.vocabularyIndex.get(normalizedTerm) || null;
}

function renderVocabularyBubbleContent(item) {
  if (!item || !elements.vocabBubble) {
    return;
  }

  const chineseMeaning = item.chineseMeaning || "暂无中文释义";

  elements.vocabBubble.innerHTML = `
    <button type="button" class="bubble-close" data-close-bubble aria-label="${escapeHtml(t("reader.vocabularyNote.close"))}">x</button>
    <h3>${escapeHtml(item.term)}</h3>
    <p><span class="bubble-label">${escapeHtml(t("reader.vocabularyNote.chineseLabel"))}</span><br>${escapeHtml(chineseMeaning)}</p>
    ${item.englishDefinition ? `<p><span class="bubble-label">${escapeHtml(t("reader.vocabularyNote.englishLabel"))}</span><br>${escapeHtml(item.englishDefinition)}</p>` : ""}
    ${item.ieltsUsage ? `<p><span class="bubble-label">${escapeHtml(t("reader.vocabularyNote.ieltsLabel"))}</span><br>${escapeHtml(item.ieltsUsage)}</p>` : ""}
  `;
}

function refreshOpenVocabularyBubbleLanguage() {
  if (!elements.vocabBubble || elements.vocabBubble.hidden || !state.activeBubbleTerm) {
    return;
  }

  const item = getVocabularyBubbleItem(state.activeBubbleTerm);
  if (item) {
    renderVocabularyBubbleContent(item);
  }
}

function showBubble(normalizedTerm, x, y) {
  const item = getVocabularyBubbleItem(normalizedTerm);

  if (!item) {
    return;
  }

  renderVocabularyBubbleContent(item);

  elements.vocabBubble.hidden = false;
  state.activeBubbleTerm = normalizedTerm;
  positionBubble(x, y);
}

function toggleBubble(normalizedTerm, x, y) {
  if (!elements.vocabBubble.hidden && state.activeBubbleTerm === normalizedTerm) {
    hideBubble();
    return;
  }

  showBubble(normalizedTerm, x, y);
}

function hideBubble() {
  elements.vocabBubble.hidden = true;
  state.activeBubbleTerm = null;
  clearLocatedHighlights();
}

function locateVocabularyTerm(normalizedTerm) {
  clearLocatedHighlights();

  if (state.currentMode !== MODES.ENGLISH_STUDY) {
    return false;
  }

  const hit = [...elements.chapterContent.querySelectorAll("[data-vocab-term]")].find((node) => {
    return node.dataset.vocabTerm === normalizedTerm;
  });

  if (!hit) {
    return false;
  }

  hit.scrollIntoView({ block: "center", inline: "nearest" });
  hit.focus({ preventScroll: true });
  hit.classList.add("is-located");

  const box = hit.getBoundingClientRect();
  showBubble(normalizedTerm, box.left, box.bottom);
  return true;
}

function clearLocatedHighlights() {
  elements.chapterContent.querySelectorAll(".is-located").forEach((node) => {
    node.classList.remove("is-located");
  });
}

function positionBubble(x, y) {
  const padding = 12;
  const bubbleBox = elements.vocabBubble.getBoundingClientRect();
  let left = x + padding;
  let top = y + padding;

  if (left + bubbleBox.width > window.innerWidth - padding) {
    left = window.innerWidth - bubbleBox.width - padding;
  }

  if (top + bubbleBox.height > window.innerHeight - padding) {
    top = y - bubbleBox.height - padding;
  }

  elements.vocabBubble.style.left = `${Math.max(padding, left)}px`;
  elements.vocabBubble.style.top = `${Math.max(padding, top)}px`;
}

function setStatus(message, tone = "info") {
  setTranslatedText(elements.statusText, "");
  elements.statusText.textContent = message;
  elements.statusText.dataset.tone = tone;
}

function setLocalizedStatus(key = "", tone = "info", params = {}) {
  setTranslatedText(elements.statusText, key, params);
  elements.statusText.dataset.tone = tone;
}

function createEmptyImportDiagnostics() {
  return {
    fileName: "None selected",
    fileSize: "-",
    fileType: "-",
    fileExtension: "-",
    currentStep: "Idle",
    epubJsStatus: "Unknown",
    jsZipStatus: "Unknown",
    arrayBuffer: "-",
    metadata: "-",
    spine: "-",
    lastErrorName: "None",
    lastErrorMessage: ""
  };
}

function resetImportDiagnostics(file) {
  state.importDiagnostics = {
    ...createEmptyImportDiagnostics(),
    fileName: file?.name || "None selected",
    fileSize: file ? `${formatBytes(file.size)} (${file.size} bytes)` : "-",
    fileType: file?.type || "(empty or not provided by browser)",
    fileExtension: file ? getFileExtension(file.name) || "(none)" : "-",
    currentStep: file ? "File selected" : "No file selected"
  };
}

function updateScriptDiagnostics() {
  const scriptStatus = window.slashReaderScriptStatus || {};
  const epubGlobal = typeof window.ePub === "function" ? "global available" : "global missing";
  const jsZipGlobal = typeof window.JSZip === "function" ? "global available" : "global missing";

  state.importDiagnostics.epubJsStatus = `${scriptStatus.epubjs || "unknown"}; ${epubGlobal}`;
  state.importDiagnostics.jsZipStatus = `${scriptStatus.jszip || "unknown"}; ${jsZipGlobal}`;
}

function updateImportDiagnostics(update = {}) {
  state.importDiagnostics = {
    ...state.importDiagnostics,
    ...normalizeDiagnosticUpdate(update)
  };

  updateScriptDiagnostics();
  renderImportDiagnostics();
}

function normalizeDiagnosticUpdate(update) {
  const normalized = {};

  if (update.fileName) {
    normalized.fileName = update.fileName;
  }

  if (update.fileSize !== undefined) {
    normalized.fileSize = typeof update.fileSize === "number"
      ? `${formatBytes(update.fileSize)} (${update.fileSize} bytes)`
      : update.fileSize;
  }

  if (update.fileType) {
    normalized.fileType = update.fileType;
  }

  if (update.fileExtension) {
    normalized.fileExtension = update.fileExtension;
  }

  if (update.step || update.currentStep) {
    normalized.currentStep = update.currentStep || update.step;
  }

  if (update.arrayBufferBytes !== undefined) {
    normalized.arrayBuffer = `${formatBytes(update.arrayBufferBytes)} (${update.arrayBufferBytes} bytes)`;
  }

  if (update.metadataTitle || update.metadataAuthor) {
    normalized.metadata = [
      update.metadataTitle ? `title: ${update.metadataTitle}` : "",
      update.metadataAuthor ? `author: ${update.metadataAuthor}` : ""
    ].filter(Boolean).join("; ");
  }

  if (update.spineCount !== undefined) {
    normalized.spine = `${update.spineCount} chapter entries`;
  }

  if (update.lastErrorName || update.errorName) {
    normalized.lastErrorName = update.lastErrorName || update.errorName;
  }

  if (update.lastErrorMessage || update.errorMessage) {
    normalized.lastErrorMessage = update.lastErrorMessage || update.errorMessage;
  }

  return normalized;
}

function renderImportDiagnostics() {
  if (!elements.debugPanel) {
    return;
  }

  const diagnostics = state.importDiagnostics;
  elements.debugFileName.textContent = diagnostics.fileName;
  elements.debugFileSize.textContent = diagnostics.fileSize;
  elements.debugFileType.textContent = diagnostics.fileType;
  elements.debugFileExtension.textContent = diagnostics.fileExtension;
  elements.debugStep.textContent = diagnostics.currentStep;
  elements.debugEpubJs.textContent = diagnostics.epubJsStatus;
  elements.debugJsZip.textContent = diagnostics.jsZipStatus;
  elements.debugArrayBuffer.textContent = diagnostics.arrayBuffer;
  elements.debugMetadata.textContent = diagnostics.metadata;
  elements.debugSpine.textContent = diagnostics.spine;
  elements.debugError.textContent = diagnostics.lastErrorMessage
    ? `${diagnostics.lastErrorName}: ${diagnostics.lastErrorMessage}`
    : diagnostics.lastErrorName;
}

function revealDebugPanel() {
  if (elements.debugPanel) {
    elements.debugPanel.open = true;
  }
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : "";
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
