// ── INTEGRATION: the presigned (sign-then-PUT/GET) intake backend over real HTTP. Drives the app's REAL
// INTAKE_BACKENDS.presigned (extracted verbatim from src/App.jsx) against the reference server's /sign +
// /presigned endpoints on loopback. Proves the presigned transport has the same containment as HTTPS —
// ciphertext-only at rest, write-only/prefix scope, one-time claim, rotation, WORM, revocation — PLUS the
// presigned-specific guarantees: the signed URL is required, and it's rejected if expired, tampered, or stale.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { createIntakeServer }=require("../intake-server/server.cjs");
const subtle=globalThis.crypto.subtle; const te=new TextEncoder(),td=new TextDecoder();
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const b64e=u=>Buffer.from(u).toString("base64"); const rand=n=>globalThis.crypto.getRandomValues(new Uint8Array(n));

// extract the app's real presigned backend + _ib
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
const ki=src.indexOf("const INTAKE_BACKENDS=");const objText=sliceBalanced(src,src.indexOf("{",ki));
const { INTAKE_BACKENDS }=new Function(`${lineStarting("const _ib=")}\nconst INTAKE_BACKENDS=${objText};\nreturn {INTAKE_BACKENDS};`)();
const PS=INTAKE_BACKENDS.presigned;
ok(PS&&typeof PS.push==="function"&&typeof PS.get==="function","extracted the app's real INTAKE_BACKENDS.presigned (sign-then-PUT/GET)");

