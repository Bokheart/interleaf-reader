# Interleaf Reader — Product Requirements Document

## 1. Document Control

| Field | Value |
|---|---|
| **Title** | Interleaf Reader — Product Requirements Document |
| **Version** | 1.0 |
| **Date** | 2026-06-16 |
| **Status** | Active — canonical product specification |
| **Audience** | BookHeart maintainers, Codex/Cursor agents, open-source contributors, future reviewers |
| **Former codename** | Slash Reader v2 |

### Source document relationship

| Document | Role |
|---|---|
| **`docs/PRD_SOURCE_AUDIT.md`** | Primary audit input for this PRD; implementation inventory and gaps |
| **`docs/HANDOFF.md`** | Current engineering handoff; implementation truth for agents |
| **`docs/VOCABULARY_INTERACTION_SEMANTICS.md`** | Vocabulary action semantics (partially superseded on Mastered by v1 decision below) |
| **`docs/VOCABULARY_PERSONALIZATION_PLAN.md`** | Personalization design reference (partial implementation) |
| **`docs/ARCHITECTURE.md`**, **`docs/DATA_MODEL.md`**, **`docs/ROADMAP.md`** | Engineering structure and phased direction |

**Hierarchy:** This PRD is the canonical **product** specification. `HANDOFF.md` remains the canonical **implementation snapshot**. When they conflict, update `HANDOFF.md` after deliberate product decisions; flag doc drift in `DECISION_LOG.md` (TBD).

**Documentation risk:** `README.md`, `PRODUCT_SPEC.md`, and parts of older planning docs are stale relative to code and this PRD. Future work should prefer this PRD + `PRD_SOURCE_AUDIT.md` + `HANDOFF.md`.

---

## 2. Executive Summary

**Interleaf Reader** is a local-first English fiction and long-form reading PWA for non-native English readers. Users import their own EPUB files and read inside a controlled browser environment with lightweight vocabulary support—underlined terms, a small tap bubble, and a chapter-level Vocabulary Preview—without leaving the story for a separate memorization app or generic translator.

**Mission:** Help users enjoy English fiction while naturally understanding the story and gradually absorbing vocabulary during reading.

**MVP (current product target):** English Study Mode with EPUB import, chapter navigation, Home / Reader / Vocabulary Library views, Local Library with IndexedDB persistence, scroll progress restore, mobile reader overlay, Vocabulary Preview and bubble, level-baseline filtering, user vocabulary profile (Known / Save / Hide), manual vocabulary add, and term-only export (Copy Learning, Copy All, CSV). Chinese Reading Mode and Mixed Mode exist as **placeholders only** and are **not** MVP deliverables.

**Post-MVP direction:** Provider-agnostic translation architecture, Chinese and Mixed reading modes, whole-book translation workflow with chapter/block queue and local cache, richer vocabulary enrichment, full PWA installability, GitHub Pages deployment, and open-source release with governance docs.

---

## 3. Product Identity

| Field | Value |
|---|---|
| **Product name** | Interleaf Reader |
| **Former codename** | Slash Reader v2 (still present in app UI and some repo docs) |
| **Creator / internal brand** | BookHeart |

### Naming note

“Interleaf” evokes pages, leaves, and layered reading between languages. It fits the planned mixed English–Chinese experience—for example: `Dean opened 门。`

### Positioning statement

Interleaf Reader is a **reading app** where vocabulary and translation features support immersive reading. It is **not** a vocabulary memorization app, a generic translator, or a social reading platform.

---

## 4. Problem & Opportunity

### Problem

Non-native English readers who enjoy fiction and long-form text frequently **leave the reader** to look up words—switching to dictionaries, browser translate, or flashcard apps. That breaks narrative flow, increases fatigue, and turns entertainment reading into study homework.

**Browser translation** helps plot comprehension but does not provide structured, reader-controlled vocabulary learning inside the text. **Ordinary vocabulary apps** optimize for drills and decks, not chapter context, fanfiction pacing, or “just one more chapter” motivation.

### Opportunity

