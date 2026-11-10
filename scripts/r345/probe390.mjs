import { createRequire } from "node:module";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const { chromium } = createRequire(path.join(ROOT, "frontend", "package.json"))("playwright");
const URL_BASE = "http://localhost:5275";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
const WORKTREE = path.resolve(import.meta.dirname, "..", "..");
const esbuild = createRequire(path.join(WORKTREE, "frontend", "package.json"))("esbuild");
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
      bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
  }
  return import(`${pathToFileURL(out).href}?v=${hash}`);
}
const { installMockApi, seedSession, STUDENT_USER } = await ensureTransport();
const b = await chromium.launch();
for (const [route, label] of [["/", "landing"], ["/student/dashboard", "dash"]]) {
  const context = await b.newContext({ viewport: { width: 390, height: 844 } });
  if (route.startsWith("/student")) {
    await installMockApi(context, { sessionUser: STUDENT_USER });
    await seedSession(context, { ...STUDENT_USER, memberships: [], currentInstitution: { id: "inst_e2e_zu", name: "جامعة الزاوية", nameEn: "Zawia University", slug: "zu" }, membershipRole: "STUDENT" }, { token: "e2e-token-student" });
  }
  const page = await context.newPage();
  await page.goto(URL_BASE + route, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  if (route === "/") {
    // scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
  }
  const res = await page.evaluate(() => {
    const out = [];
    const leafs = [...document.querySelectorAll("footer a, footer p, footer span, footer div, footer nav")].filter((e) => {
      if (e.children.length > 0) return false;
      const t = (e.textContent || "").trim();
      return t.length > 1;
    });
    const rect = (e) => e.getBoundingClientRect();
    for (let i = 0; i < leafs.length; i++) for (let j = i + 1; j < leafs.length; j++) {
      const a = rect(leafs[i]), c = rect(leafs[j]);
      const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left);
      const oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      if (ox > 6 && oy > 6) out.push(`${(leafs[i].textContent||'').trim().slice(0,18)} X ${(leafs[j].textContent||'').trim().slice(0,18)} (ox=${ox.toFixed(0)},oy=${oy.toFixed(0)})`);
    }
    // also any element extending past the viewport width
    const wide = [...document.querySelectorAll("footer *")].filter((e) => {
      const r = rect(e);
      return r.width > 0 && (r.right > 391 || r.left < -1);
    }).slice(0, 5).map((e) => `${e.className.toString().slice(0,40)} right=${rect(e).right.toFixed(0)}`);
    return { overlaps: out.slice(0, 12), wide };
  });
  console.log(label, JSON.stringify(res, null, 1).slice(0, 1400));
  await context.close();
}
await b.close();
