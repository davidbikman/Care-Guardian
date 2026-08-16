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
// All iOS browsers are WebKit (Apple requires it), and none expose the File System Access API — so the
// handle-based "Connect Cloud Folder" continuous sync cannot work in Chrome, Edge, OR Safari on iPhone/iPad.
// Telling an iPhone user to "use Chrome/Edge" is wrong; the working paths on iOS are the self-hosted relay
// (fetch-based) and manual file sync through the Files app + share sheet. We detect this to give honest guidance.
const isIOSDevice=typeof navigator!=="undefined"&&(/iphone|ipad|ipod/i.test(navigator.userAgent)||(/Mac/.test(navigator.userAgent)&&navigator.maxTouchPoints>1));
const hasWebShare=typeof navigator!=="undefined"&&typeof navigator.share==="function"&&typeof File!=="undefined";

// ── Cloud-storage sync (WebKit-compatible, serverless) ───────────────────────────────────────────────
// The one transport that is genuinely seamless on EVERY platform — iOS, Android, Windows, Linux — is the
// user's own cloud storage over its REST API, because `fetch` behaves identically everywhere. The data
// already lives in the user's cloud account in the "shared folder" model; the only thing iOS can't do is
// hold a file *handle* to it. Talking to the provider API directly removes that dependency. The payload is
// end-to-end encrypted with the team sync passcode before it ever leaves the device, so the provider only
// ever stores ciphertext in a scoped, app-private folder — same trust model as before, no project server.
//
// Reference provider: Dropbox, because its PKCE flow needs only a public app key (no secret), issues real
// refresh tokens to a pure browser client, and its "App Folder" scope sandboxes us to our own folder. The
// CLOUD_PROVIDERS shape is deliberately generic so Google Drive / OneDrive can be added behind the same
// interface. APP keys are public by design; fill DROPBOX_APP_KEY after registering the app (see DEPLOY.md).
const DROPBOX_APP_KEY=""; // set at deploy time — a Dropbox "scoped app", App Folder access, PKCE (no secret)
const GOOGLE_CLIENT_ID=""; // a Google Cloud OAuth client (Web application), scope drive.file, access_type=offline
// Google Drive is deliberately NOT offered for direct browser connection. Google's token endpoint requires a
// client_secret for "Web application" clients even under PKCE, and a secret shipped in a browser bundle is not a
// secret — anyone can read it out of the JavaScript. Rather than ship a footgun that looks configurable, the
// provider is marked unavailable and the reason is shown in the UI. Dropbox and OneDrive are true PKCE public
// clients and need no secret. Google can be restored later via session-only tokens (Google Identity Services,
// no refresh token) or, for institutional deployments, a token-exchange endpoint the organisation runs.
const MS_CLIENT_ID=""; // an Azure AD app, "Single-page application" platform, scope Files.ReadWrite.AppFolder + offline_access (PKCE, no secret)
const CLOUD_SYNC_PATH="/care-guardian-sync.json"; // inside the per-account app folder
function b64url(bytes){ let s=btoa(String.fromCharCode(...new Uint8Array(bytes))); return s.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
async function pkceChallengeFor(verifier){ const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)); return b64url(d); }
function newPkceVerifier(){ return b64url(crypto.getRandomValues(new Uint8Array(64))); } // 86 url-safe chars, within 43–128
const CLOUD_PROVIDERS={
  dropbox:{
    id:"dropbox", label:"Dropbox", icon:"📦",
    authUrl:({challenge,state,redirectUri})=>`https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(DROPBOX_APP_KEY)}&response_type=code&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&token_access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`,
    exchangeBody:({code,verifier,redirectUri})=>new URLSearchParams({code,grant_type:"authorization_code",code_verifier:verifier,client_id:DROPBOX_APP_KEY,redirect_uri:redirectUri}),
    refreshBody:(refreshToken)=>new URLSearchParams({grant_type:"refresh_token",refresh_token:refreshToken,client_id:DROPBOX_APP_KEY}),
    tokenUrl:"https://api.dropboxapi.com/oauth2/token",
    // Returns the stored ciphertext string, or null if the file doesn't exist yet (first sync).
    download:async(accessToken,path)=>{
      const r=await fetch("https://content.dropboxapi.com/2/files/download",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Dropbox-API-Arg":JSON.stringify({path})}});
      if(r.status===409)return null; // path/not_found → nothing uploaded yet
      if(!r.ok)throw new Error("Dropbox download "+r.status);
      return await r.text();
    },
    upload:async(accessToken,path,content)=>{
      const r=await fetch("https://content.dropboxapi.com/2/files/upload",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Dropbox-API-Arg":JSON.stringify({path,mode:"overwrite",mute:true}),"Content-Type":"application/octet-stream"},body:content});
      if(!r.ok)throw new Error("Dropbox upload "+r.status);
      return true;
    },
  },
  onedrive:{
    // Microsoft Graph — nearly as clean as Dropbox: PKCE without a secret (SPA platform), refresh tokens via
    // offline_access, and a path-addressable per-app folder (special/approot) so we only ever see our own files.
    id:"onedrive", label:"OneDrive", icon:"🟦",
    authUrl:({challenge,state,redirectUri})=>`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(MS_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("Files.ReadWrite.AppFolder offline_access")}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&state=${encodeURIComponent(state)}`,
    exchangeBody:({code,verifier,redirectUri})=>new URLSearchParams({code,grant_type:"authorization_code",code_verifier:verifier,client_id:MS_CLIENT_ID,redirect_uri:redirectUri,scope:"Files.ReadWrite.AppFolder offline_access"}),
    refreshBody:(refreshToken)=>new URLSearchParams({grant_type:"refresh_token",refresh_token:refreshToken,client_id:MS_CLIENT_ID,scope:"Files.ReadWrite.AppFolder offline_access"}),
    tokenUrl:"https://login.microsoftonline.com/common/oauth2/v2.0/token",
    download:async(accessToken,path)=>{
      const p=path.replace(/^\//,"");
      const r=await fetch(`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${encodeURIComponent(p)}:/content`,{headers:{Authorization:"Bearer "+accessToken}});
      if(r.status===404)return null;
      if(!r.ok)throw new Error("OneDrive download "+r.status);
      return await r.text();
    },
    upload:async(accessToken,path,content)=>{
      const p=path.replace(/^\//,"");
      const r=await fetch(`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${encodeURIComponent(p)}:/content`,{method:"PUT",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:content});
      if(!r.ok)throw new Error("OneDrive upload "+r.status);
      return true;
    },
  },
  googledrive:{
    // Google Drive (scope drive.file → the app only ever sees files it created). Two wrinkles vs. the others:
    // Google needs access_type=offline + prompt=consent to return a refresh token, and its token endpoint wants
    // a client_secret for "Web application" clients even under PKCE (not truly secret for a SPA — see DEPLOY.md).
    // Drive is also file-ID-addressed, not path-addressed, so each call first resolves our sync file by name.
    id:"googledrive", label:"Google Drive", icon:"🗂", auth:"gis", scope:"https://www.googleapis.com/auth/drive.file",
    authUrl:({challenge,state,redirectUri})=>`https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/drive.file")}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&access_type=offline&prompt=consent`,
    exchangeBody:({code,verifier,redirectUri})=>{const p={code,grant_type:"authorization_code",code_verifier:verifier,client_id:GOOGLE_CLIENT_ID,redirect_uri:redirectUri};return new URLSearchParams(p);},
    refreshBody:(refreshToken)=>{const p={grant_type:"refresh_token",refresh_token:refreshToken,client_id:GOOGLE_CLIENT_ID};return new URLSearchParams(p);},
    tokenUrl:"https://oauth2.googleapis.com/token",
    _findFileId:async(accessToken,name)=>{
      const q=encodeURIComponent(`name='${name.replace(/'/g,"\\'")}' and trashed=false`);
      const r=await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`,{headers:{Authorization:"Bearer "+accessToken}});
      if(!r.ok)throw new Error("Drive list "+r.status);
      const j=await r.json(); return (j.files&&j.files[0]&&j.files[0].id)||null;
    },
    download:async function(accessToken,path){
      const name=path.replace(/^\//,"");
      const id=await this._findFileId(accessToken,name); if(!id)return null;
      const r=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`,{headers:{Authorization:"Bearer "+accessToken}});
      if(r.status===404)return null;
      if(!r.ok)throw new Error("Drive download "+r.status);
      return await r.text();
    },
    upload:async function(accessToken,path,content){
      const name=path.replace(/^\//,"");
      const id=await this._findFileId(accessToken,name);
      if(id){
        const r=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:content});
        if(!r.ok)throw new Error("Drive update "+r.status);
      }else{
        const boundary="cg"+Math.random().toString(36).slice(2);
        const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name})}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
        const r=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":`multipart/related; boundary=${boundary}`},body});
        if(!r.ok)throw new Error("Drive create "+r.status);
      }
      return true;
    },
  },
};
// OAuth returns by redirecting back to our URL with ?code=&state=. Capture it the instant the module loads
// (before React renders), stash it for processing after the user unlocks, and scrub it from the address bar
// so the authorization code is never bookmarked, logged, or left in history.
let _oauthReturn=null;
(function captureOAuthReturn(){
  try{ if(typeof window==="undefined")return;
    const q=new URLSearchParams(window.location.search);
    const code=q.get("code"), state=q.get("state");
    if(code&&state&&sessionStorage.getItem("cg-oauth-state")===state){
      _oauthReturn={code, verifier:sessionStorage.getItem("cg-oauth-verifier"), provider:sessionStorage.getItem("cg-oauth-provider")||"dropbox"};
    }
    if(code||state||q.get("error")){ const url=window.location.origin+window.location.pathname+window.location.hash; window.history.replaceState({},"",url); }
    sessionStorage.removeItem("cg-oauth-state"); sessionStorage.removeItem("cg-oauth-verifier");
  }catch{}
})();

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
  return { domains, contacts:[], appointments:[], messages:[], incidents:[], expenses:[], medSchedule:{medications:[],log:[]}, emergencyPlans:EMERGENCY_SCENARIOS.map(s=>({key:s.key,steps:[...s.steps]})), shifts:{}, careShifts:[], availability:{}, transitionTriggers:{}, statusHistory:[], postDeathChecklist:POST_DEATH_SECTIONS.map(s=>s.items.map(()=>false)), selfReports:[], savedDocs:[], medChanges:[], caregiverWellness:[], capacityLog:[], poaDecisions:[], log:[], domainOverrides:{}, settings:{caregiverPasscode:"1234",clientPasscode:"0000",deviceId:genDeviceId(),deviceName:"",stateCode:stateCode||"",schemaVersion:SCHEMA_VERSION}, _sync:{} };
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

  // Preserve local settings (passcodes, deviceId)
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
// Wound-care progress, lab pages and discharge paperwork routinely run to more than three images. Photos are
// externalised to the blob store (only a small "blobref:" string stays in the vault), so the cap is a UI choice
// rather than a storage constraint. One constant, used everywhere, so the limit can't drift between paths.
const MAX_ENTRY_PHOTOS = 8;
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
  if(Array.isArray(r.photos))out.photos=r.photos.filter(p=>typeof p==="string"&&(p.startsWith("blobref:")||(p.startsWith("data:image/")&&p.length<3000000))).slice(0,MAX_ENTRY_PHOTOS);
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

// Request persistent storage to prevent browser eviction. Returns true if storage is (now) persistent.
// This is independent of installation: on Firefox it prompts the user and, if allowed, exempts our storage
// from eviction; on Chromium it's granted via engagement heuristics; on iOS the Home-Screen route is what helps.
async function requestPersistentStorage(){
  try{
    if(navigator.storage&&navigator.storage.persisted){
      if(await navigator.storage.persisted())return true;
    }
    if(navigator.storage&&navigator.storage.persist){
      return await navigator.storage.persist();
    }
  }catch{}
  return false;
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
// ── Consent-grant key distribution (OQ1, per-institution). ECDH-ES wrap of a per-push ephemeral key
// to an institution's STATIC public key; the scope manifest is AES-GCM additional-authenticated-data,
// so a projection can't be re-presented under a falsified scope. DEK_F is never exposed; the grantee
// opens only its scope-bound projection. Proven in tests/grant-core-test.mjs.
const GRANT_INFO="care-guardian-grant-v1";
async function grantKeypair(){ return crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]); }
async function grantExpPub(k){ return new Uint8Array(await crypto.subtle.exportKey("raw",k)); }
async function grantImpPub(raw){ return crypto.subtle.importKey("raw",raw,{name:"ECDH",namedCurve:"P-256"},true,[]); }
async function grantSharedZ(myPriv,theirPub){ return new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:theirPub},myPriv,256)); }
async function grantHkdfAes(z,salt,info){ const base=await crypto.subtle.importKey("raw",z,"HKDF",false,["deriveKey"]); return crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt,info:new TextEncoder().encode(info)},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]); }
// ===== Circle (multi-device) symmetric key — pairing & rotation. Proven in circle-*-test.mjs; see CIRCLE-JOIN-DESIGN.md.
// Reuses the ECDH P-256 helpers above. circleKey is carried as a base64 string everywhere it appears in app state.
const CIRCLE_PAIR_INFO="cg-circle-pair-v1", CIRCLE_SAS_INFO="cg-circle-sas-v1", CIRCLE_ROT_INFO="cg-circle-rot-v1";
const _cte=new TextEncoder();
const _ccat=(...a)=>{const t=new Uint8Array(a.reduce((n,x)=>n+x.length,0));let o=0;for(const x of a){t.set(x,o);o+=x.length;}return t;};
async function hkdfBytes(z,salt,info,len){ const base=await crypto.subtle.importKey("raw",z,"HKDF",false,["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt,info:_cte.encode(info)},base,len*8)); }
async function circleGcmEnc(rawKey,pt,aad){ const k=await crypto.subtle.importKey("raw",rawKey,{name:"AES-GCM"},false,["encrypt"]); const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad},k,pt)); const o=new Uint8Array(12+ct.length); o.set(iv,0); o.set(ct,12); return o; }
async function circleGcmDec(rawKey,blob,aad){ const k=await crypto.subtle.importKey("raw",rawKey,{name:"AES-GCM"},false,["decrypt"]); const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:blob.slice(0,12),additionalData:aad},k,blob.slice(12)); return new Uint8Array(pt); }
function circleSas6(b){ const n=((b[0]<<24)|(b[1]<<16)|(b[2]<<8)|b[3])>>>0; return String(n%1000000).padStart(6,"0"); }
const circleNewKey=()=>b64enc(crypto.getRandomValues(new Uint8Array(32)));
async function circleNewDeviceKey(){ const kp=await grantKeypair(); return {jwkPriv:await crypto.subtle.exportKey("jwk",kp.privateKey), pub:b64enc(await grantExpPub(kp.publicKey))}; }
async function circleImportPriv(jwk){ return crypto.subtle.importKey("jwk",jwk,{name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]); }
// two-scan in-person pairing: B starts, A responds with the wrapped key + SAS, B completes
async function circlePairStartB(){ const kp=await grantKeypair(); return {ephJwk:await crypto.subtle.exportKey("jwk",kp.privateKey), pub:b64enc(await grantExpPub(kp.publicKey))}; }
async function circlePairRespondA(circleKeyB64, eBpubB64){
  const eBpub=b64dec(eBpubB64); const eA=await grantKeypair(); const eApub=await grantExpPub(eA.publicKey);
  const ss=await grantSharedZ(eA.privateKey, await grantImpPub(eBpub)); const salt=crypto.getRandomValues(new Uint8Array(16));
  const transcript=_ccat(eBpub,eApub,salt); const k=await hkdfBytes(ss,salt,CIRCLE_PAIR_INFO,32);
  const wrap=await circleGcmEnc(k,b64dec(circleKeyB64),transcript); const sas=circleSas6(await hkdfBytes(ss,salt,CIRCLE_SAS_INFO,4));
  return {eApub:b64enc(eApub), salt:b64enc(salt), wrap:b64enc(wrap), sas}; }
async function circlePairCompleteB(ephJwk, eBpubB64, eApubB64, saltB64, wrapB64){
  const eBpriv=await circleImportPriv(ephJwk); const eBpub=b64dec(eBpubB64); const eApub=b64dec(eApubB64); const salt=b64dec(saltB64);
  const ss=await grantSharedZ(eBpriv, await grantImpPub(eApub)); const transcript=_ccat(eBpub,eApub,salt);
  const k=await hkdfBytes(ss,salt,CIRCLE_PAIR_INFO,32); const sas=circleSas6(await hkdfBytes(ss,salt,CIRCLE_SAS_INFO,4));
  let circleKey=null, ok=false; try{ circleKey=b64enc(await circleGcmDec(k,b64dec(wrapB64),transcript)); ok=true; }catch(e){ ok=false; }
  return {circleKey, sas, ok}; }
// pairwise rotation: wrap newKey to each REMAINING device's pubkey; a removed device is simply not a recipient
async function circleRotate(newKeyB64, epoch, recipients){
  const eR=await grantKeypair(); const eRpub=await grantExpPub(eR.publicKey); const salt=crypto.getRandomValues(new Uint8Array(16)); const blobs={};
  for(const r of recipients){ const ss=await grantSharedZ(eR.privateKey, await grantImpPub(b64dec(r.pub))); const k=await hkdfBytes(ss,salt,CIRCLE_ROT_INFO+":"+r.deviceId,32);
    blobs[r.deviceId]=b64enc(await circleGcmEnc(k,b64dec(newKeyB64),_cte.encode("rot:"+epoch+":"+r.deviceId))); }
  return {epoch, eRpub:b64enc(eRpub), salt:b64enc(salt), blobs}; }
async function circleRotationOpen(rotObj, deviceId, jwkPriv){
  const blob=rotObj.blobs[deviceId]; if(!blob) throw new Error("no rotation blob for this device");
  const priv=await circleImportPriv(jwkPriv); const ss=await grantSharedZ(priv, await grantImpPub(b64dec(rotObj.eRpub)));
  const k=await hkdfBytes(ss,b64dec(rotObj.salt),CIRCLE_ROT_INFO+":"+deviceId,32);
  return b64enc(await circleGcmDec(k,b64dec(blob),_cte.encode("rot:"+rotObj.epoch+":"+deviceId))); }
// ── Circle sync transport: each device pushes its encrypted state to its own mutable prefix on the intake relay; others pull + merge. ──
const CIRCLE_STATE_AAD=new TextEncoder().encode("cg-circle-state-v1");
// An OAuth refresh token is a long-lived credential for the ADMIN's cloud account. It must never ride a sync
// payload to a teammate's device or sit inside a portable .care file: it cannot be revoked per-device, and a
// teammate removed from the circle would keep working cloud access even after the circle key is rotated.
function stripPortableSecrets(d){ if(!d||!d.settings) return d;
  const {_outbox, ...rest}=d;   // the upload queue is this device's own bookkeeping — never another device's work
  d=rest;
  const settings={...d.settings};
  delete settings.cloudAuth;        // OAuth refresh token for the admin's cloud account
  delete settings.deviceKey;        // this device's ECDH private key — a restored device mints a fresh one
  // Credentials found in the line-by-line audit. Each is stored in the clear inside the vault (safe at rest,
  // since the vault is encrypted) but was riding sync payloads and .care files — so an admin's credential landed
  // on every teammate's device and in every portable backup, could not be revoked per-device, and outlived
  // removal from the circle. A shared secret should be given deliberately, never inherited.
  delete settings.backupPasscode;   // passcode protecting continuous backups
  delete settings.syncServerApiKey; // bearer key for a self-hosted sync server
  delete settings.syncPasscode;     // team sync secret — each device should be told it, not handed it
  if(settings.circle){ const c={...settings.circle}; delete c.key; delete c.relay; settings.circle=c; }
  return {...d,settings}; }
function circleStripForSync(d){ const c=JSON.parse(JSON.stringify(d)); delete c._outbox; if(c.settings){ delete c.settings.deviceKey; delete c.settings.cloudAuth; delete c.settings.backupPasscode; delete c.settings.syncServerApiKey; delete c.settings.syncPasscode; if(c.settings.circle){ const cc={...c.settings.circle}; delete cc.key; delete cc.relay; c.settings.circle=cc; } } return c; } // never sync this device's private key, the circle key, or relay caps
function circleMergeRoster(a,b){ const m={}; for(const r of (a||[])) if(r&&r.deviceId) m[r.deviceId]=r; for(const r of (b||[])){ if(!r||!r.deviceId)continue; const e=m[r.deviceId]; if(!e){ m[r.deviceId]=r; continue; } const pick=(r.pub&&!e.pub)?r:(e.pub&&!r.pub)?e:((new Date(r.addedAt||0)>=new Date(e.addedAt||0))?r:e); m[r.deviceId]={...e,...pick,pending:!(pick.pub||e.pub||r.pub)}; } return Object.values(m); } // converge rosters across devices; a real pubkey wins over a pending placeholder
async function circleSealState(stateObj, circleKeyB64){ const pt=new TextEncoder().encode(JSON.stringify(circleStripForSync(stateObj))); return b64enc(await circleGcmEnc(b64dec(circleKeyB64), pt, CIRCLE_STATE_AAD)); }
async function circleOpenState(blobB64, circleKeyB64){ const pt=await circleGcmDec(b64dec(circleKeyB64), b64dec(blobB64), CIRCLE_STATE_AAD); return JSON.parse(new TextDecoder().decode(pt)); }
async function circleSyncPush(relay, sealedB64){ await INTAKE_BACKENDS.https.push({base:relay.base, prefix:relay.prefix, writeCap:relay.writeCap}, "state", sealedB64); }
async function circleSyncPull(relay, circleId, myDeviceId){ const cfg={base:relay.base, readCap:relay.readCap}; const names=await INTAKE_BACKENDS.https.list(cfg, "circle/"+circleId+"/"); const out=[]; for(const n of names){ const name=typeof n==="string"?n:(n.key||n.name||n.Key||""); if(!name||name.indexOf("/"+myDeviceId+"/")>=0||name.indexOf("/rotation/")>=0)continue; const blob=await INTAKE_BACKENDS.https.get(cfg, name); if(blob)out.push(blob); } return out; }
async function circleRotationFetch(relay, circleId){ try{ const txt=await INTAKE_BACKENDS.https.get({base:relay.base, readCap:relay.readCap}, "circle/"+circleId+"/rotation/latest"); if(!txt)return null; return JSON.parse(txt); }catch(e){ return null; } }
const CIRCLE_WORDS="able acid acre aged airy alarm album alert alien alley amber angel ankle apple april apron arena armor arrow aspen attic audio autumn award awake azure bacon badge baker balmy banjo barge basil batch beach beard beech began begin being bench berry birch bison black blade blaze bliss bloom blue board bonus boost booth brave bread brick brief broad brook brush buddy bugle build bunch cabin cable cacao cadet cameo candy canoe canyon cargo carol cedar chair chalk charm chase cheer chess chest chief chime choir chord cider cinema civic clamp clay clean clerk cliff cloak clock cloud clove clown coast cobra cocoa comet coral cousin cove craft crane crate creek crest crisp crown crumb curve daisy dance dandy delta demon depot diary diner ditch diver dizzy dough dove dozen draft drama dream dress drift drink drove eagle early earth easel ebony edify eight elbow elder elite ember emote epoch equal erase essay ether ethos exact extra fable fancy fauna feast fence ferry fetch fever fiber field final finch flame flask fleet flint flock flora flour flute focus forge forum fossil frame fresh frost fruit fudge gauge gecko ghost giant ginger glade gleam globe gloss glove going grace grain grand grape grasp grass green grill grove guide gulf gully harbor haven hazel heart heron hilly hippo honey horse hotel hound house hover human humid ideal igloo image inbox index indigo input ivory jaguar jelly jewel joint joker jolly joust judge juice jumbo karma kayak kazoo kettle koala label labor lance large larva lemon level light lilac".split(" ");
function circlePassphrase(n){ const c=n||6; const a=new Uint32Array(c); crypto.getRandomValues(a); const w=[]; for(let i=0;i<c;i++)w.push(CIRCLE_WORDS[a[i]%CIRCLE_WORDS.length]); return w.join("-"); }
const CIRCLE_REMOTE_AAD=new TextEncoder().encode("cg-circle-remote-v1");
const CIRCLE_ARGON={parallelism:1,iterations:3,memorySize:12288,hashLength:32}; // ~12MB memory-hard; tunable. Protects a short-lived, single-use, rate-limited relay handoff.
const SHOW_CAREGIVER_CHECKIN=false; // hidden pending David's decision — view stays routable, card + search entry gated
const CIRCLE_INVITE_TTL_MS=24*60*60*1000; // remote invites are single-use AND time-boxed (24h). The expiry lives inside the AES-GCM-sealed bundle, so it can't be tampered without the passphrase. Honored by the joining app; a production relay should also enforce a server-side TTL.
const circleInviteExpired=(b)=>!!(b&&b.expiresAt&&Date.now()>b.expiresAt);
async function circleRemoteSeal(plainStr, passphrase){ const {argon2id}=await import("hash-wasm"); const salt=crypto.getRandomValues(new Uint8Array(16)); const dk=await argon2id({password:passphrase,salt,...CIRCLE_ARGON,outputType:"binary"}); const ct=await circleGcmEnc(dk,new TextEncoder().encode(plainStr),CIRCLE_REMOTE_AAD); return {alg:"argon2id",kdf:CIRCLE_ARGON,salt:b64enc(salt),blob:b64enc(ct)}; }
async function circleRemoteOpen(env, passphrase){ const {argon2id}=await import("hash-wasm"); const dk=await argon2id({password:passphrase,salt:b64dec(env.salt),...env.kdf,outputType:"binary"}); const pt=await circleGcmDec(dk,b64dec(env.blob),CIRCLE_REMOTE_AAD); return new TextDecoder().decode(pt); }
// QR render + camera scanner for circle pairing (progressive enhancement over paste). Libraries load on demand.
function CircleQR({value,size}){ const ref=useRef(null); useEffect(()=>{ let alive=true; (async()=>{ try{ const QR=(await import("qrcode")).default; if(alive&&ref.current)await QR.toCanvas(ref.current,value,{width:size||240,errorCorrectionLevel:"L",margin:1}); }catch(e){} })(); return ()=>{alive=false}; },[value,size]); return <canvas ref={ref} width={size||240} height={size||240} style={{width:(size||240)+"px",height:(size||240)+"px",background:"#fff",borderRadius:"8px",maxWidth:"100%"}}/>; }
function CircleScanner({onScan,onClose}){ const vref=useRef(null); const [err,setErr]=useState(""); useEffect(()=>{ let alive=true,stream=null,raf=null; (async()=>{ try{ const jsQR=(await import("jsqr")).default; stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}); if(!alive){stream.getTracks().forEach(t=>t.stop());return;} const v=vref.current; if(!v)return; v.srcObject=stream; v.setAttribute("playsinline","true"); await v.play(); const cv=document.createElement("canvas"); const cx=cv.getContext("2d",{willReadFrequently:true}); const tick=()=>{ if(!alive)return; if(v.readyState>=2&&v.videoWidth){ cv.width=v.videoWidth; cv.height=v.videoHeight; cx.drawImage(v,0,0,cv.width,cv.height); const img=cx.getImageData(0,0,cv.width,cv.height); const code=jsQR(img.data,img.width,img.height); if(code&&code.data){ onScan(code.data); return; } } raf=requestAnimationFrame(tick); }; tick(); }catch(e){ setErr("Couldn't open the camera — paste the code instead."); } })(); return ()=>{ alive=false; if(raf)cancelAnimationFrame(raf); if(stream)stream.getTracks().forEach(t=>t.stop()); }; },[]); return (<div style={{marginTop:"0.6rem"}}><video ref={vref} style={{width:"100%",maxWidth:"320px",borderRadius:"8px",background:"#000"}} muted/>{err&&<p className="hint" style={{color:"var(--color-text-danger)"}}>{err}</p>}<button className="cancel-btn" style={{marginTop:"0.4rem"}} onClick={onClose}>Cancel scan</button></div>); }
// Authenticated header for a grant bundle (v2+): bound as AES-GCM additional-data so NONE of these fields can be
// altered after sealing without breaking decryption. (v1 bound only the scope manifest, leaving expiresAt/
// archetype/institution/family/createdAt malleable.) Domain-tagged and fixed-order for determinism.
const canonicalGrantHeader=(b)=>JSON.stringify(["cg-grant-hdr",b.v,b.grantId,b.archetype||null,b.institution||null,b.family||null,b.createdAt||null,b.expiresAt||null,b.scopeManifest||null]);
async function grantFingerprint(pubRaw){ const h=new Uint8Array(await crypto.subtle.digest("SHA-256",pubRaw)); const B="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let s=""; for(let i=0;i<8;i++)s+=B[h[i]%32]; return s.slice(0,4)+"·"+s.slice(4,8); }
async function sealGrantBundle(projection,scopeManifest,granteePubRaw,meta){
  const DEK_G=crypto.getRandomValues(new Uint8Array(32));
  const E=await grantKeypair();
  const Z=await grantSharedZ(E.privateKey,await grantImpPub(granteePubRaw));
  const pushNonce=b64enc(crypto.getRandomValues(new Uint8Array(12)));
  const salt=new TextEncoder().encode(meta.grantId+"|"+pushNonce);
  const WK=await grantHkdfAes(Z,salt,GRANT_INFO);
  const wrappedKey=await wrapWithKey(DEK_G,WK);
  const dekKey=await crypto.subtle.importKey("raw",DEK_G,{name:"AES-GCM"},false,["encrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const hdr={v:2,grantId:meta.grantId,archetype:meta.archetype,institution:meta.institution,family:meta.family,createdAt:meta.createdAt,expiresAt:meta.expiresAt,scopeManifest};
  const aad=new TextEncoder().encode(canonicalGrantHeader(hdr)); // whole header is authenticated, not just the scope
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad},dekKey,new TextEncoder().encode(JSON.stringify(projection))));
  return {...hdr,pushNonce,ephemeralPub:b64enc(await grantExpPub(E.publicKey)),wrappedKey,iv:b64enc(iv),ciphertext:b64enc(ct)};
}
async function openGrantBundle(bundle,granteePriv){
  const Epub=await grantImpPub(b64dec(bundle.ephemeralPub));
  const Z=await grantSharedZ(granteePriv,Epub);
  const salt=new TextEncoder().encode(bundle.grantId+"|"+bundle.pushNonce);
  const WK=await grantHkdfAes(Z,salt,GRANT_INFO);
  const DEK_G=await unwrapWithKey(bundle.wrappedKey,WK);
  const dekKey=await crypto.subtle.importKey("raw",DEK_G,{name:"AES-GCM"},false,["decrypt"]);
  const aad=new TextEncoder().encode(bundle.v>=2?canonicalGrantHeader(bundle):JSON.stringify(bundle.scopeManifest)); // v2: any tampered header field breaks decryption; v1: scope-only (legacy)
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64dec(bundle.iv),additionalData:aad},dekKey,b64dec(bundle.ciphertext));
  return JSON.parse(new TextDecoder().decode(pt));
}
// Two grant archetypes, one crypto machine — they differ only in projection scope (CONSENT-VISIBILITY-DESIGN.md §5).
const GRANT_ARCHETYPES={
  navigator:{label:"Care navigator",phi:true,
    cats:[["careStatus","Care-plan status & progress"],["incidents","Recent incidents"],["medAdherence","Medication-adherence summary"],["appointments","Upcoming appointments"],["concerns","Concerns you've flagged"]],
    defaults:{careStatus:true,incidents:true,medAdherence:true,appointments:true,concerns:true},
    excludes:["Your parent's private words (self-reports)","Financial records & expenses","Scanned documents & your full contact list"]},
  reviewer:{label:"Program reviewer",phi:false,
    cats:[["engagement","Engagement & status — no health details"]],
    defaults:{engagement:true},
    excludes:["All names, notes, and health details"]}
};
const REVIEWER_KEY="cg-reviewer-program"; // institution install: stored program keypair (JWK) + identity
// ── Live cloud-intake transport (TRANSPORT-INTAKE-DESIGN.md). Mirrors the cloud-provider seam, but `auth`
// is a write-only, prefix-scoped capability the INSTITUTION issued — not a family OAuth token. The store
// holds ciphertext only; containment proven in tests/intake-core-test.mjs. `base` is the institution's.
const intakeObjectName=(asOfMs,nonce)=>String(asOfMs).padStart(15,"0")+"-"+String(nonce||"").replace(/[^A-Za-z0-9]/g,"").slice(0,16)+".cgshare"; // key-safe: strip base64 +/= from the nonce (the bundle keeps its full pushNonce for crypto)
async function intakeContentHash(s){ return b64enc(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))); }
// Intake transport must be TLS: an http:// base would expose the claim token and the write/read capabilities to a
// network attacker (the bundles stay E2E-encrypted, but the capabilities themselves must not transit in cleartext).
// http:// is permitted only for loopback during local development.
function intakeBaseOk(base){ try{ const u=new URL(String(base||"")); if(u.protocol==="https:")return true; if(u.protocol==="http:"&&/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname))return true; return false; }catch{ return false; } }
// The care recipient's name is PHI. Only archetypes authorized for health detail (phi:true) carry it; the reviewer
// archetype, whose manifest states all names are excluded, gets a neutral label so the data matches the promise.
const projCareLabel=(archetype,name)=>{ const a=GRANT_ARCHETYPES[archetype]; return (a&&a.phi)?(name||"Care recipient"):"Care recipient"; };
const _ib=(b)=>String(b||"").replace(/\/$/,"");
const INTAKE_BACKENDS={
  https:{ label:"HTTPS intake endpoint",
    claim:async(cfg)=>{ const r=await fetch(_ib(cfg.base)+"/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:cfg.claimToken,grantId:cfg.grantId})}); if(!r.ok)throw new Error("claim "+r.status); return await r.json(); }, // → {prefix, writeCap}
    push:async(cfg,name,ct)=>{ const r=await fetch(_ib(cfg.base)+"/o/"+cfg.prefix+name,{method:"PUT",headers:{Authorization:"Bearer "+cfg.writeCap,"Content-Type":"application/octet-stream"},body:ct}); if(!r.ok)throw new Error("push "+r.status); return true; },
    list:async(cfg,prefix)=>{ const r=await fetch(_ib(cfg.base)+"/o/"+(prefix||"")+"?list=1",{headers:{Authorization:"Bearer "+cfg.readCap}}); if(!r.ok)throw new Error("list "+r.status); const j=await r.json(); return Array.isArray(j)?j:(j.objects||[]); },
    get:async(cfg,name)=>{ const r=await fetch(_ib(cfg.base)+"/o/"+name,{headers:{Authorization:"Bearer "+cfg.readCap}}); if(r.status===404)return null; if(!r.ok)throw new Error("get "+r.status); return await r.text(); },
  },
  presigned:{ label:"Presigned object storage",
    claim:async(cfg)=>{ const r=await fetch(_ib(cfg.base)+"/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:cfg.claimToken,grantId:cfg.grantId})}); if(!r.ok)throw new Error("claim "+r.status); return await r.json(); },
    push:async(cfg,name,ct)=>{ const s=await fetch(_ib(cfg.base)+"/sign",{method:"POST",headers:{Authorization:"Bearer "+cfg.writeCap,"Content-Type":"application/json"},body:JSON.stringify({key:cfg.prefix+name,method:"PUT"})}); if(!s.ok)throw new Error("sign "+s.status); const {url}=await s.json(); const r=await fetch(url,{method:"PUT",body:ct}); if(!r.ok)throw new Error("put "+r.status); return true; },
    list:async(cfg,prefix)=>{ const r=await fetch(_ib(cfg.base)+"/list?prefix="+encodeURIComponent(prefix||""),{headers:{Authorization:"Bearer "+cfg.readCap}}); if(!r.ok)throw new Error("list "+r.status); const j=await r.json(); return Array.isArray(j)?j:(j.objects||[]); },
    get:async(cfg,name)=>{ const s=await fetch(_ib(cfg.base)+"/sign",{method:"POST",headers:{Authorization:"Bearer "+cfg.readCap,"Content-Type":"application/json"},body:JSON.stringify({key:name,method:"GET"})}); if(!s.ok)throw new Error("sign "+s.status); const {url}=await s.json(); const r=await fetch(url); if(r.status===404)return null; if(!r.ok)throw new Error("get "+r.status); return await r.text(); },
  }
};
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
// When MFA is enabled the full DEK must be reachable ONLY via passkey or recovery code. A client-passcode wrap that
// holds the FULL DEK (the default, non-restricted tier) would be a single-factor bypass of MFA, so it is dropped.
// Only a SCOPED client wrap (clientScope==="r", which unwraps the projection key DEK_R and never the full DEK) is
// carried forward. rUnderF (DEK_R sealed under the full DEK, used by caregiver sessions) is always preserved.
function mfaCarryClientWrap(prevWk){
  const out={};
  if(prevWk&&prevWk.rUnderF)out.rUnderF=prevWk.rUnderF;
  if(prevWk&&prevWk.clientScope==="r"&&prevWk.r){ out.clientScope="r"; out.r=prevWk.r; }
  return out;
}

/* ═══ Reviewer (institution) keystore ═══
   The reviewer holds two secrets that must NOT sit in plaintext on a shared institutional machine: the program
   private key (decrypts every family's sealed bundle + shared-audit chain) and the intake read capability (lists
   and pulls every object). Both are sealed under a strong random vault key; the vault key is wrapped under the
   reviewer's passcode (always) and, optionally, under a passkey's PRF output (the institutional-desktop "OS
   keystore" path — same mechanism as family MFA). localStorage holds only ciphertext: no key, no read cap. */
const REVIEWER_VAULT_KEY="cg-reviewer-vault";
const REVIEWER_PRF_SALT=new TextEncoder().encode("care-guardian-reviewer-prf-v1"); // app salt for the reviewer passkey's PRF (distinct from family MFA)
async function buildReviewerVault(secrets, passcode){
  const vaultPassB64=b64enc(crypto.getRandomValues(new Uint8Array(32)));            // strong random vault key
  const sealed=await encryptData({program:secrets.program||null,intake:secrets.intake||null}, vaultPassB64);
  const pc=await encryptData(vaultPassB64, passcode);                               // vault key under the passcode
  return {vault:{v:1,sealed,pc,passkey:null}, vaultPassB64};
}
async function resealReviewerVault(vault, vaultPassB64, secrets){
  const sealed=await encryptData({program:secrets.program||null,intake:secrets.intake||null}, vaultPassB64);
  return {...vault, sealed};                                                        // wraps untouched; only the payload re-sealed
}
async function openReviewerVault(vault, passcode){
  const vaultPassB64=await decryptData(vault.pc, passcode);                         // throws on wrong passcode (AES-GCM auth)
  const secrets=await decryptData(vault.sealed, vaultPassB64);
  return {secrets, vaultPassB64};
}
async function addReviewerPasskeyWrap(vault, vaultPassB64, passcode, credentialId, prfOutput){
  const w=await buildPasskeyWrap(b64dec(vaultPassB64), passcode, prfOutput);        // vault key under passcode + PRF
  return {...vault, passkey:{credentialId, ...w}};
}
async function openReviewerVaultWithPasskey(vault, passcode, prfOutput){
  const raw=await unwrapWithPasskey(vault.passkey, passcode, prfOutput);            // throws on wrong passcode/PRF
  const vaultPassB64=b64enc(raw);
  const secrets=await decryptData(vault.sealed, vaultPassB64);
  return {secrets, vaultPassB64};
}
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
// ═══ Shared-scope audit chain (model B) — a separate, self-contained chain of ONLY shared-scope events ═══
// The family's full local audit log stays private and never leaves. This chain records ONLY events about a
// specific institutional relationship (per grant), so nothing private is in it — not even the COUNT of private
// activity (its seq counts only sharing events). It rides the family's backup (family controls it) and streams,
// sealed to the program key, to {grantPrefix}audit/. Proven in tests/shared-audit-test.mjs.
const SHARED_DB_NAME="care-guardian-shared", SHARED_STORE="entries", SHARED_DB_VER=1;
const SHARED_TYPES={"grant.created":1,"update.sent":1,"sharing.changed":1,"grant.revoked":1}; // ONLY these may enter the chain
function openSharedDB(){ return new Promise((res,rej)=>{ const r=indexedDB.open(SHARED_DB_NAME,SHARED_DB_VER); r.onupgradeneeded=e=>{const db=e.target.result; if(!db.objectStoreNames.contains(SHARED_STORE))db.createObjectStore(SHARED_STORE,{keyPath:"key"})}; r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(e.target.error); }); }
const sharedEntryKey=(grantId,seq)=>grantId+"|"+String(seq).padStart(9,"0");
const canonicalSharedEntry=(e)=>JSON.stringify([e.grantId,e.seq,e.ts,e.type,e.summary,e.prevHash||""]);
const computeSharedHash=(e)=>sha256Hex(canonicalSharedEntry(e));
const sharedObjectName=(seq)=>String(seq).padStart(9,"0")+".cgaudit"; // deterministic per seq → write-once key (server enforces WORM on audit/); a re-push hits the same key and is an idempotent no-op
async function writeSharedEntry(entry,key){ const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(entry))); const db=await openSharedDB(); const tx=db.transaction(SHARED_STORE,"readwrite"); tx.objectStore(SHARED_STORE).put({key:sharedEntryKey(entry.grantId,entry.seq),iv:Array.from(iv),ct:Array.from(new Uint8Array(ct))}); await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=rej}); db.close(); }
async function readSharedEntries(key){ if(!key)return[]; try{ const db=await openSharedDB(); const tx=db.transaction(SHARED_STORE,"readonly"); const all=await new Promise((res,rej)=>{const r=tx.objectStore(SHARED_STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=rej}); db.close(); const out=[]; for(const rec of all){ try{ const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(rec.iv)},key,new Uint8Array(rec.ct)); out.push(JSON.parse(new TextDecoder().decode(pt))); }catch{} } return out; }catch{return[]} }
// Independent verification + gap classification: tampering (content/link altered) vs gap (missing interior seq —
// definitive) vs truncated (missing tail vs a known tip — unconfirmed). Time gaps are NOT seq gaps and never flagged.
async function verifySharedChain(entries,expectedTip){
  const c=(entries||[]).slice().sort((a,b)=>a.seq-b.seq); if(!c.length)return{status:"none",count:0};
  let brokenAtSeq=null,missingSeq=null;
  for(let i=0;i<c.length;i++){ const e=c[i];
    if(await computeSharedHash(e)!==e.hash){brokenAtSeq=e.seq;break}
    if(i>0&&e.seq!==c[i-1].seq+1){missingSeq=c[i-1].seq+1;break}   // seq gap first (specific cause of a broken link)
    if(i>0&&e.prevHash!==c[i-1].hash){brokenAtSeq=e.seq;break}
  }
  if(brokenAtSeq)return{status:"tampered",brokenAtSeq,count:c.length};
  if(missingSeq)return{status:"gap",missingSeq,count:c.length};
  if(c[0].seq!==1)return{status:"gap",missingSeq:1,count:c.length};
  const tipSeq=c[c.length-1].seq;
  if(expectedTip&&expectedTip>tipSeq)return{status:"truncated",have:tipSeq,expected:expectedTip,count:c.length};
  return{status:"ok",tip:tipSeq,count:c.length};
}
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
    delete st.caregiverPasscode; delete st.clientPasscode; // legacy plaintext passcodes are inert for auth (the wrapped DEK is authoritative) but must never ride in on an import
    delete st.circle; delete st.deviceKey; // circle key + this device's private key are secrets/identity — a restored device re-pairs rather than inheriting them
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
  const valPhotos=(arr)=>(arr||[]).map(item=>{if(item&&item.photos){item.photos=item.photos.filter(p=>typeof p==="string"&&(p.startsWith("blobref:")||(p.startsWith("data:image/")&&p.length<3000000))).slice(0,MAX_ENTRY_PHOTOS)}
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
let _pdfjs = null, _pdfReady = false;
const PDF_TIMEOUT_MS = 120000; // parsing must never hang the UI forever, whatever goes wrong underneath

async function loadPdfJs() {
  if (_pdfjs && _pdfReady) return _pdfjs;
  const lib = _pdfjs || (_pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")); // local chunk, app's own origin
  // NO Web Worker. pdf.js normally parses in a Worker, but delivering that worker failed in production three times:
  // as .mjs a host served it with the wrong MIME type; inlined it blew the 2 MiB precache ceiling and broke the build;
  // and as a separate classic .js it produced a silent hang — a dead Worker never replies, so pdf.js's promise simply
  // never settles and the spinner spins forever. Registering the worker module on globalThis makes pdf.js run it
  // in-process: nothing to fetch, nothing to construct, nothing to mis-serve, and one 1.35MB chunk instead of two.
  // Trade-off: parsing occupies the UI thread. Care documents are small (discharge summaries, med lists, labs), and a
  // brief pause is far better than an unresolvable spinner. The timeout below bounds the worst case regardless.
  globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  lib.GlobalWorkerOptions.workerSrc = "";
  _pdfReady = true;
  return lib;
}

// Rebuild LINE STRUCTURE from pdf.js text items. pdf.js returns positioned fragments, not lines; joining them
// with spaces turns a whole page — a lab table, a medication list — into one giant line, and every parser here is
// line-based, so it could only ever find one result per page. Group fragments by their y coordinate, order each
// row by x, and widen big horizontal gaps so table columns stay visually separated.
function itemsToLines(items){
  const rows=[];
  for(const it of (items||[])){
    if(!it || typeof it.str!=="string" || !it.str.trim()) continue;
    const tr=it.transform||[]; const x=+tr[4]||0, y=+tr[5]||0;
    let row=null, best=Infinity;
    for(const r of rows){ const d=Math.abs(r.y-y); if(d<=2.5 && d<best){ best=d; row=r; } } // same visual line
    if(!row){ row={y,items:[]}; rows.push(row); }
    row.items.push({x,str:it.str,w:+it.width||0});
  }
  rows.sort((a,b)=>b.y-a.y); // top of the page downward
  return rows.map(r=>{
    r.items.sort((a,b)=>a.x-b.x);
    let out="", prevEnd=null;
    for(const it of r.items){
      if(prevEnd!==null){ const gap=it.x-prevEnd; if(gap>12) out+="   "; else if(gap>1.2||!/\s$/.test(out)) out+=" "; }
      out+=it.str; prevEnd=it.x+it.w;
    }
    return out.replace(/\s+/g," ").trim();
  }).filter(l=>l);
}

function pdfWithTimeout(promise, ms, onTimeout) {
  let t; return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise((_, rej) => { t = setTimeout(() => { try { onTimeout && onTimeout(); } catch (e) {} rej(new Error("PDF_TIMEOUT")); }, ms); })
  ]);
}

// `token` lets the user cancel a wrong file mid-read: it is checked before each page, and the pdf.js task is
// destroyed on the way out so a large document stops occupying the thread instead of running to completion.
async function extractPdfText(file, token) {
  const cancelled = () => !!(token && token.cancelled);
  const lib = await loadPdfJs();
  if (cancelled()) throw new Error("PDF_CANCELLED");
  const buf = await file.arrayBuffer();
  await new Promise(r => setTimeout(r, 0)); // let the "extracting…" spinner paint before we occupy the thread
  if (cancelled()) throw new Error("PDF_CANCELLED");
  const task = lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false });
  if (token) token.task = task;
  const stop = () => { try { task.destroy(); } catch (e) {} };
  let pdf;
  try { pdf = await pdfWithTimeout(task.promise, PDF_TIMEOUT_MS, stop); }
  catch (e) { stop(); throw e; }
  let text = "";
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      if (cancelled()) throw new Error("PDF_CANCELLED");
      const page = await pdfWithTimeout(pdf.getPage(i), PDF_TIMEOUT_MS);
      const content = await pdfWithTimeout(page.getTextContent(), PDF_TIMEOUT_MS);
      text += itemsToLines(content.items).join("\n") + "\n\n";
      if (token) token.pagesDone = i;
      await new Promise(r => setTimeout(r, 0)); // yield so a Cancel tap is actually seen between pages
    }
  } catch (e) { try { pdf.destroy(); } catch (e2) {} stop(); throw e; }
  try { pdf.destroy(); } catch (e) {}
  if (cancelled()) throw new Error("PDF_CANCELLED");
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

/* ═══ Medication reconciliation — pure, testable. Documents contribute ONLY structured medication and test data;
   the document's text itself is never stored (see saveDocToLibrary). ═══ */
const MED_STOP_MARKERS = /\b(discontinued?|d\/c(?:'?d)?|stopped?|stop taking|no longer taking|held|hold|cease[d]?|taper(?:ed)? off)\b/i;
const MED_STOP_HEADINGS = /^(discontinued|stopped|d\/c(?:'?d)?|medications? (?:discontinued|stopped)|removed medications?)\b/i;
const MED_START_HEADINGS = /^(current|active|continue[d]?|new|started|admission|discharge) medications?\b|^medications?\b/i;
const medKey = (n) => String(n||"").toLowerCase().replace(/[^a-z0-9]/g,"");
// Classify each medication mentioned in the text as "stopped" or "active", using (a) an explicit discontinued
// section heading, which governs every line beneath it, and (b) stop wording on the medication's own line.
function parseMedStatuses(text){
  const out={}; const lines=String(text||"").split(/\n/); let section=null;
  for(const raw of lines){
    const line=raw.trim(); if(!line)continue;
    const bare=line.replace(/[:.\s]+$/,"");
    if(MED_STOP_HEADINGS.test(bare) && bare.length<60){ section="stopped"; continue; }
    if(MED_START_HEADINGS.test(bare) && bare.length<60){ section="active"; continue; }
    const drugRe=new RegExp("("+COMMON_DRUGS+")","gi"); let m;
    while((m=drugRe.exec(line))!==null){
      const k=medKey(m[1]); if(!k)continue;
      const stopped = MED_STOP_MARKERS.test(line) || section==="stopped";
      // an explicit stop marker on the line always wins; otherwise first classification stands
      if(MED_STOP_MARKERS.test(line)) out[k]="stopped";
      else if(out[k]===undefined) out[k]=stopped?"stopped":"active";
    }
  }
  return out;
}
// Map a parsed frequency string onto the app's time slots so an imported medication lands on the admin grid.
function freqToSlots(freq){
  const f=String(freq||"").toLowerCase();
  if(/as needed|prn/.test(f)) return ["As Needed"];
  if(/bedtime|qhs/.test(f)) return ["Bedtime"];
  if(/morning/.test(f)) return ["Morning"];
  if(/four times/.test(f)) return ["Morning","Midday","Afternoon","Bedtime"];
  if(/three times/.test(f)) return ["Morning","Midday","Evening"];
  if(/twice/.test(f)) return ["Morning","Evening"];
  if(/every other day|weekly|monthly/.test(f)) return ["Morning"];
  return ["Morning"]; // Daily and anything unrecognised — caregiver can adjust
}
function docMedToScheduleMed(m){
  return { name:m.name, dosage:m.dosage||"", timeSlots:freqToSlots(m.frequency),
    notes:[m.frequency,m.route,m.notes].filter(Boolean).join(" · ") };
}
// Compare a document's medications against the current schedule. Returns proposed changes only — nothing is applied
// here. Dose differences are surfaced as "changed" rather than silently overwritten.
function reconcileMedications(currentMeds, docMeds, statuses){
  const cur=(currentMeds||[]).filter(Boolean);
  const byKey={}; for(const m of cur){ const k=medKey(m.name); if(k&&!byKey[k])byKey[k]=m; }
  const seen={}, toAdd=[], toDiscontinue=[], toUpdate=[], unchanged=[];
  for(const dm of (docMeds||[])){
    const k=medKey(dm.name); if(!k||seen[k])continue; seen[k]=1;
    const status=(statuses||{})[k];
    const existing=byKey[k];
    if(status==="stopped"){
      if(existing && !existing.discontinued) toDiscontinue.push({key:k,id:existing.id,name:existing.name,dosage:existing.dosage||""});
      continue;
    }
    if(!existing){ toAdd.push({key:k,...docMedToScheduleMed(dm)}); continue; }
    const a=String(existing.dosage||"").trim().toLowerCase(), b=String(dm.dosage||"").trim().toLowerCase();
    if(b && a!==b) toUpdate.push({key:k,id:existing.id,name:existing.name,from:existing.dosage||"(none)",to:dm.dosage});
    else unchanged.push({key:k,name:existing.name});
  }
  return {toAdd,toDiscontinue,toUpdate,unchanged};
}

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

/* ═══ Lab results parser ═══
   Handles the two layouts real documents use:
     (a) TABULAR — one row per result:      Sodium 138 mEq/L 135-145 H
     (b) BLOCK   — a patient-portal trend report, where each result spans three lines in any order:
                     WHITE BLOOD CELLS  /  7.34 K/uL  /  Normal Range: 4.23 - 9.07 K/uL
   A row-only parser reads the block layout as name "Normal Range" with the range's LOWER BOUND as the result —
   which is not just useless but wrong, so the block form is parsed explicitly. Flags are DERIVED by comparing the
   value with the reference range whenever both are known (an explicit High/Low in the document still wins). */
const LAB_ANALYTES = ["sodium","potassium","chloride","co2","carbon dioxide","bicarbonate","anion gap","bun","urea nitrogen",
"creatinine","egfr","gfr","glucose","calcium","magnesium","phosphorus","albumin","total protein","bilirubin","alt","ast",
"alkaline phosphatase","alk phos","ggt","ldh","wbc","white blood cells","rbc","red blood cells","hemoglobin","hgb","hematocrit","hct",
"platelets","plt","mpv","mcv","mch","mchc","rdw","rdw-cv","rdw-sd","neutrophils","lymphocytes","monocytes","eosinophils","basophils",
"immature granulocytes","tsh","t4","free t4","t3","a1c","hemoglobin a1c","cholesterol","hdl","ldl","triglycerides","vitamin b12","b12",
"folate","vitamin d","ferritin","iron","tibc","inr","pt","ptt","psa","troponin","bnp","crp","esr","uric acid","ammonia","lactate",
"osmolality","cortisol","testosterone"];
const LAB_HEADER_WORDS = /\b(test|result|units?|reference|ref|range|flag|status|specimen|collected|reported|ordered|performed)\b/gi;
const LAB_STOP_NAMES = /^(page|date|time|name|patient|doctor|provider|physician|mrn|dob|phone|fax|account|ordered|collected|received|reported|specimen|status|final|test|result|units?|reference|flag|range|normal range|component|comments?|performed|lab|laboratory|address|of|and|the)$/i;
// Lines that are report furniture, never data.
const LAB_JUNK_LINE = /^(result trends|results?\b[^:]*\b(limited|found)|component\b|page \d|printed|final report|collected|reported|ordered)/i;
const LAB_TABLE_MARK = /\(table \d+ of \d+\)/i;
const LAB_MONTHS = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
// "Normal Range: 4.23 - 9.07 K/uL [7.34 K/uL] [Low]" — the trailing part may carry the value, a flag, or nothing.
const LAB_RANGE_LINE = /^(?:normal|reference|ref)?\s*range\s*[:\-]?\s*([<>]?=?-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)\s*(\S+)?\s*(.*)$/i;
const LAB_VALUE_RE = /^[<>]?=?-?\d+(?:\.\d+)?$/;
const LAB_RANGE_RE = /^[\(\[]?(?:[<>]=?\s*\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*-?\d+(?:\.\d+)?)[\)\]]?$/i;
// Units are whitelisted (plus a generic a/b shape). A loose pattern happily accepted words like "Table" as a unit.
const LAB_UNITS = ["%","mg/dl","g/dl","mg/l","g/l","meq/l","mmol/l","umol/l","nmol/l","pmol/l","miu/l","iu/l","u/l","k/ul","m/ul",
"ng/ml","pg/ml","ug/ml","mcg/ml","ng/dl","ug/dl","mcg/dl","cells/ul","fl","pg","ng","mg","g","ml","dl","l","sec","secs","ratio",
"mm/hr","mosm/kg","x10e3/ul","10*3/ul","10*6/ul","mmhg","ku/l","miu/ml","uiu/ml","mg/g","%hb"];
const LAB_FLAG_MAP = {H:"H",HH:"HH",L:"L",LL:"LL",A:"A",AB:"A",C:"C",HIGH:"H",LOW:"L",ABNORMAL:"A",CRITICAL:"C",PANIC:"C"};
const LAB_FLAG_WORD = /\b(high|low|abnormal|critical|panic)\b/i;
const _labNorm = (t) => String(t||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const _labKnown = (name) => { const n=_labNorm(name); return LAB_ANALYTES.some(a=>n===a||n.endsWith(" "+a)||n.startsWith(a+" ")||n.includes(" "+a+" ")); };
const _labUnit = (t) => { const u=String(t||"").replace(/^[\(\[]|[\)\]]$/g,""); const n=u.toLowerCase();
  return (LAB_UNITS.indexOf(n)>=0 || /^[a-zµμ]{1,6}\/[a-zµμ]{1,6}\d?$/i.test(u)) ? u : ""; };
// Derive High/Low from the numbers when the document doesn't say — deterministic, and it avoids guessing from
// stray flag words whose column position is lost in text extraction.
const _labDerivedFlag = (value, low, high) => { const v=parseFloat(value), lo=parseFloat(low), hi=parseFloat(high);
  if(!isFinite(v)||!isFinite(lo)||!isFinite(hi)) return ""; return v<lo?"L":(v>hi?"H":""); };
function parseLabResults(text) {
  const out=[], seen={};
  const lines=String(text||"").split(/\n/).map(l=>l.trim()).filter(Boolean);
  let pendName="", pendValue="", pendUnit="";
  const clear=()=>{ pendName=""; pendValue=""; pendUnit=""; };
  const emit=(name,value,unit,range,flag)=>{
    if(!name||!value) return;
    if(LAB_STOP_NAMES.test(name)||LAB_MONTHS.test(name)) return;
    if(!unit && !range && !_labKnown(name)) return;
    const key=_labNorm(name)+"|"+value; if(seen[key]) return; seen[key]=1;
    out.push({test:name,value,unit:unit||"",range:range||"",flag:flag||"",notes:""});
  };
  for(const line of lines){
    if(LAB_JUNK_LINE.test(line)||LAB_TABLE_MARK.test(line)){ clear(); continue; }
    if((line.match(LAB_HEADER_WORDS)||[]).length>=3){ clear(); continue; }   // a column-header row
    // ── (b) BLOCK layout: the reference-range line closes a block ──
    const rm=LAB_RANGE_LINE.exec(line);
    if(rm){
      const low=rm[1], high=rm[2], rUnit=_labUnit(rm[3]), rest=(rm[4]||"").trim();
      let value=pendValue, unit=pendUnit||rUnit, flag="";
      if(!value){ const rt=rest.split(/\s+/).filter(Boolean);           // value may sit on the range line itself
        for(let i=0;i<rt.length;i++){ if(LAB_VALUE_RE.test(rt[i])){ value=rt[i]; if(!unit)unit=_labUnit(rt[i+1]); break; } } }
      const fw=rest.match(LAB_FLAG_WORD); if(fw) flag=LAB_FLAG_MAP[fw[1].toUpperCase()]||"";
      if(!flag) flag=_labDerivedFlag(value,low,high);
      emit(pendName,value,unit||rUnit,low+"-"+high,flag);
      clear(); continue;
    }
    const toks=line.replace(/([:=])/g," ").split(/\s+/).filter(Boolean);
    // ── (a) TABULAR / single-line: NAME VALUE [UNIT] [RANGE] [FLAG] ──
    let vi=-1;
    for(let i=1;i<toks.length;i++){ if(LAB_VALUE_RE.test(toks[i]) && !LAB_RANGE_RE.test(toks[i])){ vi=i; break; } }
    if(vi>=1 && vi<=6){
      const name=toks.slice(0,vi).join(" ").replace(/[,;]+$/,"").trim();
      const value=toks[vi]; let unit="",range="",flag="";
      for(let i=vi+1;i<Math.min(toks.length,vi+5);i++){
        const t=toks[i].replace(/[,;]+$/,""), up=t.toUpperCase().replace(/[^A-Z]/g,"");
        if(!range && LAB_RANGE_RE.test(t)){ range=t.replace(/^[\(\[]|[\)\]]$/g,""); continue; }
        if(!unit && _labUnit(t) && !LAB_FLAG_MAP[up]){ unit=_labUnit(t); continue; }
        if(!flag && LAB_FLAG_MAP[up] && /^[A-Za-z]+$/.test(t)){ flag=LAB_FLAG_MAP[up]; continue; }
      }
      if(!flag && range){ const p=range.split(/\s*(?:-|–|—|to)\s*/); if(p.length===2) flag=_labDerivedFlag(value,p[0],p[1]); }
      if(name && !LAB_STOP_NAMES.test(name) && !LAB_MONTHS.test(name) && (unit||range||_labKnown(name))){
        emit(name,value,unit,range,flag); clear(); continue;
      }
    }
    // ── a bare "VALUE UNIT" line (block layout) ──
    if(toks.length<=3 && LAB_VALUE_RE.test(toks[0])){
      pendValue=toks[0]; pendUnit=_labUnit(toks[1])||pendUnit; continue;
    }
    // ── otherwise: a component NAME awaiting its value/range ──
    if(/[A-Za-z]/.test(line) && line.length<=60 && !LAB_MONTHS.test(line)) pendName=line.replace(/[:\-\s]+$/,"");
  }
  return out;
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

/* ═══ Diagnoses & clinical conclusions — the third thing worth keeping from a document ═══
   Storage-bounded ON PURPOSE: caps are small and, unlike the old 10,000-character rawText, any truncation is
   RECORDED (truncated:true) and shown to the user rather than happening silently. Worst case ~8 KB per document;
   a typical discharge summary contributes 1–2 KB. */
const DX_MAX_ITEMS = 40, DX_MAX_LEN = 140;
const CONCLUSION_MAX_ITEMS = 6, CONCLUSION_MAX_LEN = 600;
// "Assessment" is deliberately NOT here: in practice "Assessment and Plan" is prose, and treating it as a
// diagnosis list swept whole sentences in as diagnoses. It is captured as a clinical CONCLUSION instead.
const DX_HEADINGS = /^(diagnos[ei]s|diagnoses|impression|impressions|problem list|active problems|past medical history|pmh|conditions)\b/i;
const DX_STOP_HEADINGS = /^(medications?|allergies|vitals?|vital signs|assessment|plan|conclusions?|recommendations|instructions|follow[- ]?up|labs?|laboratory|physical exam|review of systems|ros|social history|family history|referrals|chief complaint|hpi|history of present illness)\b/i;
// ICD-10-CM: a letter (not U), two digits, optionally a dot and up to four more characters.
const ICD10_RE = /\b([A-TV-Z][0-9][0-9AB](?:\.[0-9A-TV-Z]{1,4})?)\b/g;
const CONCLUSION_TITLES = /^(assessment|plan|assessment and plan|a\/p|impression|impressions|conclusion|conclusions|recommendations|follow-up|instructions)$/i;
// The closing bracket in that character class is written as \u0029 so the paren-balance build check stays accurate.
const _dxClean = (l) => String(l||"").replace(/^[\s*•\-–—\u2022]*\d*[.\u0029]?\s*/,"").replace(/\s+/g," ").trim();
// Pull diagnoses from (a) an explicit diagnosis/impression section and (b) any line carrying an ICD-10 code.
function parseDiagnoses(text){
  const out=[], seen={}; const lines=String(text||"").split(/\n/); let inDx=false;
  const push=(label,code)=>{
    let t=_dxClean(label); if(!t)return;
    if(t.length>DX_MAX_LEN)t=t.slice(0,DX_MAX_LEN).replace(/\s+\S*$/,"")+"…";
    const k=t.toLowerCase().replace(/[^a-z0-9]/g,""); if(!k||k.length<3||seen[k])return;
    if(out.length>=DX_MAX_ITEMS)return;
    seen[k]=1; out.push(code?{text:t,code}:{text:t});
  };
  for(const raw of lines){
    const line=raw.trim(); if(!line)continue;
    const bare=line.replace(/[:.\s]+$/,"");
    if(bare.length<60&&DX_STOP_HEADINGS.test(bare)){ inDx=false; continue; }
    if(bare.length<60&&DX_HEADINGS.test(bare)){ inDx=true;
      const after=line.replace(/^[^:]*:/,"").trim(); if(after)push(after,(after.match(ICD10_RE)||[])[0]);
      continue; }
    ICD10_RE.lastIndex=0; const codes=line.match(ICD10_RE);
    if(codes){ push(line.replace(ICD10_RE,"").replace(/[()\[\],;]+/g," "),codes[0]); continue; }
    if(inDx)push(line);
  }
  return out;
}
// Keep the reasoning sections (assessment / plan / impression / follow-up), bounded and honestly marked.
function parseConclusions(sections){
  const out=[];
  for(const s of (sections||[])){
    const title=String(s.title||"").trim();
    if(!CONCLUSION_TITLES.test(title))continue;
    let body=String(s.body||"").replace(/\s+/g," ").trim(); if(body.length<10)continue;
    let truncated=false;
    if(body.length>CONCLUSION_MAX_LEN){ body=body.slice(0,CONCLUSION_MAX_LEN).replace(/\s+\S*$/,""); truncated=true; }
    out.push({title,body,truncated});
    if(out.length>=CONCLUSION_MAX_ITEMS)break;
  }
  return out;
}

// "saved 4 minutes ago" reads better than a timestamp for something the user checks at a glance.
function relTime(iso){
  if(!iso) return "";
  const ms=Date.now()-new Date(iso).getTime();
  if(!isFinite(ms)||ms<0) return "just now";
  const m=Math.floor(ms/60000);
  if(m<1) return "just now";
  if(m<60) return m+" minute"+(m===1?"":"s")+" ago";
  const h=Math.floor(m/60); if(h<24) return h+" hour"+(h===1?"":"s")+" ago";
  const d=Math.floor(h/24); if(d<7) return d+" day"+(d===1?"":"s")+" ago";
  return new Date(iso).toLocaleDateString();
}

/* ═══ Backup state: is this data actually backed up? ═══
   The old answer was a timestamp (`lastBackupAt`), which is the wrong question. A backup taken before ten more
   incidents were logged still read as "done" for seven days; a backup taken through any other path counted for
   nothing. What a caregiver needs to know is not WHEN they last backed up but WHETHER what is on screen is in
   the file — and if not, how much is missing.
   So: fingerprint the exportable content. Same hash ⇒ backed up, no prompt, regardless of locking, unlocking or
   the calendar. Different hash ⇒ say how many records changed. */
const BACKUP_COUNT_KEYS=["incidents","appointments","contacts","expenses","documents","selfReports","savedDocs","medChanges","messages","shifts"];
function backupCountable(d){
  let n=0;
  for(const k of BACKUP_COUNT_KEYS) n+=Array.isArray(d&&d[k])?d[k].length:0;
  const ms=(d&&d.medSchedule)||{};
  n+=(ms.medications||[]).length+(ms.log||[]).length;
  const dom=(d&&d.domains)||{};
  for(const k of Object.keys(dom)) n+=((dom[k]&&dom[k].notes)||"").length?1:0;
  return n;
}
// Hash the content that a backup would contain, ignoring bookkeeping that changes on its own (sync clocks, the
// upload queue, the backup marker itself) — otherwise the app would report itself out of date the instant it
// finished backing up.
async function backupFingerprint(d){
  const c=JSON.parse(JSON.stringify(d||{}));
  delete c._sync; delete c._outbox; delete c._exportMeta;
  if(c.settings){ const st={...c.settings};
    delete st.lastBackupAt; delete st.backupFingerprint; delete st.backupCount; delete st.cloudAuth; c.settings=st; }
  const enc=new TextEncoder().encode(JSON.stringify(c));
  const buf=await crypto.subtle.digest("SHA-256",enc);
  return [...new Uint8Array(buf).slice(0,16)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
// "up-to-date" | "behind" | "none". `behind` carries how many records changed, so the UI can be specific.
function backupState(d, fingerprint){
  const marked=(d&&d.settings&&d.settings.backupFingerprint)||"";
  if(!marked) return {state:"none",changed:backupCountable(d)};
  if(marked===fingerprint) return {state:"up-to-date",changed:0};
  const was=(d&&d.settings&&d.settings.backupCount)||0;
  return {state:"behind",changed:Math.max(1,backupCountable(d)-was)};
}

/* ═══ Storage layer (Phase 0) ═══
   One interface over every place the encrypted record can live: the device only, a relay, the admin's cloud, or
   an in-memory fake used by tests. Everything above this layer works the same regardless.
   Locked decisions this encodes:
     • Local-only is a first-class mode, never a degraded one — "device" is a real provider, not a null case.
     • One provider per circle; a second admin connecting a different one is a conflict to surface, not merge.
     • The relay stays the transport; the admin's cloud is the durable store.
     • After 7 days without a successful write, the user is told the cloud copy is stale.
   No readable data crosses this boundary: callers hand over ciphertext already sealed under the circle key. */
const STORAGE_STALE_DAYS = 7;
const STORAGE_KINDS = ["device","relay","cloud","memory"];
// Object layout. Per-device objects, never one shared blob: a single blob is last-write-wins at file granularity,
// which silently discards a teammate's work.
// Object names are DERIVED, not descriptive. The provider can already see how many objects exist, how big they
// are and when they change; it should not additionally be handed the vocabulary to interpret them. The previous
// layout said "audit-", "archive/2026-07/" and the device id in clear — which reveals that a HIPAA audit trail
// exists, which months had activity, and how many devices a family has, all without decrypting anything.
// Names are now HMAC-derived from the circle key, so they are stable (the same object always lands in the same
// place, which the manifest and re-export depend on) but meaningless to anyone without the key.
const STORAGE_NAME_INFO="cg-objname-v1";
let _objNameKey=null, _objNameKeyFor="";
async function storageNameKey(circleKeyB64){
  if(_objNameKey && _objNameKeyFor===circleKeyB64) return _objNameKey;
  const raw=await crypto.subtle.importKey("raw", b64dec(circleKeyB64||"0"), {name:"HKDF"}, false, ["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:new Uint8Array(0),info:new TextEncoder().encode(STORAGE_NAME_INFO)}, raw, 256);
  _objNameKey=await crypto.subtle.importKey("raw", bits, {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  _objNameKeyFor=circleKeyB64;
  return _objNameKey;
}
async function storageObjName(circleKeyB64, parts){
  const key=await storageNameKey(circleKeyB64);
  const sig=await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(parts.join("\u0000")));
  return b64enc(new Uint8Array(sig).slice(0,15)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
// Plain layout, kept for the local/relay case and as the fallback when no circle key is available (solo use
// before a circle exists). The manifest records which scheme a device used, so both can coexist.
const storageKeys = {
  state:   (circleId,deviceId)=>"circle/"+circleId+"/"+deviceId+"/state.enc",
  rotation:(circleId)=>"circle/"+circleId+"/rotation/latest.enc",
  manifest:(circleId)=>"circle/"+circleId+"/manifest.enc",
  audit:   (circleId,deviceId,month)=>"archive/"+month+"/audit-"+deviceId+"."+circleId+".enc",
  blob:    (blobId)=>"blobs/"+blobId+".enc",
};
// Opaque equivalents. Everything lands in one flat folder: a directory tree is itself a disclosure (it shows how
// the data is organised and how many of each kind exist), so there isn't one.
const storageKeysOpaque = {
  async state(circleKey,circleId,deviceId){ return "cg/"+await storageObjName(circleKey,["state",circleId,deviceId])+".bin"; },
  async rotation(circleKey,circleId){ return "cg/"+await storageObjName(circleKey,["rotation",circleId])+".bin"; },
  async audit(circleKey,circleId,deviceId,month){ return "cg/"+await storageObjName(circleKey,["audit",circleId,deviceId,month])+".bin"; },
  async blob(circleKey,blobId){ return "cg/"+await storageObjName(circleKey,["blob",blobId])+".bin"; },
};
// The manifest keeps a FIXED name: a device arriving for the first time must be able to find the index, and it
// can only derive names once it holds the circle key — which it does, but the fixed name also lets a device with
// a rotated key still locate the index rather than losing the whole store.
const STORAGE_MANIFEST_NAME="cg/index.bin";
// ── Size padding ──
// Ciphertext length leaks content volume: a 40 KB state object versus 400 KB says how much care is being
// recorded, and a sudden jump says something happened. Padding to buckets blunts that. Buckets grow
// proportionally so the overhead stays bounded (never more than ~25%) rather than padding everything to a
// worst case nobody needs.
function storagePadTo(len){
  const steps=[4096,8192,16384,32768,65536,131072,262144,524288,1048576];
  for(const s of steps) if(len<=s) return s;
  return Math.ceil(len/1048576)*1048576;
}
function storagePad(text){
  const len=new TextEncoder().encode(text).length;
  const target=storagePadTo(len+16);
  return text+"\n"+"#".repeat(Math.max(0,target-len-1));   // padding is outside the JSON, stripped on read
}
const storageUnpad=(text)=>String(text||"").replace(/\n#+$/,"");
const storageIsStateKey=(k)=>/^circle\/[^/]+\/[^/]+\/state\.enc$/.test(String(k||""));
const storageDeviceOfKey=(k)=>{ const m=/^circle\/[^/]+\/([^/]+)\/state\.enc$/.exec(String(k||"")); return m?m[1]:""; };
// In-memory provider. Used by tests, and it is also the honest shape of "device only" — writes succeed, nothing
// travels. Quota is modelled so quota-exhaustion handling can be tested without filling a real Drive.
function createMemoryStorage(opts){
  const o=opts||{}; const store=new Map(); let used=0;
  const quota=o.quotaBytes||5*1024*1024;
  const fail=()=>{ if(o.failWith) throw new Error(o.failWith); };
  return {
    kind:"memory", label:o.label||"This device",
    async put(key,text){ fail();
      const size=new TextEncoder().encode(String(text)).length;
      const prev=store.has(key)?new TextEncoder().encode(store.get(key)).length:0;
      if(used-prev+size>quota){ const e=new Error("STORAGE_QUOTA"); e.code="QUOTA"; throw e; }
      used=used-prev+size; store.set(key,String(text)); return {key,size}; },
    async get(key){ fail(); if(!store.has(key)){ const e=new Error("STORAGE_NOT_FOUND"); e.code="NOT_FOUND"; throw e; } return store.get(key); },
    async list(prefix){ fail(); return [...store.keys()].filter(k=>k.startsWith(prefix||"")).sort(); },
    async del(key){ fail(); if(store.has(key)){ used-=new TextEncoder().encode(store.get(key)).length; store.delete(key); } return true; },
    async quota(){ return {used,total:quota,free:Math.max(0,quota-used)}; },
  };
}
// Wrap a configured cloud provider (Dropbox / OneDrive) in the same interface.
function createCloudStorage(provider, getAccessToken){
  return { kind:"cloud", label:provider.label,
    async put(key,text){ const t=await getAccessToken(); return provider.upload(t,key,text); },
    async get(key){ const t=await getAccessToken(); return provider.download(t,key); },
    async list(prefix){ const t=await getAccessToken(); return provider.list(t,prefix); },
    async del(key){ const t=await getAccessToken(); return provider.del?provider.del(t,key):true; },
    async quota(){ return {used:0,total:0,free:0}; },   // providers differ; treated as unknown
  };
}
// ── Storage failure classification (Phase 4) ═══
// Every provider reports trouble differently and most of it arrives as an HTTP status inside an Error message.
// Without classification the app can only say "sync failed", which is the least useful thing it could say: the
// user cannot tell whether to reconnect, free up space, wait, or worry about their records. Each class below maps
// to ONE required behaviour, and the invariant across all of them is that recording never stops — a storage
// problem must never become a reason someone can't write down that a dose was given.
const STORAGE_FAIL = {
  AUTH:"auth",        // token expired or consent revoked → degrade to local, offer one-tap reconnect
  QUOTA:"quota",      // account full → stop uploading, keep recording, tell them early
  OFFLINE:"offline",  // no network → retry silently, this is normal on a phone
  OUTAGE:"outage",    // provider 5xx → retry with backoff, surface only if it persists
  RATE:"rate",        // throttled → back off, never hammer
  MISSING:"missing",  // folder or manifest deleted → offer to re-upload from the local vault
  UNKNOWN:"unknown",
};
function classifyStorageError(err, opts){
  const o=opts||{};
  if(o.offline===true) return STORAGE_FAIL.OFFLINE;
  const msg=String((err&&err.message)||err||"");
  const status=(err&&err.status)||Number((msg.match(/\b(4\d\d|5\d\d)\b/)||[])[1])||0;
  if(err&&err.code==="QUOTA") return STORAGE_FAIL.QUOTA;
  if(/insufficient[_ ]?(storage|space)|quota|storage.?full|507/i.test(msg)) return STORAGE_FAIL.QUOTA;
  if(status===401||status===403||/expired|revoked|reconnect|invalid[_ ]grant|unauthor/i.test(msg)) return STORAGE_FAIL.AUTH;
  if(status===429||/rate.?limit|too many requests|throttl/i.test(msg)) return STORAGE_FAIL.RATE;
  if(status===404||/not[_ ]?found|LOCAL_MISSING/i.test(msg)) return STORAGE_FAIL.MISSING;
  if(status>=500||/服务|unavailable|bad gateway|timeout|network|failed to fetch/i.test(msg)) return STORAGE_FAIL.OUTAGE;
  return STORAGE_FAIL.UNKNOWN;
}
// What the user is told, and what the app does. Every message says where the records actually are, because that
// is the only question a caregiver seeing an error actually cares about.
const STORAGE_FAIL_UI = {
  auth:   {title:"Reconnect your storage", body:"Your storage sign-in has expired. Your records are safe on this device and will upload as soon as you reconnect.", action:"reconnect", retry:false, alarm:true},
  quota:  {title:"Your cloud storage is full", body:"Care Guardian has stopped uploading, but it is still recording everything on this device. Free up space and it will catch up on its own.", action:"none", retry:false, alarm:true},
  offline:{title:"No connection", body:"Your records are being saved on this device and will upload when you're back online.", action:"none", retry:true, alarm:false},
  outage: {title:"Storage is not responding", body:"Your provider isn't answering right now. Your records are safe on this device and Care Guardian will keep trying.", action:"none", retry:true, alarm:false},
  rate:   {title:"Slowing down", body:"Your provider asked us to slow down. Care Guardian will finish uploading shortly.", action:"none", retry:true, alarm:false},
  missing:{title:"Storage folder is missing", body:"The folder Care Guardian was using can't be found — it may have been moved or deleted. Everything is still on this device and can be uploaded again.", action:"reupload", retry:false, alarm:true},
  unknown:{title:"Couldn't reach your storage", body:"Your records are safe on this device. Care Guardian will try again on the next sync.", action:"none", retry:true, alarm:false},
};
const storageFailUI=(cls)=>STORAGE_FAIL_UI[cls]||STORAGE_FAIL_UI.unknown;
// Exponential backoff with a ceiling, so a provider outage is retried politely rather than hammered.
function storageBackoffMs(attempt, baseMs, capMs){
  const base=baseMs||30000, cap=capMs||3600000;
  const raw=base*Math.pow(2,Math.max(0,(attempt||1)-1));
  return Math.min(raw,cap);
}
const storageShouldRetryNow=(state,now)=>{
  if(!state||!state.nextAttemptAt) return true;
  return (now?new Date(now).getTime():Date.now())>=new Date(state.nextAttemptAt).getTime();
};
// Quota warning at 80%, so someone learns their Drive is filling up BEFORE uploads stop.
const STORAGE_QUOTA_WARN = 0.8;
function storageQuotaState(used,total){
  if(!total||!isFinite(total)||total<=0) return {level:"unknown",pct:null};
  const pct=used/total;
  return {pct:Math.round(pct*100), level: pct>=1?"full" : pct>=STORAGE_QUOTA_WARN?"warn" : "ok"};
}
// ── Manifest: the index that makes per-device objects discoverable ──
// The cloud providers here implement upload and download but NOT list — Dropbox, Drive and OneDrive each expose
// listing differently and none is wired. So discovery cannot rely on enumerating a folder: the manifest IS the
// index. Each device publishes its own state object and records itself in the manifest; every other device reads
// the manifest to learn which objects to fetch.
// Why per-device objects at all: with one shared file, two devices syncing the same day overwrite each other and
// the loser's work is gone with no trace. Per-device objects mean writes never collide, and merging happens in
// the app where the HLC clock can resolve it.
const MANIFEST_VERSION = 1;
function manifestEmpty(circleId){ return {v:MANIFEST_VERSION, circleId:circleId||"", epoch:0, devices:{}, updatedAt:""}; }
// Record this device's contribution. Never removes another device's entry — a device that hasn't synced lately is
// not a device that has left.
function manifestPut(manifest, deviceId, entry, now){
  const m=manifest&&manifest.v===MANIFEST_VERSION?{...manifest,devices:{...manifest.devices}}:manifestEmpty(manifest&&manifest.circleId);
  // NOTE: the true byte size is deliberately NOT recorded. Nothing reads it, and publishing it would defeat the
  // size padding applied to the objects themselves — the manifest would hand back exactly what padding hides.
  m.devices[deviceId]={key:entry.key, updatedAt:now||new Date().toISOString(),
    label:entry.label||"", epoch:entry.epoch||0};
  m.epoch=Math.max(m.epoch||0, entry.epoch||0);
  m.updatedAt=now||new Date().toISOString();
  return m;
}
// Which objects should this device pull? Everyone else's, newest first, skipping ones we've already seen.
function manifestPullList(manifest, selfDeviceId, seen){
  const devices=(manifest&&manifest.devices)||{};
  return Object.keys(devices)
    .filter(id=>id!==selfDeviceId)
    .map(id=>({deviceId:id,...devices[id]}))
    .filter(d=>d.key && !(seen&&seen[d.deviceId]===d.updatedAt))
    .sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
// Two devices can write the manifest at nearly the same moment and the later write wins at file level, dropping
// the other's entry. Merging on read repairs that: take the newest entry per device from both copies.
function manifestMerge(a, b){
  const out=manifestEmpty((a&&a.circleId)||(b&&b.circleId));
  for(const src of [a,b]){
    if(!src||!src.devices) continue;
    for(const id of Object.keys(src.devices)){
      const cand=src.devices[id], cur=out.devices[id];
      if(!cur || String(cand.updatedAt||"")>String(cur.updatedAt||"")) out.devices[id]=cand;
    }
    out.epoch=Math.max(out.epoch||0, src.epoch||0);
    if(String(src.updatedAt||"")>String(out.updatedAt||"")) out.updatedAt=src.updatedAt;
  }
  return out;
}
// A device whose objects belong to a superseded key epoch can't be read after rotation; report rather than fail.
function manifestStaleDevices(manifest, currentEpoch){
  const devices=(manifest&&manifest.devices)||{};
  return Object.keys(devices).filter(id=>(devices[id].epoch||0)<(currentEpoch||0)).map(id=>({deviceId:id,...devices[id]}));
}
// ── Provider capability: the architectural consequence of supporting Google Drive ──
// Dropbox and OneDrive are PKCE public clients that issue a REFRESH token, so authorisation survives the app
// being closed. Google Drive in a browser cannot: its Web-application client type requires a client_secret at the
// token endpoint (which a browser cannot keep), and the Google Identity Services token model — the flow Google
// actually recommends for SPAs — issues a short-lived access token and NO refresh token. Google access is
// therefore SESSION-SCOPED: real while the app is open, gone when it closes.
// Rather than treat that as a defect, the sync engine now treats provider availability as intermittent by
// default. That is honest for every provider — offline, expired token, revoked consent, exhausted quota all look
// the same — so the design that makes Google first-class also makes Dropbox and OneDrive more robust.
const STORAGE_CAPS = {
  dropbox:  {auth:"persistent", background:true,  label:"Dropbox"},
  onedrive: {auth:"persistent", background:true,  label:"OneDrive"},
  googledrive:{auth:"session",  background:false, label:"Google Drive",
    note:"Google doesn't allow a browser app to stay signed in between visits, so Care Guardian saves to Drive while you're using it and reconnects with one tap when you come back."},
  memory:   {auth:"persistent", background:true,  label:"This device"},
};
const storageCaps=(id)=>STORAGE_CAPS[id]||{auth:"session",background:false,label:String(id||"")};
// ── Outbox: what makes intermittent providers safe ──
// Every change that needs uploading is queued locally and drained whenever storage happens to be available.
// Entries are deduplicated BY KEY, because each object is a complete snapshot: queueing state.enc five times
// means the fifth supersedes the rest. Without that the queue would grow without bound on a busy day.
const STORAGE_OUTBOX_MAX = 500;
function outboxEnqueue(outbox, entry, now){
  const q=(outbox||[]).filter(e=>e && e.key!==entry.key);
  q.push({key:entry.key, kind:entry.kind||"state", queuedAt:now||new Date().toISOString(), tries:0});
  return q.length>STORAGE_OUTBOX_MAX ? q.slice(q.length-STORAGE_OUTBOX_MAX) : q;
}
// The manifest must be written last, so it is always drained after everything else it points at.
function outboxOrder(outbox){
  const q=[...(outbox||[])];
  return q.sort((a,b)=>(a.kind==="manifest"?1:0)-(b.kind==="manifest"?1:0)||String(a.queuedAt).localeCompare(String(b.queuedAt)));
}
// Drain against any provider. A failure is retried, not dropped: a queue that discards on error is not a queue.
// A quota failure stops the run — retrying the rest would just fail too, and hammering the provider is rude.
async function outboxDrain(provider, outbox, readObject, opts){
  const o=opts||{}; const maxTries=o.maxTries||5;
  let remaining=[...outboxOrder(outbox)]; const done=[]; let stopped=null;
  for(const entry of outboxOrder(outbox)){
    let body;
    try{ body=await readObject(entry); }catch(e){ remaining=remaining.filter(x=>x.key!==entry.key); continue; } // object gone: drop it
    try{
      await provider.put(entry.key, body);
      remaining=remaining.filter(x=>x.key!==entry.key); done.push(entry.key);
    }catch(e){
      const code=e&&e.code;
      if(code==="QUOTA"){ stopped="QUOTA"; break; }
      remaining=remaining.map(x=>x.key===entry.key?{...x,tries:(x.tries||0)+1,lastError:String(e&&e.message||e)}:x)
                         .filter(x=>x.key!==entry.key||(x.tries||0)<maxTries);
      if(o.stopOnError){ stopped=code||"ERROR"; break; }
    }
  }
  return {outbox:remaining, uploaded:done, stopped, complete:remaining.length===0};
}
// ── Staleness (locked: 7 days) ──
function storageStaleness(lastOkAt, now){
  if(!lastOkAt) return {days:null,level:"never",stale:true};
  const t=new Date(lastOkAt).getTime(), n=(now?new Date(now):new Date()).getTime();
  if(!isFinite(t)) return {days:null,level:"never",stale:true};
  const days=Math.floor((n-t)/86400000);
  return {days, stale:days>=STORAGE_STALE_DAYS, level:days>=STORAGE_STALE_DAYS?"stale":(days>=Math.floor(STORAGE_STALE_DAYS/2)?"ageing":"fresh")};
}
// ── One provider per circle ──
// A second admin connecting different storage must be surfaced, never silently merged: two clouds means two
// divergent copies of the record and no way to say which is authoritative.
function storageProviderConflict(local, remote){
  const a=local&&local.provider, b=remote&&remote.provider;
  if(!a||!b||a===b) return null;
  return {conflict:true, local:a, remote:b,
    localAccount:(local&&local.account)||"", remoteAccount:(remote&&remote.account)||""};
}
// ── What a sync writes ──
function storagePlanUploads(circleId, deviceId, opts){
  const o=opts||{}; const out=[{key:storageKeys.state(circleId,deviceId),kind:"state"}];
  if(o.rotation) out.push({key:storageKeys.rotation(circleId),kind:"rotation"});
  if(o.auditMonth) out.push({key:storageKeys.audit(circleId,deviceId,o.auditMonth),kind:"audit"});
  for(const b of (o.blobIds||[])) out.push({key:storageKeys.blob(b),kind:"blob"});
  out.push({key:storageKeys.manifest(circleId),kind:"manifest",last:true}); // manifest written LAST
  return out;
}

/* ═══ Drug reference — name autocomplete and STRENGTH VALIDATION ═══
   Scope is deliberate and narrow: this confirms that what you typed is a real strength of a real drug. It does
   NOT suggest doses. Prefilling a "usual dose" next to a prescribed one invites a caregiver to "correct" the
   prescription, and software that hands a specific treatment directive to a layperson starts to look like
   regulated clinical decision support. So: catalogue lookup, yes; clinical advice, no.
   Validation is ALWAYS advisory and never blocks saving. A real prescription can be a split tablet, a compounded
   preparation, or a drug newer than this table — an app that refuses to record what a doctor actually prescribed
   would be worse than one that stays quiet. Unknown drug ⇒ say nothing at all rather than cast doubt. */
const DRUG_DATA_SOURCE="curated seed list (dementia/older-adult care)";
const DRUG_DATA_VERSION="2026-07";
const DRUG_TABLE=[
{n:"Donepezil",b:["Aricept"],s:["5 mg","10 mg","23 mg"]},
{n:"Memantine",b:["Namenda"],s:["5 mg","10 mg"]},
{n:"Memantine ER",b:["Namenda XR"],s:["7 mg","14 mg","21 mg","28 mg"]},
{n:"Rivastigmine",b:["Exelon"],s:["1.5 mg","3 mg","4.5 mg","6 mg"]},
{n:"Rivastigmine patch",b:["Exelon Patch"],s:["4.6 mg/24 hr","9.5 mg/24 hr","13.3 mg/24 hr"]},
{n:"Galantamine",b:["Razadyne"],s:["4 mg","8 mg","12 mg"]},
{n:"Galantamine ER",b:["Razadyne ER"],s:["8 mg","16 mg","24 mg"]},
{n:"Sertraline",b:["Zoloft"],s:["25 mg","50 mg","100 mg"]},
{n:"Escitalopram",b:["Lexapro"],s:["5 mg","10 mg","20 mg"]},
{n:"Citalopram",b:["Celexa"],s:["10 mg","20 mg","40 mg"]},
{n:"Fluoxetine",b:["Prozac"],s:["10 mg","20 mg","40 mg"]},
{n:"Paroxetine",b:["Paxil"],s:["10 mg","20 mg","30 mg","40 mg"]},
{n:"Venlafaxine ER",b:["Effexor XR"],s:["37.5 mg","75 mg","150 mg"]},
{n:"Duloxetine",b:["Cymbalta"],s:["20 mg","30 mg","60 mg"]},
{n:"Mirtazapine",b:["Remeron"],s:["7.5 mg","15 mg","30 mg","45 mg"]},
{n:"Trazodone",b:["Desyrel"],s:["50 mg","100 mg","150 mg","300 mg"]},
{n:"Bupropion XL",b:["Wellbutrin XL"],s:["150 mg","300 mg"]},
{n:"Quetiapine",b:["Seroquel"],s:["25 mg","50 mg","100 mg","200 mg","300 mg","400 mg"]},
{n:"Risperidone",b:["Risperdal"],s:["0.25 mg","0.5 mg","1 mg","2 mg","3 mg","4 mg"]},
{n:"Olanzapine",b:["Zyprexa"],s:["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"]},
{n:"Aripiprazole",b:["Abilify"],s:["2 mg","5 mg","10 mg","15 mg","20 mg","30 mg"]},
{n:"Haloperidol",b:["Haldol"],s:["0.5 mg","1 mg","2 mg","5 mg","10 mg","20 mg"]},
{n:"Lorazepam",b:["Ativan"],s:["0.5 mg","1 mg","2 mg"]},
{n:"Alprazolam",b:["Xanax"],s:["0.25 mg","0.5 mg","1 mg","2 mg"]},
{n:"Clonazepam",b:["Klonopin"],s:["0.5 mg","1 mg","2 mg"]},
{n:"Zolpidem",b:["Ambien"],s:["5 mg","10 mg"]},
{n:"Melatonin",b:[],s:["1 mg","3 mg","5 mg","10 mg"]},
{n:"Lisinopril",b:["Zestril","Prinivil"],s:["2.5 mg","5 mg","10 mg","20 mg","30 mg","40 mg"]},
{n:"Amlodipine",b:["Norvasc"],s:["2.5 mg","5 mg","10 mg"]},
{n:"Losartan",b:["Cozaar"],s:["25 mg","50 mg","100 mg"]},
{n:"Metoprolol tartrate",b:["Lopressor"],s:["25 mg","50 mg","100 mg"]},
{n:"Metoprolol succinate ER",b:["Toprol XL"],s:["25 mg","50 mg","100 mg","200 mg"]},
{n:"Atenolol",b:["Tenormin"],s:["25 mg","50 mg","100 mg"]},
{n:"Carvedilol",b:["Coreg"],s:["3.125 mg","6.25 mg","12.5 mg","25 mg"]},
{n:"Hydrochlorothiazide",b:["Microzide"],s:["12.5 mg","25 mg","50 mg"]},
{n:"Furosemide",b:["Lasix"],s:["20 mg","40 mg","80 mg"]},
{n:"Spironolactone",b:["Aldactone"],s:["25 mg","50 mg","100 mg"]},
{n:"Digoxin",b:["Lanoxin"],s:["0.125 mg","0.25 mg"]},
{n:"Diltiazem ER",b:["Cardizem CD"],s:["120 mg","180 mg","240 mg","300 mg"]},
{n:"Warfarin",b:["Coumadin"],s:["1 mg","2 mg","2.5 mg","3 mg","4 mg","5 mg","6 mg","7.5 mg","10 mg"]},
{n:"Apixaban",b:["Eliquis"],s:["2.5 mg","5 mg"]},
{n:"Rivaroxaban",b:["Xarelto"],s:["10 mg","15 mg","20 mg"]},
{n:"Clopidogrel",b:["Plavix"],s:["75 mg"]},
{n:"Aspirin",b:[],s:["81 mg","325 mg"]},
{n:"Atorvastatin",b:["Lipitor"],s:["10 mg","20 mg","40 mg","80 mg"]},
{n:"Simvastatin",b:["Zocor"],s:["5 mg","10 mg","20 mg","40 mg","80 mg"]},
{n:"Rosuvastatin",b:["Crestor"],s:["5 mg","10 mg","20 mg","40 mg"]},
{n:"Pravastatin",b:["Pravachol"],s:["10 mg","20 mg","40 mg","80 mg"]},
{n:"Metformin",b:["Glucophage"],s:["500 mg","850 mg","1000 mg"]},
{n:"Metformin ER",b:["Glucophage XR"],s:["500 mg","750 mg","1000 mg"]},
{n:"Glipizide",b:["Glucotrol"],s:["5 mg","10 mg"]},
{n:"Sitagliptin",b:["Januvia"],s:["25 mg","50 mg","100 mg"]},
{n:"Empagliflozin",b:["Jardiance"],s:["10 mg","25 mg"]},
{n:"Levothyroxine",b:["Synthroid"],s:["25 mcg","50 mcg","75 mcg","88 mcg","100 mcg","112 mcg","125 mcg","137 mcg","150 mcg","175 mcg","200 mcg"]},
{n:"Omeprazole",b:["Prilosec"],s:["10 mg","20 mg","40 mg"]},
{n:"Pantoprazole",b:["Protonix"],s:["20 mg","40 mg"]},
{n:"Famotidine",b:["Pepcid"],s:["10 mg","20 mg","40 mg"]},
{n:"Docusate sodium",b:["Colace"],s:["100 mg"]},
{n:"Senna",b:["Senokot"],s:["8.6 mg"]},
{n:"Polyethylene glycol 3350",b:["Miralax"],s:["17 g"]},
{n:"Acetaminophen",b:["Tylenol"],s:["325 mg","500 mg","650 mg"]},
{n:"Ibuprofen",b:["Advil","Motrin"],s:["200 mg","400 mg","600 mg","800 mg"]},
{n:"Tramadol",b:["Ultram"],s:["50 mg"]},
{n:"Oxycodone",b:["Roxicodone"],s:["5 mg","10 mg","15 mg","20 mg","30 mg"]},
{n:"Gabapentin",b:["Neurontin"],s:["100 mg","300 mg","400 mg","600 mg","800 mg"]},
{n:"Pregabalin",b:["Lyrica"],s:["25 mg","50 mg","75 mg","100 mg","150 mg","200 mg","225 mg","300 mg"]},
{n:"Carbidopa-Levodopa",b:["Sinemet"],s:["10-100 mg","25-100 mg","25-250 mg"]},
{n:"Ropinirole",b:["Requip"],s:["0.25 mg","0.5 mg","1 mg","2 mg","3 mg","4 mg","5 mg"]},
{n:"Tamsulosin",b:["Flomax"],s:["0.4 mg"]},
{n:"Oxybutynin",b:["Ditropan"],s:["5 mg"]},
{n:"Finasteride",b:["Proscar"],s:["5 mg"]},
{n:"Alendronate",b:["Fosamax"],s:["35 mg","70 mg"]},
{n:"Vitamin D3 (cholecalciferol)",b:[],s:["1000 unit","2000 unit","5000 unit"]},
{n:"Calcium carbonate",b:["Tums"],s:["500 mg","600 mg"]},
{n:"Ferrous sulfate",b:[],s:["325 mg"]},
{n:"Potassium chloride ER",b:["Klor-Con"],s:["8 mEq","10 mEq","20 mEq"]},
{n:"Prednisone",b:[],s:["1 mg","2.5 mg","5 mg","10 mg","20 mg","50 mg"]},
{n:"Allopurinol",b:["Zyloprim"],s:["100 mg","300 mg"]},
{n:"Levetiracetam",b:["Keppra"],s:["250 mg","500 mg","750 mg","1000 mg"]},
{n:"Amoxicillin",b:[],s:["250 mg","500 mg","875 mg"]},
{n:"Cephalexin",b:["Keflex"],s:["250 mg","500 mg"]},
{n:"Nitrofurantoin",b:["Macrobid"],s:["100 mg"]},
{n:"Ciprofloxacin",b:["Cipro"],s:["250 mg","500 mg"]},
{n:"Azithromycin",b:["Zithromax"],s:["250 mg","500 mg"]},
{n:"Ondansetron",b:["Zofran"],s:["4 mg","8 mg"]},
{n:"Cyanocobalamin (B12)",b:[],s:["500 mcg","1000 mcg"]},
{n:"Tiotropium",b:["Spiriva"],s:["18 mcg"]},
{n:"Albuterol",b:["ProAir","Ventolin"],s:["90 mcg/actuation"]},
{n:"Montelukast",b:["Singulair"],s:["10 mg"]},
{n:"Latanoprost",b:["Xalatan"],s:["0.005 %"]},
{n:"Hydralazine",b:[],s:["10 mg","25 mg","50 mg","100 mg"]},
{n:"Isosorbide mononitrate ER",b:["Imdur"],s:["30 mg","60 mg","120 mg"]}];

const drugNorm=(t)=>String(t||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
// Rank: exact generic > generic prefix > brand prefix > word-start anywhere > substring.
function drugSearch(query, limit){
  const q=drugNorm(query); if(q.length<2) return [];
  const out=[];
  for(const d of DRUG_TABLE){
    const gn=drugNorm(d.n); let score=-1, via="";
    if(gn===q) score=0;
    else if(gn.startsWith(q)) score=1;
    else { for(const b of (d.b||[])){ const bn=drugNorm(b);
        if(bn===q){score=Math.min(score<0?2:score,2);via=b;break}
        if(bn.startsWith(q)){score=score<0?3:Math.min(score,3);via=b} } }
    if(score<0 && new RegExp("\\b"+q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(gn)) score=4;
    if(score<0 && gn.indexOf(q)>=0) score=5;
    if(score>=0) out.push({drug:d,score,via});
  }
  out.sort((a,b)=>a.score-b.score||a.drug.n.length-b.drug.n.length||a.drug.n.localeCompare(b.drug.n));
  return out.slice(0,limit||8);
}
const drugFind=(name)=>{ const q=drugNorm(name); if(!q) return null;
  return DRUG_TABLE.find(d=>drugNorm(d.n)===q) || DRUG_TABLE.find(d=>(d.b||[]).some(b=>drugNorm(b)===q)) || null; };
// Normalise a strength for comparison: "500MG" / "500 mg" / "0.5 g" all become "500 mg"; mcg and units are kept
// distinct because 100 mcg and 100 mg are different medicines' worth of drug.
function drugNormStrength(text){
  let t=String(text||"").toLowerCase().replace(/\u00b5/g,"u").trim();
  t=t.replace(/micrograms?|µg/g,"mcg").replace(/milligrams?/g,"mg").replace(/grams?\b/g,"g")
     .replace(/\bunits?\b|\biu\b/g,"unit").replace(/\bmeq\b/g,"meq").replace(/\s+/g," ");
  const combo=t.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(mg|mcg|g|unit|meq|%)?$/);
  if(combo) return combo[1]+"-"+combo[2]+" "+(combo[3]||"mg");
  const m=t.match(/^(\d+(?:\.\d+)?)\s*(mg|mcg|g|unit|meq|%|mg\/24 ?hr|mcg\/actuation)?\b/);
  if(!m) return "";
  let val=parseFloat(m[1]), unit=m[2]||"mg";
  if(unit==="g"){ val=val*1000; unit="mg"; }
  const rest=t.slice(m[0].length).trim();
  const suffix=/24 ?hr/.test(t)?"/24 hr":(/actuation/.test(t)?"/actuation":"");
  return (Math.round(val*1e6)/1e6)+" "+unit.replace(/\/.*$/,"")+suffix+(rest&&/patch|cream|ml/.test(rest)?"":"");
}
// Returns one of: "no-drug" (nothing typed we recognise — stay silent), "no-dose", "match", "unknown-strength".
function drugValidateDose(name, dose){
  const d=drugFind(name);
  if(!d) return {status:"no-drug"};
  const want=drugNormStrength(dose);
  if(!want) return {status:"no-dose",drug:d};
  const known=(d.s||[]).map(drugNormStrength);
  if(known.indexOf(want)>=0) return {status:"match",drug:d};
  // A half tablet is ordinary practice in this population; call it out as plausible rather than wrong.
  const num=parseFloat(want);
  const half=(d.s||[]).some(x=>{const v=parseFloat(drugNormStrength(x)); return isFinite(v)&&isFinite(num)&&Math.abs(v/2-num)<1e-6;});
  return {status:"unknown-strength",drug:d,half,known:d.s||[]};
}

/* ═══ Medication adherence — pure, testable. Powers the calendar, the filters and the per-medication trend. ═══
   Two deliberate distinctions:
     • "As Needed" (PRN) doses are NOT scheduled, so they never count against adherence — a PRN dose that wasn't
       needed is not a missed dose. PRN doses that WERE given still show as activity.
     • A dose nobody recorded is "unrecorded", not "missed". Both reduce adherence, but calling an unrecorded dose
       a missed dose would put a clinical claim in the record that no one actually made. They are coloured and
       counted separately so a gap in the paperwork can't be mistaken for a gap in care. */
const MED_PRN_SLOT = "As Needed";
const MED_ADH = { FULL:"full", PARTIAL:"partial", MISSED:"missed", UNRECORDED:"unrecorded", NONE:"none", FUTURE:"future" };
const medDayKey = (d) => { const dt=(d instanceof Date)?d:new Date(d+"T12:00:00");
  return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"); };
const medScheduledSlots = (m) => (m&&m.timeSlots||[]).filter(s=>s!==MED_PRN_SLOT);
// A medication only counts on days it actually existed: from its start date until the day it was discontinued.
function medActiveOn(m, date){
  if(!m) return false;
  const start=m.startDate||"", stop=m.discontinued?(m.discontinuedDate||""):"";
  if(start && date<start) return false;
  if(stop && date>stop) return false;
  return true;
}
// One day's picture for one medication or for all of them.
function medDayAdherence(meds, log, date, medId){
  const byKey={}; for(const l of (log||[])) if(l&&l.date===date) byKey[l.medId+"|"+l.slot]=l.status;
  let scheduled=0,given=0,missed=0,refused=0,skipped=0,prnGiven=0;
  for(const m of (meds||[])){
    if(medId&&medId!=="all"&&m.id!==medId) continue;
    if(!medActiveOn(m,date)) continue;
    for(const slot of (m.timeSlots||[])){
      const st=byKey[m.id+"|"+slot];
      if(slot===MED_PRN_SLOT){ if(st==="given")prnGiven++; continue; }
      scheduled++;
      if(st==="given")given++; else if(st==="missed")missed++; else if(st==="refused")refused++; else if(st==="skipped")skipped++;
    }
  }
  // A dose deliberately withheld on clinical grounds is NOT non-adherence — it is a decision someone made and
  // recorded. It is counted separately and excluded from the scheduled denominator, so following medical advice
  // never looks like failing to give medication.
  return {scheduled:Math.max(0,scheduled-skipped),given,missed,refused,skipped,prnGiven,
    unrecorded:Math.max(0,scheduled-skipped-given-missed-refused)};
}
// Classify a day for colouring. `today` lets the caller keep future days neutral.
function medDayState(day, date, today){
  if(date>today) return MED_ADH.FUTURE;
  if(!day.scheduled) return day.prnGiven?MED_ADH.FULL:MED_ADH.NONE;
  if(day.given===day.scheduled) return MED_ADH.FULL;
  if(day.given===0 && day.unrecorded===day.scheduled) return MED_ADH.UNRECORDED;
  if(day.given===0) return MED_ADH.MISSED;
  return MED_ADH.PARTIAL;
}
// Roll a date range up into per-day states plus totals. Adherence % = given ÷ scheduled over days that counted.
function medAdherenceRange(meds, log, from, to, medId, today){
  const days=[]; let scheduled=0,given=0,missed=0,refused=0,skipped=0,unrecorded=0,prnGiven=0;
  const t=today||medDayKey(new Date());
  const start=new Date(from+"T12:00:00"), end=new Date(to+"T12:00:00");
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const date=medDayKey(d);
    const day=medDayAdherence(meds,log,date,medId);
    const state=medDayState(day,date,t);
    days.push({date,...day,state});
    if(date>t) continue;
    scheduled+=day.scheduled; given+=day.given; missed+=day.missed; refused+=day.refused; skipped+=day.skipped||0;
    unrecorded+=day.unrecorded; prnGiven+=day.prnGiven;
  }
  return {days,scheduled,given,missed,refused,skipped,unrecorded,prnGiven,
    pct: scheduled? Math.round((given/scheduled)*100) : null};
}
// Consecutive fully-given days ending today (days with nothing scheduled don't break it).
function medStreak(days, today){
  let streak=0;
  for(let i=days.length-1;i>=0;i--){ const d=days[i]; if(d.date>today) continue;
    if(d.state===MED_ADH.FULL){ streak++; continue; }
    if(d.state===MED_ADH.NONE) continue;
    break; }
  return streak;
}

/* ═══ Calendar export (RFC 5545 / .ics) — pure and testable ═══
   Care Guardian has no server, and the web platform has no API that writes to a device calendar, so the exchange
   format IS the integration: a file the calendar app opens. Two details make that feel automatic rather than
   clerical: a STABLE UID per appointment, so re-exporting UPDATES the existing event instead of creating a second
   copy, and SEQUENCE, which tells the calendar this version is newer. Deleted appointments are exported once as
   STATUS:CANCELLED so they disappear from the calendar too.
   Times are exported as FLOATING local time (no TZID, no Z): a 9:00 appointment stays 9:00 in whatever timezone
   the phone is in, which is what a caregiver means. The trade-off is that it does not shift for someone who
   travels across zones mid-treatment — the honest default for this use, but a choice, not an accident. */
const ICS_PRODID = "-//Care Guardian//Care Guardian PWA//EN";
const ICS_DEFAULT_MINUTES = 60;
// RFC 5545 §3.3.11: backslash, semicolon and comma are escaped; newlines become \n.
const icsEscape = (t) => String(t==null?"":t).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
// §3.1: lines are folded at 75 OCTETS (not characters) — folding mid-UTF-8-sequence corrupts accented names.
function icsFold(line){
  const bytes=new TextEncoder().encode(line);
  if(bytes.length<=75) return line;
  const out=[]; let start=0, limit=75;
  while(start<bytes.length){
    let end=Math.min(start+limit,bytes.length);
    while(end>start && end<bytes.length && (bytes[end]&0xC0)===0x80) end--;   // never split a UTF-8 sequence
    out.push(new TextDecoder().decode(bytes.slice(start,end)));
    start=end; limit=74;                                                      // continuation lines carry a leading space
  }
  return out.join("\r\n ");
}
const icsPad=(n)=>String(n).padStart(2,"0");
// "2026-07-14" + "09:30" → "20260714T093000" (floating local time)
function icsLocalStamp(date,time){
  const [y,m,d]=String(date||"").split("-").map(Number);
  const [hh,mm]=String(time||"00:00").split(":").map(Number);
  if(!y||!m||!d) return "";
  return ""+y+icsPad(m)+icsPad(d)+"T"+icsPad(hh||0)+icsPad(mm||0)+"00";
}
function icsAddMinutes(date,time,mins){
  const [y,m,d]=String(date||"").split("-").map(Number);
  const [hh,mm]=String(time||"00:00").split(":").map(Number);
  const dt=new Date(y,(m||1)-1,d||1,hh||0,mm||0,0);
  dt.setMinutes(dt.getMinutes()+(mins||ICS_DEFAULT_MINUTES));
  return ""+dt.getFullYear()+icsPad(dt.getMonth()+1)+icsPad(dt.getDate())+"T"+icsPad(dt.getHours())+icsPad(dt.getMinutes())+"00";
}
const icsUtcStamp = (d) => { const t=d||new Date();
  return ""+t.getUTCFullYear()+icsPad(t.getUTCMonth()+1)+icsPad(t.getUTCDate())+"T"+icsPad(t.getUTCHours())+icsPad(t.getUTCMinutes())+icsPad(t.getUTCSeconds())+"Z"; };
// A UID must be globally unique and never change. Local ids alone are not safe: two devices in a circle can mint
// the same local id, which would make one appointment silently overwrite another in the user's calendar.
function icsMakeUid(localId, scope){
  const rand=(typeof crypto!=="undefined"&&crypto.getRandomValues)
    ? Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b=>b.toString(16).padStart(2,"0")).join("")
    : Math.random().toString(16).slice(2,14);
  return "cg-"+String(localId||"x").replace(/[^A-Za-z0-9_-]/g,"")+"-"+String(scope||"local").replace(/[^A-Za-z0-9_-]/g,"").slice(0,12)+"-"+rand+"@careguardian";
}
// What the calendar shows. The clinical title stays in the vault; the calendar gets the safe one when set.
const icsCalendarTitle = (appt) => { const safe=(appt&&appt.calTitle||"").trim(); return safe || (appt&&appt.title||"Appointment"); };
function icsVEvent(appt, opts){
  const o=opts||{};
  const start=icsLocalStamp(appt.date,appt.time||"09:00");
  if(!start) return "";
  const end=icsAddMinutes(appt.date,appt.time||"09:00",appt.durationMin||ICS_DEFAULT_MINUTES);
  const lines=["BEGIN:VEVENT",
    "UID:"+(appt.uid||icsMakeUid(appt.id,o.scope)),
    "DTSTAMP:"+icsUtcStamp(o.now),
    "SEQUENCE:"+(appt.seq||0),
    "DTSTART:"+start,
    "DTEND:"+end,
    "SUMMARY:"+icsEscape(icsCalendarTitle(appt))];
  // Notes may hold clinical detail, so they only travel when the caller explicitly asks.
  if(o.includeNotes && appt.notes) lines.push("DESCRIPTION:"+icsEscape(appt.notes));
  if(appt.location) lines.push("LOCATION:"+icsEscape(appt.location));
  lines.push("STATUS:"+(appt.cancelled?"CANCELLED":"CONFIRMED"));
  lines.push("END:VEVENT");
  return lines.map(icsFold).join("\r\n");
}
function icsCalendar(appts, opts){
  const o=opts||{};
  const head=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:"+ICS_PRODID,"CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  const body=(appts||[]).map(a=>icsVEvent(a,o)).filter(Boolean);
  return head.map(icsFold).join("\r\n")+"\r\n"+(body.length?body.join("\r\n")+"\r\n":"")+"END:VCALENDAR\r\n";
}

/* ═══ Calendar import (.ics) — the caregiver's OWN calendar, for conflict detection ═══
   Direction matters: this brings the CAREGIVER's commitments in (work shifts, their own appointments) so the app
   can warn that a clinic visit collides with something. Nothing leaves the device. Only what a conflict check
   needs is kept — title, start, end — and it is capped and time-bounded, because a work calendar is someone
   else's private data and this vault should not quietly become a copy of it. */
const ICSIMP_MAX_EVENTS = 400;
const ICSIMP_MAX_TITLE = 80;
// §3.1 unfolding: a CRLF followed by a space or tab continues the previous line. Do this before anything else.
const icsUnfold = (text) => String(text||"").replace(/\r\n/g,"\n").replace(/\n[ \t]/g,"");
const icsUnescape = (v) => String(v||"").replace(/\\n/gi,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\");
// "20260714T093000Z" | "20260714T093000" | "20260714" → {date:"YYYY-MM-DD", time:"HH:MM"|null, allDay:bool}
function icsParseWhen(raw, params){
  const v=String(raw||"").trim();
  const m=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if(!m) return null;
  const isDate=(params&&/VALUE=DATE(?!-TIME)/i.test(params))||!m[4];
  if(isDate) return {date:m[1]+"-"+m[2]+"-"+m[3],time:null,allDay:true};
  if(m[7]){ // UTC — convert to this device's local time so comparisons against local appointments are honest
    const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)));
    const pad=(n)=>String(n).padStart(2,"0");
    return {date:d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()),time:pad(d.getHours())+":"+pad(d.getMinutes()),allDay:false};
  }
  return {date:m[1]+"-"+m[2]+"-"+m[3],time:m[4]+":"+m[5],allDay:false};
}
const icsMinutes = (t) => { const [h,m]=String(t||"00:00").split(":").map(Number); return (h||0)*60+(m||0); };
// Parse VEVENTs. Recurrence is deliberately limited to simple DAILY/WEEKLY rules with COUNT/UNTIL: those cover a
// work rota, and pretending to support the whole RRULE grammar would produce confident, wrong conflict warnings.
function icsParseEvents(text, opts){
  const o=opts||{}, horizonDays=o.horizonDays||120, today=o.today||new Date().toISOString().slice(0,10);
  const lines=icsUnfold(text).split("\n");
  const out=[]; let cur=null, skipped=0;
  const endBound=(()=>{ const d=new Date(today+"T12:00:00"); d.setDate(d.getDate()+horizonDays);
    const pad=(n)=>String(n).padStart(2,"0"); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); })();
  const push=(ev)=>{ if(out.length>=ICSIMP_MAX_EVENTS) return; out.push(ev); };
  for(const raw of lines){
    const line=raw.trim(); if(!line) continue;
    if(/^BEGIN:VEVENT$/i.test(line)){ cur={}; continue; }
    if(/^END:VEVENT$/i.test(line)){
      if(cur&&cur.start&&cur.start.date){
        const title=(cur.summary||"Busy").slice(0,ICSIMP_MAX_TITLE);
        const base={title,date:cur.start.date,time:cur.start.time,allDay:!!cur.start.allDay,
          endTime:(cur.end&&cur.end.date===cur.start.date)?cur.end.time:null,uid:cur.uid||"",status:cur.status||""};
        if(base.status.toUpperCase()==="CANCELLED"){ cur=null; continue; }
        const occurrences=[base];
        if(cur.rrule){
          const R=cur.rrule.toUpperCase();
          const freq=(/FREQ=(DAILY|WEEKLY)/.exec(R)||[])[1];
          const interval=Number((/INTERVAL=(\d+)/.exec(R)||[])[1]||1)||1;
          const count=Number((/COUNT=(\d+)/.exec(R)||[])[1]||0);
          const untilM=/UNTIL=(\d{8})/.exec(R);
          if(freq){
            const step=(freq==="DAILY"?1:7)*interval;
            const until=untilM?untilM[1].slice(0,4)+"-"+untilM[1].slice(4,6)+"-"+untilM[1].slice(6,8):endBound;
            let d=new Date(base.date+"T12:00:00"), n=1;
            const pad=(x)=>String(x).padStart(2,"0");
            while(true){ d.setDate(d.getDate()+step); n++;
              const ds=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
              if(ds>until||ds>endBound) break;
              if(count&&n>count) break;
              occurrences.push({...base,date:ds});
              if(occurrences.length>60) break; }
          } else skipped++;
        }
        for(const ev of occurrences){ if(ev.date>=today&&ev.date<=endBound) push(ev); }
      }
      cur=null; continue;
    }
    if(!cur) continue;
    const c=line.indexOf(":"); if(c<0) continue;
    const lhs=line.slice(0,c), val=line.slice(c+1);
    const name=lhs.split(";")[0].toUpperCase(), params=lhs.slice(name.length);
    if(name==="SUMMARY") cur.summary=icsUnescape(val).replace(/\s+/g," ").trim();
    else if(name==="DTSTART") cur.start=icsParseWhen(val,params);
    else if(name==="DTEND") cur.end=icsParseWhen(val,params);
    else if(name==="UID") cur.uid=val.trim();
    else if(name==="STATUS") cur.status=val.trim();
    else if(name==="RRULE") cur.rrule=val.trim();
  }
  return {events:out,skippedComplexRecurrence:skipped};
}
// An appointment and an external event collide if they share a day and their times overlap.
function icsFindConflicts(appts, events){
  const byDate={}; for(const e of (events||[])){ (byDate[e.date]=byDate[e.date]||[]).push(e); }
  const hits=[];
  for(const a of (appts||[])){
    const list=byDate[a.date]; if(!list) continue;
    const aS=icsMinutes(a.time||"09:00"), aE=aS+(a.durationMin||60);
    for(const e of list){
      if(e.allDay||!e.time){ hits.push({appt:a,event:e,allDay:true}); continue; }
      const eS=icsMinutes(e.time), eE=e.endTime?icsMinutes(e.endTime):eS+60;
      if(aS<eE&&eS<aE) hits.push({appt:a,event:e,allDay:false});
    }
  }
  return hits;
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
  // Phase 2: after the vault exists, an admin chooses where records live. Local-only is a real choice — it is
  // never the consequence of skipping, and never presented as the lesser option.
  const [showStorageChoice,setShowStorageChoice]=useState(false);
  const [storageChoice,setStorageChoice]=useState(null);      // "local" | "cloud" | "server"
  const [storageVerify,setStorageVerify]=useState(null);
  const [onbBackupMsg,setOnbBackupMsg]=useState("");      // null | "running" | "ok" | {error}
  const [storageNudgeDismissed,setStorageNudgeDismissed]=useState(false);
  const [persistState,setPersistState]=useState(null);
  // Ask the browser what it has ALREADY granted, rather than assuming nothing. Without this the onboarding
  // can only ever show the "please install" version, even on a browser that protected the data long ago.
  useEffect(()=>{ let alive=true;
    (async()=>{ try{ if(navigator.storage&&navigator.storage.persisted){ const p=await navigator.storage.persisted(); if(alive&&p)setPersistState("granted"); } }catch(e){} })();
    return ()=>{alive=false}; },[]); // null | "granted" | "denied" — Firefox storage-permission result
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
  const [showFolderMethod,setShowFolderMethod]=useState(false); // reveal the desktop local-folder option
  const auditKeyRef=useRef(null);
  const [auditEntries,setAuditEntries]=useState([]);
  const [storageInfo,setStorageInfo]=useState(null);
  const [auditChainStatus,setAuditChainStatus]=useState(null); // {status, brokenAtSeq, chained, total}
  const [storageAtRisk,setStorageAtRisk]=useState(false);       // persistent storage not granted → eviction risk
  const [storageDurable,setStorageDurable]=useState(null);      // Settings display: null=checking · true · false · "unsupported"
  const [shareScope,setShareScope]=useState({meds:true,conditions:true,providers:true,appointments:true,incidents:true,carePlan:false}); // "Share records" export scope
  const [grantFlow,setGrantFlow]=useState(null);   // care-program consent flow: {step,enroll,scope,expiresAt,attested,fpOk}
  const [grantBusy,setGrantBusy]=useState(false);
  const [reviewerMode,setReviewerMode]=useState(()=>{try{return localStorage.getItem("cg-reviewer-mode")==="1"}catch{return false}});
  const [reviewerProgram,setReviewerProgram]=useState(null);   // {institution,fingerprint,pubB64,privJwk}
  const [reviewerOpened,setReviewerOpened]=useState(null);     // {projection,manifest,bundle}
  const [reviewerBusy,setReviewerBusy]=useState(false);
  const [reviewerIntake,setReviewerIntake]=useState(null);     // {backend,base,readCap,rootPrefix}
  const [reviewerRoster,setReviewerRoster]=useState(null);     // [{prefix,latest,updated,count}]
  const [reviewerRosterBusy,setReviewerRosterBusy]=useState(false);
  const [reviewerShared,setReviewerShared]=useState(null);     // {entries,status} verified shared-scope chain for the opened family
  const [reviewerLocked,setReviewerLocked]=useState(false);    // a vault exists on this device but isn't unlocked this session
  const [reviewerLegacy,setReviewerLegacy]=useState(null);     // {program,intake} found in pre-vault plaintext storage — offer to secure
  const [reviewerUnlockPw,setReviewerUnlockPw]=useState("");
  const [reviewerNewPw,setReviewerNewPw]=useState("");
  const [reviewerErr,setReviewerErr]=useState("");
  const reviewerVaultPassRef=useRef(null);                     // vault key (b64) held for THIS session only, to re-seal on change
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
  const [view,setView]=useState("caremgmt-hub");
  const [currentHub,setCurrentHub]=useState("caremgmt");
  const [helpTopic,setHelpTopic]=useState(null); // context-specific help anchor
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
  const [medView,setMedView]=useState("day");            // "day" | "calendar"
  const [medCalMonth,setMedCalMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [medCalFilter,setMedCalFilter]=useState("all");   // "all" | medication id
  const [medCalDay,setMedCalDay]=useState(null);          // selected day in the calendar
  const [docMedsApplied,setDocMedsApplied]=useState(false);
  const docCancelRef=useRef(null); // {cancelled,task} for the in-flight document read
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
  // We call preventDefault() to DEFER the browser's own install banner so we can offer it at a sensible moment.
  // That is a promise we then have to keep: if the captured prompt is never surfaced, we have actively REMOVED
  // the browser's offer and replaced it with nothing. That is what happened — the only place it was offered was
  // onboarding step 1, and that step is skipped once storage is already persistent. So the prompt is now exposed
  // through installApp(), which every entry point uses, and `canInstall` drives whether we say anything at all.
  useEffect(()=>{
    const onBIP=(e)=>{e.preventDefault();setDeferredInstall(e)};
    const onInstalled=()=>{setDeferredInstall(null);setInstalled(true)};
    window.addEventListener("beforeinstallprompt",onBIP);
    window.addEventListener("appinstalled",onInstalled);
    return()=>{window.removeEventListener("beforeinstallprompt",onBIP);window.removeEventListener("appinstalled",onInstalled)};
  },[]);
  const [installed,setInstalled]=useState(false);
  const canInstall=()=>!!deferredInstall&&!isIOS;
  const isStandaloneNow=()=>{ try{ return installed||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true; }catch(e){ return false; } };
  const installApp=async()=>{
    if(!deferredInstall)return false;
    try{ deferredInstall.prompt(); const r=await deferredInstall.userChoice;
      setDeferredInstall(null);
      if(r&&r.outcome==="accepted"){ setInstalled(true); return true; }
      return false;
    }catch(e){ setDeferredInstall(null); return false; }
  };
  // Apply the user's display preferences: the text-size knob scales the root font-size (everything is rem),
  // and Large-print mode adds a roomier-spacing class. Both persist in settings and sync across devices.
  useEffect(()=>{
    const scale=(data.settings&&data.settings.uiScale)||1;
    try{document.documentElement.style.setProperty('--ui-scale-pct',Math.round(scale*100)+'%');}catch{}
    try{document.body.classList.toggle('comfortable',!!(data.settings&&data.settings.largePrint));}catch{}
  },[data.settings&&data.settings.uiScale,data.settings&&data.settings.largePrint]);
  // Read-only durability status for the Settings panel (does NOT call persist() — no surprise prompt; the
  // Protect button requests it on a user gesture instead).
  useEffect(()=>{if(!authed)return;let cancelled=false;(async()=>{
    try{ if(!(navigator.storage&&navigator.storage.persisted)){if(!cancelled)setStorageDurable("unsupported");return} const ok=await navigator.storage.persisted(); if(!cancelled)setStorageDurable(ok); }catch{ if(!cancelled)setStorageDurable("unsupported"); }
  })();return()=>{cancelled=true}},[authed]);
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
  // Driven by CONTENT, not by the session. The old version listed `authed` as a dependency, so locking and
  // unlocking — which changes nothing about the data — re-ran the check and re-prompted. It also measured
  // "backed up" with a timestamp, so a backup taken before ten more incidents still read as done.
  const [backupFp,setBackupFp]=useState("");
  useEffect(()=>{ if(!authed) return; let alive=true;
    (async()=>{ try{ const fp=await backupFingerprint(data); if(!alive) return; setBackupFp(fp);
      if(backupStatus==="active"){ setShowBackupReminder(false); return; }
      if(backupStatus==="paused"){ setShowBackupReminder(true); return; }
      const st=backupState(data,fp);
      setShowBackupReminder(st.state!=="up-to-date" && can("export-data"));
    }catch(e){} })();
    return ()=>{alive=false}; },[authed,backupStatus,data]);
  // "Back up now" must actually back up. Previously its handler was {setShowBackupReminder(false);nav("settings")}
  // — it hid the banner and navigated, exporting nothing, so the prompt returned on the next unlock.
  // Returns true/false so callers on screens without a flash() surface can report the outcome themselves.
  const backupNow=async()=>{ if(!can("export-data")){flash("You don't have permission to export.");return false}
    try{
      if(backupHandle){ const pw=await getBackupPasscode();
        const perm=await checkHandlePermission(backupHandle,true);
        if(perm!=="granted"){ setBackupStatus("paused"); flash("Backup file needs permission again — open Settings to reconnect it."); return false; }
        await writeBackupToHandle(backupHandle,pw);
        setLastAutoBackupAt(new Date().toISOString());
        await markBackedUp();
        flash("Saved to "+(backupFileName||"your backup file")+".");
        return true;
      } else { return await handleEncryptedExport(); }
    }catch(e){ flash("Couldn't back up: "+((e&&e.message)||"unknown error")); return false; } };
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
    if(backupTimerRef.current)clearTimeout(backupTimerRef.current);
    backupTimerRef.current=setTimeout(async()=>{
      try{
        const pw=await getBackupPasscode(); if(!pw)return;   // derived inside the async callback
        const perm=await checkHandlePermission(backupHandle,false);
        if(perm!=="granted"){setBackupStatus("paused");return} // permission lapsed mid-session
        await writeBackupToHandle(backupHandle,pw);
        setLastAutoBackupAt(new Date().toISOString());
        await markBackedUp();   // the fingerprint moves with the file, so the app stops claiming it's behind
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
        const exportData={...stripPortableSecrets(data),_sync:{...(data._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||""}};
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
  // One backup passcode (locked decisions 1 + 3).
  // FIRST ATTEMPT WAS WRONG, IN TWO WAYS. It called crypto.subtle.exportKey("raw", dekRef.current) — but the DEK
  // is a Uint8Array from generateDEK(), not a CryptoKey, so it threw "parameter 2 is not of type 'CryptoKey'".
  // The crash was lucky: the deeper flaw was that a DEK-derived passcode is a random value the USER NEVER SEES,
  // and restore (handleEncryptedImport) decrypts with a passcode they TYPE. On a new device after losing the old
  // one there would be no DEK to derive from and nothing to type — the backups would have been unrestorable.
  // So it is derived from the PASSCODE, which the user knows and can type on any device. Held in a ref for the
  // session only, never persisted; the raw passcode itself is not kept.
  const backupPassRef=useRef("");
  // Restore accepts EITHER the passcode the user unlocks with (derived) or a custom backup passcode typed
  // verbatim. Trying both means a caregiver never has to know which kind of secret their file used.
  const decryptBackupFlexible=async(blob,typed)=>{
    const t=(typed||"").trim();
    const tries=[t, await deriveBackupPass(t)].filter(Boolean);
    let lastErr=null;
    for(const pw of tries){ try{ return await decryptData(blob,pw); }catch(e){ lastErr=e; } }
    throw lastErr||new Error("Wrong passcode.");
  };

  const deriveBackupPass=async(passcode)=>{
    if(!passcode) return "";
    const bits=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("cg-backup-v1|"+passcode));
    return b64enc(new Uint8Array(bits).slice(0,24));
  };
  const getBackupPasscode=async()=>{
    const explicit=(data.settings&&data.settings.backupPasscode)||"";
    if(explicit) return explicit;                       // an admin who deliberately set their own
    if(backupPassRef.current) return backupPassRef.current;
    throw new Error("Unlock Care Guardian again so it can prepare your backup key.");
  };
  // Encrypt the full vault with the backup passcode and write it to the handle. Self-contained .care file.
  const writeBackupToHandle=async(handle,passcode)=>{
    if(!handle||!passcode)return false;
    const exportMeta={exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId)||"",exportedByName:(data.settings&&data.settings.deviceName)||"",formatVersion:"2.0",source:"auto-backup"};
    const _auditB=await getAuditBackup(false);
    const _auditMap=buildAuditMap(_auditB);
    const _sharedB=await getSharedAuditBackup();
    const payload={...stripPortableSecrets(data),_sync:{...(data._sync||{}),...exportMeta},_exportMeta:exportMeta,...(Object.keys(_auditMap).length?{_audit:_auditMap}:{}),...(_sharedB?{_sharedAudit:_sharedB}:{})};
    const b64=await encryptData(await packageWithBlobs(payload,dekRef.current,rKeyRef.current),passcode);
    const writable=await handle.createWritable();
    await writable.write(JSON.stringify({encrypted:true,version:"2.0",data:b64}));
    await writable.close();
    return true;
  };
  // Configure continuous backup: choose a file, set a backup passcode, write the first copy. (User gesture.)
  const setupContinuousBackup=async()=>{
    if(!can("export-data")){flash("You don't have permission to configure backups.");return false}
    if(!hasFileSystemAccess){setOnbBackupMsg("");flash(isIOSDevice?"Automatic background backup isn't available on iOS (all iPhone browsers are WebKit). Use Share/Download below to save an encrypted copy whenever you like.":"Automatic background backup needs a desktop browser (Chrome, Edge, or Brave). Use manual backup below.");return}
    // The onboarding screen has no passcode field — it promises "your passcode opens it" — so requiring a typed
    // one here made the button silently do nothing: the guard returned, and its flash() isn't even rendered on
    // that screen. A typed passcode is now OPTIONAL; blank means use the passcode the user already unlocked with.
    const typed=backupPw.trim();
    if(typed && typed.length<6){flash("A backup passcode needs at least 6 characters, or leave it blank to use your normal passcode.");return false}
    try{
      const handle=await window.showSaveFilePicker({suggestedName:"care-guardian-backup.care",types:[{description:"Care Guardian Backup",accept:{"application/json":[".care"]}}]});
      const perm=await checkHandlePermission(handle,true);
      if(perm!=="granted"){flash("Backup needs write access to that file to continue.");return false}
      const pw=typed||await getBackupPasscode();
      setBackupBusy(true);
      await writeBackupToHandle(handle,pw);
      await saveBackupHandle(handle);
      setBackupHandle(handle);setBackupFileName(handle.name);setBackupStatus("active");
      const now=new Date().toISOString();setLastAutoBackupAt(now);
      // Only store an explicitly chosen passcode. Storing the derived one would freeze it, so changing the
      // vault passcode later would silently stop matching the backup.
      setData(p=>({...p,settings:{...p.settings,...(typed?{backupPasscode:typed}:{}),lastBackupAt:now,continuousBackup:true}}));
      setBackupPw("");setShowBackupReminder(false);
      hipaaAudit("export","Continuous backup configured","all");
      flash("Continuous backup active. Your data will be saved automatically.");
      return true;
    }catch(e){ if(e&&e.name==="AbortError"){ return null; }   // user closed the picker — not a failure
      flash("Couldn't set up backup: "+(e&&e.message||"unknown error")); return false; }
    finally{setBackupBusy(false)}
  };
  // Resume after a session permission lapse (user gesture — required by the FSA permission model).
  const resumeBackup=async()=>{
    if(!backupHandle){return}
    const perm=await checkHandlePermission(backupHandle,true);
    if(perm==="granted"){
      setBackupStatus("active");
      const pw=await getBackupPasscode();
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
      const exportData={...stripPortableSecrets(pushPayload),_sync:{...(pushPayload._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||""}};
      const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),pw);
      const putResp=await fetch(`${serverUrl}/api/sync/${roomId}`,{method:"PUT",headers,body:JSON.stringify({data:b64})});
      if(!putResp.ok){const err=await putResp.json().catch(()=>({}));throw new Error(err.error||"Server returned "+putResp.status)}

      const added=((pullReport&&pullReport.added&&pullReport.added.length)||0);const updated=((pullReport&&pullReport.updated&&pullReport.updated.length)||0);
      setSyncStatus({type:"success",msg:added+updated>0?`Synced: ${added} new, ${updated} updates from team.`:"Synced — your data is up to date."});
      setData(p=>({...p,_sync:{...p._sync,lastSync:new Date().toISOString()}}));
    }catch(e){setSyncStatus({type:"error",msg:"Server sync failed: "+e.message})}
    setCloudSyncing(false);
  };

  /* ── Cloud-storage (Dropbox) sync: same encrypted PULL→merge→PUSH as the server method, but the transport
        is the user's own cloud account over its REST API — which works identically on iOS, Android, Windows,
        and Linux. No server to run; data is E2E-encrypted in a per-account, app-private folder. ── */
  const cloudTokenRef=useRef(null); // {accessToken, expiresAt} in memory only; the refresh token lives encrypted in the vault
  const getCloudAuth=()=>(data.settings&&data.settings.cloudAuth)||null; // {provider, refreshToken, account}
  const cloudConfigured=()=>{ const a=getCloudAuth(); return !!(a&&a.refreshToken&&a.provider&&CLOUD_PROVIDERS[a.provider]); };
  const cloudProviderKey={dropbox:DROPBOX_APP_KEY, googledrive:GOOGLE_CLIENT_ID, onedrive:MS_CLIENT_ID};
  const providerConfigured=(id)=>!!cloudProviderKey[id] && !CLOUD_PROVIDERS[id].unavailable;
  const unavailableProviders=Object.keys(CLOUD_PROVIDERS).filter(id=>CLOUD_PROVIDERS[id].unavailable);
  const configuredProviders=Object.keys(CLOUD_PROVIDERS).filter(id=>providerConfigured(id));
  const cloudConnectStart=async(providerId)=>{
    const prov=CLOUD_PROVIDERS[providerId]; if(!prov){flash("Unknown provider.");return}
    if(!providerConfigured(providerId)){ setSyncStatus({type:"error",msg:prov.label+" sync isn't configured on this deployment yet. Use manual sync below, or see DEPLOY.md to enable it."}); return; }
    try{
      const verifier=newPkceVerifier(); const challenge=await pkceChallengeFor(verifier);
      const state=b64url(crypto.getRandomValues(new Uint8Array(16)));
      sessionStorage.setItem("cg-oauth-verifier",verifier); sessionStorage.setItem("cg-oauth-state",state); sessionStorage.setItem("cg-oauth-provider",providerId);
      const redirectUri=window.location.origin+window.location.pathname;
      window.location.href=prov.authUrl({challenge,state,redirectUri});
    }catch(e){ setSyncStatus({type:"error",msg:"Couldn't start cloud connection: "+e.message}); }
  };
  const cloudCompleteAuth=async(ret)=>{
    try{
      const prov=CLOUD_PROVIDERS[ret.provider]; if(!prov||!ret.verifier)return;
      const redirectUri=window.location.origin+window.location.pathname;
      const r=await fetch(prov.tokenUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:prov.exchangeBody({code:ret.code,verifier:ret.verifier,redirectUri})});
      if(!r.ok)throw new Error("token exchange "+r.status);
      const tok=await r.json();
      if(tok.access_token)cloudTokenRef.current={accessToken:tok.access_token, expiresAt:Date.now()+((tok.expires_in||14400)*1000)-60000};
      if(tok.refresh_token){ setData(p=>({...p,settings:{...p.settings,cloudAuth:{provider:ret.provider,refreshToken:tok.refresh_token,account:tok.account_id||""}}})); hipaaAudit("security","Connected cloud sync ("+prov.label+")","security"); flash(prov.label+" connected. Your encrypted data will sync across your devices."); }
    }catch(e){ setSyncStatus({type:"error",msg:"Couldn't finish cloud connection: "+e.message+". Try connecting again."}); }
  };
  const cloudDisconnectStorage=()=>{ cloudTokenRef.current=null; setData(p=>{const s={...p.settings};delete s.cloudAuth;return {...p,settings:s}}); flash("Cloud sync disconnected on this device."); };
  const ensureCloudAccessToken=async()=>{
    const auth=getCloudAuth(); if(!auth)throw new Error("Cloud sync isn't connected.");
    const cur=cloudTokenRef.current; if(cur&&cur.accessToken&&cur.expiresAt>Date.now())return cur.accessToken;
    const prov=CLOUD_PROVIDERS[auth.provider]; if(!prov)throw new Error("Unknown provider.");
    const r=await fetch(prov.tokenUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:prov.refreshBody(auth.refreshToken)});
    if(!r.ok)throw new Error(r.status===400?"Cloud sign-in expired — reconnect in Sync settings.":"token refresh "+r.status);
    const tok=await r.json();
    cloudTokenRef.current={accessToken:tok.access_token, expiresAt:Date.now()+((tok.expires_in||14400)*1000)-60000};
    return tok.access_token;
  };
  // ── Outbox plumbing (Phase 1) ──
  // Bodies are held in a ref rather than in the vault: they are large, already-encrypted snapshots, and a queued
  // object is always regenerable from current state. What DOES persist is the queue itself, so the app remembers
  // there is unsent work across a restart — and if the body is gone by then, sync simply regenerates it.
  const outboxBodiesRef=useRef(new Map());
  const stageOutbox=(key,body,kind)=>{ outboxBodiesRef.current.set(key,body);
    setData(p=>({...p,_outbox:outboxEnqueue(p._outbox||[],{key,kind:kind||"state"},new Date().toISOString())})); };
  const drainOutbox=async(prov,accessToken)=>{
    const provider={ kind:"cloud", async put(key,text){ return prov.upload(accessToken,key,text); } };
    const queue=(data._outbox||[]);
    if(!queue.length) return {complete:true,uploaded:[],outbox:[]};
    const res=await outboxDrain(provider,queue,async(entry)=>{
      const b=outboxBodiesRef.current.get(entry.key);
      if(b===undefined) throw new Error("LOCAL_MISSING");   // regenerated on the next sync
      return b; });
    for(const k of res.uploaded) outboxBodiesRef.current.delete(k);
    setData(p=>({...p,_outbox:res.outbox,
      _sync:{...(p._sync||{}),...(res.uploaded.length?{lastCloudOk:new Date().toISOString()}:{})}}));
    if(res.uploaded.length) hipaaAudit("export","Uploaded "+res.uploaded.length+" encrypted object(s) to connected storage","sync");
    return res; };
  const outboxPending=()=>((data._outbox||[]).length);
  // ── Storage setup (Phase 2) ──
  // Verify the whole path, not just the connection: encrypt a canary, upload it, download it, decrypt it, delete
  // it. Storage that is going to fail must fail HERE, in a calm moment during setup — not silently at 3am when
  // someone is looking for a medication record.
  const verifyStorageRoundTrip=async()=>{
    setStorageVerify("running");
    try{
      const auth=getCloudAuth(); const prov=auth&&CLOUD_PROVIDERS[auth.provider];
      if(!prov) throw new Error("Storage isn't connected yet.");
      const token=await ensureCloudAccessToken();
      const canary={probe:"care-guardian-storage-check",at:new Date().toISOString(),nonce:b64enc(crypto.getRandomValues(new Uint8Array(16)))};
      const pw=getSyncPasscode()||("probe-"+canary.nonce);
      const sealed=await encryptData(canary,pw);
      const key=_opaqueNames()?("cg/"+await storageObjName(_circleKeyForNames(),["check",String(Date.now())])+".bin"):("circle/"+_circleIdForStorage()+"/_check-"+Date.now()+".enc");
      await prov.upload(token,key,JSON.stringify({data:sealed}));
      const back=await prov.download(token,key);
      if(!back) throw new Error("The file was uploaded but couldn't be read back.");
      const opened=await decryptData(JSON.parse(back).data,pw);
      if(!opened||opened.nonce!==canary.nonce) throw new Error("The file came back different from what was sent.");
      try{ if(prov.del) await prov.del(token,key); }catch(e){}   // tidy-up failure is not a verification failure
      setStorageVerify("ok");
      setData(p=>({...p,settings:{...p.settings,storageVerifiedAt:new Date().toISOString()}}));
      hipaaAudit("update","Verified encrypted round-trip to connected storage","sync");
      return true;
    }catch(e){ setStorageVerify({error:String((e&&e.message)||e)}); return false; }
  };
  // Same principle as the cloud check: prove the WHOLE path, not just that the address resolves. A server that
  // accepts a PUT but 404s the GET, or has CORS misconfigured for reads, must fail here rather than at 3am.
  const verifyServerRoundTrip=async()=>{
    setStorageVerify("running");
    try{
      const base=getServerUrl(); if(!base) throw new Error("No server address set.");
      const key=getServerApiKey();
      const canary={probe:"care-guardian-storage-check",at:new Date().toISOString(),nonce:b64enc(crypto.getRandomValues(new Uint8Array(16)))};
      const pw=getSyncPasscode()||("probe-"+canary.nonce);
      const sealed=await encryptData(canary,pw);
      const path=base.replace(/\/+$/,"")+"/o/cg-check-"+Date.now()+".enc";
      const headers={"Content-Type":"application/json"}; if(key)headers["X-Api-Key"]=key;
      const put=await fetch(path,{method:"PUT",headers,body:JSON.stringify({data:sealed})});
      if(!put.ok) throw new Error("The server refused the upload (HTTP "+put.status+").");
      const get=await fetch(path,{headers:key?{"X-Api-Key":key}:{}});
      if(!get.ok) throw new Error("Uploaded, but couldn't read it back (HTTP "+get.status+").");
      const back=await get.json();
      const opened=await decryptData(back.data,pw);
      if(!opened||opened.nonce!==canary.nonce) throw new Error("The file came back different from what was sent.");
      try{ await fetch(path,{method:"DELETE",headers:key?{"X-Api-Key":key}:{}}); }catch(e){}
      setStorageVerify("ok");
      setData(p=>({...p,settings:{...p.settings,storageMode:"server",storageVerifiedAt:new Date().toISOString()}}));
      hipaaAudit("update","Verified encrypted round-trip to self-hosted server","sync");
      return true;
    }catch(e){ const m=String((e&&e.message)||e);
      // A bare "Failed to fetch" from a browser almost always means CORS or an unreachable host, and telling
      // someone their server "failed" without that hint sends them looking in the wrong place.
      setStorageVerify({error:/failed to fetch|networkerror/i.test(m)
        ? "Couldn't reach the server. Check the address, and ask whoever runs it to allow this app's web address (CORS)."
        : m});
      return false; }
  };
  const chooseLocalOnly=()=>{ setStorageChoice("local");
    setData(p=>({...p,settings:{...p.settings,storageMode:"local",storageChosenAt:new Date().toISOString()}}));
    hipaaAudit("update","Storage set to this device only","sync"); };
  // Skipping is not a decision. It leaves the app local-only (which is safe) and keeps a nudge visible, so egress
  // is never the path of least resistance and never happens because someone tapped past a screen.
  const skipStorageChoice=()=>{ setShowStorageChoice(false);
    setData(p=>({...p,settings:{...p.settings,storageMode:"local",storagePrompt:"pending"}})); };
  const finishStorageSetup=()=>{ setShowStorageChoice(false);
    setData(p=>({...p,settings:{...p.settings,storagePrompt:"done"}})); };
  // The recovery kit lives in the wrapped-key object (wk.cRecovery), not in settings — check the real thing
  // rather than a flag, so the gate can't be satisfied by a value that was never actually created.
  const hasRecoveryKit=()=>{ try{ const ko=loadWrappedKeys(); return !!(ko&&ko.wk&&ko.wk.cRecovery); }catch(e){ return false; } };
  const storageNudgeVisible=()=>{ const st=(data.settings&&data.settings.storagePrompt); 
    return !storageNudgeDismissed && st==="pending" && !getCloudAuth(); };

  // ── Failure handling (Phase 4) ──
  const recordStorageFailure=(err)=>{
    const cls=classifyStorageError(err,{offline:(typeof navigator!=="undefined"&&navigator.onLine===false)});
    const ui=storageFailUI(cls);
    setData(p=>{ const prev=(p._sync&&p._sync.storageFail)||{}; const attempt=(prev.cls===cls?(prev.attempt||0):0)+1;
      return {...p,_sync:{...(p._sync||{}),storageFail:{cls,attempt,at:new Date().toISOString(),
        nextAttemptAt:ui.retry?new Date(Date.now()+storageBackoffMs(attempt)).toISOString():null,
        detail:String((err&&err.message)||err||"").slice(0,200)}}}; });
    if(ui.alarm) hipaaAudit("update","Storage unavailable ("+cls+") — recording continues on this device","sync");
    return {cls,ui};
  };
  const clearStorageFailure=()=>setData(p=>{ const sy={...(p._sync||{})}; delete sy.storageFail; return {...p,_sync:sy}; });
  const storageFailState=()=>((data._sync&&data._sync.storageFail)||null);
  // A one-tap way back. Reconnecting doesn't re-ask for the storage choice — it re-authorises what was chosen.
  const reconnectStorage=async()=>{ const auth=getCloudAuth();
    if(!auth){ setStorageChoice(null); setShowStorageChoice(true); return; }
    cloudTokenRef.current=null;
    try{ await cloudConnectStart(auth.provider); }catch(e){ recordStorageFailure(e); } };
  // The folder was deleted: everything needed to rebuild it is still in the vault, so offer exactly that.
  const reuploadEverything=async()=>{ clearStorageFailure();
    setData(p=>({...p,_sync:{...(p._sync||{}),seenDevices:{}}}));   // forget what we thought was already there
    flash("Rebuilding your cloud copy from this device…");
    await cloudStorageSyncRef.current(); };
  const cloudStorageSyncRef=useRef(null);
  // ── Manifest plumbing ──
  const _circleIdForStorage=()=>((data.settings&&data.settings.circle&&data.settings.circle.id)||"solo");
  // Opaque names need the circle key. Without one (solo use before a circle exists) fall back to plain names —
  // a lone device with no circle has no teammates to hide device counts from, and correctness beats theatre.
  const _circleKeyForNames=()=>((data.settings&&data.settings.circle&&data.settings.circle.key)||"");
  const _opaqueNames=()=>!!_circleKeyForNames();
  const _myStateKey=async()=>_opaqueNames()
    ? storageKeysOpaque.state(_circleKeyForNames(),_circleIdForStorage(),circleDeviceId())
    : storageKeys.state(_circleIdForStorage(),circleDeviceId());
  const _manifestKey=()=>_opaqueNames()?STORAGE_MANIFEST_NAME:storageKeys.manifest(_circleIdForStorage());
  const readManifest=async(prov,accessToken,pw)=>{
    try{ let txt=await prov.download(accessToken,_manifestKey());
      if(!txt&&_opaqueNames()) txt=await prov.download(accessToken,storageKeys.manifest(_circleIdForStorage())); // pre-Phase-5 layout
      if(!txt) return null;
      let j=JSON.parse(storageUnpad(txt));
      if(j&&j.data&&!j.devices){ try{ j=await decryptData(j.data,pw); }catch(e){ return null; } }  // sealed manifest
      return (j&&j.v===MANIFEST_VERSION)?j:null;
    }catch(e){ return null; }   // absent manifest is the normal first-run case, not an error
  };
  const cloudStorageSync=async()=>{
    const pw=getSyncPasscode();
    if(!pw){setSyncStatus({type:"error",msg:"Enter a team sync passcode first."});return}
    const auth=getCloudAuth(); const prov=auth&&CLOUD_PROVIDERS[auth.provider];
    if(!prov){setSyncStatus({type:"error",msg:"Cloud sync isn't connected."});return}
    setCloudSyncing(true);setSyncStatus(null);
    try{
      const accessToken=await ensureCloudAccessToken();
      let pullReport=null;
      // Per-device objects: read the manifest, then each teammate's own object. Falls back to the single legacy
      // file so an existing deployment keeps working through the transition.
      const manifest=await readManifest(prov,accessToken,pw);
      const pullKeys=manifest
        ? manifestPullList(manifest,circleDeviceId(),(data._sync&&data._sync.seenDevices)||{}).map(d=>d.key)
        : [CLOUD_SYNC_PATH];
      const seenNow={};
      if(manifest) for(const d of manifestPullList(manifest,circleDeviceId(),{})) seenNow[d.deviceId]=d.updatedAt;
      for(const pullKey of pullKeys){
      try{
        const pullText=storageUnpad(await prov.download(accessToken,pullKey));
        if(pullText){
          if(rawTextTooLarge(pullText)){ setSyncStatus({type:"error",msg:"Incoming sync data is too large to load safely and was NOT applied. This can mean a corrupted or runaway device — check the source before syncing again."}); hipaaAudit("security","Cloud sync payload refused (over hard size cap)","security"); setCloudSyncing(false); return; }
          const pullJson=JSON.parse(pullText);
          if(pullJson.data){
            if(payloadHardTooLarge(pullJson.data)){ setSyncStatus({type:"error",msg:"Incoming sync data is too large to load safely ("+mb(b64Bytes(pullJson.data))+" MB) and was NOT applied."}); hipaaAudit("security","Cloud sync payload refused (over hard size cap)","security"); setCloudSyncing(false); return; }
            const remote=await ingestBlobs(await decryptData(pullJson.data,pw),dekRef.current,rKeyRef.current);
            const validation=validateImportSchema(remote);
            if(validation.valid){
              const sanitized=sanitizeImportData(remote);
              const{merged,report}=mergeWithClock(data,sanitized);
              if(mergeIsOversized(pullJson.data, report)){ const sourceName=(sanitized.settings&&sanitized.settings.deviceName)||"another device"; setMergePreview({merged,report,sourceName,oversized:true,floodBytes:b64Bytes(pullJson.data)}); setSyncStatus({type:"error",msg:"Unusually large update from "+sourceName+" — review it before applying (not auto-merged)."}); setCloudSyncing(false); return; }
              pullReport=report; setData(merged);
            }
          }
        }
      }catch(e){ if(/expired|reconnect/i.test(e.message)){setSyncStatus({type:"error",msg:e.message});setCloudSyncing(false);return} }
      } // end per-device pull loop
      const exportData={...stripPortableSecrets(data),_sync:{...(data._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||""}};
      const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),pw);
      const body=JSON.stringify({data:b64});
      // The upload goes through the outbox rather than straight to the provider. Before, a failed upload threw and
      // the work was simply gone — the user saw an error and their change never reached storage. Now the object is
      // staged locally first, so a dead token, a dropped connection or a full account leaves work queued instead
      // of lost, and the next successful sync carries it. This is what makes session-scoped storage (Google Drive)
      // safe, and it removes a real data-loss path for every other provider too.
      const myKey=await _myStateKey();
      stageOutbox(myKey,storagePad(body),"state");
      // The manifest is staged too and always drains LAST, so it never advertises an object that hasn't landed.
      // It is merged with whatever is already there: a near-simultaneous write from another device would otherwise
      // drop that device's entry at file level.
      const mergedManifest=manifestMerge(manifest,manifestPut(manifest||manifestEmpty(_circleIdForStorage()),circleDeviceId(),
        {key:myKey,label:(data.settings&&data.settings.deviceName)||"",epoch:(data.settings&&data.settings.circle&&data.settings.circle.epoch)||0},
        new Date().toISOString()));
      // The manifest is ENCRYPTED like everything else. It was previously uploaded as plaintext JSON, which listed
      // every device, its human-readable name ("Mum's iPad") and exactly when each one last synced — undoing the
      // opaque object naming it sits beside. Sealed under the same passcode as the state objects.
      stageOutbox(_manifestKey(),storagePad(JSON.stringify({data:await encryptData(mergedManifest,pw)})),"manifest");
      const drain=await drainOutbox(prov,accessToken);
      if(!drain.complete){
        setCloudSyncing(false);
        const {ui:dui}=recordStorageFailure(drain.stopped==="QUOTA"?Object.assign(new Error("storage full"),{code:"QUOTA"}):new Error(drain.stopped||"upload failed"));
        setSyncStatus({type:"error",msg:dui.title+" — "+dui.body});
        return;
      }
      const added=((pullReport&&pullReport.added&&pullReport.added.length)||0);const updated=((pullReport&&pullReport.updated&&pullReport.updated.length)||0);
      setSyncStatus({type:"success",msg:added+updated>0?`Synced: ${added} new, ${updated} updates from your team.`:"Synced — your data is up to date across your devices."});
      clearStorageFailure();
      setData(p=>({...p,_sync:{...p._sync,lastSync:new Date().toISOString(),seenDevices:{...((p._sync&&p._sync.seenDevices)||{}),...seenNow}}}));
      try{ pushAllAutoGrants(); flushSharedAudit(); }catch(e){/* live intake push is best-effort and never blocks sync */}
    }catch(e){ const {ui}=recordStorageFailure(e);
      // "Cloud sync failed" told the user nothing they could act on. Now the message names what happened, what
      // the app is doing about it, and — always — where their records actually are.
      setSyncStatus({type:"error",msg:ui.title+" — "+ui.body}); }
    setCloudSyncing(false);
  };

  /* ── Sync dispatch — use whichever method is configured ── */
  cloudStorageSyncRef.current=cloudStorageSync; // reuploadEverything calls sync without a forward reference

  const syncNow=async()=>{
    if(cloudConfigured()){await cloudStorageSync()}
    else if(getServerUrl()){await serverSync()}
    else if(cloudConnected&&cloudHandle){await cloudSync()}
    else{setSyncStatus({type:"error",msg:"No sync method configured. Connect cloud sync, a folder, or a server below."})}
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
  const auditBackupCacheRef=useRef({count:-1,block:null}); // caches the decrypted audit log for continuous backup (re-read only when it grows)
  // ── Audit-log durability (Layer 0): the hash-chained log rides the encrypted backup so device loss can't destroy
  // the 6-year record. Read for backup; restored on import. Per-device-clean (backup is a point-in-time snapshot);
  // multi-device audit streams are a separate concern (see AUDIT-DURABILITY-DESIGN.md Layer 1).
  const getAuditBackup=async(fresh)=>{
    if(!auditKeyRef.current)return null;
    try{
      const c=await getAuditCount();
      if(!fresh&&auditBackupCacheRef.current.count===c&&auditBackupCacheRef.current.block)return auditBackupCacheRef.current.block;
      const entries=await readAuditLog(auditKeyRef.current,100000);
      const block={device:(data.settings&&data.settings.deviceId)||"",exportedAt:new Date().toISOString(),count:entries.length,entries};
      auditBackupCacheRef.current={count:c,block};
      return block;
    }catch{return auditBackupCacheRef.current.block}
  };
  const restoreAuditBackup=async(block,key)=>{
    const k=key||auditKeyRef.current;
    if(!block||!Array.isArray(block.entries)||!k)return 0;
    let n=0; for(const e of block.entries){ try{ await writeAuditEntry(e,k); n++; }catch{} }
    auditBackupCacheRef.current={count:-1,block:null}; // force re-read on next backup
    return n;
  };
  // ── Multi-device audit: the backup carries a device-keyed MAP {deviceId: block} so two devices' hash chains
  // never clobber or interleave. This device's chain restores into the active DB (idempotent, keyed by entry id);
  // FOREIGN chains are kept in data._auditArchive for durability and NEVER written into the active chain (their
  // seq numbers would break verification). Back-compatible: a single legacy block is treated as a 1-entry map.
  const auditDeviceId=()=>(data.settings&&data.settings.deviceId)||"";
  const buildAuditMap=(localBlock)=>{ const m={...(data._auditArchive||{})}; if(localBlock)m[auditDeviceId()]=localBlock; return m; };
  const applyAuditMap=async(curData, mapOrBlock, key)=>{ let restored=0, archived=0; let out=curData; if(!mapOrBlock)return {data:out,restored,archived};
    const myId=(curData.settings&&curData.settings.deviceId)||auditDeviceId();
    const map=Array.isArray(mapOrBlock.entries)?{[mapOrBlock.device||myId]:mapOrBlock}:mapOrBlock;
    for(const dev of Object.keys(map)){ const block=map[dev]; if(!block||!Array.isArray(block.entries))continue;
      if(dev===myId){ restored+=await restoreAuditBackup(block,key); }
      else { const prev=(out._auditArchive||{})[dev]; const keep=(prev&&(prev.count||0)>=(block.count||0))?prev:block; out={...out,_auditArchive:{...(out._auditArchive||{}),[dev]:keep}}; archived++; } }
    return {data:out,restored,archived}; };
  const refreshAuditState=async()=>{
    try{ const k=auditKeyRef.current; if(!k)return;
      const entries=await readAuditLog(k,500); setAuditEntries(entries); setAuditCount(await getAuditCount());
      const chained=entries.filter(e=>typeof e.seq==="number"&&e.hash);
      if(chained.length){const last=chained.sort((a,b)=>a.seq-b.seq)[chained.length-1];auditTipRef.current={seq:last.seq,hash:last.hash}}
      const cs=await verifyAuditChain(entries,(data.settings&&data.settings.auditTip)||null); setAuditChainStatus(cs);
      if(cs.status==="ok"&&cs.tip)saveAuditTip(cs.tip.seq,cs.tip.hash);
    }catch{}
  };
  // ── Shared-scope audit chain (model B): family-controlled, per-institution, only sharing events ──
  const sharedTipsRef=useRef({});                 // grantId -> {seq,hash}, rebuilt from the store on unlock
  const sharedChainRef=useRef(Promise.resolve()); // serializes appends so seq/prevHash stay well-ordered
  const loadSharedTips=async(key)=>{ try{ const entries=await readSharedEntries(key||auditKeyRef.current); const tips={}; entries.forEach(e=>{ if(!tips[e.grantId]||e.seq>tips[e.grantId].seq)tips[e.grantId]={seq:e.seq,hash:e.hash} }); sharedTipsRef.current=tips; }catch{} };
  const sharingCats=(grant)=>{ const m={careStatus:"care status",incidents:"incidents",medAdherence:"medication adherence",appointments:"appointments",concerns:"concerns",engagement:"engagement"}; const s=(grant&&grant.scope)||{}; const inc=Object.keys(s).filter(k=>s[k]).map(k=>m[k]||k); return inc.length?inc.join(", "):"engagement & status"; };
  const pushSharedEntry=async(grant,entry)=>{
    const t=grant&&grant.transport; if(!t||!t.base||!t.prefix||!t.writeCap)return false; // no live intake (or unclaimed) — stays local, flushed on sync
    try{
      const bundle=await sealGrantBundle(entry,{kind:"shared-audit",grantId:grant.grantId,seq:entry.seq},b64dec(grant.granteePub),{grantId:grant.grantId,archetype:"audit",institution:grant.institution,family:{name:(data.settings&&data.settings.clientName)||"Care recipient"},createdAt:grant.createdAt,expiresAt:grant.expiresAt});
      const be=INTAKE_BACKENDS[t.backend]||INTAKE_BACKENDS.https;
      await be.push({base:t.base,prefix:t.prefix,writeCap:t.writeCap},"audit/"+sharedObjectName(entry.seq),JSON.stringify(bundle));
      return true;
    }catch{return false}
  };
  // Append a shared-scope event (ONLY grant/sharing events) to the grant's independent chain, then flush immediately.
  const appendSharedAudit=(grant,type,summary)=>{
    if(!grant||!SHARED_TYPES[type])return; const grantId=grant.grantId;
    sharedChainRef.current=sharedChainRef.current.then(async()=>{
      if(!auditKeyRef.current)return;
      const tip=sharedTipsRef.current[grantId]||{seq:0,hash:""};
      const entry={grantId,seq:tip.seq+1,ts:new Date().toISOString(),type,summary:String(summary||"").slice(0,200),prevHash:tip.hash};
      entry.hash=await computeSharedHash(entry);
      sharedTipsRef.current[grantId]={seq:entry.seq,hash:entry.hash};
      await writeSharedEntry(entry,auditKeyRef.current);
      await pushSharedEntry(grant,entry); // immediate flush for these (critical) events; offline entries catch up via flushSharedAudit
    }).catch(()=>{});
  };
  const flushSharedAudit=async()=>{ // re-push locally-held shared entries for live grants (idempotent; offline catch-up after connectivity returns)
    if(!auditKeyRef.current)return;
    try{ const entries=await readSharedEntries(auditKeyRef.current); const byGrant={}; entries.forEach(e=>{(byGrant[e.grantId]=byGrant[e.grantId]||[]).push(e)});
      for(const g of (data.grants||[])){ if(!g.transport||!g.transport.writeCap)continue; for(const e of (byGrant[g.grantId]||[]).sort((a,b)=>a.seq-b.seq)){ try{ await pushSharedEntry(g,e); }catch{} } }
    }catch{}
  };
  const getSharedAuditBackup=async()=>{ if(!auditKeyRef.current)return null; try{ const entries=await readSharedEntries(auditKeyRef.current); return entries.length?{exportedAt:new Date().toISOString(),count:entries.length,entries}:null; }catch{return null} };
  const restoreSharedAudit=async(block,key)=>{ const k=key||auditKeyRef.current; if(!block||!Array.isArray(block.entries)||!k)return 0; let n=0; for(const e of block.entries){ try{ await writeSharedEntry(e,k); n++; }catch{} } await loadSharedTips(k); return n; };
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
  const removeCustomSub=(dk,gi,ci)=>{if(!can("add-custom-sub"))return;setData(p=>{const goals=[...p.domains[dk].goals];goals[gi]={...goals[gi],customSubs:goals[gi].customSubs.filter((_,i)=>i!==ci)};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals}}}})};
  const removeSub=(dk,gi,si)=>{if(!can("remove-subtask"))return;setData(p=>{const goals=[...p.domains[dk].goals];const subs=[...goals[gi].subs];subs[si]={...subs[si],removed:true};goals[gi]={...goals[gi],subs};return{...p,domains:{...p.domains,[dk]:{...p.domains[dk],goals}}}})};
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
  const deleteContactNote=(cid,ni)=>{if(!can("add-contact"))return;setData(p=>({...p,contacts:p.contacts.map(c=>c.id===cid?{...c,notes:c.notes.filter((_,i)=>i!==ni)}:c)}))};
  const handleImportVCard=(e)=>{const file=(e.target.files&&e.target.files[0]);if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{const cards=parseVCards(ev.target.result);if(!cards.length){flash("No contacts found.");return}const sanitized=cards.slice(0,200).map(sanitizeContact);setData(p=>addLog({...p,contacts:[...p.contacts,...sanitized.map(c=>({...c,id:nextId()}))]},"contacts",`Imported ${sanitized.length} contact(s)`));flash(`Imported ${sanitized.length} contact(s).`)};reader.readAsText(file);e.target.value=""};
  const getSortedContacts=()=>{let list=[...(data.contacts||[])];if(contactFilter!=="all")list=list.filter(c=>c.category===contactFilter);if(contactSort==="alpha")list.sort((a,b)=>a.name.localeCompare(b.name));else{const co=CONTACT_CATS.map(c=>c.key);list.sort((a,b)=>{const d=co.indexOf(a.category)-co.indexOf(b.category);return d!==0?d:a.name.localeCompare(b.name)})}return list};

  /* ── appointments ── */
  const _apptScope=()=>((data.settings&&data.settings.circle&&data.settings.circle.id)||(data.settings&&data.settings.deviceId)||"local");
  // A calendar identifies an event by UID. Keep it stable so a re-export UPDATES the event; bump SEQUENCE only
  // when something the calendar shows actually changed, so we don't churn the user's calendar for a note edit.
  const saveAppt=(appt,id)=>{setData(p=>{let appointments;
    if(id){ appointments=p.appointments.map(a=>{ if(a.id!==id) return a;
        const merged={...a,...appt};
        const shown=(x)=>[x.date,x.time,x.durationMin||"",icsCalendarTitle(x),x.location||""].join("|");
        if(a.uid && shown(a)!==shown(merged)) merged.seq=(a.seq||0)+1;
        return merged; }); }
    else { const nid=nextId(); appointments=[...p.appointments,{...appt,id:nid,uid:icsMakeUid(nid,_apptScope()),seq:0}]; }
    return addLog({...p,appointments},"calendar",id?"Updated appointment":"Added appointment")});setApptForm(null)};
  // A deleted appointment must also disappear from the user's calendar, which only happens if we export it once
  // more as CANCELLED. Tombstones are tiny (uid + when + title shown) and capped.
  // ── Export to the device calendar. There is no browser API that writes to a calendar, so this hands the OS a
  // .ics file; the calendar app opens it and asks to add. Re-exporting the same appointment updates it in place.
  const [icsIncludeNotes,setIcsIncludeNotes]=useState(false);
  const _ensureApptUids=()=>{ let changed=false;
    setData(p=>{ const appointments=(p.appointments||[]).map(a=>{ if(a.uid) return a; changed=true;
        return {...a,uid:icsMakeUid(a.id,_apptScope()),seq:a.seq||0}; });
      return changed?{...p,appointments}:p; }); };
  const _markExported=(ids)=>setData(p=>({...p,
    appointments:(p.appointments||[]).map(a=>ids.indexOf(a.id)>=0?{...a,exportedAt:new Date().toISOString()}:a),
    apptTombstones:[]}));   // tombstones have now been delivered as CANCELLED; they've done their job
  // ── Import the caregiver's own calendar (file, never a login). Kept only to detect collisions.
  const extCalRef=useRef(null);
  const handleExtCalImport=async(e)=>{ const file=e.target.files&&e.target.files[0]; if(!file){e.target.value="";return;}
    try{ const text=await file.text();
      const {events,skippedComplexRecurrence}=icsParseEvents(text,{today:new Date().toISOString().slice(0,10)});
      if(!events.length){ flash("No upcoming events found in that calendar file."); e.target.value=""; return; }
      setData(p=>addLog({...p,externalCal:{importedAt:new Date().toISOString(),source:file.name,events}},"calendar","Imported "+events.length+" external calendar event(s)"));
      hipaaAudit("create","Imported "+events.length+" event(s) from an external calendar file","appointments");
      flash(events.length+" event"+(events.length===1?"":"s")+" imported for conflict checking."+(skippedComplexRecurrence?" "+skippedComplexRecurrence+" repeating event(s) were too complex to expand and were skipped.":""));
    }catch(err){ flash("That file couldn't be read as a calendar."); }
    e.target.value=""; };
  const clearExtCal=()=>setData(p=>{const q={...p}; delete q.externalCal; return addLog(q,"calendar","Cleared imported calendar")});
  const getApptConflicts=()=>{ const ec=data.externalCal; if(!ec||!ec.events) return [];
    return icsFindConflicts(data.appointments||[],ec.events); };
  const exportAppointmentIcs=(appt)=>{ if(!can("export-data")){flash("You don't have permission to export.");return;}
    const withUid=appt.uid?appt:{...appt,uid:icsMakeUid(appt.id,_apptScope())};
    if(!appt.uid) setData(p=>({...p,appointments:(p.appointments||[]).map(a=>a.id===appt.id?{...a,uid:withUid.uid,seq:a.seq||0}:a)}));
    const ics=icsCalendar([withUid],{includeNotes:icsIncludeNotes,scope:_apptScope()});
    downloadFile(ics,(icsCalendarTitle(withUid).replace(/[^a-z0-9]+/gi,"-").toLowerCase()||"appointment")+".ics","text/calendar");
    hipaaAudit("export","Exported appointment to calendar file","appointments");
    _markExported([appt.id]);
    flash("Calendar file created. Open it to add this to your calendar."); };
  const exportAllAppointmentsIcs=()=>{ if(!can("export-data")){flash("You don't have permission to export.");return;}
    _ensureApptUids();
    const appts=(data.appointments||[]).map(a=>a.uid?a:{...a,uid:icsMakeUid(a.id,_apptScope())});
    const tombs=(data.apptTombstones||[]);
    if(!appts.length&&!tombs.length){flash("No appointments to export yet.");return;}
    const ics=icsCalendar([...appts,...tombs],{includeNotes:icsIncludeNotes,scope:_apptScope()});
    downloadFile(ics,"care-guardian-appointments.ics","text/calendar");
    hipaaAudit("export","Exported "+appts.length+" appointment(s) to calendar file","appointments");
    _markExported(appts.map(a=>a.id));
    flash(appts.length+" appointment"+(appts.length===1?"":"s")+" exported. Opening the file adds or updates them — it won't create duplicates."); };
  const deleteAppt=(id)=>{if(!can("add-appointment"))return;setData(p=>{
    const gone=(p.appointments||[]).find(a=>a.id===id);
    const tombs=(gone&&gone.uid&&gone.exportedAt)
      ? [{uid:gone.uid,seq:(gone.seq||0)+1,date:gone.date,time:gone.time,durationMin:gone.durationMin,calTitle:gone.calTitle,title:gone.title,cancelled:true},...(p.apptTombstones||[])].slice(0,200)
      : (p.apptTombstones||[]);
    return addLog({...p,appointments:p.appointments.filter(a=>a.id!==id),apptTombstones:tombs},"calendar","Removed appointment")});setApptForm(null)};
  const getApptsForDate=(dateStr)=>(data.appointments||[]).filter(a=>a.date===dateStr).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const getUpcoming=()=>{const today=fmtDate(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());return(data.appointments||[]).filter(a=>a.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).slice(0,5)};

  /* ── messages ── */
  const sendMessage=()=>{const from=(data.settings&&data.settings.team)?(data.settings&&data.settings.deviceName)||"Unknown":msgFrom.trim();if(!msgText.trim()||!from)return;setData(p=>({...p,messages:[...p.messages,{id:nextId(),from,text:msgText.trim(),timestamp:new Date().toLocaleString(),deviceId:(data.settings&&data.settings.deviceId)}]}));setMsgText("")};

  /* ── settings / export ── */
  // A failure rendered in the success-green box tells the user the opposite of the truth. flash() now carries a
  // severity; anything that reads like a failure is styled as one even if the caller forgot to say so.
  const flash=(msg,kind)=>{const bad=kind==="error"||/^(couldn't|could not|failed|error|unable|wrong|no permission|you don't have)/i.test(String(msg||""));setSettingsMsg(bad?{t:msg,bad:true}:{t:msg});setTimeout(()=>setSettingsMsg(null),4000)};
  // ── One backup passcode (locked decision 1 + 3) ──
  // There used to be three secrets in this area: exportPw (typed fresh every manual export and never remembered),
  // backupPasscode (continuous backup), and the recovery code. A .care file whose passcode nobody wrote down is a
  // wasted download, so the passcode is now DERIVED from the vault key the user already unlocked with. They keep
  // one secret; restoring asks for the passcode they already know.
  const markBackedUp=async()=>{ const fp=await backupFingerprint(data);
    setData(p=>({...p,settings:{...p.settings,lastBackupAt:new Date().toISOString(),backupFingerprint:fp,backupCount:backupCountable(p)}}));
    setShowBackupReminder(false); };
  const handleEncryptedExport=async()=>{if(!can("export-data"))return false;hipaaAudit("export","Encrypted backup exported","all");const exportPass=exportPw.trim()||await getBackupPasscode();try{
    // Include export metadata inside encrypted payload for integrity (M5)
    const exportMeta={exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId)||"unknown",exportedByName:(data.settings&&data.settings.deviceName)||"",formatVersion:"2.0"};
    const exportData={...stripPortableSecrets(data),_sync:{...(data._sync||{}),...exportMeta},_exportMeta:exportMeta};
    const _auditMap=buildAuditMap(await getAuditBackup(true)); if(Object.keys(_auditMap).length)exportData._audit=_auditMap;
    const _sharedB=await getSharedAuditBackup(); if(_sharedB)exportData._sharedAudit=_sharedB;
    const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),exportPass);downloadFile(JSON.stringify({encrypted:true,version:"2.0",data:b64}),"care-guardian-backup.care");
    await markBackedUp();
    flash("Encrypted backup downloaded. Keep it somewhere safe — it's your recovery copy.");
    return true;
  }catch(e){ flash("Export failed: "+e.message); return false; }};
  const handleNonSensitiveExport=()=>{if(!can("export-data"))return;hipaaAudit("export","Non-sensitive summary exported","summary");const safe={domainOverrides:data.domainOverrides,domainStatus:{},settings:{}}; DOMAINS.forEach(d=>{const prog=getProgress(d.key);const health=prog.pct>=80&&prog.recency>=70?"Healthy":prog.pct>=40||prog.recency>=40?"Fair":"Needs Attention";safe.domainStatus[d.key]={health,foundation:prog.pct+"%",carePulse:prog.recency+"%",progress:prog}});downloadFile(JSON.stringify(safe,null,2),"care-guardian-summary.json");flash("Summary exported (no PHI).")};
  // ── "Share your records": readable PDF (print) + structured FHIR. Both produce UNENCRYPTED files by design,
  // so the user can hand them to a provider; the UI warns, and the encrypted .care backup is the secure path.
  const _shEsc=(v)=>String(v==null?"":v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const buildShareDoc=(scope)=>{
    const name=(data.settings&&data.settings.clientName)||"Care recipient";
    let s=`<h1>${_shEsc(name)} — Care Record</h1><p class="meta">Prepared ${_shEsc(new Date().toLocaleDateString())} · via Care Guardian</p>`;
    if(scope.meds){const meds=getMedSchedule().medications;s+=`<h2>Medications</h2>`+(meds.length?`<table><thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Notes</th></tr></thead><tbody>`+meds.map(m=>`<tr><td>${_shEsc(m.name)}</td><td>${_shEsc(m.dose||"")}</td><td>${_shEsc(m.frequency||m.schedule||"")}</td><td>${_shEsc(m.notes||"")}</td></tr>`).join("")+`</tbody></table>`:`<p class="empty">None recorded.</p>`);}
    if(scope.conditions){const notes=DOMAINS.map(d=>{const n=(data.domains&&data.domains[d.key]&&data.domains[d.key].notes)||"";return n?`<h3>${_shEsc(d.label)}</h3><div class="notes">${_shEsc(n).replace(/\n/g,"<br>")}</div>`:""}).filter(Boolean).join("");s+=`<h2>Conditions &amp; care notes</h2>`+(notes||`<p class="empty">None recorded.</p>`);}
    if(scope.providers){const cs=data.contacts||[];s+=`<h2>Providers &amp; contacts</h2>`+(cs.length?`<table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th></tr></thead><tbody>`+cs.map(c=>`<tr><td>${_shEsc(c.name)}${c.org?" · "+_shEsc(c.org):""}</td><td>${_shEsc(c.role||"")}</td><td>${_shEsc(c.phone||"")}</td><td>${_shEsc(c.email||"")}</td></tr>`).join("")+`</tbody></table>`:`<p class="empty">None recorded.</p>`);}
    if(scope.appointments){const ap=(data.appointments||[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));s+=`<h2>Appointments</h2>`+(ap.length?`<table><thead><tr><th>Date</th><th>What</th><th>Provider</th><th>Location</th></tr></thead><tbody>`+ap.map(a=>`<tr><td>${_shEsc(a.date||"")} ${_shEsc(a.time||"")}</td><td>${_shEsc(a.title||a.type||"")}</td><td>${_shEsc(a.provider||"")}</td><td>${_shEsc(a.location||"")}</td></tr>`).join("")+`</tbody></table>`:`<p class="empty">None recorded.</p>`);}
    if(scope.incidents){const inc=(data.incidents||[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));s+=`<h2>Incidents</h2>`+(inc.length?inc.map(i=>`<div class="inc"><strong>${_shEsc(i.date||"")} ${_shEsc(i.time||"")}</strong> — ${_shEsc(i.type||"")}${i.severity?" ("+_shEsc(i.severity)+")":""}<div>${_shEsc(i.description||"")}</div></div>`).join(""):`<p class="empty">None recorded.</p>`);}
    if(scope.carePlan){s+=`<h2>Care plan status</h2><table><thead><tr><th>Area</th><th>Setup</th><th>Freshness</th></tr></thead><tbody>`+DOMAINS.map(d=>{const p=getProgress(d.key);return `<tr><td>${_shEsc(d.label)}</td><td>${p.pct}%</td><td>${p.recency}%</td></tr>`}).join("")+`</tbody></table>`;}
    return s;
  };
  const SHARE_CSS=`body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;line-height:1.5;max-width:760px;margin:24px auto;padding:0 20px}h1{font-size:22px;margin:0 0 2px}h2{font-size:16px;border-bottom:2px solid #457b9d;padding-bottom:4px;margin:22px 0 10px;color:#2a4d63}h3{font-size:0.9375rem;margin:12px 0 4px;color:#444}.meta{color:#666;font-size:0.9375rem;margin:0 0 8px}table{width:100%;border-collapse:collapse;font-size:0.9375rem;margin:6px 0}th,td{text-align:left;border:1px solid #ddd;padding:6px 8px;vertical-align:top}th{background:#f2f5f7}.empty{color:#999;font-size:0.9375rem;font-style:italic}.inc{font-size:0.9375rem;margin:8px 0;padding:8px;border:1px solid #eee;border-radius:6px}.notes{font-size:0.9375rem;white-space:pre-wrap}@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}`;
  const handleSharePdf=()=>{
    if(!can("export-data"))return;
    if(!Object.values(shareScope).some(Boolean)){flash("Pick at least one thing to include.");return}
    hipaaAudit("export","Readable record exported (PDF/print)","selected");
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Care Record</title><style>${SHARE_CSS}</style></head><body>${buildShareDoc(shareScope)}<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`;
    const win=window.open("","_blank");
    if(!win){downloadFile(html,"care-record.html","text/html");flash("Pop-up blocked — saved as a file instead. Open it, then Print → Save as PDF.");return}
    win.document.write(html);win.document.close();flash("Use your browser's Print → Save as PDF.");
  };
  const handleShareFhir=()=>{
    if(!can("export-data"))return;
    if(!shareScope.meds&&!shareScope.providers){flash("FHIR export covers medications and providers — include at least one.");return}
    hipaaAudit("export","Structured record exported (FHIR R4)","selected");
    const name=(data.settings&&data.settings.clientName)||"Care recipient",pid="patient-1",entry=[{resource:{resourceType:"Patient",id:pid,name:[{text:name}]}}];
    if(shareScope.providers)(data.contacts||[]).forEach((c,i)=>entry.push({resource:{resourceType:"Practitioner",id:"prac-"+(i+1),name:[{text:c.name||""}],telecom:[...(c.phone?[{system:"phone",value:c.phone}]:[]),...(c.email?[{system:"email",value:c.email}]:[])]}}));
    if(shareScope.meds)getMedSchedule().medications.forEach((m,i)=>entry.push({resource:{resourceType:"MedicationStatement",id:"med-"+(i+1),status:"active",subject:{reference:"Patient/"+pid},medicationCodeableConcept:{text:m.name||""},dosage:[{text:[m.dose,m.frequency||m.schedule].filter(Boolean).join(" ")||(m.notes||"")}]}}));
    downloadFile(JSON.stringify({resourceType:"Bundle",type:"collection",timestamp:new Date().toISOString(),entry},null,2),"care-record-fhir.json");
    flash("FHIR R4 bundle exported.");
  };
  // ── Consent-grant lifecycle (OQ1). The projection is built by INCLUSION per scope; the verbatim client
  // voice is never included. Each push seals a fresh bundle (file-based transport in v1: export → hand to
  // the program / shared folder; the program opens it in reviewer mode).
  const buildGrantProjection=(grant)=>{
    const scope=grant.scope||{}, includes=[], arch=GRANT_ARCHETYPES[grant.archetype]||GRANT_ARCHETYPES.navigator;
    const proj={archetype:grant.archetype,asOf:new Date().toISOString(),care:projCareLabel(grant.archetype,(data.settings&&data.settings.clientName))};
    if(grant.archetype==="reviewer"){
      includes.push("Engagement & status — no health details");
      const domainHealth={}; DOMAINS.forEach(d=>{const p=getProgress(d.key);domainHealth[d.label]=p.pct>=80&&p.recency>=70?"Healthy":(p.pct>=40||p.recency>=40?"Fair":"Needs attention")});
      proj.engagement={lastActive:new Date().toISOString().slice(0,10),domainHealth,hasBackup:!!(data.settings&&data.settings.lastBackupAt),hasTeam:!!(data._sync&&data._sync.name)};
    } else {
      if(scope.careStatus){includes.push("Care-plan status & progress");proj.careStatus=DOMAINS.map(d=>{const p=getProgress(d.key);return{area:d.label,setup:p.pct,freshness:p.recency}})}
      if(scope.incidents){includes.push("Recent incidents");proj.incidents=(data.incidents||[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).slice(0,12).map(i=>({date:i.date||"",type:i.type||"",severity:i.severity||""}))}
      if(scope.medAdherence){includes.push("Medication-adherence summary");const meds=getMedSchedule().medications;proj.medAdherence={count:meds.length,medications:meds.map(m=>({name:m.name||"",frequency:m.frequency||m.schedule||""}))}}
      if(scope.appointments){includes.push("Upcoming appointments");const today=new Date().toISOString().slice(0,10);proj.appointments=(data.appointments||[]).filter(a=>String(a.date||"")>=today).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).slice(0,12).map(a=>({date:a.date||"",title:a.title||a.type||"",provider:a.provider||""}))}
      if(scope.concerns){includes.push("Concerns you've flagged");proj.concerns=DOMAINS.map(d=>{const n=(data.domains&&data.domains[d.key]&&data.domains[d.key].notes)||"";return n?{area:d.label,note:String(n).slice(0,600)}:null}).filter(Boolean)}
    }
    return {projection:proj,manifest:{archetype:grant.archetype,includes,excludes:arch.excludes,grantId:grant.grantId}};
  };
  const parseEnrollment=(code)=>{
    let raw=String(code||"").trim(); if(!raw)throw new Error("Paste the program's enrollment code first.");
    let o; try{o=JSON.parse(raw)}catch{ try{o=JSON.parse(new TextDecoder().decode(b64dec(raw)))}catch{throw new Error("That doesn't look like a valid enrollment code.")} }
    if(!o||o.t!=="cg-enroll"||!o.pub||!o.arch||!GRANT_ARCHETYPES[o.arch])throw new Error("That enrollment code is missing or unsupported.");
    return {institution:o.inst||"A care program",archetype:o.arch,granteePub:o.pub,fingerprint:o.fp||"",defaultExpiresDays:o.exp||180,
      intake:(o.intake&&o.intake.base&&intakeBaseOk(o.intake.base))?{backend:o.intake.backend||"https",base:o.intake.base,claimToken:o.intake.claim||""}:null};
  };
  const sealAndExportGrant=async(grant)=>{
    const {projection,manifest}=buildGrantProjection(grant);
    const bundle=await sealGrantBundle(projection,manifest,b64dec(grant.granteePub),
      {grantId:grant.grantId,archetype:grant.archetype,institution:grant.institution,family:{name:(data.settings&&data.settings.clientName)||"Care recipient"},createdAt:grant.createdAt,expiresAt:grant.expiresAt});
    downloadFile(JSON.stringify(bundle),`care-share-${grant.archetype}-${grant.grantId}.cgshare`,"application/json");
    return bundle;
  };
  const sealPushCore=async(grant)=>{ // claims if needed, seals current projection, pushes; returns {transport,skipped}
    let t=grant.transport; const be=INTAKE_BACKENDS[t.backend]||INTAKE_BACKENDS.https;
    if(!intakeBaseOk(t.base))throw new Error("This program's intake address isn't secure (must use https) — nothing was sent.");
    if(!t.writeCap||!t.prefix){ const res=await be.claim({base:t.base,claimToken:t.claimToken,grantId:grant.grantId}); t={...t,prefix:res.prefix,writeCap:res.writeCap}; }
    const {projection,manifest}=buildGrantProjection(grant);
    const asOfMs=Date.now(); projection.asOf=new Date(asOfMs).toISOString();
    const bundle=await sealGrantBundle(projection,manifest,b64dec(grant.granteePub),{grantId:grant.grantId,archetype:grant.archetype,institution:grant.institution,family:{name:(data.settings&&data.settings.clientName)||"Care recipient"},createdAt:grant.createdAt,expiresAt:grant.expiresAt});
    const ct=JSON.stringify(bundle); const h=await intakeContentHash(ct);
    if(t.lastHash===h)return {transport:t,skipped:true};
    await be.push({base:t.base,prefix:t.prefix,writeCap:t.writeCap},intakeObjectName(asOfMs,bundle.pushNonce),ct);
    return {transport:{...t,lastHash:h},skipped:false};
  };
  const createGrant=async(enroll,scope,expiresAt,autoPush,setBusy)=>{
    if(!can("export-data")){flash("You don't have permission to share records.");return false}
    try{ if(setBusy)setBusy(true);
      const transport=enroll.intake?{backend:enroll.intake.backend,base:enroll.intake.base,claimToken:enroll.intake.claimToken,autoPush:!!autoPush}:null;
      let grant={grantId:"g-"+Math.random().toString(36).slice(2,9),archetype:enroll.archetype,institution:enroll.institution,granteePub:enroll.granteePub,granteeFingerprint:enroll.fingerprint,scope,createdAt:new Date().toISOString(),expiresAt,status:"active",lastPushAt:new Date().toISOString(),transport};
      let msg;
      if(transport&&autoPush){ const res=await sealPushCore(grant); grant={...grant,transport:res.transport}; msg="View granted and the first update sent to "+enroll.institution+"."; }
      else { await sealAndExportGrant(grant); msg="View granted. The sealed file downloaded — send it to "+enroll.institution+"."; }
      setData(p=>addLog({...p,grants:[...(p.grants||[]),grant]},"settings",`Granted ${enroll.archetype} view to ${enroll.institution}`));
      hipaaAudit("grant.created",`${enroll.archetype} view granted to ${enroll.institution}`,"grant");
      appendSharedAudit(grant,"grant.created","View granted: "+sharingCats(grant));
      flash(msg); return true;
    }catch(e){flash("Couldn't create the grant: "+e.message);return false}finally{if(setBusy)setBusy(false)}
  };
  const pushGrantLive=async(grant,setBusy)=>{
    if(!grant.transport){flash("This grant isn't set up for automatic sending.");return false}
    try{ if(setBusy)setBusy(true);
      const res=await sealPushCore(grant);
      setData(p=>addLog({...p,grants:(p.grants||[]).map(g=>g.grantId===grant.grantId?{...g,transport:res.transport,lastPushAt:new Date().toISOString()}:g)},"settings",`Sent update to ${grant.institution}`));
      hipaaAudit("grant.pushed",`Sent live update to ${grant.institution}`,"grant");
      if(!res.skipped)appendSharedAudit({...grant,transport:res.transport},"update.sent","Update sent: "+sharingCats(grant));
      flash(res.skipped?"No changes since the last update.":"Update sent to "+grant.institution+".");
      return true;
    }catch(e){flash("Couldn't send: "+e.message+" — your records weren't sent.");return false}finally{if(setBusy)setBusy(false)}
  };
  const pushAllAutoGrants=async()=>{ // best-effort, fired after a successful team sync
    const live=(data.grants||[]).filter(g=>grantActive(g)&&g.transport&&g.transport.autoPush);
    for(const g of live){ try{ const res=await sealPushCore(g); setData(p=>({...p,grants:(p.grants||[]).map(x=>x.grantId===g.grantId?{...x,transport:res.transport,lastPushAt:new Date().toISOString()}:x)})); hipaaAudit("grant.pushed",`Auto-sent update to ${g.institution}`,"grant"); if(!res.skipped)appendSharedAudit({...g,transport:res.transport},"update.sent","Update sent: "+sharingCats(g)); }catch(e){/* non-fatal: retries next sync */} }
  };
  const refreshGrant=async(grant,setBusy)=>{
    if(grant.transport&&grant.transport.autoPush)return pushGrantLive(grant,setBusy);
    try{ if(setBusy)setBusy(true);
      await sealAndExportGrant({...grant,createdAt:grant.createdAt,expiresAt:grant.expiresAt});
      setData(p=>({...p,grants:(p.grants||[]).map(g=>g.grantId===grant.grantId?{...g,lastPushAt:new Date().toISOString()}:g)}));
      hipaaAudit("grant.pushed",`Refreshed ${grant.archetype} view for ${grant.institution}`,"grant");
      appendSharedAudit(grant,"update.sent","Update prepared: "+sharingCats(grant));
      flash("Updated file downloaded — send it to "+grant.institution+".");
    }catch(e){flash("Couldn't refresh: "+e.message)}finally{if(setBusy)setBusy(false)}
  };
  const setGrantAutoPush=(grant,on)=>{ setData(p=>({...p,grants:(p.grants||[]).map(g=>g.grantId===grant.grantId?{...g,transport:{...g.transport,autoPush:on}}:g)})); appendSharedAudit(grant,"sharing.changed",on?"Automatic sending turned on":"Switched to manual sending"); flash(on?"Automatic sending on.":"Switched to manual — nothing sends until you choose."); };
  const revokeGrant=(grant)=>{
    setData(p=>addLog({...p,grants:(p.grants||[]).map(g=>g.grantId===grant.grantId?{...g,status:"revoked",revokedAt:new Date().toISOString()}:g)},"settings",`Stopped sharing ${grant.archetype} view with ${grant.institution}`));
    hipaaAudit("grant.revoked",`Stopped ${grant.archetype} view for ${grant.institution}`,"grant");
    appendSharedAudit(grant,"grant.revoked","Sharing stopped by the family");
    flash("Sharing stopped. No further updates will be produced.");
  };
  const grantActive=(g)=>g.status==="active"&&(!g.expiresAt||g.expiresAt.slice(0,10)>=new Date().toISOString().slice(0,10));
  const activeGrants=(data.grants||[]).filter(grantActive);
  // ── Reviewer mode (institution side). Holds one program keypair; exports enrollment codes; opens sealed
  // bundles with the private key and renders the scoped projection read-only. Same crypto as the family side.
  useEffect(()=>{ if(!reviewerMode)return;
    try{ if(localStorage.getItem(REVIEWER_VAULT_KEY)){ setReviewerLocked(true); return; } }catch{}
    // pre-vault installs kept the program key + read cap in plaintext — surface them for a one-time secure migration
    try{ const lp=localStorage.getItem(REVIEWER_KEY), li=localStorage.getItem("cg-reviewer-intake");
      if(lp||li){ setReviewerLegacy({program:lp?JSON.parse(lp):null,intake:li?JSON.parse(li):null}); } }catch{}
  },[reviewerMode]);
  // persist {program,intake} into the sealed vault, re-using this session's vault key (no re-prompt)
  const persistReviewerVault=async(program,intake)=>{
    const vp=reviewerVaultPassRef.current; if(!vp)return; // only when unlocked this session
    try{ const raw=localStorage.getItem(REVIEWER_VAULT_KEY); if(!raw)return; const v=await resealReviewerVault(JSON.parse(raw),vp,{program,intake}); localStorage.setItem(REVIEWER_VAULT_KEY,JSON.stringify(v)); }catch{}
  };
  const reviewerUnlock=async()=>{
    setReviewerErr("");
    try{ const raw=localStorage.getItem(REVIEWER_VAULT_KEY); if(!raw){setReviewerErr("No keystore on this device.");return}
      const { secrets, vaultPassB64 }=await openReviewerVault(JSON.parse(raw),reviewerUnlockPw);
      reviewerVaultPassRef.current=vaultPassB64; setReviewerProgram(secrets.program||null); setReviewerIntake(secrets.intake||null);
      setReviewerLocked(false); setReviewerUnlockPw("");
    }catch{ setReviewerErr("Incorrect passcode."); }
  };
  const reviewerUnlockWithPasskey=async()=>{
    setReviewerErr("");
    try{ const raw=localStorage.getItem(REVIEWER_VAULT_KEY); if(!raw)return; const v=JSON.parse(raw);
      if(!v.passkey){setReviewerErr("No passkey is set for this keystore.");return}
      if(!reviewerUnlockPw){setReviewerErr("Enter your passcode, then use the passkey.");return}
      const { prfOutput }=await mfaAssertPrf([v.passkey.credentialId], b64enc(REVIEWER_PRF_SALT));
      const { secrets, vaultPassB64 }=await openReviewerVaultWithPasskey(v,reviewerUnlockPw,prfOutput);
      reviewerVaultPassRef.current=vaultPassB64; setReviewerProgram(secrets.program||null); setReviewerIntake(secrets.intake||null);
      setReviewerLocked(false); setReviewerUnlockPw("");
    }catch(e){ setReviewerErr("Couldn't unlock with that passkey: "+(e&&e.message||e)); }
  };
  const reviewerLock=()=>{ // clear every secret from memory; only the sealed blob remains on disk
    reviewerVaultPassRef.current=null; setReviewerProgram(null); setReviewerIntake(null);
    setReviewerOpened(null); setReviewerShared(null); setReviewerRoster(null); setReviewerLocked(true);
  };
  const reviewerSecureLegacy=async()=>{
    setReviewerErr(""); if((reviewerNewPw||"").length<8){setReviewerErr("Use at least 8 characters.");return}
    try{ const { vault, vaultPassB64 }=await buildReviewerVault({program:reviewerLegacy.program,intake:reviewerLegacy.intake},reviewerNewPw);
      localStorage.setItem(REVIEWER_VAULT_KEY,JSON.stringify(vault));
      try{localStorage.removeItem(REVIEWER_KEY)}catch{} try{localStorage.removeItem("cg-reviewer-intake")}catch{} // delete the plaintext
      reviewerVaultPassRef.current=vaultPassB64; setReviewerProgram(reviewerLegacy.program||null); setReviewerIntake(reviewerLegacy.intake||null);
      setReviewerLegacy(null); setReviewerNewPw("");
    }catch(e){ setReviewerErr("Couldn't secure the keys: "+(e&&e.message||e)); }
  };
  const reviewerAddPasskey=async()=>{
    setReviewerErr("");
    try{ if(!webauthnAvailable()){setReviewerErr("This device doesn't support passkeys.");return}
      const pc=reviewerUnlockPw; if(!pc){setReviewerErr("Enter your passcode above first, then add the passkey.");return}
      const vp=reviewerVaultPassRef.current; if(!vp){setReviewerErr("Unlock the keystore first.");return}
      const raw=localStorage.getItem(REVIEWER_VAULT_KEY); if(!raw){setReviewerErr("No keystore on this device.");return}
      try{ await openReviewerVault(JSON.parse(raw),pc); }catch{ setReviewerErr("That passcode doesn't match your keystore."); return; } // ensure the wrap binds the REAL passcode
      const { credentialId, prfOutput }=await mfaRegisterPasskey(reviewerProgram?reviewerProgram.institution:"Care program", REVIEWER_PRF_SALT);
      const v=await addReviewerPasskeyWrap(JSON.parse(raw),vp,pc,credentialId,prfOutput);
      localStorage.setItem(REVIEWER_VAULT_KEY,JSON.stringify(v)); setReviewerUnlockPw("");
      flash("Passkey added — you can unlock with it next time.");
    }catch(e){ setReviewerErr("Couldn't add a passkey: "+(e&&e.message||e)); }
  };
  const reviewerForgetKeystore=()=>{ try{localStorage.removeItem(REVIEWER_VAULT_KEY)}catch{} reviewerVaultPassRef.current=null; setReviewerProgram(null); setReviewerIntake(null); setReviewerOpened(null); setReviewerShared(null); setReviewerRoster(null); setReviewerLocked(false); setReviewerLegacy(null); };
  const createProgramKeypair=async(institution,passcode)=>{
    setReviewerErr("");
    if((passcode||"").length<8){setReviewerErr("Choose a passcode of at least 8 characters to protect the program key.");return}
    try{ setReviewerBusy(true);
      const kp=await grantKeypair();
      const pubRaw=await grantExpPub(kp.publicKey);
      const privJwk=await crypto.subtle.exportKey("jwk",kp.privateKey);
      const program={institution:(institution||"").trim()||"Our care program",fingerprint:await grantFingerprint(pubRaw),pubB64:b64enc(pubRaw),privJwk};
      const { vault, vaultPassB64 }=await buildReviewerVault({program,intake:null},passcode); // sealed at rest from the moment it exists
      try{localStorage.setItem(REVIEWER_VAULT_KEY,JSON.stringify(vault))}catch{}
      reviewerVaultPassRef.current=vaultPassB64; setReviewerProgram(program); setReviewerNewPw(""); setReviewerLocked(false);
      flash("Program keys created and protected by your passcode. Share an enrollment code with families.");
    }catch(e){setReviewerErr("Couldn't create keys: "+(e&&e.message||e))}finally{setReviewerBusy(false)}
  };
  const reviewerEnrollmentCode=(archetype)=> reviewerProgram? b64enc(new TextEncoder().encode(JSON.stringify({t:"cg-enroll",inst:reviewerProgram.institution,arch:archetype,pub:reviewerProgram.pubB64,fp:reviewerProgram.fingerprint,exp:180}))) : "";
  const openReviewerBundle=async(text)=>{
    if(!reviewerProgram){flash("Create your program keys first.");return}
    try{ setReviewerBusy(true);
      let bundle; try{bundle=JSON.parse(String(text||"").trim())}catch{throw new Error("That's not a valid shared-view file.")}
      const priv=await crypto.subtle.importKey("jwk",reviewerProgram.privJwk,{name:"ECDH",namedCurve:"P-256"},false,["deriveBits"]);
      const projection=await openGrantBundle(bundle,priv);
      setReviewerOpened({projection,manifest:bundle.scopeManifest||{},bundle});
    }catch(e){flash("Couldn't open: "+e.message);setReviewerOpened(null)}finally{setReviewerBusy(false)}
  };
  const renderReviewerProjection=(p)=>{
    if(!p)return null;
    if(p.archetype==="reviewer"&&p.engagement){const e=p.engagement;return(<div className="rv-proj">
      <div className="rv-row"><span>Last active</span><strong>{e.lastActive}</strong></div>
      <div className="rv-row"><span>Backup in place</span><strong>{e.hasBackup?"Yes":"No"}</strong></div>
      <div className="rv-row"><span>Care team set up</span><strong>{e.hasTeam?"Yes":"No"}</strong></div>
      <h4 className="rv-h4">Care-plan health</h4>
      {Object.entries(e.domainHealth||{}).map(([k,v])=>(<div key={k} className="rv-row"><span>{k}</span><strong>{v}</strong></div>))}
    </div>);}
    return(<div className="rv-proj">
      {p.careStatus&&(<><h4 className="rv-h4">Care-plan status</h4>{p.careStatus.map((c,i)=>(<div key={i} className="rv-row"><span>{c.area}</span><strong>setup {c.setup}% · fresh {c.freshness}%</strong></div>))}</>)}
      {p.medAdherence&&(<><h4 className="rv-h4">Medications ({p.medAdherence.count})</h4>{p.medAdherence.medications.map((m,i)=>(<div key={i} className="rv-row"><span>{m.name}</span><strong>{m.frequency}</strong></div>))}</>)}
      {p.appointments&&(<><h4 className="rv-h4">Upcoming appointments</h4>{p.appointments.length?p.appointments.map((a,i)=>(<div key={i} className="rv-row"><span>{a.date} · {a.title}</span><strong>{a.provider}</strong></div>)):<div className="rv-empty">None.</div>}</>)}
      {p.incidents&&(<><h4 className="rv-h4">Recent incidents</h4>{p.incidents.length?p.incidents.map((x,i)=>(<div key={i} className="rv-row"><span>{x.date} · {x.type}</span><strong>{x.severity}</strong></div>)):<div className="rv-empty">None.</div>}</>)}
      {p.concerns&&(<><h4 className="rv-h4">Flagged concerns</h4>{p.concerns.length?p.concerns.map((c,i)=>(<div key={i} className="rv-concern"><strong>{c.area}</strong><div>{c.note}</div></div>)):<div className="rv-empty">None.</div>}</>)}
    </div>);
  };
  const saveReviewerIntake=(cfg)=>{ if(!intakeBaseOk(cfg&&cfg.base)){ flash("That intake address isn't secure — it must use https."); return; } setReviewerIntake(cfg); persistReviewerVault(reviewerProgram,cfg); flash("Intake connected."); };
  const reviewerListRoster=async()=>{
    if(!reviewerIntake){flash("Connect intake first.");return}
    try{ setReviewerRosterBusy(true);
      const be=INTAKE_BACKENDS[reviewerIntake.backend]||INTAKE_BACKENDS.https;
      const names=await be.list({base:reviewerIntake.base,readCap:reviewerIntake.readCap},reviewerIntake.rootPrefix||"");
      const groups={}; names.forEach(n=>{ if(n.indexOf("/audit/")>=0)return; const i=n.lastIndexOf("/");const dir=i>=0?n.slice(0,i+1):"";const file=i>=0?n.slice(i+1):n;(groups[dir]=groups[dir]||[]).push(file)}); // audit objects belong to their grant, surfaced via the shared-activity panel
      const roster=Object.entries(groups).map(([dir,files])=>{const latest=files.slice().sort().reverse()[0];const ts=parseInt((latest||"").split("-")[0],10);return {prefix:dir,latest:dir+latest,updated:isNaN(ts)?null:ts,count:files.length}}).sort((a,b)=>(b.updated||0)-(a.updated||0));
      setReviewerRoster(roster); if(!roster.length)flash("No shared views found yet.");
    }catch(e){flash("Couldn't list shared views: "+e.message)}finally{setReviewerRosterBusy(false)}
  };
  const reviewerOpenFromIntake=async(prefix)=>{
    try{ setReviewerBusy(true); setReviewerShared(null);
      const be=INTAKE_BACKENDS[reviewerIntake.backend]||INTAKE_BACKENDS.https;
      const names=(await be.list({base:reviewerIntake.base,readCap:reviewerIntake.readCap},prefix)).filter(n=>!n.slice(prefix.length).startsWith("audit/")).slice().sort().reverse(); // projection objects only
      const priv=await crypto.subtle.importKey("jwk",reviewerProgram.privJwk,{name:"ECDH",namedCurve:"P-256"},false,["deriveBits"]);
      let opened=false;
      for(const n of names){ try{ const ct=await be.get({base:reviewerIntake.base,readCap:reviewerIntake.readCap},n); if(!ct)continue; const bundle=JSON.parse(ct); const projection=await openGrantBundle(bundle,priv); setReviewerOpened({projection,manifest:bundle.scopeManifest||{},bundle}); opened=true; break; }catch{} }
      if(!opened){flash("No openable update found for this family (nothing sealed to this program's key).");return}
      reviewerLoadSharedChain(prefix,priv); // pull + verify the shared-activity record (best-effort)
    }catch(e){flash("Couldn't open: "+e.message)}finally{setReviewerBusy(false)}
  };
  // Layer 2: pull the family's shared-scope chain from {prefix}audit/, decrypt each entry, verify end-to-end,
  // and classify any break (tampering / interior gap / unconfirmed tail). Time gaps are inactivity, never flagged.
  const reviewerLoadSharedChain=async(prefix,priv)=>{
    try{
      const be=INTAKE_BACKENDS[reviewerIntake.backend]||INTAKE_BACKENDS.https;
      const pk=priv||await crypto.subtle.importKey("jwk",reviewerProgram.privJwk,{name:"ECDH",namedCurve:"P-256"},false,["deriveBits"]);
      const names=(await be.list({base:reviewerIntake.base,readCap:reviewerIntake.readCap},prefix+"audit/")).slice().sort();
      const entries=[];
      for(const n of names){ try{ const ct=await be.get({base:reviewerIntake.base,readCap:reviewerIntake.readCap},n); if(!ct)continue; const b=JSON.parse(ct); entries.push(await openGrantBundle(b,pk)); }catch{} }
      if(!entries.length){ setReviewerShared(null); return; }
      const status=await verifySharedChain(entries);
      setReviewerShared({entries:entries.sort((a,b)=>a.seq-b.seq),status});
    }catch{ setReviewerShared(null); }
  };
  const handleEncryptedImport=async(e)=>{if(clientScopedRef.current){flash("Sync and import aren't available in client sign-in.");e.target.value="";return}const file=(e.target.files&&e.target.files[0]);if(!file)return;try{const text=await file.text();if(rawTextTooLarge(text)){flash("This backup is too large to open safely.");e.target.value="";return}const json=JSON.parse(text);if(!json.encrypted){flash("Not an encrypted backup.");return}if(payloadHardTooLarge(json.data)){flash("This backup is too large to load safely ("+mb(b64Bytes(json.data))+" MB).");e.target.value="";return}const restored=await ingestBlobs(await decryptBackupFlexible(json.data,importPw),dekRef.current,rKeyRef.current);
    const auditBlock=restored._audit||null; if(restored._audit)delete restored._audit;
    const sharedBlock=restored._sharedAudit||null; if(restored._sharedAudit)delete restored._sharedAudit;
    // Validate and sanitize (M4)
    const validation=validateImportSchema(restored);
    if(!validation.valid){flash("Import rejected: "+validation.errors.join("; "));e.target.value="";return}
    const sanitized=sanitizeImportData(restored);
    const {merged, report}=mergeWithClock(data, sanitized);
    const sourceName=(sanitized.settings&&sanitized.settings.deviceName)||(sanitized.settings&&sanitized.settings.deviceId)||"unknown device";
    setMergePreview({merged,report,sourceName,auditBlock,sharedBlock,oversized:mergeIsOversized(json.data,report),floodBytes:b64Bytes(json.data)});
  }catch{flash("Import failed. Check passcode.")}e.target.value=""};
  const applyMerge=async()=>{if(!mergePreview)return;const r=mergePreview.report;const parts=[];if(r.added.length)parts.push(r.added.length+" added");if(r.updated.length)parts.push(r.updated.length+" updated");if(r.kept.length)parts.push(r.kept.length+" kept");if(r.conflicts&&r.conflicts.length)parts.push(r.conflicts.length+" flagged");setData(mergePreview.merged);if(mergePreview.auditBlock){const ar=await applyAuditMap(mergePreview.merged,mergePreview.auditBlock);if(ar.restored){await refreshAuditState();parts.push(ar.restored+" audit entries")}if(ar.archived){setData(ar.data);parts.push(ar.archived+" device log"+(ar.archived===1?"":"s")+" archived")}}if(mergePreview.sharedBlock){await restoreSharedAudit(mergePreview.sharedBlock)}flash("Merge complete: "+(parts.join(", ")||"no changes")+".");setMergePreview(null)};
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
      const recoveredAudit=(restored&&restored._audit)||null; if(restored&&restored._audit)delete restored._audit; // restored after the new audit key is derived
      const recoveredShared=(restored&&restored._sharedAudit)||null; if(restored&&restored._sharedAudit)delete restored._sharedAudit;
      const validation=validateImportSchema(restored);
      if(!validation.valid){setRecoveryErr("Backup could not be read: "+validation.errors.join("; "));e.target.value="";return}
      const sanitized=sanitizeImportData(restored);
      if(recoveredBlobs)sanitized.__recoveredBlobs=recoveredBlobs; // carried through to completeSetup, then stripped
      if(recoveredAudit)sanitized.__recoveredAudit=recoveredAudit; // carried through to completeSetup, restored under the new audit key
      if(recoveredShared)sanitized.__recoveredSharedAudit=recoveredShared;
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
      const exportData={...stripPortableSecrets(data),_sync:{...(data._sync||{}),exportedAt:new Date().toISOString(),exportedBy:(data.settings&&data.settings.deviceId),exportedByName:(data.settings&&data.settings.deviceName)||""}};
      const b64=await encryptData(await packageWithBlobs(exportData,dekRef.current,rKeyRef.current),pw);
      const payload=JSON.stringify({encrypted:true,version:"2.0",sync:true,data:b64});
      if(method==="clipboard"){
        await navigator.clipboard.writeText(payload);
        setSyncStatus({type:"success",msg:"Encrypted sync data copied to clipboard. Paste it in your team's group chat."});
      } else if(method==="share"&&hasWebShare){
        // iOS-friendly: the native share sheet lets the user save the encrypted file to iCloud Drive / Files,
        // or send it through Messages/Mail — the same channels teammates use to share the sync file back.
        try{
          const file=new File([payload],"care-sync-"+new Date().toISOString().slice(0,10)+".json",{type:"application/json"});
          await navigator.share({files:[file],title:"Care Guardian sync",text:"Encrypted Care Guardian sync file"});
          setSyncStatus({type:"success",msg:"Shared. Save it to your shared folder (iCloud Drive, Files), or send it to your team."});
        }catch(err){ if(err&&err.name==="AbortError"){setSyncStatus(null);} else { downloadFile(payload,"care-sync-"+new Date().toISOString().slice(0,10)+".json","application/json"); setSyncStatus({type:"success",msg:"Sync file downloaded to your device."}); } }
      } else {
        downloadFile(payload,"care-sync-"+new Date().toISOString().slice(0,10)+".json","application/json");
        setSyncStatus({type:"success",msg:isIOSDevice?"Sync file downloaded — find it in Files, then move it to your shared folder.":"Sync file downloaded. Drop it in your team's shared folder."});
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
    docCancelRef.current={cancelled:false,task:null,pagesDone:0,name:file.name};
    setDocProcessing(true);setDocResult(null);setDocMeds([]);setDocLabs([]);setDocMedsApplied(false);
    try {
      let rawText="";
      if (file.type==="application/pdf"||file.name.endsWith(".pdf")) {
        rawText=await extractPdfText(file,docCancelRef.current);
      } else {
        rawText=await file.text();
      }
      if (!rawText.trim()) { flash("No text could be extracted from this file. If it's a scanned image, the text will need to be entered manually.");setDocProcessing(false);e.target.value="";return; }
      const docType=detectDocType(rawText);
      const medications=parseMedications(rawText);
      const labs=parseLabResults(rawText);
      const sections=parseClinicalSections(rawText);
      const diagnoses=parseDiagnoses(rawText);
      const conclusions=parseConclusions(sections);
      setDocResult({rawText,docType,medications,labs,sections,diagnoses,conclusions,fileName:file.name});
      setDocMeds(medications.map((m,i)=>({...m,id:nextId()})));
      setDocLabs(labs.map((l,i)=>({...l,id:nextId()})));
    } catch(err) { const m=String((err&&err.message)||err);
      if(/PDF_CANCELLED/.test(m)){ setDocProcessing(false); docCancelRef.current=null; e.target.value=""; flash("Upload cancelled — nothing was read from that file."); return; }
      const slow=/PDF_TIMEOUT/.test(m), engine=/worker|dynamically imported module|importScripts|PDF reader/i.test(m);
      flash(slow?"This PDF is taking too long to read, so it was stopped rather than left hanging. Try a smaller file or fewer pages — the details can also be entered manually."
           :engine?"This PDF couldn't be opened because the PDF reader didn't load. Reload the page and try again — the details can also be entered manually."
           :"Error processing file: "+m); }
    setDocProcessing(false);docCancelRef.current=null;e.target.value="";
  };
  // Cancel an in-flight read (wrong file picked). Flips the token the extractor checks between pages and
  // destroys the pdf.js task so a long document stops immediately instead of finishing in the background.
  const cancelDocUpload=()=>{ const t=docCancelRef.current; if(!t)return; t.cancelled=true;
    try{ if(t.task&&t.task.destroy)t.task.destroy(); }catch(e){}
    setDocProcessing(false); setDocResult(null); setDocMeds([]); setDocLabs([]);
    flash("Upload cancelled — nothing was read from that file."); };

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

  // saveRawTextToNotes was removed: under the meds-and-tests-only policy, document text is never written to the vault.

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
  // ── Medication change log: every add / dose change / discontinue / reactivate, whether typed by a caregiver or
  // imported from a document. Kept separate from medSchedule.log, which records doses GIVEN, not the regimen itself.
  const medChangeEntry=(action,name,detail,source)=>({id:nextId(),ts:new Date().toISOString(),action,name,detail:detail||"",
    source:source||"manual",by:(data.settings&&data.settings.deviceName)||"This device"});
  const logMedChanges=(p,entries)=>({...p,medChanges:[...(entries||[]),...(p.medChanges||[])].slice(0,1000)});
  const setMedDiscontinued=(id,on,source,fileName)=>{ if(!can("med-admin"))return; setData(p=>{
      const ms={...(p.medSchedule||{medications:[],log:[]})};
      const m=(ms.medications||[]).find(x=>x.id===id); if(!m)return p;
      ms.medications=ms.medications.map(x=>x.id===id?{...x,discontinued:!!on,discontinuedDate:on?new Date().toISOString().slice(0,10):""}:x);
      hipaaAudit(on?"update":"update",(on?"Discontinued":"Reactivated")+" medication: "+m.name,"medications");
      const e=medChangeEntry(on?"discontinued":"reactivated",m.name,m.dosage||"",source);
      if(fileName)e.detail=(e.detail?e.detail+" · ":"")+"from "+fileName;
      return logMedChanges(addLog({...p,medSchedule:ms},"medadmin",(on?"Discontinued ":"Reactivated ")+m.name),[e]); }); };
  const addMedToSchedule=(med)=>{setData(p=>{const ms={...(p.medSchedule||{medications:[],log:[]})};ms.medications=[...ms.medications,{...med,id:nextId(),startDate:new Date().toISOString().slice(0,10)}];hipaaAudit("create","Added medication: "+med.name,"medications");p=logMedChanges(p,[medChangeEntry("added",med.name,med.dosage||"","manual")]);
    return addLog({...p,medSchedule:ms},"medadmin",`Added ${med.name} to schedule`)});setMedForm(null)};
  const editMedInSchedule=(med,id)=>{setData(p=>{const ms={...(p.medSchedule||{medications:[],log:[]})};const prev=(ms.medications||[]).find(m=>m.id===id);ms.medications=ms.medications.map(m=>m.id===id?{...m,...med}:m);let q={...p,medSchedule:ms};if(prev&&String(prev.dosage||"")!==String(med.dosage||""))q=logMedChanges(q,[medChangeEntry("dose-changed",med.name,(prev.dosage||"(none)")+" → "+(med.dosage||"(none)"),"manual")]);return q});setMedForm(null)};
  const removeMedFromSchedule=(id)=>{if(!can("med-admin"))return;setData(p=>{const ms={...(p.medSchedule||{medications:[],log:[]})};ms.medications=ms.medications.filter(m=>m.id!==id);ms.log=ms.log.filter(l=>l.medId!==id);return addLog({...p,medSchedule:ms},"medadmin","Removed medication from schedule")})};
  const toggleMedAdmin=(medId,slot,date)=>{
    setData(p=>{
      const ms={...(p.medSchedule||{medications:[],log:[]})};
      const logKey=`${medId}|${slot}|${date}`;
      const existing=ms.log.find(l=>l.key===logKey);
      // WHO gave the dose, and WHEN, recorded on every state change. Without this a second caregiver cannot tell
      // whether a dose was already administered — the exact circumstance that causes accidental double-dosing.
      const actor={by:(p.settings&&p.settings.deviceName)||"Unknown caregiver",
                   byId:(p.settings&&p.settings.deviceId)||"",
                   at:new Date().toISOString(),                 // sortable and comparable, unlike a locale string
                   timestamp:new Date().toLocaleString()};      // kept for display and older entries
      if(existing){
        // cycle: given → missed → refused → skipped → (clear). "Missed" means nobody gave it; "skipped" means a
        // caregiver deliberately withheld it, which is a clinical decision and carries a reason.
        const next={given:"missed",missed:"refused",refused:"skipped"}[existing.status];
        if(next)ms.log=ms.log.map(l=>l.key===logKey?{...l,status:next,...actor,reason:(next==="skipped"||next==="refused")?(l.reason||""):""}:l);
        else ms.log=ms.log.filter(l=>l.key!==logKey);
      } else {
        ms.log=[...ms.log,{key:logKey,medId,slot,date,status:"given",...actor}];
      }
      return{...p,medSchedule:ms};
    });
  };
  const getMedStatus=(medId,slot,date)=>{const logKey=`${medId}|${slot}|${date}`;return((getMedSchedule().log.find(l=>l.key===logKey))||{}).status||null};
  // The full record, so the grid can show who and when rather than just a tick.
  const getMedEntry=(medId,slot,date)=>getMedSchedule().log.find(l=>l.key===`${medId}|${slot}|${date}`)||null;
  const MED_SKIP_REASONS=["Held on clinical advice","Vitals out of range","Nil by mouth","Out of stock","Away from home","Patient asleep","Other"];
  const setMedReason=(medId,slot,date,reason)=>{ if(!can("med-admin"))return; const logKey=`${medId}|${slot}|${date}`;
    setData(p=>{ const ms={...(p.medSchedule||{medications:[],log:[]})};
      ms.log=(ms.log||[]).map(l=>l.key===logKey?{...l,reason}:l);
      return {...p,medSchedule:ms}; }); };
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
  const removePlanStep=(planIdx,stepIdx)=>{if(isClient)return;setData(p=>{const plans=[...(p.emergencyPlans||getPlans())];plans[planIdx]={...plans[planIdx],steps:plans[planIdx].steps.filter((_,i)=>i!==stepIdx)};return{...p,emergencyPlans:plans}})};

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
    Array.from(files).slice(0,MAX_ENTRY_PHOTOS).forEach(file=>{
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
            reminders.push({type:"med-missed",priority:1,icon:"❌",title:med.name+" — "+slot+" missed",sub:"Was due by "+range.end+":00",action:"medadmin",hub:"caremgmt"});
          } else if(curHour>=range.start){
            // Current window — due now
            reminders.push({type:"med-due",priority:2,icon:"💊",title:med.name+" — due now",sub:slot+" window ("+range.start+":00–"+range.end+":00)",action:"medadmin",hub:"caremgmt"});
          } else if(nextSlot&&nextSlot.name===slot&&nextSlot.inMinutes<=60){
            // Upcoming within the hour
            reminders.push({type:"med-upcoming",priority:3,icon:"⏰",title:med.name+" — "+slot+" in ~"+nextSlot.inMinutes+"min",sub:"Coming up soon",action:"medadmin",hub:"caremgmt"});
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
            reminders.push({type:"task-overdue",priority:2,icon:"🔴",title:sub.text.slice(0,60),sub:getDomLabel(dom.key)+" — "+Math.abs(daysUntilDue)+"d overdue (every "+interval+"d)",action:dom.key,hub:"caremgmt"});
          } else if(daysUntilDue<=7){
            reminders.push({type:"task-upcoming",priority:4,icon:"🟡",title:sub.text.slice(0,60),sub:getDomLabel(dom.key)+" — due in "+daysUntilDue+"d",action:dom.key,hub:"caremgmt"});
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
        reminders.push({type:"appt",priority:hoursUntil<=4?2:3,icon:"📅",title:appt.description||"Appointment",sub:timeLabel+(appt.location?" at "+appt.location:""),action:"calendar",hub:"caremgmt"});
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
  // ── Document → Medication Management. Changes are shown first and applied on one press: no re-typing, and no
  // silent edits to a medication record either — a parser misreading a dose must never rewrite the regimen unseen.
  const getDocMedChanges=()=>{
    if(!docResult)return {toAdd:[],toDiscontinue:[],toUpdate:[],unchanged:[]};
    const statuses=parseMedStatuses(docResult.rawText||"");
    return reconcileMedications(getMedSchedule(true).medications,docMeds,statuses);
  };
  const applyDocMedChanges=(plan)=>{
    if(!can("med-admin")){flash("You don't have permission to change medications.");return;}
    const fileName=(docResult&&docResult.fileName)||"document";
    const {toAdd=[],toDiscontinue=[],toUpdate=[]}=plan||{};
    if(!toAdd.length&&!toDiscontinue.length&&!toUpdate.length){flash("No medication changes to apply.");return;}
    setData(p=>{
      const ms={...(p.medSchedule||{medications:[],log:[]})}; ms.medications=[...(ms.medications||[])];
      const entries=[]; const today=new Date().toISOString().slice(0,10);
      for(const a of toAdd){ ms.medications.push({name:a.name,dosage:a.dosage,timeSlots:a.timeSlots,notes:a.notes,id:nextId(),startDate:today});
        entries.push(medChangeEntry("added",a.name,(a.dosage||"")+" · from "+fileName,"document")); }
      for(const d of toDiscontinue){ ms.medications=ms.medications.map(m=>m.id===d.id?{...m,discontinued:true,discontinuedDate:today}:m);
        entries.push(medChangeEntry("discontinued",d.name,(d.dosage||"")+" · from "+fileName,"document")); }
      for(const u of toUpdate){ ms.medications=ms.medications.map(m=>m.id===u.id?{...m,dosage:u.to}:m);
        entries.push(medChangeEntry("dose-changed",u.name,u.from+" → "+u.to+" · from "+fileName,"document")); }
      hipaaAudit("update","Applied "+entries.length+" medication change(s) from "+fileName,"medications");
      return logMedChanges(addLog({...p,medSchedule:ms},"medadmin","Applied "+entries.length+" medication change(s) from document"),entries);
    });
    setDocMedsApplied(true);
    flash(`${toAdd.length} added · ${toDiscontinue.length} discontinued · ${toUpdate.length} dose change(s) applied.`);
  };
  const saveDocToLibrary=(category)=>{
    if(!docResult)return;
    const doc={id:nextId(),fileName:docResult.fileName,category:category||docSaveCategory,docType:docResult.docType.key,date:new Date().toLocaleString(),
      medCount:docMeds.length,labCount:docLabs.length,
      // POLICY: only structured medication and test-result data is retained. The document's text is NOT stored —
      // not in full, not as an excerpt — so nothing is silently truncated and no clinical narrative sits in the vault.
      contentPolicy:"meds-labs-dx-only",
      medications:[...docMeds],
      labs:[...docLabs],
      diagnoses:[...(docResult.diagnoses||[])],
      conclusions:[...(docResult.conclusions||[])],
      dxCount:(docResult.diagnoses||[]).length,
    };
    setData(p=>addLog({...p,savedDocs:[doc,...(p.savedDocs||[])]},"documents",`Saved: ${doc.fileName}`));
    setDocCatFilter("all");
    flash(`Document "${doc.fileName}" saved to library.`);
  };
  const deleteDoc=(id)=>{setData(p=>({...p,savedDocs:(p.savedDocs||[]).filter(d=>d.id!==id)}))};
  const getFilteredDocs=()=>{const list=[...(data.savedDocs||[])];if(docCatFilter==="all")return list;return list.filter(d=>d.category===docCatFilter)};
  const [viewingDoc,setViewingDoc]=useState(null); // doc id to view
  const [circleUI,setCircleUI]=useState({mode:null,host:null,join:null,err:""}); // My Circle pairing flow (paste-based; QR camera ships next layer)

  /* ── nav ── */
  const toggle=(gi)=>setExpanded(p=>({...p,[gi]:!p[gi]}));
  const PHI_VIEWS={"incidents":"incidents","medadmin":"medications","contacts":"contacts","documents":"documents","selfreport":"self_reports","poa-decisions":"poa_decisions","capacity":"capacity","physical":"domains","cognitive":"domains","wellness":"domains","legal":"domains","financial":"domains","emergency-card":"emergency_info","binder":"care_plan","handoff":"shift_data"};
  // ── Area map: which of the three areas owns each view (drives breadcrumbs + bottom-bar highlight). nav() applies it, so stale setCurrentHub calls are harmless.
  const VIEW_AREA={"caremgmt-hub":"caremgmt",medadmin:"caremgmt",incidents:"caremgmt",calendar:"caremgmt",messages:"caremgmt",handoff:"caremgmt",emergency:"caremgmt","emergency-card":"caremgmt","caregiver-wellness":"caremgmt",physical:"caremgmt",cognitive:"caremgmt",wellness:"caremgmt",legal:"caremgmt",financial:"caremgmt",triggers:"caremgmt",tracking:"caremgmt",visit:"caremgmt","incident-patterns":"caremgmt","poa-decisions":"caremgmt",capacity:"caremgmt",binder:"caremgmt",postdeath:"caremgmt","docs-hub":"docs",selfreport:"docs",datashare:"docs",contacts:"docs",documents:"docs",program:"docs",expenses:"docs",settings:"settings",circle:"settings",sync:"settings",schedule:"settings",shifts:"settings",availability:"settings",help:"settings"};
  // ── Context-specific help: every view maps to a help topic. Content arrives later; the wiring is live now.
  const HELP_TOPICS={medadmin:"Medicine Management",incidents:"Incident Log",calendar:"Appointments & Calendar",messages:"Messages",handoff:"Shift Handoff",emergency:"Emergency Plans","emergency-card":"Emergency Info Card","caregiver-wellness":"Caregiver Check-in",physical:"Physical Health",cognitive:"Cognitive Health",wellness:"Wellness",legal:"Legal Safety",financial:"Financial Security",triggers:"Escalation Triggers",tracking:"Longitudinal Tracking",visit:"Visit Prep","incident-patterns":"Incident Patterns","poa-decisions":"POA Decisions",capacity:"Capacity Observations",binder:"Care Plan Binder",postdeath:"End-of-Life Planning",selfreport:"Self-Report",datashare:"Records In & Out",contacts:"Contacts",documents:"Documents",program:"Share with a Care Provider",expenses:"Expenses",circle:"My Circle",sync:"Sync",schedule:"Care Schedule",shifts:"Weekly Grid",availability:"My Availability",overview:"Overview"};
  const nav=(v)=>{if(VIEW_AREA[v])setCurrentHub(VIEW_AREA[v]);if(PHI_VIEWS[v]&&authed)hipaaAudit("view","Accessed "+v,PHI_VIEWS[v]);setNavStack(p=>[...p,{view,hub:currentHub}]);setView(v);setExpanded({});setEditNotes(false);setAddSubFor(null);cancelEdit();setContactForm(null);setContactDetail(null);setEditingDomain(null);setApptForm(null);setCalSelected(null);setDocResult(null);setDocMeds([]);setDocLabs([]);setIncidentForm(null);setExpenseForm(null);setMedForm(null);setViewingDoc(null)};
  const navHub=(hub)=>{setCurrentHub(hub);setView(hub==="settings"?"settings":hub+"-hub");setNavStack([]);setExpanded({})};
  const navBack=()=>{if(navStack.length>0){const prev=navStack[navStack.length-1];setNavStack(p=>p.slice(0,-1));setView(prev.view);setCurrentHub(prev.hub)}else{navHub(currentHub)}};
  // ── My Circle: device/caregiver circle sharing one symmetric key. Crypto proven in circle-*-test.mjs; transport/sync arrives next layer. ──
  const circleOf=()=>(data.settings&&data.settings.circle)||null;
  const circleDeviceId=()=>(data.settings&&data.settings.circle&&data.settings.circle.deviceId)||(data.settings&&data.settings.deviceId)||"this-device";
  const ensureDeviceKey=async()=>{ let dk=data.settings&&data.settings.deviceKey; if(dk&&dk.pub)return dk; dk=await circleNewDeviceKey(); setData(p=>({...p,settings:{...p.settings,deviceKey:dk}})); return dk; };
  const circleCreate=async()=>{ const dk=await ensureDeviceKey(); const key=circleNewKey(); const id="circle-"+b64enc(crypto.getRandomValues(new Uint8Array(6))).replace(/[^a-zA-Z0-9]/g,"").slice(0,8); const me={deviceId:circleDeviceId(),pub:dk.pub,label:(data.settings&&data.settings.deviceName)||"This device",addedAt:new Date().toISOString()}; setData(p=>({...p,settings:{...p.settings,circle:{id,key,epoch:0,createdAt:new Date().toISOString()}},circleRoster:[me]})); setCircleUI({mode:null,host:null,join:null,err:""}); flash("Circle created on this device. Add your other devices to keep them in sync."); };
  const circleLeave=()=>{ setData(p=>({...p,settings:{...p.settings,circle:null},circleRoster:[]})); setCircleUI({mode:null,host:null,join:null,err:""}); flash("Left the circle on this device. Your records stay here; re-pair to sync again."); };
  const circleHostRespond=async(payloadStr)=>{ try{ const p=JSON.parse((payloadStr||"").trim()); const c=circleOf(); if(!c||!p.eph)throw 0; const res=await circlePairRespondA(c.key,p.eph); const roster=(data.circleRoster||[]); const nextRoster=roster.some(r=>r.deviceId===p.id)?roster:[...roster,{deviceId:p.id,pub:p.dev,label:p.label||"New device",addedAt:new Date().toISOString()}]; let relayCfg=null; if(c.relay&&c.relay.adminToken){ try{ const ctr=await fetch(_ib(c.relay.base)+"/admin/claim-token",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":c.relay.adminToken},body:JSON.stringify({prefix:"circle/"+c.id+"/"+p.id+"/"})}); if(ctr.ok){ const j=await ctr.json(); relayCfg={base:c.relay.base,claimToken:j.token,readCap:c.relay.readCap}; } }catch(e){} } const qr2={v:1,eApub:res.eApub,salt:res.salt,wrap:res.wrap,circleId:c.id,epoch:c.epoch,roster:nextRoster,relay:relayCfg}; setData(d=>({...d,circleRoster:nextRoster})); setCircleUI(u=>({...u,host:{qr2:JSON.stringify(qr2),sas:res.sas,pending:p.label||"New device"},err:""})); }catch(e){ setCircleUI(u=>({...u,err:"That pairing code couldn't be read — paste the joining device's code."})); } };
  const circleJoinStart=async()=>{ const dk=await ensureDeviceKey(); const eph=await circlePairStartB(); const qr1={v:1,eph:eph.pub,dev:dk.pub,id:circleDeviceId(),label:(data.settings&&data.settings.deviceName)||"This device"}; setCircleUI({mode:"join",join:{ephJwk:eph.ephJwk,ephPub:eph.pub,qr1:JSON.stringify(qr1)},host:null,err:""}); };
  const circleJoinComplete=async(qr2Str)=>{ try{ const j=circleUI.join; const p=JSON.parse((qr2Str||"").trim()); const res=await circlePairCompleteB(j.ephJwk,j.ephPub,p.eApub,p.salt,p.wrap); if(!res.ok)throw 0; let relay=null; if(p.relay&&p.relay.base&&p.relay.claimToken){ try{ const claimed=await INTAKE_BACKENDS.https.claim({base:p.relay.base,claimToken:p.relay.claimToken,grantId:circleDeviceId()}); relay={base:p.relay.base,prefix:claimed.prefix,writeCap:claimed.writeCap,readCap:p.relay.readCap}; }catch(e){} } setData(d=>({...d,settings:{...d.settings,circle:{id:p.circleId,key:res.circleKey,epoch:p.epoch,relay,createdAt:new Date().toISOString()}},circleRoster:p.roster||[]})); setCircleUI(u=>({...u,join:{...j,done:true,sas:res.sas},err:""})); flash("Joined the circle. Confirm the 6-digit code matches the other device."); }catch(e){ setCircleUI(u=>({...u,err:"Couldn't join with that code — paste the existing device's response."})); } };
  const circleConnectRelay=async(base,adminToken)=>{ const c=circleOf(); if(!c){flash("Create a circle first.");return;} base=(base||"").trim(); if(!intakeBaseOk(base)){flash("Relay address must use https (or localhost for testing).");return;} try{ const ctr=await fetch(_ib(base)+"/admin/claim-token",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":(adminToken||"").trim()},body:JSON.stringify({prefix:"circle/"+c.id+"/"+circleDeviceId()+"/"})}); if(!ctr.ok)throw 0; const ctj=await ctr.json(); const claimed=await INTAKE_BACKENDS.https.claim({base,claimToken:ctj.token,grantId:circleDeviceId()}); const rcr=await fetch(_ib(base)+"/admin/read-cap",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":(adminToken||"").trim()},body:JSON.stringify({prefix:"circle/"+c.id+"/"})}); if(!rcr.ok)throw 0; const rcj=await rcr.json(); const relay={base,prefix:claimed.prefix,writeCap:claimed.writeCap,readCap:rcj.readCap,adminToken:(adminToken||"").trim()}; setData(d=>({...d,settings:{...d.settings,circle:{...d.settings.circle,relay}}})); flash("Relay connected. You can sync this circle now."); }catch(e){ flash("Couldn't connect the relay — check the address and admin token."); } };
  const _mintCap=async(base,adminToken,prefix,kind)=>{ const r=await fetch(_ib(base)+"/admin/"+(kind==="read"?"read-cap":"claim-token"),{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":adminToken},body:JSON.stringify({prefix})}); if(!r.ok)throw new Error("mint "+r.status); return r.json(); };
  const _revoke=async(base,adminToken,prefix)=>{ try{ await fetch(_ib(base)+"/admin/revoke",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":adminToken},body:JSON.stringify({prefix})}); }catch(e){} };
  // Cancel a pending remote invite / not-yet-joined device: revoke its write prefix (server-enforced — it can no longer claim or write), drop the placeholder slot. NOTE: if the code AND passphrase both leaked, also Rotate the key, since the bundle carried the current key.
  const circleCancelPending=async(deviceId,inviteId)=>{ const c=circleOf(); if(!c||!c.relay||!c.relay.adminToken){flash("Only the circle's main device can cancel an invite.");return;} const base=c.relay.base, admin=c.relay.adminToken; await _revoke(base,admin,"circle/"+c.id+"/"+deviceId+"/"); if(inviteId)await _revoke(base,admin,"circle/"+c.id+"/invite/"+inviteId+"/"); setData(d=>({...d,circleRoster:(d.circleRoster||[]).filter(x=>x.deviceId!==deviceId)})); setCircleUI(u=>(u.remote&&u.remote.assignedId===deviceId?{...u,remote:null}:u)); flash("Invite cancelled — that device can no longer join or write to the circle."); };
  // Remote invite (co-caregiver not present): wrap the circle key + relay caps under a GENERATED passphrase, stash on the relay behind a one-time read code. Two channels: code + passphrase.
  const circleRemoteInvite=async()=>{ const c=circleOf(); if(!c){flash("Create a circle first.");return;} if(!c.relay||!c.relay.adminToken){flash("Connect a relay first, then you can invite a remote caregiver.");return;} try{ const pass=circlePassphrase(6); const rid=()=>b64enc(crypto.getRandomValues(new Uint8Array(5))).replace(/[^a-zA-Z0-9]/g,"").slice(0,8); const assignedId="dev-remote-"+rid(); const inviteId="inv-"+rid(); const base=c.relay.base, admin=c.relay.adminToken;
    const jct=await _mintCap(base,admin,"circle/"+c.id+"/"+assignedId+"/","claim");
    const expiresAt=Date.now()+CIRCLE_INVITE_TTL_MS;
    const bundle={circleKey:c.key,circleId:c.id,epoch:c.epoch||0,roster:(data.circleRoster||[]),assignedDeviceId:assignedId,expiresAt,relay:{base,claimToken:jct.token,readCap:c.relay.readCap}};
    const env=await circleRemoteSeal(JSON.stringify(bundle),pass);
    const ict=await _mintCap(base,admin,"circle/"+c.id+"/invite/"+inviteId+"/","claim"); const iwc=await INTAKE_BACKENDS.https.claim({base,claimToken:ict.token,grantId:inviteId});
    await INTAKE_BACKENDS.https.push({base,prefix:iwc.prefix,writeCap:iwc.writeCap},"blob",JSON.stringify(env));
    const irc=await _mintCap(base,admin,"circle/"+c.id+"/invite/"+inviteId+"/","read");
    const code=b64enc(new TextEncoder().encode(JSON.stringify({base,circleId:c.id,inviteId,readCap:irc.readCap})));
    setData(d=>({...d,circleRoster:[...(d.circleRoster||[]),{deviceId:assignedId,pub:"",label:"Remote caregiver (pending)",addedAt:new Date().toISOString(),pending:true}]}));
    setCircleUI(u=>({...u,remote:{code,pass,assignedId,inviteId,expiresAt}})); }catch(e){ setCircleUI(u=>({...u,err:"Couldn't create the remote invite — check the relay connection."})); } };
  const circleRemoteJoin=async(codeStr,pass)=>{ try{ const dec=JSON.parse(new TextDecoder().decode(b64dec((codeStr||"").trim()))); const env=JSON.parse(await INTAKE_BACKENDS.https.get({base:dec.base,readCap:dec.readCap},"circle/"+dec.circleId+"/invite/"+dec.inviteId+"/blob")); let bundleStr; try{ bundleStr=await circleRemoteOpen(env,(pass||"").trim()); }catch(e){ setCircleUI(u=>({...u,err:"That passphrase didn't unlock the invite. Check the words and spacing."})); return; } const bundle=JSON.parse(bundleStr); if(circleInviteExpired(bundle)){ setCircleUI(u=>({...u,err:"This invite has expired. Ask your circle's main device for a new one."})); return; } const dk=await ensureDeviceKey(); const claimed=await INTAKE_BACKENDS.https.claim({base:bundle.relay.base,claimToken:bundle.relay.claimToken,grantId:bundle.assignedDeviceId}); const relay={base:bundle.relay.base,prefix:claimed.prefix,writeCap:claimed.writeCap,readCap:bundle.relay.readCap}; const me={deviceId:bundle.assignedDeviceId,pub:dk.pub,label:(data.settings&&data.settings.deviceName)||"My device",addedAt:new Date().toISOString()}; const roster=circleMergeRoster((bundle.roster||[]).filter(r=>r.deviceId!==bundle.assignedDeviceId),[me]); setData(d=>({...d,settings:{...d.settings,circle:{id:bundle.circleId,key:bundle.circleKey,epoch:bundle.epoch,deviceId:bundle.assignedDeviceId,relay,createdAt:new Date().toISOString()}},circleRoster:roster})); setCircleUI({mode:null,host:null,join:null,err:"",remoteJoined:true}); flash("Joined the circle remotely. Press Sync now to exchange records."); }catch(e){ setCircleUI(u=>({...u,err:"Couldn't join with that code — check the invite code and that the relay is reachable."})); } };
  const circleIsAdmin=()=>{ const c=circleOf(); return !!(c&&c.relay&&c.relay.adminToken); };
  const circleRotateNow=async(removeDeviceId)=>{ const c=circleOf(); if(!c)return; if(!c.relay||!c.relay.adminToken){flash("Only the circle's main device can rotate the key.");return;} if(removeDeviceId===circleDeviceId()){flash("Can't remove the device you're using.");return;} const dk=await ensureDeviceKey(); const roster=(data.circleRoster||[]).filter(r=>!removeDeviceId||r.deviceId!==removeDeviceId); try{ const newKey=circleNewKey(); const epoch=(c.epoch||0)+1; const rotObj=await circleRotate(newKey,epoch,roster.map(r=>({deviceId:r.deviceId,pub:r.pub}))); const ctr=await fetch(_ib(c.relay.base)+"/admin/claim-token",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":c.relay.adminToken},body:JSON.stringify({prefix:"circle/"+c.id+"/rotation/"})}); if(!ctr.ok)throw 0; const ctj=await ctr.json(); const claimed=await INTAKE_BACKENDS.https.claim({base:c.relay.base,claimToken:ctj.token,grantId:circleDeviceId()}); await INTAKE_BACKENDS.https.push({base:c.relay.base,prefix:claimed.prefix,writeCap:claimed.writeCap},"latest",JSON.stringify(rotObj)); if(removeDeviceId){ try{ await fetch(_ib(c.relay.base)+"/admin/revoke",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":c.relay.adminToken},body:JSON.stringify({prefix:"circle/"+c.id+"/"+removeDeviceId+"/"})}); }catch(e){} } setData(d=>({...d,settings:{...d.settings,circle:{...d.settings.circle,key:newKey,epoch}},circleRoster:roster})); flash(removeDeviceId?"Device removed and the circle key rotated — it can no longer receive updates.":"Circle key rotated."); }catch(e){ flash("Couldn't rotate the key — check the relay connection."); } };
  const circleSyncNow=async()=>{ const c=circleOf(); if(!c)return; if(!c.relay){flash("Connect a relay first to sync across the circle.");return;} try{ let curKey=c.key, curEpoch=c.epoch||0;
    const rot=await circleRotationFetch(c.relay,c.id); if(rot&&(rot.epoch||0)>curEpoch){ const dk=await ensureDeviceKey(); try{ curKey=await circleRotationOpen(rot,circleDeviceId(),dk.jwkPriv); curEpoch=rot.epoch; }catch(removed){ flash("This device was removed from the circle. Your records stay here; re-pair to rejoin."); setData(d=>({...d,settings:{...d.settings,circle:null},circleRoster:[]})); setCircleUI({mode:null,host:null,join:null,err:""}); return; } }
    const payload={...stripPortableSecrets(data),_audit:buildAuditMap(await getAuditBackup(false))}; const sealed=await circleSealState(payload,curKey); await circleSyncPush(c.relay,sealed); const blobs=await circleSyncPull(c.relay,c.id,circleDeviceId()); let cur=data,n=0,auditRestored=0; for(const b of blobs){ try{ const remote=await circleOpenState(b,curKey); const rAudit=remote._audit; delete remote._audit; const {merged}=mergeWithClock(cur,remote); cur={...merged,circleRoster:circleMergeRoster(merged.circleRoster,remote.circleRoster)}; if(rAudit){ const ar=await applyAuditMap(cur,rAudit); cur=ar.data; auditRestored+=ar.restored; } n++; }catch(e){} }
    cur={...cur,settings:{...cur.settings,deviceKey:data.settings.deviceKey,circle:{...((cur.settings&&cur.settings.circle)||{}),id:c.id,key:curKey,relay:c.relay,epoch:curEpoch}},_sync:{...(cur._sync||{}),lastSync:new Date().toISOString()}}; setData(cur); if(auditRestored)await refreshAuditState(); flash((curEpoch>(c.epoch||0)?"Picked up a new circle key. ":"")+"Circle synced — "+n+" other device"+(n===1?"":"s")+" merged."); }catch(e){ flash("Circle sync couldn't reach the relay."); } };
  const isHubView=view.endsWith("-hub")||view==="settings";
  const getViewTitle=()=>{const t={"caremgmt-hub":"Care Management","docs-hub":"Documents & Data","datashare":"Records In & Out",physical:"Physical health",cognitive:"Cognitive health",wellness:"Wellness",legal:"Legal safety",financial:"Financial security",incidents:"Incidents",medadmin:"Medication admin",expenses:"Expenses",calendar:"Calendar",contacts:"Contacts",documents:"Documents",shifts:"Shifts",triggers:"Escalation triggers",tracking:"Tracking",visit:"Visit prep",emergency:"Emergency plans",postdeath:"After death",messages:"Messages",sync:"Sync",selfreport:"Self-report",settings:"Settings",help:"Help",overview:"Overview",handoff:"Shift Handoff","emergency-card":"Emergency Card","caregiver-wellness":"Caregiver Check-in","incident-patterns":"Incident Patterns",capacity:"Capacity Observations",binder:"Care Plan Binder","poa-decisions":"POA Decisions",schedule:"Care Schedule",availability:"My Availability","circle":"My Circle"};return t[view]||"Care Guardian"};
  const getBreadcrumb=()=>{const h={caremgmt:"Care Management",docs:"Documents & Data",settings:"Settings"};if(isHubView)return null;return h[currentHub]||null};

  // Universal search
  const SEARCH_FEATURES=[
    {label:"Medications",hub:"caremgmt",view:"medadmin",icon:"💊",keywords:"medication med admin drug pill prescription"},
    {label:"Incidents",hub:"caremgmt",view:"incidents",icon:"⚠",keywords:"incident fall behavior wandering medication error accident"},
    {label:"Incident Patterns",hub:"caremgmt",view:"incident-patterns",icon:"📊",keywords:"pattern trend chart graph analysis time"},
    {label:"Expenses",hub:"docs",view:"expenses",icon:"$",keywords:"expense cost money payment receipt"},
    {label:"Documents",hub:"docs",view:"documents",icon:"📄",keywords:"document scan pdf lab result upload library"},
    {label:"Contacts",hub:"docs",view:"contacts",icon:"☷",keywords:"contact phone email doctor nurse lawyer provider"},
    {label:"Calendar",hub:"caremgmt",view:"calendar",icon:"▦",keywords:"calendar appointment schedule date"},
    {label:"Care Schedule",hub:"settings",view:"schedule",icon:"🗓",keywords:"schedule shift open swap claim visit clock availability roster assignment"},
    {label:"Shifts",hub:"settings",view:"shifts",icon:"👥",keywords:"shift schedule caregiver aide worker weekly grid"},
    {label:"Messages",hub:"caremgmt",view:"messages",icon:"✉",keywords:"message chat text communication team"},
    {label:"Self-Reports",hub:"docs",view:"selfreport",icon:"🗣",keywords:"self report mood pain sleep voice concern"},
    {label:"Sync",hub:"settings",view:"sync",icon:"📡",keywords:"sync backup export import cloud server team invite"},
    {label:"Settings",hub:"settings",view:"settings",icon:"⚙",keywords:"settings passcode password state region tab order device"},{label:"Records In & Out",hub:"docs",view:"datashare",icon:"📤",keywords:"import export share fhir pdf status bring records"},{label:"My Circle",hub:"settings",view:"circle",icon:"🔗",keywords:"circle devices multi-device pair sync remote"},{label:"Share with Care Provider",hub:"docs",view:"program",icon:"🤝",keywords:"program provider navigator grant consent share"},{label:"My Availability",hub:"settings",view:"availability",icon:"🕐",keywords:"availability schedule when shifts"},
    {label:"Help",hub:"settings",view:"help",icon:"?",keywords:"help guide how to feature"},
    {label:"Physical Health",hub:"caremgmt",view:"physical",icon:"♥",keywords:"physical health mobility fall nutrition dental vision sleep"},
    {label:"Cognitive Health",hub:"caremgmt",view:"cognitive",icon:"◐",keywords:"cognitive memory assessment routine behavior orientation"},
    {label:"Wellness",hub:"caremgmt",view:"wellness",icon:"✿",keywords:"wellness emotional social activity engagement respite"},
    {label:"Legal Safety",hub:"caremgmt",view:"legal",icon:"⚖",keywords:"legal poa power attorney advance directive hipaa guardianship"},
    {label:"Financial Security",hub:"caremgmt",view:"financial",icon:"◈",keywords:"financial medicaid benefit insurance asset spend down"},
    {label:"Escalation Triggers",hub:"caremgmt",view:"triggers",icon:"📊",keywords:"trigger escalation transition warning condition monitor"},
    {label:"Tracking",hub:"caremgmt",view:"tracking",icon:"📈",keywords:"tracking longitudinal snapshot history trend progress"},
    {label:"Visit Prep",hub:"caremgmt",view:"visit",icon:"📋",keywords:"visit prep doctor appointment provider summary"},
    {label:"Emergency Plans",hub:"caremgmt",view:"emergency",icon:"🚨",keywords:"emergency plan fall choking wandering agitation"},
    {label:"POA Decisions",hub:"caremgmt",view:"poa-decisions",icon:"⚖",keywords:"poa power attorney decision medical financial legal guardian agent fiduciary"},
    {label:"Capacity Observations",hub:"caremgmt",view:"capacity",icon:"📝",keywords:"capacity observation ability assessment functional decline"},
    {label:"Care Plan Binder",hub:"caremgmt",view:"binder",icon:"📖",keywords:"binder care plan printable comprehensive document"},
    {label:"Shift Handoff",hub:"caremgmt",view:"handoff",icon:"📋",keywords:"handoff shift change summary incoming outgoing"},
    {label:"Emergency Card",hub:"caremgmt",view:"emergency-card",icon:"🆔",keywords:"emergency card wallet id printable diagnoses medications"},
    ...(SHOW_CAREGIVER_CHECKIN?[{label:"Caregiver Check-in",hub:"caremgmt",view:"caregiver-wellness",icon:"💛",keywords:"caregiver wellness burnout stress sleep respite self care"}]:[]),
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
        results.data.push({type:"incident",icon:"⚠",title:i.type+" — "+i.severity,sub:(i.description||"").slice(0,80),date:i.date,hub:"caremgmt",view:"incidents",id:i.id});
    });

    // Search contacts
    (data.contacts||[]).forEach(c=>{
      if((c.name||"").toLowerCase().includes(ql)||(c.role||"").toLowerCase().includes(ql)||(c.organization||"").toLowerCase().includes(ql))
        results.data.push({type:"contact",icon:"☷",title:c.name,sub:c.role||c.category||"",hub:"docs",view:"contacts",id:c.id});
    });

    // Search documents
    (data.savedDocs||[]).forEach(d=>{
      const name=(d.fileName||d.category||"Document");
      if(name.toLowerCase().includes(ql)||(d.rawText||"").toLowerCase().includes(ql))
        results.data.push({type:"document",icon:"📄",title:name,sub:d.category||"",hub:"docs",view:"documents",id:d.id});
    });

    // Search medications
    getMedSchedule(true).medications.forEach(m=>{
      if((m.name||"").toLowerCase().includes(ql)||(m.dosage||"").toLowerCase().includes(ql))
        results.data.push({type:"medication",icon:"💊",title:m.name+(m.dosage?" "+m.dosage:""),sub:m.discontinued?"Discontinued":"Active",hub:"caremgmt",view:"medadmin",id:m.id});
    });

    // Search messages
    (data.messages||[]).slice(0,50).forEach(m=>{
      if((m.text||"").toLowerCase().includes(ql)||(m.from||"").toLowerCase().includes(ql))
        results.data.push({type:"message",icon:"✉",title:m.from||"",sub:(m.text||"").slice(0,80),date:m.timestamp,hub:"caremgmt",view:"messages",id:m.id});
    });

    // Search POA decisions
    (data.poaDecisions||[]).forEach(d=>{
      if((d.description||"").toLowerCase().includes(ql)||(d.type||"").toLowerCase().includes(ql)||(d.reasoning||"").toLowerCase().includes(ql))
        results.data.push({type:"poa",icon:"⚖",title:(d.type||"Decision")+": "+(d.description||"").slice(0,60),sub:d.date,hub:"caremgmt",view:"poa-decisions",id:d.id});
    });

    // Search expenses
    (data.expenses||[]).forEach(e=>{
      if((e.description||"").toLowerCase().includes(ql)||(e.payee||"").toLowerCase().includes(ql)||(e.category||"").toLowerCase().includes(ql))
        results.data.push({type:"expense",icon:"$",title:e.description||"Expense",sub:"$"+(e.amount||0)+" — "+e.date,hub:"docs",view:"expenses",id:e.id});
    });

    // Search self-reports
    (data.selfReports||[]).slice(0,30).forEach(r=>{
      if((r.text||"").toLowerCase().includes(ql)||(r.mood||"").toLowerCase().includes(ql))
        results.data.push({type:"self-report",icon:"🗣",title:(r.mood||r.type||"Report"),sub:(r.text||"").slice(0,80),date:r.timestamp,hub:"docs",view:"selfreport",id:r.id});
    });

    return results;
  };
  const persistAuditTipToVault=()=>{ const t=auditTipRef.current; if(t&&t.seq){ setData(p=>((p.settings&&p.settings.auditTip&&p.settings.auditTip.seq>=t.seq)?p:{...p,settings:{...p.settings,auditTip:{seq:t.seq,hash:t.hash}}})); } };
  const lock=()=>{persistAuditTipToVault();if(rKeyRef.current&&!clientScopedRef.current){try{writeProjection(data,rKeyRef.current)}catch{}}hipaaAudit("logout","Session locked","");dekRef.current=null;backupPassRef.current="";auditKeyRef.current=null;rKeyRef.current=null;clientScopedRef.current=false;_scopedWriteLock=false;setClientScoped(false);_mediaCache.clear();setAuditEntries([]);setSyncPasscode("");setAuthed(false);setAuthMode(null);setPc("");navHub("today")};

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
          try{ backupPassRef.current=await deriveBackupPass(cgPw); }catch(e){}
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
    // Client passcode is always single-factor (the care recipient is not a professional role). A SCOPED client
    // wrap only ever yields DEK_R (the projection), so it's always safe; a full-DEK client wrap is honored ONLY
    // when MFA is off, so it can never become a single-factor bypass of the caregiver's passkey.
    if(vault.wk.r && (vault.wk.clientScope==="r" || !mfaOn)){ try{
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
    // Prepare the backup key from the passcode the user just typed, so exports need no second secret and a
    // restore on any device works from the passcode they already know.
    try{ backupPassRef.current=await deriveBackupPass(pc); }catch(e){}
    _scopedWriteLock=false;clientScopedRef.current=false;setClientScoped(false);
    const loaded=await loadVaultV4(dek);
    if(!loaded){setDataLossDetected(true);return false} // every slot failed to decrypt → treat as data loss
    dekRef.current=dek;
    seqRef.current=loaded.maxSeq;
    lastCkptSeqRef.current=loaded.baseSeq;
    ckptSlotRef.current=loaded.baseSlot==="snapB"?"snapA":"snapB";
    prevPersistedRef.current=loaded.state;
    try{const aKey=await deriveAuditKey(pc);auditKeyRef.current=aKey;const aKeyLegacy=await deriveAuditKey(pc,KDF_ITER_LEGACY);const entries=await readAuditLog([aKey,aKeyLegacy],500);setAuditEntries(entries);const cnt=await getAuditCount();setAuditCount(cnt);const si=await getStorageEstimate();setStorageInfo(si);const chained=entries.filter(e=>typeof e.seq==="number"&&e.hash);if(chained.length){const last=chained.sort((a,b)=>a.seq-b.seq)[chained.length-1];auditTipRef.current={seq:last.seq,hash:last.hash}}const cs=await verifyAuditChain(entries,(loaded.state.settings&&loaded.state.settings.auditTip)||null);setAuditChainStatus(cs);if(cs.status==="ok"&&cs.tip)saveAuditTip(cs.tip.seq,cs.tip.hash);await loadSharedTips(aKey);}catch(e){console.error("Audit key derivation failed:",e)}
    // Retroactively honour the meds-and-tests-only policy: purge document text kept by older builds.
    if(loaded.state.savedDocs&&loaded.state.savedDocs.some(d=>d&&(d.rawText||d.summary||d.sections))){
      loaded.state.savedDocs=loaded.state.savedDocs.map(d=>{const{rawText,summary,sections,...keep}=d||{};return{...keep,contentPolicy:keep.contentPolicy||"meds-labs-only"}});
    }
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
    if(_oauthReturn){ const ret=_oauthReturn; _oauthReturn=null; setTimeout(()=>{cloudCompleteAuth(ret)},0); } // finish a cloud connection that redirected through OAuth
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
    const newWk={mfaKeys:[{credentialId:p.credentialId, ps:p.cMfa.ps, hs:p.cMfa.hs, blob:p.cMfa.blob}], cRecovery:p.cRecovery, ...mfaCarryClientWrap(ko.wk)}; // drop passcode-only caregiver wrap AND any full-DEK client wrap; only a scoped client wrap survives
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
      saveWrappedKeys({mfaKeys:list, ...(k2.wk.cRecovery?{cRecovery:k2.wk.cRecovery}:{}), ...mfaCarryClientWrap(k2.wk)}, {...k2.mfa, enabled:true});
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
    saveWrappedKeys({mfaKeys:entries, ...mfaCarryClientWrap(ko.wk)}, {...ko.mfa, enabled:true}); // no cRecovery; only a scoped client wrap carried forward
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
    const recoveredAudit=seedData.__recoveredAudit||null; if(seedData.__recoveredAudit)delete seedData.__recoveredAudit;
    const recoveredShared=seedData.__recoveredSharedAudit||null; if(seedData.__recoveredSharedAudit)delete seedData.__recoveredSharedAudit;
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
    dekRef.current=dek;rKeyRef.current=rKey;
    // A NEW user's backup key was never prepared: the derivation lived only in tryAuth (the returning-user path).
    // So getBackupPasscode() threw for anyone still in first-run setup — which is exactly where the onboarding
    // backup buttons live, and why "Download a copy now" appeared to do nothing at all.
    try{ backupPassRef.current=await deriveBackupPass(setupCgPw); }catch(e){}
    setData(seedData);setAuthed(true);setAuthMode("caregiver");
    setSetupMode(false);setDataLossDetected(false);
    try{ auditKeyRef.current=await deriveAuditKey(setupCgPw); auditTipRef.current={seq:0,hash:""}; // audit works immediately after setup
      if(recoveredAudit){const ar=await applyAuditMap(seedData,recoveredAudit,auditKeyRef.current); if(ar.archived){try{await saveVaultData(await encryptWithDEK(ar.data,dek));setData(ar.data)}catch{}}} // restore this device's chain; archive any foreign device chains
      if(recoveredShared)await restoreSharedAudit(recoveredShared,auditKeyRef.current); // restore the shared-scope chains
      await refreshAuditState(); // sets the tip from restored entries so the chain continues
      await loadSharedTips(auditKeyRef.current);
    }catch{}
    if(recoveryData){hipaaAudit("create","Vault restored from backup after data loss","all");setRecoveryData(null)}
    else{setShowFirstWin(true);setShowStorageChoice(true)} // fresh setup → personalize, then choose where records live
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
      <div style={{fontSize:"2.375rem",marginBottom:10}}>⚠️</div>
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
      <div style={{fontSize:"2.375rem",marginBottom:10}}>♻️</div>
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

  // Reviewer mode (institution side) — bypasses family setup/lock entirely
  if(reviewerMode) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="rv-wrap">
      <div className="rv-head"><h1 className="page-title" style={{margin:0}}>🩺 Care program — reviewer</h1>
        <div style={{display:"flex",gap:".4rem"}}>
          {reviewerProgram&&!reviewerLocked&&<button className="rv-exit" onClick={reviewerLock}>Lock</button>}
          <button className="rv-exit" onClick={()=>{reviewerVaultPassRef.current=null;setReviewerProgram(null);setReviewerIntake(null);setReviewerOpened(null);setReviewerShared(null);setReviewerRoster(null);try{localStorage.removeItem("cg-reviewer-mode")}catch{} setReviewerMode(false)}}>Exit</button>
        </div></div>
      {reviewerLocked?(
        <div className="rv-card">
          <h3 className="sec-title">Unlock your keystore</h3>
          <p className="hint">Your program key and intake connection are encrypted on this device. Enter your passcode to unlock them for this session.</p>
          <input className="grant-date" type="password" value={reviewerUnlockPw} onChange={e=>{setReviewerUnlockPw(e.target.value);setReviewerErr("")}} placeholder="Reviewer passcode" onKeyDown={e=>{if(e.key==="Enter")reviewerUnlock()}}/>
          {reviewerErr&&<p className="rv-err">{reviewerErr}</p>}
          <div className="rv-actions"><button className="save-btn" onClick={reviewerUnlock}>Unlock</button>
            {(()=>{try{const v=localStorage.getItem(REVIEWER_VAULT_KEY);return!!(v&&JSON.parse(v).passkey)}catch{return false}})()&&webauthnAvailable()&&<button className="rv-ghost" onClick={reviewerUnlockWithPasskey}>Unlock with passkey</button>}</div>
          <p className="hint" style={{marginTop:".6rem"}}>Forgot it? Encrypted keys can't be recovered — you can <button className="rv-link" onClick={()=>{if(confirm("Discard the encrypted keys and start a new program key? Families would need to re-enroll."))reviewerForgetKeystore()}}>start a new program key</button> (families re-enroll).</p>
        </div>
      ):reviewerLegacy?(
        <div className="rv-card">
          <h3 className="sec-title">Secure your program keys</h3>
          <p className="hint">Your program key{reviewerLegacy.intake?" and intake connection were":" was"} stored on this device <strong>without a passcode</strong>. Set one now to encrypt {reviewerLegacy.intake?"them":"it"} at rest — on a shared computer this matters, because this key opens every enrolled family's shared view.</p>
          <input className="grant-date" type="password" value={reviewerNewPw} onChange={e=>{setReviewerNewPw(e.target.value);setReviewerErr("")}} placeholder="Choose a reviewer passcode (8+ characters)" onKeyDown={e=>{if(e.key==="Enter")reviewerSecureLegacy()}}/>
          {reviewerErr&&<p className="rv-err">{reviewerErr}</p>}
          <button className="save-btn" onClick={reviewerSecureLegacy}>Encrypt my keys</button>
        </div>
      ):!reviewerProgram?(
        <div className="rv-card">
          <h3 className="sec-title">Set up your program keys</h3>
          <p className="hint">Create one keypair for your program. Families use your enrollment code to grant a scoped view; only your private key can open what they send. Your passcode encrypts that key on this device.</p>
          <input className="grant-date" id="rv-inst" placeholder="Program name (e.g., Willamette Vital Health)"/>
          <input className="grant-date" type="password" value={reviewerNewPw} onChange={e=>{setReviewerNewPw(e.target.value);setReviewerErr("")}} placeholder="Choose a reviewer passcode (8+ characters)" style={{marginTop:".5rem"}}/>
          {reviewerErr&&<p className="rv-err">{reviewerErr}</p>}
          <button className="save-btn" disabled={reviewerBusy} onClick={()=>{const v=document.getElementById("rv-inst");createProgramKeypair(v&&v.value,reviewerNewPw)}}>{reviewerBusy?"Creating…":"Create program keys"}</button>
        </div>
      ):(<>
        <div className="rv-card">
          <h3 className="sec-title">Device security</h3>
          <p className="hint">Your program key and intake connection are encrypted on this device with your passcode. Use <strong>Lock</strong> (top right) when you step away — it clears the keys from memory until you re-enter the passcode.{webauthnAvailable()?" You can also add a passkey as a second factor on this device.":""}</p>
          {webauthnAvailable()&&<details className="rv-details"><summary>Add a passkey to this device</summary>
            <p className="hint">Re-enter your passcode, then register a passkey (Face ID, Windows Hello, or a security key). Afterward you can unlock with the passkey — it still requires your passcode too, so neither factor alone is enough.</p>
            <input className="grant-date" type="password" value={reviewerUnlockPw} onChange={e=>{setReviewerUnlockPw(e.target.value);setReviewerErr("")}} placeholder="Your passcode"/>
            {reviewerErr&&<p className="rv-err">{reviewerErr}</p>}
            <button className="save-btn" onClick={reviewerAddPasskey}>Register passkey</button>
          </details>}
        </div>
        <div className="rv-card">
          <h3 className="sec-title">Your enrollment codes</h3>
          <p className="hint"><strong>{reviewerProgram.institution}</strong> · fingerprint <strong>{reviewerProgram.fingerprint}</strong> — print this fingerprint on enrollment paperwork so families can verify it.</p>
          {["navigator","reviewer"].map(a=>(<div key={a} className="rv-enroll">
            <div className="rv-enroll-h">{GRANT_ARCHETYPES[a].label} code</div>
            <textarea className="grant-ta" readOnly rows={3} value={reviewerEnrollmentCode(a)} onClick={e=>e.target.select()}/>
            <button className="edit-btn" style={{marginTop:6}} onClick={()=>{try{navigator.clipboard&&navigator.clipboard.writeText(reviewerEnrollmentCode(a))}catch{} flash("Copied "+GRANT_ARCHETYPES[a].label+" code.")}}>Copy</button>
          </div>))}
        </div>
        <div className="rv-card">
          <h3 className="sec-title">Connected intake {reviewerIntake&&<span className="rv-conn">● connected</span>}</h3>
          {!reviewerIntake?(<>
            <p className="hint">Connect your program's intake storage to pull families' updates automatically. Your read credential stays on this device. The storage holds ciphertext only — nothing opens without your program key.</p>
            <select className="grant-date" id="ri-be" defaultValue="https"><option value="https">HTTPS intake endpoint</option><option value="presigned">Presigned object storage</option></select>
            <input className="grant-date" id="ri-base" placeholder="Intake base URL (e.g., https://intake.wvh.org)"/>
            <input className="grant-date" id="ri-cap" placeholder="Read credential"/>
            <input className="grant-date" id="ri-prefix" placeholder="Root prefix (optional, e.g., fam/)"/>
            <button className="save-btn" onClick={()=>{const be=(document.getElementById("ri-be")||{}).value;const base=(document.getElementById("ri-base")||{}).value;const readCap=(document.getElementById("ri-cap")||{}).value;const rootPrefix=(document.getElementById("ri-prefix")||{}).value;if(!base||!readCap){flash("Enter the intake URL and read credential.");return}saveReviewerIntake({backend:be,base,readCap,rootPrefix})}}>Connect intake</button>
          </>):(<>
            <p className="hint"><strong>{reviewerIntake.base}</strong> · {(INTAKE_BACKENDS[reviewerIntake.backend]||INTAKE_BACKENDS.https).label}</p>
            <div className="rv-actions"><button className="save-btn" disabled={reviewerRosterBusy} style={{marginTop:0}} onClick={reviewerListRoster}>{reviewerRosterBusy?"Loading…":"↻ Refresh shared views"}</button>
              <button className="rv-exit" onClick={()=>{setReviewerIntake(null);setReviewerRoster(null);persistReviewerVault(reviewerProgram,null)}}>Disconnect</button></div>
            {reviewerRoster&&(reviewerRoster.length?<div className="rv-roster">{reviewerRoster.map(r=>(
              <div key={r.prefix} className="rv-rrow"><div className="rv-ravatar">👤</div>
                <div className="rv-rmain"><strong>{r.prefix}</strong><div className={"rv-rmeta"+(r.updated&&(Date.now()-r.updated>7*864e5)?" stale":"")}>{r.updated?"Updated "+new Date(r.updated).toLocaleDateString():"—"} · {r.count} update{r.count===1?"":"s"}</div></div>
                <button className="rv-ropen" disabled={reviewerBusy} onClick={()=>reviewerOpenFromIntake(r.prefix)}>Open ›</button></div>
            ))}</div>:<div className="rv-empty">No shared views found yet.</div>)}
          </>)}
        </div>
        <div className="rv-card">
          <h3 className="sec-title">Open a shared view</h3>
          <p className="hint">Paste a family's shared-view file (.cgshare). It decrypts here with your private key — nothing is uploaded.</p>
          <textarea className="grant-ta" id="rv-bundle" rows={4} placeholder="Paste shared-view file…"/>
          <button className="save-btn" disabled={reviewerBusy} onClick={()=>{const v=document.getElementById("rv-bundle");openReviewerBundle(v&&v.value)}}>{reviewerBusy?"Opening…":"Open view"}</button>
        </div>
        {reviewerOpened&&(<div className="rv-card rv-view">
          <h3 className="sec-title">{reviewerOpened.projection.care} — {(GRANT_ARCHETYPES[reviewerOpened.projection.archetype]||GRANT_ARCHETYPES.navigator).label} view</h3>
          <p className="rv-asof">As of {new Date(reviewerOpened.projection.asOf).toLocaleString()} · seeing: {(reviewerOpened.manifest.includes||[]).join(", ")||"—"}</p>
          {renderReviewerProjection(reviewerOpened.projection)}
          <p className="rv-excl">Not shared: {(reviewerOpened.manifest.excludes||[]).join("; ")||"—"}</p>
        </div>)}
        {reviewerShared&&(<div className="rv-card rv-shared">
          <div className="rv-shared-head"><h3 className="sec-title" style={{margin:0}}>Shared-activity record</h3>{(()=>{const map={ok:["✓ Verified","ok"],tampered:["⚠ Tampering detected","bad"],gap:["⚠ Missing entry","bad"],truncated:["• Unconfirmed tail","warn"],none:["—","warn"]};const m=map[reviewerShared.status.status]||["—","warn"];return <span className={"rv-chip rv-chip-"+m[1]}>{m[0]}</span>})()}</div>
          <p className="hint">{(()=>{const s=reviewerShared.status;if(s.status==="ok")return "Every shared event is present and the chain verifies end-to-end ("+s.count+" events). This is a complete record of what this family shared with you — and only that.";if(s.status==="gap")return "Sequence "+s.missingSeq+" is missing — a record was deleted or a push never arrived. A missing sequence number is a definitive compliance gap.";if(s.status==="tampered")return "An entry was altered at sequence "+s.brokenAtSeq+" — the record does not verify.";if(s.status==="truncated")return "Received through "+s.have+" of "+s.expected+" — the most recent events haven't arrived yet (not a deletion).";return "No shared activity recorded yet.";})()}</p>
          <div className="rv-timeline">{reviewerShared.entries.map(e=>(<div key={e.seq} className="rv-tl-row"><span className="rv-tl-seq">#{e.seq}</span><div className="rv-tl-main"><strong>{e.summary}</strong><div className="rv-tl-meta">{new Date(e.ts).toLocaleString()} · {e.type}</div></div></div>))}</div>
        </div>)}
      </>)}
      {settingsMsg&&<div className={"rv-flash"+((settingsMsg&&settingsMsg.bad)?" rv-flash-bad":"")}>{(settingsMsg&&settingsMsg.t)||settingsMsg}</div>}
    </div>
  </>);

  // First-run onboarding wizard
  if(setupMode){
    const isStandalone=(typeof window!=="undefined")&&((window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true);
    const isIOS=(typeof navigator!=="undefined")&&(/iphone|ipad|ipod/i.test(navigator.userAgent)||(/Mac/.test(navigator.userAgent)&&navigator.maxTouchPoints>1));
    // Browser family is still worth knowing (Firefox cannot install web apps at all), but we no longer use it to
    // DESCRIBE a menu. Whether an install option exists depends on browser, version, platform and whether the
    // page met installability criteria at that moment — none of which we can see. We only act on the prompt the
    // browser actually hands us.
    const _ua=(typeof navigator!=="undefined")?navigator.userAgent:"";
    const isFirefox=/firefox|fxios/i.test(_ua);
    const isChromium=/chrome|chromium|edg/i.test(_ua)&&!isIOS&&!isFirefox;
    const isDesktopSafari=/safari/i.test(_ua)&&!isChromium&&!isFirefox&&!isIOS;
    // Skip the install step entirely when it has nothing to offer: already installed, or the browser has already
    // guaranteed persistent storage. A screen that asks for work the user doesn't need to do is worse than no
    // screen — it teaches people that our warnings can be ignored.
    const step=(onbStep===1&&(isStandalone||persistState==="granted"))?2:onbStep;
    const Dots=()=>(<div className="onb-dots">{[0,1,2].map(i=>(<span key={i} className={`onb-dot ${i===step?"onb-dot-on":""} ${i<step?"onb-dot-done":""}`}/>))}</div>);
    return(<>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div className="auth-wrap"><div className="auth-card onb-card">
        {step===0&&(<>
          <div className="onb-emoji">🛡️</div>
          <h1 className="auth-title">Your family's privacy comes first</h1>
          <p className="onb-body">No readable data ever leaves your device, and nothing leaves at all unless you choose where it goes. Care Guardian has no servers and can never see your records. You can keep everything on this device alone, or save an encrypted copy to storage you own — your choice, and you can change it later.</p>
          <button onClick={()=>setOnbStep(isStandalone?2:1)} className="auth-btn">Get started</button>
          <Dots/>
        </>)}

        {step===1&&(<>
          {/* This screen used to claim that "your data is totally private, so your browser might clear it" — which
              is a non-sequitur (privacy isn't why browsers evict storage) and implied that saving a bookmark is what
              protects records. It then gave Chrome-specific menu instructions that don't match what most people see.
              What actually protects the data is navigator.storage.persist(), which the app ALREADY requests during
              setup. So: check the real state first, say something true about it, and only ask for manual work when
              the browser actually withheld the guarantee. */}
          <div className="onb-emoji">{persistState==="granted"?"🛡":"📲"}</div>
          {persistState==="granted"?(<>
            <h1 className="auth-title">Your records are protected</h1>
            <p className="onb-body">This browser has agreed to keep Care Guardian's data in <strong>persistent storage</strong>, so it won't be cleared to free up space. Nothing else is needed.</p>
            <p className="onb-body" style={{fontSize:"0.9375rem"}}>Adding Care Guardian to your home screen is still worth doing — it opens full-screen like an app and is quicker to reach in a hurry — but your records are safe either way.</p>
          </>):(<>
            <h1 className="auth-title">Keep your records safe</h1>
            <p className="onb-body">Browsers sometimes clear stored data when a device runs low on space. Care Guardian has asked this browser to protect its data permanently, and it hasn't granted that yet — <strong>installing the app is what usually convinces it</strong>.</p>
          </>)}

          {/* The one reliable path: the browser's own install prompt. If we have it, use it — no instructions to
              get wrong. Everything else is a genuine fallback. */}
          {canInstall()?(
            <button onClick={async()=>{await installApp();const ok=await requestPersistentStorage();setPersistState(ok?"granted":"denied");setOnbStep(2)}} className="auth-btn">Add to my home screen</button>
          ):isIOS?(<div className="onb-install">
            {/* iOS is the ONE case where instructions are safe to give: Safari's share sheet is consistent, and
                there is no install API to use instead. */}
            <div className="onb-step"><span className="onb-num">1</span><span>Tap the <strong>Share</strong> button in Safari's toolbar:</span></div>
            <div className="onb-share"><svg viewBox="0 0 50 56" width="34" height="38" aria-hidden="true"><path d="M25 3 L25 34" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"/><path d="M16 13 L25 3.5 L34 13" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 21 H9 a3 3 0 0 0 -3 3 V49 a3 3 0 0 0 3 3 H41 a3 3 0 0 0 3 -3 V24 a3 3 0 0 0 -3 -3 H37" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="onb-share-label">the square with an up-arrow</span></div>
            <div className="onb-step"><span className="onb-num">2</span><span>Scroll down and tap <strong>Add to Home Screen</strong>.</span></div>
          </div>):(
            /* NO INSTRUCTIONS. Previous versions told the user to look in "your browser's menu" for Install or
               Add to Home Screen, and claimed some browsers show an icon in the address bar. Those menus differ by
               browser, version and platform, and when the browser has not offered an install prompt the option
               frequently is not there at all — so the app was sending people to look for something that does not
               exist. We only claim what we can observe: whether the browser offered us a prompt, and whether it
               has granted persistent storage. */
            <p className="onb-body" style={{fontSize:"0.95rem"}}>{persistState==="granted"
              ? "This browser hasn't offered an install option for Care Guardian. That's fine — your records are already in protected storage and nothing more is needed."
              : "This browser hasn't offered an install option, and hasn't granted protected storage yet. Your records still work and stay on this device — the reliable safeguard is a backup file, which the next step sets up."}</p>
          )}
          <div className="onb-nav">
            {!canInstall()&&<button onClick={async()=>{const ok=await requestPersistentStorage();setPersistState(ok?"granted":"denied");setOnbStep(2)}} className="auth-btn">Continue</button>}
            {persistState!=="granted"&&<button onClick={()=>setOnbStep(2)} className="text-btn">Skip for now</button>}
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
      <button className="rv-entry-link" onClick={()=>{try{localStorage.setItem("cg-reviewer-mode","1")}catch{} setReviewerMode(true)}}>Setting up for a care program? Open reviewer mode →</button>
      </div></div>
    </>);
  }

  // Sync lock check
  if(authed&&checkSyncLock()&&!syncLocked){setSyncLocked(true)}
  if(authed&&syncLocked) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card" style={{maxWidth:400}}>
      <div style={{fontSize:"2.375rem",marginBottom:10}}>📡</div>
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
      <div style={{fontSize:"2.375rem",marginBottom:10}}>🔐</div>
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
      <div style={{fontSize:"2.375rem",marginBottom:10}}>🛡</div>
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
      <div className="cf-grid">
        <label className="cf-label">Length<select value={f.durationMin||60} onChange={e=>upd("durationMin",Number(e.target.value))} className="cf-input">
          {[15,30,45,60,90,120,180].map(n=><option key={n} value={n}>{n<60?n+" min":(n/60)+" hour"+(n>60?"s":"")}</option>)}</select></label>
        <label className="cf-label">Location<input value={f.location||""} onChange={e=>upd("location",e.target.value)} className="cf-input" placeholder="Clinic, address"/></label>
      </div>
      {/* Picking the provider fills in where and how to reach them. Caregivers shouldn't retype a clinic name and
          phone number they already saved once — and at the appointment, the phone number is what they actually need. */}
      <label className="cf-label" style={{marginTop:12}}>Who are you seeing?
        <select className="cf-input" value={f.contactId||""} onChange={e=>{const c=(data.contacts||[]).find(x=>String(x.id)===e.target.value);
          setF(p=>({...p,contactId:e.target.value||"",
            location:(c&&c.org)?c.org:(p.location||""),
            title:(p.title||"").trim()?p.title:(c?((c.role?c.role+" — ":"")+c.name):p.title)}))}}>
          <option value="">Not linked to a contact</option>
          {(data.contacts||[]).map(c=>(<option key={c.id} value={c.id}>{c.name}{c.role?" — "+c.role:""}{c.org?" ("+c.org+")":""}</option>))}
        </select></label>
      {(()=>{ const c=(data.contacts||[]).find(x=>String(x.id)===String(f.contactId)); if(!c) return null;
        return (<p className="hint" style={{marginTop:4}}>{c.org?c.org+" · ":""}{c.phone||"no phone saved"} — shown on the appointment so you can call from there.</p>); })()}

      <label className="cf-label" style={{marginTop:12}}>Calendar title <span className="hint" style={{fontWeight:400}}>— what your phone calendar shows</span>
        <input value={f.calTitle||""} onChange={e=>upd("calTitle",e.target.value)} className="cf-input" placeholder={f.title?("e.g. Appointment (instead of \u201C"+f.title+"\u201D)"):"e.g. Appointment"}/></label>
      <p className="hint" style={{marginTop:4}}>Leave this blank to use the real title. Set it when the calendar is shared — a phone calendar can show a diagnosis to anyone who glances at it.</p>
      <label className="cf-label" style={{marginTop:12,marginBottom:12}}>Notes<textarea value={f.notes} onChange={e=>upd("notes",e.target.value)} className="notes-ta" rows={2}/></label>
      <div className="cf-actions">
        <button disabled={!f.title.trim()||!f.date} onClick={()=>saveAppt(f,apptForm.id)} className="save-btn" style={{opacity:f.title.trim()&&f.date?1:.4}}>Save</button>
        {apptForm.mode==="edit"&&can("export-data")&&<button onClick={()=>exportAppointmentIcs({...f,id:apptForm.id})} className="cancel-btn">Add to my calendar</button>}
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
        <button onClick={()=>incidentPhotoRef.current&&incidentPhotoRef.current.click()} type="button" className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem"}}>📷 Add photo{incPhotos.length>0?" ("+incPhotos.length+")":""}</button>
        <input ref={incidentPhotoRef} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>handlePhotoCapture(e,setIncPhotos)}/>
        {incPhotos.length>0&&<button onClick={()=>setIncPhotos([])} type="button" className="cancel-btn" style={{fontSize:"0.9375rem",padding:"4px 10px"}}>Clear</button>}
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

  const MedFormUI=()=>{const[f,setF]=useState(medForm.med);const[drugQ,setDrugQ]=useState(null);const picks=drugQ===null?[]:drugSearch(drugQ,6);const chk=drugValidateDose(f.name,f.dosage);const toggleSlot=(s)=>setF(p=>({...p,timeSlots:p.timeSlots.includes(s)?p.timeSlots.filter(x=>x!==s):[...p.timeSlots,s]}));return(
    <div className="cf-overlay" onClick={()=>setMedForm(null)}><div className="cf-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
      <h2 className="cf-title">{medForm.mode==="edit"?"Edit Medication":"Add Medication to Schedule"}</h2>
      <label className="cf-label" style={{marginBottom:4}}>Medication Name<input value={f.name} onChange={e=>{setF(p=>({...p,name:e.target.value,rxName:""}));setDrugQ(e.target.value)}} onBlur={()=>setTimeout(()=>setDrugQ(null),150)} className="cf-input" placeholder="Start typing — e.g. donep…" autoComplete="off"/></label>
      {picks.length>0&&(<div className="drug-suggest">{picks.map(({drug,via})=>(
        <button key={drug.n} className="drug-opt" onMouseDown={e=>e.preventDefault()} onClick={()=>{setF(p=>({...p,name:drug.n,rxName:drug.n}));setDrugQ(null)}}>
          <span className="drug-opt-name">{drug.n}</span>
          {via&&<span className="drug-opt-brand">matched “{via}”</span>}
          <span className="drug-opt-str">{(drug.s||[]).slice(0,4).join(" · ")}{(drug.s||[]).length>4?" …":""}</span>
        </button>))}</div>)}
      <label className="cf-label" style={{marginBottom:4}}>Dosage<input value={f.dosage} onChange={e=>setF(p=>({...p,dosage:e.target.value}))} className="cf-input" placeholder="e.g. 10 mg"/></label>
      {chk.drug&&(chk.drug.s||[]).length>0&&(<div className="drug-strengths">
        <span className="hint">Strengths {chk.drug.n} comes in — tap to fill:</span>
        <div className="drug-str-row">{chk.drug.s.map(st=>(<button key={st} className={"drug-str"+(drugNormStrength(st)===drugNormStrength(f.dosage)?" drug-str-on":"")} onClick={()=>setF(p=>({...p,dosage:st}))}>{st}</button>))}</div>
      </div>)}
      {chk.status==="match"&&<p className="drug-ok">✓ {f.dosage} is a strength {chk.drug.n} is made in.</p>}
      {chk.status==="unknown-strength"&&(<p className="drug-warn">{chk.half
        ? "That looks like half of a "+(chk.known.find(x=>Math.abs(parseFloat(drugNormStrength(x))/2-parseFloat(drugNormStrength(f.dosage)))<1e-6)||"")+" tablet, which is common. Worth a check against the bottle."
        : "This isn’t a strength we have listed for "+chk.drug.n+". That can be right — split tablets, compounded doses and newer products all exist — so check the label and keep it if it matches."}</p>)}
      {chk.status==="unknown-strength"&&<p className="hint" style={{marginTop:2}}>Saving is not blocked. Record what was actually prescribed.</p>}
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
      <label className="cf-label">Invite code<input value={joinCode} onChange={e=>setJoinCode(e.target.value)} className="cf-input" placeholder="Paste the code from your team member" style={{fontFamily:"monospace",fontSize:"0.9375rem"}}/></label>
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

  // Navigation order is fixed by the redesign (the customizable Tab Order was deprecated).
  const orderedTabs=TABS;
  const roleTabs=getVisibleTabs();
  const visibleTabs=orderedTabs.filter(t=>t.key!=="postdeath"&&roleTabs.some(rt=>rt.key===t.key));

  // First Win — personalize before the dashboard appears (fresh setup only)
  // ── Where should these records live? (Phase 2) ──
  if(authed&&showStorageChoice&&!showFirstWin) return(<>
    <style dangerouslySetInnerHTML={{__html:CSS}}/>
    <div className="auth-wrap"><div className="auth-card onb-card">
      {!storageChoice&&(<>
        <div className="onb-emoji">🗄️</div>
        <h1 className="auth-title">Where should these records live?</h1>
        <p className="onb-body">Whatever you pick, the records are encrypted on this device first. Nothing readable ever leaves it, and you can change this later in Settings.</p>
        <div className="storage-choice">
          <button className="storage-opt" onClick={chooseLocalOnly}>
            <div className="storage-opt-title">📱 Just this device</div>
            <div className="storage-opt-sub">Nothing ever leaves. The most private option — and a fully supported one, not a lesser one. If you lose this device and your recovery kit, the records are gone.</div>
          </button>
          <button className="storage-opt" onClick={()=>setStorageChoice("cloud")}>
            <div className="storage-opt-title">☁️ This device and my own cloud</div>
            <div className="storage-opt-sub">An encrypted copy goes to storage you already own — Dropbox, OneDrive or Google Drive. They store it; they cannot read it. Protects you if this device is lost or breaks.</div>
          </button>
          <button className="storage-opt" onClick={()=>setStorageChoice("server")}>
            <div className="storage-opt-title">🏢 A server my organisation runs</div>
            <div className="storage-opt-sub">For care teams and programs with their own storage.</div>
          </button>
        </div>
        <button className="text-btn" onClick={skipStorageChoice}>Decide later</button>
      </>)}

      {storageChoice==="local"&&(<>
        <div className="onb-emoji">✅</div>
        <h1 className="auth-title">Everything stays on this device</h1>
        <p className="onb-body">No account, no uploads, nothing to configure.</p>
        {/* Backup folded in here rather than added as its own onboarding step (David's decision 2): it is the same
            conversation as "everything stays on this device" — the obvious next question is "what if I lose it?".
            Skippable, but skipping leaves the nudge live, exactly like the storage choice itself. */}
        <div className="storage-gate" style={{textAlign:"left"}}>
          <h3 className="sec-title" style={{marginTop:0}}>What if this device is lost or breaks?</h3>
          <p className="onb-body" style={{marginTop:0}}>Care Guardian can keep an encrypted copy in a file you choose, updated every time something changes — so you never have to remember to do it. <strong>Your passcode opens it.</strong> Nothing new to remember.</p>
          {hasFileSystemAccess?(<>
            {/* This screen doesn't render settingsMsg, so a flash() here would be invisible — which is exactly
                how the earlier failure looked like "nothing happens". Report the outcome inline instead. */}
            <button className="auth-btn" onClick={async()=>{ setOnbBackupMsg(""); 
              const ok=await setupContinuousBackup();
              setOnbBackupMsg(ok===false?"Your browser didn't let us set that up. You can still download a copy below, or set this up later in Settings.":"");
            }}>Choose where to keep it</button>
            {onbBackupMsg&&<p className="hint" style={{color:"var(--color-text-danger,#8d4a58)"}}>{onbBackupMsg}</p>}
            {backupStatus==="active"&&<div className="sync-status sync-status-success">✓ Saving automatically to {backupFileName||"your file"}</div>}
            <button className="text-btn" onClick={async()=>{ setOnbBackupMsg("");
              const ok=await backupNow();
              setOnbBackupMsg(ok?"✓ Copy downloaded. Keep it somewhere safe — your passcode opens it.":"That didn't work. You can make a backup later from Settings → Protect Your Data."); }}>Or just download a copy now</button>
            </>
          ):(<>
            {/* This branch is "no File System Access API", which is NOT the same as "iPhone". Brave on Windows
                lands here too, and telling a desktop user their iPhone can't save files is simply wrong. Say what
                is actually true of whatever browser they're in. */}
            <p className="hint" style={{marginTop:0}}>{isIOSDevice
              ? "iPhone browsers don't allow apps to save files automatically, so this one is a download you keep somewhere safe — iCloud Drive or Files works well."
              : "This browser doesn't let Care Guardian write to a file on its own, so this one is a download you keep somewhere safe."}</p>
            <button className="auth-btn" onClick={async()=>{ setOnbBackupMsg("");
              const ok=await backupNow();
              setOnbBackupMsg(ok?"✓ Copy downloaded. Keep it somewhere safe — your passcode opens it.":"That didn't work. You can make a backup later from Settings → Protect Your Data."); }}>Download a copy now</button>
            {onbBackupMsg&&<p className="hint">{onbBackupMsg}</p>}
          </>)}
        </div>
        <p className="hint">Whichever you choose, your <strong>recovery kit</strong> is the only way back if this device is lost and you have no copy — make one from Settings → Protect Your Data.</p>
        <button className="auth-btn" onClick={finishStorageSetup}>Done</button>
        <button className="text-btn" onClick={()=>{skipStorageChoice();}}>Skip for now</button>
      </>)}

      {/* Self-hosting is a genuinely different flow from OAuth: there is no consent screen and no provider to
          pick — there is a URL the organisation runs and a key they issue. Sending these people through the
          cloud-provider list showed them three buttons that could not help them. */}
      {storageChoice==="server"&&(<>
        <h1 className="auth-title">Connect your organisation's server</h1>
        {getServerUrl()?(<>
          <div className="sync-status sync-status-success">Connected to {getServerUrl()}</div>
          <p className="onb-body">Now let's check the whole path works — Care Guardian will save a small encrypted test file, read it back, and delete it.</p>
          {storageVerify==="running"&&<p className="hint">Checking…</p>}
          {storageVerify==="ok"&&<div className="sync-status sync-status-success">✓ Verified. Your server is working end to end.</div>}
          {storageVerify&&storageVerify.error&&(<div className="sync-status sync-status-error">Couldn't complete the check: {storageVerify.error}<br/>Your records are safe on this device. You can retry, or fix this later in Settings.</div>)}
          {storageVerify!=="ok"&&<button className="auth-btn" onClick={verifyServerRoundTrip} disabled={storageVerify==="running"}>{storageVerify?"Try again":"Run the check"}</button>}
          {storageVerify==="ok"&&(<>
            <div className="storage-gate">
              <h3 className="sec-title" style={{marginTop:0}}>One thing before you finish</h3>
              <p className="onb-body" style={{marginTop:0}}>Your server stores the records but <strong>cannot unlock them</strong> — only your devices can. If every device is lost, the server copy alone cannot be opened. Your recovery kit is the way back.</p>
              {hasRecoveryKit()
                ? <div className="sync-status sync-status-success">✓ Recovery kit created</div>
                : <button className="auth-btn" onClick={()=>{setShowStorageChoice(false);nav("settings");flash("Create your recovery kit here, under Protect Your Data.")}}>Create my recovery kit</button>}
            </div>
            <button className="auth-btn" onClick={finishStorageSetup} disabled={!hasRecoveryKit()}>Finish</button>
            {!hasRecoveryKit()&&<p className="hint">The recovery kit is required when records are stored off this device.</p>}
          </>)}
          <button className="text-btn" onClick={()=>{setServerConfig("","");setStorageVerify(null)}}>Use a different server</button>
        </>):(<>
          <p className="onb-body">Enter the address of the server your organisation runs, and the access key they gave you. Care Guardian writes only encrypted files there — the server never receives anything it can read.</p>
          <label className="cf-label" style={{textAlign:"left"}}>Server address
            <input id="srvUrl" className="cf-input" placeholder="https://care.example.org" autoComplete="off" inputMode="url"/></label>
          <label className="cf-label" style={{textAlign:"left"}}>Access key
            <input id="srvKey" className="cf-input" placeholder="Provided by your IT team" autoComplete="off"/></label>
          <p className="hint" style={{textAlign:"left"}}>Must start with <strong>https://</strong>. If you don't have these, ask whoever set up the server — they're not something you create here.</p>
          <button className="auth-btn" onClick={()=>{const u=document.getElementById("srvUrl").value,k=document.getElementById("srvKey").value;
            if(!u.trim()){flash("Enter the server address first.");return}
            setServerConfig(u,k);setStorageVerify(null);}}>Connect</button>
          <button className="text-btn" onClick={()=>setStorageChoice(null)}>Back</button>
          <details className="settings-group" style={{marginTop:14,textAlign:"left"}}><summary className="settings-group-summary"><span>What kind of server is this?</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
            <p className="hint" style={{marginTop:0}}>Care Guardian needs somewhere it can PUT and GET encrypted files over HTTPS — nothing more. That can be the small reference relay shipped with Care Guardian, an S3-compatible bucket (Backblaze B2, Wasabi, MinIO), or any WebDAV share. It never runs code on your server and never sends anything readable.</p>
            <p className="hint">Whoever runs it will need to allow this app's web address to reach it (a CORS setting). If the check below fails with a connection error, that is usually why.</p>
          </div></details>
        </>)}
      </>)}

      {storageChoice==="cloud"&&(<>
        <h1 className="auth-title">Connect your storage</h1>
        {!getCloudAuth()?(<>
          <p className="onb-body">Care Guardian will ask for access to <strong>one folder it creates</strong> — never the rest of your account. Everything written there is already encrypted.</p>
          {configuredProviders.length>0?(<div className="cloud-provider-btns">
            {configuredProviders.map(id=>{const p=CLOUD_PROVIDERS[id];const caps=storageCaps(id);return(
              <button key={id} className="cloud-provider-btn" onClick={()=>cloudConnectStart(id)}>
                <span className="cloud-provider-icon">{p.icon}</span>
                <span><span className="cloud-provider-label">{p.label}</span>
                {caps.auth==="session"&&<span className="cloud-provider-note">Reconnects with one tap each visit</span>}</span>
              </button>);})}
          </div>):(<p className="hint">No storage providers are configured in this deployment yet.</p>)}
          <button className="text-btn" onClick={()=>setStorageChoice(null)}>Back</button>
        </>):(<>
          <div className="sync-status sync-status-success">Connected to {(CLOUD_PROVIDERS[getCloudAuth().provider]||{}).label}</div>
          <p className="onb-body">Now let's check the whole path works — Care Guardian will save a small encrypted test file, read it back, and delete it.</p>
          {storageVerify==="running"&&<p className="hint">Checking…</p>}
          {storageVerify==="ok"&&<div className="sync-status sync-status-success">✓ Verified. Your storage is working end to end.</div>}
          {storageVerify&&storageVerify.error&&(<div className="sync-status sync-status-error">Couldn't complete the check: {storageVerify.error}<br/>Your records are safe on this device. You can retry, or continue and fix this later in Settings.</div>)}
          {storageVerify!=="ok"&&<button className="auth-btn" onClick={verifyStorageRoundTrip} disabled={storageVerify==="running"}>{storageVerify?"Try again":"Run the check"}</button>}
          {storageVerify==="ok"&&(<>
            {/* Locked decision: the recovery kit is a HARD GATE for anyone connecting cloud storage. The provider
                never holds the key, so a cloud copy is a backup of a locked box. Connecting storage is exactly the
                moment people feel safe enough to skip this, which is why it cannot be skipped. */}
            <div className="storage-gate">
              <h3 className="sec-title" style={{marginTop:0}}>One thing before you finish</h3>
              <p className="onb-body" style={{marginTop:0}}>Your cloud provider stores your records but <strong>cannot unlock them</strong> — only your devices can. If you ever lose every device, the cloud copy alone cannot be opened. Your recovery kit is the way back.</p>
              {hasRecoveryKit()
                ? <div className="sync-status sync-status-success">✓ Recovery kit created</div>
                : <button className="auth-btn" onClick={()=>{setShowStorageChoice(false);nav("settings");flash("Create your recovery kit here, under Protect Your Data.")}}>Create my recovery kit</button>}
            </div>
            <button className="auth-btn" onClick={finishStorageSetup} disabled={!hasRecoveryKit()}>Finish</button>
            {!hasRecoveryKit()&&<p className="hint">The recovery kit is required when you save to the cloud.</p>}
          </>)}
        </>)}
      </>)}
    </div></div>
  </>);

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
      <div className="nudge-body"><strong>This browser hasn't granted durable storage.</strong> Your records could be cleared if the device runs low on space.{isIOSDevice?" Add Care Guardian to your home screen, and keep a recent backup so nothing is lost.":" Tap Protect to let your browser keep them, and keep a recent backup as a safety net."}{backupStatus==="active"?" Your continuous backup is protecting you in the meantime.":""}</div>
      {isIOSDevice?(<button className="nudge-act" onClick={()=>nav("settings")}>Back up</button>):(<button className="nudge-act" onClick={async()=>{const ok=await requestPersistentStorage();if(ok){setStorageAtRisk(false);flash("Durable storage granted — your records are protected.")}else{flash("Your browser didn't grant durable storage yet. Keep a backup as a safety net.")}}}>Protect</button>)}
      <button className="nudge-x" onClick={()=>setStorageAtRisk(false)}>×</button>
    </div>)}
    {/* Truthful durability indicator — "saved" only after the edit's append has committed */}
    {saveState!=="saved"&&(<div className={`save-pill save-${saveState}`}>{saveState==="saving"?"Saving…":"⚠ Save error — your last edit may not be stored. Check storage in Settings."}</div>)}
    {/* Option 5 — install nudge (iOS tab → home screen for durable storage) */}
    {showInstallNudge&&(canInstall()||isIOSDevice)&&(<div className="nudge-banner nudge-install">
      <span className="nudge-icon">📲</span>
      <div className="nudge-body"><strong>Keep your records safer.</strong> {canInstall()
        ? "Installed apps get more durable storage and are far less likely to have their data cleared."
        : "On iPhone, tap Share in Safari's toolbar, then Add to Home Screen — installed apps are far less likely to have their data cleared."}</div>
      {/* Only shown when we can actually DO something about it: either the browser handed us an install prompt,
          or we're on iOS where the Share-sheet instruction is reliable. Otherwise the banner is nagging about a
          button that doesn't exist. */}
      {canInstall()&&<button className="nudge-act" onClick={async()=>{const ok=await installApp();if(ok)setShowInstallNudge(false)}}>Install</button>}
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
      <div className="nudge-body"><strong>Time to back up.</strong> {(data.settings&&data.settings.lastBackupAt)?"It's been a while since your last backup.":"You haven't made a backup yet."} A downloaded backup file survives even if your browser clears its storage — it's how you recover everything, including your activity log.</div>
      <button className="nudge-act" onClick={backupNow}>Back up now</button>
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
      <p className="hint" style={{marginTop:12,fontSize:"0.9375rem"}}>Merge adds new items and keeps the more recent version of each changed section. Your passcodes, device ID, and tab order are never overwritten.</p>
    </div></div>)}
    <input ref={fileRef} type="file" accept=".vcf,.vcard" style={{display:"none"}} onChange={handleImportVCard}/>
    <input ref={importFileRef} type="file" accept=".json" style={{display:"none"}} onChange={handleEncryptedImport}/>
    <input ref={fhirFileRef} type="file" accept=".json" style={{display:"none"}} onChange={handleFHIRImport}/>
            <input ref={extCalRef} type="file" accept=".ics,text/calendar" style={{display:"none"}} onChange={handleExtCalImport}/>
    <input ref={docFileRef} type="file" accept=".pdf,.txt,.text,.csv,.html,.htm" style={{display:"none"}} onChange={handleDocUpload}/>
    <input ref={syncFileRef} type="file" accept=".json" style={{display:"none"}} onChange={syncPullFromFile}/>
    <div className="shell">
      <main className="main-area-v2">
        <header className="hub-topbar">
          {!isHubView&&<button onClick={navBack} className="hub-back"><i style={{fontSize:"1.125rem"}}>←</i></button>}
          <div className="hub-topbar-text">
            <span className="hub-topbar-title">{getViewTitle()}</span>
            {getBreadcrumb()&&<span className="hub-topbar-crumb">{getBreadcrumb()}</span>}
          </div>
          {isClient&&<span className="client-badge">View Only</span>}
          {!isHubView&&HELP_TOPICS[view]&&<button onClick={()=>{setHelpTopic(view);nav("help")}} className="help-btn" aria-label={"Help for "+HELP_TOPICS[view]} title={"Help: "+HELP_TOPICS[view]}>?</button>}
          <button onClick={()=>{setSearchOpen(true);setSearchQ("")}} className="search-btn">🔍</button>
          <button onClick={lock} className="top-lock">🔒</button>
        </header>

        <div className="content-v2">
          {(settingsMsg||importResult)&&<div className="import-toast">{settingsMsg||importResult}</div>}

          {/* ═══ TODAY HUB ═══ */}
          {view==="caremgmt-hub"&&(<>
          {storageNudgeVisible()&&(<div className="storage-nudge">
            <div><strong>Your records are on this device only.</strong><div className="hint" style={{marginTop:2}}>If this device is lost or breaks, they go with it. You can save an encrypted copy to storage you own — they store it, they can't read it.</div></div>
            <div className="storage-nudge-acts">
              <button className="save-btn" style={{margin:0}} onClick={()=>{setStorageChoice(null);setShowStorageChoice(true)}}>Choose storage</button>
              <button className="text-btn" style={{margin:0}} onClick={()=>setStorageNudgeDismissed(true)}>Not now</button>
            </div>
          </div>)}
            <div className="hub-welcome">🛡 Care Guardian{(data.settings&&data.settings.team)?" — "+(data.settings.team.name||""):""}</div>
            {clientDisplayName()&&<p className="hub-client">Caring for <strong>{clientDisplayName()}</strong></p>}
            {getSyncWarning()==="warn"&&<div className="hub-card hub-card-urgent" onClick={()=>nav("sync")}><div className="hub-card-icon" style={{background:"var(--color-background-warning)"}}><span style={{color:"var(--color-text-warning)"}}>📡</span></div><div className="hub-card-body"><div className="hub-card-title">Sync overdue <span className="pill pill-a">{getSyncAge().days}d ago</span></div><div className="hub-card-sub">Sync now to protect your data</div></div><span className="hub-card-arr">›</span></div>}
            {SHOW_CAREGIVER_CHECKIN&&(()=>{const d=daysSinceRespite();if(d===null||d<14)return null;return(<div className="hub-card hub-card-urgent" onClick={()=>nav("caregiver-wellness")}><div className="hub-card-icon" style={{background:"var(--color-background-danger)"}}><span style={{color:"var(--color-text-danger)"}}>💛</span></div><div className="hub-card-body"><div className="hub-card-title">No respite in {d} days</div><div className="hub-card-sub">Caregiver burnout risk — please take a break</div></div><span className="hub-card-arr">›</span></div>)})()}
            <details className="settings-group hub-sec-today" open><summary className="settings-group-summary"><span className="hub-sec-t-title">☀ Today</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
            <p className="hint" style={{marginTop:0}}>Daily care, quick actions, and what needs attention now.</p>
            {(()=>{const rems=getReminders();const missed=rems.filter(r=>r.type==="med-missed");const dueMeds=rems.filter(r=>r.type==="med-due");const upcoming=rems.filter(r=>r.type==="med-upcoming");const overdueT=rems.filter(r=>r.type==="task-overdue");const upcomingT=rems.filter(r=>r.type==="task-upcoming");const appts=rems.filter(r=>r.type==="appt");const hasAlerts=missed.length+dueMeds.length+overdueT.length+appts.length>0;
              return(<>
                {missed.length>0&&<><div className="hub-section-label" style={{color:"#b56576"}}>⚠ Missed medications</div>{missed.map((r,i)=>(<div key={"m"+i} className="hub-card hub-card-urgent" onClick={()=>{nav(r.action)}}><div className="hub-card-icon" style={{background:"#fde2e8"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {dueMeds.length>0&&<><div className="hub-section-label">💊 Medications due now</div>{dueMeds.map((r,i)=>(<div key={"d"+i} className="hub-card" style={{borderLeft:"3px solid #bc6c25"}} onClick={()=>{nav(r.action)}}><div className="hub-card-icon" style={{background:"#fdf0d5"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {appts.length>0&&<><div className="hub-section-label">📅 Upcoming appointments</div>{appts.map((r,i)=>(<div key={"a"+i} className="hub-card" onClick={()=>{nav(r.action)}}><div className="hub-card-icon" style={{background:"#eef4f8"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {overdueT.length>0&&<><div className="hub-section-label">Overdue recurring tasks</div>{overdueT.slice(0,5).map((r,i)=>(<div key={"t"+i} className="hub-card hub-card-urgent" onClick={()=>{nav(r.action)}}><div className="hub-card-icon" style={{background:"#fde2e8"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {upcoming.length>0&&<><div className="hub-section-label">Coming up</div>{upcoming.map((r,i)=>(<div key={"u"+i} className="hub-card" onClick={()=>{nav(r.action)}}><div className="hub-card-icon" style={{background:"#f6f4f0"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {upcomingT.length>0&&<><div className="hub-section-label">Tasks due this week</div>{upcomingT.slice(0,5).map((r,i)=>(<div key={"tw"+i} className="hub-card" onClick={()=>{nav(r.action)}}><div className="hub-card-icon" style={{background:"#fdf0d5"}}><span>{r.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{r.title}</div><div className="hub-card-sub">{r.sub}</div></div><span className="hub-card-arr">›</span></div>))}</>}
                {!hasAlerts&&<><div className="hub-section-label">Status</div><div className="hub-card hub-card-ok"><div className="hub-card-icon" style={{background:"#e8f0df"}}><span style={{color:"#718355"}}>✓</span></div><div className="hub-card-body"><div className="hub-card-title">All clear</div><div className="hub-card-sub">No overdue medications, tasks, or appointments</div></div></div></>}
              </>)})()}
            <div className="hub-section-label">Today's features</div>
            <div className="hub-card" onClick={()=>nav("medadmin")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>💊</span></div><div className="hub-card-body"><div className="hub-card-title">Medicine management</div><div className="hub-card-sub">Today's med admin grid</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("incidents")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>⚠</span></div><div className="hub-card-body"><div className="hub-card-title">Incident log</div><div className="hub-card-sub">Fall, behavior, medication error</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("calendar")}><div className="hub-card-icon" style={{background:"var(--color-background-info)"}}><span style={{color:"var(--color-text-info)"}}>▦</span></div><div className="hub-card-body"><div className="hub-card-title">Appointments & calendar</div><div className="hub-card-sub">{(data.appointments||[]).length} scheduled</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("messages")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>✉</span></div><div className="hub-card-body"><div className="hub-card-title">Messages</div><div className="hub-card-sub">Team chat</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("handoff")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📋</span></div><div className="hub-card-body"><div className="hub-card-title">Shift handoff</div><div className="hub-card-sub">Summary of recent activity for incoming caregiver</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("emergency")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🚨</span></div><div className="hub-card-body"><div className="hub-card-title">Emergency plans</div><div className="hub-card-sub">6 scenario cards</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("emergency-card")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🆔</span></div><div className="hub-card-body"><div className="hub-card-title">Emergency info card</div><div className="hub-card-sub">Printable wallet card with vitals</div></div><span className="hub-card-arr">›</span></div>
            {SHOW_CAREGIVER_CHECKIN&&!isClient&&<div className="hub-card" onClick={()=>nav("caregiver-wellness")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>💛</span></div><div className="hub-card-body"><div className="hub-card-title">Caregiver check-in</div><div className="hub-card-sub">Track your stress, sleep, and respite</div></div><span className="hub-card-arr">›</span></div>}
            </div></details>
            <details className="settings-group hub-sec-lt"><summary className="settings-group-summary"><span>🌱 Long Term</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
            <p className="hint" style={{marginTop:0}}>Care planning across the five domains, monitoring, and documentation.</p>
            <div className="strat-grid">{DOMAINS.filter(d=>can("view-domain",d.key)).map(d=>{const p=getProgress(d.key);const hc=p.pct>=80&&p.recency>=70?"#718355":p.pct>=40||p.recency>=40?"#bc6c25":"#b56576";return(
              <div key={d.key} className="strat-card" onClick={()=>nav(d.key)} style={{borderTopColor:d.color}}>
                <div className="strat-icon">{d.icon}</div>
                <div className="strat-pct" style={{color:hc}}>{p.pct}%</div>
                <div className="strat-label">{getDomLabel(d.key).split(" ")[0]}</div>
                {p.ongoingTotal>0&&<div className="strat-pulse" style={{color:hc}}>Pulse {p.recency}%</div>}
              </div>)})}</div>
            <div className="hub-section-label">Health domains</div>
            {DOMAINS.filter(d=>can("view-domain",d.key)&&["physical","cognitive","wellness"].includes(d.key)).map(d=>{const p=getProgress(d.key);const hc=p.pct>=80&&p.recency>=70?"var(--color-background-success)":p.pct>=40||p.recency>=40?"var(--color-background-warning)":"var(--color-background-danger)";const hl=p.pct>=80&&p.recency>=70?"Healthy":p.pct>=40||p.recency>=40?"Fair":"Attention";const hlc=p.pct>=80&&p.recency>=70?"pill-g":p.pct>=40||p.recency>=40?"pill-a":"pill-r";return(
              <div key={d.key} className="hub-card" onClick={()=>nav(d.key)}><div className="hub-card-icon" style={{background:hc}}><span style={{fontSize:"1.125rem"}}>{d.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{getDomLabel(d.key)} <span className={"pill "+hlc}>{hl}</span></div><div className="hub-card-sub">Foundation {p.pct}%{p.ongoingTotal>0?" · Pulse "+p.recency+"%":""}</div></div><span className="hub-card-arr">›</span></div>)})}
            {can("view-legal")&&<><div className="hub-section-label">Legal and financial</div>
              {DOMAINS.filter(d=>["legal","financial"].includes(d.key)).map(d=>{const p=getProgress(d.key);const hlc=p.pct>=80?"pill-g":p.pct>=40?"pill-a":"pill-r";const hl=p.pct>=80?"Healthy":p.pct>=40?"Fair":"Attention";return(
              <div key={d.key} className="hub-card" onClick={()=>nav(d.key)}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span style={{fontSize:"1.125rem"}}>{d.icon}</span></div><div className="hub-card-body"><div className="hub-card-title">{getDomLabel(d.key)} <span className={"pill "+hlc}>{hl}</span></div><div className="hub-card-sub">Foundation {p.pct}%</div></div><span className="hub-card-arr">›</span></div>)})}</>}
            <div className="hub-section-label">Monitoring</div>
            <div className="hub-card" onClick={()=>nav("triggers")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📊</span></div><div className="hub-card-body"><div className="hub-card-title">Escalation triggers</div><div className="hub-card-sub">{Object.values(data.transitionTriggers||{}).filter(Boolean).length} active</div></div><span className="hub-card-arr">›</span></div>
            {can("view-tracking")&&<div className="hub-card" onClick={()=>nav("tracking")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📈</span></div><div className="hub-card-body"><div className="hub-card-title">Longitudinal tracking</div><div className="hub-card-sub">{(data.statusHistory||[]).length} snapshots</div></div><span className="hub-card-arr">›</span></div>}
            {can("view-visit")&&<div className="hub-card" onClick={()=>nav("visit")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📋</span></div><div className="hub-card-body"><div className="hub-card-title">Visit prep</div><div className="hub-card-sub">Auto-generated summary</div></div><span className="hub-card-arr">›</span></div>}
            {(data.incidents||[]).length>=3&&<div className="hub-card" onClick={()=>nav("incident-patterns")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📊</span></div><div className="hub-card-body"><div className="hub-card-title">Incident patterns</div><div className="hub-card-sub">Time-of-day, type trends, weekly view</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-section-label">Documentation</div>
            <div className="hub-card" onClick={()=>nav("poa-decisions")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>⚖</span></div><div className="hub-card-body"><div className="hub-card-title">POA decisions <span className="pill pill-b">{(data.poaDecisions||[]).length}</span></div><div className="hub-card-sub">Document decisions made under power of attorney</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("capacity")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📝</span></div><div className="hub-card-body"><div className="hub-card-title">Capacity observations <span className="pill pill-b">{(data.capacityLog||[]).length}</span></div><div className="hub-card-sub">Structured ability assessments for legal and clinical use</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("binder")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📖</span></div><div className="hub-card-body"><div className="hub-card-title">Care plan binder</div><div className="hub-card-sub">Printable comprehensive care document</div></div><span className="hub-card-arr">›</span></div>
            {can("view-postdeath")&&<div className="hub-card" onClick={()=>nav("postdeath")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🕊</span></div><div className="hub-card-body"><div className="hub-card-title">End-of-life planning</div><div className="hub-card-sub">Administrative checklist</div></div><span className="hub-card-arr">›</span></div>}
            </div></details>
          </>)}

          {/* ═══ DOCUMENTS & DATA HUB ═══ */}
          {view==="docs-hub"&&(<>
              {activeGrants.length>0&&(<div className="prog-indicator" onClick={()=>nav("program")}>
                <span className="prog-eye">👁</span>
                <div className="prog-ind-main">{activeGrants.length===1?activeGrants[0].institution+" has a "+(GRANT_ARCHETYPES[activeGrants[0].archetype]||GRANT_ARCHETYPES.navigator).label.toLowerCase()+" view.":activeGrants.length+" care programs have a view."}<div className="prog-ind-sub">Tap to manage or stop.</div></div>
                <span className="prog-ind-act">Manage ›</span>
              </div>)}
            <div className="hub-card" onClick={()=>nav("selfreport")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🗣</span></div><div className="hub-card-body"><div className="hub-card-title">Self-reports <span className="pill pill-b">{(data.selfReports||[]).length}</span></div><div className="hub-card-sub">Client wellness updates</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("datashare")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📤</span></div><div className="hub-card-body"><div className="hub-card-title">Records in & out</div><div className="hub-card-sub">Import health records · share as PDF or FHIR · status update</div></div><span className="hub-card-arr">›</span></div>
            {can("view-contacts")&&<div className="hub-card" onClick={()=>nav("contacts")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>☷</span></div><div className="hub-card-body"><div className="hub-card-title">Contacts <span className="pill pill-b">{(data.contacts||[]).length}</span></div><div className="hub-card-sub">Medical, legal, family</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-card" onClick={()=>nav("incidents")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>⚠</span></div><div className="hub-card-body"><div className="hub-card-title">Incidents <span className="pill pill-b">{(data.incidents||[]).length}</span></div><div className="hub-card-sub">Falls, behaviors, medication errors</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("calendar")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>▦</span></div><div className="hub-card-body"><div className="hub-card-title">Calendar</div><div className="hub-card-sub">Month view · Appointments</div></div><span className="hub-card-arr">›</span></div>
            {can("view-documents")&&<div className="hub-card" onClick={()=>nav("documents")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>📄</span></div><div className="hub-card-body"><div className="hub-card-title">Documents <span className="pill pill-b">{(data.savedDocs||[]).length}</span></div><div className="hub-card-sub">Scanner · Library</div></div><span className="hub-card-arr">›</span></div>}
            <div className="hub-card" onClick={()=>nav("program")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🤝</span></div><div className="hub-card-body"><div className="hub-card-title">Share with a care provider</div><div className="hub-card-sub">Scoped, consented, revocable program access</div></div><span className="hub-card-arr">›</span></div>
            {can("view-expenses")&&<div className="hub-card" onClick={()=>nav("expenses")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>$</span></div><div className="hub-card-body"><div className="hub-card-title">Expenses <span className="pill pill-b">{(data.expenses||[]).length}</span></div><div className="hub-card-sub">Care costs · CSV export</div></div><span className="hub-card-arr">›</span></div>}
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
                    {(s.claimRequests||[]).map(c=>(<div key={c.deviceId} className="shift-approval-row"><span>{c.name}</span><div style={{display:"flex",gap:6}}><button onClick={()=>approveClaim(s.id,c.deviceId)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem",background:"#718355",color:"#fff",borderColor:"#718355"}}>Approve</button><button onClick={()=>denyClaim(s.id,c.deviceId)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem"}}>Deny</button></div></div>))}
                  </div>}
                  {s.status==="swap-requested"&&s.swapRequest&&<div className="shift-approvals">
                    <p className="hint">{s.swapRequest.fromName} wants to give up this shift{s.swapRequest.reason?": "+s.swapRequest.reason:"."}</p>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span className="hint">Reassign to:</span>
                      <select className="cf-input" style={{width:"auto",padding:"4px 8px"}} onChange={e=>{if(e.target.value)approveSwap(s.id,e.target.value)}} defaultValue=""><option value="">Open for claiming</option>{teamMembers().filter(m=>m.deviceId!==s.swapRequest.fromDevice).map(m=>(<option key={m.deviceId} value={m.deviceId}>{m.name}</option>))}</select>
                      <button onClick={()=>approveSwap(s.id,null)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem",background:"#718355",color:"#fff",borderColor:"#718355"}}>Open it</button>
                      <button onClick={()=>denySwap(s.id)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem"}}>Deny</button>
                    </div>
                  </div>}
                </div>))}
              </div>)})()}

            {/* Open shifts */}
            {(()=>{const open=(data.careShifts||[]).filter(s=>s.status==="open"&&new Date(s.date)>=new Date(new Date().toDateString())).sort((a,b)=>a.date.localeCompare(b.date));if(open.length===0)return null;return(
              <div className="section"><h3 className="sec-title">🟢 Open shifts ({open.length})</h3>
                {open.map(s=>(<div key={s.id} className="shift-card shift-open">
                  <div className="shift-head"><span className="shift-date">{s.date} · {s.startTime}–{s.endTime}</span>{can("claim-shift")&&!isAdmin&&<button onClick={()=>requestClaim(s.id)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem",background:"#457b9d",color:"#fff",borderColor:"#457b9d"}}>Request to claim</button>}{can("manage-schedule")&&<button onClick={()=>deleteShift(s.id)} className="remove-sub">×</button>}</div>
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
                  {!s.visitStarted&&<button onClick={()=>startVisit(s.id)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem",background:"#718355",color:"#fff",borderColor:"#718355"}}>▶ Start visit</button>}
                  {s.visitStarted&&!s.visitEnded&&<><span className="hint">Started {new Date(s.visitStarted).toLocaleTimeString()}</span> <button onClick={()=>endVisit(s.id)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem",background:"#b56576",color:"#fff",borderColor:"#b56576"}}>■ End visit</button></>}
                  {s.visitStarted&&s.visitEnded&&<span className="hint" style={{color:"#718355"}}>✓ Visit logged: {new Date(s.visitStarted).toLocaleTimeString()}–{new Date(s.visitEnded).toLocaleTimeString()}</span>}
                </div>}
                {isMine&&can("log-visit")&&<><label className="cf-label" style={{marginTop:8}}>Visit notes</label><textarea defaultValue={s.visitNotes} onBlur={e=>setVisitNotes(s.id,e.target.value)} className="notes-ta" rows={2} placeholder="What happened during this visit?"/></>}
                {!isMine&&s.visitNotes&&<div className="shift-careplan"><strong>Visit notes:</strong> {s.visitNotes}</div>}
                {isMine&&s.status==="assigned"&&can("claim-shift")&&<button onClick={()=>setSwapModal(s.id)} className="edit-btn" style={{marginTop:8,fontSize:"0.9375rem"}}>⇄ Request swap</button>}
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
              {can("export-data")&&<div style={{marginBottom:12}}><button onClick={()=>{const lines=(data.poaDecisions||[]).map(d=>{const t=POA_DECISION_TYPES.find(x=>x.key===d.type);return d.date+" | "+(t&&t.label||d.type)+" | "+d.description+(d.reasoning?" | Reasoning: "+d.reasoning:"")+(d.knownWishes?" | Wishes: "+d.knownWishes:"")+(d.consulted?" | Consulted: "+d.consulted:"")+(d.outcome?" | Outcome: "+d.outcome:"")+" | Agent: "+d.agent});try{navigator.clipboard.writeText("POA DECISION LOG\n"+lines.join("\n"));flash("Decision log copied to clipboard.")}catch{}}} className="edit-btn" style={{fontSize:"0.9375rem",marginTop:0}}>📋 Export log</button></div>}
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
                  <div className="o-card-head"><span style={{fontSize:"1.5rem",color:d.color}}>{d.icon}</span><span className="o-badge" style={{background:healthColor+"18",color:healthColor}}>{healthLabel}</span></div>
                  <div className="o-card-title-row"><h2 className="o-card-title">{getDomLabel(d.key)}</h2>{!isClient&&<span className="edit-icon edit-icon-visible" onClick={e=>{e.stopPropagation();setEditingDomain({key:d.key,label:getDomLabel(d.key),desc:getDomDesc(d.key)})}}>✎</span>}</div>
                  <p className="o-card-desc">{getDomDesc(d.key)}</p>
                  <div className="dual-track">
                    <div className="dual-track-row"><span className="dual-track-label">☐ Foundation</span><div className="prog-track"><div className="prog-fill" style={{width:`${prog.pct}%`,background:d.color}}/></div><span className="prog-label">{prog.done}/{prog.total}</span></div>
                    {prog.ongoingTotal>0&&<div className="dual-track-row"><span className="dual-track-label" style={{color:pulseColor}}>↻ Care Pulse</span><div className="prog-track"><div className="prog-fill" style={{width:`${prog.recency}%`,background:pulseColor}}/></div><span className="prog-label" style={{color:pulseColor}}>{prog.ongoingOk}/{prog.ongoingTotal}</span></div>}
                  </div>
                </button>)})}

              {/* upcoming appointments */}
              <button onClick={()=>nav("calendar")} className="o-card" style={{borderLeftColor:"#6d6875",background:"#f3f0f5"}}>
                <div className="o-card-head"><span style={{fontSize:"1.5rem",color:"#6d6875"}}>▦</span><span className="o-badge" style={{background:"#eef0f3",color:"#8d99ae"}}>{getUpcoming().length} upcoming</span></div>
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
          {/* ── Care recipient's own view: what to take next, in large print ──
              A person with dementia should not have to read a caregiver's admin grid to answer "have I taken my
              tablets?". This shows the next dose only, at size, with no editing controls and no adherence
              scoring — the record is about them, not a report card on them. */}
          {view==="medadmin"&&isClient&&(()=>{
            const today=medDayKey(new Date()); const hour=new Date().getHours();
            const meds=getMedSchedule().medications;
            const rows=[];
            for(const m of meds) for(const s of (m.timeSlots||[])){
              if(s===MED_PRN_SLOT) continue;
              const w=MED_SLOTS[s]; const e=getMedEntry(m.id,s,today);
              rows.push({m,s,e,start:(w&&w.start)!=null?w.start:99});
            }
            const pending=rows.filter(r=>!r.e).sort((a,b)=>a.start-b.start);
            const nextSlot=pending.length?pending.find(r=>r.start>=hour)||pending[0]:null;
            const group=nextSlot?pending.filter(r=>r.s===nextSlot.s):[];
            const doneToday=rows.filter(r=>r.e&&r.e.status==="given");
            return (<>
              <h1 className="page-title">💊 My medicines</h1>
              {group.length?(<div className="client-dose">
                <div className="client-dose-when">{group[0].s}</div>
                {group.map(({m})=>(<div key={m.id} className="client-dose-med">
                  <div className="client-dose-name">{m.name}</div>
                  <div className="client-dose-amt">{m.dosage}</div>
                </div>))}
                <p className="client-dose-note">Your caregiver records these once you've taken them.</p>
              </div>):(<div className="client-dose client-dose-clear">
                <div className="client-dose-when">All done for today</div>
                <p className="client-dose-note">Nothing else is due. {doneToday.length?doneToday.length+" recorded today.":""}</p>
              </div>)}
              {doneToday.length>0&&(<div className="section"><h3 className="sec-title">Already taken today</h3>
                {doneToday.map(({m,s,e})=>(<div key={m.id+s} className="client-taken">
                  <span>{m.name} <span className="hint">{m.dosage}</span></span>
                  <span className="hint">{s}{e.at?" · "+new Date(e.at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):""}</span>
                </div>))}</div>)}
            </>); })()}

          {view==="medadmin"&&!isClient&&(<>
            <div className="contacts-header"><div><h1 className="page-title">💊 Medication Administration Log</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Track daily medication administration. Tap cells to cycle: ✓ given → ✗ missed → ⊘ refused → clear.</p></div>
              {!isClient&&<button onClick={()=>setMedForm({mode:"add",med:{name:"",dosage:"",timeSlots:["Morning"],notes:""}})} className="save-btn">+ Add Medication</button>}
            </div>
            <div className="med-view-toggle">
              <button className={"mvt-btn"+(medView==="day"?" mvt-on":"")} onClick={()=>setMedView("day")}>Day</button>
              <button className={"mvt-btn"+(medView==="calendar"?" mvt-on":"")} onClick={()=>{setMedView("calendar");setMedCalDay(null)}}>Calendar</button>
            </div>
            {medView==="day"&&(<>
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
                  {MED_TIME_SLOTS.map(s=>{const active=m.timeSlots.includes(s);const entry=active?getMedEntry(m.id,s,medAdminDate):null;const status=entry&&entry.status||null;return(
                    <td key={s} className="med-cell" onClick={()=>{if(active&&!isClient)toggleMedAdmin(m.id,s,medAdminDate)}} title={entry?((entry.status||"")+(entry.by?" — "+entry.by:"")+(entry.at?" at "+new Date(entry.at).toLocaleTimeString():"")+(entry.reason?" · "+entry.reason:"")):""} style={{cursor:active&&!isClient?"pointer":"default",background:status==="given"?"#e8f0df":status==="missed"?"#f6e3e6":status==="refused"?"#f6ecdf":status==="skipped"?"#eef1f5":"transparent"}}>
                      {active?(<>{status==="given"?<span className="med-check given">✓</span>:status==="missed"?<span className="med-check missed">✗</span>:status==="refused"?<span className="med-check refused">⊘</span>:status==="skipped"?<span className="med-check skipped">⤼</span>:<span className="med-check">·</span>}{/* WHO and WHEN, shown in the grid itself — a second caregiver has to be able to SEE that a dose was already given, which is what prevents a double dose. */}{entry&&entry.by&&<span className="med-by">{entry.by.split(" ")[0]}{entry.at?" "+new Date(entry.at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):""}</span>}{entry&&entry.reason&&<span className="med-reason-tag">{entry.reason}</span>}</>):<span className="med-dash">—</span>}
                    </td>)})}
                  {!isClient&&<td><button onClick={()=>setMedForm({mode:"edit",med:{...m},id:m.id})} className="edit-icon edit-icon-visible">✎</button></td>}
                </tr>))}</tbody>
              </table></div>}
            {/* A withheld dose without a reason is a gap in the record. Offer the reason right where it happened,
                rather than expecting someone to remember to write a note later. */}
            {!isClient&&(()=>{ const pend=[];
              for(const m of getMedSchedule().medications) for(const s of (m.timeSlots||[])){
                const e=getMedEntry(m.id,s,medAdminDate);
                if(e&&(e.status==="skipped"||e.status==="refused")&&!e.reason) pend.push({m,s,e}); }
              if(!pend.length) return null;
              return (<div className="section"><h3 className="sec-title">Why was this dose not given?</h3>
                {pend.map(({m,s,e})=>(<div key={m.id+s} className="doc-section-card">
                  <strong>{m.name}</strong> <span className="hint">{s} · {e.status}</span>
                  <div className="med-reason-row">{MED_SKIP_REASONS.map(r=>(
                    <button key={r} className="mc-chip" onClick={()=>setMedReason(m.id,s,medAdminDate,r)}>{r}</button>))}</div>
                </div>))}
                <p className="hint">Optional, but it turns a blank into a decision someone can stand behind later.</p>
              </div>); })()}
            </>)}

            {medView==="calendar"&&(()=>{
              const allMeds=getMedSchedule(true).medications;
              const log=(data.medSchedule&&data.medSchedule.log)||[];
              const today=medDayKey(new Date());
              const [cy,cm]=medCalMonth.split("-").map(Number);
              const first=new Date(cy,cm-1,1), last=new Date(cy,cm,0);
              const range=medAdherenceRange(allMeds,log,medDayKey(first),medDayKey(last),medCalFilter,today);
              const pFirst=new Date(cy,cm-2,1), pLast=new Date(cy,cm-1,0);
              const prev=medAdherenceRange(allMeds,log,medDayKey(pFirst),medDayKey(pLast),medCalFilter,today);
              const delta=(range.pct!==null&&prev.pct!==null)?range.pct-prev.pct:null;
              const streak=medStreak(range.days,today);
              const byDate={}; range.days.forEach(d=>byDate[d.date]=d);
              const cells=[]; for(let i=0;i<first.getDay();i++)cells.push(null); range.days.forEach(d=>cells.push(d));
              const sel=medCalDay?byDate[medCalDay]:null;
              const shiftMonth=(n)=>{const d=new Date(cy,cm-1+n,1);setMedCalMonth(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));setMedCalDay(null)};
              const stripStart=new Date(); stripStart.setDate(stripStart.getDate()-29);
              const filterName=medCalFilter==="all"?"All medications":((allMeds.find(m=>m.id===medCalFilter)||{}).name||"");
              const copySummary=()=>{ const lines=["Medication adherence — "+filterName,
                  new Date(cy,cm-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"}),
                  "Doses given: "+range.given+" of "+range.scheduled+(range.pct!==null?" ("+range.pct+"%)":""),
                  "Marked missed: "+range.missed+" · refused: "+range.refused+" · not recorded: "+range.unrecorded];
                if(range.prnGiven)lines.push("As-needed doses given: "+range.prnGiven);
                const txt=lines.join("\n");
                try{ navigator.clipboard.writeText(txt); flash("Adherence summary copied — paste it into a note or message."); }
                catch(e){ flash("Couldn't copy automatically. The figures are on screen."); } };
              return (<>
                <div className="med-cal-filters">
                  <button className={"mc-chip"+(medCalFilter==="all"?" mc-chip-on":"")} onClick={()=>{setMedCalFilter("all");setMedCalDay(null)}}>All medications</button>
                  {allMeds.map(m=>(<button key={m.id} className={"mc-chip"+(medCalFilter===m.id?" mc-chip-on":"")} onClick={()=>{setMedCalFilter(m.id);setMedCalDay(null)}}>
                    {m.name}{m.discontinued?" (stopped)":""}</button>))}
                </div>
                <div className="med-date-nav">
                  <button onClick={()=>shiftMonth(-1)} className="med-nav-btn">‹</button>
                  <strong style={{flex:1,textAlign:"center"}}>{new Date(cy,cm-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong>
                  <button onClick={()=>shiftMonth(1)} className="med-nav-btn">›</button>
                </div>
                <div className="med-adh-stats">
                  <div className="mas-card"><div className="mas-num">{range.pct===null?"—":range.pct+"%"}</div><div className="mas-lbl">doses given{delta!==null&&<span className={"mas-delta "+(delta>0?"up":delta<0?"down":"")}>{delta>0?"▲ +":delta<0?"▼ ":"– "}{delta!==0?Math.abs(delta)+"%":""}</span>}</div></div>
                  <div className="mas-card"><div className="mas-num">{range.given}<span className="mas-of">/{range.scheduled}</span></div><div className="mas-lbl">scheduled doses</div></div>
                  <div className="mas-card"><div className="mas-num">{streak}</div><div className="mas-lbl">day streak</div></div>
                  {range.unrecorded>0&&<div className="mas-card mas-warn"><div className="mas-num">{range.unrecorded}</div><div className="mas-lbl">not recorded</div></div>}
                </div>
                <div className="med-cal-grid">
                  {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} className="mc-dow">{d}</div>)}
                  {cells.map((d,i)=>d===null?<div key={"b"+i} className="mc-cell mc-blank"/>:(
                    <button key={d.date} className={"mc-cell mc-"+d.state+(medCalDay===d.date?" mc-sel":"")+(d.date===today?" mc-today":"")}
                      onClick={()=>setMedCalDay(medCalDay===d.date?null:d.date)}
                      title={d.scheduled?(d.given+" of "+d.scheduled+" given"):(d.prnGiven?d.prnGiven+" as-needed":"nothing scheduled")}>
                      <span className="mc-day">{Number(d.date.slice(8))}</span>
                      {d.scheduled>0&&<span className="mc-frac">{d.given}/{d.scheduled}</span>}
                    </button>))}
                </div>
                <div className="med-cal-legend">
                  <span><i className="mc-key mc-full"/>All given</span><span><i className="mc-key mc-partial"/>Some given</span>
                  <span><i className="mc-key mc-missed"/>Missed / refused</span><span><i className="mc-key mc-unrecorded"/>Not recorded</span>
                  <span><i className="mc-key mc-none"/>None scheduled</span>
                </div>
                {sel&&(<div className="section">
                  <h3 className="sec-title">{new Date(sel.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</h3>
                  {sel.scheduled===0&&sel.prnGiven===0?<p className="hint">Nothing scheduled this day.</p>:(<>
                    <p className="hint" style={{marginTop:0}}>{sel.given} of {sel.scheduled} scheduled doses given{sel.prnGiven?" · "+sel.prnGiven+" as-needed":""}{sel.unrecorded?" · "+sel.unrecorded+" not recorded":""}</p>
                    {allMeds.filter(m=>(medCalFilter==="all"||m.id===medCalFilter)&&medActiveOn(m,sel.date)).map(m=>(
                      <div key={m.id} className="doc-section-card">
                        <strong>{m.name}</strong> <span className="hint">{m.dosage}</span>
                        <div className="mc-slots">{(m.timeSlots||[]).map(sl=>{const st=getMedStatus(m.id,sl,sel.date);
                          return <span key={sl} className={"mc-slot mc-slot-"+(st||(sl===MED_PRN_SLOT?"prn":"unrecorded"))}>{sl}{st==="given"?" ✓":st==="missed"?" ✗":st==="refused"?" ⊘":""}</span>})}</div>
                      </div>))}
                  </>)}
                </div>)}
                <div className="section">
                  <h3 className="sec-title">Last 30 days by medication</h3>
                  <p className="hint" style={{marginTop:0}}>Each square is a day. This is where a single medication slipping shows up even when the overall figure looks fine.</p>
                  {allMeds.filter(m=>!m.discontinued).map(m=>{
                    const r=medAdherenceRange(allMeds,log,medDayKey(stripStart),today,m.id,today);
                    return (<div key={m.id} className="med-strip-row">
                      <div className="med-strip-head"><strong>{m.name}</strong><span className={"med-strip-pct"+(r.pct!==null&&r.pct<80?" low":"")}>{r.pct===null?"—":r.pct+"%"}</span></div>
                      <div className="med-strip">{r.days.map(d=><i key={d.date} className={"mc-key mc-"+d.state} title={d.date+": "+(d.scheduled?d.given+"/"+d.scheduled:"none scheduled")}/>)}</div>
                    </div>);})}
                  {allMeds.filter(m=>!m.discontinued).length===0&&<p className="hint">No active medications.</p>}
                </div>
                {can("export-data")&&<button className="cancel-btn" onClick={copySummary}>Copy adherence summary</button>}
              </>);
            })()}

            {/* ── Medication change log ── */}
            <details className="settings-group" style={{marginTop:18}}><summary className="settings-group-summary"><span>📜 Medication change log ({(data.medChanges||[]).length})</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
            <p className="hint" style={{marginTop:0}}>Every medication added, stopped, or dose-changed — whether entered by hand or imported from a document.</p>
            {(data.medChanges||[]).length===0?<p className="hint">No changes recorded yet.</p>:
            (data.medChanges||[]).slice(0,200).map(c=>(
            <div key={c.id} className="doc-section-card">
            <div><strong>{c.action==="added"?"➕ Added":c.action==="discontinued"?"⛔ Discontinued":c.action==="reactivated"?"↩ Restarted":"✏ Dose changed"}</strong> — {c.name}</div>
            {c.detail&&<div className="hint">{c.detail}</div>}
            <div className="hint">{new Date(c.ts).toLocaleString()} · {c.source==="document"?"from a document":"entered by hand"} · {c.by}</div>
            </div>))}
            </div></details>
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
                    <td style={{fontSize:"0.9375rem",color:"#8d99ae"}}>{exp.receipt}</td>
                    {!isClient&&<td><button onClick={()=>setExpenseForm({mode:"edit",expense:{...exp},id:exp.id})} className="edit-icon edit-icon-visible">✎</button></td>}
                  </tr>)})}</tbody>
              </table></div>}
          </>)}

          {/* ═══ CALENDAR ═══ */}
          {view==="calendar"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">▦ Calendar</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Track appointments and important dates.</p></div>
              {!isClient&&<button onClick={()=>setApptForm({mode:"add",appt:{title:"",date:calSelected||fmtDate(calYear,calMonth,new Date().getDate()),time:"09:00",notes:""}})} className="save-btn">+ Appointment</button>}
            </div>
            {can("export-data")&&(<details className="settings-group" style={{marginTop:12}}><summary className="settings-group-summary"><span>📆 Add these appointments to my calendar</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
              <p className="hint" style={{marginTop:0}}>This creates a calendar file. Opening it adds the appointments to whichever calendar you already use — phone, tablet, or computer. Exporting again <strong>updates</strong> the same appointments rather than making duplicates, and an appointment you delete here is removed from your calendar on the next export.</p>
              <label className="cf-label" style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:10}}>
                <input type="checkbox" checked={icsIncludeNotes} onChange={e=>setIcsIncludeNotes(e.target.checked)}/>
                <span>Include appointment notes</span></label>
              <p className="hint" style={{marginTop:0}}>Notes often hold clinical detail. They stay out of the calendar unless you tick this. Each appointment can also carry a plainer <strong>calendar title</strong> — set it when other people can see your calendar.</p>
              <button className="save-btn" onClick={exportAllAppointmentsIcs}>Create calendar file</button>
              <p className="hint" style={{marginTop:8,marginBottom:0}}>On a phone, opening the file offers to add the appointments to your calendar app. Care Guardian cannot write to your calendar directly — no website can — so this one tap is the handover.</p>
            </div></details>)}
            {!isClient&&(<details className="settings-group" style={{marginTop:10}}><summary className="settings-group-summary"><span>🔀 Check my own calendar for clashes</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
              <p className="hint" style={{marginTop:0}}>Export your work or personal calendar as a <strong>.ics</strong> file and open it here. Care Guardian compares it against these appointments and flags clashes. It stays on this device — no account, no login, nothing sent anywhere.</p>
              <button className="save-btn" onClick={()=>extCalRef.current&&extCalRef.current.click()}>Choose a calendar file</button>
              {data.externalCal&&(<>
                <p className="hint" style={{marginTop:10}}>{(data.externalCal.events||[]).length} event(s) from <strong>{data.externalCal.source}</strong>, imported {new Date(data.externalCal.importedAt).toLocaleDateString()}. Only the title and time of each event are kept, for the next 120 days.</p>
                {(()=>{const c=getApptConflicts(); return c.length===0
                  ? <div className="sync-status sync-status-success">✓ No clashes with your appointments.</div>
                  : (<><div className="sync-status sync-status-error">⚠ {c.length} clash{c.length===1?"":"es"} found</div>
                      {c.map((h,i)=>(<div key={i} className="doc-section-card">
                        <strong>{icsCalendarTitle(h.appt)}</strong> <span className="hint">{h.appt.date} {h.appt.time}</span>
                        <div className="hint">clashes with “{h.event.title}”{h.allDay?" (all day)":" at "+h.event.time}</div>
                      </div>))}</>); })()}
                <button className="cancel-btn" style={{marginTop:8}} onClick={clearExtCal}>Remove imported calendar</button>
              </>)}
            </div></details>)}
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
                  {(()=>{ const c=(data.contacts||[]).find(x=>String(x.id)===String(a.contactId));
                    const where=a.location||(c&&c.org)||"";
                    if(!c&&!where) return null;
                    return (<div className="cal-appt-meta">
                      {where&&<span>📍 {where}</span>}
                      {/* The phone number is the thing a caregiver actually reaches for at an appointment —
                          running late, lost, or needing to reschedule. One tap, no digging through contacts. */}
                      {c&&c.phone&&<a href={"tel:"+String(c.phone).replace(/[^+\d]/g,"")} className="cal-appt-call">📞 {c.name}</a>}
                    </div>); })()}
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
                <thead><tr><th>Date</th>{DOMAINS.map(d=><th key={d.key} style={{fontSize:"0.9375rem"}}>{d.icon} {getDomLabel(d.key).split(" ")[0]}</th>)}<th>Triggers</th><th>Incidents</th></tr></thead>
                <tbody>{[...(data.statusHistory||[])].reverse().map((snap,i)=>(<tr key={i}>
                  <td style={{whiteSpace:"nowrap",fontWeight:600}}>{snap.date}</td>
                  {DOMAINS.map(d=>{const s=(snap.domains&&snap.domains[d.key]);const pct=(s&&s.pct)||0;const hColor=pct>=80?"#718355":pct>=40?"#bc6c25":"#b56576";return(
                    <td key={d.key}><span className="o-badge" style={{background:hColor+"18",color:hColor,fontSize:"0.9375rem"}}>{pct}%</span></td>)})}
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
                    {!isClient?<input type="checkbox" checked={done} onChange={()=>togglePostDeath(si,ii)} className="sub-check"/>:<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:"0.9375rem"}}>{done?"✓":"○"}</span>}
                    <span className="sub-text" style={{textDecoration:done?"line-through":"none",color:done?"#a09a92":"#3d3730"}}>{item}</span>
                  </label>)})}</div>
              </div>)})}
          </>)}

          {/* ═══ HELP ═══ */}
          {view==="help"&&(<>
            <h1 className="page-title">? Help & User Guide</h1>
            <p className="page-sub">How to use each feature of the Care Guardian.</p>
            {helpTopic&&HELP_TOPICS[helpTopic]&&(<div className="help-context"><div className="help-context-title">📍 Help for: {HELP_TOPICS[helpTopic]}</div><p className="hint" style={{margin:0}}>Step-by-step guidance for this screen is on its way. Until then, the general guide below covers every feature.</p><button className="mini-btn" style={{marginTop:6}} onClick={()=>setHelpTopic(null)}>Show general help</button></div>)}
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
                <button onClick={()=>srPhotoRef.current&&srPhotoRef.current.click()} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem"}}>📷 Add photo{srPhotos.length>0?" ("+srPhotos.length+")":""}</button>
                <input ref={srPhotoRef} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>handlePhotoCapture(e,setSrPhotos)}/>
                {srPhotos.length>0&&<button onClick={()=>setSrPhotos([])} className="cancel-btn" style={{fontSize:"0.9375rem",padding:"4px 10px"}}>Clear photos</button>}
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
          {view==="circle"&&(<>
            <h1 className="page-title">🔗 My Circle</h1>
            <p className="page-sub">Your own devices and a second caregiver, kept in sync under one encrypted key.</p>
            {circleUI.err&&<div className="sync-status sync-status-error">✗ {circleUI.err}</div>}
            {circleUI.scanFor&&(<div className="section"><h3 className="sec-title">📷 Scan the other device</h3><CircleScanner onScan={d=>{const t=circleUI.scanFor;setCircleUI(u=>({...u,scanFor:null}));if(t==="host")circleHostRespond(d);else circleJoinComplete(d);}} onClose={()=>setCircleUI(u=>({...u,scanFor:null}))}/></div>)}
            {!circleOf()?(
              <div className="section">
                <p className="hint">Set up a circle on your main device, then add your phone, tablet, or a co-caregiver. Everything stays end-to-end encrypted; the circle key never leaves your devices.</p>
                <div className="sync-methods">
                  <div className="sync-method-card" onClick={circleCreate}><div className="sync-method-icon">✦</div><div className="sync-method-info"><strong>Create a circle</strong><span>This is your main device</span></div></div>
                  <div className="sync-method-card" onClick={circleJoinStart}><div className="sync-method-icon">🔗</div><div className="sync-method-info"><strong>Join a circle</strong><span>In person, with another device</span></div></div>
                  <div className="sync-method-card" onClick={()=>setCircleUI({mode:"rjoin",host:null,join:null,err:""})}><div className="sync-method-icon">✉</div><div className="sync-method-info"><strong>Join with a code</strong><span>You were sent an invite + passphrase</span></div></div>
                </div>
                {circleUI.mode==="rjoin"&&(<div style={{marginTop:"0.85rem"}}>
                  <p className="hint">Paste the invite code, then the passphrase you were given separately.</p>
                  <textarea className="cf-input" id="rjCode" rows={3} placeholder="Invite code"/>
                  <input className="cf-input" id="rjPass" placeholder="six-word passphrase" style={{marginTop:"0.4rem"}}/>
                  <button className="save-btn" style={{marginTop:"0.5rem"}} onClick={()=>circleRemoteJoin(document.getElementById("rjCode").value,document.getElementById("rjPass").value)}>Join circle</button>
                </div>)}
              </div>
            ):(
              <div className="section">
                <h3 className="sec-title">👥 Devices &amp; caregivers</h3>
                <p className="hint">Circle <strong>{circleOf().id}</strong></p>
                {(data.circleRoster||[]).map(r=>(<div key={r.deviceId} className="sync-method-card" style={{cursor:"default"}}><div className="sync-method-icon">📱</div><div className="sync-method-info"><strong>{r.label}{r.deviceId===circleDeviceId()?" (this device)":""}</strong><span style={{fontFamily:"monospace"}}>{r.pub?r.pub.slice(0,16)+"…":"awaiting first sync"}</span></div>{circleIsAdmin()&&r.deviceId!==circleDeviceId()&&((r.pending||!r.pub)?<button className="cancel-btn" style={{marginLeft:"auto",padding:"0.25rem 0.6rem",fontSize:"0.9375rem"}} onClick={()=>{if(window.confirm("Cancel the invite for "+r.label+"? It won't be able to join or write to the circle."))circleCancelPending(r.deviceId)}}>Cancel</button>:<button className="cancel-btn" style={{marginLeft:"auto",padding:"0.25rem 0.6rem",fontSize:"0.9375rem"}} onClick={()=>{if(window.confirm("Remove "+r.label+"? It keeps its current copy but receives no future updates."))circleRotateNow(r.deviceId)}}>Remove</button>)}</div>))}
                <button className="save-btn" style={{marginTop:"0.75rem"}} onClick={()=>setCircleUI({mode:"host",host:null,join:null,err:""})}>Add a device</button>
                <button className="cancel-btn" style={{marginTop:"0.5rem"}} onClick={circleLeave}>Leave circle on this device</button>
                {!circleOf().relay?(
                  <div style={{marginTop:"1rem",paddingTop:"0.75rem",borderTop:"1px solid var(--color-border)"}}>
                    <h3 className="sec-title">📡 Sync relay</h3>
                    <p className="hint">Connect a relay so your circle devices exchange records automatically. The relay only ever holds ciphertext — it can't read your data.</p>
                    <input className="cf-input" id="relayBase" placeholder="https://your-relay.example"/>
                    <input className="cf-input" id="relayAdmin" placeholder="Relay admin token" style={{marginTop:"0.4rem"}}/>
                    <button className="save-btn" style={{marginTop:"0.5rem"}} onClick={()=>circleConnectRelay(document.getElementById("relayBase").value,document.getElementById("relayAdmin").value)}>Connect relay</button>
                  </div>
                ):(
                  <div style={{marginTop:"1rem",paddingTop:"0.75rem",borderTop:"1px solid var(--color-border)"}}>
                    <h3 className="sec-title">📡 Sync</h3>
                    <p className="hint">Relay connected: <strong>{circleOf().relay.base}</strong>{(data._sync&&data._sync.lastSync)?" · last sync "+new Date(data._sync.lastSync).toLocaleString():""}</p>
                    <button className="save-btn" onClick={circleSyncNow}>Sync now</button>{circleIsAdmin()&&<button className="cancel-btn" style={{marginTop:"0.5rem"}} onClick={()=>circleRotateNow(null)}>Rotate key now</button>}
                    {circleIsAdmin()&&<><button className="cancel-btn" style={{marginTop:"0.5rem"}} onClick={circleRemoteInvite}>Invite a remote caregiver</button>
                    {circleUI.remote&&(<div style={{marginTop:"0.6rem",padding:"0.6rem",background:"var(--color-background-info)",borderRadius:"8px"}}>
                      <p className="hint" style={{marginTop:0}}>Send these to your co-caregiver over <strong>two different channels</strong> (e.g. the code by message, the passphrase by phone). The invite is single-use.</p>
                      <strong style={{fontSize:"0.9375rem"}}>Invite code</strong>
                      <textarea className="cf-input" readOnly rows={3} value={circleUI.remote.code} onFocus={e=>e.target.select()}/>
                      <strong style={{fontSize:"0.9375rem"}}>Passphrase (separate channel)</strong>
                      <input className="cf-input" readOnly value={circleUI.remote.pass} onFocus={e=>e.target.select()} style={{fontFamily:"monospace"}}/>
                      <p className="hint" style={{marginTop:"0.4rem",marginBottom:"0.4rem"}}>Single-use · expires {new Date(circleUI.remote.expiresAt).toLocaleString()}. If you think both the code and passphrase leaked, also use <strong>Rotate key now</strong> above.</p>
                      <button className="cancel-btn" onClick={()=>circleCancelPending(circleUI.remote.assignedId,circleUI.remote.inviteId)}>Cancel this invite</button>
                    </div>)}</>}
                  </div>
                )}
              </div>
            )}
            {circleUI.mode==="host"&&circleOf()&&(
              <div className="section">
                <h3 className="sec-title">Add a device</h3>
                {!circleUI.host?(<>
                  <p className="hint">On the <strong>new</strong> device open My Circle → "Join a circle", then scan its QR or paste its code here.</p>
                  <button className="save-btn" onClick={()=>setCircleUI(u=>({...u,scanFor:"host"}))}>📷 Scan the new device's code</button>
                  <textarea className="cf-input" id="hostIn" rows={3} placeholder="…or paste the new device's code" style={{marginTop:"0.5rem"}}/>
                  <button className="save-btn" onClick={()=>circleHostRespond(document.getElementById("hostIn").value)}>Continue</button>
                  <button className="cancel-btn" onClick={()=>setCircleUI({mode:null,host:null,join:null,err:""})}>Cancel</button>
                </>):(<>
                  <p className="hint">Let the new device <strong>scan this</strong> (or paste the code below):</p>
                  <div style={{textAlign:"center",margin:"0.5rem 0"}}><CircleQR value={circleUI.host.qr2} size={240}/></div>
                  <textarea className="cf-input" readOnly rows={3} value={circleUI.host.qr2} onFocus={e=>e.target.select()}/>
                  <div className="sync-status sync-status-success">Confirm this 6-digit code matches on both devices: <strong>{circleUI.host.sas}</strong></div>
                  <button className="save-btn" onClick={()=>setCircleUI({mode:null,host:null,join:null,err:""})}>Done</button>
                </>)}
              </div>
            )}
            {circleUI.mode==="join"&&circleUI.join&&(
              <div className="section">
                <h3 className="sec-title">Join a circle</h3>
                {!circleUI.join.done?(<>
                  <p className="hint">1 — let your <strong>existing</strong> device scan this (or paste the code on it):</p>
                  <div style={{textAlign:"center",margin:"0.5rem 0"}}><CircleQR value={circleUI.join.qr1} size={240}/></div>
                  <textarea className="cf-input" readOnly rows={3} value={circleUI.join.qr1} onFocus={e=>e.target.select()}/>
                  <p className="hint">2 — scan the existing device's response, or paste it here:</p>
                  <button className="save-btn" onClick={()=>setCircleUI(u=>({...u,scanFor:"join"}))}>📷 Scan the response</button>
                  <textarea className="cf-input" id="joinIn" rows={3} placeholder="…or paste the existing device's response" style={{marginTop:"0.5rem"}}/>
                  <button className="save-btn" onClick={()=>circleJoinComplete(document.getElementById("joinIn").value)}>Join</button>
                  <button className="cancel-btn" onClick={()=>setCircleUI({mode:null,host:null,join:null,err:""})}>Cancel</button>
                </>):(<>
                  <div className="sync-status sync-status-success">Joined ✓ — confirm this 6-digit code matches the other device: <strong>{circleUI.join.sas}</strong></div>
                  <button className="save-btn" onClick={()=>setCircleUI({mode:null,host:null,join:null,err:""})}>Done</button>
                </>)}
              </div>
            )}
          </>)}
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
                    {isAdmin&&m.deviceId!==(data.settings&&data.settings.deviceId)&&<select value={m.role_key||"family"} onChange={e=>{const newKey=e.target.value;setData(p=>{const team={...p.settings.team,members:p.settings.team.members.map(x=>x.deviceId===m.deviceId?{...x,role_key:newKey}:x)};return{...p,settings:{...p.settings,team}}});flash(`${m.name} is now ${(ROLES.find(r=>r.key===newKey)||{}).label}`)}} className="cf-select" style={{width:"auto",fontSize:"0.9375rem",padding:"4px 8px"}}>{ROLES.filter(r=>!r.key.startsWith("client")).map(r=>(<option key={r.key} value={r.key}>{r.icon} {r.label}</option>))}</select>}
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
                <button onClick={()=>setShowAdvancedSync(false)} className={`cc-btn ${!showAdvancedSync?"cc-active":""}`}>☁️ Cloud Sync</button>
                <button onClick={()=>setShowAdvancedSync(true)} className={`cc-btn ${showAdvancedSync?"cc-active":""}`}>🖥 Self-Hosted</button>
              </div>

              {!showAdvancedSync?(<>
                {/* Cloud-storage method — the seamless, cross-platform path (works the same on iOS, Android, desktop) */}
                {cloudConfigured()?(<div className="cloud-connected-info">
                  <div className="cloud-connected-icon">{(CLOUD_PROVIDERS[getCloudAuth().provider]||{}).icon||"☁️"}</div>
                  <div className="cloud-connected-details">
                    <div className="cloud-connected-file">{(CLOUD_PROVIDERS[getCloudAuth().provider]||{}).label||"Cloud"} connected</div>
                    <div className="cloud-connected-meta">Syncs across all your devices · {(data._sync&&data._sync.lastSync)?("Last sync: "+new Date(data._sync.lastSync).toLocaleString()):"Tap Sync Now below"}</div>
                  </div>
                  <button onClick={cloudDisconnectStorage} className="cancel-btn" style={{flexShrink:0}}>Disconnect</button>
                </div>):(<>
                  <p className="hint" style={{marginTop:2}}>Connect your own cloud storage. Your data is encrypted on this device first, so the provider only ever holds an unreadable file in a private app folder — and it syncs the same on iPhone, iPad, Android, and computers.</p>
                  {unavailableProviders.length>0&&(<p className="hint" style={{marginTop:6}}>{unavailableProviders.map(id=>CLOUD_PROVIDERS[id].label).join(", ")} {unavailableProviders.length===1?"is":"are"} not offered here: {CLOUD_PROVIDERS[unavailableProviders[0]].unavailable} Dropbox and OneDrive connect without one.</p>)}
                  {(()=>{ const fs=storageFailState(); if(!fs) return null; const ui=storageFailUI(fs.cls);
                    return (<div className={"storage-fail"+(ui.alarm?" storage-fail-alarm":"")}>
                      <div className="storage-fail-title">{ui.title}</div>
                      <p className="hint" style={{margin:"4px 0 0"}}>{ui.body}</p>
                      {ui.retry&&fs.nextAttemptAt&&<p className="hint" style={{margin:"4px 0 0"}}>Next attempt {new Date(fs.nextAttemptAt).toLocaleTimeString()}. Nothing is lost in the meantime.</p>}
                      <div className="storage-fail-acts">
                        {ui.action==="reconnect"&&<button className="save-btn" style={{margin:0}} onClick={reconnectStorage}>Reconnect</button>}
                        {ui.action==="reupload"&&<button className="save-btn" style={{margin:0}} onClick={reuploadEverything}>Upload everything again</button>}
                        <button className="text-btn" style={{margin:0}} onClick={cloudStorageSync}>Try now</button>
                      </div>
                    </div>); })()}
                  {(()=>{ const auth=getCloudAuth(); if(!auth) return null;
                    const caps=storageCaps(auth.provider);
                    const st=storageStaleness((data._sync&&(data._sync.lastCloudOk||data._sync.lastSync))||null);
                    const pending=outboxPending();
                    return (<div className="storage-state">
                      <div className="storage-state-row">
                        <span className={"storage-dot storage-dot-"+(pending?"pending":st.level)}/>
                        <span>{pending?(pending+" change"+(pending===1?"":"s")+" waiting to upload")
                          :st.level==="never"?"Nothing uploaded yet"
                          :st.days===0?"Cloud copy is up to date":("Cloud copy is "+st.days+" day"+(st.days===1?"":"s")+" old")}</span>
                      </div>
                      {st.stale&&(<p className="hint" style={{marginTop:6,marginBottom:0}}>{caps.auth==="session"
                        ? "Your cloud copy is out of date. "+caps.label+" can only save while you have Care Guardian open — tap Sync now to bring it up to date."
                        : "Your cloud copy hasn't updated in a while. Tap Sync now, and reconnect "+caps.label+" if it asks."}</p>)}
                      {caps.note&&<p className="hint" style={{marginTop:6,marginBottom:0}}>{caps.note}</p>}
                      {pending>0&&<p className="hint" style={{marginTop:6,marginBottom:0}}>Nothing is lost — those changes are saved on this device and will upload on the next successful sync.</p>}
                    </div>); })()}
                  {configuredProviders.length>0?(<div className="cloud-provider-btns">
                    {configuredProviders.map(id=>{const p=CLOUD_PROVIDERS[id];return(
                      <button key={id} onClick={()=>cloudConnectStart(id)} className="cloud-provider-btn">
                        <span className="cloud-provider-icon">{p.icon}</span>
                        <span className="cloud-provider-text"><strong>Connect {p.label}</strong><span>One tap, then it syncs everywhere</span></span>
                      </button>);})}
                  </div>):(<div className="sync-ios-note" style={{marginTop:10}}>
                    <div className="sync-ios-note-head">Cloud sync isn't set up on this deployment yet</div>
                    <p className="hint" style={{marginTop:6}}>One-tap cloud sync (Dropbox, Google Drive, OneDrive) needs provider keys configured at deploy time — see DEPLOY.md. Until then, the methods below work everywhere, including iOS.</p>
                  </div>)}
                  <p className="hint" style={{marginTop:8,fontSize:"0.9375rem"}}>On a desktop browser you can also <button className="linklike" onClick={()=>setShowFolderMethod(s=>!s)}>use a local synced folder</button> or a self-hosted server.</p>
                  {(showFolderMethod&&hasFileSystemAccess)&&(<div style={{marginTop:10}}>
                    {!cloudConnected?(<>
                      <div className="cloud-setup-steps">
                        <div className="cloud-step"><span className="cloud-step-num">1</span><span>Create a shared folder in Google Drive, Dropbox, iCloud, or OneDrive</span></div>
                        <div className="cloud-step"><span className="cloud-step-num">2</span><span>Tap below — save the sync file into that shared folder</span></div>
                        <div className="cloud-step"><span className="cloud-step-num">3</span><span>Each device selects the same file</span></div>
                      </div>
                      <button onClick={cloudConnect} className="save-btn" style={{marginTop:12}}>📁 Connect Local Folder</button>
                    </>):(<div className="cloud-connected-info">
                      <div className="cloud-connected-icon">📁</div>
                      <div className="cloud-connected-details">
                        <div className="cloud-connected-file">{cloudFileName}</div>
                        <div className="cloud-connected-meta">{(data._sync&&data._sync.lastSync)&&<span>Last sync: {new Date(data._sync.lastSync).toLocaleString()}</span>}</div>
                      </div>
                      <button onClick={cloudDisconnect} className="cancel-btn" style={{flexShrink:0}}>Disconnect</button>
                    </div>)}
                  </div>)}
                  {(showFolderMethod&&!hasFileSystemAccess)&&<p className="hint" style={{marginTop:8}}>{isIOSDevice?"A local synced folder needs a desktop browser — but Connect Dropbox above gives you the same automatic sync right here on iOS.":"A local synced folder needs Chrome, Edge, or Brave on desktop. Connect Dropbox above works in this browser."}</p>}
                </>)}
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
            {(cloudConfigured()||cloudConnected||getServerUrl())&&(<div className="sync-main-action">
              <button onClick={syncNow} disabled={cloudSyncing||!getSyncPasscode()} className="cloud-sync-btn">
                {cloudSyncing?<><span className="doc-spinner" style={{borderTopColor:"#fff",borderColor:"rgba(255,255,255,.3)",width:18,height:18}}/>Syncing...</>:"📡 Sync Now"}
              </button>
              <p className="hint" style={{textAlign:"center",marginTop:8}}>Pulls team changes, merges, and pushes your updates — all in one tap.</p>
            </div>)}

            {/* Advanced / Manual Options */}
            <details id="manual-sync" className="sync-advanced" open={!cloudConnected&&(!hasFileSystemAccess||isIOSDevice)}>
              <summary className="sync-advanced-summary">⚙ Manual sync options</summary>
              <div className="sync-advanced-content">
                <p className="hint">{isIOSDevice?"The reliable way to sync on iPhone & iPad: push your updates as an encrypted file, and pull your team's the same way.":"Use these if your browser doesn't support cloud sync, or if you prefer to share updates via messaging apps."}</p>
                <h4 className="sync-sub-title">⬆ Push</h4>
                <div className="sync-methods">
                  {hasWebShare&&(<div className="sync-method-card sync-method-primary" onClick={()=>syncPush("share")}>
                    <div className="sync-method-icon">📤</div>
                    <div className="sync-method-info"><strong>Share Encrypted File</strong><span>Save to Files / iCloud, or send to team</span></div>
                  </div>)}
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
                  <div className="sync-method-card" onClick={()=>syncFileRef.current&&syncFileRef.current.click()}>
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
                  <textarea value={syncPullText} onChange={e=>setSyncPullText(e.target.value)} className="notes-ta" rows={3} placeholder='Paste encrypted sync data here...' style={{fontFamily:"monospace",fontSize:"0.9375rem"}}/>
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
              {hasTeam()?(<div className="msg-sender"><div className="team-member-avatar" style={{width:28,height:28,fontSize:"0.9375rem"}}>{myName?myName[0].toUpperCase():"?"}</div><span className="msg-sender-name">{myName}{myRole&&<span className="msg-sender-role"> · {myRole}</span>}</span></div>
              ):(<input value={msgFrom} onChange={e=>setMsgFrom(e.target.value)} placeholder="Your name" className="cf-input" style={{width:160}}/>)}
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(hasTeam()?myName:msgFrom.trim())&&msgText.trim()&&sendMessage()} placeholder="Type a message…" className="cf-input" style={{flex:1}}/>
              <button onClick={()=>{if(hasTeam()&&myName){setMsgFrom(myName)}sendMessage()}} disabled={!msgText.trim()||!(hasTeam()?myName:msgFrom.trim())} className="save-btn" style={{opacity:msgText.trim()&&(hasTeam()?myName:msgFrom.trim())?1:.4}}>Send</button>
            </div>}
            <div className="msg-list">
              {(data.messages||[]).length===0?<p className="contacts-empty">No messages yet.{!hasTeam()?" Set up a care team in the Sync tab to get started.":""}</p>:
                [...(data.messages||[])].reverse().map(m=>{const member=getMemberInfo(m.from);const isMe=m.from===myName;return(<div key={m.id} className={`msg-bubble ${isMe?"msg-self":""}`}>
                  <div className="msg-meta">
                    {member&&<div className="team-member-avatar" style={{width:24,height:24,fontSize:"0.9375rem",background:isMe?"#457b9d":"#8d99ae"}}>{m.from[0].toUpperCase()}</div>}
                    <strong>{m.from}</strong>{member&&<span className="msg-role">{member.role}</span>}
                    <span className="msg-time">{m.timestamp}</span>
                  </div>
                  <p className="msg-text">{m.text}</p>
                </div>)})}
            </div>
          </>)})()}

          {/* ═══ SETTINGS ═══ */}
          {view==="program"&&(<>
            <h1 className="page-title">🤝 Share with a care program</h1>
            <p className="page-sub">A scoped, consented view for a care navigator or program reviewer.</p>
            {!grantFlow&&(<>
              {activeGrants.length>0&&(<div className="settings-group-body">
                {activeGrants.map(g=>{const arch=GRANT_ARCHETYPES[g.archetype]||GRANT_ARCHETYPES.navigator;const live=!!g.transport;const auto=live&&g.transport.autoPush;return(
                  <div key={g.grantId} className="section">
                    <div className="prog-active"><span className="prog-eye">👁</span>
                      <div className="prog-active-main"><strong>{g.institution}</strong> has a {arch.label.toLowerCase()} view.
                        <div className="prog-upd">Last sent {g.lastPushAt?new Date(g.lastPushAt).toLocaleDateString():"—"} · ends {g.expiresAt?g.expiresAt.slice(0,10):"—"}</div>
                        {live&&<span className={"prog-pill"+(auto?" on":"")}>{auto?"Auto-send on":"Manual sending"}</span>}</div></div>
                    <div className="prog-actions">
                      {live?<button className="edit-btn" disabled={grantBusy} onClick={()=>pushGrantLive(g,setGrantBusy)} style={{marginTop:0}}>↑ Send now</button>
                           :<button className="edit-btn" disabled={grantBusy} onClick={()=>refreshGrant(g,setGrantBusy)} style={{marginTop:0}}>↻ Update file</button>}
                      {live&&<button className="prog-toggle" onClick={()=>setGrantAutoPush(g,!auto)}>{auto?"Switch to manual":"Turn on auto-send"}</button>}
                      <button className="prog-stop" onClick={()=>{if(window.confirm("Stop sharing with "+g.institution+"?\n\nThey'll receive no further updates, starting now. Information they've already seen or saved can't be pulled back."))revokeGrant(g)}}>Stop sharing</button>
                    </div>
                  </div>)})}
              </div>)}
              <div className="section">
                <p className="hint">A care program (such as a CMS GUIDE navigator) can be granted a <strong>scoped, consented, revocable</strong> view of your situation — encrypted so only they can open it, updated only when you choose. Your parent's private words are never shared.</p>
                <button className="save-btn" onClick={()=>setGrantFlow({step:"enroll",code:""})}>＋ Set up a care program view</button>
              </div>
            </>)}
            {grantFlow&&grantFlow.step==="enroll"&&(
              <div className="section">
                <h3 className="sec-title">Enrollment code</h3>
                <p className="hint">Paste the code the program gave you. It identifies them and carries their public key — no secret is exchanged.</p>
                <textarea className="grant-ta" value={grantFlow.code} onChange={e=>setGrantFlow(f=>({...f,code:e.target.value}))} placeholder="Paste enrollment code…" rows={4}/>
                <button className="save-btn" onClick={()=>{try{const enroll=parseEnrollment(grantFlow.code);setGrantFlow({step:"consent",enroll,scope:{...GRANT_ARCHETYPES[enroll.archetype].defaults},expiresAt:new Date(Date.now()+(enroll.defaultExpiresDays||180)*864e5).toISOString(),attested:false,fpOk:false,autoPush:!!enroll.intake})}catch(e){flash(e.message)}}}>Continue</button>
                <button className="prog-cancel" onClick={()=>setGrantFlow(null)}>Cancel</button>
              </div>
            )}
            {grantFlow&&grantFlow.step==="consent"&&(()=>{const en=grantFlow.enroll,arch=GRANT_ARCHETYPES[en.archetype],parentName=(data.settings&&data.settings.clientName)||"your parent";return(
              <div className="section consent-card">
                <div className="consent-who"><strong>{en.institution}</strong> wants to set up a <strong>{arch.label.toLowerCase()}</strong> view for {parentName}.
                  {en.fingerprint&&(<div className="consent-fp"><div className="consent-fp-code">{en.fingerprint}</div><div className="consent-fp-q">Confirm this matches the code on the program's enrollment paperwork.</div>
                    <label className="consent-fp-match"><input type="checkbox" checked={grantFlow.fpOk} onChange={e=>setGrantFlow(f=>({...f,fpOk:e.target.checked}))}/> It matches</label></div>)}
                </div>
                <div className="consent-blk"><h4>✓ What they'll see <span className="consent-mut">— tap to turn any off</span></h4>
                  {arch.cats.map(([k,label])=>(<label key={k} className="consent-row"><span>{label}</span><input type="checkbox" checked={!!grantFlow.scope[k]} onChange={e=>setGrantFlow(f=>({...f,scope:{...f.scope,[k]:e.target.checked}}))}/></label>))}
                </div>
                <div className="consent-blk"><h4>🔒 What they will <em>not</em> see</h4><div className="consent-excl">{arch.excludes.map((x,i)=>(<div key={i} className="consent-x">🚫 {x}</div>))}</div></div>
                <div className="consent-blk"><h4>📅 How long</h4><input type="date" className="grant-date" value={grantFlow.expiresAt.slice(0,10)} onChange={e=>{const v=e.target.value;if(v)setGrantFlow(f=>({...f,expiresAt:new Date(v).toISOString()}))}}/></div>
                {en.intake&&(<div className="consent-blk"><h4>📤 How should updates reach them?</h4>
                  <label className={"consent-choice"+(!grantFlow.autoPush?" sel":"")}><input type="radio" name="cg-ap" checked={!grantFlow.autoPush} onChange={()=>setGrantFlow(f=>({...f,autoPush:false}))}/><span><strong>Only when I choose</strong> — a file you send by hand. Nothing leaves until you act.</span></label>
                  <label className={"consent-choice"+(grantFlow.autoPush?" sel":"")}><input type="radio" name="cg-ap" checked={!!grantFlow.autoPush} onChange={()=>setGrantFlow(f=>({...f,autoPush:true}))}/><span><strong>Automatically when I sync</strong> — an encrypted update is sent to {en.institution} each time you sync your team. Switch off anytime. <em>(default)</em></span></label>
                </div>)}
                <p className="consent-plain">{en.intake&&grantFlow.autoPush?"Updates are encrypted so only "+en.institution+" can open them, are sent only when you sync (never silently in the background), and you can stop anytime.":"The program sees your information as of the last file you send — not live. You can stop anytime."}</p>
                <label className="consent-attest"><input type="checkbox" checked={grantFlow.attested} onChange={e=>setGrantFlow(f=>({...f,attested:e.target.checked}))}/> I'm {parentName}'s authorized caregiver and have the authority to share this.</label>
                <button className="save-btn" disabled={grantBusy||!grantFlow.attested||(!!en.fingerprint&&!grantFlow.fpOk)||!Object.values(grantFlow.scope).some(Boolean)} onClick={async()=>{const ok=await createGrant(en,grantFlow.scope,grantFlow.expiresAt,grantFlow.autoPush,setGrantBusy);if(ok)setGrantFlow(null)}}>{grantBusy?(grantFlow.autoPush?"Sending…":"Sealing…"):"Grant "+arch.label.toLowerCase()+" view"}</button>
                <button className="prog-cancel" onClick={()=>setGrantFlow(null)}>Cancel</button>
              </div>
            )})()}
          </>)}
          {view==="settings"&&(<>
            <h1 className="page-title">⚙ Settings</h1>
            {isClient?<p className="page-sub">Settings are only available to caregivers.</p>:(<>
              <p className="page-sub">Protect, back up, and share your data.</p>
              <details className="settings-group" open><summary className="settings-group-summary"><span>🛡 Protect Your Data</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
              <div className="protect-steps">
                <h3 className="protect-title">Three Steps to Protect Your Data</h3>
                <p className="protect-sub">Each one is a single tap. You'll see a check when it's set.</p>
                {/* These were three lines of text with status badges; only the first had a button, and the real
                    controls lived in separate sections further down the same page titled "(Step 1)", "(Step 2)".
                    Now each step IS its control. */}
                <div className="protect-step"><span className="protect-num">1</span><div className="protect-main">
                  <div className="protect-text"><strong>Stop your browser deleting your records.</strong> Browsers clear stored data when a device runs low on space.</div>
                  <div className="protect-foot">{storageDurable===true?<span className="protect-badge done">✓ Protected</span>:(!isIOSDevice?<button className="protect-btn" onClick={async()=>{const ok=await requestPersistentStorage();setStorageDurable(ok);if(ok){setStorageAtRisk(false);flash("Protected — your browser will keep your data.")}else{flash("Your browser didn't grant it. A backup covers you either way.")}}}>Protect my data</button>:<span className="protect-ios">On iPhone: Share → Add to Home Screen</span>)}</div>
                </div></div>
                <div className="protect-step"><span className="protect-num">2</span><div className="protect-main">
                  <div className="protect-text"><strong>Keep a safety copy.</strong> An encrypted <code>.care</code> file that survives a lost or broken device.</div>
                  <div className="protect-foot">{(()=>{ const st=backupState(data,backupFp);
                    if(backupStatus==="active"&&st.state==="up-to-date") return (<><span className="protect-badge done">✓ Saving automatically</span><span className="protect-when">{lastAutoBackupAt?"saved "+relTime(lastAutoBackupAt):""}</span></>);
                    if(backupStatus==="paused") return (<><span className="protect-badge not">⚠ Paused</span><button className="protect-btn" onClick={resumeBackup}>Reconnect the file</button></>);
                    if(st.state==="up-to-date") return (<><span className="protect-badge done">✓ Up to date</span><button className="protect-btn" onClick={backupNow}>Back up again</button></>);
                    if(st.state==="behind") return (<><span className="protect-badge not">{st.changed} change{st.changed===1?"":"s"} not saved</span><button className="protect-btn" onClick={backupNow}>Save now</button></>);
                    return (<><span className="protect-badge not">○ No copy yet</span>{hasFileSystemAccess?<button className="protect-btn" onClick={setupContinuousBackup}>Set up automatic backups</button>:<button className="protect-btn" onClick={backupNow}>Download a copy</button>}</>); })()}</div>
                </div></div>
                <div className="protect-step"><span className="protect-num">3</span><div className="protect-main">
                  <div className="protect-text"><strong>Know how to get back in.</strong> Your recovery kit is the only way in if every device is lost.</div>
                  <div className="protect-foot">{hasRecoveryKit()?<span className="protect-badge done">✓ Created</span>:<button className="protect-btn" onClick={()=>{ const el=document.getElementById("security-group");
                    if(el){ el.open=true; el.scrollIntoView({behavior:"smooth",block:"start"}); flash("Your recovery kit is here, under Security & Integrity."); }
                    else flash("Open Settings → Security & Integrity to create your recovery kit."); }}>Create my recovery kit</button>}</div>
                </div></div>
                {/* Team/circle moved to Team Management (David's decision) — it is a collaboration feature, and
                    listing it here framed it as a protection step. A pointer stays, because multi-device copies
                    genuinely do add durability. */}
                {/* Diagnostic, because "why is there no install option?" was unanswerable from the outside. This
                    reports what the BROWSER says, so a support conversation starts from facts rather than guesses
                    about menus. */}
                <details className="settings-group" style={{marginTop:12}}><summary className="settings-group-summary"><span>Storage &amp; install status</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
                  <div className="diag-row"><span>Running as an installed app</span><strong>{isStandaloneNow()?"Yes":"No"}</strong></div>
                  <div className="diag-row"><span>Browser offered an install prompt</span><strong>{canInstall()?"Yes":(isIOS?"Not applicable on iPhone":"No")}</strong></div>
                  <div className="diag-row"><span>Storage marked persistent</span><strong>{storageDurable===true?"Yes":storageDurable===false?"No":"Unknown"}</strong></div>
                  <div className="diag-row"><span>Safety copy</span><strong>{backupState(data,backupFp).state==="up-to-date"?"Up to date":backupState(data,backupFp).state==="behind"?"Behind":"None yet"}</strong></div>
                  {canInstall()&&<button className="protect-btn" style={{marginTop:8}} onClick={installApp}>Install Care Guardian</button>}
                  <p className="hint" style={{marginTop:8,marginBottom:0}}>If your browser hasn't offered an install prompt, Care Guardian can't create one — that decision belongs to the browser. It changes nothing about your records: they stay on this device either way, and a backup file is the safeguard that doesn't depend on any of this.</p>
                </div></details>
                <p className="protect-pointer">Caring with other people? Setting up <button className="link-btn" onClick={()=>nav("circle")}>My Circle</button> keeps everyone in step and puts a copy of the records on each device.</p>
              </div>
              <div className="section">
                <h3 className="sec-title">🛡️ Storage durability (Step 1)</h3>
                {storageDurable===true?(
                  <p className="hint" style={{color:"#6F8A5F"}}>✓ Your browser is keeping Care Guardian's data in durable storage — it won't be cleared during routine cleanup.</p>
                ):storageDurable==="unsupported"?(
                  <p className="hint">This browser doesn't report storage durability. Your data still lives only on this device — keep a recent encrypted backup so nothing is lost.</p>
                ):storageDurable===false?(<>
                  <p className="hint">{isIOSDevice?"On iPhone & iPad, durable storage comes from adding Care Guardian to your home screen (Share → Add to Home Screen). Keep a recent backup too.":"Your browser hasn't granted durable storage yet, so records could be cleared if the device runs low on space. Ask your browser to keep them:"}</p>
                  {!isIOSDevice&&<button onClick={async()=>{const ok=await requestPersistentStorage();setStorageDurable(ok);if(ok){setStorageAtRisk(false);flash("Durable storage granted — your records are protected.")}else{flash("Your browser didn't grant durable storage this time. Keep a backup as a safety net.")}}} className="save-btn" style={{marginTop:8}}>🛡️ Protect my data</button>}
                </>):(
                  <p className="hint">Checking storage durability…</p>
                )}
              </div>
              <div className="section"><h3 className="sec-title">Automatic backups (Step 2)</h3>
                <p className="hint">Automatically save an encrypted copy to a file on your device or cloud folder every time your data changes — so a browser clearing its storage never costs you your records. {hasFileSystemAccess?"":(isIOSDevice?"(Automatic background backup isn't available on iPhone or iPad — Apple requires all iOS browsers to use WebKit. Use the manual Share/Download backup below instead.)":"(Automatic background backup needs a desktop browser. Use manual backup below.)")}</p>
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
              <div className="section"><h3 className="sec-title">Save or restore a .care file (Step 2)</h3>
                <p className="hint">Export your data with AES-256-GCM encryption. Import merges intelligently — new items are added, more recent changes win. Your passcodes and device ID are never overwritten.</p>
                <div className="settings-row"><input value={exportPw} onChange={e=>setExportPw(e.target.value)} className="cf-input" placeholder="Export passcode" type="password" style={{width:200}}/><button onClick={handleEncryptedExport} className="save-btn">↓ Export Encrypted</button></div>
                <div className="settings-row" style={{marginTop:12}}><input value={importPw} onChange={e=>setImportPw(e.target.value)} className="cf-input" placeholder="Import passcode" type="password" style={{width:200}}/><button onClick={()=>importFileRef.current&&importFileRef.current.click()} className="save-btn" style={{background:"#457b9d"}}>↑ Import & Merge</button></div>
                <p className="hint" style={{marginTop:12}}>Workflow: team member exports → shares file via text/Signal/AirDrop/Drive → you import → merge preview shows changes → you confirm.</p>
              </div>
              </div></details>
              <details className="settings-group" id="security-group"><summary className="settings-group-summary"><span>🔒 Security &amp; Integrity</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
              {can("change-passcodes")&&<div className="section"><h3 className="sec-title">Passcodes</h3>
                <div className="cf-grid" style={{maxWidth:400}}>
                  <label className="cf-label">Caregiver passcode<input value={newCaregiverPw} onChange={e=>setNewCaregiverPw(e.target.value)} className="cf-input" placeholder="New caregiver passcode"/></label>
                  <label className="cf-label">Client (read-only) passcode<input value={newClientPw} onChange={e=>setNewClientPw(e.target.value)} className="cf-input" placeholder="New client passcode"/></label>
                </div>
                <button onClick={updatePasscodes} className="save-btn" style={{marginTop:12}}>Update Passcodes</button>
              </div>
              }
              <div className="section">
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
              <div className="section">
                <p className="hint">Storage key: {SKEY} · Device: {(data.settings&&data.settings.deviceName)||(data.settings&&data.settings.deviceId)||"unnamed"} · Contacts: {(data.contacts&&data.contacts.length)||0} · Appointments: {(data.appointments&&data.appointments.length)||0} · Messages: {(data.messages&&data.messages.length)||0} · Incidents: {(data.incidents&&data.incidents.length)||0} · Expenses: {(data.expenses&&data.expenses.length)||0} · Meds: {getMedSchedule().medications.length} · Self-reports: {(data.selfReports&&data.selfReports.length)||0} · Docs: {(data.savedDocs&&data.savedDocs.length)||0}</p>
              </div>
              </div></details>
              <details className="settings-group"><summary className="settings-group-summary"><span>👥 Team Management</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
            <div className="hub-card" onClick={()=>nav("circle")}><div className="hub-card-icon" style={{background:"#dff3ef"}}><span>🔗</span></div><div className="hub-card-body"><div className="hub-card-title">My Circle{circleOf()?" · "+((data.circleRoster||[]).length)+" device(s)":""}</div><div className="hub-card-sub">{circleOf()?"Your synced devices & caregivers":"Set up multi-device sync"}</div></div><span className="hub-card-arr">›</span></div>
            <div className="hub-card" onClick={()=>nav("sync")}><div className="hub-card-icon" style={{background:"var(--color-background-info)"}}><span style={{color:"var(--color-text-info)"}}>📡</span></div><div className="hub-card-body"><div className="hub-card-title">Sync</div><div className="hub-card-sub">{(data._sync&&data._sync.lastSync)?"Last: "+new Date(data._sync.lastSync).toLocaleString():"Not yet synced"}</div></div><span className="hub-card-arr">›</span></div>
            {can("view-shifts")&&<div className="hub-card" onClick={()=>nav("schedule")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🗓</span></div><div className="hub-card-body"><div className="hub-card-title">Care schedule <span className="pill pill-b">{(data.careShifts||[]).filter(s=>new Date(s.date)>=new Date(new Date().toDateString())).length}</span></div><div className="hub-card-sub">Shifts, open shifts, swaps, visit logging</div></div><span className="hub-card-arr">›</span></div>}
            {can("view-shifts")&&<div className="hub-card" onClick={()=>nav("shifts")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>👥</span></div><div className="hub-card-body"><div className="hub-card-title">Weekly grid</div><div className="hub-card-sub">Simple recurring shift pattern</div></div><span className="hub-card-arr">›</span></div>}
              <div className="hub-card" onClick={()=>nav("availability")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>🕐</span></div><div className="hub-card-body"><div className="hub-card-title">My availability</div><div className="hub-card-sub">Tell the team when you can take shifts</div></div><span className="hub-card-arr">›</span></div>
              <div className="section"><h3 className="sec-title">📡 Device Identity & Sync</h3>
                <p className="hint">Each device has a unique ID used during sync. Set a name so team members know whose backup is whose.</p>
                <div className="cf-grid" style={{maxWidth:400}}>
                  <label className="cf-label">Device name<input value={(data.settings&&data.settings.deviceName)||""} onChange={e=>setData(p=>({...p,settings:{...p.settings,deviceName:e.target.value}}))} className="cf-input" placeholder="e.g., David's phone, Sarah's laptop"/></label>
                  <label className="cf-label">Device ID<input value={(data.settings&&data.settings.deviceId)||""} readOnly className="cf-input" style={{color:"#a09a92",fontSize:"0.9375rem"}}/></label>
                </div>
                {(data._sync&&data._sync.lastMerge)&&<p className="hint" style={{marginTop:8}}>Last merge: {new Date(data._sync.lastMerge).toLocaleString()} from {data._sync.mergedFromName||data._sync.mergedFrom||"unknown"}</p>}
              </div>
              </div></details>
              <details className="settings-group"><summary className="settings-group-summary"><span>🔆 Display &amp; Customization</span><span className="sg-chev">▾</span></summary><div className="settings-group-body">
              <div className="section">
                <h3 className="sec-title">Text size</h3>
                <p className="hint">Make everything larger or smaller — this affects the whole app, and it's saved.</p>
                <div className="textsize-btns">
                  {[["Standard",1],["Large",1.15],["Larger",1.3],["Largest",1.5]].map(([label,v])=>{const active=(((data.settings&&data.settings.uiScale)||1)===v);return <button key={label} onClick={()=>setData(p=>({...p,settings:{...p.settings,uiScale:v}}))} className={`textsize-btn ${active?"textsize-active":""}`}>{label}</button>;})}
                </div>
              </div>
              <div className="section">
                <h3 className="sec-title">Large print &amp; roomy spacing</h3>
                <p className="hint">Bigger text with more space between items and larger tap targets — easier on the eyes and on shaky hands.</p>
                <label className="disp-toggle"><input type="checkbox" checked={!!(data.settings&&data.settings.largePrint)} onChange={e=>{const on=e.target.checked;setData(p=>{const s={...p.settings,largePrint:on};if(on&&(!s.uiScale||s.uiScale<1.15))s.uiScale=1.15;return{...p,settings:s}})}}/><span>{(data.settings&&data.settings.largePrint)?"On":"Off"}</span></label>
              </div>
              <div className="section"><h3 className="sec-title">🗺 State / Region</h3>
                <p className="hint">Choose your state for localized Medicaid thresholds, legal citations, program names, and resources. Generic mode provides universal guidance with no state-specific details.</p>
                <div className="state-selector">
                  {AVAILABLE_STATES.map(s=>(<button key={s.code} onClick={()=>switchState(s.code)} className={`state-btn ${((data.settings&&data.settings.stateCode)||"")===s.code?"state-btn-active":""}`}>{s.code?("🏛 "+s.name):("🌐 "+s.name)}</button>))}
                </div>
                <p className="hint" style={{marginTop:8}}>Current mode: <strong>{(data.settings&&data.settings.stateCode)?(AVAILABLE_STATES.find(s=>s.code===(data.settings&&data.settings.stateCode))||{}).name:"Generic"}</strong>{(data.settings&&data.settings.stateCode)?" — state-specific goals, citations, and thresholds are active.":" — universal guidance, no state-specific information."}</p>
              </div>
              </div></details>
              <div className="hub-card" onClick={()=>nav("help")}><div className="hub-card-icon" style={{background:"var(--color-background-secondary)"}}><span>?</span></div><div className="hub-card-body"><div className="hub-card-title">Help</div><div className="hub-card-sub">Feature guide</div></div><span className="hub-card-arr">›</span></div>
            </>)}
          </>)}

          {/* ═══ RECORDS IN & OUT ═══ */}
          {view==="datashare"&&(<>
            <h1 className="page-title">📤 Records In &amp; Out</h1>
            {isClient?<p className="page-sub">Available to caregivers.</p>:(<>
            <p className="page-sub">Bring records in; share records out.</p>
              <div className="section"><h3 className="sec-title">Bring records in</h3>
                <p className="hint">Scan a document, or import health records (FHIR), from the Documents screen.</p>
                <button onClick={()=>nav("documents")} className="edit-btn" style={{marginTop:0}}>Go to Documents →</button>
              </div>
              {can("export-data")&&(<><div className="section"><h3 className="sec-title">Share your records</h3>
                <p className="hint">Give your parent's records to a new doctor, a pharmacist, or family. You choose what to include and the format.</p>
                <div className="share-card">
                  <div className="share-q">What to include</div>
                  <div className="share-chips">
                    {[["meds","Medications"],["conditions","Conditions & notes"],["providers","Providers"],["appointments","Appointments"],["incidents","Incidents"],["carePlan","Care plan status"]].map(([k,label])=>(<button key={k} onClick={()=>setShareScope(s=>({...s,[k]:!s[k]}))} className={"share-chip "+(shareScope[k]?"on":"")}>{shareScope[k]?"✓ ":""}{label}</button>))}
                  </div>
                  <div className="share-q">Choose a format</div>
                  <div className="share-fmts">
                    <button onClick={handleSharePdf} className="share-fmt"><span className="share-fi">📄</span><span className="share-ft"><strong>PDF</strong><span>To print or email — for a person to read.</span></span></button>
                    <button onClick={handleShareFhir} className="share-fmt"><span className="share-fi">🔗</span><span className="share-ft"><strong>Structured file (FHIR)</strong><span>For another clinic's system to load.</span></span></button>
                  </div>
                  <p className="share-warn">⚠ A PDF or structured file isn't encrypted. Only send it to someone you trust — it's a medical record. For a secure copy another Care Guardian can open, use <strong>Back up to a .care file</strong> under "Keep your records safe."</p>
                </div>
              </div>
              <div className="section"><h3 className="sec-title">Send a status update (no health info)</h3>
                <p className="hint">Progress only — no names, notes, or health details. Safe to email a funder or relative.</p>
                <button onClick={handleNonSensitiveExport} className="edit-btn" style={{marginTop:0}}>↓ Export status summary</button>
              </div></>)}
            </>)}
          </>)}

          {/* ═══ DOCUMENTS ═══ */}
          {view==="documents"&&(<>
            <div className="contacts-header"><div><h1 className="page-title">📄 Document Scanner</h1><p className="page-sub" style={{margin:"4px 0 0"}}>Upload PDFs or text files. Medications and lab results are extracted automatically — no data leaves your device.</p></div>
              {!isClient&&<button onClick={()=>docFileRef.current&&docFileRef.current.click()} className="save-btn" disabled={docProcessing}>{docProcessing?"Processing…":"↑ Upload Document"}</button>}
            </div>

            {!isClient&&<div className="section" style={{marginBottom:16}}><h3 className="sec-title">Import Health Records (FHIR R4)</h3>
              <p className="hint">Have a FHIR R4 JSON Bundle from a patient portal or provider? Import it to extract practitioners, conditions, and medications directly into your records.</p>
              <button onClick={()=>fhirFileRef.current&&fhirFileRef.current.click()} className="edit-btn" style={{marginTop:0}}>↑ Import FHIR Bundle</button>
            </div>}

            {/* saved documents library */}
            {((data.savedDocs&&data.savedDocs.length)||0)>0&&!docResult&&!viewingDoc&&(<div className="section">
              <h3 className="sec-title">Document Library ({data.savedDocs.length})</h3>
              <div className="cc-group" style={{marginBottom:12}}>
                <span className="cc-label">Category:</span>
                {DOC_CATEGORIES.map(c=>(<button key={c.key} onClick={()=>setDocCatFilter(c.key)} className={`cc-btn ${docCatFilter===c.key?"cc-active":""}`}>{c.icon} {c.label}</button>))}
              </div>
              <div className="contacts-list">{getFilteredDocs().map(doc=>{const cat=DOC_CATEGORIES.find(c=>c.key===doc.category);return(
                <div key={doc.id} className="contact-row" style={{cursor:"pointer"}} onClick={()=>setViewingDoc(doc.id)}>
                  <span style={{fontSize:"1.25rem"}}>{(cat&&cat.icon)||"📄"}</span>
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

                {(doc.diagnoses&&doc.diagnoses.length>0)&&(<div style={{marginBottom:20}}>
                  <h4 className="sync-sub-title">🩺 Diagnoses</h4>
                  {doc.diagnoses.map((d,i)=>(<div key={i} className="doc-section-card"><strong>{d.text}</strong>{d.code&&<span className="hint" style={{marginLeft:6}}>{d.code}</span>}</div>))}
                </div>)}
                {(doc.conclusions&&doc.conclusions.length>0)&&(<div style={{marginBottom:20}}>
                  <h4 className="sync-sub-title">📝 Clinical conclusions</h4>
                  {doc.conclusions.map((c,i)=>(<div key={i} className="doc-section-card"><h4 className="doc-section-title">{c.title}</h4><p className="doc-section-body">{c.body}{c.truncated?" …":""}</p>{c.truncated&&<span className="hint">Shortened when saved.</span>}</div>))}
                </div>)}
                <p className="hint" style={{marginTop:12}}>📋 From this document, Care Guardian saved only the medications, test results, diagnoses, and clinical conclusions shown here. The document's own text is not stored on this device.</p>
              </div>);})()}

            {docProcessing&&(<div className="doc-processing"><div className="doc-spinner"/>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:6}}>
                <span>Reading{(docCancelRef.current&&docCancelRef.current.name)?(" \u201C"+docCancelRef.current.name+"\u201D"):" the document"}\u2026</span>
                <button className="cancel-btn" style={{marginTop:0,padding:"0.25rem 0.7rem",fontSize:"0.9375rem"}} onClick={cancelDocUpload}>Cancel</button>
              </div>
            </div>)}

            {docResult&&(<>
              {/* detected type + category selector + save to library */}
              <div className="doc-type-row">
                <div className="doc-type-badge">{docResult.docType.icon} Detected: <strong>{docResult.docType.label}</strong> · {docResult.fileName}</div>
                {!isClient&&<div className="doc-save-row">
                  <select value={docSaveCategory} onChange={e=>setDocSaveCategory(e.target.value)} className="cf-input" style={{width:180,fontSize:"0.9375rem"}}>
                    {DOC_CATEGORIES.filter(c=>c.key!=="all").map(c=><option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                  </select>
                  <button onClick={()=>saveDocToLibrary()} className="save-btn" style={{fontSize:"0.9375rem",padding:"7px 14px"}}>Save to Library</button>
                </div>}
              </div>

              {/* medication table */}
              {((docResult.diagnoses||[]).length>0||(docResult.conclusions||[]).length>0)&&(<div className="section">
                <h3 className="sec-title">🩺 Diagnoses &amp; clinical conclusions</h3>
                <p className="hint" style={{marginTop:0}}>These are saved with the document, along with medications and test results.</p>
                {(docResult.diagnoses||[]).length>0&&(<>
                  <div className="hub-section-label">Diagnoses ({(docResult.diagnoses||[]).length})</div>
                  {(docResult.diagnoses||[]).map((d,i)=>(<div key={i} className="doc-section-card"><strong>{d.text}</strong>{d.code&&<span className="hint" style={{marginLeft:6}}>{d.code}</span>}</div>))}
                </>)}
                {(docResult.conclusions||[]).length>0&&(<>
                  <div className="hub-section-label">Clinical conclusions</div>
                  {(docResult.conclusions||[]).map((c,i)=>(<div key={i} className="doc-section-card"><h4 className="doc-section-title">{c.title}</h4><p className="doc-section-body">{c.body}{c.truncated?" …":""}</p>{c.truncated&&<span className="hint">Shortened to keep the saved record small — the full text is above and is not saved.</span>}</div>))}
                </>)}
              </div>)}

              {!isClient&&docMeds.length>0&&(()=>{ const plan=getDocMedChanges(); const n=plan.toAdd.length+plan.toDiscontinue.length+plan.toUpdate.length; return (
                <div className="section">
                  <h3 className="sec-title">🔄 Medication changes in this document</h3>
                  {docMedsApplied?(<div className="sync-status sync-status-success">✓ Applied to Medication Management. See the change log there for the full history.</div>):
                   n===0?(<p className="hint">Nothing new — these medications already match the schedule.</p>):(<>
                    {plan.toAdd.length>0&&(<><div className="hub-section-label">New ({plan.toAdd.length})</div>
                      {plan.toAdd.map(m=>(<div key={m.key} className="doc-section-card"><strong>{m.name}</strong> {m.dosage} <span className="hint">→ {m.timeSlots.join(", ")}</span></div>))}</>)}
                    {plan.toDiscontinue.length>0&&(<><div className="hub-section-label">Discontinued ({plan.toDiscontinue.length})</div>
                      {plan.toDiscontinue.map(m=>(<div key={m.key} className="doc-section-card"><strong>{m.name}</strong> {m.dosage} <span className="hint">→ will be marked stopped</span></div>))}</>)}
                    {plan.toUpdate.length>0&&(<><div className="hub-section-label">Dose changed ({plan.toUpdate.length})</div>
                      {plan.toUpdate.map(m=>(<div key={m.key} className="doc-section-card"><strong>{m.name}</strong> <span className="hint">{m.from} → {m.to}</span></div>))}</>)}
                    <p className="hint">Check these against the document before applying — medication text is read automatically and can be misread.</p>
                    <button className="save-btn" onClick={()=>applyDocMedChanges(plan)}>Apply {n} change{n===1?"":"s"} to Medication Management</button>
                  </>)}
                </div>); })()}

              {docMeds.length>0&&(<div className="section">
                <h3 className="sec-title">💊 Extracted Medications ({docMeds.length})</h3>
                <p className="hint" style={{marginTop:0}}>From a document, only medications, test results, diagnoses, and clinical conclusions are saved — its text is never stored.</p>
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
                <p className="hint">Shown for review. Assessment, plan, impression, and follow-up sections are saved as clinical conclusions; the rest of the text is not stored.</p>
              </div>)}

              {/* no structured data found */}
              {docMeds.length===0&&docLabs.length===0&&(docResult.docType.key!=="clinical"||!(docResult.sections&&docResult.sections.length))&&(
                <div className="section">
                  <h3 className="sec-title">No medications or test results found</h3>
                  <p className="hint">This document didn't contain medications, test results, or diagnoses that could be read automatically, so there is nothing to save. The text below is shown for review only and is not stored — you can add anything important by hand.</p>
                  <pre className="doc-raw-text">{docResult.rawText.slice(0,3000)}{docResult.rawText.length>3000?"…(truncated)":""}</pre>
                </div>
              )}

            </>)}

            {!docResult&&!docProcessing&&(<div className="contacts-empty">
              <p style={{fontSize:"1rem",marginBottom:8}}>📄 Upload a PDF or text file to get started.</p>
              <p>Supported: medication lists, lab results, clinical notes, and general documents.</p>
              <p style={{marginTop:12,fontSize:"0.9375rem",color:"#a09a92"}}>Text-based PDFs are extracted automatically. Scanned documents may require manual entry.<br/>All processing happens locally in your browser — nothing is uploaded or sent anywhere.</p>
            </div>)}
          </>)}

          {/* ═══ CONTACTS (list) ═══ */}
          {view==="contacts"&&!contactDetail&&(<>
            <div className="contacts-header"><div><h1 className="page-title">☷ Care Team Contacts</h1></div>
              {!isClient&&<div className="contacts-header-actions"><button onClick={()=>fileRef.current&&fileRef.current.click()} className="edit-btn" style={{marginTop:0}}>↑ Import vCard</button><button onClick={()=>setContactForm({mode:"add",contact:{...EMPTY_CONTACT}})} className="save-btn">+ Add</button></div>}
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
                          !isClient?<input type="checkbox" checked={st.done} onChange={()=>toggleSub(activeDom.key,gi,si)} className="sub-check"/>:<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:"0.9375rem"}}>{st.done?"✓":"○"}</span>
                        ):(
                          !isClient?<button onClick={()=>toggleSub(activeDom.key,gi,si)} className="sub-attend-btn" title="Mark as attended today" style={{background:age!==null&&age<7?"#e8f0df":"transparent",borderColor:age!==null&&age<7?"#718355":"#e5e1db"}}>✓</button>
                          :<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:"0.9375rem"}}>{age!==null&&age<7?"✓":"○"}</span>
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
                    {(()=>{const removedCount=goal.subs.filter((_,si)=>getSubState(activeDom.key,gi,si).removed).length;return removedCount>0&&!isClient?(<details className="removed-subs-details"><summary className="removed-subs-summary">{removedCount} removed sub-task{removedCount>1?"s":""}</summary><div className="removed-subs-list">{goal.subs.map((subDef,si)=>{const st=getSubState(activeDom.key,gi,si);if(!st.removed)return null;return(<div key={si} className="sub-item sub-removed"><span className="sub-text" style={{color:"#c5c0b8",flex:1}}>{getSubText(activeDom.key,gi,si)}</span><button onClick={()=>restoreSub(activeDom.key,gi,si)} className="edit-btn" style={{marginTop:0,fontSize:"0.9375rem",padding:"3px 10px"}}>Restore</button></div>)})}</div></details>):null})()}                    {gd.customSubs.map((cs,ci)=>(<label key={`c${ci}`} className="sub-item sub-custom" style={{background:cs.done?"#f5f9f0":"#faf9f7"}}>
                      {!isClient?<input type="checkbox" checked={cs.done} onChange={()=>toggleCustomSub(activeDom.key,gi,ci)} className="sub-check"/>:<span style={{width:16,textAlign:"center",flexShrink:0,fontSize:"0.9375rem"}}>{cs.done?"✓":"○"}</span>}
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
        <button onClick={()=>navHub("caremgmt")} className={`hub-btn ${currentHub==="caremgmt"?"hub-active":""}`}><span className="hub-btn-icon">♥</span><span className="hub-btn-label">Care</span></button>
        <button onClick={()=>navHub("docs")} className={`hub-btn ${currentHub==="docs"?"hub-active":""}`}><span className="hub-btn-icon">📁</span><span className="hub-btn-label">Documents</span></button>
        <button onClick={()=>navHub("settings")} className={`hub-btn ${currentHub==="settings"?"hub-active":""}`}><span className="hub-btn-icon">⚙</span><span className="hub-btn-label">Settings</span></button>
      </nav>
    </div>
  </>);
}

/* ═══════════════ CSS ═══════════════ */
const CSS=`
:root,*{color-scheme:light}
/* Fonts (Libre Baskerville, Source Sans 3) are bundled locally via @fontsource — no external requests. */
html{font-size:calc(var(--ui-scale-pct,100%) * var(--screen-boost,1));-webkit-text-size-adjust:100%}*{box-sizing:border-box;margin:0;color:inherit}body{margin:0;font-size:1rem;background:#f6f4f0;color:#3d3730}button{cursor:pointer;color:inherit;background:transparent;border:none}button:hover{opacity:.92}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(150deg,#faf9f7,#ede8df);font-family:'Libre Baskerville',Georgia,serif;padding:20px}
.auth-card{background:#fff;border-radius:18px;padding:clamp(32px,4vw,64px) clamp(26px,4vw,64px);max-width:min(860px,94vw);width:100%;text-align:center;box-shadow:0 1px 2px rgba(61,55,48,.04),0 12px 32px rgba(61,55,48,.08);border:1px solid rgba(61,55,48,.05)}
.auth-title{font-size:1.5rem;font-weight:700;color:#3d3730;margin:0 0 10px}.auth-sub{font-size:0.9375rem;color:#6b6560;line-height:1.6;margin:0 0 22px}.auth-note{font-size:0.9375rem;color:#a09a92;font-style:italic}
.auth-input{width:100%;padding:14px 16px;font-size:1.0625rem;border-radius:12px;border:1.5px solid #d5d0c8;outline:none;text-align:center;background:#fdfcfa;color:#3d3730;transition:border-color .15s,box-shadow .15s;margin-bottom:12px;-webkit-appearance:none}
.auth-input::placeholder{letter-spacing:normal;color:#a8a29a;font-weight:400;opacity:1}
.auth-input:focus{border-color:#457b9d;box-shadow:0 0 0 3px rgba(69,123,157,.12)}
.auth-input-err{border-color:#b56576!important}.auth-error{color:#b56576;font-size:0.9375rem;margin:0 0 8px}
.sync-ios-note{background:#f3f6f9;border:1px solid #d4e0ea;border-radius:14px;padding:16px 16px 18px;margin-top:4px}
.sync-ios-note-head{font-size:0.9375rem;font-weight:700;color:#2f4858}
.sync-ios-paths{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.sync-ios-path{display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:#fff;border:1.5px solid #d4e0ea;border-radius:12px;padding:13px 15px;cursor:pointer;transition:border-color .15s,transform .05s,box-shadow .15s}
.sync-ios-path:hover{border-color:#457b9d;box-shadow:0 2px 8px rgba(69,123,157,.1)}
.sync-ios-path:active{transform:scale(.99)}
.sync-ios-path-icon{font-size:1.625rem;flex-shrink:0}
.sync-ios-path>span:last-child{display:flex;flex-direction:column;gap:2px}
.sync-ios-path strong{font-size:0.9375rem;color:#2f4858}
.sync-ios-path span span,.sync-ios-path>span:last-child span{font-size:0.9375rem;color:#6b7785;font-weight:400}
.rv-flash-bad{background:#fdecee;border-color:#e8c4ca;color:#8d4a58}
@media(max-width:640px){.nudge{flex-wrap:wrap}.nudge-body{flex:1 1 100%;min-width:0}.nudge-act{margin-top:8px}}
.diag-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f1ede7;font-size:0.9375rem}
.protect-when{font-size:0.9375rem;color:#8d99ae;margin-left:8px}
.protect-pointer{font-size:0.9375rem;color:#6b6560;margin:14px 0 0;line-height:1.5}
.protect-btn{margin-left:0}
.protect-foot{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.storage-choice{display:flex;flex-direction:column;gap:10px;margin:16px 0}
.storage-opt{text-align:left;padding:14px 16px;border:1px solid #e0dbd3;background:#fff;border-radius:12px;cursor:pointer;font:inherit}
.storage-opt:hover{border-color:#5b7553;background:#fbfaf8}
.storage-opt-title{font-weight:700;color:#3d3a36;margin-bottom:3px}
.storage-opt-sub{font-size:0.9375rem;color:#6b6560;line-height:1.45}
.storage-gate{border:1px solid #e8d9b8;background:#fdf8ee;border-radius:12px;padding:13px 15px;margin:14px 0;text-align:left}
.storage-nudge{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border:1px solid #e8d9b8;background:#fdf8ee;border-radius:12px;padding:12px 14px;margin-bottom:14px}
.storage-nudge-acts{display:flex;gap:8px;align-items:center}
.cloud-provider-note{display:block;font-size:0.9375rem;color:#8d99ae}
.storage-fail{border:1px solid #e0dbd3;background:#fbfaf8;border-radius:12px;padding:12px 14px;margin:12px 0}
.storage-fail-alarm{border-color:#e8d9b8;background:#fdf8ee}
.storage-fail-title{font-weight:700;color:#3d3a36}
.storage-fail-acts{display:flex;gap:8px;align-items:center;margin-top:9px;flex-wrap:wrap}
.cal-appt-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:0.9375rem;color:#6b6560;margin-top:3px}
.cal-appt-call{color:#5b7553;text-decoration:none;font-weight:600}
.client-dose{background:#fff;border:2px solid #5b7553;border-radius:16px;padding:22px 20px;margin:14px 0;text-align:center}
.client-dose-clear{border-color:#e0dbd3}
.client-dose-when{font-size:1.15rem;font-weight:700;color:#5b7553;margin-bottom:12px}
.client-dose-med{padding:10px 0;border-top:1px solid #f1ede7}
.client-dose-med:first-of-type{border-top:none}
.client-dose-name{font-size:1.6rem;font-weight:700;color:#3d3a36;line-height:1.25}
.client-dose-amt{font-size:1.2rem;color:#6b6560;margin-top:2px}
.client-dose-note{font-size:0.9375rem;color:#8d99ae;margin:14px 0 0}
.client-taken{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #f1ede7;font-size:1.05rem}
.med-by{display:block;font-size:0.9375rem;color:#6b6560;line-height:1.2;margin-top:1px}
.med-reason-tag{display:block;font-size:0.9375rem;color:#8a6534;line-height:1.2}
.med-check.skipped{color:#5e6b7d}
.med-dash{color:#d5cfc5}
.med-reason-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.storage-state{background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:11px 13px;margin:12px 0}
.storage-state-row{display:flex;align-items:center;gap:8px;font-size:0.9375rem;color:#3d3a36}
.storage-dot{width:9px;height:9px;border-radius:50%;flex:none}
.storage-dot-fresh{background:#5b7553}.storage-dot-ageing{background:#d9a441}
.storage-dot-stale{background:#b56576}.storage-dot-never{background:#b8b2a8}.storage-dot-pending{background:#d9a441}
.cloud-provider-btns{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.cloud-provider-btn{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:#457b9d;border:none;border-radius:12px;padding:15px 18px;cursor:pointer;color:#fff;transition:background .15s,transform .05s}
.cloud-provider-btn:hover{background:#3d6e8c}.cloud-provider-btn:active{transform:scale(.99)}
.cloud-provider-icon{font-size:1.625rem;flex-shrink:0}
.cloud-provider-text{display:flex;flex-direction:column;gap:2px}
.cloud-provider-text strong{font-size:1rem}
.cloud-provider-text span{font-size:0.9375rem;opacity:.9}
.linklike{background:none;border:none;color:#457b9d;text-decoration:underline;cursor:pointer;font:inherit;padding:0}
.sync-method-primary{border-color:#457b9d;background:#f3f8fb}
.sync-method-primary:hover{background:#e9f2f8}
.auth-btn{width:100%;padding:14px;font-size:0.9375rem;font-weight:700;border-radius:12px;border:none;background:#6d6875;color:#fff;font-family:'Libre Baskerville',serif;cursor:pointer;transition:background .15s,transform .05s}.auth-btn:hover{background:#5f5a67}.auth-btn:active{transform:scale(.99)}
.auth-footer{font-size:0.9375rem;color:#b5b0a8;margin-top:14px}
.recovery-box{background:#f6f4f0;border:1px solid #e4e0d8;border-radius:10px;padding:16px;margin-top:16px}
.save-pill{position:fixed;bottom:16px;left:16px;z-index:900;font-size:0.9375rem;font-weight:600;padding:7px 13px;border-radius:20px;box-shadow:0 2px 10px rgba(0,0,0,.15);max-width:300px}
.save-saving{background:#eef4f8;color:#2c4654;border:1px solid #cfe0ea}
.save-error{background:#fbeaea;color:#8a2b2b;border:1px solid #e3b8b8}
.recovery-label{font-size:0.9375rem;font-weight:700;color:#3d3730;margin:0 0 10px;text-align:left}
.recovery-banner{background:#e8f0df;border:1px solid #a9c08f;border-radius:8px;padding:10px 12px;font-size:0.9375rem;color:#4a5d3a;margin-bottom:12px;line-height:1.4}
.onb-card{max-width:min(900px,94vw)}
.onb-emoji{font-size:2.875rem;margin-bottom:14px;line-height:1}
.onb-body{font-size:0.9375rem;color:#5a554e;line-height:1.55;margin:0 0 22px;text-align:left}
.onb-dots{display:flex;gap:8px;justify-content:center;margin-top:20px}
.onb-dot{width:8px;height:8px;border-radius:50%;background:#dcd7cf;transition:all .2s}
.onb-dot-on{background:#457b9d;transform:scale(1.25)}
.onb-dot-done{background:#a9c08f}
.onb-install{text-align:left;background:#f6f4f0;border:1px solid #e4e0d8;border-radius:10px;padding:16px;margin-bottom:18px}
.onb-step{display:flex;align-items:flex-start;gap:10px;font-size:0.9375rem;color:#3d3730;line-height:1.45;margin:10px 0}
.onb-num{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:#457b9d;color:#fff;font-size:0.9375rem;font-weight:700;display:flex;align-items:center;justify-content:center}
.onb-share{display:flex;align-items:center;gap:10px;justify-content:center;color:#457b9d;background:#eef4f8;border-radius:8px;padding:10px;margin:6px 0}
.onb-share-label{font-size:0.9375rem;color:#6b6560;font-style:italic}
.onb-nav{display:flex;flex-direction:column;gap:4px}
.onb-field-label{display:block;text-align:left;font-size:0.9375rem;font-weight:600;color:#3d3730;margin-bottom:5px}
.onb-hint-inline{font-weight:400;color:#9a948c}
.onb-input{font-size:1.0625rem;padding:13px 15px;text-align:left}
.onb-optional{text-align:left;font-size:0.9375rem;color:#6b6560}
.onb-optional summary{cursor:pointer;padding:6px 0;color:#457b9d}
.text-btn{background:none;border:none;color:#457b9d;font-size:0.9375rem;cursor:pointer;margin-top:10px;text-decoration:underline;font-family:inherit}
.nudge-banner{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;font-size:0.9375rem;line-height:1.4;border-bottom:1px solid rgba(0,0,0,.08)}
.nudge-install{background:#eef4f7;color:#2c4654}
.nudge-backup{background:#fbf2e6;color:#6b4d28}
.nudge-risk{background:#fbeaea;color:#7a2e2e}
.integrity-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.integrity-label{font-size:0.9375rem;font-weight:600;color:#3d3730}
.integrity-val{font-size:0.9375rem;font-weight:600}
.integrity-val.ok{color:#5e8a4e}
.integrity-val.bad{color:#b04434}
.integrity-val.muted{color:#9a948c}
.recovery-code-box{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.125rem;font-weight:700;letter-spacing:1px;text-align:center;background:#f3efe8;border:2px dashed #c9bfa9;border-radius:10px;padding:16px 10px;margin-top:10px;color:#3d3730;word-break:break-all}
.mini-btn{font-size:0.9375rem;font-weight:600;padding:6px 12px;border:1px solid #d8d2c6;border-radius:8px;background:#fff;color:#5a544c;cursor:pointer}
.mini-btn:hover{background:#f3efe8}.mini-btn:disabled{opacity:.5;cursor:not-allowed}
.link-btn{color:#3d7d9c;cursor:pointer;text-decoration:underline}
.confirm-check{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:0.9375rem;color:#5a544c;cursor:pointer}.confirm-check input{width:16px;height:16px}
.nudge-icon{font-size:1.4375rem;flex-shrink:0;line-height:1.2}
.nudge-body{flex:1}
.nudge-x{background:none;border:none;font-size:1.25rem;line-height:1;cursor:pointer;color:inherit;opacity:.55;padding:0 2px;flex-shrink:0}
.nudge-x:hover{opacity:1}
.nudge-act{background:#bc6c25;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:0.9375rem;font-weight:600;cursor:pointer;flex-shrink:0;font-family:inherit}
.backup-status{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:8px;margin-top:10px;font-size:0.9375rem}
.backup-active{background:#eef5ee;border:1px solid #c2d6bd}
.backup-paused{background:#fbf2e6;border:1px solid #e6d3b3}
.backup-status-body{flex:1;color:#3d3730;line-height:1.4}
.backup-status-body code{background:rgba(0,0,0,.06);padding:1px 5px;border-radius:4px;font-size:0.9375rem}
.backup-when{display:block;font-size:0.9375rem;color:#8a847c;margin-top:2px}
.backup-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.backup-active .backup-dot{background:#5e8a4e;box-shadow:0 0 0 3px rgba(94,138,78,.2)}
.backup-paused .backup-dot{background:#bc6c25;box-shadow:0 0 0 3px rgba(188,108,37,.2)}
.backup-btn{background:#bc6c25;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.9375rem;font-weight:600;cursor:pointer;flex-shrink:0;font-family:inherit}
.backup-link{background:none;border:none;color:#8a847c;font-size:0.9375rem;cursor:pointer;text-decoration:underline;flex-shrink:0;font-family:inherit}
.shell{display:flex;min-height:100vh;font-family:'Source Sans 3',sans-serif;color:#3d3730;background:#f6f4f0;color-scheme:light dark}
button,input,select,textarea{color:inherit;font-family:inherit}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:90}
.sidebar{width:260px;background:#fff;border-right:1px solid #e8e4de;display:flex;flex-direction:column;padding:0 0 16px;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto;transition:transform .25s ease;transform:translateX(-100%)}
.sidebar-open{transform:translateX(0)!important}
.side-header{display:flex;align-items:center;gap:10px;padding:20px 20px 16px;border-bottom:1px solid #ede8df}
.side-header-text{font-family:'Libre Baskerville',serif;font-weight:700;font-size:1rem;color:#3d3730}
.side-item{display:flex;align-items:center;gap:10px;padding:11px 20px;border:none;background:transparent;font-size:0.9375rem;color:#6b6560;text-align:left;width:100%;border-left:3px solid transparent;transition:background .12s}
.side-item:hover{background:#f6f4f0}.side-active{background:#f6f4f0!important;color:#3d3730;font-weight:600;border-left-color:#6d6875}
.side-icon{font-size:1.3125rem;width:29px;text-align:center;flex-shrink:0}.side-badge{font-size:0.9375rem;font-weight:700;padding:2px 7px;border-radius:10px;background:#eef0f3;color:#8d99ae}
.side-lock{margin:8px 16px 0;padding:10px;border:1px solid #e5e1db;border-radius:8px;background:transparent;font-size:0.9375rem;color:#6b6560}
.client-badge{font-size:0.9375rem;font-weight:600;background:#fdf0d5;color:#bc6c25;padding:2px 8px;border-radius:8px;white-space:nowrap}
.top-bar{display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid #e8e4de;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);position:sticky;top:0;z-index:50}
.hamburger{background:none;border:none;font-size:1.375rem;color:#6b6560;padding:4px 8px;display:block}
.breadcrumbs{display:flex;align-items:center;gap:8px;flex:1}.crumb{background:none;border:none;font-size:0.9375rem;color:#8d99ae;padding:0;text-decoration:underline;text-underline-offset:3px}
.crumb-sep{color:#c5c0b8;font-size:0.9375rem}.crumb-current{font-size:0.9375rem;font-weight:600}.top-lock{background:none;border:none;font-size:1rem;opacity:.5}

/* universal search */
.search-btn{background:none;border:none;font-size:1rem;cursor:pointer;padding:4px 8px;color:#8d99ae}
.search-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px 16px}
.search-modal{background:#fff;border-radius:16px;width:100%;max-width:520px;max-height:70vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.2)}
.search-input-row{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid #e8e4de}
.search-icon{font-size:1.4375rem;color:#8d99ae}
.search-input{flex:1;border:none;outline:none;font-size:0.9375rem;font-family:inherit;color:#3d3730;background:transparent}
.search-input::placeholder{color:#c5c0b8}
.search-close{background:none;border:none;font-size:1.375rem;color:#8d99ae;cursor:pointer;padding:0 4px}
.search-results{overflow-y:auto;padding:8px 0}
.search-cat{font-size:0.9375rem;font-weight:600;color:#8d99ae;text-transform:uppercase;letter-spacing:.4px;padding:10px 16px 4px}
.search-result{display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;border:none;background:none;cursor:pointer;text-align:left;font-family:inherit;color:#3d3730;transition:background .1s}
.search-result:hover{background:#f6f4f0}
.search-result-icon{font-size:1.3125rem;width:31px;text-align:center;flex-shrink:0}
.search-result-body{flex:1;min-width:0;display:flex;flex-direction:column}
.search-result-text{font-size:0.9375rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.search-result-sub{font-size:0.9375rem;color:#8d99ae;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.search-result-date{font-size:0.9375rem;color:#a09a92;flex-shrink:0;margin-left:auto}
.search-result-arrow{color:#c5c0b8;font-size:1rem;flex-shrink:0;margin-left:4px}
.search-empty{padding:24px 16px;text-align:center;color:#8d99ae;font-size:0.9375rem}
.search-hint{padding:24px 16px;text-align:center;color:#c5c0b8;font-size:0.9375rem}
.main-area{flex:1;margin-left:0;display:flex;flex-direction:column;min-height:100vh}.content{flex:1;padding:28px 32px 40px;max-width:min(1400px,100%);margin-inline:auto;width:100%}

/* hub navigation v2 */
.main-area-v2{flex:1;min-height:100vh;display:flex;flex-direction:column}
.content-v2{padding:16px 20px 100px;max-width:960px;margin:0 auto;width:100%;flex:1;color:#3d3730;background:#f6f4f0}
.hub-topbar{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #e8e4de;background:#fff;position:sticky;top:0;z-index:10;color:#3d3730}
.hub-back{background:none;border:none;cursor:pointer;font-size:1.125rem;color:#457b9d;padding:4px 8px 4px 0;display:flex;align-items:center}
.hub-topbar-text{flex:1}
.hub-topbar-title{font-size:1rem;font-weight:700;font-family:'Libre Baskerville',serif;color:#3d3730}
.hub-topbar-crumb{font-size:0.9375rem;color:#8d99ae;display:block}
.hub-bar{display:flex;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e8e4de;z-index:20;padding-bottom:env(safe-area-inset-bottom)}
.hub-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px 6px;border:none;background:transparent;cursor:pointer;color:#a09a92;font-size:0.9375rem;transition:color .12s}
.hub-btn-icon{font-size:1.625rem;line-height:1;color:inherit}
.hub-btn-label{font-weight:600;color:inherit}
.hub-active{color:#457b9d}
.hub-welcome{font-family:'Libre Baskerville',serif;font-size:1.25rem;font-weight:700;color:#3d3730;padding:8px 0 2px}
.hub-client{font-size:0.9375rem;color:#6b6560;margin:0 0 16px}
.hub-section-label{font-size:0.9375rem;font-weight:600;color:#8d99ae;text-transform:uppercase;letter-spacing:.4px;padding:14px 0 6px}
.hub-card{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:12px;border:1px solid #e8e4de;margin-bottom:8px;cursor:pointer;background:#fff;transition:all .12s}
.hub-card:hover{border-color:#457b9d;background:#fafcfe}
.hub-card-urgent{border-left:3px solid #b56576}
.hub-card-ok{cursor:default}
.hub-card-ok:hover{border-color:#e8e4de;background:#fff}
.hub-card-icon{width:47px;height:47px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3125rem;flex-shrink:0}
.hub-card-body{flex:1;min-width:0}
.hub-card-title{font-size:0.9375rem;font-weight:600;color:#3d3730}
.hub-card-sub{font-size:0.9375rem;color:#8d99ae;margin-top:1px}
.hub-card-arr{color:#c5c0b8;font-size:1.125rem;flex-shrink:0;font-weight:300}
.pill{display:inline-block;padding:1px 7px;border-radius:10px;font-size:0.9375rem;font-weight:600;margin-left:4px}
.pill-r{background:#fde2e8;color:#8b0000}
.pill-a{background:#fdf0d5;color:#8b6914}
.pill-g{background:#e8f0df;color:#3d5a20}
.pill-b{background:#eef4f8;color:#457b9d}

/* emergency info card */
.ecard{border:2px solid #b56576;border-radius:12px;padding:20px;background:#fff;font-size:0.9375rem;line-height:1.6}
.ecard-header{font-size:1rem;font-weight:700;color:#b56576;text-align:center;border-bottom:2px solid #b56576;padding-bottom:10px;margin-bottom:12px;letter-spacing:.5px}
.ecard-row{display:flex;gap:8px;padding:4px 0}
.ecard-label{font-weight:700;min-width:70px;color:#3d3730}
.ecard-section{font-size:0.9375rem;font-weight:700;color:#457b9d;text-transform:uppercase;letter-spacing:.5px;margin-top:12px;border-top:1px solid #e8e4de;padding-top:8px}
.ecard-body{color:#3d3730;padding:4px 0}

/* pattern charts */
.pattern-bars{display:flex;flex-direction:column;gap:6px}
.pattern-bar-row{display:flex;align-items:center;gap:8px}
.pattern-bar-label{font-size:0.9375rem;color:#6b6560;min-width:80px;text-align:right}
.pattern-bar-track{flex:1;height:18px;background:#f6f4f0;border-radius:4px;overflow:hidden}
.pattern-bar-fill{height:100%;border-radius:4px;transition:width .3s}
.pattern-bar-val{font-size:0.9375rem;font-weight:600;color:#3d3730;min-width:20px}
.hour-chart{display:flex;align-items:flex-end;gap:2px;height:100px;padding:8px 0}
.hour-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
.hour-bar{width:100%;background:#b56576;border-radius:2px 2px 0 0;min-height:1px;transition:height .3s}
.hour-label{font-size:0.9375rem;color:#8d99ae;margin-top:4px}

/* strategic grid */
.strat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:16px}
.strat-card{padding:12px;border-radius:12px;border:1px solid #e8e4de;border-top:3px solid;background:#fff;text-align:center;cursor:pointer;transition:all .12s}
.strat-card:hover{border-color:#457b9d}
.strat-icon{font-size:1.8125rem;margin-bottom:4px}
.strat-pct{font-size:1.375rem;font-weight:700}
.strat-label{font-size:0.9375rem;font-weight:600;color:#6b6560}
.strat-pulse{font-size:0.9375rem;margin-top:2px}

/* capacity documentation */
.cap-grid{display:flex;flex-direction:column;gap:8px}
.cap-row{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #f0ede8}
.cap-label{font-size:0.9375rem;font-weight:500;min-width:140px;color:#3d3730;padding-top:4px}
.cap-btns{display:flex;gap:4px;flex-wrap:wrap;flex:1}
.cap-btn{padding:5px 10px;border-radius:6px;border:1px solid #e8e4de;background:#fff;font-size:0.9375rem;color:#6b6560;cursor:pointer;transition:all .1s;white-space:nowrap}
.cap-btn:hover{border-color:#457b9d}
.cap-btn-active{background:#eef4f8;border-color:#457b9d;color:#457b9d;font-weight:600}
.cap-entry{padding:14px;border-radius:10px;border:1px solid #e8e4de;margin-bottom:8px;background:#fff}
.cap-entry-head{font-size:0.9375rem;color:#3d3730;margin-bottom:8px}
.cap-assessor{color:#8d99ae;font-weight:400}
.cap-entry-grid{display:flex;flex-wrap:wrap;gap:6px}
.cap-entry-item{display:flex;align-items:center;gap:4px}
.cap-entry-area{font-size:0.9375rem;color:#6b6560}
.cap-entry-notes{font-size:0.9375rem;color:#6b6560;margin-top:8px;font-style:italic}

/* binder preview */
.binder-preview{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:20px;font-size:0.9375rem;line-height:1.6;white-space:pre-wrap;color:#3d3730;max-height:600px;overflow-y:auto;font-family:'Source Sans 3',monospace}

/* POA decision log */
.poa-form{padding:16px;border:1px solid #e8e4de;border-radius:12px;background:#fff;margin-bottom:16px}
.poa-entry{padding:16px;border:1px solid #e8e4de;border-left:4px solid #457b9d;border-radius:10px;margin-bottom:10px;background:#fff}
.poa-entry-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.poa-entry-type{font-size:0.9375rem;font-weight:600;color:#3d3730}
.poa-entry-date{font-size:0.9375rem;color:#8d99ae;margin-left:auto}
.poa-entry-desc{font-size:0.9375rem;color:#3d3730;line-height:1.5;margin-bottom:8px}
.poa-entry-field{font-size:0.9375rem;color:#6b6560;line-height:1.5;margin-bottom:4px}
.poa-field-label{font-weight:600;color:#457b9d}
.poa-entry-agent{font-size:0.9375rem;color:#a09a92;margin-top:8px;padding-top:8px;border-top:1px solid #f0ede8;font-style:italic}

/* care schedule */
.shift-card{padding:14px;border:1px solid #e8e4de;border-radius:10px;margin-bottom:10px;background:#fff;border-left:4px solid #8d99ae}
.shift-open{border-left-color:#457b9d}
.shift-assigned{border-left-color:#718355}
.shift-pending{border-left-color:#bc6c25}
.shift-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
.shift-date{font-size:0.9375rem;font-weight:600;color:#3d3730}
.shift-assignee{font-size:0.9375rem;color:#6b6560;margin-left:auto}
.shift-modby{font-size:0.9375rem;color:#a09a92;width:100%;text-align:right;font-style:italic}
.shift-careplan{font-size:0.9375rem;color:#6b6560;line-height:1.5;margin:6px 0;padding:8px;background:#f6f4f0;border-radius:6px}
.shift-tasks{margin:8px 0}
.shift-task-check{font-size:0.9375rem;color:#3d3730;padding:3px 0}
.shift-task-row{display:flex;justify-content:space-between;align-items:center;font-size:0.9375rem;color:#3d3730;padding:2px 0}
.shift-visit{margin:8px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.shift-approvals{margin-top:8px;padding-top:8px;border-top:1px solid #f0ede8}
.shift-approval-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.9375rem}

/* availability grid */
.avail-grid{display:grid;grid-template-columns:60px repeat(4,1fr);gap:4px;margin-top:8px}
.avail-corner{}
.avail-slot-head{font-size:0.9375rem;font-weight:600;text-align:center;color:#6b6560;padding:4px;text-transform:uppercase;letter-spacing:.3px}
.avail-day{font-size:0.9375rem;font-weight:600;color:#3d3730;display:flex;align-items:center;justify-content:flex-end;padding-right:6px}
.avail-cell{height:36px;border:1px solid #e8e4de;border-radius:6px;background:#fff;cursor:pointer;font-size:0.9375rem;color:#718355;transition:all .1s}
.avail-cell:hover{border-color:#457b9d}
.avail-on{background:#e8f0df;border-color:#718355;font-weight:700}
.avail-summary{font-size:0.9375rem;color:#3d3730;padding:6px 0;border-bottom:1px solid #f0ede8;line-height:1.5}

/* photo attachments */
.photo-attach-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.photo-preview-row{display:flex;gap:8px;flex-wrap:wrap}
.photo-thumb{position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid #e8e4de}
.photo-thumb img{width:100%;height:100%;object-fit:cover}
.photo-loading{width:100%;height:100%;background:repeating-linear-gradient(45deg,#efeae1,#efeae1 6px,#e6e0d5 6px,#e6e0d5 12px)}
.photo-remove{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;font-size:0.9375rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.page-title{font-family:'Libre Baskerville',serif;font-size:1.375rem;font-weight:700;margin:0 0 6px;color:#3d3730}
.page-sub{font-size:0.9375rem;color:#8d99ae;margin:0 0 24px;line-height:1.5}
.o-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.o-card{border-radius:14px;padding:22px 22px 18px;border:none;border-left:5px solid;text-align:left;box-shadow:0 2px 10px rgba(0,0,0,.04);display:block;width:100%;transition:transform .12s,box-shadow .12s}
.o-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.08)}
.o-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.o-badge{font-size:0.9375rem;font-weight:600;padding:3px 9px;border-radius:20px}
.o-card-title-row{display:flex;align-items:center;gap:6px}
.o-card-title{font-size:1.0625rem;font-weight:700;margin:0 0 4px;color:#3d3730;font-family:'Libre Baskerville',serif}
.o-card-desc{font-size:0.9375rem;color:#6b6560;line-height:1.45;margin:0 0 12px}
.prog-row{display:flex;align-items:center;gap:10px}.prog-track{flex:1;height:6px;border-radius:3px;background:rgba(0,0,0,.07);overflow:hidden}
.prog-fill{height:100%;border-radius:3px;transition:width .3s ease}.prog-label{font-size:0.9375rem;color:#8d99ae;white-space:nowrap}
.o-card-time{font-size:0.9375rem;color:#b5b0a8;margin-top:10px}
.log-wrap{margin-top:28px;background:#fff;border-radius:14px;padding:18px 22px;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.log-title{font-size:0.9375rem;font-weight:700;margin:0 0 12px;font-family:'Libre Baskerville',serif}
.log-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0ece4;font-size:0.9375rem}
.log-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.log-text{flex:1;line-height:1.4}.log-time{font-size:0.9375rem;color:#b5b0a8;white-space:nowrap}
.domain-header{border-radius:14px;padding:22px 24px;border-left:5px solid;margin-bottom:28px}
.domain-header-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.domain-title-row{display:flex;align-items:center;gap:8px}
.domain-pct{font-size:2rem;font-weight:700;font-family:'Libre Baskerville',serif;flex-shrink:0}
.section{margin-bottom:32px}.sec-title{font-size:1rem;font-weight:700;margin:0 0 12px;font-family:'Libre Baskerville',serif}
.settings-group{border:1px solid #e8e4de;border-radius:14px;margin-bottom:14px;background:#fff;overflow:hidden}
.settings-group[open]{box-shadow:0 1px 3px rgba(61,55,48,.05)}
.settings-group-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;cursor:pointer;font-family:'Libre Baskerville',serif;font-size:1rem;font-weight:700;color:#3d3730;list-style:none;-webkit-user-select:none;user-select:none}
.settings-group-summary::-webkit-details-marker{display:none}
.settings-group-summary::marker{content:""}
.settings-group-summary:hover{background:#faf8f5}
.sg-chev{font-size:0.9375rem;color:#8d99ae;transition:transform .2s;flex-shrink:0}
.settings-group[open] .sg-chev{transform:rotate(180deg)}
.settings-group-body{padding:2px 18px 8px}
.settings-group-body .section{margin:0;padding:16px 0;border-top:1px solid #f0ece6}
.settings-group-body .section:first-child{border-top:none;padding-top:8px}
.hint{font-size:0.9375rem;color:#8d99ae;font-style:italic;margin:-4px 0 16px;line-height:1.5}
/* status removed — computed from Foundation + Care Pulse */
.goals-wrap{display:flex;flex-direction:column;gap:10px}
.goal-card{border-radius:12px;border:1px solid #e8e4de;border-left:4px solid;overflow:hidden}
.goal-head{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer}
.goal-check{width:20px;height:20px;accent-color:#718355;flex-shrink:0;cursor:pointer}
.goal-title{font-size:0.9375rem;font-weight:600;line-height:1.35}.chevron{font-size:1rem;color:#a09a92;transition:transform .2s;flex-shrink:0;user-select:none}
.sub-prog-row{display:flex;align-items:center;gap:8px;margin-top:5px}
.sub-prog-track{width:80px;height:4px;border-radius:2px;background:rgba(0,0,0,.07);overflow:hidden}
.sub-prog-fill{height:100%;border-radius:2px;transition:width .25s ease}.sub-prog-label{font-size:0.9375rem;color:#a09a92}
.subs-wrap{padding:0 16px 14px 48px;display:flex;flex-direction:column;gap:6px;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.sub-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;border:1px solid #e8e4de;cursor:pointer;transition:background .12s}
.sub-typed{cursor:default;align-items:flex-start}
.sub-done{background:#f5f9f0!important}
.sub-overdue{background:#fdf6ee!important;border-color:#f0d5a0}
.sub-type-badge{font-size:0.9375rem;width:18px;text-align:center;flex-shrink:0;font-weight:700;line-height:1.3}
.sub-attend-btn{width:22px;height:22px;border-radius:6px;border:1.5px solid #e5e1db;background:transparent;font-size:0.9375rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s;color:#718355;font-weight:700}
.sub-attend-btn:hover{background:#e8f0df;border-color:#718355}
.sub-recency{font-size:0.9375rem;margin-top:2px;font-weight:500}
.sub-type-select{width:auto;padding:2px 4px;border:1px solid transparent;border-radius:4px;font-size:0.9375rem;color:#a09a92;background:transparent;cursor:pointer;flex-shrink:0;outline:none}
.sub-type-select:hover{border-color:#e5e1db;color:#6b6560}
.sub-removed{opacity:.6;background:#f6f4f0!important;border-style:dashed}
.removed-subs-details{margin-top:6px}
.removed-subs-summary{font-size:0.9375rem;color:#a09a92;cursor:pointer;padding:4px 0}
.removed-subs-summary:hover{color:#6b6560}
.removed-subs-list{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.type-legend{display:flex;gap:14px;margin-top:10px;font-size:0.9375rem;color:#8d99ae}
.type-legend-item{display:flex;align-items:center;gap:4px}
.dual-track{display:flex;flex-direction:column;gap:6px}
.dual-track-row{display:flex;align-items:center;gap:8px}
.dual-track-label{font-size:0.9375rem;font-weight:600;width:90px;flex-shrink:0}
.sub-custom{border-style:dashed}.sub-check{width:16px;height:16px;accent-color:#718355;flex-shrink:0;cursor:pointer}
.sub-text{font-size:0.9375rem;line-height:1.4}.remove-sub{background:none;border:none;font-size:1.125rem;color:#c5c0b8;padding:0 4px;line-height:1}.remove-sub:hover{color:#b56576}
.add-sub-trigger{background:none;border:1px dashed #d5d0c8;border-radius:8px;padding:8px 12px;font-size:0.9375rem;color:#8d99ae;text-align:left;width:100%}
.add-sub-row{display:flex;gap:8px;align-items:center}
.add-sub-input{flex:1;padding:8px 12px;font-size:0.9375rem;border-radius:8px;border:1px solid #d5d0c8;outline:none}.add-sub-input:focus{border-color:#718355}
.add-sub-btn{padding:8px 14px;font-size:0.9375rem;font-weight:600;border-radius:8px;border:none;background:#718355;color:#fff;white-space:nowrap}
.add-sub-cancel{padding:8px 12px;font-size:0.9375rem;border-radius:8px;border:1px solid #d5d0c8;background:transparent;color:#6b6560}
.goal-title-row{display:flex;align-items:flex-start;gap:6px}.goal-title-row .goal-title{flex:1}
.edit-icon{background:none;border:none;font-size:1.125rem;color:#c5c0b8;padding:2px 4px;line-height:1;flex-shrink:0;opacity:0;transition:opacity .15s}
.edit-icon-visible{opacity:.6!important}.goal-head:hover .edit-icon,.sub-item:hover .edit-icon,.o-card:hover .edit-icon{opacity:1}.edit-icon:hover{color:#6d6875!important;opacity:1}
.inline-edit{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
.inline-edit-input{flex:1;padding:5px 8px;font-size:0.9375rem;border-radius:6px;border:1.5px solid #718355;outline:none;min-width:0}
.inline-edit-save{background:none;border:none;font-size:1rem;color:#718355;padding:2px 4px;font-weight:700}
.inline-edit-cancel{background:none;border:none;font-size:0.9375rem;color:#a09a92;padding:2px 4px}
.notes-ta{width:100%;padding:13px 16px;font-size:0.9375rem;border-radius:10px;border:2px solid #d5d0c8;line-height:1.6;resize:vertical;outline:none;color:#3d3730}.notes-ta:focus{border-color:#718355}
.notes-actions{display:flex;gap:8px;margin-top:10px}
.save-btn{padding:9px 22px;font-size:0.9375rem;font-weight:700;border-radius:10px;border:none;background:#457b9d;color:#fff;cursor:pointer}
.cancel-btn{padding:9px 18px;font-size:0.9375rem;border-radius:10px;border:1px solid #d5d0c8;background:#fff;color:#6b6560;cursor:pointer}
.edit-btn{padding:9px 18px;font-size:0.9375rem;border-radius:10px;border:1px solid #d5d0c8;background:#fff;color:#6b6560;margin-top:8px;cursor:pointer}
.notes-display{font-size:0.9375rem;color:#6b6560;line-height:1.6;background:#fff;padding:13px 16px;border-radius:10px;border:1px solid #e5e1db;white-space:pre-wrap}
.last-up{font-size:0.9375rem;color:#b5b0a8;font-style:italic;margin-top:16px}
.app-footer{text-align:center;font-size:0.9375rem;color:#a09a92;padding:18px 24px;border-top:1px solid #e8e4de;margin-top:auto}
.tab-bar{display:flex;flex-wrap:wrap;gap:0;border-bottom:2px solid #e8e4de;background:#fff;padding:0 4px}
.tab-item{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 8px 5px;border:none;background:transparent;font-size:0.9375rem;color:#8d99ae;white-space:nowrap;border-bottom:3px solid transparent;transition:all .15s}
.tab-item:hover{color:#3d3730;background:#faf9f7}.tab-active{color:#3d3730!important;font-weight:600;border-bottom-color:#6d6875}
.tab-icon{font-size:1.25rem;line-height:1}.tab-label{font-size:0.9375rem;line-height:1.2}

/* tab order editor */






.pn-row{display:flex;justify-content:space-between;gap:12px;margin-top:36px;padding-top:24px;border-top:1px solid #e8e4de}
.pn-btn{display:flex;flex-direction:column;gap:2px;padding:14px 18px;border:1px solid #e5e1db;border-radius:12px;background:#fff;text-align:left;min-width:100px;transition:all .15s}
.pn-btn:hover{background:#faf9f7;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.pn-btn-next{text-align:right;align-items:flex-end}.pn-arrow{font-size:1.125rem;color:#8d99ae;line-height:1}
.pn-dir{font-size:0.9375rem;color:#a09a92;text-transform:uppercase;letter-spacing:.5px}.pn-name{font-size:0.9375rem;font-weight:600;color:#3d3730}
.contacts-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.contacts-header-actions{display:flex;gap:8px;flex-shrink:0;align-items:center;flex-wrap:wrap}
.import-toast{background:#e8f0df;color:#4a6232;padding:10px 16px;border-radius:10px;font-size:0.9375rem;font-weight:600;margin-bottom:16px;animation:fadeIn .3s ease}
.contacts-controls{display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
.cc-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.cc-label{font-size:0.9375rem;font-weight:600;color:#8d99ae;text-transform:uppercase;letter-spacing:.5px;margin-right:4px}
.cc-btn{padding:5px 12px;border-radius:20px;border:1.5px solid #e5e1db;background:#fff;font-size:0.9375rem;color:#6b6560;transition:all .12s;white-space:nowrap}
.cc-active{background:#f0ece4!important;border-color:#8d99ae!important;color:#3d3730;font-weight:600}
.contacts-empty{text-align:center;padding:40px 20px;color:#a09a92;font-size:0.9375rem;line-height:1.6}
.contacts-list{display:flex;flex-direction:column;gap:6px}
.contact-group{margin-bottom:20px}
.contact-group-title{font-family:'Libre Baskerville',serif;font-size:0.9375rem;font-weight:700;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #ede8df}
.contact-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e8e4de;border-radius:10px;background:#fff;width:100%;text-align:left;transition:all .12s}
.contact-row:hover{background:#faf9f7;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.contact-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1rem;font-family:'Libre Baskerville',serif;flex-shrink:0}
.contact-info{flex:1;min-width:0}.contact-name{font-size:0.9375rem;font-weight:600;color:#3d3730;line-height:1.3}
.contact-role{font-size:0.9375rem;color:#8d99ae;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.contact-arrow{font-size:1.25rem;color:#c5c0b8;flex-shrink:0}
.back-link{background:none;border:none;font-size:0.9375rem;color:#8d99ae;padding:0;margin-bottom:16px;text-decoration:underline;text-underline-offset:3px;display:block}
.cd-header{display:flex;align-items:center;gap:16px;padding:20px 24px;border-radius:14px;border-left:5px solid;background:#faf9f7;margin-bottom:24px}
.cd-avatar{width:52px;height:52px;font-size:1.375rem}.cd-meta{font-size:0.9375rem;color:#6b6560;margin:4px 0 8px}
.cd-info-grid{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px}
.cd-info-item{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 16px;min-width:200px;flex:1}
.cd-info-label{font-size:0.9375rem;text-transform:uppercase;letter-spacing:.5px;color:#8d99ae;display:block;margin-bottom:4px}
.cd-info-value{font-size:0.9375rem;color:#3d3730;font-weight:500;word-break:break-all}
.cd-actions{display:flex;gap:8px;margin-bottom:28px}
.cd-delete-btn{padding:9px 18px;font-size:0.9375rem;border-radius:10px;border:1px solid #e5c5c5;background:#fff;color:#b56576}
.cd-note-add{margin-bottom:20px}.cd-notes-list{display:flex;flex-direction:column;gap:8px}
.cd-note-card{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 16px}
.cd-note-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.cd-note-date{font-size:0.9375rem;color:#a09a92}.cd-note-text{font-size:0.9375rem;color:#3d3730;line-height:1.55;white-space:pre-wrap}
.cf-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.cf-modal{background:#fff;border-radius:16px;padding:28px 28px 24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,.12)}
.cf-title{font-family:'Libre Baskerville',serif;font-size:1.125rem;font-weight:700;margin:0 0 20px;color:#3d3730}
.cf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
.cf-label{font-size:0.9375rem;font-weight:600;color:#6b6560;display:flex;flex-direction:column;gap:5px}
.cf-input{padding:10px 12px;font-size:0.9375rem;border-radius:8px;border:1.5px solid #d5d0c8;outline:none;color:#3d3730}.cf-input:focus{border-color:#457b9d}
select.cf-input{background:#fff}.cf-actions{display:flex;gap:8px;margin-top:4px}
.cf-custom-section{margin-bottom:16px}.cf-custom-title{font-size:0.9375rem;font-weight:600;color:#6b6560;margin:0 0 10px;text-transform:uppercase;letter-spacing:.3px}
.cf-custom-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.cf-custom-label{width:140px;flex-shrink:0;font-size:0.9375rem!important;padding:8px 10px!important}
.cf-custom-value{flex:1;font-size:0.9375rem!important;padding:8px 10px!important}
.cf-add-field-row{display:flex;gap:8px;align-items:center;margin-bottom:18px;padding-top:4px;border-top:1px dashed #e5e1db}
/* calendar */
.cal-nav{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px}
.cal-nav-btn{background:none;border:1px solid #e5e1db;border-radius:8px;width:36px;height:36px;font-size:1.25rem;color:#6b6560;display:flex;align-items:center;justify-content:center}
.cal-month{font-family:'Libre Baskerville',serif;font-size:1.0625rem;font-weight:700;min-width:180px;text-align:center}
.cal-grid{max-width:500px}.cal-header{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
.cal-dow{font-size:0.9375rem;font-weight:600;color:#8d99ae;padding:6px 0;text-transform:uppercase}
.cal-body{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.cal-cell{border:none;background:#fff;border-radius:8px;padding:8px 4px;min-height:48px;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:0.9375rem;transition:all .12s}
.cal-cell:hover{background:#f0ece4}.cal-empty{background:transparent;cursor:default}
.cal-sel{background:#eef4f8!important;outline:2px solid #457b9d;outline-offset:-2px}
.cal-today{font-weight:700;color:#457b9d}
.cal-day{line-height:1}.cal-dot-row{display:flex;gap:3px}
.cal-dot{width:5px;height:5px;border-radius:50%;background:#b56576}
.cal-detail{margin-top:20px}
.cal-appt-card{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 16px;margin-bottom:8px}
.cal-appt-head{display:flex;align-items:center;gap:8px;font-size:0.9375rem}
.cal-appt-notes{font-size:0.9375rem;color:#6b6560;margin-top:6px;line-height:1.45}
/* messages */
.msg-compose{display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.msg-sender{display:flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;background:#eef4f8;border-radius:20px;flex-shrink:0}
.msg-sender-name{font-size:0.9375rem;font-weight:600;color:#3d3730}
.msg-sender-role{font-weight:400;color:#8d99ae}
.msg-self{background:#eef4f8!important;border-color:#b0cfe0!important}
.msg-role{font-size:0.9375rem;color:#8d99ae;margin-left:4px;font-weight:400}
.msg-meta{display:flex;align-items:center;gap:6px}
.msg-list{display:flex;flex-direction:column;gap:8px}
.msg-bubble{background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:12px 16px}
.msg-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.msg-time{font-size:0.9375rem;color:#a09a92}.msg-text{font-size:0.9375rem;color:#3d3730;line-height:1.5;white-space:pre-wrap}
/* settings */
/* documents */
.doc-processing{display:flex;align-items:center;gap:12px;padding:20px;background:#fdf6ee;border-radius:12px;color:#bc6c25;font-size:0.9375rem;font-weight:600;margin-bottom:20px}
.doc-spinner{width:20px;height:20px;border:3px solid #f0e0c8;border-top-color:#bc6c25;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.doc-type-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid #e8e4de;border-radius:20px;font-size:0.9375rem;color:#6b6560;margin-bottom:24px}
.doc-table-wrap{overflow-x:auto;margin-bottom:12px;border:1px solid #e8e4de;border-radius:10px}
.doc-table{width:100%;border-collapse:collapse;font-size:0.9375rem}
.doc-table th{text-align:left;padding:10px 12px;background:#f6f4f0;color:#6b6560;font-weight:600;font-size:0.9375rem;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;border-bottom:2px solid #e8e4de}
.doc-table td{padding:6px 8px;border-bottom:1px solid #f0ece4;vertical-align:middle}
.doc-table tr:last-child td{border-bottom:none}
.doc-flagged{background:#fde2e8}
.doc-cell-input{width:100%;padding:5px 8px;border:1px solid transparent;border-radius:4px;font-size:0.9375rem;outline:none;background:transparent;color:#3d3730;transition:border-color .15s}
.doc-cell-input:hover{border-color:#e5e1db}.doc-cell-input:focus{border-color:#457b9d;background:#fff}
.doc-cell-sm{max-width:100px}.doc-cell-xs{max-width:60px}
.doc-table-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.doc-section-card{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:14px 18px;margin-bottom:10px}
.doc-section-title{font-size:0.9375rem;font-weight:700;color:#457b9d;margin:0 0 8px;font-family:'Libre Baskerville',serif}
.doc-section-body{font-size:0.9375rem;color:#3d3730;line-height:1.55;white-space:pre-wrap;margin:0}
.med-view-toggle{display:flex;gap:6px;margin:10px 0 4px}
.mvt-btn{flex:1;padding:8px 12px;border:1px solid #e0dbd3;background:#fff;border-radius:10px;font:inherit;font-size:0.9375rem;cursor:pointer;color:#6b6560}
.mvt-on{background:#3d3a36;color:#fff;border-color:#3d3a36;font-weight:600}
.med-cal-filters{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.mc-chip{padding:5px 11px;border:1px solid #e0dbd3;background:#fff;border-radius:999px;font:inherit;font-size:0.9375rem;cursor:pointer;color:#6b6560}
.mc-chip-on{background:#5b7553;color:#fff;border-color:#5b7553}
.med-adh-stats{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.mas-card{flex:1;min-width:92px;background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:10px 12px}
.mas-num{font-size:1.5rem;font-weight:700;color:#3d3a36;line-height:1.1}
.mas-of{font-size:0.9375rem;font-weight:400;color:#8d99ae}
.mas-lbl{font-size:0.9375rem;color:#8d99ae;margin-top:2px}
.mas-delta{margin-left:6px;font-weight:600}.mas-delta.up{color:#5b7553}.mas-delta.down{color:#b56576}
.mas-warn{border-color:#e8d9b8;background:#fdf8ee}
.med-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:8px 0}
.mc-dow{text-align:center;font-size:0.9375rem;color:#8d99ae;padding-bottom:2px}
.mc-cell{aspect-ratio:1;border:1px solid transparent;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font:inherit;cursor:pointer;padding:0;gap:1px}
.mc-blank{background:transparent;border:none;cursor:default}
.mc-day{font-size:0.9375rem;font-weight:600}
.mc-frac{font-size:0.9375rem;opacity:0.75}
.mc-full{background:#5b7553;color:#fff}
.mc-partial{background:#d9a441;color:#3d3a36}
.mc-missed{background:#b56576;color:#fff}
.mc-unrecorded{background:repeating-linear-gradient(45deg,#f0ece5,#f0ece5 3px,#e2ddd4 3px,#e2ddd4 6px);color:#8d7f70}
.mc-none{background:#f7f5f1;color:#b8b2a8}
.mc-future{background:#fcfbf9;color:#d5cfc5}
.mc-sel{outline:2px solid #3d3a36;outline-offset:1px}
.mc-today{border-color:#3d3a36}
.med-cal-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:0.9375rem;color:#6b6560;margin:6px 0 4px}
.med-cal-legend span{display:flex;align-items:center;gap:5px}
.mc-key{width:12px;height:12px;border-radius:3px;display:inline-block;flex:none}
.mc-slots{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.mc-slot{font-size:0.9375rem;padding:3px 8px;border-radius:999px;background:#f2efea;color:#6b6560}
.mc-slot-given{background:#e4ebe0;color:#4a6142}.mc-slot-missed{background:#f6e3e6;color:#8d4a58}
.mc-slot-refused{background:#f6ecdf;color:#8a6534}.mc-slot-unrecorded{background:#f2efea;color:#9a948b}
.mc-slot-prn{background:#eef1f5;color:#5e6b7d}
.med-strip-row{margin-bottom:12px}
.med-strip-head{display:flex;justify-content:space-between;align-items:baseline;font-size:0.9375rem;margin-bottom:4px}
.med-strip-pct{color:#6b6560;font-weight:600}.med-strip-pct.low{color:#b56576}
.med-strip{display:flex;gap:2px;flex-wrap:wrap}
.med-strip .mc-key{width:9px;height:14px;border-radius:2px}
.drug-suggest{border:1px solid #e0dbd3;border-radius:10px;background:#fff;overflow:hidden;margin-bottom:10px;max-height:230px;overflow-y:auto}
.drug-opt{display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;text-align:left;padding:8px 11px;background:none;border:none;border-bottom:1px solid #f1ede7;font:inherit;cursor:pointer}
.drug-opt:last-child{border-bottom:none}.drug-opt:hover{background:#f7f5f1}
.drug-opt-name{font-weight:600;color:#3d3a36;font-size:0.9375rem}
.drug-opt-brand{font-size:0.9375rem;color:#8d99ae}
.drug-opt-str{font-size:0.9375rem;color:#6b6560}
.drug-strengths{margin:2px 0 10px}
.drug-str-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.drug-str{padding:4px 10px;border:1px solid #e0dbd3;background:#fff;border-radius:999px;font:inherit;font-size:0.9375rem;cursor:pointer;color:#6b6560}
.drug-str-on{background:#5b7553;color:#fff;border-color:#5b7553}
.drug-ok{font-size:0.9375rem;color:#4a6142;margin:0 0 8px}
.drug-warn{font-size:0.9375rem;color:#8a6534;background:#fdf8ee;border:1px solid #e8d9b8;border-radius:8px;padding:7px 10px;margin:0 0 4px}
.doc-raw-text{font-size:0.9375rem;line-height:1.5;color:#6b6560;background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:14px 16px;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;font-family:'Source Sans 3',monospace}
.doc-raw-details{margin-top:16px}.doc-raw-summary{font-size:0.9375rem;color:#8d99ae;cursor:pointer;padding:8px 0}

/* incidents */
.incident-card{background:#fff;border:1px solid #e8e4de;border-left:4px solid;border-radius:10px;padding:14px 18px;margin-bottom:10px}
.incident-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.incident-type{font-weight:600;font-size:0.9375rem;color:#3d3730}
.incident-datetime{font-size:0.9375rem;color:#8d99ae;margin-left:auto}
.incident-desc{font-size:0.9375rem;color:#3d3730;line-height:1.5;margin:0 0 6px}
.incident-response{font-size:0.9375rem;color:#6b6560;line-height:1.45;margin:0 0 6px}
.incident-meta{display:flex;gap:16px;font-size:0.9375rem;color:#8d99ae;flex-wrap:wrap}

/* med admin */
.med-date-nav{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.med-day-stats{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.med-stat{font-size:0.9375rem;font-weight:600;padding:4px 12px;border-radius:8px}
.med-stat-given{background:#e8f0df;color:#718355}
.med-stat-missed{background:#fde2e8;color:#b56576}
.med-stat-refused{background:#fdf0d5;color:#bc6c25}
.med-stat-pending{background:#eef0f3;color:#8d99ae}
.med-table td,.med-table th{text-align:center;padding:8px 6px}
.med-table td:first-child,.med-table th:first-child{text-align:left;min-width:140px}
.med-table td:nth-child(2),.med-table th:nth-child(2){text-align:left}
.med-slot-th{font-size:0.9375rem!important;min-width:60px}
.med-cell{min-width:54px;transition:background .12s}
.med-check{font-size:1rem;font-weight:700;display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:6px}
.med-check.given{color:#718355;background:#d4e8c4}.med-check.missed{color:#b56576;background:#f8d0d8}
.med-check.refused{color:#bc6c25;background:#f8e4c4}.med-check.pending{color:#c5c0b8}.med-check.na{color:#e5e1db}
.med-note{font-size:0.9375rem;color:#8d99ae;margin-top:2px}
.med-slot-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}

/* expenses */
.expense-summary{display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap}
.expense-summary-item{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:12px 18px;min-width:140px;flex:1}
.expense-summary-label{font-size:0.9375rem;text-transform:uppercase;letter-spacing:.5px;color:#8d99ae;display:block;margin-bottom:4px}
.expense-summary-value{font-size:1.25rem;font-weight:700;color:#3d3730;font-family:'Libre Baskerville',serif}

.settings-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* emergency */
.emergency-grid{display:flex;flex-direction:column;gap:16px}
.emergency-card{background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:18px 20px;border-left:4px solid #8b0000}
.emergency-title{font-family:'Libre Baskerville',serif;font-size:1rem;font-weight:700;margin:0 0 12px;color:#8b0000}
.emergency-steps{margin:0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:6px}
.emergency-step{display:flex;align-items:center;gap:8px;font-size:0.9375rem;line-height:1.45;color:#3d3730}
.emergency-step-input{flex:1;padding:6px 10px;border:1px solid transparent;border-radius:6px;font-size:0.9375rem;outline:none;background:transparent;color:#3d3730}
.emergency-step-input:hover{border-color:#e5e1db}.emergency-step-input:focus{border-color:#8b0000;background:#fff}

/* shifts */
.shift-table td,.shift-table th{text-align:center;padding:6px 4px;font-size:0.9375rem}
.shift-slot-label{text-align:left!important;font-weight:600;font-size:0.9375rem;color:#6b6560;white-space:nowrap;min-width:80px}
.shift-cell{min-width:70px}.shift-empty{background:#fdf0f2!important}
.shift-input{width:100%;padding:4px 6px;border:1px solid transparent;border-radius:4px;font-size:0.9375rem;text-align:center;outline:none;background:transparent}
.shift-input:hover{border-color:#e5e1db}.shift-input:focus{border-color:#457b9d;background:#fff}
.shift-name{font-size:0.9375rem}

/* triggers */
.trigger-alert{padding:14px 18px;border-radius:10px;font-size:0.9375rem;font-weight:600;margin-bottom:20px}
.trigger-list{display:flex;flex-direction:column;gap:8px}
.trigger-item{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:10px;border:1px solid #e8e4de;background:#fff;cursor:pointer;transition:all .12s}
.trigger-active{background:#fdf0d5!important;border-color:#f0d5a0}
.trigger-label{font-size:0.9375rem;font-weight:600;color:#3d3730}.trigger-desc{font-size:0.9375rem;color:#8d99ae;margin-top:2px}

/* visit summary */
.visit-summary{font-size:0.9375rem;line-height:1.6;color:#3d3730;background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:18px 20px;white-space:pre-wrap;word-break:break-word;max-height:70vh;overflow-y:auto;font-family:'Source Sans 3',monospace}

/* help */
.help-toc{background:#fff;border:1px solid #e8e4de;border-radius:10px;padding:14px 18px;margin-bottom:24px;font-size:0.9375rem;line-height:2;color:#6b6560}
.help-link{color:#457b9d;text-decoration:none}.help-link:hover{text-decoration:underline}
.help-section{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #f0ece4}
.help-body{font-size:0.9375rem;color:#3d3730;line-height:1.65}

/* merge preview */
.merge-modal{max-width:520px;max-height:80vh;overflow-y:auto}
.sr-protected{position:absolute;top:8px;right:8px;font-size:1.0625rem;opacity:.7}
.flood-warn{background:#fbeee6;border:1px solid #d8a384;color:#8a4a22;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:0.9375rem;line-height:1.45}
.merge-source{font-size:0.9375rem;color:#6b6560;margin:0 0 16px;background:#faf9f7;padding:8px 14px;border-radius:8px}
.merge-section{margin-bottom:16px}
.merge-section-title{font-size:0.9375rem;font-weight:700;margin:0 0 6px}
.merge-item{font-size:0.9375rem;padding:5px 10px;margin-bottom:3px;border-radius:6px;line-height:1.4}
.merge-added{background:#e8f0df;color:#3d3730}
.merge-updated{background:#fdf0d5;color:#3d3730}
.merge-kept{background:#f6f4f0;color:#a09a92}

/* sync */
.sync-status{padding:12px 18px;border-radius:10px;font-size:0.9375rem;font-weight:500;margin-bottom:20px}
.sync-status-success{background:#e8f0df;color:#3d5a20}
.sync-status-error{background:#fde2e8;color:#8b0000}
.sync-methods{display:flex;flex-direction:column;gap:10px;margin:12px 0}
.sync-method-card{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#fff;border:1.5px solid #e8e4de;border-radius:12px;cursor:pointer;transition:all .15s}
.sync-method-card:hover{border-color:#457b9d;background:#f0f5f9}
.sync-method-card:active{transform:scale(.98)}
.sync-method-icon{font-size:2.25rem;width:52px;text-align:center;flex-shrink:0}
.sync-method-info{display:flex;flex-direction:column;gap:2px}
.sync-method-info strong{font-size:0.9375rem;color:#3d3730}
.sync-method-info span{font-size:0.9375rem;color:#8d99ae}
.sync-url-row{display:flex;align-items:center;gap:8px;margin-top:12px}
.sync-loading{padding:10px;text-align:center;color:#457b9d;font-size:0.9375rem;font-weight:600}
.sync-paste-details{margin-top:20px;padding-top:16px;border-top:1px solid #e8e4de}
.sync-paste-summary{font-size:0.9375rem;color:#8d99ae;cursor:pointer;padding:8px 0}
.sync-paste-summary:hover{color:#6b6560}

/* cloud sync */
.cloud-setup-steps{display:flex;flex-direction:column;gap:8px;margin:14px 0}
.cloud-step{display:flex;align-items:center;gap:12px;font-size:0.9375rem;color:#3d3730}
.cloud-step-num{width:28px;height:28px;border-radius:50%;background:#457b9d;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9375rem;flex-shrink:0}
.cloud-connected-info{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#e8f0df;border:1.5px solid #b8d4a0;border-radius:12px}
.cloud-connected-icon{font-size:2.625rem}
.cloud-connected-details{flex:1}
.cloud-connected-file{font-size:0.9375rem;font-weight:700;color:#3d3730}
.cloud-connected-meta{font-size:0.9375rem;color:#718355;margin-top:2px}
.sync-main-action{text-align:center;padding:24px 0}
.cloud-sync-btn{display:inline-flex;align-items:center;gap:10px;padding:18px 48px;font-size:1.125rem;font-weight:700;border:none;border-radius:14px;background:linear-gradient(135deg,#457b9d,#3d6a87);color:#fff;cursor:pointer;transition:all .15s;box-shadow:0 4px 16px rgba(69,123,157,.3)}
.cloud-sync-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(69,123,157,.4)}
.cloud-sync-btn:active{transform:translateY(0)}
.cloud-sync-btn:disabled{opacity:.5;cursor:default}
.sync-advanced{margin-top:24px;border-top:1px solid #e8e4de;padding-top:4px}
.sync-advanced-summary{font-size:0.9375rem;color:#8d99ae;cursor:pointer;padding:12px 0;font-weight:600}
.sync-advanced-summary:hover{color:#6b6560}
.sync-advanced-content{padding-top:8px}
.sync-sub-title{font-size:0.9375rem;font-weight:700;color:#6b6560;margin:16px 0 8px}
.sync-method-tabs{display:flex;gap:8px;margin-bottom:16px}

/* team */
.team-form{margin-top:12px;display:flex;flex-direction:column;gap:8px;max-width:400px}
.team-header{margin-bottom:16px}
.team-name{font-size:1.125rem;font-weight:700;color:#3d3730;font-family:'Libre Baskerville',serif}
.team-client{font-size:0.9375rem;color:#6b6560;margin-top:2px}
.team-roster{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.team-member{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border:1px solid #e8e4de;border-radius:10px}
.team-member-self{background:#eef4f8;border-color:#b0cfe0}
.team-member-avatar{width:36px;height:36px;border-radius:50%;background:#457b9d;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0}
.team-member-info{flex:1;min-width:0}
.team-member-name{font-size:0.9375rem;font-weight:600;color:#3d3730}
.team-member-you{font-size:0.9375rem;color:#457b9d;font-weight:400}
.team-member-role{font-size:0.9375rem;color:#8d99ae}
.team-member-sync{font-size:0.9375rem;color:#a09a92;text-align:right;flex-shrink:0}
.team-invite-details{margin-top:8px;padding-top:8px;border-top:1px solid #e8e4de}
.team-invite-code{font-family:monospace;font-size:0.9375rem;padding:10px 14px;background:#fff;border:1px solid #e8e4de;border-radius:8px;word-break:break-all;cursor:pointer;color:#457b9d;transition:background .12s;line-height:1.5}
.team-invite-code:hover{background:#eef4f8}
.client-tier-section{margin-top:16px;padding-top:16px;border-top:1px solid #e8e4de}
.client-tier-toggle{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.client-tier-toggle .state-btn{flex:1;min-width:180px;text-align:left;display:flex;flex-direction:column;gap:2px;padding:12px 16px}
.tier-desc{font-size:0.9375rem;font-weight:400;opacity:.7;display:block}
.role-badge{font-size:0.9375rem;padding:2px 6px;border-radius:4px;background:#eef4f8;color:#457b9d;font-weight:600;margin-left:4px}

/* state selector */
.state-selector{display:flex;gap:8px;flex-wrap:wrap}
.state-btn{padding:10px 18px;border:2px solid #e5e1db;border-radius:10px;background:#fff;font-size:0.9375rem;color:#6b6560;cursor:pointer;transition:all .12s;font-weight:500}
.state-btn:hover{border-color:#457b9d;color:#3d3730}
.state-btn-active{background:#eef4f8;border-color:#457b9d;color:#457b9d;font-weight:700}

/* self reports */
.sr-form{background:#fff;border:1px solid #e8e4de;border-radius:12px;padding:20px}
.sr-mood-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.sr-mood-btn{padding:8px 14px;border:1.5px solid #e5e1db;border-radius:10px;background:#fff;font-size:0.9375rem;color:#6b6560;cursor:pointer;transition:all .12s}
.sr-mood-active{background:#e8f0df!important;border-color:#718355;color:#3d3730;font-weight:600}
.sr-audio-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.sr-record-btn{padding:10px 18px;border-radius:10px;border:2px solid #b56576;background:#fff;color:#b56576;font-weight:600;font-size:0.9375rem;cursor:pointer;transition:all .15s}
.sr-recording{background:#fde2e8;animation:pulse 1s ease infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.sr-audio-preview{display:flex;align-items:center;gap:8px}
.sr-list{display:flex;flex-direction:column;gap:10px}
.sr-card{background:#fff;border:1px solid #e8e4de;border-left:4px solid #718355;border-radius:10px;padding:14px 18px;position:relative}
.sr-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.sr-card-type{font-weight:600;font-size:0.9375rem;color:#3d3730}
.sr-card-time{font-size:0.9375rem;color:#a09a92}
.sr-card-mood{font-size:0.9375rem;margin-bottom:4px}
.sr-card-text{font-size:0.9375rem;color:#3d3730;line-height:1.5;white-space:pre-wrap;margin:0}
.sr-err{font-size:0.9375rem;color:#b56576;margin:8px 0 0;padding:0}

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
  .page-title{font-size:1.125rem!important}
  .page-sub{display:none!important}
}

@media(min-width:1024px){.sidebar{transform:translateX(0)}.main-area{margin-left:260px!important}.hamburger{display:none!important}.tab-bar{display:none}}
/* ── Bias toward using the screen (the user base trends older) ──────────────────────────────
   Previous attempt scaled about a dozen named classes at 1024px, which left the other ~380 font declarations
   untouched — so the app still read as phone-sized on a laptop. This scales the ROOT instead, so every rem-based
   size in the app grows together, and it MULTIPLIES the user's own text-size setting rather than replacing it
   (130% chosen by the user × 1.15 desktop boost = 149.5%).
   Separately, every font-size below 11pt has been raised to a 15px floor — 292 of 399 declarations were under it,
   which no amount of container widening could have fixed. */
@media(min-width:1024px){
  :root{--screen-boost:1.10}
  .content{padding:36px 44px 56px}
  .onb-body,.page-sub{max-width:64ch;margin-inline:auto}
}
@media(min-width:1500px){
  :root{--screen-boost:1.20}
  .content{padding:44px 60px 68px}
}
@media(min-width:1900px){
  :root{--screen-boost:1.28}
}
/* Cards and grids should use the width rather than stretching into single tall columns. */
@media(min-width:1180px){
  .sync-methods,.storage-choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .med-adh-stats{gap:14px}
  .cf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:480px){.content{padding:16px 12px 28px}.add-sub-row,.cf-add-field-row,.msg-compose,.settings-row,.doc-table-actions{flex-wrap:wrap}.pn-btn{min-width:0;padding:12px 14px}.domain-pct{font-size:1.5rem}.edit-icon{opacity:.5!important}.cf-grid{grid-template-columns:1fr}.cd-header{flex-direction:column;align-items:flex-start}.cd-info-item{min-width:0}.cf-custom-label{width:100px}.doc-table{font-size:0.9375rem}.doc-cell-input{font-size:0.9375rem;padding:4px 6px}}

/* ===== Readability layer: comfortable, scalable type + roomier task rows ===== */
.sub-text{font-size:1rem;line-height:1.4}
.sub-type-badge{font-size:1rem;width:1.3rem}
.sub-recency{font-size:0.9375rem;margin-top:.18rem;display:flex;align-items:center;gap:.4rem;line-height:1.3}
.sub-recency::before{content:"";width:.55em;height:.55em;border-radius:50%;background:currentColor;flex-shrink:0;opacity:.9}
.sub-prog-label{font-size:0.9375rem}
.tier-desc{font-size:0.9375rem}
.hint{font-size:0.9375rem}
.page-sub{font-size:0.9375rem}
.integrity-label{font-size:0.9375rem}
.nudge-banner{font-size:0.9375rem}
.sub-attend-btn{width:2.75rem;height:2.75rem;font-size:1rem}
.sub-check{width:1.5rem;height:1.5rem;accent-color:#718355;cursor:pointer;flex-shrink:0}
.subs-wrap{padding-left:.85rem;border-left:2px solid #ece8e1;margin-left:.35rem}
.sub-typed{align-items:flex-start;gap:.55rem;padding:.55rem 0;min-height:2.75rem}
.sub-type-select{font-size:0.9375rem;padding:.15rem .3rem}
.textsize-btns{display:flex;gap:.5rem;flex-wrap:wrap}
.textsize-btn{flex:1;min-width:4.5rem;padding:.7rem .5rem;border:1.5px solid #d5d0c8;border-radius:.6rem;background:#fff;font-weight:600;cursor:pointer;color:#3d3730}
.textsize-btn.textsize-active{border-color:#457b9d;background:#eef4f8;color:#457b9d}
.textsize-btn:nth-child(1){font-size:0.9375rem}.textsize-btn:nth-child(2){font-size:0.9375rem}.textsize-btn:nth-child(3){font-size:1.0625rem}.textsize-btn:nth-child(4){font-size:1.1875rem}
.disp-toggle{display:flex;align-items:center;gap:.6rem;cursor:pointer;font-size:0.9375rem;margin-top:.3rem}
.disp-toggle input{width:1.4rem;height:1.4rem;accent-color:#457b9d;flex-shrink:0}
/* E: Large print & roomy spacing — one switch for bigger text + more breathing room + larger targets */
.comfortable .sub-typed{padding:.85rem 0}
.comfortable .sub-text{line-height:1.5}
.comfortable .sub-recency{font-size:0.9375rem}
.comfortable .hint{font-size:0.9375rem}
.comfortable .page-sub{font-size:1rem}
.comfortable .sub-attend-btn{width:3rem;height:3rem}.comfortable .sub-typed{min-height:3rem}
.comfortable .save-btn,.comfortable .edit-btn,.comfortable .cancel-btn{padding-top:.7em;padding-bottom:.7em}
.comfortable .settings-group-summary{padding-top:1.05rem;padding-bottom:1.05rem}
.comfortable p,.comfortable li,.comfortable .onb-body{line-height:1.62}
/* Three Steps to Protect Your Data */
.protect-steps{border:1.5px solid #e0d8c8;border-radius:1rem;background:#fffdf8;padding:1rem 1rem .4rem;margin-bottom:1rem}
.protect-title{font-family:'Libre Baskerville',serif;font-size:1.1rem;margin:0 0 .15rem}
.protect-sub{font-size:0.9375rem;color:#8a857d;margin:0 0 .7rem}
.protect-step{display:flex;align-items:flex-start;gap:.75rem;padding:.8rem 0;border-top:1px solid #efe8da}
.protect-step:first-of-type{border-top:none}
.protect-num{width:1.65rem;height:1.65rem;border-radius:50%;background:#eef1ec;color:#6f7a63;font-weight:700;font-size:0.9375rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Libre Baskerville',serif}
.protect-main{flex:1;min-width:0}
.protect-text{font-size:.95rem;line-height:1.45}
.protect-foot{display:flex;align-items:center;gap:.6rem;margin-top:.5rem;flex-wrap:wrap}
.protect-badge{font-size:0.9375rem;font-weight:700;padding:.18rem .6rem;border-radius:1.2rem}
.protect-badge.done{background:#e8efe3;color:#4a7350}
.protect-badge.not{background:#f7ede0;color:#9a6a2a}
.protect-btn{font-size:0.9375rem;font-weight:600;color:#fff;background:#457b9d;border-radius:.55rem;padding:.5rem .85rem;border:none}
.protect-ios{font-size:0.9375rem;color:#73706a}
/* Share your records */
.share-card{background:#f7f9fa;border:1px solid #dde7ec;border-radius:.7rem;padding:.75rem;margin-top:.4rem}
.share-q{font-size:0.9375rem;font-weight:600;margin:.5rem 0 .4rem}.share-q:first-child{margin-top:0}
.share-chips{display:flex;gap:.4rem;flex-wrap:wrap}
.share-chip{font-size:0.9375rem;padding:.35rem .7rem;border-radius:1.2rem;border:1.5px solid #d5d0c8;background:#fff;color:#5a554e}
.share-chip.on{border-color:#457b9d;background:#eef4f8;color:#457b9d;font-weight:600}
.share-fmts{display:flex;flex-direction:column;gap:.45rem}
.share-fmt{display:flex;gap:.6rem;align-items:flex-start;border:1.5px solid #d5d0c8;border-radius:.6rem;padding:.6rem .7rem;background:#fff;text-align:left;width:100%}
.share-fmt:hover{border-color:#457b9d;background:#fbfdfe}
.share-fi{font-size:1.15rem;flex-shrink:0}
.share-ft strong{font-size:0.9375rem}.share-ft span{font-size:0.9375rem;color:#73706a;display:block;margin-top:.05rem}
.share-warn{font-size:0.9375rem;color:#9a5a2a;background:#fbf0e3;border-radius:.5rem;padding:.5rem .7rem;margin-top:.6rem;line-height:1.45}
/* Care-program: standing indicator */
.prog-indicator{display:flex;align-items:center;gap:.7rem;background:#fffdf6;border:1.5px solid #e6dcc0;border-radius:.75rem;padding:.7rem .75rem;margin-bottom:1rem;cursor:pointer}
.prog-eye{font-size:1.25rem;flex-shrink:0}
.prog-ind-main{flex:1;min-width:0;font-size:0.9375rem}
.prog-ind-sub{font-size:0.9375rem;color:#8a857d;margin-top:.1rem}
.prog-ind-act{font-size:0.9375rem;font-weight:600;color:#457b9d;white-space:nowrap}
.prog-active{display:flex;gap:.65rem;align-items:flex-start;margin-bottom:.5rem}
.prog-active-main{flex:1;min-width:0;font-size:0.9375rem}
.prog-upd{font-size:0.9375rem;color:#8a857d;margin-top:.1rem}
.prog-actions{display:flex;gap:.5rem;flex-wrap:wrap}
.prog-stop{font-size:0.9375rem;font-weight:600;color:#b0463c;background:#fbecea;border:1px solid #eecbc6;border-radius:.55rem;padding:.5rem .8rem}
.prog-cancel{display:block;width:100%;margin-top:.5rem;background:none;border:none;color:#8a857d;font-size:0.9375rem}
/* Care-program: consent flow */
.consent-card .consent-who{background:#eef4f8;border:1px solid #d4e3ec;border-radius:.7rem;padding:.7rem;margin-bottom:.7rem;font-size:0.9375rem}
.consent-fp{margin-top:.55rem;background:#fff;border:1px dashed #b9c9d3;border-radius:.5rem;padding:.5rem .65rem}
.consent-fp-code{font-family:ui-monospace,Menlo,monospace;font-size:1rem;letter-spacing:.06em;color:#2a4d63;font-weight:600}
.consent-fp-q{font-size:0.9375rem;color:#73706a;margin-top:.2rem}
.consent-fp-match{display:flex;align-items:center;gap:.45rem;font-size:0.9375rem;font-weight:600;color:#4a7350;margin-top:.45rem}
.consent-blk{margin:.8rem 0}
.consent-blk h4{font-size:0.9375rem;font-weight:700;color:#5a554e;margin-bottom:.45rem}
.consent-mut{font-weight:400;color:#9a948b}
.consent-row{display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #efe9df;font-size:0.9375rem}
.consent-row:last-child{border-bottom:none}
.consent-excl{background:#f3f6f1;border-left:3px solid #718355;border-radius:0 .5rem .5rem 0;padding:.55rem .75rem}
.consent-x{font-size:0.9375rem;color:#5a554e;padding:.18rem 0}
.consent-plain{font-size:0.9375rem;color:#6b6560;background:#faf8f4;border-radius:.5rem;padding:.55rem .7rem;margin-top:.6rem;line-height:1.5}
.consent-attest{display:flex;gap:.55rem;align-items:flex-start;font-size:0.9375rem;color:#5a554e;margin:.7rem 0}
.grant-ta{width:100%;border:1px solid #d5d0c8;border-radius:.55rem;padding:.6rem;font-size:0.9375rem;font-family:ui-monospace,Menlo,monospace;resize:vertical;margin:.4rem 0}
.grant-date{border:1px solid #d5d0c8;border-radius:.55rem;padding:.55rem;font-size:0.9375rem;margin:.3rem 0;width:100%;max-width:100%}
/* Reviewer mode */
.rv-wrap{max-width:560px;margin:0 auto;padding:1rem;min-height:100vh}
.rv-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.rv-exit{font-size:0.9375rem;color:#8a857d;background:#f0ece6;border:none;border-radius:.5rem;padding:.4rem .8rem}
.rv-err{color:#b3422f;font-size:0.9375rem;margin:.4rem 0 0}
.rv-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.6rem}
.rv-ghost{font-size:0.9375rem;font-weight:600;color:#457b9d;background:#eef4f7;border:1px solid #d4e3ea;border-radius:.5rem;padding:.55rem .9rem;cursor:pointer}
.rv-link{background:none;border:none;color:#457b9d;font-weight:600;padding:0;cursor:pointer;text-decoration:underline}
.rv-details{margin-top:.5rem}
.rv-details summary{font-size:0.9375rem;font-weight:600;color:#457b9d;cursor:pointer}
.rv-details .grant-date{margin-top:.5rem}
.rv-card{background:#fff;border:1px solid #e5e1db;border-radius:.85rem;padding:1rem;margin-bottom:1rem}
.rv-enroll{margin-top:.7rem}
.rv-enroll-h{font-size:0.9375rem;font-weight:700;color:#5a554e;margin-bottom:.2rem}
.rv-view{background:#f7faf7;border-color:#d6e4d6}
.rv-asof{font-size:0.9375rem;color:#73706a;margin:.2rem 0 .6rem}
.rv-excl{font-size:0.9375rem;color:#9a5a2a;margin-top:.7rem;font-style:italic}
.rv-proj{margin-top:.3rem}
.rv-h4{font-size:0.9375rem;font-weight:700;color:#2a4d63;margin:.7rem 0 .3rem;border-bottom:1px solid #e6ece9;padding-bottom:.2rem}
.rv-row{display:flex;justify-content:space-between;gap:1rem;font-size:0.9375rem;padding:.3rem 0;border-bottom:1px solid #f0ece6}
.rv-row span{color:#5a554e}
.rv-concern{font-size:0.9375rem;padding:.4rem 0;border-bottom:1px solid #f0ece6}
.rv-concern div{color:#6b6560;margin-top:.15rem}
.rv-empty{font-size:0.9375rem;color:#9a948b;font-style:italic;padding:.3rem 0}
.rv-flash{position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:#3d3730;color:#fff;padding:.6rem 1rem;border-radius:.6rem;font-size:0.9375rem;max-width:90%;z-index:50}
.rv-entry-link{display:block;width:100%;margin-top:1rem;background:none;border:none;color:#8d99ae;font-size:0.9375rem;text-decoration:underline}
/* live-intake additions */
.consent-choice{display:flex;gap:.6rem;align-items:flex-start;border:1.5px solid #e0dccf;border-radius:.6rem;padding:.6rem;margin-bottom:.45rem;font-size:0.9375rem;background:#fff}
.consent-choice.sel{border-color:#457b9d;background:#eef4f8}
.consent-choice input{margin-top:.15rem;flex-shrink:0}
.prog-pill{display:inline-block;margin-top:.4rem;font-size:0.9375rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:.12rem .5rem;border-radius:.55rem;background:#efeae0;color:#7a6a3f}
.prog-pill.on{background:#e3efe4;color:#3f6b45}
.prog-toggle{font-size:0.9375rem;font-weight:600;color:#457b9d;background:#eef4f8;border:1px solid #d4e3ec;border-radius:.55rem;padding:.5rem .8rem}
.rv-conn{font-size:0.9375rem;color:#4a7350;font-weight:600}
.rv-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem}
.rv-roster{margin-top:.3rem}
.rv-rrow{display:flex;align-items:center;gap:.7rem;padding:.6rem;border:1px solid #e5e1db;border-radius:.6rem;margin-bottom:.45rem;background:#fff}
.rv-ravatar{width:30px;height:30px;border-radius:50%;background:#e7efe7;display:flex;align-items:center;justify-content:center;font-size:0.9375rem;flex-shrink:0}
.rv-rmain{flex:1;min-width:0;font-size:0.9375rem;overflow:hidden}
.rv-rmain strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.9375rem;font-family:ui-monospace,Menlo,monospace}
.rv-rmeta{font-size:0.9375rem;color:#8a857d;margin-top:.1rem}
.rv-rmeta.stale{color:#c9962f;font-weight:600}
.rv-ropen{font-size:0.9375rem;font-weight:600;color:#457b9d;background:none;border:none;white-space:nowrap}
.rv-shared-head{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.4rem}
.rv-chip{font-size:0.9375rem;font-weight:700;padding:.18rem .6rem;border-radius:.6rem;white-space:nowrap}
.rv-chip-ok{background:#e3efe4;color:#3f6b45}
.rv-chip-bad{background:#f7e4e1;color:#b3422f}
.rv-chip-warn{background:#fdf3df;color:#9a7a2e}
.rv-timeline{margin-top:.5rem}
.rv-tl-row{display:flex;gap:.6rem;align-items:flex-start;padding:.5rem 0;border-top:1px solid #eee}
.rv-tl-seq{font-family:ui-monospace,Menlo,monospace;font-size:0.9375rem;color:#8d99ae;background:#f2f4f6;border-radius:.4rem;padding:.1rem .4rem;flex-shrink:0;margin-top:.1rem}
.rv-tl-main{flex:1;min-width:0;font-size:0.9375rem}
.rv-tl-meta{font-size:0.9375rem;color:#8a857d;margin-top:.1rem}
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
.flood-warn{background:#fbeee6;border:1px solid #d8a384;color:#8a4a22;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:0.9375rem;line-height:1.45}
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
.mvt-btn{background:#26262b;border-color:#3a3a3e;color:#b8b2a8}.mvt-on{background:#e8e4de;color:#1a1a1e;border-color:#e8e4de}
.mc-chip{background:#26262b;border-color:#3a3a3e;color:#b8b2a8}
.mas-card{background:#26262b;border-color:#3a3a3e}.mas-num{color:#e8e4de}
.mc-none{background:#232327;color:#5a5650}.mc-future{background:#1e1e22;color:#3a3a3e}
.mc-unrecorded{background:repeating-linear-gradient(45deg,#2a2a2f,#2a2a2f 3px,#333338 3px,#333338 6px);color:#8d867c}
.mc-slot{background:#2a2a2f;color:#b8b2a8}.mc-today{border-color:#e8e4de}.mc-sel{outline-color:#e8e4de}
.drug-suggest{background:#26262b;border-color:#3a3a3e}.drug-opt{border-bottom-color:#2f2f34}.drug-opt:hover{background:#2f2f34}
.drug-opt-name{color:#e8e4de}.drug-str{background:#26262b;border-color:#3a3a3e;color:#b8b2a8}
.drug-warn{background:#2b2519;border-color:#4a4130;color:#d9b877}
.storage-opt{background:#26262b;border-color:#3a3a3e}.storage-opt-title{color:#e8e4de}.storage-gate,.storage-nudge{background:#2b2519;border-color:#4a4130}
.storage-fail{background:#26262b;border-color:#3a3a3e}.storage-fail-alarm{background:#2b2519;border-color:#4a4130}.storage-fail-title{color:#e8e4de}
.med-by{color:#b8b2a8}.med-dash{color:#3a3a3e}
.rv-flash-bad{background:#2b1d20;border-color:#4a3036;color:#e8a9b4}
.storage-state{background:#26262b;border-color:#3a3a3e}.storage-state-row{color:#e8e4de}
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
.hub-sec-today>.settings-group-summary{padding:18px 16px}.hub-sec-today .hub-sec-t-title{font-size:1.25rem;font-weight:800}
.hub-sec-lt>.settings-group-summary span:first-child{font-size:1rem}
.help-btn{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--color-border,#d8d2c8);background:transparent;color:inherit;opacity:.75;font-weight:700;cursor:pointer;margin-right:6px;flex:none}
.help-context{border:1px solid var(--color-border,#cfe3d8);background:var(--color-background-info,#eef6f1);border-radius:10px;padding:12px 14px;margin-bottom:14px}
.help-context-title{font-weight:700;margin-bottom:4px}
`;
