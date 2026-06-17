import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  HOME_ENTRY_COPY,
  applyVocabularyPreviewAction,
  formatVocabularyAllExportText,
  formatVocabularyCsvExport,
  formatVocabularyLearningExportText,
  formatContinueReadingSubtext,
  formatReturnToReaderSubtext,
  getAppRuntimeDiagnostics,
  getAppViewVisibility,
  getHomeEntryState,
  getManualVocabularyAddState,
  getPersonalizedVocabularyPreviewItems,
  getVocabularyExportRows,
  getVocabularyExportState,
  getVocabularyRemoveState,
  getVocabularyLibraryDetailState,
  getVocabularyLibrarySummaryState,
  getVocabularyTermStatus,
  isVocabularyPreviewItemSaved,
  normalizeManualVocabularyInput,
  shouldShowContinueReading,
  shouldShowLibraryEmptyState,
  shouldShowReturnToReader
} from "../pwa-reader/app.js";

const loadedBookState = {
  book: {
    title: "Well Jung",
    chapters: [{ id: "preface" }, { id: "chapter-1" }]
  }
};

const noLoadedBookState = {
  book: null
};

const savedBook = {
  bookKey: "well-jung",
  title: "Well Jung",
  author: "C. G. Jung",
  fileName: "Well_Jung.epub",
  fileSize: 4096,
  chapterCount: 9
};

assert.deepEqual(
  getHomeEntryState(noLoadedBookState, []),
  {
    primaryAction: null,
    showReturnToReader: false,
    showResumeCurrentSession: false,
    showContinueReading: false,
    showLibraryEmptyState: true,
    showLibraryItems: false,
    savedBookCount: 0
  },
  "Case A: fresh app shows only the empty library state"
);

assert.deepEqual(
  getHomeEntryState(loadedBookState, []),
  {
    primaryAction: "resume-current-session",
    showReturnToReader: true,
    showResumeCurrentSession: true,
    showContinueReading: false,
    showLibraryEmptyState: true,
    showLibraryItems: false,
    savedBookCount: 0
  },
  "Case B: in-memory book shows Return to Reader without Continue Reading"
);

assert.deepEqual(
  getHomeEntryState(noLoadedBookState, [savedBook]),
  {
    primaryAction: "continue-reading",
    showReturnToReader: false,
    showResumeCurrentSession: false,
    showContinueReading: true,
    showLibraryEmptyState: false,
    showLibraryItems: true,
    savedBookCount: 1
  },
  "Case C: saved book without memory session shows Continue Reading and Library item"
);

assert.deepEqual(
  getHomeEntryState(loadedBookState, [savedBook]),
  {
    primaryAction: "resume-current-session",
    showReturnToReader: true,
    showResumeCurrentSession: true,
    showContinueReading: false,
    showLibraryEmptyState: false,
    showLibraryItems: true,
    savedBookCount: 1
  },
  "Case D: memory session and saved book make Resume primary while Library remains visible"
);

assert.deepEqual(
  getHomeEntryState(loadedBookState, [savedBook], { isContinueReadingDismissed: true }),
  {
    primaryAction: "resume-current-session",
    showReturnToReader: true,
    showResumeCurrentSession: true,
    showContinueReading: false,
    showLibraryEmptyState: false,
    showLibraryItems: true,
    savedBookCount: 1
  },
  "Case E: dismiss hides Continue Reading while preserving Return and Library"
);

assert.deepEqual(
  getHomeEntryState(loadedBookState, []),
  {
    primaryAction: "resume-current-session",
    showReturnToReader: true,
    showResumeCurrentSession: true,
    showContinueReading: false,
    showLibraryEmptyState: true,
    showLibraryItems: false,
    savedBookCount: 0
  },
  "Case F: deleting the saved book removes Library and Continue Reading while Return follows memory state"
);

assert.equal(shouldShowReturnToReader(loadedBookState), true, "Return to Reader follows in-memory book state");
assert.equal(shouldShowReturnToReader(noLoadedBookState), false, "Return to Reader hides without an in-memory book");
assert.equal(shouldShowContinueReading([savedBook]), true, "Continue Reading follows saved book presence");
assert.equal(
  shouldShowContinueReading([savedBook], { hasInMemoryBook: true }),
  false,
  "Continue Reading hides when Resume current session is available"
);
assert.equal(
  shouldShowContinueReading([savedBook], { isContinueReadingDismissed: true }),
  false,
  "Continue Reading honors session dismissal"
);
assert.equal(shouldShowLibraryEmptyState([]), true, "Library empty state shows with no saved books");
assert.equal(shouldShowLibraryEmptyState([savedBook]), false, "Library empty state hides when saved books exist");

