#!/usr/bin/env node
/**
 * R313 reference telemetry — Heron (heronaiapp.com) deep measurements the frozen census can't capture.
 * Sub-agent 3-a. Phases: loader | buttons | lenis | route | surfaces | cookie | cursor | mobile | frame | discover
 * Usage: cd /home/z/madarek && node audits/evidence/r313/reference/telemetry.mjs <phase> [<phase> ...]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SITE = 'https://heronaiapp.com/';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'telemetry');
const BTN_DIR = path.join(HERE, 'buttons');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(BTN_DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const j = (o) => JSON.stringify(o, null, 1);
const save = (name, obj) => { fs.writeFileSync(path.join(OUT, name), typeof obj === 'string' ? obj : j(obj)); console.log(`[tel] saved ${name}`); };

async function launchBrowser() {
  try { return await chromium.launch({ headless: true }); }
  catch (e) {
    const cacheDir = path.join(process.env.HOME, '.cache/ms-playwright');
    const dirs = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter(d => d.startsWith('chromium')).sort() : [];
    for (const d of dirs) for (const p of [`${cacheDir}/${d}/chrome-linux/chrome`, `${cacheDir}/${d}/chrome-linux/headless_shell`])
      if (fs.existsSync(p)) return await chromium.launch({ headless: true, executablePath: p });
    throw e;
  }
}

const waitLoaded = async (page, extra = 2500) => {
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch (_) {}
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForSelector('.loading', { state: 'detached', timeout: 16000 }).catch(() => {});
  await sleep(extra);
};

/* ---------------------------------- PNG pixel sampler (for corner colour verification) */
function pngPixel(buf, x, y) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let off = 8, w = 0, h = 0, ct = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
    if (type === 'IEND') break;
  }
  if (ct !== 6) throw new Error('colorType ' + ct + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const px = (i, j) => { const o = (j * stride) + i * bpp; return [raw[o], raw[o + 1], raw[o + 2], raw[o + 3]]; };
  const line = (y2) => raw.subarray(y2 * (stride + 1) + 1, (y2 + 1) * (stride + 1));
  const prev = Buffer.alloc(stride);
  const filters = ['none', 'sub', 'up', 'avg', 'paeth'];
  // de-filter row by row into out
  const out = Buffer.alloc(stride * h);
  for (let row = 0; row < h; row++) {
    const f = raw[row * (stride + 1)];
    const src = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    const dst = out.subarray(row * stride, (row + 1) * stride);
    const above = row > 0 ? out.subarray((row - 1) * stride, row * stride) : prev;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? dst[i - bpp] : 0, b = above[i], c = i >= bpp ? above[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
      dst[i] = v;
    }
  }
  const o = y * stride + x * bpp;
  return { rgb: `#${[out[o], out[o + 1], out[o + 2]].map(v => v.toString(16).padStart(2, '0')).join('')}`, rgba: [out[o], out[o + 1], out[o + 2], out[o + 3]] };
}

async function sampleCorners(page, tag) {
  const vp = page.viewportSize();
  const shots = [
    { n: 'tl', x: 2, y: 2, clip: { x: 0, y: 0, width: 14, height: 14 } },
    { n: 'br', x: 9, y: 9, clip: { x: vp.width - 14, y: vp.height - 14, width: 14, height: 14 } },
    { n: 'mid', x: 9, y: 9, clip: { x: Math.round(vp.width / 2) - 7, y: Math.round(vp.height / 2) - 7, width: 14, height: 14 } },
  ];
  const res = {};
  for (const s of shots) {
    const buf = await page.screenshot({ type: 'png', clip: s.clip });
    res[s.n] = pngPixel(buf, s.x, s.y).rgb;
  }
  save(`corners-${tag}.json`, res);
  return res;
}

/* ============================================================= 2a LOADER */
const LOADER_SAMPLER = () => {
  window.__ld = { samples: [], texts: [], snapshot: null, barEls: [] };
  const t0 = performance.now();
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const iv = setInterval(() => {
    const t = Math.round(performance.now() - t0);
    const load = document.querySelector('.loading');
    let pct = null;
    if (load) { const m = (load.innerText || '').match(/(\d+)\s*%/); if (m) pct = Number(m[1]); }
    if (load && window.__ld.barEls.length === 0) {
      // one-time: register width-tracking candidates (all .loading descendants, capped)
      let n = 0;
      for (const el of load.querySelectorAll('*')) { if (n++ > 220) break; window.__ld.barEls.push(el); }
    }
    const bars = [];
    for (const el of window.__ld.barEls) {
      if (!el.isConnected) continue;
      const cs = getComputedStyle(el);
      const w = parseFloat(cs.width); const hh = parseFloat(cs.height);
      if (!Number.isFinite(w)) continue;
      // only track elements whose width ever changes OR are wide/colored (candidates)
      bars.push({ cls: String(el.className).slice(0, 50), w: Math.round(w), h: Math.round(hh) });
    }
    let logCount = null, logTexts = null;
    if (load) {
      for (const el of load.querySelectorAll('*')) {
        const kids = el.children;
        if (kids.length >= 3) {
          let n = 0, ok = true, texts = [];
          for (const k of kids) { const tx = (k.textContent || '').trim(); if (/^\d{3}\b/.test(tx)) { n++; texts.push(tx.slice(0, 80)); } else if (tx) { ok = false; break; } }
          if (n >= 3 && ok && n === kids.length) { logCount = n; logTexts = texts; break; }
        }
      }
    }
    const main = document.querySelector('.loading-main');
    const cs = load ? getComputedStyle(load) : null;
    window.__ld.samples.push({
      t,
      present: !!load,
      display: cs ? cs.display : null,
      opacity: cs ? cs.opacity : null,
      pct,
      clip: main ? getComputedStyle(main).clipPath : null,
      innerOp: (() => { const inn = document.querySelector('.loading-inner'); return inn ? getComputedStyle(inn).opacity : null; })(),
      dash: getComputedStyle(document.documentElement).getPropertyValue('--loading-logo-dasharray').trim(),
      logCount,
      bars: bars.filter(b => b.w > 0 && b.w < 1600).slice(0, 40),
      ready: document.readyState,
    });
    if (t % 1200 < 130 && load) window.__ld.texts.push({ t, text: (load.innerText || '').slice(0, 1200) });
    if (logTexts && !window.__ld.logTexts) window.__ld.logTexts = logTexts;
    if (t > 12500) clearInterval(iv);
  }, 120);
};

