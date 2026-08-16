// Client self-report integrity chain: append-only, tamper-evident. Mirrors the app's construction.
const enc=new TextEncoder();
async function sha256Hex(s){const d=await crypto.subtle.digest("SHA-256",enc.encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function canonicalSr(r){ return JSON.stringify({id:r.id,type:r.type||"",text:r.text||"",mood:r.mood||"",pain:r.pain||"",date:r.date||"",timestamp:r.timestamp||"",audioData:r.audioData||null,photos:r.photos||[],mediaHashes:r.mediaHashes||[],origin:r.origin||"",srSeq:r.srSeq,srPrev:r.srPrev}); }
async function computeSrHash(r){ return sha256Hex(canonicalSr(r)); }
async function chainClientReports(state){
  const reports=[...(state.selfReports||[])];
  const chained=reports.filter(r=>r&&r.origin==="client"&&typeof r.srSeq==="number"&&r.srHash).sort((a,b)=>a.srSeq-b.srSeq);
  let maxSeq=0, prevHash="genesis";
  if(chained.length){ const last=chained[chained.length-1]; maxSeq=last.srSeq; prevHash=last.srHash; }
  const unchained=reports.filter(r=>r&&r.origin==="client"&&!(typeof r.srSeq==="number"&&r.srHash));
  if(!unchained.length) return {state, changed:false};
  unchained.sort((a,b)=>String(a.timestamp||"").localeCompare(String(b.timestamp||"")));
  const byId=new Map();
  for(const u of unchained){ const e={...u, srSeq:++maxSeq, srPrev:prevHash}; e.srHash=await computeSrHash(e); prevHash=e.srHash; byId.set(e.id,e); }
  return {state:{...state, selfReports:reports.map(r=>(r&&byId.has(r.id))?byId.get(r.id):r), settings:{...state.settings, selfReportTip:{seq:maxSeq, hash:prevHash}}}, changed:true};
}
async function verifySrChain(reports, vaultTip){
  const chained=(reports||[]).filter(r=>r&&typeof r.srSeq==="number"&&r.srHash).sort((a,b)=>a.srSeq-b.srSeq);
  if(!chained.length) return {status:"none", chained:0, tip:null};
  let prev="genesis";
  for(let i=0;i<chained.length;i++){ const e=chained[i];
    if(i===0&&e.srSeq!==1) return {status:"broken", at:e.srSeq};
    if(i>0&&e.srSeq!==chained[i-1].srSeq+1) return {status:"broken", at:e.srSeq};
    if(e.srPrev!==prev) return {status:"broken", at:e.srSeq};
    const h=await computeSrHash(e); if(h!==e.srHash) return {status:"broken", at:e.srSeq};
    prev=e.srHash;
  }
  const last=chained[chained.length-1]; const tip={seq:last.srSeq,hash:last.srHash};
  let truncated=false;
  if(vaultTip&&typeof vaultTip.seq==="number"){ if(vaultTip.seq>tip.seq)truncated=true; if(!truncated&&vaultTip.seq===tip.seq&&vaultTip.hash&&vaultTip.hash!==tip.hash)truncated=true; }
  return {status:truncated?"truncated":"ok", chained:chained.length, tip};
}
const mergeById=(localArr,remoteArr)=>{ const ids=new Set((localArr||[]).map(r=>r.id)); return [...(localArr||[]),...(remoteArr||[]).filter(r=>!ids.has(r.id))]; };

let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};
(async()=>{
  let state={selfReports:[
    {id:"c3",origin:"client",type:"mood",mood:"😟",timestamp:"2026-06-09 10:00"},
    {id:"k1",origin:"caregiver",type:"text",text:"proxy note",timestamp:"2026-06-09 09:30"},
    {id:"c2",origin:"client",type:"text",text:"I feel forgotten",timestamp:"2026-06-08 18:00"},
    {id:"c1",origin:"client",type:"pain",pain:"4",timestamp:"2026-06-08 09:00",mediaHashes:["abc123"]},
  ],settings:{}};
  state=(await chainClientReports(state)).state;
  const tip=state.settings.selfReportTip;
  ok(tip&&tip.seq===3,"3 client reports chained (seq 1..3); caregiver report excluded");
  ok((await verifySrChain(state.selfReports,tip)).status==="ok","fresh chain verifies ok against the vault anchor");
  ok((await chainClientReports(state)).changed===false,"re-chaining is idempotent (already-chained reports untouched)");

  const altered={...state,selfReports:state.selfReports.map(r=>r.id==="c2"?{...r,text:"I feel fine"}:r)};
  ok((await verifySrChain(altered.selfReports,tip)).status==="broken","altering a client report's text breaks the chain");
  const swapped={...state,selfReports:state.selfReports.map(r=>r.id==="c1"?{...r,mediaHashes:["evil"]}:r)};
  ok((await verifySrChain(swapped.selfReports,tip)).status==="broken","altering a report's media hash breaks the chain");

  const noMid={...state,selfReports:state.selfReports.filter(r=>r.id!=="c2")};
  ok((await verifySrChain(noMid.selfReports,tip)).status==="broken","deleting a middle client report breaks the chain (seq gap)");
  const noHead={...state,selfReports:state.selfReports.filter(r=>r.id!=="c1")};
  ok((await verifySrChain(noHead.selfReports,tip)).status==="broken","deleting the FIRST client report breaks the chain (head check)");
  const noTail={...state,selfReports:state.selfReports.filter(r=>r.id!=="c3")};
  ok((await verifySrChain(noTail.selfReports,tip)).status==="truncated","deleting the most recent report is caught by the vault/projection anchor (truncation)");
  const noCg={...state,selfReports:state.selfReports.filter(r=>r.id!=="k1")};
  ok((await verifySrChain(noCg.selfReports,tip)).status==="ok","deleting a caregiver-authored report leaves the client chain intact");

  const malicious=[{id:"c2",origin:"client",type:"text",text:"REPLACED",srSeq:2,srPrev:"x",srHash:"y"}];
  const mergedArr=mergeById(state.selfReports,malicious);
  ok(mergedArr.find(r=>r.id==="c2").text==="I feel forgotten","append-only merge: existing client report wins over a crafted same-id import");
  ok((await verifySrChain(mergedArr,tip)).status==="ok","chain remains intact after a merge attempt");

  let s2={...state,selfReports:[{id:"c4",origin:"client",type:"text",text:"slept badly",timestamp:"2026-06-10 08:00"},...state.selfReports]};
  s2=(await chainClientReports(s2)).state;
  ok(s2.settings.selfReportTip.seq===4&&(await verifySrChain(s2.selfReports,s2.settings.selfReportTip)).status==="ok","new client report extends the chain to seq 4 and verifies");

  console.log(fails===0?"\n✅ ALL SELF-REPORT CHAIN TESTS PASS":"\n❌ "+fails+" FAILURES"); if(fails)process.exitCode=1;
})();

// ── Round 7 hardening: outbox sanitizer ──
(async()=>{
  let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
  function sanitizeOutboxReport(r){
    if(!r||typeof r!=="object")return null;
    const s=(v,max)=>typeof v==="string"?v.slice(0,max):"";
    const out={id:(typeof r.id==="number"||typeof r.id==="string")?String(r.id).slice(0,64):null,
      type:s(r.type,24), text:s(r.text,20000), mood:s(r.mood,16), pain:s(r.pain,16),
      date:s(r.date,32), timestamp:s(r.timestamp,64)};
    if(!out.id)return null;
    if(typeof r.audioData==="string"&&(r.audioData.startsWith("blobref:")||(r.audioData.startsWith("data:audio/")&&r.audioData.length<8000000)))out.audioData=r.audioData;
    if(Array.isArray(r.photos))out.photos=r.photos.filter(p=>typeof p==="string"&&(p.startsWith("blobref:")||(p.startsWith("data:image/")&&p.length<3000000))).slice(0,3);
    if(Array.isArray(r.mediaHashes))out.mediaHashes=r.mediaHashes.filter(h=>typeof h==="string"&&/^[a-f0-9]{64}$/.test(h)).slice(0,8);
    return out;
  }
  const evil={id:7,srSeq:1,srPrev:"x",srHash:"forged",origin:"caregiver",type:"text",
    text:"A".repeat(3000000), settings:{hack:true}, incidents:[{}], audioData:"javascript:alert(1)",
    photos:["blobref:ok1","http://evil/x.png"], mediaHashes:["zz","a".repeat(64)]};
  const clean=sanitizeOutboxReport(evil);
  ok(clean.srSeq===undefined&&clean.srPrev===undefined&&clean.srHash===undefined,"crafted chain fields are STRIPPED (cannot corrupt chain verification)");
  ok(clean.origin===undefined,"crafted origin is stripped (force-set to client by the ingester)");
  ok(clean.settings===undefined&&clean.incidents===undefined,"unknown/strange fields do not survive the whitelist");
  ok(clean.text.length===20000,"oversized text is capped at 20k chars");
  ok(clean.audioData===undefined,"non-data:, non-blobref audio is dropped");
  ok(clean.photos.length===1&&clean.photos[0]==="blobref:ok1","only blobref/data:image photos survive");
  ok(clean.mediaHashes.length===1&&/^a+$/.test(clean.mediaHashes[0]),"only well-formed sha256 hex media hashes survive");
  let st={selfReports:[{...clean,origin:"client"}],settings:{}};
  st=(await chainClientReports(st)).state;
  ok((await verifySrChain(st.selfReports,st.settings.selfReportTip)).status==="ok","sanitized report chains fresh and verifies");
  console.log(f===0?"✅ OUTBOX HARDENING TESTS PASS":"❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
