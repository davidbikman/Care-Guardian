// Binary-partitioning core: ref collection + package/ingest round-trip. Mock store + identity "crypto".
const BLOBREF=/^blobref:([a-z0-9]+)$/;
function collectBlobRefs(obj, out){ out=out||new Set();
  if(typeof obj==="string"){ const m=obj.match(BLOBREF); if(m)out.add(m[1]); }
  else if(Array.isArray(obj)){ for(const v of obj)collectBlobRefs(v,out); }
  else if(obj&&typeof obj==="object"){ for(const k in obj)collectBlobRefs(obj[k],out); }
  return out;
}
function makeStore(){ const m=new Map(); return {
  put:(id,enc)=>m.set(id,enc), get:(id)=>{ if(!m.has(id))throw new Error("missing "+id); return m.get(id); },
  keys:()=>[...m.keys()], has:id=>m.has(id), _m:m }; }
let SEQ=0; const newId=()=>"b"+(++SEQ);
async function packageWithBlobs(data, store){ const refs=collectBlobRefs(data); const _blobs={}; for(const id of refs){ _blobs[id]=store.get(id); } return {...data,_blobs}; }
async function ingestBlobs(payload, store){ if(payload._blobs){ for(const id in payload._blobs){ store.put(id, payload._blobs[id]); } } const c={...payload}; delete c._blobs; return c; }

let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};
(async()=>{
  const data={ incidents:[{id:1,photos:["blobref:b1","data:image/png;base64,LEGACY","blobref:b2"]}],
               selfReports:[{id:2,photos:["blobref:b3"],audioData:"blobref:b4"},{id:3,audioData:"data:audio/webm;base64,LEG"}],
               note:"not a ref", settings:{x:"blobref:b5"} };
  const refs=collectBlobRefs(data);
  ok(refs.size===5&&["b1","b2","b3","b4","b5"].every(x=>refs.has(x)),"collectBlobRefs finds all refs anywhere (got "+[...refs].join(",")+")");
  ok(!refs.has("LEGACY")&&!refs.has("LEG"),"inline data: URLs are NOT treated as refs (stay inline)");

  const src=makeStore(); ["b1","b2","b3","b4","b5"].forEach(id=>src.put(id,"CIPHER("+id+")"));
  const pkg=await packageWithBlobs(data, src);
  ok(Object.keys(pkg._blobs).length===5,"package inlines all 5 referenced blobs");
  const wire=JSON.parse(JSON.stringify(pkg));
  const dst=makeStore();
  const clean=await ingestBlobs(wire, dst);
  ok(clean._blobs===undefined,"ingest strips _blobs from the restored data");
  ok(["b1","b2","b3","b4","b5"].every(id=>dst.has(id)&&dst.get(id)==="CIPHER("+id+")"),"all blobs restored into destination store intact");
  const restoredRefs=collectBlobRefs(clean);
  ok([...restoredRefs].every(id=>dst.has(id)),"every ref in restored data resolves to a stored blob (no broken photos)");

  const src2=makeStore(); ["b1","b2","b3","b4"].forEach(id=>src2.put(id,"C"+id));
  let missing=false; try{ await packageWithBlobs(data,src2); }catch{ missing=true; }
  ok(missing,"packaging surfaces a missing blob rather than silently dropping it");

  console.log(fails===0?"\n✅ ALL BLOB-PARTITION CORE TESTS PASS":"\n❌ "+fails+" FAILURES"); process.exit(fails?1:0);
})();
