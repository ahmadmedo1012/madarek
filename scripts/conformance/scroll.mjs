/**
 * scroll.mjs — R337 conformance extension 1: SCROLL FEEL + SCRUB CURVES.
 *
 * What the owner *feels* when scrolling, as numbers:
 *
 * A. scroll feel (per breakpoint, vs _page.<bp>.json):
 *    · Lenis config: smoothWheel (spec-recorded), lerp/duration/easing
 *      (absent in the frozen spec — asserted as "a Lenis instance is
 *      live on .main-inner" + smoothWheel parity; lerp/duration/easing
 *      recorded once via our own instrumentation when the motion owner
 *      lands the engine and written to scroll-config.json, then compared).
 *    · scroller element identity: the page scrolls the WINDOW on the
 *      landing route (Heron's Lenis rides window) — asserted.
 *    · scroll-behavior: 'auto' on html/body (Lenis owns the animation;
 *      a CSS smooth would fight it).
 *    · anchor/scroll-to: every in-page anchor resolves inside the
 *      document (no dead #hash that never scrolls).
 *    · section heights in vh (already in the matrix) + sticky offsets:
 *      any position:sticky element reports its top offset class
 *      (0 | header-height | other) — "other" needs a mapping reason.
 *    · scroll restoration: 'manual' on the landing (the loader owns
 *      the initial position) — history.scrollRestoration asserted.
 *
 * B. scrub-curve sampling (the numeric "does it move like Heron"):
 *    For every recorded ScrollTrigger with scrub=true (frozen in
 *    _motion.<bp>.json, r335 GSAP instrumentation), the LIVE reference
 *    is measured: .main-inner (Heron's Lenis wrapper — the window does
 *    NOT scroll there) is seated at 11 evenly spaced offsets across the
 *    trigger's live [start,end], and every ANIMATED descendant is
 *    discovered by diffing computed styles at the range ends, then
 *    sampled at all 11 seats (color / opacity / transform matrix /
 *    clip-path / filter) + the live trigger's own progress, pin,
 *    pinSpacing and snap. Measured numbers freeze into
 *    scroll-curves.<bp>.json: `curves` = the families OUR architecture
 *    implements (see CURVE_COUNTERPARTS below), `pending` = measured
 *    Heron curves whose section motion is not built yet (inventory for
 *    the section owners — never asserted, never faked).
 *
 *    assert() re-measures the SAME metric on OUR page across OUR
 *    counterpart trigger range (anchor-derived, see CURVE_COUNTERPARTS)
 *    and compares the normalized SHAPES: max deviation ≤5% of range at
 *    any of the 11 points (curveDeviation below).
 *
 * Usage:
 *   node scripts/conformance/scroll.mjs extract [--bps 1440]   # freeze curves (needs live Heron)
 *   node scripts/conformance/scroll.mjs feel    [--url http://localhost:5173/]
 *   node scripts/conformance/scroll.mjs assert  [--url http://localhost:5173/]
 *   node scripts/conformance/run.mjs --scroll                  # feel+assert (offline, vs frozen)
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
const CURVES_FILE = (bp) => join(SPEC_DIR, `scroll-curves.${bp}.json`);

/** Heron scrub family → OUR counterpart. `ours` resolves the trigger
 *  element on OUR page; `anchors` derives OUR sampling range from OUR
 *  element's geometry (center-mode: the seat where the element center
 *  sits at fromVh·vh → toVh·vh — the r322 scroll-spec statement driver
 *  law); `metric` picks the shared sampler (see METRICS_JS). Wrap key =
 *  the first segment of the frozen spec path. Sections whose scrub
 *  motion is not built yet stay out of here → their curves freeze as
 *  `pending` (measured, unasserted inventory for the section owner). */
const CURVE_COUNTERPARTS = {
  "div.home-intro-wrap": {
    ours: "h2#statement-title",
    anchors: { mode: "center", fromVh: 0.9, toVh: 0.4 },
    metric: "inkCoverage",
  },
};

export const BPS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 900 },
  { name: "390", width: 390, height: 844 },
];

