/**
 * r368 T1 — the input-modality reveal-coverage probe (the plan's "paired
 * browser traces for mouse, touch emulation, keyboard and reduced motion").
 *
 * The contract under test: the reveal system must never HOLD CONTENT HIDDEN
 * under any input modality — mouse wheels, touch (coarse pointer), keyboard
 * paging and reduced-motion each have to end with every tracked target
 * visible. Reduced motion has the stronger contract: initReveals bails
 * entirely (no armed class, content ships visible, nothing transitions).
 *
 * Usage (your OWN task port — AGENTS.md law):
 *   PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/modality.mjs \
 *     --url http://localhost:53NN --out docs/audit/evidence/modality.json
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const requireFrontend = createRequire(join(ROOT, "frontend", "package.json"));
const { chromium } = requireFrontend("playwright");

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg("url", "http://localhost:5301/");
const OUT = join(ROOT, arg("out", "docs/audit/evidence/modality.json"));

// the tracked reveal targets (the reveals.ts families' heads)
const TARGETS = [
  ["problem items", ".pm-col"],
  ["usecase rows", ".rl-row"],
  ["cta title", ".fo-cta-title"],
  ["cta lede", ".fo-cta-lede"],
  ["intro beats", ".st-plabel"],
  ["footer rise", ".fo-c1-top, .fo-c2-top, .fo-c2-bottom"],
];

const MODALITIES = [
  { name: "mouse", viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference", hasTouch: false },
  { name: "touch", viewport: { width: 390, height: 844 }, reducedMotion: "no-preference", hasTouch: true, isMobile: true },
  { name: "keyboard", viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference", hasTouch: false },
  { name: "reduced-motion", viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", hasTouch: false },
];

const settle = async (page, tag) => {
  await page.evaluate(async () => { await document.fonts.ready; }).catch(() => {});
  for (let i = 0; i < 40; i++) {
    const gone = await page.evaluate(() => {
      const p = document.querySelector('[data-spec="preloader.overlay"]');
      if (!p) return true;
      const cs = getComputedStyle(p);
      return cs.display === "none" || Number(cs.opacity) < 0.02;
    }).catch(() => true);
    if (gone) break;
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
};

async function driveToBottom(page, modality) {
  if (modality.name === "reduced-motion") return; // nothing to drive: content ships visible
  const endY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  if (modality.name === "keyboard") {
    for (let i = 0; i < 80; i++) {
      const y = await page.evaluate(() => window.scrollY);
      if (y >= endY - 2) break;
      await page.keyboard.press("PageDown");
      await page.waitForTimeout(120);
    }
    await page.keyboard.press("End").catch(() => {});
  } else {
    // mouse wheels / touch-config wheels — the Lenis seam carries both
    for (let i = 0; i < 120; i++) {
      const y = await page.evaluate(() => window.scrollY);
      if (y >= endY - 2) break;
      if (modality.hasTouch) {
        await page.evaluate((t) => {
          const lenis = window.__mdrkLenis ?? window.__lenis ?? window.lenis;
          if (lenis?.scrollTo) { try { lenis.scrollTo(t, { force: true }); } catch {} }
          window.scrollTo({ top: t, left: 0 });
        }, Math.min(y + 600, endY));
      } else {
        await page.mouse.wheel(0, 900);
      }
      await page.waitForTimeout(160);
    }
  }
  await page.waitForTimeout(1800); // let the entrances complete + the settle belt drain
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const m of MODALITIES) {
  const page = await browser.newPage({ viewport: m.viewport, hasTouch: m.hasTouch ?? false, isMobile: m.isMobile ?? false, reducedMotion: m.reducedMotion, deviceScaleFactor: 1 });
  const row = { modality: m.name, viewport: `${m.viewport.width}x${m.viewport.height}`, targets: {} };
  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await settle(page, m.name);
    row.armedClassAtLoad = await page.evaluate(() => document.documentElement.classList.contains("js-reveal-armed"));
    await driveToBottom(page, m);
    const finalY = await page.evaluate(() => window.scrollY);
    row.reachedScroll = finalY;
    row.docEnd = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
    for (const [name, sel] of TARGETS) {
      const state = await page.evaluate((s) => {
        const els = Array.from(document.querySelectorAll(s));
        if (!els.length) return { count: 0, note: "no elements" };
        const inView = els.filter((el) => el.classList.contains("in-view")).length;
        const visible = els.filter((el) => {
          const cs = getComputedStyle(el);
          return Number(cs.opacity) >= 0.99;
        }).length;
        return { count: els.length, inView, visible, allVisible: visible === els.length };
      }, sel);
      row.targets[name] = state;
    }
  } finally {
    await page.close();
  }
  results.push(row);
  console.error(`  ${m.name}: ` + Object.entries(row.targets).map(([k, v]) => `${k} ${v.visible}/${v.count}`).join(" · ") + (m.name === "reduced-motion" ? ` | armed=${row.armedClassAtLoad}` : ""));
}
await browser.close();

// the verdict: every modality's every target fully visible; reduced-motion must carry NO armed class
const failures = [];
for (const r of results) {
  for (const [name, t] of Object.entries(r.targets)) {
    if (t.count > 0 && !(t.allVisible)) failures.push(`${r.modality}/${name}: ${t.visible}/${t.count} visible`);
  }
  if (r.modality === "reduced-motion" && r.armedClassAtLoad) failures.push("reduced-motion: the armed class landed (the module did not bail)");
}
const report = {
  generatedAt: new Date().toISOString(),
  url: URL,
  contract: "every tracked reveal target ends visible under every input modality; reduced-motion bails before arming (content ships visible, nothing transitions)",
  note: "the touch modality runs the coarse-pointer/mobile page config with the Lenis seam as the driver — a real touchscreen swipe trace (the Q touch family's own dial) is the recorded residual",
  results,
  verdict: failures.length ? "FAIL" : "PASS",
  failures,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`MODALITY ${report.verdict}${failures.length ? " — " + failures.join("; ") : ""} → ${OUT}`);
process.exit(failures.length ? 1 : 0);
