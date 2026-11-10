#!/usr/bin/env node
/**
 * sync-university-cards.mjs — R345 F · the mobile twin of the ONE
 * university-card geometry source.
 *
 * The design law (R343 C-1): `shared/media/university-cards.ts` is the
 * single geometry + registry module — web imports it directly
 * (`@shared/media/university-cards`); mobile cannot (no workspace
 * alias, Metro resolves from apps/mobile only), so the twin rides the
 * SAME copy-script pattern as `src/brand/wordmark.generated.ts` /
 * `src/design/tokens.generated.ts`: byte-copied, header-marked,
 * drift-gated.
 *
 * Usage:
 *   node scripts/media/sync-university-cards.mjs            # write the twin
 *   node scripts/media/sync-university-cards.mjs --check    # exit 1 on drift
 *
 * The --check mode is wired into apps/mobile `npm run cards:check`
 * (CI-drift-gated like tokens:check — the generated file is committed,
 * never hand-edited).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "shared", "media", "university-cards.ts");
const DST = path.join(ROOT, "apps", "mobile", "src", "media", "university-cards.generated.ts");

const HEADER = `/* ═══════════════════════════════════════════════════════════════════
 * university-cards.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Generator: scripts/media/sync-university-cards.mjs (byte-copy of
 * shared/media/university-cards.ts + this header; regen after any
 * edit to the shared source; drift-gated by \`npm run cards:check\`).
 *
 * The ONE university-card geometry source (R343 C-1): registry +
 * original elevation compositions (arcade · courtyard · tower · hall)
 * as normalized draw lists — consumed by web (inline SVG) and by this
 * app (react-native-svg, src/components/UniversityCard.tsx). Never
 * forked; never hand-edited.
 * ═══════════════════════════════════════════════════════════════════ */

`;

const body = readFileSync(SRC, "utf8");
const next = HEADER + body;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(DST, "utf8");
  } catch {
    console.error("cards:check FAIL — the mobile twin is missing; run scripts/media/sync-university-cards.mjs");
    process.exit(1);
  }
  if (current !== next) {
    console.error("cards:check FAIL — apps/mobile/src/media/university-cards.generated.ts drifted from shared/media/university-cards.ts; re-run the sync script and commit both.");
    process.exit(1);
  }
  console.log("cards:check PASS — the mobile twin is byte-identical to the shared source.");
  process.exit(0);
}

mkdirSync(path.dirname(DST), { recursive: true });
writeFileSync(DST, next, "utf8");
console.log(`synced ${path.relative(ROOT, SRC)} -> ${path.relative(ROOT, DST)} (${next.length} bytes)`);
