// circle-remote-app-test.mjs — PROOF of the remote (Argon2id passphrase) handoff, extracting the REAL seal/open + passphrase
// generator from src/App.jsx. The real argon2id (hash-wasm — same the app loads) is injected so the extracted crypto runs as-is.
import { readFileSync } from "node:fs";
import { argon2id } from "hash-wasm";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("decl not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const singles=["const b64enc=","const b64dec=","async function circleGcmEnc(","async function circleGcmDec(","const CIRCLE_REMOTE_AAD=","const CIRCLE_ARGON=","const CIRCLE_WORDS=","function circlePassphrase("];
// the ONLY thing dropped is the dependency-load line; the crypto logic is the app's verbatim
const drop='const {argon2id}=await import("hash-wasm"); ';
const sealSrc=extractFn("async function circleRemoteSeal(").replace(drop,"");
const openSrc=extractFn("async function circleRemoteOpen(").replace(drop,"");
const mod=singles.map(lineStarting).join("\n")+"\n"+sealSrc+"\n"+openSrc+"\nreturn {circleRemoteSeal,circleRemoteOpen,circlePassphrase};";
const C=new Function("argon2id",mod)(argon2id);
(async()=>{
  ok(typeof C.circleRemoteSeal==="function","extracted the real remote seal/open + passphrase generator from src/App.jsx");
  const p=C.circlePassphrase(6);
  ok(p.split("-").length===6 && p.split("-").every(w=>w.length>2),"generated passphrase is six words");
  ok(C.circlePassphrase()!==C.circlePassphrase(),"each generated passphrase differs");

  const bundle=JSON.stringify({circleKey:"SECRET_CIRCLE_KEY_b64",assignedDeviceId:"dev-x",relay:{claimToken:"SECRET_TOKEN"}});
  const env=await C.circleRemoteSeal(bundle,p);
  ok(env.alg==="argon2id","handoff is sealed with Argon2id");
  ok((await C.circleRemoteOpen(env,p))===bundle,"correct passphrase recovers the exact invite bundle");

  let wrong=false; try{ await C.circleRemoteOpen(env,"wrong-words-here-now-please"); }catch(e){ wrong=true; }
  ok(wrong,"a wrong passphrase fails closed");
  ok(!JSON.stringify(env).includes("SECRET_CIRCLE_KEY_b64") && !JSON.stringify(env).includes("SECRET_TOKEN"),"the sealed envelope carries no plaintext key or relay token");
  const env2=await C.circleRemoteSeal(bundle,p);
  ok(env.salt!==env2.salt && env.blob!==env2.blob,"each seal uses a fresh salt + ciphertext");

  console.log(f===0?"\n✅ REMOTE HANDOFF (in-app) PROVEN — Argon2id seal/open round-trips; wrong passphrase fails closed; envelope leaks nothing":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
