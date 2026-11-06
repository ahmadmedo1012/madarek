#!/usr/bin/env node
/**
 * run.mjs — R336 conformance suite runner (v2 — honest instrument).
 *
 * Compares OUR landing page (http://localhost:5173, React/Vite, RTL Arabic)
 * against the FROZEN Heron specs in docs/redesign/r335/heron-spec/ —
 * deterministic, machine-checkable, NO live Heron dependency, NO screenshots.
 *
 * v2 (the R336 instrument fix — a pass-rate built on unmatched elements and
 * waivers is a self-graded metric):
 *   · MATCHING: explicit-first. (a) data-spec hooks: our elements carrying
 *     data-spec="<section>.<role>" map to the spec role path via the
 *     mapping's "spec" field; (b) legacy explicit selectors; (c) heuristic
 *     (tag+tc ordinal) ONLY for elements the mapping marks heuristic-ok.
 *     Every UNMATCHED spec element is reported as a FAIL row of kind
 *     `no-counterpart` (with its role path) unless the mapping lists it in
 *     "noCounterpart" with a reason (then it is counted as excused and
 *     reported by name — never silently dropped).
 *   · TOLERANCES: transformed expectations (tolerances.mjs v2) — the Arabic
 *     adaptations assert, they do not waive. exceptions.json keeps only
 *     true waivers (tc ±1 class today), capped <5%.
 *   · MATRIX: one report covers every section × every breakpoint requested
 *     (default all 9 sections × all 5 bps); results.json carries the full
 *     per-cell detail plus mapping quality (explicit/heuristic/unmatched/
 *     excused counts per cell).
 *   · GATE: `--gate` compares the overall pass-rate against the RATCHET file
 *     (ratchet.json, committed) — the run fails if the rate is below the
 *     ratchet; after a green run with `--ratchet` the file updates to the
 *     new rate (monotonic — the number may never drop).
 *
 * Usage:
 *   node scripts/conformance/run.mjs                            # 9 sections × 5 bps
 *   node scripts/conformance/run.mjs --sections home-hero-wrap,footer --bps 1440,390
 *   node scripts/conformance/run.mjs --gate                     # CI: exit 1 below ratchet
 *   node scripts/conformance/run.mjs --ratchet                  # raise ratchet to current rate
 *   node scripts/conformance/run.mjs --dark                     # + dark internal-consistency pass (spec is light-only)
 *   node scripts/conformance/run.mjs --url http://localhost:5174/
 *
 * Output: console matrix + scripts/conformance/results.json.
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as T from "./tolerances.mjs";
import { feel as scrollFeel, assert as scrollCurves } from "./scroll.mjs";
import { interact as interactStates, patterns as patternCheck } from "./interact.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
let chromium;
try {
  ({ chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright"));
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json"))("playwright");
}

const SPEC_DIR = join(WORKTREE, "docs", "redesign", "r335", "heron-spec");
const MAPPING = readdirSync(join(__dirname, "mapping"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .reduce(
    (acc, f) => {
      const part = JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8"));
      Object.assign(acc.ourSection, part.ourSection);
      Object.assign(acc.heronPageKey ?? (acc.heronPageKey = {}), part.heronPageKey);
      Object.assign(acc.scaleFactor ?? (acc.scaleFactor = {}), part.scaleFactor);
      acc.explicit.push(...(part.explicit ?? []));
      acc.noCounterpart.push(...(part.noCounterpart ?? []));
      acc.charSplit.push(...(part.charSplit ?? []));
      acc.plumbing.push(...(part.plumbing ?? []));
      return acc;
    },
    { ourSection: {}, heronPageKey: {}, scaleFactor: {}, explicit: [], noCounterpart: [], charSplit: [], plumbing: [] },
  );
const EXCEPTIONS = JSON.parse(readFileSync(join(__dirname, "exceptions.json"), "utf8"));
const SECTIONS = Object.keys(MAPPING.ourSection);

// r339 T-02 audit — skip-group grammar validation. The run() loop only
// recognizes the five field groups below; an unknown name in a mapping's
// skip array (platform.json carried "border"/"radius"/"bg" — dead letters,
// silently ignored) means the author believes checks are skipped while the
// instrument keeps measuring them. Fail loud at startup instead.
const VALID_SKIP_GROUPS = new Set(["tag", "tc", "geometry", "type", "color"]);
{
  const bad = [];
  for (const m of MAPPING.explicit) for (const g of m.skip ?? []) if (!VALID_SKIP_GROUPS.has(g)) bad.push(`explicit[${m.section}] skip:"${g}"`);
  for (const p of MAPPING.plumbing) for (const g of p.skip ?? []) if (!VALID_SKIP_GROUPS.has(g)) bad.push(`plumbing[${p.section}] skip:"${g}"`);
  if (bad.length) {
    console.error(`unknown skip group(s) in mapping files (valid: tag, tc, geometry, type, color — radius/opacity/border/interactive/transition are deliberately unskippable):\n  ${[...new Set(bad)].join("\n  ")}`);
    process.exit(2);
  }
}
const BPS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 900 },
  { name: "390", width: 390, height: 844 },
];

// ── args ─────────────────────────────────────────────────────────────────────
const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const SECTIONS_WANTED = arg("sections", null)?.split(",").map((s) => s.trim()) ?? SECTIONS;
const BPS_WANTED = arg("bps", null)?.split(",").map((b) => b.trim()) ?? BPS.map((b) => b.name);
const GATE = process.argv.includes("--gate");
const WITH_SCROLL = process.argv.includes("--scroll");
const WITH_INTERACT = process.argv.includes("--interact");
const RATCHET_UPDATE = process.argv.includes("--ratchet");
const RATCHET_FILE = join(__dirname, "ratchet.json");
const OUT = arg("out", join(__dirname, "results.json"));
const URL = arg("url", "http://localhost:5173/");
const DARK = process.argv.includes("--dark");
const unknown = SECTIONS_WANTED.filter((s) => !MAPPING.ourSection[s]);
if (unknown.length) {
  console.error(`unknown section key(s): ${unknown.join(", ")} — known: ${SECTIONS.join(", ")}`);
  process.exit(2);
}
// The noCounterpart reasons are per spec-path suffix; pre-compile.
const NO_COUNTERPART = MAPPING.noCounterpart; // [{section, heron, reason}]

// R338 T-14a — plumbing-skip rules (mapping "plumbing": [{section, heron,
// skip: ["geometry", …], reason}]) + per-binding explicit[].skip arrays.
// A skipped field-group never enters the pass/fail denominator — every
// skipped CHECK is counted (cell.skipped) and listed in
// results.skippedReport with its written reason. Real boxes keep every
// non-declared assertion.
const PLUMBING = MAPPING.plumbing;

// R338 lead (wave-27): per-bp heron paths. A mapping record's heron-side
// path field (heron | spec | container) may be an object keyed by bp name
// ({"390":"…","768":"…","default":"…"}) and/or the record may carry
// bps:["768","390"] so bindings can follow heron's divergent wrappers per
// breakpoint. Expand per bp: object → the bp's own path, else default,
// else the numerically nearest recorded bp; bps-scoped records drop
// outside their declared bps. String records pass through untouched.
const bpPath = (v, bpName) => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    if (bpName && v[bpName] != null) return v[bpName];
    if (v.default != null) return v.default;
    const nums = Object.keys(v).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
    if (!nums.length || !bpName) return null;
    const w = Number(bpName);
    const near = nums.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
    return v[String(near)] ?? null;
  }
  return v;
};
const bpSel = (rec, bpName) => !(Array.isArray(rec?.bps) && rec.bps.length && !rec.bps.includes(bpName));
const expandBp = (rec, bpName) => {
  if (!bpSel(rec, bpName)) return null;
  const r = { ...rec };
  for (const k of ["heron", "spec", "container"]) r[k] = bpPath(rec[k], bpName);
  return r;
};
const GROUP_CHECKS = { tag: 1, tc: 1, geometry: 4, type: 4, color: 2 };

// R338 T-14a — WCAG relative luminance/contrast for the dark internal-
// consistency check (unflipped light-ink-on-dark-surface detection).
// T-14a2 v2 — colors carry ALPHA: an rgba()/color(srgb)/oklch() ink is
// COMPOSITED over the (pre-composited, opaque) effective background before
// the ratio. v1 silently returned null on anything its regex missed and
// ignored the alpha channel entirely, so translucent seats went uncounted
// (33 usecase seats showed 0 fails while the honest ratio was 1.0:1).
// Still-unparseable pairs return null — the caller REPORTS those as
// skipped, never silently.
const COLOR_JS = String.raw`(() => {
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
  return { parseColor };
})`;
const { parseColor } = new Function("return (" + COLOR_JS + ")")()();
function relLum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
// contrast of a (possibly translucent) ink vs a PRE-COMPOSITED opaque bg;
// element opacity multiplies the ink alpha. null ⇒ caller reports a skip.
function contrastRatio(inkStr, bgStr, opacity = 1) {
  const ink = parseColor(inkStr), bg = parseColor(bgStr);
  if (!ink || !bg || !Number.isFinite(ink.a) || !Number.isFinite(bg.a) || bg.a < 1) return null;
  const a = Math.max(0, Math.min(1, ink.a * opacity));
  const fg = a >= 1 ? ink : { r: ink.r * a + bg.r * (1 - a), g: ink.g * a + bg.g * (1 - a), b: ink.b * a + bg.b * (1 - a) };
  const li = relLum(fg), lb = relLum(bg);
  return (Math.max(li, lb) + 0.05) / (Math.min(li, lb) + 0.05);
}

// ── the in-page measurement walk (SAME shape as scripts/spec/extract-heron.mjs) ──
const WALK_JS = String.raw`
() => {
  const px = (v) => (v && String(v).endsWith("px") ? Math.round(parseFloat(v) * 100) / 100 : v === "0px" ? 0 : v);
  function textClass(el) {
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const len = own.length;
    return len === 0 ? "none" : len < 24 ? "short" : len < 80 ? "medium" : "long";
  }
  function decompose(tr) {
    if (!tr || tr === "none" || tr === "matrix(1, 0, 0, 1, 0, 0)") return null;
    const m = tr.match(/matrix\(([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\)/);
    if (!m) return tr;
    const a = Number(m[1]), b = Number(m[2]), e = Number(m[5]), f = Number(m[6]);
    return { tx: Math.round(e * 100) / 100, ty: Math.round(f * 100) / 100, scale: Math.round(Math.sqrt(a * a + b * b) * 1000) / 1000, rotateDeg: Math.round(((Math.atan2(b, a) * 180) / Math.PI) * 10) / 10 };
  }
  function pathOf(el, wrapEl, wrapKey) {
    const segs = [];
    let n = el;
    const stop = wrapEl.parentElement;
    while (n && n !== stop && segs.length < 6) {
      let idx = 1, sib = n;
      while ((sib = sib.previousElementSibling)) idx++;
      segs.unshift(n.tagName.toLowerCase() + "[" + idx + "]");
      n = n.parentElement;
    }
    if (segs.length) segs[0] = segs[0].replace(/\[\d+\]$/, "[1]");
    return wrapKey + " > " + segs.join(" > ");
  }
  function makeWalk(wrapEl, wrapKey, out) {
    const walk = (el) => {
      if (out.length > 2200 || el.nodeType !== 1) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && el.children.length === 0) return;
      out.push({
        p: pathOf(el, wrapEl, wrapKey),
        tag: el.tagName.toLowerCase(),
        tc: textClass(el),
        leaf: el.children.length === 0,
        ds: el.getAttribute("data-spec") || null,
        vr: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        sr: { x: Math.round(r.left - wr.left), y: Math.round(r.top - wr.top), w: Math.round(r.width), h: Math.round(r.height) },
        fs: px(cs.fontSize), lh: px(cs.lineHeight), fw: cs.fontWeight, ls: px(cs.letterSpacing),
        ff: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        color: cs.color, bg: cs.backgroundColor, bgImg: cs.backgroundImage !== "none",
        border: cs.borderTopWidth !== "0px" ? { w: px(cs.borderTopWidth), c: cs.borderTopColor, style: cs.borderTopStyle } : null,
        radius: px(cs.borderTopLeftRadius),
        pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px),
        margin: [cs.marginTop, cs.marginBottom].map(px),
        gap: px(cs.gap),
        opacity: Number(cs.opacity),
        transform: decompose(cs.transform),
        interactive: el.tagName === "A" || el.tagName === "BUTTON" || cs.cursor === "pointer" || el.getAttribute("role") === "button",
        transition: cs.transitionProperty !== "all" || cs.transitionDuration !== "0s"
          ? { p: cs.transitionProperty, d: cs.transitionDuration, e: cs.transitionTimingFunction } : null,
        anim: cs.animationName !== "none" ? { name: cs.animationName, d: cs.animationDuration, iter: cs.animationIterationCount } : null,
      });
      for (const c of el.children) walk(c);
    };
    const wr = wrapEl.getBoundingClientRect();
    return walk;
  }
  return { makeWalk, pathOf };
}
`;

async function SCROLL_WALK_JS(sectionSelectors) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const seat = (y) => {
    const L = window.__mdrkLenis;
    if (L && typeof L.scrollTo === "function") L.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };
  await sleep(200);
  const els = sectionSelectors.map((s) => ({ sel: s, el: document.querySelector(s) }));
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const vh = window.innerHeight;
  const steps = 60;
  const rows = [];
  for (let i = 0; i <= steps; i++) {
    seat(Math.round((max * i) / steps));
    await sleep(110);
    const y = window.scrollY;
    const tops = [], hs = [];
    for (const { sel, el } of els) {
      if (!el) { tops.push(null); hs.push(null); continue; }
      const r = el.getBoundingClientRect();
      tops.push(Math.round((r.top / vh) * 1000) / 1000);
      hs.push(Math.round((r.height / vh) * 1000) / 1000);
    }
    rows.push([y, tops, hs]);
  }
  seat(0);
  await sleep(400);
  return { vh, scrollHeight: document.documentElement.scrollHeight, keys: sectionSelectors, rows };
}

// ── matching v2 ───────────────────────────────────────────────────────────────
// specRole: the role key of a spec path within a section —
// "home-why-wrap > div[1] > section[1] > div[2] > h2[1]" → "div.section.div.h2"
// (tag chain, drop indices, drop the wrap key). data-spec values carry the
// same grammar: "why.title", "why.stage.1" … the mapping's "spec" field
// binds a spec path (exact or suffix) to a data-spec key.
function specPathMatches(specPath, pattern) {
  return specPath === pattern || specPath.endsWith(" > " + pattern) || pattern.endsWith(" > " + specPath);
}
function findNoCounterpartReason(section, specPath, bpName) {
  for (const nc of NO_COUNTERPART) {
    if (!bpSel(nc, bpName)) continue;
    const path = bpPath(nc.heron, bpName);
    if (path != null && nc.section === section && specPathMatches(specPath, path)) return nc.reason;
  }
  return null;
}

function matchPairs(heronEls, ourEls, explicitIdx, section, charSplitRules = [], bpNow = null) {
  const BP_NOW = bpNow; // threaded to findNoCounterpartReason for per-bp paths
  // R337 ar-char-split: spec scaffold boxes (the tween's per-character
  // divs under the h2 line containers) never enter heuristic pairing —
  // the per-container aggregate owns them; letting them pair by ordinal
  // glues them to unrelated elements and produces junk failures.
  const pairs = [];
  const usedOurs = new Set();
  // R338 T-02a (usecase word-split, r337-intro 37705268 precedent):
  // Heron's row text tween splits titles/lines into per-WORD divs which
  // the depth-6-truncating census records as SIBLING SETS (>=3 boxes,
  // identical fs/fw/color, text-bearing) under shallow roots — sometimes
  // sharing a path with the REAL un-split line box. Structural detection
  // on the SPEC side only; no value comparison against our elements.
  const wordsetMode = charSplitRules.some((c) => c.container === "wordset");
  const wordSet = new Set();
  if (wordsetMode) {
    const byParent = new Map();
    for (const h of heronEls) {
      const par = h.p.split(" > ").slice(0, -1).join(" > ");
      if (!byParent.has(par)) byParent.set(par, []);
      byParent.get(par).push(h);
    }
    for (const sibs of byParent.values()) {
      if (sibs.length < 3) continue;
      const sig = (e) => `${e.fs}|${e.fw}|${e.color}|${e.tc}`;
      const counts = new Map();
      for (const sb of sibs) counts.set(sig(sb), (counts.get(sig(sb)) || 0) + 1);
      for (const sb of sibs) if (sb.tc !== "none" && sb.fs != null && counts.get(sig(sb)) >= 3) wordSet.add(sb);
    }
  }
  // (a) explicit (legacy selectors + data-spec resolved by the page walk)
  for (const h of heronEls) {
    const ex = explicitIdx[h.p];
    if (wordsetMode && wordSet.has(h)) continue; // scaffold never pairs — the real line box (non-member, same truncated path when duplicated) keeps the binding
    if (ex && ourEls[ex.idx] && !usedOurs.has(ex.idx)) {
      usedOurs.add(ex.idx);
      pairs.push({ h, o: ourEls[ex.idx], mode: ex.ds ? "data-spec" : "explicit", skip: new Set(ex.skip) });
    }
  }
  // (b) heuristic: same tag + same tc, ordinal within group — allowed only
  // as a fallback; every heuristic pair is reported so the debt is visible.
  const byKey = new Map();
  ourEls.forEach((o, i) => {
    if (usedOurs.has(i)) return;
    const k = o.tag + "|" + o.tc;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(i);
  });
  let heuristic = 0;
  for (const h of heronEls) {
    if (pairs.some((p) => p.h === h)) continue;
    if (charSplitRules.some((c) => h.p.includes(c.container) && !isLineContainerPath(h.p))) continue;
    if (wordsetMode && wordSet.has(h)) continue;
    const q = byKey.get(h.tag + "|" + h.tc);
    if (q && q.length) {
      const i = q.shift();
      usedOurs.add(i);
      pairs.push({ h, o: ourEls[i], mode: "heuristic", skip: new Set() });
      heuristic++;
    }
  }
  const unmatched = [];
  for (const h of heronEls) {
    if (pairs.some((p) => p.h === h)) continue;
    unmatched.push({ h, reason: findNoCounterpartReason(section, h.p, BP_NOW) });
  }
  return { pairs, heuristic, explicit: pairs.length - heuristic, unmatched, wordSet };
}

// a path is a LINE CONTAINER when the segment before its last is the h2
// itself ("… > h2[1] > div[3]") — scaffold boxes are deeper and their
// penultimate segment is a plain div.
function isLineContainerPath(p) {
  return p.split(" > ").slice(-2)[0] === "h2[1]";
}

// ── runner ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const results = { generatedAt: new Date().toISOString(), url: URL, specDir: SPEC_DIR, summary: {}, sections: {}, failures: [], unmatchedReport: [], skippedReport: [] };
let totalPass = 0, totalFail = 0, exceptionUses = 0;
let darkPass = 0, darkFail = 0, darkContrast = 0, darkContrastSkipped = 0;
const darkSettle = []; // T-14a2: per-bp post-flip settle evidence (stability frames)
let darkTheme = null; // hoisted: the summary + dark matrix read it after the bp loop
const exRules = {};
const matrix = {}; // section -> bp -> cell

try {
  for (const bp of BPS.filter((b) => BPS_WANTED.includes(b.name))) {
    const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
    process.stdout.write(`▸ bp ${bp.name} … `);
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);

    // 1) seat-scroll walk → our columnar marks
    const ourSels = SECTIONS_WANTED.map((s) => MAPPING.ourSection[s]);
    const ourGeo = await page.evaluate(SCROLL_WALK_JS, ourSels);

    // 2) heron frozen marks
    let heronPage = null;
    try { heronPage = JSON.parse(readFileSync(join(SPEC_DIR, `_page.${bp.name}.json`), "utf8")); } catch { /* optional */ }
    const vh = heronPage?.vh || bp.height;
    const yToVhHeron = (y) => Math.round((y / vh) * 1000) / 1000;

    // 3) per-section DOM walk (now records data-spec)
    const ours = {};
    for (const key of SECTIONS_WANTED) {
      const sel = MAPPING.ourSection[key];
      const explicit = MAPPING.explicit.filter((m) => m.section === key).map((m) => expandBp(m, bp.name)).filter(Boolean);
      const data = await page.evaluate(({ key, sel, explicit, WALK }) => {
        const { makeWalk, pathOf } = new Function("return (" + WALK + ")")()();
        const el = document.querySelector(sel);
        if (!el) return { missing: sel };
        const out = [];
        makeWalk(el, key, out)(el);
        const explicitIdx = {};
        // legacy selector mappings
        for (const m of explicit) {
          if (m.spec) continue; // data-spec bindings handled below
          const t = m.scope === "page" ? document.querySelector(m.ours) : el.querySelector(m.ours) || (el.matches(m.ours) ? el : null);
          if (!t) continue;
          const p = t === el ? key + " > " + t.tagName.toLowerCase() + "[1]" : pathOf(t, el, key);
          const i = out.findIndex((e) => e.p === p);
          if (i >= 0) explicitIdx[m.heron] = { idx: i, skip: m.skip || [] };
        }
        // data-spec bindings: mapping "spec" = spec path (exact/suffix),
        // "ours" = the data-spec key ("why.title")
        for (const m of explicit) {
          if (!m.spec) continue;
          const i = out.findIndex((e) => e.ds === m.ours || (e.ds && e.ds === key + "." + m.ours));
          if (i >= 0) explicitIdx[m.heron] = { idx: i, skip: m.skip || [], ds: true };
        }
        return { elements: out, rectVh: Math.round((el.getBoundingClientRect().height / window.innerHeight) * 1000) / 1000, explicitIdx };
      }, { key, sel, explicit, WALK: WALK_JS });
      ours[key] = data;
    }

    // 3.5) R338 T-14a — dark path: flip the theme exactly the way the site
    // does (ThemeToggle sets <html data-theme>; tokens.generated.css
    // redefines the token blocks under [data-theme="dark"]), wait out the
    // swap (AppShell pins data-theme-swapping → transitions off), then
    // re-walk the same sections. The frozen Heron spec is LIGHT-ONLY (no
    // dark recordings exist), so the dark pass measures OUR internal
    // consistency — see the dark compare block in step 4 for the exact
    // assertion set.
    let darkOurs = null;
    if (DARK) {
      darkTheme = await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
        return { attr: document.documentElement.getAttribute("data-theme"), scheme: getComputedStyle(document.documentElement).colorScheme };
      });
      // T-14a2 — deterministic post-flip settle. v1's fixed 900ms sleep
      // raced the post-flip re-layout: identical dark runs at 390 showed
      // +7.1/+14.0px row offsets inside .rl-acc (every computed geometry
      // property identical light↔dark, varying across runs). Now: wait out
      // the swap window, then fonts.ready → rAF×2 → rect-stability (3
      // consecutive identical frames over every section + first 400
      // descendants, bounded at 180 frames ≈ 3s so a perpetual animation
      // can never hang the run — it reports settled:false instead).
      await page.waitForTimeout(900);
      const settled = await page.evaluate((sels) => {
        const sig = () => JSON.stringify(sels.map((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const parts = [r.x, r.y, r.width, r.height, el.scrollHeight];
          const kids = el.querySelectorAll("*");
          for (let i = 0; i < kids.length && i < 400; i++) { const k = kids[i].getBoundingClientRect(); parts.push(Math.round(k.y * 10) / 10, Math.round(k.height * 10) / 10); }
          return parts.map((v) => Math.round(v * 100) / 100);
        }));
        return new Promise((resolve) => {
          const start = () => {
            let prev = sig(), stable = 0, tries = 0;
            const tick = () => {
              tries++;
              const cur = sig();
              if (cur === prev) stable++; else stable = 0;
              prev = cur;
              if (stable >= 3) return resolve({ settled: true, frames: tries });
              if (tries >= 180) return resolve({ settled: false, frames: tries });
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          };
          (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(start)));
        });
      }, ourSels);
      darkSettle.push({ bp: bp.name, ...settled });
      darkOurs = {};
      for (const key of SECTIONS_WANTED) {
        const sel = MAPPING.ourSection[key];
        darkOurs[key] = await page.evaluate(({ key, sel, WALK, COLOR }) => {
          const { makeWalk, pathOf } = new Function("return (" + WALK + ")")()();
          const { parseColor: parse } = new Function("return (" + COLOR + ")")()();
          const el = document.querySelector(sel);
          if (!el) return { missing: sel };
          const out = [];
          makeWalk(el, key, out)(el);
          // T-14a2 — effective background = COMPOSITED ancestor background
          // stack: climbs like a renderer would, collecting rgba layers
          // until an opaque one, then blends them over the CSS canvas
          // (white). v1 returned the first non-transparent layer and thus
          // treated translucent surfaces as opaque → wrong ratios; an
          // unparseable layer reports ebg:null + reason (counted as a
          // REPORTED skip by the caller, never silently dropped).
          const effBg = (node) => {
            const layers = [];
            let n = node, eimg = false;
            while (n && n.nodeType === 1) {
              const cs = getComputedStyle(n);
              if (cs.backgroundImage !== "none") eimg = true;
              const c = parse(cs.backgroundColor);
              if (c == null) return { ebg: null, eimg, reason: "unparseable background layer: " + cs.backgroundColor };
              if (c.a > 0) { layers.push(c); if (c.a >= 1) break; }
              n = n.parentElement;
            }
            let out2 = { r: 255, g: 255, b: 255 };
            for (let i = layers.length - 1; i >= 0; i--) {
              const l = layers[i];
              out2 = { r: l.r * l.a + out2.r * (1 - l.a), g: l.g * l.a + out2.g * (1 - l.a), b: l.b * l.a + out2.b * (1 - l.a) };
            }
            return { ebg: "rgb(" + Math.round(out2.r) + ", " + Math.round(out2.g) + ", " + Math.round(out2.b) + ")", eimg, stack: layers.length };
          };
          const bg = {};
          const visit = (n) => {
            bg[pathOf(n, el, key)] = effBg(n);
            for (const c of n.children) visit(c);
          };
          visit(el);
          return { elements: out, bg };
        }, { key, sel, WALK: WALK_JS, COLOR: COLOR_JS });
      }
    }
    await page.close();

    // 4) compare
    for (const key of SECTIONS_WANTED) {
      const scaleFactor = MAPPING.scaleFactor?.[key] ?? 1.0;
      let spec;
      try { spec = JSON.parse(readFileSync(join(SPEC_DIR, `${key}.${bp.name}.json`), "utf8")); } catch { spec = null; }
      const o = ours[key];
      const cell = (matrix[key] ??= {})[bp.name] ??= { pass: 0, fail: 0, exceptions: 0, explicit: 0, dataSpec: 0, heuristic: 0, unmatched: 0, excused: 0, skipped: 0, missing: null };

      if (!spec || spec.missing) { cell.missing = "no-heron-spec"; continue; }
      if (o.missing) { cell.missing = `no-our-container:${o.missing}`; continue; }

      const charSplitRules = MAPPING.charSplit.filter((c) => c.section === key).map((c) => expandBp(c, bp.name)).filter(Boolean);
      // R338 T-14a — resolve skip field-groups per pair: per-binding
      // explicit[].skip ∪ section plumbing rules (spec-path exact/suffix,
      // same grammar as noCounterpart). Counted + reported, never silent.
      const plumbingRules = PLUMBING.filter((p) => p.section === key).map((p) => expandBp(p, bp.name)).filter(Boolean);
      const skipsFor = (specPath, bindingSkip) => {
        const s = new Set(bindingSkip ?? []);
        let reason = s.size ? "binding-level skip (mapping explicit[].skip)" : null;
        for (const pr of plumbingRules) {
          if (!specPathMatches(specPath, pr.heron)) continue;
          for (const g of pr.skip ?? []) s.add(g);
          reason = pr.reason ?? reason;
        }
        return { s, reason };
      };
      const { pairs, heuristic, explicit, unmatched, wordSet } = matchPairs(spec.elements, o.elements, o.explicitIdx, key, charSplitRules, bp.name);
      cell.heuristic = heuristic;
      cell.explicit = pairs.filter((p) => p.mode === "explicit").length;
      cell.dataSpec = pairs.filter((p) => p.mode === "data-spec").length;
      cell.unmatched = unmatched.filter((u) => !u.reason).length;
      cell.excused = unmatched.filter((u) => !!u.reason).length;

      // R337 ar-char-split — TRANSFORMED expectations, two-segment law.
      // The extractor truncates spec ancestor paths at depth 6, so a
      // line container ("… > h2[1] > div[3]") and its char scaffold
      // boxes (recorded under a shallower truncated root that shares
      // the container's last two segments "h2[1] > div[3]") are tied by
      // those two segments. Per PAIRED line container:
      //   · the container itself stays fully measured (all raw fields);
      //   · ONE aggregate asserts the scaffold typography (fs/lh/fw/
      //     color of the char boxes vs our word boxes) — as strong as
      //     the raw fields were;
      //   · the scaffold boxes are excused with the written word-law
      //     reason, counted once, and pulled out of pair/unmatched
      //     accounting so nothing double-counts.
      const scaffoldKey2 = (p) => p.split(" > ").slice(-2).join(" > ");
      const excusedScaffold = new Set(); // spec paths excused exactly once
      for (const csr of charSplitRules) {
        const containers = pairs.filter((pp) => pp.h.p.includes(csr.container));
        for (const { h: lineH, o: lineO, mode } of containers) {
          const key2 = scaffoldKey2(lineH.p);
          const lineDepth = lineH.p.split(" > ").length;
          const charEls = spec.elements.filter((e) => {
            if (e.p === lineH.p) return false;
            const s = e.p.split(" > ");
            // (a) recorded under the truncated root "wrap > h2[1] > div[N]" —
            //     shares the container's last two segments at depth 2-3;
            // (b) recorded in full under the container — prefix match.
            const viaTrunc = s.slice(1, 3).join(" > ") === key2;
            const viaFull = e.p.startsWith(lineH.p + " > ");
            return (viaTrunc || viaFull);
          });
          if (!charEls.length) continue;
          // r339 T-02 audit (T-06m prescription, never implemented): a REAL
          // char/word scaffold is the container's own text split into boxes —
          // every char box shares the line container's fontSize (±0.5px×scale).
          // A set whose fs deviates is a depth-6 truncation-collision soup
          // (measured in footer: fs 8.3–35.56, fw 400–700 inside one "set"),
          // and the aggregate's expected values would be collision artifacts.
          // Count the 4 aggregate checks as SKIPPED with this written reason
          // (never silent, never in the denominator unreported) and leave the
          // soup elements in normal unmatched accounting: excused only via a
          // written noCounterpart reason, else an honest no-counterpart FAIL.
          const containerFs = T.num(lineH.fs);
          const scaffoldLike = charEls.every((e) => Math.abs(T.num(e.fs) - containerFs) <= 0.5 * scaleFactor);
          if (!scaffoldLike) {
            cell.skipped += 4; // the four typography fields of this aggregate
            results.skippedReport.push({ section: key, bp: bp.name, heronPath: `${lineH.p} (ar-char-split aggregate)`, reason: "ar-char-split aggregate suppressed (r339 T-02 audit, T-06m prescription): char-set fontSize deviates > ±0.5px from the line container — depth-6 truncation-collision soup, not char scaffolding; aggregate expectations would be artifacts. Elements re-enter unmatched accounting (written reason or no-counterpart FAIL)." });
            continue;
          }
          const cfs = charEls.map((e) => T.num(e.fs)), clh = charEls.map((e) => T.num(e.lh));
          const cfw = charEls.map((e) => e.fw), ccol = charEls.map((e) => e.color);
          // our word boxes: the text-bearing descendants of OUR container
          const ourTextEls = o.elements.filter((e) => e.p.startsWith(lineO.p + " > ") && e.tc !== "none");
          // R338 lead (footer anull): an aggregate whose OUR container has
          // NO text-bearing descendants has nothing to measure — the raw
          // fields would all fail with actual:null (junk). Count it as a
          // SKIPPED cell with the written reason (never silent); the char
          // scaffold boxes below still excuse+count exactly once, and any
          // container that DOES carry text stays fully asserted.
          if (!ourTextEls.length) {
            cell.skipped += 4; // the four typography fields of this aggregate
            results.skippedReport.push({ section: key, bp: bp.name, heronPath: `${lineH.p} (ar-char-split aggregate)`, reason: "ar-char-split aggregate: our container carries no text-bearing descendants — nothing to measure (counterpart is structural chrome); counted, not failed" });
            for (const e of charEls) {
              if (excusedScaffold.has(e.p)) continue;
              excusedScaffold.add(e.p);
              cell.excused++;
              results.unmatchedReport.push({ section: key, bp: bp.name, heronPath: e.p, excused: true, reason: "ar-char-split: tween char-scaffolding — Arabic word-split law (joining forbids per-character boxes); container carries no text counterpart" });
            }
            continue;
          }
          const ofs = ourTextEls.map((e) => T.num(e.fs)), olh = ourTextEls.map((e) => T.num(e.lh));
          const ofw = ourTextEls.map((e) => e.fw), ocol = ourTextEls.map((e) => e.color);
          const sel = mode === "data-spec" ? `#ds:${lineO.ds}` : (lineO.p || MAPPING.ourSection[key]);
          const fsOk = ofs.length > 0 && cfs.length > 0 && ofs.every((v) => Math.abs(v - cfs[0]) <= 0.5 * scaleFactor);
          const lhFloor = Math.max(clh[0] || 0, 1.35 * (cfs[0] || 16));
          const lhOk = olh.length > 0 && olh.every((v) => Math.abs(v - lhFloor) <= 0.5 * scaleFactor);
          const fwOk = ofw.length > 0 && cfw.length > 0 && ofw.every((v) => String(v) === String(cfw[0]));
          const colOk = ocol.length > 0 && ccol.length > 0 && ocol.every((c) => T.sameRgb(c, ccol[0]));
          for (const [kIdx, ok, exp, act] of [
            ["fontSize", fsOk, cfs[0], ofs[0] ?? null],
            ["lineHeight", lhOk, Math.round(lhFloor * 100) / 100, olh[0] ?? null],
            ["fontWeight", fwOk, cfw[0], ofw[0] ?? null],
            ["color", colOk, ccol[0], ocol[0] ?? null],
          ]) {
            if (ok) cell.pass++;
            else {
              cell.fail++;
              results.failures.push({ section: key, bp: bp.name, kind: kIdx, heronPath: `${lineH.p} (ar-char-split aggregate)`, oursSelector: sel, mode: "data-spec", expected: exp, actual: act, delta: 0 });
            }
          }
          for (const e of charEls) {
            if (excusedScaffold.has(e.p)) continue;
            excusedScaffold.add(e.p);
            cell.excused++;
            results.unmatchedReport.push({ section: key, bp: bp.name, heronPath: e.p, excused: true, reason: "ar-char-split: tween char-scaffolding — Arabic word-split law (joining forbids per-character boxes); the line container is fully measured + the aggregate typography asserted" });
          }
        }
      }
      // R338 T-02a — wordset mode: unpaired word boxes are excused with
      // the written word-law reason; the REAL line boxes at the same
      // truncated roots stay bound and fully measured, so the typography
      // the words carried is still asserted (as strong as raw fields).
      const excusedWordEls = new Set();
      const wordsetMode = charSplitRules.some((c) => c.container === "wordset"); // section-scope flag (matchPairs computes its own)
      if (wordsetMode) {
        const wsr = charSplitRules.find((c) => c.container === "wordset");
        for (const u of unmatched) {
          if (!wordSet.has(u.h) || u.reason || excusedWordEls.has(u.h)) continue;
          excusedWordEls.add(u.h);
          cell.excused++;
          results.unmatchedReport.push({ section: key, bp: bp.name, heronPath: u.h.p, excused: true, reason: wsr.reason });
        }
      }
      // pull the excused scaffold boxes out of pair/unmatched accounting
      for (let i = pairs.length - 1; i >= 0; i--) {
        if (excusedScaffold.has(pairs[i].h.p)) pairs.splice(i, 1);
      }
      for (let i = unmatched.length - 1; i >= 0; i--) {
        if (excusedScaffold.has(unmatched[i].h.p)) unmatched.splice(i, 1);
      }
      // wordset excuses pull by ELEMENT identity — a truncated path can be
      // shared with the real line box, which must stay measured.
      for (let i = unmatched.length - 1; i >= 0; i--) if (excusedWordEls.has(unmatched[i].h)) unmatched.splice(i, 1);
      for (let i = pairs.length - 1; i >= 0; i--) if (excusedWordEls.has(pairs[i].h)) pairs.splice(i, 1);
      cell.unmatched = unmatched.filter((u) => !u.reason).length;
      cell.excused += unmatched.filter((u) => !!u.reason).length;

      const skippedEntries = [];
      const run = (h, oEl, skip, skipReason, heronPath, oursSel) => {
        const groups = [
          ["tag", () => [T.aTag(h, oEl)]],
          ["tc", () => [T.aTc(h, oEl)]],
          ["geometry", () => [T.aX(h, oEl, bp.width), T.aY(h, oEl, bp.height), T.aW(h, oEl, bp.width), T.aH(h, oEl, bp.height)]],
          ["type", () => [T.aFs(h, oEl, scaleFactor), T.aLh(h, oEl, scaleFactor), T.aFw(h, oEl), T.aLs(h, oEl)]],
          ["color", () => [T.aColor(h, oEl), T.aBg(h, oEl)]],
        ];
        let checks = [];
        for (const [g, make] of groups) {
          if (skip.has(g)) {
            // R338 T-14a — skipped assertions are COUNTED (cell.skipped)
            // and listed (results.skippedReport) — never a silent pass.
            cell.skipped += GROUP_CHECKS[g];
            skippedEntries.push({ heronPath, group: g, checks: GROUP_CHECKS[g], reason: skipReason ?? "(no reason recorded)" });
            continue;
          }
          checks = checks.concat(make());
        }
        checks.push(T.aRadius(h, oEl), T.aOpacity(h, oEl), T.aBorder(h, oEl), T.aInteractive(h, oEl), T.aTransition(h, oEl));
        for (const c of checks) {
          if (!c) continue;
          if (c.pass) cell.pass++;
          else {
            cell.fail++;
            results.failures.push({ section: key, bp: bp.name, kind: c.kind, heronPath, oursSelector: oursSel, mode: oursSel.startsWith("#hm:") ? "heuristic" : (oursSel.startsWith("#ds:") ? "data-spec" : "explicit"), expected: c.expected, actual: c.actual, delta: Math.round(c.delta * 100) / 100 });
          }
          if (c.exception) { cell.exceptions++; exceptionUses++; if (c.rule) exRules[c.rule] = (exRules[c.rule] || 0) + 1; }
        }
      };
      for (const { h, o: oEl, mode, skip } of pairs) {
        const { s: skipSet, reason: skipReason } = skipsFor(h.p, skip);
        run(h, oEl, skipSet, skipReason, h.p, mode === "heuristic" ? `#hm:${h.tag}.${h.tc}` : mode === "data-spec" ? `#ds:${oEl.ds}` : (oEl.p || MAPPING.ourSection[key]));
      }
      for (const e of skippedEntries) results.skippedReport.push({ section: key, bp: bp.name, ...e });

      // v2: every unmatched spec element is a FAILURE by default — either a
      // real gap (kind no-counterpart, fix by adding the element + mapping)
      // or excused with a written reason (counted, reported, never silent).
      for (const { h, reason } of unmatched) {
        if (reason) {
          results.unmatchedReport.push({ section: key, bp: bp.name, heronPath: h.p, excused: true, reason });
        } else {
          cell.fail++;
          results.failures.push({ section: key, bp: bp.name, kind: "no-counterpart", heronPath: h.p, oursSelector: "(none)", mode: "unmatched", expected: "an element conforming to the spec role", actual: "no counterpart element", delta: 0 });
        }
      }

      // R338 T-14a — DARK internal-consistency (frozen spec is LIGHT-ONLY,
      // so there are no dark reference values). What --dark asserts, on the
      // SAME pairs, measured on the dark-flipped DOM:
      //   · the theme actually flipped: html[data-theme="dark"] (the exact
      //     mechanism the site's ThemeToggle uses);
      //   · geometry + type + radius/opacity/border/interactive/transition
      //     re-asserted vs the frozen (light) spec — a theme flip must not
      //     move a box or retype a line;
      //   · the color group is NOT compared to the light spec (differs by
      //     design); instead: (a) flip census — ≥1 paired element per
      //     section must change color/bg light→dark (token-driven theming;
      //     catches a section with no dark arm); (b) contrast floor — every
      //     text-bearing/interactive paired element keeps contrast ≥ 3.0
      //     against its effective (nearest opaque ancestor) background —
      //     catches unflipped raw light inks unreadable on dark surfaces.
      if (DARK && darkOurs?.[key] && !darkOurs[key].missing && !o.missing) {
        const dd = darkOurs[key];
        const dcell = (cell.dark ??= { pass: 0, fail: 0, flips: 0, contrastChecked: 0, contrastSkipped: 0, contrastReported: 0, themeApplied: darkTheme?.attr === "dark" });
        if (darkTheme?.attr !== "dark") {
          dcell.fail++; darkFail++;
          results.failures.push({ section: key, bp: bp.name, kind: "dark-theme-not-applied", heronPath: "(html)", oursSelector: "(theme)", mode: "dark", expected: 'html[data-theme="dark"] after flip (site ThemeToggle mechanism)', actual: `data-theme=${darkTheme?.attr}, color-scheme=${darkTheme?.scheme}`, delta: 0 });
        }
        const lightByPath = new Map(o.elements.map((e) => [e.p, e]));
        const darkByPath = new Map(dd.elements.map((e) => [e.p, e]));
        let flipped = 0;
        for (const { h, o: oEl, skip } of pairs) {
          const dl = darkByPath.get(oEl.p);
          if (!dl) continue;
          const { s: sk } = skipsFor(h.p, skip);
          const darkChecks = [];
          if (!sk.has("tag")) darkChecks.push(T.aTag(h, dl));
          if (!sk.has("tc")) darkChecks.push(T.aTc(h, dl));
          if (!sk.has("geometry")) darkChecks.push(T.aX(h, dl, bp.width), T.aY(h, dl, bp.height), T.aW(h, dl, bp.width), T.aH(h, dl, bp.height));
          if (!sk.has("type")) darkChecks.push(T.aFs(h, dl, scaleFactor), T.aLh(h, dl, scaleFactor), T.aFw(h, dl), T.aLs(h, dl));
          darkChecks.push(T.aRadius(h, dl), T.aOpacity(h, dl), T.aBorder(h, dl), T.aInteractive(h, dl), T.aTransition(h, dl));
          for (const c of darkChecks) {
            if (!c) continue;
            if (c.pass) { dcell.pass++; darkPass++; }
            else {
              dcell.fail++; darkFail++;
              results.failures.push({ section: key, bp: bp.name, kind: c.kind, heronPath: h.p, oursSelector: oEl.p, mode: "dark", expected: c.expected, actual: c.actual, delta: Math.round(c.delta * 100) / 100 });
            }
          }
          const lo = lightByPath.get(oEl.p);
          if (lo && (lo.color !== dl.color || lo.bg !== dl.bg)) flipped++;
          const bgInfo = dd.bg?.[oEl.p];
          if ((dl.tc !== "none" || dl.interactive) && bgInfo && !bgInfo.eimg && dl.opacity >= 0.3) {
            const ratio = bgInfo.ebg == null ? null : contrastRatio(dl.color, bgInfo.ebg, dl.opacity);
            if (ratio != null) {
              dcell.contrastChecked++; darkContrast++;
              if (ratio >= 3) { dcell.pass++; darkPass++; }
              else {
                dcell.fail++; darkFail++;
                results.failures.push({ section: key, bp: bp.name, kind: "dark-contrast", heronPath: h.p, oursSelector: oEl.p, mode: "dark", expected: "contrast ≥ 3.0 vs composited effective background (rgba inks alpha-blended; dark internal consistency)", actual: `${Math.round(ratio * 100) / 100} — ${dl.color}${dl.opacity < 1 ? ` ×opacity ${dl.opacity}` : ""} on ${bgInfo.ebg}`, delta: 0 });
              }
            } else {
              // T-14a2 — an applicable-but-uncountable seat is REPORTED as
              // skipped (skippedReport + counters), never silently dropped
              // the way v1 dropped null-ratio rgba seats.
              dcell.contrastSkipped++; dcell.contrastReported++; darkContrastSkipped++;
              results.skippedReport.push({ section: key, bp: bp.name, kind: "dark-contrast", heronPath: h.p, oursSelector: oEl.p, reason: bgInfo.ebg == null ? bgInfo.reason || "no effective background" : `uncountable color pair: ${dl.color} on ${bgInfo.ebg}` });
            }
          } else dcell.contrastSkipped++;
        }
        dcell.flips = flipped;
        if (pairs.length && flipped === 0) {
          dcell.fail++; darkFail++;
          results.failures.push({ section: key, bp: bp.name, kind: "dark-no-flip", heronPath: MAPPING.ourSection[key], oursSelector: MAPPING.ourSection[key], mode: "dark", expected: "≥1 paired element color/bg flips light→dark (token-driven theme)", actual: "0 flips — section has no dark arm", delta: 0 });
        } else if (pairs.length) { dcell.pass++; darkPass++; }
      }

      // page-level: section height vh + pin spans
      if (heronPage?.marks && MAPPING.heronPageKey[key]) {
        const hk = heronPage.marks.keys.indexOf(MAPPING.heronPageKey[key]);
        const ok = ourGeo.keys.indexOf(MAPPING.ourSection[key]);
        if (hk >= 0 && ok >= 0) {
          const row0h = heronPage.marks.rows.find((r) => r[0] === 0) || heronPage.marks.rows[0];
          const hVh0 = row0h[2][hk], oVh0 = ourGeo.rows[0][2][ok];
          if (hVh0 != null && oVh0 != null) {
            const c = T.aSectionVh(hVh0, oVh0);
            c.pass ? cell.pass++ : (cell.fail++, results.failures.push({ section: key, bp: bp.name, kind: c.kind, heronPath: MAPPING.heronPageKey[key], oursSelector: MAPPING.ourSection[key], expected: c.expected, actual: c.actual, delta: Math.round(c.delta * 100) / 100 }));
          }
          const hSpans = T.pinSpans(heronPage.marks, hk, yToVhHeron);
          const oSpans = T.pinSpans({ rows: ourGeo.rows }, ok, (y) => Math.round((y / ourGeo.vh) * 1000) / 1000);
          const n = Math.max(hSpans.length, oSpans.length);
          for (let i = 0; i < n; i++) {
            const c = T.aPinSpan(hSpans[i] || null, oSpans[i] || null);
            if (!c) continue;
            c.pass ? cell.pass++ : (cell.fail++, results.failures.push({ section: key, bp: bp.name, kind: c.kind, heronPath: `${MAPPING.heronPageKey[key]}#pin${i}`, oursSelector: MAPPING.ourSection[key], expected: JSON.stringify(c.expected), actual: JSON.stringify(c.actual), delta: Math.round(c.delta * 100) / 100 }));
          }
        }
      }
      totalPass += cell.pass; totalFail += cell.fail;
    }
    process.stdout.write(`${Date.now() - t0}ms\n`);
  }
} finally {
  await browser.close();
}

