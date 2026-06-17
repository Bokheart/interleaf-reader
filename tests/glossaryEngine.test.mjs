import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../pwa-reader/glossaryEngine.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { buildBookGlossary, extractGlossaryCandidates, normalizeGlossaryTerm } = await import(moduleUrl);

const globalTerms = [
  {
    term: "Impala",
    category: "object",
    preserveInTranslation: true
  },
  {
    term: "salt and burn",
    category: "phrase",
    preserveInTranslation: true
  }
];

function termsFor(text, protectedTerms = globalTerms) {
  return buildBookGlossary([{ plainText: text }], protectedTerms).map((item) => item.term);
}

const nameText = "Sam opened the door. Dean looked at Sam. Dean closed the trunk.";
const nameTerms = termsFor(nameText);
assert.ok(nameTerms.includes("Sam"), "detects repeated capitalized names");
assert.ok(nameTerms.includes("Dean"), "detects a second repeated capitalized name");

const objectText = "The Arc Reactor hummed. Tony checked the Arc Reactor again. SHIELD arrived.";
const objectTerms = termsFor(objectText, []);
assert.ok(objectTerms.includes("Arc Reactor"), "detects repeated capitalized object terms");
assert.ok(objectTerms.includes("SHIELD"), "detects all-caps fandom or organization terms");

const sentenceStartText = "The door opened. The road was empty. The room was cold. The night was long.";
const sentenceStartTerms = termsFor(sentenceStartText, []);
assert.ok(!sentenceStartTerms.includes("The"), "avoids ordinary repeated sentence-start words");

const globalText = "They climbed into the Impala before dawn.";
const globalGlossary = buildBookGlossary([{ plainText: globalText }], globalTerms);
const impala = globalGlossary.find((item) => item.term === "Impala");
assert.ok(impala, "preserves known global terms like Impala");
assert.equal(impala.recommendedAction, "preserve", "global protected terms recommend preserve");
assert.ok(impala.badTranslationWarnings.length > 0, "global protected terms carry translation warnings");

const candidates = extractGlossaryCandidates(
  "They had to salt and burn the bones. The salt and burn plan worked.",
  globalTerms
);
assert.ok(
  candidates.some((candidate) => candidate.term === "salt and burn"),
  "detects fandom-like phrases"
);

assert.equal(
  normalizeGlossaryTerm({ term: "   " }),
  null,
  "skips glossary rows with missing terms"
);

assert.deepEqual(
  normalizeGlossaryTerm({
    term: " Impala ",
    category: "",
    recommendedAction: "",
    confidence: 1.4,
    badTranslationWarnings: [""]
  }),
  {
    term: "Impala",
    category: "candidate",
    recommendedAction: "review",
    confidence: 1,
    badTranslationWarnings: [],
    reason: ""
  },
  "normalizes glossary rows for safe display"
);

console.log("glossaryEngine tests passed");
