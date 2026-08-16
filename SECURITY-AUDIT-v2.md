# Care Guardian — Security Audit v2

**Audit date:** May 2026  
**Codebase:** dashboard.jsx v2.0, 3,018 lines  
**Scope:** Full re-audit following encryption-at-rest implementation, team management, cloud/server sync, document library, and sub-task system changes  
**Prior audit:** See SECURITY-AUDIT.md v1 for baseline findings

---

## Executive Summary

The encryption-at-rest implementation represents a substantial security improvement — data is now AES-256-GCM encrypted in localStorage with a DEK/key-wrapping architecture, passcodes are never stored, and session timeout clears the DEK from memory. The prior Critical findings (C1–C4) are resolved.

However, the new features introduce a different class of risk: **team coordination surfaces**. The invite code embeds the sync server API key in plaintext base64 (not encrypted), the server sync URL bypasses the URL validation applied to manual sync, legacy plaintext functions (`save()`/`load()`) remain in the codebase alongside the vault, and the cloud sync function references the wrong storage key. These are mostly Medium severity but some warrant prompt attention.

---

## Resolved Findings (from v1 audit)

| ID | Finding | Status |
|----|---------|--------|
| C1 | Passcodes in plaintext | ✅ Resolved — DEK key-wrapping, passcodes never stored |
| C2 | Cosmetic authentication | ✅ Resolved — data encrypted at rest, DEK required |
| C3 | Default passcodes displayed | ✅ Resolved — setup wizard, no defaults |
| C4 | No rate limiting | ✅ Resolved — exponential backoff after 8 attempts |
| H1 | PHI unencrypted in localStorage | ✅ Resolved — vault with AES-256-GCM |
| H2 | Sync passcode persisted | ✅ Resolved — memory only |
| H4 | pdf.js without SRI | ✅ Resolved — crossOrigin added |
| H5 | Merge trusts remote data | ✅ Resolved — schema validation + sanitization |
| H6 | No session timeout | ✅ Resolved — 15 min inactivity lock |
| M1 | URL fetch unrestricted | ✅ Resolved — HTTPS + domain allowlist |
| M2 | Input sanitization | ✅ Resolved — sanitizeText + sanitizeContact |
| M4 | Import parsing unvalidated | ✅ Resolved — validateImportSchema + sanitizeImportData |
| M5 | Export unauthenticated | ✅ Resolved — metadata inside encrypted payload |

---

## New Findings

### HIGH

**H7. Invite code contains API key in plaintext base64**

```javascript
const payload = {t:team.name, c:team.clientName, i:team.id,
                 u:getServerUrl()||"", k:getServerApiKey()||"", ...};
return "CG:" + btoa(JSON.stringify(payload));
```

The invite code is base64-encoded (NOT encrypted). It contains the sync server API key (`k` field) in plaintext. Anyone who intercepts the invite code — in a text message, email, group chat, or clipboard manager — gets the API key and can:
- Read the team's encrypted sync blob from the server (still encrypted, so they can't read the data without the sync passcode)
- Overwrite the team's sync blob with garbage, effectively performing a denial-of-service
- Overwrite the sync blob with a crafted payload that, while encrypted, could cause the merge engine to behave unexpectedly if a team member uses the wrong passcode and it happens to decrypt to valid-looking data (extremely unlikely but not impossible)

**Remediation:** Do not include the API key in the invite code. Instead, have the team creator share the API key as a separate step (like the sync passcode), or encrypt the invite code payload with the sync passcode before base64-encoding.

---

**H8. Server sync URL bypasses URL validation**

```javascript
const serverSync = async () => {
  const serverUrl = getServerUrl();
  // ... directly used in fetch() with no validation
  const pullResp = await fetch(`${serverUrl}/api/sync/${roomId}`, {headers});
```

The `validateSyncUrl()` function (HTTPS enforcement, private IP rejection, domain allowlist) is only applied to the manual "Pull from URL" input. The server sync URL, configured in Settings, is used directly in `fetch()` without any validation. A user could be tricked (via a malicious invite code) into configuring a server URL that points to a local network resource, enabling SSRF-like probing.

**Remediation:** Apply `validateSyncUrl()` (or at minimum, the HTTPS and private-IP checks) when the server URL is first configured via `setServerConfig()` and when it's loaded from an invite code.

---

