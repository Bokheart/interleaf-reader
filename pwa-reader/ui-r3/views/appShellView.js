import { createBottomNavigation } from "../components/bottomNavigation.js";
import { createElement } from "../components/dom.js";
import { createTranslator, getFirstRunLanguageChoiceState } from "../../i18n.js";
import { R3_ROUTES } from "../routes.js";
import { createHomeView } from "./homeView.js";
import { createLibraryView } from "./libraryView.js";
import { createReaderView } from "./readerView.js";
import { createVocabularyView } from "./vocabularyView.js";
import { createLanguageChoices, createSettingsView } from "./settingsView.js";

function createActiveScreen(documentRef, state, t) {
  if (state.activeScreen === R3_ROUTES.LIBRARY) {
    return createLibraryView(documentRef, state, t);
  }
  if (state.activeScreen === R3_ROUTES.READER) {
    return createReaderView(documentRef, state, t);
  }
  if (state.activeScreen === R3_ROUTES.VOCABULARY) {
    return createVocabularyView(documentRef, state, t);
  }
  if ([R3_ROUTES.SETTINGS_HOME, R3_ROUTES.SETTINGS_LANGUAGE].includes(state.activeScreen)) {
    return createSettingsView(documentRef, state, t);
  }
  return createHomeView(documentRef, state, t);
}

function createImportInput(documentRef, t) {
  return createElement(documentRef, "input", {
    className: "r3-file-input",
    type: "file",
    accept: ".epub,application/epub+zip",
    attrs: {
      "aria-label": t("r3.library.importEpub"),
      tabindex: "-1"
    },
    dataset: {
      action: "import-file",
      role: "r3-import-input"
    }
  });
}

function createLanguageGate(documentRef, state, t) {
  const gateState = getFirstRunLanguageChoiceState(state.settings || {});
  if (!state.initialized || state.settings?.status !== "ready" || !gateState.shouldShow) {
    return null;
  }
  const overlay = createElement(documentRef, "div", { className: "r3-language-gate-overlay" });
  const gate = createElement(documentRef, "section", {
    className: "r3-language-gate",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": gateState.title
    }
  });
  gate.appendChild(createElement(documentRef, "h2", { text: gateState.title }));
  gate.appendChild(createElement(documentRef, "p", {
    className: "r3-language-gate-subtitle",
    text: gateState.subtitle,
    attrs: { lang: "zh-CN" }
  }));
  gate.appendChild(createLanguageChoices(documentRef, state.settings, t, {
    className: "r3-language-gate-choices"
  }));
  gate.appendChild(createElement(documentRef, "p", {
    className: "r3-muted",
    text: t("languageGate.note")
  }));
  overlay.appendChild(gate);
  return overlay;
}

function createVocabularyToast(documentRef, state) {
  const feedback = state.vocabulary?.feedback;
  if (
    state.activeScreen !== R3_ROUTES.VOCABULARY
    || !feedback?.message
  ) {
    return null;
  }

  return createElement(documentRef, "p", {
    className: "r3-vocabulary-toast",
    text: feedback.message,
    attrs: {
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true"
    },
    dataset: { tone: feedback.tone || "neutral" }
  });
}

export function createAppShellView(documentRef, state) {
  const isReader = state.activeScreen === R3_ROUTES.READER;
  const isSettings = [R3_ROUTES.SETTINGS_HOME, R3_ROUTES.SETTINGS_LANGUAGE].includes(state.activeScreen);
  const isBootstrapping = !state.initialized;
  const t = createTranslator(state.settings?.uiLanguage);
  const frame = createElement(documentRef, "div", {
    className: `r3-app-frame${isReader ? " r3-app-frame--reader" : ""}`,
    dataset: {
      activeScreen: state.activeScreen,
      initialized: state.initialized ? "true" : "false",
      uiLanguage: state.settings?.uiLanguage || "en"
    }
  });

  frame.appendChild(createElement(documentRef, "div", {
    className: "r3-safe-top",
    attrs: { "aria-hidden": "true" }
  }));

  const main = createElement(documentRef, "main", {
    className: `r3-main${isReader ? " r3-main--reader" : ""}`,
    attrs: {
      "aria-live": state.loading?.isLoading ? "polite" : undefined
    }
  });

  if (isBootstrapping) {
    main.appendChild(createElement(documentRef, "div", {
      className: "r3-status-banner",
      text: t("r3.common.loading"),
      attrs: { role: "status" }
    }));
  } else if (state.loading?.isLoading || state.importStatus?.isImporting) {
    main.appendChild(createElement(documentRef, "div", {
      className: "r3-status-banner",
      text: state.importStatus?.isImporting
        ? t("r3.common.importing", { fileName: state.importStatus.fileName || "EPUB" })
        : t("r3.common.loading")
    }));
  }

  if (state.error?.message) {
    main.appendChild(createElement(documentRef, "div", {
      className: "r3-error-banner",
      text: state.error.message
    }));
  }

  main.appendChild(createActiveScreen(documentRef, state, t));
  frame.appendChild(main);
  const vocabularyToast = createVocabularyToast(documentRef, state);
  if (vocabularyToast) {
    frame.appendChild(vocabularyToast);
  }
  if (!isReader && !isSettings) {
    frame.appendChild(createBottomNavigation(documentRef, state.activeScreen, t));
  }
  frame.appendChild(createImportInput(documentRef, t));
  const languageGate = createLanguageGate(documentRef, state, t);
  if (languageGate) frame.appendChild(languageGate);
  return frame;
}
