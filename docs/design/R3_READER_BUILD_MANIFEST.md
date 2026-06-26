# R3 Reader Build Manifest — Batch 2

**Task:** R3-DESIGN-06  
**Status:** Documentation handoff (Reader system build pack v1)  
**Related:** Batch 1 pack (`R3_FIGMA_BUILD_MANIFEST.md`, `R3_COMPONENT_INVENTORY.md`, `R3_VISUAL_FOUNDATIONS.md`)  
**Design viewport (mobile reference):** 393 × 852 logical px  
**Spacing rhythm:** 8-point base (4 px half-steps allowed for optical tuning)

This manifest defines the seven approved Batch 2 Reader frames for Figma construction. Layout and interaction hierarchy are approved. Final colors, typography families, shadows, gradients, liquid-glass parameters, icon family, radius values, and decorative imagery are **deferred** — see Visual-status rule below.

Reader is outside the App Shell. No Home / Library / Vocabulary bottom navigation appears in any Reader frame.

---

## Visual-status rule (Batch 2)

| Approved now | Deferred (not frozen) |
| --- | --- |
| Frame structure, region order, interaction hierarchy | Final colors and component colors |
| Chrome tool placement and chapter-end navigation | Typography family |
| Preview collapsed/expanded anatomy | Exact shadows and gradients |
| Popover anchoring and compact content scope | Liquid-glass material parameters (opacity, blur, etc.) |
| Contents sheet width and scroll behavior | Icon family |
| Progress drawer layout and slider role | Exact radius values |
| Mode panel availability semantics | Decorative imagery |

Mockups are structural references, not final visual sources of truth.

---

## Figma page proposal

Add to the existing R3 Figma file (do not replace Batch 1 pages):

| Page name | Contents |
| --- | --- |
| `05 — Reader Components` | Batch 2 Reader component set and variants |
| `06 — Reader Frames` | Seven approved frames + state variants |
| `07 — Reader Prototypes` | Chrome, Preview, overlay, and Back-stack flows |
| `99 — Future` | Batch 1 future inventory unchanged; Reader additions only if needed |

Batch 1 pages (`00`–`04`) remain untouched.

---

## Frame naming rules

### Pattern

```text
READER / {Surface} / {State}
```

- **Surface:** `Chrome Hidden`, `Chrome Visible`, `Vocabulary Preview`, `Vocabulary Popover`, `Contents Side Sheet`, `Progress Drawer`, `Mode Panel`
- **State:** `Default`, `Loading`, `Empty`, `Error`, or documented variant (e.g., `First Chapter`, `Last Chapter`)

### Examples

- `READER / Chrome Hidden / Default`
- `READER / Vocabulary Preview / Expanded`
- `READER / Progress Drawer / Default`

### Status labels

| Label | Use |
| --- | --- |
| `Approved — Batch 2` | Build exactly as specified |
| `Placeholder — future` | Structure only; capability not implemented |
| `Exploratory — visual` | Layout approved; visual tokens deferred |

---

## State-frame inventory

| Base frame | Additional state frames (recommended) |
| --- | --- |
| `READER / Chrome Hidden / Default` | `Loading`, `Error` |
| `READER / Chrome Visible / Default` | — |
| `READER / Vocabulary Preview / Default` | `Empty`, `Expanded` (one row), `Loading` |
| `READER / Vocabulary Popover / Default` | `Fallback position` (space insufficient) |
| `READER / Contents Side Sheet / Default` | `Loading`, `Empty` |
| `READER / Progress Drawer / Default` | `Dragging` |
| `READER / Mode Panel / Default` | `Chinese Unavailable`, `Mixed Processing` |

---

## Reader Back-stack map

