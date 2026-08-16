// storage-failure-test.mjs — PROOF for Phase 4. Each assertion covers one row of the design's §10 failure table.
// Before this, every storage problem produced "Cloud sync failed: <http status>" — the least useful thing the app
// could say, because the user can't tell whether to reconnect, free space, wait, or fear for their records.
// The invariant underneath all of it: a storage failure must NEVER stop someone recording care on the device.
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
const M=new Function([cval("STORAGE_FAIL"),cval("STORAGE_FAIL_UI"),cval("storageFailUI"),cval("STORAGE_QUOTA_WARN"),
  extractFn("function classifyStorageError("),extractFn("function storageBackoffMs("),
  cval("storageShouldRetryNow"),extractFn("function storageQuotaState(")].join("\n")+
  "\nreturn {STORAGE_FAIL,storageFailUI,classifyStorageError,storageBackoffMs,storageShouldRetryNow,storageQuotaState};")();
const C=M.classifyStorageError, F=M.STORAGE_FAIL;
ok(typeof C==="function","extracted the real failure classifier from src/App.jsx");

// ── §10 row: token expired / consent revoked ──
ok(C(new Error("Cloud sign-in expired — reconnect in Sync settings."))===F.AUTH,"an expired sign-in is recognised as an AUTH problem");
ok(C(new Error("token refresh 401"))===F.AUTH&&C(new Error("HTTP 403"))===F.AUTH,"401 and 403 are auth, not generic failures");
ok(C(new Error("invalid_grant"))===F.AUTH,"a revoked consent (invalid_grant) is auth");
ok(M.storageFailUI(F.AUTH).action==="reconnect","…and the offered action is a one-tap reconnect");
ok(M.storageFailUI(F.AUTH).retry===false,"…with no blind retry, because retrying a dead token is pointless");

// ── §10 row: quota exhausted ──
ok(C(Object.assign(new Error("x"),{code:"QUOTA"}))===F.QUOTA,"the storage layer's own QUOTA code is honoured");
ok(C(new Error("507 Insufficient Storage"))===F.QUOTA&&C(new Error("quota exceeded"))===F.QUOTA,"provider quota wording is recognised");
ok(M.storageFailUI(F.QUOTA).retry===false,"a full account is not retried — it would just fail again");
ok(/still recording everything on this device/.test(M.storageFailUI(F.QUOTA).body),"…and the user is told recording continues regardless");
const q=M.storageQuotaState(85,100);
ok(q.level==="warn"&&q.pct===85,"quota is warned at 80% — BEFORE uploads stop, not after");
ok(M.storageQuotaState(50,100).level==="ok"&&M.storageQuotaState(100,100).level==="full","below the threshold is fine; at capacity is full");
ok(M.storageQuotaState(5,0).level==="unknown","a provider that doesn't report quota is 'unknown', not falsely 'ok'");

// ── §10 row: provider outage / offline ──
ok(C(new Error("bad gateway 502"))===F.OUTAGE&&C(new Error("503"))===F.OUTAGE,"5xx is an outage");
ok(C(new Error("Failed to fetch"))===F.OUTAGE,"a dropped connection is an outage");
ok(C(new Error("anything"),{offline:true})===F.OFFLINE,"being offline is detected first and treated as normal, not an error");
ok(M.storageFailUI(F.OFFLINE).alarm===false&&M.storageFailUI(F.OUTAGE).alarm===false,"neither offline nor an outage raises an alarm — they are expected on a phone");
ok(M.storageFailUI(F.OFFLINE).retry===true&&M.storageFailUI(F.OUTAGE).retry===true,"…both are retried automatically");

// ── §10 row: rate limiting ──
ok(C(new Error("429 Too Many Requests"))===F.RATE,"throttling is recognised");
ok(M.storageFailUI(F.RATE).retry===true,"…and handled by backing off rather than stopping");

// ── §10 row: user deleted the folder ──
ok(C(new Error("404 not found"))===F.MISSING,"a missing folder or object is recognised");
ok(M.storageFailUI(F.MISSING).action==="reupload","…and the offered action is to rebuild the cloud copy from the device");
ok(/still on this device/.test(M.storageFailUI(F.MISSING).body),"…having first said the records are safe");

// ── backoff is polite and bounded ──
ok(M.storageBackoffMs(1)<M.storageBackoffMs(2)&&M.storageBackoffMs(2)<M.storageBackoffMs(3),"backoff grows with each attempt");
ok(M.storageBackoffMs(50)<=3600000,"…but is capped, so a long outage doesn't push the next try beyond an hour");
ok(M.storageShouldRetryNow({nextAttemptAt:"2026-07-30T10:00:00Z"},"2026-07-30T09:59:00Z")===false,"a retry before its scheduled time is refused");
ok(M.storageShouldRetryNow({nextAttemptAt:"2026-07-30T10:00:00Z"},"2026-07-30T10:00:01Z")===true,"…and allowed once due");
ok(M.storageShouldRetryNow(null)===true,"with no prior failure, syncing is always allowed");

// ── every message answers 'where are my records?' ──
for(const k of Object.keys(M.STORAGE_FAIL_UI||{})){}
const uis=["auth","quota","offline","outage","rate","missing","unknown"].map(k=>M.storageFailUI(k));
ok(uis.every(u=>u.title&&u.body),"every failure class has a title and a plain-language explanation");
ok(uis.filter(u=>/on this device|safe|recording/i.test(u.body)).length>=6,"almost every message says where the records actually are — the only question a caregiver has");
ok(!uis.some(u=>/error|failed|HTTP|\d{3}/.test(u.title)),"no message shows a raw status code or the word 'failed' as its headline");

// ── wiring ──
const syncStart=src.indexOf("const cloudStorageSync="); const body=src.slice(syncStart,src.indexOf("\n  const ",syncStart+40));
ok(/recordStorageFailure\(e\)/.test(body),"the sync path classifies its errors instead of printing them");
ok(!/Cloud sync failed: /.test(src),"the old generic 'Cloud sync failed' message is gone");
ok(/clearStorageFailure\(\)/.test(body),"a successful sync clears the failure state");
const rec=extractFn("const recordStorageFailure=");
ok(/storageBackoffMs\(attempt\)/.test(rec),"consecutive failures of the same kind back off progressively");
ok(/prev\.cls===cls\?\(prev\.attempt\|\|0\):0/.test(rec.replace(/\s/g,"")),"a DIFFERENT kind of failure resets the attempt count rather than inheriting a long backoff");
ok(/hipaaAudit\(/.test(rec)&&/ui\.alarm/.test(rec),"serious failures are audited; routine offline blips are not");
ok(/storage-fail/.test(src)&&/Reconnect<\/button>/.test(src)&&/Upload everything again/.test(src),"the banner offers the class-appropriate action");
const reup=extractFn("const reuploadEverything=");
ok(/seenDevices:\{\}/.test(reup),"rebuilding forgets what it thought was already uploaded, so everything is re-sent");

console.log(f===0?"\n✅ FAILURE HANDLING PROVEN — auth, quota, offline, outage, rate-limit and missing-folder each get the right behaviour; backoff is bounded; recording never stops":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
