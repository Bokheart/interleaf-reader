---

name: interleaf-ui-design
description: Project-specific product design, information architecture, visual design, responsive UI, Figma handoff, image-generation, HTML/CSS implementation, and visual review rules for Interleaf Reader. Use for every Interleaf R3 interface, navigation, component, screen, prototype, and UI implementation task.
---

# Interleaf Reader UI Design Skill

## 1. Purpose

This skill defines the product-specific UI and UX direction for Interleaf Reader.

Use it for:

* product experience design;
* app information architecture;
* screen and navigation design;
* visual direction;
* design tokens;
* mobile UI;
* responsive behavior;
* high-fidelity mockups;
* image-generation prompts;
* Figma components and handoff;
* HTML, CSS and JavaScript UI implementation;
* UI review and regression analysis.

This skill must be used together with the repository's `AGENTS.md`.

For visual design and implementation, it may also be used together with:

* `frontend-design`

Use `web-design-guidelines` mainly after implementation for accessibility and UI-quality review.

---

## 2. Product identity

Interleaf Reader is a:

* mobile-first;
* local-first;
* reading-first;
* long-form reading application;
* multilingual reading-support product;
* browser-based PWA intended to feel like a mature mobile app.

Its primary audience is non-native English readers who want to remain immersed in long-form stories without being repeatedly interrupted by vocabulary difficulty.

The primary product goal is not vocabulary memorization.

Vocabulary support exists to:

* reduce interruption;
* reduce reading anxiety;
* improve comprehension;
* help users remain inside the story;
* support gradual progression toward English reading.

Interleaf Reader is not:

* a flashcard application;
* a spaced-repetition system;
* a quiz platform;
* a school exercise product;
* a generic dictionary;
* a generic translator;
* an IELTS question bank;
* a learning-management dashboard;
* a public book library;
* a social reading platform.

Reading must remain visually and behaviorally dominant.

---

## 3. R3 objective

R3 transforms the existing rough, functional single-page website into a coherent, mature, app-like multi-screen PWA.

R3 includes redesigning:

* information architecture;
* navigation;
* app shell;
* Reader experience;
* visual hierarchy;
* typography;
* spacing;
* component behavior;
* sheets and dialogs;
* responsive behavior;
* accessibility;
* perceived product quality.

R3 is not authorization to rewrite:

* EPUB loading;
* local persistence;
* reading progress;
* vocabulary semantics;
* backup contracts;
* export contracts;
* storage schemas;
* real Chinese generation;
* real Mixed generation.

Existing working behavior must be protected.

---

## 4. Official visual direction

The approved R3 visual direction is:

## Mineral Mist Editorial

Chinese interpretation:

`鐭块浘缂栬緫绯籤

The product should feel:

* refined;
* elegant;
* cool-toned;
* luminous;
* quiet;
* airy;
* literary;
* precise;
* contemporary;
* mature;
* premium without appearing luxurious for its own sake.

The visual metaphor is:

> A blue-gray mineral viewed under soft diffused daylight.

This is a mood reference only.

Do not literally turn the interface into:

* glass;
* crystal;
* glossy plastic;
* glassmorphism;
* reflective surfaces;
* heavy transparency effects.

The interface itself should remain solid, readable and implementable.

---

## 5. Approved visual qualities

Use:

* cool white backgrounds;
* pale blue-gray surfaces;
* mist blue;
* muted periwinkle;
* restrained slate blue;
* deep ink blue;
* graphite text;
* subtle cool-gray dividers;
* clean editorial spacing;
* controlled serif accents;
* modern sans-serif UI typography;
* continuous surfaces;
* selective soft rounding;
* minimal shadows;
* calm transitions;
* mostly monochrome icons.

The interface should feel elegant because of:

* proportion;
* alignment;
* typography;
* white space;
* contrast;
* rhythm;
* restraint.

Elegance must not depend on:

* decorative texture;
* heavy illustration;
* excessive gradients;
* large shadows;
* ornate borders;
* luxury-brand imitation.

---

## 6. Reference-image interpretation

Not every supplied reference image has the same role.

Always classify references before using them.

Possible reference types:

* Color Reference
* Atmosphere Reference
* Typography Reference
* Layout Reference
* Information Architecture Reference
* Interaction Reference
* Component Reference
* Presentation Reference
* Rejected Visual Reference

## Current palette references

The accepted visual family includes:

* mist aqua;
* ice blue;
* powder blue;
* muted cornflower blue;
* pale periwinkle;
* steel blue;
* ink blue;
* cool gray;
* graphite.

The following colors may inspire the palette family:

* `#C8EDEC`
* `#A4C9ED`
* `#728DC1`
* `#3E4F7C`
* `#637695`
* `#D4E9ED`
* `#C5D4E7`
* `#A3C7DC`
* `#A2A9C9`

