#!/usr/bin/env node
/**
 * 6-i (WP-I independent QA) telemetry probe — R313 "after" evidence. v2
 * Phases: loader timeline · route transition · cursor (D12) · surface
 * sweep with element identification · cookie banner · header nav.
 *
 * v2 fixes vs v1: wait for the loader to APPEAR then DETACH before
 * harvesting/interacting (the fresh-load loader always plays — R313
 * D10); cursor sampling points chosen outside suppression zones with
 * elementFromPoint diagnostics; route click after loader exit.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.dirname(new URL(import.meta.url).pathname);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchBrowser() {
  try { return await chromium.launch({ headless: true }); }
  catch (e) {
    const cacheDir = path.join(process.env.HOME, '.cache/ms-playwright');
    const dirs = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter((d) => d.startsWith('chromium-')).sort() : [];
    for (const d of dirs) {
      for (const p of [`${cacheDir}/${d}/chrome-linux/chrome`, `${cacheDir}/${d}/chrome-linux/headless_shell`]) {
        if (fs.existsSync(p)) return await chromium.launch({ headless: true, executablePath: p });
      }
    }
    throw e;
  }
}

/* wait the loader out: appear → detach (fresh loads always play it) */
async function waitOutLoader(page, { appear = true } = {}) {
  if (appear) await page.waitForSelector('.sl', { state: 'attached', timeout: 15000 }).catch(() => {});
  await page.waitForSelector('.sl', { state: 'detached', timeout: 25000 }).catch(() => {});
}

