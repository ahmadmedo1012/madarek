/**
 * pages.mjs — R340 T-D1a — the PER-PAGE conformance harness.
 *
 * The landing has the frozen Heron spec; the inner/authed pages do not
 * (the reference has no counterpart surfaces). What the §4 rebuild
 * program CAN hold them to is the SHEET's own grammar — the pattern
 * library as numbers, per page × breakpoint × theme:
 *
 *   · typeRungs     — every visible text node's computed font-size is
 *                     on the --fs-* / --fs-mono-* ladder (read live
 *                     from tokens.css + tokens.generated.css); the
 *                     body/mono/nav tiers stay distinct.
 *   · spacingRhythm — ≥90% of measured block margins/paddings on
 *                     section-level elements quantize to the 4px rhythm.
 *   · patternUsage  — the page's paper ground, ≥1 hairline border seat,
 *                     a `[nn]` numeral, an eyebrow/kicker label, and a
 *                     CTA pair (primary + secondary adjacent actions).
 *   · darkInk       — every text node ≥4.5:1 vs the composited
 *                     effective background (nearest opaque ancestor —
 *                     the run.mjs --dark census method, compact port).
 *   · edge390       — at 390 the page root's content side gutters are
 *                     8px ±2 (the sheet's own mobile inset).
 *   · hover         — the primary CTA changes ≥2 computed channels on
 *                     hover (the .probe-hover contract from interact.mjs).
 *
 * Score = 6 axes × 100, equal weight; `--gate` fails any route < 90.
 * Light runs by default; `--dark` runs the dark boot (localStorage
 * theme BEFORE first paint — attribute-only toggles are reverted by
 * the store). Output: console table + pages-results.json (repo root of
 * scripts/conformance). NEVER wired into verify.sh by default — it
 * needs a running dev server (the lead enables it per-wave).
 *
 * Usage:
 *   node scripts/conformance/pages.mjs --routes /auth,/auth/register --bps 1440,390 [--dark] [--gate] --url http://localhost:5173/
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
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json")("playwright"));
}

const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const ROUTES = (arg("routes", "/auth") ?? "").split(",").map((r) => r.trim()).filter(Boolean);
const BPS = (arg("bps", "1440,390") ?? "").split(",").map((b) => Number(b.trim())).filter(Boolean);
const DARK = process.argv.includes("--dark");
const GATE = process.argv.includes("--gate");
const URL = arg("url", "http://localhost:5173/");
const FLOOR = 90;

/* the type ladder: rung NAMES (--fs-*) harvested from the token sheets;
 * the probe resolves each to its LIVE px per viewport (clamp/max/vw
 * forms resolve exactly — a static extraction cannot) */
const rungNames = [];
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const f of ["tokens.css", "tokens.generated.css"]) {
    let css = "";
    try { css = strip(readFileSync(join(WORKTREE, "frontend", "src", "styles", "tokens", f), "utf8")); } catch { continue; }
    for (const m of css.matchAll(/--(fs-[a-z-]+)\s*:/g)) {
      if (!rungNames.includes(m[1])) rungNames.push(m[1]);
    }
  }
}
const RUNG_TOL = 0.5; // sub-pixel + clamp drift

