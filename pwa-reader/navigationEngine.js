const FRONT_MATTER_LABELS = [
  { pattern: /preface|foreword|introduction/, label: "Preface" },
  { pattern: /title[\s_-]*page|cover|copyright/, label: "Title Page" },
  { pattern: /toc|contents|table[\s_-]*of[\s_-]*contents/, label: "Contents" },
  { pattern: /prologue/, label: "Prologue" },
  { pattern: /epilogue/, label: "Epilogue" },
  { pattern: /dedication/, label: "Dedication" }
];

function cleanTitle(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function looksBlankTitle(value) {
  const title = cleanTitle(value).toLowerCase();
  return !title || title === "undefined" || title === "null";
}

function sectionSearchText(section = {}) {
  return [
    section.label,
    section.title,
    section.idref,
    section.href,
    section.url
  ].filter(Boolean).join(" ").toLowerCase();
}

function chapterNumberFromSection(section = {}) {
  const text = sectionSearchText(section);
  const match = text.match(/(?:chapter|chap|ch|c)[\s_-]*0*(\d{1,4})\b/) || text.match(/\b0*(\d{1,4})\.(?:x?html?|xml)\b/);
  return match ? Number(match[1]) : null;
}

export function createChapterLabel(section = {}, index = 0, preferredTitle = "") {
  const preferred = cleanTitle(preferredTitle);

  if (!looksBlankTitle(preferred)) {
    return preferred;
  }

  const text = sectionSearchText(section);

  for (const item of FRONT_MATTER_LABELS) {
    if (item.pattern.test(text)) {
      return item.label;
    }
  }

  const chapterNumber = chapterNumberFromSection(section);

  if (chapterNumber !== null && chapterNumber > 0) {
    return `Chapter ${chapterNumber}`;
  }

  if (index === 0) {
    return "Preface";
  }

  return `Chapter ${index}`;
}

export function normalizeChapterList(chapters = []) {
  return chapters.map((chapter, index) => ({
    ...chapter,
    title: createChapterLabel(chapter, index, chapter.title)
  }));
}

export function getChapterIndex(chapters = [], chapterId) {
  if (!chapters.length || !chapterId) {
    return -1;
  }

  return chapters.findIndex((chapter) => chapter.id === chapterId);
}

export function clampChapterIndex(index, total) {
  if (total <= 0) {
    return -1;
  }

  return Math.min(Math.max(index, 0), total - 1);
}

export function getAdjacentChapterIndex(currentIndex, total, direction) {
  if (total <= 0 || currentIndex < 0 || currentIndex >= total) {
    return -1;
  }

  if (direction === "previous") {
    return currentIndex === 0 ? -1 : currentIndex - 1;
  }

  if (direction === "next") {
    return currentIndex === total - 1 ? -1 : currentIndex + 1;
  }

  return -1;
}

export function formatChapterProgress(chapters = [], currentIndex = -1) {
  const total = chapters.length;

  if (!total || currentIndex < 0 || currentIndex >= total) {
    return "No chapter loaded";
  }

  const title = createChapterLabel(chapters[currentIndex], currentIndex, chapters[currentIndex].title);
  return `${title} · ${currentIndex + 1} / ${total}`;
}
