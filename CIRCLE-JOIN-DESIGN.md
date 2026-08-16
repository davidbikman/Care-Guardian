# Circle Key & Join Flow — design sketch (pre-implementation)

**Status:** design only, nothing built. Purpose is to make the security poke-able before code.
**Decision baseline (from you):** central case is 1–2 primary caregivers across multiple devices; shifts,
not concurrent edits; auto-distribution **default-on** with easy opt-out; the teammate↔institution distinction
is preserved. So this is *personal multi-device sync for a tiny fully-trusted circle*, not team collaboration.

---

## 1. What a "circle" is

A **circle** is a set of devices and at most one or two caregivers that all hold **one shared symmetric key**
and therefore all see the **full** vault. It is the trust-inside boundary. Contrast with an **institution**,
which holds an *asymmetric* per-recipient key and only ever sees a *scoped projection*. Those two never mix —
different key, different code path, different menu surface. This document is only about the circle side.

## 2. The circle key

- **What:** a random **256-bit** key (`circleKey`), generated with `crypto.getRandomValues` on the device that
  creates the circle. It is the symmetric key the sync package is encrypted under (directly, or as the wrap over
  a per-sync content key — implementation detail, not security-relevant here).
- **Where it lives:** inside the existing **encrypted vault** (the same place `cloudAuth` lives today — sealed
  under the device DEK, never in localStorage in the clear). It is **never** written to the relay unwrapped.
- **What it replaces:** the typed `syncPasscode`. That was a human-chosen, brute-forceable string that *also*
  had to be shared out-of-band — so it had the cost of key distribution with the weakness of a passphrase.
  A distributed random 256-bit key is strictly stronger and removes a foot-gun.
- **What it protects:** confidentiality of the synced full vault against the relay and the network. The relay
  is assumed **honest-but-curious**: it stores and serves ciphertext, enforces capability scope + revocation,
  and **never holds the key**.

The whole security problem reduces to one thing: **getting `circleKey` onto a new device without leaking it.**
Everything below is about that handoff.

### 2.1 Device roster & per-device keys

To make member **removal** cryptographic rather than access-control-only (see §5), each device generates a
**persistent device keypair** at join time — `d_priv` never leaves the device's vault, `d_pub` is published to a
flat **circle roster** kept inside the `circleKey`-encrypted vault: `{deviceId, d_pub, label, addedAt, approvedBy}`.
No CA, no signing hierarchy, no scoping — just a list of member public keys. These keys are used **only to
transport and rotate the symmetric `circleKey`**; the vault data itself is always encrypted once under
`circleKey`, full and identical for every device. This is the standard "group key + per-member key-wrapping
channel" pattern (a stripped-down MLS / sender-keys), and it is the minimum needed for honest removal: a member
who holds the shared key cannot be cut off by access control alone.

> **Tradeoff worth seeing plainly:** "purely symmetric" and "cryptographically real member removal" cannot both
> hold, because a removed member still has the shared key. Auto-rotate-on-removal (your choice) therefore buys a
> small, bounded amount of asymmetric key material on the circle side. This is *not* the per-recipient data
> sealing used for institutions — the data stays symmetric; only the key delivery is per-device.

---

## 3. QR-first join — the DEFAULT (in person, own devices)

Use when the same person is adding their own second/third device (phone, tablet, laptop) and can hold both.
**The in-person screen defaults to the two-scan flow**; it offers a labeled "Use the weaker one-scan method"
link and a **"Switch to Remote setup →" button** that hands off to §4 for a co-caregiver who isn't present.

**Default protocol: mutual ECDH over two QR scans, with a 6-digit SAS confirmation.**
The key insight: the QR codes carry only **ephemeral public keys and ciphertext** — never the shared secret and
never the circle key in a readable form — so photographing either screen leaks nothing useful. Each device's
ephemeral *private* key never leaves that device.

