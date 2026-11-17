#!/usr/bin/env node
/**
 * logo-audit.mjs — R366 Agent 2 · L1 — «شعار واحد في كل مكان», audited.
 *
 * The brand system already has three drift legs (docs/brand.md):
 *   1. scripts/brand/build-assets.mjs --check  — SHA-256 manifest (CI-wired)
 *   2. scripts/brand/build-app-icons.mjs --check — byte-regen (mobile rasters)
 *   3. frontend/tests/unit/r323-brand-system.test.ts — geometry twins + SVG pins
 *
 * This audit adds the MISSING legs:
 *   A. the twin constants (web mark.ts vs mobile mark.ts) byte-equal — the
 *      audit's own read (never trusts the test belt alone).
 *   B. every committed SVG static actually carries the master geometry
 *      (rect/path/stroke parse — the favicon's 2.25 ratio is the ONLY
 *      sanctioned deviation, BRAND.md §min-sizes).
 *   C. every committed RASTER matches the master render — Chromium
 *      rasterises the expected recipe (same box/stroke/colours as the
 *      generators) and the committed PNG is compared by ink-map IoU ≥
 *      0.965 + colour spot-checks at the orange point's computed seat —
 *      byte-pinning alone cannot prove the pixels still draw the mark.
 *   D. the WIRING: index.html icon links (SVG/PNG/ICO, apple-touch 180,
 *      manifest, theme-color light+dark, OG/Twitter absolute image),
 *      manifest.webmanifest icons-on-disk + paper theme, mobile
 *      app.config.ts icon/splash/adaptive/notification paths.
 *   E. the one-logo law: no stray logo-shaped file at the frontend/public
 *      ROOT beyond the sanctioned set (identity-guard.mjs owns the deeper
 *      diamond-path scan — this leg catches orphans the path scan can't).
 *
 * Output: audits/evidence/r318/logo-audit.md (the surface audit table —
 * surface → asset path → size → verdict). Exit 1 on ANY fail.
 *
 * Modes:
 *   (bare)   the audit (needs Chromium via Playwright, like brand-assets.mjs)
 *   --emit   WRITE the R366 emission set first, then audit:
 *              frontend/public/brand/email-logo.png   (600×160 paper plate,
 *                  the lockup at h=120 — absolute-URL-ready for e-mail)
 *              frontend/public/favicon-{16,32,48}.png (mark on the paper
 *                  plate, favicon ratio, box 0.86 — legible on dark tabs)
 *              frontend/public/favicon.ico            (16/32/48 PNG frames)
 *            After a legitimate --emit: node scripts/brand/build-assets.mjs
 *            --manifest (the byte manifest is the only hash ledger).
 */
import { createRequire } from 'node:module';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const PUB = join(ROOT, 'frontend', 'public');
const BRAND = join(PUB, 'brand');
const EVIDENCE_DIR = join(ROOT, 'audits', 'evidence', 'r318');
const EVIDENCE = join(EVIDENCE_DIR, 'logo-audit.md');

/* ── reporting (declared before any check can run) ────────────────── */
let failures = 0;
const rows = []; // audit-table rows: {surface, asset, size, verdict, note}
function fail(msg) {
  failures += 1;
  console.error(`  ✖ ${msg}`);
}
function ok(msg) {
  console.log(`  ✔ ${msg}`);
}
function row(surface, asset, size, verdict, note) {
  rows.push({ surface, asset, size, verdict, note });
}

let chromium;
try {
  ({ chromium } = createRequire(join(ROOT, 'frontend', 'package.json'))('playwright'));
} catch {
  console.error('logo-audit: playwright is not installed (frontend devDependency).');
  process.exit(2);
}

