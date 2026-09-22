import { createBookRow } from "../components/bookRow.js";
import {
  createActionButton,
  createBookCover,
  createElement,
  createIconButton,
  createProgressBar,
  createSectionHeader,
  formatModeLabel,
  getProgressLabel,
  getProgressPercent
} from "../components/dom.js";
import { R3_ROUTES } from "../routes.js";
import { createTranslator } from "../../i18n.js";

function createBrandHeader(documentRef, t) {
  const header = createElement(documentRef, "header", { className: "r3-home-brand" });
  const titleGroup = createElement(documentRef, "div");
  titleGroup.appendChild(createElement(documentRef, "p", {
    className: "r3-eyebrow",
    text: "Interleaf"
  }));
  titleGroup.appendChild(createElement(documentRef, "h1", { text: "Interleaf Reader" }));
  header.appendChild(titleGroup);
  header.appendChild(createIconButton(documentRef, {
    icon: "settings",
    label: t("settings.open"),
    dataset: { action: "navigate", route: R3_ROUTES.SETTINGS_HOME }
  }));
  return header;
}

function createContinueCard(documentRef, continueReading, t) {
  if (!continueReading?.hasFileBlob && !continueReading?.bookKey) {
    return null;
  }

  const percent = getProgressPercent(continueReading);
  const card = createElement(documentRef, "section", { className: "r3-card r3-continue-card" });
  card.appendChild(createSectionHeader(documentRef, t("home.continue.title")));

  const content = createElement(documentRef, "div", { className: "r3-continue-body" });
  content.appendChild(createBookCover(documentRef, continueReading.title || t("r3.common.untitledBook")));

  const detail = createElement(documentRef, "div", { className: "r3-continue-detail" });
  detail.appendChild(createElement(documentRef, "h3", { text: continueReading.title || t("r3.common.untitledBook") }));
  detail.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: getProgressLabel(continueReading, t)
  }));

  const progressRow = createElement(documentRef, "div", { className: "r3-continue-progress" });
  progressRow.appendChild(createProgressBar(documentRef, percent));
  progressRow.appendChild(createElement(documentRef, "strong", { text: `${percent}%` }));
  detail.appendChild(progressRow);

  detail.appendChild(createActionButton(documentRef, {
    className: "r3-primary-button",
    icon: "play",
    label: t("r3.home.resumeReading"),
    dataset: {
      action: "resume-book",
      bookKey: continueReading.bookKey
    }
  }));

  content.appendChild(detail);
  card.appendChild(content);
  return card;
}

function createQuickActions(documentRef, t) {
  const section = createElement(documentRef, "section", { className: "r3-section r3-quick-section" });
  section.appendChild(createSectionHeader(documentRef, t("r3.home.quickActions")));

  const grid = createElement(documentRef, "div", { className: "r3-quick-grid" });
  grid.appendChild(createActionButton(documentRef, {
    className: "r3-quick-action",
    icon: "import",
    label: t("r3.home.importBook"),
    dataset: { action: "import-open" }
  }));
  grid.appendChild(createActionButton(documentRef, {
    className: "r3-quick-action",
    icon: "library",
    label: t("r3.home.openLibrary"),
    dataset: {
      action: "navigate",
      route: R3_ROUTES.LIBRARY
    }
  }));
  section.appendChild(grid);
  return section;
}

function createSnapshotRow(documentRef, label, value, options = {}) {
  const row = createElement(documentRef, options.disabled ? "button" : "div", {
    className: "r3-snapshot-row",
    attrs: options.disabled ? { type: "button", "aria-disabled": "true" } : {},
    dataset: options.disabled ? { action: "unsupported" } : undefined,
    disabled: options.disabled
  });
  row.appendChild(createElement(documentRef, "span", { className: "r3-snapshot-label", text: label }));
  row.appendChild(createElement(documentRef, "span", { className: "r3-snapshot-value", text: value }));
  return row;
}

function formatVersionStatus(status, t) {
  if (status === "original-only") {
    return t("r3.home.originalOnly");
  }

  return t("r3.home.noActiveBook");
}

function createSnapshot(documentRef, state, t) {
  if (!(state.home?.continueReading || state.continueReading)) {
    return null;
  }

  const snapshot = state.home?.snapshot || {};
  const section = createElement(documentRef, "section", { className: "r3-card r3-snapshot" });
  section.appendChild(createSectionHeader(documentRef, t("r3.home.currentSnapshot")));
  section.appendChild(createSnapshotRow(
    documentRef,
    t("r3.home.readingMode"),
    formatModeLabel(snapshot.readingMode || state.activeReadingMode, t)
  ));
  section.appendChild(createSnapshotRow(
    documentRef,
    t("r3.home.vocabularyPreview"),
    snapshot.vocabularyPreviewCount === null || snapshot.vocabularyPreviewCount === undefined
      ? t("r3.home.availableInReader")
      : t("r3.home.termCount", { count: snapshot.vocabularyPreviewCount }),
    { disabled: true }
  ));
  section.appendChild(createSnapshotRow(
    documentRef,
    t("r3.home.availableVersions"),
    formatVersionStatus(snapshot.currentBookVersionStatus, t),
    { disabled: true }
  ));
  section.appendChild(createSnapshotRow(
    documentRef,
    t("r3.home.bookDetails"),
    snapshot.bookDetailsAvailable ? t("r3.home.open") : t("r3.home.notAvailable"),
    { disabled: !snapshot.bookDetailsAvailable }
  ));
  return section;
}

function createRecentHelpful(documentRef, state, t) {
  const books = state.home?.recentBooks || [];
  const section = createElement(documentRef, "section", { className: "r3-section r3-recent-section" });
  section.appendChild(createSectionHeader(documentRef, t("r3.home.recentHelpful")));

  const list = createElement(documentRef, "div", { className: "r3-recent-list" });
  books.slice(0, 3).forEach((book) => {
    list.appendChild(createBookRow(documentRef, book, t));
  });

  const guide = createElement(documentRef, "button", {
    className: "r3-guide-card",
    attrs: {
      type: "button",
      "aria-disabled": "true"
    },
    dataset: { action: "unsupported" },
    disabled: true
  });
  guide.appendChild(createElement(documentRef, "strong", { text: t("r3.home.guide") }));
  guide.appendChild(createElement(documentRef, "span", { text: t("r3.home.guidePending") }));
  list.appendChild(guide);

  section.appendChild(list);
  return section;
}

export function createHomeView(documentRef, state, t = createTranslator("en")) {
  const continueCard = createContinueCard(documentRef, state.home?.continueReading || state.continueReading, t);
  const snapshot = createSnapshot(documentRef, state, t);
  const view = createElement(documentRef, "div", {
    className: `r3-screen r3-home-screen${continueCard ? " has-continue" : ""}${snapshot ? " has-snapshot" : ""}`,
    attrs: { "data-screen": "home" }
  });

  view.appendChild(createBrandHeader(documentRef, t));
  if (continueCard) {
    view.appendChild(continueCard);
  }
  view.appendChild(createQuickActions(documentRef, t));
  if (snapshot) {
    view.appendChild(snapshot);
  }
  view.appendChild(createRecentHelpful(documentRef, state, t));
  return view;
}
