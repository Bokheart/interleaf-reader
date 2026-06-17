# Data Model

This document defines the intended stable data model for Slash Reader v2. The current skeleton uses only part of this model, but future work should keep these shapes in mind.

## Book

Represents one imported EPUB.

```json
{
  "id": "book-unique-id",
  "title": "Example Book",
  "author": "Example Author",
  "chapters": []
}
```

Fields:

- `id`: stable local identifier for this imported book
- `title`: book title from EPUB metadata when available
- `author`: author/creator from EPUB metadata when available
- `chapters`: ordered list of `Chapter` records

## Chapter

Represents one readable chapter or spine item.

```json
{
  "id": "chapter-1",
  "title": "Chapter 1",
  "order": 1,
  "originalHtml": "<p>Original English...</p>",
  "plainText": "Original English...",
  "translatedHtml": null,
  "clozeHtml": null,
  "vocabularyPreview": []
}
```

Fields:

- `id`: stable chapter identifier inside the book
- `title`: chapter title from EPUB navigation when available
- `order`: numeric reading order
- `originalHtml`: original English HTML from the EPUB
- `plainText`: text-only version used for vocabulary matching and future translation requests
- `translatedHtml`: Chinese Reading Mode HTML, initially `null`
- `clozeHtml`: Cloze Mixed Mode HTML, initially `null`
- `vocabularyPreview`: chapter-level list of `VocabularyItem` records or matched vocabulary references

## VocabularyItem

Represents one word, phrase, idiom, slang item, or fandom term that can appear in a chapter.

```json
{
  "term": "relentless",
  "type": "ielts",
  "chineseMeaning": "坚持不懈的；无情的",
  "contextMeaning": "在当前语境中表示持续不断、不给人喘息的",
  "usageNote": "Often describes pressure, weather, pursuit, or effort.",
  "ieltsUsage": "Useful for Task 2 writing when describing persistent problems or effort.",
  "exampleSentence": "The relentless rain made the road dangerous.",
  "sourceSentence": "The relentless rain kept falling over the highway."
}
```

Fields:

- `term`: surface form to match in text
- `type`: category such as `ielts`, `slang`, `idiom`, `fandom`, or `protected`
- `chineseMeaning`: general Chinese meaning
- `contextMeaning`: meaning in this chapter or sentence
- `usageNote`: short explanation for readers
- `ieltsUsage`: IELTS relevance when applicable, otherwise empty string
- `exampleSentence`: general example sentence
- `sourceSentence`: sentence from the imported chapter when available

## ProtectedTerm

Represents a term that should usually stay unchanged during translation.

```json
{
  "term": "Impala",
  "category": "object",
  "preserveInTranslation": true
}
```

Fields:

- `term`: exact term or phrase to preserve
- `category`: category such as `character`, `object`, `fandom`, or `phrase`
- `preserveInTranslation`: whether translation providers should keep the term as written

## BookGlossaryTerm

Represents one automatically detected term for the current imported EPUB.

```json
{
  "term": "Impala",
  "category": "object",
  "source": "global-glossary+rule:capitalized-word",
  "confidence": 0.95,
  "recommendedAction": "preserve",
  "reason": "Matches the Global Glossary protected terms list.",
  "badTranslationWarnings": [
    "May be mistranslated as an animal instead of a vehicle or protected story term."
  ]
}
```

Fields:

- `term`: surface form detected in the book
- `category`: classifier category such as `character`, `object`, `organization`, `named_entity`, or `fandom_phrase`
- `source`: extraction source such as `global-glossary`, `rule:capitalized-word`, `rule:capitalized-phrase`, `rule:all-caps`, or `rule:fandom-phrase`
- `confidence`: score from 0 to 1 for the classifier recommendation
- `recommendedAction`: `preserve`, `review`, `translate`, or `ignore`
- `reason`: short explanation for the recommendation
- `badTranslationWarnings`: warnings that future translation systems should consider

## UserGlossaryOverride

Represents a future user decision that overrides Global or Book Glossary recommendations.

```json
{
  "term": "Muggle",
  "action": "preserve",
  "category": "fandom",
  "note": "Keep the fandom term in English.",
  "scope": "book"
}
```

Fields:

- `term`: term the user is overriding
- `action`: `preserve`, `translate`, or `ignore`
- `category`: optional user-selected category
- `note`: optional user note explaining the choice
- `scope`: `book` for current EPUB only, or `global` for future reusable user settings

## Glossary Layer Order

Future translation preparation should merge glossary layers in this order:

1. Global Glossary from `data/protected_terms.json`
2. Book Glossary generated from the imported EPUB
3. User Glossary Overrides, which take priority over automatic recommendations

## Notes

- `translatedHtml` and `clozeHtml` should be cached per chapter after generation.
- `sourceSentence` can be generated during vocabulary matching and does not have to exist in seed data.
- Protected terms may also appear in vocabulary previews if they need reader explanation.
- Book Glossary terms are stored in memory for now and can be rebuilt from loaded chapter text.
- User Glossary Overrides are a future feature and do not have an editing UI yet.
- IDs should be stable enough for local persistence, but they do not need to be globally unique across all users.