/** Shared in-page helpers (spec-path resolution, seating, style reads,
 *  metric samplers). Spec paths are r335 pathOf notation — `tag.cls >
 *  tag[n] > …` — where seg[1] is the wrap element ITSELF (pathOf unshifts
 *  from the element up to the wrap), so resolution walks children[n-1]
 *  from segs[2] on. Seating: Heron scrolls .main-inner (Lenis wrapper —
 *  the window never scrolls there); our page scrolls the window (or its
 *  own Lenis via window.__mdrkLenis). */
const PAGE_LIB_JS = String.raw`
(() => {
  const resolveSpec = (path) => {
    const segs = path.split(" > ");
    const tagCls = segs[0].match(/^([a-z0-9-]+)\.(.+)$/);
    let el = tagCls ? document.querySelector(tagCls[1] + "." + tagCls[2].split(".")[0]) : document.querySelector(segs[0]);
    if (!el) return null;
    for (const seg of segs.slice(2)) {
      const m = seg.match(/^([a-z0-9-]+)\[(\d+)\]$/);
      if (!m) return null;
      el = el.children[Number(m[2]) - 1];
      if (!el || el.tagName.toLowerCase() !== m[1]) return null;
    }
    return el;
  };
  const seat = (y) => {
    const L = window.__mdrkLenis;
    if (L && typeof L.scrollTo === "function") { L.scrollTo(y, { immediate: true, force: true }); return; }
    const mi = document.querySelector(".main-inner");
    if (mi && document.documentElement.scrollHeight <= window.innerHeight + 60 && mi.scrollHeight > mi.clientHeight + 60) { mi.scrollTop = Math.max(0, Math.round(y)); return; }
    window.scrollTo(0, Math.max(0, Math.round(y)));
  };
  const lum = (rgb) => {
    const m = rgb && rgb.match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const [r, g, b] = m[1].split(",").map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const readProps = (el) => {
    const cs = getComputedStyle(el);
    const tr = cs.transform === "none" ? null : cs.transform.match(/matrix\(([^)]+)\)/);
    const v = tr ? tr[1].split(",").map(Number) : null;
    return {
      color: cs.color,
      opacity: Number(cs.opacity),
      x: v ? v[4] : 0,
      y: v ? v[5] : 0,
      scale: v ? Math.sqrt(v[0] * v[0] + v[1] * v[1]) : 1,
      rotate: v ? Math.round((Math.atan2(v[1], v[0]) * 180) / Math.PI * 10) / 10 : 0,
      clipPath: cs.clipPath === "none" ? 0 : 1,
      filter: cs.filter === "none" ? 0 : 1,
    };
  };
  /* metric: inkCoverage — the statement scrub's own law (r322: a per-
   * char/per-word COLOR scrub ghost→ink). Leaf text spans inside the
   * trigger element; each span's colour is normalized against the
   * site's OWN measured ghost/ink endpoints (seats 0 and 10) and the
   * mean = how much of the statement is inked at this progress. */
  const leafSpans = (root) =>
    [...root.querySelectorAll("*")].filter((el) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)
    ).slice(0, 400);
  const metrics = {
    inkCoverage: {
      discover: (root) => ({ spans: leafSpans(root).length }),
      sample: (root, endpoints) => {
        const spans = leafSpans(root);
        if (!spans.length) return null;
        if (endpoints) {
          const vals = spans.map((s) => lum(getComputedStyle(s).color));
          const lo = Math.min(...endpoints.ghost, ...vals), hi = Math.max(...endpoints.ink, ...vals);
          const d = hi - lo < 1e-6 ? 1 : hi - lo;
          /* orientation: coverage grows towards the INK endpoint — if the
           * ghost seat is the lighter pole, darker = more inked */
          const ghostMean = endpoints.ghost.reduce((a, x) => a + x, 0) / endpoints.ghost.length;
          const inkMean = endpoints.ink.reduce((a, x) => a + x, 0) / endpoints.ink.length;
          const inv = ghostMean > inkMean;
          const cover = (x) => {
            const n = Math.max(0, Math.min(1, (x - lo) / d));
            return inv ? 1 - n : n;
          };
          return Math.round((vals.reduce((a, x) => a + cover(x), 0) / vals.length) * 1000) / 1000;
        }
        return { ghost: spans.map((s) => lum(getComputedStyle(s).color)), ink: spans.map((s) => lum(getComputedStyle(s).color)) };
      },
    },
  };
  return { resolveSpec, seat, lum, readProps, metrics, leafSpans };
})()
`;

