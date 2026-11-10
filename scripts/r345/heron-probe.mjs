import { createRequire } from "node:module";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const { chromium } = createRequire(path.join(ROOT, "frontend", "package.json"))("playwright");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("https://heronaiapp.com/", { waitUntil: "networkidle", timeout: 90000 });
for (const wait of [3000, 6000, 8000]) {
  await p.waitForTimeout(wait);
  const info = await p.evaluate(() => {
    const de = document.documentElement;
    const scrollers = [...document.querySelectorAll("*")].filter((e) => {
      const s = getComputedStyle(e);
      return (s.overflowY === "auto" || s.overflowY === "scroll") && e.scrollHeight > e.clientHeight + 50;
    }).slice(0, 3).map((e) => ({ tag: e.tagName, cls: String(e.className).slice(0, 60), sh: e.scrollHeight, ch: e.clientHeight }));
    return { docH: de.scrollHeight, innerH: window.innerHeight, bodyH: document.body.scrollHeight, scrollers };
  });
  console.log(JSON.stringify(info));
}
// try real wheel scrolling
for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 600); await p.waitForTimeout(350); }
await p.waitForTimeout(1500);
const after = await p.evaluate(() => ({ docH: document.documentElement.scrollHeight, scrollY: window.scrollY, bodyH: document.body.scrollHeight }));
console.log("after wheel:", JSON.stringify(after));
await p.screenshot({ path: "/tmp/r345/panel/heron-probe-after-wheel.png" });
await b.close();
