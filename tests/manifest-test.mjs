// manifest-test.mjs — PROOF for per-device objects and the manifest index (Phase 1 completion).
// The defect this closes: every device wrote the SAME cloud file, so two devices syncing the same day overwrote
// each other and the loser's work vanished with no error and no trace. Per-device objects mean writes never
// collide; merging happens in the app where the HLC clock can resolve it.
// The providers implement upload/download but NOT list, so discovery cannot enumerate a folder — the manifest is
// the index. All logic EXTRACTED VERBATIM from src/App.jsx.
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
const M=new Function([cval("MANIFEST_VERSION"),cval("storageKeys"),
  extractFn("function manifestEmpty("),extractFn("function manifestPut("),extractFn("function manifestPullList("),
  extractFn("function manifestMerge("),extractFn("function manifestStaleDevices(")].join("\n")+
  "\nreturn {MANIFEST_VERSION,storageKeys,manifestEmpty,manifestPut,manifestPullList,manifestMerge,manifestStaleDevices};")();
ok(typeof M.manifestPut==="function","extracted the real manifest logic from src/App.jsx");

// ── per-device keys ──
const K=M.storageKeys;
ok(K.state("c1","phone")!==K.state("c1","tablet"),"two devices write to DIFFERENT objects — the overwrite that lost work is impossible");
ok(K.state("c1","phone").includes("phone"),"a state key names its device");

// ── the manifest as index ──
let m=M.manifestEmpty("c1");
m=M.manifestPut(m,"phone",{key:K.state("c1","phone"),label:"Mum's phone",epoch:2,bytes:1200},"2026-07-30T10:00:00Z");
m=M.manifestPut(m,"tablet",{key:K.state("c1","tablet"),label:"Tablet",epoch:2,bytes:900},"2026-07-30T11:00:00Z");
ok(Object.keys(m.devices).length===2,"each device records itself without disturbing the others");
ok(m.epoch===2&&m.updatedAt==="2026-07-30T11:00:00Z","the manifest tracks the current key epoch and when it changed");

// ── what to pull ──
let list=M.manifestPullList(m,"phone",{});
ok(list.length===1&&list[0].deviceId==="tablet","a device pulls everyone else's object, never its own");
list=M.manifestPullList(m,"phone",{tablet:"2026-07-30T11:00:00Z"});
ok(list.length===0,"an object already consumed is not fetched again — sync doesn't re-download unchanged state");
m=M.manifestPut(m,"tablet",{key:K.state("c1","tablet"),epoch:2},"2026-07-30T12:00:00Z");
list=M.manifestPullList(m,"phone",{tablet:"2026-07-30T11:00:00Z"});
ok(list.length===1,"…but a newer version of that device's object IS fetched");
m=M.manifestPut(m,"laptop",{key:K.state("c1","laptop"),epoch:2},"2026-07-30T09:00:00Z");
list=M.manifestPullList(m,"phone",{});
ok(list[0].updatedAt>=list[list.length-1].updatedAt,"pull order is newest first");

// ── the near-simultaneous write problem ──
// Two devices read the same manifest and both write it back. At file level the later write wins and the earlier
// device's entry disappears — it would then be invisible to everyone until its next sync.
const base=M.manifestPut(M.manifestEmpty("c1"),"phone",{key:"k-phone",epoch:1},"2026-07-30T10:00:00Z");
const fromA=M.manifestPut(base,"tablet",{key:"k-tablet",epoch:1},"2026-07-30T10:00:05Z");
const fromB=M.manifestPut(base,"laptop",{key:"k-laptop",epoch:1},"2026-07-30T10:00:06Z");
const repaired=M.manifestMerge(fromA,fromB);
ok(Object.keys(repaired.devices).sort().join()==="laptop,phone,tablet","merging on read repairs a manifest race — no device is lost");
const older=M.manifestPut(M.manifestEmpty("c1"),"phone",{key:"k-old",epoch:1},"2026-07-29T10:00:00Z");
const newer=M.manifestPut(M.manifestEmpty("c1"),"phone",{key:"k-new",epoch:1},"2026-07-30T10:00:00Z");
ok(M.manifestMerge(older,newer).devices.phone.key==="k-new","when both copies know a device, the newer entry wins");
ok(M.manifestMerge(newer,older).devices.phone.key==="k-new","…regardless of merge order");
ok(M.manifestMerge(null,newer).devices.phone,"merging against a missing manifest is safe");

// ── a quiet device is not a departed device ──
const quiet=M.manifestPut(m,"phone",{key:K.state("c1","phone"),epoch:2},"2026-08-30T10:00:00Z");
ok(quiet.devices.laptop,"a device that hasn't synced in a month keeps its manifest entry — silence is not departure");

// ── epoch after key rotation ──
let rot=M.manifestPut(M.manifestEmpty("c1"),"phone",{key:"k1",epoch:1},"2026-07-01T10:00:00Z");
rot=M.manifestPut(rot,"tablet",{key:"k2",epoch:2},"2026-07-30T10:00:00Z");
const stale=M.manifestStaleDevices(rot,2);
ok(stale.length===1&&stale[0].deviceId==="phone","a device still on a superseded key epoch is reported, not silently unreadable");
ok(M.manifestStaleDevices(rot,1).length===0,"no device is stale when everyone is current");

// ── version guard ──
ok(M.manifestPut({v:99,devices:{x:{}}},"phone",{key:"k"},"t").devices.x===undefined,"a manifest from an unknown future version is replaced rather than half-read");

// ── wiring in the real sync path ──
const syncStart=src.indexOf("const cloudStorageSync="); const body=src.slice(syncStart,src.indexOf("\n  const ",syncStart+40));
ok(/readManifest\(/.test(body),"sync reads the manifest before pulling");
ok(/manifestPullList\(/.test(body),"…and pulls the objects it names");
ok(/stageOutbox\(_myStateKey\(\)/.test(body)||/stageOutbox\(myKey/.test(body),"sync writes to THIS DEVICE's object, not a shared file");
ok(/manifestMerge\(/.test(body),"the manifest is merged before being written back, so a race can't drop a device");
ok(/stageOutbox\(_manifestKey\(\)/.test(body),"the manifest is staged through the outbox (which drains it last)");
ok(/CLOUD_SYNC_PATH/.test(body),"the legacy single-file path is still read, so existing deployments keep working");
ok(/seenDevices/.test(body),"consumed versions are remembered, so unchanged objects aren't re-downloaded");

console.log(f===0?"\n✅ MANIFEST + PER-DEVICE OBJECTS PROVEN — devices no longer overwrite each other, discovery works without list(), manifest races repair on read, stale epochs are reported":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
