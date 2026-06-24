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
  getLocalLibraryViewState,
  getManualVocabularyAddState,
  getPersonalizedVocabularyPreviewItems,
  getVocabularyExportRows,
  getVocabularyExportState,
  getVocabularyLevelSelectorState,
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
import {
  GUIDE_BOOK_KEY,
  createGuideBook,
  createGuideLibraryItem,
  getGuideContentKeyForMode,
  getGuideModeLabel,
  resolveGuideChapterContent,
  syncGuideBookForReadingMode
} from "../pwa-reader/guideBook.js";
import { MODES, renderChapterForMode } from "../pwa-reader/readingModes.js";
import {
  createTranslator,
  detectPreferredUiLanguage,
  getFirstRunLanguageChoiceState,
  getLanguageChoices,
  getTranslation,
  normalizeUiLanguage
} from "../pwa-reader/i18n.js";
import { en } from "../pwa-reader/locales/en.js";
import { zhCN } from "../pwa-reader/locales/zh-CN.js";

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

function withMinimalDocument(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      const template = { innerHTML: "" };
      Object.defineProperty(template, "textContent", {
        set(value) {
          template.innerHTML = String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
        }
      });
      return template;
    }
  };

  try {
    return callback();
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

assert.equal(normalizeUiLanguage("zh-cn"), "zh-CN", "UI language normalizes Chinese locale casing");
assert.equal(normalizeUiLanguage("en-US"), "en", "UI language normalizes English browser locales");
assert.equal(normalizeUiLanguage("fr-FR"), "en", "unsupported UI language falls back to English");
assert.equal(
  detectPreferredUiLanguage({ languages: ["zh-Hans-CN", "en-US"] }),
  "zh-CN",
  "browser language can preselect Chinese without silently locking it"
);

assert.deepEqual(
  getLanguageChoices("zh-CN"),
  [
    { value: "zh-CN", label: "\u4e2d\u6587", selected: true },
    { value: "en", label: "English", selected: false }
  ],
  "first-run choices expose Chinese and English with a selectable preference"
);

assert.deepEqual(
  getFirstRunLanguageChoiceState({ hasChosenUiLanguage: false, uiLanguage: "zh-CN" }),
  {
    shouldShow: true,
    selectedLanguage: "zh-CN",
    title: "Choose interface language",
    subtitle: "\u9009\u62e9\u754c\u9762\u8bed\u8a00",
    choices: [
      { value: "zh-CN", label: "\u4e2d\u6587", selected: true },
      { value: "en", label: "English", selected: false }
    ]
  },
  "first-run language state is bilingual and blocks normal Home interaction until chosen"
);

assert.equal(
  getFirstRunLanguageChoiceState({ hasChosenUiLanguage: true, uiLanguage: "en" }).shouldShow,
  false,
  "first-run language state hides after explicit choice"
);

assert.equal(getTranslation("zh-CN", "home.import.title"), "\u5bfc\u5165 EPUB", "Chinese UI strings are available by key");
assert.equal(getTranslation("en", "reader.controls.contents"), "Contents", "English UI strings are available by key");
assert.deepEqual(
  Object.keys(zhCN).sort(),
  Object.keys(en).sort(),
  "English and Chinese locale catalogs keep identical key sets"
);

for (const [key, english, chinese] of [
  ["reader.controls.contents", "Contents", "目录"],
  ["reader.controls.progress", "Progress", "进度"],
  ["reader.controls.preview", "Preview", "词汇预览"],
  ["reader.controls.mode", "Mode", "阅读模式"],
  ["reader.mode.title", "Reading Mode", "阅读模式"],
  ["reader.sidebar.chapters", "Chapters", "章节"],
  ["reader.navigation.previous", "Previous Chapter", "上一章"],
  ["reader.navigation.next", "Next Chapter", "下一章"],
  ["reader.navigation.backToTop", "Back to Top", "回到顶部"],
  ["reader.common.close", "Close", "关闭"],
  ["reader.mode.english", "English Study", "英文阅读"],
  ["reader.mode.chinese", "Chinese", "中文阅读"],
  ["reader.mode.mixed", "Mixed Mode", "混合阅读"],
  ["reader.empty.noBook", "No book loaded", "尚未加载书籍"],
  ["reader.empty.noChapter", "No chapter loaded", "尚未加载章节"],
  ["reader.empty.importForChapters", "Import an EPUB to see chapters.", "导入 EPUB 后可查看章节。"],
  ["reader.empty.chooseBook", "Choose an EPUB to begin.", "请选择一本 EPUB 开始阅读。"]
]) {
  assert.equal(getTranslation("en", key), english, `${key} has the expected English Reader copy`);
  assert.equal(getTranslation("zh-CN", key), chinese, `${key} has the expected Chinese Reader copy`);
}
assert.equal(
  getTranslation("zh-CN", "reader.mobile.modeSummary", { mode: "英文阅读" }),
  "阅读模式 · 英文阅读",
  "Chinese mobile Mode summary localizes both the control and selected-mode labels"
);
assert.equal(
  getTranslation("zh-CN", "reader.mobile.previewCount.other", { count: 2 }),
  "词汇预览 · 2 个词",
  "Chinese mobile Preview count resolves through the locale catalog"
);
assert.equal(
  createTranslator("zh-CN")("settings.title"),
  "\u8bbe\u7f6e",
  "translator helper reads localized Settings copy"
);

for (const [key, english, chinese] of [
  [
    "reader.help.body",
    "Use Contents for chapters, Progress for chapter navigation, Preview for vocabulary support, and Mode to check reading mode status.",
    "\u4f7f\u7528\u201c\u76ee\u5f55\u201d\u67e5\u770b\u7ae0\u8282\uff0c\u4f7f\u7528\u201c\u8fdb\u5ea6\u201d\u5207\u6362\u7ae0\u8282\uff0c\u4f7f\u7528\u201c\u8bcd\u6c47\u9884\u89c8\u201d\u83b7\u53d6\u8bcd\u6c47\u8f85\u52a9\uff0c\u5e76\u4f7f\u7528\u201c\u9605\u8bfb\u6a21\u5f0f\u201d\u67e5\u770b\u5f53\u524d\u6a21\u5f0f\u72b6\u6001\u3002"
  ],
  ["reader.help.progress", "Progress changes chapters, not paragraph position.", "\u201c\u8fdb\u5ea6\u201d\u7528\u4e8e\u5207\u6362\u7ae0\u8282\uff0c\u800c\u4e0d\u662f\u6bb5\u843d\u4f4d\u7f6e\u3002"],
  ["reader.help.preview", "Preview shows current vocabulary support and remains local-first.", "\u201c\u8bcd\u6c47\u9884\u89c8\u201d\u663e\u793a\u5f53\u524d\u7684\u8bcd\u6c47\u8f85\u52a9\uff0c\u5e76\u4fdd\u6301\u672c\u5730\u4f18\u5148\u3002"],
  ["reader.help.placeholders", "Chinese Reading Mode and Mixed Mode remain placeholders.", "\u4e2d\u6587\u9605\u8bfb\u548c\u6df7\u5408\u9605\u8bfb\u4ecd\u4e3a\u5360\u4f4d\u529f\u80fd\u3002"],
  ["reader.help.openHelpCenter", "Open Help Center", "\u6253\u5f00\u5e2e\u52a9\u4e2d\u5fc3"],
  ["reader.glossary.title", "Book Glossary candidates", "\u4e66\u7c4d\u672f\u8bed\u5019\u9009"],
  ["reader.glossary.note", "For future translation protection.", "\u7528\u4e8e\u540e\u7eed\u7ffb\u8bd1\u65f6\u4fdd\u62a4\u4e13\u6709\u540d\u8bcd\u4e0e\u56fa\u5b9a\u8bd1\u540d\u3002"],
  ["reader.glossary.empty.import", "Import an EPUB to generate a Book Glossary.", "\u5bfc\u5165 EPUB \u540e\u53ef\u751f\u6210\u4e66\u7c4d\u672f\u8bed\u5019\u9009\u3002"],
  ["reader.glossary.empty.waiting", "Glossary candidates will appear after chapter text loads.", "\u7ae0\u8282\u6587\u672c\u52a0\u8f7d\u540e\u5c06\u663e\u793a\u672f\u8bed\u5019\u9009\u3002"],
  ["reader.glossary.empty.none", "No glossary candidates found yet.", "\u6682\u672a\u627e\u5230\u672f\u8bed\u5019\u9009\u3002"]
]) {
  assert.equal(getTranslation("en", key), english, `${key} preserves meaningful English copy`);
  assert.equal(getTranslation("zh-CN", key), chinese, `${key} provides meaningful Chinese copy`);
}

assert.equal(
  getTranslation("zh-CN", "reader.glossary.showingCount", { visible: 10, total: 14 }),
  "\u6b63\u5728\u663e\u793a 14 \u4e2a\u5019\u9009\u4e2d\u7684 10 \u4e2a\u3002",
  "Glossary truncation feedback localizes parameterized counts"
);

for (const [key, english, chinese] of [
  ["home.returnToReader.title", "Resume current session", "\u7ee7\u7eed\u5f53\u524d\u9605\u8bfb"],
  ["home.returnToReader.hint", "Back to your open reader. No reload needed.", "\u8fd4\u56de\u5f53\u524d\u6253\u5f00\u7684\u9605\u8bfb\u9875\u9762\uff0c\u65e0\u9700\u91cd\u65b0\u52a0\u8f7d\u3002"],
  ["home.returnToReader.action", "Resume", "\u7ee7\u7eed\u9605\u8bfb"],
  ["reader.saved.status", "Saved locally in this browser.", "\u5df2\u4fdd\u5b58\u5728\u6b64\u6d4f\u89c8\u5668\u4e2d\u3002"],
  ["reader.saved.forget", "Forget saved book", "\u79fb\u9664\u5df2\u4fdd\u5b58\u4e66\u7c4d"],
  ["savedBook.forget.title", "Forget this book?", "\u4ece\u672c\u8bbe\u5907\u79fb\u9664\u8fd9\u672c\u4e66\uff1f"],
  ["savedBook.forget.explanation", "This will delete its saved EPUB file and reading progress on this device.", "\u8fd9\u5c06\u5220\u9664\u672c\u8bbe\u5907\u4e0a\u4fdd\u5b58\u7684 EPUB \u6587\u4ef6\u548c\u9605\u8bfb\u8fdb\u5ea6\u3002"],
  ["savedBook.forget.cancel", "Cancel", "\u53d6\u6d88"],
  ["savedBook.forget.confirm", "Forget book", "\u79fb\u9664\u8fd9\u672c\u4e66"]
]) {
  assert.equal(getTranslation("en", key), english, `${key} preserves the approved English copy`);
  assert.equal(getTranslation("zh-CN", key), chinese, `${key} uses the exact approved Chinese copy`);
}

for (const [key, english, chinese] of [
  ["home.vocabulary.title", "Vocabulary Library", "\u751f\u8bcd\u672c"],
  ["home.library.title", "Local Library", "\u672c\u5730\u4e66\u5e93"],
  ["home.library.forget", "Remove", "\u79fb\u9664"],
  ["settings.backHome", "Back to Home", "\u8fd4\u56de\u4e3b\u9875"],
  ["settings.help.openHelpCenter", "Help Center", "\u5e2e\u52a9\u4e2d\u5fc3"],
  ["settings.helpCenter.title", "Help Center", "\u5e2e\u52a9\u4e2d\u5fc3"],
  ["settings.helpCenter.gettingStarted", "Getting Started", "\u5f00\u59cb\u4f7f\u7528"],
  ["settings.helpCenter.reading", "Reading", "\u9605\u8bfb"],
  ["settings.helpCenter.vocabulary", "Vocabulary", "\u8bcd\u6c47"],
  ["settings.helpCenter.storage", "Storage", "\u5b58\u50a8"],
  ["settings.helpCenter.featureStatus", "Feature Status", "\u529f\u80fd\u72b6\u6001"]
]) {
  assert.equal(getTranslation("en", key), english, `${key} preserves meaningful English UI copy`);
  assert.equal(getTranslation("zh-CN", key), chinese, `${key} uses the approved Chinese terminology`);
}

const remainingApplicationUiKeys = [
  "languageGate.aria",
  "home.continue.savedBook",
  "home.continue.chapterCount",
  "home.returnToReader.currentBook",
  "home.vocabulary.level",
  "home.vocabulary.countsAria",
  "home.vocabulary.note.unavailable",
  "home.vocabulary.note.empty",
  "home.vocabulary.note.saved",
  "home.library.lastRead",
  "home.library.untitled",
  "home.library.unavailable",
  "home.library.opening",
  "home.library.opened",
  "home.library.openMissing",
  "home.library.openFailed",
  "home.library.removed",
  "home.library.removeFailed",
  "home.library.restoreMissing",
  "home.library.restoreFailed",
  "home.library.noSavedData",
  "home.library.cleared",
  "home.library.clearFailed",
  "home.import.status.vocabularyLoaded",
  "home.import.status.vocabularyUnavailable",
  "home.import.status.noFile",
  "home.import.status.emptyFile",
  "home.import.status.invalidFile",
  "home.import.status.loading",
  "home.import.status.saveFailed",
  "home.import.status.noReadableChapters",
  "home.import.status.loaded",
  "home.import.status.failed",
  "settings.helpCenter.categoriesAria",
  "settings.helpCenter.gettingStartedBody",
  "settings.helpCenter.readingBody",
  "settings.helpCenter.vocabularyBody",
  "settings.helpCenter.storageBody",
  "settings.helpCenter.featureStatusBody",
  "reader.empty.description",
  "reader.vocabularyNote.aria",
  "reader.vocabularyNote.close",
  "reader.vocabularyNote.actionsAria",
  "reader.vocabularyNote.known",
  "reader.vocabularyNote.save",
  "reader.vocabularyNote.saved",
  "reader.vocabularyNote.hide",
  "reader.vocabularyNote.alreadySaved",
  "reader.vocabularyNote.chineseLabel",
  "reader.vocabularyNote.englishLabel",
  "reader.vocabularyNote.ieltsLabel"
];

for (const key of remainingApplicationUiKeys) {
  const english = getTranslation("en", key, {
    count: 3,
    level: 3,
    date: "2026-06-23",
    fileName: "sample.epub",
    title: "Sample Book",
    term: "sample"
  });
  const chinese = getTranslation("zh-CN", key, {
    count: 3,
    level: 3,
    date: "2026-06-23",
    fileName: "\u793a\u4f8b.epub",
    title: "\u793a\u4f8b\u4e66",
    term: "\u793a\u4f8b"
  });
  assert.notEqual(english, key, `${key} exists in the English locale`);
  assert.notEqual(chinese, key, `${key} exists in the Chinese locale`);
  const chineseWithoutAllowedTokens = chinese.replace(/EPUB|epub|IELTS|Interleaf Reader|JSON|CSV|TXT/g, "");
  assert.doesNotMatch(chineseWithoutAllowedTokens, /[A-Za-z]{2,}/, `${key} has no English-only Chinese UI prose`);
}

for (const [key, english, chinese] of [
  ["reader.status.chapterMissing", "Could not find the selected chapter.", "\u627e\u4e0d\u5230\u6240\u9009\u7ae0\u8282\u3002"],
  ["reader.status.chapterLoading", "Loading Sample Chapter...", "\u6b63\u5728\u52a0\u8f7d\u300a\u793a\u4f8b\u7ae0\u8282\u300b\u2026"],
  ["reader.status.chapterRendered", "Rendered Sample Chapter.", "\u5df2\u663e\u793a\u300a\u793a\u4f8b\u7ae0\u8282\u300b\u3002"],
  ["reader.status.chapterFailed", "Chapter failed to render. Please try another chapter.", "\u7ae0\u8282\u6e32\u67d3\u5931\u8d25\u3002\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u7ae0\u8282\u3002"],
  ["reader.chapter.emptyTitle", "Chapter content is not loaded yet.", "\u5c1a\u672a\u52a0\u8f7d\u7ae0\u8282\u5185\u5bb9\u3002"],
  ["reader.chapter.emptyBody", "Import an EPUB and choose a chapter to render it here.", "\u5bfc\u5165 EPUB \u5e76\u9009\u62e9\u7ae0\u8282\u540e\uff0c\u5373\u53ef\u5728\u6b64\u9605\u8bfb\u3002"],
  ["reader.chapter.errorTitle", "Sample Chapter could not be rendered.", "\u65e0\u6cd5\u663e\u793a\u300a\u793a\u4f8b\u7ae0\u8282\u300b\u3002"],
  ["reader.chapter.errorFallbackTitle", "Chapter", "\u7ae0\u8282"],
  ["reader.chapter.errorBody", "Please try another chapter or EPUB file.", "\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u7ae0\u8282\u6216 EPUB \u6587\u4ef6\u3002"],
  ["reader.mobile.modeInitial", "Mode \u00b7 English Study", "\u9605\u8bfb\u6a21\u5f0f \u00b7 \u82f1\u6587\u9605\u8bfb"]
]) {
  const englishParams = { title: "Sample Chapter" };
  const chineseParams = { title: "\u793a\u4f8b\u7ae0\u8282" };
  assert.equal(getTranslation("en", key, englishParams), english, `${key} provides English Reader feedback`);
  assert.equal(getTranslation("zh-CN", key, chineseParams), chinese, `${key} provides Chinese Reader feedback`);
}

for (const [key, english, chinese] of [
  ["vocabulary.page.title", "Vocabulary Library", "\u751f\u8bcd\u672c"],
  ["vocabulary.page.subtitle", "Saved word lists", "\u5df2\u4fdd\u5b58\u7684\u5355\u8bcd\u5217\u8868"],
  ["vocabulary.page.backHome", "Back to Home", "\u8fd4\u56de\u4e3b\u9875"],
  ["vocabulary.level.title", "Vocabulary Level", "\u8bcd\u6c47\u7b49\u7ea7"],
  ["vocabulary.tabs.learning", "Learning", "\u5b66\u4e60\u4e2d"],
  ["vocabulary.tabs.mastered", "Known", "\u5df2\u8ba4\u8bc6"],
  ["vocabulary.tabs.hidden", "Hidden", "\u5df2\u9690\u85cf"],
  ["vocabulary.manual.label", "Add a word to Learning", "\u6dfb\u52a0\u5230\u201c\u5b66\u4e60\u4e2d\u201d"],
  ["vocabulary.manual.placeholder", "Add a word manually", "\u624b\u52a8\u8f93\u5165\u5355\u8bcd\u6216\u77ed\u8bed"],
  ["vocabulary.manual.add", "Add to Learning", "\u6dfb\u52a0\u5230\u5b66\u4e60\u4e2d"],
  ["vocabulary.export.title", "Export", "\u5bfc\u51fa"],
  ["vocabulary.export.copyLearning", "Copy Learning", "\u590d\u5236\u201c\u5b66\u4e60\u4e2d\u201d"],
  ["vocabulary.export.copyAll", "Copy All", "\u590d\u5236\u5168\u90e8"],
  ["vocabulary.export.downloadCsv", "Download CSV", "\u4e0b\u8f7d CSV"],
  ["vocabulary.backup.title", "Backup / Restore", "\u5907\u4efd / \u6062\u590d"],
  ["vocabulary.backup.download", "Backup profile JSON", "\u5907\u4efd\u4e2a\u4eba\u6570\u636e JSON"],
  ["vocabulary.backup.restore", "Restore profile JSON", "\u6062\u590d\u4e2a\u4eba\u6570\u636e JSON"],
  ["vocabulary.export.feedback.empty", "No words to export yet.", "\u6682\u65e0\u53ef\u5bfc\u51fa\u7684\u5355\u8bcd\u3002"]
]) {
  assert.equal(getTranslation("en", key), english, `${key} preserves approved English copy`);
  assert.equal(getTranslation("zh-CN", key), chinese, `${key} uses approved Chinese terminology`);
}

const requiredVocabularyKeys = [
  "vocabulary.panel.title",
  "vocabulary.panel.subtitle",
  "vocabulary.panel.localNote",
  "vocabulary.panel.unavailable",
  "vocabulary.counts.aria",
  "vocabulary.level.current",
  "vocabulary.level.helpAria",
  "vocabulary.level.help",
  "vocabulary.level.option",
  "vocabulary.level.feedback.invalid",
  "vocabulary.level.feedback.saving",
  "vocabulary.level.feedback.saved",
  "vocabulary.level.feedback.error",
  "vocabulary.manual.feedback.inputUnavailable",
  "vocabulary.manual.feedback.empty",
  "vocabulary.manual.feedback.tooLong",
  "vocabulary.manual.feedback.alreadyLearning",
  "vocabulary.manual.feedback.movedFromMastered",
  "vocabulary.manual.feedback.movedFromHidden",
  "vocabulary.manual.feedback.added",
  "vocabulary.manual.feedback.error",
  "vocabulary.export.description",
  "vocabulary.export.downloadLearningTxt",
  "vocabulary.export.feedback.unavailable",
  "vocabulary.export.feedback.copiedLearning",
  "vocabulary.export.feedback.downloadedLearningTxt",
  "vocabulary.export.feedback.copiedAll",
  "vocabulary.export.feedback.downloadedCsv",
  "vocabulary.export.feedback.copyFailed",
  "vocabulary.export.feedback.failed",
  "vocabulary.backup.description",
  "vocabulary.backup.feedback.downloaded",
  "vocabulary.backup.feedback.failed",
  "vocabulary.backup.feedback.cancelled",
  "vocabulary.backup.feedback.restoring",
  "vocabulary.backup.feedback.restored",
  "vocabulary.backup.feedback.malformed",
  "vocabulary.backup.feedback.schema",
  "vocabulary.backup.feedback.restoreFailed",
  "vocabulary.tabs.aria",
  "vocabulary.tabs.labelCount",
  "vocabulary.tabs.empty.learning",
  "vocabulary.tabs.empty.mastered",
  "vocabulary.tabs.empty.hidden",
  "vocabulary.tabs.empty.default",
  "vocabulary.row.remove",
  "vocabulary.remove.feedback.notInList",
  "vocabulary.remove.feedback.removedLearning",
  "vocabulary.remove.feedback.removedMastered",
  "vocabulary.remove.feedback.removedHidden",
  "vocabulary.remove.feedback.error"
];

for (const key of requiredVocabularyKeys) {
  const english = getTranslation("en", key, { level: 3, maxLength: 80, label: "Learning", count: 2 });
  const chinese = getTranslation("zh-CN", key, { level: 3, maxLength: 80, label: "\u5b66\u4e60\u4e2d", count: 2 });
  assert.notEqual(english, key, `${key} exists in the English catalog`);
  assert.notEqual(chinese, key, `${key} exists in the Chinese catalog`);
  const chineseWithoutAllowedTokens = chinese
    .replace(/\{[^}]+\}/g, "")
    .replace(/EPUB|TXT|CSV|JSON|\u4e0d\u80cc\u5355\u8bcd/g, "");
  assert.doesNotMatch(chineseWithoutAllowedTokens, /[A-Za-z]{2,}/, `${key} has no English-only Chinese UI value`);
}

