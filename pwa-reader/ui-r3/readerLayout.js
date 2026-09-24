import { R3_ROUTES } from "./routes.js";

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

export function measureChapterPages(content, step) {
  const source = sourceUnits(content);
  const count = Math.max(1, Math.ceil((content.scrollWidth + 48 - 1) / step));
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
  let chapters = [];
  let indexKey = "";
  let generation = 0;
  let suppressScroll = false;
  let restoreFrame = null;
  let resizeTimer = null;
  let observer = null;
  let dimensions = "";
  let lastPagination = "";
  const metrics = () => ({ scrollTop: scroll?.scrollTop || 0,
    scrollHeight: scroll?.scrollHeight || 0, clientHeight: scroll?.clientHeight || 0 });
  const step = () => (content?.clientWidth || 0) + 48;

  function publish(status = chapters.length ? "ready" : "loading") {
    let pageIndex = 0;
    for (const chapter of chapters) {
      if (chapter.id === chapterId) { pageIndex += pageForOffset(chapter.pages, position?.textOffset || 0); break; }
      pageIndex += chapter.pages.length;
    }
    const pagination = { status, pageIndex, pageCount: chapters.reduce((sum, chapter) => sum + chapter.pages.length, 0) };
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
    const source = sourceUnits(content);
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

  async function buildIndex(key) {
    const token = ++generation;
    chapters = [];
    publish("loading");
    const measure = documentRef.createElement("div");
    measure.className = "r3-reader-measure r3-reader-scroll";
    measure.dataset.layout = "page";
    measure.setAttribute("aria-hidden", "true");
    measure.inert = true;
    measure.style.width = `${scroll.clientWidth}px`;
    measure.style.height = `${scroll.clientHeight}px`;
    const article = documentRef.createElement("section");
    article.className = "r3-reader-article";
    const body = documentRef.createElement("div");
    body.className = "r3-reader-content";
    article.appendChild(body);
    measure.appendChild(article);
    documentRef.body.appendChild(measure);
    const measured = [];
    try {
      await documentRef.fonts?.ready;
      for await (const chapter of controller.getPaginationChapters()) {
        if (token !== generation || key !== indexKey) return;
        body.innerHTML = chapter.html;
        await Promise.all([...body.querySelectorAll("img")].map(img => img.decode?.().catch(() => {}) ));
        if (token !== generation) return;
        measured.push({ id: chapter.id, index: chapter.index, pages: measureChapterPages(body, body.clientWidth + 48) });
        // Yield between chapters; imported books must not lock input while indexing.
        await new Promise(resolve => windowRef.setTimeout(resolve, 0));
      }
      if (token !== generation || key !== indexKey) return;
      if (measured.length !== store.getState().reader.chapterCount) throw new Error("Incomplete page index");
      chapters = measured;
      publish();
    } catch (error) {
      if (token === generation) publish("error");
    } finally {
      measure.remove();
    }
  }

  function attach(state, preservedPixels = null) {
    const nextScroll = root.querySelector(".r3-reader-scroll");
    if (state.activeScreen !== R3_ROUTES.READER || !nextScroll) {
      generation += 1; indexKey = ""; bookId = null; position = null;
      scroll = null; content = null; observer?.disconnect(); return;
    }
    if (state.reader.status !== "ready") return;
    if (bookId !== state.activeBookId) {
      position = null; chapterId = null; requestSequence = null;
      bookId = state.activeBookId;
    }
    scroll = nextScroll;
    content = scroll.querySelector(".r3-reader-content");
    layout = state.reader.readingLayout || "page";
    const sameChapter = chapterId === state.activeChapterId;
    chapterId = state.activeChapterId;
    const request = state.reader.positionRequest;
    const freshRequest = request && request.sequence !== requestSequence;
    requestSequence = request?.sequence;
    localPages = layout === "page" ? measureChapterPages(content, step()) : [0];
    if (layout === "page") {
      // Overflowing CSS columns omit the trailing padding from scrollWidth in
      // Chromium. Explicitly include it so the last page aligns like every other.
      let end = scroll.querySelector(".r3-reader-page-end");
      if (!end) { end = documentRef.createElement("span"); end.className = "r3-reader-page-end"; scroll.appendChild(end); }
      end.setAttribute("aria-hidden", "true");
      end.style.left = `${localPages.length * step() - 1}px`;
    }
    let target = freshRequest ? request.position : sameChapter ? position : null;
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
    const key = `${bookId}:${state.activeReadingMode}:${size}`;
    dimensions = size;
    if (key !== indexKey) { indexKey = key; void buildIndex(key); }
    else publish();
    observer?.disconnect();
    if (windowRef.ResizeObserver) {
      observer = new windowRef.ResizeObserver(() => {
        if (!scroll || `${scroll.clientWidth}:${scroll.clientHeight}` === dimensions) return;
        windowRef.clearTimeout(resizeTimer);
        resizeTimer = windowRef.setTimeout(() => attach(store.getState()), 80);
      });
      observer.observe(scroll);
    }
  }

  function onScroll() {
    if (suppressScroll || !content?.isConnected || store.getState().reader.status !== "ready") return;
    const offset = layout === "page" ? localPages[Math.max(0, Math.min(localPages.length - 1, Math.round(scroll.scrollLeft / step())))]
      : firstOffset(content, sourceUnits(content), rect => rect.bottom > scroll.getBoundingClientRect().top + 24);
    position = { chapterId, textOffset: offset || 0 };
    controller.recordReaderPosition(position, metrics());
    publish();
  }

  function seek(page) {
    const target = locateBookPage(chapters, page);
    if (target) return controller.seekReaderPosition(target.chapterIndex, target.position);
  }

  const onAssetsChanged = event => {
    if (!content?.isConnected || (event.type === "load" && !content.contains(event.target))) return;
    indexKey = "";
    attach(store.getState());
  };
  root.addEventListener("load", onAssetsChanged, true);
  documentRef.fonts?.addEventListener?.("loadingdone", onAssetsChanged);

  return { attach, onScroll, seek,
    turn(direction) { return seek((store.getState().reader.pagination?.pageIndex || 0) + direction); },
    showHit(hit) {
      if (layout !== "page" || !scroll) return false;
      const offset = hit.getBoundingClientRect().left - content.getBoundingClientRect().left;
      scroll.scrollLeft = Math.floor((offset + 1) / step()) * step();
      suppressScroll = false;
      onScroll(); return true;
    },
    destroy() {
      generation += 1; observer?.disconnect(); windowRef.clearTimeout(resizeTimer);
      root.removeEventListener("load", onAssetsChanged, true);
      documentRef.fonts?.removeEventListener?.("loadingdone", onAssetsChanged);
    }
  };
}
