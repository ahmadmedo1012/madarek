#!/usr/bin/env node
/**
 * R315 J1 — measure-sections.mjs: the geometry target table for the cycle.
 *
 * For HERON (https://heronaiapp.com/) and MADAREK (local vite dev build) at
 * every R315 target viewport, measure:
 *   - total scroll content height (Heron: .main-inner Lenis wrapper
 *     scrollHeight — the document itself never scrolls; Madarek: window /
 *     documentElement scroll height), and
 *   - the 9 landing band offsetHeights (+ layout tops + pct share),
 * deterministically: full load → document.fonts.ready → per-site loader wait
 * → stability loop (re-measure until two consecutive reads agree).
 *
 * Heron fresh numbers are sanity-checked against the committed r313 reference
 * digest (audits/evidence/r313/reference/digest.json); any |Δ| > 2% is flagged
 * in a `drift` field — fresh numbers are NEVER silently replaced.
 *
 * Output: _local/captures/r315-manifest.json
 *
 * Usage:
 *   node scripts/r315/measure-sections.mjs
 *   node scripts/r315/measure-sections.mjs --sites heron --viewports 1440x900,390x844
 *   node scripts/r315/measure-sections.mjs --out <manifest.json>
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const SITES = {
  heron: { url: 'https://heronaiapp.com/', wait: 11000 },
  madarek: { url: 'http://localhost:5173/', wait: 9000 },
};

// The 9 canonical landing bands (DOM order). Selectors are tried in order.
// Heron selectors come from audits/evidence/r313/reference/digest.json
// (.main-inner scroller); Madarek class names were verified live against
// http://localhost:5173/ on 2026-10-24 (J1 probe): .fo-hero, #statement.st-section,
// #live.pm-section, #chapters.chapters, #product.pr-section, .wy-section,
// #roles.rl-section, #vision.fo-cta, footer.fo-footer — each unique.
const BANDS = {
  heron: [
    ['hero', ['.home-hero']],
    ['intro', ['.home-intro']],
    ['problem', ['.home-problem']],
    ['map', ['.home-map']],
    ['platform', ['.home-platform']],
    ['why', ['.home-why']],
    ['usecase', ['.home-usecase']],
    ['cta', ['.main-inner .cta', '.cta']],
    ['footer', ['.main-inner .footer', '.footer']],
  ],
  madarek: [
    ['hero', ['.fo-hero']],
    ['statement', ['#statement', '.st-section']],
    ['problem', ['.pm-section', '#live']],
    ['chapters', ['.chapters', '#chapters']],
    ['product', ['.pr-section', '#product']],
    ['why', ['.wy-section']],
    ['roles', ['.rl-section', '#roles']],
    ['cta', ['.fo-cta', '#vision']],
    ['footer', ['.fo-footer', 'footer.fo-footer']],
  ],
};

// r313 committed reference (Heron) — sanity anchors for drift detection.
const R313_PAGE = { '1440x900': 12355, '1440x700': 10555, '1280x800': 10983, '1024x768': 9938, '768x1024': 12577, '390x844': 11441, '360x800': 10684 };
const R313_SECTIONS_1440x900 = { hero: 887, intro: 723, problem: 743, map: 6300, platform: 710, why: 698, usecase: 887, cta: 698, footer: 711 };

const DEFAULT_VIEWPORTS = ['360x800', '390x844', '412x915', '768x1024', '820x1180', '1024x768', '1280x800', '1440x700', '1440x900', '1920x1080', '844x390'];
const DRIFT_PCT_THRESHOLD = 2; // >2% vs r313 → flagged, never silently picked

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const sites = (get('sites', 'heron,madarek')).split(',');
const viewports = (get('viewports', DEFAULT_VIEWPORTS.join(','))).split(',');
const outPath = get('out', '_local/captures/r315-manifest.json');

const MEASURE_FN = (bands) => {
  // runs in page context — no imports
  const scroller = document.querySelector('.lenis, [data-lenis-wrapper]');
  const elementMode = !!(scroller && scroller.scrollHeight > window.innerHeight + 200 && scroller !== document.documentElement);
  const docHeight = elementMode ? scroller.scrollHeight : document.documentElement.scrollHeight;
  const layoutTop = (el) => {
    // accumulate offsetTop up the offsetParent chain → transform/scroll-stable
    let t = 0, n = el;
    while (n && n !== document.body) { t += n.offsetTop; n = n.offsetParent; }
    if (n === document.body) t += n.offsetTop + (document.body.offsetTop || 0) - (document.body.scrollTop || 0);
    return Math.round(t);
  };
  const sections = {};
  for (const [name, sels] of bands) {
    let el = null, used = null;
    for (const sel of sels) { el = document.querySelector(sel); if (el) { used = sel; break; } }
    if (!el) { sections[name] = { sel: sels.join(' | '), found: false, h: null, top: null, pct: null }; continue; }
    const h = el.offsetHeight; // layout height — matches r313 methodology
    sections[name] = {
      sel: used, found: true,
      id: el.id || null,
      cls: String(el.className).split(/\s+/)[0] || null,
      h, top: layoutTop(el),
      pct: docHeight ? Math.round((h / docHeight) * 1000) / 10 : null,
    };
  }
  return {
    docHeight,
    documentScrollHeight: document.documentElement.scrollHeight,
    scrollMode: elementMode ? 'element' : 'window',
    scrollerCls: scroller ? String(scroller.className).split(/\s+/).slice(0, 2).join('.') : null,
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    sections,
  };
};

const pctDiff = (fresh, ref) => (ref ? Math.round(((fresh - ref) / ref) * 10000) / 100 : null);

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] });

const manifest = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/r315/measure-sections.mjs (R315 J1)',
  method: 'loader wait + fonts.ready + stability loop; heights are element offsetHeights; Heron docHeight = .main-inner Lenis wrapper scrollHeight (document never scrolls), Madarek docHeight = document scroll height',
  driftRule: `Heron fresh vs r313 reference: |pct| > ${DRIFT_PCT_THRESHOLD}% flagged in drift fields; fresh values are authoritative, reference kept alongside`,
  viewports,
  sites: {},
};

for (const siteName of sites) {
  const site = SITES[siteName];
  const bands = BANDS[siteName];
  const entry = { url: site.url, wait: site.wait, perViewport: {}, failures: [] };
  manifest.sites[siteName] = entry;
  for (const vp of viewports) {
    const [w, h] = vp.split('x').map(Number);
    process.stdout.write(`▸ ${siteName} ${vp} … `);
    let data = null, lastErr = null;
    for (let attempt = 1; attempt <= 2 && !data; attempt++) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference', locale: 'en-US' });
      try {
        const page = await ctx.newPage();
        const resp = await page.goto(site.url, { waitUntil: 'load', timeout: 60000 });
        try { await page.evaluate(() => document.fonts.ready); } catch {}
        await page.waitForTimeout(site.wait);
        // stability loop: re-measure until two consecutive reads agree (≤4 tries)
        let prev = null;
        for (let i = 0; i < 4; i++) {
          data = await page.evaluate(MEASURE_FN, bands);
          const key = JSON.stringify([data.docHeight, data.sections]);
          if (prev === key) break;
          prev = key;
          await page.waitForTimeout(700);
        }
        data.finalUrl = page.url();
        data.mainStatus = resp ? resp.status() : null;
        try { data.title = await page.title(); } catch { data.title = null; }
        await ctx.close();
      } catch (e) {
        lastErr = String(e).slice(0, 200);
        if (attempt === 1) { console.log(`load failed (${lastErr}) — retrying once`); await new Promise((r) => setTimeout(r, 3000)); }
        await ctx.close().catch(() => {});
      }
    }
    if (!data) {
      entry.failures.push({ viewport: vp, error: lastErr });
      entry.perViewport[vp] = { error: lastErr };
      console.log('FAILED (recorded, moving on)');
      continue;
    }
    // heron: drift vs r313 reference (where a reference exists)
    if (siteName === 'heron') {
      const refPage = R313_PAGE[vp];
      const drift = {};
      if (refPage != null) {
        const p = pctDiff(data.docHeight, refPage);
        drift.pageHeight = { fresh: data.docHeight, ref: refPage, pct: p, overThreshold: Math.abs(p) > DRIFT_PCT_THRESHOLD };
      }
      if (vp === '1440x900') {
        drift.sections = {};
        for (const [name, ref] of Object.entries(R313_SECTIONS_1440x900)) {
          const fresh = data.sections[name] ? data.sections[name].h : null;
          if (fresh == null) { drift.sections[name] = { fresh: null, ref, pct: null, overThreshold: true, note: 'band not found' }; continue; }
          const p = pctDiff(fresh, ref);
          drift.sections[name] = { fresh, ref, pct: p, overThreshold: Math.abs(p) > DRIFT_PCT_THRESHOLD };
        }
      }
      data.r313Reference = { pageHeight: refPage ?? null, sections1440x900: vp === '1440x900' ? R313_SECTIONS_1440x900 : null };
      data.drift = drift;
    }
    entry.perViewport[vp] = data;
    const bandsStr = Object.entries(data.sections).map(([n, s]) => `${n}:${s.h ?? '??'}`).join(' ');
    console.log(`docH=${data.docHeight} (${data.scrollMode}) — ${bandsStr}`);
  }
}

await browser.close();

// drift summary (heron only)
manifest.driftSummary = [];
const heron = manifest.sites.heron;
if (heron) {
  for (const [vp, d] of Object.entries(heron.perViewport)) {
    if (!d.drift) continue;
    for (const [k, v] of Object.entries(d.drift)) {
      if (k === 'pageHeight' && v.overThreshold) manifest.driftSummary.push({ viewport: vp, metric: 'pageHeight', ...v });
      if (k === 'sections') for (const [n, s] of Object.entries(v)) if (s.overThreshold) manifest.driftSummary.push({ viewport: vp, metric: `section:${n}`, ...s });
    }
  }
}

fs.mkdirSync(outPath.split('/').slice(0, -1).join('/'), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`\n✓ manifest → ${outPath}`);
console.log(manifest.driftSummary.length
  ? `⚠ ${manifest.driftSummary.length} drift(s) > ${DRIFT_PCT_THRESHOLD}% vs r313: ` + manifest.driftSummary.map((d) => `${d.viewport} ${d.metric} ${d.fresh} vs ${d.ref} (${d.pct}%)`).join(' · ')
  : `✓ no drift > ${DRIFT_PCT_THRESHOLD}% vs r313 reference`);
if (heron && heron.failures.length) console.log(`⚠ heron failures: ` + heron.failures.map((f) => f.viewport).join(', '));
const mad = manifest.sites.madarek;
if (mad && mad.failures.length) console.log(`⚠ madarek failures: ` + mad.failures.map((f) => f.viewport).join(', '));
