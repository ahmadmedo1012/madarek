#!/usr/bin/env node
/**
 * R315 cycle-2 — band-structure probe (M3 instrument).
 * Dumps the computed composition skeleton of the landing's content bands
 * at a viewport: band box, grid templates, gaps/padding, and per-child
 * boxes + font metrics. Language-free facts the tablet/landscape
 * re-composition is mirrored from — no guessing from screenshots.
 *
 * Usage:
 *   node scripts/r315/band-structure-probe.mjs --site heron --viewport 768x1024
 *   node scripts/r315/band-structure-probe.mjs --site madarek --viewport 768x1024 \
 *        [--bands intro,platform] [--depth 2]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SITES = {
  heron: { url: 'https://heronaiapp.com/', wait: 11000 },
  madarek: { url: 'http://localhost:5173/', wait: 9000 },
};

const BANDS = {
  heron: {
    intro: '.home-intro',
    problem: '.home-problem',
    map: '.home-map',
    platform: '.home-platform',
    why: '.home-why',
    usecase: '.home-usecase',
    cta: '.cta',
    footer: '.footer',
  },
  madarek: {
    intro: '#statement.st-section',
    problem: '#live.pm-section',
    map: '#chapters.chapters',
    platform: '#product.pr-section',
    why: '.wy-section',
    usecase: '#roles.rl-section',
    cta: '#vision.fo-cta',
    footer: 'footer.fo-footer',
  },
};

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const site = get('site', 'heron');
const [w, h] = get('viewport', '768x1024').split('x').map(Number);
const depth = Number(get('depth', 2));
const bandsWanted = (get('bands', '') || 'intro,problem,platform,why,usecase,cta,footer').split(',').filter(Boolean);

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.goto(SITES[site].url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(SITES[site].wait);

const out = await page.evaluate(({ bands, depth }) => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + window.scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
  const skel = (el, d) => {
    const cs = getComputedStyle(el);
    const node = {
      tag: el.tagName.toLowerCase(),
      cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().split(' ').slice(0, 3).join('.'),
      box: r(el),
      disp: cs.display,
      cols: cs.gridTemplateColumns,
      rows: cs.gridTemplateRows,
      gap: cs.rowGap + ' / ' + cs.columnGap,
      pad: cs.padding,
      fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
      kids: [],
    };
    if (d > 0) {
      for (const k of Array.from(el.children).slice(0, 14)) {
        const kb = k.getBoundingClientRect();
        if (kb.height < 2 && kb.width < 2) continue;
        node.kids.push(skel(k, d - 1));
      }
    }
    return node;
  };
  const res = { root: getComputedStyle(document.documentElement).fontSize, vw: innerWidth, vh: innerHeight };
  for (const [name, sel] of Object.entries(bands)) {
    const el = document.querySelector(sel);
    res[name] = el ? skel(el, depth) : null;
  }
  return res;
}, { bands: Object.fromEntries(bandsWanted.map(b => [b, BANDS[site][b]])), depth });

fs.mkdirSync('_local/band-probe', { recursive: true });
const file = `_local/band-probe/${site}-${w}x${h}.json`;
fs.writeFileSync(file, JSON.stringify(out, null, 1));

// compact console digest
const line = (n, s, ind) => `${'  '.repeat(ind)}${n}${s.cls ? '.' + s.cls : ''} [${s.box.w}×${s.box.h}] fs:${s.fs} fw:${s.fw}${s.cols !== 'none' ? ' cols:' + s.cols : ''}${s.kids.length ? '' : ''}`;
const walk = (s, ind) => [line('', s, ind), ...s.kids.flatMap(k => walk(k, ind + 1))];
console.log(`\n═══ ${site} ${w}×${h} · root ${out.root} ═══`);
for (const b of bandsWanted) {
  if (!out[b]) { console.log(`  ${b}: NOT FOUND`); continue; }
  console.log(`── ${b} ──`);
  console.log(walk(out[b], 1).slice(0, 40).join('\n'));
}
await browser.close();
