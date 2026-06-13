# Care Guardian — Deployment Guide (v3)

## What's in this package

```
care-dashboard-release/
├── dist/                  ← Production build. THIS is what you deploy.
├── src/App.jsx            ← Full application source (single file)
├── dashboard.jsx          ← Canonical source copy (identical to src/App.jsx)
├── index.html             ← Vite entry
├── package.json           ← Build config (v3.0.0)
├── vite.config.js         ← Vite + PWA config
├── public/                ← Icons, favicon
├── sync-server/           ← Optional self-hosted sync relay
│   ├── sync-server.js      (169 lines, zero dependencies)
│   ├── Dockerfile
│   └── docker-compose.yml
├── strategy/              ← Go-to-market materials (not deployed)
│   ├── PRIVACY-PRINCIPLES.md
│   ├── CLE-PRESENTATION.md
│   ├── Care-Guardian-Funder-Deck.pptx
│   ├── Care-Guardian-Developer-Deck.pptx
│   └── Care-Guardian-OnePager.pdf / .pptx
├── README.md              ← Technical documentation
├── HELP.md                ← User guide
├── VALUES.md              ← Values statement
├── HIPAA-COMPLIANCE.md    ← HIPAA technical-safeguards mapping
└── SECURITY-AUDIT-v2..v5.md  ← Security audit history
```

## Deploy the app (static hosting)

The app is a static Progressive Web App. Deploy the **`dist/`** folder to any static host:

**Netlify:** drag `dist/` onto the Netlify dashboard, or `netlify deploy --dir=dist --prod`
**Vercel:** `vercel deploy dist --prod` (no framework preset needed; it's static)
**GitHub Pages:** push `dist/` contents to your `gh-pages` branch
**Cloudflare Pages:** point at the repo with build output directory `dist`
**Any web server:** copy `dist/` to the document root

That's the entire deployment. No backend, no database, no environment variables. The app runs entirely in the browser with all data encrypted in the user's own IndexedDB.

### HTTPS is required

The app uses the Web Crypto API and Service Workers, both of which require a secure context. Any of the hosts above provide HTTPS automatically. If self-hosting, terminate TLS at your server.

## Rebuild from source

```bash
npm install
npm run build      # outputs to dist/
npm run preview    # serve the build locally to test
```

Requires Node 18+. The build has no network dependencies at runtime.

## Optional: self-hosted sync relay

Teams can sync through a shared cloud folder (no server) OR through this optional relay. The relay only ever stores end-to-end-encrypted blobs — it never sees plaintext.

```bash
cd sync-server
docker compose up -d        # starts on port 8787
```

Then in the app: Team → Sync → Self-hosted server → enter your relay URL (must be HTTPS).

## Storage & privacy notes

- All care data lives in the browser's IndexedDB, AES-256-GCM encrypted.
- Wrapped keys live in localStorage (~1KB); they are useless without the passcode.
- The HIPAA audit log lives in a separate IndexedDB database with its own key.
- The app requests persistent storage to resist browser eviction.
- Nothing is transmitted anywhere unless the user explicitly syncs.

## Version

3.0.0 — IndexedDB architecture, care scheduling, HIPAA audit log, five security audits.
