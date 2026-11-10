#!/usr/bin/env node
/**
 * sync-illustrations.mjs — R345 F · the mobile twin of the R342
 * illustration register (frontend/public/media/manifest.json →
 * illustrations[]).
 *
 * Emits `apps/mobile/src/media/illustrations.generated.ts`: the static
 * id → { light, dark, altAr, intrinsic, decorative } table the mobile
 * empty-state/auth seats consume (images themselves load from the web
 * origin on demand — expo-image, same serving path as the web).
 *
 * Usage:
 *   node scripts/media/sync-illustrations.mjs            # write the twin
 *   node scripts/media/sync-illustrations.mjs --check    # exit 1 on drift
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "frontend", "public", "media", "manifest.json");
const DST = path.join(ROOT, "apps", "mobile", "src", "media", "illustrations.generated.ts");

const manifest = JSON.parse(readFileSync(SRC, "utf8"));
const items = manifest.illustrations.items;
if (!Array.isArray(items) || items.length === 0) throw new Error("manifest.json: no illustrations.items");

const rows = items.map((it) => {
  const a = it.assets ?? {};
  if (!a.light || !a.dark) throw new Error(`illustration ${it.id}: missing light/dark asset`);
  const [w, h] = it.intrinsic?.light ?? [0, 0];
  const alt = (it.altAr ?? "").replace(/"/g, '\\"');
  return `  "${it.id}": { light: "${a.light}", dark: "${a.dark}", altAr: "${alt}", w: ${w}, h: ${h}, decorative: ${Boolean(it.decorative)} },`;
});

const next = `/* ═══════════════════════════════════════════════════════════════════
 * illustrations.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Generator: scripts/media/sync-illustrations.mjs (from
 * frontend/public/media/manifest.json → illustrations[]; drift-gated
 * by \`npm run illus:check\`).
 *
 * The R342 original-illustration register (19 pieces, light + dark
 * twins, Arabic alt text from the asset contract). Mobile seats (empty
 * states, auth) resolve an id + theme here and load the image from the
 * web origin (expo-image) — the art is never forked.
 * ═══════════════════════════════════════════════════════════════════ */

export interface IllustrationSpec {
  /** the light twin's public path on the web origin */
  light: string;
  /** the dark twin's public path */
  dark: string;
  /** the contract's Arabic alt (empty for decorative pieces) */
  altAr: string;
  /** intrinsic px of the light twin */
  w: number;
  h: number;
  /** decorative pieces render with empty a11y labels */
  decorative: boolean;
}

export const ILLUSTRATIONS: Readonly<Record<string, IllustrationSpec>> = {
${rows.join("\n")}
};
`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(DST, "utf8");
  } catch {
    console.error("illus:check FAIL — the mobile twin is missing; run scripts/media/sync-illustrations.mjs");
    process.exit(1);
  }
  if (current !== next) {
    console.error("illus:check FAIL — apps/mobile/src/media/illustrations.generated.ts drifted from manifest.json illustrations[]; re-run the sync script and commit both.");
    process.exit(1);
  }
  console.log("illus:check PASS — the mobile illustration twin is in sync.");
  process.exit(0);
}

mkdirSync(path.dirname(DST), { recursive: true });
writeFileSync(DST, next, "utf8");
console.log(`synced manifest illustrations[] (${items.length}) -> ${path.relative(ROOT, DST)}`);
