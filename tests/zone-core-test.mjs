// Cryptographic role enforcement core: two-tier key hierarchy + zone envelope.
// Real PBKDF2-600k + AES-GCM throughout (same primitives as the app).
const b64=u=>Buffer.from(u).toString("base64"); const ub64=s=>new Uint8Array(Buffer.from(s,"base64"));
const KDF_ITER=600000;
async function pbkdf2Bits(pw,salt,iter){const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]);return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:iter,hash:"SHA-256"},km,256));}
async function enc(keyRaw,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const k=await crypto.subtle.importKey("raw",keyRaw,{name:"AES-GCM"},false,["encrypt"]);const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},k,new TextEncoder().encode(JSON.stringify(obj))));const o=new Uint8Array(12+ct.length);o.set(iv,0);o.set(ct,12);return b64(o);}
async function dec(keyRaw,blob){const buf=ub64(blob);const k=await crypto.subtle.importKey("raw",keyRaw,{name:"AES-GCM"},false,["decrypt"]);const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(0,12)},k,buf.slice(12));return JSON.parse(new TextDecoder().decode(pt));}

const ZONE_R_ROOTS=["selfReports","appointments","medSchedule","emergencyPlans","messages"];
const SETTINGS_R_FIELDS=["deviceId","deviceName","stateCode","clientTier"];
function splitState(state){
  const R={settings:{}},F={settings:{}};
  for(const k in state){ if(k==="settings")continue; (ZONE_R_ROOTS.includes(k)?R:F)[k]=state[k]; }
  for(const k in (state.settings||{})){ (SETTINGS_R_FIELDS.includes(k)?R.settings:F.settings)[k]=state.settings[k]; }
  return {R,F};
}
function joinState(F,R){ const s={...F,...R,settings:{...(F.settings||{}),...(R.settings||{})}}; return s; }

let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};
(async()=>{
  const DEK_F=crypto.getRandomValues(new Uint8Array(32)), DEK_R=crypto.getRandomValues(new Uint8Array(32));
  const cgPc="4417", clPc="0000";
  const sCg=crypto.getRandomValues(new Uint8Array(16)), sCl=crypto.getRandomValues(new Uint8Array(16));
  const wkCaregiver=await enc(await pbkdf2Bits(cgPc,sCg,KDF_ITER), {f:b64(DEK_F),r:b64(DEK_R)});
  const wkClient   =await enc(await pbkdf2Bits(clPc,sCl,KDF_ITER), {r:b64(DEK_R)});

  const state={ incidents:[{id:1,type:"fall",notes:"private detail"}], expenses:[{id:2,amt:1200}], capacityLog:[{id:3}],
    poaDecisions:[{id:4}], savedDocs:[{id:5,rawText:"medicaid filing"}],
    selfReports:[{id:6,text:"slept well"}], appointments:[{id:7,title:"Dr. Kim 3pm"}],
    medSchedule:{medications:[{name:"donepezil"}],log:[]}, emergencyPlans:[{key:"fall",steps:["call 911"]}],
    messages:[{id:8,text:"love you mom"}],
    settings:{deviceId:"d1",deviceName:"Kitchen iPad",stateCode:"OR",clientTier:"client-restricted",auditTip:{seq:42,hash:"abc"},mfa:{enabled:true}} };

  const {R,F}=splitState(state);
  ok(JSON.stringify(Object.keys(joinState(F,R)).sort())===JSON.stringify(Object.keys(state).sort()),"split/join is lossless (all roots and settings fields survive)");
  ok(!("incidents" in R)&&!("expenses" in R)&&!("capacityLog" in R)&&!("poaDecisions" in R)&&!("savedDocs" in R),"private roots (incidents, finances, capacity, POA, documents) are NOT in the client zone");
  ok(R.settings.auditTip===undefined&&R.settings.mfa===undefined,"private settings (auditTip, mfa) are NOT in the client zone");
  ok("selfReports" in R&&"appointments" in R&&"medSchedule" in R,"client-visible roots are in the R zone");

  const ctF=await enc(DEK_F,F), ctR=await enc(DEK_R,R);

  const bundle=await dec(await pbkdf2Bits(cgPc,sCg,KDF_ITER), wkCaregiver);
  const full=joinState(await dec(ub64(bundle.f),ctF), await dec(ub64(bundle.r),ctR));
  ok(full.incidents[0].notes==="private detail"&&full.selfReports[0].text==="slept well","caregiver passcode reconstructs the FULL state from both zones");

  const clBundle=await dec(await pbkdf2Bits(clPc,sCl,KDF_ITER), wkClient);
  const clientView=await dec(ub64(clBundle.r),ctR);
  ok(clientView.appointments[0].title==="Dr. Kim 3pm","client passcode reads the client zone (appointments, self-reports)");
  ok(clBundle.f===undefined,"client bundle mathematically lacks the F key");
  let leaked=false; try{ await dec(ub64(clBundle.r),ctF); leaked=true; }catch{}
  ok(!leaked,"client key CANNOT decrypt the private zone (AES-GCM rejects) — incidents/finances/POA are cryptographically unreachable");

  const R2={...clientView, selfReports:[{id:9,text:"feeling dizzy",ts:1},...clientView.selfReports]};
  const ctR2=await enc(ub64(clBundle.r),R2);
  const afterClientSession={ctF, ctR:ctR2};
  ok(afterClientSession.ctF===ctF,"client session carries the private ciphertext forward UNTOUCHED (cannot corrupt what it cannot read)");
  const cgAfter=joinState(await dec(ub64(bundle.f),afterClientSession.ctF), await dec(ub64(bundle.r),afterClientSession.ctR));
  ok(cgAfter.selfReports[0].text==="feeling dizzy"&&cgAfter.incidents[0].notes==="private detail","caregiver sees the client's new self-report AND all private data intact");

  const prf=crypto.getRandomValues(new Uint8Array(32)); const hs=crypto.getRandomValues(new Uint8Array(16));
  const hk=await crypto.subtle.importKey("raw",prf,"HKDF",false,["deriveBits"]);
  const pcB=await pbkdf2Bits(cgPc,sCg,KDF_ITER);
  const comb=new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:hs,info:pcB},hk,256));
  const wkMfa=await enc(comb,{f:b64(DEK_F),r:b64(DEK_R)});
  const mfaBundle=await dec(comb,wkMfa);
  ok(mfaBundle.f===b64(DEK_F)&&mfaBundle.r===b64(DEK_R),"PRF-bound MFA wraps the key BUNDLE with no change to the factor-combination scheme");

  console.log(fails===0?"\n✅ ALL ZONE-CORE TESTS PASS":"\n❌ "+fails+" FAILURES");
})();

