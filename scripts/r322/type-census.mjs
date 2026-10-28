// R322 (task 1-b) — the LANDING TYPE CENSUS.
// ─────────────────────────────────────────────────────────────────────
// Measures (never guesses) the live landing sheet's rendered type at the
// two canonical seats: 1440×900 (root 8.333px) and 390×844 (root 9.924px
// — the fluid rem root's mobile band). Sweeps EVERY text-bearing element
// (h1–h6, p, span, a, button, li, figcaption), records the computed
// family / size (px + rem on the fluid root) / weight / line-height /
// letter-spacing / color + a short selector path + the first 24 chars of
// text, then filters the DISPLAY TIER (font-size ≥ 28px at the desktop
// seat) for the owner's V5 verdict («type too heavy: ≥4 display sizes,
// black-ish weights»).
// Evidence: audits/evidence/r322/dsys/type-census.json (+ .md summary).
// Usage: node scripts/r322/type-census.mjs   (Vite must be up on :5175)
//   CENSUS_SUFFIX=after → writes type-census-after.{json,md} + a neutral
//   reading section (the 1-d migration's AFTER census; the default run
//   keeps the 1-b "before" narrative + filenames untouched).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'http://localhost:5175/';
const OUT_DIR = path.join(ROOT, 'audits', 'evidence', 'r322', 'dsys');
const SHOT_DIR = path.join(OUT_DIR, 'shots');
const SHOT_SUFFIX = process.env.SHOT_SUFFIX || 'before';
const SUFFIX = process.env.CENSUS_SUFFIX ? `-${process.env.CENSUS_SUFFIX}` : '';
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '991', width: 991, height: 900 }, // the tablet band's widest edge — root 11.88px
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
  { name: '360', width: 360, height: 800 }, // R322 1-d: the floor belt — d1/d2 hold 31.74px
];
const SELECTOR = 'h1,h2,h3,h4,h5,h6,p,span,a,button,li,figcaption,strong,em';

// In-page sweep — everything runs against getComputedStyle so hidden
// reveal-states (opacity 0) still report their FINAL computed type.
const SWEEP = (selector) => {
  const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const shortPath = (el) => {
    const parts = [];
    let node = el;
    for (let depth = 0; node && depth < 3 && node !== document.body; depth += 1) {
      let s = node.tagName.toLowerCase();
      if (node.id) s += `#${node.id}`;
      const cls = (node.classList && node.classList.length)
        ? `.${Array.from(node.classList).slice(0, 2).join('.')}`
        : '';
      parts.unshift(s + cls);
      node = node.parentElement;
    }
    return parts.join(' › ') || 'body';
  };
  const out = [];
  document.querySelectorAll(selector).forEach((el) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    // only TEXT-BEARING elements (own or descendant text) with a rendered box
    if (!text) return;
    const rects = el.getClientRects();
    if (rects.length === 0) return; // display:none subtree
    const cs = getComputedStyle(el);
    const fsPx = parseFloat(cs.fontSize);
    const rect = el.getBoundingClientRect();
    out.push({
      sel: shortPath(el),
      text: text.slice(0, 24),
      chars: text.length,
      family: cs.fontFamily.split(',')[0].replace(/['"]/g, ''),
      sizePx: Math.round(fsPx * 100) / 100,
      sizeRem: Math.round((fsPx / rootFs) * 1000) / 1000,
      weight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      rectW: Math.round(rect.width),
      rectH: Math.round(rect.height),
    });
  });
  return { rootFs, count: out.length, elements: out };
};

const browser = await chromium.launch();
const report = { generated: new Date().toISOString(), url: BASE, viewports: {} };

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // the entrance loader (835ms exit) + RevealCssClass delays settle
  await page.waitForTimeout(3000);
  const { rootFs, count, elements } = await page.evaluate(SWEEP, SELECTOR);

  // DISPLAY TIER (the owner's V5 claim): ≥ 28px computed at this seat.
  const displayTier = elements.filter((e) => e.sizePx >= 28);

  // distinct (size, weight, family) combos with their exact selectors
  const combos = new Map();
  for (const e of displayTier) {
    const key = `${e.sizePx}px · w${e.weight} · ${e.family}`;
    if (!combos.has(key)) combos.set(key, { key, sizePx: e.sizePx, weight: e.weight, family: e.family, selectors: new Map(), samples: 0 });
    const c = combos.get(key);
    c.selectors.set(e.sel, (c.selectors.get(e.sel) || 0) + 1);
    c.samples += 1;
  }

  report.viewports[vp.name] = {
    viewport: `${vp.width}x${vp.height}`,
    rootFontSizePx: Math.round(rootFs * 1000) / 1000,
    sweptElements: count,
    displayTierCount: displayTier.length,
    displayCombos: Array.from(combos.values()).map((c) => ({
      ...c,
      selectors: Array.from(c.selectors.entries()).map(([s, n]) => (n > 1 ? `${s} ×${n}` : s)),
    })),
    displayTier,
  };

  // evidence shot: the first viewport of the sheet (the hero seat)
  await page.screenshot({
    path: path.join(SHOT_DIR, `landing-hero-${vp.name}-${SHOT_SUFFIX}.png`),
    clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 900) },
  });
  await ctx.close();
}
await browser.close();

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, `type-census${SUFFIX}.json`), JSON.stringify(report, null, 2));

