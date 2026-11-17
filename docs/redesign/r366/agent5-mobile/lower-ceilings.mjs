#!/usr/bin/env node
/**
 * R366 A5 — lower copy-budget-mobile ceilings to the CURRENT counts
 * (never raises; refuses files over ceiling). The word counts come from
 * the GATE'S OWN SCANNER, extracted and eval'd straight out of
 * scripts/gates/copy-budget-mobile.mjs — the lexer can never drift.
 *
 * Usage:
 *   node docs/redesign/r366/agent5-mobile/lower-ceilings.mjs [file...]
 *     with args: lower only those screens (repo-relative or mobile-relative)
 *     no args:    lower EVERY screen currently under its ceiling
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..", "..", "..");
const GATE = join(REPO, "scripts/gates/copy-budget-mobile.mjs");
const RATCHET = join(REPO, "docs/QA/copy-budget-mobile.json");

// ── extract the scanner (constants + countWords + attrLookback + scanFile) ──
const gateSrc = readFileSync(GATE, "utf8");
const START = gateSrc.indexOf("const AR =");
const END = gateSrc.indexOf("// ---- run ----");
if (START < 0 || END < 0) { console.error("could not extract gate scanner"); process.exit(1); }
const scannerSrc = gateSrc.slice(START, END);
const scanFile = new Function(`${scannerSrc}; return scanFile;`)();

// ── the gate's own file walk (app + src, tests excluded) ──
const { readdirSync, statSync } = await import("node:fs");
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "__tests__" || e === "__mocks__") continue;
      walk(p, out);
    } else if (p.endsWith(".tsx") && !/\.(test|spec)\.tsx$/.test(p)) out.push(p);
  }
  return out;
}
const ROOTS = [join(REPO, "apps/mobile/app"), join(REPO, "apps/mobile/src")];
const files = [...new Set(ROOTS.flatMap((r) => walk(r)))].sort();

const wanted = new Set(process.argv.slice(2).map((f) => f.replace(/^.*?(apps\/mobile)/, "$1")));
const ratchet = JSON.parse(readFileSync(RATCHET, "utf8"));

let lowered = 0, checked = 0;
for (const f of files) {
  const key = f.slice(REPO.length + 1);
  const entry = ratchet.pages[key];
  if (!entry) continue;
  if (wanted.size > 0 && !wanted.has(key)) continue;
  checked++;
  const buckets = scanFile(readFileSync(f, "utf8"));
  const words = buckets.props.ar + buckets.plain.ar + buckets.aria.ar + buckets.jsx.ar;
  if (words > entry.max) { console.error(`REFUSE (over ceiling ${entry.max}: ${words}): ${key}`); process.exitCode = 1; continue; }
  if (words < entry.max) { entry.max = words; lowered++; console.log(`${key}: ${entry.max} -> ${words}`); }
}
writeFileSync(RATCHET, JSON.stringify(ratchet, null, 2) + "\n");
console.log(`checked ${checked}, lowered ${lowered} ceiling(s)`);
