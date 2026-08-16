// wal-sim.js — simulate the full WAL pipeline (mirroring dashboard.jsx logic) against an in-memory store.
const { diffState, applyPatch } = require("./wal-core.cjs");
function deepEq(a,b){ return JSON.stringify(canon(a))===JSON.stringify(canon(b)); }
function canon(v){ if(Array.isArray(v))return v.map(canon); if(v&&typeof v==="object"){const o={};for(const k of Object.keys(v).sort())o[k]=canon(v[k]);return o;} return v; }
const clone=v=>JSON.parse(JSON.stringify(v));

// ── In-memory store mirroring the IndexedDB layer (encryption modeled as identity) ──
function makeStore(){
  const enc={}, wal=new Map(); // enc: snapA/snapB/walmeta/data ; wal: seq->ct
  const corrupt=new Set();     // slots we pretend fail to decrypt
  return {
    enc, wal, corrupt,
    walAppend:(seq,ct)=>wal.set(seq,ct),
    walReadSince:(after)=>[...wal.keys()].filter(s=>s>after).sort((a,b)=>a-b).map(s=>({seq:s,ct:wal.get(s)})),
    walPrune:(upto)=>{ for(const s of [...wal.keys()]) if(s<=upto) wal.delete(s); },
    saveSnapshot:(ct,seq,slot)=>{ enc[slot]={seq,ct}; enc.walmeta={slot,seq}; },
    dec:(slot,ct)=>{ if(corrupt.has(slot)) throw new Error("corrupt"); return clone(ct); }, // identity "decrypt"
  };
}
// Mirror loadVaultV4 exactly (with identity decrypt + corrupt-slot simulation)
function loadVaultV4(store){
  const meta=store.enc.walmeta||null;
  const order=[]; if(meta&&meta.slot)order.push(meta.slot);
  if(!order.includes("snapA"))order.push("snapA"); if(!order.includes("snapB"))order.push("snapB"); order.push("data");
  let base=null,baseSeq=0,baseSlot=null;
  for(const slot of order){
    const val=store.enc[slot]; if(!val)continue;
    const ct=(slot==="data")?val:val.ct; const seq=(slot==="data")?0:(val.seq||0);
    try{ const st=store.dec(slot,ct); base=st; baseSeq=seq; baseSlot=slot; break; }catch{}
  }
  if(base===null)return null;
  let state=base,maxSeq=baseSeq;
  for(const en of store.walReadSince(baseSeq)){ try{ const p=store.dec("wal",en.ct); state=applyPatch(state,p); if(en.seq>maxSeq)maxSeq=en.seq; }catch{break;} }
  return {state,maxSeq,baseSeq,baseSlot};
}

// ── Pipeline mirror ──
function makeSession(store, base){
  // fresh setup writes base blob to "data"
  store.enc.data=clone(base);
  return { store, live:clone(base), prev:clone(base), seq:0, editsSince:0, lastCkptSeq:0, ckptSlot:"snapA", N:25 };
}
function edit(s, updater){
  const next=updater(clone(s.live));
  const patch=diffState(s.prev,next);
  s.live=next; s.prev=clone(next);
  if(patch===undefined)return;
  s.seq++; s.store.walAppend(s.seq, clone(patch)); s.editsSince++;
  if(s.editsSince>=s.N){ checkpoint(s); }
}
function checkpoint(s){
  const slot=s.ckptSlot;
  s.store.saveSnapshot(clone(s.live), s.seq, slot);
  s.store.walPrune(s.lastCkptSeq);     // prune to PREVIOUS checkpoint (keep it as fallback)
  s.lastCkptSeq=s.seq; s.ckptSlot=slot==="snapA"?"snapB":"snapA"; s.editsSince=0;
}

let fails=0;
function check(cond,msg){ if(!cond){fails++;console.log("✗ "+msg);} }

