# R3 Reader Component Inventory — Batch 2

**Task:** R3-DESIGN-06  
**Status:** Documentation handoff  
**Related:** `R3_READER_BUILD_MANIFEST.md`, `R3_READER_INTERACTION_SPEC.md`, Batch 1 `R3_COMPONENT_INVENTORY.md`

Defines reusable Figma components for the seven approved Reader frames. Visual treatment (colors, typography, glass parameters, shadows) is **deferred** unless noted as structural.

---

## Inventory summary

| Component | Batch 2 | Primary frames |
| --- | --- | --- |
| ReaderCanvas | Yes | Chrome Hidden, Chrome Visible |
| ReaderTopChrome | Yes | Chrome Visible |
| ReaderBottomChrome | Yes | Chrome Visible |
| ReaderToolItem | Yes | Chrome Visible |
| ChapterEndNavigation | Yes | Chrome Hidden, Chrome Visible |
| PreviewFilterBar | Yes | Vocabulary Preview |
| PreviewWordRow | Yes | Vocabulary Preview |
| PreviewStateAction | Yes | Vocabulary Preview, Vocabulary Popover |
| ContextExcerpt | Yes | Vocabulary Preview |
| VocabularyPopover | Yes | Vocabulary Popover |
| ContentsSideSheet | Yes | Contents Side Sheet |
| ContentsHeader | Yes | Contents Side Sheet |
| ContentsGroupRow | Yes | Contents Side Sheet |
| ContentsChapterRow | Yes | Contents Side Sheet |
| ProgressDrawer | Yes | Progress Drawer |
| ChapterProgressSlider | Yes | Progress Drawer |
| ModePanel | Yes | Mode Panel |
| ModeRow | Yes | Mode Panel |
| AvailabilityStatus | Yes | Mode Panel |
| OverlayScrim | Yes | Contents, Progress, Mode |

---

## ReaderCanvas

| Field | Detail |
| --- | --- |
| **Anatomy** | Full-bleed reading viewport · bounded text column · interactive vocabulary terms · optional `ChapterEndNavigation` block at chapter boundary |
| **Properties** | `chapterTitle`, `scrollPosition` (prototype), `chromeVisible` (boolean, for instance context), `hasInteractiveTerms` |
| **Variants** | `Default`, `Loading`, `Error` |
| **States** | Idle scroll · term highlighted (popover anchor) · chapter end visible |
| **Screens** | Chrome Hidden, Chrome Visible (+ underlays for overlays) |
| **A11y / touch** | Reading column scrollable; terms min **44 px** hit height where feasible; body text remains primary focus |
| **Batch 2** | Approved — structural layout frozen; typography family deferred |

---

## ReaderTopChrome

| Field | Detail |
| --- | --- |
| **Anatomy** | Safe area spacer · **Back** button · book title + current chapter (stacked or combined) · **Contents** `ReaderToolItem` |
| **Properties** | `bookTitle`, `chapterLabel`, `contentsActive` |
| **Variants** | `Default`, `Long title truncated` |
| **States** | Visible overlay · hidden (component not mounted) |
| **Screens** | Chrome Visible |
| **A11y / touch** | Back min **44 × 44 px**; title truncated with ellipsis + full string on long-press/accessibility label |
| **Batch 2** | Approved |

**Prohibited:** Previous/Next chapter controls in top chrome.

---

## ReaderBottomChrome

| Field | Detail |
| --- | --- |
| **Anatomy** | Safe area spacer · three equal `ReaderToolItem` slots: Preview · Progress · Mode |
| **Properties** | `activeTool` (none \| preview \| progress \| mode) |
| **Variants** | `Default` |
| **States** | Visible overlay · hidden |
| **Screens** | Chrome Visible |
| **A11y / touch** | Each tool **≥ 48 px** touch height; labels visible (not icon-only) |
| **Batch 2** | Approved |

---

## ReaderToolItem

| Field | Detail |
| --- | --- |
| **Anatomy** | Icon · label · optional active indicator |
| **Properties** | `tool` (contents \| preview \| progress \| mode), `active` (boolean) |
| **Variants** | `Top — Contents`, `Bottom — Preview`, `Bottom — Progress`, `Bottom — Mode` |
| **States** | Default · active/pressed |
| **Screens** | Chrome Visible |
| **A11y / touch** | `aria-current` when active overlay open; min **48 px** hit area |
| **Batch 2** | Approved; icon family deferred |

---

## ChapterEndNavigation

| Field | Detail |
| --- | --- |
| **Anatomy** | In-scroll footer block · primary/secondary buttons per chapter position |
| **Properties** | `chapterPosition` (first \| middle \| last) |
| **Variants** | `First` (Prev disabled, Next), `Middle` (Prev, Next), `Last` (Prev, Finish Book) |
| **States** | Default |
| **Screens** | Chrome Hidden, Chrome Visible (within canvas scroll) |
| **A11y / touch** | Disabled Previous clearly styled; buttons min **48 px** height |
| **Batch 2** | Approved |

