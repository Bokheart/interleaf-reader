# R4.3 iPhone navigation stability — independent review candidate

Date: 2026-10-12, Asia/Shanghai. Dedicated worktree:
`D:\BookHeart\slash reader\slash-reader-v2-r43-iphone-navigation`.
Detached HEAD/base: `9b4857dc73c09bdc6ac024475f3518e98029f584`.
Changes are uncommitted. No push, merge or deployment was performed. Existing
R4.2 and R5 checkouts and frozen governance files were not changed.

## Confirmed application defects

1. Route operations did not own their asynchronous completions. Settings entry
   waited for progress persistence and could publish Settings after Return had
   already dismissed that intent. Book adapter, EPUB and bookmark loading had
   the same stale-completion problem. Running history restoration could publish
   an obsolete route after a newer Forward; a queued restoration could cancel a
   newer explicit book choice. Sequence ownership now invalidates these phases,
   including chapter restoration waiting on persistence while Reader is ready.
   Persistence retains its existing serialized queue.
2. Reader teardown dispatched `clearReader` while the route was still Reader.
   This exposed the default Light appearance on a Dark Reader frame before the
   shell route rendered. Navigation now leaves Reader before clearing its state.
3. Settings return restored a source anchor by aligning to its line. With
   unchanged geometry this could move Scroll pixels, for example 99 to 85.
   The source anchor remains authoritative; exact origin pixels are reused only
   for the same book, chapter, layout, appearance and viewport. Canceled Settings
   entry metadata is cleared so a later visit captures its actual origin.

Canceled reader operations also cannot clear a newer operation's loading state,
publish a stale error, or strand mode controls in their saving state. Existing
temporary Settings-history consumption is retained, with superseded restoration
invalidated at each native traversal and explicit navigation intent.

These defects were reproduced with controlled delayed operations and regression
tests. They explain application route resurrection, transient Light rendering
and origin-position drift. They do **not** establish which defect caused every
reported physical swipe: Safari can show a captured history preview before a
traversal commits. The settled on-device route and trace are still required to
separate that preview from application state. Native edge gestures, swipe
thresholds and vocabulary/dictionary/IndexedDB contracts were not changed.

## Changed files

Runtime:

- `pwa-reader/ui-r3/controller.js`: navigation ownership, cancellation, safe
  teardown ordering and anonymous diagnostic anchors.
- `pwa-reader/ui-r3/readerHistory.js`: invalidate obsolete restoration and track
  explicit intent versus history restoration; diagnostic traversal state.
- `pwa-reader/ui-r3/bootstrap.js`: capture and validate actual Reader origin.
- `pwa-reader/ui-r3/readerLayout.js`: exact same-geometry return pixels and
  diagnostic restoration/turn state; no gesture policy changes.
- `pwa-reader/ui-r3/readerInteractionTrace.js`: temporary opt-in bounded,
  memory-only route, appearance, overlay, operation and lifecycle trace.
- `pwa-reader/sw.js`: static runtime cache v8 to v9, to deliver the changed
  modules to existing installed clients. Worker behavior/schema is unchanged.

Tests and evidence:

- `tests/r3Runtime.test.mjs`
- `tests/readerInteractionTrace.test.mjs` (new)
- `tests/browser/iphoneNavigationStability.cjs` (new)
- `tests/browser/safariInteractionRecovery.cjs`
- `tests/browser/mobileUxConvergence.cjs`
- `tests/contentFoundationConvergence.test.mjs`
- `tests/mobileUxOffline.test.mjs`
- `tests/sw.test.mjs`
- `docs/qa/R43_IPHONE_NAVIGATION.md` (this report)

The existing cache tests change their version expectations only. The Safari
trace privacy assertion now permits anonymous integer source offsets while
continuing to reject content and book/chapter identifiers.

## Verification

All commands were run from this dedicated worktree after first entering the
main repository specified in the request. Windows Node and bundled Playwright
were used. Headless Edge required the approved external process execution.

| Check | Result |
| --- | --- |
| `node --test --test-reporter=tap tests/*.test.mjs` | 347/347 pass |
| Syntax checks of all `pwa-reader/**/*.js` | 45/45 pass |
| New browser script syntax | Pass |
| `tests/browser/iphoneNavigationStability.cjs` | 29/29 pass |
| `tests/browser/safariInteractionRecovery.cjs` | 34/34 pass |
| `tests/browser/mobileUxConvergence.cjs` | 31/31 pass |
| `tests/browser/immersivePwaBlockers.cjs` | 3/3 pass |
| `tests/browser/mobileReaderCore.cjs` | Pass at 393×852 and 1365×900 |
| `git diff --check` | Pass |
| Independent read-only code review | No remaining concrete correctness blocker |

