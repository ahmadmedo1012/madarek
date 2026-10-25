const { chromium } = require('/home/z/madarek/node_modules/@playwright/test');
const { execSync } = require('child_process');
(async () => {
  const b = await chromium.launch();
  for (const [w, h, dpr] of [[1440, 900, 2], [390, 844, 2]]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const p = await ctx.newPage();
      if (theme === 'dark') await p.addInitScript(() => { try { localStorage.setItem('madarek-theme', 'dark'); } catch {} });
      await p.goto('http://localhost:4228/', { waitUntil: 'networkidle' });
      await p.waitForTimeout(3000);
      const el = p.locator('.fo-wordmark .fo-wordmark-svg:visible').first();
      await el.waitFor({ state: 'visible', timeout: 9000 });
      await el.scrollIntoViewIfNeeded();
      await p.waitForTimeout(400);
      const shot = `/tmp/wmk-${w}-${theme}.jpg`;
      await el.screenshot({ path: shot, type: 'jpeg', quality: 70 });
      let read = '';
      for (const psm of [7, 6]) {
        try { const out = execSync(`TESSDATA_PREFIX=/home/z/.tessdata tesseract ${shot} stdout -l ara+eng --psm ${psm}`, { encoding: 'utf8', shell: '/bin/bash' }); if (out.trim()) { read = out.trim(); break; } } catch {}
      }
      const norm = read.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C]/g, '').replace(/[^\u0621-\u064A]/g, '');
      console.log(`${w} ${theme}: "${read.slice(0, 30)}" ${norm.includes('مدارك') ? '✓' : '✗ ' + norm}`);
      await ctx.close();
    }
  }
  await b.close();
})();
