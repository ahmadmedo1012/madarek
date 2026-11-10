/**
 * panel.mjs — R340 T-P1x conformance extension: THE BLIND PANEL'S
 * FINDINGS AS NUMBERS.
 *
 * The R339 panel (docs/archive/redesign/r339/T-16-PANEL.md, 53/84) found
 * regressions the matrix could not see — the instrument did not measure
 * what a human sees. This module turns each finding into a numeric
 * check that cannot regress silently:
 *
 *   · deadVoid      — per section × bp(390/768/1440): the longest
 *                     empty vertical run inside the section must be
 *                     ≤ 0.6 × viewport height ("multi-viewport blank
 *                     runs" / "dead vertical voids").
 *   · hClip         — no text node cut mid-word by the viewport edge
 *                     (leaf text elements crossing the edge > 2px),
 *                     except the AUTHORED crop/marquee seats (each
 *                     exclusion documented in HCLIP_EXCLUSIONS).
 *   · cookieOverlap — the consent banner must never intersect the
 *                     primary CTA or the footer, and dismissing it
 *                     must remove it ("cookie toast glued over the
 *                     footer/CTA band").
 *   · scrollProgress— RETIRED (R347 D2/D3): the progress family's
 *                     fixed seats sat over body text at every scroll
 *                     stop (detector fixed-over-text) and the rule
 *                     pair crossed the viewport's middle through text;
 *                     the family is deleted at the cause and the
 *                     criterion retired with it (re-keyed to the live
 *                     contract — docs/redesign/r347/DEFECTS-A.md).
 *
 * GATE LAW (the r339 T-02b precedent, same shape as the coverage
 * floor): panel rows are kept OUT of the pass-rate totals so the
 * ratchet keeps its meaning — instead any panel failure flips the
 * --gate verdict to FAIL(panel). Progress cannot be faked by adding
 * passing rows, and regressions cannot hide inside a healthy rate.
 *
 * deadVoid method note (deliberate, documented): painted = CONTENT-
 * bearing ink — own text (≥9px), raster/vector/canvas media (≥400px²).
 * Backgrounds, gradients, borders and hairlines are the sheet's own
 * texture, NOT content (the panel's voids were blank paper with
 * "stray dash marks" — texture without ink). Opacity is NOT filtered:
 * the check measures LAYOUT occupancy, not an animation's transient
 * state (unrevealed content still occupies its seat when you arrive).
 * Coverage is measured WINDOWED (viewport steps with a settle) so
 * position:sticky scenes are counted at every seat they occupy — a
 * pin runway is not a void while the scene is pinned in it.
 *
 * Usage (wired by run.mjs — also standalone):
 *   node scripts/conformance/panel.mjs --url http://localhost:5173/ [--bps 390,768,1440]
 */
import { createRequire } from "node:module";
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

/* Panel bps — the brief's three (the 1920/1024 matrix cells add no
 * panel information: the findings were mobile/tablet/desktop). */
const PANEL_BPS = { 390: { width: 390, height: 844 }, 768: { width: 768, height: 900 }, 1440: { width: 1440, height: 900 } };

/* deadVoid threshold: the longest empty vertical run (in ALL three
 * content columns) inside a section, as a share of viewport height. */
const VOID_MAX_VH = 0.6;
/* hClip: text cut by the viewport edge beyond this many px. */
const CLIP_TOL = 2;
/* scrollProgress — RETIRED (R347 D2/D3, re-keyed to the live contract
 * with the written reason): the progress family (ScrollRule pair +
 * readout + ticks + BootLog trio) is deleted at the cause — its fixed
 * seats sat over body text at every scroll stop and the rule pair
 * crossed the middle of the viewport through headings and paragraphs
 * (the owner's R347 yardstick: zero fixed elements over text outranks
 * the r345 panel's criterion 7; docs/redesign/r347/DEFECTS-A.md).
 * The probe still RECORDS the registry snapshot per bp (telemetry),
 * but contributes no pass/fail to the panel verdict. */

