# Care Guardian — Deployment Guide

## What's in this package

```
care-dashboard/
├── dist/                    ← Ready-to-deploy web app (upload this folder)
│   ├── index.html           ← Entry point
│   ├── assets/              ← Compiled JS bundle
│   ├── manifest.webmanifest ← PWA manifest
│   ├── sw.js                ← Service worker (offline support)
│   ├── icon-192.png         ← App icon
│   ├── icon-512.png         ← App icon (large)
│   └── favicon.svg          ← Browser tab icon
├── src/App.jsx              ← Source code (for development)
├── sync-server/             ← Optional self-hosted sync relay
│   ├── sync-server.js       ← Node.js server (zero dependencies)
│   ├── Dockerfile           
│   └── docker-compose.yml   
└── DEPLOY.md                ← This file
```

## Deploy the Web App (5 minutes)

The `dist/` folder is a complete static website. Upload it to any hosting service.

### Option A: GitHub Pages (free)

1. Create a GitHub repository
2. Upload the contents of `dist/` to the repository root (or a `docs/` folder)
3. Go to Settings → Pages → Source: Deploy from branch → select `main` and `/ (root)` or `/docs`
4. Your app is live at `https://yourusername.github.io/repo-name/`

### Option B: Netlify (free)

1. Go to [netlify.com](https://netlify.com), sign in with GitHub
2. Click "Add new site" → "Deploy manually"
3. Drag and drop the `dist/` folder
4. Your app is live immediately at a Netlify URL
5. Optional: add a custom domain in Site settings → Domain management

### Option C: Vercel (free)

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel --prod` from inside the `dist/` folder
3. Follow the prompts — your app is live

### Option D: Cloudflare Pages (free)

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Create a project → Upload assets → drag the `dist/` folder
3. Your app is live with Cloudflare's global CDN

### Option E: Any web server

Upload the contents of `dist/` to any web server. Nginx, Apache, Caddy — anything that can serve static files.

**Nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name care.yourdomain.com;
    root /var/www/care-dashboard;
    index index.html;
    
    # SPA routing — serve index.html for all paths
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## How Users Install the App

Once deployed, users visit your URL in their browser. The PWA will offer to install:

### Android (Chrome)
1. Visit the URL in Chrome
2. A banner appears: "Add Care Guardian to Home screen"
3. Tap "Install" → the app appears on their home screen
4. Opens full-screen, works offline

### iPhone/iPad (Safari)
1. Visit the URL in Safari
2. Tap the Share button (square with arrow)
3. Tap "Add to Home Screen"
4. The app appears on their home screen
5. Opens full-screen, works offline

### Windows/Mac/Linux (Chrome or Edge)
1. Visit the URL in Chrome or Edge
2. Click the install icon in the address bar (⊕ or download icon)
3. Click "Install"
4. The app appears in your Start Menu / Applications / Dock
5. Opens as a standalone window, works offline

## HTTPS is Required

PWAs require HTTPS. All the hosting options above (GitHub Pages, Netlify, Vercel, Cloudflare) provide free HTTPS automatically. If self-hosting, use Let's Encrypt for free certificates.

## Deploy the Sync Server (optional)

If your care team wants self-hosted sync instead of cloud folders:

### Quick start
```bash
cd sync-server/
node sync-server.js
```

### With authentication
```bash
API_KEY=your-team-secret PORT=3000 node sync-server.js
```

### Docker
```bash
cd sync-server/
docker-compose up -d
```

### Cloud deployment
Deploy to any cloud provider:
- **Railway:** connect GitHub repo, deploy automatically
- **Fly.io:** `fly launch` from the sync-server directory
- **DigitalOcean App Platform:** point to the repo
- **Any VPS:** clone, `node sync-server.js` behind Nginx with HTTPS

The sync server has zero npm dependencies — just Node.js.

## Updating the App

To update the deployed app:

1. Edit `src/App.jsx` with your changes
2. Run `npm run build` (requires Node.js + the devDependencies installed)
3. Upload the new `dist/` folder to your hosting service
4. The service worker will auto-update for all users on their next visit

## Custom Domain

All hosting services above support custom domains. Point a CNAME record to your hosting provider and configure it in their dashboard. Example:

```
care.yourfamily.com → CNAME → yourusername.github.io
```

## Offline Capability

The service worker caches all app assets on first visit. After that, the app works completely offline. Google Fonts and pdf.js (CDN) are also cached for offline use. The only features that require internet are: cloud sync, PDF.js first load, and Pull from URL.

---

## Enabling seamless cloud sync (Dropbox) — works on iOS, Android, and desktop alike

The File System Access API ("Connect a Folder") only exists on desktop Chromium browsers; every iOS browser is WebKit and lacks it. The cross-platform path that behaves identically everywhere is the user's **own cloud storage over its REST API**, because `fetch` works the same on every platform. The payload is end-to-end encrypted with the team sync passcode before upload, so the provider only ever stores ciphertext in a per-account, app-private folder — no project server, same privacy posture as the folder method.

Dropbox is the reference provider because its PKCE flow needs only a **public app key** (no secret), issues real refresh tokens to a pure browser client, and its "App Folder" scope sandboxes the app to its own folder. To enable it on your deployment:

1. Create a Dropbox app at https://www.dropbox.com/developers/apps → **Scoped access** → **App folder** access.
2. Under **Permissions**, enable `files.content.write` and `files.content.read`. (No other scopes needed.)
3. Under **Settings → OAuth 2 → Redirect URIs**, add your exact deployed origin + path, e.g. `https://careguardiantech.netlify.app/`. Add `http://localhost:5173/` too for local testing.
4. Copy the **App key** (this is public; it is safe to ship in client code) into `DROPBOX_APP_KEY` near the top of the app (the `CLOUD_PROVIDERS` block).
5. For more than a handful of users, apply for Dropbox **production** status (the dev tier caps connected accounts). This is a Dropbox dashboard step, not a code change.

How it works in the app: the user taps **Connect Dropbox**, authorizes once (the consent screen reads "Care Guardian wants access to its own folder"), and is redirected back. After they unlock, the app exchanges the code for tokens via PKCE, stores the **refresh token inside the encrypted vault** (never in plaintext), keeps the short-lived access token in memory, and refreshes silently as needed. From then on, **Sync Now** is one tap on every device signed into that Dropbox account.

**Known iOS wrinkle to test on a real device:** the one-time OAuth redirect can, on an installed (home-screen) PWA, return into Safari rather than the installed app — an Apple PWA behavior, improved in recent iOS but worth verifying. Two mitigations: (a) connect once from the Safari tab before installing to the home screen, or (b) the ongoing **Sync Now** never redirects, so only the initial connect is affected. If the redirect proves unreliable in the installed PWA for your users, a manual code-paste connect flow is the fallback to add. Adding **Google Drive** / **OneDrive** is a matter of filling the same `CLOUD_PROVIDERS` interface (auth URL, token bodies, upload/download); Drive's `drive.file` scope and OneDrive via Microsoft Graph both support browser PKCE.

**Team sync vs. personal multi-device:** Dropbox App Folder is per-account, so this is seamless for one person's own devices (the common iOS case) and for a team that shares one Dropbox login. A multi-account team with separate logins still uses a shared folder (desktop) or the manual/Share methods until shared-folder cloud sync is added.

### Adding Google Drive and OneDrive

The provider layer (`CLOUD_PROVIDERS`) now ships Dropbox, OneDrive, and Google Drive behind one interface. Each provider's "Connect" button appears automatically once its client ID is filled in (near the top of the app, beside `DROPBOX_APP_KEY`). All three use the same PKCE S256 flow, the same end-to-end encryption, and the same per-account app-private folder — only registration differs.

**OneDrive (Microsoft Graph) — clean, like Dropbox.** Register an app in the Azure portal → App registrations. Under **Authentication**, add a **Single-page application** platform with your deployed origin + path as the redirect URI (e.g. `https://careguardiantech.netlify.app/`). The SPA platform enables PKCE *and* CORS *and* refresh tokens with no client secret. Under **API permissions**, add Microsoft Graph delegated `Files.ReadWrite.AppFolder` and `offline_access`. Copy the **Application (client) ID** into `MS_CLIENT_ID`. That's it — OneDrive uses a path-addressed app folder (`special/approot`), so reads and writes are a single request like Dropbox.

**Google Drive — works, with two honest caveats.** Create an OAuth client in Google Cloud Console → Credentials. Use a **Web application** client, add your origin + path as an authorized redirect URI, and enable the Drive API. Request scope `drive.file` (the app can only ever see files *it* created — it cannot read the user's other Drive contents). Copy the **Client ID** into `GOOGLE_CLIENT_ID`. The two caveats, both real:
1. **Refresh tokens require `access_type=offline` + `prompt=consent`** (already in the auth URL). Google only returns a refresh token on the *first* consent unless `prompt=consent` forces it each time, which the code does — so "connect once" holds.
2. **Google's token endpoint requires a `client_secret` for "Web application" clients even under PKCE.** For a pure browser app this "secret" is not actually confidential (it ships in client code), which is why Google steers SPAs toward its short-lived-token GIS model instead. Two options: (a) fill `GOOGLE_CLIENT_SECRET` and accept that it is effectively public — acceptable here because the `drive.file` scope is already self-limiting and the data is end-to-end encrypted regardless; or (b) front the token exchange with a tiny serverless function that holds the secret, if you'd rather not ship it. Option (a) keeps the no-backend promise; option (b) is strictly more confidential. Drive is also file-ID-addressed rather than path-addressed, so each sync first resolves the sync file by name — slightly more API traffic than Dropbox/OneDrive, but functionally identical.

**Provider cleanliness, summarized:** Dropbox ≈ OneDrive (no secret, path-addressed app folder, one-request reads/writes) are the smoothest; Google Drive works but wants the offline+consent dance, a (effectively public) secret for web clients, and a name-resolution step. The same iOS-installed-PWA OAuth-redirect caveat noted for Dropbox applies to all three; ongoing **Sync Now** never redirects on any of them.

**What's tested vs. what needs your keys:** the offline-provable parts of all three providers — auth-URL construction, token-exchange and refresh bodies, app-folder path/file-ID addressing, and the Drive list-response parsing — are covered in `tests/cloudsync-test.mjs` (now 30+ assertions, including PKCE against the RFC 7636 vector). The live OAuth handshakes and provider API calls (and their CORS behavior) can only be exercised once you register each app and test on a real device.
