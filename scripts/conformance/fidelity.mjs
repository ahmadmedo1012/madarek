/**
 * r368 T2 — the fidelity evidence instrument (E / T / Q), one script.
 *
 * The audit's gap was that DOM/style conformance was the only number, so a
 * 94.4 % geometry pass could be read as visual fidelity. This instrument
 * produces the three independently reported dimensions the spec defines:
 *
 *   E  composition  100 × mean SSIM over matched section crops, windows that
 *                    fall inside a PREREGISTERED text mask excluded.
 *   T  coverage     100 × verified matched pairs / required pairs (9 seats +
 *                    chrome × 2 primary viewports).
 *   Q  motion       100 × passing approved samples / total samples (trigger
 *                    position ±2 %, displacement within ±5 %, settle ≤2 frames).
 *
 * Decisions taken here (recorded in the manifest, per the plan's Task 2 gate):
 *   · SSIM is implemented in-process (Wang et al. 2004, 8×8 uniform windows,
 *     C1=(0.01·255)², C2=(0.03·255)²) — no new dependency, deterministic, and
 *     reviewable in 30 lines. pixelmatch (already a devDependency) supplies the
 *     structural-diff percentage at the same crop for a second opinion.
 *   · Masks come from the FROZEN reference spec, not from our DOM: every
 *     element whose text class is not "none" in
 *     docs/redesign/r335/heron-spec/<section>.<bp>.json contributes its
 *     section-relative rect (grown 4 px). That is exactly the permitted
 *     "preregistered dynamic text" mask — Arabic copy may never be required to
 *     match English glyphs — and it can never hide a region we chose after
 *     seeing the score.
 *   · A pair whose mask share exceeds 55 % of the crop is INVALID (reported,
 *     not scored): a mask that eats more than half the frame has stopped
 *     measuring composition.
 *   · Reference pixels come from one settled capture of the public reference
 *     page per viewport. No reference asset, font, code or copy is stored as
 *     product material; the crops live under docs/audit/evidence only.
 *
 * Usage:
 *   node scripts/conformance/fidelity.mjs --local http://localhost:5301 \
 *        --reference https://heronaiapp.com/ --out docs/audit/evidence
 *   node scripts/conformance/fidelity.mjs --score-only      # rescore stored crops
 *   node scripts/conformance/fidelity.mjs --sections home-hero-wrap,footer --bps 1440
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SPEC_DIR = join(ROOT, "docs", "redesign", "r335", "heron-spec");
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
const LOCAL_URL = arg("local", "http://localhost:5301/");
const REFERENCE_URL = arg("reference", "https://heronaiapp.com/");
const SCORE_ONLY = flag("score-only");
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
].filter((v) => !arg("bps", null) || arg("bps").split(",").includes(v.name));
const MASK_GROW = 4;
const MASK_SHARE_MAX = 0.55;
// The reference serves a persistent consent bar over the bottom of the viewport
// (~50 px; clicking ACCEPT/REJECT did not dismiss it in headless). It is chrome,
// not section content, so BOTH crops lose the same bottom band — symmetric and
// recorded, never applied to one side only.
const CHROME_CROP_BOTTOM = 60;
// `div.pl[data-spec="preloader.overlay"]` is a fixed, click-blocking veil at
// z-index 320 — see the settle note below for why this constant is module-level.
const PRELOADER = '[data-spec="preloader.overlay"]';

// ── targets: our seat selector ↔ reference section selector, from the live
// mapping files (single source: scripts/conformance/mapping/*.json) ─────────
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

// ── images ──────────────────────────────────────────────────────────────────
function loadPng(path) {
  const png = PNG.sync.read(readFileSync(path));
  const gray = new Float64Array(png.width * png.height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * png.data[p] + 0.587 * png.data[p + 1] + 0.114 * png.data[p + 2];
  }
  return { width: png.width, height: png.height, gray, png };
}

/** box-average resample to an exact destination grid (deterministic) */
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

/** SSIM over 8×8 uniform windows; windows centred inside a mask are excluded */
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

/** structural diff percentage on the unmasked crop (pixelmatch over masked-to-white copies) */
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

// ── masks: frozen-spec text rects → crop-relative boxes ────────────────────
const specCache = new Map();
function specFor(key, bp) {
  const id = `${key}.${bp}`;
  if (specCache.has(id)) return specCache.get(id);
  const f = join(SPEC_DIR, `${id}.json`);
  const spec = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  specCache.set(id, spec);
  return spec;
}
/**
 * Section-relative text rects as fractions of the CAPTURE WINDOW.
 * The capture state is "section entry": the section root's top is scrolled to
 * the top of the viewport and the viewport is clipped, so sr.y maps 1:1 to the
 * crop's y and only elements inside the first windowH pixels are in frame.
 */
