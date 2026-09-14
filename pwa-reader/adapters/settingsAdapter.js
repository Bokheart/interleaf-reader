import {
  getAppPreferences,
  setGuideVersionPreference,
  setGuideVisibilityPreference,
  setUiLanguagePreference
} from "../storage.js";

export function createSettingsAdapter(deps = {}) {
  const api = {
    getAppPreferences: deps.getAppPreferences || getAppPreferences,
    setUiLanguagePreference: deps.setUiLanguagePreference || setUiLanguagePreference,
    setGuideVisibilityPreference: deps.setGuideVisibilityPreference || setGuideVisibilityPreference,
    setGuideVersionPreference: deps.setGuideVersionPreference || setGuideVersionPreference
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
export const getFutureSettingsContracts = settingsAdapter.getFutureSettingsContracts;
