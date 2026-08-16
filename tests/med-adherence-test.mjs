// med-adherence-test.mjs — PROOF for the medication adherence calendar. All logic EXTRACTED VERBATIM from
// src/App.jsx. The colours on that calendar are a clinical claim about whether someone got their medication, so
// the arithmetic behind them is tested directly: PRN doses must never count as missed, a medication must not be
// judged on days before it was prescribed or after it was stopped, and a dose NOBODY RECORDED must not be
// reported as a dose someone refused or missed.
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
const M=new Function([cval("MED_PRN_SLOT"),cval("MED_ADH"),cval("medDayKey"),cval("medScheduledSlots"),
  extractFn("function medActiveOn("),extractFn("function medDayAdherence("),extractFn("function medDayState("),
  extractFn("function medAdherenceRange("),extractFn("function medStreak(")].join("\n")+
  "\nreturn {MED_ADH,medDayKey,medActiveOn,medDayAdherence,medDayState,medAdherenceRange,medStreak,medScheduledSlots};")();
ok(typeof M.medAdherenceRange==="function","extracted the real adherence math from src/App.jsx");
const A=M.MED_ADH;

const meds=[
  {id:"m1",name:"Donepezil",timeSlots:["Morning","Bedtime"],startDate:"2026-06-01"},
  {id:"m2",name:"Lorazepam",timeSlots:["As Needed"],startDate:"2026-06-01"},
  {id:"m3",name:"Old Med",timeSlots:["Morning"],startDate:"2026-06-01",discontinued:true,discontinuedDate:"2026-06-10"},
  {id:"m4",name:"New Med",timeSlots:["Morning"],startDate:"2026-06-15"},
];
const L=(medId,slot,date,status)=>({key:medId+"|"+slot+"|"+date,medId,slot,date,status});

// ── PRN ──
let d=M.medDayAdherence(meds,[L("m2","As Needed","2026-06-20","given")],"2026-06-20","m2");
ok(d.scheduled===0,"an as-needed medication contributes NO scheduled doses — it can never be 'missed'");
ok(d.prnGiven===1,"an as-needed dose that was given is still counted as activity");
ok(M.medDayState(d,"2026-06-20","2026-06-30")===A.FULL,"a day whose only activity is a PRN dose reads as complete, not empty");

// ── lifecycle ──
ok(M.medActiveOn(meds[3],"2026-06-14")===false&&M.medActiveOn(meds[3],"2026-06-15")===true,"a medication doesn't count before its start date");
ok(M.medActiveOn(meds[2],"2026-06-10")===true&&M.medActiveOn(meds[2],"2026-06-11")===false,"a discontinued medication stops counting the day after it was stopped");
ok(M.medDayAdherence(meds,[],"2026-06-25","m3").scheduled===0,"no adherence is expected from a stopped medication");

// ── day states ──
const day=(logs,date)=>M.medDayAdherence(meds,logs,date||"2026-06-20","m1");
ok(M.medDayState(day([L("m1","Morning","2026-06-20","given"),L("m1","Bedtime","2026-06-20","given")]),"2026-06-20","2026-06-30")===A.FULL,"both doses given → full");
ok(M.medDayState(day([L("m1","Morning","2026-06-20","given")]),"2026-06-20","2026-06-30")===A.PARTIAL,"one of two given → partial");
ok(M.medDayState(day([L("m1","Morning","2026-06-20","missed"),L("m1","Bedtime","2026-06-20","refused")]),"2026-06-20","2026-06-30")===A.MISSED,"explicitly missed/refused → missed");
ok(M.medDayState(day([]),"2026-06-20","2026-06-30")===A.UNRECORDED,"nothing logged → UNRECORDED, which is not the same claim as 'missed'");
ok(M.medDayState(day([]),"2026-07-20","2026-06-30")===A.FUTURE,"a future day is neutral, not a failure");
const dd=day([L("m1","Morning","2026-06-20","missed")]);
ok(dd.missed===1&&dd.unrecorded===1,"a day can be part explicitly-missed and part simply unrecorded, counted separately");

