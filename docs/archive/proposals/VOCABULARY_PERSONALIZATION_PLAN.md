# Vocabulary Personalization Plan

## Status

Design document only. No runtime behavior is implemented yet.

Slash Reader v2 currently uses fixed curated vocabulary lists (`data/vocabulary.json`, `data/slang_idioms.json`) and simple chapter matching. This plan describes how Vocabulary Preview should evolve into a personalized learning layer without breaking the reading experience.

---

## 1. Product problem

Different users know different words. A reader at IELTS 5.5 may need help with `relentless`, while a reader at IELTS 7.0 may find it obvious. A fanfiction reader may already know fandom slang but struggle with literary idioms. A teen learner may need broader basic-word filtering than an adult fiction reader.

Fixed curated vocabulary lists are not enough because:

- They assume one learning level for everyone.
- They cannot reflect words the user has already mastered in real life or in past reading sessions.
- They cannot suppress words the user explicitly does not want to study.
- They cannot prioritize words the user is actively trying to learn.

A fixed basic whitelist is not enough because:

- “Basic” depends on the reader’s comfort level, not a single global cutoff.
- Fanfiction, literary fiction, and IELTS study use different word distributions.
- A static whitelist cannot adapt when the user marks words as known or adds words to a personal study list.

Slash Reader needs a **personalized vocabulary profile** that combines:

- a comfort-level baseline (“how much help do you want?”)
- user-specific known, learning, and ignored words
- candidate scoring so Preview stays focused
- optional future dictionary enrichment for missing meanings

The goal is not to show every unknown word. The goal is to show the **most useful words for this reader in this chapter**.

---

## 2. Target users

Primary users:

- **IELTS-oriented fanfiction / fiction readers** who want vocabulary support while reading English stories online or in EPUB form.
- **Non-native English readers** who can follow a story but still hit friction words that break flow.
- **Users who want vocabulary help while reading**, not a separate flashcard app disconnected from the chapter.

Secondary / future users:

- **Teen English learners** reading simplified or age-appropriate fiction with similar needs: fewer distractions, clearer difficulty control, and safe filtering of overly advanced or irrelevant terms.

Shared needs across these groups:

- Stay inside the reading flow.
- Avoid repeating words they already know.
- See useful study candidates, not noise.
- Control what gets highlighted without editing global datasets.

---

## 3. Comfort level baseline system

Comfort levels are **settings**, not placement tests. The user answers:

> **How much vocabulary help do you want?**

### Level 1 — Beginner / needs help with most English

- Baseline assumes the reader knows only a small core of high-frequency words.
- Preview should be generous but still capped per chapter.
- More underlines and Preview items are acceptable because the user asked for maximum help.

### Level 2 — Can read simple stories

- Baseline assumes the reader knows common everyday English and simple narrative vocabulary.
- Preview should focus on words above simple-story difficulty.
- Useful for graded readers, YA, or early fanfiction exposure.

### Level 3 — IELTS 5.5–6.0 / fanfic beginner

- Default target for current MVP audience.
- Baseline filters out a broad intermediate core.
- Preview emphasizes IELTS-useful, fiction-useful, and common study-worthy words.

### Level 4 — IELTS 6.5–7.0 / can read fanfic with help

- Baseline assumes stronger general English and common academic vocabulary.
- Preview should emphasize harder collocations, idioms, phrasal verbs, and less common fiction words.
- Fewer items should appear per chapter.

### Level 5 — Advanced reader / only show harder words

- Baseline assumes strong reading ability.
- Preview should show only notably difficult, rare, idiomatic, or domain-specific terms.
- Underlines should be sparse and high-value.

Important design rule: changing level updates the **baseline filter**, not the user’s personal known/learning/ignored lists.

---

## 4. Future data model

### Level baseline files

Global, read-only baseline word sets:

- `data/levels/level1_basic_words.json`
- `data/levels/level2_basic_words.json`
- `data/levels/level3_basic_words.json`
- `data/levels/level4_basic_words.json`
- `data/levels/level5_basic_words.json`