function maskFractions(key, bp, windowH) {
  const spec = specFor(key, bp);
  if (!spec?.elements?.length) return { masks: [], window: null, textElements: 0 };
  const els = spec.elements;
  const sw = Math.max(...els.map((e) => e.sr.x + e.sr.w), 1);
  const wh = windowH || Math.max(...els.map((e) => e.sr.y + e.sr.h), 1);
  const text = els.filter((e) => e.tc && e.tc !== "none" && e.sr.w > 4 && e.sr.h > 4 && e.sr.y < wh);
  const masks = text.map((e) => {
    const y = Math.max(0, e.sr.y - MASK_GROW);
    const bottom = Math.min(wh, e.sr.y + e.sr.h + MASK_GROW);
    return {
      x: (e.sr.x - MASK_GROW) / sw,
      y: y / wh,
      w: (e.sr.w + MASK_GROW * 2) / sw,
      h: Math.max(0, bottom - y) / wh,
      p: e.p,
      tc: e.tc,
    };
  });
  return { masks, window: { w: sw, h: wh }, textElements: text.length };
}
const toPixels = (fractions, w, h) => fractions.map((m) => ({ x: m.x * w, y: m.y * h, w: m.w * w, h: m.h * h }));

// ── capture ────────────────────────────────────────────────────────────────
/** navigation with retries — one ERR_SOCKET_NOT_CONNECTED must not sink a run */
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
  // Preloader / intro curtain. The first selector set here ([data-preloader]…)
  // never matched the real element — `div.pl[data-spec="preloader.overlay"]`,
  // position:fixed, z-index 320, pointer-events:auto — so the chrome crop was
  // captured WITH THE PRELOADER ON TOP and stored as if it were the header. A
  // capture taken while the veil is up is not evidence; wait for it to be gone
  // (removed, transparent, hidden or click-through) and let the caller refuse
  // if it never leaves.
  // "Occluded" is defined operationally, not by class list: the veil counts as
  // gone once the element under the viewport's centre point is NOT the veil or
  // one of its descendants. A class-name test was wrong twice over — the
  // selector missed the real element, then a broader selector matched a
  // persistent wrapper and refused every capture.
  // The overlay unmounts when the load finishes, but its `.pl` stage can stay in
  // the DOM as an empty grid box — so neither `opacity` nor hit-testing decides
  // readiness (hit-testing at centre reported "clear" while the veil was up and
  // "occluded" when only a decorative svg sat at centre). The overlay's own
  // content is the signal: it is gone when the element is gone, emptied, or no
  // longer printing its progress copy.
  await page.evaluate(async (sel) => {
    // One fact holds on every observed load: the overlay element UNMOUNTS when
    // the intro draw finishes (~6 s). Content probes were all unreliable — the
    // element carries an inline <style> whose @keyframes print "100%", and its
    // opacity/pointer-events stay at 1/auto while it is animating out.
    const busy = () => !!document.querySelector(sel);
    const t0 = performance.now();
    while (performance.now() - t0 < 15000) {
      if (!busy()) return;
      await new Promise((r) => setTimeout(r, 120));
    }
  }, PRELOADER).catch(() => {});
  // The intro draw does not always finish on its own in headless (observed:
  // stuck at 99 % on a cold dev load while an identical plain load cleared at
  // ~6 s). The overlay ships its own dismissal — "تخطي" — so use the same exit a
  // visitor uses instead of hiding it with injected CSS.
  let skipDismissed = false;
  const stillUp = await page.evaluate((sel) => !!document.querySelector(sel), PRELOADER).catch(() => false);
  if (stillUp) {
    const skip = page.locator(PRELOADER).getByText("تخطي").first();
    const hasSkip = (await skip.count().catch(() => 0)) > 0;
    if (hasSkip) await skip.click({ timeout: 5000 }).catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1200);
    skipDismissed = hasSkip;
    console.error(`  ${label}: intro overlay did not clear on its own — dismissed via ${hasSkip ? "the overlay's own تخطي control" : "Escape"}`);
  }
  // SPA mount: the first cold navigation of the dev server compiles modules, so
  // document.fonts.ready resolves against an EMPTY #root and the height-stability
  // loop below used to accept a 900 px document as "settled" (the guard then
  // refused our own page at 1440 while passing it at 390 — warm modules). Wait
  // for mounted content before negotiating height.
  const hasRoot = await page.evaluate(() => !!document.querySelector("#root")).catch(() => false);
  if (hasRoot) {
    for (let i = 0; i < 80; i++) {
      const st = await page.evaluate(() => ({ kids: document.querySelector("#root")?.children.length ?? 0, h: document.documentElement.scrollHeight, vh: window.innerHeight })).catch(() => null);
      if (st && st.kids > 0 && st.h > st.vh * 1.5) break;
      await page.waitForTimeout(250);
    }
  }
  // settle: two consecutive identical document heights + stable scrollHeight
  let prev = -1;
  for (let i = 0; i < 40; i++) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => -2);
    if (h === prev && h > 0) break;
    prev = h;
    await page.waitForTimeout(150);
  }
  await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }).catch(() => {});
  console.error(`  settle ready: ${label}`);
}

/**
 * Land on an exact scroll position. Both sites run Lenis, which owns the
 * smooth-scroll loop and will animate back over a raw window.scrollTo — so we
 * ask the engine directly when it exposes itself, assert the position for three
 * consecutive frames, and RECORD the position actually reached (an unlanded
 * scroll is reported, never silently captured as if it were the state).
 */
