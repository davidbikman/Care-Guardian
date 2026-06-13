# Privacy Principles for Caregiving Software

*A standard for software that holds the medical, legal, and financial lives of people who can no longer fully protect their own.*

**Version 1.0**

---

## Why this exists

Caregiving software occupies a uniquely sensitive position. It holds a person's diagnoses, medications, behavioral decline, financial accounts, legal documents, and the private decisions a family makes on their behalf. It is used at the most vulnerable moment of a family's life, often by people with no technical sophistication, frequently on behalf of someone who is losing the capacity to consent.

The people whose data this software holds are, by the nature of their condition, progressively less able to understand where their information goes, object to its use, or hold a company accountable. This is precisely the population that surveillance-based business models are most able to exploit and least likely to be challenged by.

Most software built for this market follows the conventional playbook: data flows to company servers, usage is tracked, behavior is analyzed, and the resulting dataset becomes an asset — to be monetized, sold in an acquisition, or exposed in a breach. The people in the data have no say and often no knowledge.

These principles describe a different standard. They are not aspirational. Each is concrete, and each is verifiable. They are written so that any developer, vendor, agency, or advocate can adopt them, hold software accountable to them, or build to meet them. The goal is not to promote any single product but to establish what families, attorneys, care managers, and clinicians should be able to expect — and demand — from the software entrusted with a vulnerable person's life.

---

## The Principles

### 1. Local-first by default

A person's care data lives on their own device, under their own control, not on a company's servers. The software functions fully without transmitting data anywhere. Where data must move — to sync across a care team — it moves directly between the people who need it, or through infrastructure the family controls, never through a vendor who retains a copy.

**Why it matters:** Data that never leaves the device cannot be breached at the vendor, subpoenaed from the vendor, sold by the vendor, or exposed when the vendor is acquired or fails. The vendor cannot lose what it never held.

**How to verify:** Inspect network traffic. A compliant application makes no calls to vendor servers during normal use. Any transmission is initiated explicitly by the user and is end-to-end encrypted.

### 2. Encrypted at rest, without exception

All sensitive data is encrypted on the device using current cryptographic standards. Encryption is not a premium tier, an optional setting, or a feature that can be disabled. There is no mode in which protected health information is written to storage in plaintext.

**Why it matters:** A lost or stolen device is the most common real-world threat to a family's data. Under recognized standards, data encrypted to the appropriate level is unreadable to anyone without the key — which, for a caregiving application, means a lost phone is a non-event rather than a breach.

**How to verify:** Examine the application's storage. No protected health information should be readable without the user's credential. The encryption method should be documented and use a published, peer-reviewed algorithm.

### 3. No surveillance, ever

The software contains no tracking, no analytics, no telemetry, no behavioral measurement, no advertising, and no third-party data collection. The vendor does not know who uses the software, how often, which features they use, or whether they opened it today. The software is structurally incapable of reporting on its users.

**Why it matters:** "Anonymized" analytics are routinely re-identified, and usage data about a dementia patient's care is itself sensitive. The only guarantee that data won't be misused is that it is never collected. A vendor that cannot measure its users cannot betray them.

**How to verify:** Inspect network traffic and the codebase. There should be no analytics libraries, no tracking pixels, no telemetry endpoints, and no calls to measurement services.

### 4. Minimum necessary access

Each person involved in care sees only what their role requires. A hired aide sees the care information needed to do their job — not the family's finances, estate plans, or legal disputes. The person being cared for sees what is appropriate to their capacity and their wishes. Access is structured, not merely promised.

**Why it matters:** A care team is not a single trust boundary. The overnight aide, the estranged sibling, the geriatric care manager, and the patient themselves have different legitimate needs. Software that shows everyone everything forces families to choose between coordination and privacy. The minimum-necessary principle — the foundation of health privacy law — should be built into the structure of the software, not left to social convention.

**How to verify:** Confirm that access tiers exist, that they are enforced in the application's logic (not merely hidden in the interface), and that sensitive categories are genuinely inaccessible to roles that should not see them.

### 5. The dignity of the person in the data

The person being cared for is not a passive subject of the software. While they retain capacity, they have their own access to their own information — including the ability to see their records, express their wishes in their own words, and export their own data. As capacity declines, access can be adjusted by their authorized representative, but the default honors their autonomy, and the transition is gradual, reversible, and controlled by a trusted human rather than an algorithm.

**Why it matters:** This is the principle unique to caregiving software. The temptation is to treat the patient as an object the family manages. But a person with early-stage dementia is still a person with preferences, fears, and the right to participate in their own care. Software that erases their agency from the start participates in their diminishment. Software that preserves it, for as long as possible, respects it.

**How to verify:** Confirm the application provides the care recipient their own access path, the ability to contribute their own perspective, and that any reduction in their access is a deliberate, documented, reversible act by an authorized person.

### 6. Portable and free of lock-in

A family's data belongs to the family. They can export it, in full, in an open and documented format, at any time, without permission and without cost. They are never held hostage to a subscription, a vendor's continued existence, or a proprietary format. Ideally, the software itself is open source, so that the family's ability to use their own tools never depends on the vendor's survival or goodwill.

**Why it matters:** Caregiving spans years. Vendors fail, get acquired, change their terms, and raise their prices. A family that has documented a decade of care must not lose it because a company changed direction. Portability is the family's insurance against the vendor.

**How to verify:** Confirm a full data export exists, produces an open format, requires no payment, and that the exported data is complete enough to reconstruct the record elsewhere.

