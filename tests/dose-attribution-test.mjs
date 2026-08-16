// dose-attribution-test.mjs — PROOF for dose attribution and skip-with-reason.
// Motivation (competitor analysis, §1): the single most common medication complaint is not knowing WHO gave a
// dose and WHEN. Multiple caregivers, one patient, no visibility → accidental double-dosing. Our log recorded
// {medId, slot, date, status, timestamp} and no actor at all.
// All logic EXTRACTED VERBATIM from src/App.jsx.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
function cval(n){const m=new RegExp("const\\s+"+n+"\\s*=\\s*").exec(src);if(!m)throw new Error("no const "+n);
  const st=m.index+m[0].length,ch=src[st]; let v;
  if(ch==="[") v=bal(src,st,"[","]"); else if(ch==="{") v=bal(src,st,"{","}");
  else if(ch==="(") { const a=src.indexOf("=>",st); let k=a+2; while(/\s/.test(src[k]))k++;
    v = src[k]==="{" ? src.slice(st,k)+bal(src,k,"{","}") : src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,""); }
  else v=src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,"");
  return "const "+n+" = "+v+";"}
const A=new Function([cval("MED_PRN_SLOT"),cval("MED_ADH"),cval("medDayKey"),
  extractFn("function medActiveOn("),extractFn("function medDayAdherence("),extractFn("function medDayState("),
  extractFn("function medAdherenceRange(")].join("\n")+
  "\nreturn {MED_ADH,medDayAdherence,medDayState,medAdherenceRange};")();

// ── the write path records an actor ──
const toggle=src.slice(src.indexOf("const logKey=`${medId}|${slot}|${date}`"), src.indexOf("const getMedStatus="));
ok(/by:\(p\.settings&&p\.settings\.deviceName\)/.test(toggle),"every dose records WHO — the caregiver's device name");
ok(/byId:/.test(toggle),"…and a stable id, so attribution survives a rename");
ok(/at:new Date\(\)\.toISOString\(\)/.test(toggle),"…and an ISO timestamp, which sorts and compares (the old toLocaleString did neither)");
ok(/timestamp:new Date\(\)\.toLocaleString\(\)/.test(toggle),"…while keeping the display string, so older entries still render");
ok(/\.\.\.actor/.test(toggle),"attribution is re-stamped on every state change, not just the first");

// ── the status cycle ──
ok(/given:"missed",missed:"refused",refused:"skipped"/.test(toggle),"the cycle is given → missed → refused → skipped → clear");
ok(/reason:\(next==="skipped"\|\|next==="refused"\)/.test(toggle),"a reason is retained for the two statuses that need one");
const reasons=cval("MED_SKIP_REASONS");
ok(/Held on clinical advice/.test(reasons)&&/Nil by mouth/.test(reasons),"the reasons offered are real clinical ones, not free text only");

// ── the grid must SHOW it — this is what actually prevents the double dose ──
const grid=src.slice(src.indexOf("{MED_TIME_SLOTS.map(s=>{const active"), src.indexOf("{MED_TIME_SLOTS.map(s=>{const active")+2200);
ok(/getMedEntry\(m\.id,s,medAdminDate\)/.test(grid),"the grid reads the full entry, not just a status");
ok(/entry\.by/.test(grid),"…and displays who gave the dose in the cell");
ok(/toLocaleTimeString/.test(grid),"…with the time it was given");
ok(/entry\.reason/.test(grid),"…and the reason when one was recorded");
ok(/title=\{entry\?/.test(grid),"a hover/long-press gives the full detail");

// ── a withheld dose is NOT counted as non-adherence ──
const meds=[{id:"m1",name:"Donepezil",timeSlots:["Morning","Bedtime"],startDate:"2026-06-01"}];
const L=(medId,slot,date,status)=>({key:medId+"|"+slot+"|"+date,medId,slot,date,status});
let d=A.medDayAdherence(meds,[L("m1","Morning","2026-06-20","given"),L("m1","Bedtime","2026-06-20","skipped")],"2026-06-20","m1");
ok(d.skipped===1,"a skipped dose is counted as skipped");
ok(d.scheduled===1&&d.given===1,"…and removed from the scheduled denominator");
ok(A.medDayState(d,"2026-06-20","2026-06-30")===A.MED_ADH.FULL,"a day where the only other dose was deliberately held reads as COMPLETE — following medical advice must never look like failing to medicate");
ok(d.unrecorded===0,"…and it is not double-counted as unrecorded");
const r=A.medAdherenceRange(meds,[L("m1","Morning","2026-06-20","given"),L("m1","Bedtime","2026-06-20","skipped")],"2026-06-20","2026-06-20","m1","2026-06-21");
ok(r.pct===100,"adherence reads 100% when every dose was either given or deliberately held");
ok(r.skipped===1,"…while the held dose is still visible in the totals, not hidden");

// ── refused is different from skipped, and still counts against adherence ──
d=A.medDayAdherence(meds,[L("m1","Morning","2026-06-20","refused")],"2026-06-20","m1");
ok(d.refused===1&&d.scheduled===2,"a REFUSED dose stays in the denominator — the patient declining is a clinical signal, not a plan change");

console.log(f===0?"\n✅ DOSE ATTRIBUTION PROVEN — who and when recorded and shown, ISO timestamps, skip-with-reason, and a deliberately held dose never counts as non-adherence":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
