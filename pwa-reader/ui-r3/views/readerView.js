import {
  createActionButton,
  createElement
} from "../components/dom.js";

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
  const panel = createElement(documentRef, "section", { className: "r3-card" });
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

export function createReaderView(documentRef, state) {
  const reader = state.reader || {};
  const view = createElement(documentRef, "div", {
    className: "r3-screen r3-reader-screen",
    attrs: { "data-screen": "reader" }
  });

  const header = createElement(documentRef, "header", { className: "r3-library-header" });
  const titleGroup = createElement(documentRef, "div");
  titleGroup.appendChild(createElement(documentRef, "p", {
    className: "r3-eyebrow",
    text: "Reader"
  }));
  titleGroup.appendChild(createElement(documentRef, "h1", {
    text: reader.bookTitle || "Interleaf Reader"
  }));
  titleGroup.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: reader.chapterTitle || reader.progressLabel || "No chapter loaded"
  }));
  header.appendChild(titleGroup);
  header.appendChild(createReaderButton(documentRef, "reader-back", "Back"));
  view.appendChild(header);

  view.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: reader.progressLabel || "No chapter loaded"
  }));
  view.appendChild(createReaderContent(documentRef, reader));

  const nav = createElement(documentRef, "div", { className: "r3-quick-grid" });
  nav.appendChild(createReaderButton(documentRef, "reader-previous", "Previous", !reader.hasPrevious));
  nav.appendChild(createReaderButton(documentRef, "reader-next", "Next", !reader.hasNext));
  view.appendChild(nav);

  return view;
}
