import assert from "node:assert/strict";
import test from "node:test";

import {
  createVocabularyAdapter,
  formatVocabularyAllText,
  formatVocabularyCsv,
  formatVocabularyLearningText,
  normalizeManualVocabularyTerm
} from "../pwa-reader/adapters/vocabularyAdapter.js";
import {
  getAdjacentVocabularyTabId
} from "../pwa-reader/ui-r3/bootstrap.js";
import {
  createVocabularyProfileBackup,
  parseVocabularyProfileBackupJson
} from "../pwa-reader/storage.js";
import { createR3Controller } from "../pwa-reader/ui-r3/controller.js";
import { R3_ROUTES } from "../pwa-reader/ui-r3/routes.js";
import { createInitialR3State, createR3Store } from "../pwa-reader/ui-r3/store.js";
import { createAppShellView } from "../pwa-reader/ui-r3/views/appShellView.js";

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.className = "";
    this.value = "";
    this.disabled = false;
    this.parentNode = null;
    this._textContent = "";
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  get textContent() {
    return `${this._textContent}${this.children.map(child => child.textContent).join("")}`;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "class") this.className = String(value);
    if (name === "disabled") this.disabled = true;
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }
}

function createMockDocument() {
  const documentRef = {
    createElement: tagName => new MockElement(tagName, documentRef),
    createElementNS: (_namespace, tagName) => new MockElement(tagName, documentRef)
  };
  return documentRef;
}

function findAll(root, predicate) {
  const matches = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.shift();
    if (predicate(node)) matches.push(node);
    stack.push(...(node.children || []));
  }
  return matches;
}

