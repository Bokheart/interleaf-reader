# Interleaf Reader — PRD Source Audit

**Audit date:** 2026-06-16  
**Project path:** `D:\BookHeart\slash reader\slash-reader-v2`  
**Audit type:** Read-only documentation synthesis. No code or data changes.

This document consolidates existing project docs and a light code inspection to support drafting `docs/INTERLEAF_READER_PRD.md` and `docs/INTERLEAF_READER_PRD_CN.md` later. It does **not** replace a full PRD.

---

## 1. Product identity

| Field | Value |
|---|---|
| **Product name** | **Interleaf Reader** (target public name; not yet reflected in app UI or most repo docs) |
| **Former codename** | **Slash Reader v2** (still used in `README.md`, `docs/HANDOFF.md`, `pwa-reader/index.html`, console labels) |
| **Creator / internal brand** | **BookHeart** (workspace path and local dev paths; not branded in app UI) |
| **One-sentence definition** | A local-first English fiction / long-form reading PWA for non-native English readers, where vocabulary and translation features support immersive reading—not memorization drills, generic translation, or social reading. |

### Naming note (from product brief)

“Interleaf” suggests pages, leaves, and layered reading between languages. It fits the planned mixed English–Chinese reading experience (e.g. `Dean opened 门。`).

### Positioning to preserve

- **Is:** reading app with lightweight vocabulary help and future translation modes.
- **Is not:** vocabulary memorization app, generic translator, or social reading platform.
- **Core mission:** help users enjoy English fiction while naturally understanding the story and gradually absorbing vocabulary during reading.

### Core reading modes (product goals)

| Mode | Product label | Code / doc label | Status |
|---|---|---|---|
| English Study Mode | English Study Mode | `english-study` | **Implemented** |
| Chinese Reading Mode | Chinese Reading Mode | `chinese` | **Placeholder only** |
| Mixed Mode | Mixed Mode (product brief) | **Cloze Mixed Mode** (`cloze-mixed`) in code/docs | **Placeholder only** |

---

## 2. Current implemented features

*Conservative list: only features with clear support in `docs/HANDOFF.md` and/or inspected code.*

### Confirmed implemented

**EPUB & reading**

- EPUB import via file picker and drag-and-drop (`pwa-reader/epubLoader.js`, `app.js`).
- EPUB import diagnostics panel (file metadata, load steps, epub.js/JSZip status, errors).
- epub.js + JSZip loading path with preflight and clearer failure messages.
- Chapter list from EPUB spine; fallback labels (`Chapter 1`, `Preface`, etc.) via `navigationEngine.js`.
- Chapter navigation: custom TOC, hidden dropdown fallback, Previous/Next (top, bottom, mobile tap), Back to Top, progress text, first/last disabled states.
- Vertical scrolling reader (not pagination).
- English Study Mode: original chapter HTML + vocabulary annotations (`readingModes.js`).
- Plain-text extraction from chapter HTML for matching.
- Mobile-first reader UX: sidebar hidden on narrow screens; mobile bottom sheets for Chapters, Vocabulary Preview, and Mode; tap-to-toggle floating reader controls (`readerTapControls` overlay).
- Reader overlay / tap controls ignore vocabulary terms, bubbles, sheets, links, buttons, and form controls.

**Persistence & library**

- IndexedDB persistence for EPUB blob, file metadata, title/author, chapter count, reading progress (`storage.js`).
- Reading progress includes chapter id/index, optional `scrollTop` / clamped `scrollRatio` / `updatedAt`, and optional `currentMode`.
- Approximate scroll-ratio restore after chapter render.
- Mode switch preserves chapter and approximate scroll position; does not treat placeholder modes as chapter changes.
- Restore UI: Restore, Dismiss, Forget saved book.
- Home / Reader / Vocabulary Library view split with mutual exclusivity (`showView()`, `getAppViewVisibility()`).
- Home: import, primary reading action (`Resume current session` vs `Continue Reading`), Vocabulary Library summary card, Local Library list.
- Local Library: saved EPUB metadata (title, author, progress, last read); Open restores via IndexedDB; Forget removes book + progress.
- Forget confirmation via in-app modal (`#forgetBookModal`), not browser `confirm()`.

**Vocabulary (English Study)**

