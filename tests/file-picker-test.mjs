// file-picker-test.mjs — REGRESSION PROOF for the "Upload Document" bug class.
// Every file-picker button's onClick is EXTRACTED VERBATIM from src/App.jsx and executed against a real (jsdom) file input.
// The bug: `(ref.current && ref.current.click)()` evaluates to the click METHOD DETACHED from its element, then calls it
// with `this === undefined` (ES modules are strict), so the DOM's brand check throws and the picker never opens.
// Also asserts every file input is reachable (ref + onChange handler exist) and that handlers clear the input value on
// EVERY exit path — otherwise re-picking the SAME file fires no change event and the button appears dead.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

// ── 1. every file-picker button's onClick, extracted from the app and actually run ──
const clickers=[...src.matchAll(/onClick=\{(\(\)=>[^}]*?(\w+Ref)\.current[^}]*?\.click[^}]*?)\}/g)]
  .map(m=>({body:m[1],ref:m[2]}));
ok(clickers.length>=5,"extracted "+clickers.length+" file-picker onClick handlers from src/App.jsx");

const dom=new JSDOM(`<input id="f" type="file">`);
for(const c of clickers){
  const el=dom.window.document.createElement("input"); el.type="file";
  let fired=0; el.addEventListener("click",()=>fired++);
  let threw=null;
  try{ new Function(c.ref,"return ("+c.body+")")({current:el})(); }catch(e){ threw=e.message; }
  ok(fired===1&&!threw, c.ref+": the real onClick opens the picker"+(threw?" — THREW: "+threw:""));
}

// ── 2. the broken pattern must not reappear anywhere ──
const detached=[...src.matchAll(/\(\s*(\w+)\.current\s*&&\s*\1\.current\.(\w+)\s*\)\s*\(\)/g)];
ok(detached.length===0,"no detached-method calls remain"+(detached.length?" — found: "+detached.map(d=>d[1]+"."+d[2]).join(", "):""));

// ── 3. every file input is wired to a handler that exists ──
const inputs=[...src.matchAll(/ref=\{(\w+)\}\s+type="file"[^>]*onChange=\{([^}]+)\}/g)];
ok(inputs.length>=6,"found "+inputs.length+" file inputs, each with an onChange");
for(const [,ref,handler] of inputs){
  const name=(handler.match(/^\s*(\w+)\s*$/)||[])[1];
  if(name) ok(new RegExp("const\\s+"+name+"\\s*=").test(src), ref+" → "+name+"() is defined");
}

// ── 4. handlers must clear the input on every exit path in their OWN control flow (else re-picking the same file is
// silently dead). Returns nested inside callbacks (reader.onload, forEach) are excluded — the outer reset still runs.
function bodyOf(name){ const k=src.indexOf("const "+name+"="); if(k<0)return null; const b=src.indexOf("{",k);
  let d=0; for(let i=b;i<src.length;i++){ if(src[i]==="{")d++; else if(src[i]==="}"){d--; if(d===0)return src.slice(b,i+1);} } return null; }
// blank out nested function bodies so only the handler's own top-level flow remains
function stripNested(body){
  let out=body, guard=0;
  while(guard++<50){
    const m=/(=>\s*\{|\bfunction\s*\w*\s*\([^)]*\)\s*\{)/.exec(out.slice(1));
    if(!m) break;
    const start=1+m.index+m[0].length-1;           // index of the nested "{"
    let d=0,end=-1;
    for(let i=start;i<out.length;i++){ if(out[i]==="{")d++; else if(out[i]==="}"){d--; if(d===0){end=i;break;}} }
    if(end<0) break;
    out=out.slice(0,start)+"{/*nested*/}"+out.slice(end+1);
  }
  return out;
}
for(const h of ["handleDocUpload","handleEncryptedImport","syncPullFromFile","handleImportVCard","handleFHIRImport","handlePhotoCapture"]){
  const raw=bodyOf(h); if(!raw){ ok(false,h+" found"); continue; }
  const body=stripNested(raw);
  const resetAt=body.search(/target\.value\s*=\s*""/);
  ok(resetAt>=0, h+": clears the input after handling the file");
  // top-level returns occurring BEFORE the reset skip it; the initial "no file chosen" guard needs no reset
  const bad=[...body.matchAll(/return/g)].map(m=>m.index)
    .filter(i=>resetAt>=0 && i<resetAt)
    .filter(i=>!/if\s*\(\s*!file/.test(body.slice(Math.max(0,i-80),i)))   // the "nothing was selected" guard has nothing to reset
    .filter(i=>!/target\.value\s*=\s*""[^;]*;\s*$/.test(body.slice(Math.max(0,i-40),i)));
  ok(bad.length===0, h+": every early exit in its own flow clears the input first"+(bad.length?" — MISSING before offset "+bad[0]:""));
}

console.log(f===0?"\n✅ FILE PICKERS PROVEN — every Upload/Import button opens its picker; no detached-method calls; inputs cleared on all paths":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
