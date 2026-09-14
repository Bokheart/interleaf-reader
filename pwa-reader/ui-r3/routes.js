export const R3_ROUTES = Object.freeze({
  HOME: "shell.home",
  LIBRARY: "shell.library",
  BOOK_DETAIL: "shell.bookDetail",
  VOCABULARY: "shell.vocabulary",
  SETTINGS_HOME: "settings.home",
  SETTINGS_APPEARANCE: "settings.appearance",
  SETTINGS_READING: "settings.reading",
  SETTINGS_LANGUAGE: "settings.language",
  READER: "reader.canvas"
});

export const R3_OVERLAYS = Object.freeze({
  CONTENTS: "reader.overlay.contents",
  PREVIEW: "reader.overlay.preview",
  POPOVER: "reader.overlay.popover",
  PROGRESS: "reader.overlay.progress",
  MODE: "reader.overlay.mode"
});

const ROUTE_VALUES = new Set(Object.values(R3_ROUTES));
const OVERLAY_VALUES = new Set(Object.values(R3_OVERLAYS));

export function isKnownR3Route(route) {
  return ROUTE_VALUES.has(route);
}

export function isKnownR3Overlay(overlay) {
  return overlay === null || OVERLAY_VALUES.has(overlay);
}