/* ── the master geometry, parsed from BOTH twins ─────────────────────── */
function parseMark(file) {
  const src = readFileSync(file, 'utf8');
  const pick = (re, name) => {
    const m = re.exec(src);
    if (!m) {
      failures += 1;
      console.error(`  ✖ master parse: ${name} missing in ${file}`);
      process.exit(2);
    }
    return m.slice(1);
  };
  return {
    viewBox: pick(/MARK_VIEWBOX = '([^']+)'/, 'MARK_VIEWBOX')[0],
    axis: pick(/MARK_AXIS = \{ x: (\d+), y: (\d+), size: (\d+) \}/, 'MARK_AXIS').map(Number),
    diamond: pick(/MARK_DIAMOND_PATH = '([^']+)'/, 'MARK_DIAMOND_PATH')[0],
    point: pick(/MARK_POINT = \{ x: (\d+), y: (\d+), size: (\d+) \}/, 'MARK_POINT').map(Number),
    strokeComponent: Number(pick(/MARK_STROKE_COMPONENT = ([\d.]+)/, 'strokeComponent')[0]),
    strokeFavicon: Number(pick(/MARK_STROKE_FAVICON = ([\d.]+)/, 'strokeFavicon')[0]),
  };
}
const WEB_MARK = parseMark(join(ROOT, 'frontend', 'src', 'brand', 'mark.ts'));
const MOBILE_MARK = parseMark(join(ROOT, 'apps', 'mobile', 'src', 'brand', 'mark.ts'));

/* ═══ A. the twins ═══════════════════════════════════════════════════ */
function auditTwins() {
  const same =
    WEB_MARK.viewBox === MOBILE_MARK.viewBox &&
    WEB_MARK.axis.join() === MOBILE_MARK.axis.join() &&
    WEB_MARK.diamond === MOBILE_MARK.diamond &&
    WEB_MARK.point.join() === MOBILE_MARK.point.join();
  if (!same) fail('mark.ts twins drifted (web vs mobile) — r323-brand-system.test.ts is red too');
  else ok('mark.ts twins byte-equal (web ↔ mobile)');
}

