/**
 * r368 T0 — the fidelity evidence instrument (E / T / Q), rebuilt on a valid
 * capture contract. One script, three independently reported dimensions.
 *
 * WHY THE REBUILD. The audit's root causes #1/#2 were that the previous
 * instrument's manifest SAID "section root top at viewport top" while its own
 * capture.json recorded roots 8–670 px away, full-viewport crops carried
 * outside-section content, and T=100 % counted files. The law that closes it
 * lives in pairs.mjs (pure, fixture-tested); this file only obeys it:
 *
 *   · LOCAL landing uses the documented probe seam `window.__mdrkLenis`
 *     (frontend/src/lib/motion/sheetLenis.ts R328 H7 — "a read-only handle so
 *     probes can seat the scroll EXACTLY"). The previous run asked for
 *     `window.__lenis`, which does not exist: every native fallback scroll
 *     raced the live engine and snapped back — that, not the product, is why
 *     the CTA row sat 670 px off. The native fallback stays for the no-engine
 *     (reduced-motion) path.
 *   · Named states (see STATES): entry / mid30 / mid60 / exit, plus END for
 *     pairs the reference cannot bring to the viewport top (its stage ends
 *     first — the footer's contentTop 11651 > maxOffset 11462 at 1440, so
 *     the pair state is END on BOTH sides, symmetric by definition). Fixed
 *     chrome declares its measured resting top and never wheels.
 *   · The reference is a translated stage: scrollHeight equals the
 *     viewport, window.scrollY stays 0, and a wheel of Δ moves the stage
 *     exactly Δ px (600 px per step, measured twice — the r368 exec run and
 *     the T0 probe). The census walks the whole stage once, records each
 *     section's content top, the stage maximum and the live trigger pairing;
 *     capture pass 2 seats the stage at each declared offset with coarse
 *     600 px wheels plus corrective residuals, and records the achieved
 *     offset. Nothing is inferred from the bundle.
 *   · The crop is the section box ∩ viewport at the named state — never a
 *     full viewport with downstream content ("chrome" no longer includes the
 *     hero; short sections no longer include their neighbours).
 *   · The reference consent bar (~50 px, will not dismiss in headless) loses
 *     the same bottom band from BOTH crops of a pair whose crop reaches the
 *     viewport bottom; the cut is recorded per row.
 *   · Q keeps the verified-only rule: settle is measured and scored; the
 *     trigger family is recorded as a paired BASELINE (the LIVE reference
 *     trigger table from the audit's own five-width inventory, paired to
 *     sections by class token and normalised by the census geometry, plus
 *     our measured onsets) and is never counted as a pass — Task 1 tunes
 *     against it.
 *
 * Usage:
 *   node scripts/conformance/fidelity.mjs --local http://localhost:5300 \
 *        --reference https://heronaiapp.com/ --out docs/audit/evidence
 *   node scripts/conformance/fidelity.mjs --score-only            # rescore stored crops
 *   node scripts/conformance/fidelity.mjs --repeat-entry          # entry pairs twice → E variance
 *   node scripts/conformance/fidelity.mjs --sections home-hero-wrap --bps 1440
 * Browser build note: this host's Playwright expects a build the cache does
 * not carry; the documented fallback applies —
 *   PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers (symlinked to chromium-1200).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LANDING_TOL_PX, validatePair, validatePositionPair, manifestRejections,
  positionTarget, aggregateT, bothSidesReason,
} from "./pairs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SPEC_DIR = join(ROOT, "docs", "redesign", "r335", "heron-spec");
const LIVE_INVENTORY = join(ROOT, "docs", "audit", "evidence", "heron-motion-inventory-live.json");
const requireFrontend = createRequire(join(ROOT, "frontend", "package.json"));
const { chromium } = requireFrontend("playwright");
const { PNG } = requireFrontend("pngjs");
const pixelmatchMod = requireFrontend("pixelmatch"); // v8 is ESM: require() hands back the namespace
const pixelmatch = pixelmatchMod.default ?? pixelmatchMod;

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const flag = (n) => process.argv.includes(`--${n}`);

const OUT = join(ROOT, arg("out", "docs/audit/evidence"));
const LOCAL_URL = arg("local", "http://localhost:5300/");
const REFERENCE_URL = arg("reference", "https://heronaiapp.com/");
const SCORE_ONLY = flag("score-only");
const REPEAT_ENTRY = flag("repeat-entry");
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
].filter((v) => !arg("bps", null) || arg("bps").split(",").includes(v.name));

const MASK_GROW = 4;
const MASK_SHARE_MAX = 0.55;
// The reference's persistent consent bar overlays its viewport bottom; a crop
// that reaches the bottom loses this band on BOTH sides of the pair (symmetric,
// recorded per row — the previous run cut every crop blindly).
const CHROME_CROP_BOTTOM = 60;
const PRELOADER = '[data-spec="preloader.overlay"]';
// The reference stage moves exactly this many px per wheel step (measured by
// the r368 exec run and re-verified by the T0 probe; see referenceCensus).
const REF_STEP_PX = 600;
// Fixed chrome: captured at rest on both sides; its declared top is its own
// measured resting top, so the same ±2 px law governs it without a case.
const FIXED_SECTIONS = ["chrome"];
// class-token pairing of the live reference trigger table to sections
const TRIGGER_TOKENS = {
  "home-hero-wrap": ["home-hero"],
  "home-intro-wrap": ["home-intro"],
  "home-problem-wrap": ["home-problem"],
  "home-map-wrap": ["home-map"],
  "home-platform-wrap": ["home-platform"],
  "home-why-wrap": ["home-why"],
  "home-usecase-wrap": ["home-usecase"],
  "home-cta-wrap": ["cta-"],
  footer: ["footer"],
  chrome: ["header"],
};

// ── targets: our seat selector ↔ reference section selector (single source:
// scripts/conformance/mapping/*.json) ────────────────────────────────────────
const MAPPING = (() => {
  const acc = { ourSection: {}, heronPageKey: {} };
  for (const f of readdirSync(join(__dirname, "mapping")).filter((f) => f.endsWith(".json")).sort()) {
    const part = JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8"));
    Object.assign(acc.ourSection, part.ourSection ?? {});
    Object.assign(acc.heronPageKey, part.heronPageKey ?? {});
  }
  return acc;
})();
const ALL_KEYS = Object.keys(MAPPING.ourSection);
const KEYS = (arg("sections", null) ? arg("sections").split(",") : ALL_KEYS).filter((k) => MAPPING.ourSection[k]);
const unknown = (arg("sections", null) ? arg("sections").split(",") : []).filter((k) => !MAPPING.ourSection[k]);
if (unknown.length) {
  console.error(`unknown section key(s): ${unknown.join(", ")} — known: ${ALL_KEYS.join(", ")}`);
  process.exit(2);
}

// Named states per section (the audit: "section-entry viewport captures, not
// the requested 6–10 scroll positions"). Deltas are fractions of the SIDE'S
// OWN section height, so both sides are driven by the same definition:
//   entry  the section root top at the viewport top (±2 px);
//   mid30/mid60  0.30/0.60 of the section height past entry;
//   exit   the offset at which the section bottom reaches the viewport bottom
//          (equal to entry when the section is shorter than the viewport —
//          recorded as a duplicate, never re-scored).
// END (the scroller's own maximum) is a pair-level declaration for sections
// the reference cannot seat at the viewport top; it replaces the state list.
const STATES = [
  { id: "entry", delta: (h) => 0 },
  { id: "mid30", delta: (h) => 0.3 * h },
  { id: "mid60", delta: (h) => 0.6 * h },
  { id: "exit", delta: (h, vh) => Math.max(0, h - vh) },
];

// ── images (unchanged math from the r368 exec instrument; deterministic,
// in-process SSIM + pixelmatch second opinion) ───────────────────────────────
function loadPng(path) {
  const png = PNG.sync.read(readFileSync(path));
  const gray = new Float64Array(png.width * png.height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * png.data[p] + 0.587 * png.data[p + 1] + 0.114 * png.data[p + 2];
  }
  return { width: png.width, height: png.height, gray, png };
}

function resample(img, dw, dh) {
  const { width: sw, height: sh, gray } = img;
  const out = new Float64Array(dw * dh);
  const xr = sw / dw;
  const yr = sh / dh;
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * yr);
    const y1 = Math.max(y0 + 1, Math.min(sh, Math.ceil((y + 1) * yr)));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * xr);
      const x1 = Math.max(x0 + 1, Math.min(sw, Math.ceil((x + 1) * xr)));
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { sum += gray[yy * sw + xx]; n++; }
      out[y * dw + x] = sum / n;
    }
  }
  return { width: dw, height: dh, gray: out };
}

function ssim(a, b, masks = [], win = 8) {
  const { width: w, height: h } = a;
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  let sum = 0, scored = 0, masked = 0, total = 0;
  for (let y = 0; y + win <= h; y += win) {
    for (let x = 0; x + win <= w; x += win) {
      total++;
      const cx = x + win / 2;
      const cy = y + win / 2;
      if (masks.some((m) => cx >= m.x && cx <= m.x + m.w && cy >= m.y && cy <= m.y + m.h)) { masked++; continue; }
      let sa = 0, sb = 0;
      for (let yy = 0; yy < win; yy++) for (let xx = 0; xx < win; xx++) { const i = (y + yy) * w + x + xx; sa += a.gray[i]; sb += b.gray[i]; }
      const n = win * win;
      const ma = sa / n, mb = sb / n;
      let va = 0, vb = 0, cov = 0;
      for (let yy = 0; yy < win; yy++) {
        for (let xx = 0; xx < win; xx++) {
          const i = (y + yy) * w + x + xx;
          const da = a.gray[i] - ma, db = b.gray[i] - mb;
          va += da * da; vb += db * db; cov += da * db;
        }
      }
      va /= n; vb /= n; cov /= n;
      sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      scored++;
    }
  }
  return { ssim: scored ? sum / scored : 0, scored, masked, total, maskedShare: total ? masked / total : 0 };
}

function structuralDiff(aPng, bPng, masks) {
  const w = aPng.width, h = aPng.height;
  const paint = (png) => {
    const out = Buffer.from(png.data);
    for (const m of masks) {
      for (let y = Math.max(0, Math.floor(m.y)); y < Math.min(h, Math.ceil(m.y + m.h)); y++) {
        for (let x = Math.max(0, Math.floor(m.x)); x < Math.min(w, Math.ceil(m.x + m.w)); x++) {
          const p = (y * w + x) * 4;
          out[p] = out[p + 1] = out[p + 2] = 255;
        }
      }
    }
    return out;
  };
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(paint(aPng), paint(bPng), diff.data, w, h, { threshold: 0.12, includeAA: false });
  return { ratio: n / (w * h), diff };
}

function cropTop(img, w, h) {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) out.set(img.gray.subarray(y * img.width, y * img.width + w), y * w);
  return { width: w, height: h, gray: out };
}

function colorCrop(srcPath, w, scaledH, h) {
  const src = PNG.sync.read(readFileSync(srcPath));
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / scaledH));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / w));
      const s = (sy * src.width + sx) * 4;
      const d = (y * w + x) * 4;
      out.data[d] = src.data[s]; out.data[d + 1] = src.data[s + 1]; out.data[d + 2] = src.data[s + 2]; out.data[d + 3] = 255;
    }
  }
  return out;
}
const round = (n) => Math.round(n * 10) / 10;
const rel = (p) => p.replace(`${ROOT}/`, "");

// ── masks ───────────────────────────────────────────────────────────────────
// ENTRY states use the FROZEN reference spec's preregistered text rects
// (tc≠none, visible in the frozen viewport — off-screen elements with sr.x
// past the section width used to inflate the basis and displace every mask;
// they are filtered now). Non-entry states have no frozen spec, so their masks
// are the live reference's own text rects recorded AT CAPTURE, before any
// scoring — same law: masks derive from the reference side, never ours, and
// are fixed before the score exists.
const specCache = new Map();
function specFor(key, bp) {
  const id = `${key}.${bp}`;
  if (specCache.has(id)) return specCache.get(id);
  const f = join(SPEC_DIR, `${id}.json`);
  const spec = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  specCache.set(id, spec);
  return spec;
}
function maskFractions(key, bp) {
  const spec = specFor(key, bp);
  if (!spec?.elements?.length) return { masks: [], textElements: 0, basis: `frozen ${key}.${bp}: no spec file` };
  const els = spec.elements;
  const root = els[0]?.sr ?? { x: 0, y: 0, w: 1, h: 1 };
  const boxW = Math.max(1, root.w);
  const boxH = Math.max(1, root.h);
  const vh = Number(VIEWPORTS.find((v) => v.name === bp)?.height ?? 900);
  const cropSpecH = Math.min(boxH, vh);
  const text = els.filter((e) => {
    if (!e.tc || e.tc === "none") return false;
    if (!(e.sr.w > 4 && e.sr.h > 4)) return false;
    if (e.sr.y + e.sr.h <= 0 || e.sr.y >= cropSpecH) return false; // outside the entry window
    const vr = e.vr;
    if (vr && !(vr.x + vr.w > 0 && vr.x < boxW && vr.y + vr.h > 0)) return false; // frozen-capture visibility
    return true;
  });
  const masks = text.map((e) => ({
    x: Math.max(0, e.sr.x - MASK_GROW) / boxW,
    y: Math.max(0, e.sr.y - MASK_GROW) / cropSpecH,
    w: (e.sr.w + MASK_GROW * 2) / boxW,
    h: (e.sr.h + MASK_GROW * 2) / cropSpecH,
    p: e.p,
    tc: e.tc,
  }));
  return { masks, textElements: text.length, basis: `frozen ${key}.${bp} text elements (tc≠none, in-viewport), box ${boxW}×${cropSpecH}` };
}
const toPixels = (fractions, w, h) => fractions.map((m) => ({ x: m.x * w, y: m.y * h, w: m.w * w, h: m.h * h }));

// ── navigation / settle (behaviour carried from the exec instrument) ──────
async function gotoWithRetry(page, url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      return true;
    } catch (e) {
      last = e;
      console.error(`  goto ${url} attempt ${i + 1}/${tries}: ${e.message.split("\n")[0]}`);
      await page.waitForTimeout(2000 * (i + 1));
    }
  }
  throw last;
}

async function settle(page, label) {
  await page.waitForLoadState("load", { timeout: 45000 }).catch(() => {});
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; }).catch(() => {});
  // The local preloader veil unmounts when the intro draw finishes (~6 s);
  // headless loads can stick at 99 % — dismiss it through its own "تخطي"
  // control, the exit a visitor uses. A crop under the veil is not evidence.
  await page.evaluate(async (sel) => {
    const busy = () => !!document.querySelector(sel);
    const t0 = performance.now();
    while (performance.now() - t0 < 15000) {
      if (!busy()) return;
      await new Promise((r) => setTimeout(r, 120));
    }
  }, PRELOADER).catch(() => {});
  const stillUp = await page.evaluate((sel) => !!document.querySelector(sel), PRELOADER).catch(() => false);
  if (stillUp) {
    const skip = page.locator(PRELOADER).getByText("تخطي").first();
    const hasSkip = (await skip.count().catch(() => 0)) > 0;
    if (hasSkip) await skip.click({ timeout: 5000 }).catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1200);
    console.error(`  ${label}: intro overlay dismissed via ${hasSkip ? "its own تخطي control" : "Escape"}`);
  }
  // SPA mount wait (cold vite compile): negotiate heights only on mounted content
  const hasRoot = await page.evaluate(() => !!document.querySelector("#root")).catch(() => false);
  if (hasRoot) {
    for (let i = 0; i < 80; i++) {
      const st = await page.evaluate(() => ({ kids: document.querySelector("#root")?.children.length ?? 0, h: document.documentElement.scrollHeight, vh: window.innerHeight })).catch(() => null);
      if (st && st.kids > 0 && st.h > st.vh * 1.5) break;
      await page.waitForTimeout(250);
    }
  }
  let prev = -1;
  for (let i = 0; i < 40; i++) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => -2);
    if (h === prev && h > 0) break;
    prev = h;
    await page.waitForTimeout(150);
  }
  await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }).catch(() => {});
}

// ── LOCAL landing: the documented seam first, native fallback second ────────
async function localScrollTo(page, y) {
  await page.evaluate((target) => {
    const lenis = window.__mdrkLenis ?? window.__lenis ?? window.lenis; // R328 H7 seam first
    if (lenis && typeof lenis.scrollTo === "function") {
      try { lenis.scrollTo(target, { immediate: true, force: true }); } catch { /* older signature */ }
    }
    window.scrollTo({ top: target, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = target;
    document.body.scrollTop = target;
  }, y).catch(() => {});
  let stable = 0;
  for (let i = 0; i < 40; i++) {
    const sy = await page.evaluate(() => window.scrollY).catch(() => -1);
    if (Math.abs(sy - y) <= LANDING_TOL_PX) { if (++stable >= 3) return { landed: true, scrollY: sy }; }
    else stable = 0;
    await page.waitForTimeout(80);
  }
  const sy = await page.evaluate(() => window.scrollY).catch(() => null);
  return { landed: false, scrollY: sy };
}

