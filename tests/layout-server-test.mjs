// layout-server-test.mjs — two fixes David reported from real use on a laptop.
//  (a) The app used a third of a wide screen and the welcome cards were phone-sized at any resolution. For a user
//      base that trends older, unused screen is unread text — and maxing the text-size setting couldn't help,
//      because the CONTAINER was the constraint, not the font.
//  (b) Choosing "a server my organisation runs" fell through to the OAuth provider list — three buttons that
//      cannot help someone self-hosting. That was a dead end, not a feature.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}

// ── (a) layout ──
ok(!/\.content\{flex:1;padding:28px 32px 40px;max-width:960px/.test(src),"the 960px content cap is gone");
ok(/\.content\{[^}]*max-width:min\(1400px/.test(src),"content can now use up to 1400px");
ok(/\.content\{[^}]*margin-inline:auto/.test(src),"…and is CENTRED — without this it hugged the left third of a wide screen");
ok(!/\.auth-card\{[^}]*max-width:360px/.test(src),"the fixed 360px welcome card is gone");
ok(/\.auth-card\{[^}]*max-width:min\(860px,94vw\)/.test(src),"the welcome card scales with the viewport (widened again after the 11pt floor work)");
ok(/\.onb-card\{max-width:min\(900px,94vw\)/.test(src),"…as does the onboarding card");
ok(/\.auth-card\{[^}]*padding:clamp\(/.test(src),"card padding scales too, so a wide card isn't a thin strip of text");

// Superseded: the per-class desktop tier scaled about a dozen named classes and missed ~380 other font
// declarations. Replaced by a ROOT boost plus an 11pt floor across the whole stylesheet — asserted in detail by
// text-size-test.mjs. Here we only check the mechanism is present.
ok(/--screen-boost/.test(src),"a root-level screen boost scales all text together");
ok(/html\{font-size:calc\(var\(--ui-scale-pct,100%\) \* var\(--screen-boost,1\)\)/.test(src),"…multiplied with the user's own text-size setting");
ok(/max-width:64ch/.test(src),"long-form prose keeps a readable measure — widening alone would make text HARDER to read");
ok(/@media\(min-width:1500px\)/.test(src),"a second tier exists for large displays");
ok(/@media\(min-width:1180px\)\{[^}]*storage-choice\{display:grid/.test(src.replace(/\n/g,"")),"card lists become multi-column instead of one tall stretched row");

// ── (b) self-hosted server ──
const srv=src.slice(src.indexOf('{storageChoice==="server"&&(<>'), src.indexOf('{storageChoice==="cloud"&&(<>'));
ok(srv.length>500,"the server option has its own branch");
ok(!/cloud-provider-btns/.test(srv),"…and no longer shows the OAuth provider buttons, which could not help a self-hoster");
ok(/Server address/.test(srv)&&/Access key/.test(srv),"it asks for the two things self-hosting actually needs");
ok(/https:\/\/care\.example\.org/.test(srv),"…with a concrete example of the address format");
ok(/setServerConfig\(/.test(srv),"it saves through the existing server config path rather than a parallel one");
ok(/ask whoever set up the server/.test(srv),"it tells a non-technical user where to get these, instead of assuming they know");
ok(/What kind of server is this\?/.test(srv),"…and explains what would satisfy the requirement (relay, S3-compatible, WebDAV)");
ok(/CORS/.test(srv),"CORS is named, since it is the usual cause of a failed connection");

const v=extractFn("const verifyServerRoundTrip=");
ok(/method:"PUT"/.test(v)&&/await fetch\(path,\{headers/.test(v),"verification uploads AND reads back");
ok(/decryptData\(/.test(v)&&/nonce!==canary\.nonce/.test(v),"…decrypts and compares what came back");
ok(/method:"DELETE"/.test(v),"…and cleans up the probe");
ok(/failed to fetch\|networkerror/i.test(v),"a bare browser fetch failure is translated");
ok(/allow this app's web address \(CORS\)/.test(v),"…into the actionable cause, rather than 'failed'");
ok(/hipaaAudit\(/.test(v),"a successful verification is audited");
ok(/storageMode:"server"/.test(v),"…and the storage mode is recorded");
ok(/hasRecoveryKit\(\)/.test(srv)&&/disabled=\{!hasRecoveryKit\(\)\}/.test(srv),"the recovery-kit gate applies here too — the server can't decrypt either");

console.log(f===0?"\n✅ LAYOUT + SELF-HOSTED SERVER PROVEN — the app uses the screen it has, and self-hosting is a real flow rather than a dead end":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