- Vocabulary Preview from curated seed data: `data/vocabulary.json` (77 IELTS/fiction/general entries per HANDOFF) + `data/slang_idioms.json` (35 slang/idiom/phrasal entries).
- Seed entries include compact Chinese meanings, short English definitions, IELTS usage phrases, priority scores, `user_curated_seed` tags.
- Underlined vocabulary terms in chapter text; click/tap bubble (term, Chinese meaning, English definition when available, IELTS usage when available).
- Bubble toggle: same term closes; different term switches.
- Vocabulary Preview cards: richer fields (source sentence, context note, type badge, usage note, examples, priority/source metadata).
- Vocabulary Preview **personalization filtering** (lazy-loaded, best-effort fallback): level baseline + profile lists hide known/ignored; learning words kept visible (`getPersonalizedVocabularyPreviewItems`, `vocabEngine.filterVocabularyPreviewItems`, `levelBaselineEngine.loadEffectiveKnownWordsForProfile`).
- Preview card actions: **Known**, **Save**, **Hide** → IndexedDB vocabulary profile.
- Saved learning words show **Saved** badge in Preview.
- Vocabulary Library view: Learning / Mastered / Hidden tabs; term-only lists; manual **Add to Learning**; row-level **Remove**; local export via **Copy Learning**, **Copy All**, **Download CSV** (not a separate `.txt` file download).
- IndexedDB vocabulary profile: `selectedLevel` (default `level3`), `knownWords`, `learningWords`, `ignoredWords`, `preferredCategories`, `updatedAt`.
- Level baseline JSON skeletons: `data/levels/level1_basic_words.json` … `level5_basic_words.json` (small hand-curated seeds; loaded at runtime when filtering).
- Book Glossary skeleton: rule-based candidate extraction + mock classifier (`glossaryEngine.js`); in-memory panel for current chapter.
- Dataset quality script: `scripts/check_vocabulary_dataset.py` → `generated/reports/vocabulary_quality_report.md`.

**Developer / quality**

- Pure-logic tests: `tests/vocabEngine.test.mjs`, `glossaryEngine.test.mjs`, `navigationEngine.test.mjs`, `storage.test.mjs`, `levelBaselineEngine.test.mjs`, `homeState.test.mjs`.
- Dev-only diagnostics: `window.__slashReaderDebug.getDiagnostics()`.

### Planned / not implemented (or placeholder only)

**Reading & translation**

- Chinese Reading Mode (placeholder HTML panel).
- Cloze / Mixed Mode (placeholder HTML panel).
- Real translation providers (DeepL, free/basic provider, user API keys).
- Translation cache per chapter (`translatedHtml`, `clozeHtml` in data model — fields exist conceptually, not populated).
- Whole-book translation UX (planned as chapter/block queue + local cache).
- Page-flip pagination; EPUB CFI position tracking.
- Enhanced EPUB export.
- AO3 browser extension / import helper.

**Vocabulary (future phases)**

- Comfort-level onboarding UI (level is stored and displayed; no in-app level picker found in `app.js`).
- Candidate scoring / ranking engine (plan describes scoring; runtime uses filtering + curated priority, not full scoring model).
- Unknown-candidate detection with pending meanings.
- Dictionary enrichment (ECDICT, Free Dictionary API, AI context meanings, review queue).
- Separate **Mastered** action distinct from **Known** (semantics doc defines both; UI maps `knownWords` → “Mastered” tab).
- Vocabulary Library: definitions, examples, source book/chapter on entries, review mode, sync, Anki/JSON export.
- User glossary override editing UI.
- Batch vocabulary import.

**Platform & release**

- Full PWA installability: no `manifest.json` or service worker found.
- GitHub Pages deployment config in repo.
- Account system, cloud sync, cross-device library.
- Backend server or login.
- Open-source release artifacts (LICENSE, CONTRIBUTING, PRIVACY) in repo.
- Product rename in UI/docs from Slash Reader v2 → Interleaf Reader.

---

## 3. Current vocabulary system status

### Vocabulary Preview