```text
[Entry from App Shell]
  Home Start Reading / Resume Reading
  Book Detail Resume Reading
  Library open book
    ↓
READER / Chrome Hidden / Default  ← base Reader context

Back (top chrome) → previous App Shell screen (Home, Library, or Book Detail)

Within Reader (overlays — dismiss returns to `READER / Chrome Hidden / Default` unless navigation changes position):
  Tap reading area → toggle Chrome Visible ↔ Chrome Hidden
  Tap vocabulary term → Reader Chrome hides/recedes → Vocabulary Popover opens (Popover is the only active Reader overlay)
  Chrome → Contents → Contents Side Sheet (open)
  Chrome → Preview → Vocabulary Preview (full-screen sub-surface)
  Chrome → Progress → Progress Drawer (compact bottom drawer)
  Chrome → Mode → Mode Panel (centered floating panel)

Vocabulary Preview:
  Back / dismiss → restore original chapter and reading position → `READER / Chrome Hidden / Default`
  Expand row → single expanded item
  Go to this passage → return to Reader at selected occurrence; briefly highlight target term → `READER / Chrome Hidden / Default`

Contents Side Sheet:
  Chapter tap → navigate to chapter start; close sheet
  Scrim tap / swipe dismiss → close sheet; reading position unchanged except after chapter selection

Progress Drawer:
  Release slider → jump within current chapter; close drawer optional per interaction spec
  Scrim tap → close without apply if drag not released (see Interaction Spec)

Mode Panel:
  Select usable mode → apply; close panel; preserve chapter and closest reliable position
  Scrim tap → close without change

Popover:
  Close (same word, outside tap, Back, or after switching terms) → `READER / Chrome Hidden / Default` (never restore prior Chrome Visible)
  Tap different term while open → switch anchor; Chrome remains hidden; Popover remains sole active overlay
```

**Stack discipline:** Only one major overlay (Contents, Progress, Mode, Preview, or Popover) should be fully open at a time. When Popover opens, Reader Chrome hides and Popover is the only active Reader overlay — no Sheet or Panel remains active behind it.

---

## Prototype links (Batch 2 minimum)

| From | Interaction | To |
| --- | --- | --- |
| Batch 1 Home / Book Detail | Resume or Start Reading | `READER / Chrome Hidden / Default` |
| Chrome Hidden | Tap reading area | `READER / Chrome Visible / Default` |
| Chrome Visible | Tap reading area | `READER / Chrome Hidden / Default` |
| Chrome Hidden | Tap vocabulary term | Chrome hides → `READER / Vocabulary Popover / Default` |
| Chrome Visible | Tap vocabulary term | Chrome hides → `READER / Vocabulary Popover / Default` |
| Chrome Visible | Contents | `READER / Contents Side Sheet / Default` |
| Chrome Visible | Preview | `READER / Vocabulary Preview / Default` |
| Chrome Visible | Progress | `READER / Progress Drawer / Default` |
| Chrome Visible | Mode | `READER / Mode Panel / Default` |
| Chrome top | Back | Batch 1 entry screen |
| Preview | Expand row | `READER / Vocabulary Preview / Expanded` |
| Preview | Go to this passage | `READER / Chrome Hidden / Default` at selected occurrence (highlight term) |
| Preview | Back / dismiss | `READER / Chrome Hidden / Default` (original chapter and position) |
| Contents | Chapter row | `READER / Chrome Hidden / Default` (chapter start) |

---

# Batch 2 frame specifications

---

## 1. `READER / Chrome Hidden / Default`

### Purpose

Immersive reading surface with chrome dismissed. Default Reader state. Maximizes reading area and vertical scroll continuity.

### Entry point

- Start Reading / Resume Reading from Home `ContinueReadingCard`
- Resume Reading from Book Detail
- Return from closed overlay (Contents, Progress, Mode, Preview, Popover)
- Chapter navigation at chapter end

### Exit and Back behavior

- **Back** not visible while chrome hidden (no gesture substitute in Batch 2 frames except system back if prototyped separately)
- Tap reading area → `READER / Chrome Visible / Default`
- Tap vocabulary term → Reader Chrome hides/recedes → Vocabulary Popover opens (scroll position unchanged; Popover only active overlay)
- Close Popover → `READER / Chrome Hidden / Default`
- System/App Shell exit only via revealing chrome then Back

### Fixed regions

| Region | Notes |
| --- | --- |
| Safe area | Full-bleed Reader; respect top/bottom insets for text measure |
| ReaderCanvas | Full viewport; continuous vertical scroll |

### Scrollable regions

- Entire chapter body on `ReaderCanvas` (continuous vertical scroll only — no pagination)

### Layer order (bottom to top)

1. `ReaderCanvas` — chapter text, interactive vocabulary terms
2. Optional `ChapterEndNavigation` at chapter boundary (in-scroll, not chrome)
3. (No top/bottom chrome)
4. `VocabularyPopover` when active (separate frame or overlay instance)
5. `OverlayScrim` + overlay frames when open (Contents, Progress, Mode, Preview)

### Primary interaction

Vertical scroll through chapter content.

### Secondary interactions

- Tap ordinary reading area → show chrome
- Tap vocabulary term → open Popover
- Reach chapter end → `ChapterEndNavigation`

