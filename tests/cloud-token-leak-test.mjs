// cloud-token-leak-test.mjs — REGRESSION PROOF: the admin's cloud OAuth refresh token must never leave the admin's
// own device. Found while planning user-owned cloud storage: settings.cloudAuth holds {provider, refreshToken,
// account}, and it was riding BOTH the circle sync payload (to every teammate's device) and .care exports.
// Encrypted in transit either way — but a credential the admin never chose to share ends up on devices they don't
// control, cannot be revoked per-device, and outlives circle key rotation.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
const M=new Function(extractFn("function stripPortableSecrets(")+"\n"+extractFn("function circleStripForSync(")+
  "\nreturn {stripPortableSecrets,circleStripForSync};")();
ok(typeof M.circleStripForSync==="function","extracted the real strip functions from src/App.jsx");

const SECRET="refresh-tok-SECRET-do-not-share";
const state={ _outbox:[{key:"a.enc",kind:"state"}], settings:{ deviceId:"dev1", backupPasscode:"BACKUPPW", syncServerApiKey:"APIKEY123", syncPasscode:"TEAMPW", deviceName:"Mum's iPad",
    cloudAuth:{provider:"dropbox",refreshToken:SECRET,account:"acct-123"},
    deviceKey:{jwkPriv:"PRIV",pub:"PUB"},
    circle:{id:"c1",key:"CIRCLEKEY",relay:{adminToken:"ADMIN"},epoch:2} },
  appointments:[{id:"a1",title:"Neurology"}], medSchedule:{medications:[],log:[]} };

// ── circle sync ──
const synced=M.circleStripForSync(state);
ok(JSON.stringify(synced).indexOf(SECRET)<0,"the circle sync payload carries NO cloud refresh token");
ok(!synced.settings.cloudAuth,"settings.cloudAuth is removed before syncing to teammates");
ok(synced._outbox===undefined,"the upload queue is not synced — a teammate must not inherit work for storage they don't have");
ok(!synced.settings.deviceKey,"the device private key is still stripped (unchanged behaviour)");
ok(!synced.settings.circle.key&&!synced.settings.circle.relay,"the circle key and relay caps are still stripped");
ok(synced.appointments.length===1&&synced.settings.circle.id==="c1","real care data and circle identity still sync");
ok(state.settings.cloudAuth.refreshToken===SECRET,"the original state is untouched — stripping is non-destructive");

// ── exports ──
const exported=M.stripPortableSecrets(state);
ok(JSON.stringify(exported).indexOf(SECRET)<0,"an exported payload carries no cloud refresh token");
ok(exported.appointments===state.appointments,"stripping doesn't deep-clone unrelated data");
// A portable .care file is meant to be stored and shared. No device or circle secret belongs in one: import
// discards them anyway, so keeping them in the file at rest was pure downside.
ok(!exported.settings.deviceKey,"an export carries no device private key");
ok(exported._outbox===undefined,"an export carries no upload queue — that is this device's own bookkeeping");
// Found in the line-by-line audit: these were stored in the clear and travelled to every teammate and backup.
for(const [field,val] of [["backupPasscode","BACKUPPW"],["syncServerApiKey","APIKEY123"],["syncPasscode","TEAMPW"]]){
  ok(exported.settings[field]===undefined,"an export carries no "+field);
  ok(JSON.stringify(exported).indexOf(val)<0,"…and its value appears nowhere in the payload");
  ok(synced.settings[field]===undefined,"circle sync carries no "+field);
}
ok(!exported.settings.circle.key,"an export carries no circle key");
ok(!exported.settings.circle.relay,"an export carries no relay capabilities");
ok(exported.settings.circle.id==="c1"&&exported.settings.circle.epoch===2,"…but circle identity and epoch survive, so a restored device knows which circle to re-join");
ok(JSON.stringify(exported).indexOf("CIRCLEKEY")<0&&JSON.stringify(exported).indexOf("PRIV")<0&&JSON.stringify(exported).indexOf("ADMIN")<0,"no secret value appears anywhere in an exported payload");
ok(M.stripPortableSecrets({settings:{}}).settings&&!M.stripPortableSecrets({}).settings,"handles states with no secrets and no settings");
ok(M.stripPortableSecrets({settings:{circle:{id:"c9"}}}).settings.circle.id==="c9","a circle with no key present is left intact");

// ── every payload builder in the app must go through it ──
const builders=[...src.matchAll(/const (payload|exportData)=\{\.\.\.([A-Za-z]+)/g)].map(m=>({v:m[1],from:m[2]}));
ok(builders.length>=6,"found the payload builders ("+builders.length+")");
const raw=builders.filter(b=>b.from==="data"||b.from==="pushPayload");
ok(raw.length===0,"no payload is built from raw state — every one goes through stripPortableSecrets"+(raw.length?" ("+raw.length+" missed)":""));
const stripped=[...src.matchAll(/\{\.\.\.stripPortableSecrets\(/g)];
ok(stripped.length>=6,"stripPortableSecrets wraps every export and backup builder ("+stripped.length+")");

// ── no client secret may ship in a browser bundle ──
ok(!/GOOGLE_CLIENT_SECRET/.test(src),"the Google client secret is gone from the source entirely");
ok(!/p\.client_secret\s*=/.test(src),"no token request attaches a client secret");
const gd=src.slice(src.indexOf('id:"googledrive"'),src.indexOf('id:"googledrive"')+400);
ok(/auth:"gis"/.test(gd),"Google Drive uses the Google Identity Services token model — the flow that needs no client secret");
ok(/drive\.file/.test(gd),"…with the non-sensitive drive.file scope, which needs no CASA security assessment");
ok(/googledrive:\{auth:"session"/.test(src.replace(/\s+/g,"")),"Google Drive is declared SESSION-scoped, so nothing promises it background sync");

console.log(f===0?"\n✅ CLOUD CREDENTIAL CONTAINED — no device, circle or cloud secret leaves in sync payloads or portable files; no client secret ships":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