```
  Device B (joining)                          Device A (already in circle)
  ──────────────────                          ────────────────────────────
  generate ephemeral keypair eB (P-256/X25519)
  show QR#1 = eB.pub        ──────scan──────▶  read eB.pub
                                               generate ephemeral keypair eA
                                               ss   = ECDH(eA.priv, eB.pub)
                                               k    = HKDF(ss, salt, "cg-circle-pair-v1")
                                               wrap = AES-256-GCM(circleKey, aad=transcript) under k
                                               sas  = 6 digits ⟵ HKDF(ss, "cg-sas")
  read eA.pub ‖ wrap        ◀─────scan───────  show QR#2 = eA.pub ‖ wrap ‖ salt
  ss  = ECDH(eB.priv, eA.pub)
  k   = HKDF(ss, salt, "cg-circle-pair-v1")
  sas = 6 digits ⟵ HKDF(ss, "cg-sas")
        ╰── both screens display the SAME 6 digits → user confirms match ──╮
                                                                           ▼
  circleKey = AES-256-GCM-open(wrap) under k          (mismatch ⟶ abort, key never released)
  B claims its own relay prefix, pulls siblings, converges via HLC
```

- **Single-use + short expiry:** each pairing session is consumed on first success and expires in ~2 minutes;
  the ephemeral keys are discarded afterward. A stale or re-shown QR is inert.
- **Why the SAS:** for a direct optical channel the realistic risk isn't a man-in-the-middle (there's no relay
  between two phones), it's a *swapped* QR or a malicious scanner app. The 6-digit SAS (derived from the ECDH
  transcript) is trivially compared on two screens you're already holding and aborts if anything was substituted.
- **Two scans is the cost.** It is more friction than one scan, but it is a *one-time* setup per device and it
  buys immunity to the screenshot/shoulder-surf problem that plagues a single static key-bearing QR.

