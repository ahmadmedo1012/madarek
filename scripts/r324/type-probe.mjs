#!/usr/bin/env node
/**
 * r324/type-probe.mjs — X9 evidence: every public route's h1/h2/h3
 * font-size + weight at 1440 and 390, vs the ladder caps
 * (d1 46.7 @1440 / 31.74 @390, weight ≤ 600).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const ROUTES = process.env.ROUTES
  ? process.env.ROUTES.split(',')
  : ['/', '/404', '/500', '/403', '/maintenance', '/auth', '/auth/register', '/auth/forgot',
     '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/accessibility', '/legal/security', '/legal/data',
     '/help', '/about', '/contact', '/colleges', '/capabilities'];

const BPS = [1440, 390];
const browser = await chromium.launch({ executablePath: EXEC });
const out = {};
for (const bp of BPS) {
  out[bp] = {};
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: bp, height: 900 } });
    try {
      await page.goto(BASE + route.replace(/^\//, ''), { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2500);
      const heads = await page.evaluate(() => {
        const pick = (sel) => [...document.querySelectorAll(sel)].slice(0, 4).map((h) => {
          const cs = getComputedStyle(h);
          const r = h.getBoundingClientRect();
          return { text: (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24), fs: Math.round(parseFloat(cs.fontSize) * 10) / 10, fw: cs.fontWeight, lines: Math.max(1, Math.round(r.height / (parseFloat(cs.lineHeight) || 1))) };
        });
        return { h1: pick('h1'), h2: pick('h2') };
      });
      out[bp][route] = heads;
    } catch (e) {
      out[bp][route] = { error: String(e.message).slice(0, 80) };
    }
    await page.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(ROOT, 'audits', 'evidence', 'r324', 'type-probe.json'), JSON.stringify(out, null, 1));
for (const bp of BPS) {
  console.log(`\n══ @${bp} (cap: h1 ${bp === 1440 ? 46.7 : 31.74}px · fw ≤600)`);
  for (const [route, heads] of Object.entries(out[bp])) {
    if (heads.error) { console.log(`${route}: ERR ${heads.error}`); continue; }
    const bad = heads.h1?.filter((h) => h.fs > (bp === 1440 ? 46.8 : 31.8) || Number(h.fw) > 600);
    const flag = bad?.length ? ' ⚠' : '';
    const h1s = (heads.h1 || []).map((h) => `${h.fs}px/fw${h.fw}/L${h.lines} "${h.text}"`).join(' | ') || '—';
    console.log(`${route}${flag}: ${h1s}`);
    if (bad?.length) bad.forEach((h) => console.log(`   ⚠ EXCEEDS: ${h.fs}px fw${h.fw} "${h.text}"`));
  }
}
