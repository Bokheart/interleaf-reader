import { R3_ACTIONS } from "./actions.js";
import { R3_ROUTES } from "./routes.js";

const DEFAULT_ADAPTER_STATUS = Object.freeze({
  books: false,
  reader: false,
  vocabulary: false,
  modes: false,
  settings: false
});

function createDefaultHomeState(activeReadingMode = "english-study") {
  return {
    continueReading: null,
    recentBooks: [],
    snapshot: {
      readingMode: activeReadingMode,
      vocabularyPreviewCount: null,
      currentBookVersionStatus: null,
      bookDetailsAvailable: false
    },
    helpful: []
  };
}

function createDefaultLibraryState() {
  return {
    status: "empty",
    books: []
  };
}

function createDefaultImportStatus() {
  return {
    isImporting: false,
    fileName: null,
    lastImportedBookKey: null,
    error: null
  };
}

function createDefaultReaderState() {
  return {
    chromeVisible: true,
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
  };
}

function createDefaultVocabularyState() {
  return {
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
  };
}

function createDefaultSettingsState() {
  return {
    status: "loading",
    uiLanguage: "en",
    hasChosenUiLanguage: null,
    busy: false,
    error: null
  };
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, cloneValue(entryValue)])
  );
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error
    };
  }

  return {
    name: error.name || "Error",
    message: error.message || String(error)
  };
}

function createShellState(books = [], continueReading = null, activeReadingMode = "english-study") {
  const normalizedBooks = Array.isArray(books) ? cloneValue(books) : [];
  const normalizedContinueReading = continueReading ? cloneValue(continueReading) : null;

  return {
    books: normalizedBooks,
    savedBookCount: normalizedBooks.length,
    continueReading: normalizedContinueReading,
    home: {
      ...createDefaultHomeState(activeReadingMode),
      continueReading: normalizedContinueReading,
      recentBooks: normalizedBooks.slice(0, 3),
      snapshot: {
        ...createDefaultHomeState(activeReadingMode).snapshot,
        currentBookVersionStatus: normalizedContinueReading ? "original-only" : null
      }
    },
    library: {
      status: normalizedBooks.length ? "populated" : "empty",
      books: normalizedBooks
    }
  };
}

export function createInitialR3State(overrides = {}) {
  return {
    initialized: false,
    activeScreen: R3_ROUTES.HOME,
    activeBookId: null,
    activeChapterId: null,
    activeChapterIndex: -1,
    activeReadingMode: "english-study",
    openOverlay: null,
    reader: createDefaultReaderState(),
    books: [],
    savedBookCount: 0,
    continueReading: null,
    home: createDefaultHomeState("english-study"),
    library: createDefaultLibraryState(),
    vocabulary: createDefaultVocabularyState(),
    settings: createDefaultSettingsState(),
    importStatus: createDefaultImportStatus(),
    adapterStatus: { ...DEFAULT_ADAPTER_STATUS },
    loading: {
      isLoading: false,
      operation: null
    },
    error: null,
    ...cloneValue(overrides)
  };
}

