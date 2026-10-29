#!/usr/bin/env node
/**
 * brand-assets.mjs — R323 §A1 — regenerates EVERY static brand asset from
 * the ONE geometry (frontend/src/brand/mark.ts + the generated wordmark
 * sheets) so the product component, the favicon, the PWA icons, the OG
 * card and the e-mail/pdf twins can never diverge again:
 *
 *   frontend/public/brand/mark.svg            (component twin, 32-grid)
 *   frontend/public/brand/madarek-mark.svg    (byte-identical twin — the
 *       historical filename pinned by seed.ts, schema.org and tests)
 *   frontend/public/brand/lockup.svg          (RTL lockup: mark right,
 *       «مدارك» left — same composition as <Logo variant="lockup">)
 *   frontend/public/brand/lockup-stacked.svg  (mark / مدارك / MADAREK)
 *   frontend/public/favicon.svg               (thicker 16 px ratios — the
 *       ONLY sanctioned stroke deviation, BRAND.md §min-sizes)
 *   frontend/public/brand/icon-180|192|512.png (maskable, paper ground)
 *   frontend/public/brand/madarek-og.jpg      (1200×630 social card)
 *
 * Colours ONLY paper #F6F6EE · ink #282828 · orange #FA3600. Hairline
 * strokes, miter joins, radius 0, no gradients, ONE orange accent.
 *
 * Why a browser renderer: the worktree ships Playwright + Chromium (the
 * app's own rasterizer) and no sharp/canvas binding — the PNGs/JPG are
 * pixel-faithful to the product's rendering (the r320 precedent).
 * Deterministic: same inputs ⇒ same bytes (verified by the unit belt).
 *
 * Run AFTER scripts/r323/wordmark-build-r323.mjs (reads
 * frontend/src/brand/wordmark.generated.ts for the path data):
 *   node scripts/r323/brand-assets.mjs
 */
import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BRAND_DIR = path.join(ROOT, 'frontend', 'public', 'brand');
const GEN_TS = path.join(ROOT, 'frontend', 'src', 'brand', 'wordmark.generated.ts');

const PAPER = '#F6F6EE';
const INK = '#282828';
const ORANGE = '#FA3600';

/* mark geometry — keep in sync with frontend/src/brand/mark.ts (the unit
 * belt pins the two together) */
const MARK = {
  viewBox: '0 0 32 32',
  axis: { x: 8, y: 8, size: 16 },
  diamond: 'M16 5L27 16L16 27L5 16Z',
  point: { x: 22, y: 6, size: 4 },
};
/* lockup composition — keep in sync with frontend/src/brand/lockups.ts */
const LOCKUP_CANVAS = { w: 62.99, h: 32 };
const STACKED_CANVAS = { w: 32, h: 59.5 };

/* ── read the generated wordmark sheets ─────────────────────────────── */
if (!existsSync(GEN_TS)) {
  console.error('[brand-assets] missing frontend/src/brand/wordmark.generated.ts — run scripts/r323/wordmark-build-r323.mjs first');
  process.exit(1);
}
function parseSheet(name) {
  const block = readFileSync(GEN_TS, 'utf8').split(`export const ${name} = `)[1] ?? '';
  const viewBox = block.match(/viewBox: '([^']+)'/)?.[1];
  const d = block.match(/\n  d: '([^']+)'/)?.[1];
  const ink = block.match(/ink: \{ w: ([\d.]+), h: ([\d.]+) \}/);
  if (!viewBox || !d || !ink) {
    console.error(`[brand-assets] cannot parse ${name} from wordmark.generated.ts`);
    process.exit(1);
  }
  return { viewBox, d, inkW: Number(ink[1]), inkH: Number(ink[2]) };
}
const AR = parseSheet('WORDMARK_AR');
const LAT = parseSheet('WORDMARK_LATIN');
const AR_MARGIN = 6;

