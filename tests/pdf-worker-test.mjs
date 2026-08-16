// pdf-worker-test.mjs — REGRESSION PROOF for the production failure:
//   "Setting up fake worker failed: Failed to fetch dynamically imported module: /assets/pdf.worker.min-<hash>.mjs"
// Two independent defects caused it: (1) the pdf.js worker was served as a SEPARATE .mjs asset, which hosts commonly
// serve with a non-JavaScript MIME type (the browser then refuses the module), and (2) the service worker's precache
// globs omitted .mjs, so PDF scanning also failed offline in the installed PWA.
// This test proves the extraction pipeline really works on a real PDF, and locks in the loader/build invariants.
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function sliceBalanced(s,from){let d=0;for(let i=from;i<s.length;i++){if(s[i]==="{")d++;else if(s[i]==="}"){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbalanced")}
function extractFn(decl){const k=src.indexOf(decl);if(k<0)throw new Error("not found "+decl);const b=src.indexOf("{",k);return src.slice(k,b)+sliceBalanced(src,b)}

// ── A real, structurally valid PDF (correct xref offsets), built inline ──
function makePdf(lines,pages){
  const content=Buffer.from("BT /F1 12 Tf 72 720 Td "+lines.map((l,i)=>(i?"0 -20 Td ":"")+"("+l+") Tj ").join("")+"ET");
  const N=pages||1;
  // objects: 1 catalog, 2 pages, then per page: a Page and a Contents, then the font last
  const pageIds=[],contIds=[]; for(let i=0;i<N;i++){pageIds.push(3+i*2);contIds.push(4+i*2);}
  const fontId=3+N*2;
  const objs=["<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids ["+pageIds.map(i=>i+" 0 R").join(" ")+"] /Count "+N+" >>"];
  for(let i=0;i<N;i++){
    objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents "+contIds[i]+" 0 R /Resources << /Font << /F1 "+fontId+" 0 R >> >> >>");
    const c=Buffer.from("BT /F1 12 Tf 72 720 Td (Page "+(i+1)+") Tj 0 -20 Td "+lines.map(l=>"("+l+") Tj 0 -20 Td ").join("")+"ET");
    objs.push("<< /Length "+c.length+" >>\nstream\n"+c+"\nendstream");
  }
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let out=Buffer.from("%PDF-1.4\n"); const offs=[];
  objs.forEach((o,i)=>{offs.push(out.length);out=Buffer.concat([out,Buffer.from((i+1)+" 0 obj\n"+o+"\nendobj\n")])});
  const xref=out.length;
  let x="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";
  offs.forEach(o=>{x+=String(o).padStart(10,"0")+" 00000 n \n"});
  x+="trailer\n<< /Size "+(objs.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n";
  return Buffer.concat([out,Buffer.from(x)]);
}

(async()=>{
  // ── 1. the app's REAL extractPdfText, run against a real PDF ──
  const extractSrc=extractFn("async function extractPdfText(");
  ok(/extractPdfText/.test(extractSrc),"extracted the real extractPdfText from src/App.jsx");
  const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc=pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
  const timeoutSrc=extractFn("function pdfWithTimeout(");
  const constLine=src.split("\n").find(l=>l.trim().startsWith("const PDF_TIMEOUT_MS")).trim();
  const linesSrc=extractFn("function itemsToLines(");   // extraction now rebuilds line structure from pdf.js items
const run=new Function("loadPdfJs",constLine+"\n"+timeoutSrc+"\n"+linesSrc+"\n"+extractSrc+"\nreturn extractPdfText;")(async()=>pdfjs);
  const bytes=makePdf(["Metformin 500 mg twice daily","Sodium 138 mEq/L"],4); // 4 pages — the case David reported
  const text=await run({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)});
  ok(/Metformin 500 mg twice daily/.test(text),"real PDF text is extracted end-to-end");
  ok(/Sodium 138 mEq\/L/.test(text),"multi-line content is preserved");
  ok(/Page 1/.test(text)&&/Page 4/.test(text),"ALL FOUR pages are extracted, not just the first");

  // ── 2. loader invariants — the delivery that survives production ──
  const loader=extractFn("async function loadPdfJs(").replace(/\/\/[^\n]*/g,"").replace(/\/\*[\s\S]*?\*\//g,"");
  ok(/globalThis\.pdfjsWorker\s*=/.test(loader),"the worker module is registered on globalThis — pdf.js parses in-process");
  ok(!/new\s+Worker|\?worker/.test(loader),"NO Web Worker is constructed — removes the MIME, 404 and silent-hang failure classes");
  ok(!loader.includes("?url") && !loader.includes("?worker") && /workerSrc\s*=\s*""/.test(loader),"no separately-fetched worker URL is used (workerSrc is explicitly blanked)");
  const ext=extractFn("async function extractPdfText(");
  ok(/pdfWithTimeout/.test(ext),"every pdf.js await is bounded by a timeout — the spinner can never hang forever");

  // ── 3. service-worker precache must cover every extension the app actually loads ──
  const cfgPath=["../vite.config.js","../vite.config.mjs","../vite.config.ts"].map(p=>new URL(p,import.meta.url))
    .find(u=>existsSync(u));
  ok(!!cfgPath,"found the vite config");
  if(cfgPath){ const cfg=readFileSync(cfgPath,"utf8");
    const globs=(cfg.match(/globPatterns:\s*\[([^\]]*)\]/)||[])[1]||"";
    ok(/\bjs\b/.test(globs)&&/\bmjs\b/.test(globs),"precache globs cover js AND mjs (mjs was missing — offline PDF scanning was broken)");
  }

  // ── 4. build artifacts, when a build is present ──
  const dist=new URL("../dist/",import.meta.url);
  if(existsSync(dist)){
    const assets=new URL("assets/",dist);
    const files=readFileSync(new URL("../dist/sw.js",import.meta.url),"utf8");
    const names=require("fs").readdirSync(assets);
    ok(!names.some(n=>n.endsWith(".mjs")),"no .mjs asset is emitted at all — nothing for a host to mis-serve"+(names.filter(n=>n.endsWith(".mjs")).join(", ")||""));
    const jsBlobs=names.filter(n=>n.endsWith(".js")).map(n=>readFileSync(new URL(n,assets),"utf8"));
    ok(!jsBlobs.some(b=>/\/assets\/pdf\.worker[A-Za-z0-9_.-]*\.mjs/.test(b)),"no chunk references an external worker URL");
    ok(names.filter(n=>/pdf\.worker/.test(n)).length===1,"exactly ONE worker chunk ships (not duplicated across delivery modes)");
    const worker=names.find(n=>/pdf\.worker/.test(n));
    ok(!!worker&&worker.endsWith(".js"),"the worker ships as .js (a MIME type every host serves correctly)");
    // THE BUILD-BREAKER: vite-plugin-pwa treats an asset above the Workbox ceiling as a hard PLUGIN_ERROR, not a warning.
    const DEFAULT_CEILING=2*1024*1024;
    const big=names.map(n=>[n,statSync(new URL(n,assets)).size]).filter(([,sz])=>sz>DEFAULT_CEILING);
    ok(big.length===0,"no emitted asset exceeds Workbox's 2 MiB default — a larger one fails the Netlify build"+(big.length?" — oversized: "+big.map(b=>b[0]+" "+(b[1]/1048576).toFixed(2)+"MB").join(", "):""));
    ok(files.includes(worker),"the worker chunk is precached by the service worker — PDF scanning works offline");
    const urls=[...files.matchAll(/url:"([^"]+)"/g)].map(m=>m[1]);
    const missing=urls.filter(u=>{try{statSync(new URL(u.replace(/^\//,""),dist));return false}catch{return true}});
    ok(missing.length===0,"every precached URL resolves to a real file"+(missing.length?" — missing: "+missing.slice(0,3):""));
  } else console.log("… dist/ absent — build-artifact checks skipped (run `npx vite build` to include them)");


  // ── 5. it cannot hang: a pdf.js call that never settles must REJECT, not spin forever ──
  const timeoutSrc2=extractFn("function pdfWithTimeout(");
  const withTimeout=new Function(timeoutSrc2+"\nreturn pdfWithTimeout;")();
  const t0=Date.now();
  let timedOut=false;
  try { await withTimeout(new Promise(()=>{}), 300); } catch(e){ timedOut=/PDF_TIMEOUT/.test(e.message); }
  ok(timedOut && Date.now()-t0<3000,"a never-settling pdf.js promise rejects on the timeout instead of hanging the UI");
  let cleaned=false;
  try { await withTimeout(new Promise(()=>{}), 200, ()=>{cleaned=true}); } catch(e){}
  ok(cleaned,"the timeout also destroys the stalled task rather than leaking it");

  console.log(f===0?"\n✅ PDF WORKER PROVEN — real PDF extracts; worker ships as a precached .js asset under the build ceiling; no .mjs anywhere":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
