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

function createBrandHeader(documentRef) {
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
    label: "Settings unavailable",
    disabled: true,
    dataset: { action: "unsupported" }
  }));
  return header;
}

function createContinueCard(documentRef, continueReading) {
  if (!continueReading?.hasFileBlob && !continueReading?.bookKey) {
    return null;
  }

  const percent = getProgressPercent(continueReading);
  const card = createElement(documentRef, "section", { className: "r3-card r3-continue-card" });
  card.appendChild(createSectionHeader(documentRef, "Continue Reading"));

  const content = createElement(documentRef, "div", { className: "r3-continue-body" });
  content.appendChild(createBookCover(documentRef, continueReading.title || "Untitled Book"));

  const detail = createElement(documentRef, "div", { className: "r3-continue-detail" });
  detail.appendChild(createElement(documentRef, "h3", { text: continueReading.title || "Untitled Book" }));
  detail.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: getProgressLabel(continueReading)
  }));

  const progressRow = createElement(documentRef, "div", { className: "r3-continue-progress" });
  progressRow.appendChild(createProgressBar(documentRef, percent));
  progressRow.appendChild(createElement(documentRef, "strong", { text: `${percent}%` }));
  detail.appendChild(progressRow);

  detail.appendChild(createActionButton(documentRef, {
    className: "r3-primary-button",
    icon: "play",
    label: "Resume Reading",
    dataset: {
      action: "resume-book",
      bookKey: continueReading.bookKey
    }
  }));

  content.appendChild(detail);
  card.appendChild(content);
  return card;
}

function createQuickActions(documentRef) {
  const section = createElement(documentRef, "section", { className: "r3-section r3-quick-section" });
  section.appendChild(createSectionHeader(documentRef, "Quick Actions"));

  const grid = createElement(documentRef, "div", { className: "r3-quick-grid" });
  grid.appendChild(createActionButton(documentRef, {
    className: "r3-quick-action",
    icon: "import",
    label: "Import Book",
    dataset: { action: "import-open" }
  }));
  grid.appendChild(createActionButton(documentRef, {
    className: "r3-quick-action",
    icon: "library",
    label: "Open Library",
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

function formatVersionStatus(status) {
  if (status === "original-only") {
    return "Original only";
  }

  return "No active book";
}

function createSnapshot(documentRef, state) {
  if (!(state.home?.continueReading || state.continueReading)) {
    return null;
  }

  const snapshot = state.home?.snapshot || {};
  const section = createElement(documentRef, "section", { className: "r3-card r3-snapshot" });
  section.appendChild(createSectionHeader(documentRef, "Current Book Snapshot"));
  section.appendChild(createSnapshotRow(
    documentRef,
    "Reading Mode",
    formatModeLabel(snapshot.readingMode || state.activeReadingMode)
  ));
  section.appendChild(createSnapshotRow(
    documentRef,
    "Vocabulary Preview",
    snapshot.vocabularyPreviewCount === null || snapshot.vocabularyPreviewCount === undefined
      ? "Available in Reader"
      : `${snapshot.vocabularyPreviewCount} terms`,
    { disabled: true }
  ));
  section.appendChild(createSnapshotRow(
    documentRef,
    "Available Versions",
    formatVersionStatus(snapshot.currentBookVersionStatus),
    { disabled: true }
  ));
  section.appendChild(createSnapshotRow(
    documentRef,
    "Book Details",
    snapshot.bookDetailsAvailable ? "Open" : "Not available in R3 yet",
    { disabled: !snapshot.bookDetailsAvailable }
  ));
  return section;
}

function createRecentHelpful(documentRef, state) {
  const books = state.home?.recentBooks || [];
  const section = createElement(documentRef, "section", { className: "r3-section r3-recent-section" });
  section.appendChild(createSectionHeader(documentRef, "Recent & Helpful"));

  const list = createElement(documentRef, "div", { className: "r3-recent-list" });
  books.slice(0, 3).forEach((book) => {
    list.appendChild(createBookRow(documentRef, book));
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
  guide.appendChild(createElement(documentRef, "strong", { text: "Built-in Guide" }));
  guide.appendChild(createElement(documentRef, "span", { text: "R3 guide wiring pending" }));
  list.appendChild(guide);

  section.appendChild(list);
  return section;
}

export function createHomeView(documentRef, state) {
  const continueCard = createContinueCard(documentRef, state.home?.continueReading || state.continueReading);
  const snapshot = createSnapshot(documentRef, state);
  const view = createElement(documentRef, "div", {
    className: `r3-screen r3-home-screen${continueCard ? " has-continue" : ""}${snapshot ? " has-snapshot" : ""}`,
    attrs: { "data-screen": "home" }
  });

  view.appendChild(createBrandHeader(documentRef));
  if (continueCard) {
    view.appendChild(continueCard);
  }
  view.appendChild(createQuickActions(documentRef));
  if (snapshot) {
    view.appendChild(snapshot);
  }
  view.appendChild(createRecentHelpful(documentRef, state));
  return view;
}
