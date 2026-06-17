const DEFAULT_SELECTED_LEVEL = "level3";
const VALID_LEVEL_IDS = ["level1", "level2", "level3", "level4", "level5"];

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

export function normalizeUserVocabularyProfile(profile = {}) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};

  return {
    selectedLevel: safeProfile.selectedLevel || DEFAULT_SELECTED_LEVEL,
    knownWords: normalizeWordList(safeProfile.knownWords),
    learningWords: normalizeWordList(safeProfile.learningWords),
    ignoredWords: normalizeWordList(safeProfile.ignoredWords),
    preferredCategories: Array.isArray(safeProfile.preferredCategories)
      ? [...safeProfile.preferredCategories]
      : [],
    updatedAt: safeProfile.updatedAt ?? null
  };
}

export function resolveEffectiveKnownWords(levelWords = [], userProfile = {}, options = {}) {
  const normalizedProfile = normalizeUserVocabularyProfile(userProfile);
  const excludeLearningWords = options.excludeLearningWords !== false;
  const combinedWords = normalizeWordList([
    ...(Array.isArray(levelWords) ? levelWords : []),
    ...normalizedProfile.knownWords,
    ...normalizedProfile.ignoredWords
  ]);
  const learningWords = new Set(normalizedProfile.learningWords);

  if (!excludeLearningWords) {
    return new Set(combinedWords);
  }

  return new Set(combinedWords.filter((word) => !learningWords.has(word)));
}

export function isWordKnownForUser(word, effectiveKnownWords) {
  const normalizedWord = normalizeWord(word);

  if (!normalizedWord) {
    return false;
  }

  if (effectiveKnownWords instanceof Set) {
    return effectiveKnownWords.has(normalizedWord);
  }

  return normalizeWordList(effectiveKnownWords).includes(normalizedWord);
}

export function getVocabularyPersonalizationState(levelWords = [], userProfile = {}) {
  const normalizedProfile = normalizeUserVocabularyProfile(userProfile);
  const normalizedLevelWords = normalizeWordList(levelWords);
  const effectiveKnownWords = resolveEffectiveKnownWords(normalizedLevelWords, normalizedProfile);

  return {
    normalizedProfile,
    effectiveKnownWords,
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

export function getLevelBaselinePath(levelId) {
  const normalizedLevelId = String(levelId || "").trim();

  if (!VALID_LEVEL_IDS.includes(normalizedLevelId)) {
    throw new Error(`Invalid level id: ${levelId}`);
  }

  return `../data/levels/${normalizedLevelId}_basic_words.json`;
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

  return {
    level: normalizedExpectedLevelId,
    label: data.label.trim(),
    description: data.description.trim(),
    sourcePolicy: data.sourcePolicy.trim(),
    words: normalizeWordList(data.words)
  };
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

export async function loadEffectiveKnownWordsForProfile(userProfile = {}, options = {}) {
  const normalizedProfile = normalizeUserVocabularyProfile(userProfile);
  const { fetchImpl, excludeLearningWords, ...resolveOptions } = options;
  const resolveKnownWordOptions = {
    ...resolveOptions,
    excludeLearningWords: excludeLearningWords !== false
  };

  const baseline = await loadLevelBaseline(normalizedProfile.selectedLevel, { fetchImpl });
  const effectiveKnownWords = resolveEffectiveKnownWords(
    baseline.words,
    normalizedProfile,
    resolveKnownWordOptions
  );

  return {
    selectedLevel: normalizedProfile.selectedLevel,
    baseline,
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
