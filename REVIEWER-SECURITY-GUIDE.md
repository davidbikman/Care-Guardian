# Care Guardian — Security Reviewer's Guide

**Purpose.** This maps every security property the app claims to the exact automated test that
demonstrates it, the source mechanism that implements it, and — most importantly — **what the test does
*not* cover**, so a human reviewer knows where to spend judgment instead of re-reading 7,300 lines cold.

**How to read each row.** *Property* → *Demonstrated by* (`test-file` → the assertion text you'll see
printed) → *Mechanism* (identifier to grep in `src/App.jsx` or `intake-server/server.cjs`) → *Residual*
(what a human still has to verify). Assertion texts are quoted verbatim from the suites; run them and you
will see these exact lines.

**Trust model in one paragraph.** All PHI lives on the family's device, encrypted at rest under a
passcode-derived key. The family is the data controller. Sharing is *outbound only* and end-to-end
encrypted to a specific institution's public key; the institution is **not** treated as a covered entity
and learns only what it is cryptographically party to. The reference intake server is **untrusted with
plaintext** — it only ever holds ciphertext and enforces capability scope, write-once audit storage, and
revocation. A human reviewer should assume a hostile storage operator and a hostile network and check that
confidentiality and scope-integrity still hold (they are designed to).

---

## How to reproduce everything

```bash
# from the package root (care-dashboard-release/)
npm install
npx vite build                      # must end "✓ built in …"; the app is src/App.jsx

# run the whole suite (24 green expected)
cd tests
for f in *.mjs; do node "$f" || echo "FAIL $f"; done
node wal-core.cjs && node wal-test.cjs && node wal-sim.cjs

# structural guards the build pipeline uses
python3 -c "c=open('src/App.jsx').read();print('(',c.count('(')-c.count(')'),'{',c.count('{')-c.count('}'),'[',c.count('[')-c.count(']'))"   # all zeros

# confirm what SHIPS matches source (esbuild strips comments + mangles locals,
# but string literals and property keys survive — grep the bundle):
JS=$(ls -S dist/assets/*.js | head -1)
grep -o 'cg-grant-hdr' "$JS"        # grant full-header AAD shipped
grep -o 'must use https' "$JS"      # TLS-intake enforcement shipped
grep -o 'cg-reviewer-vault' "$JS"   # reviewer keystore shipped
```

**Test design note.** Suites that prove app behavior do not re-implement it — they **extract the real
functions verbatim** from `src/App.jsx` with a brace-matching extractor and run those, so a green test is
evidence about shipped code, not a parallel mock. Look for the first assertion in each such suite:
`"extracted the real … from src/App.jsx"`. Where a real device or real cloud is required (WebAuthn PRF,
S3 signing, live OAuth), the suite says so and substitutes a representative stand-in; those are called out
in the Residual column below and consolidated in §"What the tests do not cover."

---

## 1. Encryption at rest & key handling

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| Vault is AES-256-GCM under a PBKDF2-600k passcode-derived key; wrong passcode/corruption fails closed | `audit-backup-test` → *"a corrupted backup fails closed (AES-GCM auth)"*, *"a wrong passcode fails closed"*; `reviewer-vault-test` → *"a wrong passcode fails closed (throws, no secrets returned)"* | `encryptData`/`decryptData`, `wrapDEK`/`unwrapDEK`, `KDF_ITER` (=600000) | Primitives are WebCrypto; the **KDF cost** (600k) is a policy choice — confirm it's acceptable for your threat model. Passcode minimums (8 chars) are enforced in UI only. |
| Media blobs are partitioned out of the vault and re-encrypted under each holder's own key on import | `blob-roundtrip-test` → *"imported blob is re-encrypted under the importer's key (A's key cannot read B's store)"*, *"vault JSON carries NO base64 — only refs"* | `packageWithBlobs`/`ingestBlobs`, blob store (`care-guardian-blobs`) | — |
| Orphaned blobs are garbage-collected without deleting referenced ones, with a grace window against the attach/GC race | `gc-test` → *"referenced blobs are NEVER deleted"*, *"a just-attached orphan (b5, within grace) is preserved (race guard)"* | blob GC sweep | — |

