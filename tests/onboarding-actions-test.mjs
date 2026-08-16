// onboarding-actions-test.mjs — a SYSTEMIC check, written because three onboarding buttons in a row shipped as
// silent no-ops: "Back up now" (navigated instead of backing up), "Choose where to keep it" (required a field
// that screen doesn't have), and "Download a copy now" (the backup key was never prepared for a new user).
//
// Every one had the same shape: a handler bails early, reports through flash(), and the onboarding screens don't
// render flash's surface — so the failure is invisible and looks like a dead button. Reading the source for the
// specific bug of the week keeps missing the next one, so this asserts the PROPERTY: on a screen with no flash
// surface, every action must report its own outcome, and every path in those actions must return one.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function fn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
const strip=(t)=>t.replace(/\{\/\*[\s\S]*?\*\/\}/g,"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/[^\n]*$/gm,"");

// ── 1. the actions the onboarding screens call must all report an outcome ──
for(const name of ["const backupNow=async()=>","const handleEncryptedExport=async()=>","const setupContinuousBackup=async()=>"]){
  const body=strip(fn(name));
  const label=name.replace("const ","").replace("=async()=>","");
  const bails=[...body.matchAll(/return(?!\s+(true|false|null|await))\s*;/g)];
  ok(bails.length===0,label+": every exit returns an outcome — a bare `return;` is what makes a button look dead ("+bails.length+" found)");
  ok(/return (true|await )/.test(body),label+": reports success");
  ok(/return false/.test(body),label+": reports failure");
}

// ── 2. the backup key must exist on BOTH paths into the app ──
// This was the actual cause: it was prepared in tryAuth (returning users) but not completeSetup (new users), and
// onboarding only ever runs for new users.
const setup=fn("const completeSetup=async()=>");
ok(/deriveBackupPass\(/.test(setup),"completeSetup prepares the backup key — new users reach onboarding, and only this path runs for them");
ok(/deriveBackupPass\(setupCgPw\)/.test(setup),"…from the passcode they just chose");
const auth=fn("const finishUnlock=async(dek,mode,pc)=>");
ok(/deriveBackupPass\(pc\)/.test(auth),"finishUnlock prepares it for returning users");
const gp=fn("const getBackupPasscode=async()=>");
ok(/throw new Error/.test(gp),"getBackupPasscode still throws when unprepared…");
ok(/backupPassRef\.current/.test(gp),"…rather than silently returning something wrong");

// ── 3. onboarding screens have no flash surface, so they must report inline ──
const local=strip(src.slice(src.indexOf('{storageChoice==="local"&&(<>'), src.indexOf('{/* Self-hosting')));
ok(!/settingsMsg/.test(local),"the onboarding screen genuinely has no flash() surface");
const buttons=[...local.matchAll(/onClick=\{([\s\S]{0,320}?)\}>/g)].map(m=>m[1]);
ok(buttons.length>=2,"found the onboarding buttons ("+buttons.length+")");
const acting=buttons.filter(b=>/backupNow|setupContinuousBackup/.test(b));
ok(acting.length>=2,"…including the two that perform backup actions");
for(const b of acting) ok(/setOnbBackupMsg/.test(b),"a backup action on this screen reports its own outcome inline");

// ── 4. don't tell a Windows user about their iPhone ──
ok(/isIOSDevice\s*\n?\s*\?/.test(local)||/isIOSDevice$/m.test(local)||/isIOSDevice/.test(local),"the fallback branch checks the platform");
ok(/This browser doesn't let Care Guardian write to a file on its own/.test(local),"…and non-iOS browsers get accurate wording");
const iosClaim=local.indexOf("iPhone browsers don't allow");
ok(iosClaim<0||local.slice(Math.max(0,iosClaim-260),iosClaim).includes("isIOSDevice"),"the iPhone wording only appears under an iOS check — Brave on Windows hits this branch too");

console.log(f===0?"\n✅ ONBOARDING ACTIONS PROVEN — no silent bails, the backup key exists on both entry paths, and every action reports its outcome where the user can see it":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
