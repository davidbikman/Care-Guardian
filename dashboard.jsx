import { useState, useEffect, useRef, Fragment } from "react";

/* ═══════════════ CONSTANTS ═══════════════ */
const CONTACT_CATS = [
  { key: "medical", label: "Medical", icon: "♥", color: "#b56576" },
  { key: "care", label: "Care & Support", icon: "✿", color: "#718355" },
  { key: "legal", label: "Legal", icon: "⚖", color: "#457b9d" },
  { key: "financial", label: "Financial", icon: "◈", color: "#bc6c25" },
  { key: "family", label: "Family", icon: "⌂", color: "#6d6875" },
  { key: "other", label: "Other", icon: "◉", color: "#8d99ae" },
];

const INCIDENT_TYPES = [
  { key:"fall",label:"Fall",icon:"⚠" },{ key:"wandering",label:"Wandering",icon:"🚶" },
  { key:"behavioral",label:"Behavioral Episode",icon:"⚡" },{ key:"medication",label:"Medication Issue",icon:"💊" },
  { key:"medical",label:"Medical Symptom",icon:"🩺" },{ key:"uti",label:"Possible UTI/Infection",icon:"🌡" },
  { key:"injury",label:"Injury",icon:"🩹" },{ key:"elopement",label:"Elopement Attempt",icon:"🚪" },
  { key:"other",label:"Other",icon:"📝" },
];
const SEVERITY_LEVELS = [
  { key:"low",label:"Low",color:"#718355",bg:"#e8f0df" },
  { key:"moderate",label:"Moderate",color:"#bc6c25",bg:"#fdf0d5" },
  { key:"high",label:"High",color:"#b56576",bg:"#fde2e8" },
  { key:"critical",label:"Critical",color:"#8b0000",bg:"#fdd" },
];

const EXPENSE_CATS = [
  { key:"medical",label:"Medical / Copay" },{ key:"pharmacy",label:"Pharmacy / Medications" },
  { key:"homecare",label:"Home Care / Aide" },{ key:"housing",label:"Housing / Rent / Mortgage" },
  { key:"utilities",label:"Utilities" },{ key:"food",label:"Food / Nutrition" },
  { key:"transport",label:"Transportation" },{ key:"insurance",label:"Insurance Premiums" },
  { key:"legal",label:"Legal Fees" },{ key:"homemod",label:"Home Modifications" },
  { key:"personal",label:"Personal Needs" },{ key:"funeral",label:"Prepaid Funeral / Burial" },
  { key:"exempt",label:"Exempt Purchase (Spend-Down)" },{ key:"other",label:"Other" },
];

const MED_TIME_SLOTS = ["Morning","Midday","Afternoon","Evening","Bedtime","As Needed"];

const DOC_CATEGORIES = [
  {key:"all",label:"All Documents",icon:"📄"},
  {key:"medications",label:"Medication Lists",icon:"💊"},
  {key:"labs",label:"Lab Results",icon:"🔬"},
  {key:"imaging",label:"Imaging / Radiology",icon:"📷"},
  {key:"clinical",label:"Clinical Notes",icon:"📋"},
  {key:"discharge",label:"Discharge Summaries",icon:"🏥"},
  {key:"insurance",label:"Insurance / EOB",icon:"📑"},
  {key:"legal",label:"Legal Documents",icon:"⚖"},
  {key:"correspondence",label:"Provider Correspondence",icon:"✉"},
  {key:"other",label:"Other",icon:"📁"},
];

const SELF_REPORT_TYPES = [
  {key:"text",label:"Text Update",icon:"✏"},
  {key:"audio",label:"Voice Note",icon:"🎤"},
  {key:"mood",label:"Mood Check-in",icon:"😊"},
  {key:"pain",label:"Pain Report",icon:"⚡"},
  {key:"sleep",label:"Sleep Report",icon:"🌙"},
  {key:"concern",label:"Concern / Question",icon:"❓"},
];
const MOOD_OPTIONS = ["😊 Good","🙂 Okay","😐 Fair","😟 Not great","😢 Bad"];
const PAIN_LEVELS = ["0 — None","1–2 — Mild","3–4 — Moderate","5–6 — Moderate-Severe","7–8 — Severe","9–10 — Worst possible"];
const EMPTY_CONTACT = { name:"",role:"",org:"",phone:"",email:"",category:"medical",notes:[],customFields:[] };
const STATUS_OPTS = [
  { value:"on-track",label:"On Track",color:"#718355",bg:"#e8f0df" },
  { value:"needs-attention",label:"Needs Attention",color:"#bc6c25",bg:"#fdf0d5" },
  { value:"urgent",label:"Urgent",color:"#b56576",bg:"#fde2e8" },
  { value:"not-started",label:"Not Started",color:"#8d99ae",bg:"#eef0f3" },
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TASK_TYPES={O:{key:"O",label:"One-time",icon:"☐",color:"#457b9d",desc:"Do once and it's done"},R:{key:"R",label:"Recurring",icon:"↻",color:"#bc6c25",desc:"Repeat on a schedule"},M:{key:"M",label:"Monitoring",icon:"◉",color:"#718355",desc:"Ongoing observation"}};


const DOMAIN_META = [
  { key:"physical",label:"Physical Health",icon:"♥",color:"#b56576",bg:"#fdf0f2" },
  { key:"cognitive",label:"Cognitive Health",icon:"◐",color:"#6d6875",bg:"#f3f0f5" },
  { key:"wellness",label:"Wellness",icon:"✿",color:"#718355",bg:"#f2f5ee" },
  { key:"legal",label:"Legal Safety",icon:"⚖",color:"#457b9d",bg:"#eef4f8" },
  { key:"financial",label:"Financial Security",icon:"◈",color:"#bc6c25",bg:"#fdf6ee" },
];

const DOMAINS_GENERIC = {
  physical:{desc:"Mobility, medications, nutrition, sleep, and medical appointments",goals:[
    {title:"Primary care physician identified and aware of diagnosis",subs:[{t:"Find a PCP who accepts Medicaid and is experienced with dementia patients",k:"O"},{t:"Schedule initial visit and share dementia diagnosis records",k:"O"},{t:"Request geriatric assessment referral if PCP is not geriatric-trained",k:"O"},{t:"Confirm PCP is enrolled with your Medicaid managed care plan",k:"O"},{t:"Add PCP to dashboard Contacts with office and nurse line info",k:"O"}]},
    {title:"Medication list reviewed and simplified",subs:[{t:"Gather all current prescriptions including OTC and supplements",k:"O"},{t:"Schedule medication reconciliation with PCP or pharmacist",k:"R",d:180},{t:"Review for anticholinergic or Beers Criteria medications inappropriate for dementia",k:"R",d:365},{t:"Set up pill organizer, blister packs, or auto-dispenser",k:"O"},{t:"Confirm all medications are covered under your Medicaid formulary",k:"R",d:365},{t:"Designate a single pharmacy to reduce errors",k:"O"}]},
    {title:"Fall risk assessment completed at home",subs:[{t:"Walk through home and note hazards (loose rugs, poor lighting, clutter)",k:"R",d:90},{t:"Request occupational therapy home evaluation through Medicaid",k:"O"},{t:"Remove tripping hazards from hallways, stairs, and bathroom",k:"O"},{t:"Install grab bars in bathroom and non-slip mats in tub/shower",k:"O"},{t:"Ensure adequate lighting — especially nightlights for nighttime orientation",k:"O"},{t:"Check if Medicaid waiver covers home modification costs",k:"O"}]},
    {title:"Dental and vision checkups scheduled",subs:[{t:"Find a dentist who accepts Medicaid",k:"O"},{t:"Schedule dental cleaning and comprehensive exam",k:"R",d:180},{t:"Schedule eye exam — check Medicaid coverage for annual exams",k:"R",d:365},{t:"Address any outstanding dental or vision needs",k:"O"}]},
    {title:"Nutritional needs assessed",subs:[{t:"Monitor for swallowing difficulties (dysphagia) and weight changes",k:"M"},{t:"Request speech therapy swallowing evaluation if needed",k:"O"},{t:"Consult dietitian — check Medicaid coverage for medical nutrition therapy",k:"O"},{t:"Explore local meal delivery services (Meals on Wheels, Area Agency on Aging)",k:"O"},{t:"Stock easy-to-prepare nutritious foods and ensure adequate hydration",k:"R",d:14}]},
    {title:"Sleep patterns documented for provider",subs:[{t:"Track nightly sleep times, wake-ups, and daytime napping",k:"M"},{t:"Note nighttime wandering, agitation, or sundowning episodes",k:"M"},{t:"Document sleep position and any breathing issues",k:"M"},{t:"Discuss findings with PCP — request sleep study referral if indicated",k:"R",d:180}]},
    {title:"Home safety modifications installed",subs:[{t:"Secure stairway handrails and check all stair treads",k:"O"},{t:"Install door alarms or childproof locks to prevent wandering",k:"O"},{t:"Remove or lock access to dangerous items (knives, chemicals, car keys)",k:"O"},{t:"Set water heater to 120°F maximum to prevent scalding",k:"O"},{t:"Check if Medicaid home and community-based services waiver covers modifications",k:"O"}]},
    {title:"Physical therapy or exercise routine established",subs:[{t:"Get PT referral from PCP — check Medicaid PT coverage",k:"O"},{t:"Confirm Medicaid authorization for PT visits",k:"O"},{t:"Identify simple daily exercises (walking, balance, stretching, chair yoga)",k:"O"},{t:"Maintain consistent exercise schedule with caregiver support",k:"M"},{t:"Look into community exercise programs through local senior centers",k:"O"}]},
    {title:"Emergency medical information prepared",subs:[{t:"Create wallet card with diagnoses, medications, allergies, and emergency contacts",k:"O"},{t:"Post emergency contacts and medical summary in accessible location",k:"O"},{t:"Register with local EMS/fire department vulnerable persons registry if available",k:"O"},{t:"Ensure medical alert device if parent is ever alone",k:"O"},{t:"Prepare a hospital go-bag with medication list, insurance cards, advance directive",k:"O"}]},
    {title:"In-home care through Medicaid explored",subs:[{t:"Contact your state's Medicaid office about in-home care eligibility",k:"O"},{t:"Research Medicaid Home and Community-Based Services (HCBS) waiver programs",k:"O"},{t:"Explore consumer-directed care options if available in your state",k:"O"},{t:"Interview and select home health aides from Medicaid-approved agencies",k:"O"},{t:"Establish schedule and care responsibilities — brief aides on dementia needs",k:"O"}]},
  ]},
  cognitive:{desc:"Diagnosis stage, cognitive assessments, therapies, and daily routines",goals:[
    {title:"Formal diagnosis obtained and documented",subs:[{t:"Schedule evaluation with neurologist or geriatric specialist who accepts Medicaid",k:"O"},{t:"Complete cognitive testing (MMSE, MoCA, or neuropsych battery)",k:"O"},{t:"Obtain written diagnosis letter specifying dementia type and stage",k:"O"},{t:"File copies with PCP, insurance, and Medicaid caseworker",k:"O"},{t:"Request diagnosis be coded in medical record for Medicaid LTC eligibility",k:"O"}]},
    {title:"Neurologist or geriatric specialist visits scheduled",subs:[{t:"Find a Medicaid-accepting neurologist",k:"O"},{t:"Schedule initial comprehensive evaluation",k:"O"},{t:"Confirm Medicaid prior authorization for specialist visits if required",k:"O"},{t:"Attend recurring follow-up visits",k:"R",d:180},{t:"Prepare questions and behavioral observations log for each visit",k:"R",d:180}]},
    {title:"Daily routine and structure established",subs:[{t:"Map out consistent wake, meal, activity, and bedtimes",k:"O"},{t:"Build in familiar enjoyable activities (music, gardening, walks)",k:"O"},{t:"Post large-print visual daily schedule in common area",k:"O"},{t:"Brief all caregivers and respite providers on the routine",k:"O"},{t:"Adjust routine seasonally — note impact of seasonal changes on mood",k:"R",d:90}]},
    {title:"Memory aids and orientation tools in place",subs:[{t:"Label cabinets, drawers, and rooms with clear text and pictures",k:"O"},{t:"Place large-face clocks showing day/date in key rooms",k:"O"},{t:"Set up whiteboard or dry-erase calendar for daily reminders",k:"O"},{t:"Install automatic night-lights for nighttime orientation",k:"O"},{t:"Consider GPS tracking device for keys, wallet, and person",k:"O"}]},
    {title:"Driving safety evaluated and plan made",subs:[{t:"Observe driving ability honestly — note any close calls or confusion",k:"M"},{t:"Request formal driving evaluation through DMV or occupational therapist",k:"O"},{t:"Review your state's DMV medical reporting requirements",k:"O"},{t:"Plan alternative transportation options",k:"O"},{t:"If needed, handle license surrender sensitively",k:"O"}]},
    {title:"Wandering risk assessed and mitigated",subs:[{t:"Evaluate current and likely future wandering behavior",k:"M"},{t:"Register with MedicAlert + Alzheimer's Association Safe Return program",k:"O"},{t:"Consider GPS tracking device, smartwatch, or shoe tracker",k:"O"},{t:"Secure doors with alarms, deadbolts, or childproof locks",k:"O"},{t:"Notify neighbors and local police of wandering risk",k:"O"},{t:"Add ID bracelet or clothing labels with name and phone number",k:"O"}]},
    {title:"Cognitive stimulation activities identified",subs:[{t:"Create personalized playlist of music from their youth",k:"O"},{t:"Find appropriate puzzles, art, gardening, or sensory activities",k:"O"},{t:"Look into adult day programs — check Medicaid coverage",k:"O"},{t:"Explore local memory café programs (Alzheimer's Association)",k:"O"},{t:"Rotate activities to maintain engagement — track what works",k:"M"}]},
    {title:"Behavioral changes documented for providers",subs:[{t:"Keep a daily log of new or worsening behaviors",k:"M"},{t:"Note triggers: time of day, hunger, overstimulation, pain, infection signs",k:"M"},{t:"Track sundowning patterns and environmental factors",k:"M"},{t:"Share documentation with neurologist at each visit",k:"R",d:180},{t:"Research stage-appropriate behavioral strategies",k:"O"}]},
    {title:"Communication strategies learned by all caregivers",subs:[{t:"Learn techniques: short simple sentences, patience, redirection, validation",k:"O"},{t:"Practice: approach from the front, eye contact, calm tone",k:"O"},{t:"Share written strategy guide with all caregivers and paid aides",k:"O"},{t:"Attend Alzheimer's Association caregiver education workshop",k:"O"},{t:"Learn to recognize and respond to nonverbal pain or discomfort cues",k:"O"}]},
    {title:"Dementia stage and progression tracked",subs:[{t:"Understand current stage (early vs. mid) and what to expect next",k:"O"},{t:"Schedule annual formal cognitive re-assessment with neurologist",k:"R",d:365},{t:"Discuss expected progression timeline with specialist",k:"R",d:180},{t:"Adjust care plan proactively as abilities change",k:"R",d:90},{t:"Document capacity observations in case legal capacity is questioned",k:"M"}]},
  ]},
  wellness:{desc:"Emotional wellbeing, social connection, dignity, and caregiver support",goals:[
    {title:"Preferred daily activities and comforts identified",subs:[{t:"Interview parent about favorite activities while they can communicate",k:"O"},{t:"Try different activities and note engagement level",k:"M"},{t:"Keep a comfort preferences list: favorite music, textures, foods, scents",k:"O"},{t:"Share preferences with all caregivers and respite providers",k:"O"},{t:"Update preferences as condition progresses",k:"R",d:90}]},
    {title:"Social connections and community maintained",subs:[{t:"Schedule regular visits from friends, family, and faith community",k:"R",d:14},{t:"Explore adult day programs for socialization",k:"O"},{t:"Set up simple video calls with distant family",k:"O"},{t:"Monitor for isolation, withdrawal, or depression",k:"M"},{t:"Connect with local senior centers for social activities",k:"O"}]},
    {title:"Music, art, or sensory activities explored",subs:[{t:"Create personalized playlist of music from their era",k:"O"},{t:"Try simple art projects: coloring books, watercolors, collage",k:"O"},{t:"Explore tactile activities: gardening, fabric sorting, dough kneading",k:"O"},{t:"Look into local memory café programs",k:"O"},{t:"Try pet therapy or arrange visits from therapy animals",k:"O"}]},
    {title:"Spiritual and cultural preferences honored",subs:[{t:"Discuss spiritual needs with parent while they can express preferences",k:"O"},{t:"Arrange regular visits from clergy or faith community",k:"R",d:30},{t:"Maintain cultural traditions, holidays, and meaningful rituals",k:"R",d:90},{t:"Ensure cultural dietary preferences are communicated to all caregivers",k:"O"}]},
    {title:"Depression and anxiety monitored",subs:[{t:"Learn signs of depression in dementia: appetite changes, withdrawal, tearfulness",k:"O"},{t:"Track mood changes over time in behavioral log",k:"M"},{t:"Discuss concerns with PCP or specialist",k:"R",d:180},{t:"Explore counseling or medication if appropriate",k:"O"},{t:"Monitor caregiver burnout as a factor affecting care recipient's mood",k:"M"}]},
    {title:"Caregiver support and respite established",subs:[{t:"Join Alzheimer's Association support group",k:"O"},{t:"Explore online caregiver forums (ALZConnected)",k:"O"},{t:"Contact your state's Family Caregiver Support Program through local AAA",k:"O"},{t:"Apply for Medicaid-covered respite care through waiver programs",k:"O"},{t:"Schedule regular respite breaks — even brief ones reduce burnout",k:"R",d:14}]},
    {title:"Respite care options researched and applied for",subs:[{t:"Check Medicaid waiver respite benefits in your state",k:"O"},{t:"Identify local respite care providers who accept Medicaid",k:"O"},{t:"Apply for any available respite grant programs through local AAA",k:"O"},{t:"Schedule regular respite breaks for primary caregiver",k:"R",d:14},{t:"Create a respite care instruction sheet for temporary caregivers",k:"O"}]},
    {title:"Personal grooming and dignity preserved",subs:[{t:"Maintain familiar grooming routines as much as possible",k:"M"},{t:"Adapt clothing for ease: elastic waists, velcro shoes",k:"O"},{t:"Ensure bath time is safe, warm, and comfortable",k:"O"},{t:"Respect modesty and preferences — same-gender aide if preferred",k:"M"},{t:"Maintain haircuts, nail care, and personal appearance for dignity",k:"R",d:30}]},
    {title:"Quality of life wishes discussed and documented",subs:[{t:"Have gentle conversations about what matters most while parent can express wishes",k:"O"},{t:"Document preferences: where they want to live, what brings joy, what they fear",k:"O"},{t:"Record wishes formally — attach to advance directive if appropriate",k:"O"},{t:"Share documented wishes with all family decision-makers",k:"O"},{t:"Revisit and update as condition progresses",k:"R",d:180}]},
    {title:"Family communication plan and conflict resolution",subs:[{t:"Designate primary point of contact for care updates",k:"O"},{t:"Set up group text or dashboard Messages for coordination",k:"O"},{t:"Hold regular family check-in calls",k:"R",d:14},{t:"Address disagreements early — consider family mediation",k:"O"},{t:"Clarify roles: who handles medical decisions, finances, daily care, respite",k:"O"},{t:"Document agreements in writing",k:"O"}]},
  ]},
  legal:{desc:"Powers of attorney, advance directives, guardianship, and elder protections",goals:[
    {title:"Durable Power of Attorney (financial) executed",subs:[{t:"Consult an elder law attorney in your state",k:"O"},{t:"Determine whether immediate or springing POA is appropriate under your state's law",k:"O"},{t:"Identify the best agent — must understand fiduciary duty",k:"O"},{t:"Draft POA document specifying powers: banking, real estate, benefits, taxes, Medicaid",k:"O"},{t:"Execute with proper formalities required by your state (notarization, witnesses, or both)",k:"O"},{t:"File copies with all banks, investment firms, and financial institutions",k:"O"},{t:"Store original in fireproof location — provide copies to agent and attorney",k:"O"}]},
    {title:"Advance Directive / Healthcare Proxy executed",subs:[{t:"Obtain your state's advance directive form (check state health department website)",k:"O"},{t:"Discuss values, beliefs, and treatment preferences while parent has capacity",k:"O"},{t:"Choose a Healthcare Agent / Proxy — must be a competent adult",k:"O"},{t:"Choose an alternate agent in case primary is unavailable",k:"O"},{t:"Discuss specific scenarios: life support, tube feeding, ventilator, resuscitation",k:"O"},{t:"Execute with formalities required by your state (witnesses and/or notarization)",k:"O"},{t:"Distribute copies to: healthcare agent, PCP, specialists, hospital, care facilities",k:"O"},{t:"Check if your state has an advance directive registry — register if available",k:"O"},{t:"Review and update every 3–5 years or after major life events",k:"R",d:1095}]},
    {title:"POLST/MOLST form completed if appropriate",subs:[{t:"Understand that POLST/MOLST are physician orders (distinct from advance directives)",k:"O"},{t:"Check if your state has a POLST/MOLST program (not all states do)",k:"O"},{t:"Discuss with parent and PCP whether a POLST is appropriate at current stage",k:"O"},{t:"Provider completes the form based on patient's wishes",k:"O"},{t:"Specify preferences: CPR vs. DNAR, full treatment vs. comfort measures",k:"O"},{t:"Post form in visible location for EMS access",k:"O"},{t:"Review after any hospitalization or change in condition",k:"R",d:180}]},
    {title:"HIPAA authorization forms signed for family access",subs:[{t:"Obtain HIPAA release forms from each medical provider",k:"O"},{t:"Have parent sign authorizations for each family member needing access",k:"O"},{t:"Distribute signed forms to all medical offices, hospitals, labs, pharmacies",k:"O"},{t:"Keep copies for new providers — bring to every new appointment",k:"O"}]},
    {title:"Guardianship or conservatorship evaluated if needed",subs:[{t:"Assess whether POA is sufficient or if court appointment is needed",k:"O"},{t:"Understand your state's terminology for guardianship and conservatorship",k:"O"},{t:"Consult elder law attorney about process, costs, and timeline",k:"O"},{t:"If appointed: understand ongoing reporting requirements",k:"R",d:365},{t:"Consider limited guardianship to preserve maximum autonomy",k:"O"},{t:"Explore less restrictive alternatives first: POA, representative payee, trust",k:"O"}]},
    {title:"Elder law attorney consulted for comprehensive planning",subs:[{t:"Research elder law attorneys in your area — check National Academy of Elder Law Attorneys (NAELA)",k:"O"},{t:"Schedule initial consultation",k:"O"},{t:"Prepare: bring income/asset summary, insurance info, family situation",k:"O"},{t:"Discuss Medicaid planning and your state's look-back period",k:"O"},{t:"Review all existing legal documents for state compliance",k:"O"},{t:"Discuss whether a trust is appropriate for your situation",k:"O"},{t:"Establish ongoing relationship for annual reviews",k:"R",d:365}]},
    {title:"Protection against financial exploitation and scams",subs:[{t:"Set up credit freeze at all three bureaus (free nationwide)",k:"O"},{t:"Register phone numbers on the federal Do Not Call list",k:"O"},{t:"Set up bank account alerts for unusual transactions",k:"O"},{t:"Discuss trusted contact designation with financial institutions",k:"O"},{t:"Monitor mail for scam solicitations",k:"M"},{t:"Know your state's elder abuse reporting hotline",k:"O"},{t:"Brief all caregivers on common scams targeting dementia patients",k:"O"}]},
    {title:"Beneficiary designations and estate documents reviewed",subs:[{t:"List all accounts with beneficiary designations: life insurance, retirement, POD/TOD",k:"O"},{t:"Review and update each designation — ensure alignment with estate plan",k:"O"},{t:"Check for outdated beneficiaries",k:"O"},{t:"Review or create a will compliant with your state's requirements",k:"O"},{t:"Discuss whether a trust avoids probate in your state",k:"O"},{t:"Ensure consistency: will, trust, beneficiary designations, POA",k:"O"}]},
    {title:"Digital accounts and online presence secured",subs:[{t:"Inventory all online accounts: email, social media, banking, utilities",k:"O"},{t:"Securely store all credentials — use password manager or encrypted document",k:"O"},{t:"Set up trusted contacts / legacy contacts on major accounts",k:"O"},{t:"Add POA agent as authorized user on utility, phone, insurance accounts",k:"O"},{t:"Set up two-factor authentication on critical accounts",k:"O"},{t:"Document digital asset wishes in will or trust",k:"O"}]},
    {title:"Mental health advance directive considered if available",subs:[{t:"Check if your state offers a separate mental health advance directive or declaration",k:"O"},{t:"If available, discuss whether this document is appropriate",k:"O"},{t:"Specify preferences for psychiatric care, medication, hospitalization",k:"O"},{t:"Execute per your state's requirements while parent has capacity",k:"O"},{t:"Provide copies to healthcare agent and all providers",k:"O"}]},
  ]},
  financial:{desc:"Medicaid planning, eligibility, benefits, and cost management",goals:[
    {title:"Medicaid application submitted and tracked",subs:[{t:"Gather required documents: ID, Social Security card, citizenship proof, income, bank statements",k:"O"},{t:"Determine which Medicaid long-term care program to apply for in your state",k:"O"},{t:"Apply through your state's Medicaid portal, by phone, or at your local office",k:"O"},{t:"Contact local Area Agency on Aging (AAA) for free application assistance",k:"O"},{t:"Note confirmation number and expected processing timeline",k:"O"},{t:"Follow up regularly on application status",k:"R",d:14},{t:"If denied, understand appeal rights and deadlines in your state",k:"O"}]},
    {title:"Medicaid income eligibility understood and managed",subs:[{t:"Determine if your state is an income-cap state or medically needy state",k:"O"},{t:"Look up your state's current Medicaid LTC income limit",k:"O"},{t:"Count ALL income: Social Security, pensions, VA benefits, annuities, IRA distributions",k:"O"},{t:"If in an income-cap state and over the limit: establish a Qualified Income Trust (Miller Trust)",k:"O"},{t:"Consult elder law attorney about trust requirements in your state",k:"O"},{t:"If required, route excess income through the trust each month",k:"R",d:30}]},
    {title:"Medicaid asset eligibility understood and managed",subs:[{t:"Look up your state's Medicaid asset limit for a single applicant",k:"O"},{t:"If married: look up your state's Community Spouse Resource Allowance (CSRA)",k:"O"},{t:"Identify exempt assets: primary home (check state equity limit), one vehicle, burial plot, prepaid funeral",k:"O"},{t:"Identify countable assets: bank accounts, investments, additional vehicles, non-primary real estate",k:"O"},{t:"Calculate current countable asset total — determine if spend-down is needed",k:"O"},{t:"Understand your state's look-back period for asset transfers (typically 60 months)",k:"O"},{t:"Document all asset transactions with receipts",k:"M"}]},
    {title:"Medicaid spend-down strategy developed with attorney",subs:[{t:"Consult elder law attorney specifically about spend-down strategy",k:"O"},{t:"Review all assets for exempt vs. countable classification",k:"O"},{t:"Pay off debts to convert countable cash to exempt home equity",k:"O"},{t:"Make necessary home modifications",k:"O"},{t:"Purchase prepaid irrevocable funeral contract (exempt in most states)",k:"O"},{t:"Pay for needed dental, hearing, vision care not covered by Medicaid",k:"O"},{t:"NEVER gift money during look-back period without attorney guidance",k:"O"},{t:"Track spend-down progress — recalculate countable assets",k:"R",d:30}]},
    {title:"Medicaid waiver and home care programs explored",subs:[{t:"Research your state's Home and Community-Based Services (HCBS) waiver programs",k:"O"},{t:"Understand that HCBS waivers may have waitlists — apply early",k:"O"},{t:"Explore consumer-directed care options if available in your state",k:"O"},{t:"Contact local AAA or Aging & Disability Resource Center (ADRC) for guidance",k:"O"},{t:"If waitlisted, ask about interim services or other Medicaid programs",k:"O"}]},
    {title:"Medicare and Medicaid coordination understood (dual eligibility)",subs:[{t:"Determine if parent is dually eligible for both Medicare and Medicaid",k:"O"},{t:"Understand which services each program covers — Medicaid is typically secondary",k:"O"},{t:"Resolve billing conflicts — providers must bill Medicare first",k:"O"},{t:"Check enrollment in Medicare Savings Program (MSP)",k:"O"},{t:"Contact your state's SHIP (State Health Insurance Assistance Program) for free counseling",k:"O"}]},
    {title:"Veteran benefits explored if applicable",subs:[{t:"Determine veteran status: service dates, discharge type, disabilities",k:"O"},{t:"Research VA Aid and Attendance pension",k:"O"},{t:"Contact your state's Department of Veterans' Affairs",k:"O"},{t:"Contact county Veterans Service Officer for free claims assistance",k:"O"},{t:"Understand how VA benefits interact with Medicaid in your state",k:"O"}]},
    {title:"Long-term care options costed and compared",subs:[{t:"Research in-home care costs in your area",k:"O"},{t:"Research assisted living / memory care costs in your area",k:"O"},{t:"Research nursing facility costs in your area",k:"O"},{t:"Compare Medicaid coverage for each option in your state",k:"O"},{t:"Check which local facilities accept Medicaid",k:"O"},{t:"Tour 2–3 facilities — check state inspection records",k:"O"},{t:"Discuss family preferences and care recipient wishes",k:"O"}]},
    {title:"Bills, accounts, and finances consolidated under POA",subs:[{t:"Set up POA access on all financial accounts",k:"O"},{t:"Consolidate accounts where possible",k:"O"},{t:"Automate bill payments: rent/mortgage, utilities, insurance, phone",k:"O"},{t:"Cancel unnecessary subscriptions and recurring charges",k:"O"},{t:"Keep detailed records of all financial transactions — fiduciary duty",k:"M"},{t:"Set up separate checking account for parent's expenses",k:"O"}]},
    {title:"Medicaid renewal and estate recovery understood",subs:[{t:"Note your Medicaid annual renewal date — set reminders",k:"O"},{t:"Gather updated documentation before renewal deadline",k:"R",d:365},{t:"Submit renewal on time — late submission causes coverage lapse",k:"R",d:365},{t:"Understand your state's Medicaid estate recovery program",k:"O"},{t:"Discuss estate recovery avoidance strategies with elder law attorney",k:"O"},{t:"Check if your state offers a long-term care insurance partnership program",k:"O"}]},
  ]},
};


// Oregon state data (first state package)
const STATE_PACKAGES = {
  OR: { stateName:"Oregon", version:"1.0", content:{
    physical:{desc:"Mobility, medications, nutrition, sleep, and medical appointments — Oregon providers and OHP resources",goals:[
        {title:"Primary care physician identified and aware of diagnosis",subs:[{t:"Verify PCP accepts Oregon Health Plan (OHP/OSIPM)",k:"O"},{t:"Schedule initial visit and share dementia diagnosis records",k:"O"},{t:"Request geriatric assessment referral if PCP is not geriatric-trained",k:"O"},{t:"Confirm PCP is enrolled with the correct Coordinated Care Organization (CCO)",k:"O"},{t:"Ask PCP to complete a Needs Assessment for APD",k:"O"},{t:"Add PCP to dashboard Contacts with office, nurse line, and patient portal info",k:"O"}]},
        {title:"Medication list reviewed and simplified",subs:[{t:"Gather all current prescriptions including OTC and supplements",k:"O"},{t:"Schedule medication reconciliation with PCP or pharmacist",k:"R",d:180},{t:"Review for anticholinergic or Beers Criteria medications",k:"R",d:365},{t:"Set up pill organizer, blister packs, or auto-dispenser",k:"O"},{t:"Enroll in OHP prescription drug coverage (PDL)",k:"O"},{t:"Confirm all medications are on the Oregon Medicaid Preferred Drug List",k:"R",d:365},{t:"Designate a single pharmacy for OHP single-pharmacy requirement",k:"O"}]},
        {title:"Fall risk assessment completed at home",subs:[{t:"Walk through home and note hazards (loose rugs, poor lighting, clutter)",k:"R",d:90},{t:"Request occupational therapy home evaluation through OHP",k:"O"},{t:"Remove tripping hazards from hallways, stairs, and bathroom",k:"O"},{t:"Install grab bars in bathroom and non-slip mats in tub/shower",k:"O"},{t:"Ensure adequate lighting — especially nightlights for nighttime orientation",k:"O"},{t:"Check if APD waiver covers home modification costs",k:"O"}]},
        {title:"Dental and vision checkups scheduled",subs:[{t:"Find dentist accepting OHP — use OHP dental benefits through CCO",k:"O"},{t:"Schedule dental cleaning and comprehensive exam",k:"R",d:180},{t:"Schedule eye exam — OHP covers annual exams",k:"R",d:365},{t:"Address any outstanding dental or vision needs",k:"O"},{t:"Order updated prescription glasses if covered under OHP",k:"R",d:730}]},
        {title:"Nutritional needs assessed",subs:[{t:"Monitor for swallowing difficulties (dysphagia) and weight changes",k:"M"},{t:"Request speech therapy swallowing evaluation through OHP if needed",k:"O"},{t:"Consult dietitian — OHP covers medical nutrition therapy",k:"O"},{t:"Explore Oregon Project Independence (OPI) meal delivery services",k:"O"},{t:"Apply for Meals on Wheels through local Area Agency on Aging (AAA)",k:"O"},{t:"Stock easy-to-prepare nutritious foods and ensure adequate hydration",k:"R",d:14}]},
        {title:"Sleep patterns documented for provider",subs:[{t:"Track nightly sleep times, wake-ups, and daytime napping",k:"M"},{t:"Note nighttime wandering, agitation, or sundowning episodes",k:"M"},{t:"Document sleep position and any breathing issues",k:"M"},{t:"Discuss findings with PCP — request sleep study referral if indicated",k:"R",d:180},{t:"Evaluate whether medication timing adjustments could improve sleep",k:"R",d:180}]},
        {title:"Home safety modifications installed",subs:[{t:"Secure stairway handrails and check all stair treads",k:"O"},{t:"Install door alarms or childproof locks to prevent wandering",k:"O"},{t:"Remove or lock access to dangerous items (knives, chemicals, car keys)",k:"O"},{t:"Set water heater to 120°F maximum to prevent scalding",k:"O"},{t:"Check if Oregon APD waiver covers modification costs",k:"O"},{t:"Apply for ICP home modification funds if eligible",k:"O"}]},
        {title:"Physical therapy or exercise routine established",subs:[{t:"Get PT referral from PCP — OHP covers outpatient physical therapy",k:"O"},{t:"Confirm CCO authorization for PT visits",k:"O"},{t:"Identify simple daily exercises (walking, balance, stretching, chair yoga)",k:"O"},{t:"Maintain consistent exercise schedule with caregiver support",k:"M"},{t:"Look into community exercise programs through local AAA or senior centers",k:"O"}]},
        {title:"Emergency medical information prepared",subs:[{t:"Create wallet card with diagnoses, medications, allergies, and emergency contacts",k:"O"},{t:"Post emergency contacts and medical summary on refrigerator",k:"O"},{t:"Register with local EMS/fire department vulnerable persons registry",k:"O"},{t:"Ensure medical alert device if parent is ever alone — check OHP/APD coverage",k:"O"},{t:"Prepare a hospital go-bag with medication list, insurance cards, advance directive copy",k:"O"}]},
        {title:"In-home care through OHP explored",subs:[{t:"Contact local APD office about Medicaid-covered in-home care eligibility",k:"O"},{t:"Research APD Waiver (K Plan) — ~44,600 slots statewide",k:"O"},{t:"Explore Oregon Independent Choices Program (ICP) for consumer-directed care",k:"O"},{t:"Investigate OPI-M for in-home support",k:"O"},{t:"Interview and select home health aides from Medicaid-approved agencies",k:"O"},{t:"Establish schedule and care responsibilities — brief aides on dementia needs",k:"O"}]}
    ]},
    cognitive:{desc:"Diagnosis stage, cognitive assessments, therapies, and daily routines — Oregon specialist resources",goals:[
        {title:"Formal diagnosis obtained and documented",subs:[{t:"Schedule evaluation with neurologist or geriatric specialist accepting OHP",k:"O"},{t:"Complete cognitive testing (MMSE, MoCA, or neuropsych battery)",k:"O"},{t:"Obtain written diagnosis letter specifying dementia type and stage",k:"O"},{t:"File copies with PCP, insurance, and APD caseworker",k:"O"},{t:"Request that diagnosis be coded in medical record for Medicaid LTC eligibility",k:"O"}]},
        {title:"Neurologist or geriatric specialist visits scheduled",subs:[{t:"Find OHP-accepting neurologist — check CCO provider directory",k:"O"},{t:"Schedule initial comprehensive evaluation",k:"O"},{t:"Confirm CCO prior authorization for specialist visits if required",k:"O"},{t:"Attend recurring follow-up visits",k:"R",d:180},{t:"Prepare questions and behavioral observations log for each visit",k:"R",d:180}]},
        {title:"Daily routine and structure established",subs:[{t:"Map out consistent wake, meal, activity, and bedtimes",k:"O"},{t:"Build in familiar enjoyable activities (music, gardening, walks)",k:"O"},{t:"Post large-print visual daily schedule in common area",k:"O"},{t:"Brief all caregivers and respite providers on the routine",k:"O"},{t:"Adjust routine seasonally — note impact of Oregon's low-light winters",k:"R",d:90}]},
        {title:"Memory aids and orientation tools in place",subs:[{t:"Label cabinets, drawers, and rooms with clear text and pictures",k:"O"},{t:"Place large-face clocks showing day/date in key rooms",k:"O"},{t:"Set up whiteboard or dry-erase calendar for daily reminders",k:"O"},{t:"Install automatic night-lights for nighttime orientation",k:"O"},{t:"Set up simplified phone or speed-dial for key contacts",k:"O"},{t:"Consider GPS tracking device or AirTag for keys, wallet, person",k:"O"}]},
        {title:"Driving safety evaluated and plan made",subs:[{t:"Observe driving ability honestly — note any close calls or confusion",k:"M"},{t:"Request formal driving evaluation through Oregon DMV or OT",k:"O"},{t:"Review Oregon DMV medical reporting requirements (ORS 807.710)",k:"O"},{t:"Plan alternative transportation: TriMet LIFT, Ride Connection, AAA transport",k:"O"},{t:"If needed, work with PCP to report to DMV — handle license surrender sensitively",k:"O"},{t:"Remove or disable vehicle access if driving is unsafe",k:"O"}]},
        {title:"Wandering risk assessed and mitigated",subs:[{t:"Evaluate current and likely future wandering behavior",k:"M"},{t:"Register with MedicAlert + Alzheimer's Association Safe Return program",k:"O"},{t:"Consider GPS tracking device, smartwatch, or shoe tracker",k:"O"},{t:"Secure doors with alarms, deadbolts, or childproof locks",k:"O"},{t:"Notify neighbors and local police of wandering risk",k:"O"},{t:"Add ID bracelet or iron-on clothing labels with name and phone number",k:"O"}]},
        {title:"Cognitive stimulation activities identified",subs:[{t:"Create personalized playlist of music from their youth",k:"O"},{t:"Find appropriate puzzles, art, gardening, or sensory activities",k:"O"},{t:"Look into Oregon adult day programs — check OHP/APD coverage",k:"O"},{t:"Explore local memory café programs (Alzheimer's Assoc. Oregon chapter)",k:"O"},{t:"Try reminiscence therapy with photo albums, familiar objects",k:"O"},{t:"Rotate activities to maintain engagement — track what works",k:"M"}]},
        {title:"Behavioral changes documented for providers",subs:[{t:"Keep a daily log of new or worsening behaviors",k:"M"},{t:"Note triggers: time of day, hunger, overstimulation, pain, infection signs",k:"M"},{t:"Track sundowning patterns and environmental factors",k:"M"},{t:"Share documentation with neurologist at each visit",k:"R",d:180},{t:"Research stage-appropriate behavioral strategies",k:"O"},{t:"Discuss when psychiatric medication referral may be appropriate",k:"O"}]},
        {title:"Communication strategies learned by all caregivers",subs:[{t:"Learn techniques: short simple sentences, patience, redirection, validation",k:"O"},{t:"Practice: approach from the front, eye contact, calm tone",k:"O"},{t:"Share written strategy guide with all caregivers and paid aides",k:"O"},{t:"Attend Alzheimer's Association caregiver education workshop (Oregon chapter)",k:"O"},{t:"Practice validation approaches for repetitive questions and agitation",k:"O"},{t:"Learn to recognize and respond to nonverbal pain or discomfort cues",k:"O"}]},
        {title:"Dementia stage and progression tracked",subs:[{t:"Understand current stage (early vs. mid) and what to expect next",k:"O"},{t:"Schedule annual formal cognitive re-assessment with neurologist",k:"R",d:365},{t:"Discuss expected progression timeline with specialist",k:"R",d:180},{t:"Adjust care plan proactively as abilities change",k:"R",d:90},{t:"Plan ahead for transitions: increased care needs, possible facility placement",k:"O"},{t:"Document capacity observations in case legal capacity is questioned",k:"M"}]}
    ]},
    wellness:{desc:"Emotional wellbeing, social connection, dignity, and caregiver support — Oregon programs and communities",goals:[
        {title:"Preferred daily activities and comforts identified",subs:[{t:"Interview parent about favorite past activities while they can communicate",k:"O"},{t:"Try different activities and note engagement level",k:"M"},{t:"Keep a comfort preferences list: favorite music, textures, foods, scents",k:"O"},{t:"Share preferences document with all caregivers and respite providers",k:"O"},{t:"Update preferences as condition progresses and interests change",k:"R",d:90}]},
        {title:"Social connections and community maintained",subs:[{t:"Schedule regular visits from friends, family, and faith community",k:"R",d:14},{t:"Explore Oregon adult day programs for socialization (check AAA directory)",k:"O"},{t:"Set up simple video calls with distant family",k:"O"},{t:"Monitor for isolation, withdrawal, or depression",k:"M"},{t:"Connect with local senior centers for social activities",k:"O"}]},
        {title:"Music, art, or sensory activities explored",subs:[{t:"Create personalized playlist of music from their era",k:"O"},{t:"Try simple art projects: coloring books, watercolors, collage",k:"O"},{t:"Explore tactile activities: gardening, fabric sorting, dough kneading",k:"O"},{t:"Look into Oregon memory café programs",k:"O"},{t:"Try pet therapy or arrange visits from therapy animals",k:"O"}]},
        {title:"Spiritual and cultural preferences honored",subs:[{t:"Discuss spiritual needs with parent while they can express preferences",k:"O"},{t:"Arrange regular visits from clergy, spiritual advisor, or faith community",k:"R",d:30},{t:"Maintain cultural traditions, holidays, and meaningful rituals",k:"R",d:90},{t:"Incorporate familiar prayers, readings, or spiritual music into routine",k:"O"},{t:"Ensure cultural dietary preferences are communicated to all caregivers",k:"O"}]},
        {title:"Depression and anxiety monitored",subs:[{t:"Learn signs of depression in dementia: appetite changes, withdrawal, tearfulness",k:"O"},{t:"Track mood changes over time in behavioral log",k:"M"},{t:"Discuss concerns with PCP or specialist — OHP covers mental health",k:"R",d:180},{t:"Explore counseling or medication if appropriate",k:"O"},{t:"Monitor caregiver burnout as a factor affecting care recipient's mood",k:"M"}]},
        {title:"Caregiver support and respite established",subs:[{t:"Join Alzheimer's Association support group — Oregon/SW Washington chapter",k:"O"},{t:"Explore online caregiver forums (ALZConnected, Reddit r/dementia)",k:"O"},{t:"Contact Oregon Family Caregiver Support Program through local AAA",k:"O"},{t:"Apply for OHP-covered respite care through APD waiver programs",k:"O"},{t:"Explore Oregon Project Independence (OPI) caregiver support services",k:"O"},{t:"Schedule regular respite breaks — even brief ones reduce burnout",k:"R",d:14}]},
        {title:"Respite care options researched and applied for",subs:[{t:"Check Oregon APD waiver (K Plan) respite benefits — up to 14 days/year",k:"O"},{t:"Identify local respite care providers accepting OHP",k:"O"},{t:"Apply for Oregon Lifespan Respite grant funds through local AAA",k:"O"},{t:"Investigate OPI-M respite benefits (no estate recovery)",k:"O"},{t:"Schedule regular respite breaks for primary caregiver",k:"R",d:14},{t:"Create a respite care instruction sheet for temporary caregivers",k:"O"}]},
        {title:"Personal grooming and dignity preserved",subs:[{t:"Maintain familiar grooming routines as much as possible",k:"M"},{t:"Adapt clothing for ease: elastic waists, velcro shoes, front-closure bras",k:"O"},{t:"Ensure bath time is safe, warm, and comfortable — use shower chair",k:"O"},{t:"Respect modesty and preferences — same-gender aide if preferred",k:"M"},{t:"Maintain haircuts, nail care, and personal appearance for dignity",k:"R",d:30}]},
        {title:"Quality of life wishes discussed and documented",subs:[{t:"Have gentle conversations about what matters most while parent can express wishes",k:"O"},{t:"Document preferences: where they want to live, what brings joy, what they fear",k:"O"},{t:"Record wishes formally — attach to Oregon Advance Directive if appropriate",k:"O"},{t:"Share documented wishes with all family decision-makers",k:"O"},{t:"Revisit and update as condition progresses",k:"R",d:180}]},
        {title:"Family communication plan and conflict resolution",subs:[{t:"Designate primary point of contact for care updates",k:"O"},{t:"Set up group text, shared document, or dashboard Messages for coordination",k:"O"},{t:"Hold regular family check-in calls (weekly or biweekly)",k:"R",d:14},{t:"Address disagreements early — consider family mediation",k:"O"},{t:"Clarify roles: who handles medical decisions, finances, daily care, respite",k:"O"},{t:"Document agreements in writing to prevent future disputes",k:"O"}]}
    ]},
    legal:{desc:"Oregon-specific powers of attorney, advance directives, guardianship, POLST, and elder protections under ORS Chapter 127",goals:[
        {title:"Oregon Durable Power of Attorney (financial) executed",subs:[{t:"Consult Oregon elder law attorney — find via Oregon State Bar referral service",k:"O"},{t:"Determine whether immediate or springing POA is appropriate (ORS 127.005)",k:"O"},{t:"Identify the best agent — must be a competent adult who understands fiduciary duty",k:"O"},{t:"Draft POA document specifying powers: banking, real estate, benefits, taxes, Medicaid",k:"O"},{t:"Execute with proper Oregon formalities: signature, notarization or two witnesses",k:"O"},{t:"File copies with all banks, investment firms, and financial institutions",k:"O"},{t:"Register POA with county recorder's office (optional but recommended)",k:"O"},{t:"Store original in fireproof location — provide copies to agent and attorney",k:"O"},{t:"Notify financial institutions in writing that POA is now on file",k:"O"},{t:"Brief the agent on fiduciary duties under ORS 127.045",k:"O"}]},
        {title:"Oregon Advance Directive executed (Health Care Representative)",subs:[{t:"Download the official Oregon Advance Directive form from OHA website (ORS 127.529)",k:"O"},{t:"Discuss with parent: values, beliefs, treatment preferences while they have capacity",k:"O"},{t:"Choose a Health Care Representative (HCR) — competent adult (ORS 127.510)",k:"O"},{t:"Choose one or more Alternate HCRs in case primary is unavailable",k:"O"},{t:"Discuss specific scenarios: life support, tube feeding, ventilator, resuscitation",k:"O"},{t:"Complete all sections of the Oregon Advance Directive form",k:"O"},{t:"Execute: principal's signature plus either 2 witnesses OR notary (ORS 127.515)",k:"O"},{t:"HCR must sign the acceptance section of the form (ORS 127.525)",k:"O"},{t:"Distribute copies to: HCR, PCP, specialists, hospital, all care facilities",k:"O"},{t:"Oregon does NOT have a central registry — copies must be distributed manually",k:"O"},{t:"Review and update every 3–5 years or after major life events",k:"R",d:1095}]},
        {title:"POLST form completed (Portable Orders for Life-Sustaining Treatment)",subs:[{t:"Understand difference: Advance Directive = wishes; POLST = physician orders (ORS 127.663–127.684)",k:"O"},{t:"Discuss with parent and PCP whether a POLST is appropriate at current stage",k:"O"},{t:"PCP completes the Oregon POLST form based on patient's wishes",k:"O"},{t:"POLST must be signed by both the patient (or HCR) and the attending provider",k:"O"},{t:"Specify preferences: CPR vs. DNAR, full treatment vs. comfort measures, feeding tubes",k:"O"},{t:"Post original bright green POLST form on refrigerator or near front door for EMS",k:"O"},{t:"Register POLST with Oregon POLST Registry if desired",k:"O"},{t:"Provide copies to all care facilities, hospital, and EMS",k:"O"},{t:"Review POLST after any hospitalization, change in condition, or change in goals",k:"R",d:180},{t:"POLST can be revoked at any time by the patient if they have capacity",k:"O"}]},
        {title:"HIPAA authorization forms signed for family access",subs:[{t:"Obtain HIPAA release forms from each medical provider, pharmacy, and hospital",k:"O"},{t:"Have parent sign authorizations for each family member needing medical info access",k:"O"},{t:"Specify scope: full records, verbal updates, or specific conditions only",k:"O"},{t:"Distribute signed forms to all medical offices, hospitals, labs, and pharmacies",k:"O"},{t:"Keep copies for new providers — bring to every new appointment",k:"O"},{t:"File copies in this dashboard as contact notes for each provider",k:"O"}]},
        {title:"Oregon guardianship or conservatorship evaluated if needed",subs:[{t:"Assess whether POA and HCR are sufficient or if court appointment is needed",k:"O"},{t:"Understand Oregon terminology: Guardian (person) vs. Conservator (finances) — ORS 125",k:"O"},{t:"Consult elder law attorney about process, costs ($3K–$10K+), and timeline",k:"O"},{t:"If proceeding: file petition in Oregon Circuit Court in parent's county",k:"O"},{t:"Court will appoint a visitor to interview the parent",k:"O"},{t:"If appointed: understand ongoing reporting — annual reports to the court",k:"R",d:365},{t:"Consider limited guardianship to preserve maximum autonomy",k:"O"},{t:"Explore alternatives: POA, representative payee, trust",k:"O"}]},
        {title:"Oregon elder law attorney consulted for comprehensive planning",subs:[{t:"Research Oregon elder law attorneys — check Oregon State Bar Elder Law Section",k:"O"},{t:"Schedule initial consultation",k:"O"},{t:"Prepare: bring income/asset summary, insurance info, family situation",k:"O"},{t:"Discuss Medicaid/OHP planning and five-year look-back period",k:"O"},{t:"Review all existing legal documents for Oregon compliance",k:"O"},{t:"Discuss whether a revocable or irrevocable trust is appropriate",k:"O"},{t:"Ask about Oregon Long-Term Care Insurance Partnership Program",k:"O"},{t:"Act before capacity is lost — timing is critical",k:"O"},{t:"Establish ongoing relationship for annual reviews",k:"R",d:365}]},
        {title:"Protection against financial exploitation and scams",subs:[{t:"Set up credit freeze at all three bureaus — free in Oregon",k:"O"},{t:"Register phone numbers on federal and Oregon Do Not Call lists",k:"O"},{t:"Set up bank account alerts for unusual transactions or large withdrawals",k:"O"},{t:"Discuss trusted contact designation with all financial institutions",k:"O"},{t:"Add fraud alerts to credit cards and bank accounts",k:"O"},{t:"Monitor mail for scam solicitations — consider USPS Informed Delivery",k:"M"},{t:"Know Oregon elder abuse laws: ORS 124.050–124.095",k:"O"},{t:"Consider representative payee for Social Security if money management is impaired",k:"O"},{t:"Brief all caregivers on common scams targeting dementia patients",k:"O"}]},
        {title:"Beneficiary designations and estate documents reviewed",subs:[{t:"List all accounts with beneficiary designations: life insurance, retirement, POD/TOD",k:"O"},{t:"Review and update each designation — ensure alignment with estate plan",k:"O"},{t:"Check for outdated beneficiaries (ex-spouse, deceased persons)",k:"O"},{t:"Review or create Oregon will — must comply with ORS Chapter 112",k:"O"},{t:"Discuss whether trust avoids Oregon probate ($75K personal / $200K real)",k:"O"},{t:"Consider transfer-on-death deeds for real property (ORS 93.948–93.979)",k:"O"},{t:"Ensure consistency: will, trust, beneficiary designations, POA",k:"O"},{t:"Store originals with attorney, copies with agent",k:"O"}]},
        {title:"Digital accounts, passwords, and online presence secured",subs:[{t:"Inventory all online accounts: email, social media, banking, utilities, subscriptions",k:"O"},{t:"Securely store all credentials — use password manager or encrypted document",k:"O"},{t:"Set up trusted contacts / legacy contacts on Google, Apple, Facebook",k:"O"},{t:"Add POA agent as authorized user on utility, phone, and insurance accounts",k:"O"},{t:"Review and tighten privacy settings on all social media accounts",k:"O"},{t:"Set up two-factor authentication on critical accounts (email, banking)",k:"O"},{t:"Consider Oregon Fiduciary Access to Digital Assets Act (ORS 125.600+)",k:"O"},{t:"Document digital asset wishes in will or trust",k:"O"}]},
        {title:"Declaration for Mental Health Treatment considered (ORS 127.700)",subs:[{t:"Discuss whether a Declaration for Mental Health Treatment is appropriate",k:"O"},{t:"This separate Oregon document covers psychiatric care preferences",k:"O"},{t:"Specify preferences: psychiatric medication, ECT, hospitalization, restraints",k:"O"},{t:"Must be executed while parent has capacity — valid for 3 years (renewable)",k:"O"},{t:"Requires two witnesses — same rules as advance directive",k:"O"},{t:"Provide copies to HCR, PCP, and any mental health providers",k:"O"},{t:"Renew every 3 years before expiration",k:"R",d:1095}]}
    ]},
    financial:{desc:"Oregon Health Plan (OHP/OSIPM) planning, Medicaid eligibility, benefits, and cost management",goals:[
        {title:"Oregon Medicaid (OSIPM) application submitted and tracked",subs:[{t:"Gather required documents: Oregon ID, SSN, citizenship proof, income, bank statements, property deeds",k:"O"},{t:"Determine which Medicaid pathway: OSIPM for LTC",k:"O"},{t:"Apply online at ONE.Oregon.gov, by phone 1-800-699-9075, or at local ODHS office",k:"O"},{t:"Contact local AAA for free application assistance",k:"O"},{t:"Note confirmation number and expected processing timeline (45–90 days)",k:"O"},{t:"Follow up on application status — document every call",k:"R",d:14},{t:"If denied, understand appeal rights — must appeal within 45 days",k:"O"},{t:"Keep copies of everything submitted — ODHS can lose paperwork",k:"O"}]},
        {title:"Oregon Medicaid income eligibility understood and managed",subs:[{t:"Oregon is income-cap state: must not exceed 300% of Federal Benefit Rate",k:"O"},{t:"2025 income limit: $2,901/month for single applicant",k:"O"},{t:"Count ALL income: Social Security, pensions, VA benefits, annuities, IRA distributions",k:"O"},{t:"If over cap: establish Qualified Income Trust (QIT / Miller Trust)",k:"O"},{t:"Consult elder law attorney to draft the Miller Trust — must be irrevocable",k:"O"},{t:"Name ODHS as remainder beneficiary of the Miller Trust",k:"O"},{t:"Route income over the cap through Miller Trust each month",k:"R",d:30},{t:"Understand personal needs allowance: ~$77/month nursing, ~$173/month community",k:"O"}]},
        {title:"Oregon Medicaid asset eligibility understood and managed",subs:[{t:"Single applicant asset limit: $2,000 in countable assets",k:"O"},{t:"Married: applicant $2,000; community spouse up to $157,920 (2025 CSRA)",k:"O"},{t:"Identify exempt assets: home ($730K equity), one vehicle, burial plot, prepaid funeral",k:"O"},{t:"Identify countable assets: bank accounts, investments, additional vehicles, non-primary real estate",k:"O"},{t:"Calculate current countable asset total — determine if spend-down is needed",k:"O"},{t:"Oregon enforces 60-month (5-year) look-back period for asset transfers",k:"O"},{t:"Document all asset transactions with receipts — ODHS will scrutinize",k:"M"}]},
        {title:"Oregon Medicaid spend-down strategy developed with attorney",subs:[{t:"Consult Oregon elder law attorney specifically about spend-down strategy",k:"O"},{t:"Review all assets for exempt vs. countable classification",k:"O"},{t:"Pay off mortgage, car loan, or other debts (converts cash to exempt equity)",k:"O"},{t:"Make necessary home modifications (grab bars, ramp, bathroom remodel)",k:"O"},{t:"Purchase prepaid irrevocable funeral contract (exempt under Oregon rules)",k:"O"},{t:"Purchase burial plot and headstone for parent and spouse if applicable",k:"O"},{t:"Pay for needed dental work, hearing aids, eyeglasses not covered by OHP",k:"O"},{t:"NEVER gift money to family during look-back period without attorney guidance",k:"O"},{t:"Track spend-down progress — recalculate countable assets",k:"R",d:30}]},
        {title:"Oregon Medicaid waiver and home care programs explored",subs:[{t:"Research APD Waiver (K Plan): ~44,600 slots statewide",k:"O"},{t:"APD Waiver is NOT an entitlement — limited slots, waitlist possible",k:"O"},{t:"Research Independent Choices Program (ICP): consumer-directed, ~2,600 slots",k:"O"},{t:"Research OPI-M: no estate recovery, income $5,217/month, assets $94,523 (2025)",k:"O"},{t:"Contact local APD/AAA to determine which programs parent qualifies for",k:"O"},{t:"If waitlisted, ask about interim OPI-M or ABD Medicaid services",k:"O"},{t:"Understand service priority levels: Oregon uses 1–18 scale",k:"O"}]},
        {title:"Medicare and OHP coordination understood (dual eligibility)",subs:[{t:"Determine if parent is dually eligible for both Medicare and OHP",k:"O"},{t:"Understand which services each program covers — OHP is secondary to Medicare",k:"O"},{t:"Resolve billing conflicts — providers must bill Medicare first",k:"O"},{t:"Check enrollment in Medicare Savings Program (MSP)",k:"O"},{t:"Verify Part D prescription drug plan works with OHP Preferred Drug List",k:"O"},{t:"Contact SHIBA for free Oregon counseling: 1-800-722-4134",k:"O"}]},
        {title:"Veteran benefits explored if applicable",subs:[{t:"Determine veteran status: service dates, discharge type, disabilities",k:"O"},{t:"Research VA Aid and Attendance pension — up to $2,400+/month",k:"O"},{t:"Contact Oregon Dept. of Veterans' Affairs: 1-800-828-8801",k:"O"},{t:"Contact county Veterans Service Officer for free claims assistance",k:"O"},{t:"If eligible, file VA pension application — can be concurrent with OHP",k:"O"},{t:"Understand VA/Medicaid interaction (VA pension is countable income for OSIPM)",k:"O"}]},
        {title:"Long-term care options costed and compared for Oregon",subs:[{t:"Research Oregon in-home care costs: ~$30–35/hour (2025)",k:"O"},{t:"Research assisted living / memory care costs: ~$5,500–$8,000+/month",k:"O"},{t:"Research nursing facility costs: ~$12,000–$15,500+/month private room",k:"O"},{t:"Compare Medicaid coverage for each option",k:"O"},{t:"Check which local facilities accept OHP/OSIPM — get list from ODHS",k:"O"},{t:"Tour 2–3 facilities — check Oregon DHS complaint and inspection records",k:"O"},{t:"Discuss family preferences and care recipient wishes",k:"O"}]},
        {title:"Bills, accounts, and finances consolidated under POA",subs:[{t:"Set up POA access on all financial accounts — bring POA document in person",k:"O"},{t:"Consolidate accounts where possible",k:"O"},{t:"Automate bill payments: rent/mortgage, utilities, insurance, phone",k:"O"},{t:"Cancel unnecessary subscriptions, memberships, recurring charges",k:"O"},{t:"Forward mail to POA agent's address or set up USPS Informed Delivery",k:"O"},{t:"Keep detailed records of all financial transactions — fiduciary duty",k:"M"},{t:"Set up separate checking account for parent's expenses",k:"O"}]},
        {title:"Oregon Medicaid renewal and estate recovery understood",subs:[{t:"Note OSIPM annual renewal date — packet arrives ~60 days before deadline",k:"O"},{t:"Set calendar reminders at 60 and 30 days before renewal",k:"O"},{t:"Gather updated income, asset, and medical documentation",k:"R",d:365},{t:"Submit renewal on time — late submission causes coverage lapse",k:"R",d:365},{t:"Understand Oregon Medicaid Estate Recovery (ORS 416.350)",k:"O"},{t:"Discuss estate recovery avoidance strategies with attorney",k:"O"},{t:"Consider Oregon LTC Insurance Partnership Program — protects assets dollar-for-dollar",k:"O"},{t:"File hardship waiver if estate recovery would cause undue hardship",k:"O"}]}
    ]}
  }},
};

// State packages are pure content (desc + goals per domain), merged with DOMAIN_META styling.
// Generic mode uses DOMAINS_GENERIC, which has the identical shape — so generic and state
// packages are authored and validated the same way. See STATE-PACKAGE-GUIDE.md.
const AVAILABLE_STATES = [{code:"",name:"Generic (no state-specific info)"}].concat(
  Object.keys(STATE_PACKAGES).map(code => ({code, name:(STATE_PACKAGES[code].stateName||code)}))
);

function buildDomains(stateCode) {
  const pkg = stateCode && STATE_PACKAGES[stateCode];
  const content = pkg ? pkg.content : DOMAINS_GENERIC;
  return DOMAIN_META.map(m => ({
    ...m,
    desc: (content[m.key] && content[m.key].desc) || m.label,
    goals: (content[m.key] && content[m.key].goals) || []
  }));
}

// Structural validator for a contributed state package (used by tooling and the in-app importer).
// Returns {valid, errors:[...], stats:{goals,subs}}. Does NOT verify legal accuracy — only shape.
function validateStatePackage(pkg) {
  const errors = [];
  const REQUIRED_DOMAINS = DOMAIN_META.map(d => d.key);
  const VALID_KINDS = ["O","R","M"];
  if (!pkg || typeof pkg !== "object") return {valid:false, errors:["Package is not an object"], stats:{}};
  if (!pkg.stateCode || typeof pkg.stateCode !== "string") errors.push("Missing stateCode (e.g. \"MI\")");
  if (!pkg.stateName || typeof pkg.stateName !== "string") errors.push("Missing stateName (e.g. \"Michigan\")");
  const content = pkg.content;
  if (!content || typeof content !== "object") { errors.push("Missing content object"); return {valid:false, errors, stats:{}}; }
  let goals=0, subs=0;
  REQUIRED_DOMAINS.forEach(dk => {
    const d = content[dk];
    if (!d) { errors.push("Missing domain: "+dk); return; }
    if (typeof d.desc !== "string" || !d.desc.trim()) errors.push(dk+": missing desc");
    if (!Array.isArray(d.goals)) { errors.push(dk+": goals must be an array"); return; }
    d.goals.forEach((g,gi) => {
      goals++;
      if (typeof g.title !== "string" || !g.title.trim()) errors.push(dk+" goal #"+(gi+1)+": missing title");
      if (!Array.isArray(g.subs) || g.subs.length===0) { errors.push(dk+" goal #"+(gi+1)+": needs at least one sub-task"); return; }
      g.subs.forEach((s,si) => {
        subs++;
        const where = dk+" goal #"+(gi+1)+" sub #"+(si+1);
        if (typeof s.t !== "string" || !s.t.trim()) errors.push(where+": missing task text (t)");
        if (!VALID_KINDS.includes(s.k)) errors.push(where+": kind (k) must be O, R, or M");
        if (s.k==="R" && (typeof s.d !== "number" || s.d<=0)) errors.push(where+": recurring task (R) needs a positive interval in days (d)");
        if (s.t && s.t.length>300) errors.push(where+": task text exceeds 300 characters");
      });
    });
  });
  Object.keys(content).forEach(k => { if (!REQUIRED_DOMAINS.includes(k)) errors.push("Unknown domain key: "+k); });
  return {valid: errors.length===0, errors, stats:{goals, subs}};
}



const EMERGENCY_SCENARIOS = [
  {key:"fall",title:"If They Fall",icon:"⚠",steps:["Do NOT move them if in pain or cannot get up","Call 911 if head injury, visible fracture, or cannot get up","Check for bleeding, bruising, or deformity","If able to get up safely, help to a chair and monitor 24 hours","Log incident in dashboard with time, injuries, response","Call PCP within 24 hours even if no apparent injury","Hospital go-bag location: ___","Advance directive location: ___"]},
  {key:"wandering",title:"If They Wander or Are Missing",icon:"🚶",steps:["Check yard, garage, and immediate neighborhood first","Call 911 — mention dementia and Safe Return ID: ___","Call family contacts on the emergency list","Provide recent photo and clothing description to responders","Check favorite past locations (former workplace, church)","After recovery: log incident, review door alarm and lock status"]},
  {key:"aggressive",title:"If They Become Aggressive",icon:"⚡",steps:["Stay calm — do NOT argue, restrain, or raise voice","Step back and give physical space","Remove yourself from the room if unsafe","Remove nearby objects that could cause harm","Wait 10–15 minutes, then try gentle redirection","Offer comfort: familiar music, snack, calm activity","If aggression persists, call PCP or crisis line","Log episode with triggers noted"]},
  {key:"medical",title:"Medical Emergency",icon:"🩺",steps:["Call 911 for: chest pain, breathing difficulty, stroke symptoms, seizure","Have POLST form ready for EMS (location: ___)","Bring hospital go-bag (location: ___)","Give EMS the medication list and allergy card","Call the Health Care Representative","Call PCP office to notify"]},
  {key:"choking",title:"If They Are Choking",icon:"🫁",steps:["If they can cough, encourage coughing","If cannot cough/breathe/speak: call 911 immediately","Perform Heimlich maneuver if trained","Check POLST/DNAR status before CPR","After event: schedule swallowing evaluation"]},
  {key:"med_error",title:"Medication Error",icon:"💊",steps:["Determine: what was taken, how much, when","Call Poison Control: 1-800-222-1222 (24/7, free)","Call 911 if symptomatic (drowsiness, confusion, breathing changes)","Do NOT induce vomiting unless directed","Bring medication bottle to ER","Log with medication name, dose, time, response"]},
];

const SHIFT_SLOTS = ["6–9 AM","9 AM–12","12–3 PM","3–6 PM","6–9 PM","9 PM–12","Overnight"];
const SHIFT_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const TRANSITION_TRIGGERS = [
  {key:"adl3",label:"Needs help with 3+ ADLs",desc:"Bathing, dressing, eating, toileting, transferring, continence"},
  {key:"wandering_freq",label:"Wandering weekly or more",desc:"Current safety measures are insufficient"},
  {key:"alone_unsafe",label:"Cannot be left alone safely",desc:"Requires continuous supervision during waking hours"},
  {key:"night_care",label:"Requires nighttime care",desc:"Nighttime wandering, incontinence, or agitation"},
  {key:"aggression",label:"Aggressive toward caregivers",desc:"Physical or verbal aggression putting caregivers at risk"},
  {key:"weight_loss",label:"Weight loss >10% in 6 months",desc:"May indicate swallowing difficulty, depression, or inability to self-feed"},
  {key:"caregiver_burnout",label:"Caregiver burnout or health decline",desc:"Primary caregiver's own health is deteriorating"},
  {key:"falls_recurring",label:"2+ falls in past month",desc:"Environment and current care level are insufficient"},
  {key:"med_refusal",label:"Consistently refusing medications",desc:"Unable to administer critical medications"},
  {key:"recognition_loss",label:"No longer recognizes close family",desc:"Signals mid-to-late stage progression"},
  {key:"incontinence",label:"Full incontinence requiring assistance",desc:"Both urinary and fecal, requiring regular care"},
  {key:"swallowing",label:"Significant swallowing difficulties",desc:"Choking and aspiration pneumonia risk"},
];

const POST_DEATH_SECTIONS = [
  {title:"Immediate (24–48 hours)",items:["Contact funeral home (pre-arrangement #: ___)","Notify immediate family members","If at home: call hospice or 911 (NOT 911 if expected death under hospice)","Obtain preliminary death certificate","Notify Health Care Representative that authority has ended","Secure the residence — lock doors, do not distribute belongings"]},
  {title:"First week",items:["Obtain 10–15 certified death certificate copies","Notify Social Security: 1-800-772-1213","Notify Oregon Medicaid/OSIPM: 1-800-699-9075 (stops same day)","Notify Medicare if separately enrolled","Freeze bank accounts and financial institutions","File life insurance claims","Notify pension plan or employer","Notify VA if veteran: 1-800-827-1000","Cancel/transfer utilities, phone, internet","Forward mail via USPS to executor address","Notify landlord or mortgage company"]},
  {title:"First month",items:["File will with Oregon Circuit Court within 30 days (ORS 113.035)","Petition for personal representative if probate needed","Check small estate affidavit eligibility (under $75K personal / $200K real in Oregon)","Notify Oregon DHS for Medicaid estate recovery (ORS 416.350)","File hardship waiver for estate recovery if applicable","Cancel health, auto, homeowner's insurance","Notify credit bureaus — request deceased alert","Close digital accounts","Return rented medical equipment","Cancel home care, meals on wheels, adult day program"]},
  {title:"Months 2–6",items:["File final federal and Oregon state income tax returns","File estate income tax return if needed (Form 1041)","Distribute assets per will or intestacy law","Respond to Oregon Medicaid estate recovery claims","Close remaining accounts and notify creditors","File final accounting with probate court","Transfer real property deeds","Remove POLST from Oregon Registry","Cancel remaining subscriptions and automatic payments"]},
];

/* ═══════════════ UTILITIES ═══════════════ */
const SKEY = "demcare-v2.0"; // legacy key — used only for migration detection
let _cid = Date.now(); const nextId = () => String(++_cid);

/* ═══ Cloud Sync via File System Access API ═══ */
/* M3 Security note: File handles stored in IndexedDB grant read/write access to the sync file.
   The browser enforces permission prompts on each session, mitigating the risk.
   The actual data in the file is encrypted, so handle extraction alone doesn't expose PHI. */
const SYNC_DB_NAME="care-sync-handles";const SYNC_STORE="handles";
function openSyncDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(SYNC_DB_NAME,1);req.onupgradeneeded=e=>{e.target.result.createObjectStore(SYNC_STORE)};req.onsuccess=e=>resolve(e.target.result);req.onerror=e=>reject(e.target.error)})}
async function saveSyncHandle(handle){const db=await openSyncDB();return new Promise((resolve,reject)=>{const tx=db.transaction(SYNC_STORE,"readwrite");tx.objectStore(SYNC_STORE).put(handle,"syncFileHandle");tx.oncomplete=()=>resolve();tx.onerror=e=>reject(e.target.error)})}
async function loadSyncHandle(){try{const db=await openSyncDB();return new Promise((resolve,reject)=>{const tx=db.transaction(SYNC_STORE,"readonly");const req=tx.objectStore(SYNC_STORE).get("syncFileHandle");req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null)})}catch{return null}}
async function clearSyncHandle(){try{const db=await openSyncDB();const tx=db.transaction(SYNC_STORE,"readwrite");tx.objectStore(SYNC_STORE).delete("syncFileHandle")}catch{}}
// Continuous-backup file handle (separate key, same store). Persists across sessions; permission does not.
async function saveBackupHandle(handle){const db=await openSyncDB();return new Promise((resolve,reject)=>{const tx=db.transaction(SYNC_STORE,"readwrite");tx.objectStore(SYNC_STORE).put(handle,"backupFileHandle");tx.oncomplete=()=>resolve();tx.onerror=e=>reject(e.target.error)})}
async function loadBackupHandle(){try{const db=await openSyncDB();return new Promise((resolve)=>{const tx=db.transaction(SYNC_STORE,"readonly");const req=tx.objectStore(SYNC_STORE).get("backupFileHandle");req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null)})}catch{return null}}
async function clearBackupHandle(){try{const db=await openSyncDB();const tx=db.transaction(SYNC_STORE,"readwrite");tx.objectStore(SYNC_STORE).delete("backupFileHandle")}catch{}}
// Permission on a stored handle lapses each session and can only be re-granted by a user gesture.
// query=true does a silent check; query=false attempts an interactive request (MUST be inside a gesture).
async function checkHandlePermission(handle,interactive){
  if(!handle||!handle.queryPermission)return "unsupported";
  try{
    const opts={mode:"readwrite"};
    const cur=await handle.queryPermission(opts);
    if(cur==="granted")return "granted";
    if(interactive){const req=await handle.requestPermission(opts);return req}
    return cur; // "prompt" or "denied"
  }catch{return "denied"}
}
const hasFileSystemAccess=typeof window!=="undefined"&&"showSaveFilePicker"in window;

const genDeviceId=()=>"dev-"+Math.random().toString(36).slice(2,10)+"-"+Date.now().toString(36);

// Data-schema generation, independent of the IndexedDB store version. Stamped into the vault so a vault written
// by a NEWER app build is detected and not silently clobbered by an older build on a mixed-version team.
// Migration policy (documented in README): never migrate the primary vault in place — the A/B snapshot swap
// already writes-then-flips-pointer atomically, so a future schema migration writes to the inactive slot,
// verifies the AES-GCM tag, then flips, never leaving a half-migrated vault.
const SCHEMA_VERSION = 3;
function initState(stateCode) {
  const doms = buildDomains(stateCode||"");
  const domains = {};
  doms.forEach(d => { domains[d.key] = { status:"not-started",notes:"",lastUpdated:null, goals:d.goals.map(g=>({done:false,subs:g.subs.map(()=>({done:false,lastDone:null,typeOverride:null})),customSubs:[],titleOverride:null,subOverrides:{}})) }; });
  return { domains, contacts:[], appointments:[], messages:[], incidents:[], expenses:[], medSchedule:{medications:[],log:[]}, emergencyPlans:EMERGENCY_SCENARIOS.map(s=>({key:s.key,steps:[...s.steps]})), shifts:{}, careShifts:[], availability:{}, transitionTriggers:{}, statusHistory:[], postDeathChecklist:POST_DEATH_SECTIONS.map(s=>s.items.map(()=>false)), selfReports:[], savedDocs:[], caregiverWellness:[], capacityLog:[], poaDecisions:[], log:[], domainOverrides:{}, settings:{caregiverPasscode:"1234",clientPasscode:"0000",deviceId:genDeviceId(),deviceName:"",stateCode:stateCode||"",schemaVersion:SCHEMA_VERSION}, _sync:{} };
}

/* ═══ Merge engine ═══ */
/* ═══ Hybrid Logical Clock (sync conflict ordering, M5) ═══
   Gives causal ordering under honest clock skew; a future-timestamp guard bounds the malicious
   "set my clock to 2035 so my edit wins forever" denial-of-service. The clock is device-LOCAL
   (not synced); only the per-record stamps travel. Proven in hlc-test.mjs. */
const HLC_LS = "cg-hlc";
const FUTURE_TOL = 15*60*1000; // reject remote stamps >15 min ahead of local time. HLC uses epoch ms (timezone-
// independent), so honest devices rarely skew beyond a few minutes (NTP); a wider window only widens the attack window.
function hlcLocal(prev, id, wall){ const ppt=prev?prev.pt:0; const pt=Math.max(ppt,wall); const l=(pt===ppt)?((prev?prev.l:0)+1):0; return {pt,l,id}; }
function hlcReceive(prev, remote, id, wall){
  const ppt=prev?prev.pt:0, rpt=remote?remote.pt:0; const pt=Math.max(ppt,rpt,wall); let l;
  if(pt===ppt&&pt===rpt) l=Math.max(prev?prev.l:0, remote?remote.l:0)+1;
  else if(pt===ppt) l=(prev?prev.l:0)+1; else if(pt===rpt) l=(remote?remote.l:0)+1; else l=0;
  return {pt,l,id};
}
function hlcCompare(a,b){ if(!a)return b?-1:0; if(!b)return 1; if(a.pt!==b.pt)return a.pt-b.pt; if(a.l!==b.l)return a.l-b.l; return (a.id||"")<(b.id||"")?-1:((a.id||"")>(b.id||"")?1:0); }
function loadHlc(){ try{const r=localStorage.getItem(HLC_LS);return r?JSON.parse(r):{pt:0,l:0}}catch{return {pt:0,l:0}} }
function saveHlc(c){ try{localStorage.setItem(HLC_LS,JSON.stringify({pt:c.pt,l:c.l}))}catch{} }
// Comparable stamp for a mutable record: prefer its HLC, fall back to lastModified for legacy records.
function recordStamp(r){ return r.hlc || (r.lastModified?{pt:Date.parse(r.lastModified)||0,l:0,id:""}:null); }

function mergeData(local, remote) {
  const report = { added:[], updated:[], kept:[], conflicts:[] };
  const merged = JSON.parse(JSON.stringify(local));
  const localSync = local._sync || {};
  const remoteSync = remote._sync || {};
  const maxTs = Date.now() + 86400000; // reject timestamps >24h in future (M5 anti-spoofing)

  // Helper: merge append-only collections by ID
  const mergeById = (localArr, remoteArr, label, recentWins) => {
    if(recentWins){
      // Most-recent-wins for mutable records — ordered by Hybrid Logical Clock (causal under skew),
      // with a guard that refuses to let an implausibly future-dated remote stamp overwrite (anti-DoS).
      const now=Date.now();
      const map=new Map();
      (localArr||[]).forEach(x=>{if(x&&x.id)map.set(x.id,x)});
      let added=0,updated=0,rejected=0;
      (remoteArr||[]).forEach(x=>{if(!x||!x.id)return;
        if(!map.has(x.id)){
          if(x.hlc && x.hlc.pt>now+FUTURE_TOL){rejected++;return} // don't even accept a far-future new record silently
          map.set(x.id,x);added++;return;
        }
        const ex=map.get(x.id);
        if(x.hlc && x.hlc.pt>now+FUTURE_TOL){rejected++;return}    // future-dated overwrite blocked → keep local
        if(hlcCompare(recordStamp(x),recordStamp(ex))>0){map.set(x.id,x);updated++}
      });
      if(added)report.added.push(`${added} new ${label}`);
      if(updated)report.updated.push(`${updated} updated ${label}`);
      if(rejected)report.conflicts.push(`${rejected} ${label} with implausible future timestamps were not applied (possible clock error or tampering)`);
      return Array.from(map.values());
    }
    const localIds = new Set((localArr||[]).map(x=>x.id));
    const newItems = (remoteArr||[]).filter(x=>!localIds.has(x.id));
    if(newItems.length) report.added.push(`${newItems.length} new ${label}`);
    return [...(localArr||[]), ...newItems];
  };

  // Merge append-only collections
  merged.incidents = mergeById(local.incidents, remote.incidents, "incidents");
  merged.expenses = mergeById(local.expenses, remote.expenses, "expenses");
  merged.messages = mergeById(local.messages, remote.messages, "messages");
  merged.selfReports = mergeById(local.selfReports, remote.selfReports, "self-reports");
  merged.savedDocs = mergeById(local.savedDocs, remote.savedDocs, "documents");
  merged.caregiverWellness = mergeById(local.caregiverWellness, remote.caregiverWellness, "caregiver check-ins");
  merged.capacityLog = mergeById(local.capacityLog, remote.capacityLog, "capacity observations");
  merged.poaDecisions = mergeById(local.poaDecisions, remote.poaDecisions, "POA decisions");
  // Care shifts: most-recent-wins per shift by lastModified (admin is authority)
  merged.careShifts = mergeById(local.careShifts, remote.careShifts, "shifts", true);
  // Availability: per-device, each device owns its own entry
  merged.availability = {...(remote.availability||{}), ...(local.availability||{})};
  // For availability, take the most recently updated per device
  {const la=local.availability||{},ra=remote.availability||{};const all={};Object.keys({...la,...ra}).forEach(dev=>{const l=la[dev],r=ra[dev];if(!l)all[dev]=r;else if(!r)all[dev]=l;else all[dev]=(new Date(l.updated||0)>=new Date(r.updated||0))?l:r});merged.availability=all;}

  // Merge contacts by ID (update if remote is newer based on name/data change)
  const localContactMap = {};
  (local.contacts||[]).forEach(c => localContactMap[c.id]=c);
  (remote.contacts||[]).forEach(rc => {
    if(!localContactMap[rc.id]) {
      merged.contacts = [...(merged.contacts||[]), rc];
      report.added.push("Contact: "+rc.name);
    }
  });

  // Merge appointments by ID
  merged.appointments = mergeById(local.appointments, remote.appointments, "appointments");

  // Merge statusHistory by date
  const localDates = new Set((local.statusHistory||[]).map(s=>s.date));
  const newSnaps = (remote.statusHistory||[]).filter(s=>!localDates.has(s.date));
  if(newSnaps.length) { merged.statusHistory = [...(merged.statusHistory||[]), ...newSnaps].sort((a,b)=>a.date.localeCompare(b.date)); report.added.push(newSnaps.length+" tracking snapshots"); }

  // Merge med schedule - medications by ID, log by key
  const localMedIds = new Set(((local.medSchedule&&local.medSchedule.medications||[])||[]).map(m=>m.id));
  const newMeds = ((remote.medSchedule&&remote.medSchedule.medications||[])||[]).filter(m=>!localMedIds.has(m.id));
  if(newMeds.length) { merged.medSchedule.medications = [...((merged.medSchedule&&merged.medSchedule.medications||[])||[]), ...newMeds]; report.added.push(newMeds.length+" medications"); }
  const localLogKeys = new Set(((local.medSchedule&&local.medSchedule.log||[])||[]).map(l=>l.key));
  const newLogs = ((remote.medSchedule&&remote.medSchedule.log||[])||[]).filter(l=>!localLogKeys.has(l.key));
  if(newLogs.length) { merged.medSchedule.log = [...((merged.medSchedule&&merged.medSchedule.log||[])||[]), ...newLogs]; report.added.push(newLogs.length+" med admin entries"); }

  // Merge domains - per domain, keep whichever has more recent lastUpdated
  DOMAINS.forEach(d => {
    const lDom = (local.domains&&local.domains[d.key]);
    const rDom = (remote.domains&&remote.domains[d.key]);
    if(!lDom||!rDom) return;
    const lTs = lDom.lastUpdated ? new Date(lDom.lastUpdated).getTime() : 0;
    const rTs = rDom.lastUpdated ? Math.min(new Date(rDom.lastUpdated).getTime(), maxTs) : 0;
    if(rTs > lTs) {
      merged.domains[d.key] = { ...rDom };
      report.updated.push(d.label+" (remote is newer)");
    } else {
      report.kept.push(d.label+" (local is newer or same)");
    }
  });

  // Merge shifts - per cell, keep remote if local is empty
  const remoteShifts = remote.shifts || {};
  Object.keys(remoteShifts).forEach(key => {
    if(remoteShifts[key] && !(merged.shifts||{})[key]) {
      merged.shifts = { ...(merged.shifts||{}), [key]: remoteShifts[key] };
      report.added.push("Shift: "+key);
    }
  });

  // Merge transition triggers - per key, keep remote if active and local isn't
  const remoteTriggers = remote.transitionTriggers || {};
  Object.keys(remoteTriggers).forEach(key => {
    if(remoteTriggers[key] && !(merged.transitionTriggers||{})[key]) {
      merged.transitionTriggers = { ...(merged.transitionTriggers||{}), [key]: true };
      report.updated.push("Trigger activated: "+key);
    }
  });

  // Merge emergency plans - keep remote if it has more steps
  (remote.emergencyPlans||[]).forEach((rPlan, i) => {
    const lPlan = (merged.emergencyPlans||[])[i];
    if(lPlan && rPlan.steps.length > lPlan.steps.length) {
      merged.emergencyPlans[i] = rPlan;
      report.updated.push("Emergency plan: "+(EMERGENCY_SCENARIOS[i]&&EMERGENCY_SCENARIOS[i].title));
    }
  });

  // Merge domain overrides
  Object.keys(remote.domainOverrides||{}).forEach(key => {
    if(!merged.domainOverrides[key]) { merged.domainOverrides[key] = remote.domainOverrides[key]; report.added.push("Domain label: "+key); }
  });

  // Merge log entries - union by time string, keep last 60
  const localLogTimes = new Set((local.log||[]).map(l=>l.time+l.action));
  const newLogEntries = (remote.log||[]).filter(l=>!localLogTimes.has(l.time+l.action));
  merged.log = [...(merged.log||[]), ...newLogEntries].sort((a,b)=>(b.time||"").localeCompare(a.time||"")).slice(0,60);

  // Preserve local settings (passcodes, deviceId, tabOrder)
  merged.settings = { ...local.settings };
  // Merge team roster if both are on the same team
  if(local.settings&&local.settings.team&&local.settings.team.id && remote.settings&&remote.settings.team&&remote.settings.team.id && local.settings.team.id===remote.settings.team.id){
    const mergedMembers=[...local.settings.team.members];
    (remote.settings.team.members||[]).forEach(rm=>{
      const existing=mergedMembers.find(m=>m.deviceId===rm.deviceId);
      if(!existing&&mergedMembers.length<20)mergedMembers.push({...rm,name:sanitizeText(rm.name||"",100),role:sanitizeText(rm.role||"",100),lastSync:new Date().toISOString()});
      else if(existing){if(rm.name)existing.name=sanitizeText(rm.name,100);if(rm.role)existing.role=sanitizeText(rm.role,100);existing.lastSync=new Date().toISOString()}
    });
    merged.settings.team={...local.settings.team,members:mergedMembers};
  }

  // Update sync metadata
  merged._sync = { ...localSync, lastMerge: new Date().toISOString(), mergedFrom: (remote.settings&&remote.settings.deviceId) || "unknown", mergedFromName: (remote.settings&&remote.settings.deviceName) || "" };

  return { merged, report };
}

/* vCard parser */
function parseVCards(text) {
  const cards = []; const blocks = text.split(/(?=BEGIN:VCARD)/i).filter(b=>/BEGIN:VCARD/i.test(b));
  for (const block of blocks) {
    const lines = []; block.split(/\r?\n/).forEach(l => { if (/^\s/.test(l) && lines.length) lines[lines.length-1] += l.trim(); else lines.push(l); });
    const getVal = k => { for (const l of lines) { if (new RegExp("^"+k+"[;:]","i").test(l)) { const i=l.indexOf(":"); return i>=0?l.slice(i+1).trim():""; }} return ""; };
    const fn=getVal("FN"),org=(getVal("ORG")||"").replace(/;+$/,""),title=getVal("TITLE"),tel=(getVal("TEL")||"").replace(/[^\d+\-() .ext]/gi,""),email=getVal("EMAIL"),note=getVal("NOTE"),adr=(getVal("ADR")||"").replace(/;+/g,", ").replace(/^[, ]+|[, ]+$/g,""),url=getVal("URL");
    if (!fn&&!org) continue;
    const cf=[]; if(adr)cf.push({label:"Address",value:adr}); if(url)cf.push({label:"Website",value:url});
    cards.push({...EMPTY_CONTACT,name:fn||org,role:title,org,phone:tel,email,category:"other",customFields:cf,notes:note?[{text:note,date:new Date().toLocaleString()}]:[]});
  } return cards;
}

/* FHIR R4 Bundle parser */
function parseFHIR(json) {
  const results = { contacts:[], notes:[], medications:[], conditions:[] };
  if (json.resourceType !== "Bundle" || !json.entry) return results;
  for (const e of json.entry) {
    const r = e.resource; if (!r) continue;
    if (r.resourceType === "Practitioner") {
      const name = (r.name&&r.name[0]); const fn = name ? [name.prefix,name.given,name.family].flat().filter(Boolean).join(" ") : "";
      const tel = ((r.telecom||[]).find(t=>t.system==="phone")||{}).value||"";
      const email = ((r.telecom||[]).find(t=>t.system==="email")||{}).value||"";
      if (fn) results.contacts.push(sanitizeContact({...EMPTY_CONTACT,name:fn,role:(r.qualification&&r.qualification[0]&&r.qualification[0].code&&r.qualification[0].code.text)||"",phone:tel,email,category:"medical"}));
    }
    if (r.resourceType === "Condition") {
      const text = (r.code&&r.code.text) || (r.code&&r.code.coding&&r.code.coding[0]&&r.code.coding[0].display) || "Unknown condition";
      const date = r.recordedDate || r.onsetDateTime || "";
      results.conditions.push(`${text}${date ? " ("+date.slice(0,10)+")" : ""}`);
    }
    if (r.resourceType === "MedicationRequest") {
      const med = (r.medicationCodeableConcept&&r.medicationCodeableConcept.text) || (r.medicationCodeableConcept&&r.medicationCodeableConcept.coding&&r.medicationCodeableConcept.coding[0]&&r.medicationCodeableConcept.coding[0].display) || "Unknown medication";
      const dosage = (r.dosageInstruction&&r.dosageInstruction[0]&&r.dosageInstruction[0].text) || "";
      results.medications.push(`${med}${dosage ? " — "+dosage : ""}`);
    }
    if (r.resourceType === "Patient") {
      const name = (r.name&&r.name[0]); const fn = name ? [name.given,name.family].flat().filter(Boolean).join(" ") : "";
      const dob = r.birthDate || "";
      if (fn) results.notes.push(`Patient: ${fn}${dob ? ", DOB: "+dob : ""}`);
    }
  }
  return results;
}

/* Crypto: AES-256-GCM + PBKDF2 */
// OWASP 2023+ guidance for PBKDF2-HMAC-SHA256 is 600,000 iterations. Legacy vaults wrapped at 100,000
// are still accepted on read and transparently upgraded to 600,000 the next time their passcode is used.
const KDF_ITER = 600000;
const KDF_ITER_LEGACY = 100000;
async function encryptData(data, password) {
  const enc = new TextEncoder(); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
  const km = await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveKey"]);
  const key = await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:KDF_ITER,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt"]);
  const ct = await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(JSON.stringify(data)));
  const buf = new Uint8Array(28+ct.byteLength); buf.set(salt,0); buf.set(iv,16); buf.set(new Uint8Array(ct),28);
  return btoa(String.fromCharCode(...buf));
}

async function decryptData(b64, password) {
  const buf = Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  const km = await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
  for(const iters of [KDF_ITER,KDF_ITER_LEGACY]){ // current first, then legacy backups
    try{
      const key = await crypto.subtle.deriveKey({name:"PBKDF2",salt:buf.slice(0,16),iterations:iters,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["decrypt"]);
      const pt = await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(16,28)},key,buf.slice(28));
      return JSON.parse(new TextDecoder().decode(pt));
    }catch{}
  }
  throw new Error("decryptData: wrong passcode or corrupt data");
}

/* ═══ Encryption at rest — DEK + key wrapping ═══ */
const VAULT_KEY = "demcare-vault-v2";
const VAULT_DB_NAME = "care-guardian-vault";
const VAULT_DB_VER = 3;
const VAULT_STORE = "encrypted";
const WAL_STORE = "wal";
const BLOB_STORE = "blobs";
const VAULT_KEYS_LS = "demcare-keys-v3"; // wrapped keys stay in localStorage (small, fast)

function openVaultDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(VAULT_DB_NAME,VAULT_DB_VER);
    req.onupgradeneeded=(e)=>{const db=e.target.result;
      if(!db.objectStoreNames.contains(VAULT_STORE)){db.createObjectStore(VAULT_STORE)}
      if(!db.objectStoreNames.contains(WAL_STORE)){db.createObjectStore(WAL_STORE)} // keyed out-of-line by seq number
      if(!db.objectStoreNames.contains(BLOB_STORE)){db.createObjectStore(BLOB_STORE)} // large binaries, encrypted, keyed by id
    };
    req.onsuccess=(e)=>resolve(e.target.result);
    req.onerror=(e)=>reject(e.target.error);
  });
}

// ── Binary blobs (photos, voice) stored out of the main vault, encrypted with the same DEK ──
// Keeps the JSON vault small so snapshots, WAL diffs, and encryption stay fast and memory-light.
const BLOBREF_RE=/^blobref:([a-z0-9]+)$/;
function newBlobId(){ return "b"+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
async function putBlob(dataUrl, dek, id){
  id=id||newBlobId();
  const enc=await encryptWithDEK(dataUrl, dek); // reuse the vault DEK + fresh-IV AES-GCM
  const db=await openVaultDB();const tx=db.transaction(BLOB_STORE,"readwrite");
  tx.objectStore(BLOB_STORE).put(enc,id);
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
  return id;
}
async function getBlob(id, dek){
  const enc=await idbGet(BLOB_STORE,id);
  if(!enc) return null;
  return decryptWithDEK(enc, dek); // → original data: URL string
}
async function deleteBlob(id){ try{const db=await openVaultDB();const tx=db.transaction(BLOB_STORE,"readwrite");tx.objectStore(BLOB_STORE).delete(id);await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();}catch{} }
async function listBlobKeys(){ try{const db=await openVaultDB();const out=await new Promise((res,rej)=>{const tx=db.transaction(BLOB_STORE,"readonly");const r=tx.objectStore(BLOB_STORE).getAllKeys();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});db.close();return out;}catch{return []} }
// Recursively gather every blobref id anywhere in the state — used so export/sync never miss a blob and GC never deletes a live one.
function collectBlobRefs(obj, out){ out=out||new Set();
  if(typeof obj==="string"){ const m=obj.match(BLOBREF_RE); if(m)out.add(m[1]); }
  else if(Array.isArray(obj)){ for(const v of obj)collectBlobRefs(v,out); }
  else if(obj&&typeof obj==="object"){ for(const k in obj)collectBlobRefs(obj[k],out); }
  return out;
}
// Build a transportable payload: inline every referenced blob (decrypted) under _blobs so exports/syncs carry them.
// Tries the primary (full-zone) key first, then the restricted-zone key — client media must travel too.
async function packageWithBlobs(dataObj, dek, altKey){
  const refs=collectBlobRefs(dataObj); const _blobs={};
  for(const id of refs){
    let v=null; try{ v=await getBlob(id,dek); }catch{}
    if(v==null&&altKey){ try{ v=await getBlob(id,altKey); }catch{} }
    if(v!=null)_blobs[id]=v; // missing blobs are skipped (legacy inline data: stays inline already)
  }
  return {...dataObj,_blobs};
}
// Restore incoming blobs into the local store. Media referenced by client-zone roots is written under the
// restricted key (when available) so scoped client sessions can still view it; everything else under the full key.
async function ingestBlobs(payload, dek, rKey){
  if(payload && payload._blobs){
    let rRefs=new Set(); if(rKey){ try{ rRefs=collectBlobRefs(projectClientState(payload)); }catch{} }
    for(const id in payload._blobs){ try{ await putBlob(payload._blobs[id], (rKey&&rRefs.has(id))?rKey:dek, id); }catch{} }
  }
  const c={...payload}; delete c._blobs; return c;
}
// ── Cryptographic role scoping (Option B): the client-restricted tier holds DEK_R, which decrypts only an
// encrypted PROJECTION of client-visible data. All existing wraps (caregiver, MFA, recovery) keep holding
// DEK_F unchanged; DEK_R is stored wrapped UNDER DEK_F, so any path that recovers F derives R — one-way down.
// The same scoped-key + projection pattern generalizes to future consent zones (e.g., care-navigator access).
// Proven in tests/zone-core-test.mjs.
const PROJ_DB_KEY="proj-r";       // encrypted client projection (under DEK_R), in the vault store
const OUTBOX_DB_KEY="outbox-r";   // client-written self-reports awaiting caregiver ingestion (under DEK_R)
// Hard write-lock: set for the lifetime of a scoped client session. Asserted at the LOWEST vault-write
// primitives (not just the UI gates), so no stray effect, race, or future code path can let a scoped
// session touch the caregiver vault, snapshots, or WAL. (Reviewer Round 7, finding 5 — defense in depth.)
let _scopedWriteLock=false;
function assertVaultWritable(what){ if(_scopedWriteLock)throw new Error("CRITICAL: blocked "+what+" from a scoped client session"); }
// Erase every locally stored artifact (vault snapshots, WAL, blobs, projection, outbox, audit DB, anchors,
// and optionally the wrapped keys). Used by "start fresh": leaving old-key ciphertext behind a NEW key would
// make the next load try to decrypt stale snapshots it can never read.
async function wipeAllLocalData(includeKeys){
  try{ const db=await openVaultDB(); const tx=db.transaction([VAULT_STORE,WAL_STORE,BLOB_STORE],"readwrite");
    [VAULT_STORE,WAL_STORE,BLOB_STORE].forEach(s=>tx.objectStore(s).clear());
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)}); db.close(); }catch{}
  try{ indexedDB.deleteDatabase(AUDIT_DB_NAME); }catch{}
  try{ localStorage.removeItem(AUDIT_TIP_LS); localStorage.removeItem(HLC_LS); }catch{}
  if(includeKeys){ try{ localStorage.removeItem(VAULT_KEYS_LS); }catch{} }
}
const PROJ_ROOTS=["appointments","medSchedule","messages","selfReports","careShifts"];
const PROJ_DOMAIN_KEYS=["physical","cognitive","wellness"]; // care domains only — legal/financial stay private
const PROJ_SETTINGS_FIELDS=["deviceId","deviceName","stateCode","clientTier","schemaVersion","selfReportTip"]; // selfReportTip: the client view carries its own integrity anchor
function projectClientState(state){
  const p={settings:{}};
  for(const k of PROJ_ROOTS){ if(state[k]!==undefined)p[k]=state[k]; }
  if(state.domains){ p.domains={}; for(const dk of PROJ_DOMAIN_KEYS){ if(state.domains[dk])p.domains[dk]=state.domains[dk]; } }
  if(state.domainOverrides){ p.domainOverrides={}; for(const dk of PROJ_DOMAIN_KEYS){ if(state.domainOverrides[dk])p.domainOverrides[dk]=state.domainOverrides[dk]; } }
  for(const f of PROJ_SETTINGS_FIELDS){ if(state.settings&&state.settings[f]!==undefined)p.settings[f]=state.settings[f]; }
  return p;
}
async function idbPutKey(key,val){ if(_scopedWriteLock&&key!==PROJ_DB_KEY&&key!==OUTBOX_DB_KEY)throw new Error("CRITICAL: blocked vault-store write of '"+key+"' from a scoped client session"); const db=await openVaultDB(); const tx=db.transaction(VAULT_STORE,"readwrite"); tx.objectStore(VAULT_STORE).put(val,key); await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)}); db.close(); }
async function writeProjection(state,rKey){ if(!rKey)return; await idbPutKey(PROJ_DB_KEY, await encryptWithDEK(projectClientState(state),rKey)); }
async function readProjection(rKey){ const ct=await idbGet(VAULT_STORE,PROJ_DB_KEY); if(!ct)return null; return decryptWithDEK(ct,rKey); }
async function readOutbox(rKey){ try{ const ct=await idbGet(VAULT_STORE,OUTBOX_DB_KEY); if(!ct)return []; const v=await decryptWithDEK(ct,rKey); return Array.isArray(v)?v:[]; }catch{return []} }
// Pre-decrypt size gate (same principle as the Round-4 sync breaker): a bypassing client could write a giant
// outbox; parsing it during caregiver unlock would OOM-crash every login. Check ciphertext size FIRST.
const OUTBOX_HARD_CAP=8*1024*1024; // ~8 MB of base64 — legitimate outboxes (text + blobrefs) are kilobytes
async function outboxStatus(){ try{ const ct=await idbGet(VAULT_STORE,OUTBOX_DB_KEY); if(!ct)return {present:false}; return {present:true, oversized:(ct.length||0)>OUTBOX_HARD_CAP, bytes:Math.floor((ct.length||0)*3/4)}; }catch{return {present:false}} }
// Strict per-report whitelist: outbox contents are attacker-controllable by anyone holding DEK_R, so only known
// fields survive, sizes are capped, and chain fields (srSeq/srPrev/srHash) are STRIPPED — a crafted pre-chained
// report would otherwise corrupt chain verification. Origin is force-set by the caller.
function sanitizeOutboxReport(r){
  if(!r||typeof r!=="object")return null;
  const s=(v,max)=>typeof v==="string"?v.slice(0,max):"";
  const out={id:(typeof r.id==="number"||typeof r.id==="string")?String(r.id).slice(0,64):null,
    type:s(r.type,24), text:s(r.text,20000), mood:s(r.mood,16), pain:s(r.pain,16),
    date:s(r.date,32), timestamp:s(r.timestamp,64)};
  if(!out.id)return null;
  if(typeof r.audioData==="string"&&(r.audioData.startsWith("blobref:")||(r.audioData.startsWith("data:audio/")&&r.audioData.length<8000000)))out.audioData=r.audioData;
  if(Array.isArray(r.photos))out.photos=r.photos.filter(p=>typeof p==="string"&&(p.startsWith("blobref:")||(p.startsWith("data:image/")&&p.length<3000000))).slice(0,3);
  if(Array.isArray(r.mediaHashes))out.mediaHashes=r.mediaHashes.filter(h=>typeof h==="string"&&/^[a-f0-9]{64}$/.test(h)).slice(0,8);
  return out; // srSeq/srPrev/srHash/origin and any unknown fields do not survive
}
async function appendOutboxReport(report,rKey){ const cur=await readOutbox(rKey); cur.push(report); await idbPutKey(OUTBOX_DB_KEY, await encryptWithDEK(cur,rKey)); }
async function clearOutbox(){ try{ const db=await openVaultDB(); const tx=db.transaction(VAULT_STORE,"readwrite"); tx.objectStore(VAULT_STORE).delete(OUTBOX_DB_KEY); await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)}); db.close(); }catch{} }
// Derive (or create on first caregiver unlock — the migration) the restricted-zone key from the full key.
async function ensureRKey(dekF){
  const ko=loadWrappedKeys();
  if(ko&&ko.wk&&ko.wk.rUnderF){ try{ return b64dec(await decryptWithDEK(ko.wk.rUnderF,dekF)); }catch(e){ console.error("rUnderF unwrap failed:",e); } }
  const rKey=crypto.getRandomValues(new Uint8Array(32));
  try{ const k2=loadWrappedKeys(); if(k2&&k2.wk){ k2.wk.rUnderF=await encryptWithDEK(b64enc(rKey),dekF); saveWrappedKeys(k2.wk); } }catch(e){ console.error("rUnderF persist failed:",e); }
  return rKey;
}

// ── Client self-report integrity: the care recipient's own words are append-only. No role (including admin)
// can delete or alter a client-authored report in the app, and out-of-band tampering is made evident by a
// hash chain (same construction as the audit log) anchored in the synced vault AND in the client's projection.
// Honest limit, same as the audit chain: a full-key holder who controls the device can recompute; this is
// tamper-evidence against realistic manipulation, not non-repudiation.
function canonicalSr(r){ return JSON.stringify({id:r.id,type:r.type||"",text:r.text||"",mood:r.mood||"",pain:r.pain||"",date:r.date||"",timestamp:r.timestamp||"",audioData:r.audioData||null,photos:r.photos||[],mediaHashes:r.mediaHashes||[],origin:r.origin||"",srSeq:r.srSeq,srPrev:r.srPrev}); }
async function computeSrHash(r){ return sha256Hex(canonicalSr(r)); }
// Chain any not-yet-chained client-origin reports onto the existing chain; update the vault tip.
async function chainClientReports(state){
  const reports=[...(state.selfReports||[])];
  const chained=reports.filter(r=>r&&r.origin==="client"&&typeof r.srSeq==="number"&&r.srHash).sort((a,b)=>a.srSeq-b.srSeq);
  let maxSeq=0, prevHash="genesis";
  if(chained.length){ const last=chained[chained.length-1]; maxSeq=last.srSeq; prevHash=last.srHash; }
  const unchained=reports.filter(r=>r&&r.origin==="client"&&!(typeof r.srSeq==="number"&&r.srHash));
  if(!unchained.length) return {state, changed:false};
  unchained.sort((a,b)=>String(a.timestamp||"").localeCompare(String(b.timestamp||""))); // oldest first for stable order
  const byId=new Map();
  for(const u of unchained){ const e={...u, srSeq:++maxSeq, srPrev:prevHash}; e.srHash=await computeSrHash(e); prevHash=e.srHash; byId.set(e.id,e); }
  const newReports=reports.map(r=>(r&&byId.has(r.id))?byId.get(r.id):r);
  return {state:{...state, selfReports:newReports, settings:{...state.settings, selfReportTip:{seq:maxSeq, hash:prevHash}}}, changed:true};
}
// Verify the chain: content alteration, deletion (head, middle), and tail-truncation vs the anchored tip.
async function verifySrChain(reports, vaultTip){
  const chained=(reports||[]).filter(r=>r&&typeof r.srSeq==="number"&&r.srHash).sort((a,b)=>a.srSeq-b.srSeq);
  if(!chained.length) return {status:"none", chained:0, tip:null};
  let prev="genesis";
  for(let i=0;i<chained.length;i++){ const e=chained[i];
    if(i===0&&e.srSeq!==1) return {status:"broken", at:e.srSeq, chained:chained.length};        // head removed
    if(i>0&&e.srSeq!==chained[i-1].srSeq+1) return {status:"broken", at:e.srSeq, chained:chained.length}; // gap = deletion
    if(e.srPrev!==prev) return {status:"broken", at:e.srSeq, chained:chained.length};            // link broken
    const h=await computeSrHash(e); if(h!==e.srHash) return {status:"broken", at:e.srSeq, chained:chained.length}; // content altered
    prev=e.srHash;
  }
  const last=chained[chained.length-1]; const tip={seq:last.srSeq, hash:last.srHash};
  let truncated=false;
  if(vaultTip&&typeof vaultTip.seq==="number"){ if(vaultTip.seq>tip.seq)truncated=true; if(!truncated&&vaultTip.seq===tip.seq&&vaultTip.hash&&vaultTip.hash!==tip.hash)truncated=true; }
  return {status:truncated?"truncated":"ok", chained:chained.length, tip};
}

// ── Sync-flood circuit breaker ──────────────────────────────────────────────
// A serverless union merge can't trust the size of incoming data. A compromised or runaway device could append
// tens of thousands of records, ballooning the vault until honest nodes OOM on decrypt/merge. Two gates:
//  • HARD (pre-decrypt): refuse to even decrypt an absurdly large payload — pure out-of-memory protection.
//  • SOFT (post-merge): route an unusually large update to the review/quarantine UI instead of auto-applying.
const SYNC_HARD_CAP_BYTES = 128*1024*1024; // never decrypt beyond this (legit photo syncs stay far below)
const SYNC_SOFT_BYTES      = 25*1024*1024;  // above this, require explicit review before applying
const SYNC_SOFT_RECORDS    = 500;            // ...or this many newly-added records in one sync
function b64Bytes(s){ return Math.floor(((s||"").length)*3/4); }
function mb(bytes){ return Math.round(bytes/1048576); }
function payloadHardTooLarge(b64){ return b64Bytes(b64) > SYNC_HARD_CAP_BYTES; }
// Pre-parse gate: JSON.parse of a flood payload can itself exhaust memory, so raw text is length-checked
// BEFORE parsing (base64+JSON wrapper inflates ~4/3, hence the adjusted ceiling).
function rawTextTooLarge(t){ return ((t||"").length) > Math.floor(SYNC_HARD_CAP_BYTES*4/3); }
function mergeIsOversized(b64, report){ const newRecords=(report&&report.added&&report.added.length)||0; return (newRecords>SYNC_SOFT_RECORDS) || (b64Bytes(b64)>SYNC_SOFT_BYTES); }
// Resolves a media value to a usable src: legacy inline data: URLs render directly; blobref: ids are
// fetched from the blob store and decrypted (cached by id). Renders the photo thumb or audio player.
const _mediaCache=new Map();
function MediaThumb({value, dek, altKey, kind}){
  const initial=(typeof value==="string"&&value.startsWith("data:"))?value:((typeof value==="string"&&value.match(BLOBREF_RE)&&_mediaCache.get(value.match(BLOBREF_RE)[1]))||null);
  const [src,setSrc]=useState(initial);
  useEffect(()=>{ let alive=true;
    if(typeof value!=="string"){setSrc(null);return}
    if(value.startsWith("data:")){setSrc(value);return}
    const m=value.match(BLOBREF_RE); if(!m){setSrc(null);return}
    const id=m[1];
    if(_mediaCache.has(id)){setSrc(_mediaCache.get(id));return}
    (async()=>{ let d=null;
      try{ d=await getBlob(id,dek); }catch{}
      if(d==null&&altKey){ try{ d=await getBlob(id,altKey); }catch{} } // blob may live in the other zone (GCM auth picks the right key)
      if(d&&alive){_mediaCache.set(id,d);setSrc(d)}
    })();
    return()=>{alive=false};
  },[value,dek,altKey]);
  if(kind==="audio"){ return src ? (<audio src={src} controls style={{height:32,marginTop:6}}/>) : (<span className="hint">Loading audio…</span>); }
  return (<div className="photo-thumb">{src?<img src={src} alt="attachment"/>:<div className="photo-loading"/>}</div>);
}

// Legacy single-blob writers (still used by v2→v3 migration and as the pre-WAL base snapshot)
async function saveVaultData(encryptedB64){assertVaultWritable("saveVaultData");
  const db=await openVaultDB();
  const tx=db.transaction(VAULT_STORE,"readwrite");
  tx.objectStore(VAULT_STORE).put(encryptedB64,"data");
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=rej});
  db.close();
}
async function loadVaultData(){
  try{
    const db=await openVaultDB();
    const tx=db.transaction(VAULT_STORE,"readonly");
    const result=await new Promise((res,rej)=>{const r=tx.objectStore(VAULT_STORE).get("data");r.onsuccess=()=>res(r.result);r.onerror=rej});
    db.close();
    return result||null;
  }catch{return null}
}

// ── Write-ahead log + A/B snapshots ──
function idbGet(store,key){return openVaultDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(store,"readonly");const r=tx.objectStore(store).get(key);r.onsuccess=()=>{db.close();res(r.result)};r.onerror=()=>{db.close();rej(r.error)}}))}
// Append one encrypted diff at its sequence number. Append-only: never overwrites, so no write can clobber another.
async function walAppend(seq, ct){assertVaultWritable("walAppend");
  const db=await openVaultDB();const tx=db.transaction(WAL_STORE,"readwrite");
  tx.objectStore(WAL_STORE).put(ct,seq);
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
}
// Read all diffs with seq > afterSeq, in ascending seq order.
async function walReadSince(afterSeq){
  const db=await openVaultDB();const out=[];
  await new Promise((res,rej)=>{
    const tx=db.transaction(WAL_STORE,"readonly");
    const range=IDBKeyRange.lowerBound(afterSeq,true);
    const cur=tx.objectStore(WAL_STORE).openCursor(range);
    cur.onsuccess=(e)=>{const c=e.target.result;if(c){out.push({seq:c.key,ct:c.value});c.continue()}else res()};
    cur.onerror=()=>rej(cur.error);
  });db.close();return out;
}
// Delete diffs with seq <= uptoSeq (folded into a snapshot). Not correctness-critical — replay filters by seq anyway.
async function walPrune(uptoSeq){assertVaultWritable("walPrune");
  try{const db=await openVaultDB();const tx=db.transaction(WAL_STORE,"readwrite");
  tx.objectStore(WAL_STORE).delete(IDBKeyRange.upperBound(uptoSeq));
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();}catch{}
}
// Write a full snapshot to a slot, THEN flip the pointer. Crash before the flip leaves the old snapshot+WAL intact.
async function saveSnapshot(encryptedFull, seq, slot){assertVaultWritable("saveSnapshot");
  let db=await openVaultDB();let tx=db.transaction(VAULT_STORE,"readwrite");
  tx.objectStore(VAULT_STORE).put({seq,ct:encryptedFull},slot);   // seq travels WITH the snapshot
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
  db=await openVaultDB();tx=db.transaction(VAULT_STORE,"readwrite");
  tx.objectStore(VAULT_STORE).put({slot,seq},"walmeta");
  await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
}
// Load the active snapshot and replay the WAL on top. Falls back to the other A/B slot, then the legacy blob.
// Each slot carries its own seq, so a fallback replays from the correct point — never double-applying diffs.
async function loadVaultV4(dek){
  const meta=await idbGet(VAULT_STORE,"walmeta").catch(()=>null);
  const order=[];
  if(meta&&meta.slot)order.push(meta.slot);
  if(!order.includes("snapA"))order.push("snapA");
  if(!order.includes("snapB"))order.push("snapB");
  order.push("data"); // legacy / pre-WAL base
  let base=null,baseSeq=0,baseSlot=null;
  for(const slot of order){
    try{
      const val=await idbGet(VAULT_STORE,slot);if(!val)continue;
      const ct=(slot==="data")?val:val.ct; const seq=(slot==="data")?0:(val.seq||0);
      const st=await decryptWithDEK(ct,dek);
      base=st;baseSeq=seq;baseSlot=slot;break;
    }catch{/* slot unreadable → try next */}
  }
  if(base===null)return null; // nothing decryptable → caller treats as data loss
  let state=base,maxSeq=baseSeq;
  const entries=await walReadSince(baseSeq).catch(()=>[]);
  for(const en of entries){
    try{const patch=await decryptWithDEK(en.ct,dek);state=applyPatch(state,patch);if(en.seq>maxSeq)maxSeq=en.seq;}
    catch{/* corrupt diff: stop at last good state rather than risk divergence */ break;}
  }
  return {state,maxSeq,baseSeq,baseSlot};
}

function saveWrappedKeys(wk, mfa){try{const cur=loadWrappedKeys();const m=mfa!==undefined?mfa:(cur&&cur.mfa);localStorage.setItem(VAULT_KEYS_LS,JSON.stringify({v:"3.0",wk,...(m?{mfa:m}:{})}));return true}catch{return false}}
function loadWrappedKeys(){try{const raw=localStorage.getItem(VAULT_KEYS_LS);if(!raw)return null;return JSON.parse(raw)}catch{return null}}

async function migrateV2ToV3(){
  // Check if v2 vault exists in localStorage and v3 doesn't exist yet
  const v3keys=loadWrappedKeys();
  if(v3keys)return; // already migrated
  const v2raw=localStorage.getItem(VAULT_KEY);
  if(!v2raw)return; // no v2 data
  try{
    const v2=JSON.parse(v2raw);
    if(!v2||!v2.wk||!v2.d)return;
    // Split: keys → localStorage, data → IndexedDB
    saveWrappedKeys(v2.wk);
    await saveVaultData(v2.d);
    // Verify IndexedDB write before deleting old vault
    const verifyWrite=await loadVaultData();
    if(!verifyWrite){console.error("Migration verification failed — keeping v2 vault");return}
    localStorage.removeItem(VAULT_KEY);
    console.log("Vault migrated from localStorage to IndexedDB (v2 → v3)");
  }catch(e){console.error("Migration failed:",e)}
}

// Request persistent storage to prevent browser eviction
async function requestPersistentStorage(){
  if(navigator.storage&&navigator.storage.persist){
    const persisted=await navigator.storage.persist();
    console.log("Persistent storage:",persisted?"granted":"denied");
  }
}

async function getStorageEstimate(){
  if(navigator.storage&&navigator.storage.estimate){
    const{usage,quota}=await navigator.storage.estimate();
    return{usage,quota,pct:Math.round((usage/quota)*100)};
  }
  return null;
}

async function generateDEK() { return crypto.getRandomValues(new Uint8Array(32)); }

async function wrapDEK(dekRaw, passcode) {
  const enc=new TextEncoder();const salt=crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));
  const km=await crypto.subtle.importKey("raw",enc.encode(passcode),"PBKDF2",false,["deriveKey"]);
  const wk=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:KDF_ITER,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt"]);
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},wk,dekRaw);
  const r=new Uint8Array(salt.length+iv.length+ct.byteLength);r.set(salt,0);r.set(iv,16);r.set(new Uint8Array(ct),28);return btoa(String.fromCharCode(...r));
}

// Returns {dek, wasLegacy}. Tries the current iteration count first, then the legacy one; throws if both fail.
async function unwrapDEK(wrappedB64, passcode) {
  const buf=Uint8Array.from(atob(wrappedB64),c=>c.charCodeAt(0));
  const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(passcode),"PBKDF2",false,["deriveKey"]);
  for(const [iters,legacy] of [[KDF_ITER,false],[KDF_ITER_LEGACY,true]]){
    try{
      const wk=await crypto.subtle.deriveKey({name:"PBKDF2",salt:buf.slice(0,16),iterations:iters,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["decrypt"]);
      const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(16,28)},wk,buf.slice(28));
      return {dek:new Uint8Array(pt), wasLegacy:legacy};
    }catch{}
  }
  throw new Error("unwrapDEK: wrong passcode");
}

/* ═══ PRF-bound MFA (opt-in, professional roles) ═══
   The vault DEK is wrapped under a key derived from BOTH the passcode and a second factor — a WebAuthn
   passkey's PRF output, or (backstop) a printed recovery code. Neither factor alone can unwrap it.
   Key-combination core proven in mfa-core-test.mjs. */
const MFA_PRF_INFO = new TextEncoder().encode("care-guardian-mfa-v1");
const b64enc=u=>btoa(String.fromCharCode(...new Uint8Array(u)));
const b64dec=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function pbkdf2Bits(passcode,salt,iters){ const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(passcode),"PBKDF2",false,["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:iters||KDF_ITER,hash:"SHA-256"},km,256)); }
async function combineFactorKey(aBytes,bBytes,hsalt){ const ikm=new Uint8Array(aBytes.length+bBytes.length); ikm.set(aBytes,0); ikm.set(bBytes,aBytes.length); const base=await crypto.subtle.importKey("raw",ikm,"HKDF",false,["deriveKey"]); return crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:hsalt,info:MFA_PRF_INFO},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]); }
async function wrapWithKey(dekRaw,key){ const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,dekRaw)); const o=new Uint8Array(12+ct.length); o.set(iv,0); o.set(ct,12); return b64enc(o); }
async function unwrapWithKey(blob,key){ const buf=b64dec(blob); const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(0,12)},key,buf.slice(12)); return new Uint8Array(pt); }
// Build both second-factor wraps of the DEK. prfOutput = bytes from the passkey; recoveryCode = printed string.
async function buildMfaWraps(dekRaw, passcode, prfOutput, recoveryCode){
  const ps=crypto.getRandomValues(new Uint8Array(16)), hs=crypto.getRandomValues(new Uint8Array(16)), rs=crypto.getRandomValues(new Uint8Array(16));
  const pcB=await pbkdf2Bits(passcode,ps,KDF_ITER);
  const cMfa={ps:b64enc(ps),hs:b64enc(hs),blob:await wrapWithKey(dekRaw, await combineFactorKey(pcB,prfOutput,hs))};
  const recB=await pbkdf2Bits(recoveryCode,rs,KDF_ITER);
  const cRecovery={ps:b64enc(ps),rs:b64enc(rs),hs:b64enc(hs),blob:await wrapWithKey(dekRaw, await combineFactorKey(pcB,recB,hs))};
  return {cMfa,cRecovery};
}
// One passkey's wrap of the DEK (passcode + that passkey's PRF output). Multiple passkeys each get their own entry.
async function buildPasskeyWrap(dekRaw, passcode, prfOutput){ const ps=crypto.getRandomValues(new Uint8Array(16)), hs=crypto.getRandomValues(new Uint8Array(16)); const pcB=await pbkdf2Bits(passcode,ps,KDF_ITER); return {ps:b64enc(ps),hs:b64enc(hs),blob:await wrapWithKey(dekRaw, await combineFactorKey(pcB,prfOutput,hs))}; }
// Normalize either storage format → array of passkey entries [{credentialId, ps, hs, blob}].
function getMfaKeyEntries(ko){ if(!ko||!ko.wk)return []; if(Array.isArray(ko.wk.mfaKeys))return ko.wk.mfaKeys; if(ko.wk.cMfa&&ko.mfa&&ko.mfa.credentialId)return [{credentialId:ko.mfa.credentialId, ps:ko.wk.cMfa.ps, hs:ko.wk.cMfa.hs, blob:ko.wk.cMfa.blob}]; return []; }
async function unwrapWithPasskey(cMfa, passcode, prfOutput){ const pcB=await pbkdf2Bits(passcode,b64dec(cMfa.ps),KDF_ITER); return unwrapWithKey(cMfa.blob, await combineFactorKey(pcB,prfOutput,b64dec(cMfa.hs))); }
async function unwrapWithRecovery(cRecovery, passcode, recoveryCode){ const pcB=await pbkdf2Bits(passcode,b64dec(cRecovery.ps),KDF_ITER); const recB=await pbkdf2Bits(recoveryCode,b64dec(cRecovery.rs),KDF_ITER); return unwrapWithKey(cRecovery.blob, await combineFactorKey(pcB,recB,b64dec(cRecovery.hs))); }
// Rebuild just the recovery wrap (used when a one-time code is consumed and a fresh one is issued).
async function buildRecoveryWrap(dekRaw, passcode, recoveryCode){ const ps=crypto.getRandomValues(new Uint8Array(16)), hs=crypto.getRandomValues(new Uint8Array(16)), rs=crypto.getRandomValues(new Uint8Array(16)); const pcB=await pbkdf2Bits(passcode,ps,KDF_ITER); const recB=await pbkdf2Bits(recoveryCode,rs,KDF_ITER); return {ps:b64enc(ps),rs:b64enc(rs),hs:b64enc(hs),blob:await wrapWithKey(dekRaw,await combineFactorKey(pcB,recB,hs))}; }
// Recovery code: ~125 bits, Crockford-ish base32, grouped for printing.
function genRecoveryCode(){ const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const r=crypto.getRandomValues(new Uint8Array(25)); let s=""; for(let i=0;i<25;i++){ s+=A[r[i]&31]; if(i%5===4&&i<24)s+="-"; } return s; }
function normalizeRecoveryCode(s){ return (s||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
function webauthnAvailable(){ return typeof window!=="undefined" && !!(window.PublicKeyCredential) && !!(navigator.credentials&&navigator.credentials.create); }
// Register a passkey and obtain its PRF output for our app salt. Throws with a clear message if PRF is unsupported.
async function mfaRegisterPasskey(userName, prfSalt){
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  const userId=crypto.getRandomValues(new Uint8Array(16));
  const cred=await navigator.credentials.create({publicKey:{
    challenge, rp:{name:"Care Guardian"}, user:{id:userId,name:userName||"professional",displayName:userName||"Care Guardian user"},
    pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
    authenticatorSelection:{residentKey:"preferred",userVerification:"required"},
    extensions:{prf:{}}, timeout:60000,
  }});
  if(!cred) throw new Error("Passkey creation was cancelled.");
  const credentialId=b64enc(cred.rawId);
  // Many authenticators only return PRF output on get(), not create() — do an immediate assertion to fetch it.
  const {prfOutput}=await mfaAssertPrf([credentialId], b64enc(prfSalt));
  return {credentialId, prfOutput};
}
// Assert against a LIST of allowed passkeys; the authenticator picks whichever is present. Returns which one
// answered plus its PRF output, so the caller can select the matching wrap. (Shared salt; outputs differ per key.)
async function mfaAssertPrf(credentialIdsB64, prfSaltB64){
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  const assertion=await navigator.credentials.get({publicKey:{
    challenge, allowCredentials:(credentialIdsB64||[]).map(id=>({type:"public-key",id:b64dec(id)})),
    userVerification:"required", timeout:60000,
    extensions:{prf:{eval:{first:b64dec(prfSaltB64)}}},
  }});
  const ext=assertion&&assertion.getClientExtensionResults&&assertion.getClientExtensionResults();
  const first=ext&&ext.prf&&ext.prf.results&&ext.prf.results.first;
  if(!first) throw new Error("This authenticator doesn't support the PRF extension required for encryption-bound MFA, so MFA was not enabled and nothing changed. You can remove the just-created passkey from your device's passkey settings, then either try a PRF-capable authenticator (a modern phone/laptop biometric, or a FIDO2 security key with hmac-secret) or continue without MFA.");
  return {credentialId:b64enc(assertion.rawId), prfOutput:new Uint8Array(first)};
}

async function encryptWithDEK(data, dekRaw) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await crypto.subtle.importKey("raw",dekRaw,{name:"AES-GCM"},false,["encrypt"]);
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(data)));
  const r=new Uint8Array(iv.length+ct.byteLength);r.set(iv,0);r.set(new Uint8Array(ct),12);return btoa(String.fromCharCode(...r));
}

async function decryptWithDEK(b64, dekRaw) {
  const buf=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey("raw",dekRaw,{name:"AES-GCM"},false,["decrypt"]);
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(0,12)},key,buf.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}

// ── Write-ahead-log core: structural diff/apply. Proven by 200k+ round-trip + 20k replay-chain tests. ──
// applyPatch(prev, diffState(prev,next)) deep-equals next for all JSON-safe states. Replay applies recorded
// deltas only — it never re-runs business logic — so a reconstructed state cannot diverge from what produced it.
function walClone(v){ return v===undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function walIsObj(v){ return v!==null && typeof v==="object" && !Array.isArray(v); }
function diffState(prev, next){
  if (prev === next) return undefined;
  const pa=Array.isArray(prev), na=Array.isArray(next), po=walIsObj(prev), no=walIsObj(next);
  if (pa!==na || po!==no || (!pa&&!po)) return { set: walClone(next) };
  if (na){
    const pl=prev.length, nl=next.length;
    if (nl>=pl){ let ok=true; for(let i=0;i<pl;i++){if(prev[i]!==next[i]){ok=false;break}} if(ok) return pl===nl?undefined:{ arrApp: walClone(next.slice(pl)) }; }
    if (nl>=pl){ let ok=true; const off=nl-pl; for(let i=0;i<pl;i++){if(prev[i]!==next[off+i]){ok=false;break}} if(ok) return off===0?undefined:{ arrPre: walClone(next.slice(0,off)) }; }
    if (pl===nl){ const c={}; let any=false; for(let i=0;i<pl;i++){const sp=diffState(prev[i],next[i]);if(sp!==undefined){c[i]=sp;any=true}} return any?{arrIdx:c}:undefined; }
    return { arrSet: walClone(next) };
  }
  const obj={}; let any=false;
  for (const k in next){ if(!Object.prototype.hasOwnProperty.call(next,k))continue; if(!(k in prev)){obj[k]={set:walClone(next[k])};any=true} else {const sp=diffState(prev[k],next[k]);if(sp!==undefined){obj[k]=sp;any=true}} }
  const rm=[]; for (const k in prev){ if(Object.prototype.hasOwnProperty.call(prev,k)&&!(k in next))rm.push(k); }
  if(!any&&rm.length===0) return undefined;
  const p={}; if(any)p.obj=obj; if(rm.length)p.rm=rm; return p;
}
function applyPatch(prev, patch){
  if (patch===undefined) return prev;
  if ("set" in patch) return walClone(patch.set);
  if ("arrSet" in patch) return walClone(patch.arrSet);
  if ("arrApp" in patch) return prev.concat(walClone(patch.arrApp));
  if ("arrPre" in patch) return walClone(patch.arrPre).concat(prev);
  if ("arrIdx" in patch){ const out=prev.slice(); for(const i in patch.arrIdx){out[i]=applyPatch(prev[i],patch.arrIdx[i])} return out; }
  const out=Array.isArray(prev)?prev.slice():{...prev};
  if (patch.obj){ for(const k in patch.obj){out[k]=applyPatch(prev[k],patch.obj[k])} }
  if (patch.rm){ for(const k of patch.rm){delete out[k]} }
  return out;
}

// Legacy functions — kept for migration detection only
function loadVault() { try { return JSON.parse(localStorage.getItem(VAULT_KEY)); } catch { return null; } }
function saveVaultRaw(vault) { /* no-op in v3 — use saveWrappedKeys + saveVaultData */ }
// ═══ IndexedDB Audit Log (HIPAA §164.312(b)) ═══
// Stored separately from the main vault — survives vault deletion
const AUDIT_DB_NAME="care-guardian-audit";
const AUDIT_DB_VERSION=1;
const AUDIT_STORE="entries";
const AUDIT_SALT_HEX="a1b2c3d4e5f6a7b8"; // Different salt from main vault

function openAuditDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(AUDIT_DB_NAME,AUDIT_DB_VERSION);
    req.onupgradeneeded=(e)=>{const db=e.target.result;if(!db.objectStoreNames.contains(AUDIT_STORE)){db.createObjectStore(AUDIT_STORE,{keyPath:"id"})}};
    req.onsuccess=(e)=>resolve(e.target.result);
    req.onerror=(e)=>reject(e.target.error);
  });
}

async function deriveAuditKey(passcode, iterations){
  const enc=new TextEncoder();
  const salt=new Uint8Array(AUDIT_SALT_HEX.match(/.{2}/g).map(b=>parseInt(b,16)));
  const keyMaterial=await crypto.subtle.importKey("raw",enc.encode(passcode),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:iterations||KDF_ITER,hash:"SHA-256"},keyMaterial,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}

async function encryptAuditEntry(entry,key){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const enc=new TextEncoder();
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(JSON.stringify(entry)));
  return{id:entry.id,iv:Array.from(iv),ct:Array.from(new Uint8Array(ct))};
}

async function decryptAuditEntry(record,key){
  const iv=new Uint8Array(record.iv);
  const ct=new Uint8Array(record.ct);
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

async function writeAuditEntry(entry,key){
  try{
    const db=await openAuditDB();
    const encrypted=await encryptAuditEntry(entry,key);
    const tx=db.transaction(AUDIT_STORE,"readwrite");
    tx.objectStore(AUDIT_STORE).put(encrypted);
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=rej});
    db.close();
  }catch(e){console.error("Audit write failed:",e)}
}

async function readAuditLog(keyOrKeys,limit){
  const keys=Array.isArray(keyOrKeys)?keyOrKeys.filter(Boolean):[keyOrKeys];
  try{
    const db=await openAuditDB();
    const tx=db.transaction(AUDIT_STORE,"readonly");
    const store=tx.objectStore(AUDIT_STORE);
    const all=await new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result);r.onerror=rej});
    db.close();
    const decrypted=[];
    for(const record of all.slice(-(limit||1000))){
      for(const k of keys){ try{decrypted.push(await decryptAuditEntry(record,k));break;}catch{} } // try each key (current, then legacy)
    }
    return decrypted.sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  }catch(e){console.error("Audit read failed:",e);return[]}
}

/* ═══ Audit hash-chain (tamper-evidence) ═══
   Each entry carries seq + prevHash; its own hash covers its content AND prevHash, so deleting or altering
   any interior entry breaks the chain detectably. Honest limit: a holder of the passcode can recompute the
   entire chain from a chosen point — so this provides tamper-EVIDENCE against partial edits, not cryptographic
   prevention against a determined insider (which would require an external append-only anchor). */
const AUDIT_TIP_LS = "cg-audit-tip";
async function sha256Hex(str){
  const buf=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function canonicalAuditEntry(e){
  return JSON.stringify([e.id,e.seq,e.timestamp,e.action,e.detail,e.phiType,e.userId,e.userName,e.role,e.prevHash||""]);
}
async function computeEntryHash(e){ return sha256Hex(canonicalAuditEntry(e)); }
function saveAuditTip(seq,hash){ try{localStorage.setItem(AUDIT_TIP_LS,JSON.stringify({seq,hash}))}catch{} }
function loadAuditTip(){ try{const r=localStorage.getItem(AUDIT_TIP_LS);return r?JSON.parse(r):null}catch{return null} }
// Verify the chained subset (entries with seq+hash). Returns {status, brokenAtSeq, chained, total, tip}.
async function verifyAuditChain(entries, vaultTip){
  const chained=entries.filter(e=>typeof e.seq==="number"&&e.hash).sort((a,b)=>a.seq-b.seq);
  const total=entries.length;
  if(chained.length===0) return {status:"none", chained:0, total, tip:null};
  let brokenAtSeq=null;
  for(let i=0;i<chained.length;i++){
    const e=chained[i];
    const expected=await computeEntryHash(e);
    if(expected!==e.hash){ brokenAtSeq=e.seq; break; }                          // content altered
    if(i>0 && e.prevHash!==chained[i-1].hash){ brokenAtSeq=e.seq; break; }       // link broken (deletion/reorder)
    if(i>0 && e.seq!==chained[i-1].seq+1){ brokenAtSeq=e.seq; break; }           // sequence gap (deletion)
  }
  const last=chained[chained.length-1];
  const tip={seq:last.seq,hash:last.hash};
  // Truncation check against two anchors: the localStorage tip (fresh, but device-local) AND the tip persisted
  // inside the encrypted, WAL-backed, synced vault (harder to roll back — defeats silent tail-truncation).
  const stored=loadAuditTip();
  let truncated=false;
  if(!brokenAtSeq){
    if(stored && stored.seq>tip.seq) truncated=true;
    if(vaultTip && typeof vaultTip.seq==="number" && vaultTip.seq>tip.seq) truncated=true;
    // also catch a hash mismatch at the anchored seq (entry replaced rather than removed)
    if(!truncated && vaultTip && vaultTip.seq===tip.seq && vaultTip.hash && vaultTip.hash!==tip.hash) truncated=true;
  }
  return {status: brokenAtSeq?"broken":(truncated?"truncated":"ok"), brokenAtSeq, chained:chained.length, total, tip};
}

async function getAuditCount(){
  try{
    const db=await openAuditDB();
    const tx=db.transaction(AUDIT_STORE,"readonly");
    const count=await new Promise((res,rej)=>{const r=tx.objectStore(AUDIT_STORE).count();r.onsuccess=()=>res(r.result);r.onerror=rej});
    db.close();
    return count;
  }catch{return 0}
}

function hasLegacyData() { try { return !!localStorage.getItem(SKEY); } catch { return false; } }
function loadLegacyData() { try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; } }
function clearLegacyData() { try { localStorage.removeItem(SKEY); } catch {} }

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 8;

/* ═══ Roles & Permissions ═══ */
const ROLES = [
  {key:"admin",label:"Admin",desc:"Full access. Manages team, settings, and all data.",icon:"👑"},
  {key:"family",label:"Family",desc:"Full view. Can add, edit, and export. Cannot manage team or settings.",icon:"👨‍👩‍👧"},
  {key:"carepro",label:"Care Professional",desc:"Care-focused access. No legal, financial, or export.",icon:"🩺"},
  {key:"client-full",label:"Client (Independent)",desc:"Full view including legal and financial. Can export and submit self-reports.",icon:"🟢"},
  {key:"client-restricted",label:"Client (Supported)",desc:"Limited view. Can submit self-reports and view messages.",icon:"🛡"},
];
const CAREPRO_DOMAINS = ["physical","cognitive","wellness"];
const CAREPRO_CONTACT_CATS = ["medical","care"];
const CAREPRO_TABS = ["overview","physical","cognitive","wellness","incidents","medadmin","shifts","messages","emergency","sync"];
const FAMILY_HIDDEN_TABS = [];
const CLIENT_FULL_TABS = ["overview","physical","cognitive","wellness","legal","financial","incidents","expenses","medadmin","contacts","calendar","messages","selfreport","documents","emergency","triggers","tracking","visit","help"];
const CLIENT_RESTRICTED_TABS = ["overview","physical","cognitive","wellness","messages","selfreport","help"];

function downloadFile(content,filename,type="application/json") {
  // Try standard download first
  try {
    const blob = new Blob([content],{type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  } catch(e) {
    // Fallback: copy to clipboard
    try { navigator.clipboard.writeText(content); } catch {}
  }
}

/* ═══ Input sanitization & validation (M2, M4, M5) ═══ */
const MAX_FIELD_LEN = 2000;
const MAX_NOTE_LEN = 10000;
const MAX_ARRAY_LEN = 5000;

function sanitizeText(str, maxLen=MAX_FIELD_LEN) {
  if (typeof str !== "string") return "";
  // Strip control characters except newline/tab, trim, enforce length
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

function sanitizeContact(c) {
  return {
    ...EMPTY_CONTACT,
    name: sanitizeText(c.name || "", 200),
    role: sanitizeText(c.role || "", 200),
    org: sanitizeText(c.org || "", 200),
    phone: sanitizeText(c.phone || "", 50).replace(/[^\d+\-() .ext]/gi, ""),
    email: sanitizeText(c.email || "", 200),
    category: ["medical","care","legal","financial","family","other"].includes(c.category) ? c.category : "other",
    customFields: Array.isArray(c.customFields) ? c.customFields.slice(0, 20).map(f => ({
      label: sanitizeText(f.label || "", 100),
      value: sanitizeText(f.value || "", 500)
    })) : [],
    notes: Array.isArray(c.notes) ? c.notes.slice(0, 50).map(n => ({
      text: sanitizeText(n.text || "", MAX_NOTE_LEN),
      date: sanitizeText(n.date || "", 50)
    })) : [],
  };
}

function validateImportSchema(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") { errors.push("Not a valid data object"); return { valid: false, errors }; }
  // Check for required top-level keys
  if (!obj.domains || typeof obj.domains !== "object") errors.push("Missing or invalid domains");
  if (obj.contacts && !Array.isArray(obj.contacts)) errors.push("contacts must be an array");
  if (obj.incidents && !Array.isArray(obj.incidents)) errors.push("incidents must be an array");
  if (obj.expenses && !Array.isArray(obj.expenses)) errors.push("expenses must be an array");
  if (obj.messages && !Array.isArray(obj.messages)) errors.push("messages must be an array");
  // Check array sizes
  ["contacts","incidents","expenses","messages","selfReports","savedDocs"].forEach(k => {
    if (Array.isArray(obj[k]) && obj[k].length > MAX_ARRAY_LEN) errors.push(k + " exceeds maximum size (" + MAX_ARRAY_LEN + ")");
  });
  // Reject data with timestamps more than 24h in the future (M5 - anti-spoofing)
  const maxTs = Date.now() + 86400000;
  if ((obj._sync&&obj._sync.exportedAt) && new Date(obj._sync.exportedAt).getTime() > maxTs) errors.push("Export timestamp is in the future — possible data spoofing");
  return { valid: errors.length === 0, errors };
}

// Pure recursive rebuild that drops prototype-pollution keys at every level (defense in depth)
function deepStripUnsafe(o){
  if(Array.isArray(o))return o.map(deepStripUnsafe);
  if(o&&typeof o==="object"){
    const clean={};
    for(const k of Object.keys(o)){
      if(k==="__proto__"||k==="constructor"||k==="prototype")continue;
      clean[k]=deepStripUnsafe(o[k]);
    }
    return clean;
  }
  return o;
}

// Top-level keys permitted in imported/restored data (superset of initState shape)
const SAFE_TOP_KEYS=["domains","domainOverrides","domainStatus","contacts","appointments","messages","incidents","expenses","medSchedule","medications","emergencyPlans","shifts","careShifts","availability","transitionTriggers","statusHistory","postDeathChecklist","selfReports","savedDocs","documents","caregiverWellness","capacityLog","poaDecisions","log","activityLog","settings","_sync","_exportMeta"];

function sanitizeImportData(obj) {
  // Defense in depth: rebuild a clean copy with no prototype-pollution keys (also makes this pure)
  obj = deepStripUnsafe(obj);
  // Drop any unexpected top-level keys
  Object.keys(obj).forEach(k=>{ if(!SAFE_TOP_KEYS.includes(k)) delete obj[k]; });
  // Bound and sanitize the settings block (carries deviceName, team roster/roles, stateCode)
  if (obj.settings && typeof obj.settings === "object") {
    const st = obj.settings;
    if (st.deviceName!=null) st.deviceName = sanitizeText(st.deviceName, 100);
    if (st.deviceId!=null) st.deviceId = sanitizeText(st.deviceId, 64);
    if (st.stateCode!=null) st.stateCode = sanitizeText(st.stateCode, 8);
    delete st.syncPasscode; // never accept a sync passcode from an imported file
    if (st.team && typeof st.team === "object" && Array.isArray(st.team.members)) {
      st.team.members = st.team.members.slice(0, 20).map(m => ({
        ...m,
        deviceId: sanitizeText(m.deviceId, 64),
        name: sanitizeText(m.name, 100),
        role: sanitizeText(m.role, 40)
      }));
    }
  }
  // Validate photo arrays in incidents and selfReports
  const valPhotos=(arr)=>(arr||[]).map(item=>{if(item&&item.photos){item.photos=item.photos.filter(p=>typeof p==="string"&&(p.startsWith("blobref:")||(p.startsWith("data:image/")&&p.length<3000000))).slice(0,3)}
    if(item&&item.audioData!=null){const a=item.audioData;if(!(typeof a==="string"&&(a.startsWith("blobref:")||(a.startsWith("data:audio/")&&a.length<8000000))))item.audioData=null}
    return item});
  if(obj.incidents)obj.incidents=valPhotos(obj.incidents);
  if(obj.selfReports)obj.selfReports=valPhotos(obj.selfReports);
  // Sanitize string fields throughout the imported data
  if (obj.contacts) obj.contacts = obj.contacts.slice(0, MAX_ARRAY_LEN).map(sanitizeContact);
  if (obj.incidents) obj.incidents = obj.incidents.slice(0, MAX_ARRAY_LEN).map(i => ({
    ...i, id: sanitizeText(i.id, 50), description: sanitizeText(i.description, MAX_FIELD_LEN),
    response: sanitizeText(i.response, MAX_FIELD_LEN), injuries: sanitizeText(i.injuries, 500),
    providerNotified: sanitizeText(i.providerNotified, 200)
  }));
  if (obj.expenses) obj.expenses = obj.expenses.slice(0, MAX_ARRAY_LEN).map(e => ({
    ...e, id: sanitizeText(e.id, 50), description: sanitizeText(e.description, MAX_FIELD_LEN),
    payee: sanitizeText(e.payee, 200), receipt: sanitizeText(e.receipt, 200),
    amount: typeof e.amount === "number" ? e.amount : parseFloat(e.amount) || 0
  }));
  if (obj.messages) obj.messages = obj.messages.slice(0, MAX_ARRAY_LEN).map(m => ({
    ...m, id: sanitizeText(m.id, 50), from: sanitizeText(m.from, 100), text: sanitizeText(m.text, MAX_FIELD_LEN)
  }));
  if (obj.selfReports) obj.selfReports = obj.selfReports.slice(0, MAX_ARRAY_LEN).map(r => ({
    ...r, id: sanitizeText(r.id, 50), text: sanitizeText(r.text, MAX_FIELD_LEN),
    mood: sanitizeText(r.mood, 50), pain: sanitizeText(r.pain, 50)
  }));
  // Sanitize domain notes
  if (obj.domains) Object.keys(obj.domains).forEach(k => {
    if ((obj.domains[k]&&obj.domains[k].notes)) obj.domains[k].notes = sanitizeText(obj.domains[k].notes, MAX_NOTE_LEN * 5);
  });
  return obj;
}

/* URL validation for sync (M1) */
const TRUSTED_SYNC_DOMAINS = ["drive.google.com","docs.google.com","www.dropbox.com","dl.dropboxusercontent.com","onedrive.live.com","icloud.com","github.com","raw.githubusercontent.com"];

function validateSyncUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return { valid: false, msg: "Only HTTPS URLs are allowed for security." };
    if (u.hostname === "localhost" || u.hostname.startsWith("127.") || u.hostname.startsWith("192.168.") || u.hostname.startsWith("10.") || u.hostname === "0.0.0.0" || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname) || u.hostname==="[::1]" || u.hostname.endsWith(".local")) return { valid: false, msg: "Local/private network URLs are not allowed." };
    const trusted = TRUSTED_SYNC_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith("." + d));
    return { valid: true, trusted, msg: trusted ? null : "This domain is not a recognized cloud provider. Proceed with caution." };
  } catch { return { valid: false, msg: "Invalid URL format." }; }
}

/* ═══ PDF.js — bundled locally (no network), lazy-loaded only when a document is scanned ═══ */
let _pdfjs = null;
async function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  const lib = await import("pdfjs-dist/legacy/build/pdf.mjs"); // separate local chunk, fetched from the app's own origin
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  _pdfjs = lib;
  return lib;
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n\n";
  }
  return text.trim();
}

/* ═══ Document type detection ═══ */
const DOC_TYPES = [
  { key: "medications", label: "Medication List", icon: "💊", keywords: ["medication","prescription","drug","tablet","capsule","mg","mcg","dose","refill","pharmacy","dispense","rx","sig:","take","daily","twice","oral"] },
  { key: "labs", label: "Lab Results", icon: "🔬", keywords: ["lab","result","reference range","normal","abnormal","high","low","specimen","blood","urine","serum","plasma","hemoglobin","glucose","creatinine","cholesterol","cbc","bmp","cmp","tsh","a1c","wbc","rbc","hematocrit"] },
  { key: "clinical", label: "Clinical Note", icon: "📋", keywords: ["assessment","plan","history","chief complaint","subjective","objective","hpi","review of systems","physical exam","impression","diagnosis","follow-up","patient","encounter"] },
  { key: "general", label: "General Document", icon: "📄", keywords: [] },
];

function detectDocType(text) {
  const lower = text.toLowerCase();
  let best = DOC_TYPES[DOC_TYPES.length - 1]; let bestScore = 0;
  for (const dt of DOC_TYPES) {
    if (!dt.keywords.length) continue;
    const score = dt.keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = dt; }
  }
  return best;
}

/* ═══ Medication parser ═══ */
// Common drug names (subset — covers ~80% of dementia care medications)
const COMMON_DRUGS = "donepezil|aricept|memantine|namenda|rivastigmine|exelon|galantamine|razadyne|levetiracetam|keppra|quetiapine|seroquel|risperidone|risperdal|olanzapine|zyprexa|haloperidol|haldol|lorazepam|ativan|alprazolam|xanax|diazepam|valium|sertraline|zoloft|citalopram|celexa|escitalopram|lexapro|fluoxetine|prozac|paroxetine|paxil|trazodone|desyrel|mirtazapine|remeron|duloxetine|cymbalta|venlafaxine|effexor|bupropion|wellbutrin|aripiprazole|abilify|lamotrigine|lamictal|gabapentin|neurontin|pregabalin|lyrica|carbamazepine|tegretol|valproic|depakote|lithium|lisinopril|amlodipine|norvasc|metoprolol|lopressor|atenolol|losartan|cozaar|valsartan|diovan|hydrochlorothiazide|hctz|furosemide|lasix|spironolactone|warfarin|coumadin|apixaban|eliquis|rivaroxaban|xarelto|clopidogrel|plavix|aspirin|atorvastatin|lipitor|simvastatin|zocor|rosuvastatin|crestor|pravastatin|metformin|glucophage|glipizide|glyburide|insulin|lantus|humalog|novolog|levothyroxine|synthroid|omeprazole|prilosec|pantoprazole|protonix|esomeprazole|nexium|famotidine|pepcid|ranitidine|acetaminophen|tylenol|ibuprofen|advil|naproxen|aleve|tramadol|hydrocodone|oxycodone|morphine|fentanyl|prednisone|methylprednisolone|albuterol|proair|fluticasone|montelukast|singulair|cetirizine|zyrtec|loratadine|claritin|diphenhydramine|benadryl|docusate|colace|polyethylene|miralax|bisacodyl|senna|tamsulosin|flomax|finasteride|proscar|sildenafil|zolpidem|ambien|melatonin|vitamin|calcium|magnesium|potassium|iron|zinc|b12|folic acid|fish oil|omega";

function parseMedications(text) {
  const meds = [];
  const lines = text.split(/\n/);
  const drugRe = new RegExp(`(${COMMON_DRUGS})`, "gi");
  const doseRe = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?|iu|meq)(?:\/\d+\s*(?:mg|mcg|ml))?/gi;
  const freqPatterns = [
    [/\b(?:once\s+)?daily\b/i, "Daily"],
    [/\btwice\s+(?:a\s+)?day\b|bid\b/i, "Twice daily"],
    [/\bthree\s+times?\s+(?:a\s+)?day\b|tid\b/i, "Three times daily"],
    [/\bfour\s+times?\s+(?:a\s+)?day\b|qid\b/i, "Four times daily"],
    [/\bevery\s+(\d+)\s+hours?\b/i, "Every $1 hours"],
    [/\bat\s+bedtime\b|qhs\b|\bh\.?s\.?\b/i, "At bedtime"],
    [/\bin\s+the\s+morning\b|q\.?a\.?m\.?\b/i, "In the morning"],
    [/\bwith\s+meals?\b/i, "With meals"],
    [/\bas\s+needed\b|prn\b/i, "As needed (PRN)"],
    [/\bweekly\b/i, "Weekly"],
    [/\bmonthly\b/i, "Monthly"],
    [/\bevery\s+other\s+day\b|qod\b/i, "Every other day"],
  ];
  const routePatterns = [
    [/\boral(?:ly)?\b|\bby\s+mouth\b|p\.?o\.?\b/i, "Oral"],
    [/\btopical(?:ly)?\b/i, "Topical"],
    [/\bsubcutaneous(?:ly)?\b|subq?\b|s\.?c\.?\b/i, "Subcutaneous"],
    [/\bintravenous(?:ly)?\b|i\.?v\.?\b/i, "IV"],
    [/\bintramuscular(?:ly)?\b|i\.?m\.?\b/i, "IM"],
    [/\binhale[d]?\b|inhalation\b/i, "Inhaled"],
    [/\brectal(?:ly)?\b|p\.?r\.?\b/i, "Rectal"],
    [/\btransdermal\b|patch\b/i, "Transdermal"],
    [/\bophthalmic\b|eye\s*drop/i, "Ophthalmic"],
    [/\bsublingual(?:ly)?\b|s\.?l\.?\b/i, "Sublingual"],
  ];

  for (const line of lines) {
    const drugMatch = line.match(drugRe);
    if (!drugMatch) continue;
    // Deduplicate — take first drug mention per line
    const drugName = drugMatch[0].charAt(0).toUpperCase() + drugMatch[0].slice(1).toLowerCase();
    const doseMatch = line.match(doseRe);
    let freq = ""; let route = "";
    for (const [re, label] of freqPatterns) { if (re.test(line)) { freq = label; break; } }
    for (const [re, label] of routePatterns) { if (re.test(line)) { route = label; break; } }
    // Avoid duplicate entries for same drug
    if (!meds.find(m => m.name.toLowerCase() === drugName.toLowerCase())) {
      meds.push({ name: drugName, dosage: doseMatch ? doseMatch[0] : "", frequency: freq, route: route, notes: "" });
    }
  }
  // Also try line-by-line pattern: lines that start with a capitalized word followed by dosage
  if (meds.length === 0) {
    const genericLineRe = /^[\s*•\-\d.]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?))/gm;
    let m;
    while ((m = genericLineRe.exec(text)) !== null) {
      const name = m[1].trim(); const dosage = m[2].trim();
      const lineCtx = text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 80);
      let freq = ""; let route = "";
      for (const [re, label] of freqPatterns) { if (re.test(lineCtx)) { freq = label; break; } }
      for (const [re, label] of routePatterns) { if (re.test(lineCtx)) { route = label; break; } }
      if (!meds.find(x => x.name.toLowerCase() === name.toLowerCase())) {
        meds.push({ name, dosage, frequency: freq, route, notes: "" });
      }
    }
  }
  return meds;
}

/* ═══ Lab results parser ═══ */
function parseLabResults(text) {
  const results = [];
  const lines = text.split(/\n/);
  // Pattern: Test Name ... Value ... Unit ... Reference Range
  const labRe = /([A-Za-z][A-Za-z\s/(),.#-]{2,40})\s*[:=]?\s*(\d+\.?\d*)\s*([\w/%]+)?\s*(?:[\[(]?\s*(\d+\.?\d*\s*[-–]\s*\d+\.?\d*)\s*[\])]?)?/;
  const flagRe = /\b(high|low|abnormal|critical|H|L|HH|LL|A|C)\b/i;
  for (const line of lines) {
    const m = line.match(labRe);
    if (!m) continue;
    const testName = m[1].trim().replace(/\s+/g, " ");
    // Skip if test name is too short or looks like a header/number
    if (testName.length < 3 || /^\d/.test(testName) || /^(page|date|time|name|patient|doctor|lab|specimen)/i.test(testName)) continue;
    const value = m[2]; const unit = m[3] || ""; const range = m[4] || "";
    const flagMatch = line.match(flagRe);
    const flag = flagMatch ? flagMatch[1].toUpperCase() : "";
    results.push({ test: testName, value, unit, range, flag, notes: "" });
  }
  return results;
}

/* ═══ Clinical note section parser ═══ */
function parseClinicalSections(text) {
  const sections = [];
  const headings = ["Chief Complaint","History of Present Illness","HPI","Past Medical History","PMH","Medications","Allergies","Review of Systems","ROS","Physical Exam","Physical Examination","Assessment","Plan","Assessment and Plan","A/P","Impression","Diagnosis","Diagnoses","Vitals","Vital Signs","Social History","Family History","Follow-Up","Instructions","Referrals"];
  const headingRe = new RegExp("^\\s*(?:" + headings.join("|") + ")\\s*[:\\-]?\\s*", "gim");
  const parts = text.split(headingRe);
  const matches = [...text.matchAll(new RegExp("^\\s*(" + headings.join("|") + ")\\s*[:\\-]?", "gim"))];
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim();
    const body = (parts[i + 1] || "").trim().slice(0, 2000);
    if (body.length > 5) sections.push({ title, body });
  }
  if (sections.length === 0 && text.trim().length > 10) {
    sections.push({ title: "Full Text", body: text.trim().slice(0, 5000) });
  }
  return sections;
}

/* Calendar helpers */
function getMonthDays(y,m) { return new Date(y,m+1,0).getDate(); }
function getFirstDow(y,m) { return new Date(y,m,1).getDay(); }
function fmtDate(y,m,d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

/* ═══════════════ COMPONENT ═══════════════ */
export default function App() {
  const [authed,setAuthed]=useState(false);
  const [authMode,setAuthMode]=useState(null); // "caregiver"|"client"
  const [pc,setPc]=useState(""); const [pcErr,setPcErr]=useState(false);
  const [setupMode,setSetupMode]=useState(false);
  const [setupCgPw,setSetupCgPw]=useState("");
  const [dataLossDetected,setDataLossDetected]=useState(false);
  const [recoveryReason,setRecoveryReason]=useState("dataloss"); // "dataloss" (eviction) | "forgot" (user-initiated from unlock)
  const [recoveryData,setRecoveryData]=useState(null);
  const [recoveryPw,setRecoveryPw]=useState("");
  const [recoveryErr,setRecoveryErr]=useState("");
  const [showInstallNudge,setShowInstallNudge]=useState(false);
  const [onbStep,setOnbStep]=useState(0); // 0 privacy · 1 install · 2 passcode
  const [showFirstWin,setShowFirstWin]=useState(false);
  const [fwName,setFwName]=useState("");
  const [fwDocName,setFwDocName]=useState("");
  const [fwDocPhone,setFwDocPhone]=useState("");
  const [deferredInstall,setDeferredInstall]=useState(null);
  const [showBackupReminder,setShowBackupReminder]=useState(false);
  const [setupClPw,setSetupClPw]=useState("");
  const [setupConfirm,setSetupConfirm]=useState("");
  const [setupErr,setSetupErr]=useState("");
  const [authAttempts,setAuthAttempts]=useState(0);
  const [authLockUntil,setAuthLockUntil]=useState(0);
  const dekRef=useRef(null);
  const rKeyRef=useRef(null);            // restricted-zone key (DEK_R); caregiver sessions derive it, scoped client sessions hold ONLY it
  const clientScopedRef=useRef(false);   // true → this session is cryptographically scoped: persist projection ONLY, never vault/WAL/audit
  const [clientScoped,setClientScoped]=useState(false);
  const [srChainStatus,setSrChainStatus]=useState(null); // client self-report chain verification result
  const [outboxOversized,setOutboxOversized]=useState(0); // bytes; >0 → quarantined pending review
  const auditKeyRef=useRef(null);
  const [auditEntries,setAuditEntries]=useState([]);
  const [storageInfo,setStorageInfo]=useState(null);
  const [auditChainStatus,setAuditChainStatus]=useState(null); // {status, brokenAtSeq, chained, total}
  const [storageAtRisk,setStorageAtRisk]=useState(false);       // persistent storage not granted → eviction risk
  const [newerSchema,setNewerSchema]=useState(false);           // vault written by a newer app build than this one
  // MFA (PRF-bound passkeys, professional roles)
  const [mfaPending,setMfaPending]=useState(null);   // {pc} — caregiver passcode accepted, awaiting 2nd factor at login
  const [mfaShowRecovery,setMfaShowRecovery]=useState(false);
  const [recoveryInput,setRecoveryInput]=useState("");
  const [mfaError,setMfaError]=useState("");
  const [mfaBusy,setMfaBusy]=useState(false);
  const [newRecoveryCode,setNewRecoveryCode]=useState(null); // shown after a one-time code is consumed/regenerated
  const [mfaEnroll,setMfaEnroll]=useState(null);     // null|"passcode"|"registering"|"showcode"
  const [mfaEnrollPc,setMfaEnrollPc]=useState("");
  const [mfaEnrollErr,setMfaEnrollErr]=useState("");
  const [mfaEnrollPrepared,setMfaEnrollPrepared]=useState(null); // {credentialId,prfSalt,cMfa,cRecovery,code}
  const [mfaCodeConfirmed,setMfaCodeConfirmed]=useState(false);
  const [mfaDisable,setMfaDisable]=useState(false);
  const [mfaDisablePc,setMfaDisablePc]=useState("");
  const [mfaAddPasskey,setMfaAddPasskey]=useState(false);
  const [mfaAddPc,setMfaAddPc]=useState("");
  const [mfaAddBusy,setMfaAddBusy]=useState(false);
  const [auditCount,setAuditCount]=useState(0);
  const lastActivityRef=useRef(Date.now());
  const [data,setData]=useState(()=>initState(""));
  const DOMAINS=buildDomains((data.settings&&data.settings.stateCode)||"");

  /* ── Role & permissions ── */
  const getRole=()=>{
    if(authMode==="client"){const ct=data.settings&&data.settings.clientTier;return ct||"client-restricted"}
    const team=data.settings&&data.settings.team;
    if(!team)return authMode==="caregiver"?"admin":"client-restricted";
    const members=team.members||[];
    const did=data.settings&&data.settings.deviceId;
    const me=members.find(m=>m.deviceId===did);
    return(me&&me.role_key)||"family";
  };
  const role=getRole();
  const isClient=role==="client-full"||role==="client-restricted";
  const isAdmin=role==="admin";
  const isFamily=role==="family";
  const isCarePro=role==="carepro";
  const isClientFull=role==="client-full";
  const isClientRestricted=role==="client-restricted";

  const can=(action,context)=>{
    switch(action){
      case "view-domain": return isCarePro?CAREPRO_DOMAINS.includes(context):true;
      case "view-legal": return !isCarePro&&!isClientRestricted;
      case "view-financial": return !isCarePro&&!isClientRestricted;
      case "view-expenses": return isAdmin||isFamily||isClientFull;
      case "view-contacts": return isAdmin||isFamily||isClientFull;
      case "view-documents": return isAdmin||isFamily;
      case "view-tracking": return isAdmin||isFamily;
      case "view-visit": return isAdmin||isFamily;
      case "view-postdeath": return isAdmin||isFamily;
      case "edit-subtask": return isAdmin||isFamily;
      case "remove-subtask": return isAdmin;
      case "add-custom-sub": return isAdmin||isFamily;
      case "edit-domain-notes": return isAdmin||isFamily;
      case "append-domain-notes": return isCarePro;
      case "attend-subtask": return isAdmin||isFamily||isCarePro;
      case "check-subtask": return isAdmin||isFamily;
      case "log-incident": return isAdmin||isFamily||isCarePro;
      case "delete-incident": return isAdmin||(isFamily&&context);
      case "edit-incident": return isAdmin||isFamily;
      case "med-admin": return isAdmin||isFamily||isCarePro;
      case "log-expense": return isAdmin||isFamily;
      case "delete-expense": return isAdmin||(isFamily&&context);
      case "send-message": return !isClientRestricted;
      case "submit-selfreport": return isClient||isAdmin||isFamily;
      case "view-selfreport": return true;
      case "export-data": return isAdmin||isFamily||isClientFull;
      case "manage-team": return isAdmin;
      case "manage-settings": return isAdmin;
      case "manage-sync": return isAdmin;
      case "change-passcodes": return isAdmin;
      case "edit-shifts": return isAdmin||isFamily;
      case "manage-schedule": return isAdmin;
      case "claim-shift": return isAdmin||isFamily||isCarePro;
      case "log-visit": return isAdmin||isFamily||isCarePro;
      case "edit-own-shift": return isCarePro;
      case "view-shifts": return isAdmin||isFamily||isCarePro;
      case "edit-emergency": return isAdmin||isFamily;
      case "edit-triggers": return isAdmin||isFamily;
      case "add-contact": return isAdmin||isFamily;
      case "add-appointment": return isAdmin||isFamily;
      default: return isAdmin;
    }
  };

  const getVisibleTabs=()=>{
    const all=TABS;
    if(isCarePro)return all.filter(t=>CAREPRO_TABS.includes(t.key));
    if(isClientFull)return all.filter(t=>CLIENT_FULL_TABS.includes(t.key));
    if(isClientRestricted)return all.filter(t=>CLIENT_RESTRICTED_TABS.includes(t.key));
    if(isFamily)return all.filter(t=>t.key!=="settings");
    return all; // admin sees everything
  };
  // visibleTabs is computed below in the tab ordering section using getVisibleTabs()
  const switchState=(newCode)=>{const newDoms=buildDomains(newCode);const newDomains={};newDoms.forEach(d=>{const existing=data.domains[d.key];if(existing&&existing.goals){newDomains[d.key]={...existing,goals:d.goals.map((g,gi)=>{const eg=existing.goals[gi];if(eg)return{...eg,subs:g.subs.map((s,si)=>eg.subs[si]||{done:false,lastDone:null,typeOverride:null}),titleOverride:eg.titleOverride,subOverrides:eg.subOverrides,customSubs:eg.customSubs||[]};return{done:false,subs:g.subs.map(()=>({done:false,lastDone:null,typeOverride:null})),customSubs:[],titleOverride:null,subOverrides:{}}})}}else{newDomains[d.key]={status:"not-started",notes:"",lastUpdated:null,goals:d.goals.map(g=>({done:false,subs:g.subs.map(()=>({done:false,lastDone:null,typeOverride:null})),customSubs:[],titleOverride:null,subOverrides:{}}))}}});setData(p=>({...p,domains:newDomains,settings:{...p.settings,stateCode:newCode}}));flash(newCode?"Switched to "+(AVAILABLE_STATES.find(s=>s.code===newCode)||{}).name+" mode.":"Switched to Generic mode.")};
  const [view,setView]=useState("today-hub");
  const [currentHub,setCurrentHub]=useState("today");
  const [navStack,setNavStack]=useState([]);
  const [expanded,setExpanded]=useState({});
  const [editNotes,setEditNotes]=useState(false); const [notesDraft,setNotesDraft]=useState("");
  const [addSubFor,setAddSubFor]=useState(null); const [newSubText,setNewSubText]=useState("");
  const [sideOpen,setSideOpen]=useState(false);
  const [editing,setEditing]=useState(null); const [editText,setEditText]=useState("");
  const [editingDomain,setEditingDomain]=useState(null);
  const [contactSort,setContactSort]=useState("category"); const [contactFilter,setContactFilter]=useState("all");
  const [contactForm,setContactForm]=useState(null); const [contactDetail,setContactDetail]=useState(null);
  const [contactNoteText,setContactNoteText]=useState("");
  const [importResult,setImportResult]=useState(null);
  // Calendar
  const [calYear,setCalYear]=useState(new Date().getFullYear()); const [calMonth,setCalMonth]=useState(new Date().getMonth());
  const [calSelected,setCalSelected]=useState(null); const [apptForm,setApptForm]=useState(null);
  // Messages
  const [msgFrom,setMsgFrom]=useState(""); const [msgText,setMsgText]=useState("");
  // Settings
  const [exportPw,setExportPw]=useState(""); const [importPw,setImportPw]=useState("");
  const [settingsMsg,setSettingsMsg]=useState(null);
  const [newCaregiverPw,setNewCaregiverPw]=useState(""); const [newClientPw,setNewClientPw]=useState("");
  // Merge
  const [mergePreview,setMergePreview]=useState(null); // {merged, report, sourceName}
  const mergeFileRef=useRef(null);
  // Sync
  const [syncPasscode,setSyncPasscode]=useState(""); // memory only — never persisted
  const [syncPullUrl,setSyncPullUrl]=useState("");
  const [syncPullText,setSyncPullText]=useState("");
  const [syncStatus,setSyncStatus]=useState(null); // {type:"success"|"error",msg}
  const [syncPushing,setSyncPushing]=useState(false);
  const [syncPulling,setSyncPulling]=useState(false);
  const syncFileRef=useRef(null);
  // Cloud sync
  const [cloudHandle,setCloudHandle]=useState(null);
  const [cloudFileName,setCloudFileName]=useState(null);
  const [cloudSyncing,setCloudSyncing]=useState(false);
  const [syncLocked,setSyncLocked]=useState(false);
  const [cloudConnected,setCloudConnected]=useState(false);
  const [backupHandle,setBackupHandle]=useState(null);
  const [backupStatus,setBackupStatus]=useState("off"); // off | active | paused
  const [backupFileName,setBackupFileName]=useState(null);
  const [lastAutoBackupAt,setLastAutoBackupAt]=useState(null);
  const [backupBusy,setBackupBusy]=useState(false);
  const backupTimerRef=useRef(null);
  const [showAdvancedSync,setShowAdvancedSync]=useState(false);
  // Team
  const [teamSetupMode,setTeamSetupMode]=useState(null); // null|"create"|"join"
  const [joinCode,setJoinCode]=useState("");
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchQ,setSearchQ]=useState("");
  const [cwStress,setCwStress]=useState("");
  const [cwSleep,setCwSleep]=useState("");
  const [cwHours,setCwHours]=useState("");
  const [cwNotes,setCwNotes]=useState("");
  // Documents
  const [docProcessing,setDocProcessing]=useState(false);
  const [docResult,setDocResult]=useState(null); // {rawText, docType, medications:[], labs:[], sections:[], fileName}
  const [docMeds,setDocMeds]=useState([]); // editable copy
  const [docLabs,setDocLabs]=useState([]); // editable copy
  // Incidents
  const [incidentForm,setIncidentForm]=useState(null);
  const incidentPhotoRef=useRef(null);
  const [incidentFilter,setIncidentFilter]=useState("all");
  // Expenses
  const [expenseForm,setExpenseForm]=useState(null);
  const [expenseCatFilter,setExpenseCatFilter]=useState("all");
  const [expenseMonthFilter,setExpenseMonthFilter]=useState("all");
  // Med Admin
  const [medAdminDate,setMedAdminDate]=useState(fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()));
  const [medForm,setMedForm]=useState(null);
  // Self Reports
  const [srType,setSrType]=useState("text");
  const [srText,setSrText]=useState("");
  const [srMood,setSrMood]=useState("");
  const [srPain,setSrPain]=useState("");
  const [srErr,setSrErr]=useState("");
  const [srRecording,setSrRecording]=useState(false);
  const [srAudioData,setSrAudioData]=useState(null);
  const [srPhotos,setSrPhotos]=useState([]);
  const srPhotoRef=useRef(null);
  const mediaRecRef=useRef(null);
  const audioChunksRef=useRef([]);
  // Doc categories
  const [docCatFilter,setDocCatFilter]=useState("all");
  const [docSaveCategory,setDocSaveCategory]=useState("other");
  const notesRef=useRef(null); const subRef=useRef(null); const editRef=useRef(null);
  const fileRef=useRef(null); const importFileRef=useRef(null); const fhirFileRef=useRef(null);
  const docFileRef=useRef(null);
  // isClient is now computed from role system above

  // ── Write-ahead-log save pipeline ──
  // Every state change is diffed at this single chokepoint; the tiny encrypted delta is appended to the WAL
  // through a strictly serialized, coalescing queue (writes never overlap, so they cannot reorder/clobber).
  // Periodic full snapshots (checkpoints) keep replay short. An edit is durable the instant its append commits.
  const prevPersistedRef=useRef(null);     // last state we diffed from
  const seqRef=useRef(0);                   // monotonic edit sequence
  const walQueueRef=useRef([]);             // pending {seq, patch, full}
  const walWritingRef=useRef(false);        // single-writer flag
  const editsSinceCkptRef=useRef(0);
  const lastCkptTimeRef=useRef(Date.now());
  const lastCkptSeqRef=useRef(0);           // seq of the current snapshot (kept replayable as fallback)
  const ckptSlotRef=useRef("snapA");        // next snapshot slot (A/B ping-pong)
  const CKPT_EVERY_EDITS=25, CKPT_EVERY_MS=120000;
  const [saveState,setSaveState]=useState("saved"); // saved | saving | error

  const writeCheckpoint=async(full,seq)=>{
    const slot=ckptSlotRef.current;
    const enc=await encryptWithDEK(full,dekRef.current);
    await saveSnapshot(enc,seq,slot);           // write snapshot, then flip pointer (crash-safe order)
    await walPrune(lastCkptSeqRef.current);     // prune only up to the PREVIOUS checkpoint → it stays replayable as A/B fallback
    lastCkptSeqRef.current=seq;
    ckptSlotRef.current=slot==="snapA"?"snapB":"snapA";
    editsSinceCkptRef.current=0;lastCkptTimeRef.current=Date.now();
    try{ if(rKeyRef.current&&!clientScopedRef.current)await writeProjection(full,rKeyRef.current); }catch(e){console.error("Projection refresh failed (non-fatal):",e)} // keep the client view current
    try{ await clearOutbox(); }catch{} // snapshot now contains any ingested reports → safe to clear (re-ingest is deduped anyway)
  };
  const processWalQueue=async()=>{
    if(clientScopedRef.current)return; // scoped client sessions never write vault snapshots or WAL (opaque carry-forward)
    if(walWritingRef.current||!dekRef.current)return;
    walWritingRef.current=true;
    try{
      while(walQueueRef.current.length){
        const item=walQueueRef.current.shift();
        const ct=await encryptWithDEK(item.patch,dekRef.current); // encrypt tiny delta → fast even on huge vaults
        await walAppend(item.seq,ct);                              // atomic, append-only commit = durable
        editsSinceCkptRef.current++;
        if(editsSinceCkptRef.current>=CKPT_EVERY_EDITS||(Date.now()-lastCkptTimeRef.current)>=CKPT_EVERY_MS){
          try{await writeCheckpoint(item.full,item.seq)}catch(e){console.error("Checkpoint failed (non-fatal):",e)}
        }
      }
      setSaveState("saved");
    }catch(e){console.error("WAL write failed:",e);setSaveState("error");}
    finally{walWritingRef.current=false;if(walQueueRef.current.length)processWalQueue();}
  };
  useEffect(()=>{
    if(!dekRef.current||!authed)return;
    const prev=prevPersistedRef.current;
    if(prev===null){prevPersistedRef.current=data;return;} // baseline established at load/auth
    if(prev===data)return;
    prevPersistedRef.current=data;
    if(clientScopedRef.current){ // scoped client session: persist the projection under DEK_R; the vault is untouchable by design
      setSaveState("saving");
      writeProjection(data,rKeyRef.current).then(()=>setSaveState("saved")).catch(e=>{console.error("Projection save failed:",e);setSaveState("error")});
      return;
    }
    const patch=diffState(prev,data);
    if(patch===undefined)return; // no material change
    const seq=++seqRef.current;
    walQueueRef.current.push({seq,patch,full:data});
    setSaveState("saving");
    processWalQueue();
  },[data,authed]);
  // Backstop: try to drain the queue when the app is hidden/closed (best-effort; per-edit appends are the guarantee)
  useEffect(()=>{
    if(!authed)return;
    const flush=()=>{ try{persistAuditTipToVault()}catch{} if(walQueueRef.current.length)processWalQueue(); if(rKeyRef.current&&!clientScopedRef.current){try{writeProjection(prevPersistedRef.current||data,rKeyRef.current)}catch{}} };
    document.addEventListener("visibilitychange",flush);
    window.addEventListener("pagehide",flush);
    return()=>{document.removeEventListener("visibilitychange",flush);window.removeEventListener("pagehide",flush);};
  },[authed]);

  // Session timeout — check every 30s
  useEffect(()=>{
    if(!authed)return;
    const onActivity=()=>{lastActivityRef.current=Date.now()};
    window.addEventListener("mousemove",onActivity);window.addEventListener("keydown",onActivity);window.addEventListener("touchstart",onActivity);
    const timer=setInterval(()=>{if(Date.now()-lastActivityRef.current>SESSION_TIMEOUT_MS){lock();flash("Session timed out after 15 minutes of inactivity.")}},30000);
    return()=>{clearInterval(timer);window.removeEventListener("mousemove",onActivity);window.removeEventListener("keydown",onActivity);window.removeEventListener("touchstart",onActivity)};
  },[authed]);

  // Detect first run, legacy migration, OR browser eviction (keys survive, vault purged)
  useEffect(()=>{(async()=>{
    const hasKeys=!!loadWrappedKeys();
    const hasLegacy=hasLegacyData()||!!loadVault();
    if(!hasKeys&&!hasLegacy){setSetupMode(true);return}
    if(hasKeys){
      // Wrapped keys exist — confirm the encrypted vault still exists in IndexedDB
      // Vault may live as the legacy blob, an A/B snapshot, or a WAL pointer — check ALL before concluding
      // eviction (matching the tryAuth probe). Checking only the legacy key falsely reports data loss for
      // a healthy WAL-era vault whose legacy blob was partially evicted, inviting the user to wipe good data.
      const vaultData=(await loadVaultData())||(await idbGet(VAULT_STORE,"walmeta").catch(()=>null))||(await idbGet(VAULT_STORE,"snapA").catch(()=>null))||(await idbGet(VAULT_STORE,"snapB").catch(()=>null));
      if(!vaultData){
        // Keys present but vault gone = browser evicted the data (common on iOS under storage pressure)
        setDataLossDetected(true);
      }
    }
  })()},[]);
  useEffect(()=>{if(!(data.settings&&data.settings.deviceId)){setData(p=>({...p,settings:{...p.settings,deviceId:genDeviceId()}}))}},[]);
  // Option 5 — recommend Add to Home Screen on iOS browser tabs (separate storage bucket, less eviction)
  useEffect(()=>{try{
    const standalone=window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
    const touch=("ontouchstart" in window)||(navigator.maxTouchPoints>0);
    const dismissed=localStorage.getItem("cg-install-nudge-dismissed")==="1";
    if(!standalone&&touch&&!dismissed){setShowInstallNudge(true)}
  }catch{}},[]);
  // Capture the install prompt (Android/Chromium) so onboarding can offer a real one-tap install.
  useEffect(()=>{
    const onBIP=(e)=>{e.preventDefault();setDeferredInstall(e)};
    window.addEventListener("beforeinstallprompt",onBIP);
    return()=>window.removeEventListener("beforeinstallprompt",onBIP);
  },[]);
  // Eviction-risk check: if the browser hasn't granted persistent storage, the vault can be purged. Warn the user.
  useEffect(()=>{
    if(!authed)return;
    let cancelled=false;
    const check=async()=>{
      try{
        if(!(navigator.storage&&navigator.storage.persisted)){return}
        let ok=await navigator.storage.persisted();
        if(!ok&&navigator.storage.persist){ ok=await navigator.storage.persist(); } // try to upgrade (granted silently on installed PWAs)
        if(!cancelled)setStorageAtRisk(!ok);
      }catch{}
    };
    check();
    const onVis=()=>{ if(document.visibilityState==="visible")check(); };
    document.addEventListener("visibilitychange",onVis);
    return()=>{cancelled=true;document.removeEventListener("visibilitychange",onVis)};
  },[authed]);
  // Option 4 — backup reminder: prompt if no backup in 7+ days (or never), once authed.
  // Aware of continuous backup: silent when active, prompts resume when paused.
  useEffect(()=>{if(!authed)return;try{
    if(backupStatus==="active"){setShowBackupReminder(false);return}
    if(backupStatus==="paused"){setShowBackupReminder(true);return}
    const last=data.settings&&data.settings.lastBackupAt;
    const stale=!last||(Date.now()-new Date(last).getTime())>7*24*60*60*1000;
    if(stale&&can("export-data"))setShowBackupReminder(true);
  }catch{}},[authed,backupStatus]);
  // Restore cloud file handle on mount
  useEffect(()=>{(async()=>{try{const h=await loadSyncHandle();if(h){setCloudHandle(h);setCloudFileName(h.name);setCloudConnected(true)}}catch{}})()},[]);
  // Restore the continuous-backup handle once authed; silently check whether write permission survived this session.
  useEffect(()=>{if(!authed)return;(async()=>{try{
    const h=await loadBackupHandle();
    if(!h)return;
    setBackupHandle(h);setBackupFileName(h.name);
    const perm=await checkHandlePermission(h,false); // silent query — no gesture
    setBackupStatus(perm==="granted"?"active":"paused");
  }catch{}})()},[authed]);
  // Debounced automatic write whenever data changes and backup is active.
  useEffect(()=>{
    if(!authed||backupStatus!=="active"||!backupHandle)return;
    const pw=getBackupPasscode();if(!pw)return;
    if(backupTimerRef.current)clearTimeout(backupTimerRef.current);
    backupTimerRef.current=setTimeout(async()=>{
      try{
        const perm=await checkHandlePermission(backupHandle,false);
        if(perm!=="granted"){setBackupStatus("paused");return} // permission lapsed mid-session
        await writeBackupToHandle(backupHandle,pw);
        setLastAutoBackupAt(new Date().toISOString());
      }catch(e){if(e&&e.name==="NotAllowedError")setBackupStatus("paused")}
    },4000);
    return()=>{if(backupTimerRef.current)clearTimeout(backupTimerRef.current)};
  },[data,authed,backupStatus,backupHandle]);

  /* ── Cloud sync handlers ── */
  const cloudConnect=async()=>{
    if(!hasFileSystemAccess){setSyncStatus({type:"error",msg:"Your browser doesn't support File System Access. Use Chrome, Edge, or Brave, or use the manual sync options below."});return}
    try{
      const handle=await window.showSaveFilePicker({suggestedName:"care-dashboard-sync.json",types:[{description:"Sync File",accept:{"application/json":[".json"]}}]});
      await saveSyncHandle(handle);setCloudHandle(handle);setCloudFileName(handle.name);setCloudConnected(true);
      // Write initial data to the file
      const pw=getSyncPasscode();
      if(pw){
        const exportData={...data,_sync:{...(data._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||""}};
        const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),pw);
        const writable=await handle.createWritable();
        await writable.write(JSON.stringify({encrypted:true,version:"2.0",sync:true,data:b64}));
        await writable.close();
      }
      setSyncStatus({type:"success",msg:"Connected to "+handle.name+". Place this file in a shared Google Drive, Dropbox, iCloud, or OneDrive folder. All team members select the same file."});
    }catch(e){if(e.name!=="AbortError")setSyncStatus({type:"error",msg:"Connection failed: "+e.message})}
  };

  const cloudDisconnect=async()=>{await clearSyncHandle();setCloudHandle(null);setCloudFileName(null);setCloudConnected(false);setSyncStatus({type:"success",msg:"Disconnected from cloud sync."})};

  /* ── Continuous encrypted backup (File System Access) ── */
  const [backupPw,setBackupPw]=useState("");
  const getBackupPasscode=()=>(data.settings&&data.settings.backupPasscode)||"";
  // Encrypt the full vault with the backup passcode and write it to the handle. Self-contained .care file.
  const writeBackupToHandle=async(handle,passcode)=>{
    if(!handle||!passcode)return false;
    const exportMeta={exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId)||"",exportedByName:(data.settings&&data.settings.deviceName)||"",formatVersion:"2.0",source:"auto-backup"};
    const payload={...data,_sync:{...(data._sync||{}),...exportMeta},_exportMeta:exportMeta};
    const b64=await encryptData(await packageWithBlobs(payload,dekRef.current,rKeyRef.current),passcode);
    const writable=await handle.createWritable();
    await writable.write(JSON.stringify({encrypted:true,version:"2.0",data:b64}));
    await writable.close();
    return true;
  };
  // Configure continuous backup: choose a file, set a backup passcode, write the first copy. (User gesture.)
  const setupContinuousBackup=async()=>{
    if(!can("export-data")){flash("You don't have permission to configure backups.");return}
    if(!hasFileSystemAccess){flash("Continuous backup needs Chrome, Edge, or Brave. On other browsers, use manual backup below.");return}
    if(!backupPw.trim()||backupPw.trim().length<6){flash("Choose a backup passcode of at least 6 characters. You'll need it to restore.");return}
    try{
      const handle=await window.showSaveFilePicker({suggestedName:"care-guardian-backup.care",types:[{description:"Care Guardian Backup",accept:{"application/json":[".care"]}}]});
      const perm=await checkHandlePermission(handle,true);
      if(perm!=="granted"){flash("Backup needs write access to that file to continue.");return}
      const pw=backupPw.trim();
      setBackupBusy(true);
      await writeBackupToHandle(handle,pw);
      await saveBackupHandle(handle);
      setBackupHandle(handle);setBackupFileName(handle.name);setBackupStatus("active");
      const now=new Date().toISOString();setLastAutoBackupAt(now);
      setData(p=>({...p,settings:{...p.settings,backupPasscode:pw,lastBackupAt:now,continuousBackup:true}}));
      setBackupPw("");setShowBackupReminder(false);
      hipaaAudit("export","Continuous backup configured","all");
      flash("Continuous backup active. Your data will be saved automatically.");
    }catch(e){if(e&&e.name==="AbortError"){/* user cancelled picker */}else{flash("Couldn't set up backup: "+(e&&e.message||"unknown error"))}}
    finally{setBackupBusy(false)}
  };
  // Resume after a session permission lapse (user gesture — required by the FSA permission model).
  const resumeBackup=async()=>{
    if(!backupHandle){return}
    const perm=await checkHandlePermission(backupHandle,true);
    if(perm==="granted"){
      setBackupStatus("active");
      const pw=getBackupPasscode();
      if(pw){try{setBackupBusy(true);await writeBackupToHandle(backupHandle,pw);const now=new Date().toISOString();setLastAutoBackupAt(now);setData(p=>({...p,settings:{...p.settings,lastBackupAt:now}}))}catch{}finally{setBackupBusy(false)}}
      flash("Backup resumed.");
    }else{flash("Write access was not granted, so backup is still paused.")}
  };
  const disableContinuousBackup=async()=>{
    await clearBackupHandle();setBackupHandle(null);setBackupFileName(null);setBackupStatus("off");
    setData(p=>({...p,settings:{...p.settings,continuousBackup:false}}));
    flash("Continuous backup turned off. Your existing backup file is unchanged.");
  };

  const cloudSync=async()=>{if(clientScopedRef.current){flash("Sync and import aren't available in client sign-in.");return}
    const pw=getSyncPasscode();
    if(!pw){setSyncStatus({type:"error",msg:"Set a team sync passcode first."});return}
    if(!cloudHandle){setSyncStatus({type:"error",msg:"No cloud file connected. Tap 'Connect Cloud Folder' to set up."});return}
    setCloudSyncing(true);setSyncStatus(null);
    try{
      // Verify permission
      const perm=await cloudHandle.requestPermission({mode:"readwrite"});
      if(perm!=="granted"){setSyncStatus({type:"error",msg:"File access denied. Please reconnect."});setCloudSyncing(false);return}
      // PULL: read remote file
      const file=await cloudHandle.getFile();
      const text=await file.text();
      let pullReport=null;
      if(text.trim()){
        try{
          const json=JSON.parse(text);
          if(json.encrypted){
            const remote=await ingestBlobs(await decryptData(json.data,pw),dekRef.current,rKeyRef.current);
            const{merged,report}=mergeWithClock(data,remote);
            const sourceName=(remote.settings&&remote.settings.deviceName)||(remote.settings&&remote.settings.deviceId)||"cloud";
            pullReport=report;
            // Apply merge immediately (no preview for one-button sync)
            setData(merged);
          }
        }catch(e){/* file may be empty or first sync — continue to push */}
      }
      // PUSH: write local data (now includes merged remote data)
      // Use in-memory data (already merged if pull happened)
      const pushData={...data,_sync:{...(data._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||"",lastMerge:new Date().toISOString()}};
      const b64=await encryptData(await packageWithBlobs(pushData,dekRef.current,rKeyRef.current),pw);
      const writable=await cloudHandle.createWritable();
      await writable.write(JSON.stringify({encrypted:true,version:"2.0",sync:true,data:b64}));
      await writable.close();
      // Report
      const added=((pullReport&&pullReport.added&&pullReport.added.length)||0);const updated=((pullReport&&pullReport.updated&&pullReport.updated.length)||0);
      hipaaAudit("sync","Sync completed: "+added+" new, "+updated+" updated","all");
      const msg=added+updated>0?`Synced: ${added} new, ${updated} updated from team.`:"Synced — your data is up to date.";
      setSyncStatus({type:"success",msg});
      setData(p=>({...p,_sync:{...p._sync,lastSync:new Date().toISOString()}}));
    }catch(e){
      if(e.name==="NotAllowedError"){setSyncStatus({type:"error",msg:"File access expired. Tap 'Reconnect' to re-authorize."});setCloudConnected(false);await clearSyncHandle();setCloudHandle(null)}
      else setSyncStatus({type:"error",msg:"Sync failed: "+e.message});
    }
    setCloudSyncing(false);
  };

  /* ── Self-hosted server sync ── */
  const deriveRoomId=async(passcode)=>{
    const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(passcode));
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,32);
  };

  const getServerUrl=()=>(data.settings&&data.settings.syncServerUrl)||"";
  const getServerApiKey=()=>(data.settings&&data.settings.syncServerApiKey)||"";
  const setServerConfig=(url,apiKey)=>{
    const trimmed=url.trim().replace(/\/+$/,"");
    if(trimmed){const check=validateSyncUrl(trimmed);if(!check.valid){setSyncStatus({type:"error",msg:check.msg});return}}
    setData(p=>({...p,settings:{...p.settings,syncServerUrl:trimmed,syncServerApiKey:apiKey.trim()}}));
  };

  const serverSync=async()=>{
    const pw=getSyncPasscode();
    if(!pw){setSyncStatus({type:"error",msg:"Enter a team sync passcode."});return}
    const serverUrl=getServerUrl();
    if(!serverUrl){setSyncStatus({type:"error",msg:"Enter your sync server URL in the setup above."});return}
    setCloudSyncing(true);setSyncStatus(null);
    try{
      const roomId=await deriveRoomId(pw);
      const headers={"Content-Type":"application/json"};
      const apiKey=getServerApiKey();
      if(apiKey)headers["Authorization"]="Bearer "+apiKey;

      // PULL
      let pullReport=null;
      try{
        const pullResp=await fetch(`${serverUrl}/api/sync/${roomId}`,{headers});
        if(pullResp.ok){
          const pullText=await pullResp.text();
          if(rawTextTooLarge(pullText)){ setSyncStatus({type:"error",msg:"Incoming sync data is too large to load safely and was NOT applied. This can mean a corrupted or runaway device — check the source before syncing again."}); hipaaAudit("security","Sync payload refused (over hard size cap)","security"); setCloudSyncing(false); return; }
          const pullJson=JSON.parse(pullText);
          if(pullJson.data){
            if(payloadHardTooLarge(pullJson.data)){ setSyncStatus({type:"error",msg:"Incoming sync data is too large to load safely ("+mb(b64Bytes(pullJson.data))+" MB) and was NOT applied. This can mean a corrupted or runaway device — check the source before syncing again."}); hipaaAudit("security","Sync payload refused (over hard size cap)","security"); setCloudSyncing(false); return; }
            const remote=await ingestBlobs(await decryptData(pullJson.data,pw),dekRef.current,rKeyRef.current);
            const validation=validateImportSchema(remote);
            if(validation.valid){
              const sanitized=sanitizeImportData(remote);
              const{merged,report}=mergeWithClock(data,sanitized);
              if(mergeIsOversized(pullJson.data, report)){ const sourceName=(sanitized.settings&&sanitized.settings.deviceName)||(sanitized.settings&&sanitized.settings.deviceId)||"another device"; setMergePreview({merged,report,sourceName,oversized:true,floodBytes:b64Bytes(pullJson.data)}); setSyncStatus({type:"error",msg:"Unusually large update from "+sourceName+" — review it before applying (not auto-merged)."}); setCloudSyncing(false); return; }
              pullReport=report;
              setData(merged);
            }
          }
        }
      }catch(e){/* first sync or empty — continue to push */}

      // PUSH
      // Push the current in-memory data (already includes merged remote changes)
      const pushPayload=data;
      const exportData={...pushPayload,_sync:{...(pushPayload._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||""}};
      const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),pw);
      const putResp=await fetch(`${serverUrl}/api/sync/${roomId}`,{method:"PUT",headers,body:JSON.stringify({data:b64})});
      if(!putResp.ok){const err=await putResp.json().catch(()=>({}));throw new Error(err.error||"Server returned "+putResp.status)}

      const added=((pullReport&&pullReport.added&&pullReport.added.length)||0);const updated=((pullReport&&pullReport.updated&&pullReport.updated.length)||0);
      setSyncStatus({type:"success",msg:added+updated>0?`Synced: ${added} new, ${updated} updates from team.`:"Synced — your data is up to date."});
      setData(p=>({...p,_sync:{...p._sync,lastSync:new Date().toISOString()}}));
    }catch(e){setSyncStatus({type:"error",msg:"Server sync failed: "+e.message})}
    setCloudSyncing(false);
  };

  /* ── Sync dispatch — use whichever method is configured ── */
  const syncNow=async()=>{
    if(getServerUrl()){await serverSync()}
    else if(cloudConnected&&cloudHandle){await cloudSync()}
    else{setSyncStatus({type:"error",msg:"No sync method configured. Set up a cloud folder or server below."})}
  };

  /* ── Team management ── */
  const getTeam=()=>(data.settings&&data.settings.team)||null;
  const hasTeam=()=>!!(data.settings&&data.settings.team&&data.settings.team.id);

  const createTeam=(teamName,clientName,myName,myRole)=>{
    const team={
      id:"team-"+Math.random().toString(36).slice(2,10)+Date.now().toString(36),
      name:teamName.trim(),
      clientName:clientName.trim(),
      createdAt:new Date().toISOString(),
      members:[{deviceId:(data.settings&&data.settings.deviceId),name:myName.trim(),role:myRole.trim(),role_key:"admin",joinedAt:new Date().toISOString(),lastSync:null}],
    };
    setData(p=>({...p,settings:{...p.settings,team,deviceName:myName.trim(),clientTier:"client-full"}}));
    setTeamSetupMode(null);
    flash("Team created: "+teamName);
  };

  const generateInviteCode=()=>{
    const team=getTeam();if(!team)return"";
    const payload={v:1,t:team.name,c:team.clientName,i:team.id,u:getServerUrl()||"",s:(data.settings&&data.settings.stateCode)||""}; // API key intentionally excluded (H7) — share separately
    return"CG:"+btoa(JSON.stringify(payload));
  };

  const parseInviteCode=(code)=>{
    try{
      const b64=code.trim().replace(/^CG:/,"");
      const payload=JSON.parse(atob(b64));
      if(payload.v&&payload.v!==1)return null;return{teamName:payload.t,clientName:payload.c,teamId:payload.i,serverUrl:payload.u,stateCode:payload.s};
    }catch{return null}
  };

  const joinTeamFromCode=(code,myName,myRole,myRoleKey)=>{
    const parsed=parseInviteCode(code);
    if(!parsed){setSyncStatus({type:"error",msg:"Invalid invite code."});return}
    const team={
      id:parsed.teamId,
      name:parsed.teamName,
      clientName:parsed.clientName,
      createdAt:new Date().toISOString(),
      members:[{deviceId:(data.settings&&data.settings.deviceId),name:myName.trim(),role:myRole.trim(),role_key:myRoleKey||"family",joinedAt:new Date().toISOString(),lastSync:null}],
    };
    const updates={team,deviceName:myName.trim()};
    if(parsed.serverUrl)updates.syncServerUrl=parsed.serverUrl;
    if(parsed.stateCode)updates.stateCode=parsed.stateCode;
    setData(p=>({...p,settings:{...p.settings,...updates}}));
    if(parsed.stateCode&&parsed.stateCode!==(data.settings&&data.settings.stateCode)){switchState(parsed.stateCode)}
    setTeamSetupMode(null);setJoinCode("");
    flash("Joined team: "+parsed.teamName+". Enter the team sync passcode, then tap Sync Now to pull existing data.");
  };


  useEffect(()=>{if(editNotes&&notesRef.current)notesRef.current.focus()},[editNotes]);
  useEffect(()=>{if(addSubFor!==null&&subRef.current)subRef.current.focus()},[addSubFor]);
  useEffect(()=>{if(editing&&editRef.current)editRef.current.focus()},[editing]);

  const addLog=(prev,dk,action)=>{const ts=new Date().toLocaleString();return{...prev,log:[{domain:dk,action,time:ts},...prev.log.slice(0,59)]}};

  // HIPAA Audit Log — §164.312(b) — stored in IndexedDB, separate from vault, hash-chained for tamper-evidence
  const auditTipRef=useRef({seq:0,hash:""});
  const hlcRef=useRef(loadHlc()); // device-local Hybrid Logical Clock (not synced; only per-record stamps are)
  const auditChainRef=useRef(Promise.resolve()); // serializes writes so seq/prevHash stay well-ordered
  const hipaaAudit=(action,detail,phiType)=>{
    if(!auditKeyRef.current)return;
    const base={
      id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),
      timestamp:new Date().toISOString(),
      action,
      detail:typeof detail==="string"?detail.slice(0,200):"",
      phiType:phiType||"",
      userId:(data.settings&&data.settings.deviceId)||"unknown",
      userName:(data.settings&&data.settings.deviceName)||"unknown",
      role:role||"unknown",
    };
    auditChainRef.current=auditChainRef.current.then(async()=>{
      const tip=auditTipRef.current;
      const entry={...base, seq:tip.seq+1, prevHash:tip.hash};
      entry.hash=await computeEntryHash(entry);
      auditTipRef.current={seq:entry.seq,hash:entry.hash};
      saveAuditTip(entry.seq,entry.hash);
      await writeAuditEntry(entry,auditKeyRef.current);
      setAuditEntries(p=>[entry,...p].slice(0,500));
      setAuditCount(p=>p+1);
    }).catch(e=>console.error("Audit write failed:",e));
  };

  const getDomLabel=(dk)=>(data.domainOverrides&&data.domainOverrides[dk]&&data.domainOverrides[dk].label)||(DOMAINS.find(d=>d.key===dk)||{}).label||dk;
  const getDomDesc=(dk)=>(data.domainOverrides&&data.domainOverrides[dk]&&data.domainOverrides[dk].desc)||(DOMAINS.find(d=>d.key===dk)||{}).desc||"";

  /* ── item editing ── */
  const startEdit=(t,gi,si,txt)=>{setEditing({type:t,gi,si});setEditText(txt)};
  const cancelEdit=()=>{setEditing(null);setEditText("")};
  const saveEdit=()=>{if(!editing||!editText.trim()){cancelEdit();return;} const{type:t,gi,si}=editing;const dk=view;const ts=new Date().toLocaleString(); setData(p=>{const goals=[...p.domains[dk].goals]; if(t==="goal")goals[gi]={...goals[gi],titleOverride:editText.trim()}; else if(t==="sub")goals[gi]={...goals[gi],subOverrides:{...goals[gi].subOverrides,[si]:editText.trim()}}; else if(t==="csub"){const cs=[...goals[gi].customSubs];cs[si]={...cs[si],text:editText.trim()};goals[gi]={...goals[gi],customSubs:cs}} return addLog({...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals,lastUpdated:ts}}},dk,"Edited item")}); cancelEdit()};
  const getGoalTitle=(dk,gi)=>(data.domains[dk]&&data.domains[dk].goals[gi]&&data.domains[dk].goals[gi].titleOverride)||DOMAINS.find(d=>d.key===dk).goals[gi].title;
  const getSubText=(dk,gi,si)=>(data.domains[dk]&&data.domains[dk].goals[gi]&&data.domains[dk].goals[gi].subOverrides&&data.domains[dk].goals[gi].subOverrides[si])||DOMAINS.find(d=>d.key===dk).goals[gi].subs[si].t;
  const getSubDef=(dk,gi,si)=>DOMAINS.find(d=>d.key===dk).goals[gi].subs[si];
  const getSubType=(dk,gi,si)=>{const override=(data.domains[dk]&&data.domains[dk].goals[gi]&&data.domains[dk].goals[gi].subs[si]&&data.domains[dk].goals[gi].subs[si].typeOverride);return override||getSubDef(dk,gi,si).k};
  const getSubInterval=(dk,gi,si)=>getSubDef(dk,gi,si).d||0;
  const getSubState=(dk,gi,si)=>(data.domains[dk]&&data.domains[dk].goals[gi]&&data.domains[dk].goals[gi].subs[si])||{done:false,lastDone:null,typeOverride:null};

  /* ── domain mutations ── */
  // Status is now auto-computed from Foundation + Care Pulse
  const toggleGoal=(dk,gi)=>{const ts=new Date().toLocaleString();setData(p=>{const goals=[...p.domains[dk].goals];goals[gi]={...goals[gi],done:!goals[gi].done};const title=goals[gi].titleOverride||DOMAINS.find(d=>d.key===dk).goals[gi].title;return addLog({...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals,lastUpdated:ts}}},dk,`${goals[gi].done?"✓":"○"} ${title.slice(0,40)}`)})};
  const toggleSub=(dk,gi,si)=>{const ts=new Date().toLocaleString();setData(p=>{const goals=[...p.domains[dk].goals];const subs=[...goals[gi].subs];const subType=getSubType(dk,gi,si);const cur=subs[si];if(subType==="O"){subs[si]={...cur,done:!cur.done,lastDone:!cur.done?ts:null}}else{subs[si]={...cur,done:!cur.done,lastDone:ts}}goals[gi]={...goals[gi],subs};const domDef=DOMAINS.find(d=>d.key===dk);const allOnceDone=subs.every((s,i)=>getSubType(dk,gi,i)!=="O"||s.done);const allCustomDone=goals[gi].customSubs.every(c=>c.done);if(allOnceDone&&allCustomDone&&!goals[gi].done)goals[gi]={...goals[gi],done:true};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals,lastUpdated:ts}}}})};
  const toggleCustomSub=(dk,gi,ci)=>{setData(p=>{const ts=new Date().toLocaleString();const goals=[...p.domains[dk].goals];const cs=[...goals[gi].customSubs];cs[ci]={...cs[ci],done:!cs[ci].done};goals[gi]={...goals[gi],customSubs:cs};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals,lastUpdated:ts}}}})};
  const addCustomSub=(dk,gi,text)=>{if(!text.trim())return;const ts=new Date().toLocaleString();setData(p=>{const goals=[...p.domains[dk].goals];goals[gi]={...goals[gi],customSubs:[...goals[gi].customSubs,{text:text.trim(),done:false}]};return addLog({...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals,lastUpdated:ts}}},dk,"+ sub-task")});setNewSubText("");setAddSubFor(null)};
  const removeCustomSub=(dk,gi,ci)=>{setData(p=>{const goals=[...p.domains[dk].goals];goals[gi]={...goals[gi],customSubs:goals[gi].customSubs.filter((_,i)=>i!==ci)};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals}}}})};
  const removeSub=(dk,gi,si)=>{setData(p=>{const goals=[...p.domains[dk].goals];const subs=[...goals[gi].subs];subs[si]={...subs[si],removed:true};goals[gi]={...goals[gi],subs};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals}}}})};
  const restoreSub=(dk,gi,si)=>{setData(p=>{const goals=[...p.domains[dk].goals];const subs=[...goals[gi].subs];subs[si]={...subs[si],removed:false};goals[gi]={...goals[gi],subs};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals}}}})};
  const saveNotesData=(dk,text)=>{const ts=new Date().toLocaleString();setData(p=>addLog({...p,domains:{...p.domains,[dk]:{...p.domains[dk],notes:text,lastUpdated:ts}}},dk,"Notes updated"));setEditNotes(false)};
  const getProgress=(dk)=>{
    const g=data.domains[dk].goals;const domDef=DOMAINS.find(d=>d.key===dk);
    let oTotal=0,oDone=0,rTotal=0,rFresh=0,mTotal=0,mFresh=0;const now=Date.now();
    g.forEach((gd,gi)=>{const goalDef=domDef.goals[gi];if(!goalDef)return;
      goalDef.subs.forEach((subDef,si)=>{const st=gd.subs[si]||{done:false,lastDone:null,typeOverride:null};if(st.removed)return;const type=st.typeOverride||subDef.k;
        if(type==="O"){oTotal++;if(st.done)oDone++}
        else if(type==="R"){rTotal++;if(st.lastDone){const age=(now-new Date(st.lastDone).getTime())/(86400000);const interval=subDef.d||180;if(age<interval)rFresh++}}
        else if(type==="M"){mTotal++;if(st.lastDone){const age=(now-new Date(st.lastDone).getTime())/(86400000);if(age<30)mFresh++}}
      })});
    const foundPct=oTotal?Math.round(oDone/oTotal*100):100;
    const ongoingOk=rTotal+mTotal?(rFresh+mFresh):0;const ongoingTotal=rTotal+mTotal;
    const recency=ongoingTotal?Math.round(ongoingOk/ongoingTotal*100):100;
    return{done:oDone,total:oTotal,pct:foundPct,recency,rTotal,rFresh,mTotal,mFresh,ongoingTotal,ongoingOk};
  };
  const getSubProgress=(dk,gi)=>{const g=data.domains[dk].goals[gi];const domDef=DOMAINS.find(d=>d.key===dk);
    let oTotal=0,oDone=0;
    ((domDef.goals[gi]&&domDef.goals[gi].subs)||[]).forEach((subDef,si)=>{const st=g.subs[si]||{done:false};if(st.removed)return;const type=st.typeOverride||subDef.k;if(type==="O"){oTotal++;if(st.done)oDone++}});
    const cDone=g.customSubs.filter(c=>c.done).length;
    return{done:oDone+cDone,total:oTotal+g.customSubs.length,pct:(oTotal+g.customSubs.length)?Math.round((oDone+cDone)/(oTotal+g.customSubs.length)*100):0};
  };
  const getSubRecency=(dk,gi,si)=>{const st=getSubState(dk,gi,si);if(!st.lastDone)return null;const age=Math.floor((Date.now()-new Date(st.lastDone).getTime())/(86400000));return age};
  const getRecencyColor=(age,interval)=>{if(age===null)return"#e5e1db";if(interval){return age<interval?"#718355":age<interval*1.5?"#bc6c25":"#b56576"}return age<7?"#718355":age<30?"#bc6c25":"#b56576"};
  const getRecencyLabel=(age)=>{if(age===null)return"Not yet attended";if(age===0)return"Today";if(age===1)return"Yesterday";if(age<7)return age+" days ago";if(age<30)return Math.floor(age/7)+"w ago";return Math.floor(age/30)+"mo ago"};
  const changeSubType=(dk,gi,si,newType)=>{setData(p=>{const goals=[...p.domains[dk].goals];const subs=[...goals[gi].subs];subs[si]={...subs[si],typeOverride:newType};goals[gi]={...goals[gi],subs};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals}}}})};

  /* ── contacts ── */
  const saveContact=(c,id)=>{setData(p=>{let contacts;if(id)contacts=p.contacts.map(x=>x.id===id?{...x,...c}:x);else contacts=[...p.contacts,{...c,id:nextId(),notes:c.notes||[],customFields:c.customFields||[]}];return addLog({...p,contacts},"contacts",id?`Edited ${c.name}`:`Added ${c.name}`)});setContactFilter("all");setContactForm(null)};
  const deleteContact=(id)=>{if(!can("add-contact"))return;hipaaAudit("delete","Contact deleted: "+id,"contacts");const c=data.contacts.find(x=>x.id===id);setData(p=>addLog({...p,contacts:p.contacts.filter(x=>x.id!==id)},"contacts",`Removed ${(c&&c.name)}`));setContactDetail(null)};
  const addContactNote=(id,text)=>{if(!text.trim())return;setData(p=>({...p,contacts:p.contacts.map(c=>c.id===id?{...c,notes:[{text:text.trim(),date:new Date().toLocaleString()},...(c.notes||[])]}:c)}));setContactNoteText("")};
  const deleteContactNote=(cid,ni)=>{setData(p=>({...p,contacts:p.contacts.map(c=>c.id===cid?{...c,notes:c.notes.filter((_,i)=>i!==ni)}:c)}))};
  const handleImportVCard=(e)=>{const file=(e.target.files&&e.target.files[0]);if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{const cards=parseVCards(ev.target.result);if(!cards.length){flash("No contacts found.");return}const sanitized=cards.slice(0,200).map(sanitizeContact);setData(p=>addLog({...p,contacts:[...p.contacts,...sanitized.map(c=>({...c,id:nextId()}))]},"contacts",`Imported ${sanitized.length} contact(s)`));flash(`Imported ${sanitized.length} contact(s).`)};reader.readAsText(file);e.target.value=""};
  const getSortedContacts=()=>{let list=[...(data.contacts||[])];if(contactFilter!=="all")list=list.filter(c=>c.category===contactFilter);if(contactSort==="alpha")list.sort((a,b)=>a.name.localeCompare(b.name));else{const co=CONTACT_CATS.map(c=>c.key);list.sort((a,b)=>{const d=co.indexOf(a.category)-co.indexOf(b.category);return d!==0?d:a.name.localeCompare(b.name)})}return list};

  /* ── appointments ── */
  const saveAppt=(appt,id)=>{setData(p=>{let appointments;if(id)appointments=p.appointments.map(a=>a.id===id?{...a,...appt}:a);else appointments=[...p.appointments,{...appt,id:nextId()}];return addLog({...p,appointments},"calendar",id?"Edited appointment":"Added: "+appt.title)});setApptForm(null)};
  const deleteAppt=(id)=>{if(!can("add-appointment"))return;setData(p=>addLog({...p,appointments:p.appointments.filter(a=>a.id!==id)},"calendar","Removed appointment"));setApptForm(null)};
  const getApptsForDate=(dateStr)=>(data.appointments||[]).filter(a=>a.date===dateStr).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const getUpcoming=()=>{const today=fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());return(data.appointments||[]).filter(a=>a.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).slice(0,5)};

  /* ── messages ── */
  const sendMessage=()=>{const from=(data.settings&&data.settings.team)?(data.settings&&data.settings.deviceName)||"Unknown":msgFrom.trim();if(!msgText.trim()||!from)return;setData(p=>({...p,messages:[...p.messages,{id:nextId(),from,text:msgText.trim(),timestamp:new Date().toLocaleString(),deviceId:(data.settings&&data.settings.deviceId)}]}));setMsgText("")};

  /* ── settings / export ── */
  const flash=(msg)=>{setSettingsMsg(msg);setTimeout(()=>setSettingsMsg(null),4000)};
  const handleEncryptedExport=async()=>{if(!can("export-data"))return;hipaaAudit("export","Encrypted backup exported","all");if(!exportPw.trim()){flash("Enter an export passcode.");return}try{
    // Include export metadata inside encrypted payload for integrity (M5)
    const exportMeta={exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId)||"unknown",exportedByName:(data.settings&&data.settings.deviceName)||"",formatVersion:"2.0"};
    const exportData={...data,_sync:{...(data._sync||{}),...exportMeta},_exportMeta:exportMeta};
    const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),exportPw);downloadFile(JSON.stringify({encrypted:true,version:"2.0",data:b64}),"care-guardian-backup.care");
    setData(p=>({...p,settings:{...p.settings,lastBackupAt:new Date().toISOString()}}));
    setShowBackupReminder(false);
    flash("Encrypted backup downloaded. Keep it somewhere safe — it's your recovery copy.")}catch(e){flash("Export failed: "+e.message)}};
  const handleNonSensitiveExport=()=>{if(!can("export-data"))return;hipaaAudit("export","Non-sensitive summary exported","summary");const safe={domainOverrides:data.domainOverrides,domainStatus:{},settings:{}}; DOMAINS.forEach(d=>{const prog=getProgress(d.key);const health=prog.pct>=80&&prog.recency>=70?"Healthy":prog.pct>=40||prog.recency>=40?"Fair":"Needs Attention";safe.domainStatus[d.key]={health,foundation:prog.pct+"%",carePulse:prog.recency+"%",progress:prog}});downloadFile(JSON.stringify(safe,null,2),"care-guardian-summary.json");flash("Summary exported (no PHI).")};
  const handleEncryptedImport=async(e)=>{if(clientScopedRef.current){flash("Sync and import aren't available in client sign-in.");return}const file=(e.target.files&&e.target.files[0]);if(!file)return;try{const text=await file.text();if(rawTextTooLarge(text)){flash("This backup is too large to open safely.");e.target.value="";return}const json=JSON.parse(text);if(!json.encrypted){flash("Not an encrypted backup.");return}if(payloadHardTooLarge(json.data)){flash("This backup is too large to load safely ("+mb(b64Bytes(json.data))+" MB).");e.target.value="";return}const restored=await ingestBlobs(await decryptData(json.data,importPw),dekRef.current,rKeyRef.current);
    // Validate and sanitize (M4)
    const validation=validateImportSchema(restored);
    if(!validation.valid){flash("Import rejected: "+validation.errors.join("; "));e.target.value="";return}
    const sanitized=sanitizeImportData(restored);
    const {merged, report}=mergeWithClock(data, sanitized);
    const sourceName=(sanitized.settings&&sanitized.settings.deviceName)||(sanitized.settings&&sanitized.settings.deviceId)||"unknown device";
    setMergePreview({merged,report,sourceName,oversized:mergeIsOversized(json.data,report),floodBytes:b64Bytes(json.data)});
  }catch{flash("Import failed. Check passcode.")}e.target.value=""};
  const applyMerge=()=>{if(!mergePreview)return;const r=mergePreview.report;const parts=[];if(r.added.length)parts.push(r.added.length+" added");if(r.updated.length)parts.push(r.updated.length+" updated");if(r.kept.length)parts.push(r.kept.length+" kept");if(r.conflicts&&r.conflicts.length)parts.push(r.conflicts.length+" flagged");setData(mergePreview.merged);flash("Merge complete: "+(parts.join(", ")||"no changes")+".");setMergePreview(null)};
  const handleFullReplace=async(e)=>{if(clientScopedRef.current){flash("Sync and import aren't available in client sign-in.");return}const file=(e.target.files&&e.target.files[0]);if(!file)return;try{const text=await file.text();if(rawTextTooLarge(text)){flash("This backup is too large to open safely.");e.target.value="";return}const json=JSON.parse(text);if(!json.encrypted){flash("Not an encrypted backup.");return}if(payloadHardTooLarge(json.data)){flash("This backup is too large to load safely ("+mb(b64Bytes(json.data))+" MB).");e.target.value="";return}const restored=await ingestBlobs(await decryptData(json.data,importPw),dekRef.current,rKeyRef.current);
    const validation=validateImportSchema(restored);
    if(!validation.valid){flash("Replace rejected: "+validation.errors.join("; "));e.target.value="";return}
    const sanitized=sanitizeImportData(restored);
    hipaaAudit("import","Full vault replace from backup","import");
    setData(sanitized);flash("Full replace complete.")}catch{flash("Import failed. Check passcode.")}e.target.value=""};

  // Recovery from backup after browser eviction (pre-auth)
  const recoveryFileRef=useRef(null);
  const handleRecoveryFile=async(e)=>{
    const file=(e.target.files&&e.target.files[0]);if(!file)return;
    setRecoveryErr("");
    if(!recoveryPw.trim()){setRecoveryErr("Enter the passcode you used when creating this backup.");e.target.value="";return}
    try{
      const text=await file.text();if(rawTextTooLarge(text)){setRecoveryErr("This backup is too large to open safely on this device.");e.target.value="";return}const json=JSON.parse(text);
      if(!json.encrypted){setRecoveryErr("That doesn't look like a Care Guardian backup file.");e.target.value="";return}
      const restored=await decryptData(json.data,recoveryPw);
      const recoveredBlobs=(restored&&restored._blobs)||null; // hold blobs aside; they're written under the NEW key at setup
      if(restored)delete restored._blobs;
      const validation=validateImportSchema(restored);
      if(!validation.valid){setRecoveryErr("Backup could not be read: "+validation.errors.join("; "));e.target.value="";return}
      const sanitized=sanitizeImportData(restored);
      if(recoveredBlobs)sanitized.__recoveredBlobs=recoveredBlobs; // carried through to completeSetup, then stripped
      setRecoveryData(sanitized);
      // Clear the orphaned wrapped keys so the user sets fresh passcodes for the restored vault
      try{localStorage.removeItem(VAULT_KEYS_LS)}catch{}
    }catch{setRecoveryErr("Couldn't decrypt the backup. Check the backup passcode and try again.")}
    e.target.value="";
  };

  /* ── Sync handlers ── */
  const getSyncPasscode=()=>(data.settings&&data.settings.syncPasscode)||syncPasscode;
  const saveSyncPasscode=(pw)=>{setSyncPasscode(pw)}; // kept in memory only for session duration

  const syncPush=async(method)=>{
    const pw=getSyncPasscode();if(!pw.trim()){setSyncStatus({type:"error",msg:"Set a team sync passcode first."});return}
    setSyncPushing(true);setSyncStatus(null);
    try{
      const exportData={...data,_sync:{...(data._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||""}};
      const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),pw);
      const payload=JSON.stringify({encrypted:true,version:"2.0",sync:true,data:b64});
      if(method==="clipboard"){
        await navigator.clipboard.writeText(payload);
        setSyncStatus({type:"success",msg:"Encrypted sync data copied to clipboard. Paste it in your team's group chat."});
      } else {
        downloadFile(payload,"care-sync-"+new Date().toISOString().slice(0,10)+".json","application/json");
        setSyncStatus({type:"success",msg:"Sync file downloaded. Drop it in your team's shared folder."});
      }
    }catch(e){setSyncStatus({type:"error",msg:"Push failed: "+e.message})}
    setSyncPushing(false);
  };

  const syncPullFromText=async(text)=>{if(clientScopedRef.current){flash("Sync and import aren't available in client sign-in.");return}
    const pw=getSyncPasscode();if(!pw.trim()){setSyncStatus({type:"error",msg:"Set a team sync passcode first."});return}
    setSyncPulling(true);setSyncStatus(null);
    try{
      if(rawTextTooLarge(text)){setSyncStatus({type:"error",msg:"This sync data is too large to open safely and was not parsed. Check the source device."});setSyncPulling(false);return}
      const json=JSON.parse(text);if(!json.encrypted){throw new Error("Not encrypted sync data")}
      if(payloadHardTooLarge(json.data)){setSyncStatus({type:"error",msg:"This sync data is too large to load safely ("+mb(b64Bytes(json.data))+" MB) and was not opened. Check the source device."});setSyncPulling(false);return}
      const restored=await ingestBlobs(await decryptData(json.data,pw),dekRef.current,rKeyRef.current);
      // Validate and sanitize imported data (M4)
      const validation=validateImportSchema(restored);
      if(!validation.valid){setSyncStatus({type:"error",msg:"Import rejected: "+validation.errors.join("; ")});setSyncPulling(false);return}
      const sanitized=sanitizeImportData(restored);
      const{merged,report}=mergeWithClock(data,sanitized);
      const sourceName=(sanitized.settings&&sanitized.settings.deviceName)||(sanitized.settings&&sanitized.settings.deviceId)||"unknown device";
      const oversized=mergeIsOversized(json.data, report);
      setMergePreview({merged,report,sourceName,oversized,floodBytes:b64Bytes(json.data)});
      setSyncStatus({type:oversized?"error":"success",msg:oversized?"Large update — review carefully before applying.":"Merge preview ready — review changes below."});
    }catch(e){setSyncStatus({type:"error",msg:"Pull failed: "+e.message+". Check the sync passcode."})}
    setSyncPulling(false);
  };

  const syncPullFromClipboard=async()=>{
    try{const text=await navigator.clipboard.readText();if(!text.trim()){setSyncStatus({type:"error",msg:"Clipboard is empty."});return}await syncPullFromText(text)}
    catch(e){setSyncStatus({type:"error",msg:"Clipboard access denied. Paste the sync data into the text box below instead."})}
  };

  const syncPullFromFile=async(e)=>{
    const file=(e.target.files&&e.target.files[0]);if(!file)return;
    try{const text=await file.text();await syncPullFromText(text)}catch(err){setSyncStatus({type:"error",msg:"File read failed: "+err.message})}
    e.target.value="";
  };

  const syncPullFromUrl=async()=>{
    if(!syncPullUrl.trim()){setSyncStatus({type:"error",msg:"Enter a URL to fetch."});return}
    const urlCheck=validateSyncUrl(syncPullUrl.trim());
    if(!urlCheck.valid){setSyncStatus({type:"error",msg:urlCheck.msg});return}
    if(!urlCheck.trusted){setSyncStatus({type:"error",msg:urlCheck.msg+" If you trust this source, download the file manually and use 'Open File' instead."});return}
    const pw=getSyncPasscode();if(!pw.trim()){setSyncStatus({type:"error",msg:"Set a team sync passcode first."});return}
    setSyncPulling(true);setSyncStatus(null);
    try{
      const resp=await fetch(syncPullUrl.trim());if(!resp.ok)throw new Error("HTTP "+resp.status);
      const text=await resp.text();await syncPullFromText(text);
    }catch(e){setSyncStatus({type:"error",msg:"URL fetch failed: "+e.message})}
    setSyncPulling(false);
  };
  const handleFHIRImport=(e)=>{const file=(e.target.files&&e.target.files[0]);if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{try{const json=JSON.parse(ev.target.result);const r=parseFHIR(json);let count=0;setData(p=>{let next={...p};if(r.contacts.length){next={...next,contacts:[...next.contacts,...r.contacts.map(c=>({...c,id:nextId()}))]};count+=r.contacts.length}if(r.conditions.length||r.medications.length||r.notes.length){const ts=new Date().toLocaleString();const noteText=sanitizeText([...r.notes,...r.conditions.map(c=>"Condition: "+c),...r.medications.map(m=>"Medication: "+m)].join("\n"),MAX_NOTE_LEN);const dk="physical";const existing=next.domains[dk].notes;next={...next,domains:{...next.domains,[dk]:{...next.domains[dk],notes:existing?(existing+"\n\n--- EHR Import "+ts+" ---\n"+noteText):("--- EHR Import "+ts+" ---\n"+noteText),lastUpdated:ts}}};count+=r.conditions.length+r.medications.length}return addLog(next,"contacts",`FHIR import: ${count} items`)});flash(`Imported ${r.contacts.length} practitioner(s), ${r.conditions.length} condition(s), ${r.medications.length} medication(s).`)}catch(err){flash("FHIR import failed: "+err.message)}};reader.readAsText(file);e.target.value=""};
  const updatePasscodes=async()=>{
    if(!dekRef.current){flash("Session error. Please re-authenticate.");return}
    const cgPw=newCaregiverPw.trim();const clPw=newClientPw.trim();
    if(cgPw&&cgPw.length<4){flash("Passcode must be at least 4 characters.");return}
    if(clPw&&clPw.length<4){flash("Passcode must be at least 4 characters.");return}
    if(cgPw&&clPw&&cgPw===clPw){flash("Caregiver and client passcodes must be different.");return}
    try{
      const keysObj=loadWrappedKeys();if(!keysObj)return;
      const wk={...keysObj.wk};
      if(cgPw)wk.c=await wrapDEK(dekRef.current,cgPw);
      if(clPw){
        const tier=(data.settings&&data.settings.clientTier)||"client-restricted";
        if(tier==="client-restricted"&&rKeyRef.current){ wk.r=await wrapDEK(rKeyRef.current,clPw); wk.clientScope="r"; } // restricted tier: client passcode wraps the scoped key only
        else { wk.r=await wrapDEK(dekRef.current,clPw); delete wk.clientScope; }
      }
      saveWrappedKeys(wk);flash("Passcode(s) updated.");
    }catch(e){flash("Failed to update passcodes: "+e.message)}
    setNewCaregiverPw("");setNewClientPw("")
  };

  /* ── document processing ── */
  const handleDocUpload=async(e)=>{
    const file=(e.target.files&&e.target.files[0]);if(!file)return;
    setDocProcessing(true);setDocResult(null);setDocMeds([]);setDocLabs([]);
    try {
      let rawText="";
      if (file.type==="application/pdf"||file.name.endsWith(".pdf")) {
        rawText=await extractPdfText(file);
      } else {
        rawText=await file.text();
      }
      if (!rawText.trim()) { flash("No text could be extracted from this file.");setDocProcessing(false);return; }
      const docType=detectDocType(rawText);
      const medications=parseMedications(rawText);
      const labs=parseLabResults(rawText);
      const sections=parseClinicalSections(rawText);
      setDocResult({rawText,docType,medications,labs,sections,fileName:file.name});
      setDocMeds(medications.map((m,i)=>({...m,id:nextId()})));
      setDocLabs(labs.map((l,i)=>({...l,id:nextId()})));
    } catch(err) { flash("Error processing file: "+err.message); }
    setDocProcessing(false);e.target.value="";
  };

  const updateDocMed=(id,field,value)=>setDocMeds(p=>p.map(m=>m.id===id?{...m,[field]:value}:m));
  const removeDocMed=(id)=>setDocMeds(p=>p.filter(m=>m.id!==id));
  const addDocMed=()=>setDocMeds(p=>[...p,{id:nextId(),name:"",dosage:"",frequency:"",route:"",notes:""}]);
  const updateDocLab=(id,field,value)=>setDocLabs(p=>p.map(l=>l.id===id?{...l,[field]:value}:l));
  const removeDocLab=(id)=>setDocLabs(p=>p.filter(l=>l.id!==id));

  const saveMedsToNotes=()=>{
    if(!docMeds.length)return;
    const ts=new Date().toLocaleString();
    const table=docMeds.map(m=>`• ${m.name} ${m.dosage} — ${m.frequency} ${m.route} ${m.notes?("("+m.notes+")"):""}`.trim()).join("\n");
    const header=`--- Medications extracted from ${(docResult&&docResult.fileName)||"document"} (${ts}) ---`;
    const dk="physical";
    setData(p=>{const existing=p.domains[dk].notes;return addLog({...p,domains:{...p.domains,[dk]:{...p.domains[dk],notes:existing?(existing+"\n\n"+header+"\n"+table):(header+"\n"+table),lastUpdated:ts}}},dk,`Saved ${docMeds.length} medications from document`)});
    flash(`${docMeds.length} medication(s) saved to ${getDomLabel("physical")} notes.`);
  };

  const saveLabsToNotes=()=>{
    if(!docLabs.length)return;
    const ts=new Date().toLocaleString();
    const table=docLabs.map(l=>`• ${l.test}: ${l.value} ${l.unit} ${l.range?("(ref: "+l.range+")"):""}${l.flag?(" ["+l.flag+"]"):""} ${l.notes?("— "+l.notes):""}`.trim()).join("\n");
    const header=`--- Lab results extracted from ${(docResult&&docResult.fileName)||"document"} (${ts}) ---`;
    const dk="physical";
    setData(p=>{const existing=p.domains[dk].notes;return addLog({...p,domains:{...p.domains,[dk]:{...p.domains[dk],notes:existing?(existing+"\n\n"+header+"\n"+table):(header+"\n"+table),lastUpdated:ts}}},dk,`Saved ${docLabs.length} lab results from document`)});
    flash(`${docLabs.length} lab result(s) saved to ${getDomLabel("physical")} notes.`);
  };

  const saveRawTextToNotes=(domain)=>{
    if(!(docResult&&docResult.rawText))return;
    const ts=new Date().toLocaleString();
    const header=`--- Document: ${docResult.fileName} (${ts}) ---`;
    const text=docResult.rawText.slice(0,5000);
    setData(p=>{const existing=p.domains[domain].notes;return addLog({...p,domains:{...p.domains,[domain]:{...p.domains[domain],notes:existing?(existing+"\n\n"+header+"\n"+text):(header+"\n"+text),lastUpdated:ts}}},domain,`Saved document text to ${getDomLabel(domain)}`)});
    flash(`Document text saved to ${getDomLabel(domain)} notes.`);
  };

  /* ── incidents ── */
  // Externalize freshly-attached data: media to the blob store, leaving only small refs in the vault.
  const recentBlobsRef=useRef(new Map()); // id → created-at; protects just-attached blobs from GC before their ref is persisted
  const externalizeMedia=async(arr,key)=>{ const k=key||dekRef.current; const out=[]; for(const s of arr||[]){ if(typeof s==="string"&&s.startsWith("data:")){ try{const id=await putBlob(s,k);recentBlobsRef.current.set(id,Date.now());out.push("blobref:"+id)}catch{out.push(s)} } else out.push(s); } return out; };
  const externalizeOne=async(s,key)=>{ const k=key||dekRef.current; if(typeof s==="string"&&s.startsWith("data:")){ try{const id=await putBlob(s,k);recentBlobsRef.current.set(id,Date.now());return "blobref:"+id}catch{return s} } return s; };
  // Mark-and-sweep secure deletion: purge blobs no longer referenced anywhere in the vault. A grace window
  // protects blobs attached moments ago whose ref hasn't been persisted/scanned yet. Never deletes a referenced blob.
  const GC_GRACE_MS=120000;
  const gcBlobs=async(stateForRefs)=>{
    try{
      if(!dekRef.current)return;
      if(clientScopedRef.current)return; // a scoped session cannot see private-zone refs — sweeping here would delete the family's media
      const refs=collectBlobRefs(stateForRefs||data);
      const keys=await listBlobKeys();
      const now=Date.now();
      for(const id of keys){
        if(refs.has(id))continue;                                   // still referenced → keep
        const created=recentBlobsRef.current.get(id);
        if(created && (now-created)<GC_GRACE_MS)continue;            // just attached this session → keep (race guard)
        await deleteBlob(id);                                        // unreferenced orphan → securely remove
        recentBlobsRef.current.delete(id);
      }
    }catch(e){console.error("Blob GC failed (non-fatal):",e)}
  };
  // Run GC off the interaction path: during browser idle time (or a short delay as fallback), so the recursive
  // ref-scan never blocks a tap or the unlock paint, even on memory-constrained devices.
  const scheduleGc=(state)=>{ const run=()=>{gcBlobs(state)}; if(typeof window!=="undefined"&&window.requestIdleCallback){window.requestIdleCallback(run,{timeout:5000})}else{setTimeout(run,1200)} };
  const saveIncident=async(inc,id)=>{const photos=await externalizeMedia(inc.photos);const incE={...inc,photos};setData(p=>{let incidents=[...(p.incidents||[])];if(id)incidents=incidents.map(i=>i.id===id?{...i,...incE}:i);else incidents=[{...incE,id:nextId()},...incidents];return addLog({...p,incidents},"incidents",id?"Edited incident":`Logged: ${incE.type} (${incE.severity})`)});setIncidentFilter("all");setIncidentForm(null)};
  const deleteIncident=(id)=>{if(!can("delete-incident",true))return;hipaaAudit("delete","Incident deleted: "+id,"incidents");const next=addLog({...data,incidents:(data.incidents||[]).filter(i=>i.id!==id)},"incidents","Deleted incident");setData(next);scheduleGc(next);setIncidentForm(null)};
  const getFilteredIncidents=()=>{let list=[...(data.incidents||[])];if(incidentFilter!=="all")list=list.filter(i=>i.type===incidentFilter);return list.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))};

  /* ── expenses ── */
  const saveExpense=(exp,id)=>{setData(p=>{let expenses=[...(p.expenses||[])];if(id)expenses=expenses.map(e=>e.id===id?{...e,...exp}:e);else expenses=[{...exp,id:nextId()},...expenses];return addLog({...p,expenses},"expenses",id?"Edited expense":`$${exp.amount} — ${exp.description}`)});setExpenseCatFilter("all");setExpenseMonthFilter("all");setExpenseForm(null)};
  const deleteExpense=(id)=>{if(!can("delete-expense",true))return;hipaaAudit("delete","Expense deleted: "+id,"expenses");setData(p=>addLog({...p,expenses:(p.expenses||[]).filter(e=>e.id!==id)},"expenses","Deleted expense"));setExpenseForm(null)};
  const getFilteredExpenses=()=>{
    let list=[...(data.expenses||[])];
    if(expenseCatFilter!=="all")list=list.filter(e=>e.category===expenseCatFilter);
    if(expenseMonthFilter!=="all")list=list.filter(e=>(e.date&&e.date.startsWith)(expenseMonthFilter));
    return list.sort((a,b)=>b.date.localeCompare(a.date));
  };
  const getExpenseTotal=(list)=>list.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const getExpenseMonths=()=>{const months=new Set();(data.expenses||[]).forEach(e=>{if(e.date)months.add(e.date.slice(0,7))});return[...months].sort().reverse()};

  /* ── med admin ── */
  const getMedSchedule=(includeDiscontinued)=>{const ms=data.medSchedule||{medications:[],log:[]};if(includeDiscontinued)return ms;return{...ms,medications:(ms.medications||[]).filter(m=>!m.discontinued)}};
  const addMedToSchedule=(med)=>{setData(p=>{const ms={...(p.medSchedule||{medications:[],log:[]})};ms.medications=[...ms.medications,{...med,id:nextId(),startDate:new Date().toISOString().slice(0,10)}];hipaaAudit("create","Added medication: "+med.name,"medications");
    return addLog({...p,medSchedule:ms},"medadmin",`Added ${med.name} to schedule`)});setMedForm(null)};
  const editMedInSchedule=(med,id)=>{setData(p=>{const ms={...(p.medSchedule||{medications:[],log:[]})};ms.medications=ms.medications.map(m=>m.id===id?{...m,...med}:m);return{...p,medSchedule:ms}});setMedForm(null)};
  const removeMedFromSchedule=(id)=>{if(!can("med-admin"))return;setData(p=>{const ms={...(p.medSchedule||{medications:[],log:[]})};ms.medications=ms.medications.filter(m=>m.id!==id);ms.log=ms.log.filter(l=>l.medId!==id);return addLog({...p,medSchedule:ms},"medadmin","Removed medication from schedule")})};
  const toggleMedAdmin=(medId,slot,date)=>{
    setData(p=>{
      const ms={...(p.medSchedule||{medications:[],log:[]})};
      const logKey=`${medId}|${slot}|${date}`;
      const existing=ms.log.find(l=>l.key===logKey);
      if(existing){
        // cycle: given → missed → refused → (remove)
        if(existing.status==="given")ms.log=ms.log.map(l=>l.key===logKey?{...l,status:"missed"}:l);
        else if(existing.status==="missed")ms.log=ms.log.map(l=>l.key===logKey?{...l,status:"refused"}:l);
        else ms.log=ms.log.filter(l=>l.key!==logKey);
      } else {
        ms.log=[...ms.log,{key:logKey,medId,slot,date,status:"given",timestamp:new Date().toLocaleString()}];
      }
      return{...p,medSchedule:ms};
    });
  };
  const getMedStatus=(medId,slot,date)=>{const logKey=`${medId}|${slot}|${date}`;return((getMedSchedule().log.find(l=>l.key===logKey))||{}).status||null};
  const getMedDayStats=(date)=>{
    const meds=getMedSchedule().medications;
    let total=0,given=0,missed=0,refused=0;
    meds.forEach(m=>{(m.timeSlots||[]).forEach(s=>{total++;const st=getMedStatus(m.id,s,date);if(st==="given")given++;else if(st==="missed")missed++;else if(st==="refused")refused++})});
    return{total,given,missed,refused,pending:total-given-missed-refused};
  };

  /* ── emergency plans ── */
  const getPlans=()=>data.emergencyPlans||EMERGENCY_SCENARIOS.map(s=>({key:s.key,steps:[...s.steps]}));
  const updatePlanStep=(planIdx,stepIdx,text)=>{setData(p=>{const plans=[...(p.emergencyPlans||getPlans())];plans[planIdx]={...plans[planIdx],steps:[...plans[planIdx].steps]};plans[planIdx].steps[stepIdx]=text;return{...p,emergencyPlans:plans}})};
  const addPlanStep=(planIdx)=>{setData(p=>{const plans=[...(p.emergencyPlans||getPlans())];plans[planIdx]={...plans[planIdx],steps:[...plans[planIdx].steps,""]};return{...p,emergencyPlans:plans}})};
  const removePlanStep=(planIdx,stepIdx)=>{setData(p=>{const plans=[...(p.emergencyPlans||getPlans())];plans[planIdx]={...plans[planIdx],steps:plans[planIdx].steps.filter((_,i)=>i!==stepIdx)};return{...p,emergencyPlans:plans}})};

  /* ── legacy weekly shift grid ── */
  const getShift=(day,slot)=>(data.shifts||{})[`${day}|${slot}`]||"";
  const setShift=(day,slot,name)=>{setData(p=>({...p,shifts:{...(p.shifts||{}),  [`${day}|${slot}`]:name}}))};

  /* ── care schedule (rich shifts) ── */
  const myDeviceId=()=>(data.settings&&data.settings.deviceId)||"";
  // Merge wrapper: after merging, advance the local HLC past any remote shift stamps so causal order
  // is preserved across future sync rounds (proven by hlc-test.mjs). The clock stays device-local.
  const mergeWithClock=(localData,remoteData)=>{
    const result=mergeData(localData,remoteData);
    try{
      let maxR=null;
      (remoteData.careShifts||[]).forEach(s=>{ if(s&&s.hlc&&(!maxR||hlcCompare(s.hlc,maxR)>0))maxR=s.hlc; });
      if(maxR){ hlcRef.current=hlcReceive(hlcRef.current,maxR,(localData.settings&&localData.settings.deviceId)||"",Date.now()); saveHlc(hlcRef.current); }
    }catch{}
    return result;
  };
  const myName=()=>(data.settings&&data.settings.deviceName)||"Me";
  const teamMembers=()=>((data.settings&&data.settings.team&&data.settings.team.members)||[]);
  const memberName=(devId)=>{const m=teamMembers().find(x=>x.deviceId===devId);return m?m.name:(devId===myDeviceId()?myName():"Unknown")};

  const touchShift=(shift)=>{ hlcRef.current=hlcLocal(hlcRef.current,myDeviceId(),Date.now()); saveHlc(hlcRef.current); return {...shift,lastModified:new Date().toISOString(),lastModifiedBy:myName()+" ("+(role||"")+")",hlc:hlcRef.current}; };
  const createShift=(shiftData)=>{
    if(!can("manage-schedule"))return;
    const shift=touchShift({
      id:nextId(),date:shiftData.date,startTime:shiftData.startTime||"09:00",endTime:shiftData.endTime||"17:00",
      assignedTo:shiftData.assignedTo||"",status:shiftData.assignedTo?"assigned":"open",
      tasks:(shiftData.tasks||[]).map(t=>({...t,text:sanitizeText(t.text,300)})),visitNotes:"",carePlan:sanitizeText(shiftData.carePlan||"",2000),
      claimRequests:[],swapRequest:null,visitStarted:null,visitEnded:null,createdBy:myName(),lastModifiedBy:myName()+" ("+(role||"")+")",
    });
    setData(p=>addLog({...p,careShifts:[...(p.careShifts||[]),shift]},"shifts","Created shift "+shift.date));
    hipaaAudit("create","Created shift: "+shift.date,"schedule");
  };
  const updateShift=(id,changes)=>{
    setData(p=>({...p,careShifts:(p.careShifts||[]).map(s=>s.id===id?touchShift({...s,...changes}):s)}));
  };
  const deleteShift=(id)=>{
    if(!can("manage-schedule"))return;
    setData(p=>({...p,careShifts:(p.careShifts||[]).filter(s=>s.id!==id)}));
    hipaaAudit("delete","Deleted shift: "+id,"schedule");
  };
  // Caregiver requests to claim an open shift
  const requestClaim=(id)=>{
    if(!can("claim-shift"))return;
    const dev=myDeviceId(),nm=myName();
    setData(p=>({...p,careShifts:(p.careShifts||[]).map(s=>{
      if(s.id!==id||s.status!=="open")return s;
      if((s.claimRequests||[]).find(c=>c.deviceId===dev))return s;
      return touchShift({...s,status:"claim-requested",claimRequests:[...(s.claimRequests||[]),{deviceId:dev,name:nm,requestedAt:new Date().toISOString()}]});
    })}));
    flash("Claim request submitted. Awaiting admin approval.");
  };
  // Admin approves a claim → assigns the shift
  const approveClaim=(id,deviceId)=>{
    if(!can("manage-schedule"))return;
    updateShift(id,{assignedTo:deviceId,status:"assigned",claimRequests:[]});
    flash("Shift assigned to "+memberName(deviceId)+".");
    hipaaAudit("update","Approved claim, assigned shift to "+memberName(deviceId),"schedule");
  };
  const denyClaim=(id,deviceId)=>{
    if(!can("manage-schedule"))return;
    setData(p=>({...p,careShifts:(p.careShifts||[]).map(s=>{
      if(s.id!==id)return s;
      const remaining=(s.claimRequests||[]).filter(c=>c.deviceId!==deviceId);
      return touchShift({...s,claimRequests:remaining,status:remaining.length?"claim-requested":"open"});
    })}));
  };
  // Assigned caregiver requests to give up / swap their shift
  const requestSwap=(id,reason)=>{
    if(!can("claim-shift"))return;
    setData(p=>({...p,careShifts:(p.careShifts||[]).map(s=>s.id===id?touchShift({...s,status:"swap-requested",swapRequest:{fromDevice:myDeviceId(),fromName:myName(),reason:sanitizeText(reason||"",500),requestedAt:new Date().toISOString()}}):s)}));
    flash("Swap request submitted. Awaiting admin approval.");
  };
  // Admin approves swap → opens the shift for reassignment, or assigns to a specific person
  const approveSwap=(id,newDeviceId)=>{
    if(!can("manage-schedule"))return;
    if(newDeviceId){updateShift(id,{assignedTo:newDeviceId,status:"assigned",swapRequest:null,claimRequests:[]});flash("Shift reassigned to "+memberName(newDeviceId)+".")}
    else{updateShift(id,{assignedTo:"",status:"open",swapRequest:null,claimRequests:[]});flash("Shift opened for claiming.")}
    hipaaAudit("update","Approved swap for shift "+id,"schedule");
  };
  const denySwap=(id)=>{
    if(!can("manage-schedule"))return;
    updateShift(id,{status:"assigned",swapRequest:null});
  };
  // Visit logging (self-attested, no GPS)
  const startVisit=(id)=>{if(!can("log-visit"))return;updateShift(id,{visitStarted:new Date().toISOString()});hipaaAudit("update","Visit started for shift "+id,"schedule")};
  const endVisit=(id)=>{if(!can("log-visit"))return;updateShift(id,{visitEnded:new Date().toISOString()});hipaaAudit("update","Visit ended for shift "+id,"schedule")};
  const toggleShiftTask=(id,taskId)=>{
    if(!can("log-visit"))return;
    setData(p=>({...p,careShifts:(p.careShifts||[]).map(s=>s.id===id?touchShift({...s,tasks:(s.tasks||[]).map(t=>t.id===taskId?{...t,done:!t.done,doneAt:!t.done?new Date().toISOString():null}:t)}):s)}));
  };
  const setVisitNotes=(id,notes)=>{if(!can("log-visit"))return;updateShift(id,{visitNotes:sanitizeText(notes,2000)})};

  // Availability
  const setMyAvailability=(avail)=>{
    const dev=myDeviceId();
    setData(p=>({...p,availability:{...(p.availability||{}),[dev]:{name:sanitizeText(myName(),100),days:avail,updated:new Date().toISOString()}}}));
    flash("Availability updated.");
  };
  const getMyAvailability=()=>{const dev=myDeviceId();return ((data.availability||{})[dev]||{}).days||{}};

  /* ── transition triggers ── */
  const getTrigger=(key)=>(data.transitionTriggers||{})[key]||false;
  const toggleTrigger=(key)=>{setData(p=>({...p,transitionTriggers:{...(p.transitionTriggers||{}),[key]:!((p.transitionTriggers||{})[key])}}))};
  const getTriggeredCount=()=>TRANSITION_TRIGGERS.filter(t=>getTrigger(t.key)).length;

  /* ── status history (longitudinal tracking) ── */
  const recordStatusSnapshot=()=>{
    const ts=new Date().toISOString().slice(0,10);
    const snap={date:ts,domains:{}};
    DOMAINS.forEach(d=>{snap.domains[d.key]={status:data.domains[d.key].status,pct:getProgress(d.key).pct}});
    snap.triggeredCount=getTriggeredCount();
    snap.incidentCount=(data.incidents||[]).length;
    setData(p=>addLog({...p,statusHistory:[...(p.statusHistory||[]),snap]},"tracking","Status snapshot recorded"));
    flash("Status snapshot recorded for "+ts);
  };

  /* ── post-death checklist ── */
  const getPostDeathChecked=(sectionIdx,itemIdx)=>((data.postDeathChecklist||[])[sectionIdx]||[])[itemIdx]||false;
  const togglePostDeath=(sectionIdx,itemIdx)=>{setData(p=>{const cl=[...(p.postDeathChecklist||POST_DEATH_SECTIONS.map(s=>s.items.map(()=>false)))];cl[sectionIdx]=[...cl[sectionIdx]];cl[sectionIdx][itemIdx]=!cl[sectionIdx][itemIdx];return{...p,postDeathChecklist:cl}})};

  /* ── visit summary generator ── */
  const generateVisitSummary=()=>{
    const ts=new Date().toLocaleString();
    const lines=[];
    lines.push("══════════════════════════════════════");
    lines.push("VISIT PREPARATION SUMMARY — "+ts);
    lines.push("══════════════════════════════════════\n");
    // meds
    const meds=getMedSchedule().medications;
    if(meds.length){lines.push("CURRENT MEDICATIONS:");meds.forEach(m=>lines.push(`  • ${m.name} ${m.dosage} — ${(m.timeSlots||[]).join(", ")}${m.notes?" ("+m.notes+")":""}`));lines.push("")}
    // recent incidents
    const recent=(data.incidents||[]).slice(0,10);
    if(recent.length){lines.push("RECENT INCIDENTS (last 10):");recent.forEach(i=>{const t=INCIDENT_TYPES.find(x=>x.key===i.type);lines.push(`  • ${i.date} ${i.time} — ${(t&&t.label)||i.type} (${i.severity}): ${i.description.slice(0,100)}`)});lines.push("")}
    // domain status
    lines.push("DOMAIN STATUS:");
    DOMAINS.forEach(d=>{const prog=getProgress(d.key);const health=prog.pct>=80&&prog.recency>=70?"Healthy":prog.pct>=40||prog.recency>=40?"Fair":"Needs Attention";lines.push(`  • ${getDomLabel(d.key)}: ${health} — Foundation: ${prog.pct}% (${prog.done}/${prog.total})${prog.ongoingTotal>0?`, Care Pulse: ${prog.recency}% (${prog.ongoingOk}/${prog.ongoingTotal} current)`:""}`)});
    lines.push("");
    // triggered transitions
    const triggered=TRANSITION_TRIGGERS.filter(t=>getTrigger(t.key));
    if(triggered.length){lines.push("ACTIVE ESCALATION TRIGGERS:");triggered.forEach(t=>lines.push(`  ⚠ ${t.label}: ${t.desc}`));lines.push("")}
    // recent expenses
    const recentExp=(data.expenses||[]).slice(0,5);
    if(recentExp.length){lines.push("RECENT EXPENSES (last 5):");recentExp.forEach(e=>{const cat=EXPENSE_CATS.find(c=>c.key===e.category);lines.push(`  • ${e.date} $${parseFloat(e.amount||0).toFixed(2)} — ${(cat&&cat.label)}: ${e.description}`)});lines.push("")}
    // notes from physical domain
    const pNotes=(data.domains.physical&&data.domains.physical.notes);
    if(pNotes){lines.push("PHYSICAL HEALTH NOTES (excerpt):");lines.push("  "+pNotes.slice(0,500));lines.push("")}
    lines.push("══════════════════════════════════════");
    lines.push("Questions for provider:");
    lines.push("  1. ");lines.push("  2. ");lines.push("  3. ");
    return lines.join("\n");
  };

  /* ── self reports ── */
  const submitSelfReport=async()=>{
    const report={id:nextId(),type:srType,timestamp:new Date().toLocaleString(),date:fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())};
    if(srType==="text"||srType==="concern"){if(!srText.trim()){setSrErr("Please enter some text before submitting.");return}report.text=srText.trim()}
    else if(srType==="mood"){if(!srMood){setSrErr("Please select a mood before submitting.");return}report.mood=srMood;report.text=srText.trim()}
    else if(srType==="pain"){if(!srPain){setSrErr("Please select a pain level before submitting.");return}report.pain=srPain;report.text=srText.trim()}
    else if(srType==="sleep"){if(!srText.trim()){setSrErr("Please describe your sleep before submitting.");return}report.text=srText.trim()}
    else if(srType==="audio"){if(!srAudioData&&!srText.trim()){setSrErr("Please record audio or enter text before submitting.");return}report.audioData=srAudioData?await externalizeOne(srAudioData,rKeyRef.current||dekRef.current):null;report.text=srText.trim()}
    if(srPhotos.length>0)report.photos=await externalizeMedia(srPhotos,rKeyRef.current||dekRef.current);
    report.origin=isClient?"client":"caregiver"; // client-authored reports become append-only and hash-chained
    try{ const mh=[]; for(const p of srPhotos){ if(typeof p==="string"&&p.startsWith("data:"))mh.push(await sha256Hex(p)); } if(srAudioData&&typeof srAudioData==="string"&&srAudioData.startsWith("data:"))mh.push(await sha256Hex(srAudioData)); if(mh.length)report.mediaHashes=mh; }catch{}
    setSrErr("");
    if(clientScopedRef.current){ try{ await appendOutboxReport(report,rKeyRef.current); }catch(e){console.error("Outbox write failed:",e);setSrErr("Couldn't save your update — please try again.");return} }
    if(report.origin==="client"&&!clientScopedRef.current){
      // Client-full session: chain the report into the tamper-evident sequence immediately
      const base=addLog({...data,selfReports:[report,...(data.selfReports||[])]},"selfreport",`${(SELF_REPORT_TYPES.find(t=>t.key===srType)||{}).label||"Update"} from client`);
      const {state:chainedState}=await chainClientReports(base);
      setData(chainedState);
    } else {
      setData(p=>addLog({...p,selfReports:[report,...(p.selfReports||[])]},"selfreport",`${(SELF_REPORT_TYPES.find(t=>t.key===srType)||{}).label||"Update"} from client`));
    }
    setSrText("");setSrMood("");setSrPain("");setSrAudioData(null);setSrPhotos([]);
    flash("Update submitted. Your care team will see this.");
  };
  const deleteSelfReport=(id)=>{
    const target=(data.selfReports||[]).find(r=>r.id===id);
    if(target&&(target.origin==="client"||typeof target.srSeq==="number")){flash("Client updates can't be deleted or edited — the care recipient's own words are permanent, for their protection and yours.");return} // no role is exempt, including admin
    if(!can("delete-incident",true))return;
    hipaaAudit("delete","Self-report deleted: "+id,"self_reports");const next={...data,selfReports:(data.selfReports||[]).filter(r=>r.id!==id)};setData(next);scheduleGc(next);flash("Self-report deleted.")};
  // Photo handling for incidents and self-reports
  const handlePhotoCapture=(e,setter)=>{
    const files=e.target.files;if(!files||!files.length)return;
    Array.from(files).slice(0,3).forEach(file=>{
      if(!file.type.startsWith("image/")){flash("Only image files are allowed.");return}
      if(file.size>2*1024*1024){flash("Photo too large (max 2MB). Try a lower resolution.");return}
      const reader=new FileReader();
      reader.onload=()=>{setter(p=>[...p,reader.result])};
      reader.readAsDataURL(file);
    });
    e.target.value="";
  };

  const getSrStorageKB=()=>{const sr=data.selfReports||[];let bytes=0;sr.forEach(r=>{bytes+=JSON.stringify(r).length});return Math.round(bytes/1024)};

  // Caregiver wellness
  const submitCaregiverCheckin=()=>{
    if(!cwStress){flash("Please select a stress level.");return}
    const entry={id:nextId(),date:new Date().toISOString().slice(0,10),timestamp:new Date().toLocaleString(),stress:cwStress,sleep:cwSleep,hoursOfCare:Math.min(parseFloat(cwHours)||0,24),notes:sanitizeText(cwNotes.trim(),500),deviceId:(data.settings&&data.settings.deviceId),caregiver:sanitizeText((data.settings&&data.settings.deviceName)||"",100)};
    setData(p=>({...p,caregiverWellness:[entry,...(p.caregiverWellness||[])]}));
    setCwStress("");setCwSleep("");setCwHours("");setCwNotes("");
    flash("Check-in recorded. Take care of yourself.");
  };
  // Capacity documentation
  const CAPACITY_AREAS=[
    {key:"hygiene",label:"Personal hygiene"},
    {key:"dressing",label:"Dressing"},
    {key:"eating",label:"Eating/feeding"},
    {key:"mobility",label:"Mobility/walking"},
    {key:"communication",label:"Communication"},
    {key:"recognition",label:"Recognizing family"},
    {key:"orientation",label:"Time/place orientation"},
    {key:"decisions",label:"Making decisions"},
    {key:"finances",label:"Managing finances"},
    {key:"medications",label:"Managing medications"},
    {key:"cooking",label:"Cooking/meal prep"},
    {key:"driving",label:"Driving safely"},
  ];
  const CAPACITY_LEVELS=["Independent","Needs prompting","Needs assistance","Fully dependent","Not assessed"];
  const [capEntries,setCapEntries]=useState({});
  const [poaForm,setPoaForm]=useState(null);
  const [shiftForm,setShiftForm]=useState(null);
  const [swapModal,setSwapModal]=useState(null);
  const [swapReason,setSwapReason]=useState("");
  const [availDraft,setAvailDraft]=useState(null);
  const [shiftTaskInput,setShiftTaskInput]=useState("");
  const [capNotes,setCapNotes]=useState("");
  const submitCapacityLog=()=>{
    const filled=Object.entries(capEntries).filter(([k,v])=>v&&v!=="Not assessed");
    if(filled.length===0){flash("Please assess at least one area.");return}
    const entry={id:nextId(),date:new Date().toISOString().slice(0,10),timestamp:new Date().toLocaleString(),assessments:{...capEntries},notes:sanitizeText(capNotes.trim(),500),assessor:sanitizeText((data.settings&&data.settings.deviceName)||"",100)};
    setData(p=>({...p,capacityLog:[entry,...(p.capacityLog||[])]}));
    setCapEntries({});setCapNotes("");flash("Capacity observation recorded.");
  };

  // POA decision documentation
  const POA_DECISION_TYPES=[
    {key:"medical",label:"Medical",icon:"🏥"},
    {key:"financial",label:"Financial",icon:"💰"},
    {key:"legal",label:"Legal",icon:"⚖"},
    {key:"housing",label:"Housing / Placement",icon:"🏠"},
    {key:"care",label:"Care Arrangements",icon:"🤝"},
    {key:"safety",label:"Safety / Protection",icon:"🛡"},
    {key:"other",label:"Other",icon:"📋"},
  ];
  const submitPoaDecision=(d)=>{
    if(!d.type||!d.description.trim()){flash("Decision type and description are required.");return}
    const entry={
      id:nextId(),
      date:new Date().toISOString().slice(0,10),
      timestamp:new Date().toLocaleString(),
      type:d.type,
      description:sanitizeText(d.description.trim(),2000),
      reasoning:sanitizeText((d.reasoning||"").trim(),2000),
      knownWishes:sanitizeText((d.knownWishes||"").trim(),1000),
      consulted:sanitizeText((d.consulted||"").trim(),500),
      outcome:sanitizeText((d.outcome||"").trim(),1000),
      urgency:d.urgency||"routine",
      agent:(data.settings&&data.settings.deviceName)||"",
    };
    setData(p=>addLog({...p,poaDecisions:[entry,...(p.poaDecisions||[])]},"poa","POA decision: "+entry.type));
    setPoaForm(null);
    hipaaAudit("create","POA decision: "+entry.type+" — "+entry.description.slice(0,80),"poa_decisions");
    flash("POA decision documented.");
  };

  // Care plan binder generator
  const generateCarePlanBinder=()=>{
    const team=data.settings&&data.settings.team;
    const lines=[];
    lines.push("═══════════════════════════════════════════");
    lines.push("CARE PLAN BINDER — "+(team&&team.clientName||"[Client Name]"));
    lines.push("Generated: "+new Date().toLocaleString());
    lines.push("═══════════════════════════════════════════\n");
    // Diagnoses & medical
    lines.push("DIAGNOSES & MEDICAL NOTES");
    lines.push("─────────────────────────");
    DOMAINS.filter(d=>d.key==="physical"||d.key==="cognitive").forEach(d=>{
      if(data.domains[d.key]&&data.domains[d.key].notes)lines.push(getDomLabel(d.key)+": "+data.domains[d.key].notes);
    });
    // Current medications
    lines.push("\nCURRENT MEDICATIONS");
    lines.push("─────────────────────────");
    getMedSchedule().medications.forEach(m=>{lines.push("• "+m.name+(m.dosage?" "+m.dosage:"")+(m.frequency?" — "+m.frequency:"")+(m.startDate?" (started "+m.startDate+")":""))});
    if(getMedSchedule(true).medications.filter(m=>m.discontinued).length>0){
      lines.push("\nDISCONTINUED MEDICATIONS");
      getMedSchedule(true).medications.filter(m=>m.discontinued).forEach(m=>{lines.push("• "+m.name+(m.dosage?" "+m.dosage:"")+" — stopped "+(m.discontinuedDate||"unknown"))});
    }
    // Emergency contacts
    lines.push("\nEMERGENCY CONTACTS");
    lines.push("─────────────────────────");
    (data.contacts||[]).filter(c=>c.category==="medical"||c.category==="family").forEach(c=>{lines.push("• "+c.name+(c.role?" ("+c.role+")":"")+(c.phone?" — "+c.phone:""))});
    // Advance directive status
    lines.push("\nLEGAL STATUS");
    lines.push("─────────────────────────");
    if(data.domains.legal&&data.domains.legal.notes)lines.push(data.domains.legal.notes);
    // Daily routine
    lines.push("\nDAILY ROUTINE & PREFERENCES");
    lines.push("─────────────────────────");
    if(data.domains.wellness&&data.domains.wellness.notes)lines.push(data.domains.wellness.notes);
    if(data.domains.cognitive&&data.domains.cognitive.notes)lines.push(data.domains.cognitive.notes);
    // Behavioral notes
    lines.push("\nBEHAVIORAL NOTES");
    lines.push("─────────────────────────");
    const recentInc=(data.incidents||[]).slice(0,10);
    recentInc.forEach(i=>{lines.push("• ["+i.date+"] "+i.type+": "+i.description)});
    // Capacity
    if((data.capacityLog||[]).length>0){
      lines.push("\nMOST RECENT CAPACITY ASSESSMENT");
      lines.push("─────────────────────────");
      const latest=(data.capacityLog||[])[0];
      lines.push("Date: "+latest.timestamp);
      Object.entries(latest.assessments||{}).forEach(([k,v])=>{const area=CAPACITY_AREAS.find(a=>a.key===k);lines.push("• "+(area&&area.label||k)+": "+v)});
      if(latest.notes)lines.push("Notes: "+latest.notes);
    }
    // POA decisions
    if((data.poaDecisions||[]).length>0){
      lines.push("\nPOA DECISIONS (most recent 10)");
      lines.push("─────────────────────────");
      (data.poaDecisions||[]).slice(0,10).forEach(d=>{
        const t=POA_DECISION_TYPES.find(x=>x.key===d.type);
        lines.push("• ["+d.date+"] "+(t&&t.label||d.type)+": "+d.description);
        if(d.reasoning)lines.push("  Reasoning: "+d.reasoning);
        if(d.knownWishes)lines.push("  Known wishes: "+d.knownWishes);
        if(d.outcome)lines.push("  Outcome: "+d.outcome);
      });
    }
    // Care team
    lines.push("\nCARE TEAM");
    lines.push("─────────────────────────");
    if(team&&team.members){team.members.forEach(m=>{lines.push("• "+m.name+" — "+m.role)})}
    lines.push("\n═══════════════════════════════════════════");
    lines.push("End of Care Plan Binder");
    return lines.join("\n");
  };

  // ═══ Proactive Reminder Engine ═══
  const MED_SLOTS={Morning:{start:6,end:10},Midday:{start:10,end:13},Afternoon:{start:13,end:17},Evening:{start:17,end:20},Bedtime:{start:20,end:23}};
  const getCurrentSlot=()=>{const h=new Date().getHours();for(const[name,range]of Object.entries(MED_SLOTS)){if(h>=range.start&&h<range.end)return name}return null};
  const getNextSlot=()=>{const h=new Date().getHours();const slots=Object.entries(MED_SLOTS);for(const[name,range]of slots){if(h<range.start)return{name,inMinutes:Math.round((range.start-h)*60)}}return null};

  const getReminders=()=>{
    const reminders=[];const now=new Date();const todayStr=now.toISOString().slice(0,10);const curHour=now.getHours();
    const curSlot=getCurrentSlot();const nextSlot=getNextSlot();

    // 1. Medication reminders
    const meds=getMedSchedule();const log=getMedSchedule(true).log||[];
    meds.medications.forEach(med=>{
      const slots=med.timeSlots||[];
      slots.forEach(slot=>{
        if(slot==="As Needed")return;
        const logKey=med.id+"|"+slot+"|"+todayStr;
        const logged=log.find(l=>l.key===logKey);
        const range=MED_SLOTS[slot];
        if(!range)return;
        if(!logged){
          if(curHour>=range.end){
            // Past this window — missed
            reminders.push({type:"med-missed",priority:1,icon:"❌",title:med.name+" — "+slot+" missed",sub:"Was due by "+range.end+":00",action:"medadmin",hub:"records"});
          } else if(curHour>=range.start){
            // Current window — due now
            reminders.push({type:"med-due",priority:2,icon:"💊",title:med.name+" — due now",sub:slot+" window ("+range.start+":00–"+range.end+":00)",action:"medadmin",hub:"records"});
          } else if(nextSlot&&nextSlot.name===slot&&nextSlot.inMinutes<=60){
            // Upcoming within the hour
            reminders.push({type:"med-upcoming",priority:3,icon:"⏰",title:med.name+" — "+slot+" in ~"+nextSlot.inMinutes+"min",sub:"Coming up soon",action:"medadmin",hub:"records"});
          }
        }
      });
    });

    // 2. Recurring task reminders
    DOMAINS.filter(d=>can("view-domain",d.key)).forEach(dom=>{
      const domData=data.domains[dom.key]||{goals:[]};
      (dom.goals||[]).forEach((goal,gi)=>{
        (goal.subs||[]).forEach((sub,si)=>{
          const subData=(domData.goals&&domData.goals[gi]&&domData.goals[gi].subs&&domData.goals[gi].subs[si])||{};
          const typeOverride=subData.typeOverride;
          const origType=sub.type||"O";
          const type=typeOverride||origType;
          if(type!=="R")return;
          const interval=sub.interval||30;
          const lastDone=subData.lastDone;
          if(!lastDone)return; // never done — shows as overdue in domain view
          const daysSince=Math.floor((Date.now()-new Date(lastDone).getTime())/86400000);
          const daysUntilDue=interval-daysSince;
          if(daysUntilDue<=0){
            reminders.push({type:"task-overdue",priority:2,icon:"🔴",title:sub.text.slice(0,60),sub:getDomLabel(dom.key)+" — "+Math.abs(daysUntilDue)+"d overdue (every "+interval+"d)",action:dom.key,hub:"care"});
          } else if(daysUntilDue<=7){
            reminders.push({type:"task-upcoming",priority:4,icon:"🟡",title:sub.text.slice(0,60),sub:getDomLabel(dom.key)+" — due in "+daysUntilDue+"d",action:dom.key,hub:"care"});
          }
        });
      });
    });

    // 3. Appointment reminders (next 48 hours)
    (data.appointments||[]).forEach(appt=>{
      const apptDate=new Date(appt.date+(appt.time?" "+appt.time:""));
      const hoursUntil=Math.round((apptDate.getTime()-now.getTime())/3600000);
      if(hoursUntil>0&&hoursUntil<=48){
        const timeLabel=hoursUntil<=2?"in "+hoursUntil+"h":hoursUntil<=24?"today":"tomorrow";
        reminders.push({type:"appt",priority:hoursUntil<=4?2:3,icon:"📅",title:appt.description||"Appointment",sub:timeLabel+(appt.location?" at "+appt.location:""),action:"calendar",hub:"records"});
      }
    });

    // Sort by priority (1=highest)
    reminders.sort((a,b)=>a.priority-b.priority);
    return reminders;
  };

  // Browser notification support
  const sendNotification=(title,body)=>{
    if(!("Notification" in window))return;
    if(Notification.permission==="granted"){new Notification(title,{body,icon:"🛡"})}
  };
  const requestNotifications=()=>{
    if(!("Notification" in window)){flash("Notifications not supported in this browser.");return}
    Notification.requestPermission().then(p=>{
      if(p==="granted"){flash("Notifications enabled. You'll be reminded about upcoming medications.");sendNotification("Care Guardian","Notifications are now active.")}
      else{flash("Notification permission denied.")}
    });
  };

  // Check reminders periodically and notify
  useEffect(()=>{
    if(!authed)return;
    const check=()=>{
      if(!("Notification" in window)||Notification.permission!=="granted")return;
      const rems=getReminders();
      const dueMeds=rems.filter(r=>r.type==="med-due");
      if(dueMeds.length>0){
        sendNotification("Medications Due",dueMeds.map(r=>r.title).join(", "));
      }
    };
    const interval=setInterval(check,15*60*1000); // Check every 15 minutes
    return()=>clearInterval(interval);
  },[authed]);

  const daysSinceRespite=()=>{const entries=data.caregiverWellness||[];if(!entries.length)return null;const last=entries.find(e=>e.hoursOfCare===0);if(!last)return entries.length>0?Math.floor((Date.now()-new Date(entries[entries.length-1].date).getTime())/86400000):null;return Math.floor((Date.now()-new Date(last.date).getTime())/86400000)};

  const startAudioRecording=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const recorder=new MediaRecorder(stream);
      audioChunksRef.current=[];
      recorder.ondataavailable=(e)=>{if(e.data.size>0)audioChunksRef.current.push(e.data)};
      recorder.onstop=()=>{
        const blob=new Blob(audioChunksRef.current,{type:"audio/webm"});
        const reader=new FileReader();
        reader.onload=()=>setSrAudioData(reader.result);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
      };
      mediaRecRef.current=recorder;
      recorder.start();
      setSrRecording(true);
      // Auto-stop after 60 seconds
      setTimeout(()=>{if((mediaRecRef.current&&mediaRecRef.current.state)==="recording"){mediaRecRef.current.stop();setSrRecording(false)}},60000);
    }catch(e){flash("Microphone access denied or unavailable.")}
  };
  const stopAudioRecording=()=>{if((mediaRecRef.current&&mediaRecRef.current.state)==="recording"){mediaRecRef.current.stop();setSrRecording(false)}};

  /* ── expense export ── */
  const exportExpensesCsv=()=>{
    const rows=getFilteredExpenses();if(!rows.length){flash("No expenses to export.");return}
    const header="Date,Amount,Category,Description,Payee,Receipt/Reference\n";
    const csv=header+rows.map(e=>{const cat=EXPENSE_CATS.find(c=>c.key===e.category);return[sanitizeText(e.date||"",20),parseFloat(e.amount||0).toFixed(2),`"${sanitizeText((cat&&cat.label)||e.category||"",100).replace(/"/g,'""')}"`,`"${sanitizeText(e.description||"",500).replace(/"/g,'""')}"`,`"${sanitizeText(e.payee||"",200).replace(/"/g,'""')}"`,`"${sanitizeText(e.receipt||"",200).replace(/"/g,'""')}"`].join(",")}).join("\n");
    try{navigator.clipboard.writeText(csv);flash(`${rows.length} expense(s) copied as CSV. Paste into a spreadsheet to save.`)}catch{downloadFile(csv,"care-expenses.csv","text/csv");flash(`Exported ${rows.length} expense(s).`)}
  };
  const printExpenses=()=>{window.print()};

  /* ── self-report export ── */
  const exportSelfReportsCsv=()=>{
    const rows=data.selfReports||[];if(!rows.length){flash("No self-reports to export.");return}
    const header="Date,Time,Type,Mood,Pain,Text\n";
    const csv=header+rows.map(r=>{const rt=SELF_REPORT_TYPES.find(t=>t.key===r.type);return[
      sanitizeText(r.date||"",20),
      sanitizeText(r.timestamp||"",30),
      `"${sanitizeText((rt&&rt.label)||r.type||"",50).replace(/"/g,'""')}"`,
      `"${sanitizeText(r.mood||"",50).replace(/"/g,'""')}"`,
      `"${sanitizeText(r.pain||"",50).replace(/"/g,'""')}"`,
      `"${sanitizeText(r.text||"",2000).replace(/"/g,'""').replace(/\n/g," ")}"`
    ].join(",")}).join("\n");
    try{navigator.clipboard.writeText(csv);flash(`${rows.length} self-report(s) copied as CSV. Paste into a spreadsheet to save.`)}catch{downloadFile(csv,"care-self-reports.csv","text/csv");flash(`Exported ${rows.length} self-report(s).`)}
  };
  const exportSelfReportsText=()=>{
    const rows=data.selfReports||[];if(!rows.length){flash("No self-reports to export.");return}
    const lines=rows.map(r=>{const rt=SELF_REPORT_TYPES.find(t=>t.key===r.type);
      let entry=`[${r.timestamp||r.date}] ${(rt&&rt.icon)||""} ${(rt&&rt.label)||r.type}`;
      if(r.mood)entry+=`\n  Mood: ${r.mood}`;
      if(r.pain)entry+=`\n  Pain: ${r.pain}`;
      if(r.text)entry+=`\n  ${r.text}`;
      if(r.audioData)entry+=`\n  [Voice note attached — not included in text export]`;
      return entry;
    }).join("\n\n");
    const header=`Self-Reports Export — ${new Date().toLocaleString()}\n${"═".repeat(50)}\n\n`;
    try{navigator.clipboard.writeText(header+lines);flash(`${rows.length} self-report(s) copied as text. Paste into any document to save.`)}catch{downloadFile(header+lines,"care-self-reports.txt","text/plain");flash(`Exported ${rows.length} self-report(s).`)}
  };

  /* ── saved documents ── */
  const saveDocToLibrary=(category)=>{
    if(!docResult)return;
    const doc={id:nextId(),fileName:docResult.fileName,category:category||docSaveCategory,docType:docResult.docType.key,date:new Date().toLocaleString(),
      medCount:docMeds.length,labCount:docLabs.length,
      summary:docResult.rawText.slice(0,200),
      rawText:docResult.rawText.slice(0,10000),
      medications:[...docMeds],
      labs:[...docLabs],
      sections:docResult.sections||[],
    };
    setData(p=>addLog({...p,savedDocs:[doc,...(p.savedDocs||[])]},"documents",`Saved: ${doc.fileName}`));
    setDocCatFilter("all");
    flash(`Document "${doc.fileName}" saved to library.`);
  };
  const deleteDoc=(id)=>{setData(p=>({...p,savedDocs:(p.savedDocs||[]).filter(d=>d.id!==id)}))};
  const getFilteredDocs=()=>{const list=[...(data.savedDocs||[])];if(docCatFilter==="all")return list;return list.filter(d=>d.category===docCatFilter)};
  const [viewingDoc,setViewingDoc]=useState(null); // doc id to view

  /* ── nav ── */
  const toggle=(gi)=>setExpanded(p=>({...p,[gi]:!p[gi]}));
  const PHI_VIEWS={"incidents":"incidents","medadmin":"medications","contacts":"contacts","documents":"documents","selfreport":"self_reports","poa-decisions":"poa_decisions","capacity":"capacity","physical":"domains","cognitive":"domains","wellness":"domains","legal":"domains","financial":"domains","emergency-card":"emergency_info","binder":"care_plan","handoff":"shift_data"};
  const nav=(v)=>{if(PHI_VIEWS[v]&&authed)hipaaAudit("view","Accessed "+v,PHI_VIEWS[v]);setNavStack(p=>[...p,{view,hub:currentHub}]);setView(v);setExpanded({});setEditNotes(false);setAddSubFor(null);cancelEdit();setContactForm(null);setContactDetail(null);setEditingDomain(null);setApptForm(null);setCalSelected(null);setDocResult(null);setDocMeds([]);setDocLabs([]);setIncidentForm(null);setExpenseForm(null);setMedForm(null);setViewingDoc(null)};
  const navHub=(hub)=>{setCurrentHub(hub);setView(hub+"-hub");setNavStack([]);setExpanded({})};
  const navBack=()=>{if(navStack.length>0){const prev=navStack[navStack.length-1];setNavStack(p=>p.slice(0,-1));setView(prev.view);setCurrentHub(prev.hub)}else{navHub(currentHub)}};
  const isHubView=view.endsWith("-hub");
  const getViewTitle=()=>{const t={"today-hub":"Today","care-hub":"Care plan","records-hub":"Records","team-hub":"Team",physical:"Physical health",cognitive:"Cognitive health",wellness:"Wellness",legal:"Legal safety",financial:"Financial security",incidents:"Incidents",medadmin:"Medication admin",expenses:"Expenses",calendar:"Calendar",contacts:"Contacts",documents:"Documents",shifts:"Shifts",triggers:"Escalation triggers",tracking:"Tracking",visit:"Visit prep",emergency:"Emergency plans",postdeath:"After death",messages:"Messages",sync:"Sync",selfreport:"Self-report",settings:"Settings",help:"Help",overview:"Overview",handoff:"Shift Handoff","emergency-card":"Emergency Card","caregiver-wellness":"Caregiver Check-in","incident-patterns":"Incident Patterns",capacity:"Capacity Observations",binder:"Care Plan Binder","poa-decisions":"POA Decisions",schedule:"Care Schedule",availability:"My Availability"};return t[view]||"Care Guardian"};
  const getBreadcrumb=()=>{const h={today:"Today",care:"Care plan",records:"Records",team:"Team"};if(isHubView)return null;return h[currentHub]||null};

  // Universal search
  const SEARCH_FEATURES=[
    {label:"Medications",hub:"records",view:"medadmin",icon:"💊",keywords:"medication med admin drug pill prescription"},
    {label:"Incidents",hub:"records",view:"incidents",icon:"⚠",keywords:"incident fall behavior wandering medication error accident"},
    {label:"Incident Patterns",hub:"records",view:"incident-patterns",icon:"📊",keywords:"pattern trend chart graph analysis time"},
    {label:"Expenses",hub:"records",view:"expenses",icon:"$",keywords:"expense cost money payment receipt"},
    {label:"Documents",hub:"records",view:"documents",icon:"📄",keywords:"document scan pdf lab result upload library"},
    {label:"Contacts",hub:"records",view:"contacts",icon:"☷",keywords:"contact phone email doctor nurse lawyer provider"},
    {label:"Calendar",hub:"records",view:"calendar",icon:"▦",keywords:"calendar appointment schedule date"},
    {label:"Care Schedule",hub:"records",view:"schedule",icon:"🗓",keywords:"schedule shift open swap claim visit clock availability roster assignment"},
    {label:"Shifts",hub:"records",view:"shifts",icon:"👥",keywords:"shift schedule caregiver aide worker weekly grid"},
    {label:"Messages",hub:"team",view:"messages",icon:"✉",keywords:"message chat text communication team"},
    {label:"Self-Reports",hub:"team",view:"selfreport",icon:"🗣",keywords:"self report mood pain sleep voice concern"},
    {label:"Sync",hub:"team",view:"sync",icon:"📡",keywords:"sync backup export import cloud server team invite"},
    {label:"Settings",hub:"team",view:"settings",icon:"⚙",keywords:"settings passcode password state region tab order device"},
    {label:"Help",hub:"team",view:"help",icon:"?",keywords:"help guide how to feature"},
    {label:"Physical Health",hub:"care",view:"physical",icon:"♥",keywords:"physical health mobility fall nutrition dental vision sleep"},
    {label:"Cognitive Health",hub:"care",view:"cognitive",icon:"◐",keywords:"cognitive memory assessment routine behavior orientation"},
    {label:"Wellness",hub:"care",view:"wellness",icon:"✿",keywords:"wellness emotional social activity engagement respite"},
    {label:"Legal Safety",hub:"care",view:"legal",icon:"⚖",keywords:"legal poa power attorney advance directive hipaa guardianship"},
    {label:"Financial Security",hub:"care",view:"financial",icon:"◈",keywords:"financial medicaid benefit insurance asset spend down"},
    {label:"Escalation Triggers",hub:"care",view:"triggers",icon:"📊",keywords:"trigger escalation transition warning condition monitor"},
    {label:"Tracking",hub:"care",view:"tracking",icon:"📈",keywords:"tracking longitudinal snapshot history trend progress"},
    {label:"Visit Prep",hub:"care",view:"visit",icon:"📋",keywords:"visit prep doctor appointment provider summary"},
    {label:"Emergency Plans",hub:"care",view:"emergency",icon:"🚨",keywords:"emergency plan fall choking wandering agitation"},
    {label:"POA Decisions",hub:"care",view:"poa-decisions",icon:"⚖",keywords:"poa power attorney decision medical financial legal guardian agent fiduciary"},
    {label:"Capacity Observations",hub:"care",view:"capacity",icon:"📝",keywords:"capacity observation ability assessment functional decline"},
    {label:"Care Plan Binder",hub:"care",view:"binder",icon:"📖",keywords:"binder care plan printable comprehensive document"},
    {label:"Shift Handoff",hub:"today",view:"handoff",icon:"📋",keywords:"handoff shift change summary incoming outgoing"},
    {label:"Emergency Card",hub:"today",view:"emergency-card",icon:"🆔",keywords:"emergency card wallet id printable diagnoses medications"},
    {label:"Caregiver Check-in",hub:"today",view:"caregiver-wellness",icon:"💛",keywords:"caregiver wellness burnout stress sleep respite self care"},
  ];

  const getSearchResults=(q)=>{
    if(!q||q.length<2)return{features:[],data:[]};
    const ql=q.toLowerCase();const results={features:[],data:[]};

    // Search features
    SEARCH_FEATURES.forEach(f=>{
      if(f.label.toLowerCase().includes(ql)||f.keywords.includes(ql))results.features.push(f);
    });

    // Search incidents
    (data.incidents||[]).forEach(i=>{
      if((i.description||"").toLowerCase().includes(ql)||(i.type||"").toLowerCase().includes(ql)||(i.response||"").toLowerCase().includes(ql))
        results.data.push({type:"incident",icon:"⚠",title:i.type+" — "+i.severity,sub:(i.description||"").slice(0,80),date:i.date,hub:"records",view:"incidents",id:i.id});
    });

    // Search contacts
    (data.contacts||[]).forEach(c=>{
      if((c.name||"").toLowerCase().includes(ql)||(c.role||"").toLowerCase().includes(ql)||(c.organization||"").toLowerCase().includes(ql))
        results.data.push({type:"contact",icon:"☷",title:c.name,sub:c.role||c.category||"",hub:"records",view:"contacts",id:c.id});
    });

    // Search documents
    (data.savedDocs||[]).forEach(d=>{
      const name=(d.fileName||d.category||"Document");
      if(name.toLowerCase().includes(ql)||(d.rawText||"").toLowerCase().includes(ql))
        results.data.push({type:"document",icon:"📄",title:name,sub:d.category||"",hub:"records",view:"documents",id:d.id});
    });

    // Search medications
    getMedSchedule(true).medications.forEach(m=>{
      if((m.name||"").toLowerCase().includes(ql)||(m.dosage||"").toLowerCase().includes(ql))
        results.data.push({type:"medication",icon:"💊",title:m.name+(m.dosage?" "+m.dosage:""),sub:m.discontinued?"Discontinued":"Active",hub:"records",view:"medadmin",id:m.id});
    });

    // Search messages
    (data.messages||[]).slice(0,50).forEach(m=>{
      if((m.text||"").toLowerCase().includes(ql)||(m.from||"").toLowerCase().includes(ql))
        results.data.push({type:"message",icon:"✉",title:m.from||"",sub:(m.text||"").slice(0,80),date:m.timestamp,hub:"team",view:"messages",id:m.id});
    });

    // Search POA decisions
    (data.poaDecisions||[]).forEach(d=>{
      if((d.description||"").toLowerCase().includes(ql)||(d.type||"").toLowerCase().includes(ql)||(d.reasoning||"").toLowerCase().includes(ql))
        results.data.push({type:"poa",icon:"⚖",title:(d.type||"Decision")+": "+(d.description||"").slice(0,60),sub:d.date,hub:"care",view:"poa-decisions",id:d.id});
    });

    // Search expenses
    (data.expenses||[]).forEach(e=>{
      if((e.description||"").toLowerCase().includes(ql)||(e.payee||"").toLowerCase().includes(ql)||(e.category||"").toLowerCase().includes(ql))
        results.data.push({type:"expense",icon:"$",title:e.description||"Expense",sub:"$"+(e.amount||0)+" — "+e.date,hub:"records",view:"expenses",id:e.id});
    });

    // Search self-reports
    (data.selfReports||[]).slice(0,30).forEach(r=>{
      if((r.text||"").toLowerCase().includes(ql)||(r.mood||"").toLowerCase().includes(ql))
        results.data.push({type:"self-report",icon:"🗣",title:(r.mood||r.type||"Report"),sub:(r.text||"").slice(0,80),date:r.timestamp,hub:"team",view:"selfreport",id:r.id});
    });

    return results;
  };
  const persistAuditTipToVault=()=>{ const t=auditTipRef.current; if(t&&t.seq){ setData(p=>((p.settings&&p.settings.auditTip&&p.settings.auditTip.seq>=t.seq)?p:{...p,settings:{...p.settings,auditTip:{seq:t.seq,hash:t.hash}}})); } };
  const lock=()=>{persistAuditTipToVault();if(rKeyRef.current&&!clientScopedRef.current){try{writeProjection(data,rKeyRef.current)}catch{}}hipaaAudit("logout","Session locked","");dekRef.current=null;auditKeyRef.current=null;rKeyRef.current=null;clientScopedRef.current=false;_scopedWriteLock=false;setClientScoped(false);_mediaCache.clear();setAuditEntries([]);setSyncPasscode("");setAuthed(false);setAuthMode(null);setPc("");navHub("today")};

  // Sync reminder & forced lock
  const SYNC_WARN_DAYS=7;const SYNC_LOCK_DAYS=14;const SYNC_LOCK_ACTIONS=50;
  const getSyncAge=()=>{const ls=(data._sync&&data._sync.lastSync);if(!ls)return{days:0,actions:0,neverSynced:true};const d=Math.floor((Date.now()-new Date(ls).getTime())/86400000);const actionsSince=(data.log||[]).filter(l=>new Date(l.time)>new Date(ls)).length;return{days:d,actions:actionsSince,neverSynced:false}};
  const checkSyncLock=()=>{const s=getSyncAge();if(s.neverSynced)return false;return s.days>=SYNC_LOCK_DAYS||s.actions>=SYNC_LOCK_ACTIONS};
  const getSyncWarning=()=>{const s=getSyncAge();if(s.neverSynced)return null;if(s.days>=SYNC_LOCK_DAYS||s.actions>=SYNC_LOCK_ACTIONS)return"locked";if(s.days>=SYNC_WARN_DAYS)return"warn";return null};
  const activeDom=DOMAINS.find(d=>d.key===view);
  const activeData=activeDom?data.domains[activeDom.key]:null;

  /* ══════════ AUTH ══════════ */
  const tryAuth=async()=>{
    // Rate limiting
    if(Date.now()<authLockUntil){setPcErr(true);return}
    if(authAttempts>=MAX_AUTH_ATTEMPTS){const lockTime=Math.pow(2,Math.min(authAttempts-MAX_AUTH_ATTEMPTS+1,6))*1000;setAuthLockUntil(Date.now()+lockTime);setPcErr(true);setPc("");return}
    // Try v3 (IndexedDB) first, migrate v2 if needed
    await migrateV2ToV3();
    const keysObj=loadWrappedKeys();
    // Vault may live as the legacy blob, an A/B snapshot, or a WAL pointer — check all before concluding eviction
    const legacyBlob=await loadVaultData();
    const hasVault=!!legacyBlob||!!(await idbGet(VAULT_STORE,"walmeta").catch(()=>null))||!!(await idbGet(VAULT_STORE,"snapA").catch(()=>null))||!!(await idbGet(VAULT_STORE,"snapB").catch(()=>null));
    // Keys present but vault gone = eviction, not a bad passcode — route to recovery
    if(keysObj&&keysObj.wk&&!hasVault){setDataLossDetected(true);return}
    const vault=keysObj&&hasVault?{wk:keysObj.wk}:null;
    if(!vault){
      // Legacy migration: try plaintext data
      const legacy=loadLegacyData();
      if(legacy){
        const s=legacy.settings||{};
        if(pc===s.caregiverPasscode||pc===s.clientPasscode){
          // Migrate to vault
          const mode=pc===s.caregiverPasscode?"caregiver":"client";
          const dek=await generateDEK();
          const cgPw=s.caregiverPasscode||"1234";const clPw=s.clientPasscode||"0000";
          // Remove plaintext passcodes from data
          const cleanData={...legacy,settings:{...legacy.settings}};
          delete cleanData.settings.caregiverPasscode;delete cleanData.settings.clientPasscode;
          const wk={c:await wrapDEK(dek,cgPw),r:await wrapDEK(dek,clPw)};
          saveWrappedKeys(wk);
          await saveVaultData(await encryptWithDEK(cleanData,dek));
          clearLegacyData();await requestPersistentStorage();
          dekRef.current=dek;
        // Derive separate audit key and load audit log from IndexedDB
        try{
          const aKey=await deriveAuditKey(pc);
          auditKeyRef.current=aKey;
          const entries=await readAuditLog(aKey,500);
          setAuditEntries(entries);
          const cnt=await getAuditCount();
          const si=await getStorageEstimate();setStorageInfo(si);
          setAuditCount(cnt);
        }catch(e){console.error("Audit key derivation failed:",e)}setData(cleanData);setAuthed(true);setAuthMode(mode);setPcErr(false);setAuthAttempts(0);
          flash("Data migrated to encrypted storage.");return;
        }
      }
      setPcErr(true);setPc("");setAuthAttempts(p=>p+1);return;
    }
    // Unwrap the DEK, then load snapshot + replay the WAL. With MFA enabled, the caregiver path needs a 2nd factor.
    const mfaOn=!!(keysObj.mfa&&keysObj.mfa.enabled&&getMfaKeyEntries(keysObj).length>0);
    // Client passcode is always single-factor (the care recipient is not a professional role).
    if(vault.wk.r){ try{
      if(vault.wk.clientScope==="r"){ // client wrap holds DEK_R only → cryptographically scoped session
        const rr=await unwrapDEK(vault.wk.r,pc);
        await finishClientScopedUnlock(rr.dek,pc); return;
      }
      const r=await unwrapDEK(vault.wk.r,pc);
      if(r.wasLegacy){try{const ko=loadWrappedKeys();if(ko&&ko.wk){ko.wk.r=await wrapDEK(r.dek,pc);saveWrappedKeys(ko.wk);}}catch{}}
      // Lazy migration: a legacy client wrap holds the FULL key. If the household tier is restricted and the
      // R key exists (a caregiver has unlocked since the upgrade), permanently downgrade this wrap to DEK_R
      // and continue as a scoped session — the last time this passcode ever touches the full key.
      try{ const ko=loadWrappedKeys();
        if(ko&&ko.wk&&ko.wk.rUnderF){
          const rKey=b64dec(await decryptWithDEK(ko.wk.rUnderF,r.dek));
          const projProbe=await readProjection(rKey);
          const tier=(projProbe&&projProbe.settings&&projProbe.settings.clientTier)||"client-restricted";
          if(projProbe&&tier==="client-restricted"){ // only downgrade onto an existing projection
            ko.wk.r=await wrapDEK(rKey,pc); ko.wk.clientScope="r"; saveWrappedKeys(ko.wk);
            await finishClientScopedUnlock(rKey,pc); return;
          }
        }
      }catch(e){console.error("Client scope migration failed (continuing full):",e)}
      await finishUnlock(r.dek,"client",pc); return; }catch{} }
    if(mfaOn){ // caregiver login requires passkey or recovery code — collect the 2nd factor on a dedicated screen
      setMfaPending({pc}); setMfaError(""); setMfaShowRecovery(false); setRecoveryInput(""); return;
    }
    // Non-MFA caregiver path (passcode only)
    try{ const r=await unwrapDEK(vault.wk.c,pc);
      if(r.wasLegacy){try{const ko=loadWrappedKeys();if(ko&&ko.wk){ko.wk.c=await wrapDEK(r.dek,pc);saveWrappedKeys(ko.wk);}}catch(e){console.error("KDF upgrade failed (non-fatal):",e)}}
      await finishUnlock(r.dek,"caregiver",pc); return;
    }catch{}
    setPcErr(true);setPc("");setAuthAttempts(p=>p+1);
  };
  // Shared post-unwrap routine: load vault via snapshot+WAL, seed refs, load audit log, verify chain.
  const finishUnlock=async(dek,mode,pc)=>{
    _scopedWriteLock=false;clientScopedRef.current=false;setClientScoped(false);
    const loaded=await loadVaultV4(dek);
    if(!loaded){setDataLossDetected(true);return false} // every slot failed to decrypt → treat as data loss
    dekRef.current=dek;
    seqRef.current=loaded.maxSeq;
    lastCkptSeqRef.current=loaded.baseSeq;
    ckptSlotRef.current=loaded.baseSlot==="snapB"?"snapA":"snapB";
    prevPersistedRef.current=loaded.state;
    try{const aKey=await deriveAuditKey(pc);auditKeyRef.current=aKey;const aKeyLegacy=await deriveAuditKey(pc,KDF_ITER_LEGACY);const entries=await readAuditLog([aKey,aKeyLegacy],500);setAuditEntries(entries);const cnt=await getAuditCount();setAuditCount(cnt);const si=await getStorageEstimate();setStorageInfo(si);const chained=entries.filter(e=>typeof e.seq==="number"&&e.hash);if(chained.length){const last=chained.sort((a,b)=>a.seq-b.seq)[chained.length-1];auditTipRef.current={seq:last.seq,hash:last.hash}}const cs=await verifyAuditChain(entries,(loaded.state.settings&&loaded.state.settings.auditTip)||null);setAuditChainStatus(cs);if(cs.status==="ok"&&cs.tip)saveAuditTip(cs.tip.seq,cs.tip.hash);}catch(e){console.error("Audit key derivation failed:",e)}
    if(loaded.state.settings){ const sv=loaded.state.settings.schemaVersion; if(sv==null){loaded.state.settings.schemaVersion=SCHEMA_VERSION} else if(sv>SCHEMA_VERSION){setNewerSchema(true)} } // newer build wrote this vault → warn, don't clobber
    // ── Cryptographic role scoping: derive (or create) the restricted-zone key, ingest any client-written
    //    self-reports from the encrypted outbox, and refresh the client projection. ──
    let stateToSet=loaded.state;
    try{
      const rKey=await ensureRKey(dek); rKeyRef.current=rKey;
      const obStatus=await outboxStatus();
      if(obStatus.present&&obStatus.oversized){
        setOutboxOversized(obStatus.bytes||0); // never decrypt/parse it — surface for review in Security & Integrity
        hipaaAudit("security","Oversized client outbox quarantined ("+mb(obStatus.bytes||0)+" MB) — not ingested","security");
      }
      const outbox=(obStatus.present&&!obStatus.oversized)?await readOutbox(rKey):[];
      if(outbox.length){
        const existing=new Set((stateToSet.selfReports||[]).map(r=>String(r.id)));
        const incoming=outbox.slice(0,200).map(sanitizeOutboxReport).filter(r=>r&&!existing.has(String(r.id))).map(r=>({...r,origin:"client"})); // strict whitelist; chain fields stripped; origin force-set
        if(incoming.length){
          stateToSet={...stateToSet, selfReports:[...incoming,...(stateToSet.selfReports||[])]};
          hipaaAudit("import",`Ingested ${incoming.length} client self-report(s) from secure outbox`,"self_reports");
        }
        // Outbox is NOT cleared here: the ingested reports persist via the normal WAL diff (baseline stays
        // loaded.state), and the next crash-safe checkpoint clears it. Re-ingestion is deduped by id, so a
        // crash before checkpoint loses nothing.
      }
      // Chain any unchained client reports (fresh ingestions and merge-imported ones), then verify the chain.
      try{ const cr=await chainClientReports(stateToSet); stateToSet=cr.state; }catch(e){console.error("Self-report chaining failed:",e)}
      try{ const srv=await verifySrChain(stateToSet.selfReports,(stateToSet.settings&&stateToSet.settings.selfReportTip)||null); setSrChainStatus(srv);
        if(srv.status==="broken"||srv.status==="truncated"){ hipaaAudit("security","Client self-report chain verification FAILED ("+srv.status+(srv.at?(" at #"+srv.at):"")+") — possible alteration or removal of client updates","security"); }
      }catch{}
      await writeProjection(stateToSet,rKey);
    }catch(e){console.error("Role-scope key setup failed (non-fatal):",e)}
    setData(stateToSet);setAuthed(true);setAuthMode(mode);setPcErr(false);setAuthAttempts(0);
    scheduleGc(stateToSet); // sweep orphaned blobs from prior sessions during idle time, off the unlock paint path
    hipaaAudit("login","Successful "+mode+" authentication","");
    return true;
  };

  // ── Scoped client unlock: this session holds ONLY DEK_R. It reads the encrypted projection, renders through
  //    the existing restricted views (a fresh skeleton supplies empty private roots so nothing crashes), and can
  //    write self-reports to the encrypted outbox. It cannot decrypt the vault, the WAL, the audit log, or
  //    private-zone media — and never writes any of them. ──
  const finishClientScopedUnlock=async(rKey,pc)=>{
    const proj=await readProjection(rKey);
    if(!proj){setPcErr(true);setPc("");setAuthAttempts(p=>p+1);return false}
    const skeleton=initState((proj.settings&&proj.settings.stateCode)||"");
    delete skeleton.settings.caregiverPasscode;delete skeleton.settings.clientPasscode;
    const merged={...skeleton,...proj,domains:{...skeleton.domains,...(proj.domains||{})},settings:{...skeleton.settings,...(proj.settings||{})}};
    dekRef.current=rKey;rKeyRef.current=rKey;clientScopedRef.current=true;_scopedWriteLock=true;setClientScoped(true);
    prevPersistedRef.current=merged;
    setData(merged);setAuthed(true);setAuthMode("client");setPcErr(false);setAuthAttempts(0);
    try{ setSrChainStatus(await verifySrChain(merged.selfReports,(merged.settings&&merged.settings.selfReportTip)||null)); }catch{}
    return true;
  };

  const mfaUnlockPasskey=async()=>{
    if(!mfaPending)return; const pc=mfaPending.pc; const ko=loadWrappedKeys();
    const entries=getMfaKeyEntries(ko);
    if(!ko||!ko.mfa||!entries.length){setMfaError("MFA configuration is missing.");return}
    setMfaBusy(true);setMfaError("");
    try{
      const {credentialId, prfOutput}=await mfaAssertPrf(entries.map(e=>e.credentialId), ko.mfa.prfSalt);
      const entry=entries.find(e=>e.credentialId===credentialId)||entries[0]; // the authenticator chose which key answered
      const dek=await unwrapWithPasskey(entry, pc, prfOutput);
      setMfaPending(null);
      await finishUnlock(dek,"caregiver",pc);
    }catch(e){
      const msg=(e&&e.message&&/PRF/i.test(e.message))?e.message:"Couldn't unlock with that passkey and passcode. Try again, use your backup passkey, or use a recovery code.";
      setMfaError(msg); setAuthAttempts(p=>p+1);
    }finally{setMfaBusy(false)}
  };
  // ── MFA: unlock with recovery code (one-time → regenerates a fresh code on success) ──
  const mfaUnlockRecovery=async()=>{
    if(!mfaPending)return; const pc=mfaPending.pc; const ko=loadWrappedKeys();
    if(!ko||!ko.wk.cRecovery){setMfaError("No recovery code is configured.");return}
    setMfaBusy(true);setMfaError("");
    try{
      const dek=await unwrapWithRecovery(ko.wk.cRecovery, pc, normalizeRecoveryCode(recoveryInput));
      setMfaPending(null); setRecoveryInput("");
      const okk=await finishUnlock(dek,"caregiver",pc);
      if(okk){ // consume the one-time code: issue and persist a new one, then surface it
        try{ const code=genRecoveryCode(); const cRecovery=await buildRecoveryWrap(dek,pc,code); const k2=loadWrappedKeys(); k2.wk.cRecovery=cRecovery; saveWrappedKeys(k2.wk); setNewRecoveryCode(code); hipaaAudit("auth","Logged in via recovery code; new code issued","security"); }catch(e){console.error("Recovery regen failed:",e)}
      }
    }catch(e){ setMfaError("That recovery code didn't work with this passcode."); setAuthAttempts(p=>p+1); }
    finally{setMfaBusy(false)}
  };
  // ── MFA enrollment (opt-in, professional roles) ──
  const PROFESSIONAL_ROLES=["admin","carepro"];
  const isProfessionalRole=PROFESSIONAL_ROLES.includes(role);
  const mfaEnabled=()=>{const ko=loadWrappedKeys();return !!(ko&&ko.mfa&&ko.mfa.enabled)};
  const startMfaEnroll=()=>{ setMfaEnrollErr("");setMfaEnrollPc("");setMfaCodeConfirmed(false);setMfaEnroll("passcode"); };
  const submitMfaEnroll=async()=>{
    setMfaEnrollErr("");
    const ko=loadWrappedKeys(); if(!ko||!ko.wk||!ko.wk.c){setMfaEnrollErr("Change your passcode first, then enable MFA.");return}
    if(!webauthnAvailable()){setMfaEnrollErr("This browser doesn't support passkeys (WebAuthn).");return}
    // Verify the caregiver passcode against the current single-factor wrap
    let dek=null; try{ const r=await unwrapDEK(ko.wk.c, mfaEnrollPc); dek=r.dek; }catch{ setMfaEnrollErr("That caregiver passcode is incorrect."); return; }
    setMfaEnroll("registering");
    try{
      const prfSalt=crypto.getRandomValues(new Uint8Array(32));
      const {credentialId, prfOutput}=await mfaRegisterPasskey(myName(), prfSalt);
      const code=genRecoveryCode();
      const {cMfa, cRecovery}=await buildMfaWraps(dek, mfaEnrollPc, prfOutput, code);
      // SAFETY: verify both new factors recover the exact DEK before we ever drop the passcode-only wrap
      const v1=await unwrapWithPasskey(cMfa, mfaEnrollPc, prfOutput);
      const v2=await unwrapWithRecovery(cRecovery, mfaEnrollPc, code);
      const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
      if(!same(v1,dek)||!same(v2,dek)) throw new Error("Verification of the new keys failed — no changes were made.");
      setMfaEnrollPrepared({credentialId, prfSalt:b64enc(prfSalt), cMfa, cRecovery, code});
      setMfaEnroll("showcode");
    }catch(e){ setMfaEnrollErr(e&&e.message?e.message:"Passkey setup failed or was cancelled."); setMfaEnroll("passcode"); }
  };
  const confirmMfaEnroll=()=>{
    const p=mfaEnrollPrepared; if(!p)return;
    const ko=loadWrappedKeys();
    const newWk={mfaKeys:[{credentialId:p.credentialId, ps:p.cMfa.ps, hs:p.cMfa.hs, blob:p.cMfa.blob}], cRecovery:p.cRecovery, ...(ko.wk.rUnderF?{rUnderF:ko.wk.rUnderF}:{}), ...(ko.wk.clientScope?{clientScope:ko.wk.clientScope}:{}), r:ko.wk.r}; // drop passcode-only caregiver wrap; carry zone-scope keys forward
    saveWrappedKeys(newWk, {enabled:true, role, prfSalt:p.prfSalt, enrolledAt:new Date().toISOString()});
    setData(prev=>({...prev, settings:{...prev.settings, mfa:{enabled:true, enrolledAt:new Date().toISOString(), role}}}));
    hipaaAudit("security","MFA (passkey) enabled for professional role","security");
    setMfaEnroll(null); setMfaEnrollPrepared(null); setMfaEnrollPc(""); flash("Multi-factor authentication is now on. Keep your recovery code safe.");
  };
  // Register an additional (backup) passkey — e.g., a hardware key kept in a safe. Requires the existing factor to prove the passcode.
  const startAddPasskey=()=>{ setMfaEnrollErr("");setMfaAddPc("");setMfaAddPasskey(true); };
  const submitAddPasskey=async()=>{
    setMfaEnrollErr(""); const pc=mfaAddPc; const ko=loadWrappedKeys(); const entries=getMfaKeyEntries(ko);
    if(!ko||!ko.mfa||!entries.length){setMfaEnrollErr("MFA isn't enabled.");return}
    if(!webauthnAvailable()){setMfaEnrollErr("This browser doesn't support passkeys.");return}
    setMfaAddBusy(true);
    try{
      // Prove the passcode by unlocking an EXISTING passkey with it (one tap), so the new wrap can't be built under a wrong passcode.
      const a=await mfaAssertPrf(entries.map(e=>e.credentialId), ko.mfa.prfSalt);
      const cur=entries.find(e=>e.credentialId===a.credentialId)||entries[0];
      const dek=await unwrapWithPasskey(cur, pc, a.prfOutput);
      // Register the NEW passkey (second tap) and wrap the DEK under passcode + its PRF
      const prfSaltBytes=b64dec(ko.mfa.prfSalt);
      const reg=await mfaRegisterPasskey(myName(), prfSaltBytes);
      const wrap=await buildPasskeyWrap(dek, pc, reg.prfOutput);
      const entry={credentialId:reg.credentialId, ps:wrap.ps, hs:wrap.hs, blob:wrap.blob};
      const v=await unwrapWithPasskey(entry, pc, reg.prfOutput); const same=(x,y)=>x.length===y.length&&x.every((b,i)=>b===y[i]);
      if(!same(v,dek)) throw new Error("Verification failed — no changes made.");
      const k2=loadWrappedKeys(); const list=getMfaKeyEntries(k2); list.push(entry);
      saveWrappedKeys({mfaKeys:list, ...(k2.wk.cRecovery?{cRecovery:k2.wk.cRecovery}:{}), ...(k2.wk.rUnderF?{rUnderF:k2.wk.rUnderF}:{}), ...(k2.wk.clientScope?{clientScope:k2.wk.clientScope}:{}), r:k2.wk.r}, {...k2.mfa, enabled:true});
      hipaaAudit("security","Backup passkey registered","security");
      setMfaAddPasskey(false); setMfaAddPc(""); flash("Backup passkey registered. You can now remove the paper recovery code if you wish.");
    }catch(e){ setMfaEnrollErr(e&&e.message?e.message:"Couldn't add the passkey. Confirm the passcode and tap an existing passkey, then the new one."); }
    finally{setMfaAddBusy(false)}
  };
  // Advanced: drop the printed recovery code once a second passkey exists (closes the paper insider-threat path).
  const removeRecoveryCode=async()=>{
    const ko=loadWrappedKeys(); const entries=getMfaKeyEntries(ko);
    if(entries.length<2){flash("Register a backup passkey first — otherwise losing your passkey would lock the vault.");return}
    if(!window.confirm("Remove the paper recovery code? After this, only your registered passkeys can unlock the vault. If you lose ALL of them, the data cannot be recovered."))return;
    saveWrappedKeys({mfaKeys:entries, ...(ko.wk.rUnderF?{rUnderF:ko.wk.rUnderF}:{}), ...(ko.wk.clientScope?{clientScope:ko.wk.clientScope}:{}), r:ko.wk.r}, {...ko.mfa, enabled:true}); // no cRecovery; zone-scope keys carried forward
    hipaaAudit("security","Recovery code removed (passkey-only)","security");
    flash("Recovery code removed. Your registered passkeys are now the only way in.");
  };
  const submitMfaDisable=async()=>{
    setMfaEnrollErr("");
    const ko=loadWrappedKeys(); const entries=getMfaKeyEntries(ko); if(!ko||!ko.mfa||!entries.length){setMfaDisable(false);return}
    try{
      const a=await mfaAssertPrf(entries.map(e=>e.credentialId), ko.mfa.prfSalt);
      const entry=entries.find(e=>e.credentialId===a.credentialId)||entries[0];
      const dek=await unwrapWithPasskey(entry, mfaDisablePc, a.prfOutput); // proves passcode AND passkey
      const newCWrap=await wrapDEK(dek, mfaDisablePc);                  // restore passcode-only caregiver wrap
      const chk=await unwrapDEK(newCWrap, mfaDisablePc); if(!chk||!chk.dek) throw new Error("verify failed");
      saveWrappedKeys({c:newCWrap, ...(ko.wk.rUnderF?{rUnderF:ko.wk.rUnderF}:{}), ...(ko.wk.clientScope?{clientScope:ko.wk.clientScope}:{}), r:ko.wk.r}, null);                   // null clears MFA metadata; zone-scope keys carried forward
      setData(prev=>({...prev, settings:{...prev.settings, mfa:{enabled:false}}}));
      hipaaAudit("security","MFA disabled","security");
      setMfaDisable(false); setMfaDisablePc(""); flash("Multi-factor authentication turned off.");
    }catch(e){ setMfaEnrollErr("Couldn't disable — confirm the caregiver passcode and tap your passkey."); }
  };
  const regenerateRecoveryCode=async(pc)=>{
    if(!dekRef.current)return;
    try{ const code=genRecoveryCode(); const cRecovery=await buildRecoveryWrap(dekRef.current, pc, code); const ko=loadWrappedKeys(); ko.wk.cRecovery=cRecovery; saveWrappedKeys(ko.wk); setNewRecoveryCode(code); hipaaAudit("security","Recovery code regenerated","security"); }
    catch(e){ flash("Couldn't regenerate the recovery code."); }
  };

  const completeSetup=async()=>{
    if(!setupCgPw.trim()||setupCgPw.length<4){setSetupErr("Caregiver passcode must be at least 4 characters.");return}
    if(!setupClPw.trim()||setupClPw.length<4){setSetupErr("Client passcode must be at least 4 characters.");return}
    if(setupCgPw===setupClPw){setSetupErr("Caregiver and client passcodes must be different.");return}
    if(setupCgPw!==setupConfirm){setSetupErr("Passcodes don't match. Confirm your caregiver passcode.");return}
    await wipeAllLocalData(false); // clear any stale old-key snapshots/WAL/blobs/audit before the new vault is written
    const dek=await generateDEK();
    let seedData;
    if(recoveryData){
      // Restoring from a backup after browser eviction — keep the user's data
      seedData=recoveryData;
      if(!seedData.settings)seedData.settings={};
      if(!seedData.settings.deviceId)seedData.settings.deviceId=genDeviceId();
    }else{
      seedData=initState((data.settings&&data.settings.stateCode)||"");
    }
    // Restore any photos/voice from the backup into the blob store under the freshly-generated key
    const recoveredBlobs=seedData.__recoveredBlobs||null; if(seedData.__recoveredBlobs)delete seedData.__recoveredBlobs;
    delete seedData.settings.caregiverPasscode;delete seedData.settings.clientPasscode;
    // Cryptographic role scoping from day one: DEK_R wrapped under DEK_F; client passcode wraps R-only
    // for the supported (restricted) tier, or the full key for the independent tier.
    const rKey=crypto.getRandomValues(new Uint8Array(32));
    const tier=(seedData.settings&&seedData.settings.clientTier)||"client-restricted";
    if(recoveredBlobs){ const rRefs=collectBlobRefs(projectClientState(seedData)); for(const id in recoveredBlobs){ try{ await putBlob(recoveredBlobs[id], rRefs.has(id)?rKey:dek, id); }catch{} } }
    const wk={c:await wrapDEK(dek,setupCgPw),
              r:tier==="client-restricted"?await wrapDEK(rKey,setupClPw):await wrapDEK(dek,setupClPw),
              rUnderF:await encryptWithDEK(b64enc(rKey),dek)};
    if(tier==="client-restricted")wk.clientScope="r";
    const encrypted=await encryptWithDEK(seedData,dek);
    saveWrappedKeys(wk);
    await saveVaultData(encrypted);
    await writeProjection(seedData,rKey);
    await requestPersistentStorage();
    dekRef.current=dek;rKeyRef.current=rKey;setData(seedData);setAuthed(true);setAuthMode("caregiver");
    setSetupMode(false);setDataLossDetected(false);
    if(recoveryData){hipaaAudit("create","Vault restored from backup after data loss","all");setRecoveryData(null)}
    else{setShowFirstWin(true)} // fresh setup → personalize before showing the dashboard
  };

  // First Win — capture the care recipient's name (+ optional doctor) and personalize the dashboard.
  const completeFirstWin=(skip)=>{
    if(!skip){
      const name=sanitizeText(fwName,80).trim();
      const docName=sanitizeText(fwDocName,80).trim();
      const docPhone=sanitizeText(fwDocPhone,50).trim();
      setData(p=>{
        let next={...p};
        if(name){
          const team=(p.settings&&p.settings.team)||null;
          next={...next,settings:{...p.settings,clientName:name,team:team?{...team,clientName:team.clientName||name}:team}};
        }
        if(docName||docPhone){
          const contact={...EMPTY_CONTACT,name:docName||"Primary doctor",role:"Primary Care Physician",phone:docPhone,category:"medical",id:nextId(),notes:[],customFields:[]};
          next={...next,contacts:[...(next.contacts||[]),contact]};
        }
        return next;
      });
    }
    setShowFirstWin(false);setFwName("");setFwDocName("");setFwDocPhone("");
  };
  const clientDisplayName=()=>((data.settings&&data.settings.team&&data.settings.team.clientName))||((data.settings&&data.settings.clientName))||"";

  // Recovery screen — browser evicted the local vault but wrapped keys survived
  if(dataLossDetected&&!recoveryData) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card" style={{maxWidth:420}}>
      <div style={{fontSize:38,marginBottom:10}}>⚠️</div>
      <h1 className="auth-title">{recoveryReason==="forgot"?"Can't sign in?":"Your local data was cleared"}</h1>
      {recoveryReason==="forgot"?(<p className="auth-sub" style={{textAlign:"left",lineHeight:1.5}}>If you've forgotten the passcodes for this browser, you have two options: restore from an encrypted backup file (you'll need that backup's password), or erase this browser's stored data and set up again. <strong>Without a backup, erased data cannot be recovered.</strong></p>):(<p className="auth-sub" style={{textAlign:"left",lineHeight:1.5}}>Your device's browser appears to have cleared Care Guardian's stored data. This can happen on iPhones and iPads when the device runs low on storage. <strong>Your information is not lost if you have a backup file.</strong></p>)}
      <div className="recovery-box">
        <p className="recovery-label">Restore from your encrypted backup</p>
        <input type="password" value={recoveryPw} onChange={e=>{setRecoveryPw(e.target.value);setRecoveryErr("")}} placeholder="Backup passcode" className="auth-input" style={{marginBottom:8}}/>
        <input ref={recoveryFileRef} type="file" accept=".care,.json" style={{display:"none"}} onChange={handleRecoveryFile}/>
        <button onClick={()=>{if(!recoveryPw.trim()){setRecoveryErr("Enter the passcode you used when creating this backup.");return}recoveryFileRef.current&&recoveryFileRef.current.click()}} className="auth-btn">Choose backup file (.care)</button>
        {recoveryErr&&<p className="auth-error">{recoveryErr}</p>}
      </div>
      <p className="auth-footer" style={{marginTop:16}}>No backup file? You can start fresh — but previously stored information cannot be recovered without a backup.</p>
      <button onClick={async()=>{if(recoveryReason==="forgot"&&!window.confirm("This permanently erases ALL Care Guardian data stored in this browser. Without a backup file, it cannot be recovered. Erase and start over?"))return;await wipeAllLocalData(true);setRecoveryReason("dataloss");setDataLossDetected(false);setSetupMode(true)}} className="text-btn">{recoveryReason==="forgot"?"Erase this browser's data & start over":"Start fresh instead"}</button>
    </div></div>
  </>);

  // Recovery: returning user after eviction — straight to passcode, no first-run onboarding.
  if(recoveryData) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card" style={{maxWidth:380}}>
      <div style={{fontSize:38,marginBottom:10}}>♻️</div>
      <h1 className="auth-title">Set new passcodes</h1>
      <p className="auth-sub">Your backup was decrypted. Create new passcodes to secure your restored data on this device.</p>
      <div className="recovery-banner">✓ Backup loaded — your records will be restored once you set passcodes.</div>
      <input type="password" value={setupCgPw} onChange={e=>{setSetupCgPw(e.target.value);setSetupErr("")}} placeholder="Caregiver passcode (full access)" className="auth-input" style={{marginBottom:8}}/>
      <input type="password" value={setupConfirm} onChange={e=>{setSetupConfirm(e.target.value);setSetupErr("")}} placeholder="Confirm caregiver passcode" className="auth-input" style={{marginBottom:8}}/>
      <input type="password" value={setupClPw} onChange={e=>{setSetupClPw(e.target.value);setSetupErr("")}} placeholder="Client passcode (read-only)" className="auth-input" style={{marginBottom:8}}/>
      {setupErr&&<p className="auth-error">{setupErr}</p>}
      <button onClick={completeSetup} className="auth-btn">Restore &amp; Enter</button>
      <p className="auth-footer">Min 4 characters each.</p>
    </div></div>
  </>);

  // First-run onboarding wizard
  if(setupMode){
    const isStandalone=(typeof window!=="undefined")&&((window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true);
    const isIOS=(typeof navigator!=="undefined")&&(/iphone|ipad|ipod/i.test(navigator.userAgent)||(/Mac/.test(navigator.userAgent)&&navigator.maxTouchPoints>1));
    const step=(onbStep===1&&isStandalone)?2:onbStep; // skip install step if already installed
    const Dots=()=>(<div className="onb-dots">{[0,1,2].map(i=>(<span key={i} className={`onb-dot ${i===step?"onb-dot-on":""} ${i<step?"onb-dot-done":""}`}/>))}</div>);
    return(<>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div className="auth-wrap"><div className="auth-card onb-card">
        {step===0&&(<>
          <div className="onb-emoji">🛡️</div>
          <h1 className="auth-title">Your family's privacy comes first</h1>
          <p className="onb-body">Care Guardian does not use the cloud. We have no servers, and we can never see your data. Everything you type stays exactly where it belongs: <strong>right here on your device.</strong></p>
          <button onClick={()=>setOnbStep(isStandalone?2:1)} className="auth-btn">Get started</button>
          <Dots/>
        </>)}

        {step===1&&(<>
          <div className="onb-emoji">📲</div>
          <h1 className="auth-title">Lock down your records</h1>
          <p className="onb-body">Because your data is totally private, your web browser might clear it during routine maintenance. Saving Care Guardian to your home screen keeps your records safe and gives them more durable storage.</p>
          {deferredInstall&&!isIOS?(<>
            <button onClick={async()=>{try{deferredInstall.prompt();await deferredInstall.userChoice}catch{}finally{setDeferredInstall(null);setOnbStep(2)}}} className="auth-btn">Install Care Guardian</button>
          </>):isIOS?(<div className="onb-install">
            <div className="onb-step"><span className="onb-num">1</span><span>Tap the <strong>Share</strong> button in your browser's toolbar:</span></div>
            <div className="onb-share"><svg viewBox="0 0 50 56" width="34" height="38" aria-hidden="true"><path d="M25 3 L25 34" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"/><path d="M16 13 L25 3.5 L34 13" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 21 H9 a3 3 0 0 0 -3 3 V49 a3 3 0 0 0 3 3 H41 a3 3 0 0 0 3 -3 V24 a3 3 0 0 0 -3 -3 H37" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="onb-share-label">the square with an up-arrow</span></div>
            <div className="onb-step"><span className="onb-num">2</span><span>Scroll down and tap <strong>"Add to Home Screen."</strong></span></div>
            <div className="onb-step"><span className="onb-num">3</span><span>Tap <strong>Add</strong>, then open Care Guardian from your home screen.</span></div>
          </div>):(<div className="onb-install">
            <div className="onb-step"><span className="onb-num">1</span><span>Open your browser's menu (⋮ or the address bar).</span></div>
            <div className="onb-step"><span className="onb-num">2</span><span>Choose <strong>"Install"</strong> or <strong>"Add to Home Screen."</strong></span></div>
          </div>)}
          <div className="onb-nav">
            {!(deferredInstall&&!isIOS)&&<button onClick={()=>setOnbStep(2)} className="auth-btn">I've installed it — continue</button>}
            <button onClick={()=>setOnbStep(2)} className="text-btn">Skip for now, I'll do it later</button>
          </div>
          <Dots/>
        </>)}

        {step===2&&(<>
          <div className="onb-emoji">🔑</div>
          <h1 className="auth-title">Create your private key</h1>
          <p className="onb-body">Because we can't see your data, no one — not even us — can reset or recover your passcode. <strong>Please write it down and keep it somewhere safe.</strong></p>
          <label className="onb-field-label">Caregiver passcode <span className="onb-hint-inline">— full access, for you</span></label>
          <input type="password" value={setupCgPw} onChange={e=>{setSetupCgPw(e.target.value);setSetupErr("")}} placeholder="Caregiver passcode" className="auth-input onb-input" style={{marginBottom:8}}/>
          <input type="password" value={setupConfirm} onChange={e=>{setSetupConfirm(e.target.value);setSetupErr("")}} placeholder="Confirm caregiver passcode" className="auth-input onb-input" style={{marginBottom:14}}/>
          <label className="onb-field-label">Client passcode <span className="onb-hint-inline">— read-only, for the person being cared for</span></label>
          <input type="password" value={setupClPw} onChange={e=>{setSetupClPw(e.target.value);setSetupErr("")}} placeholder="Client passcode" className="auth-input onb-input" style={{marginBottom:8}}/>
          {setupErr&&<p className="auth-error">{setupErr}</p>}
          <button onClick={completeSetup} className="auth-btn">Create my private key</button>
          <button onClick={()=>setOnbStep(isStandalone?0:1)} className="text-btn">Back</button>
          <Dots/>
        </>)}
      </div></div>
    </>);
  }

  // Sync lock check
  if(authed&&checkSyncLock()&&!syncLocked){setSyncLocked(true)}
  if(authed&&syncLocked) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card" style={{maxWidth:400}}>
      <div style={{fontSize:38,marginBottom:10}}>📡</div>
      <h1 className="auth-title">Sync Required</h1>
      <p className="auth-sub">{"Your data hasn\'t been synced in over "+getSyncAge().days+" days, or you have "+getSyncAge().actions+" unsynced changes. Please sync now to protect your data and keep your team up to date."}</p>
      <button onClick={()=>{setSyncLocked(false);navHub("team");setTimeout(()=>nav("sync"),100)}} className="auth-btn">Open Sync</button>
      <p className="auth-footer">Your data exists only on this device until synced.</p>
    </div></div>
  </>);

  // MFA second-factor screen — caregiver passcode accepted, awaiting passkey or recovery code
  if(!authed && mfaPending) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card" style={{maxWidth:400}}>
      <div style={{fontSize:38,marginBottom:10}}>🔐</div>
      <h1 className="auth-title">Second step</h1>
      {!mfaShowRecovery?(<>
        <p className="auth-sub">Confirm it's you with your passkey to finish unlocking.</p>
        <button onClick={mfaUnlockPasskey} className="auth-btn" disabled={mfaBusy}>{mfaBusy?"Waiting for passkey…":"Unlock with passkey"}</button>
        {(loadWrappedKeys()&&loadWrappedKeys().wk&&loadWrappedKeys().wk.cRecovery)&&<p className="auth-footer"><a className="link-btn" onClick={()=>{setMfaError("");setMfaShowRecovery(true)}}>Use a recovery code instead</a></p>}
      </>):(<>
        <p className="auth-sub">Enter one of your recovery codes. It will be replaced with a new one after use.</p>
        <input type="text" value={recoveryInput} onChange={e=>{setRecoveryInput(e.target.value);setMfaError("")}} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" className="auth-input" autoCapitalize="characters" spellCheck={false}/>
        <button onClick={mfaUnlockRecovery} className="auth-btn" disabled={mfaBusy||!recoveryInput.trim()}>{mfaBusy?"Checking…":"Unlock with recovery code"}</button>
        <p className="auth-footer"><a className="link-btn" onClick={()=>{setMfaError("");setMfaShowRecovery(false)}}>Use my passkey instead</a></p>
      </>)}
      {mfaError&&<p className="auth-error" style={{marginTop:12}}>{mfaError}</p>}
      <p className="auth-footer" style={{marginTop:14}}><a className="link-btn" onClick={()=>{setMfaPending(null);setPc("");setMfaError("")}}>Cancel</a></p>
    </div></div>
  </>);

  if(!authed) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card">
      <div style={{fontSize:38,marginBottom:10}}>🛡</div>
      <h1 className="auth-title">Care Guardian</h1>
      <p className="auth-sub">Enter your passcode.<br/><span className="auth-note">Data is encrypted at rest on this device.</span></p>
      <input type="password" value={pc} onChange={e=>{setPc(e.target.value);setPcErr(false)}} onKeyDown={e=>e.key==="Enter"&&tryAuth()} placeholder="Passcode" className={`auth-input ${pcErr?"auth-input-err":""}`}/>
      {pcErr&&<p className="auth-error">{authAttempts>=MAX_AUTH_ATTEMPTS?"Too many attempts. Please wait.":"Incorrect passcode."}</p>}
      <button onClick={tryAuth} className="auth-btn" disabled={Date.now()<authLockUntil}>Enter</button>
      <p className="auth-footer"><a className="link-btn" onClick={()=>{setRecoveryReason("forgot");setDataLossDetected(true)}}>Forgot passcode?</a></p>
    </div></div>
  </>);

  /* ══════════ MODALS ══════════ */
  const ContactFormUI=()=>{const[f,setF]=useState({...contactForm.contact,customFields:[...(contactForm.contact.customFields||[])]});const[nfl,setNfl]=useState("");const upd=(k,v)=>setF(p=>({...p,[k]:v}));return(
    <div className="cf-overlay" onClick={()=>setContactForm(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="cf-title">{contactForm.mode==="edit"?"Edit Contact":"Add Contact"}</h2>
      <div className="cf-grid">
        <label className="cf-label">Name *<input value={f.name} onChange={e=>upd("name",e.target.value)} className="cf-input"/></label>
        <label className="cf-label">Role / Title<input value={f.role} onChange={e=>upd("role",e.target.value)} className="cf-input"/></label>
        <label className="cf-label">Organization<input value={f.org} onChange={e=>upd("org",e.target.value)} className="cf-input"/></label>
        <label className="cf-label">Category<select value={f.category} onChange={e=>upd("category",e.target.value)} className="cf-input">{CONTACT_CATS.map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}</select></label>
        <label className="cf-label">Phone<input value={f.phone} onChange={e=>upd("phone",e.target.value)} className="cf-input" type="tel"/></label>
        <label className="cf-label">Email<input value={f.email} onChange={e=>upd("email",e.target.value)} className="cf-input" type="email"/></label>
      </div>
      {f.customFields.length>0&&<div className="cf-custom-section"><h4 className="cf-custom-title">Custom Fields</h4>
        {f.customFields.map((cf,i)=>(<div key={i} className="cf-custom-row"><input value={cf.label} onChange={e=>{const c=[...f.customFields];c[i]={...c[i],label:e.target.value};setF(p=>({...p,customFields:c}))}} className="cf-input cf-custom-label" placeholder="Field name"/><input value={cf.value} onChange={e=>{const c=[...f.customFields];c[i]={...c[i],value:e.target.value};setF(p=>({...p,customFields:c}))}} className="cf-input cf-custom-value" placeholder="Value"/><button onClick={()=>setF(p=>({...p,customFields:p.customFields.filter((_,j)=>j!==i)}))} className="remove-sub">×</button></div>))}
      </div>}
      <div className="cf-add-field-row"><input value={nfl} onChange={e=>setNfl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&nfl.trim()){setF(p=>({...p,customFields:[...p.customFields,{label:nfl.trim(),value:""}]}));setNfl("")}}} className="cf-input" placeholder="New field name" style={{flex:1}}/><button onClick={()=>{if(nfl.trim()){setF(p=>({...p,customFields:[...p.customFields,{label:nfl.trim(),value:""}]}));setNfl("")}}} className="add-sub-btn">+ Field</button></div>
      <div className="cf-actions"><button disabled={!f.name.trim()} onClick={()=>saveContact(f,contactForm.id)} className="save-btn" style={{opacity:f.name.trim()?1:.4}}>{contactForm.mode==="edit"?"Save":"Add Contact"}</button><button onClick={()=>setContactForm(null)} className="cancel-btn">Cancel</button></div>
    </div></div>)};

  const ApptFormUI=()=>{const[f,setF]=useState(apptForm.appt);const upd=(k,v)=>setF(p=>({...p,[k]:v}));return(
    <div className="cf-overlay" onClick={()=>setApptForm(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
      <h2 className="cf-title">{apptForm.mode==="edit"?"Edit Appointment":"Add Appointment"}</h2>
      <label className="cf-label" style={{marginBottom:12}}>Title *<input value={f.title} onChange={e=>upd("title",e.target.value)} className="cf-input" placeholder="Dr. visit, Lab work, etc."/></label>
      <div className="cf-grid">
        <label className="cf-label">Date<input type="date" value={f.date} onChange={e=>upd("date",e.target.value)} className="cf-input"/></label>
        <label className="cf-label">Time<input type="time" value={f.time} onChange={e=>upd("time",e.target.value)} className="cf-input"/></label>
      </div>
      <label className="cf-label" style={{marginTop:12,marginBottom:12}}>Notes<textarea value={f.notes} onChange={e=>upd("notes",e.target.value)} className="notes-ta" rows={2}/></label>
      <div className="cf-actions">
        <button disabled={!f.title.trim()||!f.date} onClick={()=>saveAppt(f,apptForm.id)} className="save-btn" style={{opacity:f.title.trim()&&f.date?1:.4}}>Save</button>
        {apptForm.mode==="edit"&&<button onClick={()=>deleteAppt(apptForm.id)} className="cd-delete-btn">Delete</button>}
        <button onClick={()=>setApptForm(null)} className="cancel-btn">Cancel</button>
      </div>
    </div></div>)};

  const DomainEditModal=()=>{const[l,setL]=useState(editingDomain.label);const[d,setD]=useState(editingDomain.desc);
    const doSave=()=>{if(!l.trim())return;setData(p=>addLog({...p,domainOverrides:{...(p.domainOverrides||{}),[editingDomain.key]:{label:l.trim(),desc:d.trim()}}},editingDomain.key,`Renamed to "${l.trim()}"`));setEditingDomain(null)};
    return(<div className="cf-overlay" onClick={()=>setEditingDomain(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
      <h2 className="cf-title">Edit Category</h2>
      <label className="cf-label" style={{marginBottom:14}}>Name<input value={l} onChange={e=>setL(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSave()} className="cf-input"/></label>
      <label className="cf-label" style={{marginBottom:20}}>Description<textarea value={d} onChange={e=>setD(e.target.value)} className="notes-ta" rows={2}/></label>
      <div className="cf-actions"><button disabled={!l.trim()} onClick={doSave} className="save-btn">Save</button><button onClick={()=>setEditingDomain(null)} className="cancel-btn">Cancel</button></div>
    </div></div>)};

  const IncidentFormUI=()=>{const[f,setF]=useState(incidentForm.incident);const[incPhotos,setIncPhotos]=useState(incidentForm.incident.photos||[]);const upd=(k,v)=>setF(p=>({...p,[k]:v}));return(
    <div className="cf-overlay" onClick={()=>setIncidentForm(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="cf-title">{incidentForm.mode==="edit"?"Edit Incident":"Log Incident"}</h2>
      <div className="cf-grid">
        <label className="cf-label">Type<select value={f.type} onChange={e=>upd("type",e.target.value)} className="cf-input">{INCIDENT_TYPES.map(t=><option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}</select></label>
        <label className="cf-label">Severity<select value={f.severity} onChange={e=>upd("severity",e.target.value)} className="cf-input">{SEVERITY_LEVELS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        <label className="cf-label">Date<input type="date" value={f.date} onChange={e=>upd("date",e.target.value)} className="cf-input"/></label>
        <label className="cf-label">Time<input type="time" value={f.time} onChange={e=>upd("time",e.target.value)} className="cf-input"/></label>
      </div>
      <label className="cf-label" style={{marginBottom:10}}>What happened<textarea value={f.description} onChange={e=>upd("description",e.target.value)} className="notes-ta" rows={3} placeholder="Describe the incident…"/></label>
      <label className="cf-label" style={{marginBottom:10}}>Response / Action taken<textarea value={f.response} onChange={e=>upd("response",e.target.value)} className="notes-ta" rows={2} placeholder="What was done in response?"/></label>
      <div className="cf-grid">
        <label className="cf-label">Injuries (if any)<input value={f.injuries} onChange={e=>upd("injuries",e.target.value)} className="cf-input" placeholder="None, bruise, laceration…"/></label>
        <label className="cf-label">Provider notified<input value={f.providerNotified} onChange={e=>upd("providerNotified",e.target.value)} className="cf-input" placeholder="Dr. name, 911, none…"/></label>
      </div>
      <label className="cf-label">Photos</label>
      <div className="photo-attach-row">
        <button onClick={()=>incidentPhotoRef.current&&incidentPhotoRef.current.click()} type="button" className="edit-btn" style={{marginTop:0,fontSize:12}}>📷 Add photo{incPhotos.length>0?" ("+incPhotos.length+")":""}</button>
        <input ref={incidentPhotoRef} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>handlePhotoCapture(e,setIncPhotos)}/>
        {incPhotos.length>0&&<button onClick={()=>setIncPhotos([])} type="button" className="cancel-btn" style={{fontSize:11,padding:"4px 10px"}}>Clear</button>}
      </div>
      {incPhotos.length>0&&<div className="photo-preview-row" style={{marginBottom:8}}>{incPhotos.map((p,i)=>(<div key={i} className="photo-thumb"><img src={p} alt={"Photo "+(i+1)}/><button onClick={()=>setIncPhotos(prev=>prev.filter((_,j)=>j!==i))} className="photo-remove">×</button></div>))}</div>}
      <div className="cf-actions" style={{marginTop:12}}>
        <button disabled={!f.description.trim()} onClick={()=>{f.photos=incPhotos;saveIncident(f,incidentForm.id)}} className="save-btn" style={{opacity:f.description.trim()?1:.4}}>Save</button>
        {incidentForm.mode==="edit"&&<button onClick={()=>deleteIncident(incidentForm.id)} className="cd-delete-btn">Delete</button>}
        <button onClick={()=>setIncidentForm(null)} className="cancel-btn">Cancel</button>
      </div>
    </div></div>)};

  const ExpenseFormUI=()=>{const[f,setF]=useState(expenseForm.expense);const upd=(k,v)=>setF(p=>({...p,[k]:v}));return(
    <div className="cf-overlay" onClick={()=>setExpenseForm(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
      <h2 className="cf-title">{expenseForm.mode==="edit"?"Edit Expense":"Add Expense"}</h2>
      <div className="cf-grid">
        <label className="cf-label">Date<input type="date" value={f.date} onChange={e=>upd("date",e.target.value)} className="cf-input"/></label>
        <label className="cf-label">Amount ($)<input type="number" step="0.01" min="0" value={f.amount} onChange={e=>upd("amount",e.target.value)} className="cf-input" placeholder="0.00"/></label>
      </div>
      <label className="cf-label" style={{marginBottom:10}}>Category<select value={f.category} onChange={e=>upd("category",e.target.value)} className="cf-input">{EXPENSE_CATS.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
      <label className="cf-label" style={{marginBottom:10}}>Description<input value={f.description} onChange={e=>upd("description",e.target.value)} className="cf-input" placeholder="Pharmacy copay, aide hours, etc."/></label>
      <label className="cf-label" style={{marginBottom:10}}>Payee / Vendor<input value={f.payee} onChange={e=>upd("payee",e.target.value)} className="cf-input" placeholder="Walgreens, Home Instead, etc."/></label>
      <label className="cf-label" style={{marginBottom:10}}>Receipt / Reference<input value={f.receipt} onChange={e=>upd("receipt",e.target.value)} className="cf-input" placeholder="Receipt #, check #, confirmation…"/></label>
      <div className="cf-actions">
        <button disabled={!f.amount||!f.date} onClick={()=>saveExpense(f,expenseForm.id)} className="save-btn" style={{opacity:f.amount&&f.date?1:.4}}>Save</button>
        {expenseForm.mode==="edit"&&<button onClick={()=>deleteExpense(expenseForm.id)} className="cd-delete-btn">Delete</button>}
        <button onClick={()=>setExpenseForm(null)} className="cancel-btn">Cancel</button>
      </div>
    </div></div>)};

  const MedFormUI=()=>{const[f,setF]=useState(medForm.med);const toggleSlot=(s)=>setF(p=>({...p,timeSlots:p.timeSlots.includes(s)?p.timeSlots.filter(x=>x!==s):[...p.timeSlots,s]}));return(
    <div className="cf-overlay" onClick={()=>setMedForm(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
      <h2 className="cf-title">{medForm.mode==="edit"?"Edit Medication":"Add Medication to Schedule"}</h2>
      <label className="cf-label" style={{marginBottom:10}}>Medication Name<input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className="cf-input" placeholder="Donepezil"/></label>
      <label className="cf-label" style={{marginBottom:10}}>Dosage<input value={f.dosage} onChange={e=>setF(p=>({...p,dosage:e.target.value}))} className="cf-input" placeholder="10 mg"/></label>
      <label className="cf-label" style={{marginBottom:10}}>Time Slots</label>
      <div className="med-slot-row">{MED_TIME_SLOTS.map(s=>(<button key={s} onClick={()=>toggleSlot(s)} className={`cc-btn ${f.timeSlots.includes(s)?"cc-active":""}`}>{s}</button>))}</div>
      <label className="cf-label" style={{marginTop:12,marginBottom:10}}>Notes<input value={f.notes||""} onChange={e=>setF(p=>({...p,notes:e.target.value}))} className="cf-input" placeholder="Take with food, etc."/></label>
      <div className="cf-actions" style={{marginTop:8}}>
        <button disabled={!f.name.trim()||!f.timeSlots.length} onClick={()=>medForm.mode==="edit"?editMedInSchedule(f,medForm.id):addMedToSchedule(f)} className="save-btn" style={{opacity:f.name.trim()&&f.timeSlots.length?1:.4}}>Save</button>
        {medForm.mode==="edit"&&<button onClick={()=>{removeMedFromSchedule(medForm.id);setMedForm(null)}} className="cd-delete-btn">Remove</button>}
        <button onClick={()=>setMedForm(null)} className="cancel-btn">Cancel</button>
      </div>
    </div></div>)};

  const CreateTeamForm=()=>{const[tn,setTn]=useState("");const[cn,setCn]=useState("");const[mn,setMn]=useState((data.settings&&data.settings.deviceName)||"");const[mr,setMr]=useState("Primary Caregiver");return(
    <div className="team-form">
      <h4 className="sync-sub-title">Create Your Care Team</h4>
      <label className="cf-label">Team name<input value={tn} onChange={e=>setTn(e.target.value)} className="cf-input" placeholder="e.g., Mom's Care Team"/></label>
      <label className="cf-label">Who are you caring for?<input value={cn} onChange={e=>setCn(e.target.value)} className="cf-input" placeholder="e.g., Margaret Johnson"/></label>
      <label className="cf-label">Your name<input value={mn} onChange={e=>setMn(e.target.value)} className="cf-input" placeholder="e.g., David"/></label>
      <label className="cf-label">Your role<input value={mr} onChange={e=>setMr(e.target.value)} className="cf-input" placeholder="e.g., Primary Caregiver, Daughter, Aide"/></label>
      <div className="cf-actions" style={{marginTop:12}}><button onClick={()=>{if(!tn.trim()||!cn.trim()||!mn.trim()){flash("Please fill in all fields.");return}createTeam(tn,cn,mn,mr)}} className="save-btn">Create Team</button><button onClick={()=>setTeamSetupMode(null)} className="cancel-btn">Cancel</button></div>
    </div>)};
  const JoinTeamForm=()=>{const[mn,setMn]=useState((data.settings&&data.settings.deviceName)||"");const[mr,setMr]=useState("");const[rk,setRk]=useState("family");return(
    <div className="team-form">
      <h4 className="sync-sub-title">Join an Existing Team</h4>
      <label className="cf-label">Invite code<input value={joinCode} onChange={e=>setJoinCode(e.target.value)} className="cf-input" placeholder="Paste the code from your team member" style={{fontFamily:"monospace",fontSize:12}}/></label>
      {joinCode&&parseInviteCode(joinCode)&&<p className="hint" style={{color:"#718355"}}>✓ Team: <strong>{parseInviteCode(joinCode).teamName}</strong> · Caring for: <strong>{parseInviteCode(joinCode).clientName}</strong></p>}
      <label className="cf-label">Your name<input value={mn} onChange={e=>setMn(e.target.value)} className="cf-input" placeholder="e.g., Sarah"/></label>
      <label className="cf-label">Your role title<input value={mr} onChange={e=>setMr(e.target.value)} className="cf-input" placeholder="e.g., Weekend Caregiver, Son, Home Health Aide"/></label>
      <label className="cf-label">Access level<select value={rk} onChange={e=>setRk(e.target.value)} className="cf-select">{ROLES.filter(r=>r.key!=="admin"&&!r.key.startsWith("client")).map(r=>(<option key={r.key} value={r.key}>{r.icon} {r.label} — {r.desc}</option>))}</select></label>
      <div className="cf-actions" style={{marginTop:12}}><button onClick={()=>{if(!joinCode.trim()||!mn.trim()){flash("Please enter the invite code and your name.");return}joinTeamFromCode(joinCode,mn,mr,rk)}} className="save-btn">Join Team</button><button onClick={()=>{setTeamSetupMode(null);setJoinCode("")}} className="cancel-btn">Cancel</button></div>
    </div>)};

  const detailContact=contactDetail?data.contacts.find(c=>c.id===contactDetail):null;
  const detailCat=detailContact?CONTACT_CATS.find(c=>c.key===detailContact.category):null;

  /* ══════════ RENDER ══════════ */
  const TABS=[{key:"overview",icon:"⊞",label:"Overview"},...DOMAINS.map(d=>({key:d.key,icon:d.icon,label:getDomLabel(d.key),color:d.color,pct:getProgress(d.key).pct+"%"})),{key:"incidents",icon:"⚠",label:"Incidents",color:"#b56576",pct:((data.incidents&&data.incidents.length)||0)},{key:"medadmin",icon:"💊",label:"Meds Log",color:"#6d6875"},{key:"expenses",icon:"$",label:"Expenses",color:"#bc6c25"},{key:"calendar",icon:"▦",label:"Calendar",color:"#6d6875"},{key:"contacts",icon:"☷",label:"Contacts",color:"#457b9d"},{key:"documents",icon:"📄",label:"Docs",color:"#b56576"},{key:"selfreport",icon:"🗣",label:"Self Report",color:"#718355"},{key:"emergency",icon:"🚨",label:"Emergency",color:"#8b0000"},{key:"shifts",icon:"👥",label:"Shifts",color:"#457b9d"},{key:"triggers",icon:"📊",label:"Escalation",color:"#bc6c25"},{key:"tracking",icon:"📈",label:"Tracking",color:"#6d6875"},{key:"visit",icon:"📋",label:"Visit Prep",color:"#718355"},{key:"postdeath",icon:"🕊",label:"After Death",color:"#8d99ae"},{key:"messages",icon:"✉",label:"Messages",color:"#718355"},{key:"sync",icon:"📡",label:"Sync",color:"#457b9d"},{key:"help",icon:"?",label:"Help",color:"#8d99ae"},{key:"settings",icon:"⚙",label:"Settings",color:"#8d99ae"}];

  // Ordered tabs: use saved order if it exists, otherwise default
  const savedOrder=(data.settings&&data.settings.tabOrder);
  const orderedTabs=(savedOrder&&savedOrder.length)?savedOrder.map(k=>TABS.find(t=>t.key===k)).filter(Boolean).concat(TABS.filter(t=>!savedOrder.includes(t.key))):TABS;
  const roleTabs=getVisibleTabs();
  const visibleTabs=orderedTabs.filter(t=>t.key!=="postdeath"&&roleTabs.some(rt=>rt.key===t.key));

  const moveTab=(key,dir)=>{
    const order=orderedTabs.map(t=>t.key);
    const idx=order.indexOf(key);if(idx<0)return;
    const newIdx=idx+dir;if(newIdx<0||newIdx>=order.length)return;
    [order[idx],order[newIdx]]=[order[newIdx],order[idx]];
    setData(p=>({...p,settings:{...p.settings,tabOrder:order}}));
  };
  const resetTabOrder=()=>{setData(p=>{const s={...p.settings};delete s.tabOrder;return{...p,settings:s}});flash("Tab order reset to default.")};

  // First Win — personalize before the dashboard appears (fresh setup only)
  if(authed&&showFirstWin) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card onb-card">
      <div className="onb-emoji">💛</div>
      <h1 className="auth-title">Who are we caring for?</h1>
      <p className="onb-body">Just their first name to start — you can add everything else whenever you're ready.</p>
      <input value={fwName} onChange={e=>setFwName(e.target.value)} placeholder="First name (e.g. Mom, or Eleanor)" className="auth-input onb-input" style={{marginBottom:16}} autoFocus/>
      <details className="onb-optional"><summary>Add their main doctor too? (optional)</summary>
        <input value={fwDocName} onChange={e=>setFwDocName(e.target.value)} placeholder="Doctor's name" className="auth-input onb-input" style={{margin:"10px 0 8px"}}/>
        <input value={fwDocPhone} onChange={e=>setFwDocPhone(e.target.value)} placeholder="Doctor's phone" className="auth-input onb-input" type="tel"/>
      </details>
      <button onClick={()=>completeFirstWin(false)} className="auth-btn" style={{marginTop:16}}>{fwName.trim()?`Start caring for ${sanitizeText(fwName,40).trim()}`:"Continue"}</button>
      <button onClick={()=>completeFirstWin(true)} className="text-btn">Skip for now</button>
    </div></div>
  </>);

  return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    {/* Eviction-risk warning — persistent storage not granted by the browser */}
    {newerSchema&&(<div className="nudge-banner nudge-risk">⚠ This vault was last saved by a newer version of Care Guardian. Update this device's app before making changes, or newer data could be lost. Your data is intact.</div>)}
    {storageAtRisk&&(<div className="nudge-banner nudge-risk">
      <span className="nudge-icon">⚠️</span>
      <div className="nudge-body"><strong>This browser hasn't granted durable storage.</strong> Your records could be cleared if the device runs low on space. Add the app to your home screen and keep a recent backup so nothing is lost.{backupStatus==="active"?" Your continuous backup is protecting you in the meantime.":""}</div>
      <button className="nudge-act" onClick={()=>{setCurrentHub("team");nav("settings")}}>Back up</button>
      <button className="nudge-x" onClick={()=>setStorageAtRisk(false)}>×</button>
    </div>)}
    {/* Truthful durability indicator — "saved" only after the edit's append has committed */}
    {saveState!=="saved"&&(<div className={`save-pill save-${saveState}`}>{saveState==="saving"?"Saving…":"⚠ Save error — your last edit may not be stored. Check storage in Settings."}</div>)}
    {/* Option 5 — install nudge (iOS tab → home screen for durable storage) */}
    {showInstallNudge&&(<div className="nudge-banner nudge-install">
      <span className="nudge-icon">📲</span>
      <div className="nudge-body"><strong>Protect your data from being cleared.</strong> Add Care Guardian to your home screen — installed apps get more durable storage and are far less likely to be wiped by your browser. Tap Share, then "Add to Home Screen."</div>
      <button className="nudge-x" onClick={()=>{setShowInstallNudge(false);try{localStorage.setItem("cg-install-nudge-dismissed","1")}catch{}}}>×</button>
    </div>)}
    {/* Option 4 — periodic backup reminder / continuous-backup resume prompt */}
    {showBackupReminder&&(backupStatus==="paused"?(<div className="nudge-banner nudge-backup">
      <span className="nudge-icon">⏸️</span>
      <div className="nudge-body"><strong>Backup paused.</strong> Your browser cleared this session's permission to write to your backup file — this is normal and happens each time you reopen the app. Click resume to keep protecting your data automatically.</div>
      <button className="nudge-act" onClick={resumeBackup} disabled={backupBusy}>Resume backup</button>
      <button className="nudge-x" onClick={()=>setShowBackupReminder(false)}>×</button>
    </div>):(<div className="nudge-banner nudge-backup">
      <span className="nudge-icon">💾</span>
      <div className="nudge-body"><strong>Time to back up.</strong> {(data.settings&&data.settings.lastBackupAt)?"It's been a while since your last backup.":"You haven't made a backup yet."} A downloaded backup file survives even if your browser clears its storage — it's how you recover everything.</div>
      <button className="nudge-act" onClick={()=>{setShowBackupReminder(false);setCurrentHub("team");nav("settings")}}>Back up now</button>
      <button className="nudge-x" onClick={()=>setShowBackupReminder(false)}>×</button>
    </div>))}
    {searchOpen&&(<div className="search-overlay" onClick={()=>setSearchOpen(false)}>
      <div className="search-modal" onClick={e=>e.stopPropagation()}>
        <div className="search-input-row">
          <span className="search-icon">🔍</span>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} className="search-input" placeholder="Search features, incidents, contacts, documents..." autoFocus/>
          <button onClick={()=>setSearchOpen(false)} className="search-close">×</button>
        </div>
        {(()=>{const r=getSearchResults(searchQ);const hasResults=r.features.length>0||r.data.length>0;
          return searchQ.length>=2?(<div className="search-results">
            {r.features.length>0&&<><div className="search-cat">Features</div>
              {r.features.slice(0,6).map(f=>(<button key={f.view} className="search-result" onClick={()=>{setSearchOpen(false);setCurrentHub(f.hub);nav(f.view)}}><span className="search-result-icon">{f.icon}</span><span className="search-result-text">{f.label}</span><span className="search-result-arrow">›</span></button>))}</>}
            {r.data.length>0&&<><div className="search-cat">Data ({r.data.length}{r.data.length>=50?"+":""})</div>
              {r.data.slice(0,12).map((d,i)=>(<button key={d.type+"-"+i} className="search-result" onClick={()=>{setSearchOpen(false);setCurrentHub(d.hub);nav(d.view)}}><span className="search-result-icon">{d.icon}</span><div className="search-result-body"><span className="search-result-text">{d.title}</span><span className="search-result-sub">{d.sub}</span></div>{d.date&&<span className="search-result-date">{d.date}</span>}<span className="search-result-arrow">›</span></button>))}</>}
            {!hasResults&&<div className="search-empty">No results for "{searchQ}"</div>}
          </div>):<div className="search-hint">Type at least 2 characters to search</div>})()}
      </div>
    </div>)}
    {contactForm&&!isClient&&<ContactFormUI/>}
    {apptForm&&!isClient&&<ApptFormUI/>}
    {editingDomain&&!isClient&&<DomainEditModal/>}
    {incidentForm&&!isClient&&<IncidentFormUI/>}
    {expenseForm&&!isClient&&<ExpenseFormUI/>}
    {medForm&&!isClient&&<MedFormUI/>}
    {/* Merge Preview Modal */}
    {/* MFA enrollment */}
    {mfaEnroll&&(<div className="cf-overlay" onClick={()=>{if(mfaEnroll!=="registering"){setMfaEnroll(null);setMfaEnrollPrepared(null)}}}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
      <h2 className="cf-title">🔐 Enable multi-factor sign-in</h2>
      {mfaEnroll==="passcode"&&(<>
        <p className="hint">Confirm your caregiver passcode. Next you'll register a passkey, then save a one-time recovery code.</p>
        <input type="password" value={mfaEnrollPc} onChange={e=>{setMfaEnrollPc(e.target.value);setMfaEnrollErr("")}} placeholder="Caregiver passcode" className="cf-input" style={{marginTop:10}}/>
        {mfaEnrollErr&&<p className="auth-error">{mfaEnrollErr}</p>}
        <div className="cf-actions" style={{marginTop:14}}><button className="save-btn" onClick={submitMfaEnroll} disabled={!mfaEnrollPc.trim()}>Continue</button><button className="cancel-btn" onClick={()=>setMfaEnroll(null)}>Cancel</button></div>
      </>)}
      {mfaEnroll==="registering"&&(<p className="hint" style={{padding:"20px 0"}}>Follow your browser's prompt to create a passkey (Face ID, Touch ID, Windows Hello, or a security key)…</p>)}
      {mfaEnroll==="showcode"&&mfaEnrollPrepared&&(<>
        <p className="hint">Your passkey is registered. <strong>Write down or print this recovery code now</strong> — it's shown only once and is the only way in if you lose your passkey.</p>
        <div className="recovery-code-box">{mfaEnrollPrepared.code}</div>
        <div style={{display:"flex",gap:8,marginTop:8}}><button className="mini-btn" onClick={()=>{try{navigator.clipboard.writeText(mfaEnrollPrepared.code);flash("Recovery code copied.")}catch{}}}>Copy</button><button className="mini-btn" onClick={()=>window.print()}>Print</button></div>
        <p className="hint" style={{marginTop:10,color:"#9a5a2a"}}><strong>Store it away from this device</strong> — in a password manager or a locked location, never in the same drawer or on the same device. Anyone who has both this code and the caregiver passcode can sign in without the passkey, so treat it like a spare key.</p>
        <label className="confirm-check"><input type="checkbox" checked={mfaCodeConfirmed} onChange={e=>setMfaCodeConfirmed(e.target.checked)}/> I've saved this code in a separate, secure location.</label>
        <div className="cf-actions" style={{marginTop:12}}><button className="save-btn" onClick={confirmMfaEnroll} disabled={!mfaCodeConfirmed}>Turn on MFA</button></div>
      </>)}
    </div></div>)}
    {/* MFA add backup passkey */}
    {mfaAddPasskey&&(<div className="cf-overlay" onClick={()=>{if(!mfaAddBusy)setMfaAddPasskey(false)}}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:430}}>
      <h2 className="cf-title">Add a backup passkey</h2>
      <p className="hint">Register a second passkey — for example a hardware security key kept in a safe, or another device. Enter your passcode, confirm with an <strong>existing</strong> passkey, then create the new one. With two passkeys you can remove the paper recovery code entirely.</p>
      <input type="password" value={mfaAddPc} onChange={e=>{setMfaAddPc(e.target.value);setMfaEnrollErr("")}} placeholder="Caregiver passcode" className="cf-input" style={{marginTop:10}}/>
      {mfaEnrollErr&&<p className="auth-error">{mfaEnrollErr}</p>}
      <div className="cf-actions" style={{marginTop:14}}><button className="save-btn" onClick={submitAddPasskey} disabled={!mfaAddPc.trim()||mfaAddBusy}>{mfaAddBusy?"Follow the prompts…":"Add passkey"}</button><button className="cancel-btn" onClick={()=>setMfaAddPasskey(false)} disabled={mfaAddBusy}>Cancel</button></div>
    </div></div>)}
    {/* MFA disable */}    {mfaDisable&&(<div className="cf-overlay" onClick={()=>setMfaDisable(false)}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
      <h2 className="cf-title">Turn off multi-factor sign-in</h2>
      <p className="hint">Confirm your caregiver passcode and tap your passkey. After this, the passcode alone will unlock the vault again.</p>
      <input type="password" value={mfaDisablePc} onChange={e=>{setMfaDisablePc(e.target.value);setMfaEnrollErr("")}} placeholder="Caregiver passcode" className="cf-input" style={{marginTop:10}}/>
      {mfaEnrollErr&&<p className="auth-error">{mfaEnrollErr}</p>}
      <div className="cf-actions" style={{marginTop:14}}><button className="save-btn" onClick={submitMfaDisable} disabled={!mfaDisablePc.trim()}>Confirm &amp; turn off</button><button className="cancel-btn" onClick={()=>setMfaDisable(false)}>Cancel</button></div>
    </div></div>)}
    {/* New recovery code (after one-time use or regeneration) */}
    {newRecoveryCode&&(<div className="cf-overlay" onClick={()=>setNewRecoveryCode(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
      <h2 className="cf-title">Your new recovery code</h2>
      <p className="hint">Your previous recovery code is no longer valid. Save this new one in a safe place — a password manager or locked location, <strong>separate from this device</strong>.</p>
      <div className="recovery-code-box">{newRecoveryCode}</div>
      <div style={{display:"flex",gap:8,marginTop:8}}><button className="mini-btn" onClick={()=>{try{navigator.clipboard.writeText(newRecoveryCode);flash("Copied.")}catch{}}}>Copy</button><button className="mini-btn" onClick={()=>window.print()}>Print</button></div>
      <div className="cf-actions" style={{marginTop:14}}><button className="save-btn" onClick={()=>setNewRecoveryCode(null)}>I've saved it</button></div>
    </div></div>)}
    {mergePreview&&(<div className="cf-overlay" onClick={()=>setMergePreview(null)}><div className="cf-modal merge-modal" onClick={e=>e.stopPropagation()}>
      <h2 className="cf-title">📡 Merge Preview</h2>
      <p className="merge-source">Merging from: <strong>{mergePreview.sourceName}</strong></p>
      {mergePreview.oversized&&(<div className="flood-warn">⚠ This update is unusually large{mergePreview.floodBytes?` — about ${mb(mergePreview.floodBytes)} MB`:""}{mergePreview.report&&mergePreview.report.added?`, ${mergePreview.report.added.length} new items`:""}. It was <strong>not</strong> applied automatically. A flood of records can come from a corrupted or compromised device — confirm this looks legitimate before applying.</div>)}
      {mergePreview.report.added.length>0&&(<div className="merge-section"><h4 className="merge-section-title" style={{color:"#718355"}}>+ New items to add ({mergePreview.report.added.length})</h4>
        {mergePreview.report.added.map((item,i)=><div key={i} className="merge-item merge-added">{item}</div>)}</div>)}
      {mergePreview.report.updated.length>0&&(<div className="merge-section"><h4 className="merge-section-title" style={{color:"#bc6c25"}}>↻ Items updated from remote ({mergePreview.report.updated.length})</h4>
        {mergePreview.report.updated.map((item,i)=><div key={i} className="merge-item merge-updated">{item}</div>)}</div>)}
      {mergePreview.report.kept.length>0&&(<div className="merge-section"><h4 className="merge-section-title" style={{color:"#8d99ae"}}>= Local version kept ({mergePreview.report.kept.length})</h4>
        {mergePreview.report.kept.map((item,i)=><div key={i} className="merge-item merge-kept">{item}</div>)}</div>)}
      {mergePreview.report.conflicts.length>0&&(<div className="merge-section"><h4 className="merge-section-title" style={{color:"#b04434"}}>⚠ Flagged — not applied ({mergePreview.report.conflicts.length})</h4>
        {mergePreview.report.conflicts.map((item,i)=><div key={i} className="merge-item" style={{color:"#b04434"}}>{item}</div>)}</div>)}
      {mergePreview.report.added.length===0&&mergePreview.report.updated.length===0&&<p className="hint">No new changes detected — your data is already up to date.</p>}
      <div className="cf-actions" style={{marginTop:16}}>
        <button onClick={applyMerge} className="save-btn" disabled={mergePreview.report.added.length===0&&mergePreview.report.updated.length===0}>Apply Merge</button>
        <button onClick={()=>setMergePreview(null)} className="cancel-btn">Cancel</button>
      </div>
      <p className="hint" style={{marginTop:12,fontSize:11.5}}>Merge adds new items and keeps the more recent version of each changed section. Your passcodes, device ID, and tab order are never overwritten.</p>
    </div></div>)}
    <input ref={fileRef} type="file" accept=".vcf,.vcard" style={{display:"none"}} onChange={handleImportVCard}/>
    <input ref={importFileRef} type="file" accept=".json" style={{display:"none"}} onChange={handleEncryptedImport}/>
    <input ref={fhirFileRef} type="file" accept=".json" style={{display:"none"}} onChange={handleFHIRImport}/>
    <input ref={docFileRef} type="file" accept=".pdf,.txt,.text,.csv,.html,.htm" style={{display:"none"}} onChange={handleDocUpload}/>
    <input ref={syncFileRef} type="file" accept=".json" style={{display:"none"}} onChange={syncPullFromFile}/>
    <div className="shell">
      <main className="main-area-v2">
        <header className="hub-topbar">
          {!isHubView&&<button onClick={navBack} className="hub-back"><i style={{fontSize:18}}>←</i></button>}
          <div className="hub-topbar-text">
            <span className="hub-topbar-title">{getViewTitle()}</span>
            {getBreadcrumb()&&<span className="hub-topbar-crumb">{getBreadcrumb()}</span>}
          </div>
          {isClient&&<span className="client-badge">View Only</span>}
          <button onClick={()=>{setSearchOpen(true);setSearchQ("")}} className="search-btn">🔍</button>
          <button onClick={lock} className="top-lock">🔒</button>
        </header>

        <div className="content-v2">
          {(settingsMsg||importResult)&&<div className="import-toast">{settingsMsg||importResult}</div>}

          {/* ═══ TODAY HUB ═══ */}
          {view==="today-hub"&&(<>
            <div className="hub-welcome">🛡 Care Guardian{(data.settings&&data.settings.team)?" — "+(data.settings.team.name||""):""}</div>
            {clientDisplayName()&&<p className="hub-client">Caring for <strong>{clientDisplayName()}</strong></p>}
            {getSyncWarning()==="warn"&&<div className="hub-card hub-card-urgent" onClick={()=>{setCurrentHub("team");nav("sync")}}><div className="hub-card-icon" style={{background:"var(--color-background-warning)"}}><span style={{color:"var(--color-text-warning)"}}>📡</span></div><div className="hub-card-body"><div className="hub-card-title">Sync overdue <span className="pill pill-a">{getSyncAge().days}d ago</span></div><div className="hub-card-sub">Sync now to protect your data</div></div><span className="hub-card-arr">›</span></div>}
            {(()=>{const d=daysSinceRespite();if(d===null||d<14)return null;return(<div className="hub-card hub-card-urgent" onClick={()=>{setCurrentHub("team");nav("caregiver-wellness")}}><div className="hub-card-icon" style={{background:"var(--color-background-danger)"}}><span style={{color:"var(--color-text-danger)"}}>💛</span></div><div className="hub-card-body"><div className="hub-card-title">No respite in {d} days</div><div className="hub-card-sub">Caregiver burnout risk — please take a break</div></div><span className="hub-card-arr">›</span></div>)})()}
            {(()=>{const rems=getReminders();const missed=rems.filter(r=>r.type==="med-missed");const dueMeds=rems.filter(r=>r.type==="med-due");const upcoming=rems.filter(r=>r.type==="med-upcoming");const overdueT=rems.filter(r=>r.type==="task-overdue");const upcomingT=rems.filter(r=>r.type==="task-upcoming");const appts=rems.filter(r=>r.type==="appt");const hasAlerts=missed.length+dueMeds.length+overdueT.length+appts.length>0;
              return(<>
                {missed.length>0&&<><div className="hub-section-label" style={{color:"#b56576"}}>⚠ Missed medications</div>{missed.map((r,i)=>(<div key={"m"+i} className="hub-card hub-card-urgent" onClick={()=>{setCurrentHub(r.hub);nav(r.action)}}><div className="hub-card-icon" style={{background:"#fde2e8"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {dueMeds.length>0&&<><div className="hub-section-label">💊 Medications due now</div>{dueMeds.map((r,i)=>(<div key={"d"+i} className="hub-card" style={{borderLeft:"3px solid #bc6c25"}} onClick={()=>{setCurrentHub(r.hub);nav(r.action)}}><div className="hub-card-icon" style={{background:"#fdf0d5"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {appts.length>0&&<><div className="hub-section-label">📅 Upcoming appointments</div>{appts.map((r,i)=>(<div key={"a"+i} className="hub-card" onClick={()=>{setCurrentHub(r.hub);nav(r.action)}}><div className="hub-card-icon" style={{background:"#eef4f8"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {overdueT.length>0&&<><div className="hub-section-label">Overdue recurring tasks</div>{overdueT.slice(0,5).map((r,i)=>(<div key={"t"+i} className="hub-card hub-card-urgent" onClick={()=>{setCurrentHub(r.hub);nav(r.action)}}><div className="hub-card-icon" style={{background:"#fde2e8"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {upcoming.length>0&&<><div className="hub-section-label">Coming up</div>{upcoming.map((r,i)=>(<div key={"u"+i} className="hub-card" onClick={()=>{setCurrentHub(r.hub);nav(r.action)}}><div className="hub-card-icon" style={{background:"#f6f4f0"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {upcomingT.length>0&&<><div className="hub-section-label">Tasks due this week</div>{upcomingT.slice(0,5).map((r,i)=>(<div key={"tw"+i} className="hub-card" onClick={()=>{setCurrentHub(r.hub);nav(r.action)}}><div className="hub-card-icon" style={{background:"#fdf0d5"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {!hasAlerts&&<><div className="hub-section-label">Status</div><div className="hub-card hub-card-ok"><div className="hub-card-icon" style={{background:"#e8f0df"}}><span style={{color:"#718355"}}>✓</span></div><div className="hub-card-body"><div className="hub-card-title">All clear</div><div className="hub-card-sub">No overdue medications, tasks, or appointments</div></div></div></>}
              </>)})()}
            <div className="hub-section-label">Daily tasks</div>
            <div className="hub-card" onClick={()=>{setCurrentHub("records");nav("medadmin")}}><div className="hub-card-icon" style={{background:"var(--color-background-warning)"}}><span style={{color:"var(--color-text-warning)"}}>💊</span></div><div className="hub-card-body"><div className="hub-card-title">Medications</div><div className="hub-card-sub">Today's med admin grid</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>{setCurrentHub("records");nav("calendar")}}><div className="hub-card-icon" style={{background:"var(--color-background-info)"}}><span style={{color:"var(--color-text-info)"}}>▦</span></div><div className="hub-card-body"><div className="hub-card-title">Appointments</div><div className="hub-card-sub">{(data.appointments||[]).length} scheduled</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>{setCurrentHub("team");nav("messages")}}><div className="hub-card-icon" style={{background:"var(--color-background-success)"}}><span style={{color:"var(--color-text-success)"}}>✉</span></div><div className="hub-card-body"><div className="hub-card-title">Messages</div><div className="hub-card-sub">Team chat</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-section-label">Quick actions</div>
            <div className="hub-card" onClick={()=>{setCurrentHub("today");nav("handoff")}}><div className="hub-card-icon" style={{background:"var(--color-background-info)"}}><span style={{color:"var(--color-text-info)"}}>📋</span></div><div className="hub-card-body"><div className="hub-card-title">Shift handoff</div><div className="hub-card-sub">Summary of recent activity for incoming caregiver</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>{setCurrentHub("records");nav("incidents")}}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>⚠</span></div><div className="hub-card-body"><div className="hub-card-title">Log incident</div><div className="hub-card-sub">Fall, behavior, medication error</div></div><span className="hub-card-arr">›</span></div>
            {can("submit-selfreport")&&<div className="hub-card" onClick={()=>{setCurrentHub("team");nav("selfreport")}}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🗣</span></div><div className="hub-card-body"><div className="hub-card-title">Self-report</div><div className="hub-card-sub">Mood, pain, sleep, voice note</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-card" onClick={()=>{setCurrentHub("today");nav("emergency-card")}}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🆔</span></div><div className="hub-card-body"><div className="hub-card-title">Emergency info card</div><div className="hub-card-sub">Printable wallet card with vitals</div></div><span className="hub-card-arr">›</span></div>
            {!isClient&&<div className="hub-card" onClick={()=>{setCurrentHub("today");nav("caregiver-wellness")}}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>💛</span></div><div className="hub-card-body"><div className="hub-card-title">Caregiver check-in</div><div className="hub-card-sub">Track your stress, sleep, and respite</div></div><span className="hub-card-arr">›</span></div>}
          </>)}

          {/* ═══ CARE PLAN HUB ═══ */}
          {view==="care-hub"&&(<>
            <div className="strat-grid">{DOMAINS.filter(d=>can("view-domain",d.key)).map(d=>{const p=getProgress(d.key);const hc=p.pct>=80&&p.recency>=70?"#718355":p.pct>=40||p.recency>=40?"#bc6c25":"#b56576";return(
              <div key={d.key} className="strat-card" onClick={()=>nav(d.key)} style={{borderTopColor:d.color}}>
                <div className="strat-icon">{d.icon}</div>
                <div className="strat-pct" style={{color:hc}}>{p.pct}%</div>
                <div className="strat-label">{getDomLabel(d.key).split(" ")[0]}</div>
                {p.ongoingTotal>0&&<div className="strat-pulse" style={{color:hc}}>Pulse {p.recency}%</div>}
              </div>)})}</div>
            <div className="hub-section-label">Health domains</div>
            {DOMAINS.filter(d=>can("view-domain",d.key)&&["physical","cognitive","wellness"].includes(d.key)).map(d=>{const p=getProgress(d.key);const hc=p.pct>=80&&p.recency>=70?"var(--color-background-success)":p.pct>=40||p.recency>=40?"var(--color-background-warning)":"var(--color-background-danger)";const hl=p.pct>=80&&p.recency>=70?"Healthy":p.pct>=40||p.recency>=40?"Fair":"Attention";const hlc=p.pct>=80&&p.recency>=70?"pill-g":p.pct>=40||p.recency>=40?"pill-a":"pill-r";return(
              <div key={d.key} className="hub-card" onClick={()=>nav(d.key)}><div className="hub-card-icon" style={{background:hc}}><span style={{fontSize:18}}>{d.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{getDomLabel(d.key)} <span className={"pill "+hlc}>{hl}</span></div><div className="hub-card-sub">Foundation {p.pct}%{p.ongoingTotal>0?" · Pulse "+p.recency+"%":""}</div></div><span className="hub-card-arr">›</span></div>)})}
            {can("view-legal")&&<><div className="hub-section-label">Legal and financial</div>
              {DOMAINS.filter(d=>["legal","financial"].includes(d.key)).map(d=>{const p=getProgress(d.key);const hlc=p.pct>=80?"pill-g":p.pct>=40?"pill-a":"pill-r";const hl=p.pct>=80?"Healthy":p.pct>=40?"Fair":"Attention";return(
              <div key={d.key} className="hub-card" onClick={()=>nav(d.key)}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span style={{fontSize:18}}>{d.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{getDomLabel(d.key)} <span className={"pill "+hlc}>{hl}</span></div><div className="hub-card-sub">Foundation {p.pct}%</div></div><span className="hub-card-arr">›</span></div>)})}</>}
            <div className="hub-section-label">Monitoring</div>
            <div className="hub-card" onClick={()=>nav("triggers")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📊</span></div><div className="hub-card-body"><div className="hub-card-title">Escalation triggers</div><div className="hub-card-sub">{Object.values(data.transitionTriggers||{}).filter(Boolean).length} active</div></div><span className="hub-card-arr">›</span></div>
            {can("view-tracking")&&<div className="hub-card" onClick={()=>nav("tracking")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📈</span></div><div className="hub-card-body"><div className="hub-card-title">Longitudinal tracking</div><div className="hub-card-sub">{(data.statusHistory||[]).length} snapshots</div></div><span className="hub-card-arr">›</span></div>}
            {can("view-visit")&&<div className="hub-card" onClick={()=>nav("visit")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📋</span></div><div className="hub-card-body"><div className="hub-card-title">Visit prep</div><div className="hub-card-sub">Auto-generated summary</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-card" onClick={()=>nav("emergency")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🚨</span></div><div className="hub-card-body"><div className="hub-card-title">Emergency plans</div><div className="hub-card-sub">6 scenario cards</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-section-label">Documentation</div>
            <div className="hub-card" onClick={()=>nav("poa-decisions")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>⚖</span></div><div className="hub-card-body"><div className="hub-card-title">POA decisions <span className="pill pill-b">{(data.poaDecisions||[]).length}</span></div><div className="hub-card-sub">Document decisions made under power of attorney</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("capacity")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📝</span></div><div className="hub-card-body"><div className="hub-card-title">Capacity observations <span className="pill pill-b">{(data.capacityLog||[]).length}</span></div><div className="hub-card-sub">Structured ability assessments for legal and clinical use</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("binder")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📖</span></div><div className="hub-card-body"><div className="hub-card-title">Care plan binder</div><div className="hub-card-sub">Printable comprehensive care document</div></div><span className="hub-card-arr">›</span></div>
            {can("view-postdeath")&&<div className="hub-card" onClick={()=>nav("postdeath")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🕊</span></div><div className="hub-card-body"><div className="hub-card-title">End-of-life planning</div><div className="hub-card-sub">Administrative checklist</div></div><span className="hub-card-arr">›</span></div>}
          </>)}

          {/* ═══ RECORDS HUB ═══ */}
          {view==="records-hub"&&(<>
            <div className="hub-card" onClick={()=>nav("incidents")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>⚠</span></div><div className="hub-card-body"><div className="hub-card-title">Incidents <span className="pill pill-b">{(data.incidents||[]).length}</span></div><div className="hub-card-sub">Falls, behaviors, medication errors</div></div><span className="hub-card-arr">›</span></div>
            {(data.incidents||[]).length>=3&&<div className="hub-card" onClick={()=>nav("incident-patterns")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📊</span></div><div className="hub-card-body"><div className="hub-card-title">Incident patterns</div><div className="hub-card-sub">Time-of-day, type trends, weekly view</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-card" onClick={()=>nav("medadmin")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>💊</span></div><div className="hub-card-body"><div className="hub-card-title">Medication admin</div><div className="hub-card-sub">Daily med grid · {getMedSchedule().medications.length} meds</div></div><span className="hub-card-arr">›</span></div>
            {can("view-expenses")&&<div className="hub-card" onClick={()=>nav("expenses")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>$</span></div><div className="hub-card-body"><div className="hub-card-title">Expenses <span className="pill pill-b">{(data.expenses||[]).length}</span></div><div className="hub-card-sub">Care costs · CSV export</div></div><span className="hub-card-arr">›</span></div>}
            {can("view-documents")&&<div className="hub-card" onClick={()=>nav("documents")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📄</span></div><div className="hub-card-body"><div className="hub-card-title">Documents <span className="pill pill-b">{(data.savedDocs||[]).length}</span></div><div className="hub-card-sub">Scanner · Library</div></div><span className="hub-card-arr">›</span></div>}
            {can("view-contacts")&&<div className="hub-card" onClick={()=>nav("contacts")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>☷</span></div><div className="hub-card-body"><div className="hub-card-title">Contacts <span className="pill pill-b">{(data.contacts||[]).length}</span></div><div className="hub-card-sub">Medical, legal, family</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-card" onClick={()=>nav("calendar")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>▦</span></div><div className="hub-card-body"><div className="hub-card-title">Calendar</div><div className="hub-card-sub">Month view · Appointments</div></div><span className="hub-card-arr">›</span></div>
            {can("view-shifts")&&<div className="hub-card" onClick={()=>nav("schedule")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🗓</span></div><div className="hub-card-body"><div className="hub-card-title">Care schedule <span className="pill pill-b">{(data.careShifts||[]).filter(s=>new Date(s.date)>=new Date(new Date().toDateString())).length}</span></div><div className="hub-card-sub">Shifts, open shifts, swaps, visit logging</div></div><span className="hub-card-arr">›</span></div>}
            {can("view-shifts")&&<div className="hub-card" onClick={()=>nav("shifts")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>👥</span></div><div className="hub-card-body"><div className="hub-card-title">Weekly grid</div><div className="hub-card-sub">Simple recurring shift pattern</div></div><span className="hub-card-arr">›</span></div>}
          </>)}

          {/* ═══ TEAM HUB ═══ */}
          {view==="team-hub"&&(<>
            <div className="hub-card" onClick={()=>nav("messages")}><div className="hub-card-icon" style={{background:"var(--color-background-success)"}}><span style={{color:"var(--color-text-success)"}}>✉</span></div><div className="hub-card-body"><div className="hub-card-title">Messages</div><div className="hub-card-sub">Team chat</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("sync")}><div className="hub-card-icon" style={{background:"var(--color-background-info)"}}><span style={{color:"var(--color-text-info)"}}>📡</span></div><div className="hub-card-body"><div className="hub-card-title">Sync</div><div className="hub-card-sub">{(data._sync&&data._sync.lastSync)?"Last: "+new Date(data._sync.lastSync).toLocaleString():"Not yet synced"}</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("selfreport")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🗣</span></div><div className="hub-card-body"><div className="hub-card-title">Self-reports <span className="pill pill-b">{(data.selfReports||[]).length}</span></div><div className="hub-card-sub">Client wellness updates</div></div><span className="hub-card-arr">›</span></div>
            {can("manage-settings")&&<div className="hub-card" onClick={()=>nav("settings")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>⚙</span></div><div className="hub-card-body"><div className="hub-card-title">Settings</div><div className="hub-card-sub">Passcodes, state, export</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-card" onClick={()=>nav("help")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>?</span></div><div className="hub-card-body"><div className="hub-card-title">Help</div><div className="hub-card-sub">Feature guide</div></div><span className="hub-card-arr">›</span></div>
          </>)}

          {/* ═══ SHIFT HANDOFF ═══ */}
          {view==="handoff"&&(<>
            <h1 className="page-title">📋 Shift Handoff</h1>
            <p className="page-sub">Summary of recent activity for the incoming caregiver.</p>
            {(()=>{const since=(data._sync&&data._sync.lastSync)?new Date(data._sync.lastSync):new Date(Date.now()-86400000);const sinceStr=since.toLocaleString();
              const recentInc=(data.incidents||[]).filter(i=>new Date(i.date||i.timestamp)>=since);
              const recentMsgs=(data.messages||[]).filter(m=>new Date(m.timestamp)>=since).slice(0,5);
              const todayStr=new Date().toISOString().slice(0,10);
              const todayMeds=getMedSchedule().medications;
              const givenToday=getMedSchedule(true).log.filter(l=>l.key&&l.key.includes(todayStr));
              const pendingMeds=todayMeds.filter(m=>{const slots=m.timeSlots||[];return slots.some(s=>!givenToday.find(l=>l.key===m.id+"|"+s+"|"+todayStr))});
              return(<>
                <div className="section"><h3 className="sec-title">Since last sync ({sinceStr})</h3>
                  {recentInc.length>0?(<><p className="hint">{recentInc.length} incident(s):</p>{recentInc.map(i=>(<div key={i.id} className="hub-card" style={{cursor:"default"}}><div className="hub-card-body"><div className="hub-card-title">{i.type} — {i.severity}</div><div className="hub-card-sub">{i.description}</div></div></div>))}</>):<p className="hint">No incidents.</p>}
                </div>
                <div className="section"><h3 className="sec-title">Medications today</h3>
                  {pendingMeds.length>0?<p className="hint">{pendingMeds.length} medication(s) still due: {pendingMeds.map(m=>m.name).join(", ")}</p>:<p className="hint">All medications given.</p>}
                </div>
                <div className="section"><h3 className="sec-title">Recent messages</h3>
                  {recentMsgs.length>0?recentMsgs.map(m=>(<div key={m.id} className="hub-card" style={{cursor:"default"}}><div className="hub-card-body"><div className="hub-card-title">{m.from}</div><div className="hub-card-sub">{m.text}</div></div></div>)):<p className="hint">No recent messages.</p>}
                </div>
                <div className="section"><h3 className="sec-title">Domain alerts</h3>
                  {DOMAINS.filter(d=>can("view-domain",d.key)).map(d=>{const p=getProgress(d.key);if(p.recency>=50||p.ongoingTotal===0)return null;return(<div key={d.key} className="hub-card hub-card-urgent" style={{cursor:"default"}}><div className="hub-card-body"><div className="hub-card-title">{d.icon} {getDomLabel(d.key)} — Care Pulse at {p.recency}%</div></div></div>)}).filter(Boolean)}
                </div>
              </>)})()}
          </>)}

          {/* ═══ EMERGENCY INFO CARD ═══ */}
          {view==="emergency-card"&&(<>
            <h1 className="page-title">🆔 Emergency Info Card</h1>
            <p className="page-sub">Print this card or copy it. Post on the refrigerator, keep in wallet, hand to paramedics.</p>
            <div className="ecard">
              <div className="ecard-header">EMERGENCY MEDICAL INFORMATION</div>
              <div className="ecard-row"><span className="ecard-label">Name:</span><span>{(data.settings&&data.settings.team&&data.settings.team.clientName)||"[Set in Sync > Team]"}</span></div>
              <div className="ecard-section">DIAGNOSES</div>
              <div className="ecard-body">{(()=>{const notes=[];DOMAINS.filter(d=>d.key==="physical"||d.key==="cognitive").forEach(d=>{if((data.domains[d.key]&&data.domains[d.key].notes)){notes.push(data.domains[d.key].notes)}});return notes.length>0?notes.join("; "):"[Add in domain notes]"})()}</div>
              <div className="ecard-section">CURRENT MEDICATIONS</div>
              <div className="ecard-body">{getMedSchedule().medications.length>0?getMedSchedule().medications.map(m=>m.name+(m.dosage?" "+m.dosage:"")).join(", "):"[Add in Medication Admin]"}</div>
              <div className="ecard-section">ALLERGIES</div>
              <div className="ecard-body">[Add allergy information in Physical Health domain notes]</div>
              <div className="ecard-section">EMERGENCY CONTACTS</div>
              <div className="ecard-body">{(data.contacts||[]).filter(c=>c.category==="medical"||c.category==="family").slice(0,4).map(c=>c.name+(c.phone?" — "+c.phone:"")).join(" | ")||"[Add in Contacts]"}</div>
              <div className="ecard-section">ADVANCE DIRECTIVE</div>
              <div className="ecard-body">{(data.domains.legal&&data.domains.legal.goals&&data.domains.legal.goals[1]&&data.domains.legal.goals[1].done)?"Advance directive on file":"[Status unknown — check Legal Safety domain]"}</div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}><button onClick={()=>{const el=document.querySelector(".ecard");if(el){try{navigator.clipboard.writeText(el.innerText);flash("Card copied to clipboard.")}catch{}}}} className="save-btn">📋 Copy</button><button onClick={()=>window.print()} className="save-btn" style={{background:"#6b6560"}}>🖨 Print</button></div>
          </>)}

          {/* ═══ CAREGIVER WELLNESS ═══ */}
          {view==="caregiver-wellness"&&!isClient&&(<>
            <h1 className="page-title">💛 Caregiver Check-in</h1>
            <p className="page-sub">You matter too. Track your wellbeing so your team can support each other.</p>
            <div className="section">
              <h3 className="sec-title">How are you doing?</h3>
              <label className="cf-label">Stress level</label>
              <div className="sr-mood-row">{["😌 Low","😐 Moderate","😰 High","😩 Overwhelmed"].map(s=>(<button key={s} onClick={()=>setCwStress(s)} className={`sr-mood-btn ${cwStress===s?"sr-mood-active":""}`}>{s}</button>))}</div>
              <label className="cf-label" style={{marginTop:12}}>Sleep quality last night</label>
              <div className="sr-mood-row">{["😴 Good","😑 Fair","😫 Poor","🚫 None"].map(s=>(<button key={s} onClick={()=>setCwSleep(s)} className={`sr-mood-btn ${cwSleep===s?"sr-mood-active":""}`}>{s}</button>))}</div>
              <label className="cf-label" style={{marginTop:12}}>Hours of care today<input value={cwHours} onChange={e=>setCwHours(e.target.value)} className="cf-input" type="number" placeholder="e.g., 8" style={{width:100,marginLeft:8}}/></label>
              <label className="cf-label" style={{marginTop:8}}>Notes<textarea value={cwNotes} onChange={e=>setCwNotes(e.target.value)} className="notes-ta" rows={2} placeholder="Anything on your mind..."/></label>
              <button onClick={submitCaregiverCheckin} className="save-btn" style={{marginTop:12}}>Submit check-in</button>
            </div>
            {(data.caregiverWellness||[]).length>0&&<div className="section"><h3 className="sec-title">History</h3>
              {(()=>{const d=daysSinceRespite();if(d===null||d<7)return null;return(<p className="hint" style={{color:d>=14?"#b56576":"#bc6c25",fontWeight:600}}>{d>=14?"⚠":"⏰"} {d} days since your last day off. Please schedule respite.</p>)})()}
              {(data.caregiverWellness||[]).slice(0,10).map(e=>(<div key={e.id} className="hub-card" style={{cursor:"default"}}><div className="hub-card-body"><div className="hub-card-title">{e.stress} · {e.sleep}{e.hoursOfCare>0?" · "+e.hoursOfCare+"h":""}</div><div className="hub-card-sub">{e.timestamp}{e.notes?" — "+e.notes:""}{e.caregiver?" ("+e.caregiver+")":""}</div></div></div>))}
            </div>}
          </>)}

          {/* ═══ INCIDENT PATTERNS ═══ */}
          {view==="incident-patterns"&&(<>
            <h1 className="page-title">📊 Incident Patterns</h1>
            <p className="page-sub">Trends and distributions across {(data.incidents||[]).length} logged incidents.</p>
            {(()=>{const incs=data.incidents||[];if(incs.length<3){return(<p className="hint">Need at least 3 incidents to show patterns.</p>)}
              // Type distribution
              const types={};incs.forEach(i=>{types[i.type]=(types[i.type]||0)+1});
              const maxType=Math.max(...Object.values(types));
              // Severity distribution
              const sevs={};incs.forEach(i=>{sevs[i.severity]=(sevs[i.severity]||0)+1});
              // Time of day (from timestamp)
              const hours=new Array(24).fill(0);
              incs.forEach(i=>{const t=i.timestamp||"";const m=t.match(/(\d+):(\d+)\s*(AM|PM)/i);if(m){let h=parseInt(m[1]);if(m[3].toUpperCase()==="PM"&&h!==12)h+=12;if(m[3].toUpperCase()==="AM"&&h===12)h=0;hours[h]++}});
              const maxHour=Math.max(...hours);
              // Weekly trend (last 8 weeks)
              const weeks=[];const now=Date.now();for(let w=7;w>=0;w--){const start=now-w*7*86400000;const end=start+7*86400000;const count=incs.filter(i=>{const d=new Date(i.date||i.timestamp).getTime();return d>=start&&d<end}).length;weeks.push({label:w===0?"This wk":w+"w ago",count})}
              const maxWeek=Math.max(...weeks.map(w=>w.count));
              const peakHour=hours.indexOf(Math.max(...hours));
              const peakLabel=maxHour>0?(peakHour>12?(peakHour-12)+"pm":peakHour+"am"):null;
              return(<>
                <div className="section"><h3 className="sec-title">By type</h3>
                  <div className="pattern-bars">{Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([t,c])=>(<div key={t} className="pattern-bar-row"><span className="pattern-bar-label">{t}</span><div className="pattern-bar-track"><div className="pattern-bar-fill" style={{width:(c/maxType*100)+"%",background:"#b56576"}}/></div><span className="pattern-bar-val">{c}</span></div>))}</div>
                </div>
                <div className="section"><h3 className="sec-title">By severity</h3>
                  <div className="pattern-bars">{Object.entries(sevs).sort((a,b)=>b[1]-a[1]).map(([s,c])=>(<div key={s} className="pattern-bar-row"><span className="pattern-bar-label">{s}</span><div className="pattern-bar-track"><div className="pattern-bar-fill" style={{width:(c/maxType*100)+"%",background:s==="Severe"?"#b56576":s==="Moderate"?"#bc6c25":"#718355"}}/></div><span className="pattern-bar-val">{c}</span></div>))}</div>
                </div>
                <div className="section"><h3 className="sec-title">By time of day</h3>
                  <div className="hour-chart">{hours.map((c,h)=>(<div key={h} className="hour-col"><div className="hour-bar" style={{height:maxHour>0?(c/maxHour*80)+"px":"0"}}/><span className="hour-label">{h%6===0?h+"h":""}</span></div>))}</div>
                  {peakLabel&&<p className="hint">Peak incident hour: {peakLabel}</p>}
                </div>
                <div className="section"><h3 className="sec-title">Weekly trend</h3>
                  <div className="pattern-bars">{weeks.map(w=>(<div key={w.label} className="pattern-bar-row"><span className="pattern-bar-label">{w.label}</span><div className="pattern-bar-track"><div className="pattern-bar-fill" style={{width:maxWeek>0?(w.count/maxWeek*100)+"%":"0",background:"#457b9d"}}/></div><span className="pattern-bar-val">{w.count}</span></div>))}</div>
                </div>
              </>)})()}
          </>)}

          {/* ═══ CARE SCHEDULE ═══ */}
          {view==="schedule"&&can("view-shifts")&&(<>
            <h1 className="page-title">🗓 Care Schedule</h1>
            <p className="page-sub">{isAdmin?"Create shifts, approve claims and swaps, and review visit logs.":"Claim open shifts, request swaps, and log your visits."}</p>

            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {can("manage-schedule")&&!shiftForm&&<button onClick={()=>setShiftForm({date:new Date().toISOString().slice(0,10),startTime:"09:00",endTime:"17:00",assignedTo:"",carePlan:"",tasks:[]})} className="save-btn">+ New Shift</button>}
              <button onClick={()=>{setAvailDraft(getMyAvailability());nav("availability")}} className="edit-btn" style={{marginTop:0}}>📅 My Availability</button>
            </div>

            {/* New shift form (admin) */}
            {shiftForm&&can("manage-schedule")&&(<div className="poa-form">
              <h3 className="sec-title">New Shift</h3>
              <div className="cf-grid">
                <label className="cf-label">Date<input type="date" value={shiftForm.date} onChange={e=>setShiftForm(p=>({...p,date:e.target.value}))} className="cf-input"/></label>
                <label className="cf-label">Assign to<select value={shiftForm.assignedTo} onChange={e=>setShiftForm(p=>({...p,assignedTo:e.target.value}))} className="cf-input"><option value="">— Leave open —</option>{teamMembers().map(m=>(<option key={m.deviceId} value={m.deviceId}>{m.name} ({m.role})</option>))}</select></label>
              </div>
              <div className="cf-grid">
                <label className="cf-label">Start<input type="time" value={shiftForm.startTime} onChange={e=>setShiftForm(p=>({...p,startTime:e.target.value}))} className="cf-input"/></label>
                <label className="cf-label">End<input type="time" value={shiftForm.endTime} onChange={e=>setShiftForm(p=>({...p,endTime:e.target.value}))} className="cf-input"/></label>
              </div>
              <label className="cf-label">Care plan / instructions for this shift<textarea value={shiftForm.carePlan} onChange={e=>setShiftForm(p=>({...p,carePlan:e.target.value}))} className="notes-ta" rows={3} placeholder="What should the caregiver do during this visit? Medications, meals, routines, things to watch for..."/></label>
              <label className="cf-label">Tasks for this shift</label>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <input value={shiftTaskInput} onChange={e=>setShiftTaskInput(e.target.value)} className="cf-input" placeholder="Add a task..." onKeyDown={e=>{if(e.key==="Enter"&&shiftTaskInput.trim()){setShiftForm(p=>({...p,tasks:[...p.tasks,{id:nextId(),text:shiftTaskInput.trim(),done:false}]}));setShiftTaskInput("")}}}/>
                <button onClick={()=>{if(shiftTaskInput.trim()){setShiftForm(p=>({...p,tasks:[...p.tasks,{id:nextId(),text:shiftTaskInput.trim(),done:false}]}));setShiftTaskInput("")}}} className="edit-btn" style={{marginTop:0}}>Add</button>
              </div>
              {shiftForm.tasks.length>0&&<div style={{marginBottom:8}}>{shiftForm.tasks.map(t=>(<div key={t.id} className="shift-task-row"><span>☐ {t.text}</span><button onClick={()=>setShiftForm(p=>({...p,tasks:p.tasks.filter(x=>x.id!==t.id)}))} className="remove-sub">×</button></div>))}</div>}
              <div className="cf-actions" style={{marginTop:12}}>
                <button onClick={()=>{createShift(shiftForm);setShiftForm(null);setShiftTaskInput("")}} className="save-btn">Create Shift</button>
                <button onClick={()=>{setShiftForm(null);setShiftTaskInput("")}} className="cancel-btn">Cancel</button>
              </div>
            </div>)}

            {/* Pending approvals (admin) */}
            {can("manage-schedule")&&(()=>{const pending=(data.careShifts||[]).filter(s=>s.status==="claim-requested"||s.status==="swap-requested");if(pending.length===0)return null;return(
              <div className="section"><h3 className="sec-title">⏳ Pending approvals ({pending.length})</h3>
                {pending.map(s=>(<div key={s.id} className="shift-card shift-pending">
                  <div className="shift-head"><span className="shift-date">{s.date} · {s.startTime}–{s.endTime}</span><span className="pill pill-a">{s.status==="claim-requested"?"Claim":"Swap"}</span></div>
                  {s.status==="claim-requested"&&<div className="shift-approvals">
                    <p className="hint">Caregivers requesting this open shift:</p>
                    {(s.claimRequests||[]).map(c=>(<div key={c.deviceId} className="shift-approval-row"><span>{c.name}</span><div style={{display:"flex",gap:6}}><button onClick={()=>approveClaim(s.id,c.deviceId)} className="edit-btn" style={{marginTop:0,fontSize:11,background:"#718355",color:"#fff",borderColor:"#718355"}}>Approve</button><button onClick={()=>denyClaim(s.id,c.deviceId)} className="edit-btn" style={{marginTop:0,fontSize:11}}>Deny</button></div></div>))}
                  </div>}
                  {s.status==="swap-requested"&&s.swapRequest&&<div className="shift-approvals">
                    <p className="hint">{s.swapRequest.fromName} wants to give up this shift{s.swapRequest.reason?": "+s.swapRequest.reason:"."}</p>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span className="hint">Reassign to:</span>
                      <select className="cf-input" style={{width:"auto",padding:"4px 8px"}} onChange={e=>{if(e.target.value)approveSwap(s.id,e.target.value)}} defaultValue=""><option value="">Open for claiming</option>{teamMembers().filter(m=>m.deviceId!==s.swapRequest.fromDevice).map(m=>(<option key={m.deviceId} value={m.deviceId}>{m.name}</option>))}</select>
                      <button onClick={()=>approveSwap(s.id,null)} className="edit-btn" style={{marginTop:0,fontSize:11,background:"#718355",color:"#fff",borderColor:"#718355"}}>Open it</button>
                      <button onClick={()=>denySwap(s.id)} className="edit-btn" style={{marginTop:0,fontSize:11}}>Deny</button>
                    </div>
                  </div>}
                </div>))}
              </div>)})()}

            {/* Open shifts */}
            {(()=>{const open=(data.careShifts||[]).filter(s=>s.status==="open"&&new Date(s.date)>=new Date(new Date().toDateString())).sort((a,b)=>a.date.localeCompare(b.date));if(open.length===0)return null;return(
              <div className="section"><h3 className="sec-title">🟢 Open shifts ({open.length})</h3>
                {open.map(s=>(<div key={s.id} className="shift-card shift-open">
                  <div className="shift-head"><span className="shift-date">{s.date} · {s.startTime}–{s.endTime}</span>{can("claim-shift")&&!isAdmin&&<button onClick={()=>requestClaim(s.id)} className="edit-btn" style={{marginTop:0,fontSize:11,background:"#457b9d",color:"#fff",borderColor:"#457b9d"}}>Request to claim</button>}{can("manage-schedule")&&<button onClick={()=>deleteShift(s.id)} className="remove-sub">×</button>}</div>
                  {s.carePlan&&<div className="shift-careplan">{s.carePlan}</div>}
                  {(s.tasks||[]).length>0&&<div className="hint">{s.tasks.length} task(s)</div>}
                </div>))}
              </div>)})()}

            {/* My/all assigned shifts */}
            {(()=>{
              const upcoming=(data.careShifts||[]).filter(s=>(s.status==="assigned"||s.status==="swap-requested")&&new Date(s.date)>=new Date(new Date().toDateString())).sort((a,b)=>a.date.localeCompare(b.date));
              const mine=upcoming.filter(s=>s.assignedTo===myDeviceId());
              const others=upcoming.filter(s=>s.assignedTo!==myDeviceId());
              const renderShift=(s,isMine)=>(<div key={s.id} className="shift-card shift-assigned">
                <div className="shift-head"><span className="shift-date">{s.date} · {s.startTime}–{s.endTime}</span><span className="shift-assignee">{memberName(s.assignedTo)}{s.status==="swap-requested"?" · swap pending":""}</span>{can("manage-schedule")&&s.lastModifiedBy&&<span className="shift-modby">edited by {s.lastModifiedBy}</span>}{can("manage-schedule")&&<button onClick={()=>deleteShift(s.id)} className="remove-sub">×</button>}</div>
                {s.carePlan&&<div className="shift-careplan"><strong>Care plan:</strong> {s.carePlan}</div>}
                {(s.tasks||[]).length>0&&<div className="shift-tasks">{s.tasks.map(t=>(<div key={t.id} className="shift-task-check" onClick={()=>{if(isMine&&can("log-visit"))toggleShiftTask(s.id,t.id)}} style={{cursor:isMine?"pointer":"default",opacity:t.done?.6:1}}><span>{t.done?"☑":"☐"}</span> <span style={{textDecoration:t.done?"line-through":"none"}}>{t.text}</span></div>))}</div>}
                {isMine&&can("log-visit")&&<div className="shift-visit">
                  {!s.visitStarted&&<button onClick={()=>startVisit(s.id)} className="edit-btn" style={{marginTop:0,fontSize:11,background:"#718355",color:"#fff",borderColor:"#718355"}}>▶ Start visit</button>}
                  {s.visitStarted&&!s.visitEnded&&<><span className="hint">Started {new Date(s.visitStarted).toLocaleTimeString()}</span> <button onClick={()=>endVisit(s.id)} className="edit-btn" style={{marginTop:0,fontSize:11,background:"#b56576",color:"#fff",borderColor:"#b56576"}}>■ End visit</button></>}
                  {s.visitStarted&&s.visitEnded&&<span className="hint" style={{color:"#718355"}}>✓ Visit logged: {new Date(s.visitStarted).toLocaleTimeString()}–{new Date(s.visitEnded).toLocaleTimeString()}</span>}
                </div>}
                {isMine&&can("log-visit")&&<><label className="cf-label" style={{marginTop:8}}>Visit notes</label><textarea defaultValue={s.visitNotes} onBlur={e=>setVisitNotes(s.id,e.target.value)} className="notes-ta" rows={2} placeholder="What happened during this visit?"/></>}
                {!isMine&&s.visitNotes&&<div className="shift-careplan"><strong>Visit notes:</strong> {s.visitNotes}</div>}
                {isMine&&s.status==="assigned"&&can("claim-shift")&&<button onClick={()=>setSwapModal(s.id)} className="edit-btn" style={{marginTop:8,fontSize:11}}>⇄ Request swap</button>}
              </div>);
              return(<>
                <div className="section"><h3 className="sec-title">My shifts ({mine.length})</h3>{mine.length>0?mine.map(s=>renderShift(s,true)):<p className="hint">No upcoming shifts assigned to you.</p>}</div>
                {others.length>0&&!isCarePro&&<div className="section"><h3 className="sec-title">Team shifts ({others.length})</h3>{others.map(s=>renderShift(s,false))}</div>}
              </>)})()}

            {/* Swap request modal */}
            {swapModal&&(<div className="cf-overlay" onClick={()=>setSwapModal(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()}>
              <h3 className="sec-title">Request Shift Swap</h3>
              <p className="hint">An admin will review your request and either reassign the shift or open it for others to claim.</p>
              <label className="cf-label">Reason (optional)<textarea value={swapReason} onChange={e=>setSwapReason(e.target.value)} className="notes-ta" rows={2} placeholder="Why do you need to swap this shift?"/></label>
              <div className="cf-actions" style={{marginTop:12}}>
                <button onClick={()=>{requestSwap(swapModal,swapReason);setSwapModal(null);setSwapReason("")}} className="save-btn">Submit Request</button>
                <button onClick={()=>{setSwapModal(null);setSwapReason("")}} className="cancel-btn">Cancel</button>
              </div>
            </div></div>)}
          </>)}

          {/* ═══ AVAILABILITY ═══ */}
          {view==="availability"&&(<>
            <h1 className="page-title">📅 My Availability</h1>
            <p className="page-sub">Set when you're available so the admin can schedule you appropriately. Visible to the care team.</p>
            {(()=>{
              const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
              const slots=["Morning","Afternoon","Evening","Overnight"];
              const draft=availDraft||getMyAvailability();
              const toggle=(day,slot)=>{const cur=draft[day]||[];const next=cur.includes(slot)?cur.filter(s=>s!==slot):[...cur,slot];setAvailDraft({...draft,[day]:next})};
              return(<>
                <div className="avail-grid">
                  <div className="avail-corner"></div>
                  {slots.map(s=>(<div key={s} className="avail-slot-head">{s}</div>))}
                  {days.map(day=>(<Fragment key={day}>
                    <div className="avail-day">{day}</div>
                    {slots.map(slot=>{const on=(draft[day]||[]).includes(slot);return(<button key={day+slot} onClick={()=>toggle(day,slot)} className={`avail-cell ${on?"avail-on":""}`}>{on?"✓":""}</button>)})}
                  </Fragment>))}
                </div>
                <button onClick={()=>{setMyAvailability(draft);nav("schedule")}} className="save-btn" style={{marginTop:16}}>Save Availability</button>
              </>)})()}

            {/* Admin view of everyone's availability */}
            {can("manage-schedule")&&(()=>{const all=data.availability||{};const devs=Object.keys(all);if(devs.length===0)return null;return(
              <div className="section"><h3 className="sec-title">Team availability</h3>
                {devs.map(dev=>{const a=all[dev];return(<div key={dev} className="avail-summary"><strong>{a.name}</strong>: {Object.entries(a.days||{}).filter(([d,s])=>s.length>0).map(([d,s])=>d+" ("+s.join(", ")+")").join("; ")||"none set"}</div>)})}
              </div>)})()}
          </>)}

          {/* ═══ POA DECISIONS ═══ */}
          {view==="poa-decisions"&&can("view-legal")&&(<>
            <h1 className="page-title">⚖ POA Decision Log</h1>
            <p className="page-sub">Document decisions made under power of attorney. Creates a defensible legal record of fiduciary decision-making.</p>

            {!poaForm&&<button onClick={()=>setPoaForm({type:"",description:"",reasoning:"",knownWishes:"",consulted:"",outcome:"",urgency:"routine"})} className="save-btn" style={{marginBottom:16}}>+ Document a Decision</button>}

            {poaForm&&(<div className="poa-form">
              <h3 className="sec-title">New Decision</h3>
              <label className="cf-label">Decision type</label>
              <div className="sr-mood-row" style={{marginBottom:12}}>{POA_DECISION_TYPES.map(t=>(<button key={t.key} onClick={()=>setPoaForm(p=>({...p,type:t.key}))} className={`sr-mood-btn ${poaForm.type===t.key?"sr-mood-active":""}`}>{t.icon} {t.label}</button>))}</div>

              <label className="cf-label">Urgency</label>
              <div className="sr-mood-row" style={{marginBottom:12}}>{["routine","urgent","emergency"].map(u=>(<button key={u} onClick={()=>setPoaForm(p=>({...p,urgency:u}))} className={`sr-mood-btn ${poaForm.urgency===u?"sr-mood-active":""}`}>{u==="emergency"?"🚨":u==="urgent"?"⚡":"📋"} {u.charAt(0).toUpperCase()+u.slice(1)}</button>))}</div>

              <label className="cf-label">What decision was made?<textarea value={poaForm.description} onChange={e=>setPoaForm(p=>({...p,description:e.target.value}))} className="notes-ta" rows={3} placeholder="Describe the specific decision and action taken..."/></label>

              <label className="cf-label">Reasoning and justification<textarea value={poaForm.reasoning} onChange={e=>setPoaForm(p=>({...p,reasoning:e.target.value}))} className="notes-ta" rows={2} placeholder="Why was this decision made? What factors were considered?"/></label>

              <label className="cf-label">Known wishes of the principal<textarea value={poaForm.knownWishes} onChange={e=>setPoaForm(p=>({...p,knownWishes:e.target.value}))} className="notes-ta" rows={2} placeholder="What would they want? Prior stated preferences, values, directives..."/></label>

              <label className="cf-label">Who was consulted?<input value={poaForm.consulted} onChange={e=>setPoaForm(p=>({...p,consulted:e.target.value}))} className="cf-input" placeholder="Dr. Chen, sibling Sarah, elder law attorney, care team..."/></label>

              <label className="cf-label">Outcome / Next steps<textarea value={poaForm.outcome} onChange={e=>setPoaForm(p=>({...p,outcome:e.target.value}))} className="notes-ta" rows={2} placeholder="What happened as a result? Any follow-up needed?"/></label>

              <div className="cf-actions" style={{marginTop:12}}>
                <button onClick={()=>submitPoaDecision(poaForm)} className="save-btn">Save Decision</button>
                <button onClick={()=>setPoaForm(null)} className="cancel-btn">Cancel</button>
              </div>
            </div>)}

            {(data.poaDecisions||[]).length>0&&(<div className="section"><h3 className="sec-title">Decision History ({(data.poaDecisions||[]).length})</h3>
              {can("export-data")&&<div style={{marginBottom:12}}><button onClick={()=>{const lines=(data.poaDecisions||[]).map(d=>{const t=POA_DECISION_TYPES.find(x=>x.key===d.type);return d.date+" | "+(t&&t.label||d.type)+" | "+d.description+(d.reasoning?" | Reasoning: "+d.reasoning:"")+(d.knownWishes?" | Wishes: "+d.knownWishes:"")+(d.consulted?" | Consulted: "+d.consulted:"")+(d.outcome?" | Outcome: "+d.outcome:"")+" | Agent: "+d.agent});try{navigator.clipboard.writeText("POA DECISION LOG\n"+lines.join("\n"));flash("Decision log copied to clipboard.")}catch{}}} className="edit-btn" style={{fontSize:12,marginTop:0}}>📋 Export log</button></div>}
              {(data.poaDecisions||[]).map(d=>{const t=POA_DECISION_TYPES.find(x=>x.key===d.type);return(
                <div key={d.id} className="poa-entry">
                  <div className="poa-entry-head">
                    <span className="poa-entry-type">{(t&&t.icon)||"📋"} {(t&&t.label)||d.type}</span>
                    <span className={`pill ${d.urgency==="emergency"?"pill-r":d.urgency==="urgent"?"pill-a":"pill-b"}`}>{d.urgency}</span>
                    <span className="poa-entry-date">{d.date}</span>
                  </div>
                  <div className="poa-entry-desc">{d.description}</div>
                  {d.reasoning&&<div className="poa-entry-field"><span className="poa-field-label">Reasoning:</span> {d.reasoning}</div>}
                  {d.knownWishes&&<div className="poa-entry-field"><span className="poa-field-label">Known wishes:</span> {d.knownWishes}</div>}
                  {d.consulted&&<div className="poa-entry-field"><span className="poa-field-label">Consulted:</span> {d.consulted}</div>}
                  {d.outcome&&<div className="poa-entry-field"><span className="poa-field-label">Outcome:</span> {d.outcome}</div>}
                  <div className="poa-entry-agent">Documented by {d.agent} on {d.timestamp}</div>
                </div>)})}
            </div>)}
          </>)}

          {/* ═══ CAPACITY DOCUMENTATION ═══ */}
          {view==="capacity"&&!isClient&&(<>
            <h1 className="page-title">📝 Capacity Observations</h1>
            <p className="page-sub">Document remaining abilities over time. Critical for legal proceedings, care planning, and provider visits.</p>
            <div className="section">
              <h3 className="sec-title">New observation</h3>
              <div className="cap-grid">{CAPACITY_AREAS.map(a=>(<div key={a.key} className="cap-row">
                <span className="cap-label">{a.label}</span>
                <div className="cap-btns">{CAPACITY_LEVELS.map(l=>(<button key={l} onClick={()=>setCapEntries(p=>({...p,[a.key]:l}))} className={`cap-btn ${capEntries[a.key]===l?"cap-btn-active":""}`}>{l}</button>))}</div>
              </div>))}</div>
              <label className="cf-label" style={{marginTop:12}}>Notes<textarea value={capNotes} onChange={e=>setCapNotes(e.target.value)} className="notes-ta" rows={2} placeholder="Context, triggers, time of day, comparison to last assessment..."/></label>
              <button onClick={submitCapacityLog} className="save-btn" style={{marginTop:12}}>Record Observation</button>
            </div>
            {(data.capacityLog||[]).length>0&&<div className="section"><h3 className="sec-title">History ({(data.capacityLog||[]).length})</h3>
              {(data.capacityLog||[]).map(e=>(<div key={e.id} className="cap-entry">
                <div className="cap-entry-head"><strong>{e.timestamp}</strong>{e.assessor&&<span className="cap-assessor"> — {e.assessor}</span>}</div>
                <div className="cap-entry-grid">{Object.entries(e.assessments||{}).filter(([k,v])=>v&&v!=="Not assessed").map(([k,v])=>{const area=CAPACITY_AREAS.find(a=>a.key===k);const color=v==="Independent"?"#718355":v==="Needs prompting"?"#bc6c25":v==="Needs assistance"?"#b56576":"#8d99ae";return(
                  <div key={k} className="cap-entry-item"><span className="cap-entry-area">{(area&&area.label)||k}</span><span className="pill" style={{background:color+"20",color,marginLeft:0}}>{v}</span></div>)})}</div>
                {e.notes&&<p className="cap-entry-notes">{e.notes}</p>}
              </div>))}
            </div>}
          </>)}

          {/* ═══ CARE PLAN BINDER ═══ */}
          {view==="binder"&&(<>
            <h1 className="page-title">📖 Care Plan Binder</h1>
            <p className="page-sub">A comprehensive care document compiled from all your dashboard data. Print for facility admission, new aide onboarding, or provider handoff.</p>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <button onClick={()=>{try{navigator.clipboard.writeText(generateCarePlanBinder());flash("Binder copied to clipboard.")}catch{}}} className="save-btn">📋 Copy</button>
              <button onClick={()=>window.print()} className="save-btn" style={{background:"#6b6560"}}>🖨 Print</button>
            </div>
            <pre className="binder-preview">{generateCarePlanBinder()}</pre>
          </>)}

          {/* ═══ OVERVIEW (legacy, kept for domain card grid) ═══ */}
          {view==="overview"&&(<>
            <h1 className="page-title">Dashboard Overview</h1>
            <p className="page-sub">{isClient?"You're viewing in read-only mode.":"Tap any domain to see guided steps. Use ✎ to rename categories."}</p>
            <div className="o-grid">
              {DOMAINS.filter(d=>can("view-domain",d.key)).map(d=>{const prog=getProgress(d.key);const pulseColor=prog.recency>=75?"#718355":prog.recency>=40?"#bc6c25":"#b56576";const healthColor=prog.pct>=80&&prog.recency>=70?"#718355":prog.pct>=40||prog.recency>=40?"#bc6c25":"#b56576";const healthLabel=prog.pct>=80&&prog.recency>=70?"Healthy":prog.pct>=40||prog.recency>=40?"Fair":"Needs Attention";return(
                <button key={d.key} onClick={()=>nav(d.key)} className="o-card" style={{borderLeftColor:d.color,background:d.bg}}>
                  <div className="o-card-head"><span style={{fontSize:24,color:d.color}}>{d.icon}</span><span className="o-badge" style={{background:healthColor+"18",color:healthColor}}>{healthLabel}</span></div>
                  <div className="o-card-title-row"><h2 className="o-card-title">{getDomLabel(d.key)}</h2>{!isClient&&<span className="edit-icon edit-icon-visible" onClick={e=>{e.stopPropagation();setEditingDomain({key:d.key,label:getDomLabel(d.key),desc:getDomDesc(d.key)})}}>✎</span>}</div>
                  <p className="o-card-desc">{getDomDesc(d.key)}</p>
                  <div className="dual-track">
                    <div className="dual-track-row"><span className="dual-track-label">☐ Foundation</span><div className="prog-track"><div className="prog-fill" style={{width:`${prog.pct}%`,background:d.color}}/></div><span className="prog-label">{prog.done}/{prog.total}</span></div>
                    {prog.ongoingTotal>0&&<div className="dual-track-row"><span className="dual-track-label" style={{color:pulseColor}}>↻ Care Pulse</span><div className="prog-track"><div className="prog-fill" style={{width:`${prog.recency}%`,background:pulseColor}}/></div><span className="prog-label" style={{color:pulseColor}}>{prog.ongoingOk}/{prog.ongoingTotal}</span></div>}
                  </div>
                </button>)})}

              {/* upcoming appointments */}
              <button onClick={()=>nav("calendar")} className="o-card" style={{borderLeftColor:"#6d6875",background:"#f3f0f5"}}>
                <div className="o-card-head"><span style={{fontSize:24,color:"#6d6875"}}>▦</span><span className="o-badge" style={{background:"#eef0f3",color:"#8d99ae"}}>{getUpcoming().length} upcoming</span></div>
                <h2 className="o-card-title">Calendar</h2>
                {getUpcoming().length>0?getUpcoming().slice(0,3).map((a,i)=>(<p key={i} className="o-card-desc" style={{margin:"2px 0"}}>{a.date} {a.time} — {a.title}</p>)):<p className="o-card-desc">No upcoming appointments.</p>}
              </button>
            </div>
            {data.log.length>0&&(<div className="log-wrap"><h3 className="log-title">Recent Activity</h3>
              {data.log.slice(0,10).map((e,i)=>{const d=DOMAINS.find(x=>x.key===e.domain);return(<div key={i} className="log-row"><span className="log-dot" style={{background:(d&&d.color)||(e.domain==="contacts"?"#457b9d":e.domain==="calendar"?"#6d6875":"#999")}}/><span className="log-text"><strong>{d?getDomLabel(d.key):e.domain==="contacts"?"Contacts":e.domain==="calendar"?"Calendar":""}</strong> — {e.action}</span><span className="log-time">{e.time}</span></div>)})}
            </div>)}
          </>)}

          {/* ═══ INCIDENT LOG ═══ */}
          {view==="incidents"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">⚠ Incident Log</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Structured record of falls, wandering, behavioral episodes, and medical events. Bring this to every provider visit.</p></div>
              {!isClient&&<button onClick={()=>setIncidentForm({mode:"add",incident:{type:"fall",severity:"moderate",date:fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()),time:new Date().toTimeString().slice(0,5),description:"",response:"",injuries:"",providerNotified:""}})} className="save-btn">+ Log Incident</button>}
            </div>
            <div className="cc-group" style={{marginBottom:20}}><span className="cc-label">Filter:</span>
              <button onClick={()=>setIncidentFilter("all")} className={`cc-btn ${incidentFilter==="all"?"cc-active":""}`}>All</button>
              {INCIDENT_TYPES.map(t=>(<button key={t.key} onClick={()=>setIncidentFilter(t.key)} className={`cc-btn ${incidentFilter===t.key?"cc-active":""}`}>{t.icon} {t.label}</button>))}
            </div>
            {getFilteredIncidents().length===0?<div className="contacts-empty"><p>{((data.incidents&&data.incidents.length)||0)===0?"No incidents logged yet.":"No incidents match this filter."}</p></div>:
              <div className="contacts-list">{getFilteredIncidents().map(inc=>{const itype=INCIDENT_TYPES.find(t=>t.key===inc.type);const sev=SEVERITY_LEVELS.find(s=>s.key===inc.severity);return(
                <div key={inc.id} className="incident-card" style={{borderLeftColor:(sev&&sev.color)||"#8d99ae"}}>
                  <div className="incident-head">
                    <span className="incident-type">{(itype&&itype.icon)} {(itype&&itype.label)||inc.type}</span>
                    <span className="o-badge" style={{background:(sev&&sev.bg),color:(sev&&sev.color)}}>{(sev&&sev.label)}</span>
                    <span className="incident-datetime">{inc.date} {inc.time}</span>
                    {!isClient&&<button onClick={()=>setIncidentForm({mode:"edit",incident:{...inc},id:inc.id})} className="edit-icon edit-icon-visible">✎</button>}
                  </div>
                  <p className="incident-desc">{inc.description}</p>
                  {inc.response&&<p className="incident-response"><strong>Response:</strong> {inc.response}</p>}
                  <div className="incident-meta">
                    {inc.injuries&&<span>Injuries: {inc.injuries}</span>}
                    {inc.providerNotified&&<span>Provider notified: {inc.providerNotified}</span>}
                  </div>
                  {inc.photos&&inc.photos.length>0&&<div className="photo-preview-row" style={{marginTop:8}}>{inc.photos.map((p,j)=>(<MediaThumb key={j} value={p} dek={dekRef.current} altKey={rKeyRef.current} kind="img"/>))}</div>}
                </div>)})}</div>}
          </>)}

          {/* ═══ MED ADMIN LOG ═══ */}
          {view==="medadmin"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">💊 Medication Administration Log</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Track daily medication administration. Tap cells to cycle: ✓ given → ✗ missed → ⊘ refused → clear.</p></div>
              {!isClient&&<button onClick={()=>setMedForm({mode:"add",med:{name:"",dosage:"",timeSlots:["Morning"],notes:""}})} className="save-btn">+ Add Medication</button>}
            </div>
            <div className="med-date-nav">
              <button onClick={()=>{const d=new Date(medAdminDate+"T12:00:00");d.setDate(d.getDate()-1);setMedAdminDate(fmtDate(d.getFullYear(),d.getMonth(),d.getDate()))}} className="cal-nav-btn">‹</button>
              <input type="date" value={medAdminDate} onChange={e=>setMedAdminDate(e.target.value)} className="cf-input" style={{textAlign:"center",fontWeight:700,maxWidth:180}}/>
              <button onClick={()=>{const d=new Date(medAdminDate+"T12:00:00");d.setDate(d.getDate()+1);setMedAdminDate(fmtDate(d.getFullYear(),d.getMonth(),d.getDate()))}} className="cal-nav-btn">›</button>
              <button onClick={()=>setMedAdminDate(fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()))} className="cc-btn cc-active" style={{marginLeft:8}}>Today</button>
            </div>
            {(()=>{const stats=getMedDayStats(medAdminDate);return stats.total>0?(<div className="med-day-stats">
              <span className="med-stat med-stat-given">✓ {stats.given}</span>
              <span className="med-stat med-stat-missed">✗ {stats.missed}</span>
              <span className="med-stat med-stat-refused">⊘ {stats.refused}</span>
              <span className="med-stat med-stat-pending">○ {stats.pending} pending</span>
            </div>):null})()}
            {getMedSchedule().medications.length===0?<div className="contacts-empty"><p>No medications in schedule. Add medications to start tracking.</p></div>:
              <div className="doc-table-wrap"><table className="doc-table med-table">
                <thead><tr><th style={{minWidth:140}}>Medication</th><th>Dosage</th>{MED_TIME_SLOTS.map(s=><th key={s} className="med-slot-th">{s}</th>)}{!isClient&&<th></th>}</tr></thead>
                <tbody>{getMedSchedule().medications.map(m=>(<tr key={m.id}>
                  <td><strong>{m.name}</strong>{m.notes&&<div className="med-note">{m.notes}</div>}</td>
                  <td>{m.dosage}</td>
                  {MED_TIME_SLOTS.map(s=>{const active=m.timeSlots.includes(s);const status=active?getMedStatus(m.id,s,medAdminDate):null;return(
                    <td key={s} className="med-cell" onClick={()=>{if(active&&!isClient)toggleMedAdmin(m.id,s,medAdminDate)}} style={{cursor:active&&!isClient?"pointer":"default",background:status==="given"?"#e8f0df":status==="missed"?"#fde2e8":status==="refused"?"#fdf0d5":active?"#faf9f7":"#f6f4f0"}}>
                      {active?(status==="given"?<span className="med-check given">✓</span>:status==="missed"?<span className="med-check missed">✗</span>:status==="refused"?<span className="med-check refused">⊘</span>:<span className="med-check pending">○</span>):<span className="med-check na">—</span>}
                    </td>)})}
                  {!isClient&&<td><button onClick={()=>setMedForm({mode:"edit",med:{...m},id:m.id})} className="edit-icon edit-icon-visible">✎</button></td>}
                </tr>))}</tbody>
              </table></div>}
          </>)}

          {/* ═══ EXPENSE TRACKER ═══ */}
          {view==="expenses"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">$ Expense Tracker</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Track care expenses for Medicaid spend-down documentation and POA fiduciary accountability (ORS 127.045).</p></div>
              <div className="contacts-header-actions">
                {((data.expenses&&data.expenses.length)||0)>0&&can("export-data")&&<><button onClick={exportExpensesCsv} className="edit-btn" style={{marginTop:0}}>📋 CSV</button><button onClick={printExpenses} className="edit-btn" style={{marginTop:0}}>🖨 Print</button></>}
                {!isClient&&<button onClick={()=>setExpenseForm({mode:"add",expense:{date:fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()),amount:"",category:"medical",description:"",payee:"",receipt:""}})} className="save-btn">+ Add Expense</button>}
              </div>
            </div>
            {/* summary */}
            {((data.expenses&&data.expenses.length)||0)>0&&(<div className="expense-summary">
              <div className="expense-summary-item"><span className="expense-summary-label">Total (all time)</span><span className="expense-summary-value">${getExpenseTotal(data.expenses||[]).toFixed(2)}</span></div>
              <div className="expense-summary-item"><span className="expense-summary-label">Filtered total</span><span className="expense-summary-value">${getExpenseTotal(getFilteredExpenses()).toFixed(2)}</span></div>
              <div className="expense-summary-item"><span className="expense-summary-label">Transactions</span><span className="expense-summary-value">{getFilteredExpenses().length}</span></div>
            </div>)}
            <div className="contacts-controls">
              <div className="cc-group"><span className="cc-label">Category:</span>
                <button onClick={()=>setExpenseCatFilter("all")} className={`cc-btn ${expenseCatFilter==="all"?"cc-active":""}`}>All</button>
                {EXPENSE_CATS.map(c=>(<button key={c.key} onClick={()=>setExpenseCatFilter(c.key)} className={`cc-btn ${expenseCatFilter===c.key?"cc-active":""}`}>{c.label}</button>))}
              </div>
              <div className="cc-group"><span className="cc-label">Month:</span>
                <button onClick={()=>setExpenseMonthFilter("all")} className={`cc-btn ${expenseMonthFilter==="all"?"cc-active":""}`}>All</button>
                {getExpenseMonths().map(m=>(<button key={m} onClick={()=>setExpenseMonthFilter(m)} className={`cc-btn ${expenseMonthFilter===m?"cc-active":""}`}>{m}</button>))}
              </div>
            </div>
            {getFilteredExpenses().length===0?<div className="contacts-empty"><p>{((data.expenses&&data.expenses.length)||0)===0?"No expenses recorded yet.":"No expenses match these filters."}</p></div>:
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Category</th><th>Description</th><th>Payee</th><th>Receipt</th>{!isClient&&<th></th>}</tr></thead>
                <tbody>{getFilteredExpenses().map(exp=>{const cat=EXPENSE_CATS.find(c=>c.key===exp.category);return(
                  <tr key={exp.id}>
                    <td style={{whiteSpace:"nowrap"}}>{exp.date}</td>
                    <td style={{whiteSpace:"nowrap",fontWeight:600}}>${parseFloat(exp.amount||0).toFixed(2)}</td>
                    <td>{(cat&&cat.label)||exp.category}</td>
                    <td>{exp.description}</td>
                    <td>{exp.payee}</td>
                    <td style={{fontSize:12,color:"#8d99ae"}}>{exp.receipt}</td>
                    {!isClient&&<td><button onClick={()=>setExpenseForm({mode:"edit",expense:{...exp},id:exp.id})} className="edit-icon edit-icon-visible">✎</button></td>}
                  </tr>)})}</tbody>
              </table></div>}
          </>)}

          {/* ═══ CALENDAR ═══ */}
          {view==="calendar"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">▦ Calendar</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Track appointments and important dates.</p></div>
              {!isClient&&<button onClick={()=>setApptForm({mode:"add",appt:{title:"",date:calSelected||fmtDate(calYear,calMonth,new Date().getDate()),time:"09:00",notes:""}})} className="save-btn">+ Appointment</button>}
            </div>
            <div className="cal-nav"><button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)}} className="cal-nav-btn">‹</button><span className="cal-month">{MONTHS[calMonth]} {calYear}</span><button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)}} className="cal-nav-btn">›</button></div>
            <div className="cal-grid"><div className="cal-header">{DAYS.map(d=><div key={d} className="cal-dow">{d}</div>)}</div>
              <div className="cal-body">{(()=>{const days=getMonthDays(calYear,calMonth);const first=getFirstDow(calYear,calMonth);const cells=[];
                for(let i=0;i<first;i++)cells.push(<div key={`e${i}`} className="cal-cell cal-empty"/>);
                const today=fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
                for(let d=1;d<=days;d++){const ds=fmtDate(calYear,calMonth,d);const appts=getApptsForDate(ds);const isSel=calSelected===ds;const isToday=ds===today;
                  cells.push(<button key={d} className={`cal-cell ${isSel?"cal-sel":""} ${isToday?"cal-today":""}`} onClick={()=>setCalSelected(isSel?null:ds)}>
                    <span className="cal-day">{d}</span>{appts.length>0&&<span className="cal-dot-row">{appts.slice(0,3).map((_,i)=><span key={i} className="cal-dot"/>)}</span>}
                  </button>)}
                return cells})()}</div>
            </div>
            {/* selected day appointments */}
            {calSelected&&(<div className="cal-detail"><h3 className="sec-title">{calSelected}</h3>
              {getApptsForDate(calSelected).length===0?<p className="hint">No appointments this day.</p>:
                getApptsForDate(calSelected).map(a=>(<div key={a.id} className="cal-appt-card">
                  <div className="cal-appt-head"><strong>{a.time||"--:--"}</strong> {a.title}
                    {!isClient&&<button onClick={()=>setApptForm({mode:"edit",appt:{...a},id:a.id})} className="edit-icon edit-icon-visible">✎</button>}
                  </div>
                  {a.notes&&<p className="cal-appt-notes">{a.notes}</p>}
                </div>))}
            </div>)}
          </>)}

          {/* ═══ EMERGENCY ACTION PLANS ═══ */}
          {view==="emergency"&&(<>
            <h1 className="page-title">🚨 Emergency Action Plans</h1>
            <p className="page-sub">Step-by-step instructions for respite caregivers and family members. Customize each plan with your specific details (locations, ID numbers, names).</p>
            <div className="emergency-grid">{EMERGENCY_SCENARIOS.map((scenario,pi)=>{const plan=(data.emergencyPlans||[])[pi]||{steps:[...scenario.steps]};return(
              <div key={scenario.key} className="emergency-card">
                <h3 className="emergency-title">{scenario.icon} {scenario.title}</h3>
                <ol className="emergency-steps">{plan.steps.map((step,si)=>(
                  <li key={si} className="emergency-step">
                    {!isClient?<input value={step} onChange={e=>updatePlanStep(pi,si,e.target.value)} className="emergency-step-input"/>:<span>{step}</span>}
                    {!isClient&&<button onClick={()=>removePlanStep(pi,si)} className="remove-sub" style={{flexShrink:0}}>×</button>}
                  </li>))}
                </ol>
                {!isClient&&<button onClick={()=>addPlanStep(pi)} className="add-sub-trigger" style={{marginTop:6}}>+ Add step</button>}
              </div>)})}</div>
          </>)}

          {/* ═══ CAREGIVER SHIFTS ═══ */}
          {view==="shifts"&&(<>
            <h1 className="page-title">👥 Caregiver Shift Schedule</h1>
            <p className="page-sub">Weekly coverage grid. Tap any cell to assign a caregiver. Ensure no gaps — especially evenings and overnights.</p>
            <div className="doc-table-wrap"><table className="doc-table shift-table">
              <thead><tr><th></th>{SHIFT_DAYS.map(d=><th key={d}>{d}</th>)}</tr></thead>
              <tbody>{SHIFT_SLOTS.map(slot=>(<tr key={slot}>
                <td className="shift-slot-label">{slot}</td>
                {SHIFT_DAYS.map(day=>{const val=getShift(day,slot);const empty=!val.trim();return(
                  <td key={day} className={`shift-cell ${empty?"shift-empty":""}`}>
                    {isClient?<span className="shift-name">{val||"—"}</span>:
                      <input value={val} onChange={e=>setShift(day,slot,e.target.value)} className="shift-input" placeholder="—"/>}
                  </td>)})}
              </tr>))}</tbody>
            </table></div>
            <p className="hint" style={{marginTop:12}}>Tip: Use consistent names (e.g., "Sarah", "Home Health Aide", "David"). Empty cells indicate uncovered time.</p>
          </>)}

          {/* ═══ CARE ESCALATION TRIGGERS ═══ */}
          {view==="triggers"&&(<>
            <h1 className="page-title">📊 Care Escalation Triggers</h1>
            <p className="page-sub">Monitor these indicators. When multiple triggers are active, it may be time to evaluate a higher level of care.</p>
            {getTriggeredCount()>0&&<div className="trigger-alert" style={{background:getTriggeredCount()>=4?"#fde2e8":getTriggeredCount()>=2?"#fdf0d5":"#e8f0df",color:getTriggeredCount()>=4?"#8b0000":getTriggeredCount()>=2?"#bc6c25":"#718355"}}>
              {getTriggeredCount()} of {TRANSITION_TRIGGERS.length} triggers active.{getTriggeredCount()>=4?" This strongly suggests evaluating a care level escalation.":getTriggeredCount()>=2?" Consider discussing care level options with the care team.":""}
            </div>}
            <div className="trigger-list">{TRANSITION_TRIGGERS.map(t=>{const active=getTrigger(t.key);return(
              <label key={t.key} className={`trigger-item ${active?"trigger-active":""}`}>
                {!isClient?<input type="checkbox" checked={active} onChange={()=>toggleTrigger(t.key)} className="goal-check"/>:<span style={{width:20,textAlign:"center",flexShrink:0}}>{active?"⚠":"○"}</span>}
                <div style={{flex:1}}><div className="trigger-label">{t.label}</div><div className="trigger-desc">{t.desc}</div></div>
              </label>)})}</div>
          </>)}

          {/* ═══ LONGITUDINAL TRACKING ═══ */}
          {view==="tracking"&&(<>
            <h1 className="page-title">📈 Longitudinal Tracking</h1>
            <p className="page-sub">Record periodic snapshots of domain status and progress to track changes over time. Useful for provider visits, APD reassessments, and guardianship documentation.</p>
            {!isClient&&<button onClick={recordStatusSnapshot} className="save-btn" style={{marginBottom:20}}>📸 Record Snapshot Today</button>}
            {(data.statusHistory||[]).length===0?<div className="contacts-empty"><p>No snapshots recorded yet. Take your first snapshot to begin tracking changes over time.</p></div>:
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Date</th>{DOMAINS.map(d=><th key={d.key} style={{fontSize:11}}>{d.icon} {getDomLabel(d.key).split(" ")[0]}</th>)}<th>Triggers</th><th>Incidents</th></tr></thead>
                <tbody>{[...(data.statusHistory||[])].reverse().map((snap,i)=>(<tr key={i}>
                  <td style={{whiteSpace:"nowrap",fontWeight:600}}>{snap.date}</td>
                  {DOMAINS.map(d=>{const s=(snap.domains&&snap.domains[d.key]);const pct=(s&&s.pct)||0;const hColor=pct>=80?"#718355":pct>=40?"#bc6c25":"#b56576";return(
                    <td key={d.key}><span className="o-badge" style={{background:hColor+"18",color:hColor,fontSize:10}}>{pct}%</span></td>)})}
                  <td>{snap.triggeredCount||0}</td>
                  <td>{snap.incidentCount||0}</td>
                </tr>))}</tbody>
              </table></div>}
          </>)}

          {/* ═══ VISIT PREP ═══ */}
          {view==="visit"&&(<>
            <h1 className="page-title">📋 Visit Preparation Summary</h1>
            <p className="page-sub">Auto-generated summary of current medications, recent incidents, domain status, active escalation triggers, and recent expenses. Print or copy before each provider visit.</p>
            <pre className="visit-summary">{generateVisitSummary()}</pre>
            <p className="hint" style={{marginTop:12}}>This summary is generated live from your dashboard data. Fill in the "Questions for provider" section before your visit. Copy the text above or use your browser's print function (Ctrl+P / Cmd+P) to print.</p>
          </>)}

          {/* ═══ POST-DEATH CHECKLIST ═══ */}
          {view==="postdeath"&&(<>
            <h1 className="page-title">🕊 After Death: Administrative Checklist</h1>
            <p className="page-sub">Oregon-specific steps organized by timeframe. No one should have to figure this out while grieving. This checklist is here so future-you doesn't have to.</p>
            {POST_DEATH_SECTIONS.map((section,si)=>{const checked=(data.postDeathChecklist||[])[si]||[];const doneCount=checked.filter(Boolean).length;return(
              <div key={si} className="section">
                <h3 className="sec-title">{section.title} <span className="prog-label">({doneCount}/{section.items.length})</span></h3>
                <div className="goals-wrap">{section.items.map((item,ii)=>{const done=getPostDeathChecked(si,ii);return(
                  <label key={ii} className="sub-item" style={{background:done?"#f5f9f0":"#faf9f7"}}>
                    {!isClient?<input type="checkbox" checked={done} onChange={()=>togglePostDeath(si,ii)} className="sub-check"/>:<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:12}}>{done?"✓":"○"}</span>}
                    <span className="sub-text" style={{textDecoration:done?"line-through":"none",color:done?"#a09a92":"#3d3730"}}>{item}</span>
                  </label>)})}</div>
              </div>)})}
          </>)}

          {/* ═══ HELP ═══ */}
          {view==="help"&&(<>
            <h1 className="page-title">? Help & User Guide</h1>
            <p className="page-sub">How to use each feature of the Care Guardian.</p>
            <div className="help-toc"><strong>Contents:</strong> {["Getting Started","Overview","Care Domains","Incident Log","Medication Log","Expense Tracker","Calendar","Contacts","Document Scanner","Self Report","Emergency Plans","Shift Schedule","Escalation Triggers","Longitudinal Tracking","Visit Prep","After Death Checklist","Messages","Team Sync","Settings & Security","Privacy"].map((t,i)=><span key={i}>{i>0?" · ":""}<a href="#" onClick={e=>{e.preventDefault();(document.getElementById("help-"+i)||{scrollIntoView:()=>{}}).scrollIntoView({behavior:"smooth"})}} className="help-link">{t}</a></span>)}</div>

            {[
              {t:"Getting Started",b:"Enter the caregiver passcode (default: 1234) for full access, or the client passcode (default: 0000) for read-only view mode. Change both passcodes in Settings. The dashboard stores everything in your browser's local storage — nothing is ever sent over the internet."},
              {t:"Overview",b:"The home screen shows all five care domains with their current status and progress. Tap any domain card to see its guided steps. The activity log at the bottom shows the most recent actions across the dashboard. Use the ✎ icon on any domain card to rename it."},
              {t:"Care Domains",b:"Each domain contains 10 guided goals with 5–12 sub-tasks each, customized for Oregon. Every sub-task is classified as one of three types: ☐ One-time (do it once and it stays done), ↻ Recurring (repeat on a schedule — shows days since last done), or ◉ Monitoring (ongoing observation — shows time since last attended). The overview shows two progress bars per domain: Foundation (one-time task completion) and Care Pulse (how current your recurring and monitoring tasks are). You can change any task type using the dropdown. Recurring and monitoring tasks are never done — tap the check button to mark them as attended today."},
              {t:"Incident Log",b:"Record falls, wandering episodes, behavioral events, medication issues, and medical symptoms. Each incident captures: type, severity (Low/Moderate/High/Critical), date and time, description, response taken, injuries, and whether a provider was notified. Filter by type. Bring this log to every provider visit — it's the most useful clinical document you can provide."},
              {t:"Medication Log",b:"First, add each medication with its name, dosage, and scheduled time slots (Morning, Midday, Afternoon, Evening, Bedtime, As Needed). Then use the daily grid to track administration. Navigate dates with the ‹/› arrows. Tap any active cell to cycle: ✓ given → ✗ missed → ⊘ refused → clear. The day stats bar shows totals at a glance."},
              {t:"Expense Tracker",b:"Log every care-related expense for Medicaid spend-down documentation and POA fiduciary accountability (ORS 127.045). Each entry records: date, amount, category, description, payee, and receipt/reference number. Filter by category or month. Summary cards show running totals. Export filtered results as a CSV spreadsheet or print the table directly from the browser. Categories include Medicaid-specific options like 'Exempt Purchase (Spend-Down)' and 'Prepaid Funeral/Burial'."},
              {t:"Calendar",b:"Month-view calendar for tracking appointments. Days with appointments show colored dots. Click any day to see its appointments. Add appointments with title, date, time, and notes. Upcoming appointments appear on the Overview dashboard."},
              {t:"Contacts",b:"Track your care team: doctors, aides, attorneys, family, and others. Each contact has standard fields (name, role, org, phone, email, category) plus unlimited custom fields (Fax, NPI, Office Hours, etc.). Record timestamped notes from each contact. Sort by category or alphabetically. Filter by type. Import contacts from .vcf (vCard) files exported from any address book app."},
              {t:"Document Scanner",b:"Upload a PDF or text file to extract structured data. The scanner auto-detects document type (medication list, lab results, clinical note). Medications are parsed with drug name, dosage, frequency, and route — all editable in a table before saving to your care notes. Lab results are parsed with test name, value, unit, reference range, and abnormal flags. Documents can be saved to a categorized library (Medication Lists, Lab Results, Imaging, Clinical Notes, Discharge Summaries, Insurance/EOB, Legal, Provider Correspondence) with filtering. No AI is used — all parsing happens locally."},
              {t:"Self Report",b:"Allows the care recipient (in client mode) or a caregiver to submit health and wellness updates. Six report types: Text Update, Voice Note (records audio via microphone, up to 60 seconds), Mood Check-in (with emoji scale), Pain Report (0–10 scale), Sleep Report, and Concern/Question. All reports are timestamped and stored in reverse chronological order. Voice notes are stored as audio that can be played back. This gives the care recipient a voice in their own care documentation."},
              {t:"Emergency Plans",b:"Six pre-built emergency scenario cards: falls, wandering, aggression, medical emergency, choking, and medication error. Each has step-by-step instructions. Customize every step with your specific details — Safe Return ID numbers, go-bag locations, key phone numbers. Print these and post them where respite caregivers can find them."},
              {t:"Shift Schedule",b:"Weekly coverage grid showing who's responsible for care during each time slot. Assign caregivers by typing names into cells. Empty cells indicate uncovered time. Use consistent names across the schedule. Helps prevent the most common coordination failure: everyone assuming someone else is covering."},
              {t:"Escalation Triggers",b:"12 monitored conditions that signal when the current care level may be insufficient. Check off triggers as they become active. When 2+ triggers are active, consider discussing options with the care team. When 4+ are active, the dashboard strongly recommends evaluating a care escalation. These are not tasks to complete — they are conditions to watch."},
              {t:"Longitudinal Tracking",b:"Record periodic snapshots of all domain statuses and progress percentages. The resulting table shows how things are changing over time. Take a snapshot monthly, before major appointments, and before any care level reassessment. This data supports APD priority reassessments, guardianship petitions, and provider conversations."},
              {t:"Visit Prep",b:"Auto-generates a comprehensive summary from your dashboard data: current medications, recent incidents, domain status, active escalation triggers, recent expenses, and physical health notes. Review and print before every provider visit. Includes blank lines for questions to ask the provider."},
              {t:"After Death Checklist",b:"Oregon-specific administrative steps organized by timeframe: immediate (24–48 hours), first week, first month, and months 2–6. Includes Social Security notification, Oregon Medicaid/OSIPM termination, estate recovery under ORS 416.350, probate filing (ORS 113.035), and more. This checklist exists so you don't have to figure this out while grieving."},
              {t:"Team Sync",b:"One-button sync for your care team. Two connection methods: Cloud Folder (save sync file in shared Google Drive/Dropbox/iCloud/OneDrive — each team member selects same file) or Self-Hosted Server (deploy sync-server.js on your own hardware, enter the URL). Both use the same Sync Now button. Room IDs are derived from your sync passcode via SHA-256 so the server never sees it. Daily use: tap Sync Now at the start and end of each session. Manual options (clipboard, file, URL) are under Advanced."},
              {t:"Messages",b:"A local message board for family care coordination. Enter your name and type a message. Messages sync across devices via the encrypted backup/import cycle in Settings. Read-only in client mode."},
              {t:"Settings & Security",b:"Set your device name so team members know whose backup is whose. Change caregiver and client passcodes. Customize tab order. Export an encrypted backup (AES-256-GCM) and share it with your care team via text, Signal, AirDrop, or a shared Drive folder. When a team member imports your backup, the merge engine adds new items and keeps the most recent version of each changed section. Passcodes, device ID, and tab order are never overwritten during merge. Import FHIR R4 health record bundles. View data inventory and sync status."},
              {t:"Privacy",b:"All data is stored on this device and encrypted at rest with AES-256-GCM. Nothing is transmitted to any server, and there is no analytics, tracking, or telemetry. Keys are derived from your passcodes using PBKDF2-HMAC-SHA256 at 600,000 iterations (OWASP-recommended), with older vaults upgraded automatically. Fonts and the PDF text-extraction engine are bundled into the app, so even the document scanner runs entirely offline with no external requests. The encryption passcode for backups is chosen by you and never stored; if it is lost, the backup cannot be recovered."},
            ].map((h,i)=>(<div key={i} id={"help-"+i} className="help-section"><h3 className="sec-title">{h.t}</h3><p className="help-body">{h.b}</p></div>))}
          </>)}

          {/* ═══ SELF REPORT ═══ */}
          {view==="selfreport"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">🗣 Self Report</h1><p className="page-sub" style={{margin:"4px 0 0"}}>{isClient?"Share how you're feeling. Your care team will see these updates.":"Client self-reported health and wellness updates."}</p>
              {isClient&&srChainStatus&&srChainStatus.status==="ok"&&<p className="page-sub" style={{margin:"4px 0 0",color:"#6F8A5F"}}>🔏 Your updates are permanent — they can't be deleted or changed by anyone.</p>}
              {/* Deliberately NO client-facing tamper warning: integrity failures surface on the caregiver
                  Security & Integrity panel and in the audit log. A "your words may have been altered" alarm
                  shown to a person with dementia risks feeding paranoid ideation, cannot be acted on by them
                  ("tell someone you trust" is circular when the tamperer may BE that person), and adds no
                  cryptographic guarantee — the chain and anchors do the protecting. On failure the client
                  simply sees no reassurance line (we never show "permanent" when unverified). */}
            </div>
              {((data.selfReports&&data.selfReports.length)||0)>0&&can("export-data")&&<div className="contacts-header-actions"><button onClick={exportSelfReportsCsv} className="edit-btn" style={{marginTop:0}}>📋 CSV</button><button onClick={exportSelfReportsText} className="edit-btn" style={{marginTop:0}}>📋 Text</button><button onClick={()=>window.print()} className="edit-btn" style={{marginTop:0}}>🖨 Print</button></div>}
            </div>

            {/* submit form — available to BOTH client and caregiver */}
            <div className="sr-form">
              <div className="cc-group" style={{marginBottom:14}}>
                <span className="cc-label">Type:</span>
                {SELF_REPORT_TYPES.map(t=>(<button key={t.key} onClick={()=>{setSrType(t.key);setSrErr("")}} className={`cc-btn ${srType===t.key?"cc-active":""}`}>{t.icon} {t.label}</button>))}
              </div>

              {srType==="mood"&&(<div className="sr-mood-row">{MOOD_OPTIONS.map(m=>(<button key={m} onClick={()=>{setSrMood(m);setSrErr("")}} className={`sr-mood-btn ${srMood===m?"sr-mood-active":""}`}>{m}</button>))}</div>)}
              {srType==="pain"&&(<div className="sr-mood-row">{PAIN_LEVELS.map(p=>(<button key={p} onClick={()=>{setSrPain(p);setSrErr("")}} className={`sr-mood-btn ${srPain===p?"sr-mood-active":""}`}>{p}</button>))}</div>)}

              {srType==="audio"&&(<div className="sr-audio-row">
                {!srRecording?<button onClick={startAudioRecording} className="sr-record-btn">🎤 Start Recording</button>
                  :<button onClick={stopAudioRecording} className="sr-record-btn sr-recording">⏹ Stop Recording ({'\u00A0'}60s max)</button>}
                {srAudioData&&<div className="sr-audio-preview"><audio src={srAudioData} controls style={{height:32}}/><button onClick={()=>setSrAudioData(null)} className="remove-sub">×</button></div>}
              </div>)}

              <div className="photo-attach-row">
                <button onClick={()=>srPhotoRef.current&&srPhotoRef.current.click()} className="edit-btn" style={{marginTop:0,fontSize:12}}>📷 Add photo{srPhotos.length>0?" ("+srPhotos.length+")":""}</button>
                <input ref={srPhotoRef} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>handlePhotoCapture(e,setSrPhotos)}/>
                {srPhotos.length>0&&<button onClick={()=>setSrPhotos([])} className="cancel-btn" style={{fontSize:11,padding:"4px 10px"}}>Clear photos</button>}
              </div>
              {srPhotos.length>0&&<div className="photo-preview-row">{srPhotos.map((p,i)=>(<div key={i} className="photo-thumb"><img src={p} alt={"Photo "+(i+1)}/><button onClick={()=>setSrPhotos(prev=>prev.filter((_,j)=>j!==i))} className="photo-remove">×</button></div>))}</div>}
              <textarea value={srText} onChange={e=>{setSrText(e.target.value);setSrErr("")}} className="notes-ta" rows={3}
                placeholder={srType==="mood"?"Add any details about how you're feeling…":srType==="pain"?"Where does it hurt? When did it start?":srType==="sleep"?"How did you sleep? Any nighttime issues?":srType==="concern"?"What's on your mind? Any questions for your care team?":srType==="audio"?"Add a text note to go with your recording (optional)…":"How are you feeling today? Any changes, concerns, or things you want your care team to know?"} />
              {srErr&&<p className="sr-err">{srErr}</p>}
              <button onClick={submitSelfReport} className="save-btn" style={{marginTop:10}}>Submit Update</button>
            </div>

            {/* report history */}
            {((data.selfReports&&data.selfReports.length)||0)>0&&(<div className="section" style={{marginTop:28}}>
              <h3 className="sec-title">Previous Reports ({data.selfReports.length})</h3>
              <div className="sr-list">{(data.selfReports||[]).map(r=>{const rt=SELF_REPORT_TYPES.find(t=>t.key===r.type);return(
                <div key={r.id} className="sr-card">
                  <div className="sr-card-head">
                    <span className="sr-card-type">{(rt&&rt.icon)} {(rt&&rt.label)}</span>
                    <span className="sr-card-time">{r.timestamp}</span>
                  </div>
                  {r.mood&&<div className="sr-card-mood">{r.mood}</div>}
                  {r.pain&&<div className="sr-card-mood">Pain level: {r.pain}</div>}
                  {r.text&&<p className="sr-card-text">{r.text}</p>}
                  {r.audioData&&<MediaThumb value={r.audioData} dek={dekRef.current} altKey={rKeyRef.current} kind="audio"/>}
                  {r.photos&&r.photos.length>0&&<div className="photo-preview-row" style={{marginTop:8}}>{r.photos.map((p,i)=>(<MediaThumb key={i} value={p} dek={dekRef.current} altKey={rKeyRef.current} kind="img"/>))}</div>}
                  {can("delete-incident")&&!(r.origin==="client"||typeof r.srSeq==="number")&&<button onClick={()=>deleteSelfReport(r.id)} className="remove-sub" style={{position:"absolute",top:8,right:8}} title="Delete this report">×</button>}
                  {(r.origin==="client"||typeof r.srSeq==="number")&&<span className="sr-protected" title="Client updates are permanent and tamper-protected">🔏</span>}
                </div>)})}</div>
            </div>)}
          </>)}

          {/* ═══ SYNC ═══ */}
          {view==="sync"&&(<>
            <h1 className="page-title">📡 Team Sync</h1>
            <p className="page-sub">Keep your care team in sync. Set up once, then just press Sync.</p>

            {syncStatus&&<div className={`sync-status sync-status-${syncStatus.type}`}>{syncStatus.type==="success"?"✓":"✗"} {syncStatus.msg}</div>}

            {/* Team */}
            <div className="section">
              <h3 className="sec-title">👥 Care Team</h3>
              {!hasTeam()?(<>
                <p className="hint">A care team connects everyone caring for the same person. One person creates the team, then shares an invite code with others.</p>
                {!teamSetupMode&&(<div className="sync-methods">
                  <div className="sync-method-card" onClick={()=>setTeamSetupMode("create")}><div className="sync-method-icon">✦</div><div className="sync-method-info"><strong>Create a Team</strong><span>You're the first caregiver setting this up</span></div></div>
                  <div className="sync-method-card" onClick={()=>setTeamSetupMode("join")}><div className="sync-method-icon">🔗</div><div className="sync-method-info"><strong>Join a Team</strong><span>Someone shared an invite code with you</span></div></div>
                </div>)}
                {teamSetupMode==="create"&&<CreateTeamForm/>}
                {teamSetupMode==="join"&&<JoinTeamForm/>}
              </>):(<>
                {/* Team is set up — show roster */}
                <div className="team-header">
                  <div className="team-header-info">
                    <div className="team-name">{getTeam().name}</div>
                    <div className="team-client">Caring for: <strong>{getTeam().clientName}</strong></div>
                  </div>
                </div>
                <div className="team-roster">
                  {(getTeam().members||[]).map((m,i)=>{const rl=ROLES.find(r=>r.key===m.role_key);return(<div key={m.deviceId||i} className={`team-member ${m.deviceId===(data.settings&&data.settings.deviceId)?"team-member-self":""}`}>
                    <div className="team-member-avatar">{m.name?m.name[0].toUpperCase():"?"}</div>
                    <div className="team-member-info">
                      <div className="team-member-name">{m.name}{m.deviceId===(data.settings&&data.settings.deviceId)&&<span className="team-member-you"> (you)</span>}</div>
                      <div className="team-member-role">{(rl&&rl.icon)||"👤"} {m.role||(rl&&rl.label)||"Member"}</div>
                    </div>
                    {isAdmin&&m.deviceId!==(data.settings&&data.settings.deviceId)&&<select value={m.role_key||"family"} onChange={e=>{const newKey=e.target.value;setData(p=>{const team={...p.settings.team,members:p.settings.team.members.map(x=>x.deviceId===m.deviceId?{...x,role_key:newKey}:x)};return{...p,settings:{...p.settings,team}}});flash(`${m.name} is now ${(ROLES.find(r=>r.key===newKey)||{}).label}`)}} className="cf-select" style={{width:"auto",fontSize:12,padding:"4px 8px"}}>{ROLES.filter(r=>!r.key.startsWith("client")).map(r=>(<option key={r.key} value={r.key}>{r.icon} {r.label}</option>))}</select>}
                    <div className="team-member-sync">{m.lastSync?new Date(m.lastSync).toLocaleDateString():"Not synced"}</div>
                  </div>)})}
                </div>

                {/* Client tier toggle — Admin only */}
                {isAdmin&&<div className="client-tier-section">
                  <h4 className="sync-sub-title">🛡 Client Access Level</h4>
                  <p className="hint">Controls what the care recipient sees when they log in with the client passcode.</p>
                  <div className="client-tier-toggle">
                    <button onClick={()=>{setData(p=>({...p,settings:{...p.settings,clientTier:"client-full"}}));flash("Client set to Independent — full view with export access.")}} className={`state-btn ${((data.settings&&data.settings.clientTier)||"client-full")==="client-full"?"state-btn-active":""}`}>🟢 Independent<span className="tier-desc">Full view, export, legal and financial access</span></button>
                    <button onClick={()=>{setData(p=>({...p,settings:{...p.settings,clientTier:"client-restricted"}}));flash("Client set to Supported — limited view, self-reports only.")}} className={`state-btn ${(data.settings&&data.settings.clientTier)==="client-restricted"?"state-btn-active":""}`}>🛡 Supported<span className="tier-desc">Self-reports and messages only</span></button>
                  </div>
                </div>}
                {/* Invite code */}
                <details className="team-invite-details">
                  <summary className="sync-paste-summary">📨 Invite another team member</summary>
                  <p className="hint">Share this invite code with new team members. They'll enter it under "Join a Team." Share the sync passcode separately (verbally or via secure message).</p>
                  <div className="team-invite-code" onClick={()=>{try{navigator.clipboard.writeText(generateInviteCode());flash("Invite code copied to clipboard.")}catch{}}}>{generateInviteCode()}</div>
                  <p className="hint" style={{marginTop:4}}>Tap to copy. Paste in a text message, email, or Signal chat to your new team member.</p>
                </details>
              </>)}
            </div>

            {/* Sync passcode */}
            {hasTeam()&&<div className="section">
              <h3 className="sec-title">🔐 Sync Passcode</h3>
              <div className="cf-grid" style={{maxWidth:400}}>
                <label className="cf-label">Team sync passcode<input value={getSyncPasscode()} onChange={e=>saveSyncPasscode(e.target.value)} className="cf-input" type="password" placeholder="Shared with all team members"/></label>
              </div>
              <p className="hint">All team members must use the same passcode. Share it once verbally or via secure message — never in the invite code.</p>
            </div>}

            {/* Cloud connection */}
            <div className="section">
              <h3 className="sec-title">Connection</h3>
              <p className="hint">Choose one sync method. Cloud folder is simplest. Self-hosted server gives you full control.</p>

              {/* Method tabs */}
              <div className="sync-method-tabs">
                <button onClick={()=>setShowAdvancedSync(false)} className={`cc-btn ${!showAdvancedSync?"cc-active":""}`}>☁️ Cloud Folder</button>
                <button onClick={()=>setShowAdvancedSync(true)} className={`cc-btn ${showAdvancedSync?"cc-active":""}`}>🖥 Self-Hosted Server</button>
              </div>

              {!showAdvancedSync?(<>
                {/* Cloud folder method */}
                {!cloudConnected?(<>
                  <div className="cloud-setup-steps">
                    <div className="cloud-step"><span className="cloud-step-num">1</span><span>Create a shared folder in Google Drive, Dropbox, iCloud, or OneDrive</span></div>
                    <div className="cloud-step"><span className="cloud-step-num">2</span><span>Tap below — save the sync file into that shared folder</span></div>
                    <div className="cloud-step"><span className="cloud-step-num">3</span><span>Each team member selects the same file on their device</span></div>
                  </div>
                  <button onClick={cloudConnect} className="save-btn" style={{marginTop:12}}>{hasFileSystemAccess?"📁 Connect Cloud Folder":"⚠ Browser Not Supported (use Chrome/Edge)"}</button>
                </>):(<div className="cloud-connected-info">
                  <div className="cloud-connected-icon">☁️</div>
                  <div className="cloud-connected-details">
                    <div className="cloud-connected-file">{cloudFileName}</div>
                    <div className="cloud-connected-meta">{(data._sync&&data._sync.lastSync)&&<span>Last sync: {new Date(data._sync.lastSync).toLocaleString()}</span>}</div>
                  </div>
                  <button onClick={cloudDisconnect} className="cancel-btn" style={{flexShrink:0}}>Disconnect</button>
                </div>)}
              </>):(<>
                {/* Self-hosted server method */}
                <div className="cloud-setup-steps">
                  <div className="cloud-step"><span className="cloud-step-num">1</span><span>Deploy the sync server on your own hardware (see sync-server.js)</span></div>
                  <div className="cloud-step"><span className="cloud-step-num">2</span><span>Enter the server URL and API key below</span></div>
                  <div className="cloud-step"><span className="cloud-step-num">3</span><span>All team members use the same URL, API key, and sync passcode</span></div>
                </div>
                <div className="cf-grid" style={{maxWidth:500,marginTop:12}}>
                  <label className="cf-label">Server URL<input value={getServerUrl()} onChange={e=>setServerConfig(e.target.value,getServerApiKey())} className="cf-input" placeholder="https://your-server.example.com"/></label>
                  <label className="cf-label">API key (if required)<input value={getServerApiKey()} onChange={e=>setServerConfig(getServerUrl(),e.target.value)} className="cf-input" type="password" placeholder="Leave blank if none"/></label>
                </div>
                {getServerUrl()&&<div className="cloud-connected-info" style={{marginTop:12,background:getServerUrl().startsWith("https://")?"#e8f0df":"#fdf0d5",borderColor:getServerUrl().startsWith("https://")?"#b8d4a0":"#f0d5a0"}}>
                  <div className="cloud-connected-icon">🖥</div>
                  <div className="cloud-connected-details">
                    <div className="cloud-connected-file">{getServerUrl()}</div>
                    <div className="cloud-connected-meta">{!getServerUrl().startsWith("https://")&&<span style={{color:"#bc6c25"}}>⚠ HTTPS recommended for production</span>}{(data._sync&&data._sync.lastSync)&&<span>{getServerUrl().startsWith("https://")?"":"  · "}Last sync: {new Date(data._sync.lastSync).toLocaleString()}</span>}</div>
                  </div>
                  <button onClick={()=>setServerConfig("","")} className="cancel-btn" style={{flexShrink:0}}>Remove</button>
                </div>}
              </>)}
            </div>

            {/* THE SYNC BUTTON — works with whichever method is configured */}
            {(cloudConnected||getServerUrl())&&(<div className="sync-main-action">
              <button onClick={syncNow} disabled={cloudSyncing||!getSyncPasscode()} className="cloud-sync-btn">
                {cloudSyncing?<><span className="doc-spinner" style={{borderTopColor:"#fff",borderColor:"rgba(255,255,255,.3)",width:18,height:18}}/>Syncing...</>:"📡 Sync Now"}
              </button>
              <p className="hint" style={{textAlign:"center",marginTop:8}}>Pulls team changes, merges, and pushes your updates — all in one tap.</p>
            </div>)}

            {/* Advanced / Manual Options */}
            <details className="sync-advanced" open={!cloudConnected&&!hasFileSystemAccess}>
              <summary className="sync-advanced-summary">⚙ Manual sync options</summary>
              <div className="sync-advanced-content">
                <p className="hint">Use these if your browser doesn't support cloud sync, or if you prefer to share updates via messaging apps.</p>
                <h4 className="sync-sub-title">⬆ Push</h4>
                <div className="sync-methods">
                  <div className="sync-method-card" onClick={()=>syncPush("clipboard")}>
                    <div className="sync-method-icon">📋</div>
                    <div className="sync-method-info"><strong>Copy to Clipboard</strong><span>Paste into group chat</span></div>
                  </div>
                  <div className="sync-method-card" onClick={()=>syncPush("file")}>
                    <div className="sync-method-icon">💾</div>
                    <div className="sync-method-info"><strong>Download File</strong><span>Drop in shared folder</span></div>
                  </div>
                </div>
                <h4 className="sync-sub-title">⬇ Pull</h4>
                <div className="sync-methods">
                  <div className="sync-method-card" onClick={syncPullFromClipboard}>
                    <div className="sync-method-icon">📋</div>
                    <div className="sync-method-info"><strong>Paste from Clipboard</strong><span>Copy sync data from chat first</span></div>
                  </div>
                  <div className="sync-method-card" onClick={()=>(syncFileRef.current&&syncFileRef.current.click)()}>
                    <div className="sync-method-icon">📁</div>
                    <div className="sync-method-info"><strong>Open File</strong><span>Select a sync file</span></div>
                  </div>
                </div>
                <div className="sync-url-row">
                  <input value={syncPullUrl} onChange={e=>setSyncPullUrl(e.target.value)} className="cf-input" placeholder="https://drive.google.com/..." style={{flex:1}}/>
                  <button onClick={syncPullFromUrl} className="save-btn" disabled={syncPulling} style={{whiteSpace:"nowrap"}}>{syncPulling?"Fetching...":"Pull URL"}</button>
                </div>
                <details className="sync-paste-details" style={{marginTop:12}}>
                  <summary className="sync-paste-summary">Manual paste fallback</summary>
                  <textarea value={syncPullText} onChange={e=>setSyncPullText(e.target.value)} className="notes-ta" rows={3} placeholder='Paste encrypted sync data here...' style={{fontFamily:"monospace",fontSize:11}}/>
                  <button onClick={()=>{if(syncPullText.trim())syncPullFromText(syncPullText.trim())}} className="save-btn" style={{marginTop:8}} disabled={!syncPullText.trim()}>Decrypt & Merge</button>
                </details>
              </div>
            </details>
          </>)}

          {/* ═══ MESSAGES ═══ */}
          {view==="messages"&&(()=>{
            const team=data.settings&&data.settings.team;
            const members=(team&&team.members)||[];
            const did=data.settings&&data.settings.deviceId;
            const myMember=members.find(m=>m.deviceId===did);
            const myName=(data.settings&&data.settings.deviceName)||(myMember&&myMember.name)||"";
            const myRole=(myMember&&myMember.role)||"";
            const teamMembers=members;
            const getMemberInfo=(name)=>teamMembers.find(m=>m.name===name)||null;
            return(<>
            <h1 className="page-title">✉ Care Team Messages</h1>
            <p className="page-sub">{hasTeam()?`${getTeam().name} — caring for ${getTeam().clientName}`:"A shared message board for care team coordination. Syncs via encrypted backup or team sync."}</p>
            {!isClient&&<div className="msg-compose">
              {hasTeam()?(<div className="msg-sender"><div className="team-member-avatar" style={{width:28,height:28,fontSize:13}}>{myName?myName[0].toUpperCase():"?"}</div><span className="msg-sender-name">{myName}{myRole&&<span className="msg-sender-role"> · {myRole}</span>}</span></div>
              ):(<input value={msgFrom} onChange={e=>setMsgFrom(e.target.value)} placeholder="Your name" className="cf-input" style={{width:160}}/>)}
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(hasTeam()?myName:msgFrom.trim())&&msgText.trim()&&sendMessage()} placeholder="Type a message…" className="cf-input" style={{flex:1}}/>
              <button onClick={()=>{if(hasTeam()&&myName){setMsgFrom(myName)}sendMessage()}} disabled={!msgText.trim()||!(hasTeam()?myName:msgFrom.trim())} className="save-btn" style={{opacity:msgText.trim()&&(hasTeam()?myName:msgFrom.trim())?1:.4}}>Send</button>
            </div>}
            <div className="msg-list">
              {(data.messages||[]).length===0?<p className="contacts-empty">No messages yet.{!hasTeam()?" Set up a care team in the Sync tab to get started.":""}</p>:
                [...(data.messages||[])].reverse().map(m=>{const member=getMemberInfo(m.from);const isMe=m.from===myName;return(<div key={m.id} className={`msg-bubble ${isMe?"msg-self":""}`}>
                  <div className="msg-meta">
                    {member&&<div className="team-member-avatar" style={{width:24,height:24,fontSize:11,background:isMe?"#457b9d":"#8d99ae"}}>{m.from[0].toUpperCase()}</div>}
                    <strong>{m.from}</strong>{member&&<span className="msg-role">{member.role}</span>}
                    <span className="msg-time">{m.timestamp}</span>
                  </div>
                  <p className="msg-text">{m.text}</p>
                </div>)})}
            </div>
          </>)})()}

          {/* ═══ SETTINGS ═══ */}
          {view==="settings"&&(<>
            <h1 className="page-title">⚙ Settings</h1>
            {isClient?<p className="page-sub">Settings are only available to caregivers.</p>:(<>
              <p className="page-sub">Manage passcodes, export backups, and import health records.</p>
              <div className="section"><h3 className="sec-title">🗺 State / Region</h3>
                <p className="hint">Choose your state for localized Medicaid thresholds, legal citations, program names, and resources. Generic mode provides universal guidance with no state-specific details.</p>
                <div className="state-selector">
                  {AVAILABLE_STATES.map(s=>(<button key={s.code} onClick={()=>switchState(s.code)} className={`state-btn ${((data.settings&&data.settings.stateCode)||"")===s.code?"state-btn-active":""}`}>{s.code?("🏛 "+s.name):("🌐 "+s.name)}</button>))}
                </div>
                <p className="hint" style={{marginTop:8}}>Current mode: <strong>{(data.settings&&data.settings.stateCode)?(AVAILABLE_STATES.find(s=>s.code===(data.settings&&data.settings.stateCode))||{}).name:"Generic"}</strong>{(data.settings&&data.settings.stateCode)?" — state-specific goals, citations, and thresholds are active.":" — universal guidance, no state-specific information."}</p>
              </div>
              {can("change-passcodes")&&<div className="section"><h3 className="sec-title">Passcodes</h3>
                <div className="cf-grid" style={{maxWidth:400}}>
                  <label className="cf-label">Caregiver passcode<input value={newCaregiverPw} onChange={e=>setNewCaregiverPw(e.target.value)} className="cf-input" placeholder="New caregiver passcode"/></label>
                  <label className="cf-label">Client (read-only) passcode<input value={newClientPw} onChange={e=>setNewClientPw(e.target.value)} className="cf-input" placeholder="New client passcode"/></label>
                </div>
                <button onClick={updatePasscodes} className="save-btn" style={{marginTop:12}}>Update Passcodes</button>
              </div>
              }<div className="section"><h3 className="sec-title">Tab Order</h3>
                <p className="hint">Rearrange navigation tabs using the ↑ ↓ buttons. Both the tab bar and sidebar follow this order.</p>
                <div className="tab-order-list">
                  {orderedTabs.map((t,i)=>(<div key={t.key} className="tab-order-item">
                    <span className="tab-order-icon" style={{color:t.color||"#8d99ae"}}>{t.icon}</span>
                    <span className="tab-order-label">{t.label}</span>
                    <div className="tab-order-btns">
                      <button onClick={()=>moveTab(t.key,-1)} disabled={i===0} className="tab-order-btn" title="Move up">↑</button>
                      <button onClick={()=>moveTab(t.key,1)} disabled={i===orderedTabs.length-1} className="tab-order-btn" title="Move down">↓</button>
                    </div>
                  </div>))}
                </div>
                <button onClick={resetTabOrder} className="edit-btn" style={{marginTop:8}}>Reset to Default Order</button>
              </div>
              <div className="section"><h3 className="sec-title">📡 Device Identity & Sync</h3>
                <p className="hint">Each device has a unique ID used during sync. Set a name so team members know whose backup is whose.</p>
                <div className="cf-grid" style={{maxWidth:400}}>
                  <label className="cf-label">Device name<input value={(data.settings&&data.settings.deviceName)||""} onChange={e=>setData(p=>({...p,settings:{...p.settings,deviceName:e.target.value}}))} className="cf-input" placeholder="e.g., David's phone, Sarah's laptop"/></label>
                  <label className="cf-label">Device ID<input value={(data.settings&&data.settings.deviceId)||""} readOnly className="cf-input" style={{color:"#a09a92",fontSize:12}}/></label>
                </div>
                {(data._sync&&data._sync.lastMerge)&&<p className="hint" style={{marginTop:8}}>Last merge: {new Date(data._sync.lastMerge).toLocaleString()} from {data._sync.mergedFromName||data._sync.mergedFrom||"unknown"}</p>}
              </div>
              <div className="section"><h3 className="sec-title">🔒 Security &amp; Integrity</h3>
                <div className="integrity-row">
                  <span className="integrity-label">Audit log integrity</span>
                  {auditChainStatus?(
                    auditChainStatus.status==="ok"?<span className="integrity-val ok">✓ Verified — {auditChainStatus.chained} entries, chain intact</span>:
                    auditChainStatus.status==="broken"?<span className="integrity-val bad">⚠ Tampering detected at entry #{auditChainStatus.brokenAtSeq}</span>:
                    auditChainStatus.status==="truncated"?<span className="integrity-val bad">⚠ Recent entries appear to have been removed</span>:
                    <span className="integrity-val muted">No chained entries yet</span>
                  ):<span className="integrity-val muted">—</span>}
                </div>
                <p className="hint" style={{marginTop:2}}>Each audit entry is hash-chained to the one before it, so deleting or altering an entry is detectable. (Tamper-evidence, not absolute prevention — anyone with the passcode could recompute the chain.)</p>
                <div className="integrity-row" style={{marginTop:10}}>
                  <span className="integrity-label">Storage durability</span>
                  {storageAtRisk?<span className="integrity-val bad">⚠ Not granted — eviction possible. Keep backups.</span>:<span className="integrity-val ok">✓ Persistent storage granted</span>}
                </div>
                {storageInfo&&<p className="hint" style={{marginTop:2}}>Using {(storageInfo.usage/1048576).toFixed(1)} MB of {(storageInfo.quota/1048576).toFixed(0)} MB available ({storageInfo.pct}%).{storageInfo.pct>=80?" Storage is getting full — make a backup and consider archiving old documents.":""}</p>}
                <div className="integrity-row" style={{marginTop:10}}>
                  <span className="integrity-label">Client access</span>
                  {(()=>{const ko=loadWrappedKeys();const scoped=!!(ko&&ko.wk&&ko.wk.clientScope==="r");return scoped?(<span className="integrity-val ok">🔒 Cryptographically scoped — the client passcode cannot decrypt private data</span>):(<span className="integrity-val muted">Full-key access ({(data.settings&&data.settings.clientTier)==="client-full"?"independent tier":"scoping applies at the client's next sign-in"})</span>)})()}
                </div>
                <p className="hint" style={{marginTop:2}}>With the supported tier, the client passcode unlocks only a projection of client-visible information (schedule, medications, messages, self-reports, care domains). Legal, financial, incident, and planning data are encrypted under a key that passcode does not hold.</p>
                <div className="integrity-row" style={{marginTop:10}}>
                  <span className="integrity-label">Client voice protection</span>
                  {srChainStatus===null?(<span className="integrity-val muted">—</span>):srChainStatus.status==="ok"?(<span className="integrity-val ok">✓ {srChainStatus.chained} client update{srChainStatus.chained===1?"":"s"} chained and intact</span>):srChainStatus.status==="none"?(<span className="integrity-val muted">No client updates yet</span>):srChainStatus.status==="truncated"?(<span className="integrity-val bad">⚠ Recent client updates appear to have been removed</span>):(<span className="integrity-val bad">⚠ Chain broken at #{srChainStatus.at} — a client update was altered or deleted</span>)}
                </div>
                <p className="hint" style={{marginTop:2}}>Client-authored updates are permanent: no role can delete or edit them in the app, and each is hash-chained so out-of-band tampering is detectable here and in the client's own view.</p>
                {outboxOversized>0&&(<div className="integrity-row" style={{marginTop:10}}>
                  <span className="integrity-label">Pending client updates</span>
                  <span className="integrity-val bad">⚠ Unusually large ({mb(outboxOversized)} MB) — quarantined, not loaded. This can mean a corrupted or tampered device. <button className="mini-btn" onClick={async()=>{if(window.confirm("Discard the pending (quarantined) client updates? Anything the client submitted since the last caregiver sign-in will be lost.")){await clearOutbox();setOutboxOversized(0);hipaaAudit("delete","Quarantined oversized outbox discarded","security");flash("Quarantined outbox discarded.")}}}>Review & discard</button></span>
                </div>)}
                <div className="integrity-row" style={{marginTop:12}}>
                  <span className="integrity-label">Multi-factor sign-in (passkey)</span>
                  {mfaEnabled()?<span className="integrity-val ok">✓ On</span>:<span className="integrity-val muted">Off</span>}
                </div>
                {isProfessionalRole?(
                  mfaEnabled()?(<>
                    <p className="hint" style={{marginTop:2}}>This sign-in requires your passcode <em>and</em> your passkey. Neither alone can open the vault. {(loadWrappedKeys()&&loadWrappedKeys().wk&&loadWrappedKeys().wk.cRecovery)?"Keep your recovery code somewhere safe — it's the backstop if you lose the passkey.":"Recovery is passkey-only — make sure you have at least two registered passkeys."}</p>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
                      <button className="mini-btn" onClick={startAddPasskey}>Add backup passkey</button>
                      {(loadWrappedKeys()&&loadWrappedKeys().wk&&loadWrappedKeys().wk.cRecovery)&&<button className="mini-btn" onClick={()=>{const pc=prompt("Confirm your caregiver passcode to issue a new recovery code:");if(pc)regenerateRecoveryCode(pc)}}>New recovery code</button>}
                      {(loadWrappedKeys()&&loadWrappedKeys().wk&&loadWrappedKeys().wk.cRecovery&&getMfaKeyEntries(loadWrappedKeys()).length>=2)&&<button className="mini-btn" onClick={removeRecoveryCode}>Remove recovery code</button>}
                      <button className="mini-btn" onClick={()=>setMfaDisable(true)}>Turn off MFA</button>
                    </div>
                  </>):(<>
                    <p className="hint" style={{marginTop:2}}>Recommended for professional / covered-entity use. Adds a passkey (Face ID, Touch ID, Windows Hello, or a security key) as a required second factor, satisfying MFA expectations for ePHI access. You'll get a one-time recovery code so a lost device isn't catastrophic.{!webauthnAvailable()?" (This browser doesn't support passkeys.)":""}</p>
                    <button className="mini-btn" style={{marginTop:6}} onClick={startMfaEnroll} disabled={!webauthnAvailable()}>Enable MFA…</button>
                  </>)
                ):<p className="hint" style={{marginTop:2}}>Multi-factor sign-in is available for professional roles (Admin, Care Professional).</p>}
              </div>
              <div className="section"><h3 className="sec-title">🛟 Continuous Backup</h3>
                <p className="hint">Automatically save an encrypted copy to a file on your device or cloud folder every time your data changes — so a browser clearing its storage never costs you your records. {hasFileSystemAccess?"":"(Requires Chrome, Edge, or Brave. On this browser, use manual backup below.)"}</p>
                {backupStatus==="active"&&(<div className="backup-status backup-active">
                  <span className="backup-dot"></span>
                  <div className="backup-status-body"><strong>Active</strong> — saving automatically to <code>{backupFileName||"your backup file"}</code>{lastAutoBackupAt&&<span className="backup-when">last saved {new Date(lastAutoBackupAt).toLocaleTimeString()}</span>}</div>
                  <button onClick={disableContinuousBackup} className="backup-link">Turn off</button>
                </div>)}
                {backupStatus==="paused"&&(<div className="backup-status backup-paused">
                  <span className="backup-dot"></span>
                  <div className="backup-status-body"><strong>Paused</strong> — your browser cleared this session's permission to write the backup file. This is expected each time you reopen the app.</div>
                  <button onClick={resumeBackup} className="backup-btn" disabled={backupBusy}>Resume</button>
                </div>)}
                {backupStatus==="off"&&hasFileSystemAccess&&can("export-data")&&(<div className="settings-row">
                  <input value={backupPw} onChange={e=>setBackupPw(e.target.value)} className="cf-input" placeholder="Choose a backup passcode (min 6)" type="password" style={{width:240}}/>
                  <button onClick={setupContinuousBackup} className="save-btn" disabled={backupBusy} style={{background:"#457b9d"}}>🛟 Set up continuous backup</button>
                </div>)}
                {backupStatus==="off"&&<p className="hint" style={{marginTop:8,fontStyle:"italic"}}>Remember your backup passcode — it's what restores your data if the browser clears it. The backup file is fully encrypted, so storing it in iCloud, Google Drive, or Dropbox is safe.</p>}
                {backupStatus!=="off"&&<p className="hint" style={{marginTop:8,fontStyle:"italic"}}>Note: browser security requires you to re-authorize file access each session — the unlock is one click when you see "Resume." Your manual backup below always works as a fallback.</p>}
              </div>
              <div className="section"><h3 className="sec-title">Encrypted Backup & Sync</h3>
                <p className="hint">Export your data with AES-256-GCM encryption. Import merges intelligently — new items are added, more recent changes win. Your passcodes and device ID are never overwritten.</p>
                <div className="settings-row"><input value={exportPw} onChange={e=>setExportPw(e.target.value)} className="cf-input" placeholder="Export passcode" type="password" style={{width:200}}/><button onClick={handleEncryptedExport} className="save-btn">↓ Export Encrypted</button></div>
                <div className="settings-row" style={{marginTop:12}}><input value={importPw} onChange={e=>setImportPw(e.target.value)} className="cf-input" placeholder="Import passcode" type="password" style={{width:200}}/><button onClick={()=>(importFileRef.current&&importFileRef.current.click)()} className="save-btn" style={{background:"#457b9d"}}>↑ Import & Merge</button></div>
                <p className="hint" style={{marginTop:12}}>Workflow: team member exports → shares file via text/Signal/AirDrop/Drive → you import → merge preview shows changes → you confirm.</p>
              </div>
              <div className="section"><h3 className="sec-title">Summary Export (No PHI)</h3>
                <p className="hint">Exports domain names, status, and progress only. No contacts, notes, or health information.</p>
                <button onClick={handleNonSensitiveExport} className="edit-btn" style={{marginTop:0}}>↓ Export Summary</button>
              </div>
              <div className="section"><h3 className="sec-title">Import Health Records (FHIR R4)</h3>
                <p className="hint">Import a FHIR R4 JSON Bundle to extract practitioners, conditions, and medications.</p>
                <button onClick={()=>(fhirFileRef.current&&fhirFileRef.current.click)()} className="edit-btn" style={{marginTop:0}}>↑ Import FHIR Bundle</button>
              </div>
              <div className="section"><h3 className="sec-title">Data</h3>
                <p className="hint">Storage key: {SKEY} · Device: {(data.settings&&data.settings.deviceName)||(data.settings&&data.settings.deviceId)||"unnamed"} · Contacts: {(data.contacts&&data.contacts.length)||0} · Appointments: {(data.appointments&&data.appointments.length)||0} · Messages: {(data.messages&&data.messages.length)||0} · Incidents: {(data.incidents&&data.incidents.length)||0} · Expenses: {(data.expenses&&data.expenses.length)||0} · Meds: {getMedSchedule().medications.length} · Self-reports: {(data.selfReports&&data.selfReports.length)||0} · Docs: {(data.savedDocs&&data.savedDocs.length)||0}</p>
              </div>
            </>)}
          </>)}

          {/* ═══ DOCUMENTS ═══ */}
          {view==="documents"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">📄 Document Scanner</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Upload PDFs or text files. Medications and lab results are extracted automatically — no data leaves your device.</p></div>
              {!isClient&&<button onClick={()=>(docFileRef.current&&docFileRef.current.click)()} className="save-btn" disabled={docProcessing}>{docProcessing?"Processing…":"↑ Upload Document"}</button>}
            </div>

            {/* saved documents library */}
            {((data.savedDocs&&data.savedDocs.length)||0)>0&&!docResult&&!viewingDoc&&(<div className="section">
              <h3 className="sec-title">Document Library ({data.savedDocs.length})</h3>
              <div className="cc-group" style={{marginBottom:12}}>
                <span className="cc-label">Category:</span>
                {DOC_CATEGORIES.map(c=>(<button key={c.key} onClick={()=>setDocCatFilter(c.key)} className={`cc-btn ${docCatFilter===c.key?"cc-active":""}`}>{c.icon} {c.label}</button>))}
              </div>
              <div className="contacts-list">{getFilteredDocs().map(doc=>{const cat=DOC_CATEGORIES.find(c=>c.key===doc.category);return(
                <div key={doc.id} className="contact-row" style={{cursor:"pointer"}} onClick={()=>setViewingDoc(doc.id)}>
                  <span style={{fontSize:20}}>{(cat&&cat.icon)||"📄"}</span>
                  <div className="contact-info">
                    <div className="contact-name">{doc.fileName}</div>
                    <div className="contact-role">{(cat&&cat.label)||doc.category} · {doc.date}{doc.medCount?` · ${doc.medCount} meds`:""}{doc.labCount?` · ${doc.labCount} labs`:""}</div>
                  </div>
                  {!isClient&&<button onClick={e=>{e.stopPropagation();deleteDoc(doc.id)}} className="remove-sub">×</button>}
                </div>)})}</div>
            </div>)}

            {/* document viewer */}
            {viewingDoc&&(()=>{const doc=(data.savedDocs||[]).find(d=>d.id===viewingDoc);if(!doc)return null;const cat=DOC_CATEGORIES.find(c=>c.key===doc.category);return(
              <div className="section">
                <div className="contacts-header" style={{marginBottom:16}}>
                  <div>
                    <h3 className="sec-title" style={{margin:0}}>{(cat&&cat.icon)||"📄"} {doc.fileName}</h3>
                    <p className="hint" style={{margin:"4px 0 0"}}>{(cat&&cat.label)} · Saved {doc.date}</p>
                  </div>
                  <button onClick={()=>setViewingDoc(null)} className="cancel-btn">← Back to Library</button>
                </div>

                {(doc.medications&&doc.medications.length)>0&&(<div style={{marginBottom:20}}>
                  <h4 className="sync-sub-title">💊 Medications ({doc.medications.length})</h4>
                  <div className="doc-table-wrap"><table className="doc-table">
                    <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Route</th><th>Notes</th></tr></thead>
                    <tbody>{doc.medications.map((m,i)=>(<tr key={i}><td>{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.route}</td><td>{m.notes}</td></tr>))}</tbody>
                  </table></div>
                </div>)}

                {(doc.labs&&doc.labs.length)>0&&(<div style={{marginBottom:20}}>
                  <h4 className="sync-sub-title">🔬 Lab Results ({doc.labs.length})</h4>
                  <div className="doc-table-wrap"><table className="doc-table">
                    <thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Range</th><th>Flag</th><th>Notes</th></tr></thead>
                    <tbody>{doc.labs.map((l,i)=>(<tr key={i} className={l.flag?"doc-flagged":""}><td>{l.test}</td><td>{l.value}</td><td>{l.unit}</td><td>{l.range}</td><td>{l.flag}</td><td>{l.notes}</td></tr>))}</tbody>
                  </table></div>
                </div>)}

                {(doc.sections&&doc.sections.length)>0&&(<div style={{marginBottom:20}}>
                  <h4 className="sync-sub-title">📋 Sections</h4>
                  {doc.sections.map((s,i)=>(<div key={i} className="doc-section-card"><h4 className="doc-section-title">{s.title}</h4><p className="doc-section-body">{s.body}</p></div>))}
                </div>)}

                {doc.rawText&&(<details className="doc-raw-details"><summary className="doc-raw-summary">View raw extracted text</summary>
                  <pre className="doc-raw-text">{doc.rawText}</pre>
                </details>)}
              </div>);})()}

            {docProcessing&&<div className="doc-processing"><div className="doc-spinner"/>Extracting text and parsing document…</div>}

            {docResult&&(<>
              {/* detected type + category selector + save to library */}
              <div className="doc-type-row">
                <div className="doc-type-badge">{docResult.docType.icon} Detected: <strong>{docResult.docType.label}</strong> · {docResult.fileName}</div>
                {!isClient&&<div className="doc-save-row">
                  <select value={docSaveCategory} onChange={e=>setDocSaveCategory(e.target.value)} className="cf-input" style={{width:180,fontSize:13}}>
                    {DOC_CATEGORIES.filter(c=>c.key!=="all").map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                  </select>
                  <button onClick={()=>saveDocToLibrary()} className="save-btn" style={{fontSize:13,padding:"7px 14px"}}>Save to Library</button>
                </div>}
              </div>

              {/* medication table */}
              {docMeds.length>0&&(<div className="section">
                <h3 className="sec-title">💊 Extracted Medications ({docMeds.length})</h3>
                <p className="hint">Review and edit the table below, then save to your care notes.</p>
                <div className="doc-table-wrap"><table className="doc-table">
                  <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Route</th><th>Notes</th>{!isClient&&<th></th>}</tr></thead>
                  <tbody>{docMeds.map(m=>(<tr key={m.id}>
                    <td>{isClient?m.name:<input value={m.name} onChange={e=>updateDocMed(m.id,"name",e.target.value)} className="doc-cell-input"/>}</td>
                    <td>{isClient?m.dosage:<input value={m.dosage} onChange={e=>updateDocMed(m.id,"dosage",e.target.value)} className="doc-cell-input doc-cell-sm"/>}</td>
                    <td>{isClient?m.frequency:<input value={m.frequency} onChange={e=>updateDocMed(m.id,"frequency",e.target.value)} className="doc-cell-input"/>}</td>
                    <td>{isClient?m.route:<input value={m.route} onChange={e=>updateDocMed(m.id,"route",e.target.value)} className="doc-cell-input doc-cell-sm"/>}</td>
                    <td>{isClient?m.notes:<input value={m.notes} onChange={e=>updateDocMed(m.id,"notes",e.target.value)} className="doc-cell-input" placeholder="Add note…"/>}</td>
                    {!isClient&&<td><button onClick={()=>removeDocMed(m.id)} className="remove-sub">×</button></td>}
                  </tr>))}</tbody>
                </table></div>
                {!isClient&&<div className="doc-table-actions">
                  <button onClick={addDocMed} className="add-sub-trigger" style={{width:"auto",display:"inline-block",padding:"6px 14px"}}>+ Add Row</button>
                  <button onClick={saveMedsToNotes} className="save-btn">Save Medications to {getDomLabel("physical")}</button>
                </div>}
              </div>)}

              {/* lab results table */}
              {docLabs.length>0&&(<div className="section">
                <h3 className="sec-title">🔬 Extracted Lab Results ({docLabs.length})</h3>
                <p className="hint">Review values, flags, and reference ranges. Save to care notes when ready.</p>
                <div className="doc-table-wrap"><table className="doc-table">
                  <thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th><th>Notes</th>{!isClient&&<th></th>}</tr></thead>
                  <tbody>{docLabs.map(l=>(<tr key={l.id} className={l.flag?"doc-flagged":""}>
                    <td>{isClient?l.test:<input value={l.test} onChange={e=>updateDocLab(l.id,"test",e.target.value)} className="doc-cell-input"/>}</td>
                    <td>{isClient?l.value:<input value={l.value} onChange={e=>updateDocLab(l.id,"value",e.target.value)} className="doc-cell-input doc-cell-sm"/>}</td>
                    <td>{isClient?l.unit:<input value={l.unit} onChange={e=>updateDocLab(l.id,"unit",e.target.value)} className="doc-cell-input doc-cell-xs"/>}</td>
                    <td>{isClient?l.range:<input value={l.range} onChange={e=>updateDocLab(l.id,"range",e.target.value)} className="doc-cell-input doc-cell-sm"/>}</td>
                    <td>{isClient?l.flag:<input value={l.flag} onChange={e=>updateDocLab(l.id,"flag",e.target.value)} className="doc-cell-input doc-cell-xs"/>}</td>
                    <td>{isClient?l.notes:<input value={l.notes} onChange={e=>updateDocLab(l.id,"notes",e.target.value)} className="doc-cell-input" placeholder="Note…"/>}</td>
                    {!isClient&&<td><button onClick={()=>removeDocLab(l.id)} className="remove-sub">×</button></td>}
                  </tr>))}</tbody>
                </table></div>
                {!isClient&&<div className="doc-table-actions">
                  <button onClick={saveLabsToNotes} className="save-btn">Save Lab Results to {getDomLabel("physical")}</button>
                </div>}
              </div>)}

              {/* clinical note sections */}
              {(docResult.sections&&docResult.sections.length)>0&&docResult.docType.key==="clinical"&&(<div className="section">
                <h3 className="sec-title">📋 Clinical Note Sections</h3>
                {docResult.sections.map((s,i)=>(<div key={i} className="doc-section-card"><h4 className="doc-section-title">{s.title}</h4><p className="doc-section-body">{s.body}</p></div>))}
                {!isClient&&<div className="doc-table-actions"><label className="cf-label" style={{flexDirection:"row",alignItems:"center",gap:8}}>Save full text to:
                  <select className="cf-input" style={{width:180}} onChange={e=>{if(e.target.value)saveRawTextToNotes(e.target.value);e.target.value=""}}><option value="">Select domain…</option>{DOMAINS.map(d=><option key={d.key} value={d.key}>{d.icon} {getDomLabel(d.key)}</option>)}</select>
                </label></div>}
              </div>)}

              {/* no structured data found */}
              {docMeds.length===0&&docLabs.length===0&&(docResult.docType.key!=="clinical"||!(docResult.sections&&docResult.sections.length))&&(
                <div className="section">
                  <h3 className="sec-title">Raw Extracted Text</h3>
                  <p className="hint">No structured medications or lab results were detected. You can save the raw text to a care domain.</p>
                  <pre className="doc-raw-text">{docResult.rawText.slice(0,3000)}{docResult.rawText.length>3000?"…(truncated)":""}</pre>
                  {!isClient&&<div className="doc-table-actions"><label className="cf-label" style={{flexDirection:"row",alignItems:"center",gap:8}}>Save to:
                    <select className="cf-input" style={{width:180}} onChange={e=>{if(e.target.value)saveRawTextToNotes(e.target.value);e.target.value=""}}><option value="">Select domain…</option>{DOMAINS.map(d=><option key={d.key} value={d.key}>{d.icon} {getDomLabel(d.key)}</option>)}</select>
                  </label></div>}
                </div>
              )}

              {/* always show raw text toggle */}
              {(docMeds.length>0||docLabs.length>0)&&(<details className="doc-raw-details"><summary className="doc-raw-summary">View raw extracted text</summary>
                <pre className="doc-raw-text">{docResult.rawText.slice(0,3000)}{docResult.rawText.length>3000?"…(truncated)":""}</pre>
                {!isClient&&<div className="doc-table-actions" style={{marginTop:8}}><label className="cf-label" style={{flexDirection:"row",alignItems:"center",gap:8}}>Save raw text to:
                  <select className="cf-input" style={{width:180}} onChange={e=>{if(e.target.value)saveRawTextToNotes(e.target.value);e.target.value=""}}><option value="">Select domain…</option>{DOMAINS.map(d=><option key={d.key} value={d.key}>{d.icon} {getDomLabel(d.key)}</option>)}</select>
                </label></div>}
              </details>)}
            </>)}

            {!docResult&&!docProcessing&&(<div className="contacts-empty">
              <p style={{fontSize:16,marginBottom:8}}>📄 Upload a PDF or text file to get started.</p>
              <p>Supported: medication lists, lab results, clinical notes, and general documents.</p>
              <p style={{marginTop:12,fontSize:12.5,color:"#a09a92"}}>Text-based PDFs are extracted automatically. Scanned documents may require manual entry.<br/>All processing happens locally in your browser — nothing is uploaded or sent anywhere.</p>
            </div>)}
          </>)}

          {/* ═══ CONTACTS (list) ═══ */}
          {view==="contacts"&&!contactDetail&&(<>
            <div className="contacts-header"><div><h1 className="page-title">☷ Care Team Contacts</h1></div>
              {!isClient&&<div className="contacts-header-actions"><button onClick={()=>(fileRef.current&&fileRef.current.click)()} className="edit-btn" style={{marginTop:0}}>↑ Import vCard</button><button onClick={()=>setContactForm({mode:"add",contact:{...EMPTY_CONTACT}})} className="save-btn">+ Add</button></div>}
            </div>
            <div className="contacts-controls">
              <div className="cc-group"><span className="cc-label">Sort:</span><button onClick={()=>setContactSort("category")} className={`cc-btn ${contactSort==="category"?"cc-active":""}`}>Category</button><button onClick={()=>setContactSort("alpha")} className={`cc-btn ${contactSort==="alpha"?"cc-active":""}`}>A → Z</button></div>
              <div className="cc-group"><span className="cc-label">Filter:</span><button onClick={()=>setContactFilter("all")} className={`cc-btn ${contactFilter==="all"?"cc-active":""}`}>All</button>{CONTACT_CATS.map(c=>(<button key={c.key} onClick={()=>setContactFilter(c.key)} className={`cc-btn ${contactFilter===c.key?"cc-active":""}`}>{c.icon} {c.label}</button>))}</div>
            </div>
            {getSortedContacts().length===0?<div className="contacts-empty"><p>{((data.contacts&&data.contacts.length)||0)===0?"No contacts yet.":"No contacts match this filter."}</p></div>:
              <div className="contacts-list">{contactSort==="category"&&contactFilter==="all"?CONTACT_CATS.map(cat=>{const items=getSortedContacts().filter(c=>c.category===cat.key);if(!items.length)return null;return(<div key={cat.key} className="contact-group"><h3 className="contact-group-title" style={{color:cat.color}}>{cat.icon} {cat.label}</h3>{items.map(c=>(<button key={c.id} className="contact-row" onClick={()=>setContactDetail(c.id)}><div className="contact-avatar" style={{background:cat.color}}>{c.name.charAt(0).toUpperCase()}</div><div className="contact-info"><div className="contact-name">{c.name}</div><div className="contact-role">{[c.role,c.org].filter(Boolean).join(" · ")||"—"}</div></div><span className="contact-arrow">›</span></button>))}</div>)}):getSortedContacts().map(c=>{const cat=CONTACT_CATS.find(x=>x.key===c.category);return(<button key={c.id} className="contact-row" onClick={()=>setContactDetail(c.id)}><div className="contact-avatar" style={{background:(cat&&cat.color)||"#8d99ae"}}>{c.name.charAt(0).toUpperCase()}</div><div className="contact-info"><div className="contact-name">{c.name}</div><div className="contact-role">{[c.role,c.org].filter(Boolean).join(" · ")||(cat&&cat.label)}</div></div><span className="contact-arrow">›</span></button>)})}</div>}
          </>)}

          {/* ═══ CONTACT DETAIL ═══ */}
          {view==="contacts"&&contactDetail&&detailContact&&(<>
            <button onClick={()=>setContactDetail(null)} className="back-link">← All Contacts</button>
            <div className="cd-header" style={{borderLeftColor:(detailCat&&detailCat.color)||"#8d99ae"}}><div className="contact-avatar cd-avatar" style={{background:(detailCat&&detailCat.color)||"#8d99ae"}}>{detailContact.name.charAt(0).toUpperCase()}</div>
              <div style={{flex:1}}><h1 className="page-title" style={{margin:0}}>{detailContact.name}</h1><p className="cd-meta">{[detailContact.role,detailContact.org].filter(Boolean).join(" · ")}</p><span className="o-badge" style={{background:((detailCat&&detailCat.color)||"#8d99ae")+"18",color:(detailCat&&detailCat.color)}}>{(detailCat&&detailCat.icon)} {(detailCat&&detailCat.label)}</span></div>
            </div>
            <div className="cd-info-grid">
              {detailContact.phone&&<div className="cd-info-item"><span className="cd-info-label">Phone</span><span className="cd-info-value">{detailContact.phone}</span></div>}
              {detailContact.email&&<div className="cd-info-item"><span className="cd-info-label">Email</span><span className="cd-info-value">{detailContact.email}</span></div>}
              {(detailContact.customFields||[]).map((cf,i)=>(<div key={i} className="cd-info-item"><span className="cd-info-label">{cf.label}</span><span className="cd-info-value">{cf.value||"—"}</span></div>))}
            </div>
            {!isClient&&<div className="cd-actions"><button onClick={()=>setContactForm({mode:"edit",contact:{...detailContact,customFields:[...(detailContact.customFields||[])]},id:detailContact.id})} className="edit-btn" style={{marginTop:0}}>✎ Edit</button><button onClick={()=>{if(window.confirm(`Remove ${detailContact.name}?`))deleteContact(detailContact.id)}} className="cd-delete-btn">Remove</button></div>}
            <div className="section"><h3 className="sec-title">Notes Received</h3>
              {!isClient&&<div className="cd-note-add"><textarea value={contactNoteText} onChange={e=>setContactNoteText(e.target.value)} className="notes-ta" rows={2} placeholder="Note from this contact…"/><button onClick={()=>addContactNote(detailContact.id,contactNoteText)} disabled={!contactNoteText.trim()} className="save-btn" style={{marginTop:8,opacity:contactNoteText.trim()?1:.4}}>Save Note</button></div>}
              {(detailContact.notes&&detailContact.notes.length)>0?<div className="cd-notes-list">{detailContact.notes.map((n,i)=>(<div key={i} className="cd-note-card"><div className="cd-note-top"><span className="cd-note-date">{n.date}</span>{!isClient&&<button onClick={()=>deleteContactNote(detailContact.id,i)} className="remove-sub">×</button>}</div><p className="cd-note-text">{n.text}</p></div>))}</div>:<p className="contacts-empty" style={{marginTop:12}}>No notes yet.</p>}
            </div>
          </>)}

          {/* ═══ DOMAIN DETAIL ═══ */}
          {activeDom&&activeData&&(()=>{const prog=getProgress(activeDom.key);const pulseColor=prog.recency>=75?"#718355":prog.recency>=40?"#bc6c25":"#b56576";return(<>
            <div className="domain-header" style={{borderLeftColor:activeDom.color,background:activeDom.bg}}>
              <div className="domain-header-top"><div>
                <div className="domain-title-row"><h1 className="page-title" style={{margin:0}}>{activeDom.icon} {getDomLabel(activeDom.key)}</h1>{!isClient&&<button className="edit-icon edit-icon-visible" onClick={()=>setEditingDomain({key:activeDom.key,label:getDomLabel(activeDom.key),desc:getDomDesc(activeDom.key)})}>✎</button>}</div>
                <p className="page-sub" style={{margin:"6px 0 0"}}>{getDomDesc(activeDom.key)}</p>
              </div><div className="domain-pct" style={{color:activeDom.color}}>{prog.pct}%</div></div>
              <div className="dual-track" style={{marginTop:14}}>
                <div className="dual-track-row"><span className="dual-track-label">☐ Foundation</span><div className="prog-track"><div className="prog-fill" style={{width:`${prog.pct}%`,background:activeDom.color}}/></div><span className="prog-label">{prog.done}/{prog.total} one-time</span></div>
                {prog.ongoingTotal>0&&<div className="dual-track-row"><span className="dual-track-label" style={{color:pulseColor}}>↻ Care Pulse</span><div className="prog-track"><div className="prog-fill" style={{width:`${prog.recency}%`,background:pulseColor}}/></div><span className="prog-label" style={{color:pulseColor}}>{prog.ongoingOk}/{prog.ongoingTotal} current</span></div>}
              </div>
              <div className="type-legend"><span className="type-legend-item"><span style={{color:"#457b9d"}}>☐</span> One-time</span><span className="type-legend-item"><span style={{color:"#bc6c25"}}>↻</span> Recurring</span><span className="type-legend-item"><span style={{color:"#718355"}}>◉</span> Monitoring</span></div>
            </div>

            <div className="section"><h3 className="sec-title">Guided Steps</h3>
              <div className="goals-wrap">{activeDom.goals.map((goal,gi)=>{const gd=activeData.goals[gi];const sp=getSubProgress(activeDom.key,gi);const isOpen=expanded[gi];return(
                <div key={gi} className="goal-card" style={{borderLeftColor:gd.done?"#718355":activeDom.color,background:gd.done?"#f9fcf6":"#fff"}}>
                  <div className="goal-head" onClick={()=>toggle(gi)}>
                    {!isClient&&<input type="checkbox" checked={gd.done} onChange={e=>{e.stopPropagation();toggleGoal(activeDom.key,gi)}} className="goal-check"/>}
                    {isClient&&<span style={{width:20,textAlign:"center",flexShrink:0}}>{gd.done?"✓":"○"}</span>}
                    <div style={{flex:1,minWidth:0}}>
                      {!isClient&&(editing&&editing.type)==="goal"&&editing.gi===gi?(
                        <div className="inline-edit" onClick={e=>e.stopPropagation()}><input ref={editRef} value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")cancelEdit()}} className="inline-edit-input"/><button onClick={saveEdit} className="inline-edit-save">✓</button><button onClick={cancelEdit} className="inline-edit-cancel">✕</button></div>
                      ):(<div className="goal-title-row"><div className="goal-title" style={{textDecoration:gd.done?"line-through":"none",color:gd.done?"#8d99ae":"#3d3730"}}>{getGoalTitle(activeDom.key,gi)}</div>{!isClient&&<button className="edit-icon" onClick={e=>{e.stopPropagation();startEdit("goal",gi,null,getGoalTitle(activeDom.key,gi))}}>✎</button>}</div>)}
                      <div className="sub-prog-row"><div className="sub-prog-track"><div className="sub-prog-fill" style={{width:`${sp.pct}%`,background:gd.done?"#718355":activeDom.color}}/></div><span className="sub-prog-label">{sp.done}/{sp.total}</span></div>
                    </div><span className="chevron" style={{transform:isOpen?"rotate(180deg)":"rotate(0)"}}>▾</span>
                  </div>
                  {isOpen&&<div className="subs-wrap">
                    {goal.subs.map((subDef,si)=>{const st=getSubState(activeDom.key,gi,si);if(st.removed)return null;const type=getSubType(activeDom.key,gi,si);const tt=TASK_TYPES[type];const age=getSubRecency(activeDom.key,gi,si);const interval=getSubInterval(activeDom.key,gi,si);const isOverdue=type==="R"&&age!==null&&interval&&age>=interval;const isStale=type==="M"&&age!==null&&age>=30;const isDone=type==="O"&&st.done;
                      return(<div key={si} className={`sub-item sub-typed ${isDone?"sub-done":""} ${isOverdue||isStale?"sub-overdue":""}`}>
                        <div className="sub-type-badge" style={{color:tt.color}} title={`${tt.label}${interval?" — every "+interval+" days":""}`}>{tt.icon}</div>
                        {type==="O"?(
                          !isClient?<input type="checkbox" checked={st.done} onChange={()=>toggleSub(activeDom.key,gi,si)} className="sub-check"/>:<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:12}}>{st.done?"✓":"○"}</span>
                        ):(
                          !isClient?<button onClick={()=>toggleSub(activeDom.key,gi,si)} className="sub-attend-btn" title="Mark as attended today" style={{background:age!==null&&age<7?"#e8f0df":"transparent",borderColor:age!==null&&age<7?"#718355":"#e5e1db"}}>✓</button>
                          :<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:12}}>{age!==null&&age<7?"✓":"○"}</span>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          {!isClient&&(editing&&editing.type)==="sub"&&editing.gi===gi&&editing.si===si?(<div className="inline-edit" onClick={e=>e.preventDefault()}><input ref={editRef} value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")cancelEdit()}} className="inline-edit-input"/><button onClick={e=>{e.preventDefault();saveEdit()}} className="inline-edit-save">✓</button><button onClick={e=>{e.preventDefault();cancelEdit()}} className="inline-edit-cancel">✕</button></div>
                          ):(<span className="sub-text" style={{textDecoration:isDone?"line-through":"none",color:isDone?"#a09a92":"#3d3730"}}>{getSubText(activeDom.key,gi,si)}</span>)}
                          {type!=="O"&&<div className="sub-recency" style={{color:age!==null?getRecencyColor(age,interval):"#c5c0b8"}}>{getRecencyLabel(age)}{type==="R"&&interval?` (every ${interval}d)`:""}
                          </div>}
                        </div>
                        {can("edit-subtask")&&<select value={type} onChange={e=>changeSubType(activeDom.key,gi,si,e.target.value)} className="sub-type-select" title="Change task type"><option value="O">☐ One-time</option><option value="R">↻ Recurring</option><option value="M">◉ Monitoring</option></select>}
                        {can("edit-subtask")&&!editing&&<button className="edit-icon" onClick={e=>{e.preventDefault();startEdit("sub",gi,si,getSubText(activeDom.key,gi,si))}}>✎</button>}
                        {can("remove-subtask")&&<button onClick={()=>removeSub(activeDom.key,gi,si)} className="remove-sub" title="Remove this sub-task">×</button>}
                      </div>)})}
                    {/* Show removed subs count with restore option */}
                    {(()=>{const removedCount=goal.subs.filter((_,si)=>getSubState(activeDom.key,gi,si).removed).length;return removedCount>0&&!isClient?(<details className="removed-subs-details"><summary className="removed-subs-summary">{removedCount} removed sub-task{removedCount>1?"s":""}</summary><div className="removed-subs-list">{goal.subs.map((subDef,si)=>{const st=getSubState(activeDom.key,gi,si);if(!st.removed)return null;return(<div key={si} className="sub-item sub-removed"><span className="sub-text" style={{color:"#c5c0b8",flex:1}}>{getSubText(activeDom.key,gi,si)}</span><button onClick={()=>restoreSub(activeDom.key,gi,si)} className="edit-btn" style={{marginTop:0,fontSize:11,padding:"3px 10px"}}>Restore</button></div>)})}</div></details>):null})()}                    {gd.customSubs.map((cs,ci)=>(<label key={`c${ci}`} className="sub-item sub-custom" style={{background:cs.done?"#f5f9f0":"#faf9f7"}}>
                      {!isClient?<input type="checkbox" checked={cs.done} onChange={()=>toggleCustomSub(activeDom.key,gi,ci)} className="sub-check"/>:<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:12}}>{cs.done?"✓":"○"}</span>}
                      <span className="sub-text" style={{flex:1,textDecoration:cs.done?"line-through":"none",color:cs.done?"#a09a92":"#3d3730"}}>{cs.text}</span>
                      {!isClient&&<button onClick={e=>{e.preventDefault();removeCustomSub(activeDom.key,gi,ci)}} className="remove-sub">×</button>}
                    </label>))}
                    {can("add-custom-sub")&&(addSubFor===gi?(<div className="add-sub-row"><input ref={subRef} value={newSubText} onChange={e=>setNewSubText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustomSub(activeDom.key,gi,newSubText)} placeholder="Sub-task…" className="add-sub-input"/><button onClick={()=>addCustomSub(activeDom.key,gi,newSubText)} className="add-sub-btn">Add</button><button onClick={()=>{setAddSubFor(null);setNewSubText("")}} className="add-sub-cancel">Cancel</button></div>):(<button onClick={()=>{setAddSubFor(gi);setNewSubText("")}} className="add-sub-trigger">+ Add sub-task</button>))}
                  </div>}
                </div>)})}</div>
            </div>

            <div className="section"><h3 className="sec-title">Caregiver Notes</h3>
              {!isClient&&editNotes?(<div><textarea ref={notesRef} value={notesDraft} onChange={e=>setNotesDraft(e.target.value)} className="notes-ta" rows={4}/><div className="notes-actions"><button onClick={()=>saveNotesData(activeDom.key,notesDraft)} className="save-btn">Save</button><button onClick={()=>setEditNotes(false)} className="cancel-btn">Cancel</button></div></div>
              ):(<div><p className="notes-display">{activeData.notes||"No notes yet."}</p>{!isClient&&<button onClick={()=>{setNotesDraft(activeData.notes);setEditNotes(true)}} className="edit-btn">Edit Notes</button>}</div>)}
            </div>
            {activeData.lastUpdated&&<p className="last-up">Last updated: {activeData.lastUpdated}</p>}

            {(()=>{const idx=DOMAINS.findIndex(d=>d.key===activeDom.key);const prev=idx>0?DOMAINS[idx-1]:null;const next=idx<DOMAINS.length-1?DOMAINS[idx+1]:null;return(
              <div className="pn-row">{prev?(<button onClick={()=>nav(prev.key)} className="pn-btn"><span className="pn-arrow">←</span><span className="pn-dir">Previous</span><span className="pn-name" style={{color:prev.color}}>{prev.icon} {getDomLabel(prev.key)}</span></button>):<div/>}
                {next?(<button onClick={()=>nav(next.key)} className="pn-btn pn-btn-next"><span className="pn-arrow">→</span><span className="pn-dir">Next</span><span className="pn-name" style={{color:next.color}}>{next.icon} {getDomLabel(next.key)}</span></button>)
                  :(<button onClick={()=>nav("overview")} className="pn-btn pn-btn-next"><span className="pn-arrow">⊞</span><span className="pn-dir">Back to</span><span className="pn-name">Overview</span></button>)}
              </div>)})()}
          </>)})()}
        </div>
      </main>
      <nav className="hub-bar">
        <button onClick={()=>navHub("today")} className={`hub-btn ${currentHub==="today"?"hub-active":""}`}><span className="hub-btn-icon">☀</span><span className="hub-btn-label">Today</span></button>
        <button onClick={()=>navHub("care")} className={`hub-btn ${currentHub==="care"?"hub-active":""}`}><span className="hub-btn-icon">♥</span><span className="hub-btn-label">Care plan</span></button>
        <button onClick={()=>navHub("records")} className={`hub-btn ${currentHub==="records"?"hub-active":""}`}><span className="hub-btn-icon">📁</span><span className="hub-btn-label">Records</span></button>
        <button onClick={()=>navHub("team")} className={`hub-btn ${currentHub==="team"?"hub-active":""}`}><span className="hub-btn-icon">👥</span><span className="hub-btn-label">Team</span></button>
      </nav>
    </div>
  </>);
}

/* ═══════════════ CSS ═══════════════ */
const CSS=`
:root,*{color-scheme:light}
/* Fonts (Libre Baskerville, Source Sans 3) are bundled locally via @fontsource — no external requests. */
*{box-sizing:border-box;margin:0;color:inherit}body{margin:0;background:#f6f4f0;color:#3d3730}button{cursor:pointer;color:inherit;background:transparent;border:none}button:hover{opacity:.92}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(150deg,#faf9f7,#ede8df);font-family:'Libre Baskerville',Georgia,serif;padding:20px}
.auth-card{background:#fff;border-radius:16px;padding:44px 36px;max-width:360px;width:100%;text-align:center;box-shadow:0 6px 30px rgba(0,0,0,.06)}
.auth-title{font-size:24px;font-weight:700;color:#3d3730;margin:0 0 10px}.auth-sub{font-size:14px;color:#6b6560;line-height:1.6;margin:0 0 22px}.auth-note{font-size:12.5px;color:#a09a92;font-style:italic}
.auth-input{width:100%;padding:13px 16px;font-size:20px;border-radius:10px;border:2px solid #d5d0c8;outline:none;text-align:center;letter-spacing:8px;font-family:monospace;margin-bottom:12px}
.auth-input-err{border-color:#b56576!important}.auth-error{color:#b56576;font-size:13px;margin:0 0 8px}
.auth-btn{width:100%;padding:13px;font-size:15px;font-weight:700;border-radius:10px;border:none;background:#6d6875;color:#fff;font-family:'Libre Baskerville',serif}
.auth-footer{font-size:11.5px;color:#b5b0a8;margin-top:14px}
.recovery-box{background:#f6f4f0;border:1px solid #e4e0d8;border-radius:10px;padding:16px;margin-top:16px}
.save-pill{position:fixed;bottom:16px;left:16px;z-index:900;font-size:12px;font-weight:600;padding:7px 13px;border-radius:20px;box-shadow:0 2px 10px rgba(0,0,0,.15);max-width:300px}
.save-saving{background:#eef4f8;color:#2c4654;border:1px solid #cfe0ea}
.save-error{background:#fbeaea;color:#8a2b2b;border:1px solid #e3b8b8}
.recovery-label{font-size:13px;font-weight:700;color:#3d3730;margin:0 0 10px;text-align:left}
.recovery-banner{background:#e8f0df;border:1px solid #a9c08f;border-radius:8px;padding:10px 12px;font-size:12.5px;color:#4a5d3a;margin-bottom:12px;line-height:1.4}
.onb-card{max-width:400px}
.onb-emoji{font-size:46px;margin-bottom:14px;line-height:1}
.onb-body{font-size:15px;color:#5a554e;line-height:1.55;margin:0 0 22px;text-align:left}
.onb-dots{display:flex;gap:8px;justify-content:center;margin-top:20px}
.onb-dot{width:8px;height:8px;border-radius:50%;background:#dcd7cf;transition:all .2s}
.onb-dot-on{background:#457b9d;transform:scale(1.25)}
.onb-dot-done{background:#a9c08f}
.onb-install{text-align:left;background:#f6f4f0;border:1px solid #e4e0d8;border-radius:10px;padding:16px;margin-bottom:18px}
.onb-step{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:#3d3730;line-height:1.45;margin:10px 0}
.onb-num{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:#457b9d;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
.onb-share{display:flex;align-items:center;gap:10px;justify-content:center;color:#457b9d;background:#eef4f8;border-radius:8px;padding:10px;margin:6px 0}
.onb-share-label{font-size:12px;color:#6b6560;font-style:italic}
.onb-nav{display:flex;flex-direction:column;gap:4px}
.onb-field-label{display:block;text-align:left;font-size:12.5px;font-weight:600;color:#3d3730;margin-bottom:5px}
.onb-hint-inline{font-weight:400;color:#9a948c}
.onb-input{font-size:17px;padding:13px 14px}
.onb-optional{text-align:left;font-size:13px;color:#6b6560}
.onb-optional summary{cursor:pointer;padding:6px 0;color:#457b9d}
.text-btn{background:none;border:none;color:#457b9d;font-size:12.5px;cursor:pointer;margin-top:10px;text-decoration:underline;font-family:inherit}
.nudge-banner{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;font-size:13px;line-height:1.4;border-bottom:1px solid rgba(0,0,0,.08)}
.nudge-install{background:#eef4f7;color:#2c4654}
.nudge-backup{background:#fbf2e6;color:#6b4d28}
.nudge-risk{background:#fbeaea;color:#7a2e2e}
.integrity-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.integrity-label{font-size:13px;font-weight:600;color:#3d3730}
.integrity-val{font-size:12.5px;font-weight:600}
.integrity-val.ok{color:#5e8a4e}
.integrity-val.bad{color:#b04434}
.integrity-val.muted{color:#9a948c}
.recovery-code-box{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:1px;text-align:center;background:#f3efe8;border:2px dashed #c9bfa9;border-radius:10px;padding:16px 10px;margin-top:10px;color:#3d3730;word-break:break-all}
.mini-btn{font-size:12.5px;font-weight:600;padding:6px 12px;border:1px solid #d8d2c6;border-radius:8px;background:#fff;color:#5a544c;cursor:pointer}
.mini-btn:hover{background:#f3efe8}.mini-btn:disabled{opacity:.5;cursor:not-allowed}
.link-btn{color:#3d7d9c;cursor:pointer;text-decoration:underline}
.confirm-check{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:#5a544c;cursor:pointer}.confirm-check input{width:16px;height:16px}
.nudge-icon{font-size:23px;flex-shrink:0;line-height:1.2}
.nudge-body{flex:1}
.nudge-x{background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:inherit;opacity:.55;padding:0 2px;flex-shrink:0}
.nudge-x:hover{opacity:1}
.nudge-act{background:#bc6c25;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;font-family:inherit}
.backup-status{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:8px;margin-top:10px;font-size:13px}
.backup-active{background:#eef5ee;border:1px solid #c2d6bd}
.backup-paused{background:#fbf2e6;border:1px solid #e6d3b3}
.backup-status-body{flex:1;color:#3d3730;line-height:1.4}
.backup-status-body code{background:rgba(0,0,0,.06);padding:1px 5px;border-radius:4px;font-size:12px}
.backup-when{display:block;font-size:11px;color:#8a847c;margin-top:2px}
.backup-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.backup-active .backup-dot{background:#5e8a4e;box-shadow:0 0 0 3px rgba(94,138,78,.2)}
.backup-paused .backup-dot{background:#bc6c25;box-shadow:0 0 0 3px rgba(188,108,37,.2)}
.backup-btn{background:#bc6c25;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;font-family:inherit}
.backup-link{background:none;border:none;color:#8a847c;font-size:12px;cursor:pointer;text-decoration:underline;flex-shrink:0;font-family:inherit}
.shell{display:flex;min-height:100vh;font-family:'Source Sans 3',sans-serif;color:#3d3730;background:#f6f4f0;color-scheme:light dark}
button,input,select,textarea{color:inherit;font-family:inherit}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:90}
.sidebar{width:260px;background:#fff;border-right:1px solid #e8e4de;display:flex;flex-direction:column;padding:0 0 16px;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto;transition:transform .25s ease;transform:translateX(-100%)}
.sidebar-open{transform:translateX(0)!important}
.side-header{display:flex;align-items:center;gap:10px;padding:20px 20px 16px;border-bottom:1px solid #ede8df}
.side-header-text{font-family:'Libre Baskerville',serif;font-weight:700;font-size:16px;color:#3d3730}
.side-item{display:flex;align-items:center;gap:10px;padding:11px 20px;border:none;background:transparent;font-size:14px;color:#6b6560;text-align:left;width:100%;border-left:3px solid transparent;transition:background .12s}
.side-item:hover{background:#f6f4f0}.side-active{background:#f6f4f0!important;color:#3d3730;font-weight:600;border-left-color:#6d6875}
.side-icon{font-size:21px;width:29px;text-align:center;flex-shrink:0}.side-badge{font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;background:#eef0f3;color:#8d99ae}
.side-lock{margin:8px 16px 0;padding:10px;border:1px solid #e5e1db;border-radius:8px;background:transparent;font-size:13px;color:#6b6560}
.client-badge{font-size:11px;font-weight:600;background:#fdf0d5;color:#bc6c25;padding:2px 8px;border-radius:8px;white-space:nowrap}
.top-bar{display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid #e8e4de;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);position:sticky;top:0;z-index:50}
.hamburger{background:none;border:none;font-size:22px;color:#6b6560;padding:4px 8px;display:block}
.breadcrumbs{display:flex;align-items:center;gap:8px;flex:1}.crumb{background:none;border:none;font-size:13.5px;color:#8d99ae;padding:0;text-decoration:underline;text-underline-offset:3px}
.crumb-sep{color:#c5c0b8;font-size:14px}.crumb-current{font-size:13.5px;font-weight:600}.top-lock{background:none;border:none;font-size:16px;opacity:.5}

/* universal search */
.search-btn{background:none;border:none;font-size:16px;cursor:pointer;padding:4px 8px;color:#8d99ae}
.search-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px 16px}
.search-modal{background:#fff;border-radius:16px;width:100%;max-width:520px;max-height:70vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.2)}
.search-input-row{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid #e8e4de}
.search-icon{font-size:23px;color:#8d99ae}
.search-input{flex:1;border:none;outline:none;font-size:15px;font-family:inherit;color:#3d3730;background:transparent}
.search-input::placeholder{color:#c5c0b8}
.search-close{background:none;border:none;font-size:22px;color:#8d99ae;cursor:pointer;padding:0 4px}
.search-results{overflow-y:auto;padding:8px 0}
.search-cat{font-size:10px;font-weight:600;color:#8d99ae;text-transform:uppercase;letter-spacing:.4px;padding:10px 16px 4px}
.search-result{display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;border:none;background:none;cursor:pointer;text-align:left;font-family:inherit;color:#3d3730;transition:background .1s}
.search-result:hover{background:#f6f4f0}
.search-result-icon{font-size:21px;width:31px;text-align:center;flex-shrink:0}
.search-result-body{flex:1;min-width:0;display:flex;flex-direction:column}
.search-result-text{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.search-result-sub{font-size:11px;color:#8d99ae;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.search-result-date{font-size:10px;color:#a09a92;flex-shrink:0;margin-left:auto}
.search-result-arrow{color:#c5c0b8;font-size:16px;flex-shrink:0;margin-left:4px}
.search-empty{padding:24px 16px;text-align:center;color:#8d99ae;font-size:13px}
.search-hint{padding:24px 16px;text-align:center;color:#c5c0b8;font-size:13px}
.main-area{flex:1;margin-left:0;display:flex;flex-direction:column;min-height:100vh}.content{flex:1;padding:28px 32px 40px;max-width:960px}

/* hub navigation v2 */
.main-area-v2{flex:1;min-height:100vh;display:flex;flex-direction:column}
.content-v2{padding:16px 20px 100px;max-width:960px;margin:0 auto;width:100%;flex:1;color:#3d3730;background:#f6f4f0}
.hub-topbar{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #e8e4de;background:#fff;position:sticky;top:0;z-index:10;color:#3d3730}
.hub-back{background:none;border:none;cursor:pointer;font-size:18px;color:#457b9d;padding:4px 8px 4px 0;display:flex;align-items:center}
.hub-topbar-text{flex:1}
.hub-topbar-title{font-size:16px;font-weight:700;font-family:'Libre Baskerville',serif;color:#3d3730}
.hub-topbar-crumb{font-size:11px;color:#8d99ae;display:block}
.hub-bar{display:flex;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e8e4de;z-index:20;padding-bottom:env(safe-area-inset-bottom)}
.hub-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px 6px;border:none;background:transparent;cursor:pointer;color:#a09a92;font-size:10px;transition:color .12s}
.hub-btn-icon{font-size:26px;line-height:1;color:inherit}
.hub-btn-label{font-weight:600;color:inherit}
.hub-active{color:#457b9d}
.hub-welcome{font-family:'Libre Baskerville',serif;font-size:20px;font-weight:700;color:#3d3730;padding:8px 0 2px}
.hub-client{font-size:13px;color:#6b6560;margin:0 0 16px}
.hub-section-label{font-size:11px;font-weight:600;color:#8d99ae;text-transform:uppercase;letter-spacing:.4px;padding:14px 0 6px}
.hub-card{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:12px;border:1px solid #e8e4de;margin-bottom:8px;cursor:pointer;background:#fff;transition:all .12s}
.hub-card:hover{border-color:#457b9d;background:#fafcfe}
.hub-card-urgent{border-left:3px solid #b56576}
.hub-card-ok{cursor:default}
.hub-card-ok:hover{border-color:#e8e4de;background:#fff}
.hub-card-icon{width:47px;height:47px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0}
.hub-card-body{flex:1;min-width:0}
.hub-card-title{font-size:13.5px;font-weight:600;color:#3d3730}
.hub-card-sub{font-size:11.5px;color:#8d99ae;margin-top:1px}
.hub-card-arr{color:#c5c0b8;font-size:18px;flex-shrink:0;font-weight:300}
.pill{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;margin-left:4px}
.pill-r{background:#fde2e8;color:#8b0000}
.pill-a{background:#fdf0d5;color:#8b6914}
.pill-g{background:#e8f0df;color:#3d5a20}
.pill-b{background:#eef4f8;color:#457b9d}

/* emergency info card */
.ecard{border:2px solid #b56576;border-radius:12px;padding:20px;background:#fff;font-size:13px;line-height:1.6}
.ecard-header{font-size:16px;font-weight:700;color:#b56576;text-align:center;border-bottom:2px solid #b56576;padding-bottom:10px;margin-bottom:12px;letter-spacing:.5px}
.ecard-row{display:flex;gap:8px;padding:4px 0}
.ecard-label{font-weight:700;min-width:70px;color:#3d3730}
.ecard-section{font-size:11px;font-weight:700;color:#457b9d;text-transform:uppercase;letter-spacing:.5px;margin-top:12px;border-top:1px solid #e8e4de;padding-top:8px}
.ecard-body{color:#3d3730;padding:4px 0}

/* pattern charts */
.pattern-bars{display:flex;flex-direction:column;gap:6px}
.pattern-bar-row{display:flex;align-items:center;gap:8px}
.pattern-bar-label{font-size:11px;color:#6b6560;min-width:80px;text-align:right}
.pattern-bar-track{flex:1;height:18px;background:#f6f4f0;border-radius:4px;overflow:hidden}
.pattern-bar-fill{height:100%;border-radius:4px;transition:width .3s}
.pattern-bar-val{font-size:11px;font-weight:600;color:#3d3730;min-width:20px}
.hour-chart{display:flex;align-items:flex-end;gap:2px;height:100px;padding:8px 0}
.hour-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.hour-bar{width:100%;background:#b56576;border-radius:2px 2px 0 0;min-height:1px;transition:height .3s}
.hour-label{font-size:9px;color:#8d99ae;margin-top:4px}

/* strategic grid */
.strat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:16px}
.strat-card{padding:12px;border-radius:12px;border:1px solid #e8e4de;border-top:3px solid;background:#fff;text-align:center;cursor:pointer;transition:all .12s}
.strat-card:hover{border-color:#457b9d}
.strat-icon{font-size:29px;margin-bottom:4px}
.strat-pct{font-size:22px;font-weight:700}
.strat-label{font-size:11px;font-weight:600;color:#6b6560}
.strat-pulse{font-size:10px;margin-top:2px}

/* capacity documentation */
.cap-grid{display:flex;flex-direction:column;gap:8px}
.cap-row{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #f0ede8}
.cap-label{font-size:13px;font-weight:500;min-width:140px;color:#3d3730;padding-top:4px}
.cap-btns{display:flex;gap:4px;flex-wrap:wrap;flex:1}
.cap-btn{padding:5px 10px;border-radius:6px;border:1px solid #e8e4de;background:#fff;font-size:11px;color:#6b6560;cursor:pointer;transition:all .1s;white-space:nowrap}
.cap-btn:hover{border-color:#457b9d}
.cap-btn-active{background:#eef4f8;border-color:#457b9d;color:#457b9d;font-weight:600}
.cap-entry{padding:14px;border-radius:10px;border:1px solid #e8e4de;margin-bottom:8px;background:#fff}
.cap-entry-head{font-size:13px;color:#3d3730;margin-bottom:8px}
.cap-assessor{color:#8d99ae;font-weight:400}
.cap-entry-grid{display:flex;flex-wrap:wrap;gap:6px}
.cap-entry-item{display:flex;align-items:center;gap:4px}
.cap-entry-area{font-size:11px;color:#6b6560}
.cap-entry-notes{font-size:12px;color:#6b6560;margin-top:8px;font-style:italic}

/* binder preview */
.binder-preview{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:20px;font-size:12px;line-height:1.6;white-space:pre-wrap;color:#3d3730;max-height:600px;overflow-y:auto;font-family:'Source Sans 3',monospace}

/* POA decision log */
.poa-form{padding:16px;border:1px solid #e8e4de;border-radius:12px;background:#fff;margin-bottom:16px}
.poa-entry{padding:16px;border:1px solid #e8e4de;border-left:4px solid #457b9d;border-radius:10px;margin-bottom:10px;background:#fff}
.poa-entry-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.poa-entry-type{font-size:14px;font-weight:600;color:#3d3730}
.poa-entry-date{font-size:12px;color:#8d99ae;margin-left:auto}
.poa-entry-desc{font-size:13px;color:#3d3730;line-height:1.5;margin-bottom:8px}
.poa-entry-field{font-size:12px;color:#6b6560;line-height:1.5;margin-bottom:4px}
.poa-field-label{font-weight:600;color:#457b9d}
.poa-entry-agent{font-size:11px;color:#a09a92;margin-top:8px;padding-top:8px;border-top:1px solid #f0ede8;font-style:italic}

/* care schedule */
.shift-card{padding:14px;border:1px solid #e8e4de;border-radius:10px;margin-bottom:10px;background:#fff;border-left:4px solid #8d99ae}
.shift-open{border-left-color:#457b9d}
.shift-assigned{border-left-color:#718355}
.shift-pending{border-left-color:#bc6c25}
.shift-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
.shift-date{font-size:14px;font-weight:600;color:#3d3730}
.shift-assignee{font-size:12px;color:#6b6560;margin-left:auto}
.shift-modby{font-size:10px;color:#a09a92;width:100%;text-align:right;font-style:italic}
.shift-careplan{font-size:12px;color:#6b6560;line-height:1.5;margin:6px 0;padding:8px;background:#f6f4f0;border-radius:6px}
.shift-tasks{margin:8px 0}
.shift-task-check{font-size:13px;color:#3d3730;padding:3px 0}
.shift-task-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#3d3730;padding:2px 0}
.shift-visit{margin:8px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.shift-approvals{margin-top:8px;padding-top:8px;border-top:1px solid #f0ede8}
.shift-approval-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px}

/* availability grid */
.avail-grid{display:grid;grid-template-columns:60px repeat(4,1fr);gap:4px;margin-top:8px}
.avail-corner{}
.avail-slot-head{font-size:10px;font-weight:600;text-align:center;color:#6b6560;padding:4px;text-transform:uppercase;letter-spacing:.3px}
.avail-day{font-size:12px;font-weight:600;color:#3d3730;display:flex;align-items:center;justify-content:flex-end;padding-right:6px}
.avail-cell{height:36px;border:1px solid #e8e4de;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;color:#718355;transition:all .1s}
.avail-cell:hover{border-color:#457b9d}
.avail-on{background:#e8f0df;border-color:#718355;font-weight:700}
.avail-summary{font-size:13px;color:#3d3730;padding:6px 0;border-bottom:1px solid #f0ede8;line-height:1.5}

/* photo attachments */
.photo-attach-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.photo-preview-row{display:flex;gap:8px;flex-wrap:wrap}
.photo-thumb{position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid #e8e4de}
.photo-thumb img{width:100%;height:100%;object-fit:cover}
.photo-loading{width:100%;height:100%;background:repeating-linear-gradient(45deg,#efeae1,#efeae1 6px,#e6e0d5 6px,#e6e0d5 12px)}
.photo-remove{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.page-title{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;margin:0 0 6px;color:#3d3730}
.page-sub{font-size:14px;color:#8d99ae;margin:0 0 24px;line-height:1.5}
.o-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.o-card{border-radius:14px;padding:22px 22px 18px;border:none;border-left:5px solid;text-align:left;box-shadow:0 2px 10px rgba(0,0,0,.04);display:block;width:100%;transition:transform .12s,box-shadow .12s}
.o-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.08)}
.o-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.o-badge{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:20px}
.o-card-title-row{display:flex;align-items:center;gap:6px}
.o-card-title{font-size:17px;font-weight:700;margin:0 0 4px;color:#3d3730;font-family:'Libre Baskerville',serif}
.o-card-desc{font-size:13px;color:#6b6560;line-height:1.45;margin:0 0 12px}
.prog-row{display:flex;align-items:center;gap:10px}.prog-track{flex:1;height:6px;border-radius:3px;background:rgba(0,0,0,.07);overflow:hidden}
.prog-fill{height:100%;border-radius:3px;transition:width .3s ease}.prog-label{font-size:12px;color:#8d99ae;white-space:nowrap}
.o-card-time{font-size:11px;color:#b5b0a8;margin-top:10px}
.log-wrap{margin-top:28px;background:#fff;border-radius:14px;padding:18px 22px;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.log-title{font-size:15px;font-weight:700;margin:0 0 12px;font-family:'Libre Baskerville',serif}
.log-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0ece4;font-size:13px}
.log-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.log-text{flex:1;line-height:1.4}.log-time{font-size:11px;color:#b5b0a8;white-space:nowrap}
.domain-header{border-radius:14px;padding:22px 24px;border-left:5px solid;margin-bottom:28px}
.domain-header-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.domain-title-row{display:flex;align-items:center;gap:8px}
.domain-pct{font-size:32px;font-weight:700;font-family:'Libre Baskerville',serif;flex-shrink:0}
.section{margin-bottom:32px}.sec-title{font-size:16px;font-weight:700;margin:0 0 12px;font-family:'Libre Baskerville',serif}
.hint{font-size:13px;color:#8d99ae;font-style:italic;margin:-4px 0 16px;line-height:1.5}
/* status removed — computed from Foundation + Care Pulse */
.goals-wrap{display:flex;flex-direction:column;gap:10px}
.goal-card{border-radius:12px;border:1px solid #e8e4de;border-left:4px solid;overflow:hidden}
.goal-head{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer}
.goal-check{width:20px;height:20px;accent-color:#718355;flex-shrink:0;cursor:pointer}
.goal-title{font-size:14.5px;font-weight:600;line-height:1.35}.chevron{font-size:16px;color:#a09a92;transition:transform .2s;flex-shrink:0;user-select:none}
.sub-prog-row{display:flex;align-items:center;gap:8px;margin-top:5px}
.sub-prog-track{width:80px;height:4px;border-radius:2px;background:rgba(0,0,0,.07);overflow:hidden}
.sub-prog-fill{height:100%;border-radius:2px;transition:width .25s ease}.sub-prog-label{font-size:11.5px;color:#a09a92}
.subs-wrap{padding:0 16px 14px 48px;display:flex;flex-direction:column;gap:6px;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.sub-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;border:1px solid #e8e4de;cursor:pointer;transition:background .12s}
.sub-typed{cursor:default;align-items:flex-start}
.sub-done{background:#f5f9f0!important}
.sub-overdue{background:#fdf6ee!important;border-color:#f0d5a0}
.sub-type-badge{font-size:14px;width:18px;text-align:center;flex-shrink:0;font-weight:700;line-height:1.3}
.sub-attend-btn{width:22px;height:22px;border-radius:6px;border:1.5px solid #e5e1db;background:transparent;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s;color:#718355;font-weight:700}
.sub-attend-btn:hover{background:#e8f0df;border-color:#718355}
.sub-recency{font-size:11.5px;margin-top:2px;font-weight:500}
.sub-type-select{width:auto;padding:2px 4px;border:1px solid transparent;border-radius:4px;font-size:11px;color:#a09a92;background:transparent;cursor:pointer;flex-shrink:0;outline:none}
.sub-type-select:hover{border-color:#e5e1db;color:#6b6560}
.sub-removed{opacity:.6;background:#f6f4f0!important;border-style:dashed}
.removed-subs-details{margin-top:6px}
.removed-subs-summary{font-size:12px;color:#a09a92;cursor:pointer;padding:4px 0}
.removed-subs-summary:hover{color:#6b6560}
.removed-subs-list{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.type-legend{display:flex;gap:14px;margin-top:10px;font-size:12px;color:#8d99ae}
.type-legend-item{display:flex;align-items:center;gap:4px}
.dual-track{display:flex;flex-direction:column;gap:6px}
.dual-track-row{display:flex;align-items:center;gap:8px}
.dual-track-label{font-size:11.5px;font-weight:600;width:90px;flex-shrink:0}
.sub-custom{border-style:dashed}.sub-check{width:16px;height:16px;accent-color:#718355;flex-shrink:0;cursor:pointer}
.sub-text{font-size:13.5px;line-height:1.4}.remove-sub{background:none;border:none;font-size:18px;color:#c5c0b8;padding:0 4px;line-height:1}.remove-sub:hover{color:#b56576}
.add-sub-trigger{background:none;border:1px dashed #d5d0c8;border-radius:8px;padding:8px 12px;font-size:13px;color:#8d99ae;text-align:left;width:100%}
.add-sub-row{display:flex;gap:8px;align-items:center}
.add-sub-input{flex:1;padding:8px 12px;font-size:13.5px;border-radius:8px;border:1px solid #d5d0c8;outline:none}.add-sub-input:focus{border-color:#718355}
.add-sub-btn{padding:8px 14px;font-size:13px;font-weight:600;border-radius:8px;border:none;background:#718355;color:#fff;white-space:nowrap}
.add-sub-cancel{padding:8px 12px;font-size:13px;border-radius:8px;border:1px solid #d5d0c8;background:transparent;color:#6b6560}
.goal-title-row{display:flex;align-items:flex-start;gap:6px}.goal-title-row .goal-title{flex:1}
.edit-icon{background:none;border:none;font-size:18px;color:#c5c0b8;padding:2px 4px;line-height:1;flex-shrink:0;opacity:0;transition:opacity .15s}
.edit-icon-visible{opacity:.6!important}.goal-head:hover .edit-icon,.sub-item:hover .edit-icon,.o-card:hover .edit-icon{opacity:1}.edit-icon:hover{color:#6d6875!important;opacity:1}
.inline-edit{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
.inline-edit-input{flex:1;padding:5px 8px;font-size:13.5px;border-radius:6px;border:1.5px solid #718355;outline:none;min-width:0}
.inline-edit-save{background:none;border:none;font-size:16px;color:#718355;padding:2px 4px;font-weight:700}
.inline-edit-cancel{background:none;border:none;font-size:14px;color:#a09a92;padding:2px 4px}
.notes-ta{width:100%;padding:13px 16px;font-size:14px;border-radius:10px;border:2px solid #d5d0c8;line-height:1.6;resize:vertical;outline:none;color:#3d3730}.notes-ta:focus{border-color:#718355}
.notes-actions{display:flex;gap:8px;margin-top:10px}
.save-btn{padding:9px 22px;font-size:13.5px;font-weight:700;border-radius:10px;border:none;background:#457b9d;color:#fff;cursor:pointer}
.cancel-btn{padding:9px 18px;font-size:13.5px;border-radius:10px;border:1px solid #d5d0c8;background:#fff;color:#6b6560;cursor:pointer}
.edit-btn{padding:9px 18px;font-size:13.5px;border-radius:10px;border:1px solid #d5d0c8;background:#fff;color:#6b6560;margin-top:8px;cursor:pointer}
.notes-display{font-size:14px;color:#6b6560;line-height:1.6;background:#fff;padding:13px 16px;border-radius:10px;border:1px solid #e5e1db;white-space:pre-wrap}
.last-up{font-size:12px;color:#b5b0a8;font-style:italic;margin-top:16px}
.app-footer{text-align:center;font-size:12.5px;color:#a09a92;padding:18px 24px;border-top:1px solid #e8e4de;margin-top:auto}
.tab-bar{display:flex;flex-wrap:wrap;gap:0;border-bottom:2px solid #e8e4de;background:#fff;padding:0 4px}
.tab-item{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 8px 5px;border:none;background:transparent;font-size:11px;color:#8d99ae;white-space:nowrap;border-bottom:3px solid transparent;transition:all .15s}
.tab-item:hover{color:#3d3730;background:#faf9f7}.tab-active{color:#3d3730!important;font-weight:600;border-bottom-color:#6d6875}
.tab-icon{font-size:20px;line-height:1}.tab-label{font-size:10px;line-height:1.2}

/* tab order editor */
.tab-order-list{display:flex;flex-direction:column;gap:4px;max-width:400px}
.tab-order-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border:1px solid #e8e4de;border-radius:8px}
.tab-order-icon{font-size:21px;width:29px;text-align:center;flex-shrink:0}
.tab-order-label{flex:1;font-size:13.5px;font-weight:500;color:#3d3730}
.tab-order-btns{display:flex;gap:2px}
.tab-order-btn{width:28px;height:28px;border:1px solid #e5e1db;border-radius:6px;background:#faf9f7;font-size:14px;color:#6b6560;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s}
.tab-order-btn:hover:not(:disabled){background:#e8f0df;border-color:#718355;color:#718355}
.tab-order-btn:disabled{opacity:.3;cursor:default}
.pn-row{display:flex;justify-content:space-between;gap:12px;margin-top:36px;padding-top:24px;border-top:1px solid #e8e4de}
.pn-btn{display:flex;flex-direction:column;gap:2px;padding:14px 18px;border:1px solid #e5e1db;border-radius:12px;background:#fff;text-align:left;min-width:100px;transition:all .15s}
.pn-btn:hover{background:#faf9f7;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.pn-btn-next{text-align:right;align-items:flex-end}.pn-arrow{font-size:18px;color:#8d99ae;line-height:1}
.pn-dir{font-size:11px;color:#a09a92;text-transform:uppercase;letter-spacing:.5px}.pn-name{font-size:14px;font-weight:600;color:#3d3730}
.contacts-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.contacts-header-actions{display:flex;gap:8px;flex-shrink:0;align-items:center;flex-wrap:wrap}
.import-toast{background:#e8f0df;color:#4a6232;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;margin-bottom:16px;animation:fadeIn .3s ease}
.contacts-controls{display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
.cc-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.cc-label{font-size:12px;font-weight:600;color:#8d99ae;text-transform:uppercase;letter-spacing:.5px;margin-right:4px}
.cc-btn{padding:5px 12px;border-radius:20px;border:1.5px solid #e5e1db;background:#fff;font-size:12.5px;color:#6b6560;transition:all .12s;white-space:nowrap}
.cc-active{background:#f0ece4!important;border-color:#8d99ae!important;color:#3d3730;font-weight:600}
.contacts-empty{text-align:center;padding:40px 20px;color:#a09a92;font-size:14px;line-height:1.6}
.contacts-list{display:flex;flex-direction:column;gap:6px}
.contact-group{margin-bottom:20px}
.contact-group-title{font-family:'Libre Baskerville',serif;font-size:15px;font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #ede8df}
.contact-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e8e4de;border-radius:10px;background:#fff;width:100%;text-align:left;transition:all .12s}
.contact-row:hover{background:#faf9f7;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.contact-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;font-family:'Libre Baskerville',serif;flex-shrink:0}
.contact-info{flex:1;min-width:0}.contact-name{font-size:14.5px;font-weight:600;color:#3d3730;line-height:1.3}
.contact-role{font-size:12.5px;color:#8d99ae;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.contact-arrow{font-size:20px;color:#c5c0b8;flex-shrink:0}
.back-link{background:none;border:none;font-size:14px;color:#8d99ae;padding:0;margin-bottom:16px;text-decoration:underline;text-underline-offset:3px;display:block}
.cd-header{display:flex;align-items:center;gap:16px;padding:20px 24px;border-radius:14px;border-left:5px solid;background:#faf9f7;margin-bottom:24px}
.cd-avatar{width:52px;height:52px;font-size:22px}.cd-meta{font-size:14px;color:#6b6560;margin:4px 0 8px}
.cd-info-grid{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px}
.cd-info-item{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 16px;min-width:200px;flex:1}
.cd-info-label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#8d99ae;display:block;margin-bottom:4px}
.cd-info-value{font-size:15px;color:#3d3730;font-weight:500;word-break:break-all}
.cd-actions{display:flex;gap:8px;margin-bottom:28px}
.cd-delete-btn{padding:9px 18px;font-size:13.5px;border-radius:10px;border:1px solid #e5c5c5;background:#fff;color:#b56576}
.cd-note-add{margin-bottom:20px}.cd-notes-list{display:flex;flex-direction:column;gap:8px}
.cd-note-card{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 16px}
.cd-note-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.cd-note-date{font-size:11.5px;color:#a09a92}.cd-note-text{font-size:14px;color:#3d3730;line-height:1.55;white-space:pre-wrap}
.cf-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.cf-modal{background:#fff;border-radius:16px;padding:28px 28px 24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,.12)}
.cf-title{font-family:'Libre Baskerville',serif;font-size:18px;font-weight:700;margin:0 0 20px;color:#3d3730}
.cf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
.cf-label{font-size:12px;font-weight:600;color:#6b6560;display:flex;flex-direction:column;gap:5px}
.cf-input{padding:10px 12px;font-size:14px;border-radius:8px;border:1.5px solid #d5d0c8;outline:none;color:#3d3730}.cf-input:focus{border-color:#457b9d}
select.cf-input{background:#fff}.cf-actions{display:flex;gap:8px;margin-top:4px}
.cf-custom-section{margin-bottom:16px}.cf-custom-title{font-size:13px;font-weight:600;color:#6b6560;margin:0 0 10px;text-transform:uppercase;letter-spacing:.3px}
.cf-custom-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.cf-custom-label{width:140px;flex-shrink:0;font-size:13px!important;padding:8px 10px!important}
.cf-custom-value{flex:1;font-size:13px!important;padding:8px 10px!important}
.cf-add-field-row{display:flex;gap:8px;align-items:center;margin-bottom:18px;padding-top:4px;border-top:1px dashed #e5e1db}
/* calendar */
.cal-nav{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px}
.cal-nav-btn{background:none;border:1px solid #e5e1db;border-radius:8px;width:36px;height:36px;font-size:20px;color:#6b6560;display:flex;align-items:center;justify-content:center}
.cal-month{font-family:'Libre Baskerville',serif;font-size:17px;font-weight:700;min-width:180px;text-align:center}
.cal-grid{max-width:500px}.cal-header{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
.cal-dow{font-size:12px;font-weight:600;color:#8d99ae;padding:6px 0;text-transform:uppercase}
.cal-body{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.cal-cell{border:none;background:#fff;border-radius:8px;padding:8px 4px;min-height:48px;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:14px;transition:all .12s}
.cal-cell:hover{background:#f0ece4}.cal-empty{background:transparent;cursor:default}
.cal-sel{background:#eef4f8!important;outline:2px solid #457b9d;outline-offset:-2px}
.cal-today{font-weight:700;color:#457b9d}
.cal-day{line-height:1}.cal-dot-row{display:flex;gap:3px}
.cal-dot{width:5px;height:5px;border-radius:50%;background:#b56576}
.cal-detail{margin-top:20px}
.cal-appt-card{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 16px;margin-bottom:8px}
.cal-appt-head{display:flex;align-items:center;gap:8px;font-size:14px}
.cal-appt-notes{font-size:13px;color:#6b6560;margin-top:6px;line-height:1.45}
/* messages */
.msg-compose{display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.msg-sender{display:flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;background:#eef4f8;border-radius:20px;flex-shrink:0}
.msg-sender-name{font-size:13px;font-weight:600;color:#3d3730}
.msg-sender-role{font-weight:400;color:#8d99ae}
.msg-self{background:#eef4f8!important;border-color:#b0cfe0!important}
.msg-role{font-size:11px;color:#8d99ae;margin-left:4px;font-weight:400}
.msg-meta{display:flex;align-items:center;gap:6px}
.msg-list{display:flex;flex-direction:column;gap:8px}
.msg-bubble{background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:12px 16px}
.msg-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.msg-time{font-size:11px;color:#a09a92}.msg-text{font-size:14px;color:#3d3730;line-height:1.5;white-space:pre-wrap}
/* settings */
/* documents */
.doc-processing{display:flex;align-items:center;gap:12px;padding:20px;background:#fdf6ee;border-radius:12px;color:#bc6c25;font-size:14px;font-weight:600;margin-bottom:20px}
.doc-spinner{width:20px;height:20px;border:3px solid #f0e0c8;border-top-color:#bc6c25;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.doc-type-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid #e8e4de;border-radius:20px;font-size:13.5px;color:#6b6560;margin-bottom:24px}
.doc-table-wrap{overflow-x:auto;margin-bottom:12px;border:1px solid #e8e4de;border-radius:10px}
.doc-table{width:100%;border-collapse:collapse;font-size:13.5px}
.doc-table th{text-align:left;padding:10px 12px;background:#f6f4f0;color:#6b6560;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;border-bottom:2px solid #e8e4de}
.doc-table td{padding:6px 8px;border-bottom:1px solid #f0ece4;vertical-align:middle}
.doc-table tr:last-child td{border-bottom:none}
.doc-flagged{background:#fde2e8}
.doc-cell-input{width:100%;padding:5px 8px;border:1px solid transparent;border-radius:4px;font-size:13px;outline:none;background:transparent;color:#3d3730;transition:border-color .15s}
.doc-cell-input:hover{border-color:#e5e1db}.doc-cell-input:focus{border-color:#457b9d;background:#fff}
.doc-cell-sm{max-width:100px}.doc-cell-xs{max-width:60px}
.doc-table-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.doc-section-card{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:14px 18px;margin-bottom:10px}
.doc-section-title{font-size:14px;font-weight:700;color:#457b9d;margin:0 0 8px;font-family:'Libre Baskerville',serif}
.doc-section-body{font-size:13.5px;color:#3d3730;line-height:1.55;white-space:pre-wrap;margin:0}
.doc-raw-text{font-size:12.5px;line-height:1.5;color:#6b6560;background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:14px 16px;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;font-family:'Source Sans 3',monospace}
.doc-raw-details{margin-top:16px}.doc-raw-summary{font-size:13px;color:#8d99ae;cursor:pointer;padding:8px 0}

/* incidents */
.incident-card{background:#fff;border:1px solid #e8e4de;border-left:4px solid;border-radius:10px;padding:14px 18px;margin-bottom:10px}
.incident-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.incident-type{font-weight:600;font-size:14px;color:#3d3730}
.incident-datetime{font-size:12px;color:#8d99ae;margin-left:auto}
.incident-desc{font-size:14px;color:#3d3730;line-height:1.5;margin:0 0 6px}
.incident-response{font-size:13px;color:#6b6560;line-height:1.45;margin:0 0 6px}
.incident-meta{display:flex;gap:16px;font-size:12px;color:#8d99ae;flex-wrap:wrap}

/* med admin */
.med-date-nav{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.med-day-stats{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.med-stat{font-size:13px;font-weight:600;padding:4px 12px;border-radius:8px}
.med-stat-given{background:#e8f0df;color:#718355}
.med-stat-missed{background:#fde2e8;color:#b56576}
.med-stat-refused{background:#fdf0d5;color:#bc6c25}
.med-stat-pending{background:#eef0f3;color:#8d99ae}
.med-table td,.med-table th{text-align:center;padding:8px 6px}
.med-table td:first-child,.med-table th:first-child{text-align:left;min-width:140px}
.med-table td:nth-child(2),.med-table th:nth-child(2){text-align:left}
.med-slot-th{font-size:11px!important;min-width:60px}
.med-cell{min-width:54px;transition:background .12s}
.med-check{font-size:16px;font-weight:700;display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:6px}
.med-check.given{color:#718355;background:#d4e8c4}.med-check.missed{color:#b56576;background:#f8d0d8}
.med-check.refused{color:#bc6c25;background:#f8e4c4}.med-check.pending{color:#c5c0b8}.med-check.na{color:#e5e1db}
.med-note{font-size:11px;color:#8d99ae;margin-top:2px}
.med-slot-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}

/* expenses */
.expense-summary{display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap}
.expense-summary-item{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 18px;min-width:140px;flex:1}
.expense-summary-label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#8d99ae;display:block;margin-bottom:4px}
.expense-summary-value{font-size:20px;font-weight:700;color:#3d3730;font-family:'Libre Baskerville',serif}

.settings-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* emergency */
.emergency-grid{display:flex;flex-direction:column;gap:16px}
.emergency-card{background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:18px 20px;border-left:4px solid #8b0000}
.emergency-title{font-family:'Libre Baskerville',serif;font-size:16px;font-weight:700;margin:0 0 12px;color:#8b0000}
.emergency-steps{margin:0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:6px}
.emergency-step{display:flex;align-items:center;gap:8px;font-size:13.5px;line-height:1.45;color:#3d3730}
.emergency-step-input{flex:1;padding:6px 10px;border:1px solid transparent;border-radius:6px;font-size:13.5px;outline:none;background:transparent;color:#3d3730}
.emergency-step-input:hover{border-color:#e5e1db}.emergency-step-input:focus{border-color:#8b0000;background:#fff}

/* shifts */
.shift-table td,.shift-table th{text-align:center;padding:6px 4px;font-size:13px}
.shift-slot-label{text-align:left!important;font-weight:600;font-size:12px;color:#6b6560;white-space:nowrap;min-width:80px}
.shift-cell{min-width:70px}.shift-empty{background:#fdf0f2!important}
.shift-input{width:100%;padding:4px 6px;border:1px solid transparent;border-radius:4px;font-size:12.5px;text-align:center;outline:none;background:transparent}
.shift-input:hover{border-color:#e5e1db}.shift-input:focus{border-color:#457b9d;background:#fff}
.shift-name{font-size:12.5px}

/* triggers */
.trigger-alert{padding:14px 18px;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:20px}
.trigger-list{display:flex;flex-direction:column;gap:8px}
.trigger-item{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:10px;border:1px solid #e8e4de;background:#fff;cursor:pointer;transition:all .12s}
.trigger-active{background:#fdf0d5!important;border-color:#f0d5a0}
.trigger-label{font-size:14.5px;font-weight:600;color:#3d3730}.trigger-desc{font-size:12.5px;color:#8d99ae;margin-top:2px}

/* visit summary */
.visit-summary{font-size:13px;line-height:1.6;color:#3d3730;background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:18px 20px;white-space:pre-wrap;word-break:break-word;max-height:70vh;overflow-y:auto;font-family:'Source Sans 3',monospace}

/* help */
.help-toc{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:14px 18px;margin-bottom:24px;font-size:13px;line-height:2;color:#6b6560}
.help-link{color:#457b9d;text-decoration:none}.help-link:hover{text-decoration:underline}
.help-section{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #f0ece4}
.help-body{font-size:14px;color:#3d3730;line-height:1.65}

/* merge preview */
.merge-modal{max-width:520px;max-height:80vh;overflow-y:auto}
.sr-protected{position:absolute;top:8px;right:8px;font-size:17px;opacity:.7}
.flood-warn{background:#fbeee6;border:1px solid #d8a384;color:#8a4a22;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:13px;line-height:1.45}
.merge-source{font-size:13.5px;color:#6b6560;margin:0 0 16px;background:#faf9f7;padding:8px 14px;border-radius:8px}
.merge-section{margin-bottom:16px}
.merge-section-title{font-size:13px;font-weight:700;margin:0 0 6px}
.merge-item{font-size:13px;padding:5px 10px;margin-bottom:3px;border-radius:6px;line-height:1.4}
.merge-added{background:#e8f0df;color:#3d3730}
.merge-updated{background:#fdf0d5;color:#3d3730}
.merge-kept{background:#f6f4f0;color:#a09a92}

/* sync */
.sync-status{padding:12px 18px;border-radius:10px;font-size:14px;font-weight:500;margin-bottom:20px}
.sync-status-success{background:#e8f0df;color:#3d5a20}
.sync-status-error{background:#fde2e8;color:#8b0000}
.sync-methods{display:flex;flex-direction:column;gap:10px;margin:12px 0}
.sync-method-card{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#fff;border:1.5px solid #e8e4de;border-radius:12px;cursor:pointer;transition:all .15s}
.sync-method-card:hover{border-color:#457b9d;background:#f0f5f9}
.sync-method-card:active{transform:scale(.98)}
.sync-method-icon{font-size:36px;width:52px;text-align:center;flex-shrink:0}
.sync-method-info{display:flex;flex-direction:column;gap:2px}
.sync-method-info strong{font-size:14.5px;color:#3d3730}
.sync-method-info span{font-size:12.5px;color:#8d99ae}
.sync-url-row{display:flex;align-items:center;gap:8px;margin-top:12px}
.sync-loading{padding:10px;text-align:center;color:#457b9d;font-size:13px;font-weight:600}
.sync-paste-details{margin-top:20px;padding-top:16px;border-top:1px solid #e8e4de}
.sync-paste-summary{font-size:13px;color:#8d99ae;cursor:pointer;padding:8px 0}
.sync-paste-summary:hover{color:#6b6560}

/* cloud sync */
.cloud-setup-steps{display:flex;flex-direction:column;gap:8px;margin:14px 0}
.cloud-step{display:flex;align-items:center;gap:12px;font-size:14px;color:#3d3730}
.cloud-step-num{width:28px;height:28px;border-radius:50%;background:#457b9d;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.cloud-connected-info{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#e8f0df;border:1.5px solid #b8d4a0;border-radius:12px}
.cloud-connected-icon{font-size:42px}
.cloud-connected-details{flex:1}
.cloud-connected-file{font-size:15px;font-weight:700;color:#3d3730}
.cloud-connected-meta{font-size:12px;color:#718355;margin-top:2px}
.sync-main-action{text-align:center;padding:24px 0}
.cloud-sync-btn{display:inline-flex;align-items:center;gap:10px;padding:18px 48px;font-size:18px;font-weight:700;border:none;border-radius:14px;background:linear-gradient(135deg,#457b9d,#3d6a87);color:#fff;cursor:pointer;transition:all .15s;box-shadow:0 4px 16px rgba(69,123,157,.3)}
.cloud-sync-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(69,123,157,.4)}
.cloud-sync-btn:active{transform:translateY(0)}
.cloud-sync-btn:disabled{opacity:.5;cursor:default}
.sync-advanced{margin-top:24px;border-top:1px solid #e8e4de;padding-top:4px}
.sync-advanced-summary{font-size:13px;color:#8d99ae;cursor:pointer;padding:12px 0;font-weight:600}
.sync-advanced-summary:hover{color:#6b6560}
.sync-advanced-content{padding-top:8px}
.sync-sub-title{font-size:13px;font-weight:700;color:#6b6560;margin:16px 0 8px}
.sync-method-tabs{display:flex;gap:8px;margin-bottom:16px}

/* team */
.team-form{margin-top:12px;display:flex;flex-direction:column;gap:8px;max-width:400px}
.team-header{margin-bottom:16px}
.team-name{font-size:18px;font-weight:700;color:#3d3730;font-family:'Libre Baskerville',serif}
.team-client{font-size:14px;color:#6b6560;margin-top:2px}
.team-roster{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.team-member{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border:1px solid #e8e4de;border-radius:10px}
.team-member-self{background:#eef4f8;border-color:#b0cfe0}
.team-member-avatar{width:36px;height:36px;border-radius:50%;background:#457b9d;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0}
.team-member-info{flex:1;min-width:0}
.team-member-name{font-size:14px;font-weight:600;color:#3d3730}
.team-member-you{font-size:11px;color:#457b9d;font-weight:400}
.team-member-role{font-size:12px;color:#8d99ae}
.team-member-sync{font-size:11px;color:#a09a92;text-align:right;flex-shrink:0}
.team-invite-details{margin-top:8px;padding-top:8px;border-top:1px solid #e8e4de}
.team-invite-code{font-family:monospace;font-size:11px;padding:10px 14px;background:#fff;border:1px solid #e8e4de;border-radius:8px;word-break:break-all;cursor:pointer;color:#457b9d;transition:background .12s;line-height:1.5}
.team-invite-code:hover{background:#eef4f8}
.client-tier-section{margin-top:16px;padding-top:16px;border-top:1px solid #e8e4de}
.client-tier-toggle{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.client-tier-toggle .state-btn{flex:1;min-width:180px;text-align:left;display:flex;flex-direction:column;gap:2px;padding:12px 16px}
.tier-desc{font-size:11px;font-weight:400;opacity:.7;display:block}
.role-badge{font-size:10px;padding:2px 6px;border-radius:4px;background:#eef4f8;color:#457b9d;font-weight:600;margin-left:4px}

/* state selector */
.state-selector{display:flex;gap:8px;flex-wrap:wrap}
.state-btn{padding:10px 18px;border:2px solid #e5e1db;border-radius:10px;background:#fff;font-size:14px;color:#6b6560;cursor:pointer;transition:all .12s;font-weight:500}
.state-btn:hover{border-color:#457b9d;color:#3d3730}
.state-btn-active{background:#eef4f8;border-color:#457b9d;color:#457b9d;font-weight:700}

/* self reports */
.sr-form{background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px}
.sr-mood-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.sr-mood-btn{padding:8px 14px;border:1.5px solid #e5e1db;border-radius:10px;background:#fff;font-size:13.5px;color:#6b6560;cursor:pointer;transition:all .12s}
.sr-mood-active{background:#e8f0df!important;border-color:#718355;color:#3d3730;font-weight:600}
.sr-audio-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.sr-record-btn{padding:10px 18px;border-radius:10px;border:2px solid #b56576;background:#fff;color:#b56576;font-weight:600;font-size:14px;cursor:pointer;transition:all .15s}
.sr-recording{background:#fde2e8;animation:pulse 1s ease infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.sr-audio-preview{display:flex;align-items:center;gap:8px}
.sr-list{display:flex;flex-direction:column;gap:10px}
.sr-card{background:#fff;border:1px solid #e8e4de;border-left:4px solid #718355;border-radius:10px;padding:14px 18px;position:relative}
.sr-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.sr-card-type{font-weight:600;font-size:13.5px;color:#3d3730}
.sr-card-time{font-size:11.5px;color:#a09a92}
.sr-card-mood{font-size:15px;margin-bottom:4px}
.sr-card-text{font-size:14px;color:#3d3730;line-height:1.5;white-space:pre-wrap;margin:0}
.sr-err{font-size:13px;color:#b56576;margin:8px 0 0;padding:0}

/* doc library */
.doc-type-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
.doc-save-row{display:flex;gap:8px;align-items:center}

/* print styles for expenses */
@media print{
  .sidebar,.tab-bar,.top-bar,.app-footer,.hamburger,.contacts-header-actions,.cc-group,.expense-summary,.contacts-controls,.edit-icon,.remove-sub,.save-btn,.edit-btn,.cancel-btn,.add-sub-trigger,.cf-overlay,.overlay,.import-toast{display:none!important}
  .main-area{margin-left:0!important}
  .content{padding:10px!important;max-width:none!important}
  .shell{display:block!important}
  .doc-table-wrap{border:2px solid #000!important;overflow:visible!important}
  .doc-table th{background:#eee!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page-title{font-size:18px!important}
  .page-sub{display:none!important}
}

@media(min-width:1024px){.sidebar{transform:translateX(0)}.main-area{margin-left:260px!important}.hamburger{display:none!important}.tab-bar{display:none}}
@media(max-width:480px){.content{padding:16px 12px 28px}.subs-wrap{padding-left:28px}.add-sub-row,.cf-add-field-row,.msg-compose,.settings-row,.doc-table-actions{flex-wrap:wrap}.pn-btn{min-width:0;padding:12px 14px}.domain-pct{font-size:24px}.edit-icon{opacity:.5!important}.cf-grid{grid-template-columns:1fr}.cd-header{flex-direction:column;align-items:flex-start}.cd-info-item{min-width:0}.cf-custom-label{width:100px}.doc-table{font-size:12px}.doc-cell-input{font-size:12px;padding:4px 6px}}

@media(prefers-color-scheme:dark){
/* base */
body,.app{background:#1a1a1e!important;color:#e0ddd8}
.content{background:#1a1a1e}
.content-v2{background:#1a1a1e!important;color:#e0ddd8}
.main-area-v2{background:#1a1a1e}
.recovery-box{background:#2a2a2e;border-color:#4a4a4e}
.save-saving{background:#1e2e36;color:#bcd4e0;border-color:#2c4654}
.save-error{background:#3a1e1e;color:#e0a0a0;border-color:#5a2e2e}
.recovery-label{color:#e0ddd8}
.recovery-banner{background:#1e2a1e;border-color:#3a5a2e;color:#a9c08f}
.onb-body{color:#b0aca6}
.onb-dot{background:#3a3a3e}
.onb-install{background:#2a2a2e;border-color:#4a4a4e}
.onb-step{color:#e0ddd8}
.onb-share{background:#1e2e36;color:#7fb0cc}
.onb-share-label{color:#9a948c}
.onb-field-label{color:#e0ddd8}
.onb-optional{color:#b0aca6}
.nudge-install{background:#1e2e36;color:#bcd4e0}
.nudge-backup{background:#332715;color:#e0c08a}
.nudge-risk{background:#3a1e1e;color:#e0a0a0}
.integrity-label{color:#e0ddd8}
.integrity-val.ok{color:#8fae7e}
.integrity-val.bad{color:#e08a7a}
.integrity-val.muted{color:#9a948c}
.backup-active{background:#1e2a1e;border-color:#3a5a2e}
.backup-paused{background:#332715;border-color:#5a4a2e}
.backup-status-body{color:#e0ddd8}
.backup-status-body code{background:rgba(255,255,255,.08)}
.backup-when{color:#9a948c}

/* auth */
.auth-wrap{background:#111114}
.auth-card{background:#242428;border-color:#3a3a3e}
.auth-title{color:#fff}.auth-sub{color:#c8c4be}
.auth-note{color:#9aa5b8!important}
.auth-input{background:#1a1a1e;border-color:#3a3a3e;color:#e0ddd8}
.auth-input-err{border-color:#b56576}
.auth-btn{background:#457b9d;color:#fff}
.auth-footer,.auth-error{color:#a08090}

/* sidebar */
.sidebar{background:#1e1e22;border-color:#2e2e32}
.side-header-text{color:#fff}
.side-nav button{color:#b0aca6}
.side-nav button:hover,.side-nav button.side-active{background:#2a2a2e;color:#e0ddd8}

/* tab bar */
.tab-bar{background:#1e1e22;border-color:#2e2e32}
.tab-btn{color:#807a72}
.tab-btn.tab-active{color:#e0ddd8}

/* top bar */
.top-bar{background:#1e1e22;border-color:#2e2e32}
.hamburger{color:#e0ddd8}

/* headings & text */
.page-title{color:#fff}
.page-sub{color:#9aa5b8}
.sec-title{color:#e0ddd8;border-color:#3a3a3e}
.hint{color:#807a72}

/* overview cards */
.o-card{background:#242428!important;border-color:#3a3a3e}
.o-card:hover{background:#2a2a2e!important}
.o-card-title{color:#f5f3f0}
.o-badge{opacity:.9}
.prog-track,.sub-prog-track{background:#2e2e32}

/* domain detail */
.domain-header{background:#242428!important}
.domain-pct{opacity:.9}
.type-legend{color:#807a72}
.dual-track-label{color:#b0aca6}
.prog-label,.sub-prog-label{color:#807a72}

/* goal cards */
.goal-card{background:#242428!important;border-color:#3a3a3e}
.goal-title{color:#f5f3f0!important}
.chevron{color:#807a72}
.goal-head:hover{background:#2a2a2e}

/* sub items */
.sub-item{background:#2a2a2e!important;border-color:#3a3a3e}
.sub-done{background:#1e2a1e!important}
.sub-overdue{background:#2e2218!important;border-color:#5a4530}
.sub-text{color:#e0ddd8!important}
.sub-custom{background:#2a2a2e!important}
.sub-removed{background:#2a2a2e!important}
.sub-type-select{color:#807a72}
.sub-recency{color:#9aa5b8}

/* forms & inputs */
.cf-input,.cf-select,.cf-textarea,.notes-ta,.add-sub-input{background:#1e1e22;border-color:#3a3a3e;color:#e0ddd8}
.cf-input::placeholder,.notes-ta::placeholder,.add-sub-input::placeholder{color:#5a5854}
.cf-label{color:#b0aca6}
.cf-overlay{background:rgba(0,0,0,.7)}
.cf-modal{background:#242428;border-color:#3a3a3e}
.cf-title{color:#fff}

/* buttons */
.save-btn{background:#457b9d;color:#fff}
.cancel-btn{background:#3a3a3e;color:#e0ddd8;border-color:#5a5854}
.edit-btn{background:#3a3a3e;color:#e0ddd8;border-color:#5a5854}
.edit-icon{color:#9aa5b8}
.remove-sub{color:#9aa5b8}
.add-sub-trigger{color:#9aa5b8}
.add-sub-trigger:hover{color:#e0ddd8;background:#2a2a2e}

/* contacts */
.contact-row{background:#242428;border-color:#3a3a3e}
.contact-row:hover{background:#2a2a2e}
.contact-name{color:#f5f3f0}
.contact-role{color:#807a72}
.contacts-empty{color:#5a5854}

/* calendar */
.cal-grid{border-color:#3a3a3e}
.cal-cell{background:#242428;border-color:#3a3a3e;color:#b0aca6}
.cal-cell:hover{background:#2a2a2e}
.cal-today{background:#2a3540!important;color:#8bb8d0}
.cal-has-appt{border-color:#457b9d}
.cal-header{color:#9aa5b8}
.cal-dow{color:#807a72}

/* incidents, expenses */
.incident-row,.expense-row{background:#242428;border-color:#3a3a3e}
.incident-row:hover,.expense-row:hover{background:#2a2a2e}

/* messages */
.msg-bubble{background:#242428;border-color:#3a3a3e}
.msg-self{background:#1e2a35!important;border-color:#2a4050!important}
.msg-text{color:#e0ddd8}
.msg-time{color:#807a72}
.msg-sender{background:#2a2a2e}

/* tables */
.doc-table{color:#e0ddd8}
.doc-table th{background:#2a2a2e;color:#b0aca6;border-color:#3a3a3e}
.doc-table td{border-color:#3a3a3e}
.doc-table tr:nth-child(even){background:#222226}
.doc-cell-input{background:#1e1e22;border-color:#3a3a3e;color:#e0ddd8}
.doc-flagged{background:#2e1e1e!important}

/* settings */
.settings-row{border-color:#3a3a3e}
.state-btn{background:#242428;border-color:#3a3a3e;color:#b0aca6}
.state-btn:hover{border-color:#457b9d}
.state-btn-active{background:#1e2a35;border-color:#457b9d;color:#8bb8d0}

/* sync */
.sync-status-success{background:#1e2a1e;color:#8db870}
.sync-status-error{background:#2e1e1e;color:#d08080}
.sync-method-card{background:#242428;border-color:#3a3a3e}
.sync-method-card:hover{background:#2a2a2e;border-color:#457b9d}
.sync-method-info strong{color:#e0ddd8}
.sync-method-info span{color:#807a72}
.cloud-connected-info{background:#1e2a1e;border-color:#2a4030}
.cloud-sync-btn{background:linear-gradient(135deg,#3a6a87,#2d5570);box-shadow:0 4px 16px rgba(45,85,112,.3)}
.sync-advanced{border-color:#3a3a3e}

/* team */
.team-member{background:#242428;border-color:#3a3a3e}
.team-member-self{background:#1e2a35;border-color:#2a4050}
.team-member-avatar{background:#3a6a87}
.team-member-name{color:#f5f3f0}
.team-member-role,.team-member-sync{color:#807a72}
.team-name{color:#fff}
.team-client{color:#9aa5b8}
.team-invite-code{background:#1e1e22;border-color:#3a3a3e;color:#8bb8d0}
.team-invite-code:hover{background:#242428}

/* merge modal */
.merge-modal{background:#242428}
.flood-warn{background:#fbeee6;border:1px solid #d8a384;color:#8a4a22;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:13px;line-height:1.45}
.merge-source{background:#1e1e22;color:#b0aca6}
.merge-added{background:#1e2a1e;color:#a0d080}
.merge-updated{background:#2e2818;color:#d0b060}
.merge-kept{background:#222226;color:#807a72}

/* self report */
.sr-card{background:#242428;border-color:#3a3a3e}
.sr-card-meta{color:#807a72}
.sr-card-text{color:#e0ddd8}
.sr-mood-btn{background:#242428;border-color:#3a3a3e;color:#b0aca6}
.sr-mood-btn:hover{background:#2a2a2e;border-color:#457b9d}
.sr-mood-active{background:#1e2a35!important;border-color:#457b9d!important;color:#8bb8d0!important}

/* med admin */
.med-grid-cell{background:#242428;border-color:#3a3a3e;color:#b0aca6}

/* shifts */
.shift-cell{background:#242428;border-color:#3a3a3e;color:#b0aca6}
.shift-input{background:#1e1e22;color:#e0ddd8}

/* emergency, triggers */
.ep-card{background:#242428;border-color:#3a3a3e}
.trigger-item{background:#242428;border-color:#3a3a3e}

/* help */
.help-toc button{background:#242428;border-color:#3a3a3e;color:#b0aca6}
.help-toc button:hover{background:#2a2a2e}
.help-body{color:#c8c4be}

/* inline edit */
.inline-edit-input{background:#1e1e22;border-color:#3a3a3e;color:#e0ddd8}

/* prev/next nav */
.pn-btn{background:#242428;border-color:#3a3a3e;color:#b0aca6}
.pn-btn:hover{background:#2a2a2e}

/* document viewer */
.doc-section-card{background:#242428;border-color:#3a3a3e}
.doc-section-title{color:#f5f3f0}
.doc-section-body{color:#b0aca6}
.doc-raw-text{background:#1a1a1e;color:#9aa5b8;border-color:#3a3a3e}

/* cc buttons (category filters, report types) */
.cc-btn{background:#242428;border-color:#3a3a3e;color:#b0aca6}
.cc-btn:hover{background:#2a2a2e;border-color:#457b9d}
.cc-active{background:#1e2a35!important;border-color:#457b9d!important;color:#8bb8d0!important}

/* flash */
.flash{background:#242428;color:#e0ddd8;border-color:#3a3a3e;box-shadow:0 4px 20px rgba(0,0,0,.4)}

/* scrollbar */
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:#1a1a1e}
::-webkit-scrollbar-thumb{background:#3a3a3e;border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:#4a4a4e}

/* hub dark mode */
.hub-topbar{background:#1e1e22;border-color:#2e2e32}
.hub-topbar-title{color:#fff}
.hub-topbar-crumb{color:#807a72}
.hub-back{color:#8bb8d0}
.hub-bar{background:#1e1e22;border-color:#2e2e32}
.hub-btn{color:#9aa5b8}
.hub-active{color:#8bb8d0}
.hub-welcome{color:#fff}
.hub-client{color:#b0aca6}
.hub-section-label{color:#9aa5b8}
.hub-card{background:#2a2a2e;border-color:#4a4a4e}
.hub-card:hover{background:#333338;border-color:#457b9d}
.hub-card-title{color:#f5f3f0}
.hub-card-sub{color:#9aa5b8}
.hub-card-arr{color:#6b6560}
.hub-card-urgent{border-left-color:#b56576}
.pill-r{background:#2e1e1e;color:#d08080}
.pill-a{background:#2e2818;color:#d0a060}
.pill-g{background:#1e2a1e;color:#8db870}
.pill-b{background:#1e2a35;color:#8bb8d0}
.ecard{background:#242428;border-color:#b56576}
.ecard-header{color:#d08080;border-color:#b56576}
.ecard-section{color:#8bb8d0;border-color:#3a3a3e}
.ecard-body{color:#e0ddd8}
.pattern-bar-track{background:#2e2e32}
.pattern-bar-label{color:#b0aca6}
.pattern-bar-val{color:#e0ddd8}
.strat-card{background:#2a2a2e;border-color:#4a4a4e}
.strat-card:hover{border-color:#457b9d}
.strat-label{color:#9aa5b8}
.cap-label{color:#e0ddd8}
.cap-btn{background:#2a2a2e;border-color:#4a4a4e;color:#9aa5b8}
.cap-btn-active{background:#1e2a35;border-color:#457b9d;color:#8bb8d0}
.cap-entry{background:#2a2a2e;border-color:#4a4a4e}
.cap-entry-head{color:#e0ddd8}
.cap-entry-area{color:#9aa5b8}
.cap-entry-notes{color:#9aa5b8}
.binder-preview{background:#2a2a2e;border-color:#4a4a4e;color:#e0ddd8}
.poa-form{background:#2a2a2e;border-color:#4a4a4e}
.poa-entry{background:#2a2a2e;border-color:#4a4a4e;border-left-color:#457b9d}
.poa-entry-type{color:#e0ddd8}
.poa-entry-desc{color:#e0ddd8}
.poa-entry-field{color:#b0aca6}
.poa-field-label{color:#8bb8d0}
.poa-entry-agent{color:#807a72;border-color:#3a3a3e}
.shift-card{background:#2a2a2e;border-color:#4a4a4e}
.shift-date{color:#e0ddd8}
.shift-assignee{color:#9aa5b8}
.shift-modby{color:#807a72}
.shift-careplan{background:#1e1e22;color:#b0aca6}
.shift-task-check,.shift-task-row{color:#e0ddd8}
.shift-approvals{border-color:#3a3a3e}
.avail-slot-head{color:#9aa5b8}
.avail-day{color:#e0ddd8}
.avail-cell{background:#2a2a2e;border-color:#4a4a4e;color:#8db870}
.avail-on{background:#1e2a1e;border-color:#718355}
.avail-summary{color:#e0ddd8;border-color:#3a3a3e}
.photo-thumb{border-color:#4a4a4e}
.search-modal{background:#242428;box-shadow:0 16px 48px rgba(0,0,0,.5)}
.search-input-row{border-color:#3a3a3e}
.search-input{color:#e0ddd8}
.search-input::placeholder{color:#5a5854}
.search-result{color:#e0ddd8}
.search-result:hover{background:#2a2a2e}
.search-result-sub{color:#807a72}
.search-empty,.search-hint{color:#5a5854}
}

@media print{body,.app,.content,.content-v2{background:#fff!important;color:#000!important}.hub-bar,.hub-topbar{display:none!important}}
`;
