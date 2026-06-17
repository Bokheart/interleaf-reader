const DEFAULT_VOCAB_PATHS = [
  "../data/vocabulary.json",
  "../data/slang_idioms.json"
];

const DEFAULT_PREVIEW_LIMIT = 20;
const DEFAULT_MAX_HIGHLIGHTS = 80;
const DEFAULT_MAX_HIGHLIGHTS_PER_TERM = 3;
const DEFAULT_HIGH_VALUE_TYPES = ["idiom", "phrasal_verb", "slang", "curated_ielts"];

// This module intentionally uses simple matching first. Phase 3 can replace the
// ranking and extraction logic behind these exported functions.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeTerm(term) {
  return String(term || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function termPattern(term) {
  return escapeRegExp(term.trim()).replace(/\s+/g, "\\s+");
}

function createTermRegex(term, flags = "i") {
  return new RegExp(`(^|[^A-Za-z0-9_])(${termPattern(term)})(?=$|[^A-Za-z0-9_])`, flags);
}

function normalizeVocabularyItem(item) {
  return {
    term: String(item.term || "").trim(),
    type: item.type || "unknown",
    level: item.level || "",
    chineseMeaning: item.chineseMeaning || "",
    englishDefinition: item.englishDefinition || "",
    contextMeaning: item.contextMeaning || item.chineseMeaning || "",
    usageNote: item.usageNote || "",
    ieltsUsage: item.ieltsUsage || "",
    exampleSentence: item.exampleSentence || "",
    sourceSentence: item.sourceSentence || "",
    priority: Number.isFinite(item.priority) ? item.priority : 50,
    source: item.source || ""
  };
}

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Could not load ${path}: ${response.status}`);
  }

  return response.json();
}

export async function loadVocabularyData(paths = DEFAULT_VOCAB_PATHS) {
  const groups = await Promise.all(paths.map(fetchJson));
  return groups
    .flat()
    .map(normalizeVocabularyItem)
    .filter((item) => item.term.length > 0);
}

export function createVocabularyIndex(items) {
  const index = new Map();

  for (const item of items) {
    index.set(normalizeTerm(item.term), item);
  }

  return index;
}

function spansOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function findTermSpans(plainText, term) {
  const regex = createTermRegex(term, "gi");
  const spans = [];
  let match = regex.exec(plainText);

  while (match) {
    const prefix = match[1] || "";
    const matchedText = match[2] || "";
    const start = match.index + prefix.length;
    const end = start + matchedText.length;

    spans.push({
      start,
      end,
      text: matchedText
    });

    if (regex.lastIndex === match.index) {
      regex.lastIndex += 1;
    }

    match = regex.exec(plainText);
  }

  return spans;
}

function findSourceSentence(plainText, span) {
  if (!plainText || !span) {
    return "";
  }

  const startTerminators = ".!?\n\r";
  let start = span.start;
  let end = span.end;

  while (start > 0 && !startTerminators.includes(plainText[start - 1])) {
    start -= 1;
  }

  while (end < plainText.length && !startTerminators.includes(plainText[end])) {
    end += 1;
  }

  if (end < plainText.length) {
    end += 1;
  }

  return plainText.slice(start, end).replace(/\s+/g, " ").trim();
}

export function findVocabularyMatches(plainText, vocabularyItems, options = {}) {
  const limit = options.limit || DEFAULT_PREVIEW_LIMIT;
  const text = plainText || "";
  const occupiedSpans = [];
  const seenTerms = new Set();
  const normalizedItems = vocabularyItems
    .map(normalizeVocabularyItem)
    .filter((item) => item.term.length > 0)
    .sort((a, b) => b.term.length - a.term.length);
  const matches = [];

  for (const item of normalizedItems) {
    const key = normalizeTerm(item.term);

    if (seenTerms.has(key)) {
      continue;
    }

    seenTerms.add(key);

    const span = findTermSpans(text, item.term).find((candidate) => {
      return !occupiedSpans.some((occupied) => spansOverlap(candidate, occupied));
    });

    if (!span) {
      continue;
    }

    occupiedSpans.push(span);
    matches.push({
      item: {
        ...item,
        sourceSentence: item.sourceSentence || findSourceSentence(text, span)
      },
      span
    });
  }

  return matches
    .sort((a, b) => {
      if (b.item.priority !== a.item.priority) {
        return b.item.priority - a.item.priority;
      }

      return a.span.start - b.span.start;
    })
    .slice(0, limit);
}

export function buildVocabularyPreview(plainText, vocabularyItems, options = {}) {
  return findVocabularyMatches(plainText, vocabularyItems, options).map((match) => match.item);
}

function normalizeKnownWordSet(words) {
  if (words instanceof Set) {
    return new Set([...words].map(normalizeTerm).filter(Boolean));
  }

  if (Array.isArray(words)) {
    return new Set(words.map(normalizeTerm).filter(Boolean));
  }

  return new Set();
}

function getPreviewItemKey(item = {}) {
  return normalizeTerm(item.term || item.headword || "");
}

function getPreviewItemTypes(item = {}) {
  return [
    item.type,
    item.category,
    item.level,
    item.source
  ].map(normalizeTerm).filter(Boolean);
}

function withPersonalizationMetadata(item, metadata) {
  const safeItem = item && typeof item === "object" ? item : {};

  return {
    ...safeItem,
    personalization: {
      ...(safeItem.personalization || {}),
      ...metadata
    }
  };
}

function normalizeFilteringOptions(options = {}) {
  return {
    hideKnownWords: options.hideKnownWords !== false,
    keepLearningWords: options.keepLearningWords !== false,
    keepHighValueKnownItems: options.keepHighValueKnownItems === true,
    highValueTypes: Array.isArray(options.highValueTypes) && options.highValueTypes.length
      ? options.highValueTypes.map(normalizeTerm).filter(Boolean)
      : DEFAULT_HIGH_VALUE_TYPES,
    maxItems: Number.isInteger(options.maxItems) && options.maxItems >= 0
      ? options.maxItems
      : null
  };
}

function createFilteringContext(personalizationState = {}, options = {}) {
  const normalizedProfile = personalizationState?.normalizedProfile || {};
  const learningWords = normalizeKnownWordSet(normalizedProfile.learningWords);

  return {
    options: normalizeFilteringOptions(options),
    effectiveKnownWords: normalizeKnownWordSet(personalizationState?.effectiveKnownWords),
    learningWords
  };
}

function isHighValuePreviewItem(item, highValueTypes = DEFAULT_HIGH_VALUE_TYPES) {
  const types = getPreviewItemTypes(item);
  return types.some((type) => highValueTypes.includes(type));
}

export function explainVocabularyPreviewFiltering(items = [], personalizationState = {}, options = {}) {
  const sourceItems = Array.isArray(items) ? items : [];
  const context = createFilteringContext(personalizationState, options);
  const visibleItems = [];
  const hiddenItems = [];
  const counts = {
    input: sourceItems.length,
    visible: 0,
    hidden: 0,
    hiddenKnown: 0,
    keptLearning: 0,
    keptHighValue: 0
  };

  for (const item of sourceItems) {
    const itemKey = getPreviewItemKey(item);
    const isKnown = itemKey && context.effectiveKnownWords.has(itemKey);
    const isLearning = itemKey && context.learningWords.has(itemKey);
    const isHighValue = isHighValuePreviewItem(item, context.options.highValueTypes);

    if (isLearning && context.options.keepLearningWords) {
      counts.keptLearning += isKnown ? 1 : 0;
      visibleItems.push(withPersonalizationMetadata(item, {
        hiddenByKnownWords: false,
        boostedByLearningWords: true,
        keptHighValueKnownItem: false,
        reason: "learning-word"
      }));
      continue;
    }

    if (isKnown && context.options.hideKnownWords) {
      if (isHighValue && context.options.keepHighValueKnownItems) {
        counts.keptHighValue += 1;
        visibleItems.push(withPersonalizationMetadata(item, {
          hiddenByKnownWords: false,
          boostedByLearningWords: false,
          keptHighValueKnownItem: true,
          reason: "high-value-known"
        }));
      } else {
        counts.hiddenKnown += 1;
        hiddenItems.push(withPersonalizationMetadata(item, {
          hiddenByKnownWords: true,
          boostedByLearningWords: false,
          keptHighValueKnownItem: false,
          reason: "known-word"
        }));
      }

      continue;
    }

    visibleItems.push(withPersonalizationMetadata(item, {
      hiddenByKnownWords: false,
      boostedByLearningWords: false,
      keptHighValueKnownItem: false,
      reason: "visible"
    }));
  }

  if (context.options.maxItems !== null && visibleItems.length > context.options.maxItems) {
    const overflowItems = visibleItems.splice(context.options.maxItems).map((item) => {
      return withPersonalizationMetadata(item, {
        ...(item.personalization || {}),
        reason: "max-items"
      });
    });

    hiddenItems.push(...overflowItems);
  }

  counts.visible = visibleItems.length;
  counts.hidden = hiddenItems.length;

  return {
    visibleItems,
    hiddenItems,
    counts
  };
}

export function filterVocabularyPreviewItems(items = [], personalizationState = {}, options = {}) {
  return explainVocabularyPreviewFiltering(items, personalizationState, options).visibleItems;
}

// Walk text nodes instead of doing string replacement on HTML. That keeps tags,
// links, and basic EPUB markup intact while still giving us clickable terms.
function createCombinedRegex(items) {
  const terms = items
    .map((item) => item.term)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(termPattern);

  if (terms.length === 0) {
    return null;
  }

  return new RegExp(`(^|[^A-Za-z0-9_])(${terms.join("|")})(?=$|[^A-Za-z0-9_])`, "gi");
}

function shouldAnnotateTextNode(node) {
  const parent = node.parentElement;

  if (!parent || !node.textContent.trim()) {
    return NodeFilter.FILTER_REJECT;
  }

  if (parent.closest("script, style, .vocab-hit")) {
    return NodeFilter.FILTER_REJECT;
  }

  return NodeFilter.FILTER_ACCEPT;
}

function replaceTextNodeWithMatches(node, regex, vocabularyIndex, highlightState) {
  const text = node.textContent;
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match = regex.exec(text);

  while (match) {
    const prefix = match[1] || "";
    const matchedTerm = match[2] || "";
    const termStart = match.index + prefix.length;
    const termEnd = termStart + matchedTerm.length;
    const normalized = normalizeTerm(matchedTerm);
    const item = vocabularyIndex.get(normalized);
    const termCount = highlightState.termCounts.get(normalized) || 0;
    const canHighlight =
      item &&
      highlightState.totalCount < highlightState.maxHighlights &&
      termCount < highlightState.maxHighlightsPerTerm;

    fragment.append(document.createTextNode(text.slice(lastIndex, termStart)));

    if (canHighlight) {
      const hit = document.createElement("button");
      hit.type = "button";
      hit.className = "vocab-hit";
      hit.dataset.vocabTerm = normalizeTerm(item.term);
      hit.textContent = text.slice(termStart, termEnd);
      fragment.append(hit);
      highlightState.totalCount += 1;
      highlightState.termCounts.set(normalized, termCount + 1);
    } else {
      fragment.append(document.createTextNode(text.slice(termStart, termEnd)));
    }

    lastIndex = termEnd;
    match = regex.exec(text);
  }

  fragment.append(document.createTextNode(text.slice(lastIndex)));
  node.replaceWith(fragment);
}

export function annotateVocabularyHtml(html, previewItems, options = {}) {
  const regex = createCombinedRegex(previewItems);

  if (!regex) {
    return html || "";
  }

  const vocabularyIndex = createVocabularyIndex(previewItems);
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_TEXT,
    { acceptNode: shouldAnnotateTextNode }
  );
  const textNodes = [];
  const highlightState = {
    maxHighlights: options.maxHighlights || DEFAULT_MAX_HIGHLIGHTS,
    maxHighlightsPerTerm: options.maxHighlightsPerTerm || DEFAULT_MAX_HIGHLIGHTS_PER_TERM,
    termCounts: new Map(),
    totalCount: 0
  };

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const node of textNodes) {
    regex.lastIndex = 0;
    replaceTextNodeWithMatches(node, regex, vocabularyIndex, highlightState);

    if (highlightState.totalCount >= highlightState.maxHighlights) {
      break;
    }
  }

  return template.innerHTML;
}

export function renderVocabularyPreviewItem(item) {
  if (!item?.term) {
    return "";
  }

  const chineseMeaning = item.chineseMeaning || "暂无中文释义";
  const typeLabel = item.type ? item.type.replace(/_/g, " ") : "unknown";

  return `
    <button type="button" data-vocab-term="${escapeHtml(normalizeTerm(item.term))}">
      <span class="vocab-heading">
        <span class="vocab-term">${escapeHtml(item.term)}</span>
        <span class="vocab-type">${escapeHtml(typeLabel)}</span>
      </span>
      <span class="vocab-meaning">${escapeHtml(chineseMeaning)}</span>
      ${item.englishDefinition ? `<span class="vocab-note"><strong>English:</strong> ${escapeHtml(item.englishDefinition)}</span>` : ""}
      ${item.ieltsUsage ? `<span class="vocab-note"><strong>IELTS:</strong> ${escapeHtml(item.ieltsUsage)}</span>` : ""}
      ${item.usageNote ? `<span class="vocab-note">${escapeHtml(item.usageNote)}</span>` : ""}
      ${item.sourceSentence ? `<span class="vocab-source">${escapeHtml(item.sourceSentence)}</span>` : ""}
    </button>
  `;
}
