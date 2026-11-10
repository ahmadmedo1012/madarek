import { createRequire } from "node:module";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const req = createRequire(path.join(ROOT, "apps", "mobile", "package.json"));
const { chromium } = req("playwright");
const BASE = "http://localhost:8082";
import { spawn } from "node:child_process";
async function metroUp() {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch("http://localhost:8082"); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
if (!(await metroUp())) {
  const mp = spawn("npx", ["expo", "start", "--web", "--port", "8082"], {
    cwd: path.join(ROOT, "apps", "mobile"), env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
    stdio: ["ignore", "pipe", "pipe"], detached: true,
  });
  mp.stdout.on("data", () => {});
  if (!(await metroUp())) { console.error("metro did not come up"); process.exit(1); }
}

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.type(), m.text().slice(0, 150)); });
await p.route("**/api/v1/**", async (route) => {
  const u = new URL(route.request().url());
  if (u.pathname.endsWith("/auth/me")) {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "rev", email: "r@r.dev", role: "STUDENT", firstName: "م", lastName: "ع" }) });
  } else {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  }
});
await p.goto(BASE + "/student/courses", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(11000);
await p.screenshot({ path: "/tmp/r345/mobile/probe-toast.png" });
const probe = await p.evaluate(() => {
  const out = {};
  out.fixed = [...document.querySelectorAll("body *")].filter((e) => { const s = getComputedStyle(e); return (s.position === "fixed" || s.position === "absolute") && parseInt(s.bottom || "9999") < 200 && (e.textContent || "").trim().length > 0; }).slice(0, 6).map((e) => ({ tag: e.tagName, cls: String(e.className).slice(0, 90), txt: (e.textContent || "").slice(0, 160) }));
  out.cantUpdate = [...document.querySelectorAll("*")].filter((e) => (e.textContent || "").includes("Cannot update")).length;
  out.bodyTail = (document.body.innerText || "").slice(-300);
  return out;
});
console.log(JSON.stringify(probe, null, 1).slice(0, 1500));
await b.close();
