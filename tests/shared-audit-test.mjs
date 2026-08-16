// ── PROOF: model (B) — a separate, self-contained chain of ONLY shared-scope events ──
// The family keeps the full local audit log private and under their control; the institution receives a chain
// that contains ONLY events about its own relationship. Proves: (1) no private event/content ever enters the
// shared chain; (2) the shared chain verifies independently from seq 1; (3) its seq counts ONLY shared events
// (so the institution can't infer private-activity volume — the key win over redaction); (4) per-institution
// isolation; (5) tamper/interior-gap/tail-truncation classification; (6) streamed entries are ciphertext-only.
const subtle=globalThis.crypto.subtle; const te=new TextEncoder(),td=new TextDecoder();
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const b64e=u=>Buffer.from(u).toString("base64"); const rand=n=>globalThis.crypto.getRandomValues(new Uint8Array(n));
async function sha256Hex(s){const b=await subtle.digest("SHA-256",te.encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}

// ---- shared-chain primitives (ported verbatim into the app) ----
const SHARED_TYPES=new Set(["grant.created","update.sent","sharing.changed","grant.revoked"]);
const canonicalSharedEntry=(e)=>JSON.stringify([e.grantId,e.seq,e.ts,e.type,e.summary,e.prevHash||""]);
const computeSharedHash=(e)=>sha256Hex(canonicalSharedEntry(e));
// append a shared-scope event to a per-grant chain (own seq space)
async function appendShared(chains,tips,grantId,type,summary){
  if(!SHARED_TYPES.has(type)) throw new Error("not a shared-scope event type: "+type); // guard: only shared events
  const tip=tips[grantId]||{seq:0,hash:""};
  const e={grantId,seq:tip.seq+1,ts:new Date(Date.now()+tip.seq).toISOString(),type,summary,prevHash:tip.hash};
  e.hash=await computeSharedHash(e); tips[grantId]={seq:e.seq,hash:e.hash}; (chains[grantId]=chains[grantId]||[]).push(e); return e;
}
// independent verification + gap classification (interior gap vs tail truncation vs ok)
async function verifyShared(entries,expectedTip){
  const c=entries.slice().sort((a,b)=>a.seq-b.seq); if(!c.length)return{status:"none",count:0};
  let brokenAtSeq=null,missingSeq=null;
  for(let i=0;i<c.length;i++){ const e=c[i];
    if(await computeSharedHash(e)!==e.hash){brokenAtSeq=e.seq;break}                 // own content altered → tampering
    if(i>0&&e.seq!==c[i-1].seq+1){missingSeq=c[i-1].seq+1;break}                      // seq gap FIRST → a missing entry (the more specific cause of a broken link)
    if(i>0&&e.prevHash!==c[i-1].hash){brokenAtSeq=e.seq;break}                        // contiguous but link altered → tampering
  }
  if(brokenAtSeq)return{status:"tampered",brokenAtSeq,count:c.length};
  if(missingSeq)return{status:"gap",missingSeq,count:c.length};
  const tipSeq=c[c.length-1].seq;
  if(c[0].seq!==1)return{status:"gap",missingSeq:1,count:c.length};                   // doesn't start at 1 → head missing
  if(expectedTip&&expectedTip>tipSeq)return{status:"truncated",have:tipSeq,expected:expectedTip,count:c.length}; // tail
  return{status:"ok",tip:tipSeq,count:c.length};
}

// ---- ECDH-ES seal/open (same as the app) for the streamed copy ----
async function kp(){return subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"])}
async function expPub(k){return new Uint8Array(await subtle.exportKey("raw",k))}
async function impPub(r){return subtle.importKey("raw",r,{name:"ECDH",namedCurve:"P-256"},true,[])}
async function Z(priv,pub){return new Uint8Array(await subtle.deriveBits({name:"ECDH",public:pub},priv,256))}
async function wk(z,salt){const b=await subtle.importKey("raw",z,"HKDF",false,["deriveKey"]);return subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt,info:te.encode("care-guardian-grant-v1")},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function seal(payload,pub){const dek=rand(32);const E=await kp();const z=await Z(E.privateKey,await impPub(pub));const n=b64e(rand(12));const WK=await wk(z,te.encode("g|"+n));const iv=rand(12);const dk=await subtle.importKey("raw",dek,{name:"AES-GCM"},false,["encrypt"]);const wiv=rand(12);const wct=new Uint8Array(await subtle.encrypt({name:"AES-GCM",iv:wiv},WK,dek));const wb=new Uint8Array(12+wct.length);wb.set(wiv,0);wb.set(wct,12);const ct=new Uint8Array(await subtle.encrypt({name:"AES-GCM",iv},dk,te.encode(JSON.stringify(payload))));return JSON.stringify({v:1,pushNonce:n,ephemeralPub:b64e(await expPub(E.publicKey)),wrappedKey:b64e(wb),iv:b64e(iv),ciphertext:b64e(ct)})}
async function open(str,priv){const b=JSON.parse(str);const z=await Z(priv,await impPub(Buffer.from(b.ephemeralPub,"base64")));const WK=await wk(z,te.encode("g|"+b.pushNonce));const dek=new Uint8Array(await subtle.decrypt({name:"AES-GCM",iv:Buffer.from(b.wrappedKey,"base64").slice(0,12)},WK,Buffer.from(b.wrappedKey,"base64").slice(12)));const dk=await subtle.importKey("raw",dek,{name:"AES-GCM"},false,["decrypt"]);return JSON.parse(td.decode(await subtle.decrypt({name:"AES-GCM",iv:Buffer.from(b.iv,"base64")},dk,Buffer.from(b.ciphertext,"base64"))))}

(async()=>{
  const chains={},tips={}; const gA="g-aaa",gB="g-bbb"; const PRIV="SENTINEL_PRIVATE_FINANCES";
  // Simulate a realistic mixed timeline. PRIVATE actions never call appendShared — they only touch the local log.
  const localLog=[];
  const doPrivate=(d)=>localLog.push({action:"view",detail:d});               // e.g. viewing finances — stays LOCAL only
  const doShared=async(g,t,s)=>{localLog.push({action:t,detail:s});return appendShared(chains,tips,g,t,s)}; // logged locally AND to the shared chain

  await doShared(gA,"grant.created","View granted: care status, incidents");
  doPrivate(PRIV); doPrivate(PRIV+" again"); doPrivate("viewed after-death planning");  // 3 private actions
  await doShared(gA,"update.sent","Update sent: care status");
  doPrivate(PRIV);                                                                        // 1 more private
  await doShared(gB,"grant.created","View granted: engagement only");                     // a DIFFERENT institution
  await doShared(gA,"update.sent","Update sent: care status, incidents");
  await doShared(gA,"sharing.changed","Switched to manual");

  // 1. PRIVACY INVARIANT — no private event or content anywhere in any shared chain
  const allShared=[...(chains[gA]||[]),...(chains[gB]||[])];
  ok(allShared.every(e=>SHARED_TYPES.has(e.type)),"shared chains contain ONLY shared-scope event types");
  ok(!JSON.stringify(allShared).includes(PRIV),"no private content (SENTINEL) appears anywhere in the shared chains");
  ok(!JSON.stringify(allShared).includes("after-death"),"no private action even by name appears in the shared chains");

  // 2. independent verification from seq 1
  ok((await verifyShared(chains[gA])).status==="ok","grant A's shared chain verifies independently (seq 1..N)");
  ok((await verifyShared(chains[gB])).status==="ok","grant B's shared chain verifies independently");

  // 3. THE KEY WIN: shared seq counts ONLY shared events, not total activity → no volume leak
  ok(chains[gA].length===4 && tips[gA].seq===4,"grant A shared seq tops out at 4 = the 4 sharing events (the 4 private actions are invisible)");
  ok(localLog.length===4+4+1, "the local log saw everything (9 events) — but the institution's chain reveals only its 4");

  // 4. per-institution isolation — A's chain never mentions B (or vice-versa)
  ok(chains[gA].every(e=>e.grantId===gA)&&!JSON.stringify(chains[gA]).includes(gB),"grant A's chain contains nothing about grant B (no cross-institution leak)");
  ok(tips[gA].seq===4 && tips[gB].seq===1,"each institution has an independent seq space");

  // 5. tamper / interior-gap / tail classification
  const tampered=chains[gA].map(e=>e.seq===3?{...e,summary:"ALTERED"}:e);
  ok((await verifyShared(tampered)).status==="tampered","altering a shared entry is detected as tampering");
  const gapped=chains[gA].filter(e=>e.seq!==2);
  const gr=await verifyShared(gapped); ok(gr.status==="gap"&&gr.missingSeq===2,"a missing interior seq is flagged as a gap (compliance failure)");
  const tr=await verifyShared(chains[gA].filter(e=>e.seq<=2),4); ok(tr.status==="truncated"&&tr.have===2&&tr.expected===4,"a missing tail vs the known tip is flagged as truncated (unconfirmed, not tampering)");

  // 6. streamed copy is ciphertext-only and opens to the exact entry
  const prog=await kp(); const entry=chains[gA][1];
  const sealed=await seal(entry,await expPub(prog.publicKey));
  ok(!sealed.includes("care status")&&!sealed.includes("Update sent"),"a streamed shared entry is ciphertext-only at rest (summary not in cleartext)");
  ok(JSON.stringify(await open(sealed,prog.privateKey))===JSON.stringify(entry),"the institution opens the sealed shared entry to the exact record");

  console.log(f===0?"\n✅ SHARED-AUDIT (B) PROOF PASSES — institution sees only shared events; private activity is invisible, even in volume":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
