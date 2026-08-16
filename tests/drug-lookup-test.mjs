// drug-lookup-test.mjs — PROOF for drug-name autocomplete and STRENGTH VALIDATION. Logic EXTRACTED VERBATIM from
// src/App.jsx. The governing rule under test: this feature confirms what you typed is a real strength of a real
// drug, and NEVER suggests a dose or prevents you recording what was actually prescribed.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
function bal(s,from,o,c){let d=0;for(let i=from;i<s.length;i++){if(s[i]===o)d++;else if(s[i]===c){d--;if(d===0)return s.slice(from,i+1)}}throw new Error("unbal")}
function extractFn(dec){const k=src.indexOf(dec);if(k<0)throw new Error("not found "+dec);const b=src.indexOf("{",k);return src.slice(k,b)+bal(src,b,"{","}")}
function cval(n){const m=new RegExp("const\\s+"+n+"\\s*=\\s*").exec(src);if(!m)throw new Error("no const "+n);
  const st=m.index+m[0].length,ch=src[st]; let v;
  if(ch==="[") v=bal(src,st,"[","]"); else if(ch==="{") v=bal(src,st,"{","}");
  else if(ch==="(") { const a=src.indexOf("=>",st); let k=a+2; while(/\s/.test(src[k]))k++;
    v = src[k]==="{" ? src.slice(st,k)+bal(src,k,"{","}") : src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,""); }
  else v=src.slice(st,src.indexOf("\n",st)).replace(/;\s*$/,"");
  return "const "+n+" = "+v+";"}
const M=new Function([cval("DRUG_TABLE"),cval("drugNorm"),cval("drugFind"),
  extractFn("function drugSearch("),extractFn("function drugNormStrength("),extractFn("function drugValidateDose(")].join("\n")+
  "\nreturn {DRUG_TABLE,drugSearch,drugFind,drugNormStrength,drugValidateDose};")();
ok(typeof M.drugSearch==="function","extracted the real drug lookup from src/App.jsx");

// ── autocomplete ──
let r=M.drugSearch("donep",8);
ok(r.length>0&&r[0].drug.n==="Donepezil","typing a partial generic name surfaces the drug ('donep' → Donepezil)");
r=M.drugSearch("aricept",8);
ok(r.length>0&&r[0].drug.n==="Donepezil"&&/Aricept/i.test(r[0].via),"a BRAND name finds the generic, and says which brand matched");
r=M.drugSearch("meto",8);
ok(r.some(x=>/Metoprolol tartrate/.test(x.drug.n))&&r.some(x=>/succinate/.test(x.drug.n)),"an ambiguous stem offers both salts rather than picking one");
ok(M.drugSearch("z",8).length===0,"a single character doesn't dump the whole formulary");
ok(M.drugSearch("",8).length===0&&M.drugSearch(null,8).length===0,"empty input is safe");
ok(M.drugSearch("QUETIAPINE",8)[0].drug.n==="Quetiapine","matching is case-insensitive");
ok(M.drugSearch("carbidopa levodopa",8)[0].drug.n==="Carbidopa-Levodopa","punctuation differences don't defeat the match");
const exact=M.drugSearch("memantine",8);
ok(exact[0].drug.n==="Memantine","an exact generic outranks the extended-release variant that also matches");

// ── strength normalisation ──
const N=M.drugNormStrength;
ok(N("500 mg")===N("500mg")&&N("500 mg")===N("500 MG"),"spacing and case don't change a strength");
ok(N("0.5 g")===N("500 mg"),"grams are converted to milligrams");
ok(N("100 mcg")!==N("100 mg"),"micrograms and milligrams are kept DISTINCT — a 1000× error is the one that kills");
ok(N("1000 unit")===N("1000 units")&&N("1000 iu")===N("1000 unit"),"unit / units / IU are treated as the same unit");
ok(N("25-100 mg")===N("25-100mg"),"combination-product strengths normalise too");

// ── validation: the whole point ──
let v=M.drugValidateDose("Donepezil","10 mg");
ok(v.status==="match","a real strength of a real drug validates");
v=M.drugValidateDose("Aricept","10mg");
ok(v.status==="match","validation works via the brand name and sloppy spacing");
v=M.drugValidateDose("Donepezil","7 mg");
ok(v.status==="unknown-strength","a strength the drug isn't made in is flagged");
ok(Array.isArray(v.known)&&v.known.indexOf("10 mg")>=0,"…and the real strengths are offered for comparison");
v=M.drugValidateDose("Levothyroxine","88 mcg");
ok(v.status==="match","an awkward real-world strength (levothyroxine 88 mcg) validates");
v=M.drugValidateDose("Levothyroxine","88 mg");
ok(v.status==="unknown-strength","the same number in the WRONG UNIT is caught");

// ── half tablets: ordinary practice, must not read as an error ──
v=M.drugValidateDose("Donepezil","2.5 mg");
ok(v.status==="unknown-strength"&&v.half===true,"half of a real tablet is recognised as plausible, not simply wrong");
v=M.drugValidateDose("Quetiapine","12.5 mg");
ok(v.half===true,"half a 25 mg quetiapine tablet — very common in this population — is recognised");

// ── silence when we can't know ──
v=M.drugValidateDose("Some Compounded Cream","3 mg");
ok(v.status==="no-drug","a drug we don't list produces NO verdict — the app doesn't cast doubt on what it can't check");
v=M.drugValidateDose("Donepezil","");
ok(v.status==="no-dose","no dose typed yet is not an error state");
v=M.drugValidateDose("","10 mg");
ok(v.status==="no-drug","no drug typed yet is not an error state");

// ── it must never block saving, and never suggest a dose ──
const formStart=src.indexOf("const MedFormUI="); const form=src.slice(formStart,formStart+6000);
const saveBtn=/disabled=\{!f\.name\.trim\(\)\|\|!f\.timeSlots\.length\}/.test(form);
ok(saveBtn,"the save button is gated only on name and time slots — never on the strength check");
ok(!/disabled=\{[^}]*chk\./.test(form),"the strength check does not disable saving anywhere");
ok(/Saving is not blocked/.test(form),"the UI says plainly that an unrecognised strength can still be recorded");
// strip comments: the source DOCUMENTS this rule in prose, and the rule is about code, not commentary
const codeOnly=src.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/[^\n]*$/gm,"");
ok(!/usual dose|recommended dose|typical dose|starting dose/i.test(codeOnly),"nothing in the app suggests a usual or recommended dose");

// ── data integrity of the shipped table ──
const names=M.DRUG_TABLE.map(d=>d.n.toLowerCase());
ok(new Set(names).size===names.length,"no duplicate drug entries");
ok(M.DRUG_TABLE.every(d=>d.n&&Array.isArray(d.s)&&d.s.length>0),"every drug carries at least one strength");
const badStrength=M.DRUG_TABLE.filter(d=>d.s.some(x=>!N(x)));
ok(badStrength.length===0,"every listed strength parses"+(badStrength.length?": "+badStrength.map(d=>d.n).join(", "):""));
ok(M.DRUG_TABLE.length>=80,"the seed formulary covers a useful range ("+M.DRUG_TABLE.length+" drugs)");

console.log(f===0?"\n✅ DRUG LOOKUP PROVEN — names and brands autocomplete, strengths validate, wrong units caught, half tablets understood, unknown drugs get silence, saving is never blocked":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
