import { createActionButton, createElement } from "../components/dom.js";
import { createTranslator } from "../../i18n.js";

const TAB_CONFIG = Object.freeze([
  { id: "learning", labelKey: "vocabulary.tabs.learning", field: "learningWords", emptyKey: "r3.vocabulary.emptyLearning" },
  { id: "known", labelKey: "vocabulary.tabs.mastered", field: "knownWords", emptyKey: "r3.vocabulary.emptyKnown" },
  { id: "hidden", labelKey: "vocabulary.tabs.hidden", field: "ignoredWords", emptyKey: "r3.vocabulary.emptyHidden" }
]);

function getTerms(profile, field) {
  const seen = new Set();
  return (Array.isArray(profile?.[field]) ? profile[field] : [])
    .map(term => String(term || "").trim())
    .filter(term => {
      const key = term.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

function createCountCard(documentRef, label, count) {
  return createElement(documentRef, "div", { className: "r3-vocabulary-count-card" }, [
    createElement(documentRef, "strong", { text: String(count) }),
    createElement(documentRef, "span", { text: label })
  ]);
}

function createLevelControl(documentRef, vocabulary, t) {
  const profile = vocabulary.profile || {};
  const wrapper = createElement(documentRef, "label", { className: "r3-vocabulary-level-control" });
  wrapper.appendChild(createElement(documentRef, "span", { text: t("vocabulary.level.title") }));
  const select = createElement(documentRef, "select", {
    attrs: {
      "aria-label": t("vocabulary.level.title"),
      disabled: vocabulary.busy ? true : undefined
    },
    dataset: { action: "vocabulary-level" },
    disabled: vocabulary.busy
  });
  for (let level = 1; level <= 5; level += 1) {
    const value = `level${level}`;
    select.appendChild(createElement(documentRef, "option", {
      text: t("vocabulary.level.option", { level }),
      value,
      attrs: { selected: profile.selectedLevel === value ? true : undefined }
    }));
  }
  select.value = profile.selectedLevel || "level3";
  wrapper.appendChild(select);
  wrapper.appendChild(createElement(documentRef, "small", {
    className: "r3-muted",
    text: t("r3.vocabulary.levelHelp")
  }));
  return wrapper;
}

function createManualAdd(documentRef, vocabulary, t) {
  const form = createElement(documentRef, "form", {
    className: "r3-vocabulary-add-form",
    dataset: { action: "vocabulary-add" }
  });
  const label = createElement(documentRef, "label", {
    attrs: { for: "r3-vocabulary-manual-term" },
    text: t("r3.vocabulary.addLabel")
  });
  form.appendChild(label);
  const controls = createElement(documentRef, "div", { className: "r3-vocabulary-inline-controls" });
  controls.appendChild(createElement(documentRef, "input", {
    id: "r3-vocabulary-manual-term",
    type: "text",
    value: vocabulary.draft || "",
    attrs: {
      autocomplete: "off",
      placeholder: t("vocabulary.manual.placeholder"),
      disabled: vocabulary.busy ? true : undefined
    },
    dataset: { role: "vocabulary-manual-term" },
    disabled: vocabulary.busy
  }));
  controls.appendChild(createActionButton(documentRef, {
    className: "r3-primary-button",
    label: t("r3.vocabulary.addAction"),
    dataset: { action: "vocabulary-add-submit" },
    disabled: vocabulary.busy
  }));
  form.appendChild(controls);
  form.appendChild(createElement(documentRef, "small", {
    className: "r3-muted",
    text: t("r3.vocabulary.addHelp")
  }));
  return form;
}

function createTermPanel(documentRef, vocabulary, t) {
  const profile = vocabulary.profile || {};
  const activeTab = TAB_CONFIG.some(tab => tab.id === vocabulary.activeTab)
    ? vocabulary.activeTab
    : "learning";
  const tabs = createElement(documentRef, "div", {
    className: "r3-vocabulary-tabs",
    attrs: { role: "tablist", "aria-label": t("r3.vocabulary.lists") }
  });
  TAB_CONFIG.forEach(tab => {
    const active = tab.id === activeTab;
    const terms = getTerms(profile, tab.field);
    const tabId = `r3-vocabulary-tab-${tab.id}`;
    tabs.appendChild(createElement(documentRef, "button", {
      id: tabId,
      className: `r3-vocabulary-tab${active ? " is-active" : ""}`,
      text: `${t(tab.labelKey)} ${terms.length}`,
      attrs: {
        type: "button",
        role: "tab",
        "aria-selected": active ? "true" : "false",
        "aria-controls": "r3-vocabulary-term-list",
        tabindex: active ? "0" : "-1"
      },
      dataset: { action: "vocabulary-tab", vocabularyTab: tab.id },
      disabled: vocabulary.busy
    }));
  });

  const activeConfig = TAB_CONFIG.find(tab => tab.id === activeTab);
  const terms = getTerms(profile, activeConfig.field);
  const list = createElement(documentRef, "ul", {
    id: "r3-vocabulary-term-list",
    className: "r3-vocabulary-term-list",
    attrs: {
      role: "tabpanel",
      "aria-labelledby": `r3-vocabulary-tab-${activeTab}`,
      tabindex: "0"
    }
  });
  if (!terms.length) {
    list.appendChild(createElement(documentRef, "li", {
      className: "r3-vocabulary-empty",
      text: t(activeConfig.emptyKey)
    }));
  }
  terms.forEach(term => {
    const item = createElement(documentRef, "li", { className: "r3-vocabulary-term-row" });
    item.appendChild(createElement(documentRef, "span", { text: term }));
    item.appendChild(createActionButton(documentRef, {
      className: "r3-secondary-button r3-vocabulary-remove",
      label: t("r3.vocabulary.remove"),
      dataset: { action: "vocabulary-remove", vocabularyTerm: term },
      disabled: vocabulary.busy
    }));
    list.appendChild(item);
  });

  return createElement(documentRef, "section", { className: "r3-card r3-section" }, [tabs, list]);
}

function createExportSection(documentRef, vocabulary, t) {
  const profile = vocabulary.profile || {};
  const learningCount = getTerms(profile, "learningWords").length;
  const totalCount = learningCount
    + getTerms(profile, "knownWords").length
    + getTerms(profile, "ignoredWords").length;
  const section = createElement(documentRef, "section", { className: "r3-card r3-section" });
  section.appendChild(createElement(documentRef, "h2", { text: t("r3.vocabulary.exportTitle") }));
  const actions = createElement(documentRef, "div", { className: "r3-vocabulary-action-grid" });
  [
    ["vocabulary.export.copyLearning", "copy-learning", learningCount === 0],
    ["vocabulary.export.downloadLearningTxt", "download-learning", learningCount === 0],
    ["vocabulary.export.copyAll", "copy-all", totalCount === 0],
    ["vocabulary.export.downloadCsv", "download-csv", totalCount === 0],
    ["vocabulary.backup.download", "backup", false],
    ["vocabulary.backup.restore", "restore-open", false]
  ].forEach(([labelKey, action, empty]) => {
    actions.appendChild(createActionButton(documentRef, {
      className: "r3-secondary-button",
      label: t(labelKey),
      dataset: { action: `vocabulary-${action}` },
      disabled: vocabulary.busy || empty
    }));
  });
  section.appendChild(actions);
  section.appendChild(createElement(documentRef, "input", {
    className: "r3-file-input",
    type: "file",
    accept: ".json,application/json",
    attrs: { "aria-label": t("r3.vocabulary.restoreAria"), tabindex: "-1" },
    dataset: { action: "vocabulary-restore-file", role: "vocabulary-restore-input" }
  }));
  return section;
}

export function createVocabularyView(documentRef, state, t = createTranslator("en")) {
  const vocabulary = state.vocabulary || {};
  const profile = vocabulary.profile || {};
  const learning = getTerms(profile, "learningWords");
  const known = getTerms(profile, "knownWords");
  const hidden = getTerms(profile, "ignoredWords");
  const view = createElement(documentRef, "div", { className: "r3-screen r3-vocabulary-screen" });

  const header = createElement(documentRef, "header", { className: "r3-vocabulary-header" });
  header.appendChild(createElement(documentRef, "div", {}, [
    createElement(documentRef, "p", { className: "r3-eyebrow", text: t("r3.vocabulary.eyebrow") }),
    createElement(documentRef, "h1", { text: t("r3.vocabulary.title") }),
    createElement(documentRef, "p", {
      className: "r3-muted",
      text: t("r3.vocabulary.subtitle")
    })
  ]));
  header.appendChild(createLevelControl(documentRef, vocabulary, t));
  view.appendChild(header);

  view.appendChild(createElement(documentRef, "section", {
    className: "r3-vocabulary-counts",
    attrs: { "aria-label": t("vocabulary.counts.aria") }
  }, [
    createCountCard(documentRef, t("vocabulary.tabs.learning"), learning.length),
    createCountCard(documentRef, t("vocabulary.tabs.mastered"), known.length),
    createCountCard(documentRef, t("vocabulary.tabs.hidden"), hidden.length)
  ]));
  view.appendChild(createElement(documentRef, "section", { className: "r3-card" }, [
    createManualAdd(documentRef, vocabulary, t)
  ]));
  view.appendChild(createTermPanel(documentRef, vocabulary, t));
  view.appendChild(createExportSection(documentRef, vocabulary, t));

  if (vocabulary.status === "loading") {
    view.appendChild(createElement(documentRef, "p", { className: "r3-muted", text: t("r3.vocabulary.loading") }));
  }
  return view;
}
