#!/usr/bin/env node
/**
 * 6-i (WP-I) perf + a11y + reduced-motion + dark-theme probe — R313 after.
 * - LCP/CLS/TBT via injected PerformanceObservers on the landing
 * - axe-core on /, /colleges, /auth (serious+critical)
 * - reduced-motion run: loader skips + 9 sections' text present statically
 * - dark theme (madarek-theme=dark) census-lite: ground/hairlines/sweep
 * NOTE (documented): no role logins — demo credentials were compromised
 * by an external brute-force actor (all 5 accounts lock each other out);
 * authenticated surfaces are re-verified only via gates/unit tests.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
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

const PERF_INIT = () => {
  window.__perf = { lcp: [], cls: 0, longTasks: [], PaintEntries: [] };
  try {
    new PerformanceObserver((l) => { const es = l.getEntries(); if (es.length) window.__perf.lcp.push(es[es.length - 1]); }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.longTasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.PaintEntries.push({ name: e.name, t: Math.round(e.startTime) }); }).observe({ type: 'paint', buffered: true });
  } catch (e) {}
};

async function perfPhase(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(PERF_INIT);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 30000 });
  await page.waitForSelector('.sl', { state: 'detached', timeout: 25000 }).catch(() => {});
  await sleep(6000); // let LCP candidates + reveal settle
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const p = window.__perf;
    const tbt = p.longTasks.reduce((a, t) => a + Math.max(0, t.dur - 50), 0);
    return {
      fcp: p.PaintEntries.find((e) => e.name === 'first-contentful-paint')?.t ?? null,
      lcp: p.lcp.length ? Math.round(p.lcp.at(-1).startTime) : null,
      lcpElement: p.lcp.length ? (p.lcp.at(-1).element ? p.lcp.at(-1).element.tagName + '.' + String(p.lcp.at(-1).element.className).slice(0, 60) : null) : null,
      cls: Math.round(p.cls * 1000) / 1000,
      longTasks: p.longTasks.length,
      tbtMs: Math.round(tbt),
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
      transferBytes: nav ? nav.transferSize : null,
    };
  });
  fs.writeFileSync(path.join(OUT, 'perf-landing.json'), JSON.stringify(perf, null, 1));
  console.log('[perf] ' + JSON.stringify(perf));
  await ctx.close();
  return perf;
}

async function axePhase(browser, urlPath, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + urlPath, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.sl', { state: 'detached', timeout: 25000 }).catch(() => {});
  await sleep(2500);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  const out = {
    url: urlPath,
    inapplicable: results.inapplicable.length,
    incomplete: results.incomplete.length,
    passes: results.passes.length,
    violationsAll: results.violations.length,
    violationsSeriousCritical: serious.length,
    seriousList: serious.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: (v.nodes[0]?.target || []).join(' ').slice(0, 90) })),
    otherViolations: results.violations.filter((v) => !['serious', 'critical'].includes(v.impact)).map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
  };
  fs.writeFileSync(path.join(OUT, `axe-${tag}.json`), JSON.stringify(out, null, 1));
  console.log(`[axe ${tag}] serious/critical=${out.violationsSeriousCritical} all=${out.violationsAll} ` + JSON.stringify(out.seriousList.map((s) => s.id)));
  await ctx.close();
  return out;
}

async function reducedMotionPhase(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3500); // if the loader wrongly plays it would still be up at ~3.5s
  const data = await page.evaluate(() => {
    const loaderPresent = !!document.querySelector('.sl');
    const sections = [];
    const sels = ['.fo-hero', '#statement', '#live', '#chapters', '#product', '.wy-section', '#roles', '.fo-cta', '.fo-footer'];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { sections.push({ sel, present: false }); continue; }
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const heading = el.querySelector('h1,h2,h3');
      const hcs = heading ? getComputedStyle(heading) : null;
      sections.push({
        sel, present: true,
        textChars: text.length,
        textSample: text.slice(0, 40),
        headingOpacity: hcs ? hcs.opacity : null,
        headingVisible: heading ? heading.getBoundingClientRect().height > 0 : null,
        childCount: el.querySelectorAll('*').length,
      });
    }
    const allAnimated = document.getAnimations().length;
    return { loaderPresent, rmMatch: matchMedia('(prefers-reduced-motion: reduce)').matches, sections, liveAnimationCount: allAnimated };
  });
  fs.writeFileSync(path.join(OUT, 'reduced-motion.json'), JSON.stringify(data, null, 1));
  console.log('[rm] loaderPresent=' + data.loaderPresent + ' sectionsOk=' + data.sections.filter((s) => s.present && s.textChars > 0).length + '/9 anims=' + data.liveAnimationCount);
  await ctx.close();
  return data;
}

async function darkPhase(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.sl', { state: 'detached', timeout: 25000 }).catch(() => {});
  await sleep(2000);
  const meta = await page.evaluate(() => {
    const bgs = { body: getComputedStyle(document.body).backgroundColor, html: getComputedStyle(document.documentElement).backgroundColor };
    const themeAttr = document.documentElement.dataset.theme || document.documentElement.getAttribute('data-theme') || null;
    /* hairline probes: borders of known hairline elements */
    const probe = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
    let radiusNonZero = 0, shadowNonNone = 0, sampled = 0;
    for (const el of document.querySelectorAll('body *')) {
      sampled++;
      const cs = getComputedStyle(el);
      const r = cs.borderRadius;
      if (r && !r.split(' ').every((x) => x === '0px' || x === '0%')) radiusNonZero++;
      if (cs.boxShadow && cs.boxShadow !== 'none') shadowNonNone++;
    }
    return {
      url: location.pathname, themeAttr, bgs, themeColor: document.querySelector('meta[name="theme-color"]')?.content || null,
      totalHeight: document.documentElement.scrollHeight,
      inputBorder: probe('input', 'borderTopColor'),
      frameBorder: probe('.sheet-frame', 'borderTopColor'),
      sweep: { sampled, radiusNonZero, shadowNonNone },
    };
  });
  fs.mkdirSync(path.join(OUT, 'dark'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'dark', 'meta.json'), JSON.stringify(meta, null, 1));
  await page.screenshot({ path: path.join(OUT, 'dark', 'frame-top.jpg'), type: 'jpeg', quality: 72 });
  await page.evaluate(() => window.scrollTo(0, 4000)); await sleep(900);
  await page.screenshot({ path: path.join(OUT, 'dark', 'frame-mid.jpg'), type: 'jpeg', quality: 72 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(900);
  await page.screenshot({ path: path.join(OUT, 'dark', 'frame-bottom.jpg'), type: 'jpeg', quality: 72 });
  console.log('[dark] ' + JSON.stringify(meta));
  await ctx.close();
  return meta;
}

(async () => {
  const browser = await launchBrowser();
  const out = {};
  out.perf = await perfPhase(browser).catch((e) => ({ error: String(e).slice(0, 300) }));
  out.axeLanding = await axePhase(browser, '/', 'landing').catch((e) => ({ error: String(e).slice(0, 300) }));
  out.axeColleges = await axePhase(browser, '/colleges', 'colleges').catch((e) => ({ error: String(e).slice(0, 300) }));
  out.axeAuth = await axePhase(browser, '/auth', 'auth').catch((e) => ({ error: String(e).slice(0, 300) }));
  out.reducedMotion = await reducedMotionPhase(browser).catch((e) => ({ error: String(e).slice(0, 300) }));
  out.dark = await darkPhase(browser).catch((e) => ({ error: String(e).slice(0, 300) }));
  fs.writeFileSync(path.join(OUT, 'perf-a11y-summary.json'), JSON.stringify(out, null, 1));
  await browser.close();
  console.log('[perf-a11y] DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
