// backup-passcode-test.mjs — REGRESSION PROOF for a bug I shipped and David caught on a real phone:
//   "Couldn't back up: Failed to execute 'exportKey' on 'SubtleCrypto': parameter 2 is not of type 'CryptoKey'."
// Cause: getBackupPasscode called crypto.subtle.exportKey("raw", dekRef.current), but generateDEK() returns a
// Uint8Array, not a CryptoKey. The crash was LUCKY. The deeper flaw: a DEK-derived passcode is a random value the
// user never sees, while restore decrypts with a passcode they TYPE — so on a new device after losing the old one
// there is no DEK to derive from and nothing to type. Every backup would have been UNRESTORABLE.
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
if(!globalThis.crypto) globalThis.crypto=webcrypto;
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function cval(n){const m=new RegExp("const\\s+"+n+"\\s*=\\s*").exec(src);if(!m)throw new Error("no const "+n);
  const st=m.index+m[0].length,ch=src[st]; let v;
  if(ch==="[") v=bal(src,st,"[","]"); else if(ch==="{") v=bal(src,st,"{","}");
  else if(ch==="(" || src.startsWith("async",st)) { const a=src.indexOf("=>",st); let k=a+2; while(/\s/.test(src[k]))k++;
    v = src[k]==="{" ? src.slice(st,k)+bal(src,k,"{","}") : src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,""); }
  else v=src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,"");
  return "const "+n+" = "+v+";"}
const M=new Function([cval("b64enc"),cval("deriveBackupPass")].join("\n")+"\nreturn {deriveBackupPass};")();

(async()=>{
  // ── the crash is impossible now ──
  // strip comments — the source DOCUMENTS the old bug, and the rule is about code, not the explanation of it
const codeOnly=src.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/[^\n]*$/gm,"");
ok(!/exportKey\("raw",\s*dekRef\.current\)/.test(codeOnly),"getBackupPasscode no longer calls exportKey on the DEK");
  ok(/generateDEK\(\)\s*\{\s*return crypto\.getRandomValues/.test(src.replace(/\n/g," ")),"…the DEK is raw bytes, which is why exportKey threw");
  const gp=src.slice(src.indexOf("const getBackupPasscode="),src.indexOf("const getBackupPasscode=")+700);
  ok(!/dekRef/.test(gp),"the backup passcode is no longer derived from the DEK at all");
  ok(/backupPassRef\.current/.test(gp),"…it comes from a value prepared at unlock");

  // ── the deeper flaw: derived from something the USER CAN TYPE ──
  const d=src.slice(src.indexOf("const deriveBackupPass="),src.indexOf("const deriveBackupPass=")+400);
  ok(/passcode/.test(d)&&!/dekRef/.test(d),"the derivation input is the PASSCODE, not the device key");
  ok(/finishUnlock=async\(dek,mode,pc\)=>\{[\s\S]{0,240}deriveBackupPass\(pc\)/.test(src),"it is prepared at unlock, where the typed passcode is in scope");
  ok(/deriveBackupPass\(cgPw\)/.test(src),"…and at first-time setup from the chosen passcode");
  ok(/dekRef\.current=null;backupPassRef\.current=""/.test(src),"it is cleared on lock, like the device key");
  ok(!/backupPassRef[^=]{0,40}=[^;]{0,40}settings/.test(src),"it is never persisted — session only");

  // ── THE PROPERTY THAT MATTERS: same passcode ⇒ same key, on any device ──
  const p1=await M.deriveBackupPass("correct horse battery");
  const p2=await M.deriveBackupPass("correct horse battery");
  ok(p1===p2&&p1.length>0,"the same passcode always derives the same backup key — so a backup made on a lost phone opens on a new one");
  ok(await M.deriveBackupPass("correct horse batteryX")!==p1,"a different passcode derives a different key");
  ok(await M.deriveBackupPass("")==="","an empty passcode derives nothing rather than a constant");

  // ── restore must accept either form ──
  const fx=src.slice(src.indexOf("const decryptBackupFlexible="),src.indexOf("const decryptBackupFlexible=")+520);
  ok(/\[t, await deriveBackupPass\(t\)\]/.test(fx),"restore tries the typed value AND its derivation");
  ok(/for\(const pw of tries\)/.test(fx),"…in turn, so a caregiver needn't know which kind of secret their file used");
  ok(/decryptBackupFlexible\(json\.data,importPw/.test(src),"the import path uses it");

  // ── a failure must not be dressed as a success (green box in David's screenshot) ──
  const fl=src.slice(src.indexOf("const flash=("),src.indexOf("const flash=(")+420);
  ok(/couldn't\|could not\|failed/i.test(fl),"flash() detects failure wording");
  ok(/bad:true/.test(fl),"…and marks it, so 'Couldn't back up' no longer renders in the success-green box");
  ok(/rv-flash-bad/.test(src),"an error style exists");

  // ── and the banner must not squeeze its own text on a phone ──
  ok(/@media\(max-width:640px\)\{\.nudge\{flex-wrap:wrap\}/.test(src),"the backup banner wraps on narrow screens instead of crushing the text into a column");

  console.log(f===0?"\n✅ BACKUP PASSCODE FIXED — no exportKey on raw bytes, derived from a passcode the user can actually type, same key on any device, restore accepts either form":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
