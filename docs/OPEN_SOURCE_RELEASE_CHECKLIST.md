# Interleaf Reader — Source-Available Release Checklist

> The filename `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md` is retained for compatibility. Interleaf Reader currently uses a custom source-available, non-commercial license and must not be described as OSI open source.

This checklist tracks what must be decided, documented, tested, and reviewed before Interleaf Reader is promoted as a public source-available GitHub project.

The GitHub repository and remote branch exist. That does not mean the project is release-ready.

---

## 1. Release Status

- [x] Product name confirmed: **Interleaf Reader**
- [x] Former codename documented: **Slash Reader v2**
- [x] Source-available, non-commercial license direction selected
- [x] Runtime baseline committed and pushed to the project repository
- [ ] Public release status confirmed
- [ ] Repository visibility confirmed
- [ ] Release path selected:
  - [ ] Private beta first
  - [ ] Immediate public release
- [ ] Public README terminology reviewed for source-available accuracy
- [ ] Remaining Slash Reader v2 references classified as compatibility or history
- [ ] R0 closed
- [ ] R1 completed or formally deferred
- [ ] R2 release milestone completed

---

## 2. Required Repository Files

- [x] `README.md`
- [x] `LICENSE`
- [x] `PRIVACY.md`
- [x] `CONTRIBUTING.md`
- [x] `docs/LICENSE_DECISION.md`
- [x] `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md`
- [x] GitHub issue templates
- [x] GitHub pull-request template
- [ ] `CODE_OF_CONDUCT.md` decision
- [ ] Copyright-safe screenshots or demo assets
- [ ] Changelog or release notes
- [ ] Public documentation map reviewed
- [ ] All required public documents linked from `README.md`
- [ ] Active documents free from stale archive paths
- [ ] Historical records clearly separated from current authority

---

## 3. License and Governance

- [x] Custom non-commercial, source-available license selected
- [x] Final `LICENSE` file created
- [x] MIT considered and rejected because it permits commercial reuse
- [x] GPL and AGPL considered and rejected as the main answer because they do not prohibit commercial use
- [x] `docs/LICENSE_DECISION.md` records the rationale
- [x] Commercial use requires separate written permission
- [x] Commercial-permission request requirements documented
- [x] README and contributor guidance must avoid claiming OSI open-source status
- [ ] Maintainer contact published
- [ ] Legal-review decision completed
- [ ] Scope of license coverage for documentation and assets confirmed
- [ ] Dependency-license review completed
- [ ] Dataset and source-material license review completed
- [ ] Seed vocabulary data confirmed original, permitted, or sufficiently curated
- [ ] Public-facing plain-English license summary reviewed against `LICENSE`

`LICENSE` is controlling. `docs/LICENSE_DECISION.md` is explanatory and must not contradict or override it.

---

## 4. Privacy

`PRIVACY.md` should accurately explain:

- [x] Interleaf Reader is local-first
- [x] EPUBs are supplied by the user
- [x] EPUB files may be stored in IndexedDB
- [x] Reading progress is stored in IndexedDB
- [x] Vocabulary profile data is stored locally
- [x] No account system exists
- [x] No cloud sync exists
- [x] Current runtime uses CDN-hosted epub.js and JSZip
- [x] No analytics are currently present
- [x] Users can remove app data through app or browser controls
- [x] Future translation providers may require sending text outside the device
- [x] Future credential handling remains unresolved
- [ ] Privacy language reviewed against current runtime before release
- [ ] All network requests inventoried
- [ ] Deployment host behavior reviewed
- [ ] Any future analytics, provider, sync, or cloud change triggers a privacy update

---

## 5. Copyright and Source Material

- [ ] No copyrighted EPUB committed
- [ ] No user-imported book published
- [ ] No public translated work hosted
- [ ] `source_materials/` reviewed before repository publication
- [ ] `source_materials/` retained outside the public baseline
- [ ] No bulk extracted dictionary text published
- [ ] No bulk extracted book or PDF text published
- [ ] Vocabulary datasets reviewed for provenance and permitted use
- [ ] Demo screenshots contain only original, public-domain, or clearly permitted content
- [ ] Demo EPUB, if used, is original or public domain
- [ ] User responsibility for imported content is documented
- [ ] Generated and local candidate files reviewed before release

---

## 6. Repository Hygiene

- [ ] Default branch confirmed
- [x] Branch naming convention documented in `CONTRIBUTING.md`
- [ ] Repository description added
- [ ] Repository topics selected
- [ ] Badges included only when accurate
- [ ] `.gitignore` reviewed
- [ ] Large tracked files reviewed
- [ ] Generated files reviewed
- [ ] Secret scan completed
- [ ] Copyrighted source-material scan completed
- [ ] Old prototype artifacts classified
- [ ] Stale and historical documents classified
- [ ] `design-lab/` disposition decided
- [ ] M2 design-reference disposition decided
- [ ] Repository-local backup files excluded
- [ ] `docs.current.zip` removed only after recovery is no longer needed
- [ ] External project backup policy confirmed
- [ ] Public paths and naming do not confuse users

---

## 7. Deployment and Static Hosting

