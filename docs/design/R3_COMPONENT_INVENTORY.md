# R3 Component Inventory — Batch 1

**Task:** R3-DESIGN-01  
**Status:** Documentation handoff  
**Related:** `R3_FIGMA_BUILD_MANIFEST.md`, `R3_VISUAL_FOUNDATIONS.md`

This inventory defines reusable Figma components for Batch 1. Variant property names are proposals for Figma; implementation may map to CSS classes later.

---

## Inventory summary

| Component | Batch 1 | Screens |
| --- | --- | --- |
| AppTopBar | Home top bar (editorial title + Settings) | Home |
| SecondaryTopBar | Yes | Book Detail, Settings * |
| BottomNavigation | Yes | Home, Library, Vocabulary |
| BottomNavigationItem | Yes | Home, Library, Vocabulary |
| SectionHeading | Yes | All App Shell + Settings |
| SurfaceCard | Yes | Home, Library, Vocabulary, Settings |
| SettingsRow | Yes | Settings * |
| BookCover | Yes | Home, Library, Book Detail |
| ContinueReadingCard | Yes | Home |
| BookListRow | Yes | Library |
| ProgressBar | Yes | Home, Library, Book Detail, Reading preview |
| QuickAction | Yes | Home, Book Detail |
| StateManagementGroup | Yes | Vocabulary |
| StateManagementRow | Yes | Vocabulary |
| AddWordField | Yes | Vocabulary |
| VersionSummary | Yes | Library (row), Book Detail |
| VersionRow | Yes | Book Detail |
| StatusBadge | Yes | Book Detail, Language & Translation |
| TranslationJobRow | Yes | Book Detail |
| PrimaryButton | Yes | Home, Book Detail, Vocabulary |
| SecondaryButton | Yes | Vocabulary, dialogs (future) |
| DestructiveRow | Yes | Book Detail |
| InformationalCard | Yes | Language & Translation, Settings |
| EmptyState | Yes | Home, Library, Vocabulary |

---

## AppTopBar

| Field | Detail |
| --- | --- |
| **Purpose** | Home screen top region: editorial app title and directly visible trailing actions. On Home, exposes **Settings** without overflow. |
| **Anatomy** | Safe area spacer · editorial serif title (`Interleaf Reader`) · trailing Settings icon button |
| **Properties** | `title` (text, default app name), `showSettings` (boolean, default true on Home) |
| **Variants** | `Home — with Settings` |
| **Screens** | Home only for Batch 1 (Library and Vocabulary use overflow for Settings instead) |
| **Batch 1** | Yes — Home top bar |
| **A11y / touch** | Settings icon min **44 × 44 px** hit area; title is primary `heading` for the screen |

---

## SecondaryTopBar

| Field | Detail |
| --- | --- |
| **Purpose** | Full-screen secondary navigation: Back, centered or leading title, optional trailing overflow. |
| **Anatomy** | Back button · title · more/overflow button |
| **Properties** | `title`, `showMore` (boolean), `backLabel` (default "Back") |
| **Variants** | `Default`, `More hidden` |
| **Screens** | Book Detail, Settings Home, Appearance, Reading, Language & Translation |
| **Batch 1** | Yes |
| **A11y / touch** | Back and More: **44 × 44 px** minimum; Back has visible text or `aria-label` |

---

## BottomNavigation

| Field | Detail |
| --- | --- |
| **Purpose** | Primary App Shell tab bar for Home, Library, Vocabulary. |
| **Anatomy** | Safe area bottom spacer · horizontal row of three `BottomNavigationItem` |
| **Properties** | `activeTab` (Home \| Library \| Vocabulary) |
| **Variants** | `Default` only for Batch 1 |
| **Screens** | Home, Library, Vocabulary |
| **Batch 1** | Yes |
| **A11y / touch** | Each item **≥ 48 px** tall; `role="tablist"` pattern; active state not color-only |

---

## BottomNavigationItem

