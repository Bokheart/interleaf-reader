# Interleaf Reader — Product Requirements Document

## 1. Document Control

| Field | Value |
| --- | --- |
| **Title** | Interleaf Reader — Product Requirements Document |
| **Version** | 2.0 |
| **Date** | 2026-06-20 |
| **Status** | Active — canonical product specification |
| **Product name** | Interleaf Reader |
| **Former codename** | Slash Reader v2 |
| **Internal creator brand** | BookHeart |
| **Audience** | Product owner, maintainers, contributors, AI coding agents, and future reviewers |

### 1.1 Purpose

This document defines stable product truth:

* target users;
* user problems;
* product identity and boundaries;
* core journeys;
* product-level requirements;
* vocabulary semantics;
* reading-mode semantics;
* long-term direction.

It is not:

* an implementation-status report;
* a task tracker;
* a test log;
* a branch or commit record;
* a detailed architecture specification;
* an AI operating guide;
* a milestone execution record.

### 1.2 Source-of-truth responsibilities

| Document | Responsibility |
| --- | --- |
| `docs/INTERLEAF_READER_PRD.md` | Canonical product definition |
| `docs/PROJECT_STATE.md` | Current implementation, verification, blockers, and next action |
| `docs/MILESTONES.md` | Milestone order, scope, and exit criteria |
| `docs/DECISION_LOG.md` | Durable product, architecture, privacy, compatibility, and governance decisions |
| `docs/ARCHITECTURE.md` | Current technical architecture |
| `docs/DATA_MODEL.md` | Current persisted-data and compatibility contracts |
| `docs/HANDOFF.md` | Setup, testing, smoke, troubleshooting, and operational handoff |
| `AGENTS.md` | AI-assisted repository rules |

When sources disagree:

1. product meaning follows this PRD;
2. current status follows `docs/PROJECT_STATE.md`;
3. current source code and executable evidence determine code reality;
4. durable exceptions belong in `docs/DECISION_LOG.md`;
5. uncertainty must be reported rather than silently resolved.

---

## 2. Product Summary

Interleaf Reader is a **mobile-first, local-first, reading-first long-form English reader** for non-native English readers who have some English ability but experience resistance, fatigue, or anxiety when facing long English texts.

Many target users have an ongoing English-learning goal, such as IELTS preparation, academic reading improvement, or long-term language development. They may still lack sustained English-language exposure and struggle to remain inside a long English text.

Interleaf Reader helps users begin with content they genuinely enjoy:

* novels;
* web fiction;
* fanfiction;
* serialized stories;
* other interest-driven long-form English texts.

Story interest and emotional motivation help users gradually:

* reduce resistance to long English texts;
* stay inside an English reading session longer;
* build tolerance for sustained reading;
* reduce unnecessary context switching;
* collect useful vocabulary without turning reading into homework.

Interleaf Reader supports reading with lightweight vocabulary assistance, local progress persistence, vocabulary collection, and export to the user’s existing study tools.

It does not replace a dedicated dictionary, translation platform, exam-training platform, or vocabulary-learning application.

---

## 3. Vision and Product Promise

### 3.1 Vision

> Help non-native English readers use stories they genuinely care about to become comfortable with long-form English reading.

### 3.2 Core reading loop

> **Import → Read → Receive lightweight in-context vocabulary assistance → Save useful words → Continue reading → Restore progress**

The user should not need to repeatedly switch among a reader, translator, dictionary, notes app, and vocabulary app for routine reading support.

### 3.3 External vocabulary-capture loop

> **Encounter a word elsewhere → Manually record it → Accumulate terms → Export → Study in an existing vocabulary application**

This is related to reading support but is a separate workflow.

### 3.4 Product promise

Interleaf Reader should help the user:

* start reading despite resistance;
* remain immersed in a story;
* obtain enough vocabulary support to continue;
* preserve reading progress;
* collect useful words with minimal effort;
* connect casual vocabulary discovery with an existing learning system.

It does not promise:

* complete dictionary coverage;
* automatic explanation for every manually entered word;
* vocabulary mastery;
* automatic exam-score improvement;
* perfect machine translation;
* cloud availability across devices.

---

## 4. Target Users

### 4.1 Primary user

The primary user:

