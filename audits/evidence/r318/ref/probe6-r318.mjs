// R318 C3-H probe6 (retry) — tablet 768x1024 scrub truth: raster inner opacities, intro-hidden proof,
// slogan h1, cue texts, ScrollTrigger census, closing-sheet metrics. Numbers-only.
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = '/home/z/madarek-wt/c3-h/audits/evidence/r318/ref';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, userAgent: UA });
const page = await ctx.newPage();
await page.goto('https://heronaiapp.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
try { await page.waitForFunction(() => { const l = document.querySelector('.loading'); if (!l) return true; return getComputedStyle(l).display === 'none' || l.classList.contains('loaded'); }, { timeout: 60000 }); } catch (e) { console.log('loader wait timeout — continuing'); }
await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
await page.waitForTimeout(1500);
await page.addStyleTag({ content: '#heron-cookie-root{display:none !important}' });
await page.evaluate(async () => {
  const w = document.querySelector('.main-inner'); const max = w.scrollHeight - w.clientHeight;
  for (let y = 0; y <= max; y += 700) { w.scrollTop = y; await new Promise(r => setTimeout(r, 90)); }
  w.scrollTop = 0; await new Promise(r => setTimeout(r, 400));
});
await page.evaluate(() => {
  try { if (window.gsap) gsap.globalTimeline.pause(); } catch (e) {}
  try { if (window.lenis && window.lenis.stop) window.lenis.stop(); } catch (e) {}
  const w = document.querySelector('.main-inner');
  try { if (w && w.lenis && w.lenis.stop) w.lenis.stop(); } catch (e) {}
});
// band geometry + ST census
const geo = await page.evaluate(() => {
  const w = document.querySelector('.main-inner');
  const sec = document.querySelector('section.home-map');
  const bandTop = Math.round(sec.getBoundingClientRect().top + w.scrollTop);
  const height = Math.round(sec.getBoundingClientRect().height);
  let triggers = [];
  try { triggers = ScrollTrigger.getAll().map(t => ({ id: (t.vars && (t.vars.id || t.vars.className)) || '', start: Math.round(t.start), end: Math.round(t.end), scrub: !!(t.vars && t.vars.scrub), pin: !!(t.pin) })); } catch (e) {}
  return { bandTop, height, stickyEnd: bandTop + height - 1024, maxScroll: w.scrollHeight - w.clientHeight, triggers, nTriggers: triggers.length };
});
fs.writeFileSync(`${OUT}/triggers-768.json`, JSON.stringify({ viewport: [768, 1024], maxScroll: geo.maxScroll, nTriggers: geo.nTriggers, triggers: geo.triggers }, null, 1));
console.log('band', geo.bandTop, 'end', geo.stickyEnd, 'ST count', geo.nTriggers);

async function setScrollChecked(y) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate((yy) => { document.querySelector('.main-inner').scrollTop = yy; try { ScrollTrigger.update(); } catch (e) {} }, Math.round(y));
    await page.waitForTimeout(140);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(120);
    const actual = await page.evaluate(() => document.querySelector('.main-inner').scrollTop);
    if (Math.abs(actual - y) <= 2) return actual;
    await page.evaluate(() => { try { if (window.lenis) window.lenis.stop(); } catch (e) {} });
  }
  return await page.evaluate(() => document.querySelector('.main-inner').scrollTop);
}

