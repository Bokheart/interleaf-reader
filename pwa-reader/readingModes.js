import { resolveGuideChapterContent } from "./guideBook.js";
import { annotateVocabularyHtml, buildVocabularyPreview } from "./vocabEngine.js";
import { createChinesePlaceholder, createClozePlaceholder } from "./translationEngine.js";

// Keep mode names centralized so UI controls, storage, and render logic do not
// drift as the product grows.
export const MODES = {
  ENGLISH_STUDY: "english-study",
  CHINESE: "chinese",
  CLOZE_MIXED: "cloze-mixed"
};

function emptyChapterHtml() {
  return `
    <section class="placeholder-panel">
      <h2>Chapter content is not loaded yet.</h2>
      <p>Import an EPUB and choose a chapter to render it here.</p>
    </section>
  `;
}

function escapeHtml(value) {
  const template = document.createElement("template");
  template.textContent = value ?? "";
  return template.innerHTML;
}

function chapterErrorHtml(chapter) {
  return `
    <section class="placeholder-panel">
      <h2>${escapeHtml(chapter.title || "Chapter")} could not be rendered.</h2>
      <p>${escapeHtml(chapter.renderError || "Please try another chapter or EPUB file.")}</p>
    </section>
  `;
}

export function renderChapterForMode(chapter, mode, options = {}) {
  const vocabularyItems = options.vocabularyItems || [];
  const protectedTerms = options.protectedTerms || [];

  if (!chapter) {
    return {
      html: emptyChapterHtml(),
      vocabularyPreview: []
    };
  }

  if (chapter.renderError) {
    return {
      html: chapterErrorHtml(chapter),
      vocabularyPreview: []
    };
  }

  if (options.isBuiltInGuide) {
    const guideContent = resolveGuideChapterContent(chapter, mode);
    const vocabularyPreview = buildVocabularyPreview(guideContent.plainText, vocabularyItems, {
      limit: options.previewLimit || 20
    });

    if (mode === MODES.ENGLISH_STUDY) {
      return {
        html: annotateVocabularyHtml(guideContent.html || emptyChapterHtml(), vocabularyPreview, {
          maxHighlights: options.maxHighlights || 80,
          maxHighlightsPerTerm: options.maxHighlightsPerTerm || 3
        }),
        vocabularyPreview: chapter.vocabularyPreview || vocabularyPreview
      };
    }

    return {
      html: guideContent.html || emptyChapterHtml(),
      vocabularyPreview: chapter.vocabularyPreview || vocabularyPreview
    };
  }

  if (mode === MODES.CHINESE) {
    return {
      html: createChinesePlaceholder(chapter, protectedTerms),
      vocabularyPreview: chapter.vocabularyPreview || []
    };
  }

  if (mode === MODES.CLOZE_MIXED) {
    return {
      html: createClozePlaceholder(chapter),
      vocabularyPreview: chapter.vocabularyPreview || []
    };
  }

  const vocabularyPreview = buildVocabularyPreview(chapter.plainText, vocabularyItems, {
    limit: options.previewLimit || 20
  });

  return {
    html: annotateVocabularyHtml(chapter.originalHtml || emptyChapterHtml(), vocabularyPreview, {
      maxHighlights: options.maxHighlights || 80,
      maxHighlightsPerTerm: options.maxHighlightsPerTerm || 3
    }),
    vocabularyPreview
  };
}
