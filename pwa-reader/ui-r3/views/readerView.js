import {
  createActionButton,
  createElement,
  createIcon,
  createIconButton
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

function createVocabularyStateButton(documentRef, row, reader, state, label, icon) {
  const button = createIconButton(documentRef, {
    className: `r3-icon-button r3-vocabulary-state-button${row.state === state ? " is-selected" : ""}`,
    label,
    icon,
    dataset: {
      action: "vocabulary-preview-state",
      vocabularyState: state,
      vocabularyTerm: row.term
    },
    disabled: reader.vocabularySaving
  });
  button.setAttribute("aria-pressed", row.state === state ? "true" : "false");
  return button;
}

function appendMetadataRow(documentRef, container, label, value, options = {}) {
  if (!value) return;
  const line = createElement(documentRef, "div", { className: `r3-vocabulary-metadata${options.className ? ` ${options.className}` : ""}` });
  if (label) line.appendChild(createElement(documentRef, "span", { className: "r3-vocabulary-metadata-label", text: label }));
  line.appendChild(createElement(documentRef, "p", { text: value, attrs: options.lang ? { lang: options.lang } : {} }));
  container.appendChild(line);
}

function appendHighlightedSnippet(documentRef, container, snippet = "", term = "") {
  const source = String(snippet || "");
  const pattern = String(term || "").trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  if (!pattern) {
    container.appendChild(documentRef.createTextNode(source));
    return;
  }

  const regex = new RegExp(`(^|[^A-Za-z0-9_])(${pattern})(?=$|[^A-Za-z0-9_])`, "gi");
  let lastIndex = 0;
  let match = regex.exec(source);
  while (match) {
    const start = match.index + (match[1] || "").length;
    const end = start + (match[2] || "").length;
    container.appendChild(documentRef.createTextNode(source.slice(lastIndex, start)));
    container.appendChild(createElement(documentRef, "mark", {
      className: "r3-vocabulary-context-term",
      text: source.slice(start, end)
    }));
    lastIndex = end;
    regex.lastIndex = end;
    match = regex.exec(source);
  }
  container.appendChild(documentRef.createTextNode(source.slice(lastIndex)));
}

function createVocabularyPreviewRow(documentRef, row = {}, reader = {}, index = 0) {
  const item = createElement(documentRef, "article", { className: "r3-vocabulary-preview-row" });
  const expanded = Boolean(reader.vocabularyPreview?.detailsOpen || row.isExpanded);
  const summary = createElement(documentRef, "div", { className: "r3-vocabulary-preview-summary" });
  summary.appendChild(createElement(documentRef, "span", { className: "r3-vocabulary-preview-index", text: String(index + 1).padStart(2, "0") }));
  const termButton = createElement(documentRef, "button", {
    className: "r3-vocabulary-preview-term",
    attrs: { type: "button", "aria-expanded": expanded ? "true" : "false" },
    dataset: { action: "vocabulary-preview-row-toggle", vocabularyTerm: row.term }
  });
  termButton.appendChild(createElement(documentRef, "span", { text: row.term || "Vocabulary term" }));
  if (expanded && row.type && row.type !== "unknown") {
    termButton.appendChild(createElement(documentRef, "span", { className: "r3-vocabulary-preview-type", text: row.type.replaceAll("_", " ") }));
  }
  summary.appendChild(termButton);
  const actions = createElement(documentRef, "div", { className: "r3-vocabulary-preview-actions" });
  actions.appendChild(createVocabularyStateButton(documentRef, row, reader, "known", "Known", "checkCircle"));
  actions.appendChild(createVocabularyStateButton(documentRef, row, reader, "learning", "Save to Learning", "bookmark"));
  actions.appendChild(createVocabularyStateButton(documentRef, row, reader, "hidden", "Hide", "eyeOff"));
  summary.appendChild(actions);
  item.appendChild(summary);

  if (expanded) {
    const details = createElement(documentRef, "div", { className: "r3-vocabulary-preview-details" });
    appendMetadataRow(documentRef, details, "", row.chineseMeaning, { lang: "zh-CN", className: "r3-vocabulary-preview-meaning" });
    appendMetadataRow(documentRef, details, "EN", row.englishDefinition, { lang: "en" });
    appendMetadataRow(documentRef, details, "IELTS", row.ieltsUsage);
    appendMetadataRow(documentRef, details, "USE", row.usageNote);
    const occurrences = Array.isArray(row.occurrences) ? row.occurrences : [];
    const contextButton = createActionButton(documentRef, {
      className: "r3-vocabulary-context-toggle",
      label: `Context ${occurrences.length}× ${row.contextOpen ? "↓" : "→"}`,
      dataset: { action: "vocabulary-preview-context", vocabularyTerm: row.term },
      disabled: !occurrences.length || reader.vocabularySaving
    });
    contextButton.setAttribute("aria-expanded", row.contextOpen ? "true" : "false");
    details.appendChild(contextButton);
    if (row.contextOpen && occurrences.length) {
      const contextList = createElement(documentRef, "ol", { className: "r3-vocabulary-context-list" });
      occurrences.forEach(occurrence => {
        const contextItem = createElement(documentRef, "li");
        const snippet = createElement(documentRef, "p");
        appendHighlightedSnippet(documentRef, snippet, occurrence.snippet, row.term);
        contextItem.appendChild(snippet);
        contextItem.appendChild(createActionButton(documentRef, {
          className: "r3-vocabulary-passage-link",
          label: "View in passage →",
          dataset: {
            action: "vocabulary-preview-passage",
            vocabularyTerm: row.term,
            occurrenceIndex: occurrence.occurrenceIndex
          },
          disabled: reader.vocabularySaving
        }));
        contextList.appendChild(contextItem);
      });
      details.appendChild(contextList);
    }
    item.appendChild(details);
  }
  return item;
}

function createVocabularyDetailsSwitch(documentRef, detailsOpen) {
  const button = createElement(documentRef, "button", {
    className: "r3-vocabulary-details-switch",
    attrs: {
      type: "button",
      role: "switch",
      "aria-checked": detailsOpen ? "true" : "false"
    },
    dataset: {
      action: "vocabulary-preview-details",
      detailsOpen: detailsOpen ? "true" : "false"
    }
  });
  button.appendChild(createElement(documentRef, "span", {
    className: "r3-vocabulary-details-label",
    text: "Details"
  }));
  const track = createElement(documentRef, "span", {
    className: "r3-vocabulary-switch-track",
    attrs: { "aria-hidden": "true" }
  });
  track.appendChild(createElement(documentRef, "span", { className: "r3-vocabulary-switch-thumb" }));
  button.appendChild(track);
  button.appendChild(createElement(documentRef, "span", {
    className: "r3-vocabulary-switch-state",
    text: detailsOpen ? "On" : "Off"
  }));
  return button;
}

function createVocabularyLegend(documentRef) {
  const legend = createElement(documentRef, "div", {
    className: "r3-vocabulary-preview-legend",
    attrs: { "aria-label": "Vocabulary action legend" }
  });
  [
    ["checkCircle", "Known"],
    ["bookmark", "Save / Learning"],
    ["eyeOff", "Hide"]
  ].forEach(([icon, label]) => {
    const item = createElement(documentRef, "span", { className: "r3-vocabulary-legend-item" });
    item.appendChild(createIcon(documentRef, icon));
    item.appendChild(createElement(documentRef, "span", { text: label }));
    legend.appendChild(item);
  });
  return legend;
}

function createVocabularyPreview(documentRef, reader = {}) {
  const panel = createElement(documentRef, "section", {
    className: "r3-vocabulary-preview",
    attrs: { "aria-label": "Vocabulary Preview", "aria-modal": "true", role: "dialog" }
  });
  const header = createElement(documentRef, "div", { className: "r3-section-header" });
  const rows = reader.vocabularyPreview?.rows || [];
  header.appendChild(createElement(documentRef, "div", { className: "r3-vocabulary-preview-title" }, [
    createElement(documentRef, "h2", { text: "Vocabulary Preview" }),
    createElement(documentRef, "p", { className: "r3-muted", text: `${reader.chapterTitle || "Current chapter"} · ${rows.length} ${rows.length === 1 ? "word" : "words"}` })
  ]));
  const headerActions = createElement(documentRef, "div", { className: "r3-vocabulary-preview-header-actions" });
  const detailsOpen = Boolean(reader.vocabularyPreview?.detailsOpen);
  headerActions.appendChild(createVocabularyDetailsSwitch(documentRef, detailsOpen));
  headerActions.appendChild(createIconButton(documentRef, {
    className: "r3-icon-button r3-vocabulary-preview-back",
    label: "Back to reader",
    icon: "chevronLeft",
    dataset: { action: "vocabulary-preview-close" }
  }));
  header.appendChild(headerActions);
  panel.appendChild(header);

  const list = createElement(documentRef, "div", { className: "r3-vocabulary-preview-list" });
  if (!rows.length) list.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: "No tracked vocabulary is available for this chapter."
  }));
  rows.forEach((row, index) => list.appendChild(createVocabularyPreviewRow(documentRef, row, reader, index)));
  panel.appendChild(list);
  panel.appendChild(createVocabularyLegend(documentRef));
  if (reader.vocabularyMessage) panel.appendChild(createElement(documentRef, "p", {
    text: reader.vocabularyMessage,
    attrs: { role: "status" }
  }));
  return panel;
}

