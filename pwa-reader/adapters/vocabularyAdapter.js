import { normalizeTerm, buildVocabularyPreview, loadVocabularyData, filterVocabularyPreviewItems } from "../vocabEngine.js";
import { loadEffectiveKnownWordsForProfile } from "../levelBaselineEngine.js";
import {
  addLearningWord,
  createVocabularyProfileBackup,
  getVocabularyProfile as getStoredVocabularyProfile,
  ignoreVocabularyWord,
  markWordKnown,
  parseVocabularyProfileBackupJson,
  restoreVocabularyWord,
  saveVocabularyProfile,
  setVocabularyComfortLevel
} from "../storage.js";

export const MANUAL_VOCABULARY_MAX_LENGTH = 80;
export const VOCABULARY_LEVELS = Object.freeze([
  "level1",
  "level2",
  "level3",
  "level4",
  "level5"
]);

export function normalizeManualVocabularyTerm(input = "", maxLength = MANUAL_VOCABULARY_MAX_LENGTH) {
  const raw = String(input ?? "").trim().replace(/\s+/g, " ");
  if (!raw) {
    return { ok: false, term: "", reason: "empty", message: "Enter a word or phrase first." };
  }
  const term = raw
    .toLowerCase()
    .replace(/^[^a-z0-9'-]+/i, "")
    .replace(/[^a-z0-9'-]+$/i, "")
    .trim();
  if (!term) {
    return { ok: false, term: "", reason: "empty", message: "Enter a word or phrase first." };
  }
  if (term.length > maxLength) {
    return {
      ok: false,
      term: "",
      reason: "too-long",
      message: `Keep the term at ${maxLength} characters or fewer.`
    };
  }
  return { ok: true, term, reason: "ok", message: "" };
}

function normalizeExportTerms(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map(item => normalizeManualVocabularyTerm(item).term)
    .filter(term => {
      if (!term || seen.has(term)) return false;
      seen.add(term);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

export function getVocabularyExportSections(profile = {}) {
  return [
    { label: "Learning", status: "learning", terms: normalizeExportTerms(profile.learningWords) },
    { label: "Known", status: "mastered", terms: normalizeExportTerms(profile.knownWords) },
    { label: "Hidden", status: "hidden", terms: normalizeExportTerms(profile.ignoredWords) }
  ];
}

export function formatVocabularyLearningText(profile = {}) {
  return getVocabularyExportSections(profile)[0].terms.join("\n");
}

export function formatVocabularyAllText(profile = {}) {
  return getVocabularyExportSections(profile)
    .map(section => [section.label, ...section.terms].join("\n"))
    .join("\n\n");
}

function escapeCsvValue(value = "") {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

export function formatVocabularyCsv(profile = {}) {
  const rows = getVocabularyExportSections(profile).flatMap(section => (
    section.terms.map(term => `${escapeCsvValue(term)},${escapeCsvValue(section.status)}`)
  ));
  return ["term,status", ...rows].join("\n");
}

const STATE_TO_FIELD = Object.freeze({
  known: "knownWords",
  learning: "learningWords",
  hidden: "ignoredWords"
});

export function createVocabularyAdapter(deps = {}) {
  const api = {
    loadVocabularyData: deps.loadVocabularyData || loadVocabularyData,
    loadEffectiveKnownWordsForProfile: deps.loadEffectiveKnownWordsForProfile || loadEffectiveKnownWordsForProfile,
    buildVocabularyPreview: deps.buildVocabularyPreview || buildVocabularyPreview,
    getVocabularyProfile: deps.getVocabularyProfile || getStoredVocabularyProfile,
    markWordKnown: deps.markWordKnown || markWordKnown,
    addLearningWord: deps.addLearningWord || addLearningWord,
    ignoreVocabularyWord: deps.ignoreVocabularyWord || ignoreVocabularyWord,
    restoreVocabularyWord: deps.restoreVocabularyWord || restoreVocabularyWord,
    setVocabularyComfortLevel: deps.setVocabularyComfortLevel || setVocabularyComfortLevel,
    createVocabularyProfileBackup: deps.createVocabularyProfileBackup || createVocabularyProfileBackup,
    parseVocabularyProfileBackupJson: deps.parseVocabularyProfileBackupJson || parseVocabularyProfileBackupJson,
    saveVocabularyProfile: deps.saveVocabularyProfile || saveVocabularyProfile
  };

  let vocabularyDataPromise = null;

  return {
    async getReaderVocabulary() {
      if (!vocabularyDataPromise) {
        vocabularyDataPromise = Promise.resolve().then(() => api.loadVocabularyData()).catch(error => {
          vocabularyDataPromise = null;
          throw error;
        });
      }
      const [items, profile] = await Promise.all([vocabularyDataPromise, api.getVocabularyProfile()]);
      const personalization = await api.loadEffectiveKnownWordsForProfile(profile);
      const excluded = new Set([...(profile.knownWords || []), ...(profile.ignoredWords || [])].map(normalizeTerm));
      const curatedTerms = new Set(items.map(item => normalizeTerm(item.term)));
      const personalLearningItems = [...new Set((profile.learningWords || []).map(normalizeTerm))]
        .filter(term => term && !curatedTerms.has(term))
        .map(term => ({ term }));
      return {
        profile,
        items: filterVocabularyPreviewItems(
          [...items, ...personalLearningItems],
          personalization,
          { keepLearningWords: true }
        )
          .filter(item => !excluded.has(normalizeTerm(item.term)))
      };
    },

    getChapterPreview(chapter = {}, vocabularyItems = [], options = {}) {
      return api.buildVocabularyPreview(chapter.plainText || "", vocabularyItems, options);
    },

    getVocabularyProfile() {
      return api.getVocabularyProfile();
    },

    getLibraryProfile() {
      return api.getVocabularyProfile();
    },

    setLibraryLevel(level) {
      if (!VOCABULARY_LEVELS.includes(level)) {
        throw new Error("Choose a valid Vocabulary Level.");
      }
      return api.setVocabularyComfortLevel(level);
    },

    addLibraryLearningTerm(term) {
      return api.addLearningWord(term);
    },

    removeLibraryTerm(term) {
      return api.restoreVocabularyWord(term);
    },

    async createLibraryExport(kind) {
      const profile = await api.getVocabularyProfile();
      if (kind === "copy-learning") {
        return { kind: "copy", text: formatVocabularyLearningText(profile) };
      }
      if (kind === "download-learning") {
        return {
          kind: "download",
          text: formatVocabularyLearningText(profile),
          filename: "interleaf-reader-bbdc-learning-words.txt",
          mimeType: "text/plain;charset=utf-8"
        };
      }
      if (kind === "copy-all") {
        return { kind: "copy", text: formatVocabularyAllText(profile) };
      }
      if (kind === "download-csv") {
        return {
          kind: "download",
          text: formatVocabularyCsv(profile),
          filename: "interleaf-reader-vocabulary.csv",
          mimeType: "text/csv;charset=utf-8"
        };
      }
      throw new Error("Unsupported vocabulary export.");
    },

    async createLibraryBackup() {
      const profile = await api.getVocabularyProfile();
      return {
        kind: "download",
        text: JSON.stringify(api.createVocabularyProfileBackup(profile), null, 2),
        filename: "interleaf-reader-vocabulary-profile.json",
        mimeType: "application/json;charset=utf-8"
      };
    },

    restoreLibraryBackup(jsonText) {
      const profile = api.parseVocabularyProfileBackupJson(jsonText);
      return api.saveVocabularyProfile(profile);
    },

    async setTermState(term, state) {
      if (state === "known") {
        return api.markWordKnown(term);
      }

      if (state === "learning") {
        return api.addLearningWord(term);
      }

      if (state === "hidden") {
        return api.ignoreVocabularyWord(term);
      }

      if (state === null || state === undefined || state === "unset") {
        return api.restoreVocabularyWord(term);
      }

      throw new Error(`Unsupported vocabulary state: ${state}`);
    },

    async listVocabulary(state = null) {
      const profile = await api.getVocabularyProfile();

      if (state) {
        return [...(profile[STATE_TO_FIELD[state]] || [])];
      }

      return {
        known: [...(profile.knownWords || [])],
        learning: [...(profile.learningWords || [])],
        hidden: [...(profile.ignoredWords || [])]
      };
    },

    getTermMetadata(term, vocabularyItems = []) {
      const normalized = normalizeTerm(term);

      if (!normalized || !Array.isArray(vocabularyItems)) {
        return null;
      }

      return vocabularyItems.find((item) => normalizeTerm(item?.term) === normalized) || null;
    }
  };
}

const vocabularyAdapter = createVocabularyAdapter();

export const getChapterPreview = vocabularyAdapter.getChapterPreview;
export const getReaderVocabulary = vocabularyAdapter.getReaderVocabulary;
export const getVocabularyProfile = vocabularyAdapter.getVocabularyProfile;
export const getLibraryProfile = vocabularyAdapter.getLibraryProfile;
export const setLibraryLevel = vocabularyAdapter.setLibraryLevel;
export const addLibraryLearningTerm = vocabularyAdapter.addLibraryLearningTerm;
export const removeLibraryTerm = vocabularyAdapter.removeLibraryTerm;
export const createLibraryExport = vocabularyAdapter.createLibraryExport;
export const createLibraryBackup = vocabularyAdapter.createLibraryBackup;
export const restoreLibraryBackup = vocabularyAdapter.restoreLibraryBackup;
export const setTermState = vocabularyAdapter.setTermState;
export const listVocabulary = vocabularyAdapter.listVocabulary;
export const getTermMetadata = vocabularyAdapter.getTermMetadata;
