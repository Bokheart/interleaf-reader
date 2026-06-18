# Book Project Data Model Proposal

## Purpose and Scope

This document proposes a future conceptual data model for multilingual Book Projects in Interleaf Reader.

It is product and architecture guidance only. It does not implement storage, change IndexedDB, add translation behavior, or change the current English Study Mode reading loop.

The proposal builds on `docs/MULTILINGUAL_BOOK_PROJECT_STRATEGY.md`:

- a **Book Project** is the future container for a source book and related language versions
- translation versions may be user-provided, AI-generated, edited AI output, or imported with unknown provenance
- future Mixed Mode must distinguish Generated Mixed from Paired-version Mixed
- alignment should begin at chapter level before paragraph, sentence, or word alignment
- all architecture remains local-first unless a separate sync or cloud decision is made later

Internal compatibility names, storage keys, debug globals, `cloze-mixed`, and `clozeHtml` should remain unchanged unless a future migration is explicitly scoped and tested.

## Current Records and Future Book Projects

Today, Interleaf Reader treats a locally imported EPUB as the practical reading unit. That single-book record supports English Study Mode, chapter navigation, local persistence, scroll progress, vocabulary preview, and the local library.

Future multilingual architecture should not discard that model. Instead, the current imported book can become the first version inside a Book Project.

| Current concept | Future concept | Notes |
|---|---|---|
| Imported EPUB book | `BookProject` with one `SourceVersion` | Existing local books can be wrapped without changing user-facing behavior at first. |
| EPUB metadata | `BookVersion` metadata | Title, author, language, file details, and import details belong to the version. |
| Chapter list/spine | `SourceVersion` chapter structure | Chapter identifiers become the first alignment anchors. |
| Saved progress | `UserProgress` scoped to project and version | Existing progress can remain version-specific before paired progress is introduced. |
| Mixed Mode placeholder | Future `GeneratedMixedArtifact` or paired rendering | Placeholder status must remain clear until real multilingual behavior exists. |

The migration path should be additive: existing local book records should continue to work, and future Book Projects should wrap or reference them before any deeper migration is considered.

## Conceptual Entity Overview

| Entity | Purpose | Relationship |
|---|---|---|
| `BookProject` | Top-level local container for one reading work and its versions | Owns versions, alignment maps, mixed artifacts, and progress references |
| `BookVersion` | Shared base concept for a source or translation version | Belongs to one `BookProject` |
| `SourceVersion` | Original/source text version used as the primary reference | Specialized `BookVersion` |
| `TranslationVersion` | Translated version attached to the source project | Specialized `BookVersion` |
| `AlignmentMap` | Links source and translation units | Belongs to a project and references two versions |
| `GeneratedMixedArtifact` | Derived mixed-language reading artifact | References source, optional translation, and alignment inputs |
| `UserProgress` | Reader state within a project/version/view | References project and usually a specific version |

These are conceptual entities, not code classes and not committed table names.

## BookProject

`BookProject` represents the future multilingual container for one work.

| Field | Purpose |
|---|---|
| `project_id` | Stable local identifier for the Book Project |
| `title` | User-facing project title, usually from the source book |
| `authors` | Author list inherited from source metadata or user edits |
| `primary_language` | Language of the source version |
| `target_languages` | Languages represented by attached translation versions |
| `source_version_id` | Reference to the primary `SourceVersion` |
| `version_ids` | References to all versions in the project |
| `alignment_map_ids` | References to available alignment maps |
| `mixed_artifact_ids` | References to generated Mixed artifacts, if any |
| `created_at` | Local creation timestamp |
| `updated_at` | Local update timestamp |
| `project_state` | Broad state such as active, archived, or needs_review |
| `local_only` | Explicit marker that the project is local-first unless future sync is decided |
| `migration_source` | Optional pointer to the prior single-book record source |

## BookVersion

`BookVersion` is the shared base shape for source and translation versions.

