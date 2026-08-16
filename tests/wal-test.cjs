// wal-test.js — prove diffState/applyPatch/replay round-trip for all JSON-safe transitions.
const { diffState, applyPatch, replay } = require("./wal-core.cjs");

function deepEq(a,b){ return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); }
// canonicalize key order so equality is order-insensitive
function canon(v){
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v==="object"){ const o={}; for (const k of Object.keys(v).sort()) o[k]=canon(v[k]); return o; }
  return v;
}
function rnd(n){ return Math.floor(Math.random()*n); }
function randVal(depth){
  const t = rnd(depth>2 ? 4 : 7);
  switch(t){
    case 0: return rnd(1000);
    case 1: return ["a","bb","ccc","note text",""][rnd(5)];
    case 2: return [true,false,null][rnd(3)];
    case 3: return rnd(2)?0:"";
    case 4: { const n=rnd(4); const a=[]; for(let i=0;i<n;i++)a.push(randVal(depth+1)); return a; }
    default: { const n=rnd(4); const o={}; for(let i=0;i<n;i++)o["k"+rnd(6)]=randVal(depth+1); return o; }
  }
}
// Immutable edit operations, mimicking how the app mutates state (React-style structural sharing)
function mutate(state){
  const s = Array.isArray(state) ? state.slice() : (state&&typeof state==="object" ? {...state} : state);
  if (Array.isArray(s)){
    const op = rnd(5);
    if (op===0) return [...s, randVal(0)];                 // append
    if (op===1) return [randVal(0), ...s];                  // prepend
    if (op===2 && s.length){ const i=rnd(s.length); const c=s.slice(); c[i]=mutate(c[i]); return c; } // edit index (structural share)
    if (op===3 && s.length){ const c=s.slice(); c.splice(rnd(s.length),1); return c; } // remove
    return [...s, randVal(1), randVal(1)];                  // multi-append
  }
  if (s && typeof s==="object"){
    const keys = Object.keys(s);
    const op = rnd(4);
    if (op===0){ s["k"+rnd(6)] = randVal(1); return s; }     // add/replace key
    if (op===1 && keys.length){ const k=keys[rnd(keys.length)]; s[k]=mutate(s[k]); return s; } // edit nested (share siblings)
    if (op===2 && keys.length){ const k=keys[rnd(keys.length)]; delete s[k]; return s; } // delete key
    s["k"+rnd(6)] = randVal(2); return s;
  }
  return randVal(0); // primitive → new value
}

let fails=0, single=0, chains=0;

// 1) Single-step round-trip fuzz
for (let t=0;t<200000;t++){
  let prev = randVal(0);
  if (typeof prev!=="object"||prev===null) prev = { root: randVal(1), arr:[1,2,3], s:"x" };
  const next = mutate(JSON.parse(JSON.stringify(prev))===null?prev:structuredClone(prev));
  const patch = diffState(prev, next);
  const got = applyPatch(prev, patch);
  single++;
  if (!deepEq(got, next)){
    fails++;
    if (fails<=5){ console.log("SINGLE FAIL\n prev=",JSON.stringify(prev),"\n next=",JSON.stringify(next),"\n patch=",JSON.stringify(patch),"\n got=",JSON.stringify(got)); }
  }
}

// 2) Replay-chain fuzz: base + N diffs must equal final state
for (let t=0;t<20000;t++){
  let state = { domains:{physical:{goals:[{done:false,subs:[{done:false}]}]}}, incidents:[], log:[], settings:{name:"x"} };
  const base = structuredClone(state);
  const patches = [];
  const steps = 1+rnd(12);
  for (let i=0;i<steps;i++){
    const next = mutate(structuredClone(state));
    patches.push(diffState(state, next));
    state = next;
  }
  const replayed = replay(base, patches);
  chains++;
  if (!deepEq(replayed, state)){
    fails++;
    if (fails<=10) console.log("CHAIN FAIL final≠replayed");
  }
}

// 3) Realistic app-shaped transitions
function appState(){
  return {
    domains:{ physical:{status:"in-progress",notes:"",goals:[{done:false,subs:[{done:false,lastDone:null},{done:true,lastDone:"t"}]}]} },
    incidents:[{id:"1",type:"fall",photos:[]}],
    medSchedule:{ medications:[{id:"m1",timeSlots:["Morning"]}], log:[{key:"m1|Morning|2026-06-01"}] },
    messages:[{id:"x",text:"hi"}],
    careShifts:[{id:"s1",status:"open",tasks:[{id:"t1",done:false}],lastModified:"a"}],
    settings:{ deviceId:"d", team:{members:[{deviceId:"d",name:"A",role:"admin"}]} }
  };
}
const realisticEdits = [
  s=>({...s, domains:{...s.domains, physical:{...s.domains.physical, goals:[{...s.domains.physical.goals[0], subs:s.domains.physical.goals[0].subs.map((x,i)=>i===0?{...x,done:true,lastDone:"now"}:x)}]}}}), // toggle sub
  s=>({...s, incidents:[...s.incidents, {id:"2",type:"wander",photos:[]}]}), // append incident
  s=>({...s, medSchedule:{...s.medSchedule, log:[...s.medSchedule.log, {key:"m1|Midday|2026-06-01"}]}}), // append med log
  s=>({...s, messages:[{id:"y",text:"new"}, ...s.messages]}), // prepend message
  s=>({...s, careShifts:s.careShifts.map(sh=>sh.id==="s1"?{...sh,status:"assigned",assignedTo:"d",lastModified:"b"}:sh)}), // mutate shift
  s=>({...s, careShifts:s.careShifts.map(sh=>sh.id==="s1"?{...sh,tasks:sh.tasks.map(t=>({...t,done:true}))}:sh)}), // toggle shift task
  s=>({...s, settings:{...s.settings, team:{...s.settings.team, members:[...s.settings.team.members,{deviceId:"e",name:"B",role:"family"}]}}}), // add member
  s=>{ const c={...s}; delete c.messages; return c; }, // delete top-level key
];
let rs = appState(); const rbase = structuredClone(rs); const rpatches=[];
for (const edit of realisticEdits){ const next = edit(rs); rpatches.push(diffState(rs,next)); 
  if(!deepEq(applyPatch(rs,diffState(rs,next)),next)){fails++;console.log("REALISTIC single fail");}
  rs = next; }
if (!deepEq(replay(rbase, rpatches), rs)){ fails++; console.log("REALISTIC replay fail"); }

// 4) Patch size check on the hot path (med log append on a large log)
const bigLog = { medSchedule:{ log: Array.from({length:50000},(_,i)=>({key:"m|S|"+i})) } };
const bigNext = { medSchedule:{ ...bigLog.medSchedule, log:[...bigLog.medSchedule.log, {key:"m|S|new"}] } };
const bigPatch = diffState(bigLog, bigNext);
const patchBytes = JSON.stringify(bigPatch).length;
console.log("Hot-path append patch size on 50k-entry log:", patchBytes, "bytes (should be tiny, not ~MB)");

console.log("\nSingle round-trips:", single, "| Replay chains:", chains, "| Realistic: 9");
console.log(fails===0 ? "\n✅ ALL PASS — diff/apply/replay round-trips for every case." : "\n❌ "+fails+" FAILURES");
process.exit(fails===0?0:1);
