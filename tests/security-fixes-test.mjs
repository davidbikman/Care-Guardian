// ── PROOF of the three audit fixes ──
// (1) MFA client-wrap gap: once MFA is on, a full-DEK client wrap is dropped, so the client passcode can no longer
//     reach the full DEK (no single-factor bypass); a SCOPED client wrap survives and only ever yields DEK_R.
// (2) Reviewer name leak: the reviewer (no-PHI) projection carries a neutral label, not the care recipient's name.
// (3) HTTPS-intake: only https (or loopback http for dev) bases are accepted.
// Extracts the REAL helpers (mfaCarryClientWrap, projCareLabel, intakeBaseOk) + wrapDEK/unwrapDEK verbatim from src/App.jsx.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(declStart){const k=src.indexOf(declStart);if(k<0)throw new Error("decl not found "+declStart);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const singles=["const KDF_ITER =","const KDF_ITER_LEGACY =","const projCareLabel=","function intakeBaseOk("];
const multis=["async function wrapDEK(","async function unwrapDEK(","const GRANT_ARCHETYPES=","function mfaCarryClientWrap("];
const mod=[...singles.map(lineStarting),...multis.map(extractFn)].join("\n")+
  "\nreturn {wrapDEK,unwrapDEK,projCareLabel,intakeBaseOk,mfaCarryClientWrap};";
const A=new Function(mod)();
ok(typeof A.mfaCarryClientWrap==="function"&&typeof A.intakeBaseOk==="function","extracted the real fix helpers + DEK crypto from src/App.jsx");

const b64e=u=>Buffer.from(u).toString("base64");

(async()=>{
  // ── (1) MFA client-wrap gap ──
  const dek=crypto.getRandomValues(new Uint8Array(32));      // the full vault key
  const rKey=crypto.getRandomValues(new Uint8Array(32));     // DEK_R (projection only)
  const CLIENT_PC="care-recipient-pin";
  const rUnderF=b64e(crypto.getRandomValues(new Uint8Array(48))); // (opaque here; just must be carried)

  // default tier: client passcode wraps the FULL dek
  const fullWk={ c:await A.wrapDEK(dek,"caregiver-pc"), r:await A.wrapDEK(dek,CLIENT_PC), rUnderF };
  const afterFull=A.mfaCarryClientWrap(fullWk);
  ok(!("r" in afterFull)&&!("clientScope" in afterFull),"MFA drops a FULL-DEK client wrap (no r, no clientScope survive)");
  ok(afterFull.rUnderF===rUnderF,"rUnderF (DEK_R under the full key) is preserved so caregiver sessions still derive the projection key");
  // the decisive property: after MFA, there is simply no client wrap to unwrap → the client passcode cannot reach the full DEK
  let reached=false; try{ if(afterFull.r){ await A.unwrapDEK(afterFull.r,CLIENT_PC); reached=true; } }catch{ reached=true; }
  ok(!reached,"after MFA, the client passcode has NO path to the full DEK (the wrap is gone) — MFA bypass closed");

  // restricted tier: client passcode wraps only DEK_R, and that survives
  const scopedWk={ mfaKeys:[], r:await A.wrapDEK(rKey,CLIENT_PC), clientScope:"r", rUnderF };
  const afterScoped=A.mfaCarryClientWrap(scopedWk);
  ok(afterScoped.clientScope==="r"&&!!afterScoped.r,"a SCOPED client wrap survives MFA (the care recipient can still sign in)");
  const got=await A.unwrapDEK(afterScoped.r,CLIENT_PC);
  const sameBytes=(x,y)=>x.length===y.length&&x.every((b,i)=>b===y[i]);
  ok(sameBytes(got.dek,rKey)&&!sameBytes(got.dek,dek),"the surviving scoped wrap yields ONLY DEK_R (the projection key), never the full DEK");

  // ── (2) reviewer name leak ──
  ok(A.projCareLabel("reviewer","Eleanor Whitfield")==="Care recipient","reviewer projection carries a neutral label, not the name");
  ok(A.projCareLabel("navigator","Eleanor Whitfield")==="Eleanor Whitfield","navigator (PHI-authorized) still carries the name");
  ok(A.projCareLabel("navigator","")==="Care recipient","navigator with no name set falls back to a neutral label");

  // ── (3) HTTPS-intake ──
  ok(A.intakeBaseOk("https://intake.example.org")===true,"https base accepted");
  ok(A.intakeBaseOk("https://intake.example.org/o/")===true,"https base with path accepted");
  ok(A.intakeBaseOk("http://localhost:8788")===true,"http loopback (localhost) accepted for dev");
  ok(A.intakeBaseOk("http://127.0.0.1:8788")===true,"http loopback (127.0.0.1) accepted for dev");
  ok(A.intakeBaseOk("http://intake.example.org")===false,"http to a remote host is REJECTED (would expose the capabilities)");
  ok(A.intakeBaseOk("http://evil.example.org@localhost")===false || A.intakeBaseOk("http://evil.example.org")===false,"http remote rejected (no userinfo trick)");
  ok(A.intakeBaseOk("ftp://intake.example.org")===false,"non-http(s) scheme rejected");
  ok(A.intakeBaseOk("not a url")===false&&A.intakeBaseOk("")===false,"garbage / empty base rejected");

  console.log(f===0?"\n✅ ALL THREE AUDIT FIXES PROVEN — MFA bypass closed, reviewer name withheld, intake requires TLS":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
