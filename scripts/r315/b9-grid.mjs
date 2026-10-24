import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.waitForTimeout(1200);
await page.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const g = document.querySelector('.fo-fgrid');
  const cs = getComputedStyle(g);
  const m = matchMedia('(max-width: 640px)');
  const cells = [...g.children].map((c) => {
    const ccs = getComputedStyle(c);
    return { cls: c.className, area: ccs.gridArea, col: ccs.gridColumn, row: ccs.gridRow };
  });
  const sheetRules = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list, depth) => {
      for (const r of list) {
        if (r.selectorText && /fo-fgrid/.test(r.selectorText)) {
          sheetRules.push({ sel: r.selectorText, cols: r.style.gridTemplateColumns, areas: r.style.gridTemplateAreas, cond: r.conditionText || r.parentRule?.conditionText || '', nested: depth > 0 });
        }
        if (r.cssRules) walk(r.cssRules, depth + 1);
      }
    };
    walk(rules, 0);
  }
  return { cols: cs.gridTemplateColumns, areas: cs.gridTemplateAreas, matches640: m.matches, cells, sheetRules };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