function cloneProfile(profile) {
  return JSON.parse(JSON.stringify(profile));
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createProfileAdapter(initialProfile) {
  let profile = cloneProfile(initialProfile);
  let reads = 0;
  const normalize = term => normalizeManualVocabularyTerm(term).term;
  const move = (term, field = null) => {
    const key = normalize(term);
    profile.knownWords = profile.knownWords.filter(item => normalize(item) !== key);
    profile.learningWords = profile.learningWords.filter(item => normalize(item) !== key);
    profile.ignoredWords = profile.ignoredWords.filter(item => normalize(item) !== key);
    if (field) profile[field].push(key);
  };
  return {
    get reads() {
      return reads;
    },
    get profile() {
      return cloneProfile(profile);
    },
    setProfile(nextProfile) {
      profile = cloneProfile(nextProfile);
    },
    adapter: {
      async getLibraryProfile() {
        reads += 1;
        return cloneProfile(profile);
      },
      async getVocabularyProfile() {
        reads += 1;
        return cloneProfile(profile);
      },
      async addLibraryLearningTerm(term) {
        move(term, "learningWords");
      },
      async removeLibraryTerm(term) {
        move(term);
      },
      async setLibraryLevel(level) {
        profile.selectedLevel = level;
      },
      async createLibraryExport() {
        return { kind: "copy", text: "export" };
      },
      async createLibraryBackup() {
        return { kind: "download", text: "{}" };
      },
      async restoreLibraryBackup() {}
    }
  };
}

const initialProfile = {
  selectedLevel: "level3",
  knownWords: ["familiar"],
  learningWords: ["anxious", "quiet phrase"],
  ignoredWords: ["obsolete"],
  preferredCategories: ["ielts"]
};

test("R3 Vocabulary route is enabled and renders stored counts, lists, and level", () => {
  const documentRef = createMockDocument();
  const shell = createAppShellView(documentRef, createInitialR3State({
    initialized: true,
    activeScreen: R3_ROUTES.VOCABULARY,
    vocabulary: {
      status: "ready",
      activeTab: "learning",
      profile: initialProfile,
      busy: false,
      draft: "",
      feedback: { message: "", tone: "neutral" }
    }
  }));

  const vocabularyNav = findAll(shell, node => node.dataset?.route === R3_ROUTES.VOCABULARY)[0];
  const activeTab = findAll(shell, node => node.getAttribute?.("aria-selected") === "true")[0];
  const levelSelect = findAll(shell, node => node.dataset?.action === "vocabulary-level")[0];
  const tabs = findAll(shell, node => node.dataset?.action === "vocabulary-tab");
  const tabPanel = findAll(shell, node => node.getAttribute?.("role") === "tabpanel")[0];
  const manualInput = findAll(shell, node => node.dataset?.role === "vocabulary-manual-term")[0];

  assert.equal(vocabularyNav.disabled, false);
  assert.equal(vocabularyNav.getAttribute("aria-current"), "page");
  assert.match(shell.textContent, /Vocabulary/);
  assert.match(shell.textContent, /2Learning1Known1Hidden/);
  assert.match(shell.textContent, /anxious/);
  assert.match(shell.textContent, /quiet phrase/);
  assert.equal(activeTab.dataset.vocabularyTab, "learning");
  assert.equal(levelSelect.value, "level3");
  assert.deepEqual(tabs.map(tab => tab.getAttribute("tabindex")), ["0", "-1", "-1"]);
  assert.equal(tabPanel.getAttribute("aria-labelledby"), activeTab.id);
  assert.equal(manualInput.getAttribute("maxlength"), null);
});

test("Vocabulary tabs expose wrapped arrow-key navigation without intercepting Tab", () => {
  assert.equal(getAdjacentVocabularyTabId("learning", "ArrowRight"), "known");
  assert.equal(getAdjacentVocabularyTabId("known", "ArrowRight"), "hidden");
  assert.equal(getAdjacentVocabularyTabId("hidden", "ArrowRight"), "learning");
  assert.equal(getAdjacentVocabularyTabId("learning", "ArrowLeft"), "hidden");
  assert.equal(getAdjacentVocabularyTabId("known", "Tab"), "known");
});

test("R3 Vocabulary controller loads actual profiles and switches tabs", async () => {
  const memory = createProfileAdapter(initialProfile);
  const store = createR3Store();
  const controller = createR3Controller({
    store,
    adapters: { vocabulary: memory.adapter }
  });

  await controller.navigate(R3_ROUTES.VOCABULARY);
  assert.equal(store.getState().activeScreen, R3_ROUTES.VOCABULARY);
  assert.deepEqual(store.getState().vocabulary.profile, initialProfile);
  controller.selectVocabularyTab("known");
  assert.equal(store.getState().vocabulary.activeTab, "known");
});

test("manual add moves new, Known, and Hidden terms to Learning and refreshes storage", async () => {
  const memory = createProfileAdapter(initialProfile);
  const store = createR3Store(createInitialR3State({
    vocabulary: {
      ...createInitialR3State().vocabulary,
      status: "ready",
      profile: initialProfile
    }
  }));
  const controller = createR3Controller({ store, adapters: { vocabulary: memory.adapter } });

  await controller.addVocabularyLearningTerm("  New   Phrase  ");
  await controller.addVocabularyLearningTerm("familiar");
  await controller.addVocabularyLearningTerm("obsolete");

  assert.deepEqual(memory.profile.learningWords.sort(), [
    "anxious",
    "familiar",
    "new phrase",
    "obsolete",
    "quiet phrase"
  ]);
  assert.deepEqual(memory.profile.knownWords, []);
  assert.deepEqual(memory.profile.ignoredWords, []);
  assert.ok(memory.reads >= 3);
  assert.deepEqual(store.getState().vocabulary.profile, memory.profile);
});

test("manual add enforces the normalized 80-character limit", async () => {
  assert.deepEqual(normalizeManualVocabularyTerm("  Mixed   CASE!  "), {
    ok: true,
    term: "mixed case",
    reason: "ok",
    message: ""
  });
  assert.equal(normalizeManualVocabularyTerm("x".repeat(80)).term, "x".repeat(80));
  assert.equal(
    normalizeManualVocabularyTerm(`...${"x".repeat(80)}!!!`).term,
    "x".repeat(80)
  );
  assert.equal(normalizeManualVocabularyTerm(`...${"x".repeat(81)}!!!`).reason, "too-long");

  const memory = createProfileAdapter(initialProfile);
  const store = createR3Store(createInitialR3State({
    vocabulary: { ...createInitialR3State().vocabulary, profile: initialProfile }
  }));
  const controller = createR3Controller({ store, adapters: { vocabulary: memory.adapter } });
  await controller.addVocabularyLearningTerm("x".repeat(81));

  assert.deepEqual(memory.profile, initialProfile);
  assert.match(store.getState().vocabulary.feedback.message, /80/);
});

test("an older deferred profile read cannot overwrite a newer mutation refresh", async () => {
  const staleRead = createDeferred();
  let reads = 0;
  let storedProfile = cloneProfile(initialProfile);
  const adapter = {
    async getLibraryProfile() {
      reads += 1;
      if (reads === 1) return staleRead.promise;
      return cloneProfile(storedProfile);
    },
    async addLibraryLearningTerm(term) {
      storedProfile.learningWords.push(term);
    }
  };
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters: { vocabulary: adapter } });

  const olderNavigationLoad = controller.navigate(R3_ROUTES.VOCABULARY);
  await Promise.resolve();
  assert.equal(reads, 1);

  await controller.addVocabularyLearningTerm("newer mutation");
  assert.ok(store.getState().vocabulary.profile.learningWords.includes("newer mutation"));

  staleRead.resolve(cloneProfile(initialProfile));
  await olderNavigationLoad;

  assert.equal(store.getState().activeScreen, R3_ROUTES.VOCABULARY);
  assert.ok(store.getState().vocabulary.profile.learningWords.includes("newer mutation"));
  assert.deepEqual(store.getState().vocabulary.profile, storedProfile);
});