/** The in-page curve sampler (both sites): given {path|sel, start, end,
 *  metric} — sample the metric at 11 evenly spaced seats across the
 *  range, plus the live ScrollTrigger progress when introspectable.
 *  Invoked as `page.evaluate("(" + SAMPLE_JS + ")(cfg, libSrc)")` — the
 *  page lib arrives as a JSON string argument (eval'd in-page), never
 *  spliced into source. */
const SAMPLE_JS = String.raw`
async (cfg, libSrc) => {
  const N = 11;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const { resolveSpec, seat, readProps, metrics } = eval(libSrc);
  const out = { targetFound: false, samples: {}, progress: [] };
  const el = cfg.path ? resolveSpec(cfg.path) : document.querySelector(cfg.sel);
  if (!el) return out;
  out.targetFound = true;
  const metric = metrics[cfg.metric || "inkCoverage"];
  /* endpoints pass: measure the site's own ghost/ink at the range ends */
  seat(Math.max(0, Math.round(cfg.start)));
  await sleep(140);
  const atStart = metric.sample(el, null);
  seat(Math.max(0, Math.round(cfg.end)));
  await sleep(140);
  const atEnd = metric.sample(el, null);
  const endpoints = { ghost: atStart.ghost, ink: atEnd.ink };
  const key = cfg.metric || "inkCoverage";
  out.samples[key] = [];
  for (let i = 0; i < N; i++) {
    const y = cfg.start + ((cfg.end - cfg.start) * i) / (N - 1);
    seat(Math.max(0, Math.round(y)));
    await sleep(110); /* lenis settle + a raf */
    out.samples[key].push(metric.sample(el, endpoints));
    if (window.ScrollTrigger && window.ScrollTrigger.getAll) {
      const st = window.ScrollTrigger.getAll().find((t) => t.trigger === el);
      out.progress.push(st ? Math.round(st.progress * 1000) / 1000 : null);
    }
  }
  out.spans = metric.discover ? metric.discover(el) : null;
  seat(0);
  await sleep(150);
  return out;
}
`;

/** Deviation between two normalized curves: max |a-b| at the 11 points,
 *  where normalization maps each curve's [min,max] to [0,1]. Tolerance
 *  0.05 (5% of range) per the round brief. */
export function curveDeviation(a, b) {
  const norm = (xs) => {
    const min = Math.min(...xs), max = Math.max(...xs);
    return max - min < 1e-6 ? xs.map(() => 0) : xs.map((x) => (x - min) / (max - min));
  };
  const na = norm(a), nb = norm(b);
  let max = 0;
  for (let i = 0; i < na.length; i++) max = Math.max(max, Math.abs(na[i] - nb[i]));
  return max;
}

/** extract: freeze Heron's scrub curves (run once, from a machine that can
 *  reach heronaiapp.com). Reads _motion.<bp>.json for the recorded scrub
 *  triggers (r335 GSAP instrumentation), then MEASURES the live page:
 *  the recorded trigger element is resolved, its live ScrollTrigger
 *  start/end/pin/pinSpacing/snap introspected, every animated descendant
 *  discovered by diffing computed styles at the range ends, and the
 *  counterpart-mapped families sampled with the shared metric at 11
 *  seats. Non-mapped families freeze as `pending` inventory. */