assert.equal(
  formatReturnToReaderSubtext({ title: "Well Jung" }, "Bonus Chapter: Processing - 7 / 9"),
  "Well Jung · Bonus Chapter: Processing - 7 / 9",
  "Resume subtext keeps title and progress together"
);

assert.equal(
  formatReturnToReaderSubtext(null, ""),
  "Current book · No chapter loaded",
  "Resume subtext has safe fallbacks"
);

assert.match(
  formatContinueReadingSubtext(savedBook),
  /C\. G\. Jung/,
  "Continue Reading metadata includes author when available"
);

assert.match(
  formatContinueReadingSubtext(savedBook),
  /9 chapters/,
  "Continue Reading metadata includes chapter count when available"
);

assert.equal(
  formatContinueReadingSubtext({}),
  "Saved locally in this browser.",
  "Continue Reading metadata has a local-storage fallback"
);

assert.equal(
  HOME_ENTRY_COPY.resumeTitle,
  "Resume current session",
  "Resume title copy is stable"
);

assert.equal(
  HOME_ENTRY_COPY.resumeHint,
  "Back to your open reader. No reload needed.",
  "Resume hint copy is stable"
);

assert.equal(
  HOME_ENTRY_COPY.resumeAction,
  "Resume",
  "Resume action copy is stable"
);

assert.equal(
  HOME_ENTRY_COPY.continueReadingHint,
  "Restore your most recently saved local book.",
  "Continue Reading hint copy is stable"
);

assert.equal(
  HOME_ENTRY_COPY.localLibraryHint,
  "Saved in this browser on this device.",
  "Local Library hint copy is stable"
);

assert.equal(
  HOME_ENTRY_COPY.libraryEmptyState,
  "No saved books yet. Import an EPUB to start your local library.",
  "Library empty state copy is stable"
);

assert.equal(HOME_ENTRY_COPY.libraryOpenAction, "Open", "Library open action copy is stable");

assert.deepEqual(
  getAppViewVisibility("home"),
  {
    currentView: "home",
    homeHidden: false,
    readerHidden: true,
    vocabularyLibraryHidden: true
  },
  "Home view hides Reader and Vocabulary Library"
);

assert.deepEqual(
  getAppViewVisibility("reader"),
  {
    currentView: "reader",
    homeHidden: true,
    readerHidden: false,
    vocabularyLibraryHidden: true
  },
  "Reader view hides Home and Vocabulary Library"
);

assert.deepEqual(
  getAppViewVisibility("vocabulary-library"),
  {
    currentView: "vocabulary-library",
    homeHidden: true,
    readerHidden: true,
    vocabularyLibraryHidden: false
  },
  "Vocabulary Library view hides Home and Reader"
);

assert.deepEqual(
  getAppViewVisibility("unknown"),
  {
    currentView: "home",
    homeHidden: false,
    readerHidden: true,
    vocabularyLibraryHidden: true
  },
  "Unknown views fall back to Home instead of leaving multiple views active"
);

const diagnostics = getAppRuntimeDiagnostics({
  appState: {
    currentView: "reader",
    eventsBound: true
  },
  elements: {
    homeView: { hidden: true },
    readerView: { hidden: false },
    vocabularyLibraryView: { hidden: true },
    prevChapterButton: {},
    bottomPrevChapterButton: {},
    tapPrevChapterButton: {},
    nextChapterButton: {},
    bottomNextChapterButton: {},
    tapNextChapterButton: {},
    chapterList: {},
    openVocabularyLibraryButton: {},
    vocabularyBackHomeButton: {},
    vocabularyLibraryTabs: [{}, {}, {}]
  },
  documentRef: null
});

assert.deepEqual(
  diagnostics,
  {
    activeView: "reader",
    views: {
      home: { exists: true, hidden: true },
      reader: { exists: true, hidden: false },
      vocabularyLibrary: { exists: true, hidden: true }
    },
    readerNavigation: {
      previousButtonsFound: 3,
      nextButtonsFound: 3,
      chapterListFound: true,
      bindEventsCompleted: true
    },
    vocabularyLibrary: {
      viewWordsButtonFound: true,
      backToHomeButtonFound: true,
      tabButtonsFound: 3
    }
  },
  "Runtime diagnostics report active view, view visibility, Reader controls, and Vocabulary Library controls"
);