function createVocabularyPreviewOverlay(documentRef, reader = {}) {
  const overlay = createElement(documentRef, "div", { className: "r3-reader-overlay" });
  overlay.appendChild(createElement(documentRef, "div", {
    className: "r3-reader-scrim",
    attrs: { "aria-hidden": "true" },
    dataset: { action: "vocabulary-preview-close" }
  }));
  overlay.appendChild(createVocabularyPreview(documentRef, reader));
  return overlay;
}

function createVocabularyBubble(documentRef, reader) {
  const { term, item } = reader.vocabularyBubble;
  const bubble = createElement(documentRef, "section", {
    className: "r3-vocabulary-bubble",
    attrs: { role: "dialog", "aria-label": "Vocabulary note" }
  });
  const header = createElement(documentRef, "div", { className: "r3-section-header" });
  header.appendChild(createElement(documentRef, "h2", { text: item.term }));
  header.appendChild(createReaderButton(documentRef, "vocabulary-close", "Close"));
  bubble.appendChild(header);
  if (item.chineseMeaning) bubble.appendChild(createElement(documentRef, "p", {
    text: item.chineseMeaning, attrs: { lang: "zh-CN" }
  }));
  if (item.englishDefinition) bubble.appendChild(createElement(documentRef, "p", {
    text: item.englishDefinition, attrs: { lang: "en" }
  }));
  const actions = createElement(documentRef, "div", { className: "r3-vocabulary-actions" });
  const saved = (reader.learningWords || []).includes(term);
  for (const [state, label] of [["known", "Known"], ["learning", saved ? "Saved" : "Save"], ["hidden", "Hide"]]) {
    actions.appendChild(createActionButton(documentRef, {
      className: "r3-secondary-button",
      label,
      dataset: { action: "vocabulary-state", vocabularyState: state },
      disabled: reader.vocabularySaving || (state === "learning" && saved)
    }));
  }
  bubble.appendChild(actions);
  if (reader.vocabularyMessage) bubble.appendChild(createElement(documentRef, "p", {
    text: reader.vocabularyMessage, attrs: { role: "status" }
  }));
  return bubble;
}