### Loading / empty / error states

| State frame | Behavior |
| --- | --- |
| `READER / Chrome Hidden / Loading` | Skeleton text column or spinner centered over canvas |
| `READER / Chrome Hidden / Error` | Inline error banner on canvas; retry if applicable |

### Responsive adaptation

| Breakpoint | Behavior |
| --- | --- |
| Mobile | Full width; bounded reading measure (~32–40 em) centered |
| Tablet | Wider canvas max-width; side margins increase |
| Desktop | Bounded reading column centered; optional max width ~720 px for body text |

### Referenced components

`ReaderCanvas`, `ChapterEndNavigation`, `VocabularyPopover`, `OverlayScrim`

### Auto Layout

- Root: **vertical** fill
- Text column: **vertical** hug, centered horizontally
- Chapter end block: **vertical** centered within scroll flow

### Safe-area treatment

- Text inset from top/bottom safe areas when chrome hidden
- No bottom nav safe-area padding (App Shell absent)

### Prototype links

See Prototype links table. Tap canvas → Chrome Visible.

---

## 2. `READER / Chrome Visible / Default`

### Purpose

Reader with top and bottom chrome overlays visible. Provides navigation affordances without reflowing reading position.

### Entry point

- Tap ordinary reading area from Chrome Hidden

### Exit and Back behavior

- Tap ordinary reading area → Chrome Hidden (toggle)
- **Back** (top chrome) → exit Reader to prior App Shell screen
- Tool taps open respective overlays (Contents, Preview, Progress, Mode)
- Tap vocabulary term → Reader Chrome hides/recedes → Vocabulary Popover opens (Popover is the only active Reader overlay; scroll position unchanged)

### Fixed regions

| Region | Position | Notes |
| --- | --- | --- |
| `ReaderTopChrome` | Top overlay | Back · book title + chapter · Contents |
| `ReaderBottomChrome` | Bottom overlay | Preview · Progress · Mode |
| Safe areas | Top/bottom | Chrome respects insets |

### Scrollable regions

- `ReaderCanvas` scrolls **under** chrome overlays; chrome does not reflow content

### Layer order (bottom to top)

1. `ReaderCanvas` (scroll position unchanged from toggle)
2. `ChapterEndNavigation` (in scroll, when at chapter end)
3. `ReaderTopChrome` (overlay)
4. `ReaderBottomChrome` (overlay)
5. Active overlay / Popover if opened from tools

### Top chrome content (left → right)

- **Back**
- **Book title** + **current chapter** (truncated stack or single line per width)
- **Contents** (`ReaderToolItem`)

### Bottom chrome content (left → right)

- **Preview**
- **Progress**
- **Mode**

**Prohibited:** permanent Previous / Next chapter buttons in chrome.

### Primary interaction

Tool selection (Contents, Preview, Progress, Mode).

### Secondary interactions

- Back → App Shell
- Tap reading area → hide chrome
- Chapter end navigation (in canvas, not chrome)

### Loading / empty / error states

Chrome may appear over Loading/Error canvas states from base frame.

### Responsive adaptation

| Breakpoint | Behavior |
| --- | --- |
| Tablet | Chrome bar may widen; tools remain three bottom items |
| Desktop | Chrome overlays same pattern; optional wider hit targets |

### Referenced components

`ReaderCanvas`, `ReaderTopChrome`, `ReaderBottomChrome`, `ReaderToolItem`, `ChapterEndNavigation`, `OverlayScrim`

### Auto Layout

- Top chrome: **horizontal**, space-between, fixed height ~56 px + safe area
- Bottom chrome: **horizontal**, three equal `ReaderToolItem` cells
- Chrome backgrounds: overlay fill (visual treatment deferred)

### Safe-area treatment

- Top chrome below status bar inset
- Bottom chrome above home indicator inset
- Canvas text scrolls beneath; padding does not jump on toggle

### Prototype links

Each bottom/top tool → corresponding overlay frame. Back → Batch 1 entry.

---

## 3. `READER / Vocabulary Preview / Default`

### Purpose

Full-screen Reader sub-surface for chapter vocabulary review. Refined reading-support workspace — not flashcards or a dictionary database.

### Entry point

- Reader bottom chrome **Preview**

### Exit and Back behavior

- **Back**, browser/hardware Back, or dismiss → restore **original chapter and reading position** → `READER / Chrome Hidden / Default` (never restore prior Chrome Visible)
- **Go to this passage** → return to Reader at **selected occurrence**; briefly highlight target term → `READER / Chrome Hidden / Default`
- Does not show App Shell bottom navigation