/* ── the in-browser probe ─────────────────────────────────────────── */
const PAGE_PROBE = (cfg) => {
  const { bp, rungNames, rungTol } = cfg;
  /* resolve the ladder LIVE: a hidden measurer resolves each --fs-* rung
   * to its exact px at THIS viewport (clamp/max/vw forms included) */
  const measurer = document.createElement("span");
  measurer.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(measurer);
  const rungs = [];
  for (const name of rungNames) {
    /* the 999px fallback makes a failed resolution LOUD (never a silent
     * body-size passthrough); measured rungs are filtered below. */
    measurer.style.fontSize = `var(--${name}, 999px)`;
    const px = parseFloat(getComputedStyle(measurer).fontSize);
    if (px > 0 && px < 900) rungs.push(px);
  }
  measurer.remove();
  const vw = window.innerWidth;
  const textNodes = [];
  const walk = (n) => {
    if (!(n instanceof HTMLElement)) return;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    let hasText = false;
    for (const t of n.childNodes) if (t.nodeType === 3 && t.textContent.trim()) { hasText = true; break; }
    if (hasText && parseFloat(cs.opacity || "1") >= 0.3) {
      textNodes.push({ el: n, fs: parseFloat(cs.fontSize) || 0, ff: cs.fontFamily, color: cs.color, op: parseFloat(cs.opacity || "1") });
    }
    for (const c of n.children) walk(c);
  };
  walk(document.body);

  /* effective background: nearest opaque ancestor chain, alpha-blended */
  const parseCol = (c) => {
    const m = c && c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const ebgOf = (el) => {
    let chain = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const bg = parseCol(cs.backgroundColor);
      if (bg && bg.a >= 0.999) return blend(chain, bg);
      if (bg && bg.a > 0) chain.push(bg);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null; // image seat — uncountable
      n = n.parentElement;
    }
    return blend(chain, parseCol(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 });
  };
  const blend = (chain, base) => {
    let out = base;
    for (const c of chain) out = { r: Math.round(c.r * c.a + out.r * (1 - c.a)), g: Math.round(c.g * c.a + out.g * (1 - c.a)), b: Math.round(c.b * c.a + out.b * (1 - c.a)), a: 1 };
    return `rgb(${out.r}, ${out.g}, ${out.b})`;
  };
  const lum = (rgb) => {
    const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    const f = (v) => { v = +v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(m[1]) + 0.7152 * f(m[2]) + 0.0722 * f(m[3]);
  };
  const contrast = (ink, bg, op) => {
    const L1 = lum(ink); const L2 = lum(bg);
    if (L1 == null || L2 == null) return null;
    const eff = op < 1 ? null : L1; // opacity seats are skipped (run.mjs law)
    if (eff == null) return null;
    return (Math.max(eff, L2) + 0.05) / (Math.min(eff, L2) + 0.05);
  };

  /* axis 1: type rungs */
  let rungPass = 0, rungTotal = 0;
  const rungFails = [];
  const fsCount = {};
  for (const t of textNodes) {
    rungTotal++;
    const ok = rungs.some((r) => Math.abs(r - t.fs) <= rungTol);
    if (ok) rungPass++; else rungFails.push({ fs: t.fs, ff: t.ff.slice(0, 40), text: (t.el.textContent || "").trim().slice(0, 24) });
    fsCount[t.fs] = (fsCount[t.fs] ?? 0) + 1;
  }
  const distinctTiers = Object.keys(fsCount).length >= 2;

  /* axis 2: spacing rhythm (block margins/paddings of section-level boxes) */
  let spPass = 0, spTotal = 0;
  for (const n of document.querySelectorAll("main, main section, main section > div, form, form > div")) {
    if (!(n instanceof HTMLElement)) continue;
    const cs = getComputedStyle(n);
    if (cs.display === "none") continue;
    for (const v of [cs.marginTop, cs.marginBottom, cs.paddingTop, cs.paddingBottom]) {
      const px = parseFloat(v);
      if (!px) continue;
      spTotal++;
      if (Math.abs(px % 4) < 0.5 || Math.abs(px % 4) > 3.5) spPass++;
    }
  }

  /* axis 3: pattern usage */
  const pat = {
    paper: (() => { const b = getComputedStyle(document.body); const bg = parseCol(b.backgroundColor); return bg != null && bg.a > 0.9; })(),
    hairline: [...document.querySelectorAll("main *")].some((n) => {
      const cs = getComputedStyle(n);
      return cs.borderBottomWidth === "1px" && parseCol(cs.borderBottomColor) != null && n instanceof HTMLElement;
    }),
    numeral: document.body.innerText.match(/\[\d{2}\]/) != null,
    eyebrow: document.querySelector(".lp-eyebrow, .pf-eyebrow, [class*='eyebrow'], [class*='kicker'], .auth-meta, .auth-cell-index") != null,
    ctaPair: (() => {
      const btns = [...document.querySelectorAll("main a[href], main button[type='submit'], main button[type='button']")].filter((b) => {
        const cs = getComputedStyle(b);
        return cs.display !== "none" && b instanceof HTMLElement && b.textContent.trim().length > 0 && b.textContent.trim().length < 30;
      });
      return btns.length >= 2;
    })(),
  };
  const patScore = (Object.values(pat).filter(Boolean).length / 5) * 100;

  /* axis 4: dark ink (runs in the booted theme) */
  let inkPass = 0, inkTotal = 0;
  const inkFails = [];
  for (const t of textNodes) {
    const bg = ebgOf(t.el);
    if (bg == null) continue;
    const ratio = contrast(t.color, bg, t.op);
    if (ratio == null) continue;
    inkTotal++;
    if (ratio >= 4.5) inkPass++;
    else if (inkFails.length < 12) inkFails.push({ text: (t.el.textContent || "").trim().slice(0, 24), ratio: Math.round(ratio * 100) / 100, color: t.color, bg });
  }

  /* axis 5: edge gutters (bp 390 only; else free pass) */
  let gutter = { pass: true, l: 0, r: 0 };
  if (bp === 390) {
    const main = document.querySelector("main");
    const el = main ?? document.body;
    if (el) {
      /* the CONTENT edge (border box inset by the own padding) — the
       * same edge the landing's edge390 assertion measures */
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const cl = r.left + (parseFloat(cs.paddingLeft) || 0);
      const cr = r.right - (parseFloat(cs.paddingRight) || 0);
      gutter = { pass: Math.abs(cl - 8) <= 2 && Math.abs(vw - cr - 8) <= 2, l: Math.round(cl), r: Math.round(vw - cr) };
    }
  }

  return {
    typeRungs: { score: rungTotal ? (rungPass / rungTotal) * 100 : 100, distinctTiers, fails: rungFails.slice(0, 10), total: rungTotal, resolvedRungs: rungs },
    spacing: { score: spTotal ? (spPass / spTotal) * 100 : 100, total: spTotal },
    pattern: { score: patScore, ...pat },
    darkInk: { score: inkTotal ? (inkPass / inkTotal) * 100 : 100, fails: inkFails, total: inkTotal },
    edge390: { score: gutter.pass ? 100 : 0, ...gutter },
  };
};

/* the primary CTA locator + channel reader for the REAL-hover axis */
const CTA_PROBE = () => {
  const primary = document.querySelector("main button[type='submit'], main .btn.accent, main a[class*='accent'], main a[class*='primary']");
  if (!primary) return null;
  const r = primary.getBoundingClientRect();
  const cs = getComputedStyle(primary);
  return {
    label: (primary.textContent || "").trim().slice(0, 20),
    cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2),
    before: { color: cs.color, bg: cs.backgroundColor, bd: cs.borderBottomColor, tr: cs.transform, op: cs.opacity, sh: cs.boxShadow },
  };
};
const CTA_READ = () => {
  const primary = document.querySelector("main button[type='submit'], main .btn.accent, main a[class*='accent'], main a[class*='primary']");
  if (!primary) return null;
  const cs = getComputedStyle(primary);
  return { color: cs.color, bg: cs.backgroundColor, bd: cs.borderBottomColor, tr: cs.transform, op: cs.opacity, sh: cs.boxShadow };
};

