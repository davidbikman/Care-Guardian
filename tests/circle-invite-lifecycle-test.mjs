// circle-invite-lifecycle-test.mjs — PROOF of remote-invite hardening: (1) time-boxed expiry (extracted circleInviteExpired,
// checked against a REAL sealed+fetched bundle over HTTP) and (2) host cancel/revoke (server-enforced — a cancelled invite
// can neither be claimed nor written, whether or not the pending device already claimed). Real extracted code; real Argon2id.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { argon2id } from "hash-wasm";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const require = createRequire(import.meta.url);
const { createIntakeServer } = require("../intake-server/server.cjs");
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("decl not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const ki=src.indexOf("const INTAKE_BACKENDS=");const objText=sliceBalanced(src,src.indexOf("{",ki));
const drop='const {argon2id}=await import("hash-wasm"); ';
const singles=["const _ib=","const b64enc=","const b64dec=","async function circleGcmEnc(","async function circleGcmDec(","const CIRCLE_REMOTE_AAD=","const CIRCLE_ARGON=","const circleInviteExpired="];
const mod="const INTAKE_BACKENDS="+objText+";\n"+singles.map(lineStarting).join("\n")+"\n"+
  extractFn("async function circleRemoteSeal(").replace(drop,"")+"\n"+extractFn("async function circleRemoteOpen(").replace(drop,"")+
  "\nreturn {INTAKE_BACKENDS,circleRemoteSeal,circleRemoteOpen,circleInviteExpired};";
const C=new Function("argon2id",mod)(argon2id);
const ADMIN="admintok"; const b64=u=>Buffer.from(u).toString("base64");
const revoke=(base,prefix)=>fetch(base+"/admin/revoke",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":ADMIN},body:JSON.stringify({prefix})});
(async()=>{
  ok(typeof C.circleInviteExpired==="function","extracted the real circleInviteExpired + seal/open + relay client from src/App.jsx");
  // (1a) the predicate itself
  ok(C.circleInviteExpired({expiresAt:Date.now()-1000})===true,"a past-dated invite reads as expired");
  ok(C.circleInviteExpired({expiresAt:Date.now()+1000})===false,"a future-dated invite reads as valid");
  ok(C.circleInviteExpired({})===false,"an invite with no expiry is treated as non-expiring (back-compatible)");

  const tmp=mkdtempSync(join(tmpdir(),"clife-"));
  const srv=createIntakeServer({storageDir:tmp,adminToken:ADMIN,allowOrigin:"*"});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+srv.address().port;
  const pass="able-acid-acre-aged-airy-alarm"; const circleKey=b64(crypto.getRandomValues(new Uint8Array(32)));

  // (1b) expiry on a REAL sealed+fetched bundle
  const expiredBundle=JSON.stringify({circleKey,circleId:"c1",assignedDeviceId:"dev-x",expiresAt:Date.now()-60000,relay:{base,claimToken:"t",readCap:"r"}});
  const envE=await C.circleRemoteSeal(expiredBundle,pass);
  const invCap=await C.INTAKE_BACKENDS.https.claim({base,claimToken:srv._addClaimToken("circle/c1/invite/invE/"),grantId:"invE"});
  await C.INTAKE_BACKENDS.https.push({base,prefix:invCap.prefix,writeCap:invCap.writeCap},"blob",JSON.stringify(envE));
  const rc=srv._mintReadCap("circle/c1/invite/invE/");
  const fetched=JSON.parse(await C.circleRemoteOpen(JSON.parse(await C.INTAKE_BACKENDS.https.get({base,readCap:rc},"circle/c1/invite/invE/blob")),pass));
  ok(C.circleInviteExpired(fetched)===true,"the joiner unlocks the bundle but the expiry gate refuses it (real HTTP round-trip)");
  // tamper resistance: expiry lives inside the AES-GCM bundle, so it can't be edited without the passphrase
  ok(JSON.stringify(envE).indexOf(String(fetched.expiresAt))===-1,"the expiry is sealed inside the ciphertext, not exposed in the envelope");

  // (2) cancel/revoke — pending device can no longer CLAIM
  const tokA=srv._addClaimToken("circle/c1/dev-remote-A/");
  await revoke(base,"circle/c1/dev-remote-A/");            // host cancels before redemption
  let claimBlocked=false; try{ await C.INTAKE_BACKENDS.https.claim({base,claimToken:tokA,grantId:"dev-remote-A"}); }catch(e){ claimBlocked=/40[39]/.test(String(e.message)); }
  ok(claimBlocked,"after cancel, the pending device can no longer claim its write cap");

  // (2b) cancel/revoke — even a device that already claimed can no longer WRITE
  const tokB=srv._addClaimToken("circle/c1/dev-remote-B/");
  const capB=await C.INTAKE_BACKENDS.https.claim({base,claimToken:tokB,grantId:"dev-remote-B"});
  await C.INTAKE_BACKENDS.https.push({base,prefix:capB.prefix,writeCap:capB.writeCap},"state","x"); // works pre-cancel
  await revoke(base,"circle/c1/dev-remote-B/");            // host cancels after the device already claimed
  let writeBlocked=false; try{ await C.INTAKE_BACKENDS.https.push({base,prefix:capB.prefix,writeCap:capB.writeCap},"state2","y"); }catch(e){ writeBlocked=/40[39]/.test(String(e.message)); }
  ok(writeBlocked,"after cancel, a device that already claimed can no longer write");

  await new Promise(r=>srv.close(r));
  console.log(f===0?"\n✅ INVITE LIFECYCLE PROVEN — expiry refuses stale invites (sealed, tamper-resistant); cancel blocks claim AND write":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