These are inspiration values, not automatically production-ready tokens.

Before implementation, colors must be adjusted for:

* text contrast;
* state clarity;
* light-mode readability;
* accessibility;
* consistency across screens.

## Warm editorial references

References containing:

* cream;
* coral;
* khaki;
* old rose;
* dark green;
* floral imagery;

may be used only for:

* editorial composition;
* typography hierarchy;
* mature color restraint;
* dark-light balance.

Do not copy their warm palette into the core Interleaf design system.

## Vocabulary Preview reference

The existing Vocabulary Preview phone image is:

`Layout and Information Architecture Reference`

It is not:

`Visual Style Reference`

Preserve useful structure, but do not inherit its yellowed background, green palette, colorful tags, heavy cards or permanent bottom legend.

---

## 7. Starting color system

The following is the preferred starting palette for design exploration.

It is not a frozen implementation palette until reviewed in actual screens.

```css
--ir-canvas: #F7F9FC;
--ir-surface: #FFFFFF;
--ir-surface-subtle: #F1F5F9;
--ir-surface-selected: #E9EFF8;

--ir-mist-100: #DCEAF3;
--ir-mist-200: #C8D9EA;
--ir-periwinkle-300: #A2A9C9;
--ir-blue-400: #8FAED3;
--ir-blue-500: #728DC1;
--ir-blue-700: #3E4F7C;
--ir-steel-600: #637695;

--ir-ink-900: #1F2633;
--ir-ink-700: #394354;
--ir-ink-500: #687386;
--ir-ink-300: #9AA4B3;

--ir-divider: #DDE3EA;
--ir-focus: #94ACD7;
--ir-danger: #B75D65;
```

## Color hierarchy

Use deep ink blue for:

* primary actions;
* active navigation;
* selected states;
* focus anchors;
* important structural emphasis.

Use mist and periwinkle colors for:

* selected-row backgrounds;
* filter backgrounds;
* secondary illustrations;
* empty states;
* subtle decorative moments;
* lightweight category distinction.

Do not use pale colors as body-text colors.

Do not make every component blue.

Most of the interface should remain:

* cool white;
* graphite;
* cool gray.

Color should create hierarchy, not decoration.

## Optional accent color

A muted rose may be explored only as a rare editorial accent for:

* illustrations;
* empty states;
* non-semantic decorative elements.

It must not become:

* a primary action color;
* a vocabulary-state color;
* a navigation color;
* a dominant brand color.

Do not introduce this accent unless approved in a real screen prototype.

---

## 8. Prohibited visual defaults

Do not default to:

* yellowed white;
* cream backgrounds;
* warm ivory;
* beige paper;
* green as the primary brand color;
* orange-brown palettes;
* heavy khaki;
* scrapbook styling;
* journaling aesthetics;
* vintage reading-room aesthetics;
* paper or fiber textures;
* glassmorphism;
* glossy crystal UI;
* neon colors;
* purple gradients;
* colorful category systems;
* excessive shadows;
* excessive rounded cards;
* nested cards;
* dashboard layouts;
* generic AI landing-page design;
* generic SaaS design;
* identical cards repeated across the screen;
* redesigns that only alter color and border radius.

