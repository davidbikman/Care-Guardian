# Security Audit v5 — Care Guardian (Scheduling Features)

**Date:** May 2026
**Version:** 3.1 (care scheduling, 4,653 lines)
**Scope:** New scheduling subsystem (careShifts, availability, open-shift claiming, swaps, visit logging) plus regression check.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | — |
| High | 1 | Fixed |
| Medium | 2 | 1 Fixed, 1 Documented |
| Low | 1 | Fixed |

All prior findings (v2–v4) remain resolved — full regression check passed.

---

## Scheduling Subsystem Assessment — MOSTLY SOUND

**Permission model is correct.** All 14 scheduling functions are appropriately guarded:
- `manage-schedule` (admin only): createShift, deleteShift, approveClaim, denyClaim, approveSwap, denySwap
- `claim-shift` (admin/family/care-pro): requestClaim, requestSwap
- `log-visit` (admin/family/care-pro): startVisit, endVisit, toggleShiftTask, setVisitNotes
- `updateShift` is internal and unguarded, but **all 7 of its callers are guarded** — verified.

**Claim flow has no self-assignment path.** `requestClaim` only appends to `claimRequests`; assignment happens exclusively through `approveClaim`, which is admin-only. A caregiver cannot assign themselves a shift. Correct by design.

**No XSS, no eval, no innerHTML, no code execution vectors.**

---

## Findings

### H1: Scheduling free-text fields not sanitized (HIGH)

**Location:** `createShift` (carePlan, task text), `requestSwap` (reason)

**Issue:** Three user-supplied free-text fields in the scheduling system bypass `sanitizeText()`:
- `carePlan` — the per-shift care instructions
- Shift task `text` — individual task descriptions
- `reason` — the swap request justification

While React's rendering prevents script execution, unsanitized text can carry control characters and unbounded length into the encrypted vault, the sync payload, and the care plan binder. `setVisitNotes` was correctly sanitized; these three were missed.

**Status: FIXED.** All three now pass through `sanitizeText()` with appropriate length caps (carePlan 2000, task text 300, reason 500).

---

### M1: recentWins merge does not enforce role permissions (MEDIUM — documented)

**Location:** `mergeById(..., recentWins=true)` for careShifts

**Issue:** This is a genuinely new risk introduced by mutable shift records, and it deserves a clear explanation.

All prior synced collections (incidents, messages, expenses, self-reports) use **append-only** merge: a team member can *add* records but cannot *modify* or *delete* another member's records. The merge engine unions by ID and never overwrites.

Shifts use **most-recent-wins** merge (by `lastModified`), because they are mutable — an admin approves a claim, a caregiver checks off a task, etc. The consequence: **any team member with sync access can overwrite any shift** by syncing a record with a newer `lastModified` timestamp. The merge engine does not — and cannot — verify that the remote editor had the `manage-schedule` role when they made the change. The role checks are client-side UI guards; the merge accepts any well-formed record from anyone who holds the sync passcode.

**Concretely:** a Care Professional, who legitimately holds the caregiver passcode and sync access, could craft a synced payload that reassigns shifts, changes care plans, or marks visits complete — actions the UI would never let them perform directly.

**Why this is MEDIUM, not HIGH:** The sync passcode is the trust boundary for the entire application. Anyone who can sync is already trusted with all the care data (which is far more sensitive than a shift assignment). The serverless architecture has no authority that can verify "this change came from an admin" — that verification would require either a central server (which the architecture and values forbid) or per-record cryptographic signing tied to role-authorized keys (a substantial future feature). This is an inherent property of trustless, serverless, multi-writer sync.

**Mitigation applied:** Each shift modification now records `lastModifiedBy` (device name + role at time of change). This does not *prevent* an unauthorized overwrite, but it makes every overwrite **attributable** — the admin can see who last changed each shift, and an anomalous change (a Care Professional reassigning shifts) is visible and auditable. Combined with the HIPAA audit log on the admin's own device, this provides forensic accountability even though it cannot provide prevention.

**Documented limitation.** This is added to the limitations section of the HIPAA and architecture docs: *mutable synced records (shifts, availability) can be modified by any team member with sync access; role enforcement on these records is advisory (UI-level) not cryptographic. Grant sync access only to trusted team members.* This is the honest disclosure that Principle 9 requires.

---

### M2: DOM access antipattern for swap reason (MEDIUM)

**Location:** Swap request modal — `document.getElementById("swapReason")`

**Issue:** The swap reason was read directly from the DOM via `getElementById` rather than React state. This is fragile (breaks if the element id collides or the modal structure changes), bypasses React's controlled-input model, and reads an unsanitized value straight into `requestSwap`.

**Status: FIXED.** Replaced with a controlled state variable (`swapReason`), sanitized on submission.

---

### L1: Availability entries overwritable by other members (LOW)

**Location:** Availability merge

**Issue:** Availability is stored per-device and merged by most-recent `updated` timestamp. A team member could overwrite another member's availability entry. Low impact (availability is non-sensitive scheduling convenience data), but it shares the M1 root cause.

**Status: FIXED (partial).** The availability `name` field is now sanitized. The overwrite property is the same as M1 and is covered by the same documented limitation.

---

## Regression Check — ALL PASSED

| Function | Guard | Status |
|----------|-------|--------|
| deleteIncident | delete-incident | ✅ |
| deleteExpense | delete-expense | ✅ |
| deleteContact | add-contact | ✅ |
| deleteAppt | add-appointment | ✅ |
| deleteSelfReport | delete-incident | ✅ |
| removeMedFromSchedule | med-admin | ✅ |
| handleEncryptedExport | export-data | ✅ |
| handleNonSensitiveExport | export-data | ✅ |

v3 storage architecture intact (saveVaultData, loadVaultData, saveWrappedKeys, migrateV2ToV3, requestPersistentStorage all present). HIPAA audit log covers scheduling (create/update/delete on `schedule` phiType, 10 references). No XSS regressions.

---

## The Serverless Trust Model — Stated Plainly

This audit surfaces a principle worth stating explicitly, because it will recur with every future mutable-and-synced feature:

**In a serverless, end-to-end-encrypted, multi-writer system, the sync credential is the only trust boundary.** There is no server to act as referee. Append-only data is safe from modification by design. Mutable data is only as protected as the discretion used in granting sync access. Role-based permissions are enforced at the UI for honest users; they are not, and cannot be, cryptographically enforced against a malicious holder of the sync passcode without either a central authority or per-record signing.

This is not a flaw to be patched — it is the cost of the architecture's core promise (no server can betray you). The correct response is honest disclosure (Principle 9) and forensic attribution (lastModifiedBy), both now in place. The alternative — a server that enforces roles — is the product the project deliberately chose not to build.

---

## Recommendations Priority

1. **H1** — Sanitize carePlan, task text, swap reason ✅ DONE
2. **M2** — Replace getElementById with controlled state ✅ DONE
3. **M1** — Add lastModifiedBy attribution + document limitation ✅ DONE
4. **L1** — Sanitize availability name ✅ DONE
