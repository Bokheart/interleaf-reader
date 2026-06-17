import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../pwa-reader/levelBaselineEngine.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {
  getLevelBaselinePath,
  getVocabularyPersonalizationState,
  isWordKnownForUser,
  loadEffectiveKnownWordsForProfile,
  loadLevelBaseline,
  normalizeUserVocabularyProfile,
  normalizeWord,
  normalizeWordList,
  resolveEffectiveKnownWords,
  validateLevelBaselineData
} = await import(moduleUrl);

assert.equal(
  getLevelBaselinePath("level3"),
  "../data/levels/level3_basic_words.json",
  "returns expected path for valid level id"
);
assert.throws(
  () => getLevelBaselinePath("level9"),
  /Invalid level id/,
  "rejects invalid level id"
);

const validBaseline = {
  level: "level3",
  label: "IELTS 5.5–6.0 / fanfic beginner",
  description: "Filters common A1–B1 and frequent fiction-reading words.",
  sourcePolicy: "Starter hand-curated placeholder.",
  words: ["The", "the", "GO", "", "go"]
};

assert.deepEqual(
  validateLevelBaselineData(validBaseline, "level3"),
  {
    level: "level3",
    label: "IELTS 5.5–6.0 / fanfic beginner",
    description: "Filters common A1–B1 and frequent fiction-reading words.",
    sourcePolicy: "Starter hand-curated placeholder.",
    words: ["the", "go"]
  },
  "validates and normalizes baseline data"
);

assert.throws(
  () => validateLevelBaselineData({ ...validBaseline, level: "level2" }, "level3"),
  /level mismatch/,
  "throws on level mismatch"
);

assert.throws(
  () => validateLevelBaselineData({ ...validBaseline, label: "" }, "level3"),
  /label must be a non-empty string/,
  "throws when label is missing"
);

assert.throws(
  () => validateLevelBaselineData({ ...validBaseline, words: "the" }, "level3"),
  /words must be an array/,
  "throws when words is not an array"
);

const mockBaselinePayload = {
  level: "level3",
  label: "IELTS 5.5–6.0 / fanfic beginner",
  description: "Filters common A1–B1 and frequent fiction-reading words.",
  sourcePolicy: "Starter hand-curated placeholder.",
  words: ["think", "Think", "feel"]
};

const loadedBaseline = await loadLevelBaseline("level3", {
  fetchImpl: async (path) => {
    assert.equal(path, "../data/levels/level3_basic_words.json", "fetch uses resolved baseline path");
    return {
      ok: true,
      async json() {
        return mockBaselinePayload;
      }
    };
  }
});

assert.deepEqual(loadedBaseline.words, ["think", "feel"], "loadLevelBaseline returns normalized words");

await assert.rejects(
  () => loadLevelBaseline("level3", {
    fetchImpl: async () => {
      throw new Error("network down");
    }
  }),
  /Could not fetch level baseline level3/,
  "handles fetch failure"
);

await assert.rejects(
  () => loadLevelBaseline("level3", {
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      async json() {
        return {};
      }
    })
  }),
  /Could not load .*404/,
  "handles non-ok response"
);

await assert.rejects(
  () => loadLevelBaseline("level3", {
    fetchImpl: async () => ({
      ok: true,
      async json() {
        throw new Error("bad json");
      }
    })
  }),
  /Level baseline JSON is invalid/,
  "handles invalid JSON parsing"
);

await assert.rejects(
  () => loadLevelBaseline("level3", {
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { ...mockBaselinePayload, level: "level2" };
      }
    })
  }),
  /level mismatch/,
  "handles level mismatch after load"
);

assert.equal(normalizeWord("  Relentless  "), "relentless", "lowercases and trims");
assert.equal(normalizeWord('"Hello,"'), "hello", "removes simple surrounding punctuation");
assert.equal(normalizeWord("Don't"), "don't", "preserves internal apostrophe");
assert.equal(normalizeWord(null), "", "handles null");
assert.equal(normalizeWord(undefined), "", "handles undefined");
assert.equal(normalizeWord("   "), "", "handles blank input");

