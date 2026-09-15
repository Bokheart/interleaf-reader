import {
  createActionButton,
  createElement
} from "../components/dom.js";
import { R3_OVERLAYS } from "../routes.js";

function createReaderButton(documentRef, action, label, disabled = false) {
  return createActionButton(documentRef, {
    className: "r3-secondary-button",
    label,
    dataset: { action },
    disabled
  });
}

function getReaderMessage(reader = {}) {
  if (reader.status === "loading") {
    return "Loading chapter...";
  }

  if (reader.error?.message) {
    return reader.error.message;
  }

  return "Open a book from Library or Continue Reading.";
}

function createReaderContent(documentRef, reader = {}) {
  const panel = createElement(documentRef, "section", {
    className: "r3-reader-article",
    attrs: { "aria-label": "Chapter" }
  });
  const content = createElement(documentRef, "div", { className: "r3-reader-content" });

  if (reader.html) {
    content.innerHTML = reader.html;
  } else {
    content.appendChild(createElement(documentRef, "p", {
      className: "r3-muted",
      text: getReaderMessage(reader)
    }));
  }

  panel.appendChild(content);
  return panel;
}

function createReaderContents(documentRef, reader = {}) {
  const panel = createElement(documentRef, "section", {
    className: "r3-reader-contents",
    attrs: {
      "aria-label": "Contents",
      "aria-modal": "true",
      role: "dialog"
    }
  });
  const header = createElement(documentRef, "div", { className: "r3-section-header" });
  header.appendChild(createElement(documentRef, "h2", { text: "Contents" }));
  header.appendChild(createReaderButton(documentRef, "reader-close-contents", "Close"));
  panel.appendChild(header);

  const list = createElement(documentRef, "div", { className: "r3-toc-list" });
  const toc = Array.isArray(reader.toc) ? reader.toc : [];

  if (!toc.length) {
    list.appendChild(createElement(documentRef, "p", {
      className: "r3-muted",
      text: "No chapters available."
    }));
  }

  toc.forEach((item) => {
    const row = createElement(documentRef, "button", {
      className: `r3-toc-row${item.isCurrent ? " is-current" : ""}`,
      attrs: {
        type: "button",
        "aria-current": item.isCurrent ? "true" : undefined
      },
      dataset: {
        action: "reader-select-chapter",
        chapterIndex: item.index
      },
      disabled: !item.isReadable
    });
    row.appendChild(createElement(documentRef, "span", {
      className: "r3-toc-title",
      text: item.title || `Chapter ${item.index + 1}`
    }));
    row.appendChild(createElement(documentRef, "span", {
      className: "r3-toc-status",
      text: item.isCurrent ? "Current" : item.isReadable ? "" : "Unavailable"
    }));
    list.appendChild(row);
  });

  panel.appendChild(list);
  return panel;
}

function createReaderContentsOverlay(documentRef, reader = {}) {
  const overlay = createElement(documentRef, "div", {
    className: "r3-reader-overlay"
  });
  overlay.appendChild(createElement(documentRef, "div", {
    className: "r3-reader-scrim",
    attrs: { "aria-hidden": "true" }
  }));
  overlay.appendChild(createReaderContents(documentRef, reader));
  return overlay;
}

export function createReaderView(documentRef, state) {
  const reader = state.reader || {};
  const hasContents = state.openOverlay === R3_OVERLAYS.CONTENTS;
  const view = createElement(documentRef, "div", {
    className: `r3-screen r3-reader-screen${hasContents ? " has-contents" : ""}`,
    attrs: { "data-screen": "reader" }
  });

  const header = createElement(documentRef, "header", { className: "r3-reader-header" });
  const titleGroup = createElement(documentRef, "div", { className: "r3-reader-title-group" });
  titleGroup.appendChild(createElement(documentRef, "h1", {
    text: reader.bookTitle || "Interleaf Reader"
  }));
  titleGroup.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: reader.chapterTitle || reader.progressLabel || "No chapter loaded"
  }));
  header.appendChild(titleGroup);
  const headerActions = createElement(documentRef, "div", { className: "r3-header-actions" });
  headerActions.appendChild(createReaderButton(documentRef, "reader-contents", "Contents", reader.status !== "ready"));
  headerActions.appendChild(createReaderButton(documentRef, "reader-back", "Back"));
  header.appendChild(headerActions);
  view.appendChild(header);

  const scrollWorkspace = createElement(documentRef, "div", {
    className: "r3-reader-scroll",
    attrs: {
      "aria-label": "Chapter content",
      tabindex: "0"
    }
  });
  scrollWorkspace.appendChild(createElement(documentRef, "p", {
    className: "r3-muted r3-reader-progress",
    text: reader.progressLabel || "No chapter loaded"
  }));
  scrollWorkspace.appendChild(createReaderContent(documentRef, reader));
  view.appendChild(scrollWorkspace);

  const nav = createElement(documentRef, "div", { className: "r3-quick-grid r3-reader-chapter-nav" });
  nav.appendChild(createReaderButton(documentRef, "reader-previous", "Previous", !reader.hasPrevious));
  nav.appendChild(createReaderButton(documentRef, "reader-next", "Next", !reader.hasNext));
  const footer = createElement(documentRef, "footer", { className: "r3-reader-footer" });
  footer.appendChild(nav);
  view.appendChild(footer);

  if (hasContents) {
    view.appendChild(createReaderContentsOverlay(documentRef, reader));
  }

  return view;
}
