import { normalizeTerm, buildVocabularyPreview, loadVocabularyData, filterVocabularyPreviewItems } from "../vocabEngine.js";
import { loadEffectiveKnownWordsForProfile } from "../levelBaselineEngine.js";
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
    loadVocabularyData: deps.loadVocabularyData || loadVocabularyData,
    loadEffectiveKnownWordsForProfile: deps.loadEffectiveKnownWordsForProfile || loadEffectiveKnownWordsForProfile,
    buildVocabularyPreview: deps.buildVocabularyPreview || buildVocabularyPreview,
    getVocabularyProfile: deps.getVocabularyProfile || getStoredVocabularyProfile,
    markWordKnown: deps.markWordKnown || markWordKnown,
    addLearningWord: deps.addLearningWord || addLearningWord,
    ignoreVocabularyWord: deps.ignoreVocabularyWord || ignoreVocabularyWord,
    restoreVocabularyWord: deps.restoreVocabularyWord || restoreVocabularyWord
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
export const setTermState = vocabularyAdapter.setTermState;
export const listVocabulary = vocabularyAdapter.listVocabulary;
export const getTermMetadata = vocabularyAdapter.getTermMetadata;
