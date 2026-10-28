import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = 4321;
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
for (const [w, h, rm] of [[1440, 900, true], [1440, 900, false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(() => {
    const out = [];
    const docH = document.documentElement.scrollHeight;
    out.push(['DOC', Math.round(docH)]);
    for (const el of document.querySelectorAll('main section, main > div, footer')) {
      const r = el.getBoundingClientRect();
      if (r.height > 40) {
        const id = el.id || el.className?.toString?.().split(' ').slice(0, 2).join('.') || el.tagName;
        out.push([String(id).slice(0, 40), Math.round(r.height), Math.round(r.top + window.scrollY)]);
      }
    }
    return out;
  });
  console.log(`\n== ${w}x${h} RM=${rm} ==`);
  for (const [name, h, top] of rows) console.log(`${String(name).padEnd(42)} h=${h}\t top=${top}`);
  await ctx.close();
}
await browser.close();
try { process.kill(-preview.pid); } catch { /* already */ }