| Aspect | Status |
|---|---|
| Chapter-level recommendation surface | **Implemented** |
| Curated seed matching | **Implemented** |
| Personalization filtering (baseline + profile) | **Implemented** (lazy-loaded; fails open to unfiltered Preview) |
| Top-N scoring per personalization plan | **Partial** — max-items cap exists; full scoring model **not implemented** |
| Preview actions Known / Save / Hide | **Implemented** |

### Bubble

| Aspect | Status |
|---|---|
| Lightweight inline bubble on underlined terms | **Implemented** |
| Fields: term, 中文, English definition, IELTS usage | **Implemented** (when present in seed data) |
| Pending meaning for unknown candidates | **Not implemented** |
| Live API lookup on bubble open | **Not implemented** (by design in plans) |

### Level baseline / whitelist

| Aspect | Status |
|---|---|
| `data/levels/level1` … `level5` JSON files | **Present** (small placeholder word lists) |
| `levelBaselineEngine.js` | **Implemented** (pure helpers + `fetch` load) |
| Runtime integration with Preview | **Implemented** via `loadEffectiveKnownWordsForProfile` |
| Comfort-level settings UI | **Not implemented** (default `level3`; display-only “Level level3” on Home/Vocabulary Library) |

### Profile lists: `knownWords` / `learningWords` / `ignoredWords`

| List | Storage | Preview behavior | Vocabulary Library tab |
|---|---|---|---|
| `learningWords` | IndexedDB | Kept visible; Save action adds here | **Learning** |
| `knownWords` | IndexedDB | Hidden after Known action | Labeled **Mastered** (see semantic gap below) |
| `ignoredWords` | IndexedDB | Hidden after Hide action | **Hidden** |

Helpers in `storage.js`: `markWordKnown`, `addLearningWord`, `ignoreVocabularyWord`, `restoreVocabularyWord`, `setVocabularyComfortLevel` (API exists; no UI wiring found).

### Known / Save / Hide / Mastered semantics

**Documented** (`docs/VOCABULARY_INTERACTION_SEMANTICS.md`):

- **Known** — already know English word; hide from Preview; not in long-term library by default.
- **Save** — add to `learningWords` / 生词本; exportable; can later become Mastered.
- **Hide** — not a learning target; `ignoredWords`.
- **Mastered** — completed history after having been saved; distinct from Known.

**Implemented today:**

- Preview buttons: **Known**, **Save**, **Hide** only.
- **Known** → `markWordKnown` → `knownWords`.
- **Save** → `addLearningWord` → `learningWords`.
- **Hide** → `ignoreVocabularyWord` → `ignoredWords`.
- Vocabulary Library **Mastered** tab displays `knownWords`, not a separate mastered-from-learning lifecycle.
- No **Mastered** button or learning→mastered transition in UI.

**Clarification for PRD:** current “Mastered” tab is effectively “Known words archive,” not the semantics doc’s post-learning Mastered state.

### Manual vocabulary add

- **Implemented:** compact “Add to Learning” form in Vocabulary Library view.
- Validates/normalizes input; adds to `learningWords`.

### Export

| Format | Status |
|---|---|
| Copy Learning (plain text, newline-separated terms) | **Implemented** |
| Copy All (plain text, grouped sections) | **Implemented** |
| Download CSV (`term,status`) | **Implemented** |
| Download `.txt` file | **Not implemented** (clipboard copy only for plain text) |
| Rich export (definitions, Anki, JSON) | **Planned** |

### Vocabulary Library vs memorization app

- **Reading-derived:** words enter via Preview Save, manual add, or (future) in-text actions—not drill decks.
- **No** spaced-repetition review mode, flashcards, or external sync.
- Explicit note in UI: lists saved locally in this browser on this device.
- Product positioning: library supports reading workflow and export; not a standalone memorization product.

---

## 4. Current reading system status

| Feature | Status | Evidence |
|---|---|---|
| EPUB import | **Implemented** | `epubLoader.js`, `app.js` import flow |
| Chapter navigation | **Implemented** | `navigationEngine.js`, TOC, Prev/Next |
| Home view | **Implemented** | `#homeView`, import + library + summary |
| Reader view | **Implemented** | `#readerView`, reading workspace |
| Vocabulary Library view | **Implemented** | Third app view (not a modal) |
| Local Library (saved books) | **Implemented** | `listSavedBooks()`, Home list UI |
| IndexedDB book persistence | **Implemented** | `saveStoredBook`, `getStoredBook`, etc. |
| Scroll progress restoration | **Implemented** (approximate) | `scrollRatio` save/restore |
| Reader overlay (mobile tap controls) | **Implemented** | `#readerTapControls`, tap toggle |
| Forget modal | **Implemented** | `#forgetBookModal` for Local Library Forget |
| Forget saved book (Reader panel) | **Implemented** | `#clearSavedBookButton` (separate from modal path) |

