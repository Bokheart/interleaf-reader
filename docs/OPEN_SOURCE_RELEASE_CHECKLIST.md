# Interleaf Reader - Open-source Release Checklist

This checklist tracks what must be decided, documented, tested, and reviewed before Interleaf Reader is published as an open-source GitHub project.

Interleaf Reader is currently a local development project. This document is a release-readiness checklist only; it does not mean the project is ready for public release.

## 1. Release Status

- [ ] Current status: **pre-release / local development**
- [ ] Public repository status: **TBD**
- [ ] Decide release path:
  - [ ] Private beta first
  - [ ] Immediate public release
- [ ] Product name confirmed: **Interleaf Reader**
- [ ] Former codename documented: **Slash Reader v2**
- [ ] Confirm public README uses Interleaf Reader consistently.
- [ ] Confirm remaining Slash Reader v2 references are either renamed or intentionally documented as former codename.

## 2. Required Files Before Public Release

- [x] `README.md` refreshed for Interleaf Reader.
- [x] `LICENSE` final file.
- [x] `PRIVACY.md` drafted for local-first MVP.
- [x] `CONTRIBUTING.md` drafted.
- [ ] `CODE_OF_CONDUCT.md` if desired.
- [x] GitHub issue templates.
- [x] GitHub pull request template.
- [x] Release checklist: `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md`
- [ ] Screenshots / demo assets.
- [ ] Changelog or release notes.
- [ ] Confirm all required docs are linked from `README.md` or an obvious docs map.

## 3. License Decision

- [x] License direction documented in `docs/LICENSE_DECISION.md`.
- [x] Custom source-available, non-commercial community license selected as the current direction.
- [x] Final `LICENSE` file created.
- [x] MIT considered and rejected as the main direction because it permits commercial reuse, resale, paid packaging, and commercial closed-source reuse.
- [x] GPL / AGPL considered and not sufficient because they do not prohibit commercial use.
- [ ] Confirm whether any dependency, dataset, or source-material constraint affects license choice.
- [ ] Review source-material and vocabulary dataset copyright concerns before public release.
- [ ] Confirm seed vocabulary data is original, permitted, or sufficiently minimal/curated.
- [x] Final license text is explicit and `LICENSE` is added.
- [ ] Maintainer contact is published.
- [x] Commercial permission process is documented.
- [ ] Legal review decision is complete.

## 4. Privacy Policy Checklist

`PRIVACY.md` should explain:

- [x] Interleaf Reader is local-first in the MVP.
- [x] Imported EPUBs are supplied by the user.
- [x] Saved EPUB files can be stored in browser IndexedDB.
- [x] Reading progress is stored in browser IndexedDB.
- [x] Vocabulary profile data is stored locally in browser IndexedDB.
- [x] No account system exists in MVP.
- [x] No cloud sync exists in MVP.
- [x] The app currently depends on CDN-hosted epub.js / JSZip.
- [x] Future translation providers may send chapter text to the selected provider.
- [x] Future user API key handling is **TBD**.
- [x] No analytics exist unless explicitly added later.
- [x] Users can clear site data through browser controls; app-level delete/forget behavior is documented.

## 5. Copyright and Source-material Policy

- [ ] Do not commit copyrighted EPUBs.
- [ ] Do not publish user-imported books.
- [ ] Do not host public translated works.
- [ ] Review `source_materials/` PDFs before making the repo public.
- [ ] Decide whether `source_materials/` should remain private, be removed, or be replaced with notes.
- [ ] Do not publish bulk extracted dictionary text in app datasets.
- [ ] Do not publish bulk extracted book text in app datasets.
- [ ] Demo screenshots should not contain copyrighted novel/fanfic content unless clearly allowed.
- [ ] Demo EPUB, if needed, should use public-domain or original text.
- [ ] Document that users are responsible for importing books they have the right to use.

## 6. GitHub Repository Checklist

- [ ] Choose repository visibility:
  - [ ] Private first
  - [ ] Public immediately
- [ ] Confirm default branch name.
- [x] Confirm branch naming convention in `CONTRIBUTING.md`.
- [ ] Add repository description.
- [ ] Add repository topics/tags.
- [ ] Add README badges only if useful and true.
- [ ] Confirm `.gitignore` covers generated reports, local caches, temporary files, and private source material if needed.
- [ ] Review large files before public release.
- [ ] Review generated files before public release.
- [ ] Review committed secrets.
- [ ] Review old prototype artifacts and stale docs.
- [ ] Confirm repo path / project naming does not confuse public users.
- [ ] Decide whether to keep old codename references in docs.

