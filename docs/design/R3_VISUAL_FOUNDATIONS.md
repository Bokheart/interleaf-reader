# R3 Visual Foundations — Batch 1

**Task:** R3-DESIGN-01  
**Status:** Documentation handoff (exploratory tokens — not frozen for implementation)  
**Direction name:** Mineral Mist Editorial (`矿石编辑系`)  
**Related:** `.agents/skills/interleaf-ui-design/SKILL.md`

Semantic token names below describe roles and relationships. Hex values in the skill file are **inspiration only** until validated on real screens for contrast, state clarity, and accessibility. This document does not claim final production hex values are locked.

---

## Visual positioning

Interleaf Reader R3 should feel:

- mobile-first, local-first, reading-first;
- refined, cool-toned, luminous, quiet, literary, precise, contemporary;
- premium without luxury-brand excess;
- like a mature editorial reading app, not a learning dashboard or generic SaaS template.

**Metaphor (mood only):** blue-gray mineral under soft diffused daylight. Do not literalize as glass, crystal, or reflective surfaces.

**Batch 1 screen personalities:**

| Screen | Direction keyword |
| --- | --- |
| Home | Editorial Spacious — serif title, airy vertical rhythm, Continue Reading dominant |
| Library | Vertical shadowed-card list — subtle elevation, searchable catalog |
| Book Detail | Long-scroll version management — informational density without dashboard clutter |
| Vocabulary | Management layout — grouped states, capture module, no study gamification |
| Settings | Secondary full-screen — calm list surfaces, no bottom nav |

---

## Typography roles

Two-family hierarchy: modern sans for UI; restrained serif for editorial moments.

| Role | Token name | Face direction | Usage |
| --- | --- | --- | --- |
| Editorial display | `type/editorial/display` | Refined serif (e.g., Iowan Old Style, New York, Source Serif 4, Georgia) | Home and Library page titles, select empty-state titles |
| UI title | `type/ui/title-lg` | Sans-serif | Screen titles in Settings, Book Detail bar |
| UI title sm | `type/ui/title-sm` | Sans-serif semibold | Section headings, card titles |
| Body | `type/ui/body` | Sans-serif regular | Paragraphs, list subtitles |
| Body emphasis | `type/ui/body-strong` | Sans-serif medium/semibold | Book titles in rows, button labels |
| Caption | `type/ui/caption` | Sans-serif | Metadata, counts, hints |
| Mono / data | `type/ui/data` | Sans-serif tabular optional | Percentages, counts |

**Scale (mobile reference, adjustable):**

| Token | Size (approx) | Line height |
| --- | --- | --- |
| `type/editorial/display` | 28–32 px | 1.15–1.2 |
| `type/ui/title-lg` | 20–22 px | 1.25 |
| `type/ui/title-sm` | 16–17 px | 1.3 |
| `type/ui/body` | 15–16 px | 1.45–1.5 |
| `type/ui/caption` | 13–14 px | 1.35 |
| `type/ui/button` | 15–16 px | 1.2 |

**Rules:**

- Serif for major App Shell page titles (Home, Library) — not every control.
- Settings and dense lists stay sans-serif.
- Reader content typography is separate (`type/reader/*`); do not force UI serif onto EPUB text.
- No calligraphy, script, ultra-thin luxury type, or low-contrast small serif labels.

---

## Semantic color tokens

Names describe role. Map to exploratory palette during Figma build; re-validate before CSS implementation.

### Surfaces

| Token | Role |
| --- | --- |
| `color/canvas` | App background — cool white |
| `color/surface/default` | Primary cards and sheets |
| `color/surface/subtle` | Grouped list backgrounds, preview wells |
| `color/surface/selected` | Selected row, active filter background |
| `color/surface/elevated` | Raised library cards |

### Brand and structure

| Token | Role |
| --- | --- |
| `color/brand/primary` | Primary actions, active nav, focus anchors — deep ink blue family |
| `color/brand/mist-100` | Light mist fills, empty states |
| `color/brand/mist-200` | Secondary fills, expanded context backgrounds |
| `color/brand/periwinkle` | Subtle category distinction — use sparingly |
| `color/brand/steel` | Secondary emphasis |

### Text