**Lower-friction fallback (offer, don't default): one-way QR + passphrase.**
Device A shows a single QR = `AES-256-GCM(circleKey)` wrapped under a key derived (Argon2id) from a short
**4-word passphrase** A also displays; the user types the 4 words on B. One scan, but **weaker against screen
capture** (the passphrase is on the same screen as the QR), so it's only acceptable with the screen shielded.
Good for users who won't tolerate the double scan; flagged as the weaker option in the UI.

### 3.1 Admission control: admin approval & the soft cap of 6

The circle has an **administrator** (the creator's device by default; transferable). Joining is only *complete*
when an admin device admits the new device — i.e. adds its `d_pub` to the roster and authorizes its read
capability. Two cases:

- **An admin device runs the pairing** (the common case — the primary caregiver adding their own device):
  pairing *is* approval; no extra step.
- **A non-admin device initiates**, or the circle is **at/over the soft cap of 6 devices**: the pairing still
  completes the key handoff, but the new device stays in a **pending** state and cannot sync until an admin
  taps **Approve** (with the new device's SAS/label shown for confirmation). The cap is *soft* — past 6, every
  addition simply requires explicit admin approval and a warning that a "tiny trusted circle" is the design
  intent, rather than a hard block.

This gives a second gate beyond the pairing channel: an unauthorized or coerced pairing can't silently become a
full circle member.

---

## 4. Relay-mediated join — SECONDARY (remote co-caregiver, not co-located)

Use when the second caregiver is elsewhere and can't scan your screen. This mirrors the **institution
enrollment shape** you already built — but hands off a *symmetric* key instead of registering a pubkey.

1. A generates a one-time **join code** and a separate **pairing passphrase** (high-entropy, e.g. 5–6 words).
2. A computes `wrap = AES-256-GCM(circleKey)` under `Argon2id(passphrase, salt)` and **pushes `wrap`** to the
   relay under a **single-fetch, rate-limited, short-expiry claim token** that the join code points to.
3. The two values travel on **two different channels**: the join code (shown/sent however), the passphrase
   **spoken on a phone call** or sent via a different app. Both are required.
4. B enters the join code → fetches `wrap` from the relay (consuming the one-shot token) → enters the spoken
   passphrase → derives the Argon2 key → unwraps `circleKey`. B then claims its relay prefix and converges.

The relay only ever sees `wrap` (passphrase-encrypted ciphertext). Its defenses against an offline guess are
Argon2id cost **plus** single-fetch consumption, tight expiry, and rate-limiting — and even a relay breach
yields only ciphertext that still needs the out-of-band passphrase.

---

## 5. Key lifecycle

- **Adding a device:** §3/§4. The new device gets `circleKey`, a write capability to its **own** prefix
  (`circle/{id}/{device}/state`, mutable — overwritten each sync, **not** WORM), and a read capability across
  the circle.
- **Rotation — auto on every member/device removal, plus a manual "Rotate now".** Generate a fresh
  `circleKey'`, then wrap it **separately to each *remaining* device's `d_pub`** (ephemeral-static ECDH →
  HKDF → AES-256-GCM), writing one per-device blob to a rotation object `circle/{id}/rotation/{epoch}` on the
  relay. The removed device's `d_pub` is excluded, so **no blob exists that it can decrypt** — even though it
  still holds the old `circleKey` and might still read the object. That is the crucial property the earlier
  "wrap under the old key" sketch lacked: removal is now *cryptographic*, not merely access-control.
  - **Online remaining devices** pick up their blob and switch immediately.
  - **Offline remaining devices** fetch their blob whenever they next reconnect — `d_pub` doesn't change, so the
    **latest** rotation object always carries a blob they can open, even if they were offline across several
    rotations. No re-pairing required for a legitimate device.
  - The removed device's relay capability is **also** revoked (defense in depth), and subsequent syncs are
    written under `circleKey'`; each device re-keys its own `state` object on its next sync.
  - *Why not "wrap new under old"?* Because the removed party holds the old key — that approach would protect the
    new key from everyone **except** the person being removed. Pairwise wrapping to remaining devices is what
    makes the removed device unable to compute `circleKey'` at all.
- **`syncPasscode` retirement:** once circles exist, the typed sync passcode goes away; existing users are
  migrated by generating a `circleKey` and pairing their other devices via §3 (see the migration plan in §9).

---

## 6. Threat model & honest limits

| Threat | Handled? | How / residual |
|---|---|---|
| Passive observer photographs a pairing QR | **Yes** (default flow) | QRs carry only ephemeral public keys + ciphertext; the shared secret and circle key are never displayed. The one-way+passphrase fallback is weaker here — flagged. |
| Screenshot of a QR persists in a camera roll | **Yes** (default flow) | Same reason — nothing decryptable is in the QR. Single-use + expiry close the window regardless. |
| Swapped QR / malicious scanner app | **Yes** | 6-digit SAS comparison aborts the pairing before the key is released. |
| Malicious/curious relay (remote join) | **Yes** | Relay sees only Argon2-passphrase-wrapped ciphertext; never the key. Single-fetch + rate-limit + expiry blunt offline guessing. |
| Network attacker on the relay path | **Yes** | TLS is required (the `intakeBaseOk` rule already enforced); payloads are E2E-encrypted under `circleKey` regardless. |
| Removed device obtains the *new* key after rotation | **Yes** | The new key is wrapped only to *remaining* devices' public keys; the removed device's key isn't a recipient, so it cannot compute `circleKey'` even with relay read access + the old key. Relay revocation is additional defense in depth. |
| Removed caregiver / lost device keeps old DATA | **Partial — by nature** | Rotation stops it decrypting **future** syncs, but it keeps the **local copy it already had**. No clawback. UI must say "removed from future updates," not imply deletion. |
| Both channels compromised at once (QR *and* SAS read, or code *and* passphrase intercepted) | **No — inherent** | Any two-channel pairing fails if both channels are owned simultaneously. The defense is that they're genuinely different channels (optical+visual vs relay+voice). |
| Compromised endpoint device (malware on A or B) | **Out of scope** | If the device holding the key is owned, the data is owned. No protocol fixes this. |
| Replay of a join code/QR | **Yes** | Single-use consumption + short expiry. |

## 7. What's reused vs. genuinely new

- **Reused (already built & tested):** the relay claim/push/read transport, capability scoping, **revocation**,
  TLS enforcement, and encrypted-vault storage for the key. Per-device prefixes are just mutable (non-WORM)
  objects on the same server. The audit log stays **per-device** (`_audit:{deviceA:…,deviceB:…}`) — the one
  merge-logic tweak we already identified; institution model-B chains are untouched.
- **New:** the **key handoff** — the two-scan ECDH+SAS pairing (§3) and the passphrase-wrapped relay handoff
  (§4) — plus the **per-device keypair + roster** and **pairwise rotation** (§2.1, §5), the **admin-approval
  gate** (§3.1), and circle creation. That's the whole net-new security surface. The roster/rotation is the
  one place this goes beyond "purely symmetric," and it's deliberate (the price of cryptographic removal).

Every safety-critical piece here (the pairing wrap/unwrap, the SAS derivation, the Argon2 relay wrap, and the
**pairwise rotation incl. an offline device catching up and a removed device proven unable to derive the new
key**) is the kind of thing we'd prove in isolated tests **before** wiring it into the app, same as the grant
and intake layers.

---

## 8. Decisions (locked in)

1. **Default QR flow:** in-person **two-scan ECDH+SAS** is the default; one-scan+passphrase offered as a labeled
   weaker option; a **"Switch to Remote setup"** button hands off to §4.
2. **SAS length:** **6 digits**.
3. **Circle size:** **soft cap of 6 devices**; past 6, every addition requires explicit **admin approval** (§3.1).
4. **Rotation trigger:** **auto-rotate on every member/device removal**, plus a manual **"Rotate now"** (§5).
5. **Remote-join passphrase:** **generated 5–6 word** passphrase, enforced (no user-chosen passphrases).
6. **Migration:** escalating **8-week** path when `syncPasscode` retires (§9).

## 9. `syncPasscode` retirement — 8-week migration

Existing multi-device users must re-pair their secondary devices onto a `circleKey`. The path escalates so no
one is surprised, and the tone stays honest about the fact that **there is no central server to rescue a
locked-out device** — that constraint is the whole reason for the urgency, and the copy says so plainly.

| Window | Surface | Behavior |
|---|---|---|
| **Weeks 1–3 — the soft ask** | Full-screen modal on launch | Dismissible with **"Do it later."** Explains the change and offers to pair now. |
| **Weeks 4–6 — the persistent nag** | Undismissible **yellow** banner | The modal stops; a banner pins to the top of the app until the device is migrated. |
| **Weeks 7–8 — the active countdown** | Banner turns **red**, with a countdown | *"Action required: Secondary devices will disconnect in 12 days. Because Care Guardian has no central server, we cannot fix this for you if you get locked out. Take action now."* |
| **Day 60 — the hard sunset** | `syncPasscode` backend disabled | Any device still on the old system hits a **hard-locked screen** prompting a re-pair via §3/§4. |

Notes: the countdown is computed locally against a fixed sunset date carried in the build, so it works offline;
the primary/admin device should migrate first (it holds the circle), after which secondaries re-pair to it; and
the local `.care` export remains available throughout as the floor, so even a device that misses the window can
recover its data by hand and then re-pair.

---

## 10. Proof status (design-stage, pre-integration)

The four safety-critical properties are proven against a faithful reference implementation
(`circle-crypto.mjs`, WebCrypto ECDH P-256 / HKDF-SHA256 / AES-256-GCM + real Argon2id via hash-wasm — the
same primitive available in the browser/PWA). Nothing is wired into the app yet; when ported into `src/App.jsx`
these suites will be re-pointed to extract the functions verbatim, exactly as the grant and intake suites do.

| Property | Suite | Key assertions |
|---|---|---|
| 1 — two-scan ECDH+SAS pairing | `circle-pair-test.mjs` | shared key + matching 6-digit SAS; a **swapped QR** changes the SAS *and* fails the AEAD (no key released); tampered wrap fails closed; neither QR carries the key in readable form |
| 2 — Argon2id remote handoff | `circle-remote-test.mjs` | correct passphrase round-trips; wrong passphrase fails closed; the relay blob holds only salt/params/ciphertext (no key); tamper fails closed; fresh salt per handoff |
| 3 — pairwise rotation / offline catch-up | `circle-rotate-test.mjs` | a remaining online device re-keys; a device **offline across two rotations** derives the current key from the latest object alone; a remaining device reads new data under the rotated key |
| 4 — removed-device exclusion | `circle-rotate-test.mjs` | the removed device has no blob, cannot piggyback another device's blob (ECDH to a non-recipient key fails), and — holding only the old key — cannot read any data written after rotation |

Run: `npm i hash-wasm` then `node circle-pair-test.mjs && node circle-remote-test.mjs && node circle-rotate-test.mjs`.
All three are green (21 assertions). These prove the *construction*; on-device QR scanning, the relay's
single-fetch/expiry/rate-limit (already covered by the intake suites), and the standing human review remain.
