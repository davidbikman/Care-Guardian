// circle-remote-integration-test.mjs — INTEGRATION: the full remote invite handoff over real HTTP. Host seals the circle key
// + relay caps under a passphrase, stashes it on the relay behind a one-time read code; a joiner fetches with the code and
// unlocks with the passphrase, then claims its own write cap. Real extracted functions; real Argon2id; reference relay.
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
const singles=["const _ib=","const b64enc=","const b64dec=","async function circleGcmEnc(","async function circleGcmDec(","const CIRCLE_REMOTE_AAD=","const CIRCLE_ARGON="];
const mod="const INTAKE_BACKENDS="+objText+";\n"+singles.map(lineStarting).join("\n")+"\n"+
  extractFn("async function circleRemoteSeal(").replace(drop,"")+"\n"+extractFn("async function circleRemoteOpen(").replace(drop,"")+
  "\nreturn {INTAKE_BACKENDS,circleRemoteSeal,circleRemoteOpen};";
const C=new Function("argon2id",mod)(argon2id);
const b64=u=>Buffer.from(u).toString("base64");
const ADMIN="admintok";
(async()=>{
  ok(typeof C.circleRemoteSeal==="function","extracted the real remote handoff + relay client from src/App.jsx");
  const tmp=mkdtempSync(join(tmpdir(),"crem-"));
  const srv=createIntakeServer({storageDir:tmp,adminToken:ADMIN,allowOrigin:"*"});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+srv.address().port;
  const circleKey=b64(crypto.getRandomValues(new Uint8Array(32)));
  const pass="able-acid-acre-aged-airy-alarm";

  // ── HOST builds the invite ──
  const joinerClaim=srv._addClaimToken("circle/c1/dev-remote-1/");      // joiner's future write cap
  const circleReadCap=srv._mintReadCap("circle/c1/");
  const bundle=JSON.stringify({circleKey,circleId:"c1",epoch:0,assignedDeviceId:"dev-remote-1",roster:[],relay:{base,claimToken:joinerClaim,readCap:circleReadCap}});
  const env=await C.circleRemoteSeal(bundle,pass);
  const invCap=await C.INTAKE_BACKENDS.https.claim({base,claimToken:srv._addClaimToken("circle/c1/invite/inv1/"),grantId:"inv1"});
  await C.INTAKE_BACKENDS.https.push({base,prefix:invCap.prefix,writeCap:invCap.writeCap},"blob",JSON.stringify(env));
  const inviteReadCap=srv._mintReadCap("circle/c1/invite/inv1/");
  const code={base,circleId:"c1",inviteId:"inv1",readCap:inviteReadCap};

  // ── JOINER redeems it ──
  const fetchedEnv=JSON.parse(await C.INTAKE_BACKENDS.https.get({base,readCap:code.readCap},"circle/c1/invite/inv1/blob"));
  const got=JSON.parse(await C.circleRemoteOpen(fetchedEnv,pass));
  ok(got.circleKey===circleKey,"joiner recovers the exact circle key via code + passphrase over HTTP");
  const jcap=await C.INTAKE_BACKENDS.https.claim({base,claimToken:got.relay.claimToken,grantId:got.assignedDeviceId});
  ok(jcap.prefix==="circle/c1/dev-remote-1/" && !!jcap.writeCap,"joiner claims its own write cap from the bundle");
  await C.INTAKE_BACKENDS.https.push({base,prefix:jcap.prefix,writeCap:jcap.writeCap},"state","x");  // proves the write cap works
  ok(true,"joiner can write to its own circle prefix");

  // ── security checks ──
  const rootRead=srv._mintReadCap("");
  const raw=await C.INTAKE_BACKENDS.https.get({base,readCap:rootRead},"circle/c1/invite/inv1/blob");
  ok(raw && !raw.includes(circleKey),"the invite at rest on the relay is ciphertext (no plaintext key)");
  let badPass=false; try{ await C.circleRemoteOpen(fetchedEnv,"wrong-words-here-now-stop"); }catch(e){ badPass=true; }
  ok(badPass,"the code alone (wrong passphrase) cannot unlock the invite — two channels required");

  await new Promise(r=>srv.close(r));
  console.log(f===0?"\n✅ REMOTE JOIN (in-app, real HTTP) PROVEN — code + passphrase redeem the circle key; relay sees ciphertext; one channel is not enough":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
