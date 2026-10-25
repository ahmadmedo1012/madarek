// R318 C3-H probe2 — targeted computed-style sweeps + platform clean states + post-band map states
import { chromium } from 'playwright';
import fs from 'node:fs';

const W = 1440, H = 900;
const OUT = '/home/z/madarek-wt/c3-h/audits/evidence/r318/ref';
const SITE = 'https://heronaiapp.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, userAgent: UA, locale: 'en-US' });
const page = await ctx.newPage();
await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 90000 });
try {
  await page.waitForFunction(() => {
    const l = document.querySelector('.loading');
    if (!l) return true;
    const cs = getComputedStyle(l);
    return cs.display === 'none' || l.classList.contains('loaded');
  }, { timeout: 45000 });
} catch { console.log('loader timeout — continuing'); }
await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
await page.waitForTimeout(1200);
await page.addStyleTag({ content: '#heron-cookie-root{display:none !important}' });
await page.evaluate(async () => {
  const w = document.querySelector('.main-inner'); if (!w) return;
  const max = w.scrollHeight - w.clientHeight;
  for (let y = 0; y <= max; y += 700) { w.scrollTop = y; await new Promise((r) => setTimeout(r, 80)); }
  w.scrollTop = 0; await new Promise((r) => setTimeout(r, 300));
});
await page.evaluate(() => { try { if (window.gsap) gsap.globalTimeline.pause(); } catch (e) {} });

async function setScroll(y) {
  await page.evaluate((yy) => {
    const w = document.querySelector('.main-inner'); if (w) w.scrollTop = yy;
    try { if (window.ScrollTrigger) ScrollTrigger.update(); } catch (e) {}
  }, Math.round(y));
  await page.waitForTimeout(80);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(80);
}

// ---------- 1. clean platform states (st35 = trigger index 35: 7765..9362) ----------
for (const [name, y] of [['s01', 7765], ['mid', 8563], ['s02', 9362]]) {
  await setScroll(y);
  fs.writeFileSync(`${OUT}/platform-1440-${name}.jpg`, await page.screenshot({ type: 'jpeg', quality: 80 }));
  const inv = await page.evaluate(() => {
    const sec = document.querySelector('section.home-platform');
    const out = { elements: [] };
    for (const el of sec.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.bottom < -50 || r.top > 950) continue;
      const cs = getComputedStyle(el);
      const rec = { t: el.tagName.toLowerCase(), c: (el.getAttribute('class') || '').slice(0, 60), x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), o: Math.round(+cs.opacity * 100) / 100 };
      if (cs.display === 'none') { rec.d = 'none'; out.elements.push(rec); continue; }
      if (+cs.opacity === 0) rec.hid = 1;
      const bg = cs.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)') rec.bg = bg;
      const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth];
      if (bw.some((b) => parseFloat(b) > 0)) { rec.bw = bw; rec.bc = cs.borderTopColor; }
      let own = ''; for (const n of el.childNodes) { if (n.nodeType === 3 && n.textContent.trim()) own += n.textContent.trim() + ' '; }
      if (own.trim()) { rec.tx = own.trim().slice(0, 90); rec.col = cs.color; rec.fs = cs.fontSize; rec.fw = cs.fontWeight; rec.ff = cs.fontFamily.split(',')[0].slice(0, 24); rec.lh = cs.lineHeight; rec.ls = cs.letterSpacing; if (cs.textTransform !== 'none') rec.tt = cs.textTransform; }
      out.elements.push(rec);
    }
    return out;
  });
  fs.writeFileSync(`${OUT}/inv-platform-1440-${name}.json`, JSON.stringify(inv));
  console.log('platform', name, 'captured');
}

// post-band map states (after sticky release)
for (const [name, y] of [['post1', 7900], ['post2', 8200], ['post3', 8500]]) {
  await setScroll(y);
  fs.writeFileSync(`${OUT}/map-1440-${name}.jpg`, await page.screenshot({ type: 'jpeg', quality: 75 }));
  console.log('map', name);
}

// mid-band detailed sweeps at y=5058 (p50)
await setScroll(5058);

// ---------- 2. all images with src paths + natural sizes ----------
const imgs = await page.evaluate(() => {
  const out = [];
  for (const im of document.querySelectorAll('img')) {
    const r = im.getBoundingClientRect();
    const sec = im.closest('section, footer');
    out.push({
      cls: (im.getAttribute('class') || '').slice(0, 50),
      src: (im.currentSrc || im.src || '').replace(/^https?:\/\/[^/]+/, ''),
      natural: im.naturalWidth + 'x' + im.naturalHeight,
      box: [+r.x.toFixed(0), +r.y.toFixed(0), +r.width.toFixed(0), +r.height.toFixed(0)].join(','),
      section: sec ? String(sec.className).slice(0, 30) : null,
      loading: im.loading, fit: getComputedStyle(im).objectFit, pos: getComputedStyle(im).objectPosition,
    });
  }
  return out;
});
fs.writeFileSync(`${OUT}/images-1440.json`, JSON.stringify(imgs, null, 1));
console.log('images:', imgs.length);

