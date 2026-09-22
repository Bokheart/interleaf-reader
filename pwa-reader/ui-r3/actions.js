export const R3_ACTIONS = Object.freeze({
  APP_INITIALIZED: "app/initialized",
  NAVIGATE: "navigation/navigate",
  LOAD_BOOKS_SUCCESS: "books/loadSuccess",
  SET_SHELL_DATA: "shell/setData",
  SET_ACTIVE_BOOK: "reader/setActiveBook",
  SET_ACTIVE_CHAPTER: "reader/setActiveChapter",
  SET_READER_STATE: "reader/setState",
  SET_VOCABULARY_STATE: "vocabulary/setState",
  SET_SETTINGS_STATE: "settings/setState",
  CLEAR_READER: "reader/clear",
  SET_ACTIVE_MODE: "reader/setActiveMode",
  SET_IMPORT_STATUS: "import/setStatus",
  OPEN_OVERLAY: "overlay/open",
  CLOSE_OVERLAY: "overlay/close",
  SET_LOADING: "loading/set",
  SET_ERROR: "error/set",
  CLEAR_ERROR: "error/clear",
  SET_ADAPTER_STATUS: "adapters/setStatus"
});

export const r3Actions = Object.freeze({
  appInitialized(payload = {}) {
    return {
      type: R3_ACTIONS.APP_INITIALIZED,
      payload
    };
  },

  navigate(screen) {
    return {
      type: R3_ACTIONS.NAVIGATE,
      payload: { screen }
    };
  },

  loadBooksSuccess(books = []) {
    return {
      type: R3_ACTIONS.LOAD_BOOKS_SUCCESS,
      payload: { books }
    };
  },

  setShellData(payload = {}) {
    return {
      type: R3_ACTIONS.SET_SHELL_DATA,
      payload
    };
  },

  setActiveBook(payload = {}) {
    return {
      type: R3_ACTIONS.SET_ACTIVE_BOOK,
      payload
    };
  },

  setActiveChapter(chapterId, chapterIndex = -1) {
    return {
      type: R3_ACTIONS.SET_ACTIVE_CHAPTER,
      payload: { chapterId, chapterIndex }
    };
  },

  setReaderState(reader = {}) {
    return {
      type: R3_ACTIONS.SET_READER_STATE,
      payload: { reader }
    };
  },

  setVocabularyState(vocabulary = {}) {
    return {
      type: R3_ACTIONS.SET_VOCABULARY_STATE,
      payload: { vocabulary }
    };
  },

  setSettingsState(settings = {}) {
    return {
      type: R3_ACTIONS.SET_SETTINGS_STATE,
      payload: { settings }
    };
  },

  clearReader() {
    return {
      type: R3_ACTIONS.CLEAR_READER
    };
  },

  setActiveMode(mode) {
    return {
      type: R3_ACTIONS.SET_ACTIVE_MODE,
      payload: { mode }
    };
  },

  setImportStatus(importStatus = {}) {
    return {
      type: R3_ACTIONS.SET_IMPORT_STATUS,
      payload: { importStatus }
    };
  },

  openOverlay(overlay) {
    return {
      type: R3_ACTIONS.OPEN_OVERLAY,
      payload: { overlay }
    };
  },

  closeOverlay() {
    return {
      type: R3_ACTIONS.CLOSE_OVERLAY
    };
  },

  setLoading(isLoading, operation = null) {
    return {
      type: R3_ACTIONS.SET_LOADING,
      payload: { isLoading, operation }
    };
  },

  setError(error) {
    return {
      type: R3_ACTIONS.SET_ERROR,
      payload: { error }
    };
  },

  clearError() {
    return {
      type: R3_ACTIONS.CLEAR_ERROR
    };
  },

  setAdapterStatus(adapterStatus = {}) {
    return {
      type: R3_ACTIONS.SET_ADAPTER_STATUS,
      payload: { adapterStatus }
    };
  }
});
