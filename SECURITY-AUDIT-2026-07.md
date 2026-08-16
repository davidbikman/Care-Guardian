# Care Guardian — Security Audit

**Scope:** `dashboard.jsx`, 9,125 lines, entire application.
**Date:** 2026-07-30 · **Suite at completion:** 52 green
**Auditor's note on method:** this was a systematic sweep across vulnerability classes over the whole file,
combined with hand reading of the highest-risk code (the storage, sync, crypto, sharing and export paths). That
is not the same as one human reading every line with full context, and it should not be described as such. It
does not replace the standing requirement for an independent human security review before professional
deployment — several classes below (side channels, dependency supply chain, real-provider behaviour) cannot be
assessed from inside this environment at all.

---

## Summary

| Sev | Finding | Status |
|---|---|---|
| **High** | Storage manifest uploaded as plaintext — device names, sync times, object sizes | **Fixed** |
| **High** | `backupPasscode`, `syncServerApiKey`, `syncPasscode` travelled to teammates and into `.care` files | **Fixed** |
| Low | Four destructive functions gated only in the UI, not in the function | **Fixed** |
| Low | Identifiers minted with `Math.random()` | Accepted, documented |
| Info | Two unescaped interpolations in the print/share document | Verified non-exploitable |
| — | 9 classes swept clean | No action |

---

## Finding 1 — Plaintext storage manifest (High)

**What.** Phase 5 made object names opaque (HMAC-derived, no words, ids or dates in any path) and padded object
sizes into buckets. The manifest sitting beside them was uploaded as **plaintext JSON**:

```json
{ "circleId": "circle-7f3a", "epoch": 2,
  "devices": {
    "dev-a91f": { "key": "cg/Xk2p….bin", "updatedAt": "2026-07-30T21:14:02Z",
                  "label": "Mum's iPad", "epoch": 2, "bytes": 41880 },
    "dev-3c05": { "key": "cg/Qz8v….bin", "updatedAt": "2026-07-30T03:42:11Z",
                  "label": "David's phone", "epoch": 2, "bytes": 39104 } } }
```

**Why it matters.** Care records stayed encrypted throughout — this is not a break of record confidentiality. But
a storage provider could read, without decrypting anything: how many devices a household has, their
**human-chosen names**, exactly **when each one last synced** (a 3am write is information), and each object's
**true byte size**. The `bytes` field defeated the size padding built in the same phase, and the labels defeated
the opaque naming it sat beside. The two mitigations cancelled each other out through a file neither of them
covered.

**Root cause.** I wrote the naming and padding work and did not apply the same reasoning to the index that
describes it. Both changes were tested; neither test asked what the manifest itself discloses.

**Fix.** The manifest is now encrypted under the same passcode as the state objects, and padded. The `bytes`
field was removed entirely — nothing consumed it. A plaintext manifest from the previous build is still readable
(detected by shape), so existing cloud copies are not orphaned. A manifest that cannot be opened fails closed.

**Regression proof.** `manifest-privacy-test.mjs`.

---

## Finding 2 — Credentials in sync payloads and portable backups (High)

**What.** Three credentials are stored in the clear inside the vault and were riding both circle sync and `.care`
exports:

| Field | What it is |
|---|---|
| `settings.backupPasscode` | passcode protecting continuous backups |
| `settings.syncServerApiKey` | bearer key for a self-hosted sync server |
| `settings.syncPasscode` | the team sync secret |

**Why it matters.** Storage at rest is fine — the vault is encrypted. The problem is **travel**. An admin's
credential landed on every teammate device in the circle and inside every portable backup file. It could not be
revoked per-device, and it outlived removal from the circle: rotating the circle key stops future data reads but
does not invalidate a credential already delivered. This is the same class as the cloud OAuth refresh-token leak
found while planning cloud storage, which suggests the pattern rather than the instance is the real defect —
**any new secret-bearing field is leaked by default** unless someone remembers to add it to the strip list.

**Fix.** All three are now removed by `stripPortableSecrets()` and `circleStripForSync()`. Note the consequence:
a teammate must now be **told** the sync passcode rather than silently inheriting it. That is the correct
behaviour for a shared secret, and it is a small deliberate friction.

**Recommendation not yet implemented:** invert the default. Rather than a deny-list of secrets to strip, hold
credentials in a single `settings.secrets` sub-object that is stripped wholesale, so a future field is contained
unless someone explicitly opts it out. This is a refactor with real regression risk across sync, backup and
restore, and should be done deliberately rather than at the end of an audit.

**Regression proof.** `cloud-token-leak-test.mjs`, extended to all three fields plus their values.

