# Care Guardian — Independent Review Brief

*Paste this whole document into a reasoning/thinking model to get a sharp, project-specific critique. It contains the context the reviewer needs so it pressure-tests the real project and its real constraints — not a generic app.*

---

## How to use this brief (instructions to the reviewer)

You are being asked to **red-team** a working software project: find its genuine weaknesses, risks, and blind spots. Please:

1. **Critique the project as it actually is**, given the constraints in Section 2. Several conventional recommendations (add a server, add analytics, add GPS tracking, take VC) are *deliberately excluded* and explained below. If you believe one of those exclusions is a mistake, **argue it explicitly** — don't assume it's an oversight and don't pad your review with advice that ignores the stated constraints.
2. **Rank findings by severity** (critical / high / medium / low) and, for each, say concretely what could go wrong and what you'd change.
3. **Distinguish** "genuine flaw" from "deliberate tradeoff you'd have made differently" — both are useful, but label which is which.
4. **Go deeper than the known limitations** in Section 5. Those are already understood; the value is in what they *don't* yet list.
5. Prioritize **data-loss, cryptographic, privacy, and correctness** risks over stylistic ones. For software that holds a vulnerable person's medical and legal life, silent data loss and privacy leaks matter more than anything.

---

## 1. What this is

**Care Guardian** is a privacy-first Progressive Web App for family caregivers managing a parent with dementia. It tracks care across five domains (physical, cognitive, wellness, legal, financial), plus incidents, medications, documents, contacts, a calendar, a care schedule, messages, self-reports, POA decisions, capacity assessments, and a caregiver-wellness tracker. It is used by a small care team: family members, hired aides, and (where capacity allows) the care recipient.

- **Single-file React app**, ~4,655 lines, compiles to a ~572 KB bundle (148 KB gzipped).
- **Stack:** React 18, Vite, Web Crypto API, IndexedDB, vite-plugin-pwa. No backend.
- **Primary audience for adoption:** elder-law attorneys and geriatric care managers, who recommend it to families.

---

## 2. Hard constraints (deliberate — challenge explicitly if you disagree)

These are core to the project's identity, not accidents. They rule out much conventional advice:

- **No server holds user data.** The app is local-first and functions fully offline. There is no central backend with a live view of users or data.
- **No analytics, telemetry, tracking, or ads.** The vendor cannot measure who uses the app, how, or when. By design.
- **No data monetization, no VC funding, no acquisition/exit strategy.** Revenue (if any) comes from optional paid hosting/support and funded per-state content — never from the data.
- **No GPS/EVV caregiver surveillance.** Electronic Visit Verification was explicitly declined because it requires reporting a caregiver's location to a third party, which violates the project's privacy stance.
- **Must be usable by non-technical, elderly, stressed people.**
- **The only external network calls** are Google Fonts and a pdf.js CDN for client-side document parsing. No other egress.

If your critique's main thrust is "add a backend / add analytics / add EVV," you are critiquing a different project. You may argue these constraints are wrong — but do so knowingly.

---

## 3. Architecture

**Encryption at rest.** AES-256-GCM. A random 256-bit Data Encryption Key (DEK) is generated once and "wrapped" (encrypted) separately with two passcodes — a caregiver passcode and a client passcode — using PBKDF2 (SHA-256, 100,000 iterations). No plaintext is written to storage.

**Storage split (v3).**
- Wrapped keys → `localStorage` (`demcare-keys-v3`, ~1 KB). Plaintext JSON structure, but the keys themselves are PBKDF2-wrapped.
- Encrypted data vault → IndexedDB (`care-guardian-vault`), one AES-GCM-encrypted blob containing the entire dataset.
- HIPAA audit log → a *separate* IndexedDB database (`care-guardian-audit`), entries individually encrypted with a *different* key derived from the same passcode with a different (hardcoded) PBKDF2 salt.
- `navigator.storage.persist()` is requested to resist browser eviction.

**Authentication.** Two-passcode system; role is derived from a device ID in a team roster. Five roles (Admin, Family, Care Professional, Client-Independent, Client-Supported) with a `can(action)` permission engine enforced in the UI. 15-minute inactivity lock clears keys from memory. Exponential backoff after 8 failed attempts.

**Sync (no server required).** Data syncs between team devices via (a) a shared cloud folder, (b) an optional self-hosted relay that only ever stores end-to-end-encrypted blobs, or (c) manual export/import. A client-side **merge engine** reconciles:
- **Append-only union** (by record ID) for incidents, messages, expenses, self-reports, capacity logs, POA decisions, caregiver wellness. Team members can add but not modify/delete each other's records.
- **Most-recent-wins** (by a `lastModified` timestamp) for mutable records — currently the care *shifts*. Anyone with sync access can overwrite these.

**HIPAA posture.** Technical safeguards mapped to 45 CFR §164.312(a)–(e): encryption at rest, audit controls (the separate audit log), integrity (SHA-256 vault hash verification), authentication, transmission security (HTTPS + E2E encryption). Claims to qualify for the breach-notification "encryption safe harbor."

**Process.** Built iteratively with an AI assistant (Claude). Five internal security audits (v2–v5) have been performed *by the same model that wrote the code* — which is exactly why an independent review is wanted.

---

## 4. Decisions already made deliberately (don't re-litigate without new arguments)

