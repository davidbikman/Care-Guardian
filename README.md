# Care Guardian — Version 4

A privacy-first PWA for family caregivers managing a client with dementia. Encrypted at rest in IndexedDB, offline-capable, no server required. Supports Oregon-specific Medicaid guidance with architecture for all 50 states.

---

## What It Does

Care Guardian gives a dementia care team — family members, hired aides, the care recipient — a single private place to track progress across five care domains, coordinate shifts, log incidents, manage medications, store documents, and communicate. Every byte of data is AES-256-GCM encrypted on the device. Nothing is transmitted without explicit user action and end-to-end encryption.

## Architecture

Single-file React component (`dashboard.jsx`, ~6,120 lines) with embedded CSS. Compiles to a ~633KB production bundle (pdf.js loads as a separate lazy chunk only when a document is opened) via Vite. Deploys as a Progressive Web App installable on Android, iOS, Windows, Mac, and Linux.

**Runtime dependencies:** React 18+. Fonts (Libre Baskerville, Source Sans 3) and the PDF text-extraction engine (pdf.js) are **bundled into the build** and served from the app's own origin — there are no external/CDN requests at runtime, so the app makes zero network calls unless the user explicitly triggers sync.
**Build dependencies:** Vite, @vitejs/plugin-react, vite-plugin-pwa

## Storage Architecture (v3)

Care Guardian uses a split storage architecture designed for the full lifecycle of dementia care (8+ years, estimated 140–610MB of data):

| Store | Backend | Contents | Capacity |
|-------|---------|----------|----------|
| **Wrapped keys** | localStorage | PBKDF2-wrapped DEK (~1KB) | 5MB (uses <0.1%) |
| **Encrypted vault** | IndexedDB | AES-256-GCM encrypted care data | 1–12GB |
| **HIPAA audit log** | IndexedDB (separate DB) | Individually encrypted audit entries, separate key | 1–12GB |

**Why IndexedDB:** localStorage caps at 5MB across all browsers. Over an 8-year care lifecycle, the med admin log alone (70K+ entries) reaches 7MB. With photos (62MB), voice notes (12MB), messages (4.7MB), and the HIPAA audit trail (43MB), total data can reach 140MB in typical use and 610MB in heavy photo use. IndexedDB provides 1–12GB depending on browser, with `navigator.storage.persist()` preventing eviction.

**Migration:** On first v3 login, the app automatically migrates from the v2 localStorage vault — splitting keys from data, writing to IndexedDB, and verifying the write before deleting the old vault. The migration is transparent and irreversible.

## Binary Media Partitioning

Photos (incident and self-report attachments) and voice notes are stored **outside** the main JSON vault, in a separate encrypted IndexedDB object store, with only a small `blobref:<id>` placeholder kept inline. Each blob is encrypted with the same vault DEK (AES-256-GCM, fresh IV). This keeps the main vault JSON small, which directly addresses the write-amplification / out-of-memory risk on low-end devices: a new photo no longer bloats the snapshot, the write-ahead-log diff, or the per-save encryption — the diff contains only the reference. Blobs travel with every encrypted export, team sync, and continuous backup (inlined under a transient `_blobs` map) and are restored — re-encrypted under the importing device's key — on import and on post-eviction recovery. Deleting a record runs a mark-and-sweep that securely purges its now-unreferenced blobs (a grace window protects just-attached media; a referenced blob is never deleted — proven in tests/gc-test.mjs), so deleted media is removed from disk. Legacy inline images from older vaults continue to render and remain supported; only newly attached media is partitioned. Proven in tests/blob-test.mjs and tests/blob-roundtrip-test.mjs (ref collection, package/ingest round-trip, and a real-AES-GCM end-to-end that confirms a photo survives export→import under a different key, byte-identical, with no base64 left in the vault JSON).

## Data Durability & Recovery

**Write-ahead log (zero-loss-on-crash).** Every edit is captured as a tiny encrypted diff and appended to an append-only write-ahead log; a full encrypted snapshot is written periodically (every 25 edits or 2 minutes) to one of two ping-pong slots. On load, the active snapshot is decrypted and newer diffs are replayed on top to reconstruct the exact latest state. Because appends never overwrite, the previous async write-race (where a slower earlier save could clobber a newer one) is structurally impossible; because each edit is durable the instant its small append commits, an unclean stop — crash, OS tab-kill, power loss — recovers every edit that was acknowledged as saved. The "Saving…" indicator clears only once the append commits. The diff/replay core is proven by 200k+ round-trip and 20k replay-chain tests; the storage pipeline by crash and corrupt-snapshot simulations (see SECURITY-AUDIT-v7). Limitation: the millisecond window between an edit and its commit cannot be eliminated by any software, only minimized — which this does, ~1000× versus the old whole-vault write.