async function phaseLoader() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const reqLog = [];
  const mark = Date.now();
  page.on('request', r => reqLog.push({ ev: 'req', t: Date.now() - mark, url: r.url().slice(0, 140), ty: r.resourceType() }));
  page.on('requestfinished', r => reqLog.push({ ev: 'fin', t: Date.now() - mark, url: r.url().slice(0, 140) }));
  page.on('requestfailed', r => reqLog.push({ ev: 'fail', t: Date.now() - mark, url: r.url().slice(0, 140) }));
  await page.goto(SITE, { waitUntil: 'commit', timeout: 60000 });
  const navT = await page.evaluate(() => performance.now()).catch(() => null);
  const sampler = page.evaluate(LOADER_SAMPLER).catch(e => console.log('[tel] sampler err', String(e)));
  // document shots during load
  await sleep(2300); await page.screenshot({ path: path.join(OUT, 'loader-t2400.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(2200); await page.screenshot({ path: path.join(OUT, 'loader-t4600.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(900); await page.screenshot({ path: path.join(OUT, 'loader-t5500.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(1800); await page.screenshot({ path: path.join(OUT, 'loader-t7300.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(2500); await page.screenshot({ path: path.join(OUT, 'loader-t9800.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(2800);
  await sampler;
  const ld = await page.evaluate(() => window.__ld).catch(() => null);
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({
    n: r.name.slice(0, 120), start: Math.round(r.startTime), dur: Math.round(r.duration), tx: r.transferSize || 0, dec: r.decodedBodySize || 0, init: r.initiatorType,
  }))).catch(() => []);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null; }).catch(() => null);
  // log-line element census (structure of loader bottom-right meta)
  const loaderDom = await page.evaluate(() => {
    const l = document.querySelector('.loading');
    return l ? { cls: String(l.className), html: l.outerHTML.replace(/\s+/g, ' ').slice(0, 4000) } : null;
  }).catch(() => null);

  // ---- reload in SAME context → gating?
  const gate = await (async () => {
    const samples = await page.evaluate(async () => {
      const out = []; const t0 = performance.now();
      return await new Promise(res => {
        const iv = setInterval(() => {
          const load = document.querySelector('.loading');
          const cs = load ? getComputedStyle(load) : null;
          let pct = null; if (load) { const m = (load.innerText || '').match(/(\d+)\s*%/); if (m) pct = Number(m[1]); }
          out.push({ t: Math.round(performance.now() - t0), present: !!load, display: cs ? cs.display : null, pct });
          if (performance.now() - t0 > 5000) { clearInterval(iv); res(out); }
        }, 120);
      });
    }).catch(e => ({ err: String(e) }));
    return samples;
  })();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  const gateSamples = await page.evaluate(async () => {
    const out = []; const t0 = performance.now();
    return await new Promise(res => {
      const iv = setInterval(() => {
        const load = document.querySelector('.loading');
        const cs = load ? getComputedStyle(load) : null;
        let pct = null; if (load) { const m = (load.innerText || '').match(/(\d+)\s*%/); if (m) pct = Number(m[1]); }
        out.push({ t: Math.round(performance.now() - t0), present: !!load, display: cs ? cs.display : null, pct });
        if (performance.now() - t0 > 5000) { clearInterval(iv); res(out); }
      }, 120);
    });
  }).catch(e => [{ err: String(e) }]);

  save('loader.json', { nav, navT, ld, resources, reqLog: reqLog.slice(0, 400), loaderDom, reloadGate: gateSamples, meta: { capturedAt: new Date().toISOString(), viewport: '1440x900', note: 'fresh context, incognito → no disk cache' } });
  await ctx.close(); await browser.close();
}

/* ============================================================= 2b BUTTONS */
const BTN_STYLE_PROPS = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'background-color', 'background-image', 'border-top-width', 'border-top-style', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'border-radius', 'box-shadow', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'height', 'width', 'transition', 'transform', 'opacity', 'cursor', 'display', 'gap'];

async function snapshotEl(page, handle) {
  return handle.evaluate((el, props) => {
    const cs = getComputedStyle(el);
    const styles = {}; props.forEach(p => styles[p] = cs.getPropertyValue(p));
    const r = el.getBoundingClientRect();
    // inner-structure snapshot (children transforms/opacity/colour — catches label rolls + icon stacks + fill sweeps)
    const inner = [];
    let n = 0;
    for (const d of el.querySelectorAll('*')) {
      if (n++ > 24) break;
      const dcs = getComputedStyle(d);
      const dr = d.getBoundingClientRect();
      inner.push({
        tag: d.tagName.toLowerCase(), cls: String(d.className).slice(0, 60), txt: (d.textContent || '').trim().slice(0, 40),
        transform: dcs.transform, opacity: dcs.opacity, w: Math.round(dr.width), h: Math.round(dr.height),
        color: dcs.color, bg: dcs.backgroundColor, y: Math.round(dr.y - r.y),
      });
    }
    return { styles, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, inner, html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 1400) };
  }, BTN_STYLE_PROPS);
}

function diffSnap(a, b) {
  const changes = {};
  if (!a || !b) return changes;
  for (const k of Object.keys(a.styles || {})) if (a.styles[k] !== b.styles[k]) (changes.styles ||= {})[k] = [a.styles[k], b.styles[k]];
  for (const k of ['x', 'y', 'w', 'h']) if (a.rect?.[k] !== b.rect?.[k]) (changes.rect ||= {})[k] = [a.rect?.[k], b.rect?.[k]];
  const mapA = new Map((a.inner || []).map(i => [i.cls + '|' + i.txt, i]));
  const inner = [];
  for (const ib of b.inner || []) {
    const ia = mapA.get(ib.cls + '|' + ib.txt);
    const d = {};
    if (ia) { for (const k of ['transform', 'opacity', 'w', 'h', 'color', 'bg', 'y']) if (String(ia[k]) !== String(ib[k])) d[k] = [ia[k], ib[k]]; }
    else d.appeared = true;
    if (Object.keys(d).length) inner.push({ cls: ib.cls, txt: ib.txt, d });
  }
  if (inner.length) changes.inner = inner;
  return changes;
}

async function censusButton(page, name, sel, { hoverOnly = false } = {}) {
  const handle = await page.$(sel);
  if (!handle) { console.log(`[tel] !! ${name}: selector not found ${sel}`); return { name, missing: true, sel }; }
  const visible = await handle.evaluate(el => el.getBoundingClientRect().height > 2 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');
  if (!visible) { console.log(`[tel] !! ${name}: not visible ${sel}`); return { name, notVisible: true, sel }; }
  const clip = await handle.evaluate(el => { const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: Math.min(r.width + 24, 1400), height: r.height + 24 }; });
  const rec = { name, sel };
  // default
  rec.default = await snapshotEl(page, handle);
  await page.screenshot({ path: path.join(BTN_DIR, `${name}-default.jpg`), type: 'jpeg', quality: 80, clip }).catch(() => {});
  // hover
  await handle.hover().catch(() => {});
  await sleep(500);
  rec.hover = await snapshotEl(page, handle);
  await page.screenshot({ path: path.join(BTN_DIR, `${name}-hover.jpg`), type: 'jpeg', quality: 80, clip }).catch(() => {});
  rec.hoverChanges = diffSnap(rec.default, rec.hover);
  if (!hoverOnly) {
    // active (mousedown) — move away BEFORE mouseup so no click/navigation fires on links
    await page.mouse.down().catch(() => {});
    await sleep(280);
    rec.active = await snapshotEl(page, handle);
    await page.screenshot({ path: path.join(BTN_DIR, `${name}-active.jpg`), type: 'jpeg', quality: 80, clip }).catch(() => {});
    rec.activeChanges = diffSnap(rec.hover, rec.active);
    await page.mouse.move(30, 850, { steps: 3 }).catch(() => {});
    await page.mouse.up().catch(() => {});
    await sleep(350);
    await handle.hover().catch(() => {});
    await sleep(250);
  }
  // keyboard focus-visible (Tab once to set keyboard mode, then el.focus())
  await page.keyboard.press('Tab').catch(() => {});
  await handle.evaluate(el => el.focus()).catch(() => {});
  await sleep(220);
  rec.focus = await snapshotEl(page, handle);
  rec.focusVisibleMatched = await handle.evaluate(el => el.matches(':focus-visible')).catch(() => null);
  await page.screenshot({ path: path.join(BTN_DIR, `${name}-focus.jpg`), type: 'jpeg', quality: 80, clip }).catch(() => {});
  rec.focusChanges = diffSnap(rec.default, rec.focus);
  console.log(`[tel] button ${name} done`);
  return rec;
}

async function phaseButtons() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page);

  // discovery: every visible link/button in header, hero, cta, footer
  const discovery = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('a, button, [role="button"], input, form')) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.height < 2 || cs.display === 'none' || cs.visibility === 'hidden') continue;
      out.push({
        tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 90), txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        href: el.getAttribute('href'), x: Math.round(r.x), y: Math.round(r.y + (window.__sc || 0)), w: Math.round(r.width), h: Math.round(r.height),
        type: el.getAttribute('type'), placeholder: el.getAttribute('placeholder'),
      });
    }
    return out;
  });
  save('buttons-discovery.json', discovery);

  // target list — resolved from live DOM (fallback chain)
  const targets = [
    { name: 'header-cta', sels: ['.header-cta-new', '.header-cta:not(.only-mb)', 'header a[href*="contact"]'] },
    { name: 'header-logo', sels: ['.header-logo-item.bg-global', '.header-logo'] },
    { name: 'nav-product-dropdown', sels: ['button.header-menu-item.has-submenu', 'header button.header-menu-item'] },
    { name: 'nav-pricing', sels: ['a.header-menu-item[href*="pricing"]', 'header a[href*="pricing"]'] },
    { name: 'nav-resources', sels: ['button.header-menu-item.has-submenu:nth-of-type(2)', 'header a[href*="resource"]'] },
    { name: 'nav-about', sels: ['a.header-menu-item[href*="about"]', 'header a[href*="about"]'] },
    { name: 'header-menu-btn', sels: ['.header-menu-btn'] },
    { name: 'hero-discover', sels: ['.home-hero-btn', '.home-hero a[class*="btn"]', 'a:has-text("DISCOVER MORE")'] },
    { name: 'cta-contact', sels: ['.cta-main-item-btn-inner.btn-fill-hover', '.cta [class*="btn"]', '.cta a'] },
    { name: 'footer-subscribe-btn', sels: ['button.footer-form-input-submit', '.footer form button'] },
    { name: 'footer-link-about', sels: ['.footer-menu-item-link[href*="about"]', '.footer-menu-item-link:not(.w--current)'] },
    { name: 'footer-link-home-current', sels: ['.footer-menu-item-link.w--current', '.footer-menu-item-link[href="/"]'] },
    { name: 'map-number-1', sels: ['.home-map-number', '.home-map-number-wrap'] },
    { name: 'header-dropdown-item', sels: ['.header-menu-dropdown-item'] },
  ];
  const results = [];
  for (const t of targets) {
    let rec = null;
    for (const sel of t.sels) {
      try { const h = await page.$(sel); if (h) { rec = await censusButton(page, t.name, sel); break; } } catch (e) { console.log(`[tel] ${t.name} sel ${sel} err ${String(e).slice(0, 80)}`); }
    }
    if (!rec) rec = { name: t.name, missing: true, sels: t.sels };
    results.push(rec);
  }

  // inputs: footer email — default / focus / filled
  const inputSel = ['.footer input.footer-form-input', '.footer input[type="email"]', '.footer input'];
  for (const sel of inputSel) {
    const h = await page.$(sel);
    if (!h) continue;
    const input = { name: 'footer-subscribe-input', sel };
    input.default = await snapshotEl(page, h);
    await page.screenshot({ path: path.join(BTN_DIR, 'footer-input-default.jpg'), type: 'jpeg', quality: 80, clip: await h.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x - 12, y: r.y - 12, width: r.width + 24, height: r.height + 24 }; }) }).catch(() => {});
    await h.click().catch(() => {});
    await sleep(300);
    input.focus = await snapshotEl(page, h);
    input.focusChanges = diffSnap(input.default, input.focus);
    await page.screenshot({ path: path.join(BTN_DIR, 'footer-input-focus.jpg'), type: 'jpeg', quality: 80, clip: input.default.rect ? { x: input.default.rect.x - 12, y: input.default.rect.y - 12, width: input.default.rect.w + 24, height: input.default.rect.h + 24 } : undefined }).catch(() => {});
    await h.fill('instrument@lab.local').catch(() => {});
    await sleep(250);
    input.filled = await snapshotEl(page, h);
    input.filledChanges = diffSnap(input.focus, input.filled);
    await page.screenshot({ path: path.join(BTN_DIR, 'footer-input-filled.jpg'), type: 'jpeg', quality: 80 }).catch(() => {});
    results.push(input);
    break;
  }
  save('buttons.json', results);
  await ctx.close(); await browser.close();
}

