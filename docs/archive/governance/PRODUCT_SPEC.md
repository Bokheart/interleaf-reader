# Product Spec

## Product Vision

Slash Reader is an immersive EPUB learning reader for non-native English readers, especially users who want to read English novels or fanfiction without constantly leaving the story to look up words.

The primary product is a web/PWA reading environment. Slash Reader should control rendering, mode switching, vocabulary bubbles, and learning interactions inside its own app rather than relying on third-party EPUB readers.

## Target Users

- Non-native English readers who enjoy novels, web fiction, or fanfiction
- Learners who want vocabulary support without breaking reading flow
- Readers who may want to understand the plot in Chinese before returning to English

## Core User Flow

1. The user drags or imports an English EPUB file into the app.
2. The app parses the EPUB into chapters.
3. The app prepares three reading modes for each chapter.
4. The user switches between modes while reading.
5. In English Study Mode, the user taps underlined vocabulary items for contextual help.

## Reading Modes

### Mode A: English Study Mode

English Study Mode preserves the original English chapter and adds learning support.

It should include:

- A Vocabulary Preview at the beginning of each chapter
- IELTS-level words, slang, idioms, and special fandom terms
- Underlined vocabulary matches inside the English text
- Tap/click bubbles with:
  - Chinese meaning in this context
  - usage note
  - IELTS usage if relevant
  - source sentence if available

This is the first real implementation target.

### Mode B: Chinese Reading Mode

Chinese Reading Mode generates a Chinese translation of the chapter so the user can understand the plot before switching back to English.

It should preserve protected terms such as character names, fandom terms, and special objects. Examples include Sam, Dean, Impala, hunter, and salt and burn.

### Mode C: Cloze Mixed Mode

Cloze Mixed Mode generates a mixed Chinese-English version.

Most text is Chinese, while important IELTS words, slang, idioms, and fandom terms remain in English. The goal is vocabulary memorization inside an understandable Chinese context.

## Product Decisions

- The main app should be a PWA reader.
- Enhanced EPUB export is a future optional feature.
- An AO3 browser extension is a future import helper, not the primary product.
- The v2 skeleton should favor clear data shapes and testable modules over feature completeness.

## Current Scope

This skeleton creates the maintainable foundation only:

- Static reader UI
- EPUB import surface
- Chapter rendering placeholder
- Mode selector
- Vocabulary Preview placeholder
- Bubble placeholder
- Clear module boundaries
- Seed JSON files
- Documentation

## Explicit Non-Goals For This Step

- No DeepL integration
- No AI vocabulary ranking
- No AO3 browser extension
- No enhanced EPUB export
- No full translation pipeline
- No production EPUB storage or library management
