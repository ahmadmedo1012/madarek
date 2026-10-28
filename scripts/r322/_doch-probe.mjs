import { chromium } from 'playwright';
const seats = [
  { name: '1440', width: 1440, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
  { name: '360', width: 360, height: 800 },
];
const browser = await chromium.launch();
for (const s of seats) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5175/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3000);
  const doch = await page.evaluate(() => Math.round(document.documentElement.scrollHeight));
  console.log(`${s.name}x${s.height} docH = ${doch}`);
  await ctx.close();
}
await browser.close();
