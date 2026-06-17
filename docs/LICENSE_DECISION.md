# Interleaf Reader License Decision

**Date:** 2026-06-16  
**Status:** License direction decided; final `LICENSE` file pending  
**Product:** Interleaf Reader  
**Former codename:** Slash Reader v2

This document records the intended license direction before the final license text is created. It is a project planning document, not legal advice.

## 1. Decision Summary

Interleaf Reader will use a custom non-commercial community license.

The intended model is **source-available** and community-friendly, but it is **not an OSI-standard open-source license**. The code should be public for personal, educational, research, hobby, and other non-commercial use.

Commercial use requires separate written permission from the maintainer.

## 2. Why Not MIT

MIT is simple and widely understood, but it would allow uses that conflict with the owner's intent.

Under MIT, third parties could generally:

- reuse the code commercially
- resell or package Interleaf Reader as a paid app
- offer it as part of a paid service
- integrate it into commercial closed-source products
- monetize modified versions with minimal restrictions

That is too permissive for this project because the owner wants public community access without allowing commercial exploitation by default.

## 3. Why Not GPL / AGPL As The Main Answer

GPL and AGPL can require source sharing under certain conditions, and AGPL is especially relevant for network services.

However, GPL and AGPL do **not** prohibit commercial use. A company could still sell, host, or commercially deploy the software if it follows the relevant license terms.

That does not satisfy the owner's requirement: no commercial use without separate written permission.

## 4. Why Not Creative Commons For Code

Creative Commons licenses are usually better suited to documents, assets, and creative content than software source code.

Do not use CC BY-NC as the main software license unless a later legal review explicitly chooses that path. A custom software-focused non-commercial license is the preferred direction for Interleaf Reader.

## 5. Custom License Goals

The final license should aim to:

- allow personal, educational, research, hobby, and other non-commercial use
- allow people to read, study, and learn from the code
- allow non-commercial forks and modifications
- allow non-commercial redistribution with attribution
- allow community suggestions, issues, and pull requests
- require attribution to Interleaf Reader / BookHeart
- require preservation of the license notice
- require modified versions to clearly state that changes were made
- protect against commercial resale, paid packaging, commercial SaaS, and commercial closed-source reuse
- prohibit use of the Interleaf Reader or BookHeart name, logo, or branding for commercial promotion without permission
- require separate written permission for any commercial use

## 6. Contributor Policy

Contributions are accepted under the same project license unless otherwise stated.

Contributors should submit only code, documentation, data, and assets they have the right to license to the project.

Contributors must not submit:

- copyrighted EPUBs
- fanfiction exports
- paid book text
- copied dictionary entries
- song lyrics
- bulk extracted PDF or book text
- private API keys
- secrets or tokens

## 7. Repository Wording Guidance

Recommended README wording after the final license is created:

> Interleaf Reader is source-available for personal, educational, research, hobby, and other non-commercial use. Commercial use requires separate written permission from the maintainer.

The README should avoid calling the project OSI-approved open source unless the license direction changes to an OSI-approved license.

## 8. Remaining TBDs

- Maintainer contact
- Whether docs and assets use the same custom license or a separate non-commercial content license
- Whether legal review is needed before public launch
- Whether to include a short plain-English license summary in `README.md`
- Whether to create the final `LICENSE` file now or after final review

## 9. Commercial Permission Process

Commercial use is not granted by default. Anyone who wants commercial permission should request separate written permission from the maintainer or copyright holder.

Until maintainer contact is published, commercial permission cannot be requested through an official project channel and is not granted.

A commercial permission request should include:

- requester name and organization
- contact information
- intended commercial use
- whether the software will be sold, hosted, bundled, deployed internally, used in a paid course, or integrated into another product
- whether the use involves modified versions
- whether Interleaf Reader or BookHeart names, logos, screenshots, or branding would be used
- whether user EPUBs, vocabulary data, analytics, cloud sync, translation providers, or API keys are involved
- expected audience, distribution channel, and launch timeline
- whether source modifications will be shared back

Permission must be explicit and written. The following do not grant commercial permission:

- opening an issue
- opening a pull request
- forking the repository
- receiving a reply in a public discussion
- using Interleaf Reader privately in a way that later becomes commercial
- absence of objection from the maintainer

Approved commercial use may require a separate agreement with extra terms, such as attribution, branding limits, support boundaries, privacy requirements, or payment terms.

## 10. Next Step

Publish maintainer contact information for commercial permission requests, then review whether the final `LICENSE` text needs to mirror this process note.

When the commercial contact/process is finalized, update:

- `CONTRIBUTING.md`
- `docs/PROJECT_STATE.md`
- `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md`
- `docs/DECISION_LOG.md`
