# Interleaf Reader — Engineering Handoff

## 1. Purpose

This document contains operational information for running, testing, smoke-checking, and troubleshooting Interleaf Reader.

It owns:

* local startup;
* runtime assumptions;
* test commands;
* smoke fixture generation;
* browser verification procedures;
* deployment verification entry points;
* operational caveats.

It does not define product scope, milestone priority, implementation status, architecture, or AI policy.

Use:

| Document | Responsibility |
| --- | --- |
| `docs/INTERLEAF_READER_PRD.md` | Product truth |
| `docs/PROJECT_STATE.md` | Current implementation and verification truth |
| `docs/MILESTONES.md` | Milestone scope and order |
| `docs/DECISION_LOG.md` | Durable decisions |
| `docs/ARCHITECTURE.md` | Current architecture |
| `docs/DATA_MODEL.md` | Persisted-data contracts |
| `AGENTS.md` | AI-assisted repository rules |

The former AI workflow protocol is superseded.

---

## 2. Runtime Assumptions

The standard local environment requires:

* Windows-compatible shell such as PowerShell;
* Python available as `python` or `py`;
* Node.js available as `node`;
* a modern browser with ES modules, IndexedDB, localStorage, and download support;
* a static HTTP server started from the repository root;
* network access when CDN-hosted JSZip or epub.js must load.

The current application has:

* no frontend build step;
* no mandatory backend;
* no account server.

Do not place personal usernames or machine-specific absolute paths in canonical documentation.

Opening `pwa-reader/index.html` through `file://` is not supported.

---

## 3. Run Locally

From the repository root:

```powershell
python -m http.server 8000
```

Alternative launcher:

```powershell
py -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/pwa-reader/
```

The port may be changed.

Always serve from the repository root because the application loads shared resources from directories such as `data/`.

Use one hostname consistently.

These are different browser origins:

```text
http://localhost:8000/
http://127.0.0.1:8000/
```

They have separate IndexedDB and localStorage data.

---

## 4. Fresh-Load Troubleshooting

When the interface appears stale, incomplete, or unresponsive:

1. Stop duplicate local HTTP servers.
2. Confirm the server started from the repository root.
3. Open the intended origin.
4. Hard-refresh with `Ctrl+F5`.
5. Open DevTools and enable **Disable cache**.
6. Try a cache-busting URL:

```text
http://127.0.0.1:8000/pwa-reader/?v=manual-test
```

7. Check Console for:
   * syntax errors;
   * local module import failures;
   * circular-dependency errors;
   * missing CDN globals;
   * initialization exceptions.
8. Check Network for:
   * HTTP 200 on application modules;
   * successful `data/` JSON requests;
   * JSZip and epub.js availability;
   * usable JavaScript MIME types.
9. Confirm the expected browser origin.
10. Confirm module evaluation completed before debugging individual controls.

If `app.js` or one of its static imports fails, event binding and startup logic may never run.

---

## 5. Automated Checks

Run from the repository root.

### JavaScript syntax

```powershell
Get-ChildItem pwa-reader -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

Single-file example:

```powershell
node --check pwa-reader/app.js
```

Syntax checks confirm parsing only.

### Current Node tests

```powershell
$tests = @(
  "tests/vocabEngine.test.mjs",
  "tests/glossaryEngine.test.mjs",
  "tests/navigationEngine.test.mjs",
  "tests/storage.test.mjs",
  "tests/homeState.test.mjs",
  "tests/readingModes.test.mjs",
  "tests/levelBaselineEngine.test.mjs"
)

