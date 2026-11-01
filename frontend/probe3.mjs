import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:390,height:844} });
const page = await ctx.newPage();
await page.goto('http://localhost:3000', { waitUntil:'networkidle' });
await page.waitForTimeout(2000);
const m = await page.evaluate(() => {
  const hero = document.querySelector('.fo-hero');
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules = []; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list, ctxm) => {
      for (const r of list) {
        if (r.cssRules && r.conditionText !== undefined) { walk(r.cssRules, (ctxm?ctxm+' && ':'')+r.conditionText); continue; }
        if (!r.selectorText) continue;
        let m2 = false;
        try { m2 = hero.matches(r.selectorText); } catch { continue; }
        if (m2 && (r.cssText.includes('padding-block-end') || r.cssText.includes('padding-block:') || r.cssText.includes('padding:'))) {
          out.push({ media: ctxm || 'all', sel: r.selectorText.slice(0,60), txt: r.cssText.slice(0, 160) });
        }
      }
    };
    walk(rules, null);
  }
  return out;
});
console.log(JSON.stringify(m, null, 1));
await browser.close();