| Token | Role |
| --- | --- |
| `color/text/primary` | Body and titles — graphite / ink |
| `color/text/secondary` | Metadata, hints |
| `color/text/tertiary` | Placeholders, disabled |
| `color/text/inverse` | Text on primary buttons |
| `color/text/destructive` | Forget actions, errors |

### Borders and focus

| Token | Role |
| --- | --- |
| `color/border/default` | Dividers, hairlines — cool gray |
| `color/border/subtle` | Inset separators |
| `color/focus/ring` | Keyboard focus — periwinkle / steel blue |

### Status (non-vocabulary-state)

| Token | Role |
| --- | --- |
| `color/status/neutral` | Badges, disconnected provider |
| `color/status/success` | Completed job (text + badge) |
| `color/status/warning` | Non-blocking caution |
| `color/status/danger` | Destructive emphasis |

### Reader themes (separate from app appearance)

| Token | Role |
| --- | --- |
| `color/reader/theme-white` | White reader background |
| `color/reader/theme-mist` | Mist reader background |
| `color/reader/theme-night` | Night reader background |

### App appearance presets

| Token | Role |
| --- | --- |
| `color/app-theme/mineral-mist` | Default app chrome preset |
| `color/app-theme/deep-mineral` | Darker cool preset |
| `color/app-theme/future-*` | Curated placeholders — not implemented |

**Color hierarchy rules:**

- Deep ink blue for primary actions and active navigation — not every component.
- Most UI remains cool white, graphite, cool gray.
- Pale mist/periwinkle for selected rows and light distinction — not body text.
- Vocabulary states use icon shape + ink selection — **no three-color status system**.
- Optional muted rose accent only for rare editorial illustration — not Batch 1 default.

**Inspiration hex (NOT frozen):** see `interleaf-ui-design` skill starting palette (`--ir-canvas`, `--ir-ink-900`, etc.) for exploration starting points.

---

## Spacing scale

8-point rhythm with 4 px half-steps for optical tuning.

| Token | Value |
| --- | --- |
| `space/1` | 4 px |
| `space/2` | 8 px |
| `space/3` | 12 px |
| `space/4` | 16 px |
| `space/5` | 20 px |
| `space/6` | 24 px |
| `space/8` | 32 px |
| `space/10` | 40 px |

**Application:**

- Screen horizontal inset: `space/4` (16 px)
- Section gap: `space/6` (24 px)
- List item internal padding: `space/4`
- Compact control gap: `space/2`
- Bottom nav height: ~56 px + safe area (not on 8-pt grid — intentional)

---

## Radius scale

| Token | Value | Usage |
| --- | --- | --- |
| `radius/sm` | 8 px | Compact controls, buttons |
| `radius/md` | 12 px | List groups, fields, library cards |
| `radius/lg` | 16 px | Larger panels, sheets |
| `radius/xl` | 20 px | Major surfaces maximum |
| `radius/full` | 9999 px | Filters, status chips only — not default cards |

Avoid pill-shaped everything. Full radius reserved for compact chips and circular icon actions.

---

## Border philosophy

- Prefer whitespace and alignment over borders.
- Use `color/border/default` at 1 px for list dividers inside continuous surfaces.
- Library shadowed cards may use border **or** shadow — not both heavy.
- No ornate, double, or decorative borders.
- Selected rows: background fill (`color/surface/selected`) preferred over thick borders.

---

## Shadow / elevation scale

Shadows communicate behavior, not decoration.

| Token | Usage |
| --- | --- |
| `elevation/none` | Flat grouped lists, settings rows |
| `elevation/low` | Library book cards — subtle y-offset, soft cool-gray shadow |
| `elevation/medium` | Sheets, popovers (future) |
| `elevation/high` | Modals, dialogs (future) |

**Library card direction:** subtle elevation separating vertical list items — not nested card stacks.

Do not shadow every content block. No large diffuse luxury shadows.

---

## Icon rules

- One coherent outline icon family; consistent stroke (~1.5–2 px).
- Mostly monochrome — `color/text/secondary` default, `color/brand/primary` when active.
- Sizes: 20–24 px optical in nav; 16–20 px inline.
- No emoji, cartoon fills, mixed packs, or hand-drawn icons.
- Vocabulary state icons: check-circle (Known), bookmark (Learning), eye-off (Hidden).

Illustration (empty states only, restrained):

