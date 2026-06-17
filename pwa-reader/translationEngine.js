// Translation is only a boundary in v2 skeleton. Provider calls, batching,
// caching, and protected-term enforcement belong behind this module later.
function escapeHtml(value) {
  const template = document.createElement("template");
  template.textContent = value ?? "";
  return template.innerHTML;
}

export async function loadProtectedTerms(path = "../data/protected_terms.json") {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load protected terms: ${response.status}`);
  }

  return response.json();
}

export function prepareTranslationRequest(chapter, protectedTerms = []) {
  return {
    chapterId: chapter.id,
    title: chapter.title,
    sourceHtml: chapter.originalHtml,
    sourceText: chapter.plainText,
    protectedTerms: protectedTerms.filter((term) => term.preserveInTranslation)
  };
}

export async function translateChapter() {
  return {
    status: "not_implemented",
    translatedHtml: null
  };
}

export function createChinesePlaceholder(chapter, protectedTerms = []) {
  const protectedTermList = protectedTerms
    .filter((term) => term.preserveInTranslation)
    .map((term) => term.term)
    .slice(0, 8)
    .join(", ");

  return `
    <section class="placeholder-panel">
      <h2>${escapeHtml(chapter.title)} - Chinese Reading Mode</h2>
      <p>Chinese translation is not implemented yet.</p>
      <p>Future translation should preserve protected terms such as: ${escapeHtml(protectedTermList || "none loaded")}.</p>
    </section>
  `;
}

export function createClozePlaceholder(chapter) {
  return `
    <section class="placeholder-panel">
      <h2>${escapeHtml(chapter.title)} - Mixed Mode</h2>
      <p>Mixed Mode is not implemented yet.</p>
      <p>Future output will keep important English vocabulary inside mostly Chinese context.</p>
    </section>
  `;
}
