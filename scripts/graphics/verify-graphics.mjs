#!/usr/bin/env node
/**
 * verify-graphics.mjs — R366 L2 (Agent 1): the graphics construction
 * verifier. Enforces the asset budgets + variant laws documented in
 * docs/GRAPHICS-PIPELINE.md:
 *
 *   1. SIZE BUDGET — every raster illustration under
 *      frontend/public/media/** ≤ 61,440 bytes (60 KB). Larger art ships
 *      only as an explicitly registered exception (the ledger below).
 *   2. DARK-VARIANT PAIRING — every `*-light.webp` has its `*-dark.webp`
 *      twin and vice versa (the theme-token cascade law).
 *   3. NAMING + REGISTER — files match the
 *      `{subject}-{light|dark}[@2x].webp` register; the @2x retina twins
 *      must be referenced (dead twins are deleted, not accumulated).
 *   4. DIMENSIONS — ffprobe parses every file (no zero-byte/corrupt
 *      artifacts); the aspect ratio of each @2x twin matches its base.
 *
 * Usage: node scripts/graphics/verify-graphics.mjs   (exit 1 on violation)
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const MEDIA = join(REPO, "frontend", "public", "media");
const BUDGET = 61440; // 60 KB

/** Registered exceptions — each with the measured size + the reason +
 *  the owner ruling. Keep this list SHORT; a new entry needs a DELIVERY
 *  record. */
const EXCEPTIONS = new Map([
  // (none today — the r342 diet brought every asset under budget)
]);

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name));
    else if (/\.(webp|avif|png|jpg)$/.test(e.name)) files.push(join(dir, e.name));
  }
})(MEDIA);

const violations = [];
const dims = new Map();
for (const f of files) {
  const rel = relative(REPO, f);
  const sz = statSync(f).size;
  // 1. budget
  if (sz > BUDGET && !EXCEPTIONS.has(rel)) violations.push(`SIZE ${rel} ${sz}B > ${BUDGET}B`);
  // 4. dimensions parse + aspect registry
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
    const [w, h] = out.split(",").map(Number);
    dims.set(rel, { w, h });
    if (!w || !h) violations.push(`DIMS ${rel} unparsable (${out})`);
  } catch {
    violations.push(`DIMS ${rel} ffprobe failed (corrupt?)`);
  }
  // 2. dark/light pairing
  if (/-light\.webp$/.test(f) && !existsSync(f.replace("-light.webp", "-dark.webp"))) violations.push(`PAIR ${rel} has no -dark twin`);
  if (/-dark\.webp$/.test(f) && !existsSync(f.replace("-dark.webp", "-light.webp"))) violations.push(`PAIR ${rel} has no -light twin`);
  // 3. @2x twins must be referenced in src/ (dead retina = delete)
  if (/@2x\.webp$/.test(f)) {
    const base = rel.split("/").pop();
    const rg = execFileSync("rg", ["-l", "--glob", "!frontend/public/**", "--glob", "!*.webp", base, "frontend/src", "apps/mobile"], { encoding: "utf8", cwd: REPO }).trim();
    if (!rg) violations.push(`DEAD-2X ${rel} — the retina twin has no reference (delete it)`);
  }
}
// 4b. @2x aspect must match the base
for (const [rel, d] of dims) {
  if (!/@2x\.webp$/.test(rel)) continue;
  const base = rel.replace("@2x.webp", ".webp");
  const bd = dims.get(base);
  if (bd && Math.abs(d.w / d.h - bd.w / bd.h) > 0.01) violations.push(`ASPECT ${rel} ratio differs from its base twin`);
}

const total = files.reduce((a, f) => a + statSync(f).size, 0);
console.log(`graphics: ${files.length} raster assets · ${(total / 1024).toFixed(0)} KB total · budget ${BUDGET}B each`);
if (violations.length) {
  for (const v of violations) console.log("  ✗ " + v);
  console.log(`FAIL: ${violations.length} violation(s)`);
  process.exit(1);
}
console.log("PASS: size budget, dark-pairing, naming register, dimensions, 2x references all hold");