## 2. Authentication & MFA

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| MFA requires **both** factors — no passcode-only and no passkey-only bypass | `mfa-core-test` → *"passcode + WRONG passkey output fails (no passcode-only bypass)"*, *"WRONG passcode + correct passkey fails (both factors required)"* | `combineFactorKey`, `buildPasskeyWrap`/`unwrapWithPasskey` | The **PRF output is simulated as fixed bytes** in-test (Node has no authenticator). Real WebAuthn/PRF must be device-tested: known-good on desktop Chrome/Edge and iOS platform passkeys; desktop Safari has WebKit PRF bugs. |
| Recovery code is genuinely 2-factor (passcode + code), not a single-factor escape hatch | `mfa-core-test` → *"recovery code with WRONG passcode fails (recovery is still 2-factor, not a single-factor bypass)"* | `buildRecoveryWrap`/`unwrapWithRecovery` | — |
| Multiple passkeys are independent — one authenticator's PRF can't open another's wrap | `mfa-core-test` → *"a passkey's PRF can't open another passkey's wrap (entries are independent)"* | `mfaKeys[]` per-credential wraps | — |
| **MFA-bypass fix:** once MFA is on, the client passcode has no path to the full key | `security-fixes-test` → *"after MFA, the client passcode has NO path to the full DEK (the wrap is gone) — MFA bypass closed"*, *"a SCOPED client wrap survives MFA (the care recipient can still sign in)"* | `mfaCarryClientWrap` (drops a full-DEK client wrap on enroll); unlock gate `clientScope==="r" \|\| !mfaOn` | Behavior change: enabling MFA on a *default-tier* household disables a full-access second passcode (by design — it was the bypass). The care recipient is re-established as a scoped account. Confirm this matches the deploying org's expectations. |

## 3. Reviewer (institution) keystore

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| The program private key + intake read cap are sealed at rest — no plaintext in localStorage | `reviewer-vault-test` → *"the stored vault contains NO plaintext private scalar, read cap, or institution name"* | `buildReviewerVault`/`openReviewerVault`, `REVIEWER_VAULT_KEY` (=`cg-reviewer-vault`) | A forgotten reviewer passcode is unrecoverable by design (discard + re-enroll). |
| Passcode and (optional) passkey are independent unlock methods; the passkey path needs both factors | `reviewer-vault-test` → *"the passkey path needs BOTH factors…"*, *"the passcode still opens the vault after a passkey is added"* | `addReviewerPasskeyWrap`/`openReviewerVaultWithPasskey` | Same real-device PRF caveat as §2. |
| Tampering the sealed payload or the wrap is detected | `reviewer-vault-test` → *"tampering with either the sealed payload or the passcode wrap is detected (fails closed)"* | AES-GCM auth on both layers | — |

## 4. Grant sharing crypto (outbound, end-to-end)

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| ECDH-ES seal/open round-trips; only the holder of the program private key can open | `grant-core-test` → *"seal→open round-trips the projection"*, *"a different private key cannot open the bundle"* | `sealGrantBundle`/`openGrantBundle`, `grantHkdfAes`, `GRANT_INFO` | — |
| The **consented scope** is cryptographically bound — a swapped scope manifest can't decrypt | `grant-core-test` → *"tampering the scope manifest breaks decryption"* | scope manifest in GCM additional-data | — |
| **Full-header AAD (v2):** every header field (grantId, archetype, institution, family, createdAt, expiresAt) is authenticated | `grant-core-test` → *"tampering expiresAt breaks decryption (no silent grant-extension)"* and the same for institution/archetype/family/createdAt/grantId | `canonicalGrantHeader` bound as AAD; `openGrantBundle` recomputes it from the bundle | — |
| In-flight `v:1` bundles still open (back-compat) | `grant-core-test` → *"a v1 (scope-only AAD) bundle still opens — back-compat preserved"* | version branch in `openGrantBundle` | Once all clients are upgraded, the v1 path can be retired. |

## 5. Privacy boundary of what gets shared

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| The reviewer (no-PHI) archetype carries a neutral label, not the care recipient's name | `security-fixes-test` → *"reviewer projection carries a neutral label, not the name"*; *"navigator (PHI-authorized) still carries the name"* | `projCareLabel` tied to the archetype `phi` flag | — |
| Exports honor scope (e.g. providers excluded when unchecked) and HTML output is XSS-escaped | `share-export-test` → *"FHIR: scope excludes providers when unchecked"*, *"HTML: patient name is XSS-escaped"* | FHIR builder + `_shEsc` | **`buildGrantProjection`'s self-report exclusion is verified by audit inspection, not a dedicated assertion** (the builder is an allow-list and never adds `selfReports`). Recommend adding one assertion that a built navigator projection contains no `selfReports`/incident free-text. |

