import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = 4323;
const BASE = `http://127.0.0.1:${PORT}`;

const preview = spawn('node', [
  path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview',
  `--outDir=${path.join(ROOT, 'frontend/dist')}`, `--port=${PORT}`, '--strictPort', '--host', '127.0.0.1',
], { cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', detached: true });
preview.unref();

let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try { const res = await fetch(BASE, { signal: AbortSignal.timeout(1500) }); ready = res.ok; } catch { /* not yet */ }
}
if (!ready) { console.error('preview not up'); process.exit(2); }
console.log('preview up');

const args = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [path.join(ROOT, 'scripts/r321/sweep-r321.mjs'), '--base-url', BASE, '--routes', 'landing'];

const child = spawn('node', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { process.stderr.write(d); });
await new Promise((r) => child.on('close', r));

fs.writeFileSync('/tmp/sweep-out.json', out);
try {
  const d = JSON.parse(out);
  let pass = 0, fail = 0; const fails = [];
  for (const c of d.cells) {
    if (c.error) { fail++; fails.push([c.route, c.viewport, c.theme, 'ERROR:' + String(c.error).slice(0, 70)]); continue; }
    for (const [k, v] of Object.entries(c.checks || {})) {
      if (v.status === 'PASS') pass++;
      else { fail++; fails.push([c.route, c.viewport, c.theme, k, v.status + ' metric=' + v.metric + ' ' + (v.sample || '').slice(0, 70)]); }
    }
  }
  console.log(`SWEEP RESULT — PASS: ${pass} · FAIL: ${fail}`);
  for (const f of fails.slice(0, 20)) console.log('  ✗', f.join(' | '));
  if (!fails.length) console.log('  ✓ all cells green');
} catch (e) {
  console.log('raw output (first 3000 chars):');
  console.log(out.slice(0, 3000));
}

try { process.kill(-preview.pid); } catch { /* already */ }
try { child.kill(); } catch { /* already */ }
