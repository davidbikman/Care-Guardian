# Care Guardian — Architecture

This document describes the architecture as implemented in `dashboard.jsx` (single-file React application, ~6,100 lines). Every store name, key name, and flow below is taken from the code, not from design intent. Diagrams are Mermaid and render on GitHub.

## 1. System Context

Care Guardian is a local-first progressive web app. There is no server in the trust boundary: all data lives in the browser, all cryptography is client-side Web Crypto, and the only network activity is user-initiated sync of ciphertext to a destination the user chooses. The optional relay stores opaque encrypted payloads and is treated as untrusted.

```mermaid
flowchart TD
    subgraph DEVICE["User device - the entire trust boundary"]
        APP["Care Guardian PWA<br/>single-file React app"]
        subgraph BROWSER["Browser storage"]
            LS["localStorage<br/>wrapped keys, chain tips"]
            IDB1["IndexedDB: care-guardian-vault"]
            IDB2["IndexedDB: care-guardian-audit"]
            IDB3["IndexedDB: care-sync-handles"]
        end
        APP --> LS
        APP --> IDB1
        APP --> IDB2
        APP --> IDB3
    end
    RELAY["Optional sync relay or cloud folder<br/>sees ciphertext only - untrusted"]
    PEER["Other team devices<br/>hold the same sync passcode"]
    APP -. "user-initiated only<br/>encrypted payloads" .-> RELAY
    RELAY -. "encrypted payloads" .-> PEER
```

The app makes zero network requests on its own: fonts and pdf.js are bundled, there is no telemetry, and the service worker serves only same-origin assets. Sync, import, and export are explicit user actions.

## 2. Key Hierarchy

Two data-encryption keys exist. `DEK_F` (full) encrypts everything private; `DEK_R` (restricted) encrypts the client-visible projection and outbox. `DEK_R` is stored wrapped under `DEK_F`, so every path that recovers the full key derives the restricted key — strictly one-way. All wraps use PBKDF2-SHA-256 at 600,000 iterations and AES-256-GCM with a fresh random 96-bit IV per operation.

```mermaid
flowchart TD
    CGPC["Caregiver passcode"] -->|"PBKDF2 600k wrap: wk.c"| DEKF
    MFA["Passkey PRF + passcode<br/>HKDF-combined - wk.mfaKeys, one wrap per passkey"] --> DEKF
    REC["Recovery code + passcode<br/>wk.cRecovery"] --> DEKF
    DEKF["DEK_F - full key<br/>256-bit random"]
    DEKF -->|"wk.rUnderF<br/>R encrypted under F"| DEKR["DEK_R - restricted key<br/>256-bit random"]
    CLPC["Client passcode<br/>restricted tier"] -->|"wk.r with wk.clientScope = r"| DEKR
    CLPCF["Client passcode<br/>independent tier"] -->|"wk.r"| DEKF
    DEKF --> VAULT["Vault snapshots + WAL<br/>private-zone blobs<br/>audit-log key derivation"]
    DEKR --> PROJ["Client projection<br/>outbox<br/>client-zone blobs"]
```

When MFA is enabled the passcode-only caregiver wrap is removed; the vault key is then recoverable only through passcode-plus-passkey or passcode-plus-recovery-code, and a second passkey can replace the recovery code entirely. Enrollment verifies the new factors round-trip to the exact key before removing the old wrap, so a failed setup can never cause lockout.

## 3. Storage Layout

```mermaid
flowchart LR
    subgraph LS["localStorage"]
        K["demcare-keys-v3<br/>wk.c, wk.r, wk.mfaKeys, wk.cRecovery,<br/>wk.rUnderF, wk.clientScope, mfa meta"]
        AT["cg-audit-tip - audit chain tip"]
        HLC["cg-hlc - hybrid logical clock"]
    end
    subgraph V["IndexedDB care-guardian-vault v3"]
        subgraph ENC["store: encrypted"]
            SA["snapA - seq + ciphertext"]
            SB["snapB - seq + ciphertext"]
            WM["walmeta - active slot + seq"]
            LD["data - legacy pre-WAL vault"]
            PR["proj-r - client projection under DEK_R"]
            OB["outbox-r - client submissions under DEK_R"]
        end
        WAL["store: wal<br/>structural diffs keyed by seq"]
        BL["store: blobs<br/>photos and voice, encrypted, keyed by id"]
    end
    subgraph A["IndexedDB care-guardian-audit v1"]
        AE["store: entries<br/>hash-chained encrypted audit entries"]
    end
    subgraph S["IndexedDB care-sync-handles v1"]
        FH["store: handles<br/>FileSystemHandle for continuous backup"]
    end
```

