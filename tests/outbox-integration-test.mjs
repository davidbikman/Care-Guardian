// outbox-integration-test.mjs — PROOF that the outbox is wired into the REAL sync path, not just available.
// The defect this closes: cloudStorageSync used to call prov.upload() directly, so a failed upload threw, the
// user saw an error, and the change never reached storage — silent data loss on every provider. Now the object is
// staged locally first and drained through the outbox, so failure means "queued", not "gone".
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
function cval(n){const m=new RegExp("const\\s+"+n+"\\s*=\\s*").exec(src);if(!m)throw new Error("no const "+n);
  const st=m.index+m[0].length,ch=src[st]; let v;
  if(ch==="[") v=bal(src,st,"[","]"); else if(ch==="{") v=bal(src,st,"{","}");
  else if(ch==="(") { const a=src.indexOf("=>",st); let k=a+2; while(/\s/.test(src[k]))k++;
    v = src[k]==="{" ? src.slice(st,k)+bal(src,k,"{","}") : src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,""); }
  else v=src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,"");
  return "const "+n+" = "+v+";"}
const M=new Function([cval("STORAGE_OUTBOX_MAX"),cval("STORAGE_CAPS"),cval("storageCaps"),cval("STORAGE_STALE_DAYS"),
  extractFn("function outboxEnqueue("),extractFn("function outboxOrder("),extractFn("async function outboxDrain("),
  extractFn("function storageStaleness(")].join("\n")+
  "\nreturn {outboxEnqueue,outboxDrain,storageStaleness,storageCaps};")();

// ── the sync path must not bypass the queue ──
const syncStart=src.indexOf("const cloudStorageSync="); const syncBody=src.slice(syncStart,src.indexOf("\n  const ",syncStart+40));
ok(syncStart>0,"found cloudStorageSync in src/App.jsx");
ok(/stageOutbox\(/.test(syncBody),"the sync path STAGES the upload rather than pushing it straight at the provider");
ok(/drainOutbox\(/.test(syncBody),"…and drains through the outbox");
ok(!/await prov\.upload\(/.test(syncBody),"no direct prov.upload() call remains in the sync path — the old data-loss route is gone");
ok(/drain\.complete/.test(syncBody),"the result of the drain decides what the user is told");
// Phase 4 moved the wording into the classifier table (STORAGE_FAIL_UI), which is the better home: one place,
// one message per failure class. The property is unchanged — assert it where it now lives.
ok(/recordStorageFailure\(/.test(syncBody),"a failed upload is classified rather than printed raw");
ok(/QUOTA/.test(syncBody),"a full account is distinguished from other upload failures");
ok(/still recording everything on this device/.test(src),"…and the quota message tells the user recording continues locally");

// ── the staging helper ──
const stage=src.slice(src.indexOf("const stageOutbox="),src.indexOf("const outboxPending="));
ok(/outboxEnqueue\(p\._outbox\|\|\[\]/.test(stage),"staging appends to a queue that lives in persisted state");
ok(/outboxBodiesRef/.test(stage),"…while the encrypted body is held in a ref, not written into the vault");
ok(/LOCAL_MISSING/.test(stage),"a body missing after a restart is handled — sync regenerates it rather than stalling");
ok(/lastCloudOk/.test(stage),"a successful upload records when storage was last actually written");
ok(/hipaaAudit\(/.test(stage),"every upload is written to the audit trail — egress is exactly what it is for");

// ── end-to-end behaviour, using the real queue functions ──
(async()=>{
  const bodies=new Map(); let queue=[];
  const stageFn=(key,body)=>{ bodies.set(key,body); queue=M.outboxEnqueue(queue,{key,kind:"state"},new Date().toISOString()); };
  const readBody=async(e)=>{ const b=bodies.get(e.key); if(b===undefined) throw new Error("LOCAL_MISSING"); return b; };

  // day 1: the provider is down (expired Google token, say)
  stageFn("care-guardian-sync.json","cipher-v1");
  let r=await M.outboxDrain({async put(){ const e=new Error("NO_TOKEN"); throw e; }},queue,readBody);
  queue=r.outbox;
  ok(!r.complete&&queue.length===1,"an upload that fails leaves the change QUEUED — under the old code it was lost");

  // the user keeps working; the same object is re-staged
  stageFn("care-guardian-sync.json","cipher-v2");
  ok(queue.length===1,"further edits supersede the queued object rather than piling up");

  // day 2: reconnected
  const store=new Map();
  r=await M.outboxDrain({async put(k,t){ store.set(k,t); }},queue,readBody);
  queue=r.outbox;
  ok(r.complete&&queue.length===0,"once storage is reachable the queue drains");
  ok(store.get("care-guardian-sync.json")==="cipher-v2","the LATEST version uploads, not the stale one that first failed");

  // a body lost to a restart doesn't jam the queue
  bodies.clear();
  queue=M.outboxEnqueue([], {key:"gone.json",kind:"state"}, new Date().toISOString());
  r=await M.outboxDrain({async put(){}},queue,readBody);
  ok(r.complete&&r.outbox.length===0,"a queued object whose body didn't survive a restart is dropped, not retried forever");

  // ── the user can see it ──
  ok(/storage-state/.test(src),"the connected-storage panel shows sync state");
  ok(/waiting to upload/.test(src),"pending uploads are surfaced, not silently queued");
  ok(/Nothing is lost/.test(src),"…with reassurance that queued work is safe on the device");
  ok(/storage-dot-stale/.test(src)&&/storage-dot-pending/.test(src),"state is colour-coded (fresh / ageing / stale / pending)");
  const staleCopy=src.slice(src.indexOf("{st.stale&&"),src.indexOf("{st.stale&&")+600);
  ok(/caps\.auth==="session"/.test(staleCopy),"the staleness message differs for session-scoped storage — for Google it may just mean 'you haven't opened the app'");
  ok(M.storageStaleness(new Date(Date.now()-8*86400000).toISOString()).stale===true,"eight days without a successful write reads as stale");

  console.log(f===0?"\n✅ OUTBOX INTEGRATED — the real sync path stages and drains; a failed upload queues instead of losing work; the latest version wins; state is visible to the user":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
