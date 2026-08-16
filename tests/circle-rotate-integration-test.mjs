// circle-rotate-integration-test.mjs — INTEGRATION: admin pushes a rotation object to the relay; a remaining device
// fetches it and derives the new key over real HTTP; a removed device gets no blob AND is revoked (writes denied).
// All crypto extracted verbatim from src/App.jsx.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const require = createRequire(import.meta.url);
const { createIntakeServer } = require("../intake-server/server.cjs");
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("decl not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const ki=src.indexOf("const INTAKE_BACKENDS=");const objText=sliceBalanced(src,src.indexOf("{",ki));
const singles=["const _ib=","const b64enc=","const b64dec=","const CIRCLE_PAIR_INFO=","const _cte=","async function grantKeypair(","async function grantExpPub(","async function grantImpPub(","async function grantSharedZ(","async function hkdfBytes(","async function circleGcmEnc(","async function circleGcmDec(","const circleNewKey=","async function circleNewDeviceKey(","async function circleImportPriv("];
const multis=["async function circleRotate(","async function circleRotationOpen("];
const mod="const INTAKE_BACKENDS="+objText+";\n"+[...singles.map(lineStarting),...multis.map(extractFn)].join("\n")+
  "\nreturn {INTAKE_BACKENDS,circleRotate,circleRotationOpen,circleNewDeviceKey,circleNewKey};";
const C=new Function(mod)();
const ADMIN="admintok";
(async()=>{
  ok(typeof C.circleRotate==="function","extracted the real rotation crypto + relay client from src/App.jsx");
  const tmp=mkdtempSync(join(tmpdir(),"crot-"));
  const srv=createIntakeServer({storageDir:tmp,adminToken:ADMIN,allowOrigin:"*"});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+srv.address().port;
  const mk=async id=>({id,...(await C.circleNewDeviceKey())});
  const A=await mk("A"),B=await mk("B"),R=await mk("R");
  // R has a relay write cap (so we can show revocation cutting it off)
  const capR=await C.INTAKE_BACKENDS.https.claim({base,claimToken:srv._addClaimToken("circle/c1/R/"),grantId:"R"});
  const readC1=srv._mintReadCap("circle/c1/");

  // admin rotates, removing R → new key wrapped to A,B only; push to circle/c1/rotation/latest
  const newKey=C.circleNewKey();
  const rotObj=await C.circleRotate(newKey,1,[A,B].map(d=>({deviceId:d.id,pub:d.pub})));
  const capRot=await C.INTAKE_BACKENDS.https.claim({base,claimToken:srv._addClaimToken("circle/c1/rotation/"),grantId:"rot"});
  await C.INTAKE_BACKENDS.https.push({base,prefix:capRot.prefix,writeCap:capRot.writeCap},"latest",JSON.stringify(rotObj));
  // cut R off
  await fetch(base+"/admin/revoke",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Token":ADMIN},body:JSON.stringify({prefix:"circle/c1/R/"})});

  // remaining device B fetches the rotation object and derives the new key
  const fetched=JSON.parse(await C.INTAKE_BACKENDS.https.get({base,readCap:readC1},"circle/c1/rotation/latest"));
  const bKey=await C.circleRotationOpen(fetched,"B",B.jwkPriv);
  ok(bKey===newKey,"remaining device B fetches the rotation object over HTTP and derives the new key");

  // removed device R: no blob for it in the rotation object
  let rNoBlob=false; try{ await C.circleRotationOpen(fetched,"R",R.jwkPriv); }catch(e){ rNoBlob=true; }
  ok(rNoBlob,"removed device R has no blob in the published rotation (cannot derive the new key)");

  // removed device R: its relay write cap is now revoked
  let rWriteDenied=false; try{ await C.INTAKE_BACKENDS.https.push({base,prefix:capR.prefix,writeCap:capR.writeCap},"state","x"); }catch(e){ rWriteDenied=/403/.test(String(e)); }
  ok(rWriteDenied,"removed device R can no longer write to the relay (capability revoked)");

  ok(!JSON.stringify(fetched).includes(newKey),"the rotation object on the relay carries no plaintext new key");

  await new Promise(r=>srv.close(r));
  console.log(f===0?"\n✅ CIRCLE ROTATION (in-app, real HTTP) PROVEN — remaining devices re-key from the relay; the removed device is excluded by crypto AND revoked":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
