import { en } from "./locales/en.js";
import { zhCN } from "./locales/zh-CN.js";

export const DEFAULT_UI_LANGUAGE = "en";
export const UI_LANGUAGE_OPTIONS = Object.freeze([
  { value: "zh-CN", label: "\u4e2d\u6587" },
  { value: "en", label: "English" }
]);

const LOCALES = Object.freeze({
  en,
  "zh-CN": zhCN
});

export function normalizeUiLanguage(language) {
  const normalized = String(language || "").trim().toLowerCase();

  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return DEFAULT_UI_LANGUAGE;
}

export function detectPreferredUiLanguage(navigatorLike = {}) {
  const languages = Array.isArray(navigatorLike.languages) && navigatorLike.languages.length
    ? navigatorLike.languages
    : [navigatorLike.language];
  const detected = languages.find((language) => /^zh/i.test(String(language || "")));

  return detected ? "zh-CN" : DEFAULT_UI_LANGUAGE;
}

export function getTranslation(language, key, params = {}) {
  const normalizedLanguage = normalizeUiLanguage(language);
  const locale = LOCALES[normalizedLanguage] || LOCALES[DEFAULT_UI_LANGUAGE];
  const fallback = LOCALES[DEFAULT_UI_LANGUAGE][key] || key;
  const template = locale[key] || fallback;

  return Object.entries(params).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, String(value ?? ""));
  }, template);
}

export function createTranslator(language) {
  const normalizedLanguage = normalizeUiLanguage(language);
  return (key, params) => getTranslation(normalizedLanguage, key, params);
}

export function getLanguageChoices(selectedLanguage = DEFAULT_UI_LANGUAGE) {
  const normalizedLanguage = normalizeUiLanguage(selectedLanguage);

  return UI_LANGUAGE_OPTIONS.map((option) => ({
    ...option,
    selected: option.value === normalizedLanguage
  }));
}

export function getFirstRunLanguageChoiceState(preferences = {}, options = {}) {
  const selectedLanguage = normalizeUiLanguage(
    preferences.uiLanguage || detectPreferredUiLanguage(options.navigatorLike)
  );

  return {
    shouldShow: preferences.hasChosenUiLanguage !== true,
    selectedLanguage,
    title: "Choose interface language",
    subtitle: "\u9009\u62e9\u754c\u9762\u8bed\u8a00",
    choices: getLanguageChoices(selectedLanguage)
  };
}
