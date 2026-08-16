# Live Cloud-Intake Push — transport design for consent grants

**Status:** Design specification (no code this round). Extends `CONSENT-VISIBILITY-DESIGN.md` §9 (transport) and the OQ1 build now shipping.
**Goal:** replace v1's manual `.cgshare` hand-off with an automated push to **institution-controlled storage that holds only ciphertext**, reusing the existing cloud-provider seam, without giving Care Guardian a server and without quietly eroding the app's egress posture.

---

## 1. What changes from v1, and the one hard problem

v1 works like this: the family taps Grant, the app seals a bundle, and a `.cgshare` file downloads for the family to send the program by hand. That proves the loop but pushes the transport burden onto a human. Live intake makes the app deliver the sealed bundle to a place the program can read on its own schedule.

The hard problem is an **account asymmetry** that the existing transport does not face. Team Sync pushes to `cloudAuth` — the family's *own* Dropbox/OneDrive/Google account, via `prov.upload(accessToken, path, content)`, where the family holds the OAuth tokens. An institution's storage is a destination the family has **no account on and no token for**. We cannot point `cloudStorageSync()` at it. So the design needs a way for the family's app to write ciphertext into the *institution's* storage using a **capability the institution issues**, not an account the family holds — while still plugging into the same `upload(...)` seam so the rest of the machinery (the sealed bundle, `openGrantBundle`, the reviewer render, the audit log, the consent indicator) is reused unchanged.

A second change is quieter but more important to get right: **this is the first recurring egress in the app to a party other than the family's own cloud.** §10 treats that as a first-class design constraint, not a footnote.

---

## 2. What exists (accurately) and why it can't be reused as-is

The provider seam is two methods plus PKCE OAuth:

- `download(accessToken, path) → ciphertext string | null`
- `upload(accessToken, path, content) → true`
- OAuth: `cloudConnectStart` / `cloudCompleteAuth` (redirect PKCE, no secret except Google's web-client quirk), `ensureCloudAccessToken()` (refresh), refresh token stored encrypted in the vault as `data.settings.cloudAuth = {provider, refreshToken, account}`. Access token lives in `cloudTokenRef` (memory only).
- `cloudStorageSync()` drives push/pull against the family's account using those methods.

This is exactly the right *shape* to reuse — a put/get over an addressable path, content is a ciphertext string — but the `accessToken` argument assumes the family's own account. Institutional intake keeps the method shape and swaps what `auth` means.

---

## 3. The seam extension in one paragraph

Add an **Intake backend** type that mirrors the provider shape — `push(auth, objectName, ciphertext)`, optional `list(auth, prefix)` / `get(auth, objectName)` — but where `auth` is a **write-only, prefix-scoped capability** the institution issued, not a family OAuth token. A grant gains a `transport` config (separate from `cloudAuth`) carrying which intake backend and the capability. The family's push path is a near-clone of `cloudStorageSync`'s upload step: seal the bundle (already done), then `INTAKE_BACKENDS[t.backend].push(t.cap, objectName, JSON.stringify(bundle))`. The reviewer side reads with the **institution's own** storage credential (reviewer mode runs in the institution's trust domain). Write (family, scoped, no read) and read (institution) are cleanly separated.

---

## 4. Data plane vs. control plane (how "storage holds only ciphertext" stays true)

Two planes, deliberately separated:

- **Data plane — ciphertext object storage.** Holds only sealed bundles (`{…ephemeralPub, wrappedKey, iv, ciphertext}`), which are opaque without the program private key. This is the only place a family's data lands. A breach of the data plane *alone* yields ciphertext.
- **Control plane — capability issuance.** A minimal endpoint that mints/scopes write capabilities and runs the enrollment claim (§7). **It never receives a bundle and sees no PHI** — it deals only in tokens and prefixes. It can be a tiny function, or for object storage, just a presigned-URL minter.