async function scrollToY(page, y) {
  await page.evaluate(async (target) => {
    const lenis = window.__lenis || window.lenis;
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
    if (Math.abs(sy - y) <= 2) { if (++stable >= 3) return { landed: true, scrollY: sy }; }
    else stable = 0;
    await page.waitForTimeout(80);
  }
  const sy = await page.evaluate(() => window.scrollY).catch(() => null);
  return { landed: false, scrollY: sy };
}

/**
 * Capture the named state "section entry": section root top at viewport top.
 * Element screenshots were the first attempt and they lied — on pinned/sticky
 * seats the element box is a 300vh track, so the crop mixed other sections
 * into the frame (the T-368 run scored "why" against the journey artwork).
 * A fixed viewport clip is comparable by construction: identical dimensions on
 * both sides, the first screen a visitor actually sees.
 */
async function captureEntry(page, selector, path, viewport) {
  const top = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return Math.round(r.top + window.scrollY);
  }, selector).catch(() => null);
  if (top == null) return { ok: false, reason: "selector-not-found" };
  // The intro overlay clears on its own (~6 s observed) and then REMOUNTS, so a
  // single settle-time wait is not enough: dismiss it again here through its own
  // "تخطي" control and only then capture. A crop taken under the veil is not
  // evidence (an earlier run stored the preloader as the header).
  let veilUp = await page.evaluate((sel) => !!document.querySelector(sel), PRELOADER).catch(() => false);
  if (veilUp) {
    const skip = page.locator(PRELOADER).getByText("تخطي").first();
    if ((await skip.count().catch(() => 0)) > 0) await skip.click({ timeout: 5000 }).catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    for (let i = 0; i < 12; i++) {
      veilUp = await page.evaluate((sel) => !!document.querySelector(sel), PRELOADER).catch(() => false);
      if (!veilUp) break;
      await page.waitForTimeout(150);
    }
  }
  if (veilUp) return { ok: false, reason: "preloader-still-visible — capture refused rather than storing the veil as section evidence" };
  let pos = await scrollToY(page, top);
  // Lenis may clamp or re-target; correct once with the observed error before
  // capturing (a landed scroll is a precondition of the named state).
  if (!pos.landed && typeof pos.scrollY === "number") {
    pos = await scrollToY(page, top + (top - pos.scrollY));
  }
  await page.waitForTimeout(400);
  try {
    // viewport clip at the section's entry scroll — the same state the reference
    // side is driven to, so both crops are one screen of the same moment.
    await page.screenshot({ path, animations: "disabled", timeout: 45000 });
    return { ok: true, state: "entry", sectionTop: top, scrollY: pos.scrollY, landed: pos.landed, width: viewport.width, height: viewport.height };
  } catch (e) {
    return { ok: false, reason: `screenshot-failed: ${e.message.split("\n")[0]}` };
  }
}

/**
 * LOCAL side — the section is captured as an ELEMENT at its entry scroll.
 * Element capture (not a viewport clip) is what makes the two sides
 * comparable: the reference can only be captured by element box (see below),
 * and the crop rule in the scorer ("same section-local window, top-aligned")
 * needs both boxes.
 */
async function captureLocalSide(browser, dir, bp) {
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const rows = {};
  try {
    await gotoWithRetry(page, LOCAL_URL);
    await settle(page, `local@${bp.name}`);
    for (const key of KEYS) {
      const sel = MAPPING.ourSection[key];
      if (!sel) { rows[key] = { ok: false, reason: "no-mapping-selector" }; continue; }
      const file = join(dir, `${key}.${bp.name}.png`);
      const r = await captureEntry(page, sel, file, bp);
      rows[key] = { ...r, file, selector: sel };
      if (!r.ok) console.error(`  local ${key}@${bp.name}: ${r.reason}`);
      else if (!r.landed) console.error(`  local ${key}@${bp.name}: scroll did not land (asked ${r.sectionTop}, got ${r.scrollY})`);
    }
  } finally {
    await page.close();
  }
  return rows;
}

/**
 * REFERENCE side — the public reference is a scroll-jacked stage: its document
 * scrollHeight is one viewport (900 against the spec's 14144) and
 * window.scrollTo does nothing, while mouse.wheel drives it scene by scene.
 * At rest every section box is laid out at its frozen geometry but its content
 * is hidden (a `why` crop at scroll 0 is an empty grid frame).
 *
 * Protocol (measured, documented, reproducible):
 *   pass 1  wheel N steps, after each step count each section's visible
 *           text/image nodes — a scene plays when its section lights up;
 *   pass 2  replay the wheel and capture each section's element box at the step
 *           where that section was most alive.
 * Nothing is inferred from the bundle: both passes are pixel/DOM observations of
 * the live public page, and the chosen step index is stored with the crop.
 */
const REF_STEP_PX = 600;
const REF_MAX_STEPS = 48;

/**
 * Measured displacement per wheel step (600 px exactly, verified): the stage is
 * a normal vertical layout whose offset is applied outside the document scroll.
 * So a section's entry state is addressable — bring its box top to 0.
 */