Suggested shape per file:

```json
{
  "levelId": "level3",
  "label": "IELTS 5.5–6.0 / fanfic beginner",
  "description": "Comfort baseline for readers who can follow fiction with moderate help.",
  "words": [
    "about",
    "after",
    "again"
  ],
  "updatedAt": "2026-06-15T00:00:00.000Z"
}
```

These files are **global baselines**. They are loaded at runtime and never mutated by user actions.

### IndexedDB user profile

Stored locally in the browser, separate from EPUB book storage.

```json
{
  "selectedLevel": "level3",
  "knownWords": [],
  "learningWords": [],
  "ignoredWords": [],
  "preferredCategories": ["ielts", "fiction", "slang"],
  "updatedAt": "2026-06-15T00:00:00.000Z"
}
```

Field meanings:

| Field | Purpose |
|---|---|
| `selectedLevel` | Current comfort baseline (`level1` … `level5`). Controls how aggressively common words are filtered. |
| `knownWords` | Normalized terms the user has marked as mastered (`已掌握`). Suppress from Preview and underlines. |
| `learningWords` | Terms the user wants to study (`加入生词本`). Boost in Preview even if baseline might otherwise hide them. |
| `ignoredWords` | Terms the user never wants prompted again (`不再提示`). Treated as known for Preview purposes. |
| `preferredCategories` | Optional ranking preferences such as `ielts`, `fiction`, `slang`, `idiom`, `phrasal_verb`. Does not hard-hide other categories initially. |
| `updatedAt` | Last profile change timestamp for sync/debug/export later. |

Normalization rule: all profile word lists store lowercase normalized lemmas/phrases using the same term normalization as `vocabEngine`.

---

## 5. Effective known words

At preview time, compute:

```text
effectiveKnownWords =
  selectedLevelBaselineWords
  ∪ user.knownWords
  ∪ user.ignoredWords
  − user.learningWords   (optional override when actively studying a word)
```

Interpretation:

- **Level baseline words** come from the selected level JSON file.
- **User known words** are personal mastery decisions and must live only in the user profile.
- **Ignored words** behave like known for prompting purposes.
- **Learning words** may remain visible even if they would otherwise be filtered as “too easy” by baseline.

Rules:

- Global level files must **never** be edited by user actions.
- Marking a word known adds it to `knownWords`, not to level files.
- Changing comfort level replaces the baseline set instantly without deleting personal lists.
- Restore flows must be able to move a word back from known/ignored into normal candidate handling.

---

## 6. User actions

### Mark as known / 已掌握

- Adds normalized term to `knownWords`.
- Removes from `learningWords` if present.
- Effect on Preview: term should not appear in Preview or underlines unless explicitly forced by debug/dev mode.

### Add to vocabulary / 加入生词本

- Adds normalized term to `learningWords`.
- Does not remove from chapter text.
- Effect on Preview: term gets a scoring boost and should remain visible even if near baseline boundary.

### Ignore this word / 不再提示

- Adds normalized term to `ignoredWords`.
- Effect on Preview: treated as known for prompting; user should not see it again unless restored.

### Restore word / 重新显示

- Removes term from `knownWords`, `learningWords`, and/or `ignoredWords` as appropriate.
- Effect on Preview: term becomes eligible again on next chapter render.

### Change comfort level

- Updates `selectedLevel`.
- Effect on Preview: baseline known set changes immediately; personal lists remain intact.
- UI copy should explain that this changes help amount, not personal mastery history.

All actions should update `updatedAt` and re-render the current chapter Preview only when needed.

---

## 7. Candidate classification

Each detected term should receive a classification label.

