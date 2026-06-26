# R3 Reader Interaction Specification — Batch 2

**Task:** R3-DESIGN-06  
**Status:** Documentation handoff  
**Related:** `R3_READER_BUILD_MANIFEST.md`, `R3_READER_COMPONENT_INVENTORY.md`

Defines interaction behavior for the seven approved Reader frames. Behavior and hierarchy are approved; motion timing, easing, and visual transition details are deferred unless marked structural.

---

## Scope and principles

1. Reader is **outside** the App Shell — no Home / Library / Vocabulary bottom navigation.
2. Reading is **continuous vertical scroll** only — no pagination in Batch 2.
3. **Chrome is hidden by default.**
4. Chrome **overlays** content and must **not** change reading scroll position when shown or hidden.
5. Placeholder modes (Chinese, Mixed for imported books) remain **honest** — Unavailable/Processing, not fake content.
6. Vocabulary **Save** means **Learning**; Known / Learning / Hidden are **mutually exclusive**.

---

## Chrome show / hide behavior

### Default state

- Enter Reader → `READER / Chrome Hidden / Default`
- `ReaderTopChrome` and `ReaderBottomChrome` not visible

### Toggle

| User action | Result |
| --- | --- |
| Tap **ordinary reading area** (non-interactive text, margins) | Toggle chrome visible ↔ hidden |
| Tap **interactive vocabulary term** | See Word-tap priority — does **not** toggle chrome |
| Tap **chrome control** | Execute control; do not hide chrome unless tool opens overlay that specifies dismiss |
| Tap **ChapterEndNavigation** button | Navigate chapters — chrome state unchanged unless prototype notes otherwise |

### Scroll position

- Showing or hiding chrome **must not** reflow or jump `ReaderCanvas` scroll offset
- Chrome renders as fixed/absolute overlay layers
- No additional padding inserted into text column on chrome reveal

### Animation (deferred values)

- Short cross-fade or vertical slide for chrome — respect Reduce Motion (instant toggle)
- Duration target ~200–250 ms when motion enabled

---

## Word-tap priority

When user taps a location on `ReaderCanvas`, resolve in this order:

1. **Interactive vocabulary term** → Reader Chrome **hides/recedes** → open `VocabularyPopover` anchored to term; Popover is the **only active Reader overlay**; scroll position unchanged; App Shell navigation remains absent
2. **Chrome visible** + tap on chrome control → control action
3. **Ordinary reading area** → toggle chrome show/hide
4. **ChapterEndNavigation** button → chapter navigation action

Word-tap takes priority over ordinary reading-area tap. No other Reader Sheet or Panel remains active behind the Popover.

### Term hit target

- Terms use expanded hit area where possible without breaking reading flow

---

## Popover open, switch, and close behavior

### Open

```text
Tap vocabulary term
→ Reader Chrome hides/recedes
→ Vocabulary Popover opens
→ Popover is the only active Reader overlay
```

- Anchor **below-left** of term bounding box
- If insufficient space below-left, evaluate fallbacks in order: above-left, below-right, above-right (adjust per viewport)
- Popover may overlap adjacent text — acceptable
- **No** connector line from term to popover
- Popover remains **attached** to anchor — not detached center modal
- Reader content and scroll position do **not** move on open
- Close any active Contents, Progress, Mode, or Preview overlay before opening Popover (if applicable)

### Switch

- Tap **different term** while popover open → re-anchor Popover at new term; Chrome remains hidden; Popover remains sole active overlay
- Scroll canvas → close popover → `READER / Chrome Hidden / Default`

### Close

```text
Close Vocabulary Popover
→ return to READER / Chrome Hidden / Default
```

Never restore prior Chrome Visible state. Applies when closing through:

| Action | Result |
| --- | --- |
| Tap same word | Close → `READER / Chrome Hidden / Default` |
| Tap outside popover | Close → `READER / Chrome Hidden / Default` |
| Browser or hardware Back | Close → `READER / Chrome Hidden / Default` |
| Tap different term then later close | Close → `READER / Chrome Hidden / Default` |
| State action tap | Apply state; popover may remain open (default: remain for quick multi-action) |
| Open Contents / Preview / Progress / Mode | Close popover first → then open overlay from Chrome Visible entry as applicable |

### Content limits

- No context excerpt, long example, statistics, or Word Detail navigation from popover

---

## Preview expansion behavior

### Entry

- From chrome **Preview** tool → full-screen `READER / Vocabulary Preview / Default`
- Reader Chrome hides when Preview opens (full-screen sub-surface)

### Filters

- `PreviewFilterBar`: single-select All / IELTS / Phrases / Slangs
- Filter change updates list; expanded row collapses on filter change (recommended)

### Row collapse / expand

| Action | Result |
| --- | --- |
| Tap collapsed row (outside state icons) | Expand row; **collapse any other** expanded row |
| Tap expand chevron | Same as row tap |
| Tap expanded row collapse chevron | Collapse to default collapsed anatomy |
| Only one expanded row | Enforced |

