const DEFAULT_LIMIT = 40;
const MIN_NAME_COUNT = 2;
const MIN_PHRASE_COUNT = 2;

const SENTENCE_START_STOPWORDS = new Set([
  "A",
  "An",
  "And",
  "As",
  "At",
  "But",
  "By",
  "Chapter",
  "For",
  "From",
  "He",
  "Her",
  "His",
  "I",
  "If",
  "In",
  "It",
  "Its",
  "Later",
  "Meanwhile",
  "On",
  "Once",
  "She",
  "So",
  "That",
  "The",
  "Then",
  "There",
  "They",
  "This",
  "To",
  "We",
  "When",
  "While",
  "With",
  "You"
]);

const FANDOM_PHRASES = [
  "salt and burn",
  "arc reactor",
  "devil's trap",
  "sonic screwdriver",
  "death eater"
];

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return normalizeSpace(value).toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createTermRegex(term) {
  return new RegExp(`(^|[^A-Za-z0-9_])(${escapeRegExp(term).replace(/\s+/g, "\\s+")})(?=$|[^A-Za-z0-9_])`, "gi");
}

function createBaseCandidate(term, source, evidence = {}) {
  return {
    term: normalizeSpace(term),
    source,
    occurrenceCount: evidence.occurrenceCount || 0,
    firstSeenIndex: evidence.firstSeenIndex ?? Number.MAX_SAFE_INTEGER,
    matchedGlobalTerm: evidence.matchedGlobalTerm || null
  };
}

function countTermMatches(text, term) {
  const regex = createTermRegex(term);
  let count = 0;
  let firstSeenIndex = Number.MAX_SAFE_INTEGER;
  let match = regex.exec(text);

  while (match) {
    count += 1;
    firstSeenIndex = Math.min(firstSeenIndex, match.index + (match[1] || "").length);

    if (regex.lastIndex === match.index) {
      regex.lastIndex += 1;
    }

    match = regex.exec(text);
  }

  return {
    count,
    firstSeenIndex
  };
}

function upsertCandidate(map, candidate) {
  const key = normalizeKey(candidate.term);
  const existing = map.get(key);

  if (!existing) {
    map.set(key, candidate);
    return;
  }

  existing.occurrenceCount += candidate.occurrenceCount;
  existing.firstSeenIndex = Math.min(existing.firstSeenIndex, candidate.firstSeenIndex);
  existing.source = mergeSources(existing.source, candidate.source);
  existing.matchedGlobalTerm = existing.matchedGlobalTerm || candidate.matchedGlobalTerm;
}

function mergeSources(a, b) {
  const parts = new Set(String(a || "").split("+").concat(String(b || "").split("+")));
  return [...parts].filter(Boolean).sort().join("+");
}

function collectCapitalizedWords(text, map) {
  const regex = /\b[A-Z][a-z][A-Za-z']*\b/g;
  const localCounts = new Map();
  let match = regex.exec(text);

  while (match) {
    const term = match[0];

    if (SENTENCE_START_STOPWORDS.has(term)) {
      match = regex.exec(text);
      continue;
    }

    const key = normalizeKey(term);
    const existing = localCounts.get(key) || {
      term,
      count: 0,
      firstSeenIndex: match.index
    };

    existing.count += 1;
    existing.firstSeenIndex = Math.min(existing.firstSeenIndex, match.index);
    localCounts.set(key, existing);
    match = regex.exec(text);
  }

  for (const item of localCounts.values()) {
    if (item.count >= MIN_NAME_COUNT) {
      upsertCandidate(map, createBaseCandidate(item.term, "rule:capitalized-word", {
        occurrenceCount: item.count,
        firstSeenIndex: item.firstSeenIndex
      }));
    }
  }
}

function collectCapitalizedPhrases(text, map) {
  const regex = /\b[A-Z][a-z][A-Za-z']*(?:\s+[A-Z][a-z][A-Za-z']*){1,3}\b/g;
  const localCounts = new Map();
  let match = regex.exec(text);

  while (match) {
    const rawTerm = normalizeSpace(match[0]);
    const rawWords = rawTerm.split(" ");
    const words = SENTENCE_START_STOPWORDS.has(rawWords[0])
      ? rawWords.slice(1)
      : rawWords;

    if (words.length < 2) {
      match = regex.exec(text);
      continue;
    }

    const term = words.join(" ");

    if (words.every((word) => SENTENCE_START_STOPWORDS.has(word))) {
      match = regex.exec(text);
      continue;
    }

    const key = normalizeKey(term);
    const existing = localCounts.get(key) || {
      term,
      count: 0,
      firstSeenIndex: match.index
    };

    existing.count += 1;
    existing.firstSeenIndex = Math.min(existing.firstSeenIndex, match.index);
    localCounts.set(key, existing);
    match = regex.exec(text);
  }

  for (const item of localCounts.values()) {
    if (item.count >= MIN_PHRASE_COUNT) {
      upsertCandidate(map, createBaseCandidate(item.term, "rule:capitalized-phrase", {
        occurrenceCount: item.count,
        firstSeenIndex: item.firstSeenIndex
      }));
    }
  }
}

function collectAllCapsTerms(text, map) {
  const regex = /\b[A-Z][A-Z0-9]{1,}(?:\.[A-Z0-9]+)*\b/g;
  let match = regex.exec(text);

  while (match) {
    upsertCandidate(map, createBaseCandidate(match[0], "rule:all-caps", {
      occurrenceCount: 1,
      firstSeenIndex: match.index
    }));
    match = regex.exec(text);
  }
}