The vault is a single JSON document encrypted as a whole. Binary media never enter it: photos and voice notes live in the `blobs` store encrypted under the zone key of their owning record, with only `blobref:<id>` strings inline, which keeps snapshots, WAL diffs, and per-save encryption small.

## 4. Save Pipeline — Write-Ahead Log

Every state change flows through one effect. Full sessions append a structural diff to the WAL; periodic checkpoints write complete snapshots into an A/B slot pair with write-then-flip-pointer semantics, so a crash at any moment leaves a valid snapshot plus a replayable log. Scoped client sessions never touch any of this — a module-level write lock makes the storage primitives themselves refuse.

```mermaid
flowchart TD
    SD["setData - any state change"] --> EFF{"save effect"}
    EFF -->|"scoped client session"| PROJW["writeProjection<br/>projection under DEK_R only"]
    EFF -->|"full session"| DIFF["diffState prev vs next"]
    DIFF --> Q["coalescing single-writer queue"]
    Q --> WA["walAppend - diff encrypted under DEK_F,<br/>keyed by seq"]
    WA --> CK{"25 edits or 2 min?"}
    CK -->|no| PILL["save pill: saved"]
    CK -->|yes| SNAP["writeCheckpoint:<br/>encrypt full state to INACTIVE slot"]
    SNAP --> VER["flip walmeta pointer after write"]
    VER --> PRUNE["prune WAL to previous checkpoint<br/>previous snapshot stays replayable"]
    PRUNE --> PROJR["refresh client projection<br/>clear ingested outbox"]
    LOCK["assertVaultWritable guards walAppend,<br/>saveSnapshot, walPrune, saveVaultData"] -.-> WA
    LOCK -.-> SNAP
```

Load is the inverse: take the active snapshot (falling back to the other slot, then the legacy `data` key), then replay WAL entries with seq greater than the snapshot's. The diff/apply/replay core is proven by 200,000-plus round-trips and a crash/corruption pipeline simulation in `tests/`.

## 5. Unlock Flows

```mermaid
sequenceDiagram
    participant U as User
    participant APP as App
    participant LS as localStorage keys
    participant V as Vault DB
    U->>APP: enter passcode
    APP->>LS: load wrapped keys
    alt caregiver passcode, MFA off
        APP->>APP: unwrap wk.c with PBKDF2 600k → DEK_F
    else caregiver passcode, MFA on
        APP->>U: request passkey tap
        U->>APP: WebAuthn assertion with PRF output
        APP->>APP: HKDF combine passcode + PRF → unwrap mfaKeys entry → DEK_F
    end
    APP->>V: loadVaultV4 → snapshot + WAL replay
    APP->>APP: ensureRKey → derive DEK_R from wk.rUnderF
    APP->>V: outboxStatus → size-gate, then readOutbox
    APP->>APP: sanitize each report, force origin client, chain into self-report hash chain
    APP->>APP: verify audit chain + self-report chain against anchors
    APP->>V: writeProjection under DEK_R
    APP->>U: dashboard - full session
```

A client-restricted unlock is a different path entirely: the client wrap yields only `DEK_R`, the session decrypts just the projection, merges it over an empty skeleton so views degrade gracefully, and sets the hard write lock. A legacy client wrap that still holds the full key is permanently downgraded to `DEK_R` on its first post-migration sign-in.

