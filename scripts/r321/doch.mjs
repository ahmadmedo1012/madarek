#!/usr/bin/env node
/**
 * r321-doch.mjs — the §A2 height ratchet probe. Measures the landing's
 * docH + every top-level band's height at the pinned viewports (NO
 * reduced-motion — the R319 protocol; RM inflates desktop docH ~9%)
 * and diffs against the Heron reference ladder
 * (docs/redesign/r313/STATE.md + r308/reference-interaction-map.json).
 *
 * Usage: node scripts/r321/doch.mjs [--base http://localhost:4173]
 */
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const BASE = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4173';

/* Heron reference (1440×900 unless noted): sections + page heights. */
const HERON_1440 = {
  sections: { hero: 887, intro: 723, problem: 743, map: 6300, platform: 710, why: 698, usecase: 887, cta: 698, footer: 711 },
  docH: 12355,
};
const HERON_DOCH = { 1440: 12355, 1024: 9938, 768: 12577, 390: 11441, 360: 10684 };

const VIEWPORTS = [
  [320, 568], [360, 800], [390, 844], [430, 932], [480, 800],
  [600, 800], [768, 1024], [820, 1180], [1024, 768], [1180, 800], [1440, 900],
];

const browser = await chromium.launch();
const out = { docH: {}, sections: {} };

for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  // let the intro/loader settle (skip key seeded by fresh context? seed
  // it to keep the landing world mounted — the loader replays otherwise
  // and the sheet's staged reveal may hold heights)
  await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => {
    const docH = document.documentElement.scrollHeight;
    const sections = {};
    const main = document.querySelector('.landing main') || document.querySelector('main');
    if (main) {
      for (const el of main.children) {
        const cls = String(el.className || el.tagName).split(' ')[0].slice(0, 20) || el.tagName;
        const r = el.getBoundingClientRect();
        sections[cls] = Math.round(r.height);
      }
    }
    return { docH, sections };
  });
  out.docH[w] = m.docH;
  if ([768, 1024, 1440].includes(w)) out.sections[w] = m.sections;
  await ctx.close();
}
await browser.close();

console.log('== docH ladder (no RM) ==');
for (const [w, h] of VIEWPORTS) {
  const v = out.docH[w];
  const heron = HERON_DOCH[w];
  const delta = heron ? `${((v / heron - 1) * 100).toFixed(2)}% vs Heron ${heron}` : '(no Heron ref — never-raise pin)';
  console.log(`  ${w}×${h}: ${v}  ${delta}`);
}
console.log('== sections vs Heron ==');
const order = Object.keys(HERON_1440.sections);
for (const w of [768, 1024, 1440]) {
  const ours = Object.entries(out.sections[w] || {});
  console.log(`  @${w} ours:    ${ours.map(([k, v]) => `${k}=${v}`).join(' · ')}`);
  if (w === 1440) console.log(`  @${w} heron:   ${order.map((k) => `${k}=${HERON_1440.sections[k]}`).join(' · ')}`);
}
console.log(JSON.stringify(out, null, 1));