Browser storage is not permanent. Mobile browsers — Safari on iPhone and iPad in particular — can clear a site's IndexedDB when the device runs low on storage or after extended non-use, even with `navigator.storage.persist()` requested. Care Guardian treats this as a recoverable event rather than a silent catastrophe, through a layered defense:

- **Eviction detection (recovery).** On every launch the app checks for the tell-tale eviction signature: wrapped keys still present in localStorage but the encrypted vault missing from IndexedDB. When detected, it shows a clear recovery screen ("Your local data was cleared… your information is not lost if you have a backup file") instead of silently presenting a fresh-setup wizard or a misleading "wrong passcode" error. The user restores from a `.care` backup and sets new passcodes; their records are rebuilt.
- **Automatic backup reminder (Option 4).** If no encrypted backup has been made in 7+ days (or ever), an in-app banner prompts the user to download one. A downloaded `.care` file lives in the OS file system and survives browser eviction entirely — it is the universal recovery copy on every platform.
- **Continuous encrypted backup (File System Access).** On Chromium browsers (Chrome, Edge, Brave), the user can point Care Guardian at a backup file once; thereafter every data change is written, debounced and AES-256-GCM encrypted, to that file automatically. Because the File System Access API revokes write permission at the end of each browser session and only restores it via a user gesture, this is presented with a three-state status indicator — **Active**, **Paused (click Resume)**, or **Off** — rather than as invisible background sync. On reopen the app silently re-checks permission; if it lapsed (the normal case), a one-click "Resume" prompt re-authorizes it. The backup file is a standalone encrypted artifact, restorable through the same recovery screen as a manual backup.
- **Install nudge (Option 5).** On iOS browser tabs, a one-time banner recommends adding the app to the home screen, since installed PWAs receive a separate, more durable storage bucket that is far less likely to be purged. It is a recommendation, not a hard gate.

The encrypted backup is the primary durability mechanism: AES-256-GCM encrypted, containing the full dataset, able to rebuild the vault on the same or a different device. The manual `.care` download works on every platform, including iOS Safari where the File System Access API is unavailable.

## Privacy & Security

- **Encryption at rest:** AES-256-GCM with PBKDF2-HMAC-SHA256 key wrapping at **600,000 iterations** (current OWASP guidance). A random 256-bit DEK is wrapped separately with the caregiver and client passcodes. Vaults wrapped at the prior 100K iteration count are accepted on read and transparently re-wrapped at 600K the next time their passcode is used. No plaintext data on disk.
- **Split storage:** Wrapped keys in localStorage, encrypted data in IndexedDB, audit log in separate IndexedDB with independent encryption key (different PBKDF2 salt).
- **Multi-factor sign-in (opt-in, professional roles):** Admin and Care Professional roles can enable a WebAuthn passkey as a required second factor. The vault key is wrapped under a key derived from **both** the passcode and the passkey's PRF output, so neither factor alone can decrypt. Multiple PRF-bound passkeys can be registered (e.g., a phone biometric plus a hardware security key kept in a safe), each independently wrapping the DEK; with two or more registered, the printed recovery code can be removed entirely. A printed one-time recovery code (itself bound to passcode + code, with UI guidance to store it separately from the device) is the default backstop for single-authenticator users if the passkey or device is lost. Enabling MFA verifies both new factors recover the exact key before the passcode-only wrap is removed. The key-combination core is proven in tests/mfa-core-test.mjs (passcode-alone cannot bypass; both factors required; recovery is two-factor). Note: the WebAuthn ceremony itself requires an authenticator and is validated in-browser, not in the headless test suite.
- **Audit-log tamper-evidence:** Each audit entry is hash-chained to the previous one (entry N's hash covers its content plus N−1's hash), so deleting or altering any entry is detectable on review; a Settings indicator shows the verification result. The chain tip is also persisted inside the encrypted, WAL-backed, synced vault, so silently truncating the tail of the log mismatches the vault anchor and is flagged. This is tamper-evidence, not absolute prevention — a holder of the passcode could recompute the chain, which would require an external append-only anchor to defeat.
- **Eviction-risk warning:** The app checks `navigator.storage.persisted()` and warns the user when durable storage has not been granted (common on iOS), prompting a backup and home-screen install rather than letting data sit silently at risk.
- **Persistent storage:** `navigator.storage.persist()` requests browser exemption from automatic eviction.
- **Storage monitoring:** Quota tracking with usage/capacity display and 80% warning.
- **Session timeout:** 15 minutes of inactivity clears DEK and audit key from memory.
- **Rate limiting:** Exponential backoff after 8 failed auth attempts.
- **Input validation:** Schema validation, text sanitization (52 call sites), photo MIME validation, photo import validation, array size limits, future-timestamp rejection.
- **Permission-guarded operations:** All 6 delete functions, all export functions, and all sensitive operations check `can()` before executing.
- **Seven security audits completed** (v1–v7, the latest a dedicated review of the write-ahead-log durability path). All Critical and High findings resolved.
- **HIPAA technical safeguards** implemented per §164.312(a)–(e). Compliance statement available.

