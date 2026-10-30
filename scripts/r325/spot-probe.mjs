/* P2.6 — spot probe: inspect specific viewport regions on live pages
 * (follow-up to the after-scan deltas). Usage:
 *   node scripts/r325/spot-probe.mjs <path> <bp> "x0,y0,x1,y1" [...] */
import { chromium } from 'playwright-core';
import { sessionForEmail, ROLE_EMAIL, authStorageJson } from './capture-routes.mjs';

const [routePath, bp, ...boxes] = process.argv.slice(2);
const role = routePath.startsWith('/teacher') ? 'teacher' : 'student';
const BASE = 'http://localhost:5211';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
const VP = { '1440': { width: 1440, height: 900 }, '768': { width: 768, height: 1024 }, '390': { width: 390, height: 844 } };

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: VP[bp], locale: 'ar', colorScheme: 'dark', serviceWorkers: 'block' });
await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { } });
await ctx.addInitScript(() => { try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch { } });
const session = await sessionForEmail(ROLE_EMAIL[role]);
await ctx.addInitScript(({ auth }) => { try { localStorage.setItem('mdrk-auth', auth); } catch { } }, { auth: authStorageJson(session) });
const page = await ctx.newPage();
await page.goto(BASE + routePath, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.fonts?.ready?.catch?.(() => { }));
await page.waitForTimeout(300);

for (const b of boxes) {
  const [x0, y0, x1, y1] = b.split(',').map(Number);
  const out = await page.evaluate(({ x0, y0, x1, y1 }) => {
    const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const parse = (s) => { const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const pts = [];
    const nx = Math.min(5, Math.max(2, Math.round((x1 - x0) / 80)));
    const ny = Math.min(5, Math.max(2, Math.round((y1 - y0) / 80)));
    for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) pts.push([Math.round(x0 + ((i + 0.5) / nx) * (x1 - x0)), Math.round(y0 + ((j + 0.5) / ny) * (y1 - y0))]);
    const seen = new Set(); const rows = [];
    for (const [x, y] of pts) {
      const el = document.elementFromPoint(x, y);
      if (!el) { rows.push({ x, y, hit: null }); continue; }
      const rng = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
      const tn = rng && rng.startContainer.nodeType === Node.TEXT_NODE ? rng.startContainer : null;
      const cs = getComputedStyle(el);
      let w = el; let bg = null; let carrier = null;
      while (w) { const c = parse(getComputedStyle(w).backgroundColor); if (c && c.a >= 0.85) { bg = c; carrier = w; break; } w = w.parentElement; }
      if (!bg) bg = parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
      const sig = `${el.tagName}|${String(el.className).slice(0, 60)}|${bg ? [bg.r, bg.g, bg.b].join(',') : ''}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      rows.push({
        x, y, tag: el.tagName, cls: String(el.className).slice(0, 70),
        text: tn ? (tn.textContent || '').trim().slice(0, 40) : '',
        bg: `${bg.r},${bg.g},${bg.b},${bg.a}`, bgLum: bg ? +lum(bg.r, bg.g, bg.b).toFixed(3) : null,
        colLum: (() => { const c = parse(cs.color); return c ? +lum(c.r, c.g, c.b).toFixed(3) : null; })(),
        fontSize: cs.fontSize,
        carrier: carrier ? carrier.tagName + '.' + String(carrier.className).slice(0, 70) : '',
      });
    }
    return rows;
  }, { x0, y0, x1, y1 });
  console.log(`BOX [${x0},${y0},${x1},${y1}]`);
  for (const r of out) console.log('  ', JSON.stringify(r));
}
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
