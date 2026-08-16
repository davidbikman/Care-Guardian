// ── PROOF of the grant bundle crypto, using the REAL app functions (extracted verbatim from src/App.jsx). ──
// ECDH-ES seal/open round-trip; the scope manifest is bound; and (v2 hardening) the ENTIRE header — grantId,
// archetype, institution, family, createdAt, expiresAt, scope — is bound as AES-GCM additional-data, so tampering
// ANY of those fields breaks decryption. A v1 bundle (scope-only AAD) still opens (back-compat).
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(declStart){const k=src.indexOf(declStart);if(k<0)throw new Error("decl not found "+declStart);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const singles=["const b64enc=","const b64dec=","const GRANT_INFO=","const canonicalGrantHeader=",
  "async function wrapWithKey(","async function unwrapWithKey(","async function grantKeypair(","async function grantExpPub(","async function grantImpPub(","async function grantSharedZ(","async function grantHkdfAes("];
const multis=["async function sealGrantBundle(","async function openGrantBundle("];
const mod=[...singles.map(lineStarting),...multis.map(extractFn)].join("\n")+
  "\nreturn {sealGrantBundle,openGrantBundle,canonicalGrantHeader,grantKeypair,grantExpPub};";
const G=new Function(mod)();
const b64e=u=>Buffer.from(u).toString("base64");

(async()=>{
  ok(typeof G.sealGrantBundle==="function","extracted the real sealGrantBundle/openGrantBundle + canonicalGrantHeader from src/App.jsx");
  const prog=await G.grantKeypair(); const pub=await G.grantExpPub(prog.publicKey);
  const attacker=await G.grantKeypair();
  const scope={includes:["careStatus","incidents"],excludes:["clientVoice","financials"]};
  const projection={archetype:"navigator",care:"Mom",careStatus:[{domain:"meds",pct:80}]};
  const meta={grantId:"g-abc123",archetype:"navigator",institution:"Willamette Vital Health",family:{name:"Mom"},createdAt:"2026-06-21",expiresAt:"2026-12-31"};

  // round-trip
  const b=await G.sealGrantBundle(projection,scope,pub,meta);
  ok(b.v===2,"new bundles are v2");
  const opened=await G.openGrantBundle(b,prog.privateKey);
  ok(opened.care==="Mom"&&opened.careStatus[0].pct===80,"seal→open round-trips the projection");

  // wrong key can't open
  let wrong=false; try{ await G.openGrantBundle(b,attacker.privateKey) }catch{ wrong=true }
  ok(wrong,"a different private key cannot open the bundle");

  // scope tamper (was the v1 guarantee)
  let s=false; try{ await G.openGrantBundle({...b,scopeManifest:{includes:["careStatus","incidents","clientVoice","financials"],excludes:[]}},prog.privateKey) }catch{ s=true }
  ok(s,"tampering the scope manifest breaks decryption");

  // NEW v2 guarantee: every header field is authenticated
  const fieldTamper=async(patch,label)=>{ let t=false; try{ await G.openGrantBundle({...b,...patch},prog.privateKey) }catch{ t=true } ok(t,label); };
  await fieldTamper({expiresAt:"2099-12-31"},"tampering expiresAt breaks decryption (no silent grant-extension)");
  await fieldTamper({institution:"Evil Health Co"},"tampering institution breaks decryption");
  await fieldTamper({archetype:"reviewer"},"tampering archetype breaks decryption");
  await fieldTamper({family:{name:"Someone Else"}},"tampering family breaks decryption");
  await fieldTamper({createdAt:"2000-01-01"},"tampering createdAt breaks decryption");
  // grantId is also bound (via the HKDF salt AND the header)
  await fieldTamper({grantId:"g-evil"},"tampering grantId breaks decryption");

  // back-compat: a v1 bundle (scope-only AAD) still opens
  // build one with the same crypto but the legacy aad + v:1
  const { sealV1 }=await (async()=>{
    const te=new TextEncoder();
    async function sealV1(){ const DEK=crypto.getRandomValues(new Uint8Array(32)); const E=await G.grantKeypair(); const Epriv=E.privateKey;
      // mirror app internals just enough to produce a legacy bundle openable by openGrantBundle
      const Z=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:prog.publicKey},Epriv,256));
      const pushNonce=b64e(crypto.getRandomValues(new Uint8Array(12)));
      const base=await crypto.subtle.importKey("raw",Z,"HKDF",false,["deriveKey"]);
      const WK=await crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:te.encode("g-legacy|"+pushNonce),info:te.encode("care-guardian-grant-v1")},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
      const iv0=crypto.getRandomValues(new Uint8Array(12)); const wct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:iv0},WK,DEK)); const wb=new Uint8Array(12+wct.length); wb.set(iv0,0); wb.set(wct,12);
      const dk=await crypto.subtle.importKey("raw",DEK,{name:"AES-GCM"},false,["encrypt"]); const iv=crypto.getRandomValues(new Uint8Array(12));
      const aad=te.encode(JSON.stringify(scope)); const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad},dk,te.encode(JSON.stringify({ok:1}))));
      const expPub=new Uint8Array(await crypto.subtle.exportKey("raw",E.publicKey));
      return {v:1,grantId:"g-legacy",scopeManifest:scope,pushNonce,ephemeralPub:b64e(expPub),wrappedKey:b64e(wb),iv:b64e(iv),ciphertext:b64e(ct)};
    }
    return {sealV1};
  })();
  const legacy=await sealV1();
  const lo=await G.openGrantBundle(legacy,prog.privateKey);
  ok(lo.ok===1,"a v1 (scope-only AAD) bundle still opens — back-compat preserved");

  console.log(f===0?"\n✅ GRANT BUNDLE PROOF PASSES — round-trip, scope + full-header binding, v1 back-compat":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
