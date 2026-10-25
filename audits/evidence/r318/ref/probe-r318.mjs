// R318 C3-H — progress-anchored extraction from المرجع (heronaiapp.com)
// Usage: node probe-r318.mjs <w> <h> <desktop|mobile>
// Captures: map band scrub states (ScrollTrigger pin progress anchored), statement band,
// platform, footer — viewport JPEG + DOM/SVG computed-style inventory per state.
import { chromium } from 'playwright';
import fs from 'node:fs';

const W = parseInt(process.argv[2] || '1440');
const H = parseInt(process.argv[3] || '900');
const MODE = process.argv[4] || 'desktop';
const OUT = '/home/z/madarek-wt/c3-h/audits/evidence/r318/ref';
fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://heronaiapp.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const invFn = (secSel) => {
  const vw = innerWidth, vh = innerHeight;
  const w = document.querySelector('.main-inner');
  const scrollTop = w ? w.scrollTop : (document.documentElement.scrollTop || scrollY);
  let sec = null;
  try { if (secSel) sec = document.querySelector(secSel); } catch (e) {}
  if (!sec && secSel && /footer/.test(secSel)) {
    sec = document.querySelector('footer, section.footer, .footer');
  }
  const inSec = new Set();
  if (sec) { inSec.add(sec); sec.querySelectorAll('*').forEach((e) => inSec.add(e)); }
  const out = { vw, vh, scrollTop, sec: sec ? String(sec.className).slice(0, 60) : null, elements: [], svgs: [], stProg: [] };
  try { if (window.ScrollTrigger) out.stProg = ScrollTrigger.getAll().map((s) => Math.round(s.progress * 1000) / 1000); } catch (e) {}
  const all = document.querySelectorAll('*');
  let count = 0;
  for (const el of all) {
    if (count > 1200) break;
    const tag = el.tagName.toLowerCase();
    let r; try { r = el.getBoundingClientRect(); } catch (e) { continue; }
    const inView = r.width > 0 && r.height > 0 && r.bottom > -400 && r.top < vh + 400;
    const inS = inSec.has(el);
    if (!inS && !inView) continue;
    const inSvg = tag !== 'svg' && !!el.ownerSVGElement;
    const isTextTag = tag === 'text' || tag === 'tspan';
    if (inSvg && !isTextTag) continue; // shapes are aggregated per-svg below
    const cls = (el.getAttribute('class') || '').slice(0, 90);
    let own = '';
    for (const n of el.childNodes) { if (n.nodeType === 3 && n.textContent.trim()) own += n.textContent.trim() + ' '; }
    own = own.trim().slice(0, 90);
    const isMedia = tag === 'svg' || tag === 'img' || tag === 'canvas' || tag === 'video' || tag === 'picture';
    if (!inS && !cls && !el.id && !isMedia && !own) continue;
    count++;
    const cs = getComputedStyle(el);
    const rec = { t: tag };
    if (cls) rec.c = cls;
    if (el.id) rec.id = el.id.slice(0, 40);
    rec.x = +r.x.toFixed(1); rec.y = +r.y.toFixed(1); rec.w = +r.width.toFixed(1); rec.h = +r.height.toFixed(1);
    rec.o = Math.round(+cs.opacity * 1000) / 1000;
    if (cs.display === 'none') { rec.d = 'none'; out.elements.push(rec); continue; }
    if (cs.visibility === 'hidden') rec.vis = 'hidden';
    if (+cs.opacity === 0) rec.hid = 1;
    if (cs.zIndex !== 'auto') rec.z = cs.zIndex;
    if (cs.position !== 'static') rec.pos = cs.position;
    if (cs.transform !== 'none') rec.tr = cs.transform.slice(0, 72);
    const bg = cs.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)') rec.bg = bg;
    if (!inSvg) {
      const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth];
      if (bw.some((b) => parseFloat(b) > 0)) { rec.bw = bw; rec.bc = cs.borderTopColor; }
    }
    if (own) {
      rec.tx = own; rec.col = cs.color; rec.fs = cs.fontSize; rec.fw = cs.fontWeight;
      rec.ff = cs.fontFamily.split(',')[0].slice(0, 24); rec.lh = cs.lineHeight; rec.ls = cs.letterSpacing;
      if (cs.textTransform !== 'none') rec.tt = cs.textTransform;
    }
    if (isTextTag || tag === 'svg' || inSvg) {
      if (cs.fill !== 'rgb(0, 0, 0)') rec.fi = cs.fill;
      if (cs.stroke !== 'none') { rec.sk = cs.stroke; rec.sw = cs.strokeWidth; }
      if (cs.paintOrder && cs.paintOrder !== 'normal') rec.po = cs.paintOrder;
    }
    out.elements.push(rec);
  }
  const seen = new Set();
  for (const s of document.querySelectorAll('svg')) {
    if (seen.has(s)) continue; seen.add(s);
    const r = s.getBoundingClientRect();
    if (!inSec.has(s) && !(r.width > 0 && r.bottom > -200 && r.top < vh + 200)) continue;
    const agg = {}; let n = 0, texts = 0;
    for (const sh of s.querySelectorAll('path,rect,circle,line,ellipse,polygon,polyline')) {
      if (n > 900) break;
      const sc = getComputedStyle(sh); n++;
      const k = sc.stroke + '|' + sc.strokeWidth + '|' + sc.fill;
      agg[k] = (agg[k] || 0) + 1;
    }
    for (const t of s.querySelectorAll('text')) texts++;
    out.svgs.push({
      c: (s.getAttribute('class') || '').slice(0, 60), id: s.id || undefined,
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      vb: s.getAttribute('viewBox') || undefined, par: s.getAttribute('preserveAspectRatio') || undefined,
      shapes: n, texts, ink: Object.entries(agg).slice(0, 24),
    });
  }
  return out;
};