// Scenario A: long run with periodic checkpoints; reload must equal live at many points
{
  const store=makeStore();
  const s=makeSession(store,{domains:{physical:{goals:[{done:false,subs:[{done:false}]}]}},incidents:[],medLog:[],settings:{name:"Mom"}});
  for(let i=0;i<260;i++){
    const r=i%5;
    if(r===0) edit(s,st=>({...st,incidents:[...st.incidents,{id:"i"+i,t:"note"+i}]}));
    else if(r===1) edit(s,st=>({...st,medLog:[...st.medLog,{k:"m"+i}]}));
    else if(r===2) edit(s,st=>({...st,domains:{...st.domains,physical:{...st.domains.physical,goals:[{...st.domains.physical.goals[0],subs:st.domains.physical.goals[0].subs.map((x,j)=>j===0?{...x,done:!x.done}:x)}]}}}));
    else if(r===3) edit(s,st=>({...st,settings:{...st.settings,note:"upd"+i}}));
    else edit(s,st=>({...st,medLog:[{k:"pre"+i},...st.medLog]}));
    if(i%17===0){ const L=loadVaultV4(store); check(L&&deepEq(L.state,s.live),"A: reload≠live at edit "+i); }
  }
  const L=loadVaultV4(store); check(L&&deepEq(L.state,s.live),"A: final reload≠live");
  console.log("A done. wal size:",store.wal.size,"(bounded, not 260)");
}

// Scenario B: crash mid-stream (edits since last checkpoint, no final checkpoint) — reload must recover every edit
{
  const store=makeStore();
  const s=makeSession(store,{a:0,arr:[]});
  for(let i=0;i<31;i++) edit(s,st=>({...st,a:st.a+1,arr:[...st.arr,i]})); // 31 edits → one checkpoint at 25, 6 pending in WAL
  const L=loadVaultV4(store);
  check(L&&deepEq(L.state,s.live),"B: crash recovery lost edits");
  check(L.state.a===31,"B: expected a=31 got "+(L&&L.state.a));
  console.log("B done. recovered a=",L.state.a,"(all 31 edits survive an unclean stop)");
}

// Scenario C: corrupt ACTIVE snapshot → must fall back to previous snapshot + replay, with NO double-apply
{
  const store=makeStore();
  const s=makeSession(store,{n:0,items:[]});
  for(let i=0;i<60;i++) edit(s,st=>({...st,n:st.n+1,items:[...st.items,i]})); // checkpoints at 25 (snapA) and 50 (snapB); active=snapB
  // active snapshot is snapB@50; corrupt it
  store.corrupt.add("snapB");
  const L=loadVaultV4(store);
  check(L&&deepEq(L.state,s.live),"C: A/B fallback produced wrong state (double-apply?)");
  check(L.state.n===60,"C: expected n=60 got "+(L&&L.state.n));
  check(L.baseSlot==="snapA","C: should have fallen back to snapA, used "+(L&&L.baseSlot));
  console.log("C done. fell back to",L.baseSlot,"recovered n=",L.state.n,"(no double-apply)");
}

// Scenario D: eviction — vault gone (no snapshots, no data, empty wal) → loader returns null
{
  const store=makeStore();
  const L=loadVaultV4(store);
  check(L===null,"D: empty store should yield null (eviction signal)");
  console.log("D done. empty store →", L);
}

// Scenario E: prune never strands the fallback (after corrupting active at MANY checkpoint boundaries)
{
  for(let trial=0;trial<50;trial++){
    const store=makeStore();
    const s=makeSession(store,{c:0,log:[]});
    const stop=26+Math.floor(Math.random()*200);
    for(let i=0;i<stop;i++) edit(s,st=>({...st,c:st.c+1,log:[...st.log,i]}));
    // corrupt whichever slot is active
    const active=store.enc.walmeta&&store.enc.walmeta.slot;
    if(active) store.corrupt.add(active);
    const L=loadVaultV4(store);
    check(L&&deepEq(L.state,s.live),"E trial "+trial+": fallback wrong (active="+active+", stop="+stop+")");
  }
  console.log("E done. 50 randomized active-snapshot-corruption trials");
}

console.log(fails===0 ? "\n✅ ALL PIPELINE SCENARIOS PASS — reload always reconstructs the exact live state." : "\n❌ "+fails+" FAILURES");
process.exit(fails===0?0:1);
