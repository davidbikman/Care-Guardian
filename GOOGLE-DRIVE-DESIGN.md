# Google Drive Integration — and what it changes about the architecture

**Status:** decided and partly built. Capability model and outbox are implemented and tested (46 green).
**Supersedes:** the previous decision to mark Google Drive `unavailable`. That call was correct about the
constraint and wrong about the conclusion.

---

## 1. Correcting the earlier decision

Last session I removed Google Drive because its token endpoint requires a `client_secret` that a browser cannot
keep. The constraint is real and confirmed: for the **Web application** client type, Google requires a client
secret *even when PKCE is used*, and a secret in a JavaScript bundle is readable by anyone.

What I got wrong was treating that as "Google is impossible in a browser." It isn't. It means **one specific flow**
is impossible. Google's own recommended path for browser apps — **Google Identity Services (GIS), token model** —
needs no client secret at all. I ruled out the provider when I should have ruled out the flow.

---

## 2. The two facts that decide the design

**Fact 1 — no client secret is needed, if the right flow is used.**
GIS `initTokenClient()` returns an access token directly to the browser. No secret, no token-endpoint call from
our code.

**Fact 2 — and no refresh token is available either.**
The GIS token model issues a short-lived access token (about an hour) and **no refresh token**. When it expires, a
new one must be requested from a user-driven event. Google removed automatic refresh from its JS client
deliberately, for user awareness.

Together: **Google Drive access is session-scoped.** Real while the app is open; gone when it closes.

There is no browser-side workaround. The "Desktop app" client type does embed a secret that Google explicitly says
isn't secret — but it requires a loopback redirect and is not permitted from a hosted web origin. Ruled out
honestly, so it isn't rediscovered as a shortcut.

---

## 3. The verification question, because it gates launch

Google's scope tiers determine how much review a launch needs:

| Scope | Tier | Requirement |
|---|---|---|
| `drive.file` | **Non-sensitive**, "Recommended" | Basic app verification only |
| `drive.appdata` | **Non-sensitive**, "Recommended" | Basic app verification only |
| `drive.readonly`, full Drive | Restricted | Annual **CASA** third-party security assessment |

`drive.file` — create and modify only files this app created — is on the free side of that line. **No CASA, no
annual paid assessment.** The existing code already requested `drive.file`, which was the right instinct.

**Recommendation: keep `drive.file` rather than `drive.appdata`.** Both are non-sensitive. The difference is
visibility: `appdata` hides objects in a folder the user cannot see, while `drive.file` puts them in the user's
own Drive where they can be seen, copied and kept. For a product whose entire promise is *you own your records*,
a backup the user can see is worth more than a tidy hidden folder — and an invisible store the user might destroy
by disconnecting the app is a poor place for the only durable copy.

---

## 4. The architectural change

Locked decision 8 said uploads are automatic once storage is connected. Google cannot honour that literally. The
wrong response is a Google special case scattered through the sync code. The right one:

> **Treat provider availability as intermittent by default, and absorb the gaps with a durable outbox.**

This is honest for *every* provider — offline, expired token, revoked consent, exhausted quota all look identical
from the app's side — so the design that makes Google first-class also makes Dropbox and OneDrive more robust.

**Implemented and proven** (`storage-caps-outbox-test.mjs`):

- **Capability descriptors.** Each provider declares `auth: persistent | session` and whether background sync is
  possible. Dropbox and OneDrive are persistent; Google Drive is session. An **unknown provider degrades to
  `session`** — the cautious assumption, never the optimistic one.
- **Outbox.** Every object needing upload is queued locally and drained whenever storage is available.
  - **Deduplicated by key**, because each object is a complete snapshot: queueing `state.enc` five times means the
    fifth supersedes the rest. Without this the queue grows without bound on a busy day.
  - **Manifest drains last**, so it never points at objects that haven't uploaded.
  - **Bounded** at 500 entries.
  - **Failures retain the entry** — a queue that drops work on error is not a queue — with attempt counts and the
    error recorded, and eventual abandonment rather than infinite retry.
  - **Quota stops the run** with a distinguishable reason instead of hammering a full account.
  - **A queued object whose local source vanished is dropped**, not left blocking the queue.
  - **Work survives across sessions:** with no token the queue waits; after a one-tap reconnect it uploads.

---

## 5. What "automatic" now means, per provider

| | Dropbox / OneDrive | Google Drive |
|---|---|---|
| While the app is open | Automatic | Automatic |
| App closed | Resumes on next open | Resumes on next open |
| Returning after a while | Silent — refresh token | **One tap** to reconnect |
| Promise made in the UI | "Syncs automatically" | "Saves while you're using it; one tap to reconnect" |

The Google row is a real difference and must be stated at the point of choosing, not discovered later. The
capability model carries that sentence as data, so the UI cannot forget to say it.

**Mitigation worth building (Phase 2):** attempt a silent token request on app open. If the user has a live Google
session and an existing grant, GIS can often return a token without any UI, making the common case genuinely
invisible. If it can't, the queue simply waits — nothing is lost either way.

---

## 6. Consequence for the 7-day staleness rule

Session-scoped storage makes stale copies **more likely**, not less: a caregiver who doesn't open the app for a
fortnight has no Drive upload in that time. The already-decided 7-day warning therefore matters more for Google,
and its copy should differ — for a persistent provider it means something went wrong; for Google it may just mean
"you haven't opened the app." Same threshold, different sentence.

---

## 7. Residual risks, stated plainly

1. **Google can change this.** GIS is a recommended path, not a contract. A refresh-token-free browser flow is a
   deliberate Google policy and unlikely to loosen, but the capability model localises any future change to one
   table.
2. **Basic verification is still verification.** `drive.file` avoids CASA but not the consent-screen review:
   homepage, privacy policy on the same verified domain, demo video. Budget calendar time, not money.
3. **Session-scoped storage is genuinely weaker as a sole durable store** for a rarely-opened app. If a family
   uses Care Guardian sporadically, Drive-only means a rarely-updated backup. Worth saying in the storage chooser.
4. **This does not weaken the encryption promise at all.** Google receives the same ciphertext as any other
   provider, and never a key.

---

## 8. What remains before Google Drive is launchable

| | Work | Owner |
|---|---|---|
| a | Register the Google Cloud project; obtain a client ID; fill `GOOGLE_CLIENT_ID` | David |
| b | Configure the consent screen; submit for **basic** verification (`drive.file`) | David |
| c | Load the GIS library and implement `initTokenClient` + silent-retry on open | Build, Phase 2 |
| d | Wire the outbox into the real sync path (currently proven against the fake) | Build, Phase 1 |
| e | Provider-specific copy in the chooser and the staleness banner | Build, Phase 2 |
| f | Device QA: connect, upload, close, reopen, reconnect, verify no data loss | David + build |

Nothing here is blocked on architecture any more. (a) and (b) are the long-lead items — verification is measured
in days of back-and-forth — so they are worth starting before the code that needs them.
