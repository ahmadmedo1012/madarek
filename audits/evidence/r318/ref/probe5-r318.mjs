// R318 C3-H probe5 (retry) — tablet 768x1024 map-band states + geometry (numbers-only)
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
// lazy-preload sweep (probe1 method)
await page.evaluate(async () => {
  const w = document.querySelector('.main-inner'); const max = w.scrollHeight - w.clientHeight;
  for (let y = 0; y <= max; y += 700) { w.scrollTop = y; await new Promise(r => setTimeout(r, 90)); }
  w.scrollTop = 0; await new Promise(r => setTimeout(r, 400));
});
// freeze — gsap pause + lenis stop, read-back
const froze = await page.evaluate(() => {
  try { if (window.gsap) gsap.globalTimeline.pause(); } catch (e) {}
  const stops = [];
  try { if (window.lenis && window.lenis.stop) { window.lenis.stop(); stops.push('window.lenis'); } } catch (e) {}
  const w = document.querySelector('.main-inner');
  try { if (w && w.lenis && w.lenis.stop) { w.lenis.stop(); stops.push('el.lenis'); } } catch (e) {}
  return { stops, cls: String(w.className) };
});
console.log('freeze:', JSON.stringify(froze));

// band geometry (wrapper-scroller coordinates)
const geo = await page.evaluate(() => {
  const w = document.querySelector('.main-inner');
  const top = (el) => Math.round(el.getBoundingClientRect().top + w.scrollTop);
  const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
  const sec = document.querySelector('section.home-map');
  const out = {
    maxScroll: w.scrollHeight - w.clientHeight,
    docH: w.scrollHeight,
    rootFont: getComputedStyle(document.documentElement).fontSize,
    sections: [...document.querySelectorAll('section')].map(s => ({ cls: (s.getAttribute('class') || ''), top: top(s), h: Math.round(s.getBoundingClientRect().height) })).filter(s => s.cls.includes('home-')),
    band: { top: top(sec), height: Math.round(sec.getBoundingClientRect().height) },
    stickyEls: [...sec.querySelectorAll('*')].filter(el => getComputedStyle(el).position === 'sticky').map(el => ({ cls: String(el.className).slice(0, 60), box: box(el), stickyTop: getComputedStyle(el).top })),
    monoMarkersNN05: [...document.querySelectorAll('*')].filter(el => /^\[\d{1,2}\/0?5\]$/.test((el.textContent || '').trim().slice(0, 8))).length,
  };
  return out;
});
fs.writeFileSync(`${OUT}/meta-768.json`, JSON.stringify(geo, null, 1));
const bandTop = geo.band.top, vh = 1024;
const stickyEnd = bandTop + geo.band.height - vh;
const range = stickyEnd - bandTop;
console.log('band', JSON.stringify(geo.band), '-> stickyEnd', stickyEnd, 'range', range, 'maxScroll', geo.maxScroll, 'rootFont', geo.rootFont);
console.log('stickyEls:', JSON.stringify(geo.stickyEls));

async function setScrollChecked(y) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate((yy) => { document.querySelector('.main-inner').scrollTop = yy; try { ScrollTrigger.update(); } catch (e) {} }, Math.round(y));
    await page.waitForTimeout(140);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(120);
    const actual = await page.evaluate(() => document.querySelector('.main-inner').scrollTop);
    if (Math.abs(actual - y) <= 2) return actual;
    console.log(`retry scroll ${y} (got ${actual})`);
    await page.evaluate(() => { try { if (window.lenis) window.lenis.stop(); } catch (e) {} });
  }
  return await page.evaluate(() => document.querySelector('.main-inner').scrollTop);
}

const measure = () => page.evaluate(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
  const cs = (el) => { const c = getComputedStyle(el); return { o: Math.round(+c.opacity * 100) / 100, d: c.display, pos: c.position }; };
  const out = { scroll: document.querySelector('.main-inner').scrollTop };
  const sec = document.querySelector('section.home-map');
  const q = (sel) => sec.querySelector(sel);
  const plan = q('.home-map-main-stick-inner') || q('.home-map-main-img') || q('.home-map-main-stick');
  if (plan) out.plan = { cls: String(plan.className).slice(0, 60), box: box(plan), ...cs(plan) };
  out.imgs = [...sec.querySelectorAll('img')].map(im => { const r = im.getBoundingClientRect(); return { src: (im.currentSrc || '').split('/').pop().slice(0, 40), box: box(im), o: Math.round(+getComputedStyle(im).opacity * 100) / 100, nat: im.naturalWidth + 'x' + im.naturalHeight }; }).filter(v => v.box[2] > 40);
  const intro = q('.home-map-intro');
  if (intro) {
    out.intro = { box: box(intro), ...cs(intro) };
    const head = intro.querySelector('.home-map-intro-head');
    if (head) { out.intro.head = box(head); out.intro.headFs = getComputedStyle(head).fontSize; }
  }
  const content = q('.home-map-content');
  if (content) out.sheet = { box: box(content), ...cs(content) };
  const cwrap = q('.home-map-content-wrap');
  if (cwrap) out.sheetWrap = box(cwrap);
  const h1 = sec.querySelector('h1');
  if (h1) out.h1 = { box: box(h1), fs: getComputedStyle(h1).fontSize, tx: h1.textContent.trim().slice(0, 40) };
  out.redSquares = [...sec.querySelectorAll('[class*="number"]')].map(el => ({ cls: String(el.className).slice(0, 44), box: box(el), o: getComputedStyle(el).opacity })).filter(v => v.box[2] > 10);
  const hc = [...sec.querySelectorAll('[class*="hover"],[class*="card"]')].map(el => ({ cls: String(el.className).slice(0, 44), box: box(el), o: Math.round(+getComputedStyle(el).opacity * 100) / 100 })).filter(v => v.box[2] > 60);
  out.cards = hc;
  return out;
});

const states = [['p000', 0], ['p250', 250], ['p500', 500], ['p750', 750], ['p1000', 1000]];
const ys = {};
for (const [name, p] of states) {
  const y = Math.round(bandTop + range * p / 1000);
  ys[name] = y;
  const actual = await setScrollChecked(y);
  fs.writeFileSync(`${OUT}/map-768-${name}.jpg`, await page.screenshot({ type: 'jpeg', quality: 75 }));
  fs.writeFileSync(`${OUT}/inv-map-768-${name}.json`, JSON.stringify(await measure()));
  console.log(name, 'y=', actual, 'target', y);
}
for (const [name, dy] of [['post1', 300], ['post2', 900]]) {
  const y = Math.round(stickyEnd + dy);
  const actual = await setScrollChecked(y);
  fs.writeFileSync(`${OUT}/map-768-${name}.jpg`, await page.screenshot({ type: 'jpeg', quality: 75 }));
  fs.writeFileSync(`${OUT}/inv-map-768-${name}.json`, JSON.stringify(await measure()));
  console.log(name, 'y=', actual);
}
fs.writeFileSync(`${OUT}/meta-768-states.json`, JSON.stringify({ bandTop, stickyEnd, range, vh, ys }, null, 1));
await browser.close();
console.log('DONE5');