const sourceList = ["The", "the", "", "  GO ", "go"];
const normalizedList = normalizeWordList(sourceList);
assert.deepEqual(normalizedList, ["the", "go"], "deduplicates and removes empty items");
assert.deepEqual(sourceList, ["The", "the", "", "  GO ", "go"], "does not mutate input array");

const defaultProfile = normalizeUserVocabularyProfile();
assert.equal(defaultProfile.selectedLevel, "level3", "defaults selectedLevel to level3");
assert.deepEqual(defaultProfile.knownWords, [], "defaults knownWords to empty array");
assert.deepEqual(defaultProfile.learningWords, [], "defaults learningWords to empty array");
assert.deepEqual(defaultProfile.ignoredWords, [], "defaults ignoredWords to empty array");

const normalizedProfile = normalizeUserVocabularyProfile({
  knownWords: ["Known", "known", "  TERM "],
  learningWords: ["Learn"],
  ignoredWords: ["Ignore!"],
  preferredCategories: ["ielts"]
});
assert.deepEqual(
  normalizedProfile.knownWords,
  ["known", "term"],
  "normalizes and deduplicates knownWords"
);
assert.deepEqual(normalizedProfile.learningWords, ["learn"], "normalizes learningWords");
assert.deepEqual(normalizedProfile.ignoredWords, ["ignore"], "normalizes ignoredWords");

const levelWords = ["the", "and", "go"];
const profile = {
  selectedLevel: "level3",
  knownWords: ["relentless"],
  ignoredWords: ["fandom"],
  learningWords: ["the"]
};

const effectiveKnownWords = resolveEffectiveKnownWords(levelWords, profile);
assert.ok(effectiveKnownWords instanceof Set, "returns a Set");
assert.deepEqual(
  [...effectiveKnownWords].sort(),
  ["and", "fandom", "go", "relentless"],
  "includes baseline, known, and ignored words but excludes learning words"
);

const overlapProfile = {
  knownWords: ["go"],
  ignoredWords: ["go"],
  learningWords: ["and"]
};
const overlapKnown = resolveEffectiveKnownWords(["the", "and"], overlapProfile);
assert.deepEqual([...overlapKnown].sort(), ["go", "the"], "handles overlap without duplicates");

const mutableLevelWords = ["The", "AND"];
const mutableProfile = { knownWords: ["Go"] };
resolveEffectiveKnownWords(mutableLevelWords, mutableProfile);
assert.deepEqual(mutableLevelWords, ["The", "AND"], "does not mutate levelWords input");
assert.deepEqual(mutableProfile.knownWords, ["Go"], "does not mutate profile input");

const keepLearningKnown = resolveEffectiveKnownWords(
  ["the", "and"],
  { learningWords: ["the"] },
  { excludeLearningWords: false }
);
assert.equal(keepLearningKnown.has("the"), true, "can keep learning words in known set when option disables exclusion");

assert.equal(isWordKnownForUser("RELENTLESS", effectiveKnownWords), true, "respects normalization when checking known words");
assert.equal(isWordKnownForUser("the", effectiveKnownWords), false, "returns false for learning words excluded from known set");
assert.equal(isWordKnownForUser("missing", effectiveKnownWords), false, "returns false for unknown words");

const state = getVocabularyPersonalizationState(levelWords, profile);
assert.equal(state.counts.levelWords, 3, "reports level word count");
assert.equal(state.counts.knownWords, 1, "reports known word count");
assert.equal(state.counts.ignoredWords, 1, "reports ignored word count");
assert.equal(state.counts.learningWords, 1, "reports learning word count");
assert.equal(state.counts.effectiveKnownWords, 4, "reports effective known word count");
assert.deepEqual(state.normalizedProfile.knownWords, ["relentless"], "returns normalized profile");