A **reading-first support layer**: keep the original English text primary, surface only the most useful words per chapter, let the reader save words they care about, and (post-MVP) offer Chinese and Mixed modes for comprehension without replacing the reading product with a translation tool.

---

## 5. Target Users & Personas

### Primary users

- **Non-native English fiction / long-form readers** (roughly **14+**) with some existing English foundation.
- Readers who learn through **entertainment**—novels, web fiction, fanfiction as one use case, not the only market.
- Users who want **contextual vocabulary help** while staying inside the story.

### Personas (illustrative)

| Persona | Need |
|---|---|
| **IELTS-oriented fiction reader** | IELTS-useful words highlighted without overwhelming every line |
| **Fanfic / web-novel reader** | Slang, idioms, fandom terms explained lightly; names can be hidden |
| **Returning reader** | Resume chapter and scroll position; local book shelf |

### Future only (not MVP)

- **Children-friendly edition** — simplified filtering, age-appropriate UX; **no decision** on fork vs mode vs separate product.
- **Teen learner** — mentioned in personalization plans; same core product with possible future tuning.

---

## 6. Goals & Non-goals

### Product goals

1. Deliver a calm, mobile-first English fiction reading experience with EPUB support.
2. Reduce friction for unknown vocabulary via Preview, underlines, and lightweight bubbles.
3. Let users build a **reading-derived** Vocabulary Library locally—save, review lists, export—without becoming a drill app.
4. Persist books and progress locally (IndexedDB); no account required for MVP.
5. Prepare architecture for post-MVP translation modes and provider-agnostic translation.

### Non-goals

- Vocabulary memorization product (spaced repetition, flashcard decks, gamified drills).
- Generic full-document translator or replacement for dedicated translation services.
- Social reading (comments, sharing shelves, reading groups).
- Hosting copyrighted books or public translated works.
- Cloud sync, accounts, or cross-device library in MVP.

### MVP goals

Ship a trustworthy **English Study Mode** vertical slice: import → read → vocabulary help → save/export → resume, all local-first.

### Post-MVP goals

- Chinese Reading Mode and Mixed Mode with real translation output.
- Translation provider settings and secure API key handling.
- Vocabulary enrichment, comfort-level onboarding UI, true learning→mastered lifecycle.
- Full PWA, GitHub Pages deploy, open-source governance, optional companion local server.

---

## 7. Core User Journeys

| Journey | MVP status | Summary |
|---|---|---|
| **Import EPUB** | Implemented | Drop or pick file → diagnostics → chapter list → read |
| **Read English with hints** | Implemented | English Study Mode, vertical scroll, underlines + bubble |
| **Use Vocabulary Preview** | Implemented | Chapter sidebar / mobile sheet; Known / Save / Hide |
| **Save vocabulary** | Implemented | Save → `learningWords`; Vocabulary Library view |
| **Manage Local Library** | Implemented | Home list; Open / Forget; IndexedDB restore |
| **Export vocabulary** | Implemented | Copy Learning, Copy All, Download CSV |
| **Translate book / switch modes** | Post-MVP | Chinese / Mixed placeholders today; real translation later |

### Journey detail — MVP read loop

1. User opens app (static web URL).
2. User imports EPUB or continues from Local Library.
3. App opens Reader on last or first chapter; restores approximate scroll.
4. User reads English text; taps underlined word for bubble if needed.
5. User opens Vocabulary Preview; marks words Known / Save / Hide.
6. User optionally opens Vocabulary Library to add terms or export.
7. User returns via Home; book and progress remain in this browser.

---

## 8. Core Reading Modes

### Mode comparison

| Mode | Description | Example | Status |
|---|---|---|---|
| **English Study Mode** | Original English + lightweight vocabulary help | `Dean opened the door.` — *door* may be underlined; tap for bubble | **Implemented** |
| **Chinese Reading Mode** | Chinese translation for plot comprehension | `Dean打开了门。` | **Placeholder** |
| **Mixed Mode** | Chinese context; selected English words/phrases preserved | `Dean opened 门。` | **Placeholder** |

**Engineering note:** Code and some docs use **Cloze Mixed Mode** (`cloze-mixed`) for Mixed Mode. Product language should prefer **Mixed Mode** in user-facing copy.

