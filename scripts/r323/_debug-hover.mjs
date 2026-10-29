#!/usr/bin/env node
/* debug: what does the DECLARED .btn:hover rule say (dark theme)? */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = '/home/z/my-project/madarek';
const BASE = 'http://127.0.0.1:4326';
let server;
const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort();
    for (const d of dirs.reverse()) {
      const p = path.join(base, d, 'chrome-linux64/chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch {}
  return undefined;
})();

server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4326', '--strictPort'], {
  cwd: path.join(ROOT, 'frontend'), stdio: 'ignore',
});
for (let i = 0; i < 100; i++) {
  try { const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(500) }); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 300));
}
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 }));
});
const page = await ctx.newPage();
await page.goto(BASE + '/__design', { waitUntil: 'load' });
await page.waitForTimeout(800);
const probe = await page.evaluate(() => {
  const el = [...document.querySelectorAll('button.btn')].find((b) => !b.className.includes('primary') && !b.className.includes('sm'));
  const info = el ? {
    cls: el.className,
    theme: document.documentElement.getAttribute('data-theme'),
    color: getComputedStyle(el).color,
    bg: getComputedStyle(el).backgroundColor,
    transition: getComputedStyle(el).transition,
  } : { err: 'no btn' };
  const sheets = [...document.styleSheets];
  const hits = [];
  for (const sh of sheets) {
    let rules; try { rules = sh.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) walk(r.cssRules);
        if (r.selectorText && /\.btn:hover/.test(r.selectorText)) hits.push(r.cssText.slice(0, 260));
      }
    };
    walk(rules);
  }
  return { info, hits: hits.slice(0, 8) };
});
console.log(JSON.stringify(probe, null, 2));
await browser.close();
try { server.kill('SIGKILL'); } catch {}
process.exit(0);
