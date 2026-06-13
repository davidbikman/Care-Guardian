# Care Guardian — HIPAA Compliance Statement

## Applicability

HIPAA applies to **covered entities** (health plans, healthcare providers, clearinghouses) and their **business associates**. A family caregiver using Care Guardian for personal use is generally not a covered entity. However, if Care Guardian is used by home health agencies, professional caregivers employed by covered entities, or in any context where ePHI is created or maintained on behalf of a covered entity, HIPAA compliance is required.

This document maps Care Guardian's technical safeguards to the HIPAA Security Rule (45 CFR §164.312).

---

## Technical Safeguards Mapping

### §164.312(a) — Access Controls

| Specification | Status | Implementation |
|--------------|--------|----------------|
| **Unique User Identification** (Required) | ✅ Compliant | Each device has a unique `deviceId` generated on first use. Team roster tracks each member by device ID, name, and role. All audit log entries include user identification. |
| **Emergency Access Procedures** (Required) | ✅ Compliant | Encrypted backup export allows data recovery on a new device. The setup wizard generates passcodes that should be documented in a secure location (e.g., sealed envelope with attorney). If both passcodes are lost, data is unrecoverable by design — no backdoor exists. |
| **Automatic Logoff** (Addressable) | ✅ Implemented | 15-minute inactivity timeout. DEK cleared from memory on logoff. Session requires re-authentication. |
| **Encryption and Decryption** (Addressable) | ✅ Implemented | AES-256-GCM encryption at rest. PBKDF2 key derivation (100,000 iterations, SHA-256). Random 256-bit Data Encryption Key (DEK) wrapped separately with caregiver and client passcodes. No plaintext ePHI stored at any time. |

### §164.312(b) — Audit Controls

| Specification | Status | Implementation |
|--------------|--------|----------------|
| **Record and examine activity** (Required) | ✅ Implemented | HIPAA audit log records all PHI-relevant events: authentication (login, logout, failed attempts), PHI access (which view was opened), PHI modification (create, update, delete), exports, sync operations, and integrity checks. Each entry includes timestamp, action, detail, PHI type, user ID, user name, and role. Log retained up to 1,000 entries. Exportable as CSV. |
| **Protection from alteration** (Addressable) | ✅ Tamper-evident | Audit entries are **hash-chained**: each entry carries a sequence number and the hash of the prior entry, and its own hash covers its content plus that link. Deleting, reordering, or altering any entry breaks the chain, which the app detects and surfaces in Settings → Security & Integrity. A chain tip stored both in localStorage and inside the encrypted, WAL-backed, synced vault detects removal of the most recent entries (silent tail-truncation), since rolling back the log mismatches the vault anchor. **Limitation:** because the log is secured by the same passcode as the data, a holder of that passcode could recompute the entire chain; full alteration-proofing would require an external append-only anchor (e.g., periodic export to a write-once store). Organizations needing non-repudiation should export and archive the log regularly. |

**Logged events include:**
- All authentication attempts (success and failure)
- Navigation to any PHI-containing view (incidents, medications, contacts, documents, self-reports, POA decisions, capacity observations, care domains, emergency card, care plan binder, shift handoff)
- Creation of incidents, medications, POA decisions
- Deletion of incidents, expenses, contacts, self-reports
- All data exports (encrypted backup, non-sensitive summary, audit log CSV)
- All sync operations (with item counts)
- Data integrity verification checks
- Session lock/logout events

### §164.312(c) — Integrity

| Specification | Status | Implementation |
|--------------|--------|----------------|
| **Mechanism to Authenticate ePHI** (Addressable) | ✅ Implemented | SHA-256 hash verification of the encrypted vault available in Settings → Data Integrity. AES-256-GCM provides authenticated encryption — any unauthorized modification of the ciphertext is detected during decryption (GCM authentication tag verification). |

### §164.312(d) — Person or Entity Authentication

| Specification | Status | Implementation |
|--------------|--------|----------------|
| **Verify identity** (Required) | ✅ Compliant | Two-passcode authentication system. Caregiver passcode grants access based on device role (Admin, Family, Care Professional). Client passcode grants Client access (Independent or Supported tier). Rate limiting with exponential backoff after 8 failed attempts. |
| **Multi-factor authentication** (Proposed-rule readiness) | ✅ Supported (opt-in, professional roles) | Admin and Care Professional roles can enable a WebAuthn passkey (Face ID / Touch ID / Windows Hello / security key) as a **required** second factor. Implemented as true encryption-bound MFA: the vault key is wrapped under a key derived from both the passcode and the passkey's PRF output, so a passcode alone — even with the wrapped key extracted — cannot decrypt. A one-time printed recovery code (bound to passcode + code) prevents device-loss lockout. This addresses the MFA expectation in the proposed 2025 HIPAA Security Rule update (see Known Limitations for the rule's current status). |

