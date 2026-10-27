#!/usr/bin/env node
/** r321-a1-seats.mjs — measure the live per-seat write+flush cost on
 *  every scroll-driven var seat (jt-p, wy-p, wr-p, jt-r) + count each
 *  seat's subtree — find the ~756-element recalc family. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4173';
const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux64/chrome');
    if (fs.existsSync(p)) return p;
  }
})();

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
// scroll into the chapters band (the worst zone per the r318 report)
await page.evaluate(() => window.scrollTo(0, 3500));
await page.waitForTimeout(600);

const seats = await page.evaluate(() => {
  const count = (el) => el ? el.querySelectorAll('*').length : -1;
  const pick = (sel) => document.querySelector(sel);
  return {
    '.jt-pin': count(pick('.jt-pin')),
    '.jt-plan (pin)': count(pick('.jt-pin .jt-plan')),
    '.jt-statement': count(pick('.jt-statement')),
    '.jt-intro': count(pick('.jt-intro')),
    '.wy track': count(pick('.wy')),
    '.wr (hero words)': count(pick('.wr')),
    'body total': count(pick('body')),
    '.bp-svg': count(pick('.bp-svg')),
    'jt cam twin plan': count(pick('.jt-cam .jt-plan')),
  };
});
console.log('subtree sizes:', JSON.stringify(seats, null, 1));

// probe write+flush cycles per seat
const probe = await page.evaluate(() => {
  const results = {};
  const probeSeat = (name, sel, cssVar) => {
    const el = document.querySelector(sel);
    if (!el) { results[name] = 'missing'; return; }
    // warm
    el.style.setProperty(cssVar, '0.1234');
    getComputedStyle(el).opacity;
    const t0 = performance.now();
    const N = 20;
    for (let i = 0; i < N; i++) {
      el.style.setProperty(cssVar, (0.1 + i * 0.001).toFixed(4));
      // force flush
      void el.offsetHeight;
    }
    results[name] = +((performance.now() - t0) / N).toFixed(3) + 'ms/cycle';
  };
  probeSeat('jt-p @ .jt-pin', '.jt-pin', '--jt-p');
  probeSeat('jt-p @ .jt-plan', '.jt-pin .jt-plan', '--jt-p');
  probeSeat('jt-p @ .jt-statement', '.jt-statement', '--jt-p');
  probeSeat('jt-p @ .jt-intro', '.jt-intro', '--jt-p');
  probeSeat('wy-p @ .wy', '.wy', '--wy-p');
  probeSeat('stage attr @ .jt (data-stage)', '.jt', '__none__');
  return results;
});
console.log('write+flush probes:', JSON.stringify(probe, null, 1));

// data-stage probe separately (attribute write)
const attrProbe = await page.evaluate(() => {
  const el = document.querySelector('.jt');
  if (!el) return 'missing';
  const t0 = performance.now();
  const N = 20;
  for (let i = 0; i < N; i++) {
    el.dataset.stage = String(i % 4);
    void el.offsetHeight;
  }
  return +((performance.now() - t0) / N).toFixed(3) + 'ms/cycle (data-stage flip)';
});
console.log(attrProbe);
await browser.close();
