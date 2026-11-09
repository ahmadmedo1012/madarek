#!/usr/bin/env node
/**
 * render-plates.mjs — R344 C-4: the product plates as DETERMINISTIC
 * captures of the /__plates stage (real components, fixture data).
 *
 * For every scene id (PRODUCT_CAPTURES + the Roles EXTRA ladder + the
 * three src/assets/product consumers) × light/dark:
 *   · seed the theme (zustand persist — the live-smoke pattern)
 *   · goto /__plates, wait fonts + settle
 *   · element-screenshot the [data-plate=id] .plate-stage at dSF 2
 *     (1440×900 master) — the surrounding app chrome never enters the
 *     frame (element capture isolates the stage)
 *   · downscale the master to 1280×800 (-1280 ladder seat) and
 *     720×450 (-720 seat) — SAME framing by construction, byte-stable
 *     (fixed DOM, fixed fonts, no animation on the stage)
 *   · encode webp ≤ 80KB (quality walked down if needed; the flat
 *     paper UI encodes ~20-50KB at q88)
 *
 * Outputs:
 *   frontend/public/media/product/<id>-{720,1280}.webp  (8 ids × 2)
 *   frontend/src/assets/product/{ai-tutor,exam-active,lecture-checkpoint}.webp (720 seats)
 *
 * `--check`: re-render every plate to /tmp and byte-compare against the
 * committed files — exit 1 on any drift (the CI-runnable stability gate).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
const { chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright");
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const URL_BASE = arg("url", "http://localhost:5173");
const CHECK = process.argv.includes("--check");
const ONLY = arg("only", null);

const LADDER_IDS = [
  "student-dashboard", "student-library", "student-lecture-player", "student-matrix",
  "teacher-dashboard", "admin-dashboard", "owner-dashboard", "quality-dashboard",
];
const ASSET_IDS = ["ai-tutor", "exam-active", "lecture-checkpoint"];

const PY_SHELL = `
import sys
from PIL import Image
src, dst, w, h, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
im = Image.open(src)
im.resize((w, h), Image.LANCZOS).save(dst, "WEBP", quality=q, method=6)
`;
const pyEncode = (src, dst, w, h, q) =>
  execFileSync("python3", ["-c", PY_SHELL, src, dst, String(w), String(h), String(q)], { stdio: ["ignore", "ignore", "inherit"] });

const outPath = (id, w) => join(WORKTREE, "frontend", "public", "media", "product", `${id}-${w}.webp`);
const assetPath = (id) => join(WORKTREE, "frontend", "src", "assets", "product", `${id}.webp`);

const tmp = "/tmp/r344-plates";
rmSync(tmp, { recursive: true, force: true });
mkdirSync(join(tmp, "light"), { recursive: true });
mkdirSync(join(tmp, "dark"), { recursive: true });

const browser = await chromium.launch({ headless: true });
const ids = ONLY ? ONLY.split(",") : [...LADDER_IDS, ...ASSET_IDS];
let mismatches = 0, written = 0;
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
  await context.addInitScript(([t]) => {
    localStorage.setItem("madarek-theme", JSON.stringify({ state: { mode: t, modeUpdatedAt: 1 }, version: 2 }));
  }, [theme]);
  const page = await context.newPage();
  await page.goto(`${URL_BASE}/__plates`, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  for (const id of ids) {
    const el = page.locator(`[data-plate="${id}"] .plate-stage`);
    const master = join(tmp, theme, `${id}.png`);
    await el.screenshot({ path: master });
    if (theme === "light") {
      const seats = LADDER_IDS.includes(id) ? [[720, 450], [1280, 800]] : [[720, 450]];
      for (const [w, h] of seats) {
        const dst = LADDER_IDS.includes(id) ? outPath(id, w) : assetPath(id);
        mkdirSync(dirname(dst), { recursive: true });
        const tmpOut = join(tmp, `${id}-${w}.webp`);
        let q = 88, size = Infinity;
        for (; q >= 50; q -= 6) {
          pyEncode(master, tmpOut, w, h, q);
          size = statSync(tmpOut).size;
          if (size <= 80 * 1024) break;
        }
        if (CHECK) {
          if (existsSync(dst) && readFileSync(dst).equals(readFileSync(tmpOut))) continue;
          console.log(`✗ ${id}-${w}: bytes drifted (${relative(WORKTREE, dst)})`);
          mismatches++;
        } else {
          cpSync(tmpOut, dst);
          written++;
          console.log(`✓ ${id}-${w} ← ${Math.round(size / 1024)}KB`);
        }
      }
    }
  }
  await context.close();
}
await browser.close();

if (CHECK) {
  console.log(mismatches === 0 ? `plates --check: STABLE (${ids.length} scenes)` : `plates --check: ${mismatches} DRIFT`);
  process.exit(mismatches === 0 ? 0 : 1);
} else {
  console.log(`render-plates: ${written} files written (light masters committed; dark masters in ${tmp}/dark)`);
}