// ---------- 3. intro card + map skeleton computed styles ----------
const intro = await page.evaluate(() => {
  const pick = (sel) => {
    const els = document.querySelectorAll(sel);
    return [...els].map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        sel: sel.slice(0, 40), cls: String(el.className).slice(0, 70),
        box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)],
        display: cs.display, position: cs.position, overflow: cs.overflow,
        pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
        mar: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft],
        bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, shadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 60),
        border: [cs.borderTopWidth + ' ' + cs.borderTopColor, cs.borderRightWidth + ' ' + cs.borderRightColor, cs.borderBottomWidth + ' ' + cs.borderBottomColor, cs.borderLeftWidth + ' ' + cs.borderLeftColor],
        opacity: cs.opacity, zIndex: cs.zIndex, transform: cs.transform === 'none' ? 'none' : cs.transform.slice(0, 60),
        top: cs.top, left: cs.left, bottom: cs.bottom, right: cs.right,
        font: cs.fontSize + ' ' + cs.fontWeight + ' ' + cs.fontFamily.split(',')[0] + ' lh ' + cs.lineHeight + ' ls ' + cs.letterSpacing + ' ' + cs.textTransform,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 110),
      };
    });
  };
  const sels = ['.home-map-inner', '.home-map-main-stick', '.home-map-main-stick-inner', '.home-map-main-inner',
    '.home-map-main-img', '.home-map-main-img-inner', '.home-map-main-img-main', '.home-map-img-svg',
    '.home-map-intro', '.home-map-intro-head', '.home-map-intro-title', '.home-map-intro-content',
    '.home-map-intro-content-item', '.home-map-intro-sub', '.home-map-intro-scroll',
    '.home-map-content-wrap', '.home-map-content', '.home-map-content-label', '.home-map-content-title',
    '.home-map-content-sub', '.home-map-content-cms', '.home-map-content-item', '.home-map-content-item-title', '.home-map-content-item-ic',
    '.home-map-main-img-sub-hover', '.home-map-main-img-sub-label', '.home-map-main-img-sub-title', '.home-map-main-img-sub-desc', '.home-map-main-img-sub-desc-wrap'];
  const out = {};
  for (const s of sels) out[s] = pick(s);
  return out;
});
fs.writeFileSync(`${OUT}/map-computed-1440.json`, JSON.stringify(intro, null, 1));
console.log('map computed sweep done');

// ---------- 4. svg shape details (the two 1425x853 svgs + others in map) ----------
const svgDetail = await page.evaluate(() => {
  const out = [];
  for (const s of document.querySelectorAll('svg')) {
    const r = s.getBoundingClientRect();
    if (Math.abs(r.width - 1425) > 8 || r.y < -50 || r.y > 950) continue;
    const rec = { cls: (s.getAttribute('class') || ''), box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)], vb: s.getAttribute('viewBox'), children: [] };
    const walk = (n, depth) => {
      for (const ch of n.children) {
        const cr = ch.getBoundingClientRect();
        const cs = getComputedStyle(ch);
        rec.children.push({
          d: depth, t: ch.tagName.toLowerCase(), cls: (ch.getAttribute('class') || '').slice(0, 40), id: (ch.id || '').slice(0, 30),
          box: [+cr.x.toFixed(1), +cr.y.toFixed(1), +cr.width.toFixed(1), +cr.height.toFixed(1)],
          stroke: cs.stroke, sw: cs.strokeWidth, fill: cs.fill, op: cs.opacity,
          dash: cs.strokeDasharray !== 'none' ? cs.strokeDasharray.slice(0, 40) : undefined,
          po: cs.paintOrder !== 'normal' ? cs.paintOrder : undefined,
        });
        if (depth < 2 && ch.children.length && rec.children.length < 200) walk(ch, depth + 1);
      }
    };
    walk(s, 0);
    out.push(rec);
  }
  return out;
});
fs.writeFileSync(`${OUT}/map-svg-detail-1440.json`, JSON.stringify(svgDetail, null, 1));
console.log('svg detail done:', svgDetail.map(s => s.children.length));

