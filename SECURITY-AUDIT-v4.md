# Security Audit v4 — Care Guardian v3 (IndexedDB Architecture)

**Date:** May 2026
**Version:** 3.0 (IndexedDB vault, 4,371 lines)
**Scope:** Full codebase review. Focus on v3 storage migration, new features, and regressions from v3 audit.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | — |
| High | 1 | Open |
| Medium | 3 | Open |
| Low | 3 | Open |

**Previous findings:** All v3 audit findings (H1, H2, M1–M4, L1–L3) remain resolved, with one regression (deleteSelfReport guard lost during refactoring — see H1).

---

## v3 Architecture Assessment

### IndexedDB Vault Migration — SOUND

The vault has been correctly split:
- **localStorage** (`demcare-keys-v3`): contains only the wrapped DEK keys (~1KB). This is appropriate — the keys are PBKDF2-wrapped and cannot be used without the passcode.
- **IndexedDB** (`care-guardian-vault`): contains the AES-256-GCM encrypted data blob. Capacity: 1–12GB depending on browser, vs the previous 5MB localStorage limit.
- **IndexedDB** (`care-guardian-audit`): contains individually encrypted HIPAA audit entries with a separate encryption key derived from the same passcode with a different salt.

The migration path is correct: `migrateV2ToV3()` reads the old monolithic localStorage vault, splits keys from data, saves to the new locations, then deletes the old localStorage entry. The migration runs once during the first v3 authentication.

### Persistent Storage — SOUND

`navigator.storage.persist()` is called after initial setup and after legacy migration, requesting browser exemption from automatic eviction. Storage quota monitoring is available in Settings.

### Encryption Integrity — SOUND

- AES-256-GCM (15 refs) with PBKDF2 100K iterations (5 refs)
- Web Crypto API used exclusively (21 refs, 7 CSPRNG calls)
- DEK cleared on lock (1 ref), audit key cleared on lock (1 ref)
- Sync passcode held in memory only, cleared on lock (3 refs)
- Three separate encryption contexts: vault DEK, audit key (different PBKDF2 salt), and sync export key (user-provided password)

### XSS — SOUND

- 4 `dangerouslySetInnerHTML` usages, all CSS-only
- Zero `innerHTML`, zero `eval`, zero `new Function`
- All user content rendered via React's built-in escaping

---

## Findings

### H1: deleteSelfReport missing permission guard (HIGH)

**Location:** `deleteSelfReport` function definition

**Issue:** During the v3 refactoring, all delete functions were guarded with `can()` checks (deleteIncident, deleteExpense, deleteContact, deleteAppt, removeMedFromSchedule). However, `deleteSelfReport` was missed. The function adds an audit log entry but does not check permissions. A Care Professional could delete self-report entries.

**Note:** The UI button rendering does include a `can("delete-incident")` check, so the delete button is hidden for unauthorized roles. However, defense-in-depth requires the function itself to be guarded.

**Remediation:**
```javascript
const deleteSelfReport=(id)=>{
  if(!can("delete-incident",true))return;
  hipaaAudit("delete","Self-report deleted: "+id,"self_reports");
  setData(p=>({...p,selfReports:(p.selfReports||[]).filter(r=>r.id!==id)}));
  flash("Self-report deleted.");
};
```

---

### M1: HIPAA audit log does not record successful logins (MEDIUM)

**Location:** `tryAuth` function

**Issue:** The audit log records `login_failed` and `logout` events, but does NOT record successful logins. The `login` action type has zero call sites. A HIPAA auditor would expect to see both successful and failed authentication events. The `flash("Welcome back.")` line has a comment placeholder but no actual audit call.

**Remediation:** Add `hipaaAudit("login","Successful authentication as "+authMode,"")` after each successful DEK unwrap in `tryAuth`.

---

### M2: Multiple export paths lack permission guards (MEDIUM)

**Location:** Various clipboard and file download operations

**Issue:** The `can("export-data")` check is enforced on the non-sensitive export and the self-report/expense export buttons. However, several other export paths are unguarded at the function level:

- Encrypted backup export (`handleEncryptedExport`) — has audit but no `can()` check
- Sync manual export (clipboard copy of encrypted payload) — no guard
- Care plan binder (clipboard copy) — no guard
- Emergency info card (clipboard copy) — no guard (though this is intentionally accessible to all roles)
- POA decision log export — no guard
- Expense CSV export button — guarded by `can("export-data")` in JSX but not in the function

