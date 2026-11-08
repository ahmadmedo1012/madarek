#!/usr/bin/env node
/**
 * dead.mjs — R343 · D1 — the CSS dead-code instrument.
 *
 * Crawl (Playwright) the app's routes × roles × themes × breakpoints and
 * harvest every selector the DOM actually matched, then diff that live
 * set against a static parse of every .css under frontend/src/styles:
 *
 *   (a) never-matched selectors per file (dead candidates),
 *   (b) duplicate declarations (same selector+prop+value elsewhere)
 *       + last-wins shadowing (same selector+prop, different value),
 *   (c) the `!important` map (file:line).
 *
 * NO CSS is deleted by this tool — it only measures. The deletions are
 * later tasks' decisions, made against the post-merge authoritative
 * baseline (this worktree's crawl is provisional — parallel R343
 * branches add CSS concurrently).
 *
 * HOW THE LIVE SET IS HARVESTED — the honest instrument note:
 *   The task contract says page.startCSSCoverage(). Playwright/Chromium
 *   CSS coverage CANNOT see Vite-dev's injected <style> tags (no
 *   sourceURL — the Playwright docs state this outright), so on a dev
 *   server it returns ~2 useless inline entries. The harvest therefore
 *   walks document.styleSheets in-page AFTER the scroll + hover/interact
 *   pass: Vite tags every injected sheet with data-vite-dev-id (the
 *   ABSOLUTE source path), which gives exact per-file attribution, and
 *   every style rule's selector list is tested with
 *   document.querySelector (pseudo-elements + stateful pseudo-classes
 *   stripped — .x:hover counts when .x exists). startCSSCoverage() is
 *   STILL run on every cell and its URL-mapped entries are unioned in:
 *   against `vite preview` (real <link> assets) coverage becomes the
 *   primary source and the sheet walk keeps working there too.
 *
 *   print-only rules (@media print) are excluded from dead candidacy —
 *   a screen crawl can never match them (they are counted separately).
 *   Files no crawled route ever loaded are reported as notCrawled —
 *   never as dead (the subset crawl does not visit teacher/admin/owner/
 *   quality surfaces, and says so in report.md).
 *
 * AUTH (route/role discovery — the pages.mjs/pages-authed.mjs method):
 *   `--routes` takes either a crawl-list JSON file (groups → routes +
 *   auth profile, the full post-merge matrix shape) or the pages.mjs
 *   comma-list form (`--routes /,/auth`); in comma form the role is
 *   discovered from the route prefix (/student/* seeds the student
 *   session). Student seeding is the D7a hermetic transport — the REAL
 *   e2e fixtures (mock-transport.ts + api-fixtures.ts, esbuild-bundled)
 *   with installMockApi + seedSession + the institution-bearing /auth/me
 *   override. teacher/admin/owner/quality corpora live inside their
 *   per-role harness scripts (pages-{teacher,registrar,owner,quality}
 *   .mjs) and are NOT importable — those routes fail loudly at startup
 *   so the crawl never silently renders a login screen and calls its
 *   CSS dead.
 *
 * Usage:
 *   node scripts/css/dead.mjs --url http://localhost:5208/ \
 *     [--routes subset.json | /,/auth,/student/dashboard] \
 *     [--bps 390,1440] [--themes light,dark] \
 *     [--out docs/redesign/r343/css-dead/]
 *
 * Output: <out>/report.json (machine) + <out>/report.md (≤80 lines).
 */
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.join(__dirname, "..", "..");
const STYLES_DIR = path.join(WORKTREE, "frontend", "src", "styles");

let chromium;
let esbuild;
try {
  ({ chromium } = createRequire(path.join(WORKTREE, "frontend", "package.json"))("playwright"));
  esbuild = createRequire(path.join(WORKTREE, "frontend", "package.json"))("esbuild");
} catch {
  ({ chromium } = createRequire("/home/z/madarek/frontend/package.json")("playwright"));
  esbuild = createRequire("/home/z/madarek/frontend/package.json")("esbuild");
}