The new browser suite covers seven navigation/position scenarios across Page
and Scroll, ordinary-browser and simulated standalone contexts (28 cases), plus
an exact R4.2 v8 → waiting v9 → close clients → activated v9 → offline runtime
byte comparison. Authored fixtures only; no private EPUBs. Existing regressions
cover origin routes, failed/canceled page turns, overlays, appearance, vocabulary
feedback, legacy Settings entries and older v5 cache convergence.

The cache-update harness uses awaited bounded polling for asynchronous worker
state. This installed Playwright implementation does not await an async
`waitForFunction` predicate before testing its truthiness.

Screenshots were inspected: `generated/r43-navigation-qa/browser-page.png`,
`browser-scroll.png`, `standalone-page.png` and `standalone-scroll.png`.
JSON evidence: `generated/r4-safari-qa/edge.json`,
`generated/mobile-ux-qa/convergence.json`,
`generated/immersive-pwa-qa/blockers.json` and
`generated/mobile-reader-qa/browser-qa.json`. These generated artifacts are
ignored by Git. The new navigation suite reports its count to stdout.

Example PowerShell rerun:

```powershell
Set-Location 'D:\BookHeart\slash reader\slash-reader-v2'
Set-Location 'D:\BookHeart\slash reader\slash-reader-v2-r43-iphone-navigation'
$env:NODE_PATH = 'C:\Users\Susie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node --test --test-reporter=tap tests/*.test.mjs
node tests/browser/iphoneNavigationStability.cjs
node tests/browser/safariInteractionRecovery.cjs
node tests/browser/mobileUxConvergence.cjs
```

## Physical iPhone acceptance — pending

No physical iPhone was available. Headless Edge and `navigator.standalone`
simulation are not Safari or installed-PWA acceptance. Playwright WebKit was
not available locally. No new Preview was deployed under this request.

Run the following on actual iPhone Safari and the installed standalone PWA,
in Dark Reader with both Page and Scroll, starting at a nonzero position:

| Scenario | Required evidence | Status |
| --- | --- | --- |
| Right-edge inward swipe, completed and canceled; repeat immediately | Native preview distinguished from committed route; no stale Settings publication or stuck interaction; next interior turn works | Pending |
| Left-edge swipe, completed and canceled | No committed Light Reader frame, correct settled route and unchanged origin | Pending |
| Settings → Return/Back → native Forward, repeated | Settings returns to actual origin; consumed Settings entry cannot reopen it | Pending |
| Settings from Reader, Home, Library and Vocabulary; nested Settings | Actual origin preserved; no old Reader/book restoration replaces a newer choice | Pending |
| Delayed save/book/chapter restoration superseded by Return or another route | Old operation cannot publish route, position, error or loading changes | Pending |
| Reader Contents/Appearance overlays around navigation | Settled store/DOM/history coherent, overlay dismissed or preserved according to the explicit action | Pending |
| Page/Scroll return with unchanged geometry; orientation or appearance change | Same-geometry pixels stable; changed geometry restores source anchor rather than old pixels | Pending |
| Background/foreground and repeated navigation | No stale restoration reopens dismissed route; immediate subsequent interaction works | Pending |
| Existing v8 PWA update, close all scoped clients, reopen offline | v9 runtime activated and new behavior available offline | Pending |

Record iPhone model, iOS version, Safari/PWA mode, layout, origin route, gesture
completion/cancellation and observation after finger release and settlement.
Do not infer route correctness solely from a swipe animation or browser preview.

## Temporary on-device trace

Use `/pwa-reader/r3.html?interactionTrace=1`. Without this opt-in, the trace is
absent. It stores at most 256 events in memory and makes no network writes.
It records incoming history screen/step/direction, store and rendered DOM route,
Reader theme, overlay, anonymous current/durable anchors (chapter ordinal and
UTF-16 source offset), pending navigation/history/layout work and lifecycle.
No EPUB text, title, source locator, sensitive book ID or raw history ID is
included. Only export the sanitized trace, not raw application/history state.

In Safari Web Inspector after reproducing and releasing the gesture:

```javascript
const root = document.querySelector('#r3-root');
await root.__readerHistory.whenSettled();
root.__readerInteractionTrace.current();
root.__readerInteractionTrace.snapshot();
```

Check that pending navigation/restoration/turn fields have settled before
classifying a screenshot as a final route. Retain both the current snapshot and
preceding events for a failure. Clear with `root.__readerInteractionTrace.clear()`;
remove the URL opt-in and reload to disable it. A pending persistence operation
can remain while durable progress catches up; distinguish its last successful
anchor from the current logical position.

R4.3 NAVIGATION READY FOR INDEPENDENT REVIEW
