const DEFAULT_SELECTED_LEVEL = "level3";
const VALID_LEVEL_IDS = ["level1", "level2", "level3", "level4", "level5"];
export const LEVEL_CORPUS_VERSION = "interleaf-level-corpus-v2.0.0-frozen";
export const LEVEL_CORPUS_DATA_ROOT = `../data/level-corpus/${LEVEL_CORPUS_VERSION}`;
export const FROZEN_LEVEL_WORD_COUNTS = Object.freeze({
  level1: 1062,
  level2: 2277,
  level3: 4333,
  level4: 6700,
  level5: 9974
});

const DEFAULT_USER_VOCABULARY_PROFILE = {
  selectedLevel: DEFAULT_SELECTED_LEVEL,
  knownWords: [],
  learningWords: [],
  ignoredWords: [],
  preferredCategories: [],
  updatedAt: null
};

export function normalizeWord(word) {
  if (word === null || word === undefined) {
    return "";
  }

  let value = String(word).trim().toLowerCase();

  if (!value) {
    return "";
  }

  value = value.replace(/^[^a-z0-9'-]+/i, "").replace(/[^a-z0-9'-]+$/i, "");
  return value;
}

export function normalizeWordList(words) {
  if (!Array.isArray(words)) {
    return [];
  }

  const seen = new Set();
  const normalizedWords = [];

  for (const word of words) {
    const normalized = normalizeWord(word);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    normalizedWords.push(normalized);
  }

  return normalizedWords;
}

export function normalizeSelectedLevel(levelId) {
  const normalizedLevel = String(levelId || "").trim();
  return VALID_LEVEL_IDS.includes(normalizedLevel)
    ? normalizedLevel
    : DEFAULT_SELECTED_LEVEL;
}

export function normalizeUserVocabularyProfile(profile = {}) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};

  return {
    selectedLevel: normalizeSelectedLevel(safeProfile.selectedLevel),
    knownWords: normalizeWordList(safeProfile.knownWords),
    learningWords: normalizeWordList(safeProfile.learningWords),
    ignoredWords: normalizeWordList(safeProfile.ignoredWords),
    preferredCategories: Array.isArray(safeProfile.preferredCategories)
      ? [...safeProfile.preferredCategories]
      : [],
    updatedAt: safeProfile.updatedAt ?? null
  };
}

/**
 * Deterministic corpus morphology only: surface → canonical via form_index.
 * Unknown surfaces are returned unchanged. Never guesses missing forms.
 */
export function resolveCanonicalForm(surface, formIndex = null) {
  const normalized = normalizeWord(surface);

  if (!normalized) {
    return "";
  }

  if (!formIndex || typeof formIndex !== "object" || Array.isArray(formIndex)) {
    return normalized;
  }

  const mapped = formIndex[normalized];

  if (typeof mapped !== "string") {
    return normalized;
  }

  const canonical = normalizeWord(mapped);
  return canonical || normalized;
}

export function createFormIndexLookup(formIndex = null) {
  const safeIndex = formIndex && typeof formIndex === "object" && !Array.isArray(formIndex)
    ? formIndex
    : null;

  return {
    formIndex: safeIndex,
    resolve(surface) {
      return resolveCanonicalForm(surface, safeIndex);
    }
  };
}

function toKnownWordSet(effectiveKnownWords) {
  if (effectiveKnownWords instanceof Set) {
    return effectiveKnownWords;
  }

  return new Set(normalizeWordList(effectiveKnownWords));
}

export function resolveEffectiveKnownWords(levelWords = [], userProfile = {}, options = {}) {
  const normalizedProfile = normalizeUserVocabularyProfile(userProfile);
  const excludeLearningWords = options.excludeLearningWords !== false;
  const formIndex = options.formIndex || null;
  const combinedWords = normalizeWordList([
    ...(Array.isArray(levelWords) ? levelWords : []),
    ...normalizedProfile.knownWords,
    ...normalizedProfile.ignoredWords
  ]);
  const learningWords = new Set(normalizedProfile.learningWords);
  const learningCanonicalWords = new Set(
    normalizedProfile.learningWords.map((word) => resolveCanonicalForm(word, formIndex))
  );

  if (!excludeLearningWords) {
    return new Set(combinedWords);
  }

  return new Set(combinedWords.filter((word) => {
    if (learningWords.has(word)) {
      return false;
    }

    if (formIndex && learningCanonicalWords.has(resolveCanonicalForm(word, formIndex))) {
      return false;
    }

    return true;
  }));
}

