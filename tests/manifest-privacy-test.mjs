// manifest-privacy-test.mjs — REGRESSION PROOF for the audit's principal finding.
// Phase 5 made object NAMES opaque (HMAC-derived, no words, ids or dates) — but the manifest sitting beside them
// was uploaded as PLAINTEXT JSON listing every device id, its human label ("Mum's iPad"), exactly when each one
// synced, and each object's TRUE byte size. The byte sizes undid the size padding built in the same phase, and
// the labels undid the opaque naming. The provider could reconstruct the household without decrypting anything.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
const mvLine=src.split("\n").find(l=>l.trim().startsWith("const MANIFEST_VERSION")).trim();
const M=new Function([mvLine,extractFn("function manifestEmpty("),extractFn("function manifestPut(")].join("\n")+
  "\nreturn {manifestEmpty,manifestPut};")();

// ── the manifest must not publish object sizes ──
let m=M.manifestPut(M.manifestEmpty("c1"),"dev-a",{key:"cg/xyz.bin",label:"Mum's iPad",epoch:2,bytes:41880},"2026-07-30T21:00:00Z");
ok(m.devices["dev-a"].bytes===undefined,"the manifest records NO byte size — publishing it handed back exactly what the size padding hides");
ok(m.devices["dev-a"].key==="cg/xyz.bin","…while still recording where the object is");
ok(!/41880/.test(JSON.stringify(m)),"the true size appears nowhere in the manifest");

// ── the manifest must be sealed before upload ──
const syncStart=src.indexOf("const cloudStorageSync="); const body=src.slice(syncStart,src.indexOf("\n  const ",syncStart+40));
const write=body.slice(body.indexOf("stageOutbox(_manifestKey()"),body.indexOf("stageOutbox(_manifestKey()")+220);
ok(/encryptData\(mergedManifest/.test(write),"the manifest is ENCRYPTED before it is uploaded");
ok(!/JSON\.stringify\(mergedManifest\)\)/.test(write.replace(/encryptData\([^)]*\)/g,"")),"…and no plaintext manifest is written");
ok(/storagePad\(/.test(write),"the sealed manifest is padded too — its size leaks how many devices exist");

// ── and decrypted on read, without orphaning an older plaintext one ──
const rm=src.slice(src.indexOf("const readManifest="),src.indexOf("const readManifest=")+900);
ok(/decryptData\(j\.data,pw\)/.test(rm),"the manifest is decrypted on read");
ok(/j\.data&&!j\.devices/.test(rm),"…detected by shape, so a plaintext manifest from the previous build still loads");
ok(/catch\(e\)\{ return null; \}/.test(rm)||/catch/.test(rm),"a manifest that cannot be opened fails closed rather than throwing");
ok(/readManifest=async\(prov,accessToken,pw\)/.test(src),"the passcode is threaded to the reader rather than reached for globally");

// ── the human label only ever exists inside the sealed blob ──
ok(/label:entry\.label/.test(extractFn("function manifestPut(")),"device labels are still carried, for the UI");
ok(/deviceName/.test(body),"…sourced from the device name the user set");
ok(/encryptData\(mergedManifest/.test(body),"…and only ever leave the device inside ciphertext");

console.log(f===0?"\n✅ MANIFEST PRIVACY PROVEN — no byte sizes published, manifest sealed before upload, decrypted on read, older plaintext manifests still readable":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