foreach ($test in $tests) {
  node $test
  if ($LASTEXITCODE -ne 0) {
    throw "Test failed: $test"
  }
}
```

The suites may also be run individually with `node`.

Pure-module tests do not replace browser integration checks.

### Vocabulary dataset validation

Run only when vocabulary data or dataset logic changes:

```powershell
python scripts/check_vocabulary_dataset.py
```

Alternative:

```powershell
py scripts/check_vocabulary_dataset.py
```

The checker may write generated output.

Do not run it for unrelated documentation work.

### Git whitespace check

```powershell
git diff --check
```

On Windows, LF-to-CRLF warnings may appear without indicating a whitespace error.

Do not ignore actual `trailing whitespace` or conflict-marker failures.

---

## 6. Copyright-Safe Smoke Fixture

Generate:

```powershell
python scripts/generate_smoke_epub.py
```

Alternative:

```powershell
py scripts/generate_smoke_epub.py
```

Expected output:

```text
tests/fixtures/interleaf_smoke.epub
```

Use this fixture instead of private EPUBs, paid books, fanfiction exports, copyrighted samples, or personal reading files.

---

## 7. Core Browser Smoke

This is a procedure, not an automatic claim that the current branch passed.

### Startup and Home

1. Start the server from repository root.
2. Open the canonical local origin.
3. Confirm no startup-blocking Console error.
4. Confirm Home is visible.
5. Confirm the Guide entry does not block startup.

### EPUB import and Reader

6. Import `tests/fixtures/interleaf_smoke.epub`.
7. Confirm Reader opens.
8. Confirm chapter content renders.
9. Use Contents to open another chapter.
10. Test Previous and Next.
11. Open Progress and test its chapter controls.
12. Return to the chapter without losing selected-book state.

### Vocabulary

13. Confirm Vocabulary Preview where fixture terms match.
14. Open an interactive term.
15. Confirm the bubble opens.
16. Confirm supported close behavior.
17. Test Known, Save, and Hide as relevant.
18. Open Vocabulary Library.
19. Manually add a safe test term.
20. Confirm it persists in the expected collection.
21. Test the export action affected by the task.
22. Confirm output or download completes without a blocking error.

### Guide, Settings, and language

23. Open the built-in Guide.
24. Confirm Reader routing and Guide navigation.
25. Hide and restore the Guide when relevant.
26. Open Settings and Help.
27. Change Interface Language when relevant.
28. Confirm imported book title, author, chapters, and body content remain unchanged.
29. Confirm Interface Language does not change Reading Mode.

### Persistence and Local Library

30. Return Home.
31. Confirm the book appears in Local Library.
32. Refresh.
33. Confirm expected book and progress restoration.
34. Open Forget Book.
35. Confirm cancel.
36. Confirm destructive action only when using disposable smoke data.

### Vocabulary backup and restore

37. Export a vocabulary-profile backup.
38. Inspect filename and payload shape when relevant.
39. Restore a valid disposable profile.
40. Confirm supported fields are replaced.
41. Test malformed restore and confirm no mutation.

### Mode honesty

42. Open Chinese Reading Mode for the imported smoke book.
43. Confirm explicit placeholder behavior.
44. Open Mixed Mode.
45. Confirm explicit placeholder behavior.
46. Confirm neither claims provider output.

### Mobile

47. Repeat the affected flow at an appropriate mobile viewport.
48. Check for horizontal overflow, inaccessible controls, and popup placement.

### Completion

49. Review Console.
50. Record skipped steps as unverified, not passed.

---

## 8. Targeted Verification

Use the smallest set that covers the changed risk.

| Change | Minimum verification |
| --- | --- |
| Reader UI or navigation | Affected Reader browser flow |
| Storage or backup | Storage tests plus browser save, refresh, restore, malformed-input, and failure checks |
| Vocabulary logic | Relevant pure tests; browser Preview or Library when integration changes |
| Localization | Every affected language and surface |
| Mobile UI | Appropriate mobile viewport |
| Guide | Open, navigation, hide/restore, mode separation |
| PWA or deployment | Official URL, assets, manifest, update behavior, offline boundary |
| Documentation only | No full application test unless executable claims or commands changed |

For broad cross-module changes, run all current syntax and Node tests before browser smoke.

---

## 9. Diagnostics

A development helper may be available:

```js
window.__slashReaderDebug.getDiagnostics()
```

It may expose information about:

* active app view;
* visible and hidden views;
* event binding;
* navigation controls;
* selected control presence.

Treat returned fields as implementation details.

If the helper is unavailable:

1. confirm the expected source loaded;
2. confirm module evaluation completed;
3. inspect import and initialization failures.

Diagnostics do not prove complete user behavior.

---

## 10. Deployment Verification

Deployment setup belongs in:

```text
docs/GITHUB_PAGES_DEPLOYMENT.md
```

Current deployment status belongs in:

```text
docs/PROJECT_STATE.md
```

HTTP 200 proves only that a URL responded.

It does not prove:

* JavaScript initialized;
* CDN dependencies loaded;
* data paths resolved;
* EPUB import worked;
* IndexedDB persisted;
* Reader interactions passed.

A deployed functional check should:

1. use the copyright-safe smoke fixture;
2. avoid private books and data;
3. inspect Console and Network;
4. verify the affected workflow;
5. confirm relative asset paths;
6. distinguish availability from functional verification.

---

## 11. Known Operational Caveats

### CDN dependencies

JSZip and epub.js may load from a CDN.

Network restrictions, content blockers, proxies, or CDN outages can prevent EPUB import.

Confirm dependency availability before treating import failure as application logic failure.

### Origin-scoped storage

Hostname, port, protocol, browser profile, and private-browsing context affect which local data is visible.

### Approximate progress restoration

Viewport, fonts, layout, chapter HTML, and annotations may move the restored position.

### Compatibility identifiers

Historical values such as `cloze-mixed`, `clozeHtml`, and Slash-era storage or debug names may remain intentionally.

### Built-in Guide

The Guide is a virtual book, not a user-imported EPUB blob.

Guide-authored multilingual content does not prove imported-book multilingual generation.

### Placeholder modes

Chinese Reading Mode and Mixed Mode for imported books remain placeholders unless `docs/PROJECT_STATE.md` records a later verified implementation.

### Browser automation

Automation availability differs by local and sandbox environment.

When automation is unavailable, record the limitation and perform required manual checks.

### Offline status

Do not assume service-worker or offline startup support.

Use `docs/PROJECT_STATE.md` for current status.

---

## 12. Update Rule

Update this file only when startup, launchers, local URL structure, serving directory, test commands, fixture generation, browser smoke, deployment verification, diagnostics, or operational caveats materially change.

Do not use this file as a product specification, roadmap, milestone log, or implementation-status source.
