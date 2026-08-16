# Consent-Based Visibility for External Care Navigators & Institutional Reviewers

**Status:** Design specification (no code written this round). Resolves open question **OQ1**.
**Foundation:** extends the cryptographic role-scoping primitive (`CRYPTO-ROLES-DESIGN.md`, proven in `tests/zone-core-test.mjs`).
**Why now:** the Option-3 institutional sale (CMS GUIDE participants such as Willamette Vital Health) depends on a care navigator being able to see a family's situation *between* monthly home visits. That requires a way to grant an outside party a **scoped, consented, revocable** view of on-device, encrypted data — without a Care Guardian server, and without compromising the dignity of the care recipient.

---

## 1. The problem, stated precisely

A care navigator is employed by an institution (the GUIDE participant), not a member of the family and not present on the family's devices. They need an ongoing, partial view of the family's data so they can tell, between visits, whether the caregiver is coping and whether to intervene. Four constraints collide:

1. **The family holds the data.** It lives encrypted on their device(s). There is no company server holding a copy — that absence is the privacy guarantee, and we do not weaken it.
2. **The view must be scoped.** A navigator sees a clinically useful subset — not financials, not the care recipient's verbatim private voice, not raw documents.
3. **The view must be consented, transparent, time-bound, and revocable.** The family grants it explicitly, always knows it is active, and can end it.
4. **The recipient is off-device.** A navigator cannot be handed a key the way a family member's phone can, and cannot read the family's own cloud folder.

Constraint 4 is the one the existing system does not yet answer. Everything else, we already have most of.

---

## 2. What already exists (and why this is a small extension)

The role-scoping primitive established the hard parts:

- **A one-way key hierarchy.** `DEK_F` (full) decrypts everything. `DEK_R` (restricted) decrypts only a *projection*. `DEK_R` is stored wrapped **under** `DEK_F` (`rUnderF = AES-GCM(DEK_F, DEK_R)`), so any path that recovers F can derive R, but **never the reverse**. A holder of R alone cannot climb to F.
- **Project-then-encrypt.** The client-restricted tier never receives the vault. It receives `proj-r` — an encrypted *projection* of only the data that tier may see, encrypted under `DEK_R`. The scoping is enforced by **what goes into the projection**, then sealed by a key that opens nothing else.
- **Reusable wrap helpers.** `wrapWithKey(rawKey, aesKey)` / `unwrapWithKey(blob, aesKey)` (AES-256-GCM, fresh 12-byte IV) and `combineFactorKey(...)` (HKDF-SHA256 → AES-GCM key) already exist, used by the MFA factor-combination path.
- **Write isolation.** `_scopedWriteLock` + `assertVaultWritable(...)` refuse any vault write from a scoped session at the lowest primitives, not just the UI.

The original design comment says it outright: *"The same scoped-key + projection pattern generalizes to future consent zones (e.g., care-navigator access)."* This spec is the cash-out of that sentence.

**The single new cryptographic ingredient** is **asymmetric key agreement (ECDH P-256)**, used once per push to wrap the projection's key to a recipient who is not on the family's devices. Even that reuses the existing HKDF→AES-GCM machinery for the final wrap; only the ECDH `deriveBits` step is new.

---

## 3. The mechanism in one paragraph

For each external grant, on each refresh, the family's app builds a **scope-parameterized projection** (the role-scoping pattern, generalized from the fixed client projection to a configurable one), generates a **fresh ephemeral data key** `DEK_G`, encrypts the projection under it, and **wraps `DEK_G` to the grantee's static public key** via ECDH-ES (ECDH → HKDF → AES-GCM, reusing `wrapWithKey`). The sealed bundle is pushed to a channel the *institution* controls (their folder/bucket/endpoint — ciphertext only, so the channel is untrusted, exactly like Dropbox is for Team Sync). The navigator's **reviewer-mode** app pulls the bundle, runs ECDH with its private key to recover `DEK_G`, and decrypts the scoped projection. Care Guardian still has no server; `DEK_F` is never exposed; the navigator's key opens nothing but that one scoped projection.

---

## 4. Why an *ephemeral* per-push key (cleaner than the client tier)

The client-restricted tier needs a **persistent** `DEK_R` because the client — who holds only R — must decrypt the projection across sessions with no help from F. A navigator's situation is different: the family **pushes a fresh bundle on every sync**, so the navigator never needs to re-derive an old key independently. That lets `DEK_G` be **ephemeral, regenerated on every push**, which means:

- **No new persistent secret on the family side.** The only new persistent state is the *grant record* (identity, public key + fingerprint, scope flags, expiry, transport config, status). No `nUnderF`, no new key tier to manage or recover.
- **No long-lived payload key.** Compromise of one push's key reveals one push, not the grant's history.
- **The grantee's key is the only static secret**, and it is a *private* key the institution custodies — never transmitted, never on the family's devices.

