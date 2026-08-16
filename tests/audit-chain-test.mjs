// Mirror of the in-app hash-chain logic; verify tamper-detection fires correctly.
async function sha256Hex(str){ const buf=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""); }
function canonicalAuditEntry(e){ return JSON.stringify([e.id,e.seq,e.timestamp,e.action,e.detail,e.phiType,e.userId,e.userName,e.role,e.prevHash||""]); }
async function computeEntryHash(e){ return sha256Hex(canonicalAuditEntry(e)); }
async function verifyAuditChain(entries, storedTip){
  const chained=entries.filter(e=>typeof e.seq==="number"&&e.hash).sort((a,b)=>a.seq-b.seq);
  if(chained.length===0) return {status:"none"};
  let brokenAtSeq=null;
  for(let i=0;i<chained.length;i++){ const e=chained[i];
    const expected=await computeEntryHash(e);
    if(expected!==e.hash){brokenAtSeq=e.seq;break;}
    if(i>0&&e.prevHash!==chained[i-1].hash){brokenAtSeq=e.seq;break;}
    if(i>0&&e.seq!==chained[i-1].seq+1){brokenAtSeq=e.seq;break;}
  }
  const last=chained[chained.length-1]; const tip={seq:last.seq,hash:last.hash};
  let truncated=false; if(!brokenAtSeq&&storedTip&&storedTip.seq>tip.seq)truncated=true;
  return {status:brokenAtSeq?"broken":(truncated?"truncated":"ok"),brokenAtSeq,tip};
}
// Build a valid chain
async function build(n){ const out=[]; let tip={seq:0,hash:""};
  for(let i=1;i<=n;i++){ const e={id:"id"+i,seq:i,timestamp:"2026-06-0"+(i%9),action:"view",detail:"viewed record "+i,phiType:"financial",userId:"d",userName:"A",role:"admin",prevHash:tip.hash}; e.hash=await computeEntryHash(e); tip={seq:e.seq,hash:e.hash}; out.push(e); }
  return out;
}
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};
(async()=>{
  const chain=await build(10);
  ok((await verifyAuditChain(chain)).status==="ok","valid 10-entry chain verifies ok");

  // tamper: alter entry #5 content (attacker edits detail but doesn't recompute hashes)
  const t1=JSON.parse(JSON.stringify(chain)); t1[4].detail="(evidence removed)";
  const r1=await verifyAuditChain(t1); ok(r1.status==="broken"&&r1.brokenAtSeq===5,"altered entry #5 detected as broken@5 (got "+r1.status+"@"+r1.brokenAtSeq+")");

  // delete interior entry #6 (seq gap + link break)
  const t2=chain.filter(e=>e.seq!==6); const r2=await verifyAuditChain(t2);
  ok(r2.status==="broken","deleted interior entry detected as broken (got "+r2.status+"@"+r2.brokenAtSeq+")");

  // truncate tail: keep first 7, but stored tip remembers seq 10
  const t3=chain.filter(e=>e.seq<=7); const r3=await verifyAuditChain(t3,{seq:10,hash:chain[9].hash});
  ok(r3.status==="truncated","tail truncation detected via stored tip (got "+r3.status+")");

  // legacy entries (no seq/hash) must not false-alarm
  const legacy=[{id:"L1",action:"login"},{id:"L2",action:"view"}];
  ok((await verifyAuditChain(legacy)).status==="none","legacy entries → 'none', no false tamper alarm");

  // mixed legacy + new chain: new chain still verifies
  const mixed=[...legacy,...chain]; ok((await verifyAuditChain(mixed)).status==="ok","legacy+chained mix verifies ok");

  // full re-encryption attack: attacker recomputes whole chain after editing #5 (honest limit — should verify ok)
  const t5=JSON.parse(JSON.stringify(chain)); t5[4].detail="(evidence removed)"; let tip={seq:4,hash:t5[3].hash};
  for(let i=4;i<t5.length;i++){ t5[i].prevHash=tip.hash; t5[i].hash=await computeEntryHash(t5[i]); tip={seq:t5[i].seq,hash:t5[i].hash}; }
  ok((await verifyAuditChain(t5)).status==="ok","full chain recompute verifies ok — confirms documented limit (evidence, not prevention)");

  console.log(fails===0?"\n✅ ALL AUDIT-CHAIN TESTS PASS":"\n❌ "+fails+" FAILURES"); process.exit(fails?1:0);
})();
