# Care Guardian — Architectural Review & Security Audit (v8)

**Date:** June 2026 · **Scope:** dashboard.jsx (~5,888 lines), build pipeline, deploy artifact, test suites · **Method:** systematic code-driven pass over the current codebase, deliberately probing areas not covered by the four external review rounds.

**Honest framing.** This audit was performed by the same AI assistant that wrote most of the code under review. That is a real limitation: an author predictably under-scrutinizes their own assumptions, and several findings below are bugs in hardening I added myself. Treat this document as a rigorous internal pass, not a substitute for the independent review the codebase has also received (four rounds, all findings closed) or for the human review a professional deployment deserves. Where this audit found new flaws, the small unambiguous ones were fixed immediately and are labeled as such; judgment calls are left as recommendations.

---

## 1. Architecture Review

### 1.1 Trust model

The application assumes the device and browser are trusted while unlocked, and nothing else. There is no server in the trust boundary: all persistence is browser-local (IndexedDB + localStorage), all cryptography is client-side Web Crypto, and the only network activity is user-initiated sync of ciphertext to a destination the user chooses. The optional relay server stores opaque encrypted payloads and is treated as untrusted (a malicious relay can withhold or replay data but cannot read or undetectably modify it — AES-GCM authentication rejects tampering, and the merge engine treats incoming data as hostile). Team members who hold the sync passcode are semi-trusted: they can read shared data by design, and the system's job is to bound the damage a compromised or malicious member can do (flood circuit breaker, HLC future-stamp guard, merge preview, append-only union that cannot silently delete others' records).

The threat the design takes most seriously, correctly for this domain, is the **local adversary in a family dispute**: someone with periodic physical access to the device and possibly knowledge of a passcode. The mitigations are layered — PBKDF2-600k passcode wrapping against extraction of the wrapped key, optional PRF-bound MFA so a passcode alone cannot decrypt, hash-chained audit logging with a vault-anchored tip so log tampering is evident, mark-and-sweep blob GC so deleted media is actually gone, and role-scoped views.

### 1.2 Data architecture

State is a single JSON document, encrypted as a whole (AES-256-GCM, random 96-bit IV per operation, key = 256-bit DEK held only in a ref while unlocked). Durability is provided by a write-ahead log: every state change appends a structural diff keyed by sequence number; periodic checkpoints write full snapshots in an A/B slot pair with write-then-flip-pointer semantics; load takes the active snapshot and replays newer WAL entries. Binary media live outside this document in a separate encrypted blob store, referenced inline by `blobref:` ids, which keeps the JSON small enough that snapshots, diffs, and encryption stay fast on weak hardware. This layering is coherent and each safety-critical piece has an isolated proof: diff/apply round-trips, crash/corruption pipeline simulation, GC never deleting referenced blobs, blob round-trips across keys, hash-chain tamper cases, HLC ordering, MFA factor combination, and the flood-breaker thresholds — nine suites, all passing together.

Two structural judgments deserve note. First, **whole-vault encryption** (rather than per-record) is the right call at this scale — it makes the crypto simple to reason about and the WAL makes its write cost acceptable — but it means decryption is all-or-nothing: any session exposes the entire dataset to the unlocked app, and role-based restriction is enforced by UI, not by cryptography. A client-restricted user's browser session technically has the material to read everything. That is acceptable for the product's threat model (roles protect against shoulder-surfing and accidental exposure, not against a technically skilled restricted user on the same device) but it should be stated plainly to institutional buyers, and it is now stated here. Second, the **A/B snapshot mechanism doubles as the migration safety net** — future schema migrations write to the inactive slot, verify the GCM tag on read-back, and flip the pointer, which satisfies the never-migrate-in-place policy without new machinery.

### 1.3 Sync architecture

Sync is a manual or semi-automatic exchange of full encrypted vault payloads, merged client-side by an append-only union with HLC-ordered most-recent-wins for the one mutable shared type (care shifts). This is honest about what a serverless system can guarantee: convergence without a coordinator, at the cost of trusting timestamps within a bounded window (15 minutes) and shipping the full state each time. Full-state sync is the main scalability ceiling — see finding R-2 — but it is also what makes the flood breaker, schema guard, and merge preview tractable, because every sync is a reviewable unit.

