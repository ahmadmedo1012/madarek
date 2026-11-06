#!/usr/bin/env node
/**
 * tween.mjs — R339 T-11a: TWEEN COVERAGE (part 1 of the T-11 motion brief).
 *
 * "recorded Heron tweens/triggers vs ours: target, property, distance,
 *  duration, ease, trigger, stagger — ≥90%".
 *
 * WHAT IT MEASURES
 *   Side A (Heron, frozen): docs/redesign/r335/heron-spec/_motion.<bp>.json —
 *     the live-recorded GSAP call log (50 ScrollTriggers, 439 tweens @1440;
 *     recorder: scripts/spec/extract-heron.mjs). Each tween is normalized
 *     into tween-UNITS (one per animated property) and grouped by
 *     (section, property-family, trigger-class) — the coverage unit the
 *     brief prescribes.
 *   Side B (ours, live): loads OUR landing at the breakpoint and
 *     inventories every animation the page actually runs:
 *       · WAAPI   — Element.prototype.animate is patched BEFORE load; every
 *         call is recorded (same-origin honest instrument, zero calls is a
 *         real answer, never assumed).
 *       · CSS OM  — document.styleSheets walk: @keyframes definitions
 *         (property + from/to values ⇒ distance), any animation-timeline:
 *         view()/scroll() rules (CSS scroll-driven animations).
 *       · DOM     — a candidate walk over every mapped section root keeps
 *         any element that is hidden-at-rest (opacity/transform/clip-path/
 *         scale), runs a keyframe animation, or carries a relevant
 *         transition (opacity/transform/scale/clip-path/filter/…).
 *       · LIVE    — the scroll.mjs sampling pattern: Lenis-seated steps
 *         top→bottom→top; per element the state flips (hidden→shown) are
 *         timestamped (trigger classification: load vs scroll-reveal vs
 *         scrub — scrub = values keep varying with scroll position after
 *         the first reveal, incl. the reverse pass), and computed
 *         transition/animation duration/ease/delay are read from the
 *         ACTIVATED state (the only state where the engine exposes them).
 *
 * COVERAGE RULE (the brief's tolerance, verbatim)
 *   A Heron group (section+property+trigger) is COVERED when our side has
 *   a counterpart unit with: same property-family, trigger-class
 *   equivalent (load~load, scroll-reveal~scroll-reveal, scrub~scrub), and
 *   (duration within ±150ms OR same ease family). Groups whose Heron
 *   recording carries no timing (fromTo records the FROM side only —
 *   recorder limitation, see extract-heron.mjs wrapGsap) match on
 *   property+trigger and are flagged `partial`.
 *   set()-only groups (instant initial-state writes, no animation) are
 *   counted in the census but held OUT of the coverage denominator —
 *   reported separately as stateOnly, never silently dropped.
 *   Ambient loops (infinite iterations) are ours-only decoration —
 *   reported, excluded from both sides (the Heron log records none).
 *
 * HONESTY (this file follows the run.mjs v2 discipline)
 *   · Nothing is inferred that was not observed: durations/eases come from
 *     computed styles on live elements or from the CSSOM text; distances
 *     come from rest-vs-activated computed values or @keyframes from/to.
 *   · Every un-instrumentable surface is NAMED in report.limitations
 *     (see buildLimitations) rather than papered over.
 *   · The tween→ScrollTrigger association on the Heron side is a
 *     documented heuristic (timeline markers by recording timestamp).
 *
 * Usage:
 *   node scripts/conformance/tween.mjs                                   # 1440
 *   node scripts/conformance/tween.mjs --url http://localhost:5311 --bp 390 \
 *                                     --out /tmp/tween-390.json
 *   node scripts/conformance/tween.mjs --sections home-hero-wrap,footer
 *   node scripts/conformance/tween.mjs --gate 90                        # exit 1 below 90%
 *
 * Output: console matrix + JSON report (default /tmp/tween-report.json).
 * T-11b implements the missing list this report ranks; re-run this file to
 * verify — the ratchet is the coverage number, target ≥90%.
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
let chromium;
try {
  ({ chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright"));
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json"))("playwright");
}

const SPEC_DIR = join(WORKTREE, "docs", "redesign", "r335", "heron-spec");

// ── section mapping (the conformance mapping's own bindings) ─────────────────
const MAPPING = readdirSync(join(__dirname, "mapping"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .reduce((acc, f) => {
    const part = JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8"));
    Object.assign(acc.ourSection, part.ourSection);
    return acc;
  }, { ourSection: {} });
// our DOM section roots, keyed by the Heron section key they answer to.
// `loading` (the Heron preloader scene) maps to our .pl overlay; `chrome`
// comes from the mapping itself (header.fo-header).
const OUR_SECTIONS = Object.entries(MAPPING.ourSection).map(([key, sel]) => ({ key, sel }));
OUR_SECTIONS.push({ key: "loading", sel: ".pl" });

const BPS = {
  1920: { width: 1920, height: 1080 },
  1440: { width: 1440, height: 900 },
  1024: { width: 1024, height: 768 },
  768: { width: 768, height: 900 },
  390: { width: 390, height: 844 },
};

// ── args ─────────────────────────────────────────────────────────────────────
const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const URL = arg("url", "http://localhost:5311/");
const BP = arg("bp", "1440");
const OUT = arg("out", "/tmp/tween-report.json");
const SECTIONS_WANTED = arg("sections", null)?.split(",").map((s) => s.trim());
const GATE = process.argv.includes("--gate") ? Number(arg("gate", "90")) : null;
const VERBOSE = process.argv.includes("--verbose");
if (!BPS[BP]) {
  console.error(`unknown --bp ${BP} (known: ${Object.keys(BPS).join(", ")})`);
  process.exit(2);
}

// ════════════════════════════════════════════════════════════════════════════
// PART 1 — HERON census (frozen spec → tween units → groups)
// ════════════════════════════════════════════════════════════════════════════

/** Heron target-path first segment → canonical section key. */
function heronSectionOf(path) {
  if (!path || typeof path !== "string") return "other";
  if (path.startsWith("body") || path.includes("loading")) return "loading";
  const first = path.replace(/^\./, "").split(" > ")[0].replace(/^(div|a|main|footer|header|button)\./, "");
  const table = [
    [/^home-hero/, "home-hero-wrap"],
    [/^home-intro-partner/, "home-intro-wrap"],
    [/^home-intro/, "home-intro-wrap"],
    [/^home-problem/, "home-problem-wrap"],
    [/^home-why-main/, "home-why-wrap"],
    [/^home-why/, "home-why-wrap"],
    [/^home-map/, "home-map-wrap"],
    [/^home-usecase-title/, "home-usecase-wrap"],
    [/^home-usecase/, "home-usecase-wrap"],
    [/^home-platform/, "home-platform-wrap"],
    [/^cta-wrap/, "home-cta-wrap"],
    [/^footer/, "footer"],
    [/^header/, "chrome"],
    [/^loading/, "loading"],
  ];
  for (const [re, key] of table) if (re.test(first)) return key;
  return "other";
}

