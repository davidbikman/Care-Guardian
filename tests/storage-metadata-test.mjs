// storage-metadata-test.mjs — PROOF for Phase 5: what a storage provider can infer WITHOUT decrypting anything.
// The provider holds ciphertext it cannot read. It can still see object names, sizes, counts and modification
// times — and the previous layout handed it the vocabulary to interpret all of it: "audit-" revealed that a HIPAA
// audit trail exists, "archive/2026-07/" revealed which months had activity, and device ids in the path revealed
// how many devices a family has and when each one syncs. All logic EXTRACTED VERBATIM from src/App.jsx.
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
if(!globalThis.crypto) globalThis.crypto=webcrypto;
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
const M=new Function([cval("b64enc"),cval("b64dec"),cval("STORAGE_NAME_INFO"),cval("STORAGE_MANIFEST_NAME"),
  "let _objNameKey=null,_objNameKeyFor=\"\";",
  extractFn("async function storageNameKey("),extractFn("async function storageObjName("),
  cval("storageKeys"),cval("storageKeysOpaque"),
  extractFn("function storagePadTo("),extractFn("function storagePad("),cval("storageUnpad")].join("\n")+
  "\nreturn {storageObjName,storageKeys,storageKeysOpaque,storagePadTo,storagePad,storageUnpad,STORAGE_MANIFEST_NAME};")();
ok(typeof M.storageObjName==="function","extracted the real naming and padding logic from src/App.jsx");

const KEY = Buffer.from(new Uint8Array(32).fill(7)).toString("base64");
const KEY2= Buffer.from(new Uint8Array(32).fill(9)).toString("base64");

(async()=>{
  // ── names must be meaningless ──
  const stateK=await M.storageKeysOpaque.state(KEY,"circle-abc","phone-123");
  const auditK=await M.storageKeysOpaque.audit(KEY,"circle-abc","phone-123","2026-07");
  const blobK =await M.storageKeysOpaque.blob(KEY,"blob-xyz");
  const all=[stateK,auditK,blobK];
  ok(all.every(k=>!/audit|state|blob|circle-abc|phone-123|2026-07|rotation|archive/.test(k)),"no object name contains the words state, audit, blob, a circle id, a device id or a date");
  ok(!/audit/i.test(auditK),"the audit object doesn't announce that a HIPAA audit trail exists");
  ok(!/2026|07/.test(auditK),"…and doesn't reveal WHICH MONTHS had activity");
  ok(all.every(k=>k.startsWith("cg/")&&k.endsWith(".bin")),"everything lands in one flat folder with one extension — the directory tree itself disclosed the structure");
  ok(new Set(all).size===3,"different objects still get different names");

  // ── stable, because the manifest and re-export depend on it ──
  ok(await M.storageKeysOpaque.state(KEY,"circle-abc","phone-123")===stateK,"the same object always derives the same name — re-syncing overwrites rather than duplicating");
  ok(await M.storageKeysOpaque.state(KEY,"circle-abc","tablet-9")!==stateK,"two devices still derive different names");
  ok(await M.storageKeysOpaque.state(KEY2,"circle-abc","phone-123")!==stateK,"a different circle key derives different names — one family's layout tells you nothing about another's");
  ok(/^[A-Za-z0-9_-]+$/.test(stateK.slice(3,-4)),"names are URL-safe, so no provider mangles them");

  // ── the index must stay findable ──
  ok(M.STORAGE_MANIFEST_NAME==="cg/index.bin","the manifest keeps a fixed name so a device can always find the index");
  ok(!/manifest|circle/.test(M.STORAGE_MANIFEST_NAME),"…without that name describing what it is");

  // ── padding hides volume ──
  const small=M.storagePad(JSON.stringify({a:1}));
  const mid=M.storagePad("x".repeat(5000));
  ok(new TextEncoder().encode(small).length===4096,"a tiny object is padded up to a bucket");
  ok(new TextEncoder().encode(mid).length===8192,"a mid-sized object lands in the next bucket");
  ok(M.storagePad("x".repeat(100)).length===M.storagePad("x".repeat(3000)).length,"two very different payloads become the SAME size — the provider can't tell a quiet week from a busy one");
  ok(M.storagePadTo(1)===4096&&M.storagePadTo(4096*2)===8192,"bucket boundaries are exact");
  ok(M.storagePadTo(5*1048576)===5*1048576,"large objects round to whole megabytes rather than doubling");
  const big=1048576*3;
  ok(M.storagePadTo(big-1)/big<1.35,"padding overhead stays bounded — it doesn't inflate a caregiver's upload for nothing");

  // ── padding must not corrupt what it protects ──
  const payload=JSON.stringify({data:"AAAA/BBB+CCC=",meta:{n:5},note:"line one\nline two"});
  ok(M.storageUnpad(M.storagePad(payload))===payload,"padded content round-trips back to exactly the original");
  ok(JSON.parse(M.storageUnpad(M.storagePad(payload))).note==="line one\nline two","…including embedded newlines, which the padding marker also uses");
  ok(M.storageUnpad(payload)===payload,"unpadding something that was never padded leaves it untouched — old objects still read");
  const hashy=JSON.stringify({data:"ends-with-hash###"});
  ok(M.storageUnpad(M.storagePad(hashy))===hashy,"content that itself ends in # survives the round trip");

  // ── wiring ──
  const syncStart=src.indexOf("const cloudStorageSync="); const body=src.slice(syncStart,src.indexOf("\n  const ",syncStart+40));
  ok(/storagePad\(body\)/.test(body),"the state object is padded before upload");
  // The audit changed this line: the manifest is now SEALED before padding, so assert both properties.
ok(/storagePad\(JSON\.stringify\(\{data:await encryptData\(mergedManifest/.test(body),"the manifest is encrypted AND padded — its size leaks how many devices exist");
  ok(/storageUnpad\(/.test(body),"padding is stripped on read");
  ok(/await _myStateKey\(\)/.test(body),"the sync path derives the object name");
  const keyFn=src.slice(src.indexOf("const _myStateKey="),src.indexOf("const _manifestKey="));
  ok(/_opaqueNames\(\)/.test(keyFn)&&/storageKeys\.state/.test(keyFn),"opaque names when a circle key exists, plain names as a fallback — never a crash when there's no key yet");
  const readMan=src.slice(src.indexOf("const readManifest="),src.indexOf("const readManifest=")+700);
  ok(/storageKeys\.manifest\(/.test(readMan),"the pre-Phase-5 manifest name is still tried, so an existing cloud copy isn't orphaned");

  console.log(f===0?"\n✅ METADATA MITIGATIONS PROVEN — names reveal nothing and stay stable, sizes bucket to hide volume, padding round-trips exactly, older layouts still readable":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
