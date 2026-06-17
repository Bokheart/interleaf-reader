# Interleaf Reader — AI Workflow Protocol

Rules for Codex, Cursor, and other AI agents working in this repository. Humans contributing code should follow the same principles where practical.

**Canonical product spec:** `docs/INTERLEAF_READER_PRD.md`

---

## 1. Required reading order

Before starting a task, read in this order:

| Order | Document | Why |
|---|---|---|
| 1 | `docs/INTERLEAF_READER_PRD.md` | What the product is and is not; MVP vs post-MVP |
| 2 | `docs/PRD_SOURCE_AUDIT.md` | What is implemented vs placeholder |
| 3 | `docs/PROJECT_STATE.md` | Current phase, backlog, do-not-touch areas |
| 4 | `docs/DECISION_LOG.md` | Binding decisions (semantics, security, scope) |
| 5 | `docs/HANDOFF.md` | Run/test instructions; implementation snapshot |
| 6 | Task-specific docs | e.g. `VOCABULARY_INTERACTION_SEMANTICS.md` only if touching vocabulary UX |

If the user assigns a **documentation-only** task, still read PRD § relevant sections and `PROJECT_STATE.md`.

**Chinese PRD:** `docs/INTERLEAF_READER_PRD_CN.md` — use for localized copy tasks; English PRD remains canonical for behavior.

---

## 2. One task per session

- **One focused task** per agent session: one bug, one doc update, one small feature slice, or one test/fix pass.
- Do not combine unrelated refactors, rename sweeps, and new features in the same session.
- If scope grows, **stop**, document what remains, and recommend a follow-up task.
- Prefer **small, testable diffs** over large rewrites.

---

## 3. Task contract template

Every implementation task should be expressible in this form (user or agent fills in brackets):

```text
Task: [one-line goal]
Type: [docs | fix | feature | test | refactor]
Milestone: [M0 | M1 | M2 | M3 | M4 | M5 | M6 | none]
In scope:
- [bullet]
Out of scope:
- [bullet]
Files expected to touch:
- [paths]
Must not break:
- EPUB import, chapter render, English Study Mode, view isolation
Definition of done:
- [bullet]
Docs to update:
- [HANDOFF | PROJECT_STATE | DECISION_LOG | README | none]
```

If the user does not provide a contract, infer one and state it at the start of the session.

---

## 4. Allowed files

### Documentation tasks (default safe)

- `docs/**`
- `README.md`
- `generated/reports/**` (if regenerating reports is explicitly requested)
- `.github/**` (templates, workflows — when requested)

### Implementation tasks (only when explicitly requested)

- `pwa-reader/*.js`, `pwa-reader/index.html`, `pwa-reader/styles.css`
- `tests/*.test.mjs`
- `data/**` only when task is vocabulary dataset work with copyright rules respected
- `scripts/**` for tooling explicitly requested

### Tests

- Add or update tests in `tests/` for **pure logic** changes.
- Do not run long or full browser automation suites unless the user asks.

---

## 5. Forbidden or restricted actions

Unless the user **explicitly** requests otherwise:

| Forbidden | Reason |
|---|---|
| API keys, secrets, tokens in any committed file | PRD §12; DECISION_LOG 2026-06-16 |
| Blocking EPUB import / chapter render on optional modules | Personalization and translation must fail-open |
| Real translation API calls from frontend with embedded credentials | M4 security boundary |
| Deleting or regressing MVP features without approval | Import, navigation, English Study, Preview, bubble, Local Library |
| Mutating `data/vocabulary.json` from user runtime actions | Profile-only personalization |
| Bulk copying copyrighted text into `data/` | `VOCABULARY_DATASET_PLAN.md` |
| `git push --force`, hard reset, amending others' commits | User git safety rules |
| Unrelated drive-by refactors | Minimize scope |
| Implementing Chinese/Mixed **real** translation in a “quick” task | Requires M4+ architecture |

---

## 6. Task types