const localRect = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) };
}, sel).catch(() => null);

/**
 * Land the LOCAL side's ENTRY state: seat the scroll so the section root's
 * top is at the viewport top (±2 px). Sticky/pinned seats move under the
 * scroll, so the seat is corrected by the observed error until the root is
 * within tolerance or the scroller clamps at its maximum.
 */
async function localLandEntry(page, sel, hintY) {
  const maxScroll = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)).catch(() => null);
  let y = Math.max(0, Math.min(hintY, maxScroll ?? hintY));
  for (let i = 0; i < 5; i++) {
    const pos = await localScrollTo(page, y);
    const rect = await localRect(page, sel);
    if (!rect) return { ok: false, reason: "selector-not-found" };
    if (Math.abs(rect.top) <= LANDING_TOL_PX) return { ok: true, state: "entry", top: rect.top, declaredTop: 0, scrollY: pos.scrollY, maxScroll, rect };
    if (pos.scrollY != null && maxScroll != null && Math.abs(pos.scrollY - maxScroll) <= LANDING_TOL_PX) {
      return { ok: true, state: "end-clamped", top: rect.top, declaredTop: 0, scrollY: pos.scrollY, maxScroll, atStageEnd: true, rect };
    }
    y = (pos.scrollY ?? y) + rect.top; // top>0 → seat further down; top<0 → back up
  }
  const pos = await localScrollTo(page, Math.max(0, Math.min(y, maxScroll ?? y)));
  const rect = await localRect(page, sel);
  if (!rect) return { ok: false, reason: "selector-not-found" };
  const clamped = maxScroll != null && pos.scrollY != null && Math.abs(pos.scrollY - maxScroll) <= LANDING_TOL_PX;
  return clamped
    ? { ok: true, state: "end-clamped", top: rect.top, declaredTop: 0, scrollY: pos.scrollY, maxScroll, atStageEnd: true, rect }
    : { ok: false, reason: `unlanded — root top ${rect.top} px after 5 corrective seats (engine seam + native both refused)` };
}

/** crop rule shared by both sides: the section box ∩ viewport, at the state */
/**
 * Storage policy for the raw crops: the docs/ size gates are law (tracked
 * file ≤500 KB; a push adds ≤5 MB to docs/), and honest entry-state artwork
 * does not compress below them at full width. Stored crops wider than
 * MAX_STORE_W px are halved (repeatedly, deterministically) with a colour
 * box-average; the row records the applied scale, the manifest records the
 * policy, and every score (capture-time and --score-only) runs on the STORED
 * files so the number is reproducible from the committed evidence alone.
 */
const MAX_STORE_W = 480;

function downscaleStored(file) {
  const png = PNG.sync.read(readFileSync(file));
  let w = png.width;
  let scale = 1;
  while (w > MAX_STORE_W) { scale *= 2; w = Math.floor(png.width / scale); }
  if (scale === 1) return { width: png.width, height: png.height, scale: 1 };
  const dw = w;
  const dh = Math.floor(png.height / scale);
  const out = new PNG({ width: dw, height: dh });
  for (let y = 0; y < dh; y++) {
    const sy0 = Math.floor(y * scale);
    const sy1 = Math.min(png.height, Math.floor((y + 1) * scale));
    for (let x = 0; x < dw; x++) {
      const sx0 = Math.floor(x * scale);
      const sx1 = Math.min(png.width, Math.floor((x + 1) * scale));
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const p = (sy * png.width + sx) * 4;
          r += png.data[p]; g += png.data[p + 1]; b += png.data[p + 2]; n++;
        }
      }
      const d = (y * dw + x) * 4;
      out.data[d] = Math.round(r / n); out.data[d + 1] = Math.round(g / n); out.data[d + 2] = Math.round(b / n); out.data[d + 3] = 255;
    }
  }
  writeFileSync(file, PNG.sync.write(out, { deflateLevel: 9 }));
  return { width: dw, height: dh, scale };
}