- [ ] Official deployment path selected
- [ ] Root redirect behavior verified on the release host
- [ ] `data/` fetch paths verified
- [ ] HTTPS verified
- [ ] Relative paths verified under the chosen base URL
- [ ] `/pwa-reader/` verified at the deployed URL
- [x] Deployment preparation documented in `docs/GITHUB_PAGES_DEPLOYMENT.md`
- [x] `.nojekyll` present
- [x] Root `index.html` redirects to `./pwa-reader/`
- [x] Minimal manifest exists
- [x] App icons exist
- [x] Offline/cache plan exists
- [ ] Manifest validated in a supported browser
- [ ] Icons validated for the intended install experience
- [ ] Installability verified or a fallback documented
- [ ] Service-worker status documented
- [ ] CDN versus vendored dependency decision completed
- [ ] CDN availability and failure behavior verified
- [ ] Custom-domain decision completed

---

## 8. Security

- [ ] No API keys in frontend code
- [ ] No secrets committed
- [ ] No private EPUB committed
- [ ] No private source PDF committed
- [ ] Optional modules fail without blocking core reading
- [ ] Vocabulary personalization failure does not block startup or reading
- [ ] Future translation failure cannot block EPUB import or English reading
- [ ] Future provider credential strategy approved before integration
- [ ] Developer-owned credentials are never exposed in static frontend code
- [ ] Dependency CDN URLs reviewed and documented
- [ ] Backup and restore validation reviewed
- [ ] Malformed import data rejected without corrupting current local state

---

## 9. Current Runtime Baseline Evidence

The reproducible runtime baseline is:

```text
91d6914 — feat: establish reproducible M2 runtime baseline
```

The following passed during runtime-baseline validation:

- [x] Local runtime imports resolved
- [x] JavaScript syntax: 13 of 13
- [x] Existing Node tests: 6 of 6
- [x] Vocabulary dataset: 112 items, zero reported issues
- [x] `git diff --check`
- [x] Desktop browser smoke at 1280 × 900
- [x] Mobile browser smoke at 393 × 852
- [x] First-run language selection and persistence
- [x] Settings language switch
- [x] Settings and Help Center
- [x] Guide open, hide, restore, and Reader Help routing
- [x] Vocabulary-level selection and persistence
- [x] TXT export filename and content
- [x] JSON backup filename, schema, and content
- [x] Valid restore replacing current profile
- [x] Malformed restore rejection without mutation

These checks do not complete the release gate.

---

## 10. Release Smoke Still Required

- [ ] Start from the final release candidate
- [ ] Import a valid copyright-safe EPUB
- [ ] Confirm JSZip and epub.js load in the release environment
- [ ] Confirm EPUB diagnostics
- [ ] Confirm chapter list
- [ ] Confirm Previous and Next navigation
- [ ] Confirm Home, Reader, and Vocabulary Library switching
- [ ] Confirm Local Library restore after refresh
- [ ] Confirm Forget Book behavior
- [ ] Confirm Vocabulary Preview
- [ ] Confirm in-text vocabulary bubble
- [ ] Confirm Known, Save, and Hide
- [ ] Confirm manual capture
- [ ] Confirm term removal
- [ ] Confirm Copy Learning
- [ ] Confirm Copy All
- [ ] Confirm CSV export
- [ ] Confirm TXT export
- [ ] Confirm profile backup and restore
- [ ] Confirm mobile Reader controls
- [ ] Confirm a supported non-Chromium browser if included in support scope
- [ ] Confirm deployed behavior matches the release commit
- [ ] Confirm local data survives supported refresh and restart flows
- [ ] Confirm no P0 startup, import, reading, persistence, or data-loss regression

EPUB import was not verified in the latest isolated validation because network policy blocked the external CDN scripts.

---

## 11. Remaining Release Decisions

- [ ] Maintainer contact
- [ ] Legal review
- [ ] Documentation and asset licensing scope
- [ ] `CODE_OF_CONDUCT.md`
- [ ] Public or private repository visibility
- [ ] Private beta or immediate public release
- [ ] GitHub Pages configuration
- [ ] Service worker
- [ ] Vendored scripts versus CDN
- [ ] `source_materials/` policy
- [ ] `design-lab/` policy
- [ ] M2 historical/design-document disposition
- [ ] Copyright-safe screenshots and demo content
- [ ] Changelog and release-note format
- [ ] Supported browser matrix
- [ ] Public release timing

---

## 12. Minimum Release Gate

Do not promote Interleaf Reader as a public release until:

- [x] Final `LICENSE` exists
- [x] Privacy policy exists for the current local-first baseline
- [x] Runtime baseline is reproducible from Git
- [ ] R0 is closed
- [ ] Copyright and source-material policy is resolved
- [ ] No secrets or private/copyrighted source material are committed
- [ ] Release-candidate EPUB smoke passes
- [ ] README accurately separates implemented, placeholder, and planned behavior
- [ ] Official deployment or local-run instructions are verified
- [ ] Source-available terminology is consistent
- [ ] Maintainer contact and commercial-permission channel are published
- [ ] Legal-review decision is recorded
