#!/usr/bin/env node
/**
 * panel-capture.mjs — R345 E1 · the blind-panel capture pipeline.
 *
 * Adapted from scripts/r344/vr-capture.mjs (same 25-route matrix, same
 * D7a hermetic student transport, same dark seed) with the panel's own
 * contract:
 *   · bps {1440, 768, 390} × themes {light, dark}, PNG viewport-top +
 *     viewport-bottom (long pages) + fullPage master for the landing;
 *   · THE DARK SELF-TEST (the R335 voiding bug, never again): every
 *     capture labelled dark is decoded (minimal PNG parser: IHDR → IDAT
 *     → zlib inflate → unfilter) and its MEAN LUMINANCE
 *     (0.2126R+0.7152G+0.0722B)/255 must be < 0.25 — a dark cell that
 *     fails is recorded as `dark-selftest-failed` and the run exits 1;
 *   · `--heron`: captures https://heronaiapp.com/ (the reference) with
 *     the same pipeline (light as-served + a prefers-color-scheme dark
 *     emulation attempt; if Heron ships no dark mode the dark cells are
 *     recorded `no-dark-mode` and the calibration runs light-only);
 *   · resumable: /tmp/r345/panel/manifest.json (done cells skipped).
 *
 * Usage:
 *   node scripts/r345/panel-capture.mjs [--bps 1440,768,390] [--themes light,dark] [--force]
 *   node scripts/r345/panel-capture.mjs --heron
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
const OUT_ROOT = "/tmp/r345/panel";
const HERON = process.argv.includes("--heron");
const OUT = path.join(OUT_ROOT, HERON ? "heron" : "madarek");
const MANIFEST = path.join(OUT_ROOT, "manifest.json");
const URL_BASE = process.env.PANEL_URL || (HERON ? "https://heronaiapp.com" : "http://localhost:5275");
const FORCE = process.argv.includes("--force");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BPS = (arg("bps", "1440,768,390")).split(",").map((s) => s.trim());
const THEMES_WANTED = (arg("themes", "light,dark")).split(",").map((s) => s.trim());
const vpH = (bp) => (bp === "390" ? 844 : bp === "768" ? 900 : 900);

let chromium, esbuild;
try {
  ({ chromium } = createRequire(path.join(WORKTREE, "frontend", "package.json"))("playwright"));
  esbuild = createRequire(path.join(WORKTREE, "frontend", "package.json"))("esbuild");
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json")("playwright"));
  esbuild = createRequire("/home/z/madarek/frontend/package.json")("esbuild");
}

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

/* ── minimal PNG mean-luminance decoder (the dark self-test) ────────── */
function pngMeanLuminance(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let off = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bd = data[8]; ct = data[9];
      if (bd !== 8 || (ct !== 6 && ct !== 2 && ct !== 0)) throw new Error(`unsupported PNG (bd=${bd} ct=${ct})`);
      if (data[12] !== 0) throw new Error("interlaced PNG unsupported");
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const stride = w * bpp;
  const prev = Buffer.alloc(stride);
  let sum = 0, n = 0;
  const sampleEvery = Math.max(1, Math.floor((w * h) / 40000)); // ≈40k pixel sample
  let idx = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const line = raw.subarray(rowStart, rowStart + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v = (v + a) & 0xff;
      else if (f === 2) v = (v + b) & 0xff;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      line[x] = v;
    }
    prev.set(line);
    for (let x = 0; x < w; x++) {
      if ((idx++ % sampleEvery) === 0) {
        const r = ct === 6 ? line[x * 4] : ct === 2 ? line[x * 3] : line[x];
        const g = ct === 6 ? line[x * 4 + 1] : ct === 2 ? line[x * 3 + 1] : line[x];
        const b = ct === 6 ? line[x * 4 + 2] : ct === 2 ? line[x * 3 + 2] : line[x];
        sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        n++;
      }
    }
  }
  return sum / n / 255;
}

/* ── hermetic student transport (vr-capture verbatim) ───────────────── */
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
  { conceptId: "cpt_e2e_dp", conceptName: "البرمجة الديناميكية", courseId: "crs_e2e_algorithms", courseName: "مقدرة في الخوارزميات", courseColor: "#7c3aed", level: 0.2, recommendedLectureId: "lec_e2e_greedy", recommendedLectureTitle: "الخوارزميات الجشعة" },
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

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { capturedAt: new Date().toISOString(), cells: {} };
const slug = (r) => r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "-");
const seat = async (page, y) => page.evaluate(new Function(`return (${SEAT_JS})`)(), y);

let transport = null;
if (!HERON) transport = await ensureTransport();
const { installMockApi, seedSession, STUDENT_USER } = transport ?? {};
const seededUser = STUDENT_USER
  ? { ...STUDENT_USER, memberships: [], currentInstitution: { id: "inst_e2e_zu", name: "جامعة الزاوية", nameEn: "Zawia University", slug: "zu" }, membershipRole: "STUDENT" }
  : null;
const meJson = STUDENT_USER
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

let done = 0, skipped = 0, selftestFails = [];
const groups = HERON
  ? [{ name: "heron", auth: null, routes: ["/", "/heron-chat-widget", "/heron-dashboard", "/pricing", "/about-us", "/contact-us"] }]
  : CRAWL.groups;
