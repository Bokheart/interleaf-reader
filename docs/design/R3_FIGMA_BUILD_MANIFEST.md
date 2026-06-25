# R3 Figma Build Manifest — Batch 1

**Task:** R3-DESIGN-01  
**Status:** Documentation handoff (Figma build pack v1)  
**Visual direction:** Mineral Mist Editorial  
**Design viewport (mobile reference):** 393 × 852 logical px  
**Spacing rhythm:** 8-point base (4 px half-steps allowed for optical tuning)

This manifest defines the eight approved Batch 1 screens for Figma construction. It does not authorize runtime implementation. Placeholder and future capabilities must remain visually honest.

---

## Figma page structure (proposed)

| Page name | Contents |
| --- | --- |
| `00 — Foundations` | Color swatches (exploratory), type specimens, spacing/radius/shadow scales, icon samples, component stubs |
| `01 — Components` | Batch 1 reusable components and variant sets |
| `02 — App Shell` | Home, Library, Book Detail, Vocabulary (Default + state frames) |
| `03 — Settings` | Settings Home, Appearance, Reading, Language & Translation |
| `04 — Prototypes` | Linked flows for Batch 1 navigation |
| `99 — Future` | Reader, Preview, Provider Detail, Data & Privacy detail, Help detail (inventory only) |

---

## Naming rules

### Frame names

Use this exact pattern:

```text
{AREA} / {Screen} / {State}
```

- **AREA:** `APP` or `SETTINGS`
- **Screen:** canonical screen title (`Home`, `Library`, `Book Detail`, `Vocabulary`, `Appearance`, `Reading`, `Language & Translation`)
- **State:** `Default`, `Empty`, `Loading`, `Error`, or a specific variant label documented below

Examples:

- `APP / Home / Default`
- `APP / Library / Empty`
- `SETTINGS / Appearance / Default`

### Component names

PascalCase, no prefixes: `BottomNavigation`, `BookListRow`, `SettingsRow`.

### Layer names

Sentence case within frames: `ContinueReadingCard`, `Quick Actions`, `Section heading`.

### Auto Layout frames

Suffix optional: `— AL vertical` or `— AL horizontal` on container frames during build.

---

## Status naming rules

Append a `Status` text layer or component property on frames where helpful:

| Status label | Meaning |
| --- | --- |
| `Approved — Batch 1` | Build exactly as specified |
| `Placeholder — future` | Visible structure only; not implemented |
| `Exploratory` | Directional; not locked for implementation |

Batch 1 frames use `Approved — Batch 1`. Future-screen inventory frames use `Placeholder — future`.

---

## Prototype flow map (Batch 1)

```text
[App Shell — Bottom Nav]
  Home ←→ Library ←→ Vocabulary

Home
  → Import Book (future import flow; Quick Action tap)
  → Open Library (Library tab or Quick Action)
  → Start Reading / Resume Reading (ContinueReadingCard CTA) → Reader (future; not Batch 1)
  → Current Book Snapshot → Book Detail
  → Recent & Helpful row → contextual destination (Help / Guide; future detail)
  → Settings icon (top bar, directly visible) → Settings Home

Library
  → Import EPUB card → Import flow (future)
  → Book row tap → Book Detail
  → Search / Sort (in-place; no filter screen)
  → Overflow → Settings

Book Detail
  → Back → previous screen (Library or Home)
  → Resume Reading → Reader (future)
  → Version row → Reader with version context (future)
  → Add Language Version → Upload / Generate branches (future sub-flows)
  → Translation Jobs row → job detail (future; no pause/ETA UI)
  → Forget This Book → destructive confirm dialog (future)
  → More actions → overflow sheet (future)

Vocabulary
  → State group row → filtered list expansion (in-place or future list screen)
  → Add a Word or Phrase → inline submit
  → Reading Profile → Vocabulary Level controls (in-place section)
  → Export Vocabulary → export sheet (future)
  → Overflow → Settings, backup/restore or additional actions (future)

[Settings — full-screen, no bottom nav]
  Entry: Home top bar Settings icon (direct); Library and Vocabulary overflow menus

Settings Home
  → Appearance
  → Reading
  → Language & Translation
  → Data & Privacy (future screen — row only in Batch 1)
  → Help & About (future screen — row only in Batch 1)
  → Back → previous App Shell screen

Appearance → Back → Settings Home  
Reading → Back → Settings Home  
Language & Translation → Back → Settings Home
```

