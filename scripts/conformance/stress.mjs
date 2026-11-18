/**
 * r368 T2b — responsive stress measurement (spec acceptance criterion 4).
 *
 * "Zero unintended overlap, clipping, horizontal page overflow or unreachable
 * primary action across all six specified sizes; technical-plate labels do not
 * overlap at 640×360 or 844×390."
 *
 * No reference pixels are needed for this criterion, so it runs while the
 * reference capture question is open. Three detectors, all DOM-measured:
 *
 *   overflow     documentElement.scrollWidth − innerWidth (page-level bleed)
 *   clipping     an overflow:hidden|clip box whose scrollWidth exceeds its
 *                clientWidth (Arabic copy cut off inside its own line box)
 *   collision    two visible label/leaf boxes whose intersection exceeds 30 %
 *                of the smaller one, neither containing the other (a label
 *                printed on top of another label)
 *   reachability each mapped section's first visible action must be hit by
 *                elementFromPoint at its centre
 *
 * Usage: node scripts/conformance/stress.mjs [--url http://localhost:5301]
 *        [--sizes 320,360,390,412,640x360,844x390,1440] [--out docs/audit/evidence/stress.json]
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const { chromium } = createRequire(join(ROOT, "frontend", "package.json"))("playwright");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL_ = arg("url", "http://localhost:5301/");
const OUT = join(ROOT, arg("out", "docs/audit/evidence/stress.json"));

const ALL_SIZES = [
  { name: "320", w: 320, h: 640 },
  { name: "360", w: 360, h: 740 },
  { name: "390", w: 390, h: 844 },
  { name: "412", w: 412, h: 915 },
  { name: "640x360", w: 640, h: 360 },
  { name: "844x390", w: 844, h: 390 },
  { name: "1440", w: 1440, h: 900 },
];
const wanted = arg("sizes", null)?.split(",");
const SIZES = wanted ? ALL_SIZES.filter((s) => wanted.includes(s.name)) : ALL_SIZES;

const MAPPING = (() => {
  const acc = { ourSection: {} };
  for (const f of readdirSync(join(__dirname, "mapping")).filter((f) => f.endsWith(".json")).sort()) {
    Object.assign(acc.ourSection, JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8")).ourSection ?? {});
  }
  return acc;
})();

const probe = () => {
  const out = { overflow: 0, clipped: [], collisions: [], unreachable: [], sections: [] };
  out.overflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
    if (cs.pointerEvents === "none" && el.matches?.('[data-spec="preloader.overlay"], .pl')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const label = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  // clipping: text boxes whose own content is wider than the box
  for (const el of document.querySelectorAll("h1,h2,h3,h4,p,span,a,li,button,label,small,strong")) {
    if (!isVisible(el) || !(el.textContent || "").trim()) continue;
    const cs = getComputedStyle(el);
    if (cs.overflowX !== "hidden" && cs.overflowX !== "clip") continue;
    if (el.scrollWidth > el.clientWidth + 1) out.clipped.push({ el: label(el), text: (el.textContent || "").trim().slice(0, 40), scrollW: el.scrollWidth, clientW: el.clientWidth });
  }
  // collisions: leaf-ish boxes inside each mapped section
  for (const [key, sel] of Object.entries(window.__MAP__ ?? {})) {
    const root = document.querySelector(sel);
    if (!root) continue;
    // TEXT-ON-TEXT only. The first detector iterated every leaf, so SVG path
    // internals (which share one bounding box by design), stacked raster strips
    // and scrim edges were reported as "collisions" — 2 373 of them at 320 px,
    // drowning the real defect class. A label collision is one readable string
    // printed over another; that is what the reference-side defect record means
    // by text-on-text, and that is all this measures.
    const boxes = [];
    const walk = (el) => {
      if (!isVisible(el)) return;
      if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) return; // vector internals: boxes are not labels
      const kids = [...el.children].filter(isVisible);
      const r = el.getBoundingClientRect();
      const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
      if (ownText.length > 1) boxes.push({ el, r, name: label(el), text: ownText.slice(0, 24) });
      for (const k of kids) walk(k);
    };
    walk(root);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const ix = Math.max(0, Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left));
        const iy = Math.max(0, Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top));
        const inter = ix * iy;
        if (inter <= 0) continue;
        const smaller = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
        if (smaller > 0 && inter / smaller > 0.3) {
          out.collisions.push({ section: key, a: a.name, b: b.name, share: Math.round((inter / smaller) * 100), aText: a.text, bText: b.text });
        }
      }
    }
    out.sections.push({ key, height: Math.round(root.getBoundingClientRect().height) });
    // reachability of the section's first visible action
    const action = [...root.querySelectorAll("a,button")].find(isVisible);
    if (action) {
      const r = action.getBoundingClientRect();
      const cx = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const cy = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const hit = r.top >= 0 && r.bottom <= window.innerHeight ? document.elementFromPoint(cx, cy) : null;
      if (hit && !(action === hit || action.contains(hit) || hit.contains(action))) {
        const hr = hit.getBoundingClientRect();
        out.unreachable.push({ section: key, action: label(action), coveredBy: label(hit), coveringBox: `${Math.round(hr.width)}x${Math.round(hr.height)}`, actionBox: `${Math.round(r.width)}x${Math.round(r.height)}` });
      }
    }
  }
  return out;
};

const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), url: URL_, profile: { browser: `chromium ${browser.version()}`, node: process.version }, sizes: {}, map: MAPPING.ourSection };
let failed = 0;
for (const size of SIZES) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.goto(URL_, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  // the preloader is a fixed, click-blocking veil — measuring reachability
  // through it produced "burger covered by div.pl" at every size. Wait it out.
  await page.evaluate(async () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 30000) {
      const veil = document.querySelector('[data-spec="preloader.overlay"], .pl[role="progressbar"], [data-preloader]');
      if (!veil) return;
      const cs = getComputedStyle(veil);
      if (Number(cs.opacity) < 0.02 || cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") return;
      await new Promise((r) => setTimeout(r, 120));
    }
  }).catch(() => {});
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => ({ kids: document.querySelector("#root")?.children.length ?? 1, h: document.documentElement.scrollHeight, vh: window.innerHeight }));
    if (st.kids > 0 && st.h > st.vh * 1.5) break;
    await page.waitForTimeout(250);
  }
  // walk the page so lazy/pinned seats mount, then return to the top
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < docH; y += size.h) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  // r368 T0 — the settled-state recheck. The audit found reachability rows
  // that did not reproduce after the page settled ("an overlay that disappears
  // in a separately settled browser session"): a transient row is a
  // state-sensitivity lead, never a hard failure. Probe TWICE with a settle
  // gap; a row survives only if elementFromPoint still reports the same cover
  // in both probes.
  await page.waitForTimeout(1200);
  await page.evaluate((m) => { window.__MAP__ = m; }, MAPPING.ourSection);
  const r1 = await page.evaluate(probe);
  await page.waitForTimeout(800);
  const r2 = await page.evaluate(probe);
  const persists = (list, key) => {
    const keyOf = (c) => `${c.section}|${c.action ?? c.el ?? c.a}|${c.coveredBy ?? c.b ?? c.text ?? ""}`;
    const second = new Set(r2[key].map(keyOf));
    return list.filter((c) => second.has(keyOf(c)));
  };
  const originalUnreachable = r1.unreachable.length;
  r1.unreachable = persists(r1.unreachable, "unreachable");
  r1.unreachableTransient = originalUnreachable - r1.unreachable.length;
  r1.collisions = persists(r1.collisions, "collisions");
  r1.clipped = r1.clipped.filter((c) => r2.clipped.some((d) => d.el === c.el && d.text === c.text));
  const r = r1;
  const viewport = await page.viewportSize();
  report.sizes[size.name] = { viewport: `${viewport.width}x${viewport.height}`, ...r };
  const bad = r.overflow > 0 || r.clipped.length || r.collisions.length || r.unreachable.length;
  if (bad) failed++;
  console.log(`${size.name.padEnd(8)} overflow ${String(r.overflow).padStart(3)}px  clipped ${String(r.clipped.length).padStart(2)}  collisions ${String(r.collisions.length).padStart(2)}  unreachable ${r.unreachable.length}  ${bad ? "⚠" : "ok"}`);
  for (const c of r.collisions.slice(0, 6)) console.log(`   collision [${c.section}] ${c.a} × ${c.b} — ${c.share}% "${c.aText}" / "${c.bText}"`);
  for (const c of r.clipped.slice(0, 6)) console.log(`   clipped ${c.el} ${c.scrollW}>${c.clientW} "${c.text}"`);
  for (const c of r.unreachable.slice(0, 6)) console.log(`   unreachable [${c.section}] ${c.action} (${c.actionBox}) covered by ${c.coveredBy} (${c.coveringBox})`);
  await page.close();
}
await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`\nSTRESS: ${SIZES.length - failed}/${SIZES.length} sizes clean  → ${OUT.replace(`${ROOT}/`, "")}`);
process.exit(failed ? 1 : 0);
