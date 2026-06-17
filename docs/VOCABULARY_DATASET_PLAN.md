# Vocabulary Dataset Plan

## Goal

Build local, app-ready vocabulary datasets for Slash Reader v2's Vocabulary Preview. The dataset should help English novel and fanfiction readers notice useful IELTS words, collocations, idioms, phrasal verbs, slang, and fandom-like phrases without relying on DeepL, GPT, or translation modes.

This is an intake and planning document only. It does not authorize bulk copying from source PDFs.

## Safety Rules

- Do not copy full book pages, full dictionary entries, long definitions, exercises, reading passages, writing samples, or model answers.
- Do not dump extracted PDF text into JSON.
- Use sources to identify candidate terms and categories, then rewrite compact metadata in our own words.
- Keep examples short, minimal, and preferably manually authored or user-curated later.
- Track source provenance with short tags such as `ielts-vocab`, `collocation-ref`, `idiom-phrasal-ref`, or `slang-ref`.
- Store only term-level metadata in `data/vocabulary.json` and `data/slang_idioms.json`.

## Source Inventory And Feasibility

The feasibility pass sampled only the first three pages of each PDF using installed PyMuPDF (`fitz`). No raw extracted text files were generated.

| File | Category | Extractable text | Structure quality | OCR need | Automated extraction suitability |
|---|---|---|---|---|---|
| `English-Collocations-In-Use-Advanced-www.ieltstep.com (IELTSTEP) (z-library.sk, 1lib.sk, z-lib.sk).pdf` | collocation | partial | mixed front matter; likely structured units later | maybe | Medium. Better for page-range candidate extraction after identifying content pages. |
| `Longman Collocations Dictionary and Thesaurus (Michael Mayor) (z-library.sk, 1lib.sk, z-lib.sk).pdf` | dictionary/reference, collocation | yes | dictionary-like | no for sampled pages | High for candidate detection, low for direct import. Needs aggressive reduction and manual review. |
| `Oxford Word Skills Advanced Idioms  Phrasal Verbs Student Book with Key (Ruth Gairns, Stuart Redman) (z-library.sk, 1lib.sk, z-lib.sk).pdf` | idiom, phrasal verb | yes | structured textbook/exercise pages | no for sampled pages | Medium. Good for candidate phrase discovery; avoid exercises and long explanations. |
| `最新雅思阅读真经总纲(第2版)2017.10 (已经ocr) (刘洪波) (z-library.sk, 1lib.sk, z-lib.sk).pdf` | IELTS reading | partial | OCR text, paragraph prose, likely messy | maybe | Low. Use for high-level topic tags, not passage extraction. |
| `牛津现代英语俚语词典=OXFORD DICTIONARY OF MODERN SLANG (（英）埃托（AYTO) (z-library.sk, 1lib.sk, z-lib.sk).pdf` | slang, dictionary/reference | no in sampled pages | likely scanned image | yes | Low until OCR is introduced. Best kept for manual lookup. |
| `跟雅思考官Simon学写作(A类) (西蒙·科克伦(Simon Corcoran)) (z-library.sk, 1lib.sk, z-lib.sk).pdf` | IELTS writing | no in sampled pages | likely scanned/image-heavy | yes | Low. Use for manual topic/usage inspiration only. |
| `雅思词汇真经 (刘洪波) (z-library.sk, 1lib.sk, z-lib.sk).pdf` | IELTS vocabulary | partial | OCR text, likely mixed vocabulary/prose | maybe | Medium-low. Useful for candidate terms after manual page-range targeting. |

## App-Ready Schema

`VocabularyItem` should stay compact and term-centered:

```json
{
  "term": "relentless",
  "type": "ielts",
  "level": "B2-C1",
  "chineseMeaning": "坚持不懈的；无情的",
  "contextMeaning": "describes pressure, pursuit, weather, pain, or effort that does not stop",
  "usageNote": "Common in narration and IELTS writing when describing ongoing problems.",
  "ieltsUsage": "Useful for persistent social, environmental, or personal challenges.",
  "collocations": ["relentless pressure", "relentless pursuit"],
  "exampleSentence": "The relentless rain made the road dangerous.",
  "priority": 80,
  "sourceTag": "seed-curated",
  "sourceCategory": "IELTS vocabulary",
  "copyrightSafeNote": "Short metadata rewritten for app use; no source entry copied."
}
```

Field guidance:

- `term`: lowercase for normal vocabulary and idioms unless casing is meaningful.
- `type`: one of `ielts`, `collocation`, `idiom`, `phrasal_verb`, `slang`, `fandom`, or `reference`.
- `level`: optional CEFR or app-level estimate such as `B1`, `B2`, `C1`, `advanced`, or empty string.
- `chineseMeaning`: short Chinese gloss, not a long dictionary definition.
- `contextMeaning`: reader-facing meaning in the context of fiction/fanfiction.
- `usageNote`: short usage guidance, rewritten.
- `ieltsUsage`: optional note for IELTS writing/reading usefulness.
- `collocations`: short list of common pairings; avoid copying large lists.
- `exampleSentence`: short authored or curated example.
- `priority`: integer ranking for preview ordering; higher means more useful for reader display.
- `sourceTag`: compact provenance tag, not a citation dump.
- `sourceCategory`: broad source group.
- `copyrightSafeNote`: explains why this item is safe to ship.

