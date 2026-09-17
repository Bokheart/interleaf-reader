import assert from "node:assert/strict";
import test from "node:test";
import { createVocabularyAdapter } from "../pwa-reader/adapters/vocabularyAdapter.js";
import { getVocabularyPersonalizationState } from "../pwa-reader/levelBaselineEngine.js";

test("Reader eligibility excludes Known and Hidden while Learning overrides the level baseline", async () => {
  const profile = { selectedLevel: "level3", knownWords: ["known"], ignoredWords: ["hidden"], learningWords: ["learning"] };
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => profile,
    loadVocabularyData: async () => ["known", "hidden", "learning", "basic", "ordinary"].map(term => ({ term })),
    loadEffectiveKnownWordsForProfile: async profile => getVocabularyPersonalizationState(["basic", "learning"], profile)
  });
  const result = await adapter.getReaderVocabulary();
  assert.deepEqual(result.items.map(item => item.term), ["learning", "ordinary"]);
  assert.deepEqual(result.profile, profile);
});

test("Reader reads the current global profile again after state changes", async () => {
  let profile = { knownWords: [], ignoredWords: [], learningWords: [] };
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => profile,
    loadVocabularyData: async () => [{ term: "Anxious" }],
    loadEffectiveKnownWordsForProfile: async profile => getVocabularyPersonalizationState([], profile)
  });
  assert.equal((await adapter.getReaderVocabulary()).items.length, 1);
  profile = { ...profile, knownWords: ["anxious"] };
  assert.equal((await adapter.getReaderVocabulary()).items.length, 0);
  profile = { ...profile, knownWords: [], learningWords: ["anxious"] };
  assert.equal((await adapter.getReaderVocabulary()).items.length, 1);
});

test("Reader merges non-curated Learning terms without replacing curated metadata", async () => {
  const profile = {
    knownWords: [],
    ignoredWords: [],
    learningWords: ["personal phrase", "ANXIOUS"]
  };
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => profile,
    loadVocabularyData: async () => [
      { term: "Anxious", englishDefinition: "worried", priority: 90 },
      { term: "ordinary", priority: 80 }
    ],
    loadEffectiveKnownWordsForProfile: async profile => getVocabularyPersonalizationState([], profile)
  });

  const result = await adapter.getReaderVocabulary();
  const anxious = result.items.find(item => item.term === "Anxious");
  const personal = result.items.find(item => item.term === "personal phrase");

  assert.equal(anxious.englishDefinition, "worried");
  assert.equal(result.items.filter(item => item.term.toLowerCase() === "anxious").length, 1);
  assert.deepEqual(
    { term: personal.term, englishDefinition: personal.englishDefinition },
    { term: "personal phrase", englishDefinition: undefined }
  );
  assert.equal(personal.personalization.boostedByLearningWords, true);
});

test("Failed vocabulary loading can be retried on the next chapter", async () => {
  let fail = true;
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => ({}),
    loadVocabularyData: async () => { if (fail) throw new Error("Dataset unavailable"); return [{ term: "anxious" }]; },
    loadEffectiveKnownWordsForProfile: async profile => getVocabularyPersonalizationState([], profile)
  });
  await assert.rejects(adapter.getReaderVocabulary(), /Dataset unavailable/);
  fail = false;
  assert.equal((await adapter.getReaderVocabulary()).items[0].term, "anxious");
});
