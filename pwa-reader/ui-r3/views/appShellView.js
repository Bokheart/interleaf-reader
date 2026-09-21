import { createBottomNavigation } from "../components/bottomNavigation.js";
import { createElement } from "../components/dom.js";
import { R3_ROUTES } from "../routes.js";
import { createHomeView } from "./homeView.js";
import { createLibraryView } from "./libraryView.js";
import { createReaderView } from "./readerView.js";
import { createVocabularyView } from "./vocabularyView.js";

function createActiveScreen(documentRef, state) {
  if (state.activeScreen === R3_ROUTES.LIBRARY) {
    return createLibraryView(documentRef, state);
  }
  if (state.activeScreen === R3_ROUTES.READER) {
    return createReaderView(documentRef, state);
  }
  if (state.activeScreen === R3_ROUTES.VOCABULARY) {
    return createVocabularyView(documentRef, state);
  }
  return createHomeView(documentRef, state);
}

function createImportInput(documentRef) {
  return createElement(documentRef, "input", {
    className: "r3-file-input",
    type: "file",
    accept: ".epub,application/epub+zip",
    attrs: {
      "aria-label": "Import EPUB file",
      tabindex: "-1"
    },
    dataset: {
      action: "import-file",
      role: "r3-import-input"
    }
  });
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
  const frame = createElement(documentRef, "div", {
    className: `r3-app-frame${isReader ? " r3-app-frame--reader" : ""}`,
    dataset: {
      activeScreen: state.activeScreen,
      initialized: state.initialized ? "true" : "false"
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

  if (state.loading?.isLoading || state.importStatus?.isImporting) {
    main.appendChild(createElement(documentRef, "div", {
      className: "r3-status-banner",
      text: state.importStatus?.isImporting
        ? `Importing ${state.importStatus.fileName || "EPUB"}...`
        : "Loading..."
    }));
  }

  if (state.error?.message) {
    main.appendChild(createElement(documentRef, "div", {
      className: "r3-error-banner",
      text: state.error.message
    }));
  }

  main.appendChild(createActiveScreen(documentRef, state));
  frame.appendChild(main);
  const vocabularyToast = createVocabularyToast(documentRef, state);
  if (vocabularyToast) {
    frame.appendChild(vocabularyToast);
  }
  if (!isReader) {
    frame.appendChild(createBottomNavigation(documentRef, state.activeScreen));
  }
  frame.appendChild(createImportInput(documentRef));
  return frame;
}
