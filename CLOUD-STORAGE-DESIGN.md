# Care Guardian — User-Owned Cloud Storage

**Status:** design for review. Nothing below is built yet.
**Supersedes:** the "zero egress by default" framing in the published Privacy Principles.

---

## 1. What this actually changes

Less than it first appears, and that is the point.

The circle already synchronises through a transport it **assumes is hostile**: the relay sees ciphertext sealed
under a symmetric circle key that never leaves the family's devices. Adding Google Drive or Dropbox does not
introduce a new trust assumption — it swaps one untrusted transport for another with better durability.

What genuinely changes:

| | Before | After |
|---|---|---|
| Where the record lives | This device, plus optional relay copies | This device **and** storage the admin owns |
| Who holds ciphertext | Nobody, unless a relay was configured | The admin's cloud provider |
| Who the storage knows | An anonymous relay prefix | **A named account** — see §8 |
| Setup | Local only; sync was an advanced extra | Storage is chosen during onboarding |
| Promise | "Nothing leaves the device" | "Nothing leaves without permission, and only as ciphertext" |

**The crypto does not change.** Everything already built — the circle key, pairwise rotation on device removal,
Argon2id remote join, device-keyed audit merge, HLC merge — carries over untouched.

---

## 2. Proposed northstar wording

David's phrasing: *"no data leaves the device without user permission."*

That is correct but concedes more than it needs to. Permission alone is a weak promise; users click through
consent screens constantly. The stronger claim, still true under this design:

> **No readable data ever leaves your device. Nothing leaves at all unless you choose where it goes.**

Two clauses, both verifiable: the provider gets ciphertext it cannot decrypt (structural), and egress requires an
explicit destination choice (procedural). **DECIDED — adopted.** This is now the wording for the Privacy Principles revision and for UI copy, alongside a
plain statement of what the provider *can* still infer (§8) rather than leaving it to be discovered.

---

## 3. The distinction the whole design rests on

Two jobs get conflated under "cloud storage." Keeping them apart resolves the teammate problem:

- **Transport** — how devices exchange updates with each other. Short-lived, small, many writers.
- **Durable store** — where the record lives for years. Long-lived, one owner, must survive device loss.

The admin's personal cloud is a superb **durable store** and a poor **transport**, because teammates cannot write
to it without holding the admin's credentials. Every bad version of this design comes from trying to make one
component do both.

---

## 4. Storage options

| Option | Teammates can write directly? | Setup burden | Notes |
|---|---|---|---|
| **Dropbox** (scoped app folder) | No | Low | PKCE public client with refresh tokens works cleanly. Best default. |
| **Google Drive** (`drive.file`) | No | Low–medium | Browser clients get short-lived tokens; expect periodic re-consent. Verify current OAuth verification requirements before shipping. |
| **OneDrive** (`Files.ReadWrite.AppFolder`) | No | Low–medium | SPA refresh tokens have a sliding window; same re-consent caveat. |
| **S3-compatible** (Backblaze B2, Wasabi, MinIO) | **Yes** — presigned per-device prefixes | Medium | The only consumer-reachable option giving true direct multi-device writes. Mirrors what `intake-server` already does with claim tokens and write caps. |
| **WebDAV / Nextcloud** | Depends | High | Needs CORS configuration. Appeals to privacy-minded and self-hosting users. |
| **iCloud** | — | — | No third-party web API. Not viable. |
| **Existing relay** | Yes | Low | Stays as the default transport. |

---

## 5. Admin onboarding flow

Inserted after passcode creation, before any real data exists.

1. **"Where should these records live?"** Three cards, plain language:
   - *Just this device* — nothing ever leaves. (Still fully supported; never coerce.)
   - *This device and my cloud* — recommended; names the providers.
   - *This device and a server my organisation runs* — relay or S3; for institutional deployments.
2. **Connect** — OAuth in a popup, app-folder scope only. The consent screen says the app can see only its own
   folder, which is true and worth showing them.
3. **Verify the round trip** — write a canary object, read it back, decrypt it, delete it. Report success or the
   specific failure. *Rationale: storage that fails must fail at setup, not silently at 3am during a crisis.*
4. **Recovery kit — mandatory, before there is data worth losing.** See §7.
5. **Confirmation** telling them what just became true: their records are on this device and in *their* Dropbox,
   encrypted; the provider cannot read them; they can change or disconnect this at any time.

Steps 3 and 4 are the ones that will feel like friction and must not be cut. Everything else is a happy path.

---

## 6. Teammates without their own storage

Three models considered:

**(a) Relay transport, admin's cloud as durable store — RECOMMENDED for consumer use.**
Teammates join the circle exactly as they do today and sync through the relay. The admin's device mirrors merged
state to the admin's cloud. Teammates need no account, no storage, no configuration. The admin's cloud is the
authoritative long-term copy.
*Cost:* the cloud copy is only as fresh as the last time an admin device synced. Mitigate by mirroring on every
sync and showing "cloud copy last updated …" prominently.

