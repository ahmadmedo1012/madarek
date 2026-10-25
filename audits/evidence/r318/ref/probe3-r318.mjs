import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = '/home/z/madarek-wt/c3-h/audits/evidence/r318/ref';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
const page = await ctx.newPage();
await page.goto('https://heronaiapp.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
try { await page.waitForFunction(() => { const l = document.querySelector('.loading'); if (!l) return true; return getComputedStyle(l).display === 'none' || l.classList.contains('loaded'); }, { timeout: 45000 }); } catch {}
await page.waitForTimeout(1500);
await page.addStyleTag({ content: '#heron-cookie-root{display:none !important}' });
await page.evaluate(async () => { const w = document.querySelector('.main-inner'); const max = w.scrollHeight - w.clientHeight; for (let y = 0; y <= max; y += 700) { w.scrollTop = y; await new Promise(r => setTimeout(r, 80)); } w.scrollTop = 0; });
await page.evaluate(() => { try { if (window.gsap) gsap.globalTimeline.pause(); } catch (e) {} });
const setScroll = async (y) => { await page.evaluate((yy) => { document.querySelector('.main-inner').scrollTop = yy; try { ScrollTrigger.update(); } catch (e) {} }, y); await page.waitForTimeout(120); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.waitForTimeout(80); };
await setScroll(5058);

const svgRects = await page.evaluate(() => [...document.querySelectorAll('svg')].map(s => { const r = s.getBoundingClientRect(); return { cls: s.getAttribute('class') || '', x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), vb: s.getAttribute('viewBox') }; }));
fs.writeFileSync('/tmp/svgrects.json', JSON.stringify(svgRects, null, 1));

// svg detail with fixed filter (width 1420..1440)
const svgDetail = await page.evaluate(() => {
  const out = [];
  for (const s of document.querySelectorAll('svg')) {
    const r = s.getBoundingClientRect();
    if (r.width < 1400 || r.width > 1440 || r.height < 700) continue;
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
console.log('svgDetail:', svgDetail.map(s => `${s.cls || '(none)'}:${s.children.length}`));

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
console.log('markers:', markers.length);
await browser.close();
console.log('DONE3');
