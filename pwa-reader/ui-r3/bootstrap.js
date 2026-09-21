import { createR3Controller } from "./controller.js";
import { createR3Store } from "./store.js";
import { normalizeWord } from "../levelBaselineEngine.js";
import { normalizeTerm } from "../vocabEngine.js";
import { R3_OVERLAYS, R3_ROUTES } from "./routes.js";
import { createAppShellView } from "./views/appShellView.js";

let autoBootstrapScheduled = false;
const READER_SELECTION_MAX_LENGTH = 80;
const READER_SELECTION_MAX_TOKENS = 8;
const VOCABULARY_TAB_IDS = Object.freeze(["learning", "known", "hidden"]);
const VOCABULARY_TOAST_DURATION_MS = 2800;
const VOCABULARY_ERROR_TOAST_DURATION_MS = 4200;

export function getAdjacentVocabularyTabId(currentTab, key) {
  const currentIndex = VOCABULARY_TAB_IDS.indexOf(currentTab);
  if (currentIndex === -1 || !["ArrowLeft", "ArrowRight"].includes(key)) return currentTab;
  const offset = key === "ArrowRight" ? 1 : -1;
  return VOCABULARY_TAB_IDS[
    (currentIndex + offset + VOCABULARY_TAB_IDS.length) % VOCABULARY_TAB_IDS.length
  ];
}

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

function findAncestorWithClass(node, className) {
  let current = node?.parentElement || node?.parentNode;
  while (current) {
    if (classListContains(current, className)) {
      return current;
    }
    current = current.parentElement || current.parentNode;
  }
  return null;
}

export function getReaderSelectionTerm(documentRef, maxLength = READER_SELECTION_MAX_LENGTH) {
  const selection = documentRef?.getSelection?.() || documentRef?.defaultView?.getSelection?.();
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) {
    return "";
  }

  const range = selection.getRangeAt(0);
  const textNode = range?.startContainer;
  if (!textNode || textNode !== range.endContainer || textNode.nodeType !== 3) {
    return "";
  }
  if (!findAncestorWithClass(textNode, "r3-reader-content")
      || findAncestorWithClass(textNode, "vocab-hit")) {
    return "";
  }

  const term = normalizeTerm(normalizeWord(selection.toString()));
  const limit = Number.isFinite(Number(maxLength)) ? Number(maxLength) : READER_SELECTION_MAX_LENGTH;
  const lexicalTokens = term.match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/gi) || [];
  return term
    && term.length <= limit
    && lexicalTokens.length >= 1
    && lexicalTokens.length <= READER_SELECTION_MAX_TOKENS
    ? term
    : "";
}

function updateReaderSelectionBar(root, term = "") {
  const bar = findFirst(root, node => node.dataset?.role === "reader-selection-save");
  if (!bar) return;
  const termLabel = findFirst(bar, node => node.dataset?.role === "reader-selection-term");
  const saveButton = findFirst(bar, node => node.dataset?.action === "reader-selection-save");
  bar.hidden = !term;
  if (termLabel) termLabel.textContent = term ? `“${term}”` : "";
  if (saveButton) {
    if (term) {
      saveButton.dataset.selectionTerm = term;
    } else {
      delete saveButton.dataset.selectionTerm;
    }
  }
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

function findVocabularyHit(root, term, occurrenceIndex = 0) {
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
  return matches[Number(occurrenceIndex)] || null;
}

function removePassageTarget(node) {
  if (node?.classList?.remove) {
    node.classList.remove("is-passage-target");
  } else if (node) {
    node.className = String(node.className || "")
      .split(/\s+/)
      .filter(className => className && className !== "is-passage-target")
      .join(" ");
  }
  if (node?.dataset) delete node.dataset.passageOccurrenceIndex;
}

function clearPassageTargets(root) {
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.shift();
    if (classListContains(node, "is-passage-target")) removePassageTarget(node);
    stack.push(...(node.children || []));
  }
}

function applyPassageTarget(node, occurrenceIndex = 0) {
  if (!node) return false;
  if (node.classList?.add) {
    node.classList.add("is-passage-target");
  } else if (!classListContains(node, "is-passage-target")) {
    node.className = `${node.className || ""} is-passage-target`.trim();
  }
  node.dataset.passageOccurrenceIndex = String(Number(occurrenceIndex) || 0);
  return true;
}

