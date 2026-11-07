#!/usr/bin/env node
/**
 * pages.mjs — R340 T-D1a · the per-page conformance harness.
 *
 * run.mjs measures the LANDING's sections against the frozen Heron spec;
 * THIS instrument measures WHOLE PAGES (any route) against OUR OWN design
 * language — the pattern library (T-14: paper/ink, hairlines, `[nn]` mono
 * numerals, eyebrow labels, one type-tier ladder). No Heron dependency,
 * no screenshots: computed styles + DOM presence, deterministic.
 *
 * Six checks per (route × bp × theme) cell, equal weights (0–100 each,
 * cell score = mean; the route's reported number is its WORST cell —
 * the honest number, never an average that hides a bad band):
 *
 *   1. typeRungs — every visible text node's computed font-size maps to
 *      the --fs-* rung ladder (token names collected from
 *      tokens/tokens.css + tokens/tokens.generated.css, values resolved
 *      LIVE at the cell's viewport via probe elements — clamp()/max()
 *      and the fluid rem root are honoured by construction). A size not
 *      on a rung (±0.25px sub-pixel tolerance) = off-rung. Tier law:
 *      ≥2 distinct rungs in use AND the modal (most common) rung is a
 *      TEXT tier (the --fs-body / --fs-body-lg / --fs-sm family) — a
 *      page that flattens everything to one size, or shouts in display
 *      type everywhere, loses half the check's credit.
 *   2. spacingRhythm — block paddings/margins of every visible element
 *      quantize to the 4px rhythm (value % 4 === 0); the score IS the
 *      quantized share (≥90% is the design law; the cell gate at 90
 *      enforces it through the total).
 *   3. patternUsage — the design language's five fingerprints, each
 *      present = 1/5: paper ground (page root's computed background ==
 *      var(--bg) resolved live), a hairline border (1px solid, neutral
 *      ink family, alpha ≥ 0.15), a `[nn]` bracketed mono numeral in the
 *      visible text, an eyebrow-label class (lp-eyebrow / pf-eyebrow /
 *      auth-meta / auth-sheet-label / fo-label), a CTA-pair class
 *      (lp-cta-pair / pf-page-actions / fo-cta-actions).
 *   4. darkInk — every visible text node ≥ 4.5:1 (WCAG AA) vs the
 *      COMPOSITED effective background (ancestor rgba stack blended
 *      until opaque, translucent inks alpha-blended over it) — the
 *      run.mjs `--dark` darkInk walk, applied to BOTH themes here (the
 *      ink law is theme-independent). Uncountable seats (bg-image
 *      ancestors, unparseable colors, opacity < 0.3) are counted as
 *      skipped and reported, never silently dropped.
 *   5. edge390 — at the 390 bp only: the page's root content gutters
 *      (visible-content union of <main> vs the viewport edges) are
 *      8px ± 2 — the landing's own phone gutter. Other bps: n/a (100).
 *   6. hover — the route's primary CTA (first match of .auth-submit /
 *      .btn.primary / .btn.accent / button[type=submit]) shows ≥ 2
 *      affordance changes on hover (computed diff over color /
 *      background-color / border-color / transform / opacity /
 *      box-shadow / text-decoration, on the element AND its
 *      ::before/::after pseudo layers).
 *
 * CLI (run.mjs grammar):
 *   node scripts/conformance/pages.mjs --routes /auth,/auth/register --bps 1440,390 [--dark] --gate
 *   node scripts/conformance/pages.mjs --url http://localhost:5322/    # default
 *
 * Needs a dev server (npx vite --port 5322 --strictPort from frontend/).
 * Dark cells boot with localStorage['madarek-theme'] set BEFORE first
 * load via addInitScript — an attribute-only flip is reverted by the
 * zustand store on hydration.
 *
 * Output: console matrix + scripts/conformance/pages-results.json.
 * --gate exits 1 when ANY cell of ANY route scores < 90 (GATE_FLOOR).
 * Does NOT touch run.mjs / ratchet.json — the lead owns re-baselining.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
let chromium;
try {
  ({ chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright"));
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json"))("playwright"));
}

// ── the ladder: every --fs-* token name declared by the token sources ────────
const TOKEN_FILES = ["tokens/tokens.css", "tokens/tokens.generated.css"];
const FS_NAMES = [
  ...new Set(
    TOKEN_FILES.flatMap((f) =>
      [...readFileSync(join(WORKTREE, "frontend", "src", "styles", f), "utf8").matchAll(/(--fs-[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]),
    ),
  ),
];
if (!FS_NAMES.length) {
  console.error("pages.mjs: no --fs-* tokens found in the token sources — instrument is broken, refusing to run");
  process.exit(2);
}

const EYEBROW_CLASSES = ["lp-eyebrow", "pf-eyebrow", "auth-meta", "auth-sheet-label", "fo-label"];
const CTA_PAIR_CLASSES = ["lp-cta-pair", "pf-page-actions", "fo-cta-actions"];
const CTA_SELECTORS = [".auth-submit", ".btn.primary", ".btn.accent", "button[type=submit]"];
const TEXT_TIER_TOKENS = ["--fs-body", "--fs-body-lg", "--fs-sm"]; // the modal rung's family
const RUNG_TOL = 0.25; // sub-pixel tolerance for computed-vs-rung matching
const SPACING_QUANTUM = 4;
const SPACING_FLOOR = 90; // % of measured values that must quantize (design law)
const INK_FLOOR = 4.5; // WCAG AA
const EDGE390_TARGET = 8;
const EDGE390_TOL = 2;
const HAIRLINE_ALPHA_MIN = 0.15;
const GATE_FLOOR = 90;

// ── args (run.mjs grammar) ───────────────────────────────────────────────────
const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const ROUTES = (arg("routes", "/auth") || "").split(",").map((r) => r.trim()).filter(Boolean);
const BPS_WANTED = (arg("bps", "1440,390") || "").split(",").map((b) => b.trim()).filter(Boolean);
const URL_BASE = arg("url", "http://localhost:5322/");
const DARK = process.argv.includes("--dark");
const GATE = process.argv.includes("--gate");
const OUT = arg("out", join(__dirname, "pages-results.json"));
const THEMES = DARK ? ["light", "dark"] : ["light"];

// ── in-page math: the run.mjs color parser + WCAG contrast, verbatim ─────────
const COLOR_MATH = String.raw`
  const clamp255 = (v) => Math.max(0, Math.min(255, v));
  function oklchToSrgb(L, C, H) {
    const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
    return lin.map((v) => clamp255(gam(Math.max(0, Math.min(1, v))) * 255));
  }
  function parseColor(str) {
    if (str == null) return null;
    const s = String(str).trim();
    if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    let m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.%]+)\s*)?\)$/) || s.match(/^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.%]+)\s*)?\)$/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4] };
    m = s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.%]+)\s*)?\)$/);
    if (m) return { r: clamp255(+m[1] * 255), g: clamp255(+m[2] * 255), b: clamp255(+m[3] * 255), a: m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4] };
    m = s.match(/^oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.%]+)\s*)?\)$/);
    if (m) {
      const L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : +m[1];
      const C = m[2].endsWith("%") ? parseFloat(m[2]) * 0.004 : +m[2];
      const rgb = oklchToSrgb(L, C, parseFloat(m[3]));
      const a = m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4];
      return Number.isFinite(rgb[0]) && Number.isFinite(a) ? { r: rgb[0], g: rgb[1], b: rgb[2], a } : null;
    }
    return null;
  }
  function relLum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  // contrast of a (possibly translucent) ink vs a PRE-COMPOSITED opaque bg;
  // element opacity multiplies the ink alpha. null ⇒ caller reports a skip.
  function contrastRatio(inkStr, bgStr, opacity) {
    const ink = parseColor(inkStr), bg = parseColor(bgStr);
    if (!ink || !bg || !Number.isFinite(ink.a) || !Number.isFinite(bg.a) || bg.a < 1) return null;
    const a = Math.max(0, Math.min(1, ink.a * opacity));
    const fg = a >= 1 ? ink : { r: ink.r * a + bg.r * (1 - a), g: ink.g * a + bg.g * (1 - a), b: ink.b * a + bg.b * (1 - a) };
    const li = relLum(fg), lb = relLum(bg);
    return (Math.max(li, lb) + 0.05) / (Math.min(li, lb) + 0.05);
  }
`;

// ── the in-page measurement walk (one evaluate per cell) ─────────────────────
const MEASURE_FN = String.raw`(cfg) => {
` + COLOR_MATH + String.raw`
  const csOf = (el) => getComputedStyle(el);
  const num = (v) => parseFloat(v) || 0;
  const ownText = (el) =>
    Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();

  // 0 · the rung ladder + the paper ground, resolved live at THIS viewport
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;top:-9999px;left:-9999px;visibility:hidden;line-height:0;height:0;padding:0;margin:0;";
  document.body.appendChild(probe);
  const rungByName = {};
  for (const n of cfg.fsNames) {
    probe.style.fontSize = "0px"; // reset — an unresolvable var would otherwise inherit the previous probe value
    probe.style.fontSize = "var(" + n + ")";
    const px = parseFloat(csOf(probe).fontSize);
    if (Number.isFinite(px) && px > 0) rungByName[n] = Math.round(px * 100) / 100;
  }
  const rungVals = Object.values(rungByName);
  const textTierVals = cfg.textTierTokens.map((t) => rungByName[t]).filter((v) => v != null);
  probe.style.background = "var(--bg)";
  const bgResolved = csOf(probe).backgroundColor;
  probe.remove();

  // effective background = COMPOSITED ancestor stack (run.mjs darkInk walk):
  // climb like a renderer would, collecting rgba layers until an opaque one,
  // then blend over the CSS canvas (white).
  const effBg = (node) => {
    const layers = [];
    let n = node, eimg = false;
    while (n && n.nodeType === 1) {
      const cs = csOf(n);
      if (cs.backgroundImage !== "none") eimg = true;
      const c = parseColor(cs.backgroundColor);
      if (c == null) return { ebg: null, eimg, reason: "unparseable background layer: " + cs.backgroundColor };
      if (c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      n = n.parentElement;
    }
    let out = { r: 255, g: 255, b: 255 };
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      out = { r: l.r * l.a + out.r * (1 - l.a), g: l.g * l.a + out.g * (1 - l.a), b: l.b * l.a + out.b * (1 - l.a) };
    }
    return { ebg: "rgb(" + Math.round(out.r) + ", " + Math.round(out.g) + ", " + Math.round(out.b) + ")", eimg, stack: layers.length };
  };
  const neutralInk = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) <= 10;

  // 1+4 · the text census + hairline + spacing censuses (one walk)
  const texts = [];
  const inkFails = [];
  const offRung = [];
  const rungCounts = new Map();
  const hairline = { count: 0, sample: null };
  const spacingVals = [];
  const all = [document.body, ...document.body.querySelectorAll("*")];
  for (const el of all) {
    const cs = csOf(el);
    if (!el.getClientRects().length) continue;
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") continue;
    // hairline census — 1px solid, neutral ink family, alpha ≥ 0.15
    if (cs.borderTopStyle === "solid" && num(cs.borderTopWidth) === 1) {
      const c = parseColor(cs.borderTopColor);
      if (c && c.a >= cfg.hairlineAlphaMin && neutralInk(c)) {
        hairline.count++;
        if (!hairline.sample) hairline.sample = cs.borderTopColor;
      }
    }
    // spacing census — block paddings/margins, non-zero only
    for (const v of [cs.paddingTop, cs.paddingBottom, cs.marginTop, cs.marginBottom]) {
      const f = parseFloat(v);
      if (Number.isFinite(f) && f > 0) spacingVals.push(Math.round(f * 100) / 100);
    }
    // text census — elements with own (non-whitespace) text nodes only:
    // pseudo-element glyphs and attributes never enter it
    const t = ownText(el);
    if (!t) continue;
    const fs = parseFloat(cs.fontSize);
    const fsR = Math.round(fs * 100) / 100;
    let rungVal = null;
    for (const r of rungVals) if (Math.abs(r - fs) <= cfg.rungTol) { rungVal = Math.round(r * 100) / 100; break; }
    if (rungVal != null) rungCounts.set(rungVal, (rungCounts.get(rungVal) || 0) + 1);
    else offRung.push({ text: t.slice(0, 60), tag: el.tagName.toLowerCase(), fs: fsR });
    const opacity = Number(cs.opacity);
    const ebg = effBg(el);
    let ratio = null, inkSkipped = true, inkReason = null;
    if (ebg.eimg) inkReason = "bg-image ancestor";
    else if (!(opacity >= 0.3)) inkReason = "opacity < 0.3";
    else if (ebg.ebg == null) inkReason = ebg.reason || "no effective background";
    else {
      ratio = contrastRatio(cs.color, ebg.ebg, opacity);
      if (ratio == null) inkReason = "uncountable color pair: " + cs.color + " on " + ebg.ebg;
      else inkSkipped = false;
    }
    texts.push({
      text: t.slice(0, 60), tag: el.tagName.toLowerCase(),
      fs: fsR, ff: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      rungVal, color: cs.color, opacity,
      inkRatio: ratio == null ? null : Math.round(ratio * 100) / 100,
      inkSkipped, inkReason, bg: ebg.eimg ? "(bg-image)" : ebg.ebg,
    });
    if (ratio != null && ratio < cfg.inkFloor)
      inkFails.push({ text: t.slice(0, 60), ratio: Math.round(ratio * 100) / 100, color: cs.color, bg: ebg.ebg, opacity, fs: fsR });
  }

  // 2 · pattern census
  const shell = document.querySelector(".auth-shell, .nf-shell") || document.body;
  const paperBg = csOf(shell).backgroundColor === bgResolved ? csOf(shell).backgroundColor : null;
  const numeralOk = /\[\d{2}\]/.test(document.body.innerText || "");
  const eyebrowHit = document.querySelector(cfg.eyebrowClasses.map((c) => "." + c).join(","));
  const ctaPairHit = document.querySelector(cfg.ctaPairClasses.map((c) => "." + c).join(","));

  // 5 · edge390 — the root content's side gutters (visible-content union of <main>)
  let edge = null;
  if (cfg.isBp390) {
    const main = document.querySelector("main") || shell;
    const vw = window.innerWidth;
    let l = Infinity, r = -Infinity;
    for (const d of [main, ...main.querySelectorAll("*")]) {
      const b = d.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0) continue;
      if (b.left < -0.5 || b.right > vw + 0.5) continue; // fully-inside only
      const st = csOf(d);
      if (st.visibility === "hidden" || Number(st.opacity) <= 0) continue;
      l = Math.min(l, b.left);
      r = Math.max(r, b.right);
    }
    if (l !== Infinity) edge = { l: Math.round(l * 10) / 10, r: Math.round((vw - r) * 10) / 10 };
  }

  // 6 · the primary CTA (hover affordances measured from the node side)
  const ctaSel = cfg.ctaSelectors.find((s) => document.querySelector(s)) || null;
  return { rungByName, textTierVals, bgResolved, texts, offRung, inkFails, spacingVals, hairline, paperBg, numeralOk, eyebrow: eyebrowHit ? eyebrowHit.className : null, ctaPair: ctaPairHit ? ctaPairHit.className : null, edge, ctaSel };
}`;

const CFG = (bpName) => ({
  fsNames: FS_NAMES,
  textTierTokens: TEXT_TIER_TOKENS,
  eyebrowClasses: EYEBROW_CLASSES,
  ctaPairClasses: CTA_PAIR_CLASSES,
  ctaSelectors: CTA_SELECTORS,
  rungTol: RUNG_TOL,
  hairlineAlphaMin: HAIRLINE_ALPHA_MIN,
  inkFloor: INK_FLOOR,
  isBp390: bpName === "390",
});

// node-side callable of the in-page walk (run.mjs's newFunction wrap — the
// serialized body closes over nothing on the node side)
const measureFn = new Function("return (" + MEASURE_FN + ")")();

// ── check scorers (node side) ────────────────────────────────────────────────
function scoreTypeRungs(m) {
  const total = m.texts.length || 1;
  const onRung = m.texts.filter((t) => t.rungVal != null).length;
  const distinct = new Set(m.texts.filter((t) => t.rungVal != null).map((t) => t.rungVal)).size;
  let modal = null, modalCount = 0;
  const counts = new Map();
  for (const t of m.texts) if (t.rungVal != null) counts.set(t.rungVal, (counts.get(t.rungVal) || 0) + 1);
  for (const [v, c] of counts) if (c > modalCount) { modal = v; modalCount = c; }
  const modalIsTextTier = modal != null && m.textTierVals.some((v) => Math.abs(v - modal) <= RUNG_TOL);
  const tiersOk = distinct >= 2 && modalIsTextTier;
  const share = Math.round((onRung / total) * 1000) / 10;
  return {
    score: Math.round((tiersOk ? share : share * 0.5) * 10) / 10,
    share, onRung, total, distinctRungs: distinct, modalRung: modal, modalIsTextTier, tiersOk,
    offRung: m.offRung.slice(0, 50),
  };
}
function scoreSpacing(m) {
  const total = m.spacingVals.length;
  const quant = m.spacingVals.filter((v) => v % SPACING_QUANTUM === 0).length;
  const share = total ? Math.round((quant / total) * 1000) / 10 : 100;
  return { score: share, share, quant, total, floor: SPACING_FLOOR, offenders: m.spacingVals.filter((v) => v % SPACING_QUANTUM !== 0).slice(0, 50) };
}
function scorePattern(m) {
  const checks = {
    paper: !!m.paperBg,
    hairline: m.hairline.count > 0,
    numeral: m.numeralOk,
    eyebrow: !!m.eyebrow,
    ctaPair: !!m.ctaPair,
  };
  const present = Object.values(checks).filter(Boolean).length;
  return { score: Math.round((present / 5) * 1000) / 10, checks, paperBg: m.paperBg, hairlineSample: m.hairline.sample, eyebrow: m.eyebrow, ctaPair: m.ctaPair };
}
function scoreInk(m) {
  const checked = m.texts.filter((t) => !t.inkSkipped).length;
  const skipped = m.texts.length - checked;
  const score = checked ? Math.round(((checked - m.inkFails.length) / checked) * 1000) / 10 : 0;
  return { score, checked, fails: m.inkFails.length, skipped, floor: INK_FLOOR, worst: m.inkFails.slice(0, 50), skippedSeats: m.texts.filter((t) => t.inkSkipped).map((t) => ({ text: t.text, reason: t.inkReason })).slice(0, 25) };
}
function scoreEdge(m) {
  if (!m.edge) return { score: 100, gutters: null, note: "n/a outside the 390 bp" };
  const okL = Math.abs(m.edge.l - EDGE390_TARGET) <= EDGE390_TOL;
  const okR = Math.abs(m.edge.r - EDGE390_TARGET) <= EDGE390_TOL;
  return { score: okL && okR ? 100 : 0, gutters: m.edge, target: EDGE390_TARGET, tol: EDGE390_TOL };
}
async function scoreHover(page, m) {
  if (!m.ctaSel) return { score: 0, reason: "no primary CTA found on the route", changed: [] };
  const read = () =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const out = {};
      for (const p of ["color", "backgroundColor", "borderTopColor", "borderBottomColor", "transform", "opacity", "boxShadow", "textDecorationLine"]) out[p] = cs[p];
      for (const pe of ["::before", "::after"]) {
        const pcs = getComputedStyle(el, pe);
        out[pe + ".transform"] = pcs.transform;
        out[pe + ".backgroundColor"] = pcs.backgroundColor;
      }
      return out;
    }, m.ctaSel);
  await page.mouse.move(2, 2); // park far away — rest state
  await page.waitForTimeout(650);
  const before = await read();
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, m.ctaSel);
  if (!before || !box) return { score: 0, reason: "CTA vanished before hover", changed: [] };
  await page.mouse.move(box.x, box.y);
  await page.waitForTimeout(650); // mid-transition is still a diff — presence, not value
  const after = await read();
  await page.mouse.move(2, 2);
  const changed = Object.keys(before).filter((k) => before[k] !== after[k]);
  return { score: changed.length >= 2 ? 100 : 0, changed, reason: changed.length >= 2 ? null : "fewer than 2 affordance changes on hover" };
}

// ── runner ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const results = { generatedAt: new Date().toISOString(), url: URL_BASE, routes: ROUTES, bps: BPS_WANTED, themes: THEMES, gateFloor: GATE_FLOOR, routesDetail: {}, worstCell: null };
try {
  for (const route of ROUTES) {
    const url = URL_BASE.replace(/\/+$/, "") + (route.startsWith("/") ? route : "/" + route);
    results.routesDetail[route] = { url, cells: [] };
    process.stdout.write(`▸ route ${route}\n`);
    for (const theme of THEMES) {
      for (const bpName of BPS_WANTED) {
        const w = parseInt(bpName, 10);
        const h = Number.isFinite(w) && w >= 1200 ? 900 : 844;
        const t0 = Date.now();
        const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: "light" });
        if (theme === "dark") {
          // the store's persisted shape (zustand persist v2), BEFORE first load —
          // an attribute-only flip is reverted by the store on hydration.
          await context.addInitScript(() => {
            localStorage.setItem("madarek-theme", JSON.stringify({ state: { mode: "dark", modeUpdatedAt: 1 }, version: 2 }));
          });
        }
        const page = await context.newPage();
        await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(1500);
        await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()));
        await page.waitForTimeout(400);
        const m = await page.evaluate(measureFn, CFG(bpName));
        const checks = {
          typeRungs: scoreTypeRungs(m),
          spacingRhythm: scoreSpacing(m),
          patternUsage: scorePattern(m),
          darkInk: scoreInk(m),
          edge390: scoreEdge(m),
          hover: await scoreHover(page, m),
        };
        const score = Math.round((Object.values(checks).reduce((s, c) => s + c.score, 0) / 6) * 10) / 10;
        const cell = { route, bp: bpName, theme, score, checks };
        results.routesDetail[route].cells.push(cell);
        if (results.worstCell == null || score < results.worstCell.score) results.worstCell = { route, bp: bpName, theme, score };
        process.stdout.write(
          `  ${theme.padEnd(5)} @${bpName.padEnd(4)}  ${String(score).padStart(5)}  ` +
            Object.entries(checks).map(([k, c]) => `${k}:${String(c.score).padStart(4)}`).join("  ") +
            `   (${Date.now() - t0}ms)\n`,
        );
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("\nPAGE CONFORMANCE — per (route × bp × theme); route number = worst cell");
for (const [route, r] of Object.entries(results.routesDetail)) {
  const worst = r.cells.length ? Math.min(...r.cells.map((c) => c.score)) : 0;
  console.log(`  ${route}  →  worst ${worst}`);
  for (const c of r.cells) {
    console.log(
      `    ${c.theme.padEnd(5)} @${c.bp.padEnd(4)} total ${String(c.score).padStart(5)}   ` +
        Object.entries(c.checks).map(([k, v]) => `${k} ${String(v.score).padStart(4)}`).join(" · "),
    );
  }
}
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nresults → ${OUT}   (worst cell: ${results.worstCell ? `${results.worstCell.route} ${results.worstCell.theme}@${results.worstCell.bp} = ${results.worstCell.score}` : "n/a"})`);

if (GATE) {
  const bad = [];
  for (const [route, r] of Object.entries(results.routesDetail))
    for (const c of r.cells) if (c.score < GATE_FLOOR) bad.push(`${route} ${c.theme}@${c.bp} = ${c.score}`);
  if (bad.length) {
    console.error(`pages.mjs GATE: FAIL — cells below ${GATE_FLOOR}:\n  ${bad.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`pages.mjs GATE: PASS — every cell ≥ ${GATE_FLOOR}`);
}
