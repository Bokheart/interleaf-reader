# M1 Stabilization Report

**Date:** 2026-06-16  
**Product:** Interleaf Reader  
**Scope:** Focused MVP smoke test for English Study Mode, EPUB import, Local Library, Vocabulary Preview/Library, local persistence, and view diagnostics.

---

## 1. Summary

M1 stabilization smoke testing completed with no blocking application bugs found.

Automated checks passed after using the bundled runtimes. Browser smoke testing passed against a temporary, copyright-safe two-chapter EPUB generated outside the project datasets because no `.epub` fixture was present in the workspace. The temporary EPUB was imported, saved, restored, opened from Local Library, and forgotten through the in-app modal. Vocabulary Library test terms were removed after verification.

Follow-up completed on 2026-06-16: a repeatable copyright-safe smoke fixture workflow now exists. Run `python scripts\generate_smoke_epub.py` to generate `tests\fixtures\interleaf_smoke.epub`, or use the bundled Python runtime if plain `python` resolves incorrectly. The generated EPUB contains self-authored test text only.

Chinese Reading Mode and Mixed Mode remain clear placeholders. Translation providers remain unimplemented.

---

## 2. Commands run

### JavaScript syntax check

```powershell
$node='C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
Get-ChildItem -Path 'D:\BookHeart\slash reader\slash-reader-v2\pwa-reader' -Filter '*.js' | ForEach-Object { & $node --check $_.FullName }
```

### Node tests

```powershell
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\BookHeart\slash reader\slash-reader-v2\tests\levelBaselineEngine.test.mjs'
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\BookHeart\slash reader\slash-reader-v2\tests\navigationEngine.test.mjs'
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\BookHeart\slash reader\slash-reader-v2\tests\vocabEngine.test.mjs'
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\BookHeart\slash reader\slash-reader-v2\tests\glossaryEngine.test.mjs'
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\BookHeart\slash reader\slash-reader-v2\tests\storage.test.mjs'
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\BookHeart\slash reader\slash-reader-v2\tests\homeState.test.mjs'
```

### Vocabulary dataset check

```powershell
python scripts\check_vocabulary_dataset.py
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\check_vocabulary_dataset.py
```

The plain/sandboxed run hit a local permission issue while writing `generated/reports/vocabulary_quality_report.md`. The bundled Python run was repeated with approval outside the sandbox and passed.

### Browser smoke server

```powershell
& 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 5173 --bind 127.0.0.1
```

Opened:

```text
http://127.0.0.1:5173/pwa-reader/
```

`localhost` returned an empty response in this environment, while `127.0.0.1` worked.

---

## 3. Test results

| Check | Result | Notes |
|---|---|---|
| JS syntax check for `pwa-reader/*.js` | Pass | No syntax errors reported |
| `levelBaselineEngine.test.mjs` | Pass | `levelBaselineEngine tests passed` |
| `navigationEngine.test.mjs` | Pass | `navigationEngine tests passed` |
| `vocabEngine.test.mjs` | Pass | `vocabEngine tests passed` |
| `glossaryEngine.test.mjs` | Pass | `glossaryEngine tests passed` |
| `storage.test.mjs` | Pass | `storage tests passed` |
| `homeState.test.mjs` | Pass | `homeState tests passed` |
| Vocabulary dataset check | Pass | 112 items, 0 errors, 0 warnings |

---

## 4. Manual browser checklist results