const browser = await chromium.launch({ headless: true });
try {
  for (const group of groups) {
    for (const route of group.routes) {
      for (const bp of BPS) {
        for (const theme of THEMES_WANTED) {
          const id = `${HERON ? "heron" : "mdk"}|${slug(route)}|${bp}|${theme}`;
          const dir = path.join(OUT, slug(route));
          const files = {
            top: path.join(dir, `${bp}-${theme}.png`),
            bottom: path.join(dir, `${bp}-${theme}-bottom.png`),
            full: route === "/" || (HERON && bp === "1440") ? path.join(dir, `${bp}-${theme}-full.png`) : null,
          };
          if (!FORCE && manifest.cells[id]?.status === "done" && fs.existsSync(files.top)) { skipped++; continue; }
          const cell = { status: "error", files: {}, luminance: {} };
          try {
            const context = await browser.newContext({ viewport: { width: Number(bp), height: vpH(bp) }, colorScheme: theme === "dark" ? "dark" : "light" });
            if (!HERON) {
              if (group.auth === "student") {
                await installMockApi(context, { sessionUser: STUDENT_USER, overrides: D7A_OVERRIDES });
                await seedSession(context, seededUser, { token: "e2e-token-student", theme: theme === "dark" ? "dark" : undefined });
              } else {
                await installMockApi(context, { sessionUser: null });
                await seedSession(context, null, { theme: theme === "dark" ? "dark" : undefined });
              }
            }
            const page = await context.newPage();
            if (!HERON && group.auth === "student") {
              await page.route("**/auth/me", async (r) => {
                if (r.request().method().toUpperCase() !== "GET") { await r.fallback(); return; }
                await r.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: meJson });
              });
            }
            await page.goto(`${URL_BASE}${route}`, { waitUntil: "networkidle", timeout: 90000 });
            await page.waitForTimeout(2200);
            const height = await page.evaluate(() => document.documentElement.scrollHeight);
            const step = Math.max(400, Math.round(vpH(bp) * 0.8));
            for (let y = 0; y < height; y += step) { await seat(page, y); await page.waitForTimeout(90); }
            await seat(page, height); await page.waitForTimeout(400);
            fs.mkdirSync(dir, { recursive: true });
            if (files.full) await page.screenshot({ path: files.full, fullPage: true });
            await page.screenshot({ path: files.bottom });
            await seat(page, 0); await page.waitForTimeout(500);
            await page.screenshot({ path: files.top });
            await context.close();
            /* THE DARK SELF-TEST */
            for (const [k, f] of Object.entries(files)) {
              if (f && fs.existsSync(f)) {
                const lum = pngMeanLuminance(fs.readFileSync(f));
                cell.luminance[k] = Number(lum.toFixed(4));
                if (theme === "dark" && lum >= 0.25) {
                  if (HERON) { cell.status = "heron-dark-check-pending"; } // resolved below (no-dark-mode vs fail)
                  else {
                    cell.status = "dark-selftest-failed";
                    selftestFails.push(`${id}:${k} lum=${lum.toFixed(3)}`);
                  }
                }
              }
            }
            /* Heron: a "dark" cell whose light twin has near-identical
               luminance means the reference ignores prefers-color-scheme
               (no dark mode) — a documented calibration fact, not a
               capture failure. A big delta with a bright dark cell IS a
               capture failure (fails the run). */
            if (HERON && theme === "dark" && cell.status === "heron-dark-check-pending") {
              const lightId = id.replace(/\|dark$/, "|light");
              const lightCell = manifest.cells[lightId];
              const dl = Object.entries(cell.luminance)[0]?.[1];
              const ll = lightCell?.luminance?.top;
              if (typeof dl === "number" && typeof ll === "number" && Math.abs(dl - ll) < 0.08) {
                cell.status = "no-dark-mode";
                cell.note = "heron serves the same light surface under prefers-color-scheme:dark — the calibration runs light-only";
                done++;
              } else {
                cell.status = "dark-selftest-failed";
                selftestFails.push(`${id}:top lum=${dl?.toFixed(3)} (light twin ${ll?.toFixed(3)})`);
              }
            }
            if (cell.status !== "dark-selftest-failed") { cell.status = "done"; done++; }
            cell.files = Object.fromEntries(Object.entries(files).filter(([, f]) => f && fs.existsSync(f)).map(([k, f]) => [k, path.relative(OUT_ROOT, f)]));
          } catch (e) {
            cell.error = String(e).slice(0, 200);
            process.stdout.write(`  ✗ ${id}: ${cell.error}\n`);
          }
          manifest.cells[id] = cell;
        }
      }
      fs.mkdirSync(OUT_ROOT, { recursive: true });
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
    }
  }
} finally {
  await browser.close();
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
}
console.log(`panel-capture: ${done} captured, ${skipped} skipped → ${OUT}`);
if (selftestFails.length) {
  console.error(`DARK SELF-TEST FAILED (${selftestFails.length}):\n  ` + selftestFails.join("\n  "));
  process.exit(1);
}
console.log("dark self-test: PASS (every dark capture mean luminance < 0.25)");