assert.deepEqual(
  getHomeEntryState(noLoadedBookState, []),
  {
    primaryAction: null,
    showReturnToReader: false,
    showResumeCurrentSession: false,
    showContinueReading: false,
    showLibraryEmptyState: false,
    showLibraryItems: true,
    savedBookCount: 0
  },
  "Case A: fresh app shows the built-in guide entry instead of an empty library"
);

assert.deepEqual(
  getHomeEntryState(loadedBookState, []),
  {
    primaryAction: "resume-current-session",
    showReturnToReader: true,
    showResumeCurrentSession: true,
    showContinueReading: false,
    showLibraryEmptyState: false,
    showLibraryItems: true,
    savedBookCount: 0
  },
  "Case B: in-memory book shows Return to Reader and keeps the built-in guide entry visible"
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
    showLibraryEmptyState: false,
    showLibraryItems: true,
    savedBookCount: 0
  },
  "Case F: deleting the saved book removes Continue Reading while the built-in guide remains in Library"
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
assert.equal(shouldShowLibraryEmptyState([]), false, "Library empty state hides because the built-in guide is visible");
assert.equal(shouldShowLibraryEmptyState([savedBook]), false, "Library empty state hides when saved books exist");
assert.equal(
  shouldShowLibraryEmptyState([], { includeBuiltInGuide: false }),
  true,
  "Library empty state shows when the built-in guide is hidden and no user books exist"
);