export function r3Reducer(state = createInitialR3State(), action = {}) {
  switch (action.type) {
    case R3_ACTIONS.APP_INITIALIZED:
      return {
        ...state,
        initialized: true,
        adapterStatus: {
          ...state.adapterStatus,
          ...(action.payload?.adapterStatus || {})
        }
      };

    case R3_ACTIONS.NAVIGATE:
      return {
        ...state,
        activeScreen: action.payload?.screen || state.activeScreen,
        openOverlay: null
      };

    case R3_ACTIONS.LOAD_BOOKS_SUCCESS: {
      const books = Array.isArray(action.payload?.books) ? cloneValue(action.payload.books) : [];
      return {
        ...state,
        books,
        savedBookCount: books.length,
        home: {
          ...state.home,
          recentBooks: books.slice(0, 3),
          snapshot: {
            ...state.home.snapshot
          }
        },
        library: {
          status: books.length ? "populated" : "empty",
          books
        }
      };
    }

    case R3_ACTIONS.SET_SHELL_DATA:
      return {
        ...state,
        ...createShellState(
          action.payload?.books,
          action.payload?.continueReading,
          state.activeReadingMode
        )
      };

    case R3_ACTIONS.SET_ACTIVE_BOOK:
      return {
        ...state,
        activeBookId: action.payload?.bookId || null,
        activeChapterId: action.payload?.chapterId || null,
        activeChapterIndex: Number.isInteger(action.payload?.chapterIndex)
          ? action.payload.chapterIndex
          : -1,
        activeReadingMode: action.payload?.readingMode || state.activeReadingMode
      };

    case R3_ACTIONS.SET_ACTIVE_CHAPTER:
      return {
        ...state,
        activeChapterId: action.payload?.chapterId || null,
        activeChapterIndex: Number.isInteger(action.payload?.chapterIndex)
          ? action.payload.chapterIndex
          : -1
      };

    case R3_ACTIONS.SET_READER_STATE:
      return {
        ...state,
        reader: {
          ...state.reader,
          ...(action.payload?.reader || {}),
          error: action.payload?.reader?.error !== undefined
            ? normalizeError(action.payload.reader.error)
            : state.reader.error
        }
      };

    case R3_ACTIONS.SET_VOCABULARY_STATE:
      return {
        ...state,
        vocabulary: {
          ...state.vocabulary,
          ...(action.payload?.vocabulary || {}),
          profile: action.payload?.vocabulary?.profile !== undefined
            ? cloneValue(action.payload.vocabulary.profile)
            : state.vocabulary.profile,
          feedback: action.payload?.vocabulary?.feedback !== undefined
            ? cloneValue(action.payload.vocabulary.feedback)
            : state.vocabulary.feedback
        }
      };

    case R3_ACTIONS.SET_SETTINGS_STATE:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...(action.payload?.settings || {}),
          error: action.payload?.settings?.error !== undefined
            ? normalizeError(action.payload.settings.error)
            : state.settings.error
        }
      };

    case R3_ACTIONS.CLEAR_READER:
      return {
        ...state,
        activeBookId: null,
        activeChapterId: null,
        activeChapterIndex: -1,
        openOverlay: null,
        reader: createDefaultReaderState()
      };

    case R3_ACTIONS.SET_ACTIVE_MODE:
      return {
        ...state,
        activeReadingMode: action.payload?.mode || state.activeReadingMode,
        home: {
          ...state.home,
          snapshot: {
            ...state.home.snapshot,
            readingMode: action.payload?.mode || state.activeReadingMode
          }
        }
      };

    case R3_ACTIONS.SET_IMPORT_STATUS:
      return {
        ...state,
        importStatus: {
          ...state.importStatus,
          ...(action.payload?.importStatus || {}),
          error: action.payload?.importStatus?.error !== undefined
            ? normalizeError(action.payload.importStatus.error)
            : state.importStatus.error
        }
      };

    case R3_ACTIONS.OPEN_OVERLAY:
      return {
        ...state,
        openOverlay: action.payload?.overlay || null
      };

    case R3_ACTIONS.CLOSE_OVERLAY:
      return {
        ...state,
        openOverlay: null
      };

    case R3_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          isLoading: Boolean(action.payload?.isLoading),
          operation: action.payload?.isLoading ? action.payload?.operation || null : null
        }
      };

    case R3_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: normalizeError(action.payload?.error)
      };

    case R3_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case R3_ACTIONS.SET_ADAPTER_STATUS:
      return {
        ...state,
        adapterStatus: {
          ...state.adapterStatus,
          ...(action.payload?.adapterStatus || {})
        }
      };

    default:
      return state;
  }
}

export function createR3Store(initialState = createInitialR3State()) {
  let state = cloneValue(initialState);
  const listeners = new Set();

  function getState() {
    return cloneValue(state);
  }

  return {
    getState,

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("R3 store subscriber must be a function.");
      }

      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispatch(action) {
      const nextState = r3Reducer(state, action);
      if (nextState === state) {
        return getState();
      }

      state = nextState;
      for (const listener of [...listeners]) {
        listener(getState(), action);
      }

      return getState();
    }
  };
}
