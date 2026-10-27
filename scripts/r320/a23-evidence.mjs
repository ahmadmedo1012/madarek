#!/usr/bin/env node
/**
 * R320 §A2/§A3/§A4 visual evidence — footer wordmark (outline), the
 * ink strip (large images + mono captions + label row), and the plan
 * labels, at 1440 + 768 × light/dark. JPEG q78 <150KB each into
 * audits/evidence/r320/landing/.
 */
import { chromium } from 'playwright-core';
import { spawnVite, waitReady, killTree, parseArgs } from './gate-lib.mjs';
import { mkdirSync } from 'node:fs';

const opt = parseArgs(process.argv.slice(2), { port: 4261 });
const OUT = 'audits/evidence/r320/landing';
mkdirSync(OUT, { recursive: true });

let vite = null;
const baseUrl = opt.baseUrl || `http://127.0.0.1:${opt.port}`;
if (!opt.baseUrl) {
  vite = spawnVite(opt.port);
  if (!(await waitReady(baseUrl))) { console.error('vite not up'); killTree(vite); process.exit(2); }
}
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) {
    for (const vp of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }]) {
      const ctx = await browser.newContext({
        viewport: vp,
        reducedMotion: 'reduce',
        locale: 'ar',
        deviceScaleFactor: 1,
      });
      await ctx.addInitScript(([t]) => {
        try {
          localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: 0 }, version: 2 }));
          sessionStorage.setItem('madarek-intro-skip', '1');
          document.documentElement.dataset.theme = t;
        } catch { /* storage off */ }
      }, [theme]);
      const page = await ctx.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => { await page.waitForTimeout(1500); });
      await page.waitForTimeout(1200);

      // (1) the footer — wordmark + strip
      const footer = page.locator('.fo-footer');
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const fName = `${OUT}/footer-${vp.width}-${theme}.jpg`;
      await footer.screenshot({ path: fName, type: 'jpeg', quality: 78 });
      console.log(`✓ ${fName}`);

      // measure: strip geometry + wordmark paint (computed styles)
      const probe = await page.evaluate(() => {
        const svg = document.querySelector('.fl-svg');
        const imgs = [...document.querySelectorAll('.fl-render')];
        const caps = [...document.querySelectorAll('.fl-labels text')];
        const head = document.querySelector('.fl-head');
        const coord = document.querySelector('.fl-coord');
        const mark = document.querySelector('.fo-wordmark-ink');
        const markFill = mark ? getComputedStyle(mark).fill : null;
        const markStroke = mark ? getComputedStyle(mark).stroke : null;
        const twin = document.querySelector('.fo-wordmark-ink-fill');
        const imgBox = imgs[0] ? imgs[0].getBoundingClientRect() : null;
        const capBox = caps[0] ? caps[0].getBoundingClientRect() : null;
        const headBox = head ? head.getBoundingClientRect() : null;
        // overlap check: label row vs first (rightmost) thumbnail
        let overlap = null;
        if (headBox && imgBox) {
          const ix = Math.min(headBox.right, imgBox.right) - Math.max(headBox.left, imgBox.left);
          const iy = Math.min(headBox.bottom, imgBox.bottom) - Math.max(headBox.top, imgBox.top);
          overlap = ix > 0 && iy > 0 ? +(ix * iy).toFixed(1) : 0;
        }
        return {
          stripH: svg ? Math.round(svg.getBoundingClientRect().height) : null,
          imgH: imgBox ? Math.round(imgBox.height) : null,
          imgW: imgBox ? Math.round(imgBox.width) : null,
          capH: capBox ? Math.round(capBox.height) : null,
          capFont: caps[0] ? getComputedStyle(caps[0]).fontFamily.split(',')[0] + ' ' + getComputedStyle(caps[0]).fontSize : null,
          capWeight: caps[0] ? getComputedStyle(caps[0]).fontWeight : null,
          headH: headBox ? Math.round(headBox.height) : null,
          coordText: coord ? coord.textContent : null,
          headImgOverlap: overlap,
          wordmarkFill: markFill,
          wordmarkStroke: markStroke,
          tintTwinPresent: !!twin,
        };
      });
      console.log(`  ${vp.width} ${theme}: ${JSON.stringify(probe)}`);

      // (2) the plan labels (1440 only, light only — the §A4 seat check)
      if (vp.width === 1440 && theme === 'light') {
        const jt = page.locator('.jt-pin');
        await jt.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        const pName = `${OUT}/plan-labels-1440-light.jpg`;
        await page.screenshot({ path: pName, type: 'jpeg', quality: 72, clip: { x: 0, y: 0, width: 1440, height: 900 } });
        console.log(`✓ ${pName}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  if (vite) killTree(vite);
}
