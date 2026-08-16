// PRF-bound MFA key-combination core. Proves: passcode alone can't unwrap; passcode+passkey and
// passcode+recovery both recover the exact DEK; wrong factors fail. (The WebAuthn ceremony itself
// can't be unit-tested without an authenticator — the PRF output is mocked here as 32 random bytes.)
const KDF_ITER=600000;
const b64=u=>Buffer.from(u).toString("base64");
const ub64=s=>new Uint8Array(Buffer.from(s,"base64"));
async function pbkdf2Bits(passcode,salt,iters){ const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(passcode),"PBKDF2",false,["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:iters,hash:"SHA-256"},km,256)); }
async function combineKey(a,b,hsalt){ const ikm=new Uint8Array(a.length+b.length); ikm.set(a,0); ikm.set(b,a.length); const base=await crypto.subtle.importKey("raw",ikm,"HKDF",false,["deriveKey"]); return crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:hsalt,info:new TextEncoder().encode("care-guardian-mfa-v1")},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]); }
async function wrapWithKey(dek,key){ const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,dek)); const o=new Uint8Array(12+ct.length); o.set(iv,0); o.set(ct,12); return b64(o); }
async function unwrapWithKey(blob,key){ const buf=ub64(blob); return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(0,12)},key,buf.slice(12))); }

// Build MFA + recovery wraps (mirrors enrollment)
async function enroll(dek, passcode, prfOutput, recoveryCode){
  const ps=crypto.getRandomValues(new Uint8Array(16)), hs=crypto.getRandomValues(new Uint8Array(16)), rs=crypto.getRandomValues(new Uint8Array(16));
  const pcB=await pbkdf2Bits(passcode,ps,KDF_ITER);
  const kMfa=await combineKey(pcB, prfOutput, hs);
  const recB=await pbkdf2Bits(recoveryCode,rs,KDF_ITER);
  const kRec=await combineKey(pcB, recB, hs);
  return { cMfa:{ps:b64(ps),hs:b64(hs),blob:await wrapWithKey(dek,kMfa)}, cRecovery:{ps:b64(ps),rs:b64(rs),hs:b64(hs),blob:await wrapWithKey(dek,kRec)} };
}
async function unwrapMfa(wk, passcode, prfOutput){ const pcB=await pbkdf2Bits(passcode,ub64(wk.cMfa.ps),KDF_ITER); const k=await combineKey(pcB,prfOutput,ub64(wk.cMfa.hs)); return unwrapWithKey(wk.cMfa.blob,k); }
async function unwrapRec(wk, passcode, recoveryCode){ const pcB=await pbkdf2Bits(passcode,ub64(wk.cRecovery.ps),KDF_ITER); const recB=await pbkdf2Bits(recoveryCode,ub64(wk.cRecovery.rs),KDF_ITER); const k=await combineKey(pcB,recB,ub64(wk.cRecovery.hs)); return unwrapWithKey(wk.cRecovery.blob,k); }

let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
(async()=>{
  const dek=crypto.getRandomValues(new Uint8Array(32));
  const passcode="9214"; const prf=crypto.getRandomValues(new Uint8Array(32)); const rec="K7M2-9QXP-4ABV-RT3N-8WJF";
  const wk=await enroll(dek,passcode,prf,rec);

  ok(eq(await unwrapMfa(wk,passcode,prf),dek),"passcode + passkey(PRF) recovers exact DEK");
  ok(eq(await unwrapRec(wk,passcode,rec),dek),"passcode + recovery code recovers exact DEK");

  // passcode alone cannot unwrap cMfa (no prf): try wrong/zero prf
  let bypass=false; try{ const z=new Uint8Array(32); if(eq(await unwrapMfa(wk,passcode,z),dek))bypass=true; }catch{}
  ok(!bypass,"passcode + WRONG passkey output fails (no passcode-only bypass)");

  let bad=false; try{ if(eq(await unwrapMfa(wk,"0000",prf),dek))bad=true; }catch{}
  ok(!bad,"WRONG passcode + correct passkey fails (both factors required)");

  let badrec=false; try{ if(eq(await unwrapRec(wk,passcode,"WRONG-CODE-0000-0000-0000"),dek))badrec=true; }catch{}
  ok(!badrec,"wrong recovery code fails");

  let badrec2=false; try{ if(eq(await unwrapRec(wk,"0000",rec),dek))badrec2=true; }catch{}
  ok(!badrec2,"recovery code with WRONG passcode fails (recovery is still 2-factor, not a single-factor bypass)");

  // stability across repeats
  ok(eq(await unwrapMfa(wk,passcode,prf),dek)&&eq(await unwrapMfa(wk,passcode,prf),dek),"MFA unwrap is stable across repeated unlocks");

  console.log(fails===0?"\n✅ ALL MFA-CORE TESTS PASS":"\n❌ "+fails+" FAILURES"); if(fails)process.exitCode=1;
})();

// ── Multi-passkey backstop: each passkey wraps the same DEK under passcode + its own PRF output ──
async function buildPasskeyWrap(dek, passcode, prf){ const ps=crypto.getRandomValues(new Uint8Array(16)),hs=crypto.getRandomValues(new Uint8Array(16)); const pcB=await pbkdf2Bits(passcode,ps,KDF_ITER); return {ps:b64(ps),hs:b64(hs),blob:await wrapWithKey(dek,await combineKey(pcB,prf,hs))}; }
async function unwrapEntry(entry,passcode,prf){ const pcB=await pbkdf2Bits(passcode,ub64(entry.ps),KDF_ITER); return unwrapWithKey(entry.blob,await combineKey(pcB,prf,ub64(entry.hs))); }
(async()=>{
  let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
  const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
  const dek=crypto.getRandomValues(new Uint8Array(32)); const pc="4417";
  const prfPrimary=crypto.getRandomValues(new Uint8Array(32));
  const prfBackup=crypto.getRandomValues(new Uint8Array(32));
  const e1={credentialId:"id-primary", ...await buildPasskeyWrap(dek,pc,prfPrimary)};
  const e2={credentialId:"id-backup",  ...await buildPasskeyWrap(dek,pc,prfBackup)};
  const keys=[e1,e2];
  ok(eq(await unwrapEntry(keys.find(e=>e.credentialId==="id-primary"),pc,prfPrimary),dek),"primary passkey unlocks the DEK");
  ok(eq(await unwrapEntry(keys.find(e=>e.credentialId==="id-backup"),pc,prfBackup),dek),"backup passkey unlocks the SAME DEK");
  let cross=false; try{ if(eq(await unwrapEntry(e1,pc,prfBackup),dek))cross=true }catch{}
  ok(!cross,"a passkey's PRF can't open another passkey's wrap (entries are independent)");
  let wrongpc=false; try{ if(eq(await unwrapEntry(e2,"0000",prfBackup),dek))wrongpc=true }catch{}
  ok(!wrongpc,"backup passkey still requires the correct passcode (2-factor preserved)");
  ok(eq(await unwrapEntry(e1,pc,prfPrimary),dek)&&eq(await unwrapEntry(e2,pc,prfBackup),dek),"passkey-only (recovery removed): both keys remain valid");
  console.log(f===0?"\n✅ MULTI-PASSKEY TESTS PASS":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
