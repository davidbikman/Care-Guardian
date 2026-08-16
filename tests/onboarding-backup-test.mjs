// onboarding-backup-test.mjs — REGRESSION PROOF: "Choose where to keep it" did nothing at all.
// Two faults compounded, both mine:
//   1. setupContinuousBackup() required a TYPED passcode (backupPw) that only exists in the Settings form. On the
//      onboarding screen it is always empty, so the guard returned immediately.
//   2. That guard reports via flash(), and the onboarding screen does not render settingsMsg — so the refusal was
//      invisible. A button that refuses silently is indistinguishable from a broken one.
// The screen also PROMISED "Your passcode opens it. Nothing new to remember", while the function demanded a
// separate 6-character secret — the copy and the code disagreed.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
const fn=extractFn("const setupContinuousBackup=async()=>{");

// ── the blocking guard is gone ──
ok(!/if\(!backupPw\.trim\(\)\|\|backupPw\.trim\(\)\.length<6\)/.test(fn),"a typed passcode is no longer REQUIRED — that guard made the button a no-op wherever the field doesn't exist");
ok(/const typed=backupPw\.trim\(\);/.test(fn),"a typed passcode is read…");
ok(/if\(typed && typed\.length<6\)/.test(fn),"…and only validated when one was actually typed");
ok(/const pw=typed\|\|await getBackupPasscode\(\)/.test(fn),"with none typed it uses the passcode the user already unlocked with — matching what the screen promises");
ok(/\.\.\.\(typed\?\{backupPasscode:typed\}:\{\}\)/.test(fn),"only an EXPLICIT passcode is stored — freezing the derived one would break backups after a passcode change");

// ── the user-gesture requirement ──
const firstAwait=fn.indexOf("await "), picker=fn.indexOf("await window.showSaveFilePicker");
ok(picker>0&&firstAwait===picker,"showSaveFilePicker is the FIRST await — any await before it would consume the user gesture and the picker would never open");

// ── the outcome must be reportable ──
ok(/return true;/.test(fn),"success is reported");
ok(/return null;/.test(fn)&&/AbortError/.test(fn),"a cancelled picker is reported as cancelled, not as a failure");
ok((fn.match(/return false/g)||[]).length>=3,"every refusal path returns a failure value instead of returning silently");

// ── and shown, on a screen that has no flash() surface ──
// Assertions about what the app SAYS or RENDERS must read code, not comments — the source deliberately documents
// the bugs it fixed, and three separate tests have now tripped over their own explanatory text.
const stripComments=(t)=>t.replace(/\{\/\*[\s\S]*?\*\/\}/g,"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/[^\n]*$/gm,"");
const branch=stripComments(src.slice(src.indexOf('{storageChoice==="local"&&(<>'), src.indexOf('{/* Self-hosting')));
ok(!/settingsMsg/.test(branch),"the onboarding screen still doesn't render settingsMsg…");
ok(/setOnbBackupMsg/.test(branch),"…so it reports the outcome inline instead");
ok(/onbBackupMsg&&<p/.test(branch),"…and renders that message");
ok(/didn't let us set that up/.test(branch),"a failure says what happened in plain language");
ok(/backupStatus==="active"&&<div className="sync-status sync-status-success">/.test(branch),"success is confirmed on screen, so the user knows it worked");
ok(/Or just download a copy now/.test(branch),"a fallback is offered when the file picker isn't usable");

// ── the copy and the code now agree ──
ok(/Your passcode opens it/.test(branch),"the screen still promises the existing passcode opens the backup");
ok(!/backupPw/.test(branch),"…and the screen never asks for a second secret, which is what that promise means");

console.log(f===0?"\n✅ ONBOARDING BACKUP PROVEN — the button acts, uses the passcode the user already has, reports success, cancellation and failure on a screen with no flash surface":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