### Collapsed vs expanded content

- **Collapsed:** index, term, Known/Save/Hide, expand indicator only
- **Expanded:** two-column detail + full-width `ContextExcerpt` + **Go to this passage**

### State actions in Preview

- Known / Save / Hide always visible in collapsed and expanded states
- Mutually exclusive selection
- **Save** → Learning
- State change does **not** auto-expand row
- Row **stays in list** during current Preview session (no immediate removal animation)

### Go to this passage

```text
Go to this passage
→ return to Reader at the selected occurrence
→ briefly highlight the target term
→ Reader Chrome Hidden
```

- Closes Preview
- Scrolls `ReaderCanvas` to the selected passage occurrence
- Briefly highlights the target term
- Returns to `READER / Chrome Hidden / Default` (not the pre-Preview reading position)

### Exit Preview

```text
Exit Vocabulary Preview
→ restore the original chapter and reading position
→ return to READER / Chrome Hidden / Default
```

Applies to:

- Top **Back**
- Browser or hardware **Back**
- Successful dismiss without navigation

Never restore prior Chrome Visible state.

---

## Contents navigation

### Open

- Chrome **Contents** → `ContentsSideSheet` slides from **left**
- Width ~**80vw** mobile
- Full viewport height
- `OverlayScrim` behind sheet
- Reader canvas does not reflow — remains visible under scrim/sheet edge

### Scroll

- `ContentsHeader` fixed
- Chapter list scrolls independently
- Initial scroll position **near current chapter**

### Hierarchy

- Support Part (`ContentsGroupRow`) → Chapter (`ContentsChapterRow`) nesting when EPUB structure provides parts

### Select chapter

- Tap chapter row → navigate to **beginning** of chapter
- **Close sheet**
- Update Reader canvas to new chapter at scroll offset 0 (chapter start)

### Dismiss without navigation

- Scrim tap · swipe dismiss (if prototyped) · header close
- Reading position **unchanged**

### Exclusions

- No reading percentages in list
- No mode availability indicators
- No provider state
- No chapter search (Batch 2)

### Prohibited

- **Back to Contents** at chapter end

---

## Progress dragging and release behavior

### Open

- Chrome **Progress** → compact `ProgressDrawer` from bottom
- Scrim over remaining viewport

### Layout interaction

- **No** `Reading Progress` title
- Chapter title centered, truncated
- `ChapterProgressSlider` spans center with Previous/Next at **ends of slider row**
- Bottom-left: `Chapter X / Y`
- Bottom-right: `Book XX%`
- **No** separate chapter percentage label duplicating slider position

### Drag

- Drag thumb → **preview** position within **current chapter** only
- Canvas may optionally live-preview scroll (implementation — prototype may show thumb movement only)
- `READER / Progress Drawer / Dragging` state

### Release

- Release thumb → **apply** jump to position within current chapter
- Close drawer (default)
- Scroll position updates to matched offset

### Previous / Next on slider row

- Previous/Next at slider ends adjust chapter boundary navigation **or** step within chapter — Batch 2 intent: **jump to adjacent chapter start/end** when at extremes; slider remains chapter-internal. Document for Figma: end buttons are chapter navigation affordances tied to progress UI, **not** chrome permanent buttons.

Clarification for builders: the slider row Previous/Next navigate chapter-to-chapter at drawer level; the draggable thumb maps intra-chapter position only.

### Dismiss without apply

- Scrim tap while **not** dragging → close drawer; position unchanged
- Scrim tap during drag → cancel drag; revert thumb; close or stay open per product — default: **revert and close**

---

## Mode switching

### Open

- Chrome **Mode** → centered `ModePanel` (floating, **not** bottom sheet)
- Scrim behind panel

### Rows

- English · Chinese · Mixed — vertical `ModeRow` list
- Each shows `AvailabilityStatus` independent of selection check marker

### Availability semantics (honest)

| Mode | Typical imported-book Batch 2 state |
| --- | --- |
| English | Ready (English Study implemented) |
| Chinese | Unavailable (placeholder — no real Translation Version) |
| Mixed | Unavailable or Processing (placeholder) |

Only **selectable** rows accept tap.

### Select usable mode

- Apply mode change
- Close panel
- Preserve **current chapter**
- Preserve **closest reliable reading position** (scroll offset mapped proportionally within chapter where possible)

### Select disabled row

- No-op; optional brief feedback (haptic/toast — future)

### Manage book versions

- Footer link when useful → navigate to `APP / Book Detail / Default` (exits Reader)
- Never show provider API keys or provider configuration in Reader

### Dismiss

- Scrim tap → close without change

---

## Reader Back-stack