---

## Future-screen inventory

These screens may appear as linked placeholders or notes in Figma Page `99 — Future`. They are **not** Batch 1 completed designs.

| Frame name (proposed) | Purpose | Why deferred |
| --- | --- | --- |
| `APP / Reader / Default` | Immersive scroll reading | Reader chrome and sub-surfaces need separate R3 slice |
| `APP / Vocabulary Preview / Default` | Reader sub-page vocabulary workspace | Distinct from Vocabulary Library management |
| `SETTINGS / Translation Provider Detail / Default` | Provider connection and credentials | Real providers not implemented |
| `SETTINGS / Data & Privacy / Default` | Storage, backup, privacy detail | Listed on Settings Home only as navigation row |
| `SETTINGS / Help & About / Default` | Help Center and about | Listed on Settings Home only as navigation row |
| `APP / Import / Default` | EPUB import flow | Action-driven; not a primary tab |
| `APP / Book Detail / Translation Job Detail` | Single job inspection | No pause, ETA, or unsupported job controls |

---

# Batch 1 screen specifications

---

## 1. `APP / Home / Default`

### Purpose

Primary app landing. Surfaces the current reading session, quick paths to import and library, a snapshot of the active book, and lightweight helpful links. Reinforces reading-first posture.

### Entry point

- App launch (default tab)
- Bottom navigation **Home** tap from Library or Vocabulary

### Exit and Back behavior

- No Back control (root tab). System back / browser back may exit the PWA.
- Tab switches preserve Home scroll position within session.

### Fixed regions

| Region | Position | Notes |
| --- | --- | --- |
| Safe area top | Top | Status bar inset |
| Home top bar | Top | Editorial serif **Interleaf Reader** title and directly visible **Settings** icon in the same horizontal region; no Back control |
| Bottom navigation | Bottom | Home active |

### Scrollable regions

- Main content column between header and bottom nav (vertical scroll).

### Top-to-bottom section order

1. **Home top bar** — editorial serif `Interleaf Reader` (or localized app name) left-aligned; **Settings** icon button directly visible trailing; both coexist in one top region (not overflow-only)
2. **ContinueReadingCard** (primary content block)
   - Compact book cover
   - Book title
   - Current chapter label
   - Reading percentage
   - Primary CTA: **Start Reading** when the book has never been started; **Resume Reading** when saved reading progress exists (one card component; `ctaState` property — not separate screen structures)
3. **Quick Actions** row
   - Import Book
   - Open Library
4. **Current Book Snapshot** (SurfaceCard)
   - Cover thumbnail, title, author, progress summary
   - Tappable → Book Detail
5. **Recent & Helpful**
   - Section heading
   - 1–2 helpful rows (e.g., open Guide, reading tips link)
6. **Bottom navigation** (fixed)

### Primary action

**Start Reading** or **Resume Reading** (per `ContinueReadingCard` `ctaState`) — opens Reader (prototype link to future Reader frame).

### Secondary actions

- Settings icon (top bar) → Settings Home
- Import Book
- Open Library
- Current Book Snapshot tap
- Recent & Helpful rows
- Bottom nav tab switches

### Empty / loading / error states

| State frame | Behavior |
| --- | --- |
| `APP / Home / Empty` | No saved books: ContinueReadingCard hidden or replaced with editorial empty prompt; Quick Actions emphasized; Snapshot hidden |
| `APP / Home / Loading` | Skeleton placeholders for cover and title lines |
| `APP / Home / Error` | Inline banner: library or progress unavailable; retry not required if not implemented |

### Future placeholders

- Import drop zone detail screen

### Component references

`SectionHeading`, `ContinueReadingCard`, `BookCover`, `QuickAction`, `SurfaceCard`, `ProgressBar`, `BottomNavigation`, `BottomNavigationItem`, `PrimaryButton`, Settings icon (top bar)