**(b) Admin-minted capability URLs — for S3-compatible storage.**
The admin mints a presigned, expiring, prefix-scoped write capability per device — precisely the model
`intake-server` already implements. Teammates write straight to the admin's bucket with no relay and no account.
*Cost:* only works with S3-compatible storage; presigned URLs expire and need renewal via the admin.

**(c) Sharing the admin's OAuth token — REJECTED.**
Hands every teammate full read/write access to the admin's app folder, cannot be revoked per-device, and puts a
long-lived credential on devices the admin does not control. Named here only so it is not rediscovered later as a
shortcut.

**Recommendation:** ship (a) as the default, offer (b) for institutional deployments where the buyer already runs
object storage. Both leave the existing circle join flow untouched.

---

## 7. Keys, and the warning that must not be soft-pedalled

The provider stores ciphertext sealed under the circle key. **The provider never holds the key**, so:

> **Connecting cloud storage does not give you account recovery.** If every device in the circle is lost and the
> recovery kit is gone, the cloud copy is undecryptable. It is a backup of a locked box, not a spare key.

Every user will assume otherwise, because every other cloud service they use works the other way. This must be
stated at connection time, in the recovery kit, and again in the disconnect flow — not buried in Help.

Consequences to build:
- Recovery kit generation becomes **mandatory** in the admin onboarding flow, not an optional later step.
- Circle key rotation (already built) must re-seal or epoch cloud objects, or old objects become unreadable —
  write new-epoch objects and garbage-collect old ones after all devices confirm.

---

## 8. What the provider can still see

Honest accounting, to be published rather than discovered:

- **Identity.** Unlike the anonymous relay, Google or Dropbox knows exactly who the account holder is. Encrypted
  care records in a named person's Drive is itself a signal. This is a genuine privacy regression versus the relay
  and should be stated when offering the choice.
- **Metadata.** Object names, sizes, counts, and modification times. Write frequency reveals activity patterns —
  a burst at 3am is information.
- **Not contents.** Never the plaintext.

**Built in Phase 5:** HMAC-derived object names (nothing readable in a path), a flat folder (the directory tree
was itself a disclosure), and size padding into proportional buckets. **Not built:** write batching. The outbox
already coalesces repeated writes to the same key, so what remains is timing correlation — a 3am upload still
says someone was awake at 3am. Deferred deliberately rather than half-solved; it needs a scheduling delay, which
trades against the durability the whole feature exists for.

---

## 9. Layout on the provider

Mirror the circle's proven shape. **Per-device objects, never one shared blob** — a single blob means
last-write-wins at file granularity, which silently discards a teammate's work.

```
/CareGuardian/
  circle/{circleId}/{deviceId}/state.enc     # per-device sealed state
  circle/{circleId}/rotation/latest.enc      # key-rotation object
  archive/{yyyy-mm}/audit-{deviceId}.enc     # append-only audit segments
  blobs/{blobId}.enc                         # media, already externalised
  manifest.enc                               # index: epoch, devices, object list
```

---

## 10. Failure modes to design for explicitly

Each needs a defined behaviour, because the default (silent stall) is the dangerous one:

| Failure | Required behaviour |
|---|---|
| Token expired / consent revoked | Degrade to local-only, banner, one-tap reconnect. **Never block saving.** |
| Quota exhausted | Warn early at 80%; stop uploading, keep recording locally. |
| Provider outage | Retry with backoff; surface "cloud copy is N days old". |
| User deletes the folder | Detect missing manifest; offer re-upload from local vault. |
| Partial upload | Objects written atomically; manifest updated last. |
| Two admins connect different clouds | Detect at circle sync; require an explicit choice of one. |

---

## 11. Security debts — RESOLVED

Both items found while grounding this plan are now fixed, tested, and shipped.

1. ~~**`GOOGLE_CLIENT_SECRET` in the source.**~~ **RESOLVED — see `GOOGLE-DRIVE-DESIGN.md`, which supersedes the
   removal decision recorded below.** Google Drive is back, via the Google Identity Services token model, which
   needs no client secret. The original removal reasoning follows, and remains correct about the constraint: Google's token endpoint requires a `client_secret` for "Web application" clients *even under PKCE*,
   and a secret in a browser bundle is readable by anyone. The constant is gone, no token request attaches a
   secret, and the provider is marked `unavailable` with the reason shown in the UI rather than silently hidden.
   Dropbox and OneDrive are true PKCE public clients and need no secret — they remain the supported pair.
   *Restoring Google later:* session-only tokens via Google Identity Services (no refresh token, reconnect each
   session), or a token-exchange endpoint an institution runs for its own deployment.

2. ~~**Tokens must join the export strip-list.**~~ **RESOLVED, and it was live.** `settings.cloudAuth` holds
   `{provider, refreshToken, account}`; it was riding both the circle sync payload (to every teammate device) and
   `.care` exports. Now handled by `stripPortableSecrets()`.

