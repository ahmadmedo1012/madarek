/**
 * r368 T8 — computed-style equivalence harness.
 *
 * Task 8 allows consolidating duplicate selectors and obsolete overrides ONLY
 * with before/after computed-style evidence. This snapshots the computed style
 * of every element inside the landing seats at the measured breakpoints, keyed by
 * a stable DOM path, so two runs can be diffed exactly.
 *
 * Usage:
 *   node scripts/conformance/style-snapshot.mjs --out /tmp/before.json
 *   node scripts/conformance/style-snapshot.mjs --out /tmp/after.json --compare /tmp/before.json
 *
 * --compare exits 1 and lists every changed property (path, property, before,
 * after). An intentional change must be listed in the commit message; an
 * accidental one is a regression.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
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
const OUT = arg("out", "/tmp/style-snapshot.json");
const COMPARE = arg("compare", null);
const BPS = [
  { name: "1440", w: 1440, h: 900 },
  { name: "390", w: 390, h: 844 },
];

const MAPPING = (() => {
  const acc = {};
  for (const f of readdirSync(join(__dirname, "mapping")).filter((f) => f.endsWith(".json")).sort()) {
    Object.assign(acc, JSON.parse(readFileSync(join(__dirname, "mapping", f), "utf8")).ourSection ?? {});
  }
  return acc;
})();

const PROPS = [
  "display", "position", "width", "height", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "color", "backgroundColor",
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "opacity", "transform",
  "zIndex", "rowGap", "columnGap", "borderRadius", "borderTopWidth", "overflowX", "overflowY",
  "textAlign", "direction", "visibility", "insetInlineStart", "insetInlineEnd", "flexDirection", "gridTemplateColumns",
];

const browser = await chromium.launch({ headless: true });
const snap = { url: URL_, profile: { browser: `chromium ${browser.version()}` }, bps: {} };
for (const bp of BPS) {
  const page = await browser.newPage({ viewport: { width: bp.w, height: bp.h }, deviceScaleFactor: 1 });
  await page.goto(URL_, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => ({ k: document.querySelector("#root")?.children.length ?? 1, h: document.documentElement.scrollHeight, vh: window.innerHeight }));
    if (st.k > 0 && st.h > st.vh * 1.5) break;
    await page.waitForTimeout(250);
  }
  // walk every seat so pinned/lazy content is mounted
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < docH; y += bp.h) {
    await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), y);
    await page.waitForTimeout(90);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);
  snap.bps[bp.name] = await page.evaluate(({ map, props }) => {
    const out = {};
    for (const [key, sel] of Object.entries(map)) {
      const root = document.querySelector(sel);
      if (!root) continue;
      const pathOf = (el) => {
        const parts = [];
        let cur = el;
        while (cur && cur !== root.parentElement) {
          const idx = cur.parentElement ? [...cur.parentElement.children].indexOf(cur) : 0;
          parts.unshift(`${cur.tagName.toLowerCase()}[${idx}]`);
          cur = cur.parentElement;
        }
        return parts.join(">");
      };
      const els = [root, ...root.querySelectorAll("*")];
      const row = {};
      for (const el of els) {
        const cs = getComputedStyle(el);
        const v = {};
        for (const p of props) v[p] = cs[p];
        row[pathOf(el)] = v;
      }
      out[key] = row;
    }
    return out;
  }, { map: MAPPING, props: PROPS });
  await page.close();
  console.error(`snapshot ${bp.name}: ${Object.values(snap.bps[bp.name]).reduce((a, r) => a + Object.keys(r).length, 0)} elements`);
}
await browser.close();
writeFileSync(OUT, JSON.stringify(snap, null, 0));
console.log(`snapshot → ${OUT}`);

if (COMPARE) {
  const before = JSON.parse(readFileSync(COMPARE, "utf8"));
  const diffs = [];
  for (const bp of Object.keys(snap.bps)) {
    for (const key of Object.keys(snap.bps[bp])) {
      const a = before.bps?.[bp]?.[key] ?? {};
      const b = snap.bps[bp][key];
      for (const path of Object.keys(b)) {
        const av = a[path];
        if (!av) { diffs.push({ bp, key, path, prop: "(element added)", before: null, after: "present" }); continue; }
        for (const p of Object.keys(b[path])) {
          if (av[p] !== b[path][p]) diffs.push({ bp, key, path, prop: p, before: av[p], after: b[path][p] });
        }
      }
      for (const path of Object.keys(a)) if (!b[path]) diffs.push({ bp, key, path, prop: "(element removed)", before: "present", after: null });
    }
  }
  console.log(`\nCOMPUTED-STYLE DIFF: ${diffs.length} change(s)`);
  for (const d of diffs.slice(0, 60)) console.log(`  ${d.bp} ${d.key} ${d.path} · ${d.prop}: ${d.before} → ${d.after}`);
  if (diffs.length > 60) console.log(`  … ${diffs.length - 60} more`);
  process.exitCode = diffs.length ? 1 : 0;
}
