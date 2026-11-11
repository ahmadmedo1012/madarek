// probe-map.mjs — ground truth for the home-map-wrap conformance residuals
// Answers: what state is OUR .chapters section in at census time (scroll 0,
// skirt possibly collapsed) vs scrolled-in (skirt expanded)? Compares against
// the frozen Heron spec records (root h 6300, children at sr.y ≈ −870).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const URL_ = process.argv[2] || "http://localhost:5320";
const spec = JSON.parse(readFileSync("docs/redesign/r335/heron-spec/home-map-wrap.1440.json", "utf8"));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL_, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const snap = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const sec = q("section#chapters.chapters");
    const out = {
      scrollY: Math.round(window.scrollY),
      docH: document.documentElement.scrollHeight,
      section: r(sec),
      secInlineCV: getComputedStyle(sec).contentVisibility,
      jt: r(q(".jt")),
    };
    const sr = (el) => {
      if (!el || !sec) return null;
      const b = el.getBoundingClientRect(), s = sec.getBoundingClientRect();
      return { x: Math.round(b.left - s.left), y: Math.round(b.top - s.top), w: Math.round(b.width), h: Math.round(b.height) };
    };
    out.jtSr = sr(q(".jt"));
    // every data-spec element in the section
    out.ds = {};
    sec?.querySelectorAll("[data-spec]").forEach((el) => {
      out.ds[el.getAttribute("data-spec")] = sr(el);
    });
    // the direct children of the section + .jt children (the step rows)
    out.secKids = sec ? Array.from(sec.children).map((c) => c.className + "|" + c.tagName + ":" + JSON.stringify(sr(c))) : [];
    out.jtKids = q(".jt") ? Array.from(q(".jt").children).map((c) => (c.className || c.tagName) + ":" + JSON.stringify(sr(c))) : [];
    return out;
  });

console.log("=== AT SCROLL 0 (census state) ===");
const s0 = await snap();
console.log(JSON.stringify({ scrollY: s0.scrollY, docH: s0.docH, section: s0.section, cv: s0.secInlineCV, jt: s0.jt, jtSr: s0.jtSr }, null, 1));
console.log("secKids:", s0.secKids);
console.log("jtKids:", s0.jtKids.slice(0, 12));
console.log("data-spec count:", Object.keys(s0.ds).length);
console.log("sample ds:", JSON.stringify(Object.fromEntries(Object.entries(s0.ds).slice(0, 10))));

// scroll the section into view (expand the skirt), settle, re-measure
await page.evaluate(() => {
  const L = window.__mdrkLenis;
  const y = document.querySelector("section#chapters.chapters").getBoundingClientRect().top + window.scrollY - 100;
  if (L && L.scrollTo) L.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1200);
console.log("\n=== SCROLLED TO SECTION (skirt expanded) ===");
const s1 = await snap();
console.log(JSON.stringify({ scrollY: s1.scrollY, docH: s1.docH, section: s1.section, cv: s1.secInlineCV, jtSr: s1.jtSr }, null, 1));
console.log("jtKids:", s1.jtKids.slice(0, 12));

// Heron spec reference values
console.log("\n=== HERON SPEC (1440) reference ===");
const els = spec.elements;
for (const p of ["home-map-wrap > div[1]", "home-map-wrap > div[1] > section[1]", "home-map-wrap > div[1] > div[1] > div[1] > div[1] > div[1] > div[2]", "home-map-wrap > div[1] > div[2] > div[8] > div[1] > div[4] > div[1]"]) {
  const rec = els.find((e) => e.p === p);
  console.log(p.slice(0, 75), "→", rec ? JSON.stringify(rec.sr) : "(none)");
}

// diff our data-spec seats vs the mapping's expectations for failing families
await browser.close();