// ── extensions (R337): scroll feel + scrub curves + interaction + patterns ──
if (WITH_SCROLL || GATE) {
  try {
    const feelRes = await scrollFeel(URL, BPS_WANTED);
    totalPass += feelRes.pass; totalFail += feelRes.fail;
    results.scrollFeel = feelRes;
    for (const f of feelRes.failures) results.failures.push({ section: "(scroll)", bp: f.bp, kind: f.kind, heronPath: "-", oursSelector: "-", mode: "scroll", expected: f.expected, actual: f.actual, delta: 0 });
    const curveRes = await scrollCurves(URL, BPS_WANTED);
    totalPass += curveRes.pass; totalFail += curveRes.fail;
    results.scrollCurves = { pass: curveRes.pass, fail: curveRes.fail };
    for (const f of curveRes.failures) results.failures.push({ section: "(scroll-curve)", bp: f.bp, kind: f.kind, heronPath: f.trigger ?? "-", oursSelector: "-", mode: "scroll-curve", expected: typeof f.expected === "object" ? JSON.stringify(f.expected) : f.expected, actual: typeof f.actual === "object" ? JSON.stringify(f.actual) : f.actual, delta: f.delta ?? 0 });
  } catch (e) {
    results.scrollError = String(e);
  }
}
if (WITH_INTERACT) {
  try {
    const inter = await interactStates(URL, BPS_WANTED, SECTIONS_WANTED);
    totalPass += inter.pass; totalFail += inter.fail;
    results.interact = { pass: inter.pass, fail: inter.fail, hoverChecked: inter.hoverChecked };
    for (const f of inter.failures) results.failures.push({ section: f.section, bp: f.bp, kind: f.kind, heronPath: f.heronPath, oursSelector: "-", mode: "interact", expected: f.expected, actual: f.actual, delta: 0 });
    const pat = await patternCheck(URL);
    totalPass += pat.pass; totalFail += pat.fail;
    results.patterns = { pass: pat.pass, fail: pat.fail, checked: pat.checked };
    for (const f of pat.failures) results.failures.push({ section: "(pattern)", bp: "1440", kind: f.kind, heronPath: f.pattern, oursSelector: "-", mode: "pattern", expected: f.expected, actual: f.actual, delta: 0 });
  } catch (e) {
    results.interactError = String(e);
  }
}