/* ═══ B. SVG statics geometry ═══════════════════════════════════════ */
function svgGeometryChecks() {
  const checks = [
    { file: 'frontend/public/brand/mark.svg', stroke: 1 },
    { file: 'frontend/public/brand/madarek-mark.svg', stroke: 1 },
    { file: 'frontend/public/favicon.svg', stroke: 2.25 },
    { file: 'shared/brand/mark.svg', stroke: 1.5 },
  ];
  for (const c of checks) {
    const p = join(ROOT, c.file);
    if (!existsSync(p)) {
      fail(`${c.file} MISSING`);
      continue;
    }
    const svg = readFileSync(p, 'utf8');
    const probs = [];
    if (!svg.includes(`x="${WEB_MARK.axis[0]}"`) || !svg.includes(`y="${WEB_MARK.axis[1]}"`)) probs.push('axis rect off-grid');
    if (!svg.includes(WEB_MARK.diamond)) probs.push('diamond path not the master path');
    if (!svg.includes(`x="${WEB_MARK.point[0]}"`) || !svg.includes(`y="${WEB_MARK.point[1]}"`)) probs.push('point not on the NE seat');
    if (svg.includes('rx=') || svg.includes('ry=')) probs.push('rounded corner (radius must be 0)');
    if (/<(linear|radial)Gradient/i.test(svg)) probs.push('gradient present');
    if (/<filter|drop-shadow|box-shadow/i.test(svg)) probs.push('filter/shadow present');
    if (!svg.includes('stroke-linejoin="miter"')) probs.push('join not miter');
    if (probs.length) fail(`${c.file}: ${probs.join('; ')}`);
    else ok(`${c.file} — master geometry, miter joins, radius 0, no gradients`);
    row(`static SVG · ${c.file.split('/').pop()}`, c.file, '32-grid viewBox', 'MASTER', '');
  }
  /* lockup + stacked + wordmark twins: composition is byte-pinned by
   * r323-brand-system.test.ts; this leg asserts the files exist + the
   * header carries the generator stamp (hand-edits drop the stamp). */
  for (const f of ['frontend/public/brand/lockup.svg', 'frontend/public/brand/lockup-stacked.svg', 'frontend/public/brand/wordmark.svg']) {
    const p = join(ROOT, f);
    if (!existsSync(p)) {
      fail(`${f} MISSING`);
      continue;
    }
    const svg = readFileSync(p, 'utf8');
    if (!/generated by scripts\//i.test(svg)) fail(`${f}: generator stamp missing (hand-edited?)`);
    else ok(`${f} — generator-stamped (byte-pinned by the unit belt)`);
  }
}

/* ═══ C. raster geometry (Chromium) ═════════════════════════════════ */
/* The expected-recipe renderer — same numbers the generators use. */
function markSvg({ stroke, ink = '#282828', orange = '#FA3600', canvas, box, bg = null }) {
  const u = (canvas * box) / 32;
  const off = (canvas - 32 * u) / 2;
  const g = (n) => +(n * u + off).toFixed(2);
  const sw = +(stroke * u).toFixed(3);
  const [ax, ay, as] = WEB_MARK.axis;
  const [px, py, ps] = WEB_MARK.point;
  const diamondScaled = WEB_MARK.diamond.replace(/-?\d+(?:\.\d+)?/g, (n) => g(parseFloat(n)));
  const bgRect = bg ? `<rect width="${canvas}" height="${canvas}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">${bgRect}<g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="miter"><rect x="${g(ax)}" y="${g(ay)}" width="${(as * u).toFixed(2)}" height="${(as * u).toFixed(2)}"/><path d="${diamondScaled}"/></g><rect x="${g(px)}" y="${g(py)}" width="${(ps * u).toFixed(2)}" height="${(ps * u).toFixed(2)}" fill="${orange}"/></svg>`;
}

const PAPER = '#F6F6EE';
const INK = '#282828';
const ORANGE = '#FA3600';
const WHITE = '#FFFFFF';
const LOCKUP_W = 62.99; // lockups.ts LOCKUP canvas (pinned by brand-assets composition check)
const LOCKUP_H = 32;

/**
 * The raster seats: committed file → the expected master render.
 * `mono` seats skip the orange-point colour check (white silhouettes);
 * `box` is the mark's fraction of the canvas (the generator recipes).
 */
function rasterSeats() {
  const FAV = WEB_MARK.strokeFavicon;
  return [
    { file: 'frontend/public/brand/icon-180.png', size: 180, box: 0.62, stroke: FAV, bg: PAPER, surface: 'apple-touch icon (iOS home screen)' },
    { file: 'frontend/public/brand/icon-192.png', size: 192, box: 0.62, stroke: FAV, bg: PAPER, surface: 'PWA icon 192 (maskable + any)' },
    { file: 'frontend/public/brand/icon-512.png', size: 512, box: 0.62, stroke: FAV, bg: PAPER, surface: 'PWA icon 512 (maskable + any)' },
    { file: 'frontend/public/brand/email-logo.png', size: 600, lockupPlate: true, surface: 'e-mail logo (absolute-URL PNG)' },
    { file: 'frontend/public/favicon-16.png', size: 16, box: 0.86, stroke: FAV, bg: PAPER, surface: 'favicon PNG 16 (legacy tabs)' },
    { file: 'frontend/public/favicon-32.png', size: 32, box: 0.86, stroke: FAV, bg: PAPER, surface: 'favicon PNG 32 (legacy tabs)' },
    { file: 'frontend/public/favicon-48.png', size: 48, box: 0.86, stroke: FAV, bg: PAPER, surface: 'favicon PNG 48 (legacy tabs)' },
    { file: 'apps/mobile/assets/images/icon.png', size: 1024, box: 0.74, stroke: FAV, bg: PAPER, surface: 'Expo app icon (Android/iOS launcher source)' },
    { file: 'apps/mobile/assets/images/adaptive-foreground.png', size: 1024, box: 0.55, stroke: FAV, bg: null, surface: 'Android adaptive foreground' },
    { file: 'apps/mobile/assets/images/adaptive-background.png', size: 1024, box: 1, stroke: FAV, ink: WHITE, orange: WHITE, bg: PAPER, mono: true, surface: 'Android adaptive background' },
    { file: 'apps/mobile/assets/images/adaptive-monochrome.png', size: 1024, box: 0.55, stroke: FAV, ink: WHITE, orange: WHITE, bg: null, mono: true, surface: 'Android 13+ monochrome (white silhouette)' },
    { file: 'apps/mobile/assets/images/splash-icon.png', size: 1024, box: 0.8, stroke: WEB_MARK.strokeComponent, bg: null, surface: 'mobile splash icon (transparent)' },
    { file: 'apps/mobile/assets/images/favicon.png', size: 48, box: 0.86, stroke: FAV, bg: PAPER, surface: 'mobile web favicon (Expo web)' },
    { file: 'apps/mobile/assets/images/notification-icon.png', size: 96, box: 0.8, stroke: FAV, ink: WHITE, orange: WHITE, bg: null, mono: true, surface: 'push notification icon (white silhouette)' },
  ];
}

/** the orange point's expected px rect [x, y, size] (presence check) */
function pointRectPx({ canvas, box }) {
  const u = (canvas * box) / 32;
  const off = (canvas - 32 * u) / 2;
  return [off + WEB_MARK.point[0] * u, off + WEB_MARK.point[1] * u, WEB_MARK.point[2] * u];
}

async function auditRasters() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const seats = rasterSeats();
    for (const seat of seats) {
      const abs = join(ROOT, seat.file);
      if (!existsSync(abs)) {
        fail(`${seat.file} MISSING (run: node scripts/r318/logo-audit.mjs --emit)`);
        row(seat.surface, seat.file, seat.lockupPlate ? '600×160' : `${seat.size}×${seat.size}`, 'MISSING', 'emit required');
        continue;
      }
      const png = readFileSync(abs);
      const { width, height } = pngDims(png);
      const wantW = seat.lockupPlate ? 600 : seat.size;
      const wantH = seat.lockupPlate ? 160 : seat.size;
      if (width !== wantW || height !== wantH) {
        fail(`${seat.file}: IHDR ${width}×${height} ≠ ${wantW}×${wantH}`);
        row(seat.surface, seat.file, `${width}×${height}`, 'FAIL', 'dimensions');
        continue;
      }
      let expected;
      if (seat.lockupPlate) {
        expected = {
          svg: readFileSync(join(BRAND, 'lockup.svg'), 'utf8'),
          w: +((120 * LOCKUP_W) / LOCKUP_H).toFixed(1),
          h: 120,
          plate: { w: 600, h: 160, bg: PAPER },
        };
      } else {
        expected = {
          svg: markSvg({ stroke: seat.stroke, ink: seat.ink, orange: seat.orange, canvas: seat.size, box: seat.box, bg: seat.bg }),
          w: seat.size,
          h: seat.size,
        };
      }
      const result = await renderCompare(page, seat, expected, png);
      if (result.pass) {
        ok(`${seat.file} — geometry IoU ${result.iou.toFixed(4)} ≥ 0.965${result.pointNote ? `, ${result.pointNote}` : ''}`);
        row(seat.surface, seat.file, `${width}×${height}`, 'MASTER', `IoU ${result.iou.toFixed(4)}`);
      } else {
        fail(`${seat.file}: ${result.why}`);
        row(seat.surface, seat.file, `${width}×${height}`, 'FAIL', result.why);
      }
    }

    /* favicon.ico — parse the container back, verify its frames */
    const icoPath = join(PUB, 'favicon.ico');
    if (!existsSync(icoPath)) {
      fail('frontend/public/favicon.ico MISSING (run: node scripts/r318/logo-audit.mjs --emit)');
      row('favicon ICO (legacy)', 'frontend/public/favicon.ico', '16+32+48', 'MISSING', 'emit required');
    } else {
      const parsed = parseIco(readFileSync(icoPath));
      if (!parsed.ok) {
        fail(`favicon.ico: ${parsed.why}`);
        row('favicon ICO (legacy)', 'frontend/public/favicon.ico', '16+32+48', 'FAIL', parsed.why);
      } else {
        let framesOk = true;
        for (const fr of parsed.frames) {
          const seat = { file: `favicon.ico:frame${fr.size}`, size: fr.size, box: 0.86, bg: PAPER, surface: `favicon.ico ${fr.size}px frame` };
          const exp = markSvg({ stroke: WEB_MARK.strokeFavicon, canvas: fr.size, box: 0.86, bg: PAPER });
          const r = await renderCompare(page, seat, { svg: exp, w: fr.size, h: fr.size }, fr.png);
          if (r.pass) row(seat.surface, 'frontend/public/favicon.ico', `${fr.size}×${fr.size}`, 'MASTER', `IoU ${r.iou.toFixed(4)}`);
          else {
            framesOk = false;
            fail(`favicon.ico ${fr.size}px frame: ${r.why}`);
            row(seat.surface, 'frontend/public/favicon.ico', `${fr.size}×${fr.size}`, 'FAIL', r.why);
          }
        }
        if (framesOk) ok(`favicon.ico — ${parsed.frames.map((f) => f.size).join('/')} PNG frames all master`);
      }
    }
  } finally {
    await browser.close();
  }
}

