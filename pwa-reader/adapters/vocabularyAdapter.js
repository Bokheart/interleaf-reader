import { normalizeTerm, buildVocabularyPreview } from "../vocabEngine.js";
import {
  addLearningWord,
  getVocabularyProfile as getStoredVocabularyProfile,
  ignoreVocabularyWord,
  markWordKnown,
  restoreVocabularyWord
} from "../storage.js";

const STATE_TO_FIELD = Object.freeze({
  known: "knownWords",
  learning: "learningWords",
  hidden: "ignoredWords"
});

export function createVocabularyAdapter(deps = {}) {
  const api = {
    buildVocabularyPreview: deps.buildVocabularyPreview || buildVocabularyPreview,
    getVocabularyProfile: deps.getVocabularyProfile || getStoredVocabularyProfile,
    markWordKnown: deps.markWordKnown || markWordKnown,
    addLearningWord: deps.addLearningWord || addLearningWord,
    ignoreVocabularyWord: deps.ignoreVocabularyWord || ignoreVocabularyWord,
    restoreVocabularyWord: deps.restoreVocabularyWord || restoreVocabularyWord
  };

  return {
    getChapterPreview(chapter = {}, vocabularyItems = [], options = {}) {
      return api.buildVocabularyPreview(chapter.plainText || "", vocabularyItems, options);
    },

    getVocabularyProfile() {
      return api.getVocabularyProfile();
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
export const getVocabularyProfile = vocabularyAdapter.getVocabularyProfile;
export const setTermState = vocabularyAdapter.setTermState;
export const listVocabulary = vocabularyAdapter.listVocabulary;
export const getTermMetadata = vocabularyAdapter.getTermMetadata;