export function isWordKnownForUser(word, effectiveKnownWords, options = {}) {
  const normalizedWord = normalizeWord(word);

  if (!normalizedWord) {
    return false;
  }

  const knownWords = toKnownWordSet(effectiveKnownWords);

  if (knownWords.has(normalizedWord)) {
    return true;
  }

  const canonical = resolveCanonicalForm(normalizedWord, options.formIndex || null);

  if (!canonical || canonical === normalizedWord) {
    return false;
  }

  return knownWords.has(canonical);
}

export function getVocabularyPersonalizationState(levelWords = [], userProfile = {}, options = {}) {
  const normalizedProfile = normalizeUserVocabularyProfile(userProfile);
  const normalizedLevelWords = normalizeWordList(levelWords);
  const formIndex = options.formIndex || null;
  const effectiveKnownWords = resolveEffectiveKnownWords(normalizedLevelWords, normalizedProfile, {
    ...options,
    formIndex
  });

  return {
    normalizedProfile,
    effectiveKnownWords,
    formIndex,
    counts: {
      levelWords: normalizedLevelWords.length,
      knownWords: normalizedProfile.knownWords.length,
      ignoredWords: normalizedProfile.ignoredWords.length,
      learningWords: normalizedProfile.learningWords.length,
      effectiveKnownWords: effectiveKnownWords.size
    }
  };
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Level baseline ${fieldName} must be a non-empty string.`);
  }
}

export function getLevelCorpusDataRoot() {
  return LEVEL_CORPUS_DATA_ROOT;
}

export function getLevelBaselinePath(levelId) {
  const rawLevelId = String(levelId || "").trim();

  if (!VALID_LEVEL_IDS.includes(rawLevelId)) {
    throw new Error(`Invalid level id: ${levelId}`);
  }

  return `${LEVEL_CORPUS_DATA_ROOT}/${rawLevelId}_basic_words.json`;
}

export function getFormIndexPath() {
  return `${LEVEL_CORPUS_DATA_ROOT}/form_index.json`;
}

export function getPhraseInventoryPath() {
  return `${LEVEL_CORPUS_DATA_ROOT}/phrase_inventory.json`;
}

export function validateLevelBaselineData(data, expectedLevelId) {
  const normalizedExpectedLevelId = String(expectedLevelId || "").trim();

  if (!VALID_LEVEL_IDS.includes(normalizedExpectedLevelId)) {
    throw new Error(`Invalid expected level id: ${expectedLevelId}`);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Level baseline data must be an object.");
  }

  if (data.level !== normalizedExpectedLevelId) {
    throw new Error(
      `Level baseline level mismatch: expected ${normalizedExpectedLevelId}, got ${data.level}.`
    );
  }

  assertNonEmptyString(data.label, "label");
  assertNonEmptyString(data.description, "description");
  assertNonEmptyString(data.sourcePolicy, "sourcePolicy");

  if (!Array.isArray(data.words)) {
    throw new Error("Level baseline words must be an array.");
  }

  // Whitelist state is lemma strings only — reject definition/gloss shaped entries
  // before normalization can strip trailing gloss punctuation.
  for (const rawWord of data.words) {
    if (rawWord === null || rawWord === undefined || rawWord === "") {
      continue;
    }

    if (typeof rawWord !== "string") {
      throw new Error("Level baseline words must be lemma strings without definitions or glosses.");
    }

    if (/[:：]/.test(rawWord) || /\s{2,}/.test(rawWord)) {
      throw new Error("Level baseline words must be lemma strings without definitions or glosses.");
    }
  }

  return {
    level: normalizedExpectedLevelId,
    label: data.label.trim(),
    description: data.description.trim(),
    sourcePolicy: data.sourcePolicy.trim(),
    corpusVersion: typeof data.corpusVersion === "string" ? data.corpusVersion.trim() : null,
    provisional: data.provisional === true,
    words: normalizeWordList(data.words)
  };
}

export function validateFormIndexData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Form index data must be an object map.");
  }

  const formIndex = {};

  for (const [surface, canonical] of Object.entries(data)) {
    if (typeof canonical !== "string") {
      continue;
    }

    const normalizedSurface = normalizeWord(surface);
    const normalizedCanonical = normalizeWord(canonical);

    if (!normalizedSurface || !normalizedCanonical) {
      continue;
    }

    formIndex[normalizedSurface] = normalizedCanonical;
  }

  return formIndex;
}

async function fetchJson(path, options = {}, errorPrefix = "resource") {
  const fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

  if (typeof fetchImpl !== "function") {
    throw new Error(`${errorPrefix} requires fetchImpl when fetch is unavailable.`);
  }

  let response;

  try {
    response = await fetchImpl(path);
  } catch (error) {
    throw new Error(`Could not fetch ${errorPrefix}: ${error.message || error}`);
  }

  if (!response || response.ok === false) {
    const status = response?.status ?? "unknown";
    throw new Error(`Could not load ${path}: ${status}`);
  }

  try {
    return typeof response.json === "function" ? await response.json() : response;
  } catch (error) {
    throw new Error(`${errorPrefix} JSON is invalid: ${error.message || error}`);
  }
}

export async function loadLevelBaseline(levelId, options = {}) {
  const path = getLevelBaselinePath(levelId);
  const fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

  if (typeof fetchImpl !== "function") {
    throw new Error("loadLevelBaseline requires fetchImpl when fetch is unavailable.");
  }

  let response;

  try {
    response = await fetchImpl(path);
  } catch (error) {
    throw new Error(`Could not fetch level baseline ${levelId}: ${error.message || error}`);
  }

  if (!response || response.ok === false) {
    const status = response?.status ?? "unknown";
    throw new Error(`Could not load ${path}: ${status}`);
  }

  let data;

  try {
    data = typeof response.json === "function" ? await response.json() : response;
  } catch (error) {
    throw new Error(`Level baseline JSON is invalid for ${levelId}: ${error.message || error}`);
  }

  return validateLevelBaselineData(data, levelId);
}

export async function loadFormIndex(options = {}) {
  const path = getFormIndexPath();
  const data = await fetchJson(path, options, "form index");
  return validateFormIndexData(data);
}

export async function loadEffectiveKnownWordsForProfile(userProfile = {}, options = {}) {
  const normalizedProfile = normalizeUserVocabularyProfile(userProfile);
  const { fetchImpl, excludeLearningWords, formIndex: providedFormIndex, loadFormIndexData = true, ...resolveOptions } = options;
  const resolveKnownWordOptions = {
    ...resolveOptions,
    excludeLearningWords: excludeLearningWords !== false
  };

  const baseline = await loadLevelBaseline(normalizedProfile.selectedLevel, { fetchImpl });
  const formIndex = providedFormIndex
    || (loadFormIndexData ? await loadFormIndex({ fetchImpl }) : null);

  const effectiveKnownWords = resolveEffectiveKnownWords(
    baseline.words,
    normalizedProfile,
    {
      ...resolveKnownWordOptions,
      formIndex
    }
  );

  return {
    selectedLevel: normalizedProfile.selectedLevel,
    baseline,
    formIndex,
    normalizedProfile,
    effectiveKnownWords,
    counts: {
      levelWords: baseline.words.length,
      knownWords: normalizedProfile.knownWords.length,
      ignoredWords: normalizedProfile.ignoredWords.length,
      learningWords: normalizedProfile.learningWords.length,
      effectiveKnownWords: effectiveKnownWords.size
    }
  };
}
