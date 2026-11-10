#!/usr/bin/env node
/**
 * vr-diff.mjs — R345 D · the visual-regression diff (D's safety net).
 *
 * Fresh-captures each route × bp × theme (the vr-capture method: D7a
 * hermetic student transport, dark seed, scroll pass, viewport-top PNG)
 * into /tmp/r345/vrdiff/ and pixel-diffs against the re-based PNG
 * masters under audits/evidence/r344/vr/ (the post-E1 baseline).
 *
 * PASS = ≤ 0.1% differing pixels per cell (sampled, per-channel
 * tolerance 12); legitimate diffs are allowlisted in
 * docs/redesign/r345/ALLOW.md (keys: "<route>|<bp>|<theme>").
 *
 * Usage:
 *   node scripts/r345/vr-diff.mjs [--bps 1920,1440,1024,768,390] [--routes /,/auth] [--theme light,dark]
 */
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.join(__dirname, "..", "..");
const BASE = path.join(WORKTREE, "audits", "evidence", "r344", "vr");
const OUT = "/tmp/r345/vrdiff";
const ALLOW_PATH = path.join(WORKTREE, "docs", "redesign", "r345", "ALLOW.md");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BPS = (arg("bps", "1920,1440,1024,768,390")).split(",");
const THEMES = (arg("themes", "light,dark")).split(",");
const ROUTES_ARG = arg("routes", null);
const vpH = (bp) => (bp === "390" ? 844 : bp === "768" ? 900 : bp === "1024" ? 768 : bp === "1920" ? 1080 : 900);

let allow = new Set();
if (fs.existsSync(ALLOW_PATH)) {
  for (const m of fs.readFileSync(ALLOW_PATH, "utf8").matchAll(/^[-*]\s*`?([a-z0-9_|-]+)`?/gim)) allow.add(m[1]);
}

const { chromium } = createRequire(path.join(WORKTREE, "frontend", "package.json"))("playwright");
const esbuild = createRequire(path.join(WORKTREE, "frontend", "package.json"))("esbuild");

const CRAWL = {
  groups: [
    { name: "public", auth: null, routes: ["/", "/auth", "/register", "/universities", "/features", "/about", "/campus", "/contact", "/help", "/app", "/colleges/leaderboard", "/legal/privacy", "/legal/terms", "/404", "/__design"] },
    { name: "student", auth: "student", routes: ["/student/dashboard", "/student/courses", "/student/catalog", "/student/courses/offr_e2e_algorithms", "/student/lectures/lec_e2e_greedy", "/student/colleges", "/student/achievements", "/student/community", "/student/exams", "/student/training"] },
  ],
};

/* ── the PNG pair-diff (decoder shared with panel-capture) ─────────── */
function decode(buf) {
  let off = 8, w = 0, h = 0, ct = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || (ct !== 6 && ct !== 2)) throw new Error("unsupported png"); }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3;
  const stride = w * bpp;
  const rows = [];
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v = (v + a) & 0xff;
      else if (f === 2) v = (v + b) & 0xff;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff; }
      line[x] = v;
    }
    prev.set(line); rows.push(line);
  }
  return { w, h, bpp, rows };
}

function pairDiffPct(bufA, bufB) {
  const A = decode(bufA), B = decode(bufB);
  if (A.w !== B.w || A.h !== B.h) return 100; // geometry change = a real diff
  let diff = 0, n = 0;
  const step = Math.max(1, Math.floor((A.w * A.h) / 120000));
  let idx = 0;
  for (let y = 0; y < A.h; y++) {
    for (let x = 0; x < A.w; x++) {
      if ((idx++ % step) === 0) {
        const i = x * A.bpp;
        const ra = A.rows[y][i], ga = A.rows[y][i + 1], ba = A.rows[y][i + 2];
        const rb = B.rows[y][i], gb = B.rows[y][i + 1], bb = B.rows[y][i + 2];
        if (Math.abs(ra - rb) > 12 || Math.abs(ga - gb) > 12 || Math.abs(ba - bb) > 12) diff++;
        n++;
      }
    }
  }
  return (100 * diff) / Math.max(n, 1);
}

/* ── hermetic transport (vr-capture verbatim) ──────────────────────── */
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


