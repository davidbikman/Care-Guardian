// ── INTEGRATION: model (B) shared chain over real HTTP. Pushes sealed shared-audit entries to {prefix}audit/
// via the app's REAL INTAKE_BACKENDS client, then verifies the reviewer's list→get→open→verify path against the
// running reference server — including that the roster excludes the audit subfolder, and that a poisoned audit
// object surfaces as a gap (fail-closed). App functions (INTAKE_BACKENDS, verifySharedChain, sharedObjectName,
// computeSharedHash) are extracted VERBATIM from src/App.jsx.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { createIntakeServer }=require("../intake-server/server.cjs");
const subtle=globalThis.crypto.subtle; const te=new TextEncoder(),td=new TextDecoder();
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const b64e=u=>Buffer.from(u).toString("base64"); const rand=n=>globalThis.crypto.getRandomValues(new Uint8Array(n));

// ---- extract app functions ----
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found: "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(declStart){const k=src.indexOf(declStart);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const ibLine=lineStarting("const _ib=");
const ki=src.indexOf("const INTAKE_BACKENDS=");const objText=sliceBalanced(src,src.indexOf("{",ki));
const verify=extractFn("async function verifySharedChain(");
const shaInline=`async function sha256Hex(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}`;
const mod=`${shaInline}\n${ibLine}\n${lineStarting("const canonicalSharedEntry=")}\n${lineStarting("const computeSharedHash=")}\n${lineStarting("const sharedObjectName=")}\n${verify}\nconst INTAKE_BACKENDS=${objText};\nreturn {INTAKE_BACKENDS,verifySharedChain,sharedObjectName,computeSharedHash};`;
const { INTAKE_BACKENDS,verifySharedChain,sharedObjectName,computeSharedHash }=new Function(mod)();
const HTTPS=INTAKE_BACKENDS.https;
ok(typeof verifySharedChain==="function"&&typeof HTTPS.push==="function","extracted app's INTAKE_BACKENDS + verifySharedChain + sharedObjectName");