* is a non-native English reader;
* has a basic or intermediate English foundation;
* has an ongoing English-learning goal;
* may be preparing for IELTS or another English-related exam;
* lacks sustained English-language exposure;
* can often understand individual sentences but resists long passages;
* may feel tired, intimidated, or discouraged by uninterrupted English pages;
* enjoys novels, web fiction, fanfiction, or other entertainment-oriented long-form content;
* is motivated by favorite stories, characters, relationships, or topics;
* wants lightweight vocabulary support without repeatedly leaving the story;
* wants to save useful words without turning reading into drills;
* may already use a dedicated vocabulary-learning app and wants to export collected words.

### 4.2 Capability assumptions

Interleaf Reader is not designed primarily for complete beginners.

The product may assume the user can:

* recognize common English sentence structures;
* read short passages;
* understand some vocabulary without assistance;
* decide which words are personally useful;
* import a personal reading file;
* use another learning tool for deeper memorization.

The product should still reduce cognitive pressure and avoid requiring technical expertise.

### 4.3 Illustrative personas

#### Interest-driven exam learner

Has an IELTS or academic-English goal but struggles to sustain long-form reading. Uses fiction to build tolerance and exposure.

#### Fanfiction or web-fiction reader

Is motivated by characters, relationships, fandoms, or serialized plots. Needs lightweight help with vocabulary, slang, idioms, and proper nouns.

#### Returning mobile reader

Reads in short phone sessions and needs reliable persistence, navigation, and quick return to the previous position.

#### Everyday vocabulary collector

Encounters useful words in media, websites, advertisements, classes, or daily life and wants to export them into an existing study application.

---

## 5. User Problems

### 5.1 Long-form English resistance

The main problem is not only unknown words.

Long English texts can create:

* psychological resistance;
* visual overload;
* reading fatigue;
* fear of not understanding enough;
* pressure to look up every unknown word;
* loss of motivation before the story becomes engaging.

Interleaf should reduce this barrier without removing English from the experience.

### 5.2 Broken immersion

A conventional workflow often becomes:

> Read → Encounter unknown word → Copy → Open dictionary → Search → Interpret → Return → Find location → Resume

Repeated context switching interrupts narrative memory, emotional engagement, reading rhythm, and willingness to continue.

Interleaf should provide only the assistance necessary to continue.

### 5.3 Fragmented vocabulary collection

Useful vocabulary may appear in books, television, films, games, websites, advertisements, classes, and daily life.

Interleaf should provide a lightweight collection layer that connects these discoveries to the user’s existing study system.

### 5.4 Reading becoming homework

The product must not require users to:

* save every unknown word;
* complete a quiz after each chapter;
* review cards before continuing;
* maintain a streak;
* clear a vocabulary queue;
* prove mastery before reading more.

Reading remains the primary activity.

---

## 6. Product Positioning

### 6.1 Positioning statement

Interleaf Reader is an **interest-driven long-form English reading tool** where vocabulary support, local persistence, and future multilingual capabilities exist to protect reading continuity.

### 6.2 Product priority

1. Sustained reading
2. Narrative immersion
3. Reduced vocabulary friction
4. Vocabulary collection
5. Export into an existing study system
6. Future multilingual reading support

Vocabulary management must not overtake reading as the product center.

### 6.3 Interleaf Reader is

* a mobile-first long-form reader;
* a local-first personal reading environment;
* an English-reading support tool;
* an interest-driven language-exposure tool;
* a lightweight vocabulary collection and export layer;
* a future foundation for controlled multilingual reading modes.

### 6.4 Interleaf Reader is not

* a general dictionary;
* a universal word-search tool;
* a flashcard or spaced-repetition system;
* a quiz, drill, streak, or gamification product;
* an IELTS question bank or mock-test platform;
* a generic document translator;
* a public EPUB or translation library;
* a social reading network;
* a cloud bookshelf;
* an AO3 scraper;
* a platform for hosting copyrighted books or fanfiction exports.

---

## 7. Product Principles

### Reading-first

Every major feature should help the user start, continue, understand enough, return to position, or reduce interruption.

### Interest-driven exposure

Entertainment-oriented reading is a legitimate mechanism for sustained English exposure.

