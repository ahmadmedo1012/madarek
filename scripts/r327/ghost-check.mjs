import { chromium } from 'playwright-core';
const EXEC = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXEC, args: ['--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch {} });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const out = await page.evaluate(() => {
  const results = [];
  for (const btn of document.querySelectorAll('a.btn.ghost, button.btn.ghost')) {
    const cs = getComputedStyle(btn);
    let bg = btn, bgc = 'transparent', chain = [];
    while (bg && bg !== document.documentElement) {
      const c = getComputedStyle(bg).backgroundColor;
      chain.push(`${bg.tagName}.${(bg.className||'').toString().split(' ').slice(0,3).join('.')}=${c}`);
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') { bgc = c; break; }
      bg = bg.parentElement;
    }
    const r = btn.getBoundingClientRect();
    results.push({
      text: (btn.textContent || '').trim().slice(0, 30),
      color: cs.color, foundBg: bgc, visible: r.width > 0 && r.height > 0,
      inView: r.top < 800 && r.bottom > 0,
      size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      chain: chain.slice(0, 5),
    });
  }
  return results;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
