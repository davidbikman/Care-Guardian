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
