/** panel-probe — R345 E1 · numeric assertions for the round-1 findings.
 * Probes each route at 1440 light for:
 *  A. header-title overlap (title vs sticky nav / search pill / tabs)
 *  B. footer overlap/collision (last content vs footer rects)
 *  C. MOCK/debug text exposure (visible text regex)
 *  D. Arabic letter-spacing violations (computed letter-spacing > 0 on Arabic text)
 *  E. 390 student_dashboard: week grid clipped by bottom nav
 * Usage: node scripts/r345/panel-probe.mjs [--routes a,b] (default: the panel set) */
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.join(__dirname, "..", "..");
const URL_BASE = process.env.PANEL_URL || "http://localhost:5275";
const { chromium } = createRequire(path.join(WORKTREE, "frontend", "package.json"))("playwright");
const esbuild = createRequire(path.join(WORKTREE, "frontend", "package.json"))("esbuild");

const ROUTES = (process.argv.includes("--routes") ? process.argv[process.argv.indexOf("--routes") + 1].split(",") : [
  "/", "/auth", "/register", "/universities", "/features", "/about", "/campus", "/contact", "/help", "/app",
  "/colleges/leaderboard", "/legal/privacy", "/legal/terms", "/404", "/__design",
  "/student/dashboard", "/student/courses", "/student/catalog", "/student/courses/offr_e2e_algorithms",
  "/student/lectures/lec_e2e_greedy", "/student/colleges", "/student/achievements", "/student/community", "/student/exams", "/student/training",
]);

async function ensureTransport() {
  const srcDir = path.join(WORKTREE, "frontend", "tests", "e2e", "fixtures");
  const srcs = ["mock-transport.ts", "api-fixtures.ts"].map((f) => path.join(srcDir, f));
  const hash = crypto.createHash("sha1").update(srcs.map((f) => fs.readFileSync(f)).join("")).digest("hex").slice(0, 12);
  const dir = path.join(os.tmpdir(), `r343-css-dead-${hash}`);
  const out = path.join(dir, "transport.mjs");
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, "media"), { recursive: true });
    fs.copyFileSync(path.join(srcDir, "media", "lecture.mp4"), path.join(dir, "media", "lecture.mp4"));
    esbuild.buildSync({
      stdin: { contents: `export { installMockApi, seedSession } from ${JSON.stringify(srcs[0])}; export { STUDENT_USER } from ${JSON.stringify(srcs[1])};`, resolveDir: srcDir, loader: "ts" },
      bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    });
  }
  return import(`${pathToFileURL(out).href}?v=${hash}`);
}
const { installMockApi, seedSession, STUDENT_USER } = await ensureTransport();

const PROBE = `() => {
  const out = { titleOverlap: [], footerOverlap: [], mockText: [], trackedArabic: [] };
  const vw = document.documentElement.clientWidth;
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight + 2000; };
  const texts = () => [...document.querySelectorAll('h1,h2,h3,header a,header button,[class*="title"],[class*="Title"]')].filter(vis);
  // A. title vs sticky bars: any two elements whose rects intersect by > 6px in BOTH axes
  const els = texts();
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 6 && oy > 6 && !els[i].contains(els[j]) && !els[j].contains(els[i])) {
      out.titleOverlap.push(String((els[i].textContent||"").trim().slice(0,25)) + " X " + String((els[j].textContent||"").trim().slice(0,25)));
    }
  }
  // B. footer: intersecting text blocks inside footer
  const footer = document.querySelector('footer, [class*="footer"]');
  if (footer) {
    const ft = [...footer.querySelectorAll('a,h1,h2,h3,h4,p,span,div')].filter((e) => vis(e) && e.children.length === 0 && (e.textContent||'').trim().length > 2);
    for (let i = 0; i < ft.length; i++) for (let j = i + 1; j < ft.length; j++) {
      const a = ft[i].getBoundingClientRect(), b = ft[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 8 && oy > 8) { out.footerOverlap.push(String((ft[i].textContent||"").trim().slice(0,20)) + " X " + String((ft[j].textContent||"").trim().slice(0,20))); }
    }
  }
  // C. mock/debug text
  const re = /MOCK_NOT_IMPLEMENTED|not implemented|TestUser|test@/i;
  for (const e of document.querySelectorAll('body *')) {
    if (e.children.length === 0 && re.test(e.textContent || '')) out.mockText.push(String((e.textContent||"").trim().slice(0,60)));
  }
  // D. Arabic text with letter-spacing
  for (const e of document.querySelectorAll('h1,h2,h3,p,span,a,button,div')) {
    if (e.children.length === 0 && /[\\u0600-\\u06FF]/.test(e.textContent || '')) {
      const ls = getComputedStyle(e).letterSpacing;
      const px = parseFloat(ls) || 0;
      if (px > 0.2) out.trackedArabic.push(String((e.textContent||"").trim().slice(0,30)) + " ls=" + ls);
    }
  }
  // E. 390 week-grid clip (probed separately via ?week)
  return out;
}`;

const results = {};
const browser = await chromium.launch({ headless: true });
for (const route of ROUTES) {
  const key = route;
  try {
    const isStudent = route.startsWith("/student");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (isStudent) {
      await installMockApi(context, { sessionUser: STUDENT_USER });
      await seedSession(context, { ...STUDENT_USER, memberships: [], currentInstitution: { id: "inst_e2e_zu", name: "جامعة الزاوية", nameEn: "Zawia University", slug: "zu" }, membershipRole: "STUDENT" }, { token: "e2e-token-student" });
    } else {
      await installMockApi(context, { sessionUser: null });
      await seedSession(context, null, {});
    }
    const page = await context.newPage();
    await page.goto(`${URL_BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1800);
    results[key] = await page.evaluate(PROBE);
    await context.close();
  } catch (e) {
    results[key] = { error: String(e).slice(0, 120) };
  }
  const r = results[key] ?? {};
  const flags = ["titleOverlap", "footerOverlap", "mockText", "trackedArabic"].filter((k) => r[k]?.length).map((k) => `${k}:${r[k].length}`).join(" ");
  console.log(route, flags || "clean");
}
await browser.close();
fs.mkdirSync("/tmp/r345/panel", { recursive: true });
fs.writeFileSync("/tmp/r345/panel/probe-results.json", JSON.stringify(results, null, 1));
console.log("→ /tmp/r345/panel/probe-results.json");