### Fixed regions

| Region | Notes |
| --- | --- |
| Top bar | Back + title (e.g., `Vocabulary Preview`) |
| `PreviewFilterBar` | All · IELTS · Phrases · Slangs |

### Scrollable regions

- Word list (`PreviewWordRow` stack)

### Top-to-bottom order

1. Top bar (Back, title)
2. `PreviewFilterBar` — filters: **All**, **IELTS**, **Phrases**, **Slangs** (not Nouns/Adjectives/Verbs)
3. Scrollable list of collapsed `PreviewWordRow` items
4. No permanent bottom legend

### Collapsed row anatomy

- Index
- Term
- Known / Save / Hide icon actions (`PreviewStateAction`)
- Expand indicator

**Collapsed rows do not show** part of speech or definitions.

### Expanded detail (separate state frame or variant)

When one row expands (only one at a time):

- **Left column:** index + term
- **Right column:**
  - Part of speech + Chinese meaning
  - EN
  - IELTS
  - USE
  - Context count
- **Expanded context** (full width below two-column detail):
  - Source passage excerpt (`ContextExcerpt`)
  - **Go to this passage** action

### State actions (all row states)

- Known / Save / Hide visible always
- Mutually exclusive
- **Save** = Learning
- State update does **not** auto-expand row
- Row **not** removed immediately during current Preview session

### Primary interaction

Filter selection; row expand/collapse; state icon tap.

### Secondary interactions

- Go to this passage → Reader at selected occurrence; Chrome Hidden; brief term highlight
- Back → `READER / Chrome Hidden / Default` (original chapter and position)

### Loading / empty / error states

| State frame | Behavior |
| --- | --- |
| `READER / Vocabulary Preview / Empty` | No candidates for filter — `EmptyState` |
| `READER / Vocabulary Preview / Loading` | Row skeletons |
| `READER / Vocabulary Preview / Expanded` | Single expanded row with context |

### Responsive adaptation

| Breakpoint | Behavior |
| --- | --- |
| Tablet | Two-column detail may widen; list max-width bounded |
| Desktop | Optional split: filter+list left, expanded detail right (only if interaction spec preserved) |

### Referenced components

`PreviewFilterBar`, `PreviewWordRow`, `PreviewStateAction`, `ContextExcerpt`, `SecondaryTopBar` (or Reader sub-top bar), `EmptyState`

### Auto Layout

- Filter bar: **horizontal** scroll or equal segments
- Collapsed row: **horizontal** — index · term flex · actions · chevron
- Expanded block: **vertical** — two-column **horizontal** row + full-width context

### Safe-area treatment

- Full-screen sub-surface; top/bottom safe areas on bars
- No App Shell bottom nav

### Prototype links

Preview tool → this frame. Go to passage → Chrome Hidden at selected occurrence. Back → Chrome Hidden at original position.

---

## 4. `READER / Vocabulary Popover / Default`

### Purpose

Lightweight in-context vocabulary assistance beside the tapped term. Does not open full Word Detail or Preview.

### Entry point

- Tap interactive vocabulary term on `ReaderCanvas` (from Chrome Hidden or Chrome Visible — word-tap takes priority over ordinary reading-area tap)

### Exit and Back behavior

- Close Popover (same word, outside tap, browser/hardware Back, or after switching terms) → `READER / Chrome Hidden / Default` — **never** restore prior Chrome Visible
- Opening Popover hides/recedes Reader Chrome; Popover is the only active Reader overlay

### Fixed regions

- Popover bubble anchored to term (not viewport-fixed center)
- Reader Chrome hidden while Popover is open

### Scrollable regions

- None within popover (compact content only)

### Content (compact)

- Term
- Icon-only Known / Save / Hide (`PreviewStateAction` compact)
- Part of speech + Chinese meaning
- Short English definition
- One compact collocation or usage line

**Excluded:** context excerpt, long example, learning statistics, full Word Detail.

### Positioning

- **Priority:** below-left of selected word
- **Fallback:** only when insufficient space (above-left, below-right, etc.)
- May cover nearby reading text
- **No** connector line or detached floating placement far from term

### Visual direction (deferred)

- Neutral semi-transparent liquid-glass surface
- Material opacity, blur, gradient, shadow, and final colors **not frozen**
- Color expressed mainly through status icons and subtle text treatment