**Caveats**

- CDN dependency on jsDelivr for JSZip and epub.js (offline/PWA risk).
- Multi-book shelf is metadata list + one active session model, not a full cloud library.
- `README.md` still lists “Persistent book library” as placeholder — **stale** vs `HANDOFF.md` and code.

---

## 5. Translation system status

### Product goals (not yet delivered)

- **English Study Mode** — live.
- **Chinese Reading Mode** — full-chapter Chinese for plot comprehension; preserve protected terms (names, fandom terms, etc.).
- **Mixed Mode** (product) / **Cloze Mixed Mode** (code) — mostly Chinese with selected English words/phrases retained for contextual memory.

### Current implementation

- `readingModes.js` routes Chinese and Cloze modes to `translationEngine.js` placeholders.
- `translationEngine.js`: `loadProtectedTerms`, `prepareTranslationRequest` shape, `translateChapter()` returns `not_implemented`.
- `data/protected_terms.json` loaded for future preservation rules.
- Book Glossary candidates generated but **not** wired into translation.

### Planned architecture (from docs + handoff)

| Topic | Direction |
|---|---|
| Translation Provider abstraction | **Planned** — boundary in `translationEngine.js` |
| DeepL | **Optional** high-quality provider; must not run from browser with exposed keys |
| Free / basic provider | **Planned** low-barrier option (provider list not finalized) |
| User-provided API keys | **Planned**; storage/handling approach **undecided** |
| Whole-book translation UX | **Planned** at UX level; internal chapter/block queue + local cache |
| Security constraint | **Documented:** no API keys in frontend JS; secure local provider or backend boundary first |

---

## 6. Local-first and PWA release model

| Topic | Current / planned state |
|---|---|
| App shape | Static ES-module web app (`pwa-reader/`), no build step |
| PWA | **Directional** — described as PWA in docs; **no** web manifest or service worker in repo |
| Hosting target | **Planned** GitHub Pages / static hosting (stated in product brief; not configured in repo) |
| Local storage | IndexedDB (books, progress, vocabulary profile); namespaced `localStorage` for small metadata |
| Cloud / accounts | **No** account or cloud sync in MVP scope |
| User content | Users import **their own** EPUB files; app does not ship copyrighted books |
| Offline | Partial — local data persists; EPUB parsing libs loaded from CDN unless vendored later |

---

## 7. Open-source direction

*Mostly from product brief; minimally documented in repo today.*

| Topic | Status |
|---|---|
| GitHub public release | **Goal** — not specified in repo docs |
| README | **Present** but **out of date** vs current feature set |
| Setup docs | **Partial** — `HANDOFF.md` run/test instructions; root `README.md` stale |
| Privacy policy | **Missing** |
| Contribution guidelines | **Missing** |
| License | **Missing** (no LICENSE file found) |
| Copyrighted content policy | **Documented** for vocabulary source PDFs (`VOCABULARY_DATASET_PLAN.md`, `source_materials/README.md`): do not ship full books, dictionary dumps, or bulk extracted text; app should not host copyrighted books or public translated works |

---

## 8. Risks and unresolved decisions