async function referenceTops(page) {
  return page.evaluate((map) => {
    const out = {};
    for (const [k, sel] of Object.entries(map)) {
      const el = document.querySelector(sel);
      out[k] = el ? Math.round(el.getBoundingClientRect().top) : null;
    }
    return out;
  }, Object.fromEntries(KEYS.map((k) => [k, MAPPING.heronPageKey[k]]).filter(([, s]) => !!s)));
}

async function wheelStep(page, times = 1) {
  await page.mouse.move(10, 10);
  for (let i = 0; i < times; i++) {
    await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
    await page.mouse.wheel(0, REF_STEP_PX);
    await page.waitForTimeout(420);
  }
}

async function captureReferenceSide(browser, dir, bp) {
  const rows = {};
  for (const key of KEYS) {
    if (!MAPPING.heronPageKey[key]) rows[key] = { ok: false, reason: "no-reference-selector" };
  }
  // pass 1 — census
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const census = [];
  try {
    await gotoWithRetry(page, REFERENCE_URL);
    await page.waitForTimeout(8000);
    // the consent bar covers the bottom ~50 px of every crop if left up; the
    // page ships two ACCEPT buttons (one hidden), so match a VISIBLE one
    const accept = page.locator("button:visible", { hasText: /^\s*ACCEPT\s*$/i }).first();
    if ((await accept.count().catch(() => 0)) > 0) await accept.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);
    for (let s = 0; s <= REF_MAX_STEPS; s++) {
      census.push(await referenceTops(page));
      if (s < REF_MAX_STEPS) await wheelStep(page, 1);
    }
  } finally {
    await page.close();
  }
  const bestStep = {};
  for (const key of KEYS) {
    let bi = 0, bv = Infinity;
    census.forEach((row, i) => { const v = row[key]; if (v == null) return; const d = Math.abs(v); if (d < bv) { bv = d; bi = i; } });
    bestStep[key] = { step: bi, topAtBest: bv === Infinity ? null : bv };
  }

  // pass 2 — replay, land each section's box top at 0, capture the viewport
  const page2 = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  try {
    await gotoWithRetry(page2, REFERENCE_URL);
    await page2.waitForTimeout(8000);
    const accept = page2.locator("button:visible", { hasText: /^\s*ACCEPT\s*$/i }).first();
    if ((await accept.count().catch(() => 0)) > 0) await accept.click({ timeout: 4000 }).catch(() => {});
    await page2.waitForTimeout(600);
    const order = [...KEYS].sort((a, b) => (bestStep[a]?.step ?? 0) - (bestStep[b]?.step ?? 0));
    let at = 0;
    for (const key of order) {
      const sel = MAPPING.heronPageKey[key];
      if (!sel) continue;
      const target = bestStep[key].step;
      if (target > at) { await wheelStep(page2, target - at); at = target; }
      // fine-land: one corrective wheel of the residual offset, twice at most
      let landedTop = null;
      for (let i = 0; i < 3; i++) {
        landedTop = (await referenceTops(page2))[key];
        if (landedTop == null || Math.abs(landedTop) <= 2) break;
        await page2.mouse.move(bp.width / 2, bp.height / 2);
        await page2.mouse.wheel(0, landedTop);
        await page2.waitForTimeout(450);
      }
      const file = join(dir, `${key}.${bp.name}.png`);
      try {
        await page2.waitForTimeout(250);
        await page2.screenshot({ path: file, animations: "disabled", timeout: 45000 });
        rows[key] = { ok: true, state: `reference-entry@wheel-${target}`, step: target, top: landedTop, file, selector: sel, width: bp.width, height: bp.height };
      } catch (e) {
        rows[key] = { ok: false, reason: `screenshot-failed: ${e.message.split("\n")[0]}`, selector: sel };
      }
    }
  } finally {
    await page2.close();
  }
  for (const key of KEYS) if (!rows[key]) rows[key] = { ok: false, reason: "not-captured" };
  return rows;
}

// ── motion sampling (Q) ────────────────────────────────────────────────────
/**
 * Approved samples = the frozen motion triggers whose target sits in a mapped
 * section (pu ts the section's own root trigger). For each sample we compare
 * the trigger's *position* — the fraction of the section's scroll span at which
 * the animation starts — because that is the value both sides can produce
 * without copying reference code. Displacement/opacity comparison needs the
 * GSAP tween state the reference clamps to its own DOM paths; those samples are
 * recorded as `unverified` until a live reference trace exists (the spec
 * forbids inferring them from a minified bundle).
 */
/**
 * Q — motion behaviour. Two sample families, both measured:
 *   trigger  the scroll fraction (of the section's own height) at which the
 *            section's content first changes state. Reference value = the frozen
 *            motion spec's trigger `start` for that section, normalised by the
 *            section's recorded height; ours = measured by scrolling the live
 *            page and watching the section subtree's opacity/transform
 *            signature. Pass when |Δ| ≤ 2 % (the spec's tolerance).
 *   settle   frames the signature keeps changing after the scroll stops; the
 *            spec allows ≤ 2 rendered frames.
 * Displacement/opacity MAGNITUDE parity is NOT scored: the frozen spec carries
 * trigger windows but no sampled tween values, and the spec forbids inferring
 * them — those samples are reported as unverified, never as passes.
 */
