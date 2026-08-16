// Hybrid Logical Clock — pure functions + proof of causal ordering and future-DoS prevention.
function hlcLocal(prev, id, wall){ const ppt=prev?prev.pt:0; const pt=Math.max(ppt,wall); const l=(pt===ppt)?((prev?prev.l:0)+1):0; return {pt,l,id}; }
function hlcReceive(prev, remote, id, wall){
  const ppt=prev?prev.pt:0, rpt=remote?remote.pt:0; const pt=Math.max(ppt,rpt,wall); let l;
  if(pt===ppt&&pt===rpt) l=Math.max(prev?prev.l:0, remote?remote.l:0)+1;
  else if(pt===ppt) l=(prev?prev.l:0)+1; else if(pt===rpt) l=(remote?remote.l:0)+1; else l=0;
  return {pt,l,id};
}
function hlcCompare(a,b){ if(!a)return b?-1:0; if(!b)return 1; if(a.pt!==b.pt)return a.pt-b.pt; if(a.l!==b.l)return a.l-b.l; return (a.id||"")<(b.id||"")?-1:((a.id||"")>(b.id||"")?1:0); }
const FUTURE_TOL=24*60*60*1000;
// merge decision for a mutable record: does remote overwrite local?
function remoteWins(localR, remoteR, now){
  // future guard: a remote stamp implausibly far ahead is never allowed to overwrite
  if(remoteR.hlc && remoteR.hlc.pt > now+FUTURE_TOL) return false;
  const la=localR.hlc||(localR.lastModified?{pt:Date.parse(localR.lastModified),l:0,id:""}:null);
  const ra=remoteR.hlc||(remoteR.lastModified?{pt:Date.parse(remoteR.lastModified),l:0,id:""}:null);
  return hlcCompare(ra,la)>0;
}

let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log("✗ "+m)}else console.log("✓ "+m)};

// 1) honest causal ordering: device B edits after seeing A's edit → B wins regardless of equal wall clocks
let now=1_000_000;
let A={pt:0,l:0}, B={pt:0,l:0};
A=hlcLocal(A,"A",now); const recA={id:"s1",hlc:A};                 // A edits shift
B=hlcReceive(B,recA.hlc,"B",now); B=hlcLocal(B,"B",now); const recB={id:"s1",hlc:B}; // B edits after receiving A, same wall time
ok(remoteWins(recA, recB, now),"causal: B's later edit wins over A even at equal wall time");
ok(!remoteWins(recB, recA, now),"causal: A does not overwrite B's newer edit");

// 2) malicious far-future DoS is rejected
const honest={id:"s2",hlc:hlcLocal({pt:0,l:0},"H",now),lastModified:new Date(now).toISOString()};
const evil={id:"s2",hlc:{pt:Date.parse("2035-01-01"),l:0,id:"E"},lastModified:"2035-01-01T00:00:00Z"};
ok(!remoteWins(honest, evil, now),"DoS: far-future (2035) remote stamp is REJECTED, cannot overwrite");
// and the honest device can still update its own record afterward (no permanent lock)
const honest2={id:"s2",hlc:hlcLocal(honest.hlc,"H",now+1000)};
ok(hlcCompare(honest2.hlc,honest.hlc)>0,"DoS: honest device can still advance its own record (no lock)");

// 3) within-tolerance skew still resolves (slightly-ahead device wins, bounded)
const skewed={id:"s3",hlc:{pt:now+60_000,l:0,id:"S"}}; // 1 min ahead
const local3={id:"s3",hlc:{pt:now,l:0,id:"L"}};
ok(remoteWins(local3, skewed, now),"skew: minor honest skew (1 min) still resolves to newer");

// 4) legacy records (no hlc, only lastModified) still merge by time
const legA={id:"s4",lastModified:new Date(now).toISOString()};
const legB={id:"s4",lastModified:new Date(now+5000).toISOString()};
ok(remoteWins(legA, legB, now+5000),"legacy: lastModified fallback still works");

// 5) receive-advance keeps clock monotonic across rounds
let C={pt:now,l:5,id:"C"}; const adv=hlcReceive(C,{pt:now+10,l:2},"C",now);
ok(adv.pt>=now+10 && hlcCompare(adv,C)>0,"receive-advance: local clock moves past remote");

console.log(fails===0?"\n✅ ALL HLC TESTS PASS":"\n❌ "+fails+" FAILURES"); process.exit(fails?1:0);
