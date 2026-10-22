/* R310 — reference map-scene states via wheel (Lenis intercepts wheel,
 * documentElement never scrolls on the reference). */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname) + '/reference';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto('https://heronaiapp.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
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
  /* continue */
}
await page.waitForTimeout(1200);

/* helper: wheel-scroll N ticks, then settle */
const wheel = async (ticks) => {
  for (let i = 0; i < ticks; i += 1) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(1500);
};

/* get to the map section: hero (887) + intro (723) + problem (743) ≈ 2353px
 * of Lenis space — wheel past it (~12 ticks of 240px) then step through */
await wheel(11);
await page.screenshot({ path: `${OUT}/map-a-intro.png` });
console.log('✓ map-a-intro');

await wheel(5);
await page.screenshot({ path: `${OUT}/map-b-stage1.png` });
console.log('✓ map-b-stage1');

await wheel(5);
await page.screenshot({ path: `${OUT}/map-c-stage2.png` });
console.log('✓ map-c-stage2');

await wheel(5);
await page.screenshot({ path: `${OUT}/map-d-stage3.png` });
console.log('✓ map-d-stage3');

await wheel(5);
await page.screenshot({ path: `${OUT}/map-e-stage4.png` });
console.log('✓ map-e-stage4');

await wheel(6);
await page.screenshot({ path: `${OUT}/map-f-expanded.png` });
console.log('✓ map-f-expanded');

/* the platform scene (Before/After ink panels) */
await wheel(6);
await page.screenshot({ path: `${OUT}/platform-b.png` });
console.log('✓ platform-b');

/* why section */
await wheel(6);
await page.screenshot({ path: `${OUT}/why-b.png` });
console.log('✓ why-b');

/* problem cards with drawn SVG icons (scroll back is hard — instead
 * capture usecase + cta forward) */
await wheel(8);
await page.screenshot({ path: `${OUT}/usecase-b.png` });
console.log('✓ usecase-b');

await wheel(6);
await page.screenshot({ path: `${OUT}/cta-b.png` });
console.log('✓ cta-b');

await browser.close();
console.log('done');