/* ============================================================= 2c LENIS */
async function phaseLenis() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 1200);
  const dom = await page.evaluate(() => {
    const scan = {};
    for (const k of Object.getOwnPropertyNames(window)) {
      try { const v = window[k]; if (v && typeof v === 'object' && v.constructor && /lenis|barba|gsap/i.test(v.constructor.name)) scan[k] = v.constructor.name; } catch (_) {}
    }
    const wrap = document.querySelector('.main-inner');
    return {
      globals: scan,
      hasLenisCtor: typeof window.Lenis === 'function', lenisVersion: window.Lenis && window.Lenis.version || null,
      gsap: typeof window.gsap !== 'undefined' ? { version: window.gsap.version, ticker: !!window.gsap.ticker } : null,
      barba: typeof window.Barba !== 'undefined', dataBarba: !!document.querySelector('[data-barba]'),
      wrapCls: wrap ? String(wrap.className) : null,
      wrapOverflow: wrap ? getComputedStyle(wrap).overflow : null,
      htmlDataLenis: document.documentElement.getAttribute('data-lenis'),
      wrapperDetect: document.querySelectorAll('.lenis, .lenis-smooth, [data-lenis-wrapper]').length,
      scrollerProbe: (() => { const doc = document.documentElement; return { docScrollH: doc.scrollHeight, innerH: window.innerHeight, wrapScrollH: wrap ? wrap.scrollHeight : null, wrapClientH: wrap ? wrap.clientHeight : null, windowScrollY: window.scrollY }; })(),
    };
  });
  // try to reach a live instance: common patterns
  const inst = await page.evaluate(() => {
    const out = [];
    const grab = (label, v) => { try { if (v && (v.constructor?.name === 'Lenis' || typeof v?.scrollTo === 'function' && typeof v?.raf === 'function')) out.push({ label, keys: Object.keys(v).slice(0, 40), options: v.options || null }); } catch (_) {} };
    for (const k of Object.getOwnPropertyNames(window)) { try { grab('win.' + k, window[k]); } catch (_) {} }
    return out;
  });
  // script bundles: fetch + grep
  const srcs = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean));
  const findings = [];
  for (const src of srcs) {
    let text = null;
    try { const r = await fetch(src); text = await r.text(); } catch (e) { try { const r = await ctx.request.get(src); text = await r.text(); } catch (_) {} }
    if (!text) { findings.push({ src, fetch: 'failed' }); continue; }
    const hits = [];
    const needles = ['new Lenis', 'lerp', 'duration', 'wheelMultiplier', 'smoothWheel', 'syncTouch', 'syncTouchLerp', 'touchMultiplier', 'gestureOrientation', 'easing', 'orientation', 'wheelAxes', 'infinite', 'autoRaf', 'anchors', 'LenisLenis', '0.1', 'power1'];
    for (const n of ['new Lenis', 'wheelMultiplier', 'smoothWheel', 'syncTouch', 'gestureOrientation', 'autoRaf']) {
      let idx = text.indexOf(n);
      while (idx >= 0 && hits.length < 24) {
        hits.push({ needle: n, at: idx, ctx: text.slice(Math.max(0, idx - 220), idx + 300).replace(/\s+/g, ' ') });
        idx = text.indexOf(n, idx + 1);
      }
    }
    // lenis version string
    const ver = text.match(/version\s*[:=]\s*["']([\d.]+)["']/) || text.match(/lenis[^\d]{0,20}(\d+\.\d+\.\d+)/i);
    findings.push({ src: src.slice(0, 140), bytes: text.length, version: ver ? ver[1] : null, hits: hits.length ? hits : null });
  }
  save('lenis.json', { dom, instanceProbe: inst, scriptCount: srcs.length, bundleFindings: findings, note: 'needle contexts trimmed ±220/300 chars' });
  await ctx.close(); await browser.close();
}

/* ============================================================= 2d ROUTE TRANSITION */
const TRANS_SAMPLER = () => {
  window.__trans = [];
  const t0 = performance.now();
  const tick = () => {
    const t = Math.round(performance.now() - t0);
    const cs = getComputedStyle(document.documentElement);
    const load = document.querySelector('.loading');
    window.__trans.push({
      t,
      trans: cs.getPropertyValue('--trans-percent').trim(),
      mask: cs.getPropertyValue('--mask-percent').trim(),
      line: cs.getPropertyValue('--size-line').trim(),
      loaderDisplay: load ? getComputedStyle(load).display : 'absent',
      path: location.pathname,
      barbaWrap: !!document.querySelector('[data-barba-namespace]'),
    });
    if (t < 9000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

async function phaseRoute() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 1500);
  // choose an internal nav target
  const target = await page.evaluate(() => {
    const links = [...document.querySelectorAll('header a')].map(a => ({ href: a.getAttribute('href') || '', txt: (a.textContent || '').trim() }));
    const pick = links.find(l => /pricing/i.test(l.href + l.txt)) || links.find(l => /about/i.test(l.href + l.txt)) || links.find(l => /^\/[^/]/.test(l.href));
    return { pick, links };
  });
  save('route-links.json', target.links);
  if (!target.pick) { console.log('[tel] no internal nav link found'); await browser.close(); return; }
  // CSS rules that consume --trans-percent / --mask-percent (geometry)
  const cssRules = await page.evaluate(() => {
    const hits = [];
    const walk = (rules) => { for (const r of rules) { if (r.type === 4) { walk(r.cssRules); continue; } if (r.type === 1 && r.style) { const txt = r.style.cssText; if (txt.includes('--trans-percent') || txt.includes('--mask-percent') || txt.includes('--size-line')) hits.push({ sel: r.selectorText, css: txt.slice(0, 400) }); } else if (r.cssRules) { try { walk(r.cssRules); } catch (_) {} } } };
    for (const s of document.styleSheets) { try { walk(s.cssRules); } catch (_) {} }
    return hits;
  });
  const href = new URL(target.pick.href, SITE).href;
  // install sampler, click, screenshot mid-transition
  await page.evaluate(TRANS_SAMPLER).catch(() => {});
  await page.click(`header a[href="${target.pick.href}"]`).catch(async () => { await page.evaluate(h => location.href = h, href); });
  const clickT = Date.now();
  await sleep(200); await page.screenshot({ path: path.join(OUT, 'route-200ms.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(400); await page.screenshot({ path: path.join(OUT, 'route-600ms.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(400); await page.screenshot({ path: path.join(OUT, 'route-1000ms.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(700); await page.screenshot({ path: path.join(OUT, 'route-1700ms.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  await sleep(4000);
  const trans1 = await page.evaluate(() => window.__trans).catch(() => []);
  const afterState = await page.evaluate(() => ({
    path: location.pathname, title: document.title,
    loaderDisplay: (() => { const l = document.querySelector('.loading'); return l ? getComputedStyle(l).display : 'absent'; })(),
    dash: getComputedStyle(document.documentElement).getPropertyValue('--loading-logo-dasharray').trim(),
    trans: getComputedStyle(document.documentElement).getPropertyValue('--trans-percent').trim(),
    mask: getComputedStyle(document.documentElement).getPropertyValue('--mask-percent').trim(),
    line: getComputedStyle(document.documentElement).getPropertyValue('--size-line').trim(),
  }));
  // back → popstate behaviour
  await page.evaluate(TRANS_SAMPLER).catch(() => {});
  await page.goBack();
  await sleep(4500);
  const trans2 = await page.evaluate(() => window.__trans).catch(() => []);
  const backState = await page.evaluate(() => ({ path: location.pathname, title: document.title }));
  save('route.json', { clicked: target.pick, href, cssRules, forward: trans1, afterState, back: trans2, backState, meta: { capturedAt: new Date().toISOString() } });
  await ctx.close(); await browser.close();
}

/* ============================================================= 2e SURFACES (radius + shadow) */
async function phaseSurfaces() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 1200);
  const surfaces = await page.evaluate(() => {
    const radius = [], shadow = [];
    let sampled = 0;
    const isZero = (v) => v.split(' ').every(x => x === '0px' || x === '0%');
    for (const el of document.querySelectorAll('body *')) {
      sampled++;
      const cs = getComputedStyle(el);
      const r = cs.borderRadius, sh = cs.boxShadow;
      const rNonZero = r && !isZero(r);
      const shNonNone = sh && sh !== 'none';
      if (!rNonZero && !shNonNone) continue;
      const rect = el.getBoundingClientRect();
      const rec = {
        tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 110), id: el.id || null,
        radius: r, shadow: sh,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
        bg: cs.backgroundColor, z: cs.zIndex, pos: cs.position,
      };
      if (rNonZero) radius.push(rec);
      if (shNonNone) shadow.push(rec);
    }
    return { sampled, radiusCount: radius.length, shadowCount: shadow.length, radius, shadow };
  });
  // crops of the interesting ones
  const interesting = [...surfaces.radius, ...surfaces.shadow].filter(s => s.rect.w > 6 && s.rect.h > 6).slice(0, 8);
  for (let i = 0; i < interesting.length; i++) {
    const s = interesting[i];
    await page.screenshot({ path: path.join(OUT, `surface-${i}-${s.cls.replace(/[^a-z0-9-]/gi, '_').slice(0, 40)}.jpg`), type: 'jpeg', quality: 80, clip: { x: Math.max(0, s.rect.x - 16), y: Math.max(0, s.rect.y - 16), width: s.rect.w + 32, height: s.rect.h + 32 } }).catch(() => {});
  }
  save('surfaces.json', surfaces);
  await ctx.close(); await browser.close();
}

/* ============================================================= 2f COOKIE */
async function phaseCookie() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 2000);
  const banner = await page.evaluate(() => {
    const el = document.querySelector('.cookie-banner, [class*="cookie"], [id*="cookie"], [class*="consent"]');
    if (!el) return { present: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const btns = [...el.querySelectorAll('button, a, [role="button"]')].map(b => {
      const bcs = getComputedStyle(b);
      return { tag: b.tagName.toLowerCase(), txt: (b.textContent || '').trim(), cls: String(b.className).slice(0, 60), font: bcs.fontFamily, size: bcs.fontSize, weight: bcs.fontWeight, color: bcs.color, bg: bcs.backgroundColor, border: bcs.borderTopWidth + ' ' + bcs.borderTopStyle + ' ' + bcs.borderTopColor, padding: bcs.padding, radius: bcs.borderRadius };
    });
    const aww = document.querySelector('.awwwards, [class*="awwwards"]');
    return {
      present: true, cls: String(el.className), html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 2600),
      styles: { position: cs.position, bottom: cs.bottom, top: cs.top, left: cs.left, right: cs.right, w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, color: cs.color, font: cs.fontFamily, size: cs.fontSize, z: cs.zIndex, transform: cs.transform, transition: cs.transition },
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 400), btns,
      awwwards: aww ? { cls: String(aww.className), html: aww.outerHTML.replace(/\s+/g, ' ').slice(0, 500), rect: (() => { const ar = aww.getBoundingClientRect(); return { x: Math.round(ar.x), y: Math.round(ar.y), w: Math.round(ar.width), h: Math.round(ar.height) }; })(), href: aww.getAttribute('href') } : null,
    };
  });
  if (banner.present) {
    await page.screenshot({ path: path.join(OUT, 'cookie-banner.jpg'), type: 'jpeg', quality: 80, clip: { x: 0, y: 560, width: 1440, height: 340 } }).catch(() => {});
    // hover the accept button
    const btn = await page.$('.cookie-banner button, .cookie-banner a, [class*="cookie"] button, [class*="cookie"] a');
    if (btn) {
      await btn.hover().catch(() => {}); await sleep(400);
      await page.screenshot({ path: path.join(OUT, 'cookie-accept-hover.jpg'), type: 'jpeg', quality: 80, clip: { x: 0, y: 660, width: 1440, height: 240 } }).catch(() => {});
      const hoverStyles = await btn.evaluate(el => { const cs = getComputedStyle(el); return { color: cs.color, bg: cs.backgroundColor, border: cs.borderTopColor, transform: cs.transform }; });
      banner.acceptHover = hoverStyles;
    }
  }
  // behaviour: fresh context → click accept → observe
  const behaviour = await (async () => {
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage();
    await p2.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitLoaded(p2, 2500);
    const before = await p2.evaluate(() => ({ cookieStr: document.cookie, banner: !!document.querySelector('.cookie-banner, [class*="cookie"]') }));
    const btn = await p2.$('.cookie-banner button, .cookie-banner a, [class*="cookie"] button, [class*="cookie"] a');
    let afterClick = null, onReload = null;
    if (btn) {
      await btn.click().catch(() => {});
      await sleep(1200);
      afterClick = await p2.evaluate(() => ({ cookieStr: document.cookie, banner: !!document.querySelector('.cookie-banner, [class*="cookie"]'), bannerVisible: (() => { const el = document.querySelector('.cookie-banner, [class*="cookie"]'); return el ? getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 4 : false; })() }));
      await p2.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await sleep(4000);
      onReload = await p2.evaluate(() => ({ cookieStr: document.cookie, banner: !!document.querySelector('.cookie-banner, [class*="cookie"]') }));
    }
    await ctx2.close();
    return { before, afterClick, onReload, clickedText: btn ? await btn.textContent().catch(() => null) : null };
  })();
  save('cookie.json', { banner, behaviour });
  await ctx.close(); await browser.close();
}

/* ============================================================= 2g CURSOR */
const CURSOR_INIT = () => {
  window.__ctxLog = [];
  window.__ctxMeta = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const ctx = orig.call(this, type, attrs);
    if (type === '2d' && ctx && !ctx.__instrumented) {
      try {
        const log = window.__ctxLog; const meta = window.__ctxMeta;
        meta.push({ t: Math.round(performance.now()), canvas: this.width + 'x' + this.height, cls: String(this.className) });
        const state = {};
        const proxy = new Proxy(ctx, {
          get(target, prop) {
            const v = target[prop];
            if (typeof v === 'function') {
              return function (...args) {
                if (log.length < 9000 && ['fillRect', 'clearRect', 'stroke', 'moveTo', 'lineTo', 'beginPath', 'arc', 'fill', 'save', 'restore', 'setTransform'].includes(prop)) {
                  log.push({ t: Math.round(performance.now()), op: prop, a: args.map(a => (typeof a === 'number' ? Math.round(a * 100) / 100 : a)), fs: target.fillStyle, ss: target.strokeStyle, lw: target.lineWidth, ga: target.globalAlpha });
                }
                return v.apply(target, args);
              };
            }
            if (['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha'].includes(prop)) return state[prop] !== undefined ? state[prop] : v;
            return v;
          },
          set(target, prop, value) {
            if (['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha'].includes(prop)) state[prop] = value;
            return Reflect.set(target, prop, value);
          },
        });
        ctx.__instrumented = true;
        return proxy;
      } catch (_) { return ctx; }
    }
    return ctx;
  };
};

async function phaseCursor() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(CURSOR_INIT);
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 2000);
  const el = await page.evaluate(() => {
    const cv = [...document.querySelectorAll('canvas')].map(c => ({ cls: String(c.className), w: c.width, h: c.height, cssW: getComputedStyle(c).width, cssH: getComputedStyle(c).height, pos: getComputedStyle(c).position, z: getComputedStyle(c).zIndex, dpr: window.devicePixelRatio }));
    const hover = document.querySelector('#canvas-cursor-hover, [class*="cursor-hover"], .cursor-main');
    const hcs = hover ? getComputedStyle(hover) : null;
    return {
      canvases: cv,
      hoverEl: hover ? { id: hover.id, cls: String(hover.className), w: hcs.width, h: hcs.height, border: hcs.border, bg: hcs.backgroundColor, transform: hcs.transform, opacity: hcs.opacity, z: hcs.zIndex, pos: hcs.position, blend: hcs.mixBlendMode } : null,
      cursorMain: (() => { const m = document.querySelector('.cursor-main'); return m ? { cls: String(m.className), inner: (() => { const i = m.querySelector('.cursor-inner'); const ic = i ? getComputedStyle(i) : null; return i ? { w: ic.width, h: ic.height, bg: ic.backgroundColor, radius: ic.borderRadius, op: ic.opacity } : null; })() } : null; })(),
      pointerFine: matchMedia('(pointer:fine)').matches, hoverHover: matchMedia('(hover:hover)').matches,
    };
  });
  // idle: slow move to a spot
  await page.mouse.move(700, 400, { steps: 20 }); await sleep(900);
  await page.screenshot({ path: path.join(OUT, 'cursor-idle.jpg'), type: 'jpeg', quality: 82, clip: { x: 620, y: 330, width: 260, height: 160 } }).catch(() => {});
  const idleLog = await page.evaluate(() => window.__ctxLog.slice(-140));
  // fast sweep → trail
  const n0 = await page.evaluate(() => window.__ctxLog.length);
  await page.mouse.move(200, 300, { steps: 3 });
  await page.mouse.move(1200, 620, { steps: 5 });
  await sleep(250);
  const sweepLog = await page.evaluate(n => window.__ctxLog.slice(n), n0);
  // hover a nav link
  const link = await page.$('.header-menu-item, header a');
  let hoverState = null;
  if (link) {
    await link.hover(); await sleep(650);
    hoverState = await page.evaluate(() => { const h = document.querySelector('#canvas-cursor-hover'); if (!h) return null; const cs = getComputedStyle(h); const r = h.getBoundingClientRect(); return { w: cs.width, h: cs.height, transform: cs.transform, opacity: cs.opacity, border: cs.border, x: Math.round(r.x), y: Math.round(r.y) }; });
    await page.screenshot({ path: path.join(OUT, 'cursor-hover-link.jpg'), type: 'jpeg', quality: 82, clip: { x: 40, y: 0, width: 460, height: 200 } }).catch(() => {});
  }
  // pressed
  await page.mouse.move(700, 450, { steps: 8 }); await sleep(400);
  await page.mouse.down(); await sleep(320);
  const pressedState = await page.evaluate(() => { const h = document.querySelector('#canvas-cursor-hover'); if (!h) return null; const cs = getComputedStyle(h); return { transform: cs.transform, opacity: cs.opacity, w: cs.width, h: cs.height }; });
  await page.screenshot({ path: path.join(OUT, 'cursor-pressed.jpg'), type: 'jpeg', quality: 82, clip: { x: 600, y: 350, width: 240, height: 160 } }).catch(() => {});
  const pressLog = await page.evaluate(() => window.__ctxLog.slice(-60));
  await page.mouse.up();
  // suppression zone: hero image area
  await page.mouse.move(400, 300, { steps: 6 }); await sleep(600);
  const suppression = await page.evaluate(() => { const m = document.querySelector('.cursor-main'); return { overHero: m ? String(m.className) : null }; });
  save('cursor.json', { el, idleLog, sweepLog: sweepLog.slice(0, 400), hoverState, pressedState, pressLog, suppression, meta: { capturedAt: new Date().toISOString() } });
  await ctx.close(); await browser.close();
}

