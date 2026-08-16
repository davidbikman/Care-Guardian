// ── PROOF: the reviewer keystore. The program private key + intake read cap are sealed under a strong random
// vault key; the vault key is wrapped under the passcode (always) and optionally a passkey's PRF output. Nothing
// sits in plaintext. Extracts the REAL app functions (encryptData/decryptData/buildPasskeyWrap/unwrapWithPasskey
// + the reviewer-vault builders) verbatim from src/App.jsx. PRF output is simulated as fixed bytes — the wrap/
// unwrap math is identical regardless of where those bytes come from (a real authenticator on a live device).
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const lineStarting=(p)=>{const l=src.split("\n").find(x=>x.trim().startsWith(p));if(!l)throw new Error("not found: "+p);return l.trim()};
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(declStart){const k=src.indexOf(declStart);if(k<0)throw new Error("decl not found: "+declStart);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}
const singles=["const KDF_ITER =","const KDF_ITER_LEGACY =","const b64enc=","const b64dec=","const MFA_PRF_INFO =","async function pbkdf2Bits(","async function combineFactorKey(","async function wrapWithKey(","async function unwrapWithKey(","async function buildPasskeyWrap(","async function unwrapWithPasskey("];
const multis=["async function encryptData(","async function decryptData(","async function buildReviewerVault(","async function resealReviewerVault(","async function openReviewerVault(","async function addReviewerPasskeyWrap(","async function openReviewerVaultWithPasskey("];
const mod=[...singles.map(lineStarting),...multis.map(extractFn)].join("\n")+
  "\nreturn {buildReviewerVault,resealReviewerVault,openReviewerVault,addReviewerPasskeyWrap,openReviewerVaultWithPasskey,b64enc,b64dec};";
const V=new Function(mod)();
ok(typeof V.buildReviewerVault==="function"&&typeof V.openReviewerVaultWithPasskey==="function","extracted the real reviewer-vault functions + crypto cluster from src/App.jsx");

// realistic secrets
const SECRET_D="vErYsEcReTpRiVaTeScAlAr_do_not_leak_1234567890";
const READCAP="cap-abcdef0123456789-readonly-token";
const program={institution:"Willamette Vital Health",fingerprint:"AB12-CD34",pubB64:"BPubKeyRawBytesXYZ",privJwk:{kty:"EC",crv:"P-256",x:"xx",y:"yy",d:SECRET_D}};
const intake={backend:"https",base:"https://intake.example.org",readCap:READCAP,rootPrefix:""};
const PRF=new Uint8Array(32).fill(7), PRF2=new Uint8Array(32).fill(9);

(async()=>{
  // 1. round-trip (passcode)
  const { vault, vaultPassB64 }=await V.buildReviewerVault({program,intake},"open-sesame");
  const r1=await V.openReviewerVault(vault,"open-sesame");
  ok(JSON.stringify(r1.secrets.program)===JSON.stringify(program)&&r1.secrets.intake.readCap===READCAP,"passcode round-trip recovers the program key + intake cap exactly");

  // 2. no plaintext in the stored blob
  const blob=JSON.stringify(vault);
  ok(blob.indexOf(SECRET_D)<0&&blob.indexOf(READCAP)<0&&blob.indexOf("Willamette")<0,"the stored vault contains NO plaintext private scalar, read cap, or institution name");

  // 3. wrong passcode fails closed
  let threw=false; try{ await V.openReviewerVault(vault,"WRONG"); }catch{ threw=true; }
  ok(threw,"a wrong passcode fails closed (throws, no secrets returned)");

  // 4. tamper detection (AES-GCM auth) on both the sealed payload and the passcode wrap
  const flip=(s)=>{const i=s.length>>1;return s.slice(0,i)+(s[i]==="A"?"B":"A")+s.slice(i+1)};
  let t1=false; try{ await V.openReviewerVault({...vault,sealed:flip(vault.sealed)},"open-sesame"); }catch{ t1=true; }
  let t2=false; try{ await V.openReviewerVault({...vault,pc:flip(vault.pc)},"open-sesame"); }catch{ t2=true; }
  ok(t1&&t2,"tampering with either the sealed payload or the passcode wrap is detected (fails closed)");

  // 5. re-seal under the same vault key (used when intake connects / keys change)
  const intake2={...intake,base:"https://intake2.example.org",readCap:"cap-NEW-9999"};
  const v2=await V.resealReviewerVault(vault,vaultPassB64,{program,intake:intake2});
  const r2=await V.openReviewerVault(v2,"open-sesame");
  ok(r2.secrets.intake.readCap==="cap-NEW-9999","re-sealing updates the payload and stays openable with the same passcode (no re-prompt)");

  // 6. passkey wrap: correct passcode+PRF opens; wrong PRF or wrong passcode fails
  const vp=await V.addReviewerPasskeyWrap(vault,vaultPassB64,"open-sesame","cred-1",PRF);
  const r3=await V.openReviewerVaultWithPasskey(vp,"open-sesame",PRF);
  ok(r3.secrets.intake.readCap===READCAP,"passkey path (passcode + correct PRF) opens the vault");
  let p1=false; try{ await V.openReviewerVaultWithPasskey(vp,"open-sesame",PRF2); }catch{ p1=true; }
  let p2=false; try{ await V.openReviewerVaultWithPasskey(vp,"WRONG",PRF); }catch{ p2=true; }
  ok(p1&&p2,"the passkey path needs BOTH factors: wrong PRF fails, and wrong passcode fails even with the right PRF");

  // 7. adding a passkey doesn't disturb the passcode path
  const r4=await V.openReviewerVault(vp,"open-sesame");
  ok(r4.secrets.intake.readCap===READCAP,"the passcode still opens the vault after a passkey is added (two independent unlock methods)");

  // 8. no plaintext even with the passkey wrap present
  ok(JSON.stringify(vp).indexOf(SECRET_D)<0&&JSON.stringify(vp).indexOf(READCAP)<0,"still no plaintext secret after the passkey wrap is added");

  console.log(f===0?"\n✅ REVIEWER KEYSTORE PROOF PASSES — secrets sealed, passcode + passkey unlock, fail-closed, no plaintext at rest":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