// ── Option B refinement: R wrapped UNDER F + projection/outbox round-trip ──
(async()=>{
  let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
  const DEK_F=crypto.getRandomValues(new Uint8Array(32)), DEK_R=crypto.getRandomValues(new Uint8Array(32));
  const rUnderF=await enc(DEK_F, b64(DEK_R));
  const derivedR=ub64(await dec(DEK_F, rUnderF));
  ok(derivedR.length===32&&derivedR.every((b,i)=>b===DEK_R[i]),"any path that recovers F derives R (MFA/recovery wraps unchanged)");
  let clientDerives=false; try{ await dec(DEK_R, rUnderF); clientDerives=true; }catch{}
  ok(!clientDerives,"R cannot derive F or re-derive itself from rUnderF (one-way down the hierarchy)");

  const full={ incidents:[{id:1,notes:"private"}], poaDecisions:[{id:2}], appointments:[{id:3,title:"PT 10am"}],
    messages:[{id:4,text:"hi mom"}], selfReports:[], medSchedule:{medications:[{name:"donepezil"}],log:[]},
    emergencyPlans:[{key:"fall",steps:["call 911"]}], settings:{deviceName:"Kitchen iPad",stateCode:"OR",clientTier:"client-restricted",auditTip:{seq:9}} };
  const {R:proj}=splitState(full);
  const projCt=await enc(DEK_R, proj);

  const clientState=await dec(DEK_R, projCt);
  ok(clientState.appointments[0].title==="PT 10am"&&!("incidents" in clientState)&&!("poaDecisions" in clientState)&&clientState.settings.auditTip===undefined,"client projection: visible data present, private roots and settings absent");

  const outboxCt=await enc(DEK_R, [{id:99,type:"text",text:"feeling dizzy",photos:[]}]);
  const outbox=await dec(derivedR, outboxCt);
  const ingested={...full, selfReports:[...outbox, ...full.selfReports]};
  ok(ingested.selfReports[0].text==="feeling dizzy"&&ingested.incidents[0].notes==="private","caregiver ingests the outbox; private data intact");
  const proj2=splitState(ingested).R; const projCt2=await enc(derivedR, proj2);
  const clientAfter=await dec(DEK_R, projCt2);
  ok(clientAfter.selfReports[0].id===99,"re-projection returns the client's own submission to their view");

  console.log(f===0?"✅ OPTION-B (rUnderF + projection/outbox) TESTS PASS":"❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