// ---------- 5. [class*=number] + [class*=index] markers ----------
const markers = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('[class*="number"],[class*="index"],[class*="marker"],[class*="stage"]')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.bottom < 0 || r.top > 900) continue;
    const cs = getComputedStyle(el);
    out.push({ cls: String(el.className).slice(0, 60), box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)], o: cs.opacity, tx: (el.textContent || '').trim().slice(0, 60), col: cs.color, fs: cs.fontSize, ff: cs.fontFamily.split(',')[0] });
  }
  return out;
});
fs.writeFileSync(`${OUT}/markers-1440.json`, JSON.stringify(markers, null, 1));
console.log('markers:', JSON.stringify(markers).slice(0, 400));

// ---------- 6. footer strip detail ----------
await setScroll(13257);
const footerImg = await page.evaluate(() => {
  const wrap = document.querySelector('.footer-img-wrap') || document.querySelector('.ink-mask')?.closest('div[class]');
  const out = { wrap: null, nodes: [] };
  if (!wrap) return out;
  const wr = wrap.getBoundingClientRect(); const wcs = getComputedStyle(wrap);
  out.wrap = { cls: String(wrap.className), box: [+wr.x.toFixed(1), +wr.y.toFixed(1), +wr.width.toFixed(1), +wr.height.toFixed(1)], pos: wcs.position, overflow: wcs.overflow };
  const walk = (n, depth) => {
    for (const ch of n.children) {
      const cr = ch.getBoundingClientRect(); const cs = getComputedStyle(ch);
      out.nodes.push({
        d: depth, t: ch.tagName.toLowerCase(), cls: String(ch.className).slice(0, 50),
        box: [+cr.x.toFixed(1), +cr.y.toFixed(1), +cr.width.toFixed(1), +cr.height.toFixed(1)],
        src: ch.tagName === 'IMG' ? (ch.currentSrc || ch.src || '').replace(/^https?:\/\/[^/]+/, '') : undefined,
        fit: ch.tagName === 'IMG' ? getComputedStyle(ch).objectFit : undefined,
        o: cs.opacity, z: cs.zIndex, pos: cs.position, clip: (cs.clipPath !== 'none' ? cs.clipPath.slice(0, 60) : undefined),
        tx: (ch.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80) || undefined,
      });
      if (depth < 4 && out.nodes.length < 120) walk(ch, depth + 1);
    }
  };
  walk(wrap, 0);
  // also the mobile-only variant
  const mob = document.querySelector('.footer-img-item.hidden-dsk');
  if (mob) { const mr = mob.getBoundingClientRect(); out.mobileVariant = { cls: String(mob.className), box: [+mr.x.toFixed(1), +mr.y.toFixed(1), +mr.width.toFixed(1), +mr.height.toFixed(1)], html: mob.innerHTML.slice(0, 300) }; }
  return out;
});
fs.writeFileSync(`${OUT}/footer-img-1440.json`, JSON.stringify(footerImg, null, 1));
console.log('footer strip nodes:', footerImg.nodes.length, JSON.stringify(footerImg.mobileVariant || {}).slice(0, 200));

// footer wordmark probe: any element with huge font or text-stroke in footer/cta area
const wordmark = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('footer *, section.cta *')) {
    const cs = getComputedStyle(el);
    const fsPx = parseFloat(cs.fontSize) || 0;
    const stroke = cs.webkitTextStrokeWidth || cs.textStrokeWidth;
    if (fsPx > 40 || (stroke && stroke !== '0px')) {
      const r = el.getBoundingClientRect();
      out.push({ cls: String(el.className).slice(0, 60), box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)], fs: cs.fontSize, ff: cs.fontFamily.split(',')[0], fw: cs.fontWeight, col: cs.color, strokeW: stroke || 'none', strokeC: cs.webkitTextStrokeColor || undefined, tx: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) });
    }
  }
  // svg text with paint-order anywhere near footer strip
  for (const t of document.querySelectorAll('footer text, section.cta text, text')) {
    const r = t.getBoundingClientRect();
    if (r.width <= 0 || r.y < 400 || r.y > 900) continue;
    const cs = getComputedStyle(t);
    out.push({ svgText: 1, tx: (t.textContent || '').trim().slice(0, 40), box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)], fs: cs.fontSize, ff: cs.fontFamily.split(',')[0], fill: cs.fill, sk: cs.stroke, sw: cs.strokeWidth, po: cs.paintOrder });
  }
  return out;
});
fs.writeFileSync(`${OUT}/footer-wordmark-1440.json`, JSON.stringify(wordmark, null, 1));
console.log('wordmark probe:', JSON.stringify(wordmark).slice(0, 300));

await browser.close();
console.log('DONE2');