test("remove and level changes use storage pathways then refresh actual profile", async () => {
  const memory = createProfileAdapter(initialProfile);
  const store = createR3Store(createInitialR3State({
    vocabulary: { ...createInitialR3State().vocabulary, profile: initialProfile }
  }));
  const controller = createR3Controller({ store, adapters: { vocabulary: memory.adapter } });

  await controller.removeVocabularyTerm("anxious");
  await controller.setVocabularyLevel("level5");

  assert.deepEqual(memory.profile.learningWords, ["quiet phrase"]);
  assert.equal(memory.profile.selectedLevel, "level5");
  assert.deepEqual(store.getState().vocabulary.profile, memory.profile);
});

test("Reader and Vocabulary Library adapter calls share one global profile", async () => {
  let profile = cloneProfile(initialProfile);
  const move = (term, field) => {
    for (const key of ["knownWords", "learningWords", "ignoredWords"]) {
      profile[key] = profile[key].filter(item => item !== term);
    }
    if (field) profile[field].push(term);
  };
  const adapter = createVocabularyAdapter({
    loadVocabularyData: async () => [{ term: "anxious", englishDefinition: "worried" }],
    loadEffectiveKnownWordsForProfile: async () => ({ knownWords: new Set(), selectedLevel: profile.selectedLevel }),
    getVocabularyProfile: async () => cloneProfile(profile),
    addLearningWord: async term => move(term, "learningWords"),
    restoreVocabularyWord: async term => move(term, null)
  });

  await adapter.setTermState("reader phrase", "learning");
  assert.ok((await adapter.getLibraryProfile()).learningWords.includes("reader phrase"));

  await adapter.addLibraryLearningTerm("library phrase");
  const readerVocabulary = await adapter.getReaderVocabulary();
  assert.ok(readerVocabulary.items.some(item => item.term === "library phrase"));
  assert.ok(readerVocabulary.items.some(item => item.term === "reader phrase"));
});

test("Learning TXT, all-word copy text, and CSV preserve existing export contracts", () => {
  assert.equal(formatVocabularyLearningText(initialProfile), "anxious\nquiet phrase");
  assert.equal(
    formatVocabularyAllText(initialProfile),
    "Learning\nanxious\nquiet phrase\n\nKnown\nfamiliar\n\nHidden\nobsolete"
  );
  assert.equal(
    formatVocabularyCsv(initialProfile),
    "term,status\nanxious,learning\nquiet phrase,learning\nfamiliar,mastered\nobsolete,hidden"
  );
});

test("profile backup restores valid JSON and rejects malformed input without mutation", async () => {
  let savedProfile = cloneProfile(initialProfile);
  let saveCount = 0;
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => cloneProfile(savedProfile),
    createVocabularyProfileBackup,
    parseVocabularyProfileBackupJson,
    saveVocabularyProfile: async profile => {
      saveCount += 1;
      savedProfile = cloneProfile(profile);
      return cloneProfile(profile);
    }
  });
  const backup = createVocabularyProfileBackup({
    ...initialProfile,
    selectedLevel: "level4",
    learningWords: ["restored"]
  }, Date.parse("2026-09-17T00:00:00.000Z"));

  await adapter.restoreLibraryBackup(JSON.stringify(backup));
  assert.equal(saveCount, 1);
  assert.equal(savedProfile.selectedLevel, "level4");
  assert.deepEqual(savedProfile.learningWords, ["restored"]);

  const beforeMalformed = cloneProfile(savedProfile);
  assert.throws(() => adapter.restoreLibraryBackup("{not json"), /valid JSON/);
  const incompleteBackup = { ...backup };
  delete incompleteBackup.ignoredWords;
  assert.throws(
    () => adapter.restoreLibraryBackup(JSON.stringify(incompleteBackup)),
    /Missing vocabulary profile backup field/
  );
  assert.throws(
    () => adapter.restoreLibraryBackup(JSON.stringify({
      ...backup,
      knownWords: ["shared"],
      learningWords: ["Shared"]
    })),
    /more than one list/
  );
  assert.equal(saveCount, 1);
  assert.deepEqual(savedProfile, beforeMalformed);
});

test("controller rejects incomplete restore with zero writes and reloads the stored profile", async () => {
  let saveCount = 0;
  const storedProfile = cloneProfile(initialProfile);
  const adapter = createVocabularyAdapter({
    getVocabularyProfile: async () => cloneProfile(storedProfile),
    parseVocabularyProfileBackupJson,
    saveVocabularyProfile: async profile => {
      saveCount += 1;
      return profile;
    }
  });
  const store = createR3Store();
  const controller = createR3Controller({ store, adapters: { vocabulary: adapter } });
  const incomplete = JSON.stringify({
    schemaVersion: 1,
    exportedAt: "2026-09-17T00:00:00.000Z",
    selectedLevel: "level3",
    knownWords: [],
    learningWords: [],
    ignoredWords: []
  });

  await controller.restoreVocabularyBackup(incomplete);

  assert.equal(saveCount, 0);
  assert.deepEqual(store.getState().vocabulary.profile, storedProfile);
  assert.match(store.getState().vocabulary.feedback.message, /Missing vocabulary profile backup field/);
});