| Field | Purpose |
|---|---|
| `version_id` | Stable local identifier for the version |
| `project_id` | Owning Book Project |
| `version_role` | `source` or `translation` |
| `title` | Version-specific title |
| `subtitle` | Optional version-specific subtitle |
| `authors` | Version-specific authors or translators when known |
| `language` | BCP 47-style language tag or future equivalent |
| `format` | Import/source format such as epub, html, text, generated_text, or unknown |
| `source_uri_kind` | Local file, pasted text, generated output, or imported record reference |
| `content_fingerprint` | Optional local fingerprint for duplicate detection and version matching |
| `chapter_count` | Number of detected chapters or spine items |
| `chapter_index` | Conceptual list of chapter ids, labels, and order |
| `version_state` | Current completeness/alignment/review state |
| `created_at` | Local creation timestamp |
| `updated_at` | Local update timestamp |
| `notes` | User or system notes about this version |

## SourceVersion

`SourceVersion` is the primary reference text for a Book Project. For current Interleaf Reader behavior, this is usually the imported English EPUB.

| Field | Purpose |
|---|---|
| `source_version_id` | Same identifier as the underlying `BookVersion` |
| `original_import_id` | Optional reference to an existing local book record |
| `is_primary_source` | Marks the canonical source version for alignment |
| `source_language` | Language of the source text |
| `epub_metadata` | Conceptual home for existing EPUB metadata |
| `spine_items` | Source chapter/spine structure used for chapter-first alignment |
| `reading_mode_defaults` | Default reader behavior for this version |
| `vocabulary_profile_scope` | Indicates how current vocabulary behavior relates to the version |

## TranslationVersion

`TranslationVersion` is a translated version attached to a Book Project.

| Field | Purpose |
|---|---|
| `translation_version_id` | Same identifier as the underlying `BookVersion` |
| `source_version_id` | Source version this translation is intended to match |
| `target_language` | Translation language |
| `provenance` | `user_provided`, `ai_generated`, `edited_ai_generated`, or `unknown/imported` |
| `translator_label` | Optional user-visible translator/source label |
| `provider_label` | Optional AI or external provider label, if applicable |
| `provider_model` | Optional model or engine label for generated output |
| `generated_at` | Timestamp for AI-generated translation, if known |
| `edited_at` | Timestamp for user edits after generation/import |
| `rights_note` | Optional user-entered note about allowed local use |
| `quality_note` | Optional note such as rough, machine, edited, published, or unknown |
| `version_state` | Completeness/alignment/review state |

### Translation Provenance

| Provenance | Meaning |
|---|---|
| `user_provided` | The user imported or pasted a translation they are allowed to use locally. |
| `ai_generated` | The app or a connected future provider generated the translation. |
| `edited_ai_generated` | AI-generated output was later edited by the user or another tool. |
| `unknown/imported` | The translation was imported but its origin is not known or not recorded. |

Provenance should be visible enough that the app can avoid treating generated output, user-owned content, and unknown imports as the same thing.

## Version States

Version state describes practical readiness. Multiple states may eventually be represented as a list or separate status dimensions, but the conceptual vocabulary should include:

| State | Meaning |
|---|---|
| `complete` | The version appears to cover the full book. |
| `partial` | The version covers only part of the book. |
| `rough` | The version is usable for orientation but not polished. |
| `aligned_chapter` | The version has chapter-level alignment to the source. |
| `aligned_deeper` | The version has paragraph, sentence, word, or other deeper alignment. |
| `needs_review` | The version or its alignment needs user or system review. |

These states should not imply that Mixed Mode or translation providers are implemented.

## AlignmentMap

`AlignmentMap` links units between two versions. The first supported alignment model should be chapter-first.

| Field | Purpose |
|---|---|
| `alignment_map_id` | Stable local identifier |
| `project_id` | Owning Book Project |
| `source_version_id` | Source version being aligned from |
| `target_version_id` | Translation or other target version |
| `alignment_level` | chapter, paragraph, sentence, word, or mixed |
| `alignment_state` | draft, aligned_chapter, aligned_deeper, needs_review |
| `source_unit_kind` | chapter, spine_item, paragraph, sentence, token |
| `target_unit_kind` | chapter, spine_item, paragraph, sentence, token |
| `unit_pairs` | Conceptual list of source unit ids mapped to target unit ids |
| `confidence` | Optional system confidence for generated alignment |
| `created_by` | user, system, provider, or unknown |
| `created_at` | Local creation timestamp |
| `updated_at` | Local update timestamp |
| `review_notes` | Notes for mismatches, gaps, or manual repair |

## Chapter-First Alignment Model

Chapter alignment should be the first alignment layer because current EPUB imports already expose chapter or spine structure. It gives future multilingual work a stable base without pretending paragraph, sentence, or word matching is solved.