async function sectionCrop(page, sel, path) {
  const clip = await page.evaluate(({ s, vh }) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(r.top, vh - 1));
    const h = Math.max(0, Math.min(r.bottom, vh) - y);
    if (h < 8 || r.width < 8) return { ok: false, reason: "empty-intersection" };
    // INTEGER dims: the scorer indexes Float64Array rows with w/h — fractional
    // values would read undefined and turn every SSIM into NaN. Playwright
    // clips to integers anyway.
    return {
      ok: true,
      x: Math.round(Math.max(0, r.left)),
      y: Math.round(y),
      w: Math.round(r.width),
      h: Math.round(h),
      touchesBottom: r.bottom >= vh - 5,
    };
  }, { s: sel, vh: page.viewportSize().height }).catch(() => null);
  if (!clip || clip.ok === false) return { ok: false, reason: clip?.reason ?? "clip-eval-failed" };
  await page.waitForTimeout(250);
  try {
    await page.screenshot({ path, clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h }, animations: "disabled", timeout: 45000 });
    const stored = downscaleStored(path);
    return { ok: true, clip: { ...clip, w: stored.width, h: stored.height, captureW: clip.w, captureH: clip.h, storageScale: stored.scale }, file: path };
  } catch (e) {
    return { ok: false, reason: `screenshot-failed: ${e.message.split("\n")[0]}` };
  }
}

/** live reference text rects as preregistered masks, recorded before scoring */
async function liveTextMasks(page, sel, clip) {
  return page.evaluate(({ s, clip, grow }) => {
    const el = document.querySelector(s);
    if (!el) return [];
    const out = [];
    const walk = (node) => {
      for (const child of node.children) {
        const own = [...child.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
        if (own.length > 1) {
          const r = child.getBoundingClientRect();
          const x = r.left - clip.x - grow;
          const y = r.top - clip.y - grow;
          const w = r.width + grow * 2;
          const h = r.height + grow * 2;
          if (r.width > 4 && r.height > 4 && x + w > 0 && x < clip.w && y + h > 0 && y < clip.h) out.push({ x, y, w, h });
        }
        walk(child);
      }
    };
    walk(el);
    return out;
  }, { s: sel, clip, grow: MASK_GROW }).catch(() => []);
}

// ── REFERENCE side: the wheel-driven stage protocol ────────────────────────
const refTops = (page) => page.evaluate((map) => {
  const out = {};
  for (const [k, sel] of Object.entries(map)) {
    const el = document.querySelector(sel);
    out[k] = el ? Math.round(el.getBoundingClientRect().top) : null;
  }
  return out;
}, Object.fromEntries(KEYS.map((k) => [k, MAPPING.heronPageKey[k]]).filter(([, s]) => !!s)));

const refBoxes = (page) => page.evaluate((map) => {
  const out = {};
  for (const [k, sel] of Object.entries(map)) {
    const el = document.querySelector(sel);
    if (el) { const r = el.getBoundingClientRect(); out[k] = { h: Math.round(r.height), w: Math.round(r.width) }; }
  }
  return out;
}, Object.fromEntries(KEYS.map((k) => [k, MAPPING.heronPageKey[k]]).filter(([, s]) => !!s))).catch(() => ({}));

/**
 * Census: wheel the whole stage in 600 px steps, record each section's
 * viewport top per step, stop when nothing moves twice, and derive the stage
 * offset from the hero anchor (the stage is a rigid translate — every
 * scrollable seat moves with it; fixed chrome does not, and is excluded from
 * the anchor logic by being handled at rest). Also reads the live trigger
 * table (the audit's five-width inventory) and pairs its roots to sections by
 * class token, normalised against the census geometry: the recorded trigger
 * `start` values sit at a constant delta from the sections' content tops
 * (e.g. 1337 px at 1440 for every wrap) — the space validation the exec run
 * lacked, recorded in the census report.
 */
async function referenceCensus(page) {
  const steps = [];
  let prev = null;
  let stale = 0;
  for (let s = 0; s < 80; s++) {
    const t = await refTops(page);
    const sig = JSON.stringify(t);
    steps.push({ s, tops: t });
    if (sig === prev) { stale++; if (stale >= 2) break; } else stale = 0;
    prev = sig;
    await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
    await page.mouse.wheel(0, REF_STEP_PX);
    await page.waitForTimeout(420);
  }
  const anchor = "home-hero-wrap";
  const anchor0 = steps[0].tops[anchor];
  if (anchor0 == null) return { error: "anchor (home-hero-wrap) not measurable on the reference" };
  for (const st of steps) st.offset = anchor0 - st.tops[anchor];
  const maxOffset = steps[steps.length - 1].offset;
  // The entry step per section: the step where its top sat NEAREST the viewport
  // top — the position-free derivation the exec run used. Absolute contentTops
  // derived from first sighting are recorded as DIAGNOSTICS ONLY: late
  // sections can mount mid-census in a pre-reveal transform (the footer's
  // first-sighting top sat 1789 px below its revealed geometry), so no absolute
  // geometry from this walk may drive a state decision.
  const bestStep = {};
  const contentTopsDiagnostic = {};
  for (const k of KEYS) {
    if (k === "chrome") continue; // fixed — handled at rest, never wheeled
    let bi = -1, bv = Infinity;
    steps.forEach((st, i) => {
      const v = st.tops[k];
      if (v == null) return;
      const d = Math.abs(v);
      if (d < bv) { bv = d; bi = i; }
    });
    if (bi >= 0) bestStep[k] = bi;
    const st = steps.find((x) => x.tops[k] != null);
    if (st) contentTopsDiagnostic[k] = st.tops[k] + st.offset;
  }
  const boxes = await refBoxes(page);
  const heights = {};
  for (const [k, b] of Object.entries(boxes)) heights[k] = b.h;
  return { steps: steps.length, maxOffset, bestStep, contentTopsDiagnostic, heights, anchor0 };
}

const refRectOf = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) };
}, sel).catch(() => null);

const refWheel = async (page, dy) => {
  await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
  await page.mouse.wheel(0, dy);
  await page.waitForTimeout(420);
};

const refOffsetNow = (page, anchor0) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  return el ? Math.round(el.getBoundingClientRect().top) : null;
}, MAPPING.heronPageKey["home-hero-wrap"]).then((heroTop) => heroTop != null ? anchor0 - heroTop : null).catch(() => null);

/**
 * Land the REFERENCE side's ENTRY state on the section's OWN top: coarse
 * 600 px wheels toward the census best step, then corrective wheels of the
 * measured residual (a wheel of Δ moves the stage exactly Δ px — so wheeling
 * `top` seats the top at zero from either side). The stage being at its end is
 * detected by the top refusing to move across consecutive wheels — the
 * end-clamped state (the reference footer: its revealed entry offset ~13 440
 * exceeds the stage end 13 257, leaving its top ~183 px from the target at
 * maximum, exactly the audit's recorded geometry).
 */
async function referenceLandEntry(page, key, bestStep, maxOffset, anchor0, fromOffset) {
  const sel = MAPPING.heronPageKey[key];
  // coarse: 600 px wheels until the section top is within one step of zero
  let at = fromOffset ?? 0;
  for (let i = 0; i < 90; i++) {
    const rect = await refRectOf(page, sel);
    if (!rect) return { state: "unlanded", reason: "selector-not-found" };
    if (Math.abs(rect.top) <= LANDING_TOL_PX) return { state: "entry", top: rect.top, offset: await refOffsetNow(page, anchor0) };
    if (Math.abs(rect.top) <= REF_STEP_PX) break;
    await refWheel(page, Math.sign(rect.top) * REF_STEP_PX);
    at = (await refOffsetNow(page, anchor0)) ?? at;
  }
  // corrective: wheel the residual itself; stop when the top stops moving
  let prevTop = null;
  const seen = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(420);
    const rect = await refRectOf(page, sel);
    if (!rect) return { state: "unlanded", reason: "selector-not-found" };
    if (Math.abs(rect.top) <= LANDING_TOL_PX) {
      return { state: "entry", top: rect.top, offset: await refOffsetNow(page, anchor0) };
    }
    if (prevTop != null && Math.abs(prevTop - rect.top) <= LANDING_TOL_PX && seen.length >= 2 && seen.every((o) => Math.abs(o - (seen[seen.length - 1])) <= LANDING_TOL_PX)) {
      return { state: "end-clamped", top: rect.top, offset: await refOffsetNow(page, anchor0), maxOffset };
    }
    prevTop = rect.top;
    await refWheel(page, rect.top);
    seen.push(await refOffsetNow(page, anchor0));
    if (seen.length > 4) seen.shift();
  }
  const rect = await refRectOf(page, sel);
  // END fallback: after the wheel budget, a stage already sitting at its own
  // end is end-clamped whatever the residual creep (the stuck-detection above
  // needs absolute stillness, which Lenis easing can deny it on a slow settle)
  if (rect) {
    const off = await refOffsetNow(page, anchor0);
    if (off != null && off >= maxOffset - 40 && rect.top > LANDING_TOL_PX) {
      return { state: "end-clamped", top: rect.top, offset: off, maxOffset, note: `end fallback: stage at ${off} of max ${maxOffset} with top ${rect.top}` };
    }
  }
  return rect
    ? { state: "unlanded", top: rect.top, offset: await refOffsetNow(page, anchor0), reason: `top ${rect.top} px refused 8 corrective wheels` }
    : { state: "unlanded", reason: "selector-not-found" };
}

/**
 * Seat the stage at an exact offset (position states): coarse 600 px wheels,
 * then corrective wheels of the residual. The anchor is THIS page's hero top
 * at rest — recorded before any wheel.
 */
