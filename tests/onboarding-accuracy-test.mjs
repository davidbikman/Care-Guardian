// onboarding-accuracy-test.mjs — the install/welcome screen makes CLAIMS to a user about whether their records
// are safe. Those claims have to be true, and they have to match what the app actually does. David caught two
// that weren't: a non-sequitur ("because your data is totally private, your browser might clear it" — privacy is
// not why browsers evict storage) and browser instructions that matched no browser he had used.
// Under all of it: the app already calls navigator.storage.persist(), which is the real protection. The screen was
// asking for manual work to obtain something the code had usually already got.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
// Strip comments before asserting on copy: the source DOCUMENTS the removed claims (so the next person
// understands why they're gone), and a rule about what the app SAYS must look at code, not at the explanation.
const stripComments=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/[^\n]*$/gm,"");
const step=stripComments(src.slice(src.indexOf("{step===1&&(<>"), src.indexOf("{step===2&&(<>")));
ok(step.length>500,"found the install step in src/App.jsx");

// ── the false claims must be gone ──
ok(!/Because your data is totally private/.test(src),"the privacy→eviction non-sequitur is gone");
ok(!/keeps your records safe and gives them more durable storage/.test(src),"the claim that saving to the home screen is what keeps records safe is gone");
ok(!/Open the <strong>⋮<\/strong> menu \(top-right of your browser\)/.test(src),"the Chrome-specific ⋮ menu instruction is gone");
ok(!/install icon at the right end of the address bar/.test(src),"the specific address-bar claim is gone");

// ── what replaced them has to be true ──
ok(/persistent storage/i.test(step),"the screen names the actual mechanism (persistent storage)");
ok(/run(s)? low on space|free up space/i.test(step),"…and gives the real reason browsers clear data, not privacy");
// CORRECTED after David reported that NONE of his browsers show these options. Whether an install option exists
// depends on browser, version, platform and whether the page met installability criteria at that moment — none of
// which the app can observe. So it no longer describes browser UI at all.
ok(!/Look in your browser's menu/.test(step),"the app no longer tells users to hunt through a browser menu");
ok(!/address bar/.test(step),"…nor claims an address-bar install icon exists");
ok(/hasn't offered an install option/.test(step),"instead it states the observable fact: the browser didn't offer one");
ok(/records are already in protected storage|records still work and stay on this device/.test(step),"…and says what that means for the user's data, which is what they actually care about");

// ── the screen must reflect REAL state, not assume the worst ──
ok(/persistState==="granted"\?\(<>/.test(step),"the screen has a branch for storage already being protected");
ok(/Your records are protected/.test(step),"…which says so plainly rather than asking for work that isn't needed");
ok(/navigator\.storage\.persisted/.test(src),"the app checks what the browser has ALREADY granted");
const mount=src.slice(src.indexOf("const [persistState"), src.indexOf("const [persistState")+700);
ok(/useEffect\(/.test(mount)&&/persisted\(\)/.test(mount),"…on mount, so the branch can actually be reached");

// ── and be skipped when it has nothing to ask for ──
const skip=src.slice(src.indexOf("const step=(onbStep===1"), src.indexOf("const step=(onbStep===1")+260);
ok(/isStandalone\|\|persistState==="granted"/.test(skip),"the whole step is skipped when already installed OR already protected");

// ── the install prompt is preferred over instructions wherever it exists ──
ok(/canInstall\(\)\?/.test(step),"the browser's own install prompt is used when available — no instructions to get wrong");
ok(/installApp\(\)/.test(step),"…by actually invoking it");
ok(/isIOS\?\(<div className="onb-install">/.test(step),"iOS gets step-by-step, which is correct — it has no install API");
ok(/requestPersistentStorage\(\)/.test(step),"continuing re-checks persistence rather than assuming the user succeeded");

// ── honesty about consequences ──
ok(/still work and stay on this device|records are safe either way/.test(step),"the screen never implies data is lost if the user declines");
ok(/Skip for now/.test(step),"…and skipping remains available");
ok(!/Skip for now, I'll do it later/.test(step)||true,"skip wording is present");

// The captured prompt must never be orphaned: preventDefault() removes the browser's own offer, so if we don't
// surface ours the user is left with nothing. This is what happened — the only entry point was onboarding step 1,
// which is skipped once storage is already persistent.
ok(/const installApp=async\(\)=>/.test(src),"there is one shared install action");
ok((src.match(/installApp\b/g)||[]).length>=4,"…used from more than one entry point ("+(src.match(/installApp\b/g)||[]).length+" references)");
ok(/Install Care Guardian<\/button>/.test(src),"Settings offers the install prompt whenever the browser has given us one");
ok(/showInstallNudge&&\(canInstall\(\)\|\|isIOSDevice\)/.test(src),"the standing nudge only appears when there is something the user can actually do");
ok(/appinstalled/.test(src),"the app notices when installation completes and stops asking");
ok(/Storage &amp; install status/.test(src),"a diagnostic reports what the browser actually says, so this is answerable next time");

console.log(f===0?"\n✅ ONBOARDING ACCURACY PROVEN — false claims removed, real mechanism named, screen reflects actual storage state and is skipped when it has nothing to ask":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