## 6. Audit log integrity & durability

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| Tampering, interior deletion, and tail truncation of the hash-chained log are all detected | `audit-chain-test` → *"altered entry #5 detected as broken@5"*, *"deleted interior entry detected as broken"*, *"tail truncation detected via stored tip"* | `verifyAuditChain`, `canonicalAuditEntry`/`computeEntryHash`, dual tip anchors | This is **tamper-evidence, not prevention** — the suite states it (*"…confirms documented limit (evidence, not prevention)"*). Prevention for the family's own log would need external append-only anchoring; the institution's copy *is* WORM (§8). |
| The multi-year log survives backup/restore with the chain intact, and fails closed on corruption | `audit-backup-test` → *"restored chain verifies end-to-end"*, *"re-restoring the same backup is idempotent (keyed by id)"* | `_audit` block in backups, `getAuditBackup`/`restoreAuditBackup` | — |

## 7. Shared-scope audit chain (model B — what the institution sees)

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| The institution's chain contains **only sharing events** — private content never appears | `shared-audit-test` → *"no private content (SENTINEL) appears anywhere in the shared chains"*, *"shared chains contain ONLY shared-scope event types"* | `care-guardian-shared` store, `SHARED_TYPES`, `appendSharedAudit` | — |
| Private-activity **volume** is also invisible (seq counts only shared events) | `shared-audit-test` → *"grant A shared seq tops out at 4 = the 4 sharing events (the 4 private actions are invisible)"* | independent per-grant seq space | — |
| Per-institution isolation — one institution's chain reveals nothing about another | `shared-audit-test` → *"grant A's chain contains nothing about grant B (no cross-institution leak)"* | per-`grantId` chains | — |
| Verification distinguishes tampering vs. interior gap (compliance failure) vs. unconfirmed tail | `shared-audit-test` → *"a missing interior seq is flagged as a gap (compliance failure)"*, *"…flagged as truncated (unconfirmed, not tampering)"* | `verifySharedChain` (seq-gap checked before hash-link) | — |
| Over real HTTP, the reviewer pulls + verifies the chain; a poisoned entry surfaces as a gap, not silent loss | `shared-audit-integration-test` → *"reviewer lists+gets+opens the shared chain and it verifies OK over real HTTP"*, *"a poisoned shared-audit object surfaces as a missing-sequence gap (fail-closed)"* | `reviewerLoadSharedChain`, `pushSharedEntry` | Runs against the in-process reference server, not a real bucket (see §8 residual). |

