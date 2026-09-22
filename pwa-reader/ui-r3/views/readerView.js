import {
  createActionButton,
  createElement,
  createIcon,
  createIconButton
} from "../components/dom.js";
import { R3_OVERLAYS } from "../routes.js";
import { createTranslator } from "../../i18n.js";

function createReaderButton(documentRef, action, label, disabled = false) {
  return createActionButton(documentRef, {
    className: "r3-secondary-button",
    label,
    dataset: { action },
    disabled
  });
}

function getReaderMessage(reader = {}, t) {
  if (reader.status === "loading") {
    return t("reader.status.chapterLoading");
  }

  if (reader.error?.message) {
    return reader.error.message;
  }

  return t("reader.empty.chooseBook");
}

function getReaderProgressLabel(reader = {}, t) {
  if (reader.status === "loading") return t("reader.status.chapterLoading");
  if (!Number.isInteger(reader.chapterIndex) || reader.chapterIndex < 0) {
    return t("reader.empty.noChapter");
  }
  return reader.progressLabel || t("reader.empty.noChapter");
}

function createReaderContent(documentRef, reader = {}, t) {
  const panel = createElement(documentRef, "section", {
    className: "r3-reader-article",
    attrs: { "aria-label": t("r3.reader.chapter") }
  });
  const content = createElement(documentRef, "div", { className: "r3-reader-content" });

  if (reader.html) {
    content.innerHTML = reader.html;
  } else {
    content.appendChild(createElement(documentRef, "p", {
      className: "r3-muted",
      text: getReaderMessage(reader, t)
    }));
  }

  panel.appendChild(content);
  return panel;
}

function createReaderContents(documentRef, reader = {}, t) {
  const panel = createElement(documentRef, "section", {
    className: "r3-reader-contents",
    attrs: {
      "aria-label": t("reader.controls.contents"),
      "aria-modal": "true",
      role: "dialog"
    }
  });
  const header = createElement(documentRef, "div", { className: "r3-section-header" });
  header.appendChild(createElement(documentRef, "h2", { text: t("reader.controls.contents") }));
  header.appendChild(createReaderButton(documentRef, "reader-close-contents", t("reader.common.close")));
  panel.appendChild(header);

  const list = createElement(documentRef, "div", { className: "r3-toc-list" });
  const toc = Array.isArray(reader.toc) ? reader.toc : [];

  if (!toc.length) {
    list.appendChild(createElement(documentRef, "p", {
      className: "r3-muted",
      text: t("r3.reader.contentsEmpty")
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
      text: item.title || t("r3.reader.chapterFallback", { number: item.index + 1 })
    }));
    row.appendChild(createElement(documentRef, "span", {
      className: "r3-toc-status",
      text: item.isCurrent ? t("r3.reader.current") : item.isReadable ? "" : t("r3.reader.unavailable")
    }));
    list.appendChild(row);
  });

  panel.appendChild(list);
  return panel;
}

function createReaderContentsOverlay(documentRef, reader = {}, t) {
  const overlay = createElement(documentRef, "div", {
    className: "r3-reader-overlay"
  });
  overlay.appendChild(createElement(documentRef, "div", {
    className: "r3-reader-scrim",
    attrs: { "aria-hidden": "true" }
  }));
  overlay.appendChild(createReaderContents(documentRef, reader, t));
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

function createVocabularyPreviewRow(documentRef, row = {}, reader = {}, index = 0, t) {
  const item = createElement(documentRef, "article", { className: "r3-vocabulary-preview-row" });
  const expanded = Boolean(reader.vocabularyPreview?.detailsOpen || row.isExpanded);
  const summary = createElement(documentRef, "div", { className: "r3-vocabulary-preview-summary" });
  summary.appendChild(createElement(documentRef, "span", { className: "r3-vocabulary-preview-index", text: String(index + 1).padStart(2, "0") }));
  const termButton = createElement(documentRef, "button", {
    className: "r3-vocabulary-preview-term",
    attrs: { type: "button", "aria-expanded": expanded ? "true" : "false" },
    dataset: { action: "vocabulary-preview-row-toggle", vocabularyTerm: row.term }
  });
  termButton.appendChild(createElement(documentRef, "span", { text: row.term || t("vocabulary.page.title") }));
  if (expanded && row.type && row.type !== "unknown") {
    termButton.appendChild(createElement(documentRef, "span", { className: "r3-vocabulary-preview-type", text: row.type.replaceAll("_", " ") }));
  }
  summary.appendChild(termButton);
  const actions = createElement(documentRef, "div", { className: "r3-vocabulary-preview-actions" });
  actions.appendChild(createVocabularyStateButton(documentRef, row, reader, "known", t("reader.vocabularyNote.known"), "checkCircle"));
  actions.appendChild(createVocabularyStateButton(documentRef, row, reader, "learning", t("r3.reader.preview.saveLearning"), "bookmark"));
  actions.appendChild(createVocabularyStateButton(documentRef, row, reader, "hidden", t("reader.vocabularyNote.hide"), "eyeOff"));
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
      label: t("r3.reader.preview.context", {
        count: occurrences.length,
        indicator: row.contextOpen ? "↓" : "→"
      }),
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
          label: t("r3.reader.preview.viewPassage"),
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

function createVocabularyDetailsSwitch(documentRef, detailsOpen, t) {
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
    text: t("r3.reader.preview.details")
  }));
  const track = createElement(documentRef, "span", {
    className: "r3-vocabulary-switch-track",
    attrs: { "aria-hidden": "true" }
  });
  track.appendChild(createElement(documentRef, "span", { className: "r3-vocabulary-switch-thumb" }));
  button.appendChild(track);
  button.appendChild(createElement(documentRef, "span", {
    className: "r3-vocabulary-switch-state",
    text: detailsOpen ? t("r3.reader.preview.on") : t("r3.reader.preview.off")
  }));
  return button;
}