### Primary interaction

State icon tap (Known / Save / Hide).

### Secondary interactions

- Tap same word → close Popover → `READER / Chrome Hidden / Default`
- Tap outside → close Popover → `READER / Chrome Hidden / Default`
- Tap different term → switch anchor; Chrome remains hidden
- Browser/hardware Back → close Popover → `READER / Chrome Hidden / Default`

### Loading / empty / error states

| State frame | Behavior |
| --- | --- |
| `READER / Vocabulary Popover / Fallback position` | Alternate anchor when below-left unavailable |
| Brief loading | Inline spinner or skeleton inside bubble (optional) |

### Responsive adaptation

- Reposition on rotation/resize; maintain anchor to term
- Desktop: same anchor logic relative to reading column

### Referenced components

`VocabularyPopover`, `PreviewStateAction`

### Auto Layout

- Popover: **vertical** hug contents, max-width ~280 px
- State actions: **horizontal** icon row

### Safe-area treatment

- Popover flips to stay on-screen; Reader Chrome hidden while Popover is open

### Prototype links

Term tap (from any chrome state) → Chrome hides → Popover overlay on `READER / Chrome Hidden / Default` frame instance with Popover as sole active overlay.

---

## 5. `READER / Contents Side Sheet / Default`

### Purpose

Chapter navigation hierarchy without leaving Reader. Overlays canvas; does not reflow reading content.

### Entry point

- Reader top chrome **Contents**

### Exit and Back behavior

- Chapter row tap → navigate to chapter **beginning**; **close sheet**
- Scrim tap or swipe dismiss → close without navigation
- No **Back to Contents** at chapter end

### Fixed regions

| Region | Notes |
| --- | --- |
| `ContentsHeader` | Fixed at top of sheet |
| Sheet panel | ~80vw width mobile, full viewport height |

### Scrollable regions

- Chapter list independent of Reader canvas scroll

### Top-to-bottom order

1. `ContentsHeader` (title, dismiss)
2. Scrollable list:
   - `ContentsGroupRow` (Part)
   - `ContentsChapterRow` (Chapter) nested under Part when hierarchy exists
3. Scroll position opens **near current chapter**

### Excluded from sheet

- Reading percentages
- Mode availability
- Provider state
- Chapter search (Batch 2)

### Primary interaction

Chapter row selection.

### Secondary interactions

- Part expand/collapse if hierarchical
- Dismiss via scrim

### Loading / empty / error states

| State frame | Behavior |
| --- | --- |
| `READER / Contents Side Sheet / Loading` | Skeleton rows |
| `READER / Contents Side Sheet / Empty` | No chapters — rare; honest empty copy |

### Responsive adaptation

| Breakpoint | Behavior |
| --- | --- |
| Mobile | ~80vw from left |
| Tablet | May use fixed width ~320–400 px |
| Desktop | Side panel same behavior; wider width cap |

### Referenced components

`ContentsSideSheet`, `ContentsHeader`, `ContentsGroupRow`, `ContentsChapterRow`, `OverlayScrim`

### Auto Layout

- Sheet: **vertical** fill height
- Header: fixed **horizontal**
- List: **vertical** scroll

### Safe-area treatment

- Sheet full height including safe areas
- Header below status bar inset

### Prototype links

Contents tool → sheet over Chrome Visible. Chapter tap → Chrome Hidden at chapter start.

---

## 6. `READER / Progress Drawer / Default`

### Purpose

Compact chapter-scoped progress control. Primary expression of position within **current chapter** via slider.

### Entry point

- Reader bottom chrome **Progress**

### Exit and Back behavior

- Scrim tap → close (if drag not committed — see Interaction Spec)
- Release after drag → apply jump; drawer closes

### Fixed regions

- Compact bottom drawer panel (not full screen)

### Scrollable regions

- None

### Layout order (top to bottom)

1. **No** visible `Reading Progress` title
2. **Current chapter title** — centered, single line, truncated
3. **Chapter progress row** — **horizontal**:
   - Previous control (left end)
   - `ChapterProgressSlider` (center, flex)
   - Next control (right end)
4. **Bottom metadata row** — **horizontal** space-between:
   - Bottom-left: `Chapter X / Y`
   - Bottom-right: `Book XX%`
5. Minimize unused bottom whitespace

### Slider behavior

- Maps **only** to current chapter interior position
- Drag previews position; release applies jump
- Gradient on slider track allowed; **final colors not frozen**
- **Do not** duplicate chapter percentage elsewhere in drawer

