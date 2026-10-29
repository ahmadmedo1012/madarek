#!/usr/bin/env node
/** r324 X6 — decisive hit-test at the map intro anchor (same scroll
 * method as shot-anchor.mjs: instant + settle). */
import { chromium } from 'playwright-core';

const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE, { waitUntil: 'load' });
await p.waitForTimeout(3000);
await p.evaluate(() => {
  document.querySelector('#chapters').scrollIntoView({ block: 'start', behavior: 'instant' });
});
await p.waitForTimeout(1800);
const r = await p.evaluate(() => {
  const info = (el) => {
    if (!el) return null;
    const cls = el instanceof SVGElement ? el.getAttribute('class') : el.className;
    const rc = el.getBoundingClientRect();
    return `${el.tagName}.${String(cls).split(' ').slice(0, 3).join('.')} @${Math.round(rc.y)}h${Math.round(rc.height)}`;
  };
  const out = {
    scrollY: Math.round(window.scrollY),
    hits: {},
    rects: {},
  };
  for (const [k, x, y] of [['c1', 200, 420], ['c2', 200, 548], ['c3', 200, 805], ['mid', 720, 560]]) {
    out.hits[k] = (document.elementsFromPoint(x, y) || []).slice(0, 4).map(info);
  }
  for (const sel of ['.chapters', '.jt', '.jt-pin', '.jt-map-in', '.jt-window', '.jt-plan', '.jt-idx', '.jt-card1', '.jt-intro', '.bp-stage']) {
    const el = document.querySelector(sel);
    if (!el) { out.rects[sel] = null; continue; }
    const rc = el.getBoundingClientRect();
    out.rects[sel] = `y=${Math.round(rc.y)} h=${Math.round(rc.height)} vis=${rc.y < 900 && rc.y + rc.height > 0}`;
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
