import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const source = await readFile(new URL("../pwa-reader/levelBaselineEngine.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {
  FROZEN_LEVEL_WORD_COUNTS,
  LEVEL_CORPUS_DATA_ROOT,
  LEVEL_CORPUS_VERSION,
  createFormIndexLookup,
  getFormIndexPath,
  getLevelBaselinePath,
  getPhraseInventoryPath,
  getVocabularyPersonalizationState,
  isWordKnownForUser,
  loadEffectiveKnownWordsForProfile,
  loadFormIndex,
  loadLevelBaseline,
  normalizeSelectedLevel,
  normalizeUserVocabularyProfile,
  normalizeWord,
  normalizeWordList,
  resolveCanonicalForm,
  resolveEffectiveKnownWords,
  validateFormIndexData,
  validateLevelBaselineData
} = await import(moduleUrl);

const corpusRootUrl = new URL(`../data/level-corpus/${LEVEL_CORPUS_VERSION}/`, import.meta.url);
const corpusRootPath = fileURLToPath(corpusRootUrl);

async function readCorpusJson(relativePath) {
  return JSON.parse(await readFile(path.join(corpusRootPath, relativePath), "utf8"));
}

assert.equal(
  getLevelBaselinePath("level3"),
  `${LEVEL_CORPUS_DATA_ROOT}/level3_basic_words.json`,
  "returns versioned corpus path for valid level id"
);
assert.equal(
  getFormIndexPath(),
  `${LEVEL_CORPUS_DATA_ROOT}/form_index.json`,
  "returns form_index path"
);
assert.equal(
  getPhraseInventoryPath(),
  `${LEVEL_CORPUS_DATA_ROOT}/phrase_inventory.json`,
  "returns phrase inventory path"
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
    corpusVersion: null,
    provisional: false,
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

assert.throws(
  () => validateLevelBaselineData({
    ...validBaseline,
    words: ["go: 去"]
  }, "level3"),
  /without definitions or glosses/,
  "rejects definition/gloss shaped whitelist entries"
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
    assert.equal(
      path,
      `${LEVEL_CORPUS_DATA_ROOT}/level3_basic_words.json`,
      "fetch uses resolved baseline path"
    );
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
assert.equal(normalizeSelectedLevel("level9"), "level3", "invalid level falls back to level3");
assert.equal(
  normalizeUserVocabularyProfile({ selectedLevel: "level9" }).selectedLevel,
  "level3",
  "profile normalization falls back for invalid selectedLevel"
);

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

function createMockCorpusFetch(baselinesByLevel, formIndex = null) {
  return async (requestPath) => {
    if (requestPath === getFormIndexPath()) {
      if (!formIndex) {
        return { ok: false, status: 404, async json() { return {}; } };
      }

      return {
        ok: true,
        async json() {
          return formIndex;
        }
      };
    }

    const levelId = requestPath.match(/(level\d)_basic_words\.json$/)?.[1];
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

const fixtureFormIndex = {
  went: "go",
  gone: "go",
  stole: "steal",
  stolen: "steal",
  ran: "run"
};

const defaultLoadedState = await loadEffectiveKnownWordsForProfile(null, {
  fetchImpl: createMockCorpusFetch(baselineFixtures, fixtureFormIndex)
});

assert.equal(defaultLoadedState.selectedLevel, "level3", "defaults to level3 for null profile");
assert.equal(defaultLoadedState.baseline.level, "level3", "loads level3 baseline by default");
assert.ok(defaultLoadedState.effectiveKnownWords instanceof Set, "returns effectiveKnownWords Set");
assert.deepEqual(defaultLoadedState.normalizedProfile.knownWords, [], "returns normalized profile defaults");
assert.equal(defaultLoadedState.formIndex.went, "go", "loads form index with effective known state");

const level4LoadedState = await loadEffectiveKnownWordsForProfile(
  { selectedLevel: "level4" },
  { fetchImpl: createMockCorpusFetch(baselineFixtures, fixtureFormIndex) }
);
assert.equal(level4LoadedState.baseline.level, "level4", "loads selected level4 baseline");

const personalizedState = await loadEffectiveKnownWordsForProfile(
  {
    selectedLevel: "level3",
    knownWords: ["Relentless"],
    ignoredWords: ["Fandom"],
    learningWords: ["the"]
  },
  { fetchImpl: createMockCorpusFetch(baselineFixtures, fixtureFormIndex) }
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
    fetchImpl: createMockCorpusFetch(baselineFixtures, fixtureFormIndex),
    excludeLearningWords: false
  }
);
assert.equal(keepLearningState.effectiveKnownWords.has("the"), true, "keeps learning words when exclusion is disabled");

assert.equal(personalizedState.counts.levelWords, 3, "reports baseline word count");
assert.equal(personalizedState.counts.knownWords, 1, "reports known word count");
assert.equal(personalizedState.counts.ignoredWords, 1, "reports ignored word count");
assert.equal(personalizedState.counts.learningWords, 1, "reports learning word count");
assert.equal(personalizedState.counts.effectiveKnownWords, 4, "reports effective known word count");

const invalidLevelState = await loadEffectiveKnownWordsForProfile(
  { selectedLevel: "level9" },
  { fetchImpl: createMockCorpusFetch(baselineFixtures, fixtureFormIndex) }
);
assert.equal(invalidLevelState.selectedLevel, "level3", "invalid selected level falls back safely");
assert.equal(invalidLevelState.baseline.level, "level3", "loads default baseline after invalid level fallback");

await assert.rejects(
  () => loadEffectiveKnownWordsForProfile(null, {
    fetchImpl: async () => {
      throw new Error("network down");
    }
  }),
  /Could not fetch level baseline level3/,
  "propagates fetch failure with useful context"
);

const formLookup = createFormIndexLookup(fixtureFormIndex);
assert.equal(formLookup.resolve("went"), "go", "form lookup resolves went → go");
assert.equal(formLookup.resolve("stolen"), "steal", "form lookup resolves stolen → steal");
assert.equal(formLookup.resolve("stealed"), "stealed", "malformed stealed is not guessed as steal");
assert.equal(resolveCanonicalForm("WENT", fixtureFormIndex), "go", "resolveCanonicalForm normalizes before lookup");
assert.equal(resolveCanonicalForm("stealed", fixtureFormIndex), "stealed", "missing form_index entries stay unchanged");
assert.deepEqual(
  validateFormIndexData({ Went: "GO", stole: "steal", bad: 1 }),
  { went: "go", stole: "steal" },
  "validateFormIndexData normalizes string entries and skips non-strings"
);

assert.equal(
  isWordKnownForUser("went", new Set(["go"]), { formIndex: fixtureFormIndex }),
  true,
  "went inherits go whitelist membership via form_index"
);
assert.equal(
  isWordKnownForUser("stolen", new Set(["steal"]), { formIndex: fixtureFormIndex }),
  true,
  "stolen inherits steal whitelist membership via form_index"
);
assert.equal(
  isWordKnownForUser("stealed", new Set(["steal"]), { formIndex: fixtureFormIndex }),
  false,
  "stealed does not inherit steal without form_index entry"
);

const learningOverrideKnown = resolveEffectiveKnownWords(
  ["go", "and"],
  { learningWords: ["went"] },
  { formIndex: fixtureFormIndex }
);
assert.equal(learningOverrideKnown.has("go"), false, "learning surface went excludes canonical go from baseline");

const shaManifest = await readCorpusJson("SHA256SUMS.json");
const requiredRuntimeFiles = [
  "level1_basic_words.json",
  "level2_basic_words.json",
  "level3_basic_words.json",
  "level4_basic_words.json",
  "level5_basic_words.json",
  "form_index.json",
  "phrase_inventory.json",
  "provenance_license_manifest.json",
  "bysa_derived/l5_balanced_wordfreq_additions.json",
  "bysa_derived/README.json"
];

for (const relativePath of requiredRuntimeFiles) {
  const expected = shaManifest.files.find((entry) => entry.path === relativePath);
  assert.ok(expected, `SHA256 manifest includes ${relativePath}`);
  const bytes = await readFile(path.join(corpusRootPath, relativePath));
  const digest = createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest, expected.sha256, `${relativePath} matches frozen SHA-256`);
  assert.equal(bytes.length, expected.bytes, `${relativePath} matches frozen byte size`);
}

const frozenLevels = {};
for (const levelId of Object.keys(FROZEN_LEVEL_WORD_COUNTS)) {
  const payload = await readCorpusJson(`${levelId}_basic_words.json`);
  const validated = validateLevelBaselineData(payload, levelId);
  frozenLevels[levelId] = new Set(validated.words);
  assert.equal(
    validated.words.length,
    FROZEN_LEVEL_WORD_COUNTS[levelId],
    `${levelId} has exact frozen word count`
  );
  assert.equal(validated.corpusVersion, LEVEL_CORPUS_VERSION, `${levelId} records corpus version`);
  assert.ok(
    validated.words.every((word) => typeof word === "string" && !/[:：]/.test(word)),
    `${levelId} whitelist contains lemma strings only`
  );
}

for (const [smaller, larger] of [
  ["level1", "level2"],
  ["level2", "level3"],
  ["level3", "level4"],
  ["level4", "level5"]
]) {
  for (const word of frozenLevels[smaller]) {
    assert.equal(
      frozenLevels[larger].has(word),
      true,
      `${smaller} ⊂ ${larger} missing ${word}`
    );
  }
}

const frozenFormIndex = validateFormIndexData(await readCorpusJson("form_index.json"));
assert.equal(frozenFormIndex.went, "go", "frozen form_index maps went → go");
assert.equal(frozenFormIndex.gone, "go", "frozen form_index maps gone → go");
assert.equal(frozenFormIndex.stole, "steal", "frozen form_index maps stole → steal");
assert.equal(frozenFormIndex.stolen, "steal", "frozen form_index maps stolen → steal");
assert.equal(frozenFormIndex.ran, "run", "frozen form_index maps ran → run");
assert.equal(frozenFormIndex.stealed, undefined, "frozen form_index does not contain stealed");

assert.equal(frozenLevels.level1.has("go"), true, "L1 includes go");
assert.equal(frozenLevels.level5.has("steal"), true, "L5 includes steal");
assert.equal(
  isWordKnownForUser("went", frozenLevels.level1, { formIndex: frozenFormIndex }),
  true,
  "went → go filtering against L1 whitelist"
);
assert.equal(
  isWordKnownForUser("stolen", frozenLevels.level5, { formIndex: frozenFormIndex }),
  true,
  "stolen → steal filtering against L5 whitelist"
);
assert.equal(
  isWordKnownForUser("stealed", frozenLevels.level5, { formIndex: frozenFormIndex }),
  false,
  "stealed is not guessed as steal against L5"
);

const l1OnlyWords = [...frozenLevels.level5].filter((word) => !frozenLevels.level1.has(word));
assert.ok(l1OnlyWords.length > 0, "L5 contains words beyond L1");
const sampleAdvanced = l1OnlyWords.find((word) => frozenLevels.level5.has(word));
assert.equal(
  isWordKnownForUser(sampleAdvanced, frozenLevels.level1, { formIndex: frozenFormIndex }),
  false,
  "L1 does not treat advanced L5-only lemma as known"
);
assert.equal(
  isWordKnownForUser(sampleAdvanced, frozenLevels.level5, { formIndex: frozenFormIndex }),
  true,
  "L5 treats the same lemma as known — quieter assistance than L1"
);
assert.ok(
  frozenLevels.level1.size < frozenLevels.level5.size,
  "larger level means larger presumed-known whitelist"
);

const diskLoaded = await loadEffectiveKnownWordsForProfile(
  {
    selectedLevel: "level1",
    knownWords: ["Relentless"],
    ignoredWords: ["Fandom"],
    learningWords: ["the"]
  },
  {
    fetchImpl: async (requestPath) => {
      const relative = requestPath.replace(`${LEVEL_CORPUS_DATA_ROOT}/`, "");
      const payload = await readCorpusJson(relative);
      return {
        ok: true,
        async json() {
          return payload;
        }
      };
    }
  }
);

assert.equal(diskLoaded.counts.levelWords, 1062, "disk load reports L1 count");
assert.equal(diskLoaded.effectiveKnownWords.has("the"), false, "existing Learning exclusion still applies");
assert.equal(diskLoaded.effectiveKnownWords.has("relentless"), true, "existing Known still applies");
assert.equal(diskLoaded.effectiveKnownWords.has("fandom"), true, "existing Hide/ignored still applies");
assert.equal(
  isWordKnownForUser("went", diskLoaded.effectiveKnownWords, { formIndex: diskLoaded.formIndex }),
  true,
  "form_index applies on disk-backed effective known set"
);

const formIndexFromLoader = await loadFormIndex({
  fetchImpl: async (requestPath) => {
    assert.equal(requestPath, getFormIndexPath());
    return {
      ok: true,
      async json() {
        return fixtureFormIndex;
      }
    };
  }
});
assert.equal(formIndexFromLoader.went, "go", "loadFormIndex returns normalized map");

const notice = await readFile(path.join(corpusRootPath, "NOTICE.md"), "utf8");
assert.match(notice, /CEFR-J/, "NOTICE retains CEFR-J attribution");
assert.match(notice, /BY-SA|CC BY-SA/, "NOTICE retains BY-SA attribution");
assert.match(notice, /bysa_derived/, "NOTICE preserves BY-SA separation requirement");

console.log("levelBaselineEngine tests passed");
