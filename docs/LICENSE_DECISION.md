# Interleaf Reader — License Decision

**Original decision date:** 2026-06-16
**Current status:** Implemented; final `LICENSE` exists
**Product:** Interleaf Reader
**Former codename:** Slash Reader v2

This document records the reasoning behind the project’s license direction and the intended commercial-permission process.

It is not legal advice.

The controlling legal terms are in:

```text
LICENSE
```

If this document and `LICENSE` differ, `LICENSE` controls.

---

## 1. Decision Summary

Interleaf Reader uses the **Interleaf Reader Non-Commercial Community License**, a custom non-commercial, source-available license.

The project is intended to allow source inspection and permitted personal, educational, research, hobby, and other non-commercial use under the terms of `LICENSE`.

Commercial use is not granted by default.

Commercial use requires separate explicit written permission from the project owner or an authorized maintainer.

Because the license is custom and non-commercial, Interleaf Reader must not be described as:

* MIT-licensed;
* GPL-licensed;
* AGPL-licensed;
* OSI-approved open source.

The accurate public description is:

> Interleaf Reader is source-available for permitted non-commercial use. Commercial use requires separate written permission.

---

## 2. Why MIT Was Not Selected

MIT is simple and widely understood, but it permits commercial use.

Under MIT, third parties could generally:

* reuse the code commercially;
* resell or repackage it;
* offer it as part of a paid service;
* integrate it into a commercial closed-source product;
* monetize modified versions with few restrictions.

That conflicts with the owner’s decision to allow community access without granting commercial exploitation by default.

---

## 3. Why GPL or AGPL Was Not Selected

GPL and AGPL can require source sharing in particular circumstances.

However, they do not prohibit commercial use.

A company may still sell, host, or commercially deploy GPL- or AGPL-licensed software when it complies with the relevant terms.

That does not satisfy the project requirement that commercial use needs separate permission.

---

## 4. Why Creative Commons Is Not the Main Software License

Creative Commons licenses are generally designed for creative works rather than software source code.

Interleaf Reader therefore does not use CC BY-NC as its primary software license.

Documentation and assets may require a separate scope decision later, but they must not be assigned a different license casually or in a way that conflicts with repository-wide wording.

---

## 5. License Goals

The selected license direction is intended to:

* permit uses allowed by `LICENSE`;
* allow people to inspect and learn from the source;
* allow permitted non-commercial modification and redistribution;
* require attribution and preservation of notices where `LICENSE` requires them;
* require modified versions to identify changes where `LICENSE` requires it;
* prevent unauthorized commercial resale, paid packaging, commercial SaaS, and commercial closed-source reuse;
* protect Interleaf Reader and BookHeart names, logos, and branding from unauthorized commercial promotion;
* require separate written permission for commercial use.

This summary is explanatory only.

It must not be used as a substitute for reading `LICENSE`.

---

## 6. Public Wording Rules

Use:

> Interleaf Reader is source-available for permitted personal, educational, research, hobby, and other non-commercial use. Commercial use requires separate written permission.

Avoid:

* “open source” without qualification;
* “OSI open source”;
* “free for any use”;
* “MIT-style”;
* “commercial use allowed”;
* wording that suggests a public discussion or pull request grants permission.

The historical filename `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md` may remain temporarily for compatibility, but the document title and content must use source-available terminology.

---

## 7. Contributor Policy

Contributions are accepted under the repository’s contribution and license terms.

Contributors must submit only code, documentation, data, and assets they have the right to provide.

Contributors must not submit:

* copyrighted EPUBs;
* fanfiction exports without permission;
* paid book text;
* copied dictionary entries;
* song lyrics;
* bulk extracted PDF or book text;
* private API keys;
* secrets or tokens;
* private user data;
* material whose license is incompatible with the project.

Contributors should review:

```text
CONTRIBUTING.md
LICENSE
```

---

## 8. Commercial Permission Process

Commercial use is not granted by default.

A requester must obtain explicit written permission from the project owner or an authorized maintainer before beginning commercial use.

A request should include:

* requester name and organization;
* contact information;
* intended commercial use;
* whether the software will be sold, hosted, bundled, deployed internally, used in a paid course, or integrated into another product;
* whether modified versions are involved;
* whether Interleaf Reader or BookHeart names, logos, screenshots, or branding will be used;
* whether user EPUBs, vocabulary data, analytics, cloud sync, translation providers, or API keys are involved;
* expected audience;
* distribution channel;
* intended launch timeline;
* whether source modifications will be shared back.

Permission must be explicit and written.

The following do not grant commercial permission:

* opening an issue;
* opening a pull request;
* forking the repository;
* receiving a reply in a public discussion;
* private use that later becomes commercial;
* maintainer silence;
* absence of objection.

Approved commercial use may require a separate agreement containing terms such as:

* attribution;
* branding limits;
* privacy and security requirements;
* support boundaries;
* source-sharing obligations;
* payment;
* duration;
* territory;
* revocation or termination conditions.

Until a public maintainer contact is published, no official commercial-permission request channel exists.

That absence does not grant permission.

---

## 9. Current Completed Items

- [x] License direction selected
- [x] Custom source-available, non-commercial license created
- [x] Final `LICENSE` added
- [x] Commercial permission required
- [x] Commercial request contents documented
- [x] README wording direction defined
- [x] Decision Log records the license selection
- [x] Contribution guidance exists

---

## 10. Remaining Decisions

The following remain unresolved:

- [ ] publish maintainer contact;
- [ ] decide whether legal review is required before public release;
- [ ] complete legal review if required;
- [ ] confirm whether documentation and assets use the same license scope;
- [ ] review dependency licenses;
- [ ] review vocabulary dataset provenance and permissions;
- [ ] review source-material handling;
- [ ] verify public README and release wording against `LICENSE`;
- [ ] decide whether a shorter plain-English summary should appear in `README.md`.

---

## 11. Required Follow-up Documents

When maintainer contact, legal review, or license scope changes, review and update:

* `LICENSE`
* `README.md`
* `CONTRIBUTING.md`
* `PRIVACY.md`
* `docs/PROJECT_STATE.md`
* `docs/OPEN_SOURCE_RELEASE_CHECKLIST.md`
* `docs/DECISION_LOG.md`

A change to explanatory wording must not silently change the legal meaning of `LICENSE`.