### §164.312(e) — Transmission Security

| Specification | Status | Implementation |
|--------------|--------|----------------|
| **Integrity Controls** (Addressable) | ✅ Implemented | All transmitted data is AES-256-GCM encrypted end-to-end before transmission. GCM mode provides both confidentiality and integrity verification. |
| **Encryption** (Addressable) | ✅ Implemented | HTTPS enforced for sync server communication. Private IP addresses blocked. Sync data encrypted with AES-256-GCM before transmission — the sync server never sees plaintext. |

---

## Administrative Safeguards (Organizational Responsibility)

The following HIPAA requirements are organizational policies that must be implemented by the entity deploying Care Guardian. The app provides tools to support compliance but cannot enforce organizational policy:

| Requirement | App Support | Organizational Action Needed |
|------------|-------------|------------------------------|
| **Risk Analysis** §164.308(a)(1) | Security audits (v1, v2, v3) documented. Architecture designed for zero-knowledge. | Organization must conduct its own risk analysis covering all systems, not just this app. |
| **Workforce Training** §164.308(a)(5) | In-app Help system documents all features and security measures. | Organization must train workforce on HIPAA policies and Care Guardian usage. |
| **Sanctions Policy** §164.308(a)(1) | Audit log provides evidence for policy enforcement. | Organization must establish and enforce sanctions for HIPAA violations. |
| **Contingency Plan** §164.308(a)(7) | Encrypted export/import enables data backup and recovery. Sync provides redundancy across devices. | Organization must document backup procedures and test recovery. |
| **Business Associate Agreement** | Not applicable — Care Guardian has no server component and never accesses ePHI. | If using the self-hosted sync server, the server operator may need a BAA depending on their relationship to the covered entity. |

---

## Minimum Necessary Standard

Care Guardian implements the Minimum Necessary standard through its five-tier access control system:

- **Care Professionals** see only Physical Health, Cognitive Health, and Wellness domains. Legal, Financial, documents, expenses, and export functions are invisible.
- **Client (Supported)** sees only self-reports and messages.
- **All delete operations** are permission-guarded at the function level.
- **The audit log** records which user accessed which PHI type, enabling retrospective review of access appropriateness.

---

## Breach Notification Readiness

Because Care Guardian stores all data locally with AES-256-GCM encryption, a lost or stolen device does NOT constitute a breach under HIPAA if:

1. The device is passcode-protected (device-level encryption)
2. Care Guardian's own passcode was not compromised
3. The AES-256-GCM encryption renders the data unreadable

Per HHS guidance, encrypted data that meets NIST standards is excluded from breach notification requirements under the safe harbor provision (45 CFR §164.402(2)).

**If a breach is suspected:** The HIPAA audit log provides the evidence needed for breach assessment — which users accessed which data types and when.

---

## Data Retention

- **HIPAA audit log:** Retained up to 1,000 entries within the app. HIPAA requires documentation retention for 6 years (§164.530(j)). Organizations should export the audit log periodically and archive externally.
- **All ePHI:** Retained until the user deletes it or clears the app data. No automatic purging.
- **Encrypted exports:** Contain all data at time of export. Organizations should establish retention policies for exported files.

---

## Limitations

1. **Multi-factor authentication (MFA):** Now **supported** for professional roles (Admin, Care Professional) via opt-in PRF-bound WebAuthn passkeys with a one-time recovery code (see §164.312(d)). It is opt-in rather than forced because the family-caregiver use case must not require a passkey. Regarding the regulation: the 2025 NPRM proposed making MFA mandatory and removing the "addressable" loophole, but **as of mid-2026 it remains a proposed rule — OCR has not issued a final rule**, and the spring-2026 finalization window passed without one. Auditors already treat MFA as a baseline expectation, so professional/covered-entity deployments should enable it.

2. **No centralized user management:** User accounts are device-based, not centrally managed. Adding or revoking access requires the Admin to modify the team roster and change the caregiver passcode.

3. **Audit log is stored locally:** The audit log is part of the encrypted vault. If the vault is deleted, the audit log is lost. Organizations should export the audit log regularly.

4. **No network segmentation:** Not applicable — the app has no persistent network connections.

---

## Compliance Certification

Care Guardian implements the technical safeguards required by the HIPAA Security Rule as documented above. However, **HIPAA compliance is an organizational responsibility, not a software feature.** Deploying Care Guardian does not automatically make an organization HIPAA-compliant. Organizations must:

1. Conduct their own risk analysis
2. Implement administrative and physical safeguards
3. Train their workforce
4. Establish policies and procedures
5. Execute Business Associate Agreements where required
6. Regularly review and update their compliance program

This document should be reviewed by the organization's HIPAA compliance officer and legal counsel.
