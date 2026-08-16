// ── PROOF: live cloud-intake transport containment (TRANSPORT-INTAKE-DESIGN.md §13) ──
// Proves the transport's containment properties in isolation against a MOCK intake store that
// enforces the capability semantics the real backends must (write-only, prefix-scoped, epoch'd).
// The crypto is unchanged (proven in grant-core-test.mjs); this proves the transport around it.
const subtle=globalThis.crypto.subtle;
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const te=new TextEncoder(),td=new TextDecoder();
const b64e=u=>Buffer.from(u).toString("base64"); const rand=n=>globalThis.crypto.getRandomValues(new Uint8Array(n));

// minimal ECDH-ES seal/open (identical to the app's grant crypto) so we push REAL sealed bundles
async function kp(){return subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);}
async function expPub(k){return new Uint8Array(await subtle.exportKey("raw",k));}
async function impPub(r){return subtle.importKey("raw",r,{name:"ECDH",namedCurve:"P-256"},true,[]);}
async function Z(priv,pub){return new Uint8Array(await subtle.deriveBits({name:"ECDH",public:pub},priv,256));}
async function wk(z,salt){const b=await subtle.importKey("raw",z,"HKDF",false,["deriveKey"]);return subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt,info:te.encode("care-guardian-grant-v1")},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
async function seal(proj,manifest,pub,asOfMs){const dek=rand(32);const E=await kp();const z=await Z(E.privateKey,await impPub(pub));const n=b64e(rand(12));const WK=await wk(z,te.encode("g1|"+n));const iv=rand(12);const dk=await subtle.importKey("raw",dek,{name:"AES-GCM"},false,["encrypt"]);const wiv=rand(12);const wct=new Uint8Array(await subtle.encrypt({name:"AES-GCM",iv:wiv},WK,dek));const wb=new Uint8Array(12+wct.length);wb.set(wiv,0);wb.set(wct,12);const wrapped=b64e(wb);const aad=te.encode(JSON.stringify(manifest));const ct=new Uint8Array(await subtle.encrypt({name:"AES-GCM",iv,additionalData:aad},dk,te.encode(JSON.stringify(proj))));return JSON.stringify({v:1,grantId:"g1",scopeManifest:manifest,pushNonce:n,asOfMs,ephemeralPub:b64e(await expPub(E.publicKey)),wrappedKey:wrapped,iv:b64e(iv),ciphertext:b64e(ct)});}
async function open(str,priv){const b=JSON.parse(str);const z=await Z(priv,await impPub(Buffer.from(b.ephemeralPub,"base64")));const WK=await wk(z,te.encode("g1|"+b.pushNonce));const dek=new Uint8Array(await subtle.decrypt({name:"AES-GCM",iv:Buffer.from(b.wrappedKey,"base64").slice(0,12)},WK,Buffer.from(b.wrappedKey,"base64").slice(12)));const dk=await subtle.importKey("raw",dek,{name:"AES-GCM"},false,["decrypt"]);const aad=te.encode(JSON.stringify(b.scopeManifest));const pt=await subtle.decrypt({name:"AES-GCM",iv:Buffer.from(b.iv,"base64"),additionalData:aad},dk,Buffer.from(b.ciphertext,"base64"));return JSON.parse(td.decode(pt));}

// ---- MOCK intake store: enforces write-only, prefix scope, capability epochs ----
function makeStore(){
  const objects=new Map(), caps=new Map(), prefixEpoch=new Map(), claimable=new Map(), used=new Set();
  let cseq=0; const tok=()=>"cap-"+(++cseq);
  return {
    _seedClaim:(t,prefix)=>{claimable.set(t,prefix);},
    claim:(t,grantId)=>{ if(used.has(t)||!claimable.has(t))throw new Error("claim invalid/used"); used.add(t); const prefix=claimable.get(t); const ep=prefixEpoch.get(prefix)||1; prefixEpoch.set(prefix,ep); const c=tok(); caps.set(c,{prefix,mode:"write",epoch:ep}); return {prefix,writeCap:c}; },
    mintRead:(prefix)=>{ const c=tok(); caps.set(c,{prefix,mode:"read",epoch:prefixEpoch.get(prefix)||1}); return c; },
    rotate:(prefix)=>{ prefixEpoch.set(prefix,(prefixEpoch.get(prefix)||1)+1); },
    put:(cap,key,ct)=>{ const c=caps.get(cap); if(!c||c.mode!=="write")throw new Error("forbidden: not a write cap"); if(c.epoch!==(prefixEpoch.get(c.prefix)||1))throw new Error("stale cap (rotated)"); if(!key.startsWith(c.prefix))throw new Error("out of prefix scope"); objects.set(key,ct); },
    list:(cap,prefix)=>{ const c=caps.get(cap); if(!c||c.mode!=="read")throw new Error("forbidden: not a read cap"); if(!prefix.startsWith(c.prefix))throw new Error("out of scope"); return [...objects.keys()].filter(k=>k.startsWith(prefix)); },
    get:(cap,key)=>{ const c=caps.get(cap); if(!c||c.mode!=="read")throw new Error("forbidden: not a read cap"); if(!key.startsWith(c.prefix))throw new Error("out of scope"); if(!objects.has(key))throw new Error("not found"); return objects.get(key); },
    _raw:objects
  };
}
// ---- client transport logic (pure; ported to app verbatim) ----
const objName=(asOfMs,nonce)=>String(asOfMs).padStart(15,"0")+"-"+nonce+".cgshare"; // sortable = chronological
async function sha(s){return b64e(new Uint8Array(await subtle.digest("SHA-256",te.encode(s))));}
async function pushVersioned(store,cap,prefix,ct,asOfMs,nonce,prevHash){ const h=await sha(ct); if(prevHash&&prevHash===h)return {skipped:true,hash:h}; store.put(cap,prefix+objName(asOfMs,nonce),ct); return {skipped:false,hash:h}; }
async function pickLatestValid(store,readCap,prefix,priv){ const names=store.list(readCap,prefix).sort().reverse(); for(const n of names){ try{ return {name:n,projection:await open(store.get(readCap,n),priv)}; }catch{} } return null; }

