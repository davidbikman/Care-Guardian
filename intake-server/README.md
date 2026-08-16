# Care Guardian — reference intake endpoint

This is the **institution's side** of live cloud-intake (see `TRANSPORT-INTAKE-DESIGN.md`). The family's app pushes encrypted, scope-limited bundles to it; the institution's reviewer pulls and decrypts them. **The endpoint holds ciphertext only — it never has a program key and cannot read a family's data.** It is a *reference*: the wire contract is the contract; swap the internals for production-grade storage.

## Run it

```bash
ADMIN_TOKEN=$(openssl rand -base64 24) \
ALLOW_ORIGIN=https://your-careguardian-app.example \
PORT=8788 \
node intake-server/server.cjs
```

- `ADMIN_TOKEN` — required to mint claim tokens / read caps / rotate. If unset, the admin endpoints are disabled (fail-safe).
- `ALLOW_ORIGIN` — set to your app's exact origin in production (defaults to `*`, which is fine only for local testing).
- `STORAGE_DIR` — where ciphertext objects are written (defaults to `intake-server/storage`).
- Put it behind TLS (a reverse proxy is fine). The app talks to it as `https://…`.

## Wire one family to it

1. **Mint a one-time claim token** bound to that family's prefix:
   ```bash
   curl -sX POST $BASE/admin/claim-token -H "X-Admin-Token: $ADMIN_TOKEN" \
     -H 'Content-Type: application/json' -d '{"prefix":"fam/mrsR/g1/"}'
   # → {"token":"clm_…","prefix":"fam/mrsR/g1/"}
   ```
2. **Put the intake config into the family's enrollment code** — the JSON the family pastes when granting a view now carries an `intake` block:
   ```json
   {"t":"cg-enroll","inst":"Willamette Vital Health","arch":"navigator",
    "pub":"<program public key>","fp":"<fingerprint>","exp":180,
    "intake":{"backend":"https","base":"https://intake.your-org.example","claim":"clm_…"}}
   ```
   With `intake` present, the family's consent screen offers automatic sending (now the default) and, on grant, the app claims a write-only capability and pushes the first encrypted update.

## Wire your reviewer to it

Mint a **read capability** for a prefix your reviewer should see (root `""` = all families):
```bash
curl -sX POST $BASE/admin/read-cap -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"prefix":""}'
# → {"readCap":"cap_…","prefix":""}
```
In the app's **reviewer mode → Connected intake**, enter the base URL and that read credential. "Refresh shared views" lists the families who granted a view; Open pulls and decrypts the latest valid update. The read credential stays on the reviewer's device.

## Other admin

- **Rotate** a family's write capability (invalidates the old one; the app re-claims on its next push if you also issue a fresh claim token):
  ```bash
  curl -sX POST $BASE/admin/rotate -H "X-Admin-Token: $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' -d '{"prefix":"fam/mrsR/g1/"}'
  ```
- **Stopping a device.** When a family stops sharing, the app streams a `grant.revoked` entry into the institution's Shared-activity record. To cut off a *removed device's* write capability at the endpoint (it keeps the cap until you do), the institution's roster system calls the admin **roster action** below — `POST /admin/revoke {prefix}`. See "WORM + revocation" for the full workflow.

## Wire contract (for a production reimplementation)

```
POST /claim             {token, grantId}        -> {prefix, writeCap}
PUT  /o/{prefix}{name}  Bearer <writeCap>  body -> {ok}        (write-only, prefix-scoped, epoch-checked)
GET  /o/{prefix}?list=1 Bearer <readCap>        -> [keys...]   (read, prefix-scoped)
GET  /o/{key}           Bearer <readCap>        -> ciphertext  (read, prefix-scoped)
OPTIONS *                                        -> 204 + CORS  (browser preflight)

# admin (X-Admin-Token) — control plane / roster actions
POST /admin/claim-token {prefix}                 -> {token}     (mint a family's one-time claim token)
POST /admin/read-cap    {prefix}                 -> {readCap}   (mint a reviewer read capability)
POST /admin/rotate      {prefix}                 -> {epoch}     (invalidate current write caps under prefix)
POST /admin/revoke      {prefix}                 -> {revoked}   (roster action: hard-block writes + re-claims)
POST /admin/reinstate   {prefix}                 -> {revoked}   (undo a revocation)
GET  /admin/revocations                          -> {revoked:[]}(list revoked prefixes)

# presigned backend (sign-then-PUT/GET; the signature authorizes /presigned, no bearer there)
POST /sign       Bearer <cap>  {key, method}      -> {url}        (mint a short-lived signed URL; PUT needs a write cap, GET a read cap)
PUT  /presigned?key=&m=PUT&exp=&ep=&pf=&sig= body -> {ok}         (honored only if the signature, expiry, and epoch check out)
GET  /presigned?key=&m=GET&exp=&sig=              -> ciphertext   (honored only if the signature + expiry check out)
GET  /list?prefix=             Bearer <readCap>   -> [keys...]    (presigned backend's list; same scoping as /o/?list=1)
```