// minimal ECDH-ES seal/open (consistent pair) to prove ciphertext round-trips
async function kp(){return subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"])}
async function ex(k){return new Uint8Array(await subtle.exportKey("raw",k))}
async function imp(r){return subtle.importKey("raw",r,{name:"ECDH",namedCurve:"P-256"},true,[])}
async function Z(p,q){return new Uint8Array(await subtle.deriveBits({name:"ECDH",public:q},p,256))}
async function wk(z,s){const b=await subtle.importKey("raw",z,"HKDF",false,["deriveKey"]);return subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:s,info:te.encode("g")},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function seal(o,pub){const E=await kp();const z=await Z(E.privateKey,await imp(pub));const n=b64e(rand(12));const K=await wk(z,te.encode("g|"+n));const iv=rand(12);const ct=new Uint8Array(await subtle.encrypt({name:"AES-GCM",iv},K,te.encode(JSON.stringify(o))));return JSON.stringify({pushNonce:n,ephemeralPub:b64e(await ex(E.publicKey)),iv:b64e(iv),ciphertext:b64e(ct)})}
async function open(str,priv){const b=JSON.parse(str);const z=await Z(priv,await imp(Buffer.from(b.ephemeralPub,"base64")));const K=await wk(z,te.encode("g|"+b.pushNonce));return JSON.parse(td.decode(await subtle.decrypt({name:"AES-GCM",iv:Buffer.from(b.iv,"base64")},K,Buffer.from(b.ciphertext,"base64"))))}

(async()=>{
  const tmp="/tmp/presigned-"+Date.now();
  const srv=createIntakeServer({storageDir:tmp,adminToken:"A",allowOrigin:"*"});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const port=srv.address().port; const host="127.0.0.1:"+port; const base="http://"+host;
  const prog=await kp(); const pub=await ex(prog.publicKey);
  const SENTINEL="PLAINTEXT_SHOULD_NEVER_PERSIST_"+Math.random().toString(36).slice(2);

  // claim
  const t1=srv._addClaimToken("fam/g1/");
  const claimed=await PS.claim({base,claimToken:t1,grantId:"g1"});
  ok(claimed.writeCap&&claimed.prefix==="fam/g1/","presigned claim returns a write-only, prefix-scoped capability");
  const cap=claimed.writeCap; const readCap=srv._mintReadCap("");

  // round-trip: push (sign→PUT) → list → get (sign→GET) → decrypt
  const bundle=await seal({secret:SENTINEL,care:"Mom"},pub);
  await PS.push({base,prefix:"fam/g1/",writeCap:cap},"000000001.cgshare",bundle);
  const names=await PS.list({base,readCap},"fam/g1/");
  const got=await PS.get({base,readCap},"fam/g1/000000001.cgshare");
  const dec=await open(got,prog.privateKey);
  ok(names.includes("fam/g1/000000001.cgshare")&&dec.secret===SENTINEL,"sign-then-PUT/GET round-trips: list + get + decrypt recover the bundle over real HTTP");

  // ciphertext-only at rest
  const onDisk=readFileSync(tmp+"/fam/g1/000000001.cgshare","utf8");
  ok(onDisk.indexOf(SENTINEL)<0,"the object at rest is ciphertext only — the plaintext sentinel never appears on disk");

  // capability negatives at /sign (the signing step is where authority is checked)
  const signAs=(c,key,method)=>fetch(base+"/sign",{method:"POST",headers:{Authorization:"Bearer "+c,"Content-Type":"application/json"},body:JSON.stringify({key,method})});
  ok((await signAs(cap,"fam/g1/x.cgshare","GET")).status===403,"a write capability cannot sign a GET (no read via the write cap)");
  ok((await signAs(readCap,"fam/g1/x.cgshare","PUT")).status===403,"a read capability cannot sign a PUT (read cap can't write)");
  ok((await signAs(cap,"fam/g2/x.cgshare","PUT")).status===403,"a write capability cannot sign a PUT outside its prefix");
  ok((await signAs(cap,"fam/g1/../../etc/passwd","PUT")).status===400,"path traversal is rejected at signing time");

  // one-time claim
  const reclaim=await fetch(base+"/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:t1,grantId:"g1"})});
  ok(reclaim.status===403,"the one-time claim token can't be reused");

  // expiry + signature tamper (forged/borrowed URLs)
  const expiredUrl=srv._presignedUrl(host,"fam/g1/late.cgshare","PUT","fam/g1/",-1000);
  ok((await fetch(expiredUrl,{method:"PUT",body:"x"})).status===403,"an expired presigned URL is rejected");
  const goodUrl=srv._presignedUrl(host,"fam/g1/ok.cgshare","PUT","fam/g1/",60000);
  const tampered=goodUrl.slice(0,-1)+(goodUrl.slice(-1)==="A"?"B":"A");
  ok((await fetch(tampered,{method:"PUT",body:"x"})).status===403,"a tampered presigned signature is rejected");

  // rotation: old cap can't sign; AND a URL minted before rotation is stale at PUT time
  const preUrl=(await(await signAs(cap,"fam/g1/pre.cgshare","PUT")).json()).url;
  srv._rotate("fam/g1/");
  ok((await signAs(cap,"fam/g1/y.cgshare","PUT")).status===403,"after rotation the old write cap can no longer sign a PUT");
  ok((await fetch(preUrl,{method:"PUT",body:"x"})).status===403,"a URL minted before rotation is rejected at PUT time (stale epoch)");

  // fresh cap after rotation to continue (re-claim a new token into the rotated prefix)
  const t2=srv._addClaimToken("fam/g1/"); const cap2=(await PS.claim({base,claimToken:t2,grantId:"g1"})).writeCap;

  // WORM on the audit/ subfolder, via presigned
  await PS.push({base,prefix:"fam/g1/",writeCap:cap2},"audit/000000001.cgaudit",await seal({e:1},pub));
  const a1=await PS.get({base,readCap},"fam/g1/audit/000000001.cgaudit");
  await PS.push({base,prefix:"fam/g1/",writeCap:cap2},"audit/000000001.cgaudit",await seal({e:"TAMPERED"},pub)); // re-push same key
  const a2=await PS.get({base,readCap},"fam/g1/audit/000000001.cgaudit");
  ok(a1===a2,"WORM holds over presigned: an audit object can't be overwritten (first write wins)");

  // revocation: signing blocked, and a pre-minted URL blocked at PUT time
  const preRevokeUrl=(await(await signAs(cap2,"fam/g1/r.cgshare","PUT")).json()).url;
  srv._revoke("fam/g1/");
  ok((await signAs(cap2,"fam/g1/z.cgshare","PUT")).status===403,"a revoked prefix can't sign new PUTs");
  ok((await fetch(preRevokeUrl,{method:"PUT",body:"x"})).status===403,"a URL minted before revocation is rejected at PUT time");
  ok((await PS.get({base,readCap},"fam/g1/000000001.cgshare"))!==null,"reads still work after revocation (institution keeps its record)");

  await new Promise(r=>srv.close(r));
  console.log(f===0?"\n✅ PRESIGNED BACKEND INTEGRATION PASSES — sign-then-PUT/GET proven over real HTTP, same containment as HTTPS":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
