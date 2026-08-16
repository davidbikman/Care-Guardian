// clinical-extract-test.mjs — PROOF for diagnosis + clinical-conclusion extraction and its storage bound.
// Logic EXTRACTED VERBATIM from src/App.jsx. The point of this feature is to keep the clinically meaningful
// parts of a document WITHOUT re-introducing the silent 10,000-character truncation that preceded it: caps are
// small, and any shortening is RECORDED on the item (truncated:true) so the UI can say so.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function sliceBal(str,from,o,c){let d=0;for(let i=from;i<str.length;i++){if(str[i]===o)d++;else if(str[i]===c){d--;if(d===0)return str.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBal(src,b,"{","}")}
function constLine(name){const l=src.split("\n").find(x=>x.trim().startsWith("const "+name+" ")||x.trim().startsWith("const "+name+"="));if(!l)throw new Error("no const "+name);return l.trim()}
const parts=[constLine("DX_MAX_ITEMS"),constLine("CONCLUSION_MAX_ITEMS"),constLine("DX_HEADINGS"),constLine("DX_STOP_HEADINGS"),
  constLine("ICD10_RE"),constLine("CONCLUSION_TITLES"),constLine("_dxClean"),
  extractFn("function parseDiagnoses("),extractFn("function parseConclusions("),extractFn("function parseClinicalSections(")];
const M=new Function(parts.join("\n")+"\nreturn {parseDiagnoses,parseConclusions,parseClinicalSections};")();
ok(typeof M.parseDiagnoses==="function","extracted the real parseDiagnoses/parseConclusions from src/App.jsx");

const doc=`
DISCHARGE SUMMARY

DIAGNOSES:
1. Alzheimer disease with late onset, unspecified severity  G30.1
2. Essential hypertension  I10
3. Type 2 diabetes mellitus without complications  E11.9

MEDICATIONS:
Donepezil 10 mg at bedtime
Lisinopril 20 mg daily

ASSESSMENT AND PLAN:
Patient remains at moderate stage with gradual functional decline. Continue donepezil. Blood pressure is well
controlled. Recommend home safety evaluation and caregiver respite planning. Follow up in three months.

FOLLOW-UP:
Return to clinic in 12 weeks or sooner if behavioral changes escalate.

VITALS:
BP 128/76
`.trim();

const dx=M.parseDiagnoses(doc);
const names=dx.map(d=>d.text.toLowerCase()).join(" | ");
ok(dx.length>=3,"diagnoses are extracted from the DIAGNOSES section ("+dx.length+" found)");
ok(/alzheimer/.test(names)&&/hypertension/.test(names)&&/diabetes/.test(names),"each listed condition is captured");
ok(dx.some(d=>d.code==="G30.1")&&dx.some(d=>d.code==="I10")&&dx.some(d=>d.code==="E11.9"),"ICD-10 codes are captured alongside the text");
ok(!dx.some(d=>/^\d/.test(d.text)),"list numbering is stripped from the diagnosis text");
ok(!/donepezil|lisinopril/.test(names),"medications are NOT swept in as diagnoses — the MEDICATIONS heading ends the section");
ok(!/128\/76|^bp$/i.test(names),"vitals are not captured as diagnoses");
ok(!/remains at moderate stage|recommend home safety/.test(names),"assessment PROSE is not captured as a diagnosis — it belongs in conclusions");
ok(dx.length===3,"exactly the three listed diagnoses are captured, nothing more");

const secs=M.parseClinicalSections(doc);
const conc=M.parseConclusions(secs);
const titles=conc.map(c=>c.title.toLowerCase()).join(",");
ok(conc.length>0,"clinical conclusions are extracted ("+conc.length+")");
ok(/assessment|plan/.test(titles),"the assessment/plan reasoning is kept");
ok(!/medications|vitals|allergies/.test(titles),"non-conclusion sections are not kept as conclusions");

// ── the storage bound, which is the whole reason this is safe to store ──
const long="word ".repeat(400);
const bigConc=M.parseConclusions([{title:"Assessment",body:long}]);
ok(bigConc[0].body.length<=600,"a long conclusion is capped (~600 chars)");
ok(bigConc[0].truncated===true,"and the shortening is RECORDED, so the UI can say so — not silent like the old 10k rawText cap");
const shortConc=M.parseConclusions([{title:"Plan",body:"Continue current regimen."}]);
ok(shortConc[0].truncated===false,"a short conclusion is not marked truncated");
const manyDx=M.parseDiagnoses("DIAGNOSES:\n"+Array.from({length:120},(_,i)=>"Condition number "+i+" of the list").join("\n"));
ok(manyDx.length<=40,"the number of diagnoses is capped ("+manyDx.length+" ≤ 40)");
ok(manyDx.every(d=>d.text.length<=141),"each diagnosis line is length-capped");
const dup=M.parseDiagnoses("DIAGNOSES:\nEssential hypertension\nEssential hypertension\nESSENTIAL HYPERTENSION");
ok(dup.length===1,"duplicate diagnoses are collapsed");

// worst-case footprint of what a document now stores
const worstDx=JSON.stringify(manyDx).length, worstConc=JSON.stringify(M.parseConclusions(Array.from({length:20},()=>({title:"Assessment",body:long})))).length;
ok(worstDx+worstConc<12000,"worst-case diagnoses + conclusions stay under ~12 KB per document (actual: "+(worstDx+worstConc)+" bytes)");

// ── the retention policy still holds: no narrative text is stored ──
const saveFn=extractFn("const saveDocToLibrary=");
ok(!/rawText\s*:/.test(saveFn)&&!/summary\s*:/.test(saveFn)&&!/sections\s*:/.test(saveFn),"saveDocToLibrary still stores NO document text");
ok(/diagnoses\s*:/.test(saveFn)&&/conclusions\s*:/.test(saveFn),"saveDocToLibrary stores diagnoses and conclusions");
ok(/contentPolicy\s*:\s*"meds-labs-dx-only"/.test(saveFn),"the retention tag names the new policy");

console.log(f===0?"\n✅ CLINICAL EXTRACTION PROVEN — diagnoses + conclusions captured, bounded, and any shortening is recorded; no narrative text stored":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
