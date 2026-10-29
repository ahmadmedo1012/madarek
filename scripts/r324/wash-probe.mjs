#!/usr/bin/env node
/** r324 X6 — computed-style probe of the washed plan room. */
import { chromium } from 'playwright-core';

const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const b = await chromium.launch({ executablePath: EXEC });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE, { waitUntil: 'load' });
await p.waitForTimeout(3000);
// land mid-findings (wash=lecture)
await p.evaluate(() => {
  const el = document.querySelector('#chapters');
  const top = el.getBoundingClientRect().top + window.scrollY;
  const H = el.getBoundingClientRect().height;
  window.scrollTo(0, Math.round(top + (H - 900) * 0.56));
});
await p.waitForTimeout(1600);
const r = await p.evaluate(() => {
  const jt = document.querySelector('.jt');
  const zone = document.querySelector(".pl-zone[data-zone='lecture']");
  const name = document.querySelector(".pl-l-lecture .pl-name");
  const micro = document.querySelector(".pl-l-lecture .bp-micro");
  const cs = (el) => {
    const s = getComputedStyle(el);
    return { fill: s.fill, fillOpacity: s.fillOpacity, stroke: s.stroke, color: s.fill };
  };
  return {
    stage: jt.getAttribute('data-stage'),
    wash: jt.getAttribute('data-wash'),
    zone: cs(zone),
    name: cs(name),
    micro: cs(micro),
    nameText: name.textContent,
    statement2: document.querySelector('.jt-card2 .jt-card-plate')?.textContent,
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