| Field | Detail |
| --- | --- |
| **Purpose** | Single tab: icon + label. |
| **Anatomy** | Icon · label (2–3 words max) |
| **Properties** | `label`, `icon`, `state` (active \| inactive) |
| **Variants** | `Active`, `Inactive` |
| **Screens** | Home, Library, Vocabulary |
| **Batch 1** | Yes |
| **A11y / touch** | Full tab width hit area; active uses ink-blue icon + label weight change |

---

## SectionHeading

| Field | Detail |
| --- | --- |
| **Purpose** | Group label for content sections. |
| **Anatomy** | Title (sans-serif, semibold) · optional trailing action link |
| **Properties** | `title`, `showAction` (boolean), `actionLabel` |
| **Variants** | `Default`, `With action` |
| **Screens** | All Batch 1 screens |
| **Batch 1** | Yes |
| **A11y / touch** | Action link min height **44 px** if present |

---

## SurfaceCard

| Field | Detail |
| --- | --- |
| **Purpose** | Bounded container for genuinely independent content (snapshot, import CTA, informational blocks). |
| **Anatomy** | Optional elevation shadow · background surface · padding · slot for children |
| **Properties** | `elevation` (flat \| raised), `padding` (compact \| standard) |
| **Variants** | `Flat`, `Raised`, `Interactive` (hover/pressed for prototype) |
| **Screens** | Home (Snapshot, optional), Library (Import EPUB), Vocabulary, Settings previews |
| **Batch 1** | Yes |
| **A11y / touch** | Interactive cards: entire card tappable, min **48 px** height |

---

## SettingsRow

| Field | Detail |
| --- | --- |
| **Purpose** | Navigational or toggle row in settings lists. |
| **Anatomy** | Optional leading icon · title · subtitle · trailing chevron or control |
| **Properties** | `title`, `subtitle`, `trailing` (chevron \| toggle \| value \| none), `destructive` (boolean) |
| **Variants** | `Navigation`, `Toggle`, `Value`, `Destructive` |
| **Screens** | Settings Home, Appearance, Reading, Language & Translation, Vocabulary (Reading Profile) |
| **Batch 1** | Yes |
| **A11y / touch** | Min row height **48 px**; toggle has visible focus ring |

---

## BookCover

| Field | Detail |
| --- | --- |
| **Purpose** | Compact cover thumbnail for generated-text or imported EPUB covers. |
| **Anatomy** | Rounded rectangle · cover image or typographic fallback · optional spine shadow |
| **Properties** | `size` (compact \| standard \| large), `hasImage` (boolean), `titleFallback` (text) |
| **Variants** | `Compact` (Home ContinueReadingCard ~48–56 px wide), `List` (~40 px), `Detail` (~72 px), `Placeholder` |
| **Screens** | Home, Library, Book Detail |
| **Batch 1** | Yes |
| **A11y / touch** | Decorative if adjacent text repeats title; `alt` on meaningful covers |

---

## ContinueReadingCard

| Field | Detail |
| --- | --- |
| **Purpose** | Primary Home content block for the current or most recent book reading context. |
| **Anatomy** | BookCover · title stack · chapter · percentage · PrimaryButton |
| **Properties** | `ctaState` (`start` \| `resume` \| `empty`), `chapter`, `percent` |
| **Variants** | CTA label follows `ctaState`: **Start Reading** (`start`), **Resume Reading** (`resume`), `Empty prompt` (`empty`) — one component, not separate screen structures |
| **Screens** | Home |
| **Batch 1** | Yes |
| **A11y / touch** | Primary CTA min height **48 px**; button label must read exactly **Start Reading** or **Resume Reading** per state; entire card may be tappable in prototype |

---

## BookListRow

| Field | Detail |
| --- | --- |
| **Purpose** | Single library entry in vertical shadowed-card list. |
| **Anatomy** | BookCover · title · author or placeholder · location line · ProgressBar · percent · VersionSummary |
| **Properties** | `hasAuthor`, `progress`, `versionSummary` |
| **Variants** | `Default`, `Missing author`, `Guide book` (optional styling) |
| **Screens** | Library |
| **Batch 1** | Yes |
| **A11y / touch** | Full row tappable, min **72 px** height; progress also exposed as text |

---

## ProgressBar

