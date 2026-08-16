// ── PROOF: object-lock (WORM) on the audit/ subfolder + device revocation as a roster action ──
// WORM: once a shared-audit object is written it cannot be overwritten or deleted via the API (first write wins);
// a rewrite attempt is refused and the original stands. Revocation: an admin "roster action" cuts off a removed
// device's prefix — future writes 403, re-claims 403 — while reads (the institution's own record) still work and
// OTHER devices are unaffected. Driven against the real reference server over loopback HTTP.
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { createIntakeServer }=require("../intake-server/server.cjs");
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};

(async()=>{
  const tmp="/tmp/worm-"+Date.now(); const ADMIN="admin-xyz";
  const srv=createIntakeServer({storageDir:tmp,adminToken:ADMIN,allowOrigin:"*"});
  await new Promise(r=>srv.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+srv.address().port;
  const put=(key,cap,body)=>fetch(base+"/o/"+key,{method:"PUT",headers:{Authorization:"Bearer "+cap},body});
  const get=(key,cap)=>fetch(base+"/o/"+key,{headers:{Authorization:"Bearer "+cap}});
  const admin=(route,body,method)=>fetch(base+route,{method:method||"POST",headers:{"Content-Type":"application/json","X-Admin-Token":ADMIN},body:body?JSON.stringify(body):undefined});

  const t1=srv._addClaimToken("fam/g1/"); const c1=(await(await fetch(base+"/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:t1,grantId:"g1"})})).json()).writeCap;
  const readCap=srv._mintReadCap("");

  // ── WORM ──
  ok((await put("fam/g1/audit/000000001.cgaudit",c1,"v1-original")).status===200,"first write of an audit object succeeds");
  ok(await (await get("fam/g1/audit/000000001.cgaudit",readCap)).text()==="v1-original","the audit object reads back as written");
  const rw=await put("fam/g1/audit/000000001.cgaudit",c1,"v2-TAMPERED");
  const rwBody=await rw.json();
  ok(rw.status===200&&rwBody.immutable===true,"a rewrite of an existing audit object is refused (returned immutable)");
  ok(await (await get("fam/g1/audit/000000001.cgaudit",readCap)).text()==="v1-original","WORM holds: the original audit object is unchanged after the rewrite attempt");
  // scoping: non-audit objects are NOT write-once
  await put("fam/g1/snapshot.cgshare",c1,"first");
  await put("fam/g1/snapshot.cgshare",c1,"second");
  ok(await (await get("fam/g1/snapshot.cgshare",readCap)).text()==="second","non-audit objects are still overwritable (WORM is scoped to audit/ only)");

  // ── Revocation (roster action) ──
  const t2=srv._addClaimToken("fam/g2/"); const c2=(await(await fetch(base+"/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:t2,grantId:"g2"})})).json()).writeCap;
  ok((await put("fam/g2/x.cgshare",c2,"ok")).status===200,"a second device (fam/g2/) can write before any revocation");
  ok((await admin("/admin/revoke",{prefix:"fam/g1/"})).status===200,"admin revokes the removed device's prefix (roster action)");
  ok((await put("fam/g1/y.cgshare",c1,"poison")).status===403,"a revoked device's write is refused (403) — even with a still-valid cap");
  ok((await put("fam/g1/audit/000000002.cgaudit",c1,"poison")).status===403,"a revoked device cannot append to the audit chain either");
  ok((await put("fam/g2/z.cgshare",c2,"ok")).status===200,"revocation is scoped: the OTHER device (fam/g2/) is unaffected");
  const t1b=srv._addClaimToken("fam/g1/");
  const reclaim=await fetch(base+"/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:t1b,grantId:"g1"})});
  ok(reclaim.status===403,"a revoked prefix cannot be re-claimed (a fresh device can't slip back in)");
  ok((await get("fam/g1/audit/000000001.cgaudit",readCap)).status===200,"reads still work after revocation: the institution keeps its existing record");

  ok((await admin("/admin/reinstate",{prefix:"fam/g1/"})).status===200,"admin can reinstate a prefix");
  ok((await put("fam/g1/y.cgshare",c1,"ok-again")).status===200,"writes resume after reinstatement");
  const list=await (await admin("/admin/revocations",null,"GET")).json();
  ok(Array.isArray(list.revoked)&&list.revoked.length===0,"the revocations list reflects the reinstatement (empty)");

  // admin auth required
  ok((await fetch(base+"/admin/revoke",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prefix:"fam/g1/"})})).status===403,"revoke requires the admin token");

  // ── prefix normalization: a prefix minted WITHOUT a trailing slash must not allow sibling-prefix confusion ──
  const tNoSlash=srv._addClaimToken("fam/note"); // note: no trailing slash
  const claimedNS=await(await fetch(base+"/claim",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:tNoSlash,grantId:"note"})})).json();
  ok(claimedNS.prefix==="fam/note/","a prefix minted without a trailing slash is normalized to end with '/'");
  const cNS=claimedNS.writeCap;
  ok((await put("fam/note/x.cgshare",cNS,"ok")).status===200,"the normalized prefix accepts writes within it");
  ok((await put("fam/noteEVIL/x.cgshare",cNS,"poison")).status===403,"a sibling prefix (fam/noteEVIL/) is refused — no fam/note vs fam/noteEVIL confusion");

  await new Promise(r=>srv.close(r));
  console.log(f===0?"\n✅ WORM + REVOCATION PROOF PASSES — audit objects are write-once; removed devices are cut off, reads preserved":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