```text
App Shell (Home | Library | Book Detail)
  └─ READER / Chrome Hidden / Default
       ├─ toggle ↔ READER / Chrome Visible / Default
       ├─ term tap → Chrome hides → Vocabulary Popover (sole active overlay; close → Chrome Hidden)
       ├─ Preview → Vocabulary Preview (full-screen sub-stack)
       ├─ Contents → Contents Side Sheet (modal overlay)
       ├─ Progress → Progress Drawer (modal overlay)
       └─ Mode → Mode Panel (modal overlay)
```

### Back button (top chrome)

| Current context | Back action |
| --- | --- |
| Popover open | Close popover → `READER / Chrome Hidden / Default` |
| Preview open | Close Preview → `READER / Chrome Hidden / Default` (original chapter/position, or selected occurrence after Go to passage) |
| Contents open | Close sheet (no navigation) |
| Progress open | Close drawer |
| Mode open | Close panel |
| Reader chrome visible, no overlay | Exit Reader → prior App Shell screen |
| Reader chrome hidden | Back not shown — user reveals chrome first or uses system back |

### System back (browser)

- Mirror in-app Back stack where platform requires

### One overlay rule

- Opening a new overlay (Contents, Progress, Mode) should close any other open overlay of the same class
- Preview is full-screen — closes other overlays when opened

---

## Focus management

| Context | Focus behavior |
| --- | --- |
| Reader canvas | Default focus on canvas/container for screen readers; reading order follows text |
| Chrome reveal | Focus does not steal from reading position visually; optional focus to first chrome control on explicit keyboard shortcut only |
| Popover open | Focus moves to popover; limited tab cycle within popover actions |
| Contents sheet | Focus trap in sheet until dismiss; return focus to Contents tool |
| Progress drawer | Focus to slider thumb; Esc closes |
| Mode panel | Focus to selected row or first usable row; Esc closes |
| Preview | Focus to Back; list navigation standard |

---

## Reduced-motion behavior

When user prefers reduced motion (Settings → Appearance → Reduce Motion):

| Animation | Substitute |
| --- | --- |
| Chrome show/hide | Instant opacity toggle |
| Contents sheet slide | Instant appear or short cross-fade ≤100 ms |
| Progress drawer | Instant appear |
| Mode panel | Instant appear |
| Popover | Instant appear at anchor |
| Preview transition | Cross-fade or instant |
| Slider drag | No inertial animation; position updates immediately on release |

No decorative looping motion in Reader Batch 2.

---

## Tablet and desktop container adaptations

### Tablet (768–1023 px)

| Element | Adaptation |
| --- | --- |
| ReaderCanvas | Wider side margins; text measure capped |
| Contents sheet | Fixed width ~360 px instead of 80vw |
| Progress drawer | Full width; same compact height |
| Mode panel | Centered; max-width ~380 px |
| Vocabulary Preview | Optional side-by-side expanded detail at designer discretion — one expanded row rule preserved |
| Chrome | Same top/bottom overlay pattern |

### Desktop (1024+ px)

| Element | Adaptation |
| --- | --- |
| Reader workspace | Bounded column centered in viewport |
| Overlays | Centered relative to reading column or full viewport per manifest |
| Popover | Same anchor logic relative to term in column |
| Preview | May use two-pane layout (list + detail) if single-expansion rule preserved |
| No | App Shell bottom nav in Reader |

### Input modalities

- Mouse: hover states on chrome tools (deferred styling)
- Keyboard: Esc dismisses topmost overlay; arrow keys in slider when focused
- Touch: primary target platform

---

## Interaction matrix (quick reference)

| Gesture / action | Chrome hidden | Chrome visible | Preview | Popover | Contents | Progress | Mode |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tap reading area | Show chrome | Hide chrome | — | — | — | — | — |
| Tap term | Chrome hides → Popover | Chrome hides → Popover | — | Switch anchor | — | — | — |
| Back | — | Exit Reader* | Chrome Hidden (original position) | Chrome Hidden | Close sheet | Close drawer | Close panel |
| Chrome tool | — | Open overlay | — | — | — | — | — |

\*After closing any open overlay.

---

## Honesty constraints (not implemented)

Do not prototype as fully working:

- Real Chinese or Mixed rendering for imported books
- Live translation provider connection inside Reader
- Translation job pause, ETA, or cancel
- Chapter search in Contents
- Pagination or page-flip reading
- Vocabulary row removal on state change during Preview session
- Flashcard, review, streak, or study-time flows

---

## Prototype test scenarios (recommended)

1. Enter Reader → chrome hidden → scroll → tap to show chrome → Contents → pick chapter → verify chapter start
2. Tap term → Chrome hides → popover below-left → close → Chrome Hidden → Save (Learning) → tap another term → switch anchor → close → Chrome Hidden
3. Preview → expand one row → Go to passage → Chrome Hidden at selected occurrence with term highlight
4. Progress → drag slider → release → position jump → drawer closes
5. Mode → attempt Chinese (Unavailable) → select English → panel closes
6. Last chapter → Finish Book; first chapter → Previous disabled
7. Reduce motion on → verify instant overlays

---

*End of R3 Reader Interaction Specification — Batch 2*