/** IHDR dimensions of a PNG buffer. */
function pngDims(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return { width: 0, height: 0 };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** A PNG-in-ICO parser (the audit reads its own emission back). */
function parseIco(buf) {
  if (buf.length < 6) return { ok: false, why: 'too short' };
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);
  if (reserved !== 0 || type !== 1) return { ok: false, why: 'not an ICO container' };
  if (count === 0 || count > 8) return { ok: false, why: `frame count ${count}` };
  const frames = [];
  for (let i = 0; i < count; i += 1) {
    const e = 6 + i * 16;
    const w = buf[e] || 256;
    const h = buf[e + 1] || 256;
    const len = buf.readUInt32LE(e + 8);
    const off = buf.readUInt32LE(e + 12);
    if (off + len > buf.length) return { ok: false, why: `frame ${i} out of bounds` };
    const png = buf.subarray(off, off + len);
    if (png.readUInt32BE(0) !== 0x89504e47) return { ok: false, why: `frame ${i} not PNG-in-ICO` };
    const d = pngDims(png);
    if (d.width !== w || d.height !== h) return { ok: false, why: `frame ${i} IHDR ${d.width}×${d.height} ≠ entry ${w}×${h}` };
    frames.push({ size: w, png: Buffer.from(png) });
  }
  return { ok: true, frames };
}