const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, userAgent: UA, locale: 'en-US', deviceScaleFactor: 1,
  ...(MODE === 'mobile' ? { hasTouch: true, isMobile: true } : {}),
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 160)));
const t0 = Date.now();
await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 90000 });
console.log('loaded, waiting for loader exit…');
try {
  await page.waitForFunction(() => {
    const l = document.querySelector('.loading');
    if (!l) return true;
    const cs = getComputedStyle(l);
    return cs.display === 'none' || l.classList.contains('loaded');
  }, { timeout: 45000 });
} catch { console.log('loader wait timeout — continuing anyway'); }
const loaderMs = Date.now() - t0;
console.log('loader done at', loaderMs, 'ms');
await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
await page.waitForTimeout(1500);
await page.addStyleTag({ content: '#heron-cookie-root{display:none !important}' });

const globals = await page.evaluate(() => ({
  gsap: !!window.gsap, ST: !!window.ScrollTrigger, lenisWin: !!window.lenis, LenisCtor: !!window.Lenis,
  wrapper: !!document.querySelector('.main-inner'),
  wrapperLenis: !!(document.querySelector('.main-inner') && document.querySelector('.main-inner').lenis),
  scrollMax: (() => { const w = document.querySelector('.main-inner'); return w ? w.scrollHeight - w.clientHeight : 0; })(),
}));
console.log('globals', JSON.stringify(globals));

// lazy-load preload pass
await page.evaluate(async () => {
  const w = document.querySelector('.main-inner'); if (!w) return;
  const max = w.scrollHeight - w.clientHeight;
  for (let y = 0; y <= max; y += 700) { w.scrollTop = y; await new Promise((r) => setTimeout(r, 90)); }
  w.scrollTop = 0; await new Promise((r) => setTimeout(r, 400));
});

// freeze: pause gsap timeline + stop lenis instances
await page.evaluate(() => {
  try { if (window.gsap) gsap.globalTimeline.pause(); } catch (e) {}
  try { if (window.lenis && window.lenis.stop) window.lenis.stop(); } catch (e) {}
  const w = document.querySelector('.main-inner');
  try { if (w && w.lenis && w.lenis.stop) w.lenis.stop(); } catch (e) {}
});

// ScrollTrigger census
const stDump = await page.evaluate(() => {
  const ST = window.ScrollTrigger;
  if (!ST) return { error: 'no ScrollTrigger global' };
  const list = ST.getAll().map((st, i) => ({
    i,
    trigger: typeof st.vars?.trigger === 'string' ? st.vars.trigger.slice(0, 60)
      : (st.trigger ? ((st.trigger.className && String(st.trigger.className).slice(0, 60)) || st.trigger.tagName) : null),
    start: Math.round((st.start || 0) * 10) / 10, end: Math.round((st.end || 0) * 10) / 10,
    prog: Math.round((st.progress || 0) * 1000) / 1000,
    pin: st.pin ? ((st.pin.className && String(st.pin.className).slice(0, 60)) || st.pin.tagName) : null,
    scrub: st.vars?.scrub === undefined ? null : st.vars.scrub,
  }));
  return { count: list.length, list };
});
fs.writeFileSync(`${OUT}/triggers-${W}.json`, JSON.stringify(stDump, null, 1));
console.log('ScrollTriggers:', stDump.count);

