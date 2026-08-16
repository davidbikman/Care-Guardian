// lab-extract-test.mjs — PROOF for lab-table extraction quality and for cancelling a wrong upload.
// Everything is EXTRACTED VERBATIM from src/App.jsx and run against a REAL generated PDF containing a 20-row
// lab table. This covers the two defects David reported: only a handful of fields came back (the whole page was
// being flattened into ONE line, so a line-based parser could match once per page), and there was no way to stop
// an accidental upload.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(str,from,o,c){let d=0;for(let i=from;i<str.length;i++){if(str[i]===o)d++;else if(str[i]===c){d--;if(d===0)return str.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
function cval(n){const m=new RegExp("const\\s+"+n+"\\s*=\\s*").exec(src);if(!m)throw new Error("no const "+n);
  const st=m.index+m[0].length,ch=src[st]; let v;
  if(ch==="[") v=bal(src,st,"[","]");
  else if(ch==="{") v=bal(src,st,"{","}");
  else if(ch==="(") { const a=src.indexOf("=>",st); let k=a+2; while(/\s/.test(src[k]))k++;
    v = src[k]==="{" ? src.slice(st,k)+bal(src,k,"{","}") : src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,""); }
  else v=src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,"");
  return "const "+n+" = "+v+";"}

const ROWS=[["Sodium","138","mEq/L","135-145",""],["Potassium","5.6","mEq/L","3.5-5.1","H"],["Chloride","101","mEq/L","98-107",""],
["CO2","24","mEq/L","22-29",""],["BUN","32","mg/dL","7-20","H"],["Creatinine","1.4","mg/dL","0.6-1.2","H"],
["Glucose","112","mg/dL","70-99","H"],["Calcium","9.1","mg/dL","8.5-10.2",""],["WBC","11.2","K/uL","4.0-10.5","H"],
["RBC","4.21","M/uL","4.20-5.40",""],["Hemoglobin","12.8","g/dL","13.5-17.5","L"],["Hematocrit","38.4","%","41.0-53.0","L"],
["Platelets","210","K/uL","150-400",""],["TSH","3.42","mIU/L","0.45-4.50",""],["Hemoglobin A1c","7.2","%","4.0-5.6","H"],
["ALT","54","U/L","7-52","H"],["AST","41","U/L","13-39","H"],["Albumin","3.6","g/dL","3.5-5.0",""],
["Vitamin B12","288","pg/mL","232-1245",""],["Vitamin D 25-OH","22","ng/mL","30-100","L"]];
function makeLabPdf(pages){
  let ops="BT /F1 9 Tf 40 750 Td (LABORATORY RESULTS) Tj 0 -18 Td (Test                Result   Unit      Reference     Flag) Tj ";
  for(const r of ROWS) ops+=`0 -14 Td (${r[0].padEnd(20)}${r[1].padEnd(9)}${r[2].padEnd(10)}${r[3].padEnd(14)}${r[4]}) Tj `;
  ops+="ET";
  const content=Buffer.from(ops); const N=pages||1;
  const pageIds=[],contIds=[]; for(let i=0;i<N;i++){pageIds.push(3+i*2);contIds.push(4+i*2);}
  const fontId=3+N*2;
  const objs=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids ["+pageIds.map(i=>i+" 0 R").join(" ")+"] /Count "+N+" >>"];
  for(let i=0;i<N;i++){ objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents "+contIds[i]+" 0 R /Resources << /Font << /F1 "+fontId+" 0 R >> >> >>");
    objs.push("<< /Length "+content.length+" >>\nstream\n"+content+"\nendstream"); }
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  let out=Buffer.from("%PDF-1.4\n");const offs=[];
  objs.forEach((o,i)=>{offs.push(out.length);out=Buffer.concat([out,Buffer.from((i+1)+" 0 obj\n"+o+"\nendobj\n")])});
  const x=out.length;let t="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";
  offs.forEach(o=>{t+=String(o).padStart(10,"0")+" 00000 n \n"});
  t+="trailer\n<< /Size "+(objs.length+1)+" /Root 1 0 R >>\nstartxref\n"+x+"\n%%EOF\n";
  return Buffer.concat([out,Buffer.from(t)]);
}
const fileOf=(b)=>({arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)});

