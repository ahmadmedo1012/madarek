// probe-map2.mjs — full data-spec seat census (scroll-0 + scrolled-in) joined
// with the failing pairs + mapping + heron records → the classification table.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const URL_ = process.argv[2] || "http://localhost:5320";
const BP = { width: 1440, height: 900 };

const mapping = JSON.parse(readFileSync("scripts/conformance/mapping/home-map-wrap.json", "utf8"));
const spec = JSON.parse(readFileSync("docs/redesign/r335/heron-spec/home-map-wrap.1440.json", "utf8"));
const results = JSON.parse(readFileSync("scripts/conformance/results.json", "utf8"));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: BP });
await page.goto(URL_, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const census = () =>
  page.evaluate(() => {
    const sec = document.querySelector("section#chapters.chapters");
    const s = sec.getBoundingClientRect();
    const out = {};
    sec.querySelectorAll("[data-spec]").forEach((el) => {
      const b = el.getBoundingClientRect();
      out[el.getAttribute("data-spec")] = {
        sr: { x: Math.round(b.left - s.left), y: Math.round(b.top - s.top), w: Math.round(b.width), h: Math.round(b.height) },
        txt: (el.textContent || "").trim().slice(0, 25),
      };
    });
    return out;
  });

const at0 = await census();
await page.evaluate(() => {
  const L = window.__mdrkLenis;
  const y = document.querySelector("section#chapters.chapters").getBoundingClientRect().top + window.scrollY - 100;
  if (L && L.scrollTo) L.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1500);
const atIn = await census();

// heron by path
const heronByPath = new Map();
for (const e of spec.elements) if (!heronByPath.has(e.p)) heronByPath.set(e.p, e);

// explicit bindings: spec-path → ours data-spec key
const binds = [];
for (const b of mapping.explicit) {
  if (!b.spec) continue;
  const hp = typeof b.heron === "string" ? b.heron : b.heron?.["1440"];
  if (!hp) continue;
  binds.push({ heron: hp, ours: b.ours, skip: b.skip || [] });
}

// failing pairs at 1440
const fails = results.failures.filter((f) => f.section === "home-map-wrap" && f.bp === "1440");
console.log("fails@1440:", fails.length);

// join: for data-spec mode failures, the oursSelector is "#ds:<key>"?
const modes = {};
for (const f of fails) modes[f.mode] = (modes[f.mode] || 0) + 1;
console.log("modes:", modes);

const rows = [];
for (const f of fails) {
  const key = f.oursSelector.replace(/^#ds:/, "").replace(/^#hm:/, "");
  const bind = binds.find((b) => b.ours === key);
  const heronRec = bind ? heronByPath.get(bind.heron) : null;
  rows.push({
    kind: f.kind,
    mode: f.mode,
    ourKey: key,
    expected: f.expected,
    actual: f.actual,
    heronPath: bind ? bind.heron : f.heronPath,
    heronSr: heronRec ? heronRec.sr : null,
    skip: bind ? bind.skip : null,
    oursAt0: at0[key] ? at0[key].sr : null,
    oursAtIn: atIn[key] ? atIn[key].sr : null,
    txt: at0[key] ? at0[key].txt : null,
  });
}
writeFileSync("/tmp/map-join.json", JSON.stringify(rows, null, 1));
console.log("wrote /tmp/map-join.json:", rows.length, "rows");

// summary: how many failing data-spec keys EXIST in our census
const exist = rows.filter((r) => r.oursAt0).length;
console.log("failing keys that exist in our DOM census:", exist, "/", rows.length);
const changed = rows.filter((r) => r.oursAt0 && r.oursAtIn && JSON.stringify(r.oursAt0) !== JSON.stringify(r.oursAtIn));
console.log("keys whose rect CHANGES between scroll-0 and scrolled-in (skirt/anim state):", changed.length);
console.log(changed.slice(0,15).map(c=>c.ourKey+" "+JSON.stringify(c.oursAt0)+" -> "+JSON.stringify(c.oursAtIn)).join("\n"))
await browser.close();
