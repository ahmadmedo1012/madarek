import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ storageState: '/tmp/madarek-states/student.json', viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__auditNoClick = true;
  document.addEventListener('click', (e) => {
    if (window.__auditNoClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);
});
await page.goto('http://localhost:5173/student/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);
const info = await page.evaluate(() => ({
  url: location.pathname,
  btns: document.querySelectorAll('.btn').length,
  bodyChild: document.body.children.length,
  bodyClass: document.body.className,
  text: (document.querySelector('.content-inner') || document.body).textContent.slice(0, 120),
}));
console.log(JSON.stringify(info));
await browser.close();