### Mode-switch behavior (current)

- Switching modes preserves book, chapter, and approximate scroll position.
- Placeholder modes must not behave like chapter changes or reset progress incorrectly.
- MVP value is delivered entirely in English Study Mode.

---

## 9. Feature Requirements

### 9.1 EPUB Import & Diagnostics

| | |
|---|---|
| **Purpose** | Let users bring their own English EPUBs into a local session with clear failure feedback. |
| **Current status** | **Implemented** |
| **Requirements** | File picker and drag-and-drop; epub.js + JSZip load path; metadata and spine parsing; chapter list with fallback labels; diagnostics panel (file name, size, MIME, extension, load step, library status, errors). |
| **Definition of done** | User can import a supported EPUB, see title/author/chapter count, and open first chapter without console errors on supported browsers. |

**Partial / limits:** EPUB compatibility bounded by epub.js and current spine loader; CDN-hosted JSZip/epub.js (**Planned** vendoring for offline PWA).

---

### 9.2 Reader & Navigation

| | |
|---|---|
| **Purpose** | Readable chapter navigation for long vertical fiction. |
| **Current status** | **Implemented** |
| **Requirements** | Custom TOC + hidden select fallback; Previous/Next (desktop + mobile tap controls); progress text; Back to Top; first/last chapter disabled states; vertical scroll (not pagination); mobile sidebar → bottom sheets for Chapters, Preview, Mode; tap-to-toggle reader overlay that ignores vocab/bubbles/controls. |
| **Definition of done** | User can move across chapters, jump from TOC, and use mobile controls without view overlap bugs. |

**Post-MVP:** Page-flip pagination; EPUB CFI position tracking.

---

### 9.3 Home, Local Library, and Vocabulary Library Views

| | |
|---|---|
| **Purpose** | Separate import/shelf, reading workspace, and vocabulary management. |
| **Current status** | **Implemented** |
| **Requirements** | Three mutually exclusive views (Home, Reader, Vocabulary Library); Home shows import, Resume / Continue Reading, Vocabulary Library summary card, Local Library list; Reader has Back to Home; Vocabulary Library has Learning / Mastered / Hidden tabs, manual add, remove, export; Local Library Open restores from IndexedDB; Forget uses in-app modal. |
| **Definition of done** | Only one view visible and interactive; Local Library ≠ Vocabulary Library semantics preserved. |

**Partial:** UI branding still says Slash Reader v2 (**Planned** rename to Interleaf Reader).

---

### 9.4 Progress & Persistence

| | |
|---|---|
| **Purpose** | Resume reading without re-importing EPUB each visit. |
| **Current status** | **Implemented** (approximate scroll restore) |
| **Requirements** | IndexedDB stores EPUB blob, metadata, progress (`chapterId`, index, `scrollRatio`, `scrollTop`, `updatedAt`, optional `currentMode`); Restore / Dismiss / Forget saved book; list saved books for Local Library. |
| **Definition of done** | Refresh browser → user can restore book and approximate reading position in same browser. |

**Not in MVP:** Cloud sync, multi-device, account backup. **Future:** profile import/export as sync-lite.

---

### 9.5 Vocabulary Preview & Bubble

| | |
|---|---|
| **Purpose** | Chapter-level vocabulary recommendations and in-text lightweight help. |
| **Current status** | **Implemented** (curated seed dataset; partial personalization) |
| **Requirements** | Match against curated `vocabulary.json` + `slang_idioms.json`; build Preview list; underline terms in HTML; tap bubble with term, Chinese meaning, English definition and IELTS usage when available; bubble toggle behavior; Preview richer than bubble (source sentence, badges, metadata); Preview actions Known / Save / Hide; Saved badge for learning words. |
| **Definition of done** | After chapter render, Preview and underlines appear; actions update profile and re-filter on refresh. |

**Partial:** Full scoring model not implemented (filtering + priority + max items only). Comfort-level UI not implemented (default `level3`). Unknown candidates with pending meanings — **Post-MVP**.

**Fail-open:** Personalization lazy-loads; failure must not block import or chapter render.

---

