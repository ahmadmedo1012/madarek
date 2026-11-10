import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const WORKTREE = path.resolve(import.meta.dirname, "..", "..");
const { chromium } = createRequire(path.join(WORKTREE, "frontend", "package.json"))("playwright");
const esbuild = createRequire(path.join(WORKTREE, "frontend", "package.json"))("esbuild");
const srcDir = path.join(WORKTREE, "frontend", "tests", "e2e", "fixtures");
const srcs = ["mock-transport.ts", "api-fixtures.ts"].map((f) => path.join(srcDir, f));
const hash = crypto.createHash("sha1").update(srcs.map((f) => fs.readFileSync(f)).join("")).digest("hex").slice(0, 12);
const dir = path.join(os.tmpdir(), `r343-css-dead-${hash}`);
const out = path.join(dir, "transport.mjs");
if (!fs.existsSync(out)) {
  fs.mkdirSync(path.join(dir, "media"), { recursive: true });
  esbuild.buildSync({ stdin: { contents: `export { installMockApi, seedSession } from ${JSON.stringify(srcs[0])}; export { STUDENT_USER } from ${JSON.stringify(srcs[1])};`, resolveDir: srcDir, loader: "ts" }, bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
}
const { installMockApi, seedSession, STUDENT_USER } = await import(`${pathToFileURL(out).href}?v=${hash}`);
const b = await chromium.launch();
const context = await b.newContext({ viewport: { width: 390, height: 844 } });
await installMockApi(context, { sessionUser: STUDENT_USER });
await seedSession(context, { ...STUDENT_USER, memberships: [], currentInstitution: { id: "inst_e2e_zu", name: "جامعة الزاوية", nameEn: "Zawia University", slug: "zu" }, membershipRole: "STUDENT" }, { token: "e2e-token-student" });
const page = await context.newPage();
await page.goto("http://localhost:5275/student/dashboard", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
const res = await page.evaluate(() => {
  const dayEl = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /السبت|الأحد/.test(e.textContent || ""));
  const navs = [...document.querySelectorAll("*")].filter((e) => {
    const s = getComputedStyle(e);
    return (s.position === "fixed") && e.getBoundingClientRect().height > 30 && e.getBoundingClientRect().top > 600;
  });
  const out = { dayEl: null, navs: [] };
  if (dayEl) { const r = dayEl.getBoundingClientRect(); out.dayEl = { txt: (dayEl.textContent||'').trim().slice(0,12), top: r.top.toFixed(0), bottom: r.bottom.toFixed(0), right: r.right.toFixed(0) }; }
  for (const n of navs.slice(0, 3)) { const r = n.getBoundingClientRect(); out.navs.push({ cls: String(n.className).slice(0, 40), top: r.top.toFixed(0), bottom: r.bottom.toFixed(0), w: r.width.toFixed(0) }); }
  return out;
});
console.log(JSON.stringify(res, null, 1));
await b.close();