/* ============================================================= 2h MOBILE */
async function phaseMobile() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 2000);
  const state = await page.evaluate(() => {
    const interact = document.querySelector('.home-hero-img-interact-wrap');
    const guides = document.querySelector('.home-hero-img-guide, [class*="hero-img-guide"]');
    const plus = document.querySelector('.home-hero-img-plus');
    const coordi = document.querySelector('.home-hero-img-coordi');
    const readout = (el) => el ? { display: getComputedStyle(el).display, visible: el.getBoundingClientRect().height > 2 } : null;
    const header = document.querySelector('.header');
    const hcs = header ? getComputedStyle(header) : null;
    const hr = header ? header.getBoundingClientRect() : null;
    // hamburger candidates
    const menuBtns = [...document.querySelectorAll('header button, header [role="button"], .header [class*="menu"], [class*="burger"], [class*="hamburger"]')].map(b => ({ tag: b.tagName.toLowerCase(), cls: String(b.className).slice(0, 80), txt: (b.textContent || '').trim().slice(0, 30), visible: b.getBoundingClientRect().height > 2, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), x: Math.round(b.getBoundingClientRect().x), y: Math.round(b.getBoundingClientRect().y) }));
    const frame = document.querySelector('.main-deco');
    const hero = document.querySelector('.home-hero');
    const heroR = hero ? hero.getBoundingClientRect() : null;
    return {
      interact: readout(interact), guides: readout(guides), plus: readout(plus), coordi: readout(coordi),
      hintTxt: (() => { const t = document.querySelector('.home-hero-interact-txt'); return t ? getComputedStyle(t).display : null; })(),
      header: header ? { cls: String(header.className), h: Math.round(hr.height), w: Math.round(hr.width), x: Math.round(hr.x), y: Math.round(hr.y), pos: hcs.position, display: hcs.display } : null,
      menuBtns, heroRect: heroR ? { x: Math.round(heroR.x), y: Math.round(heroR.y), w: Math.round(heroR.width), h: Math.round(heroR.height) } : null,
      frameInset: heroR ? Math.round(heroR.x) : null,
      rootFont: getComputedStyle(document.documentElement).fontSize,
      media992: matchMedia('(min-width: 992px)').matches, pointerCoarse: matchMedia('(pointer:coarse)').matches, hoverNone: matchMedia('(hover:none)').matches,
      canvasCount: document.querySelectorAll('canvas').length,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'mobile-390-closed.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
  // open menu
  const menuBtnSel = await page.evaluate(() => {
    for (const sel of ['.header-menu-btn', 'header [class*="menu"]', '[class*="burger"]', '[class*="hamburger"]', 'header button']) {
      const el = document.querySelector(sel);
      if (el && el.getBoundingClientRect().height > 2) return sel;
    }
    return null;
  });
  let menuOpen = null;
  if (menuBtnSel) {
    await page.click(menuBtnSel).catch(() => {});
    await sleep(300);
    await page.screenshot({ path: path.join(OUT, 'mobile-390-menu-300ms.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
    await sleep(1100);
    menuOpen = await page.evaluate(() => {
      const overlay = document.querySelector('[class*="menu"][class*="wrap"], .header-menu-list, nav[class*="menu"], [class*="mb-menu"], [class*="mobile"]');
      const el = overlay || document.body;
      const items = [...document.querySelectorAll('a, button')].filter(a => { const r = a.getBoundingClientRect(); return r.height > 4 && r.x < 390; }).map(a => ({ txt: (a.textContent || '').trim().slice(0, 30), cls: String(a.className).slice(0, 50), y: Math.round(a.getBoundingClientRect().y) })).slice(0, 24);
      return { overlayCls: overlay ? String(overlay.className) : null, overlayStyles: overlay ? (() => { const cs = getComputedStyle(overlay); return { display: cs.display, bg: cs.backgroundColor, transform: cs.transform, opacity: cs.opacity, transition: cs.transition, pos: cs.position, h: Math.round(overlay.getBoundingClientRect().height) }; })() : null, items };
    });
    await page.screenshot({ path: path.join(OUT, 'mobile-390-open.jpg'), type: 'jpeg', quality: 74 }).catch(() => {});
    // close again + header-on-scroll behaviour
    await page.click(menuBtnSel).catch(() => {}); await sleep(800);
  }
  // scroll behaviour on mobile (lenis? native?)
  const scroller = await page.evaluate(() => {
    const wrap = document.querySelector('.main-inner');
    const doc = document.documentElement;
    return { wrapCls: wrap ? String(wrap.className) : null, wrapOverflow: wrap ? getComputedStyle(wrap).overflow : null, docScrollH: doc.scrollHeight, wrapScrollH: wrap ? wrap.scrollHeight : null, windowScrollY: window.scrollY, wrapScrollTop: wrap ? wrap.scrollTop : null };
  });
  await page.evaluate(() => { const w = document.querySelector('.main-inner'); if (w) w.scrollTop = 600; window.scrollTo(0, 600); });
  await sleep(1200);
  const headerScrolled = await page.evaluate(() => { const h = document.querySelector('.header'); return h ? { cls: String(h.className), y: Math.round(h.getBoundingClientRect().y) } : null; });
  save('mobile.json', { state, menuBtnSel, menuOpen, scroller, headerScrolled });
  await ctx.close(); await browser.close();
}

/* ============================================================= 2i FRAME + misc digest inputs */
async function phaseFrame() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 1500);
  const frame = await page.evaluate(() => {
    const deco = document.querySelector('.main-deco');
    const hero = document.querySelector('.home-hero');
    const bgBorder = document.querySelector('.bg-border, .home-hero .bg-border');
    const plus = document.querySelector('.home-hero-img-plus-wrap, [class*="bg-border"] [class*="plus"]');
    const rulers = [...document.querySelectorAll('.home-hero-ruler-item')].slice(0, 4);
    const rulerInfo = rulers.map(r => { const cs = getComputedStyle(r); const rr = r.getBoundingClientRect(); return { cls: String(r.className).slice(0, 70), w: Math.round(rr.width), h: Math.round(rr.height), x: Math.round(rr.x), y: Math.round(rr.y), bg: cs.backgroundImage.slice(0, 220), bgSize: cs.backgroundSize, opacity: cs.opacity, bgRepeat: cs.backgroundRepeat, display: cs.display }; });
    // count ruler children/ticks if nested
    const rulerParent = document.querySelector('.home-hero-ruler-item-wrap');
    const hr = hero ? hero.getBoundingClientRect() : null;
    const bgBorderInfo = bgBorder ? (() => { const cs = getComputedStyle(bgBorder); const r = bgBorder.getBoundingClientRect(); return { cls: String(bgBorder.className), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, children: [...bgBorder.children].map(c => { const cr = c.getBoundingClientRect(); const ccs = getComputedStyle(c); return { tag: c.tagName.toLowerCase(), cls: String(c.className).slice(0, 60), w: Math.round(cr.width), h: Math.round(cr.height), x: Math.round(cr.x), y: Math.round(cr.y), bg: ccs.backgroundColor, border: ccs.borderTopWidth + ' ' + ccs.borderTopColor }; }).slice(0, 12) }; })() : null;
    return {
      deco: deco ? { cls: String(deco.className), html: deco.outerHTML.replace(/\s+/g, ' ').slice(0, 1500), pos: getComputedStyle(deco).position, z: getComputedStyle(deco).zIndex, children: [...deco.children].map(c => { const cs = getComputedStyle(c); const r = c.getBoundingClientRect(); return { cls: String(c.className).slice(0, 60), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), bg: cs.backgroundColor, display: cs.display }; }) } : null,
      heroRect: hr ? { x: Math.round(hr.x), y: Math.round(hr.y), w: Math.round(hr.width), h: Math.round(hr.height) } : null,
      heroInset: hr ? Math.round(hr.x) : null,
      bgBorder: bgBorderInfo,
      plus,
      rulerCount: document.querySelectorAll('.home-hero-ruler-item').length,
      rulers: rulerInfo,
      rulerParentChildren: rulerParent ? rulerParent.children.length : null,
      html: { bg: getComputedStyle(document.documentElement).backgroundColor }, body: { bg: getComputedStyle(document.body).backgroundColor },
      common: (() => { const c = document.querySelector('.common'); return c ? { bg: getComputedStyle(c).backgroundColor } : null; })(),
      rootFont: getComputedStyle(document.documentElement).fontSize,
    };
  });
  // crops: top-left corner @1440 (frame + plus marks)
  await page.screenshot({ path: path.join(OUT, 'frame-tl-1440.jpg'), type: 'jpeg', quality: 84, clip: { x: 0, y: 0, width: 220, height: 180 } }).catch(() => {});
  await page.screenshot({ path: path.join(OUT, 'frame-hero-corner-1440.jpg'), type: 'jpeg', quality: 84, clip: { x: 0, y: 40, width: 240, height: 220 } }).catch(() => {});
  // corner pixels (paper verification)
  await sampleCorners(page, '1440-hero');
  save('frame.json', frame);
  await ctx.close(); await browser.close();
}

/* ---------------------------------- marquee live speed (r308 said 10s/40px-s; stylesheet census now says 30s) */
async function phaseMarquee() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 1200);
  const data = await page.evaluate(async () => {
    const el = document.querySelector('.home-hero-work-inner, .marquee-left.anim');
    if (!el) return { present: false };
    const cs = getComputedStyle(el);
    const read = () => { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform); return { x: m.m41, t: performance.now() }; };
    const s0 = read();
    await new Promise(r => setTimeout(r, 3000));
    const s1 = read();
    return {
      present: true, cls: String(el.className), animation: cs.animation, animationDuration: cs.animationDuration,
      dx: Math.round((s1.x - s0.x) * 100) / 100, dt: Math.round(s1.t - s0.t), pxPerSec: Math.round(((s1.x - s0.x) / (s1.t - s0.t)) * 1000 * 10) / 10,
      items: [...el.children].map(c => (c.textContent || '').trim().slice(0, 40)),
      rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
    };
  });
  save('marquee.json', data);
  await ctx.close(); await browser.close();
}

