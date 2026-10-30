/* P2.2 probe — assert the gallery's §R325 seats actually resolve. */
import { chromium } from 'playwright-core';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:5210/__design', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(1500);

const probe = await page.evaluate(() => {
  const q = (s) => document.querySelectorAll(s).length;
  const cs = (el) => getComputedStyle(el);
  const ownerSwatch = document.querySelector('.r323d-role-swatch--owner');
  const hatch = document.querySelector('.pat-hatch.r323d-hover-target, .r323d-hover-target.pat-hatch');
  const sticky = document.querySelector('.table-wrap.sticky thead th');
  const chip = document.querySelector('.r323d-chip-dot--signal');
  const banner = document.querySelector('.r323d-stackdemo-banner');
  const fab = document.querySelector('.r323d-stackdemo-fab');
  return {
    sections: q('.r323d-section'),
    interactives: q('button, a, input, select, textarea, [role="tab"]'),
    h1: q('h1'),
    ownerSwatchImage: ownerSwatch ? cs(ownerSwatch).backgroundImage.slice(0, 60) : 'MISSING',
    hatchImage: hatch ? cs(hatch).backgroundImage.slice(0, 60) : 'MISSING',
    stickyPos: sticky ? cs(sticky).position : 'MISSING',
    chipDot: chip ? `${cs(chip).width} ${cs(chip).backgroundColor}` : 'MISSING',
    bannerOffset: banner ? banner.style.getPropertyValue('--app-bottom-stack') : 'MISSING',
    fabOffset: fab ? fab.style.getPropertyValue('--app-bottom-stack') : 'MISSING',
    rootStack: cs(document.documentElement).getPropertyValue('--app-bottom-stack'),
    axisBorder: (() => { const a = document.querySelector('.r323d-axis'); return a ? cs(a).borderBlockEndColor + ' ' + cs(a).borderBlockEndWidth : 'MISSING'; })(),
  };
});
console.log(JSON.stringify(probe, null, 2));
console.log('console errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