| Type | Description | Typical outputs |
|---|---|---|
| **docs** | PRD, HANDOFF, governance, README | Markdown only |
| **fix** | Bug fix with minimal diff | JS/HTML/CSS + test if pure logic |
| **feature** | New behavior within PRD milestone | Module changes + tests + HANDOFF |
| **test** | Tests only or test + tiny fix | `tests/*.test.mjs` |
| **refactor** | Structure change, no behavior change | Requires tests green; user should ask explicitly |

Default unknown requests to **docs** or ask for clarification before touching `pwa-reader/`.

---

## 7. Branch naming convention

Use lowercase with prefix:

| Prefix | Use |
|---|---|
| `docs/` | Documentation and governance |
| `fix/` | Bug fixes |
| `feature/` | New product behavior |
| `chore/` | Tooling, deps, non-user-facing |
| `test/` | Test-only changes |

Examples:

- `docs/governance-m0`
- `fix/chapter-toc-jump`
- `feature/comfort-level-ui`

If not using branches (direct main work), still tag the task type in commit messages when the user commits.

---

## 8. Safety rules

1. **Product direction:** Reading-first PWA—not flashcard app, not generic translator, not social platform.
2. **MVP guardrails:** English Study Mode is the production path; Chinese/Mixed stay placeholders until M5 after M4.
3. **Optional modules:** Lazy-load personalization, translation, enrichment; on failure, fall back without breaking read path.
4. **View isolation:** Home, Reader, Vocabulary Library must stay mutually exclusive; hidden views must not capture pointer events.
5. **Storage:** IndexedDB is local to browser; no silent cloud upload.
6. **Copyright:** User supplies EPUBs; app does not ship books or public translations.
7. **Honesty:** Label status as Implemented / Partial / Placeholder / Planned in handoff updates.

---

## 9. Standard return format

End every session with a structured summary. Use this exact section layout when the user requests it:

```text
A. What changed
   - files created/changed

B. [Task-specific summary]
   - bullets

C. Important decisions (if any)
   - or "None — docs-only" / "See DECISION_LOG"

D. What was not implemented
   - explicit out-of-scope items

E. Recommended next prompt
   - one small follow-up task only
```

For coding tasks, also include:

- **Status labels** on features touched (Implemented / Partial / Planned).
- **Tests run** (command + pass/fail) or “not run”.
- **Manual check** reminder if UI changed (browser smoke from HANDOFF).

---

## 10. End-of-task checklist

Before finishing:

- [ ] Task contract scope met; out-of-scope items listed in return summary.
- [ ] No secrets committed; no API keys in frontend.
- [ ] MVP paths not regressed (or regression called out explicitly).
- [ ] Pure logic changes have tests updated or added when reasonable.
- [ ] **`docs/HANDOFF.md`** updated if implementation behavior changed.
- [ ] **`docs/DECISION_LOG.md`** updated if a new product/engineering decision was made.
- [ ] **`docs/PROJECT_STATE.md`** updated if milestone, backlog, or stable state changed.
- [ ] Did not edit unrelated files.
- [ ] Return summary uses standard format when requested.

---

## 11. Optional modules rule (mandatory)

Code paths for vocabulary personalization, translation, glossary enrichment, and future providers must:

1. **Lazy-load** or stay behind dynamic import / async helpers.
2. **Catch errors** and fall back (e.g. unfiltered Preview, English Study only).
3. **Never** be required for `DOMContentLoaded`, EPUB import, or first chapter render.

Reference: `app.js` `getPersonalizedVocabularyPreviewItems` fail-open pattern; HANDOFF development rules.

---

## 12. When to escalate to the user

Ask before proceeding if the task requires:

- Choosing open-source **license** or public vs private repo timing.
- Storing **user API keys** (mechanism undecided).
- Shipping **Chinese/Mixed** translation without M4 design.
- Large **dataset** imports from `source_materials/`.
- Changing **Known / Mastered** semantics beyond DECISION_LOG v1 decision.

---

*Protocol version 1.0 — 2026-06-16. Amend via DECISION_LOG + PRD revision.*
