import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 800, height: 400 } })).newPage();
await page.goto('file:///home/z/madarek/audits/evidence/r310/repro/index.html');
await page.waitForFunction(() => window.__result, { timeout: 8000 });
console.log(JSON.stringify(await page.evaluate(() => window.__result)));
await page.screenshot({ path: 'audits/evidence/r310/repro/result.png' });
await browser.close();