assert.deepEqual(
  getLocalLibraryViewState([]),
  {
    items: [createGuideLibraryItem()],
    hasUserBooks: false,
    hasVisibleItems: true,
    showEmptyState: false,
    emptyText: HOME_ENTRY_COPY.libraryEmptyState
  },
  "Local Library includes the built-in guide on first open"
);

const libraryWithSavedBook = getLocalLibraryViewState([savedBook]);
assert.equal(libraryWithSavedBook.items[0].bookKey, GUIDE_BOOK_KEY, "Built-in guide appears before saved EPUBs");
assert.equal(libraryWithSavedBook.items[0].isBuiltInGuide, true, "Built-in guide is marked distinctly");
assert.equal(libraryWithSavedBook.items[0].canOpen, true, "Built-in guide can be opened");
assert.equal(libraryWithSavedBook.items[0].canForget, false, "Built-in guide does not expose normal Forget");
assert.equal(libraryWithSavedBook.items[1], savedBook, "Saved user books remain in the Local Library list");

assert.deepEqual(
  getLocalLibraryViewState([], { includeBuiltInGuide: false }),
  {
    items: [],
    hasUserBooks: false,
    hasVisibleItems: false,
    showEmptyState: true,
    emptyText: HOME_ENTRY_COPY.libraryEmptyState
  },
  "Local Library can hide the built-in guide without deleting it"
);