## Cryptographic Role Scoping (client-restricted tier)

The supported-client ("client-restricted") passcode no longer unlocks the full vault. Two keys exist: the full key (DEK_F, held by caregiver, MFA, and recovery wraps exactly as before) and a restricted-zone key (DEK_R) stored wrapped under DEK_F — any path that recovers the full key derives the restricted key, never the reverse. A restricted client's passcode wraps DEK_R alone, which decrypts only an encrypted projection of client-visible data: appointments, medications, messages, self-reports, care shifts, and the physical/cognitive/wellness care domains. Legal, financial, incident, capacity, planning, and document data are encrypted under the key that passcode does not hold. The scoped session writes self-reports (with media, encrypted under the restricted key) to an encrypted outbox that the next caregiver session ingests, sanitizes, and persists through the normal crash-safe pipeline; it never writes vault snapshots, the write-ahead log, or the audit chain. The independent tier ("client-full") (the person managing their own care) keeps full-key access. Migration is automatic: a caregiver unlock creates the restricted key and projection; the client's next sign-in permanently downgrades their wrap to the scoped key. Intra-caregiver role distinctions (admin, family, care professional) remain interface-level; all caregiver roles decrypt the same data. The scoped-key-plus-projection pattern generalizes to future consent zones such as care-navigator access. Proven in tests/zone-core-test.mjs (16 assertions, real PBKDF2-600k + AES-GCM).

## Client Voice Protection — Append-Only Self-Reports

Client-authored self-reports are permanent. No role — including admin — can delete or edit them: the application contains no code path for it, the delete control does not render on them, and a blocked attempt explains why. Each client report is marked with its origin at creation and, at ingestion, joined to a hash chain (the same construction as the audit log): every report carries a sequence number, the previous report's hash, and its own hash over the full content including hashes of any attached photos or voice recordings, so swapping media is as detectable as editing text. The chain tip is anchored in the synced, WAL-protected vault and in the client's encrypted projection. Verification runs at every unlock. Caregivers see a "Client voice protection" row in Security & Integrity, and a failed verification is escalated into the permanent audit log. The client's Self Report tab shows a permanence line only when the chain verifies; on failure the line is not shown, and the alarm goes to caregivers and the audit log instead (see Privacy Principle 10). Caregiver-authored reports remain deletable under the existing role rules; merges are append-only by id, so a crafted import cannot replace a client's words. The outbox itself is treated as hostile input: its raw ciphertext size is checked before any decrypt or parse (an oversized outbox is quarantined unread and surfaced for review, preventing an out-of-memory crash at caregiver login), and each report passes a strict field whitelist at ingestion that caps sizes and strips any pre-set chain or origin fields. Scoped client sessions are additionally barred from every vault-write primitive by a hard module-level lock — snapshots, write-ahead log, and legacy writes refuse at the function level, independent of UI gating — and from all sync and import entry points. Limitations: a report sitting in the encrypted outbox before its first ingestion is protected by encryption but not yet chained, and a full-key holder who controls the device can recompute the chain — this provides tamper-evidence, not non-repudiation. Proven in tests/srchain-test.mjs (12 assertions: alteration, media swap, head/middle/tail deletion, merge attack, idempotence).

## Multi-Factor Authentication — Platform Notes