---

## Finding 3 — Authorization gates present only in the UI (Low)

`removeCustomSub`, `removeSub`, `deleteContactNote` and `removePlanStep` were reachable without a permission
check inside the function. All four were correctly hidden in the UI (`!isClient` or `can("remove-subtask")`), and
ten comparable functions did check internally — so this was an inconsistency rather than an open door, and the
realistic attacker is a care recipient using the browser console against their own records. Fixed for
consistency: each now re-checks.

---

## Finding 4 — Identifiers from `Math.random()` (Low, accepted)

Seven sites mint identifiers with `Math.random()`: device ids, blob ids, team ids, grant ids, an ICS UID
fallback, and a MIME boundary. None is a secret or a capability.

The one worth stating explicitly is `grantId`, because it **feeds an HKDF salt** (`grantId + "|" + pushNonce`).
That is safe: confidentiality rests on the ECDH shared secret, and the salt already carries a 96-bit
cryptographic nonce — an HKDF salt need not be secret or unpredictable. The residual risk is **collision**, not
prediction: a device-id collision would put two devices on the same storage object, which is exactly the
data-loss the per-device layout exists to prevent. At ~41 bits plus a timestamp this is not a realistic
occurrence for a family app.

**Accepted, not fixed.** Changing identifier generation touches audit-chain attribution and storage keys, and
carries more regression risk than the exposure justifies. Worth doing in a quiet moment with its own tests.

---

## Finding 5 — Unescaped interpolations in the share document (Informational)

`buildShareDoc()` output is written into a new window via `document.write()` from **our own origin**, so injected
script would run with access to origin storage. 26 interpolations; 24 escape through `_shEsc`. The two that do
not are `p.pct` and `p.recency`, both `Math.round()` results — **not exploitable**. `_shEsc` itself correctly
covers `& < > "`.

Escaping them anyway is cheap insurance against a future refactor changing what `getProgress()` returns. Left as
a recommendation rather than a change, since the current code is provably safe.

---

## Classes swept clean

| Class | Evidence |
|---|---|
| **Code execution** | No `eval`, no `Function` constructor, no string `setTimeout` |
| **DOM XSS** | 10 `dangerouslySetInnerHTML` sites, every one fed the static `CSS` constant; no `innerHTML`/`insertAdjacentHTML` |
| **Egress** | 30 `fetch` calls; every absolute URL is an OAuth/storage provider or a documented placeholder. No analytics, telemetry or beacons |
| **Randomness** | 34 `getRandomValues`; all key material, IVs, nonces and salts are cryptographic |
| **IV reuse** | Fresh 12-byte IV per encryption; no fixed or zero IVs |
| **KDF** | PBKDF2 600,000 iterations; Argon2id (12 MB, 3 passes) for the remote invite |
| **Prototype pollution** | Guards present on import paths; `__proto__` handled |
| **Input limits** | `MAX_FIELD_LEN`, `MAX_NOTE_LEN`, `MAX_ARRAY_LEN`, oversize-payload rejection on sync |
| **Audit trail** | 51 write sites; every export, share, upload and medication change is audited |
| **Client-voice protection** | Grant projection excludes `selfReports`; 56 client-scope checks |

---

## Cannot be assessed here

Stated so they are not mistaken for passes:

1. **Real provider behaviour** — no OAuth app is registered; nothing has touched Dropbox, Drive or OneDrive.
2. **Dependency supply chain** — `pdfjs-dist`, `hash-wasm`, `qrcode`, `jsqr` are trusted as shipped.
3. **Side channels** — timing, memory disclosure, and browser-level isolation.
4. **WebAuthn/PRF, camera capture, and `.ics` handoff** — device-only behaviour, already on the QA list.
5. **The cryptographic designs themselves** — reviewed for correct *use* of primitives, not for novel weaknesses
   in the circle key rotation, grant sealing or audit chain constructions. That is what the independent review is
   for, and `REVIEWER-SECURITY-GUIDE.md` maps each property to its named test.

---

## Recommendations, in priority order

1. **Invert the secret-handling default** (Finding 2) — a `settings.secrets` sub-object stripped wholesale. This
   is the single change that would have prevented both High findings and the earlier OAuth leak.
2. **Add a manifest-shape test to CI thinking**: any new field added to an uploaded object should have to justify
   itself against "what does the provider learn from this?"
3. Escape `p.pct` / `p.recency` (Finding 5).
4. Move identifier minting to `crypto.getRandomValues` (Finding 4) with its own regression test.
5. Register the OAuth apps so the provider-facing half of this system can finally be exercised.