## 7. GitHub Pages / Static Hosting Checklist

- [ ] Decide deploy path.
- [ ] Confirm app is served from project root, not directly from `pwa-reader/`, because it fetches from `data/`.
- [ ] Confirm `data/` fetch works on the chosen static host.
- [ ] Confirm HTTPS is available.
- [ ] Confirm base URL / relative paths work on GitHub Pages.
- [ ] Confirm `pwa-reader/` can be opened from the deployed URL.
- [x] GitHub Pages deployment prep documented in `docs/GITHUB_PAGES_DEPLOYMENT.md`.
- [x] `.nojekyll` added for branch/root static hosting.
- [x] Root `index.html` redirects to `./pwa-reader/`.
- [x] Minimal PWA manifest exists.
- [x] Add app icons for installability.
- [x] PWA offline/cache plan drafted.
- [ ] Confirm service worker status.
- [ ] Decide CDN vs vendored epub.js / JSZip.
- [ ] Confirm CDN dependency is documented if kept.
- [ ] Custom domain: **TBD**.

## 8. Security Checklist

- [ ] No API keys in frontend code.
- [ ] No secrets committed.
- [ ] No private EPUBs committed.
- [ ] No private source PDFs committed without review.
- [ ] Optional modules must fail open.
- [ ] Vocabulary personalization failure must not block app startup, EPUB import, or chapter render.
- [ ] Translation providers must not block EPUB import or chapter render.
- [ ] Future translation provider key storage strategy is **TBD**.
- [ ] Future translation provider architecture must not expose developer-owned keys in static frontend code.
- [ ] Confirm dependency CDN URLs are intentional and documented.

## 9. MVP Smoke Checklist Before Release

Manual browser smoke:

- [ ] Start local server from project root.
- [ ] Import a valid EPUB.
- [ ] Confirm EPUB diagnostics show successful loading.
- [ ] Confirm chapter list appears.
- [ ] Confirm Previous / Next chapter navigation works.
- [ ] Confirm Home / Reader / Vocabulary Library view switching works.
- [ ] Confirm Local Library restore works after refresh.
- [ ] Confirm Forget book modal works.
- [ ] Confirm Vocabulary Preview renders.
- [ ] Confirm underlined terms and vocabulary bubble work.
- [ ] Confirm Known / Save / Hide actions work.
- [ ] Confirm manual vocabulary add works.
- [ ] Confirm vocabulary row Remove works.
- [ ] Confirm Copy Learning works.
- [ ] Confirm Copy All works.
- [ ] Confirm CSV export downloads.
- [ ] Confirm mobile viewport reader overlay works.

Local checks:

- [ ] JS syntax check for `pwa-reader/*.js`.
- [ ] Node tests pass.
- [ ] Vocabulary dataset check passes.
- [ ] Browser diagnostics smoke test from `docs/HANDOFF.md` passes.

## 10. Open Issues / TBD List

- [x] Final `LICENSE` file
- [ ] Maintainer contact for license/commercial permission
- [x] Commercial permission process
- [ ] Legal review decision
- [x] `PRIVACY.md` drafted for local-first MVP; revisit before public release if providers, analytics, sync, or hosting change.
- [x] `CONTRIBUTING.md` drafted.
- [ ] `CODE_OF_CONDUCT.md` decision
- [x] GitHub issue templates
- [x] GitHub pull request template
- [ ] GitHub Pages configuration
- [x] GitHub Pages deployment prep documentation
- [x] Minimal PWA manifest
- [x] App icons
- [x] PWA offline/cache plan
- [ ] Service worker
- [ ] Vendored scripts vs CDN decision
- [ ] `source_materials/` public repo policy
- [ ] Interleaf rename cleanup in UI and older docs
- [ ] README / doc drift check after each milestone
- [ ] Public release timing: private beta vs immediate public release
- [ ] Screenshots / demo assets with copyright-safe content
- [ ] Changelog / release notes format

## Suggested Release Gate

Do not publish the repository broadly until these minimum items are complete:

- [x] Final license text chosen and `LICENSE` file added.
- [x] Privacy policy written for current local-first MVP.
- [ ] Copyright/source-material policy resolved.
- [ ] No secrets or copyrighted EPUBs committed.
- [ ] MVP smoke checklist passes.
- [ ] README accurately states implemented, placeholder, and planned features.
- [ ] GitHub Pages or local-run instructions are verified.