/* Authored horizontal-crop seats — text that deliberately runs past
 * the viewport edge. Every entry carries its WRITTEN reason; anything
 * not on this list fails (the list is the law, not a suggestion). */
const HCLIP_EXCLUSIONS = [
  { sel: "svg .bp-micro", reason: "ElevationDrawing drafting labels — the ≤991 band's authored SVG crop (T-18 A3: the crop beyond [03] is the authored overflow:hidden seat)" },
  /* R347-Z: the .pr-clone loop copies are deleted (D8 family, R346 §3) — the exclusion entry retired with them. */
  { sel: ".fo-roll-track .fo-roll-dup", reason: "the nav brand roll's loop twin — the authored marquee loop seat" },
  { sel: ".hro-work-item", reason: "the hero work strip's measured six-box grid (hero-mechanics [W]: padding-inline-start 759px @1440 + fixed vw item widths reproduce Heron's recorded band — the sixth subject bleeding past the frame's inline-end edge IS the recorded geometry)" },
  { sel: ".jt-map-col svg text", reason: "the pinned walkthrough's panned scene — the plan/section drawings are wider than the viewport at 390/768 and translate behind the window across the scrub (station labels recorded at multiple pan offsets); edge-straddling scene text is the authored marquee-class crop" },
  { sel: ".pm-cols *", reason: "the four pains' ≤767 snap carousel (pains.css ≤767 belt: scroll-snap-type x mandatory, 83.4% slides) — neighbour slides peek past the viewport edges by design, the reference's own mobile swiper anatomy" },
  { sel: ".st-crawl-track .st-crawl-cell", reason: "R343 C-1 — the statement ticker's seamless-loop university cards (the recorded ticker anatomy): the loop track translates cells through the viewport edge by design, so edge-straddling card text is the authored marquee-class crop (the same family as the nav brand roll and the platform marquee loop copies)" },
];

/* ── in-browser probes ─────────────────────────────────────────────────── */

/* Content coverage + clipped text for ONE window (viewport seat). */
const WINDOW_PROBE = (cfg) => {
  const { cols, clipTol, exclusions } = cfg;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const sy = window.scrollY;
  const wTop = sy;
  const wBot = sy + vh;
  const stripHalf = 4; // the column's horizontal sampling strip (±4px)

  const contentBearing = (n, cs) => {
    for (const t of n.childNodes) {
      if (t.nodeType === 3 && t.textContent.trim()) {
        const fs = parseFloat(cs.fontSize) || 16;
        if (fs >= 9) return true;
      }
    }
    const tag = n.tagName;
    if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS" || tag === "IFRAME" || tag === "SVG") {
      const r = n.getBoundingClientRect();
      if (r.width * r.height >= 400) return true;
    }
    return false; // backgrounds/borders/hairlines are texture, not ink
  };

  const skipEl = (n, cs) =>
    cs.display === "none" ||
    cs.visibility === "hidden";
  /* NOTE (deliberate): position:fixed is NOT skipped — the landing's
   * pinned CONTENT rides fixed seats (the why capbar captions, the
   * nav) and is visually present at every window of the walk; a
   * 63px nav band or an 84px caption band can never mask a 540px+
   * void (the 0.6×vh limit dwarfs them). Skipping fixed would invent
   * voids inside every pinned-scene runway. */

  const intervals = cols.map(() => []);
  const clipped = [];
  const all = document.body.querySelectorAll("*");
  for (const n of all) {
    if (!(n instanceof HTMLElement || n instanceof SVGElement)) continue;
    const cs = getComputedStyle(n);
    if (skipEl(n, cs)) continue;
    const r = n.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const t = r.top + sy, b = r.bottom + sy;
    if (b <= wTop || t >= wBot) continue; // outside this window
    if (contentBearing(n, cs)) {
      for (let c = 0; c < cols.length; c++) {
        if (r.right > cols[c] - stripHalf && r.left < cols[c] + stripHalf) {
          intervals[c].push([Math.max(t, wTop), Math.min(b, wBot)]);
        }
      }
    }
    // hClip: leaf text elements CUT by the viewport's horizontal edges —
    // PARTIAL overlap only (an element fully outside the viewport is
    // not "cut mid-word": off-canvas fixed seats and not-yet-panned
    // scene labels are invisible, not clipped).
    let hasText = false;
    for (const t2 of n.childNodes) {
      if (t2.nodeType === 3 && t2.textContent.trim()) { hasText = true; break; }
    }
    const partiallyOverlaps = (r.left < -clipTol && r.right > 0) || (r.right > vw + clipTol && r.left < vw);
    if (hasText && partiallyOverlaps && parseFloat(cs.opacity || "1") > 0.05) {
      clipped.push({
        sel: `${n.tagName.toLowerCase()}${n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`,
        text: (n.textContent || "").trim().slice(0, 40),
        left: Math.round(r.left), right: Math.round(r.right), vw,
        docTop: Math.round(t),
        excluded: exclusions.some((x) => {
          try { return n.matches(x.sel) || (!!n.closest && n.closest(x.sel.replace(/ \*$/, "")) != null); } catch { return false; }
        }),
      });
    }
  }
  return { intervals, clipped, wTop, wBot };
};

