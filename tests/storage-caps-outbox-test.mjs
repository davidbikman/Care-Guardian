// storage-caps-outbox-test.mjs — PROOF for the architecture change that makes Google Drive first-class.
// Google in a browser cannot hold a refresh token (Web-application clients need a client_secret at the token
// endpoint; the GIS token model issues no refresh token), so Drive access is SESSION-SCOPED. Rather than special-
// case it, provider availability is treated as intermittent for everyone and a durable OUTBOX absorbs the gaps.
// Everything below is EXTRACTED VERBATIM from src/App.jsx.
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
const M=new Function([cval("STORAGE_CAPS"),cval("storageCaps"),cval("STORAGE_OUTBOX_MAX"),cval("storageKeys"),
  extractFn("function createMemoryStorage("),extractFn("function outboxEnqueue("),
  extractFn("function outboxOrder("),extractFn("async function outboxDrain(")].join("\n")+
  "\nreturn {STORAGE_CAPS,storageCaps,STORAGE_OUTBOX_MAX,storageKeys,createMemoryStorage,outboxEnqueue,outboxOrder,outboxDrain};")();
ok(typeof M.outboxDrain==="function","extracted the real capability model and outbox from src/App.jsx");

(async()=>{
  // ── capabilities are declared, not assumed ──
  ok(M.storageCaps("dropbox").auth==="persistent"&&M.storageCaps("dropbox").background===true,"Dropbox is persistent and can sync in the background");
  ok(M.storageCaps("onedrive").auth==="persistent","OneDrive is persistent");
  ok(M.storageCaps("googledrive").auth==="session","Google Drive is SESSION-scoped — the architectural fact everything else follows from");
  ok(M.storageCaps("googledrive").background===false,"…so it must not be promised as background sync");
  ok(/reconnects with one tap/.test(M.storageCaps("googledrive").note||""),"Google's limitation is explained to the user in plain language, not hidden");
  ok(M.storageCaps("wat").auth==="session","an unknown provider degrades to the CAUTIOUS assumption (session), never the optimistic one");

  // ── the outbox: dedupe, order, bound ──
  let q=[];
  q=M.outboxEnqueue(q,{key:"a.enc",kind:"state"},"2026-07-30T10:00:00Z");
  q=M.outboxEnqueue(q,{key:"a.enc",kind:"state"},"2026-07-30T10:05:00Z");
  ok(q.length===1,"queueing the same object twice supersedes rather than accumulates — each object is a full snapshot");
  ok(q[0].queuedAt==="2026-07-30T10:05:00Z","the newer queue entry wins");
  q=M.outboxEnqueue(q,{key:"m.enc",kind:"manifest"},"2026-07-30T10:01:00Z");
  q=M.outboxEnqueue(q,{key:"b.enc",kind:"state"},"2026-07-30T10:02:00Z");
  const ordered=M.outboxOrder(q);
  ok(ordered[ordered.length-1].kind==="manifest","the manifest drains LAST, so it never points at objects not yet uploaded");
  let big=[]; for(let i=0;i<600;i++) big=M.outboxEnqueue(big,{key:"k"+i+".enc",kind:"state"},"2026-07-30T10:00:00Z");
  ok(big.length===M.STORAGE_OUTBOX_MAX,"the queue is bounded ("+big.length+") — a busy day can't grow it without limit");

  // ── draining ──
  const body=async(e)=>"cipher-for-"+e.key;
  const S=M.createMemoryStorage({quotaBytes:10000});
  let r=await M.outboxDrain(S,q,body);
  ok(r.complete&&r.outbox.length===0,"a successful drain empties the queue");
  ok(r.uploaded.length===3&&await S.get("a.enc")==="cipher-for-a.enc","every queued object reached the provider");

  // ── failure must retain, not discard ──
  const down=M.createMemoryStorage({failWith:"NETWORK_DOWN"});
  let q2=M.outboxEnqueue([],{key:"x.enc",kind:"state"},"t");
  r=await M.outboxDrain(down,q2,body);
  ok(r.outbox.length===1&&!r.complete,"an upload failure KEEPS the entry queued — a queue that drops on error is not a queue");
  ok(r.outbox[0].tries===1&&/NETWORK_DOWN/.test(r.outbox[0].lastError||""),"the attempt is counted and the reason recorded");
  for(let i=0;i<5;i++) r=await M.outboxDrain(down,r.outbox,body);
  ok(r.outbox.length===0,"an entry that keeps failing is eventually abandoned rather than retried forever");

  // ── quota stops the run rather than hammering ──
  const tiny=M.createMemoryStorage({quotaBytes:20});
  let q3=[]; for(const k of ["p.enc","q.enc","r.enc"]) q3=M.outboxEnqueue(q3,{key:k,kind:"state"},"t");
  r=await M.outboxDrain(tiny,q3,async()=>"x".repeat(15));
  ok(r.stopped==="QUOTA","hitting quota stops the drain with a distinguishable reason");
  ok(r.outbox.length>0,"…and the unsent work stays queued for after the user frees space");

  // ── an object that vanished locally is dropped, not retried forever ──
  let q4=M.outboxEnqueue([],{key:"gone.enc",kind:"blob"},"t");
  r=await M.outboxDrain(S,q4,async()=>{throw new Error("LOCAL_MISSING")});
  ok(r.outbox.length===0&&r.complete,"a queued object whose local source is gone is dropped rather than blocking the queue");

  // ── session-scoped providers still work: drain resumes across "sessions" ──
  const gdrive=M.createMemoryStorage({});
  let q5=M.outboxEnqueue([],{key:"s1.enc",kind:"state"},"t");
  const offline=M.createMemoryStorage({failWith:"NO_TOKEN"});     // app reopened, Google token gone
  let r1=await M.outboxDrain(offline,q5,body);
  ok(r1.outbox.length===1,"with no token the work waits instead of being lost");
  const r2=await M.outboxDrain(gdrive,r1.outbox,body);            // user taps reconnect
  ok(r2.complete&&await gdrive.get("s1.enc")==="cipher-for-s1.enc","after a one-tap reconnect the queued work uploads — session-scoped storage loses nothing");

  console.log(f===0?"\n✅ INTERMITTENT-STORAGE ARCHITECTURE PROVEN — session-scoped providers are first-class; the outbox dedupes, orders manifest last, bounds itself, retains on failure and resumes across sessions":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