assert.deepEqual(
  getAppRuntimeDiagnostics({
    appState: {
      currentView: "mystery",
      eventsBound: false
    },
    elements: {},
    documentRef: null
  }),
  {
    activeView: "unknown",
    views: {
      home: { exists: false, hidden: true },
      reader: { exists: false, hidden: true },
      vocabularyLibrary: { exists: false, hidden: true }
    },
    readerNavigation: {
      previousButtonsFound: 0,
      nextButtonsFound: 0,
      chapterListFound: false,
      bindEventsCompleted: false
    },
    vocabularyLibrary: {
      viewWordsButtonFound: false,
      backToHomeButtonFound: false,
      tabButtonsFound: 0
    }
  },
  "Runtime diagnostics are safe when elements are missing"
);

assert.deepEqual(
  getVocabularyLibrarySummaryState({
    selectedLevel: "level3",
    knownWords: [],
    learningWords: [],
    ignoredWords: []
  }),
  {
    learningCount: 0,
    masteredCount: 0,
    hiddenCount: 0,
    selectedLevel: "level3",
    isEmpty: true,
    hasError: false,
    note: "Save words from Vocabulary Preview to build your library."
  },
  "Vocabulary Library summary handles an empty profile"
);

assert.deepEqual(
  getVocabularyLibrarySummaryState({
    selectedLevel: "level4",
    learningWords: ["relentless", "bring up"],
    knownWords: ["anxious"],
    ignoredWords: ["dean", "typo"]
  }),
  {
    learningCount: 2,
    masteredCount: 1,
    hiddenCount: 2,
    selectedLevel: "level4",
    isEmpty: false,
    hasError: false,
    note: "Word lists are saved locally in this browser."
  },
  "Vocabulary Library summary counts learning, mastered, hidden, and level"
);

assert.deepEqual(
  getVocabularyLibrarySummaryState(null, { hasError: true }),
  {
    learningCount: 0,
    masteredCount: 0,
    hiddenCount: 0,
    selectedLevel: "level3",
    isEmpty: true,
    hasError: true,
    note: "Vocabulary counts are unavailable right now."
  },
  "Vocabulary Library summary has a quiet failure fallback"
);

const detailProfile = {
  learningWords: ["relentless", "Bring Up", "relentless"],
  knownWords: ["anxious"],
  ignoredWords: ["Dean", "typo"]
};

assert.deepEqual(
  getVocabularyLibraryDetailState(detailProfile, "learning"),
  {
    tabs: [
      { id: "learning", label: "Learning", count: 2, isActive: true },
      { id: "mastered", label: "Mastered", count: 1, isActive: false },
      { id: "hidden", label: "Hidden", count: 2, isActive: false }
    ],
    activeTab: "learning",
    terms: ["Bring Up", "relentless"],
    emptyText: "Saved words will appear here.",
    hasError: false,
    statusText: ""
  },
  "Vocabulary Library detail opens Learning tab with deduped alphabetical terms and counts"
);

assert.deepEqual(
  getVocabularyLibraryDetailState(detailProfile, "mastered").terms,
  ["anxious"],
  "Vocabulary Library detail shows knownWords in Mastered tab"
);

assert.deepEqual(
  getVocabularyLibraryDetailState(detailProfile, "hidden").terms,
  ["Dean", "typo"],
  "Vocabulary Library detail shows ignoredWords in Hidden tab"
);

assert.equal(
  getVocabularyLibraryDetailState({}, "learning").emptyText,
  "Saved words will appear here.",
  "Learning empty state copy is stable"
);

assert.equal(
  getVocabularyLibraryDetailState({}, "mastered").emptyText,
  "Words marked Known will appear here.",
  "Mastered empty state copy is stable"
);

assert.equal(
  getVocabularyLibraryDetailState({}, "hidden").emptyText,
  "Hidden words will appear here.",
  "Hidden empty state copy is stable"
);

assert.deepEqual(
  getVocabularyLibraryDetailState(null, "hidden", { hasError: true }),
  {
    tabs: [
      { id: "learning", label: "Learning", count: 0, isActive: false },
      { id: "mastered", label: "Mastered", count: 0, isActive: false },
      { id: "hidden", label: "Hidden", count: 0, isActive: true }
    ],
    activeTab: "hidden",
    terms: [],
    emptyText: "Hidden words will appear here.",
    hasError: true,
    statusText: "Vocabulary Library is unavailable right now."
  },
  "Vocabulary Library detail has a quiet failure fallback"
);

