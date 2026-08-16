# Audit-log durability — design

**Status:** Design (no code yet). Addresses the fragility that the HIPAA audit log, while tamper-evident, lives only in the local `care-guardian-audit` IndexedDB — so deleting the app (or losing the device) destroys the 6-year record (§164.316(b)(2)(i)), leaving manual CSV export as the only safety net.
**Builds on:** the proven live-intake transport (`TRANSPORT-INTAKE-DESIGN.md`) and the ECDH-ES grant crypto.

---

## 1. The problem, precisely (grounded in the code)

- The audit log is a **separate IndexedDB** (`care-guardian-audit`), deliberately so it "survives vault deletion" — but only as long as the *browser/device* survives. Uninstall, cleared site data, or a lost/replaced device take it with them.
- It is **not** included in the encrypted export/backup, and **not** in cloud or team sync (`readAuditLog` is referenced only by the unlock/verify path, never by any `exportData` payload or sync body). So there is currently **no** durability path other than the manual CSV.
- Entries are **sealed under a passcode-derived key** (`deriveAuditKey`, separate salt) — only the family can read them.
- Tamper-evidence is a **hash chain** (`seq` + `prevHash` + `hash`) with the tip in `localStorage`. The code's own comment is the key insight: this gives tamper-*evidence* against partial edits, not *prevention* against a passcode-holder who recomputes the chain — "which would require an external append-only anchor." That anchor is the second half of this design.

So there are two distinct gaps: **durability** (the record can vanish) and **tamper-resistance** (a determined insider with the passcode could rewrite their own local chain). Both are solved by the same move — getting the log off-device into append-only storage — but they have different audiences.

---

## 2. Constraints this must respect

Privacy-first and zero-egress-by-default are non-negotiable: any off-device copy must be **end-to-end encrypted**, **user-initiated**, and land on a destination the **user or institution controls** — never a Care Guardian server. And the audit log's `detail` text can reference sensitive actions, so a durable copy must not quietly widen who sees what.

---

## 3. The reframe: durability has two audiences, and a consent question sits between them

Durability fundamentally requires an off-device copy. *Where* that copy goes determines everything:

- **The family's own backup.** The simplest, most universal durability is the family's *own* encrypted backup/sync — the same place the rest of their vault already goes. No new exposure, no new party.
- **The institution's retention.** HIPAA's 6-year retention is a **covered-entity** obligation. In the Option-3 model (the institution licenses the tool to families), the institution may be the covered entity and need a durable, tamper-resistant audit trail of how its tool is used. That is exactly who HIPAA wants holding the record.

**The tension that is yours, not mine:** the audit log records *every* action on the device — which is **broader than the care-status projection** a family consented to share with a navigator. Durable *institutional* retention of the full log is therefore a **different, broader disclosure** than the navigator grant. Whether the institution is *entitled* to it depends on whether the institution is the **covered entity** for the family's use — a legal/deployment-model judgment in your domain, not a technical one. The mechanism below serves whichever model you choose; what changes is the **consent framing**. This design will not bundle audit retention silently into the care grant.

---

## 4. Layer 0 — make backup and sync actually carry the audit log (baseline; do regardless)

Include the audit entries in the **encrypted export/backup** and in **cloud/team sync**, encrypted under the family's own key, to the family's own destination.

