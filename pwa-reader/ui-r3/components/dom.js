const SVG_NS = "http://www.w3.org/2000/svg";
import { createTranslator } from "../../i18n.js";

const ICON_PATHS = Object.freeze({
  home: ["M4 11.5 12 5l8 6.5", "M6.5 10.5V20h11v-9.5", "M10 20v-5h4v5"],
  library: ["M5 5.5c2.4-1 4.6-.8 7 .7v13.3c-2.4-1.5-4.6-1.7-7-.7z", "M12 6.2c2.4-1.5 4.6-1.7 7-.7v13.3c-2.4-1-4.6-.8-7 .7z"],
  vocabulary: ["M7 5h10", "M7 9h10", "M7 13h7", "M6 19c2.5-1.8 9.5-1.8 12 0", "M6 5v14"],
  settings: ["M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7", "M12 3v2", "M12 19v2", "M4.8 5.8l1.4 1.4", "M17.8 16.8l1.4 1.4", "M3 12h2", "M19 12h2", "M4.8 18.2l1.4-1.4", "M17.8 7.2l1.4-1.4"],
  import: ["M12 3v12", "M8 7l4-4 4 4", "M5 15v4h14v-4"],
  search: ["M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13", "M15.5 15.5 20 20"],
  menu: ["M5 7h14", "M5 12h14", "M5 17h14"],
  progress: ["M4 12h5", "M15 12h5", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"],
  mode: ["M3 18 8 5l5 13", "M5 13h6", "M15 10h5v8", "M20 13h-3a2.5 2.5 0 1 0 3 2"],
  book: ["M6 4h9.5A2.5 2.5 0 0 1 18 6.5V20H8a2 2 0 0 1-2-2z", "M8 4v14a2 2 0 0 0 2 2"],
  arrowRight: ["M5 12h14", "M13 6l6 6-6 6"],
  chevronLeft: ["M15 18l-6-6 6-6"],
  chevronRight: ["M9 6l6 6-6 6"],
  checkCircle: ["M22 11.1V12a10 10 0 1 1-5.9-9.1", "M22 4 12 14l-3-3"],
  bookmark: ["M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21z"],
  eyeOff: ["M3 3l18 18", "M10.6 10.6a2 2 0 0 0 2.8 2.8", "M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.5 6-.5.9-1.3 2-2.4 3", "M6.6 6.6A14.5 14.5 0 0 0 2.5 12c1.8 3.2 5.1 6 9.5 6 1.2 0 2.3-.2 3.3-.6"],
  play: ["M8 5v14l11-7z"],
  alert: ["M12 8v5", "M12 17h.01", "M10.3 4.5 3.5 17.2A2 2 0 0 0 5.2 20h13.6a2 2 0 0 0 1.7-2.8L13.7 4.5a2 2 0 0 0-3.4 0"]
});

export function createElement(documentRef, tagName, options = {}, children = []) {
  const element = documentRef.createElement(tagName);

  if (options.className) {
    element.className = options.className;
    element.setAttribute?.("class", options.className);
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.id) {
    element.id = options.id;
    element.setAttribute?.("id", options.id);
  }

  for (const [name, value] of Object.entries(options.attrs || {})) {
    if (value === false || value === null || value === undefined) {
      continue;
    }
    element.setAttribute(name, value === true ? "" : value);
  }

  for (const [name, value] of Object.entries(options.dataset || {})) {
    if (value === null || value === undefined) {
      continue;
    }
    element.dataset[name] = String(value);
    element.setAttribute?.(
      `data-${name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`,
      String(value)
    );
  }

  if (options.disabled) {
    element.disabled = true;
    element.setAttribute?.("disabled", "");
    element.setAttribute?.("aria-disabled", "true");
  }

  if (options.type) {
    element.type = options.type;
    element.setAttribute?.("type", options.type);
  }

  if (options.accept) {
    element.accept = options.accept;
    element.setAttribute?.("accept", options.accept);
  }

  if (options.value !== undefined) {
    element.value = options.value;
  }

  children.forEach((child) => element.appendChild(child));
  return element;
}

export function createIcon(documentRef, name) {
  const svg = documentRef.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "r3-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const paths = ICON_PATHS[name] || ICON_PATHS.book;
  paths.forEach((pathData) => {
    const path = documentRef.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
  });

  return svg;
}

export function createIconButton(documentRef, options = {}) {
  const button = createElement(documentRef, "button", {
    className: options.className || "r3-icon-button",
    attrs: {
      type: "button",
      "aria-label": options.label,
      "aria-disabled": options.disabled ? "true" : undefined
    },
    dataset: options.dataset,
    disabled: options.disabled
  });
  button.appendChild(createIcon(documentRef, options.icon || "book"));
  return button;
}

export function createActionButton(documentRef, options = {}) {
  const button = createElement(documentRef, "button", {
    className: options.className || "r3-action-button",
    attrs: {
      type: "button",
      "aria-disabled": options.disabled ? "true" : undefined
    },
    dataset: options.dataset,
    disabled: options.disabled
  });

  if (options.icon) {
    button.appendChild(createIcon(documentRef, options.icon));
  }
  button.appendChild(createElement(documentRef, "span", { text: options.label || "" }));
  return button;
}

export function createProgressBar(documentRef, percent = 0) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const bar = createElement(documentRef, "div", {
    className: "r3-progress",
    attrs: {
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": String(safePercent)
    },
    dataset: {
      progressPercent: safePercent
    }
  });
  const fill = createElement(documentRef, "span", { className: "r3-progress-fill" });
  fill.style.width = `${safePercent}%`;
  bar.appendChild(fill);
  return bar;
}

export function createBookCover(documentRef, title = "Book") {
  const cover = createElement(documentRef, "div", { className: "r3-book-cover" });
  cover.appendChild(createElement(documentRef, "span", { text: title }));
  return cover;
}

export function createSectionHeader(documentRef, title, action = null) {
  const header = createElement(documentRef, "div", { className: "r3-section-header" });
  header.appendChild(createElement(documentRef, "h2", { text: title }));
  if (action) {
    header.appendChild(action);
  }
  return header;
}

export function formatModeLabel(mode, t = createTranslator("en")) {
  if (mode === "english-study") {
    return t("reader.mode.english");
  }
  if (mode === "chinese") {
    return t("reader.mode.chinese");
  }
  if (mode === "cloze-mixed") {
    return t("reader.mode.mixed");
  }
  return mode || t("reader.mode.english");
}

export function getProgressPercent(item = {}) {
  const progress = item.progress || item;
  if (Number.isFinite(progress.scrollRatio)) {
    return Math.round(progress.scrollRatio * 100);
  }
  const chapterIndex = Number.isInteger(progress.currentChapterIndex)
    ? progress.currentChapterIndex
    : item.currentChapterIndex;
  const chapterCount = item.chapterCount || progress.chapterCount || 0;
  if (Number.isInteger(chapterIndex) && chapterCount > 0) {
    return Math.round(((chapterIndex + 1) / chapterCount) * 100);
  }
  return 0;
}

export function getProgressLabel(item = {}, t = createTranslator("en")) {
  return item.progress?.progressText || item.progressLabel || item.progressText || t("r3.common.noProgress");
}
