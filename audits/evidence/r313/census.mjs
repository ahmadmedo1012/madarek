#!/usr/bin/env node
/**
 * R313 census harness v2 — identical methodology for reference (Heron) and baseline/after (Madarek).
 *
 * Handles BOTH native window scrolling and wrapper-based smooth-scroll engines (Lenis):
 * an init script installs window.__census which detects the real scroller element.
 *
 * Usage:
 *   node census.mjs <url> <outdir> [options]
 * Options:
 *   --viewports 1440x900,...        (default 7-viewport matrix)
 *   --deep 1440x900                 (viewport that gets styles/motion census + loader frames)
 *   --loader                        (capture 14 loader frames x 450ms at deep viewport)
 *   --login email:pass              (login once via /auth form; context reused for primary+posts; Madarek only)
 *   --post "/p1,/p2"                (extra paths census'd in the same logged-in/plain context)
 *   --probe-scroll                  (wheel impulse probe: scroller scrollTop vs time)
 *   --no-sweep                      (skip the per-viewport full-page sweep)
 *   --settle-ms 6500
 *   --name label
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args[0];
const outdir = args[1];
if (!url || !outdir) { console.error('usage: node census.mjs <url> <outdir> [options]'); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);
const VIEWPORTS = (opt('--viewports', '1440x900,1440x700,1280x800,1024x768,768x1024,390x844,360x800')).split(',').map(s => { const [w, h] = s.split('x').map(Number); return { width: w, height: h }; });
const DEEP = opt('--deep', '1440x900');
const LOADER = flag('--loader');
const PROBE = flag('--probe-scroll');
const NO_SWEEP = flag('--no-sweep');
const SETTLE = Number(opt('--settle-ms', 6500));
const LOGIN = opt('--login', null);
const POST = opt('--post', '') ? opt('--post', '').split(',').map(s => s.trim()).filter(Boolean) : [];
const NAME = opt('--name', url);

fs.mkdirSync(outdir, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function launchBrowser() {
  try { return await chromium.launch({ headless: true }); }
  catch (e) {
    const cacheDir = path.join(process.env.HOME, '.cache/ms-playwright');
    const dirs = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter(d => d.startsWith('chromium-')).sort() : [];
    for (const d of dirs) {
      for (const p of [`${cacheDir}/${d}/chrome-linux/chrome`, `${cacheDir}/${d}/chrome-linux/headless_shell`]) {
        if (fs.existsSync(p)) { console.log(`[census] fallback browser: ${p}`); return await chromium.launch({ headless: true, executablePath: p }); }
      }
    }
    throw e;
  }
}

// Init script: scroller abstraction (native window OR wrapper-based engines like Lenis)
const SWEEP_INIT_SCRIPT = opt('--sweep-init', null); // e.g. 'sessionStorage.setItem("madarek-intro-seen","1")'

const CENSUS_INIT = () => {
  const findScroller = () => {
    const doc = document.documentElement;
    if (doc.scrollHeight > window.innerHeight + 60) return window;
    // priority: lenis wrappers (may be overflow:hidden — Lenis drives scrollTop programmatically)
    for (const e of document.querySelectorAll('[class*="lenis"], [data-lenis-wrapper]')) {
      if (e.scrollHeight > e.clientHeight + 200 && e.clientHeight >= window.innerHeight * 0.5) return e;
    }
    let best = null;
    for (const e of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(e);
      if (!['auto', 'scroll', 'hidden'].includes(cs.overflowY)) continue;
      if (e.scrollHeight <= e.clientHeight + 200) continue;
      if (e.clientHeight < window.innerHeight * 0.5) continue;
      if (!best || (e.scrollHeight - e.clientHeight) > (best.scrollHeight - best.clientHeight)) best = e;
    }
    return best || window;
  };
  window.__census = {
    findScroller,
    scrollY() { const s = findScroller(); return s === window ? window.scrollY : s.scrollTop; },
    totalHeight() { const s = findScroller(); return s === window ? document.documentElement.scrollHeight : s.scrollHeight; },
    maxScroll() { const s = findScroller(); return s === window ? document.documentElement.scrollHeight - window.innerHeight : s.scrollHeight - s.clientHeight; },
    absTop(el) { return Math.round(el.getBoundingClientRect().top + this.scrollY()); },
    scrollRatio(r) { const s = findScroller(); const max = this.maxScroll(); if (s === window) window.scrollTo(0, Math.round(max * r)); else s.scrollTop = Math.round(max * r); },
    scrollerInfo() { const s = findScroller(); return s === window ? { type: 'window' } : { type: 'element', tag: s.tagName, cls: String(s.className).slice(0, 140) }; },
  };
};

const STYLE_PROPS = ['font-family','font-size','font-weight','line-height','letter-spacing','text-transform','color','background-color','background-image','border-top-width','border-top-style','border-top-color','border-radius','box-shadow','padding-top','padding-right','padding-bottom','padding-left','margin-top','gap','width','height','transition','animation','text-align','opacity','z-index','position','backdrop-filter'];

async function styleCensus(page) {
  return page.evaluate((props) => {
    const seen = new Map();
    const grab = (sel) => { try { document.querySelectorAll(sel).forEach((el) => { const key = sel + '|' + el.className; if (seen.has(key)) return; const cs = getComputedStyle(el); const rec = { selector: sel, tag: el.tagName.toLowerCase(), className: String(el.className).slice(0, 160), text: (el.textContent || '').trim().slice(0, 60), styles: {} }; props.forEach(p => rec.styles[p] = cs.getPropertyValue(p)); const r = el.getBoundingClientRect(); rec.rect = { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }; seen.set(key, rec); }); } catch (_) {} };
    ['h1','h2','h3','h4','p','a','button','input','select','textarea','label','table','th','td','header','footer','nav a','header a','header button','footer a','form','img','svg','li','span','div[class*="btn"]','div[class*="button"]','a[class*="btn"]','[class*="tag"]','[class*="label"]','[class*="card"]','[class*="menu"]','[class*="mono"]','[class*="index"]','[role="button"]','[class*="marquee"]','[class*="ticker"]','[class*="cursor"]','[class*="load"]'].forEach(grab);
    const fonts = [...document.fonts].map(f => `${f.family} ${f.weight} ${f.style}`);
    // surface sweep: violations count (before/after evidence)
    let radiusNonZero = 0, shadowNonNone = 0, sampled = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (sampled > 6000) break; sampled++;
      const cs = getComputedStyle(el);
      const r = cs.borderRadius; if (r && !/^(0px|0\.00px|0px 0px 0px 0px)$/.test(r.split(' ').every(x => x === '0px') ? r : 'x')) { if (!r.split(' ').every(x => x === '0px' || x === '0%')) radiusNonZero++; }
      const sh = cs.boxShadow; if (sh && sh !== 'none') shadowNonNone++;
    }
    return { records: [...seen.values()].slice(0, 400), fonts: [...new Set(fonts)], rootFontSize: getComputedStyle(document.documentElement).fontSize, bodyFontSize: getComputedStyle(document.body).fontSize, surfaceSweep: { sampled, radiusNonZero, shadowNonNone } };
  }, STYLE_PROPS);
}

async function motionCensus(page) {
  return page.evaluate(() => {
    const transitions = new Map(); const animations = new Map(); const kf = [];
    const walk = (rules) => { for (const rule of rules) { if (rule.type === 4) { if ((rule.conditionText || '').includes('prefers-reduced-motion')) continue; walk(rule.cssRules); continue; } if (rule.type === 1) { const s = rule.style; if (!s) continue; const t = s.getPropertyValue('transition'); const a = s.getPropertyValue('animation'); if (t && t !== 'none' && !transitions.has(rule.selectorText)) transitions.set(rule.selectorText, t); if (a && a !== 'none' && !animations.has(rule.selectorText)) animations.set(rule.selectorText, a); } else if (rule.cssRules) { try { walk(rule.cssRules); } catch (_) {} } } };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch (_) {} for (const r of (sheet.cssRules || [])) { try { if (r.type === 7) kf.push(r.name); } catch (_) {} } }
    return { transitions: [...transitions.entries()].map(([sel, t]) => ({ sel, t })).slice(0, 500), animations: [...animations.entries()].map(([sel, a]) => ({ sel, a })).slice(0, 500), keyframes: [...new Set(kf)] };
  });
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const c = window.__census;
    const sc = c.findScroller();
    // descend through single-tall-child wrappers to reach the real section list
    let el = (sc === window) ? document.body : sc;
    for (let d = 0; d < 8; d++) {
      const kids = [...el.children].filter(k => !['SCRIPT','STYLE','LINK','NOSCRIPT','CANVAS'].includes(k.tagName));
      const tall = kids.filter(k => k.getBoundingClientRect().height > Math.min(el.clientHeight, window.innerHeight) * 0.4);
      if (tall.length === 1) { el = tall[0]; continue; }
      break;
    }
    const sections = [];
    const seenKeys = new Set();
    const push = (s, kind) => { const r = s.getBoundingClientRect(); if (r.height < 60) return; const key = Math.round(r.height) + '@' + c.absTop(s); if (seenKeys.has(key)) return; seenKeys.add(key); sections.push({ kind, tag: s.tagName.toLowerCase(), id: s.id || null, cls: String(s.className).slice(0, 140), top: c.absTop(s), height: Math.round(r.height) }); };
    const scope = (sc === window) ? document : sc;
    scope.querySelectorAll('section, footer').forEach(s => push(s, 'semantic')); // catches sections inside 0-height web-component wrappers
    for (const s of el.children) { if (!['SCRIPT','STYLE','LINK','NOSCRIPT'].includes(s.tagName)) push(s, 'child'); }
    sections.sort((a, b) => a.top - b.top);
    const header = document.querySelector('header');
    let headerInfo = null;
    if (header) { const cs = getComputedStyle(header); const hr = header.getBoundingClientRect(); headerInfo = { cls: String(header.className), height: Math.round(hr.height), top: Math.round(hr.top), position: cs.position, transform: cs.transform, transition: cs.transition, zIndex: cs.zIndex }; }
    const lenis = { hasLenisGlobal: typeof window.Lenis !== 'undefined', lenisInstances: typeof window.lenis !== 'undefined' ? 'window.lenis' : null, lenisAttr: root.getAttribute('data-lenis') || document.body.getAttribute('data-lenis') || null, lenisEls: document.querySelectorAll('[class*="lenis"], [data-lenis-wrapper]').length, gsap: typeof window.gsap !== 'undefined', barba: typeof window.Barba !== 'undefined' || !!document.querySelector('[data-barba]'), swiper: typeof window.Swiper !== 'undefined' };
    const canvases = [...document.querySelectorAll('canvas')].map(cv => { const cs = getComputedStyle(cv); return { cls: String(cv.className).slice(0, 80), w: cv.width, h: cv.height, cssW: cs.width, cssH: cs.height, pos: cs.position, z: cs.zIndex, top: cs.top, left: cs.left, cursor: cs.cursor }; });
    return {
      url: location.href, title: document.title,
      totalHeight: c.totalHeight(), maxScroll: c.maxScroll(), scroller: c.scrollerInfo(),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      rootFontSize: getComputedStyle(root).fontSize,
      htmlLang: root.lang, dir: root.dir || getComputedStyle(root).direction,
      themeColor: document.querySelector('meta[name="theme-color"]')?.content || null,
      sections, headerInfo, lenis, canvases,
      bodyBg: getComputedStyle(document.body).backgroundColor, htmlBg: getComputedStyle(root).backgroundColor,
      scrollBehavior: getComputedStyle(root).scrollBehavior, imgCount: document.images.length,
      cookieBanner: (() => { const el = document.querySelector('[class*="cookie"], [id*="cookie"], [class*="consent"]'); return el ? { cls: String(el.className).slice(0, 100), visible: el.getBoundingClientRect().height > 10 } : null; })(),
    };
  });
}

async function captureLoaderFrames(page, dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 20; i++) { await page.screenshot({ path: path.join(dir, `l${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 }); await sleep(450); }
}

async function captureScrollFrames(page, dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i <= 20; i++) {
    await page.evaluate((r) => window.__census.scrollRatio(r), i / 20);
    await sleep(900); // allow scrub/smoothing tweens to settle
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
  }
  await page.evaluate(() => window.__census.scrollRatio(0));
}

async function probeScroll(page, file) {
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate(() => window.__census.scrollRatio(0));
  await sleep(600);
  const sampler = page.evaluate(async () => {
    window.__probe = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 3000) { window.__probe.push([Math.round(performance.now() - t0), Math.round(window.__census.scrollY())]); await new Promise(r => requestAnimationFrame(r)); }
  }).catch(() => {});
  await sleep(80);
  for (let k = 0; k < 3; k++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 400, y: 400, deltaX: 0, deltaY: 240 }).catch(() => {}); await sleep(60); }
  await sampler;
  const pts = await page.evaluate(() => window.__probe || []).catch(() => []);
  fs.writeFileSync(file, JSON.stringify({ wheelCurve: pts }, null, 1));
  await cdp.detach().catch(() => {});
}

async function headerStates(page) {
  const read = () => page.evaluate(() => { const h = document.querySelector('header'); if (!h) return null; const cs = getComputedStyle(h); const r = h.getBoundingClientRect(); return { cls: String(h.className), y: Math.round(r.y), transform: cs.transform, opacity: cs.opacity, visibility: cs.visibility }; });
  const top = await read();
  await page.evaluate(() => window.__census.scrollRatio(0.08)); await sleep(900);
  const scrolled = await read();
  await page.evaluate(() => window.__census.scrollRatio(0.16)); await sleep(900);
  const scrolledMore = await read();
  await page.evaluate(() => window.__census.scrollRatio(0.1)); await sleep(900);
  const scrolledBack = await read();
  await page.evaluate(() => window.__census.scrollRatio(0)); await sleep(900);
  return { top, scrolled, scrolledMore, scrolledBack };
}

async function settle(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch (_) {}
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
  // best-effort: wait out site loaders (Heron .loading / Madarek .sl)
  await page.waitForSelector('.loading, .sl', { state: 'detached', timeout: 14000 }).catch(() => {});
  await sleep(SETTLE);
}

async function captureFull(page, baseDir, metrics) {
  // fullPage screenshots fail on wrapper-scroller pages (content clipped in overflow:hidden) — tile manually
  if (!metrics.scroller || metrics.scroller.type === 'window') {
    await page.screenshot({ path: path.join(baseDir, 'full.jpg'), type: 'jpeg', quality: 72, fullPage: true });
    return 'full.jpg';
  }
  const vh = metrics.viewport.h;
  const max = metrics.maxScroll + vh;
  const tiles = Math.max(1, Math.ceil(metrics.totalHeight / (vh * 0.92)));
  for (let i = 0; i < tiles; i++) {
    await page.evaluate((r) => window.__census.scrollRatio(r), Math.min(1, i / (tiles - 1 || 1)));
    await sleep(420);
    await page.screenshot({ path: path.join(baseDir, `full-tile-${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
  }
  await page.evaluate(() => window.__census.scrollRatio(0));
  return `full-tile-xx.jpg (${tiles} tiles)`;
}

async function loginOnce(page, baseUrl) {
  const [email, pass] = LOGIN.split(':');
  await page.goto(new URL('/auth', baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1800);
  await page.locator('#auth-email, input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], #auth-password').first().fill(pass);
  await page.locator('button[type="submit"]').first().click();
  await sleep(4500); // token + redirect to role home
}

async function censusTarget(context, targetUrl, baseDir, { deep, loader, probe }) {
  fs.mkdirSync(baseDir, { recursive: true });
  const page = await context.newPage();
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    if (loader) await captureLoaderFrames(page, path.join(baseDir, 'loader'));
    await settle(page);
    const metrics = await pageMetrics(page);
    fs.writeFileSync(path.join(baseDir, 'meta.json'), JSON.stringify(metrics, null, 1));
    const vp = page.viewportSize();
    if (`${vp.width}x${vp.height}` === deep) {
      fs.writeFileSync(path.join(baseDir, 'styles.json'), JSON.stringify(await styleCensus(page), null, 1));
      fs.writeFileSync(path.join(baseDir, 'motion.json'), JSON.stringify(await motionCensus(page), null, 1));
    }
    if (probe) await probeScroll(page, path.join(baseDir, 'probe-scroll.json')); // BEFORE any direct scroll manipulation
    metrics.headerStates = await headerStates(page);
    fs.writeFileSync(path.join(baseDir, 'meta.json'), JSON.stringify(metrics, null, 1));
    await captureScrollFrames(page, path.join(baseDir, 'frames'));
    await sleep(500);
    await captureFull(page, baseDir, metrics);
    await page.close();
    return { url: targetUrl, totalHeight: metrics.totalHeight, scroller: metrics.scroller, sections: metrics.sections.length, surfaceSweepOk: true };
  } catch (e) { await page.close().catch(() => {}); return { url: targetUrl, error: String(e).slice(0, 300) }; }
}

(async () => {
  const browser = await launchBrowser();
  console.log(`[census] ${NAME} → ${outdir}`);
  const summary = { name: NAME, url, deep: DEEP, primary: null, viewports: [], posts: [] };

  // Primary + posts share ONE context (and ONE login if requested)
  const deepVp = VIEWPORTS.find(v => `${v.width}x${v.height}` === DEEP) || VIEWPORTS[0];
  const ctx = await browser.newContext({ viewport: deepVp, deviceScaleFactor: 1 });
  await ctx.addInitScript(CENSUS_INIT);
  if (LOGIN) { const lp = await ctx.newPage(); await loginOnce(lp, url); await lp.close(); console.log('[census] login done'); }
  summary.primary = await censusTarget(ctx, url, path.join(outdir, 'primary'), { deep: DEEP, loader: LOADER, probe: PROBE });
  console.log('[census] primary:', JSON.stringify(summary.primary).slice(0, 260));
  for (const p of POST) {
    const target = new URL(p, url).href;
    const slug = p.replace(/\//g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'root';
    const r = await censusTarget(ctx, target, path.join(outdir, 'post', slug), { deep: DEEP, loader: false, probe: false });
    summary.posts.push(r); console.log('[census] post:', JSON.stringify(r).slice(0, 220));
  }
  await ctx.close();

  if (!NO_SWEEP) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
      await context.addInitScript(CENSUS_INIT);
      if (SWEEP_INIT_SCRIPT) await context.addInitScript(SWEEP_INIT_SCRIPT);
      const page = await context.newPage();
      const dir = path.join(outdir, 'viewports', `${vp.width}x${vp.height}`);
      fs.mkdirSync(dir, { recursive: true });
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch (_) {}
        await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
        await page.waitForSelector('.loading, .sl', { state: 'detached', timeout: 12000 }).catch(() => {});
        await sleep(2500);
        const m = await pageMetrics(page);
        fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(m, null, 1));
        await captureFull(page, dir, m);
        summary.viewports.push({ viewport: `${vp.width}x${vp.height}`, totalHeight: m.totalHeight, rootFontSize: m.rootFontSize, scroller: m.scroller, sections: m.sections.length });
      } catch (e) { summary.viewports.push({ viewport: `${vp.width}x${vp.height}`, error: String(e).slice(0, 200) }); }
      await context.close();
    }
    console.log('[census] viewports:', JSON.stringify(summary.viewports));
  }
  fs.writeFileSync(path.join(outdir, 'summary.json'), JSON.stringify(summary, null, 1));
  await browser.close();
  console.log('[census] DONE');
})().catch(e => { console.error('[census] FATAL', e); process.exit(1); });
