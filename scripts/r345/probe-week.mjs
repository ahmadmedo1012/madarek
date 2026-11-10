import { createRequire } from "node:module";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const { chromium } = createRequire(path.join(ROOT, "frontend", "package.json"))("playwright");
const b = await chromium.launch();
const context = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto("http://localhost:5275/student/dashboard", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
const res = await page.evaluate(() => {
  const out = { navRects: [], weekRects: [], overlap: [] };
  const fixed = [...document.querySelectorAll("*")].filter((e) => {
    const s = getComputedStyle(e);
    return (s.position === "fixed" || s.position === "sticky") && e.getBoundingClientRect().height > 20 && e.getBoundingClientRect().bottom > 700;
  });
  for (const e of fixed.slice(0, 4)) out.navRects.push({ cls: String(e.className).slice(0, 50), r: e.getBoundingClientRect().toJSON() });
  const week = [...document.querySelectorAll("[class*='week'], [class*='schedule'], [class*='strip']")].filter((e) => (e.textContent || "").includes("السبت") || (e.textContent || "").includes("السبت"));
  for (const e of week.slice(0, 3)) {
    const r = e.getBoundingClientRect();
    if (r.height > 10) out.weekRects.push({ cls: String(e.className).slice(0, 50), top: r.top.toFixed(0), bottom: r.bottom.toFixed(0) });
  }
  return out;
});
console.log(JSON.stringify(res, null, 1).slice(0, 900));
await b.close();