| Risk / decision | Notes |
|---|---|
| **Translation cost** | Per-chapter/block API calls for whole books; no cost model or user messaging |
| **Free provider quality/limits** | No provider chosen; rate limits and translation quality unknown |
| **API key handling** | Must not live in frontend; local server vs extension vs OS keychain **undecided** |
| **Browser storage limits** | EPUB blobs + translation cache may hit IndexedDB quotas; no eviction strategy |
| **CDN / offline dependency** | epub.js and JSZip from CDN weaken offline PWA story |
| **Branch / project naming confusion** | Slash Reader v2 vs Interleaf Reader vs BookHeart paths; docs/UI inconsistent |
| **Scope creep** | Plans include AO3 extension, enhanced EPUB export, AI enrichment, teen mode — easy to over-build |
| **Naming / domain** | Interleaf Reader not adopted in codebase; Cloze vs Mixed naming mismatch |
| **Known vs Mastered semantics** | Docs describe four states; UI collapses Known into Mastered tab |
| **Doc drift** | `README.md`, `PRODUCT_SPEC.md`, `VOCABULARY_PERSONALIZATION_PLAN.md` (“design only”) lag `HANDOFF.md` and code |
| **Children-friendly version** | Mentioned as future secondary user in personalization plan; **no decision** |
| **Companion local server** | HANDOFF recommends secure local provider; **no decision** on shipping one |
| **Copyright / source materials** | `source_materials/` contains reference PDFs; pipeline rules exist but legal review for OSS repo layout needed |
| **Missing governance docs** | No `DECISION_LOG.md`, `PROJECT_STATE.md`, or `AI_WORKFLOW_PROTOCOL.md` |

---

## 9. PRD information gaps

Information **still needed** before writing the full PRD:

### Legal & release

- [ ] Final open-source **license** (MIT, Apache-2.0, AGPL, etc.)
- [ ] Whether GitHub repo is **public immediately** or private until MVP
- [ ] **Privacy policy** scope (local-only app still needs clarity on CDN, future analytics, translation API data flow)
- [ ] Whether `source_materials/` reference PDFs stay in public repo or move to private intake

### MVP scope

- [ ] Exact **first public release** feature checklist (what must ship vs post-launch)
- [ ] Formal **MVP definition** (e.g. English Study only? placeholder modes visible or hidden?)
- [ ] **Rename rollout**: when Interleaf Reader replaces Slash Reader v2 in UI, repo, and URLs

### Translation

- [ ] **Preferred provider list** and fallback order (DeepL, Google, LibreTranslate, self-hosted, etc.)
- [ ] **API key UX** (settings screen, local proxy, optional companion app)
- [ ] **Mixed mode** rules: which words stay English (learning list, IELTS, glossary, user config?)
- [ ] Translation **cache invalidation** when book or protected terms change

### Vocabulary

- [ ] Resolve **Known vs Mastered** product semantics and UI labels (especially Chinese copy)
- [ ] Comfort-level **onboarding** required for v1 or default `level3` only?
- [ ] Minimum viable **dataset size** and enrichment scope for launch

### Platform

- [ ] **Deployment target** details (GitHub Pages path, custom domain, HTTPS assumptions)
- [ ] **PWA requirements** for v1: installable manifest, service worker, vendored scripts?
- [ ] **Browser support** matrix (mobile Safari, Chrome Android, desktop)
- [ ] **Storage limits** policy when IndexedDB quota exceeded

### Product

- [ ] **Children-friendly edition** — later fork, mode, or out of scope?
- [ ] **Companion local server** — in scope for v1 translation or post-MVP?
- [ ] Monetization (if any): donations, hosted translation credits, none
- [ ] Analytics / error reporting (if any)

### Process

- [ ] Establish `DECISION_LOG.md` / `PROJECT_STATE.md` or fold into PRD maintenance workflow
- [ ] Single **source of truth** doc hierarchy after PRD ships (replace stale README sections)

---

## 10. Recommended PRD structure

Proposed outlines for the two PRD documents. English PRD is canonical; Chinese PRD mirrors structure with localized product copy and UX strings.

### `docs/INTERLEAF_READER_PRD.md` (English)

1. **Document control** — version, date, status, audience, relationship to this audit  
2. **Executive summary** — one paragraph + core mission  
3. **Product identity** — Interleaf Reader, codename, BookHeart, positioning statement  
4. **Problem & opportunity** — non-native readers leaving fiction to look up words  
5. **Target users & personas** — IELTS/fanfic readers; optional teen learner (future)  
6. **Goals & non-goals** — reading-first; not flashcards, not social, not generic translator  
7. **Core user journeys** — import EPUB → read → vocabulary help → (future) mode switch → library  
8. **Reading modes** — English Study (MVP), Chinese, Mixed; mode-switch behavior  
9. **Feature requirements**  
   - 9.1 EPUB import & diagnostics  
   - 9.2 Reader & navigation  
   - 9.3 Home & Local Library  
   - 9.4 Progress & persistence  
   - 9.5 Vocabulary Preview & bubble  
   - 9.6 Vocabulary profile & Library  
   - 9.7 Translation & providers (future)  
   - 9.8 Book / Global / User glossary  