"The institution's storage holds only ciphertext" means precisely: the data plane is ciphertext at rest, and **key custody is separable from storage** — the program private key lives in reviewer mode, not in the bucket. The honest claim is not "the institution can't read it" (it can — that's the grant), but "a compromise of the storage layer without the key yields nothing readable, and Care Guardian, the network, and other families never see plaintext."

---

## 5. Concrete intake backends

All implement the same `push(auth, objectName, ciphertext)` shape.

**(A) Presigned PUT to object storage — primary.** The institution runs an S3-compatible bucket. The control plane mints a **prefix-scoped, write-only** capability (an STS token scoped to `s3:PutObject` on `…/{familyPrefix}/*`, or per-object presigned PUT URLs). The family's `push` is a plain `fetch(url, {method:"PUT", body: ciphertext})` — no auth header when the signature is in the URL. Least custom logic; native write-only/prefix-scoped semantics; works from a browser. **Recommended first backend.**

**(B) Generic HTTPS intake endpoint — for institutions with their own infra.** `PUT {base}/intake/{writeToken}` with the ciphertext as the body; the endpoint maps the token to a family prefix and stores the object, enforcing write-only and prefix scope server-side. Same security properties; the institution owns the endpoint, so Care Guardian still ships no server.

**(C) Consumer cloud write-only links — convenience, with a caveat.** Dropbox *File Requests* and OneDrive *request-files* links are write-only upload targets into a folder the institution owns, reusing the existing Dropbox/OneDrive integration. Attractive because the institution needs only a cloud account — but programmatic (non-UI) upload to these links is **not a clean first-class API**, so treat this as a possible convenience path to validate, not the dependable primitive. Google Drive has no equivalent write-only-without-account link.

**Read side (reviewer mode).** The institution authenticates to its **own** storage — its bucket via its own keys, or its own endpoint's admin read — and `list`s the intake prefixes and `get`s objects. The family never reads; the institution never holds a family *write* credential beyond write-only.

---

## 6. Object & versioning model

Write **versioned, never overwrite**:

```
{familyPrefix}/{grantId}/{pushedAtMs}-{pushNonce}.cgshare      ← each push, immutable
```

- The reviewer `list`s `{familyPrefix}/{grantId}/`, takes the lexicographically/temporally **latest**, and `openGrantBundle`s it — **failing closed** on any object that doesn't decrypt or whose scope AAD doesn't verify (proven behavior), then falling back to the next-newest valid one. A poisoned or truncated object can't mask a good one.
- The object **key carries a push timestamp** (sortable) so the reviewer picks latest without decrypting every object. That timestamp is minor metadata (when a push happened); the bundle body stays fully opaque. Institutions wanting zero cleartext metadata can use opaque keys and let the reviewer decrypt to compare `projection.asOf` — a privacy/cost trade noted, not forced.
- **Retention:** the control plane (or a lifecycle rule) prunes superseded objects after N days. Revocation writes a **tombstone** object the family is permitted to write (`{grantId}/REVOKED-{ts}`) so the reviewer sees the stop even before the institution prunes.

Replay/staleness is assessed after decrypt via `projection.asOf` (already inside the ciphertext, set at push time). The reviewer shows "as of …" honestly and can flag "no fresh update in X days." An optional monotonic `seq` inside the bundle lets the reviewer reject an object older than one it has already shown.

---

## 7. Capability model & the enrollment handshake (the real new secret)

v1's enrollment package was **entirely public** (institution name, program public key, fingerprint) — nothing secret crossed any channel. Live push introduces a **write capability**, which *is* sensitive, so handle it deliberately:

- **Keep the enrollment code public.** It still carries only identity + public key + fingerprint + the intake **base** (backend type, region/URL) + a **one-time claim token**. The claim token is single-use and write-only-yielding; it grants nothing on its own.
- **First push performs a claim.** On the first grant push, the app calls the control plane's `claim(oneTimeToken, grantId)` → receives a **per-family, prefix-scoped, write-only** capability bound to `{familyPrefix}` (and ideally to this grant). Subsequent pushes reuse it. The claim is the only handshake; it transmits no PHI.
- **Blast radius of a leak is one family, write-only.** A stolen write capability lets an attacker write garbage *to that one family's prefix* — an availability/poisoning nuisance, defeated by versioning + fail-closed reads + rate limiting + rotation. It yields **no read** and touches **no other family**.
- **Rotation.** The institution can rotate a family's capability (and revoke the old) without re-running consent; the app re-claims on next push if its capability is rejected.

A lower-friction alternative — a long-lived per-family write token embedded directly in the enrollment code — is viable but makes the enrollment code itself secret-bearing; the claim handshake is preferred precisely to keep the shared code public.

---

## 8. Family push flow — tied to a user action, never a background daemon

To preserve the app's "only user-initiated transmission" principle, **pushes ride the family's existing sync action**, not a timer:

- When the family runs Team Sync (already a deliberate tap) or taps **"Send update now"** on a grant, the app rebuilds each active grant's projection from current data, seals a fresh bundle, and `push`es it via the grant's transport. No silent background transmission.
- **Auto-push is an explicit per-grant choice** made at consent time (§10): *"Send updates automatically when I sync"* vs *"Only when I choose."* Default is **manual** unless the family opts in — zero-surprise egress.
- **Offline / failure handling.** A push failure is non-fatal and queued: the next sync retries; the indicator shows "update pending." Idempotent — re-pushing the same state simply writes another versioned object (or is skipped if `projection` is unchanged since last push, by comparing a content hash).
- The payload is exactly the sealed bundle that already exists; nothing about the crypto changes.

---

## 9. Reviewer pull flow

Reviewer mode gains a **connected intake**: the institution enters its storage read credential once (its bucket keys / endpoint admin), stored in the reviewer install (with the same custody caveat as the program key — behind a reviewer passcode/OS keystore before real use). Then:

- **Roster.** `list` the intake root → a list of families/grants with last-push time (from object keys). One screen, no manual file juggling.
- **Open.** Selecting a family `get`s the latest valid object and runs the **existing** `openGrantBundle` + `renderReviewerProjection`, with the manifest stated on screen ("seeing …" / "Not shared …") and an "as of `projection.asOf`" / staleness flag.
- Manual `.cgshare` paste (v1) stays available as a fallback and for institutions not running intake.

---

## 10. Consent UX & the privacy-posture shift (treated as first-class)

Live push trades a little of the app's "nothing leaves unless I explicitly export it" purity for convenience. That trade is acceptable only if it is **chosen, visible, and reversible**:

- **The consent screen changes for auto-push.** Where v1 said "the program sees your information as of the last file you send," auto-push says plainly: *"Care Guardian will send an encrypted update to {institution} each time you sync. It's encrypted so only they can open it. You can switch this off anytime."* The family explicitly picks auto vs. manual.
- **The standing indicator** (already atop Settings while a grant is active) gains a last-pushed time and a clear "updates are sent automatically" / "you send updates manually" state, plus "Send now" and "Switch to manual."
- **Audit.** Every push is already `grant.pushed`; the indicator and a per-grant "what's been sent and when" view make it legible.
- **The conservative path stays.** For families who want nothing to leave without an explicit act, **manual `.cgshare` export remains a first-class choice** — auto-push is an option, not a migration. This keeps the default posture intact and lets the feature serve both kinds of family.

This honesty is the point: we are adding recurring egress to a third party, and the mitigations are (1) it fires on a user-initiated sync, not silently; (2) it is opt-in per grant; (3) it is end-to-end ciphertext; (4) it is one tap to stop; (5) the manual alternative never goes away.

---

## 11. Trust model & security analysis

- **Confidentiality.** End-to-end: only the program private key opens a bundle. Care Guardian, the network, the storage operator (absent the key), and other families see only ciphertext. Storage breach *alone* → nothing readable (key custody is separate, §4).
- **Authenticity / integrity.** The reviewer fails closed on anything not sealed to the program public key with a verifying scope AAD (already proven in `grant-core-test.mjs`). Forged or poisoned objects do not decrypt; they cannot impersonate a real update.
- **Availability / poisoning.** A leaked **write-only** capability can at worst write garbage to one family's prefix. Defeated by versioning (the last good object survives), fail-closed reads (garbage is skipped), capability rotation, and endpoint rate-limiting. No read, no cross-family reach.
- **Replay / staleness.** `projection.asOf` (inside the ciphertext) plus an optional monotonic `seq` let the reviewer show the true age and reject stale/replayed objects; the family controls pushes, so newest-valid wins.
- **Revocation.** The family switches auto-push off / revokes (pushes stop immediately), writes a tombstone, and the institution can revoke the capability and prune objects. **Unchanged honest residual:** a bundle the program already pulled and cached cannot be retracted — stated in the revoke UX, as today.
- **The new secret.** The write capability is the one genuinely new piece of sensitive material; §7 keeps it per-family, write-only, claim-gated, and rotatable so its exposure is bounded and recoverable.

---

## 12. Reused vs. new

**Reused unchanged:** the sealed bundle and all grant crypto; `openGrantBundle` and `renderReviewerProjection`; the provider method *shape* (`upload`/`download` ↔ `push`/`get`); the user-initiated sync moment as the trigger; the consent indicator and audit log; the manual `.cgshare` fallback.

**New:** the `INTAKE_BACKENDS` map (presigned-object primary; HTTPS endpoint; consumer-link convenience) implementing `push`/`list`/`get` against institution storage with a capability instead of a family OAuth token; a per-grant `transport` config + the claim handshake; reviewer-mode "connected intake" (read credential, roster, pull); the per-grant auto-push toggle and the consent-language change. The surface is concentrated in transport — the crypto, the projection, and the consent model are untouched.

---

## 13. Proof plan (isolated, before any integration — standing rule)

Against a **mock intake store** (an in-memory map standing in for the bucket/endpoint), prove:

1. **Data plane sees only ciphertext** — what `push` writes is exactly the sealed bundle; a sentinel plaintext from the source data never appears in any stored object.
2. **Write-only + prefix scope enforced** — a family capability can `push` to its own prefix and **cannot** `get`/`list` or write another prefix (the mock enforces the capability semantics the real backends must).
3. **Versioning + latest-valid selection** — multiple pushes produce ordered objects; the reviewer picks the newest **valid** one and, when the newest is poisoned/truncated, falls back to the next valid (fail-closed), never surfacing garbage.
4. **Replay/staleness** — an older `seq`/`asOf` object is recognized as stale and not shown over a newer one.
5. **Idempotent re-push** — re-pushing unchanged state is a no-op or a harmless new version, never corruption.
6. **Claim handshake** — a one-time token yields exactly one write-only capability and cannot be reused or escalated to read; rotation invalidates the old capability.

The crypto is already proven; this round proves the *transport's* containment properties without touching it.

> **Status (built):** all of the above are now proven, and the HTTPS network path is exercised end-to-end. `tests/intake-core-test.mjs` proves the containment logic against a mock store; `tests/intake-integration-test.mjs` then drives the app's **real** `INTAKE_BACKENDS.https` client (extracted verbatim from the build) against a runnable reference endpoint (`intake-server/server.cjs`) over real HTTP — claim/push/list/get round-trips, ciphertext-only at rest, fail-closed selection, every capability negative, size caps, traversal rejection, CORS, and rotation. The integration test caught a real bug the mock could not: object names built from the base64 `pushNonce` contained URL/key-invalid characters (`+`, `/`, `=`), now fixed in `intakeObjectName`. Still unexercised: the **presigned** backend's sign-then-PUT round-trip against a real bucket.

**The asymmetric layer plus this new egress path remain part of the standing full human security review before any institutional deployment.**

---

## 14. Phasing

- **v2a (recommended first):** presigned-object backend (A) + claim handshake + family push-on-sync (manual default, auto-push opt-in) + reviewer connected-intake roster/pull. Isolated proofs per §13. Manual `.cgshare` stays.
- **v2b:** generic HTTPS endpoint (B) for institutions running their own infra.
- **Later / validate:** consumer write-only links (C) if a pilot wants zero infra and the programmatic-upload caveat clears.