/* ---------------------------------- header hide/show via REAL wheel events (CDP) */
async function phaseHeader() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 1500);
  const cdp = await ctx.newCDPSession(page);
  const read = () => page.evaluate(() => {
    const h = document.querySelector('.header');
    const inner = document.querySelector('.header-inner');
    if (!h) return null;
    const cs = getComputedStyle(h); const ics = inner ? getComputedStyle(inner) : null; const r = h.getBoundingClientRect();
    const menuBtn = document.querySelector('.header-menu-btn');
    return {
      cls: String(h.className), y: Math.round(r.y), h: Math.round(r.height), transform: cs.transform, opacity: cs.opacity, visibility: cs.visibility,
      innerTransform: ics ? ics.transform : null, innerTransition: ics ? ics.transition : null,
      menuBtnVisible: menuBtn ? menuBtn.getBoundingClientRect().height > 2 && getComputedStyle(menuBtn).display !== 'none' : false,
      scrollY: document.querySelector('.main-inner') ? document.querySelector('.main-inner').scrollTop : window.scrollY,
    };
  });
  const out = { atLoad: await read() };
  // wheel down 5 ticks
  for (let i = 0; i < 5; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: 120 }).catch(() => {}); await sleep(120); }
  out.afterWheelDown = [];
  for (let i = 0; i < 5; i++) { await sleep(200); out.afterWheelDown.push(await read()); }
  // wheel up 3 ticks
  for (let i = 0; i < 3; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: -120 }).catch(() => {}); await sleep(120); }
  out.afterWheelUp = [];
  for (let i = 0; i < 5; i++) { await sleep(200); out.afterWheelUp.push(await read()); }
  // hover header region first (some sites show header on hover)
  await page.mouse.move(700, 30, { steps: 4 }).catch(() => {});
  await sleep(400);
  out.hoverHeaderTop = await read();
  await cdp.detach().catch(() => {});
  save('header.json', out);
  await ctx.close(); await browser.close();
}

