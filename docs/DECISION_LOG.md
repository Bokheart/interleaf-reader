# Interleaf Reader — Decision Log

## 2026-06-17 - Commercial permission process documented

| Field | Value |
|---|---|
| **Status** | Active; maintainer contact TBD |
| **Decision** | Commercial permission requests should be handled through a separate written permission process. Requests should describe requester identity, intended commercial use, distribution/monetization model, modifications, branding, privacy/data flows, audience, and timeline. |
| **Rationale** | The custom non-commercial license requires a clear boundary between community/non-commercial use and commercial permission. Public issues, pull requests, forks, discussions, or silence from the maintainer must not imply commercial permission. |
| **Follow-up** | Publish maintainer contact and decide whether the final `LICENSE` text should mirror the full process note. |
| **References** | `docs/LICENSE_DECISION.md`; `CONTRIBUTING.md`; `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md` |

---

## 2026-06-16 - Final non-commercial license file created

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | The project now includes `LICENSE`: **Interleaf Reader Non-Commercial Community License**. It is a custom source-available, non-commercial license, not an OSI-approved open-source license. |
| **Rationale** | This implements the documented owner intent: community-readable source for personal, educational, research, hobby, and other non-commercial use, while requiring separate written permission for commercial use. |
| **Follow-up** | Maintainer contact, commercial permission process, and legal review remain TBD before broad public release. |
| **References** | `LICENSE`; `docs/LICENSE_DECISION.md`; `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md`; `CONTRIBUTING.md` |

---

## 2026-06-16 - License direction: non-commercial community license

| Field | Value |
|---|---|
| **Status** | Active direction; final `LICENSE` pending |
| **Decision** | Interleaf Reader will use a custom source-available, non-commercial community license. It should permit personal, educational, research, hobby, and other non-commercial use, while requiring separate written permission for commercial use. |
| **Rationale** | The owner wants the code to be publicly visible and community-friendly, but does not want default permission for resale, paid app packaging, commercial SaaS/service use, commercial closed-source reuse, or commercial branding use. MIT is too permissive, while GPL/AGPL do not prohibit commercial use. |
| **Follow-up** | Create the final `LICENSE` file, confirm maintainer contact and commercial permission process, and update README / CONTRIBUTING / PROJECT_STATE / release checklist after final review. |
| **References** | `docs/LICENSE_DECISION.md`; `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md`; `CONTRIBUTING.md` |

---

## 2026-06-16 - User-facing Mixed Mode terminology

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | User-facing product and UI copy should say **Mixed Mode**, not **Cloze Mixed**. Internal compatibility names such as `cloze-mixed`, `clozeHtml`, and related stored progress values remain unchanged. |
| **Rationale** | The PRD names the product mode Mixed Mode; keeping internal values avoids breaking mode switching, cached chapter fields, or saved progress. |
| **Follow-up** | Future translation work may revisit internal naming only with an explicit migration plan. |
| **References** | PRD section 8; `docs/HANDOFF.md`; `docs/PROJECT_STATE.md` |

---

## 2026-06-16 - User-facing Interleaf rename cleanup

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | User-facing app copy should present the product as **Interleaf Reader**. Legacy internal compatibility names remain unchanged, including repo/folder paths, IndexedDB/localStorage namespaces, debug globals such as `window.__slashReaderDebug`, and script-status globals. |
| **Rationale** | Public copy should match the product name while avoiding storage resets, broken diagnostics, or unnecessary migration risk. |
| **Follow-up** | Future rename work should audit user-facing copy only unless an explicit compatibility migration is scoped and tested. |
| **References** | PRD section 3; `docs/PROJECT_STATE.md`; `docs/HANDOFF.md` |

---

Chronological record of product and engineering decisions. When implementation changes behavior, add an entry here and update `HANDOFF.md` / `PROJECT_STATE.md` as needed.

**Canonical product spec:** `docs/INTERLEAF_READER_PRD.md`

---

## How to use

- New decisions: append at the **top** (newest first) with date `YYYY-MM-DD`.
- Status: **Active**, **Superseded**, or **TBD follow-up**.
- Link PRD sections when helpful.
- Do not delete old entries; mark superseded instead.

---

## 2026-06-16 — One task per AI session

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | AI-assisted work runs **one focused task per session** with a clear contract, small diff, and doc updates at the end. |
| **Rationale** | Reduces regressions, scope creep, and conflicting changes across Home/Reader/Vocabulary Library. |
| **References** | PRD §17; `docs/AI_WORKFLOW_PROTOCOL.md` |

---

## 2026-06-16 — No cloud sync or account in MVP

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | MVP has **no user accounts, no cloud library, no cross-device sync**. All books, progress, and vocabulary profile stay in browser IndexedDB on this device. |
| **Rationale** | Local-first reduces complexity, privacy surface, and infrastructure cost for first release. |
| **Follow-up** | Profile import/export as sync-lite may be considered post-MVP (M6). |
| **References** | PRD §6, §9.4, §11 |