### Auto Layout

- Root: **vertical**, fill container
- Home top bar: **horizontal**, space-between — editorial title hugs leading; Settings icon hugs trailing
- ContinueReadingCard: **horizontal** or **vertical** (cover left, text stack right) — hug height
- Quick Actions: **horizontal**, equal-width children, 8 px gap
- Sections: **vertical**, 24 px section gap

### Padding and gaps (8-pt rhythm)

- Screen horizontal padding: **16 px**
- Safe area top: **env(safe-area-inset-top)** + **8 px** below
- Home top bar to first section: **24 px**
- Section internal padding: **16 px**
- Card internal padding: **16 px**
- Bottom nav clearance: **56 px** + safe area bottom

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Mobile (393) | Single column; bottom nav |
| Tablet (768+) | Optional max content width 640 px centered; bottom nav may become side rail in later pass — Batch 1 may show centered column with bottom nav retained |
| Desktop (1024+) | Bounded workspace max ~960 px; consider two-column: ContinueReadingCard wider left, Quick Actions + Snapshot right |

---

## 2. `APP / Library / Default`

### Purpose

Browse locally saved books, import new EPUBs, search and sort the collection. Communicates local-only storage.

### Entry point

- Bottom navigation **Library**
- Home Quick Action: Open Library

### Exit and Back behavior

- Tab root: no Back
- Book row → Book Detail (push)
- Import card → future Import flow

### Fixed regions

- Bottom navigation (Library active)

### Scrollable regions

- Entire list column including search header

### Top-to-bottom section order

1. **Header row** — editorial serif `Library`; overflow menu (includes **Settings** — not a direct top-bar icon on Library)
2. **Search field** + **Sort** control (compact; no filter in current version)
3. **Metadata line** — book count + local-storage note
4. **Import EPUB** card (prominent SurfaceCard)
5. **Vertical book list**
   - Each `BookListRow`: cover, title, author or missing-author placeholder, chapter/location, progress bar + percentage, version summary
6. **Bottom navigation** (fixed)

### Primary action

**Import EPUB** card tap (future flow).

### Secondary actions

- Overflow → Settings
- Search (in-place filter)
- Sort (sheet or menu)
- Book row → Book Detail
- Tab navigation

### Empty / loading / error states

| State frame | Behavior |
| --- | --- |
| `APP / Library / Empty` | Zero books: Import EPUB card dominant; empty list message |
| `APP / Library / Loading` | Row skeletons (3) |
| `APP / Library / Error` | Could not load saved books banner |

### Future placeholders

- Filter control (explicitly excluded from current version — do not show in Default)
- Guide book row styling

### Component references

`SectionHeading`, `SurfaceCard`, `BookListRow`, `BookCover`, `ProgressBar`, `VersionSummary`, `BottomNavigation`, `PrimaryButton` (on Import card if needed)

### Auto Layout

- Root: **vertical**
- Search row: **horizontal**, search fills, sort hugs
- List: **vertical**, **8 px** gap between shadowed cards
- BookListRow internal: **horizontal**, cover fixed width, text stack **vertical**

### Padding and gaps

- Screen horizontal: **16 px**
- Title to search: **16 px**
- Search to metadata: **8 px**
- Metadata to Import card: **16 px**
- Import card to list: **16 px**
- Card elevation: subtle shadow (see Visual Foundations)
- List row gap: **8 px**
- Card internal padding: **16 px**

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Tablet | Wider cards; cover slightly larger; max list width 720 px centered |
| Desktop | Optional two-column grid for book rows at ≥1200 px; search/sort full width |

---

## 3. `APP / Book Detail / Default`

### Purpose

Single-book hub: progress, resume, version management, translation job visibility, and destructive forget. Long-scroll management layout.

### Entry point

- Library book row
- Home Current Book Snapshot

### Exit and Back behavior

- **Back** (SecondaryTopBar) → Library or Home (prototype: previous screen)
- Does not show bottom navigation

### Fixed regions

- SecondaryTopBar: Back, title, more actions (overflow)