/* ---------------------------------- quick discovery phase (no state changes) */
async function phaseDiscover() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLoaded(page, 1000);
  const info = await page.evaluate(() => ({
    headerLinks: [...document.querySelectorAll('header a')].map(a => ({ href: a.getAttribute('href'), txt: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), cls: String(a.className).slice(0, 70) })),
    footerLinks: [...document.querySelectorAll('.footer a')].map(a => ({ href: a.getAttribute('href'), txt: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) })),
    scripts: [...document.scripts].map(s => s.src || '(inline)').slice(0, 40),
    stylesheets: [...document.styleSheets].map(s => s.href).filter(Boolean).slice(0, 30),
  }));
  save('discover.json', info);
  await ctx.close(); await browser.close();
}

const PHASES = { loader: phaseLoader, buttons: phaseButtons, lenis: phaseLenis, route: phaseRoute, surfaces: phaseSurfaces, cookie: phaseCookie, cursor: phaseCursor, mobile: phaseMobile, frame: phaseFrame, discover: phaseDiscover, marquee: phaseMarquee, header: phaseHeader };
(async () => {
  const wanted = process.argv.slice(2);
  const run = wanted.length ? wanted : ['discover'];
  for (const p of run) {
    if (!PHASES[p]) { console.error('unknown phase ' + p); continue; }
    console.log(`[tel] === phase ${p} ===`);
    try { await PHASES[p](); } catch (e) { console.error(`[tel] phase ${p} FAILED:`, e); }
  }
  console.log('[tel] all done');
})().catch(e => { console.error('[tel] FATAL', e); process.exit(1); });
