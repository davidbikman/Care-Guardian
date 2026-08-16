// circle-sync-integration-test.mjs — INTEGRATION: the app's REAL circle transport (circleSyncPush/Pull + seal/open,
// extracted verbatim from src/App.jsx) ↔ the reference relay over real HTTP. Two devices exchange state; the relay
// holds only ciphertext; a read cap is confined to its circle; a wrong circle key fails closed.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const require = createRequire(import.meta.url);
const { createIntakeServer } = require("../intake-server/server.cjs");
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
const ibLine=lineStarting("const _ib=");
const ki=src.indexOf("const INTAKE_BACKENDS=");const objText=sliceBalanced(src,src.indexOf("{",ki));
const singles=["const b64enc=","const b64dec=","async function circleGcmEnc(","async function circleGcmDec(","const CIRCLE_STATE_AAD=","function circleStripForSync(","async function circleSealState(","async function circleOpenState(","async function circleSyncPush(","async function circleSyncPull("];
const mod=ibLine+"\nconst INTAKE_BACKENDS="+objText+";\n"+singles.map(lineStarting).join("\n")+
  "\nreturn {INTAKE_BACKENDS,circleSealState,circleOpenState,circleSyncPush,circleSyncPull};";
const C=new Function(mod)();
const b64=u=>Buffer.from(u).toString("base64");
const ADMIN="admintok";
(async()=>{
  ok(typeof C.circleSyncPush==="function"&&typeof C.circleSyncPull==="function","extracted the app's real circle transport client from src/App.jsx");
  const tmp=mkdtempSync(join(tmpdir(),"circle-"));
  const srv=createIntakeServer({storageDir:tmp,adminToken:ADMIN,allowOrigin:"*"});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+srv.address().port;
  const key=b64(crypto.getRandomValues(new Uint8Array(32)));    // the shared circle key
  const wrongKey=b64(crypto.getRandomValues(new Uint8Array(32)));

  // provision caps (what the relay-connect / pairing handshake does in the app)
  const capA=await C.INTAKE_BACKENDS.https.claim({base,claimToken:srv._addClaimToken("circle/c1/A/"),grantId:"A"});
  const capB=await C.INTAKE_BACKENDS.https.claim({base,claimToken:srv._addClaimToken("circle/c1/B/"),grantId:"B"});
  const readC1=srv._mintReadCap("circle/c1/");
  const relayA={base,prefix:capA.prefix,writeCap:capA.writeCap,readCap:readC1};
  const relayB={base,prefix:capB.prefix,writeCap:capB.writeCap,readCap:readC1};

  // device A pushes its state; device B pulls and opens it
  const stateA={contacts:[{id:"c1",name:"Mom",hlc:{pt:1000,ct:1,id:"A"}}],settings:{deviceId:"A",circle:{id:"c1",epoch:0}}};
  await C.circleSyncPush(relayA, await C.circleSealState(stateA,key));
  const blobs=await C.circleSyncPull(relayB,"c1","B");
  ok(blobs.length===1,"device B pulls exactly device A's state object (skips its own prefix)");
  const remote=await C.circleOpenState(blobs[0],key);
  ok(remote.contacts[0].name==="Mom","device B decrypts device A's record over real HTTP");

  // the relay holds only ciphertext — read the raw object with a root cap and confirm no plaintext
  const rootRead=srv._mintReadCap("");
  const raw=await C.INTAKE_BACKENDS.https.get({base,readCap:rootRead},"circle/c1/A/state");
  ok(raw && !raw.includes("Mom"),"the object at rest on the relay is ciphertext (no plaintext record)");

  // a read cap minted for circle/c1/ cannot read another circle
  await C.circleSyncPush({base,prefix:"circle/c2/X/",writeCap:(await C.INTAKE_BACKENDS.https.claim({base,claimToken:srv._addClaimToken("circle/c2/X/"),grantId:"X"})).writeCap}, await C.circleSealState({contacts:[{id:"z",name:"Other"}]},key));
  let isolated=false; try{ const other=await C.circleSyncPull(relayB,"c2","B"); isolated=(other.length===0); }catch(e){ isolated=true; }
  ok(isolated,"device B's circle-c1 read cap cannot read circle c2 (cross-circle isolation)");

  // wrong circle key fails closed
  let bad=false; try{ await C.circleOpenState(blobs[0],wrongKey); }catch(e){ bad=true; }
  ok(bad,"a device with the wrong circle key cannot decrypt (fails closed)");

  await new Promise(r=>srv.close(r));
  console.log(f===0?"\n✅ CIRCLE SYNC (in-app, real HTTP) PROVEN — two devices exchange state; relay sees ciphertext; caps confined per-circle; fails closed":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
