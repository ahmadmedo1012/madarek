/* R310 — fresh reference captures from heronaiapp.com (1440×900).
 * Mirrors the state matrix of the R308 observation run. */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname) + '/reference';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

console.log('→ goto heronaiapp.com');
await page.goto('https://heronaiapp.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 });

/* loader frames */
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/loader-early.png` });
console.log('  ✓ loader-early');
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/loader-late.png` });
console.log('  ✓ loader-late');

/* wait for the loader overlay to leave (.loading display:none / gone) */
try {
  await page.waitForFunction(
    () => {
      const l = document.querySelector('.loading');
      if (!l) return true;
      const st = getComputedStyle(l);
      return st.display === 'none' || st.opacity === '0';
    },
    { timeout: 20_000 },
  );
} catch {
  console.log('  ! loader wait timeout — continuing');
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/hero-landed.png` });
console.log('  ✓ hero-landed');

/* cursor moving over hero (trail) */
const hero = await page.locator('.home-hero-img-wrap, .home-hero').first().boundingBox();
if (hero) {
  for (let i = 0; i < 14; i += 1) {
    await page.mouse.move(
      hero.x + hero.width * (0.2 + 0.05 * i),
      hero.y + hero.height * (0.35 + 0.25 * Math.sin(i * 0.8)),
      { steps: 3 },
    );
  }
  await page.screenshot({ path: `${OUT}/hero-cursor-moving.png` });
  console.log('  ✓ hero-cursor-moving');

  /* drag-to-inspect */
  await page.mouse.move(hero.x + hero.width * 0.25, hero.y + hero.height * 0.35, { steps: 4 });
  await page.mouse.down();
  for (let i = 1; i <= 14; i += 1) {
    await page.mouse.move(
      hero.x + hero.width * 0.25 + (hero.width * 0.55 * i) / 14,
      hero.y + hero.height * 0.35 + (hero.height * 0.45 * i) / 14,
      { steps: 2 },
    );
  }
  await page.screenshot({ path: `${OUT}/hero-drag.png` });
  console.log('  ✓ hero-drag');
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/hero-drag-released.png` });
  console.log('  ✓ hero-drag-released');
}

/* scroll states — intro, problem, map (3 positions), platform, why, usecase, cta, footer */
const anchors = [
  ['intro', '.home-intro'],
  ['problem', '.home-problem'],
  ['map-early', '.home-map'],
];
for (const [name, sel] of anchors) {
  const el = page.locator(sel).first();
  if (await el.count()) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`  ✓ ${name}`);
  }
}

/* map pinned states — scroll within the map section */
const map = await page.locator('.home-map').first().boundingBox();
if (map) {
  for (const [name, frac] of [['map-mid1', 0.3], ['map-mid2', 0.55], ['map-late', 0.8]]) {
    await page.evaluate(
      ([y]) => window.scrollTo(0, y),
      [map.y + map.height * frac - 300],
    );
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`  ✓ ${name}`);
  }
}

for (const [name, sel] of [
  ['platform', '.home-platform'],
  ['why', '.home-why'],
  ['usecase', '.home-usecase'],
  ['cta', '.cta, .home-cta'],
  ['footer', '.footer'],
]) {
  const el = page.locator(sel).first();
  if (await el.count()) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`  ✓ ${name}`);
  }
}

/* footer lens */
const fstrip = await page.locator('.footer-img-wrap, .footer .ink-mask').first().boundingBox();
if (fstrip) {
  await page.mouse.move(fstrip.x + fstrip.width * 0.4, fstrip.y + fstrip.height * 0.5, { steps: 12 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/footer-lens.png` });
  console.log('  ✓ footer-lens');
}

/* mobile pass */
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const mpage = await mctx.newPage();
await mpage.goto('https://heronaiapp.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
try {
  await mpage.waitForFunction(
    () => {
      const l = document.querySelector('.loading');
      if (!l) return true;
      const st = getComputedStyle(l);
      return st.display === 'none' || st.opacity === '0';
    },
    { timeout: 20_000 },
  );
} catch {
  /* continue */
}
await mpage.waitForTimeout(1200);
await mpage.screenshot({ path: `${OUT}/mobile-hero-390.png` });
console.log('  ✓ mobile-hero-390');
const mmap = await mpage.locator('.home-map').first();
if (await mmap.count()) {
  await mmap.scrollIntoViewIfNeeded();
  await mpage.waitForTimeout(1200);
  await mpage.screenshot({ path: `${OUT}/mobile-map-390.png` });
  console.log('  ✓ mobile-map-390');
}

await browser.close();
console.log('Reference capture complete.');