const LOADER_SAMPLER = () => {
  window.__ld = { samples: [], exitClips: [], goneAt: null, lastSeenAt: null };
  const tick = () => {
    const t = Math.round(performance.now());
    const root = document.querySelector('.sl');
    if (!root) {
      if (window.__ld.goneAt === null && window.__ld.samples.length) window.__ld.goneAt = t;
      if (t < 18000) requestAnimationFrame(tick);
      return;
    }
    window.__ld.lastSeenAt = t;
    const pct = document.querySelector('.sl-pct');
    const log = document.querySelector('.sl-log');
    const onLines = log ? log.querySelectorAll('li[data-on="on"]').length : 0;
    const band = document.querySelector('.sl-band');
    const skip = document.querySelector('.sl-skip');
    window.__ld.samples.push({
      t,
      pct: pct ? pct.textContent : null,
      onLines,
      bandScale: band ? band.style.transform : null,
      exiting: root.classList.contains('is-exiting'),
      skipVisible: skip ? getComputedStyle(skip).display !== 'none' : false,
    });
    const main = document.querySelector('.sl-main');
    if (main) {
      const anims = main.getAnimations ? main.getAnimations() : [];
      const prev = window.__ld.samples[window.__ld.samples.length - 2];
      if (anims.length && (!prev || prev.exiting !== undefined)) {
        window.__ld.exitClips.push({ t, clip: getComputedStyle(main).clipPath, animDur: anims[0]?.effect?.getTiming?.().duration ?? null });
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

async function phaseLoader(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(LOADER_SAMPLER);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 30000 });
  await waitOutLoader(page);
  await sleep(1200);
  const data = await page.evaluate(() => window.__ld);
  const timeline = [];
  let lastKey = null;
  for (const s of data.samples) {
    const key = s.pct + '|' + s.onLines;
    if (key !== lastKey) { timeline.push([s.t, s.pct, s.onLines]); lastKey = key; }
  }
  const first = data.samples[0];
  const done = timeline.filter(([, p]) => p === '100%')[0];
  const exitStart = data.exitClips.length ? data.exitClips[0].t : null;
  const exitEnd = data.exitClips.length ? data.exitClips.at(-1).t : null;
  const result = {
    firstSampleMs: first ? first.t : null,
    counterTimeline: timeline,
    pct100AtMs: done ? done[0] : null,
    logLinesMaxSeen: Math.max(...data.samples.map((s) => s.onLines)),
    logLinesAtEnd: data.samples.at(-1)?.onLines ?? null,
    exitFirstClipMs: exitStart,
    exitLastClipMs: exitEnd,
    exitMs: exitStart != null && exitEnd != null ? exitEnd - exitStart : null,
    exitAnimDur: data.exitClips[0]?.animDur ?? null,
    exitClipSamples: data.exitClips.filter((_, i) => i % 4 === 0).map((c) => [c.t, c.clip]),
    holdAt100Ms: done && exitStart != null ? exitStart - done[0] : null,
    lastSeenAtMs: data.lastSeenAt,
    goneAtMs: data.goneAt,
    visibleMs: first && data.goneAt ? data.goneAt - first.t : null,
    skipButtonVisible: data.samples.some((s) => s.skipVisible),
    gating: 'measured fresh context: plays on full load',
  };
  fs.writeFileSync(path.join(OUT, 'telemetry-loader.json'), JSON.stringify(result, null, 1));
  console.log('[loader] ' + JSON.stringify({ visibleMs: result.visibleMs, pct100: result.pct100AtMs, exitMs: result.exitMs, hold: result.holdAt100Ms, logMax: result.logLinesMaxSeen, skip: result.skipButtonVisible }));
  await ctx.close();
  return result;
}

async function phaseRoute(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitOutLoader(page);
  await sleep(1500);
  const link = page.locator('.fo-header a[href="/campus"], footer a[href="/campus"]').first();
  const href = await link.getAttribute('href');
  await page.evaluate(() => {
    window.__route = { sxSeen: null, sxGone: null, loaderReplay: false, urlNow: location.pathname, reveal: [], clicks: 0 };
    const t0 = performance.now();
    const poll = setInterval(() => {
      const t = Math.round(performance.now() - t0);
      if (document.querySelector('.sx') && window.__route.sxSeen === null) window.__route.sxSeen = t;
      if (window.__route.sxSeen !== null && !document.querySelector('.sx') && window.__route.sxGone === null) window.__route.sxGone = t;
      if (document.querySelector('.sl')) window.__route.loaderReplay = true;
      if (location.pathname !== window.__route.urlNow) { window.__route.urlChangeAt = t; window.__route.urlNow = location.pathname; }
      const gr = document.querySelector('.guest-reveal-inner');
      if (gr && window.__route.reveal.length < 40) {
        const cs = getComputedStyle(gr);
        if (cs.animationName && cs.animationName !== 'none') window.__route.reveal.push({ t, name: cs.animationName, dur: cs.animationDuration });
      }
    }, 25);
    setTimeout(() => clearInterval(poll), 6000);
  });
  await link.click();
  await sleep(4500);
  const data = await page.evaluate(() => window.__route);
  const result = {
    clickedHref: href,
    finalUrl: await page.url(),
    urlChangeAtMs: data.urlChangeAt ?? null,
    sxSeenMs: data.sxSeen,
    sxGoneMs: data.sxGone,
    sxDurationMs: data.sxSeen != null && data.sxGone != null ? data.sxGone - data.sxSeen : null,
    loaderReplay: data.loaderReplay,
    guestReveal: data.reveal.slice(0, 6),
  };
  fs.writeFileSync(path.join(OUT, 'telemetry-route.json'), JSON.stringify(result, null, 1));
  console.log('[route] ' + JSON.stringify(result));
  await ctx.close();
  return result;
}

async function sampleSquare(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const cv = document.querySelector('canvas.sc-canvas');
    if (!cv) return null;
    const ctx = cv.getContext('2d');
    const R = 20;
    const d = ctx.getImageData(x - R, y - R, R * 2, R * 2).data;
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, opaque = 0, colors = {};
    let orange = 0;
    for (let yy = 0; yy < R * 2; yy++) for (let xx = 0; xx < R * 2; xx++) {
      const i = (yy * R * 2 + xx) * 4;
      const a = d[i + 3];
      if (a > 200) {
        opaque++;
        const key = `${d[i]},${d[i + 1]},${d[i + 2]}`;
        colors[key] = (colors[key] || 0) + 1;
        if (d[i] > 200 && d[i + 1] < 120 && d[i + 2] < 60) orange++;
        if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
        if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
      }
    }
    const top = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const e = document.elementFromPoint(x, y);
    return { opaque, orange, bbox: opaque ? { w: maxX - minX + 1, h: maxY - minY + 1 } : null, topColors: top, over: e ? e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 50) : null };
  }, { x, y });
}