// ── range totals ──
const logs=[];
for(const dt of ["2026-06-16","2026-06-17","2026-06-18"]) { logs.push(L("m1","Morning",dt,"given"),L("m1","Bedtime",dt,"given")); }
logs.push(L("m1","Morning","2026-06-19","given"));                    // partial day
logs.push(L("m1","Morning","2026-06-20","missed"),L("m1","Bedtime","2026-06-20","missed"));
const r=M.medAdherenceRange(meds,logs,"2026-06-16","2026-06-21","m1","2026-06-21");
ok(r.scheduled===12,"scheduled doses count two per day across six days");
ok(r.given===7&&r.missed===2&&r.unrecorded===3,"given / missed / unrecorded are tallied separately");
ok(r.pct===Math.round(7/12*100),"adherence % is doses given ÷ doses scheduled");
const rf=M.medAdherenceRange(meds,logs,"2026-06-16","2026-06-21","m1","2026-06-18");
ok(rf.scheduled===6,"days after today are excluded from the totals — the future isn't counted against anyone");

// ── filtering ──
const all=M.medAdherenceRange(meds,logs,"2026-06-16","2026-06-16","all","2026-06-21");
const one=M.medAdherenceRange(meds,logs,"2026-06-16","2026-06-16","m1","2026-06-21");
ok(all.scheduled===3&&one.scheduled===2,"filtering to one medication narrows the denominator (all: m1 two slots + m4 one)");

// ── streak ──
const sLogs=[]; for(const dt of ["2026-06-18","2026-06-19","2026-06-20"]) sLogs.push(L("m1","Morning",dt,"given"),L("m1","Bedtime",dt,"given"));
const sr=M.medAdherenceRange(meds,sLogs,"2026-06-16","2026-06-20","m1","2026-06-20");
ok(M.medStreak(sr.days,"2026-06-20")===3,"the streak counts consecutive fully-given days ending today");
const brk=sr.days.map(x=>x.date==="2026-06-19"?{...x,state:A.MISSED}:x);
ok(M.medStreak(brk,"2026-06-20")===1,"a missed day breaks the streak");
const gap=sr.days.map(x=>x.date==="2026-06-19"?{...x,state:A.NONE}:x);
ok(M.medStreak(gap,"2026-06-20")===2,"a day with nothing scheduled doesn't break the streak, but isn't credited as an adherent day either");

// ── the change log must live inside the medication view (it was rendering on every screen) ──
// The caregiver grid is now gated with !isClient, because the care recipient gets their own large-print
// next-dose view instead of an admin grid. Anchor on the gated form.
const start=src.indexOf('{view==="medadmin"&&!isClient&&(<>'), next=src.indexOf('{view==="expenses"',start);
const slice=src.slice(start,next);
ok(slice.includes("Medication change log"),"the medication change log sits inside the medication view");
ok(slice.lastIndexOf("</>)}")>slice.indexOf("Medication change log"),"…and before that view closes, so it no longer renders on every screen");
// It must render in exactly ONE place, and that place must be the BOTTOM of the medication view — after both the
// Day and Calendar blocks have closed — so it can't drift into another screen or into one of the sub-views.
const renders=(src.match(/\(data\.medChanges\|\|\[\]\)\.slice/g)||[]).length;
ok(renders===1,"the change log is rendered in exactly one place in the whole app (found "+renders+")");
const dayClose=slice.indexOf('{medView==="day"'), calOpen=slice.indexOf('{medView==="calendar"');
const calClose=slice.indexOf("})()}",calOpen), logAt=slice.indexOf("Medication change log");
ok(dayClose>=0&&calOpen>dayClose,"the Day block comes first, then the Calendar block");
ok(logAt>calClose,"the change log sits AFTER both sub-views close — i.e. at the bottom of the log, in Day and Calendar alike");
ok(slice.includes('medView==="calendar"')&&slice.includes('medView==="day"'),"the day and calendar views are both wired");
// The care recipient must not be shown the caregiver's admin grid.
ok(/view==="medadmin"&&isClient&&/.test(src),"the care recipient gets their own medication view");
ok(/view==="medadmin"&&!isClient&&/.test(src),"…and the caregiver grid is gated away from them");

console.log(f===0?"\n✅ ADHERENCE MATH PROVEN — PRN never counts as missed, stopped/not-yet-started meds excluded, unrecorded ≠ missed, filters and streaks correct":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