### 9.6 Vocabulary Profile & Library

| | |
|---|---|
| **Purpose** | Persist user vocabulary decisions locally; support export. |
| **Current status** | **Implemented** (v1 semantics) |
| **Requirements** | IndexedDB profile: `selectedLevel`, `knownWords`, `learningWords`, `ignoredWords`, `preferredCategories`, `updatedAt`; level baseline JSON `level1`–`level5` for effective-known filtering; Vocabulary Library tabs; manual Add to Learning; row Remove; export Copy Learning, Copy All, CSV (`term,status`). |
| **Definition of done** | Save/Hide/Known persist across sessions; export produces correct term lists. |

#### v1 vocabulary semantics (canonical)

| Action | Meaning | Storage | Preview | Library tab |
|---|---|---|---|---|
| **Known** | Already know this English word | `knownWords` | Hidden | **Mastered** (v1 archive label) |
| **Save** | Want to learn / keep | `learningWords` | Stays visible; Saved badge | **Learning** |
| **Hide** | Not a learning target | `ignoredWords` | Hidden | **Hidden** |
| **Mastered** (v1) | Same as Known archive | `knownWords` | — | **Mastered** tab |

**Post-MVP:** True **learning → mastered** lifecycle (separate from Known); definitions/examples on entries; source book/chapter; review mode; Anki/JSON export; batch import.

**Clarification:** Vocabulary Library is a **reading-derived collection**, not a flashcard or memorization-drill product. No spaced repetition in MVP.

---

### 9.7 Translation & Providers

| | |
|---|---|
| **Purpose** | Enable Chinese and Mixed modes with protected terms and cached chapter output. |
| **Current status** | **Planned** (placeholder UI only) |
| **Requirements** | Provider-agnostic `translationEngine` boundary; no real provider calls in MVP. |

#### Translation Provider model (planned)

| Provider type | Role |
|---|---|
| **None** | Default; English Study only |
| **Free / basic provider** | Low-barrier option; quality/limits TBD |
| **DeepL** | Optional high-quality provider; **not** the only option |
| **Google / other + user API key** | User-supplied credentials |
| **Custom endpoint** | Advanced / self-hosted |
| **Local / self-hosted provider** | Future companion server or proxy |

#### Architecture rules

- **Do not** hardcode DeepL as the only provider.
- **Do not** expose developer-owned API keys in frontend code.
- **User-provided API key UX:** **TBD**
- **Local companion server / secure proxy:** **TBD**
- **Whole-book translation:** user-facing workflow (e.g. “Translate this book”).
- **Internal implementation:** chapter/block queue + local cache (`translatedHtml`, `clozeHtml` per chapter).
- **Glossary / protected terms:** preserve names, proper nouns, fandom terms, and selected target vocabulary in Chinese and Mixed output.

**Current placeholders:** Chinese and Mixed modes show non-functional placeholder panels; mode switch preserves position.

---

### 9.8 Glossary / Protected Terms

| | |
|---|---|
| **Purpose** | Improve translation quality and protect story-specific terms. |
| **Current status** | **Partial** |
| **Requirements** | Global protected terms in `data/protected_terms.json`; Book Glossary skeleton (rule extraction + mock classifier) for current chapter; User Glossary Overrides — **Post-MVP**. |
| **Definition of done (MVP)** | Global list loads; Book Glossary available as dev/skeleton support—not core user-facing MVP marketing. |

**Post-MVP:** Wire Book + Global + User glossary into translation requests; user override editing UI.

---

### 9.9 PWA & Deployment

| | |
|---|---|
| **Purpose** | Ship as installable, hostable static web app. |
| **Current status** | **Partial** — PWA-oriented static app; full installability incomplete |
| **Requirements** | Static ES modules from `pwa-reader/`; serve from repo root for `data/` fetch; target **GitHub Pages** or equivalent static hosting — **Planned**, not configured. |
| **Definition of done (MVP deploy)** | Public HTTPS URL; README setup; users can import EPUB and read. |

**Missing today:** `manifest.json`, service worker (**Planned** for M3). CDN dependency for epub.js/JSZip (**risk**; vendoring **Planned**).