/* place(): identical math to frontend/src/brand/lockups.ts */
function place(sheetInkH, inkH, inkX, inkY) {
  const scale = inkH / sheetInkH;
  return {
    scale: +scale.toFixed(5),
    x: +(inkX - AR_MARGIN * scale).toFixed(3),
    y: +(inkY - AR_MARGIN * scale).toFixed(3),
  };
}
const LOCKUP_AR_INK_H = 11;
const lockupAr = place(AR.inkH, LOCKUP_AR_INK_H, 5, (32 - LOCKUP_AR_INK_H) / 2);
const lockupArInkW = +(AR.inkW * lockupAr.scale).toFixed(3);
const lockupMarkX = +(5 + lockupArInkW + 5 - 5).toFixed(3);
if (Math.abs(lockupMarkX + 32 - LOCKUP_CANVAS.w) > 0.05) {
  console.error(`[brand-assets] lockup composition drifted from lockups.ts (${lockupMarkX + 32} ≠ ${LOCKUP_CANVAS.w})`);
  process.exit(1);
}
const STACKED_AR_INK_H = 10;
const STACKED_LATIN_INK_H = 3.5;
const stackedAr = place(AR.inkH, STACKED_AR_INK_H, (32 - AR.inkW * (STACKED_AR_INK_H / AR.inkH)) / 2, 37);
const stackedArInkW = +(AR.inkW * stackedAr.scale).toFixed(3);
const stackedLatin = place(LAT.inkH, STACKED_LATIN_INK_H, (32 - LAT.inkW * (STACKED_LATIN_INK_H / LAT.inkH)) / 2, 37 + STACKED_AR_INK_H + 4);
const stackedH = +(32 + 5 + STACKED_AR_INK_H + 4 + STACKED_LATIN_INK_H + 5).toFixed(2);
if (Math.abs(stackedH - STACKED_CANVAS.h) > 0.05) {
  console.error(`[brand-assets] stacked composition drifted from lockups.ts (${stackedH} ≠ ${STACKED_CANVAS.h})`);
  process.exit(1);
}

/* ── svg fragments ──────────────────────────────────────────────────── */
const markGroup = (strokeWidth) => `<g fill="none" stroke="${INK}" stroke-width="${strokeWidth}" stroke-linejoin="miter">
    <rect x="${MARK.axis.x}" y="${MARK.axis.y}" width="${MARK.axis.size}" height="${MARK.axis.size}"/>
    <path d="${MARK.diamond}"/>
  </g>
  <rect x="${MARK.point.x}" y="${MARK.point.y}" width="${MARK.point.size}" height="${MARK.point.size}" fill="${ORANGE}"/>`;

const HEADER_COMMENT = `<!-- R323 brand system — GENERATED by scripts/r323/brand-assets.mjs — do not edit by hand.
     Geometry source: frontend/src/brand/mark.ts (+ lockups.ts, wordmark.generated.ts).
     Colours: paper ${PAPER} · ink ${INK} · orange ${ORANGE}. Hairline strokes, miter joins,
     radius 0, no gradients. Regenerate: node scripts/r323/brand-assets.mjs -->`;

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}" width="64" height="64" role="img" aria-label="شعار منصّة مدارك">
  ${HEADER_COMMENT}
  <title>مدارك</title>
  ${markGroup(1)}
</svg>
`;

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}">
  ${HEADER_COMMENT}
  <!-- the favicon seat: same geometry, thicker PROPORTIONAL stroke ratio
       (2.25/32) for 16 px legibility — the only sanctioned deviation
       (docs/redesign/r323/brand/BRAND.md §min-sizes). -->
  ${markGroup(2.25)}
</svg>
`;

const wordStroke = `fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="miter"`;
const lockupSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOCKUP_CANVAS.w} ${LOCKUP_CANVAS.h}" role="img" aria-label="مدارك">
  ${HEADER_COMMENT}
  <title>مدارك</title>
  <g transform="translate(${lockupAr.x} ${lockupAr.y}) scale(${lockupAr.scale})"><path d="${AR.d}" ${wordStroke}/></g>
  <g transform="translate(${lockupMarkX} 0)">
  ${markGroup(1.5)}
  </g>
</svg>
`;
const lockupStackedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STACKED_CANVAS.w} ${STACKED_CANVAS.h}" role="img" aria-label="مدارك">
  ${HEADER_COMMENT}
  <title>مدارك</title>
  <g transform="translate(0 0)">
  ${markGroup(1.5)}
  </g>
  <g transform="translate(${stackedAr.x} ${stackedAr.y}) scale(${stackedAr.scale})"><path d="${AR.d}" ${wordStroke}/></g>
  <g transform="translate(${stackedLatin.x} ${stackedLatin.y}) scale(${stackedLatin.scale})"><path d="${LAT.d}" fill="${INK}"/></g>
</svg>
`;

writeFileSync(path.join(BRAND_DIR, 'mark.svg'), markSvg);
writeFileSync(path.join(BRAND_DIR, 'madarek-mark.svg'), markSvg);
writeFileSync(path.join(BRAND_DIR, 'lockup.svg'), lockupSvg);
writeFileSync(path.join(BRAND_DIR, 'lockup-stacked.svg'), lockupStackedSvg);
writeFileSync(path.join(ROOT, 'frontend', 'public', 'favicon.svg'), faviconSvg);
console.log('[brand-assets] ✓ mark.svg · madarek-mark.svg · lockup.svg · lockup-stacked.svg · favicon.svg');

/* ── raster: PWA icons + the OG card (Playwright/Chromium) ──────────── */
const EXECUTABLE = process.env.MADAREK_E2E_EXECUTABLE
  ?? '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