| Class | Meaning | Preview behavior |
|---|---|---|
| `curated_ielts` | Present in curated IELTS/general dataset with safe metadata | Strong Preview candidate; full bubble fields when available |
| `curated_fiction` | Present in curated fiction/general dataset | Strong Preview candidate |
| `slang` | Slang or informal usage | Preview candidate; category boost depends on user preference |
| `idiom` | Fixed idiomatic phrase | Preview candidate; often high value |
| `phrasal_verb` | Verb + particle pattern | Preview candidate; often high value for IELTS users |
| `unknown_candidate` | Detected in chapter text but not in curated datasets | May appear with pending meaning; lower trust until enriched |
| `proper_noun_or_glossary` | Character names, places, fandom terms, protected glossary items | Protected from bad “vocabulary” treatment; generally **not** a study word |

Preview should include:

- curated entries with definitions
- high-scoring unknown candidates when chapter quota allows
- learning words even if otherwise borderline

Preview should **not** treat as vocabulary:

- proper nouns and protected glossary terms unless user explicitly adds them to learning list
- extremely common function words
- words in `effectiveKnownWords`

Protected glossary terms may still matter for translation/export later, but they are not default Vocabulary Preview targets.

---

## 8. Candidate scoring

Use a simple transparent score for ranking chapter candidates.

Plain-English model:

```text
score =
    difficultyScore
  × categoryBoost
  × frequencyBoost
  × repetitionBoost
  × userLearningBoost
  − knownPenalty
  − tooEasyPenalty
  − properNounPenalty
```

Suggested factor meanings:

| Factor | Purpose |
|---|---|
| `difficultyScore` | Base difficulty from curated metadata, word length, rarity heuristics, or level distance |
| `categoryBoost` | Increase score for preferred categories such as IELTS, idiom, phrasal verb |
| `frequencyBoost` | Increase score when term appears multiple times in chapter |
| `repetitionBoost` | Increase score if term appeared in recent chapters and user has not marked it known |
| `userLearningBoost` | Large boost for `learningWords` |
| `knownPenalty` | Eliminate or heavily penalize words in `effectiveKnownWords` |
| `tooEasyPenalty` | Penalize words far below selected comfort level |
| `properNounPenalty` | Eliminate or heavily penalize protected names/glossary-only items |

Implementation note: scoring should live in a pure helper module so tests can cover ranking without browser UI.

---

## 9. Preview behavior

Vocabulary Preview is a **study sidebar**, not a dump of every unknown token.

Rules:

- Not every non-known word should be shown.
- Show only the **top 15–30 items per chapter** after scoring and filtering.
- Curated entries with definitions rank higher than unknown candidates.
- Unknown candidates may appear with **pending meaning** when score is high enough.
- Common words should be filtered by baseline + known penalties.
- User known words should not dominate Preview; they should disappear from it.
- Learning words may occupy reserved slots even if score would otherwise miss the cutoff.
- If fewer than the minimum useful count remain, show a calm empty state rather than lowering quality thresholds too far.

Preview item display tiers:

1. **Curated + complete metadata** — full card with type badge, Chinese meaning, English definition, source sentence.
2. **Learning word** — visibly marked as personal vocab.
3. **Unknown candidate** — term + source sentence + “meaning pending” state.

Underlines in chapter text should follow a stricter subset than Preview when necessary, so the reading surface stays calmer than the sidebar.

---

## 10. Bubble behavior

The bubble remains lightweight and trustworthy.

Rules:

- If a known curated definition exists, show:
  - Chinese meaning
  - English definition when available
  - IELTS usage when available
- If term is `unknown_candidate`, show:
  - term
  - source sentence if available
  - **pending meaning** copy such as “Definition not available yet”
- Do **not** hallucinate definitions in the bubble.
- Do not call external APIs during bubble open in early phases.
- Bubble content may later upgrade after offline/API enrichment, but only from stored enriched metadata.

Bubble is not the place for long study notes; Vocabulary Preview cards remain richer.

---

## 11. Future dictionary enrichment

Enrichment is a separate pipeline from candidate detection.

### Stage 1 — ECDICT offline enrichment

- Build a small compiled subset for matched candidates only.
- Fill missing Chinese meanings locally.
- No live API required at read time.