assert.deepEqual(
  normalizeManualVocabularyInput("  Relentless!  "),
  {
    ok: true,
    term: "relentless",
    reason: "ok",
    message: ""
  },
  "Manual vocabulary input normalizes whitespace, case, and edge punctuation"
);

assert.deepEqual(
  normalizeManualVocabularyInput("   "),
  {
    ok: false,
    term: "",
    reason: "empty",
    message: "Enter a word first."
  },
  "Manual vocabulary input rejects empty terms"
);

assert.equal(
  normalizeManualVocabularyInput("a".repeat(81)).reason,
  "too-long",
  "Manual vocabulary input rejects very long terms"
);

const managementProfile = {
  learningWords: ["bring up"],
  knownWords: ["anxious"],
  ignoredWords: ["Dean"]
};

assert.equal(
  getVocabularyTermStatus(managementProfile, "Bring Up"),
  "learning",
  "Vocabulary status detects existing learning words"
);

assert.deepEqual(
  getManualVocabularyAddState(managementProfile, "  unorthodox  "),
  {
    ok: true,
    shouldSave: true,
    term: "unorthodox",
    reason: "new",
    message: "Added to Learning."
  },
  "Manual add accepts new terms"
);

assert.deepEqual(
  getManualVocabularyAddState(managementProfile, "bring up"),
  {
    ok: false,
    shouldSave: false,
    term: "bring up",
    reason: "already-learning",
    message: "Already in Learning."
  },
  "Manual add does not duplicate terms already in Learning"
);

assert.deepEqual(
  getManualVocabularyAddState(managementProfile, "anxious"),
  {
    ok: true,
    shouldSave: true,
    term: "anxious",
    reason: "move-from-mastered",
    message: "Moved to Learning."
  },
  "Manual add can move a Mastered term to Learning"
);

assert.deepEqual(
  getManualVocabularyAddState(managementProfile, "dean"),
  {
    ok: true,
    shouldSave: true,
    term: "dean",
    reason: "move-from-hidden",
    message: "Moved to Learning."
  },
  "Manual add can move a Hidden term to Learning"
);

assert.deepEqual(
  getVocabularyRemoveState(managementProfile, "bring up", "learning"),
  {
    ok: true,
    shouldRemove: true,
    term: "bring up",
    reason: "remove-learning",
    message: "Removed from Learning."
  },
  "Vocabulary remove accepts terms in the current Learning tab"
);

assert.deepEqual(
  getVocabularyRemoveState(managementProfile, "anxious", "mastered"),
  {
    ok: true,
    shouldRemove: true,
    term: "anxious",
    reason: "remove-mastered",
    message: "Removed from Mastered."
  },
  "Vocabulary remove accepts terms in the current Mastered tab"
);

assert.deepEqual(
  getVocabularyRemoveState(managementProfile, "dean", "hidden"),
  {
    ok: true,
    shouldRemove: true,
    term: "dean",
    reason: "remove-hidden",
    message: "Removed from Hidden."
  },
  "Vocabulary remove accepts terms in the current Hidden tab"
);

assert.deepEqual(
  getVocabularyRemoveState(managementProfile, "missing", "learning"),
  {
    ok: false,
    shouldRemove: false,
    term: "missing",
    reason: "not-in-current-list",
    message: "Word is no longer in this list."
  },
  "Vocabulary remove safely handles stale rows"
);

const exportProfile = {
  learningWords: ["zeta", "alpha", "alpha"],
  knownWords: ["quote\"word", "comma, word"],
  ignoredWords: ["Dean"]
};

assert.equal(
  formatVocabularyLearningExportText(exportProfile),
  "alpha\nzeta",
  "Learning export text is one sorted term per line"
);

assert.equal(
  formatVocabularyAllExportText(exportProfile),
  "Learning\nalpha\nzeta\n\nMastered\ncomma, word\nquote\"word\n\nHidden\ndean",
  "All vocabulary export text uses section headers"
);

assert.equal(
  formatVocabularyCsvExport(exportProfile),
  "term,status\nalpha,learning\nzeta,learning\n\"comma, word\",mastered\n\"quote\"\"word\",mastered\ndean,hidden",
  "Vocabulary CSV export maps statuses and escapes commas/quotes"
);

