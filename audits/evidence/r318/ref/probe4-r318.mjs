// R318 C3-H probe4 — redoes platform clean states, post-band map states, svg detail, markers
// with lenis verifiably STOPPED (probe1 method: freeze AFTER preload so window.lenis exists)
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = '/home/z/madarek-wt/c3-h/audits/evidence/r318/ref';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
const page = await ctx.newPage();
await page.goto('https://heronaiapp.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
try { await page.waitForFunction(() => { const l = document.querySelector('.loading'); if (!l) return true; return getComputedStyle(l).display === 'none' || l.classList.contains('loaded'); }, { timeout: 45000 }); } catch {}
await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
await page.waitForTimeout(1500);
await page.addStyleTag({ content: '#heron-cookie-root{display:none !important}' });
await page.evaluate(async () => {
  const w = document.querySelector('.main-inner'); const max = w.scrollHeight - w.clientHeight;
  for (let y = 0; y <= max; y += 700) { w.scrollTop = y; await new Promise(r => setTimeout(r, 90)); }
  w.scrollTop = 0; await new Promise(r => setTimeout(r, 400));
});
// freeze — lenis stop verified
const froze = await page.evaluate(() => {
  try { if (window.gsap) gsap.globalTimeline.pause(); } catch (e) {}
  const stops = [];
  try { if (window.lenis && window.lenis.stop) { window.lenis.stop(); stops.push('window.lenis'); } } catch (e) {}
  const w = document.querySelector('.main-inner');
  try { if (w && w.lenis && w.lenis.stop) { w.lenis.stop(); stops.push('el.lenis'); } } catch (e) {}
  return { stops, cls: String(w.className) };
});
console.log('freeze:', JSON.stringify(froze));

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

// platform clean states + inventory
for (const [name, y] of [['s01', 7765], ['s02', 9362]]) {
  const actual = await setScrollChecked(y);
  fs.writeFileSync(`${OUT}/platform-1440-${name}.jpg`, await page.screenshot({ type: 'jpeg', quality: 80 }));
  const inv = await page.evaluate(() => {
    const sec = document.querySelector('section.home-platform');
    const out = { scrollTop: document.querySelector('.main-inner').scrollTop, elements: [] };
    for (const el of sec.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 && r.height <= 0) continue;
      if (r.bottom < -600 || r.top > 1500) continue;
      const cs = getComputedStyle(el);
      const rec = { t: el.tagName.toLowerCase(), c: (el.getAttribute('class') || '').slice(0, 60), x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), o: Math.round(+cs.opacity * 100) / 100 };
      if (cs.display === 'none') { rec.d = 'none'; out.elements.push(rec); continue; }
      if (+cs.opacity === 0) rec.hid = 1;
      const bg = cs.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)') rec.bg = bg;
      const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth];
      if (bw.some(b => parseFloat(b) > 0)) { rec.bw = bw; rec.bc = cs.borderTopColor; }
      let own = ''; for (const n of el.childNodes) { if (n.nodeType === 3 && n.textContent.trim()) own += n.textContent.trim() + ' '; }
      if (own.trim()) { rec.tx = own.trim().slice(0, 90); rec.col = cs.color; rec.fs = cs.fontSize; rec.fw = cs.fontWeight; rec.ff = cs.fontFamily.split(',')[0].slice(0, 24); rec.lh = cs.lineHeight; rec.ls = cs.letterSpacing; if (cs.textTransform !== 'none') rec.tt = cs.textTransform; }
      out.elements.push(rec);
    }
    return out;
  });
  fs.writeFileSync(`${OUT}/inv-platform-1440-${name}.json`, JSON.stringify(inv));
  console.log('platform', name, 'at', actual);
}