### Scrollable regions

- All content below top bar

### Top-to-bottom section order

1. **SecondaryTopBar** — Back | `Book Detail` | More
2. **Hero block** — compact cover, title, author
3. **Current reading progress** — chapter/location + ProgressBar + percentage
4. **Resume Reading** — PrimaryButton full width
5. **Quick Actions** — horizontal chips or buttons (e.g., Contents — only actions supported by approved Book Detail scope; no book, EPUB, or version export)
6. **Versions Summary** — SectionHeading + summary text
7. **Version rows** (grouped list)
   - Original
   - Uploaded
   - Generated
   - Mixed
   - Each `VersionRow`: version type, language, status badge, progress if applicable
8. **Add Language Version**
   - SectionHeading
   - Upload branch row
   - Generate branch row (placeholder if generation not implemented)
9. **Translation Jobs** — SectionHeading + `TranslationJobRow` items (status only; **no pause, no ETA**)
10. **Book Info** — metadata section (format, added date, file size if known)
11. **Forget This Book** — DestructiveRow at scroll end

### Primary action

**Resume Reading**

### Secondary actions

- Back
- More overflow
- Version row tap
- Add Language Version branches
- Translation job row (view only)
- Forget This Book

### Empty / loading / error states

| State frame | Behavior |
| --- | --- |
| `APP / Book Detail / Loading` | Skeleton hero + progress |
| `APP / Book Detail / Error` | Could not load book banner |
| `APP / Book Detail / No Versions` | Only Original row; Add Language Version emphasized |

### Future placeholders

- Translation job detail screen
- Upload / Generate wizards
- Pause, cancel, ETA (explicitly prohibited)

### Component references

`SecondaryTopBar`, `BookCover`, `ProgressBar`, `PrimaryButton`, `QuickAction`, `SectionHeading`, `VersionSummary`, `VersionRow`, `StatusBadge`, `TranslationJobRow`, `DestructiveRow`, `SurfaceCard`

### Auto Layout

- Root: **vertical**
- Hero: **horizontal** cover + **vertical** text stack
- Version list: **vertical**, grouped with **1 px** dividers or **8 px** separated cards
- Add Language Version: **vertical** branch rows

### Padding and gaps

- Horizontal: **16 px**
- Top bar height: **56 px** + safe area
- Hero padding top: **16 px**
- Section gaps: **24 px**
- Row internal: **16 px** padding
- Destructive section top margin: **32 px**

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Tablet | Hero horizontal with wider cover; version list may use max width 640 px |
| Desktop | Two-column optional: hero + progress left, versions right |

---

## 4. `APP / Vocabulary / Default`

### Purpose

Vocabulary collection management: state groups, manual capture, reading profile, export. Not a study or flashcard app.

### Entry point

- Bottom navigation **Vocabulary**

### Exit and Back behavior

- Tab root: no Back
- Overflow → actions sheet (future)

### Fixed regions

- Bottom navigation (Vocabulary active)

### Scrollable regions

- Full content column

### Top-to-bottom section order

1. **Header row** — title `Vocabulary`, search field, overflow button (includes **Settings**)
2. **State Management** (grouped)
   - SectionHeading: `State Management`
   - `StateManagementGroup` containing:
     - Learning (`StateManagementRow` + count)
     - Known
     - Hidden
3. **Add a Word or Phrase** — independent `AddWordField` module (defaults new entries to Learning)
4. **Reading Profile** — Vocabulary Level selector + explanatory copy
5. **Export Vocabulary** — SectionHeading + export action rows
6. **Optional:** recent Learning preview (compact list, max 3 items)
7. **Bottom navigation**

**Prohibited concepts:** review queues, new/familiar/mastery labels, streaks, study time, flashcards.

### Primary action

**Add to Learning** (submit in AddWordField)

### Secondary actions

- Search
- State group navigation
- Export actions
- Overflow → Settings
- Tab navigation

### Empty / loading / error states

| State frame | Behavior |
| --- | --- |
| `APP / Vocabulary / Empty` | Zero words: State groups show 0; AddWordField emphasized |
| `APP / Vocabulary / Loading` | Skeleton groups |
| `APP / Vocabulary / Error` | Library unavailable banner |