const pinList = (stDump.list || []).filter((s) => s.pin);
const mapPin = pinList.find((s) => /map/i.test(String(s.pin)) || /map/i.test(String(s.trigger)))
  || pinList.slice().sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] || null;
let band;
if (mapPin) band = { start: mapPin.start, end: mapPin.end, via: 'ScrollTrigger pin', pinClass: mapPin.pin };
else {
  band = await page.evaluate(() => {
    const s = document.querySelector('section.home-map');
    const w = document.querySelector('.main-inner');
    const top = s.getBoundingClientRect().top + (w ? w.scrollTop : 0);
    return { start: top, end: top + s.offsetHeight - innerHeight, via: 'section geometry (no pin found)', pinClass: null };
  });
}
console.log('MAP BAND', JSON.stringify(band), 'range', Math.round(band.end - band.start));

async function setScroll(y) {
  await page.evaluate((yy) => {
    const w = document.querySelector('.main-inner');
    if (w) w.scrollTop = yy; else window.scrollTo(0, yy);
    try { if (window.ScrollTrigger) ScrollTrigger.update(); } catch (e) {}
  }, Math.round(y));
  await page.waitForTimeout(60);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(80);
}

async function capture(prefix, secSel, name, y) {
  await setScroll(y);
  fs.writeFileSync(`${OUT}/${prefix}-${W}-${name}.jpg`, await page.screenshot({ type: 'jpeg', quality: 75 }));
  const inv = await page.evaluate(invFn, secSel);
  inv._targetY = Math.round(y);
  fs.writeFileSync(`${OUT}/inv-${prefix}-${W}-${name}.json`, JSON.stringify(inv));
}

const P = MODE === 'mobile'
  ? [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
  : [0, 0.025, 0.05, 0.075, 0.1, 0.125, 0.16, 0.2, 0.25, 0.3, 0.33, 0.375, 0.42, 0.46, 0.5, 0.56, 0.6, 0.625, 0.68, 0.72, 0.75, 0.8, 0.84, 0.875, 0.92, 0.96, 1];

for (const p of P) {
  const y = band.start + (band.end - band.start) * p;
  const name = 'p' + String(Math.round(p * 1000)).padStart(3, '0');
  await capture('map', 'section.home-map', name, y);
  if (mapPin) {
    const pr = await page.evaluate((i) => window.ScrollTrigger.getAll()[i].progress, mapPin.i);
    if (Math.abs(pr - p) > 0.03) console.log(`WARN ${name}: pin prog ${pr} target ${p}`);
  }
  console.log('state', name, '@y', Math.round(y));
}

const sanity = [fs.readFileSync(`${OUT}/map-${W}-p000.jpg`), fs.readFileSync(`${OUT}/map-${W}-p500.jpg`)];
console.log('p000', sanity[0].length, 'bytes / p500', sanity[1].length, 'bytes →', sanity[0].equals(sanity[1]) ? 'IDENTICAL (scrub blocked?)' : 'DIFFER (scrub ok)');

const tops = await page.evaluate(() => {
  const w = document.querySelector('.main-inner');
  const st = w ? w.scrollTop : 0;
  const get = (sel) => { const s = document.querySelector(sel); if (!s) return null; const r = s.getBoundingClientRect(); return Math.round(r.top + st); };
  return {
    intro: get('section.home-intro'), problem: get('section.home-problem'),
    platform: get('section.home-platform'), mapTop: get('section.home-map'),
    footer: get('footer') != null ? get('footer') : get('section.footer'),
    scrollMax: w ? w.scrollHeight - w.clientHeight : 0,
  };
});
console.log('tops', JSON.stringify(tops));

if (MODE === 'desktop') {
  await capture('intro-band', 'section.home-intro', 'top', tops.intro);
  await capture('problem-band', 'section.home-problem', 'top', tops.problem);
  await capture('platform', 'section.home-platform', 'top', tops.platform);
}
await capture('footer', 'footer', 'bottom', tops.scrollMax);

fs.writeFileSync(`${OUT}/meta-${W}.json`, JSON.stringify({
  capturedAt: new Date().toISOString(), viewport: { w: W, h: H }, mode: MODE, loaderMs,
  globals, band, mapPin: mapPin ? { index: mapPin.i, pin: mapPin.pin } : null, tops,
  progressPoints: P,
}, null, 1));

await browser.close();
console.log('DONE');
