import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = 4319;
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

/* the band targets (no-RM ±1.5%) + ratchet (RM-on ±3%) + never-raise pins */
const BAND = { 1440: 12355, 1024: 9938, 768: 12577, 390: 11441, 360: 10684 };
const RATCHET = { 1440: 12471, 1024: 10056, 768: 12679, 390: 11300, 360: 10722 };
const PINS = { 320: 9308, 430: 12411, 480: 12675, 600: 14774, 820: 13808, 1180: 10937 };
const VPS = [[320,568],[360,800],[390,844],[430,932],[480,800],[600,800],[768,1024],[820,1180],[1024,768],[1180,800],[1440,900]];

const browser = await chromium.launch();
try {
  for (const mode of ['noRM', 'RM']) {
    console.log(`== ${mode} ==`);
    for (const [w,h] of VPS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(mode === 'RM' ? { reducedMotion: 'reduce' } : {}) });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip','1'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const m = await page.evaluate(() => {
        const r = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().height) : null; };
        return {
          docH: document.documentElement.scrollHeight,
          chapters: r('.chapters'), jt: r('.jt'), col: r('.jt-map-col'), close: r('.jt-close'), mapIn: r('.jt-map-in'), win: r('.jt-window'),
        };
      });
      const band = BAND[w] ?? PINS[w];
      const kind = BAND[w] ? 'BAND' : 'PIN';
      const delta = ((m.docH / band - 1) * 100).toFixed(2);
      const line = `${w}x${h}: docH=${m.docH} (${delta}% vs ${band} ${kind})`;
      if (mode === 'RM' && RATCHET[w]) {
        const rd = ((m.docH / RATCHET[w] - 1) * 100).toFixed(2);
        console.log(`${line} | ratchet ${RATCHET[w]}: ${rd}%`);
      } else {
        console.log(`${line} | chapters=${m.chapters} jt=${m.jt} col=${m.col} close=${m.close} mapIn=${m.mapIn} win=${m.win}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* already gone */ }
}