async function sampleMotion(browser, bp) {
  const spec = JSON.parse(readFileSync(join(SPEC_DIR, `_motion.${bp.name}.json`), "utf8"));
  const triggers = spec.triggers ?? [];
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const samples = [];
  try {
    await gotoWithRetry(page, LOCAL_URL);
    await settle(page, `local-motion@${bp.name}`);
    for (const key of KEYS) {
      const sel = MAPPING.ourSection[key];
      const refSel = MAPPING.heronPageKey[key];
      const geom = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top + window.scrollY), height: Math.max(1, Math.round(r.height)), vh: window.innerHeight, doc: document.documentElement.scrollHeight };
      }, sel);
      if (!geom) { samples.push({ section: key, bp: bp.name, family: "trigger", pass: false, note: "section missing" }); continue; }
      const height = geom.height;
      const steps = 14;
      const start = geom.top - Math.round(geom.vh * 0.5);
      const span = Math.round(height * 0.8) + Math.round(geom.vh * 0.5);
      const sig = () => page.evaluate(({ s }) => {
        const root = document.querySelector(s);
        if (!root) return null;
        let animated = 0, shift = 0;
        for (const el of root.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          const op = Number(cs.opacity);
          const tr = cs.transform;
          if ((op > 0 && op < 0.999) || (tr && tr !== "none" && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(tr))) {
            animated++;
            const m = /matrix\(.*?,\s*([-\d.]+)\)$/.exec(tr);
            if (m) shift += Math.abs(Number(m[1]));
          }
        }
        return `${animated}:${Math.round(shift)}`;
      }, { s: sel });
      let first = null, onsetIdx = -1, lastChange = -1, prev = null;
      for (let i = 0; i <= steps; i++) {
        const y = start + Math.round((span * i) / steps);
        await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), y);
        await page.waitForTimeout(70);
        const v = await sig();
        if (first == null) first = v;
        if (onsetIdx < 0 && v !== first) onsetIdx = i;
        if (prev != null && v !== prev) lastChange = i;
        prev = v;
      }
      // settle frames after a jump back into the section
      const settleY = geom.top + Math.round(height * 0.35);
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), settleY);
      let frames = 0, last = null;
      for (let f = 0; f < 6; f++) {
        await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(r)); });
        const v = await sig();
        if (last != null && v !== last) frames = f;
        last = v;
      }
      // reference trigger window for this section (frozen spec, documented start/end)
      const refTrig = triggers.filter((t) => typeof t.trigger === "string" && refSel && t.trigger.startsWith(refSel));
      const refStart = refTrig.length ? Math.min(...refTrig.map((t) => t.start)) : null;
      const refEnd = refTrig.length ? Math.max(...refTrig.map((t) => t.end)) : null;
      const oursStartFrac = onsetIdx < 0 ? null : round((start + (span * onsetIdx) / steps - geom.top) / height);
      const refStartFrac = refStart == null ? null : round(refStart / height);
      const triggerPass = oursStartFrac != null && refStartFrac != null && Math.abs(oursStartFrac - refStartFrac) <= 0.02;
      samples.push({
        section: key, bp: bp.name, family: "trigger",
        refTriggerStartPx: refStart, refTriggerEndPx: refEnd, refTriggers: refTrig.length,
        ourOnsetFrac: oursStartFrac, refOnsetFrac: refStartFrac,
        delta: oursStartFrac != null && refStartFrac != null ? round(oursStartFrac - refStartFrac) : null,
        pass: triggerPass,
        note: refTrig.length ? null : "no frozen trigger for this section — unverified, not a pass",
      });
      samples.push({ section: key, bp: bp.name, family: "settle", settleFrames: frames, pass: frames <= 2, note: `last change at frame ${frames}; tolerance ≤2` });
    }
  } finally {
    await page.close();
  }
  const approved = samples.filter((s) => s.family === "trigger" ? s.refTriggerStartPx != null : true);
  const passing = approved.filter((s) => s.pass);
  const fam = {};
  for (const f of ["trigger", "settle"]) {
    const all = approved.filter((s) => s.family === f);
    const ok = all.filter((s) => s.pass).length;
    fam[f] = { samples: all.length, pass: ok, rate: all.length ? round((100 * ok) / all.length) : null };
  }
  return { samples, families: fam, overall: approved.length ? round((100 * passing.length) / approved.length) : null, unverified: samples.filter((s) => s.family === "trigger" && s.refTriggerStartPx == null).length };
}

// ── main ───────────────────────────────────────────────────────────────────
const rows = [];
const missing = [];

