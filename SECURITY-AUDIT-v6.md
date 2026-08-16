# Security Audit v6 — Pre-Auth Recovery Path

**Date:** June 2026
**Version:** 3.2 (data-loss recovery, 4,768 lines)
**Scope:** Focused review of the browser-eviction recovery flow — the one code path that decrypts attacker-supplyable input *before* authentication. Plus the shared import-sanitization routine it depends on.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | Fixed |
| Low | 2 | 1 Fixed, 1 Documented |

The recovery path is fundamentally sound: it cannot be used to disclose the evicted user's data, and it reuses the hardened import validation. Two defense-in-depth gaps in the shared sanitizer were worth closing precisely because this path now runs pre-authentication.

---

## Threat model for the recovery path

The recovery screen appears when wrapped keys survive in localStorage but the IndexedDB vault is gone (browser eviction). It accepts a `.care` file, decrypts it with a user-supplied passcode, validates and sanitizes it, and seeds a new vault.

**What an attacker with physical access to an evicted device can attempt:**

1. **Feed a forged/corrupted file.** Mitigated by AES-256-GCM authenticated decryption — a file not encrypted with the correct passcode fails to decrypt. No bypass.
2. **Feed their own validly-encrypted file** (encrypted with a passcode they know). This decrypts to attacker-controlled plaintext. **But:** the result is the attacker seeding *their own* data into a fresh vault that they then lock with *their own* new passcodes. This is not an escalation — it is equivalent to a fresh setup. It does not expose the evicted user's data, which is already gone and was never recoverable without the user's own backup file and its passcode.
3. **Exploit the parser/sanitizer** with malicious structure (prototype pollution, oversized blobs, malformed settings). This is the real surface, and the focus of the fixes below.

**Confidentiality conclusion:** the evicted user's data confidentiality is preserved. It is gone from the device, and the only copy (their backup) is AES-GCM encrypted with their passcode. The recovery path cannot resurrect it for an attacker.

---

## Findings

### M1: Import sanitizer does not strip prototype-pollution keys (MEDIUM)

**Location:** `sanitizeImportData`

**Issue:** The sanitizer processed decrypted import/recovery data without stripping dangerous keys (`__proto__`, `constructor`, `prototype`). While the specific consumption patterns in this codebase (spread, explicit field assignment) are not currently exploitable for prototype pollution, a pre-authentication decrypt-and-process path should not rely on that incidental safety. Future code that dynamically assigns from imported keys could become a pollution sink.

**Status: FIXED.** Added `deepStripUnsafe()`, a pure recursive rebuild that reconstructs all objects from their own enumerable keys while skipping `__proto__`/`constructor`/`prototype`. `sanitizeImportData` now runs this first, which also makes the function **non-mutating** (it previously mutated its input in place — a side-effect bug in its own right).

### M2: No top-level key allowlist on imported data (MEDIUM)

**Location:** `sanitizeImportData`

**Issue:** The sanitizer used object spread (`{...i}`), preserving arbitrary unknown fields from the decrypted payload into the stored vault. A malicious backup could embed large or unexpected top-level structures that the app would persist and trust.

**Status: FIXED.** Added a top-level key allowlist derived from the canonical `initState` shape. Keys outside the allowlist are dropped before storage. The allowlist is a deliberate superset (includes `_sync`, `_exportMeta`) to avoid discarding legitimate data.

### M3 → reclassified L1: Settings block not sanitized on import (LOW — Fixed)

**Location:** `sanitizeImportData`, settings handling

**Issue:** The `settings` object (which carries `deviceName`, `team.members` with roles, `stateCode`, etc.) was restored wholesale. A malicious backup could inject an oversized `deviceName`, a malformed team roster, or arbitrary settings fields. In the recovery context this is the user's own data, lowering severity, but bounds are cheap.

**Status: FIXED.** Settings string fields are now length-capped (`deviceName` 100, `deviceId` 64, `stateCode` 8, `syncPasscode` dropped from imports), and `team.members` is bounded to 20 entries with sanitized names/roles.

### L2: Orphaned audit-log database after "Start fresh" (LOW — Documented)

**Location:** Recovery screen, "Start fresh instead"

**Issue:** Choosing to start fresh clears the wrapped keys but leaves the prior `care-guardian-audit` IndexedDB database in place. It is inaccessible without the old passcode (encrypted with the old key) and is harmless, but it lingers.

**Status: DOCUMENTED.** Not cleared automatically because doing so before authentication would let anyone with device access destroy the audit trail. A future authenticated "reset audit log" control in Settings is the appropriate place for this. Accepted.

---

## Recovery-path specifics confirmed sound

- **Reuses `validateImportSchema` + `sanitizeImportData`** — same hardened path as authenticated import, not a parallel weaker one.
- **AES-GCM authenticated decryption** gates all processing — malformed input fails closed.
- **Orphaned wrapped keys are cleared** on both successful recovery and "start fresh," preventing a stale-key/new-vault mismatch.
- **Recovery is audited** — `hipaaAudit("create","Vault restored from backup after data loss")` records the event once the new vault is authenticated.
- **No rate-limiting on the backup passcode** is acceptable: the backup file is offline-attackable regardless of any UI throttle, so on-device throttling would add friction without security benefit.

---

## Regression check

All prior findings (v2–v5) remain resolved. The new `deepStripUnsafe` + allowlist strengthen the *authenticated* import/merge path as well, since both routes share `sanitizeImportData`. Build verified, bracket-balanced, no `return<jsx>` transpiler patterns introduced.

---

## Recommendations Priority

1. **M1** — Prototype-pollution stripping + non-mutating sanitizer ✅ DONE
2. **M2** — Top-level key allowlist ✅ DONE
3. **L1** — Settings bounds ✅ DONE
4. **L2** — Authenticated audit-log reset (future Settings control) — deferred
