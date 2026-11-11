#!/usr/bin/env node
/**
 * mobile-review.mjs — R345 F · the 390×844 Metro-web review harness.
 *
 * Boots (or reuses) the Metro web server (`expo start --web`), then
 * captures every touched screen at 390×844 × light/dark with the API
 * hermetically intercepted (the /auth/me role + empty-list payloads so
 * the ILLUSTRATION empty states render — the seats this round wires).
 * Idempotent/resumable: existing shots are skipped unless --force.
 *
 * Usage:
 *   node scripts/r345/mobile-review.mjs --mode public    # /, /auth, /achievements…
 *   node scripts/r345/mobile-review.mjs --mode student   # the 5 student tabs + library/research/matrix
 *   node scripts/r345/mobile-review.mjs --mode teacher   # teacher exams (empty bank/templates)
 *   node scripts/r345/mobile-review.mjs --mode all
 *
 * Output: /tmp/r345/mobile/<mode>-<slug>-<theme>.png (+ api-log.json)
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MOBILE = path.join(ROOT, "apps", "mobile");
const OUT = "/tmp/r345/mobile";
mkdirSync(OUT, { recursive: true });

const req = createRequire(path.join(MOBILE, "package.json"));
const { chromium } = req("playwright");

const PORT = 8082;
const BASE = `http://localhost:${PORT}`;

const MODE = (process.argv.includes("--mode") ? process.argv[process.argv.indexOf("--mode") + 1] : "all");
const FORCE = process.argv.includes("--force");

const slug = (s) => s.replace(/^\//, "").replace(/\//g, "-").replace(/[^a-zA-Z0-9-]/g, "") || "root";

const USER = (role) => ({
  id: "rev_e2e_user", email: "review@madarek.dev", role,
  firstName: "مراجعة", lastName: "الشاشة", avatarColor: null, avatarInitials: "مر",
  scopeFacultyId: null, themePreference: null, themePreferenceUpdatedAt: null,
  onboardingCompletedAt: "2025-01-01T00:00:00Z", firedMilestones: [],
});

/* the hermetic table: role sessions + empty-list payloads so the
 * illustration empty states render (courses/library/research/matrix/
 * templates/bank — the R345 seats). */
const SCREENS = {
  public: [
    { url: "/", me: null },
    { url: "/auth", me: null },
    { url: "/select-institution", me: "STUDENT", noMembership: true },
    { url: "/achievements", me: null },
    { url: "/community", me: null },
    { url: "/search", me: null },
    { url: "/help", me: null },
  ],
  student: [
    { url: "/student/dashboard", me: "STUDENT" },
    { url: "/student/courses", me: "STUDENT" },
    { url: "/student/library", me: "STUDENT" },
    { url: "/student/research", me: "STUDENT" },
    { url: "/student/matrix", me: "STUDENT" },
    { url: "/student/ai", me: "STUDENT" },
    { url: "/student/alerts", me: "STUDENT" },
    { url: "/student/profile", me: "STUDENT" },
  ],
  teacher: [
    { url: "/teacher/exams", me: "TEACHER" },
    { url: "/teacher/dashboard", me: "TEACHER" },
  ],
};

async function metroUp() {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(BASE, { redirect: "follow" });
      if (r.ok) return true;
    } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

import { execSync } from "node:child_process";
try { execSync('pkill -f "expo start --web" || true'); await new Promise((r) => setTimeout(r, 2000)); } catch { /* none */ }
let metroProc = null;
if (!(await metroUp())) {
  console.log("starting metro web…");
  metroProc = spawn("npx", ["expo", "start", "--web", "--port", String(PORT)], {
    cwd: MOBILE, env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1", BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"], detached: true,
  });
  metroProc.stdout.on("data", (d) => process.stdout.write(d.toString().slice(0, 400)));
  metroProc.stderr.on("data", (d) => process.stderr.write(d.toString().slice(0, 400)));
  const ok = await metroUp();
  if (!ok) { console.error("metro did not come up"); process.exit(1); }
}
console.log("metro up");

/* one warm-up load (the first bundle compile can take minutes) */
{
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 420000 });
  await p.waitForTimeout(15000);
  await b.close();
  console.log("warm-up done");
}

const apiLog = [];
const modes = MODE === "all" ? ["public", "student", "teacher"] : [MODE];
let shot = 0;

const b = await chromium.launch();
for (const mode of modes) {
  for (const screen of SCREENS[mode]) {
    for (const theme of ["light", "dark"]) {
      const file = path.join(OUT, `${mode}-${slug(screen.url)}-${theme}.png`);
      if (existsSync(file) && !FORCE) continue;
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      await ctx.addInitScript(([t, role]) => {
        localStorage.setItem("madarek-mobile-theme", JSON.stringify({ state: { preference: t }, version: 0 }));
        if (role) {
          const u = {
            id: "rev_e2e_user", email: "review@madarek.dev", role,
            firstName: "مراجعة", lastName: "الشاشة", avatarColor: null, avatarInitials: "مر",
            scopeFacultyId: null, themePreference: null, themePreferenceUpdatedAt: null,
            onboardingCompletedAt: "2025-01-01T00:00:00Z", firedMilestones: [],
            memberships: noMembership ? [] : [{ id: "m1", institutionId: "inst_rev", isActive: true }],
            currentInstitution: noMembership ? undefined : { id: "inst_rev", nameAr: "مؤسسة مدارك النموذجية" },
          };
          localStorage.setItem("mdrk-mobile-user", JSON.stringify(u));
          localStorage.setItem("mdrk-mobile-access-token", "review-token");
          localStorage.setItem("mdrk-mobile-active-institution", "inst_rev");
        }
      }, [theme, screen.me, screen.noMembership]);
      const p = await ctx.newPage();
      await p.route("**/api/v1/**", async (route) => {
        const u = new URL(route.request().url());
        const pathName = u.pathname;
        let body;
        if (pathName.endsWith("/auth/me")) {
          body = screen.me ? [200, USER(screen.me)] : [401, { error: "unauthorized" }];
        } else if (pathName.includes("/auth/") || pathName.includes("/logout")) {
          body = [200, {}];
        } else if (pathName.includes("select-institution") || pathName.includes("institutions")) {
          body = [200, []];
        } else {
          body = [200, []];
        }
        apiLog.push({ screen: screen.url, theme, method: route.request().method(), path: pathName, status: body[0] });
        await route.fulfill({ status: body[0], contentType: "application/json", body: JSON.stringify(body[1]) });
      });
      try {
        await p.goto(BASE + screen.url, { waitUntil: "domcontentloaded", timeout: 120000 });
        await p.waitForTimeout(7000);
        await p.screenshot({ path: file });
        shot++;
        console.log("shot", path.basename(file));
      } catch (e) {
        console.error("FAIL", screen.url, theme, String(e).slice(0, 120));
      }
      await ctx.close();
    }
  }
}
await b.close();
writeFileSync(path.join(OUT, "api-log.json"), JSON.stringify(apiLog, null, 1));
if (metroProc) { try { process.kill(-metroProc.pid); } catch { /* already gone */ } }
console.log(`done — ${shot} new shots in ${OUT}`);
