// Mark-and-sweep blob GC: never delete a referenced blob; purge unreferenced orphans; respect grace window.
const BLOBREF_RE=/^blobref:([a-z0-9]+)$/;
function collectBlobRefs(o,out){ out=out||new Set(); if(typeof o==="string"){const m=o.match(BLOBREF_RE);if(m)out.add(m[1]);} else if(Array.isArray(o)){for(const v of o)collectBlobRefs(v,out);} else if(o&&typeof o==="object"){for(const k in o)collectBlobRefs(o[k],out);} return out; }
function makeStore(){ const m=new Map(); return {keys:()=>[...m.keys()],del:id=>m.delete(id),put:id=>m.set(id,"X"),has:id=>m.has(id),_m:m}; }
const GC_GRACE_MS=120000;
function gcBlobs(store, recent, state, now){
  const refs=collectBlobRefs(state); const deleted=[];
  for(const id of store.keys()){
    if(refs.has(id))continue;
    const created=recent.get(id);
    if(created && (now-created)<GC_GRACE_MS)continue;
    store.del(id); deleted.push(id);
  }
  return deleted;
}
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};

const store=makeStore(); ["b1","b2","b3","b4","b5","b6"].forEach(id=>store.put(id));
const state={ incidents:[{id:1,photos:["blobref:b1","blobref:b2"]}], selfReports:[{id:2,audioData:"blobref:b3"}], note:"x" };
const recent=new Map([["b5",Date.now()-1000]]);
const now=Date.now();
const deleted=gcBlobs(store, recent, state, now);

ok(store.has("b1")&&store.has("b2")&&store.has("b3"),"referenced blobs are NEVER deleted");
ok(!store.has("b4")&&!store.has("b6"),"old orphans (b4,b6) are purged");
ok(store.has("b5"),"a just-attached orphan (b5, within grace) is preserved (race guard)");
ok(deleted.sort().join(",")==="b4,b6","exactly the old orphans were deleted (got "+deleted.sort().join(",")+")");

const later=now+GC_GRACE_MS+1; const d2=gcBlobs(store, recent, state, later);
ok(!store.has("b5")&&d2.join(",")==="b5","once past grace, the still-orphaned blob is collected");

const store2=makeStore(); store2.put("deep1"); store2.put("orphan1");
const weird={ settings:{ nested:{ stuff:[{x:"blobref:deep1"}] } } };
const d3=gcBlobs(store2, new Map(), weird, Date.now());
ok(store2.has("deep1")&&!store2.has("orphan1"),"deeply-nested ref protects its blob; unrelated orphan removed");

console.log(fails===0?"\n✅ ALL GC TESTS PASS":"\n❌ "+fails+" FAILURES"); process.exit(fails?1:0);