This is strictly simpler and stronger than reusing `DEK_R`, and it keeps the navigator cryptographically isolated from the *client's* key (which `DEK_R` is not — sharing `DEK_R` with an outside party would couple the navigator to the care recipient's own access).

---

## 5. Two grant archetypes, one machine

Same crypto and transport; they differ only in **what the projection contains** and therefore the consent bar.

| | **Care navigator** (clinical support) | **Program reviewer** (billing / compliance) |
|---|---|---|
| Purpose | See the situation between visits | Demonstrate the caregiver-support benefit is delivered |
| Default scope | Care-plan status, recent incidents, medication-adherence summary, upcoming appointments, caregiver-flagged concerns | **No PHI**: engagement + status only (last-active, care-plan health by domain, backup/team status) — the existing no-PHI summary, pushed on a schedule |
| Explicitly excluded by default | Financials, raw documents, full contact roster beyond the care team, **verbatim client self-reports** | Everything identifying |
| Consent bar | High (PHI; see §7) | Lighter (no PHI), still explicit and revocable |
| Sensitivity if intake leaks | Encrypted PHI behind ECDH + AES-GCM | Encrypted non-PHI |

The **reviewer** archetype is the one most likely to satisfy the GUIDE *payment-justification* need, and being no-PHI it is far easier to get families comfortable with while still proving program value. The **navigator** archetype is the clinically richer view for active support. A family may grant either, both, or neither.

---

## 6. Cryptographic design (key distribution)

### 6.1 Keys