Do not use pastel colors in a way that feels:

* childish;
* sugary;
* cosmetic;
* dreamy without structure;
* low contrast;
* decorative rather than functional.

---

## 9. Typography direction

The design system may use a restrained two-family hierarchy.

## UI typography

Use a modern, highly readable sans-serif for:

* navigation;
* labels;
* buttons;
* metadata;
* settings;
* filters;
* actions;
* vocabulary details.

Prefer system-safe or already available fonts.

Do not add a font dependency without explicit authorization.

## Editorial typography

A refined serif may be used selectively for:

* major Home headings;
* section introductions;
* book-focused editorial moments;
* empty-state titles;
* selected onboarding moments.

Possible fallback direction:

```css
font-family:
  "Iowan Old Style",
  "New York",
  "Source Serif 4",
  Georgia,
  serif;
```

Do not use serif typography for every control.

Do not use:

* calligraphy;
* handwritten script;
* decorative cursive;
* ultra-thin luxury typography;
* low-contrast small serif labels.

## Reading content

Do not force the UI display serif onto imported EPUB text.

Reading content must continue to respect:

* EPUB content;
* existing Reader behavior;
* future reader typography preferences.

UI typography and book typography are separate systems.

---

## 10. Layout and surface principles

Use a consistent spacing rhythm.

Preferred base scale:

* 4
* 8
* 12
* 16
* 20
* 24
* 32
* 40

Use white space to separate hierarchy before adding borders or cards.

Prefer:

* continuous surfaces;
* grouped lists;
* aligned text columns;
* subtle dividers;
* lightweight selected backgrounds;
* bounded reading measures;
* clear top and bottom safe areas.

Do not make every content group a card.

Cards are appropriate only when the content is genuinely independent, such as:

* a current-book summary;
* an imported book item;
* a major empty-state action;
* a floating temporary panel.

## Radius

Use a small, controlled radius system.

Example direction:

* 8px: compact controls;
* 12px: list groups and fields;
* 16px: larger panels and sheets;
* 20px maximum: selected major surfaces.

Avoid full pill shapes except for:

* compact filters;
* segmented controls;
* temporary status chips;
* clearly circular icon actions.

## Shadows

Use shadows only when elevation communicates behavior:

* sheet;
* popover;
* floating control;
* dialog;
* overlay.

Do not use shadows to decorate every content block.

---

## 11. App information architecture

Treat Interleaf Reader as an app-like multi-screen PWA, not a traditional multipage website.

The current preferred architecture is:

## App Shell

Primary destinations:

* Home
* Library
* Vocabulary

On mobile, these may use bottom navigation.

## Secondary screens

* Settings
* Help Center
* Import flow
* Backup and Restore
* Export options

Settings should not automatically become a primary tab.

## Import

Import is primarily an action.

Preferred entry points:

* Home primary action;
* Library add action;
* Library empty state.

Do not automatically create an Import tab.

## Reader

Reader is an immersive full-screen context outside the ordinary App Shell.

When Reader is active:

* ordinary app bottom navigation disappears;
* reading content receives the highest priority;
* Reader chrome remains visually quiet;
* controls may appear when the user taps the reading surface;
* controls recede when not needed.

## Reader sub-surfaces

Preferred models:

* Vocabulary Preview: full-screen Reader subpage;
* Contents: mobile sheet or wider-screen side panel;
* Progress: sheet, popover or side panel;
* Mode: compact sheet or selector;
* vocabulary explanation: bubble, popover or mobile sheet;
* destructive actions: dialog.

Do not use Back and Close together for the same full-screen page.

---

## 12. Vocabulary Preview contract

The primary filters are exactly:

* All
* IELTS
* Phrases
* Slangs

Do not use these as primary filters:

* Nouns
* Adjectives
* Verbs

The Vocabulary Preview should feel like:

