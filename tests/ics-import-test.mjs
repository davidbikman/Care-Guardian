// ics-import-test.mjs — PROOF for calendar IMPORT (the caregiver's own calendar) and conflict detection.
// Parser EXTRACTED VERBATIM from src/App.jsx. Fixtures are built with ical.js — an independent library — so we
// parse files produced by someone else's encoder, not just our own output.
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
const M=new Function([cval("ICSIMP_MAX_EVENTS"),cval("ICSIMP_MAX_TITLE"),cval("icsUnfold"),cval("icsUnescape"),cval("icsMinutes"),
  extractFn("function icsParseWhen("),extractFn("function icsParseEvents("),extractFn("function icsFindConflicts(")].join("\n")+
  "\nreturn {icsParseEvents,icsFindConflicts,icsParseWhen,icsUnfold};")();
ok(typeof M.icsParseEvents==="function","extracted the real calendar importer from src/App.jsx");

const TODAY="2026-07-13";
// build fixtures with ical.js so we're parsing a third party's output
function mk(events){
  const cal=new ICAL.Component(["vcalendar",[],[]]);
  cal.addPropertyWithValue("version","2.0"); cal.addPropertyWithValue("prodid","-//Test//EN");
  for(const e of events){
    const v=new ICAL.Component("vevent"); const ev=new ICAL.Event(v);
    ev.uid=e.uid||("u"+Math.random()); ev.summary=e.summary;
    ev.startDate=ICAL.Time.fromString(e.start); if(e.end) ev.endDate=ICAL.Time.fromString(e.end);
    if(e.rrule) v.addPropertyWithValue("rrule",ICAL.Recur.fromString(e.rrule));  // must be a Recur, not a string
    if(e.status) v.addPropertyWithValue("status",e.status);
    cal.addSubcomponent(v);
  }
  return cal.toString();
}
// ── basic parsing of a third-party file ──
let r=M.icsParseEvents(mk([{summary:"Work shift",start:"2026-07-14T08:00:00",end:"2026-07-14T16:00:00"}]),{today:TODAY});
ok(r.events.length===1,"an event written by ical.js is parsed back");
ok(r.events[0].title==="Work shift"&&r.events[0].date==="2026-07-14"&&r.events[0].time==="08:00","title, date and start time are read correctly");
ok(r.events[0].endTime==="16:00","the end time is read for same-day events");

// ── folding and escaping produced by the other library ──
const longSummary="Team meeting, with the regional coordinator; quarterly review \\ planning "+"x".repeat(90);
r=M.icsParseEvents(mk([{summary:longSummary,start:"2026-07-15T09:00:00"}]),{today:TODAY});
ok(r.events[0].title===longSummary.slice(0,80),"a folded, escaped summary is unfolded and unescaped correctly (then capped for storage)");

// ── all-day and UTC ──
r=M.icsParseEvents(mk([{summary:"Conference",start:"2026-07-16"}]),{today:TODAY});
ok(r.events[0].allDay===true&&r.events[0].date==="2026-07-16","an all-day event is recognised as all-day");
const utc=M.icsParseWhen("20260714T160000","");
ok(utc.time==="16:00","a plain local timestamp is taken as local time");
ok(M.icsParseWhen("20260714","VALUE=DATE").allDay===true,"a DATE value is treated as all-day");

// ── recurrence, and honest limits ──
r=M.icsParseEvents(mk([{summary:"Night shift",start:"2026-07-14T22:00:00",rrule:"FREQ=WEEKLY;COUNT=4"}]),{today:TODAY});
ok(r.events.length===4,"a simple weekly rota is expanded into its occurrences ("+r.events.length+")");
ok(r.events.map(e=>e.date).join()==="2026-07-14,2026-07-21,2026-07-28,2026-08-04","occurrences land on the right dates");
r=M.icsParseEvents(mk([{summary:"Odd rule",start:"2026-07-14T09:00:00",rrule:"FREQ=MONTHLY;BYDAY=2TU"}]),{today:TODAY});
ok(r.events.length===1&&r.skippedComplexRecurrence===1,"a recurrence rule too complex to expand is reported, not silently guessed at");

// ── hygiene: cancelled, past, bounded ──
r=M.icsParseEvents(mk([{summary:"Called off",start:"2026-07-20T09:00:00",status:"CANCELLED"}]),{today:TODAY});
ok(r.events.length===0,"a cancelled event is not imported");
r=M.icsParseEvents(mk([{summary:"Old",start:"2026-01-05T09:00:00"},{summary:"Soon",start:"2026-07-20T09:00:00"}]),{today:TODAY});
ok(r.events.length===1&&r.events[0].title==="Soon","past events are left out — only what's ahead can clash");
r=M.icsParseEvents(mk([{summary:"Far future",start:"2027-06-01T09:00:00"}]),{today:TODAY});
ok(r.events.length===0,"events beyond the 120-day horizon are not stored");
const many=[]; for(let i=0;i<600;i++) many.push({summary:"E"+i,start:"2026-07-"+String(14+(i%15)).padStart(2,"0")+"T09:00:00"});
ok(M.icsParseEvents(mk(many),{today:TODAY}).events.length<=400,"the number of imported events is capped — the vault doesn't become a copy of a work calendar");

// ── conflict detection ──
const appts=[{id:"a1",title:"Neurology",date:"2026-07-14",time:"09:00",durationMin:60},
             {id:"a2",title:"Dentist",date:"2026-07-15",time:"14:00",durationMin:30}];
const evs=M.icsParseEvents(mk([
  {summary:"Work shift",start:"2026-07-14T08:00:00",end:"2026-07-14T16:00:00"},
  {summary:"Lunch",start:"2026-07-15T12:00:00",end:"2026-07-15T13:00:00"}]),{today:TODAY}).events;
const hits=M.icsFindConflicts(appts,evs);
ok(hits.length===1&&hits[0].appt.id==="a1","an appointment inside a work shift is flagged");
ok(!hits.some(h=>h.appt.id==="a2"),"an appointment that merely shares a day with a non-overlapping event is NOT flagged");
const edge=M.icsFindConflicts([{id:"e1",date:"2026-07-14",time:"16:00",durationMin:30}],evs);
ok(edge.length===0,"an appointment starting exactly when an event ends is not a clash");
const allDay=M.icsFindConflicts([{id:"e2",date:"2026-07-16",time:"09:00",durationMin:60}],
  M.icsParseEvents(mk([{summary:"Away day",start:"2026-07-16"}]),{today:TODAY}).events);
ok(allDay.length===1&&allDay[0].allDay===true,"an all-day event clashes with anything that day, and is marked as all-day");

// ── wiring + privacy posture ──
ok(/handleExtCalImport/.test(src)&&/accept=\"\.ics,text\/calendar\"/.test(src),"the app wires a calendar file picker");
// NOTE: the app does use OAuth elsewhere (cloud backup to Dropbox/Drive/OneDrive). The claim here is narrower and
// is what matters for calendars: the calendar import path itself performs no network call and needs no account.
const impStart=src.indexOf("const handleExtCalImport="); const impBody=src.slice(impStart,src.indexOf("const clearExtCal=",impStart));
ok(impStart>0&&!/fetch\(|XMLHttpRequest|oauth|accounts\.google|login\.microsoftonline/i.test(impBody),"the calendar import path makes no network call and needs no account — it reads a file");
ok(/externalCal/.test(src)&&/clearExtCal/.test(src),"imported events are stored under one key the user can clear");

console.log(f===0?"\n✅ CALENDAR IMPORT PROVEN — third-party files parse, simple rotas expand, complex rules reported not guessed, clashes detected, storage bounded":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
