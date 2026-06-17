import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../pwa-reader/navigationEngine.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {
  createChapterLabel,
  formatChapterProgress,
  getAdjacentChapterIndex,
  getChapterIndex,
  normalizeChapterList
} = await import(moduleUrl);

assert.equal(
  createChapterLabel({}, 0, ""),
  "Preface",
  "uses Preface fallback for a missing first title"
);

assert.equal(
  createChapterLabel({}, 1, ""),
  "Chapter 1",
  "uses Chapter 1 fallback after front matter"
);

assert.equal(
  createChapterLabel({ href: "Text/preface.xhtml" }, 0, ""),
  "Preface",
  "detects likely preface/front matter"
);

assert.equal(
  createChapterLabel({ href: "Text/title_page.xhtml" }, 0, ""),
  "Title Page",
  "detects likely title page/front matter"
);

assert.equal(
  createChapterLabel({ href: "Text/chapter_003.xhtml" }, 4, ""),
  "Chapter 3",
  "uses a chapter number from the spine file name when available"
);

const chapters = normalizeChapterList([
  { id: "preface", title: "", href: "preface.xhtml" },
  { id: "chapter-1", title: "First Chapter" },
  { id: "chapter-2", title: "" }
]);

assert.equal(chapters[0].title, "Preface", "normalizes blank title to front matter label");
assert.equal(chapters[2].title, "Chapter 2", "normalizes blank title to chapter fallback label");
assert.equal(getChapterIndex(chapters, "chapter-1"), 1, "finds selected chapter index");

assert.equal(getAdjacentChapterIndex(0, chapters.length, "previous"), -1, "previous disabled on first chapter");
assert.equal(getAdjacentChapterIndex(0, chapters.length, "next"), 1, "next works from first chapter");
assert.equal(getAdjacentChapterIndex(2, chapters.length, "next"), -1, "next disabled on last chapter");
assert.equal(getAdjacentChapterIndex(2, chapters.length, "previous"), 1, "previous works from last chapter");

assert.equal(
  formatChapterProgress(chapters, 0),
  "Preface · 1 / 3",
  "formats progress with title and current count"
);

assert.equal(
  formatChapterProgress([], -1),
  "No chapter loaded",
  "formats empty progress state"
);

console.log("navigationEngine tests passed");