### 1.4 Code architecture

A single 5,900-line JSX file with embedded CSS is unusual and was a deliberate constraint (auditability as a single artifact, no build-step trust beyond Vite, trivial deployment). The cost is growing: module-level crypto helpers, a large component with ~100 state hooks, and string-based patching during development. It has held up under four review rounds because the conventions are consistent, but it is approaching the size where the single-file constraint starts costing correctness rather than buying transparency. Recommendation, not a flaw: define the threshold now (e.g., split crypto/storage/merge into separate audited modules at 7,000 lines) rather than deciding under pressure later.

---

## 2. New Findings (this audit)

Severity reflects realistic impact within the product's threat model.

### A-1 · HIGH · Full-replace import bypassed all hardening — FIXED during audit

`handleFullReplace` (Settings → restore from backup, replacing rather than merging) decrypted a backup and passed it directly to `setData` with **no schema validation, no sanitization, and no size cap** — while every other ingress path gained those protections across four review rounds. A crafted or corrupted backup file (the import passcode is the only gate) could inject arbitrarily shaped state, oversized inline media, or a flood payload straight past the circuit breaker, and the action left no audit-log entry. This is a textbook hardening gap: the protections were added where the reviews pointed, and the one path nobody pointed at kept the original behavior. Fixed: the path now applies the same pre-parse length cap, hard payload cap, `validateImportSchema`, and `sanitizeImportData` as the merge paths, and writes an audit entry ("Full vault replace from backup").

### A-2 · HIGH · The flood breaker checked size *after* JSON.parse — FIXED during audit

The Round-4 circuit breaker compared `json.data` against the hard cap — after `JSON.parse(text)` had already materialized the full payload, and in the cloud path after `pullResp.json()` had parsed the response. Parsing is precisely where a memory-constrained device dies on an 800 MB payload, so the breaker fired one step too late to prevent the harm it was built for. Fixed: a raw-text length gate (`rawTextTooLarge`, ceiling adjusted for base64+JSON inflation) now runs before any parse in all five ingress points — pasted/file sync, encrypted import, full replace, cloud pull (which now reads `text()` and length-checks before parsing), and the pre-auth recovery path, which is the most OOM-sensitive of all since it runs before the user has any session to fall back to. The existing post-decrypt caps remain as the second layer. This finding is a useful caution about the project's own process: the breaker shipped with a passing threshold test because the *thresholds* were tested in isolation while the *ordering* lived in app code the harness doesn't execute.

### A-3 · MEDIUM · Decrypted media cache survived lock — FIXED during audit

`MediaThumb` caches decrypted photos and voice notes (as data: URLs) in a module-level Map to avoid re-decrypting on every render. `lock()` nulled the DEK and audit key but did not clear this cache, so decrypted PHI remained in JS memory after lock, and a subsequent unlock — including by a lower-privilege role on a shared device — inherited a warm cache of media decrypted under the prior session. Exposure required an authenticated session and the views that render media, so this is not a passcode bypass, but it contradicts the stated meaning of lock ("keys and decrypted material are gone"). Fixed: `lock()` now clears the cache. Residual, documented rather than fixed: JavaScript gives no way to zeroize strings, so previously decrypted data may persist in unreachable heap memory until GC and page teardown; a full page reload remains the strongest local hygiene, and the README's guidance to close the tab on shared computers stands.

### A-4 · MEDIUM · Imported audio was unbounded — FIXED during audit

The import sanitizer capped photos (data:image only, <3 MB, max 3) but did not touch `audioData` at all: an imported record could carry an arbitrarily large or non-audio data: string inline in the vault, re-bloating the JSON that binary partitioning exists to keep small, and surviving every future sync. Fixed: `audioData` must now be a `blobref:` or a `data:audio/*` under 8 MB; anything else is nulled on import. Legitimate voice notes are far below this.

### A-5 · LOW · Sync URL validator missed private ranges — FIXED during audit

