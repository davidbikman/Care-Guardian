#!/usr/bin/env node
/*
 * Care Guardian — State Package Validator
 *
 * Checks the STRUCTURE of a state package before submission. It does NOT and
 * cannot verify legal accuracy — that requires a qualified human reviewer for
 * the state. It catches the mechanical mistakes: missing domains, malformed
 * tasks, recurring tasks without an interval, over-long text, etc.
 *
 * Usage:   node validate-package.js path/to/your-state.statepackage.js
 */
const path = require("path");

const DOMAIN_KEYS = ["physical","cognitive","wellness","legal","financial"];
const VALID_KINDS = ["O","R","M"];

function validateStatePackage(pkg) {
  const errors = [], warnings = [];
  if (!pkg || typeof pkg !== "object") return {valid:false, errors:["Package is not an object"], warnings, stats:{}};
  if (!pkg.stateCode || !/^[A-Z]{2}$/.test(pkg.stateCode)) errors.push('stateCode must be a two-letter uppercase code, e.g. "MI"');
  if (!pkg.stateName || typeof pkg.stateName !== "string") errors.push('stateName is required, e.g. "Michigan"');
  if (!pkg.version) warnings.push('No version set (recommend "1.0")');
  if (!pkg.author) warnings.push("No author/provenance set — recommended so reviewers know who verified the content");
  if (!pkg.lastReviewed) warnings.push("No lastReviewed date — recommended (citations and thresholds change yearly)");

  const content = pkg.content;
  if (!content || typeof content !== "object") return {valid:false, errors:errors.concat(["Missing content object"]), warnings, stats:{}};

  let goals=0, subs=0, recurring=0, monitoring=0, onetime=0;
  DOMAIN_KEYS.forEach(dk => {
    const d = content[dk];
    if (!d) { errors.push("Missing required domain: " + dk); return; }
    if (typeof d.desc !== "string" || !d.desc.trim()) errors.push(dk + ": missing description (desc)");
    else if (d.desc.length > 400) warnings.push(dk + ": description is long (" + d.desc.length + " chars)");
    if (!Array.isArray(d.goals)) { errors.push(dk + ": goals must be an array"); return; }
    if (d.goals.length === 0) warnings.push(dk + ": has no goals");
    d.goals.forEach((g, gi) => {
      goals++;
      const gl = dk + " goal #" + (gi+1);
      if (typeof g.title !== "string" || !g.title.trim()) errors.push(gl + ": missing title");
      if (!Array.isArray(g.subs) || g.subs.length === 0) { errors.push(gl + ": needs at least one sub-task"); return; }
      g.subs.forEach((s, si) => {
        subs++;
        const w = gl + " sub #" + (si+1);
        if (typeof s.t !== "string" || !s.t.trim()) errors.push(w + ": missing task text (t)");
        else if (s.t.length > 300) errors.push(w + ": task text exceeds 300 characters (" + s.t.length + ")");
        if (!VALID_KINDS.includes(s.k)) errors.push(w + ': kind (k) must be "O", "R", or "M" (got ' + JSON.stringify(s.k) + ")");
        if (s.k === "R") { recurring++; if (typeof s.d !== "number" || s.d <= 0) errors.push(w + ": recurring task needs a positive interval in days (d)"); }
        if (s.k === "M") monitoring++;
        if (s.k === "O") onetime++;
        if (s.k !== "R" && s.d != null) warnings.push(w + ": only recurring (R) tasks use an interval (d); ignored here");
      });
    });
  });
  Object.keys(content).forEach(k => { if (!DOMAIN_KEYS.includes(k)) errors.push("Unknown domain key (will be ignored): " + k); });

  return {valid: errors.length === 0, errors, warnings, stats:{goals, subs, onetime, recurring, monitoring}};
}

// CLI
if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error("Usage: node validate-package.js path/to/your-state.statepackage.js"); process.exit(2); }
  let pkg;
  try { pkg = require(path.resolve(file)); }
  catch (e) { console.error("Could not load file: " + e.message); process.exit(2); }

  const r = validateStatePackage(pkg);
  console.log("\nCare Guardian — State Package Validation");
  console.log("Package: " + (pkg.stateName || "?") + " (" + (pkg.stateCode || "?") + ")  v" + (pkg.version || "?"));
  console.log("Content: " + r.stats.goals + " goals, " + r.stats.subs + " sub-tasks " +
              "(" + (r.stats.onetime||0) + " one-time, " + (r.stats.recurring||0) + " recurring, " + (r.stats.monitoring||0) + " monitoring)");
  if (r.warnings.length) { console.log("\nWarnings (" + r.warnings.length + "):"); r.warnings.forEach(w => console.log("  ⚠ " + w)); }
  if (r.errors.length) { console.log("\nErrors (" + r.errors.length + "):"); r.errors.forEach(e => console.log("  ✗ " + e)); }
  console.log("\n" + (r.valid ? "✓ STRUCTURE VALID — ready for human legal review before inclusion." :
                                "✗ INVALID — fix the errors above and re-run.") + "\n");
  process.exit(r.valid ? 0 : 1);
}

if (typeof module !== "undefined") module.exports = { validateStatePackage, DOMAIN_KEYS, VALID_KINDS };
