/* ───────────────────────────────────────────────────────────────────────────
   Care Guardian — reference INTAKE endpoint (the INSTITUTION's side).

   Implements the exact HTTPS contract the app's INTAKE_BACKENDS.https speaks
   (TRANSPORT-INTAKE-DESIGN.md). The store holds CIPHERTEXT ONLY — this server
   never has a program private key and cannot read a family's bundle. Its job is
   the data plane (object storage) + a minimal control plane (capability minting).

   Wire contract used by the app:
     POST /claim            {token, grantId}        -> {prefix, writeCap}
     PUT  /o/{prefix}{name} Bearer <writeCap>  body -> 204         (write-only, prefix-scoped)
     GET  /o/{prefix}?list=1 Bearer <readCap>       -> [keys...]   (read, prefix-scoped)
     GET  /o/{key}          Bearer <readCap>        -> ciphertext  (read, prefix-scoped)
   Control plane (admin; requires X-Admin-Token == ADMIN_TOKEN):
     POST /admin/claim-token {prefix}               -> {token}     (one-time; goes in an enrollment code)
     POST /admin/read-cap    {prefix}               -> {readCap}   (for a reviewer; ""=root)
     POST /admin/rotate      {prefix}               -> {epoch}     (invalidate old write caps under prefix)
     GET  /healthz                                  -> ok

   THIS IS A REFERENCE. For production: back capabilities/claim-tokens with a real
   store (Redis/DB), back objects with real object storage (S3) + lifecycle rules,
   put it behind TLS, add per-cap rate limiting, and lock ALLOW_ORIGIN to the app's
   origin. The WIRE CONTRACT above is the contract — swap the internals freely.
   ─────────────────────────────────────────────────────────────────────────── */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const tok = (p) => p + "_" + crypto.randomBytes(24).toString("base64url");
const json = (res, code, obj, cors) => { const b = Buffer.from(JSON.stringify(obj)); res.writeHead(code, { "Content-Type": "application/json", "Content-Length": b.length, ...cors }); res.end(b); };
const text = (res, code, s, cors, type) => { const b = Buffer.from(s); res.writeHead(code, { "Content-Type": type || "application/octet-stream", "Content-Length": b.length, ...cors }); res.end(b); };

// Reject anything that isn't a safe relative object key (defense-in-depth against traversal).
function safeKey(key) {
  if (typeof key !== "string" || !key) return null;
  if (key.includes("\0") || key.includes("..") || key.includes("\\") || key.startsWith("/")) return null;
  if (!/^[A-Za-z0-9._/-]+$/.test(key)) return null;
  if (key.endsWith("/")) return null; // an object key, not a folder
  return key;
}
function bearer(req) { const h = req.headers["authorization"] || ""; const m = /^Bearer\s+(.+)$/.exec(h); return m ? m[1] : null; }
function ctEq(a, b) { const x = Buffer.from(String(a == null ? "" : a)); const y = Buffer.from(String(b == null ? "" : b)); return x.length === y.length && crypto.timingSafeEqual(x, y); } // constant-time token compare (no early-exit on first differing byte)
const normPrefix = (p) => { p = String(p == null ? "" : p); if (p && !p.endsWith("/")) p += "/"; return p; }; // scopes are matched by string-prefix; a trailing slash stops fam/g1 from also matching fam/g10/

