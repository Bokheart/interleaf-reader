import { getChapterIndex, formatChapterProgress } from "./navigationEngine.js";
import {
  calculateScrollRatio,
  calculateScrollTopFromRatio,
  shouldRestoreScrollForProgress
} from "./storage.js";

export function createReadingProgressRecord({
  bookKey,
  chapters = [],
  currentChapterId = null,
  currentMode = "english-study",
  scrollTop = 0,
  scrollHeight = 0,
  clientHeight = 0,
  now = Date.now(),
  overrides = {}
} = {}) {
  const currentChapterIndex = getChapterIndex(chapters, currentChapterId);

  return {
    bookKey,
    currentChapterId,
    currentChapterIndex,
    currentMode,
    progressText: formatChapterProgress(chapters, currentChapterIndex),
    scrollTop: Math.max(0, Number(scrollTop) || 0),
    scrollRatio: calculateScrollRatio(scrollTop, scrollHeight, clientHeight),
    updatedAt: now,
    ...overrides
  };
}

export function resolveRestoredScrollTop(progress = {}, chapterId = "", metrics = {}) {
  if (!shouldRestoreScrollForProgress(progress, chapterId)) {
    return null;
  }

  return calculateScrollTopFromRatio(
    progress.scrollRatio,
    metrics.scrollHeight,
    metrics.clientHeight
  );
}
