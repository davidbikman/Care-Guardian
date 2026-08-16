// Cloud-storage sync: prove the testable-without-network pieces.
// 1) PKCE S256 against the RFC 7636 Appendix B known-answer vector (deterministic).
// 2) Access-token refresh decision (expiry math).
// 3) Dropbox request construction (auth URL params, Dropbox-API-Arg, token bodies).
// The PULL→merge→PUSH middle is the SAME mergeWithClock/encrypt path proven in wal-sim and zone-core; not re-tested here.
function b64url(bytes){ let s=Buffer.from(bytes).toString("base64"); return s.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
async function pkceChallengeFor(verifier){ const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)); return b64url(new Uint8Array(d)); }

const DROPBOX_APP_KEY="testkey123";
const CLOUD_PROVIDERS={ dropbox:{
  authUrl:({challenge,state,redirectUri})=>`https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(DROPBOX_APP_KEY)}&response_type=code&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&token_access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`,
  exchangeBody:({code,verifier,redirectUri})=>new URLSearchParams({code,grant_type:"authorization_code",code_verifier:verifier,client_id:DROPBOX_APP_KEY,redirect_uri:redirectUri}),
  refreshBody:(rt)=>new URLSearchParams({grant_type:"refresh_token",refresh_token:rt,client_id:DROPBOX_APP_KEY}),
}};
const CLOUD_SYNC_PATH="/care-guardian-sync.json";
const dbxArg=(path,upload)=>upload?JSON.stringify({path,mode:"overwrite",mute:true}):JSON.stringify({path});

// refresh decision: token valid iff present AND expiresAt in the future
const needsRefresh=(cur,now)=>!(cur&&cur.accessToken&&cur.expiresAt>now);

let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};
(async()=>{
  // ── RFC 7636 Appendix B known-answer vector ──
  const RFC_VERIFIER="dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const RFC_CHALLENGE="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  ok(await pkceChallengeFor(RFC_VERIFIER)===RFC_CHALLENGE,"PKCE S256 matches the RFC 7636 known-answer vector (our challenge derivation is correct)");
  // verifier shape: url-safe, 43–128 chars
  const v=b64url(crypto.getRandomValues(new Uint8Array(64)));
  ok(v.length>=43&&v.length<=128&&/^[A-Za-z0-9\-_]+$/.test(v),"generated verifier is URL-safe and within the 43–128 length bound (len="+v.length+")");
  // challenge is deterministic for a given verifier and differs across verifiers
  ok(await pkceChallengeFor(v)===await pkceChallengeFor(v),"challenge is deterministic for a given verifier");
  ok(await pkceChallengeFor(v)!==await pkceChallengeFor(b64url(crypto.getRandomValues(new Uint8Array(64)))),"different verifiers yield different challenges");

  // ── refresh decision ──
  const now=1_000_000;
  ok(needsRefresh(null,now),"no token yet → refresh");
  ok(needsRefresh({accessToken:"x",expiresAt:now-1},now),"expired token → refresh");
  ok(!needsRefresh({accessToken:"x",expiresAt:now+1},now),"unexpired token → reuse (no needless refresh)");

  // ── Dropbox request construction ──
  const url=CLOUD_PROVIDERS.dropbox.authUrl({challenge:RFC_CHALLENGE,state:"st&ate",redirectUri:"https://app.example/care?x=1"});
  const u=new URL(url);
  ok(u.origin+u.pathname==="https://www.dropbox.com/oauth2/authorize","auth URL points at the Dropbox authorize endpoint");
  ok(u.searchParams.get("code_challenge_method")==="S256"&&u.searchParams.get("code_challenge")===RFC_CHALLENGE,"auth URL carries S256 + the challenge");
  ok(u.searchParams.get("token_access_type")==="offline","auth URL requests offline access (so we get a refresh token)");
  ok(u.searchParams.get("redirect_uri")==="https://app.example/care?x=1"&&u.searchParams.get("state")==="st&ate","redirect_uri and state are correctly percent-encoded and round-trip");
  ok(u.searchParams.get("response_type")==="code","authorization-code flow (not implicit)");

  const xb=CLOUD_PROVIDERS.dropbox.exchangeBody({code:"AUTHCODE",verifier:RFC_VERIFIER,redirectUri:"https://app.example/care"});
  const xp=new URLSearchParams(xb.toString());
  ok(xp.get("grant_type")==="authorization_code"&&xp.get("code")==="AUTHCODE"&&xp.get("code_verifier")===RFC_VERIFIER&&!xp.has("client_secret"),"token-exchange body uses PKCE verifier and carries NO client secret (public client)");
  const rb=new URLSearchParams(CLOUD_PROVIDERS.dropbox.refreshBody("REFRESH").toString());
  ok(rb.get("grant_type")==="refresh_token"&&rb.get("refresh_token")==="REFRESH"&&!rb.has("client_secret"),"refresh body uses the refresh token, no secret");

  ok(dbxArg(CLOUD_SYNC_PATH,true)==='{"path":"/care-guardian-sync.json","mode":"overwrite","mute":true}',"upload Dropbox-API-Arg overwrites in place, muted (no notification spam)");
  ok(dbxArg(CLOUD_SYNC_PATH,false)==='{"path":"/care-guardian-sync.json"}',"download Dropbox-API-Arg targets the app-folder sync file");
  // Header value must be Latin-1 safe (Dropbox-API-Arg is an HTTP header)
  ok(/^[\x00-\xFF]*$/.test(dbxArg(CLOUD_SYNC_PATH,true)),"Dropbox-API-Arg is header-safe (Latin-1)");

  console.log(fails===0?"\n✅ ALL CLOUD-SYNC (testable-offline) TESTS PASS":"\n❌ "+fails+" FAILURES"); if(fails)process.exitCode=1;
})();

