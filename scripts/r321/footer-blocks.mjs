#!/usr/bin/env node
/** r321-footer-blocks.mjs — footer block heights at several widths. */
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:4173';
const b = await chromium.launch();
for (const [w, h] of [[768, 1024], [1024, 768], [1440, 900]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const out = await p.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      return el ? Math.round(el.getBoundingClientRect().height) : null;
    };
    return {
      footer: pick('.fo-footer'),
      fgrid: pick('.fo-fgrid'),
      fstrip: pick('.fo-fstrip'),
      fl: pick('.fl'),
      wordmark: pick('.fo-wordmark'),
      wordmarkSvg: pick('.fo-wordmark-svg'),
      legalRow: pick('.fo-legal-row'),
      bottom: pick('.fo-footer-bottom'),
      cta: pick('.fo-cta'),
    };
  });
  console.log(`@${w}`, JSON.stringify(out));
  await p.close();
}
await b.close();