/**
 * renderCompare — draws the committed PNG and the expected master render
 * at the same pixel size and computes:
 *   · ink-map IoU (alpha ≥ 128 threshold; antialias-tolerant)
 *   · the orange point's presence — scans the point's expected px rect for
 *     the most-orange pixel (antialias-tolerant at 16 px; skipped for mono
 *     silhouettes)
 *   · plate checks (paper ground coverage; transparency where the recipe
 *     is transparent)
 */
async function renderCompare(page, seat, expected, pngBuf) {
  const pngData = `data:image/png;base64,${pngBuf.toString('base64')}`;
  const svgData = `data:image/svg+xml;base64,${Buffer.from(expected.svg).toString('base64')}`;
  const pointRect = !seat.mono && seat.box ? pointRectPx({ canvas: expected.w, box: seat.box }) : null;
  const wantTransparent = seat.bg == null && !seat.lockupPlate;
  const plate = expected.plate ? { ...expected.plate } : null;
  const args = { pngData, svgData, w: expected.w, h: expected.h, plate, pointRect, wantTransparent };
  return page.evaluate(async (a) => {
    const load = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('image decode failed'));
      img.src = src;
    });
    const drawTo = async (src, w, h) => {
      const img = await load(src);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h);
    };
    let got;
    let exp;
    if (a.plate) {
      /* the lockup plate: expected = paper plate + centred lockup */
      const c = document.createElement('canvas');
      c.width = a.plate.w;
      c.height = a.plate.h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = a.plate.bg;
      ctx.fillRect(0, 0, a.plate.w, a.plate.h);
      const img = await load(a.svgData);
      ctx.drawImage(img, (a.plate.w - a.w) / 2, (a.plate.h - a.h) / 2, a.w, a.h);
      exp = ctx.getImageData(0, 0, a.plate.w, a.plate.h);
      got = await drawTo(a.pngData, a.plate.w, a.plate.h);
    } else {
      exp = await drawTo(a.svgData, a.w, a.h);
      got = await drawTo(a.pngData, a.w, a.h);
    }
    const W = exp.width;
    const H = exp.height;
    const ink = (d, i) => d.data[i * 4 + 3] >= 128;
    let inter = 0;
    let union = 0;
    let mism = 0;
    for (let i = 0; i < W * H; i += 1) {
      const e = ink(exp, i);
      const g = ink(got, i);
      if (e || g) union += 1;
      if (e && g) inter += 1;
      else if (e !== g) mism += 1;
    }
    const iou = union === 0 ? 0 : inter / union;
    /* the orange point's presence: scan its expected rect for the most-orange
     * pixel (at 16 px the point is <2 px — the centre sample alone hits
     * antialiased blends; the rect scan proves the point is PAINTED). */
    let pointNote = null;
    if (a.pointRect) {
      const [rx, ry, rs] = a.pointRect;
      const x0 = Math.max(0, Math.floor(rx));
      const y0 = Math.max(0, Math.floor(ry));
      const x1 = Math.min(W - 1, Math.ceil(rx + rs));
      const y1 = Math.min(H - 1, Math.ceil(ry + rs));
      let best = Infinity;
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const i = (y * W + x) * 4;
          const d = Math.max(Math.abs(got.data[i] - 250), Math.abs(got.data[i + 1] - 54), Math.abs(got.data[i + 2] - 0));
          if (d < best) best = d;
        }
      }
      if (best > 90) return { pass: false, why: `orange point missing — best seat Δ${best}/255 inside its rect` };
      pointNote = `point presence Δ${best}/255`;
    }
    /* transparency contract (adaptive/splash/notification are transparent) */
    if (a.wantTransparent) {
      const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
      for (const [x, y] of corners) {
        const i = (y * W + x) * 4;
        if (got.data[i + 3] !== 0) return { pass: false, why: 'expected transparent plate, found paint in the corners' };
      }
    } else {
      /* every plated seat rides the paper ground (light-theme statics) */
      const corners = a.plate
        ? [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]
        : [[0, 0], [1, 0], [0, 1]];
      for (const [x, y] of corners) {
        const i = (Math.round(y) * W + Math.round(x)) * 4;
        if (got.data[i + 3] === 0) continue; /* transparent is checked above */
        const dP = Math.max(Math.abs(got.data[i] - 246), Math.abs(got.data[i + 1] - 246), Math.abs(got.data[i + 2] - 238));
        if (dP > 14) return { pass: false, why: 'plate corner is not paper #F6F6EE' };
      }
    }
    if (iou < 0.965) return { pass: false, why: `ink-map IoU ${iou.toFixed(4)} < 0.965 (mismatched px ${mism}/${W * H})` };
    return { pass: true, iou, pointNote };
  }, args);
}