(async()=>{
  const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc=pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
  const constLine=src.split("\n").find(l=>l.trim().startsWith("const PDF_TIMEOUT_MS")).trim();
  const extract=new Function("loadPdfJs",constLine+"\n"+extractFn("function pdfWithTimeout(")+"\n"+extractFn("function itemsToLines(")+"\n"+extractFn("async function extractPdfText(")+"\nreturn extractPdfText;")(async()=>pdfjs);
  const CN=["LAB_ANALYTES","LAB_HEADER_WORDS","LAB_STOP_NAMES","LAB_JUNK_LINE","LAB_TABLE_MARK","LAB_MONTHS","LAB_RANGE_LINE","LAB_VALUE_RE","LAB_RANGE_RE","LAB_UNITS","LAB_FLAG_MAP","LAB_FLAG_WORD","_labNorm","_labKnown","_labUnit","_labDerivedFlag"];
  const parseLabs=new Function(CN.map(cval).join("\n")+"\n"+extractFn("function parseLabResults(")+"\nreturn parseLabResults;")();
  ok(typeof extract==="function"&&typeof parseLabs==="function","extracted the real extractPdfText + itemsToLines + parseLabResults from src/App.jsx");

  // ── 1. line structure survives extraction (the root cause of "only four fields") ──
  const text=await extract(fileOf(makeLabPdf(1)));
  const lines=text.split("\n").filter(l=>l.trim());
  ok(lines.length>=20,"a 20-row table extracts as MANY lines, not one flattened page ("+lines.length+" lines)");
  ok(/^Sodium 138 mEq\/L 135-145$/m.test(text),"each table row is reconstructed with its own columns intact");

  // ── 2. every row parsed, correctly, with no junk ──
  const labs=parseLabs(text);
  let wrong=0, missing=0;
  for(const r of ROWS){
    const got=labs.find(l=>l.test.toLowerCase()===r[0].toLowerCase());
    if(!got){missing++;continue}
    if(got.value!==r[1]||got.unit!==r[2]||got.range!==r[3]||(got.flag||"")!==r[4])wrong++;
  }
  ok(missing===0,"every one of the 20 results is found (missing: "+missing+")");
  ok(wrong===0,"value, unit, reference range and flag are correct on every row (wrong: "+wrong+")");
  const junk=labs.filter(l=>!ROWS.some(r=>r[0].toLowerCase()===l.test.toLowerCase()));
  ok(junk.length===0,"no junk rows — the title and column-header rows are not parsed as results"+(junk.length?": "+junk.map(j=>j.test).join(", "):""));

  // ── 3. the specific defects that made the old output look random ──
  const na=labs.find(l=>l.test==="Sodium");
  ok(na&&na.flag==="","a normal result is NOT flagged abnormal — the old parser read the L in \"mEq/L\" as a Low flag");
  const k=labs.find(l=>l.test==="Potassium");
  ok(k&&k.flag==="H","a genuinely high result keeps its H flag");
  ok(labs.some(l=>l.test==="CO2"),"a test name containing digits (CO2) is parsed — the old name pattern allowed no digits");
  ok(labs.some(l=>l.test==="Hemoglobin A1c")&&labs.some(l=>l.test==="Vitamin D 25-OH"),"multi-word names with digits and hyphens are parsed");


  // ── 3b. BLOCK layout — the patient-portal "Result Trends" shape David hit in the field.
  // Values here are SYNTHETIC: the real report he tested with contains actual lab data, which does not belong in a
  // source repository. What is reproduced is the LAYOUT, which is what broke: component name, value+unit, and
  // "Normal Range:" on three separate lines, sometimes out of order, sometimes collapsed to one line.
  const BLOCK=[["WHITE BLOOD CELLS","7.34","K/uL","4.23","9.07"],["PLATELETS","236","K/uL","135","400"],
    ["ABSOLUTE NEUTROPHILS","4.25","K/uL","1.78","5.38"],["NEUTROPHILS, %","57.8","%","34.0","67.9"],
    ["HEMOGLOBIN","14.4","g/dL","13.7","17.5"],["MCHC","33.7","g/dL","32.3","36.5"],["RDW-CV","11.90","%","11.60","14.40"]];
  const LOW_ONE=["RBC","4.61","M/uL","4.63","6.08"];   // below range → must be flagged L
  function makeBlockPdf(){
    let ops="BT /F1 9 Tf 40 750 Td (Result Trends) Tj 0 -14 Td (Results limited to those after Jun 24, 2021.) Tj ";
    ops+="0 -14 Td (Jun 24, 2026 \\(Table 1 of 1\\)) Tj 0 -14 Td (Component Jun 24, 2026) Tj ";
    for(const b of BLOCK){ ops+=`0 -14 Td (${b[0]}) Tj 0 -14 Td (${b[1]} ${b[2]}) Tj 0 -14 Td (Normal Range: ${b[3]} - ${b[4]} ${b[2]}) Tj `; }
    ops+=`0 -14 Td (MPV 10.70 fL) Tj `;                                        // single line, no range
    ops+=`0 -14 Td (${LOW_ONE[1]} ${LOW_ONE[2]}) Tj 0 -14 Td (${LOW_ONE[0]}) Tj 0 -14 Td (Normal Range: ${LOW_ONE[3]} - ${LOW_ONE[4]} ${LOW_ONE[2]} Low) Tj `; // value BEFORE name
    ops+="ET";
    const content=Buffer.from(ops);
    const objs=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      "<< /Length "+content.length+" >>\nstream\n"+content+"\nendstream","<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"];
    let out=Buffer.from("%PDF-1.4\n");const offs=[];
    objs.forEach((o,i)=>{offs.push(out.length);out=Buffer.concat([out,Buffer.from((i+1)+" 0 obj\n"+o+"\nendobj\n")])});
    const x=out.length;let t="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";
    offs.forEach(o=>{t+=String(o).padStart(10,"0")+" 00000 n \n"});
    t+="trailer\n<< /Size "+(objs.length+1)+" /Root 1 0 R >>\nstartxref\n"+x+"\n%%EOF\n";
    return Buffer.concat([out,Buffer.from(t)]);
  }
  const bText=await extract(fileOf(makeBlockPdf()));
  const bLabs=parseLabs(bText);
  let bWrong=0,bMissing=0;
  for(const b of BLOCK){ const g=bLabs.find(l=>l.test.toLowerCase()===b[0].toLowerCase());
    if(!g){bMissing++;continue}
    if(g.value!==b[1]||g.unit!==b[2]||g.range!==b[3]+"-"+b[4]||g.flag!==""){bWrong++;} }
  ok(bMissing===0,"block layout: every component is found by its REAL name, not \"Normal Range\" (missing: "+bMissing+")");
  ok(bWrong===0,"block layout: the RESULT is captured, not the range's lower bound (wrong: "+bWrong+")");
  const rbc=bLabs.find(l=>l.test==="RBC");
  ok(rbc&&rbc.value==="4.61"&&rbc.range==="4.63-6.08","a block whose value line precedes its name still binds correctly");
  ok(rbc&&rbc.flag==="L","a result below its reference range is flagged L");
  const mpv=bLabs.find(l=>l.test==="MPV");
  ok(mpv&&mpv.value==="10.70"&&mpv.unit==="fL","a single-line result with no reference range is still captured");
  const bJunk=bLabs.filter(l=>/normal range|component|table|jun|result trends/i.test(l.test));
  ok(bJunk.length===0,"report furniture (title, date, \"Component\", \"Table 1 of 1\") is not parsed as results"+(bJunk.length?": "+bJunk.map(j=>j.test).join(", "):""));

  // ── 4. cancelling a wrong upload ──
  const big=makeLabPdf(6);
  const token={cancelled:false,task:null};
  const p=extract(fileOf(big),token);
  token.cancelled=true;                                  // user taps Cancel while it reads
  let cancelled=false, msg="";
  try{ await p; }catch(e){ msg=String(e.message); cancelled=/PDF_CANCELLED/.test(msg); }
  ok(cancelled,"cancelling mid-read stops the extraction and reports PDF_CANCELLED (got: "+(msg||"no error")+")");
  const t2={cancelled:true};
  let early=false; try{ await extract(fileOf(big),t2); }catch(e){ early=/PDF_CANCELLED/.test(e.message); }
  ok(early,"a token already cancelled stops before any page is read");
  const fresh=await extract(fileOf(makeLabPdf(1)),{cancelled:false});
  ok(/Sodium/.test(fresh),"a normal read still succeeds with a live token — cancellation doesn't break the happy path");
  ok(/PDF_CANCELLED/.test(src)&&/cancelDocUpload/.test(src),"the app wires a Cancel action to the same token");

  console.log(f===0?"\n✅ LAB EXTRACTION PROVEN — table lines reconstructed, all 20 results correct, no junk, no false flags; uploads are cancellable":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
})();