### 7. Verifiable, not merely asserted

Security and privacy claims are published and checkable, not marketing copy. The software's architecture, encryption methods, data flows, and known limitations are documented openly. Where possible, the source code is available for inspection. Claims of compliance are accompanied by the reasoning that supports them.

**Why it matters:** "We take your privacy seriously" is what every breached company said the day before the breach. Trust in software that holds a vulnerable person's life should be earned through evidence, not requested through assurances. A vendor confident in its privacy should be willing to show its work.

**How to verify:** The documentation exists, is specific, and describes not only what the software does well but what it cannot protect against. Vague or absent documentation is itself a finding.

### 8. The data is never the business model

The software is not funded by monetizing the data it holds. Revenue, where it exists, comes from services openly provided to the people who choose to pay — support, hosting, professional features — never from the information of the people being cared for. The interests of the vendor and the interests of the vulnerable person are not placed in conflict.

**Why it matters:** When data is the product, the user is the inventory. Every design decision in a data-monetizing company eventually bends toward extracting and retaining more data. A caregiving tool whose revenue depends on its users' information cannot be trusted to protect that information, because protecting it would mean destroying its own business.

**How to verify:** Examine the funding model. It should be legible, and it should not depend on access to, aggregation of, or sale of user data.

### 9. Honest about what it cannot protect

The software discloses its limitations plainly. It does not overclaim. It tells users what threats it does not defend against, what depends on their own behavior, and where the boundaries of its protection lie. It treats the user as an adult capable of understanding risk.

**Why it matters:** Overclaiming is its own betrayal. A family that believes their data is protected against threats it is not protected against will make decisions based on false confidence. Honesty about limits is what separates a trustworthy tool from a confident one.

**How to verify:** The documentation includes a candid account of limitations, residual risks, and the user's own responsibilities. The absence of any stated limitation is a sign of dishonesty, not perfection.

### 10. Alerts are routed to people equipped to act on them — never to the person they are about

Security warnings, integrity alerts, and anomaly signals are delivered to the people who can understand and act on them, through channels that create accountability. They are never displayed to a cognitively vulnerable person as a burden they cannot carry. A protection mechanism may guard the care recipient's interests without recruiting the care recipient as its alarm bell. When a signal cannot be shown safely, the software stays quiet to the vulnerable person — withholding false reassurance, but never raising an alarm they cannot evaluate — and routes the alarm to durable records and capable hands instead.

**Why it matters:** A person with dementia may already struggle to trust their own memory, and suspicion that family members are interfering with their things is a common symptom of the disease itself. A system message telling such a person that their records "may have been altered" does not protect them — it validates a frightening frame they cannot test, and instructs them to confide in someone who may be the very subject of the warning. The measure of an alert is not that it was honest, but that it reached someone who could do something about it. Routing matters as much as truth.

**How to verify:** Trace each warning the software can produce to its audience. Confirm that no integrity or security alarm is presented to a user whose role implies diminished capacity to evaluate it; that the same condition is surfaced to accountable parties and recorded durably; and that the vulnerable person's interface degrades to silence, never to false comfort.

---

## What these principles deliberately do not require

A standard that demands the impossible will be adopted by no one. These principles are intentionally achievable. They do not require:

- **A specific technology, language, or platform.** The principles describe outcomes, not implementations.
- **Perfect security.** No software is unbreakable. The principles require honest, current, verifiable protection — not invulnerability.
- **That the software be free of charge.** A vendor may charge for the software, for hosting, or for support. The principles govern *how* revenue is earned, not *whether*.
- **That every feature work offline.** Some features legitimately need connectivity. The principle is that core care data is not held hostage to it, and that connectivity does not become surveillance.
- **Open source as an absolute.** Open source best satisfies several principles, and is strongly encouraged, but a closed-source vendor that meets the verifiable, portable, and non-surveilling standards can still substantially comply.

The bar is meaningful but reachable. That is the point. A standard only sets a standard if others can meet it.

---

## Adopting these principles

Any developer, vendor, agency, or advocate may adopt these principles. To do so credibly:

1. **Publish your alignment.** State which principles your software meets, and document how — with the specificity that Principle 7 requires.
2. **Name your limitations.** Per Principle 9, state honestly where you fall short or where protection ends.
3. **Invite verification.** Make the architecture, data flows, and where possible the source available for inspection.
4. **Revisit as you change.** A claim of alignment is a commitment to maintain it. Software changes; the principles should be re-checked when it does.

Adoption is not certification. There is no authority that grants compliance, because an authority that could grant it could also sell it. Compliance is a matter of public, verifiable evidence — which is the only kind of compliance worth anything to a family deciding whom to trust with their parent's life.

---

## A note to the families, attorneys, and care managers who will use this

You do not need to understand cryptography to use this standard. You need only to ask the vendors of the software you are considering a few direct questions:

- *Where does my data live, and can you read it?*
- *What do you collect about how I use this, and who else receives it?*
- *If your company disappears tomorrow, do I keep my data?*
- *How is this software paid for?*
- *What can this software not protect me from?*

A vendor who can answer these plainly, specifically, and without discomfort is a vendor worth considering. A vendor who deflects, obscures, or bristles has told you what you need to know.

The people in your care cannot ask these questions for themselves. That is exactly why they must be asked.

---

*These principles are offered freely for adoption, adaptation, and citation. They belong to no company and require no permission to use.*
