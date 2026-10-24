#!/usr/bin/env node
/**
 * build-media-derivatives — the R307 sustainable asset pipeline
 * (DESIGN.md §6a; manifest: frontend/public/media/manifest.json).
 *
 * WHAT IT DOES
 *   Rebuilds every WebP derivative under frontend/public/media/ from
 *   the recorded sources, exactly as shipped in R307:
 *     photos    → Wikimedia Commons 1600px renditions (thumb.php)
 *     products  → re-encoded from the R307 capture archive (local
 *                  seeded demo; see manifest.json source.environment)
 *
 * WHY FFMPEG + LIBWEBP
 *   Zero new repository dependencies (the verify-parity-export.mjs
 *   pattern): every CI runner and this sandbox already ship ffmpeg
 *   with libwebp. lanczos downscale + quality 64-78 per the manifest's
 *   per-tier notes (the tier choices were art-directed in R307 — the
 *   numbers below are the recorded outcome, not guesses).
 *
 * RUNTIME
 *   node scripts/media/build-media-derivatives.mjs [--dry-run]
 *   Requires network access to commons.wikimedia.org (photos tier).
 *   This is a maintenance tool — it is deliberately NOT wired into CI;
 *   derivatives are committed artifacts, and the committed bytes are
 *   what the surface baseline pins.
 *
 * HONESTY
 *   The script never invents a source: every row comes from the
 *   manifest, and a missing/failed source fails loudly with its
 *   verification command.
 */
import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { get as httpsGet } from 'node:https';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const MEDIA = join(ROOT, 'frontend', 'public', 'media');
const MANIFEST = JSON.parse(readFileSync(join(MEDIA, 'manifest.json'), 'utf8'));
const DRY = process.argv.includes('--dry-run');
const TMP = join(ROOT, '.media-cache');

/** Per-tier WebP quality map recorded in R307 (see manifest photos[].changes). */
const PHOTO_QUALITY = { 480: 78, 800: 76, 1000: 72, 1200: 70, 1600: 74 };
const PRODUCT_QUALITY = { 720: 78, 1280: 78 };

function log(msg) { process.stdout.write(`${msg}\n`); }

function fetchToFile(url, dest) {
  return new Promise((res, rej) => {
    httpsGet(url, { headers: { 'User-Agent': 'Madarek-media-pipeline/1.0 (scripts/media/build-media-derivatives.mjs; contact via the repository owner)' } }, (r) => {
      if (r.statusCode !== 200) { r.resume(); return rej(new Error(`HTTP ${r.statusCode} for ${url}`)); }
      const ws = createWriteStream(dest);
      r.pipe(ws);
      ws.on('finish', () => res(dest));
      ws.on('error', rej);
    }).on('error', rej);
  });
}

function encode(src, width, quality, dest) {
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', src,
    '-vf', `scale=${width}:-1:flags=lanczos`,
    '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '5',
    dest,
  ]);
}

async function main() {
  mkdirSync(TMP, { recursive: true });
  let built = 0, skipped = 0, failed = 0;

  // ── photos tier ────────────────────────────────────────────────
  for (const photo of MANIFEST.photos) {
    const cache = join(TMP, `${photo.id}.jpg`);
    const target = join(MEDIA, 'universities');
    if (!existsSync(target)) mkdirSync(target, { recursive: true });
    const have = photo.derivativeWidths.every((w) => existsSync(join(target, `${photo.id}-${w}.webp`)));
    if (have) { skipped += photo.derivativeWidths.length; continue; }
    if (!existsSync(cache)) {
      if (DRY) { log(`[dry] would fetch ${photo.source.page}`); continue; }
      const fileName = photo.source.file.split('/').pop().replace(/ /g, '_');
      const thumb = `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(fileName)}&w=1600`;
      log(`fetch ${photo.id} ← ${thumb}`);
      await fetchToFile(thumb, cache);
    }
    for (const w of photo.derivativeWidths) {
      const dest = join(target, `${photo.id}-${w}.webp`);
      log(`  encode ${photo.id}-${w} (q${PHOTO_QUALITY[w] ?? 74})`);
      if (!DRY) encode(cache, w, PHOTO_QUALITY[w] ?? 74, dest);
      built += 1;
    }
  }

  // ── product tier ───────────────────────────────────────────────
  // Product captures re-encode from the R308 archive recorded in the
  // manifest (source.environment) — the r307 archive was superseded
  // by the r308 re-capture (onboarding completed through its real
  // flow before every shot; R308 §1.1 defect A). When the archive is
  // absent the tier is skipped loudly — never re-fabricated.
  const archive = join(ROOT, '.r308-capture-archive');
  for (const prod of MANIFEST.products) {
    const target = join(MEDIA, 'product');
    if (!existsSync(target)) mkdirSync(target, { recursive: true });
    const have = prod.derivativeWidths.every((w) => existsSync(join(target, `${prod.id}-${w}.webp`)));
    if (have) { skipped += prod.derivativeWidths.length; continue; }
    const src = join(archive, `${prod.id}.png`);
    if (!existsSync(src)) { log(`  !! ${prod.id}: capture archive missing (${src}) — re-capture from the seeded demo environment, never fabricate`); failed += 1; continue; }
    for (const w of prod.derivativeWidths) {
      log(`  encode ${prod.id}-${w} (q${PRODUCT_QUALITY[w] ?? 78})`);
      if (!DRY) encode(src, w, PRODUCT_QUALITY[w] ?? 78, join(target, `${prod.id}-${w}.webp`));
      built += 1;
    }
  }

  log(`\nmedia pipeline: built=${built} skipped(already shipped)=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => { log(`pipeline failed: ${e.message}`); process.exit(1); });
