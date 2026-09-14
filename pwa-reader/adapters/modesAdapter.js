import { MODES, renderChapterForMode } from "../readingModes.js";

const MODE_VALUES = Object.freeze(Object.values(MODES));

export function createModesAdapter(deps = {}) {
  const api = {
    renderChapterForMode: deps.renderChapterForMode || renderChapterForMode
  };

  return {
    getModeConstants() {
      return { ...MODES };
    },

    resolveModeFromProgress(progress = {}, fallback = MODES.ENGLISH_STUDY) {
      return MODE_VALUES.includes(progress.currentMode) ? progress.currentMode : fallback;
    },

    getModeAvailability(context = {}) {
      const isBuiltInGuide = context.isBuiltInGuide === true;

      return [
        {
          value: MODES.ENGLISH_STUDY,
          label: "English Study",
          status: "ready",
          available: true
        },
        {
          value: MODES.CHINESE,
          label: "Chinese",
          status: isBuiltInGuide ? "ready-guide-only" : "placeholder-unavailable",
          available: isBuiltInGuide
        },
        {
          value: MODES.CLOZE_MIXED,
          label: "Mixed Mode",
          status: isBuiltInGuide ? "ready-guide-only" : "placeholder-unavailable",
          available: isBuiltInGuide
        }
      ];
    },

    renderChapter(chapter, mode, options = {}) {
      return api.renderChapterForMode(chapter, mode, options);
    }
  };
}

const modesAdapter = createModesAdapter();

export const getModeConstants = modesAdapter.getModeConstants;
export const resolveModeFromProgress = modesAdapter.resolveModeFromProgress;
export const getModeAvailability = modesAdapter.getModeAvailability;
export const renderChapter = modesAdapter.renderChapter;