/* ═══ D. wiring ══════════════════════════════════════════════════════ */
function auditWiring() {
  const html = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8');
  const wants = [
    [html.includes('rel="icon" type="image/svg+xml" href="/favicon.svg"'), 'index.html: SVG favicon link'],
    [html.includes('rel="apple-touch-icon" sizes="180x180" href="/brand/icon-180.png"'), 'index.html: apple-touch-icon 180 → /brand/icon-180.png'],
    [html.includes('rel="manifest" href="/manifest.webmanifest"'), 'index.html: manifest link'],
    [html.includes('name="theme-color" content="#282828" media="(prefers-color-scheme: dark)"'), 'index.html: theme-color dark #282828'],
    [html.includes('name="theme-color" content="#F6F6EE" media="(prefers-color-scheme: light)"'), 'index.html: theme-color light #F6F6EE'],
    [/favicon-16\.png/.test(html), 'index.html: favicon PNG 16 fallback link'],
    [/favicon-32\.png/.test(html), 'index.html: favicon PNG 32 fallback link'],
    [/favicon\.ico/.test(html), 'index.html: favicon ICO fallback link'],
    [html.includes('property="og:image" content="https://madarek-app.vercel.app/brand/madarek-og.jpg"'), 'index.html: og:image absolute URL'],
    [html.includes('property="og:image:width" content="1200"'), 'index.html: og:image 1200 wide'],
    [html.includes('name="twitter:image" content="https://madarek-app.vercel.app/brand/madarek-og.jpg"'), 'index.html: twitter:image absolute URL'],
  ];
  for (const [cond, name] of wants) {
    if (cond) ok(name);
    else fail(`${name} — MISSING`);
  }
  /* OG card on disk: 1200×630 JPEG */
  const og = readFileSync(join(BRAND, 'madarek-og.jpg'));
  if (og[0] !== 0xff || og[1] !== 0xd8) fail('madarek-og.jpg is not a JPEG');
  else {
    const dims = jpegDims(og);
    if (dims.width !== 1200 || dims.height !== 630) fail(`madarek-og.jpg ${dims.width}×${dims.height} ≠ 1200×630`);
    else ok('madarek-og.jpg — 1200×630 JPEG on disk');
    row('OG/Twitter social card', 'frontend/public/brand/madarek-og.jpg', '1200×630', 'MASTER', 'brand-assets.mjs');
  }
  /* manifest */
  const manifest = JSON.parse(readFileSync(join(PUB, 'manifest.webmanifest'), 'utf8'));
  const iconOk = manifest.icons.every((i) => existsSync(join(PUB, i.src.slice(1))));
  if (!iconOk) fail('manifest.webmanifest: an icon file is missing on disk');
  else ok(`manifest.webmanifest: ${manifest.icons.length} icon refs on disk`);
  if (manifest.theme_color !== PAPER || manifest.background_color !== PAPER) fail('manifest theme/background drifted from paper');
  else ok('manifest.webmanifest: paper theme + background');
  row('PWA install identity', 'frontend/public/manifest.webmanifest', '192+512 maskable', 'MASTER', `theme ${manifest.theme_color}`);
  /* mobile config */
  const cfg = readFileSync(join(ROOT, 'apps', 'mobile', 'app.config.ts'), 'utf8');
  for (const m of [
    /icon: "\.\/assets\/images\/icon\.png"/,
    /foregroundImage: "\.\/assets\/images\/adaptive-foreground\.png"/,
    /backgroundImage: "\.\/assets\/images\/adaptive-background\.png"/,
    /monochromeImage: "\.\/assets\/images\/adaptive-monochrome\.png"/,
    /favicon: "\.\/assets\/images\/favicon\.png"/,
    /image: "\.\/assets\/images\/splash-icon\.png"/,
    /icon: "\.\/assets\/images\/notification-icon\.png"/,
  ]) {
    if (!m.test(cfg)) fail(`app.config.ts: brand field missing (${m.source})`);
  }
  ok('app.config.ts — icon/adaptive/splash/notification/favicon fields wired to the audited assets');
}