The product must not shame or devalue personally meaningful reading.

### Lightweight assistance

Vocabulary support should provide enough information to continue, not every possible dictionary detail.

### User-controlled vocabulary

The user decides whether a word is Known, worth saving, irrelevant, worth manually recording, or ready to export.

### Local-first by default

Books, progress, preferences, and vocabulary remain on-device unless a future approved feature explicitly requires external transmission.

### Honest capability boundaries

Placeholder and planned features must not appear functional when they are not.

### Fail-open reading

Optional support features must not unnecessarily block startup, import, first chapter, English Study Mode, or basic navigation.

---

## 8. Core User Journeys

### Journey A — Import and read

1. Open Interleaf Reader.
2. Import a personal EPUB or open a saved local book.
3. Read available metadata and chapters.
4. Open the first chapter or restore the previous location.
5. Read in English Study Mode.
6. Store progress locally.

**Outcome:** The user reaches the story with minimal setup and no required account.

### Journey B — In-context vocabulary assistance

1. Encounter an unfamiliar interactive term.
2. Tap the term.
3. View a lightweight bubble.
4. Read concise assistance.
5. Close it and continue.

**Boundary:** This is not arbitrary dictionary search.

### Journey C — Preview chapter vocabulary

1. Open Vocabulary Preview.
2. View a limited prioritized list.
3. Mark terms as Known, Save, or Hide.
4. Return to the chapter.

**Outcome:** Preview reduces future interruption without becoming mandatory study.

### Journey D — Save a reading-context term

1. Select Save from Reader or Preview.
2. Add the term to Vocabulary Library.
3. Continue reading.

### Journey E — Capture an external term

1. Encounter a word outside Interleaf.
2. Open Vocabulary Library.
3. Enter the word or short phrase.
4. Normalize and store it in Learning.
5. Export later.

**Boundary:** Manual Add does not promise definition, translation, pronunciation, morphology, examples, synonyms, collocations, difficulty classification, or automatic enrichment.

### Journey F — Export vocabulary

1. Open Vocabulary Library.
2. Review accumulated terms.
3. Choose a supported copy or download action.
4. Transfer the terms into another study system.

**Outcome:** Interleaf connects discovery and reading with an existing learning workflow.

### Journey G — Resume reading

1. Leave the application.
2. Return later.
3. Open Continue Reading or Local Library.
4. Restore the relevant chapter and approximate position.

---

## 9. Vocabulary Model

### 9.1 Two inputs

#### Reading-context vocabulary

Comes from the current chapter, Vocabulary Preview, or an interactive Reader term.

These entries may include contextual metadata when available.

#### External manual vocabulary

Is typed into Vocabulary Library and may initially contain only the normalized term, status, timestamps, and required internal identifiers.

A missing definition does not make capture unsuccessful.

### 9.2 Vocabulary Library responsibility

Vocabulary Library is responsible for:

* collecting terms;
* preserving user decisions;
* displaying local lists;
* manual capture;
* removing or changing status;
* preventing obvious duplicates;
* export;
* local backup and restore when supported.

It is not responsible for:

* teaching every word;
* testing recall;
* scheduling reviews;
* scoring memory strength;
* enforcing a learning sequence;
* generating streaks;
* guaranteeing dictionary completeness.

### 9.3 Actions

| Action | Product meaning | Expected effect |
| --- | --- | --- |
| **Known** | User already knows the term | Exclude it from future recommendations where applicable and preserve the choice |
| **Save** | User wants to keep or study it later | Add it to Learning |
| **Hide** | Not a useful learning target | Exclude it while preserving the choice |
| **Manual Add** | Capture a term encountered elsewhere | Add the normalized term without promising enrichment |
| **Remove** | User no longer wants the entry | Remove or update the local entry |
| **Export** | Transfer collected vocabulary elsewhere | Produce a supported term list or backup representation |

### 9.4 Known and Mastered

The current product may display a **Mastered** tab for words recorded as Known.

This does not mean Interleaf taught, tested, measured, or confirmed mastery.

A true mastery lifecycle requires a separate product decision.

### 9.5 Vocabulary level

A vocabulary-level preference may help filter Preview terms.

It is not:

* a formal diagnosis;
* an IELTS score prediction;
* a mandatory placement test;
* a restriction on what the user may read.