---

## 10. UX Principles

1. **Mobile-first reading** — full-width text on narrow screens; sheets for secondary panels.
2. **Low interruption** — no modal for every Known action; optional toasts acceptable later.
3. **Lightweight bubble** — short fields only; rich detail stays in Vocabulary Preview.
4. **Preview helps, does not overwhelm** — capped items; not every unknown token.
5. **Reading remains primary** — vocabulary subordinate to story text.
6. **Fail-open personalization** — optional modules lazy-load; EPUB import and chapter render never depend on them.
7. **Honest placeholders** — Chinese / Mixed modes must not pretend to translate.
8. **Local transparency** — quiet copy that data stays on this device/browser.

---

## 11. Data & Privacy

| Topic | MVP policy |
|---|---|
| **Storage** | IndexedDB (books, progress, vocabulary profile); small `localStorage` metadata |
| **Local-first** | No account; no cloud sync in MVP |
| **User content** | EPUB files supplied by user; stored locally |
| **Hosted content** | App does not ship copyrighted books or public translated works |
| **Vocabulary seed data** | Curated compact JSON; source PDFs not copied into datasets |
| **CDN** | epub.js / JSZip from CDN today — third-party request; document in PRIVACY (**TBD**) |
| **API keys** | User keys must not ship in repo; translation sends chapter text to provider — flow **TBD** in privacy doc |
| **Analytics** | None required for MVP — **TBD** if added later |

**Future:** Profile import/export as sync-lite without full account system.

---

## 12. Technical Architecture & Constraints

### Stack (current)

- Static web app — no build step
- Browser ES modules: `app.js`, `epubLoader.js`, `vocabEngine.js`, `levelBaselineEngine.js`, `storage.js`, `readingModes.js`, `translationEngine.js`, `glossaryEngine.js`, `navigationEngine.js`
- epub.js + JSZip (CDN)
- IndexedDB persistence
- Node tests for pure logic (`tests/*.test.mjs`)

### Module boundaries

| Module | Responsibility |
|---|---|
| `app.js` | UI state, views, events, orchestration |
| `epubLoader.js` | EPUB parse/load only |
| `vocabEngine.js` | Vocabulary match, Preview, annotate HTML |
| `levelBaselineEngine.js` | Baseline + effective known words |
| `storage.js` | IndexedDB + profile helpers |
| `readingModes.js` | Mode render decisions |
| `translationEngine.js` | Future provider boundary |

### Hard constraints

1. **No API keys in frontend-owned code.**
2. **Optional modules** (personalization, translation) must lazy-load with safe fallback.
3. **EPUB import and chapter render** are primary paths — never blocked by optional features.
4. **Do not** implement DeepL (or any paid provider) directly in browser bundle with secrets.
5. Keep pure logic testable; prefer small modules over monolithic `app.js` growth.

---

## 13. Milestones & Release Phases

### M0 — Stabilization & governance docs

| | |
|---|---|
| **Goal** | Align docs and agent workflow before public release noise. |
| **Deliverables** | This PRD + CN mirror; `PROJECT_STATE.md`, `DECISION_LOG.md`, `AI_WORKFLOW_PROTOCOL.md` (**TBD** creation); resolve HANDOFF vs PRD drift items. |
| **Definition of done** | Contributors know which doc to read first; decision log has rename + Mastered v1 entry. |
| **Risks** | Doc drift continues if README not refreshed. |

### M1 — Reader MVP

| | |
|---|---|
| **Goal** | Stable English Study reading loop. |
| **Deliverables** | EPUB import, navigation, progress restore, mobile overlay — largely **Implemented**; regression tests green; rename UI to Interleaf Reader (**Planned**). |
| **Definition of done** | New user can import, read, resume, forget book without navigation/view bugs. |
| **Risks** | CDN outage; epub.js compatibility edge cases. |

**Status:** Largely **Implemented**; stabilization and rename remain.

### M2 — Vocabulary Library v1

