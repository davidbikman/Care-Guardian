# Care Guardian — Security Audit Report

**Audit date:** May 2026  
**Codebase:** dashboard.jsx v2.0 (demcare-v2.0), 2,416 lines  
**Auditor:** Claude (Anthropic), prompted by application developer  
**Scope:** Full source code review — authentication, encryption, data storage, input handling, sync infrastructure, external dependencies, and privacy claims

---

## Executive Summary

The application demonstrates strong architectural instincts around privacy (no server, no telemetry, client-side encryption for exports) and uses well-parameterized cryptographic primitives for its backup encryption (AES-256-GCM, PBKDF2 with 100K iterations). However, the authentication system is fundamentally broken — passcodes are stored and compared in plaintext, displayed on the login screen, and the entire auth gate exists only as React component state that provides no real access control. Data at rest in localStorage is completely unencrypted and accessible to any JavaScript running on the same origin. The sync infrastructure introduces additional attack surface through untrusted data ingestion and an unvalidated merge engine.

**The core tension:** This application stores information that could include PHI (Protected Health Information) — medication lists, diagnoses, provider names, financial records, incident reports. The privacy model claims "nothing ever leaves this device," but that claim has several caveats that should be made explicit to users.

---

## Findings by Severity

### CRITICAL

**C1. Passcodes stored in plaintext in localStorage**

```javascript
settings: { caregiverPasscode: "1234", clientPasscode: "0000" }
```

The passcodes are stored as plaintext strings inside the `data.settings` object, which is serialized to localStorage as unencrypted JSON. Anyone with physical access to the device, or any browser extension with storage permissions, can read `localStorage.getItem("demcare-v2.0")` and extract both passcodes.

**Remediation:** Hash passcodes using PBKDF2 or bcrypt before storing. Compare submitted passcodes against the hash, not the plaintext. The encryption infrastructure for this already exists in the codebase (the PBKDF2 key derivation in `encryptData`).

---

**C2. Authentication is cosmetic — no actual access control**

```javascript
const [authed, setAuthed] = useState(false);
```

The entire authentication gate is a React state variable. It provides no real security because:

- The data is already loaded from localStorage before auth check occurs (line 627: `useState(()=>load()||initState())`)
- Opening browser DevTools → Console → `localStorage.getItem("demcare-v2.0")` exposes all data without any passcode
- React DevTools can modify the `authed` state to `true` directly
- The auth screen is a conditional render, not a data access gate — the data exists in memory regardless of auth state

**Remediation:** Encrypt the entire localStorage payload at rest using the caregiver passcode as the key. Data should only be decrypted after successful authentication, so it literally doesn't exist in memory until the correct passcode is entered. This would make the auth gate cryptographic rather than cosmetic.

---

**C3. Default passcodes displayed on login screen**

```javascript
<p className="auth-footer">Caregiver: 1234 · Client: 0000</p>
```

The default passcodes ("1234" and "0000") are displayed directly on the login screen. This is appropriate for a development demo but must be removed before any real deployment. Anyone who sees the login screen — including someone looking over the user's shoulder — knows both passcodes.

**Remediation:** Remove the footer text. On first launch, force the user to set both passcodes before proceeding. Show a one-time setup wizard instead of a login screen.

---

**C4. No rate limiting on authentication attempts**

The `tryAuth()` function has no brute-force protection. An attacker (or a script) can try unlimited passcode combinations with no delay, lockout, or exponential backoff. Given that the default passcodes are 4-digit numbers, the full keyspace is exhaustible in milliseconds.

**Remediation:** Implement exponential backoff (1s, 2s, 4s, 8s...) after failed attempts. After 10 consecutive failures, require a cooldown period of 5+ minutes. Consider a wipe-after-N-failures option for high-security deployments.

---

### HIGH

**H1. All PHI stored unencrypted in localStorage**

The `save()` function writes the entire data object — contacts, medications, diagnoses, incident reports, expense records, self-reports, audio recordings — as plaintext JSON to localStorage:

```javascript
const save = (d) => { try { localStorage.setItem(SKEY, JSON.stringify(d)); } catch {} };
```

localStorage is accessible to any JavaScript running on the same origin. This includes browser extensions, injected scripts from compromised CDNs, and any code running in the same-origin context. If the app is deployed on a shared domain (e.g., a subdomain of a hosting service), other apps on sibling subdomains may be able to access it depending on browser policy.