The HTTPS-only validator blocked localhost, 127.x, 10.x, 192.168.x — but not 172.16–31.x, IPv6 loopback (`[::1]`), or `.local` mDNS names. The risk is modest (the fetch happens from the user's own browser, so this is self-targeting rather than classic SSRF), but the gaps undermined the control's stated intent. Fixed.

### A-6 · LOW · Passcode entered via `prompt()` — RECOMMENDATION

Regenerating a recovery code asks for the caregiver passcode through `window.prompt`, which displays input unmasked and, on some platforms, retains it in dialog history. Inconsistent with every other passcode entry in the app (masked inputs in modals). Recommend replacing with the standard modal pattern; not fixed in this pass because it is UI work touching an existing flow, with low standalone risk.

### A-7 · LOW · No Content-Security-Policy in the deploy artifact — RECOMMENDATION

The built `index.html` ships no CSP. The app's XSS surface is small — React escapes by default, the eight `dangerouslySetInnerHTML` uses all inject the static stylesheet constant, and no imported string is rendered as HTML — but for a PHI application, defense-in-depth argues for a restrictive policy (`default-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https:` plus the style allowances the inline CSS requires). Best set as headers by the host; a meta tag is the fallback for static hosts. Documented in the README's deployment section as a hardening step for institutional deployments, where it belongs with HTTPS and HSTS guidance.

---

## 3. Verified Strengths

These were checked in this pass, not assumed. Brute-force throttling on unlock exists and works (exponential backoff after the attempt cap). The legacy-migration path uses old plaintext passcodes only to re-wrap and then deletes them; the `"1234"` literal there is a migration fallback, not a live default — first-run setup forces passcode creation and `completeSetup` strips passcode fields from state. The sync passcode is never persisted outside the encrypted vault and is stripped from imports. Every encryption call generates a fresh random IV. The recovery (pre-auth) path validates and sanitizes before any state is seeded, and recovered blobs are written only under the newly generated key. The WAL queue is single-writer and coalescing, eliminating the overlapping-save race by construction. The audit chain's dual anchoring (per-event localStorage tip + vault-persisted tip) covers both the quick local rollback and the synced rollback. The deploy bundle contains no external font, CDN, or analytics references — the zero-egress claim was re-verified against the current `dist/`.

## 4. Residual Risks (accepted, documented)

**R-1 · Role enforcement is UI-level.** All roles decrypt the same vault; restriction is rendering logic. Within the threat model (protecting a person with dementia from distressing content, limiting casual exposure) this is fine; against a technically skilled restricted user it is not a control. Institutional buyers should hear this sentence verbatim.

**R-2 · Full-state sync scales linearly with history.** Years of incidents plus media references make every sync a full-vault exchange. The flood breaker bounds the catastrophic case, and blob partitioning keeps payloads mostly text, but a long-running team will eventually feel sync latency. A delta-sync protocol is the eventual answer and is a significant project; not needed for current deployment sizes.

**R-3 · No memory zeroization.** While unlocked, the DEK and decrypted state live in JS memory; after lock, freed strings persist until GC. Inherent to the platform. Mitigations: lock clears all refs and caches (A-3), and reload guidance for shared devices.

**R-4 · WebAuthn ceremony untestable in the harness.** The MFA crypto core is proven; the browser ceremony (create/get, PRF extension, multi-key selection, recovery-code removal) is validated only on real devices. Platform notes (iOS platform-passkey-only PRF; desktop Safari CTAP2 bugs) are documented. The real-device pass remains the single gate before pitching MFA.

**R-5 · Tamper-evidence limits.** A passcode holder can still recompute the audit chain from genesis if they also control every synced copy and the vault anchor; the design claims evidence, not non-repudiation, and the docs say so. External anchoring (periodic exported attestations) is the upgrade path if a legal use case demands it.

## 5. Bottom Line

The architecture is sound and unusually well-matched to its threat model: the dangerous adversary is local and semi-trusted, and the layered design (key wrapping, encryption-bound MFA, tamper-evident logging, secure deletion, bounded merges) addresses exactly that. The four external review rounds materially hardened the system, and all nine proof suites pass. This pass found that the hardening itself had gaps — one bypassed path, one check ordered after the harm, one cache outliving the keys — all now closed, which is the expected texture of a maturing codebase rather than a sign of weak foundations. The two items standing between this code and a professional deployment are unchanged in kind: real-device MFA validation, and a human security review to check the work of both AI participants — this document included.
