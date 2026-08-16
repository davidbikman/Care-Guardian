// circle-pair-test.mjs — PROOF of the in-person two-scan ECDH+SAS pairing, extracting the REAL functions from src/App.jsx.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("decl not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const singles=["const b64enc=","const b64dec=","const CIRCLE_PAIR_INFO=","const _cte=","const _ccat=","async function grantKeypair(","async function grantExpPub(","async function grantImpPub(","async function grantSharedZ(","async function hkdfBytes(","async function circleGcmEnc(","async function circleGcmDec(","function circleSas6(","async function circleImportPriv(","async function circlePairStartB("];
const multis=["async function circlePairRespondA(","async function circlePairCompleteB("];
const mod=[...singles.map(lineStarting),...multis.map(extractFn)].join("\n")+
  "\nreturn {circlePairStartB,circlePairRespondA,circlePairCompleteB,grantKeypair,grantExpPub,b64enc};";
const C=new Function(mod)();
const b64=u=>Buffer.from(u).toString("base64");
(async()=>{
  ok(typeof C.circlePairRespondA==="function","extracted the real circle pairing functions from src/App.jsx");
  const circleKey=b64(crypto.getRandomValues(new Uint8Array(32)));         // b64, as in app state
  const B=await C.circlePairStartB();                                       // QR#1 = B.pub
  const A=await C.circlePairRespondA(circleKey,B.pub);                      // QR#2 + SAS on A
  const r=await C.circlePairCompleteB(B.ephJwk,B.pub,A.eApub,A.salt,A.wrap);
  ok(r.ok,"honest pairing: B's AEAD opens");
  ok(r.sas===A.sas&&/^\d{6}$/.test(A.sas),"honest pairing: 6-digit SAS matches on both ("+A.sas+")");
  ok(r.circleKey===circleKey,"B recovers the exact circle key");
  const M=await C.grantKeypair(); const Mpub=C.b64enc(await C.grantExpPub(M.publicKey));
  const sw=await C.circlePairCompleteB(B.ephJwk,B.pub,Mpub,A.salt,A.wrap);
  ok(sw.sas!==A.sas,"swapped QR: SAS no longer matches → user aborts");
  ok(sw.ok===false&&sw.circleKey===null,"swapped QR: AEAD rejects, NO key released even if SAS ignored");
  const buf=Buffer.from(A.wrap,"base64"); buf[buf.length-1]^=1;
  const tp=await C.circlePairCompleteB(B.ephJwk,B.pub,A.eApub,A.salt,buf.toString("base64"));
  ok(tp.ok===false,"tampered wrap fails closed");
  const qr2=JSON.stringify({eApub:A.eApub,salt:A.salt,wrap:A.wrap});
  ok(!B.pub.includes(circleKey)&&!qr2.includes(circleKey),"neither QR carries the circle key in readable form");
  console.log(f===0?"\n✅ PAIRING (in-app) PROVEN":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