(async()=>{
  const prog=await kp(); const progPub=await expPub(prog.publicKey);
  const SENTINEL="SENTINEL_PLAINTEXT_PHI";
  const manifest={includes:["careStatus"],excludes:["clientVoice"]};
  const mkProj=(asOf,note)=>({archetype:"navigator",asOf,care:"Mom",careStatus:[{area:"Physical",note:note||SENTINEL}]});

  const store=makeStore(); store._seedClaim("onetime-AAA","fam/mrsR/g1/");
  // claim → write-only cap
  const {prefix,writeCap}=store.claim("onetime-AAA","g1");
  ok(prefix==="fam/mrsR/g1/","claim returns the family's bound prefix");

  // 1. data plane sees only ciphertext
  const t1=Date.now(); const ct1=await seal(mkProj(new Date(t1).toISOString()),manifest,progPub,t1);
  const r1=await pushVersioned(store,writeCap,prefix,ct1,t1,"n1");
  const stored=[...store._raw.values()][0];
  ok(!stored.includes(SENTINEL),"stored object contains NO plaintext PHI (ciphertext only)");
  const readCap=store.mintRead(prefix);
  const got1=await pickLatestValid(store,readCap,prefix,prog.privateKey);
  ok(got1&&got1.projection.careStatus[0].note===SENTINEL,"reviewer recovers the projection from the stored ciphertext");

  // 2. write-only + prefix scope
  let e=false; try{store.get(writeCap,prefix+objName(t1,"n1"))}catch{e=true} ok(e,"a WRITE cap cannot read (get forbidden)");
  e=false; try{store.list(writeCap,prefix)}catch{e=true} ok(e,"a WRITE cap cannot list");
  e=false; try{store.put(writeCap,"fam/someoneElse/g9/x.cgshare",ct1)}catch{e=true} ok(e,"a WRITE cap cannot write outside its prefix");

  // 3. versioning + latest-valid + fail-closed
  const t2=t1+1000, t3=t1+2000;
  await pushVersioned(store,writeCap,prefix,await seal(mkProj(new Date(t2).toISOString(),"v2"),manifest,progPub,t2),t2,"n2");
  await pushVersioned(store,writeCap,prefix,await seal(mkProj(new Date(t3).toISOString(),"v3"),manifest,progPub,t3),t3,"n3");
  let got=await pickLatestValid(store,readCap,prefix,prog.privateKey);
  ok(got&&got.projection.careStatus[0].note==="v3","reviewer picks the NEWEST version (v3)");
  // poison the newest object
  store._raw.set(prefix+objName(t3,"n3"),"GARBAGE-NOT-A-BUNDLE");
  got=await pickLatestValid(store,readCap,prefix,prog.privateKey);
  ok(got&&got.projection.careStatus[0].note==="v2","fail-closed: a poisoned newest object is skipped, last VALID (v2) survives");

  // 4. replay/staleness — an older object never wins over a newer valid one
  await pushVersioned(store,writeCap,prefix,await seal(mkProj(new Date(t1-5000).toISOString(),"stale"),manifest,progPub,t1-5000),t1-5000,"nold");
  got=await pickLatestValid(store,readCap,prefix,prog.privateKey);
  ok(got&&got.projection.careStatus[0].note==="v2","a replayed/older object does not supersede the newer valid one");

  // 5. idempotent re-push (unchanged content → no new object)
  const before=store._raw.size;
  const same=await seal(mkProj(new Date(t2).toISOString(),"v2dup"),manifest,progPub,t2); // (different bytes each seal; we simulate unchanged by hash of same string)
  const fixedCt=await seal(mkProj(new Date(t2).toISOString(),"vX"),manifest,progPub,t2);
  const h=await sha(fixedCt);
  const repush=await pushVersioned(store,writeCap,prefix,fixedCt,t2,"nX",h); // prevHash == this content's hash
  ok(repush.skipped&&store._raw.size===before,"idempotent: re-pushing unchanged content writes no new object");

  // 6. claim handshake non-escalation + rotation
  e=false; try{store.claim("onetime-AAA","g1")}catch{e=true} ok(e,"a one-time claim token cannot be reused");
  e=false; try{store.list(writeCap,prefix)}catch{e=true} ok(e,"the claimed cap is write-only (cannot be escalated to read)");
  store.rotate(prefix);
  e=false; try{store.put(writeCap,prefix+objName(Date.now(),"nZ"),ct1)}catch{e=true} ok(e,"rotation invalidates the old write cap");

  console.log(f===0?"\n✅ INTAKE-CORE PROOF PASSES — transport containment holds":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
