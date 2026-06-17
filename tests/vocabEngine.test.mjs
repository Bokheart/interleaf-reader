import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../pwa-reader/vocabEngine.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {
  buildVocabularyPreview,
  explainVocabularyPreviewFiltering,
  filterVocabularyPreviewItems,
  findVocabularyMatches,
  renderVocabularyPreviewItem
} = await import(moduleUrl);

const baseItems = [
  {
    term: "relentless",
    type: "ielts",
    chineseMeaning: "persistent",
    englishDefinition: "continuing without stopping",
    usageNote: "Describes something that does not stop.",
    ieltsUsage: "relentless pressure",
    priority: 70,
    source: "test_seed"
  },
  {
    term: "hit the road",
    type: "idiom",
    chineseMeaning: "leave",
    englishDefinition: "to leave and start a trip",
    usageNote: "Casual phrase for starting a trip.",
    priority: 90,
    source: "test_seed"
  },
  {
    term: "salt",
    type: "fandom",
    chineseMeaning: "salt"
  },
  {
    term: "salt and burn",
    type: "fandom",
    chineseMeaning: "ritual",
    priority: 80
  }
];

function termsFor(text, items = baseItems, options = {}) {
  return buildVocabularyPreview(text, items, options).map((item) => item.term);
}

assert.deepEqual(
  termsFor("The relentless rain kept falling."),
  ["relentless"],
  "matches an exact word"
);

assert.deepEqual(
  termsFor("The RELENTLESS rain kept falling."),
  ["relentless"],
  "matches case-insensitively"
);

assert.deepEqual(
  termsFor("We should hit the road before sunrise."),
  ["hit the road"],
  "matches phrases and idioms"
);

assert.deepEqual(
  termsFor("Relentless pressure felt relentless."),
  ["relentless"],
  "does not duplicate a repeated term"
);

const manyItems = Array.from({ length: 35 }, (_, index) => ({
  term: `term${index}`,
  type: "test",
  chineseMeaning: `meaning ${index}`
}));
const manyText = manyItems.map((item) => item.term).join(" ");

assert.equal(
  buildVocabularyPreview(manyText, manyItems, { limit: 15 }).length,
  15,
  "respects the max preview limit"
);

assert.deepEqual(
  termsFor("They needed to salt and burn the bones."),
  ["salt and burn"],
  "prefers the longer phrase over a nested shorter match"
);

const [match] = findVocabularyMatches("The relentless rain kept falling.", baseItems);
assert.equal(
  match.item.sourceSentence,
  "The relentless rain kept falling.",
  "captures the source sentence"
);

assert.equal(
  match.item.englishDefinition,
  "continuing without stopping",
  "preserves englishDefinition for lightweight bubble display"
);

assert.equal(match.item.ieltsUsage, "relentless pressure", "preserves IELTS usage");
assert.equal(match.item.priority, 70, "normalizes and preserves priority");
assert.equal(match.item.source, "test_seed", "preserves curated source tag");

const previewHtml = renderVocabularyPreviewItem(match.item);
assert.ok(previewHtml.includes("relentless"), "renders the matched term in Preview");
assert.ok(previewHtml.includes("persistent"), "renders Chinese meaning in Preview");
assert.ok(previewHtml.includes("continuing without stopping"), "renders English definition in Preview");
assert.ok(previewHtml.includes("relentless pressure"), "renders IELTS usage in Preview");
assert.ok(!previewHtml.includes("Source sentence"), "does not render a blank legacy source-sentence label");
assert.ok(!/>\s*-\s*</.test(previewHtml), "does not render blank dash-only Preview content");

assert.equal(
  renderVocabularyPreviewItem({ chineseMeaning: "missing term" }),
  "",
  "skips malformed Preview items without a term"
);

const fallbackHtml = renderVocabularyPreviewItem({
  term: "unknown term",
  type: "ielts"
});
assert.ok(fallbackHtml.includes("暂无中文释义"), "uses compact Chinese fallback when meaning is missing");

const rankedTerms = termsFor(
  "The fragile plan failed, so we had to figure out another way.",
  [
    {
      term: "fragile",
      type: "ielts",
      chineseMeaning: "delicate",
      priority: 20
    },
    {
      term: "figure out",
      type: "phrasal_verb",
      chineseMeaning: "understand",
      priority: 95
    }
  ]
);
assert.deepEqual(
  rankedTerms,
  ["figure out", "fragile"],
  "ranks high-priority phrasal verbs above low-priority single words"
);

