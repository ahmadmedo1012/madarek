#!/usr/bin/env node
/**
 * vr-capture.mjs — R344 visual-regression baseline capture.
 *
 * Baseline FIRST on current main (§3-D law): 5 breakpoints × 2 themes ×
 * ~25 routes, PNG masters under docs/redesign/r344/vr/<route>/<bp>-<theme>
 * (viewport-top after the full scroll pass, + a bottom seat for long pages
 * + a fullPage master for the landing). Resume via vr-manifest.json (done
 * cells are skipped; --force recaptures).
 *
 * Auth: the D7a hermetic transport (verbatim from scripts/css/dead.mjs —
 * installMockApi + seedSession + the institution-bearing /auth/me), so
 * student surfaces render their designed fixture state without a backend;
 * public cells run as guests on the same hermetic table.
 * Themes: madarek-theme zustand-persist seed via seedSession (the recorded
 * r325 pattern — modeUpdatedAt:1 wins the profile tiebreak).
 *
 * Usage:
 *   node scripts/r344/vr-capture.mjs --bps 1920,1440,1024,768,390
 *   node scripts/r344/vr-capture.mjs --bps 390 --themes dark  (resume)
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import crypto from "node:crypto";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
const { chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright");
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const URL_BASE = arg("url", "http://localhost:5173");
const OUT = resolve(WORKTREE, arg("out", "docs/redesign/r344/vr"));
const MANIFEST = join(OUT, "vr-manifest.json");
const FORCE = process.argv.includes("--force");
const BPS_WANTED = (arg("bps", "1920,1440,1024,768,390")).split(",").map((s) => s.trim()).filter(Boolean);
const THEMES_WANTED = (arg("themes", "light,dark")).split(",").map((s) => s.trim()).filter(Boolean);
const LANDING_FULLPAGE = process.argv.includes("--fullpage");

const vpH = (bp) => (bp === 390 ? 844 : bp === 768 ? 900 : bp === 1024 ? 768 : bp === 1920 ? 1080 : 900);
const BPS = ["1920", "1440", "1024", "768", "390"].filter((b) => BPS_WANTED.includes(b));

const CRAWL = {
  groups: [
    {
      name: "public", auth: null,
      routes: ["/", "/auth", "/register", "/universities", "/features", "/about", "/campus", "/contact", "/help", "/app", "/colleges/leaderboard", "/legal/privacy", "/legal/terms", "/404", "/__design"],
    },
    {
      name: "student", auth: "student",
      routes: ["/student/dashboard", "/student/courses", "/student/catalog", "/student/courses/offr_e2e_algorithms", "/student/lectures/lec_e2e_greedy", "/student/colleges", "/student/achievements", "/student/community", "/student/exams", "/student/training"],
    },
  ],
};

/* hermetic student transport (dead.mjs verbatim) */
async function ensureTransport() {
  const srcDir = join(WORKTREE, "frontend", "tests", "e2e", "fixtures");
  const srcs = ["mock-transport.ts", "api-fixtures.ts"].map((f) => join(srcDir, f));
  const hash = crypto.createHash("sha1").update(srcs.map((f) => readFileSync(f)).join("")).digest("hex").slice(0, 12);
  const dir = join(os.tmpdir(), `r343-css-dead-${hash}`);
  const out = join(dir, "transport.mjs");
  if (!existsSync(out)) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "media"), { recursive: true });
    copyFileSync(join(srcDir, "media", "lecture.mp4"), join(dir, "media", "lecture.mp4"));
    esbuild.buildSync({
      stdin: {
        contents: `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(srcs[0])}; export { STUDENT_USER, OFFERING_ID } from ${JSON.stringify(srcs[1])};`,
        resolveDir: srcDir, loader: "ts",
      },
      bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    });
  }
  return import(`${pathToFileURL(out).href}?v=${hash}`);
}