function collectKnownGlobalTerms(text, protectedTerms, map) {
  for (const protectedTerm of protectedTerms || []) {
    const term = protectedTerm.term;

    if (!term) {
      continue;
    }

    const result = countTermMatches(text, term);

    if (result.count > 0) {
      upsertCandidate(map, createBaseCandidate(term, "global-glossary", {
        occurrenceCount: result.count,
        firstSeenIndex: result.firstSeenIndex,
        matchedGlobalTerm: protectedTerm
      }));
    }
  }
}

function collectFandomLikePhrases(text, map) {
  for (const phrase of FANDOM_PHRASES) {
    const result = countTermMatches(text, phrase);

    if (result.count > 0) {
      upsertCandidate(map, createBaseCandidate(phrase, "rule:fandom-phrase", {
        occurrenceCount: result.count,
        firstSeenIndex: result.firstSeenIndex
      }));
    }
  }
}

export function extractGlossaryCandidates(plainText, protectedTerms = []) {
  const text = normalizeSpace(plainText);
  const candidates = new Map();

  if (!text) {
    return [];
  }

  collectKnownGlobalTerms(text, protectedTerms, candidates);
  collectCapitalizedPhrases(text, candidates);
  collectCapitalizedWords(text, candidates);
  collectAllCapsTerms(text, candidates);
  collectFandomLikePhrases(text, candidates);

  return [...candidates.values()].sort((a, b) => {
    if (b.occurrenceCount !== a.occurrenceCount) {
      return b.occurrenceCount - a.occurrenceCount;
    }

    return a.firstSeenIndex - b.firstSeenIndex;
  });
}

export function mockClassifyGlossaryCandidate(candidate) {
  const term = candidate.term;
  const source = candidate.source || "";
  const words = term.split(" ");
  const isAllCaps = /^[A-Z0-9.]+$/.test(term) && term.length > 1;
  const matchedCategory = candidate.matchedGlobalTerm?.category;

  if (candidate.matchedGlobalTerm?.preserveInTranslation) {
    return {
      category: matchedCategory || guessCategory(candidate),
      confidence: 0.95,
      recommendedAction: "preserve",
      reason: "Matches the Global Glossary protected terms list.",
      badTranslationWarnings: warningsForTerm(term, matchedCategory || "protected")
    };
  }

  if (source.includes("rule:fandom-phrase")) {
    return {
      category: "fandom_phrase",
      confidence: 0.82,
      recommendedAction: "preserve",
      reason: "Looks like a fandom-specific phrase that may lose meaning if translated literally.",
      badTranslationWarnings: warningsForTerm(term, "fandom_phrase")
    };
  }

  if (isAllCaps) {
    return {
      category: "organization",
      confidence: 0.78,
      recommendedAction: "preserve",
      reason: "All-caps term looks like an acronym, team, agency, or object name.",
      badTranslationWarnings: warningsForTerm(term, "organization")
    };
  }

  if (words.length > 1) {
    return {
      category: "named_entity",
      confidence: 0.72,
      recommendedAction: "review",
      reason: "Repeated capitalized phrase looks like a named place, group, object, or title.",
      badTranslationWarnings: warningsForTerm(term, "named_entity")
    };
  }

  return {
    category: "character",
    confidence: 0.68,
    recommendedAction: "review",
    reason: "Repeated capitalized word looks like a character or named entity.",
    badTranslationWarnings: warningsForTerm(term, "character")
  };
}

function guessCategory(candidate) {
  const term = candidate.term;

  if (/^[A-Z0-9.]+$/.test(term)) {
    return "organization";
  }

  if (term.split(" ").length > 1) {
    return "phrase";
  }

  return "named_entity";
}

function warningsForTerm(term, category) {
  const warnings = [];
  const key = normalizeKey(term);

  if (key === "impala") {
    warnings.push("May be mistranslated as an animal instead of a vehicle or protected story term.");
  }

  if (category === "organization") {
    warnings.push("Acronyms and agency names should usually remain unchanged.");
  }

  if (category === "fandom_phrase") {
    warnings.push("Literal translation may erase fandom-specific meaning.");
  }

  if (category === "character" || category === "named_entity") {
    warnings.push("Names should usually remain unchanged unless the user overrides them.");
  }

  return warnings;
}

export function normalizeGlossaryTerm(item) {
  const term = normalizeSpace(item?.term);

  if (!term) {
    return null;
  }

  const confidence = Number.isFinite(item.confidence)
    ? Math.max(0, Math.min(1, item.confidence))
    : 0;

  return {
    ...item,
    term,
    category: normalizeSpace(item.category) || "candidate",
    recommendedAction: normalizeSpace(item.recommendedAction) || "review",
    confidence,
    reason: normalizeSpace(item.reason),
    badTranslationWarnings: Array.isArray(item.badTranslationWarnings)
      ? item.badTranslationWarnings.filter(Boolean)
      : []
  };
}

export function buildBookGlossary(chapters, protectedTerms = [], options = {}) {
  const classifier = options.classifier || mockClassifyGlossaryCandidate;
  const limit = options.limit || DEFAULT_LIMIT;
  const text = chapters
    .map((chapter) => chapter?.plainText || chapter || "")
    .filter(Boolean)
    .join(" ");

  return extractGlossaryCandidates(text, protectedTerms)
    .map((candidate) => ({
      term: candidate.term,
      source: candidate.source,
      occurrenceCount: candidate.occurrenceCount,
      ...classifier(candidate)
    }))
    .map(normalizeGlossaryTerm)
    .filter(Boolean)
    .filter((term) => term.recommendedAction !== "ignore")
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }

      return b.occurrenceCount - a.occurrenceCount;
    })
    .slice(0, limit);
}
