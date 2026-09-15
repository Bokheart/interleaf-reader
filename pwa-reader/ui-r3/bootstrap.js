import { createR3Controller } from "./controller.js";
import { createR3Store } from "./store.js";
import { R3_ROUTES } from "./routes.js";
import { createAppShellView } from "./views/appShellView.js";

let autoBootstrapScheduled = false;

function findOrCreateRoot(documentRef) {
  let root = documentRef.getElementById("r3-root");

  if (!root) {
    root = documentRef.createElement("main");
    root.id = "r3-root";
    root.className = "r3-root";
    documentRef.body.appendChild(root);
  }

  return root;
}

function classListContains(node, className) {
  return String(node?.className || "")
    .split(/\s+/)
    .includes(className);
}

function findFirst(root, predicate) {
  const stack = root ? [root] : [];
  while (stack.length) {
    const current = stack.shift();
    if (predicate(current)) {
      return current;
    }
    stack.push(...(current.children || []));
  }
  return null;
}

function findReaderScrollElement(root) {
  if (typeof root.querySelector === "function") {
    const match = root.querySelector(".r3-reader-scroll");
    if (match) {
      return match;
    }
  }

  return findFirst(root, (node) => classListContains(node, "r3-reader-scroll"));
}

function readScrollMetrics(element) {
  return {
    scrollTop: element?.scrollTop || 0,
    scrollHeight: element?.scrollHeight || 0,
    clientHeight: element?.clientHeight || 0
  };
}

function mountAppShell(root, store, documentRef, controller) {
  let previousState = null;

  const render = (state) => {
    const previousReaderScroll = findReaderScrollElement(root);
    const shouldPreserveReaderScroll = (
      previousState?.activeScreen === R3_ROUTES.READER
      && state.activeScreen === R3_ROUTES.READER
      && previousState.activeBookId === state.activeBookId
      && previousState.activeChapterId === state.activeChapterId
    );
    const preservedReaderScrollTop = shouldPreserveReaderScroll
      ? previousReaderScroll?.scrollTop
      : null;

    root.dataset.r3Initialized = state.initialized ? "true" : "false";
    root.dataset.r3SavedBookCount = String(state.savedBookCount || 0);
    root.dataset.r3ActiveScreen = state.activeScreen || "";
    root.dataset.r3Loading = state.loading?.isLoading ? "true" : "false";
    const view = createAppShellView(documentRef, state);
    root.replaceChildren(view);
    if (root.textContent !== view.textContent) {
      root.textContent = view.textContent;
      root.replaceChildren(view);
    }
    if (state.activeScreen === R3_ROUTES.READER) {
      const readerScroll = findReaderScrollElement(root);
      if (Number.isFinite(preservedReaderScrollTop)) {
        readerScroll.scrollTop = preservedReaderScrollTop;
      }
      controller.applyReaderScrollRestoration?.(readerScroll);
    }
    previousState = state;
  };

  render(store.getState());
  return store.subscribe((state) => render(state));
}

function findActionElement(start, boundary) {
  let current = start;
  while (current && current !== boundary) {
    if (current.dataset?.action) {
      return current;
    }
    current = current.parentNode;
  }
  return current?.dataset?.action ? current : null;
}

function getImportInput(root) {
  if (typeof root.querySelector === "function") {
    return root.querySelector("[data-role='r3-import-input']");
  }
  const stack = [root];
  while (stack.length) {
    const current = stack.shift();
    if (current.dataset?.role === "r3-import-input") {
      return current;
    }
    stack.push(...(current.children || []));
  }
  return null;
}

