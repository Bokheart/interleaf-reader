import { createR3Controller } from "./controller.js";
import { createR3Store } from "./store.js";
import { R3_ACTIONS } from "./actions.js";
import { getTranslation } from "../i18n.js";
import { normalizeWord } from "../levelBaselineEngine.js";
import { normalizeTerm } from "../vocabEngine.js";
import { R3_OVERLAYS, R3_ROUTES } from "./routes.js";
import { createAppShellView } from "./views/appShellView.js";
import { createReaderLayout, readerSwipeIntent, getReaderPageSwipeDirection } from "./readerLayout.js";
import { bindReaderHistory } from "./readerHistory.js";
import { bindReaderInteractionTrace } from "./readerInteractionTrace.js";
import { readerAppearanceSignature, resolveReaderAppearance } from "../readerAppearance.js";
import { applyDisplayModeDataset, syncDocumentTheme } from "./standaloneDisplay.js";

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

export function getReaderSelectionCapture(documentRef) {
  if (!getReaderSelectionTerm(documentRef)) return null;
  const selection = documentRef.getSelection?.() || documentRef.defaultView?.getSelection?.();
  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  if (!Number.isInteger(range.startOffset) || !Number.isInteger(range.endOffset)) return null;
  const block = node.parentElement?.closest?.("p, li, blockquote, h1, h2, h3, h4, h5, h6, div") || node.parentElement;
  if (!block || !documentRef.createRange) return null;
  const prefix = documentRef.createRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(node, range.startOffset);
  const selected = String(selection);
  // Preserve case and surrounding prose; trim only the selection's outer noise.
  const leading = selected.match(/^[^a-z0-9'-]*/i)?.[0].length || 0;
  const trailing = selected.match(/[^a-z0-9'-]*$/i)?.[0].length || 0;
  const targetOffset = prefix.toString().length + leading;
  return { sentence: block.textContent, targetOffset,
    targetEnd: prefix.toString().length + selected.length - trailing, freeform: true };
}

const READER_SELECTION_BLOCKS = ".r3-reader-content p, .r3-reader-content li, .r3-reader-content blockquote, .r3-reader-content h1, .r3-reader-content h2, .r3-reader-content h3, .r3-reader-content h4, .r3-reader-content h5, .r3-reader-content h6, .r3-reader-content div";
const READER_SELECTION_BLOCK_TAGS = "p, li, blockquote, h1, h2, h3, h4, h5, h6, div";

function markPendingSelection(documentRef, block, start, length, term) {
  if (!block || !length) return;
  const walker = documentRef.createTreeWalker(block, 4);
  const segments = [];
  let node, offset = 0;
  while ((node = walker.nextNode())) {
    const end = offset + node.textContent.length;
    if (start < end && start + length > offset) {
      segments.push({ node, start: Math.max(0, start - offset), end: Math.min(node.textContent.length, start + length - offset) });
    }
    offset = end;
  }
  // Collect first because wrapping text changes the live tree.
  for (const segment of segments.reverse()) {
    const mark = documentRef.createElement("span");
    mark.className = "r3-vocabulary-pending";
    mark.dataset.pendingVocabularyTerm = term;
    const range = documentRef.createRange();
    range.setStart(segment.node, segment.start);
    range.setEnd(segment.node, segment.end);
    try { range.surroundContents(mark); } catch { /* Keep native selection usable. */ }
  }
}

function capturePendingSelectionUnderline(root, documentRef) {
  const selection = documentRef?.getSelection?.();
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed
      || !root?.querySelectorAll || !documentRef?.createRange || !documentRef?.createTreeWalker) return null;
  const range = selection.getRangeAt(0);
  const block = range.startContainer?.parentElement?.closest?.(READER_SELECTION_BLOCK_TAGS);
  const blockIndex = [...root.querySelectorAll(READER_SELECTION_BLOCKS)].indexOf(block);
  if (blockIndex < 0) return null;
  const prefix = documentRef.createRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length, length = String(selection).length;
  const term = getReaderSelectionTerm(documentRef);
  return () => markPendingSelection(documentRef, root.querySelectorAll(READER_SELECTION_BLOCKS)[blockIndex], start, length, term);
}

function preservePendingSelectionUnderlines(root, documentRef, pendingTerms = []) {
  if (!pendingTerms.length || !documentRef?.createRange || !documentRef?.createTreeWalker) return null;
  const blocks = [...root.querySelectorAll(READER_SELECTION_BLOCKS)];
  const snapshots = [];
  for (const mark of root.querySelectorAll(".r3-vocabulary-pending")) {
    const term = mark.dataset.pendingVocabularyTerm;
    if (!pendingTerms.includes(term)) continue;
    const block = mark.closest(READER_SELECTION_BLOCK_TAGS), blockIndex = blocks.indexOf(block);
    if (blockIndex < 0) continue;
    const prefix = documentRef.createRange();
    prefix.selectNodeContents(block);
    prefix.setEndBefore(mark);
    snapshots.push({ blockIndex, start: prefix.toString().length, length: mark.textContent.length, term });
  }
  return () => {
    const currentBlocks = root.querySelectorAll(READER_SELECTION_BLOCKS);
    for (const mark of snapshots) markPendingSelection(documentRef, currentBlocks[mark.blockIndex], mark.start, mark.length, mark.term);
  };
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

function sourceOffsetForElement(content, target) {
  if (!content?.childNodes || !target) return null;
  let offset = 0;
  let found = false;
  const visit = node => {
    if (node === target) { found = true; return; }
    if (node.nodeType === 3) { offset += node.textContent?.length || 0; return; }
    if (["IMG", "SVG", "VIDEO", "HR"].includes(node.tagName)) { offset += 1; return; }
    if (!["SCRIPT", "STYLE"].includes(node.tagName)) {
      for (const child of node.childNodes || []) { if (found) break; visit(child); }
    }
  };
  visit(content);
  return found ? offset : null;
}

export function collectVocabularyOccurrences(root, chapterId = null) {
  const occurrences = {};
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.shift();
    if (classListContains(node, "vocab-hit")) {
      const term = normalizeTerm(node.dataset?.vocabTerm);
      if (term) {
        const termOccurrences = occurrences[term] || [];
        const content = findAncestorByClass(node, root, "r3-reader-content");
        const textOffset = sourceOffsetForElement(content, node);
        termOccurrences.push({
          occurrenceIndex: termOccurrences.length,
          snippet: getVocabularySnippet(node),
          ...(chapterId && Number.isInteger(textOffset) ? { chapterId, textOffset } : {})
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
  if (!root.__readerLayout?.showHit(hit)) hit.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
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
  let settingsOriginScroll = null;
  const shellScrollPositions = new Map();
  const hasShellScroll = screen => screen === R3_ROUTES.HOME || screen === R3_ROUTES.LIBRARY;
  let readerScrollPreservationSequence = 0;
  let vocabularyFocusDescriptor = null;
  let vocabularyToastSignature = "";
  let vocabularyToastTimer = null;
  const windowRef = documentRef.defaultView || globalThis.window;
  applyDisplayModeDataset(documentRef, windowRef);
  const readerLayout = createReaderLayout(root, store, controller);
  root.__readerLayout = readerLayout;

  const syncShellTheme = (state) => {
    // Reader Appearance Dark retints Reader chrome/prose only. Outside Reader,
    // document chrome stays on the light shell tokens.
    const theme = state.activeScreen === R3_ROUTES.READER
      ? resolveReaderAppearance(state.reader).theme
      : "light";
    syncDocumentTheme(documentRef, theme);
  };

  const updatePaginationControls = (state) => {
    const pages = state.reader.pagination || {};
    const t = (key, params) => getTranslation(state.settings?.uiLanguage || "en", key, params);
    const label = pages.status === "ready"
      ? (state.reader.readingLayout === "scroll" ? "" : (pages.pageIndex + 1) + " / " + pages.pageCount + " · ")
        + Math.floor((pages.bookProgress || 0) * 100) + "%"
      : "";
    for (const node of root.querySelectorAll?.("[data-role='reader-page-label']") || []) {
      node.textContent = label;
      node.setAttribute("title", t("r3.reader.seekPage") + " · " + t("r3.reader.sourceProgress"));
    }
    const slider = root.querySelector?.("[data-action='reader-progress-page']");
    if (slider) {
      slider.max = "1000";
      slider.value = String(Math.round((pages.bookProgress || 0) * 1000));
      slider.disabled = pages.status !== "ready";
      slider.setAttribute("aria-valuetext", `${label} · ${state.reader.chapterTitle}`);
    }
    const title = root.querySelector?.(".r3-reader-progress-title");
    if (title) title.textContent = state.reader.chapterTitle;
    const error = root.querySelector?.("[data-role='reader-seek-message']");
    if (error) { error.textContent = state.reader.error?.message || ""; error.hidden = !error.textContent; }
    for (const [action, available] of [["reader-previous", state.reader.hasPrevious], ["reader-next", state.reader.hasNext]]) {
      const button = root.querySelector?.(`[data-action='${action}']`);
      if (button) button.disabled = !available || state.reader.status !== "ready";
    }
  };
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

  const render = (state, action = null) => {
    syncShellTheme(state);
    if (action?.optimisticVocabulary
        && previousState?.activeScreen === R3_ROUTES.READER
        && state.activeScreen === R3_ROUTES.READER
        && previousState.activeBookId === state.activeBookId
        && previousState.activeChapterId === state.activeChapterId
        && previousState.openOverlay === state.openOverlay
        && previousState.reader.html === state.reader.html) {
      const previewStates = new Map((state.reader.vocabularyPreview?.rows || [])
        .map(row => [normalizeTerm(row.term), row.state]));
      for (const button of root.querySelectorAll?.(".r3-vocabulary-state-button") || []) {
        const selected = previewStates.get(normalizeTerm(button.dataset.vocabularyTerm)) === button.dataset.vocabularyState;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
      for (const button of root.querySelectorAll?.('.r3-vocabulary-bubble [data-action="vocabulary-state"]') || []) {
        button.disabled = state.reader.vocabularySaving;
      }
      previousState = state;
      return;
    }
    if (previousState?.activeScreen === R3_ROUTES.READER && state.activeScreen === R3_ROUTES.READER
      && JSON.stringify({ ...previousState, reader: { ...previousState.reader, pagination: state.reader.pagination } }) === JSON.stringify(state)) {
      previousState = state;
      updatePaginationControls(state);
      return;
    }
    // A chrome-only change must not replace prose, selection ranges or the scroll host.
    if (previousState?.activeScreen === R3_ROUTES.READER
      && previousState.reader.chromeVisible !== state.reader.chromeVisible
      && JSON.stringify({ ...previousState, reader: { ...previousState.reader, chromeVisible: state.reader.chromeVisible } }) === JSON.stringify(state)) {
      const visible = state.reader.chromeVisible !== false;
      const screen = findFirst(root, node => classListContains(node, "r3-reader-screen"));
      screen?.setAttribute("data-chrome-visible", String(visible));
      for (const className of ["r3-reader-header", "r3-reader-footer"]) {
        const chrome = findFirst(root, node => classListContains(node, className));
        if (chrome) {
          chrome.inert = !visible;
          chrome.setAttribute("aria-hidden", String(!visible));
        }
      }
      previousState = state;
      return;
    }
    root.__readerInteractionTrace?.record("READER_RENDER", "shell", action?.type || "initial");
    // These scroll owners are replaced on every shell render. Keep rerenders
    // and history returns in place; explicit fresh navigation still starts at 0.
    if (hasShellScroll(previousState?.activeScreen)) {
      const main = root.querySelector?.(".r3-main");
      if (main) shellScrollPositions.set(previousState.activeScreen, main.scrollTop || 0);
    }
    const shellScrollTop = (state.activeScreen === previousState?.activeScreen && action?.type !== R3_ACTIONS.NAVIGATE)
      || action?.restoreShellScroll
      ? shellScrollPositions.get(state.activeScreen) || 0 : 0;
    // Capture before Settings' origin-state dispatch replaces the shell DOM.
    if (state.settings?.returnScreen === state.activeScreen
      && previousState?.settings?.returnScreen !== state.settings.returnScreen) {
      const readerScroll = findReaderScrollElement(root);
      settingsOriginScroll = { screen: state.activeScreen,
        main: root.querySelector?.(".r3-main")?.scrollTop || 0,
        vocabulary: findVocabularyScrollElement(root)?.scrollTop || 0,
        reader: readerScroll ? { bookId: state.activeBookId, chapterId: state.activeChapterId,
          layout: state.reader.readingLayout, appearance: readerAppearanceSignature(state.reader),
          width: readerScroll.clientWidth, height: readerScroll.clientHeight,
          scrollTop: readerScroll.scrollTop, scrollLeft: readerScroll.scrollLeft } : null };
    }
    const returningToOrigin = previousState?.activeScreen?.startsWith("settings.")
      && state.activeScreen === settingsOriginScroll?.screen;
    const originReaderPixels = returningToOrigin ? settingsOriginScroll.reader : null;
    readerLayout?.cancelTurn();
    const previousReaderScroll = findReaderScrollElement(root);
    const readerHadFocus = previousReaderScroll && documentRef.activeElement === previousReaderScroll;
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
    const restorePendingUnderlines = shouldPreserveReaderScroll
      ? preservePendingSelectionUnderlines(root, documentRef, state.reader.pendingVocabularyTerms) : null;
    const appearanceUnchanged = shouldPreserveReaderScroll
      && previousState.reader.readingLayout === state.reader.readingLayout
      && readerAppearanceSignature(previousState.reader) === readerAppearanceSignature(state.reader);
    const preservedReaderScrollTop = appearanceUnchanged
      ? previousReaderScroll?.scrollTop
      : null;
    const preservedLayoutScroll = appearanceUnchanged
      && previousState.reader.status === "ready" && state.reader.status === "ready"
      ? { scrollTop: previousReaderScroll?.scrollTop || 0, scrollLeft: previousReaderScroll?.scrollLeft || 0 } : null;
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
    const readerSurfaceOverlays = [R3_OVERLAYS.CONTENTS, R3_OVERLAYS.PROGRESS, R3_OVERLAYS.MODE, R3_OVERLAYS.APPEARANCE];
    const surfaceFocus = readerSurfaceOverlays.includes(previousState?.openOverlay)
      ? documentRef.activeElement?.dataset : null;
    if (Number.isFinite(preservedReaderScrollTop)) {
      root.dataset.r3ReaderScrollPreservation = preservationSequence;
    } else {
      delete root.dataset.r3ReaderScrollPreservation;
    }

    root.dataset.r3Initialized = state.initialized ? "true" : "false";
    root.dataset.r3SavedBookCount = String(state.savedBookCount || 0);
    root.dataset.r3ActiveScreen = state.activeScreen || "";
    root.dataset.r3Loading = state.loading?.isLoading ? "true" : "false";
    root.dataset.r3UiLanguage = state.settings?.uiLanguage || "en";
    documentRef.documentElement?.setAttribute?.("lang", state.settings?.uiLanguage || "en");
    const view = createAppShellView(documentRef, state);
    const liveScreen = root.querySelector?.(".r3-reader-screen");
    const keepProgress = liveScreen && previousState?.openOverlay === R3_OVERLAYS.PROGRESS
      && state.openOverlay === R3_OVERLAYS.PROGRESS && previousState.activeBookId === state.activeBookId;
    if (keepProgress) {
      // Never detach the active range input during a native pointer drag.
      const nextScreen = view.querySelector(".r3-reader-screen");
      for (const child of [...liveScreen.children]) {
        if (!child.classList.contains("r3-reader-overlay")) child.remove();
      }
      for (const child of [...nextScreen.children]) {
        if (!child.classList.contains("r3-reader-overlay")) liveScreen.insertBefore(child, liveScreen.lastElementChild);
      }
    } else root.replaceChildren(view);
    if (!keepProgress && root.textContent !== view.textContent) {
      root.textContent = view.textContent;
      root.replaceChildren(view);
    }
    restorePendingUnderlines?.();
    if (hasShellScroll(state.activeScreen)) {
      const main = root.querySelector?.(".r3-main");
      if (main) main.scrollTop = shellScrollTop;
    }
    if (returningToOrigin) {
      const main = root.querySelector?.(".r3-main");
      const vocabulary = findVocabularyScrollElement(root);
      if (main) main.scrollTop = settingsOriginScroll.main;
      if (vocabulary) vocabulary.scrollTop = settingsOriginScroll.vocabulary;
      settingsOriginScroll = null;
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
      if (!readerLayout) controller.applyReaderScrollRestoration?.(readerScroll);
      const bubble = root.querySelector?.(".r3-vocabulary-bubble");
      if (bubble && state.reader.vocabularyBubble) {
        const { x, y } = state.reader.vocabularyBubble;
        const windowRef = documentRef.defaultView || globalThis.window;
        const box = bubble.getBoundingClientRect();
        bubble.style.left = `${Math.max(12, Math.min(x, windowRef.innerWidth - box.width - 12))}px`;
        bubble.style.top = `${Math.max(12, Math.min(y + 12, windowRef.innerHeight - box.height - 12))}px`;
      }
      if (readerSurfaceOverlays.includes(state.openOverlay) && !keepProgress) {
        const sameSurface = previousState?.openOverlay === state.openOverlay;
        const focusTarget = sameSurface && surfaceFocus?.action
          ? findFirst(root, node => node.dataset?.action === surfaceFocus.action
            && node.dataset?.mode === surfaceFocus.mode && node.dataset?.chapterIndex === surfaceFocus.chapterIndex && !node.disabled)
          : null;
        focusWithoutScrolling(focusTarget || root.querySelector?.(".r3-reader-overlay button:not(:disabled)"));
      } else if (readerSurfaceOverlays.includes(previousState?.openOverlay) && !state.openOverlay) {
        const trigger = {
          [R3_OVERLAYS.CONTENTS]: "reader-contents",
          [R3_OVERLAYS.PROGRESS]: "reader-progress",
          [R3_OVERLAYS.MODE]: "reader-mode",
          [R3_OVERLAYS.APPEARANCE]: "reader-appearance"
        }[previousState.openOverlay];
        focusWithoutScrolling(findFirst(root, node => node.dataset?.action === trigger));
      }
    }
    syncVocabularyToastTimer(state);
    previousState = state;
    const returnedScroll = findReaderScrollElement(root);
    const matchingOriginGeometry = originReaderPixels && returnedScroll
      && state.activeBookId === originReaderPixels.bookId && state.activeChapterId === originReaderPixels.chapterId
      && state.reader.readingLayout === originReaderPixels.layout
      && readerAppearanceSignature(state.reader) === originReaderPixels.appearance
      && returnedScroll.clientWidth === originReaderPixels.width && returnedScroll.clientHeight === originReaderPixels.height;
    readerLayout?.attach(state, preservedLayoutScroll, matchingOriginGeometry ? originReaderPixels : null);
    updatePaginationControls(store.getState());
    if (state.activeScreen === R3_ROUTES.READER && !state.openOverlay) {
      if (readerHadFocus) focusWithoutScrolling(findReaderScrollElement(root));
    }
  };

  render(store.getState());
  const unsubscribe = store.subscribe((state, action) => render(state, action));
  return () => {
    clearVocabularyToastTimer();
    readerLayout?.destroy();
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

function isReaderChromeTap(event, root) {
  if (event.defaultPrevented || event.detail > 1) return false;
  const selection = root.ownerDocument?.getSelection?.();
  if (selection && !selection.isCollapsed && String(selection).length) return false;
  let current = event.target;
  while (current && current !== root) {
    if (["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "AUDIO", "VIDEO"].includes(current.tagName)
      || current.isContentEditable || current.getAttribute?.("contenteditable") === "true"
      || ["button", "link", "slider"].includes(current.getAttribute?.("role"))
      || current.dataset?.action
      || ["vocab-hit", "r3-vocabulary-bubble", "r3-selection-save-bar", "r3-reader-overlay"].some(name => classListContains(current, name))) return false;
    if (classListContains(current, "r3-reader-content")) return true;
    current = current.parentNode;
  }
  return false;
}

function hasActiveReaderSelection(documentRef) {
  const selection = documentRef?.getSelection?.() || documentRef?.defaultView?.getSelection?.();
  return Boolean(selection && !selection.isCollapsed && String(selection).length);
}

function getReaderPageGestureSurface(start, root) {
  let surface = null;
  let current = start;
  while (current && current !== root) {
    if (["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "AUDIO", "VIDEO"].includes(current.tagName)
      || current.isContentEditable || current.getAttribute?.("contenteditable") === "true"
      || ["button", "link", "slider", "dialog"].includes(current.getAttribute?.("role"))
      || current.dataset?.action
      || ["vocab-hit", "r3-vocabulary-bubble", "r3-selection-save-bar", "r3-reader-overlay", "r3-reader-sheet"]
        .some(name => classListContains(current, name))) return null;
    if (classListContains(current, "r3-reader-scroll")) surface = current;
    current = current.parentNode;
  }
  return surface?.dataset?.layout === "page" ? surface : null;
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

function bindAppShellEvents(root, store, controller, browserEffects) {
  if (root.dataset.r3ShellEventsBound === "true") {
    return;
  }

  root.dataset.r3ShellEventsBound = "true";
  const t = (key, params = {}) => (
    controller.getTranslation?.(key, params) || getTranslation("en", key, params)
  );
  const chromeTimers = root.ownerDocument?.defaultView || globalThis;
  let pendingChromeTap = null;
  let pageSwipe = null;
  let suppressReaderClick = false;
  let swipeClickTimer = null;
  const suppressGestureClick = () => {
    suppressReaderClick = true;
    cancelChromeTap();
    chromeTimers.clearTimeout?.(swipeClickTimer);
    swipeClickTimer = chromeTimers.setTimeout?.(() => { suppressReaderClick = false; }, 450);
  };
  const activeTouchPointers = new Set();
  const traceGesture = (event, reason = null) => root.__readerInteractionTrace?.record(event, "gesture", reason);
  const resetTouchSession = reason => {
    if (pageSwipe) traceGesture("GESTURE_REJECTED", reason);
    pageSwipe = null;
    activeTouchPointers.clear();
    cancelChromeTap();
  };
  const cancelChromeTap = () => {
    if (pendingChromeTap !== null) chromeTimers.clearTimeout(pendingChromeTap);
    pendingChromeTap = null;
  };
  let selectionUpdateScheduled = false;
  let readerSelectionCapture = null;
  const syncReaderSelection = () => {
    selectionUpdateScheduled = false;
    const selection = root.ownerDocument?.getSelection?.();
    if (selection && !selection.isCollapsed && String(selection).length) cancelChromeTap();
    const hasBlockingUi = findFirst(root, node => (
      classListContains(node, "r3-vocabulary-bubble")
      || classListContains(node, "r3-reader-overlay")
    ));
    readerSelectionCapture = hasBlockingUi ? null : getReaderSelectionCapture(root.ownerDocument);
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
        controller.setVocabularyFeedback(t("r3.vocabulary.feedback.downloadStarted"), "success");
        return;
      }
      const payload = await controller.prepareVocabularyExport(action);
      if (payload.kind === "copy") {
        await browserEffects.copyText(payload.text);
        controller.setVocabularyFeedback(
          t(action === "copy-learning"
            ? "r3.vocabulary.feedback.learningCopied"
            : "r3.vocabulary.feedback.vocabularyCopied"),
          "success"
        );
      } else {
        browserEffects.downloadText(payload);
        controller.setVocabularyFeedback(t("r3.vocabulary.feedback.downloadStarted"), "success");
      }
    } catch (error) {
      const message = t(action === "copy-learning"
        ? "r3.vocabulary.feedback.copyLearningFailed"
        : action === "copy-all"
          ? "r3.vocabulary.feedback.copyVocabularyFailed"
          : "r3.vocabulary.feedback.downloadFailed");
      controller.setVocabularyFeedback(message, "error");
    }
  };
  const submitVocabularyTerm = (scope) => {
    const input = findFirst(scope || root, node => node.dataset?.role === "vocabulary-manual-term")
      || findFirst(root, node => node.dataset?.role === "vocabulary-manual-term");
    return controller.addVocabularyLearningTerm?.(input?.value || "");
  };

  root.ownerDocument?.addEventListener?.("selectionchange", scheduleReaderSelectionSync);
  root.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch") return;
    // A new primary touch means the previous physical touch session has ended,
    // even if DOM removal/native navigation kept its terminal event off this root.
    if (event.isPrimary === true) resetTouchSession("new-primary");
    traceGesture("POINTER_DOWN");
    activeTouchPointers.add(event.pointerId);
    if (activeTouchPointers.size > 1 || event.isPrimary === false) {
      traceGesture("GESTURE_REJECTED", "multitouch");
      pageSwipe = null;
      return;
    }
    const state = store.getState();
    const surface = getReaderPageGestureSurface(event.target, root);
    if (!surface || state?.activeScreen !== R3_ROUTES.READER || state.openOverlay
      || state.reader?.status !== "ready" || state.reader?.vocabularyBubble || hasActiveReaderSelection(root.ownerDocument)) {
      traceGesture("GESTURE_REJECTED", !surface ? "non-page-surface-or-control"
        : state.openOverlay ? "overlay-open" : state.reader?.vocabularyBubble ? "bubble-open"
          : hasActiveReaderSelection(root.ownerDocument) ? "selection" : "reader-not-ready");
      pageSwipe = null;
      return;
    }
    pageSwipe = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp || Date.now(),
      viewportWidth: root.ownerDocument?.defaultView?.innerWidth || surface.clientWidth,
      intent: "pending",
      bookId: state.activeBookId,
      chapterId: state.activeChapterId,
      surface
    };
    traceGesture("GESTURE_PENDING");
  }, { passive: true });
  root.addEventListener("pointermove", event => {
    if (!pageSwipe || pageSwipe.pointerId !== event.pointerId) return;
    traceGesture("POINTER_MOVE");
    const state = store.getState();
    if (state.openOverlay || state.reader?.vocabularyBubble || hasActiveReaderSelection(root.ownerDocument)) {
      pageSwipe.intent = "rejected";
      traceGesture("GESTURE_REJECTED", "blocking-ui-or-selection");
      return;
    }
    const previousIntent = pageSwipe.intent;
    pageSwipe.intent = readerSwipeIntent(pageSwipe, event.clientX, event.clientY, event.timeStamp || Date.now(),
      reason => traceGesture("GESTURE_REJECTED", reason));
    if (pageSwipe.intent === "horizontal" && previousIntent !== "horizontal") traceGesture("GESTURE_ACCEPTED", "horizontal-intent");
    if (pageSwipe.intent === "horizontal") {
      cancelChromeTap();
      if (event.cancelable) event.preventDefault();
    }
  }, { passive: false });
  const onPointerUp = event => {
    if (event.pointerType !== "touch") return;
    traceGesture("POINTER_UP");
    activeTouchPointers.delete(event.pointerId);
    const gesture = pageSwipe;
    pageSwipe = null;
    if (!gesture || gesture.pointerId !== event.pointerId || activeTouchPointers.size
      || hasActiveReaderSelection(root.ownerDocument)) return;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 12) suppressGestureClick();
    gesture.intent = readerSwipeIntent(gesture, event.clientX, event.clientY, event.timeStamp || Date.now(),
      reason => traceGesture("GESTURE_REJECTED", reason));
    if (gesture.intent !== "horizontal") {
      if (gesture.intent === "pending") traceGesture("GESTURE_REJECTED", "pending-release");
      return;
    }
    const state = store.getState();
    if (state?.activeScreen !== R3_ROUTES.READER || state.openOverlay || state.reader?.vocabularyBubble
      || state.reader?.readingLayout !== "page" || state.reader?.status !== "ready"
      || gesture.surface.isConnected === false || gesture.bookId !== state.activeBookId
      || gesture.chapterId !== state.activeChapterId) { traceGesture("GESTURE_REJECTED", "context-changed"); return; }
    const direction = getReaderPageSwipeDirection({
      startX: gesture.startX,
      startY: gesture.startY,
      endX: event.clientX,
      endY: event.clientY,
      viewportWidth: gesture.surface.clientWidth || root.ownerDocument?.defaultView?.innerWidth
    });
    if (!direction) { traceGesture("GESTURE_REJECTED", "distance"); return; }
    traceGesture("GESTURE_ACCEPTED", "page-command");
    suppressGestureClick();
    root.__readerLayout?.turn(direction);
  };
  const onPointerCancel = event => {
    if (event.pointerType !== "touch") return;
    traceGesture("POINTER_CANCEL", "browser-cancel");
    if (pageSwipe?.pointerId === event.pointerId) traceGesture("GESTURE_REJECTED", "browser-cancel");
    activeTouchPointers.delete(event.pointerId);
    if (pageSwipe?.pointerId === event.pointerId || activeTouchPointers.size > 1) pageSwipe = null;
  };
  // Stable capture listeners see terminal events retargeted outside the replaced
  // shell. Root listeners remain as a fallback for minimal mounted-test DOMs.
  const eventWindow = root.ownerDocument?.defaultView;
  const seenTerminals = new WeakSet();
  const once = handler => event => { if (!seenTerminals.has(event)) { seenTerminals.add(event); handler(event); } };
  const pointerUp = once(onPointerUp), pointerCancel = once(onPointerCancel);
  root.addEventListener("pointerup", pointerUp, { passive: true });
  root.addEventListener("pointercancel", pointerCancel, { passive: true });
  eventWindow?.addEventListener?.("pointerup", pointerUp, { capture: true, passive: true });
  eventWindow?.addEventListener?.("pointercancel", pointerCancel, { capture: true, passive: true });
  const resetOnLifecycle = () => resetTouchSession("lifecycle");
  const resetOnVisibility = () => { if (root.ownerDocument.visibilityState === "hidden") resetOnLifecycle(); };
  eventWindow?.addEventListener?.("pagehide", resetOnLifecycle);
  eventWindow?.addEventListener?.("blur", resetOnLifecycle);
  root.ownerDocument?.addEventListener?.("visibilitychange", resetOnVisibility);
  root.__unbindReaderGestures = () => {
    eventWindow?.removeEventListener?.("pointerup", pointerUp, true);
    eventWindow?.removeEventListener?.("pointercancel", pointerCancel, true);
    eventWindow?.removeEventListener?.("pagehide", resetOnLifecycle);
    eventWindow?.removeEventListener?.("blur", resetOnLifecycle);
    root.ownerDocument?.removeEventListener?.("visibilitychange", resetOnVisibility);
    resetOnLifecycle();
  };
  root.addEventListener("pointerup", scheduleReaderSelectionSync, { passive: true });
  root.addEventListener("keyup", scheduleReaderSelectionSync);
  root.addEventListener("click", (event) => {
    if (suppressReaderClick && findAncestorByClass(event.target, root, "r3-reader-scroll")) {
      suppressReaderClick = false;
      return;
    }
    cancelChromeTap();
    const hit = event.target.closest?.(".r3-reader-content .vocab-hit[data-vocab-term]");
    if (hit) {
      const box = hit.getBoundingClientRect();
      controller.toggleVocabularyBubble?.(hit.dataset.vocabTerm, { x: box.left, y: box.bottom });
      return;
    }
    const actionElement = findActionElement(event.target, root);
    const action = actionElement?.dataset?.action;

    if (action === "set-ui-language") {
      controller.setUiLanguage?.(actionElement.dataset.uiLanguage);
      return;
    }

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
        const underline = capturePendingSelectionUnderline(root, root.ownerDocument);
        controller.setReaderVocabularyState?.("learning", term, readerSelectionCapture);
        underline?.();
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
      const beforeChapter = store.getState().activeChapterId;
      const row = store.getState().reader.vocabularyPreview?.rows?.find(item => normalizeTerm(item.term) === normalizeTerm(term));
      const targetChapter = row?.occurrences?.find(item => Number(item.occurrenceIndex) === occurrenceIndex)?.chapterId;
      if (controller.goToVocabularyPreviewOccurrence?.(term, occurrenceIndex)) {
        if (!targetChapter || targetChapter === beforeChapter) scrollToVocabularyHit(root, term, occurrenceIndex);
      }
      return;
    }
    if (findAncestorByClass(event.target, root, "r3-vocabulary-bubble")) {
      controller.closeVocabularyBubble?.();
      return;
    }
    if (!action) {
      if (isReaderChromeTap(event, root)) {
        // Confirm a single tap, allowing native double-click/selection to cancel it.
        // This is gesture disambiguation, never an idle auto-hide timer.
        pendingChromeTap = chromeTimers.setTimeout(() => {
          pendingChromeTap = null;
          if (event.target.isConnected !== false && isReaderChromeTap(event, root)) controller.toggleReaderChrome?.();
        }, 250);
      }
      controller.closeVocabularyBubble?.();
      return;
    }
    controller.closeVocabularyBubble?.();

    if (action === "settings-return") {
      if (!root.__readerHistory?.backFromSettings()) controller.returnFromSettings?.();
      return;
    }

    if (action === "navigate") {
      const route = actionElement.dataset.route;
      if ([
        R3_ROUTES.HOME,
        R3_ROUTES.LIBRARY,
        R3_ROUTES.VOCABULARY,
        R3_ROUTES.SETTINGS_HOME,
        R3_ROUTES.SETTINGS_LANGUAGE
      ].includes(route)) {
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

    if (action === "open-guide") {
      controller.openGuide?.();
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

    if (action === "reader-progress") {
      controller.openReaderProgress?.();
      return;
    }
    if (action === "reader-return-position") {
      controller.returnFromPassageDetour?.();
      return;
    }
    if (action === "reader-continue-here") {
      controller.continueFromPassageDetour?.();
      return;
    }
    if (action === "reader-mode") {
      controller.openReaderMode?.();
      return;
    }
    if (action === "reader-appearance") {
      controller.openReaderAppearance?.();
      return;
    }
    if (action === "reader-select-mode") {
      controller.setReaderMode?.(actionElement.dataset.mode);
      return;
    }
    if (action === "reader-select-layout") {
      controller.setReadingLayout?.(actionElement.dataset.layout);
      return;
    }
    if (action === "reader-set-appearance") {
      const key = actionElement.dataset.appearanceKey;
      const value = actionElement.dataset.appearanceValue;
      if (key && value) controller.setReaderAppearance?.({ [key]: value });
      return;
    }
    if (action === "vocabulary-preview-open") {
      controller.openVocabularyPreview?.(() => collectVocabularyOccurrences(root, store.getState().activeChapterId), { defer: true });
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
    if (action === "reader-toggle-bookmark") {
      controller.toggleReaderBookmark?.();
      return;
    }
    if (action === "reader-seek-bookmark") {
      controller.seekReaderBookmark?.(actionElement.dataset.bookmarkId);
      return;
    }
    if (action === "reader-delete-bookmark") {
      controller.deleteReaderBookmark?.(actionElement.dataset.bookmarkId);
      return;
    }

    if (action === "reader-close-contents" || action === "reader-close-surface") {
      controller.closeOverlay();
      return;
    }

    if (action === "reader-back") {
      if (!root.__readerHistory?.back()) controller.exitReader();
    }
  });

  root.addEventListener("input", event => {
    if (event.target.dataset?.action === "reader-progress-page") controller.seekReaderSourceFraction?.(Number(event.target.value) / 1000);
  });
  root.addEventListener("change", (event) => {
    const actionElement = findActionElement(event.target, root);
    if (actionElement?.dataset?.action === "reader-progress-page") {
      controller.seekReaderSourceFraction?.(Number(actionElement.value) / 1000);
      return;
    }
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
              controller.setVocabularyFeedback(t("r3.vocabulary.feedback.restoreFailed"), "error");
            }
          })
          .catch(() => controller.setVocabularyFeedback(
            t("r3.vocabulary.feedback.restoreFailed"),
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

    if (root.__readerLayout) root.__readerLayout.onScroll();
    else controller.recordReaderScroll?.(readScrollMetrics(event.target));
    controller.closeVocabularyBubble?.();
  }, true);

  root.addEventListener("keydown", event => {
    if (classListContains(event.target, "r3-reader-scroll")
      && event.target.dataset?.layout === "page"
      && ["ArrowLeft", "ArrowRight", "PageUp", "PageDown"].includes(event.key)
      && root.ownerDocument?.getSelection?.()?.isCollapsed !== false) {
      event.preventDefault();
      root.__readerLayout?.turn(["ArrowRight", "PageDown"].includes(event.key) ? 1 : -1);
      return;
    }
    const surface = root.querySelector?.(".r3-reader-contents, .r3-reader-sheet");
    if (event.key === "Tab" && surface) {
      const focusable = [...surface.querySelectorAll("button:not(:disabled), input:not(:disabled), [tabindex='0']")];
      const first = focusable[0];
      const last = focusable.at(-1);
      const active = root.ownerDocument?.activeElement;
      if ((event.shiftKey && active === first) || (!event.shiftKey && active === last) || !surface.contains(active)) {
        event.preventDefault();
        focusWithoutScrolling(event.shiftKey ? last : first);
      }
    }
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
    controller.closeOverlay?.();
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
    waitForReaderTurn: () => root.__readerLayout?.waitForTurn(),
    collectVocabularyOccurrences: () => collectVocabularyOccurrences(root, store.getState().activeChapterId)
  });
  root.__readerInteractionTrace = bindReaderInteractionTrace(root, store);
  const unsubscribe = mountAppShell(root, store, documentRef, controller, {
    toastTimers: options.toastTimers,
    toastDurationMs: options.toastDurationMs,
    errorToastDurationMs: options.errorToastDurationMs
  });
  bindAppShellEvents(root, store, controller, options.browserEffects || createBrowserEffects(documentRef));
  bindPageLifecycleEvents(documentRef, controller);
  root.__readerHistory = bindReaderHistory(documentRef.defaultView, store, controller,
    root.__readerInteractionTrace?.record);
  const app = {
    root,
    store,
    controller,
    unsubscribe() {
      unsubscribe();
      root.__unbindReaderGestures?.();
      root.__readerInteractionTrace?.destroy();
      root.__readerHistory?.destroy();
    }
  };

  root.__r3App = app;
  await controller.initialize();
  await root.__readerHistory?.restoreInitial();
  return app;
}

export function autoBootstrapR3App(documentRef = globalThis.document) {
  if (autoBootstrapScheduled || !documentRef?.body) {
    return;
  }

  autoBootstrapScheduled = true;
  const start = () => {
    // Register from the R3 entry too; offline reload must retain this shell.
    documentRef.defaultView?.navigator?.serviceWorker?.register(new URL("../sw.js", import.meta.url))
      .catch(error => console.warn("R3 offline cache registration failed.", error));
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