function createIntakeServer(opts = {}) {
  const STORAGE_DIR = opts.storageDir || path.join(__dirname, "storage");
  const ADMIN_TOKEN = opts.adminToken || process.env.ADMIN_TOKEN || ""; // unset => admin endpoints disabled
  const ALLOW_ORIGIN = opts.allowOrigin || process.env.ALLOW_ORIGIN || "*"; // lock this down in production
  const MAX_OBJECT_BYTES = opts.maxObjectBytes || 4 * 1024 * 1024;
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  // ── in-memory control-plane state (reference only; persist in production) ──
  const claimTokens = new Map(); // token -> {prefix, used}
  const caps = new Map();        // capToken -> {prefix, mode:"write"|"read", epoch}
  const prefixEpoch = new Map(); // prefix -> epoch (rotation)
  const revoked = new Set();     // prefixes the institution has revoked (e.g., a removed caregiver's device) — hard write block
  const epochOf = (p) => prefixEpoch.get(p) || 1;
  const isRevoked = (k) => { for (const rp of revoked) if (String(k).startsWith(rp)) return true; return false; };
  const isAuditKey = (k) => /(^|\/)audit\//.test(k); // the audit/ subfolder is write-once (WORM): first write wins, no overwrite/delete
  const SIGN_SECRET = opts.signSecret || crypto.randomBytes(32);        // HMAC key for presigned URLs (reference: per-process; prod: your bucket signs)
  const PRESIGN_TTL = opts.presignTtlMs || 60000;
  const signParts = (key, method, exp, ep, pf) => crypto.createHmac("sha256", SIGN_SECRET).update(`${key}\n${method}\n${exp}\n${ep}\n${pf}`).digest("base64url");
  const buildPresignedUrl = (host, key, method, ep, pf, ttl) => { const exp = Date.now() + (ttl == null ? PRESIGN_TTL : ttl); const sig = signParts(key, method, exp, ep, pf); return `http://${host}/presigned?key=${encodeURIComponent(key)}&m=${method}&exp=${exp}&ep=${ep}&pf=${encodeURIComponent(pf)}&sig=${sig}`; };

  const corsBase = { "Access-Control-Allow-Origin": ALLOW_ORIGIN, "Vary": "Origin" };
  const filePath = (key) => { const fp = path.join(STORAGE_DIR, key); const rel = path.relative(STORAGE_DIR, fp); if (rel.startsWith("..") || path.isAbsolute(rel)) return null; return fp; };

  function readBody(req, cap) {
    return new Promise((resolve, reject) => {
      let len = 0; const chunks = []; let over = false;
      req.on("data", (c) => { len += c.length; if (len > cap) { over = true; } else { chunks.push(c); } });
      req.on("end", () => resolve({ over, buf: over ? null : Buffer.concat(chunks) }));
      req.on("error", reject);
    });
  }
  const parseJson = async (req) => { const { over, buf } = await readBody(req, 1024 * 64); if (over || !buf) return null; try { return JSON.parse(buf.toString("utf8") || "{}"); } catch { return null; } };

  const server = http.createServer(async (req, res) => {
    const cors = { ...corsBase };
    try {
      const u = new URL(req.url, "http://x");
      const pathname = decodeURIComponent(u.pathname);

      // CORS preflight
      if (req.method === "OPTIONS") { res.writeHead(204, { ...cors, "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Admin-Token", "Access-Control-Max-Age": "600" }); res.end(); return; }

      if (pathname === "/healthz") return text(res, 200, "ok", cors, "text/plain");

      // ── control plane (admin) ──
      if (pathname.startsWith("/admin/")) {
        if (!ADMIN_TOKEN || !ctEq(req.headers["x-admin-token"], ADMIN_TOKEN)) return json(res, 403, { error: "admin auth required" }, cors);
        const body = await parseJson(req); if (!body) return json(res, 400, { error: "bad json" }, cors);
        const prefix = normPrefix(body.prefix == null ? "" : body.prefix);
        if (prefix && !/^[A-Za-z0-9._/-]*$/.test(prefix)) return json(res, 400, { error: "bad prefix" }, cors);
        if (pathname === "/admin/claim-token" && req.method === "POST") { if (!prefix) return json(res, 400, { error: "prefix required" }, cors); const t = tok("clm"); claimTokens.set(t, { prefix, used: false }); return json(res, 200, { token: t, prefix }, cors); }
        if (pathname === "/admin/read-cap" && req.method === "POST") { const c = tok("cap"); caps.set(c, { prefix, mode: "read", epoch: epochOf(prefix) }); return json(res, 200, { readCap: c, prefix }, cors); }
        if (pathname === "/admin/rotate" && req.method === "POST") { prefixEpoch.set(prefix, epochOf(prefix) + 1); return json(res, 200, { prefix, epoch: epochOf(prefix) }, cors); }
        if (pathname === "/admin/revoke" && req.method === "POST") { if (!prefix) return json(res, 400, { error: "prefix required to revoke" }, cors); revoked.add(prefix); return json(res, 200, { prefix, revoked: true }, cors); } // roster action: cut off a removed device
        if (pathname === "/admin/reinstate" && req.method === "POST") { revoked.delete(prefix); return json(res, 200, { prefix, revoked: false }, cors); }
        if (pathname === "/admin/revocations" && req.method === "GET") { return json(res, 200, { revoked: [...revoked] }, cors); }
        return json(res, 404, { error: "no such admin route" }, cors);
      }

      // ── claim: one-time token -> write-only, prefix-scoped capability ──
      if (pathname === "/claim" && req.method === "POST") {
        const body = await parseJson(req); if (!body || !body.token) return json(res, 400, { error: "token required" }, cors);
        const ct = claimTokens.get(body.token);
        if (!ct || ct.used) return json(res, 403, { error: "claim token invalid or already used" }, cors);
        if (isRevoked(ct.prefix)) return json(res, 403, { error: "prefix revoked" }, cors);
        ct.used = true;
        const c = tok("cap"); caps.set(c, { prefix: ct.prefix, mode: "write", epoch: epochOf(ct.prefix) });
        return json(res, 200, { prefix: ct.prefix, writeCap: c }, cors);
      }

      // ── presigned backend: sign-then-PUT/GET. /sign mints a short-lived signed URL; /presigned honors it. ──
      // The signature IS the authorization on /presigned (no bearer there), exactly like an S3 presigned URL.
      if (pathname === "/sign" && req.method === "POST") {
        const cap = caps.get(bearer(req) || ""); if (!cap) return json(res, 401, { error: "missing or unknown capability" }, cors);
        const body = await parseJson(req); if (!body || !body.key || !body.method) return json(res, 400, { error: "key and method required" }, cors);
        const method = String(body.method).toUpperCase(); if (method !== "PUT" && method !== "GET") return json(res, 400, { error: "method must be PUT or GET" }, cors);
        const key = safeKey(String(body.key)); if (!key) return json(res, 400, { error: "invalid object key" }, cors);
        if (method === "PUT") {
          if (cap.mode !== "write") return json(res, 403, { error: "not a write capability" }, cors);
          if (cap.epoch !== epochOf(cap.prefix)) return json(res, 403, { error: "capability rotated (stale)" }, cors);
          if (!key.startsWith(cap.prefix)) return json(res, 403, { error: "key outside capability prefix" }, cors);
          if (isRevoked(key)) return json(res, 403, { error: "write capability revoked" }, cors);
        } else { // GET
          if (cap.mode !== "read") return json(res, 403, { error: "not a read capability" }, cors);
          if (!key.startsWith(cap.prefix)) return json(res, 403, { error: "key outside capability prefix" }, cors);
        }
        const ep = method === "PUT" ? epochOf(cap.prefix) : 0;
        return json(res, 200, { url: buildPresignedUrl(req.headers.host, key, method, ep, cap.prefix) }, cors);
      }
      if (pathname === "/presigned") {
        const q = u.searchParams; const key0 = q.get("key") || "", method = q.get("m") || "", exp = q.get("exp") || "0", ep = q.get("ep") || "0", pf = q.get("pf") || "", sig = q.get("sig") || "";
        if (req.method !== method) return json(res, 405, { error: "method mismatch" }, cors);
        const expect = signParts(key0, method, exp, ep, pf);
        if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return json(res, 403, { error: "bad signature" }, cors);
        if (Date.now() > Number(exp)) return json(res, 403, { error: "url expired" }, cors);
        const key = safeKey(key0); if (!key) return json(res, 400, { error: "invalid object key" }, cors);
        if (method === "PUT") {
          if (isRevoked(key)) return json(res, 403, { error: "write capability revoked" }, cors);     // URL may predate revocation
          if (Number(ep) !== epochOf(pf)) return json(res, 403, { error: "capability rotated (stale)" }, cors); // URL may predate rotation
          let body; try { body = await readBody(req, MAX_OBJECT_BYTES); } catch (e) { throw e; }
          if (body.over) return json(res, 413, { error: "object too large" }, cors);
          const fp = filePath(key); if (!fp) return json(res, 400, { error: "invalid object key" }, cors);
          if (isAuditKey(key) && fs.existsSync(fp)) { console.log("WORM: refused overwrite of audit object " + key); return json(res, 200, { ok: true, immutable: true, key }, cors); }
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, body.buf);
          return json(res, 200, { ok: true, key }, cors);
        }
        // GET
        const fp = filePath(key); if (!fp || !fs.existsSync(fp)) return json(res, 404, { error: "not found" }, cors);
        return text(res, 200, fs.readFileSync(fp), cors, "application/octet-stream");
      }
      if (pathname === "/list" && req.method === "GET") { // presigned backend's list (bearer read cap; same scoping as /o/?list=1)
        const cap = caps.get(bearer(req) || ""); if (!cap) return json(res, 401, { error: "missing or unknown capability" }, cors);
        if (cap.mode !== "read") return json(res, 403, { error: "not a read capability" }, cors);
        const prefix = u.searchParams.get("prefix") || "";
        if (prefix && !prefix.startsWith(cap.prefix)) return json(res, 403, { error: "prefix outside capability" }, cors);
        const scope = prefix || cap.prefix || ""; const out = [];
        (function walk(dir) { let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; } for (const e of ents) { const fp = path.join(dir, e.name); const rel = path.relative(STORAGE_DIR, fp).split(path.sep).join("/"); if (e.isDirectory()) walk(fp); else if (rel.startsWith(scope)) out.push(rel); } })(STORAGE_DIR);
        return json(res, 200, out.sort(), cors);
      }

      // ── data plane: /o/... ──
      if (pathname.startsWith("/o/")) {
        const rest = pathname.slice(3); // everything after "/o/" is the key (may contain "/")
        const cap = caps.get(bearer(req) || "");
        if (!cap) return json(res, 401, { error: "missing or unknown capability" }, cors);

        if (req.method === "PUT") {
          if (cap.mode !== "write") return json(res, 403, { error: "not a write capability" }, cors);
          if (cap.epoch !== epochOf(cap.prefix)) return json(res, 403, { error: "capability rotated (stale)" }, cors);
          const key = safeKey(rest);
          if (!key) return json(res, 400, { error: "invalid object key" }, cors);
          if (!key.startsWith(cap.prefix)) return json(res, 403, { error: "key outside capability prefix" }, cors);
          if (isRevoked(key)) return json(res, 403, { error: "write capability revoked" }, cors); // roster revocation: removed device is cut off
          let body; try { body = await readBody(req, MAX_OBJECT_BYTES); } catch (e) { throw e; }
          if (body.over) return json(res, 413, { error: "object too large" }, cors);
          const buf = body.buf;
          const fp = filePath(key); if (!fp) return json(res, 400, { error: "invalid object key" }, cors);
          if (isAuditKey(key) && fs.existsSync(fp)) { console.log("WORM: refused overwrite of audit object " + key); return json(res, 200, { ok: true, immutable: true, key }, cors); } // write-once: first write wins, re-push is an idempotent no-op
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, buf);
          return json(res, 200, { ok: true, key }, cors);
        }

        if (req.method === "GET") {
          if (cap.mode !== "read") return json(res, 403, { error: "not a read capability" }, cors);
          // list
          if (u.searchParams.get("list") === "1") {
            const prefix = rest; // folder prefix (ends with "/")
            if (prefix && !prefix.startsWith(cap.prefix)) return json(res, 403, { error: "prefix outside capability" }, cors);
            const scope = prefix || cap.prefix || "";
            const out = [];
            (function walk(dir) { let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; } for (const e of ents) { const fp = path.join(dir, e.name); const rel = path.relative(STORAGE_DIR, fp).split(path.sep).join("/"); if (e.isDirectory()) walk(fp); else if (rel.startsWith(scope)) out.push(rel); } })(STORAGE_DIR);
            return json(res, 200, out.sort(), cors);
          }
          // get one object
          const key = safeKey(rest);
          if (!key) return json(res, 400, { error: "invalid object key" }, cors);
          if (!key.startsWith(cap.prefix)) return json(res, 403, { error: "key outside capability prefix" }, cors);
          const fp = filePath(key); if (!fp || !fs.existsSync(fp)) return json(res, 404, { error: "not found" }, cors);
          return text(res, 200, fs.readFileSync(fp), cors, "application/octet-stream");
        }
        return json(res, 405, { error: "method not allowed" }, cors);
      }

      return json(res, 404, { error: "not found" }, cors);
    } catch (e) {
      try { json(res, 500, { error: "server error" }, cors); } catch {}
    }
  });
  // test/admin helpers (not part of the wire contract)
  server._mintReadCap = (prefix) => { const p = normPrefix(prefix); const c = tok("cap"); caps.set(c, { prefix: p, mode: "read", epoch: epochOf(p) }); return c; };
  server._addClaimToken = (prefix) => { const p = normPrefix(prefix); const t = tok("clm"); claimTokens.set(t, { prefix: p, used: false }); return t; };
  server._rotate = (prefix) => { prefixEpoch.set(prefix, epochOf(prefix) + 1); return epochOf(prefix); };
  server._revoke = (prefix) => { revoked.add(prefix); };
  server._reinstate = (prefix) => { revoked.delete(prefix); };
  server._presignedUrl = (host, key, method, prefix, ttlMs) => buildPresignedUrl(host, key, method, epochOf(prefix || ""), prefix || "", ttlMs); // for tests (expiry/tamper)
  server._storageDir = STORAGE_DIR;
  return server;
}

module.exports = { createIntakeServer };

// CLI: `node server.js`  (PORT, ADMIN_TOKEN, ALLOW_ORIGIN, STORAGE_DIR via env)
if (require.main === module) {
  const port = Number(process.env.PORT || 8788);
  const srv = createIntakeServer({ storageDir: process.env.STORAGE_DIR });
  srv.listen(port, () => {
    console.log("Care Guardian intake endpoint on :" + port);
    console.log("  ADMIN_TOKEN " + (process.env.ADMIN_TOKEN ? "set" : "UNSET (admin endpoints disabled)"));
    console.log("  ALLOW_ORIGIN " + (process.env.ALLOW_ORIGIN || "*"));
  });
}