function createSelectionSaveBar(documentRef) {
  const bar = createElement(documentRef, "section", {
    className: "r3-selection-save-bar",
    attrs: {
      "aria-label": "Selected text action",
      hidden: true
    },
    dataset: { role: "reader-selection-save" }
  });
  bar.hidden = true;
  bar.appendChild(createElement(documentRef, "span", {
    className: "r3-selection-save-term",
    dataset: { role: "reader-selection-term" }
  }));
  bar.appendChild(createActionButton(documentRef, {
    className: "r3-action-button",
    label: "Save to Learning",
    dataset: { action: "reader-selection-save" }
  }));
  return bar;
}

export function createReaderView(documentRef, state) {
  const reader = state.reader || {};
  const hasContents = state.openOverlay === R3_OVERLAYS.CONTENTS;
  const hasVocabularyPreview = state.openOverlay === R3_OVERLAYS.VOCABULARY_PREVIEW;
  const hasReaderOverlay = hasContents || hasVocabularyPreview;
  const view = createElement(documentRef, "div", {
    className: `r3-screen r3-reader-screen${hasReaderOverlay ? " has-overlay" : ""}`,
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
  headerActions.appendChild(createReaderButton(documentRef, "vocabulary-preview-open", "Preview", reader.status !== "ready"));
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
  view.appendChild(createSelectionSaveBar(documentRef));

  if (reader.vocabularyBubble && !hasReaderOverlay) {
    view.appendChild(createVocabularyBubble(documentRef, reader));
  } else if (reader.vocabularyMessage) {
    view.appendChild(createElement(documentRef, "p", {
      className: "r3-vocabulary-message",
      text: reader.vocabularyMessage,
      attrs: { role: "status" }
    }));
  }

  if (hasContents) {
    view.appendChild(createReaderContentsOverlay(documentRef, reader));
  } else if (hasVocabularyPreview) {
    view.appendChild(createVocabularyPreviewOverlay(documentRef, reader));
  }

  return view;
}