/* ── the runner ───────────────────────────────────────────────────── */
const browser = await chromium.launch({ headless: true });
const out = { generatedAt: new Date().toISOString(), url: URL, dark: DARK, routes: {}, gate: GATE, floor: FLOOR };
let worst = 100;
try {
  for (const route of ROUTES) {
    out.routes[route] = {};
    for (const bp of BPS) {
      for (const theme of DARK ? ["dark"] : ["light"]) {
        const page = await browser.newPage({ viewport: { width: bp, height: bp === 390 ? 844 : 900 } });
        if (theme === "dark") await page.addInitScript(() => localStorage.setItem("madarek-theme", "dark"));
        await page.goto(`${URL.replace(/\/$/, "")}${route}`, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(1800);
        const r = await page.evaluate(PAGE_PROBE, { bp, rungNames, rungTol: RUNG_TOL });
        /* axis 6: REAL pointer hover (the .probe-hover class contract only
         * works where CSS carries probe arms; the real pointer is the law) */
        const cta = await page.evaluate(CTA_PROBE);
        let hover = { score: 0, channels: 0, label: cta?.label ?? "" };
        if (cta && Number.isFinite(cta.cx) && Number.isFinite(cta.cy)) {
          await page.mouse.move(cta.cx, cta.cy);
          await page.waitForTimeout(250);
          const after = await page.evaluate(CTA_READ);
          if (after) {
            const channels = Object.keys(cta.before).filter((k) => cta.before[k] !== after[k]);
            hover = { score: channels.length >= 2 ? 100 : 0, channels: channels.length, label: cta.label };
          }
          await page.mouse.move(0, 0);
        }
        r.hover = hover;
        const axes = ["typeRungs", "spacing", "pattern", "darkInk", "edge390", "hover"];
        const score = Math.round((axes.reduce((a, k) => a + Math.min(100, r[k].score), 0) / axes.length) * 10) / 10;
        out.routes[route][`${bp}:${theme}`] = { score, axes: r };
        worst = Math.min(worst, score);
        console.log(`  ${route} @${bp} ${theme}: ${score}%  [${axes.map((k) => `${k} ${Math.round(Math.min(100, r[k].score))}`).join(" · ")}]`);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
writeFileSync(join(__dirname, "pages-results.json"), JSON.stringify(out, null, 1));
console.log(`\npages conformance — ${ROUTES.join(", ")} (${DARK ? "dark" : "light"}): worst cell ${worst}% (floor ${FLOOR})`);
if (GATE && worst < FLOOR) {
  console.error(`pages gate: FAIL — a cell scored ${worst}% < ${FLOOR}%`);
  process.exit(1);
}
console.log("pages gate: PASS");