3. ~~**`.care` exports still contain `circle.key`.**~~ **RESOLVED — decided: strip it.** Import already discarded
   the circle key, the relay capabilities and the device private key, so keeping them in the file at rest was pure
   downside: a portable backup that is meant to be stored and shared carried secrets nobody used. All three are
   now stripped at export. Circle **identity and epoch survive**, so a restored device knows which circle to
   re-join; it re-pairs and mints a fresh device key, which was always the intended recovery path. Verified
   against the existing round-trip suites (share-export, cloudsync, blob-roundtrip, circle-sync, audit-backup).

4. **Every upload writes to the HIPAA audit trail** — egress is exactly what an audit trail is for. *Still to
   build, in Phase 1.*

## 12. Testability

Same discipline as everything else: define a `StorageProvider` interface (`put`, `get`, `list`, `delete`,
`quota`) and implement a local in-memory fake. All merge, epoch, failure-mode and layout logic then tests
headlessly against the fake, with real functions extracted from `src/App.jsx`.

OAuth itself cannot be tested in the container — same category as WebAuthn/PRF and camera capture. It joins the
device-QA list, per provider.

---

## 13. Phases

| Phase | Content | Rough effort |
|---|---|---|
| **0** | ~~Clear §11 security debts; add `StorageProvider` interface + fake; tests~~ **DONE** — `storage-layer-test.mjs`, 45 green | — |
| **1** | ~~Promote cloud sync to primary store~~ **DONE** — outbox in the sync path, per-device objects, manifest index, epoch tracking, audit on upload, staleness surfaced. `manifest-test.mjs`, 48 green. | — |
| **2** | ~~Admin onboarding: storage choice, connect, verify round-trip, mandatory recovery kit~~ **DONE** — `storage-onboarding-test.mjs`, 49 green | — |
| **3** | Teammate model (a): admin device mirrors merged state; "cloud copy last updated" surfacing | Small–medium |
| **4** | ~~Failure-mode handling per §10, quota warnings, reconnect flow~~ **DONE** — `storage-failure-test.mjs`, 50 green | — |
| **5** | ~~Metadata mitigations: opaque names, padding, batched writes~~ **DONE (names + padding)** — `storage-metadata-test.mjs`, 51 green. Batched writes deferred: the outbox already coalesces by key, so timing correlation is the only residue. | — |
| **6** | Optional: S3-compatible provider with presigned per-device prefixes (model b) | Medium |
| **7** | Privacy Principles revision; Help content; device QA per provider | Small, but gating |

Phases 0–3 are the coherent first release. Phase 7 gates any public claim.

---

## 14. Locked decisions

Settled by David; treat as fixed unless explicitly revisited.

1. **A brand-new admin who skips the storage choice gets local-only**, with a persistent nudge. Egress is never
   the path of least resistance.
2. **Local-only is a first-class, permanently supported mode** — not a degraded state and not a migration step.
   Some institutional buyers and some at-risk users will require it.
3. **One storage provider per circle**, chosen by the founding admin. Two clouds in one circle is a merge problem
   with no good answer.
4. **The relay remains the default transport.** The admin's cloud is the durable store, not the exchange
   mechanism — see §3 and §6(a). S3-compatible direct writes stay an institutional option.
5. **Seven days** without a successful cloud write is the threshold at which the user is told the cloud copy is
   stale.
6. **Northstar wording:** *No readable data ever leaves your device, and nothing leaves at all unless you choose
   where it goes.* Structural claim plus procedural claim, both verifiable.
7. **The recovery kit is a hard gate for admins who connect cloud storage** — not skippable. Local-only admins may
   skip it. Rationale: connecting cloud makes people feel protected, which is precisely when they skip a backup
   step; if every device is later lost, the cloud copy is undecryptable and the record is gone permanently. One
   screen of friction against irreversible loss.
8. **Uploads are automatic once storage is connected**, with a visible indicator and an off switch. *Refined by
   `GOOGLE-DRIVE-DESIGN.md`: "automatic" means the outbox drains whenever storage is available. For persistent
   providers that is invisible; for Google Drive it is invisible while the app is open and one tap on return.* A caregiver at
   2am will not remember to press sync, and a backup contingent on someone's discipline is not a backup. The
   consent is the act of connecting; silence afterwards would be the surprising behaviour.

## 15. Consequences of those decisions

- Onboarding must make local-only a genuine choice, not a skip. The nudge needs a defined cadence and a way to
  say "don't ask again" that is honoured.
- Because the relay stays the transport (4) and teammates need no storage, model §6(a) is confirmed as the build
  target and §6(b) is deferred to the institutional track.
- The 7-day staleness rule (5) needs a visible surface — a banner and a line in the storage panel — plus a
  definition of "successful write" that survives partial failures.
- One-provider-per-circle (3) needs a conflict check at circle sync: if a second admin connects a different
  provider, detect it and require an explicit choice rather than silently forking the record.
