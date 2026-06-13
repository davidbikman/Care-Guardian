# Care Guardian — Help & User Guide

A complete guide to every feature. Also accessible from the **? Help** tab inside the app.

---

## Getting Started

### First Launch

The first time you open Care Guardian, a short guided setup walks you through four steps:

1. **Privacy promise** — a plain explanation that your data stays on your device; nothing is sent to any server.
2. **Save to home screen** — on phones and tablets, a guided prompt (with the exact Share-button steps on iPhone/iPad) to install the app, which protects your records from being cleared by the browser. You can skip this and do it later.
3. **Create your passcodes** — two passcodes:
   - **Caregiver passcode** — full access, for care team members (Admin, Family, Care Professionals)
   - **Client passcode** — for the care recipient. In Supported mode, this passcode unlocks only the client's own view (their schedule, medications, messages, and self-reports) — it mathematically cannot open legal, financial, or planning records, even if someone learns it.
   Both must be at least 4 characters and different. Because there is no server, no one — not even us — can reset or recover a lost passcode, so write them down and keep them somewhere safe.
4. **Who you're caring for** — just the care recipient's first name (and optionally their main doctor) so the dashboard greets you personally. You can skip or change this anytime.

All data is encrypted with your passcodes. (Backing up your data — so you can recover it if your device is lost or the browser clears its storage — is introduced separately once you've started using the app; see "Backing Up Your Data" below.)

### Session Security

The app locks after 15 minutes of inactivity. After 8 failed login attempts, exponential backoff prevents brute-force attacks. Everything is encrypted at rest with AES-256-GCM.

A small **save indicator** in the corner shows "Saving…" while a change is being written and "Saved" only once it has truly been stored — the app never claims your work is safe before it is. If you ever see "Save error," make a backup and check Settings → Security & Integrity.

**Forgot your passcode?** The sign-in screen has a "Forgot passcode?" link with two options: restore from an encrypted backup file (you'll need that backup's password), or erase this browser's Care Guardian data and set up again. Erasing is permanent — without a backup, the data cannot be recovered — so the app asks you to confirm before anything is deleted.

### Backing Up Your Data (important)

Your data lives on this device, encrypted. That means **you are responsible for keeping a backup** — there is no copy on a company server to fall back on (that is what keeps your information private). Make a backup regularly:

1. Go to **Team → Settings**.
2. Under the backup section, enter an **export passcode** (remember it — you'll need it to restore).
3. Tap **Export Encrypted** to download a `.care` file.
4. Keep that file somewhere safe — your computer, a USB drive, or your own cloud storage (iCloud, Google Drive, Dropbox). The file is fully encrypted, so cloud storage is fine.

The app will remind you with a banner if it has been more than a week since your last backup.

### Continuous Automatic Backup (Chrome, Edge, Brave)

If you use Chrome, Edge, or Brave, you can set up backup that happens automatically:

1. Go to **Team → Settings → Continuous Backup**.
2. Choose a backup passcode (at least 6 characters — remember it).
3. Tap **Set up continuous backup** and choose where to save the file (your computer, or a synced cloud folder like iCloud Drive, Google Drive, or Dropbox).

From then on, every change is saved to that file automatically and encrypted. A small status shows **Active** when it's working.

**About "Paused":** For your security, the browser forgets its permission to write to your file each time you fully close and reopen the app. When that happens you'll see **Paused** and a **Resume** button — one tap re-authorizes it. This is normal and not an error. If you ever don't click Resume, your manual backup (above) is always there as a fallback.

iPhone and iPad don't support this automatic feature yet — on those devices, use the manual backup above and add the app to your home screen.

### If You See "Your local data was cleared"

Phone and tablet browsers sometimes delete a website's stored data when the device runs low on space — this is the browser's doing, not a bug in Care Guardian. If it happens, you'll see a recovery screen rather than losing access silently.

**To recover:** have your most recent `.care` backup file ready, enter the backup passcode you used when you created it, choose the file, and then set new passcodes. Your records will be restored.

**To reduce the chance of this happening:** add Care Guardian to your home screen (tap your browser's Share button, then "Add to Home Screen"). Installed apps get more durable storage. And keep current backups — a recent backup means an eviction costs you minutes, not data.

---

## Navigation

Care Guardian uses a hub-and-spoke layout. Four hubs at the bottom of the screen:

**☀ Today** — your daily dashboard. Shows what needs attention right now.
**♥ Care plan** — the strategic view. Domains, triggers, documentation.
**📁 Records** — everything that gets logged. Incidents, meds, expenses, documents.
**👥 Team** — communication and coordination. Messages, sync, settings.

Tap any card within a hub to go deeper. The ← back button returns one level. Maximum 3 taps to reach any feature.

### 🔍 Search

The magnifying glass in the top bar opens universal search. Type at least 2 characters to find features by name or keyword, and search across all stored data — incidents, contacts, documents, medications, messages, expenses, self-reports, and POA decisions.

---

## Today Hub

The Today hub is a smart dashboard that shows time-aware, prioritized reminders:

- **❌ Missed medications** — past their time window without being logged
- **💊 Medications due now** — in the current time window
- **⏰ Coming up** — meds due in the next hour
- **📅 Upcoming appointments** — within 48 hours
- **🔴 Overdue recurring tasks** — past their scheduled interval
- **🟡 Tasks due this week** — approaching their interval
- **✓ All clear** — nothing needs attention

Medication time windows: Morning (6–10am), Midday (10am–1pm), Afternoon (1–5pm), Evening (5–8pm), Bedtime (8–11pm).

### Quick Actions

- **📋 Shift handoff** — summary of everything since last sync for the incoming caregiver
- **⚠ Log incident** — quick path to the incident form
- **🗣 Self-report** — mood, pain, sleep, voice note
- **🆔 Emergency info card** — printable wallet card with diagnoses, meds, contacts
- **💛 Caregiver check-in** — track your own stress, sleep, and respite

### Browser Notifications

Enable in Settings → Notifications. The app checks every 15 minutes and sends a browser notification when medications are due. Works when the tab is in the background.

---

## Tiered Access

| Role | Who | What They See |
|------|-----|---------------|
| **Admin** 👑 | POA holder, primary decision-maker | Everything |
| **Family** 👨‍👩‍👧 | Siblings, spouse, close family | Everything except team/settings management |
| **Care Professional** 🩺 | Aides, nurses, therapists | Health domains, incidents, meds, shifts, messages, emergency plans |
| **Client (Independent)** 🟢 | Care recipient — full autonomy | All domains, export, self-reports |
| **Client (Supported)** 🛡 | Care recipient — simplified | Their own view: schedule, medications, messages, self-reports, and care progress |

Admin assigns roles in the team roster and can toggle the client between Independent and Supported mode.

### What the Supported Client Experiences

When your loved one signs in with the client passcode in Supported mode, they see a calm, simplified version of the app: today's schedule, their medications, family messages, their care progress, and a place to share how they're feeling. They genuinely cannot reach legal, financial, incident, or planning records — not because those screens are hidden, but because their passcode unlocks a separate key that cannot decrypt them. This protects their dignity (no stumbling into end-of-life planning) and the family's records (a shared or guessed client passcode exposes nothing private).

Anything they submit — a mood, a voice note, a concern — is saved securely on the device and delivered to the care team the next time a caregiver signs in there. Their updates are **permanent**: nobody, including the Admin, can delete or change the care recipient's own words. They'll see a small note telling them so ("Your updates are permanent — they can't be deleted or changed by anyone"), because knowing you can't be silently edited matters.

If you switch the client between Supported and Independent mode, the change takes effect at their next sign-in.

---

## Multi-Factor Authentication (optional, for professionals)

If you sign in as **Admin** or **Care Professional**, you can add a second lock to the vault: a **passkey** — your phone's Face ID / fingerprint, or a hardware security key. With MFA on, opening the vault requires your passcode **and** your passkey. Neither alone works, even for someone who extracts the device's storage — this is real encryption-level protection, not just an extra screen.

### Turning It On
1. Go to **Team → Settings → Multi-factor authentication** and tap **Enable**.
2. Confirm your caregiver passcode, then follow your device's passkey prompt (Face ID, fingerprint, or security key tap).
3. You'll be shown a **one-time recovery code**. Write it down or print it, and store it **away from this device** — a password manager, or a locked drawer somewhere else. Anyone who has both this code and the caregiver passcode can sign in without the passkey, so treat it like a spare key. You must confirm you've stored it separately before MFA turns on.

Nothing is removed until both new factors are verified to work, so a failed setup can never lock you out.

### Signing In with MFA
Enter your passcode as usual, then approve the passkey prompt. Lost your passkey? Tap **Use a recovery code instead** — the code works once, and a fresh one is issued.

### Backup Passkey (recommended for the security-conscious)
You can register a **second passkey** — for example, a hardware key kept in a safe. With two passkeys registered, you can remove the paper recovery code entirely, eliminating the "someone found the paper" risk. Be careful: after removing it, losing **all** your passkeys means the data cannot be recovered.

### Device Notes
- **iPhone / iPad:** use the built-in passkey (Face ID / iCloud Keychain). External security keys (like YubiKeys) don't currently work for this feature on iPhone — that's an Apple platform limitation, not a bug.
- **Android, Chrome, Edge on desktop:** both built-in passkeys and hardware security keys work well.
- If your device says it can't support the required passkey feature, MFA simply doesn't turn on and nothing changes — you can keep using your passcode, or try a different device.

### Turning It Off
Settings → Multi-factor authentication → **Turn off MFA**. Requires your passcode and a passkey tap (so a stolen passcode alone can't strip the protection).

---

## Care Domains & Task Taxonomy

Five domains: Physical Health, Cognitive Health, Wellness, Legal Safety, Financial Security. Each contains goals with typed sub-tasks:

| Type | Icon | How It Works |
|------|------|-------------|
| **One-time** | ☐ | Check it off. Counts toward Foundation bar. |
| **Recurring** | ↻ | Tap ✓ to mark attended. Shows recency. Feeds reminder engine. |
| **Monitoring** | ◉ | Tap ✓ to mark observed. 30-day freshness. |

The strategic overview grid at the top of the Care Plan hub shows all domains at a glance.

---

## Clinical Features

### 📋 Incident Log
9 types, 4 severity levels. Structured fields: description, response, injuries, provider notified. Attach up to 3 photos per incident (2MB each). Care Professionals can add but not delete.

Tip: saving any new record (incident, expense, contact, document) resets that list's filter to **All**, so what you just logged is always immediately visible.

### 📊 Incident Patterns
Available with 3+ incidents. Shows: type distribution, severity distribution, time-of-day histogram (identifies sundowning), and 8-week trend line.

### 💊 Medication Admin
Add medications with time slots. Daily grid: tap to cycle (not logged → given ✓ → missed ✗ → refused ⊘). Start dates tracked automatically. Discontinued meds are archived (not deleted) with restore capability.

### 📄 Document Scanner
Upload PDFs or text files. Client-side extraction via pdf.js — nothing uploaded. Regex parsers identify ~200 medications and lab results.

### 📚 Document Library
Saved documents with full content. 10 categories. Filter and view structured content.

### 🗣 Self-Reports
6 types: text, voice (MediaRecorder API), mood, pain, sleep, concern. Attach photos. CSV/text export and print.

Reports written **by the care recipient** are permanent — marked with 🔏, they can never be deleted or edited by anyone, in any role, and each is sealed into a tamper-evident chain (you can confirm it's intact under Settings → Security & Integrity → "Client voice protection"). Reports written by caregivers on the client's behalf can still be deleted under the normal role rules.

### 🆔 Emergency Info Card
One-tap printable card: client name, diagnoses, current medications, emergency contacts, advance directive status. Post on the fridge, keep in wallet, hand to paramedics.

### 🚨 Emergency Plans & Escalation Triggers
6 editable emergency scenario cards. 12 monitored escalation conditions.

---

## Legal & Documentation

### ⚖ POA Decision Log
Document decisions made under power of attorney. Seven types: Medical, Financial, Legal, Housing, Care, Safety, Other. Three urgency levels. Six structured fields:

- **What decision was made** (required)
- **Reasoning and justification**
- **Known wishes of the principal**
- **Who was consulted**
- **Outcome / Next steps**
- **Agent** (auto-captured)

Creates a defensible legal record. Exportable to clipboard. Included in the care plan binder.

### 📝 Capacity Observations
12 functional areas (hygiene, dressing, eating, mobility, communication, recognizing family, orientation, decisions, finances, medications, cooking, driving) × 5-level scale. Timestamped with assessor name. Tracks decline trajectory for legal and clinical use.

### 📖 Care Plan Binder
Comprehensive printable document: diagnoses, medications with history, emergency contacts, legal status, daily routine, behavioral notes, recent incidents, capacity assessment, POA decisions, care team. Copy or print. For facility admission, new aide onboarding, or specialist visits.

---

## Coordination

### ✉ Messages
Team chat. Avatar/role display from roster. Your messages highlighted.

### 📋 Shift Handoff
Summary of activity since last sync: incidents logged, medications still due, recent messages, domain alerts. One screen for the incoming caregiver.

### 👥 Shifts & Calendar
7×7 weekly shift grid. Month-view calendar with appointments.

### 📇 Contacts
Name, phone, email, organization, role, category, custom fields, notes. vCard import.

---

## Caregiver Support

### 💛 Caregiver Check-in
Track stress (4 levels), sleep quality (4 levels), hours of care, and notes. History accumulates. Days since last respite day are tracked. After 7 days without a day off: yellow warning. After 14: red alert at the top of the Today hub.

---

## Sync

### Setting Up a Team
1. Create a team → you become Admin
2. Share invite code (does NOT contain API key or sync passcode)
3. Share sync passcode separately (verbally or secure message)

### Three Sync Methods
- **☁️ Cloud folder** — shared Google Drive/Dropbox/iCloud folder
- **🖥 Self-hosted server** — deploy sync-server.js
- **Manual** — clipboard, file, URL (under Advanced)

### Reviewing Incoming Changes
When you import or pull data, the app shows a merge preview — what's new, what's updated, and anything flagged — before changes apply. If an incoming update is unusually large (a flood of records or an oversized file), it is **not applied automatically**; you'll see a clear warning and can review before accepting. This protects the whole team if one device is corrupted or misbehaving. Similarly, if pending client updates on a device look abnormally large, they're quarantined and shown in Settings → Security & Integrity for you to review or discard.

### Sync Lock
After 14 days or 50 unsynced changes, the app locks until you sync. Warning appears at 7 days. Only triggers after your first sync (not on new installs).

---

## Settings

- **Security & Integrity** — one panel showing your protection status: audit-log integrity, client voice protection, whether durable storage is granted, storage usage, and client-access scoping
- **Multi-factor authentication** — see the section below (Admin and Care Professional roles)
- **Notifications** — enable browser notifications for medication reminders
- **State/Region** — toggle Generic or state-specific mode
- **Passcodes** — change caregiver and client passcodes (Admin only)
- **Tab Order** — customize navigation
- **Export/Import** — encrypted backups with merge engine
- **FHIR R4 Import** — health record bundles

### 🌙 Dark Mode
Automatic — follows your system preference. All components styled for both modes. Print always uses light.