**Risk:** Moderate. Most of these are guarded by UI visibility (the buttons don't render for unauthorized roles). The encrypted export is the highest risk — a Care Professional shouldn't be able to export the full encrypted backup.

**Remediation:** Add `if(!can("export-data"))return;` to `handleEncryptedExport` and the sync manual export function. The emergency card and binder are appropriately available to Family and above.

---

### M3: v3 migration deletes old vault before verifying IndexedDB write (MEDIUM)

**Location:** `migrateV2ToV3()` function, line ~520

**Issue:** The migration function saves wrapped keys to localStorage and encrypted data to IndexedDB, then immediately deletes the old localStorage vault (`localStorage.removeItem(VAULT_KEY)`). If the IndexedDB write fails silently (quota exceeded, database locked, browser bug), the old data is already gone and the new data wasn't saved. The user loses everything.

**Remediation:** Verify the IndexedDB write succeeded before deleting the old vault:
```javascript
saveWrappedKeys(v2.wk);
await saveVaultData(v2.d);
// Verify write succeeded
const verify = await loadVaultData();
if (verify) {
  localStorage.removeItem(VAULT_KEY);
} else {
  console.error("Migration verification failed — keeping v2 vault");
}
```

---

### L1: Math.random for device and team IDs (LOW)

**Location:** Lines 278, 1287, 1341

**Status:** Acceptable risk. These IDs are identifiers for merge matching, not security primitives. Predictability confers no advantage.

---

### L2: Wrapped keys structure visible in localStorage (LOW)

**Location:** `demcare-keys-v3` in localStorage

**Issue:** The wrapped keys are stored as plaintext JSON (`{v:"3.0", wk:{c:"base64...", r:"base64..."}}`). While the wrapped keys themselves are PBKDF2-encrypted and useless without the passcode, their presence reveals that Care Guardian is installed on this device and that two access tiers exist. An attacker with physical access to the unlocked device's browser storage can see this.

**Status:** Acceptable. This is inherent to the two-passcode design. The alternative (encrypting the key structure itself) creates a circular dependency. The wrapped keys are cryptographically protected — their visibility doesn't reduce security.

---

### L3: Audit log PBKDF2 salt is hardcoded (LOW)

**Location:** `AUDIT_SALT_HEX` constant

**Issue:** The audit key salt (`a1b2c3d4e5f6a7b8`) is hardcoded in the source code. Since the source is open and the salt is constant across all installations, an attacker who obtains the encrypted audit entries from IndexedDB and knows the passcode can derive the audit key. However, if they know the passcode, they can already authenticate and read the audit log through the UI.

**Status:** Acceptable. The salt's purpose is to ensure the audit key differs from the vault DEK (same passcode, different salt = different key). It achieves this. A per-installation random salt would be more robust but would need to be stored somewhere accessible before authentication, creating the same visibility issue as L2.

---

## Previously Resolved (v3 audit)

All v3 findings remain resolved:
- **H1 (v3):** Delete operations guarded — 5 of 6 confirmed (deleteSelfReport regressed, see H1 above)
- **H2 (v3):** Photo MIME validation — confirmed (`file.type.startsWith("image/")`)
- **M1 (v3):** Capacity/wellness sanitization — confirmed (`sanitizeText` applied)
- **M2 (v3):** Photo import validation — confirmed (`valPhotos` in `sanitizeImportData`)
- **M3 (v3):** Non-sensitive export guarded — confirmed
- **M4 (v3):** Binder source fields sanitized — confirmed (via M1 input sanitization)
- **L3 (v3):** Invite version check — confirmed (`payload.v !== 1`)

## Previously Resolved (v2 audit)

All v2 findings remain resolved (C1–C4, H7–H9, M6–M11, L7).

---

## HIPAA Compliance Impact

The v3 IndexedDB migration strengthens HIPAA compliance:

1. **§164.312(a) Encryption:** Unchanged — same AES-256-GCM, now stored in IndexedDB instead of localStorage.
2. **§164.312(b) Audit Controls:** Improved — audit log in separate IndexedDB database with independent encryption key. Survives vault deletion. However, successful login events need to be added (M1).
3. **§164.312(c) Integrity:** Improved — integrity hash now computed against IndexedDB data. SHA-256 verification available in Settings.
4. **§164.312(e) Transmission:** Unchanged — HTTPS enforcement and end-to-end encryption remain intact.
5. **Storage capacity:** Dramatically improved — from 5MB (would fail HIPAA retention) to 1–12GB (supports 6-year retention).
6. **Persistent storage:** New — `navigator.storage.persist()` prevents browser eviction.
7. **Storage monitoring:** New — quota tracking with 80% warning threshold.

---

## Recommendations Priority

1. **H1** — Add `can()` guard to `deleteSelfReport` (2 min, regression fix)
2. **M1** — Add successful login audit events (5 min, HIPAA compliance gap)
3. **M2** — Add `can("export-data")` to `handleEncryptedExport` and sync manual export (5 min)
4. **M3** — Add verification step to v3 migration before deleting old vault (10 min)
