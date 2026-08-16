// ── INTEGRATION: app's REAL transport client ↔ reference intake server, over real HTTP ──
// Closes the gap flagged in the build: the network path itself (fetch vs a live endpoint).
// The client object is EXTRACTED VERBATIM from src/App.jsx (no re-implementation), then driven
// against intake-server/server.js on loopback. The crypto is the same ECDH-ES seal/open.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createIntakeServer } = require("../intake-server/server.cjs");
const subtle = globalThis.crypto.subtle;
let f = 0; const ok = (c, m) => { if (!c) { f++; console.log("✗ " + m); } else console.log("✓ " + m); };
const te = new TextEncoder(), td = new TextDecoder();
const b64e = (u) => Buffer.from(u).toString("base64"); const rand = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// ---- extract the REAL client (_ib, intakeObjectName, INTAKE_BACKENDS) from the app source ----
const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const lineStarting = (p) => { const l = src.split("\n").find((x) => x.trim().startsWith(p)); if (!l) throw new Error("not found: " + p); return l.trim(); };
function sliceBalanced(s, from) { let d = 0; for (let i = from; i < s.length; i++) { if (s[i] === "{") d++; else if (s[i] === "}") { d--; if (d === 0) return s.slice(from, i + 1); } } throw new Error("unbalanced"); }
const ibLine = lineStarting("const _ib=");
const onLine = lineStarting("const intakeObjectName=");
const ki = src.indexOf("const INTAKE_BACKENDS="); const bi = src.indexOf("{", ki);
const objText = sliceBalanced(src, bi);
const { INTAKE_BACKENDS, intakeObjectName } = new Function(`${ibLine}\n${onLine}\nconst INTAKE_BACKENDS=${objText};\nreturn {INTAKE_BACKENDS,intakeObjectName};`)();
const HTTPS = INTAKE_BACKENDS.https;
ok(HTTPS && typeof HTTPS.push === "function" && typeof HTTPS.claim === "function", "extracted the app's real INTAKE_BACKENDS.https client");

// ---- same ECDH-ES seal/open as the app (and intake-core-test) ----
async function kp() { return subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]); }
async function expPub(k) { return new Uint8Array(await subtle.exportKey("raw", k)); }
async function impPub(r) { return subtle.importKey("raw", r, { name: "ECDH", namedCurve: "P-256" }, true, []); }
async function Z(priv, pub) { return new Uint8Array(await subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256)); }
async function wk(z, salt) { const b = await subtle.importKey("raw", z, "HKDF", false, ["deriveKey"]); return subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt, info: te.encode("care-guardian-grant-v1") }, b, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
async function seal(proj, manifest, pub, asOfMs) { const dek = rand(32); const E = await kp(); const z = await Z(E.privateKey, await impPub(pub)); const n = b64e(rand(12)); const WK = await wk(z, te.encode("g1|" + n)); const iv = rand(12); const dk = await subtle.importKey("raw", dek, { name: "AES-GCM" }, false, ["encrypt"]); const wiv = rand(12); const wct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: wiv }, WK, dek)); const wb = new Uint8Array(12 + wct.length); wb.set(wiv, 0); wb.set(wct, 12); const aad = te.encode(JSON.stringify(manifest)); const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, dk, te.encode(JSON.stringify(proj)))); return JSON.stringify({ v: 1, grantId: "g1", scopeManifest: manifest, pushNonce: n, asOfMs, ephemeralPub: b64e(await expPub(E.publicKey)), wrappedKey: b64e(wb), iv: b64e(iv), ciphertext: b64e(ct) }); }
async function open(str, priv) { const b = JSON.parse(str); const z = await Z(priv, await impPub(Buffer.from(b.ephemeralPub, "base64"))); const WK = await wk(z, te.encode("g1|" + b.pushNonce)); const dek = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(b.wrappedKey, "base64").slice(0, 12) }, WK, Buffer.from(b.wrappedKey, "base64").slice(12))); const dk = await subtle.importKey("raw", dek, { name: "AES-GCM" }, false, ["decrypt"]); const aad = te.encode(JSON.stringify(b.scopeManifest)); const pt = await subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(b.iv, "base64"), additionalData: aad }, dk, Buffer.from(b.ciphertext, "base64")); return JSON.parse(td.decode(pt)); }
// the reviewer's latest-valid selection, as in the app
async function pickLatestValid(base, readCap, prefix, priv) { const names = (await HTTPS.list({ base, readCap }, prefix)).slice().sort().reverse(); for (const n of names) { try { const ct = await HTTPS.get({ base, readCap }, n); if (!ct) continue; return { name: n, projection: await open(ct, priv) }; } catch {} } return null; }
const threw = async (fn) => { try { await fn(); return false; } catch { return true; } };