> A refined reading-support workspace.

It must not feel like:

* a flashcard deck;
* a school worksheet;
* a dictionary database;
* a table-heavy website;
* a colorful learning dashboard.

Prefer:

* a full-screen Reader subpage;
* continuous list surfaces;
* subtle dividers;
* clear word hierarchy;
* restrained metadata;
* expandable context;
* direct return to the source passage;
* light selected-state treatment.

## Vocabulary-state presentation

Core user states:

* Known
* Learning / Save
* Hidden

The UI may improve:

* icons;
* state feedback;
* placement;
* motion;
* labels.

It must not redefine their semantics.

Preferred visual system:

* cool-gray unselected icons;
* deep ink-blue selected icons;
* icon shape and fill distinguish actions;
* no three-color status system;
* no color-only meaning.

Possible icon semantics:

* Known: check-circle;
* Learning / Save: bookmark;
* Hidden: eye-off.

## Context

Expanded Context should:

* use a pale mist-blue or cool-gray surface;
* display a real source passage;
* highlight the vocabulary item;
* provide a clear `Open in chapter` action;
* avoid a nested heavy card.

Do not keep a permanent bottom legend explaining all action icons.

Use:

* first-use coachmark;
* tooltip;
* toast;
* Help documentation.

---

## 13. Icons and illustration

Use one coherent icon family.

Icons should be:

* simple;
* mostly outline-based;
* optically balanced;
* consistent in stroke;
* understandable at mobile sizes.

Do not mix:

* emoji;
* filled cartoon icons;
* multiple unrelated icon packs;
* decorative symbols;
* hand-drawn icons;

unless explicitly approved.

Illustration may use:

* pale mineral forms;
* abstract leaves;
* translucent blue-gray shapes;
* editorial line art;
* restrained botanical abstraction.

Illustrations must not reduce readability or make the product feel like a lifestyle mood board.

---

## 14. Motion

Motion should communicate:

* navigation;
* hierarchy;
* state change;
* spatial relationship.

Preferred motion:

* short cross-fades;
* restrained slides;
* sheet transitions;
* subtle selection feedback;
* gentle Reader chrome reveal.

Avoid:

* bouncing;
* decorative looping animation;
* large parallax;
* excessive blur;
* dramatic zoom;
* animation that delays reading.

Always consider reduced-motion settings.

---

## 15. Image-generation rules

Image generation may be used for:

* visual-direction exploration;
* high-fidelity screen concepts;
* component studies;
* presentation mockups.

Before generating final mockups:

1. define the screen purpose;
2. define the navigation model;
3. define persistent and contextual elements;
4. define the target viewport;
5. define which reference images apply;
6. define the shared design system.

The first coherent image set should include:

* Home;
* immersive Reader;
* Vocabulary Preview.

All generated screens must share:

* color system;
* typography;
* spacing;
* navigation;
* iconography;
* component language.

Generate clean interface screens for design evaluation.

Do not place every proposal inside a decorative phone mockup.

Device mockups may be created separately for presentation.

Preferred design viewport:

* approximately 393 脳 852 for the first mobile concepts.

Generated interfaces must:

* contain readable copy;
* use realistic touch targets;
* avoid invented functionality;
* avoid impossible layout density;
* be transferable into Figma;
* be implementable with HTML, CSS and JavaScript.

Do not generate unrelated attractive screens that do not form one coherent application.

---

## 16. Implementation protection

Before modifying HTML, CSS or JavaScript:

* inspect the current DOM;
* identify event-sensitive elements;
* identify stable IDs;
* identify data attributes;
* identify selectors used by JavaScript;
* identify selectors used by tests;
* distinguish visual changes from behavior changes.

Preserve unless explicitly authorized:

* IndexedDB names and versions;
* object-store names;
* localStorage keys;
* backup schema identifiers;
* export schemas;
* persisted Reading Mode values;
* `english-study`;
* `chinese`;
* `cloze-mixed`;
* compatibility fields such as `clozeHtml`;
* Guide identity;
* reading progress;
* vocabulary-state semantics.

