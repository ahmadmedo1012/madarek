import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ storageState: '/tmp/madarek-states/student.json', viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__auditNoClick = true;
  document.addEventListener('click', (e) => { if (window.__auditNoClick) { e.preventDefault(); e.stopPropagation(); } }, true);
});
await page.goto('http://localhost:5173/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
const btn = page.locator('a.btn.primary').first();
await btn.scrollIntoViewIfNeeded().catch(() => {});
const box = await btn.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(300);
const res = await btn.evaluate((el) => {
  const cs = getComputedStyle(el);
  return {
    hover: el.matches(':hover'), active: el.matches(':active'),
    transform: cs.transform, boxShadow: cs.boxShadow.slice(0, 100),
  };
});
await page.mouse.up();
console.log(JSON.stringify(res, null, 1));
await browser.close();