if (flag("motion-only")) {
  // re-sample Q against the stored crops (cheap: no re-capture of the reference)
  const cap = JSON.parse(readFileSync(join(OUT, "capture.json"), "utf8"));
  rows.push(...cap.rows);
  const browser = await chromium.launch({ headless: true });
  cap.motion = { byBp: {} };
  for (const bp of VIEWPORTS) cap.motion.byBp[bp.name] = await sampleMotion(browser, bp);
  const all = Object.values(cap.motion.byBp).flatMap((m) => m.samples || []);
  const approved = all.filter((s) => (s.family === "trigger" ? s.refTriggerStartPx != null : true));
  cap.motion.overall = approved.length ? round((100 * approved.filter((s) => s.pass).length) / approved.length) : null;
  await browser.close();
  writeFileSync(join(OUT, "capture.json"), JSON.stringify(cap, null, 1));
  console.log(`motion re-sampled → Q ${cap.motion.overall ?? "—"}`);
} else if (!SCORE_ONLY) {
  mkdirSync(join(OUT, "primary", "local"), { recursive: true });
  mkdirSync(join(OUT, "primary", "reference"), { recursive: true });
  mkdirSync(join(OUT, "diff"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const profile = {
    browser: `chromium ${browser.version()}`,
    playwright: requireFrontend("playwright/package.json").version,
    node: process.version,
    dpr: 1,
    reducedMotion: "no-preference",
    settle: "fonts.ready → preloader gone → two identical document heights → 2 rAF",
    local: LOCAL_URL,
    reference: REFERENCE_URL,
  };
  console.error(`capture: ${KEYS.length} targets × ${VIEWPORTS.length} viewports × 2 sides`);
  for (const bp of VIEWPORTS) {
    const local = await captureLocalSide(browser, join(OUT, "primary", "local"), bp);
    const reference = await captureReferenceSide(browser, join(OUT, "primary", "reference"), bp);
    for (const key of KEYS) rows.push({ key, bp: bp.name, local: local[key], reference: reference[key] });
    console.error(`captured ${bp.name}`);
  }
  const motion = { byBp: {} };
  for (const bp of VIEWPORTS) motion.byBp[bp.name] = await sampleMotion(browser, bp);
  motion.overall = (() => {
    const all = Object.values(motion.byBp).flatMap((m) => m.samples || []);
    const approved = all.filter((s) => (s.family === "trigger" ? s.refTriggerStartPx != null : true));
    return approved.length ? round((100 * approved.filter((s) => s.pass).length) / approved.length) : null;
  })();
  await browser.close();
  writeFileSync(join(OUT, "capture.json"), JSON.stringify({ profile, rows, motion }, null, 1));
  console.log(`captured → ${OUT}`);
} else if (existsSync(join(OUT, "capture.json"))) {
  const cap = JSON.parse(readFileSync(join(OUT, "capture.json"), "utf8"));
  rows.push(...cap.rows);
} else {
  console.error(`--score-only needs ${join(OUT, "capture.json")}`);
  process.exit(2);
}

// score
const scored = [];
for (const row of rows) {
  const { key, bp } = row;
  const rec = { section: key, bp, localSelector: row.local?.selector ?? null, referenceSelector: row.reference?.selector ?? null };
  if (!row.local?.ok || !row.reference?.ok) {
    rec.status = "missing";
    rec.reason = !row.local?.ok ? `local: ${row.local?.reason ?? "not captured"}` : `reference: ${row.reference?.reason ?? "not captured"}`;
    missing.push(rec);
    scored.push(rec);
    continue;
  }
  if (!existsSync(row.local.file) || !existsSync(row.reference.file)) {
    rec.status = "missing"; rec.reason = "file absent"; missing.push(rec); scored.push(rec); continue;
  }
  const refFull = loadPng(row.reference.file);
  const locFull = loadPng(row.local.file);
  // CROP RULE (documented, same on both sides): normalise the local crop to the
  // reference's width, then compare the TOP-ALIGNED window both sections share.
  // Resampling our section to the reference's full height was the first rule and
  // it was wrong: a 3 158 px pinned track squeezed into 699 px has no meaningful
  // SSIM. Now the window is "the reference's box height" measured from the
  // section top — the part both sections actually contain.
  const scale = refFull.width / locFull.width;
  const locScaledH = Math.max(1, Math.round(locFull.height * scale));
  const h = Math.max(1, Math.min(refFull.height, locScaledH) - CHROME_CROP_BOTTOM);
  const ref = cropTop(refFull, refFull.width, h);
  const loc = cropTop(resample(locFull, refFull.width, locScaledH), refFull.width, h);
  const fracs = maskFractions(key, bp, h);
  const masks = toPixels(fracs.masks, ref.width, ref.height);
  const raw = ssim(ref, loc, []);
  const masked = ssim(ref, loc, masks);
  const diff = structuralDiff(colorCrop(row.reference.file, refFull.width, refFull.height, h), colorCrop(row.local.file, refFull.width, locScaledH, h), masks);
  // The structural-diff percentage is always recorded; the diff MAP is opt-in
  // because 40 full-frame maps would push docs/ past the 30 MB size-gate ceiling.
  if (flag("diff-maps")) {
    mkdirSync(join(OUT, "diff"), { recursive: true });
    writeFileSync(join(OUT, "diff", `${key}.${bp}.png`), PNG.sync.write(diff.diff));
  }
  const valid = masked.maskedShare <= MASK_SHARE_MAX;
  rec.status = valid ? "scored" : "invalid-mask-share";
  rec.reference = { path: rel(row.reference.file), w: refFull.width, h: refFull.height };
  rec.local = { path: rel(row.local.file), native: { w: row.local.width, h: row.local.height }, normalizedTo: `${refFull.width}x${h}`, heightRatio: round(locScaledH / refFull.height) };
  rec.crop = { rule: "top-aligned common window after width normalisation, minus the symmetric chrome band", w: refFull.width, h, chromeCropBottomPx: CHROME_CROP_BOTTOM };
  rec.E = valid ? round(100 * masked.ssim) : null;
  rec.ssim_unmasked = round(raw.ssim);
  rec.E_unmasked = round(100 * raw.ssim);
  rec.structuralDiffPct = round(100 * diff.ratio);
  rec.masks = { count: fracs.masks.length, specTextElements: fracs.textElements, maskedShare: round(masked.maskedShare), window: 8, growPx: MASK_GROW, source: `docs/redesign/r335/heron-spec/${key}.${bp}.json text elements (tc≠none)` };
  if (flag("diff-maps")) rec.diffPath = rel(join(OUT, "diff", `${key}.${bp}.png`));
  scored.push(rec);
  console.error(`  ${key}@${bp}: E ${rec.E ?? "—"} (unmasked ${rec.E_unmasked}, masked ${rec.masks.maskedShare}, diff ${rec.structuralDiffPct} %)`);
}

/** top-aligned crop of a grayscale image */
function cropTop(img, w, h) {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) out.set(img.gray.subarray(y * img.width, y * img.width + w), y * w);
  return { width: w, height: h, gray: out };
}

/** colour crop on the same grid (width normalised, top-aligned) for pixelmatch */
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
function round(n) { return Math.round(n * 10) / 10; }
function rel(p) { return p.replace(`${ROOT}/`, ""); }

// ── T / E / Q aggregates ───────────────────────────────────────────────────
const required = KEYS.length * VIEWPORTS.length;
const covered = scored.filter((s) => s.status === "scored").length;
// A reference side that produced nothing is a BLOCKER, not a 0 % score: T is
// reported null with the reason so no reader can mistake "unmeasured" for
// "measured and bad".
const referenceUnavailable = scored.length > 0 && scored.every((s) => !rows.find((r) => r.key === s.section && r.bp === s.bp)?.reference?.ok);
const T_reason = referenceUnavailable
  ? `reference evidence unavailable — ${[...new Set(missing.map((m) => m.reason.split(":")[0]))].join("; ")}; pairs cannot be verified and are NOT counted as failures`
  : null;
const perSection = {};
for (const key of KEYS) {
  const set = scored.filter((s) => s.section === key);
  const ok = set.filter((s) => s.status === "scored");
  perSection[key] = {
    E: ok.length ? round(ok.reduce((a, s) => a + s.E, 0) / ok.length) : null,
    T: referenceUnavailable ? null : round((100 * ok.length) / set.length),
    pairs: set.length,
    covered: ok.length,
    perViewport: Object.fromEntries(set.map((s) => [s.bp, { E: s.E ?? null, status: s.status }])),
  };
}
const E_overall = covered ? round(scored.filter((s) => s.status === "scored").reduce((a, s) => a + s.E, 0) / covered) : null;
const T_overall = referenceUnavailable ? null : required ? round((100 * covered) / required) : null;
const MOTION = (() => {
  if (existsSync(join(OUT, "capture.json"))) {
    const cap = JSON.parse(readFileSync(join(OUT, "capture.json"), "utf8"));
    if (cap.motion?.byBp) return cap.motion;
  }
  return null;
})();
const Q = MOTION
  ? (() => {
      // Only the settle family is VERIFIED. The trigger family is excluded, not
      // failed: the frozen spec records `start` in the reference's ScrollTrigger
      // scroll space, and the scroll-jacked stage no longer exposes an offset
      // between that space and the document layout — so any comparison would be
      // an inferred constant. The spec says such values stay unverified until
      // measured and approved, and that they may never be counted as passes.
      const all = Object.values(MOTION.byBp).flatMap((m) => m.samples || []);
      const settle = all.filter((s) => s.family === "settle");
      const trigger = all.filter((s) => s.family === "trigger");
      const rate = settle.length ? round((100 * settle.filter((s) => s.pass).length) / settle.length) : null;
      return {
        overall: rate,
        families: Object.fromEntries(Object.entries(MOTION.byBp).map(([b, m]) => [b, { settle: m.families?.settle ?? null }])),
        verifiedSamples: settle.length,
        unverified: {
          family: "trigger",
          samples: trigger.length,
          reason: "frozen trigger `start` lives in the reference's ScrollTrigger scroll space; the scroll-jacked stage exposes no offset to the document layout, so it cannot be normalised without a live reference trace. Measured our-side onsets are recorded in capture.json for the Task 3 work-list.",
          measuredOurOnsets: trigger.map((s) => ({ section: s.section, bp: s.bp, ourOnsetFrac: s.ourOnsetFrac, refTriggerStartPx: s.refTriggerStartPx })),
        },
        note: "Q = passing verified samples / verified samples. Settle family = frames a section's subtree keeps changing after its scroll stops (tolerance ≤2). Magnitude parity stays unverified (no sampled tween values in the frozen spec).",
      };
    })()
  : { overall: null, families: {}, note: "motion capture missing" };

const scorecard = {
  generatedAt: new Date().toISOString(),
  formula: { E: "100 × mean SSIM over 8×8 windows outside preregistered text masks", T: "100 × verified matched pairs / required pairs", Q: "100 × passing approved samples / total samples" },
  viewports: VIEWPORTS.map((v) => `${v.name}=${v.width}x${v.height}`),
  required, covered,
  referenceUnavailable,
  T_reason,
  E: E_overall,
  T: T_overall,
  Q,
  perSection,
  rows: scored,
  missing,
  gates: { E_overall_min: 90, E_section_min: 88, T_overall_min: 95, T_section_min: 90, maskShareMax: MASK_SHARE_MAX },
};
writeFileSync(join(OUT, "scorecard.json"), JSON.stringify(scorecard, null, 1));

// ── evidence manifest (Task 2's own deliverable + its validator) ───────────
const manifest = {
  generatedAt: new Date().toISOString(),
  state: "entry — section root top at viewport top, viewport clip, animations disabled at capture",
  profile: existsSync(join(OUT, "capture.json")) ? JSON.parse(readFileSync(join(OUT, "capture.json"), "utf8")).profile : null,
  masks: {
    policy: "preregistered from the frozen reference spec's text elements (tc≠none), grown 4 px, windowed to the capture viewport; Arabic glyphs are never required to match English ones and no mask may be chosen after seeing a score",
    source: "docs/redesign/r335/heron-spec/<section>.<bp>.json",
    shareCap: MASK_SHARE_MAX,
    chromeCropBottomPx: CHROME_CROP_BOTTOM,
    chromeCropReason: "the reference's consent bar overlays the bottom ~50 px of every crop and did not dismiss under click in headless; both sides lose the same band",
    invalidPairs: scored.filter((s) => s.status === "invalid-mask-share").map((s) => `${s.section}@${s.bp}`),
  },
  requiredTargets: KEYS.flatMap((k) => VIEWPORTS.map((v) => `${k}@${v.name}`)),
  capturedTargets: scored.filter((s) => s.status === "scored" || s.status === "invalid-mask-share").map((s) => `${s.section}@${s.bp}`),
  missingTargets: missing.map((m) => ({ target: `${m.section}@${m.bp}`, reason: m.reason })),
  dials: { E: E_overall, T: T_overall, Q: Q.overall, E_note: "100 × mean SSIM outside masks", T_note: "verified matched pairs / required pairs", Q_note: Q.note },
  validate: {
    completeEither: missing.length === 0,
    completeBoth: missing.length === 0 && covered === required,
    E_meets_gate: E_overall != null && E_overall >= 90,
    T_meets_gate: T_overall != null && T_overall >= 95,
    sections_meeting_E_floor: Object.entries(perSection).filter(([, v]) => v.E != null && v.E >= 88).map(([k]) => k),
    sections_below_E_floor: Object.entries(perSection).filter(([, v]) => v.E == null || v.E < 88).map(([k, v]) => `${k} (${v.E ?? "missing"})`),
  },
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
if (flag("validate")) {
  console.log(`\nMANIFEST VALIDATION — complete ${manifest.validate.completeBoth ? "YES" : "NO"} (${covered}/${required} pairs), E gate ${manifest.validate.E_meets_gate ? "PASS" : "FAIL"}, T gate ${manifest.validate.T_meets_gate ? "PASS" : "FAIL"}`);
  if (manifest.validate.sections_below_E_floor.length) console.log(`  below the ≥88 section floor: ${manifest.validate.sections_below_E_floor.join(", ")}`);
  if (!manifest.validate.completeBoth) console.error("manifest incomplete — missing: " + JSON.stringify(manifest.missingTargets));
  process.exitCode = manifest.validate.completeBoth ? 0 : 1;
}

console.log(`\nFIDELITY SCORECARD  (E composition · T coverage · Q motion)`);
console.log(`E overall ${E_overall ?? "—"}  (gate ≥90)   T overall ${T_overall ?? "—"} %  (gate ≥95)   Q ${Q.overall ?? "unmeasured"}`);
for (const [k, v] of Object.entries(perSection)) {
  console.log(`  ${k.padEnd(22)} E ${String(v.E ?? "—").padStart(6)} (gate ≥88)  T ${String(v.T ?? "—").padStart(5)} %  ${v.covered}/${v.pairs}  ${v.perViewport["1440"]?.status !== "scored" || v.perViewport["390"]?.status !== "scored" ? "⚠ no verified pair" : ""}`);
}
if (T_reason) console.log(`T: ${T_reason}`);
if (missing.length) console.log(`missing pairs: ${missing.length} — ${missing.map((m) => `${m.section}@${m.bp} (${m.reason})`).join("; ")}`);
console.log(`scorecard → ${rel(join(OUT, "scorecard.json"))}`);