## 8. Intake transport & the reference server (untrusted with plaintext)

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| Nothing is stored in plaintext — objects at rest are ciphertext only | `intake-integration-test` → *"stored objects on the server contain NO plaintext PHI (ciphertext only at rest)"*; same in `intake-core-test`, `intake-presigned-test` | E2E seal before transport | — |
| Capabilities are write-only and prefix-scoped; a write cap can't read, list, or write outside its prefix | `intake-core-test` → *"a WRITE cap cannot read"*, *"…cannot list"*, *"…cannot write outside its prefix"* | `caps` map + scope checks in `server.cjs` | — |
| One-time claim tokens; rotation invalidates an old write cap | `intake-core-test` → *"a one-time claim token cannot be reused"*, *"rotation invalidates the old write cap"* | claim `used` flag, `prefixEpoch` | — |
| Reviewer always reads the newest version; a poisoned newest object is skipped (fail-closed) | `intake-integration-test` → *"reviewer lists+gets+opens the NEWEST version over real HTTP"*, *"fail-closed: a poisoned object is skipped, last valid (v2) served"* | `reviewerOpenFromIntake` try/skip loop | — |
| Path traversal rejected; oversized objects rejected (413); CORS preflight works | `intake-integration-test` → *"a path-traversal key is rejected (400)"*, *"an oversized object is rejected (413)"*, *"CORS preflight returns 204…"* | `safeKey` + `filePath`, size cap, OPTIONS handler | — |
| **WORM:** an audit object can't be overwritten; first write wins | `intake-worm-revoke-test` → *"a rewrite of an existing audit object is refused (returned immutable)"*; over presigned too in `intake-presigned-test` | `isAuditKey`, first-write-wins on `audit/` | The reference enforces WORM **at the API**; production must back the audit prefix with **S3 Object Lock (compliance mode)** so the storage operator can't bypass it. |
| **Revocation:** a removed device is cut off (writes + re-claims 403); reads preserved; other prefixes unaffected | `intake-worm-revoke-test` → *"a revoked prefix cannot be re-claimed…"*, *"the revocations list reflects the reinstatement (empty)"* | `revoked` set, `isRevoked`, `/admin/revoke` | Revocation list is **in-memory** in the reference; production must persist it. |
| **Prefix normalization:** a slash-less prefix can't create sibling confusion (`fam/note` vs `fam/noteEVIL`) | `intake-worm-revoke-test` → *"a prefix minted without a trailing slash is normalized to end with '/'"*, *"a sibling prefix (fam/noteEVIL/) is refused"* | `normPrefix` | — |
| **Presigned backend** has the same containment + rejects expired/tampered/rotation-stale/post-revocation URLs | `intake-presigned-test` → *"sign-then-PUT/GET round-trips…"*, *"WORM holds over presigned…"*, plus the URL-rejection assertions | `/sign` + `/presigned` (HMAC), `INTAKE_BACKENDS.presigned` | The reference signs with an **in-process HMAC** — representative of the shape, not a specific cloud. Production must sign with the provider (S3/GCS presigned URLs or STS). |
| **Transport requires TLS** — an `http://` base (non-loopback) is refused everywhere a base enters | `security-fixes-test` → *"http to a remote host is REJECTED (would expose the capabilities)"*, *"non-http(s) scheme rejected"* | `intakeBaseOk` (gates enrollment parse, reviewer connect, live push) | — |
| **Constant-time admin compare** (no timing side-channel on the admin token) | *Not behaviorally testable* (returns the same 403 either way) — **verify by inspection**: `server.cjs` uses `ctEq` → `crypto.timingSafeEqual` for the admin token, matching the presigned-sig path. | `ctEq` | A reviewer should eyeball this rather than expect a test. |

