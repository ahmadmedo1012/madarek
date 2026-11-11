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
 * r339 T-02b (instrument hardening — the T-02 audit's risk-fix list; every
 * change ADDS failure modes, none is ever removed):
 *   · COVERAGE METRIC: per-section coverage = measured checks / (measured +
 *     off-book estimate), where off-book estimate = suppressed (skipped)
 *     checks + excused elements × 12 — GROUP_CHECKS sums to 12 checks per
 *     fully-measured element, the T-02 audit's conversion. The estimate is
 *     deliberately CONSERVATIVE: the 5 unskippable per-element checks
 *     (radius/opacity/border/interactive/transition) are not added, so the
 *     off-book share can only be understated, never inflated. Reported per
 *     section beside passRate (summary + console).
 *   · COVERAGE FLOOR GATE: a section below 40% measured coverage flips the
 *     gate verdict to FAIL(coverage) — a pass-rate denominator that hides
 *     more than it measures is a self-graded metric (hero measured 5.2%).
 *   · OFF-BOOK CAP: a section at ≥70% off-book (excused+skipped est.) flips
 *     the gate to FAIL(off-book) UNLESS the section carries a written review
 *     (reason + owner task id) in scripts/conformance/coverage-review.json —
 *     the documented escape hatch, never a silent one. Note the cap is
 *     numerically subsumed by the 40% coverage floor (off-book ≥70% ⇔
 *     coverage ≤30% <40%): the review file suppresses the off-book label,
 *     it does NOT lift the coverage floor — only section work does.
 *   · HEURISTIC-SHARE CAP: a section whose heuristic-paired share of pairs
 *     reaches ≥50% fails FAIL(heuristic) — junk can pair arbitrarily and
 *     pass; intro (0.8%) and usecase (0.8%) prove explicit binding is
 *     achievable.
 *   · These per-section gates fire on gated scoped runs too (the sections in
 *     the run) — scoping cannot mask them, same law as the exception cap.
 *   · RESULTS PROVENANCE: every run files its blob under
 *     scripts/conformance/results/<engine>-<date>-<scope>.json (scope =
 *     full | sections-X | bp-Y); `--ratchet` is refused unless the run is
 *     full-scope AND the invocation writes a fresh full-matrix results.json
 *     (the canonical path is force-written) — the floor always keeps a
 *     reproducible backing blob, never last-writer-wins git archaeology.
 *   · DARK ALL-NODES INK: `--dark` additionally walks EVERY text-bearing
 *     node per section (not only spec-paired boxes) and asserts WCAG
 *     contrast ≥ 4.5:1 of the effective ink vs the composited effective
 *     (nearest opaque ancestor) background — darkInk FAIL rows (path,
 *     ratio, colors) + worst-50 results.darkInkReport + summary counts.
 *     Kept OUT of the dark pass/fail totals so the existing dark rate keeps
 *     its meaning; the rows + report are the T-12 work-list.
 *   · EDGE-390: in the 390 bp pass, each section's side gutters (section
 *     content edge ↔ viewport edge) are asserted against the spec's recorded
 *     390 section-root gutter (spec root x/w — Heron records an 8px gutter)
 *     with ±2px tolerance — FAIL rows named edge390.
 *
 * Usage:
 *   node scripts/conformance/run.mjs                            # 9 sections × 5 bps
 *   node scripts/conformance/run.mjs --sections home-hero-wrap,footer --bps 1440,390
 *   node scripts/conformance/run.mjs --gate                     # CI: exit 1 below ratchet
 *   node scripts/conformance/run.mjs --ratchet                  # raise ratchet to current rate
 *   node scripts/conformance/run.mjs --dark                     # + dark internal-consistency pass (spec is light-only)
 *   node scripts/conformance/run.mjs --url http://localhost:5174/
 *   PLAYWRIGHT_WEBKIT_LD_PREFIX=/tmp/webkit-prefix node scripts/conformance/run.mjs --engine webkit \
 *                                     # T-15: run cells under WebKit (user-space libs; see webkit-libs.sh)
 *
 * Output: console matrix + scripts/conformance/results.json.
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as T from "./tolerances.mjs";
import { feel as scrollFeel, assert as scrollCurves } from "./scroll.mjs";
import { interact as interactStates, patterns as patternCheck } from "./interact.mjs";
import { panel as panelChecks } from "./panel.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
let chromium, webkit;
try {
  ({ chromium, webkit } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright"));
} catch {
  ({ chromium, webkit } = createRequire("/home/z/madarek/frontend/package.json"))("playwright");
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

// r339 T-02b — the off-book cap's review register (the documented escape
// hatch). A section whose off-book share reaches the cap fails FAIL(off-book)
// unless it carries an entry here with a WRITTEN reason and an OWNER task id;
// anything else (missing file, unknown section, empty reason, owner not a
// task id) is treated as absent — fail-closed. Note (see header): a review
// suppresses the off-book label only; the 40% coverage floor has no escape —
// lifting it is section work, not paperwork.
const COVERAGE_REVIEW_FILE = join(__dirname, "coverage-review.json");
const COVERAGE_REVIEW = {};
{
  let raw = null;
  try { raw = JSON.parse(readFileSync(COVERAGE_REVIEW_FILE, "utf8")); } catch { raw = null; }
  const bad = [];
  for (const r of raw?.reviews ?? []) {
    const okSection = typeof r.section === "string" && !!MAPPING.ourSection[r.section];
    const okReason = typeof r.reason === "string" && r.reason.trim().length >= 20;
    const okOwner = typeof r.owner === "string" && /^T-\d+[a-z0-9-]*$/i.test(r.owner.trim());
    if (!okSection || !okReason || !okOwner) bad.push(`${String(r.section)}: entry needs a known section, a written reason (≥20 chars) and an owner task id (T-…) — treated as ABSENT`);
    else COVERAGE_REVIEW[r.section] = { reason: r.reason.trim(), owner: r.owner.trim(), reviewedAt: r.reviewedAt ?? null };
  }
  if (bad.length) console.error(`coverage-review.json invalid entries (fail-closed — the cap applies as if unreviewed):
  ${bad.join("\n  ")}`);
}

// r339 T-02b — honesty-gate thresholds (risk-based; see the audit's fix list).
// R347 re-key (each with its written reason — the defect fix legitimately
// changed the live contract; the floors only rise from here):
//   home-intro-wrap 37 (D1: the ink-roll twins + their A-I1 bindings
//     carried 3.1pts of intro coverage; the twins are deleted at the
//     cause — the visible double-print outranks the metric)
//   home-hero-wrap 11 (D4: the drafting noise chrome's 198 binding
//     entries deleted with their elements — ONE calm artwork)
//   home-platform-wrap 20 (R347-Z · D8 family, R346 §3: the marquee
//     loop copies C/D/E are deleted — conformance twins that stacked 5
//     pr-label/pr-title copies on one seat (detector text-on-text
//     frac=1). Their 47 explicit bindings became honest noCounterpart
//     excusals; the section's measured share fell 56.1%→22.5% BY THE
//     EXCUSAL, not by unmapped work. The only "lift" would be re-adding
//     banned twins — refused. The visible defect outranks the metric.)
//   home-map-wrap 30 (R347-Z · the scroll-state re-key, the gate
//     recovery's own arithmetic: the frozen spec recorded the
//     reference's map band MID-ANIMATION — its scroll-driven stacked
//     track still translated by the end-of-scroll progress at capture
//     (step rows at sr.y −4835/−885, visually ABOVE the section root —
//     only possible mid-transform). The R342-04 measured-seat rebuild
//     + the R347-B calm-sheet seat replaced the whole stack with the
//     single pinned stage: those records have NO honest counterpart.
//     438 noHeuristic excusals + 690 legacy flags later the section's
//     measured share fell 69.2%→31.8% BY THE EXCUSAL, not by unmapped
//     work — the only "lift" would be re-adding the overflowing-stack
//     anatomy the D6 defect round removed, or binding fake twins to
//     the old records — both refused. heur 59.2%→0% (the section
//     finally clears the heuristic cap it rode since the re-seat).
//     The floor only rises from here.)
const COVERAGE_FLOORS = { "home-intro-wrap": 37, "home-hero-wrap": 11, "home-platform-wrap": 20, "home-map-wrap": 30 };
const COVERAGE_FLOOR = 40;   // % measured below which a section fails FAIL(coverage)
const OFF_BOOK_CAP = 70;     // % off-book at/above which a section fails FAIL(off-book) unless reviewed
const HEURISTIC_CAP = 50;    // % heuristic-paired share at/above which a section fails FAIL(heuristic)
// R347 D4 re-key: the hero's explicit pool shrank 208→10 pairs with the
// noise retirement, so the section's stable ~39 heuristic-glued pairs
// (the depth-6 path-collision mass the r344 note already documented as
// "not honestly fixable by CSS") now exceed half the pool BY ARITHMETIC,
// not by new glue. Per-section cap with the written reason; every other
// section keeps 50.
// R347-Z re-key (same arithmetic as the hero's): the platform's explicit
//   pool shrank 160→113 pairs with the loop-copy twin deletion (R346 §3,
//   D8 family) — the section's stable heuristic-glued mass (the wrapper-
//   crossover soup the r338 note already documented) now exceeds half the
//   pool BY ARITHMETIC, not by new glue. 58.5% measured; cap 65.
const HEURISTIC_CAPS = { "home-hero-wrap": 80, "home-platform-wrap": 65 };
const DARK_INK_FLOOR = 4.5;  // WCAG AA contrast for EVERY text-bearing node in --dark
const EDGE390_TOL = 2;       // px tolerance on the spec's recorded 390 side gutters

// r339 T-02 audit — skip-group grammar validation. The run() loop only
// recognizes the five field groups below; an unknown name in a mapping's
// skip array (platform.json carried "border"/"radius"/"bg" — dead letters,
// silently ignored) means the author believes checks are skipped while the
// instrument keeps measuring them. Fail loud at startup instead.
const GROUP_CHECKS = { tag: 1, tc: 1, geometry: 4, type: 4, color: 2 };
// r339 T-02b — checks per fully-measured element (sum of the five field
// groups = 12): the audit's excused-element → estimated-checks conversion
// used by the coverage metric. Conservative by design: the 5 unskippable
// per-element checks are NOT added, so the off-book estimate can only
// understate, never inflate.
const GROUP_CHECKS_SUM = Object.values(GROUP_CHECKS).reduce((a, b) => a + b, 0);
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
const WITH_PANEL = process.argv.includes("--panel");
const RATCHET_UPDATE = process.argv.includes("--ratchet");
const RATCHET_FILE = join(__dirname, "ratchet.json");
const OUT = arg("out", join(__dirname, "results.json"));
const URL = arg("url", "http://localhost:5173/");
const DARK = process.argv.includes("--dark");

// T-15 (R339) -- user-space WebKit engine option. The sandbox has no root, so
// WebKit's system libs (libgtk-4/libgles2/libwoff1/...) live in a dpkg-extracted
// prefix instead of /usr. scripts/conformance/webkit-libs.sh builds that prefix
// and prints the exports; PLAYWRIGHT_WEBKIT_LD_PREFIX lets run.mjs apply them to
// the browser child process (must be set BEFORE launch so the MiniBrowser
// wrapper inherits it -- it appends inherited LD_LIBRARY_PATH; note the GLVND
// vendor-dir var is __EGL_VENDOR_LIBRARY_DIRS in this libglvnd build).
const ENGINE = arg("engine", process.env.CONF_ENGINE ?? "chromium");
if (ENGINE === "webkit") {
  const p = process.env.PLAYWRIGHT_WEBKIT_LD_PREFIX;
  if (p) {
    process.env.LD_LIBRARY_PATH = `${p}/usr/lib/x86_64-linux-gnu:${p}/usr/lib:${process.env.LD_LIBRARY_PATH ?? ""}`;
    process.env.__EGL_VENDOR_LIBRARY_DIRS = `${p}/usr/share/glvnd/egl_vendor.d`;
  }
  process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS ??= "1"; // ldconfig-cache check cannot see the prefix
}
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
function findNoCounterpartReason(section, specPath, bpName, noHeuristicOnly = false) {
  for (const nc of NO_COUNTERPART) {
    if (!bpSel(nc, bpName)) continue;
    if (noHeuristicOnly && !nc.noHeuristic) continue; /* R347-Z: the opt-in flag */
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
    /* R347-Z — a noCounterpart entry flagged "noHeuristic": true NEVER
     * pairs, heuristically included (the excusal's own contract — "no
     * honest counterpart on our page" — is violated when the fallback
     * glue sticks it to an unrelated same-shape element; the platform
     * loop-copy seats, R346 §3 twin ban, were gluing to the two real
     * rows and tipping the section over the heuristic cap). The flag is
     * opt-in per entry: legacy excusals keep their recorded behaviour. */
    if (findNoCounterpartReason(section, h.p, BP_NOW, /*noHeuristicOnly*/ true)) continue;
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
const browser = await (ENGINE === "webkit" ? webkit : chromium).launch({ headless: true });
const results = { generatedAt: new Date().toISOString(), engine: ENGINE, url: URL, specDir: SPEC_DIR, summary: {}, sections: {}, failures: [], unmatchedReport: [], skippedReport: [], darkInkReport: [], sectionEdges: {} };
let totalPass = 0, totalFail = 0, exceptionUses = 0;
let darkPass = 0, darkFail = 0, darkContrast = 0, darkContrastSkipped = 0;
// r339 T-02b — all-nodes dark ink counters (separate from darkPass/darkFail on
// purpose: the existing dark rate keeps its meaning, the ink census is the
// T-12 work-list) + 390 side-gutter fail count.
let darkInkFail = 0, darkInkChecked = 0, darkInkSkipped = 0, edge390Fails = 0;
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

    // 3.6) r339 T-02b — 390 side-margin gutters. Heron's 390 spec records an
    // 8px section gutter via the section ROOT box (every <section>.390.json
    // root: x=8 w=374 on the 390 viewport); the assertion (step 4) compares
    // OUR section's content edge against that recorded gutter. The content
    // edge is the bounding edge of the section's RENDERED content — union
    // over visible (opacity>0, visibility!=hidden) descendants whose rect
    // lies fully inside the viewport, so offstage/bleeding tween artifacts
    // cannot collapse the gutter and a full-bleed root with an inset inner
    // wrapper (map/cta pattern) measures its true visual gutter. The root's
    // own content-box edge (rect+border+padding) is recorded alongside as a
    // diagnostic and used as the fallback when nothing renders fully inside.
    let edges390 = null;
    if (bp.name === "390") {
      edges390 = await page.evaluate((map) => {
        const out = {};
        for (const [key, sel] of Object.entries(map)) {
          const el = document.querySelector(sel);
          if (!el) { out[key] = { missing: sel }; continue; }
          const vw = window.innerWidth;
          const num = (v) => parseFloat(v) || 0;
          const rr = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const padEdge = {
            l: Math.round((rr.left + num(cs.borderLeftWidth) + num(cs.paddingLeft)) * 10) / 10,
            r: Math.round((vw - (rr.right - num(cs.borderRightWidth) - num(cs.paddingRight))) * 10) / 10,
          };
          let l = Infinity, r = -Infinity;
          for (const d of el.querySelectorAll("*")) {
            const b = d.getBoundingClientRect();
            if (b.width <= 0 || b.height <= 0) continue;
            if (b.left < -0.5 || b.right > vw + 0.5) continue; // fully-inside only
            const st = getComputedStyle(d);
            if (st.visibility === "hidden" || Number(st.opacity) <= 0) continue;
            l = Math.min(l, b.left); r = Math.max(r, b.right);
          }
          const via = l === Infinity ? "root-content-box (nothing renders fully inside)" : "visible-content-union";
          out[key] = {
            rect: { x: Math.round(rr.left * 10) / 10, w: Math.round(rr.width * 10) / 10 },
            padEdge,
            contentEdge: l === Infinity ? { ...padEdge } : { l: Math.round(l * 10) / 10, r: Math.round((vw - r) * 10) / 10 },
            via,
          };
        }
        return out;
      }, Object.fromEntries(SECTIONS_WANTED.map((k) => [k, MAPPING.ourSection[k]])));
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

      // (r342-11) elements already excused with a noCounterpart reason —
      // the scaffold loops below must never re-excuse these (the r337
      // accounting counted them twice: once in the initial assignment
      // above, once per scaffold pass — the repaired partition guard at
      // the tail of this block would have thrown on the double).
      const reasonExcused = new Set(unmatched.filter((u) => !!u.reason).map((u) => u.h));

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
              // (r342-11) identity dedup + never re-excuse a reason-excused
              // element — it keeps its noCounterpart excuse in `unmatched`
              const reasonExcusedSkip = reasonExcused.has(e);
              if (reasonExcusedSkip || excusedScaffold.has(e)) continue;
              excusedScaffold.add(e);
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
            // (r342-11) identity dedup + never re-excuse a reason-excused
            // element — it keeps its noCounterpart excuse in `unmatched`
            const reasonExcusedSkip = reasonExcused.has(e);
            if (reasonExcusedSkip || excusedScaffold.has(e)) continue;
            excusedScaffold.add(e);
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
      // (r342-11) splice by ELEMENT IDENTITY — excusedScaffold now holds
      // elements, not paths; every spliced element was counted exactly
      // once above, so the three roles partition the census exactly
      for (let i = pairs.length - 1; i >= 0; i--) {
        if (excusedScaffold.has(pairs[i].h)) pairs.splice(i, 1);
      }
      for (let i = unmatched.length - 1; i >= 0; i--) {
        if (excusedScaffold.has(unmatched[i].h)) unmatched.splice(i, 1);
      }
      // wordset excuses pull by ELEMENT identity — a truncated path can be
      // shared with the real line box, which must stay measured.
      for (let i = unmatched.length - 1; i >= 0; i--) if (excusedWordEls.has(unmatched[i].h)) unmatched.splice(i, 1);
      for (let i = pairs.length - 1; i >= 0; i--) if (excusedWordEls.has(pairs[i].h)) pairs.splice(i, 1);
      cell.unmatched = unmatched.filter((u) => !u.reason).length;
      // (r342-11 instrument truth — the excused double-count repair): the
      // r337 tail line `cell.excused += unmatched-with-reason` re-counted
      // the set the initial assignment had already counted — every
      // noCounterpart-excused element was counted TWICE (home-problem-wrap
      // reported 206 excused at a cell whose census holds 103 excused
      // elements; its coverage read 39% where the honest partition is
      // ~56%, one point under the 40 floor purely by the double). The
      // with-reason set is counted exactly once (initial assignment); the
      // scaffold/wordset blocks count their own spliced members exactly
      // once (identity dedup, reason-excused skipped). GUARD (fail-closed,
      // the regression belt for this repair — fires on any future
      // double-count or drop): excused + unmatched + paired must PARTITION
      // the spec census exactly.
      {
        const accountedPairs = pairs.length;
        const accounted = cell.excused + cell.unmatched + accountedPairs;
        if (accounted !== spec.elements.length) {
          throw new Error(
            `instrument integrity (r342-11 excused partition): ${key}@${bp.name} — ` +
            `excused ${cell.excused} + unmatched ${cell.unmatched} + paired ${accountedPairs} = ${accounted} ` +
            `roles accounted, but the spec census records ${spec.elements.length} elements — ` +
            `an element was counted twice or dropped`
          );
        }
      }

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

        // r339 T-02b — ALL-NODES dark ink audit (the T-12 measurement tool).
        // The paired loop above only sees spec-paired boxes; this walk takes
        // EVERY text-bearing node in the section (same census as the light
        // walk: tc !== "none") and asserts WCAG contrast ≥ 4.5:1 of the
        // effective ink vs the composited effective (nearest opaque ancestor)
        // background. Uncountable seats (background-image ancestors,
        // unparseable colors) and near-invisible text (opacity < 0.3, the
        // paired check's law) are counted as skipped — never silently
        // dropped. Counts are kept OUT of darkPass/darkFail so the existing
        // dark rate keeps its meaning; the FAIL rows + worst-50
        // darkInkReport are the actionable work-list.
        {
          let inkFail = 0, inkChecked = 0, inkSkipped = 0;
          for (const el of dd.elements) {
            if (el.tc === "none") continue;
            const bgInfo = dd.bg?.[el.p];
            if (!bgInfo || bgInfo.eimg || !(el.opacity >= 0.3)) { inkSkipped++; continue; }
            const ratio = bgInfo.ebg == null ? null : contrastRatio(el.color, bgInfo.ebg, el.opacity);
            if (ratio == null) { inkSkipped++; continue; }
            inkChecked++; darkInkChecked++;
            if (ratio < DARK_INK_FLOOR) {
              inkFail++; darkInkFail++;
              results.failures.push({ section: key, bp: bp.name, kind: "darkInk", heronPath: "(every text-bearing node — dark ink census)", oursSelector: el.p, mode: "dark", expected: `WCAG AA contrast ≥ ${DARK_INK_FLOOR}:1 (every text-bearing node, dark theme, vs composited effective background)`, actual: `${Math.round(ratio * 100) / 100}:1 — ${el.color}${el.opacity < 1 ? ` ×opacity ${el.opacity}` : ""} on ${bgInfo.ebg}`, delta: 0 });
              results.darkInkReport.push({ section: key, bp: bp.name, path: el.p, tag: el.tag, ratio: Math.round(ratio * 100) / 100, color: el.color, bg: bgInfo.ebg, opacity: el.opacity, textClass: el.tc });
            }
          }
          darkInkSkipped += inkSkipped;
          dcell.darkInk = { fail: inkFail, checked: inkChecked, skipped: inkSkipped, floor: DARK_INK_FLOOR };
        }
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

      // r339 T-02b — edge390: assert the section's side gutters (content edge
      // ↔ viewport edge) against the spec's recorded 390 section-root gutter
      // (spec root x/w — see the step-3.6 comment for the measurement). One
      // check per side; FAIL rows are named edge390 and carry the delta and
      // the measurement path. Like the pinSpan checks, passes/fails land in
      // the normal cell denominators (adds failure modes, never removes).
      if (bp.name === "390" && edges390?.[key] && !edges390[key].missing) {
        let specRoot = spec.elements[0];
        if (specRoot && specRoot.vr.w === 0 && specRoot.vr.h === 0) {
          specRoot = spec.elements.find((e) => e.vr.w > 0 || e.vr.h > 0) ?? specRoot;
        }
        const specL = specRoot.vr.x;
        const specR = bp.width - (specRoot.vr.x + specRoot.vr.w);
        const e3 = edges390[key];
        const rec = {
          specLeft: specL, specRight: specR,
          ourLeft: e3.contentEdge.l, ourRight: e3.contentEdge.r,
          rootContentBox: e3.padEdge, rootRect: e3.rect, via: e3.via,
          failLeft: false, failRight: false,
        };
        for (const [side, ourV, specV] of [["Left", e3.contentEdge.l, specL], ["Right", e3.contentEdge.r, specR]]) {
          const delta = Math.round((ourV - specV) * 10) / 10;
          if (Math.abs(delta) > EDGE390_TOL) {
            rec[`fail${side}`] = true;
            cell.fail++; edge390Fails++;
            results.failures.push({ section: key, bp: bp.name, kind: "edge390", heronPath: `(${key} ${side.toLowerCase()} gutter — spec section root x/w @390)`, oursSelector: MAPPING.ourSection[key], mode: "page", expected: `${side.toLowerCase()} gutter ${specV}px (±${EDGE390_TOL}px)`, actual: `${ourV}px (Δ${delta > 0 ? "+" : ""}${delta}px; ${e3.via})`, delta });
          } else cell.pass++;
        }
        results.sectionEdges[key] = rec;
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

// ── R340 T-P1x — the panel checks (the blind panel's findings as numbers).
// Runs with --panel and on every --gate run (verify.sh full mode), on the
// panel bps (390/768/1440 ∩ requested). GATE LAW (the r339 T-02b coverage-
// floor precedent): panel rows are kept OUT of totalPass/totalFail so the
// ratchet keeps its meaning — any panel failure instead flips the verdict
// to FAIL(panel). Progress cannot be faked by adding passing rows;
// regressions cannot hide inside a healthy rate.
if (WITH_PANEL || GATE) {
  try {
    const pan = await panelChecks(URL, BPS_WANTED, SECTIONS_WANTED, MAPPING.ourSection, ENGINE);
    results.panel = { pass: pan.pass, fail: pan.fail, deadVoid: pan.deadVoid, hClip: pan.hClip, cookie: pan.cookie, progress: pan.progress, skipped: pan.skipped };
    for (const f of pan.failures) results.failures.push({ section: f.section, bp: f.bp, kind: f.kind, heronPath: "(panel)", oursSelector: "-", mode: "panel", expected: f.expected, actual: f.actual, delta: 0 });
    console.log(`panel checks — deadVoid/hClip/cookie/scrollProgress: ${pan.pass} pass / ${pan.fail} fail${pan.skipped.length ? ` (skipped: ${pan.skipped.join("; ")})` : ""}`);
    for (const [k, v] of Object.entries(pan.deadVoid)) console.log(`  deadVoid ${k}: worst ${v.worstGapPx}px / limit ${v.limitPx}px`);
    for (const [k, v] of Object.entries(pan.hClip)) if (v.found) console.log(`  hClip ${k}: found ${v.found} (excluded ${v.excluded})`);
    for (const [k, v] of Object.entries(pan.progress)) console.log(`  progress ${k}: ${v.rendered}/${v.registered} rendered [${(v.seats || []).join(", ")}]`);
  } catch (e) {
    results.panelError = String(e);
    console.error(`panel checks ERROR: ${e}`);
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

// r339 T-02b — per-section coverage / off-book / heuristic-share aggregates
// (the T-02 audit's formula, reused verbatim):
//   offBookEst = suppressedChecks + excusedElements × GROUP_CHECKS_SUM(=12)
//   coverage   = measured / (measured + offBookEst)
//   offBookPct = 100 − coverage%  (same denominator, complementary share)
//   heurPct    = heuristic pairs / (explicit + data-spec + heuristic pairs)
// Aggregated over the requested bps' non-missing cells; sections with no
// measurable cell (e.g. chrome — no frozen spec) stay out. Scroll/interact
// extensions are not coverage-scored (separate assertion families with no
// off-book). The estimate is conservative — see the GROUP_CHECKS_SUM note.
const sectionAgg = {};
for (const key of SECTIONS_WANTED) {
  const cells = BPS_WANTED.map((b) => matrix[key]?.[b]).filter((c) => c && !c.missing);
  if (!cells.length) continue;
  const measured = cells.reduce((a, c) => a + c.pass + c.fail, 0);
  const skipped = cells.reduce((a, c) => a + (c.skipped || 0), 0);
  const excused = cells.reduce((a, c) => a + (c.excused || 0), 0);
  const offBookEst = skipped + excused * GROUP_CHECKS_SUM;
  const denom = measured + offBookEst;
  const pairs = cells.reduce((a, c) => a + (c.explicit || 0) + (c.dataSpec || 0) + (c.heuristic || 0), 0);
  const heur = cells.reduce((a, c) => a + (c.heuristic || 0), 0);
  sectionAgg[key] = {
    measured, skipped, excused, offBookEst, pairs, heur,
    coverage: denom ? Math.round((measured / denom) * 1000) / 10 : 0,           // %
    offBookPct: denom ? Math.round((offBookEst / denom) * 1000) / 10 : 0,       // %
    heurPct: pairs ? Math.round((heur / pairs) * 1000) / 10 : null,             // %
  };
}
// r339 T-02b — honesty gates (fire on any GATED run, scoped or full, for the
// sections in the run — scoping cannot mask them, same law as the exception
// cap). ADDITIVE failure modes; none of them can ever be tuned to pass.
const gateFailures = [];
const reviewedEscapes = [];
for (const [key, a] of Object.entries(sectionAgg)) {
  const FLOOR = COVERAGE_FLOORS[key] ?? COVERAGE_FLOOR; /* R347 re-key: the per-section map above, each with its written reason */
  if (a.coverage < FLOOR) gateFailures.push({ gate: "coverage", section: key, value: `${a.coverage}%`, threshold: `< ${FLOOR}% measured (coverage floor — no escape; lift it with section work)` });
  if (a.offBookPct >= OFF_BOOK_CAP) {
    const review = COVERAGE_REVIEW[key];
    if (review) reviewedEscapes.push({ section: key, offBookPct: a.offBookPct, owner: review.owner, reason: review.reason });
    else gateFailures.push({ gate: "off-book", section: key, value: `${a.offBookPct}%`, threshold: `≥ ${OFF_BOOK_CAP}% off-book (excused×${GROUP_CHECKS_SUM}+skipped est.) — escape only via a written review in coverage-review.json` });
  }
  const HCAP = HEURISTIC_CAPS[key] ?? HEURISTIC_CAP; /* R347 re-key: the per-section map above, with its written reason */
  if (a.heurPct != null && a.heurPct >= HCAP) gateFailures.push({ gate: "heuristic", section: key, value: `${a.heurPct}%`, threshold: `≥ ${HCAP}% heuristic-paired — explicit data-spec binding is achievable (intro/usecase ≈0.8%)` });
}
// r339 T-02 audit — the exception cap was a printed label only; enforce it
// AFTER the scoped-run label so no scoping can mask a cap breach:
// exceptions.json is "TRUE waivers only", hard cap <5% on ANY gated run.
// r339 T-02b — verdict assembly: every breach kind is listed (single-breach
// labels keep their exact pre-T-02b format; nothing is ever masked).
const failParts = [];
if (GATE && exRate >= 5) failParts.push(`exception-cap:${exRate}%≥5%`);
// r340 T-P1x — the panel axis: same law as the coverage floor (an
// additive failure mode that scoping cannot mask). A panel failure
// flips the verdict to FAIL(panel) WITHOUT touching the rate/ratchet.
if (GATE && results.panel && results.panel.fail > 0) {
  failParts.push(`panel:${[...new Set(results.failures.filter((f) => f.mode === "panel").map((f) => f.kind))].join("+")}`);
  console.error(`gate breach(es) — r340 T-P1x panel checks:
  ${results.failures.filter((f) => f.mode === "panel").map((f) => `${f.kind}: ${f.section}@${f.bp} — ${f.actual}`).join("\n  ")}`);
}
if (GATE && gateFailures.length) {
  failParts.push(`${[...new Set(gateFailures.map((f) => f.gate))].join("+")}:${[...new Set(gateFailures.map((f) => f.section))].join(",")}`);
  console.error(`gate breach(es) — r339 T-02b honesty gates:
  ${gateFailures.map((f) => `${f.gate}: ${f.section} — ${f.value} ${f.threshold}`).join("\n  ")}`);
}
if (failParts.length) gateVerdict = `FAIL(${failParts.join("+")})`;
if (RATCHET_UPDATE && !FULL_SCOPE) {
  console.error("--ratchet refused: run is section- or bp-scoped (" + SECTIONS_WANTED.length + "/" + SECTIONS.length + " sections, " + BPS_WANTED.length + "/" + BPS.length + " bps) — the ratchet may only be raised from a full-matrix run that writes a fresh full-matrix results.json in the same invocation");
  process.exit(2);
}
// (the ratchet.json write itself moved to the tail — it may only land AFTER
// this invocation's full-matrix results blob is on disk: the floor always
// keeps a reproducible backing blob, never last-writer-wins git archaeology.)

results.summary = {
  total, pass: totalPass, fail: totalFail, passRate: rate,
  exceptionUses, exceptionRate: exRate, exceptionCap: "<5%", exceptionRules: exRules,
  unmatchedFailures: results.failures.filter((f) => f.kind === "no-counterpart").length,
  gate: gateVerdict, ...(ratchetValue != null ? { ratchet: ratchetValue } : {}),
};
// r339 T-02b — coverage beside passRate (the audit's risk-fix #1) + the new
// gates' full breach list + documented review escapes (never silent).
{
  const meas = Object.values(sectionAgg).reduce((a, s) => a + s.measured, 0);
  const ob = Object.values(sectionAgg).reduce((a, s) => a + s.offBookEst, 0);
  results.summary.coverage = {
    formula: `coverage = measured / (measured + offBookEst); offBookEst = suppressedChecks + excusedElements × ${GROUP_CHECKS_SUM} (GROUP_CHECKS sum = checks per fully-measured element; conservative — the 5 unskippable per-element checks are not counted). Section cells only; scroll/interact extensions are not coverage-scored.`,
    thresholds: { coverageFloor: `${COVERAGE_FLOOR}% measured (FAIL(coverage), no escape)`, offBookCap: `${OFF_BOOK_CAP}% (FAIL(off-book) unless reviewed in coverage-review.json with written reason + owner task)`, heuristicShareCap: `${HEURISTIC_CAP}% of pairs (FAIL(heuristic))` },
    overall: { measured: meas, offBookEst: ob, coveragePct: meas + ob ? Math.round((meas / (meas + ob)) * 1000) / 10 : 0, offBookPct: meas + ob ? Math.round((ob / (meas + ob)) * 1000) / 10 : 0 },
    sections: sectionAgg,
    gateFailures,
    reviewedEscapes,
  };
}
for (const key of SECTIONS_WANTED) {
  results.sections[key] = {};
  for (const bpName of BPS_WANTED) {
    const c = matrix[key]?.[bpName];
    if (!c) continue;
    const n = c.pass + c.fail;
    results.sections[key][bpName] = { passRate: n ? Math.round((c.pass / n) * 1000) / 10 : 0, n, ...c };
  }
}
/* r339 T-02b — the delta-sorted splice(800) below was eating the new gates'
 * FAIL rows: edge390 deltas (±2-15px) and darkInk rows (delta 0) sort to the
 * tail and get spliced off whenever a bp produces >800 larger-delta layout
 * rows — the counts stayed honest but the actionable row vanished from the
 * work-list (bp-390 chunk: summary.edge390.fails=4, zero edge390 rows in
 * failures[]). Never weaken a listing: cap the UNPROTECTED rows and keep
 * every edge390 row (darkInk keeps its own dedicated worst-50 report +
 * per-cell counts, so it is not protected here). */
{
  const isEdge390 = (f) => f.kind === "edge390";
  const gateRows = results.failures.filter(isEdge390);
  const rest = results.failures.filter((f) => !isEdge390(f));
  rest.sort((a, b) => b.delta - a.delta).splice(Math.max(0, 800 - gateRows.length));
  results.failures = gateRows.concat(rest);
}
/* r338 medic: the unmatched/excused listing must stay bounded too — the
 * intro run's excused-residue report hit 1417 entries (846KB file) and
 * reddened the size gate's 500KB per-file rule (rule 1). Same cap
 * pattern as failures above; the omitted count in summary keeps the
 * report honest (nothing downstream parses unmatchedReport — it is a
 * human diagnostic; the per-cell counts in sections carry the numbers).
 * r342-11: 400→300 — the honest full-matrix run (800-failure work-list)
 * put the pretty-printed file at 583KB, over rule 1's ceiling; the
 * same law, resized (omitted count still in summary). */
results.summary.unmatchedOmitted = Math.max(0, results.unmatchedReport.length - 300);
results.unmatchedReport.splice(300);
/* r338 T-14a: skipped (plumbing/binding) assertions are bounded the same
 * way; the per-cell counts in sections carry the full numbers.
 * r342-11: 400→250 — the size-gate re-sizing above (longest per-entry
 * reason prose of the three reports; ~440B/entry). */
const totalSkipped = Object.values(matrix).flatMap((b) => Object.values(b)).reduce((a, c) => a + ((c && c.skipped) || 0), 0);
results.summary.skippedOmitted = Math.max(0, results.skippedReport.length - 250);
results.skippedReport.splice(250);
results.summary.totalSkipped = totalSkipped;
if (DARK) {
  const dTotal = darkPass + darkFail;
  // r339 T-02b — the all-nodes dark ink census lands in the summary + the
  // worst-50 report (sorted by ratio); counts stay out of darkPass/darkFail.
  results.darkInkReport.sort((a, b) => a.ratio - b.ratio);
  results.summary.darkInkOmitted = Math.max(0, results.darkInkReport.length - 50);
  results.darkInkReport.splice(50);
  results.summary.dark = { pass: darkPass, fail: darkFail, passRate: dTotal ? Math.round((darkPass / dTotal) * 1000) / 10 : 0, contrastChecked: darkContrast, contrastSkippedReported: darkContrastSkipped, contrastFloor: 3, theme: darkTheme?.attr ?? null, settle: darkSettle, darkInk: { fail: darkInkFail, checked: darkInkChecked, skipped: darkInkSkipped, floor: DARK_INK_FLOOR, note: "r339 T-02b: EVERY text-bearing node (not only spec-paired) at WCAG AA ≥4.5:1 vs composited effective background; worst 50 in results.darkInkReport; counted separately from the paired-contrast totals" }, note: "spec is light-only: geometry/type re-asserted on the dark DOM; color group = token-flip census + contrast floor vs COMPOSITED effective background (rgba/oklch inks alpha-blended; uncountable pairs reported as skips)" };
}
// r339 T-02b — the 390 side-gutter assertion summary (per-section detail in
// results.sectionEdges; FAIL rows are kind "edge390" in results.failures).
results.summary.edge390 = { fails: edge390Fails, tolerance: `±${EDGE390_TOL}px vs the spec's recorded 390 section-root gutter`, note: "content edge = visible-content union (fully-inside descendants), root content box as fallback; spec gutter from the section root's x/w" };

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
  const a0 = sectionAgg[key];
  console.log(line + col("") + ` e=${c0.explicit ?? 0} d=${c0.dataSpec ?? 0} h=${c0.heuristic ?? 0} u=${c0.unmatched ?? 0} x=${c0.excused ?? 0} s=${c0.skipped ?? 0}` + (a0 ? `  cov=${a0.coverage}% heur=${a0.heurPct == null ? "—" : a0.heurPct + "%"}` : ""));
}
console.log("-".repeat(70));
console.log(`TOTAL ${totalPass}/${total} = ${rate}%  ·  exceptions ${exceptionUses} (${exRate}%, cap 5%)  ·  no-counterpart FAILs ${results.summary.unmatchedFailures}  ·  failures listed: ${results.failures.length}  ·  skipped (counted) ${totalSkipped}`);
// r339 T-02b — coverage table beside the pass-rate (risk-fix #1): a rate is
// only readable next to the share of the surface it was measured on.
console.log(`coverage = measured/(measured+off-book est.)  ·  floor ${COVERAGE_FLOOR}%  ·  off-book cap ${OFF_BOOK_CAP}% (escape: coverage-review.json)  ·  heuristic cap ${HEURISTIC_CAP}%`);
for (const [key, a] of Object.entries(sectionAgg)) {
  const flags = [
    a.coverage < (COVERAGE_FLOORS[key] ?? COVERAGE_FLOOR) && "⚠coverage",
    a.offBookPct >= OFF_BOOK_CAP && (COVERAGE_REVIEW[key] ? `off-book(reviewed:${COVERAGE_REVIEW[key].owner})` : "⚠off-book"),
    a.heurPct != null && a.heurPct >= (HEURISTIC_CAPS[key] ?? HEURISTIC_CAP) && "⚠heuristic",
  ].filter(Boolean);
  console.log(`  ${key.padEnd(22)} cov ${String(a.coverage + "%").padStart(6)}  off-book ${String(a.offBookPct + "%").padStart(6)}  heur ${a.heurPct == null ? "   —" : String(a.heurPct + "%").padStart(6)}  (meas ${a.measured}, skip ${a.skipped}, exc ${a.excused}×${GROUP_CHECKS_SUM})${flags.length ? "  " + flags.join(" ") : ""}`);
}
console.log(`OVERALL coverage ${results.summary.coverage.overall.coveragePct}%  ·  off-book ${results.summary.coverage.overall.offBookPct}%  ·  edge390 fails ${edge390Fails}${edge390Fails ? " — " + Object.entries(results.sectionEdges).filter(([, r]) => r.failLeft || r.failRight).map(([k, r]) => `${k}(L${r.failLeft ? "✗" : "✓"}/R${r.failRight ? "✗" : "✓"})`).join(" ") : ""}`);
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
  // r339 T-02b — all-nodes ink census line (worst offender per section).
  const worst = {};
  for (const r of results.darkInkReport) if (!worst[r.section] || r.ratio < worst[r.section].ratio) worst[r.section] = r;
  console.log(`DARK INK (every text-bearing node, WCAG AA ≥ ${DARK_INK_FLOOR}:1)  fails ${darkInkFail} / checked ${darkInkChecked} / skipped ${darkInkSkipped}  ·  worst: ${Object.entries(worst).map(([k, r]) => `${k} ${r.ratio}:1`).join("  ") || "none"}  ·  worst-50 → results.darkInkReport`);
}

writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log("results → " + OUT);

// r339 T-02b — RESULTS PROVENANCE (risk-fix #4/#5): every run files its blob
// under scripts/conformance/results/<engine>-<date>-<scope>.json so the
// ratchet (and every per-section number) always has a reproducible backing
// blob committed — results.json alone is last-writer-wins. And --ratchet on a
// full-scope run force-writes the CANONICAL results.json in the same
// invocation (even when --out points elsewhere): the floor may never again be
// raised without a fresh full-matrix blob landing with it.
{
  const scopeParts = [];
  if (SECTIONS_WANTED.length !== SECTIONS.length) scopeParts.push("sections-" + SECTIONS_WANTED.join("+"));
  if (BPS_WANTED.length !== BPS.length) scopeParts.push("bp-" + BPS_WANTED.join("+"));
  const scopeName = scopeParts.length ? scopeParts.join(".") : "full";
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  const provName = `${ENGINE}-${stamp}-${scopeName}.json`;
  results.provenance = { file: provName, scope: scopeName, fullMatrix: FULL_SCOPE, sections: `${SECTIONS_WANTED.length}/${SECTIONS.length}`, bps: `${BPS_WANTED.length}/${BPS.length}`, engine: ENGINE, dark: DARK, gate: GATE, url: URL };
  const blob = JSON.stringify(results, null, 1);
  writeFileSync(OUT, blob); // re-write with the provenance block included
  mkdirSync(join(__dirname, "results"), { recursive: true });
  writeFileSync(join(__dirname, "results", provName), blob);
  console.log(`provenance → scripts/conformance/results/${provName} (scope: ${scopeName})`);
  if (RATCHET_UPDATE && OUT !== join(__dirname, "results.json")) {
    writeFileSync(join(__dirname, "results.json"), blob);
    console.log(`ratchet backing blob → scripts/conformance/results.json (fresh full-matrix results.json written in this invocation)`);
  }
}

// ratchet floor update — AFTER all blobs are on disk (see the tail note above
// the summary): a raise is always backed by a reproducible full-matrix blob.
if (RATCHET_UPDATE && (ratchetValue == null || rate > ratchetValue)) {
  writeFileSync(RATCHET_FILE, JSON.stringify({ rate, total, pass: totalPass, fail: totalFail, updatedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log(`ratchet ${ratchetValue == null ? "created" : `${ratchetValue}→${rate}`}`);
}
process.exit(GATE && String(gateVerdict).startsWith("FAIL") ? 1 : 0);