**Prohibited:** Back to Contents.

---

## PreviewFilterBar

| Field | Detail |
| --- | --- |
| **Anatomy** | Horizontal segment or chip row |
| **Properties** | `activeFilter` (all \| ielts \| phrases \| slangs) |
| **Variants** | `Default` |
| **States** | Per-filter selected |
| **Screens** | Vocabulary Preview |
| **A11y / touch** | Single-select; min **44 px** chip height; not color-only selection |
| **Batch 2** | Approved |

**Filters:** All, IELTS, Phrases, Slangs only.

---

## PreviewWordRow

| Field | Detail |
| --- | --- |
| **Anatomy** | **Collapsed:** index · term · three `PreviewStateAction` · expand chevron · **Expanded:** two-column detail + `ContextExcerpt` + Go to passage |
| **Properties** | `index`, `term`, `state` (known \| learning \| hidden \| none), `expanded` (boolean), `contextCount` |
| **Variants** | `Collapsed`, `Expanded` |
| **States** | Collapsed · expanded (only one per list) · state icons reflect Known/Learning/Hidden |
| **Screens** | Vocabulary Preview |
| **A11y / touch** | Expand target ≥ **44 px**; state actions always visible; row not removed on state change during session |
| **Batch 2** | Approved |

**Collapsed excludes:** part of speech, definitions.

**Expanded right column fields:** POS + Chinese meaning · EN · IELTS · USE · Context count.

---

## PreviewStateAction

| Field | Detail |
| --- | --- |
| **Anatomy** | Icon button (Known check-circle · Learning bookmark · Hidden eye-off) |
| **Properties** | `action` (known \| save \| hide), `selected` (boolean), `size` (standard \| compact) |
| **Variants** | `Standard` (Preview row), `Compact` (Popover icon-only) |
| **States** | Unselected · selected (mutually exclusive set) |
| **Screens** | Vocabulary Preview, Vocabulary Popover |
| **A11y / touch** | `aria-pressed` for selected; **Save** label = Learning in accessibility copy; min **44 × 44 px** standard, **36 × 36 px** compact minimum |
| **Batch 2** | Approved; icon color carries state — palette deferred |

---

## ContextExcerpt

| Field | Detail |
| --- | --- |
| **Anatomy** | Full-width passage block · highlighted term · optional mist-tinted background (treatment deferred) |
| **Properties** | `passageText`, `highlightTerm` |
| **Variants** | `Default`, `Truncated` |
| **States** | Static display |
| **Screens** | Vocabulary Preview (expanded row only) |
| **A11y / touch** | Passage readable; highlight not color-only (bold or underline) |
| **Batch 2** | Approved |

---

## VocabularyPopover

| Field | Detail |
| --- | --- |
| **Anatomy** | Anchored bubble · term · compact `PreviewStateAction` row · POS + Chinese · short EN definition · one usage line |
| **Properties** | `anchor` (below-left \| fallback-*), `term`, `state` |
| **Variants** | `Below-left` (priority), `Fallback position` |
| **States** | Open · switching anchor |
| **Screens** | Vocabulary Popover (overlay on ReaderCanvas) |
| **A11y / touch** | Dismiss on outside tap; focus trap not required (non-modal); compact max-width ~280 px |
| **Batch 2** | Approved |

**Visual:** neutral semi-transparent liquid-glass — parameters **not frozen**.

**Excluded:** context excerpt, long example, statistics, Word Detail.

**Prohibited:** connector line; detached placement far from term.

---

## ContentsSideSheet

| Field | Detail |
| --- | --- |
| **Anatomy** | Left-edge panel · `ContentsHeader` · scrollable list · optional scrim |
| **Properties** | `width` (~80vw mobile), `open` (boolean) |
| **Variants** | `Mobile 80vw`, `Tablet fixed width` |
| **States** | Open · closing |
| **Screens** | Contents Side Sheet |
| **A11y / touch** | Focus moves to sheet on open; Esc/scrim dismiss; list scroll independent |
| **Batch 2** | Approved |

Does not reflow Reader content.

---

## ContentsHeader

| Field | Detail |
| --- | --- |
| **Anatomy** | Title (e.g., `Contents`) · dismiss/close control |
| **Properties** | `title` |
| **Variants** | `Default` |
| **States** | Fixed while list scrolls |
| **Screens** | Contents Side Sheet |
| **A11y / touch** | Close min **44 × 44 px** |
| **Batch 2** | Approved |

---

## ContentsGroupRow

| Field | Detail |
| --- | --- |
| **Anatomy** | Part title · optional expand chevron |
| **Properties** | `partTitle`, `expanded` |
| **Variants** | `Expanded`, `Collapsed` |
| **States** | Default |
| **Screens** | Contents Side Sheet |
| **A11y / touch** | Part row min **48 px** if tappable |
| **Batch 2** | Approved |

---

## ContentsChapterRow

