import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('/tmp/madarek-shots', { recursive: true });

const route = process.argv[2] || '/';
const out = process.argv[3] || '/tmp/madarek-shots/_one.png';
const email = process.argv[4];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();
if (email) {
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', '1234');
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/auth')),
    page.click('button.auth-submit'),
  ]);
}
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle', timeout: 25_000 });
await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0;
    const tick = () => {
      y += window.innerHeight * 0.7;
      window.scrollTo(0, y);
      if (y < document.documentElement.scrollHeight) requestAnimationFrame(tick);
      else { window.scrollTo(0, 0); setTimeout(res, 600); }
    };
    requestAnimationFrame(tick);
  });
});
await page.screenshot({ path: out, fullPage: true });
console.log('saved ' + out);
await browser.close();
