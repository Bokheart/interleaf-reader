# Vocabulary Preview Responsive Spec

## Purpose

This spec defines responsive behavior for the isolated `design-lab/vocabulary-preview.*` prototype. It does not change production `pwa-reader/**`, M2 acceptance status, or Vocabulary Preview product semantics.

## Reference Viewports

| Frame | Viewport | Intended presentation |
|---|---:|---|
| Mobile | 393 x 852 | Full-viewport mobile composition with the existing status bar, compact controls, vocabulary rows, expanded Context panel, and pinned Tips bar. |
| Tablet | 834 x 1112 | Centered single-column reading surface with 24px surrounding space and a maximum content width of 760px. |
| Desktop | 1440 x 900 | Centered 760px reading surface with generous surrounding space; no multi-pane layout. |

## Breakpoint Strategy

- Base styles are mobile-first and preserve the current 393px information hierarchy.
- `700px` introduces the tablet/wide-screen presentation: surrounding page space, wider row proportions, larger internal spacing, and removal of phone-only status/home-indicator chrome.
- `1200px` adds only small desktop spacing and row-width refinements. It does not introduce new components or columns.
- The same HTML and deterministic JavaScript sample state render all frames.

## Content Width

- The app shell is fluid up to `760px`.
- Mobile uses the full viewport width.
- Tablet and desktop center the shell inside the viewport.
- The document and app shell must never exceed the viewport width or create horizontal scrolling.

## Spacing And Typography

- Mobile keeps the existing compact type scale and spacing hierarchy.
- Tablet and desktop increase horizontal padding and vocabulary-row spacing without scaling the entire phone interface.
- Word labels increase only slightly on wider screens; body/detail copy retains readable line lengths.
- Interactive buttons keep visible focus treatment. Primary mobile controls use approximately 44px targets where markup represents an actual button.

## Filter Wrapping

- Filters use one flex container with wrapping enabled.
- At the three reference widths, the deterministic filters should remain on one row when space allows.
- If labels grow through localization or a narrower viewport, chips wrap to the next line instead of clipping or causing horizontal scrolling.

## Vocabulary Rows

- Mobile keeps the word/status hierarchy in a compact two-column row: a bounded word column of approximately 38% and a flexible details column. The word track is wide enough for the deterministic terms and pronunciation target without forced mid-word breaks.
- Tablet uses a `144px` to `176px` word column; desktop uses a `180px` word column.
- Meanings, detail tags, and action states remain in the same order at every breakpoint.
- Long words and detail text wrap within their own grid tracks.

## Expanded Context

- The deterministic `anxious` Context panel remains expanded in all three frames.
- It stays inside the flexible details column and grows vertically as text wraps.
- The quote and `Go to this passage` action do not move into a separate pane or overlay.

## Interaction State Model

### Default Detailed State

- Vocabulary Preview opens with `Hide meanings` off.
- Every visible row shows its meaning, part of speech, available EN/IELTS/USE detail rows, and Context affordance.
- The deterministic `anxious` Context panel remains expanded.

### Hide-Meanings Collapsed State

- Turning `Hide meanings` on preserves list order, active filter, and vocabulary statuses.
- Every row collapses to its number, word or phrase, and mutually exclusive status controls.
- Meanings, parts of speech, detail tags, Context content, and passage actions are hidden.
- Collapsed rows become focusable disclosure controls with `aria-expanded="false"`.

### Focused Single-Row Expansion

- Activating a collapsed row expands that row only and sets `aria-expanded="true"`.
- Activating another row moves the focused expansion to that row.
- Activating the focused row again collapses it.
- Enter and Space perform the same disclosure action while a collapsed row has keyboard focus.
- Turning `Hide meanings` off clears the temporary focused row and restores all visible row details.

## Vocabulary Status Model

- Each sample item has exactly one status: `none`, `known`, `learning`, or `hidden`.
- Known sets `known`; Save sets `learning`; Hide sets `hidden`. Each transition replaces the previous status and updates immediately.
- Repeating the active action is idempotent. No item may show more than one active status control.
- Status controls are native buttons with `aria-pressed` and stop row-click propagation.
- Row disclosure never changes vocabulary status, and toggling meanings never resets status.
- The deterministic sample keeps visible rows in Known, Learning, Hidden, and None states for inspection.
- This lab stores state in memory only. In production, Hide may remove an item from future Preview results after vocabulary-profile persistence and refresh.

## Filter Behavior

- Filter chips are native toggle buttons with one active filter.
- `All` restores all deterministic rows; IELTS and Phrases show matching sample rows; Slang demonstrates the empty state.
- Filtering does not alter vocabulary status or hide-meanings mode.

## Header, Scrolling, And Tips

- Only `.vocab-scroll` scrolls vertically.
- Header, instruction, filters, and Tips remain outside that scroll container, so they stay visible while vocabulary rows scroll.
- The phone status bar and home indicator appear only in the mobile presentation.
- The Tips bar remains pinned to the bottom of the app shell at all reference sizes and must not overlap vocabulary content.

## Figma Frame Mapping

Create three separate Figma frames from the same browser implementation state:

1. `Vocabulary Preview / Mobile` at `393 x 852`.
2. `Vocabulary Preview / Tablet` at `834 x 1112`.
3. `Vocabulary Preview / Desktop` at `1440 x 900`.

For each viewport, prepare three state frames from the same HTML implementation:

1. `Detailed` - `All 14` selected, Hide meanings off, all row details visible, and anxious Context expanded.
2. `Meanings Hidden` - Hide meanings on with every row collapsed.
3. `Focused Inspection` - Hide meanings on with anxious expanded as the only detailed row.

This produces nine reference frames across mobile, tablet, and desktop. Status variants remain visible within those frames; do not create separate HTML variants or persist lab state. Figma capture is intentionally outside this task.