---

## 2026-06-16 — PWA / static hosting target

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | Ship as a **static web app** with **GitHub Pages** (or equivalent static hosting) as the deployment target. Full PWA installability (manifest + service worker) is **planned** but **not complete** today. |
| **Rationale** | Matches current no-build ES module architecture; low hosting cost; fits open-source distribution. |
| **Follow-up** | M3 deliverables: manifest, service worker, vendored epub.js/JSZip. |
| **References** | PRD §9.9, §13 M3 |

---

## 2026-06-16 — No API keys in frontend

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | **No developer-owned or user API keys** in committed frontend JavaScript. Translation credentials require a **TBD** secure boundary (settings UX, companion server, or proxy) before any real provider integration. |
| **Rationale** | Keys in static client code are exposed to all users; violates basic secret hygiene. |
| **References** | PRD §9.7, §12; HANDOFF development rules |

---

## 2026-06-16 — Translation provider must be provider-agnostic

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | Translation architecture uses a **provider-agnostic** `translationEngine` boundary. Supported provider *types* include None, free/basic, DeepL (optional quality tier), Google/other with user key, custom endpoint, and future local/self-hosted. **DeepL is not the only provider.** |
| **Rationale** | Avoid vendor lock-in; allow free tier and user-chosen providers; match diverse user budgets. |
| **Follow-up** | First integrated provider TBD (M4). User API key UX TBD. |
| **References** | PRD §9.7 |

---

## 2026-06-16 — Chinese Reading Mode and Mixed Mode are post-MVP placeholders

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | **Chinese Reading Mode** and **Mixed Mode** are core **product goals** but **not MVP deliverables**. Current UI shows **placeholder panels only**; switching modes must preserve chapter/scroll but must not imply real translation. |
| **Rationale** | MVP value is English Study vertical slice; translation requires M4 architecture first. |
| **Engineering note** | Code uses `cloze-mixed` for Mixed Mode; user-facing copy should prefer **Mixed Mode**. |
| **References** | PRD §8, §9.7, §13 M5 |

---

## 2026-06-16 — Mastered tab = Known archive for v1

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | In v1, the Vocabulary Library **Mastered** tab displays words in `knownWords` (from **Known** action in Preview). This is an **“already known” archive**, not the post-learning **mastered-after-save** lifecycle described in `VOCABULARY_INTERACTION_SEMANTICS.md`. |
| **Rationale** | Matches current implementation; avoids half-built lifecycle in MVP. |
| **Follow-up** | True learning → mastered lifecycle deferred to post-MVP (M6). May rename tab or split lists later. |
| **References** | PRD §9.6; `VOCABULARY_INTERACTION_SEMANTICS.md` (partially superseded on Mastered) |

---

## 2026-06-16 — Known / Save / Hide v1 semantics

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | Vocabulary Preview actions in v1: **Known** → `knownWords`, hide from Preview; **Save** → `learningWords`, Vocabulary Library Learning tab; **Hide** → `ignoredWords`, hide from Preview. Vocabulary Library is **reading-derived**, not a memorization-drill product. |
| **Rationale** | Keeps reading flow primary; clear three-action model on mobile. |
| **References** | PRD §9.6; `VOCABULARY_INTERACTION_SEMANTICS.md` |

---

## 2026-06-16 — MVP scope definition

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | **MVP** includes: English Study Mode, EPUB import, chapter navigation, Home / Reader / Vocabulary Library views, Local Library, IndexedDB persistence, scroll progress restore, mobile reader overlay, Vocabulary Preview, vocabulary bubble, level baseline filtering, user vocabulary profile (Known / Save / Hide), manual vocabulary add, export (Copy Learning, Copy All, CSV). **Excludes** real Chinese/Mixed translation, cloud sync, accounts, spaced repetition. |
| **Rationale** | Shippable local-first reading loop with vocabulary support. |
| **References** | PRD §2, §6, §13 M1–M2 |

---

## 2026-06-16 — Former codename Slash Reader v2

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | Public product name is **Interleaf Reader**. **Slash Reader v2** remains the former codename for repo paths, internal compatibility names, and some older docs. |
| **Rationale** | “Interleaf” reflects layered cross-language reading; codename preserved for engineering continuity during transition. |
| **Follow-up** | Do not rename storage/debug/internal compatibility names without an explicit migration task. |
| **References** | PRD §3 |

---

## 2026-06-16 — Product name Interleaf Reader

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | Official product name: **Interleaf Reader**. Creator/internal brand: **BookHeart**. |
| **Rationale** | Distinct public identity; aligns with mixed English–Chinese reading vision (e.g. `Dean opened 门。`). |
| **References** | PRD §3 |

---

## Template (copy for new entries)

```markdown
## YYYY-MM-DD — Short title

| Field | Value |
|---|---|
| **Status** | Active |
| **Decision** | |
| **Rationale** | |
| **Follow-up** | |
| **References** | |
```

---

*Newest entries at top. Do not remove history.*