function createVocabularyLegend(documentRef, t) {
  const legend = createElement(documentRef, "div", {
    className: "r3-vocabulary-preview-legend",
    attrs: { "aria-label": t("r3.reader.preview.legend") }
  });
  [
    ["checkCircle", t("reader.vocabularyNote.known")],
    ["bookmark", t("r3.reader.preview.legendLearning")],
    ["eyeOff", t("reader.vocabularyNote.hide")]
  ].forEach(([icon, label]) => {
    const item = createElement(documentRef, "span", { className: "r3-vocabulary-legend-item" });
    item.appendChild(createIcon(documentRef, icon));
    item.appendChild(createElement(documentRef, "span", { text: label }));
    legend.appendChild(item);
  });
  return legend;
}

function createVocabularyPreview(documentRef, reader = {}, t) {
  const panel = createElement(documentRef, "section", {
    className: "r3-vocabulary-preview",
    attrs: { "aria-label": t("reader.preview.title"), "aria-modal": "true", role: "dialog" }
  });
  const header = createElement(documentRef, "div", {
    className: "r3-section-header r3-vocabulary-preview-header"
  });
  const rows = reader.vocabularyPreview?.rows || [];
  const heading = createElement(documentRef, "div", { className: "r3-vocabulary-preview-heading" });
  heading.appendChild(createIconButton(documentRef, {
    className: "r3-icon-button r3-vocabulary-preview-back",
    label: t("r3.reader.preview.back"),
    icon: "chevronLeft",
    dataset: { action: "vocabulary-preview-close" }
  }));
  heading.appendChild(createElement(documentRef, "div", { className: "r3-vocabulary-preview-title" }, [
    createElement(documentRef, "h2", { text: t("reader.preview.title") }),
    createElement(documentRef, "p", {
      className: "r3-muted",
      text: `${reader.chapterTitle || t("r3.reader.currentChapter")} · ${t(rows.length === 1 ? "r3.reader.wordCount.one" : "r3.reader.wordCount.other", { count: rows.length })}`
    })
  ]));
  header.appendChild(heading);
  const headerActions = createElement(documentRef, "div", { className: "r3-vocabulary-preview-header-actions" });
  const detailsOpen = Boolean(reader.vocabularyPreview?.detailsOpen);
  headerActions.appendChild(createVocabularyDetailsSwitch(documentRef, detailsOpen, t));
  header.appendChild(headerActions);
  panel.appendChild(header);

  const list = createElement(documentRef, "div", { className: "r3-vocabulary-preview-list" });
  if (!rows.length) list.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: t("r3.reader.preview.empty")
  }));
  rows.forEach((row, index) => list.appendChild(createVocabularyPreviewRow(documentRef, row, reader, index, t)));
  panel.appendChild(list);
  panel.appendChild(createVocabularyLegend(documentRef, t));
  if (reader.vocabularyMessage) panel.appendChild(createElement(documentRef, "p", {
    text: reader.vocabularyMessage,
    attrs: { role: "status" }
  }));
  return panel;
}

function createVocabularyPreviewOverlay(documentRef, reader = {}, t) {
  const overlay = createElement(documentRef, "div", { className: "r3-reader-overlay" });
  overlay.appendChild(createElement(documentRef, "div", {
    className: "r3-reader-scrim",
    attrs: { "aria-hidden": "true" },
    dataset: { action: "vocabulary-preview-close" }
  }));
  overlay.appendChild(createVocabularyPreview(documentRef, reader, t));
  return overlay;
}