- **localStorage → IndexedDB migration** chosen over staying on localStorage (5 MB cap was insufficient for an 8-year, ~140–610 MB care lifecycle).
- **IPFS considered and deferred** — solves redundancy/sync, not capacity; adds bundle size and a pinning dependency.
- **Per-record cryptographic signing considered and deferred** — would enforce role permissions on mutable synced records, but adds key-management, revocation, clock-trust, and bootstrap complexity judged disproportionate for a small trusted family team. Current mitigation is `lastModifiedBy` attribution + honest disclosure.
- **The single-file architecture** is intentional (portability, auditability) despite its size.

---

## 5. Known limitations (already understood — please go *beyond* these)

- **Mutable synced records (shifts) lack cryptographic role enforcement.** Anyone with the sync passcode can overwrite them; role checks are UI-only. Mitigated by attribution, not prevention.
- **No multi-factor authentication.** Single passcode. The 2025 proposed HIPAA Security Rule update may make MFA mandatory.
- **Single encrypted blob**, not yet per-record partitioned — write amplification on every save; corruption blast radius is the whole vault.
- **Bus factor of one** — effectively a single maintainer.
- **No automated test suite** — changes are build-verified and manually audited.
- **Accessibility has not been formally audited** despite the elderly/stressed user base.
- **Binary data (photos, audio)** is stored base64-in-JSON inside the encrypted blob (inefficient vs. raw IndexedDB blobs).

---

## 6. Please pressure-test these specifically

### Cryptography
- Is the DEK + dual-passcode-wrapping scheme sound? Any weakness in wrapping one DEK with two independently-derived keys?
- Is **PBKDF2 at 100,000 iterations** adequate in 2026, or should this be higher / switched to Argon2 or scrypt? What's the realistic offline-attack exposure given the wrapped keys sit in localStorage?
- **AES-GCM IV/nonce management:** if the whole vault is re-encrypted on every save, how are IVs generated, and is there any nonce-reuse risk under GCM (which is catastrophic for GCM)?
- Deriving the **audit-log key from the same passcode with a hardcoded salt** — does this meaningfully separate it from the vault key, or is it security theater?
- Wrapped keys in plaintext-structured localStorage while data is in IndexedDB — any attack surface in that split?

### The serverless trust model (the project's most distinctive risk)
- Is `lastModifiedBy` attribution + honest disclosure a *defensible* answer to "any sync-capable member can overwrite mutable records," or is there a better serverless mitigation short of full PKI? (e.g., admin-only-signed assignments, hash-chained logs, CRDT approaches?)
- **Most-recent-wins relies on device clocks.** What breaks under clock skew or deliberate clock manipulation? Could a malicious or misconfigured device silently win every conflict?
- Are there **merge scenarios that silently lose data** — e.g., concurrent edits, a record edited on one device and deleted on another, append-only vs. most-recent-wins interactions?

### Data integrity & loss
- The v2→v3 migration verifies the IndexedDB write before deleting the old vault. Is that verification sufficient, or are there partial-failure modes that still lose data?
- IndexedDB can still be **evicted** despite `persist()` (especially on iOS/Safari). What's the user's recovery path, and does the app detect/communicate eviction rather than silently presenting a fresh-install state?
- **No versioning or rollback.** For data that must survive years and litigation, is point-in-time encrypted export an adequate substitute?
- A single encrypted blob: what's the corruption blast radius, and is one bad write catastrophic?

### Privacy
- Do the **Google Fonts and pdf.js CDN** calls undermine the "nothing leaves the device" claim? Fonts can leak IP/timing; a CDN sees request metadata. Should these be self-hosted/bundled?
- Any other **unintentional egress** (service worker, prefetch, error reporting, browser features)?
- Does anything in the PWA/service-worker layer cache plaintext anywhere outside the encrypted vault?

### Correctness & maintainability
- At ~4,655 lines in one file with extensive `useState`/`useEffect`, what classes of React bugs are most likely (stale closures, effect re-run loops, race conditions in the async save path)?
- The async encrypted-save effect fires on every data change — any risk of **lost writes or out-of-order writes** under rapid edits?
- The codebase has known **transpiler workarounds** (avoiding `return <jsx>` patterns). Does this signal deeper fragility?

### HIPAA / compliance
- Does the local-first model genuinely satisfy HIPAA for an **agency/professional** deployment, or only for personal/family use (where HIPAA may not even apply)? Where exactly is the covered-entity / business-associate line here?
- Is the **encryption safe-harbor** claim correctly applied, given keys derive from user passcodes that may be weak?
- Is a **locally-stored audit log** (deletable with the vault, capped at 1,000 entries) adequate for the 6-year retention HIPAA expects?

### Accessibility
- For elderly users with possible low vision, tremor, or mild cognitive impairment of their own: what are the most likely accessibility failures in a dense, information-rich PWA, and what would you check first?

### Sustainability & strategy
- Is "open-source core + paid hosting/support + funded per-state content" a realistic sustainability model for a single-maintainer project, or what's the likely failure mode?
- The strategy is to set a **standard** (a published "Privacy Principles for Caregiving Software") and win elder-law/care-manager referrals. Is that a credible path to influence, or naive? What would make it more robust?
- How should a project that **forbids itself analytics** credibly measure its own impact and improve?

---

## 7. What a maximally useful response looks like

A severity-ranked list of findings, each with: the concrete failure scenario, whether it's a genuine flaw or a tradeoff you'd make differently, and a specific suggested change. Plus: the **two or three things you would fix first** if this were your project, and any risk you think the team is underweighting. Be direct; this is for hardening, not reassurance.
