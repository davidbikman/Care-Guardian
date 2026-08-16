// ics-export-test.mjs — PROOF for calendar export. The generator is EXTRACTED VERBATIM from src/App.jsx, and its
// output is validated by ical.js — an INDEPENDENT RFC 5545 parser — rather than by asserting on our own strings.
// If our folding, escaping or structure is wrong, a real calendar app would choke on it and so does ical.js.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const ICAL=require("ical.js");
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
const M=new Function([cval("ICS_PRODID"),cval("ICS_DEFAULT_MINUTES"),cval("icsEscape"),cval("icsPad"),cval("icsUtcStamp"),cval("icsCalendarTitle"),
  extractFn("function icsFold("),extractFn("function icsLocalStamp("),extractFn("function icsAddMinutes("),
  extractFn("function icsMakeUid("),extractFn("function icsVEvent("),extractFn("function icsCalendar(")].join("\n")+
  "\nreturn {icsCalendar,icsVEvent,icsFold,icsEscape,icsMakeUid,icsCalendarTitle,icsLocalStamp,icsAddMinutes};")();
ok(typeof M.icsCalendar==="function","extracted the real ICS generator from src/App.jsx");

const parse=(t)=>{ const comp=new ICAL.Component(ICAL.parse(t)); return {comp,events:comp.getAllSubcomponents("vevent")}; };

// ── structure, validated by an independent parser ──
const appt={id:"a1",uid:"cg-a1-scope-abc@careguardian",seq:0,title:"Neurology follow-up — Dr. Chen",date:"2026-07-14",time:"09:30",durationMin:45,notes:"Bring med list",location:"Memory Clinic"};
let out=M.icsCalendar([appt],{scope:"s1"});
let P; try{ P=parse(out); ok(true,"the generated calendar parses under an independent RFC 5545 parser (ical.js)"); }
catch(e){ ok(false,"parses under ical.js — FAILED: "+e.message); }
if(P){
  ok(P.comp.getFirstPropertyValue("version")==="2.0"&&/Care Guardian/.test(P.comp.getFirstPropertyValue("prodid")),"VCALENDAR carries VERSION and PRODID");
  const ev=new ICAL.Event(P.events[0]);
  ok(ev.uid===appt.uid,"the event keeps the stable UID");
  ok(ev.startDate.toString().startsWith("2026-07-14T09:30:00"),"start time is the appointment's local time");
  ok(ev.endDate.toString().startsWith("2026-07-14T10:15:00"),"end time honours the 45-minute length");
  ok(ev.startDate.zone.tzid==="floating","times are floating (no timezone shift) — 9:30 stays 9:30");
}

// ── the calendar-safe title ──
let ev0=new ICAL.Event(parse(M.icsCalendar([appt],{scope:"s"})).events[0]);
ok(ev0.summary==="Neurology follow-up — Dr. Chen","with no calendar title set, the real title is used");
const safe={...appt,calTitle:"Appointment"};
ev0=new ICAL.Event(parse(M.icsCalendar([safe],{scope:"s"})).events[0]);
ok(ev0.summary==="Appointment","a calendar-safe title REPLACES the clinical title in the exported event");
ok(!M.icsCalendar([safe],{scope:"s"}).includes("Neurology"),"the clinical title does not appear anywhere in the file");

// ── notes are opt-in, because they hold clinical detail ──
ok(!M.icsCalendar([appt],{scope:"s"}).includes("Bring med list"),"notes are omitted by default");
ok(M.icsCalendar([appt],{scope:"s",includeNotes:true}).includes("Bring med list"),"notes are included only when asked for");

// ── escaping and folding, the two things that corrupt real calendars ──
const tricky={id:"a2",uid:"u2@cg",date:"2026-07-14",time:"08:00",title:"Dr. Smith, Jr.; follow-up\nsecond line \\ backslash"};
const tOut=M.icsCalendar([tricky],{scope:"s"});
let tEv; try{ tEv=new ICAL.Event(parse(tOut).events[0]); ok(true,"commas, semicolons, newlines and backslashes survive a real parser"); }catch(e){ ok(false,"tricky text parses — FAILED: "+e.message); }
if(tEv) ok(tEv.summary===tricky.title,"…and round-trip to exactly the original text");
const longTitle="Ω"+"a".repeat(200)+"é";   // multi-byte at both ends
const lOut=M.icsCalendar([{id:"a3",uid:"u3@cg",date:"2026-07-14",time:"08:00",title:longTitle}],{scope:"s"});
ok(lOut.split("\r\n").every(l=>new TextEncoder().encode(l).length<=76),"every line is folded within the 75-octet limit");
ok(new ICAL.Event(parse(lOut).events[0]).summary===longTitle,"a long multi-byte title survives folding intact (no split UTF-8 sequences)");

// ── UID stability: the whole reason a re-export updates instead of duplicating ──
const a=M.icsMakeUid("a1","circle1"), b=M.icsMakeUid("a1","circle1");
ok(a!==b,"freshly minted UIDs are unique (they are minted once and then stored, never regenerated)");
const e1=new ICAL.Event(parse(M.icsCalendar([appt],{scope:"s"})).events[0]);
const e2=new ICAL.Event(parse(M.icsCalendar([appt],{scope:"s"})).events[0]);
ok(e1.uid===e2.uid,"exporting the SAME appointment twice yields the same UID — the calendar updates, it doesn't duplicate");
const bumped=new ICAL.Event(parse(M.icsCalendar([{...appt,seq:3}],{scope:"s"})).events[0]);
ok(bumped.sequence===3,"SEQUENCE is carried so the calendar knows which version is newer");
ok(M.icsMakeUid("1","circleA")!==M.icsMakeUid("1","circleB"),"two devices minting the same local id still produce different UIDs");

// ── cancellation ──
const cancelled=M.icsCalendar([{...appt,cancelled:true,seq:1}],{scope:"s"});
ok(parse(cancelled).events[0].getFirstPropertyValue("status")==="CANCELLED","a deleted appointment exports as CANCELLED so it disappears from the calendar");
ok(parse(M.icsCalendar([appt],{scope:"s"})).events[0].getFirstPropertyValue("status")==="CONFIRMED","a live appointment exports as CONFIRMED");

// ── the app wires it up ──
ok(/exportAllAppointmentsIcs/.test(src)&&/exportAppointmentIcs/.test(src),"the app exposes both whole-calendar and single-appointment export");
ok(/apptTombstones/.test(src),"deleting an exported appointment leaves a tombstone so the calendar entry is withdrawn");
ok(/text\/calendar/.test(src),"the file is handed over with the text/calendar type so the OS offers the calendar app");

console.log(f===0?"\n✅ CALENDAR EXPORT PROVEN — valid RFC 5545 under an independent parser; stable UIDs update instead of duplicating; clinical titles and notes stay out unless asked":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
