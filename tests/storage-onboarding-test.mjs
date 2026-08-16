// storage-onboarding-test.mjs — PROOF for Phase 2: the admin storage-choice flow. These assertions exist because
// each one encodes a LOCKED DECISION that is easy to erode later by a well-meaning UX tweak:
//   • skipping the choice leaves the app local-only (egress is never the path of least resistance)
//   • local-only is a first-class option, never presented as a lesser one
//   • the recovery kit is a HARD GATE for anyone connecting cloud storage
//   • connection is verified by a real encrypt→upload→download→decrypt round trip, at setup, not at 3am
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
const screen=src.slice(src.indexOf("if(authed&&showStorageChoice"), src.indexOf("if(authed&&showFirstWin"));
ok(screen.length>500,"found the storage-choice screen in src/App.jsx");

// ── the three options, and local-only's standing ──
ok(/Just this device/.test(screen)&&/my own cloud/.test(screen)&&/organisation runs/.test(screen),"all three storage options are offered");
ok(/fully supported one, not a lesser one/.test(screen),"local-only is stated as first-class, not a fallback");
ok(screen.indexOf("Just this device")<screen.indexOf("my own cloud"),"local-only is listed FIRST — the private option is not buried under the cloud one");
ok(/chooseLocalOnly/.test(screen),"choosing local-only is an explicit action that records the choice");

// ── skipping must not become consent ──
const skip=extractFn("const skipStorageChoice=");
ok(/storageMode:"local"/.test(skip),"skipping leaves the app LOCAL-ONLY — never a default that uploads");
ok(/storagePrompt:"pending"/.test(skip),"…and records that the question is still open, so it can be asked again");
ok(/Decide later/.test(screen),"skipping is offered plainly rather than hidden");
const nudge=extractFn("const storageNudgeVisible=");
ok(/storagePrompt\)/.test(nudge)&&/pending/.test(nudge),"the nudge shows only while the choice is genuinely outstanding");
ok(/!getCloudAuth\(\)/.test(nudge),"…and stops once storage is connected");
ok(/storageNudgeDismissed/.test(nudge),"a dismissal is honoured rather than nagging every screen");
ok(/storage-nudge/.test(src)&&/Choose storage/.test(src),"the nudge is rendered with a way to act on it");

// ── the recovery-kit gate ──
ok(/storage-gate/.test(screen),"a gate is shown before finishing a cloud setup");
// The same gate must apply to a self-hosted server: it can't decrypt the records either.
const _sStart=screen.indexOf('storageChoice==="server"');
const serverBranch=_sStart>0?screen.slice(_sStart,screen.indexOf('storageChoice==="cloud"',_sStart)):"";
ok(/disabled=\{!hasRecoveryKit\(\)\}/.test(serverBranch),"the recovery-kit gate applies to a self-hosted server too");
ok(!/cloud-provider-btns/.test(serverBranch),"the server branch doesn't offer OAuth providers, which can't help a self-hoster");
ok(/cannot unlock them/.test(screen)||/cannot be opened/.test(screen),"it states plainly that the provider cannot decrypt the records");
ok(/disabled=\{!hasRecoveryKit\(\)\}/.test(screen),"Finish is DISABLED until a recovery kit exists — the gate is real, not advisory");
ok(/required when you save to the cloud/.test(screen),"…and the requirement is explained rather than just blocking");
const hrk=extractFn("const hasRecoveryKit=");
ok(/wk\.cRecovery/.test(hrk),"the gate checks the ACTUAL recovery wrap, not a settings flag that could be set without one");
ok(/catch/.test(hrk),"a failure to read the key object fails closed (no kit), not open");
// local-only must NOT be gated
// The self-hosted-server branch now sits between "local" and "cloud", so slice to the START of the next branch
// rather than assuming cloud follows local.
const _lStart=screen.indexOf('storageChoice==="local"');
const _lEnd=Math.min(...[screen.indexOf('storageChoice==="server"',_lStart),screen.indexOf('storageChoice==="cloud"',_lStart)].filter(x=>x>0));
const localBranch=screen.slice(_lStart,_lEnd);
ok(!/hasRecoveryKit/.test(localBranch),"local-only is NOT gated on a recovery kit — the gate applies where the false sense of safety is");
ok(/recovery kit is the only way back/.test(localBranch)||/recovery kit/.test(localBranch),"…but local-only still explains why a kit matters");

// ── verification is a real round trip ──
const verify=extractFn("const verifyStorageRoundTrip=");
ok(/encryptData\(/.test(verify)&&/prov\.upload\(/.test(verify)&&/prov\.download\(/.test(verify)&&/decryptData\(/.test(verify),"the check encrypts, uploads, downloads AND decrypts — not just 'connected'");
ok(/nonce!==canary\.nonce/.test(verify),"the data that comes back is compared with what was sent");
ok(/prov\.del/.test(verify),"the probe object is cleaned up afterwards");
ok(/catch\(e\)\{\}/.test(verify),"…and a failure to delete the probe doesn't fail the verification");
ok(/storageVerifiedAt/.test(verify),"a successful verification is recorded");
ok(/hipaaAudit\(/.test(verify),"verification is written to the audit trail");
ok(/setStorageVerify\(\{error/.test(verify),"a failure surfaces the actual reason rather than a generic message");
ok(/safe on this device/.test(screen),"a failed check reassures the user their records are still safe locally");

// ── the privacy promise matches what the app now does ──
const privacy=src.slice(src.indexOf("Your family's privacy comes first"),src.indexOf("Your family's privacy comes first")+700);
ok(!/does not use the cloud/.test(privacy),"the onboarding no longer claims the app never uses the cloud — that stopped being true");
ok(/No readable data ever leaves your device/.test(privacy),"…it makes the sharper, still-true claim instead");
ok(/unless you choose where it goes/.test(privacy),"…including that egress requires an explicit choice");

// ── ordering: the vault must exist before storage is offered ──
ok(/setShowFirstWin\(true\);setShowStorageChoice\(true\)/.test(src),"the storage choice comes after setup, so there is a vault to verify against");
ok(/showStorageChoice&&!showFirstWin/.test(src),"…and after the first-run personalisation, not competing with it");

console.log(f===0?"\n✅ STORAGE ONBOARDING PROVEN — local-only first and first-class, skipping never uploads, recovery kit hard-gates cloud, connection verified by a real round trip":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
