# Interleaf Reader Privacy Notice

**Status:** Current MVP privacy notice  
**Last updated:** 2026-06-16  
**Maintainer contact:** TBD

This document is a practical privacy notice for the local-first Interleaf Reader MVP. It is not legal advice and does not claim compliance with GDPR, COPPA, CCPA, or any other specific law.

## 1. Overview

Interleaf Reader is a local-first EPUB reading app. Users import their own EPUB files and read them in the browser with vocabulary support.

Current MVP:

- no account system
- no cloud sync
- no Interleaf Reader backend server
- no intentional upload of user EPUB files to Interleaf Reader servers

Interleaf Reader is designed so the main MVP reading flow works locally in the user's browser.

## 2. Data Stored Locally

The current MVP may store the following data locally in the browser:

- imported EPUB file blobs
- book metadata such as title, author, chapter count, file name, file size, and file type
- reading progress such as current chapter, chapter index, approximate scroll position, scroll ratio, reading mode, and last-updated time
- Local Library metadata used to list saved books in this browser
- vocabulary profile data:
  - `knownWords`
  - `learningWords`
  - `ignoredWords`
  - `selectedLevel`
  - `preferredCategories`
  - profile update time

Vocabulary Library exports are generated only when the user chooses a copy or download action.

## 3. Where Data Is Stored

Current MVP local data is stored in the user's browser on the user's device.

Interleaf Reader uses:

- browser IndexedDB for saved EPUBs, book metadata, reading progress, Local Library data, and vocabulary profile data
- limited browser `localStorage` for small app preferences or state where applicable

Browser storage is per browser, browser profile, and device. Data saved in one browser profile may not appear in another.

Clearing browser site data, IndexedDB, localStorage, or the browser profile may delete saved books, reading progress, and vocabulary data.

## 4. What the Current MVP Does Not Do

Current MVP:

- does not provide accounts
- does not provide cloud sync
- does not run an Interleaf Reader backend server
- does not host a public book library
- does not host a public translation library
- does not automatically scrape AO3 or other sites
- does not include analytics or telemetry
- does not intentionally upload user EPUB files to project servers
- does not include developer-owned API keys in frontend code

If any analytics, sync, backend, scraping, or provider call is added later, this privacy notice should be updated before release.

## 5. Third-party Requests in the Current App

The current app may load epub.js and JSZip from a CDN when the app starts. This means the browser may contact the CDN to download those JavaScript files.

This CDN request does not mean Interleaf Reader sends the user's EPUB file to the CDN. The EPUB file is selected by the user and processed in the browser by the app.

Future releases may vendor these scripts, use a service worker cache, or change the hosting model. Those changes should be documented when they happen.

## 6. Translation Providers - Planned, Not Implemented

Real translation providers are not implemented in the current MVP.

Current MVP:

- Chinese Reading Mode is a placeholder
- Mixed Mode is a placeholder
- DeepL is not integrated
- no translation API calls are made by the app
- no translation provider API keys are stored by the app

Planned / not implemented:

- Future translation providers may send selected chapter or block text to the provider chosen by the user or deployer.
- DeepL or other providers may become optional integrations later.
- Provider privacy terms will matter when those integrations are enabled.
- Interleaf Reader should be clear with users when text is sent to an external provider.
- User API key UX is TBD.
- API keys must not be committed to the public frontend repository.

Provider data flow and key handling must be designed and documented before real translation is enabled.

## 7. User-imported Content and Copyright

Users are responsible for importing files they have the right to use.

Interleaf Reader:

- does not provide copyrighted books
- does not publish user-imported books
- does not host public translated works
- does not include AO3/fanfiction scraping in the current MVP

Repository test fixtures should be copyright-safe and self-authored. Private EPUB samples, copyrighted novels, fanfiction, lyrics, and bulk copied source text should not be committed.

## 8. Exported Vocabulary Data

The Vocabulary Library can copy or download terms when the user triggers an export action.

Current export behavior is local and user-triggered:

- Copy Learning copies learning words to the clipboard when the browser allows it.
- Copy All copies the current local vocabulary lists in plain text.
- Download CSV creates a local CSV file with term and status columns.

Exported files or clipboard content are controlled by the user after export.

## 9. Data Deletion

Current MVP deletion options:

- Use Forget Book to remove a saved EPUB and its reading progress from IndexedDB for that book.
- Use Vocabulary Library Remove actions to remove vocabulary terms from local vocabulary lists.
- Clear browser site data to remove local Interleaf Reader data for that browser/profile/device.

There is no cloud deletion request flow in the MVP because there is no cloud account, cloud sync, or Interleaf Reader backend.

An in-memory book session may remain open until refresh after a saved copy is forgotten. This does not mean the saved IndexedDB copy still exists.

## 10. Children / Teen Note

The current MVP is not specifically designed as a children's product.

A future children-friendly edition or teen-focused experience is TBD. If Interleaf Reader is later marketed to children, a separate privacy and safety review is required before release.

This document does not claim compliance with children's privacy laws.

## 11. Changes to This Policy

This privacy notice may change as Interleaf Reader evolves.

Updates may be needed if the project adds:

- translation providers
- PWA service worker caching
- analytics or telemetry
- cloud sync or accounts
- external import/export integrations
- API key storage UX
- hosted deployment changes

Major privacy-impacting changes should also be logged in `docs/DECISION_LOG.md`.

## 12. Contact

Maintainer contact: TBD
