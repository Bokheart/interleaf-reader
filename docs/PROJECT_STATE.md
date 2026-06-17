# Interleaf Reader — Project State

**Last updated:** 2026-06-16  
**Active phase:** M0 — Stabilization & governance docs  
**Canonical product spec:** `docs/INTERLEAF_READER_PRD.md`

---

## Product identity

| Field | Value |
|---|---|
| **Product name** | Interleaf Reader |
| **Former codename** | Slash Reader v2 (still used by some internal paths, storage/debug namespaces, and older docs) |
| **Creator / internal brand** | BookHeart |
| **Mission** | Help users enjoy English fiction while naturally understanding the story and gradually absorbing vocabulary during reading. |
| **Positioning** | Local-first English fiction / long-form reading PWA for non-native readers. Vocabulary and translation support immersive reading—not memorization drills, generic translation, or social reading. |

---

## Current stable state

The codebase delivers a **working English Study Mode vertical slice**. EPUB import, chapter navigation, IndexedDB persistence, scroll progress restore, Vocabulary Preview, bubble, profile actions, and Vocabulary Library are implemented and usable in a local static-server workflow.

M1 stabilization smoke testing was completed on 2026-06-16; automated checks passed and the browser smoke passed. A repeatable copyright-safe smoke EPUB generator now creates `tests/fixtures/interleaf_smoke.epub` for future browser checks. No blocking MVP app bugs were found. See `docs/M1_STABILIZATION_REPORT.md`.

M1 (Reader MVP) and M2 (Vocabulary Library v1) are **largely implemented** but not fully closed: user-facing app copy now says Interleaf Reader and Mixed Mode, some docs are stale, and full PWA / open-source release artifacts are missing.

**Active phase M0** focuses on governance docs, doc hierarchy, and decision logging—not new product features. Governance docs (`AGENTS.md`, `PROJECT_STATE.md`, `DECISION_LOG.md`, `AI_WORKFLOW_PROTOCOL.md`) are **created**, `README.md` has been refreshed for Interleaf Reader, `PRIVACY.md` / `CONTRIBUTING.md` have been drafted for the local-first MVP, the final `LICENSE` file now documents the custom non-commercial community license, GitHub issue/PR templates are drafted, GitHub Pages deployment prep is documented, and the commercial permission process is documented. M0 remains open for maintainer contact, legal review, remote Pages verification, PWA release work, and any remaining PRD/HANDOFF drift cleanup.

---

## Active phase: M0 — Stabilization & governance docs

| | |
|---|---|
| **Goal** | Align docs and agent workflow before public release. |
| **In progress** | M0 close-out: maintainer contact; legal review decision; remote Pages verification; HANDOFF/PRD drift cleanup; M3 release planning. |
| **Completed (M0)** | Root `AGENTS.md`; `PROJECT_STATE.md`, `DECISION_LOG.md`, `AI_WORKFLOW_PROTOCOL.md`; PRD + CN PRD; `PRD_SOURCE_AUDIT.md`; Interleaf Reader `README.md` refresh; `OPEN_SOURCE_RELEASE_CHECKLIST.md`; `PRIVACY.md` local-first MVP draft; `CONTRIBUTING.md` open-source workflow draft; `LICENSE_DECISION.md` custom non-commercial license direction and commercial permission process; final `LICENSE` file; GitHub issue templates and PR template; GitHub Pages deployment prep doc + `.nojekyll` + root redirect `index.html`; minimal PWA manifest and self-authored app icons; PWA offline/cache plan; user-facing app rename cleanup; user-facing Mixed Mode copy cleanup; M1 stabilization smoke report; repeatable smoke EPUB fixture generator. |
| **Definition of done** | Contributors know which doc to read first; decision log seeded; governance docs linked from HANDOFF. |

---

## Implemented features

*Per `docs/PRD_SOURCE_AUDIT.md` and `docs/HANDOFF.md` — conservative list.*

### Reading & library

- EPUB import (file picker + drag-and-drop) with diagnostics panel
- User-facing browser title and Home branding use Interleaf Reader; legacy internal storage/debug/path names are preserved for compatibility
- epub.js + JSZip load path; chapter list from spine; fallback chapter labels
- Chapter navigation (TOC, Previous/Next, Back to Top, progress text, mobile tap controls)
- English Study Mode with vertical scroll
- Home / Reader / Vocabulary Library views (mutually exclusive)
- Local Library (saved EPUB metadata; Open / Forget with in-app modal)
- IndexedDB: EPUB blob, metadata, reading progress (`scrollRatio`, `currentMode`, etc.)
- Scroll progress restore (approximate); Resume / Continue Reading / Forget saved book
- Mobile reader overlay; bottom sheets for Chapters, Preview, Mode

### Vocabulary

- Vocabulary Preview from curated seed datasets (`vocabulary.json`, `slang_idioms.json`)
- Underlined terms; click/tap bubble (term, 中文, English definition, IELTS usage when available)
- Level baseline filtering (`levelBaselineEngine.js`, `data/levels/level*.json`) — lazy-loaded, fail-open
- Profile: `knownWords`, `learningWords`, `ignoredWords`; default `selectedLevel` level3
- Preview actions: **Known**, **Save**, **Hide**
- Vocabulary Library: Learning / Mastered / Hidden tabs; manual Add to Learning; Remove
- Export: Copy Learning, Copy All, Download CSV