const read = () => page.evaluate(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
  const out = { scroll: document.querySelector('.main-inner').scrollTop };
  const sec = document.querySelector('section.home-map');
  // raster layer truth: wrapper class + inner opacity
  out.rasters = [...sec.querySelectorAll('.home-map-main-img')].map(wr => {
    const inner = wr.querySelector('.home-map-main-img-inner');
    const img = wr.querySelector('img');
    const ir = wr.getBoundingClientRect();
    return { cls: String(wr.className).slice(0, 40), box: [Math.round(ir.x * 10) / 10, Math.round(ir.y * 10) / 10, Math.round(ir.width * 10) / 10, Math.round(ir.height * 10) / 10], innerO: inner ? Math.round(+getComputedStyle(inner).opacity * 1000) / 1000 : null, src: img ? (img.currentSrc || '').split('/').pop().slice(-24) : null };
  }).filter(v => v.box[2] > 50);
  // intro hidden-proof
  const intro = sec.querySelector('.home-map-intro');
  if (intro) {
    const cs = getComputedStyle(intro);
    out.intro = { cls: String(intro.className), box: box(intro), computedO: cs.opacity, inlineO: (intro.style && intro.style.opacity) || '', display: cs.display, vis: cs.visibility };
  }
  // slogan / h1 document-wide
  out.h1s = [...document.querySelectorAll('h1')].map(h => { const c = getComputedStyle(h); const r = h.getBoundingClientRect(); return { cls: String(h.className).slice(0, 40), box: box(h), o: c.opacity, fs: c.fontSize, fw: c.fontWeight, col: c.color, tx: h.textContent.trim().slice(0, 44) }; });
  // visible cue-like mono texts
  out.cues = [...document.querySelectorAll('body *')].filter(el => {
    if (el.children.length) return false;
    const t = (el.textContent || '').trim();
    if (!t || t.length > 60) return false;
    const c = getComputedStyle(el);
    if (+c.opacity < 0.15) return false;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > 1024 || r.width === 0) return false;
    return /\[\s*(SCROLL|CLICK|\d)/i.test(t) || /SCROLL TO|CONTINUE/i.test(t);
  }).map(el => { const c = getComputedStyle(el); const r = el.getBoundingClientRect(); return { tx: el.textContent.trim().slice(0, 50), box: [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10], fs: c.fontSize, col: c.color, ff: c.fontFamily.split(',')[0], o: Math.round(+c.opacity * 100) / 100 }; });
  return out;
});

const states = [['p000', 0], ['p250', 250], ['p500', 500], ['p750', 750], ['p1000', 1000], ['post1', 300]];
const result = {};
for (const [name, p] of states) {
  const y = p === 300 ? geo.stickyEnd + 300 : Math.round(geo.bandTop + (geo.stickyEnd - geo.bandTop) * p / 1000);
  const actual = await setScrollChecked(y);
  result[name] = await read();
  console.log(name, 'y=', actual);
}
// closing-sheet metrics at post1
result.sheetMetrics = await page.evaluate(() => {
  const sec = document.querySelector('section.home-map');
  const sheet = sec.querySelector('.home-map-content');
  if (!sheet) return null;
  const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
  const cs = (el) => { const c = getComputedStyle(el); return { fs: c.fontSize, fw: c.fontWeight, col: c.color, ff: c.fontFamily.split(',')[0], ls: c.letterSpacing, o: Math.round(+c.opacity * 100) / 100 }; };
  const out = { box: box(sheet), pos: getComputedStyle(sheet).position, grid: getComputedStyle(sheet).display };
  for (const sel of ['.home-map-content-label', '.home-map-content-title', '.home-map-content-sub', '.home-map-cms-item', '.home-map-cms-list']) {
    const el = sheet.querySelector(sel) || sec.querySelector(sel);
    if (el) out[sel.slice(1)] = { box: box(el), ...cs(el), tx: (el.textContent || '').trim().slice(0, 50) };
  }
  const items = [...sheet.querySelectorAll('[class*="cms-item"], [class*="item"]')].slice(0, 8).map(el => ({ cls: String(el.className).slice(0, 40), box: box(el) }));
  out.itemsSample = items;
  return out;
});
fs.writeFileSync(`${OUT}/inv-map-768-scrub-truth.json`, JSON.stringify(result, null, 1));
console.log('sheet:', JSON.stringify(result.sheetMetrics && result.sheetMetrics.box));
await browser.close();
console.log('DONE6');
