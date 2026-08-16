// circle-rotate-test.mjs — PROOF of pairwise rotation + removed-device exclusion, extracting REAL functions from src/App.jsx.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("decl not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const singles=["const b64enc=","const b64dec=","const CIRCLE_PAIR_INFO=","const _cte=","async function grantKeypair(","async function grantExpPub(","async function grantImpPub(","async function grantSharedZ(","async function hkdfBytes(","async function circleGcmEnc(","async function circleGcmDec(","const circleNewKey=","async function circleNewDeviceKey(","async function circleImportPriv("];
const multis=["async function circleRotate(","async function circleRotationOpen("];
const mod=[...singles.map(lineStarting),...multis.map(extractFn)].join("\n")+
  "\nreturn {circleRotate,circleRotationOpen,circleNewDeviceKey,circleNewKey,circleGcmEnc,circleGcmDec,b64dec};";
const C=new Function(mod)();
(async()=>{
  ok(typeof C.circleRotate==="function","extracted the real rotation functions from src/App.jsx");
  const mk=async id=>({id, ...(await C.circleNewDeviceKey())});
  const A=await mk("A"),B=await mk("B"),Cc=await mk("C"),R=await mk("R");
  const pub=d=>({deviceId:d.id,pub:d.pub});
  const key0=C.circleNewKey();
  // epoch 1: remove R → rotate to key1 for A,B,C only
  const key1=C.circleNewKey(); const rot1=await C.circleRotate(key1,1,[A,B,Cc].map(pub));
  ok((await C.circleRotationOpen(rot1,"B",B.jwkPriv))===key1,"(3) remaining online device B derives the new key");
  let rNo=false; try{await C.circleRotationOpen(rot1,"R",R.jwkPriv)}catch{rNo=true} ok(rNo,"(4) removed device R has no blob of its own");
  let rPig=false; try{await C.circleRotationOpen(rot1,"B",R.jwkPriv)}catch{rPig=true} ok(rPig,"(4) R cannot open another device's blob");
  ok(!JSON.stringify(rot1).includes(key1),"(4) rotation object carries no plaintext new key");
  // epoch 2: manual rotate while C was offline the whole time
  const key2=C.circleNewKey(); const rot2=await C.circleRotate(key2,2,[A,B,Cc].map(pub));
  ok((await C.circleRotationOpen(rot2,"C",Cc.jwkPriv))===key2,"(3) C, offline across 2 rotations, derives the CURRENT key from the latest object alone");
  // data re-key
  const note=new TextEncoder().encode("Shift note"); const aad=new TextEncoder().encode("circle/state");
  const sealed=await C.circleGcmEnc(C.b64dec(key2),note,aad);
  const bk2=await C.circleRotationOpen(rot2,"B",B.jwkPriv);
  ok(new TextDecoder().decode(await C.circleGcmDec(C.b64dec(bk2),sealed,aad)).startsWith("Shift note"),"(3) remaining device reads new data under the rotated key");
  let rLock=false; try{await C.circleGcmDec(C.b64dec(key0),sealed,aad)}catch{rLock=true} ok(rLock,"(4) removed device (old key only) cannot read post-rotation data");
  console.log(f===0?"\n✅ ROTATION (in-app) PROVEN":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