const guideBook = createGuideBook(MODES.ENGLISH_STUDY);
assert.equal(guideBook.id, GUIDE_BOOK_KEY, "Guide book uses the stable built-in guide key");
assert.equal(guideBook.title, "Interleaf Reader Guide", "Guide book title is stable");
assert.equal(guideBook.author, "BookHeart", "Guide book author is stable");
assert.equal(guideBook.isBuiltInGuide, true, "Guide book is explicitly marked as built-in");
assert.equal("fileBlob" in guideBook, false, "Guide book is not modeled as an imported EPUB blob");
assert.equal(guideBook.chapters.length, 6, "Guide book retains exactly six stable instructional chapters");
assert.deepEqual(
  guideBook.chapters.map((chapter) => chapter.id),
  [
    "guide-welcome",
    "guide-first-book",
    "guide-reader-tools",
    "guide-vocabulary",
    "guide-level-export-backup",
    "guide-local-first"
  ],
  "Guide redesign preserves the existing chapter IDs and order"
);
assert.equal(
  guideBook.chapters.every((chapter) => chapter.contentVariants?.english && chapter.contentVariants?.chinese && chapter.contentVariants?.bilingual),
  true,
  "Guide chapters expose English, Chinese, and mixed content variants on one virtual book"
);
assert.equal(
  guideBook.chapters.every((chapter) => chapter.originalHtml && chapter.plainText),
  true,
  "Guide chapters include active Reader HTML and plain text for Preview"
);
assert.equal(
  guideBook.chapters.map((chapter) => chapter.id).join(","),
  syncGuideBookForReadingMode(createGuideBook(), MODES.CHINESE).chapters.map((chapter) => chapter.id).join(","),
  "Guide keeps the same chapter index across Reading Mode content variants"
);

for (const [mode, contentKey, label] of [
  [MODES.ENGLISH_STUDY, "english", "English Guide"],
  [MODES.CHINESE, "chinese", "中文指南"],
  [MODES.CLOZE_MIXED, "bilingual", "混合指南"]
]) {
  const modeBook = createGuideBook(mode);
  assert.equal(getGuideContentKeyForMode(mode), contentKey, `${mode} maps to ${contentKey} Guide content`);
  assert.equal(getGuideModeLabel(mode), label, `${mode} exposes the ${label} label`);
  assert.equal(modeBook.guideContentKey, contentKey, `${mode} Guide book uses ${contentKey} content`);
  assert.equal(modeBook.chapters.length >= 6, true, `${mode} Guide has at least six chapters`);
  assert.match(
    modeBook.plainText || modeBook.chapters.map((chapter) => chapter.plainText).join(" "),
    /Vocabulary|词汇|Local-first|本地|Preview|Reading Mode|阅读模式/,
    `${mode} Guide explains reader, vocabulary, local-first, or mode-driven content`
  );
}

for (const [mode, contentKey, label] of [
  [MODES.ENGLISH_STUDY, "english", "English Guide"],
  [MODES.CHINESE, "chinese", "中文指南"],
  [MODES.CLOZE_MIXED, "bilingual", "混合指南"]
]) {
  const modeBook = syncGuideBookForReadingMode(createGuideBook(), mode);
  assert.equal(getGuideContentKeyForMode(mode), contentKey, `${mode} maps to ${contentKey} Guide content`);
  assert.equal(getGuideModeLabel(mode), label, `${mode} exposes the ${label} label`);
  assert.equal(modeBook.guideContentKey, contentKey, `${mode} Guide book uses ${contentKey} content`);
  assert.equal(modeBook.chapters.length >= 6, true, `${mode} Guide has at least six chapters`);
  assert.match(
    modeBook.plainText || modeBook.chapters.map((chapter) => chapter.plainText).join(" "),
    /Vocabulary|词汇|Local-first|本地|Preview|Reading Mode|阅读模式/,
    `${mode} Guide explains reader, vocabulary, local-first, or mode-driven content`
  );
}

const virtualGuideBook = createGuideBook();
const welcomeChapter = virtualGuideBook.chapters[0];
const guideSnapshotsByMode = new Map();

function snapshotGuideBook(book) {
  return {
    guideContentKey: book.guideContentKey,
    guideModeLabel: book.guideModeLabel,
    readingMode: book.readingMode,
    title: book.title,
    chapters: book.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      originalHtml: chapter.originalHtml,
      plainText: chapter.plainText
    }))
  };
}

for (const [mode, expectedContentKey] of [
  [MODES.ENGLISH_STUDY, "english"],
  [MODES.CHINESE, "chinese"],
  [MODES.CLOZE_MIXED, "bilingual"]
]) {
  const freshBook = createGuideBook(mode);
  const synchronizedBook = syncGuideBookForReadingMode(createGuideBook(), mode);
  const freshFirstChapter = freshBook.chapters[0];
  const resolvedFirstChapter = resolveGuideChapterContent(welcomeChapter, mode);
  const freshSnapshot = snapshotGuideBook(freshBook);

  assert.equal(freshBook.guideContentKey, expectedContentKey, `${mode} resolves its mode-owned Guide variant`);
  assert.equal(freshFirstChapter.id, welcomeChapter.id, `${mode} keeps the stable first Guide chapter ID`);
  assert.deepEqual(
    {
      title: freshFirstChapter.title,
      html: freshFirstChapter.originalHtml,
      plainText: freshFirstChapter.plainText
    },
    resolvedFirstChapter,
    `${mode} active first chapter matches the resolved mode-owned variant`
  );
  assert.deepEqual(
    snapshotGuideBook(synchronizedBook),
    freshSnapshot,
    `${mode} fresh creation and synchronization produce equivalent Guide content`
  );

  guideSnapshotsByMode.set(mode, freshSnapshot);
}

for (const mode of [MODES.ENGLISH_STUDY, MODES.CHINESE, MODES.CLOZE_MIXED]) {
  const guideText = createGuideBook(mode).plainText;

  assert.doesNotMatch(
    guideText,
    /M2 adds|M2 also adds|M2 \u4f1a\u52a0\u5165|until a translation provider exists|\u76f4\u5230\u63a5\u5165\u7ffb\u8bd1\u670d\u52a1/i,
    `${mode} Guide does not describe current export, backup, or placeholder gates as future provider-only work`
  );
  assert.match(guideText, /TXT/, `${mode} Guide describes the current TXT export`);
  assert.match(guideText, /Backup \/ Restore/, `${mode} Guide describes current profile backup and restore`);
  assert.match(
    guideText,
    /Translation Version/i,
    `${mode} Guide names the future Translation Version prerequisite`
  );
  assert.match(guideText, /alignment/i, `${mode} Guide names the future alignment prerequisite`);
  assert.match(guideText, /candidate analysis/i, `${mode} Guide names the future candidate-analysis prerequisite`);
  assert.match(guideText, /generation contracts/i, `${mode} Guide names future generation contracts`);
}