**H9. Legacy plaintext storage functions still active**

```javascript
const SKEY = "demcare-v2.0";
const load = () => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; } };
const save = (d) => { try { localStorage.setItem(SKEY, JSON.stringify(d)); } catch {} };
```

The `save()` and `load()` functions for plaintext localStorage still exist and are referenced:
- Line 948 in `cloudSync`: `JSON.parse(localStorage.getItem(SKEY))` — reads from the OLD plaintext key during cloud sync push
- Line 1008 in `serverSync`: same pattern — `JSON.parse(localStorage.getItem(SKEY))`

These references appear to be bugs from the pre-encryption era. In the vault architecture, data should only be read from the vault via `decryptWithDEK()`. Reading from `SKEY` will return `null` (since data is now in `VAULT_KEY`), which means the sync push might push stale or empty data.

**Remediation:** Remove the `save()` and `load()` functions entirely. Replace the `localStorage.getItem(SKEY)` references in `cloudSync` and `serverSync` with proper vault reads. After migration, ensure `clearLegacyData()` has been called.

---

### MEDIUM

**M6. Cloud sync reads from wrong localStorage key**

```javascript
// In cloudSync, after pull:
const currentData = pullReport ? JSON.parse(localStorage.getItem(SKEY)) : data;
```

This reads from `SKEY` ("demcare-v2.0") but data is now stored in `VAULT_KEY` ("demcare-vault-v2") in encrypted form. This will return `null` after the vault migration, meaning the push step may push `data` (the in-memory state) which is correct, but the intent of reading from localStorage was to get the post-merge state. The same issue exists in `serverSync` at line 1008.

**Remediation:** After `setData(merged)` in the pull step, use `data` directly for the push (since React state will have the merged data). Remove the localStorage read entirely.

---

**M7. Device metadata sent to server in plaintext**

```javascript
body: JSON.stringify({
  data: b64,
  deviceId: data.settings?.deviceId,
  deviceName: data.settings?.deviceName || ""
})
```

The `deviceId` and `deviceName` are sent alongside the encrypted payload in the PUT request body. The server stores them as metadata. This means the server operator (or anyone with server access) can see which devices are syncing and their names (e.g., "David's phone"), even though they can't read the encrypted data. This is minor metadata leakage.