```mermaid
sequenceDiagram
    participant C as Client - restricted tier
    participant APP as App
    participant V as Vault DB
    C->>APP: client passcode
    APP->>APP: unwrap wk.r → DEK_R only - clientScope = r
    APP->>V: readProjection under DEK_R
    APP->>APP: skeleton-merge → scoped session, write lock ON
    Note over APP: cannot decrypt vault, WAL, audit log,<br/>or private-zone blobs - and never writes them
    C->>APP: submit self-report with photo
    APP->>V: media → blobs store under DEK_R
    APP->>V: report → outbox-r under DEK_R
    Note over V: next caregiver unlock ingests, sanitizes,<br/>chains, and persists via the normal WAL
```

## 6. Sync and Import Ingress — Circuit Breakers

All five ingress paths share the same layered gates. Nothing is parsed before a raw-size check, nothing is applied before validation and sanitization, and an unusually large update is quarantined for explicit review instead of auto-merged.

```mermaid
flowchart TD
    IN["Incoming payload<br/>cloud pull, pasted sync, file import,<br/>full replace, pre-auth recovery"] --> G1{"raw text length<br/>over hard cap?"}
    G1 -->|yes| REF1["refuse before JSON.parse<br/>no memory exposure"]
    G1 -->|no| PARSE["JSON.parse"] --> G2{"base64 payload<br/>over 128 MB?"}
    G2 -->|yes| REF2["refuse before decrypt"]
    G2 -->|no| DEC["decrypt + ingest blobs zone-aware"] --> VAL["validateImportSchema +<br/>sanitizeImportData"]
    VAL --> MERGE["mergeWithClock<br/>append-only union, HLC ordering,<br/>future stamps beyond 15 min rejected"]
    MERGE --> G3{"over 25 MB or<br/>over 500 new records?"}
    G3 -->|yes| REVIEW["merge preview with flood warning<br/>NOT applied automatically"]
    G3 -->|no| APPLY["apply - report added, updated, flagged"]
```

Scoped client sessions are refused at the entry of every one of these functions, independent of UI gating. The encrypted outbox gets the same treatment in miniature: its ciphertext size is checked before any decrypt, and each report passes a strict field whitelist that caps sizes and strips chain and origin fields.

## 7. Integrity Chains

Two independent hash chains provide tamper-evidence, both using sequence number, previous-hash link, and a SHA-256 over canonical content, both anchored where an attacker would also have to win.

```mermaid
flowchart LR
    subgraph AC["Audit chain - every PHI access and security event"]
        A1["entry seq 1"] --> A2["entry seq 2"] --> A3["entry seq n"]
        A3 --> T1["tip in localStorage cg-audit-tip"]
        A3 --> T2["tip in encrypted, WAL-backed,<br/>SYNCED vault settings.auditTip"]
    end
    subgraph SC["Client-voice chain - client-authored self-reports"]
        S1["report srSeq 1"] --> S2["report srSeq 2"] --> S3["report srSeq n"]
        S3 --> U1["tip in vault settings.selfReportTip"]
        S3 --> U2["tip in the client's own<br/>encrypted projection"]
    end
```

Client-authored reports are additionally append-only at the application level — no role, including admin, has a delete or edit path — and each report's hash covers fingerprints of its attached media, so swapping a photo is as detectable as editing text. The honest limit, stated in every relevant document: a holder of the full key who controls the device can recompute either chain; this is tamper-evidence against realistic manipulation, not non-repudiation.

## 8. Code Organization

The application is deliberately a single file, organized in layers that the line ranges below approximate: state-content definitions (domains, Oregon Medicaid content, emergency scenarios), then the cryptographic and storage core (key wrapping, vault DB, WAL, blobs, projection and outbox, integrity chains, circuit breakers — all module-level pure-ish async functions), then the React component (state hooks, the save effect, unlock and session lifecycle, feature views), then embedded CSS. The module-level core is what the eleven isolated test suites in `tests/` exercise: they import or replicate those functions verbatim and prove the safety-critical invariants — WAL round-trips and crash simulation, both hash chains, the HLC, MFA factor combination, blob round-trips across keys, garbage-collection safety, zone scoping, outbox hardening, and the flood-breaker thresholds. CI runs all of them on every push.

The single-file constraint trades modularity for auditability — one artifact, one hash, nothing hidden in a dependency graph. The architecture review (SECURITY-AUDIT-v8.md) flags ~7,000 lines as the point to revisit that trade by splitting the crypto/storage/merge core into separately audited modules.
