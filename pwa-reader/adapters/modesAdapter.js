import { MODES, renderChapterForMode } from "../readingModes.js";
import { storage } from "../storage.js";

const MODE_VALUES = Object.freeze(Object.values(MODES));

// Requested mode remains the persisted compatibility value. A placeholder has
// no effective language representation and cannot supply source-text offsets.
export function getModeRepresentation(mode, context = {}) {
  const requestedMode = MODE_VALUES.includes(mode) ? mode : MODES.ENGLISH_STUDY;
  const isBuiltInGuide = context.isBuiltInGuide === true;
  const available = requestedMode === MODES.ENGLISH_STUDY || isBuiltInGuide;
  return {
    requestedMode,
    effectiveMode: available ? requestedMode : null,
    representationStatus: !available ? "placeholder-unavailable"
      : isBuiltInGuide && requestedMode !== MODES.ENGLISH_STUDY ? "ready-guide-only" : "ready"
  };
}

export function createModesAdapter(deps = {}) {
  const api = {
    renderChapterForMode: deps.renderChapterForMode || renderChapterForMode,
    storage: deps.storage || storage
  };

  return {
    getModeConstants() {
      return { ...MODES };
    },

    resolveModeFromProgress(progress = {}, fallback = api.storage.get("last-mode")) {
      const safeProgress = progress && typeof progress === "object" ? progress : {};
      if (MODE_VALUES.includes(safeProgress.currentMode)) return safeProgress.currentMode;
      return MODE_VALUES.includes(fallback) ? fallback : MODES.ENGLISH_STUDY;
    },

    getModeRepresentation,

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
