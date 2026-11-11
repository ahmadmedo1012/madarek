#!/usr/bin/env node
/**
 * crawl-all.mjs — R345 · D-0 — the AUTHORITATIVE all-roles CSS crawl.
 *
 * scripts/css/dead.mjs is the instrument, but its AUTH_SEEDS = ["student"]
 * — it refuses every other role because the per-role fixture corpora live
 * inside the conformance harness scripts (pages-{teacher,registrar,owner,
 * quality,student}.mjs), which are not importable (top-level side effects:
 * they launch chromium on import). This tool closes that gap WITHOUT
 * copying ~1,500 lines of fixtures by hand and WITHOUT editing any
 * harness:
 *
 *   · the hermetic transport (mock-transport.ts + api-fixtures.ts,
 *     esbuild-bundled the dead.mjs way) exports every fixture user;
 *   · each harness's seed block — the text between `/* ── the runner …`
 *     and `const browser = await chromium.launch` — is EXTRACTED VERBATIM
 *     from the harness source at runtime, its ensureTransport()
 *     destructure replaced by the shared bundle import, and evaluated as
 *     a generated module per harness. Role seeding is therefore
 *     byte-faithful to its harness (fixtures + overrides + seededUser +
 *     meJson + token), re-harvested automatically when a harness changes
 *     (content-hash filenames);
 *   · each role's crawl = ITS OWN harness overrides FIRST (verbatim
 *     precedence — first-match wins in mock-transport), then the OTHER
 *     roles' shared-surface fixtures appended to fill 501 gaps (e.g. the
 *     teacher inbox rides the student's /student/messages, quality's
 *     /announcements/feed+/competitions ride every role's /community),
 *     then the crawl-all public extras (/colleges/:id +
 *     /colleges/leaderboard — the two public routes NO fixture table
 *     covers; shapes mirror CollegePages.tsx interfaces).
 *
 * Crawl matrix: every role's full route corpus (App.tsx route table, params
 * bound to fixture IDs) + the public corpus × bps {390,1440} × themes
 * {light,dark}. Dark = seedSession's madarek-theme localStorage seed via
 * addInitScript BEFORE navigation (the r344 vr-capture pattern). BEFORE
 * the harvest each cell runs an interaction pass adapted from
 * interact.mjs: dead.mjs's scroll+hover seats, a focus-visible sweep, and
 * a click pass over menu/dialog/drawer/combobox triggers (filtered to
 * non-link, non-form elements so a stray navigation can never rebrand one
 * route's CSS as another's) + Escape to close. Skeleton/splash states are
 * caught by an EARLY sheet-walk (~700ms after domcontentloaded, before
 * networkidle) unioned with the late walk.
 *
 * Routes that fail to render (error screen / empty body / nav crash) are
 * recorded status≠ok and listed in the report — NEVER silently counted
 * dead. mock-transport 501s ("no fixture") are captured per cell.
 *
 * Chunking/resume (the sandbox's 10-minute law): one chromium per chunk
 * (`--crawl --group <g> --bp <b> --theme <t>`), state written to
 * /tmp/r345/crawl/chunks/<g>__<b>__<t>.json after EVERY cell; a re-run
 * skips routes already present; a partial chunk (8.5-min deadline hit)
 * resumes where it stopped. `--merge` folds all chunks into
 * docs/redesign/r345/css-crawl/report.json + report.md + the CONSERVATIVE
 * dead-candidates.json (never-matched selectors whose class/id tokens
 * appear in NO string under frontend/src or frontend/tests and are not
 * producible by template-literal prefixes — when in doubt, EXCLUDED).
 *
 * Usage:
 *   node scripts/r345/crawl-all.mjs --list
 *   node scripts/r345/crawl-all.mjs --crawl --group student --bp 390 --theme light \
 *     --url http://localhost:5273/
 *   node scripts/r345/crawl-all.mjs --merge
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.join(__dirname, "..", "..");
const FRONTEND = path.join(WORKTREE, "frontend");
const STYLES_DIR = path.join(FRONTEND, "src", "styles");
const CHUNKS_DIR = "/tmp/r345/crawl/chunks";
const ROLES_DIR = "/tmp/r345/crawl/roles";
const OUT_DIR = path.resolve(WORKTREE, "docs", "redesign", "r345", "css-crawl");

let chromium;
let esbuild;
try {
  ({ chromium } = createRequire(path.join(FRONTEND, "package.json"))("playwright"));
  esbuild = createRequire(path.join(FRONTEND, "package.json"))("esbuild");
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json")("playwright"));
  esbuild = createRequire("/home/z/madarek/frontend/package.json")("esbuild");
}

/* ── args ─────────────────────────────────────────────────────────── */
const argv = process.argv;
const has = (n) => argv.includes(`--${n}`);
const arg = (n, d) => (argv.indexOf(`--${n}`) > 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);
const URL_BASE = (arg("url", "http://127.0.0.1:5273/") ?? "").replace(/\/$/, "");
const vpH = (bp) => (bp === 390 ? 844 : bp === 768 ? 900 : bp === 1024 ? 768 : 900);

/* ── dev-server lifecycle ─────────────────────────────────────────── */
/* This sandbox kills background children when a Bash invocation ends,
 * so vite must live INSIDE the crawl process. --crawl boots it (unless
 * --no-serve), waits for readiness, crawls, tears it down. */