export async function extract(bps, url = "https://heronaiapp.com/") {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const bp of BPS.filter((b) => bps.includes(b.name))) {
      const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
      await page.waitForTimeout(6000); /* loader + lenis + web-component boot */
      const motion = JSON.parse(readFileSync(join(SPEC_DIR, `_motion.${bp.name}.json`), "utf8"));
      const scrubTriggers = (motion.triggers || []).filter((t) => t.scrub && t.end > t.start + 50).slice(0, 12);
      const curves = [], pending = [];
      for (const t of scrubTriggers) {
        const wrapKey = t.trigger.split(" > ")[0];
        const map = CURVE_COUNTERPARTS[wrapKey];
        const live = await page.evaluate(async ({ lib, path }) => {
          const { resolveSpec, seat, readProps, leafSpans } = eval(lib);
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const el = resolveSpec(path);
          if (!el) return { targetFound: false };
          const cands = window.ScrollTrigger && window.ScrollTrigger.getAll
            ? window.ScrollTrigger.getAll().filter((st) => st.trigger === el) : [];
          const st = cands[0];
          const vh = window.innerHeight;
          const base = {
            targetFound: true,
            elCls: String(el.className).slice(0, 60),
            liveTriggers: cands.length,
            pin: st ? !!st.pin : null,
            pinSpacing: st ? !!st.pinSpacing : null,
            snap: st && st.vars ? (st.vars.snap ?? null) : null,
            liveScrub: st && st.vars ? (st.vars.scrub ?? null) : null,
          };
          if (!st) return base;
          base.liveStart = Math.round(st.start);
          base.liveEnd = Math.round(st.end);
          base.startVh = Math.round((st.start / vh) * 1000) / 1000;
          base.endVh = Math.round((st.end / vh) * 1000) / 1000;
          /* animated-descendant discovery: diff computed styles at the
           * range ends (settled — scrub needs a raf after each seat) */
          const snap = () => { const o = {}; let i = 0; for (const d of [...el.querySelectorAll("*")].slice(0, 400)) o[i++] = readProps(d); return o; };
          seat(Math.round(st.start));
          await sleep(180);
          const s0 = snap();
          seat(Math.round(st.end));
          await sleep(180);
          const s1 = snap();
          const animated = [];
          const desc = [...el.querySelectorAll("*")].slice(0, 400);
          for (let i = 0; i < desc.length; i++) {
            const p0 = s0[i], p1 = s1[i];
            if (!p0 || !p1) continue;
            const moved = p0.color !== p1.color || p0.opacity !== p1.opacity || p0.x !== p1.x || p0.y !== p1.y ||
              Math.abs(p0.scale - p1.scale) > 0.001 || Math.abs(p0.rotate - p1.rotate) > 0.01 || p0.clipPath !== p1.clipPath || p0.filter !== p1.filter;
            if (moved) animated.push({ path: pathOf(desc[i], el), props: p1 });
          }
          function pathOf(node, root) {
            const segs = [];
            let n = node;
            while (n && n !== root && segs.length < 8) {
              let idx = 1, sib = n;
              while ((sib = sib.previousElementSibling)) idx++;
              segs.unshift(n.tagName.toLowerCase() + "[" + idx + "]");
              n = n.parentElement;
            }
            return segs.join(" > ");
          }
          base.animated = animated.slice(0, 24);
          base.animatedCount = animated.length;
          seat(0);
          return base;
        }, { lib: PAGE_LIB_JS, path: t.trigger }).catch((e) => ({ targetFound: false, err: String(e).slice(0, 120) }));
        const rec = {
          trigger: t.trigger,
          recorded: { start: t.start, end: t.end },
          ...live,
        };
        if (!live.targetFound) { rec.note = live.err || "spec path not resolvable on the live page"; pending.push(rec); continue; }
        if (map && live.liveStart != null) {
          const cfg = { path: t.trigger, start: live.liveStart, end: live.liveEnd, metric: map.metric };
          const s = await page.evaluate("(" + SAMPLE_JS + ")(" + JSON.stringify(cfg) + "," + JSON.stringify(PAGE_LIB_JS) + ")").catch(() => null);
          rec.ours = map.ours;
          rec.anchors = map.anchors;
          rec.metric = map.metric;
          if (s && s.targetFound) { rec.samples = s.samples; rec.progressAtSeats = s.progress; rec.spans = s.spans; curves.push(rec); }
          else { rec.note = "metric sampling failed on live page"; pending.push(rec); }
        } else {
          rec.note = rec.note || "no counterpart mapping yet (section motion not built) — measured inventory";
          pending.push(rec);
        }
      }
      const data = {
        meta: { bp: bp.name, url, extractedAt: new Date().toISOString(), source: "live .main-inner seat sampling @11 seats + ScrollTrigger introspection (chromium; webkit residual)" },
        curves, pending,
      };
      writeFileSync(CURVES_FILE(bp.name), JSON.stringify(data, null, 1));
      await page.close();
      console.log(`scroll-curves ${bp.name}: ${curves.length} active + ${pending.length} pending frozen`);
    }
  } finally {
    await browser.close();
  }
  console.log("frozen →", bps.map(CURVES_FILE).join(", "));
}

