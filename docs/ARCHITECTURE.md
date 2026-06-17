# Architecture

## Summary

Slash Reader v2 is organized around a web/PWA reader. The browser app owns the reading surface, chapter state, vocabulary overlays, and future translation mode switching.

For this skeleton, the app is a static ES module project with no build step.

## Folder Responsibilities

```text
pwa-reader/
```

Contains the reader shell and browser-side modules.

```text
data/
```

Contains seed JSON data for vocabulary, protected terms, slang, and idioms.

```text
docs/
```

Contains product and engineering documentation.

## Module Responsibilities

### `app.js`

Owns UI state and event wiring:

- EPUB input and drag-and-drop
- active chapter
- active reading mode
- Vocabulary Preview rendering
- vocabulary bubble rendering
- Book Glossary panel rendering

### `epubLoader.js`

Owns EPUB parsing boundaries:

- accepts a browser `File`
- uses epub.js when available
- returns a normalized `Book` shape
- loads chapter HTML on demand

The module should stay focused on loading and normalization. It should not know about vocabulary, translation, or UI rendering.

### `vocabEngine.js`

Owns vocabulary data and matching:

- loads vocabulary seed JSON
- normalizes vocabulary items
- builds chapter vocabulary preview data
- annotates chapter HTML with underlined vocabulary hits

Future ranking logic should live here or behind this module.

### `glossaryEngine.js`

Owns the Book Glossary Builder skeleton:

- extracts rule-based glossary candidates from loaded chapter text
- merges terms already known by the Global Glossary
- classifies candidates with a mock LLM-style classifier
- returns terms with category, confidence, recommended action, reason, and translation warnings

The module is intentionally pure and provider-neutral. A future GPT classifier should plug in as a replacement classifier function without changing EPUB loading or reading mode rendering.

### `readingModes.js`

Owns mode-specific rendering decisions:

- English Study Mode uses original chapter HTML and vocabulary annotation
- Chinese Reading Mode currently returns a placeholder
- Cloze Mixed Mode currently returns a placeholder

This module should coordinate mode rendering without owning EPUB parsing or storage.

### `translationEngine.js`

Owns the future translation boundary:

- protected-term loading
- translation request shape
- placeholder Chinese and Cloze output
- future DeepL or local translation integration

No real translation provider is implemented in this skeleton.

### `storage.js`

Owns browser persistence helpers:

- namespaced localStorage get/set/remove
- future book library and progress persistence

For now it only stores small metadata such as the last selected mode.

## Data Flow

```text
EPUB File
  -> epubLoader
  -> normalized Book + Chapter records
  -> readingModes
  -> vocabEngine for English Study annotation
  -> app.js renders UI
```

Future translation flow:

```text
Chapter originalHtml/plainText
  -> glossaryEngine builds Global + Book + User protected term context
  -> translationEngine request
  -> protected term handling
  -> provider integration
  -> translatedHtml and clozeHtml stored on Chapter
```

## Glossary Layers

Slash Reader uses three glossary layers:

- Global Glossary: general protected-term rules loaded from `data/protected_terms.json`
- Book Glossary: generated in memory from the current EPUB's loaded chapter text
- User Glossary Overrides: future per-user decisions that can force preserve, translate, or ignore

The current skeleton only implements Global Glossary loading and Book Glossary candidate generation. User overrides are documented in the data model but do not have an editing UI yet.

## Why PWA First

Different EPUB readers handle JavaScript, custom bubbles, annotations, and dynamic switching inconsistently. A PWA gives Slash Reader one controlled environment for:

- mode switching
- vocabulary bubbles
- reading progress
- offline storage
- future translation cache

Enhanced EPUB export may still be useful later, but it should not be the primary product foundation.

## Testing Direction

The first tests should target pure logic:

- vocabulary normalization
- vocabulary matching
- protected term preservation helpers
- glossary candidate extraction and classification
- reading mode output decisions

Browser tests can come later for drag-and-drop, bubble positioning, and chapter switching.
