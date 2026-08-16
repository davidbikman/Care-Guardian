// ── PROOF: audit-log survives the encrypted backup round-trip with its chain intact (AUDIT-DURABILITY §10 Layer 0) ──
// Mirrors the app's exact canonical form + chain checks + encryptData/decryptData. Proves: export→encrypt→wipe→
// decrypt→restore reproduces every entry with seq/hash intact and the chain verifies; and a tampered restored
// entry (or corrupt ciphertext) is detected.
const subtle=globalThis.crypto.subtle; const te=new TextEncoder(),td=new TextDecoder();
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const KDF_ITER=600000;

// ---- exact replicas of the app's audit hash-chain primitives ----
async function sha256Hex(s){const b=await subtle.digest("SHA-256",te.encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}
const canonicalAuditEntry=(e)=>JSON.stringify([e.id,e.seq,e.timestamp,e.action,e.detail,e.phiType,e.userId,e.userName,e.role,e.prevHash||""]);
const computeEntryHash=(e)=>sha256Hex(canonicalAuditEntry(e));
async function verifyChain(entries){ const chained=entries.filter(e=>typeof e.seq==="number"&&e.hash).sort((a,b)=>a.seq-b.seq); if(!chained.length)return{status:"none"}; let brokenAtSeq=null;
  for(let i=0;i<chained.length;i++){ const e=chained[i]; if(await computeEntryHash(e)!==e.hash){brokenAtSeq=e.seq;break} if(i>0&&e.prevHash!==chained[i-1].hash){brokenAtSeq=e.seq;break} if(i>0&&e.seq!==chained[i-1].seq+1){brokenAtSeq=e.seq;break} }
  return {status:brokenAtSeq?"broken":"ok",brokenAtSeq,chained:chained.length}; }

// ---- exact replicas of the app's encryptData/decryptData ----
async function encryptData(data,password){ const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const km=await subtle.importKey("raw",te.encode(password),"PBKDF2",false,["deriveKey"]); const key=await subtle.deriveKey({name:"PBKDF2",salt,iterations:KDF_ITER,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt"]);
  const ct=await subtle.encrypt({name:"AES-GCM",iv},key,te.encode(JSON.stringify(data))); const buf=new Uint8Array(28+ct.byteLength); buf.set(salt,0); buf.set(iv,16); buf.set(new Uint8Array(ct),28); return Buffer.from(buf).toString("base64"); }
async function decryptData(b64,password){ const buf=Uint8Array.from(Buffer.from(b64,"base64")); const km=await subtle.importKey("raw",te.encode(password),"PBKDF2",false,["deriveKey"]);
  const key=await subtle.deriveKey({name:"PBKDF2",salt:buf.slice(0,16),iterations:KDF_ITER,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["decrypt"]); const pt=await subtle.decrypt({name:"AES-GCM",iv:buf.slice(16,28)},key,buf.slice(28)); return JSON.parse(td.decode(pt)); }

async function mkChain(n){ const out=[]; let prevHash=""; for(let i=0;i<n;i++){ const e={id:"a"+i,seq:i+1,timestamp:new Date(Date.now()+i*1000).toISOString(),action:"view",detail:"entry-"+i+(i===2?" SENTINEL_PHI":""),phiType:"meds",userId:"u1",userName:"Care",role:"family",prevHash}; e.hash=await computeEntryHash(e); prevHash=e.hash; out.push(e); } return out; }

(async()=>{
  const PW="backup-pass-123";
  const entries=await mkChain(8);
  ok((await verifyChain(entries)).status==="ok","baseline chain verifies");

  // EXPORT: audit block rides inside the vault payload, encrypted under the backup passcode
  const vault={settings:{deviceId:"dev-A"},contacts:[], _audit:{device:"dev-A",exportedAt:new Date().toISOString(),count:entries.length,entries}};
  const b64=await encryptData(vault,PW);
  ok(!Buffer.from(b64,"base64").toString("latin1").includes("SENTINEL_PHI"),"encrypted backup leaks no plaintext audit detail");

  // WIPE (simulate device loss) then RESTORE
  let restoredStore=new Map();
  const restored=await decryptData(b64,PW);
  ok(restored._audit&&Array.isArray(restored._audit.entries),"restore yields the audit block");
  for(const e of restored._audit.entries){ restoredStore.set(e.id,e); } // writeAuditEntry is keyed by id
  const back=[...restoredStore.values()];
  ok(back.length===8,"all 8 entries restored");
  ok(JSON.stringify(back.sort((a,b)=>a.seq-b.seq))===JSON.stringify(entries),"restored entries are byte-identical (seq/hash/detail intact)");
  ok((await verifyChain(back)).status==="ok","restored chain verifies end-to-end");

  // IDEMPOTENT re-restore (re-importing the same backup overwrites by id, no duplication)
  for(const e of restored._audit.entries){ restoredStore.set(e.id,e); }
  ok([...restoredStore.values()].length===8,"re-restoring the same backup is idempotent (keyed by id)");

  // TAMPER: alter a restored entry's detail without fixing its hash → detected
  const tampered=back.map(e=>e.seq===4?{...e,detail:"ALTERED"}:e);
  const vt=await verifyChain(tampered);
  ok(vt.status==="broken"&&vt.brokenAtSeq===4,"a tampered restored entry is detected at its seq");

  // CORRUPT ciphertext → decrypt fails closed
  let threw=false; const bad=b64.slice(0,-8)+"AAAAAAAA"; try{await decryptData(bad,PW)}catch{threw=true}
  ok(threw,"a corrupted backup fails closed (AES-GCM auth)");

  // WRONG passcode → fails closed
  threw=false; try{await decryptData(b64,"wrong")}catch{threw=true} ok(threw,"a wrong passcode fails closed");

  console.log(f===0?"\n✅ AUDIT-BACKUP PROOF PASSES — the 6-year log survives backup/restore with chain intact":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
