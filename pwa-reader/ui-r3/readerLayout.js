import { createPageTurnTransition } from "./readerPageTurn.js";
import { R3_ROUTES } from "./routes.js";
import { applyReaderAppearanceDataset, resolveReaderAppearance } from "../readerAppearance.js";

export const READER_PAGE_SWIPE = Object.freeze({
  minimumDistance: 48,
  maximumDistance: 72,
  viewportRatio: 0.12,
  dominanceRatio: 1.35
});

// Ownership is delayed until 12px of horizontal intent. Once rejected, a
// gesture cannot turn into a page swipe later (selection/scroll/long press).
export function readerSwipeIntent(gesture, x, y, time) {
  if (gesture.intent === "rejected" || gesture.startX <= 24
    || gesture.startX >= gesture.viewportWidth - 24) return "rejected";
  const dx = Math.abs(x - gesture.startX), dy = Math.abs(y - gesture.startY);
  if (gesture.intent === "horizontal") return dy > Math.max(24, dx / 1.35) ? "rejected" : "horizontal";
  if (time - gesture.startTime >= 350) return "rejected";
  if (dy >= 12 && dy >= dx) return "rejected";
  return dx >= 12 && dx >= dy * 1.35 ? "horizontal" : "pending";
}

export function getReaderPageSwipeDirection({ startX, startY, endX, endY, viewportWidth }) {
  const coordinates = [startX, startY, endX, endY].map(Number);
  if (!coordinates.every(Number.isFinite)) return 0;
  const [resolvedStartX, resolvedStartY, resolvedEndX, resolvedEndY] = coordinates;
  const horizontal = resolvedEndX - resolvedStartX;
  const vertical = resolvedEndY - resolvedStartY;
  const width = Math.max(0, Number(viewportWidth) || 0);
  const threshold = Math.min(
    READER_PAGE_SWIPE.maximumDistance,
    Math.max(READER_PAGE_SWIPE.minimumDistance, width * READER_PAGE_SWIPE.viewportRatio)
  );
  if (Math.abs(horizontal) < threshold
    || Math.abs(horizontal) < Math.abs(vertical) * READER_PAGE_SWIPE.dominanceRatio) return 0;
  return horizontal < 0 ? 1 : -1;
}

export function getReaderPageStep(contentWidth, columnGap) {
  const width = Math.max(0, Number(contentWidth) || 0);
  const parsedGap = Number.parseFloat(columnGap);
  return width + (Number.isFinite(parsedGap) ? parsedGap : 48);
}

// Pagination is a viewport-derived index. Durable locators address the source text,
// independent of annotation spans, CSS columns, window size and layout direction.
export function pageForOffset(pages, offset) {
  let index = 0;
  for (let i = 1; i < pages.length && pages[i] <= offset; i += 1) index = i;
  return index;
}

export function locateBookPage(chapters, requestedPage) {
  const count = chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0);
  let page = Math.max(0, Math.min(count - 1, Math.round(Number(requestedPage) || 0)));
  for (const chapter of chapters) {
    if (page < chapter.pages.length) return { chapterIndex: chapter.index,
      position: { chapterId: chapter.id, textOffset: chapter.pages[page] } };
    page -= chapter.pages.length;
  }
  return null;
}

// Equal-weight spine sections provide stable source progress without opening other
// bodies. This is a section-based estimate, not a whole-book character/page count.
export function sourceBookProgress(index, count, offset, length) {
  if (count <= 0) return 0;
  const fraction = length > 0 ? Math.max(0, Math.min(1, offset / length)) : 0;
  return Math.max(0, Math.min(1, (index + fraction) / count));
}

function sourceUnits(content) {
  const units = [];
  let length = 0;
  const visit = node => {
    if (node.nodeType === 3) {
      if (node.textContent.length) {
        units.push({ node, start: length, length: node.textContent.length });
        length += node.textContent.length;
      }
    } else if (["IMG", "SVG", "VIDEO", "HR"].includes(node.tagName)) {
      units.push({ node, start: length, length: 1 });
      length += 1;
    } else if (!["SCRIPT", "STYLE"].includes(node.tagName)) {
      for (const child of node.childNodes || []) visit(child);
    }
  };
  visit(content);
  return { units, length };
}