| | |
|---|---|
| **Goal** | Reading-derived vocabulary collection shippable. |
| **Deliverables** | Preview, bubble, profile, Library, export, baseline filtering — largely **Implemented**; comfort-level UI optional for v1 (**TBD**). |
| **Definition of done** | Known/Save/Hide + export work across refresh; semantics documented. |
| **Risks** | Known vs Mastered label confusion; users expect flashcards. |

**Status:** Largely **Implemented**.

### M3 — PWA / open-source release readiness

| | |
|---|---|
| **Goal** | Public static deploy + OSS hygiene. |
| **Deliverables** | GitHub Pages config; manifest + service worker (**Planned**); vendored scripts (**Planned**); LICENSE (**TBD**); CONTRIBUTING; PRIVACY; README refresh; screenshots. |
| **Definition of done** | Public repo (or **TBD** private beta) with installable or bookmarkable HTTPS app and legal docs. |
| **Risks** | `source_materials/` PDFs in public repo; license choice. |

**Status:** **Planned**.

### M4 — Translation architecture / provider settings

| | |
|---|---|
| **Goal** | Secure, provider-agnostic translation pipeline. |
| **Deliverables** | Provider interface; settings UI; key storage strategy (**TBD**); chapter queue + cache; one provider integrated (provider choice **TBD**). |
| **Definition of done** | One chapter translates end-to-end with protected terms and cached replay. |
| **Risks** | API key handling; cost; free provider quality. |

**Status:** **Planned**.

### M5 — Chinese & Mixed mode implementation

| | |
|---|---|
| **Goal** | Deliver post-MVP reading modes. |
| **Deliverables** | Real `translatedHtml` and Mixed output; mode UX; whole-book translation workflow. |
| **Definition of done** | User can read full chapter in Chinese and Mixed with glossary preservation. |
| **Risks** | Translation cost at book scale; Mixed word-selection rules **TBD**. |

**Status:** **Placeholder**.

### M6 — Post-MVP enrichment / export / sync

| | |
|---|---|
| **Goal** | Depth without scope creep on core reading. |
| **Deliverables** | Dictionary enrichment; true mastered lifecycle; profile import/export; optional AO3 helper / enhanced EPUB export — all **optional** and prioritized separately. |
| **Definition of done** | Per-feature PRD amendments in `DECISION_LOG.md`. |
| **Risks** | Scope creep; maintenance burden. |

**Status:** **Post-MVP**.

---

## 14. Success Metrics

| Metric | Type | Notes |
|---|---|---|
| **Chapter completion** | Quantitative | User reaches next chapter or % scroll through chapter |
| **Restore success** | Quantitative | Restore returns to correct chapter + approximate scroll |
| **Vocabulary save rate** | Quantitative | Save actions per session; Library growth |
| **Export usage** | Quantitative | Copy / CSV actions |
| **Translation cache hit rate** | Quantitative | Post-MVP — % chapters served from cache |
| **Qualitative feedback** | Qualitative | “Stayed in the story”; “Preview not too noisy” |
| **No startup/import regression** | Guardrail | Import and first chapter render succeed with personalization disabled/failing |

MVP does not require analytics SDK; metrics may be manual dogfood + issue reports until **TBD** telemetry policy.

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Translation cost** | Cache aggressively; block queue; user confirmation before whole-book translate; show cost hints **TBD** |
| **Free provider quality/limits** | Provider abstraction; allow switching; fall back to English Study |
| **API key handling** | No keys in frontend; companion proxy or OS storage — decision in M4 |
| **IndexedDB / storage limits** | Quota messaging; eviction policy for translation cache **TBD**; warn on large EPUBs |
| **CDN / offline dependency** | Vendor epub.js/JSZip; service worker caching in M3 |
| **Naming / doc drift** | Interleaf rename checklist; PRD + HANDOFF hierarchy; README refresh in M3 |
| **Known vs Mastered semantics** | v1 decision documented here; post-MVP lifecycle separately |
| **Scope creep** | Non-goals section; milestone gates; DECISION_LOG for new features |
| **Open-source maintenance** | CONTRIBUTING; good first issues; narrow MVP |
| **Copyright / privacy** | No hosted books; PRIVACY doc; `source_materials/` policy **TBD** for public repo |

---