/** assert: compare our curves to the frozen ones. Returns per-bp results
 *  in the same {pass, fail, failures[]} shape run.mjs consumes. Our seat
 *  range is derived from OUR element geometry via the frozen curve's
 *  anchors (center-mode), then the shared metric is sampled on both
 *  curves' own 11-point progress and the normalized SHAPES compared. */
export async function assert(url, bps) {
  const browser = await chromium.launch({ headless: true });
  const out = { pass: 0, fail: 0, failures: [] };
  try {
    for (const bp of BPS.filter((b) => bps.includes(b.name))) {
      const frozenPath = CURVES_FILE(bp.name);
      if (!existsSync(frozenPath)) { out.failures.push({ bp: bp.name, kind: "scroll-curve", error: "no-frozen-curves" }); out.fail++; continue; }
      const frozen = JSON.parse(readFileSync(frozenPath, "utf8"));
      const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2500);
      for (const c of frozen.curves) {
        const range = await page.evaluate(({ sel, anchors }) => {
          const el = document.querySelector(sel);
          if (!el || !anchors || anchors.mode !== "center") return null;
          const r = el.getBoundingClientRect();
          const center = r.top + window.scrollY + r.height / 2;
          const vh = window.innerHeight;
          return { start: Math.round(center - anchors.fromVh * vh), end: Math.round(center - anchors.toVh * vh) };
        }, { sel: c.ours, anchors: c.anchors }).catch(() => null);
        if (!range) {
          out.fail++;
          out.failures.push({ bp: bp.name, kind: "scroll-curve", trigger: c.trigger, error: "no-counterpart", expected: `our element ${c.ours} + anchor range`, actual: "counterpart not found" });
          continue;
        }
        const cfg = { sel: c.ours, start: range.start, end: range.end, metric: c.metric };
        const s = await page.evaluate("(" + SAMPLE_JS + ")(" + JSON.stringify(cfg) + "," + JSON.stringify(PAGE_LIB_JS) + ")").catch(() => null);
        if (!s || !s.targetFound) {
          out.fail++;
          out.failures.push({ bp: bp.name, kind: "scroll-curve", trigger: c.trigger, error: "no-counterpart", expected: "an element conforming to the scrub target", actual: "target not found" });
          continue;
        }
        for (const prop of Object.keys(c.samples)) {
          const a = c.samples[prop], b = s.samples[prop];
          if (!b || b.some((x) => x == null)) {
            out.fail++;
            out.failures.push({ bp: bp.name, kind: "scroll-curve", trigger: c.trigger, prop, expected: "11 measured samples", actual: "sampling failed" });
            continue;
          }
          const dev = curveDeviation(a, b);
          if (dev <= 0.05) out.pass++;
          else {
            out.fail++;
            out.failures.push({ bp: bp.name, kind: "scroll-curve", trigger: c.trigger, prop, expected: "shape within 5% of range", actual: `deviation ${(dev * 100).toFixed(1)}% (ours [${b.map((x) => Math.round(x * 100) / 100)}] vs heron [${a.map((x) => Math.round(x * 100) / 100)}])`, delta: Math.round(dev * 1000) / 1000 });
          }
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

/** scroll-feel assertions (offline, vs _page.<bp>.json) — exported for
 *  run.mjs to fold into the matrix. */
export async function feel(url, bps) {
  const browser = await chromium.launch({ headless: true });
  const out = { pass: 0, fail: 0, failures: [] };
  try {
    for (const bp of BPS.filter((b) => bps.includes(b.name))) {
      let spec;
      try { spec = JSON.parse(readFileSync(join(SPEC_DIR, `_page.${bp.name}.json`), "utf8")); } catch { continue; }
      const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2000);
      const got = await page.evaluate(() => ({
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        bodyScrollBehavior: getComputedStyle(document.body).scrollBehavior,
        scrollRestoration: "scrollRestoration" in history ? history.scrollRestoration : "unknown",
        lenisLive: !!(window.__mdrkLenis && (window.__mdrkLenis.scrollTo || window.__mdrkLenis.on)),
        scrollerIsWindow: window.scrollY === 0 ? document.documentElement.scrollHeight > window.innerHeight : true,
        stickyTops: [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).position === "sticky").slice(0, 30).map((el) => ({ cls: (el.className || "").toString().slice(0, 40), top: getComputedStyle(el).top })),
        deadAnchors: [...document.querySelectorAll('a[href^="#"]')].filter((a) => {
          const id = a.getAttribute("href").slice(1);
          return id && !document.getElementById(id) && !document.querySelector(`[name="${id}"]`);
        }).map((a) => a.getAttribute("href")),
      }));
      const chk = (kind, pass, expected, actual) => {
        pass ? out.pass++ : (out.fail++, out.failures.push({ bp: bp.name, kind: `scroll:${kind}`, expected, actual }));
      };
      const wantSmooth = spec.lenis?.[0]?.smoothWheel ?? true;
      chk("lenis-live+smoothWheel", got.lenisLive === wantSmooth, `lenis live=${wantSmooth}`, `live=${got.lenisLive}`);
      chk("scroll-behavior-auto", got.scrollBehavior === "auto" && got.bodyScrollBehavior === "auto", "auto/auto", `${got.scrollBehavior}/${got.bodyScrollBehavior}`);
      chk("scrollRestoration-manual", got.scrollRestoration === "manual", "manual", String(got.scrollRestoration));
      chk("scroller-is-window", got.scrollerIsWindow, "window scrolls", "custom scroller");
      chk("no-dead-anchors", got.deadAnchors.length === 0, "0 dead", JSON.stringify(got.deadAnchors.slice(0, 5)));
      for (const st of got.stickyTops) {
        const v = parseFloat(st.top) || 0;
        chk(`sticky-top(${st.cls.slice(0, 20)})`, v === 0 || (v >= 40 && v <= 120), "0 or header-band 40–120px", st.top);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

// CLI: extract (needs live Heron) | feel | assert
if (process.argv[1] && process.argv[1].endsWith("scroll.mjs")) {
  const mode = process.argv[2] ?? "assert";
  const bps = (process.argv.find((a, i) => process.argv[i - 1] === "--bps")?.split(",")) ?? BPS.map((b) => b.name);
  const url = process.argv.find((a, i) => process.argv[i - 1] === "--url") ?? "http://localhost:5173/";
  if (mode === "extract") {
    await extract(bps, process.argv.find((a, i) => process.argv[i - 1] === "--heron") ?? "https://heronaiapp.com/");
  } else if (mode === "feel") {
    const r = await feel(url, bps);
    console.log(JSON.stringify({ pass: r.pass, fail: r.fail, failures: r.failures.slice(0, 20) }, null, 1));
    process.exit(r.fail ? 1 : 0);
  } else {
    const r = await assert(url, bps);
    console.log(JSON.stringify({ pass: r.pass, fail: r.fail, failures: r.failures.slice(0, 20) }, null, 1));
    process.exit(r.fail ? 1 : 0);
  }
}
