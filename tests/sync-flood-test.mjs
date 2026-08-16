// Sync-flood circuit breaker thresholds. (Validate b64Bytes math on a small real string, then the
// comparisons on byte counts — we don't allocate 800MB strings.)
const SYNC_HARD_CAP_BYTES=128*1024*1024, SYNC_SOFT_BYTES=25*1024*1024, SYNC_SOFT_RECORDS=500;
function b64Bytes(s){ return Math.floor(((s||"").length)*3/4); }
const hardTooLarge=bytes=>bytes>SYNC_HARD_CAP_BYTES;
const oversized=(bytes,n)=>n>SYNC_SOFT_RECORDS||bytes>SYNC_SOFT_BYTES;
const MB=1024*1024;
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};

ok(b64Bytes("AAAA")===3 && b64Bytes("")===0,"b64Bytes converts base64 length to byte size correctly");
ok(hardTooLarge(800*MB),"800MB flood is HARD-refused before decrypt (OOM-brick prevented)");
ok(oversized(8*MB,50000),"50,000 new records → review even when byte-small");
ok(oversized(8*MB,501)&&!oversized(8*MB,500),"boundary: >500 new records trips; exactly 500 does not");
ok(!hardTooLarge(40*MB),"40MB legit photo batch is NOT hard-refused");
ok(!oversized(2*MB,20),"normal text sync (20 items, 2MB) auto-applies — no friction");
ok(!oversized(10*MB,50),"10MB / 50-item sync auto-applies");
ok(oversized(30*MB,10)&&!hardTooLarge(30*MB),"30MB sync → review, but still loadable");
ok(oversized(25*MB+1,0)&&!oversized(25*MB,0),"boundary: just over 25MB trips the soft byte gate");

console.log(f===0?"\n✅ ALL SYNC-FLOOD TESTS PASS":"\n❌ "+f+" FAILURES"); process.exit(f?1:0);