| Checklist item | Result | Notes |
|---|---|---|
| Hard refresh app | Pass | Home loaded from static server |
| Confirm visible product name is Interleaf Reader | Pass | Browser title and Home branding show Interleaf Reader |
| Confirm Home loads | Pass | Import, Vocabulary Library, and Local Library sections rendered |
| Import EPUB | Pass | Original pass used a temporary original smoke EPUB; follow-up now provides `tests/fixtures/interleaf_smoke.epub` |
| Confirm diagnostics do not show blocking error | Pass | Runtime diagnostics available and healthy |
| Confirm Reader opens | Pass | Active view became `reader` |
| Confirm English Study Mode renders chapter text | Pass | Temporary EPUB chapter text rendered |
| Confirm chapter navigation works | Pass | Next, Previous, and chapter list selection worked |
| Confirm tap/mobile overlay does not block navigation | Pass | Overlay showed/hid on mobile viewport and controls were present; desktop navigation remained clickable |
| Confirm Vocabulary Preview appears | Pass | Preview rendered chapter terms |
| Confirm vocabulary bubble opens and closes | Pass | Chapter `[data-vocab-term]` triggers opened and closed bubble |
| Confirm Known / Save / Hide actions work | Pass | Save showed saved state; Known and Hide removed terms from Preview |
| Confirm Vocabulary Library opens | Pass | Independent Vocabulary Library view opened from Home |
| Confirm manual Add to Learning works | Pass | Temporary manual term appeared and was removed after test |
| Confirm Copy Learning / Copy All / CSV export works | Pass | Copy tested with page-local clipboard mock; CSV download filename was `interleaf-reader-vocabulary.csv` |
| Confirm Local Library lists saved book | Pass | Smoke EPUB appeared after import |
| Confirm Open restores saved book | Pass | Local Library Open restored Reader |
| Confirm Forget modal works | Pass | In-app modal appeared and removed saved copy; in-memory Resume remained, as expected |
| Confirm refresh restores book and approximate progress | Pass | Refresh showed Continue Reading; restored the saved EPUB/chapter. Scroll precision was not meaningful with the tiny smoke EPUB |
| Confirm Chinese Reading Mode placeholder | Pass | Placeholder text shown |
| Confirm Mixed Mode placeholder | Pass | Placeholder text shown |
| Confirm switching back to English Study works | Pass | English chapter content restored |
| Confirm no saved progress/storage reset happened | Pass | Saved book/profile paths behaved normally; test artifacts were cleaned up |

### Diagnostics snapshots

Home:

- `activeView`: `home`
- Home visible; Reader and Vocabulary Library hidden
- `bindEventsCompleted`: `true`
- Reader Previous/Next controls found: 3 each
- Chapter list found: `true`

Reader:

- `activeView`: `reader`
- Reader visible; Home and Vocabulary Library hidden
- Previous/Next controls found: 3 each
- Chapter list found: `true`
- `bindEventsCompleted`: `true`

Vocabulary Library:

- `activeView`: `vocabulary-library`
- Vocabulary Library visible; Home and Reader hidden
- Vocabulary tabs found: 3
- `bindEventsCompleted`: `true`

---

## 5. Bugs found

No blocking MVP bugs were found.

Lower-priority cleanup findings:

1. **Resolved follow-up: repeatable smoke EPUB fixture now exists.** Use `scripts\generate_smoke_epub.py` to create `tests\fixtures\interleaf_smoke.epub`.
2. **`localhost` server access was unreliable in this environment.** `http://localhost:5173/pwa-reader/` returned an empty response, while `http://127.0.0.1:5173/pwa-reader/` worked.
3. **Vocabulary dataset check needed elevated write access in this sandbox.** The script passed, but writing `generated/reports/vocabulary_quality_report.md` failed inside the restricted sandbox.
4. **The Browser node_repl bootstrap failed in this Windows sandbox.** Playwright browser tooling worked and completed the smoke pass.

---

## 6. Tiny fixes applied

None. This pass did not modify application code, app behavior, HTML, CSS, JavaScript, or datasets.

Temporary verification artifacts:

- A temporary EPUB was created in the OS temp directory and removed after testing.
- Temporary server logs were removed after testing.
- The temporary saved EPUB was removed through the app's Forget modal.
- Temporary vocabulary profile terms were removed through the Vocabulary Library UI.

---

## 7. Unfixed issues / recommended next tasks

1. Document `127.0.0.1` as the fallback local URL when `localhost` behaves oddly in Windows/sandboxed browser contexts.
2. Keep optional modules lazy-loaded/fail-open; diagnostics confirmed this remains important for startup and Reader navigation.
3. Continue M0 open-source release readiness: privacy, license, contributing, issue templates, and deployment policy.

---

## 8. Release readiness assessment

M1 MVP paths are stable enough for continued polish. The English Study Mode vertical slice, local persistence, Local Library, Vocabulary Preview, Vocabulary Library, export, placeholders, and diagnostics all passed this smoke test.

Interleaf Reader is not public-release ready yet. M0/M3 release-readiness items remain open: LICENSE, PRIVACY, CONTRIBUTING, issue templates, manifest/service worker, GitHub Pages/static hosting decisions, CDN/vendor decisions, and source-material policy.
