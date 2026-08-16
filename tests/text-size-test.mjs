// text-size-test.mjs — David's requirement, made enforceable: "No text should ever be smaller than 11 pt", and
// the app must use the space a laptop gives it, because the user base trends older.
// 11pt = 11 × 96/72 = 14.67px. Two earlier attempts failed because they widened CONTAINERS and scaled about a
// dozen named classes — while 292 of 399 font-size declarations sat below the floor and never moved.
import { readFileSync } from "node:fs";
let f=0; const ok=(c,m)=>{if(!c){f++;console.log("✗ "+m)}else console.log("✓ "+m)};
const src=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const PT11=11*96/72;   // 14.666…px

// ── the floor, across the ENTIRE stylesheet ──
// BOTH syntaxes: CSS `font-size:` in the stylesheet AND inline JSX `fontSize:"…"` props. The first pass missed
// the inline ones entirely — 38 of them, all at 13px — which is why they must be checked together.
const decls=[...src.matchAll(/(?:font-size:\s*|fontSize:\s*")([0-9.]+)(rem|px)/g)].map(m=>({
  raw:m[1]+m[2], px: m[2]==="rem" ? parseFloat(m[1])*16 : parseFloat(m[1])}));
ok(/fontSize:\s*"/.test(src),"inline fontSize props are included in this audit");
ok(decls.length>300,"found the font-size declarations ("+decls.length+")");
const under=decls.filter(d=>d.px<PT11);
ok(under.length===0,"NO declared font size is below 11pt"+(under.length?" — "+under.length+" violations, smallest "+Math.min(...under.map(d=>d.px))+"px":""));
const smallest=Math.min(...decls.map(d=>d.px));
ok(smallest>=15,"the smallest declared size is at least 15px (actual "+smallest+"px) — headroom above the 11pt line");

// ── the root scales, so EVERY size moves together ──
ok(/html\{font-size:calc\(var\(--ui-scale-pct,100%\) \* var\(--screen-boost,1\)\)/.test(src),"the root font size is scaled by a screen boost");
ok(/--ui-scale-pct/.test(src),"…MULTIPLIED with the user's own text-size setting, not replacing it");
for(const [bp,val] of [["1024","1.10"],["1500","1.20"],["1900","1.28"]]){
  const at=src.indexOf("@media(min-width:"+bp+"px){\n  :root{--screen-boost:"+val+"}");
  ok(at>0,"a boost of "+val+"\u00d7 applies at "+bp+"px");
}
// effective sizes at each tier
for(const [label,boost,min] of [["laptop 1366",1.10,16],["desktop 1500",1.20,17.5],["large 1900",1.28,19]]){
  ok(smallest*boost>=min,label+": smallest rendered text is "+(smallest*boost).toFixed(1)+"px");
}

// ── the earlier, insufficient approach must not come back ──
ok(!/@media\(min-width:1024px\)\{\s*\.content\{padding:36px 44px 56px\}\s*\.page-title\{font-size/.test(src.replace(/\n/g,"")),"the old per-class desktop tier (which missed ~380 declarations) is gone");

// ── use the space ──
ok(/\.onb-card\{max-width:min\(900px,94vw\)/.test(src),"the onboarding card uses up to 900px, not 400");
ok(/\.auth-card\{[^}]*max-width:min\(860px,94vw\)/.test(src),"the auth card uses up to 860px");
ok(/\.content\{[^}]*max-width:min\(1400px,100%\)[^}]*margin-inline:auto/.test(src),"main content is wide and centred");
ok(/max-width:64ch/.test(src),"long prose keeps a readable measure so widening doesn't hurt legibility");

console.log(f===0?"\n✅ TEXT SIZE PROVEN — nothing below 11pt anywhere; the root scales with the viewport and multiplies the user's own setting; smallest text on a large laptop is ~19px":"\n❌ "+f+" FAILURES"); if(f)process.exitCode=1;