| Field | Detail |
| --- | --- |
| **Purpose** | Linear reading progress indicator. |
| **Anatomy** | Track · fill · optional percentage label |
| **Properties** | `value` (0–100), `showLabel` (boolean), `size` (compact \| standard) |
| **Variants** | `Standard`, `Compact` |
| **Screens** | Home, Library, Book Detail, Reading preview |
| **Batch 1** | Yes |
| **A11y / touch** | `role="progressbar"` with `aria-valuenow`; do not rely on color alone |

---

## QuickAction

| Field | Detail |
| --- | --- |
| **Purpose** | Secondary shortcut chip or card for frequent actions. |
| **Anatomy** | Icon · label |
| **Properties** | `label`, `icon`, `layout` (chip \| card) |
| **Variants** | `Chip`, `Card` |
| **Screens** | Home, Book Detail |
| **Batch 1** | Yes |
| **A11y / touch** | Min **44 × 44 px**; label always visible (not icon-only) |

---

## StateManagementGroup

| Field | Detail |
| --- | --- |
| **Purpose** | Grouped container for Learning, Known, Hidden state rows. |
| **Anatomy** | Continuous surface · three `StateManagementRow` · dividers |
| **Properties** | `learningCount`, `knownCount`, `hiddenCount` |
| **Variants** | `Default` |
| **Screens** | Vocabulary |
| **Batch 1** | Yes |
| **A11y / touch** | Group labeled `State Management` via heading |

---

## StateManagementRow

| Field | Detail |
| --- | --- |
| **Purpose** | Navigational row for a vocabulary state bucket. |
| **Anatomy** | State icon · label · count · chevron |
| **Properties** | `state` (learning \| known \| hidden), `count` |
| **Variants** | `Learning`, `Known`, `Hidden` |
| **Screens** | Vocabulary |
| **Batch 1** | Yes |
| **A11y / touch** | Icons: bookmark (Learning), check-circle (Known), eye-off (Hidden); min height **48 px** |

**Prohibited:** review, familiar, mastery, streak, flashcard iconography.

---

## AddWordField

| Field | Detail |
| --- | --- |
| **Purpose** | Independent manual capture module; new entries default to Learning. |
| **Anatomy** | Section label · text field · submit button · optional inline feedback |
| **Properties** | `state` (idle \| error \| success) |
| **Variants** | `Default`, `Error`, `Success feedback` |
| **Screens** | Vocabulary |
| **Batch 1** | Yes |
| **A11y / touch** | Field min height **48 px**; button label "Add to Learning" or equivalent |

---

## VersionSummary

| Field | Detail |
| --- | --- |
| **Purpose** | Compact summary of available book versions (e.g., "English · Original"). |
| **Anatomy** | Text line or chip cluster |
| **Properties** | `languages`, `types` |
| **Variants** | `Inline` (list row), `Block` (Book Detail header) |
| **Screens** | Library (BookListRow), Book Detail |
| **Batch 1** | Yes |
| **A11y / touch** | Readable at 14 px minimum |

---

## VersionRow

| Field | Detail |
| --- | --- |
| **Purpose** | Single version entry in Book Detail version list. |
| **Anatomy** | Type label · language · StatusBadge · optional progress · chevron |
| **Properties** | `type` (original \| uploaded \| generated \| mixed), `status`, `language` |
| **Variants** | `Original`, `Uploaded`, `Generated`, `Mixed`, `Placeholder` |
| **Screens** | Book Detail |
| **Batch 1** | Yes |
| **A11y / touch** | Row min **56 px**; status in text + badge |

---

## StatusBadge

| Field | Detail |
| --- | --- |
| **Purpose** | Compact status label for versions, jobs, connection state. |
| **Anatomy** | Pill or compact tag · label |
| **Properties** | `tone` (neutral \| active \| success \| warning \| disconnected), `label` |
| **Variants** | `Neutral`, `Active`, `Success`, `Warning`, `Disconnected` |
| **Screens** | Book Detail, Language & Translation |
| **Batch 1** | Yes |
| **A11y / touch** | Text always present; not color-only |

---

