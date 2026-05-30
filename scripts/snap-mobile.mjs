import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('/tmp/madarek-shots', { recursive: true });

const route = process.argv[2];
const out = process.argv[3];
const email = process.argv[4];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-LY', deviceScaleFactor: 2 });
const page = await ctx.newPage();
if (email) {
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', '1234');
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes('/auth')),
    page.click('button.auth-submit'),
  ]);
}
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle', timeout: 25_000 });
await page.evaluate(() => document.fonts?.ready);
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
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log('saved ' + out);