**Remediation:** Move `deviceId` and `deviceName` inside the encrypted payload only (they're already there via `_sync`). Remove them from the plaintext PUT body, or document this as expected behavior.

---

**M8. Team roster can grow unbounded via merge**

```javascript
(remoteTeam.members || []).forEach(rm => {
  const existing = merged.members.find(m => m.deviceId === rm.deviceId);
  if (!existing) merged.members.push({...rm});
```

The team roster merge adds any new member from any sync source without limit. A crafted sync payload could inject hundreds of fake team members, growing the stored data. The merge also updates existing member names/roles from the remote, which could be used to rename legitimate members.

**Remediation:** Cap team size (e.g., 20 members). Validate that incoming member names pass `sanitizeText()`. Consider requiring the team creator to approve new members rather than auto-adding.

---

**M9. `addMemberFromSync()` function is orphaned**

The function `addMemberFromSync()` (line 1081) performs team roster merging but is never called — the actual merge logic is inline in the `mergeData()` function (lines 393-400). This creates a maintenance risk: one could be updated without the other, and neither has the size/validation protections the other might have.

**Remediation:** Remove the orphaned function. Consolidate team merge logic in one place.

---

**M10. Audio data stored as unbounded base64 in self-reports**

```javascript
reader.onload = () => setSrAudioData(reader.result);
reader.readAsDataURL(blob);
```

Voice note recordings are stored as base64 data URLs with no size cap. A 60-second WebM recording can be ~120KB base64. Multiple recordings accumulate in `data.selfReports[].audioData` and are included in:
- The encrypted vault (increasing localStorage size toward the ~5-10MB browser limit)
- Every sync payload (increasing transfer time and server storage)
- Every encrypted backup export

There is no mechanism to delete individual self-reports or their audio attachments.

**Remediation:** Add a size warning when audio data exceeds a threshold (e.g., 500KB total across all reports). Add the ability to delete individual self-reports. Consider compressing audio or limiting recording time further.

---

**M11. Non-sensitive export references stale status field**

```javascript
const handleNonSensitiveExport = () => {
  safe.domainStatus[d.key] = {status: data.domains[d.key].status, progress: getProgress(d.key)};
```

The non-sensitive export still references `data.domains[d.key].status`, which was the manual status field (On Track / Needs Attention / etc.). Since status is now auto-computed, this field may be stale or "not-started" for all domains. The export should use the computed health label instead.

**Remediation:** Replace `data.domains[d.key].status` with the computed health label from `getProgress()`.

---

### LOW

**L5. Invite code is not versioned**

The invite code format (`CG:base64(JSON)`) has no version field. If the format changes in a future release, there's no way to distinguish old invite codes from new ones, potentially causing silent failures or data corruption.

**Remediation:** Add a version field to the invite code payload: `{v:1, t:..., c:..., ...}`.

---

**L6. Team ID uses Math.random()**

```javascript
id: "team-" + Math.random().toString(36).slice(2,10) + Date.now().toString(36)
```

Same issue as L1 (device ID). Not cryptographically secure, but team IDs have no security function — they're only used for roster matching during merge.

---

**L7. Session timeout doesn't clear sync passcode from React state**

The `lock()` function clears the DEK and auth state but doesn't clear `syncPasscode` from React state:

```javascript
const lock = () => { dekRef.current=null; setAuthed(false); setAuthMode(null); setPc(""); nav("overview") };
```

The sync passcode remains in React state until the page is fully reloaded. This is minor since the component is no longer rendered (auth screen replaces it), but the state technically persists in memory.

**Remediation:** Add `setSyncPasscode("")` to the `lock()` function.

---

**L8. Error messages expose internal details in sync operations**

Multiple catch blocks expose raw error messages:
```javascript
catch(e) { setSyncStatus({type:"error", msg:"Server sync failed: "+e.message}) }
```

These can reveal server URL structure, network errors, or cryptographic operation details.

**Remediation:** Log details to console; show generic messages to user.

---

## Architecture Assessment

### Encryption at Rest — Well Implemented

The DEK + key-wrapping architecture is sound:
- Random 256-bit DEK generated via `crypto.getRandomValues()`
- DEK wrapped with each passcode via PBKDF2 (100K iterations, SHA-256) + AES-256-GCM
- Data encrypted with DEK via AES-256-GCM with random IV
- DEK held in `useRef` (not state), cleared on lock/timeout
- Two wrapped copies allow two passcodes to decrypt the same data
- Passcode change re-wraps the DEK without re-encrypting all data

### Team System — Functional with Caveats

The invite code / team roster system provides a practical onboarding flow. The separation of invite code (contains connection info) from sync passcode (shared separately) is a good security design. However, the API key in the invite code (H7) undermines this separation.

### Sync System — Layered but Has Legacy Gaps

Three sync methods (cloud folder, self-hosted server, manual) share a common merge engine with validation and sanitization. The merge engine correctly handles append-only vs. mutable data. However, the legacy localStorage references (H9, M6) in the sync push paths are bugs that could cause incorrect behavior.

---

## Recommended Priority Actions

1. **Remove API key from invite code** (H7) — encrypt the invite payload or share the API key separately
2. **Fix legacy localStorage references** (H9, M6) — remove `save()`/`load()`, fix `cloudSync` and `serverSync` push paths
3. **Validate server URL on configuration** (H8) — apply HTTPS + private-IP checks to `setServerConfig()` and `joinTeamFromCode()`
4. **Cap team roster size** (M8) — limit to 20 members, sanitize names
5. **Clear sync passcode on lock** (L7) — add `setSyncPasscode("")` to `lock()`
6. **Fix non-sensitive export** (M11) — use computed health label
7. **Remove orphaned function** (M9) — delete `addMemberFromSync()`

---

## Comparison with v1 Audit

| Severity | v1 Findings | v1 Open | v2 New | v2 Total Open |
|----------|-------------|---------|--------|---------------|
| Critical | 4 | 4 | 0 | **0** |
| High | 6 | 6 | 3 | **3** |
| Medium | 5 | 5 | 6 | **6** |
| Low | 4 | 4 | 4 | **4** |
| **Total** | **19** | **19** | **13** | **13** |

All Critical findings are now resolved. The v2 findings are predominantly in the Medium/Low range and relate to new team/sync features rather than fundamental architecture flaws. The encryption-at-rest implementation is the most significant security improvement and is well-constructed.