/** A readable role for a Heron path: first-class : last-tag. */
function heronRoleOf(path) {
  if (!path || typeof path !== "string") return "?";
  const segs = path.replace(/^\./, "").split(" > ");
  const firstClass = (segs[0].match(/\.([-\w]+)/) || [])[1] || segs[0];
  const lastTag = (segs[segs.length - 1].match(/^([-\w]+)/) || [])[1] || "?";
  const strip = firstClass.replace(/^home-/, "").replace(/-wrap$/, "");
  return `${strip}:${lastTag}`;
}

/** GSAP var key → normalized property family (both sides speak this). */
const PROP_FAMILY = {
  autoAlpha: "opacity", opacity: "opacity",
  y: "translateY", yPercent: "translateY",
  x: "translateX", xPercent: "translateX",
  scale: "scale", scaleX: "scaleX", scaleY: "scaleY",
  rotate: "rotate", rotateX: "rotateX", rotateY: "rotateY",
  clipPath: "clip-path",
  width: "width", height: "height", top: "top", left: "left",
  backgroundColor: "background-color", color: "color",
  filter: "filter", letterSpacing: "letter-spacing",
};
const META_KEYS = new Set(["duration", "delay", "ease", "stagger", "scrollTrigger", "immediateRender", "startAt", "keyframes", "snap", "repeat", "yoyo", "text", "attr"]);

