/*
 * Care Guardian — State Package TEMPLATE
 * Format version: 1.0
 *
 * Copy this file, rename it to your state (e.g. michigan.statepackage.js),
 * and fill in the content. You are writing DATA, not code — descriptions and
 * task lists for each of the five care domains, specific to your state's
 * Medicaid programs, statutes, agencies, and thresholds.
 *
 * You do NOT touch icons, colors, or any app logic. Only the text below.
 *
 * Read STATE-PACKAGE-GUIDE.md first. Validate with:  node validate-package.js your-file.js
 */
const STATE_PACKAGE = {
  stateCode: "XX",            // Two-letter postal code, e.g. "MI"
  stateName: "Your State",    // e.g. "Michigan"
  version: "1.0",
  author: "",                 // e.g. "Jane Doe, Elder Law Attorney, [bar number]"
  lastReviewed: "2026-01",    // YYYY-MM — when you last verified the citations/thresholds

  // The five domains are FIXED. Keep all five keys. Fill each with a description
  // and a list of goals. Each goal has a title and a list of sub-tasks.
  //
  // Each sub-task is:  { t: "the task text", k: "O" }
  //   t = the task text (max 300 characters), written for a non-expert caregiver
  //   k = the task KIND, one of:
  //         "O" = One-time      (a checkbox; done once — e.g. "Apply for Medicaid")
  //         "R" = Recurring     (needs a repeat interval — add  d: <days>)
  //         "M" = Monitoring    (ongoing observation — e.g. "Watch for weight loss")
  //   d = ONLY for recurring ("R") tasks: the interval in days (e.g. d: 180)
  //
  // Example recurring task:   { t: "Renew Medicaid eligibility", k: "R", d: 365 }
  // Example monitoring task:  { t: "Monitor for new wandering behavior", k: "M" }

  content: {
    physical: {
      desc: "Mobility, medications, nutrition, sleep, and medical appointments — [add your state's program/provider notes]",
      goals: [
        { title: "Primary care physician identified and aware of diagnosis", subs: [
          { t: "Verify the PCP accepts [your state's Medicaid program name]", k: "O" },
          { t: "Schedule initial visit and share dementia diagnosis records", k: "O" },
          { t: "Add PCP to dashboard Contacts with office and nurse line info", k: "O" }
        ]},
        // Add more physical-health goals...
      ]
    },
    cognitive: {
      desc: "Memory support, safety, routines, and cognitive engagement",
      goals: [
        { title: "Home safety assessed for cognitive decline", subs: [
          { t: "Complete a home safety walkthrough (stairs, stove, locks, wandering risks)", k: "O" },
          { t: "Re-check the home environment as abilities change", k: "R", d: 180 },
          { t: "Monitor for new confusion, wandering, or unsafe behaviors", k: "M" }
        ]},
        // Add more cognitive goals...
      ]
    },
    wellness: {
      desc: "Social connection, caregiver support, respite, and emotional wellbeing",
      goals: [
        { title: "Caregiver support and respite established", subs: [
          { t: "Contact [your state's] Family Caregiver Support Program via the local Area Agency on Aging", k: "O" },
          { t: "Schedule regular respite breaks for the primary caregiver", k: "R", d: 14 }
        ]},
        // Add more wellness goals...
      ]
    },
    legal: {
      desc: "Advance directives, powers of attorney, guardianship, and legal protections — [your state] statutes",
      goals: [
        { title: "Durable power of attorney in place", subs: [
          { t: "Consult an elder-law attorney about a durable POA under [cite your state statute]", k: "O" },
          { t: "Store the executed POA in the Document Library", k: "O" }
        ]},
        // Add more legal goals...
      ]
    },
    financial: {
      desc: "Medicaid eligibility, benefits, asset protection, and estate recovery — [your state] programs",
      goals: [
        { title: "Medicaid application submitted and tracked", subs: [
          { t: "Determine which [your state] long-term-care Medicaid program applies", k: "O" },
          { t: "Apply through [your state's portal/office]", k: "O" },
          { t: "Follow up on application status until a decision is issued", k: "R", d: 14 }
        ]},
        // Add more financial goals...
      ]
    }
  }
};

if (typeof module !== "undefined") module.exports = STATE_PACKAGE;
