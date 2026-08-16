# Security Audit v3 — Care Guardian

**Date:** May 2026
**Version:** 2.0 (hub navigation, 3,811 lines)
**Scope:** Full codebase review including all features added since v2 audit

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | — |
| High | 2 | Open |
| Medium | 4 | Open |
| Low | 3 | Open |

**Previous audit findings (v2):** All Critical (C1–C4), High (H7–H9), and Medium (M6–M11) findings from the v2 audit remain resolved. The encryption-at-rest architecture, key wrapping, session timeout, rate limiting, input sanitization framework, sync URL validation, and team roster capping are all intact and functioning correctly.

---

## Architecture Review

### Encryption — SOUND
- AES-256-GCM with PBKDF2 (100K iterations) key wrapping: 16 refs to AES-GCM, 10 to PBKDF2, 17 to Web Crypto API
- DEK held in React ref, cleared on lock (1 dekRef.current=null)
- Sync passcode cleared on lock (1 setSyncPasscode(""))
- Vault structure: `{v, wk:{c,r}, d}` — three encrypted blobs in localStorage
- Legacy migration path intact (SKEY read-only for detection)

### Authentication — SOUND
- SESSION_TIMEOUT_MS: 15 minutes
- MAX_AUTH_ATTEMPTS: 8 with exponential backoff
- Two-passcode system with role derivation from team roster
- No default passcodes (setup wizard enforced)

### XSS — SOUND
- Zero non-CSS dangerouslySetInnerHTML usage
- All user content rendered via React's built-in escaping
- No innerHTML, no eval, no new Function

### Network — SOUND
- 3 fetch calls total: sync server pull, sync server push, URL import
- Sync URL validated (HTTPS enforced, private IPs blocked)
- API key excluded from invite codes (v2 H7 fix intact)
- Device metadata excluded from PUT body (v2 M7 fix intact)

### Access Control — PARTIALLY SOUND
- 5-tier role system with can() permission engine (23 call sites)
- Role derived from deviceId in team roster
- Tab/hub visibility filtered by role
- **Gap: delete operations lack can() guards (see H1)**

---

## Findings

### H1: Delete operations not guarded by permissions (HIGH)

**Location:** Lines 1890 (deleteIncident), 1923 (removeMed), 2983/2986 (deleteContact), 1852 (deleteAppt), 1908 (deleteExpense)

**Issue:** The `can()` permission engine gates view access and add/edit operations, but delete functions are callable by any authenticated caregiver regardless of role. A Care Professional could call deleteIncident, deleteContact, deleteExpense, or deleteAppt by interacting with the UI — the buttons are hidden but the underlying functions have no role check.

**Risk:** A Care Professional could delete incidents (undermining accountability), contacts, or appointments. The design specification explicitly states Care Professionals cannot delete anything.

**Remediation:**
```javascript
const deleteIncident=(id)=>{
  if(!can("delete-incident"))return;
  // existing logic
};
const deleteContact=(id)=>{
  if(!can("add-contact"))return; // reuse add-contact permission
  // existing logic  
};
```
Apply similar guards to deleteAppt, deleteExpense, and removeMed.

---

### H2: Photo data URLs not validated (HIGH)

**Location:** Lines 1533–1542 (handlePhotoCapture)

**Issue:** The photo handler validates file size (2MB limit) and caps count (3 per attachment), but does not validate the MIME type of the resulting data URL. The `accept="image/*"` attribute on the file input is a UI hint only — it does not prevent a user from selecting a non-image file via browser developer tools or a modified client. A malicious data URL (e.g., `data:text/html;base64,...`) could be stored in the incident or self-report.

