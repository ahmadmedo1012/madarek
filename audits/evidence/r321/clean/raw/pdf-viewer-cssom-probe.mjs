/**
 * pdf-viewer-cssom-probe.mjs — §C-6 by-product probe: prove what the
 * malformed comment banner at r305-research-pdf-ai.css:769 (missing
 * `/*` opener; prose ships to dist) drops from the live CSSOM on the
 * PDF-reader sheet. Evidence for the baseline ticket, not a fix.
 */
import { chromium } from 'playwright-core';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch {} });
await page.goto('http://localhost:4290/auth', { waitUntil: 'domcontentloaded' });
await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill('student@test.ly');
await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('12345678');
await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
await page.waitForURL(/dashboard/, { timeout: 45000 });
await page.goto('http://localhost:4290/student/library', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const res = await page.evaluate(() => {
  for (const sheet of document.styleSheets) {
    if (!/r305-research-pdf-ai/.test(sheet.href || '')) continue;
    const flat = [];
    const walk = (rules, media) => {
      for (const r of rules) {
        if (r.type === CSSRule.MEDIA_RULE) { walk(r.cssRules, media ? media + ' && ' + r.conditionText : r.conditionText); continue; }
        if (r.type === CSSRule.LAYER_BLOCK_RULE) { walk(r.cssRules, media); continue; }
        if (r.type === CSSRule.SUPPORTS_RULE) { walk(r.cssRules, media); continue; }
        if (r.selectorText) flat.push({ sel: r.selectorText, media: media || '(root)' });
      }
    };
    try { walk(sheet.cssRules, null); } catch { return { href: sheet.href, err: 'cors' }; }
    return {
      href: sheet.href,
      liveRuleCount: flat.length,
      pdfViewerRule: flat.find((r) => /pdf-viewer/.test(r.sel)) ?? null,
      canvasWrapRule: flat.find((r) => /pdf-canvas-wrap/.test(r.sel)) ?? null,
      docReaderHeadRule: flat.find((r) => /doc-reader-head/.test(r.sel)) ?? null,
      firstFive: flat.slice(0, 5).map((r) => r.sel),
      prosePresent: [...sheet.cssRules].some((r) => /§C/.test(r.cssText || '')),
    };
  }
  return null;
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
/* second probe pass: raw top-level structure + selector search inside every container */
const browser2 = await chromium.launch();
const page2 = await browser2.newPage({ viewport: { width: 1440, height: 900 } });
await page2.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch {} });
await page2.goto('http://localhost:4290/auth', { waitUntil: 'domcontentloaded' });
await page2.getByLabel('البريد الإلكتروني أو رقم القيد').fill('student@test.ly');
await page2.getByRole('textbox', { name: 'كلمة المرور' }).fill('12345678');
await page2.getByRole('button', { name: 'تسجيل الدخول' }).click();
await page2.waitForURL(/dashboard/, { timeout: 45000 });
await page2.goto('http://localhost:4290/student/library', { waitUntil: 'domcontentloaded' });
await page2.waitForTimeout(2500);
const res2 = await page2.evaluate(() => {
  for (const sheet of document.styleSheets) {
    if (!/r305-research-pdf-ai/.test(sheet.href || '')) continue;
    const all = [];
    let found = [];
    const hunt = (rules, container) => {
      for (const r of rules) {
        const name = r.constructor?.name || r.type;
        if (r.selectorText) {
          if (/pdf-viewer|doc-reader-head|pdf-canvas-wrap|r305rp-eyebrow|r305rp-chip\b/.test(r.selectorText)) found.push({ container, sel: r.selectorText });
        }
        if (r.cssRules) hunt(r.cssRules, name);
      }
    };
    hunt(sheet.cssRules, 'sheet');
    return {
      href: sheet.href,
      topLevel: [...sheet.cssRules].map((r) => ({ kind: r.constructor?.name || r.type, sel: r.selectorText || r.conditionText || r.name || '' })),
      found,
    };
  }
  return null;
});
console.log(JSON.stringify(res2, null, 1));
await browser2.close();