const slug = (r) => r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "-");
const { installMockApi, seedSession, STUDENT_USER } = await ensureTransport();
const seededUser = { ...STUDENT_USER, memberships: [], currentInstitution: { id: "inst_e2e_zu", name: "جامعة الزاوية", nameEn: "Zawia University", slug: "zu" }, membershipRole: "STUDENT" };
const meJson = JSON.stringify({ data: { id: STUDENT_USER.id, email: STUDENT_USER.email, firstName: STUDENT_USER.firstName, lastName: STUDENT_USER.lastName, role: STUDENT_USER.role, scopeFaculty: null, themePreference: "SYSTEM", onboardingCompletedAt: "2026-03-01T10:00:00.000Z", firedMilestones: [], studentProfile: { universityId: "2023-11045", year: 3, facultyId: "fac_e2e_eng", departmentId: "dep_e2e_cs", faculty: { id: "fac_e2e_eng", name: "كلية الهندسة" }, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" } }, teacherProfile: null, memberships: [], currentInstitution: seededUser.currentInstitution, membershipRole: "STUDENT" } });

const SEAT_JS = `(y) => { const L = window.__mdrkLenis; if (L && typeof L.scrollTo === "function") { L.scrollTo(y, { immediate: true, force: true }); return; } window.scrollTo(0, Math.max(0, Math.round(y))); }`;
const seat = async (page, y) => page.evaluate(new Function(`return (${SEAT_JS})`)(), y);

const report = [];
let fails = 0, pass = 0, skipped = 0;
const browser = await chromium.launch({ headless: true });
try {
  for (const group of CRAWL.groups) {
    const routes = ROUTES_ARG ? group.routes.filter((r) => ROUTES_ARG.split(",").includes(r)) : group.routes;
    for (const route of routes) {
      for (const bp of BPS) {
        for (const theme of THEMES) {
          const id = `${slug(route)}|${bp}|${theme}`;
          const basePng = fs.existsSync(path.join(BASE, slug(route), `${bp}-${theme}.webp`))
            ? path.join(BASE, slug(route), `${bp}-${theme}.webp`)
            : path.join(BASE, slug(route), `${bp}-${theme}.png`);
          if (!fs.existsSync(basePng)) { skipped++; continue; }
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
            await page.goto(`${process.env.VR_URL || "http://localhost:5275"}${route}`, { waitUntil: "networkidle", timeout: 90000 });
            await page.waitForTimeout(1800);
            const height = await page.evaluate(() => document.documentElement.scrollHeight);
            const step = Math.max(400, Math.round(vpH(bp) * 0.8));
            for (let y = 0; y < height; y += step) { await seat(page, y); await page.waitForTimeout(90); }
            await seat(page, 0); await page.waitForTimeout(500);
            fs.mkdirSync(path.join(OUT, slug(route)), { recursive: true });
            const fresh = path.join(OUT, slug(route), `${bp}-${theme}.png`);
            await page.screenshot({ path: fresh });
            await context.close();
            /* like-for-like (the r344 law): the fresh capture rides the
               SAME deterministic webp q92 encoder as the baseline masters
               before the pixel diff — lossy artifacts cancel on both
               sides; the diff measures real visual change only. */
            const { execFileSync } = await import("node:child_process");
            const freshW = fresh.replace(/\.png$/, ".webp");
            execFileSync("python3", ["-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],\"WEBP\",quality=92,method=6)", fresh, freshW], { stdio: "ignore" });
            /* the baseline masters are webp (q92) — decode via a PIL
               temp PNG (deterministic decoder path stays in the diff) */
            let baseBytes = fs.readFileSync(basePng);
            if (basePng.endsWith(".webp")) {
              const tmp = path.join("/tmp/r345/vrdiff", "base-" + crypto.randomUUID().slice(0, 8) + ".png");
              const { execFileSync } = await import("node:child_process");
              execFileSync("python3", ["-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).convert('RGBA').save(sys.argv[2])", basePng, tmp], { stdio: "ignore" });
              baseBytes = fs.readFileSync(tmp);
              fs.rmSync(tmp);
            }
            /* the webp roundtrip applies the like-for-like lossy
               transform; decode the ROUNDTRIPPED png (both sides in
               the same pixel space) */
            const freshRt = fresh + ".rt.png";
            execFileSync("python3", ["-c", "import sys;from PIL import Image;Image.open(sys.argv[1]).convert('RGBA').save(sys.argv[2])", freshW, freshRt], { stdio: "ignore" });
            const pct = pairDiffPct(fs.readFileSync(freshRt), baseBytes);
            const okCell = pct <= 0.1 || allow.has(id);
            report.push({ id, pct: Number(pct.toFixed(4)), pass: okCell, allowed: allow.has(id) });
            okCell ? pass++ : fails++;
            if (!okCell) console.log(`  ✗ ${id}: ${pct.toFixed(3)}% differs`);
          } catch (e) {
            report.push({ id, error: String(e).slice(0, 160) });
            fails++;
            console.log(`  ✗ ${id}: ${String(e).slice(0, 120)}`);
          }
        }
      }
    }
  }
} finally { await browser.close(); }
fs.mkdirSync("/tmp/r345", { recursive: true });
fs.writeFileSync("/tmp/r345/vr-diff-report.json", JSON.stringify({ pass, fails, skipped, cells: report }, null, 1));
console.log(`vr-diff: ${pass} pass · ${fails} FAIL (≤0.1% or allowlisted) · ${skipped} skipped → /tmp/r345/vr-diff-report.json`);
process.exit(fails ? 1 : 0);