async function referenceGoto(page, targetOffset, maxOffset, anchor0) {
  const heroTop = () => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  }, MAPPING.heronPageKey["home-hero-wrap"]).catch(() => null);
  let hero = await heroTop();
  if (hero == null) return { landed: false, offset: null, reason: "anchor not measurable" };
  let at = anchor0 - hero;
  let coarse = Math.floor((targetOffset - at) / REF_STEP_PX);
  for (let i = 0; i < Math.max(0, Math.min(coarse, 40)); i++) {
    await refWheel(page, REF_STEP_PX);
  }
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(420);
    hero = await heroTop();
    if (hero == null) return { landed: false, offset: null, reason: "anchor not measurable" };
    at = anchor0 - hero;
    if (Math.abs(at - targetOffset) <= LANDING_TOL_PX) {
      return { landed: true, offset: at, atStageEnd: at >= maxOffset - LANDING_TOL_PX };
    }
    if (at >= maxOffset - LANDING_TOL_PX && targetOffset > at) {
      return { landed: false, offset: at, atStageEnd: true, reason: `stage end at ${at}, target ${targetOffset} unreachable` };
    }
    const residual = targetOffset - at;
    await refWheel(page, residual);
  }
  hero = await heroTop();
  const atFinal = hero != null ? anchor0 - hero : null;
  return { landed: false, offset: atFinal, atStageEnd: atFinal != null && atFinal >= maxOffset - LANDING_TOL_PX };
}

async function captureReferenceSide(browser, dir, bp, census) {
  const rows = {};
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  try {
    await gotoWithRetry(page, REFERENCE_URL);
    await page.waitForTimeout(8000);
    const accept = page.locator("button:visible", { hasText: /^\s*ACCEPT\s*$/i }).first();
    if ((await accept.count().catch(() => 0)) > 0) await accept.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);
    const { maxOffset, bestStep, heights, anchor0 } = census;
    // capture order = the census best-step order (forward-only wheeling)
    const order = [...KEYS].filter((k) => !FIXED_SECTIONS.includes(k)).sort((a, b) => ((bestStep[a] ?? Infinity) - (bestStep[b] ?? Infinity)));
    let fromOffset = 0;
    for (const key of [...order, ...KEYS.filter((k) => FIXED_SECTIONS.includes(k))]) {
      const sel = MAPPING.heronPageKey[key];
      if (!sel) { rows[key] = { ok: false, reason: "no-reference-selector" }; continue; }
      if (FIXED_SECTIONS.includes(key)) {
        // fixed chrome: captured at rest, its own declared top recorded
        const rect = await refRectOf(page, sel);
        if (!rect) { rows[key] = { ok: false, reason: "selector-not-found" }; continue; }
        const file = join(dir, `${key}.${bp.name}.entry.png`);
        const crop = await sectionCrop(page, sel, file);
        rows[key] = {
          ok: crop.ok, reason: crop.ok ? undefined : crop.reason, height: rect.height,
          states: {
            entry: crop.ok
              ? { ok: true, state: "entry", declared: "entry", top: rect.top, declaredTop: rect.top, offset: 0, targetOffset: 0, file, clip: crop.clip, fixed: true }
              : { ok: false, reason: crop.reason },
            ...Object.fromEntries(STATES.filter((st) => st.id !== "entry").map((st) => [st.id, { ok: false, coincident: true, reason: "fixed chrome — every state coincides with rest" }])),
          },
        };
        continue;
      }
      if (bestStep[key] == null) { rows[key] = { ok: false, reason: "not-in-census" }; continue; }
      const stateRows = {};
      // 1. entry on the section's own top (self-correcting against the live rect)
      const land = await referenceLandEntry(page, key, bestStep[key], maxOffset, anchor0, fromOffset);
      fromOffset = land.offset ?? fromOffset;
      if (land.state === "unlanded") {
        stateRows.entry = { ok: false, reason: land.reason ?? `reference entry unlanded (top ${land.top ?? "?"} px)` };
        rows[key] = { ok: false, reason: stateRows.entry.reason, states: stateRows };
        continue;
      }
      if (land.state === "end-clamped") {
        // END: the stage at its own end, the top recorded (the ~183 px footer geometry)
        const rect = await refRectOf(page, sel);
        if (!rect) { stateRows.entry = { ok: false, reason: "selector-not-found" }; rows[key] = { ok: false, reason: "selector-not-found", states: stateRows }; continue; }
        const file = join(dir, `${key}.${bp.name}.end.png`);
        const crop = await sectionCrop(page, sel, file);
        const masks = crop.ok ? await liveTextMasks(page, sel, crop.clip) : [];
        stateRows.entry = {
          ok: crop.ok, reason: crop.ok ? undefined : crop.reason, state: "end-clamped", declared: "end",
          top: rect.top, offset: land.offset, targetOffset: maxOffset, maxOffset, atStageEnd: true,
          file: crop.ok ? file : undefined, clip: crop.clip, liveMaskRects: masks,
          note: `end-clamped on the reference: entry offset ${land.offset} + top ${rect.top} exceeds the stage end ${maxOffset}`,
        };
        for (const st of STATES) if (st.id !== "entry") stateRows[st.id] = { ok: false, coincident: true, reason: "section is end-clamped on the reference — every non-entry state coincides with END" };
        rows[key] = { ok: crop.ok, reason: crop.ok ? undefined : crop.reason, entryOffset: land.offset, height: rect.height, states: stateRows };
        continue;
      }
      // entry achieved: capture it, then the position states from the achieved offset
      const rect = await refRectOf(page, sel);
      const height = rect?.height ?? heights[key] ?? 1;
      const file = join(dir, `${key}.${bp.name}.entry.png`);
      const crop = await sectionCrop(page, sel, file);
      stateRows.entry = {
        ok: crop.ok, reason: crop.ok ? undefined : crop.reason, state: "entry", declared: "entry",
        top: land.top, declaredTop: 0, offset: land.offset, targetOffset: land.offset,
        file: crop.ok ? file : undefined, clip: crop.clip,
      };
      for (const st of ACTIVE_STATES) {
        if (st.id === "entry") continue;
        const delta = st.delta(height, bp.height);
        const targetOffset = Math.round(land.offset + delta);
        if (targetOffset > maxOffset + LANDING_TOL_PX) {
          stateRows[st.id] = { ok: false, reason: `state ${st.id} needs stage offset ${targetOffset} > stage end ${maxOffset} — inaccessible on the reference (recorded, not scored)` };
          continue;
        }
        const idx = STATES.findIndex((x) => x.id === st.id);
        const dup = STATES.slice(0, idx).some((x) => {
          const prev = stateRows[x.id];
          return prev?.ok && Math.abs(x.delta(height, bp.height) - delta) < 100;
        });
        if (dup) {
          stateRows[st.id] = { ok: false, coincident: true, reason: `duplicate state — delta ${Math.round(delta)} px sits within 100 px of an already-recorded state for this ${height} px section` };
          continue;
        }
        const seat = await referenceGoto(page, targetOffset, maxOffset, anchor0);
        const rect2 = await refRectOf(page, sel);
        if (!rect2) { stateRows[st.id] = { ok: false, reason: "selector-not-found" }; continue; }
        const file2 = join(dir, `${key}.${bp.name}.${st.id}.png`);
        const crop2 = await sectionCrop(page, sel, file2);
        const masks = crop2.ok ? await liveTextMasks(page, sel, crop2.clip) : [];
        stateRows[st.id] = {
          ok: crop2.ok, reason: crop2.ok ? undefined : crop2.reason,
          state: "position", declared: "position", stateId: st.id,
          top: rect2.top, offset: seat.offset, targetOffset, maxOffset, landed: seat.landed,
          atStageEnd: seat.atStageEnd === true,
          file: crop2.ok ? file2 : undefined, clip: crop2.clip, liveMaskRects: masks,
        };
      }
      rows[key] = { ok: crop.ok, reason: crop.ok ? undefined : crop.reason, entryOffset: land.offset, height, states: stateRows };
    }
  } finally {
    await page.close();
  }
  return rows;
}

