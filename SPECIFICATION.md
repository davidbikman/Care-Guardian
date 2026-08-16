# Care Guardian — Product Specification

**Status:** Reconstructed specification (describes the system as built)
**Companion documents:** `ARCHITECTURE.md` (as-built design + diagrams), `VALUES.md` (principles), `HIPAA-COMPLIANCE.md`, `PRIVACY-PRINCIPLES.md`, `DEPLOY.md`

This document states the requirements a team would have been given to build Care Guardian. It is the "what" and "why"; `ARCHITECTURE.md` is the "how." Where the two meet, the architecture is the satisfying design and this document is the obligation it satisfies. Requirement priorities use MoSCoW (**MUST**, **SHOULD**, **COULD**, **WON'T (this version)**). The defining constraints of this product are unusually strict, and most of them are **MUST**s — that strictness is the point.

---

## 1. Problem Statement

A family caregiver managing a parent with early-to-mid dementia is the unpaid, untrained, legally-exposed coordinator of a medical, financial, and legal operation that may run for years. They hold information that is simultaneously highly sensitive (diagnoses, finances, capacity assessments, powers of attorney) and highly contested (siblings dispute care decisions; the person being cared for may later be the subject of a guardianship or Medicaid-eligibility proceeding in which these very records become evidence). Existing tools force a false choice: consumer note apps and shared drives offer no privacy or integrity guarantees, while clinical/EHR systems are inaccessible to families and assume an institution, a server, and a covered entity. Caregivers in Oregon face additional specificity — OSIPM, the APD Waiver, ICP, OPI-M, and the ORS statutes that govern elder care — that no general tool encodes. The cost of not solving this is concrete: lost documentation at the moment it is needed for a benefits filing or a family dispute, sensitive data leaked through a third-party cloud, and a care recipient whose own account of their experience can be quietly erased by the people the records may one day be about.

## 2. Vision & Positioning

Care Guardian is **public infrastructure for family caregiving**, not a venture-backed product. It is a privacy-first, local-first progressive web application that runs entirely on the caregiver's own devices, requires no server, transmits nothing without explicit user action, and encrypts everything at rest. Sustainability is intended through an open-source core plus paid institutional services (site licenses, white-label), not through monetizing user data, advertising, or engagement. The product's credibility rests on a single promise that must never be quietly broken: **the data belongs to the family, lives with the family, and is legible and protected even against the family's own future conflicts.**

## 3. Goals

- **G1 — Zero-trust-in-infrastructure privacy.** A caregiver can run the entire application, indefinitely, with no account, no server, and no data ever leaving their device unless they personally initiate a transfer. *Measure:* a network capture during normal use shows zero outbound requests to any origin other than first-party assets.
- **G2 — Years-long reliability without data loss.** The system survives crashes, reloads, browser storage pressure, and version upgrades without losing or corrupting records. *Measure:* a reload after any interruption reconstructs the exact prior state; no upgrade performs a destructive in-place migration.
- **G3 — Defensible, tamper-evident documentation.** Records suitable for a benefits filing or a capacity/guardianship proceeding, where access history and the care recipient's own statements are demonstrably append-only and tamper-evident. *Measure:* altering, deleting, or truncating an audited event or a client self-report is detectable after the fact.
- **G4 — Dignity of the care recipient.** The person being cared for is a participant, not only a subject: they have a voice in the record that no one can erase, and the experience treats them with honesty rather than infantilization. *Measure:* a client-authored report cannot be deleted or edited by any role, including admin.
- **G5 — Seamless across the caregiver's real devices.** The same caregiver using an iPhone, an iPad, and a laptop gets one coherent, current view, with no server to run. *Measure:* connecting cloud sync and tapping Sync produces parity across platforms including iOS/WebKit.
- **G6 — Oregon-accurate domain content.** Caregivers receive guidance specific to Oregon's Medicaid programs and elder-law statutes, not generic advice. *Measure:* program names, eligibility framing, and statute references are present and correct for Oregon.

## 4. Non-Goals

- **NG1 — No server-side storage of personal health information.** The product **WON'T** store, process, or transmit decrypted PHI through any server, ever — not for sync, not for backup, not for "convenience." Rationale: this is the core promise; a server that can read the data is a different product.
- **NG2 — No accounts, tracking, telemetry, advertising, or analytics.** **WON'T** include any usage analytics, crash telemetry, ad SDK, or behavioral instrumentation. Rationale: privacy-first and the absence of an engagement business model.
- **NG3 — Not a clinical/EHR system or a covered-entity product.** **WON'T** position itself as a medical device or assume institutional/HIPAA-covered-entity deployment for the family-facing tool. Rationale: the user is a family, not a hospital; the compliance posture is "HIPAA-aligned hygiene," not certification.
- **NG4 — No hand-rolled cryptography.** **WON'T** implement custom cryptographic primitives; only the platform Web Crypto API. Rationale: amateur crypto is a liability, not a feature.
- **NG5 — Not multi-tenant or cloud-multi-user in the SaaS sense.** **WON'T** centralize multiple families' data in one operator-controlled store. Rationale: contradicts the trust model.
- **NG6 — Not a substitute for legal or medical advice.** **WON'T** present its Oregon content as legal advice. Rationale: it is documentation infrastructure and informational guidance, not representation.

## 5. Personas & Roles

**Primary persona — the family caregiver.** Often an adult child, frequently exhausted, not technical, using the app on a phone in spare moments. Needs speed, clarity, and the confidence that what they log is saved and private.

**The care recipient — the person with dementia.** A participant with a protected voice in the record. May use a simplified, read-mostly view to share how they feel.

**The care team — additional family or paid professionals.** Multiple people who may need a shared, current view, with different levels of access.

The system defines five roles. Access is enforced both at the UI layer and, for the client tiers, **cryptographically**:

| Role | Intended holder | Access |
|---|---|---|
| `admin` | Primary caregiver | Full; manages team, passcodes, MFA |
| `family` | Other family caregivers | Full care data per configuration |
| `carepro` | Paid professional (🩺) | Professional-scoped; eligible for MFA |
| `client-full` | Care recipient (trusted) | Full read of client-visible data |
| `client-restricted` | Care recipient (protected) | **Cryptographically** limited to a projection; cannot decrypt private domains |

`PROFESSIONAL_ROLES = {admin, carepro}`. The client tiers are the security-critical distinction and drive the two-key design in §11.

## 6. Design Tenets (binding requirements)

These are not preferences; they are requirements that constrain every other requirement.

- **T1 — Privacy is the product.** On-device, encrypted at rest, zero egress, transmit only on explicit user action. Any feature that cannot be built within this constraint is not built.
- **T2 — Honesty over reassurance.** The product states its real limitations rather than overclaiming. It never promises "zero data loss," "unbreakable," or guarantees it cannot keep. Tamper-*evidence* is described as evidence, not prevention. (This tenet governs UX copy as much as marketing.)
- **T3 — Dignity of the care recipient.** The cared-for person is treated as a participant; their voice is protected; the interface is age-appropriate and non-infantilizing.
- **T4 — Emotional honesty in UX.** The experience acknowledges the real weight of caregiving (including end-of-life) without false cheer or denial.
- **T5 — Prove safety-critical code before integrating it.** Cryptography, storage, merge, and integrity logic are validated by isolated tests before they enter the application.
- **T6 — No lockout.** The system never removes the last working authentication factor before a replacement is verified to recover the exact key.

## 7. System Context

Care Guardian **MUST** be a single-page, installable PWA that runs the entire trust boundary on the user's device. There is no application server in the trust boundary. The only network activity permitted is (a) loading first-party static assets, and (b) user-initiated synchronization of *ciphertext* to a destination the user chooses (their own cloud account, their own server, or a file they move themselves). Optional relays and cloud providers are treated as untrusted stores of opaque encrypted blobs.

---

## 8. Functional Requirements

### FR-1 — Onboarding & Identity Creation

*As a new caregiver, I want to set up the app in minutes and understand that only I can recover my data, so that I start with correct expectations.*

- **FR-1.1 (MUST)** On first run, the user creates a caregiver passcode and a client passcode; all data is encrypted under keys derived from these. No account or network call occurs.
- **FR-1.2 (MUST)** Onboarding states plainly that no one — including the operator — can reset or recover a forgotten passcode, and prompts the user to record it safely.
- **FR-1.3 (MUST)** Onboarding guides the user to durable storage with **browser-accurate** instructions: iOS → Add to Home Screen (Share sheet); Chromium → install; desktop Safari → Add to Dock; Firefox → request persistent-storage permission (no installation required). Generic, browser-inaccurate instructions are a defect.
- **FR-1.4 (SHOULD)** A first-run personalization step ("who are you caring for") may precede the dashboard and is skippable.
- *Acceptance:* Given a fresh browser, when the user completes onboarding offline, then the app is usable with no outbound network request, and the recovery-impossibility notice was shown.

### FR-2 — Authentication & Multi-Factor

*As a caregiver, I want strong sign-in that can never lock me out of my own data.*

- **FR-2.1 (MUST)** Passcode unlock derives the data key via PBKDF2-SHA-256 at **600,000** iterations and AES-256-GCM unwrap.
- **FR-2.2 (MUST)** Professional roles **MAY** enable passkey-based MFA bound to the WebAuthn PRF extension; the vault key is wrapped under a key combining the passcode and the passkey's PRF output (HKDF).
- **FR-2.3 (MUST)** Multiple passkeys are supported; a second passkey can serve as a backup factor and can replace the recovery code.
- **FR-2.4 (MUST — no-lockout invariant, T6)** Enabling or changing a factor verifies the new factor recovers the exact key **before** removing the old wrap. A failed enrollment can never produce a locked-out vault.
- **FR-2.5 (MUST)** Recovery codes provide an alternate unwrap path; the last remaining factor cannot be removed.
- **FR-2.6 (SHOULD)** On iOS, MFA guidance directs users to platform passkeys (Face ID / iCloud Keychain), which work, and away from external security keys, which do not work in iOS WebKit.

### FR-3 — Role-Based & Cryptographic Access Control

*As a caregiver, I want the care recipient to see what helps them without exposing finances, legal, or incident records — and I want that boundary to be real, not cosmetic.*

- **FR-3.1 (MUST)** The five roles in §5 gate features in the UI.
- **FR-3.2 (MUST — cryptographic scoping)** The `client-restricted` tier holds only a restricted key (DEK_R) and can decrypt only a projection of client-visible data (schedule, medications, messages, self-reports, and the wellness/cognitive/physical care domains). Private domains (legal, financial, incidents, capacity, planning) are encrypted under the full key (DEK_F), which that tier never holds. The boundary is enforced by encryption, not by hiding UI.
- **FR-3.3 (MUST)** A scoped client session cannot write to the main vault; the lowest-level storage primitives refuse such writes regardless of UI state.
- **FR-3.4 (MUST)** A scoped client session is barred from all sync and import entry points.
- *Acceptance:* Given a `client-restricted` unlock, when the session attempts to read a private domain or write the vault, then decryption fails / the write is refused; and the client's view still renders gracefully over an empty skeleton.

### FR-4 — Care Planning (Domains & Task Taxonomy)

*As a caregiver, I want to track progress across the areas of care without a misleading "percent complete" number.*

- **FR-4.1 (MUST)** Care is organized into domains (including physical, cognitive, wellness). Each domain contains sub-tasks.
- **FR-4.2 (MUST — task taxonomy)** Every sub-task is classified as **One-time** (contributes to a Foundation measure), **Recurring** (timestamped, with a configurable interval), or **Monitoring** (a 30-day freshness measure). The deprecated percent-complete model is not used.
- **FR-4.3 (MUST)** Each domain shows a dual-track visualization: a Foundation bar (one-time setup completeness) and a Care Pulse bar (recurring/monitoring freshness).
- **FR-4.4 (SHOULD)** The caregiver can override a sub-task's classification.

### FR-5 — Records Management

*As a caregiver, I want one place for the contacts, incidents, expenses, documents, medications, appointments, and messages that the situation generates.*

- **FR-5.1 (MUST)** The app manages: care contacts; incidents; expenses; a document library; a medication schedule; appointments; and team messages. Each supports create/edit where appropriate and is encrypted at rest.
- **FR-5.2 (MUST)** Creating a record never leaves it hidden behind a stale filter: saving resets the relevant list filter so the new item is visible.
- **FR-5.3 (MUST)** Photos and voice recordings attached to records are stored as encrypted binary blobs, referenced inline only by id (see FR-9.4), never inlined into the main document.
- **FR-5.4 (SHOULD)** Records support a "Care Escalation" concept (this exact term, not "Care Transition").

### FR-6 — Client Self-Reporting (the protected voice)

*As the person being cared for, I want to share how I feel, and I want my own words to be permanent — so that no one can quietly erase or change them.*

- **FR-6.1 (MUST)** Both the care recipient and caregivers can submit self-reports (mood, pain, text, optional photo/voice).
- **FR-6.2 (MUST — append-only for all roles)** A client-authored self-report cannot be deleted or edited by **any** role, including `admin`. No such code path exists; the delete control does not render on client-authored reports.
- **FR-6.3 (MUST — tamper-evidence)** Client-authored reports are joined into a hash chain (sequence number + previous-hash link + content hash). The content hash covers fingerprints of attached media, so swapping a photo is as detectable as editing text.
- **FR-6.4 (MUST)** The chain tip is anchored in the synced vault and in the client's own encrypted projection; verification runs at every unlock on both the caregiver and client sides, and surfaces a plain-language status to each.
- **FR-6.5 (MUST)** When a scoped client submits a report, it is written to an encrypted outbox and ingested into the record at the next caregiver unlock; ingestion is append-only (existing wins on id collision) and strips any caller-supplied chain or origin fields.
- *Acceptance:* Given existing client reports, when any role attempts to delete/edit one or a sync attempts to overwrite one, then the action is blocked / the existing report wins, and any out-of-band alteration is reported as a broken or truncated chain.

### FR-7 — Team Sync & Collaboration

*As a caregiver, I want my devices and my team to share one current view, as seamlessly on iPhone as on a laptop, without running a server.*

- **FR-7.1 (MUST — encryption in transit at rest)** All synchronized payloads are end-to-end encrypted with a team sync passcode before leaving the device; any destination sees only ciphertext.
- **FR-7.2 (MUST — cross-platform transport)** The primary sync method works identically on iOS, Android, Windows, and Linux. Because iOS browsers are all WebKit and lack the File System Access API, the primary method **MUST NOT** depend on it. The chosen mechanism is the user's own cloud storage over its REST API (`fetch`), which behaves the same everywhere.
- **FR-7.3 (MUST — provider support)** Cloud-storage sync supports multiple providers behind one interface, each via OAuth with PKCE (S256) and end-to-end encryption into a per-account, app-private folder: **Dropbox**, **OneDrive** (Microsoft Graph), and **Google Drive** (`drive.file`). A provider's connect option appears only when its key is configured at deploy time.
- **FR-7.4 (SHOULD — alternate transports)** Additional methods remain available: a self-hosted relay; a local synced folder via File System Access (desktop Chromium); and manual sync (download, native share sheet, clipboard) that works everywhere including iOS.
- **FR-7.5 (MUST — conflict handling)** Merges are append-only by id and ordered by a hybrid logical clock; timestamps implausibly far in the future are rejected (≤15-minute tolerance).
- **FR-7.6 (MUST — flood protection)** Every ingress path enforces layered limits: a raw-text size gate before parsing, a hard ciphertext cap (128 MB) before decryption, and a soft threshold (25 MB / 500 new records) that routes large updates to a manual review/quarantine rather than auto-merging.
- *Acceptance:* Given a connected cloud provider, when the user taps Sync on iOS and on desktop, then both devices converge to the same state; and an oversized or malformed payload is refused before it can exhaust memory or overwrite the vault.

### FR-8 — Health-Record & Document Import

*As a caregiver, I want to bring in records from portals and providers without manual re-entry.*

- **FR-8.1 (MUST)** The app imports a FHIR R4 JSON Bundle, extracting practitioners, conditions, and medications. This capability lives in the Documents area (it is an import workflow), not buried in settings, and is unavailable to read-only client sessions.
- **FR-8.2 (MUST)** A document scanner accepts PDFs and text files and extracts medications, lab results, and clinical-note sections **on-device** (bundled pdf.js); no document content is transmitted.

### FR-9 — Audit & Data Integrity

*As a caregiver who may need to demonstrate the care record's trustworthiness, I want an access history that cannot be silently altered.*

- **FR-9.1 (MUST — audit chain)** Every access to PHI and every security-relevant event is recorded in a hash-chained, encrypted audit log stored in a **separate** database from the vault. Each entry carries a sequence number, the previous entry's hash, and its own hash.
- **FR-9.2 (MUST)** The audit-chain tip is anchored both in local storage and in the synced, write-ahead-logged vault, so truncation is detectable.
- **FR-9.3 (MUST — crash-safe persistence)** The vault is stored as an A/B snapshot pair plus a write-ahead log of structural diffs; a checkpoint writes a full snapshot and flips the active pointer only after the write commits. A crash at any moment leaves a valid snapshot plus a replayable log.
- **FR-9.4 (MUST — binary partitioning + GC)** Media live in an encrypted blob store keyed by id, referenced inline only as `blobref:<id>`. A mark-and-sweep collector removes unreferenced blobs, never deletes a referenced blob, and honors a grace window to avoid racing freshly-attached media; it is disabled in scoped client sessions.
- **FR-9.5 (MUST — schema versioning)** The vault records a schema version; loading a vault written by a newer build warns the user, and migrations are never performed destructively in place.

### FR-10 — Backup & Storage Durability

*As a caregiver, I want my browser to keep my data and I want a way to back it up.*

- **FR-10.1 (MUST — durable storage)** The app requests persistent storage and exposes its status. Guidance is browser-accurate: the storage-durability request is presented as its own capability, independent of installation. On Firefox, a user-gesture button requests the persistent-storage permission; on iOS, the app directs the user to Add to Home Screen (the only effective route there).
- **FR-10.2 (MUST)** An eviction-risk warning appears when durable storage is not granted, with a one-tap path to request it (non-iOS) or the correct home-screen guidance (iOS).
- **FR-10.3 (MUST — encrypted backup/export)** The user can export an encrypted backup and re-import it. A non-PHI summary export (domain names, status, progress only) is also available.
- **FR-10.4 (SHOULD — continuous backup)** On browsers that support it, the app can continuously write an encrypted copy to a user-chosen file/folder so that storage clearing never costs records.
- **FR-10.5 (SHOULD)** A backup reminder prompts when no backup has occurred in 7+ days, and is silent while continuous backup is active.

### FR-11 — Oregon Medicaid Domain Content

*As an Oregon caregiver, I want guidance specific to my state's programs and statutes.*

- **FR-11.1 (MUST)** The app encodes Oregon-specific Medicaid programs (e.g., OSIPM, APD Waiver, ICP, OPI-M) and references relevant ORS statutes, presented as informational guidance (NG6).
- **FR-11.2 (SHOULD)** Emergency scenarios and defensible-documentation guidance are included.
- **FR-11.3 (COULD — extensibility)** Content is structured so additional state packages can be added without changing the application core.

### FR-12 — End-of-Life / After Death

*As a caregiver, I want the difficult end-of-life tasks supported with honesty, but not in my face during the years before they're needed.*

- **FR-12.1 (MUST)** An "After Death" capability exists for end-of-life tasks.
- **FR-12.2 (MUST)** It is reachable from the sidebar but **removed from the main tab bar**, because the app is used for years before that feature is needed (emotional-honesty placement, T4).

### FR-13 — Settings & Administration

*As a caregiver, I want settings that are approachable, not a wall of controls.*

- **FR-13.1 (MUST)** Settings are organized into collapsible groups, defaulting to one open group, ordered by frequency of use (Backup & sync first, then device/access, then security, then diagnostics).
- **FR-13.2 (MUST)** Settings include: state/region, passcode management, device identity & sync, security & integrity status, backup & durability, and diagnostics — each scoped to the user's role.
- **FR-13.3 (MUST)** A storage-durability control with live status and a request button is permanently available (not only via transient banners). Its status check is read-only and **MUST NOT** trigger a permission prompt; only the explicit button does.

---

## 9. Data Architecture Requirements

- **DA-1 (MUST)** Persistent data lives in three separate IndexedDB databases: the **vault** (A/B snapshots, the write-ahead log, and the encrypted blob store), the **audit** database (the hash-chained log, deliberately separate so it is not entangled with vault snapshots), and the **sync-handles** database (a File System handle for continuous backup). Wrapped keys and chain tips live in local storage.
- **DA-2 (MUST)** The vault document is encrypted as a whole; binary media never enter it (FR-9.4).
- **DA-3 (MUST)** Two encrypted projections exist for the client tier — a read projection and a write outbox — each under the restricted key.

## 10. Privacy Requirements (NFR-P)

- **NFR-P1 (MUST — zero egress)** The application makes **no** network request on its own behalf. Fonts and pdf.js are bundled; there is no external runtime caching, no CDN dependency at runtime, no analytics, no telemetry. *Acceptance:* the production build contains no references to external asset/analytics origins, and a network capture during use shows only first-party asset loads (and user-initiated sync).
- **NFR-P2 (MUST)** Synchronization and import/export are the only paths that move data off-device, and only on explicit user action.
- **NFR-P3 (MUST)** No advertising, no third-party trackers, no behavioral instrumentation (NG2).

## 11. Security & Cryptography Requirements (NFR-S)

- **NFR-S1 (MUST — primitives)** Only the platform Web Crypto API is used. Encryption is AES-256-GCM with a fresh random 96-bit IV per operation. Key derivation is PBKDF2-SHA-256 at 600,000 iterations. No custom cryptography (NG4).
- **NFR-S2 (MUST — key hierarchy)** Two data keys exist: a full key (DEK_F) and a restricted key (DEK_R). DEK_R is stored wrapped under DEK_F, so any path that recovers the full key can derive the restricted key, but never the reverse — a strictly one-way hierarchy. Caregiver, MFA, and recovery wraps protect DEK_F; the restricted client passcode wraps only DEK_R.
- **NFR-S3 (MUST — MFA binding)** When MFA is enabled, the passcode-only caregiver wrap is removed; the key is recoverable only via passcode-plus-passkey or passcode-plus-recovery-code (FR-2).
- **NFR-S4 (MUST — integrity chains)** Two independent hash chains (audit, client-voice) provide tamper-evidence, each anchored where an attacker would also have to win (FR-6, FR-9).
- **NFR-S5 (MUST — hostile-input handling)** All ingress (sync, import, outbox) is treated as hostile: pre-parse and pre-decrypt size gates, strict field whitelists with size caps, and stripping of caller-supplied integrity/origin fields (FR-7.6, FR-6.5).
- **NFR-S6 (MUST — honest limit, T2)** Documentation **MUST** state the real limit of the integrity chains: a holder of the full key who controls the device can recompute a chain. The chains provide tamper-evidence against realistic manipulation, not cryptographic non-repudiation. The product must not claim otherwise.

## 12. Reliability & Integrity Requirements (NFR-R)

- **NFR-R1 (MUST)** A reload after any interruption reconstructs the exact prior live state (FR-9.3). *Validated by isolated simulation of the diff/apply/replay pipeline across many randomized round-trips and crash/corruption scenarios.*
- **NFR-R2 (MUST)** The no-lockout invariant (T6/FR-2.4) holds across every factor-change path.
- **NFR-R3 (MUST)** Schema upgrades are never destructive in place (FR-9.5).
- **NFR-R4 (MUST — proven safety-critical code, T5)** The cryptographic, storage, merge, blob, audit, client-voice, MFA, clock, flood-control, and provider-construction logic are each covered by isolated test suites that run in continuous integration. *(The repository ships these suites; CI executes them on every change.)*

## 13. Platform & Compatibility Requirements (NFR-C)

- **NFR-C1 (MUST)** The application is an installable, offline-capable PWA built as a single self-contained front end.
- **NFR-C2 (MUST)** Core functionality, including the primary sync method, works on iOS Safari/WebKit, Android, and desktop Chromium, Safari, and Firefox — with browser-accurate guidance wherever a capability differs (install, durable storage, MFA hardware).
- **NFR-C3 (MUST)** No functionality silently fails on a platform with misleading "use a different browser" guidance; where a platform genuinely lacks a capability, the app states the truth and offers a working alternative.
- **NFR-C4 (SHOULD)** The app remains usable on a small phone screen, the primary form factor.

## 14. Accessibility & UX Requirements (NFR-UX)

- **NFR-UX1 (MUST)** Touch targets and iconography are sized for stressed, one-handed phone use; the interface avoids overwhelming density.
- **NFR-UX2 (MUST)** When the user is the care recipient, the experience is age-appropriate and non-infantilizing (T3).
- **NFR-UX3 (MUST)** Copy is emotionally honest (T4) and never overclaims (T2): durability is described truthfully, "saved" is shown only after a write commits, and difficult topics are handled with care.
- **NFR-UX4 (SHOULD)** The primary navigation is a small, fixed set (Today, Care plan, Records, Team), with rarely-needed destinations (e.g., After Death) in the sidebar.

## 15. Compliance & Legal Positioning (NFR-L)

- **NFR-L1 (MUST)** The product maintains HIPAA-aligned hygiene (encryption at rest, access logging, minimum disclosure) as good practice, while clearly **not** claiming covered-entity status or certification for the family-facing tool (NG3).
- **NFR-L2 (MUST)** The audit log and the append-only client-voice chain are designed to support defensible documentation in benefits and capacity/guardianship contexts, with their evidentiary limits stated honestly (NFR-S6).
- **NFR-L3 (MUST)** Oregon legal/Medicaid content is informational, not legal advice (NG6).

## 16. Constraints & Assumptions

- **C1** The application is delivered as a single-file front end by deliberate choice: one artifact, one hash, nothing hidden in a dependency graph — auditability over modularity. *(The architecture notes ~7,000 lines as the point to revisit this trade by splitting the crypto/storage/merge core into separately audited modules.)*
- **C2** Cloud-storage sync assumes the user has, or will create, an account with a supported provider; provider OAuth apps are registered by the deployer (keys are public client identifiers, configured at deploy time).
- **C3** The browser's persistent-storage decision is the browser's to make; the app can request, not guarantee, durability.
- **A1** The primary caregiver is non-technical and time-poor; defaults must be safe and the happy path must be short.

## 17. Known Limitations (stated honestly, per T2)

- **L1** Integrity chains are tamper-*evident*, not tamper-*proof*, against a full-key holder who controls the device (NFR-S6).
- **L2** A self-report sitting in the encrypted outbox before its first ingestion is encrypted but not yet chained.
- **L3** Cloud-storage sync via a single provider account is fully seamless for one person's own devices and for a team sharing one login; a multi-account team with separate logins still relies on a shared folder or manual/share methods.
- **L4** The one-time OAuth connect has a known iOS-installed-PWA redirect wrinkle to verify per provider; ongoing sync does not redirect.
- **L5** Backup recovery is only as strong as the backup file plus its password; possession of both is possession of the data.
- **L6** Durable storage cannot be guaranteed on iOS in a browser tab; the home-screen route is the effective path there.

## 18. Success Metrics

- **Leading:** completion of onboarding offline with zero egress (instrumented only by manual network capture, never by in-app telemetry); successful cross-platform sync convergence in device testing; all integrity/storage test suites green in CI on every change.
- **Lagging:** caregivers able to produce a coherent, tamper-evident record for a real benefits filing or family/legal proceeding; adoption by institutional licensees (e.g., CMS GUIDE participants) whose families receive the tool; absence of any data-egress or data-loss incident.

## 19. Open Questions

- **OQ1 (product/security)** The consent-based visibility mechanism for a care **navigator** (an institutional reviewer) — how an organization is granted a scoped, consented view — is not yet specified. The cryptographic role-scoping primitive (§11) is the intended foundation; the consent UX and key-distribution flow remain to be designed.
- **OQ2 (product)** Shared-folder cloud sync for multi-account teams (resolving L3) — whether to support provider shared folders or a different team-key distribution.
- **OQ3 (engineering)** Whether/when to split the single-file front end into separately audited modules (C1) once it crosses the size threshold.
- **OQ4 (security/process)** A full human security review across the multi-round cryptographic hardening remains the standing gate before professional deployment; AI-to-AI review has been productive but is not a substitute.

## 20. Out of Scope / Future

- **WON'T (this version):** server-stored PHI; accounts/telemetry/ads; covered-entity certification; multi-tenant SaaS; custom cryptography (all per §4).
- **Future (P2, designed-for-not-built):** additional state content packages (FR-11.3); additional cloud providers behind the existing interface; the care-navigator consent zone (OQ1); white-label/OEM packaging of the same core.

---

*This specification describes the obligations the shipped system meets. Where reality and this document disagree, treat it as a defect in one of them and reconcile — the source of truth for behavior is the application and its test suites; the source of truth for intent is this document and `VALUES.md`.*