### Primary interaction

Drag slider; release to apply.

### Secondary interactions

- Previous / Next at slider ends (chapter boundary navigation — distinct from chrome prohibition)
- Scrim dismiss

### Loading / empty / error states

| State frame | Behavior |
| --- | --- |
| `READER / Progress Drawer / Dragging` | Thumb active; preview position |

### Responsive adaptation

- Drawer width 100% mobile; max-height compact (~200–240 px)
- Desktop: same bottom drawer centered over reading column width

### Referenced components

`ProgressDrawer`, `ChapterProgressSlider`, `OverlayScrim`

### Auto Layout

- Drawer: **vertical** hug
- Slider row: **horizontal**, center weighted
- Metadata: **horizontal** space-between

### Safe-area treatment

- Drawer above home indicator inset
- Scrim covers full viewport

### Prototype links

Progress tool → drawer over Chrome Visible.

---

## 7. `READER / Mode Panel / Default`

### Purpose

Reading mode selection (English / Chinese / Mixed) with honest availability states. Centered floating panel — not a bottom sheet.

### Entry point

- Reader bottom chrome **Mode**

### Exit and Back behavior

- Select **usable** mode → apply; close panel; preserve chapter and closest reliable reading position
- Scrim tap → close without change
- **Provider configuration never appears** in Reader

### Fixed regions

- Centered floating `ModePanel` over scrim

### Scrollable regions

- Panel body scrolls only if content exceeds max height (unlikely Batch 2)

### Content order

1. Panel title (e.g., `Reading Mode`)
2. Vertical `ModeRow` list:
   - **English**
   - **Chinese**
   - **Mixed**
3. Each row: mode name · `AvailabilityStatus` · check marker when selected
4. Optional footer link: **Manage book versions** — only when useful (navigates to Book Detail in prototype — App Shell)

### Availability states (separate from selection)

| State | Meaning (honest) |
| --- | --- |
| Original | Source English available |
| Ready | Mode available for use |
| Partially ready | Incomplete — not selectable |
| Processing | Generation in progress — not selectable |
| Unavailable | Not available (e.g., Chinese/Mixed for imported books — placeholder) |
| Failed | Error state — not selectable |

Only **usable** modes accept selection. English Study is **Ready** for imported books. Chinese and Mixed show **Unavailable** or placeholder until real Translation Versions exist.

### Primary interaction

Select usable mode row.

### Secondary interactions

- Manage book versions → Book Detail (Batch 1)
- Dismiss scrim

### Loading / empty / error states

| State frame | Behavior |
| --- | --- |
| `READER / Mode Panel / Chinese Unavailable` | Chinese row Unavailable |
| `READER / Mode Panel / Mixed Processing` | Mixed row Processing (placeholder demo) |

### Responsive adaptation

- Panel max-width ~340 px mobile; centered
- Desktop: same centered panel over reading workspace

### Referenced components

`ModePanel`, `ModeRow`, `AvailabilityStatus`, `OverlayScrim`

### Auto Layout

- Panel: **vertical** hug
- Mode rows: **vertical** list, min height **48 px** each

### Safe-area treatment

- Panel centered in viewport; scrim full screen

### Prototype links

Mode tool → panel. Select English → close → Chrome Hidden. Manage versions → `APP / Book Detail / Default`.

---

## Chapter end navigation (in-canvas)

Document on `ReaderCanvas` at chapter boundaries — not in chrome.

| Position | Controls |
| --- | --- |
| Middle chapter | **Previous Chapter** · **Next Chapter** |
| First chapter | Previous **disabled** · **Next Chapter** active |
| Last chapter | **Previous Chapter** active · **Finish Book** |

**Prohibited:** Back to Contents at chapter end.

### Component

`ChapterEndNavigation` — see Component Inventory.

---

## Build checklist (Figma operator)

- [ ] Seven approved frames with exact names
- [ ] No App Shell bottom navigation in any Reader frame
- [ ] Chrome toggle does not shift scroll position
- [ ] Popover anchored below-left; no connector line
- [ ] Preview: one expanded row max; collapsed rows without POS/definition
- [ ] Progress: no duplicate chapter %; slider is primary chapter progress
- [ ] Mode: availability ≠ selection; provider config absent
- [ ] Visual tokens marked deferred in frame annotations
- [ ] Chinese/Mixed marked placeholder where not implemented

---

*End of R3 Reader Build Manifest — Batch 2*