const ok = (data) => ({ data });
const NOW = "2026-03-15T10:00:00.000Z";
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600_000).toISOString();
const GAPS = [
  { conceptId: "cpt_e2e_dp", conceptName: "البرمجة الديناميكية", courseId: "crs_e2e_algorithms", courseName: "مقدمة في الخوارزميات", courseColor: "#7c3aed", level: 0.2, recommendedLectureId: "lec_e2e_greedy", recommendedLectureTitle: "الخوارزميات الجشعة" },
  { conceptId: "cpt_e2e_grd", conceptName: "الخوارزميات الجشعة", courseId: "crs_e2e_algorithms", courseName: "مقدمة في الخوارزميات", courseColor: "#7c3aed", level: 0.55, recommendedLectureId: null, recommendedLectureTitle: null },
  { conceptId: "cpt_e2e_idx", conceptName: "الفهارس في قواعد البيانات", courseId: "crs_e2e_databases", courseName: "قواعد البيانات المتقدمة", courseColor: "#0ea5e9", level: 0.4, recommendedLectureId: "lec_e2e_sql", recommendedLectureTitle: "استعلامات SQL المتقدمة" },
];
const RESULTS = {
  headline: { avgGradePct: 78, highest: { courseName: "مقدمة في الخوارزميات", gradePct: 92 }, lowest: { courseName: "قواعد البيانات المتقدمة", gradePct: 64 }, courseCount: 2 },
  courses: [],
  recentAssignments: [
    { id: "asg_e2e_1", title: "واجب الأسبوع الثالث", type: "HOMEWORK", offeringId: "offr_e2e_algorithms", gradePct: 90, gradedAt: hoursAgo(30) },
    { id: "asg_e2e_2", title: "تقرير المعمل الثاني", type: "PROJECT", offeringId: "offr_e2e_databases", gradePct: 66, gradedAt: hoursAgo(80) },
    { id: "asg_e2e_3", title: "اختبار قصير — الوحدة الثانية", type: "QUIZ", offeringId: "offr_e2e_algorithms", gradePct: 78, gradedAt: hoursAgo(150) },
  ],
};
const CATALOG = {
  data: [
    { id: "crs_e2e_algorithms", code: "CS-201", name: "مقدمة في الخوارزميات", iconEmoji: "🧮", themeColor: "#7c3aed", credits: 3, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" }, institution: { id: "inst_e2e_zu", name: "جامعة الزاوية", slug: "zu" } },
    { id: "crs_e2e_databases", code: "CS-310", name: "قواعد البيانات المتقدمة", iconEmoji: "🗄️", themeColor: "#0ea5e9", credits: 3, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" }, institution: { id: "inst_e2e_zu", name: "جامعة الزاوية", slug: "zu" } },
    { id: "crs_e2e_stats", code: "MA-210", name: "الإحصاء التطبيقي", iconEmoji: "📊", themeColor: "#15803d", credits: 2, department: { id: "dep_e2e_math", name: "قسم الرياضيات" }, institution: { id: "inst_e2e_zu", name: "جامعة الزاوية", slug: "zu" } },
    { id: "crs_e2e_net", code: "CS-304", name: "شبكات الحاسوب", iconEmoji: "🌐", themeColor: "#b45309", credits: 3, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" }, institution: { id: "inst_e2e_zu", name: "جامعة الزاوية", slug: "zu" } },
    { id: "crs_e2e_ai", code: "CS-410", name: "أساسيات الذكاء الاصطناعي", iconEmoji: "🤖", themeColor: "#dc2626", credits: 3, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" }, institution: { id: "inst_e2e_zu", name: "جامعة الزاوية", slug: "zu" } },
    { id: "crs_e2e_se", code: "CS-330", name: "هندسة البرمجيات", iconEmoji: "🧩", themeColor: "#0891b2", credits: 3, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" }, institution: { id: "inst_e2e_zu", name: "جامعة الزاوية", slug: "zu" } },
  ],
  meta: { page: 1, limit: 12, total: 6, totalPages: 1 },
};
const D7A_OVERRIDES = [
  { method: "GET", path: "/me/gaps", json: ok(GAPS) },
  { method: "GET", path: "/me/results", json: ok(RESULTS) },
  { method: "GET", path: "/courses", json: CATALOG },
];

const SEAT_JS = `(y) => {
  const L = window.__mdrkLenis;
  if (L && typeof L.scrollTo === "function") { L.scrollTo(y, { immediate: true, force: true }); return; }
  window.scrollTo(0, Math.max(0, Math.round(y)));
}`;

const { installMockApi, seedSession, STUDENT_USER } = await ensureTransport();
const NEED_STUDENT = CRAWL.groups.some((g) => g.auth === "student");
const seededUser = NEED_STUDENT
  ? { ...STUDENT_USER, memberships: [], currentInstitution: { id: "inst_e2e_zu", name: "جامعة الزاوية", nameEn: "Zawia University", slug: "zu" }, membershipRole: "STUDENT" }
  : null;
const meJson = NEED_STUDENT
  ? JSON.stringify({
      data: {
        id: STUDENT_USER.id, email: STUDENT_USER.email, firstName: STUDENT_USER.firstName, lastName: STUDENT_USER.lastName,
        role: STUDENT_USER.role, avatarColor: STUDENT_USER.avatarColor, avatarInitials: STUDENT_USER.avatarInitials,
        scopeFaculty: null, themePreference: "SYSTEM", themePreferenceUpdatedAt: "2026-03-15T10:00:00.000Z",
        onboardingCompletedAt: "2026-03-01T10:00:00.000Z", firedMilestones: [],
        studentProfile: {
          universityId: "2023-11045", year: 3, facultyId: "fac_e2e_eng", departmentId: "dep_e2e_cs",
          faculty: { id: "fac_e2e_eng", name: "كلية الهندسة" }, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" },
        },
        teacherProfile: null, memberships: [], currentInstitution: seededUser.currentInstitution, membershipRole: "STUDENT",
      },
    })
  : null;

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { capturedAt: new Date().toISOString(), cells: {} };
const slug = (r) => r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "-");
const seat = async (page, y) => page.evaluate(new Function(`return (${SEAT_JS})`)(), y);

let done = 0, skipped = 0;
const browser = await chromium.launch({ headless: true });
try {
  for (const group of CRAWL.groups) {
    for (const route of group.routes) {
      for (const bp of BPS) {
        for (const theme of THEMES_WANTED) {
          const id = `${slug(route)}|${bp}|${theme}`;
          const file = join(OUT, slug(route), `${bp}-${theme}.png`);
          const bottom = join(OUT, slug(route), `${bp}-${theme}-bottom.png`);
          if (!FORCE && manifest.cells[id]?.status === "done" && existsSync(file)) { skipped++; continue; }
          const cell = { status: "error", file: relative(WORKTREE, file) };
          try {
            const context = await browser.newContext({ viewport: { width: Number(bp), height: vpH(bp) } });
            if (group.auth === "student") {
              await installMockApi(context, { sessionUser: STUDENT_USER, overrides: D7A_OVERRIDES });
              await seedSession(context, seededUser, { token: "e2e-token-student", theme: theme === "dark" ? "dark" : undefined });
            } else {
              await installMockApi(context, { sessionUser: null });
              await seedSession(context, null, { theme: theme === "dark" ? "dark" : undefined });
            }
            const page = await context.newPage();
            if (group.auth === "student") {
              await page.route("**/auth/me", async (r) => {
                if (r.request().method().toUpperCase() !== "GET") { await r.fallback(); return; }
                await r.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: meJson });
              });
            }
            await page.goto(`${URL_BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
            await page.waitForTimeout(1800);
            // the full scroll pass (dead.mjs): trigger every reveal/scroll-tied
            // state, then settle at bottom and back to top
            const height = await page.evaluate(() => document.documentElement.scrollHeight);
            const step = Math.max(400, Math.round(vpH(bp) * 0.8));
            for (let y = 0; y < height; y += step) { await seat(page, y); await page.waitForTimeout(90); }
            await seat(page, height); await page.waitForTimeout(400);
            await page.screenshot({ path: bottom });
            await seat(page, 0); await page.waitForTimeout(500);
            mkdirSync(dirname(file), { recursive: true });
            await page.screenshot({ path: file });
            if (LANDING_FULLPAGE && route === "/") {
              await page.screenshot({ path: join(OUT, slug(route), `${bp}-${theme}-full.png`), fullPage: true });
            }
            await context.close();
            cell.status = "done";
            done++;
          } catch (e) {
            cell.error = String(e).slice(0, 200);
            process.stdout.write(`  ✗ ${id}: ${cell.error}\n`);
          }
          manifest.cells[id] = cell;
        }
      }
      // persist manifest every route
      mkdirSync(OUT, { recursive: true });
      writeFileSync(MANIFEST, JSON.stringify(manifest));
    }
  }
} finally {
  await browser.close();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(manifest));
}
console.log(`vr-capture: ${done} captured, ${skipped} skipped (already done) → ${relative(WORKTREE, OUT)}`);
