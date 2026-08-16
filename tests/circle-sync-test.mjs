// circle-sync-test.mjs — PROOF of the circle sync payload (strip/seal/open), extracting REAL functions from src/App.jsx.
// Round-trips under the circle key; the synced payload NEVER carries this device's private key, the circle key, or relay caps;
// and a wrong circle key fails closed.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
const singles=["const b64enc=","const b64dec=","async function circleGcmEnc(","async function circleGcmDec(","const CIRCLE_STATE_AAD=","function circleStripForSync(","async function circleSealState(","async function circleOpenState("];
const mod=singles.map(lineStarting).join("\n")+"\nreturn {circleStripForSync,circleSealState,circleOpenState};";
const C=new Function(mod)();
const b64=u=>Buffer.from(u).toString("base64");
const deep=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
(async()=>{
  ok(typeof C.circleSealState==="function","extracted the real circle sync payload functions from src/App.jsx");
  const key=b64(crypto.getRandomValues(new Uint8Array(32)));
  const other=b64(crypto.getRandomValues(new Uint8Array(32)));
  const state={ contacts:[{id:"c1",name:"Mom"}], _sync:{lastSync:"t"},
    settings:{ deviceName:"Phone", deviceId:"dev-A",
      deviceKey:{jwkPriv:{d:"SECRET_PRIV_SCALAR"},pub:"DEVPUB"},
      circle:{id:"circle-xyz",epoch:2,key:"SECRET_CIRCLE_KEY",relay:{base:"https://r",writeCap:"SECRET_WRITECAP",readCap:"rc",adminToken:"SECRET_ADMIN"}} } };

  const stripped=C.circleStripForSync(state);
  ok(!stripped.settings.deviceKey,"strip removes this device's keypair");
  ok(!stripped.settings.circle.key && !stripped.settings.circle.relay,"strip removes the circle key and relay caps");
  ok(stripped.settings.circle.id==="circle-xyz" && stripped.settings.circle.epoch===2,"strip keeps non-secret circle id + epoch");
  ok(stripped.contacts[0].name==="Mom" && stripped.settings.deviceId==="dev-A","strip keeps the actual records + device id");

  const sealed=await C.circleSealState(state,key);
  const opened=await C.circleOpenState(sealed,key);
  ok(deep(opened,stripped),"seal→open round-trips to exactly the stripped state");

  const blobJson=JSON.stringify(opened);
  ok(["SECRET_PRIV_SCALAR","SECRET_CIRCLE_KEY","SECRET_WRITECAP","SECRET_ADMIN"].every(s=>!blobJson.includes(s)),"the synced payload carries NONE of: device private key, circle key, write cap, admin token");

  let bad=false; try{ await C.circleOpenState(sealed,other); }catch(e){ bad=true; }
  ok(bad,"a wrong circle key fails closed (no state returned)");

  console.log(f===0?"\n✅ CIRCLE SYNC PAYLOAD PROVEN — round-trips, leaks no secrets, fails closed on wrong key":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
