# Care Guardian — Changes Since Your Last Review

**Purpose:** This brief responds to your prior security review and lists what changed, so you can re-assess. Please treat it as a fresh red-team target, not a checklist to confirm — in particular, the new cryptographic surface (sections marked ★) is the highest-value place to push.

**Context for fairness:** This codebase was built primarily with one model, so an independent second-model review is exactly the cross-check it needs. Several changes below are new since you last looked and have **not** yet been independently reviewed.

---

## Summary

| # | Your finding | Status | One-line change |
|---|---|---|---|
| 3 | PBKDF2 100k inadequate | Fixed | Raised to 600,000 (OWASP), versioned with transparent re-wrap |
| 4 | Google Fonts + pdf.js CDN egress | Fixed | Both bundled locally; zero external requests at runtime |
| 8 | Audit log not tamper-evident | Fixed (with stated limit) | Hash-chained entries + chain verification UI |
| 2 | iOS eviction silent data loss | Mitigated | Detection + recovery existed; added `persisted()` warning |
| 5 | Clock-skew most-recent-wins DoS | Fixed ★ | Hybrid Logical Clock + future-timestamp guard |
| 6 | No MFA for professional roles | Implemented ★ | Opt-in, role-scoped, PRF-bound passkeys + recovery code |
| 7 | Monolithic vault write-amplification / OOM | Fixed ★ | Binary blobs partitioned to a separate encrypted store |
| — | AES-GCM nonce management | Already correct | Fresh random 96-bit IV per encryption, confirmed |
| — | Write-race on save | Already fixed | Resolved by the write-ahead-log work (pre-dates your review) |

---

## Detail

**#3 — PBKDF2 → 600,000.** Applied to DEK wrapping, `.care` backup encryption, and the audit-log key. Migration is transparent: unwrap tries 600k then the legacy 100k, and a key still at 100k is re-wrapped at 600k on next use. *Verify:* iteration constant, the legacy-fallback unwrap, and that no path silently keeps 100k after a successful login.

**#4 — Zero egress.** Fonts now bundled via `@fontsource`; pdf.js via `pdfjs-dist`, lazy-loaded as a same-origin chunk. *Verify:* grep the built `dist/` for `fonts.googleapis`, `fonts.gstatic`, `cdnjs` (should be absent). Remaining `https://` strings in the bundle are non-egress (a sync-provider name in UI text, React/core-js error & license strings).

**#8 — Audit hash-chain.** Each entry carries `seq` + `prevHash`; its hash covers content + the link. Verification runs on unlock and surfaces in Settings → Security & Integrity; a stored chain tip detects tail-truncation. **Stated limitation (please confirm it's adequately disclosed):** a holder of the passcode can recompute the whole chain, so this is tamper-*evidence* against partial edits, not prevention. True non-repudiation needs an external append-only anchor; the docs say so and recommend exporting/archiving the log.

**#2 — Eviction.** Detection (recovery screen instead of silent reset), encrypted `.care` backup with reminder, install nudge, and continuous file-handle backup were already present. Added: active `navigator.storage.persisted()` check that warns when durable storage isn't granted. *Verify:* the warning path and that recovery restores both vault and blobs.

**#5 ★ — Clock skew.** Care shifts (the only mutable shared records) are merged by a Hybrid Logical Clock (device-local; only per-record stamps sync), giving causal ordering under honest skew. A guard rejects any remote stamp dated too far ahead of local time — **15 minutes** in the shipped code (initially 24h; tightened in Round 2 below) — closing the "set clock to 2035, win forever" DoS; rejected records are reported in the merge preview. *Verify:* the comparison + the `FUTURE_TOL` value, the receive-advance, and the legacy `lastModified` fallback. Note this does not prevent a *within-tolerance* skew from winning — bounded by design.

**#6 ★ — MFA (PRF-bound passkeys).** Opt-in, only offered to professional roles (Admin, Care Professional). The vault key is wrapped under a key derived from **both** the passcode and the passkey's WebAuthn PRF output (HKDF-combined), so the passcode alone — even with the wrapped key extracted — cannot decrypt. A one-time printed recovery code (bound to passcode + code, i.e. itself two-factor) is the device-loss backstop. **Safety property to check:** enrollment verifies both new factors round-trip to the exact DEK *before* the passcode-only wrap is removed, so a failed setup cannot lock the user out; disabling requires passcode + passkey. *Verify:* the key-combination scheme, the enrollment commit ordering, and that the recovery code isn't a single-factor bypass.

**#7 ★ — Binary partitioning.** Photos and voice notes moved to a separate encrypted IndexedDB store; only `blobref:<id>` placeholders remain inline, so the JSON vault (and thus snapshots, WAL diffs, per-save encryption) stays small. Blobs are inlined into every export/sync/backup and restored — re-encrypted under the importer's key — on import/recovery. *Verify:* that **all** serialization and import paths carry blobs (a missed path = lost photo), the pre-auth recovery path (blobs written under the newly generated key), and the legacy-inline fallback.

---

## What was tested, and what was not

Safety-critical logic was proven in isolated runnable tests (in `tests/`, all passing): diff/apply/replay for the WAL (200k+ round-trips, 20k replay chains) and a full crash/corruption pipeline simulation; the audit hash-chain (tamper, deletion, truncation, and the recompute-limit); the HLC (causal ordering, DoS rejection); the MFA key-combination core (both factors required, no passcode-only bypass, recovery is two-factor); and binary partitioning (ref collection, package/ingest, and a real-AES-GCM end-to-end across two different keys).

**Not unit-tested:** the WebAuthn ceremony itself (create/get with the PRF extension) requires a real authenticator and is validated only in-browser. A real-device pass (iPhone Face ID + a desktop security key) is pending. The crypto the security depends on *is* tested; the browser API calls are not.

## One factual note (for accuracy)

The prior review described the 2025/2026 HIPAA Security Rule MFA requirement as finalized. As of mid-2026 it appears to remain a **proposed** rule (NPRM) — OCR has not issued a final rule, and the expected spring-2026 finalization window passed without one. The MFA work was done anyway because it's a de-facto baseline expectation, but the "mandatory law" framing may be premature; please sanity-check against your own sources.

## How to review

Load `dashboard.jsx` (or `src/App.jsx` — identical), `README.md`, and `HIPAA-COMPLIANCE.md`. The `tests/` folder contains the runnable proofs (`node tests/<file>`). Highest-value scrutiny: the new crypto in #5/#6/#7 and the import/recovery paths for #7.

## Known open items (already disclosed)