async function phaseCursor(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitOutLoader(page);
  await sleep(1500);
  const info = await page.evaluate(() => {
    const cv = document.querySelector('canvas.sc-canvas');
    const ring = document.querySelector('.sc-ring');
    const stage = document.querySelector('.bp-stage');
    return {
      canvasPresent: !!cv,
      canvasW: cv ? cv.width : null, canvasH: cv ? cv.height : null,
      canvasPos: cv ? getComputedStyle(cv).position : null,
      canvasZ: cv ? getComputedStyle(cv).zIndex : null,
      ringPresent: !!ring,
      live: document.documentElement.dataset.sheetCursor || null,
      bpStageRect: stage ? JSON.parse(JSON.stringify(stage.getBoundingClientRect())) : null,
      bpStageCursorNone: stage ? stage.getAttribute('data-cursor') : null,
    };
  });
  /* REST: scroll to the statement section, sample over plain text */
  await page.evaluate(() => window.scrollTo(0, 420));
  await sleep(500);
  await page.mouse.move(950, 700, { steps: 16 });
  await sleep(1400);
  const rest = await sampleSquare(page, 950, 700);
  /* HOVER: back to top (header reappears), then header CTA (interactive) */
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(900);
  const cta = page.locator('.fo-header a[href="/auth/register"]').first();
  const cbox = await cta.boundingBox();
  await page.mouse.move(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2, { steps: 16 });
  await sleep(900);
  const hoverPt = { x: Math.round(cbox.x + cbox.width / 2), y: Math.round(cbox.y + cbox.height / 2) };
  const hoverSq = await sampleSquare(page, hoverPt.x, hoverPt.y);
  const hover = await page.evaluate(() => {
    const ring = document.querySelector('.sc-ring');
    if (!ring) return null;
    const cs = getComputedStyle(ring);
    const r = ring.getBoundingClientRect();
    return { dataOn: ring.dataset.on, dataPressed: ring.dataset.pressed, w: r.width, h: r.height, border: cs.borderTopWidth + ' ' + cs.borderTopColor, opacity: cs.opacity, scale: cs.scale ?? cs.transform };
  });
  await page.mouse.down();
  await sleep(450);
  const press = await page.evaluate(() => {
    const ring = document.querySelector('.sc-ring');
    if (!ring) return null;
    const cs = getComputedStyle(ring);
    const r = ring.getBoundingClientRect();
    return { dataOn: ring.dataset.on, dataPressed: ring.dataset.pressed, w: r.width, h: r.height, opacity: cs.opacity, scale: cs.scale ?? cs.transform };
  });
  /* move away BEFORE mouse.up so the press never becomes a navigating click */
  await page.mouse.move(700, 500, { steps: 8 });
  await page.mouse.up();
  /* HERO ZONE: back to top, inside .bp-stage (suppressed — reference draws nothing there) */
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  const st = info.bpStageRect;
  const heroPt = st ? { x: Math.round(st.x + st.width / 2), y: Math.round(st.y + st.height / 2) } : { x: 360, y: 300 };
  await page.mouse.move(heroPt.x, heroPt.y, { steps: 16 });
  await sleep(1200);
  const heroZone = await sampleSquare(page, heroPt.x, heroPt.y);
  const result = { info, rest, hover, hoverSquare: hoverSq, press, heroZone, heroPt, ref: { square: '10x10px bbox (~9x9 core) #FA3600', reticle: '2px #FC724D ~23.3px opacity .68; press contract scale .56' } };
  fs.writeFileSync(path.join(OUT, 'telemetry-cursor.json'), JSON.stringify(result, null, 1));
  console.log('[cursor] ' + JSON.stringify({ rest, hover, hoverSq, press, heroZone }));
  await ctx.close();
  return result;
}

async function phaseSurfaces(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitOutLoader(page);
  await sleep(1500);
  const sweep = await page.evaluate(() => {
    const out = { sampled: 0, radius: [], shadows: [], cookieBanner: null, navInventory: [], focusRingProbes: [] };
    for (const el of document.querySelectorAll('body *')) {
      out.sampled++;
      const cs = getComputedStyle(el);
      const r = cs.borderRadius;
      const parts = r.split(' ').every((x) => x === '0px' || x === '0%');
      if (r && !parts) {
        out.radius.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 100), id: el.id || null, radius: r, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) });
      }
      const sh = cs.boxShadow;
      if (sh && sh !== 'none') {
        out.shadows.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 100), shadow: sh.slice(0, 140) });
      }
    }
    const cookie = document.querySelector('[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"]');
    out.cookieBanner = cookie ? { cls: String(cookie.className).slice(0, 120), visible: cookie.getBoundingClientRect().height > 10 } : null;
    document.querySelectorAll('.fo-header a, .fo-header button').forEach((a) => {
      out.navInventory.push({ text: (a.textContent || '').trim().slice(0, 34), href: a.getAttribute('href') });
    });
    return out;
  });
  fs.writeFileSync(path.join(OUT, 'telemetry-surfaces.json'), JSON.stringify(sweep, null, 1));
  console.log('[surfaces] ' + JSON.stringify({ sampled: sweep.sampled, radius: sweep.radius.length, shadows: sweep.shadows.length, cookie: sweep.cookieBanner, nav: sweep.navInventory.length }));
  await ctx.close();
  return sweep;
}

(async () => {
  const browser = await launchBrowser();
  const out = {};
  out.loader = await phaseLoader(browser).catch((e) => ({ error: String(e).slice(0, 300) }));
  out.route = await phaseRoute(browser).catch((e) => ({ error: String(e).slice(0, 300) }));
  out.cursor = await phaseCursor(browser).catch((e) => ({ error: String(e).slice(0, 300) }));
  out.surfaces = await phaseSurfaces(browser).catch((e) => ({ error: String(e).slice(0, 300) }));
  fs.writeFileSync(path.join(OUT, 'telemetry-summary.json'), JSON.stringify(out, null, 1));
  await browser.close();
  console.log('[probe-telemetry] DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
