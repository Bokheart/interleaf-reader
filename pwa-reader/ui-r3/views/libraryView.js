import { createBookRow } from "../components/bookRow.js";
import {
  createActionButton,
  createElement,
  createIconButton,
  createSectionHeader
} from "../components/dom.js";

function createLibraryHeader(documentRef) {
  const header = createElement(documentRef, "header", { className: "r3-library-header" });
  const titleGroup = createElement(documentRef, "div");
  titleGroup.appendChild(createElement(documentRef, "p", { className: "r3-eyebrow", text: "Local books" }));
  titleGroup.appendChild(createElement(documentRef, "h1", { text: "Library" }));
  header.appendChild(titleGroup);

  const actions = createElement(documentRef, "div", { className: "r3-header-actions" });
  actions.appendChild(createIconButton(documentRef, {
    icon: "search",
    label: "Search unavailable",
    disabled: true,
    dataset: { action: "unsupported" }
  }));
  actions.appendChild(createIconButton(documentRef, {
    icon: "menu",
    label: "Library menu unavailable",
    disabled: true,
    dataset: { action: "unsupported" }
  }));
  header.appendChild(actions);
  return header;
}

function createImportBand(documentRef, importStatus = {}) {
  const band = createElement(documentRef, "section", { className: "r3-import-band" });
  band.appendChild(createElement(documentRef, "div", {
    className: "r3-import-copy",
    text: importStatus.isImporting ? `Importing ${importStatus.fileName || "EPUB"}...` : "Add a local EPUB to this device."
  }));
  band.appendChild(createActionButton(documentRef, {
    className: "r3-secondary-button",
    icon: "import",
    label: importStatus.isImporting ? "Importing" : "Import EPUB",
    dataset: { action: "import-open" },
    disabled: importStatus.isImporting
  }));
  return band;
}

function createEmptyState(documentRef, importStatus = {}) {
  const empty = createElement(documentRef, "section", { className: "r3-card r3-empty-library" });
  empty.appendChild(createElement(documentRef, "h2", { text: "Your library is empty" }));
  empty.appendChild(createElement(documentRef, "p", {
    text: "EPUB files are stored locally in this browser. Nothing is uploaded or synced."
  }));
  empty.appendChild(createActionButton(documentRef, {
    className: "r3-primary-button",
    icon: "import",
    label: importStatus.isImporting ? "Importing" : "Import Book",
    dataset: { action: "import-open" },
    disabled: importStatus.isImporting
  }));
  return empty;
}

export function createLibraryView(documentRef, state) {
  const books = state.library?.books || state.books || [];
  const view = createElement(documentRef, "div", {
    className: "r3-screen r3-library-screen",
    attrs: { "data-screen": "library" }
  });

  view.appendChild(createLibraryHeader(documentRef));
  view.appendChild(createImportBand(documentRef, state.importStatus));

  if (!books.length) {
    view.appendChild(createEmptyState(documentRef, state.importStatus));
    return view;
  }

  const listSection = createElement(documentRef, "section", { className: "r3-section" });
  listSection.appendChild(createSectionHeader(documentRef, "All Books"));
  const list = createElement(documentRef, "div", { className: "r3-book-list" });
  books.forEach((book) => {
    list.appendChild(createBookRow(documentRef, book));
  });
  listSection.appendChild(list);
  view.appendChild(listSection);
  return view;
}