---

## 10. Core Requirements

### 10.1 Personal EPUB import

The product should:

* accept EPUB through clear file selection;
* provide understandable failure feedback;
* extract available metadata;
* discover readable chapters;
* use fallback chapter labels;
* avoid uploading books to a remote Interleaf service in the local-first baseline.

### 10.2 Home and Local Library

Home should provide entry to:

* import;
* Continue Reading;
* Local Library;
* Vocabulary Library;
* Help or Settings when included.

Local Library contains user-imported books stored in the current browser or device and remains distinct from Vocabulary Library.

### 10.3 Reader

The Reader should provide:

* readable long-form text;
* vertical scrolling by default;
* chapter navigation;
* Contents;
* progress information;
* return to Home during a chapter;
* mobile-accessible controls;
* hideable controls;
* restoration of stored reading position.

Pagination is not required for the core baseline.

### 10.4 Reading progress

The product should restore:

* selected book;
* current chapter;
* approximate position;
* compatible reader state.

Approximate scroll restoration is acceptable.

Exact EPUB CFI restoration is a possible future improvement.

### 10.5 Vocabulary Preview

Preview should:

* show a limited prioritized chapter list;
* avoid every unknown token;
* support Known, Save, and Hide;
* reflect saved and filtered state;
* fail safely when data is unavailable;
* never block chapter rendering.

### 10.6 In-text vocabulary bubble

The bubble should:

* open from an interactive term;
* remain compact;
* provide concise help;
* close quickly;
* avoid covering excessive text;
* support mobile positioning;
* return attention to reading.

It may include the term, a short Chinese meaning, brief English definition, and limited usage label.

It must not become a full dictionary page.

### 10.7 Vocabulary Library

Vocabulary Library should support:

* Learning;
* Known or Mastered archive;
* Hidden;
* manual capture;
* removal or status change;
* copy or download export;
* local persistence;
* local backup and restore when included.

It must not pressure the user to finish vocabulary work before reading.

### 10.8 Export and backup

Supported outputs may include:

* copied term lists;
* plain-text word lists;
* CSV;
* versioned local backup formats.

Documentation must distinguish an external-study export from a restorable Interleaf backup.

Compatibility with every external application is not guaranteed.

### 10.9 Built-in Guide

The Guide may teach import, navigation, Preview, vocabulary actions, Local Library, Vocabulary Library, export, Settings, and placeholder boundaries.

It behaves as a special virtual book, not a user-imported EPUB.

Human-authored multilingual Guide content does not enable imported-book translation.

### 10.10 Settings and Help

Settings may include interface language, vocabulary level, Guide access, local-data actions, and backup or restore.

Help must describe actual behavior and must not advertise planned features as complete.

---

## 11. Interface Language and Reading Modes

### 11.1 Interface Language

Controls application labels, buttons, messages, dialogs, Help, Settings, and accessibility text.

Changing Interface Language must not automatically alter imported book text, chapter, vocabulary decisions, or Reading Mode.

### 11.2 Reading Mode

Controls book-content presentation and is independent from Interface Language.

### 11.3 English Study Mode

Is the core reading experience and presents original English content with optional Preview, interactive terms, bubbles, and vocabulary actions.

It must remain usable when future translation services are unavailable.

### 11.4 Chinese Reading Mode

For imported books, remains a placeholder until:

* a real Translation Version exists;
* output can be stored and retrieved safely;
* provider and privacy boundaries are approved;
* original and generated content remain distinguishable;
* chapter and position relationships are preserved.

### 11.5 Mixed Mode

For imported books, remains a placeholder until:

* a real Chinese or aligned Translation Version exists;
* English-retention rules are defined;
* output is traceable to source;
* users can understand what was generated and how.

### 11.6 Guide exception

The built-in Guide may use manually authored Chinese or Mixed variants.

This is not machine translation or evidence of imported-book multilingual support.

---

## 12. Local-First Data and Privacy

Local data may include:

* imported EPUBs;
* book metadata;
* reading progress;
* vocabulary profile;
* preferences;
* Guide state;
* user-created export or backup data.

No account is required for the core reading workflow.

Users are responsible for importing content they have the right to access.

