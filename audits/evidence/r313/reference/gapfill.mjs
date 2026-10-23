#!/usr/bin/env node
/**
 * R313 reference gapfill — Heron (heronaiapp.com)
 * Sub-agent 3-a-resume. Fills exactly two gaps left by the late 3-a telemetry run:
 *   (a) cursor  — body-level canvas presence/size, square-cursor pixel verification, hover reticle crop
 *   (b) mobile  — 390x844 hamburger menu open/closed + header behaviour + hero-instrument visibility <992px
 * Usage: cd /home/z/madarek && node audits/evidence/r313/reference/gapfill.mjs
 * RULES: read-only vs repo source; evidence written only under this reference/ dir.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SITE = 'https://heronaiapp.com/';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'telemetry');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = (name, obj) => { fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 1)); console.log(`[gap] saved ${name}`); };

async function launchBrowser() {
  try { return await chromium.launch({ headless: true }); }
  catch (e) {
    const cacheDir = path.join(process.env.HOME, '.cache/ms-playwright');
    const dirs = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter((d) => d.startsWith('chromium')).sort() : [];
    for (const d of dirs) for (const p of [`${cacheDir}/${d}/chrome-linux/chrome`, `${cacheDir}/${d}/chrome-linux/headless_shell`])
      if (fs.existsSync(p)) return await chromium.launch({ headless: true, executablePath: p });
    throw e;
  }
}

const waitLoaded = async (page, extra = 2000) => {
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch (_) {}
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  // Heron loader: wait for exit clip-path to finish (class .loading.loaded) then settle
  await page.waitForFunction(() => {
    const el = document.querySelector('.loading');
    return !el || el.classList.contains('loaded');
  }, { timeout: 16000 }).catch(() => {});
  await sleep(extra);
};

/* ---------------- (a) CURSOR live check @1440x900 desktop ---------------- */
async function cursorPhase(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded' });
  await waitLoaded(page);

  const dom = await page.evaluate(() => {
    const cs = (el) => el ? getComputedStyle(el) : null;
    const canvas = document.querySelector('canvas');
    const cur = document.querySelector('.cursor');
    const curMain = document.querySelector('.cursor-main');
    const curInner = document.querySelector('.cursor-inner');
    const c = cs(canvas);
    const r = canvas ? canvas.getBoundingClientRect() : null;
    const m = cs(curMain), i = cs(curInner), u = cs(cur);
    return {
      canvas: canvas ? { cls: canvas.className || '(none)', cssW: c.width, cssH: c.height, pos: c.position, top: c.top, left: c.left, zIndex: c.zIndex, pointerEvents: c.pointerEvents, rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null } : null,
      cursorRoot: cur ? { cls: cur.className, pos: u.position, z: u.zIndex, w: u.width, h: u.height } : null,
      cursorMain: curMain ? { cls: curMain.className, display: m.display, w: m.width, h: m.height } : null,
      cursorInner: curInner ? { cls: curInner.className, radius: i.borderRadius, w: i.width, h: i.height, bg: i.backgroundColor, opacity: i.opacity, transition: i.transition } : null,
      dataCursorHidden: [...document.querySelectorAll('[data-cursor="hidden"]')].slice(0, 6).map((e) => e.className.slice(0, 60)),
    };
  });

  // Park the pointer mid-page (neutral state) then over a nav link (interactive state)
  await page.mouse.move(700, 450);
  await sleep(1400); // let lerp settle
  const neutral = await sampleCursorCanvas(page, 700, 450);
  await page.screenshot({ path: path.join(OUT, 'cursor-neutral-1440.jpg'), clip: { x: 700 - 60, y: 450 - 60, width: 120, height: 120 } });

  // Hover the PRICING nav link (a.header-menu-item)
  const link = page.locator('a.header-menu-item[href*="pricing"]').first();
  const box = await link.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await sleep(1400);
  const hoverMeta = await page.evaluate(() => {
    const cm = document.querySelector('.cursor-main');
    return { cursorMainCls: cm ? cm.className : null, hoverLink: 'a.header-menu-item[href*="pricing"]' };
  });
  const hover = await sampleCursorCanvas(page, Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
  await page.screenshot({ path: path.join(OUT, 'cursor-hover.jpg'), clip: { x: box.x + box.width / 2 - 60, y: box.y + box.height / 2 - 60, width: 120, height: 120 } });

  // Also hover the header CTA (fill-button, different reticle behaviour?)
  const cta = page.locator('.header-cta-new').first();
  const cb = await cta.boundingBox();
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 12 });
  await sleep(1400);
  const ctaHover = await sampleCursorCanvas(page, Math.round(cb.x + cb.width / 2), Math.round(cb.y + cb.height / 2));
  await page.screenshot({ path: path.join(OUT, 'cursor-hover-cta.jpg'), clip: { x: cb.x + cb.width / 2 - 60, y: cb.y + cb.height / 2 - 60, width: 120, height: 120 } });

  save('cursor.json', {
    meta: { capturedAt: new Date().toISOString(), viewport: '1440x900', pointer: 'fine (desktop context)' },
    dom,
    neutral: { mouse: [700, 450], canvas: neutral },
    hoverNavPricing: { mouse: [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)], ...hoverMeta, canvas: hover },
    hoverHeaderCta: { mouse: [Math.round(cb.x + cb.width / 2), Math.round(cb.y + cb.height / 2)], canvas: ctaHover },
    crops: ['telemetry/cursor-neutral-1440.jpg', 'telemetry/cursor-hover.jpg', 'telemetry/cursor-hover-cta.jpg'],
    note: 'canvas sample = opaque (alpha>40) pixel bbox + dominant colour in a 60x60 window centred on the pointer (post-settle); bbox approximates the square cursor / reticle footprint',
  });
  await ctx.close();
}

