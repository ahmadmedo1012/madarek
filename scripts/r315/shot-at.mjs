import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const [url, out, w, h, y] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(url.includes('localhost') ? 9000 : 11000);
// scroll the internal scroller if present (heron .main-inner)
await page.evaluate((yy) => {
  const sc = document.querySelector('.main-inner');
  if (sc) sc.scrollTop = yy; else window.scrollTo(0, yy);
}, y);
await page.waitForTimeout(1500);
await page.screenshot({ path: out });
await browser.close();
console.log('shot →', out);
