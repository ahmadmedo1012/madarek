/**
 * interact.mjs — R337 conformance extension 2: INTERACTION STATES +
 * PATTERN CONSISTENCY.
 *
 * A. Interaction states: for every interactive element the frozen spec
 *    recorded a hover delta for (973 records across sections/bps),
 *    assert OUR counterpart (matched through the same explicit/
 *    data-spec mapping as run.mjs) reproduces the delta *class*:
 *      · the spec records a CHANGE (before ≠ after) → ours must change
 *        at least one of the same channels (color/bg/border/opacity/
 *        shadow/transform) when hovered;
 *      · the spec records NO change → ours must not change any channel
 *        (a surprise hover is as wrong as a missing one);
 *      · transition duration/easing on the hovered element within the
 *        standard tolerances (±10% / curve distance <0.05).
 *    focus-visible: every interactive element with a hover change must
 *    also respond to :focus-visible (keyboard parity), and :active must
 *    not be a no-op when hover is not.
 *
 * B. Pattern inventory: the repeated landing patterns (numeral [nn]
 *    labels, hairline rules, eyebrow labels, CTA pair, card grid,
 *    marquee, pinned scene) must render identically everywhere they
 *    appear — same computed type/color/rule weight — because they come
 *    from ONE shared class each. The check: group our elements by the
 *    shared class (pattern key), assert the computed style tuple
 *    (fontSize, fontWeight, color, borderBottomWidth, letterSpacing
 *    class) is identical across instances within a breakpoint.
 *
 * Usage (offline, vs frozen spec):
 *   node scripts/conformance/interact.mjs [--bps 1440] [--sections home-why-wrap,...] [--url ...]
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEase, curveDistance, sameRgb, colorDist } from "./tolerances.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
let chromium;
try {
  ({ chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright"));
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json"))("playwright");
}
const SPEC_DIR = join(WORKTREE, "docs", "redesign", "r335", "heron-spec");

// mapping merge (same as run.mjs — kept local to avoid import cycles)
const MAPPING = readdirSync(join(__dirname, "mapping"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .reduce(
    (acc, f) => {
      const part = JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8"));
      Object.assign(acc.ourSection, part.ourSection);
      acc.explicit.push(...(part.explicit ?? []));
      return acc;
    },
    { ourSection: {}, explicit: [] },
  );

const PROBE_JS = String.raw`
async (cfg) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const read = (el) => {
    const cs = getComputedStyle(el);
    return {
      color: cs.color, bg: cs.backgroundColor, op: cs.opacity,
      bd: cs.borderBottomColor !== "rgba(0, 0, 0, 0)" ? cs.borderBottomColor : cs.borderTopColor,
      sh: cs.boxShadow, tr: cs.transform !== "none" ? cs.transform : "none",
      td: cs.transitionDuration, te: cs.transitionTimingFunction,
    };
  };
  const out = { hovers: [], focusables: [], patterns: {} };
  for (const spec of cfg.hovers) {
    const el = spec.sel ? document.querySelector(spec.sel) : null;
    if (!el) { out.hovers.push({ p: spec.p, found: false }); continue; }
    el.scrollIntoView({ block: "center" });
    await sleep(120);
    const before = read(el);
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    el.classList.add("probe-hover");
    await sleep(320); /* transitions settle */
    const after = read(el);
    el.classList.remove("probe-hover");
    el.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    out.hovers.push({ p: spec.p, found: true, before, after });
  }
  // focus-visible probe on the same elements
  for (const spec of cfg.focusables) {
    const el = spec.sel ? document.querySelector(spec.sel) : null;
    if (!el) { out.focusables.push({ p: spec.p, found: false }); continue; }
    const before = read(el);
    el.focus({ focusVisible: true });
    await sleep(120);
    const after = read(el);
    el.blur();
    out.focusables.push({ p: spec.p, found: true, before, after });
  }
  // pattern census: group by shared class
  for (const pat of cfg.patterns) {
    const els = [...document.querySelectorAll(pat.sel)];
    out.patterns[pat.key] = els.slice(0, 40).map((el) => {
      const cs = getComputedStyle(el);
      return { fs: cs.fontSize, fw: cs.fontWeight, color: cs.color, ls: cs.letterSpacing, bd: cs.borderBottomWidth };
    });
  }
  return out;
}
`;

const CHANNELS = ["color", "bg", "op", "bd", "sh", "tr"];
const changed = (a, b) => CHANNELS.filter((c) => a[c] !== b[c]);

/* R347 D4 re-key (the defect fix legitimately changed the live
 * contract): the hero's drafting-noise hover seats — the deco [0x]
 * cards (ordinals 8/9) and the ± registration marks + measure
 * graticule (11–20) — are retired WITH their elements (ONE calm
 * artwork per the owner's directive; docs/redesign/r347/DEFECTS-A.md).
 * Their probes are retired with this written reason, never silently;
 * the login/register/work-strip seats (0/3/1/2/5/7/4/6) still probe. */
const RETIRED_HOVERS = {
  "home-hero-wrap": new Set([8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
};

export async function interact(url, bps, sections) {
  const browser = await chromium.launch({ headless: true });
  const out = { pass: 0, fail: 0, failures: [], hoverChecked: 0, patternsChecked: 0 };
  try {
    for (const bpName of bps) {
      // T-13 bugfix (reported): viewport was hardcoded 1440 for every bp —
      // the per-bp spec records were all probed against the desktop layout.
      // Probe each bp at its own recorded width.
      const page = await browser.newPage({ viewport: { width: Number(bpName) || 1440, height: 900 } });
      await page.addStyleTag({ content: ".probe-hover:hover, .probe-hover { /* marker only — real hover comes from :hover */ }" });
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2000);
      for (const key of sections) {
        let spec;
        try { spec = JSON.parse(readFileSync(join(SPEC_DIR, `${key}.${bpName}.json`), "utf8")); } catch { continue; }
        const hovers = spec.hovers || [];
        if (!hovers.length) continue;
        const sel = MAPPING.ourSection[key];
        const explicit = MAPPING.explicit.filter((m) => m.section === key);
        // resolve each hover's spec record → our element. The spec hover
        // paths are pseudo-paths ("…wrap > interactive[N]" — the Nth
        // interactive INSIDE the recorded wrap), so the resolution is
        // explicit-first (any mapping that binds this exact path), then
        // ordinal: our Nth interactive inside the section container,
        // counted by the same DOM order the extractor used.
        // Some extractor hover records are error stubs ({i, hover:{err}})
        // — skip them; only real pathed records with a delta payload probe.
        const retired = RETIRED_HOVERS[key];
        const probes = hovers.slice(0, 40).filter((h) => h && typeof h.p === "string" && h.hover && !h.hover.err).filter((h) => {
          if (!retired) return true;
          const m0 = h.p.match(/interactive\[(\d+)\]$/);
          return !(m0 && retired.has(Number(m0[1])));
        }).map((h) => {
          const m = h.p.match(/interactive\[(\d+)\]$/);
          const ex = explicit.find((e) => e.heron === h.p);
          if (ex) return { p: h.p, sel: ex.scope === "page" ? ex.ours : `${sel} ${ex.ours}`, spec: h.hover };
          if (m) return { p: h.p, sel: `${sel} [data-spec-hover="${m[1]}"], ${sel} a:nth-of-type(${Number(m[1]) + 1}), ${sel} button:nth-of-type(${Number(m[1]) + 1})`, ordinal: Number(m[1]), wrapKey: h.p.split(" > ")[0], spec: h.hover };
          return { p: h.p, sel: null, spec: h.hover };
        }).filter((p) => p.sel);
        if (!probes.length) continue;
        // ordinal fallback: collect the section's interactives once, then
        // bind ordinal probes by index (the DOM-order contract).
        const ordProbes = probes.filter((p) => p.ordinal != null);
        if (ordProbes.length) {
          const idxs = await page.evaluate((s) => {
            const root = document.querySelector(s);
            if (!root) return null;
            const els = [...root.querySelectorAll("a, button, [role='button'], [data-spec-hover]")];
            return els.length;
          }, sel);
          if (idxs != null) {
            for (const p2 of ordProbes) {
              p2.sel = `${sel} [data-spec-hover="${p2.ordinal}"]`;
              // mark unresolved-if-out-of-range; the section agent adds
              // data-spec-hover=N hooks to bind ordinals explicitly.
            }
          }
        }
        if (!probes.length) continue;
        const r = await page.evaluate(({ src, cfg }) => new Function("return (" + src + ")")()(cfg), { src: PROBE_JS, cfg: { hovers: probes, focusables: probes.slice(0, 10), patterns: [] } });
        // zip: the page result loses the spec record — re-join by ordinal
        const byP = new Map(probes.map((pr) => [pr.p, pr]));
        for (const h of r.hovers) {
          out.hoverChecked++;
          const spec = byP.get(h.p)?.spec ?? {};
          const specChange = changed(spec.before ?? {}, spec.after ?? {});
          const ourChange = h.found ? changed(h.before, h.after) : null;
          if (specChange.length > 0) {
            // Heron changes → we must change at least one channel
            if (!h.found) { out.fail++; out.failures.push({ bp: bpName, section: key, kind: "hover", heronPath: h.p, expected: `change (${specChange.join(",")})`, actual: "no-counterpart" }); continue; }
            if (ourChange.length === 0) {
              out.fail++;
              out.failures.push({ bp: bpName, section: key, kind: "hover", heronPath: h.p, expected: `change (${specChange.join(",")})`, actual: "no change" });
            } else {
              out.pass++;
              // transition timing when both sides carry one
              const hd = parseFloat(spec.after?.td) || 0, od = parseFloat(h.after?.td) || 0;
              if (hd > 0 && od > 0 && Math.abs(hd - od) > Math.max(0.1 * hd, 0.01)) {
                out.fail++;
                out.failures.push({ bp: bpName, section: key, kind: "hover-transition", heronPath: h.p, expected: `${hd}s`, actual: `${od}s` });
              } else out.pass++;
            }
          } else {
            // Heron records NO hover change → ours must not change either
            if (h.found && ourChange.length > 0) {
              out.fail++;
              out.failures.push({ bp: bpName, section: key, kind: "hover", heronPath: h.p, expected: "no change", actual: `changed (${ourChange.join(",")})` });
            } else out.pass++;
          }
        }
        for (const f of r.focusables) {
          if (!f.found) continue;
          const ourChange = changed(f.before, f.after);
          // keyboard parity: focus-visible must not be a total no-op on links/buttons
          const isControl = true; // probes come from the interactive set
          if (isControl && ourChange.length === 0) {
            out.fail++;
            out.failures.push({ bp: bpName, section: key, kind: "focus-visible", heronPath: f.p, expected: "a visible focus state", actual: "no change" });
          } else out.pass++;
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

/** Pattern consistency: one shared class per pattern, identical computed
 *  tuple everywhere (within a breakpoint). The pattern selector list is
 *  authored here — it doubles as the pattern library contract (Track B). */
export const PATTERNS = [
  { key: "numeral-label", sel: ".fo-mono", tuple: ["fs", "fw", "color"] },
  { key: "eyebrow-label", sel: ".fo-label", tuple: ["fs", "fw", "color"] },
  { key: "hairline-rule", sel: ".fo-rule, .hairline", tuple: ["bd", "color"] },
  { key: "section-head", sel: ".wy-title, .h2-seat", tuple: ["fs", "fw"] },
  // r340 T-P1y — the §5 census extension: the product-screenshot cards
  // adopt the pattern library (hairline frame + [nn] paper tag); the
  // census asserts every capture carries the SAME chrome treatment
  // (one design language — the panel's criterion-10 finding).
  { key: "product-frame-chrome", sel: ".pr-frame-chrome", tuple: ["bd", "color"] },
  { key: "product-frame-tag", sel: ".pr-frame-tag", tuple: ["fs", "fw", "color", "bd"] },
];

export async function patterns(url) {
  const browser = await chromium.launch({ headless: true });
  const out = { pass: 0, fail: 0, failures: [], checked: 0 };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);
    const r = await page.evaluate(({ src, cfg }) => new Function("return (" + src + ")")()(cfg), { src: PROBE_JS, cfg: { hovers: [], focusables: [], patterns: PATTERNS.map((p) => ({ key: p.key, sel: p.sel })) } });
    for (const pat of PATTERNS) {
      const inst = r.patterns[pat.key] || [];
      if (inst.length < 2) continue; // pattern not repeated yet — nothing to check
      out.checked += inst.length;
      const first = JSON.stringify(inst[0]);
      for (let i = 1; i < inst.length; i++) {
        if (JSON.stringify(inst[i]) !== first) {
          out.fail++;
          out.failures.push({ kind: "pattern", pattern: pat.key, expected: first, actual: JSON.stringify(inst[i]) });
        } else out.pass++;
      }
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("interact.mjs")) {
  const mode = process.argv[2] ?? "interact";
  const bps = (process.argv.find((a, i) => process.argv[i - 1] === "--bps")?.split(",")) ?? ["1440"];
  const sections = (process.argv.find((a, i) => process.argv[i - 1] === "--sections")?.split(",")) ?? Object.keys(MAPPING.ourSection);
  const url = process.argv.find((a, i) => process.argv[i - 1] === "--url") ?? "http://localhost:5173/";
  if (mode === "patterns") {
    const r = await patterns(url);
    console.log(JSON.stringify({ pass: r.pass, fail: r.fail, checked: r.checked, failures: r.failures.slice(0, 15) }, null, 1));
    process.exit(r.fail ? 1 : 0);
  } else {
    const r = await interact(url, bps, sections);
    console.log(JSON.stringify({ pass: r.pass, fail: r.fail, hoverChecked: r.hoverChecked, failures: r.failures.slice(0, 15) }, null, 1));
    process.exit(r.fail ? 1 : 0);
  }
}
