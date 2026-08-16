# Backup & Restore — What's Wrong, and a Proposal

**Status:** proposal for your decision. Nothing built.
**Method:** read the actual code paths (`setupContinuousBackup`, `handleExportAll`, `handleEncryptedImport`, the
reminder effect, the Protect Your Data block) rather than reasoning from the UI.

---

## 1. The bug you hit — confirmed, and it's worse than a nag

Three defects, and the first one is embarrassing:

**1. The "Back up now" button does not back anything up.** Its entire handler is:

```js
onClick={()=>{ setShowBackupReminder(false); nav("settings") }}
```

It hides the banner and navigates to Settings. Nothing is exported, and `lastBackupAt` is never stamped — so of
course the prompt returns. You didn't hit an edge case; you pressed a button labelled "Back up now" that performs
no backup. Everything else below follows from this, and it alone explains the behaviour you described.

**2. Re-prompting on unlock.** The reminder effect runs on `[authed, backupStatus]`. Unlocking flips `authed`,
re-running the whole check. Locking and unlocking is not a data change; the check should run when the *data*
changes, not when the session does.

**3. "Backed up" is measured by the wrong thing.** Only one function in the app stamps `lastBackupAt`
(`handleExportAll`, line 4009). It's a timestamp, so any backup — even one taken before ten more incidents were
logged — marks you "done" for seven days, while a backup through any other path counts for nothing.

**Fix:** track a **content fingerprint**, not a date. Hash the exportable state; if the hash matches the last
backup, you are backed up — no prompt, regardless of session events. If it differs, the app can say something
genuinely useful: *"14 changes since your last backup."* That single change removes the nag, makes the badge
honest, and gives the reminder a real threshold ("since you last backed up" instead of "seven days").

---

## 2. What else I found while reading

**There are six secrets a user can be asked for**, and backup touches three of them: `exportPw` (manual export),
`backupPasscode` (continuous backup), and `recoveryCode` (recovery kit). A caregiver who set all three has three
different secrets that all unlock roughly "my data", and the restore screen doesn't say which one it wants.
`exportPw` isn't remembered at all, so every manual backup invents a new passcode — and a `.care` file whose
passcode nobody wrote down is not a backup, it is a wasted download.

**Continuous backup is the good feature and it's buried.** It's the only mechanism that survives the realistic
failure — a caregiver who is exhausted and doesn't remember to press a button. It sits below a fold in Settings,
behind a passcode field, requiring a file picker, described as "Continuous backup". Nobody shops for that phrase.

**Your Protect Your Data observation is right and the code shows why:** Step 1 has a working button, Steps 2 and
3 are *inert text with a status badge*, and the actual controls live in separate sections further down the page,
titled "(Step 1)", "(Step 2)". The user is told to do three things and handed one button.

**iOS cannot do continuous backup at all** (no File System Access API in any iPhone browser). Today that surfaces
as an error message *after* the user tries. On a platform that is likely a large share of your users, the fallback
should be the offered path, not a consolation prize.

---

## 3. Proposal

### 3.1 Fold backup into onboarding — as the last step of creating the passcode

You asked whether this could avoid being a separate step. It can, and it belongs with the passcode because it's
the same conversation: *this is how you get back in.*

Right after the private key is created, one screen:

> **Where should we keep your safety copy?**
> Care Guardian saves an encrypted copy every time something changes, so you never have to remember to.
> [ Choose a folder ]  ·  *On iPhone:* [ Download a copy now ]
> Your passcode unlocks it. Nothing else to remember.

Two decisions embedded here, both worth your explicit agreement:

- **Reuse the vault passcode as the backup passcode by default.** Right now they're separate, which means a
  second secret to lose. The security difference is negligible — both protect the same data on the same device —
  and the usability difference is large. Advanced users can set a different one later.
- **Skippable, but the choice is recorded**, exactly like the storage chooser. Skipping isn't a decision; it
  leaves the nudge live.

### 3.2 Make Protect Your Data three real buttons

Each step becomes a button that performs its action or jumps to it, and shows honest state:

| Step | Not done | Done |
|---|---|---|
| 1 Stop the browser deleting your records | **[Protect my data]** | ✓ Protected |
| 2 Keep a safety copy | **[Set up automatic backups]** | ✓ Automatic · *saved 4 minutes ago* — [Back up now] |
| 3 Share care with others | **[Set up my circle]** | ✓ 3 devices |

The duplicate sections below ("Storage durability (Step 1)"…) collapse into these, so there is one place per
concept instead of two.

### 3.3 One honest status line, everywhere backup is mentioned

Replace "Last backup: 30 July" with state the user can act on:

- ✓ **Up to date** — saved automatically to `care-guardian-backup.care`
- ⚠ **14 changes not yet saved** — [Save now] *(continuous backup paused: the file moved or permission lapsed)*
- ○ **No safety copy yet** — [Set one up]

### 3.4 Restore: name the file and say which secret

The restore screen should say *"the passcode you used when you set up backups"*, and after choosing a file,
show what's in it before importing — device, date, and counts ("142 incidents, 8 medications") — so a person can
tell whether they picked the right file *before* overwriting anything.

### 3.5 iOS gets a real path, not an apology

Where continuous backup is unavailable, offer scheduled reminders plus one-tap Download, and say plainly that
iPhone browsers don't allow automatic file saving. Same information, offered rather than confessed.

---

## 4. What I'd build, in order

1. **Make "Back up now" actually back up** (one line, do it first regardless of everything else)
2. **Content fingerprint** replaces `lastBackupAt` for "are we backed up" — kills the nag, makes badges honest
3. **Protect Your Data → three working buttons**, duplicate sections removed
4. **Onboarding backup step** with passcode reuse
5. **Status line** everywhere backup appears
6. **Restore preview** and secret naming
7. **iOS path** as a first-class alternative

1–3 are the ones you felt most directly. 3 is the one that changes outcomes, because it's the difference
between a family having a backup and intending to have one.

---

## 5. Decisions I need from you

1. **Reuse the vault passcode as the backup passcode by default?** (I recommend yes — one secret, and the
   security delta is negligible.)
2. **Onboarding backup step: skippable, or hard gate like the recovery kit for cloud?** (I recommend skippable
   with a persistent nudge — a hard gate at first run, before there's any data to lose, buys little and risks
   people abandoning setup.)
3. **Reduce the passcode count?** `exportPw` and `backupPasscode` could become one "backup passcode". That is a
   real simplification but it touches restore compatibility for existing `.care` files, so I'd want to handle it
   deliberately with its own tests.
4. **Should Step 3 (Team/circle) stay in "Protect Your Data"?** It's a collaboration feature framed as a
   protection one. It does aid durability via multi-device copies, so there's a case — but it may belong under
   Team Management with a pointer here.