// ── LOCAL capture ────────────────────────────────────────────────────────────
async function captureLocalSide(browser, dir, bp, refRows) {
  const rows = {};
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  try {
    await gotoWithRetry(page, LOCAL_URL);
    await settle(page, `local@${bp.name}`);
    const geometry = await page.evaluate((map) => {
      const out = {};
      for (const [k, sel] of Object.entries(map)) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        out[k] = { top: Math.round(r.top + window.scrollY), height: Math.round(r.height), width: Math.round(r.width) };
      }
      return { sections: out, docH: document.documentElement.scrollHeight, vh: window.innerHeight };
    }, Object.fromEntries(KEYS.map((k) => [k, MAPPING.ourSection[k]]).filter(([, s]) => !!s))).catch(() => null);
    if (!geometry) return Object.fromEntries(KEYS.map((k) => [k, { ok: false, reason: "local geometry unmeasurable" }]));
    const maxScroll = Math.max(0, geometry.docH - geometry.vh);
    const order = [...KEYS].sort((a, b) => ((geometry.sections[a]?.top ?? Infinity) - (geometry.sections[b]?.top ?? Infinity)));
    for (const key of order) {
      const sel = MAPPING.ourSection[key];
      if (!sel) { rows[key] = { ok: false, reason: "no-mapping-selector" }; continue; }
      const g = geometry.sections[key];
      if (!g) { rows[key] = { ok: false, reason: "section-not-in-dom" }; continue; }
      // the pair declaration follows the ACHIEVED reference state — not the
      // census (whose first-sighting tops can carry pre-reveal transforms)
      const refEntry = refRows?.[key]?.states?.entry;
      // dispatch on the DECLARED protocol field (immune to the state-label
      // rename that broke this check once: a patch changed "end" to
      // "end-clamped" and silently flipped every END pair to entry)
      const pairIsEnd = refEntry?.ok === true && refEntry?.declared === "end";
      const refEntryFailed = refRows?.[key] && !refEntry?.ok;
      const stateRows = {};
      // The LIVE entry seat — position-state targets derive from it, never
      // from the load-time snapshot (pairs.mjs positionTarget law): the
      // document grows after the snapshot (measured +723 px at 390; 8 of 10
      // sections shifted), and snapshot-based targets seated PRE-ENTRY states
      // (footer mid30 sat +351 px below the viewport top while the reference
      // side seated the true mid state). The live scroller maximum (read at
      // the entry seat, post-growth) governs inaccessibility.
      let liveEntryScroll = null;
      let liveMaxScroll = maxScroll;
      for (const st of ACTIVE_STATES) {
        if (FIXED_SECTIONS.includes(key)) {
          if (st.id !== "entry") { stateRows[st.id] = { ok: false, coincident: true, reason: "fixed chrome — every state coincides with rest" }; continue; }
          const pos = await localScrollTo(page, 0);
          const rect = await localRect(page, sel);
          if (!rect) { stateRows[st.id] = { ok: false, reason: "selector-not-found" }; continue; }
          const file = join(dir, `${key}.${bp.name}.entry.png`);
          const crop = await sectionCrop(page, sel, file);
          stateRows[st.id] = {
            ok: crop.ok, reason: crop.ok ? undefined : crop.reason, state: "entry", declared: "entry",
            top: rect.top, declaredTop: rect.top, scrollY: pos.scrollY, maxScroll, fixed: true,
            file: crop.ok ? file : undefined, clip: crop.clip,
          };
          continue;
        }
        if (pairIsEnd) {
          if (st.id !== "entry") { stateRows[st.id] = { ok: false, coincident: true, reason: "pair is END — non-entry states coincide with the document end" }; continue; }
          const pos = await localScrollTo(page, maxScroll);
          const rect = await localRect(page, sel);
          if (!rect) { stateRows[st.id] = { ok: false, reason: "selector-not-found" }; continue; }
          const file = join(dir, `${key}.${bp.name}.end.png`);
          const crop = await sectionCrop(page, sel, file);
          stateRows[st.id] = {
            ok: crop.ok, reason: crop.ok ? undefined : crop.reason, state: "end-clamped", declared: "end",
            top: rect.top, scrollY: pos.scrollY, targetY: maxScroll, maxScroll, atStageEnd: true,
            file: crop.ok ? file : undefined, clip: crop.clip,
          };
          continue;
        }
        if (st.id === "entry") {
          // entry FIRST: the corrective landing is the authority for the live
          // seat (the snapshot's g.top is only the initial hint)
          const land = await localLandEntry(page, sel, g.top);
          if (typeof land.maxScroll === "number") liveMaxScroll = land.maxScroll;
          if (land.ok) liveEntryScroll = land.scrollY;
          if (!land.ok) { stateRows[st.id] = { ...land, declared: "entry" }; continue; }
          const file = join(dir, `${key}.${bp.name}.entry.png`);
          const crop = await sectionCrop(page, sel, file);
          stateRows[st.id] = {
            ok: crop.ok, reason: crop.ok ? undefined : crop.reason, state: land.state, declared: "entry",
            top: land.top, declaredTop: 0, scrollY: land.scrollY, maxScroll: liveMaxScroll,
            file: crop.ok ? file : undefined, clip: crop.clip,
          };
          continue;
        }
        if (refEntryFailed) {
          stateRows[st.id] = { ok: false, reason: "the reference did not achieve its entry state — mid/exit pairs are not defined for this seat (recorded)" };
          continue;
        }
        if (liveEntryScroll == null) {
          stateRows[st.id] = { ok: false, reason: "local entry unlanded — position states have no live base (recorded, not scored)" };
          continue;
        }
        const pt = positionTarget(liveEntryScroll, st, g.height, geometry.vh, liveMaxScroll);
        if (pt.inaccessible) {
          stateRows[st.id] = { ok: false, targetY: pt.targetY, reason: `state ${st.id} needs scroll ${pt.targetY} > live document end ${liveMaxScroll} — inaccessible locally (recorded, not scored)`, basis: pt.basis };
          continue;
        }
        const idx = STATES.findIndex((x) => x.id === st.id);
        const dup = STATES.slice(0, idx).some((x) => {
          const prev = stateRows[x.id];
          return prev?.ok && Math.abs(x.delta(g.height, geometry.vh) - pt.delta) < 100;
        });
        if (dup) {
          stateRows[st.id] = { ok: false, coincident: true, reason: `duplicate state — delta ${Math.round(pt.delta)} px sits within 100 px of an already-recorded state for this ${g.height} px section` };
          continue;
        }
        // position state: seat the scroll exactly, record target + achieved
        const pos = await localScrollTo(page, pt.targetY);
        const rect = await localRect(page, sel);
        if (!rect) { stateRows[st.id] = { ok: false, reason: "selector-not-found" }; continue; }
        const file = join(dir, `${key}.${bp.name}.${st.id}.png`);
        const crop = await sectionCrop(page, sel, file);
        stateRows[st.id] = {
          ok: crop.ok, reason: crop.ok ? undefined : crop.reason, state: "position", declared: "position", stateId: st.id,
          top: rect.top, scrollY: pos.scrollY, targetY: pt.targetY, maxScroll: liveMaxScroll, basis: pt.basis,
          file: crop.ok ? file : undefined, clip: crop.clip,
        };
      }
      rows[key] = { contentTop: g.top, height: g.height, docH: geometry.docH, maxScroll: liveMaxScroll, liveEntry: liveEntryScroll, states: stateRows };
    }
  } finally {
    await page.close();
  }
  return rows;
}

// ── motion (Q): settle verified; trigger family = paired baseline ──────────
async function sampleMotion(browser, bp, pairing) {
  const samples = [];
  // r368 T1 — the sampler law (the measured contamination, reproduced before
  // the fix): the once:true reveals of earlier keys' probes rescue a section's
  // armed elements (the settle belt fires on the scroll-quiet of an earlier
  // key's stabilization), and a late-settling straggler reads as an onset
  // (problem measured −1.1 as an artifact; a fresh-page single-key probe
  // returns null). The law: ONE FRESH PAGE PER KEY, and the ONSET window is
  // sampled BEFORE the settle probe jumps into the section — each section's
  // reveals are armed and un-consumed when its own window is wheeled.
  // The window itself now matches the reference sampler's protocol
  // (ref-onsets.mjs: 150 px seats across [entry−2100, entry+300]) so the
  // fractions compare across sides.
  for (const key of KEYS) {
    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    try {
      await gotoWithRetry(page, LOCAL_URL);
      await settle(page, `local-motion@${bp.name}:${key}`);
      const sel = MAPPING.ourSection[key];
      // r368 T1 — the geometry-stability loop: the document grows in steps
      // after load (+670…+723 px measured), and the settle's two-equal-heights
      // rule can fire BETWEEN growth steps (a false-stable — the CTA's window
      // started at a pre-growth top, skewing its onset fraction by ~1×H).
      // The section top is re-read until it stops moving (600 ms apart, up to
      // 10 tries) BEFORE the window is wheeled; the stabilized value and the
      // drift are recorded.
      let geom = null, geomDrift = 0;
      for (let t = 0; t < 10; t++) {
        const g = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top + window.scrollY), height: Math.max(1, Math.round(r.height)), vh: window.innerHeight, doc: document.documentElement.scrollHeight };
        }, sel).catch(() => null);
        if (!g) break;
        if (geom && g.top === geom.top && g.doc === geom.doc) { break; }
        if (geom) geomDrift = Math.max(geomDrift, Math.abs(g.top - geom.top));
        geom = g;
        await page.waitForTimeout(600);
      }
      if (!geom) { samples.push({ section: key, bp: bp.name, family: "settle", pass: false, note: "section missing" }); continue; }
      const sig = () => page.evaluate(({ s }) => {
        const root = document.querySelector(s);
        if (!root) return null;
        let animated = 0, shift = 0, ambient = 0;
        for (const el of root.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          // ambient infinite CSS keyframe loops (the intro crawl marquee) run
          // forever BY DESIGN — they are not scroll-settle state. The measured
          // defect: the crawl kept the signature changing at frame 9/9 while
          // the same run's scroll-linked reveals completed in ≤2 frames, so the
          // settle tolerance judged the marquee, never the scroll. Running
          // infinite animations are excluded from the signature and the
          // exclusion count is recorded in it (finite entrance animations
          // still count — their settling IS settle-relevant).
          if (cs.animationName !== "none" && /infinite/.test(String(cs.animationIterationCount)) && cs.animationPlayState === "running") { ambient++; continue; }
          const op = Number(cs.opacity);
          const tr = cs.transform;
          if ((op > 0 && op < 0.999) || (tr && tr !== "none" && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(tr))) {
            animated++;
            const m = /matrix\(.*?,\s*([-\d.]+)\)$/.exec(tr);
            if (m) shift += Math.abs(Number(m[1]));
          }
        }
        return `${animated}:${Math.round(shift)}:${ambient}`;
      }, { s: sel });
      // our onset fraction (the Task 1 tuning dial) — FIRST, on the fresh armed
      // page: 150 px seats across [entry−2100, entry+300] (the reference's own
      // protocol), so the fractions compare across sides
      const REF_WIN_BEFORE = 2100;
      const REF_WIN_AFTER = 300;
      const REF_STEP = 150;
      const maxScroll = Math.max(0, geom.doc - geom.vh);
      const winStart = Math.max(0, Math.min(geom.top - REF_WIN_BEFORE, maxScroll));
      const winEnd = Math.max(winStart, Math.min(geom.top + REF_WIN_AFTER, maxScroll));
      let first = null, onsetIdx = -1, seats = 0;
      const sigTrace = [];
      for (let y = winStart; y <= winEnd; y += REF_STEP, seats++) {
        await localScrollTo(page, y);
        await page.waitForTimeout(70);
        const v = await sig();
        sigTrace.push(`${y}:${v}`);
        if (first == null) first = v;
        if (onsetIdx < 0 && v !== first) onsetIdx = seats;
      }
      const onsetY = onsetIdx < 0 ? null : winStart + onsetIdx * REF_STEP;
      const ourOnsetFrac = onsetY == null ? null : round((onsetY - geom.top) / geom.height);
      const firedBeforeWindow = onsetIdx === 0
        ? "the signature already differed at the window's first seat — the family's motion started BEFORE the window (fired at load or an earlier seat); recorded as ≤ the window start, not a mid-window onset"
        : null;
      // settle frames after a jump into the section (verified family) — AFTER
      // the onset window (the jump must not consume the section's reveals
      // before its own onset is sampled). r368 T1: the entrance transitions
      // (600–800 ms BY DESIGN — the reference's own clocks) are the TRIGGER
      // family's dial, not the settle family's: the settle probe waits for the
      // entrances fired by the jump to complete before its 6 frames judge the
      // ENGINE's settle (the scroll-quiet tail), never the entrance playback
      // (the old sampler read frame 5/5 "failures" that were the intended
      // 800 ms rise mid-flight — a conflation, not a product defect).
      const ENTRANCE_SETTLE_MS = 1200;
      const settleY = Math.max(0, Math.min(geom.top + Math.round(geom.height * 0.35), maxScroll));
      await localScrollTo(page, settleY);
      await page.waitForTimeout(ENTRANCE_SETTLE_MS);
      let frames = 0, last = null;
      for (let f = 0; f < 6; f++) {
        await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(r)); });
        const v = await sig();
        if (last != null && v !== last) frames = f;
        last = v;
      }
      samples.push({ section: key, bp: bp.name, family: "settle", settleFrames: frames, ambientExcluded: last ? Number(last.split(":")[2] ?? 0) : null, entranceSettleWaitMs: ENTRANCE_SETTLE_MS, pass: frames <= 2, note: `last change at frame ${frames}; tolerance ≤2; entrance playback excluded by a ${ENTRANCE_SETTLE_MS} ms wait (the trigger family owns the entrance clocks); running infinite-keyframe elements (ambient loops, e.g. the intro crawl) excluded from the signature` });
      // reference trigger baseline: live table, census-normalised
      const live = pairing?.bySection?.[key] ?? null;
      samples.push({
        section: key, bp: bp.name, family: "trigger-baseline",
        ourOnsetFrac,
        window: { start: winStart, end: winEnd, stepPx: REF_STEP, protocol: "the reference sampler's own window (ref-onsets.mjs): 150 px seats across [entry−2100, entry+300]" },
        geometry: { top: geom.top, height: geom.height, docH: geom.doc, stabilizedDriftPx: geomDrift },
        sigTrace,
        firedBeforeWindow,
        refTriggers: live?.triggers ?? 0,
        refTriggerStartPx: live?.minStart ?? null,
        refTriggerEndPx: live?.maxEnd ?? null,
        refTriggerFracOfSection: live?.startFracOfSection ?? null,
        resolution: `±${round(REF_STEP / Math.max(1, geom.height))} of section height (${REF_STEP} px seats)`,
        pass: null,
        note: live
          ? ourOnsetFrac == null
            ? "our onset was not detected in the sampled window (the seat reveals fire outside it, or it has no scroll-driven animation) — named gap on OUR side, not a pass"
            : firedBeforeWindow ?? "paired baseline: live reference trigger start (stage-offset space, census-validated) vs our measured onset (fresh-page, pre-settle window) — NOT scored; the Task 1 tuning dial"
          : "no live trigger rooted at this section — named gap, not a pass",
      });
    } finally {
      await page.close();
    }
  }
  const settleFam = samples.filter((s) => s.family === "settle");
  const fam = {
    settle: { samples: settleFam.length, pass: settleFam.filter((s) => s.pass).length, rate: settleFam.length ? round((100 * settleFam.filter((s) => s.pass).length) / settleFam.length) : null },
    triggerBaseline: { samples: samples.filter((s) => s.family === "trigger-baseline").length, scored: 0, note: "recorded only — never counted as a Q pass or failure (verified-only rule); fresh-page per key since r368 T1 (the earlier keys' probes no longer consume a section's once:true reveals)" },
  };
  return { samples, families: fam, overall: fam.settle.rate };
}