function createMockBaselineFetch(baselinesByLevel) {
  return async (path) => {
    const levelId = path.match(/(level\d)/)?.[1];
    const payload = baselinesByLevel[levelId];

    if (!payload) {
      return { ok: false, status: 404, async json() { return {}; } };
    }

    return {
      ok: true,
      async json() {
        return payload;
      }
    };
  };
}

const baselineFixtures = {
  level3: {
    level: "level3",
    label: "IELTS 5.5–6.0 / fanfic beginner",
    description: "Filters common A1–B1 and frequent fiction-reading words.",
    sourcePolicy: "Starter hand-curated placeholder.",
    words: ["the", "and", "go"]
  },
  level4: {
    level: "level4",
    label: "IELTS 6.5–7.0 / can read fanfic with help",
    description: "Filters A1–B2 and more frequent fiction and academic-support words.",
    sourcePolicy: "Starter hand-curated placeholder.",
    words: ["the", "and", "reason", "know"]
  }
};

const defaultLoadedState = await loadEffectiveKnownWordsForProfile(null, {
  fetchImpl: createMockBaselineFetch(baselineFixtures)
});

assert.equal(defaultLoadedState.selectedLevel, "level3", "defaults to level3 for null profile");
assert.equal(defaultLoadedState.baseline.level, "level3", "loads level3 baseline by default");
assert.ok(defaultLoadedState.effectiveKnownWords instanceof Set, "returns effectiveKnownWords Set");
assert.deepEqual(defaultLoadedState.normalizedProfile.knownWords, [], "returns normalized profile defaults");

const level4LoadedState = await loadEffectiveKnownWordsForProfile(
  { selectedLevel: "level4" },
  { fetchImpl: createMockBaselineFetch(baselineFixtures) }
);
assert.equal(level4LoadedState.baseline.level, "level4", "loads selected level4 baseline");

const personalizedState = await loadEffectiveKnownWordsForProfile(
  {
    selectedLevel: "level3",
    knownWords: ["Relentless"],
    ignoredWords: ["Fandom"],
    learningWords: ["the"]
  },
  { fetchImpl: createMockBaselineFetch(baselineFixtures) }
);
assert.deepEqual(
  [...personalizedState.effectiveKnownWords].sort(),
  ["and", "fandom", "go", "relentless"],
  "includes known and ignored words in effective known set"
);
assert.equal(personalizedState.effectiveKnownWords.has("the"), false, "excludes learning words by default");

const keepLearningState = await loadEffectiveKnownWordsForProfile(
  {
    selectedLevel: "level3",
    learningWords: ["the"]
  },
  {
    fetchImpl: createMockBaselineFetch(baselineFixtures),
    excludeLearningWords: false
  }
);
assert.equal(keepLearningState.effectiveKnownWords.has("the"), true, "keeps learning words when exclusion is disabled");

assert.equal(personalizedState.counts.levelWords, 3, "reports baseline word count");
assert.equal(personalizedState.counts.knownWords, 1, "reports known word count");
assert.equal(personalizedState.counts.ignoredWords, 1, "reports ignored word count");
assert.equal(personalizedState.counts.learningWords, 1, "reports learning word count");
assert.equal(personalizedState.counts.effectiveKnownWords, 4, "reports effective known word count");

await assert.rejects(
  () => loadEffectiveKnownWordsForProfile(
    { selectedLevel: "level9" },
    { fetchImpl: createMockBaselineFetch(baselineFixtures) }
  ),
  /Invalid level id/,
  "rejects invalid selected level"
);

await assert.rejects(
  () => loadEffectiveKnownWordsForProfile(null, {
    fetchImpl: async () => {
      throw new Error("network down");
    }
  }),
  /Could not fetch level baseline level3/,
  "propagates fetch failure with useful context"
);

console.log("levelBaselineEngine tests passed");