async function withDevServer(fn) {
  if (has("no-serve")) return await fn();
  const viteBin = ["/home/z/madarek/node_modules/.bin/vite", path.join(FRONTEND, "node_modules", ".bin", "vite")].find((p) => fs.existsSync(p));
  const child = spawn(viteBin ?? "npx", viteBin ? ["--port", "5273", "--strictPort", "--host", "127.0.0.1"] : ["vite", "--port", "5273", "--strictPort", "--host", "127.0.0.1"], { cwd: FRONTEND, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const t0 = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error(`vite exited (${child.exitCode}): ${out.slice(-400)}`);
    try {
      const r = await fetch("http://127.0.0.1:5273/", { signal: AbortSignal.timeout(2000) });
      if (r.ok) break;
    } catch {}
    if (Date.now() - t0 > 60_000) { child.kill("SIGKILL"); throw new Error(`vite not ready in 60s: ${out.slice(-400)}`); }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`vite ready on http://127.0.0.1:5273/ (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  try {
    return await fn();
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => {
      const killer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 3000);
      child.once("exit", () => { clearTimeout(killer); r(); });
    });
  }
}

if (has("help") || has("h")) {
  console.log(fs.readFileSync(path.join(__dirname, "crawl-all.mjs"), "utf8").match(/\/\*\*[\s\S]*?\*\//)?.[0] ?? "");
  process.exit(0);
}

/* ── the crawl matrix ─────────────────────────────────────────────── */
const GROUPS = {
  public: {
    authed: false,
    harnesses: [],
    routes: [
      "/", "/auth", "/auth/register", "/auth/forgot-password", "/auth/reset-password",
      "/colleges", "/colleges/leaderboard", "/colleges/clg_e2e_eng",
      "/capabilities",
      "/legal/privacy", "/legal/terms", "/legal/cookies", "/legal/accessibility",
      "/legal/security", "/legal/data",
      "/about", "/help", "/contact", "/app",
      "/404", "/500", "/403", "/maintenance",
    ],
  },
  student: {
    authed: true,
    harnesses: ["pages-authed", "pages-student"], // D7a ∪ D7d (identical on overlap)
    sessionExpr: "STUDENT_USER",
    token: "e2e-token-student",
    routes: [
      "/student/dashboard", "/student/calendar", "/student/courses", "/student/catalog",
      "/student/schedule", "/student/results", "/student/library", "/student/mooc",
      "/student/jobs", "/student/ai", "/student/gamification", "/student/skills",
      "/student/alerts", "/student/messages", "/student/ar", "/student/social",
      "/student/downloads", "/student/university", "/student/live", "/student/payment",
      "/student/map", "/student/matrix", "/student/research", "/student/profile",
      "/student/webinars", "/student/online-exams", "/student/online-exams/exm_e2e_quiz3",
      "/student/labs", "/student/courses/offr_e2e_algorithms", "/student/lectures/lec_e2e_greedy",
      "/training", "/training/algorithms-thinking", "/training/algorithms-thinking/lesson/les-1",
      "/achievements", "/community", "/competitions", "/competitions/cmp_e2e_q1",
      "/vision", "/vision/ai-predictor", "/settings", "/document/lecture.mp4",
    ],
  },
  teacher: {
    authed: true,
    harnesses: ["pages-teacher"], // D8
    sessionExpr: "TEACHER_USER",
    token: "e2e-token-teacher",
    routes: [
      "/teacher/dashboard", "/teacher/schedule", "/teacher/attendance", "/teacher/grades",
      "/teacher/materials", "/teacher/research", "/teacher/students", "/teacher/performance",
      "/teacher/assignments", "/teacher/exams", "/teacher/exams/tpl_e2e_quiz4",
      "/teacher/messages", "/teacher/ai", "/teacher/library", "/teacher/alerts",
      "/teacher/intelligence", "/teacher/intelligence/offr_e2e_t_algo",
      "/teacher/profile", "/teacher/live", "/teacher/labs", "/teacher/community",
    ],
  },
  admin: {
    authed: true,
    harnesses: ["pages-registrar"], // R342-09
    sessionExpr: "ADMIN_USER",
    token: "e2e-token-teacher", // byte-equal to the registrar harness
    routes: [
      "/admin/dashboard", "/admin/students", "/admin/teachers",
      "/admin/permissions/usr_e2e_teacher", "/admin/sync", "/admin/community",
      "/admin/faculties", "/admin/courses", "/admin/analysis", "/admin/digital",
      "/admin/reports", "/admin/settings", "/admin/alerts",
    ],
  },
  quality: {
    authed: true,
    harnesses: ["pages-quality"], // D10
    sessionExpr: "QUALITY_USER",
    token: "e2e-token-quality",
    routes: [
      "/quality/dashboard", "/quality/courses", "/quality/professors",
      "/quality/engagement", "/quality/reports", "/quality/curriculum",
      "/quality/notifications", "/quality/alerts", "/quality/exam-moderation",
      "/quality/community",
    ],
  },
  owner: {
    authed: true,
    harnesses: ["pages-owner"], // D11
    sessionExpr: "OWNER_USER",
    token: "e2e-token-owner",
    routes: [
      "/owner/dashboard", "/owner/users", "/owner/institutions", "/owner/institutions/zu",
      "/owner/activity", "/owner/content", "/owner/system", "/owner/education",
      "/owner/realtime", "/owner/ai", "/owner/notifications", "/owner/alerts",
      "/owner/governance", "/owner/feedback",
    ],
  },
};
const BPS = [390, 1440];
const THEMES = ["light", "dark"];

/* ── the hermetic transport (dead.mjs's ensureTransport, widened) ── */
async function ensureTransport() {
  const srcDir = path.join(FRONTEND, "tests", "e2e", "fixtures");
  const sources = ["mock-transport.ts", "api-fixtures.ts"].map((f) => path.join(srcDir, f));
  const hash = crypto.createHash("sha1").update(sources.map((f) => fs.readFileSync(f)).join("")).digest("hex").slice(0, 12);
  const dir = path.join(os.tmpdir(), `r345-crawl-all-${hash}`);
  const out = path.join(dir, "transport.mjs");
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, "media"), { recursive: true });
    fs.copyFileSync(path.join(srcDir, "media", "lecture.mp4"), path.join(dir, "media", "lecture.mp4"));
    esbuild.buildSync({
      stdin: {
        contents:
          `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; ` +
          `export { STUDENT_USER, TEACHER_USER, ADMIN_USER, QUALITY_USER, OWNER_USER, OFFERING_ID, ` +
          `TEACHER_ASSIGNMENTS, PENDING_SUBMISSIONS, MODERATION_QUEUE, MODERATION_TEMPLATES } from ${JSON.stringify(sources[1])};`,
        resolveDir: srcDir,
        loader: "ts",
      },
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: out,
      logLevel: "silent",
    });
  }
  return { mod: await import(`${pathToFileURL(out).href}?v=${hash}`), transportPath: out, hash };
}

/* ── verbatim harness-seed extraction ─────────────────────────────── */
/* Each conformance harness carries its seed block between the runner
 * banner and `const browser = …`. We cut that text out, swap its
 * `const { … } = await ensureTransport();` for the shared bundle import,
 * and evaluate it as a generated module — the fixtures stay byte-equal
 * to the harness (they ARE the harness's own text). */
const HARNESS_FILES = {
  "pages-authed": "pages-authed.mjs",
  "pages-student": "pages-student.mjs",
  "pages-teacher": "pages-teacher.mjs",
  "pages-registrar": "pages-registrar.mjs",
  "pages-quality": "pages-quality.mjs",
  "pages-owner": "pages-owner.mjs",
};

function extractHarnessSegment(harnessName) {
  const file = path.join(WORKTREE, "scripts", "conformance", HARNESS_FILES[harnessName]);
  const text = fs.readFileSync(file, "utf8");
  const start = text.indexOf("/* ── the runner");
  const end = text.indexOf("const browser = await chromium.launch");
  if (start < 0 || end < 0 || end <= start) throw new Error(`${harnessName}: seed block markers not found`);
  const seg = text.slice(start, end);
  const destructure = seg.match(/^const\s*\{([^}]*)\}\s*=\s*await\s*ensureTransport\(\);/m);
  if (!destructure) throw new Error(`${harnessName}: ensureTransport() destructure not found`);
  const names = destructure[1].split(",").map((s) => s.trim()).filter(Boolean);
  const body = seg.replace(destructure[0], "");
  return { names, body, sourceHash: crypto.createHash("sha1").update(seg).digest("hex").slice(0, 12) };
}

async function loadHarnessSeed(harnessName, transportPath) {
  const { names, body, sourceHash } = extractHarnessSegment(harnessName);
  fs.mkdirSync(ROLES_DIR, { recursive: true });
  const out = path.join(ROLES_DIR, `${harnessName}-${sourceHash}.mjs`);
  if (!fs.existsSync(out)) {
    const src =
      `import { ${names.join(", ")} } from ${JSON.stringify(pathToFileURL(transportPath).href)};\n` +
      body +
      `\nexport const SEED = {\n` +
      `  sessionUser: undefined, // bound by the group (sessionExpr)\n` +
      `  seededUser: typeof seededUser === "undefined" ? null : seededUser,\n` +
      `  meJson: typeof meJson === "undefined" ? null : meJson,\n` +
      `  overrides,\n` +
      `};\n`;
    fs.writeFileSync(out, src);
  }
  return import(`${pathToFileURL(out).href}?v=${sourceHash}`);
}

/* ── crawl-all public extras (/colleges detail + leaderboard) ─────── */
/* The two public routes NO fixture table covers (dead.mjs counted them
 * notCrawled). Shapes mirror CollegePages.tsx's CollegeDetail /
 * LeaderboardData interfaces; ids match the standard /colleges rows. */
const PUBLIC_EXTRA_OVERRIDES = (() => {
  const ok = (data) => ({ data });
  const NOW = "2026-03-15T10:00:00.000Z";
  const hAgo = (h) => new Date(Date.parse(NOW) - h * 3600_000).toISOString();
  const hAhead = (h) => new Date(Date.parse(NOW) + h * 3600_000).toISOString();
  const user = (id, first, last, color, initials) => ({ id, firstName: first, lastName: last, avatarColor: color, avatarInitials: initials });
  const LEADERBOARD = {
    colleges: [
      { id: "clg_e2e_eng", name: "كلية الهندسة", iconEmoji: null, city: "الزاوية", studentCount: 420, teacherCount: 28, totalXp: 184_300, avgXp: 439, avgGpa: 3.1, publishedPapers: 18, examAttempts: 1240, labSessions: 96, completedEnrollments: 310, ranks: { totalXp: 1, avgGpa: 1, publishedPapers: 1, examAttempts: 1, labSessions: 1, completedEnrollments: 1 } },
      { id: "clg_e2e_sci", name: "كلية العلوم", iconEmoji: null, city: "الزاوية", studentCount: 310, teacherCount: 19, totalXp: 121_500, avgXp: 392, avgGpa: 2.9, publishedPapers: 11, examAttempts: 880, labSessions: 74, completedEnrollments: 205, ranks: { totalXp: 2, avgGpa: 2, publishedPapers: 2, examAttempts: 2, labSessions: 2, completedEnrollments: 2 } },
      { id: "clg_e2e_arts", name: "كلية الآداب", iconEmoji: null, city: "الزاوية", studentCount: 260, teacherCount: 15, totalXp: 74_800, avgXp: 288, avgGpa: 2.6, publishedPapers: 4, examAttempts: 510, labSessions: 22, completedEnrollments: 130, ranks: { totalXp: 3, avgGpa: 3, publishedPapers: 3, examAttempts: 3, labSessions: 3, completedEnrollments: 3 } },
    ],
  };
  const COLLEGE_DETAIL = (id) => ({
    id, name: "كلية الهندسة", nameEn: "Engineering", iconEmoji: null, city: "الزاوية",
    stats: { studentCount: 420, teacherCount: 28, departmentCount: 3, courseCount: 12 },
    departments: [
      { id: "dep_e2e_cs", name: "قسم علوم الحاسوب", studentCount: 180, teacherCount: 12, courseCount: 6 },
      { id: "dep_e2e_ee", name: "قسم الهندسة الكهربائية", studentCount: 140, teacherCount: 9, courseCount: 4 },
      { id: "dep_e2e_ce", name: "قسم الهندسة المدنية", studentCount: 100, teacherCount: 7, courseCount: 2 },
    ],
    leadership: [
      { position: "DEAN", appointedAt: hAgo(24 * 400), user: user("usr_e2e_dean", "أحلام", "اليعقوبي", "#7c3aed", "أي"), department: null, faculty: { id: "fac_e2e_eng", name: "كلية الهندسة" } },
      { position: "DEPARTMENT_HEAD", appointedAt: hAgo(24 * 200), user: user("usr_e2e_teacher", "ليلى", "الفيتوري", "#0e7490", "لف"), department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" }, faculty: { id: "fac_e2e_eng", name: "كلية الهندسة" } },
    ],
    topStudents: [
      { totalXp: 4310, level: 8, year: 3, department: { id: "dep_e2e_cs", name: "قسم علوم الحاسوب" }, user: user("stu_e2e_1", "مروة", "البراني", "#0ea5e9", "مر") },
      { totalXp: 3980, level: 7, year: 4, department: { id: "dep_e2e_ee", name: "قسم الهندسة الكهربائية" }, user: user("stu_e2e_2", "سالم", "قدّور", "#059669", "سق") },
    ],
    announcements: [
      { id: "ann_c1", title: "بدء التسجيل في مسابقة البرمجة السنوية", body: "يفتح التسجيل الأسبوع القادم لطلاب الكلية.", pinned: true, iconEmoji: "🏆", publishedAt: hAgo(6), scope: "FACULTY", author: { firstName: "ليلى", lastName: "الفيتوري" } },
    ],
    upcomingEvents: [
      { id: "evt_c1", title: "ندوة: الذكاء الاصطناعي في التعليم الجامعي", location: "قاعة المؤتمرات", startsAt: hAhead(26), endsAt: hAhead(29), capacity: 220, iconEmoji: "🤖", _count: { rsvps: 148 } },
    ],
    upcomingLive: [
      { id: "lv_c1", title: "مراجعة الاختبار الرابع", topic: "الخوارزميات الجشعة", scheduledAt: hAhead(3), status: "SCHEDULED", teacher: { firstName: "ليلى", lastName: "الفيتوري" }, offering: { course: { name: "مقدمة في الخوارزميات", code: "CS-201" } } },
    ],
    activeCompetitions: [
      { id: "cmp_c1", title: "تحدي الخوارزميات الخريفي", category: "برمجة", prize: "شهادة تقدير", deadline: hAhead(72), iconEmoji: "🧮", themeColor: "#7c3aed", _count: { entries: 23 } },
    ],
  });
  return [
    { method: "GET", path: "/colleges/leaderboard", json: ok(LEADERBOARD) }, // BEFORE :id (same segment count)
    { method: "GET", path: "/colleges/:id", json: ok(COLLEGE_DETAIL("clg_e2e_eng")) },
  ];
})();

/* ── in-page probes (dead.mjs verbatim + extensions) ───────────────── */
const SEAT_JS = `(y) => {
  const L = window.__mdrkLenis;
  if (L && typeof L.scrollTo === "function") { L.scrollTo(y, { immediate: true, force: true }); return; }
  window.scrollTo(0, Math.max(0, Math.round(y)));
}`;

const HOVER_JS = `() => {
  const out = [];
  for (const el of document.querySelectorAll("a, button, [role='button'], summary, input, select, textarea, [tabindex]:not([tabindex='-1'])")) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.pointerEvents === "none" || r.width < 1 || r.height < 1) continue;
    if (r.top < 0 || r.bottom > window.innerHeight) continue;
    out.push({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
    if (out.length >= 12) break;
  }
  return out;
}`;

/* dead.mjs's sheet walk + untestable SELECTORS (not just a count — the
 * merge subtracts them from dead candidacy, per the tool's own law). */
const STYLE_PROBE_JS = `() => {
  const STRIP_EL = /::[a-zA-Z-]+/g;
  const STATES = /:(?:hover|focus|focus-visible|focus-within|active|visited|link|any-link|target|checked|disabled|enabled|read-only|read-write|required|optional|placeholder-shown|autofill|valid|invalid|user-valid|user-invalid|in-range|out-of-range|default|indeterminate|blank|defined|open|modal|closed|fullscreen|picture-in-picture|popover-open|playing|paused|buffering|stalled|seeking|muted|volume-locked|loading|window-inactive)(?![a-zA-Z-])/g;
  const norm = (s) => s.replace(/\\s+/g, " ").trim();
  const splitSels = (s) => {
    const parts = []; let depth = 0, q = null, cur = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { cur += ch; if (ch === "\\\\") i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === "(" || ch === "[") { depth++; cur += ch; continue; }
      if (ch === ")" || ch === "]") { depth--; cur += ch; continue; }
      if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
      cur += ch;
    }
    parts.push(cur);
    return parts.map(norm).filter(Boolean);
  };
  const matches = (sel) => {
    let s = sel.replace(STRIP_EL, "").replace(STATES, "").replace(/\\s+/g, " ").trim();
    if (!s) return null;
    if (s === "*" || s === "html" || s === ":root" || s === "html:root") return true;
    try { return document.querySelector(s) !== null; } catch { return null; }
  };
  const sheets = [];
  const seen = new Set();
  const walkSheet = (sheet) => {
    if (seen.has(sheet)) return; seen.add(sheet);
    const node = sheet.ownerNode;
    const viteId = node && node.getAttribute ? node.getAttribute("data-vite-dev-id") : null;
    const acc = { file: viteId || sheet.href || "(inline)", total: 0, matched: [], untestable: [], print: 0 };
    let rules = null;
    try { rules = sheet.cssRules; } catch { acc.total = -1; }
    const walkRules = (list, mediaChain) => {
      for (const r of list) {
        if (r.styleSheet) { walkSheet(r.styleSheet); continue; }
        const media = r.media ? [...mediaChain, r.media.mediaText] : mediaChain;
        if (r.cssRules && !r.selectorText) { walkRules(r.cssRules, media); continue; }
        if (!r.selectorText) continue;
        const print = media.some((m) => /(^|\\s)print(\\s|$|,|:)/.test(m));
        for (const sel of splitSels(r.selectorText)) {
          acc.total++;
          if (print) { acc.print++; continue; }
          const m = matches(sel);
          if (m === null) acc.untestable.push(sel);
          else if (m) acc.matched.push(sel);
        }
      }
    };
    if (rules) walkRules(rules, []);
    sheets.push(acc);
  };
  for (const s of document.styleSheets) walkSheet(s);
  return sheets;
}`;

/* failure detection: error screens / empty bodies (report.md FAILED list) */
const STATUS_JS = `() => {
  const root = document.getElementById("root");
  const appKids = root ? root.querySelectorAll("*").length : 0;
  const err = document.querySelectorAll(".state-error").length;
  const main = document.querySelector("main");
  const mainKids = main ? main.querySelectorAll("*").length : 0;
  const mainErr = main ? main.querySelectorAll(".state-error").length : 0;
  const text = (document.body.innerText || "").trim();
  return { appKids, err, mainKids, mainErr, textLen: text.length, title: document.title.slice(0, 80) };
}`;

/* interaction pass (interact.mjs-adapted): focus-visible sweep + open
 * menus/dialogs/drawers/comboboxes. Links and form-children are filtered
 * out so a click can never navigate away from the measured route. */
const TRIGGERS_JS = `() => {
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("[aria-haspopup], [aria-expanded='false'], summary, [data-state='closed'], [role='combobox']")) {
    if (el.matches("a[href], [href]")) continue;
    if (el.closest("form")) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.pointerEvents === "none" || r.width < 1 || r.height < 1) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    if (seen.has(el)) continue; seen.add(el);
    out.push({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
    if (out.length >= 8) break;
  }
  return out;
}`;

/* ── chunk plumbing ────────────────────────────────────────────────── */
const chunkPath = (group, bp, theme) => path.join(CHUNKS_DIR, `${group}__${bp}__${theme}.json`);
const loadJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); };

function listChunks() {
  console.log("chunk matrix (group × bp × theme):");
  for (const [g, cfg] of Object.entries(GROUPS)) {
    for (const bp of BPS) for (const theme of THEMES) {
      const p = chunkPath(g, bp, theme);
      const st = loadJson(p);
      const total = cfg.routes.length;
      const have = st ? Object.keys(st.cells ?? {}).length : 0;
      console.log(`  ${g} @${bp} ${theme}: ${st?.done ? "DONE" : `${have}/${total}`} ${st ? "" : "(missing)"}`);
    }
  }
}

/* ── the role composer (own harness first, cross-role extras after) ── */
async function composeRoles(transport) {
  const seeds = {};
  for (const [name] of Object.entries(HARNESS_FILES)) seeds[name] = (await loadHarnessSeed(name, transport.transportPath)).SEED;
  const groupSeeds = {
    student: [seeds["pages-authed"], seeds["pages-student"]],
    teacher: [seeds["pages-teacher"]],
    admin: [seeds["pages-registrar"]],
    quality: [seeds["pages-quality"]],
    owner: [seeds["pages-owner"]],
  };
  const roles = {};
  for (const [g, cfg] of Object.entries(GROUPS)) {
    if (!cfg.authed) {
      roles[g] = { authed: false, overrides: PUBLIC_EXTRA_OVERRIDES };
      continue;
    }
    const own = groupSeeds[g];
    const ownKeys = new Set(own.flatMap((s) => (s.overrides ?? []).map((o) => `${o.method} ${o.path} ${o.query ? JSON.stringify(o.query) : ""}`)));
    const extras = [];
    for (const [g2, cfg2] of Object.entries(GROUPS)) {
      if (g2 === g || !cfg2.authed) continue;
      for (const s of groupSeeds[g2]) {
        for (const o of s.overrides ?? []) {
          const k = `${o.method} ${o.path} ${o.query ? JSON.stringify(o.query) : ""}`;
          if (ownKeys.has(k) || extras.some((e) => `${e.method} ${e.path} ${e.query ? JSON.stringify(e.query) : ""}` === k)) continue;
          extras.push(o);
        }
      }
    }
    roles[g] = {
      authed: true,
      sessionExpr: cfg.sessionExpr, // bound below to the fixture-user export
      token: cfg.token,
      seeds: own,
      meJson: own.map((s) => s.meJson).find((m) => m != null) ?? null,
      overrides: [...own.flatMap((s) => s.overrides ?? []), ...extras, ...PUBLIC_EXTRA_OVERRIDES],
    };
  }
  /* sessionUser comes from each group's own harness module scope via the
   * transport's fixture-user exports (the harness's exact sessionUser). */
  const usersByExpr = {
    STUDENT_USER: transport.mod.STUDENT_USER,
    TEACHER_USER: transport.mod.TEACHER_USER,
    ADMIN_USER: transport.mod.ADMIN_USER,
    QUALITY_USER: transport.mod.QUALITY_USER,
    OWNER_USER: transport.mod.OWNER_USER,
  };
  for (const cfg of Object.values(roles)) if (cfg.authed) cfg.sessionUser = usersByExpr[cfg.sessionExpr];
  return roles;
}

/* ── the crawl cell (dead.mjs's crawlCell + interaction pass) ─────── */
async function crawlCell(browser, groupName, route, bp, theme, role, installMockApi, seedSession) {
  const context = await browser.newContext({ viewport: { width: bp, height: vpH(bp) } });
  const cell = { status: "ok", sheets: 0, matchedSelectors: 0, matchedByFile: {}, untestable: [], mockMisses: [], stateErrors: 0, coverage: 0, error: null };
  const missSet = new Set();
  try {
    if (role.authed) {
      await installMockApi(context, { sessionUser: role.sessionUser, overrides: role.overrides });
      await seedSession(context, role.seeds[0]?.seededUser ?? role.sessionUser, { token: role.token, theme: theme === "dark" ? "dark" : undefined });
    } else {
      await installMockApi(context, { sessionUser: null, overrides: role.overrides });
      await seedSession(context, null, { theme: theme === "dark" ? "dark" : undefined });
    }
    const page = await context.newPage();
    page.on("console", (m) => {
      const t = m.text();
      if (t.includes("[mock-transport] no fixture")) { const mm = t.match(/no fixture for (\S+)/); if (mm) missSet.add(mm[1]); }
    });
    if (role.authed && role.meJson) {
      await page.route("**/auth/me", async (r) => {
        if (r.request().method().toUpperCase() !== "GET") { await r.fallback(); return; }
        await r.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: role.meJson });
      });
    }
    await page.coverage.startCSSCoverage({ resetOnNavigation: false }).catch(() => {});
    await page.goto(`${URL_BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });

    /* EARLY harvest (~700ms): skeletons, splash, pre-hydration states */
    await page.waitForTimeout(700);
    await harvest(page, cell);
    await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1600); // the suite's settle

    /* scroll pass (dead.mjs) + hover seats */
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.max(400, Math.round(vpH(bp) * 0.8));
    let seatIdx = 0;
    for (let y = 0; y < height; y += step, seatIdx++) {
      await page.evaluate(new Function(`return (${SEAT_JS})`)(), y);
      await page.waitForTimeout(90);
      if (seatIdx % 3 === 1) {
        const seats = await page.evaluate(new Function(`return (${HOVER_JS})`)());
        for (const s of seats) { await page.mouse.move(s.x, s.y); await page.waitForTimeout(60); }
      }
    }
    await page.evaluate(new Function(`return (${SEAT_JS})`)(), height);
    await page.waitForTimeout(400);

    /* interaction pass (interact.mjs-adapted) */
    await page.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll("input, select, textarea")) {
        if (n++ >= 12) break;
        try { el.focus({ preventScroll: true }); el.blur(); } catch {}
      }
      n = 0;
      for (const el of document.querySelectorAll("a[href], button, [role='button'], summary")) {
        if (n++ >= 10) break;
        try { el.focus({ focusVisible: true, preventScroll: true }); } catch {}
      }
    });
    await page.waitForTimeout(250);
    const triggers = await page.evaluate(new Function(`return (${TRIGGERS_JS})`)());
    for (const t of triggers) {
      try { await page.mouse.click(t.x, t.y); } catch {}
      await page.waitForTimeout(450);
    }
    try { await page.keyboard.press("Escape"); } catch {}
    await page.waitForTimeout(300);

    /* failure detection BEFORE the late harvest */
    const st = await page.evaluate(new Function(`return (${STATUS_JS})`)());
    cell.stateErrors = st.err;
    if (st.appKids === 0) cell.status = "empty";
    else if (st.err > 0 && (st.mainKids === 0 || (st.mainErr > 0 && st.mainKids < 40))) cell.status = "errorState";
    else if (st.textLen < 30) cell.status = "empty";

    /* LATE harvest on the settled, interacted DOM */
    await harvest(page, cell);
    const cov = await page.coverage.stopCSSCoverage().catch(() => []);
    cell.coverage = cov.length;
    await page.close();
  } catch (e) {
    cell.status = "crashed";
    cell.error = String(e && e.message ? e.message : e).slice(0, 300);
  } finally {
    await context.close().catch(() => {});
  }
  cell.mockMisses = [...missSet].slice(0, 40);
  return cell;
}

async function harvest(page, cell) {
  const sheets = await page.evaluate(new Function(`return (${STYLE_PROBE_JS})`)()).catch(() => []);
  cell.sheets = Math.max(cell.sheets, sheets.length);
  for (const sh of sheets) {
    const rel = sh.file.startsWith(WORKTREE + path.sep) ? path.relative(WORKTREE, sh.file).split(path.sep).join("/") : null;
    if (!rel) continue;
    if (!cell.matchedByFile[rel]) cell.matchedByFile[rel] = [];
    for (const sel of sh.matched) if (!cell.matchedByFile[rel].includes(sel)) cell.matchedByFile[rel].push(sel);
    for (const sel of sh.untestable) if (!cell.untestable.includes(sel)) cell.untestable.push(sel);
    cell.matchedSelectors += sh.matched.length;
  }
}

/* ── chunk runner ──────────────────────────────────────────────────── */
async function runChunk(groupName, bp, theme) {
  const cfg = GROUPS[groupName];
  if (!cfg) { console.error(`unknown group ${groupName}`); process.exit(2); }
  const only = arg("only", null); // smoke-test filter (chunk still resumable)
  const file = only ? path.join(CHUNKS_DIR, `${groupName}__${bp}__${theme}__only.json`) : chunkPath(groupName, bp, theme);
  const state = loadJson(file) ?? { group: groupName, bp, theme, startedAt: new Date().toISOString(), cells: {}, done: false };
  state.cells ??= {};
  const routes = only ? [only] : cfg.routes;
  const missing = routes.filter((r) => !(r in state.cells));
  if (state.done && !missing.length) { console.log(`SKIP ${groupName} @${bp} ${theme} — done (${routes.length} cells)`); return; }
  console.log(`crawl ${groupName} @${bp} ${theme}: ${missing.length}/${routes.length} cells to go → ${URL_BASE}`);
  const transport = await ensureTransport();
  const { installMockApi, seedSession } = transport.mod;
  const roles = await composeRoles(transport);
  const role = roles[groupName];
  const browser = await chromium.launch({ headless: true });
  const deadline = Date.now() + 8.5 * 60_000; // the sandbox's 10-min law, with margin
  try {
    for (const route of missing) {
      if (Date.now() > deadline) { console.log(`  DEADLINE — partial chunk written (${Object.keys(state.cells).length}/${cfg.routes.length}), re-run to resume`); break; }
      const cell = await crawlCell(browser, groupName, route, bp, theme, role, installMockApi, seedSession);
      state.cells[route] = cell;
      state.updatedAt = new Date().toISOString();
      writeJson(file, state);
      console.log(`  ${groupName} ${route} @${bp} ${theme}: ${cell.status} · ${cell.sheets} sheets · ${cell.matchedSelectors} matched${cell.mockMisses.length ? ` · 501×${cell.mockMisses.length}` : ""}${cell.error ? ` — ${cell.error.slice(0, 90)}` : ""}`);
    }
  } finally {
    await browser.close();
  }
  const still = routes.filter((r) => !(r in state.cells));
  if (!still.length) { state.done = true; state.updatedAt = new Date().toISOString(); writeJson(file, state); console.log(`DONE ${groupName} @${bp} ${theme} (${routes.length} cells)`); }
}

/* ── the static parse (dead.mjs verbatim) ─────────────────────────── */
function splitTopLevelCommas(s) {
  const parts = [];
  let depth = 0, q = null, cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { cur += ch; if (ch === "\\") { cur += s[++i] ?? ""; } else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[") { depth++; cur += ch; continue; }
    if (ch === ")" || ch === "]") { depth--; cur += ch; continue; }
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function listCssFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listCssFiles(p));
    else if (ent.name.endsWith(".css")) out.push(p);
  }
  return out;
}

function parseCssFile(absPath, relPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const nl = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") nl.push(i);
  const lineAt = (pos) => {
    let lo = 0, hi = nl.length - 1, ans = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (nl[mid] < pos) { ans = mid + 1; lo = mid + 1; } else hi = mid - 1; }
    return ans + 1;
  };
  const rules = [];
  const important = [];
  const findBlockEnd = (start, end) => {
    let depth = 1, q = null;
    for (let i = start + 1; i < end; i++) {
      const ch = text[i];
      if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return i; }
    }
    return end;
  };
  const parseStyleRule = (start, braceIdx, end, ctx) => {
    const prelude = text.slice(start, braceIdx).replace(/\s+/g, " ").trim();
    const sels = splitTopLevelCommas(prelude);
    const close = findBlockEnd(braceIdx, end);
    const rule = {
      file: relPath, line: lineAt(start),
      sels: ctx.parent ? sels.map((s) => `${ctx.parent.join(", ")} ${s.replace(/^&/, "").trim()}`.replace(/\s+/g, " ").trim()) : sels,
      decls: [], media: ctx.media, layers: ctx.layers,
      print: ctx.media.some((m) => /(^|\s)print(\s|$|,|:)/.test(m)),
    };
    parseDecls(braceIdx + 1, close, rule, ctx);
    rules.push(rule);
    return close;
  };
  const parseDecls = (start, end, rule, ctx) => {
    let i = start;
    while (i < end) {
      let j = i, q = null, pd = 0;
      while (j < end) {
        const ch = text[j];
        if (q) { if (ch === "\\") j++; else if (ch === q) q = null; }
        else if (ch === '"' || ch === "'") q = ch;
        else if (ch === "(" || ch === "[") pd++;
        else if (ch === ")" || ch === "]") pd--;
        else if (pd === 0 && (ch === ";" || ch === "{")) break;
        j++;
      }
      const stmt = text.slice(i, j).trim();
      if (text[j] === "{") {
        const close = findBlockEnd(j, end);
        if (stmt.startsWith("@")) scan(i, close + 1, { ...ctx, parent: rule.sels });
        else parseStyleRule(i, j, end, { ...ctx, parent: rule.sels });
        i = close + 1;
        continue;
      }
      const c = stmt.indexOf(":");
      if (c > 0) {
        const prop = stmt.slice(0, c).trim().toLowerCase();
        const value = stmt.slice(c + 1).trim().replace(/;+$/, "").replace(/\s+/g, " ").trim();
        if (prop && value) {
          const imp = /!\s*important\s*$/i.test(value);
          const clean = imp ? value.replace(/!\s*important\s*$/i, "").trim() : value;
          rule.decls.push({ prop, value: clean, important: imp, line: lineAt(i) });
          if (imp) important.push({ file: relPath, line: lineAt(i), selector: rule.sels.join(", "), prop });
        }
      }
      i = j + 1;
    }
  };
  function scan(start, end, ctx) {
    let i = start;
    while (i < end) {
      while (i < end && /\s/.test(text[i])) i++;
      if (i >= end) break;
      let j = i, q = null, pd = 0;
      while (j < end) {
        const ch = text[j];
        if (q) { if (ch === "\\") j++; else if (ch === q) q = null; }
        else if (ch === '"' || ch === "'") q = ch;
        else if (ch === "(" || ch === "[") pd++;
        else if (ch === ")" || ch === "]") pd--;
        else if (pd === 0 && (ch === "{" || ch === ";")) break;
        j++;
      }
      if (j >= end) break;
      const prelude = text.slice(i, j).replace(/\s+/g, " ").trim();
      if (text[j] === ";") { i = j + 1; continue; }
      if (prelude.startsWith("@")) {
        const at = prelude.slice(1).split(/[\s({]/)[0].toLowerCase();
        const close = findBlockEnd(j, end);
        if (at === "media") scan(j + 1, close, { ...ctx, media: [...ctx.media, prelude.replace(/^@media\s*/i, "").trim()] });
        else if (at === "layer" || at === "supports" || at === "container" || at === "scope")
          scan(j + 1, close, at === "layer" ? { ...ctx, layers: [...ctx.layers, prelude.replace(/^@layer\s*/i, "").trim()] } : ctx);
        i = close + 1;
      } else if (prelude) {
        i = parseStyleRule(i, j, end, ctx) + 1;
      } else i = j + 1;
    }
  }
  scan(0, text.length, { media: [], layers: [], parent: null });
  return { relPath, rules, important };
}

/* ── the conservative dead-candidate scan ─────────────────────────── */
function buildCorpus() {
  const exts = new Set([".ts", ".tsx", ".html", ".md", ".json"]);
  const parts = [];
  const walk = (dir) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (exts.has(path.extname(ent.name))) { try { parts.push(fs.readFileSync(p, "utf8")); } catch {} }
    }
  };
  walk(path.join(FRONTEND, "src"));
  walk(path.join(FRONTEND, "tests"));
  for (const f of ["index.html", "public/index.html"]) { try { parts.push(fs.readFileSync(path.join(FRONTEND, f), "utf8")); } catch {} }
  const corpus = parts.join("\n");
  const templatePrefixes = [];
  for (const m of corpus.matchAll(/`([^`\n$]*)\$\{/g)) {
    const frag = m[1];
    if (frag && frag.length >= 2 && !templatePrefixes.includes(frag)) templatePrefixes.push(frag);
  }
  return { corpus, templatePrefixes };
}

function deadCandidateCheck(selector, corpus, templatePrefixes) {
  const tokens = [...selector.matchAll(/[.#]([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
  if (!tokens.length) return { candidate: false, reason: "noNameToken" };
  for (const t of tokens) {
    if (corpus.includes(t)) return { candidate: false, reason: "referenced" };
    for (const p of templatePrefixes) {
      if (t.startsWith(p)) return { candidate: false, reason: "templatePrefix" };
      if (p.length >= 3 && t.includes(p)) return { candidate: false, reason: "templateFragment" };
    }
    const dash = t.lastIndexOf("-");
    if (dash > 0 && corpus.includes(t.slice(0, dash + 1))) return { candidate: false, reason: "concatPrefix" };
  }
  return { candidate: true, reason: null };
}

/* ── merge → reports ───────────────────────────────────────────────── */
async function merge() {
  const t0 = Date.now();
  const usedByTheme = { light: new Set(), dark: new Set() };
  const seenFiles = new Map(); // rel → first cell that loaded it
  const sheetOrder = [];
  const untestableAll = new Set();
  const cellsDetail = [];
  const crawlErrors = [];
  const failed = new Map(); // "group route" → { statuses, mockMisses, errors }
  let coverageEntries = 0;
  let cellsTotal = 0;
  const startedAt = [];
  const perGroupCells = {};
  for (const [g, cfg] of Object.entries(GROUPS)) {
    perGroupCells[g] = { routes: cfg.routes.length, cells: 0, ok: 0, failed: 0, missing: 0 };
    for (const bp of BPS) {
      for (const theme of THEMES) {
        const st = loadJson(chunkPath(g, bp, theme));
        if (!st) { perGroupCells[g].missing += cfg.routes.length; continue; }
        startedAt.push(st.startedAt);
        for (const [route, cell] of Object.entries(st.cells ?? {})) {
          cellsTotal++;
          perGroupCells[g].cells++;
          if (cell.status === "ok") perGroupCells[g].ok++;
          else {
            perGroupCells[g].failed++;
            const key = `${g} ${route}`;
            if (!failed.has(key)) failed.set(key, { group: g, route, statuses: [], mockMisses: [], errors: [] });
            const f = failed.get(key);
            f.statuses.push(`${bp}:${theme}=${cell.status}`);
            if (cell.error) f.errors.push(cell.error.slice(0, 120));
            for (const m of cell.mockMisses ?? []) if (!f.mockMisses.includes(m)) f.mockMisses.push(m);
          }
          if (cell.error) crawlErrors.push({ cell: `${g} ${route} @${bp} ${theme}`, error: cell.error });
          coverageEntries += cell.coverage ?? 0;
          cellsDetail.push({ group: g, route, bp, theme, status: cell.status, sheets: cell.sheets, matched: cell.matchedSelectors, stateErrors: cell.stateErrors ?? 0, mockMisses: (cell.mockMisses ?? []).length });
          for (const sel of cell.untestable ?? []) untestableAll.add(sel);
          for (const [rel, sels] of Object.entries(cell.matchedByFile ?? {})) {
            if (!seenFiles.has(rel)) { seenFiles.set(rel, `${g} ${route} @${bp} ${theme}`); sheetOrder.push(rel); }
            for (const sel of sels) usedByTheme[theme].add(sel);
          }
        }
      }
    }
  }
  const usedAll = new Set([...usedByTheme.light, ...usedByTheme.dark]);

  /* static parse */
  const files = listCssFiles(STYLES_DIR);
  const parsed = files.map((f) => parseCssFile(f, path.relative(WORKTREE, f).split(path.sep).join("/")));
  const allSels = [];
  for (const { relPath, rules } of parsed) {
    for (const r of rules) for (const s of r.sels) allSels.push({ file: relPath, line: r.line, selector: s, printOnly: r.print });
  }
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const neverMatched = [];
  const notCrawled = [];
  const matchedSels = [];
  const untestableStatic = [];
  for (const s of allSels) {
    if (s.printOnly) continue;
    if (!seenFiles.has(s.file)) { notCrawled.push(s); continue; }
    if (untestableAll.has(norm(s.selector))) { untestableStatic.push(s); continue; }
    if (usedAll.has(norm(s.selector))) matchedSels.push(s);
    else neverMatched.push(s);
  }
  const printOnly = allSels.filter((s) => s.printOnly);

  /* duplicates + shadowing (dead.mjs) */
  const alphaIdx = new Map(files.map((f, i) => [path.relative(WORKTREE, f).split(path.sep).join("/"), i]));
  const orderIdx = new Map(sheetOrder.map((f, i) => [f, i]));
  const cascadeKey = (rel) => orderIdx.get(rel) ?? 100000 + (alphaIdx.get(rel) ?? 99999);
  const parsedOrdered = [...parsed].sort((a, b) => cascadeKey(a.relPath) - cascadeKey(b.relPath));
  const declLog = [];
  for (const { relPath, rules } of parsedOrdered) {
    for (const r of rules) for (const d of r.decls) declLog.push({ file: relPath, line: d.line, sel: r.sels.join(", "), prop: d.prop, value: d.value, important: d.important, seq: declLog.length });
  }
  const byExact = new Map();
  const byProp = new Map();
  for (const d of declLog) {
    const k1 = `${norm(d.sel)}\u0000${d.prop}\u0000${d.value}`;
    if (!byExact.has(k1)) byExact.set(k1, []);
    byExact.get(k1).push(d);
    const k2 = `${norm(d.sel)}\u0000${d.prop}`;
    if (!byProp.has(k2)) byProp.set(k2, []);
    byProp.get(k2).push(d);
  }
  const dupExact = [];
  for (const [k, occ] of byExact) if (occ.length > 1) dupExact.push({ selector: k.split("\u0000")[0], prop: k.split("\u0000")[1], value: k.split("\u0000")[2], occurrences: occ.map((d) => ({ file: d.file, line: d.line, important: d.important })) });
  dupExact.sort((a, b) => b.occurrences.length - a.occurrences.length);
  const redundantDecls = dupExact.reduce((a, g) => a + g.occurrences.length - 1, 0);
  const shadowed = [];
  for (const [k, occ] of byProp) {
    const values = [...new Set(occ.map((d) => d.value))];
    if (values.length < 2) continue;
    const winner = occ[occ.length - 1];
    for (const d of occ) if (d !== winner && d.value !== winner.value) shadowed.push({ file: d.file, line: d.line, sel: d.sel, prop: d.prop, value: d.value, shadowedBy: { file: winner.file, line: winner.line, value: winner.value, important: winner.important } });
  }
  shadowed.sort((a, b) => (a.file + a.line).localeCompare(b.file + b.line));
  const importantAll = parsed.flatMap((p) => p.important).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  /* per-file rollup */
  const perFile = {};
  for (const p of parsed) perFile[p.relPath] = { selectors: 0, matched: 0, dead: 0, printOnly: 0, notCrawled: 0, untestable: 0, important: p.important.length, seen: seenFiles.has(p.relPath) };
  for (const s of matchedSels) perFile[s.file].matched++;
  for (const s of neverMatched) perFile[s.file].dead++;
  for (const s of notCrawled) perFile[s.file].notCrawled++;
  for (const s of untestableStatic) perFile[s.file].untestable++;
  for (const s of printOnly) perFile[s.file].printOnly++;
  for (const f of Object.values(perFile)) f.selectors = f.matched + f.dead + f.printOnly + f.notCrawled + f.untestable;

  /* dead candidates (conservative) */
  const { corpus, templatePrefixes } = buildCorpus();
  const deadCandidates = [];
  const excludedByReason = {};
  for (const s of neverMatched) {
    const r = deadCandidateCheck(s.selector, corpus, templatePrefixes);
    if (r.candidate) deadCandidates.push({ file: s.file, line: s.line, selector: s.selector });
    else excludedByReason[r.reason] = (excludedByReason[r.reason] ?? 0) + 1;
  }
  const candByFile = new Map();
  for (const c of deadCandidates) {
    if (!candByFile.has(c.file)) candByFile.set(c.file, []);
    candByFile.get(c.file).push({ line: c.line, selector: c.selector });
  }
  const deadCandidateFiles = [...candByFile.entries()].map(([file, sels]) => ({ file, count: sels.length, selectors: sels.sort((a, b) => a.line - b.line) })).sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

  /* report.json */
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const matrixCells = Object.values(GROUPS).reduce((a, g) => a + g.routes.length, 0) * BPS.length * THEMES.length;
  const report = {
    generatedAt: new Date().toISOString(),
    tool: "scripts/r345/crawl-all.mjs",
    url: URL_BASE,
    mode: "vite-dev (injected <style> sheets; data-vite-dev-id attribution; sheet walk + coverage supplement — dead.mjs method)",
    crawl: {
      groups: Object.fromEntries(Object.entries(GROUPS).map(([g, c]) => [g, { authed: c.authed, routes: c.routes.length }])),
      bps: BPS, themes: THEMES,
      matrixCells, cellsCompleted: cellsTotal,
      perGroupCells,
      wallClockStarted: startedAt.sort()[0] ?? null,
      cellsDetail, cellErrors: crawlErrors,
      failedRoutes: [...failed.values()].map((f) => ({ ...f, statuses: f.statuses.join(" ") })),
      filesSeen: [...seenFiles.keys()].sort(),
      filesSeenCount: seenFiles.size,
      sheetOrder,
      coverageEntries,
      untestableSelectors: [...untestableAll].sort(),
    },
    totals: {
      files: files.length,
      selectors: allSels.length,
      matched: matchedSels.length,
      neverMatched: neverMatched.length,
      printOnly: printOnly.length,
      notCrawled: notCrawled.length,
      untestable: untestableStatic.length,
      usedByTheme: { light: usedByTheme.light.size, dark: usedByTheme.dark.size, union: usedAll.size },
      duplicateGroups: dupExact.length,
      redundantDeclarations: redundantDecls,
      shadowedDeclarations: shadowed.length,
      important: importantAll.length,
      deadCandidates: deadCandidates.length,
      deadCandidateExcludedBy: excludedByReason,
    },
    perFile,
    neverMatched: neverMatched.map((s) => ({ file: s.file, line: s.line, selector: s.selector })).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
    notCrawledFiles: [...new Set(notCrawled.map((s) => s.file))].sort(),
    duplicates: { exact: dupExact.slice(0, 400), exactTotal: dupExact.length, shadowed: shadowed.slice(0, 400), shadowedTotal: shadowed.length },
    important: importantAll,
  };
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report));
  fs.writeFileSync(path.join(OUT_DIR, "dead-candidates.json"), JSON.stringify({
    generatedAt: report.generatedAt,
    rule: "never-matched ∧ file loaded ∧ every .class/#id token absent from all .ts/.tsx/.html/.md/.json under frontend/src + frontend/tests + index.html ∧ not producible by a template-literal prefix (`…${) or a dash-concatenation prefix present in the corpus — when in doubt, EXCLUDED",
    totals: { neverMatched: neverMatched.length, candidates: deadCandidates.length, excludedByReason },
    files: deadCandidateFiles,
  }, null, 1));

  /* report.md (≤80 lines) */
  const deadFiles = Object.entries(perFile).filter(([, v]) => v.dead > 0).sort((a, b) => b[1].dead - a[1].dead || a[0].localeCompare(b[0]));
  const t = report.totals;
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  const L = [];
  L.push(`# R345 · D-0 — all-roles CSS crawl census`);
  L.push(``);
  L.push(`generated ${report.generatedAt} · tool \`scripts/r345/crawl-all.mjs\` (dead.mjs instrument, all-role seeding) · dev ${URL_BASE} · vite-dev`);
  L.push(``);
  L.push(`## Crawl matrix`);
  L.push(`- ${Object.entries(GROUPS).map(([g, c]) => `${c.routes.length} ${g}`).join(" + ")} routes × bps {${BPS.join("/")}} × themes {${THEMES.join("/")}} = ${matrixCells} cells — ${cellsTotal} completed (${pct(cellsTotal, matrixCells)}%).`);
  L.push(`- Seeding: each role's OWN harness transport verbatim (D7a∪D7d student, D8 teacher, R342-09 admin, D10 quality, D11 owner; extracted from the harness sources) + cross-role shared-surface fixtures appended (own-first precedence) + crawl-all /colleges detail/leaderboard extras. Public cells run as guests on the same hermetic table.`);
  L.push(`- Every cell: early sheet-walk (skeletons) + dead.mjs scroll/hover pass + interact.mjs-adapted focus/click/Escape pass + late sheet-walk; dark = madarek-theme localStorage seed pre-navigation.`);
  L.push(`- Route coverage per group: ${Object.entries(perGroupCells).map(([g, c]) => `${g} ${c.ok}/${c.routes * BPS.length * THEMES.length} ok${c.failed ? ` (${c.failed} failed)` : ""}${c.missing ? ` (${c.missing} missing)` : ""}`).join(" · ")}.`);
  L.push(``);
  L.push(`## FAILED routes (error screen / empty / crash — NEVER counted dead) — ${failed.size}`);
  for (const f of failed.values()) L.push(`- ${f.group} ${f.route} — ${f.statuses.join(" ")}${f.mockMisses.length ? ` · 501: ${f.mockMisses.slice(0, 4).join(", ")}` : ""}${f.errors.length ? ` · ${f.errors[0]}` : ""}`);
  if (!failed.size) L.push(`- (none)`);
  L.push(``);
  L.push(`## Totals (frontend/src/styles — ${files.length} files)`);
  L.push(`| selectors | matched | never-matched | print-only | not-crawled | untestable | dup groups (redundant decls) | shadowed | !important |`);
  L.push(`|---|---|---|---|---|---|---|---|---|`);
  L.push(`| ${t.selectors} | ${t.matched} (${pct(t.matched, t.selectors)}%) | ${t.neverMatched} (${pct(t.neverMatched, t.selectors)}%) | ${t.printOnly} | ${t.notCrawled} | ${t.untestable} | ${t.duplicateGroups} (${t.redundantDeclarations}) | ${t.shadowedDeclarations} | ${t.important} |`);
  L.push(``);
  L.push(`used selectors: light ${t.usedByTheme.light} · dark ${t.usedByTheme.dark} · union ${t.usedByTheme.union} (never-matched = parsed ∧ file loaded ∧ not in union ∧ not untestable).`);
  L.push(``);
  L.push(`## Top-10 never-matched files`);
  L.push(`| file | sels | never-matched | % |`);
  L.push(`|---|---|---|---|`);
  for (const [f, v] of deadFiles.slice(0, 10)) L.push(`| ${f} | ${v.selectors} | ${v.dead} | ${pct(v.dead, v.selectors)}% |`);
  L.push(``);
  L.push(`## Conservative dead candidates — ${deadCandidates.length} selectors (full detail: dead-candidates.json)`);
  L.push(`- never-matched ${neverMatched.length} − excluded (name tokens referenced in src/tests: ${excludedByReason.referenced ?? 0}; template-literal-producible: ${(excludedByReason.templatePrefix ?? 0) + (excludedByReason.templateFragment ?? 0)}; dash-concat prefix present: ${excludedByReason.concatPrefix ?? 0}; no name token: ${excludedByReason.noNameToken ?? 0}).`);
  L.push(`| file | candidates |`);
  L.push(`|---|---|`);
  for (const f of deadCandidateFiles.slice(0, 10)) L.push(`| ${f.file} | ${f.count} |`);
  L.push(``);
  L.push(`## Files never loaded by any crawled route (notCrawled — never dead) — ${report.notCrawledFiles.length}`);
  L.push(`- ${report.notCrawledFiles.map((f) => `\`${f.replace("frontend/src/styles/", "")}\``).join(" · ") || "(none)"}`);
  L.push(``);
  L.push(`## Duplicate/shadow findings (cross-file order = crawl sheet order)`);
  L.push(`- exact duplicate groups: ${t.duplicateGroups} (${t.redundantDeclarations} redundant declarations) — top: ${dupExact.slice(0, 3).map((g) => `\`${String(g.selector).slice(0, 28)} ${g.prop}: ${String(g.value).slice(0, 12)}\` ×${g.occurrences.length}`).join(" · ")}`);
  L.push(`- last-wins shadowed declarations: ${t.shadowedDeclarations} (per-entry winners in report.json).`);
  L.push(``);
  L.push(`NO CSS was deleted by this task — this census (report.json + dead-candidates.json) is the deliverable; deletions are later tasks' decisions.`);
  fs.writeFileSync(path.join(OUT_DIR, "report.md"), L.join("\n") + "\n");
  console.log(`merge: ${cellsTotal}/${matrixCells} cells · ${t.selectors} selectors · ${t.matched} matched · ${t.neverMatched} never-matched · ${deadCandidates.length} dead candidates · FAILED routes ${failed.size}`);
  console.log(`report: ${path.join(OUT_DIR, "report.json")} + report.md (${L.length} lines) + dead-candidates.json`);
  console.log(`merge wall: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

/* ── main ──────────────────────────────────────────────────────────── */
if (has("list")) { listChunks(); process.exit(0); }
if (has("selftest")) {
  const transport = await ensureTransport();
  const roles = await composeRoles(transport);
  for (const [g, role] of Object.entries(roles)) {
    const sessionUserName = role.authed ? `${role.sessionUser?.firstName ?? "?"} ${role.sessionUser?.lastName ?? ""} (${role.sessionUser?.role})` : "(guest)";
    console.log(`${g}: authed=${role.authed} session=${sessionUserName} ownSeeds=${role.seeds?.length ?? 0} overrides=${role.overrides.length} meJson=${role.meJson ? "yes" : "no"}`);
  }
  console.log(`transport exports: ${["installMockApi", "seedSession", "STUDENT_USER", "TEACHER_USER", "ADMIN_USER", "QUALITY_USER", "OWNER_USER", "OFFERING_ID", "MODERATION_TEMPLATES"].every((k) => transport.mod[k] != null) ? "ok" : "MISSING"}`);
  process.exit(0);
}
if (has("crawl")) {
  const g = arg("group", null);
  const bp = Number(arg("bp", "390"));
  const theme = arg("theme", "light");
  if (!g || !BPS.includes(bp) || !THEMES.includes(theme)) { console.error("--crawl needs --group <public|student|teacher|admin|quality|owner> --bp 390|1440 --theme light|dark"); process.exit(2); }
  await withDevServer(() => runChunk(g, bp, theme));
  process.exit(0);
}
if (has("merge")) { await merge(); process.exit(0); }
console.log("nothing to do — use --list, --crawl --group X --bp N --theme T, or --merge (see --help)");