## 9. Cloud sync, OAuth & PKCE

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| PKCE challenge derivation is correct (RFC 7636 known-answer) and uses S256 | `cloudsync-test` → *"PKCE S256 matches the RFC 7636 known-answer vector…"* | `newPkceVerifier`, `pkceChallengeFor` | — |
| Public-client flow carries **no client secret** (except Google's web client where required) | `cloudsync-test` → *"token-exchange body uses PKCE verifier and carries NO client secret (public client)"* | provider token-exchange builders | A `GOOGLE_CLIENT_SECRET` in an SPA is exposed-by-design; keep it empty unless using a confidential proxy. |
| Minimal scopes (Drive `drive.file`, OneDrive app-folder) — the app sees only files it creates | `cloudsync-test` → *"Drive requests drive.file (app sees only files it creates)"*, *"OneDrive requests the app-folder scope…"* | provider auth-URL builders | — |
| OAuth `state` round-trips intact (CSRF building block) | `cloudsync-test` → *"redirect_uri and state are correctly percent-encoded and round-trip"* | state gen + redirect handler | The **actual `state===` equality check** at redirect (CSRF enforcement) is code, not a `cloudsync-test` assertion — verify the redirect handler compares returned vs stored state and scrubs the code from the URL. |
| Refresh tokens are stored in the **encrypted vault**, not localStorage | *Verify by inspection*: `cloudAuth` lives in `data.settings` (encrypted at rest); the localStorage inventory holds only ciphertext/flags. | vault settings | — |

## 10. Data integrity & crash safety (durability, not confidentiality)

| Property | Demonstrated by | Mechanism | Residual |
|---|---|---|---|
| Hybrid logical clock orders multi-device edits deterministically | `hlc-test` → *"ALL HLC TESTS PASS"* | HLC (`cg-hlc`) | — |
| Write-ahead log is crash-safe (replay/idempotence under simulated failure) | `wal-core.cjs`, `wal-test.cjs`, `wal-sim.cjs` | WAL store | — |
| Merge import strips unsafe keys, bounds sizes, and never accepts a sync passcode or legacy passcodes from a file | *Verify by inspection*: `deepStripUnsafe` (drops `__proto__`/`constructor`/`prototype` recursively), `SAFE_TOP_KEYS` allow-list, 128 MB pre-decrypt cap, `sanitizeImportData` deletes `syncPasscode`/`caregiverPasscode`/`clientPasscode`. | `sanitizeImportData` | **Recommend adding a dedicated sanitize test** (prototype-pollution payload + oversized payload) — currently inspection-verified only. |

---

## What the tests do NOT cover (verify these manually / in a real environment)

1. **Real WebAuthn/PRF** — every MFA and reviewer-passkey suite simulates the PRF output as fixed bytes
   (Node has no authenticator). The *wrap math* is proven; the *authenticator round-trip* is not. Test on
   real devices: desktop Chrome/Edge and iOS platform passkeys are known-good; desktop Safari has WebKit
   PRF bugs; external YubiKeys do **not** work on iOS.
2. **Real cloud object storage** — the reference server signs presigned URLs with an in-process HMAC and
   keeps caps/claim-tokens/revocations in memory on local disk. Production must use a real store with
   provider-native presigning, **persisted** capability + revocation state, and **S3 Object Lock
   (compliance mode)** on the `audit/` prefix so WORM holds beneath the API.
3. **Live OAuth round-trip** — `cloudsync-test` is offline/structural (URLs, bodies, PKCE math). The actual
   redirect, token exchange, and refresh against Dropbox/OneDrive/Google need the provider apps registered
   (keys are currently empty) and a live test, including confirming the `state` equality check fires.
4. **Constant-time admin compare** and any other timing property — not behaviorally observable; confirm by
   reading the code (`ctEq`/`timingSafeEqual`).
5. **`buildGrantProjection` self-report exclusion** and **`sanitizeImportData` hardening** — currently
   audit-inspection-verified; both warrant a dedicated assertion (noted in §5 and §10).
6. **Service worker / PWA caching** — generated by VitePWA; not security-audited in depth here.
7. **Shipped-bundle ↔ source correspondence** — esbuild mangles locals and strips comments. Use the
   string-literal greps in "How to reproduce" to confirm the security-relevant code shipped; a thorough
   reviewer should diff a fresh `npx vite build` against the provided `dist/`.
8. **The meta-point** — none of this substitutes for a human reading the asymmetric grant layer
   (`sealGrantBundle`/`openGrantBundle`) and the recurring-egress path (`INTAKE_BACKENDS`,
   `pushSharedEntry`, `reviewerLoadSharedChain`) end to end. This guide is a map to make that reading
   targeted, not a replacement for it.

---

## Source quick-reference (grep these identifiers)

- **At-rest crypto:** `encryptData` / `decryptData` / `wrapDEK` / `unwrapDEK` / `KDF_ITER`
- **MFA:** `combineFactorKey` / `buildPasskeyWrap` / `unwrapWithPasskey` / `buildRecoveryWrap` / `mfaCarryClientWrap` (+ unlock gate `clientScope==="r" || !mfaOn`)
- **Reviewer keystore:** `buildReviewerVault` / `openReviewerVault` / `addReviewerPasskeyWrap` / `REVIEWER_VAULT_KEY`
- **Grant crypto:** `sealGrantBundle` / `openGrantBundle` / `canonicalGrantHeader` / `GRANT_INFO`
- **Audit chains:** `verifyAuditChain` / `canonicalAuditEntry` / `verifySharedChain` / `appendSharedAudit` / `pushSharedEntry`
- **Transport + privacy:** `INTAKE_BACKENDS` / `_ib` / `intakeBaseOk` / `buildGrantProjection` / `projCareLabel`
- **Deserialization:** `deepStripUnsafe` / `SAFE_TOP_KEYS` / `sanitizeImportData`
- **Reference server (`intake-server/server.cjs`):** `safeKey` / `filePath` / `ctEq` / `normPrefix` / `isAuditKey` / `isRevoked` / `/sign` / `/presigned`
- **OAuth/PKCE:** `newPkceVerifier` / `pkceChallengeFor` (+ redirect `state` check)

*Test count at time of writing: 24 suites green (21 `tests/*.mjs` + 3 WAL `*.cjs`). Re-run before relying on this guide; if a suite name or assertion has changed, the code is the source of truth.*