function bindAppShellEvents(root, controller) {
  if (root.dataset.r3ShellEventsBound === "true") {
    return;
  }

  root.dataset.r3ShellEventsBound = "true";
  root.addEventListener("click", (event) => {
    const actionElement = findActionElement(event.target, root);
    const action = actionElement?.dataset?.action;

    if (!action) {
      return;
    }

    if (action === "navigate") {
      const route = actionElement.dataset.route;
      if (route === R3_ROUTES.HOME || route === R3_ROUTES.LIBRARY) {
        controller.navigate(route);
      }
      return;
    }

    if (action === "import-open") {
      getImportInput(root)?.click?.();
      return;
    }

    if (action === "resume-book") {
      controller.resumeBook(actionElement.dataset.bookKey || null);
      return;
    }

    if (action === "select-book") {
      controller.selectBook(actionElement.dataset.bookKey);
      return;
    }

    if (action === "reader-previous") {
      controller.goToReaderChapter("previous");
      return;
    }

    if (action === "reader-next") {
      controller.goToReaderChapter("next");
      return;
    }

    if (action === "reader-contents") {
      controller.openReaderContents?.();
      return;
    }

    if (action === "reader-select-chapter") {
      const chapterIndex = Number(actionElement.dataset.chapterIndex);
      if (Number.isInteger(chapterIndex)) {
        controller.selectReaderChapter?.(chapterIndex);
      }
      return;
    }

    if (action === "reader-close-contents") {
      controller.closeOverlay();
      return;
    }

    if (action === "reader-back") {
      controller.exitReader();
    }
  });

  root.addEventListener("change", (event) => {
    const actionElement = findActionElement(event.target, root);
    if (actionElement?.dataset?.action !== "import-file") {
      return;
    }

    const file = actionElement.files?.[0];
    if (file) {
      controller.importBook(file);
    }
    actionElement.value = "";
  });

  root.addEventListener("scroll", (event) => {
    if (!classListContains(event.target, "r3-reader-scroll")) {
      return;
    }

    controller.recordReaderScroll?.(readScrollMetrics(event.target));
  }, true);
}

function bindPageLifecycleEvents(documentRef, controller) {
  if (documentRef.__r3PageLifecycleBound === true) {
    return;
  }

  documentRef.__r3PageLifecycleBound = true;
  documentRef.addEventListener?.("visibilitychange", () => {
    if (!documentRef.visibilityState || documentRef.visibilityState === "hidden") {
      controller.flushReaderProgress?.();
    }
  });

  const windowRef = documentRef.defaultView || globalThis.window;
  windowRef?.addEventListener?.("pagehide", () => {
    controller.flushReaderProgress?.();
  });
}

export async function bootstrapR3App(options = {}) {
  const documentRef = options.document || globalThis.document;
  if (!documentRef?.body) {
    throw new Error("R3 bootstrap requires a browser document.");
  }

  const root = options.root || findOrCreateRoot(documentRef);
  if (root.dataset?.r3Bootstrapped === "true" && root.__r3App) {
    return root.__r3App;
  }

  if (!root.dataset) {
    root.dataset = {};
  }
  root.dataset.r3Bootstrapped = "true";
  root.className = root.className || "r3-root";

  const store = options.store || createR3Store();
  const controller = options.controller || createR3Controller({ store, adapters: options.adapters });
  const unsubscribe = mountAppShell(root, store, documentRef, controller);
  bindAppShellEvents(root, controller);
  bindPageLifecycleEvents(documentRef, controller);
  const app = {
    root,
    store,
    controller,
    unsubscribe
  };

  root.__r3App = app;
  await controller.initialize();
  return app;
}

export function autoBootstrapR3App(documentRef = globalThis.document) {
  if (autoBootstrapScheduled || !documentRef?.body) {
    return;
  }

  autoBootstrapScheduled = true;
  const start = () => {
    bootstrapR3App({ document: documentRef }).catch((error) => {
      console.error("R3 development bootstrap failed.", error);
    });
  };

  if (documentRef.readyState === "loading") {
    documentRef.addEventListener("DOMContentLoaded", start, { once: true });
    return;
  }

  start();
}

if (typeof document !== "undefined") {
  autoBootstrapR3App(document);
}
