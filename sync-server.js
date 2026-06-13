#!/usr/bin/env node
/**
 * Care Guardian — Self-Hosted Sync Relay Server
 * 
 * A minimal encrypted blob relay. The server never sees plaintext data —
 * it stores and serves encrypted payloads that only the care team can decrypt.
 * 
 * Usage:
 *   node sync-server.js                          # defaults: port 3000, no API key
 *   PORT=8443 API_KEY=mySecret node sync-server.js  # custom port + API key auth
 *   docker-compose up                              # via Docker
 * 
 * Endpoints:
 *   GET  /api/sync/:roomId          — retrieve the current encrypted blob for a room
 *   PUT  /api/sync/:roomId          — store an encrypted blob (body: JSON with "data" field)
 *   GET  /api/health                — server health check
 * 
 * Room IDs are derived client-side from SHA-256(syncPasscode), so the server
 * never knows the passcode. Different teams get different rooms automatically.
 * 
 * Security model:
 *   - End-to-end encrypted: server stores only ciphertext
 *   - Optional API_KEY environment variable adds bearer token auth
 *   - Room IDs are opaque hashes — server can't map them to teams
 *   - Data files are stored in ./data/ directory
 *   - No logging of payload contents
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const API_KEY = process.env.API_KEY || "";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const MAX_PAYLOAD = parseInt(process.env.MAX_PAYLOAD_MB || "10", 10) * 1024 * 1024;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function sanitizeRoomId(id) {
  // Room IDs should be hex strings (SHA-256 output)
  if (!id || !/^[a-f0-9]{8,64}$/i.test(id)) return null;
  return id.toLowerCase();
}

function roomPath(roomId) {
  return path.join(DATA_DIR, roomId + ".json");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_PAYLOAD) { reject(new Error("Payload too large")); req.destroy(); return; }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function checkAuth(req) {
  if (!API_KEY) return true;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${API_KEY}`;
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  // Health check
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { status: "ok", timestamp: new Date().toISOString() });
  }

  // Auth check
  if (!checkAuth(req)) {
    return sendJson(res, 401, { error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>" });
  }

  // Route: /api/sync/:roomId
  if (parts[0] === "api" && parts[1] === "sync" && parts[2]) {
    const roomId = sanitizeRoomId(parts[2]);
    if (!roomId) return sendJson(res, 400, { error: "Invalid room ID. Must be 8-64 hex characters." });

    if (req.method === "GET") {
      const fp = roomPath(roomId);
      if (!fs.existsSync(fp)) return sendJson(res, 404, { error: "No sync data found for this room." });
      try {
        const raw = fs.readFileSync(fp, "utf8");
        const data = JSON.parse(raw);
        return sendJson(res, 200, data);
      } catch {
        return sendJson(res, 500, { error: "Failed to read sync data." });
      }
    }

    if (req.method === "PUT") {
      try {
        const body = await readBody(req);
        const payload = JSON.parse(body);
        if (!payload.data || typeof payload.data !== "string") {
          return sendJson(res, 400, { error: "Missing encrypted 'data' field." });
        }
        // Store with metadata
        const stored = {
          data: payload.data,
          encrypted: true,
          updatedAt: new Date().toISOString(),
          updatedBy: payload.deviceId || "unknown",
          updatedByName: payload.deviceName || "",
        };
        fs.writeFileSync(roomPath(roomId), JSON.stringify(stored));
        console.log(`[${new Date().toISOString()}] Room ${roomId.slice(0,8)}... updated by ${stored.updatedByName || stored.updatedBy}`);
        return sendJson(res, 200, { ok: true, updatedAt: stored.updatedAt });
      } catch (e) {
        return sendJson(res, e.message === "Payload too large" ? 413 : 400, { error: e.message });
      }
    }
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Care Guardian Sync Relay Server           ║
  ╠══════════════════════════════════════════════╣
  ║   Port:     ${String(PORT).padEnd(33)}║
  ║   Auth:     ${(API_KEY ? "API key required" : "No auth (open)").padEnd(33)}║
  ║   Data dir: ${DATA_DIR.slice(-33).padEnd(33)}║
  ║   Max size: ${(MAX_PAYLOAD / 1024 / 1024 + "MB").padEnd(33)}║
  ╠══════════════════════════════════════════════╣
  ║   Endpoints:                                 ║
  ║   GET  /api/sync/:roomId                     ║
  ║   PUT  /api/sync/:roomId                     ║
  ║   GET  /api/health                           ║
  ╠══════════════════════════════════════════════╣
  ║   Data is end-to-end encrypted.              ║
  ║   This server never sees plaintext.          ║
  ╚══════════════════════════════════════════════╝
  `);
});