function createVocabularyBubble(documentRef, reader, t) {
  const { term, item } = reader.vocabularyBubble;
  const bubble = createElement(documentRef, "section", {
    className: "r3-vocabulary-bubble",
    attrs: { role: "dialog", "aria-label": t("reader.vocabularyNote.aria") }
  });
  const header = createElement(documentRef, "div", { className: "r3-section-header" });
  header.appendChild(createElement(documentRef, "h2", { text: item.term }));
  bubble.appendChild(header);
  if (item.chineseMeaning) bubble.appendChild(createElement(documentRef, "p", {
    text: item.chineseMeaning, attrs: { lang: "zh-CN" }
  }));
  if (item.englishDefinition) bubble.appendChild(createElement(documentRef, "p", {
    text: item.englishDefinition, attrs: { lang: "en" }
  }));
  const actions = createElement(documentRef, "div", { className: "r3-vocabulary-actions" });
  const saved = (reader.learningWords || []).includes(term);
  for (const [state, label] of [
    ["known", t("reader.vocabularyNote.known")],
    ["learning", saved ? t("reader.vocabularyNote.saved") : t("reader.vocabularyNote.save")],
    ["hidden", t("reader.vocabularyNote.hide")]
  ]) {
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

function createSelectionSaveBar(documentRef, t) {
  const bar = createElement(documentRef, "section", {
    className: "r3-selection-save-bar",
    attrs: {
      "aria-label": t("r3.reader.selection.aria"),
      hidden: true
    },
    dataset: { role: "reader-selection-save" }
  });
  bar.hidden = true;
  bar.appendChild(createElement(documentRef, "span", {
    className: "r3-selection-save-term",
    dataset: { role: "reader-selection-term" }
  }));
  const saveButton = createActionButton(documentRef, {
    className: "r3-action-button r3-selection-save-action",
    icon: "bookmark",
    label: t("r3.reader.selection.save"),
    dataset: { action: "reader-selection-save" }
  });
  saveButton.setAttribute("aria-label", t("r3.reader.selection.saveAria"));
  bar.appendChild(saveButton);
  return bar;
}

export function createReaderView(documentRef, state, t = createTranslator("en")) {
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
    text: reader.chapterTitle || getReaderProgressLabel(reader, t)
  }));
  header.appendChild(titleGroup);
  const headerActions = createElement(documentRef, "div", { className: "r3-header-actions" });
  headerActions.appendChild(createReaderButton(documentRef, "vocabulary-preview-open", t("reader.controls.preview"), reader.status !== "ready"));
  headerActions.appendChild(createReaderButton(documentRef, "reader-contents", t("reader.controls.contents"), reader.status !== "ready"));
  headerActions.appendChild(createReaderButton(documentRef, "reader-back", t("reader.backHome")));
  header.appendChild(headerActions);
  view.appendChild(header);

  const scrollWorkspace = createElement(documentRef, "div", {
    className: "r3-reader-scroll",
    attrs: {
      "aria-label": t("r3.reader.chapterContent"),
      tabindex: "0"
    }
  });
  scrollWorkspace.appendChild(createElement(documentRef, "p", {
    className: "r3-muted r3-reader-progress",
    text: getReaderProgressLabel(reader, t)
  }));
  scrollWorkspace.appendChild(createReaderContent(documentRef, reader, t));
  view.appendChild(scrollWorkspace);

  const nav = createElement(documentRef, "div", { className: "r3-quick-grid r3-reader-chapter-nav" });
  nav.appendChild(createReaderButton(documentRef, "reader-previous", t("reader.navigation.previous"), !reader.hasPrevious));
  nav.appendChild(createReaderButton(documentRef, "reader-next", t("reader.navigation.next"), !reader.hasNext));
  const footer = createElement(documentRef, "footer", { className: "r3-reader-footer" });
  footer.appendChild(nav);
  view.appendChild(footer);
  view.appendChild(createSelectionSaveBar(documentRef, t));

  if (reader.vocabularyBubble && !hasReaderOverlay) {
    view.appendChild(createVocabularyBubble(documentRef, reader, t));
  } else if (reader.vocabularyMessage) {
    view.appendChild(createElement(documentRef, "p", {
      className: "r3-vocabulary-message",
      text: reader.vocabularyMessage,
      attrs: { role: "status" }
    }));
  }

  if (hasContents) {
    view.appendChild(createReaderContentsOverlay(documentRef, reader, t));
  } else if (hasVocabularyPreview) {
    view.appendChild(createVocabularyPreviewOverlay(documentRef, reader, t));
  }

  return view;
}
