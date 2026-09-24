import {
  getAppPreferences,
  setGuideVersionPreference,
  setGuideVisibilityPreference,
  setReadingLayoutPreference,
  setUiLanguagePreference
} from "../storage.js";

export function createSettingsAdapter(deps = {}) {
  const api = {
    getAppPreferences: deps.getAppPreferences || getAppPreferences,
    setUiLanguagePreference: deps.setUiLanguagePreference || setUiLanguagePreference,
    setGuideVisibilityPreference: deps.setGuideVisibilityPreference || setGuideVisibilityPreference,
    setGuideVersionPreference: deps.setGuideVersionPreference || setGuideVersionPreference,
    setReadingLayoutPreference: deps.setReadingLayoutPreference || setReadingLayoutPreference
  };

  return {
    getPreferences() {
      return api.getAppPreferences();
    },

    setUiLanguage(language) {
      return api.setUiLanguagePreference(language);
    },

    setGuideVisibility(isVisible) {
      return api.setGuideVisibilityPreference(isVisible);
    },

    setGuideVersion(versionId) {
      return api.setGuideVersionPreference(versionId);
    },

    setReadingLayout(layout) {
      return api.setReadingLayoutPreference(layout);
    },

    getFutureSettingsContracts() {
      return [
        {
          id: "appearance",
          label: "Appearance",
          persistence: "future-only"
        },
        {
          id: "reading",
          label: "Reading",
          persistence: "future-only"
        }
      ];
    }
  };
}

const settingsAdapter = createSettingsAdapter();

export const getPreferences = settingsAdapter.getPreferences;
export const setUiLanguage = settingsAdapter.setUiLanguage;
export const setGuideVisibility = settingsAdapter.setGuideVisibility;
export const setGuideVersion = settingsAdapter.setGuideVersion;
export const setReadingLayout = settingsAdapter.setReadingLayout;
export const getFutureSettingsContracts = settingsAdapter.getFutureSettingsContracts;