assert.deepEqual(
  getVocabularyExportRows(exportProfile),
  [
    { term: "alpha", status: "learning" },
    { term: "zeta", status: "learning" },
    { term: "comma, word", status: "mastered" },
    { term: "quote\"word", status: "mastered" },
    { term: "dean", status: "hidden" }
  ],
  "Vocabulary export rows map profile lists to export statuses"
);

assert.deepEqual(
  getVocabularyExportState({
    learningWords: [],
    knownWords: [],
    ignoredWords: []
  }),
  {
    hasError: false,
    hasWords: false,
    learningCount: 0,
    totalCount: 0,
    copyLearningDisabled: true,
    copyAllDisabled: true,
    downloadCsvDisabled: true,
    message: "No words to export yet."
  },
  "Empty vocabulary export state disables actions with a quiet message"
);

assert.deepEqual(
  getVocabularyExportState(exportProfile),
  {
    hasError: false,
    hasWords: true,
    learningCount: 2,
    totalCount: 5,
    copyLearningDisabled: false,
    copyAllDisabled: false,
    downloadCsvDisabled: false,
    message: ""
  },
  "Non-empty vocabulary export state enables export actions"
);

const personalizedPreview = await getPersonalizedVocabularyPreviewItems(
  [
    { term: "relentless", type: "ielts" },
    { term: "hit the road", type: "idiom" }
  ],
  {
    loadPersonalizationState: async () => ({
      normalizedProfile: {
        learningWords: []
      },
      effectiveKnownWords: new Set(["relentless"])
    })
  }
);
assert.deepEqual(
  personalizedPreview.map((item) => item.term),
  ["hit the road"],
  "Preview personalization filters known words when state is available"
);

const savedPreview = await getPersonalizedVocabularyPreviewItems(
  [
    { term: "hit the road", type: "idiom" }
  ],
  {
    loadPersonalizationState: async () => ({
      normalizedProfile: {
        learningWords: ["hit the road"]
      },
      effectiveKnownWords: new Set(["hit the road"])
    })
  }
);
assert.deepEqual(
  savedPreview.map((item) => item.term),
  ["hit the road"],
  "Saved learning words remain visible in Preview"
);
assert.equal(
  isVocabularyPreviewItemSaved(savedPreview[0]),
  true,
  "Saved learning words carry saved-state metadata after filtering"
);
assert.equal(
  isVocabularyPreviewItemSaved(
    { term: "Hit the Road" },
    { normalizedProfile: { learningWords: ["hit the road"] } }
  ),
  true,
  "Saved-state detection checks normalized profile learningWords"
);
assert.equal(
  isVocabularyPreviewItemSaved({ term: "relentless" }, null),
  false,
  "Saved-state detection falls back safely without profile state"
);

let personalizationFallbackWarning = null;
const originalPreviewItems = [
  { term: "relentless", type: "ielts" },
  { term: "hit the road", type: "idiom" }
];
const fallbackPreview = await getPersonalizedVocabularyPreviewItems(
  originalPreviewItems,
  {
    loadPersonalizationState: async () => {
      throw new Error("baseline unavailable");
    },
    onError(error) {
      personalizationFallbackWarning = error;
    }
  }
);
assert.equal(fallbackPreview, originalPreviewItems, "Preview personalization falls back to unfiltered items");
assert.match(
  personalizationFallbackWarning.message,
  /baseline unavailable/,
  "Preview personalization exposes fallback errors to the caller"
);

let moduleLoadFallbackWarning = null;
const moduleLoadFailurePreview = await getPersonalizedVocabularyPreviewItems(
  originalPreviewItems,
  {
    loadPersonalizationModules: async () => {
      throw new Error("optional personalization module unavailable");
    },
    onError(error) {
      moduleLoadFallbackWarning = error;
    }
  }
);
assert.equal(
  moduleLoadFailurePreview,
  originalPreviewItems,
  "Preview personalization falls back when optional module loading fails"
);
assert.match(
  moduleLoadFallbackWarning.message,
  /optional personalization module unavailable/,
  "Preview personalization catches optional module loading failures"
);