/* Consent banner geometry at the current scroll seat. */
const COOKIE_PROBE = (cfg) => {
  const { footerSel, ctaSel } = cfg;
  const banner = document.querySelector(".cb-banner");
  if (!banner) return { present: false };
  const cs = getComputedStyle(banner);
  const visible = cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity || "1") > 0.05;
  const br = banner.getBoundingClientRect();
  const inter = (a, b) => a && b && a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
  const footer = document.querySelector(footerSel);
  const cta = document.querySelector(ctaSel);
  return {
    present: true,
    visible,
    rect: { l: Math.round(br.left), t: Math.round(br.top), r: Math.round(br.right), b: Math.round(br.bottom) },
    footerOverlap: visible && inter(br, footer?.getBoundingClientRect()),
    ctaOverlap: visible && inter(br, cta?.getBoundingClientRect()),
  };
};

/* The progress registry snapshot at the current scroll seat. The
 * digest includes the CHILD states (first element child's background
 * + the [data-passed] descendant count) so discrete seats — the tick
 * rail flips data-passed on children — are diffed too. */
const PROGRESS_SNAPSHOT = () => {
  const list = (window.__madarekProgress ?? []).map((s) => {
    const el = s.el;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      label: s.label,
      range: s.range,
      rendered: cs.display !== "none" && r.width + r.height > 0,
      text: (el.textContent || "").trim().slice(0, 40),
      transform: cs.transform,
      opacity: cs.opacity,
      bg: cs.backgroundColor,
      color: cs.color,
      childBg: el.firstElementChild ? getComputedStyle(el.firstElementChild).backgroundColor : null,
      passed: el.querySelectorAll("[data-passed]").length,
    };
  });
  return list;
};

/* ── the runner ─────────────────────────────────────────────────────────── */

