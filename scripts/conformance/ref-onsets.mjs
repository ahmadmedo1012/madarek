/**
 * r368 T1-measure — the reference's VISUAL onset sampler.
 *
 * Why this exists (measured): the live trigger table's `start` values are the
 * GSAP ScrollTrigger WINDOWS, not the moments the sections' pixels begin to
 * move — for `home-problem-wrap` the table says the family starts at -1.8×H
 * while the section's first visible style change happens at -0.34×H, and the
 * intro/platform/usecase families show NO pre-entry motion at all (their
 * first steps' signatures are constant through the whole approach). Tuning
 * our reveal lines against the table would have moved the WRONG dial; the
 * verified tuning target is the visual onset, which only this sampler reads.
 *
 * Protocol: wheel the stage across each section's approach window
 * (entry − 2100 px → entry + 300 px) in 150 px seats (each seated with
 * corrective wheels to ±2 px, the same law as fidelity.mjs), read the
 * section subtree's computed-style signature (mid-flight opacity/transform
 * only — ambient CSS keyframe loops are a separate family) after each seat,
 * and record the first offset whose signature leaves its initial value.
 * The onset fraction is (onset − entry)/H — negative means the motion starts
 * before the section's root reaches the viewport top.
 *
 * Usage:
 *   PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/ref-onsets.mjs \
 *        [--sections key,…] [--bps 1440] [--out docs/audit/evidence/ref-onsets.json]
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const requireFrontend = createRequire(join(ROOT, "frontend", "package.json"));
const { chromium } = requireFrontend("playwright");

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const round = (n) => Math.round(n * 10) / 10;

const OUT = join(ROOT, arg("out", "docs/audit/evidence/ref-onsets.json"));
const BPS = [{ name: "1440", width: 1440, height: 900 }, { name: "390", width: 390, height: 844 }]
  .filter((v) => !arg("bps", null) || arg("bps").split(",").includes(v.name));
const REFERENCE_URL = arg("reference", "https://heronaiapp.com/");

const MAPPING = (() => {
  const acc = {};
  for (const f of readdirSync(join(__dirname, "mapping")).filter((f) => f.endsWith(".json")).sort()) {
    Object.assign(acc, JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8")).heronPageKey ?? {});
  }
  return acc;
})();
const DEFAULT_SECTIONS = Object.keys(MAPPING).filter((k) => k !== "chrome");
const KEYS = (arg("sections", null) ? arg("sections").split(",") : DEFAULT_SECTIONS).filter((k) => MAPPING[k]);

const browser = await chromium.launch({ headless: true });
const report = {
  generatedAt: new Date().toISOString(),
  protocol: "wheel seats in 150 px steps across [entry−2100, entry+300]; signature = mid-flight opacity/transform (ambient keyframe loops excluded); onset = first seat whose signature leaves its initial value; fraction = (onset−entry)/H",
  reference: REFERENCE_URL,
  viewports: {},
};
for (const bp of BPS) {
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  await page.goto(REFERENCE_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(9000);
  const accept = page.locator("button:visible", { hasText: /^\s*ACCEPT\s*$/i }).first();
  if ((await accept.count().catch(() => 0)) > 0) await accept.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(600);

  const tops = () => page.evaluate((map) => {
    const out = {};
    for (const k of Object.keys(map)) {
      const el = document.querySelector(map[k]);
      out[k] = el ? Math.round(el.getBoundingClientRect().top) : null;
    }
    return out;
  }, Object.fromEntries(KEYS.map((k) => [k, MAPPING[k]])));

  const sigOf = (sel) => page.evaluate((s) => {
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
  }, sel).catch(() => null);

  // census-lite for the entry offsets
  const steps = [];
  let prev = null, stale = 0;
  for (let s = 0; s < 80; s++) {
    const t = await tops();
    steps.push({ tops: t });
    const sig = JSON.stringify(t);
    if (sig === prev) { stale++; if (stale >= 2) break; } else stale = 0;
    prev = sig;
    await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(420);
  }
  const anchor0 = steps[0].tops["home-hero-wrap"];
  if (anchor0 == null) { console.error("anchor missing"); continue; }
  for (const st of steps) st.offset = anchor0 - st.tops["home-hero-wrap"];
  const maxOffset = steps[steps.length - 1].offset;

  const heroTop = () => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  }, MAPPING["home-hero-wrap"]).catch(() => null);

  const seat = async (target) => {
    let at = anchor0 - (await heroTop());
    let need = Math.round((target - at) / 600);
    for (let i = 0; i < Math.max(0, Math.min(need, 30)); i++) {
      await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(420);
    }
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(420);
      at = anchor0 - (await heroTop());
      const r = target - at;
      if (Math.abs(r) <= 2) return at;
      await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
      await page.mouse.wheel(0, r);
    }
    return anchor0 - (await heroTop());
  };

  const sections = {};
  for (const key of KEYS) {
    const sel = MAPPING[key];
    let bi = 0, bv = Infinity;
    steps.forEach((st, i) => {
      const t = st.tops[key];
      if (t == null) return;
      if (Math.abs(t) < bv) { bv = Math.abs(t); bi = i; }
    });
    const entryOffset = steps[bi]?.offset ?? null;
    if (entryOffset == null) { sections[key] = { entryOffset: null, note: "not in census" }; continue; }
    const height = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? Math.round(el.getBoundingClientRect().height) : null;
    }, sel).catch(() => null);
    const startOffset = Math.max(0, entryOffset - 2100);
    const sigs = [];
    let first = null, onsetOffset = null;
    for (let off = startOffset; off <= entryOffset + 300; off += 150) {
      const at = await seat(off);
      await page.waitForTimeout(300);
      const v = await sigOf(sel);
      if (first == null) first = v;
      if (onsetOffset == null && v !== first) onsetOffset = off;
      sigs.push({ off: at, v });
    }
    sections[key] = {
      entryOffset,
      height,
      visualOnsetOffset: onsetOffset,
      visualOnsetFrac: onsetOffset != null && height ? round((onsetOffset - entryOffset) / height) : null,
      note: onsetOffset == null
        ? "no pre-entry visual motion — the family's visible changes begin at/after entry (the trigger table's start is the ScrollTrigger window, not the visible moment)"
        : null,
      sigs,
    };
    console.error(`${bp.name} ${key}: entry ${entryOffset} H ${height} onset ${onsetOffset} frac ${sections[key].visualOnsetFrac}`);
  }
  report.viewports[bp.name] = { maxOffset, sections };
  await page.close();
}
await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`ref-onsets → ${OUT.replace(`${ROOT}/`, "")}`);