function pngIhdrSize(buf) {
  if (buf.length < 24) throw new Error('PNG too short for an IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const FAVICON = readFileSync(path.join(ROOT, 'frontend', 'public', 'favicon.svg'), 'utf8');
const LOCKUP = readFileSync(path.join(BRAND_DIR, 'lockup.svg'), 'utf8');

/* the OG tagline — the brand copy, verbatim (Arabic NEVER letter-spaced;
 * the faces resolve from the self-hosted woff2s via file:// URLs so the
 * card renders identically on any machine). */
const TAGLINE = 'منصّة مدارك — كلّ معرفة تبدأ نقطةً وتصبح مدارًا';
const plexArabicUrl = pathToFileURL(path.join(ROOT, 'frontend/public/fonts/plex-sans-arabic-600-normal-arabic.woff2')).href;
const plexLatinUrl = pathToFileURL(path.join(ROOT, 'frontend/public/fonts/plex-sans-arabic-600-normal-latin.woff2')).href;

const browser = await chromium.launch({ executablePath: EXECUTABLE });
try {
  /* PWA icons — the maskable recipe (r320 precedent): full-bleed paper
   * tile, the favicon geometry (thicker ratios) centred at 62% — inside
   * the central-80% safe zone. */
  for (const size of [180, 192, 512]) {
    const mark = Math.round(size * 0.62);
    const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  body { width: ${size}px; height: ${size}px; background: ${PAPER}; display: grid; place-items: center; overflow: hidden; }
  svg { display: block; width: ${mark}px; height: ${mark}px; }
</style></head>
<body>${FAVICON}</body></html>`;
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    const ihdr = pngIhdrSize(png);
    if (ihdr.width !== size || ihdr.height !== size) {
      throw new Error(`icon-${size}: IHDR ${ihdr.width}x${ihdr.height} ≠ ${size}x${size}`);
    }
    writeFileSync(path.join(BRAND_DIR, `icon-${size}.png`), png);
    console.log(`[brand-assets] ✓ icon-${size}.png — IHDR ${ihdr.width}x${ihdr.height}, ${(png.length / 1024).toFixed(1)}KB`);
  }

  /* the OG card — 1200×630 paper plate: hairline ink frame, the lockup,
   * ONE orange accent (the mark's point), the Arabic tagline. */
  const W = 1200;
  const H = 630;
  const lockupH = 150;
  const lockupW = +(lockupH * (LOCKUP_CANVAS.w / LOCKUP_CANVAS.h)).toFixed(1);
  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'mdrk-og-ar'; src: url('${plexArabicUrl}') format('woff2'); font-weight: 600; font-display: block; }
  @font-face { font-family: 'mdrk-og-lt'; src: url('${plexLatinUrl}') format('woff2'); font-weight: 600; font-display: block; }
  html, body { margin: 0; padding: 0; }
  body { width: ${W}px; height: ${H}px; background: ${PAPER}; overflow: hidden;
         display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .frame { position: absolute; inset: 26px; border: 1.5px solid ${INK}; pointer-events: none; }
  .lockup svg { display: block; width: ${lockupW}px; height: ${lockupH}px; }
  .tagline { margin-top: 44px; font-family: 'mdrk-og-ar', 'mdrk-og-lt', sans-serif;
             font-weight: 600; font-size: 33px; line-height: 1.7; color: ${INK};
             direction: rtl; text-align: center; letter-spacing: 0; }
</style></head>
<body>
  <div class="frame"></div>
  <div class="lockup">${LOCKUP}</div>
  <div class="tagline">${TAGLINE}</div>
</body></html>`;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120); /* font raster settle */
  const jpg = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: W, height: H } });
  await page.close();
  writeFileSync(path.join(BRAND_DIR, 'madarek-og.jpg'), jpg);
  console.log(`[brand-assets] ✓ madarek-og.jpg — ${W}×${H}, ${(jpg.length / 1024).toFixed(1)}KB`);
} finally {
  await browser.close();
}

/* ── manifest consistency check (the manifest itself needs no change —
 * its icon paths and paper theme already match the new system) ─────── */
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'frontend', 'public', 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons) {
  const p = path.join(ROOT, 'frontend', 'public', icon.src.replace(/^\//, ''));
  if (!existsSync(p)) {
    console.error(`[brand-assets] manifest icon missing on disk: ${icon.src}`);
    process.exit(1);
  }
}
if (manifest.theme_color !== PAPER || manifest.background_color !== PAPER) {
  console.error('[brand-assets] manifest theme/background drifted from paper');
  process.exit(1);
}
console.log('[brand-assets] ✓ manifest.webmanifest consistent (icons on disk, paper theme)');