## 16. Open-source Release Plan

| Item | Status |
|---|---|
| **GitHub repository** | **Planned** — public immediately vs private beta **TBD** |
| **README refresh** | **Planned** — align with PRD MVP |
| **LICENSE** | **TBD** — MIT suggested placeholder only |
| **CONTRIBUTING.md** | **TBD** |
| **PRIVACY.md** | **TBD** — required before broad public launch |
| **Issue / PR templates** | **Planned** |
| **Release checklist** | Version tag, changelog, smoke test on GitHub Pages |
| **Screenshots / demo** | **Planned** — no copyrighted book content in marketing assets |
| **Source material policy** | Reference PDFs under `source_materials/` — public repo inclusion **TBD**; never ship bulk extracted dictionary/book text in `data/` |

---

## 17. AI-assisted Development Workflow

The following governance docs **should be created** (currently missing):

- `docs/PROJECT_STATE.md` — current milestone, branch, blockers
- `docs/DECISION_LOG.md` — dated product/engineering decisions
- `docs/AI_WORKFLOW_PROTOCOL.md` — agent rules

### Recommended agent rules (summary)

1. **One task per session** — focused diff; update docs when behavior changes.
2. **Read first:** `INTERLEAF_READER_PRD.md` → `PRD_SOURCE_AUDIT.md` → `HANDOFF.md`.
3. **Branch naming:** `feature/`, `fix/`, `docs/` prefixes — exact convention **TBD**.
4. **Allowed without ask:** docs, tests for pure modules, small bugfixes per HANDOFF rules.
5. **Forbidden without explicit ask:** API keys in frontend; blocking import/render on optional modules; regressing MVP features.
6. **Return format:** what changed, status labels (Implemented/Planned/TBD), test notes.
7. **After each task:** update `HANDOFF.md` if implementation changed; log decisions in `DECISION_LOG.md`.
8. **Optional modules:** lazy-load + fail-open — mandatory from M1 onward.

---

## 18. Glossary

| Term | Definition |
|---|---|
| **PWA** | Progressive Web App — installable/offline-capable web app; full installability **Planned** |
| **EPUB** | Standard ebook format; user-imported; parsed via epub.js |
| **IndexedDB** | Browser database used for EPUB blobs, progress, vocabulary profile |
| **Local Library** | Saved EPUB books on this device (metadata + blobs) |
| **Vocabulary Preview** | Chapter-level list of recommended study terms before/during reading |
| **Vocabulary Library** | User’s persistent word lists (Learning / Mastered / Hidden) — reading-derived, not drills |
| **English Study Mode** | Original English text with vocabulary overlays — **MVP core** |
| **Chinese Reading Mode** | Full Chinese chapter for plot comprehension — **Placeholder** |
| **Mixed Mode** | Mostly Chinese with selected English words kept — **Placeholder** |
| **Translation Provider** | Pluggable backend for machine translation — **Planned** |
| **Protected Terms / Glossary** | Terms preserved in translation (names, fandom words, etc.) |
| **Known** | User already knows word; hide from Preview; stored in `knownWords` |
| **Save** | Add to learning list / Vocabulary Library (`learningWords`) |
| **Hide** | Not a learning target (`ignoredWords`) |
| **Mastered (v1)** | UI tab for `knownWords` archive — not post-learning lifecycle |
| **Local-first** | Data stays on device; no cloud account in MVP |
| **API key** | User or deployer credential for translation provider — never in public frontend code |

---

## Appendix A — Mode examples

**English Study Mode**

```text
Dean opened the door.
```

**Chinese Reading Mode (target)**

```text
Dean打开了门。
```

**Mixed Mode (target)**

```text
Dean opened 门。
```

---

## Appendix B — Implementation status legend

| Label | Meaning |
|---|---|
| **Implemented** | Shipped in current codebase per audit |
| **Partial** | Exists but incomplete vs full requirement |
| **Placeholder** | UI shell without real behavior |
| **Planned** | Designed but not built |
| **Post-MVP** | After first public MVP scope |
| **TBD** | Requires product/legal/technical decision |

---

*End of Interleaf Reader PRD v1.0*
