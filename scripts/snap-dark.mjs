import { chromium } from 'playwright';
const route = process.argv[2] || '/';
const out = process.argv[3];
const email = process.argv[4];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar-LY', colorScheme: 'dark' });
const page = await ctx.newPage();
if (email) {
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('madarek-theme','dark'); });
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', '1234');
  await Promise.all([ page.waitForURL(u => !u.pathname.includes('/auth')), page.click('button.auth-submit') ]);
}
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' });
await page.evaluate(() => { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('madarek-theme','dark'); });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: false });
console.log('saved ' + out);
await browser.close();