const redesignedEnglishGuide = createGuideBook(MODES.ENGLISH_STUDY);
const redesignedChineseGuide = createGuideBook(MODES.CHINESE);
const redesignedMixedGuide = createGuideBook(MODES.CLOZE_MIXED);

assert.match(
  redesignedEnglishGuide.chapters[0].originalHtml,
  /Start in Three Minutes/,
  "English Guide restores the approved redesigned opening"
);
assert.match(
  redesignedChineseGuide.chapters[0].originalHtml,
  /三分钟开始使用[\s\S]*核心阅读流程|核心阅读流程[\s\S]*三分钟开始使用/,
  "Chinese Guide restores the authored Chinese opening and core reading flow"
);
assert.match(
  redesignedMixedGuide.chapters[0].originalHtml,
  /三分钟开始使用[\s\S]*核心阅读流程|核心阅读流程[\s\S]*三分钟开始使用/,
  "Mixed Guide restores the approved opening structure"
);

for (const book of [redesignedEnglishGuide, redesignedChineseGuide, redesignedMixedGuide]) {
  assert.doesNotMatch(book.plainText, /Welcome\s*\/\s*欢迎使用|阅读第一本书/i, "Old Guide opening is removed");
  assert.doesNotMatch(book.plainText, /Mastered|已掌握/, "Guide uses current Known terminology");
}

assert.match(
  redesignedChineseGuide.plainText,
  /导入与继续阅读[\s\S]*阅读与导航[\s\S]*词汇/,
  "Chinese Guide is authored Chinese content"
);
assert.match(
  redesignedMixedGuide.plainText,
  /Reading Mode|Vocabulary Preview|Known|Save|Hide/,
  "Mixed Guide intentionally retains English reading-support terms inside authored Chinese context"
);
for (const chapter of redesignedMixedGuide.chapters) {
  assert.doesNotMatch(
    chapter.originalHtml,
    /<p[^>]*>[^<]*\s\/\s[^<]*<\/p>/,
    `${chapter.id} Mixed content is not sentence-by-sentence slash translation`
  );
}

for (const field of ["title", "originalHtml", "plainText"]) {
  const englishValue = guideSnapshotsByMode.get(MODES.ENGLISH_STUDY).chapters[0][field];
  const chineseValue = guideSnapshotsByMode.get(MODES.CHINESE).chapters[0][field];
  const mixedValue = guideSnapshotsByMode.get(MODES.CLOZE_MIXED).chapters[0][field];

  assert.notEqual(englishValue, chineseValue, `English and Chinese first-chapter ${field} differ by Reading Mode`);
  assert.notEqual(englishValue, mixedValue, `English and Mixed first-chapter ${field} differ by Reading Mode`);
  assert.notEqual(chineseValue, mixedValue, `Chinese and Mixed first-chapter ${field} differ by Reading Mode`);
}

for (const uiLanguage of ["en", "zh-CN"]) {
  for (const mode of [MODES.ENGLISH_STUDY, MODES.CHINESE, MODES.CLOZE_MIXED]) {
    assert.deepEqual(
      snapshotGuideBook(createGuideBook(mode)),
      guideSnapshotsByMode.get(mode),
      `${normalizeUiLanguage(uiLanguage)} Interface Language does not alter the ${mode} Guide snapshot`
    );
  }
}

for (const [uiLanguage, mode, expectedContentKey] of [
  ["en", MODES.ENGLISH_STUDY, "english"],
  ["zh-CN", MODES.ENGLISH_STUDY, "english"],
  ["en", MODES.CHINESE, "chinese"],
  ["zh-CN", MODES.CHINESE, "chinese"],
  ["en", MODES.CLOZE_MIXED, "bilingual"],
  ["zh-CN", MODES.CLOZE_MIXED, "bilingual"]
]) {
  const normalizedUiLanguage = normalizeUiLanguage(uiLanguage);
  const modeBook = createGuideBook(mode);
  assert.equal(
    modeBook.guideContentKey,
    expectedContentKey,
    `${normalizedUiLanguage} UI + ${mode} renders ${expectedContentKey} Guide content`
  );
}

assert.match(
  renderChapterForMode(welcomeChapter, MODES.CHINESE, { isBuiltInGuide: true }).html,
  /三分钟开始使用|核心阅读流程/,
  "Built-in Guide Chinese mode renders pre-authored Chinese content"
);
assert.match(
  renderChapterForMode(welcomeChapter, MODES.CLOZE_MIXED, { isBuiltInGuide: true }).html,
  /三分钟开始使用[\s\S]*(?:Reading Mode|Vocabulary Preview)|(?:Reading Mode|Vocabulary Preview)[\s\S]*三分钟开始使用/,
  "Built-in Guide Mixed mode renders pre-authored mixed content"
);
withMinimalDocument(() => {
  assert.match(
    renderChapterForMode(welcomeChapter, MODES.CHINESE, {}).html,
    /Chinese Reading Mode placeholder|placeholder-panel/i,
    "Imported EPUB Chinese mode still uses the placeholder renderer"
  );
  assert.match(
    renderChapterForMode(welcomeChapter, MODES.CLOZE_MIXED, {}).html,
    /Mixed Mode placeholder|placeholder-panel/i,
    "Imported EPUB Mixed mode still uses the placeholder renderer"
  );
});

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

assert.match(
  formatContinueReadingSubtext(savedBook, createTranslator("zh-CN")),
  /9 \u7ae0/,
  "Continue Reading chapter counts follow Interface Language without translating book metadata"
);
assert.equal(
  formatContinueReadingSubtext({}, createTranslator("zh-CN")),
  "\u5df2\u4fdd\u5b58\u5728\u6b64\u6d4f\u89c8\u5668\u4e2d\u3002",
  "Continue Reading fallback follows Interface Language"
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
    vocabularyLibraryHidden: true,
    settingsHidden: true
  },
  "Home view hides Reader and Vocabulary Library"
);

assert.deepEqual(
  getAppViewVisibility("reader"),
  {
    currentView: "reader",
    homeHidden: true,
    readerHidden: false,
    vocabularyLibraryHidden: true,
    settingsHidden: true
  },
  "Reader view hides Home and Vocabulary Library"
);

assert.deepEqual(
  getAppViewVisibility("vocabulary-library"),
  {
    currentView: "vocabulary-library",
    homeHidden: true,
    readerHidden: true,
    vocabularyLibraryHidden: false,
    settingsHidden: true
  },
  "Vocabulary Library view hides Home and Reader"
);

assert.deepEqual(
  getAppViewVisibility("settings"),
  {
    currentView: "settings",
    homeHidden: true,
    readerHidden: true,
    vocabularyLibraryHidden: true,
    settingsHidden: false
  },
  "Settings view hides Home, Reader, and Vocabulary Library"
);