// post-band map states
for (const [name, y] of [['post1', 7900], ['post2', 8200], ['post3', 8500]]) {
  const actual = await setScrollChecked(y);
  fs.writeFileSync(`${OUT}/map-1440-${name}.jpg`, await page.screenshot({ type: 'jpeg', quality: 75 }));
  const quick = await page.evaluate(() => {
    const svg = document.querySelectorAll('svg');
    const big = [...svg].map(s => { const r = s.getBoundingClientRect(); return { c: s.getAttribute('class') || '', x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) }; }).filter(v => v.w > 500);
    const cw = document.querySelector('.home-map-content-wrap');
    const cr = cw.getBoundingClientRect();
    return { scroll: document.querySelector('.main-inner').scrollTop, svgs: big, contentWrap: [+cr.x.toFixed(0), +cr.y.toFixed(0), +cr.width.toFixed(0), +cr.height.toFixed(0)] };
  });
  fs.writeFileSync(`${OUT}/inv-map-1440-${name}.json`, JSON.stringify(quick));
  console.log(name, JSON.stringify(quick));
}

// svg detail mid-state
const actualMid = await setScrollChecked(5058);
const svgDetail = await page.evaluate(() => {
  const out = [];
  for (const s of document.querySelectorAll('svg')) {
    const r = s.getBoundingClientRect();
    if (r.width < 900 || r.width > 1450 || r.height < 700) continue;
    const rec = { cls: (s.getAttribute('class') || ''), box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)], vb: s.getAttribute('viewBox'), children: [] };
    const walk = (n, depth) => {
      for (const ch of n.children) {
        const cr = ch.getBoundingClientRect(); const cs = getComputedStyle(ch);
        rec.children.push({ d: depth, t: ch.tagName.toLowerCase(), cls: (ch.getAttribute('class') || '').slice(0, 44), id: (ch.id || '').slice(0, 30), box: [+cr.x.toFixed(1), +cr.y.toFixed(1), +cr.width.toFixed(1), +cr.height.toFixed(1)], stroke: cs.stroke, sw: cs.strokeWidth, fill: cs.fill, op: cs.opacity, dash: cs.strokeDasharray !== 'none' ? cs.strokeDasharray.slice(0, 36) : undefined, po: cs.paintOrder !== 'normal' ? cs.paintOrder : undefined });
        if (depth < 2 && ch.children.length && rec.children.length < 250) walk(ch, depth + 1);
      }
    };
    walk(s, 0);
    out.push(rec);
  }
  return out;
});
fs.writeFileSync(`${OUT}/map-svg-detail-1440.json`, JSON.stringify(svgDetail, null, 1));
console.log('svgDetail at', actualMid, ':', svgDetail.map(s => `${s.cls || '(none)'}:${s.children.length}`));

// markers v2
const markers = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('[class*="number"],[class*="marker"],[class*="stage"],[class*="index"]')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.bottom < 0 || r.top > 900) continue;
    const cs = getComputedStyle(el);
    out.push({ t: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 60), box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)], o: cs.opacity, tx: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), col: cs.color, fs: cs.fontSize, ff: cs.fontFamily.split(',')[0] });
  }
  return out;
});
fs.writeFileSync(`${OUT}/markers-1440.json`, JSON.stringify(markers, null, 1));
console.log('markers:', markers.length, JSON.stringify(markers).slice(0, 600));

// map img layer structure
const layers = await page.evaluate(() => {
  const out = [];
  const sec = document.querySelector('section.home-map');
  for (const im of sec.querySelectorAll('.home-map-main-img')) {
    const r = im.getBoundingClientRect();
    out.push({ cls: String(im.className), box: [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)], kids: [...im.children].map(c => `${c.tagName.toLowerCase()}.${String(c.className).slice(0, 34)}@${+c.getBoundingClientRect().width.toFixed(0)}x${+c.getBoundingClientRect().height.toFixed(0)} o=${getComputedStyle(c).opacity}`) });
  }
  return out;
});
fs.writeFileSync(`${OUT}/map-img-layers-1440.json`, JSON.stringify(layers, null, 1));
console.log('layers:', JSON.stringify(layers).slice(0, 500));
await browser.close();
console.log('DONE4');
