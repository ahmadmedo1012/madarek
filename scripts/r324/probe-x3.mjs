#!/usr/bin/env node
/** r324 X3 — decisive geometry probe for the platform composition. */
import { chromium } from 'playwright-core';

const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE, { waitUntil: 'load' });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), w: Math.round(r.width), y: Math.round(r.y), h: Math.round(r.height) };
  };
  const bar = document.querySelector('.pr-cell-player .pr-cell-bar');
  const kids = bar ? [...bar.children].map((c) => ({ cls: c.className, ...box(c) })) : null;
  const barDir = bar ? getComputedStyle(bar).direction : null;
  return {
    barDir,
    bar: box(bar),
    kids,
    frame: box(document.querySelector('.pr-frame')),
    body: box(document.querySelector('.pr-frame-body')),
    player: box(document.querySelector('.pr-cell-player')),
    matrix: box(document.querySelector('.pr-cell-matrix')),
    ai: box(document.querySelector('.pr-cell-ai')),
    foot: box(document.querySelector('.pr-frame-foot')),
    sheet: box(document.querySelector('.pr-head')),
    drawing: box(document.querySelector('.pr-drawing')),
    note: box(document.querySelector('.pr-note')),
    sec: box(document.querySelector('.pr-section')),
    row1: (() => {
      const st = document.querySelector('.pr-stage');
      return st ? { rowStart: getComputedStyle(st).gridRowStart, rowEnd: getComputedStyle(st).gridRowEnd } : null;
    })(),
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