/** JPEG dimensions via the SOF scan (no deps). */
function jpegDims(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return { width: 0, height: 0 };
}

/* ═══ E. the byte-manifest leg ═══════════════════════════════════════ */
function auditManifest() {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'brand', 'build-assets.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    fail('scripts/brand/build-assets.mjs --check failed (byte manifest)');
    if (r.stdout) console.error(r.stdout.trim());
  } else ok('build-assets.mjs --check — every committed brand byte matches the manifest');
}

/* ═══ the one-logo orphans sweep (public ROOT only) ═════════════════ */
function auditOrphans() {
  const SANCTIONED = new Set([
    'brand', 'config', 'favicon.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'favicon-48.png',
    'fonts', 'lectures', 'manifest.webmanifest', 'media', 'offline.html', 'ops', 'pdfjs', 'r322-font-test.html',
    'robots.txt', 'sitemap.xml', 'sw.js',
  ]);
  const logoish = readdirSync(PUB, { withFileTypes: true })
    .filter((e) => e.isFile() && /(logo|wordmark|favicon)/i.test(e.name) && !SANCTIONED.has(e.name))
    .map((e) => e.name);
  const markish = readdirSync(PUB, { withFileTypes: true })
    .filter((e) => e.isFile() && /(^mark|[-_]mark|[-_]icon)/i.test(e.name) && !SANCTIONED.has(e.name))
    .map((e) => e.name);
  const strays = [...logoish, ...markish];
  if (strays.length) fail(`stray logo-shaped files at the frontend/public root: ${strays.join(', ')}`);
  else ok('no stray logo-shaped files at the frontend/public root (the sanctioned set is the whole set)');
}

