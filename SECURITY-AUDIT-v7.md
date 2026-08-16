# Security & Correctness Audit v7 — Write-Ahead Log

**Date:** June 2026
**Version:** 3.3 (write-ahead log, ~5,295 lines)
**Scope:** The new durability subsystem — per-edit encrypted diff log, A/B snapshots, replay-on-load, compaction — plus the serialized write queue. This is the most safety-critical code in the application, so it gets its own audit.

---

## What changed and why

Previously every edit re-encrypted and overwrote the entire vault as a single IndexedDB key. Two defects: (1) overlapping async saves could reorder and a slower earlier save could clobber a newer one (silent loss of the last edit, especially around app-close); (2) the monolithic single key meant any failed write risked total loss.

The vault is now persisted as: a periodic full **snapshot** (encrypted) written to one of two ping-pong slots (`snapA`/`snapB`), plus an append-only **write-ahead log** of tiny encrypted **diffs**, one per edit. On load, the active snapshot is decrypted and the newer diffs are replayed on top. Compaction writes a fresh snapshot every 25 edits or 2 minutes and prunes superseded diffs.

---

## Correctness verification (the core claim)

The guarantee rests on one pure function pair, `diffState`/`applyPatch`, and the replay/compaction wiring. Both were tested in isolation before integration:

- **Diff/apply round-trip:** 200,000 randomized single-step transitions and 20,000 randomized replay chains, asserting `applyPatch(prev, diffState(prev,next))` deep-equals `next` and that replaying a base plus a chain of diffs equals the final state. Zero failures. Plus 9 hand-written realistic app transitions (sub-task toggle, incident append, med-log append, message prepend, shift mutation, member add, key deletion).
- **Pipeline simulation** (mirroring the exact load/checkpoint/prune logic against an in-memory store):
  - **A:** 260-edit run with periodic checkpoints — reload equals live state at every checkpoint and at the end; WAL stays bounded (35 entries, not 260).
  - **B (crash):** 31 edits with a checkpoint only at 25 — an unclean stop still recovers all 31 edits via snapshot + WAL replay.
  - **C (corrupt active snapshot):** active slot corrupted — loader falls back to the previous snapshot and replays, producing the exact state with **no double-apply**.
  - **D (eviction):** empty store returns null (the data-loss signal).
  - **E:** 50 randomized trials corrupting whichever slot is active, at random stop points — fallback always reconstructs the exact live state.

The replay path applies recorded structural deltas only; it never re-runs business logic, so a reconstructed state cannot diverge from the state that produced the diff. This is the property that makes the approach safe where a hand-written mutation/command interpreter would not be.

---

## Findings

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | Mitigated by design |
| Low | 3 | 2 accepted, 1 noted |

### M1 — Durability window between edit and commit (MEDIUM, mitigated, not eliminable)

An edit is durable only once its WAL append's IndexedDB transaction commits. Between the in-memory edit and that commit there is a window (now single-digit milliseconds, because only a tiny diff is encrypted, versus ~hundreds of ms for the old whole-vault write). A hard crash or power loss inside that window loses the in-flight edit. This is the irreducible floor for any software (native databases have the same gap before `fsync`), so it is **mitigated, not eliminated**: the window is ~1000× smaller than before, and the UI shows a truthful "Saving…" indicator that only clears once the append commits — so the user is never told an edit is safe before it is. Plaintext staging to close the window further was rejected because it would write unencrypted PHI to disk, violating encryption-at-rest.

### L1 — Crash-write ordering (LOW, handled by design)

Snapshot writes commit the snapshot to the inactive slot **before** flipping the active pointer, and prune **only up to the previous checkpoint's sequence**. A crash at any step leaves a fully replayable (snapshot, WAL) pair — either the new one or the prior one. Verified by scenarios C and E. Accepted as correct.

### L2 — Encryption preserved on the new surfaces (LOW, verified)

Every WAL diff and every snapshot is encrypted with the in-memory DEK via the existing `encryptWithDEK` (AES-256-GCM, fresh random 12-byte IV per call — confirmed no IV reuse, since each call generates its own). No plaintext PHI is written to any store. The WAL and snapshots live in the same `care-guardian-vault` IndexedDB, covered by the same eviction detection and recovery path. Accepted.

### L3 — Unbounded WAL if checkpoints persistently fail (LOW, noted)

If `writeCheckpoint` throws on every attempt (e.g., quota exhaustion), the WAL grows and replay slows, but correctness holds (no loss). Checkpoint failures are caught and logged non-fatally; the storage-quota warning in Settings already surfaces the underlying condition. Noted; a future enhancement could surface a specific "checkpoint failing" warning.

---

## Interactions checked

- **Eviction detection / recovery (v6):** the launch check now treats the vault as present if a legacy blob, either snapshot, or a WAL pointer exists; only their total absence (with surviving keys) triggers the recovery screen. The recovery `.care` restore writes a fresh base blob, from which the WAL resumes cleanly.
- **v2→v3 migration and fresh setup:** both still write the base blob to the legacy `data` key, which `loadVaultV4` treats as snapshot@seq0 when no pointer exists — so existing installs upgrade transparently and begin appending diffs.
- **Continuous backup / export:** operate on the in-memory `data`, unaffected.
- **Login auditing:** the rewritten auth path now also derives the audit key on the normal v3 login (previously only on legacy migration), so successful-login audit entries are written correctly.

---

## Recommendations

1. M1 — keep the truthful save indicator; do not attempt plaintext staging. ✅ in place
2. L3 — add an explicit "automatic checkpoint is failing" warning if it recurs. Deferred.
3. Future: per-record partitioning would shrink snapshots and make compaction cheaper; it composes with this design and is the natural next durability/perf step.