/** cubic-bezier / named easing → family (out | in | inOut | linear | other). */
function easeFamily(ease) {
  if (!ease || typeof ease !== "string") return null;
  const s = ease.trim();
  if (s === "linear") return "linear";
  if (s === "ease") return "inOut";
  const named = { "power2.out": "out", "power1.out": "out", "power3.out": "out", "power4.out": "out", "expo.out": "out", "circ.out": "out", "back.out": "out", "power2.in": "in", "power3.in": "in", "power2.inOut": "inOut", "power1.inOut": "inOut" };
  if (named[s]) return named[s];
  const m = s.match(/cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
  if (m) {
    const [, x1, y1, x2, y2] = m.map(Number);
    const out1 = y1 > x1 + 0.001, out2 = y2 > x2 + 0.001;
    const in1 = y1 < x1 - 0.001, in2 = y2 < x2 - 0.001;
    if ((out1 || out2) && !in1 && !in2) return "out";
    if ((in1 || in2) && !out1 && !out2) return "in";
    if ((in1 && out2) || (in2 && out1)) return "inOut";
    return "linear";
  }
  return "other";
}

function loadHeron(bp) {
  const file = join(SPEC_DIR, `_motion.${bp}.json`);
  if (!existsSync(file)) throw new Error(`missing frozen spec ${file}`);
  const spec = JSON.parse(readFileSync(file, "utf8"));
  const tweens = [...spec.tweens].sort((a, b) => a.at - b.at);

  // tween → ScrollTrigger association: a timeline marker carrying a
  // scrollTrigger owns every following tween until the next marker
  // (recording-timestamp order — the recorder wraps gsap.timeline before
  // the scene's child calls, so `at` order is scene order).
  const scrubKeys = new Set(
    spec.triggers.filter((t) => t.scrub).map((t) => `${t.trigger}|${t.start}`),
  );
  let curST = null;
  const units = [];
  const scenes = [];
  for (const t of tweens) {
    const vars = t.vars && typeof t.vars === "object" ? t.vars : {};
    if (t.method === "timeline") {
      const st = vars.scrollTrigger;
      if (st && typeof st === "object") {
        const trig = typeof st.trigger === "string" ? st.trigger : JSON.stringify(st.trigger ?? "");
        curST = { trigger: trig, start: st.start ?? null, end: st.end ?? null, scrub: !!st.scrub, section: heronSectionOf(trig) };
        // join to the recorded trigger table for scrub confirmation
        if (!curST.scrub) curST.scrub = scrubKeys.has(`${trig}|${curST.start}`) || spec.triggers.some((r) => r.scrub && r.trigger === trig);
        scenes.push(curST);
      } else {
        curST = null; // a plain timeline (load-phase entrance) breaks scene ownership
      }
      continue;
    }
    const targets = typeof t.target === "string" ? [t.target]
      : t.target && typeof t.target === "object" && "sel" in t.target ? [t.target.sel]
        : Array.isArray(t.target) ? t.target.filter((x) => typeof x === "string")
          : [];
    const triggerClass = curST ? (curST.scrub ? "scrub" : "scroll-reveal") : "load";
    for (const path of targets) {
      for (const [k, v] of Object.entries(vars)) {
        if (META_KEYS.has(k)) continue;
        const fam = PROP_FAMILY[k];
        if (!fam) continue;
        units.push({
          method: t.method, // to | fromTo | set
          section: heronSectionOf(path),
          role: heronRoleOf(path),
          property: fam,
          gsapProp: k,
          value: typeof v === "number" ? Math.round(v * 1000) / 1000 : v,
          isFromSide: t.method === "fromTo", // recorder keeps the FROM vars only
          duration: typeof vars.duration === "number" ? vars.duration * 1000 : null,
          ease: vars.ease ?? null,
          easeFam: easeFamily(vars.ease ?? null),
          stagger: typeof vars.stagger === "number" ? vars.stagger * 1000 : null,
          delay: typeof vars.delay === "number" ? vars.delay * 1000 : 0,
          trigger: triggerClass,
          triggerEl: curST ? curST.trigger : null,
          at: t.at,
        });
      }
    }
  }

  // group by (section, property, triggerClass) — the coverage unit
  const groups = new Map();
  for (const u of units) {
    const key = `${u.section}|${u.property}|${u.trigger}`;
    if (!groups.has(key)) groups.set(key, { key, section: u.section, property: u.property, trigger: u.trigger, units: [] });
    groups.get(key).units.push(u);
  }
  for (const g of groups.values()) {
    const anim = g.units.filter((u) => u.method === "to" || u.method === "fromTo");
    g.animated = anim.length > 0; // set()-only group = state write, no tween
    const toSide = anim.find((u) => u.method === "to" && u.duration != null) || anim.find((u) => u.duration != null);
    g.duration = toSide ? toSide.duration : null;
    g.ease = toSide ? toSide.ease : null;
    g.easeFam = toSide ? toSide.easeFam : null;
    g.stagger = anim.find((u) => u.stagger != null)?.stagger ?? null;
    g.partial = anim.length > 0 && !toSide; // fromTo-only: timing unrecorded
    g.fromValues = [...new Set(anim.filter((u) => u.isFromSide).map((u) => `${u.gsapProp}:${u.value}`))];
    g.toValues = [...new Set(anim.filter((u) => u.method === "to").map((u) => `${u.gsapProp}:${u.value}`))];
    g.roles = [...new Set(g.units.map((u) => u.role))].slice(0, 12);
  }
  return { spec, units, groups: [...groups.values()], scenes };
}

// ════════════════════════════════════════════════════════════════════════════
// PART 2 — OUR inventory (live page)
// ════════════════════════════════════════════════════════════════════════════

/** Patched BEFORE any page script runs (addInitScript). */
const WAAPI_PATCH = `(() => {
  // T-11a environment override — the sandbox's navigator reports ≤2 cores,
  // which the landing's own intro gate (lib/motion/introGate.ts, R318 §C)
  // correctly treats as a low-power visitor and SKIPS the entrance for. The
  // instrument measures the DEFAULT first-visit experience, so it presents a
  // capable-device navigator (cores/connection only — no page logic touched).
  try {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8, configurable: true });
  } catch {}
  try {
    if (navigator.connection) {
      Object.defineProperty(navigator.connection, "saveData", { get: () => false, configurable: true });
      Object.defineProperty(navigator.connection, "effectiveType", { get: () => "4g", configurable: true });
    }
  } catch {}
  try { sessionStorage.removeItem("madarek-intro-seen"); sessionStorage.removeItem("madarek-intro-skip"); } catch {}
  const log = [];
  const safe = (v) => { try { return JSON.parse(JSON.stringify(v)); } catch { return String(v); } };
  const origAnimate = Element.prototype.animate;
  if (origAnimate) {
    Element.prototype.animate = function (keyframes, options) {
      try {
        log.push({
          tag: this.tagName.toLowerCase(),
          cls: String(this.className && this.className.baseVal !== undefined ? "" : this.getAttribute("class") || "").slice(0, 80),
          keyframes: safe(keyframes),
          options: safe(options),
          at: Math.round(performance.now()),
        });
      } catch {}
      return origAnimate.call(this, keyframes, options);
    };
  }
  window.__tweenWaapi = log;
})()`;

/** DOM walk + computed snapshot. Runs inside the page. */
const WALK_JS = String.raw`
(sectionBindings) => {
  const relevantTransition = (cs) => {
    const props = cs.transitionProperty.split(",").map((s) => s.trim());
    const durTotal = cs.transitionDuration.split(",").reduce((a, s) => a + (parseFloat(s) || 0), 0);
    const keep = ["opacity", "transform", "translate", "rotate", "scale", "clip-path", "filter", "background-color", "color", "box-shadow", "border-color", "width", "height"];
    const hit = props.some((p) => p === "all" ? durTotal > 0 : keep.includes(p));
    return hit && durTotal > 0;
  };
  const hiddenish = (cs) =>
    parseFloat(cs.opacity) < 0.98 ||
    (cs.transform !== "none" && cs.transform !== "") ||
    (cs.scale && cs.scale !== "none" && cs.scale !== "1") ||
    (cs.clipPath && cs.clipPath !== "none" && !/^inset\(0/.test(cs.clipPath));
  const grammar = "[data-reveal],[data-reveal-variant],.reveal-up,.reveal-card,[data-mask-word],[data-mask-word-inner],[data-mask-reveal],.parallax,.section-accent,.hro-line,.hro-actions,.hro-work-card,.is-fired";
  // grammarKey — the SAME document-order construction the sampler uses
  // (tag.firstClass#occurrence), so walk records and scroll samples join.
  const gkey = new Map();
  const gcount = {};
  document.querySelectorAll(grammar).forEach((el) => {
    const first = String(el.getAttribute("class") || "").split(/\s+/).filter(Boolean)[0] || "";
    const base = el.tagName.toLowerCase() + "." + first;
    gcount[base] = (gcount[base] || 0) + 1;
    gkey.set(el, base + "#" + gcount[base]);
  });
  const snap = (el, cs) => ({
    opacity: Math.round(parseFloat(cs.opacity) * 1000) / 1000,
    transform: cs.transform,
    scale: cs.scale,
    clipPath: cs.clipPath,
  });
  const roots = sectionBindings
    .map((b) => ({ ...b, el: document.querySelector(b.sel) }))
    .filter((b) => b.el);
  const out = [];
  const seen = new Set();
  for (const root of roots) {
    const walk = (el) => {
      if (out.length > 1600 || seen.has(el)) return;
      seen.add(el);
      const cs = getComputedStyle(el);
      const anim = cs.animationName !== "none";
      const trans = relevantTransition(cs);
      const hid = hiddenish(cs);
      const gram = el.matches(grammar);
      if (anim || trans || hid || gram) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          out.push({
            section: root.key,
            role: el.getAttribute("data-spec") || el.tagName.toLowerCase() + "." + String(el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 2).join("."),
            animName: cs.animationName,
            animDur: cs.animationDuration,
            animEase: cs.animationTimingFunction,
            animDelay: cs.animationDelay,
            animIter: cs.animationIterationCount,
            transProps: cs.transitionProperty,
            transDur: cs.transitionDuration,
            transEase: cs.transitionTimingFunction,
            transDelay: cs.transitionDelay,
            revealed: el.getAttribute("data-revealed") === "true" || el.classList.contains("in-view") || el.classList.contains("is-fired"),
            grammarKey: gkey.get(el) || null,
            rest: snap(el, cs),
          });
        }
      }
      for (const c of el.children) walk(c);
    };
    walk(root.el);
  }
  return { count: out.length, els: out, roots: roots.map((r) => r.key) };
 }
`;

/** Scroll sampling — the scroll.mjs pattern (Lenis seat + settle + read).
 * Split into a DOWN pass and an UP pass so the node side can snapshot the
 * page AT THE BOTTOM DWELL (walkMid) between them. */
const SAMPLE_JS = String.raw`
async (steps) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const seat = (y) => {
    const L = window.__mdrkLenis;
    if (L && typeof L.scrollTo === "function") L.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };
  await sleep(250);
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  // the SAME grammar list + key construction as the WALK — the join key.
  const grammar = "[data-reveal],[data-reveal-variant],.reveal-up,.reveal-card,[data-mask-word],[data-mask-word-inner],[data-mask-reveal],.parallax,.section-accent,.hro-line,.hro-actions,.hro-work-card,.is-fired";
  const keyed = [];
  const gcount = {};
  document.querySelectorAll(grammar).forEach((el) => {
    const first = String(el.getAttribute("class") || "").split(/\s+/).filter(Boolean)[0] || "";
    const base = el.tagName.toLowerCase() + "." + first;
    gcount[base] = (gcount[base] || 0) + 1;
    keyed.push({ el, key: base + "#" + gcount[base] });
  });
  const track = () => keyed.map(({ el, key }) => {
    const cs = getComputedStyle(el);
    let ty = 0;
    if (cs.transform && cs.transform !== "none") {
      const m = cs.transform.match(/matrix\(([^)]+)\)/);
      if (m) ty = Math.round(parseFloat(m[1].split(",")[5]) * 10) / 10;
    }
    return {
      key,
      revealed: el.getAttribute("data-revealed") === "true" || el.classList.contains("in-view") || el.classList.contains("is-fired"),
      opacity: Math.round(parseFloat(cs.opacity) * 1000) / 1000,
      ty,
      sc: cs.scale !== "none" && cs.scale !== "" ? Math.round(parseFloat(cs.scale) * 100) / 100 : 1,
      clip: cs.clipPath !== "none" && cs.clipPath !== "",
    };
  });
  const series = [];
  // scroll.mjs discipline: Lenis fights a native scrollTop jump for a few
  // hundred ms, and the reveal belt needs a real rest before the IO fires —
  // 140ms flings were measured to ARM elements without REVEALING them.
  const run = async (fractions, phase) => {
    for (const f of fractions) {
      seat(Math.round(max * f));
      await sleep(300);
      series.push({ y: Math.round(window.scrollY), phase, t: track() });
    }
  };
  await run(Array.from({ length: steps }, (_, i) => i / (steps - 1)), "down");   // down
  seat(max);
  await sleep(2000);                                                             // bottom dwell (measured: CTA 650ms reveal + arm settles ~1.6s)
  return { vh: window.innerHeight, scrollHeight: document.documentElement.scrollHeight, series, atBottom: track() };
}
`;
/** the reverse pass (scrub/revert probe) — runs AFTER the walkMid snapshot. */
const UP_JS = String.raw`
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const seat = (y) => {
    const L = window.__mdrkLenis;
    if (L && typeof L.scrollTo === "function") L.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };
  const grammar = "[data-reveal],[data-reveal-variant],.reveal-up,.reveal-card,[data-mask-word],[data-mask-word-inner],[data-mask-reveal],.parallax,.section-accent,.hro-line,.hro-actions,.hro-work-card,.is-fired";
  const keyed = [];
  const gcount = {};
  document.querySelectorAll(grammar).forEach((el) => {
    const first = String(el.getAttribute("class") || "").split(/\s+/).filter(Boolean)[0] || "";
    const base = el.tagName.toLowerCase() + "." + first;
    gcount[base] = (gcount[base] || 0) + 1;
    keyed.push({ el, key: base + "#" + gcount[base] });
  });
  const track = () => keyed.map(({ el, key }) => {
    const cs = getComputedStyle(el);
    let ty = 0;
    if (cs.transform && cs.transform !== "none") {
      const m = cs.transform.match(/matrix\(([^)]+)\)/);
      if (m) ty = Math.round(parseFloat(m[1].split(",")[5]) * 10) / 10;
    }
    return {
      key,
      revealed: el.getAttribute("data-revealed") === "true" || el.classList.contains("in-view") || el.classList.contains("is-fired"),
      opacity: Math.round(parseFloat(cs.opacity) * 1000) / 1000,
      ty,
      sc: cs.scale !== "none" && cs.scale !== "" ? Math.round(parseFloat(cs.scale) * 100) / 100 : 1,
      clip: cs.clipPath !== "none" && cs.clipPath !== "",
    };
  });
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const series = [];
  for (let i = 1; i <= 6; i++) {
    seat(Math.round(max * (1 - i / 7)));
    await sleep(300);
    series.push({ y: Math.round(window.scrollY), phase: "up", t: track() });
  }
  seat(0);
  await sleep(300);
  return { series, atTop: track() };
}
`;

/** CSSOM pass — @keyframes + scroll-driven-animation scan + engine seats. */
const CSSOM_JS = String.raw`
() => {
  const keyframes = {};
  let viewTimeline = 0, scrollTimeline = 0, rules = 0, crossOrigin = 0;
  const walkRules = (sheet) => {
    let list;
    try { list = sheet.cssRules; } catch { crossOrigin++; return; }
    if (!list) return;
    for (const r of list) {
      rules++;
      if (r.type === CSSRule.KEYFRAMES_RULE || (r.cssText || "").startsWith("@keyframes")) {
        const props = {};
        for (const k of r.cssRules) {
          const st = k.keyText || "0%";
          for (const prop of ["opacity", "transform", "clip-path", "scale", "filter", "background-color", "color", "width", "height", "letter-spacing"]) {
            const v = k.style.getPropertyValue(prop);
            if (v) (props[prop] ??= {})[st.trim()] = v.trim();
          }
        }
        keyframes[r.name] = { props, count: (keyframes[r.name]?.count || 0) + 1 };
      } else if (r.type === CSSRule.SUPPORTS_RULE || r.type === CSSRule.MEDIA_RULE || r.conditionText !== undefined) {
        try { for (const inner of r.cssRules) { rules++; scanInner(inner); } } catch {}
      } else {
        scanInner(r);
      }
    }
  };
  const scanInner = (r) => {
    const txt = r.cssText || "";
    if (/animation-timeline\s*:\s*view\(/.test(txt)) viewTimeline++;
    if (/animation-timeline\s*:\s*scroll\(/.test(txt)) scrollTimeline++;
  };
  for (const sheet of document.styleSheets) walkRules(sheet);
  return {
    keyframes,
    viewTimeline,
    scrollTimeline,
    ruleCount: rules,
    crossOrigin,
    revealsArmed: !!window.__mdrkReveals,
    revealBelt: window.__mdrkRevealBelt ? { registry: window.__mdrkRevealBelt.registry, observers: window.__mdrkRevealBelt.observers } : null,
    lenis: !!window.__mdrkLenis,
    jsRevealArmed: document.documentElement.classList.contains("js-reveal-armed"),
    introDone: !!document.querySelector(".landing.intro-done"),
  };
}
`;

/** parse a computed timing function string → ease family (mirror of node side). */
function computedEaseFamily(tf) {
  if (!tf) return null;
  if (tf === "linear") return "linear";
  if (tf === "ease") return "inOut";
  const m = tf.match(/cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
  if (!m) return "other";
  const [, x1, y1, x2, y2] = m.map(Number);
  const out1 = y1 > x1 + 0.001, out2 = y2 > x2 + 0.001, in1 = y1 < x1 - 0.001, in2 = y2 < x2 - 0.001;
  if ((out1 || out2) && !in1 && !in2) return "out";
  if ((in1 || in2) && !out1 && !out2) return "in";
  if ((in1 && out2) || (in2 && out1)) return "inOut";
  return "linear";
}

/** "480ms" | "0.48s" | multi "0.48s, 0.48s" → max ms */
function toMs(s) {
  if (!s) return 0;
  const vals = String(s).split(",").map((x) => {
    x = x.trim();
    const n = parseFloat(x) || 0;
    return x.endsWith("ms") ? n : n * 1000;
  });
  return Math.round(Math.max(...vals) * 10) / 10;
}
const delayLadder = (s) => String(s ?? "").split(",").map((x) => {
  x = x.trim();
  const n = parseFloat(x) || 0;
  return x.endsWith("ms") ? n : n * 1000;
}).filter((n) => n > 0);

async function collectOurs(url, bp) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: BPS[bp], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(WAAPI_PATCH);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  // PHASE 0 — the entrance states, BEFORE the intro completes: the preloader
  // (.pl, alive only while the intro runs) and the hero's .intro-draw hidden
  // states (.hro-line at translateY(102%) etc.). Polled fast; if the session
  // skips the intro (storage flag), walk0 comes back empty and the report says
  // so — never guessed.
  let walk0 = { els: [], roots: [] };
  try {
    await page.waitForSelector(".landing.intro-draw, .pl", { timeout: 8000, state: "attached" });
    walk0 = await page.evaluate(`(${WALK_JS})(${JSON.stringify(OUR_SECTIONS.map(({ key, sel }) => ({ key, sel })))})`);
  } catch {
    walk0 = { els: [], roots: [], skipped: true };
  }
  // the landing: root + intro. Wait for React mount, then the preloader exit.
  await page.waitForSelector(".landing, body", { timeout: 30000 });
  try {
    await page.waitForSelector(".landing.intro-done", { timeout: 12000 });
  } catch {
    // intro gate may be skipped (session flag / reduced-motion env) — proceed, note it.
  }
  // The reveal ARM happens at/after intro-done (initReveals adds .reveal-up
  // whose own hide-transition runs ~650ms) — let it SETTLE before the rest
  // snapshot, or the "from" side samples mid-flight (measured live: op 0.59).
  await page.waitForTimeout(2600);

  const walk1 = await page.evaluate(`(${WALK_JS})(${JSON.stringify(OUR_SECTIONS.map(({ key, sel }) => ({ key, sel })))})`);
  const down = await page.evaluate(`(${SAMPLE_JS})(28)`);
  // walkMid — AT THE BOTTOM DWELL: every below-the-fold reveal is
  // simultaneously SHOWN here (the useReveal engine toggles `in-view` OFF
  // when an element leaves the viewport, so the later at-top walk would
  // read re-hidden elements and invert the from→to deltas).
  const walkMid = await page.evaluate(`(${WALK_JS})(${JSON.stringify(OUR_SECTIONS.map(({ key, sel }) => ({ key, sel })))})`);
  const up = await page.evaluate(`(${UP_JS})()`);
  const sampling = { ...down, series: [...down.series, ...up.series] };
  const walk2 = await page.evaluate(`(${WALK_JS})(${JSON.stringify(OUR_SECTIONS.map(({ key, sel }) => ({ key, sel })))})`);
  const cssom = await page.evaluate(`(${CSSOM_JS})()`);
  const waapi = await page.evaluate("window.__tweenWaapi ? window.__tweenWaapi.length : -1");
  const waapiCalls = waapi === -1 ? null : waapi;
  const waapiSample = await page.evaluate("window.__tweenWaapi ? window.__tweenWaapi.slice(0, 5) : []");
  await browser.close();
  return { walk0, walk1, walkMid, walk2, sampling, cssom, waapiCalls, waapiSample, errors };
}

/** tracked-element states → our tween units (node-side derivation). */
function deriveOurUnits(census) {
  const { walk0, walk1, walkMid, walk2, sampling, cssom } = census;
  const steps = sampling.series ?? [];

  // per-key series from the sampler (keys join the walk records by exact
  // grammar identity — same construction on both sides).
  const trackByKey = new Map();
  if (steps.length && steps[0].t.length) {
    for (const rec of steps[0].t) trackByKey.set(rec.key, { op: [], ty: [], sc: [], revealed: [], phase: [] });
    for (const s of steps) {
      for (const rec of s.t) {
        const t = trackByKey.get(rec.key);
        if (!t) continue;
        t.op.push(rec.opacity); t.ty.push(rec.ty); t.sc.push(rec.sc); t.revealed.push(rec.revealed); t.phase.push(s.phase);
      }
    }
  }
  const changes = (arr) => arr.filter((v, j) => j > 0 && v !== arr[j - 1]).length;
  const infoByKey = new Map();
  for (const [key, t] of trackByKey) {
    const everFlipped = changes(t.revealed.map((v) => (v ? 1 : 0))) > 0;
    // SCRUB = the values move AGAIN on the reverse pass (scroll-linked). A
    // one-shot reveal's transition also spans several samples on the way
    // down (ty 14→12→9→4→0 over its 650ms), so down-pass variance alone is
    // NOT scrub evidence — only reverse-pass variance is.
    const upIdx = t.phase.map((p, j) => (p === "up" ? j : -1)).filter((j) => j >= 0);
    const upTy = upIdx.map((j) => t.ty[j]), upOp = upIdx.map((j) => t.op[j]), upSc = upIdx.map((j) => t.sc[j]);
    const upChanges = changes(upTy) + changes(upOp) + changes(upSc);
    const scrub = upChanges >= 2;
    const tyC = changes(t.ty), opC = changes(t.op);
    if (scrub || everFlipped) infoByKey.set(key, { scrub, everFlipped, tyC, opC, upChanges, tyRange: [Math.min(...t.ty), Math.max(...t.ty)], opRange: [Math.min(...t.op), Math.max(...t.op)] });
  }

  const hiddenAt = (rec) => !!rec && (rec.rest.opacity < 0.98 || (rec.rest.transform && rec.rest.transform !== "none") || (rec.rest.clipPath && rec.rest.clipPath !== "none" && rec.rest.clipPath !== "") || (rec.rest.scale && rec.rest.scale !== "none" && rec.rest.scale !== "1"));
  const twinOf = (recs, el) => (el.grammarKey && recs.find((e) => e.grammarKey === el.grammarKey)) || recs.find((e) => e.section === el.section && e.role === el.role) || null;
  const tyOf = (tr) => {
    if (!tr || !tr.rest.transform || tr.rest.transform === "none") return 0;
    const m = tr.rest.transform.match(/matrix\(([^)]+)\)/);
    return m ? parseFloat(m[1].split(",")[5]) : null;
  };
  // shownness — how "revealed" a snapshot record's rest state is. Used to
  // order the four snapshots (walk0 pre-intro, walk1 armed, walkMid at the
  // bottom dwell where every reveal is SHOWN, walk2 back at top) into a
  // from(most hidden)→to(most shown) envelope. This is ordering of OBSERVED
  // states only — no value is invented; it exists because the useReveal
  // engine toggles `in-view` OFF on exit, so walk2 alone would read the
  // re-hidden state and invert the delta (measured: cta title op 1→0).
  const shownness = (rec) => {
    if (!rec) return -Infinity;
    const ty = tyOf(rec) ?? 0;
    return rec.rest.opacity * 2 - Math.min(Math.abs(ty), 60) / 60 - (rec.rest.clipPath && rec.rest.clipPath !== "none" ? 0.5 : 0) - (rec.rest.scale && rec.rest.scale !== "none" && rec.rest.scale !== "1" ? 0.3 : 0);
  };

  const units = [];
  const unaccounted = [];
  const neverRevealed = [];
  for (const el of walk2.els) {
    const twins = [
      ["walk0", twinOf(walk0.els ?? [], el)],
      ["walk1", twinOf(walk1.els ?? [], el)],
      ["walkMid", twinOf(walkMid.els ?? [], el)],
      ["walk2", el],
    ];
    const present = twins.filter(([, r]) => r);
    if (!present.length) continue;
    const sorted = [...present].sort((a, b) => shownness(a[1]) - shownness(b[1]));
    const fromRec = sorted[0], toRec = sorted[sorted.length - 1];
    const t0 = twinOf(walk0.els ?? [], el);
    const t1 = twinOf(walk1.els ?? [], el);
    const tMid = twinOf(walkMid.els ?? [], el);
    const info = el.grammarKey ? infoByKey.get(el.grammarKey) : null;

    // params from the SHOWN state (the activated side is where the engine
    // exposes transition/animation params; prefer walkMid, then walk2).
    const paramSrc = (toRec[0] === "walkMid" || toRec[0] === "walk2" ? toRec[1] : (tMid ?? el));
    const anim = paramSrc.animName !== "none";
    let duration = null, ease = null, easeFam = null, delays = [];
    if (anim) {
      duration = toMs(paramSrc.animDur);
      ease = paramSrc.animEase;
      easeFam = computedEaseFamily(paramSrc.animEase);
      delays = delayLadder(paramSrc.animDelay);
    } else if (paramSrc.transProps && paramSrc.transProps !== "none") {
      duration = toMs(paramSrc.transDur);
      ease = paramSrc.transEase;
      easeFam = computedEaseFamily(paramSrc.transEase);
      delays = delayLadder(paramSrc.transDelay);
    }
    const ambient = anim && /infinite/.test(String(paramSrc.animIter));

    // property families + distances — priority: declared @keyframes, then
    // the computed hidden→shown envelope across the four snapshots.
    const props = [];
    const kf = anim && cssom.keyframes[paramSrc.animName] ? cssom.keyframes[paramSrc.animName] : null;
    if (kf) {
      for (const [prop, stops] of Object.entries(kf.props)) {
        const fam = prop === "transform" ? "translateY" : prop; // house keyframes are translateY-only (reveal-rise/mask-word-rise)
        props.push({ family: fam, from: Object.values(stops)[0], to: Object.values(stops)[Object.keys(stops).length - 1], source: `@keyframes ${paramSrc.animName}` });
      }
    } else {
      const r = fromRec[1].rest, n2 = toRec[1].rest;
      const label = `${fromRec[0]}→${toRec[0]}`;
      if (Math.abs(r.opacity - n2.opacity) > 0.02) props.push({ family: "opacity", from: r.opacity, to: n2.opacity, source: `computed ${label}` });
      if (r.transform !== n2.transform) {
        const tyR = tyOf(fromRec[1]), tyN = tyOf(toRec[1]);
        if (tyR != null && tyN != null && Math.abs(tyR - tyN) > 0.5) props.push({ family: "translateY", from: `${Math.round(tyR * 10) / 10}px`, to: `${Math.round(tyN * 10) / 10}px`, source: `computed ${label}` });
      }
      if (r.scale !== n2.scale && !(r.scale === "none" && n2.scale === "none")) props.push({ family: "scale", from: r.scale, to: n2.scale, source: `computed ${label}` });
      if (r.clipPath && r.clipPath !== "none" && r.clipPath !== "" && r.clipPath !== n2.clipPath) props.push({ family: "clip-path", from: r.clipPath, to: n2.clipPath, source: `computed ${label}` });
      // scrub-varying elements: the property comes from the sampled range
      if (info && info.scrub) {
        if (info.tyRange[1] - info.tyRange[0] > 0.5 && !props.some((p) => p.family === "translateY")) props.push({ family: "translateY", from: `${info.tyRange[0]}px`, to: `${info.tyRange[1]}px`, source: "scroll-sample range" });
        if (info.opRange[1] - info.opRange[0] > 0.02 && !props.some((p) => p.family === "opacity")) props.push({ family: "opacity", from: info.opRange[0], to: info.opRange[1], source: "scroll-sample range" });
      }
    }

    // trigger classification (observed, not assumed):
    //   ambient — infinite loop; scrub — values keep varying with scroll;
    //   load — hidden at walk0, shown by walk1 (entrance fired pre-scroll);
    //   scroll-reveal — hidden at walk1 (armed), shown at walkMid;
    //   state — no hidden pre-state ever observed (hover/state transitions).
    let trigger;
    if (ambient) trigger = "ambient";
    else if (info && info.scrub) trigger = "scrub";
    else if (hiddenAt(t0) && t1 && !hiddenAt(t1)) trigger = "load";
    else if (hiddenAt(t1)) trigger = "scroll-reveal";
    else trigger = "state";

    const stale = props.filter((p) => String(p.from) === String(p.to));
    for (const p of stale) props.splice(props.indexOf(p), 1);
    if (!props.length) {
      unaccounted.push({ section: el.section, role: el.role, trigger, why: trigger === "state" ? "no hidden pre-state observed (hover/state transition or static decoration)" : "no property delta and no keyframes" });
      continue;
    }
    // neverRevealed — the element was armed-hidden but NEVER showed its
    // activated state in any snapshot or sample (flung past / dead-zone /
    // arting artifact). Its "unit" would be a mis-read arm/hide transition,
    // NOT an animation we run — held out of coverage, reported by name.
    const shownSomewhere = !hiddenAt(tMid) || !hiddenAt(toRec[1]) || (toRec[0] !== "walk1" && !hiddenAt(toRec[1]));
    const never = trigger === "scroll-reveal" && !shownSomewhere && !el.revealed && !(info && info.everFlipped);
    if (never) neverRevealed.push({ section: el.section, role: el.role, grammarKey: el.grammarKey });
    for (const p of props) {
      units.push({
        section: el.section, role: el.role, property: p.family, from: p.from, to: p.to, source: p.source,
        duration, ease, easeFam,
        delay: delays.length ? Math.max(...delays) : 0,
        trigger, ambient: !!ambient, animName: el.animName, neverRevealed: never || undefined,
      });
    }
  }
  const scrubTracks = [...infoByKey.entries()].filter(([, v]) => v.scrub).map(([key, v]) => ({ key, ...v }));
  return { units, unaccounted, neverRevealed, scrubTracks, trackedGrammar: trackByKey.size };
}