export async function panel(url, bps, sections, ourSection, engine = "chromium") {
  const wanted = Object.entries(PANEL_BPS).filter(([name]) => bps.includes(name));
  const out = { pass: 0, fail: 0, failures: [], deadVoid: {}, hClip: {}, cookie: {}, progress: {}, skipped: [] };
  if (!wanted.length) return out;
  if (engine !== "chromium") {
    out.skipped.push(`scrollProgress/deadVoid/hClip/cookie not run on engine=${engine} (WebKit lacks scroll timelines + this sandbox's webkit is user-space experimental; chromium is the engine of record — T-15)`);
    return out;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, vp] of wanted) {
      const page = await browser.newPage({ viewport: vp });
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1500);

      const maxScroll = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
      const vh = vp.height;
      const step = Math.max(200, Math.round(vh * 0.8));
      const cols = [Math.round(vp.width * 0.2), Math.round(vp.width * 0.5), Math.round(vp.width * 0.8)];

      /* windowed walk — deadVoid + hClip (per section: intervals + clipped) */
      const secRanges = {};
      for (const key of sections.filter((k) => k !== "chrome")) {
        const sel = ourSection[key];
        const range = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) };
        }, sel);
        if (range) secRanges[key] = range;
      }

      const voidLimit = Math.round(VOID_MAX_VH * vh);
      const colIntervals = {}; // key -> col -> merged intervals (doc coords)
      const clipRows = {};     // key -> [{...}]
      for (let y = 0; y <= maxScroll; y += step) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(120);
        const res = await page.evaluate(WINDOW_PROBE, { cols, clipTol: CLIP_TOL, exclusions: HCLIP_EXCLUSIONS });
        for (const [key, range] of Object.entries(secRanges)) {
          // clip this window's intervals to the section range
          const acc = (colIntervals[key] ??= cols.map(() => []));
          for (let c = 0; c < cols.length; c++) {
            for (const [a, b] of res.intervals[c]) {
              const lo = Math.max(a, range.top), hi = Math.min(b, range.bottom);
              if (hi - lo > 0) acc[c].push([lo, hi]);
            }
          }
        }
        for (const row of res.clipped) {
          let owner = "(between)";
          for (const [key, range] of Object.entries(secRanges)) {
            if (row.docTop >= range.top - 1 && row.docTop <= range.bottom + 1) { owner = key; break; }
          }
          if (owner === "(between)") continue;
          const list = (clipRows[owner] ??= []);
          if (!list.some((x) => x.text === row.text && x.left === row.left)) list.push(row);
        }
      }

      /* deadVoid verdicts: the VOID semantic is a FULL-WIDTH empty
       * vertical run — a y-interval where NO content column has ink
       * (side margins of a centred block are breathing room, the
       * panel PRAISED the reference for; a multi-viewport blank BAND
       * is the finding). Union the columns, then find the longest
       * gap in the union. */
      for (const [key, range] of Object.entries(secRanges)) {
        const acc = colIntervals[key] ?? cols.map(() => []);
        const union = [];
        for (const ivs of acc) union.push(...ivs);
        const merged = union.sort((a, b) => a[0] - b[0]).reduce((m, [a, b]) => {
          const last = m[m.length - 1];
          if (last && a <= last[1] + 8) last[1] = Math.max(last[1], b);
          else m.push([a, b]);
          return m;
        }, []);
        let longest = 0;
        let cur = range.top;
        for (const [a, b] of merged) {
          if (a > cur) longest = Math.max(longest, a - cur);
          cur = Math.max(cur, b);
        }
        if (cur < range.bottom) longest = Math.max(longest, range.bottom - cur);
        const worst = Math.round(longest);
        const rec = { bp: name, worstGapPx: worst, limitPx: voidLimit };
        out.deadVoid[`${key}@${name}`] = rec;
        if (worst > voidLimit) {
          out.fail++;
          out.failures.push({ section: key, bp: name, kind: "deadVoid", expected: `longest full-width empty vertical run ≤ ${voidLimit}px (0.6×vh)`, actual: `${worst}px empty band (union of 3 content columns)` });
        } else out.pass++;
      }

      /* hClip verdicts */
      for (const [key, rows] of Object.entries(clipRows)) {
        const real = rows.filter((r) => !r.excluded);
        out.hClip[`${key}@${name}`] = { bp: name, found: rows.length, excluded: rows.length - real.length };
        if (real.length) {
          out.fail += real.length;
          for (const r of real) {
            out.failures.push({ section: key, bp: name, kind: "hClip", expected: "no text node cut by the viewport edge (>2px)", actual: `${r.sel} «${r.text}» left ${r.left}/right ${r.right} of ${r.vw}` });
          }
        } else out.pass++;
      }
      /* sections with no clipped rows at all still earn one pass */
      for (const key of Object.keys(secRanges)) {
        if (!clipRows[key]) { out.hClip[`${key}@${name}`] = { bp: name, found: 0, excluded: 0 }; out.pass++; }
      }

      /* cookieOverlap: top / middle / bottom seats + the dismiss path */
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      const cookieSeats = ["top", "mid", "bottom"];
      let cookieFail = null;
      const cookieRec = { bp: name, seats: {} };
      for (let i = 0; i < cookieSeats.length; i++) {
        await page.evaluate((f) => window.scrollTo(0, f), Math.round(maxScroll * (i / (cookieSeats.length - 1))));
        await page.waitForTimeout(150);
        const probe = await page.evaluate(COOKIE_PROBE, { footerSel: ourSection.footer ?? "footer.fo-footer", ctaSel: '[data-spec="cta.primary"]' });
        cookieRec.seats[cookieSeats[i]] = probe;
        if (probe.present && (probe.footerOverlap || probe.ctaOverlap)) {
          cookieFail = cookieSeats[i];
        }
      }
      if (cookieFail) {
        out.fail++;
        out.failures.push({ section: "(cookie)", bp: name, kind: "cookieOverlap", expected: "the consent banner never intersects the primary CTA or the footer", actual: `intersection at the ${cookieFail} seat — see results.panel.cookie` });
      } else out.pass++;
      /* the dismiss path — accept removes the banner (a real gate, not decoration) */
      const dismissed = await page.evaluate(async () => {
        const btn = document.querySelector(".cb-accept");
        if (!btn) return { clicked: false };
        btn.click();
        await new Promise((r) => setTimeout(r, 120));
        return { clicked: true, gone: document.querySelector(".cb-banner") === null };
      });
      cookieRec.dismissed = dismissed;
      if (!dismissed.clicked || !dismissed.gone) {
        out.fail++;
        out.failures.push({ section: "(cookie)", bp: name, kind: "cookieStuck", expected: "accept click removes the banner", actual: JSON.stringify(dismissed) });
      } else out.pass++;
      out.cookie[name] = cookieRec;

      /* scrollProgress: registry + liveness sampling at 0/40/90% */
      const seats = [0, 0.4, 0.9];
      const snaps = [];
      for (const f of seats) {
        await page.evaluate((ff) => window.scrollTo(0, ff), Math.round(maxScroll * f));
        await page.waitForTimeout(150);
        snaps.push(await page.evaluate(PROGRESS_SNAPSHOT));
      }
      const rendered = snaps[0].filter((s) => s.rendered);
      const rec = { bp: name, registered: snaps[0].length, rendered: rendered.length, seats: rendered.map((s) => s.label) };
      /* RETIRED (R347 D2/D3): no verdict — the registry snapshot is
       * recorded only; the family's seats no longer exist in the live
       * contract, so the >=5/live/accent checks are deleted with them
       * (never skipped silently — this comment is the re-key). */
      out.progress[name] = rec;

      await page.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

