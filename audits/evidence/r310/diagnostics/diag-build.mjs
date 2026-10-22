import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
await page.waitForTimeout(400);
await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
await page.waitForTimeout(800);
const jt = await page.locator('.jt').boundingBox();
const read = () =>
  page.evaluate(() => {
    const plan = document.querySelector('.jt-plan');
    const zone = (z) => {
      const el = plan.querySelector(`.pl-zone[data-zone='${z}']`);
      return el ? getComputedStyle(el).fillOpacity : null;
    };
    /* count visible drawables: computed dashoffset ~0 */
    let visible = 0;
    let total = 0;
    for (const el of plan.querySelectorAll('.bp-drawable')) {
      total += 1;
      if (getComputedStyle(el).strokeDashoffset === '0px') visible += 1;
    }
    return {
      stage: document.querySelector('.jt').dataset.stage,
      washes: { lecture: zone('lecture'), checkpoint: zone('checkpoint'), exam: zone('exam'), library: zone('library'), mastery: zone('mastery') },
      visibleDrawables: `${visible}/${total}`,
    };
  });

const fracs = [0.16, 0.38, 0.60, 0.85, 0.97];
for (const frac of fracs) {
  await page.evaluate((y) => window.scrollTo(0, y), [jt.y + jt.height * frac - 450]);
  await page.waitForTimeout(1500);
  console.log(`frac ${frac}:`, JSON.stringify(await read()));
}
await browser.close();