10. **UX principles** — mobile-first, non-blocking personalization, calm Preview density  
11. **Data & privacy** — IndexedDB model, local-only MVP, no copyrighted hosted content  
12. **Technical constraints** — static PWA, module boundaries, no keys in frontend  
13. **Release phases & MVP scope** — map to ROADMAP phases with explicit v1 cut  
14. **Open-source & community** — license, contributing, security reporting  
15. **Success metrics** — qualitative + measurable (retention, chapter completion, export usage)  
16. **Risks & dependencies** — from Section 8 of this audit  
17. **Appendices** — glossary of terms (Known/Save/Hide/Mastered), mode examples, data model reference  

### `docs/INTERLEAF_READER_PRD_CN.md` (中文)

1. **文档说明** — 版本、状态、与英文 PRD 的关系  
2. **产品摘要** — Interleaf Reader 一句话定义与使命  
3. **产品定位** — 阅读优先；非背单词 App、非通用翻译器、非社交平台  
4. **目标用户** — 非母语英语小说/长篇读者  
5. **核心使用场景** — 导入 → 阅读 → 生词辅助 → 词库管理  
6. **阅读模式** — 英语学习模式 / 中文阅读模式 / 混合模式（含示例句）  
7. **功能需求** — 与英文 PRD 章节对齐的中文需求描述  
8. **词汇交互语义** — 已掌握 / 存入生词本 / 不再提示 / 掌握留档（需裁决 Known vs Mastered 中文文案）  
9. **界面与体验原则** — 移动端优先、沉浸式阅读  
10. **数据与隐私** — 本地存储、用户自备 EPUB  
11. **发布范围与路线图** — MVP 与后续阶段  
12. **开源与合规** — 许可证、版权与素材政策  
13. **附录** — 中英术语对照表、模式示例  

---

## Source documents reviewed

### Present and read

| Document | Role |
|---|---|
| `docs/HANDOFF.md` | **Primary** implementation truth (most current) |
| `docs/PRODUCT_SPEC.md` | Vision and modes; **partially stale** on scope |
| `docs/ROADMAP.md` | Phase list |
| `docs/ARCHITECTURE.md` | Module boundaries |
| `docs/DATA_MODEL.md` | Intended stable shapes |
| `docs/VOCABULARY_PERSONALIZATION_PLAN.md` | Personalization design; **status header stale** |
| `docs/VOCABULARY_INTERACTION_SEMANTICS.md` | Known/Save/Hide/Mastered semantics |
| `docs/VOCABULARY_DATASET_PLAN.md` | Dataset safety and pipeline |
| `README.md` | **Stale** vs handoff |

### Requested but absent

- `docs/PROJECT_STATE.md`
- `docs/DECISION_LOG.md`
- `docs/AI_WORKFLOW_PROTOCOL.md`

### Code / structure lightly inspected (read-only)

- `pwa-reader/index.html`, `app.js`, `storage.js`, `vocabEngine.js`, `levelBaselineEngine.js`, `readingModes.js`, `translationEngine.js`
- `tests/*.test.mjs` (six test files)

---

## Document inconsistencies to resolve during PRD writing

1. **`HANDOFF.md` line 94** says `levelBaselineEngine.js` is “Not integrated with Preview yet”; elsewhere in the same file and in code, Preview filtering **is** integrated via lazy-loaded path.  
2. **`VOCABULARY_PERSONALIZATION_PLAN.md`** opens with “No runtime behavior is implemented yet”; profile storage, filtering, Preview actions, and Vocabulary Library **are** implemented.  
3. **`README.md` / `PRODUCT_SPEC.md`** understate persistence, vocabulary library, and personalization.  
4. **Mastered vs Known** — semantics doc vs UI/tab naming.  
5. **Mixed Mode vs Cloze Mixed Mode** — product vs engineering vocabulary.

---

*End of audit. Do not treat this file as the product requirements document.*
