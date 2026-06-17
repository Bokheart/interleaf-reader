# GitHub Pages Deployment

Interleaf Reader is a static, no-build browser app. The simplest deployment path is GitHub Pages from the repository branch root.

## Deployment Goal

Serve the existing static app without a build step.

Expected project-site URL:

```text
https://<owner>.github.io/<repo-name>/pwa-reader/
```

The repository root also includes a minimal `index.html` that redirects to `./pwa-reader/`.

## Recommended Repository Settings

In GitHub:

1. Open the repository.
2. Go to **Settings**.
3. Go to **Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Set **Branch** to `main`.
6. Set **Folder** to `/ (root)`.
7. Save.

The app should be served from the repository root because `pwa-reader/` fetches shared JSON from `../data/`.

## Path Audit

Current deployment-sensitive paths are relative:

- Root entry: `index.html` redirects to `./pwa-reader/`
- App entry: `pwa-reader/index.html`
- CSS: `./styles.css`
- module entry: `./app.js`
- manifest: `./manifest.webmanifest`
- app icons: `./assets/icons/*.png`
- app modules: `./*.js`
- vocabulary data: `../data/vocabulary.json`
- slang/idiom data: `../data/slang_idioms.json`
- protected terms: `../data/protected_terms.json`
- level baselines: `../data/levels/<level>_basic_words.json`

No GitHub Actions workflow is required for the current static deployment path.

## Post-Deploy Checks

After Pages finishes deploying:

1. Open `https://<owner>.github.io/<repo-name>/pwa-reader/`.
2. Confirm Home loads.
3. Import `tests/fixtures/interleaf_smoke.epub`.
4. Confirm Reader opens.
5. Confirm JSON data loads.
6. Confirm Vocabulary Preview has matches.
7. Confirm chapter navigation works.
8. Confirm the vocabulary bubble opens.
9. Confirm Local Library saves/restores.
10. Confirm Forget modal works.
11. Confirm Chinese and Mixed placeholders remain honest.

## Privacy Checks

- No analytics should be added for this deployment.
- User EPUBs should remain local in browser IndexedDB.
- GitHub Pages is static hosting only; it does not add an Interleaf Reader backend.
- `PRIVACY.md` documents the CDN dependency for epub.js and JSZip.

## Known Risks

- epub.js and JSZip still load from CDN.
- No service worker exists yet.
- Minimal web app manifest and basic self-authored icons exist.
- Browser storage quota can affect large EPUBs.
- Future absolute paths could break project-site subpath deployment.

Before implementing a service worker, follow `docs/PWA_OFFLINE_CACHE_PLAN.md`. The first service worker should cache only the app shell, not user EPUBs or private files.