const previewItems = [
  {
    term: "relentless",
    type: "ielts",
    chineseMeaning: "persistent"
  },
  {
    term: "hit the road",
    type: "idiom",
    chineseMeaning: "leave"
  },
  {
    term: "muggle",
    type: "fandom",
    chineseMeaning: "non-magic person"
  },
  {
    term: "salty",
    type: "slang",
    chineseMeaning: "annoyed"
  }
];

const personalizationState = {
  selectedLevel: "level3",
  baseline: { level: "level3", words: [] },
  normalizedProfile: {
    selectedLevel: "level3",
    knownWords: ["relentless"],
    learningWords: ["hit the road"],
    ignoredWords: ["muggle"],
    preferredCategories: ["ielts", "fiction", "slang"],
    updatedAt: 1
  },
  effectiveKnownWords: new Set(["relentless", "hit the road", "muggle", "salty"]),
  counts: {}
};

const knownFilteredItems = filterVocabularyPreviewItems(previewItems, personalizationState);
assert.deepEqual(
  knownFilteredItems.map((item) => item.term),
  ["hit the road"],
  "filters known and ignored words by default while keeping learning words"
);
assert.equal(
  knownFilteredItems[0].personalization.reason,
  "learning-word",
  "marks learning-word overrides with metadata"
);
assert.equal(
  knownFilteredItems[0].personalization.boostedByLearningWords,
  true,
  "marks learning words as boosted"
);

const highValueDefault = filterVocabularyPreviewItems(
  [{ term: "salty", type: "slang", chineseMeaning: "annoyed" }],
  {
    normalizedProfile: { learningWords: [] },
    effectiveKnownWords: new Set(["salty"])
  }
);
assert.deepEqual(highValueDefault, [], "hides known high-value slang by default");

const highValueKept = filterVocabularyPreviewItems(
  [{ term: "salty", type: "slang", chineseMeaning: "annoyed" }],
  {
    normalizedProfile: { learningWords: [] },
    effectiveKnownWords: new Set(["salty"])
  },
  { keepHighValueKnownItems: true }
);
assert.equal(highValueKept.length, 1, "can keep known high-value slang when requested");
assert.equal(
  highValueKept[0].personalization.reason,
  "high-value-known",
  "marks high-value known items with metadata when kept"
);

const originalPreviewItems = [
  {
    term: "Relentless",
    type: "ielts",
    chineseMeaning: "persistent",
    personalization: { existing: true }
  }
];
const originalSnapshot = JSON.stringify(originalPreviewItems);
const noMutationResult = filterVocabularyPreviewItems(
  originalPreviewItems,
  {
    normalizedProfile: { learningWords: ["relentless"] },
    effectiveKnownWords: new Set(["relentless"])
  }
);
assert.equal(
  JSON.stringify(originalPreviewItems),
  originalSnapshot,
  "does not mutate input arrays or item objects"
);
assert.notEqual(noMutationResult[0], originalPreviewItems[0], "returns new item objects when adding metadata");
assert.equal(noMutationResult[0].personalization.existing, true, "preserves existing personalization metadata");

const maxItemsResult = filterVocabularyPreviewItems(
  [
    { term: "one", type: "ielts" },
    { term: "two", type: "ielts" },
    { term: "three", type: "ielts" }
  ],
  {
    normalizedProfile: { learningWords: [] },
    effectiveKnownWords: new Set()
  },
  { maxItems: 2 }
);
assert.deepEqual(
  maxItemsResult.map((item) => item.term),
  ["one", "two"],
  "respects maxItems when provided"
);

const filteringExplanation = explainVocabularyPreviewFiltering(previewItems, personalizationState, {
  keepHighValueKnownItems: true,
  maxItems: 2
});
assert.deepEqual(
  filteringExplanation.visibleItems.map((item) => item.term),
  ["hit the road", "salty"],
  "explains visible filtered items"
);
assert.equal(filteringExplanation.counts.input, 4, "reports input count");
assert.equal(filteringExplanation.counts.visible, 2, "reports visible count");
assert.equal(filteringExplanation.counts.hiddenKnown, 2, "reports known hidden count");
assert.equal(filteringExplanation.counts.keptLearning, 1, "reports learning words kept");
assert.equal(filteringExplanation.counts.keptHighValue, 1, "reports high-value known items kept");

console.log("vocabEngine tests passed");