| Field | Detail |
| --- | --- |
| **Anatomy** | Chapter title · optional current-chapter indicator |
| **Properties** | `chapterTitle`, `isCurrent`, `indentLevel` |
| **Variants** | `Default`, `Current chapter` |
| **States** | Default · pressed |
| **Screens** | Contents Side Sheet |
| **A11y / touch** | Full row tappable min **48 px**; no percentage or mode badges |
| **Batch 2** | Approved |

---

## ProgressDrawer

| Field | Detail |
| --- | --- |
| **Anatomy** | Bottom compact drawer · chapter title · slider row · metadata row |
| **Properties** | `chapterTitle`, `chapterIndex`, `chapterTotal`, `bookPercent` |
| **Variants** | `Default`, `Dragging` |
| **States** | Closed · open · dragging |
| **Screens** | Progress Drawer |
| **A11y / touch** | Slider `role="slider"` with value text; drawer compact height |
| **Batch 2** | Approved |

**No** visible `Reading Progress` title. **No** duplicate chapter percentage outside slider semantics.

---

## ChapterProgressSlider

| Field | Detail |
| --- | --- |
| **Anatomy** | Previous affordance · track + thumb · Next affordance (ends of row) |
| **Properties** | `value` (0–100 within chapter), `preview` (boolean while dragging) |
| **Variants** | `Idle`, `Dragging` |
| **States** | Maps to current chapter only |
| **Screens** | Progress Drawer |
| **A11y / touch** | Thumb min **44 px**; Previous/Next at ends — distinct from chrome chapter buttons |
| **Batch 2** | Approved; track gradient allowed — colors deferred |

---

## ModePanel

| Field | Detail |
| --- | --- |
| **Anatomy** | Centered floating card · title · `ModeRow` list · optional `Manage book versions` link |
| **Properties** | `selectedMode` (english \| chinese \| mixed) |
| **Variants** | `Default`, `With manage link` |
| **States** | Open over scrim |
| **Screens** | Mode Panel |
| **A11y / touch** | Focus trap optional; usable rows only selectable |
| **Batch 2** | Approved |

**Not** a bottom sheet. **No** provider configuration inside panel.

---

## ModeRow

| Field | Detail |
| --- | --- |
| **Anatomy** | Mode name · `AvailabilityStatus` · check marker when selected |
| **Properties** | `mode`, `availability`, `selected`, `selectable` |
| **Variants** | `English Ready`, `Chinese Unavailable`, `Mixed Processing`, etc. |
| **States** | Selectable · disabled (not usable) |
| **Screens** | Mode Panel |
| **A11y / touch** | Disabled rows not in tab order; check marker + label for selection |
| **Batch 2** | Approved |

Selection state and availability state are **separate properties**.

---

## AvailabilityStatus

| Field | Detail |
| --- | --- |
| **Anatomy** | Compact text badge or label |
| **Properties** | `status` (original \| ready \| partially-ready \| processing \| unavailable \| failed) |
| **Variants** | One per status enum |
| **States** | Static |
| **Screens** | Mode Panel (`ModeRow`) |
| **A11y / touch** | Status text always visible — not color-only |
| **Batch 2** | Approved; badge colors deferred |

---

## OverlayScrim

| Field | Detail |
| --- | --- |
| **Anatomy** | Full-viewport dimmed layer behind sheet/drawer/panel |
| **Properties** | `opacity` (deferred), `dismissible` (boolean) |
| **Variants** | `Standard`, `Light` (Mode panel) |
| **States** | Visible · fading |
| **Screens** | Contents Side Sheet, Progress Drawer, Mode Panel |
| **A11y / touch** | Tap to dismiss where specified; does not block Reader scroll when no overlay |
| **Batch 2** | Approved |

---

## Component build order (recommended)

1. `OverlayScrim`, `ReaderToolItem`, `PreviewStateAction`, `AvailabilityStatus`
2. `ReaderTopChrome`, `ReaderBottomChrome`, `ChapterEndNavigation`
3. `ReaderCanvas`
4. `ChapterProgressSlider`, `ProgressDrawer`
5. `ContentsHeader`, `ContentsGroupRow`, `ContentsChapterRow`, `ContentsSideSheet`
6. `PreviewFilterBar`, `PreviewWordRow`, `ContextExcerpt`
7. `VocabularyPopover`
8. `ModeRow`, `ModePanel`
9. Assemble seven approved frames

---

## Explicit non-components (Batch 2)

| Item | Reason |
| --- | --- |
| App Shell `BottomNavigation` | Absent in Reader |
| Chrome Previous/Next | Chapter end only |
| Popover connector line | Prohibited |
| Preview permanent bottom legend | Prohibited |
| Provider settings block | Never inside Reader |
| Chapter search in Contents | Not Batch 2 |
| Flashcard / review UI | Not in product |
| Frozen liquid-glass token set | Deferred |

---

*End of R3 Reader Component Inventory — Batch 2*
