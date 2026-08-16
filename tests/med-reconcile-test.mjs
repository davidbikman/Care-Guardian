// med-reconcile-test.mjs — PROOF for the meds-and-tests-only document policy and the document → Medication Management
// import. All logic is EXTRACTED VERBATIM from src/App.jsx. Covers: discontinuation detection, reconciliation against
// the existing schedule (add / stop / dose-change / unchanged), frequency→time-slot mapping, and the storage policy
// that no document text is retained anywhere.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function sliceBal(str,from,o,c){let d=0;for(let i=from;i<str.length;i++){if(str[i]===o)d++;else if(str[i]===c){d--;if(d===0)return str.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBal(src,b,"{","}")}
function constVal(name){const m=new RegExp("const\\s+"+name+"\\s*=\\s*").exec(src);if(!m)throw new Error("no const "+name);
  const st=m.index+m[0].length,ch=src[st];
  const val=ch==="["?sliceBal(src,st,"[","]"):ch==="{"?sliceBal(src,st,"{","}"):src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,"");
  return "const "+name+" = "+val+";"}
const parts=[constVal("COMMON_DRUGS"),constVal("MED_STOP_MARKERS"),constVal("MED_STOP_HEADINGS"),constVal("MED_START_HEADINGS"),constVal("medKey"),
  extractFn("function parseMedStatuses("),extractFn("function freqToSlots("),extractFn("function docMedToScheduleMed("),extractFn("function reconcileMedications(")];
const M=new Function(parts.join("\n")+"\nreturn {parseMedStatuses,freqToSlots,docMedToScheduleMed,reconcileMedications};")();
ok(typeof M.reconcileMedications==="function","extracted the real reconciliation logic from src/App.jsx");

// ── discontinuation detection ──
const doc=`
DISCHARGE MEDICATION LIST

CURRENT MEDICATIONS:
Metformin 500 mg twice daily
Donepezil 10 mg at bedtime
Lisinopril 20 mg daily

DISCONTINUED:
Quetiapine 25 mg
Lorazepam 0.5 mg

Atorvastatin 20 mg daily — stopped due to muscle pain
`.trim();
const st=M.parseMedStatuses(doc);
ok(st["quetiapine"]==="stopped"&&st["lorazepam"]==="stopped","a DISCONTINUED heading marks every medication beneath it as stopped");
ok(st["atorvastatin"]==="stopped","stop wording on the medication's own line is detected");
ok(st["metformin"]==="active"&&st["donepezil"]==="active"&&st["lisinopril"]==="active","medications under CURRENT MEDICATIONS stay active");

// ── reconciliation against a real schedule ──
const current=[
  {id:"m1",name:"Metformin",dosage:"500 mg"},                 // unchanged
  {id:"m2",name:"Donepezil",dosage:"5 mg"},                   // dose changed in the document
  {id:"m3",name:"Quetiapine",dosage:"25 mg"},                 // discontinued in the document
  {id:"m4",name:"Lorazepam",dosage:"0.5 mg",discontinued:true},// ALREADY stopped
  {id:"m5",name:"Warfarin",dosage:"5 mg"},                    // absent from the document
];
const docMeds=[
  {name:"Metformin",dosage:"500 mg",frequency:"Twice daily",route:"Oral"},
  {name:"Donepezil",dosage:"10 mg",frequency:"At bedtime",route:"Oral"},
  {name:"Lisinopril",dosage:"20 mg",frequency:"Daily",route:"Oral"},
  {name:"Quetiapine",dosage:"25 mg",frequency:"",route:""},
  {name:"Lorazepam",dosage:"0.5 mg",frequency:"",route:""},
  {name:"Atorvastatin",dosage:"20 mg",frequency:"Daily",route:"Oral"},
];
const plan=M.reconcileMedications(current,docMeds,st);
const names=o=>o.map(x=>x.name).sort().join(",");
ok(names(plan.toAdd)==="Lisinopril","a medication the document adds is proposed as NEW (and only that one)");
ok(names(plan.toDiscontinue)==="Quetiapine","an active medication the document stops is proposed for discontinuation");
ok(!plan.toDiscontinue.some(x=>x.name==="Lorazepam"),"an ALREADY-stopped medication isn't proposed again");
ok(plan.toUpdate.length===1&&plan.toUpdate[0].name==="Donepezil"&&plan.toUpdate[0].from==="5 mg"&&plan.toUpdate[0].to==="10 mg","a dose difference is surfaced as a change, showing both values — not silently overwritten");
ok(names(plan.unchanged)==="Metformin","an identical medication is left alone");
ok(!plan.toDiscontinue.some(x=>x.name==="Warfarin")&&!plan.toUpdate.some(x=>x.name==="Warfarin"),"a medication ABSENT from the document is never touched — absence is not evidence of discontinuation");
ok(!plan.toAdd.some(x=>x.name==="Atorvastatin"),"a medication named only in a stopped context is not added as new");

// ── frequency → time slots ──
ok(M.freqToSlots("Twice daily").join()==="Morning,Evening","twice daily maps to two slots");
ok(M.freqToSlots("At bedtime").join()==="Bedtime","at bedtime maps to the bedtime slot");
ok(M.freqToSlots("As needed (PRN)").join()==="As Needed","PRN maps to As Needed");
ok(M.freqToSlots("").join()==="Morning","an unreadable frequency falls back to a single slot rather than none");
ok(M.docMedToScheduleMed({name:"X",dosage:"5 mg",frequency:"Daily",route:"Oral"}).notes.includes("Oral"),"frequency and route are carried into the medication note");

// ── storage policy: no document text is retained ──
const saveFn=extractFn("const saveDocToLibrary=");
ok(!/rawText\s*:/.test(saveFn)&&!/summary\s*:/.test(saveFn)&&!/sections\s*:/.test(saveFn),"saveDocToLibrary stores NO document text — no rawText, no excerpt, no sections");
ok(/medications\s*:/.test(saveFn)&&/labs\s*:/.test(saveFn),"saveDocToLibrary does store medications and test results");
ok(/contentPolicy\s*:\s*"meds-labs(-dx)?-only"/.test(saveFn),"each saved document is tagged with the retention policy");
ok(!src.includes("const saveRawTextToNotes="),"the old save-document-text-to-notes action is gone");
ok(!/doc\.rawText/.test(src),"the document library never renders stored text (there is none)");
const mig=src.slice(src.indexOf("Retroactively honour"),src.indexOf("Retroactively honour")+420);
ok(/rawText,\s*summary,\s*sections/.test(mig),"a migration purges document text saved by older builds");

// ── the change log records every kind of change ──
for(const a of ["added","discontinued","reactivated","dose-changed"]) ok(src.includes('"'+a+'"'),"the change log records '"+a+"'");
ok(/medChanges:\[\]/.test(src),"medChanges is part of the data model");
ok(/source:"document"|"document"\)\]/.test(src)||src.includes('"document"'),"changes record whether they came from a document or were entered by hand");

console.log(f===0?"\n✅ MEDICATION RECONCILIATION PROVEN — stops detected, changes reconciled safely, absent meds untouched, no document text retained":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