- abstract mineral forms, pale leaves, translucent blue-gray shapes, editorial line art;
- no landscapes, birds, ink wash, or lifestyle mood-board clutter.

---

## Motion principles

Motion communicates navigation, hierarchy, and state — not decoration.

| Pattern | Guidance |
| --- | --- |
| Screen transition | Short cross-fade or horizontal slide, ~200–300 ms |
| Sheet / dialog | Slide up with `elevation/medium`, ~250 ms |
| Selection | Subtle background fade, ~150 ms |
| Reader chrome | Gentle reveal on tap; recede when idle |
| Reduce Motion | When enabled, replace slides with cross-fade or instant state change |

**Avoid:** bounce, looping decoration, parallax, dramatic zoom, blur-heavy transitions, animation that delays reading.

Settings Appearance includes **Reduce Motion** toggle — design must respect it in prototypes where motion is shown.

---

## Mobile safe-area treatment

- Production frames are **full-bleed logical screens** (393 × 852 reference) — no ornamental phone hardware inside frames.
- Apply safe-area padding to:
  - top: status bar / notch inset;
  - bottom: home indicator inset above bottom nav or scroll end.
- Fixed bottom navigation sits above `safe-area-inset-bottom`.
- Scrollable content receives bottom padding so last row is not obscured by nav.
- Use Figma layout guides or spacer components for safe areas; document inset values on each screen frame.

---

## No-device-bezel rule

- Batch 1 screen frames show **interface only** — no phone mockup bezels, notches drawn as hardware, or marketing device frames inside production artboards.
- Device presentation mockups may exist on separate presentation pages outside Batch 1 build pages.
- This keeps handoff directly implementable as PWA viewport chrome.

---

## Prohibited styles

The following are **explicitly prohibited** in Batch 1 Figma build and R3 visual direction:

| Category | Prohibited |
| --- | --- |
| Warm palettes | Yellow or cream-dominant themes; warm ivory; beige paper backgrounds |
| Accent misuse | Green as primary accent; orange-brown dominant palettes |
| Imagery | Literal mountains, landscapes, ink wash, Chinese-painting scenery; birds; decorative mist photography |
| Texture | Paper textures; fiber/grain overlays; scrapbook aesthetics |
| Effects | Glassmorphism; glossy crystal UI; heavy gradients; neon; purple gradient stacks |
| Layout | Excessive dashboard cards; nested card stacks; identical repeated cards filling the screen; generic AI landing page layout |
| Product semantics | Learning-app gamification; streaks; study-time widgets; flashcard visuals; mastery/review queues |
| Presentation | Ornamental phone bezels inside production frames |
| Vocabulary UI | Three-color status system; permanent bottom icon legend; colorful tag taxonomy |
| Translation UI | Pause, ETA, or unsupported job controls presented as available |
| Honesty | Presenting placeholder translation, Chinese Mode, Mixed Mode, or provider behavior as fully implemented |

---

## Light / dark / system (app appearance)

| Mode | Direction |
| --- | --- |
| Light | `color/canvas` cool white dominant — default |
| Dark | Deep mineral surfaces — graphite backgrounds, mist blue accents; maintain AA contrast when hex finalized |
| System | Follows OS preference in implementation; Figma may show Light + Deep Mineral preset frames |

App appearance (Settings → Appearance) is **independent** from Reader themes (White / Mist / Night under Settings → Reading).

---

## Figma token setup (operator notes)

1. Create Figma variables collections: `color`, `space`, `radius`, `elevation`, `type` (aliases).
2. Mark all color variables as **exploratory** in frame annotations until PO sign-off.
3. Bind components to semantic tokens, not raw hex, wherever possible.
4. Document any screen-specific exceptions in the Manifest frame notes.

---

## Accessibility baseline

- Text contrast: target WCAG 2.1 AA when colors are finalized — pale pastels must not be used for small text.
- Touch targets: minimum **44 × 44 px** (48 px for primary actions).
- Focus: visible `color/focus/ring` on interactive elements.
- States: never color-only; pair with icon, label, or weight change.
- Zoom: layouts must tolerate ~200% text scaling without horizontal page overflow.
- Localization: allow label wrapping for Chinese interface strings.

---

*End of R3 Visual Foundations — Batch 1*
