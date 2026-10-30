/* Y5 landing Ink-parity sheets — evidence shooter.
 * Shoots every landing section at 1440 & 390 in paper (light) and ink
 * (dark) themes → PNG in /home/z/scripts/shots, converted to .webp by
 * the PIL step in shoot-convert.
 */
import { chromium } from '/home/z/wt/ink-landing/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const OUT = '/home/z/scripts/shots';
fs.mkdirSync(OUT, { recursive: true });

const BPS = [
  { tag: '1440', width: 1440, height: 900 },
  { tag: '390', width: 390, height: 844 },
];
const THEMES = [
  { tag: 'paper', mode: 'light' },
  { tag: 'ink', mode: 'dark' },
];

// section targets: selector + kind. kind 'element' → element shot after
// top-align scroll; 'statement' → scrub-settled scroll then element shot;
// 'slices' → viewport shots at the given offsets from section top.
const SECTIONS = [
  { name: 'hero', sel: 'section.fo-hero', kind: 'element' },
  { name: 'statement', sel: '#statement', kind: 'statement' },
  { name: 'pains', sel: '#live', kind: 'element' },
  { name: 'map', sel: '#chapters', kind: 'slices', offsets: [0, 2100, 4300, 5600] },
  { name: 'platform', sel: '#product', kind: 'element' },
  { name: 'why', sel: '.wy-section', kind: 'element' },
  { name: 'roles', sel: '#roles', kind: 'element' },
  { name: 'cta', sel: '#vision', kind: 'element' },
  { name: 'footer', sel: '.fo-footer', kind: 'element' },
];

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

for (const bp of BPS) {
  for (const th of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(([mode]) => {
      localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode, modeUpdatedAt: 0 }, version: 2 }));
      localStorage.setItem('madarek.consent', 'accepted');
    }, [th.mode]);
    await page.goto('http://localhost:5208/', { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(3200); // sheet loader plays out + fonts
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (themeAttr !== th.mode) throw new Error(`theme mismatch: want ${th.mode} got ${themeAttr}`);

    for (const sec of SECTIONS) {
      const handle = await page.$(sec.sel);
      if (!handle) { console.log(`MISSING ${sec.sel}`); continue; }
      if (sec.kind === 'slices') {
        const box = await handle.boundingBox();
        for (let i = 0; i < sec.offsets.length; i++) {
          const y = Math.min(box.y + sec.offsets[i], await page.evaluate(() => document.documentElement.scrollHeight) - bp.height);
          await page.evaluate((yy) => window.scrollTo(0, yy), y);
          await page.waitForTimeout(2000);
          await page.screenshot({ path: `${OUT}/${sec.name}-${i + 1}-${bp.tag}-${th.tag}.png`, type: 'png' });
        }
      } else if (sec.kind === 'statement') {
        // settle the per-word scrub: title center at 0.4×vh → --wr-p = 1
        await page.evaluate((sel) => {
          const sec = document.querySelector(sel);
          const title = document.querySelector('#statement-title');
          const vh = window.innerHeight;
          const tRect = title.getBoundingClientRect();
          const target = window.scrollY + (tRect.top + tRect.height / 2) - vh * 0.4;
          window.scrollTo(0, Math.max(target, sec.getBoundingClientRect().top + window.scrollY - 40));
        }, sec.sel);
        await page.waitForTimeout(2200);
        await handle.screenshot({ path: `${OUT}/${sec.name}-${bp.tag}-${th.tag}.png`, type: 'png' });
      } else {
        await handle.scrollIntoViewIfNeeded();
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 8);
        }, sec.sel);
        await page.waitForTimeout(2000);
        await handle.screenshot({ path: `${OUT}/${sec.name}-${bp.tag}-${th.tag}.png`, type: 'png' });
      }
      console.log(`shot ${sec.name} ${bp.tag} ${th.tag}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log('DONE');
