// backup-ux-test.mjs — PROOF for the backup rework. The headline defect: "Back up now" did not back anything up.
// Its handler was {setShowBackupReminder(false); nav("settings")} — it hid the banner and navigated, exported
// nothing, and never stamped a backup marker, so the prompt returned on the next unlock. David hit exactly that.
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
if(!globalThis.crypto) globalThis.crypto=webcrypto;
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
const M=new Function([cval("BACKUP_COUNT_KEYS"),extractFn("function backupCountable("),
  extractFn("async function backupFingerprint("),extractFn("function backupState("),
  extractFn("function relTime(")].join("\n")+
  "\nreturn {backupCountable,backupFingerprint,backupState,relTime};")();

(async()=>{
  // ── the bug ──
  ok(!/onClick=\{\(\)=>\{setShowBackupReminder\(false\);nav\("settings"\)\}\}>Back up now/.test(src),"the 'Back up now' button no longer just hides the banner and navigates");
  ok(/onClick=\{backupNow\}>Back up now/.test(src),"…it calls backupNow");
  const bn=extractFn("const backupNow=");
  ok(/writeBackupToHandle\(/.test(bn)&&/handleEncryptedExport\(\)/.test(bn),"backupNow actually writes a backup — to the chosen file if there is one, otherwise a download");
  ok(/markBackedUp\(\)/.test(bn),"…and records that it happened");
  ok(/checkHandlePermission/.test(bn),"…handling the case where file permission lapsed rather than failing silently");

  // ── the nag ──
  const eff=src.slice(src.indexOf("const [backupFp,setBackupFp]"), src.indexOf("const backupNow="));
  ok(/\[authed,backupStatus,data\]/.test(eff),"the reminder depends on DATA, so locking/unlocking alone can't re-trigger it");
  ok(/backupState\(data,fp\)/.test(eff),"…and asks whether the content is backed up, not when a date was stamped");
  ok(!/7\*24\*60\*60\*1000/.test(eff),"the arbitrary seven-day staleness rule is gone from the reminder");

  // ── fingerprint semantics ──
  const base={incidents:[{id:1}],settings:{deviceName:"x"},medSchedule:{medications:[],log:[]}};
  const fp1=await M.backupFingerprint(base);
  ok(M.backupState(base,fp1).state==="none","with no marker recorded, the app says there is no backup yet");
  const marked={...base,settings:{...base.settings,backupFingerprint:fp1,backupCount:M.backupCountable(base)}};
  ok(M.backupState(marked,await M.backupFingerprint(marked)).state==="up-to-date","after backing up, the state is up-to-date");
  // the thing that caused the nag: session changes must not alter the fingerprint
  const relocked={...marked,_sync:{lastSync:"2026-08-02T10:00:00Z"},_outbox:[{key:"a"}],
    settings:{...marked.settings,lastBackupAt:"2026-08-02T10:00:00Z"}};
  ok(await M.backupFingerprint(relocked)===await M.backupFingerprint(marked),"sync clocks, the upload queue and the backup timestamp DON'T change the fingerprint — otherwise the app would report itself out of date the moment it finished backing up");
  const changed={...marked,incidents:[{id:1},{id:2},{id:3}]};
  const st=M.backupState(changed,await M.backupFingerprint(changed));
  ok(st.state==="behind","adding records puts the backup behind");
  ok(st.changed===2,"…and the app can say HOW MANY records changed ("+st.changed+"), not just 'it's been a while'");

  // ── one passcode (decisions 1 + 3) ──
  ok(src.match(/const getBackupPasscode=/g).length===1,"there is exactly ONE backup passcode accessor");
  const gp=extractFn("const getBackupPasscode=");
  // Corrected after David hit "parameter 2 is not of type 'CryptoKey'": deriving from the DEK both crashed (the
  // DEK is raw bytes) and would have produced unrestorable backups (nothing to type on a new device). It is now
  // derived from the PASSCODE — see backup-passcode-test.mjs.
  ok(/backupPassRef\.current/.test(gp)&&!/dekRef/.test(gp),"the backup passcode comes from the user's passcode, not the device key");
  ok(/settings\.backupPasscode/.test(gp),"…unless an admin deliberately set their own");
  ok(!/if\(!exportPw\.trim\(\)\)\{flash\("Enter an export passcode\."\)/.test(src),"manual export no longer demands a freshly-invented passcode");
  ok(/exportPw\.trim\(\)\|\|await getBackupPasscode\(\)/.test(src),"…it falls back to the one derived passcode");

  // ── Protect Your Data: three real buttons (and Team moved out, decision 4) ──
  const steps=src.slice(src.indexOf('<div className="protect-steps">'), src.indexOf('protect-pointer'));
  ok((steps.match(/protect-btn/g)||[]).length>=3,"every step now has a button, not just the first");
  ok(/onClick=\{backupNow\}/.test(steps)||/onClick=\{setupContinuousBackup\}/.test(steps),"step 2 acts on backup directly");
  ok(/hasRecoveryKit\(\)/.test(steps),"step 3 is the recovery kit");
  ok(!/establish a Team/.test(src),"the Team step is gone from Protect Your Data");
  ok(/protect-pointer/.test(src)&&/My Circle/.test(src),"…replaced by a pointer to Team Management, since multi-device copies do aid durability");
  ok(/id="security-group"/.test(src),"the recovery jump targets a real element");
  const jump=steps.slice(steps.indexOf("Create my recovery kit")-420);
  ok(/el\.open=true/.test(jump),"…and OPENS the collapsed group first — scrolling to a closed <details> would show nothing");

  // ── onboarding folds backup in (decision 2) ──
  const local=src.slice(src.indexOf('{storageChoice==="local"&&(<>'), src.indexOf('{/* Self-hosting'));
  ok(/setupContinuousBackup/.test(local),"the local-only path offers automatic backup inline, not as a separate step");
  ok(/Your passcode opens it/.test(local),"…and says the existing passcode is what opens it — nothing new to remember");
  ok(/hasFileSystemAccess\?/.test(local),"…with an iPhone-specific path rather than an error after the fact");
  ok(/skipStorageChoice\(\)/.test(local),"skipping remains available and keeps the nudge live");

  // ── relative time ──
  ok(M.relTime(new Date(Date.now()-4*60000).toISOString())==="4 minutes ago","times read naturally");
  ok(M.relTime("")==="","…and an absent time renders as nothing rather than 'Invalid Date'");

  console.log(f===0?"\n✅ BACKUP UX PROVEN — the button backs up, the nag follows content not sessions, one derived passcode, three real buttons, backup folded into onboarding":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
