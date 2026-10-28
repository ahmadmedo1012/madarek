import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = 4320;
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

const browser = await chromium.launch();
try {
  const out = {};
  for (const mode of ['noRM', 'RM']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(mode === 'RM' ? { reducedMotion: 'reduce' } : {}) });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    out[mode] = await page.evaluate(() => {
      const m = { docH: document.documentElement.scrollHeight, sections: {} };
      const main = document.querySelector('.landing main') || document.querySelector('main');
      for (const el of main.children) {
        const cls = String(el.className || el.tagName).split(' ')[0].slice(0, 20) || el.tagName;
        m.sections[cls] = Math.round(el.getBoundingClientRect().height);
      }
      const r = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().height) : null; };
      m.jt = { pin: r('.jt-pin'), col: r('.jt-map-col'), mapIn: r('.jt-map-in'), win: r('.jt-window'), intro: r('.jt-intro'), introBody: r('.jt-intro-body'), close: r('.jt-close') };
      return m;
    });
    await ctx.close();
  }
  const a = out.noRM, b = out.RM;
  console.log('docH noRM', a.docH, 'RM', b.docH, 'delta', b.docH - a.docH);
  for (const k of Object.keys(a.sections)) {
    if (a.sections[k] !== b.sections[k]) console.log(`section ${k}: noRM ${a.sections[k]} RM ${b.sections[k]} delta ${b.sections[k] - a.sections[k]}`);
  }
  console.log('jt noRM', JSON.stringify(a.jt));
  console.log('jt RM  ', JSON.stringify(b.jt));
} finally {
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* already gone */ }
}