let profileFallbackWarning = null;
const profileFailurePreview = await getPersonalizedVocabularyPreviewItems(
  originalPreviewItems,
  {
    personalizationModules: {
      filterVocabularyPreviewItems(items) {
        return items.slice(0, 1);
      },
      getVocabularyProfile() {
        throw new Error("profile unavailable");
      },
      async loadEffectiveKnownWordsForProfile() {
        return {
          normalizedProfile: { learningWords: [] },
          effectiveKnownWords: new Set(["relentless"])
        };
      }
    },
    onError(error) {
      profileFallbackWarning = error;
    }
  }
);
assert.equal(profileFailurePreview, originalPreviewItems, "Preview personalization falls back on profile failures");
assert.match(profileFallbackWarning.message, /profile unavailable/, "Preview personalization catches profile failures");

let baselineFallbackWarning = null;
const baselineFailurePreview = await getPersonalizedVocabularyPreviewItems(
  originalPreviewItems,
  {
    personalizationModules: {
      filterVocabularyPreviewItems(items) {
        return items.slice(0, 1);
      },
      getVocabularyProfile() {
        return {
          selectedLevel: "level3",
          knownWords: [],
          learningWords: [],
          ignoredWords: [],
          preferredCategories: ["ielts", "fiction", "slang"]
        };
      },
      loadEffectiveKnownWordsForProfile() {
        throw new Error("baseline unavailable");
      }
    },
    onError(error) {
      baselineFallbackWarning = error;
    }
  }
);
assert.equal(baselineFailurePreview, originalPreviewItems, "Preview personalization falls back on baseline failures");
assert.match(baselineFallbackWarning.message, /baseline unavailable/, "Preview personalization catches baseline failures");

let filteringFallbackWarning = null;
const filterFailurePreview = await getPersonalizedVocabularyPreviewItems(
  originalPreviewItems,
  {
    loadPersonalizationState: async () => ({
      normalizedProfile: { learningWords: [] },
      effectiveKnownWords: new Set(["relentless"])
    }),
    filterItems: () => {
      throw new Error("filter helper unavailable");
    },
    onError(error) {
      filteringFallbackWarning = error;
    }
  }
);
assert.equal(filterFailurePreview, originalPreviewItems, "Preview personalization falls back when filtering fails");
assert.match(
  filteringFallbackWarning.message,
  /filter helper unavailable/,
  "Preview personalization catches filtering failures"
);

const appSource = await readFile(new URL("../pwa-reader/app.js", import.meta.url), "utf8");
assert.doesNotMatch(
  appSource,
  /import\s*\{[^}]*filterVocabularyPreviewItems[^}]*\}\s*from\s*["']\.\/vocabEngine\.js["']/s,
  "app.js does not statically import optional Preview filtering helper at startup"
);
assert.doesNotMatch(
  appSource,
  /import\s*\{[^}]*loadEffectiveKnownWordsForProfile[^}]*\}\s*from\s*["']\.\/levelBaselineEngine\.js["']/s,
  "app.js does not statically import optional level baseline helper at startup"
);
assert.doesNotMatch(
  appSource,
  /import\s*\{[^}]*getVocabularyProfile[^}]*\}\s*from\s*["']\.\/storage\.js["']/s,
  "app.js does not statically import optional vocabulary profile helper at startup"
);

const actionCalls = [];
let invalidationCount = 0;
const actionHelpers = {
  async known(term) {
    actionCalls.push(["known", term]);
    return { knownWords: [term] };
  },
  async add(term) {
    actionCalls.push(["add", term]);
    return { learningWords: [term] };
  },
  async ignore(term) {
    actionCalls.push(["ignore", term]);
    return { ignoredWords: [term] };
  }
};

assert.deepEqual(
  await applyVocabularyPreviewAction("known", " Relentless ", {
    actionHelpers,
    invalidateCache() {
      invalidationCount += 1;
    }
  }),
  {
    ok: true,
    action: "known",
    term: "relentless",
    profile: { knownWords: ["relentless"] }
  },
  "Known action normalizes term, calls storage helper, and returns profile"
);

await applyVocabularyPreviewAction("add", "hit the road", {
  actionHelpers,
  invalidateCache() {
    invalidationCount += 1;
  }
});

await applyVocabularyPreviewAction("ignore", "muggle", {
  actionHelpers,
  invalidateCache() {
    invalidationCount += 1;
  }
});

assert.deepEqual(
  actionCalls,
  [
    ["known", "relentless"],
    ["add", "hit the road"],
    ["ignore", "muggle"]
  ],
  "Preview actions route to the expected profile helpers"
);
assert.equal(invalidationCount, 3, "successful Preview actions invalidate personalization cache");