- Closes the "deleted app destroys the log" gap for anyone who backs up or syncs — **no new transport, no new party, no new consent**, fully within zero-egress (only user-initiated transmission, to the user's own storage).
- The chain is preserved verbatim (entries already carry `seq`/`prevHash`/`hash`); restore re-writes them to the audit DB and re-verifies.
- Pair with the existing `lastBackupAt` tracking: a **"your audit log hasn't been backed up in N days"** warning turns a silent risk into a visible nudge.

This is the unambiguous first step and it helps every deployment. It does **not** by itself give tamper-*resistance* (the family controls their own backup) — that's Layer 1.

---

## 5. Layer 1 — institutional durable retention over the intake rails (covered-entity deployments)

For deployments where the institution is the covered entity, stream the audit log to the institution's **intake endpoint** — the same rails we just proved, with a dedicated stream:

- **Dedicated prefix, separate from care data:** `audit/{deviceId}/` (distinct from the care-status `fam/…` prefix), so audit retention and care-status sharing are independent capabilities with independent consent.
- **Incremental append-only objects:** each push is a batch of entries since the last pushed `seq`, written as an immutable object `audit/{deviceId}/{seqStart}-{seqEnd}.cgaudit`. Never overwrite.
- **Sealed to the institution's program key** (same ECDH-ES as grant bundles) so only the institution can read *its own* audit trail; the intake storage holds **ciphertext only**.
- **Rides the proven transport:** write-only, prefix-scoped capability; fail-closed reads; the same push-on-sync trigger. No new transport primitive.
- **6-year retention = the institution's storage lifecycle.** The covered entity retains its own record on its own storage — precisely where HIPAA places the obligation. The app's job ends at delivering the entries durably and verifiably.
- **The append-only store is the "external anchor" the code asked for.** Once a batch lands in write-only / object-locked storage, the family — even with the passcode — cannot alter the institution's copy. Tamper-*evidence* becomes tamper-*resistance* for the retained record.

---

## 6. Layer 1 consent — explicit, separate, and gated

Because this is broader than the care grant, it gets its own disclosure:

- The institution's enrollment code declares audit retention is required for this deployment (a flag alongside the existing `intake` block).
- The family sees a **distinct acknowledgment**, in plain words: *"[Institution] keeps a secure copy of your activity log for compliance, for 6 years. This is separate from the care updates you share."* Not pre-checked into the care consent; a deliberate, legible step.
- It is **off** unless the deployment requires it and the family acknowledges it. The standing indicator reflects that an audit stream is active, with last-sent time.

---

## 7. Layer 2 — institution-side verification, retrieval, and export (reviewer mode)

The retained record is only useful if it can be *trusted and produced*:

- **Retrieve & reassemble:** reviewer mode pulls a device's `audit/{deviceId}/` batches, orders by `seq`, and reconstructs the full log.
- **Verify end-to-end:** re-run the chain verification across batch boundaries; **flag gaps** (missing `seq` ranges — e.g., a device that pushed intermittently) so absence is visible rather than silent.
- **Produce the compliant record:** export the verified 6-year log (CSV/PDF) for an auditor, with the chain-verification status attached.
- **Multi-device:** each device has its own `seq` space and `deviceId`; chains are **per-device**, verified independently. (The app is multi-device via team sync; this keeps each device's evidence self-consistent.)

---

## 8. Honest residuals

1. **The covered-entity / consent-scope question is yours.** The mechanism is model-agnostic; the legal framing (who is the covered entity, what consent is required, whether the institution may hold the *full* activity log) is your call and shapes §6.
2. **Audit breadth > grant scope.** Institutional retention is broader than the care projection; that's why it carries its own consent and its own prefix.
3. **True WORM needs storage-level immutability.** Write-only capabilities stop the *family* from overwriting, but tamper-*resistance against the institution itself* requires object-lock / immutable storage (e.g., S3 Object Lock) on the audit prefix. The reference endpoint should document this; a real deployment should enable it. (Threat model note: the institution altering its *own* record is a different threat than an outsider or the family — object-lock addresses even that.)
4. **A pure-local family with no sync and no institution cannot have durability.** Durability needs *some* off-device copy. The app can make backup frictionless and warn on staleness, but it cannot conjure persistence from a single device. We should say so plainly rather than imply otherwise.
5. **Retention *policy* lives on the institution's storage, not the app.** The app delivers entries durably; the 6-year lifecycle, immutability, and access control are the covered entity's storage responsibility — which is correct.
6. **Two key custodians, by design.** The family's local copy stays passcode-sealed; the institution's retained copy is sealed to its program key. Each party reads its own copy — consistent with the grant model, and it means losing the family passcode does not lock the institution out of its own compliance record (and vice-versa).

---

## 9. The one decision before Layer 1

**Is the institution the covered entity (or BA) for the family's use of Care Guardian in the Option-3 model, such that it both needs the 6-year audit trail and is entitled to retain the family's full activity log under the BAA/consent?** If yes, Layer 1 + its consent ship as designed. If it's more nuanced (e.g., the institution needs only audit of the *shared* interactions, not the family's entire device activity), we narrow the audit stream to grant- and share-scoped events — at the cost of it no longer being a *complete* system audit trail. That trade is yours to set; the build follows from it.

---

## 10. Proof plan (when built — standing rule)

Isolated, before integration, extending the intake proof harness:

- **Layer 0:** backup/sync round-trip **preserves the chain** — export → wipe → import reproduces entries with `seq`/`hash` intact and `verifyAuditChain` returns `ok`; a tampered backup entry is detected on restore.
- **Layer 1 containment:** the audit stream is **ciphertext-only at rest** (a sentinel `detail` never appears in a stored object); the audit capability is **write-only + prefix-scoped to `audit/{deviceId}/`** and cannot read/list/cross-write; batches are **append-only** and a re-push is idempotent.
- **Layer 1 continuity:** the reviewer reassembles batches, **verifies the chain across batch boundaries**, and **detects an induced gap** (a missing `seq` range) and a poisoned batch (fail-closed).

---

## 11. Phasing

- **v1 — BUILT:** Layer 0 — audit log into the encrypted **backup** (manual `.care` + continuous auto-backup) + restore on recovery/merge, plus the stale-backup warning naming the log. Proven by `tests/audit-backup-test.mjs`. (Scoped to backup, not multi-device sync — the single-`seq` chain can't be safely merged across devices; that's Layer 1's per-device streams.)
- **v2 (after your §9 decision):** Layer 1 — audit stream to the intake endpoint, sealed to the program key, on the `audit/` prefix, with its explicit consent; document object-lock for the audit prefix on the reference endpoint.
- **v3 (with v2):** Layer 2 — reviewer retrieval, cross-batch verification, gap detection, compliant export.

---

## Layer 1/2 — DECISION: model (B), built

**Decision (David):** the external organization is **not** the covered entity; the app and its data stay under the family's control. Of the §3/§9 fork — (A) whole-device chain with redacted private events vs. (B) a separate chain of only shared-scope events — **(B) is built.**

Under (B) the institution receives a self-contained, per-institution chain of only sharing events (`grant.created`, `update.sent`, `sharing.changed`, `grant.revoked`). The family's full local log never leaves. This is strictly more private than redaction: not only is private *content* absent, the chain's `seq` counts only sharing events, so private-activity *volume* is invisible too.

**Resolution of the four review amendments:**
1. **Redaction paradox — moot.** (B) puts nothing private in the stream, so there is nothing to redact and no chain to break. (For the record, had (A) been chosen, naive "strip the detail and re-hash" still breaks the chain — `prevHash` was committed over the original hash at creation; the correct fix is a *salted commitment* baked into the entry format: `hash = H(id,seq,ts,detailCommit,prevHash)` where `detailCommit = H(salt_e‖body)`, sending `salt_e`+body for shared events and withholding both for private ones, so the chain still verifies while content stays local. (B) avoids needing this entirely.)
2. **Lost-device race — immediate flush.** Shared events flush on creation (they are the critical events); offline entries are written locally and re-pushed on next sync (`flushSharedAudit`, idempotent). The institution tracks last-received seq, so an unconfirmed tail is visible, not silently lost. The action is never blocked on the network (offline-first preserved); tamper-resistance is stated as resuming once the batch clears.
3. **Seq vs. time gaps.** `verifySharedChain` flags only sequence breaks: interior gap = compliance failure; missing tail = unconfirmed; time gaps are never flagged (the chain holds only events).
4. **Device revocation.** Cut off at the endpoint via capability rotation (proven), not by changing the family passcode (which doesn't touch the write cap). The per-grant prefix bounds pre-revocation garbage to one device's stream.

**Proven:** `tests/shared-audit-test.mjs` (14, isolation) + `tests/shared-audit-integration-test.mjs` (5, real HTTP against the reference endpoint).