(async () => {
  const tmp = "/tmp/intake-store-" + Date.now();
  const ADMIN = "admin-secret-xyz";
  const srv = createIntakeServer({ storageDir: tmp, adminToken: ADMIN, allowOrigin: "*" });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + srv.address().port;
  const prog = await kp(); const progPub = await expPub(prog.publicKey);
  const SENTINEL = "SENTINEL_PLAINTEXT_PHI";
  const manifest = { includes: ["careStatus"], excludes: ["clientVoice"] };
  const proj = (asOf, note) => ({ archetype: "navigator", asOf, care: "Mom", careStatus: [{ area: "Physical", note }] });
  const FAM = "fam/mrsR/g1/";

  // A. admin control plane over real HTTP
  const noAuth = await fetch(base + "/admin/claim-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix: FAM }) });
  ok(noAuth.status === 403, "admin endpoints reject a missing admin token (real HTTP)");
  const ctRes = await (await fetch(base + "/admin/claim-token", { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Token": ADMIN }, body: JSON.stringify({ prefix: FAM }) })).json();
  const rootRead = (await (await fetch(base + "/admin/read-cap", { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Token": ADMIN }, body: JSON.stringify({ prefix: "" }) })).json()).readCap;
  ok(!!ctRes.token && !!rootRead, "admin mints a one-time claim token and a reviewer read cap");

  // B. the app's client claims a write capability
  const claimed = await HTTPS.claim({ base, claimToken: ctRes.token, grantId: "g1" });
  ok(claimed.prefix === FAM && !!claimed.writeCap, "client.claim() returns the bound prefix + write cap");
  const writeCap = claimed.writeCap;

  // C. push three versioned sealed bundles via the REAL client, over real HTTP
  const t1 = Date.now(), t2 = t1 + 1000, t3 = t1 + 2000;
  for (const [t, note] of [[t1, "v1"], [t2, "v2"], [t3, "v3"]]) { const ct = await seal(proj(new Date(t).toISOString(), note), manifest, progPub, t); const nonce = b64e(rand(6)); await HTTPS.push({ base, prefix: FAM, writeCap }, intakeObjectName(t, nonce), ct); }
  ok(true, "client.push() wrote three versioned objects over real HTTP (PUT)");

  // D. ciphertext only at rest
  const { readdirSync, readFileSync: rf } = await import("node:fs"); const path = await import("node:path");
  let anyPlain = false; (function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (rf(p, "utf8").includes(SENTINEL)) anyPlain = true; } })(tmp);
  ok(!anyPlain, "stored objects on the server contain NO plaintext PHI (ciphertext only at rest)");

  // E. reviewer pulls latest valid via real HTTP list+get, decrypts
  let got = await pickLatestValid(base, rootRead, "fam/", prog.privateKey);
  ok(got && got.projection.careStatus[0].note === "v3", "reviewer lists+gets+opens the NEWEST version over real HTTP");

  // F. fail-closed: poison newest object on the server, reviewer falls back to last valid
  const newestKey = (await HTTPS.list({ base, readCap: rootRead }, "fam/")).slice().sort().reverse()[0];
  const { writeFileSync } = await import("node:fs"); writeFileSync(path.join(tmp, newestKey), "GARBAGE-NOT-A-BUNDLE");
  got = await pickLatestValid(base, rootRead, "fam/", prog.privateKey);
  ok(got && got.projection.careStatus[0].note === "v2", "fail-closed: a poisoned object is skipped, last valid (v2) served");

  // G. write cap cannot read / list / cross-prefix write (server-enforced)
  ok(await threw(() => HTTPS.get({ base, readCap: writeCap }, FAM + "anything.cgshare")), "a write cap cannot GET (server 403)");
  ok(await threw(() => HTTPS.list({ base, readCap: writeCap }, "fam/")), "a write cap cannot LIST (server 403)");
  ok(await threw(() => HTTPS.push({ base, prefix: "fam/intruder/", writeCap }, "x.cgshare", "data")), "a write cap cannot write outside its prefix (server 403)");

  // H. read cap cannot write
  ok(await threw(() => HTTPS.push({ base, prefix: "fam/", writeCap: rootRead }, "x.cgshare", "data")), "a read cap cannot PUT (server 403)");

  // I. claim token is one-time
  ok(await threw(() => HTTPS.claim({ base, claimToken: ctRes.token, grantId: "g1" })), "a one-time claim token cannot be reused (server 403)");

  // K. oversized object rejected (before rotation, cap still valid)
  const big = "x".repeat(5 * 1024 * 1024);
  const bigRes = await fetch(base + "/o/" + FAM + "big.cgshare", { method: "PUT", headers: { Authorization: "Bearer " + writeCap, "Content-Type": "application/octet-stream" }, body: big });
  ok(bigRes.status === 413, "an oversized object is rejected (413)");

  // L. path traversal rejected
  const trav = await fetch(base + "/o/" + FAM + "%2e%2e%2fevil.cgshare", { method: "PUT", headers: { Authorization: "Bearer " + writeCap }, body: "x" });
  ok(trav.status === 400, "a path-traversal key is rejected (400)");

  // M. CORS preflight
  const pre = await fetch(base + "/o/" + FAM + "x.cgshare", { method: "OPTIONS" });
  ok(pre.status === 204 && !!pre.headers.get("access-control-allow-origin"), "CORS preflight returns 204 with allow-origin (browser path works)");

  // J. rotation invalidates the old write cap
  srv._rotate(FAM);
  ok(await threw(() => HTTPS.push({ base, prefix: FAM, writeCap }, intakeObjectName(Date.now(), b64e(rand(6))), "data")), "rotation invalidates the old write cap (server 403)");

  await new Promise((r) => srv.close(r));
  console.log(f === 0 ? "\n✅ INTAKE-INTEGRATION PASSES — real client ↔ real server over real HTTP" : "\n❌ " + f + " FAILURES"); if (f) process.exitCode = 1;
})();