## Dataset Split

Use `data/vocabulary.json` for:

- IELTS/general vocabulary.
- High-value collocations.
- Academic or narrative words useful in novels.
- Terms with IELTS-specific usage notes.

Use `data/slang_idioms.json` for:

- Idioms.
- Phrasal verbs.
- Informal slang.
- Dialogue-heavy expressions.
- Fandom-like fixed phrases.

Keep `data/protected_terms.json` separate for names, fandom terms, and terms that should be preserved in future translation workflows.

## Conversion Pipeline

Recommended flow:

```text
source_materials/
  -> scripts/sample_pdf_text.py
  -> generated/vocab_candidates/<source-tag>.sample.txt or .jsonl
  -> manual review / cleaning
  -> generated/vocab_candidates/<source-tag>.curated.json
  -> data/vocabulary.json
  -> data/slang_idioms.json
```

Pipeline rules:

- Start with one source and one page range.
- Extract only enough text to identify candidate terms.
- Keep raw extraction under `generated/` or `tmp/`, and gitignore it by default.
- Convert candidates into short, rewritten metadata.
- Deduplicate by normalized term.
- Assign `type`, `sourceTag`, `sourceCategory`, and `priority`.
- Validate final JSON with existing vocabulary tests.
- Add tests only for cleaning/deduplication helpers, not for copyrighted source text.

## Recommended Source Strategy

1. Start with `Longman Collocations Dictionary and Thesaurus` for collocation candidate detection because sampled text is extractable and dictionary-like.
2. Use `Oxford Word Skills Advanced Idioms  Phrasal Verbs` for idiom and phrasal verb candidate lists, but avoid exercises and long notes.
3. Use `雅思词汇真经` for IELTS vocabulary candidates after locating useful page ranges.
4. Treat `English Collocations in Use Advanced` as a manual/targeted supplement.
5. Defer `牛津现代英语俚语词典` and `跟雅思考官Simon学写作` until an OCR strategy exists, or use them only for manual lookup.
6. Do not use IELTS reading passages or writing model answers as source text for app examples.

## Prototype Extraction Result

Prototype script: `scripts/extract_vocab_candidates.py`

Generated review file: `generated/vocab_candidates/longman_candidates.sample.json`

Result:

- Source sampled: `Longman Collocations Dictionary and Thesaurus (Michael Mayor) (z-library.sk, 1lib.sk, z-lib.sk).pdf`
- Page range sampled: pages 6-20 only.
- Candidates found: 22.
- Extraction quality: usable for candidate discovery. The source has an extractable text layer and dictionary-like headword lines.
- Output safety: candidate terms and minimal metadata only; no full entries, definitions, examples, paragraphs, or raw page text were saved.
- Known false positives: OCR/text-layer artifacts can lose leading letters or include damaged headwords, for example `bysmal` likely from `abysmal`.
- Further processing value: yes. Longman is worth another iteration with better headword cleanup, page-range controls, and human review.

Recommended next step: improve Longman extraction heuristics before expanding page ranges. Focus on OCR artifact filters, source page metadata, and candidate review ergonomics rather than importing anything directly into app data.

## Dataset Quality Report

Quality script: `scripts/check_vocabulary_dataset.py`

Generated report: `generated/reports/vocabulary_quality_report.md`

The checker reads `data/vocabulary.json` and `data/slang_idioms.json`, then reports item counts, type/source distribution, priority distribution, missing fields, duplicate terms, possible case duplicates, long fields, invalid types, invalid priorities, and obvious category warnings. It exits nonzero only for serious schema-breaking errors.

Run it from the project root:

```powershell
python scripts\check_vocabulary_dataset.py
```

## Next Expansion Strategy

1. Keep the local curated seed as the first reliable layer. It should remain compact, human-reviewed, and app-ready.
2. Add external open datasets later through `external_data/` or `data/external/`, not directly into the PWA runtime.
3. Use build scripts to compile external data into a small Slash Reader subset with the existing schema.
4. Treat ECDICT as a future offline enrichment candidate for Chinese meanings and short English definitions, but do not download or load the full dictionary in the PWA.
5. Use CEFR/frequency sources later for ranking and filtering, especially to avoid over-highlighting A1/A2 words.
6. Add AI ranking or context generation only after local deterministic data is working; AI should suggest/rewrite candidates, not control the Preview directly.
7. Require human review for high-value candidates before they become shipped app data.

## Next Step

Create a small read-only extraction prototype for one extractable source. It should produce at most a tiny candidate preview under `generated/vocab_candidates/`, then stop for manual review before anything is added to `data/`.
