import assert from "node:assert/strict";

import { createGuideBook } from "../pwa-reader/guideBook.js";
import { MODES, renderChapterForMode } from "../pwa-reader/readingModes.js";

const expectedTerms = [
  "anxious",
  "reluctant",
  "glance",
  "mutter",
  "tension",
  "figure out",
  "bring up",
  "back off"
];
const vocabularyItems = expectedTerms.map((term) => ({ term, type: "test" }));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

class FakeElement {
  constructor(tagName, attributes = {}) {
    this.tagName = tagName.toLowerCase();
    this.attributes = attributes;
    this.className = "";
    this.dataset = {};
    this.type = "";
    this.textContent = "";
  }

  closest(selectorList) {
    return selectorList.split(",").some((selector) => {
      const normalized = selector.trim().toLowerCase();
      return normalized === this.tagName ||
        (normalized === ".vocab-hit" && this.className.split(/\s+/).includes("vocab-hit")) ||
        (normalized.includes("[lang") && this.attributes.lang);
    }) ? this : null;
  }
}

class FakeTextNode {
  constructor(textContent, parentElement, template) {
    this.textContent = textContent;
    this.parentElement = parentElement;
    this.template = template;
  }

  replaceWith(fragment) {
    this.template.nodes = fragment.children;
  }
}

class FakeFragment {
  constructor() {
    this.children = [];
  }

  append(node) {
    this.children.push(node);
  }
}

class FakeTemplate {
  constructor() {
    this.content = this;
    this.nodes = [];
    this.escapedText = null;
  }

  set textContent(value) {
    this.escapedText = escapeHtml(value);
    this.nodes = [];
  }

  set innerHTML(value) {
    const html = String(value ?? "");
    const lang = html.match(/<section\b[^>]*\blang=["']([^"']+)["']/i)?.[1] || "";
    const parent = new FakeElement("section", { lang });
    const text = html.replace(/<[^>]+>/g, " ");
    this.escapedText = null;
    this.nodes = [new FakeTextNode(text, parent, this)];
  }

  get innerHTML() {
    if (this.escapedText !== null) {
      return this.escapedText;
    }

    return this.nodes.map((node) => {
      if (node instanceof FakeTextNode) {
        return node.textContent;
      }

      return `<button type="${node.type}" class="${node.className}" data-vocab-term="${node.dataset.vocabTerm}">${escapeHtml(node.textContent)}</button>`;
    }).join("");
  }
}

function installAnnotationDom() {
  const previousDocument = globalThis.document;
  const previousNodeFilter = globalThis.NodeFilter;

  globalThis.NodeFilter = {
    SHOW_TEXT: 4,
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2
  };
  globalThis.document = {
    createElement(tagName) {
      return tagName.toLowerCase() === "template" ? new FakeTemplate() : new FakeElement(tagName);
    },
    createTextNode(textContent) {
      return new FakeTextNode(textContent, null, null);
    },
    createDocumentFragment() {
      return new FakeFragment();
    },
    createTreeWalker(root, _showWhat, filter) {
      const accepted = root.nodes.filter((node) => filter.acceptNode(node) === NodeFilter.FILTER_ACCEPT);
      let index = -1;
      return {
        currentNode: null,
        nextNode() {
          index += 1;
          this.currentNode = accepted[index] || null;
          return Boolean(this.currentNode);
        }
      };
    }
  };

  return () => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousNodeFilter === undefined) delete globalThis.NodeFilter;
    else globalThis.NodeFilter = previousNodeFilter;
  };
}

function interactiveTerms(html) {
  return [...html.matchAll(/class="vocab-hit"[^>]*data-vocab-term="([^"]+)"/g)].map((match) => match[1]);
}

const restoreDom = installAnnotationDom();

try {
  const guideChapter = createGuideBook().chapters.find((chapter) => chapter.id === "guide-vocabulary");
  guideChapter.vocabularyPreview = [{ term: "stale-preview-term" }];

  for (const mode of [MODES.ENGLISH_STUDY, MODES.CHINESE, MODES.CLOZE_MIXED]) {
    const rendered = renderChapterForMode(guideChapter, mode, {
      isBuiltInGuide: true,
      vocabularyItems
    });
    const hitTerms = interactiveTerms(rendered.html);

    assert.deepEqual(hitTerms, expectedTerms, `${mode} Guide generates interactive vocabulary markup`);
    assert.deepEqual(
      rendered.vocabularyPreview.map((item) => item.term),
      hitTerms,
      `${mode} Guide Preview and body annotations use the same term data`
    );
  }

  const importedChapter = {
    id: "imported-chapter",
    title: "Imported chapter",
    originalHtml: "<section><p>anxious</p></section>",
    plainText: "anxious"
  };
  const importedEnglish = renderChapterForMode(importedChapter, MODES.ENGLISH_STUDY, { vocabularyItems });
  const importedChinese = renderChapterForMode(importedChapter, MODES.CHINESE, { vocabularyItems });
  const importedMixed = renderChapterForMode(importedChapter, MODES.CLOZE_MIXED, { vocabularyItems });

  assert.deepEqual(interactiveTerms(importedEnglish.html), ["anxious"], "Imported English Study annotation remains enabled");
  assert.match(importedChinese.html, /placeholder-panel[\s\S]*Chinese Reading Mode/i, "Imported Chinese mode remains a placeholder");
  assert.match(importedMixed.html, /placeholder-panel[\s\S]*Mixed Mode/i, "Imported Mixed mode remains a placeholder");
  assert.doesNotMatch(importedChinese.html, /vocab-hit/, "Imported Chinese placeholder is not vocabulary-annotated");
  assert.doesNotMatch(importedMixed.html, /vocab-hit/, "Imported Mixed placeholder is not vocabulary-annotated");
} finally {
  restoreDom();
}

console.log("readingModes tests passed");