// ── main ────────────────────────────────────────────────────────────────────
const rows = [];
let profile = null;
let motion = null;
let censusReport = null;

// The states a capture run drives (module-level so both capture sides and
// the repeatability runner agree; defaults to the full protocol).
let ACTIVE_STATES = STATES;

async function runCapture(outDir, opts = {}) {
  ACTIVE_STATES = opts.states ?? STATES;
  mkdirSync(join(outDir, "local"), { recursive: true });
  mkdirSync(join(outDir, "reference"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const capRows = [];
  const censuses = {};
  const pairings = {};
  for (const bp of VIEWPORTS) {
    const cpage = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    let census = null;
    try {
      await gotoWithRetry(cpage, REFERENCE_URL);
      await cpage.waitForTimeout(8000);
      const accept = cpage.locator("button:visible", { hasText: /^\s*ACCEPT\s*$/i }).first();
      if ((await accept.count().catch(() => 0)) > 0) await accept.click({ timeout: 4000 }).catch(() => {});
      await cpage.waitForTimeout(600);
      census = await referenceCensus(cpage);
    } finally {
      await cpage.close();
    }
    if (census.error) {
      console.error(`  reference census failed @${bp.name}: ${census.error}`);
      census = { maxOffset: null, bestStep: {}, contentTopsDiagnostic: {}, heights: {}, anchor0: null };
    }
    censuses[bp.name] = { maxOffset: census.maxOffset, bestStep: census.bestStep, contentTopsDiagnostic: census.contentTopsDiagnostic, heights: census.heights, steps: census.steps, anchor0: census.anchor0 };
    // reference FIRST: its achieved entry states decide the pair declarations
    const reference = await captureReferenceSide(browser, join(outDir, "reference"), bp, census);
    // trigger pairing from the live inventory, normalised by the ACHIEVED entry
    // offsets (the census's first-sighting tops are diagnostics, never drivers)
    pairings[bp.name] = buildTriggerPairing(bp, reference);
    const local = await captureLocalSide(browser, join(outDir, "local"), bp, reference);
    for (const key of KEYS) capRows.push({ key, bp: bp.name, local: local[key] ?? { ok: false, reason: "local capture produced no row" }, reference: reference[key] ?? { ok: false, reason: "reference capture produced no row" } });
    console.error(`captured ${bp.name} (stage ${census.steps} steps, maxOffset ${census.maxOffset})`);
  }
  if (!opts.skipMotion) {
    motion = { byBp: {} };
    for (const bp of VIEWPORTS) motion.byBp[bp.name] = await sampleMotion(browser, bp, pairings[bp.name]);
    motion.overall = (() => {
      const all = Object.values(motion.byBp).flatMap((m) => m.samples || []);
      const settleF = all.filter((s) => s.family === "settle");
      return settleF.length ? round((100 * settleF.filter((s) => s.pass).length) / settleF.length) : null;
    })();
  }
  await browser.close();
  return { capRows, censuses, pairings };
}

/**
 * The trigger baseline pairing: the audit's LIVE five-width trigger table,
 * paired to sections by class token and normalised by THIS run's achieved
 * entry offsets — the space validation the exec run lacked (its frozen starts
 * could not be normalised against any live geometry). Recorded per section as
 * the Task 1 tuning target; never a Q pass.
 */
function buildTriggerPairing(bp, refRows) {
  if (!existsSync(LIVE_INVENTORY)) return null;
  const inv = JSON.parse(readFileSync(LIVE_INVENTORY, "utf8"));
  const entry = Object.values(inv.viewports ?? {}).find((v) => v.viewport && v.viewport[0] === bp.width && v.viewport[1] === bp.height);
  if (!entry) return null;
  const bySection = {};
  const unpaired = [];
  for (const t of entry.triggers ?? []) {
    const sel = t.selector ?? "";
    const hit = Object.entries(TRIGGER_TOKENS).find(([, tokens]) => tokens.some((tok) => sel.includes(tok)));
    if (hit) (bySection[hit[0]] ||= []).push(t);
    else unpaired.push(sel);
  }
  const deltas = [];
  const bySectionOut = {};
  for (const [k, ts] of Object.entries(bySection)) {
    const row = refRows?.[k];
    const entryState = row?.states?.entry;
    // for end-clamped sections the achieved offset is the STAGE END; the true
    // entry geometry is reconstructable as end offset + the recorded top
    let entryOffset = null;
    if (entryState?.ok === true) {
      entryOffset = entryState.declared === "end" || entryState.state === "end" || entryState.state === "end-clamped"
        ? (entryState.offset ?? 0) + (entryState.top ?? 0)
        : entryState.offset ?? null;
    }
    const height = row?.height ?? null;
    const minStart = Math.min(...ts.map((t) => t.start));
    const maxEnd = Math.max(...ts.map((t) => t.end));
    bySectionOut[k] = {
      triggers: ts.length,
      minStart,
      maxEnd,
      achievedEntryOffset: entryOffset,
      sectionHeight: height,
      startFracOfSection: entryOffset != null && height ? round((minStart - entryOffset) / height) : null,
    };
    if (entryOffset != null) deltas.push(entryOffset - minStart);
  }
  const modal = deltas.length ? deltas.slice().sort((a, b) => a - b)[Math.floor(deltas.length / 2)] : null;
  const spread = deltas.length ? Math.max(...deltas) - Math.min(...deltas) : null;
  return {
    source: "docs/audit/evidence/heron-motion-inventory-live.json (audit live capture, five widths)",
    viewport: entry.viewport,
    bySection: bySectionOut,
    unpairedRoots: unpaired,
    spaceValidation: deltas.length
      ? { achievedEntryOffsetMinusStartMedian: modal, spread, note: "the live trigger table's starts sit at a near-constant delta from the achieved entry offsets — the table lives in the same stage-offset space the wheels drive; median/spread recorded" }
      : { note: "no paired triggers with an achieved entry at this width" },
  };
}

if (!SCORE_ONLY && !REPEAT_ENTRY) {
  // profile assembled before the run — truthful tool versions, no run values
  {
    const b = await chromium.launch({ headless: true });
    profile = {
      browser: `chromium ${b.version()}`,
      playwright: requireFrontend("playwright/package.json").version,
      node: process.version,
      dpr: 1,
      reducedMotion: "no-preference",
      local: LOCAL_URL,
      reference: REFERENCE_URL,
      settle: "fonts.ready → preloader gone → two identical document heights → 2 rAF",
      cropRule: "section box ∩ viewport at the named state (pairs.mjs law)",
      states: STATES.map((s) => s.id),
    };
    await b.close();
  }
  console.error(`capture: ${KEYS.length} targets × ${VIEWPORTS.length} viewports × ${ACTIVE_STATES.length} states × 2 sides`);
  const { capRows, censuses, pairings } = await runCapture(join(OUT, "primary"));
  rows.push(...capRows);
  for (const bp of VIEWPORTS) censuses[bp.name].triggerPairing = pairings[bp.name] ?? null;
  censusReport = censuses;
  writeFileSync(join(OUT, "capture.json"), JSON.stringify({ profile, census: censusReport, rows, motion }, null, 1));
  console.log(`captured → ${OUT}`);
} else if (REPEAT_ENTRY) {
  // repeatability: entry-state pairs captured twice; |ΔE| must stay ≤1 point
  const first = await runCapture(join(OUT, "repeat", "a"), { states: STATES.filter((s) => s.id === "entry"), skipMotion: true });
  const second = await runCapture(join(OUT, "repeat", "b"), { states: STATES.filter((s) => s.id === "entry"), skipMotion: true });
  const variance = [];
  for (const bp of VIEWPORTS) {
    for (const key of KEYS) {
      const a = first.capRows.find((r) => r.key === key && r.bp === bp.name);
      const b = second.capRows.find((r) => r.key === key && r.bp === bp.name);
      const la = a?.local?.states?.entry, lr = a?.reference?.states?.entry;
      const lb = b?.local?.states?.entry, rr = b?.reference?.states?.entry;
      const v1 = validatePair(
        la?.ok ? { ok: true, top: la.top, declaredTop: la.declaredTop, scrollY: la.scrollY, maxScroll: la.maxScroll, atStageEnd: la.atStageEnd } : { ok: false },
        lr?.ok ? { ok: true, top: lr.top, declaredTop: lr.declaredTop, scrollY: lr.offset, maxScroll: lr.maxOffset, atStageEnd: lr.atStageEnd } : { ok: false },
        la?.declared ?? "entry",
      );
      const v2 = validatePair(
        lb?.ok ? { ok: true, top: lb.top, declaredTop: lb.declaredTop, scrollY: lb.scrollY, maxScroll: lb.maxScroll, atStageEnd: lb.atStageEnd } : { ok: false },
        rr?.ok ? { ok: true, top: rr.top, declaredTop: rr.declaredTop, scrollY: rr.offset, maxScroll: rr.maxOffset, atStageEnd: rr.atStageEnd } : { ok: false },
        lb?.declared ?? "entry",
      );
      if (!v1.valid || !v2.valid) {
        variance.push({ target: `${key}@${bp.name}`, status: "not-repeatable", reason: "an entry pair failed validation in one of the two runs — variance unmeasurable, recorded" });
        continue;
      }
      const e1 = pairE(lr, la);
      const e2 = pairE(rr, lb);
      variance.push({ target: `${key}@${bp.name}`, E1: e1, E2: e2, delta: e1 == null || e2 == null ? null : round(Math.abs(e1 - e2)), ok: e1 != null && e2 != null && Math.abs(e1 - e2) <= 1 });
    }
  }
  writeFileSync(join(OUT, "repeatability.json"), JSON.stringify({ generatedAt: new Date().toISOString(), rule: "same-state entry pairs captured twice; |ΔE| ≤ 1 point", variance }, null, 1));
  const worst = variance.filter((v) => typeof v.delta === "number").sort((a, b) => b.delta - a.delta)[0];
  console.log(`REPEATABILITY: ${variance.filter((v) => v.ok).length}/${variance.length} within ≤1 point${worst ? ` — worst |ΔE| ${worst.delta} (${worst.target})` : ""}`);
  process.exit(variance.every((v) => v.ok) ? 0 : 1);
} else if (existsSync(join(OUT, "capture.json"))) {
  const cap = JSON.parse(readFileSync(join(OUT, "capture.json"), "utf8"));
  rows.push(...cap.rows);
  profile = cap.profile ?? null;
  motion = cap.motion ?? null;
  censusReport = cap.census ?? null;
} else {
  console.error(`--score-only needs ${join(OUT, "capture.json")}`);
  process.exit(2);
}

// pair E for the repeat run (no masks at repeat resolution — raw SSIM over the
// top-aligned common window; the repeatability dial measures stability, not
// absolute quality)
function pairE(R, L) {
  if (!R?.file || !L?.file || !existsSync(R.file) || !existsSync(L.file)) return null;
  const refFull = loadPng(R.file);
  const locFull = loadPng(L.file);
  // stored files are the geometry truth (same law as the scorer)
  const scale = refFull.width / locFull.width;
  const locScaledH = Math.max(1, Math.round(locFull.height * scale));
  const h = Math.max(1, Math.min(refFull.height, locScaledH));
  return round(100 * ssim(cropTop(refFull, refFull.width, h), cropTop(resample(locFull, refFull.width, locScaledH), refFull.width, h)).ssim);
}

// ── score ───────────────────────────────────────────────────────────────────
// One pair row per (section × bp × state). The verdict obeys pairs.mjs; the
// crop rule is the recorded section∩viewport clip.
function verdictFor(L, R, declared) {
  if (declared === "end") {
    return validatePair(
      { ok: L.ok, top: L.top, scrollY: L.scrollY, maxScroll: L.maxScroll, atStageEnd: L.atStageEnd },
      { ok: R.ok, top: R.top, scrollY: R.offset, maxScroll: R.maxOffset, atStageEnd: R.atStageEnd },
      "end",
    );
  }
  if (declared === "position") {
    return validatePositionPair(
      { ok: L.ok, reason: L.reason, scrollY: L.scrollY, targetY: L.targetY },
      { ok: R.ok, reason: R.reason, offset: R.offset, targetOffset: R.targetOffset, stateId: R.stateId ?? L.stateId },
    );
  }
  return validatePair(
    { ok: L.ok, reason: L.reason, top: L.top, declaredTop: L.declaredTop, scrollY: L.scrollY, maxScroll: L.maxScroll, atStageEnd: L.atStageEnd },
    { ok: R.ok, reason: R.reason, top: R.top, declaredTop: R.declaredTop, scrollY: R.offset, maxScroll: R.maxOffset, atStageEnd: R.atStageEnd },
    "entry",
  );
}

const pairRows = [];
for (const row of rows) {
  const { key, bp } = row;
  const localStates = row.local?.states ?? {};
  const refStates = row.reference?.states ?? {};
  for (const st of STATES) {
    const L = localStates[st.id];
    const R = refStates[st.id];
    const target = `${key}@${bp}:${st.id}`;
    // protocol-coincident states (duplicates, fixed chrome, END collapse) are
    // declared outcomes — recorded with their reason, excluded from the
    // required denominator (there is no distinct state to verify)
    if (L?.coincident || R?.coincident) {
      pairRows.push({
        key, bp, state: st.id, target, status: "coincident", coincident: true,
        reason: (L?.coincident ? `local: ${L.reason}` : `reference: ${R.reason}`),
      });
      continue;
    }
    if (!L || !R || !L.ok || !R.ok) {
      // BOTH sides' inaccessibility reasons travel together (pairs.mjs
      // bothSidesReason law): a state unreachable on both sides — e.g.
      // footer@390:mid60, our live document end AND the reference's stage end
      // both fall short — carries its full impossibility proof in the row
      const reason = bothSidesReason(L, R) ?? "a side has no row for this state";
      const verdict = { valid: false, status: (!L || !L.ok) ? "invalid-local" : "invalid-reference", reason };
      pairRows.push({ key, bp, state: st.id, target, status: "missing", reason, verdict });
      continue;
    }
    if (!L.file || !R.file || !existsSync(L.file) || !existsSync(R.file)) {
      const verdict = { valid: false, status: "missing", reason: "file absent" };
      pairRows.push({ key, bp, state: st.id, target, status: "missing", reason: "file absent", verdict });
      continue;
    }
    const declared = R.declared ?? L.declared ?? st.id;
    const verdict = verdictFor(L, R, declared);
    const rec = {
      key, bp, state: st.id, target, declared, verdict,
      local: { path: rel(L.file), top: L.top, state: L.state === "end" ? "end-clamped" : L.state, declaredTop: L.declaredTop, scrollY: L.scrollY, targetY: L.targetY, clip: L.clip },
      reference: { path: rel(R.file), top: R.top, state: R.state === "end" ? "end-clamped" : R.state, declaredTop: R.declaredTop, offset: R.offset, targetOffset: R.targetOffset, clip: R.clip },
      localSelector: MAPPING.ourSection[key], referenceSelector: MAPPING.heronPageKey[key],
    };
    if (!verdict.valid) {
      pairRows.push({ ...rec, status: verdict.status, reason: verdict.reason });
      continue;
    }
    const refFull = loadPng(R.file);
    const locFull = loadPng(L.file);
    // the STORED FILES are the truth for geometry: the recorded clip carries
    // the capture-time dims, but storage re-processing (the ≤480px policy) may
    // have re-scaled the files afterwards — scoring reads the actual pixels.
    const scale = refFull.width / locFull.width;
    const band = (R.clip.touchesBottom || L.clip.touchesBottom) ? CHROME_CROP_BOTTOM : 0;
    const locScaledH = Math.max(1, Math.round(locFull.height * scale));
    const h = Math.max(1, Math.min(refFull.height, locScaledH) - band);
    const ref = cropTop(refFull, refFull.width, h);
    const loc = cropTop(resample(locFull, refFull.width, locScaledH), refFull.width, h);
    // the live-mask rects were recorded in the CAPTURE-time clip space — scale
    // them onto the stored grid by the measured file ratio
    const maskK = refFull.width / R.clip.w;
    let masks;
    if (st.id === "entry") {
      const fr = maskFractions(key, bp);
      masks = toPixels(fr.masks, refFull.width, h);
      rec.masks = { count: fr.masks.length, specTextElements: fr.textElements, source: fr.basis };
    } else {
      masks = (R.liveMaskRects ?? []).map((m) => ({
        x: m.x * maskK,
        y: (m.y / R.clip.h) * h,
        w: m.w * maskK,
        h: (m.h / R.clip.h) * h,
      }));
      rec.masks = { count: masks.length, source: "live reference text rects recorded at capture (before scoring), same tc policy" };
    }
    const raw = ssim(ref, loc, []);
    const masked = ssim(ref, loc, masks);
    const diff = structuralDiff(colorCrop(R.file, refFull.width, refFull.height, h), colorCrop(L.file, refFull.width, locScaledH, h), masks);
    const valid = masked.maskedShare <= MASK_SHARE_MAX;
    rec.status = valid ? "scored" : "invalid-mask-share";
    rec.reason = valid ? undefined : `mask share ${round(masked.maskedShare * 100)} % exceeds the ${MASK_SHARE_MAX * 100} % cap — the preregistered masks would eat the frame; the pair is recorded, not scored`;
    rec.crop = { rule: "section∩viewport, width-normalised to the reference, top-aligned common window", w: refFull.width, h, storedScale: { reference: R.clip.storageScale ?? null, local: L.clip.storageScale ?? null }, chromeCropBottomPx: band, chromeBand: band ? "the crop reached the viewport bottom — the reference consent-bar band removed on both sides" : null };
    rec.E = valid ? round(100 * masked.ssim) : null;
    rec.ssim_unmasked = round(raw.ssim);
    rec.E_unmasked = round(100 * raw.ssim);
    rec.structuralDiffPct = round(100 * diff.ratio);
    rec.masks.maskedShare = round(masked.maskedShare);
    if (flag("diff-maps")) {
      mkdirSync(join(OUT, "diff"), { recursive: true });
      writeFileSync(join(OUT, "diff", `${key}.${bp}.${st.id}.png`), PNG.sync.write(diff.diff));
      rec.diffPath = rel(join(OUT, "diff", `${key}.${bp}.${st.id}.png`));
    }
    pairRows.push(rec);
    console.error(`  ${target}: E ${rec.E ?? "—"} (unmasked ${rec.E_unmasked}, masked ${rec.masks.maskedShare}, diff ${rec.structuralDiffPct} %, band ${band})`);
  }
}

// ── aggregates ───────────────────────────────────────────────────────────────
// Required = the declared protocol pairs: everything except the
// protocol-coincident rows (no distinct state to verify) — their reasons are
// still carried in the manifest. T itself obeys the pairs.mjs aggregateT law
// (see below); genuinely invalid pairs stay in the denominator: they are real
// coverage gaps, never silently absorbed.
const required = pairRows.filter((p) => !p.coincident).length;
const scored = pairRows.filter((p) => p.status === "scored");
// T obeys the pairs.mjs law (aggregateT): a pair counts when its VERDICT is a
// valid matched pair (both sides at the declared state, ±2 px) — the law the
// fixtures test. E-refused pairs (mask share over the preregistered cap) are
// covered evidence with an unscored E, never pair failures; genuinely invalid
// pairs (a side missing/unlanded/mismatched, states beyond the ends) stay
// uncovered in the denominator.
const lawRows = pairRows.filter((p) => !p.coincident && p.verdict);
const law = aggregateT(lawRows);
const covered = law.valid;
const eUnscored = pairRows.filter((p) => p.status === "invalid-mask-share");
const coincidentCount = pairRows.length - required;
const perSection = {};
for (const key of KEYS) {
  const set = lawRows.filter((p) => p.key === key);
  const okScored = set.filter((p) => p.status === "scored");
  const valid = set.filter((p) => p.verdict.valid);
  const coincident = pairRows.filter((p) => p.key === key && p.coincident).length;
  perSection[key] = {
    E: okScored.length ? round(okScored.reduce((a, s) => a + s.E, 0) / okScored.length) : null,
    T: set.length ? round((100 * valid.length) / set.length) : null,
    pairs: set.length,
    covered: valid.length,
    eScored: okScored.length,
    coincident,
    states: Object.fromEntries(set.map((p) => [`${p.bp}:${p.state}`, { E: p.E ?? null, status: p.status }])),
  };
}
const E_overall = scored.length ? round(scored.reduce((a, s) => a + s.E, 0) / scored.length) : null;
const T_overall = law.T;
const Q = motion ? {
  overall: motion.overall,
  families: Object.fromEntries(Object.entries(motion.byBp ?? {}).map(([b, m]) => [b, m.families])),
  verifiedRule: "Q = passing verified samples / verified samples. Only the settle family is verified and scored; the trigger family is a paired BASELINE (live reference trigger table, census-space-validated + our measured onsets) recorded for Task 1 — never counted as a pass. Magnitude parity stays unverified (no sampled tween values).",
  triggerBaseline: Object.values(motion.byBp ?? {}).flatMap((m) => (m.samples ?? []).filter((s) => s.family === "trigger-baseline")),
} : { overall: null, families: {}, note: "motion capture missing" };

const scorecard = {
  generatedAt: new Date().toISOString(),
  formula: {
    E: "100 × mean SSIM over 8×8 windows outside preregistered text masks, per section∩viewport crop",
    T: "100 × verified matched state pairs / required non-coincident state pairs (pairs.mjs aggregateT law: verdict-valid pairs — both sides at the same declared state within ±2 px; E-refused mask pairs are covered-but-E-unscored, listed in E_unscored)",
    Q: "100 × passing verified samples / verified samples (settle only; trigger baseline recorded, unscored)",
  },
  viewports: VIEWPORTS.map((v) => `${v.name}=${v.width}x${v.height}`),
  states: STATES.map((s) => s.id),
  required, coincident: coincidentCount, covered,
  E: E_overall,
  T: T_overall,
  T_note: "T = verdict-valid matched pairs / required non-coincident pairs (the pairs.mjs aggregateT law — the instrument now obeys its own law module; the old T = scored/required conflated E-scoreability with pair coverage). E-refused pairs (mask share over the preregistered 55 % cap — recorded, not scored) count as covered evidence with an unscored E and are listed in E_unscored; genuinely invalid pairs (a side missing/unlanded/mismatched; states beyond both ends) stay uncovered in the denominator with both sides' reasons",
  invalidRows: pairRows.filter((p) => p.verdict && !p.verdict.valid && !p.coincident).map((p) => ({ target: p.target, status: p.status, reason: p.reason })),
  E_unscored: eUnscored.map((p) => ({ target: p.target, status: p.status, reason: p.reason })),
  coincidentRows: pairRows.filter((p) => p.status === "coincident").map((p) => ({ target: p.target, reason: p.reason })),
  Q,
  perSection,
  rows: pairRows,
  gates: { E_overall_min: 90, E_section_min: 88, T_overall_min: 95, T_section_min: 90, maskShareMax: MASK_SHARE_MAX, repeatVarianceMax: 1 },
};
writeFileSync(join(OUT, "scorecard.json"), JSON.stringify(scorecard, null, 1));

// ── manifest + validator ───────────────────────────────────────────────────
const rejections = manifestRejections(
  pairRows.map((p) => ({ section: p.key, bp: p.bp, status: p.status, local: p.local, reference: p.reference })),
  motion,
);
const manifest = {
  generatedAt: new Date().toISOString(),
  state: "named states (entry/mid30/mid60/exit/end) per pairs.mjs — a pair is matched only when both sides reached the same declared state within ±2 px; crops are section∩viewport clips",
  profile,
  census: censusReport,
  masks: {
    policy: "entry: preregistered frozen-spec text rects (tc≠none, in-viewport, box-relative). Non-entry: live reference text rects recorded at capture before scoring. Masks always derive from the reference side, never ours, and no mask is chosen after seeing a score.",
    shareCap: MASK_SHARE_MAX,
    chromeCropBottomPx: CHROME_CROP_BOTTOM,
    chromeBandRule: "applied only to crops that reach the viewport bottom (the reference's persistent consent bar), symmetric on both sides, recorded per row",
    storagePolicy: `crops wider than ${MAX_STORE_W}px are stored halved (colour box-average, deterministic; scale recorded per row) to respect the docs/ size gates (tracked file ≤500KB, push ≤5MB); every score runs on the STORED files so --score-only reproduces E from the committed evidence alone`,
  },
  requiredPairs: pairRows.map((p) => p.target),
  coveredPairs: lawRows.filter((p) => p.verdict.valid).map((p) => p.target),
  invalidPairs: scorecard.invalidRows,
  E_unscored: scorecard.E_unscored,
  dials: { E: E_overall, T: T_overall, Q: Q.overall },
  validate: {
    everyPairValidOrExplicit: pairRows.every((p) => p.status === "scored" || (typeof p.reason === "string" && p.reason.length > 0)),
    noCoordinateViolations: rejections.filter((r) => /outside ±2 px|provenance missing/.test(r)).length === 0,
    motionTracesPresent: !!(motion && motion.byBp && Object.keys(motion.byBp).length),
    rejections,
  },
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));

if (flag("validate")) {
  console.log(`\nMANIFEST VALIDATION — T ${covered}/${required} pairs covered by the aggregateT law (verdict-valid), E ${scored.length} scored; E gate ${E_overall != null && E_overall >= 90 ? "PASS" : "FAIL"} (E ${E_overall ?? "—"}), T gate ${T_overall != null && T_overall >= 95 ? "PASS" : "FAIL"} (T ${T_overall ?? "—"} %)`);
  const below = Object.entries(perSection).filter(([, v]) => v.E == null || v.E < 88).map(([k, v]) => `${k} (${v.E ?? "missing"})`);
  if (below.length) console.log(`  below the ≥88 section floor: ${below.join(", ")}`);
  const tBelow = Object.entries(perSection).filter(([, v]) => v.T != null && v.T < 90).map(([k, v]) => `${k} (${v.T}% — reasons on its invalid rows)`);
  if (tBelow.length) console.log(`  below the ≥90 section T floor: ${tBelow.join(", ")}`);
  if (rejections.length) console.error(`  REJECTIONS:\n    ${rejections.join("\n    ")}`);
  process.exitCode = rejections.length || !manifest.validate.everyPairValidOrExplicit ? 1 : 0;
}

console.log(`\nFIDELITY SCORECARD  (E composition · T coverage · Q motion)`);
console.log(`E overall ${E_overall ?? "—"}  (gate ≥90)   T overall ${T_overall ?? "—"} %  (gate ≥95)   Q ${Q.overall ?? "unmeasured"} (settle-only, verified)`);
for (const [k, v] of Object.entries(perSection)) {
  console.log(`  ${k.padEnd(22)} E ${String(v.E ?? "—").padStart(6)} (gate ≥88)  T ${String(v.T ?? "—").padStart(5)} %  ${v.covered}/${v.pairs} state pairs`);
}
if (scorecard.invalidRows.length) console.log(`invalid pairs (law): ${scorecard.invalidRows.length} (both-sides reasons in scorecard.json invalidRows)`);
if (scorecard.E_unscored.length) console.log(`E-refused pairs (preregistered mask cap): ${scorecard.E_unscored.length} — covered for T, unscored for E`);
console.log(`scorecard → ${rel(join(OUT, "scorecard.json"))}`);