export function scrollToVocabularyHit(root, term, occurrenceIndex = 0) {
  const hit = findVocabularyHit(root, term, occurrenceIndex);
  if (!hit || typeof hit.scrollIntoView !== "function") return false;
  clearPassageTargets(root);
  const windowRef = hit.ownerDocument?.defaultView;
  const reducedMotion = windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  hit.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  applyPassageTarget(hit, occurrenceIndex);
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

function findVocabularyPreviewScrollElement(root) {
  if (typeof root.querySelector === "function") {
    const match = root.querySelector(".r3-vocabulary-preview-list");
    if (match) return match;
  }
  return findFirst(root, node => classListContains(node, "r3-vocabulary-preview-list"));
}

function findVocabularyScrollElement(root) {
  return findFirst(root, node => classListContains(node, "r3-main"));
}

function isWithinRoot(node, root) {
  let current = node;
  while (current) {
    if (current === root) return true;
    current = current.parentNode;
  }
  return false;
}

function getVocabularyFocusDescriptor(root, documentRef) {
  const activeElement = documentRef.activeElement;
  if (!activeElement || !isWithinRoot(activeElement, root)) return null;
  if (activeElement.id) return { id: activeElement.id };
  if (activeElement.dataset?.action) {
    return {
      action: activeElement.dataset.action,
      route: activeElement.dataset.route || "",
      vocabularyTab: activeElement.dataset.vocabularyTab || "",
      vocabularyTerm: activeElement.dataset.vocabularyTerm || ""
    };
  }
  if (activeElement.dataset?.role) return { role: activeElement.dataset.role };
  return null;
}

function findVocabularyFocusTarget(root, descriptor) {
  if (!descriptor) return null;
  return findFirst(root, node => {
    if (descriptor.id) return node.id === descriptor.id;
    if (descriptor.role) return node.dataset?.role === descriptor.role;
    return (
      node.dataset?.action === descriptor.action
      && (node.dataset?.route || "") === descriptor.route
      && (node.dataset?.vocabularyTab || "") === descriptor.vocabularyTab
      && (node.dataset?.vocabularyTerm || "") === descriptor.vocabularyTerm
    );
  });
}

function focusWithoutScrolling(element) {
  if (!element || element.disabled || typeof element.focus !== "function") return false;
  try {
    element.focus({ preventScroll: true });
  } catch (error) {
    element.focus();
  }
  return true;
}

function readScrollMetrics(element) {
  return {
    scrollTop: element?.scrollTop || 0,
    scrollHeight: element?.scrollHeight || 0,
    clientHeight: element?.clientHeight || 0
  };
}

function mountAppShell(root, store, documentRef, controller, options = {}) {
  let previousState = null;
  let readerScrollPreservationSequence = 0;
  let vocabularyFocusDescriptor = null;
  let vocabularyToastSignature = "";
  let vocabularyToastTimer = null;
  const windowRef = documentRef.defaultView || globalThis.window;
  const setToastTimeout = options.toastTimers?.setTimeout
    || windowRef?.setTimeout?.bind(windowRef)
    || globalThis.setTimeout?.bind(globalThis);
  const clearToastTimeout = options.toastTimers?.clearTimeout
    || windowRef?.clearTimeout?.bind(windowRef)
    || globalThis.clearTimeout?.bind(globalThis);

  const clearVocabularyToastTimer = () => {
    if (vocabularyToastTimer !== null && typeof clearToastTimeout === "function") {
      clearToastTimeout(vocabularyToastTimer);
    }
    vocabularyToastTimer = null;
  };

  const syncVocabularyToastTimer = (state) => {
    const feedback = state.activeScreen === R3_ROUTES.VOCABULARY
      ? state.vocabulary?.feedback
      : null;
    const signature = feedback?.message
      ? `${feedback.tone || "neutral"}\u0000${feedback.message}`
      : "";
    if (signature === vocabularyToastSignature) return;

    clearVocabularyToastTimer();
    vocabularyToastSignature = signature;
    if (!signature || typeof setToastTimeout !== "function") return;

    const delay = feedback.tone === "error"
      ? (options.errorToastDurationMs || VOCABULARY_ERROR_TOAST_DURATION_MS)
      : (options.toastDurationMs || VOCABULARY_TOAST_DURATION_MS);
    vocabularyToastTimer = setToastTimeout(() => {
      vocabularyToastTimer = null;
      const currentState = store.getState();
      const currentFeedback = currentState.vocabulary?.feedback;
      const currentSignature = currentFeedback?.message
        ? `${currentFeedback.tone || "neutral"}\u0000${currentFeedback.message}`
        : "";
      vocabularyToastSignature = "";
      if (
        currentState.activeScreen === R3_ROUTES.VOCABULARY
        && currentSignature === signature
      ) {
        controller.setVocabularyFeedback?.("", "neutral");
      }
    }, delay);
  };

  const render = (state) => {
    const previousReaderScroll = findReaderScrollElement(root);
    const previousPreviewScroll = findVocabularyPreviewScrollElement(root);
    const previousVocabularyScroll = findVocabularyScrollElement(root);
    const previousPassageTarget = findFirst(root, node => (
      classListContains(node, "is-passage-target")
    ));
    const shouldPreserveReaderScroll = (
      previousState?.activeScreen === R3_ROUTES.READER
      && state.activeScreen === R3_ROUTES.READER
      && previousState.activeBookId === state.activeBookId
      && previousState.activeChapterId === state.activeChapterId
    );
    const preservedReaderScrollTop = shouldPreserveReaderScroll
      ? previousReaderScroll?.scrollTop
      : null;
    const preservedPassageLocator = shouldPreserveReaderScroll && previousPassageTarget
      ? {
          term: previousPassageTarget.dataset?.vocabTerm || "",
          occurrenceIndex: Number(previousPassageTarget.dataset?.passageOccurrenceIndex) || 0
        }
      : null;
    const shouldPreservePreviewScroll = (
      previousState?.openOverlay === R3_OVERLAYS.VOCABULARY_PREVIEW
      && state.openOverlay === R3_OVERLAYS.VOCABULARY_PREVIEW
      && previousState.activeBookId === state.activeBookId
      && previousState.activeChapterId === state.activeChapterId
    );
    const preservedPreviewScrollTop = shouldPreservePreviewScroll
      ? previousPreviewScroll?.scrollTop
      : null;
    const shouldPreserveVocabularyScroll = (
      previousState?.activeScreen === R3_ROUTES.VOCABULARY
      && state.activeScreen === R3_ROUTES.VOCABULARY
    );
    const preservedVocabularyScrollTop = shouldPreserveVocabularyScroll
      ? previousVocabularyScroll?.scrollTop
      : null;
    if (shouldPreserveVocabularyScroll) {
      vocabularyFocusDescriptor = getVocabularyFocusDescriptor(root, documentRef)
        || vocabularyFocusDescriptor;
    } else {
      vocabularyFocusDescriptor = null;
    }
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
    if (Number.isFinite(preservedPreviewScrollTop)) {
      const previewScroll = findVocabularyPreviewScrollElement(root);
      if (previewScroll) previewScroll.scrollTop = preservedPreviewScrollTop;
    }
    if (Number.isFinite(preservedVocabularyScrollTop)) {
      const vocabularyScroll = findVocabularyScrollElement(root);
      if (vocabularyScroll) vocabularyScroll.scrollTop = preservedVocabularyScrollTop;
    }
    if (shouldPreserveVocabularyScroll && vocabularyFocusDescriptor) {
      focusWithoutScrolling(findVocabularyFocusTarget(root, vocabularyFocusDescriptor));
    }
    if (state.activeScreen === R3_ROUTES.READER) {
      const readerScroll = findReaderScrollElement(root);
      if (preservedPassageLocator?.term) {
        applyPassageTarget(
          findVocabularyHit(
            root,
            preservedPassageLocator.term,
            preservedPassageLocator.occurrenceIndex
          ),
          preservedPassageLocator.occurrenceIndex
        );
      }
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
    syncVocabularyToastTimer(state);
    previousState = state;
  };

  render(store.getState());
  const unsubscribe = store.subscribe((state) => render(state));
  return () => {
    clearVocabularyToastTimer();
    unsubscribe();
  };
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

function findAncestorByClass(start, boundary, className) {
  let current = start;
  while (current && current !== boundary) {
    if (classListContains(current, className)) return current;
    current = current.parentNode;
  }
  return classListContains(current, className) ? current : null;
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

function createBrowserEffects(documentRef) {
  const windowRef = documentRef.defaultView || globalThis.window;
  return {
    async copyText(text) {
      const clipboard = windowRef?.navigator?.clipboard || globalThis.navigator?.clipboard;
      if (typeof clipboard?.writeText === "function") {
        try {
          await clipboard.writeText(String(text));
          return;
        } catch (error) {
          // Fall through to the local selection copy path when focus or permission blocks Clipboard API.
        }
      }
      const textarea = documentRef.createElement("textarea");
      textarea.value = String(text);
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      documentRef.body.appendChild(textarea);
      textarea.focus?.();
      textarea.select();
      const copied = documentRef.execCommand?.("copy");
      textarea.remove?.();
      if (!copied) throw new Error("Clipboard access is unavailable.");
    },
    downloadText(payload) {
      const BlobCtor = windowRef?.Blob || globalThis.Blob;
      const urlApi = windowRef?.URL || globalThis.URL;
      if (!BlobCtor || typeof urlApi?.createObjectURL !== "function") {
        throw new Error("File download is unavailable.");
      }
      const url = urlApi.createObjectURL(new BlobCtor([payload.text], { type: payload.mimeType }));
      const anchor = documentRef.createElement("a");
      anchor.href = url;
      anchor.download = payload.filename;
      documentRef.body.appendChild(anchor);
      anchor.click();
      anchor.remove?.();
      urlApi.revokeObjectURL(url);
    },
    async readTextFile(file) {
      if (typeof file?.text === "function") return file.text();
      const FileReaderCtor = windowRef?.FileReader || globalThis.FileReader;
      if (!FileReaderCtor) throw new Error("Could not read the selected backup file.");
      return new Promise((resolve, reject) => {
        const reader = new FileReaderCtor();
        reader.onerror = () => reject(reader.error || new Error("Could not read the selected backup file."));
        reader.onload = () => resolve(String(reader.result || ""));
        reader.readAsText(file, "utf-8");
      });
    }
  };
}

function bindAppShellEvents(root, controller, browserEffects) {
  if (root.dataset.r3ShellEventsBound === "true") {
    return;
  }

  root.dataset.r3ShellEventsBound = "true";
  let selectionUpdateScheduled = false;
  const syncReaderSelection = () => {
    selectionUpdateScheduled = false;
    const hasBlockingUi = findFirst(root, node => (
      classListContains(node, "r3-vocabulary-bubble")
      || classListContains(node, "r3-reader-overlay")
    ));
    updateReaderSelectionBar(root, hasBlockingUi ? "" : getReaderSelectionTerm(root.ownerDocument));
  };
  const scheduleReaderSelectionSync = () => {
    if (selectionUpdateScheduled) return;
    selectionUpdateScheduled = true;
    const windowRef = root.ownerDocument?.defaultView;
    if (typeof windowRef?.requestAnimationFrame === "function") {
      windowRef.requestAnimationFrame(syncReaderSelection);
    } else {
      syncReaderSelection();
    }
  };
  const runVocabularyBrowserAction = async (action) => {
    controller.setVocabularyFeedback("", "neutral");
    try {
      if (action === "backup") {
        browserEffects.downloadText(await controller.prepareVocabularyBackup());
        controller.setVocabularyFeedback("Download started", "success");
        return;
      }
      const payload = await controller.prepareVocabularyExport(action);
      if (payload.kind === "copy") {
        await browserEffects.copyText(payload.text);
        controller.setVocabularyFeedback(
          action === "copy-learning" ? "Learning copied" : "Vocabulary copied",
          "success"
        );
      } else {
        browserEffects.downloadText(payload);
        controller.setVocabularyFeedback("Download started", "success");
      }
    } catch (error) {
      const message = action === "copy-learning"
        ? "Could not copy Learning"
        : action === "copy-all"
          ? "Could not copy vocabulary"
          : "Could not start download";
      controller.setVocabularyFeedback(message, "error");
    }
  };
  const submitVocabularyTerm = (scope) => {
    const input = findFirst(scope || root, node => node.dataset?.role === "vocabulary-manual-term")
      || findFirst(root, node => node.dataset?.role === "vocabulary-manual-term");
    return controller.addVocabularyLearningTerm?.(input?.value || "");
  };

  root.ownerDocument?.addEventListener?.("selectionchange", scheduleReaderSelectionSync);
  root.addEventListener("pointerup", scheduleReaderSelectionSync, { passive: true });
  root.addEventListener("keyup", scheduleReaderSelectionSync);
  root.addEventListener("click", (event) => {
    const hit = event.target.closest?.(".r3-reader-content .vocab-hit[data-vocab-term]");
    if (hit) {
      const box = hit.getBoundingClientRect();
      controller.toggleVocabularyBubble?.(hit.dataset.vocabTerm, { x: box.left, y: box.bottom });
      return;
    }
    const actionElement = findActionElement(event.target, root);
    const action = actionElement?.dataset?.action;

    if (action === "vocabulary-tab") {
      controller.selectVocabularyTab?.(actionElement.dataset.vocabularyTab);
      return;
    }
    if (action === "vocabulary-add-submit") {
      event.preventDefault?.();
      submitVocabularyTerm(actionElement.parentNode?.parentNode);
      return;
    }
    if (action === "vocabulary-remove") {
      controller.removeVocabularyTerm?.(actionElement.dataset.vocabularyTerm);
      return;
    }
    if (action === "vocabulary-restore-open") {
      findFirst(root, node => node.dataset?.role === "vocabulary-restore-input")?.click?.();
      return;
    }
    const vocabularyExportAction = {
      "vocabulary-copy-learning": "copy-learning",
      "vocabulary-download-learning": "download-learning",
      "vocabulary-copy-all": "copy-all",
      "vocabulary-download-csv": "download-csv",
      "vocabulary-backup": "backup"
    }[action];
    if (vocabularyExportAction) {
      runVocabularyBrowserAction(vocabularyExportAction);
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
    if (action === "reader-selection-save") {
      const term = actionElement.dataset.selectionTerm;
      if (term) {
        controller.setReaderVocabularyState?.("learning", term);
      }
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
    if (findAncestorByClass(event.target, root, "r3-vocabulary-bubble")) {
      controller.closeVocabularyBubble?.();
      return;
    }
    controller.closeVocabularyBubble?.();

    if (!action) {
      return;
    }

    if (action === "navigate") {
      const route = actionElement.dataset.route;
      if ([R3_ROUTES.HOME, R3_ROUTES.LIBRARY, R3_ROUTES.VOCABULARY].includes(route)) {
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
    if (actionElement?.dataset?.action === "vocabulary-level") {
      controller.setVocabularyLevel?.(actionElement.value);
      return;
    }
    if (actionElement?.dataset?.action === "vocabulary-restore-file") {
      const file = actionElement.files?.[0];
      if (file) {
        browserEffects.readTextFile(file)
          .then(text => controller.restoreVocabularyBackup?.(text))
          .then(state => {
            if (state?.vocabulary?.feedback?.tone === "error") {
              controller.setVocabularyFeedback("Could not restore vocabulary", "error");
            }
          })
          .catch(() => controller.setVocabularyFeedback(
            "Could not restore vocabulary",
            "error"
          ));
      }
      actionElement.value = "";
      return;
    }
    if (actionElement?.dataset?.action !== "import-file") {
      return;
    }

    const file = actionElement.files?.[0];
    if (file) {
      controller.importBook(file);
    }
    actionElement.value = "";
  });

  root.addEventListener("submit", event => {
    const actionElement = findActionElement(event.target, root);
    if (actionElement?.dataset?.action !== "vocabulary-add") return;
    event.preventDefault?.();
    submitVocabularyTerm(actionElement);
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
    const actionElement = findActionElement(event.target, root);
    if (
      actionElement?.dataset?.action === "vocabulary-tab"
      && ["ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault?.();
      const nextTab = getAdjacentVocabularyTabId(
        actionElement.dataset.vocabularyTab,
        event.key
      );
      controller.selectVocabularyTab?.(nextTab);
      findFirst(root, node => (
        node.dataset?.action === "vocabulary-tab"
        && node.dataset?.vocabularyTab === nextTab
      ))?.focus?.();
      return;
    }
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
  const unsubscribe = mountAppShell(root, store, documentRef, controller, {
    toastTimers: options.toastTimers,
    toastDurationMs: options.toastDurationMs,
    errorToastDurationMs: options.errorToastDurationMs
  });
  bindAppShellEvents(root, controller, options.browserEffects || createBrowserEffects(documentRef));
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
