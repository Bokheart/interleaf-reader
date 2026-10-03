const VALID_READER_FONT_SIZES = ["sm", "md", "lg", "xl"];
const VALID_READER_LINE_HEIGHTS = ["tight", "normal", "relaxed"];
const VALID_READER_MARGINS = ["narrow", "medium", "wide"];
const VALID_READER_THEMES = ["light", "dark"];

export const READER_APPEARANCE_FONT_SIZES = Object.freeze([...VALID_READER_FONT_SIZES]);
export const READER_APPEARANCE_LINE_HEIGHTS = Object.freeze([...VALID_READER_LINE_HEIGHTS]);
export const READER_APPEARANCE_MARGINS = Object.freeze([...VALID_READER_MARGINS]);
export const READER_APPEARANCE_THEMES = Object.freeze([...VALID_READER_THEMES]);

export function getDefaultReaderAppearance() {
  return {
    fontSize: "md",
    lineHeight: "normal",
    margin: "medium",
    theme: "light"
  };
}

function pickAllowedValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function normalizeReaderAppearance(appearance = {}) {
  const defaults = getDefaultReaderAppearance();
  const safe = appearance && typeof appearance === "object" ? appearance : {};
  return {
    fontSize: pickAllowedValue(safe.fontSize, VALID_READER_FONT_SIZES, defaults.fontSize),
    lineHeight: pickAllowedValue(safe.lineHeight, VALID_READER_LINE_HEIGHTS, defaults.lineHeight),
    margin: pickAllowedValue(safe.margin, VALID_READER_MARGINS, defaults.margin),
    theme: pickAllowedValue(safe.theme, VALID_READER_THEMES, defaults.theme)
  };
}

export function resolveReaderAppearance(source = {}) {
  if (source?.readerAppearance) {
    return normalizeReaderAppearance(source.readerAppearance);
  }
  return normalizeReaderAppearance(source);
}

export function readerAppearanceSignature(appearance = {}) {
  const normalized = resolveReaderAppearance(appearance);
  return [
    normalized.fontSize,
    normalized.lineHeight,
    normalized.margin,
    normalized.theme
  ].join(":");
}

export function applyReaderAppearanceDataset(element, appearance = {}) {
  if (!element) return null;
  const normalized = resolveReaderAppearance(appearance);
  element.dataset.readerFont = normalized.fontSize;
  element.dataset.readerLine = normalized.lineHeight;
  element.dataset.readerMargin = normalized.margin;
  element.dataset.readerTheme = normalized.theme;
  return normalized;
}