// ── Google Drive + OneDrive provider construction (offline-provable parts) ──
(async()=>{
  let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
  const GOOGLE_CLIENT_ID="gid.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET="gsecret", MS_CLIENT_ID="ms-uuid";
  const enc=encodeURIComponent;
  const P={
    onedrive:{
      authUrl:({challenge,state,redirectUri})=>`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${enc(MS_CLIENT_ID)}&response_type=code&redirect_uri=${enc(redirectUri)}&scope=${enc("Files.ReadWrite.AppFolder offline_access")}&code_challenge=${enc(challenge)}&code_challenge_method=S256&state=${enc(state)}`,
      exchangeBody:({code,verifier,redirectUri})=>new URLSearchParams({code,grant_type:"authorization_code",code_verifier:verifier,client_id:MS_CLIENT_ID,redirect_uri:redirectUri,scope:"Files.ReadWrite.AppFolder offline_access"}),
      refreshBody:(rt)=>new URLSearchParams({grant_type:"refresh_token",refresh_token:rt,client_id:MS_CLIENT_ID,scope:"Files.ReadWrite.AppFolder offline_access"}),
      uploadUrl:(path)=>`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${enc(path.replace(/^\//,""))}:/content`,
    },
    googledrive:{
      authUrl:({challenge,state,redirectUri})=>`https://accounts.google.com/o/oauth2/v2/auth?client_id=${enc(GOOGLE_CLIENT_ID)}&response_type=code&scope=${enc("https://www.googleapis.com/auth/drive.file")}&code_challenge=${enc(challenge)}&code_challenge_method=S256&redirect_uri=${enc(redirectUri)}&state=${enc(state)}&access_type=offline&prompt=consent`,
      exchangeBody:({code,verifier,redirectUri})=>{const p={code,grant_type:"authorization_code",code_verifier:verifier,client_id:GOOGLE_CLIENT_ID,redirect_uri:redirectUri};if(GOOGLE_CLIENT_SECRET)p.client_secret=GOOGLE_CLIENT_SECRET;return new URLSearchParams(p);},
      listUrl:(name)=>`https://www.googleapis.com/drive/v3/files?q=${enc(`name='${name}' and trashed=false`)}&spaces=drive&fields=files(id,name)`,
      parseList:(j)=>(j.files&&j.files[0]&&j.files[0].id)||null,
    },
  };

  // OneDrive
  const odu=new URL(P.onedrive.authUrl({challenge:"CH",state:"ST",redirectUri:"https://app.example/care"}));
  ok(odu.origin+odu.pathname==="https://login.microsoftonline.com/common/oauth2/v2.0/authorize","OneDrive auth URL targets the MS v2 authorize endpoint");
  ok(odu.searchParams.get("scope").includes("Files.ReadWrite.AppFolder")&&odu.searchParams.get("scope").includes("offline_access"),"OneDrive requests the app-folder scope + offline_access (refresh token)");
  ok(odu.searchParams.get("code_challenge_method")==="S256","OneDrive uses S256 PKCE");
  const odx=new URLSearchParams(P.onedrive.exchangeBody({code:"C",verifier:"V",redirectUri:"R"}).toString());
  ok(!odx.has("client_secret")&&odx.get("code_verifier")==="V","OneDrive token exchange is secret-less (SPA PKCE)");
  ok(P.onedrive.uploadUrl("/care-guardian-sync.json")==="https://graph.microsoft.com/v1.0/me/drive/special/approot:/care-guardian-sync.json:/content","OneDrive upload/download path addresses the app's own approot folder");

  // Google Drive
  const gdu=new URL(P.googledrive.authUrl({challenge:"CH",state:"ST",redirectUri:"https://app.example/care"}));
  ok(gdu.origin+gdu.pathname==="https://accounts.google.com/o/oauth2/v2/auth","Drive auth URL targets Google's v2 auth endpoint");
  ok(gdu.searchParams.get("scope")==="https://www.googleapis.com/auth/drive.file","Drive requests drive.file (app sees only files it creates)");
  ok(gdu.searchParams.get("access_type")==="offline"&&gdu.searchParams.get("prompt")==="consent","Drive requests offline+consent (required for a refresh token)");
  const gdx=new URLSearchParams(P.googledrive.exchangeBody({code:"C",verifier:"V",redirectUri:"R"}).toString());
  ok(gdx.get("code_verifier")==="V"&&gdx.get("client_secret")==="gsecret","Drive exchange carries the verifier and (when set) the client secret Google's web client requires");
  ok(P.googledrive.listUrl("care-guardian-sync.json").includes("q=")&&P.googledrive.listUrl("care-guardian-sync.json").includes("trashed%3Dfalse"),"Drive resolves the file by name, excluding trashed");
  ok(P.googledrive.parseList({files:[{id:"FILEID",name:"x"}]})==="FILEID","Drive parses the fileId out of a list response");
  ok(P.googledrive.parseList({files:[]})===null&&P.googledrive.parseList({})===null,"Drive returns null when the sync file doesn't exist yet (→ first upload creates it)");

  // All three providers reuse the SAME PKCE S256 derivation already verified against RFC 7636 above.
  console.log(f===0?"✅ GOOGLE DRIVE + ONEDRIVE PROVIDER TESTS PASS":"❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
