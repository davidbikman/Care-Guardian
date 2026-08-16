// wal-core.js — pure structural diff/apply for the write-ahead log.
// Guarantee under test: applyPatch(prev, diffState(prev, next)) deep-equals next, for all JSON-safe states.
// No business logic here — only generic structural deltas — so replay can never diverge from what produced `next`.

const NOCHANGE = undefined;
function clone(v){ return v===undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function isObj(v){ return v!==null && typeof v==="object" && !Array.isArray(v); }

function diffState(prev, next){
  if (prev === next) return NOCHANGE;                       // reference-equal (React immutability) → cheap no-op
  const pa = Array.isArray(prev), na = Array.isArray(next);
  const po = isObj(prev), no = isObj(next);

  // type change / primitive → wholesale set
  if (pa !== na || po !== no || (!pa && !po)) {
    return { set: clone(next) };
  }

  if (na) { // both arrays
    const pl = prev.length, nl = next.length;
    // pure append: prev is a reference-prefix of next
    if (nl >= pl) {
      let isApp = true;
      for (let i=0;i<pl;i++){ if (prev[i] !== next[i]) { isApp=false; break; } }
      if (isApp) return pl===nl ? NOCHANGE : { arrApp: clone(next.slice(pl)) };
    }
    // pure prepend: prev is a reference-suffix of next
    if (nl >= pl) {
      let isPre = true; const off = nl - pl;
      for (let i=0;i<pl;i++){ if (prev[i] !== next[off+i]) { isPre=false; break; } }
      if (isPre) return off===0 ? NOCHANGE : { arrPre: clone(next.slice(0, off)) };
    }
    // same length → per-index sub-diff
    if (pl === nl) {
      const c = {}; let any=false;
      for (let i=0;i<pl;i++){ const sp = diffState(prev[i], next[i]); if (sp!==NOCHANGE){ c[i]=sp; any=true; } }
      return any ? { arrIdx: c } : NOCHANGE;
    }
    // structural array change we don't special-case → wholesale set (correct, occasionally larger)
    return { arrSet: clone(next) };
  }

  // both plain objects
  const obj = {}; let anyObj=false;
  for (const k in next){
    if (!Object.prototype.hasOwnProperty.call(next,k)) continue;
    if (!(k in prev)) { obj[k] = { set: clone(next[k]) }; anyObj=true; }
    else { const sp = diffState(prev[k], next[k]); if (sp!==NOCHANGE){ obj[k]=sp; anyObj=true; } }
  }
  const rm = [];
  for (const k in prev){ if (Object.prototype.hasOwnProperty.call(prev,k) && !(k in next)) rm.push(k); }
  if (!anyObj && rm.length===0) return NOCHANGE;
  const patch = {};
  if (anyObj) patch.obj = obj;
  if (rm.length) patch.rm = rm;
  return patch;
}

function applyPatch(prev, patch){
  if (patch === NOCHANGE) return prev;
  if ("set" in patch) return clone(patch.set);
  if ("arrSet" in patch) return clone(patch.arrSet);
  if ("arrApp" in patch) return prev.concat(clone(patch.arrApp));
  if ("arrPre" in patch) return clone(patch.arrPre).concat(prev);
  if ("arrIdx" in patch){
    const out = prev.slice();
    for (const i in patch.arrIdx){ out[i] = applyPatch(prev[i], patch.arrIdx[i]); }
    return out;
  }
  // object patch
  const out = Array.isArray(prev) ? prev.slice() : { ...prev };
  if (patch.obj){ for (const k in patch.obj){ out[k] = applyPatch(prev[k], patch.obj[k]); } }
  if (patch.rm){ for (const k of patch.rm){ delete out[k]; } }
  return out;
}

// Apply a chain of patches to a base snapshot (replay).
function replay(base, patches){
  let s = clone(base);
  for (const p of patches){ s = applyPatch(s, p); }
  return s;
}

if (typeof module !== "undefined") module.exports = { diffState, applyPatch, replay, NOCHANGE };