assert.deepEqual(
  getAppViewVisibility("unknown"),
  {
    currentView: "home",
    homeHidden: false,
    readerHidden: true,
    vocabularyLibraryHidden: true,
    settingsHidden: true
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
      vocabularyLibrary: { exists: true, hidden: true },
      settings: { exists: false, hidden: true }
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
      vocabularyLibrary: { exists: false, hidden: true },
      settings: { exists: false, hidden: true }
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

const vocabularyLevelState = getVocabularyLevelSelectorState({ selectedLevel: "level4" });
assert.deepEqual(
  vocabularyLevelState.options.map((option) => option.value),
  ["level1", "level2", "level3", "level4", "level5"],
  "Vocabulary Level selector exposes level1 through level5"
);
assert.equal(vocabularyLevelState.selectedLevel, "level4", "Vocabulary Level selector reflects saved level");
assert.equal(
  vocabularyLevelState.options.find((option) => option.value === "level4").selected,
  true,
  "Vocabulary Level selector marks the saved level as selected"
);
assert.equal(
  getVocabularyLevelSelectorState({ selectedLevel: "level9" }).selectedLevel,
  "level3",
  "Vocabulary Level selector falls back to level3 for invalid saved level"
);
assert.match(
  vocabularyLevelState.helpText,
  /controls which basic words are treated as already known/,
  "Vocabulary Level help explains the known-word baseline"
);
assert.match(
  vocabularyLevelState.helpText,
  /not a test score/,
  "Vocabulary Level help says the level is not a test score"
);
assert.match(
  vocabularyLevelState.helpText,
  /not a full dictionary completeness level/,
  "Vocabulary Level help says the level is not dictionary completeness"
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
      { id: "mastered", label: "Known", count: 1, isActive: false },
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
  "Vocabulary Library detail shows knownWords in the compatibility-owned mastered tab"
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
  "Known empty state copy is stable while preserving the mastered locale key"
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
      { id: "mastered", label: "Known", count: 0, isActive: false },
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
  "Manual add can move a Known term from the compatibility-owned mastered status to Learning"
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
    message: "Removed from Known."
  },
  "Vocabulary remove accepts terms in the current Known tab while preserving the mastered status ID"
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

assert.doesNotMatch(
  formatVocabularyLearningExportText(exportProfile),
  /comma, word|quote"word|dean|Learning|Known|Hidden|status|definition|example/i,
  "Learning TXT export excludes non-Learning words, status labels, definitions, and examples"
);

assert.equal(
  formatVocabularyAllExportText(exportProfile),
  "Learning\nalpha\nzeta\n\nKnown\ncomma, word\nquote\"word\n\nHidden\ndean",
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
    downloadLearningTxtDisabled: true,
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
    downloadLearningTxtDisabled: false,
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

for (const [pattern, description] of [
  [/class="language-gate-actions"[^>]*data-i18n-aria-label="languageGate\.aria"/, "language chooser accessibility label"],
  [/id="restoreTitle"[^>]*data-i18n="home\.continue\.savedBook"/, "Continue Reading fallback title"],
  [/id="restoreText"[^>]*data-i18n="reader\.saved\.status"/, "Continue Reading fallback status"],
  [/id="vocabularyLibraryLevel"[^>]*data-i18n="home\.vocabulary\.level"/, "Home vocabulary level"],
  [/class="vocabulary-counts"[^>]*data-i18n-aria-label="home\.vocabulary\.countsAria"/, "Home vocabulary counts accessibility label"],
  [/id="vocabularyLibraryEmpty"[^>]*data-i18n="home\.vocabulary\.note\.empty"/, "Home vocabulary empty state"],
  [/class="help-center-categories"[^>]*data-i18n-aria-label="settings\.helpCenter\.categoriesAria"/, "Help Center category accessibility label"],
  [/data-i18n="settings\.helpCenter\.gettingStartedBody"/, "Getting Started body"],
  [/data-i18n="settings\.helpCenter\.readingBody"/, "Reading body"],
  [/data-i18n="settings\.helpCenter\.vocabularyBody"/, "Vocabulary body"],
  [/data-i18n="settings\.helpCenter\.storageBody"/, "Storage body"],
  [/data-i18n="settings\.helpCenter\.featureStatusBody"/, "Feature Status body"],
  [/id="vocabBubble"[^>]*data-i18n-aria-label="reader\.vocabularyNote\.aria"/, "Vocabulary note accessibility label"],
  [/id="chapterContent"[\s\S]*data-i18n="reader\.empty\.description"/, "Reader placeholder explanation"]
]) {
  assert.match(homeHtml, pattern, `${description} resolves through Interface Language`);
}

assert.match(
  homeHtml,
  /id="mobileVocabButton"[^>]*data-i18n="reader\.mobile\.previewCount\.other"[^>]*data-i18n-params=/,
  "Initial mobile Preview count resolves through Interface Language before dynamic rendering"
);
assert.match(
  homeHtml,
  /id="mobileModeButton"[^>]*data-i18n="reader\.mobile\.modeInitial"/,
  "Initial mobile Mode summary resolves through Interface Language before dynamic rendering"
);

for (const [pattern, description] of [
  [/function setLocalizedStatus\([\s\S]*setTranslatedText\(elements\.statusText, key, params\)/, "dynamic application status translation boundary"],
  [/function renderVocabularyLibrarySummaryState\([\s\S]*home\.vocabulary\.note\.unavailable[\s\S]*home\.vocabulary\.note\.empty[\s\S]*home\.vocabulary\.note\.saved/, "Home vocabulary summary states"],
  [/function renderLibraryCard\([\s\S]*home\.library\.lastRead[\s\S]*home\.library\.open[\s\S]*home\.library\.forget/, "Local Library row chrome"],
  [/function deleteSavedBookFromLibrary\([\s\S]*home\.library\.removed[\s\S]*home\.library\.removeFailed/, "Local Library removal feedback"],
  [/function renderVocabularyPreviewListItem\([\s\S]*reader\.vocabularyNote\.actionsAria[\s\S]*reader\.vocabularyNote\.known[\s\S]*reader\.vocabularyNote\.save[\s\S]*reader\.vocabularyNote\.hide/, "Reader vocabulary action chrome"],
  [/function renderVocabularyBubbleContent\([\s\S]*reader\.vocabularyNote\.close[\s\S]*reader\.vocabularyNote\.englishLabel[\s\S]*reader\.vocabularyNote\.ieltsLabel/, "Vocabulary note labels and Close accessibility text"]
]) {
  assert.match(appSource, pattern, `${description} uses semantic locale keys`);
}

const interfaceLanguageHandlerSource = appSource.match(
  /function handleUiLanguageChoice\([\s\S]*?\r?\n}\r?\n\r?\nfunction handleSettingsUiLanguageChange/
)?.[0] || "";
assert.match(
  interfaceLanguageHandlerSource,
  /applyInterfaceLanguage\(\)[\s\S]*renderLocalLibrary\(\)[\s\S]*renderVocabularyLibrarySummary\(\)[\s\S]*refreshReaderChromeLanguage\(\)/,
  "Interface Language switching refreshes UI-owned dynamic surfaces"
);
assert.doesNotMatch(
  interfaceLanguageHandlerSource,
  /state\.(?:book|currentChapterId|currentMode)\s*=|syncGuideBookForReadingMode|saveReadingProgress|saveStoredBook|deleteStoredBook/,
  "Interface Language switching does not alter book, chapter, Reading Mode, Guide, progress, or stored-book state"
);
assert.match(
  appSource,
  /function refreshReaderChromeLanguage\([\s\S]*const chapter = getCurrentChapter\(\)[\s\S]*if \(!chapter \|\| chapter\.renderError\)[\s\S]*renderCurrentChapter\(\)[\s\S]*renderVocabularyPreview\(chapter\.vocabularyPreview \|\| \[\], chapter\)/,
  "Interface Language switching refreshes localized placeholders and otherwise rerenders Preview chrome without clearing chapter data"
);
assert.match(
  appSource,
  /function renderRestorePromptCopy\([\s\S]*setTranslatedText\(elements\.restoreTitle, ""\)[\s\S]*savedBook\?\.title \|\| savedBook\?\.fileName[\s\S]*setTranslatedText\(elements\.restoreText, ""\)[\s\S]*formatContinueReadingSubtext\(savedBook, t\)/,
  "Continue Reading refresh preserves imported title and metadata instead of treating them as UI copy"
);

const selectChapterSource = appSource.match(
  /async function selectChapter\([\s\S]*?\r?\n}\r?\n\r?\nfunction renderCurrentChapter/
)?.[0] || "";
for (const key of [
  "reader.status.chapterMissing",
  "reader.status.chapterLoading",
  "reader.status.chapterRendered",
  "reader.status.chapterFailed"
]) {
  assert.match(selectChapterSource, new RegExp(key.replaceAll(".", "\\.")), `${key} is used by Reader chapter status feedback`);
}
assert.doesNotMatch(
  selectChapterSource,
  /setStatus\(|setLocalizedStatus\(error\.message|setStatus\(error\.message/,
  "Reader chapter status feedback does not display raw internal exception text"
);

assert.match(
  appSource,
  /function renderCurrentChapter\([\s\S]*reader\.chapter\.emptyTitle[\s\S]*reader\.chapter\.emptyBody/,
  "Reader empty panel resolves through Interface Language"
);
assert.match(
  appSource,
  /function renderCurrentChapter\([\s\S]*reader\.chapter\.errorTitle[\s\S]*reader\.chapter\.errorBody/,
  "Reader failure panel resolves through Interface Language"
);

const bubbleRefreshSource = appSource.match(
  /function refreshOpenVocabularyBubbleLanguage\([\s\S]*?\r?\n}\r?\n/
)?.[0] || "";
assert.match(
  bubbleRefreshSource,
  /state\.activeBubbleTerm[\s\S]*renderVocabularyBubbleContent\(item\)/,
  "An open vocabulary bubble rerenders its UI chrome from the active term"
);
assert.doesNotMatch(
  bubbleRefreshSource,
  /hideBubble\(|showBubble\(|\.hidden\s*=|state\.activeBubbleTerm\s*=/,
  "Vocabulary bubble language refresh preserves visibility and active-term state"
);
assert.match(
  appSource,
  /function refreshReaderChromeLanguage\([\s\S]*refreshOpenVocabularyBubbleLanguage\(\)/,
  "Reader language refresh includes the visibly open vocabulary bubble"
);

const continueRefreshSource = appSource.match(
  /function refreshContinueReadingLanguage\([\s\S]*?\r?\n}\r?\n/
)?.[0] || "";
assert.match(
  continueRefreshSource,
  /const wasHidden = elements\.continueReadingPanel\.hidden[\s\S]*renderRestorePromptCopy\(state\.restoreCandidate\)[\s\S]*elements\.continueReadingPanel\.hidden = wasHidden/,
  "Hidden Continue Reading copy refreshes without changing visibility"
);
assert.doesNotMatch(
  continueRefreshSource,
  /state\.(?:book|currentChapterId|currentMode|restoreCandidate)\s*=|saveReadingProgress|saveStoredBook|deleteStoredBook/,
  "Continue Reading language refresh does not mutate session or stored data"
);

for (const [pattern, description] of [
  [/id="vocabularyLibraryView"[\s\S]*data-i18n="vocabulary\.page\.title"/, "Vocabulary page title"],
  [/id="vocabularyBackHomeButton"[^>]*data-i18n="vocabulary\.page\.backHome"/, "Vocabulary Back to Home"],
  [/id="vocabularyLibraryPanelTitle"[^>]*data-i18n="vocabulary\.panel\.title"/, "Vocabulary panel title"],
  [/id="vocabularyLevelTitle"[^>]*data-i18n="vocabulary\.level\.title"/, "Vocabulary Level label"],
  [/id="vocabularyManualAddInput"[\s\S]*data-i18n-placeholder="vocabulary\.manual\.placeholder"/, "Manual Add placeholder"],
  [/id="vocabularyExportTitle"[^>]*data-i18n="vocabulary\.export\.title"/, "Export heading"],
  [/id="vocabularyBackupTitle"[^>]*data-i18n="vocabulary\.backup\.title"/, "Backup heading"],
  [/class="vocabulary-tabs"[^>]*data-i18n-aria-label="vocabulary\.tabs\.aria"/, "Vocabulary tablist accessibility label"]
]) {
  assert.match(homeHtml, pattern, `${description} resolves through Interface Language`);
}

assert.match(
  homeHtml,
  /id="vocabularyPageLevel"[^>]*data-i18n="vocabulary\.level\.current"[^>]*data-i18n-params=/,
  "Initial Vocabulary Level summary has a parameterized locale binding"
);
assert.match(
  homeHtml,
  /value="level1"[^>]*data-i18n="vocabulary\.level\.option"[^>]*data-i18n-params=/,
  "Initial Vocabulary Level options have parameterized locale bindings"
);
assert.match(
  homeHtml,
  /id="vocabularyTabLearning"[^>]*data-i18n="vocabulary\.tabs\.labelCount"[^>]*data-i18n-params=/,
  "Initial Vocabulary tab counts have parameterized locale bindings"
);

assert.match(
  appSource,
  /function renderVocabularyLibraryPanelState\([\s\S]*vocabulary\.tabs\.labelCount[\s\S]*vocabulary\.row\.remove/,
  "Dynamic tabs, counts, empty states, and row actions use semantic locale keys"
);
assert.match(
  appSource,
  /function applyInterfaceLanguage\([\s\S]*getI18nNodeParams\(/,
  "Interface Language switching refreshes parameterized Vocabulary Library copy without reloading data"
);
assert.match(
  appSource,
  /function setTranslatedText\([\s\S]*dataset\.i18n[\s\S]*dataset\.i18nParams/,
  "Dynamic Vocabulary feedback retains semantic translation state for live language refresh"
);
assert.match(
  appSource,
  /function setVocabularyFeedbackElement\([\s\S]*setTranslatedText\(element, key, params\)/,
  "Vocabulary feedback uses the live-refresh translation boundary"
);
assert.match(
  appSource,
  /restoreVocabularyProfileInput\.addEventListener\("cancel"[\s\S]*vocabulary\.backup\.feedback\.cancelled/,
  "Cancelling the vocabulary restore picker produces localized feedback"
);

for (const [pattern, description] of [
  [/class="return-reader-title"[^>]*data-i18n="home\.returnToReader\.title"/, "Return-to-Reader title"],
  [/class="entry-hint"[^>]*data-i18n="home\.returnToReader\.hint"/, "Return-to-Reader hint"],
  [/class="primary-card-action"[^>]*data-i18n="home\.returnToReader\.action"/, "Return-to-Reader action"],
  [/id="readerSavedText"[^>]*data-i18n="reader\.saved\.status"/, "Reader saved status"],
  [/id="clearSavedBookButton"[^>]*data-i18n="reader\.saved\.forget"/, "Reader Forget button"],
  [/id="forgetBookTitle"[^>]*data-i18n="savedBook\.forget\.title"/, "Forget modal title"],
  [/id="forgetBookBody"[^>]*data-i18n="savedBook\.forget\.explanation"/, "Forget modal explanation"],
  [/id="cancelForgetBookButton"[^>]*data-i18n="savedBook\.forget\.cancel"/, "Forget modal Cancel button"],
  [/id="confirmForgetBookButton"[^>]*data-i18n="savedBook\.forget\.confirm"/, "Forget modal confirm button"]
]) {
  assert.match(homeHtml, pattern, `${description} resolves through Interface Language`);
}

assert.match(
  appSource,
  /function openForgetBookModal\([\s\S]*forgetBookBody\.textContent\s*=\s*t\("savedBook\.forget\.explanation"\)/,
  "Dynamic Forget modal explanation resolves through Interface Language"
);
assert.match(
  appSource,
  /function showSavedBookControls\([\s\S]*readerSavedText\.textContent\s*=\s*t\("reader\.saved\.status"\)/,
  "Dynamic Reader saved status resolves through Interface Language"
);

assert.match(
  homeHtml,
  /id="glossary-title"[^>]*data-i18n="reader\.glossary\.title"/,
  "Book Glossary heading resolves through Interface Language"
);
assert.match(
  homeHtml,
  /class="panel-note"[^>]*data-i18n="reader\.glossary\.note"/,
  "Book Glossary explanatory note resolves through Interface Language"
);
assert.match(
  homeHtml,
  /id="glossaryList"[\s\S]*data-i18n="reader\.glossary\.empty\.waiting"/,
  "Book Glossary initial empty state resolves through Interface Language"
);
assert.match(
  appSource,
  /function renderBookGlossary\(\)[\s\S]*reader\.glossary\.empty\.import[\s\S]*reader\.glossary\.empty\.waiting[\s\S]*reader\.glossary\.empty\.none[\s\S]*reader\.glossary\.showingCount/,
  "Dynamic Book Glossary states resolve through semantic locale keys"
);

for (const [id, key] of [
  ["chapter-nav-title", "reader.sidebar.chapters"],
  ["vocab-title", "reader.preview.title"],
  ["prevChapterButton", "reader.navigation.previous"],
  ["nextChapterButton", "reader.navigation.next"],
  ["bottomPrevChapterButton", "reader.navigation.previous"],
  ["backToTopButton", "reader.navigation.backToTop"],
  ["bottomNextChapterButton", "reader.navigation.next"],
  ["mobile-chapter-title", "reader.controls.contents"],
  ["mobile-progress-title", "reader.controls.progress"],
  ["mobile-vocab-title", "reader.preview.title"],
  ["mobile-mode-title", "reader.mode.title"]
]) {
  assert.match(
    homeHtml,
    new RegExp(`id="${id}"[^>]*data-i18n="${key}"`),
    `${id} resolves Reader chrome copy through a semantic locale key`
  );
}

assert.match(
  homeHtml,
  /class="reader-chrome-bar reader-chrome-bottom"[^>]*data-i18n-aria-label="reader\.aria\.quickControls"/,
  "Reader quick controls expose a localized accessibility label"
);
assert.match(
  homeHtml,
  /id="chapterList"[^>]*data-i18n-aria-label="reader\.aria\.tableOfContents"/,
  "Desktop Contents exposes a localized accessibility label"
);
assert.match(
  homeHtml,
  /class="reader-controls"[^>]*data-i18n-aria-label="reader\.aria\.chapterNavigation"/,
  "Reader chapter navigation exposes a localized accessibility label"
);
assert.match(
  appSource,
  /function getModeLabel\(mode\)[\s\S]*t\("reader\.mode\.chinese"\)[\s\S]*t\("reader\.mode\.mixed"\)[\s\S]*t\("reader\.mode\.english"\)/,
  "Dynamic Reading Mode labels resolve through the active Interface Language"
);
assert.match(
  appSource,
  /function updateMobileVocabButton\(count\)[\s\S]*reader\.mobile\.previewCount\.one[\s\S]*reader\.mobile\.previewCount\.other/,
  "Dynamic mobile Preview counts resolve through the active Interface Language"
);

assert.match(
  homeHtml,
  /id="languageGate"/,
  "Home markup includes a first-run interface-language chooser"
);

assert.match(
  homeHtml,
  /Choose interface language[\s\S]*\u9009\u62e9\u754c\u9762\u8bed\u8a00/,
  "Language chooser uses bilingual first-run copy"
);

assert.match(
  homeHtml,
  /data-ui-language-choice="zh-CN"[\s\S]*data-ui-language-choice="en"/,
  "Language chooser exposes Chinese and English choices"
);

assert.match(
  homeHtml,
  /id="openSettingsButton"/,
  "Home markup includes a Settings entry"
);

assert.match(
  homeHtml,
  /id="settingsView" class="app-view" hidden/,
  "Settings renders as an independent app view"
);

assert.match(
  homeHtml,
  /id="settingsUiLanguageSelect"[\s\S]*value="zh-CN"[\s\S]*value="en"/,
  "Settings view includes Chinese and English interface-language choices"
);

assert.match(
  homeHtml,
  /id="openHelpCenterButton"/,
  "Settings view includes a Help Center entry point"
);

assert.match(
  homeHtml,
  /id="readerHelpButton"[\s\S]*aria-label="Reader help"[\s\S]*>\?/,
  "Reader bar includes a circular question-mark contextual help button"
);

assert.match(
  homeHtml,
  /id="readerHelpPanel"[\s\S]*id="readerHelpOpenHelpCenterButton"[\s\S]*id="readerHelpOpenGuideButton"/,
  "Reader contextual help panel includes Help Center and Guide actions"
);

assert.match(
  homeHtml,
  /id="settingsShowGuideButton"/,
  "Settings view includes a Show Guide in Library action"
);

assert.match(
  homeHtml,
  /id="helpCenterPanel"[\s\S]*Getting Started[\s\S]*Reading[\s\S]*Vocabulary[\s\S]*Storage[\s\S]*Feature Status/,
  "Help Center includes required M2 categories"
);

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
  /id="downloadLearningTxtButton"/,
  "Vocabulary Library view includes dedicated Learning TXT download action"
);

assert.match(
  homeHtml,
  /不背单词 TXT/,
  "Vocabulary Library view labels the Learning TXT export for 不背单词"
);

assert.match(
  homeHtml,
  /one word or phrase per line[\s\S]*No definitions, examples, source sentences, book text, or copyrighted context/,
  "Vocabulary Library view explains safe Learning TXT export scope"
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
  /id="backupVocabularyProfileButton"/,
  "Vocabulary Library view includes vocabulary profile JSON backup action"
);

assert.match(
  homeHtml,
  /id="restoreVocabularyProfileButton"/,
  "Vocabulary Library view includes vocabulary profile JSON restore action"
);

assert.match(
  homeHtml,
  /vocabulary profile only[\s\S]*does not include EPUB files, book text, Local Library files, or reading progress/,
  "Vocabulary Library view explains Backup / Restore scope"
);

assert.match(
  homeHtml,
  /id="vocabularyLevelSelect"/,
  "Vocabulary Library view includes a Vocabulary Level selector"
);

assert.doesNotMatch(
  homeHtml,
  /id="guideVersionSelect"/,
  "Reader view no longer exposes a separate Guide version selector"
);

assert.match(
  homeHtml,
  /value="level1"[\s\S]*value="level2"[\s\S]*value="level3"[\s\S]*value="level4"[\s\S]*value="level5"/,
  "Vocabulary Library Level selector includes level1 through level5"
);

assert.match(
  homeHtml,
  /Vocabulary Level help/,
  "Vocabulary Library view includes Vocabulary Level help affordance"
);

assert.match(
  homeHtml,
  /not a test score/,
  "Vocabulary Library Level help explains the level is not a test score"
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
  /Learning[\s\S]*Known[\s\S]*Hidden/,
  "Vocabulary Library summary shows word-count labels"
);

assert.match(
  homeHtml,
  /Save words from Vocabulary Preview to build your library\./,
  "Vocabulary Library summary has an empty-state hint"
);

assert.match(
  homeHtml,
  /role="tab"[\s\S]*Learning \(0\)[\s\S]*role="tab"[\s\S]*Known \(0\)[\s\S]*role="tab"[\s\S]*Hidden \(0\)/,
  "Vocabulary Library view includes Learning, Known, and Hidden tabs"
);

assert.match(
  homeHtml,
  /Saved word lists on this device\./,
  "Vocabulary Library view explains local word storage"
);

assert.match(
  homeHtml,
  /They are not synced or uploaded\./,
  "Vocabulary Library view clarifies there is no sync or upload"
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

assert.doesNotMatch(
  homeHtml,
  /home-guide-entry/,
  "Home markup no longer includes the expandable guide panel"
);

assert.doesNotMatch(
  homeHtml,
  /Open reader guide/,
  "Home markup no longer exposes the guide as a standalone details panel"
);

assert.match(
  appSource,
  /from\s+["']\.\/i18n\.js["']/,
  "app.js uses the key-based i18n module"
);

assert.match(
  appSource,
  /data-hide-guide/,
  "app.js renders a Hide from Library action for the built-in guide card"
);

assert.match(
  appSource,
  /setGuideVisibilityPreference/,
  "app.js persists Guide visibility through app preferences"
);

assert.match(
  appSource,
  /syncGuideBookForReadingMode\(state\.book, nextMode\)/,
  "app.js re-renders the built-in Guide from Reading Mode without a separate Guide version selector"
);

assert.doesNotMatch(
  appSource,
  /renderGuideVersionPanel/,
  "app.js no longer renders a separate Guide version selector panel"
);

const stylesSource = await readFile(new URL("../pwa-reader/styles.css", import.meta.url), "utf8");

assert.match(
  stylesSource,
  /\.reader-layout\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/m,
  "Mobile .reader-layout rule uses a zero-minimum grid track to prevent flex/grid blowout"
);

assert.doesNotMatch(
  stylesSource,
  /\.reader-layout\s*\{\s*grid-template-columns:\s*1fr;/m,
  "Mobile .reader-layout must not regress to plain 1fr which causes responsive grid overflow"
);

console.log("homeState tests passed");
