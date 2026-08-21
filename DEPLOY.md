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

## Optional: automatic backup to the caregiver's cloud account

Off unless you build with a client ID. Without one, the option never appears in the app and
Care Guardian makes no external requests at all — the Google Identity Services script is
injected only when someone actually taps Connect.

Google Drive is the provider that is wired. Dropbox and OneDrive have definitions in
`App.jsx` but no redirect handler yet, so the app does not offer them.

**1. Create the OAuth client.** In the [Google Cloud console](https://console.cloud.google.com/),
create a project, enable the **Google Drive API**, then under *APIs & Services → Credentials*
create an **OAuth client ID** of type **Web application**. Add your deployed origin (e.g.
`https://care.example.org`) under *Authorised JavaScript origins*. You do **not** need a
redirect URI, and you do **not** need the client secret — this flow never uses one.

**2. Configure the consent screen** with the scope
`https://www.googleapis.com/auth/drive.file`. This scope is non-sensitive: the app can only
see files it created itself, so it requires no Google verification review and cannot read
anything else in the caregiver's Drive.

**3. Build with the ID:**

```bash
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com npm run build
```

or put it in a `.env` file at the repo root:

```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

The client ID is public by design — it ships in the bundle, which is why the flow is built
to need no secret.

| Variable | Provider | Status |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google Drive | wired |
| `VITE_DROPBOX_APP_KEY` | Dropbox | defined, not offered (no redirect handler) |
| `VITE_MS_CLIENT_ID` | OneDrive | defined, not offered (no redirect handler) |

**What the caregiver gets.** One file, `Care Guardian Backup.care`, in their own Drive,
rewritten a few seconds after anything changes. It is the same encrypted file the manual
export produces — Google holds ciphertext and a filename.

**What the session limit means.** Google has no public web client type, so its token endpoint
demands a client secret even under PKCE; a serverless app therefore cannot hold a refresh
token. Care Guardian uses the GIS token model instead: a short-lived access token, renewed
silently while the Google session is alive. In practice backup runs untouched for a working
session and resumes on the next launch without a prompt. When renewal does fail, the app
keeps recording locally and shows a Reconnect button — no data is at risk in between.

## Optional: self-hosted sync relay

Circles can sync through a shared cloud folder (no server) OR through this optional relay. The relay only ever stores end-to-end-encrypted blobs — it never sees plaintext.

```bash
cd sync-server
docker compose up -d        # starts on port 3000
```

Then in the app: ☰ menu → Circle Sync → Self-hosted server → enter your relay URL (must be HTTPS).

## Storage & privacy notes

- All care data lives in the browser's IndexedDB, AES-256-GCM encrypted.
- Wrapped keys live in localStorage (~1KB); they are useless without the passcode.
- The HIPAA audit log lives in a separate IndexedDB database with its own key.
- The app requests persistent storage to resist browser eviction.
- Nothing is transmitted anywhere unless the user explicitly syncs or connects cloud backup.
- Cloud backup uploads the same encrypted `.care` file the manual export produces. Access
  tokens are held in memory for the session only and are never written to the vault.

## Version

3.0.0 — IndexedDB architecture, care scheduling, HIPAA audit log, five security audits.
