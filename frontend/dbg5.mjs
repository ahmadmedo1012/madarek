import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto('http://localhost:5173/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
const res = await page.evaluate(() => {
  const mk = (disabled) => {
    const i = document.createElement('input');
    i.className = 'input';
    if (disabled) i.disabled = true;
    document.body.appendChild(i);
    const cs = getComputedStyle(i);
    const out = { color: cs.color, bg: cs.backgroundColor, borderColor: cs.borderColor, cursor: cs.cursor, opacity: cs.opacity };
    i.remove();
    return out;
  };
  return { enabled: mk(false), disabled: mk(true) };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