// ── summary + report ─────────────────────────────────────────────────────────
const total = totalPass + totalFail;
const rate = total ? Math.round((totalPass / total) * 1000) / 10 : 0;
const exRate = total ? Math.round((exceptionUses / total) * 1000) / 10 : 0;

// ratchet (gate mode): the committed floor; --ratchet raises it to the
// current rate (monotonic — write only if higher).
let ratchetValue = null;
if ((GATE || RATCHET_UPDATE) && existsSync(RATCHET_FILE)) {
  try { ratchetValue = JSON.parse(readFileSync(RATCHET_FILE, "utf8")).rate ?? null; } catch { ratchetValue = null; }
}
let gateVerdict = "report-only";
if (GATE) {
  gateVerdict = ratchetValue == null ? `PASS(no-ratchet-yet,${rate}%)` : (rate >= ratchetValue ? "PASS" : "FAIL");
}
// r339 T-02 audit — the ratchet may only move on a FULL-matrix run. A
// section-scoped or bp-scoped run's rate is not comparable to the committed
// floor (a single strong section would raise the bar the full matrix cannot
// meet; the floor must represent the whole surface it gates).
const FULL_SCOPE = SECTIONS_WANTED.length === SECTIONS.length && BPS_WANTED.length === BPS.length;
// r339 T-02 audit (gate-scope, same class as the ratchet refusal): a SCOPED
// --gate run (verify.sh --sections …) must not compare a single section's
// rate against the full-matrix ratchet — a strong section would "hold" a
// floor the rest of the matrix may fail. Scoped gate runs stay green as
// report-only with an explicit label; only a full matrix can hold the floor.
if (GATE && !FULL_SCOPE) {
  gateVerdict = `PASS(scoped-run:${SECTIONS_WANTED.length}/${SECTIONS.length} sections × ${BPS_WANTED.length}/${BPS.length} bps — report-only, cannot hold the full-matrix ratchet)`;
  console.error(`--gate on a scoped run cannot hold the full-matrix ratchet (${SECTIONS_WANTED.length}/${SECTIONS.length} sections, ${BPS_WANTED.length}/${BPS.length} bps) — verdict is report-only; run the full matrix for a gate verdict`);
}
// r339 T-02 audit — the exception cap was a printed label only; enforce it
// AFTER the scoped-run label so no scoping can mask a cap breach:
// exceptions.json is "TRUE waivers only", hard cap <5% on ANY gated run.
if (GATE && exRate >= 5) gateVerdict = `FAIL(exception-cap:${exRate}%≥5%)`;
if (RATCHET_UPDATE && !FULL_SCOPE) {
  console.error("--ratchet refused: run is section- or bp-scoped (" + SECTIONS_WANTED.length + "/" + SECTIONS.length + " sections, " + BPS_WANTED.length + "/" + BPS.length + " bps) — the ratchet may only be raised from a full-matrix run");
  process.exit(2);
}
if (RATCHET_UPDATE && (ratchetValue == null || rate > ratchetValue)) {
  writeFileSync(RATCHET_FILE, JSON.stringify({ rate, total, pass: totalPass, fail: totalFail, updatedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(`ratchet ${ratchetValue == null ? "created" : `${ratchetValue}→${rate}`}`);
}

results.summary = {
  total, pass: totalPass, fail: totalFail, passRate: rate,
  exceptionUses, exceptionRate: exRate, exceptionCap: "<5%", exceptionRules: exRules,
  unmatchedFailures: results.failures.filter((f) => f.kind === "no-counterpart").length,
  gate: gateVerdict, ...(ratchetValue != null ? { ratchet: ratchetValue } : {}),
};
for (const key of SECTIONS_WANTED) {
  results.sections[key] = {};
  for (const bpName of BPS_WANTED) {
    const c = matrix[key]?.[bpName];
    if (!c) continue;
    const n = c.pass + c.fail;
    results.sections[key][bpName] = { passRate: n ? Math.round((c.pass / n) * 1000) / 10 : 0, n, ...c };
  }
}
results.failures.sort((a, b) => b.delta - a.delta).splice(800);
/* r338 medic: the unmatched/excused listing must stay bounded too — the
 * intro run's excused-residue report hit 1417 entries (846KB file) and
 * reddened the size gate's 500KB per-file rule (rule 1). Same cap
 * pattern as failures above; the omitted count in summary keeps the
 * report honest (nothing downstream parses unmatchedReport — it is a
 * human diagnostic; the per-cell counts in sections carry the numbers). */
results.summary.unmatchedOmitted = Math.max(0, results.unmatchedReport.length - 400);
results.unmatchedReport.splice(400);
/* r338 T-14a: skipped (plumbing/binding) assertions are bounded the same
 * way; the per-cell counts in sections carry the full numbers. */
const totalSkipped = Object.values(matrix).flatMap((b) => Object.values(b)).reduce((a, c) => a + ((c && c.skipped) || 0), 0);
results.summary.skippedOmitted = Math.max(0, results.skippedReport.length - 400);
results.skippedReport.splice(400);
results.summary.totalSkipped = totalSkipped;
if (DARK) {
  const dTotal = darkPass + darkFail;
  results.summary.dark = { pass: darkPass, fail: darkFail, passRate: dTotal ? Math.round((darkPass / dTotal) * 1000) / 10 : 0, contrastChecked: darkContrast, contrastSkippedReported: darkContrastSkipped, contrastFloor: 3, theme: darkTheme?.attr ?? null, settle: darkSettle, note: "spec is light-only: geometry/type re-asserted on the dark DOM; color group = token-flip census + contrast floor vs COMPOSITED effective background (rgba/oklch inks alpha-blended; uncountable pairs reported as skips)" };
}

// console matrix
const col = (s) => String(s).padEnd(9);
console.log("\nR336 conformance v2 — OUR page vs frozen Heron spec (" + URL + ")");
console.log(col("section") + BPS_WANTED.map(col).join("") + " mapping(e/d/h/u/x)");
for (const key of SECTIONS_WANTED) {
  let line = col(key.slice(0, 8)), counts = "";
  for (const bpName of BPS_WANTED) {
    const c = matrix[key]?.[bpName];
    if (!c) { line += col("—"); counts += col(""); continue; }
    if (c.missing) { line += col("missing"); counts += col(c.missing.slice(0, 9)); continue; }
    const n = c.pass + c.fail;
    line += col(n ? Math.round((c.pass / n) * 100) + "%" : "0%");
    counts += col(`${c.pass}/${n}`);
  }
  const c0 = Object.values(matrix[key] || {})[0] || {};
  console.log(line + col("") + ` e=${c0.explicit ?? 0} d=${c0.dataSpec ?? 0} h=${c0.heuristic ?? 0} u=${c0.unmatched ?? 0} x=${c0.excused ?? 0} s=${c0.skipped ?? 0}`);
}
console.log("-".repeat(70));
console.log(`TOTAL ${totalPass}/${total} = ${rate}%  ·  exceptions ${exceptionUses} (${exRate}%, cap 5%)  ·  no-counterpart FAILs ${results.summary.unmatchedFailures}  ·  failures listed: ${results.failures.length}  ·  skipped (counted) ${totalSkipped}`);
const topKinds = {};
for (const f of results.failures) topKinds[f.kind] = (topKinds[f.kind] || 0) + 1;
console.log("top failure kinds:", Object.entries(topKinds).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${v}`).join("  "));
console.log("exception rules used (true waivers only):", Object.entries(exRules).map(([k, v]) => `${k}:${v}`).join("  ") || "none");
if (ratchetValue != null) console.log(`ratchet floor: ${ratchetValue}%  ·  gate: ${gateVerdict}`);
if (DARK) {
  const colD = (s) => String(s).padEnd(10);
  console.log("\nDARK internal-consistency — " + URL + "  (spec is light-only; color group = flip census + contrast floor 3.0)");
  for (const key of SECTIONS_WANTED) {
    let line = colD(key.slice(0, 9));
    for (const bpName of BPS_WANTED) {
      const d = matrix[key]?.[bpName]?.dark;
      line += colD(d ? `${d.pass}/${d.pass + d.fail}` : "—");
    }
    const d0 = Object.values(matrix[key] || {}).find((c) => c && c.dark)?.dark;
    console.log(line + colD("") + `flips=${d0?.flips ?? 0} contrast=${d0?.contrastChecked ?? 0} skipped-contrast=${d0?.contrastSkipped ?? 0} reported=${d0?.contrastReported ?? 0}`);
  }
  const dTotal = darkPass + darkFail;
  console.log(`DARK TOTAL ${darkPass}/${dTotal} = ${dTotal ? Math.round((darkPass / dTotal) * 1000) / 10 : 0}%  ·  contrast checks ${darkContrast}  ·  reported-uncountable ${darkContrastSkipped}  ·  settle ${darkSettle.map((s) => `${s.bp}:${s.settled ? "ok" : "UNSTABLE(" + s.frames + "f)"}`).join(" ")}  ·  html[data-theme]=${darkTheme?.attr}`);
}

writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log("results → " + OUT);
process.exit(GATE && String(gateVerdict).startsWith("FAIL") ? 1 : 0);
