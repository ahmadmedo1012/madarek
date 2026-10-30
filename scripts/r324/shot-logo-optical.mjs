#!/usr/bin/env node
/**
 * r324/shot-logo-optical.mjs — the X11 evidence sheet.
 * Renders the REAL mark geometry (mark.ts constants re-stated) at every
 * live seat size in two columns:
 *   BEFORE — the constant 1.5px non-scaling hairline (the defect)
 *   AFTER  — markStrokePx's optical ramp (1.5@32 → 1.125@16 → 0.9 floor)
 * → audits/evidence/r324/logo-optical-1440-light.png (+ dark).
 * No dev server needed — a static data page, the same SVG the component
 * draws (rect + diamond + point, miter, non-scaling-stroke).
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audits', 'evidence', 'r324');
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

/* mark.ts constants — pinned by r323-brand-system.test.ts */
const AXIS = { x: 8, y: 8, size: 16 };
const DIAMOND = 'M16 5L27 16L16 27L5 16Z';
const POINT = { x: 22, y: 6, size: 4 };
/* the ramp — the same numbers markStrokePx computes */
const ramp = (s) => (s >= 32 ? 1.5 : Math.max(0.9, +(1.5 - (0.375 * (32 - s)) / 16).toFixed(3)));

const SEATS = [
  [12, 'EdgeTab'],
  [14, 'auth mark'],
  [16, 'the min seat'],
  [22, 'loader/legal/campus'],
  [24, 'sidebar'],
  [26, 'landing header'],
  [32, 'design size'],
  [88, 'lockup min'],
];

const markSvg = (size, stroke) => `
  <svg viewBox="0 0 32 32" width="${size}" height="${size}"
       style="display:block;overflow:visible" role="img" aria-label="مدارك">
    <g stroke="var(--ink)" fill="none" stroke-width="${stroke}"
       stroke-linejoin="miter" vector-effect="non-scaling-stroke">
      <rect x="${AXIS.x}" y="${AXIS.y}" width="${AXIS.size}" height="${AXIS.size}"
            vector-effect="non-scaling-stroke"/>
      <path d="${DIAMOND}" vector-effect="non-scaling-stroke"/>
      <rect x="${POINT.x}" y="${POINT.y}" width="${POINT.size}" height="${POINT.size}"
            fill="var(--accent)" stroke="none"/>
    </g>
  </svg>`;

const rows = SEATS.map(([s, seat]) => `
  <tr>
    <td class="mono">${s}px · ${seat}</td>
    <td class="cell">${markSvg(s, 1.5)}</td>
    <td class="cell">${markSvg(s, ramp(s))}</td>
    <td class="mono">${ramp(s).toFixed(3)}px · ${(ramp(s) / s * 100).toFixed(1)}%</td>
  </tr>`).join('');

const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<style>
  :root { --paper:#F6F6EE; --ink:#282828; --accent:#FA3600; --line:rgba(40,40,40,.18); }
  [data-theme="dark"] { --paper:#1C1C1A; --ink:#F6F6EE; --accent:#FF5A1F; --line:rgba(246,246,238,.22); }
  html,body { margin:0; background:var(--paper); color:var(--ink);
    font-family:'IBM Plex Sans Arabic','Noto Sans Arabic',sans-serif; }
  .wrap { padding:40px 48px; }
  h1 { font-size:21px; font-weight:600; margin:0 0 4px; }
  .sub { font-size:12px; opacity:.62; margin-bottom:24px; font-weight:500; }
  table { border-collapse:collapse; }
  th, td { border:1px solid var(--line); padding:14px 22px; text-align:center; }
  th { font-size:11px; font-weight:600; letter-spacing:.02em; }
  .mono { font-size:11px; font-weight:500; opacity:.75; font-family:ui-monospace,monospace; }
  .cell { width:150px; }
</style></head><body data-theme="light"><div class="wrap">
<h1>X11 — المنحدر البصري للعلامة</h1>
<div class="sub">قبل: شعرة ثابتة 1.5px (تثقل الصغير 2.7×) · بعد: markStrokePx — 1.5@32 → 1.125@16 (نسبة الـ favicon) → أرضية 0.9px</div>
<table>
  <tr><th>المقعد</th><th>قبل — 1.5px ثابتة</th><th>بعد — المنحدر</th><th>الشعرة · النسبة</th></tr>
  ${rows}
</table>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: EXEC });
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1020 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate((t) => document.body.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `logo-optical-1440-${theme}.png`) });
  console.log(`logo-optical-1440-${theme}.png ✓`);
  await page.close();
}
await browser.close();