**Risk:** Since the data URL is rendered as an `<img src={...}>` tag, a non-image data URL would simply fail to render as an image (browsers won't execute scripts from img src). The risk is LOW in practice because React's rendering model prevents script execution. However, the data could consume storage with arbitrary content.

**Remediation:**
```javascript
const handlePhotoCapture=(e,setter)=>{
  const files=e.target.files;if(!files||!files.length)return;
  Array.from(files).slice(0,3).forEach(file=>{
    if(!file.type.startsWith("image/")){flash("Only image files allowed.");return}
    if(file.size>2*1024*1024){flash("Photo too large (max 2MB).");return}
    // ...existing logic
  });
};
```

---

### M1: Capacity log and caregiver wellness entries not sanitized (MEDIUM)

**Location:** submitCapacityLog (~L1610), submitCaregiverCheckin (~L1565)

**Issue:** Text fields in capacity observations (notes) and caregiver wellness (notes) are stored without passing through `sanitizeText()`. While React's rendering prevents XSS, unsanitized text could contain control characters, excessive length, or script tags that would survive in encrypted exports and appear in the care plan binder.

**Remediation:** Apply `sanitizeText(value, MAX_FIELD_LEN)` to all free-text fields before storage.

---

### M2: Photo data URLs not validated during import/merge (MEDIUM)

**Location:** sanitizeImport (~L556), mergeById (~L280)

**Issue:** When importing data (encrypted backup, FHIR, URL) or merging during sync, photo data URLs inside incidents and self-reports are not validated. A crafted import file could inject arbitrarily large base64 strings or non-image content into the photos array.

**Remediation:** Add photo validation to sanitizeImport:
```javascript
// For each incident/selfReport in imported data:
if(item.photos){
  item.photos = item.photos
    .filter(p => typeof p === 'string' && p.startsWith('data:image/'))
    .slice(0, 3);
}
```

---

### M3: Non-sensitive export has no permission guard (MEDIUM)

**Location:** Line ~2793 (handleNonSensitiveExport)

**Issue:** The non-sensitive export function (domain status summary, no PHI) is callable without a `can("export-data")` check. While the button is only rendered for certain roles, the function itself is unguarded.

**Remediation:** Add `if(!can("export-data"))return;` at the top of `handleNonSensitiveExport`.

---

### M4: Care plan binder contains unsanitized aggregated data (MEDIUM)

**Location:** generateCarePlanBinder (~L1630)

**Issue:** The binder generator concatenates data from multiple sources (domain notes, medications, incidents, contacts, capacity log) into a single plaintext string. If any source contains carefully crafted text, the binder output could be misleading. This is a LOW risk because the binder is plaintext (not HTML) and is only displayed in a `<pre>` tag or copied to clipboard, but the aggregated nature means one corrupted field could affect the perceived integrity of the entire document.

**Remediation:** Apply sanitizeText to each field as it's concatenated into the binder.

---

### L1: Math.random for device and team IDs (LOW)

**Location:** Lines 278 (genDeviceId), 1135 (team ID)

**Issue:** Device IDs and team IDs use Math.random() which is not cryptographically secure. These IDs are not used for security decisions — they're identifiers for sync merge matching.

**Risk:** Negligible. An attacker who can predict a device ID gains nothing — authentication is passcode-based, not ID-based.

**Status:** Acceptable risk.

---

### L2: No total photo storage tracking (LOW)

**Location:** handlePhotoCapture

**Issue:** Individual photos are capped at 2MB and 3 per attachment, but there's no total storage tracking for all photos across all incidents and self-reports. A user could accumulate hundreds of photos across many entries, eventually exceeding localStorage limits (typically 5–10MB).

**Remediation:** Add a storage estimate check similar to getSrStorageKB but across all photo-containing objects. Warn when approaching 4MB total photo storage.

---

### L3: Invite code version field not checked on parse (LOW)

**Location:** parseInviteCode (~L1155)

**Issue:** The invite code includes `v:1` but `parseInviteCode` does not validate the version. A future format change could cause silent misinterpretation.

**Remediation:** Add `if(payload.v !== 1) return null;` to parseInviteCode.

---

## Previously Resolved (v2 audit)

All findings from the v2 audit remain resolved:

- **C1–C4:** Plaintext storage eliminated. DEK + key wrapping architecture in place.
- **H7:** API key removed from invite codes.
- **H8:** Server URL validated on configuration.
- **H9:** Legacy save()/load() removed. SKEY retained only for migration detection.
- **M6:** Sync push paths use in-memory data, not localStorage reads.
- **M7:** Device metadata removed from plaintext PUT body.
- **M8:** Team roster capped at 20, names sanitized.
- **M9:** Orphaned addMemberFromSync() removed.
- **M11:** Non-sensitive export uses computed health label.
- **L7:** Sync passcode cleared on lock.

---

## Recommendations Priority

1. **H1** — Add can() guards to all delete functions (15 min, prevents privilege escalation)
2. **H2** — Validate photo MIME type in handlePhotoCapture (5 min, defense in depth)
3. **M1** — Sanitize capacity and wellness text inputs (10 min)
4. **M2** — Validate photo arrays during import/merge (15 min)
5. **M3** — Add export permission guard (2 min)
6. **M4** — Sanitize binder output fields (10 min)