// ── the terse MD summary (hand-checkable numbers) ──
const lines = [];
lines.push('# R322 type census — the landing sheet as rendered (measured, not guessed)');
lines.push('');
lines.push(`Generated: ${report.generated} · source: ${BASE} · script: \`scripts/r322/type-census.mjs\``);
lines.push('');
lines.push('Method: Playwright chromium, computed styles on EVERY text-bearing element');
lines.push('(h1–h6, p, span, a, button, li, figcaption, strong, em) after `load` +');
lines.push('`document.fonts.ready` + 3s settle (loader exit + reveal delays). Rem values');
lines.push('divide by the FLUID root (html font-size — the R313 gear-box).');
lines.push('');
for (const vp of VIEWPORTS) {
  const v = report.viewports[String(vp.name)];
  lines.push(`## ${v.viewport} — fluid root ${v.rootFontSizePx}px`);
  lines.push('');
  lines.push(`Swept ${v.sweptElements} text-bearing elements; **${v.displayTierCount} sit in the display tier (≥28px)**.`);
  lines.push('');
  lines.push('| size (px / rem) | weight | face | selectors |');
  lines.push('|---|---|---|---|');
  for (const c of v.displayCombos) {
    lines.push(`| ${c.sizePx}px / ${(Math.round((c.sizePx / v.rootFontSizePx) * 1000) / 1000)}rem | ${c.weight} | ${c.family} | ${c.selectors.join('<br>')} |`);
  }
  lines.push('');
  const weights = Array.from(new Set(v.displayCombos.map((c) => c.weight))).sort();
  const sizes = Array.from(new Set(v.displayCombos.map((c) => c.sizePx))).sort((a, b) => b - a);
  lines.push(`**Distinct display sizes:** ${sizes.join(' · ')} (${sizes.length} sizes) · **distinct weights:** ${weights.join(' · ')}`);
  lines.push('');
}
if (SUFFIX) {
  // the AFTER run (R322 1-d): tables only — the reading lives in the
  // hand-checked census-after companion, not a hardcoded narrative.
  lines.push('');
  lines.push('## Reading');
  lines.push('');
  lines.push('Tables are machine-measured post-migration output. The');
  lines.push('hand-checked verdict (seat→rung mapping, band checks, docH)');
  lines.push('lives in the 1-d census-after companion notes.');
  lines.push('');
} else {
  lines.push('## Reading (the V5 verdict against the numbers)');
  lines.push('');
  lines.push('- The landing display tier runs on ONE ladder token (`--fs-display-lg`, 7.2rem)');
  lines.push('  but the FLUID ROOT amplifies it per band — the tablet band (991px → root');
  lines.push('  11.88px) pushes the same 7.2rem to ~85px, which is where the owner’s');
  lines.push('  «80–110px» reading comes from; the mobile band re-inflates it after the');
  lines.push('  ≤767 re-pins. Re-pin happens in the R322 scale (DESIGN.md §R322).');
  lines.push('- Every display combo above rides weight 700 (Alexandria 700 — the heaviest');
  lines.push('  WIRED cut; the R322 brief ends the 800/900 era and re-weights 400–600).');
  lines.push('');
}
fs.writeFileSync(path.join(OUT_DIR, `type-census${SUFFIX}.md`), lines.join('\n'));
console.log(`census done: ${VIEWPORTS.map((v) => `${v.name}=${report.viewports[String(v.name)].displayTierCount} display / ${report.viewports[String(v.name)].sweptElements} swept`).join(' · ')}`);
console.log(`json → ${path.join(OUT_DIR, `type-census${SUFFIX}.json`)}`);
console.log(`md   → ${path.join(OUT_DIR, `type-census${SUFFIX}.md`)}`);