### Future placeholders

- Full filtered word list screens per state
- Backup / Restore detail (may live in overflow)

### Component references

`SectionHeading`, `StateManagementGroup`, `StateManagementRow`, `AddWordField`, `SettingsRow` (for profile), `PrimaryButton`, `SecondaryButton`, `BottomNavigation`, `EmptyState`

### Auto Layout

- Root: **vertical**
- Header: **horizontal**
- State groups: **vertical** list, continuous surface with dividers
- AddWordField: **vertical** field + button

### Padding and gaps

- Horizontal: **16 px**
- Header to State Management: **16 px**
- Group row height: min **48 px** touch target
- Section gaps: **24 px**
- AddWordField internal: **12 px** gap

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Tablet | Optional side-by-side: State Management left, Add + Profile right |
| Desktop | Max width 720 px; export section may use horizontal button group |

---

## 5. `SETTINGS / Home / Default`

### Purpose

Secondary full-screen settings hub. Groups appearance, reading, language, privacy, and help destinations.

### Entry point

- Home top bar **Settings** icon (directly visible)
- Library or Vocabulary overflow menu → Settings

### Exit and Back behavior

- **Back** → previous App Shell screen
- Row tap → child settings screen
- **No bottom navigation**

### Fixed regions

- SecondaryTopBar: Back | `Settings`

### Scrollable regions

- Settings list

### Top-to-bottom section order

1. **SecondaryTopBar**
2. **Settings list** (continuous grouped surface)
   - Appearance →
   - Reading →
   - Language & Translation →
   - Data & Privacy → (navigates to future screen)
   - Help & About → (navigates to future screen)

### Primary action

None at hub level (navigation list).

### Secondary actions

- Back
- Any row navigation

### Empty / loading / error states

Not applicable for Default hub.

### Future placeholders

- Data & Privacy detail screen
- Help & About detail screen

### Component references

`SecondaryTopBar`, `SettingsRow`, `SectionHeading` (optional grouping)

### Auto Layout

- Root: **vertical**
- List: **vertical**, full-width rows

### Padding and gaps

- Horizontal: **16 px**
- Row min height: **48 px**
- Row internal padding: **16 px** horizontal
- Divider inset: **16 px** left (after icon slot if icons used)

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Tablet / Desktop | Centered list max width **480 px**; optional settings rail pattern in later R3 slice |

---

## 6. `SETTINGS / Appearance / Default`

### Purpose

Configure app chrome theme separately from Reader reading theme. Preview how Home, Library, and Vocabulary look under selected app appearance.

### Entry point

- Settings Home → Appearance

### Exit and Back behavior

- Back → Settings Home

### Fixed regions

- SecondaryTopBar: Back | `Appearance`

### Scrollable regions

- All sections below top bar

### Top-to-bottom section order

1. **SecondaryTopBar**
2. **App appearance** — SectionHeading
   - System / Light / Dark segmented control
3. **Theme presets**
   - Mineral Mist (default selected)
   - Deep Mineral
   - Curated future presets (disabled or labeled `Placeholder — future`)
4. **Interface preview** — mini previews or tabs showing **Home / Library / Vocabulary** chrome samples (not Reader)
5. **Reduce Motion** — toggle row

**Separation rule:** App appearance does not change Reader text theme (Reader themes live under Settings → Reading).

### Primary action

Select app theme preset or System/Light/Dark mode.

### Secondary actions

- Back
- Reduce Motion toggle
- Preview tab switch (if used)

### Empty / loading / error states

Not required for Default.

### Future placeholders

- Additional curated presets beyond Mineral Mist and Deep Mineral

### Component references

`SecondaryTopBar`, `SectionHeading`, `SettingsRow`, `SurfaceCard` (preview), `InformationalCard`

### Auto Layout

- Root: **vertical**
- Segmented control: **horizontal**
- Preset list: **vertical**
- Preview: **horizontal** swatches or **vertical** stacked mini-frames

### Padding and gaps

