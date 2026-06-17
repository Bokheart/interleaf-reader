import { createChapterLabel } from "./navigationEngine.js";

// EPUB loading stays isolated here so the UI and vocabulary code do not depend
// directly on epub.js internals.
function emitDiagnostic(onDiagnostic, update) {
  console.info("[Slash Reader EPUB]", update.step || update.currentStep, update);
  if (typeof onDiagnostic === "function") {
    onDiagnostic(update);
  }
}

function describeCause(error) {
  if (!error) {
    return "";
  }

  const name = error.name || "Error";
  const message = error.message || String(error);
  return `${name}: ${message}`;
}

function createLoadError(step, userMessage, cause = null, details = {}) {
  const causeMessage = describeCause(cause);
  const error = new Error(causeMessage ? `${userMessage} Underlying error: ${causeMessage}` : userMessage);
  error.name = "EpubLoadError";
  error.step = step;
  error.userMessage = userMessage;
  error.details = details;
  error.cause = cause;
  return error;
}

function createBookId(file) {
  const baseName = file.name.replace(/\.epub$/i, "").toLowerCase();
  const safeName = baseName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safeName || "book"}-${file.size}-${file.lastModified || Date.now()}`;
}

function flattenToc(items = [], output = []) {
  for (const item of items) {
    output.push(item);
    if (Array.isArray(item.subitems)) {
      flattenToc(item.subitems, output);
    }
  }

  return output;
}

function hrefWithoutHash(href = "") {
  return href.split("#")[0];
}

function buildTocTitleMap(navigation) {
  const tocItems = flattenToc(navigation?.toc || []);
  const titleMap = new Map();

  for (const item of tocItems) {
    if (!item.href || !item.label) {
      continue;
    }

    titleMap.set(item.href, item.label);
    titleMap.set(hrefWithoutHash(item.href), item.label);
  }

  return titleMap;
}

function getChapterTitle(section, titleMap, index) {
  const candidates = [
    section.href,
    hrefWithoutHash(section.href),
    section.url,
    hrefWithoutHash(section.url)
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (titleMap.has(candidate)) {
      return createChapterLabel(section, index, titleMap.get(candidate));
    }
  }

  return createChapterLabel(section, index, section.label);
}

function createChapterId(section, index, seenIds) {
  const rawId = section.idref || section.href || section.url || `chapter-${index + 1}`;
  const baseId = String(rawId)
    .replace(/[#?].*$/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "") || `chapter-${index + 1}`;
  let id = baseId;
  let suffix = 2;

  while (seenIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  seenIds.add(id);
  return id;
}

export function extractPlainTextFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  template.content.querySelectorAll("script, style, nav").forEach((node) => node.remove());
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

function extractBodyHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "", "text/html");
  return doc.body?.innerHTML || html || "";
}

function serializeRenderedChapter(renderedValue) {
  if (typeof renderedValue === "string") {
    return renderedValue;
  }

  const isDocument =
    typeof Document !== "undefined" && renderedValue instanceof Document;
  const isXmlDocument =
    typeof XMLDocument !== "undefined" && renderedValue instanceof XMLDocument;

  if (isDocument || isXmlDocument) {
    return new XMLSerializer().serializeToString(renderedValue);
  }

  return String(renderedValue || "");
}

async function resolveLoadedValue(loadedValue, fallbackValue, options = {}) {
  const label = options.label || "EPUB section";
  const onDiagnostic = options.onDiagnostic;

  if (!loadedValue) {
    emitDiagnostic(onDiagnostic, {
      step: `${label} unavailable`,
      message: `${label} did not expose a loaded promise.`
    });
    return fallbackValue;
  }

  try {
    const value = await loadedValue;
    emitDiagnostic(onDiagnostic, {
      step: `${label} promise resolved`
    });
    return value;
  } catch (error) {
    console.warn(`${label} could not be loaded.`, error);
    emitDiagnostic(onDiagnostic, {
      step: `${label} failed`,
      errorName: error.name || "Error",
      errorMessage: error.message || String(error)
    });
    return fallbackValue;
  }
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : "";
}

function getZipSignature(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer, 0, Math.min(8, arrayBuffer.byteLength));
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
}

function hasZipSignature(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 4) {
    return false;
  }

  const bytes = new Uint8Array(arrayBuffer, 0, 4);
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

async function inspectZipWithJsZip(arrayBuffer, jsZipFactory, onDiagnostic) {
  if (!jsZipFactory || typeof jsZipFactory.loadAsync !== "function") {
    emitDiagnostic(onDiagnostic, {
      step: "JSZip preflight skipped",
      message: "window.JSZip is not available. epub.js may still include its own ZIP reader."
    });
    return null;
  }

  emitDiagnostic(onDiagnostic, {
    step: "JSZip preflight started"
  });

  let zip;

  try {
    zip = await jsZipFactory.loadAsync(arrayBuffer);
  } catch (error) {
    throw createLoadError(
      "JSZip preflight failed",
      "This file could not be read as a ZIP/EPUB archive.",
      error,
      { signature: getZipSignature(arrayBuffer) }
    );
  }

  const entries = Object.keys(zip.files);
  const hasContainer = entries.some((entry) => entry.toLowerCase() === "meta-inf/container.xml");
  let mimetype = "";

  try {
    const mimetypeFile = zip.file("mimetype");
    mimetype = mimetypeFile ? (await mimetypeFile.async("string")).trim() : "";
  } catch (error) {
    emitDiagnostic(onDiagnostic, {
      step: "EPUB mimetype read warning",
      errorName: error.name || "Error",
      errorMessage: error.message || String(error)
    });
  }

  emitDiagnostic(onDiagnostic, {
    step: "JSZip preflight complete",
    zipEntryCount: entries.length,
    mimetype,
    hasContainer
  });

  if (!hasContainer) {
    throw createLoadError(
      "EPUB structure check failed",
      "This file is a ZIP archive, but it does not look like an EPUB because META-INF/container.xml is missing.",
      null,
      { mimetype, entryCount: entries.length }
    );
  }

  return {
    entryCount: entries.length,
    mimetype,
    hasContainer
  };
}

export async function loadEpubFromFile(file, options = {}) {
  const epubFactory = options.epubFactory || window.ePub;
  const jsZipFactory = options.jsZipFactory || window.JSZip;
  const onDiagnostic = options.onDiagnostic;

  if (!file) {
    throw createLoadError("No file selected", "No EPUB file was provided.");
  }

  emitDiagnostic(onDiagnostic, {
    step: "File selected",
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "(empty or not provided by browser)",
    fileExtension: getFileExtension(file.name) || "(none)"
  });

  if (file.size === 0) {
    throw createLoadError("Rejected empty file", "This EPUB file is empty.");
  }

  if (!file.name.toLowerCase().endsWith(".epub")) {
    throw createLoadError(
      "Rejected file extension",
      `This file is not an EPUB. Expected .epub but got ${getFileExtension(file.name) || "no extension"}.`
    );
  }

  if (!epubFactory) {
    throw createLoadError(
      "epub.js missing",
      "epub.js did not load. Check the CDN script in the browser Network tab or serve a local copy of epub.js."
    );
  }

  emitDiagnostic(onDiagnostic, {
    step: "epub.js available",
    message: "window.ePub is available."
  });

  emitDiagnostic(onDiagnostic, {
    step: jsZipFactory ? "JSZip available" : "JSZip missing",
    message: jsZipFactory
      ? "window.JSZip is available for ZIP preflight."
      : "window.JSZip is missing. epub.js may still include a bundled ZIP reader."
  });

  let arrayBuffer;
  let epubBook;

  emitDiagnostic(onDiagnostic, {
    step: "Reading file as ArrayBuffer"
  });

  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (error) {
    throw createLoadError("ArrayBuffer read failed", "Could not read this EPUB file from the browser.", error);
  }

  emitDiagnostic(onDiagnostic, {
    step: "ArrayBuffer read complete",
    arrayBufferBytes: arrayBuffer.byteLength,
    signature: getZipSignature(arrayBuffer)
  });

  if (!hasZipSignature(arrayBuffer)) {
    throw createLoadError(
      "ZIP signature check failed",
      "This file does not look like an EPUB because it does not start with a ZIP signature.",
      null,
      { signature: getZipSignature(arrayBuffer) }
    );
  }

  await inspectZipWithJsZip(arrayBuffer, jsZipFactory, onDiagnostic);

  emitDiagnostic(onDiagnostic, {
    step: "Creating epub.js Book object"
  });

  try {
    epubBook = epubFactory(arrayBuffer);
  } catch (error) {
    throw createLoadError(
      "epub.js object creation failed",
      "epub.js could not create a book from this file.",
      error
    );
  }

  if (!epubBook || typeof epubBook !== "object") {
    throw createLoadError(
      "epub.js object creation failed",
      "epub.js returned an empty or invalid book object."
    );
  }

  emitDiagnostic(onDiagnostic, {
    step: "epub.js Book object created"
  });

  emitDiagnostic(onDiagnostic, {
    step: "Waiting for epub.js book.ready"
  });

  try {
    if (epubBook.ready && typeof epubBook.ready.then === "function") {
      await epubBook.ready;
    }
  } catch (error) {
    throw createLoadError(
      "epub.js book.ready failed",
      "epub.js could not finish opening this EPUB. It may be invalid, encrypted, or use unsupported EPUB features.",
      error
    );
  }

  emitDiagnostic(onDiagnostic, {
    step: "epub.js book.ready complete"
  });

  emitDiagnostic(onDiagnostic, {
    step: "Loading EPUB metadata"
  });
  const metadata = await resolveLoadedValue(epubBook.loaded?.metadata, {}, {
    label: "EPUB metadata",
    onDiagnostic
  });
  emitDiagnostic(onDiagnostic, {
    step: "EPUB metadata loaded",
    metadataTitle: metadata.title || "",
    metadataAuthor: metadata.creator || ""
  });

  emitDiagnostic(onDiagnostic, {
    step: "Loading EPUB navigation"
  });
  const navigation = await resolveLoadedValue(epubBook.loaded?.navigation, { toc: [] }, {
    label: "EPUB navigation",
    onDiagnostic
  });
  emitDiagnostic(onDiagnostic, {
    step: "EPUB navigation loaded"
  });

  const titleMap = buildTocTitleMap(navigation);
  const spineItems = epubBook.spine?.spineItems || [];

  emitDiagnostic(onDiagnostic, {
    step: "EPUB spine loaded",
    spineCount: spineItems.length
  });

  if (spineItems.length === 0) {
    throw createLoadError(
      "EPUB spine empty",
      "This EPUB loaded, but it did not expose any readable chapter entries."
    );
  }

  const seenChapterIds = new Set();
  const chapters = spineItems.map((section, index) => {
    const title = getChapterTitle(section, titleMap, index);

    return {
      id: createChapterId(section, index, seenChapterIds),
      title,
      order: index + 1,
      href: section.href || "",
      originalHtml: "",
      plainText: "",
      translatedHtml: null,
      clozeHtml: null,
      vocabularyPreview: []
    };
  });

  return {
    handle: epubBook,
    book: {
      id: createBookId(file),
      title: metadata.title || file.name.replace(/\.epub$/i, ""),
      author: metadata.creator || "Unknown author",
      chapters
    }
  };
}

// Chapters are loaded on demand. Later phases can add caching or richer cleanup
// without changing the app-level contract.
export async function loadChapterContent(epubBook, chapter) {
  if (!epubBook || !chapter) {
    throw new Error("Both an EPUB handle and a chapter are required.");
  }

  const section =
    epubBook.spine?.spineItems?.[chapter.order - 1] ||
    epubBook.spine?.get?.(chapter.order - 1);

  if (!section) {
    throw new Error(`Could not find chapter at order ${chapter.order}.`);
  }

  let rendered = "";

  try {
    if (typeof section.render === "function") {
      rendered = await section.render(epubBook.load.bind(epubBook));
    } else if (typeof section.load === "function") {
      rendered = await section.load(epubBook.load.bind(epubBook));
    } else {
      throw new Error("Chapter section has no render method.");
    }
  } catch (error) {
    throw new Error(`Chapter failed to render: ${chapter.title}`);
  }

  const bodyHtml = extractBodyHtml(serializeRenderedChapter(rendered));
  const plainText = extractPlainTextFromHtml(bodyHtml);

  if (!plainText) {
    throw new Error(`Chapter rendered without readable text: ${chapter.title}`);
  }

  return {
    ...chapter,
    originalHtml: bodyHtml,
    plainText,
    renderError: null
  };
}