/* read the live cursor canvas around (x,y): bbox of drawn pixels + dominant colour */
async function sampleCursorCanvas(page, x, y) {
  return await page.evaluate(([cx, cy]) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas' };
    try {
      const ctx = canvas.getContext('2d');
      const R = 30;
      const x0 = Math.max(0, cx - R), y0 = Math.max(0, cy - R);
      const w = Math.min(canvas.width, x0 + 2 * R) - x0, h = Math.min(canvas.height, y0 + 2 * R) - y0;
      if (w <= 0 || h <= 0) return { error: 'window out of range' };
      const data = ctx.getImageData(x0, y0, w, h).data;
      let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, n = 0;
      const buckets = {};
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const o = (yy * w + xx) * 4;
        if (data[o + 3] > 40) {
          n++;
          if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
          if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
          const key = `${data[o]},${data[o + 1]},${data[o + 2]}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
      }
      if (!n) return { drawnPixels: 0, note: 'no opaque pixels in window (cursor may be lerping away or suppressed)' };
      const dom = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([k, c]) => ({ rgb: `rgb(${k})`, hex: '#' + k.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join(''), px: c }));
      return {
        drawnPixels: n,
        bbox: { x: x0 + minX, y: y0 + minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        dominantColors: dom,
        window: { x: x0, y: y0, w, h },
      };
    } catch (e) { return { error: 'getImageData failed: ' + e.message }; }
  }, [x, y]);
}

/* ---------------- (b) MOBILE 390x844 ---------------- */
async function mobilePhase(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded' });
  await waitLoaded(page, 1500);

  const probe = async (label) => await page.evaluate((l) => {
    const cs = (el) => el && getComputedStyle(el);
    const header = document.querySelector('.header');
    const h = cs(header); const hr = header.getBoundingClientRect();
    const menuBtn = document.querySelector('.header-menu-btn');
    const mb = cs(menuBtn); const mbr = menuBtn ? menuBtn.getBoundingClientRect() : null;
    const interact = document.querySelector('.home-hero-img-interact-wrap');
    const it = cs(interact);
    const guides = document.querySelector('.home-hero-img-guides, [class*="hero-img-guide"]');
    const plus = document.querySelector('.home-hero-img-plus');
    const readout = document.querySelector('.home-hero-img-coordi');
    const canvas = document.querySelector('canvas');
    const cta = document.querySelector('.header-cta-new');
    const nav = document.querySelector('.header-menu');
    return {
      state: l,
      header: { cls: header.className, h: hr.height, y: hr.y, pos: h.position, w: hr.width },
      menuBtn: menuBtn ? { cls: menuBtn.className, display: mb.display, w: mbr.width, h: mbr.height, txt: (menuBtn.innerText || '').slice(0, 20) } : null,
      heroInteractWrap: interact ? { display: it.display, visibility: it.visibility } : null,
      guides: guides ? { display: getComputedStyle(guides).display } : null,
      plus: plus ? { display: getComputedStyle(plus).display } : null,
      readout: readout ? { display: getComputedStyle(readout).display } : null,
      canvas: canvas ? { w: getComputedStyle(canvas).width, h: getComputedStyle(canvas).height, cursor: getComputedStyle(canvas).cursor } : null,
      headerCta: cta ? { display: getComputedStyle(cta).display, rect: cta.getBoundingClientRect().toJSON() } : null,
      headerMenu: nav ? { cls: nav.className, display: getComputedStyle(nav).display } : null,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      mediaHoverAndMinWidth992: matchMedia('(hover:hover) and (min-width:992px)').matches,
    };
  }, label);

  const closed = await probe('closed');
  await page.screenshot({ path: path.join(OUT, 'mobile-menu-closed-390.jpg') });

  // open the hamburger
  const opened = { clickError: null };
  try {
    await page.locator('.header-menu-btn').first().click({ timeout: 5000 });
    await sleep(1200);
  } catch (e) { opened.clickError = e.message.slice(0, 200); }
  const open = await probe('open');
  const menuDetail = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.header-menu-item, .header-menu-dropdown-item, .header-cta-new, .header-menu a')]
      .filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && r.height > 4; })
      .map((e) => ({ txt: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 30), cls: e.className.slice(0, 60), y: Math.round(e.getBoundingClientRect().y), h: Math.round(e.getBoundingClientRect().height) }));
    const menuWrap = document.querySelector('.header-menu-wrap, .header-menu');
    return { visibleItems: items, menuWrap: menuWrap ? { cls: menuWrap.className, display: getComputedStyle(menuWrap).display } : null };
  });
  await page.screenshot({ path: path.join(OUT, 'mobile-menu-open-390.jpg') });

  // close again (tap the button twice toggles?) — try clicking menu btn again, capture state
  let reopened = null;
  try {
    await page.locator('.header-menu-btn').first().click({ timeout: 4000 });
    await sleep(900);
    reopened = await probe('closed-again');
  } catch (e) { reopened = { error: e.message.slice(0, 120) }; }

  save('mobile.json', {
    meta: { capturedAt: new Date().toISOString(), viewport: '390x844', touch: true, dsf: 2 },
    closed, open, menuDetail, reopened,
    crops: ['telemetry/mobile-menu-closed-390.jpg', 'telemetry/mobile-menu-open-390.jpg'],
  });
  await ctx.close();
}

/* ---------------- (c) header hide/show classes + (d) paper corner sample @1440x900 ---------------- */
async function headerPaperPhase(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded' });
  await waitLoaded(page, 1200);

  const read = () => page.evaluate(() => {
    const h = document.querySelector('header');
    const cs = getComputedStyle(h); const r = h.getBoundingClientRect();
    const wrap = document.querySelector('.main-inner');
    return { cls: String(h.className), y: Math.round(r.y), transform: cs.transform, opacity: cs.opacity, visibility: cs.visibility, scrollTop: wrap ? Math.round(wrap.scrollTop) : Math.round(scrollY) };
  });
  const top = await read();

  const setScroll = async (px) => {
    await page.evaluate((v) => { const w = document.querySelector('.main-inner'); if (w) w.scrollTop = v; else window.scrollTo(0, v); }, px);
    await sleep(900);
  };
  await setScroll(900); const down1 = await read();
  await setScroll(2400); const down2 = await read();
  await setScroll(1500); const up1 = await read();
  await setScroll(0); const topAgain = await read();

  // paper sample: PNG screenshot corners + html/body computed bg + --cl-bg
  await setScroll(0);
  const shot = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(OUT, 'paper-1440.png'), shot);
  const bg = await page.evaluate(() => ({
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    clBg: getComputedStyle(document.documentElement).getPropertyValue('--cl-bg').trim(),
    bgGlobal: (() => { const el = document.querySelector('.bg-global'); return el ? getComputedStyle(el).backgroundColor : null; })(),
    htmlStyleBg: document.documentElement.style.backgroundColor || null,
  }));
  const corners = samplePngCorners(shot);
  save('paper.json', {
    meta: { capturedAt: new Date().toISOString(), viewport: '1440x900' },
    computed: bg,
    screenshotCorners: corners,
    note: 'corners sampled from a fresh PNG screenshot (TL/TR/BL/BR at 3,3 / 1436,3 / 3,896 / 1436,896; centre 720,450)',
  });
  save('header-states.json', {
    meta: { capturedAt: new Date().toISOString(), viewport: '1440x900', method: 'direct wrapper scrollTop sets (Lenis-synced)' },
    top, scrollDown900: down1, scrollDown2400: down2, scrollUp1500: up1, backToTop: topAgain,
  });
  await ctx.close();
}

/* minimal PNG corner sampler (colorType 6) */
function samplePngCorners(buf) {
  let off = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    off += 12 + len; if (type === 'IEND') break;
  }
  if (ct !== 6) return { error: 'colorType ' + ct };
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  const prev = Buffer.alloc(stride);
  for (let row = 0; row < h; row++) {
    const f = raw[row * (stride + 1)];
    const src = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    const dst = out.subarray(row * stride, (row + 1) * stride);
    const above = row > 0 ? out.subarray((row - 1) * stride, row * stride) : prev;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? dst[i - bpp] : 0, b = above[i], c = i >= bpp ? above[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v = (v + a) & 255; else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
      dst[i] = v;
    }
  }
  const at = (x, y) => { const o = y * stride + x * bpp; return '#' + [out[o], out[o + 1], out[o + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); };
  return { size: w + 'x' + h, TL: at(3, 3), TR: at(w - 4, 3), BL: at(3, h - 4), BR: at(w - 4, h - 4), centre: at(Math.floor(w / 2), Math.floor(h / 2)) };
}

const phases = process.argv.slice(2);
const run = phases.length ? phases : ['cursor', 'mobile'];
const browser = await launchBrowser();
try {
  if (run.includes('cursor')) await cursorPhase(browser);
  if (run.includes('mobile')) await mobilePhase(browser);
  if (run.includes('headerpaper')) await headerPaperPhase(browser);
} finally {
  await browser.close();
}
console.log('[gap] done');
