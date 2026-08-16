// End-to-end with REAL AES-GCM: data:URL → putBlob(encrypt+store) → package → JSON wire → ingest(new key) → getBlob(decrypt)
const b64=u=>Buffer.from(u).toString("base64"); const ub64=s=>new Uint8Array(Buffer.from(s,"base64"));
async function genDEK(){ return crypto.getRandomValues(new Uint8Array(32)); }
async function encryptWithDEK(data,dek){ const iv=crypto.getRandomValues(new Uint8Array(12)); const key=await crypto.subtle.importKey("raw",dek,{name:"AES-GCM"},false,["encrypt"]); const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(data)))); const o=new Uint8Array(12+ct.length); o.set(iv,0); o.set(ct,12); return b64(o); }
async function decryptWithDEK(blob,dek){ const buf=ub64(blob); const key=await crypto.subtle.importKey("raw",dek,{name:"AES-GCM"},false,["decrypt"]); const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(0,12)},key,buf.slice(12)); return JSON.parse(new TextDecoder().decode(pt)); }
const BLOBREF_RE=/^blobref:([a-z0-9]+)$/; let SEQ=0; const newBlobId=()=>"b"+(++SEQ);
function makeStore(){ const m=new Map(); return {put:(id,e)=>m.set(id,e),get:(id)=>m.has(id)?m.get(id):null,_m:m}; }
async function putBlob(store,dataUrl,dek,id){ id=id||newBlobId(); store.put(id, await encryptWithDEK(dataUrl,dek)); return id; }
async function getBlob(store,id,dek){ const e=store.get(id); return e?decryptWithDEK(e,dek):null; }
function collectBlobRefs(o,out){ out=out||new Set(); if(typeof o==="string"){const m=o.match(BLOBREF_RE);if(m)out.add(m[1]);} else if(Array.isArray(o)){for(const v of o)collectBlobRefs(v,out);} else if(o&&typeof o==="object"){for(const k in o)collectBlobRefs(o[k],out);} return out; }
async function packageWithBlobs(store,data,dek){ const refs=collectBlobRefs(data); const _blobs={}; for(const id of refs){const v=await getBlob(store,id,dek); if(v!=null)_blobs[id]=v;} return {...data,_blobs}; }
async function ingestBlobs(store,payload,dek){ if(payload._blobs){for(const id in payload._blobs){await putBlob(store,payload._blobs[id],dek,id);}} const c={...payload}; delete c._blobs; return c; }
async function externalize(store,arr,dek){ const out=[]; for(const s of arr){ out.push(s.startsWith("data:")?"blobref:"+await putBlob(store,s,dek):s);} return out; }

let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};
(async()=>{
  const PHOTO="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC";
  const AUDIO="data:audio/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUFa";
  const A=makeStore(); const dekA=await genDEK();
  const sr={id:1,photos:await externalize(A,[PHOTO],dekA),audioData:(await externalize(A,[AUDIO],dekA))[0]};
  const data={selfReports:[sr],incidents:[]};
  ok(sr.photos[0].startsWith("blobref:")&&sr.audioData.startsWith("blobref:"),"attach: media replaced with refs in the vault (vault JSON stays tiny)");
  ok(!JSON.stringify(data).includes("base64"),"vault JSON carries NO base64 — only refs");

  const pkg=await packageWithBlobs(A,data,dekA);
  const wire=JSON.parse(JSON.stringify({encrypted:false,payload:pkg})).payload;
  const B=makeStore(); const dekB=await genDEK();
  const restored=await ingestBlobs(B,wire,dekB);
  const got=await getBlob(B, restored.selfReports[0].photos[0].match(BLOBREF_RE)[1], dekB);
  const gotAudio=await getBlob(B, restored.selfReports[0].audioData.match(BLOBREF_RE)[1], dekB);
  ok(got===PHOTO,"photo survives export→import under a DIFFERENT vault key, byte-identical");
  ok(gotAudio===AUDIO,"voice note survives export→import, byte-identical");
  let crossFail=false; try{ const x=await getBlob(B, restored.selfReports[0].photos[0].match(BLOBREF_RE)[1], dekA); if(x!==PHOTO) crossFail=true; }catch{crossFail=true}
  ok(crossFail,"imported blob is re-encrypted under the importer's key (A's key cannot read B's store)");

  console.log(fails===0?"\n✅ ALL BLOB ROUND-TRIP TESTS PASS":"\n❌ "+fails+" FAILURES"); process.exit(fails?1:0);
})();
