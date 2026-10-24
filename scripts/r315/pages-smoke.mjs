#!/usr/bin/env node
/**
 * R315 cycle-2 — public-pages smoke matrix (rebuilds the _local artifact
 * the PARITY coverage component consumes). 10 public routes × 2 viewports
 * × 2 themes: each probe asserts a settled render (content mass in the
 * DOM, zero pageerrors) and records the geometry it found. No blanks, no
 * errors → ok:true. Output: audits/evidence/r314/_local/pages-smoke.json
 *
 * Usage: node scripts/r315/pages-smoke.mjs [--base http://localhost:5173]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = get('base', 'http://localhost:5173');
const ROUTES = ['/', '/auth', '/auth/register', '/colleges', '/colleges/leaderboard', '/campus', '/capabilities', '/vision', '/competitions', '/no-such-404'];
const VIEWPORTS = ['1440x900', '390x844'];
const THEMES = ['light', 'dark'];

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const probes = [];
for (const vp of VIEWPORTS) {
  const [w, h] = vp.split('x').map(Number);
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    /* the real zustand persist shape (capture.mjs's proven gate):
     * {state:{mode,modeUpdatedAt},version:2} + the legacy pair + the
     * profile-cache clear, resolved before first paint. */
    await ctx.addInitScript(([t]) => {
      try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: Date.now() }, version: 2 })); } catch {}
      try { localStorage.removeItem('mdrk-theme-profile'); } catch {}
      try { localStorage.setItem('madarek.theme', t); } catch {}
      try { localStorage.setItem('theme', t); } catch {}
    }, [theme]);
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
      let ok = false, notes = '';
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(2500);
        const m = await page.evaluate(() => {
          const root = document.getElementById('root');
          const text = (document.body.innerText || '').trim();
          const dt = document.documentElement.getAttribute('data-theme');
          return { kids: root ? root.querySelectorAll('*').length : 0, textLen: text.length, theme: dt, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
        });
        ok = m.kids > 20 && m.textLen > 40 && errors.length === 0;
        notes = `els=${m.kids} text=${m.textLen} theme=${m.theme}${m.hOverflow ? ' ⚠hOverflow' : ''}${errors.length ? ' ⚠pageerror' : ''}`;
      } catch (e) {
        notes = 'load-failed: ' + String(e).slice(0, 100);
      }
      probes.push({ route, viewport: vp, theme, ok, notes });
      console.log(`${ok ? '✓' : '✗'} ${vp} ${theme.padEnd(5)} ${route.padEnd(22)} ${notes}`);
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
const out = path.resolve(import.meta.dirname, '../../audits/evidence/r314/_local/pages-smoke.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
/* score.mjs consumes a BARE ARRAY of probes ({route,viewport,theme,ok}) —
 * the r314 artifact shape. The generator meta goes to a sidecar file. */
fs.writeFileSync(out, JSON.stringify(probes, null, 1));
fs.writeFileSync(out.replace('.json', '.meta.json'), JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE }, null, 1));
const pass = probes.filter((p) => p.ok).length;
console.log(`\n${pass}/${probes.length} probes PASS → ${out}`);
process.exit(pass === probes.length ? 0 : 1);