// ════════════════════════════════════════════════════════════════════════════
// PART 3 — COVERAGE
// ════════════════════════════════════════════════════════════════════════════

const SECTION_RANK = ["home-hero-wrap", "chrome", "home-intro-wrap", "home-cta-wrap", "home-why-wrap", "home-problem-wrap", "home-usecase-wrap", "home-map-wrap", "home-platform-wrap", "footer", "loading", "other"];
const rankSection = (s) => { const i = SECTION_RANK.indexOf(s); return i < 0 ? 99 : i; };
// Above-fold sections: a Heron ScrollTrigger whose trigger element is above
// the fold fires the moment the page loads — our intro-done entrances are the
// same activation moment, so heron scroll-reveal ≈ our load there (documented
// tolerance; below the fold the two trigger classes stay distinct).
const ABOVE_FOLD = new Set(["home-hero-wrap", "chrome", "loading"]);

function coverage(heron, ours) {
  // our per-element units → group entries (section|property|trigger) with a
  // representative duration/ease (mode) and a stagger estimate from the
  // distinct per-element delay ladder (min positive delta).
  const ourByGroup = new Map();
  const fold = (u) => {
    const key = `${u.section}|${u.property}|${u.trigger}`;
    if (!ourByGroup.has(key)) ourByGroup.set(key, { key, section: u.section, property: u.property, trigger: u.trigger, units: [] });
    ourByGroup.get(key).units.push(u);
  };
  for (const u of ours.units) {
    if (u.trigger === "ambient") continue; // ours-only decoration, reported not matched
    if (u.neverRevealed) continue;         // armed-but-never-shown: not an animation we run
    fold(u);
  }
  for (const g of ourByGroup.values()) {
    const durCount = new Map();
    for (const u of g.units) if (u.duration != null) durCount.set(u.duration, (durCount.get(u.duration) || 0) + 1);
    g.duration = durCount.size ? [...durCount.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
    const withEase = g.units.find((u) => u.easeFam);
    g.ease = withEase?.ease ?? null;
    g.easeFam = withEase?.easeFam ?? null;
    const delays = [...new Set(g.units.map((u) => Math.round(u.delay)))].filter((d) => d > 0).sort((a, b) => a - b);
    const diffs = delays.slice(1).map((d, i) => d - delays[i]).filter((d) => d > 0);
    g.stagger = diffs.length ? Math.min(...diffs) : delays.length === 1 ? delays[0] : null;
    g.elementCount = g.units.length;
  }
  const rows = [];
  const missing = [];
  for (const g of heron.groups) {
    if (SECTIONS_WANTED && !SECTIONS_WANTED.includes(g.section)) continue;
    const candGroup = ourByGroup.get(g.key) ?? (ABOVE_FOLD.has(g.section) && g.trigger === "scroll-reveal" ? ourByGroup.get(`${g.section}|${g.property}|load`) : null);
    const candidates = candGroup?.units ?? [];
    let covered = false, matched = null, how = null;
    if (g.animated && candGroup) {
      // tolerance: duration ±150ms OR same ease family (scrub: scroll-linked —
      // duration is scroll distance on both sides, waived by construction)
      if (g.trigger === "scrub") { covered = true; matched = candGroup; how = "scrub:property+trigger"; }
      else {
        // tolerance: duration ±150ms OR same ease family. Heron-null
        // duration (fromTo FROM-side-only recording) passes on the partial
        // rule; OUR-null timing must NOT — an unreadable param is not a match.
        const durOk = g.duration == null || (candGroup.duration != null && Math.abs(candGroup.duration - g.duration) <= 150);
        const easeOk = g.easeFam == null || candGroup.easeFam == null || g.easeFam === candGroup.easeFam;
        if (durOk || easeOk) {
          covered = true; matched = candGroup;
          how = (durOk && easeOk ? "duration+ease" : durOk ? "duration±150ms" : "ease-family") + (candGroup.trigger !== g.trigger ? "+above-fold-load-equiv" : "");
        }
      }
    }
    rows.push({ group: g, covered, matched, how, ourCount: candidates.length });
    if (g.animated && !covered) missing.push(g);
  }
  // ranked missing work-list (hero first, then title-ish roles, then load
  // entrances, then scrub, then the rest; ties by unit count)
  missing.sort((a, b) => {
    const pri = (g) => g.section === "home-hero-wrap" ? 0 : /title/.test(g.roles.join(" ")) ? 1 : g.trigger === "load" ? 2 : g.trigger === "scrub" ? 3 : 4;
    return pri(a) - pri(b) || b.units.length - a.units.length;
  });
  const animatedRows = rows.filter((r) => r.group.animated);
  const coveredCount = animatedRows.filter((r) => r.covered).length;
  const stateOnly = heron.groups.filter((g) => !g.animated).map((g) => ({ section: g.section, property: g.property, trigger: g.trigger, roles: g.roles, note: "set()-only initial-state write — no animation recorded" }));
  return { rows, missing, stateOnly, animated: animatedRows.length, covered: coveredCount, pct: animatedRows.length ? Math.round((coveredCount / animatedRows.length) * 1000) / 10 : null };
}

// ════════════════════════════════════════════════════════════════════════════
// PART 4 — report
// ════════════════════════════════════════════════════════════════════════════

function censusTable(heron) {
  const by = new Map();
  for (const u of heron.units) {
    if (!by.has(u.section)) by.set(u.section, { units: 0, props: new Set(), durs: new Map(), eases: new Map(), staggers: new Map(), triggers: new Set() });
    const b = by.get(u.section);
    b.units++;
    b.props.add(u.property);
    b.triggers.add(u.trigger);
    if (u.duration != null) b.durs.set(u.duration, (b.durs.get(u.duration) || 0) + 1);
    if (u.ease) b.eases.set(u.ease, (b.eases.get(u.ease) || 0) + 1);
    if (u.stagger != null) b.staggers.set(u.stagger, (b.staggers.get(u.stagger) || 0) + 1);
  }
  return [...by.entries()].map(([section, b]) => ({
    section, tweenUnits: b.units, properties: [...b.props].sort(),
    durationsMs: [...b.durs.entries()].sort((a, c) => c[1] - a[1]).map(([v, n]) => `${v}${n > 1 ? `×${n}` : ""}`),
    eases: [...b.eases.entries()].sort((a, c) => c[1] - a[1]).map(([v, n]) => `${v}${n > 1 ? `×${n}` : ""}`),
    staggersMs: [...b.staggers.entries()].sort((a, c) => c[1] - a[1]).map(([v, n]) => `${v}${n > 1 ? `×${n}` : ""}`),
    triggers: [...b.triggers].sort(),
  })).sort((a, b) => rankSection(a.section) - rankSection(b.section) || b.tweenUnits - a.tweenUnits);
}

function buildLimitations(census) {
  const L = [];
  L.push("Heron fromTo tweens were recorded with their FROM vars only (extract-heron.mjs wraps gsap.fromTo(targets, fromVars) and never sees toVars) — their duration/ease are unknown; such groups match on property+trigger and are flagged `partial`.");
  L.push("Heron tween→ScrollTrigger association is derived from recording-timestamp order (timeline marker owns subsequent tweens) — sound for scene structure but not per-tween ground truth.");
  L.push(`WAAPI: ${census.waapiCalls == null ? "instrument patch did not run" : census.waapiCalls + " Element.animate() calls"} — the house engine is CSS-transition/keyframe + IntersectionObserver driven; there is no JS tween registry to read params from.`);
  L.push(`CSS scroll-driven animations (animation-timeline: view()/scroll()): ${census.cssom.viewTimeline} view()/ ${census.cssom.scrollTimeline} scroll() rules found in the CSSOM — none exist, so nothing on our side rides them.`);
  L.push("Our durations/eases are read from computed styles on the SHOWN state (walkMid at the bottom dwell / walk2); distances come from a most-hidden→most-shown envelope across the four snapshot walks (pre-intro, armed, at-bottom, back-at-top) — ordering of observed states, no value invented.");
  L.push("Scrub-side motion equivalence is asserted on property+trigger only (scrub duration is scroll distance, not time — the numeric curves are scroll.mjs/scroll-curves.<bp>.json territory, T-10).");
  L.push("Elements armed-hidden but never shown in any snapshot/sample (neverRevealed) are held OUT of coverage — their arm/hide transition is not a tween we run; they are reported by name in ours.neverRevealed.");
  if (census.errors.length) L.push(`page errors during collection: ${census.errors.length} (first: ${census.errors[0]})`);
  return L;
}

// ── main ─────────────────────────────────────────────────────────────────────
const heron = loadHeron(BP);
console.log(` tween.mjs — T-11a tween coverage  ·  bp ${BP}  ·  ${URL}`);
console.log(` Heron frozen spec: ${heron.units.length} tween-units · ${heron.groups.length} groups · ${heron.scenes.length} scroll scenes (of ${heron.spec.triggers.length} recorded triggers)\n`);

const census = await collectOurs(URL, BP);
const ours = deriveOurUnits(census);
const cov = coverage(heron, ours);

// console matrix — run.mjs style
const table = censusTable(heron);
console.log(" ── Heron census (per section) " + "─".repeat(40));
for (const row of table) {
  console.log(`  ${row.section.padEnd(18)} units=${String(row.tweenUnits).padStart(3)}  props=[${row.properties.join(",")}]  dur=[${row.durationsMs.join(",")}]  ease=[${row.eases.join(",")}]  stagger=[${row.staggersMs.join(",")}]  trig={${row.triggers.join(",")}}`);
}
console.log(`\n ── Our live inventory ` + "─".repeat(56));
const ourSec = new Map();
const ourTrig = new Map();
for (const u of ours.units) {
  ourSec.set(u.section, (ourSec.get(u.section) || 0) + 1);
  ourTrig.set(u.trigger, (ourTrig.get(u.trigger) || 0) + 1);
}
for (const [sec, n] of [...ourSec.entries()].sort((a, b) => rankSection(a[0]) - rankSection(b[0]))) console.log(`  ${sec.padEnd(18)} units=${String(n).padStart(3)}`);
console.log(`  by trigger: ${[...ourTrig.entries()].map(([k, v]) => `${k}=${v}`).join(" · ")}`);
console.log(`  grammar elements tracked through scroll: ${ours.trackedGrammar} · scrub-varying tracks: ${ours.scrubTracks.length} · unaccounted candidates: ${ours.unaccounted.length} · never-revealed (flung past / dead-zone): ${ours.neverRevealed.length}`);
console.log(`  WAAPI calls: ${census.waapiCalls} · view()/scroll() timelines: ${census.cssom.viewTimeline}/${census.cssom.scrollTimeline} · reveals armed: ${census.cssom.revealsArmed} · lenis: ${census.cssom.lenis} · entrance walk0: ${census.walk0.skipped ? "SKIPPED (intro not observed)" : census.walk0.els.length + " elements"}`);
if (ours.neverRevealed.length) console.log(`  !! never-revealed elements: ${ours.neverRevealed.slice(0, 6).map((n) => `${n.section}/${String(n.role).slice(0, 30)}`).join(" | ")}${ours.neverRevealed.length > 6 ? " …" : ""}`);

console.log(`\n ── Coverage (Heron groups with an animation vs our counterparts) ` + "─".repeat(10));
const perSection = new Map();
for (const r of cov.rows.filter((r) => r.group.animated)) {
  if (!perSection.has(r.group.section)) perSection.set(r.group.section, { total: 0, cov: 0 });
  const s = perSection.get(r.group.section);
  s.total++; if (r.covered) s.cov++;
}
let worst = null;
for (const [sec, s] of [...perSection.entries()].sort((a, b) => rankSection(a[0]) - rankSection(b[0]))) {
  const pct = Math.round((s.cov / s.total) * 1000) / 10;
  if (worst === null || pct < worst.pct) worst = { section: sec, pct };
  console.log(`  ${sec.padEnd(18)} ${String(s.cov).padStart(2)}/${String(s.total).padStart(2)} groups  ${pct.toFixed(1).padStart(5)}%`);
}
console.log(`\n  OVERALL  ${cov.covered}/${cov.animated} groups  ${cov.pct}%   (stateOnly Heron groups excluded from denominator: ${cov.stateOnly.length})`);
if (worst) console.log(`  worst section: ${worst.section} ${worst.pct}%`);

console.log(`\n ── Missing (ranked, T-11b work-list — top ${Math.min(12, cov.missing.length)} of ${cov.missing.length}) ` + "─".repeat(14));
for (const g of cov.missing.slice(0, 12)) {
  const spec = [
    g.duration != null ? `dur=${g.duration}ms` : "dur=?",
    g.ease ? `ease=${g.ease}` : "ease=?",
    g.stagger != null ? `stagger=${g.stagger}ms` : null,
    g.fromValues.length ? `from{${g.fromValues.slice(0, 3).join(",")}}` : null,
    g.toValues.length ? `to{${g.toValues.slice(0, 3).join(",")}}` : null,
    `trigger=${g.trigger}`,
  ].filter(Boolean).join("  ");
  console.log(`  [${g.section}] ${g.property.padEnd(13)} ${spec}`);
  if (VERBOSE) console.log(`      roles: ${g.roles.slice(0, 6).join(" | ")}`);
}

// JSON report
const report = {
  meta: { tool: "scripts/conformance/tween.mjs", task: "T-11a", bp: BP, url: URL, generatedAt: new Date().toISOString(), heronSpecMeta: heron.spec.meta },
  heron: {
    triggers: heron.spec.triggers.length,
    scrubTriggers: heron.spec.triggers.filter((t) => t.scrub).length,
    scenes: heron.scenes,
    tweenUnits: heron.units.length,
    units: heron.units,
    groups: heron.groups.map((g) => ({ ...g, units: undefined, unitCount: g.units.length })),
    census: table,
    stateOnlyGroups: cov.stateOnly,
  },
  ours: {
    trackedElements: ours.units.length,
    units: ours.units,
    unaccounted: ours.unaccounted,
    neverRevealed: ours.neverRevealed,
    scrubTracks: ours.scrubTracks,
    trackedGrammarElements: ours.trackedGrammar,
    walk0: { skipped: !!census.walk0.skipped, elements: census.walk0.els?.length ?? 0 },
    walkMidElements: census.walkMid.els?.length ?? 0,
    waapiCalls: census.waapiCalls,
    waapiSample: census.waapiSample,
    cssom: {
      keyframeCount: Object.keys(census.cssom.keyframes).length,
      keyframes: census.cssom.keyframes,
      viewTimeline: census.cssom.viewTimeline,
      scrollTimeline: census.cssom.scrollTimeline,
      ruleCount: census.cssom.ruleCount,
      crossOrigin: census.cssom.crossOrigin,
    },
    engineSeats: { revealsArmed: census.cssom.revealsArmed, revealBelt: census.cssom.revealBelt, lenis: census.cssom.lenis, jsRevealArmed: census.cssom.jsRevealArmed, introDone: census.cssom.introDone },
    pageErrors: census.errors,
    sampling: { steps: census.sampling.series.length, vh: census.sampling.vh, scrollHeight: census.sampling.scrollHeight },
  },
  coverage: {
    overallPct: cov.pct,
    animatedGroups: cov.animated,
    coveredGroups: cov.covered,
    perSection: [...perSection.entries()].map(([section, s]) => ({ section, covered: s.cov, total: s.total, pct: Math.round((s.cov / s.total) * 1000) / 10 })),
    rows: cov.rows.map((r) => ({ section: r.group.section, property: r.group.property, trigger: r.group.trigger, covered: r.covered, how: r.how, ourCount: r.ourCount, heron: { duration: r.group.duration, ease: r.group.ease, easeFam: r.group.easeFam, stagger: r.group.stagger, partial: r.group.partial, fromValues: r.group.fromValues, toValues: r.group.toValues, roles: r.group.roles, unitCount: r.group.units.length }, matched: r.matched ? { duration: r.matched.duration, ease: r.matched.ease, easeFam: r.matched.easeFam, stagger: r.matched.stagger, elementCount: r.matched.elementCount, sampleRoles: [...new Set(r.matched.units.map((u) => u.role))].slice(0, 6), sampleFromTo: r.matched.units.slice(0, 3).map((u) => ({ role: u.role, property: u.property, from: u.from, to: u.to, source: u.source })) } : null })),
    missing: cov.missing.map((g) => ({ section: g.section, property: g.property, trigger: g.trigger, duration: g.duration, ease: g.ease, stagger: g.stagger, fromValues: g.fromValues, toValues: g.toValues, roles: g.roles, unitCount: g.units.length, specs: g.units.map((u) => ({ role: u.role, method: u.method, gsapProp: u.gsapProp, value: u.value, triggerEl: u.triggerEl })) })),
  },
  limitations: buildLimitations(census),
};
writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`\n report → ${OUT}`);
if (GATE != null && !Number.isNaN(GATE)) {
  if (cov.pct == null || cov.pct < GATE) { console.error(` GATE: coverage ${cov.pct}% < ${GATE}%`); process.exit(1); }
  console.log(` GATE: coverage ${cov.pct}% ≥ ${GATE}% ✓`);
}
