import { createR3Controller } from "./controller.js";
import { createR3Store } from "./store.js";
import { normalizeTerm } from "../vocabEngine.js";
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

function getVocabularySnippet(hit) {
  const contentTags = new Set(["P", "LI", "BLOCKQUOTE", "FIGCAPTION", "TD", "TH"]);
  let context = hit?.parentNode;
  while (context && !contentTags.has(String(context.tagName || "").toUpperCase())) {
    context = context.parentNode;
  }
  const text = String(context?.textContent || hit?.textContent || "").replace(/\s+/g, " ").trim();
  if (text.length <= 180) return text;
  const termText = String(hit?.textContent || hit?.dataset?.vocabTerm || "");
  let termOffset = -1;
  if (context?.ownerDocument?.createRange) {
    const range = context.ownerDocument.createRange();
    range.selectNodeContents(context);
    range.setEndBefore(hit);
    termOffset = String(range.toString()).replace(/\s+/g, " ").trimStart().length;
  }
  if (termOffset < 0) {
    const key = normalizeTerm(hit?.dataset?.vocabTerm || termText);
    const stack = [...(context?.children || [])];
    let occurrenceIndex = 0;
    while (stack.length) {
      const node = stack.shift();
      if (node === hit) break;
      if (classListContains(node, "vocab-hit") && normalizeTerm(node.dataset?.vocabTerm) === key) {
        occurrenceIndex += 1;
      }
      stack.unshift(...(node.children || []));
    }
    const lowerText = text.toLocaleLowerCase();
    const lowerTerm = termText.toLocaleLowerCase();
    let searchFrom = 0;
    for (let index = 0; index <= occurrenceIndex; index += 1) {
      termOffset = lowerText.indexOf(lowerTerm, searchFrom);
      if (termOffset < 0) break;
      searchFrom = termOffset + lowerTerm.length;
    }
  }
  termOffset = Math.max(0, termOffset);
  const start = Math.max(0, Math.min(termOffset - 70, text.length - 174));
  const excerpt = text.slice(start, start + 174).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${start + 174 < text.length ? "…" : ""}`;
}

export function collectVocabularyOccurrences(root) {
  const occurrences = {};
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.shift();
    if (classListContains(node, "vocab-hit")) {
      const term = normalizeTerm(node.dataset?.vocabTerm);
      if (term) {
        const termOccurrences = occurrences[term] || [];
        termOccurrences.push({
          occurrenceIndex: termOccurrences.length,
          snippet: getVocabularySnippet(node)
        });
        occurrences[term] = termOccurrences;
      }
    }
    stack.push(...(node.children || []));
  }
  return occurrences;
}

export function scrollToVocabularyHit(root, term, occurrenceIndex = 0) {
  const key = normalizeTerm(term);
  const matches = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.shift();
    if (classListContains(node, "vocab-hit") && normalizeTerm(node.dataset?.vocabTerm) === key) {
      matches.push(node);
    }
    stack.push(...(node.children || []));
  }
  const hit = matches[Number(occurrenceIndex)];
  if (!hit || typeof hit.scrollIntoView !== "function") return false;
  hit.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
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
  let readerScrollPreservationSequence = 0;

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
    const preservationSequence = String(++readerScrollPreservationSequence);
    if (Number.isFinite(preservedReaderScrollTop)) {
      root.dataset.r3ReaderScrollPreservation = preservationSequence;
    } else {
      delete root.dataset.r3ReaderScrollPreservation;
    }

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
        const clearPreservation = () => {
          if (root.dataset.r3ReaderScrollPreservation === preservationSequence) {
            delete root.dataset.r3ReaderScrollPreservation;
          }
        };
        const windowRef = documentRef.defaultView || globalThis.window;
        if (typeof windowRef?.requestAnimationFrame === "function") {
          windowRef.requestAnimationFrame(clearPreservation);
        } else {
          clearPreservation();
        }
      }
      controller.applyReaderScrollRestoration?.(readerScroll);
      const bubble = root.querySelector?.(".r3-vocabulary-bubble");
      if (bubble && state.reader.vocabularyBubble) {
        const { x, y } = state.reader.vocabularyBubble;
        const windowRef = documentRef.defaultView || globalThis.window;
        const box = bubble.getBoundingClientRect();
        bubble.style.left = `${Math.max(12, Math.min(x, windowRef.innerWidth - box.width - 12))}px`;
        bubble.style.top = `${Math.max(12, Math.min(y + 12, windowRef.innerHeight - box.height - 12))}px`;
      }
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
    const hit = event.target.closest?.(".r3-reader-content .vocab-hit[data-vocab-term]");
    if (hit) {
      const box = hit.getBoundingClientRect();
      controller.toggleVocabularyBubble?.(hit.dataset.vocabTerm, { x: box.left, y: box.bottom });
      return;
    }
    const actionElement = findActionElement(event.target, root);
    const action = actionElement?.dataset?.action;

    if (action === "vocabulary-close") {
      controller.closeVocabularyBubble?.();
      return;
    }
    if (action === "vocabulary-state") {
      controller.setReaderVocabularyState?.(actionElement.dataset.vocabularyState);
      return;
    }
    if (action === "vocabulary-preview-state") {
      controller.setReaderVocabularyState?.(
        actionElement.dataset.vocabularyState,
        actionElement.dataset.vocabularyTerm
      );
      return;
    }
    if (action === "vocabulary-preview-row-toggle") {
      controller.toggleVocabularyPreviewRow?.(actionElement.dataset.vocabularyTerm);
      return;
    }
    if (action === "vocabulary-preview-details") {
      controller.toggleVocabularyPreviewDetails?.(actionElement.dataset.detailsOpen !== "true");
      return;
    }
    if (action === "vocabulary-preview-context") {
      controller.toggleVocabularyPreviewContext?.(actionElement.dataset.vocabularyTerm);
      return;
    }
    if (action === "vocabulary-preview-passage") {
      const term = actionElement.dataset.vocabularyTerm;
      const occurrenceIndex = Number(actionElement.dataset.occurrenceIndex);
      if (controller.goToVocabularyPreviewOccurrence?.(term, occurrenceIndex)) {
        scrollToVocabularyHit(root, term, occurrenceIndex);
      }
      return;
    }
    if (!event.target.closest?.(".r3-vocabulary-bubble")) controller.closeVocabularyBubble?.();

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

    if (action === "vocabulary-preview-open") {
      controller.openVocabularyPreview?.(collectVocabularyOccurrences(root));
      return;
    }

    if (action === "vocabulary-preview-close") {
      controller.closeVocabularyPreview?.();
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
    if (root.dataset.r3ReaderScrollPreservation) {
      return;
    }

    controller.recordReaderScroll?.(readScrollMetrics(event.target));
    controller.closeVocabularyBubble?.();
  }, true);

  root.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    controller.closeVocabularyPreview?.();
    controller.closeVocabularyBubble?.();
  });
  root.ownerDocument?.defaultView?.addEventListener("resize", () => controller.closeVocabularyBubble?.());
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
  const controller = options.controller || createR3Controller({
    store,
    adapters: options.adapters,
    collectVocabularyOccurrences: () => collectVocabularyOccurrences(root)
  });
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