### Stage 2 — Free Dictionary API fallback

- Use only when local compiled data lacks an English definition.
- Cache results in app-ready JSON or IndexedDB enrichment records.
- Never block reading on network failure.

### Stage 3 — AI context meaning generator

- Optional context-aware meaning for hard fiction phrases.
- Input: term + short source sentence + chapter context snippet.
- Output candidate metadata only; not inline runtime generation on every click.

### Stage 4 — User review before saving generated meanings

- Generated meanings enter a review queue or “pending enrichment” state.
- User can accept, edit, or reject before the meaning becomes bubble-safe.
- Prevents low-quality or hallucinated study content from entering the personal profile.

Key rule: **candidate detection requires no API**. APIs are for enrichment only.

---

## 12. Future UI

### Onboarding

- Ask: “How much vocabulary help do you want?”
- Show the 5 comfort levels with plain descriptions.
- Optional category preference toggles: IELTS / fiction / slang.
- Allow skip with default `level3`.

### Settings

- Change comfort level any time.
- View counts: known words, learning words, ignored words.
- Restore/manage personal lists.
- Term-only local copy/CSV export exists; richer external export remains later.

### Preview card actions

Each Preview item gets compact actions:

- **Known** / 已掌握
- **Add to vocab** / 加入生词本
- **Ignore** / 不再提示

Optional overflow:

- **Restore** if item is in ignored/known state

### Personal vocabulary list

- Separate view or sheet for `learningWords`.
- Shows term, source book/chapter if available, meaning status, date added.
- Manual add is the first local-only step toward using Vocabulary Library as a broader personal vocabulary hub for words found outside Slash Reader.
- Future work may add dictionary sync/import and export to vocabulary apps, but no external sync/export exists in the current app.
- Current export is term-only local copy/CSV. Later export can add richer CSV/Anki/JSON formats.

UI principle: actions must be one tap on mobile and must not require leaving the chapter permanently.

---

## 13. Implementation roadmap

### Phase 2A — Design and prototype foundations

- Finalize this document.
- Add level baseline file skeletons under `data/levels/`.
- Add pure helper prototype for:
  - effective known set resolution
  - candidate classification hooks
  - scoring and top-N selection
- Keep current curated Preview working unchanged until integration gate.

### Phase 2B — User profile storage and actions

- Add IndexedDB vocabulary profile storage.
- Wire onboarding/settings for comfort level.
- Implement Preview card actions:
  - known
  - add to vocab
  - ignore
  - restore
- Re-render Preview using profile-aware scoring.

### Phase 2C — Dictionary enrichment skeleton

- Add enrichment record shape and cache layer.
- Integrate offline compiled subset first.
- Add optional API fallback with strict caching and no-read-blocking behavior.
- Mark unknown candidates as pending until enriched.

### Phase 2D — Review and export

- Personal vocabulary list UI.
- Review queue for generated meanings.
- Expand known/learning export beyond the current term-only local copy/CSV foundation.
- Optional sync remains out of scope until product decision.

---

## 14. Constraints

- **No API required for candidate detection.** Chapter scanning, curated matching, heuristics, and scoring must work offline.
- **APIs are only for enrichment.** Never block reading on network calls.
- **Do not hallucinate definitions.** Unknown means unknown until enriched or curated.
- **Preserve reading experience.** Preview and underlines must stay subordinate to the story text.
- **Do not overwhelm users.** Hard cap Preview count; prefer quality over coverage.
- **Do not mutate global datasets from user actions.** Personalization lives in the user profile only.
- **Keep modules testable.** Scoring, classification, and profile merge logic should remain pure helpers with unit tests.

---

## Relationship to current Phase 1 code

Current runtime behavior remains:

- curated seed datasets in `data/vocabulary.json` and `data/slang_idioms.json`
- chapter matching in `vocabEngine.js`
- Book Glossary skeleton in `glossaryEngine.js`
- lightweight bubble with curated fields only

This plan does not change any of the above until Phase 2 implementation begins.