- Within-tolerance clock skew can still win a shift conflict (now bounded to 15 min; full prevention would need per-record signing).
- MFA is per-installation by design (the passkey binds to the device's authenticator).

---

# Round 2 — responses to your second assessment

Thank you for the second pass. All four findings are addressed below; each change is covered by a runnable test in `tests/` and the full suite passes together.

**(HIGH) Orphaned-blob secure-deletion — fixed.** Agreed it's a data-retention flaw, not just space. Deleting an incident or self-report now runs a mark-and-sweep: it recomputes the referenced-blob set from the live vault (recursive scan, so a ref anywhere is honored) and purges any blob not referenced. A short grace window protects just-attached blobs whose ref hasn't been persisted yet, and a sweep also runs after each unlock to clear cross-session orphans (e.g., from a crash between blob-write and state-save). A referenced blob is never deleted. *Verify:* tests/gc-test.mjs (referenced-never-deleted, orphans purged, grace honored, deep-nested ref protected). *Residual:* GC is triggered on delete and on unlock rather than continuously, so an orphan can persist until the next such event.

**(HIGH) Recovery-code insider bypass — mitigated as far as the model allows; please sanity-check the tradeoff.** You're right that recovery-code + known passcode bypasses the passkey. This is intrinsic to *having* a device-loss backstop — eliminating it reintroduces the lockout-equals-data-loss failure we deliberately avoided. We added friction and explicit guidance: the enrollment screen now warns to store the code away from the device (password manager or locked location), and enabling MFA is gated behind a checkbox affirming separate, secure storage; the regenerated-code screen repeats the guidance. We did **not** make the recovery code optional (removing it = lockout risk). Open question for you: would you prefer we offer an *advanced* option to register a second passkey as the backstop instead of a printed code (no paper attack surface, but no help for single-authenticator users)? We can add it if you think it's worth the complexity.

**(MEDIUM) HLC tolerance too permissive — fixed.** Future-tolerance guard reduced from 24h to **15 minutes** (~96× smaller attack window). HLC stamps use epoch milliseconds, which are timezone-independent, so honest devices on NTP rarely skew beyond seconds; 15 min tolerates a dead-battery clock reset without inviting abuse. Records beyond tolerance are rejected from overwriting and surfaced as "flagged" in the merge preview. *Verify:* the `FUTURE_TOL` constant and the merge report path.

**(MEDIUM) Audit tail-truncation — fixed via your suggested vault anchor.** The chain tip (seq + hash) is now persisted inside the encrypted, WAL-backed, **synced** vault (in addition to localStorage), written on lock and on app-hide. Verification compares the recomputed chain tip against the vault anchor: if the log's tip is behind the anchor's seq (tail removed) or the hash at the anchored seq differs (entry replaced), it's flagged as truncated even though the shortened chain recomputes cleanly. Rolling back the log alone now mismatches the vault — and, on a synced team, other devices' copies. *Verify:* verifyAuditChain's anchor comparison and where the tip is written into settings. *Residual:* the anchor is refreshed on lock/hide, not per-event, so it bounds (does not eliminate) within-session truncation before the first hide; the per-event localStorage tip still covers that window for a local attacker who doesn't also rewrite the vault.

**Your question — fallback when an authenticator lacks PRF.** PRF support can't be reliably detected before creating a credential, so enrollment creates the passkey, then immediately does a `get()` to fetch the PRF output. If no PRF result comes back, enrollment **aborts cleanly with no changes** — the passcode-only wrap is never removed, so there's no lockout — and shows an actionable message: the just-created passkey is unused and can be removed from the device's passkey settings, and the user should either try a PRF-capable authenticator (modern phone/laptop biometric, or a FIDO2 key with hmac-secret) or continue without MFA. We deliberately do **not** fall back to a non-PRF "UI-gate" passkey, since that wouldn't be encryption-bound and would be security theater. The only residual is the orphaned credential on the authenticator, which we can't delete programmatically (no WebAuthn API for it) — hence the guidance to remove it manually.

---

# Round 3 — responses to your third assessment

Both items you raised, plus your performance question.

**Second passkey backstop — implemented.** MFA now supports multiple PRF-bound passkeys. The wrapped-keys store holds an array; each passkey independently wraps the DEK under passcode + its own PRF output (shared salt, distinct outputs). Adding a backup requires the passcode confirmed by tapping an existing passkey (so a new wrap can't be built under a wrong passcode), then registering the new key; both are verified to round-trip to the exact DEK before saving. Once two or more passkeys exist, an advanced control removes the paper recovery code entirely — closing the physical insider-threat path you flagged — with a confirm warning that losing all passkeys then means no recovery. Single-authenticator users keep the recovery code. The login screen lists all credentials in one assertion and selects the wrap matching whichever key answered. *Verify:* tests/mfa-core-test.mjs now covers two passkeys wrapping one DEK, cross-key isolation, 2-factor preservation, and passkey-only (recovery-removed) operation. Caveat unchanged: the WebAuthn ceremony itself still needs real-device testing.

**GC performance / UI pause — addressed.** Good catch. Both GC triggers (post-delete and post-unlock) now run via `requestIdleCallback` (with a short `setTimeout` fallback), so the recursive ref-scan executes during browser idle time rather than inside the delete handler or on the unlock paint path. The scan is also inherently light *because* of binary partitioning — the JSON vault it walks no longer contains base64 payloads, only text and short `blobref:` strings — so even a large record count is a few milliseconds, and it no longer competes with interaction on memory-constrained devices. *Residual:* a delete still feels instant (state updates synchronously); the actual blob purge completes a moment later during idle, which is the correct tradeoff.

Everything re-verified together: 8 isolated proof suites pass (WAL round-trip + pipeline, audit-chain, HLC, MFA core incl. multi-passkey, blob core + round-trip, GC).

---

# Round 4 — responses to your final ("final boss") assessment

Thanks for the sign-off. Two of the three are implemented; the third (Apple PRF) is a platform fact I verified and want to correct for you.

**1. Safari/iOS WebAuthn PRF — corrected with current data.** I checked the present state rather than rely on the "historically bleeding-edge" framing, and the situation as of mid-2026 is actually the reverse of the YubiKey-on-iOS suggestion: **iOS/iPadOS Safari supports the PRF extension via platform passkeys (Face ID / iCloud Keychain), but does *not* support it with external FIDO2 security keys.** (Sources: Yubico's PRF developer guide — "the WebAuthn prf extension doesn't work with YubiKeys in Safari" on iOS; an Apple developer-forum thread confirming PRF results return on iPhone 15 / iOS 18.4.1 via the platform authenticator; and a 2026 PRF-support roundup noting iOS mirrors macOS with PRF working through iCloud Keychain, external keys not yet implemented.) Desktop Chrome/Edge and Android are solid; desktop Safari has two open WebKit bugs (311099, 314934) affecting CTAP2 hardware keys. So the right professional-iOS guidance is the opposite of a hardware-key mandate: **on iPhone/iPad, use the platform passkey (Face ID); reserve hardware keys for desktop/Android.** Documented in README ("MFA — Platform Notes"); the clean-abort already covers any authenticator that still lacks PRF. Real-device validation is still pending and now has accurate expectations (iPhone Face ID should pass).

**2. Append-only sync flood — circuit breaker implemented.** Incoming sync/import data now passes two gates before it can touch the merge: a **hard pre-decrypt cap** — a payload over 128 MB is refused before it is ever decrypted, so the 800 MB OOM-brick scenario can't even be parsed — and a **soft threshold** — an update adding more than 500 records, or exceeding 25 MB, is routed to the existing merge-review/quarantine screen with a prominent "unusually large update from [device] — not applied automatically" warning, instead of being auto-merged. This is wired into all three ingress paths (cloud-folder pull, pasted/file sync, and encrypted import). Legitimate syncs auto-apply; a genuine large photo batch gets a one-tap review rather than a block. *Verify:* tests/sync-flood-test.mjs (800 MB hard-refused, 50k-record flood routed to review, normal syncs unaffected, boundary cases). *Residual:* thresholds are heuristic; a determined attacker could stay just under 500 records per sync, but each such sync is still surfaced in the merge report and is far from an OOM.

**3. Single-blob schema migration — policy + guard.** Agreed: never migrate in place. The vault now carries a `schemaVersion` stamp, and on load a vault written by a *newer* app build than the one running is detected and the user warned not to make changes — closing the mixed-version-team clobber path. The deeper "temp store → verify tag → atomic swap" requirement is already satisfied by the existing A/B snapshot engine (write inactive slot → verify AES-GCM tag on read-back → flip pointer), so a future v4 migration writes transformed data to the inactive slot, validates, and swaps atomically, never leaving a half-migrated vault. Documented in README ("Schema Versioning & Migration Policy").

All nine isolated proof suites pass together: WAL round-trip + crash/corruption pipeline, audit-chain, HLC, MFA core (incl. multi-passkey), blob core + round-trip, GC, and the new sync-flood breaker. The remaining gate is real-device PRF validation, which is a testing step, not a design change.

---

# Round 5 — new cryptographic surface: please red-team this

This round is not a response to findings — it is a request. We implemented **cryptographic role scoping** for the client-restricted tier (resolving the audit's R-1 within the limits crypto can enforce), and it is exactly the kind of new key-handling surface your reviews have been most valuable on.

**What changed.** Two keys now exist: DEK_F (full — held by caregiver, MFA, and recovery wraps, formats unchanged) and DEK_R (restricted zone), stored wrapped under DEK_F so any full-key path derives it, one-way down. A client-restricted passcode wraps DEK_R only; it decrypts an encrypted projection (appointments, meds, messages, self-reports, care shifts, three care domains, whitelisted settings) and nothing else — incidents, finances, legal, capacity, POA, documents, the audit chain, and the vault itself are under the key it does not hold. Scoped sessions write self-reports to an encrypted outbox under DEK_R; the next caregiver unlock sanitizes and ingests them through the normal WAL pipeline (the outbox is cleared only at the next crash-safe checkpoint; re-ingestion is deduplicated, so a crash loses nothing). Scoped sessions never write snapshots, WAL, or audit entries. Blob packaging/ingestion is zone-aware so client media travels in backups and survives import readable by the client. Migration: caregiver unlock creates DEK_R + projection; the client's next sign-in permanently downgrades their wrap.

**Highest-value attack surfaces, in our view.** (1) The save-routing gate: convince a scoped session to write the vault/WAL anyway. (2) The projection allowlist: find a private field that leaks through `projectClientState` (it is allowlist-based — roots, three domain keys, five settings fields). (3) The lazy downgrade: the one transitional client unlock that briefly holds DEK_F before re-wrapping to DEK_R — ordering and failure modes. (4) Key-lifecycle rewrites: every place `wk` is rebuilt must carry `rUnderF`/`clientScope` forward — our own walk-through caught all four MFA flows dropping them (which would have orphaned the projection, outbox, and client media, and locked the client out); we fixed those, and a fresh pair of eyes should hunt for a fifth. (5) The outbox as an injection channel: ingestion sanitizes via the same validators as imports, capped at 200 reports — is that enough?

**Stated limits (please confirm the docs are honest).** This enforces *read access* for the client-restricted tier only. Intra-caregiver roles remain UI-level — cryptography cannot make readers behave. It does not protect against a restricted user who learns a caregiver passcode. Client-full keeps full-key access by design. The projection is refreshed on checkpoint/flush/lock, so client-view freshness has the same cadence as vault durability.

Verification: tests/zone-core-test.mjs (16 assertions, real PBKDF2-600k + AES-GCM: scoped key cannot decrypt the private zone; one-way hierarchy; projection excludes private roots and settings; outbox round-trip; opaque carry-forward; MFA-bundle compatibility). All ten suites pass together.

---

# Round 6 — client voice protection (new integrity surface, please review)

Client-authored self-reports are now **append-only for every role, including admin**: no delete/edit path exists in the app, and out-of-band tampering is made evident by a hash chain (audit-log construction: seq + prevHash + content hash, where content includes hashes of attached media so a swapped photo breaks the chain like edited text). The tip anchors in the synced vault AND in the client's encrypted projection; verification runs at every unlock on both the caregiver side (Security & Integrity row) and the client side (a plain-language status on their own tab). Origin is stamped at creation; outbox contents are force-marked client-origin at ingestion; merges remain append-only by id so a crafted same-id import cannot replace a client's words (tested). *Verify:* tests/srchain-test.mjs (12 assertions), the origin-marking path, and whether any state-mutation path we missed can still touch a chained report. *Honest limits:* a report in the outbox before first ingestion is encrypted but not yet chained; a full-key holder can recompute the whole chain (same disclosed class as the audit log).

---

# Round 7 — responses to your role-scoping red-team

Per our standing practice, each finding was verified against the shipped code before acting. Two are real and are fixed; three describe code paths that don't exist in this architecture — but each of those received a hard defense-in-depth gate anyway, because "the UI doesn't expose it" is precisely the class of enforcement this project stopped trusting.

**(CRITICAL claimed) Blind-relay sync overwrite — path does not exist; hard gates added anyway.** There is no auto-sync: every sync and import is a manual action in settings UI that scoped sessions don't have, and a scoped session never calls any vault-write function. So no code receives a remote payload in a scoped session, blindly or otherwise. Per your recommendation's second branch (which matches the shipped design), scoped sessions sync nothing and only ever write their projection and outbox. To make that structural rather than situational: all four data-movement entry points (cloud sync, text/file pull, encrypted import, full replace) now refuse at function entry in scoped sessions, independent of UI.

**(HIGH claimed) Outbox ID collision into private collections — impossible by construction; the adjacent real injection fixed.** Ingestion writes to exactly one collection: `selfReports`. An outbox item carrying a financial record's UUID lands in `selfReports` as a self-report; it cannot reach, replace, or corrupt any private collection, and same-id collisions within `selfReports` are dropped (append-only, existing wins — tested). However, your instinct about the outbox as an injection channel found something you didn't name: a crafted outbox report with **pre-set chain fields** (`srSeq`/`srHash`) would be treated as already-chained and corrupt chain verification — a false-tampering DoS against the client-voice feature. Fixed with a strict per-report whitelist at ingestion: only known fields survive, sizes are capped (text 20k chars, media formats validated, hashes must be well-formed sha256 hex), and chain/origin fields are stripped and re-derived. Tested (crafted report with forged chain fields, fake origin, 3MB text, junk fields, and `javascript:` audio: everything hostile stripped; the sanitized report chains fresh and verifies).

**(HIGH claimed) .care import downgrade bypass — mechanism does not exist.** Backups contain data only (`{...data}` plus export metadata); no key wraps are ever exported, so an old `.care` cannot "restore localStorage keys" or reinstate a `DEK_F` wrap. The import pipeline decrypts data with the backup password and merges — it never touches the key object. The true residual is the one inherent to backup-based recovery and already documented: *possession of a backup file plus its password is possession of the data.* The pre-auth recovery flow will rebuild a full vault for anyone holding both — that's key disclosure, not a scope bypass, and backup passwords are caregiver credentials. The new entry gates also bar scoped sessions from all import paths regardless.

**(HIGH) Outbox OOM bombing — fully valid, fixed.** Exactly the Round-4 lesson reapplied: the 200-report cap ran after parse, and ingestion runs during caregiver unlock — a bypassing client (who legitimately holds DEK_R) could craft a giant outbox and turn every caregiver login into an OOM crash. Now the encrypted outbox's raw ciphertext size is checked **before any decrypt or parse** (8 MB cap; legitimate outboxes are kilobytes since media are blobrefs). Oversized → quarantined unread, flagged in Security & Integrity with an explicit review-and-discard action, audit-logged, and unlock proceeds normally. No persistent DoS. *Verify:* the `outboxStatus` pre-check ordering and the threshold test.

**(MEDIUM) Save-routing gate hard assertion — implemented, stronger than requested.** Your scenario's premise is slightly off — in a scoped session `dekRef` holds DEK_R, not null, so a stray write would have been well-formed ciphertext under the wrong key (recoverable via the A/B fallback, but still wrong). The fix is the one you asked for, placed lower than asked: a module-level scoped-session write lock, set for the lifetime of a scoped session, asserted inside `saveSnapshot`, `walAppend`, `walPrune`, and `saveVaultData` themselves — and the shared IndexedDB put is key-whitelisted so a locked session can write only the projection and outbox keys. No stray effect, race, or future code path can route around it, because the primitives refuse.

**Your key-lifecycle question — checked; that flow was already correct.** The caregiver-changes-client-passcode path spreads the existing key object (`{...keysObj.wk}`, carrying `rUnderF` forward) and then wraps tier-aware: restricted → wraps DEK_R and sets `clientScope:"r"`; independent → wraps DEK_F and clears the scope flag. Verified in code this round; it cannot produce the malformed states you describe. Your push to find a fifth rewrite site was the right instinct — it's how we caught the four MFA flows — but this one was built tier-aware from the start.

All eleven proof suites pass together, including the extended self-report suite (chain integrity + outbox hardening).

---

# Design revision (post–Round 7): client-facing tamper warning removed

Round 6 described a client-side warning shown when chain verification fails ("your past updates may have been altered… tell someone you trust"). On domain review, that display was judged harmful to its audience and cryptographically non-additive, and has been removed. The reasoning: the warning's audience is a person with persistent confusion, in whom paranoid ideation about family interference is a common symptom — a system message validating that frame is a clinical harm, not a safeguard; the suggested action is circular (the most likely tamperer is the trusted person); and the display carried no guarantee — the chain, vault anchor, and projection anchor do the protecting. What replaced it: the client sees the reassuring permanence line only when the chain verifies and nothing when it doesn't (no false reassurance, no alarm), while a failed verification now escalates into the permanent, hash-chained audit log at caregiver unlock in addition to the Security & Integrity row. Residual accepted: in a single-caregiver household, lazy (non-recomputing) tampering loses its only client-visible witness; that adversary was already mostly out of scope per the disclosed recompute limit, and the audit-log escalation leaves more durable evidence than the removed display did.

---

# Bug fix (found via first-run reproduction harness): startup eviction false-positive

The startup eviction check called only the legacy vault reader, while the passcode-entry probe checks all four storage locations (legacy blob, walmeta, snapA, snapB). A WAL-era vault whose legacy blob was partially evicted — a real iOS behavior — would show the "your local data was cleared" recovery screen over an intact, recoverable vault, inviting the user to wipe good data. Fixed by making the startup probe match the four-way check. Also added: a "Forgot passcode?" path from the unlock screen into the recovery flow (with copy specific to that case and a destructive-action confirmation), and `completeSetup` now wipes stale old-key stores before writing a new vault, so starting fresh or restoring over an intact old vault cannot leave undecryptable snapshots behind. Verified by a new jsdom harness (tests/firstrun-test.cjs) that renders the real app and walks all three scenarios: pristine origin → setup wizard; keys + WAL-era vault → unlock; forgot-passcode → erase → setup.

---

# Data, backup & sharing reorganization (post–first-run fix)

The data-related surface had accreted into something only its author could navigate: backup, durable storage, device identity, and three differently-named "sync" things were scattered across four locations, with no mental model tying them together, and a no-PHI "Summary Export" sitting in the backup group that no one understood. This round reorganized the whole surface around three plain questions a caregiver actually asks, and added the export capability the app was missing. Research-first, as standing practice: two no-change turns produced an IA diagnosis and phone-openable mockups before any code moved.

**The Settings header is now "Three Steps to Protect Your Data"** — a plain checklist replacing the old "how safe is your data" status panel. (1) *Protect your data from deletion by your browser* — shows Done/Not-Done and, when Not-Done, the Protect button right in the panel, because it's one tap (on iOS it shows the Add-to-Home-Screen instruction instead). (2) *Back up your data in a .care file* — Done when a backup exists or continuous backup is active. (3) *If you're caregiving with others, establish a Team…* — Done when a team is set up. Per the product decision, only Step 1 carries an inline button; Steps 2 and 3 are short flows reached through their sections below, so the panel shows their status and nothing more.

**Everything regrouped under three intent-named groups.** "🛟 Keep your records safe" now holds durable storage (promoted out of Diagnostics, where it was buried) plus the two backup functions, renamed to kill the "sync" ambiguity — "Continuous Backup" → *Automatic backups (Step 2)*, "Encrypted Backup & Sync" → *Save or restore a .care file (Step 2)*. The word "sync" no longer names three different things; it now means only what a **Team** does (Team Sync remains its own dedicated view). "📤 Bring records in, share records out" is new, and "🧾 Diagnostics" is now just statistics.

**"Share your records" — the new export capability.** The app could encrypt-export everything (app-only ciphertext) and emit a no-PHI summary blob, but neither let a caregiver hand a parent's records to a new doctor. The new tool is a scope × format matrix: pick what to include (medications, conditions & notes, providers, appointments, incidents, care-plan status — independently toggleable) and a format — **PDF** (built via the browser's own Print → Save as PDF: zero dependency, zero egress, real document quality) for a person to read, or **structured FHIR R4** for another clinic's system to load, the natural symmetry to the FHIR import already present. The old no-PHI summary survives as one honest choice here ("Send a status update — no health info") instead of a mystery button in the backup group.

**Honest guardrails, not false promises.** Both share formats produce *unencrypted* files by design — that's the point, since the recipient isn't running Care Guardian — so the tool warns plainly ("…it's a medical record. Only send it to someone you trust") and points to the encrypted `.care` backup as the secure path for transfers between Care Guardian installs. Password-protected PDF was dropped rather than faked: it isn't achievable through print-to-PDF, and the encrypted backup already serves that need. The FHIR export is deliberately scoped to the mappings that are clean (Patient, Practitioner-per-contact, MedicationStatement-per-med); conditions live as free-text notes and export in the PDF, not as fabricated structured Condition resources.

The new export logic is proven by an isolated suite (tests/share-export-test.mjs, 11 assertions): FHIR Bundle shape and per-resource cardinality, Patient references, dosage composition, graceful degradation on missing fields, scope exclusion, and HTML/XSS escaping of the patient name and free text. All twelve proof suites pass together; the app rebuilds clean on Vite.

---

# Consent-based visibility for external care navigators (OQ1) — per-institution

The keystone of the institutional-sales track: a way to grant an outside party — a CMS GUIDE care navigator, or a program reviewer — a **scoped, consented, revocable** view of on-device, encrypted data, without a Care Guardian server and without exposing the care recipient's protected voice. Specced first (CONSENT-VISIBILITY-DESIGN.md + a phone consent-UX mockup) over a no-code turn, then built. Per the product decision, this is **per-institution**: one program keypair per institution, families consent to the institution by name, and individual navigators work through the institution's reviewer mode.

**The crypto is an extension of the existing role-scoping primitive, not a new invention.** The vault already had a one-way key hierarchy (DEK_R wrapped *under* DEK_F), the project-then-encrypt pattern (`proj-r`), reusable HKDF→AES-GCM wrap helpers, and a design comment explicitly anticipating "future consent zones (e.g., care-navigator access)." The one genuinely new primitive is **asymmetric key agreement (ECDH P-256)**, needed to reach a party who isn't on the family's devices. Each push generates a fresh ephemeral data key, encrypts a scope-parameterized projection under it, and wraps that key to the institution's *public* key via ECDH-ES (ECDH → HKDF → AES-GCM, reusing the existing wrap). The scope manifest is bound as AES-GCM additional-authenticated-data, so a projection cannot be re-presented under a falsified scope. Because the family pushes a fresh bundle each time, the data key is **ephemeral per push** — there is no new persistent secret on the family side, and the only static secret is a *private* key the institution custodies, never on the family's devices.

**Two archetypes, one machine.** A *care navigator* receives a scoped-PHI view (care-plan status, recent incidents, medication-adherence summary, upcoming appointments, caregiver-flagged concerns — each independently toggleable down by the family). A *program reviewer* receives a **no-PHI** engagement view (last-active, care-plan health by domain, backup/team status) — the billing-justification wedge for GUIDE, and the easiest grant to get families comfortable with. The verbatim client self-report chain is **never** referenced by either projection.

**The consent UX carries the values.** A new "Share with a care program" view walks enrollment → consent. The consent screen shows who (with the institution's public-key fingerprint and a "matches the paperwork?" confirmation that blocks a swapped-key impersonator), what they'll see (each category a toggle), what they explicitly won't (the parent's private words, financials, documents), a real expiry date, a plain "snapshot not live" explanation, and an authority attestation. A non-dismissible indicator sits atop Settings whenever a grant is active — the family is reminded, never expected to remember. Revocation is honest: it stops future updates and says plainly that information already seen can't be pulled back. Every grant, refresh, and revocation lands in the hash-chained audit log.

**Reviewer mode** (the institution side) is a separate boot path that bypasses family setup/lock entirely: it generates one program keypair, exports enrollment codes (navigator + reviewer) carrying the public key and fingerprint, and opens a family's sealed `.cgshare` file with the private key — decrypting and rendering the scoped projection read-only, with the manifest stated on screen ("seeing: …" / "Not shared: …").

**Transport is file-based in v1** (the family exports a sealed `.cgshare`; it reaches the institution via a shared folder or hand-off; reviewer mode opens it) — deliberately, to keep Care Guardian serverless and the loop demonstrable end-to-end now. Live cloud-intake push (reusing the existing `CLOUD_PROVIDERS` abstraction, institution storage holding ciphertext only) is the next increment.

**Proof before integration, as standing practice.** The ECDH-ES core was proven in isolation *before* any app code (tests/grant-core-test.mjs): round-trip, fail-closed on a wrong/rotated key, per-push freshness, AAD scope-binding, stable key-distinct fingerprints, and keypair-bound shared secrets. The same suite now also proves the **projection invariants** against a fixture salted with a sentinel "verbatim voice" string: the navigator projection never contains it (or any sentinel-tagged private field), carries only whitelisted fields per category, drops categories turned off, and the reviewer projection contains no PHI at all. The helpers ported into the app are the proven helpers verbatim. All 15 isolated suites pass together; the app rebuilds clean on Vite; every new string is confirmed present in the shipped bundle. **The asymmetric layer is new cryptographic surface and must be part of the standing full human security review before any institutional deployment** — and the *authority to consent* for a person with diminished capacity remains a legal question the app records (attestation) but does not adjudicate.

---

# Live cloud-intake push (consent-grant transport, v2)

The OQ1 build shipped with file-based transport: the family exported a sealed `.cgshare` and handed it over. This round adds the **live** path — the family's app delivers the sealed bundle to institution-controlled storage that holds **only ciphertext**, reusing the cloud-provider seam, with no Care Guardian server. Specced first (TRANSPORT-INTAKE-DESIGN.md + a wireframe of the two new surfaces), then built. The crypto, the projection, and the consent model are untouched; the new surface is concentrated entirely in transport.

**The hard part was accounts, not crypto.** Team Sync pushes to `cloudAuth` — the family's *own* cloud account, with the family holding the OAuth tokens. An institution's storage is a destination the family has no account on, so `cloudStorageSync()` can't be aimed at it. The answer keeps the seam's shape (a new `INTAKE_BACKENDS` map with `push`/`list`/`get` mirroring the providers' `upload`/`download`) but swaps what `auth` means: the family writes with a **write-only, prefix-scoped capability the institution issues**, obtained by a one-time **claim** on first push. Write (family, scoped, no read) and read (institution, its own storage credential in reviewer mode) are cleanly separated. Two backends ship: an HTTPS intake endpoint (primary, a clean REST contract the institution implements) and presigned object storage (sign-then-PUT); both are plain `fetch`.

**Containment proven in isolation first, per standing rule.** Before any app wiring, `tests/intake-core-test.mjs` proved the transport against a mock store enforcing the capability semantics: the data plane holds **ciphertext only** (a sentinel plaintext never appears in a stored object), a write capability **cannot read or list or write another family's prefix**, versioned objects are selected newest-**valid**-wins with **fail-closed fallback** when the newest is poisoned, a replayed/older object never supersedes a newer one, re-pushing unchanged content is idempotent (no new object), and the one-time claim **cannot be reused or escalated to read** while rotation invalidates the old capability. Thirteen assertions, all green; the helpers ported into the app are the proven helpers. All sixteen isolated suites pass together and the app rebuilds clean.

**Pushes ride the user's sync action — never a background daemon.** A best-effort `pushAllAutoGrants()` fires after a successful cloud team-sync (and from explicit "Send now" buttons), so transmission stays tied to a deliberate user act. **Auto-push is opt-in per grant** with **manual as the default**: the consent screen, when an enrollment offers live intake, adds a plain choice — "Only when I choose" (a file you send) vs "Automatically when I sync" — and the standing indicator and the program view show the auto/manual state with one-tap Send now and Switch-to-manual. Idempotent re-push (a content hash skips unchanged state) avoids needless objects. Every push is audit-logged.

**Reviewer mode gains a connected intake.** The institution enters its storage read credential once (stored locally, with the same custody caveat as the program key), then "Refresh shared views" lists a roster of the families who granted a view with each one's freshness, and Open pulls the latest **valid** object and runs the existing decrypt-and-render — stale entries flagged, anything that doesn't verify skipped. Manual `.cgshare` paste remains as a fallback and for institutions not running intake.

**Honest boundaries.** This is the first recurring egress in the app to a party other than the family's own cloud; the mitigations are explicit and stated in the UX (user-initiated timing, per-grant opt-in, end-to-end ciphertext, one-tap off, manual export never removed). Two things cannot be exercised in this environment and are flagged for David: the **network path itself** (the `fetch` calls against a real bucket/endpoint) is unverified here — only its containment *logic* is proven against the mock; and the reviewer's **read credential and the program private key** still need to move behind a reviewer passcode/OS keystore before real deployment. The new egress path and the asymmetric layer remain part of the standing full human security review.

---

# Auto-push default for institutional pitch + real intake endpoint (network path now exercised)

Two follow-ups to the live-intake build: the pitch default, and closing the network-path testing gap with a real endpoint instead of a mock.

**Auto-push now defaults to ON when a program offers live intake.** Previously the safe default was manual (a file you send). For an institutional context — where the whole point is the program receives updates — the consent step now pre-selects "Automatically when I sync" whenever the enrollment code carries intake config; the "(default)" marker moved to that option. The manual choice is still right there and one tap away, the explanation that updates send on each sync is still shown, and grants from programs *without* intake config still default to manual. So it is opt-out of auto, with the choice and the consequence fully visible at consent — not a silent change. The conservative posture (user-initiated sync timing, E2E ciphertext, one-tap to manual or off, manual export never removed) is unchanged; only the pre-selection moved.

**A deployable reference intake endpoint ships** (`intake-server.cjs` / in the package at `intake-server/server.cjs`). It is the institution's side — the data plane (ciphertext object storage) plus a minimal control plane (one-time claim tokens → write-only prefix-scoped capabilities, reviewer read caps, rotation) — implementing the exact HTTPS wire contract `INTAKE_BACKENDS.https` speaks. It is dependency-free Node and enforces the capability semantics server-side: write-only caps, prefix scoping, capability epochs for rotation, path-traversal rejection, object-size caps, and CORS preflight so the browser path works. It holds ciphertext only; it never has a program key. A README covers running it, minting a per-family claim token (which goes into the enrollment code's `intake.claim`), minting reviewer read caps, and the production caveats (back capabilities with a real store, objects with real object storage + TLS, lock `ALLOW_ORIGIN`).

**The network path is now exercised against that endpoint over real HTTP** (`intake-integration-test.mjs`). Crucially, the test does not re-implement the client — it **extracts the app's actual `INTAKE_BACKENDS.https` (and `intakeObjectName`) verbatim from the built source** and drives those exact bytes against the running reference server on loopback. Seventeen assertions, all green: claim → versioned push → list → get → decrypt round-trips; ciphertext-only at rest (a sentinel plaintext never lands in a stored object); fail-closed selection when the newest object is poisoned; every capability negative (write cap can't read/list/cross-prefix-write, read cap can't write); one-time-claim reuse rejected; oversized rejected (413); path traversal rejected (400); CORS preflight; and rotation invalidating the old write cap.

**The integration test immediately earned its keep — it caught a real bug.** Object names were built from the bundle's `pushNonce`, which is base64 and can contain `+`, `/`, `=` — all invalid in object keys and URL paths, so every real push would have failed with a 400 the mock store could never have surfaced (the mock never exercised path semantics). Fixed in `intakeObjectName`: the filename nonce is now stripped to a URL/key-safe alphanumeric slice, while the bundle keeps its full `pushNonce` for the crypto. Re-verified end-to-end.

**What this does and doesn't close.** The HTTPS backend's network path — the app's real `fetch` calls, the wire contract, the server-side capability enforcement — is now genuinely exercised, not mocked. Still open and flagged: the **presigned object-storage backend** has its own sign-then-PUT round-trip that this reference (HTTPS) endpoint doesn't cover, so a real bucket still needs its own check; the reviewer read credential and program private key still need to move behind a reviewer passcode/OS keystore; and the reference server is exactly that — a reference whose internals (in-memory caps, local-disk objects) must be swapped for production-grade storage. The asymmetric layer and the recurring-egress path remain in scope for the full human security review.

---

# Audit-log durability — Layer 0 (the 6-year log now rides the encrypted backup)

The HIPAA audit log was tamper-evident but lived only in the local `care-guardian-audit` IndexedDB — confirmed in the code that `readAuditLog` was referenced solely by the unlock/verify path, never by any export payload or sync body. So deleting the app (or losing the device) destroyed the 6-year record, with manual CSV as the only escape. Layer 0 (per AUDIT-DURABILITY-DESIGN.md) makes the log ride the encrypted backup so device loss can't destroy it.

**Proven first, in isolation (standing rule).** `tests/audit-backup-test.mjs` mirrors the app's exact canonical entry form, hash-chain checks, and `encryptData`/`decryptData`, then proves the round-trip: export → encrypt → wipe → decrypt → restore reproduces every entry byte-identically with the chain verifying end-to-end; the encrypted backup leaks no plaintext audit detail; re-restoring is idempotent (keyed by id); a tampered restored entry is detected at its `seq`; and a corrupted backup or wrong passcode fails closed. Ten assertions, all green. All 18 isolated suites pass together; the app rebuilds clean.

**What shipped.** The audit log is now included in both backup writers — the manual `.care` export and the continuous File-System-Access auto-backup — as an `_audit` block inside the already-encrypted payload (encrypted under the family's own key, to the family's own destination; fully within zero-egress). The continuous backup re-reads the log only when it has actually grown (a count-keyed cache), so it doesn't pay the decrypt cost every write. On the restore side, the **recovery flow** — the primary device-loss path — now derives the audit key during setup and restores the log into the freshly-wiped audit DB, then refreshes state so the chain continues seamlessly; the **merge-import** path restores it too. The stale-backup reminder now names the activity log among what a backup protects.

**A latent bug fixed as a side effect.** `completeSetup` never derived the audit key, so `hipaaAudit` (which no-ops without it) silently dropped the post-setup "Vault restored" entry and, for fresh installs, every action until the next unlock. Deriving the key in `completeSetup` fixes that — actions are now audited immediately after setup, not just after a later sign-in.

**Scope decision, stated plainly.** Layer 0 covers the *backup* path only — manual export and continuous backup — **not** the multi-device sync payloads. That is deliberate: the audit chain is a single `seq` space, and merging two devices' chains in a shared sync file would corrupt verification (overlapping `seq`, last-write-wins). Backup is a point-in-time, per-device snapshot, so it's chain-clean. Durable *institutional* retention and proper *per-device* audit streams are Layer 1's `audit/{deviceId}/` design — which also gives the append-only "external anchor" that upgrades tamper-evidence to tamper-resistance.

**Honest residuals.** (1) A pre-existing `handleFullReplace` import handler is defined but wired to no button, so it's dead code (esbuild drops it); the live import is the merge path. Worth wiring or removing separately — not introduced here. (2) A family who never backs up and uses no sync still has no durability — durability needs *some* off-device copy; Layer 0 makes backup carry the log and nudges on staleness, but can't conjure persistence from one device. (3) Cross-device *merge* import writes entries by id (idempotent for your own backup; coexisting for another device's) — verification of mixed-device chains is properly handled by Layer 1's per-device streams, not Layer 0. (4) The covered-entity / institutional-retention question (Layer 1) remains your decision.

---

# Shared-scope audit chain — model (B): the institution sees only what it's party to

Decision (David): the external health-care organization is **not** the covered entity; the app and the data it creates stay under the family's control. So instead of streaming the family's whole activity log (model A, with redaction), we built **model (B)** — a separate, self-contained audit chain containing **only shared-scope events** (grant created, update sent, sharing changed, sharing stopped), per institution. The family's full local log never leaves.

**Why (B) is the stronger privacy posture, proven.** Because the stream contains only sharing events, there is nothing private in it to leak — redaction is moot. More subtly, the shared chain's `seq` counts **only sharing events**, so the institution cannot infer the *volume* of private activity either (model A's redacted chain still leaks "42 things happened"; (B) leaks nothing). `tests/shared-audit-test.mjs` proves this in isolation (14 assertions): no private event/content/volume ever appears in any shared chain; each chain verifies independently from seq 1; per-institution isolation (institution X's chain says nothing about Y); tamper/interior-gap/tail-truncation classification; and ciphertext-only streamed entries. `tests/shared-audit-integration-test.mjs` then drives the app's **real** transport client against the running reference endpoint (5 assertions): the reviewer lists→gets→opens→verifies the chain over real HTTP, the roster correctly excludes the audit subfolder, and a poisoned entry surfaces as a missing-sequence **gap** (fail-closed), not silent loss. All 20 isolated suites pass; clean rebuild.

**What shipped (family side).** A separate `care-guardian-shared` store holds the per-grant chains, encrypted under the family's audit key, rebuilt on unlock and after recovery. Each grant event appends one entry (`grant.created` / `update.sent` / `sharing.changed` / `grant.revoked`) with a non-private summary (what was shared, when), and — for live grants — immediately seals it to the program key and pushes it to `{grantPrefix}audit/` over the proven intake transport. The chains ride the family's encrypted backup (`_sharedAudit` block) and are restored on recovery and merge, exactly like the main log — so the family controls and retains them.

**What shipped (institution side, Layer 2).** Reviewer mode pulls the `audit/` subfolder for an opened family, decrypts each entry, verifies the chain end-to-end, and shows a **Shared-activity record** panel: the verified timeline plus a status chip — Verified, Tampering detected, Missing entry (gap), or Unconfirmed tail.

**The reviewer's four amendments, resolved.** (1) *Redaction paradox* — moot under (B): nothing private is in the stream, so there's nothing to redact and no chain to break. (The salted-commitment analysis for model A is recorded in the design doc in case the covered-entity question is ever revisited.) (2) *Lost-device race* — every shared event flushes **immediately** on creation (these events *are* the critical ones); if offline, the entry is written locally and re-pushed on the next sync via `flushSharedAudit` (idempotent), and the institution tracks the last-received seq so an unconfirmed tail is *visible* rather than silently lost — the honest guarantee, not a blocking write that would break offline-first. (3) *Seq vs. time gaps* — `verifySharedChain` flags only mathematical sequence breaks: an interior gap is a definitive compliance failure, a missing tail is "unconfirmed," and time gaps are never flagged (the chain holds only events, so inactivity simply produces no entries). (4) *Device revocation* — a fired caregiver's device is cut off at the endpoint, not by changing the family passcode (which doesn't touch the write capability): the intake endpoint's capability **rotation** (already proven, assertion 17) invalidates that device's write cap, and the per-grant prefix bounds any pre-revocation garbage to that one device's own stream.

**Honest residuals.** The offline window before an entry is acknowledged by append-only storage is real and is stated as such (tamper-resistance resumes once the batch clears). True write-once-read-many for the institution's copy still wants object-lock on the audit prefix (the reference endpoint documents this). And streaming requires a live grant; for file-based grants the shared chain is kept locally and rides the family's backup (exportable), but isn't pushed — there's no endpoint to push to.

---

# Hardening the institution's copy: object-lock (WORM) on the audit prefix + device revocation as a roster action

Two endpoint changes that close the last two honest residuals on the shared-audit path. Both are proven against the running reference server over real HTTP (`tests/intake-worm-revoke-test.mjs`, 17 assertions); the full suite is now **21 green**, app rebuilds clean.

**Object-lock (WORM) on the `audit/` subfolder.** Until now the institution's copy of the shared-audit chain was tamper-*evident* (the reviewer's verify catches alteration) but not tamper-*resistant* — nothing stopped the institution's own storage from being rewritten. The endpoint now treats any object under an `audit/` segment as **write-once**: the first write wins, and any later PUT to that key is refused and the original stands (the API returns `{ok:true, immutable:true}` so an honest re-push during sync is a clean idempotent no-op, while a rewrite attempt simply has no effect). To make write-once-by-key actually bite, the app now names audit objects **deterministically per sequence** (`audit/000000007.cgaudit`, no nonce) — so a rewrite targets the same key and is caught, and the flush that re-sends the tail can't accidentally fan out into duplicate objects. WORM is scoped to `audit/` only; projection snapshots remain overwritable as before. The test confirms: original preserved after a tampering PUT, idempotent re-push, and non-audit objects still mutable.

**Device revocation as a roster action.** This is the concrete answer to review amendment 4 (a removed caregiver's device keeps its write capability). The endpoint gains an admin roster action — `POST /admin/revoke {prefix}` (plus `/admin/reinstate` and `GET /admin/revocations`) — that hard-blocks a device's prefix: future writes are refused with 403 **even when the capability is still cryptographically valid**, and the revoked prefix **cannot be re-claimed** (a fresh device can't slip back in). Crucially, revocation blocks *writes only* — the institution keeps full read access to the record it already holds — and is **scoped to the named prefix**, so other families/devices are untouched. The end-to-end workflow: the family stops sharing in the app → the `grant.revoked` entry streams into the institution's Shared-activity record → the institution's roster system calls `/admin/revoke` for that grant's prefix. (The family never holds the admin token; revocation is the institution's action on its own endpoint, which is correct — a rogue device would never honestly revoke itself.)

**Honest residuals that remain.** The reference enforces write-once at the API, but it can't stop someone with direct disk/bucket access from editing storage underneath it — for a real deployment the audit prefix should be backed by **S3 Object Lock in compliance mode** (or equivalent) so even the storage operator can't alter or delete entries before retention expires; the README now says so. The revocation list is in-memory in the reference and must be **persisted** in production (alongside the caps and claim-tokens, which were already flagged). And the pre-acknowledgement offline window is unchanged: an entry created offline isn't under WORM until it reaches the endpoint, which is stated plainly.

---

# Reviewer keystore: the program key and read cap no longer sit in plaintext

The reviewer (institution) side held two secrets in plaintext `localStorage`: the **program private key** — which decrypts every enrolled family's sealed bundle *and* their shared-audit chain — and the **intake read capability**, which lists and pulls every object. On a shared institutional machine (or via any XSS, or a stolen disk image) both were there for the taking. They are now sealed at rest.

**What shipped.** A reviewer **keystore**: `{program, intake}` is sealed under a strong random vault key (AES-256-GCM); the vault key is wrapped under the reviewer's **passcode** (always) and, optionally, under a **passkey's PRF output** (the institutional-desktop "OS keystore" path — the same WebAuthn/PRF mechanism the app already uses for family MFA, which is well-supported on desktop Chrome/Edge and platform passkeys). `localStorage` now holds only ciphertext under `cg-reviewer-vault` — no key, no read cap, not even the institution name in the clear. The crypto reuses the already-vetted `encryptData`/`decryptData`/`buildPasskeyWrap`/`unwrapWithPasskey` primitives; nothing was hand-rolled.

**Behavior.** Entering reviewer mode now shows an **unlock** screen (passcode, or "Unlock with passkey" when one is registered); secrets land in memory only after unlock. A **Lock** button clears them from memory on demand, and Exit does the same. Creating program keys now requires setting a passcode, and the key is sealed from the moment it exists. Connecting or disconnecting intake re-seals the vault under the same session key (no re-prompt). An opt-in flow lets a reviewer **add a passkey** as a second factor on a device — it verifies the typed passcode actually opens the vault before binding, so a typo can't create an unusable wrap, and unlock-with-passkey requires *both* the passkey and the passcode (neither alone suffices).

**Migration.** Existing installs that still have the old plaintext `cg-reviewer-program` / `cg-reviewer-intake` get a one-time **"Secure your program keys"** screen: set a passcode → the keys are sealed into the vault and the **plaintext copies are deleted**. Until they do, reviewer mode stays gated (no bundles can be opened), so nothing silently keeps running on unprotected keys.

**Proven.** `tests/reviewer-vault-test.mjs` extracts the **real** vault functions + crypto cluster verbatim from `src/App.jsx` and asserts (10): passcode round-trip recovers the key + cap exactly; the stored blob contains no plaintext scalar/cap/name; wrong passcode fails closed; tampering with either the sealed payload or the passcode wrap is caught; re-seal stays openable; the passkey path opens with passcode + correct PRF and fails if *either* factor is wrong; the passcode still works after a passkey is added; and no plaintext appears even with the passkey wrap present. (PRF output is simulated as fixed bytes — the wrap math is identical to a live authenticator's; the real passkey assertion still needs the same on-device QA already flagged for family MFA: works on desktop Chrome/Edge and iOS platform passkeys; desktop Safari has the known WebKit PRF bugs.) Full suite is now **22 green**, app rebuilds clean, every keystore string confirmed in the bundle and zero plaintext-write paths remain.

**Honest residual.** A forgotten reviewer passcode is unrecoverable by design — the keys can only be discarded and a new program key started (families re-enroll). The keystore protects data at rest on the device; it is not a substitute for the still-pending full human security review of the whole reviewer/intake path.

---

# Housekeeping: dead full-replace handler removed + the presigned intake backend is now proven

Two cleanups that close long-standing flags. Full suite is now **23 green**, app rebuilds clean.

**Removed the dead `handleFullReplace` import handler.** It was defined but wired to no button, so esbuild had been tree-shaking it for many builds (its own strings never reached the bundle — confirmed). It's been flagged across several sessions as "wire or remove." Removed rather than wired: the live import is the **merge** path (`handleEncryptedImport` → `applyMerge`) and the device-loss path is recovery (`completeSetup`); a destructive whole-vault replace is a footgun this project doesn't need, and it used only helpers the surviving paths already use, so nothing was orphaned. Source and bundle now contain zero references; balance and build verified.

**The presigned object-storage backend is now exercised over real HTTP.** Until now only the HTTPS backend had been driven against the reference server; the `presigned` backend in `INTAKE_BACKENDS` — which does a **sign-then-PUT/GET** two-step (ask `/sign` for a short-lived signed URL, then PUT/GET the body to that URL with no auth header, exactly like an S3 presigned URL) — had no test. The reference endpoint gained `/sign`, `/presigned`, and `/list` routes (the signature is the authority on `/presigned`; the existing scope/epoch/revocation/WORM/traversal/size logic is reused), and `tests/intake-presigned-test.mjs` drives the app's **real** `INTAKE_BACKENDS.presigned` (extracted verbatim from source) against them on loopback. Seventeen assertions, all green: sign-then-PUT/GET round-trips (list + get + decrypt); ciphertext-only at rest (a sentinel plaintext never lands on disk); the signing step enforces authority (a write cap can't sign a GET, a read cap can't sign a PUT, neither can sign outside its prefix, traversal rejected); one-time claim; and the presigned-specific guarantees — an **expired**, **tampered**, **rotation-stale**, or **post-revocation** URL is all rejected, and WORM still holds on the `audit/` subfolder via the signed path. So the presigned transport now carries the same proven containment as HTTPS.

**Honest residual.** This proves the **client's** sign-then-PUT contract and the reference's enforcement over real HTTP. A production deployment that signs with a real provider (S3 presigned URLs, GCS signed URLs, or STS) still wants its own check that the bucket's own signing/expiry/scoping behaves as assumed — the reference signs with an in-process HMAC, which is representative of the shape but is not a specific cloud provider's implementation.

---

# Security-audit fixes: MFA bypass closed, reviewer name withheld, intake requires TLS

Three findings from the line-by-line audit, fixed and proven. `tests/security-fixes-test.mjs` extracts the real helpers (and the DEK crypto) verbatim from source and asserts all three (18 assertions); full suite is now **24 green**, app rebuilds clean.

**1 — MFA bypass via the client-passcode wrap (the important one).** In the default (non-restricted) household tier, the client passcode wrapped the **full DEK**, and the unlock routine tried that wrap *before* the MFA gate — so on a vault with caregiver MFA enabled, entering the client passcode unwrapped the full key without ever reaching the passkey. Fixed on both sides: (a) a new `mfaCarryClientWrap` rule means MFA enrollment (and every later passkey/recovery change) **drops any full-DEK client wrap** — only a *scoped* wrap (`clientScope==="r"`, which yields the projection key DEK_R and never the full DEK) is carried forward; (b) the unlock routine now honors a full-DEK client wrap **only when MFA is off**, so even a legacy vault that already had MFA on plus a full-DEK wrap is protected. The care recipient's restricted (scoped) sign-in is unaffected. The test proves the decisive property cryptographically: after MFA, there is simply no client wrap to unwrap, so the client passcode has no path to the full DEK; and a surviving scoped wrap yields *only* DEK_R, never the full key.

**2 — Reviewer (no-PHI) projection leaked the care recipient's name.** `buildGrantProjection` set the name unconditionally, including for the `reviewer` archetype whose manifest tells the family "all names are excluded." A new `projCareLabel` helper ties the name to the archetype's `phi` flag: PHI-authorized archetypes (navigator) still carry the name; the reviewer gets a neutral "Care recipient" label, so the data now matches the promise.

**3 — Intake transport now requires TLS.** An `http://` intake base would have exposed the claim token and the write/read capabilities to a network attacker (the bundles stay end-to-end encrypted, but the capabilities themselves must not transit in cleartext). A new `intakeBaseOk` check accepts only `https://` (with `http://` allowed solely for `localhost`/loopback in dev) and gates all three entry points where a base enters the system: enrollment parsing (an insecure base silently falls back to file-based sharing), the reviewer's intake-connect, and — defensively, to cover grants restored from an old backup — the live push path itself.

These resolve the three actionable findings from the audit. The remaining audit items are lower-severity hardening (bind the full grant-bundle header as AAD, constant-time admin-token compare and trailing-slash prefix normalization on the reference server, strip vestigial passcodes on import) plus the deployment/real-infra residuals and the standing human review.

---

# Hardening: full-header AAD, constant-time admin compare, prefix normalization, import passcode strip

The four lower-severity audit items, all fixed and proven. Suite remains **24 green** (the grant and server suites gained assertions), app rebuilds clean.

**Grant bundle: the whole header is now authenticated, not just the scope.** Previously only `scopeManifest` was bound as AES-GCM additional-data, leaving `expiresAt`, `archetype`, `institution`, `family`, and `createdAt` malleable (a storage compromise could alter them without breaking decryption). Bundles are now **v2**: a domain-tagged, fixed-order `canonicalGrantHeader` over every one of those fields is bound as AAD, so tampering *any* of them breaks decryption. `openGrantBundle` recomputes the header from the bundle's own fields, so an altered field no longer matches what was sealed. A `v:1` bundle (scope-only AAD) still opens, so nothing in flight breaks. `grant-core-test.mjs` was rewritten to extract the **real** seal/open and proves it: round-trip, scope tamper, and a per-field tamper check for expiresAt / institution / archetype / family / createdAt / grantId, plus v1 back-compat (12 assertions).

**Reference server — constant-time admin compare.** The admin-token check used a plain `!==` (early-exit byte compare, a timing side-channel); it now uses a length-checked `crypto.timingSafeEqual`, matching the presigned-signature path.

**Reference server — prefix normalization.** Capability scoping is by string-prefix, which is only safe if prefixes end in `/` (otherwise `fam/g1` would also match `fam/g10/`). All minted prefixes (claim tokens, read caps, revocations, and the test helpers) are now normalized to end with `/`, and a claim-token mint requires a non-empty prefix. `intake-worm-revoke-test.mjs` gained assertions that a slash-less prefix is normalized and that a sibling prefix (`fam/noteEVIL/`) is refused.

**Import — strip vestigial passcodes.** `sanitizeImportData` already dropped `syncPasscode`; it now also drops `caregiverPasscode`/`clientPasscode`. These are inert for authentication (the wrapped DEK is authoritative), but they should never ride in on an imported file.

With these, every finding from the line-by-line audit — three actionable plus four hardening — is resolved. What remains is the deployment/real-infra work (provider keys, repo hygiene, real-device and real-bucket QA) and the standing human security review, which this pass should make considerably shorter.

---

# Circle (multi-device sync) — Layer 1: crypto + model + "My Circle" surface, integrated & proven

First integration layer for the circle design (see CIRCLE-JOIN-DESIGN.md). Landed in `src/App.jsx`, app builds
clean, suite is now **26 green** (24 + 2 circle proofs that extract the real functions from the app).

**Circle crypto, in-app and proven.** The two-scan ECDH+SAS pairing (`circlePairStartB` / `circlePairRespondA`
/ `circlePairCompleteB`) and the pairwise rotation (`circleRotate` / `circleRotationOpen`), plus the device
keypair (`circleNewDeviceKey`) and helpers (`hkdfBytes`, `circleGcmEnc/Dec`, `circleSas6`), are built on the
existing ECDH P-256 helpers and carried as base64 in app state. `tests/circle-pair-test.mjs` and
`tests/circle-rotate-test.mjs` were re-pointed to **extract these verbatim from `src/App.jsx`** (gold standard,
like the grant/intake suites): pairing yields a shared key + matching 6-digit SAS and fails closed on a swapped
QR or tampered wrap; rotation re-keys every remaining device — including one offline across two rotations — and
proves a removed device cannot derive the new key or read post-rotation data. (The rotation functions are
currently tree-shaken from the shipped bundle because nothing *calls* them yet; they enter the bundle when the
transport layer drives rotation. The pairing path is wired and ships.)

**Data model + safety.** A circle is stored in the encrypted vault as `settings.circle` ({id, key, epoch}),
this device's persistent keypair as `settings.deviceKey`, and the member roster as `circleRoster` (public keys
only). `sanitizeImportData` now strips `circle` and `deviceKey` so a restored `.care` file never carries
another device's secret/identity — a restored device re-pairs.

**"My Circle" surface.** A new view (reachable from the Team hub) lets a user **create a circle**, **add a
device** or **join one** via a working paste-based two-scan handshake that displays the 6-digit SAS to confirm,
shows the device/caregiver roster, and leave. The handshake genuinely transfers the circle key between two
devices today; the camera-based QR rendering is the convenience layer that replaces paste next.

**Staged next (not in this layer, by design):** the relay transport (re-pointing `writeBackupToHandle` /
`cloudStorageSync` onto per-device circle prefixes so the shared key actually syncs records), wiring rotation +
member-removal to that transport, the device-keyed `_audit` merge, the camera QR UI, and the remote/Argon2id
join (its proof already stands in `circle-remote-test.mjs`). Each lands as its own proven layer.

---

# Circle — Layer 2: relay transport (the shared key now moves records)

The circle now actually syncs. Built on the proven intake relay + the Layer-1 circle crypto, integrated into
`src/App.jsx`, app builds clean, suite is **28 green** (26 + 2 circle-sync proofs).

**Transport, in-app and proven.** Each device seals its current state under the circle key and PUTs it to its
own **mutable** relay prefix (`circle/{id}/{device}/state`); the others LIST the circle prefix, GET each
sibling object, decrypt, and merge via the existing `mergeWithClock` (HLC last-writer-wins). New functions
`circleStripForSync` / `circleSealState` / `circleOpenState` / `circleSyncPush` / `circleSyncPull` ride
`INTAKE_BACKENDS.https`. Two proofs extract the **real** functions from the app: `circle-sync-test.mjs`
(round-trip; the synced payload carries none of this device's private key, the circle key, or relay caps;
wrong key fails closed) and `circle-sync-integration-test.mjs` (two devices exchange state over real HTTP
against the reference relay; the object at rest is ciphertext; a read cap is confined to its own circle;
fail-closed on a wrong key).

**A real privacy property.** `circleStripForSync` guarantees the payload shared with the circle never contains
this device's **private** key, the circle key, or relay capabilities — so a member never learns another
member's private key (which would defeat per-device rotation) and the relay never sees a credential.

**Capability provisioning.** The circle creator connects a relay (base + admin token) and the app mints its
write cap (to its own prefix) and a circle-wide read cap. The pairing handshake now also carries relay config:
the host mints a claim token for the joiner's prefix and includes it in the response, so a joining device
provisions its own write cap automatically.

**UI.** "My Circle" gains a **Connect relay** step and a **Sync now** action; the view shows the connected
relay and last-sync time.

**Still staged:** rotation/member-removal wired to the relay (the rotation crypto is proven in source but not
yet called, so it's tree-shaken from the bundle until Layer 3), the device-keyed `_audit` merge, the camera QR
UI, and the remote/Argon2id join.

---

# Circle — Layer 3: rotation & member removal, wired to the relay

The rotation crypto proven in Layer 1 is now functional end-to-end. Integrated into `src/App.jsx`, app builds
clean, suite is **29 green** (+1 rotation-over-relay integration proof). With rotation now *called*, all three
circle markers (`cg-circle-pair-v1`, `cg-circle-state-v1`, `cg-circle-rot-v1`) ship in the bundle.

**Admin-driven rotation.** The circle's main device (the one holding the relay admin token) can **Rotate key
now** or **Remove** a device. Rotation generates a fresh circle key, wraps it pairwise to each *remaining*
device's public key (`circleRotate`), and publishes the rotation object to `circle/{id}/rotation/latest` on
the relay. On removal it also calls `/admin/revoke` on the removed device's prefix, hard-blocking its writes.

**Catch-up on sync.** `circleSyncNow` now checks `circle/{id}/rotation/latest` first; if it carries a newer
epoch, the device opens its own blob (`circleRotationOpen`) to derive the new key and proceeds under it — so a
device that was offline across one or more rotations re-keys automatically with no re-pair. If no blob is
addressed to it (i.e. it was the removed device), it detects removal, keeps its local records, and clears its
circle membership.

**Proof.** `circle-rotate-integration-test.mjs` drives the real extracted functions against the reference
relay over HTTP: the admin publishes a rotation removing device R; remaining device B fetches it and derives
the new key; R has no blob (cannot derive it) **and** its write cap is revoked (writes denied); the published
rotation object carries no plaintext key. This matches the design's core claim — removal is cryptographic, not
access-control theater — now demonstrated over the wire.

**Still staged:** the device-keyed `_audit` merge (`_audit:{deviceA,deviceB}`), the camera-based QR UI
(replacing paste), and the remote/Argon2id co-caregiver join (its crypto already proven in
`circle-remote-test.mjs`).

---

# Circle — Layer 4: device-keyed audit merge (the last multi-device correctness piece)

Two devices each keep their own tamper-evident, hash-chained audit log. Naively merging them into one log breaks
verification (overlapping `seq` numbers). This layer makes the backup carry a **device-keyed map**
`_audit: {deviceId: block}` so chains coexist without clobbering. Integrated into `src/App.jsx`, app builds
clean, suite is **30 green** (+1 proof); all four existing audit suites stay green.

**The rule.** On import/sync, **this device's** chain restores into the active DB (idempotent — entries are keyed
by id), while **foreign** chains are kept in `data._auditArchive` for durability and are **never** written into the
active chain (their seq numbers would break it). Audit logs only grow, so a shorter copy of an already-archived
chain never shrinks it. Wired into the file/cloud backup build + restore, the recovery flow, and **circle sync**
(each device's sealed state now carries the audit map; siblings restore-own/archive-foreign on pull).

**Back-compatible.** A legacy single `_audit` block is treated as a one-entry map — restored if it's this device's,
archived if it's another device's — so existing backups restore unchanged.

**Proof.** `circle-audit-merge-test.mjs` extracts the real `buildAuditMap`/`applyAuditMap` from the app and shows:
two chains coexist in one backup with neither overwriting the other; this device restores while foreign archives;
the active log holds only this device's entries and still verifies; the archived foreign chain verifies
independently; keep-larger holds; and both legacy single-block cases work. It also asserts the failure it prevents
— a naive merge of two chains verifies as **broken**.

This completes multi-device **correctness**. Remaining circle work is reach/convenience: the camera-based QR UI
(replacing paste; needs real-device QA) and the remote/Argon2id co-caregiver join (crypto already proven in
`circle-remote-test.mjs`; adds a `hash-wasm` dependency). The standing full human security review is unchanged.

---

# Circle — sub-layers A + B: remote co-caregiver join, and camera QR pairing

Multi-device **correctness** was complete at Layer 4; these two add **reach and convenience**. App builds clean; suite is
**33 green** (+3 proofs). Argon2id (hash-wasm), qrcode, and jsqr are bundled and **dynamic-imported**, so they code-split
into separate chunks and load only when a circle feature is used — the main bundle and the zero-runtime-egress posture are
unchanged.

**A — Remote join (Argon2id, passphrase-wrapped).** For a co-caregiver who isn't physically present. The host wraps the
circle key + relay caps + a pre-assigned device slot under a **generated six-word passphrase** (256-word list, ~48 bits)
using Argon2id (12 MB, 3 iterations) + AES-GCM, stashes the sealed envelope on the relay behind a **one-time read code**,
and shows the code + passphrase to send over **two separate channels**. The joiner pastes the code, enters the passphrase,
fetches the envelope, unlocks it, and claims its own write cap. Two new model pieces make this safe: a circle-specific
device id (so the host can pre-assign a slot) and `circleMergeRoster`, which converges rosters across devices on sync so a
remotely-joined device's real public key reaches the others for key rotation. Proven by `circle-remote-app-test.mjs`
(extracts the real seal/open + passphrase generator; round-trip, wrong-passphrase-fails-closed, envelope leaks nothing) and
`circle-remote-integration-test.mjs` (full handoff over real HTTP: code + passphrase redeem the key, the relay sees only
ciphertext, one channel alone is insufficient). Honest scope: 48-bit passphrase entropy is acceptable for a short-lived,
single-use, rate-limited relay handoff; if an invite is believed leaked, the host should Rotate the key (already supported).

**B — Camera QR pairing.** The in-person handshake can now be done by **scanning** instead of pasting; paste remains the
fallback. `CircleQR` renders each handshake code as a QR; `CircleScanner` opens the camera (`getUserMedia`) and decodes
frames with jsQR. Wired into both the host and joiner panels. `circle-qr-test.mjs` proves the QR pipeline carries the real
pairing payloads losslessly — QR#1 (240 B, v10) and the larger QR#2 with roster + relay (755 B, v19, comfortably
scannable). The only residual is **camera frame capture on a real device** (like the WebAuthn/PRF MFA flow) — it cannot be
exercised headless and needs phone QA.

Remaining circle hardening (next, not yet built): a short **invite expiry** + host-side **cancel/revoke** for the remote
flow, so abandoned or leaked single-use invites don't linger.

---

# Circle — remote invite hardening: expiry + cancel/revoke

Closes the gap flagged after sub-layer A: a single-use remote invite that is abandoned or leaked no longer lingers
indefinitely. App builds clean; suite is **34 green** (+1 proof).

**Time-boxed expiry.** Every remote invite now carries `expiresAt` (24 h) **inside the AES-GCM-sealed bundle**, so it
can't be extended without the passphrase. The joining app refuses an expired invite before doing anything with it. This is
client-honored (the reference relay has no server-side TTL); a production relay should also enforce a TTL. Invites without
an expiry (older format) are still accepted, so nothing breaks.

**Host cancel / revoke.** The invite panel gains "Cancel this invite," and pending devices in the roster get a "Cancel"
action (distinct from "Remove," which rotates the key — a pending device has no key to rotate to, so Remove never applied to
it). Cancel revokes the pending device's relay prefix, which is **server-enforced**: the device can no longer claim its
write cap, and if it already claimed, its writes are rejected. The placeholder roster slot is dropped. Honest scope: cancel
stops the pending device from joining/writing, but if you believe the code **and** passphrase both leaked, the bundle
carried the current circle key — so the panel and this changelog point you to **Rotate key now**, which re-keys every real
device and locks out any holder of the old key.

**Proof.** `circle-invite-lifecycle-test.mjs` extracts the real `circleInviteExpired` + seal/open and, over real HTTP:
seals a past-dated bundle, has the joiner unlock it and the expiry gate refuse it, and confirms the expiry is sealed inside
the ciphertext (not editable in the envelope); then shows a cancelled invite can neither be **claimed** nor **written**,
both before and after the pending device claims.

---

# Navigation restructure: three areas + context-specific Help infrastructure

Full menu revamp per David's spec — **every module retained, only placement changed**. App builds clean; suite stays
**34 green** (no crypto/logic touched; this is navigation chrome + two JSX moves).

**Three areas** replace the four hubs: **Care Management** (bottom-bar "Care"), **Documents & Data** ("Documents"), and
**Settings**. Care Management holds two expandable sections — **Today** (open by default, visually dominant: alerts +
reminders, Medicine Management, Incident Log, Appointments & Calendar, Messages, Shift Handoff, Emergency Plans, Emergency
Info Card) and **Long Term** (the five care-plan domains, Escalation Triggers, Longitudinal Tracking, Visit Prep, Incident
Patterns, POA Decisions, Capacity Observations, Care Plan Binder, with End-of-Life Planning last by design). Documents &
Data holds Self-Reports, the new **Records In & Out** screen (the "Bring records in" / "Share your records" / "Send a
status update" sections physically moved out of Settings), Contacts, Incident Log and Calendar (intentional second entry
points), Documents, Share with a Care Provider, and Expenses. Settings reorganized into four expandable sub-areas:
**Protect Your Data** (Three Steps + Keep your records safe), **Security & Integrity** (Passcodes + the security/integrity
and diagnostics cards), **Team Management** (My Circle, Sync, Care Schedule, Weekly Grid, My Availability, Device
Identity), and **Display & Customization** (text size, large print, State/Region packs).

**Mechanics.** A `VIEW_AREA` map assigns every view to its owning area, applied inside `nav()` itself — so breadcrumbs and
the bottom-bar highlight are always correct and any stale hub reference is self-healing. Reminder/search entries were
re-keyed to the new areas; search gained entries for Records In & Out, My Circle, Share with Care Provider, and My
Availability. The expandable sections reuse the existing `settings-group` styling so dark mode and print behavior inherit.

**Context-specific Help infra.** `HELP_TOPICS` maps every screen to a help topic; each non-hub screen header now carries a
**?** button that opens Help anchored to that screen's topic, showing a clearly-labeled placeholder ("guidance for this
screen is on its way") until the content is written — the wiring is done, so adding content later touches no navigation
code.

**Hidden, not removed:** the Caregiver Check-in card and its respite alert are gated behind a compile-time
`SHOW_CAREGIVER_CHECKIN=false` flag while David reconsiders them; the view remains routable and one flag flip restores
both. `care-guardian-menu-map-v3.html` documents the new tree.

---

# Bug fix: "Upload Document" (and every other file-picker button)

**Root cause.** The button's handler read `(docFileRef.current && docFileRef.current.click)()`. The parenthesised
expression evaluates to the `click` **method detached from its element**, which is then called with `this === undefined`
(ES modules are strict mode), so the DOM's brand check throws `TypeError: 'click' called on an object that is not a valid
instance of HTMLElement` and the file picker never opens. The correct form — used elsewhere in the same file — is
`ref.current && ref.current.click()`, with the call parenthesis *inside*.

**Scope: this was systemic, not one button.** The same pattern broke **five** pickers: Upload Document, Import FHIR
Bundle, Import &amp; Merge (encrypted .care restore), Import vCard, and the sync file picker. All five are fixed. Verified
empirically in a real DOM (jsdom): the old pattern throws and fires no click; the fixed pattern fires.

**Two associated defects found while auditing the same flow.** Both are the "silently dead button" class — the file input
keeps its previous value, so re-picking the *same* file fires no `change` event and nothing at all happens:
1. `handleDocUpload` cleared the input on success but **not** on its "no text could be extracted" early return — the exact
   path a scanned PDF takes, which the UI itself warns is common. Retrying the same scan appeared completely dead. Fixed,
   and the message now says the text will need to be entered manually.
2. `handleEncryptedImport` returned on its client-sign-in guard without clearing. Fixed.

**Checked and found healthy:** all eight file inputs are rendered unconditionally at the app root (so the restructure did
not orphan any), every input is wired to a handler that exists, the vCard/FHIR/sync/photo handlers already cleared
correctly (their early returns sit inside nested callbacks where the outer reset still runs), and pdf.js loads as a local
bundled chunk from the app's own origin — the zero-egress posture is intact.

**Proof.** `file-picker-test.mjs` (suite now **35 green**) extracts every file-picker `onClick` **verbatim from
src/App.jsx** and executes it against a real jsdom file input, asserting the picker actually opens; asserts the detached
pattern appears nowhere; asserts every file input maps to a defined handler; and asserts every handler clears the input on
each exit path in its own control flow (nested-callback returns are correctly excluded — an earlier draft of this check
produced false positives on `reader.onload` and `forEach`, which is why the rule strips nested function bodies first).
Validated by negative control: reintroducing the bug at one call site makes the test fail. jsdom is a **devDependency**
(test-only; it is not shipped).

---

# Bug fix: PDF upload — "Setting up fake worker failed / Failed to fetch dynamically imported module"

**Root cause.** `loadPdfJs()` imported the pdf.js worker with Vite's `?url`, which emits it as a **separate 1.4 MB
`.mjs` asset** and points `GlobalWorkerOptions.workerSrc` at that URL. Two independent things then go wrong in
production:

1. **MIME.** Many static hosts have no mapping for `.mjs` and serve it as `application/octet-stream` or `text/plain`.
   Browsers refuse to execute a module script with a non-JavaScript MIME type, which surfaces as exactly the reported
   error. Nothing in the repo (no `_headers`, no `netlify.toml`) forced the correct type.
2. **Offline.** The service-worker precache globs were `{js,css,html,svg,png,woff2}` — **no `mjs`** — so the worker was
   never precached and PDF scanning also failed offline in the installed PWA, independently of the MIME problem.

**Fix.** The worker is now **inlined into a bundled chunk** (`?worker&inline`) and handed to pdf.js via
`GlobalWorkerOptions.workerPort`, so there is no separately-served worker file to mis-serve or miss. After the change the
build emits **no `.mjs` asset at all**; the worker ships as a `.js` chunk (a MIME type every host serves correctly), is
covered by the existing precache globs, and is created as a **classic** worker from a blob URL — no module-worker
requirement, so older Safari is fine. The `?url` fallback was deliberately removed rather than kept: it was the failing
path, and retaining it shipped the same 1.4 MB twice. The chunk loads only when a PDF is actually scanned.

**User-facing.** A PDF-engine failure previously surfaced the raw `Setting up fake worker failed…` string to a caregiver.
It now reads: the PDF reader didn't load, reload and try again, and the details can still be entered manually.

**Also hardened (defence in depth, not required for the fix):** precache globs now include `mjs` and the cache ceiling is
raised to 4 MB, so a future `.mjs` asset or a larger pdf.js can't silently fall out of the offline bundle.

**Deployment note.** Copying `dashboard.jsx` into the app repo is **sufficient** — verified by building with the original
`vite.config.js` and confirming the worker chunk is still precached (1.8 MB, under the 2 MiB default). The app uses
`registerType: 'autoUpdate'` with `skipWaiting`, so installed PWAs pick the fix up automatically, typically after one
reload.

**Proof.** `pdf-worker-test.mjs` (suite now **36 green**) builds a real, structurally valid PDF (correct xref offsets),
runs the app's **real `extractPdfText` extracted from src/App.jsx** against it and asserts the text comes out; asserts the
loader inlines the worker, uses `workerPort`, and no longer references a `?url` worker; asserts the precache globs cover
`js` and `mjs`; and, against the built `dist/`, asserts no `.mjs` asset is emitted, no chunk references an external worker
URL, the worker ships as `.js`, it is precached, and every precached URL resolves to a real file. Validated by negative
control: reverting the loader to the `?url` form makes the test fail.

---

# Build fix: PDF worker inlining broke the Netlify build (correction to the previous entry)

**What happened.** The previous fix inlined the pdf.js worker with `?worker&inline` to dodge the `.mjs` MIME problem.
Base64 inlining expands the payload: the 1.4 MB worker became **1.8 MB under rollup (Vite 5, my container) but 3.61 MB
under the rolldown-based Vite that Netlify resolved**. Workbox's default precache ceiling is 2 MiB, and
`vite-plugin-pwa` treats an asset above it as a **hard `PLUGIN_ERROR`, not a warning** — so the deploy failed outright.

**Correction to what I told you.** I said copying `dashboard.jsx` alone was sufficient, having verified it in a container
running **Vite 5.4.21 (rollup)**. The deploy repo resolved a **rolldown-based Vite**, which processes the inlined worker
differently (note the doubled hash in the failing asset name, `pdf.worker.min-BcyE4Z0V-BYMgBMLO.js` — the inlined chunk
re-processed a second time). The verification was real but was performed on a materially different toolchain, so the
conclusion did not transfer. Toolchain parity is now something to state explicitly rather than assume.

**Fix.** The loader now uses **`?worker`** (not `?worker&inline`, not `?url`). Vite emits the worker as a bundled
**classic** worker with a **`.js`** extension, constructed via `new Worker(url)`:
- It still fixes the original production error, which was specific to **`.mjs`** — an extension many static hosts serve
  with a non-JavaScript MIME type, causing the browser to refuse the module. `.js` is served correctly everywhere.
- It stays **~1.35 MB**, comfortably under the 2 MiB ceiling, so the build passes and the worker is still precached —
  offline PDF scanning keeps working.
- It is a third the weight of the inlined version, so users download less.

Raising the ceiling to 4 MiB (as the Netlify guidance suggested) would also have unblocked the build, but it would have
shipped a 3.6 MB precache to every user for no benefit. The ceiling guard is kept anyway as **defence in depth** so a
future toolchain change cannot hard-fail a deploy again — with `?worker` no asset currently exceeds even the 2 MiB
default. `globIgnores` was rejected as an option: excluding the worker from precache would have silently re-broken
offline PDF scanning.

**Proof.** `pdf-worker-test.mjs` gains the assertion that actually failed the deploy: **no emitted asset exceeds
Workbox's 2 MiB default**. It also now asserts the worker is imported with `?worker` and is *not* base64-inlined
(comments are stripped before scanning, so the loader can document rejected alternatives without fooling the test). The
real-PDF extraction check is unchanged and still passes. Negative control: reverting to `?worker&inline` fails both the
inline assertion and, at 1.8 MB even under rollup, demonstrates the growth that breaks rolldown builds. Suite: **36
green**.

---

# Bug fix: PDF upload hung forever at "extracting text and parsing document…"

**Symptom.** A 4-page text PDF uploaded fine, then the spinner never resolved — no error, no result.

**What was ruled out, by measurement rather than assumption.** The parsers were the obvious suspect and were
**innocent**: running the real `detectDocType`, `parseMedications`, `parseLabResults` and `parseClinicalSections`
extracted from `src/App.jsx` against four pages of clinical text completes in **~6 ms** total. The emitted worker was
also checked and **parses cleanly as a classic script**, so it wasn't a syntax failure either.

**Root cause (failure mode, not the browser-side trigger).** The hang is inherent to how pdf.js reports worker trouble:
when a Web Worker fails *after* construction, pdf.js's `getDocument` promise is simply **never settled**. There is no
rejection to catch, so the UI waits indefinitely. Attempts to boot the emitted worker in a shimmed Node environment did
not reproduce faithfully enough to name the precise browser-side trigger — that is stated here as a limit, not papered
over.

**Fix — the Web Worker is gone.** Worker *delivery* has now failed three times in production: as `.mjs` a host served it
with a non-JavaScript MIME type; inlined it exceeded Workbox's 2 MiB ceiling and hard-failed the build; and as a separate
classic `.js` it produced this silent hang. The worker module is now registered on `globalThis.pdfjsWorker`, so pdf.js
runs it **in-process**: nothing is fetched, nothing is constructed, nothing can be mis-served, and **one** 1.35 MB chunk
ships instead of two (an interim worker-plus-fallback design duplicated it — rejected for that reason).

**Trade-off, stated plainly.** Parsing now occupies the UI thread. Care documents are small (discharge summaries, med
lists, lab reports) and a brief pause is far better than an unresolvable spinner; the code yields once before starting so
the spinner paints first. A very large PDF will make the page unresponsive while it parses — the bounded worst case
below is what keeps that from becoming a hang.

**Belt and braces: it can no longer hang at all.** Every pdf.js await (document load, each page, each text extraction) is
wrapped in a timeout that rejects and destroys the stalled task. A timeout surfaces its own plain-language message
("taking too long… try a smaller file… details can also be entered manually") rather than a raw error.

**Proof.** `pdf-worker-test.mjs` now builds a real **4-page** PDF — the case reported — and runs the app's real
`extractPdfText` against it, asserting all four pages come back. It also asserts: the worker module is registered on
globalThis, **no** Worker is constructed, no `?url`/`?worker` import remains, every await is timeout-bounded, exactly one
worker chunk ships, no `.mjs` is emitted, nothing exceeds the 2 MiB build ceiling, and the chunk is precached (offline
scanning intact). Two direct hang-proofs: a never-settling promise **rejects** within the timeout instead of spinning,
and the stalled task is destroyed rather than leaked. Suite: **36 green**.

---

# Documents: store medications and test results only, and import medication changes into Medication Management

Replaces the previous silent-truncation behaviour (documents kept up to 10,000 characters of text and quietly dropped
the rest). App builds clean; suite **37 green** (+1 proof).

**Retention policy — no document text is stored.** `saveDocToLibrary` now writes only the structured extraction:
medications, test results, file name, type, date, tagged `contentPolicy:"meds-labs-only"`. No `rawText`, no 200-character
summary, no clinical sections. The "save document text to a care domain" action was **removed** (it wrote text into
domain notes), and the library viewer no longer renders stored text because there is none. A **migration purges text
saved by older builds** on load, so the policy applies retroactively rather than only to new scans. Extracted text is
still shown on screen during review — clearly labelled as not saved — so nothing useful is lost at the moment of triage.

**Made visible to the user** at each place it matters: under the extracted-medications heading, in the saved-document
view, in the clinical-sections block, and in the no-results state (which now explains nothing will be saved and invites
manual entry).

**Document → Medication Management.** A new panel lists exactly what a document changes: **new** medications,
**discontinued** ones, and **dose changes** (showing old → new). One press applies them all — no re-typing. Frequency is
mapped onto the app's time slots so an imported medication lands on the admin grid immediately.

**Safety decisions worth naming.** (1) Changes are shown before they are applied rather than written silently. Medication
text is read by pattern-matching and *can* be misread; a wrong dose flowing unseen into a dementia patient's regimen is a
different class of harm from a wrong contact name, so the one-press flow keeps the "seamless, no re-typing" goal while
leaving a human in the loop. (2) A medication **absent** from a document is never touched — absence is not evidence of
discontinuation, and a document that lists only new prescriptions must not silently stop everything else. (3) A dose
difference is surfaced as a change showing both values, never overwritten silently. (4) Discontinuation marks
`discontinued:true` with a date rather than deleting, preserving history.

**Medication change log.** `data.medChanges` records every add, discontinue, restart, and dose change — from documents
*and* manual entry — with timestamp, source (document name or "entered by hand"), and device. Viewable in Medication
Administration under "Medication change log". Distinct from `medSchedule.log`, which records doses **given**; this
records changes to the **regimen**. Changes also write to the HIPAA audit trail.

**Proof.** `med-reconcile-test.mjs` extracts the real `parseMedStatuses`, `freqToSlots`, `docMedToScheduleMed` and
`reconcileMedications` and asserts: a DISCONTINUED heading stops everything beneath it; stop wording on a line is caught;
current medications stay active; a new medication is added; an active stopped one is discontinued; an already-stopped one
isn't proposed twice; a dose change shows both values; an identical medication is untouched; **a medication absent from
the document is never modified**; a medication named only in a stopped context isn't added as new; frequency maps to
sensible slots with a safe fallback. It also asserts the retention policy directly against the source — no text fields in
the save path, the old text-to-notes action gone, the library never rendering stored text, and the purge migration
present.

---

# Documents: also keep diagnoses and clinical conclusions

Extends the meds-and-tests-only policy to the two other things worth keeping from a clinical document. Suite
**38 green** (+1 proof); app builds clean.

**What is now saved:** medications, test results, **diagnoses**, and **clinical conclusions** — tagged
`contentPolicy:"meds-labs-dx-only"`. The document's narrative text is still **never** stored.

**Diagnoses.** Captured from an explicit `DIAGNOSES` / `IMPRESSION` / `PROBLEM LIST` / `PAST MEDICAL HISTORY`
section, and from any line carrying an **ICD-10 code** (kept alongside the text). List numbering is stripped and
duplicates collapse. Capped at 40 items × 140 characters.

**Clinical conclusions.** The reasoning sections — assessment, plan, impression, conclusion, recommendations,
follow-up, instructions — capped at 6 × 600 characters.

**The truncation lesson is applied.** This re-introduces narrative text in a bounded form, which is exactly what
went wrong before, so any shortening is **recorded on the item** (`truncated:true`) and the UI says so ("Shortened
to keep the saved record small"). Nothing is dropped silently. Measured worst case for diagnoses + conclusions is
**~5.6 KB per document**; a typical discharge summary contributes 1–2 KB, versus the ~10 KB of raw text this
replaced — so the storage burden went *down* while the clinically useful content went up.

**A real bug the test caught.** "Assessment" was initially treated as a diagnosis heading, so "Assessment and
Plan" prose was swept in as diagnoses (5 found where 3 exist). Assessment is prose in practice, so it is now
classified as a **conclusion** only, and the medication/vitals/plan headings end a diagnosis section. The test
asserts exactly three diagnoses from the sample and that assessment prose never becomes one.

**Proof.** `clinical-extract-test.mjs` extracts the real `parseDiagnoses` / `parseConclusions` and asserts: each
listed condition is captured with its ICD-10 code; numbering is stripped; medications, vitals, and assessment prose
are *not* captured as diagnoses; conclusion sections are kept and non-conclusion sections are not; long conclusions
are capped **and marked**; short ones are not marked; item counts and lengths are capped; duplicates collapse;
worst-case footprint stays small; and `saveDocToLibrary` still stores no `rawText`, `summary`, or `sections`.
`med-reconcile-test.mjs` was updated where it pinned the old policy tag.

---

# Fix: lab-table extraction quality, and cancelling an accidental upload

**Root cause of "only four fields, apparently at random" — it was not the parser.** `extractPdfText` joined every
pdf.js text fragment on a page with spaces, so an entire page (a 20-row lab table) arrived as **one line**. Every
parser here is line-based, so it could match at most one result per page — four pages, four results. Measured on a
generated 20-row lab table: **1 of 20 extracted**, with a mangled test name.

**Fix 1 — rebuild line structure.** New `itemsToLines()` groups pdf.js fragments by their y coordinate, orders each
row by x, and widens large horizontal gaps so table columns stay separated. The same table now extracts as 22
lines with columns intact. This also repairs medication and diagnosis extraction from tabular documents, which had
the same defect for the same reason.

**Fix 2 — rewrite `parseLabResults`.** It was a single loose regex, matched once per line, whose name pattern
allowed **no digits** (so "CO2" and "Hemoglobin A1c" could never parse) and whose flag detection was a bare
`/\b[HL]\b/` — which matched the **L inside "mEq/L"** and marked normal results as Low. The replacement is a
tokenizer: find the first numeric value, take the label before it, then classify the tokens after it as reference
range, unit, or flag by shape. Flags must be a standalone alphabetic token. Column-header and title rows are
rejected, duplicates collapse, and a row is only accepted when it has a unit, a reference range, or a recognised
analyte name (a 70-entry list), which keeps page numbers and prose out. Result on the same table: **20 of 20, every
value/unit/range/flag correct, zero junk rows.**

**Fix 3 — cancel an accidental upload.** `extractPdfText` now takes a cancel token, checked before each page, and
yields to the event loop between pages so a tap is actually seen. Cancelling destroys the pdf.js task rather than
letting a large document finish in the background. The processing indicator now names the file being read
("Reading "discharge-summary.pdf"…") with a **Cancel** button beside it, and cancellation is treated as a normal
outcome, not an error: the picker is cleared so the same file can be re-selected, and nothing is retained.

**Proof.** `lab-extract-test.mjs` generates a real PDF containing the 20-row table and runs the real
`extractPdfText` + `itemsToLines` + `parseLabResults` against it, asserting: the table extracts as many lines with
columns intact; all 20 results are found; value, unit, range and flag are correct on every row; no junk rows; a
normal result is **not** flagged abnormal (the mEq/L defect); a genuinely high result keeps its H; names with
digits and hyphens parse. It then asserts cancellation mid-read stops extraction, an already-cancelled token stops
before any page is read, and a normal read still succeeds. `pdf-worker-test.mjs` was updated for the new
`itemsToLines` dependency. Suite: **39 green**.

---

# Fix: lab results from a patient-portal "Result Trends" report (block layout)

Tuned against a real report David uploaded. Every test name was missing and every value was wrong; the cause was a
layout the parser didn't know about. Suite **39 green**; app builds clean.

**What the document actually looks like.** The tabular assumption (one row per result) doesn't hold. A portal trend
report puts each result in a **three-line block**, and the order varies:

    WHITE BLOOD CELLS                        ← component name, alone on its line
    7.34 K/uL                                ← the result
    Normal Range: 4.23 - 9.07 K/uL           ← the reference range

Reading rows, the parser took the label before the first number — **"Normal Range"** — and the first number after
it, which is the range's **lower bound (4.23), not the result (7.34)**. So every row was named "Normal Range" and
carried a wrong value. Three further shapes appear in the same document: `MPV 10.70 fL` on one line with no range;
RBC with its **value line before its name**; and a `Low` flag appended to a range line. Report furniture
("Result Trends", "Jun 24, 2026 (Table 1 of 1)", "Component Jun 24, 2026") was being parsed as results — the
`Jun 24 | 2026 | Table` row in David's screenshot, where "Table" was even accepted as a unit.

**Fix.** `parseLabResults` now understands both layouts. A reference-range line closes a block and binds to
whatever name and value are pending, in either order; a bare `VALUE UNIT` line and a lone component name are held
as pending; single-line results still parse as before. Units are **whitelisted** (about 40 real lab units plus a
generic `a/b` shape), so words like "Table" can no longer be mistaken for one. Report furniture, date lines, and
"Table n of n" markers are skipped explicitly.

**Flags are now derived from the numbers.** When a value and its reference range are both known, High/Low is
computed by comparison; an explicit flag word in the document still wins. This is deterministic, and it avoids
guessing from stray flag words whose column position is destroyed by text extraction — in the real report the word
"Low" landed glued to an unrelated line, yet RBC 4.61 against 4.63–6.08 is correctly flagged **L** on the numbers
alone.

**Result on the real report: 23 of 23 results correct** — every name, value, unit, and reference range, with RBC
flagged L and **zero junk rows**.

**Proof.** `lab-extract-test.mjs` gains a generated PDF in the block layout (including the reordered block, the
single-line no-range case, and the report furniture) and asserts: every component is found by its real name rather
than "Normal Range"; the result is captured rather than the range's lower bound; a value-before-name block still
binds; a below-range value is flagged L; a single-line result with no range survives; and furniture is not parsed
as data. The tabular assertions still pass unchanged. **The fixture values are synthetic on purpose** — the report
used for tuning contains real lab data, which does not belong in a source repository.

---

# Medication Administration Log: adherence calendar, filtering, colour coding

Suite **40 green**; app builds clean. The log now has a **Day / Calendar** toggle. Day view is unchanged; Calendar
adds everything below.

**Calendar.** A month grid, one cell per day, colour-coded: all doses given (green), some given (amber), missed or
refused (red), **not recorded** (hatched grey), nothing scheduled (pale), future (neutral). Each cell shows the
day and a given/scheduled fraction. Tapping a day opens a breakdown of every medication and time slot for that day
with its status.

**Filtering.** Chips for All medications or any single one, including stopped ones (labelled). The filter drives
the grid, the statistics, and the day detail together, so "how is Donepezil specifically trending" is one tap.

**At-a-glance trend.** Four stat cards: adherence %, doses given ÷ scheduled, current day streak, and — when there
are any — an unrecorded count. The adherence card carries a **▲/▼ delta against the previous month**, so the
direction of travel is visible without reading the grid.

**Per-medication 30-day strips.** Under the calendar, each active medication gets a row of 30 day-squares plus its
own percentage (highlighted when below 80%). This is the part that answers the actual question: one medication
slipping is invisible in an overall figure but obvious as a run of amber in its own strip.

**Copy adherence summary** puts the period, the counts and the percentage on the clipboard for a visit note or a
message to a prescriber (permission-gated with the other export actions).

**Three judgement calls in the arithmetic, each tested.**
1. **As-needed (PRN) doses never count as scheduled.** A PRN dose that wasn't needed is not a missed dose. PRN
   doses that *were* given still register as activity so the day doesn't read as empty.
2. **A medication is only judged on days it existed** — nothing before its start date, nothing after the day it
   was discontinued. Otherwise stopping a medication would retroactively wreck its adherence history.
3. **"Not recorded" is kept distinct from "missed".** Both reduce adherence, but colouring an unrecorded dose red
   would assert that a dose was skipped when nobody actually said so — a clinical claim in a record meant to be
   defensible. They are coloured and counted separately, so a gap in the paperwork can't be misread as a gap in
   care.

**Bug fixed in passing:** the medication change log added in an earlier build was placed *outside* the medication
view's conditional and was rendering on **every screen**. It now sits inside the view, with a test asserting it.

**Proof.** `med-adherence-test.mjs` extracts the real `medActiveOn`, `medDayAdherence`, `medDayState`,
`medAdherenceRange` and `medStreak` and asserts each rule above plus: full/partial/missed/unrecorded/future
classification, separate tallies when a day is part missed and part unrecorded, adherence % arithmetic, future days
excluded from totals, filtering narrowing the denominator, streaks breaking on a missed day, and a
nothing-scheduled day neither breaking nor padding a streak. (That last expectation was wrong in my first draft of
the test — the code was right and the test was corrected, not the other way round.)

---

# Verified: medication change log renders only at the bottom of the Medication Administration Log

No code change was needed — this was already the state of the current build. Verified three ways rather than
asserted: `data.medChanges` is rendered in exactly **one** place in the whole app; that place sits inside the
`medadmin` view, **after both the Day and Calendar blocks close**, immediately before the view itself closes; and
the shipped bundle contains the string exactly once. It therefore appears at the bottom of the log in both Day and
Calendar modes, and on no other screen.

The earlier defect — the block rendering outside the view conditional, and so on every screen — was fixed in the
previous build (the one containing the adherence calendar). Anyone still seeing it elsewhere is looking at a cached
build: the app registers its service worker with `autoUpdate`, which takes effect after a reload.

`med-adherence-test.mjs` now pins the placement so it cannot drift again: exactly one render site, Day block before
Calendar block, and the change log positioned after both close. Suite: **40 green**.

---

# Calendar integration, stage A (export) and stage B (import)

Suite **42 green** (+2 proofs); app builds clean. Both stages are **file-based**: no account, no OAuth, no server,
nothing sent anywhere.

**The honest ceiling, stated up front.** No website or PWA can write to a device calendar — that API does not
exist outside a native app or a hosted subscription feed, both of which were ruled out. So the integration is a
one-tap handover: Care Guardian writes a `.ics`, the OS opens it, the calendar app offers to add. The UI says this
in plain words rather than implying magic.

**A — Export.** Per-appointment ("Add to my calendar") and whole-calendar ("Create calendar file"). What makes it
feel automatic rather than clerical:
- **Stable UID per appointment**, minted once and stored. Re-exporting **updates** the existing event instead of
  creating a duplicate — the single most common complaint about .ics workflows. `SEQUENCE` increments only when
  something the calendar actually displays changes, so editing a private note doesn't churn the user's calendar.
- UIDs are scoped by circle/device id, because two devices in a circle can mint the same local id and one
  appointment would silently overwrite another in the calendar.
- **Deleting an appointment leaves a tombstone**, exported once as `STATUS:CANCELLED`, so it disappears from the
  calendar too instead of lingering forever.
- **Calendar-safe titles.** Each appointment can carry a plainer title; the vault keeps "Neurology follow-up — Dr.
  Chen", the calendar shows "Appointment". A phone calendar is glanceable by anyone nearby, and an appointment
  title can disclose a dementia diagnosis to family who don't know. **Notes are excluded by default** and require
  an explicit tick, since notes carry clinical detail.
- Times are exported as **floating local time**: 9:30 stays 9:30 in any timezone, which is what a caregiver means.
  Documented as a deliberate trade-off — it does not shift for someone travelling across zones.
- Length (default 60 min) and location were added to the appointment model; export is permission-gated and audited.

**B — Import (the caregiver's own calendar).** Export a work or personal calendar as `.ics`, open it here, and
Care Guardian flags appointments that **clash** with it. Direction matters: this brings the caregiver's own
commitments in, so no care-recipient data moves. Only title, start and end are kept, capped at 400 events and a
120-day horizon, clearable in one press — a vault should not quietly become a copy of someone's work calendar.
Simple daily/weekly rotas are expanded; **a recurrence rule too complex to expand is reported and skipped rather
than guessed at**, because a confidently wrong clash warning is worse than none.

**Proof — validated against an independent implementation.** `ics-export-test.mjs` parses our output with
**ical.js**, a third-party RFC 5545 library, rather than asserting on our own strings: structure, floating times,
45-minute end calculation, escaping of commas/semicolons/newlines/backslashes, 75-**octet** folding of a
multi-byte title without splitting a UTF-8 sequence, calendar-safe title replacing the clinical one, notes opt-in,
UID stability across exports, SEQUENCE, per-circle UID uniqueness, and CANCELLED on delete.
`ics-import-test.mjs` reverses it: fixtures are **written by ical.js** and parsed by our importer — folded and
escaped summaries, all-day vs timed, UTC conversion, weekly rota expansion, complex-rule reporting, cancelled and
past events dropped, caps enforced, and conflict detection including the edge case where an appointment starts
exactly as an event ends (not a clash). `ical.js` is a **devDependency** — test-only, not shipped.

Two test bugs were found and fixed in the tests, not the app: a fixture built an RRULE from a plain string (which
ical.js garbles) instead of an `ICAL.Recur`, and an assertion claimed the app contacts no OAuth endpoint — untrue,
since cloud backup legitimately uses OAuth. The claim was narrowed to what matters: the calendar import path
itself makes no network call.

---

# Medication module: drug-name autocomplete and strength validation

Suite **43 green** (+1 proof); app builds clean. Scope per David's decision: **guarantee that a dose entered is a
real strength of a real drug — never suggest a dose.**

**Autocomplete.** Typing into Medication Name searches a bundled formulary and offers matches, ranked exact
generic → generic prefix → brand prefix → word-start → substring. Brand names resolve to the generic and say which
brand matched ("aricept" → Donepezil, *matched "Aricept"*), so a caregiver reading a bottle gets the right record
without knowing the generic. Ambiguous stems keep both options rather than guessing — "meto" offers metoprolol
tartrate *and* succinate, which are not interchangeable.

**Strength validation.** Once a known drug is identified, its real marketed strengths appear as tappable chips,
and what's typed is checked against them. Units are normalised (500mg = 500 mg = 0.5 g) while **mcg and mg are
kept strictly distinct** — the 1000× confusion is the one that causes real harm. A wrong-unit entry
(levothyroxine "88 mg" instead of 88 mcg) is caught.

**Four rules that keep this a catalogue, not clinical advice.**
1. **It never blocks saving.** A prescription can be a split tablet, a compounded preparation, or a drug newer
   than the table. An app that refuses to record what a doctor actually prescribed would be worse than one that
   stays quiet. The save button is gated only on name and time slots; the check cannot disable it, and the UI says
   so in words.
2. **Half tablets are recognised as plausible, not wrong.** Quetiapine 12.5 mg — half a 25 mg tablet — is ordinary
   practice in this population, so it reads as "looks like half a 25 mg tablet, worth checking" rather than an error.
3. **An unknown drug produces silence.** No verdict at all, rather than casting doubt on something the app can't
   check.
4. **No dose is ever suggested.** Asserted directly against the source: no "usual/recommended/typical/starting
   dose" anywhere in the code.

**The data, honestly.** The shipped table is a **curated seed** — 92 drugs, 297 strengths, ~6 KB — written for
older-adult and dementia care (cholinesterase inhibitors, memantine, the common psychotropics, cardiac, diabetes,
thyroid, analgesics, anticoagulants). It is genuinely useful but it is **not authoritative and carries no
RxCUIs**, and hand-authored strength lists can contain errors. `tools/build-drug-table.mjs` regenerates it from
**NLM RxNorm Current Prescribable Content** — the subset free of the licensing restrictions that would otherwise
prevent redistribution in an open-source app — emitting the same shape plus RxCUIs. RxCUIs matter beyond
autocomplete: they make the medication list interoperable for FHIR export and would let the document importer
match medications by identifier instead of by normalised string.

Structured dosing was **not** added and is not available free: openFDA and DailyMed carry label prose, not
computable dose rules; maximums and renal/geriatric adjustment live in commercial products (First Databank,
Lexicomp) whose licences generally forbid redistribution. This is recorded in the build script so the constraint
isn't rediscovered later.

**Size note carried forward from the pdf.js build failure:** the full prescribable set is several MB, and Workbox's
2 MiB precache ceiling is a hard build error. The script warns past 500 KB and documents moving the table to a lazy
chunk if the full set is ever wanted.

**Proof.** `drug-lookup-test.mjs` extracts the real `drugSearch`, `drugNormStrength` and `drugValidateDose` and
asserts every behaviour above, plus data integrity of the shipped table (no duplicates, every drug has at least one
strength, every strength parses). One assertion initially failed against the source comment that *documents* the
no-dose-suggestion rule; the check was narrowed to code rather than prose.

---

# Security fix: cloud OAuth refresh token was leaving the admin's device

Found while planning user-owned cloud storage (`CLOUD-STORAGE-DESIGN.md`). Suite **44 green**; app builds clean.

`settings.cloudAuth` holds `{provider, refreshToken, account}` — a long-lived credential for the admin's cloud
account. Two paths carried it off the device:

1. **Circle sync.** `circleStripForSync` removed `settings.deviceKey`, `circle.key` and `circle.relay` — but not
   `cloudAuth`. The admin's refresh token was therefore synced to **every teammate device in the circle**.
2. **Exports and backups.** All seven `.care` export and cloud-backup payload builders spread raw state
   (`{...data, …}`), so the token rode along in every backup file.

**Severity, stated accurately.** Both paths are encrypted — the relay and any cloud provider only ever saw
ciphertext, so nothing was exposed externally. The problem is scope: a credential the admin never chose to share
was landing on devices they do not control, cannot be revoked per-device, and would keep working after a teammate
was removed from the circle and the circle key rotated (rotation stops future data reads; it does not invalidate a
token already delivered).

**Fix.** A `stripCloudAuth()` helper removes `settings.cloudAuth` non-destructively; it now guards the circle sync
payload and all seven export/backup builders.

**Proof.** `cloud-token-leak-test.mjs` extracts the real `stripCloudAuth` and `circleStripForSync` and asserts the
token appears in neither a sync payload nor an export, that the existing strips (device key, circle key, relay
caps) still work, that real care data still syncs, that the source state is not mutated — and, at source level,
that **no payload builder anywhere spreads raw state**, so a new export path can't silently reintroduce the leak.

**Related, deliberately not changed:** `.care` exports still contain `circle.key` (import strips it, so a restored
device re-pairs, but the key is in the file at rest). Flagged as an open decision in the design rather than
altered without review.

---

# Cloud storage plan: both security debts resolved, decisions locked

Suite **44 green**; app builds clean. Closes the two items flagged in `CLOUD-STORAGE-DESIGN.md` §11 before any of
the storage work begins, and records David's §14 answers as locked decisions.

**1. No client secret ships in the browser bundle.** `GOOGLE_CLIENT_SECRET` is gone from the source, and no token
request attaches a secret. Google's token endpoint requires one for "Web application" clients *even under PKCE*,
and a secret readable in a JavaScript bundle is not a secret — so rather than ship something that looks
configurable and quietly isn't safe, **Google Drive is marked `unavailable`** and the picker explains why instead
of hiding it. Dropbox and OneDrive are genuine PKCE public clients needing no secret and remain the supported
pair. Google can return later via session-only tokens (Google Identity Services, no refresh token) or a
token-exchange endpoint an institution runs.

**2. Portable files carry no secrets at all.** `stripCloudAuth` became `stripPortableSecrets` and now removes the
cloud refresh token, **the device's ECDH private key, the circle key, and the relay capabilities**. Import already
discarded all of these, so keeping them in a `.care` file at rest was pure downside — a backup meant to be stored
and shared was carrying credentials nobody used. Circle **identity and epoch are kept**, so a restored device
knows which circle to re-join, re-pairs, and mints a fresh device key: the intended recovery path all along.
Verified against the existing round-trip suites (share-export, cloudsync, blob-roundtrip, circle-sync,
audit-backup) — all still green.

**Locked decisions (design §14):** skipping the storage choice yields **local-only** with a persistent nudge;
**local-only is permanently first-class**, not a degraded state; **one provider per circle**; **the relay remains
the default transport** with the admin's cloud as durable store; **seven days** without a successful write marks
the cloud copy stale. Design §15 records what each implies for the build — including a conflict check when a
second admin connects a different provider.

**Proof.** `cloud-token-leak-test.mjs` now asserts both items: no secret value (cloud token, device key, circle
key, relay caps) appears in a sync payload or an export; circle identity and epoch survive; no payload builder
anywhere spreads raw state; the Google client secret is absent from the source; no request attaches one; an
unavailable provider cannot reach the picker; and the UI states the reason.

---

# Cloud storage Phase 0: the storage layer

Suite **45 green**; app builds clean. This is infrastructure — no user-visible change yet. It exists so that
everything in Phases 1–4 can be proven headlessly instead of only on a phone.

**One interface over every destination.** `createMemoryStorage()` and `createCloudStorage()` expose the same
`put / get / list / del / quota` contract, so code above this line is identical whether the record lives on the
device only, on a relay, in the admin's Dropbox, or in a test fake. **Local-only is a provider kind, not a null
case** — the locked decision that it stays first-class is encoded in the shape of the layer rather than left to
discipline.

**Object layout.** Per-device state objects (`circle/{id}/{device}/state.enc`), never one shared blob: a shared
blob is last-write-wins at file granularity, which silently discards a teammate's work. Names are opaque —
a provider learns nothing from `state.enc` — and the **manifest is written last**, so a partial upload never
leaves an index pointing at objects that aren't there.

**Failure paths are testable, not hypothetical.** The memory provider models a byte quota and can be told to fail,
so quota exhaustion and provider outage are exercised in the suite rather than discovered in production. `QUOTA`
and `NOT_FOUND` are distinguishable error codes, because "warn at 80% and keep recording locally" needs to tell
them apart.

**Locked decisions encoded and tested:** the 7-day staleness threshold (fresh / ageing / stale, with an unset or
unparseable timestamp failing *safe* — stale, never silently fresh), and one-provider-per-circle conflict
detection that names both accounts so two admins can choose rather than silently forking the record.

**Three further decisions recorded** in the design (§14.6–8): the sharpened northstar wording — *no readable data
ever leaves your device, and nothing leaves at all unless you choose where it goes* — the recovery kit as a hard
gate for admins who connect cloud storage, and automatic upload once connected with a visible indicator and an
off switch.

**Proof.** `storage-layer-test.mjs` extracts the real layer and asserts the provider contract, quota accounting
and overwrite behaviour, injected failure, per-device key separation, opaque naming, manifest-last ordering, the
exact 7-day boundary, fail-safe staleness, and conflict detection. One assertion was wrong in my first draft (I
counted six upload objects as five); the code was right and the test was corrected.

**Still device-QA:** OAuth itself, per provider. `DROPBOX_APP_KEY` and `MS_CLIENT_ID` remain empty — those two
apps need registering before cloud storage can be exercised on real hardware.

---

# Google Drive restored, and the architecture change that made it first-class

Suite **46 green**; app builds clean. Full reasoning in `GOOGLE-DRIVE-DESIGN.md`.

**Correcting my earlier call.** I removed Google Drive because its token endpoint requires a `client_secret` a
browser cannot keep. That constraint is real and confirmed — Google requires it for **Web application** clients
*even under PKCE*. But I concluded "Google is impossible in a browser" when the truth is "**that one flow** is
impossible." Google's own recommended path for browser apps, **Google Identity Services (GIS), token model**,
needs no secret. I ruled out a provider when I should have ruled out a flow.

**The launch-gating question answered:** `drive.file` is a **non-sensitive** scope requiring only basic app
verification — **no CASA security assessment**, no annual paid audit. (Restricted scopes like `drive.readonly`
are what trigger that.) Keeping `drive.file` over `drive.appdata`: both are non-sensitive, but `drive.file` leaves
the encrypted objects **visible in the user's own Drive**, which suits a product whose promise is that they own
their records — and avoids putting the only durable copy in a folder they can't see.

**The architectural consequence.** GIS issues a short-lived access token and **no refresh token**, so Google Drive
access is **session-scoped**: real while the app is open, gone when it closes. That contradicts the locked
decision that uploads are automatic once connected. Rather than special-case Google through the sync code, the
engine now **treats provider availability as intermittent by default** and absorbs the gaps with a durable
**outbox**. This is honest for every provider — offline, expired token, revoked consent and exhausted quota are
indistinguishable from the app's side — so what makes Google first-class also hardens Dropbox and OneDrive.

Implemented: capability descriptors (`auth: persistent | session`, background yes/no, and a plain-language note
the UI cannot forget to show), with an **unknown provider degrading to `session`** — the cautious assumption. Plus
an outbox that deduplicates by key (each object is a full snapshot, so the newest supersedes), drains the
**manifest last**, bounds itself at 500 entries, **retains entries on failure** with attempt counts rather than
dropping work, abandons only after repeated failure, **stops on quota** instead of hammering a full account, drops
entries whose local source has vanished, and **resumes across sessions** so a one-tap reconnect uploads everything
that waited.

**Proof.** `storage-caps-outbox-test.mjs` asserts all of the above against the in-memory provider, including the
end-to-end session case: token gone → work waits, not lost; reconnect → queue drains.
`cloud-token-leak-test.mjs` was updated where it pinned the now-reversed decision, and instead asserts Google uses
the GIS flow with the non-sensitive scope and is declared session-scoped.

**Still David's to do, and worth starting now** because verification is measured in days: register the Google
Cloud project, fill `GOOGLE_CLIENT_ID`, and submit the consent screen for basic verification.

---

# Cloud storage Phase 1 (part): the outbox is wired into the real sync path

Suite **47 green**; app builds clean. The queue proven in Phase 0 now carries actual uploads.

**A real data-loss path closed.** `cloudStorageSync` called `prov.upload()` directly. If that threw — dead token,
dropped connection, full account — the catch showed an error and **the change never reached storage and was not
retained anywhere**. The user saw "sync failed" and had no idea their edit hadn't been saved anywhere but locally.
Uploads now stage into the outbox first and drain from it, so a failure means *queued*, not *gone*. There is no
`prov.upload()` left in the sync path, and the test asserts it stays that way.

**What the user is told changed too.** A failed upload no longer says only that sync failed: it says the records
are safe on this device and will upload automatically next time, and a full account gets its own message
("Your cloud storage is full…") instead of a generic error.

**Sync state is visible.** The connected-storage panel now shows a colour-coded line — up to date / N days old /
N changes waiting to upload — with the 7-day staleness warning **worded per provider**: for a persistent provider
it means something went wrong; for session-scoped Google Drive it may just mean the app hasn't been opened. Each
provider's own limitation note is carried in the capability table, so the UI can't forget to show it.

**Where the queued body lives.** Encrypted bodies sit in a ref, not the vault: they are large, already-encrypted
snapshots, and a queued object is always regenerable from current state. The *queue* persists, so the app
remembers there is unsent work across a restart; if the body is gone by then, the entry is dropped and the next
sync regenerates it rather than stalling forever.

**One thing caught while wiring it:** `_outbox` lives in persisted state, which meant it would have **synced to
teammates** and merged into their state — leaving them holding upload work for storage they don't have. The
upload queue is per-device bookkeeping and is now excluded from both circle sync and portable exports, asserted in
`cloud-token-leak-test.mjs`.

**Every upload writes to the HIPAA audit trail** (design §11.4), which was outstanding from the plan.

**Proof.** `outbox-integration-test.mjs` asserts at source level that the sync path stages and drains rather than
uploading directly, and then exercises the real queue end-to-end: a failed upload stays queued; further edits
supersede it rather than piling up; on reconnection the **latest** version uploads, not the stale one that first
failed; a body lost to a restart is dropped instead of jamming the queue; and the user-facing state, colour
coding and per-provider staleness copy are all present.

---

# Cloud storage Phase 1 complete: per-device objects and a manifest index

Suite **48 green**; app builds clean.

**The defect this closes.** Every device wrote to the *same* cloud file, `/care-guardian-sync.json`. Two devices
syncing on the same day overwrote one another and the loser's work vanished — no error, no trace, no way to
notice. Sync now writes `circle/{circleId}/{deviceId}/state.enc`: **writes never collide**, and merging happens in
the app where the HLC clock resolves it, which is where it always belonged.

**Why a manifest, specifically.** The cloud providers here implement `upload` and `download` but **not `list`** —
Dropbox, Drive and OneDrive each expose listing differently and none is wired. Discovery therefore cannot
enumerate a folder, so the manifest *is* the index: each device records its own object in it, and every other
device reads it to learn what to fetch. This was a constraint discovered by reading the provider code, not a
preference.

**Manifest races repair on read.** Two devices can read the same manifest and both write it back; at file level
the later write wins and the earlier device's entry disappears, making that device invisible until its next sync.
So the manifest is **merged** before being written — newest entry per device from both copies — and a device that
hasn't synced in a month keeps its entry, because **silence is not departure**.

**Also handled:** consumed versions are remembered (`seenDevices`), so unchanged objects aren't re-downloaded on
every sync; the manifest carries the circle key **epoch**, so a device left on a superseded epoch after rotation
is *reported* rather than silently unreadable; a manifest from an unknown future version is replaced rather than
half-read; and the **legacy single-file path is still read**, so existing deployments keep working through the
transition.

**Ordering safety comes free from Phase 0:** the manifest is staged through the outbox, which always drains
manifests last — so it can never advertise an object that hasn't landed.

**Proof.** `manifest-test.mjs` asserts per-device key separation, index construction, pull selection (everyone
else's, newest first, skipping already-consumed versions), the near-simultaneous-write repair in both merge
orders, quiet devices surviving, stale-epoch reporting, version guarding, and — at source level — that the real
sync path reads the manifest, writes to this device's own key, merges before writing back, stages the manifest
through the outbox, and still reads the legacy path.

**Phase 1 is done.** Remaining before cloud storage is usable end to end: Phase 2 (admin onboarding with the
storage choice, connection verification round-trip, and the mandatory recovery kit) and Phase 4 (failure-mode
handling and reconnect flows). Still blocked on David for real-device work: Google, Dropbox and Microsoft OAuth
app registration.

---

# Cloud storage Phase 2: admin storage onboarding

Suite **49 green**; app builds clean. This is the first user-visible part of the storage work.

**The flow.** After a fresh setup and the first-run personalisation, an admin is asked *"Where should these
records live?"* with three options: **just this device**, **this device and my own cloud**, or **a server my
organisation runs**. Local-only is listed **first** and described as "a fully supported option, not a lesser one" —
the locked decision made visible rather than merely honoured in code.

**Skipping is not consent.** "Decide later" leaves the app local-only and records the question as outstanding, so
a persistent nudge appears on the Care Management hub until the admin chooses. Dismissing the nudge is honoured.
Egress is never the path of least resistance and never the result of tapping past a screen.

**Connection is verified end to end, not just established.** The check encrypts a canary, uploads it, downloads
it, decrypts it, compares it with what was sent, then deletes the probe. Storage that is going to fail fails
**here**, in a calm moment during setup, rather than silently at 3am when someone is looking for a medication
record. A failed check reports the actual reason and reassures the admin their records are safe on the device.
Verification is audited; a failure to delete the probe does not fail the check.

**The recovery kit is a hard gate for cloud storage.** Finish is **disabled** until a kit exists — not a warning,
not a nudge. The provider stores the records but cannot decrypt them, so a cloud copy without a recovery kit is a
backup of a locked box, and connecting storage is precisely the moment people feel safe enough to skip this.
Local-only is deliberately **not** gated: the gate belongs where the false sense of safety is, though that branch
still explains why a kit matters.

**A bug caught in the writing:** my first version gated on `settings.recoveryCodeSetAt`, a field that does not
exist in this app — the gate would have been permanently shut. The real marker is the recovery wrap `wk.cRecovery`
in the wrapped-key object, so `hasRecoveryKit()` now reads that and fails closed on error. The test asserts the
gate checks the actual wrap rather than any settings flag.

**The privacy promise was corrected.** Onboarding said *"Care Guardian does not use the cloud. We have no
servers…"* — which stops being true the moment an admin connects storage. It now makes the sharper claim that is
still true: **no readable data ever leaves your device, and nothing leaves at all unless you choose where it goes.**
Shipping the old wording alongside a cloud feature would have been the most damaging kind of inaccuracy for this
project.

**Proof.** `storage-onboarding-test.mjs` asserts each locked decision as an enforced property: local-only listed
first and named first-class; skipping leaves local-only with the question still open; the nudge appears only while
outstanding, stops on connection, and honours dismissal; Finish disabled until a real recovery wrap exists;
local-only not gated; the round trip covering encrypt→upload→download→decrypt with comparison and cleanup; and the
corrected privacy copy.

**Remaining:** Phase 4 (failure-mode handling, quota warnings, reconnect flows) and Phase 5 (metadata
mitigations). Still blocked for real-device work: Google, Dropbox and Microsoft OAuth app registration.

---

# Cloud storage Phase 4: failure handling

Suite **50 green**; app builds clean. Implements every row of design §10.

**What it replaces.** Any storage problem produced `"Cloud sync failed: token refresh 503"` — the least useful
thing the app could say, because a caregiver cannot tell from it whether to reconnect, free up space, wait, or
start worrying about their records. Errors are now **classified** into six kinds, each mapped to one required
behaviour:

| Failure | Behaviour |
|---|---|
| **Auth** (401/403, `invalid_grant`, expired) | No blind retry — a dead token won't heal. One-tap **Reconnect**. |
| **Quota** (507, provider wording, our own `QUOTA` code) | Stop uploading, keep recording, say so. Warn at **80%**, before uploads stop. |
| **Offline** | Silent retry. Normal on a phone; raises no alarm. |
| **Outage** (5xx, dropped fetch) | Retry with backoff; no alarm unless persistent. |
| **Rate limit** (429) | Back off rather than hammer. |
| **Missing** (404, deleted folder) | Offer **Upload everything again**, rebuilding the cloud copy from the vault. |

**Backoff is bounded and honest.** Consecutive failures of the same kind back off exponentially to a one-hour
ceiling; a *different* kind of failure resets the counter rather than inheriting a long wait. Serious failures are
audited; routine offline blips are not, because an audit trail full of "the train went into a tunnel" is noise.

**Every message answers the only question a caregiver actually has** — *where are my records?* Each one says they
are safe on this device and recording continues. No message leads with a status code or the word "failed", and
the test asserts that.

**The invariant under all of it:** a storage problem must never stop someone writing down that a dose was given.
Recording is local-first and untouched by any of these paths.

**Proof.** `storage-failure-test.mjs` covers each §10 row, the 80% quota threshold (including a provider that
doesn't report quota reading as *unknown* rather than falsely *ok*), bounded backoff, retry scheduling, the
reset-on-different-failure rule, and — at source level — that the sync path classifies rather than prints, that
the old generic message is gone, that success clears the failure state, and that rebuilding forgets `seenDevices`
so everything is genuinely re-sent.

One assertion in `outbox-integration-test.mjs` was re-homed: it pinned a literal message that Phase 4 moved into
the classifier table, which is the better home — one place, one message per class. The property it checked is
unchanged and still asserted.

**Remaining:** Phase 5 (metadata mitigations — opaque names, size padding, batched writes) and Phase 7 (Privacy
Principles revision, Help content, per-provider device QA). Still blocked for real-device work: Google, Dropbox
and Microsoft OAuth app registration.

---

# Cloud storage Phase 5: metadata mitigations

Suite **51 green**; app builds clean. This is about what a provider can infer **without decrypting anything**.

**What the old layout gave away.** The provider holds unreadable ciphertext, but object names, sizes, counts and
timestamps are all in the clear — and the previous paths handed over the vocabulary to interpret them:
`archive/2026-07/audit-{deviceId}.{circleId}.enc` revealed that a **HIPAA audit trail exists**, **which months had
activity**, **how many devices** a family has, and **when each one syncs**. Encrypted care records in a named
person's Drive is already a signal; a filename saying `audit` sharpens it considerably.

**Names are now derived, not descriptive.** Object names are HMAC-SHA-256 derived from the circle key, truncated
and URL-safe. They are **stable** — the same object always lands in the same place, which the manifest and
re-export depend on — but meaningless without the key, and **scoped per circle**, so one family's layout tells you
nothing about another's. Everything sits in one flat `cg/` folder with one `.bin` extension, because a directory
tree is itself a disclosure of how the data is organised.

The manifest keeps a **fixed** name (`cg/index.bin`) on purpose: a device must be able to find the index, and a
device holding a rotated key must still locate it rather than losing the whole store. That name describes nothing.

**Sizes are bucketed.** Ciphertext length leaks volume — a 40 KB state object versus 400 KB says how much care is
being recorded, and a jump says something happened. Objects are padded into proportional buckets, so a quiet week
and a busy one upload the same number of bytes. Overhead is bounded (never more than ~25–35%) rather than padding
everything to a worst case nobody needs.

**Compatibility is preserved deliberately.** Opaque names require a circle key; solo use before a circle exists
falls back to plain names rather than crashing. `readManifest` still tries the pre-Phase-5 name, so an existing
cloud copy isn't orphaned by the upgrade.

**Not built, and stated rather than glossed:** write **batching**. The outbox already coalesces repeated writes to
the same key, so what remains is timing correlation — a 3am upload still tells the provider someone was awake at
3am. Fixing that needs a deliberate scheduling delay, which trades directly against the durability this whole
feature exists to provide. Deferred as a decision, not an oversight.

**Proof.** `storage-metadata-test.mjs` asserts that no name contains a word, id or date; that names are stable,
distinct, per-circle and URL-safe; that the index stays findable without describing itself; that padding buckets
correctly with bounded overhead; and — importantly — that padding **round-trips exactly**, including content with
embedded newlines and content that itself ends in `#`, since the padding marker uses both. Unpadding an unpadded
object is a no-op, so older objects still read.

---

# Security audit of the full file — two High findings fixed

Suite **52 green**; app builds clean. Full report: `SECURITY-AUDIT-2026-07.md`.

A systematic sweep across vulnerability classes over all 9,125 lines, plus hand reading of the storage, sync,
crypto, sharing and export paths. Nine classes swept clean (no `eval`/`Function`, DOM-XSS sinks fed only static
CSS, egress limited to OAuth providers with no telemetry, cryptographic randomness throughout with fresh IVs,
PBKDF2 600k, prototype-pollution guards, input limits, 51 audit write sites, client-voice exclusion intact).

**High — the storage manifest was uploaded in plaintext.** Phase 5 made object names opaque and padded object
sizes; the manifest beside them published, in the clear, every device id, its **human label** ("Mum's iPad"),
exactly **when each device last synced**, and each object's **true byte size**. The `bytes` field defeated the
padding built in the same phase and the labels defeated the opaque naming — the two mitigations cancelled through
a file neither covered. Records themselves stayed encrypted throughout. Now: manifest encrypted under the same
passcode as state objects and padded, `bytes` removed entirely (nothing consumed it), plaintext manifests from
the previous build still readable so no cloud copy is orphaned, and an unopenable manifest fails closed. This was
my own recent work, and both Phase 5 tests passed while missing it — they asked whether names and sizes leaked,
never what the index disclosed.

**High — three credentials travelled.** `backupPasscode`, `syncServerApiKey` and `syncPasscode` were stored in
the clear and rode both circle sync and `.care` exports, putting an admin's credentials on every teammate device
and in every portable backup — unrevokable per-device, and outliving removal from the circle. All three are now
stripped. **Consequence worth knowing:** a teammate must now be *told* the sync passcode rather than inheriting
it silently. This is the third instance of the same pattern (after the OAuth refresh token and `_outbox`), which
says the defect is the **deny-list default**, not the individual fields — the report's first recommendation is to
invert it so a new secret is contained unless explicitly opted out.

**Low — four destructive functions** (`removeCustomSub`, `removeSub`, `deleteContactNote`, `removePlanStep`) were
gated in the UI but not in the function, unlike ten comparable ones. Fixed for consistency.

**Accepted with reasons stated:** identifiers minted via `Math.random()` (none is a secret; `grantId` feeds only
an HKDF salt alongside a 96-bit nonce, so the residual risk is collision, not prediction), and two unescaped
interpolations in the print/share document that are `Math.round()` numbers and provably non-exploitable.

**Stated as out of reach rather than passed:** real provider behaviour, dependency supply chain, side channels,
device-only flows, and the cryptographic designs themselves — the last remains the job of the independent human
review, which this does not replace.

---

# Competitor-gap build: dose attribution, care-recipient view, linked appointments, multi-photo

Suite **53 green**; app builds clean. Four items from the Caring Village feedback analysis, in the agreed order.
SSO was deliberately **not** built — see the reasoning at the end.

**1. Dose attribution (their #1 complaint, and a real gap in ours).** The medication log recorded
`{medId, slot, date, status, timestamp}` and **no actor**. Multiple caregivers, one patient, no way to see a dose
was already given — the exact setup that causes accidental double-dosing. Every dose now records **who** (device
name plus a stable id, so attribution survives a rename), **when** as an **ISO timestamp** (six log sites used
`toLocaleString()`, a locale-formatted display string that neither sorts nor compares — wrong type for an audit
trail that might reach an attorney), and attribution is re-stamped on every state change rather than only the
first. The grid now **shows** who and at what time in the cell itself, which is what actually prevents the second
dose.

**Skip-with-reason.** The cycle is now given → missed → refused → **skipped** → clear. "Missed" means nobody gave
it; "skipped" means a caregiver deliberately withheld it, which is a clinical decision and carries a reason. Seven
clinical reasons are offered (held on clinical advice, vitals out of range, nil by mouth…), prompted inline right
where the dose was withheld rather than expecting a note later.

**The adherence judgement call:** a **skipped** dose is removed from the scheduled denominator, so following
medical advice never reads as failing to medicate — a day whose only other dose was deliberately held shows as
complete. A **refused** dose stays in the denominator, because a patient declining is a clinical signal rather
than a plan change. Both are tested.

**2. Care recipient's own medication view.** A person with dementia shouldn't read a caregiver's admin grid to
answer "have I taken my tablets?". Client sign-in now gets a large-print **next dose only** view — what to take,
what dose, nothing to edit, and deliberately **no adherence scoring**: the record is about them, not a report card
on them. Already-taken doses are listed with times. The caregiver grid is gated away from that role.

**3. Contact-linked appointments.** Picking the provider fills in the location from their organisation and offers
the title, and the appointment then shows **tap-to-call** — the phone number is what a caregiver actually reaches
for when running late or lost. The contact is resolved live, so an updated phone number flows through.

**4. Multi-photo.** The three-photo cap was a magic number in three places; photos are externalised to the blob
store (only a small `blobref:` string stays in the vault), so the cap was a UI choice rather than a storage
constraint. Now one named constant, `MAX_ENTRY_PHOTOS = 8` — enough for wound-care progress or a multi-page lab
result.

**Verified as already strong, not rebuilt:** their timezone "one day off" bug (every date parse is noon-anchored,
so we sidestep the UTC shift), their "checklist stuck on yesterday" bug (medication state is date-keyed, so there
is no state to reset), their country-gating problem (a PWA has no App Store jurisdiction), and their single
biggest churn driver — registration failures, password-reset loops, lockouts — which is **structurally impossible**
here because there are no accounts, no passwords and no server.

**SSO deliberately declined.** Google/Apple SSO implies accounts, which implies a server holding identity, which
would forfeit exactly the property that makes their §5 churn impossible for us. The adjacent value already exists
in the Drive work: "sign in with Google" belongs to *storage*, not identity.

**Proof.** `dose-attribution-test.mjs` asserts the actor fields, ISO timestamps, re-stamping on every change, the
new cycle, reason retention, the grid displaying who/when/reason, and the two adherence judgement calls.
`med-adherence-test.mjs` was updated where the caregiver grid gained its `!isClient` gate, and now also asserts
the care recipient gets their own view.

---

# Welcome screen: rewritten, and now skipped when it has nothing to ask

Suite **54 green**; app builds clean. David flagged two problems on the install step; investigating them turned up
a third, larger one.

**The claims were wrong.** *"Because your data is totally private, your web browser might clear it during routine
maintenance"* is a non-sequitur — privacy is not why browsers evict storage; **low disk space** is. And *"Saving
Care Guardian to your home screen keeps your records safe"* implied that a bookmark is the protection, which it
isn't. The Chromium instructions (*"Open the ⋮ menu… click the install icon at the right end of the address bar"*)
described one browser at one version; they matched nothing David had used.

**The bigger problem underneath.** The app **already calls `navigator.storage.persist()`** in seven places,
including during setup. That API *is* the durability mechanism, and it needs no user action. The screen was
asking people to do manual work to obtain a protection the code had usually already got — and never checked
whether it had.

**What it does now.** On mount the app asks `navigator.storage.persisted()` what the browser has **already**
granted. If storage is protected, the screen says so ("Your records are protected") and notes that installing is
still nice for full-screen access — or is **skipped entirely**, along with the already-installed case. A screen
that asks for unnecessary work teaches people our warnings can be ignored, which is expensive later when a
warning matters.

When persistence *hasn't* been granted, the wording is accurate: browsers clear data when a device runs low on
space, and installing is what usually convinces the browser to protect it. Where the browser offers its own
install prompt, that is invoked directly — no instructions to get wrong. iOS keeps step-by-step instructions,
correctly, because it has no install API and no persistence request. The remaining fallback says where to look in
general terms, admits some browsers show an address-bar icon instead, and tells the user what to do if there's no
option at all rather than leaving them stuck. Continuing re-checks persistence instead of assuming success.

**Proof.** `onboarding-accuracy-test.mjs` pins each removed false claim, asserts the real mechanism is named and
the real reason given, and asserts the state-aware branch, the on-mount check that makes it reachable, the skip
condition, prompt-over-instructions, and that the screen never implies data is lost if the user declines.

---

# Layout uses the whole screen; self-hosted server is a real flow

Suite **55 green**; app builds clean.

**Layout — two separate causes, both fixed.** `.content` was capped at `max-width:960px` with **no auto margin**,
so on a wide laptop the app hugged the left third of the window. Separately, `.auth-card` was fixed at **360px**
and `.onb-card` at **400px** *at any screen size*, so onboarding stayed phone-sized on a desktop. Maxing the text
setting couldn't rescue either, because the **container** was the constraint, not the font.

Content now runs to `min(1400px,100%)` and is centred; the welcome cards scale to `min(680px,92vw)` /
`min(720px,92vw)` with padding that scales via `clamp()`. Widening alone would have made things *worse* — a
1400px line of prose is harder to read, not easier — so two breakpoint tiers (1024px and 1500px) also scale
titles, body text, buttons, inputs and tables, while long-form prose keeps a **62ch measure**. At 1180px card
lists become two columns instead of one stretched row. All of this sits **on top of** the user's own text-size
setting, which still multiplies everything: this raises the floor rather than replacing their choice.

**"A server my organisation runs" was a dead end.** It fell through to the OAuth provider list — three buttons
that cannot help someone self-hosting. It now has its own flow asking for the two things self-hosting actually
needs: a server address and an access key. All the plumbing already existed (`setServerConfig`,
`validateSyncUrl`, `serverSync`); onboarding simply never reached it.

The flow explains what would satisfy the requirement (the reference relay, an S3-compatible bucket, or WebDAV),
tells a non-technical admin to ask whoever set the server up rather than assuming they'd know, and names **CORS**
up front because it is the usual cause of a failed connection. Verification does a real round trip —
PUT, GET, decrypt, compare, DELETE — and translates a bare browser `Failed to fetch` into the actionable cause
rather than reporting "failed". The recovery-kit gate applies here exactly as it does for cloud, because a
self-hosted server cannot decrypt the records either.

**Proof.** `layout-server-test.mjs` pins both the removed constraints and the new tiers (including the 62ch
measure and that the user's scale setting still applies), and asserts the server branch no longer shows OAuth
buttons, asks for address and key, saves through the existing config path, explains CORS, and verifies by full
round trip. `storage-onboarding-test.mjs` had a slice that assumed "cloud" followed "local" — corrected, and it
now also asserts the recovery gate covers the server case.

**Not verifiable here:** how this actually looks. The widths and type scales are asserted in CSS, but only your
eyes on a real laptop can say whether the result reads comfortably.

---

# Backup rework: the button now backs up

Suite **56 green**; app builds clean. Implements `BACKUP-UX-PROPOSAL.md` with David's four decisions.

**The bug, plainly.** "Back up now" did not back anything up. Its whole handler was
`{setShowBackupReminder(false); nav("settings")}` — hide the banner, navigate to Settings. Nothing exported, no
marker stamped, so the prompt returned on the next unlock. It now calls `backupNow()`, which writes to the chosen
backup file if there is one, otherwise downloads a copy, handles lapsed file permission rather than failing
silently, and records that it happened.

**The nag is driven by content, not the session.** The reminder effect listed `authed` as a dependency, so
locking and unlocking — which changes no data — re-ran the whole check. "Backed up" was also measured by a
timestamp, so a backup taken before ten more incidents still read as done for seven days. Both are replaced by a
**content fingerprint**: same hash means backed up, regardless of session events; different means the app can say
**"2 changes not saved"** rather than "it's been a while". Sync clocks, the upload queue and the backup timestamp
are excluded from the hash — otherwise the app would declare itself out of date the instant it finished backing up.

**One backup passcode (decisions 1 + 3).** There were three secrets in this area: a typed export passcode that was
never remembered, a separate continuous-backup passcode, and the recovery code. A `.care` file whose passcode
nobody wrote down is a wasted download. The passcode is now **derived from the vault key** the user already
unlocked with — one secret, nothing new to remember — with an override for an admin who deliberately sets their
own. Old `.care` files are not readable under the new derivation; per David, there are no existing users to
migrate.

**Protect Your Data is three real buttons.** Previously only step 1 had a control; steps 2 and 3 were text with a
status badge, and the actual controls lived in separate sections further down the same page titled "(Step 1)",
"(Step 2)". Each step is now its own control, with honest state — *✓ Saving automatically · saved 4 minutes ago*,
*⚠ Paused → Reconnect the file*, *2 changes not saved → Save now*. **Team moved to Team Management** (decision 4),
leaving a pointer, since multi-device copies genuinely do aid durability.

**Backup folded into onboarding (decision 2)** rather than added as a step: it appears inside the "everything
stays on this device" screen, because the obvious next question there is *"what if I lose it?"*. Skippable, and
skipping keeps the nudge live. iPhone gets its own path up front — File System Access doesn't exist in any iOS
browser — rather than an error after the attempt.

**Two things caught while building, both worth noting.** The recovery-kit button initially scrolled to an element
inside a **collapsed** `<details>`, which would have shown the user nothing; it now opens the group first. And the
regression suite caught that folding backup into the local-only screen had removed its recovery-kit explanation —
restored.

**Proof.** `backup-ux-test.mjs` asserts the button actually writes, the reminder depends on data rather than
session, the fingerprint ignores bookkeeping churn, the change count is accurate, there is exactly one passcode
accessor derived from the vault key, all three steps have controls, Team is gone with a pointer in its place, the
recovery jump opens the collapsed group, and onboarding folds backup in with an iOS path.

---

# Fix: backup crashed — and the crash was hiding something worse

Suite **57 green**; app builds clean. David hit this on a real phone:

> Couldn't back up: Failed to execute 'exportKey' on 'SubtleCrypto': parameter 2 is not of type 'CryptoKey'.

**The immediate cause** is mine, from the previous build. `getBackupPasscode()` called
`crypto.subtle.exportKey("raw", dekRef.current)` — but `generateDEK()` returns a **`Uint8Array`**, not a
`CryptoKey`. The call could never have worked.

**The crash was lucky, because the design under it was worse.** A DEK-derived passcode is a random value the user
**never sees**, while restore (`handleEncryptedImport`) decrypts with a passcode they **type**. On a new device
after losing the old one there would be no DEK to derive from and nothing to type: every backup produced would
have been **permanently unrestorable**. The exception stopped any such file from being written. Had the type
error not existed, this would have shipped as silent, total backup loss — discovered only by someone trying to
recover after losing a device, which is the worst possible moment.

**The fix.** The backup key is derived from the **passcode**, which the user knows and can type anywhere. It is
prepared at unlock (where the typed passcode is in scope) and at first-time setup, held in a session ref,
**never persisted**, and cleared on lock alongside the device key. Restore accepts **either** form — the typed
value verbatim (a custom backup passcode) or its derivation (their unlock passcode) — so a caregiver never has to
know which kind of secret their file used. Locked decision 1 still holds: one secret, nothing new to remember.

**Two more things visible in the same screenshot, both fixed.** The failure was rendered in the **success-green**
box, because `flash()` had no severity — every message looked like good news. It now detects failure wording and
styles it as an error. And the backup banner was a single flex row, so the button squeezed the text into a narrow
column consuming most of a phone screen; it now wraps below 640px.

**Proof.** `backup-passcode-test.mjs` asserts the DEK is never exported, the derivation input is the passcode,
it is prepared at unlock and setup, cleared on lock, never persisted, and — the property that matters — that
**the same passcode always derives the same key**, which is what makes a backup from a lost phone open on a new
one. Plus restore trying both forms, error styling, and the banner wrap. `backup-ux-test.mjs` had an assertion
pinning the broken DEK derivation; updated to the corrected design.

---

# Install guidance: stop describing browser UI, and stop suppressing the browser's own offer

Suite **57 green**; app builds clean. David asked why the app keeps claiming install options exist that none of
his browsers show. Two separate answers, and one of them is a bug I introduced.

**Why I kept writing it, plainly:** those instructions describe Chromium-on-desktop behaviour, which is one
browser family on one platform. Whether an install option appears depends on browser, version, platform, and
whether the page met installability criteria at that moment. **The app cannot observe any of that.** Writing them
was asserting something unverifiable, repeatedly, and each rewrite kept a softened version of the same claim
instead of dropping it.

**The bug underneath — self-inflicted.** The `beforeinstallprompt` handler calls `e.preventDefault()`, which
**suppresses the browser's own install banner** so the app can offer it at a better moment. That is a promise the
app then has to keep. It didn't: the captured prompt was surfaced in exactly **one** place — onboarding step 1 —
and the previous build made that step *skip entirely* once persistent storage was already granted. So on a device
where storage was protected, the app took away the browser's install offer and then never showed its own.

**Fixed.** One shared `installApp()` action, used from onboarding, the standing nudge, and a new Settings entry —
so a captured prompt is never orphaned. The app now listens for `appinstalled` and stops asking. The standing
nudge only appears when there is something the user can actually do (a captured prompt, or iOS where the Share
sheet instruction is reliable) — it previously told **Android users to "tap Share"**, which is iOS-only.

**No more menu instructions.** Where no prompt was offered, the app now states only what it can observe:
*"This browser hasn't offered an install option for Care Guardian. That's fine — your records are already in
protected storage and nothing more is needed."* iOS keeps its step-by-step, because Safari's share sheet is
consistent and there is no install API to use instead.

**New: Storage & install status** in Protect Your Data, reporting what the browser actually says — running as an
installed app, install prompt offered, storage persistent, backup state — so "why is there no install option?"
becomes answerable from facts instead of guesses.

**Verified, not assumed:** the built app **meets Chromium installability criteria** — manifest linked, name,
`start_url`, `display:standalone`, 192px + 512px + maskable icons all present as real files, service worker
registered, and a `fetch` handler in the workbox runtime. So the absence of an option is a browser decision, not
a missing manifest. That check is recorded so it can be re-run after any build change.

**Proof.** `onboarding-accuracy-test.mjs` now asserts the app never tells users to hunt through a browser menu or
claims an address-bar icon, states the observable fact instead, and that `installApp` is reachable from more than
one entry point, the nudge only renders when actionable, `appinstalled` is handled, and the diagnostic exists.
Assertions strip comments first, since the source documents the removed claims deliberately.

---

# Text size: an enforced 11pt floor, and scaling from the root

Suite **58 green**; app builds clean. Third attempt at this, and the first two failed for a reason worth
recording.

**Why the earlier fixes didn't work.** They widened *containers* and scaled about a **dozen named classes** at
1024px. Measuring the whole stylesheet showed the real picture: **292 of 399 font-size declarations were below
11pt**, 151 of them at 13px. No amount of container widening moves text that is declared at 13px. I was treating
symptoms I could see in one screenshot instead of measuring the system.

**Two changes, both systemic.**

1. **A hard 11pt floor.** 11pt = 14.67px, so every declaration below **15px** was raised — 293 in the stylesheet
   plus **38 inline JSX `fontSize` props** that the first pass missed entirely because they use a different
   syntax. Nothing anywhere is now below the floor.
2. **The root scales, not individual classes.** `html{font-size:calc(var(--ui-scale-pct,100%) * var(--screen-boost,1))}`
   with boosts of **1.10× at 1024px, 1.20× at 1500px, 1.28× at 1900px** — so every rem-based size grows together,
   and it **multiplies** the user's own text-size setting rather than replacing it (130% chosen × 1.20 = 156%).

**Effective result on a 1920px laptop: the smallest text in the app is 19.2px and body text is 20.5px** — against
13px before. Cards were widened again too (onboarding to 900px, auth to 860px), with prose held to a 64ch measure
so the extra width improves legibility instead of hurting it.

**Made enforceable.** `text-size-test.mjs` audits **both** syntaxes and fails if any declaration falls below 11pt,
asserts the root-boost mechanism and each breakpoint, and checks the rendered size at each tier. This is now a
rule the suite defends rather than a thing to remember.

**Note on the screenshot:** it shows the browser-menu install text ("Look in your browser's menu… some browsers
show a small install icon in the address bar"), which was removed in the previous build. The deployed site is
running an older bundle — that copy is already gone in this one.

---

# Fix: "Choose where to keep it" did nothing

Suite **59 green**; app builds clean. Two faults compounded, both introduced by me in the backup rework.

**1. A guard that could never pass.** `setupContinuousBackup()` began with a check requiring `backupPw` — a typed
passcode field that exists **only in the Settings form**. On the onboarding screen that state is always empty, so
the function returned on its first line, every time.

**2. The refusal was invisible.** That guard reports through `flash()`, and the onboarding screen doesn't render
`settingsMsg`. So the button refused silently — indistinguishable from a broken one, which is exactly how it
looked.

**A third problem the first two were hiding:** the screen promises *"Your passcode opens it. Nothing new to
remember"* while the function demanded a separate six-character secret. The copy and the code disagreed.

**Fixed.** A typed passcode is now **optional** — supply one and it's validated and stored; leave it blank and the
backup uses the passcode already unlocked with, which is what the screen promises. Only an *explicitly chosen*
passcode is persisted: storing the derived one would freeze it, so a later passcode change would silently stop
matching the backup file.

`setupContinuousBackup()` now **reports its outcome** — `true` configured, `null` cancelled (closing the file
picker is not a failure), `false` refused — and the onboarding screen renders that inline, confirms success on
screen, and offers "Or just download a copy now" when the file picker isn't usable.

**Checked while fixing, because it would have been the next silent failure:** `showSaveFilePicker` requires an
active user gesture, and `getBackupPasscode()` became async in the previous build. Awaiting it *before* the picker
would consume the activation and the dialog would never open. The picker is still the first `await`, and the test
asserts it stays that way.

**Proof.** `onboarding-backup-test.mjs` covers the removed guard, the optional passcode, the derived fallback, the
explicit-only persistence, the user-gesture ordering, all three outcome values, and that the screen reports
results inline rather than through a `flash()` surface it doesn't have. It strips comments before asserting on
rendered copy — the third test to trip over the source's own explanatory text, so that is now standard here.

---

# Fix: "Download a copy now" did nothing — and the pattern behind three such bugs

Suite **60 green**; app builds clean.

**Root cause.** The backup key is derived at sign-in and held in a session ref. That derivation lived **only in
`tryAuth`** — the returning-user path — and **not in `completeSetup`**, which is what a brand-new user runs. The
onboarding screens only ever appear for new users, so `getBackupPasscode()` threw every time, on the exact screen
where those buttons live. `completeSetup` now prepares it from the passcode just chosen.

**Why it looked like nothing happened.** The failure reported through `flash()`, and the onboarding screens don't
render `settingsMsg`. Invisible refusal is indistinguishable from a dead button.

**Also wrong on that screen:** the fallback said *"iPhone browsers don't allow apps to save files automatically"*
— on Brave for **Windows**. That branch means "no File System Access API", which is not the same as "iPhone".
Brave on desktop lands there too. Non-iOS browsers now get accurate wording.

**The pattern, stated plainly.** This is the third onboarding button in a row to ship as a silent no-op: "Back up
now" navigated instead of backing up; "Choose where to keep it" required a field that screen doesn't have; this
one hit an unprepared key. All three had the same shape — *a handler bails early, reports via `flash()`, and the
screen has no `flash()` surface.* Fixing each specific bug kept missing the next, because I was reading the
source for the reported symptom rather than testing the property.

**So the fix is a property test, not another patch.** `onboarding-actions-test.mjs` asserts that every backup
action returns an outcome on **every** path (a bare `return;` is what makes a button look dead), that the backup
key is prepared on **both** entry paths into the app, and that every action on a screen without a flash surface
reports its own result inline. It immediately caught a **third** button I had missed in this same fix — the "Or
just download a copy now" fallback — which is the point of writing it this way.

`backupNow`, `handleEncryptedExport` and `setupContinuousBackup` now all return true / false / null (cancelled),
and the onboarding screen shows the result: *"✓ Copy downloaded. Keep it somewhere safe — your passcode opens
it."*