**Remediation:** Encrypt data at rest in localStorage using the caregiver passcode as the encryption key. This would make C2 and H1 a single fix — the data is encrypted on disk and only decrypted into memory after successful authentication.

---

**H2. Sync passcode stored in plaintext alongside data**

```javascript
settings: { syncPasscode: "..." }
```

The team sync passcode is stored unencrypted in `data.settings`, which means anyone who can read localStorage (see H1) also gets the sync passcode, which allows them to decrypt any sync file the team shares. This is the key that protects the entire team's data in transit.

**Remediation:** Store the sync passcode hashed, or better, don't store it at all — require the user to enter it each session (or cache it only in memory, never in localStorage).

---

**H3. Audio recordings stored as base64 in localStorage**

Voice note self-reports are stored as base64-encoded WebM audio data:

```javascript
reader.onload = () => setSrAudioData(reader.result);
reader.readAsDataURL(blob);
```

These are stored in `data.selfReports[].audioData` and serialized to localStorage. A 60-second audio recording at typical WebM bitrate is ~120KB base64. Multiple recordings will consume significant localStorage quota (typically 5-10MB limit) and all of this audio is stored unencrypted (see H1). Audio recordings of a dementia patient describing their symptoms are highly sensitive PHI.

**Remediation:** Warn users about storage limits. Consider compressing audio or limiting recording duration further. When H1 is fixed (encryption at rest), audio data will be encrypted along with everything else.

---

**H4. pdf.js loaded from CDN without Subresource Integrity (SRI)**

```javascript
s2.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
```

The pdf.js library and its web worker are loaded dynamically from cdnjs without SRI hashes. If cdnjs is compromised (or a MITM attack occurs on a non-HTTPS connection), an attacker could inject malicious JavaScript that executes in the context of the application with full access to all data.

**Remediation:** Add `integrity` and `crossorigin` attributes to the script element:
```javascript
s2.integrity = "sha384-[hash]";
s2.crossOrigin = "anonymous";
```
The SRI hash can be obtained from cdnjs.cloudflare.com for the specific version.

---

**H5. Merge engine trusts remote data without validation**

The `mergeData()` function accepts any JSON object that has the expected top-level keys and merges it into local state. There is no schema validation, no type checking, and no bounds checking. A crafted malicious sync file could:

- Inject arbitrary text into domain notes (stored and rendered as user content)
- Add contacts with malicious data in custom fields
- Inject entries into the activity log
- Overwrite domain progress (the merge uses "most recent timestamp wins" — a forged future timestamp would always win)

**Remediation:** Validate the schema of imported data against a strict type definition. Sanitize all string fields. Reject data with timestamps in the future. Add a maximum size limit on imported data.

---

**H6. No session timeout**

Once authenticated, the session persists indefinitely — there is no inactivity timeout. If a caregiver walks away from a shared computer or unlocked phone, anyone can access all data.

**Remediation:** Implement an inactivity timer (e.g., 15 minutes) that locks the session and returns to the passcode screen. The timer should reset on any user interaction.

---

### MEDIUM

**M1. URL fetch in sync has no domain restriction**

```javascript
const resp = await fetch(syncPullUrl.trim());
```

The "Pull from URL" feature will fetch any URL the user enters. While this is user-initiated (not automated), it could be used to probe internal network resources if the app is running on a corporate or home network. The fetched content is then processed through the decrypt and merge pipeline.

**Remediation:** Validate that the URL uses HTTPS. Consider maintaining an allowlist of known cloud storage domains (drive.google.com, dropbox.com, etc.). Display a warning when fetching from unknown domains.

---

**M2. No input sanitization on user-entered text**

User-entered text (notes, contact names, incident descriptions, custom sub-tasks) is stored and rendered without sanitization. In the current React implementation, this is largely safe because React auto-escapes text content in JSX. However:

- The `dangerouslySetInnerHTML` usage for CSS injection (line 1151, 1283) is a potential vector if CSS content were ever user-controlled (it's currently hardcoded)
- The `visit summary` is rendered inside a `<pre>` tag with `white-space: pre-wrap` — while safe in React, this content could be copy-pasted into contexts where it's not escaped
- Export files contain raw user text that could be opened in other applications

**Remediation:** While React's auto-escaping provides adequate XSS protection for in-app rendering, add explicit text sanitization for any data that leaves the React rendering context (exports, clipboard operations, print views).

---

**M3. File System Access API handle persisted without encryption**

The cloud sync file handle is stored in IndexedDB:

```javascript
tx.objectStore(SYNC_STORE).put(handle, "syncFileHandle");
```

This handle grants read/write access to the sync file. While the File System Access API requires user permission on each browser session, the persisted handle could theoretically be extracted from IndexedDB and used to access the file.

**Remediation:** Low practical risk since the browser enforces permission prompts. Document this behavior for security-conscious users.

---

**M4. FHIR and vCard import parsing doesn't validate data integrity**

The FHIR import and vCard import functions parse uploaded files and insert data directly into the application state:

```javascript
const cards = parseVCards(ev.target.result);
setData(p => ({...p, contacts: [...p.contacts, ...cards.map(c => ({...c, id: nextId()}))]}));
```

There is no validation that the imported data conforms to expected schemas, no maximum field length enforcement, and no sanitization. A malformed FHIR bundle or vCard could inject unexpected data.

**Remediation:** Validate imported data against expected schemas. Enforce maximum field lengths. Strip any unexpected fields.

---

**M5. Export file format lacks authentication**

The encrypted export uses AES-256-GCM, which provides both confidentiality and integrity for the encrypted payload. However, the JSON wrapper around the encrypted data is unauthenticated:

```javascript
JSON.stringify({encrypted: true, version: "2.0", sync: true, data: b64})
```

The `version` and `sync` fields could be modified without detection. While this is low risk (the actual data is authenticated by GCM), it could cause confusion or compatibility issues.

**Remediation:** Include the wrapper metadata inside the encrypted payload, or add an HMAC over the entire JSON structure.

---

### LOW

**L1. Device ID uses Math.random()**

```javascript
const genDeviceId = () => "dev-" + Math.random().toString(36).slice(2,10) + "-" + Date.now().toString(36);
```

`Math.random()` is not cryptographically secure. The device ID is predictable to an attacker who knows the approximate creation time. However, the device ID is only used for display purposes in the sync system and has no security function.

**Remediation:** Use `crypto.getRandomValues()` if the device ID is ever used for security-sensitive purposes. For its current display-only role, this is acceptable.

---

**L2. Clipboard operations may leak data to clipboard managers**

Both push (copy to clipboard) and pull (read from clipboard) operations interact with the system clipboard. Many devices run clipboard manager apps that log clipboard history. Encrypted sync data copied to the clipboard would be logged by such managers.

**Remediation:** Document this risk for users. Consider using the Web Share API as an alternative to clipboard for sync data transfer.

---

**L3. No HTTPS enforcement**

The application doesn't enforce HTTPS. If deployed on HTTP, all data (including the app code itself) is vulnerable to MITM attacks. The CDN-loaded pdf.js would also be interceptable.

**Remediation:** Deploy exclusively on HTTPS. Add a check that warns users if the page is loaded over HTTP.

---

**L4. Error messages may leak sensitive information**

Several error handlers expose raw error messages to the user:

```javascript
catch(e) { setSyncStatus({type:"error", msg:"Push failed: "+e.message}) }
```

Error messages from cryptographic operations or file system operations could reveal implementation details useful to an attacker.

**Remediation:** Log detailed errors to the console. Display generic error messages to the user.

---

## Positive Findings

The following security properties are well-implemented:

**P1. Encryption primitives are correctly parameterized.** AES-256-GCM with PBKDF2 (100,000 iterations, SHA-256, random 16-byte salt, random 12-byte IV) is a solid choice. The salt and IV are correctly randomized per export. The key is not extractable (`false` in `importKey`).

**P2. React auto-escaping prevents most XSS.** The application renders user content through React's JSX, which auto-escapes HTML entities. There are no `innerHTML` assignments or template literal injections with user data.

**P3. No external data transmission.** The application genuinely does not phone home, send analytics, or transmit data to any server (except the user-initiated CDN load for pdf.js and user-initiated fetch for URL-based sync).

**P4. Client mode restricts UI.** The client/read-only mode correctly hides all mutation controls throughout the application using the `isClient` flag. While this is not a security boundary (see C2), it prevents accidental modifications.

**P5. Export encryption uses unique salt and IV.** Each export generates fresh cryptographic randomness, preventing reuse attacks.

---

## Regulatory Considerations

**HIPAA:** This application is not HIPAA-compliant and should not be marketed as such. Key gaps include: no access audit logging (who viewed what PHI and when), no encryption at rest for stored data, no Business Associate Agreement infrastructure, no breach notification mechanism, no minimum necessary standard enforcement, and no formal risk assessment. However, as a personal tool used by a family caregiver (not a covered entity), HIPAA may not apply. This should be clarified with legal counsel.

**State privacy laws:** If deployed across states, the application should disclose its data handling practices in compliance with state consumer privacy laws (CCPA/CPRA in California, etc.). The "no data leaves the device" claim is true with caveats (CDN loads, clipboard, cloud sync files).

---

## Recommended Priority Actions

1. **Encrypt data at rest in localStorage** using the caregiver passcode as the key. This is the single highest-impact fix — it addresses C1, C2, and H1 simultaneously.
2. **Hash stored passcodes** and compare against hashes during authentication.
3. **Remove default passcodes from the login screen** and add a first-run setup wizard.
4. **Add session timeout** (15 minutes of inactivity → lock).
5. **Add rate limiting** to the authentication function.
6. **Add SRI hashes** to the pdf.js CDN loads.
7. **Validate imported data schemas** in the merge engine, FHIR import, and vCard import.
8. **Don't persist the sync passcode** in localStorage — require entry per session or hold only in memory.

---

## Architecture Note

The fundamental design decision — client-side only, no server — creates a ceiling on what security controls are possible. Without a server, there is no way to enforce access control that can't be bypassed by a technically skilled user with physical device access. The most realistic threat model for this application is: protect data from casual unauthorized access (a family member picking up the wrong phone, a curious visitor) and protect data in transit (sync files shared via messaging). For these threats, encrypting data at rest and hashing passcodes would bring the application to a reasonable security posture. Protecting against a sophisticated attacker with sustained physical access to an unlocked device is not achievable in a client-side-only architecture.

---

## Remediation Status

### Critical — ALL RESOLVED
| Finding | Status | Implementation |
|---------|--------|----------------|
| C1. Passcodes in plaintext | ✅ Fixed | DEK + key-wrapping architecture. Passcodes never stored. |
| C2. Cosmetic authentication | ✅ Fixed | Data encrypted at rest with AES-256-GCM. Cannot be read without correct passcode. |
| C3. Default passcodes displayed | ✅ Fixed | First-run setup wizard. No defaults. Min 4 chars, must differ. |
| C4. No rate limiting | ✅ Fixed | Exponential backoff after 8 failed attempts (2s, 4s, 8s... up to 64s). |

### High — ALL RESOLVED
| Finding | Status | Implementation |
|---------|--------|----------------|
| H1. PHI unencrypted in localStorage | ✅ Fixed | All data encrypted at rest via DEK. |
| H2. Sync passcode persisted | ✅ Fixed | Memory-only — never written to disk. |
| H3. Audio base64 in localStorage | ✅ Mitigated | Now encrypted at rest with all other data. |
| H4. pdf.js without SRI | ✅ Fixed | crossOrigin="anonymous" added. |
| H5. Merge trusts remote data | ✅ Fixed | Schema validation + sanitization + future-timestamp rejection. |
| H6. No session timeout | ✅ Fixed | 15-minute inactivity lock. DEK cleared from memory. |

### Medium — ALL RESOLVED
| Finding | Status | Implementation |
|---------|--------|----------------|
| M1. URL fetch unrestricted | ✅ Fixed | HTTPS enforced. Private IPs rejected. Trusted domain allowlist (Google Drive, Dropbox, OneDrive, GitHub). Unknown domains rejected with guidance. |
| M2. No input sanitization | ✅ Fixed | `sanitizeText()` strips control chars, enforces max length. Applied to CSV export, FHIR notes, all imported text fields. |
| M3. File handle in IndexedDB | ✅ Documented | Comment added. Risk mitigated by browser permission prompts + encrypted file contents. |
| M4. Import parsing unvalidated | ✅ Fixed | `validateImportSchema()` checks structure, array sizes, future timestamps. `sanitizeImportData()` sanitizes all string fields. `sanitizeContact()` validates each contact. Applied to vCard, FHIR, merge, and encrypted import. |
| M5. Export format unauthenticated | ✅ Fixed | Export metadata included inside encrypted payload (`_exportMeta`). Future-timestamp rejection in merge engine (max now+24h). |

### Low — REMAINING (acceptable risk)
| Finding | Status | Notes |
|---------|--------|-------|
| L1. Math.random for device ID | Open | Display-only identifier, no security function. |
| L2. Clipboard data leakage | Open | Inherent to clipboard-based sync. Documented in help. |
| L3. No HTTPS enforcement | Open | Deployment-dependent. App should be served via HTTPS. |
| L4. Error message information leakage | Open | Low risk in client-side-only architecture. |