/* ── standalone CLI ─────────────────────────────────────────────────────── */
if (process.argv[1] && (process.argv[1].endsWith("panel.mjs"))) {
  const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
  const url = arg("url", "http://localhost:5173/");
  const bps = (arg("bps", "390,768,1440")).split(",");
  const { readdirSync, readFileSync } = await import("node:fs");
  const ourSection = readdirSync(join(__dirname, "mapping"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reduce((acc, f) => Object.assign(acc, JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8")).ourSection), {});
  const sections = Object.keys(ourSection);
  const res = await panel(url, bps, sections, ourSection);
  console.log(`panel checks — ${url}`);
  for (const [k, v] of Object.entries(res.deadVoid)) console.log(`  deadVoid ${k}: worst ${v.worstGapPx}px / limit ${v.limitPx}px`);
  for (const [k, v] of Object.entries(res.hClip)) console.log(`  hClip ${k}: found ${v.found} (excluded ${v.excluded})`);
  for (const [k, v] of Object.entries(res.cookie)) console.log(`  cookie ${k}: dismissed=${JSON.stringify(v.dismissed)}`);
  for (const [k, v] of Object.entries(res.progress)) console.log(`  progress ${k}: ${v.rendered}/${v.registered} rendered [${(v.seats || []).join(", ")}]`);
  for (const s of res.skipped) console.log(`  SKIP: ${s}`);
  for (const f of res.failures) console.log(`  FAIL ${f.kind} ${f.section}@${f.bp}: ${f.actual}`);
  console.log(`panel: ${res.pass} pass / ${res.fail} fail`);
  process.exit(res.fail ? 1 : 0);
}
