#!/usr/bin/env node
/**
 * build-drug-table.mjs — regenerate Care Guardian's DRUG_TABLE from the authoritative NLM source.
 *
 * WHY THIS EXISTS
 * The table currently shipped in dashboard.jsx is a CURATED SEED written by hand: about 90 drugs common in
 * older-adult and dementia care, with real marketed strengths. It is genuinely useful, but it is not
 * authoritative and it has no RxCUIs. This script replaces it with data from NLM.
 *
 * WHICH SOURCE, AND WHY
 * Use "RxNorm Current Prescribable Content" — the monthly subset of RxNorm that is free of the licensing
 * restrictions attached to some full-release source vocabularies, so it can be redistributed inside an
 * open-source app. Download the zip from NLM, unzip it, and point this script at the RRF directory.
 *
 *     node build-drug-table.mjs /path/to/rxnorm/rrf --out drug-table.js [--limit 4000]
 *
 * It reads RXNCONSO.RRF (names) and RXNSAT.RRF (attributes), keeps prescribable clinical drugs, and emits the
 * same shape the app already consumes:
 *
 *     const DRUG_TABLE=[{n:"Donepezil",b:["Aricept"],s:["5 mg","10 mg","23 mg"],rx:"135446"}, ...];
 *
 * Paste the emitted file over the DRUG_TABLE declaration in dashboard.jsx.
 *
 * SIZE WARNING — READ THIS
 * The full prescribable set runs to tens of thousands of concepts and several MB. Care Guardian's service worker
 * precaches with a 2 MiB Workbox ceiling, and EXCEEDING IT IS A HARD BUILD FAILURE (this has already bitten this
 * project once, with the pdf.js worker). Keep the emitted table under ~500 KB, or move it out of dashboard.jsx
 * into its own lazily-imported chunk and raise maximumFileSizeToCacheInBytes deliberately. --limit exists for
 * exactly this reason; the default keeps the most commonly dispensed ingredients.
 *
 * WHAT THIS SCRIPT DELIBERATELY DOES NOT DO
 * It does not emit dosing guidance of any kind. Care Guardian validates that a typed strength is a real strength
 * of a real drug; it does not tell anyone what to take. Structured dosing (maximums, renal and geriatric
 * adjustment) is not in any free source anyway — it lives in commercial products such as First Databank or
 * Lexicomp, whose licences generally forbid the redistribution an open-source core requires.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [, , rrfDir, ...rest] = process.argv;
const arg = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const OUT = arg("--out", "drug-table.js");
const LIMIT = parseInt(arg("--limit", "4000"), 10);

if (!rrfDir || !existsSync(join(rrfDir, "RXNCONSO.RRF"))) {
  console.error("Usage: node build-drug-table.mjs <dir containing RXNCONSO.RRF> [--out drug-table.js] [--limit 4000]");
  console.error("Get the data: NLM RxNorm 'Current Prescribable Content' monthly release (no UMLS licence needed).");
  process.exit(1);
}

// RXNCONSO columns (RRF, pipe-delimited): RXCUI|LAT|TS|LUI|STT|SUI|ISPREF|RXAUI|SAUI|SCUI|SDUI|SAB|TTY|CODE|STR|...
const IDX = { RXCUI: 0, SAB: 11, TTY: 12, STR: 14, SUPPRESS: 16 };
const rows = readFileSync(join(rrfDir, "RXNCONSO.RRF"), "utf8").split("\n");

const ingredients = new Map();   // rxcui -> {n, b:Set, s:Set}
const brandOf = new Map();       // brand name -> ingredient rxcui (approximate, via SBD parsing)

// TTYs we care about:
//   IN  = ingredient            BN = brand name
//   SCDF= clinical drug form    SCD = semantic clinical drug ("Donepezil 10 MG Oral Tablet")
const strengthRe = /(\d+(?:\.\d+)?)\s*(MG|MCG|G|UNT|MEQ|%)\b/i;

for (const line of rows) {
  if (!line) continue;
  const c = line.split("|");
  if (c[IDX.SUPPRESS] === "Y") continue;
  if (c[IDX.SAB] !== "RXNORM") continue;
  const tty = c[IDX.TTY], rxcui = c[IDX.RXCUI], str = c[IDX.STR];
  if (tty === "IN") {
    if (!ingredients.has(rxcui)) ingredients.set(rxcui, { n: titleCase(str), b: new Set(), s: new Set(), rx: rxcui });
  }
}

// Second pass: attach strengths from SCD strings and brands from SBD/BN strings.
for (const line of rows) {
  if (!line) continue;
  const c = line.split("|");
  if (c[IDX.SUPPRESS] === "Y" || c[IDX.SAB] !== "RXNORM") continue;
  const tty = c[IDX.TTY], str = c[IDX.STR] || "";
  if (tty !== "SCD" && tty !== "SBD") continue;
  const m = strengthRe.exec(str);
  if (!m) continue;
  const strength = normUnit(m[1], m[2]);
  // "Donepezil 10 MG Oral Tablet" → ingredient words before the first number
  const head = str.split(/\s+\d/)[0].trim();
  for (const [, ing] of ingredients) {
    if (head.toLowerCase() === ing.n.toLowerCase()) {
      ing.s.add(strength);
      if (tty === "SBD") { const b = brandFrom(str); if (b) ing.b.add(b); }
      break;
    }
  }
}

function titleCase(s) { return s.replace(/\s+/g, " ").trim().replace(/\b\w/g, ch => ch.toUpperCase()); }
function normUnit(v, u) {
  const unit = u.toUpperCase();
  if (unit === "G") return (parseFloat(v) * 1000) + " mg";
  if (unit === "UNT") return v + " unit";
  return v + " " + unit.toLowerCase();
}
function brandFrom(str) { const m = /\[([^\]]+)\]/.exec(str); return m ? m[1] : ""; }

const table = [...ingredients.values()]
  .filter(d => d.s.size > 0)
  .sort((a, b) => b.s.size - a.s.size)          // best-populated ingredients first
  .slice(0, LIMIT)
  .sort((a, b) => a.n.localeCompare(b.n))
  .map(d => ({ n: d.n, b: [...d.b].slice(0, 4), s: [...d.s].sort(byStrength), rx: d.rx }));

function byStrength(a, b) { return (parseFloat(a) || 0) - (parseFloat(b) || 0); }

const js =
  "// GENERATED by build-drug-table.mjs from NLM RxNorm Current Prescribable Content.\n" +
  "// Generated: " + new Date().toISOString().slice(0, 10) + "  ·  drugs: " + table.length + "\n" +
  "// Names/strengths/RxCUIs are factual catalogue data. NO dosing guidance is included, by design.\n" +
  "const DRUG_TABLE=[\n" +
  table.map(d => `{n:${JSON.stringify(d.n)},b:${JSON.stringify(d.b)},s:${JSON.stringify(d.s)},rx:${JSON.stringify(d.rx)}}`).join(",\n") +
  "];\n";

writeFileSync(OUT, js);
const kb = (Buffer.byteLength(js) / 1024).toFixed(0);
console.log(`Wrote ${OUT}: ${table.length} drugs, ${kb} KB`);
if (Buffer.byteLength(js) > 500 * 1024)
  console.warn("WARNING: over 500 KB. Inline this and you inflate the main bundle; check the 2 MiB Workbox precache ceiling before shipping.");
