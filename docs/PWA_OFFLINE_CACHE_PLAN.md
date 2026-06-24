# PWA Offline Cache Plan

**Status:** Implementation Complete (Bounded Risk Acceptance)

* Locally verified and remotely deployed.
* Remote dynamic-browser check waived through product-owner risk acceptance.
* Browser cache/storage eviction caveats remain.
**Product:** Interleaf Reader  
**Last updated:** 2026-06-17

This document defines a cautious service worker and offline caching strategy before any implementation work begins.

## 1. Current PWA Status

- GitHub Pages deployment prep exists.
- Root `index.html` redirects to `./pwa-reader/`.
- `pwa-reader/manifest.webmanifest` exists.
- Basic self-authored PWA icons exist in `pwa-reader/assets/icons/`.
- Service worker is implemented and local offline support verification passed.
- Remote dynamic-browser check waived through product-owner risk acceptance.
- epub.js and JSZip are locally vendored.

## 2. Goals

- Make the app shell more reliable after first load.
- Eventually support basic offline reopening of the reader shell.
- Preserve local-first behavior.
- Avoid breaking EPUB import, Vocabulary Preview, Local Library, and IndexedDB persistence.
- Keep optional modules fail-open.

## 3. Non-Goals

- No offline translation.
- No cloud sync.
- No caching user-imported EPUBs in Cache Storage.
- No caching private EPUB fixtures.
- No provider/API calls.
- No analytics.
- No full offline guarantee while epub.js and JSZip still load remotely from CDN.

## 4. Cache Categories

### Safe App Shell Files

Likely safe to cache in the first implementation:

- `pwa-reader/index.html`
- `pwa-reader/styles.css`
- `pwa-reader/*.js` modules
- `pwa-reader/manifest.webmanifest`
- `pwa-reader/assets/icons/*`
- root `index.html`

Use relative paths where possible so GitHub Pages project-site deployment works under `/<repo-name>/`.

### Local JSON Data

Likely cacheable after the app shell is stable, with explicit cache versioning:

- `data/vocabulary.json`
- `data/slang_idioms.json`
- `data/protected_terms.json`
- `data/levels/*.json`

These should be cached only as app assets. They must not be mutated by user actions.

### CDN Scripts

Current remote scripts:

- epub.js
- JSZip

Risk: full offline behavior cannot be guaranteed while these scripts load from CDN.

Preferred future direction:

1. Decide whether to vendor these scripts locally.
2. If kept on CDN, document the runtime strategy.
3. Do not assume service worker caching of third-party CDN responses is enough for reliable offline behavior.

### User EPUBs

Do **not** cache user-imported EPUBs in service worker Cache Storage.

User-imported books already live in browser IndexedDB by explicit user action. IndexedDB remains the source of truth for saved EPUBs, reading progress, and vocabulary profile data.

### Generated Reports, Source Materials, And Private Files

Never cache:

- `generated/`
- `source_materials/`
- private EPUB samples
- private/local test files
- copied book/fanfiction/dictionary source text

### Future Translation Output

Translation output caching is TBD and not part of the first service worker. Any future translation cache requires a privacy review and `PRIVACY.md` update.

## 5. Privacy And Copyright Constraints

- The service worker must not upload EPUBs.
- The service worker must not cache copyrighted books, fanfiction exports, private EPUBs, or user-imported EPUBs.
- Local-first IndexedDB remains the storage location for saved books, reading progress, and vocabulary profile data.
- Cache Storage should be limited to app shell and approved app asset files.
- Update `PRIVACY.md` before implementing any new data flow or caching behavior that affects privacy.
- Do not add analytics, provider calls, cloud sync, or API key storage as part of service worker work.

## 6. GitHub Pages Path Constraints

Expected deployed app URL:

```text
https://<owner>.github.io/<repo-name>/pwa-reader/
```

Constraints:

- The app runs under `/<repo-name>/pwa-reader/`.
- Service worker scope must be planned carefully.
- Registering a service worker from `pwa-reader/` will normally scope it to `/<repo-name>/pwa-reader/`.
- The root redirect should not be allowed to confuse scope or cache keys.
- Relative paths should be used where possible.
- Deployment must be tested on the real GitHub Pages URL, not only locally.

## 7. Update And Versioning Strategy

- Use explicit cache names such as `interleaf-app-shell-v1`.
- Bump cache names when app shell assets change.
- On activation, clean up old Interleaf cache names.
- Avoid trapping users on stale JavaScript.
- Document hard refresh / clear site data recovery steps.
- Do not over-cache during the early MVP.
- Prefer a small app-shell cache first, then expand only after smoke tests pass.

## 8. Proposed Implementation Phases

### Phase 0: Plan Only

This document. No service worker is created or registered.

### Phase 1: App Shell Only

Register a service worker for app shell assets only.

No user data caching. No EPUB caching. No translation cache.

### Phase 2: Local JSON Assets

Cache approved local JSON assets with cache versioning:

- vocabulary seed data
- slang/idiom seed data
- protected terms
- level baselines

### Phase 3: CDN Strategy

Decide whether to vendor epub.js and JSZip or keep a documented CDN runtime fallback.

Do this before claiming reliable offline reading.

### Phase 4: Remote Smoke And Installability Audit

Run remote GitHub Pages smoke tests and browser installability checks:

- manifest
- icons
- service worker registration
- app shell cache contents
- no private data in Cache Storage

## 9. Acceptance Criteria For First Implementation

The first service worker implementation is acceptable only if:

- app loads online normally
- EPUB import still works
- Vocabulary Preview still works
- Local Library and IndexedDB restore still work
- no private/copyrighted content is cached by the service worker
- no API/provider/analytics behavior is added
- remote GitHub Pages smoke passes
- user can clear browser site data to remove local state
- service worker failure does not block app startup

## 10. Test Plan

When service worker implementation begins:

- Run JS syntax check if JavaScript changes.
- Run focused browser smoke with `tests/fixtures/interleaf_smoke.epub`.
- Verify EPUB import.
- Verify chapter navigation.
- Verify Vocabulary Preview and bubble.
- Verify Local Library save/restore.
- Verify Forget modal.
- Verify Chinese/Mixed placeholders remain honest.

Use DevTools Application tab to check:

- manifest
- service worker registration
- Cache Storage contents
- IndexedDB still stores user book/profile data
- no user EPUBs or private files in Cache Storage

Also run:

- remote GitHub Pages smoke check
- offline reload check only after implementation

Do not claim offline support until the remote service worker behavior is verified.