Interleaf must not host copyrighted books, distribute fanfiction exports, publish imported EPUBs, operate as a public translated-book library, or scrape reading platforms.

Before sending book text or vocabulary data outside the device, the project must define:

* what is sent;
* destination;
* purpose;
* consent;
* credential handling;
* storage;
* failure behavior.

Provider keys and developer-owned secrets must never be embedded in public frontend code.

Analytics are not required and need separate product and privacy approval.

---

## 13. UX Requirements

### Mobile-first

Support readable line length, touch-friendly controls, safe popup placement, no hover dependency, and access to Home during a chapter.

### Low interruption

Avoid unnecessary confirmations. Use clear confirmation for destructive actions such as forgetting a book or replacing profile data.

### Calm hierarchy

The story should dominate the screen. Controls and vocabulary support should appear when needed without competing with the text.

### Optional assistance

Users may ignore Preview, bubbles, vocabulary actions, export, and future translation modes.

### Clear feedback

Report import, save, remove, export, backup, restore, placeholder, and local-storage outcomes concisely.

### Accessibility and localization

Controls should have meaningful labels, keyboard and focus behavior where applicable, localized accessibility text, and preserved user content.

---

## 14. Current MVP Boundary

The current MVP centers on the complete English reading loop:

* personal EPUB import;
* Home;
* Reader;
* Local Library;
* chapter navigation;
* local progress;
* English Study Mode;
* Vocabulary Preview;
* interactive in-context assistance;
* Known, Save, and Hide;
* Vocabulary Library;
* external manual capture;
* vocabulary export;
* local-first storage;
* honest Chinese and Mixed placeholders.

The current tracked runtime also includes Guide, Settings, Help, interface-language foundations, TXT export, and vocabulary backup and restore.

Exact implementation and verification status belongs in `docs/PROJECT_STATE.md`.

---

## 15. Explicit Non-goals

The current product commitment excludes:

* general dictionary search;
* automatic enrichment of every manual term;
* flashcards, spaced repetition, quizzes, streaks, or mandatory tests;
* IELTS mock exams, question practice, or score prediction;
* cloud accounts or cross-device synchronization;
* social bookshelves or public communities;
* public book or translation hosting;
* AO3 scraping;
* real imported-book Chinese Mode;
* real imported-book Mixed Mode;
* browser-exposed provider secrets;
* automatic whole-book translation without explicit user control;
* guaranteed full offline operation before implementation and verification.

Changing one of these requires a deliberate product decision.

---

## 16. Future Direction

### Translation Versions

A future Book Project may contain source versions, imported or generated Translation Versions, provenance, chapter relationships, alignment data, and generated Mixed artifacts.

A Translation Version must not overwrite or impersonate the source.

### Provider-assisted translation

Future translation may include provider-agnostic interfaces, user-controlled generation, protected terms, local caching, queues, failure recovery, and cost or limit disclosure.

Credentials, privacy, and consent must be approved first.

### Real Chinese Reading Mode

May become available when a valid Translation Version exists and book identity, provenance, chapter relationships, progress continuity, and user control are preserved.

### Real Mixed Mode

May use a Chinese Translation Version as base, selected English targets, explicit retention rules, alignment, and reproducible settings.

It remains a reading mode, not a cloze test.

### PWA and offline resilience

Future release work may improve installability, app-shell caching, dependency vendoring, updates, offline startup, and deployment verification.

Private EPUB data must not enter inappropriate shared caches.

### Vocabulary enrichment

May improve reading-context entries with richer definitions, pronunciation, morphology, collocations, usage labels, or source metadata.

This does not authorize general dictionary search or automatic enrichment of every manual term.

### Sync-lite

Portable backup and restore may support limited device transfer without accounts or cloud synchronization.

Any cloud service requires separate product, privacy, security, and maintenance decisions.

---

## 17. Success Criteria

Interleaf succeeds when target users can:

* begin a long English text they care about;
* continue despite unfamiliar vocabulary;
* avoid leaving Reader for routine assistance;
* return quickly after opening vocabulary help;
* preserve progress;
* save useful words with little effort;
* capture external vocabulary;
* export into an existing learning workflow;
* understand which features are real and which are placeholders.

Guardrails:

* EPUB import and first chapter remain reliable;
* English Study Mode remains available when optional modules fail;
* vocabulary features do not block reading;
* Manual Add does not pretend to be dictionary lookup;
* Chinese and Mixed placeholders do not pretend to generate translation;
* local user content is not silently uploaded;
* the product does not become a drill application.

Early evaluation may use dogfooding, structured smoke tests, issue reports, interviews, reading-session feedback, and restore/export verification.

Analytics are not required.

---

## 18. Product Change Control

Product review is required when a proposal would:

* change the target user;
* change the core reading loop;
* introduce arbitrary dictionary search;
* automatically enrich manual terms;
* introduce drills, flashcards, streaks, or spaced repetition;
* add cloud accounts or synchronization;
* send book content to an external service;
* add a real translation provider;
* change Known, Save, Hide, Learning, or Mastered semantics;
* alter local-storage compatibility;
* claim real Chinese or Mixed support;
* host, scrape, or redistribute third-party content.

Approved changes must update:

1. this PRD when product meaning changes;
2. `docs/DECISION_LOG.md` when the decision is durable;
3. `docs/PROJECT_STATE.md` when implementation status changes;
4. `docs/MILESTONES.md` when delivery scope changes;
5. privacy or architecture documents when data flow changes.

New ideas do not automatically enter the Active milestone.

---

## 19. Product Glossary

| Term | Definition |
| --- | --- |
| **Interleaf Reader** | Product name |
| **BookHeart** | Creator or internal brand |
| **Reading-first** | Reading continuity takes priority over vocabulary management |
| **Interest-driven reading** | Personally engaging texts used to encourage sustained English exposure |
| **English Study Mode** | Original English text with optional vocabulary assistance |
| **Chinese Reading Mode** | Future mode based on a real Chinese Translation Version; placeholder for imported books |
| **Mixed Mode** | Future Chinese-base mode retaining selected English terms; placeholder for imported books |
| **Interface Language** | Language of application controls and messages |
| **Reading Mode** | Presentation mode used for book or Guide content |
| **Vocabulary Preview** | Limited chapter-level prioritized vocabulary list |
| **Vocabulary bubble** | Lightweight in-context assistance |
| **Vocabulary Library** | Local collection, organization, backup, and export layer |
| **Manual Add** | Capture of a term without promised enrichment |
| **Known** | User reports already knowing the term |
| **Save** | Keep the term in Learning |
| **Hide** | Exclude the term as a learning target |
| **Mastered** | Current archive label for Known terms; not tested mastery |
| **Local Library** | User-imported books stored in the current browser or device |
| **Translation Version** | Distinct imported or generated translation with provenance |
| **Protected term** | Name, proper noun, fandom term, or expression translation should preserve |
| **Local-first** | Core user data remains on-device by default |
| **Vocabulary export** | Transfer of collected terms to another study system |
| **Profile backup** | Versioned representation intended for Interleaf restoration |
| **Placeholder** | Visible but explicitly non-functional future capability |
| **General dictionary search** | Arbitrary word lookup outside current reading context; not a current capability |

---

## Appendix A — Core Flows

### Reading

```text
Import or open book
→ Read English text
→ Tap an interactive word when needed
→ Receive lightweight assistance
→ Save / Known / Hide when useful
→ Continue reading
→ Restore progress later
```

### External vocabulary capture

```text
Encounter a word outside Interleaf
→ Open Vocabulary Library
→ Manually add the term
→ Accumulate locally
→ Export
→ Study in an existing application
```

### Future multilingual flow

```text
Original book
→ Add or generate a Translation Version
→ Preserve provenance and alignment
→ Enable Chinese Reading Mode
→ Generate or display Mixed Mode
```

---

## Appendix B — Requirement Language

| Term | Meaning |
| --- | --- |
| **Must** | Required product behavior or boundary |
| **Should** | Strong expectation; exceptions require justification |
| **May** | Optional or stage-dependent |
| **Current MVP** | Current committed English reading and vocabulary-collection scope |
| **Future** | Not part of current implementation commitment |
| **Placeholder** | UI may exist, but capability is not implemented |
| **Product decision required** | Implementation must not begin until scope is explicitly resolved |

---

*End of Interleaf Reader PRD v2.0*
