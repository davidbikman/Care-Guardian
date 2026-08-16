// circle-audit-merge-test.mjs — PROOF of the device-keyed audit merge (extracting buildAuditMap/applyAuditMap from src/App.jsx).
// Two devices' hash chains coexist in one backup without clobbering; THIS device's chain restores into the active DB while
// FOREIGN chains are archived and NEVER interleaved (which would break verification); keep-larger; legacy single-block compat.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("decl not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
// stub the IDB-backed restore + component data; extract the real device-keyed map logic
const activeById=new Map();
const stubRestore=async(block)=>{ for(const e of (block.entries||[])) activeById.set(e.id,e); return (block.entries||[]).length; };
const auditIdSrc=lineStarting("const auditDeviceId=");
const buildSrc=lineStarting("const buildAuditMap=");
const applySrc=extractFn("const applyAuditMap=");
const make=new Function("data","restoreAuditBackup", auditIdSrc+"\n"+buildSrc+"\n"+applySrc+"\nreturn {buildAuditMap,applyAuditMap};");

const sha=async s=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")};
const canon=e=>JSON.stringify([e.id,e.seq,e.timestamp,e.action,e.detail,e.phiType,e.userId,e.userName,e.role,e.prevHash||""]);
async function makeChain(dev,n){ const entries=[]; let prev=""; for(let i=1;i<=n;i++){ const e={id:dev+"-"+i,seq:i,timestamp:"2026-01-01",action:"view",detail:"d"+i,phiType:"physical",userId:"u",userName:"U",role:"admin",prevHash:prev}; e.hash=await sha(canon(e)); entries.push(e); prev=e.hash; } return {device:dev,count:n,exportedAt:"t",entries}; }
async function verifyChain(entries){ const ch=entries.filter(e=>typeof e.seq==="number"&&e.hash).sort((a,b)=>a.seq-b.seq); if(!ch.length)return{status:"none"}; for(let i=0;i<ch.length;i++){ const e=ch[i]; if(await sha(canon(e))!==e.hash)return{status:"broken",at:e.seq}; if(i>0&&e.prevHash!==ch[i-1].hash)return{status:"broken",at:e.seq}; if(i>0&&e.seq!==ch[i-1].seq+1)return{status:"broken",at:e.seq}; } return{status:"ok",n:ch.length}; }

(async()=>{
  ok(typeof make==="function","extracted the real buildAuditMap/applyAuditMap from src/App.jsx");
  const chainA=await makeChain("A",5), chainB=await makeChain("B",4);
  ok((await verifyChain(chainA.entries)).status==="ok" && (await verifyChain(chainB.entries)).status==="ok","each device's chain verifies on its own");
  ok((await verifyChain([...chainA.entries,...chainB.entries])).status==="broken","sanity: two chains naively merged into one log BREAK verification (overlapping seq) — this is what we must avoid");

  // device B applies a backup map carrying both A's and B's chains
  const C=make({settings:{deviceId:"B"},_auditArchive:{}}, stubRestore);
  activeById.clear();
  const res=await C.applyAuditMap({settings:{deviceId:"B"},_auditArchive:{}}, {A:chainA,B:chainB});
  ok(res.restored===4,"this device's (B) chain is restored into the active log");
  ok(res.archived===1 && res.data._auditArchive.A===chainA,"the foreign (A) chain is archived for durability, not lost");
  const activeIds=[...activeById.keys()];
  ok(activeIds.length===4 && activeIds.every(id=>id.startsWith("B-")) && !activeIds.some(id=>id.startsWith("A-")),"the active log holds ONLY this device's entries — no foreign interleaving");
  ok((await verifyChain([...activeById.values()])).status==="ok","the active chain still verifies clean");
  ok((await verifyChain(res.data._auditArchive.A.entries)).status==="ok","the archived foreign chain verifies independently");

  // building a backup carries both chains forward (no clobber)
  const C2=make({settings:{deviceId:"B"},_auditArchive:{A:chainA}}, stubRestore);
  const map=C2.buildAuditMap(chainB);
  ok(map.A && map.B,"a backup built on B carries BOTH A's (archived) and B's (own) chains — neither overwrites the other");

  // keep-larger when the same device's chain arrives shorter
  const smallA=await makeChain("A",2);
  const res2=await C.applyAuditMap({settings:{deviceId:"B"},_auditArchive:{A:chainA}}, {A:smallA});
  ok(res2.data._auditArchive.A.count===5,"a shorter copy of an already-archived chain does not shrink it (audit logs only grow)");

  // legacy single-block back-compat
  activeById.clear();
  const legacyForeign={device:"C",count:3,entries:(await makeChain("C",3)).entries};
  const res3=await C.applyAuditMap({settings:{deviceId:"B"},_auditArchive:{}}, legacyForeign);
  ok(res3.archived===1 && res3.data._auditArchive.C,"a legacy single-block backup from another device is archived (back-compatible)");
  const legacyOwn={device:"B",count:4,entries:chainB.entries};
  const res4=await C.applyAuditMap({settings:{deviceId:"B"},_auditArchive:{}}, legacyOwn);
  ok(res4.restored===4,"a legacy single-block backup from THIS device restores into the active log (back-compatible)");

  console.log(f===0?"\n✅ DEVICE-KEYED AUDIT MERGE PROVEN — chains coexist; this device restores, foreign archives; no interleaving; legacy compatible":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
