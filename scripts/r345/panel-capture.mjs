#!/usr/bin/env node
/**
 * panel-capture.mjs — R345 E1 blind-panel capture (Madarek + Heron).
 *
 * The E1 panel: the SAME route matrix as the R344 VR baseline (25 routes:
 * 15 public + 10 hermetic student), restricted to bps {1440, 768, 390} ×
 * themes {light, dark}. PNG captures under /tmp/r345/panel/ (NOT tracked):
 *   <out>/<surface>/<slug>/<bp>-<theme>-top.png    (viewport-top, after the
 *     full r344 scroll pass so every reveal/scroll-tied state is settled)
 *   <out>/<surface>/<slug>/<bp>-<theme>-full.png   (landing fullPage master
 *     for Madarek; every Heron route gets top + full)
 *
 * DARK SELF-TEST (the gate that voided R335's dark half): every PNG —
 * dark-labelled ones gated, all of them measured — is decoded IN NODE by a
 * minimal PNG decoder (IHDR → concat IDAT → zlib.inflateSync → unfilter
 * scanlines 0-4 → mean luminance 0.2126R+0.7152G+0.0722B/255). A dark
 * capture with mean luminance ≥ 0.25 FAILS the run loudly (exit 1) and the
 * manifest records it. A PNG the decoder cannot parse fails the run
 * immediately (never skipped).
 *
 * Heron (the reference, https://heronaiapp.com/): same pipeline, same 3 bps.
 * Probed 2026-11-09: Webflow static site, HTTP 200 under headless with
 * --disable-blink-features=AutomationControlled + a realistic UA, NO theme
 * toggle, NO prefers-color-scheme response (emulated-dark screenshot is
 * identical to light) → it ships ONE served theme (light); we capture
 * what it serves and note it (no fake dark cells). Heron routes = its own
 * header/footer nav set.
 *
 * Resume: manifest at <out>/manifest.json, one entry per capture
 * { surface, route, bp, theme, file, meanLuminance, bytes, ... }; done
 * cells with an existing file are skipped; --force recaptures.
 *
 * Auth for Madarek: the D7a hermetic transport (verbatim from r344's
 * vr-capture.mjs, itself verbatim from scripts/css/dead.mjs — installMockApi
 * + seedSession + the institution-bearing /auth/me), so student surfaces
 * render their designed fixture state without a backend. Themes seed via
 * seedSession → localStorage['madarek-theme'] =
 * {"state":{"mode":"dark"|"light","modeUpdatedAt":0},"version":2} through
 * addInitScript BEFORE navigation (the r325 pattern; the profile in /auth/me
 * says SYSTEM, so Case 3 of useThemeProfileSync keeps the local choice).
 *
 * Usage:
 *   node scripts/r345/panel-capture.mjs                          # everything
 *   node scripts/r345/panel-capture.mjs --surface madarek --routes /,/auth
 *   node scripts/r345/panel-capture.mjs --surface heron --limit 20
 *   node scripts/r345/panel-capture.mjs --bps 390 --themes dark --force
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import crypto from "node:crypto";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");

/* ------------------------------------------------------------------ *
 * Minimal PNG decoder — IHDR/PLTE/IDAT, bit depth 8, color types
 * 0/2/3/4/6, non-interlaced, scanline filters 0-4. Anything it cannot
 * parse THROWS (the run fails; never skip a capture we cannot verify).
 * Returns { width, height, meanLuminance } with
 * meanLuminance = avg(0.2126R + 0.7152G + 0.0722B) / 255.
 * ------------------------------------------------------------------ */