/* ── args ─────────────────────────────────────────────────────────── */
const arg = (n, d) => (process.argv.indexOf(`--${n}`) > 0 ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
/* --help/-h — print the header usage and exit 0. D1b fix: before this,
 * `--help` was an unknown arg (silently ignored) and the tool started
 * the FULL default crawl against whatever answered on the default URL —
 * a footgun measured the hard way. */
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  const header = fs.readFileSync(path.join(__dirname, "dead.mjs"), "utf8").match(/\/\*\*[\s\S]*?\*\//)?.[0] ?? "(no header)";
  console.log(header.replace(/^\/\*\*?\n?/, "").replace(/\*\/\s*$/, "").replace(/^ \* ?/gm, "").trim());
  console.log(`\ndefaults: --bps 390,1440 · --themes light,dark · --url http://localhost:5173/ · --routes <D1 subset> · --out docs/redesign/r343/css-dead/`);
  process.exit(0);
}
const URL_BASE = (arg("url", "http://localhost:5173/") ?? "").replace(/\/$/, "");
const BPS = (arg("bps", "390,1440") ?? "").split(",").map((b) => Number(b.trim())).filter(Boolean);
const THEMES = (arg("themes", "light,dark") ?? "").split(",").map((t) => t.trim()).filter((t) => t === "light" || t === "dark");
const OUT_DIR = path.resolve(WORKTREE, arg("out", path.join("docs", "redesign", "r343", "css-dead")));
const ROUTES_ARG = arg("routes", null);

/* viewport heights mirror the conformance suite (run.mjs BPS table) */
const vpH = (bp) => (bp === 390 ? 844 : bp === 768 ? 900 : bp === 1024 ? 768 : bp === 1920 ? 1080 : 900);

/* ── the crawl list ────────────────────────────────────────────────── */
/* JSON form: { "groups": [ { "name": "...", "auth": "student"|null,
 *   "routes": ["/", ...] } ] }. Comma form: the pages.mjs discovery —
 *   role derived from the route prefix. Default: D1's representative
 *   subset (landing + login + 5 key student surfaces; admin deferred). */
const DEFAULT_CRAWL = {
  groups: [
    { name: "public", auth: null, routes: ["/", "/auth"] },
    {
      name: "student",
      auth: "student",
      routes: [
        "/student/dashboard",
        "/student/courses",
        "/student/catalog",
        "/student/courses/offr_e2e_algorithms",
        "/student/lectures/lec_e2e_greedy",
      ],
    },
  ],
};
const ROLE_PREFIXES = { student: "student", teacher: "teacher", admin: "admin", owner: "owner", quality: "quality" };
const AUTH_SEEDS = ["student"]; // the D7a transport; extend when a role's corpus becomes importable

function buildCrawl(raw) {
  if (raw == null) return structuredClone(DEFAULT_CRAWL);
  if (/\.json$/i.test(raw.trim())) {
    const list = JSON.parse(fs.readFileSync(path.resolve(WORKTREE, raw.trim()), "utf8"));
    if (!Array.isArray(list.groups)) throw new Error(`crawl list ${raw}: expected { groups: [...] }`);
    return list;
  }
  // pages.mjs comma form — group by role discovered from the prefix
  const routes = raw.split(",").map((r) => r.trim()).filter(Boolean);
  const groups = new Map();
  const skipped = [];
  for (const route of routes) {
    const seg = route.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
    const role = ROLE_PREFIXES[seg] ?? null;
    if (role && !AUTH_SEEDS.includes(role)) { skipped.push({ route, role, reason: `no importable ${role} fixture corpus (per-role harness owns it)` }); continue; }
    const key = role ?? "public";
    if (!groups.has(key)) groups.set(key, { name: key, auth: role ? "student" : null, routes: [] });
    groups.get(key).routes.push(route);
  }
  return { groups: [...groups.values()], skipped };
}

const CRAWL = buildCrawl(ROUTES_ARG);
for (const g of CRAWL.groups) {
  if (g.auth && !AUTH_SEEDS.includes(g.auth)) {
    console.error(`dead.mjs: group "${g.name}" wants auth "${g.auth}" — no importable fixture corpus (extend AUTH_SEEDS). Refusing to crawl it as guest.`);
    process.exit(2);
  }
}

/* ── hermetic student transport (the D7a method — verbatim fixtures) ─ */
async function ensureTransport() {
  const srcDir = path.join(WORKTREE, "frontend", "tests", "e2e", "fixtures");
  const sources = ["mock-transport.ts", "api-fixtures.ts"].map((f) => path.join(srcDir, f));
  const hash = crypto.createHash("sha1").update(sources.map((f) => fs.readFileSync(f)).join("")).digest("hex").slice(0, 12);
  const dir = path.join(os.tmpdir(), `r343-css-dead-${hash}`);
  const out = path.join(dir, "transport.mjs");
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, "media"), { recursive: true });
    fs.copyFileSync(path.join(srcDir, "media", "lecture.mp4"), path.join(dir, "media", "lecture.mp4"));
    esbuild.buildSync({
      stdin: {
        contents: `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { STUDENT_USER, OFFERING_ID } from ${JSON.stringify(sources[1])};`,
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
  return import(`${pathToFileURL(out).href}?v=${hash}`);
}

/* D7a extras (pages-authed.mjs, byte-equal fixtures): the three student
 * surfaces the standard fixture table lacks. */
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

/* ── in-page probes ────────────────────────────────────────────────── */

/* the seat helper (scroll.mjs): Lenis owns the landing scroll — jump it
 * imperatively or the tween fights the read for ~150ms. */
const SEAT_JS = `(y) => {
  const L = window.__mdrkLenis;
  if (L && typeof L.scrollTo === "function") { L.scrollTo(y, { immediate: true, force: true }); return; }
  window.scrollTo(0, Math.max(0, Math.round(y)));
}`;

/* interactive seats currently in the viewport (the hover/interact pass) */
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

/* THE sheet walk — every style rule's selector tested against the live
 * DOM (after scroll+hover). Returns per-sheet: file identity (vite
 * dev-id absolute path, href, or "(inline)"), totals, and the MATCHED
 * normalized selectors (the union input). print-only rules are counted,
 * never matched. Untestable selectors (browser rejects the stripped
 * form) are counted, never marked dead. */
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
    if (!s) return null;               // pseudo-element-only selector — untestable
    if (s === "*" || s === "html" || s === ":root" || s === "html:root") return true;
    try { return document.querySelector(s) !== null; } catch { return null; }
  };
  const sheets = [];
  const seen = new Set();
  const walkSheet = (sheet) => {
    if (seen.has(sheet)) return; seen.add(sheet);
    const node = sheet.ownerNode;
    const viteId = node && node.getAttribute ? node.getAttribute("data-vite-dev-id") : null;
    const acc = { file: viteId || sheet.href || "(inline)", total: 0, matched: [], untestable: 0, print: 0 };
    let rules = null;
    try { rules = sheet.cssRules; } catch { acc.total = -1; }   // cross-origin sheet
    const walkRules = (list, mediaChain) => {
      for (const r of list) {
        if (r.styleSheet) { walkSheet(r.styleSheet); continue; }               // @import
        const media = r.media ? [...mediaChain, r.media.mediaText] : mediaChain;
        if (r.cssRules && !r.selectorText) { walkRules(r.cssRules, media); continue; } // @media/@layer/@supports/@container
        if (!r.selectorText) continue;
        const print = media.some((m) => /(^|\\s)print(\\s|$|,|:)/.test(m));
        for (const sel of splitSels(r.selectorText)) {
          acc.total++;
          if (print) { acc.print++; continue; }
          const m = matches(sel);
          if (m === null) acc.untestable++;
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

/* ── the static parse (every .css under frontend/src/styles) ─────── */

/* split a selector list (or any CSV) on top-level commas */
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

/**
 * Minimal CSS tokenizer (no new deps): blocks, at-rule recursion
 * (@media/@layer/@supports/@container), declaration bodies with
 * line-accurate records. Nested style rules (modern CSS nesting) are
 * handled by prefixing the parent selector — none exist in the sheet
 * today, but the parser must not silently mis-file them if one lands.
 */
function parseCssFile(absPath, relPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")); // keep line structure
  const nl = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") nl.push(i);
  const lineAt = (pos) => {
    let lo = 0, hi = nl.length - 1, ans = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (nl[mid] < pos) { ans = mid + 1; lo = mid + 1; } else hi = mid - 1; }
    return ans + 1;
  };
  const rules = [];
  const important = [];

  const findBlockEnd = (start, end) => { // text[start]==='{'; returns index of matching '}'
    let depth = 1, q = null;
    for (let i = start + 1; i < end; i++) {
      const ch = text[i];
      if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return i; }
    }
    return end; // unbalanced — treat rest as the block
  };

  /* one style rule: prelude [start,braceIdx), block from braceIdx to its
   * matching '}' — returns the closing-brace index. */
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

  /* declarations in [start,end); a nested `{` (modern CSS nesting, or a
   * nested grouping at-rule) is parsed as its own rule with the parent
   * selector prefixed, then the parent body RESUMES after the nested
   * block — nesting is rare, but the bookkeeping must be right. */
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

  /* statements in [start,end): at-rule blocks recurse (media/layer/
   * supports/container/scope), style rules go to parseStyleRule,
   * semicolon statements (@import/@layer a,b;/@charset) are skipped. */
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
      if (text[j] === ";") { i = j + 1; continue; } // @import / @layer a,b; / @charset
      if (prelude.startsWith("@")) {
        const at = prelude.slice(1).split(/[\s({]/)[0].toLowerCase();
        const close = findBlockEnd(j, end);
        if (at === "media") scan(j + 1, close, { ...ctx, media: [...ctx.media, prelude.replace(/^@media\s*/i, "").trim()] });
        else if (at === "layer" || at === "supports" || at === "container" || at === "scope")
          scan(j + 1, close, at === "layer" ? { ...ctx, layers: [...ctx.layers, prelude.replace(/^@layer\s*/i, "").trim()] } : ctx);
        /* @keyframes/@font-face/@property/@page: no selectors to mine */
        i = close + 1;
      } else if (prelude) {
        i = parseStyleRule(i, j, end, ctx) + 1;
      } else i = j + 1;
    }
  }

  scan(0, text.length, { media: [], layers: [], parent: null });
  return { relPath, rules, important };
}

/* ── the crawl ─────────────────────────────────────────────────────── */
const usedByTheme = { light: new Set(), dark: new Set() }; // normalized selector strings
const seenFiles = new Map(); // rel file → first cell that loaded it (honesty: notCrawled vs dead)
const sheetOrder = [];       // first-seen order across cells ≈ the cascade order (dup/shadow analysis)
const crawlCells = [];
const crawlErrors = [];
let coverageEntries = 0;

/* D1b honesty fix: the transport is needed for EVERY crawl — public
 * cells run as guests on the SAME hermetic table, so data-dependent
 * public surfaces (/colleges) render their DESIGNED state, not the
 * no-backend ErrorState (an error sheet would brand live CSS dead). */
const { installMockApi, seedSession, STUDENT_USER } = await ensureTransport();
const NEED_STUDENT = CRAWL.groups.some((g) => g.auth === "student");

/* the D7a seeded session (pages-authed.mjs, byte-equal): STUDENT_USER +
 * the institution context the institution-scoped queries key on. */
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

async function crawlCell(browser, group, route, bp, theme) {
  const context = await browser.newContext({ viewport: { width: bp, height: vpH(bp) } });
  const cell = { group: group.name, route, bp, theme, sheets: 0, matchedSelectors: 0, errors: [] };
  try {
    if (group.auth === "student") {
      await installMockApi(context, { sessionUser: STUDENT_USER, overrides: D7A_OVERRIDES });
      await seedSession(context, seededUser, { token: "e2e-token-student", theme: theme === "dark" ? "dark" : undefined });
    } else {
      /* guest + the hermetic public table (colleges/faculties fixtures):
       * /auth/me answers 401 — a real guest — while public data surfaces
       * still render their designed (fixture) state. */
      await installMockApi(context, { sessionUser: null });
      await seedSession(context, null, { theme: theme === "dark" ? "dark" : undefined });
    }
    const page = await context.newPage();
    if (group.auth === "student") {
      // /auth/me is AUTHORITATIVE for the institution context (D7a): the
      // stock meProfile() carries none, so the seeded context would be wiped.
      await page.route("**/auth/me", async (r) => {
        if (r.request().method().toUpperCase() !== "GET") { await r.fallback(); return; }
        await r.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: meJson });
      });
    }
    await page.coverage.startCSSCoverage({ resetOnNavigation: false });
    await page.goto(`${URL_BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1800); // the suite's settle (pages.mjs)

    // scroll pass (scroll.mjs seat pattern) + hover/interact seats
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
    await page.evaluate(new Function(`return (${SEAT_JS})`)(), height); // bottom settle
    await page.waitForTimeout(400);
    // light focus sweep — mounts combobox/dropdown DOM without clicks
    await page.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll("input, select, textarea")) {
        if (n++ >= 12) break;
        try { el.focus({ preventScroll: true }); el.blur(); } catch {}
      }
    });

    // THE harvest: sheet walk + selector matching on the settled DOM
    const sheets = await page.evaluate(new Function(`return (${STYLE_PROBE_JS})`)());
    cell.sheets = sheets.length;
    for (const sh of sheets) {
      cell.matchedSelectors += sh.matched.length;
      const rel = sh.file.startsWith(WORKTREE + path.sep) ? path.relative(WORKTREE, sh.file).split(path.sep).join("/") : null;
      if (rel) {
        if (!seenFiles.has(rel)) { seenFiles.set(rel, `${group.name} ${route} @${bp} ${theme}`); sheetOrder.push(rel); }
      } else if (!sh.file.startsWith("http") && !sheetOrder.includes(sh.file)) sheetOrder.push(sh.file);
      for (const sel of sh.matched) usedByTheme[theme].add(sel);
    }

    // the contract's CSS coverage — union what it CAN see (preview mode:
    // real <link> assets; dev: ~only inline sheets — see the header note)
    const cov = await page.coverage.stopCSSCoverage();
    coverageEntries += cov.length;
    await page.close();
  } catch (e) {
    cell.errors.push(String(e && e.message ? e.message : e).slice(0, 300));
    crawlErrors.push({ cell: `${group.name} ${route} @${bp} ${theme}`, error: cell.errors[0] });
  } finally {
    await context.close().catch(() => {});
  }
  crawlCells.push(cell);
  console.log(`  ${cell.group} ${cell.route} @${bp} ${theme}: ${cell.sheets} sheets, ${cell.matchedSelectors} matched${cell.errors.length ? " — ERROR" : ""}`);
}

console.log(`dead.mjs — crawling ${CRAWL.groups.reduce((a, g) => a + g.routes.length, 0)} routes × ${BPS.length} bps × ${THEMES.length} themes → ${URL_BASE}`);
const browser = await chromium.launch({ headless: true });
try {
  for (const group of CRAWL.groups) {
    for (const route of group.routes) {
      for (const bp of BPS) {
        for (const theme of THEMES) await crawlCell(browser, group, route, bp, theme);
      }
    }
  }
} finally {
  await browser.close();
}
const usedAll = new Set([...usedByTheme.light, ...usedByTheme.dark]);

/* ── static parse + analysis ───────────────────────────────────────── */
const files = listCssFiles(STYLES_DIR);
const parsed = files.map((f) => parseCssFile(f, path.relative(WORKTREE, f).split(path.sep).join("/")));

/* every comma-part selector from every style rule */
const allSels = [];
for (const { relPath, rules } of parsed) {
  for (const r of rules) {
    for (const s of r.sels) allSels.push({ file: relPath, line: r.line, selector: s, printOnly: r.print });
  }
}
const norm = (s) => s.replace(/\s+/g, " ").trim();

const neverMatched = [];
const notCrawled = [];
const matchedSels = [];
for (const s of allSels) {
  if (s.printOnly) continue; // excluded from dead candidacy (counted separately)
  if (!seenFiles.has(s.file)) { notCrawled.push(s); continue; }
  if (usedAll.has(norm(s.selector))) matchedSels.push(s);
  else neverMatched.push(s);
}
const printOnly = allSels.filter((s) => s.printOnly);

/* duplicates + shadowing — keyed on selector+prop (values normalized).
 * Order = the crawl's first-seen sheet order (≈ the real cascade: base
 * sheets first, lazy page chunks after); files the crawl never loaded
 * keep the deterministic alphabetical tail. */
const alphaIdx = new Map(files.map((f, i) => [path.relative(WORKTREE, f).split(path.sep).join("/"), i]));
const orderIdx = new Map(sheetOrder.map((f, i) => [f, i]));
const cascadeKey = (rel) => orderIdx.get(rel) ?? 100000 + (alphaIdx.get(rel) ?? 99999);
const parsedOrdered = [...parsed].sort((a, b) => cascadeKey(a.relPath) - cascadeKey(b.relPath));
const declLog = []; // {file, line, sel, prop, value, seq}
for (const { relPath, rules } of parsedOrdered) {
  for (const r of rules) {
    for (const d of r.decls) declLog.push({ file: relPath, line: d.line, sel: r.sels.join(", "), prop: d.prop, value: d.value, important: d.important, seq: declLog.length });
  }
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

/* ── per-file rollup ───────────────────────────────────────────────── */
const perFile = {};
for (const p of parsed) {
  perFile[p.relPath] = { selectors: 0, matched: 0, dead: 0, printOnly: 0, notCrawled: 0, important: p.important.length, seen: seenFiles.has(p.relPath) };
}
for (const s of matchedSels) perFile[s.file].matched++;
for (const s of neverMatched) perFile[s.file].dead++;
for (const s of notCrawled) perFile[s.file].notCrawled++;
for (const s of printOnly) perFile[s.file].printOnly++;
for (const f of Object.values(perFile)) f.selectors = f.matched + f.dead + f.printOnly + f.notCrawled;

/* ── report.json ───────────────────────────────────────────────────── */
fs.mkdirSync(OUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  tool: "scripts/css/dead.mjs",
  url: URL_BASE,
  mode: "vite-dev (injected <style> sheets; CSS coverage supplement — see tool header)",
  crawl: {
    groups: CRAWL.groups.map((g) => ({ name: g.name, auth: g.auth, routes: g.routes })),
    skippedRoutes: CRAWL.skipped ?? [],
    bps: BPS,
    themes: THEMES,
    cells: crawlCells.length,
    cellsDetail: crawlCells,
    cellErrors: crawlErrors,
    filesSeen: [...seenFiles.keys()].sort(),
    sheetOrder,
    coverageEntries,
  },
  totals: {
    files: files.length,
    selectors: allSels.length,
    matched: matchedSels.length,
    neverMatched: neverMatched.length,
    printOnly: printOnly.length,
    notCrawled: notCrawled.length,
    usedByTheme: { light: usedByTheme.light.size, dark: usedByTheme.dark.size, union: usedAll.size },
    duplicateGroups: dupExact.length,
    redundantDeclarations: redundantDecls,
    shadowedDeclarations: shadowed.length,
    important: importantAll.length,
  },
  perFile,
  neverMatched: neverMatched.map((s) => ({ file: s.file, line: s.line, selector: s.selector })).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
  notCrawledFiles: [...new Set(notCrawled.map((s) => s.file))].sort(),
  duplicates: { exact: dupExact.slice(0, 400), exactTotal: dupExact.length, shadowed: shadowed.slice(0, 400), shadowedTotal: shadowed.length },
  important: importantAll,
};
fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 1));

/* ── report.md (≤80 lines) ─────────────────────────────────────────── */
const deadFiles = Object.entries(perFile).filter(([, v]) => v.dead > 0).sort((a, b) => b[1].dead - a[1].dead || a[0].localeCompare(b[0]));
const top20 = deadFiles.slice(0, 20);
const t = report.totals;
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const L = [];
L.push(`# R343 · D1 — CSS dead-code report (PROVISIONAL subset crawl)`);
L.push(``);
L.push(`generated ${report.generatedAt} · tool \`scripts/css/dead.mjs\` · dev server ${URL_BASE} · mode: vite-dev`);
L.push(``);
L.push(`## Baseline honesty — READ FIRST`);
L.push(`- Crawl = ${CRAWL.groups.map((g) => `${g.routes.length} ${g.name}`).join(" + ")} routes × bps {${BPS.join("/")}} × themes {${THEMES.join("/")}} = ${crawlCells.length} cells (student surfaces seeded via the D7a e2e transport).`);
L.push(`- This ran on the D1 WORKTREE (wip/r343-D1): parallel R343 branches add CSS concurrently — the authoritative baseline is the post-merge full-matrix re-run.`);
L.push(`- admin/teacher/owner/quality surfaces were NOT crawled (their fixture corpora live inside the per-role harness scripts) — their selectors are counted \`notCrawled\` (${notCrawled.length}), never dead.`);
L.push(`- ALL cells run on the D7a hermetic e2e transport (public cells as guests: /auth/me answers 401; public data surfaces get the fixture table — /colleges renders its designed state, never the no-backend ErrorState).`);
L.push(`- Playwright CSS coverage cannot see Vite-dev's injected <style> tags — the live set is harvested from document.styleSheets (data-vite-dev-id attribution) after a scroll+hover pass; coverage entries: ${coverageEntries}.`);
L.push(``);
L.push(`## Totals (frontend/src/styles — ${files.length} files)`);
L.push(`| selectors | matched | never-matched | print-only | not-crawled | dup groups (redundant decls) | shadowed | !important |`);
L.push(`|---|---|---|---|---|---|---|---|`);
L.push(`| ${t.selectors} | ${t.matched} (${pct(t.matched, t.selectors)}%) | ${t.neverMatched} (${pct(t.neverMatched, t.selectors)}%) | ${t.printOnly} | ${t.notCrawled} | ${t.duplicateGroups} (${t.redundantDeclarations}) | ${t.shadowedDeclarations} | ${t.important} |`);
L.push(``);
L.push(`used selectors: light ${t.usedByTheme.light} · dark ${t.usedByTheme.dark} · union ${t.usedByTheme.union} (dead = parsed ∧ file loaded by a crawled route ∧ not in the union).`);
L.push(``);
L.push(`## Top-20 dead files (never-matched selectors per file)`);
L.push(`| file | sels | dead | dead% | !imp |`);
L.push(`|---|---|---|---|---|`);
for (const [f, v] of top20) L.push(`| ${f} | ${v.selectors} | ${v.dead} | ${pct(v.dead, v.selectors)}% | ${v.important} |`);
L.push(``);
L.push(`## All files with dead>0 (${deadFiles.length} files; per-selector detail in report.json)`);
for (let i = 0; i < deadFiles.length; i += 3) {
  const row = deadFiles.slice(i, i + 3).map(([f, v]) => `\`${f}\` ${v.dead}/${v.selectors}`);
  L.push(`- ${row.join(" · ")}`);
}
L.push(``);
L.push(`## \`!important\` map — ${t.important} declarations (full file:line in report.json)`);
{
  const byFile = new Map();
  for (const e of importantAll) {
    if (!byFile.has(e.file)) byFile.set(e.file, []);
    byFile.get(e.file).push(e.line);
  }
  for (const [f, lines] of byFile) L.push(`- ${f.replace("frontend/src/styles/", "")} ×${lines.length} — L${lines.join(", L")}`);
}
L.push(``);
L.push(`## Duplicate/shadow findings (cross-file order = crawl sheet order)`);
L.push(`- exact duplicate groups: ${t.duplicateGroups} (${t.redundantDeclarations} redundant declarations) — top: ${dupExact.slice(0, 3).map((g) => `\`${String(g.selector).slice(0, 30)} ${g.prop}: ${String(g.value).slice(0, 14)}\` ×${g.occurrences.length}`).join(" · ")}`);
L.push(`- last-wins shadowed declarations: ${t.shadowedDeclarations} (earlier value never applies; the winner is listed per entry in report.json).`);
L.push(``);
L.push(`NO CSS was deleted by this task — the tool + this report are the deliverable; deletions are later tasks' decisions.`);
fs.writeFileSync(path.join(OUT_DIR, "report.md"), L.join("\n") + "\n");
console.log(`\nreport: ${path.join(OUT_DIR, "report.json")} + report.md (${L.length} lines)`);
console.log(`totals: ${t.selectors} selectors · ${t.matched} matched · ${t.neverMatched} never-matched · ${t.printOnly} print-only · ${t.notCrawled} not-crawled · ${t.duplicateGroups} dup groups · ${t.shadowedDeclarations} shadowed · ${t.important} !important`);
