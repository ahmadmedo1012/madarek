/** R312 phase 4 — rebuild the contact sheets from the extracted frame
 * sets (the first attempt kept only the last tile: tile=6x1 emits one
 * image per 6 frames and -update 1 overwrote to the final tile).
 * This pass samples up to 48 frames evenly and tiles them 6-wide. */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'frames');

for (const label of fs.readdirSync(OUT)) {
  const dir = path.join(OUT, label);
  if (!fs.statSync(dir).isDirectory()) continue;
  let frames = fs.readdirSync(dir).filter((f) => /^f-\d+\.png$/.test(f)).sort();
  if (frames.length === 0) continue;

  /* sample up to 48 evenly across the sequence */
  const MAX = 48;
  const sampled =
    frames.length <= MAX
      ? frames
      : frames.filter((_, i) => i % Math.ceil(frames.length / MAX) === 0).slice(0, MAX);

  /* materialise the sample as a parallel s-*.png set (concat-safe) */
  for (const f of sampled) fs.copyFileSync(path.join(dir, f), path.join(dir, `s-${f}`));
  const list = path.join(dir, 'list.txt');
  fs.writeFileSync(
    list,
    "ffconcat version 1.0\n" + sampled.map((f) => `file 's-${f}'`).join('\n'),
  );
  const rows = Math.max(1, Math.ceil(sampled.length / 6));
  execSync(
    `ffmpeg -y -loglevel error -f concat -safe 0 -i ${list} -vf "tile=6x${rows}" -update 1 -frames:v 1 ${path.join(dir, 'sheet.png')}`,
  );
  fs.rmSync(list, { force: true });
  for (const f of sampled) fs.rmSync(path.join(dir, `s-${f}`), { force: true });
  console.log(`✓ ${label}: sheet from ${sampled.length}/${frames.length} frames (6x${rows})`);
}