Do not introduce without explicit authorization:

* React;
* Next.js;
* Tailwind;
* UI component frameworks;
* icon packages;
* animation packages;
* runtime dependencies.

Prefer improving the existing static HTML, CSS and JavaScript architecture unless a separate architecture decision authorizes a migration.

---

## 17. R3 non-goals

Do not implement during R3 without separate authorization:

* Vocabulary Profile v2;
* new vocabulary algorithms;
* real imported-book Chinese Mode;
* real imported-book Mixed Mode;
* translation providers;
* Translation Versions;
* alignment;
* Book Project migration;
* pagination;
* swipe-back navigation;
* Home Screen widgets;
* cloud synchronization;
* accounts;
* analytics;
* new storage schemas.

Future capabilities may affect extensibility.

They must not appear as functional current UI.

---

## 18. Responsive principles

Design mobile first.

## Mobile

* bottom navigation for primary App Shell destinations;
* thumb-reachable actions;
* Reader-specific sheets;
* full-screen Reader;
* full-screen Vocabulary Preview;
* safe-area support;
* practical touch targets;
* no page-level horizontal overflow.

## Tablet

* bottom navigation may become a navigation rail;
* sheets may become side panels;
* Preview may use a controlled split layout;
* Reader text measure remains bounded.

## Desktop

* do not merely stretch the mobile interface;
* use a navigation rail, sidebar or bounded workspace;
* preserve readable text line length;
* use additional width for supporting panels;
* maintain the same component and visual language.

---

## 19. Accessibility requirements

Every proposal and implementation must consider:

* semantic structure;
* keyboard navigation;
* visible focus;
* screen-reader labels;
* contrast;
* touch-target size;
* reduced motion;
* no color-only status communication;
* zoom;
* long-label wrapping;
* translated-copy expansion;
* loading states;
* empty states;
* error states;
* destructive-action confirmation.

Pale palette inspiration must never reduce usability.

---

## 20. Design workflow

Before implementation:

1. identify the user task;
2. map the current screen;
3. classify reference images;
4. define information architecture;
5. define navigation transitions;
6. choose full-screen, sheet, dialog, popover or inline presentation;
7. define design tokens;
8. define shared components;
9. produce mobile-first high-fidelity prototypes;
10. obtain product-owner approval;
11. produce Figma handoff;
12. implement in bounded slices;
13. run responsive and accessibility review.

Do not start broad CSS or DOM restructuring before the information architecture and core visual direction are approved.

---

## 21. Review checklist

## Product

* Reading remains dominant.
* Vocabulary support remains subordinate.
* No new product semantics were introduced.
* Unimplemented features remain honest.

## Visual direction

* Mineral Mist Editorial is recognizable.
* The interface is elegant and mature.
* Cool white and blue-gray dominate.
* Deep ink tones provide enough structure.
* Pastels do not appear childish.
* Warm yellow and green-primary drift are absent.
* Typography carries hierarchy.
* Color remains restrained.
* Cards are not used by default.
* Decorative texture does not interfere with content.

## Interaction

* Navigation is predictable.
* Back behavior is clear.
* Full-screen, sheet, dialog and popover choices are appropriate.
* Temporary controls do not occupy permanent reading space.
* Reader chrome can recede.

## Mobile quality

* Touch targets are practical.
* No horizontal overflow exists.
* Fixed controls do not cover content.
* Safe-area spacing is considered.
* Long labels and translated text can wrap.

## Technical safety

* Stable selectors and compatibility identifiers are preserved.
* No unnecessary dependency was added.
* Changes are bounded and reviewable.
* Existing behavior remains functional.
* Tests and protected workflows still pass.

---

When visual quality conflicts with product clarity, reading comfort and usability take priority.

When multiple attractive directions are possible, recommend one clear direction rather than combining every reference.
