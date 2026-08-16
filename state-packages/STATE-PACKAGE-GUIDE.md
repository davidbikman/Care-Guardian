# State Package Authoring Guide

How to create a state-specific content package for Care Guardian.

---

## What a state package is

Care Guardian organizes dementia care into five domains — Physical Health, Cognitive Health, Wellness, Legal Safety, and Financial Security — each with goals and concrete sub-tasks. A **state package** fills those domains with content specific to one U.S. state: its Medicaid program names, eligibility thresholds, statute citations, agencies, and phone numbers.

Oregon is the reference implementation (`oregon.statepackage.js`): ~50 goals and ~326 sub-tasks carrying real ORS citations, OSIPM thresholds, APD/ICP/OPI-M program names, and Oregon agency contacts. When no state package is selected, the app falls back to **Generic** mode — universal guidance with no state-specific detail.

A state package is **pure content**. You write descriptions and task lists. You never touch the app's code, styling, icons, or colors. The structure is plain data that a non-programmer can read, verify, and edit.

---

## Who should author one

The hard part of a state package is **not** technical — it is legal and benefits accuracy. A wrong Medicaid threshold or a miscited statute in a tool families rely on for real decisions is worse than no state package at all.

So a state package should be authored or verified by someone with genuine domain knowledge of that state: an **elder-law attorney**, a **geriatric care manager / aging life care professional**, a benefits counselor, or an equivalent expert. The structural validator (below) catches mechanical mistakes; only a qualified human can confirm the content is correct.

If you are a developer without that knowledge, the most useful thing you can do is partner with such a professional — you handle the format, they supply and verify the content.

---

## The format

A package is a single file (copy `TEMPLATE.statepackage.js`). It defines one object:

```js
const STATE_PACKAGE = {
  stateCode: "MI",            // two-letter postal code, uppercase
  stateName: "Michigan",      // human-readable name
  version: "1.0",
  author: "Jane Doe, Elder Law Attorney, [bar number]",
  lastReviewed: "2026-01",    // YYYY-MM — when citations/thresholds were last verified
  content: {
    physical:  { desc: "...", goals: [ ... ] },
    cognitive: { desc: "...", goals: [ ... ] },
    wellness:  { desc: "...", goals: [ ... ] },
    legal:     { desc: "...", goals: [ ... ] },
    financial: { desc: "...", goals: [ ... ] }
  }
};
```

All five domain keys are **fixed and required** — keep all five. Each domain has:

- **`desc`** — a one-line description of what the domain covers, with a nod to your state's relevant programs.
- **`goals`** — an ordered list of goals. Each goal is `{ title, subs }`.

Each **goal** is:

```js
{ title: "Medicaid application submitted and tracked", subs: [ ...sub-tasks... ] }
```

Each **sub-task** is the smallest unit and uses the task taxonomy:

```js
{ t: "Apply through the state Medicaid portal", k: "O" }
```

- **`t`** — the task text (max 300 characters), written plainly for a stressed, non-expert family caregiver.
- **`k`** — the task **kind**, one of three:

| Kind | Meaning | Behavior in app | Example |
|------|---------|-----------------|---------|
| `"O"` | **One-time** | A checkbox done once; counts toward the Foundation progress bar | "Apply for Medicaid long-term care" |
| `"R"` | **Recurring** | Timestamped; goes stale after its interval and prompts renewal | "Renew Medicaid eligibility" (`d: 365`) |
| `"M"` | **Monitoring** | Ongoing observation with a freshness window | "Monitor for swallowing difficulties" |

- **`d`** — **only** for recurring (`"R"`) tasks: the repeat interval in **days**. For example `d: 365` for an annual renewal, `d: 180` for twice-yearly, `d: 14` for a fortnightly check-in. Omit `d` for one-time and monitoring tasks.

---

## What belongs in each domain

- **physical** — PCP and specialists, medication management, nutrition, mobility, durable medical equipment, dental/vision/hearing. State angle: which Medicaid plan/managed-care organization, what's covered, single-pharmacy rules.
- **cognitive** — home safety, wandering prevention, routines, cognitive engagement, driving cessation, capacity awareness. State angle: state safety programs, ID/registry programs for wandering.
- **wellness** — social connection, caregiver support and respite, mental health, spiritual care. State angle: the state's Family Caregiver Support Program, respite waiver benefits, Area Agency on Aging services.
- **legal** — advance directives, durable POA (healthcare and financial), guardianship/conservatorship, HIPAA authorizations. State angle: cite the state's statutes for each instrument; name the state's advance-directive form.
- **financial** — Medicaid eligibility and application, asset/spend-down rules, estate recovery, benefits (SSI/SSDI/VA), fraud protection. State angle: the state's specific long-term-care Medicaid programs, income/asset limits, look-back and estate-recovery rules.

---

## Writing good content

- **Write for the caregiver, not the lawyer.** "Ask the attorney about a durable power of attorney under [statute]" — not a paragraph of legal analysis. The citation can live in the task text so the curious can follow it, but the instruction must be plain.
- **Be specific to the state.** The whole point is specificity. "Apply through MI Bridges" beats "apply for Medicaid." Name the program, the portal, the agency, the form.
- **Cite verifiable sources.** Put statute citations and program names where a professional could check them. Mark your `lastReviewed` date honestly.
- **Choose the right kind.** Most setup tasks are one-time (`O`). Things that expire or must repeat (eligibility renewal, medication reconciliation, respite scheduling) are recurring (`R`) with a sensible interval. Things you watch continuously (weight, mood, wandering) are monitoring (`M`).
- **Keep tasks atomic.** One action per sub-task. If a task has an "and" in it, consider splitting.
- **Mirror Oregon's depth as a benchmark**, not a script. Oregon averages ~6–7 sub-tasks per goal across ~10 goals per domain. You don't have to match it exactly, but that's the level of usefulness to aim for.

---

## Workflow

1. **Copy the template.** `cp TEMPLATE.statepackage.js michigan.statepackage.js`
2. **Fill in the content** with your state's specifics. Read Oregon (`oregon.statepackage.js`) as a worked example.
3. **Validate the structure.** `node validate-package.js michigan.statepackage.js` — fix any errors it reports. A clean run means the *shape* is correct.
4. **Get a qualified human legal review.** The validator cannot check accuracy. Before a package is included, an elder-law professional for that state should confirm the citations, thresholds, program names, and agency contacts are current and correct. Record who did this in `author` / `lastReviewed`.
5. **Submit** the file for inclusion (and ideally volunteer to maintain it).

---

## How it gets included

Inclusion is a small, mechanical step for a core maintainer: the validated package's `content` object is added to the in-app `STATE_PACKAGES` registry under its state code, keyed by `stateName`. The state then appears automatically in the app's state selector (the available-states list is derived from the registry), and `buildDomains()` merges the content with the app's domain styling. No other code changes are required — which is the entire point of the separation.

---

## Maintenance

A state package is a living document. Medicaid thresholds change annually; statutes are amended; agencies and phone numbers change. A package is only as trustworthy as its last review. Owning a state means committing to re-check it periodically (at least yearly) and bumping `version` / `lastReviewed` when you do. This is why contributed packages work best when a professional in that state **owns** their package rather than authoring it once and walking away.

---

## A note on honesty

Care Guardian's value rests on being accurate where it claims to be specific. A half-finished or stale state package that *looks* authoritative is a liability. It is better to ship Generic mode for a state than a state package no one has verified. When in doubt, leave content out and say so, rather than guessing — the same principle the rest of the project follows.