function rectAt(content, source, offset) {
  const unit = source.units.find(item => item.start + item.length > offset) || source.units.at(-1);
  if (!unit) return content.getBoundingClientRect();
  if (unit.node.nodeType !== 3) return unit.node.getBoundingClientRect();
  const range = content.ownerDocument.createRange();
  const start = Math.max(0, Math.min(unit.length - 1, offset - unit.start));
  range.setStart(unit.node, start);
  range.setEnd(unit.node, start + 1);
  const rect = range.getClientRects()[0];
  if (rect) return rect;
  // Collapsed structural whitespace has no box. Its parent's bounding box can
  // span every column, so use the next visible source unit, not that union box.
  const index = source.units.indexOf(unit);
  for (let i = index + 1; i < source.units.length; i += 1) {
    const next = source.units[i];
    if (next.node.nodeType !== 3) return next.node.getBoundingClientRect();
    range.selectNodeContents(next.node);
    const nextRect = range.getClientRects()[0];
    if (nextRect) return nextRect;
  }
  for (let i = index - 1; i >= 0; i -= 1) {
    const previous = source.units[i];
    if (previous.node.nodeType !== 3) return previous.node.getBoundingClientRect();
    range.selectNodeContents(previous.node);
    const previousRects = range.getClientRects();
    if (previousRects.length) return previousRects[previousRects.length - 1];
  }
  return content.getBoundingClientRect();
}

function firstOffset(content, source, predicate) {
  let low = 0;
  let high = Math.max(0, source.length - 1);
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (predicate(rectAt(content, source, mid))) high = mid;
    else low = mid + 1;
  }
  return low;
}

export function measureChapterPages(content, step, columnGap = 48) {
  const source = sourceUnits(content);
  const count = Math.max(1, Math.ceil((content.scrollWidth + columnGap - 1) / step));
  const left = content.getBoundingClientRect().left;
  const pages = [0];
  for (let page = 1; page < count; page += 1) {
    pages.push(firstOffset(content, source, rect => rect.left >= left + page * step - 1));
  }
  return pages;
}

