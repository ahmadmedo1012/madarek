import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = 4325;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'audits/evidence/r322/map');
fs.mkdirSync(OUT, { recursive: true });

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

/* the 6 narrative states, pin fractions per the stage machine:
   entrance p∈[-0.167,0], sequence p∈[-0.082,0.952], stage flips at t thresholds */
const STATES = [
  { n: 1, slug: 'statement', p: 0.02 },
  { n: 2, slug: 'plan', p: 0.16 },
  { n: 3, slug: 'card', p: 0.45 },
  { n: 4, slug: 'findings', p: 0.66 },
  { n: 5, slug: 'room', p: 0.9 },
  { n: 6, slug: 'closing', p: 1.0 },
];
const BPS = [[1440, 900], [768, 1024], [390, 844]];

const browser = await chromium.launch();
for (const [w, h] of BPS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const mobile = w <= 991;
  for (const st of STATES) {
    const landed = await page.evaluate(({ p, mobile }) => {
      const track = document.querySelector('.jt');
      if (!track) return null;
      let target;
      if (mobile) {
        const col = document.querySelector('.jt-map-col');
        const win = document.querySelector('.jt-map-in');
        if (!col || !win) return null;
        const cRect = col.getBoundingClientRect();
        const colTop = cRect.top + window.scrollY;
        const winH = win.getBoundingClientRect().height;
        const stickyTop = parseFloat(getComputedStyle(win).top) || 0;
        target = colTop - stickyTop + p * Math.max(1, cRect.height - winH);
      } else {
        const r = track.getBoundingClientRect();
        target = r.top + window.scrollY + p * (r.height - window.innerHeight);
      }
      window.scrollTo({ top: target, behavior: 'instant' });
      return Math.round(window.scrollY);
    }, { p: st.p, mobile });
    await page.waitForTimeout(900);
    const stage = await page.evaluate(() => document.querySelector('.jt')?.getAttribute('data-stage'));
    await page.screenshot({ path: path.join(OUT, `state-${String(st.n).padStart(2, '0')}-${st.slug}-${w}.jpg`), type: 'jpeg', quality: 70 });
    console.log(`${w} · state ${st.n} (${st.slug}) scroll=${landed} data-stage=${stage}`);
  }
  await ctx.close();
}
await browser.close();
try { process.kill(-preview.pid); } catch { /* already */ }
console.log('shots →', OUT);