The reference enforces these properties server-side and they are covered by `tests/intake-integration-test.mjs`, which drives the app's **real** transport client against this server over HTTP: ciphertext-only at rest, write-only/prefix scope, fail-closed reads, one-time claims, size caps, traversal rejection, CORS, and rotation.

## WORM (object-lock) + revocation

**Write-once on the `audit/` subfolder.** Objects whose key contains an `audit/` segment are immutable: the first write wins, and any later PUT to that key is refused — the original is preserved and the API returns `{ok:true, immutable:true}`. This makes the institution's copy of a family's shared-audit chain tamper-*resistant*, not just tamper-evident. The app names audit objects deterministically per sequence (`{grantPrefix}audit/000000007.cgaudit`), so an honest re-push during sync is an idempotent no-op and a rewrite attempt has no effect. WORM is scoped to `audit/` only; projection snapshots remain overwritable.

> The reference enforces write-once **at the API**. It cannot stop someone with direct disk/bucket access. For a real deployment, back the audit prefix with **S3 Object Lock in compliance mode** (or your store's equivalent) with a retention period, so not even the storage operator can alter or delete an entry before retention expires.

**Revocation as a roster action.** A removed caregiver's device keeps its (write-only, prefix-scoped) capability until you cut it off here. `POST /admin/revoke {prefix}` hard-blocks that prefix: writes return 403 **even with a still-valid capability**, and the prefix **cannot be re-claimed**. Revocation blocks *writes only* — you keep full read access to the record already collected — and is scoped to the named prefix, so other families are unaffected. End-to-end: family stops sharing in the app → `grant.revoked` appears in the Shared-activity record → your roster system calls `/admin/revoke` for that grant's prefix. The family never holds the admin token; revocation is your action on your endpoint. Persist the revocation list in production (it is in-memory in the reference).

Covered by `tests/intake-worm-revoke-test.mjs` against this server over HTTP: original preserved after a tampering PUT, idempotent re-push, non-audit objects still mutable, revoked writes/re-claims 403, reads preserved, scoping, reinstatement, admin-auth required.

## Presigned backend (sign-then-PUT/GET)

The app's `presigned` backend never PUTs the body to this server directly. It first calls `POST /sign {key, method}` with its capability, gets back a short-lived signed URL, then PUTs (or GETs) the body to **that** URL with no auth header — the signature *is* the authorization, exactly like an S3 presigned URL. The reference implements `/sign` (which applies the same write-only / prefix-scope / epoch / revocation / traversal checks as `/o/` before minting) and `/presigned` (which honors a URL only if its HMAC signature, expiry, and prefix-epoch all check out, and still enforces WORM on the `audit/` subfolder). `tests/intake-presigned-test.mjs` drives the app's real presigned client against these over HTTP: round-trip, ciphertext-only at rest, the signing-time authority checks, one-time claim, WORM, and rejection of expired / tampered / rotation-stale / post-revocation URLs.

> The reference signs with an in-process HMAC — representative of the *shape*, not a specific cloud. In production, mint these with your provider's own signer (S3/GCS presigned URLs, or STS-scoped credentials) so signing, expiry, and prefix-scoping are enforced by the storage layer itself.

## Production checklist

- Back **capabilities + claim tokens** with a real store (Redis/DB), not process memory. Persist the **revocation list** the same way.
- Back **objects** with real object storage (S3/GCS) + lifecycle rules to prune superseded versions; or use the `presigned` backend (sign-then-PUT) instead of proxying bodies. Put the **audit prefix under Object Lock (compliance mode)** with a retention period so the write-once guarantee holds below the API too.
- **TLS**, a locked `ALLOW_ORIGIN`, and per-capability **rate limiting** (mitigates write-cap-leak poisoning).
- Treat the write capability as a per-family, write-only, rotatable secret (it is). The enrollment code carrying the one-time claim token should be delivered to the family, not posted publicly.