- Section gaps: **24 px**
- Preview card padding: **16 px**
- Segmented control margin: **16 px** horizontal

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Tablet+ | Preview may show three mini-screens side by side |

---

## 7. `SETTINGS / Reading / Default`

### Purpose

Reader typography, spacing, themes, progress display, and chrome behavior. Reader remains scroll-based.

### Entry point

- Settings Home → Reading

### Exit and Back behavior

- Back → Settings Home

### Fixed regions

- SecondaryTopBar: Back | `Reading`

### Scrollable regions

- All sections

### Top-to-bottom section order

1. **SecondaryTopBar**
2. **Reading preview** — bounded text sample in current reader settings
3. **Font family** — selector row
4. **Text size** — slider or stepper
5. **Line spacing** — slider or stepper
6. **Paragraph spacing** — slider or stepper
7. **Reader themes** — White / Mist / Night (distinct from app appearance)
8. **Reading percentage** — toggle or display preference
9. **Reader chrome behavior** — e.g., tap to show/hide chrome, auto-hide notes

### Primary action

Adjust reader settings (live preview updates).

### Secondary actions

- Back
- Reset to defaults (optional secondary button)

### Empty / loading / error states

Not required for Default.

### Future placeholders

- Pagination mode (not scroll — do not show)

### Component references

`SecondaryTopBar`, `SectionHeading`, `SettingsRow`, `SurfaceCard` (preview), `ProgressBar` (in preview sample)

### Auto Layout

- Root: **vertical**
- Preview: fixed height **~200 px**, **vertical** fill
- Control rows: **vertical** list

### Padding and gaps

- Preview margin bottom: **24 px**
- Control row gap: **0** (dividers) or **8 px**
- Slider track horizontal inset: **16 px**

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Tablet+ | Preview wider but text measure capped (~65 characters) |

---

## 8. `SETTINGS / Language & Translation / Default`

### Purpose

Interface language, default translation target, and provider entry. Clarifies that provider connection does not auto-translate books.

### Entry point

- Settings Home → Language & Translation

### Exit and Back behavior

- Back → Settings Home
- Translation Providers row → future Provider Detail

### Fixed regions

- SecondaryTopBar: Back | `Language & Translation`

### Scrollable regions

- All sections

### Top-to-bottom section order

1. **SecondaryTopBar**
2. **Interface Language** — selector (English / 简体中文 / etc.)
3. **Default Translation Target** — language selector
4. **Translation Providers** — SettingsRow with chevron; show **no-provider-connected** subtitle state in Default
5. **InformationalCard** — plain copy: connecting a provider does **not** automatically translate books; translation starts explicitly from **Book Detail**
6. Optional footnote: providers remain placeholder if not implemented

### Primary action

Change Interface Language or Default Translation Target.

### Secondary actions

- Back
- Translation Providers row (future detail)

### Empty / loading / error states

| State frame | Behavior |
| --- | --- |
| `SETTINGS / Language & Translation / No Provider` | Default: providers row shows disconnected state |

### Future placeholders

- Provider Detail screen
- Connected provider list

### Component references

`SecondaryTopBar`, `SettingsRow`, `InformationalCard`, `StatusBadge` (disconnected)

### Auto Layout

- Root: **vertical**
- InformationalCard: **vertical** hug below providers row

### Padding and gaps

- InformationalCard margin top: **16 px**
- Card internal padding: **16 px**
- Section gaps: **24 px**

### Responsive notes

| Breakpoint | Behavior |
| --- | --- |
| Desktop | Max width 560 px centered |

---

## Build checklist (Figma operator)

- [ ] Eight Default frames created with exact names
- [ ] State variants documented above created where marked
- [ ] Components built on Page `01 — Components` before screen assembly
- [ ] No device bezel mockups inside production frames
- [ ] No decorative landscape / ink wash imagery
- [ ] Future screens live only on Page `99 — Future` with `Placeholder — future` status
- [ ] Prototype links follow flow map for Batch 1 only
- [ ] Color tokens use semantic names from Visual Foundations; hex values marked exploratory

---

*End of R3 Figma Build Manifest — Batch 1*