- **Grantee static keypair** — ECDH P-256, generated once in reviewer mode. **Default: one keypair per institution/program** (custodied in the institution's reviewer system; individual navigators authenticate to that system; internal access is governed by the licensing/BAA agreement). This matches HIPAA covered-entity accountability and survives navigator turnover. *Option:* per-navigator keypairs for higher granularity.
- **Family side** — no new persistent key material. The family already holds `DEK_F` and the source data, so it can always regenerate any projection.
- **Per push** — a fresh `DEK_G` (32 random bytes) and a fresh **ephemeral family ECDH keypair**.

### 6.2 Sealing a bundle (family app, every push)

```
1. projection = buildGrantProjection(grant.scope)         // §8 — the role-scoping pattern, parameterized
2. DEK_G      = randomBytes(32)
3. ctProj     = AES-GCM(DEK_G, projection)                 // fresh IV
4. (E_pub, E_priv) = ECDH P-256 ephemeral keypair
5. Z          = ECDH(E_priv, G_pub)                        // deriveBits — the one new primitive
6. WK         = HKDF-SHA256(Z, salt = grantId‖pushNonce, info = "care-guardian-grant-v1")  → AES-256-GCM key
7. wrapped    = wrapWithKey(DEK_G, WK)                     // existing helper
8. bundle     = { v, grantId, archetype, family:{name, anchorFingerprint},
                  scopeManifest, createdAt, expiresAt, pushNonce,
                  ephemeralPub: E_pub, wrappedKey: wrapped, ciphertext: ctProj }
9. push bundle to grant.intakeChannel                      // ciphertext only
```

`E_priv`, `Z`, `WK`, and `DEK_G` are discarded after the push. `G_pub` is the only grantee key the family ever holds, and it is public.

### 6.3 Opening a bundle (reviewer mode)

```
1. Z       = ECDH(G_priv, bundle.ephemeralPub)
2. WK      = HKDF-SHA256(Z, salt = grantId‖pushNonce, info = "care-guardian-grant-v1")
3. DEK_G   = unwrapWithKey(bundle.wrappedKey, WK)
4. proj    = AES-GCM-decrypt(DEK_G, bundle.ciphertext)
5. render read-only, with bundle.scopeManifest shown verbatim and bundle.expiresAt enforced
```

The grantee derives everything from the bundle plus its own private key. **The family need not be online at view time**, and the family's cloud account is never involved.

### 6.4 Why asymmetric (and not a shared passcode)

A passcode would have to be transmitted to the institution out-of-band, has low entropy, and makes revocation mean "rotate a secret everyone re-types." A **public** key can be printed on enrollment paperwork, shown as a QR, or listed in a directory — nothing secret crosses an out-of-band channel. Revocation and re-granting are just *"wrap the next push to a different public key."*

### 6.5 Anti-impersonation (the swapped-key attack)

A man-in-the-middle could substitute their own public key in the enrollment package. Defense, borrowed from the "verify the safety number" pattern: the enrollment package carries a short **public-key fingerprint** (e.g., 8 base32 chars of SHA-256(G_pub)), and the consent screen shows it next to *"Confirm this matches the code on the program's enrollment paperwork."* The family verifies it out-of-band during the enrollment visit. The grant cannot complete until the family taps *"It matches."*

---

## 7. Consent UX

The consent surface is where the privacy and dignity values are made real, and where the institutional buyer's compliance story lives. Principles: **plain language, nothing hidden, scope visible and reducible, always revocable, never a dark pattern.**

### 7.1 Granting — the screen, top to bottom

A new Settings entry, **"Share with a care program,"** opens after the family scans/enters an enrollment package. The grant screen shows, in order:

1. **Who.** *"Willamette Vital Health wants to set up a **care navigator** view for [parent]."* Institution name, archetype (navigator vs reviewer), and the **public-key fingerprint** with the *"matches the paperwork?"* confirmation (§6.5).
2. **What they will see** — every included category as a row, each with a toggle **the family can switch off** (they may narrow below the archetype default; they cannot exceed its ceiling). For the reviewer archetype this list is short and explicitly non-PHI.
3. **What they will *not* see** — an explicit, reassuring list (financials, documents, **your parent's private words**, …). Showing the exclusions is as important as showing the inclusions.
4. **How long.** A default expiry (e.g., aligned to a renewable care term) shown as a real date, adjustable. *"This view ends on [date] unless you renew it."*
5. **What "share" means, plainly.** *"This view updates when you sync. The program sees your information as of your last sync — not live. You can stop sharing at any time."*
6. **Authority attestation.** A checkbox: *"I am [parent]'s [self / authorized caregiver / power of attorney] and have the authority to share this."* The app records the attestation; it does **not** adjudicate legal authority (that is a legal question — see §11). Where a `client-full` role exists in the household, the grant is surfaced to them too.
7. **Grant.** One clear action. On grant, the app seals and pushes the first bundle (§6.2), writes the grant to the audit log, and shows the indicator below.

### 7.2 The standing indicator (transparency is permanent)

While any grant is active, a persistent, non-dismissible row lives in the app — on the Today hub and atop Settings: *"👁 Willamette Vital Health has a care navigator view. Last updated [time]. Manage / Stop."* The family never has to remember; they are reminded. (Emotional-honesty value: the family always knows exactly who can see what.)

### 7.3 Revoking

One tap from the indicator → a confirm screen that is **honest about what revocation does and does not do**:

> *Stop sharing with Willamette Vital Health?*
> *They will receive no further updates, starting now. Information they have already seen or saved cannot be pulled back — the same as any record you've shared.*

On confirm: the grant is marked inactive, **future pushes stop immediately**, the latest bundle is best-effort deleted from the intake channel, and the revocation is written to the hash-chained audit log.

### 7.4 Expiry & re-consent

At `expiresAt`, the grant deactivates and pushing stops on its own. The family is prompted once to **renew** (which re-displays the scope and re-affirms it) or let it lapse. Re-consent is a feature, not friction — it is the recurring moment where the family re-sees and re-approves what is shared.

### 7.5 Audit

Every lifecycle event — grant, scope change, each refresh push, expiry, revocation — is appended to the existing tamper-evident, hash-chained audit log, with the institution, archetype, and scope manifest. This is both a dignity safeguard and the institution's compliance evidence.

---

## 8. The projection — scope made structural

`buildGrantProjection(scope)` generalizes the fixed client projection into a parameterized one. It is the **only** thing standing between the family's data and the grantee, so it is built by *inclusion*, never by redaction-after-the-fact:

- It reads source collections and **emits only the fields the scope permits**, per category toggle.
- The **care recipient's verbatim self-reports are excluded by default** in both archetypes. If a navigator scope opts to include client wellbeing at all, it includes an **aggregated signal** (e.g., a trend or a caregiver-summarized note), never the protected verbatim voice. The append-only client-voice chain is never exported.
- A **scope manifest** (the human-readable list of what is and isn't included) is built alongside the projection and travels in the bundle, so the navigator's screen states plainly what they are and are not seeing — and so the manifest is auditable on both sides.
- The projection is **read-only by construction**; the navigator cannot write back in v1 (see §10). The `_scopedWriteLock` philosophy applies: reviewer mode holds no path to the family vault.

---

## 9. Transport — the "no Care Guardian server" answer

The bundle is ciphertext, so the channel can be **untrusted**, exactly as Team Sync treats Dropbox/OneDrive/Google Drive. Reuse the `CLOUD_PROVIDERS` abstraction (one interface, swap transport) and add an **institutional-intake** target:

- **Primary:** the institution provides an intake location (a per-family folder, bucket, or endpoint with an upload token) in the enrollment package. The family pushes there on each sync; reviewer mode pulls. **The intake is the institution's storage — Care Guardian remains serverless.**
- **Fallback for institutions without infrastructure:** a **shared cloud folder** (the institution shares a OneDrive/Google Drive folder; the family's app drops bundles in it). Still ciphertext; still E2E.

The model is a **snapshot that refreshes on sync**, not a live feed — disclosed in consent (§7.1, item 5) and on the reviewer screen.

---

## 10. Data model additions (when this is built)

Minimal, and additive:

- `data.grants: [ { grantId, archetype, institution, granteePub, granteeFingerprint, scope:{…flags}, manifest, createdAt, expiresAt, lastPushAt, status, intake:{provider, config} } ]`
- **No new secret key fields** (per §4 — `DEK_G` is ephemeral; the only static grantee key is *public*).
- Audit events: `grant.created`, `grant.scopeChanged`, `grant.pushed`, `grant.expired`, `grant.revoked`.
- Reviewer mode: a program keypair store (private key custodied locally in the institution's install), an enrollment-package exporter (publishes `G_pub` + fingerprint + intake config + default scope), and a bundle puller/decryptor/read-only renderer.

---

## 11. Honest limitations & residuals

In the project's tradition of disclosing rather than overclaiming:

1. **Revocation cannot retract what was already seen or cached.** It stops the future. Disclosed verbatim in the revoke screen. This is inherent to all sharing, not a flaw of this design.
2. **Snapshot, not real-time.** The navigator sees data as of the family's last sync.
3. **In-bundle expiry is advisory on the reviewer side; the binding control is that the family stops pushing.** Reviewer mode enforces `expiresAt`, but the cryptographic guarantee is "no new bundles are produced," not "the old bundle self-destructs."
4. **Institution-internal access is governed by agreement, not by Care Guardian.** A per-institution program key means the institution's own controls decide which staff open reviewer mode; this belongs in the BAA/licensing terms. Per-navigator keys narrow this at operational cost.
5. **Consent authority is a legal question.** The app records an attestation and makes the grant transparent and logged; it does not verify POA. Deployment guidance for institutions must address who may consent for a person with diminished capacity.
6. **Private-key custody is the grantee's responsibility.** Whoever holds `G_priv` can decrypt bundles pushed to it. Loss/compromise of the program private key is an institutional security event; rotating it requires re-issuing enrollment packages.

---

## 12. What's reused vs. genuinely new

**Reused unchanged:** the one-way `DEK_F`→scoped-key hierarchy; project-then-encrypt; `wrapWithKey`/`unwrapWithKey`; HKDF (`combineFactorKey` pattern); the scoped write-lock; the hash-chained audit log; the `CLOUD_PROVIDERS` transport abstraction; the no-PHI summary (becomes the reviewer projection).

**Genuinely new:** ECDH P-256 key agreement (one `deriveBits` call per push) for off-device key distribution; the parameterized `buildGrantProjection(scope)`; the grant data model + lifecycle; the consent UX and standing indicator; reviewer mode (program keypair, enrollment-package export, bundle pull/decrypt/render); the institutional-intake transport target.

The new surface is small and concentrated, which is the point of building on the existing primitive.

---

## 13. Proof plan (before any of this ships)

Mirroring the project's "prove safety-critical code in isolation first" rule:

- Extend `tests/zone-core-test.mjs` (or a new `grant-core-test.mjs`) to assert, against the real crypto: ECDH-ES round-trip (family ephemeral + grantee static derive the same `WK`; `DEK_G` unwraps; projection decrypts); **the grantee key opens *only* its projection** and cannot derive `DEK_F` or another grant's key; a wrong/rotated grantee key fails closed; **the projection contains exactly the scoped fields and never the verbatim client-voice chain**; scope-manifest/ciphertext agreement; expiry enforcement; and that revocation produces no further decryptable pushes.
- A consent-flow harness (jsdom, like `firstrun-test.cjs`) walking grant → indicator visible → revoke → no further push, asserting each lifecycle audit event lands in the hash chain.
- **Standing gate unchanged:** the asymmetric layer is a new cryptographic surface and must be part of the full human security review before any institutional deployment.

---

## 14. Phasing

- **v1 (sale-enabling):** read-only; per-institution program key; both archetypes (reviewer first — no-PHI, lowest consent bar, satisfies billing justification; navigator second). Shared-folder or institution-intake transport. Full consent UX, indicator, revocation, audit. Isolated proofs + human review.
- **Later:** per-navigator keys; **write-back** (a navigator leaves a note/guidance for the caregiver — the reverse projection, gated and consented); tighter real-time options; directory-based key distribution for multi-institution families.