PRF-bound MFA depends on the WebAuthn PRF extension, whose support varies by platform (verified mid-2026): Android and desktop Chrome/Edge have solid support; **iOS/iPadOS Safari supports PRF via platform passkeys (Face ID / iCloud Keychain) but does not support it with external FIDO2 security keys** (so on iPhone/iPad, use the device's platform passkey, not a hardware key); desktop Safari supports platform authenticators but has open WebKit bugs affecting CTAP2 hardware keys. If an authenticator lacks PRF, enrollment aborts cleanly with no changes and guidance to use a PRF-capable authenticator or continue without MFA. The WebAuthn ceremony itself is validated only on real devices, not in the test harness.

## Sync Safety — Flood Circuit Breaker

Because the merge is a serverless append-only union, a compromised or runaway device could append tens of thousands of records and balloon the vault until honest devices run out of memory while decrypting or merging. Incoming sync data passes two gates: a hard pre-decrypt cap (a payload above 128 MB is refused before it is decrypted), and a soft threshold (an update that adds more than 500 records, or exceeds 25 MB, is routed to the merge-review screen with a prominent warning instead of being applied automatically). Legitimate syncs stay well below the hard cap; a large but genuine photo batch prompts a review rather than being blocked. Thresholds are proven in tests/sync-flood-test.mjs.

## Schema Versioning & Migration Policy

The vault carries a `schemaVersion` stamp. On load, a vault written by a newer app build than the one running is detected and the user is warned not to make changes (so an out-of-date device on a mixed-version team cannot silently clobber newer data). The forward-looking migration policy is **never migrate the primary vault in place**: the existing A/B snapshot mechanism already writes a new snapshot to the inactive slot, verifies the AES-GCM authentication tag on read-back, and only then flips the active-slot pointer — so a future schema migration writes the transformed data to the inactive slot, validates it, and atomically swaps, never leaving a half-migrated or corrupted vault.

## HIPAA Compliance

Technical safeguards implemented:
- **§164.312(a) Access Controls:** Unique user identification (deviceId), automatic logoff (15 min), encryption at rest (AES-256-GCM)
- **§164.312(b) Audit Controls:** HIPAA audit log in separate IndexedDB — records login/logout/failed auth, PHI access (14 view types), PHI creation/modification/deletion, all exports, all sync operations, integrity checks. Up to 1,000 entries. Exportable as CSV.
- **§164.312(c) Integrity:** SHA-256 vault integrity verification. AES-GCM authenticated encryption detects tampering.
- **§164.312(d) Authentication:** Two-passcode system with role-based access derivation.
- **§164.312(e) Transmission:** HTTPS enforced for sync. End-to-end AES-256-GCM encryption. Private IPs blocked.
- **Conflict resolution under clock skew:** Mutable shared records (care shifts) are merged using a **Hybrid Logical Clock** rather than raw wall-clock timestamps, so a device with a misconfigured clock can't break causal ordering. A future-timestamp guard refuses to let a remote stamp dated more than 15 minutes ahead overwrite a record — preventing a future-dated stamp from permanently winning conflicts — and surfaces any such rejected records in the merge report. The clock is device-local; only per-record stamps sync. Proven in tests/hlc-test.mjs.

See `HIPAA-COMPLIANCE.md` for full mapping and organizational responsibility guidance.

## Deployment Hardening (institutional hosts)

Serve over HTTPS with HSTS. Set a restrictive Content-Security-Policy at the host level (the static bundle does not include one): `default-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https:; style-src 'self' 'unsafe-inline'` — the inline-style allowance is required by the single-file design. Add `X-Content-Type-Options: nosniff` and a restrictive `Referrer-Policy`. On shared computers, advise users to fully close the tab after locking; JavaScript cannot zeroize memory, so a page teardown is the strongest local hygiene.

## Verification & Test Suites

Safety-critical logic is proven in isolated, runnable suites (in `tests/`, run with `node tests/<file>`; all pass together): `wal-test`/`wal-core` (200k+ diff/apply round-trips, 20k replay chains) and `wal-sim` (crash and corrupt-snapshot pipeline simulation); `audit-chain-test` (tamper, deletion, truncation, recompute-limit); `hlc-test` (causal ordering, future-stamp DoS rejection); `mfa-core-test` (both factors required, multi-passkey, recovery is two-factor); `blob-test` and `blob-roundtrip-test` (real-AES-GCM media round-trip across different keys); `gc-test` (referenced blobs never deleted, orphans purged); `sync-flood-test` (hard and soft breaker thresholds); `zone-core-test` (scoped key cannot decrypt the private zone, one-way hierarchy, projection/outbox round-trip); and `srchain-test` (client-voice chain integrity plus outbox sanitizer hardening). What the harness cannot exercise is documented where relevant: the WebAuthn ceremony requires a real authenticator and is validated on devices, not headlessly.

## Hub-and-Spoke Navigation

Four bottom-bar hubs replace the previous 21-tab layout. Maximum depth: 3 taps to any feature.

| Hub | Contents |
|-----|----------|
| **☀ Today** | Smart dashboard with proactive reminders, medication alerts, appointment previews, overdue task warnings, caregiver burnout alerts, quick actions (log incident, shift handoff, emergency card, self-report, caregiver check-in) |
| **♥ Care plan** | Strategic overview grid, 5 care domains, legal/financial, escalation triggers, tracking, visit prep, emergency plans, POA decision log, capacity observations, care plan binder, end-of-life planning |
| **📁 Records** | Incidents, incident patterns, medication admin, expenses, documents, contacts, calendar, shifts |
| **👥 Team** | Messages, sync, self-reports, settings (HIPAA audit log, data integrity, storage monitoring, notifications), help |

## Proactive Reminder Engine

The Today hub computes time-aware reminders on every render:

- **Missed medications** — past their time window (Morning 6–10, Midday 10–13, Afternoon 13–17, Evening 17–20, Bedtime 20–23)
- **Medications due now** — in the current window
- **Upcoming medications** — next window within the hour
- **Upcoming appointments** — within 48 hours
- **Overdue recurring tasks** — past their interval
- **Tasks due this week** — approaching their interval
- **Caregiver burnout alert** — no respite in 14+ days
- **Sync overdue** — 7+ days since last sync

Optional browser notifications (Notification API) check every 15 minutes for due medications.

## Universal Search

🔍 in the top bar searches across 27 feature keywords AND all stored data: incidents, contacts, documents, medications, messages, expenses, self-reports, and POA decisions. Real-time filtering, grouped results, direct navigation.

## Tiered Access System

| Role | Access | Passcode |
|------|--------|----------|
| **Admin** 👑 | Full access. Manages team, settings, passcodes. | Caregiver |
| **Family** 👨‍👩‍👧 | Full view. Add, edit, export. No team/settings management. | Caregiver |
| **Care Professional** 🩺 | Health domains only. Log incidents, med admin, shifts, messages. No legal, financial, export, or delete. | Caregiver |
| **Client (Independent)** 🟢 | Full view including legal/financial. Export. Self-reports. | Client |
| **Client (Supported)** 🛡 | Self-reports, messages, schedule, medications, care domains — via a cryptographically scoped key that cannot decrypt anything else (see Cryptographic Role Scoping). | Client |

## Usability & Accessibility

UI icons (navigation, hub tiles, tab bar, controls) are sized ~30% larger than typical defaults for legibility. Saving an incident, expense, contact, or document resets that list's filter to "All" so the new record is visible. The app uses emotionally honest language ("Care Escalation" rather than euphemism), keeps After-Death planning accessible but low-profile, and reports "Saved" only after the write commits.

## Complete Feature List

### Care Domains
- 5 domains, 50 goals, ~346 typed sub-tasks (Oregon) or ~300 (Generic)
- Strategic overview grid with dual-track progress (Foundation + Care Pulse)
- Auto-computed health status
- Sub-task edit, remove with restore, type override, custom sub-tasks

### Clinical Tools
- **Incident Log** — 9 types, 4 severity levels, photo attachments (3 max, 2MB each, MIME validated), structured fields
- **Incident Pattern Visualization** — type/severity distribution, time-of-day histogram, weekly trend
- **Medication Admin Log** — daily grid, 6 time slots, tap-to-cycle, start dates, discontinued meds archived with restore
- **Document Scanner** — client-side PDF extraction (pdf.js, bundled locally, lazy-loaded), ~200 drug + lab result parsers
- **Document Library** — 10 categories, stored content, full viewer
- **Self-Reports** — 6 types (text, voice, mood, pain, sleep, concern), photo attachments, individual deletion with permission guard, storage warning, CSV/text export, print
- **Visit Prep Summary** — auto-generated from all data
- **Emergency Action Plans** — 6 editable scenario cards
- **Care Escalation Triggers** — 12 monitored conditions
- **Emergency Info Card** — printable wallet card with diagnoses, meds, contacts, directive status

### Legal & Documentation
- **POA Decision Log** — 7 decision types, 3 urgency levels, 6 structured fields (decision, reasoning, known wishes, consulted, outcome, agent), exportable, included in binder
- **Capacity Documentation** — 12 functional areas × 5-level scale, timestamped history, assessor tracking
- **Care Plan Binder** — comprehensive printable document compiled from all data including POA decisions and capacity assessments

### Coordination
- **Team Management** — create/join teams, invite codes (no API key), role assignment, roster sync (cap 20, names sanitized)
- **Messages** — team-integrated chat with avatar/role display
- **Shift Handoff Summary** — incidents since last sync, pending meds, messages, domain alerts
- **Shift Schedule** — 7×7 weekly grid
- **Contacts** — custom fields, categories, vCard import
- **Calendar** — month view, appointment CRUD

### Caregiver Support
- **Caregiver Wellness** — stress/sleep/hours tracking, respite monitoring, burnout alerts
- **Proactive Reminders** — medication timing, recurring tasks, appointments
- **Browser Notifications** — optional, checks every 15 minutes

### Data & Security
- v3 IndexedDB storage (1–12GB capacity, persistent storage, quota monitoring)
- Encryption at rest (DEK + key wrapping, AES-256-GCM, PBKDF2 600K)
- HIPAA audit log (separate IndexedDB, separate encryption key, 10 action types)
- Data integrity verification (SHA-256 hash)
- 5-tier access control with permission-guarded delete and export operations
- Sync lock (forced sync after 14 days or 50 changes)
- Photo validation (MIME type, size, import sanitization)
- Encrypted export/import with merge engine and post-merge summary
- FHIR R4 import
- Automatic v2→v3 migration with verification

## State-Specific Content

Oregon is the first state package (~346 sub-tasks with ORS citations, OSIPM thresholds, APD/ICP programs). Generic mode provides ~300 universal sub-tasks. Architecture supports additional state packages.

## Team & Sync

- **Cloud folder sync** — File System Access API, shared cloud folder
- **Self-hosted server** — `sync-server.js` (169 lines, zero dependencies)
- **Manual** — clipboard, file, URL import
- **Merge engine** — append-only union for incidents/expenses/messages/self-reports/capacity/POA/wellness, most-recent-wins for domains, Hybrid-Logical-Clock ordering with a 15-minute future-stamp guard for care shifts, and a flood circuit breaker on all ingress (see Sync Safety)
- **Sync lock** — forces sync after 14 days or 50 unsynced changes

## File Inventory

| File | Description |
|------|-------------|
| `src/App.jsx` | Single-file React component (~6,120 lines) |
| `dist/` | Production build output (deploy this folder) |
| `sync-server/` | Self-hosted sync relay + Docker files |
| `DEPLOY.md` | Deployment guide |
| `README.md` | This file |
| `HELP.md` | User-facing guide |
| `VALUES.md` | Consumer-facing values statement |
| `PRIVACY-PRINCIPLES.md` | Ten published privacy principles for caregiving software |
| `HIPAA-COMPLIANCE.md` | HIPAA technical safeguards mapping |
| `SECURITY-AUDIT-v2..v8.md` | Security audit history (v7: write-ahead log; v8: full architectural review & self-audit) |
| `CHANGES-SINCE-REVIEW.md` | Running external-review brief (7 rounds, all findings addressed) |
| `CRYPTO-ROLES-DESIGN.md` | Cryptographic role-scoping design & decision record |
| `tests/` | 11 isolated proof suites (run with `node tests/<file>`) |

## Deployment

Upload `dist/` to any static host (Netlify, GitHub Pages, Vercel, Cloudflare Pages). See `DEPLOY.md`.

## Version History

| Version | Storage | Key Changes |
|---------|---------|-------------|
| v1 | `demcare-v9` (localStorage, plaintext) | Initial build, ~1,811 lines |
| v2 | `demcare-vault-v2` (localStorage, encrypted) | Encryption at rest, tiered access, team management, hub navigation, ~3,400 lines |
| v3 | `demcare-keys-v3` (localStorage) + IndexedDB | **Current.** IndexedDB vault (1–12GB), HIPAA audit log, proactive reminders, universal search, POA decisions, capacity documentation, care plan binder, photo attachments, caregiver wellness, storage monitoring, 4 security audits. ~4,371 lines. |
| v3.x hardening campaign | (same stores) + `blobs`, `proj-r`, `outbox-r` keys | Write-ahead-log durability; PBKDF2 600k; zero-egress bundling; hash-chained audit log with vault anchor; HLC merge ordering; PRF-bound multi-passkey MFA with recovery codes; binary media partitioning + secure-deletion GC; sync-flood circuit breaker; schema-version guard; cryptographic role scoping (client-restricted tier); append-only, hash-chained client self-reports; outbox hardening; scoped-session write lock. Seven external review rounds, all findings addressed. ~6,120 lines. |