export function createReaderLayout(root, store, controller) {
  const documentRef = root.ownerDocument;
  const windowRef = documentRef?.defaultView;
  // Unit-test DOMs without geometry keep the existing scroll restoration path.
  if (!documentRef?.createRange || !windowRef?.requestAnimationFrame) return null;
  let scroll = null;
  let content = null;
  let position = null;
  let layout = "page";
  let chapterId = null;
  let bookId = null;
  let requestSequence = null;
  let localPages = [0];
  const transition = createPageTurnTransition(windowRef);
  let source = null;
  let changingChapter = false;
  let suppressScroll = false;
  let restoreFrame = null;
  let resizeTimer = null;
  let observer = null;
  let dimensions = "";
  let lastPagination = "";
  const metrics = () => ({ scrollTop: scroll?.scrollTop || 0,
    scrollHeight: scroll?.scrollHeight || 0, clientHeight: scroll?.clientHeight || 0 });
  const columnGap = element => Number.parseFloat(windowRef.getComputedStyle?.(element)?.columnGap) || 48;
  const step = () => getReaderPageStep(content?.clientWidth, columnGap(content));

  function publish() {
    const state = store.getState();
    const pagination = {
      status: state.reader.effectiveMode === null ? "unavailable" : "ready",
      scope: "chapter",
      pageIndex: pageForOffset(localPages, position?.textOffset || 0),
      pageCount: localPages.length,
      bookProgress: sourceBookProgress(state.reader.chapterIndex, state.reader.chapterCount,
        position?.textOffset || 0, source?.length || 0)
    };
    const signature = JSON.stringify(pagination);
    if (signature !== lastPagination) {
      lastPagination = signature;
      controller.setReaderPagination(pagination);
    }
  }

  function restore(target, pixels = null) {
    if (!content || !scroll || !target) return;
    suppressScroll = true;
    if (restoreFrame !== null) windowRef.cancelAnimationFrame(restoreFrame);
    const offset = Math.min(Math.max(0, target.textOffset || 0), Math.max(0, source.length - 1));
    position = { chapterId, textOffset: offset };
    if (pixels) {
      scroll.scrollTop = pixels.scrollTop;
      scroll.scrollLeft = pixels.scrollLeft;
    } else if (layout === "page") {
      scroll.scrollLeft = pageForOffset(localPages, offset) * step();
      scroll.scrollTop = 0;
    } else {
      const rect = rectAt(content, source, offset);
      scroll.scrollTop += rect.top - scroll.getBoundingClientRect().top - 24;
      scroll.scrollLeft = 0;
    }
    controller.recordReaderPosition(position, metrics());
    restoreFrame = windowRef.requestAnimationFrame(() => { suppressScroll = false; restoreFrame = null; });
  }

  function attach(state, preservedPixels = null) {
    windowRef.clearTimeout(resizeTimer);
    observer?.disconnect();
    transition.cancel();
    const nextScroll = root.querySelector(".r3-reader-scroll");
    if (state.activeScreen !== R3_ROUTES.READER || !nextScroll) {
      bookId = null; position = null; source = null; lastPagination = "";
      scroll = null; content = null; observer?.disconnect(); return;
    }
    if (state.reader.status !== "ready") return;
    if (bookId !== state.activeBookId) {
      position = null; chapterId = null; requestSequence = null;
      bookId = state.activeBookId;
    }
    scroll = nextScroll;
    content = scroll.querySelector(".r3-reader-content");
    source = state.reader.contentKind === "empty" ? { units: [], length: 0 } : sourceUnits(content);
    layout = state.reader.readingLayout || "page";
    applyReaderAppearanceDataset(scroll, resolveReaderAppearance(state.reader));
    const sameChapter = chapterId === state.activeChapterId;
    chapterId = state.activeChapterId;
    const request = state.reader.positionRequest;
    const freshRequest = request && request.sequence !== requestSequence;
    requestSequence = request?.sequence;
    localPages = layout === "page" ? measureChapterPages(content, step(), columnGap(content)) : [0];
    if (layout === "page") {
      // Overflowing CSS columns omit the trailing padding from scrollWidth in
      // Chromium. Explicitly include it so the last page aligns like every other.
      let end = scroll.querySelector(".r3-reader-page-end");
      if (!end) { end = documentRef.createElement("span"); end.className = "r3-reader-page-end"; scroll.appendChild(end); }
      end.setAttribute("aria-hidden", "true");
      end.style.left = `${localPages.length * step() - 1}px`;
    }
    let target = freshRequest ? request.position : sameChapter ? position : null;
    if (freshRequest && Number.isFinite(request.sourceFraction)) {
      target = { chapterId, textOffset: Math.floor(request.sourceFraction * Math.max(0, source.length - 1)) };
    }
    if (freshRequest && request.edge === "end") target = { chapterId, textOffset: localPages.at(-1) };
    if (!target && freshRequest && request.legacyProgress) {
      // Convert the old vertical ratio once using the actual Scroll layout, then
      // restore that source offset in the requested layout (never ratio -> page).
      scroll.dataset.layout = "scroll";
      scroll.scrollTop = (request.legacyProgress.scrollRatio || 0) * Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      const source = sourceUnits(content);
      target = { chapterId, textOffset: firstOffset(content, source, rect => rect.bottom > scroll.getBoundingClientRect().top + 24) };
      scroll.dataset.layout = layout;
    }
    restore(target || { chapterId, textOffset: 0 }, !freshRequest && sameChapter ? preservedPixels : null);
    const size = `${scroll.clientWidth}:${scroll.clientHeight}`;
    dimensions = size;
    publish();
    observer?.disconnect();
    if (windowRef.ResizeObserver) {
      const observedScroll = scroll;
      observer = new windowRef.ResizeObserver(() => {
        if (scroll !== observedScroll || !observedScroll.isConnected || `${scroll.clientWidth}:${scroll.clientHeight}` === dimensions) return;
        windowRef.clearTimeout(resizeTimer);
        resizeTimer = windowRef.setTimeout(() => attach(store.getState()), 80);
      });
      observer.observe(scroll);
    }
  }

  function onScroll() {
    if (transition.active || suppressScroll || !content?.isConnected || store.getState().reader.status !== "ready") return;
    const offset = layout === "page" ? localPages[Math.max(0, Math.min(localPages.length - 1, Math.round(scroll.scrollLeft / step())))]
      : firstOffset(content, source, rect => rect.bottom > scroll.getBoundingClientRect().top + 24);
    position = { chapterId, textOffset: offset || 0 };
    controller.recordReaderPosition(position, metrics());
    publish();
  }

  function seek(page) {
    if (!content || !scroll || store.getState().reader.effectiveMode === null) return;
    transition.cancel();
    const index = Math.max(0, Math.min(localPages.length - 1, Math.round(Number(page) || 0)));
    restore({ chapterId, textOffset: localPages[index] });
    publish();
  }

  async function turn(direction) {
    const state = store.getState();
    if (!content || layout !== "page" || transition.active || changingChapter
      || state.reader.status !== "ready" || state.reader.effectiveMode === null
      || state.openOverlay || state.reader.vocabularyBubble) return false;
    const next = pageForOffset(localPages, position?.textOffset || 0) + Math.sign(direction);
    const host = scroll;
    const body = content;
    const valid = () => host.isConnected && scroll === host && store.getState().reader.status === "ready";
    const reducedMotion = windowRef.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (next >= 0 && next < localPages.length) {
      const from = host.scrollLeft;
      return transition.run({
        reducedMotion, valid,
        draw: fraction => { host.scrollLeft = from + (next * step() - from) * fraction; },
        rollback: () => { host.scrollLeft = from; },
        commit: () => { restore({ chapterId, textOffset: localPages[next] }); publish(); }
      });
    }
    if (next < 0 ? !state.reader.hasPrevious : !state.reader.hasNext) return false;
    const completed = await transition.run({
      reducedMotion, valid,
      draw: fraction => { body.style.transform = "translateX(" + (-Math.sign(direction) * fraction * 36) + "px)"; body.style.opacity = String(1 - fraction * 0.45); },
      rollback: () => { body.style.transform = ""; body.style.opacity = ""; },
      commit: () => { body.style.transform = ""; body.style.opacity = ""; }
    });
    if (!completed || !valid()) return false;
    changingChapter = true;
    try { await controller.turnReaderChapter(Math.sign(direction)); }
    finally { changingChapter = false; }
    return store.getState().reader.status === "ready";
  }

  const onAssetsChanged = event => {
    if (!content?.isConnected || (event.type === "load" && !content.contains(event.target))) return;
    attach(store.getState());
  };
  root.addEventListener("load", onAssetsChanged, true);
  documentRef.fonts?.addEventListener?.("loadingdone", onAssetsChanged);

  return { attach, onScroll, seek, cancelTurn: () => transition.cancel(),
    waitForTurn: () => transition.whenSettled(),
    turn,
    showHit(hit) {
      if (layout !== "page" || !scroll) return false;
      const offset = hit.getBoundingClientRect().left - content.getBoundingClientRect().left;
      scroll.scrollLeft = Math.floor((offset + 1) / step()) * step();
      suppressScroll = false;
      onScroll(); return true;
    },
    destroy() {
      transition.cancel(); observer?.disconnect(); windowRef.clearTimeout(resizeTimer);
      root.removeEventListener("load", onAssetsChanged, true);
      documentRef.fonts?.removeEventListener?.("loadingdone", onAssetsChanged);
    }
  };
}