At chapter level, an alignment map needs to handle:

- one source chapter to one translation chapter
- one source chapter to multiple translation chapters
- multiple source chapters to one translation chapter
- missing, extra, prologue, epilogue, appendix, or translator-note chapters
- chapters that need user review before deeper alignment

Only after chapter alignment is reliable should future work attempt paragraph, sentence, or word alignment. Deeper alignment should be treated as optional and reviewable, not as a requirement for attaching a translation version.

## GeneratedMixedArtifact

`GeneratedMixedArtifact` represents future derived Mixed Mode content. It should not be confused with the source text or canonical translation.

| Field | Purpose |
|---|---|
| `mixed_artifact_id` | Stable local identifier |
| `project_id` | Owning Book Project |
| `artifact_kind` | `generated_mixed` or `paired_version_mixed` |
| `source_version_id` | Source version used for the artifact |
| `translation_version_id` | Optional translation version used for paired-version Mixed |
| `alignment_map_id` | Optional alignment map used to create the artifact |
| `generation_inputs` | Conceptual record of inputs, not provider secrets |
| `language_mix_policy` | Future display policy such as selected spans, sentence-level, or vocabulary-aware |
| `artifact_state` | draft, ready, stale, needs_review |
| `created_at` | Local creation timestamp |
| `updated_at` | Local update timestamp |

Generated Mixed starts from source text plus generated translations. Paired-version Mixed uses two existing versions attached to the same Book Project. Keeping `artifact_kind` explicit prevents future UI and storage from blending these paths together.

## UserProgress

`UserProgress` stores reading state in a way that can remain compatible with today while allowing future project-aware reading.

| Field | Purpose |
|---|---|
| `progress_id` | Stable local identifier |
| `project_id` | Book Project being read |
| `version_id` | Version being read, when progress is version-specific |
| `view_kind` | English Study, source, translation, generated_mixed, paired_version_mixed, or future view |
| `chapter_id` | Current chapter/spine item |
| `position` | Scroll, CFI, percentage, or future location marker |
| `updated_at` | Local update timestamp |
| `reader_preferences_snapshot` | Optional mode/display settings relevant to restoring reading |
| `vocabulary_state_reference` | Optional reference to current vocabulary profile behavior |

Initial migration should preserve existing progress behavior. Project-level or paired-version progress should come later only when the reader experience requires it.

## Future Migration Path

A conservative migration path should be additive and reversible where possible.

1. Treat each existing local imported EPUB as a single-version Book Project.
2. Create a `BookProject` wrapper with one `SourceVersion` that references the existing local book record.
3. Preserve current reading behavior, progress, vocabulary, and internal compatibility names.
4. Add translation versions only through a future explicit workflow.
5. Add chapter-level `AlignmentMap` records after translation versions exist.
6. Add deeper alignment, Mixed artifacts, and project-aware progress only after separate milestones define behavior and tests.

No current storage key, IndexedDB database name, debug global, `cloze-mixed`, or `clozeHtml` name should be renamed as part of this proposal.

## Non-Goals

This proposal does not include:

- storage implementation
- IndexedDB migration
- provider integration
- translation generation
- Mixed Mode rendering
- cloud sync or account behavior
- API key storage
- app UI changes
- test changes
- broad PRD restructuring

## Open Decisions and Risks

| Topic | Decision or risk |
|---|---|
| Storage shape | Future work must decide whether Book Projects wrap current records or introduce new object stores. |
| Migration safety | Existing local libraries and progress must not be reset by a future migration. |
| Version identity | Matching translations to source books may be unreliable when metadata is incomplete. |
| Rights and privacy | User-provided translations may be private or copyrighted; the app should remain local-first unless cloud behavior is separately approved. |
| Provenance trust | Imported provenance may be user-entered and cannot always be verified. |
| AI provider data flow | Any remote generation would require privacy, credential, quota, and provider-boundary decisions. |
| Alignment quality | Chapter alignment can still fail with abridged, reordered, or differently structured editions. |
| Deeper alignment cost | Paragraph, sentence, and word alignment may require language-specific segmentation and review tooling. |
| Mixed artifact staleness | Generated artifacts may become stale when a source, translation, or alignment map changes. |
| UI complexity | Add translation, alignment review, and Mixed artifacts must not overwhelm the reading-first product. |