// ---- ECDH-ES seal/open (consistent pair for the streamed copy) ----
async function kp(){return subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"])}
async function expPub(k){return new Uint8Array(await subtle.exportKey("raw",k))}
async function impPub(r){return subtle.importKey("raw",r,{name:"ECDH",namedCurve:"P-256"},true,[])}
async function Z(p,q){return new Uint8Array(await subtle.deriveBits({name:"ECDH",public:q},p,256))}
async function wk(z,s){const b=await subtle.importKey("raw",z,"HKDF",false,["deriveKey"]);return subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:s,info:te.encode("g")},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function seal(p,pub){const dek=rand(32);const E=await kp();const z=await Z(E.privateKey,await impPub(pub));const n=b64e(rand(12));const WK=await wk(z,te.encode("g|"+n));const iv=rand(12);const dk=await subtle.importKey("raw",dek,{name:"AES-GCM"},false,["encrypt"]);const wiv=rand(12);const wct=new Uint8Array(await subtle.encrypt({name:"AES-GCM",iv:wiv},WK,dek));const wb=new Uint8Array(12+wct.length);wb.set(wiv,0);wb.set(wct,12);const ct=new Uint8Array(await subtle.encrypt({name:"AES-GCM",iv},dk,te.encode(JSON.stringify(p))));return{str:JSON.stringify({pushNonce:n,ephemeralPub:b64e(await expPub(E.publicKey)),wrappedKey:b64e(wb),iv:b64e(iv),ciphertext:b64e(ct)}),nonce:n}}
async function open(str,priv){const b=JSON.parse(str);const z=await Z(priv,await impPub(Buffer.from(b.ephemeralPub,"base64")));const WK=await wk(z,te.encode("g|"+b.pushNonce));const dek=new Uint8Array(await subtle.decrypt({name:"AES-GCM",iv:Buffer.from(b.wrappedKey,"base64").slice(0,12)},WK,Buffer.from(b.wrappedKey,"base64").slice(12)));const dk=await subtle.importKey("raw",dek,{name:"AES-GCM"},false,["decrypt"]);return JSON.parse(td.decode(await subtle.decrypt({name:"AES-GCM",iv:Buffer.from(b.iv,"base64")},dk,Buffer.from(b.ciphertext,"base64"))))}

async function buildChain(n,gid){const out=[];let prevHash="";for(let i=1;i<=n;i++){const e={grantId:gid,seq:i,ts:new Date(Date.now()+i*1000).toISOString(),type:"update.sent",summary:"Update sent: care status",prevHash};e.hash=await computeSharedHash(e);prevHash=e.hash;out.push(e)}return out}

(async()=>{
  const tmp="/tmp/shared-intake-"+Date.now();
  const srv=createIntakeServer({storageDir:tmp,adminToken:"A",allowOrigin:"*"});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+srv.address().port;
  const PREFIX="fam/g1/";
  const writeCap=srv._addClaimToken(PREFIX); const claimed=await HTTPS.claim({base,claimToken:writeCap,grantId:"g1"});
  const cap=claimed.writeCap; const readCap=srv._mintReadCap(""); 
  const prog=await kp(); const pub=await expPub(prog.publicKey);

  // family side: push a projection object AND a shared-audit chain under the same grant prefix
  const projSeal=await seal({archetype:"navigator",asOf:new Date().toISOString(),care:"Mom",careStatus:[]},pub);
  await HTTPS.push({base,prefix:PREFIX,writeCap:cap},String(Date.now()).padStart(15,"0")+"-"+projSeal.nonce.replace(/[^A-Za-z0-9]/g,"").slice(0,16)+".cgshare",projSeal.str);
  const chain=await buildChain(3,"g1");
  for(const e of chain){ const s=await seal(e,pub); await HTTPS.push({base,prefix:PREFIX,writeCap:cap},"audit/"+sharedObjectName(e.seq,s.nonce),s.str); }
  ok(true,"pushed a projection object + a 3-entry shared-audit chain under fam/g1/ over real HTTP");

  // reviewer: pull audit/ subfolder, open each, verify
  async function pullVerify(){ const names=(await HTTPS.list({base,readCap},PREFIX+"audit/")).slice().sort(); const entries=[]; for(const n of names){ try{ const ct=await HTTPS.get({base,readCap},n); if(!ct)continue; entries.push(await open(ct,prog.privateKey)); }catch{} } return {entries,status:await verifySharedChain(entries)}; }
  let r=await pullVerify();
  ok(r.entries.length===3&&r.status.status==="ok","reviewer lists+gets+opens the shared chain and it verifies OK over real HTTP");

  // roster excludes the audit subfolder (group by dir, skip /audit/)
  const all=await HTTPS.list({base,readCap},"");
  const groups={}; all.forEach(n=>{ if(n.indexOf("/audit/")>=0)return; const i=n.lastIndexOf("/"); const dir=i>=0?n.slice(0,i+1):""; (groups[dir]=groups[dir]||[]).push(n); });
  ok(Object.keys(groups).length===1&&groups[PREFIX]&&groups[PREFIX].length===1,"roster shows ONE family (the projection), audit subfolder excluded from the roster");

  // poison one audit object → it fails to open → gap detected (fail-closed)
  const auditNames=(await HTTPS.list({base,readCap},PREFIX+"audit/")).slice().sort();
  const { writeFileSync }=await import("node:fs"); const path=await import("node:path");
  writeFileSync(path.join(tmp,auditNames[1]),"GARBAGE-NOT-A-BUNDLE"); // poison seq 2
  r=await pullVerify();
  ok(r.status.status==="gap"&&r.status.missingSeq===2,"a poisoned shared-audit object surfaces as a missing-sequence gap (fail-closed), not silent loss");

  await new Promise(r=>srv.close(r));
  console.log(f===0?"\n✅ SHARED-AUDIT INTEGRATION PASSES — real client ↔ real server; reviewer verify + roster exclusion + gap detection":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
