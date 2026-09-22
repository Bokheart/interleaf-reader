import { createBookRow } from "../components/bookRow.js";
import {
  createActionButton,
  createElement,
  createIconButton,
  createSectionHeader
} from "../components/dom.js";
import { createTranslator } from "../../i18n.js";

function createLibraryHeader(documentRef, t) {
  const header = createElement(documentRef, "header", { className: "r3-library-header" });
  const titleGroup = createElement(documentRef, "div");
  titleGroup.appendChild(createElement(documentRef, "p", { className: "r3-eyebrow", text: t("r3.library.eyebrow") }));
  titleGroup.appendChild(createElement(documentRef, "h1", { text: t("r3.library.title") }));
  header.appendChild(titleGroup);

  const actions = createElement(documentRef, "div", { className: "r3-header-actions" });
  actions.appendChild(createIconButton(documentRef, {
    icon: "search",
    label: t("r3.library.searchUnavailable"),
    disabled: true,
    dataset: { action: "unsupported" }
  }));
  actions.appendChild(createIconButton(documentRef, {
    icon: "menu",
    label: t("r3.library.menuUnavailable"),
    disabled: true,
    dataset: { action: "unsupported" }
  }));
  header.appendChild(actions);
  return header;
}

function createImportBand(documentRef, importStatus = {}, t) {
  const band = createElement(documentRef, "section", { className: "r3-import-band" });
  band.appendChild(createElement(documentRef, "div", {
    className: "r3-import-copy",
    text: importStatus.isImporting
      ? t("r3.common.importing", { fileName: importStatus.fileName || "EPUB" })
      : t("r3.library.addLocal")
  }));
  band.appendChild(createActionButton(documentRef, {
    className: "r3-secondary-button",
    icon: "import",
    label: importStatus.isImporting ? t("r3.library.importing") : t("r3.library.importEpub"),
    dataset: { action: "import-open" },
    disabled: importStatus.isImporting
  }));
  return band;
}

function createEmptyState(documentRef, importStatus = {}, t) {
  const empty = createElement(documentRef, "section", { className: "r3-card r3-empty-library" });
  empty.appendChild(createElement(documentRef, "h2", { text: t("r3.library.emptyTitle") }));
  empty.appendChild(createElement(documentRef, "p", {
    text: t("r3.library.emptyBody")
  }));
  empty.appendChild(createActionButton(documentRef, {
    className: "r3-primary-button",
    icon: "import",
    label: importStatus.isImporting ? t("r3.library.importing") : t("r3.home.importBook"),
    dataset: { action: "import-open" },
    disabled: importStatus.isImporting
  }));
  return empty;
}

export function createLibraryView(documentRef, state, t = createTranslator("en")) {
  const books = state.library?.books || state.books || [];
  const view = createElement(documentRef, "div", {
    className: `r3-screen r3-library-screen${books.length ? " has-books" : " is-empty"}`,
    attrs: { "data-screen": "library" }
  });

  view.appendChild(createLibraryHeader(documentRef, t));
  view.appendChild(createImportBand(documentRef, state.importStatus, t));

  if (!books.length) {
    view.appendChild(createEmptyState(documentRef, state.importStatus, t));
    return view;
  }

  const listSection = createElement(documentRef, "section", { className: "r3-section r3-library-collection" });
  listSection.appendChild(createSectionHeader(documentRef, t("r3.library.allBooks")));
  const list = createElement(documentRef, "div", { className: "r3-book-list" });
  books.forEach((book) => {
    list.appendChild(createBookRow(documentRef, book, t));
  });
  listSection.appendChild(list);
  view.appendChild(listSection);
  return view;
}
