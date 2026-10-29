#!/usr/bin/env node
/**
 * r324 X4 — re-encode the product-capture 720w derivatives at the
 * quality the surface deserves.
 *
 * The shipped 720w files (q78, ~13KB for a text-heavy UI) rendered
 * visibly mushy in the why stage's 672px seat. The 1280 sources in
 * .r308-capture-archive/ are sharp; this re-encodes ONLY the 720w
 * tier (the 1280 tier stays byte-identical — it is the srcset's
 * large candidate and already reads clean) at q92, lanczos, from the
 * recorded archive. Never re-fabricates: a missing archive source
 * fails loudly (the build-media-derivatives honesty contract).
 *
 * Usage: node scripts/r324/reencode-720-q92.mjs [--verify]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARCHIVE = join(ROOT, '.r308-capture-archive');
const OUT = join(ROOT, 'frontend', 'public', 'media', 'product');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'frontend', 'public', 'media', 'manifest.json'), 'utf8'));

const Q = 92;
let done = 0, failed = 0;
for (const prod of MANIFEST.products) {
  const src = join(ARCHIVE, `${prod.id}.png`);
  const out = join(OUT, `${prod.id}-720.webp`);
  if (!existsSync(src)) { console.error(`!! ${prod.id}: archive source missing (${src})`); failed++; continue; }
  const before = statSync(out).size;
  if (process.argv.includes('--verify')) { console.log(`${prod.id}-720: ${(before / 1024).toFixed(1)}KB (existing)`); continue; }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src,
    '-vf', 'scale=720:-2:flags=lanczos', '-c:v', 'libwebp', '-q:v', String(Q), out]);
  const after = statSync(out).size;
  console.log(`${prod.id}-720: ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB (q${Q})`);
  done++;
}
console.log(`\nre-encoded=${done} failed=${failed}`);
if (failed) process.exitCode = 1;