let actionFailureWarning = null;
const failedAction = await applyVocabularyPreviewAction("known", "relentless", {
  actionHelpers: {
    async known() {
      throw new Error("IndexedDB failed");
    }
  },
  invalidateCache() {
    throw new Error("should not invalidate on failure");
  },
  onError(error) {
    actionFailureWarning = error;
  }
});
assert.equal(failedAction.ok, false, "Preview action failures are contained");
assert.match(actionFailureWarning.message, /IndexedDB failed/, "Preview action failure is reported to caller");

const emptyAction = await applyVocabularyPreviewAction("known", "   ", { actionHelpers });
assert.equal(emptyAction.ok, false, "Preview actions skip empty terms");
assert.equal(emptyAction.reason, "empty-term", "Preview actions report empty terms");

const homeHtml = await readFile(new URL("../pwa-reader/index.html", import.meta.url), "utf8");

assert.match(
  homeHtml,
  /Resume current session/,
  "Home markup includes Resume title"
);

assert.match(
  homeHtml,
  /Vocabulary Library/,
  "Home markup includes Vocabulary Library summary title"
);

assert.match(
  homeHtml,
  /View words/,
  "Vocabulary Library summary includes page entry"
);

assert.match(
  homeHtml,
  /Add a word manually/,
  "Vocabulary Library view includes manual add input"
);

assert.match(
  homeHtml,
  /Add to Learning/,
  "Vocabulary Library view includes manual add action"
);

assert.match(
  homeHtml,
  /Copy Learning/,
  "Vocabulary Library view includes Copy Learning export action"
);

assert.match(
  homeHtml,
  /Copy All/,
  "Vocabulary Library view includes Copy All export action"
);

assert.match(
  homeHtml,
  /Download CSV/,
  "Vocabulary Library view includes CSV export action"
);

assert.match(
  homeHtml,
  /id="vocabularyLibraryView" class="app-view" hidden/,
  "Vocabulary Library renders as an independent app view"
);

assert.match(
  homeHtml,
  /Back to Home/,
  "Vocabulary Library view includes Back to Home action"
);

assert.match(
  homeHtml,
  /Saved on this device\./,
  "Vocabulary Library summary explains local vocabulary storage"
);

assert.match(
  homeHtml,
  /Learning[\s\S]*Mastered[\s\S]*Hidden/,
  "Vocabulary Library summary shows word-count labels"
);

assert.match(
  homeHtml,
  /Save words from Vocabulary Preview to build your library\./,
  "Vocabulary Library summary has an empty-state hint"
);

assert.match(
  homeHtml,
  /role="tab"[\s\S]*Learning \(0\)[\s\S]*role="tab"[\s\S]*Mastered \(0\)[\s\S]*role="tab"[\s\S]*Hidden \(0\)/,
  "Vocabulary Library view includes Learning, Mastered, and Hidden tabs"
);

assert.match(
  homeHtml,
  /Saved word lists on this device\./,
  "Vocabulary Library view explains local word storage"
);

assert.match(
  homeHtml,
  /They are not synced or exported yet\./,
  "Vocabulary Library view clarifies there is no sync or export yet"
);

assert.doesNotMatch(
  homeHtml,
  /id="vocabularyLibraryView"[\s\S]{0,900}aria-modal=/,
  "Vocabulary Library view is not modal"
);

assert.doesNotMatch(
  homeHtml,
  /id="vocabularyLibraryView"[\s\S]{0,900}role="dialog"/,
  "Vocabulary Library view is not a dialog"
);

assert.doesNotMatch(
  homeHtml,
  /id="vocabularyLibraryView" class="modal-backdrop"/,
  "Vocabulary Library view has no modal backdrop"
);

assert.match(
  homeHtml,
  /Back to your open reader\. No reload needed\./,
  "Home markup includes Resume hint"
);

assert.match(
  homeHtml,
  />Resume</,
  "Home markup includes Resume action"
);

assert.match(
  homeHtml,
  /Restore your most recently saved local book\./,
  "Home markup includes Continue Reading hint"
);

assert.match(
  homeHtml,
  /Saved in this browser on this device\./,
  "Home markup includes Local Library hint"
);

assert.match(
  homeHtml,
  /No saved books yet\. Import an EPUB to start your local library\./,
  "Home markup includes empty library state"
);

console.log("homeState tests passed");
