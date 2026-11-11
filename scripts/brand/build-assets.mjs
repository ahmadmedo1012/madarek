#!/usr/bin/env node
/**
 * scripts/brand/build-assets.mjs — R349 B2 «الشعار الواحد»: the ONE
 * entrypoint for every brand asset in the repo.
 *
 * THE ARCHITECTURE (docs/brand.md):
 *   · the ONE geometry lives in TWO pinned twins — frontend/src/brand/mark.ts
 *     (web) and apps/mobile/src/brand/mark.ts (mobile). r323-brand-system.test.ts
 *     pins them to each other (the cross-tree pin) — a drift in either fails CI.
 *   · TWO generators render from those twins:
 *       scripts/r323/brand-assets.mjs       web statics (SVGs + PNGs + the OG
 *                                           card; rasters need Playwright/Chromium)
 *       scripts/r323/wordmark-build-r323.mjs the wordmark static twin (fontTools)
 *       scripts/brand/build-app-icons.mjs    every mobile raster (sharp)
 *   · THIS script is the single door: it delegates regeneration AND owns the
 *     asset manifest — the SHA-256 of every generated asset, committed.
 *
 * MODES:
 *   (bare)      list the manifest (every asset + its hash)
 *   --check     dependency-free: verify every committed asset against the
 *               manifest — exit 1 on ANY mismatch or missing file. Wired into
 *               verify.sh (both modes) and the CI design-gates job: a hand-edited
 *               "logo" PNG/SVG can never ship silently.
 *   --manifest  REWRITE the manifest after a legitimate regeneration
 *   --web       regenerate the web statics (needs Chromium via Playwright)
 *   --mobile    regenerate the mobile rasters (needs sharp in apps/mobile)
 *
 * The deep byte-regeneration checks stay where their toolchains live:
 * mobile PNGs byte-verified by build-app-icons --check (mobile tokens:check);
 * web SVG twins byte-pinned to mark.ts by r323-brand-system.test.ts. This
 * manifest adds the third leg: the committed BYTES of every asset, everywhere.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = join(ROOT, 'scripts', 'brand', 'asset-manifest.json');

/** Every generated brand asset in the repo (sorted for stable diffs). */
export const ASSETS = [
  // the ONE shared SVG twin
  'shared/brand/mark.svg',
  // web statics (scripts/r323/brand-assets.mjs + wordmark-build-r323.mjs)
  'frontend/public/favicon.svg',
  'frontend/public/brand/mark.svg',
  'frontend/public/brand/madarek-mark.svg',
  'frontend/public/brand/lockup.svg',
  'frontend/public/brand/lockup-stacked.svg',
  'frontend/public/brand/wordmark.svg',
  'frontend/public/brand/icon-180.png',
  'frontend/public/brand/icon-192.png',
  'frontend/public/brand/icon-512.png',
  'frontend/public/brand/madarek-og.jpg',
  // mobile rasters (scripts/brand/build-app-icons.mjs)
  'apps/mobile/assets/images/icon.png',
  'apps/mobile/assets/images/adaptive-foreground.png',
  'apps/mobile/assets/images/adaptive-background.png',
  'apps/mobile/assets/images/adaptive-monochrome.png',
  'apps/mobile/assets/images/splash-icon.png',
  'apps/mobile/assets/images/favicon.png',
  'apps/mobile/assets/images/notification-icon.png',
];

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function readManifest() {
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

function writeManifest() {
  const entries = {};
  for (const rel of ASSETS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      console.error(`build-assets: MISSING asset ${rel} — regenerate (see docs/brand.md)`);
      process.exit(1);
    }
    entries[rel] = sha256(abs);
  }
  const doc = {
    _comment:
      'R349 B2 — the SHA-256 of every GENERATED brand asset. Any hand-edit of a logo file breaks --check (verify.sh + CI). Regenerate via scripts/brand/build-assets.mjs (--web/--mobile) then --manifest. The generators are the only writers.',
    entries,
  };
  writeFileSync(MANIFEST, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`build-assets: manifest rewritten — ${ASSETS.length} assets.`);
}

function check() {
  const manifest = readManifest();
  const problems = [];
  for (const rel of ASSETS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      problems.push(`MISSING ${rel}`);
      continue;
    }
    const recorded = manifest.entries[rel];
    if (!recorded) {
      problems.push(`UNRECORDED ${rel} (run --manifest after regeneration)`);
      continue;
    }
    const actual = sha256(abs);
    if (actual !== recorded) {
      problems.push(`DRIFT ${rel} — committed bytes differ from the manifest (hand-edited? regenerate properly)`);
    }
  }
  for (const rel of Object.keys(manifest.entries)) {
    if (!ASSETS.includes(rel)) problems.push(`STALE manifest entry ${rel}`);
  }
  if (problems.length > 0) {
    console.error('build-assets: FAIL — the brand assets are not what the generators produced:');
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`build-assets: OK — ${ASSETS.length} assets match the manifest (the ONE logo, provably).`);
}

function run(cmd, cwd) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', cwd: cwd ? join(ROOT, cwd) : ROOT });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const args = process.argv.slice(2);
if (args.includes('--manifest')) writeManifest();
if (args.includes('--web')) {
  run(['node', 'scripts/r323/wordmark-build-r323.mjs']);
  run(['node', 'scripts/r323/brand-assets.mjs']);
}
if (args.includes('--mobile')) {
  run(['node', 'scripts/brand/build-app-icons.mjs', '--png']);
}
if (args.includes('--check')) {
  check();
}
if (args.length === 0) {
  const manifest = readManifest();
  for (const rel of ASSETS) console.log(`  ${manifest.entries[rel]?.slice(0, 12) ?? '—'}  ${rel}`);
}