export function decodePngLuminance(buf) {
  if (!(buf.length >= 8) || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error("png-decode: bad signature (not a PNG?)");
  }
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = -1;
  const idat = [], plte = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (off + 12 + len > buf.length) throw new Error(`png-decode: truncated chunk ${type}`);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === "PLTE") plte.push(data);
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (!width || !height) throw new Error("png-decode: missing IHDR");
  if (bitDepth !== 8) throw new Error(`png-decode: unsupported bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error("png-decode: interlaced (Adam7) unsupported");
  const channelsByType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsByType[colorType];
  if (!channels) throw new Error(`png-decode: unsupported color type ${colorType}`);
  const palette = plte.length ? Buffer.concat(plte) : null;
  if (colorType === 3 && (!palette || palette.length < 3)) throw new Error("png-decode: palette image without PLTE");
  if (!idat.length) throw new Error("png-decode: no IDAT");
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length < (stride + 1) * height) throw new Error(`png-decode: IDAT short (${raw.length} < ${(stride + 1) * height})`);
  const out = Buffer.allocUnsafe(stride * height);
  let src = 0, prev = -1;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const row = y * stride;
    if (filter === 0) {
      raw.copy(out, row, src, src + stride);
    } else if (filter === 2) { // Up
      for (let x = 0; x < stride; x++) out[row + x] = prev >= 0 ? (raw[src + x] + out[prev + x]) & 0xff : raw[src + x];
    } else if (filter === 1) { // Sub
      for (let x = 0; x < stride; x++) { const a = x >= channels ? out[row + x - channels] : 0; out[row + x] = (raw[src + x] + a) & 0xff; }
    } else if (filter === 3) { // Average
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? out[row + x - channels] : 0;
        const b = prev >= 0 ? out[prev + x] : 0;
        out[row + x] = (raw[src + x] + ((a + b) >> 1)) & 0xff;
      }
    } else if (filter === 4) { // Paeth
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? out[row + x - channels] : 0;
        const b = prev >= 0 ? out[prev + x] : 0;
        const c = x >= channels && prev >= 0 ? out[prev + x - channels] : 0;
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        out[row + x] = (raw[src + x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
    } else {
      throw new Error(`png-decode: unknown filter ${filter}`);
    }
    src += stride; prev = row;
  }
  const n = width * height;
  let sum = 0;
  if (colorType === 2 || colorType === 6) {
    for (let i = 0, p = 0; i < n; i++, p += channels) sum += 0.2126 * out[p] + 0.7152 * out[p + 1] + 0.0722 * out[p + 2];
  } else if (colorType === 0 || colorType === 4) {
    for (let i = 0, p = 0; i < n; i++, p += channels) sum += out[p]; // gray: weights sum to 1
  } else { // 3 — indexed
    for (let i = 0, p = 0; i < n; i++, p += channels) {
      const e = out[p] * 3;
      sum += 0.2126 * palette[e] + 0.7152 * palette[e + 1] + 0.0722 * palette[e + 2];
    }
  }
  return { width, height, meanLuminance: sum / (n * 255) };
}

/* ------------------------------------------------------------------ *
 * run() — the capture pipeline; only executes when this file is run
 * directly (`node scripts/r345/panel-capture.mjs ...`). Importing the
 * module (e.g. from a unit test of the decoder) is side-effect free.
 * ------------------------------------------------------------------ */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  await run();
}

async function run() {
  const { chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright");
  const esbuild = (await import("esbuild"));
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
  const FLAG = (n) => process.argv.includes(`--${n}`);

  const URL_BASE = arg("url", "http://localhost:5274");
  const OUT = resolve(arg("out", "/tmp/r345/panel"));
  const MANIFEST = join(OUT, "manifest.json");
  const FORCE = FLAG("force");
  const LIMIT = Number(arg("limit", "0")) || Infinity; // max NEW captures this run
  const SURFACES = (arg("surface", "madarek,heron")).split(",").map((s) => s.trim()).filter(Boolean);
  const GROUPS_WANTED = new Set((arg("groups", "public,student")).split(",").map((s) => s.trim()).filter(Boolean));
  const ROUTES_WANTED = new Set((arg("routes", "")).split(",").map((s) => s.trim()).filter(Boolean));
  const BPS_WANTED = (arg("bps", "1440,768,390")).split(",").map((s) => s.trim()).filter(Boolean);
  const THEMES_WANTED = (arg("themes", "light,dark")).split(",").map((s) => s.trim()).filter(Boolean);

  const BPS = ["1440", "768", "390"].filter((b) => BPS_WANTED.includes(b));
  const vpH = (bp) => (bp === 390 ? 844 : 900); // 1440→900, 768→900, 390→844
  const GATE = 0.25; // mean luminance ≥ this on a dark capture = light leaked
  const HERON_URL = "https://heronaiapp.com";
  const HERON_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  /* The 25-route panel set — verbatim from r344 vr-capture.mjs (the VR manifest). */
  const MADAREK_CRAWL = {
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

  /* Heron's own nav set (header/footer links, discovered by the r345 probe). */
  const HERON_ROUTES = [
    "/", "/heron-chat-widget", "/heron-dashboard", "/pricing", "/resources?sc=insights",
    "/about-us", "/contact-us", "/privacy-policy", "/terms-and-conditions", "/cookie-policy",
  ];

  /* hermetic student transport (dead.mjs verbatim, as in r344) */
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
  const NEED_STUDENT = MADAREK_CRAWL.groups.some((g) => g.auth === "student");
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

  /* ---------------- manifest ---------------- */
  mkdirSync(OUT, { recursive: true });
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { capturedAt: new Date().toISOString(), cells: {} };
  manifest.out = OUT;
  manifest.gate = { threshold: GATE, rule: "dark capture with meanLuminance >= 0.25 FAILS (R335 light-leak class)" };
  manifest.notes = manifest.notes || {};
  manifest.notes.heron = manifest.notes.heron || {
    probedAt: "2026-11-09T23:26:00.000Z",
    themeMechanism: "single-served-theme (light) — Webflow site; no theme toggle, no prefers-color-scheme response (emulated-dark screenshot identical to light); captured what it serves",
    botBlock: "none — HTTP 200 under headless with --disable-blink-features=AutomationControlled + realistic UA",
  };
  manifest.notes.madarek = manifest.notes.madarek || {
    themeMechanism: "madarek-theme zustand-persist v2 seed via seedSession (addInitScript pre-navigation): {state:{mode,modeUpdatedAt:0},version:2}; /auth/me profile says SYSTEM so the local choice governs (useThemeProfileSync Case 3)",
  };
  manifest.runs = manifest.runs || [];
  const saveManifest = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));

  const slug = (r) => r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "-");
  const seat = async (page, y) => page.evaluate(new Function(`return (${SEAT_JS})`)(), y);

  /* record one capture: file, size, decoded luminance, dark gate */
  let captures = 0, gateFailures = [], cellErrors = [];
  function recordCapture({ surface, route, bp, theme, shot, file, httpStatus }) {
    const buf = readFileSync(file);
    const dec = decodePngLuminance(buf); // throws → the run fails, never skip
    const bytes = buf.length;
    const id = `${surface}|${slug(route)}|${bp}|${theme}|${shot}`;
    const entry = {
      surface, route, bp, theme, shot, file: relative(OUT, file),
      width: dec.width, height: dec.height,
      meanLuminance: Math.round(dec.meanLuminance * 10000) / 10000,
      bytes, status: "done", capturedAt: new Date().toISOString(),
    };
    if (httpStatus != null) entry.httpStatus = httpStatus;
    if (theme === "dark" && dec.meanLuminance >= GATE) {
      entry.status = "darkGateFailed";
      entry.gateRule = `meanLuminance ${dec.meanLuminance.toFixed(4)} >= ${GATE}`;
      gateFailures.push(id);
      process.stdout.write(`  ✗✗✗ DARK GATE FAILED ✗✗✗ ${id} meanLuminance=${dec.meanLuminance.toFixed(4)} >= ${GATE} — LIGHT LEAKED (the R335 bug class)\n`);
    }
    manifest.cells[id] = entry;
    captures++;
    saveManifest();
    return entry;
  }

  function cellDone(id, file) {
    return !FORCE && manifest.cells[id]?.status === "done" && existsSync(file) && statSync(file).size > 0;
  }

  const runStart = Date.now();
  let runFailed = false;
  try {
    /* =================== MADAREK =================== */
    if (SURFACES.includes("madarek")) {
      const browser = await chromium.launch({ headless: true });
      try {
        let stopped = false;
        for (const group of MADAREK_CRAWL.groups) {
          if (stopped) break;
          if (!GROUPS_WANTED.has(group.name)) continue;
          for (const route of group.routes) {
            if (stopped) break;
            if (ROUTES_WANTED.size && !ROUTES_WANTED.has(route)) continue;
            for (const bp of BPS) {
              if (stopped) break;
              for (const theme of THEMES_WANTED) {
                if (stopped) break;
                const shots = route === "/" ? ["top", "full"] : ["top"];
                const dir = join(OUT, "madarek", slug(route));
                if (shots.every((s) => cellDone(`madarek|${slug(route)}|${bp}|${theme}|${s}`, join(dir, `${bp}-${theme}-${s}.png`)))) continue;
                const id = `madarek|${slug(route)}|${bp}|${theme}`;
                const t0 = Date.now();
                try {
                  mkdirSync(dir, { recursive: true });
                  const context = await browser.newContext({ viewport: { width: Number(bp), height: vpH(bp) } });
                  try {
                    if (group.auth === "student") {
                      await installMockApi(context, { sessionUser: STUDENT_USER, overrides: D7A_OVERRIDES });
                      await seedSession(context, seededUser, { token: "e2e-token-student", theme });
                    } else {
                      await installMockApi(context, { sessionUser: null });
                      await seedSession(context, null, { theme });
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
                    // the full r344 scroll pass — trigger every reveal/scroll-tied state
                    const height = await page.evaluate(() => document.documentElement.scrollHeight);
                    const step = Math.max(400, Math.round(vpH(bp) * 0.8));
                    for (let y = 0; y < height; y += step) { await seat(page, y); await page.waitForTimeout(90); }
                    await seat(page, height); await page.waitForTimeout(400);
                    await seat(page, 0); await page.waitForTimeout(500);
                    await page.evaluate(() => document.fonts.ready).catch(() => {});
                    await page.screenshot({ path: join(dir, `${bp}-${theme}-top.png`) });
                    recordCapture({ surface: "madarek", route, bp, theme, shot: "top", file: join(dir, `${bp}-${theme}-top.png`) });
                    if (route === "/") {
                      await page.screenshot({ path: join(dir, `${bp}-${theme}-full.png`), fullPage: true });
                      recordCapture({ surface: "madarek", route, bp, theme, shot: "full", file: join(dir, `${bp}-${theme}-full.png`) });
                    }
                  } finally {
                    await context.close().catch(() => {});
                  }
                  process.stdout.write(`  ✓ ${id} (${Date.now() - t0}ms)\n`);
                } catch (e) {
                  const msg = String(e).slice(0, 200);
                  cellErrors.push(`${id}: ${msg}`);
                  for (const s of shots) {
                    manifest.cells[`${id}|${s}`] = { surface: "madarek", route, bp, theme, shot: s, status: "error", error: msg };
                  }
                  saveManifest();
                  process.stdout.write(`  ✗ ${id}: ${msg}\n`);
                }
                if (captures >= LIMIT) { stopped = true; process.stdout.write(`  --limit ${LIMIT} reached — stopping (resume re-runs)\n`); }
              }
            }
          }
        }
      } finally {
        await browser.close();
      }
    }

    /* =================== HERON =================== */
    if (SURFACES.includes("heron")) {
      const browser = await chromium.launch({
        headless: true,
        args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
      });
      try {
        let stopped = false;
        for (const route of HERON_ROUTES) {
          if (stopped) break;
          if (ROUTES_WANTED.size && !ROUTES_WANTED.has(route)) continue;
          for (const bp of BPS) {
            if (stopped) break;
            for (const theme of ["light"]) { // probed: Heron ships ONE theme — capture what it serves, noted
              if (stopped) break;
              const dir = join(OUT, "heron", slug(route));
              if (["top", "full"].every((s) => cellDone(`heron|${slug(route)}|${bp}|${theme}|${s}`, join(dir, `${bp}-${theme}-${s}.png`)))) continue;
              const id = `heron|${slug(route)}|${bp}|${theme}`;
              const t0 = Date.now();
              try {
                mkdirSync(dir, { recursive: true });
                const context = await browser.newContext({
                  userAgent: HERON_UA, viewport: { width: Number(bp), height: vpH(bp) },
                  locale: "en-US", colorScheme: "light",
                });
                let httpStatus = null;
                try {
                  const page = await context.newPage();
                  const resp = await page.goto(`${HERON_URL}${route}`, { waitUntil: "load", timeout: 60000 });
                  httpStatus = resp?.status() ?? null;
                  await page.waitForTimeout(4000);
                  // scroll pass for lazy media, then settle top (same pipeline)
                  const height = await page.evaluate(() => document.documentElement.scrollHeight);
                  const step = Math.max(400, Math.round(vpH(bp) * 0.8));
                  for (let y = 0; y < height; y += step) { await seat(page, y); await page.waitForTimeout(90); }
                  await seat(page, height); await page.waitForTimeout(600);
                  await seat(page, 0); await page.waitForTimeout(500);
                  await page.evaluate(() => document.fonts.ready).catch(() => {});
                  await page.screenshot({ path: join(dir, `${bp}-${theme}-top.png`) });
                  recordCapture({ surface: "heron", route, bp, theme, shot: "top", file: join(dir, `${bp}-${theme}-top.png`), httpStatus });
                  await page.screenshot({ path: join(dir, `${bp}-${theme}-full.png`), fullPage: true });
                  recordCapture({ surface: "heron", route, bp, theme, shot: "full", file: join(dir, `${bp}-${theme}-full.png`), httpStatus });
                } finally {
                  await context.close().catch(() => {});
                }
                process.stdout.write(`  ✓ ${id} [${httpStatus}] (${Date.now() - t0}ms)\n`);
              } catch (e) {
                const msg = String(e).slice(0, 200);
                cellErrors.push(`${id}: ${msg}`);
                for (const s of ["top", "full"]) {
                  manifest.cells[`${id}|${s}`] = { surface: "heron", route, bp, theme, shot: s, status: "error", error: msg };
                }
                saveManifest();
                process.stdout.write(`  ✗ ${id}: ${msg}\n`);
              }
              if (captures >= LIMIT) { stopped = true; process.stdout.write(`  --limit ${LIMIT} reached — stopping (resume re-runs)\n`); }
            }
          }
        }
      } finally {
        await browser.close();
      }
    }
  } catch (e) {
    // decoder failure or launch failure — the run fails loudly, never skip
    runFailed = true;
    process.stdout.write(`\n✗✗✗ RUN FAILURE ✗✗✗ ${String(e).slice(0, 400)}\n`);
    manifest.runs.push({ at: new Date().toISOString(), argv: process.argv.slice(2), fatal: String(e).slice(0, 400), captures });
    saveManifest();
    process.exit(1);
  }

  const wall = ((Date.now() - runStart) / 1000).toFixed(1);
  manifest.runs.push({ at: new Date().toISOString(), argv: process.argv.slice(2), captures, wallSec: Number(wall), gateFailures: gateFailures.length, cellErrors: cellErrors.length });
  saveManifest();

  /* luminance summary per surface×theme */
  const summary = {};
  for (const c of Object.values(manifest.cells)) {
    if (typeof c.meanLuminance !== "number") continue;
    const k = `${c.surface}/${c.theme}`;
    (summary[k] ||= []).push(c.meanLuminance);
  }
  const rows = Object.entries(summary).map(([k, v]) => `${k}: n=${v.length} min=${Math.min(...v).toFixed(4)} mean=${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(4)} max=${Math.max(...v).toFixed(4)}`).join("\n  ");
  process.stdout.write(`\npanel-capture run: ${captures} new captures, wall ${wall}s\n  ${rows || "(none)"}\n`);
  if (gateFailures.length) { process.stdout.write(`\n✗✗✗ DARK SELF-TEST FAILED on ${gateFailures.length} capture(s): ${gateFailures.join(", ")}\n`); }
  if (cellErrors.length) { process.stdout.write(`✗ ${cellErrors.length} cell error(s): ${cellErrors.join(" | ")}\n`); }
  if (gateFailures.length || cellErrors.length || runFailed) process.exit(1);
}