### Developer / quality

- Pure-logic tests: `vocabEngine`, `glossaryEngine`, `navigationEngine`, `storage`, `levelBaselineEngine`, `homeState`
- Dev diagnostics: `window.__slashReaderDebug.getDiagnostics()`
- Book Glossary skeleton (rule extraction + mock classifier) — dev/support, not core user MVP

---

## Placeholder / planned features

| Area | Status |
|---|---|
| Chinese Reading Mode | **Placeholder** — post-MVP |
| Mixed Mode (`cloze-mixed` internally) | **Placeholder** — post-MVP; user-facing copy says Mixed Mode |
| Translation providers | **Planned** — not implemented |
| Whole-book translation workflow | **Planned** |
| Comfort-level onboarding UI | **Planned** — API exists; default level3 only |
| Full candidate scoring / enrichment | **Post-MVP** |
| True learning → mastered lifecycle | **Post-MVP** |
| PWA manifest + service worker | **Partial** (M3); minimal manifest, self-authored app icons, and offline/cache plan exist; service worker remains planned |
| GitHub Pages deployment | **Prep documented** (M3); remote enablement and deployed smoke test pending |
| Legal/contact follow-ups | **TBD** (M3); commercial permission process is documented, but maintainer contact and legal review remain pending |
| Internal legacy names / namespaces | **Intentional compatibility** - some paths, storage keys, and debug globals still use Slash naming |
| Cloud sync / accounts | **Out of MVP scope** |
| AO3 extension, enhanced EPUB export | **Post-MVP optional** |

---

## Known risks

| Risk | Notes |
|---|---|
| **Doc drift** | `README.md` refreshed on 2026-06-16; `PRODUCT_SPEC.md` and parts of `VOCABULARY_PERSONALIZATION_PLAN.md` may still lag PRD/HANDOFF |
| **Naming confusion** | Public copy uses Interleaf Reader and Mixed Mode; legacy internal names such as `cloze-mixed` still need care |
| **Known vs Mastered UX** | Mastered tab shows `knownWords`; users may expect flashcards or post-learning archive |
| **CDN dependency** | epub.js / JSZip from jsDelivr — offline/PWA weakness |
| **IndexedDB quotas** | Large EPUBs + future translation cache — no eviction policy yet |
| **Translation (future)** | Cost, API key handling, free provider quality — all TBD |
| **Privacy follow-ups** | Translation provider data flow, user API key UX, analytics policy, CDN vs vendored scripts, and children-friendly edition remain TBD |
| **License follow-ups** | Commercial permission process is documented; maintainer contact and legal review remain TBD |
| **Copyright / OSS** | `source_materials/` PDFs; public repo policy TBD |
| **Scope creep** | Translation, enrichment, AO3, teen mode easy to over-build |

---

## Do-not-touch areas

Unless a task explicitly targets them **and** follows `docs/AI_WORKFLOW_PROTOCOL.md`:

1. **Do not regress MVP paths:** EPUB import, chapter render, English Study Mode, navigation, view isolation (Home / Reader / Vocabulary Library).
2. **Do not put API keys** in `pwa-reader/` or any committed frontend code.
3. **Do not block import/render** on optional modules (personalization, translation, glossary).
4. **Do not implement real translation providers** in the browser bundle without secure key boundary (per PRD M4).
5. **Do not replace placeholder Chinese/Mixed modes** with fake “translations” without provider architecture.
6. **Do not mutate global vocabulary datasets** from user actions — personalization lives in IndexedDB profile only.
7. **Do not host copyrighted books or bulk dictionary text** in `data/` or the app bundle.

---

## Backlog

Ordered by PRD milestones after M0:

| Priority | Milestone | Summary |
|---|---|---|
| 1 | **M0 close-out** | Decide maintainer contact for license/commercial permission requests; keep legal review and privacy follow-ups tracked |
| 2 | **M1 stabilization** | Smoke test and repeatable copyright-safe EPUB fixture workflow complete |
| 3 | **M2 polish** | Comfort-level UI decision; Known/Mastered copy clarity |
| 4 | **M3** | Remote GitHub Pages enablement/smoke test, service worker, vendored scripts, release smoke assets |
| 5 | **M4** | Translation provider abstraction + secure key strategy |
| 6 | **M5** | Chinese + Mixed mode implementation |
| 7 | **M6** | Enrichment, true mastered lifecycle, profile import/export, optional AO3/export |

---

## Next recommended task

**M3 PWA readiness: implement a minimal app-shell service worker only after following `docs/PWA_OFFLINE_CACHE_PLAN.md`.**

---

## Document map

| Read first | Purpose |
|---|---|
| `AGENTS.md` | Concise instructions for AI agents before repository work |
| `docs/INTERLEAF_READER_PRD.md` | Product requirements (canonical) |
| `docs/PRD_SOURCE_AUDIT.md` | Implementation inventory |
| `docs/HANDOFF.md` | Engineering handoff / run instructions |
| `docs/PROJECT_STATE.md` | This file — where we are now |
| `docs/DECISION_LOG.md` | Dated decisions |
| `docs/AI_WORKFLOW_PROTOCOL.md` | Agent/contributor workflow |

---

*Update this file at the end of any milestone shift or major implementation change.*
