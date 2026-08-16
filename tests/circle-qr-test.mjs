// circle-qr-test.mjs — PROOF that the QR pipeline carries the pairing payloads losslessly (encode → decode), using the same
// libraries the app loads (qrcode + jsqr). The camera FRAME CAPTURE is the device-QA piece; this proves the codes themselves
// round-trip a realistic, full-size QR#1 and QR#2 (incl. roster + relay config).
import QRCode from "qrcode";
import jsQR from "jsqr";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const b64=n=>Buffer.from(crypto.getRandomValues(new Uint8Array(n))).toString("base64");
function roundTrip(payload){ const qr=QRCode.create(payload,{errorCorrectionLevel:"L"}); const size=qr.modules.size, d=qr.modules.data; const M=4,S=6,dim=(size+2*M)*S; const rgba=new Uint8ClampedArray(dim*dim*4).fill(255);
  for(let r=0;r<size;r++)for(let c=0;c<size;c++){ if(d[r*size+c]){ for(let y=0;y<S;y++)for(let x=0;x<S;x++){ const p=((((r+M)*S+y)*dim)+((c+M)*S+x))*4; rgba[p]=0;rgba[p+1]=0;rgba[p+2]=0;rgba[p+3]=255; } } }
  const dec=jsQR(rgba,dim,dim); return {dec,version:qr.version}; }
// QR#1 (joining device → host): ephemeral + device pubkeys + id + label
const qr1=JSON.stringify({v:1,eph:b64(65),dev:b64(65),id:"dev-"+b64(6).slice(0,8),label:"My phone"});
// QR#2 (host → joiner): wrapped key handoff + circle meta + roster + relay handoff — the larger payload
const qr2=JSON.stringify({v:1,eApub:b64(65),salt:b64(16),wrap:b64(60),circleId:"circle-abcd1234",epoch:0,
  roster:[{deviceId:"dev-aaa",pub:b64(65),label:"Mom's phone",addedAt:"2026-06-01T00:00:00Z"},{deviceId:"dev-bbb",pub:b64(65),label:"Tablet",addedAt:"2026-06-01T00:00:00Z"}],
  relay:{base:"https://relay.example.org",claimToken:"clm-"+b64(18),readCap:"cap-"+b64(18)}});

const r1=roundTrip(qr1);
ok(r1.dec && r1.dec.data===qr1, "QR#1 encodes and decodes losslessly ("+qr1.length+" bytes, version "+r1.version+")");
const r2=roundTrip(qr2);
ok(r2.dec && r2.dec.data===qr2, "QR#2 (incl. roster + relay) encodes and decodes losslessly ("+qr2.length+" bytes, version "+r2.version+")");
ok(r2.version<=25, "the full QR#2 stays within a comfortably scannable version (v"+r2.version+" ≤ 25)");

console.log(f===0?"\n✅ QR PIPELINE PROVEN — pairing payloads round-trip through encode/decode; camera capture remains device-QA":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