## TranslationJobRow

| Field | Detail |
| --- | --- |
| **Purpose** | Show translation job identity and status without unsupported controls. |
| **Anatomy** | Job title · target language · StatusBadge · optional timestamp |
| **Properties** | `status` (queued \| running \| completed \| failed), `showTimestamp` |
| **Variants** | `Queued`, `Running`, `Completed`, `Failed` |
| **Screens** | Book Detail |
| **Batch 1** | Yes |
| **A11y / touch** | **No pause button, no ETA, no cancel** unless product approves later |

---

## PrimaryButton

| Field | Detail |
| --- | --- |
| **Purpose** | Main call-to-action per screen or section. |
| **Anatomy** | Fill background (ink-blue) · label · optional leading icon |
| **Properties** | `label`, `state` (default \| disabled \| loading), `width` (hug \| fill) |
| **Variants** | `Default`, `Disabled`, `Loading` |
| **Screens** | Home, Book Detail, Vocabulary |
| **Batch 1** | Yes |
| **A11y / touch** | Min height **48 px**; fill width on mobile for primary screen actions |

---

## SecondaryButton

| Field | Detail |
| --- | --- |
| **Purpose** | Lower-emphasis action. |
| **Anatomy** | Outline or subtle fill · label |
| **Properties** | `label`, `state` (default \| disabled) |
| **Variants** | `Outline`, `Ghost` |
| **Screens** | Vocabulary (export secondary), Home dismiss actions |
| **Batch 1** | Yes |
| **A11y / touch** | Min height **44 px** |

---

## DestructiveRow

| Field | Detail |
| --- | --- |
| **Purpose** | Destructive action presented as a full-width list row (Forget This Book). |
| **Anatomy** | Danger-colored label · optional icon · no chevron |
| **Properties** | `label` |
| **Variants** | `Default`, `Disabled` |
| **Screens** | Book Detail |
| **Batch 1** | Yes |
| **A11y / touch** | Requires confirmation dialog in flow (future); min height **48 px** |

---

## InformationalCard

| Field | Detail |
| --- | --- |
| **Purpose** | Neutral explanatory copy block without implying action. |
| **Anatomy** | Subtle background · body text · optional leading info icon |
| **Properties** | `tone` (info \| neutral) |
| **Variants** | `Info`, `Neutral` |
| **Screens** | Language & Translation (provider ≠ auto-translate), Settings |
| **Batch 1** | Yes |
| **A11y / touch** | Body text ≥ 14 px; contrast meets WCAG AA when colors finalized |

---

## EmptyState

| Field | Detail |
| --- | --- |
| **Purpose** | Direct user when a list or primary content area has no data. |
| **Anatomy** | Optional restrained illustration · title (serif allowed) · body · optional PrimaryButton |
| **Properties** | `title`, `body`, `showAction` |
| **Variants** | `No books`, `No vocabulary`, `No search results` |
| **Screens** | Home, Library, Vocabulary |
| **Batch 1** | Yes |
| **A11y / touch** | Action button min **48 px**; no gamified empty illustrations |

---

## Component build order (recommended)

1. Foundations tokens (from Visual Foundations)
2. `PrimaryButton`, `SecondaryButton`, `ProgressBar`, `StatusBadge`
3. `BookCover`, `SettingsRow`, `SectionHeading`
4. `BottomNavigationItem`, `BottomNavigation`
5. `SecondaryTopBar`
6. Composites: `ContinueReadingCard`, `BookListRow`, `StateManagementRow`, `AddWordField`, `VersionRow`, `TranslationJobRow`, `DestructiveRow`, `InformationalCard`, `EmptyState`
7. Screen assembly per Manifest

---

## Explicit non-components (do not build for Batch 1)

| Concept | Reason |
| --- | --- |
| Flashcard | Not in product |
| Review queue card | Not in product |
| Streak / study-time widget | Gamification excluded |
| Filter chip bar (Library) | Excluded from current version |
| Translation pause / ETA controls | Unsupported behavior |
| Device bezel frame | See Visual Foundations |

---

*End of R3 Component Inventory — Batch 1*
