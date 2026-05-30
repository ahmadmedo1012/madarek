import { chromium } from 'playwright';
const route = process.argv[2] || '/';
const out = process.argv[3];
const yPos = Number(process.argv[4] || 0);
const dark = process.argv[5] === 'dark';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar-LY', colorScheme: dark ? 'dark' : 'light' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' });
if (dark) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('madarek-theme', 'dark');
  });
}
await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0;
    const tick = () => {
      y += window.innerHeight * 0.7;
      window.scrollTo(0, y);
      if (y < document.documentElement.scrollHeight) requestAnimationFrame(tick);
      else { setTimeout(res, 400); }
    };
    requestAnimationFrame(tick);
  });
}, );
await page.evaluate((y) => window.scrollTo(0, y), yPos);
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: false });
console.log('saved ' + out + ' at y=' + yPos);
await browser.close();