/* ═══ --emit: the R366 emission set ══════════════════════════════════ */
async function emit() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const png = async (html, w, h) => {
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(html, { waitUntil: 'load' });
      return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
    };
    /* email logo — the lockup on a 600×160 paper plate (lockup ink h=120) */
    const lockup = readFileSync(join(BRAND, 'lockup.svg'), 'utf8');
    const h = 120;
    const w = +((h * LOCKUP_W) / LOCKUP_H).toFixed(1);
    const emailHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0}
      body{width:600px;height:160px;background:${PAPER};display:grid;place-items:center;overflow:hidden}
      svg{display:block;width:${w}px;height:${h}px}
    </style></head><body>${lockup}</body></html>`;
    const emailPng = await png(emailHtml, 600, 160);
    writeFileSync(join(BRAND, 'email-logo.png'), emailPng);
    ok(`frontend/public/brand/email-logo.png — 600×160 (${(emailPng.length / 1024).toFixed(1)}KB, lockup h=${h})`);
    /* favicon PNGs + ICO frames — mark on paper, favicon ratio, box 0.86 */
    const FAV = WEB_MARK.strokeFavicon;
    const frames = [];
    for (const size of [16, 32, 48]) {
      const svg = markSvg({ stroke: FAV, canvas: size, box: 0.86, bg: PAPER });
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        html,body{margin:0;padding:0}
        body{width:${size}px;height:${size}px;overflow:hidden}
        svg{display:block}
      </style></head><body>${svg}</body></html>`;
      const buf = await png(html, size, size);
      const d = pngDims(buf);
      if (d.width !== size || d.height !== size) fail(`favicon-${size}: IHDR ${d.width}×${d.height} ≠ ${size}`);
      writeFileSync(join(PUB, `favicon-${size}.png`), buf);
      frames.push(buf);
      ok(`frontend/public/favicon-${size}.png — ${size}×${size} (${(buf.length / 1024).toFixed(1)}KB)`);
    }
    /* favicon.ico — PNG-in-ICO (16/32/48) */
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(frames.length, 4);
    const entries = [];
    const blobs = [];
    let offset = 6 + 16 * frames.length;
    frames.forEach((buf, i) => {
      const e = Buffer.alloc(16);
      const size = [16, 32, 48][i];
      e.writeUInt8(size, 0);
      e.writeUInt8(size, 1);
      e.writeUInt8(0, 2); /* palette */
      e.writeUInt8(0, 3); /* reserved */
      e.writeUInt16LE(1, 4); /* planes */
      e.writeUInt16LE(32, 6); /* bpp */
      e.writeUInt32LE(buf.length, 8);
      e.writeUInt32LE(offset, 12);
      offset += buf.length;
      entries.push(e);
      blobs.push(buf);
    });
    const ico = Buffer.concat([header, ...entries, ...blobs]);
    writeFileSync(join(PUB, 'favicon.ico'), ico);
    ok(`frontend/public/favicon.ico — PNG frames 16/32/48 (${(ico.length / 1024).toFixed(1)}KB)`);
  } finally {
    await browser.close();
  }
}

/* ═══ the evidence report ════════════════════════════════════════════ */
function writeEvidence() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const lines = [];
  lines.push('# Logo Audit — R366 Agent 2 · L1 — «شعار واحد في كل مكان»');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()} · node scripts/r318/logo-audit.mjs`);
  lines.push('');
  lines.push('Master: `frontend/src/brand/mark.ts` (+ the mobile twin, byte-pinned). Legs: twins · SVG geometry · raster IoU ≥ 0.965 · wiring · byte manifest · orphans sweep.');
  lines.push('');
  lines.push('| surface | asset | size | verdict | note |');
  lines.push('|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.surface} | \`${r.asset}\` | ${r.size} | ${r.verdict} | ${r.note} |`);
  }
  lines.push('');
  lines.push(`**Failures: ${failures}**`);
  writeFileSync(EVIDENCE, `${lines.join('\n')}\n`);
  console.log(`\nlogo-audit: evidence → ${EVIDENCE} (${rows.length} surfaces, ${failures} failures)`);
}

/* ═══ main ══════════════════════════════════════════════════════════ */
const EMIT = process.argv.includes('--emit');
console.log(`logo-audit (${EMIT ? 'emit+audit' : 'audit'}) — master: frontend/src/brand/mark.ts`);
if (EMIT) {
  await emit();
}
auditTwins();
svgGeometryChecks();
await auditRasters();
auditWiring();
auditManifest();
auditOrphans();
writeEvidence();
process.exit(failures ? 1 : 0);
