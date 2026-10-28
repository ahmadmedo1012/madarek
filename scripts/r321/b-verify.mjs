#!/usr/bin/env node
/**
 * b-verify.mjs — R321 cycle-1 §B COVERAGE SWEEP (WP-Bverify).
 *
 * The rubric matrix over the 32 sheet-verified student routes
 * (docs/redesign/r321/STUDENT-SWEEP.md §2 — the ✅ rows; the 5
 * conversion targets are ✅ too after B1a/B1b/B2/B3/B4 merged).
 *
 * Per route × viewport (390×844, 768×1024, 1024×768, 1440×900) ×
 * light (+ 390 dark) it measures:
 *  · h1 count === 1 + its computed px (≤32 for inner pages; the
 *    dashboard may sit higher — recorded, judged later)
 *  · documentElement.scrollWidth ≤ innerWidth (no horizontal overflow)
 *  · console errors + failed requests (page.on('console'/'requestfailed'))
 *  · the root opt-in class (.r319s-page | .r321x-page | .r321m-page |
 *    .r321p-page | .r321c-page — per the sweep table's family column)
 *  · rounded-corner/shadow scan: SKIPPED by instruction — N/A in report
 *
 * Shots: ONLY 390 light + 390 dark per route, fullPage, jpeg q35
 * (re-encoded lower if >30KB). If light+dark would exceed 2MB, the
 * dark shots for the r319-family routes are dropped and dark kept
 * only for the newly-converted families (r321x/m/p/c) — recorded.
 *
 * Login: ONCE per context (student@test.ly / 12345678 at /auth via
 * getByLabel البريد الإلكتروني أو رقم القيد + textbox كلمة المرور +
 * button تسجيل الدخول; sessionStorage intro-skip 'madarek-intro-skip'
 * ='1'; locale ar) — the same recipe as the session's reviewer probes.
 *
 * Usage:
 *   node scripts/r321/b-verify.mjs --base http://localhost:4296 \
 *       --out audits/evidence/r321/student/bverify
 * Exit non-zero if any console error, overflow or h1-count defect.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, statSync, unlinkSync, readdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const BASE = argOf('--base', 'http://localhost:4296');
const OUT = argOf('--out', 'audits/evidence/r321/student/bverify');
const EMAIL = 'student@test.ly';
const PASSWORD = '12345678';

/* ── the route table (STUDENT-SWEEP.md §2 — the ✅ rows) ──────────── */
const R = (slug, p, family) => ({ slug, path: p, family });
const ROUTES = [
  R('dashboard', '/student/dashboard', 'r319s'),
  R('calendar', '/student/calendar', 'r319s'),
  R('schedule', '/student/schedule', 'r319s'),
  R('courses', '/student/courses', 'r319s'),
  R('course-detail', '/student/courses/{offeringId}', 'r319s'),
  R('catalog', '/student/catalog', 'r319s'),
  R('labs', '/student/labs', 'r319s'),
  R('matrix', '/student/matrix', 'r319s'),
  R('mooc', '/student/mooc', 'r319s'),
  R('library', '/student/library', 'r319s'),
  R('research', '/student/research', 'r319s'),
  R('jobs', '/student/jobs', 'r319s'),
  R('ai', '/student/ai', 'r319s'),
  R('gamification', '/student/gamification', 'r319s'),
  R('skills', '/student/skills', 'r319s'),
  R('alerts', '/student/alerts', 'r319s'),
  R('messages', '/student/messages', 'r319s'),
  R('ar', '/student/ar', 'r319s'),
  R('social', '/student/social', 'r319s'),
  R('downloads', '/student/downloads', 'r319s'),
  R('university', '/student/university', 'r319s'),
  R('results', '/student/results', 'r319s'),
  R('payment', '/student/payment', 'r319s'),
  R('profile', '/student/profile', 'r319s'),
  R('settings', '/settings', 'r320-settings'),
  R('webinars', '/student/webinars', 'r319s'),
  R('training', '/training', 'r319s'),
  R('training-track', '/training/{slug}', 'r319s'),
  R('training-lesson', '/training/{slug}/lesson/{lessonId}', 'r319s'),
  R('achievements', '/achievements', 'r319s'),
  R('document-viewer', '/document/{filename}', 'shared'),
  R('vision', '/vision', 'r320-shell'),
  R('vision-detail', '/vision/{vslug}', 'r320-shell'),
  R('competitions', '/competitions', 'r320-shell'),
  R('competition-detail', '/competitions/{id}', 'r320-shell'),
  R('online-exams', '/student/online-exams', 'r321x'),
  R('exam-taker', '/student/online-exams/{examId}', 'r321x'),
  R('map', '/student/map', 'r321m'),
  R('live', '/student/live', 'r321m'),
  R('lecture-player', '/student/lectures/{lectureId}', 'r321p'),
  R('community', '/community', 'r321c'),
];
/* redirect rows (STUDENT-SWEEP.md counts them in the 37) */
const REDIRECTS = [
  R('redirect-settings', '/student/settings', '/settings'),
  R('redirect-exams', '/student/exams', '/student/online-exams'),
  R('redirect-colleges', '/student/colleges', '/colleges'),
  R('redirect-achievements', '/student/achievements', '/achievements'),
].map((r) => ({ ...r, cells: {} }));

const VIEWPORTS = [
  { tag: '390x844', width: 390, height: 844 },
  { tag: '768x1024', width: 768, height: 1024 },
  { tag: '1024x768', width: 1024, height: 1024 },
  { tag: '1440x900', width: 1440, height: 900 },
];
const DARK_VP = VIEWPORTS[0];
const isConverted = (f) => f.startsWith('r321');
const slugPath = (p, params) =>
  p
    .replace('{offeringId}', params.offeringId ?? '')
    .replace('{examId}', params.examId ?? '')
    .replace('{lectureId}', params.lectureId ?? '')
    .replace(/\{slug\}/g, params.slug ?? '')
    .replace('{vslug}', params.visionSlug ?? '')
    .replace('{lessonId}', params.lessonId ?? '')
    .replace('{id}', params.compId ?? '')
    .replace('{filename}', params.filename ?? '');

mkdirSync(OUT, { recursive: true });

/* ── browser + shared state ───────────────────────────────────────── */
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const results = []; // per route: {slug, path, family, cells: {tag: m}, shot: {light: kb, dark: kb}}
const redirectResults = [];
const themeNotes = [];
let exitDefects = 0;

function attachCounters(page) {
  const c = { console: 0, failed: 0, consoleSamples: [], failedSamples: [] };
  page.on('console', (m) => {
    if (m.type() === 'error') {
      c.console++;
      if (c.consoleSamples.length < 3) c.consoleSamples.push(m.text().slice(0, 120));
    }
  });
  page.on('requestfailed', (r) => {
    c.failed++;
    if (c.failedSamples.length < 6)
      c.failedSamples.push(`${r.url().slice(0, 90)} [${r.failure()?.errorText ?? '?'}]`);
  });
  return c;
}

async function login(ctx) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${BASE}/auth`, { waitUntil: 'load', timeout: 30000 });
  const emailInput = page
    .getByLabel('البريد الإلكتروني أو رقم القيد')
    .or(page.locator('input[name="email"], input[type="email"]').first());
  await emailInput.fill(EMAIL);
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await page.waitForURL(/dashboard/, { timeout: 25000 });
  return page;
}

async function settle(page, route) {
  const c = page.__counters;
  c.console = 0;
  c.failed = 0;
  c.consoleSamples = [];
  c.failedSamples = [];
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(400);
  return {
    consoleErrors: c.console,
    failedRequests: c.failed,
    consoleSamples: c.consoleSamples,
    failedSamples: c.failedSamples,
  };
}

const MEASURE_JS = `(() => {
  const h1s = document.querySelectorAll('h1');
  const h1px = h1s.length === 1 ? parseFloat(getComputedStyle(h1s[0]).fontSize) : null;
  const root = document.querySelector('.r319s-page,.r321x-page,.r321m-page,.r321p-page,.r321c-page');
  const cls = root ? (String(root.className).match(/r319s|r321x|r321m|r321p|r321c/)?.[0] ?? null) : null;
  return {
    url: location.pathname,
    h1: h1s.length,
    h1px,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    root: cls,
  };
})()`;

async function measureRoute(page, route, shotTag) {
  const final = slugPath(route.path, PARAMS);
  let m;
  try {
    const counts = await settle(page, final);
    m = await page.evaluate(MEASURE_JS);
    Object.assign(m, counts);
  } catch (e) {
    m = { url: final, error: String(e).slice(0, 140) };
  }
  let shot = null;
  if (shotTag) {
    const qualities = m.error ? [] : [35, 18, 10];
    let buf = null;
    for (const q of qualities) {
      try {
        buf = await page.screenshot({ fullPage: true, type: 'jpeg', quality: q });
        if (buf.length <= 30 * 1024) break;
      } catch {
        buf = null;
      }
    }
    if (buf) {
      const file = path.join(OUT, `${route.slug}-${shotTag}.jpg`);
      writeFileSync(file, buf);
      shot = { file: path.basename(file), bytes: buf.length };
    }
  }
  return { ...m, shot };
}

/* ── param resolution (390-light context, once, post-login) ───────── */
const PARAMS = {};
async function scrapeHrefs(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(350);
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && !h.startsWith('#'))
  );
}
function firstMatch(hrefs, re) {
  for (const h of hrefs) {
    const clean = h.split(/[?#]/)[0].replace(/\/+$/, '');
    const m = clean.match(re);
    if (m) return m;
  }
  return null;
}

/* ── ONE stream = one chromium context = one (viewport, theme) ────── */
async function runStream(vp, theme, doShot, list) {
  const tag = theme === 'dark' ? `${vp.tag}-dark` : `${vp.tag}-light`;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    locale: 'ar',
    reducedMotion: 'reduce',
    colorScheme: theme,
    /* ONE UI login per run (phase-1 seed); the authenticated
       storageState is replayed into every stream — the backend's
       AUTH_RATE limiter (10 logins / 15 min / IP) makes one UI login
       per context unsustainable across repeated sweeps */
    storageState: AUTH_STATE,
  });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('madarek-intro-skip', '1');
  });
  if (theme === 'dark') {
    await ctx.addInitScript(() => {
      localStorage.setItem(
        'madarek-theme',
        JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: Date.now() }, version: 2 })
      );
    });
  }
  let page;
  try {
    page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(`${BASE}/student/dashboard`, { waitUntil: 'load', timeout: 30000 });
    if (page.url().includes('/auth')) throw new Error('storageState auth rejected → /auth');
    await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(300);
  } catch (e) {
    console.error(`[b-verify] LOGIN FAILED (${tag}): ${String(e).slice(0, 160)}`);
    for (const r of list) r.cells[tag] = { error: 'login failed' };
    for (const rd of REDIRECTS) rd.cells[tag] = { error: 'login failed' };
    await ctx.close();
    return;
  }
  page.__counters = attachCounters(page);
  if (theme === 'dark') {
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (applied !== 'dark') {
      /* persisted local choice lost to a profile hydrate — re-pin + reload once */
      await page.evaluate(() => {
        localStorage.setItem(
          'madarek-theme',
          JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: Date.now() }, version: 2 })
        );
      });
      await page.reload({ waitUntil: 'load' });
      const again = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      themeNotes.push(`${tag}: data-theme after login=${applied}, after re-pin=${again}`);
    }
  }
  const shotTag = doShot ? (theme === 'dark' ? 'dark' : 'light') : null;
  for (const route of list) {
    const cell = await measureRoute(page, route, shotTag);
    route.cells[tag] = cell;
  }
  for (const rd of REDIRECTS) {
    const c = page.__counters;
    c.console = 0;
    c.failed = 0;
    try {
      await page.goto(`${BASE}${rd.path}`, { waitUntil: 'load', timeout: 30000 });
      const final = await page.evaluate(() => location.pathname);
      rd.cells[tag] = { url: final, redirectOK: final === rd.family };
    } catch (e) {
      rd.cells[tag] = { error: String(e).slice(0, 120) };
    }
  }
  await ctx.close();
}

/* ── phase 1: login once (390 light) + resolve the param fixtures ─── */
console.log(`[b-verify] base=${BASE} out=${OUT} routes=${ROUTES.length}+${REDIRECTS.length}r`);
const seedCtx = await browser.newContext({
  viewport: { width: DARK_VP.width, height: DARK_VP.height },
  locale: 'ar',
  reducedMotion: 'reduce',
});
await seedCtx.addInitScript(() => sessionStorage.setItem('madarek-intro-skip', '1'));
const seedPage = await login(seedCtx);

const seedHrefs = {};
seedHrefs.courses = await scrapeHrefs(seedPage, '/student/courses');
PARAMS.offeringId = firstMatch(seedHrefs.courses, /^\/student\/courses\/([^/?#]+)/)?.[1] ?? null;
seedHrefs.training = await scrapeHrefs(seedPage, '/training');
PARAMS.slug = firstMatch(seedHrefs.training, /^\/training\/([^\/?#]+)$/)?.[1] ?? null;
if (PARAMS.slug) {
  seedHrefs.track = await scrapeHrefs(seedPage, `/training/${PARAMS.slug}`);
  PARAMS.lessonId = firstMatch(seedHrefs.track, /\/lesson\/([^/?#]+)/)?.[1] ?? null;
}
seedHrefs.exams = await scrapeHrefs(seedPage, '/student/online-exams');
PARAMS.examId = firstMatch(seedHrefs.exams, /^\/student\/online-exams\/([^/?#]+)/)?.[1] ?? null;
PARAMS.lectureId =
  firstMatch(await scrapeHrefs(seedPage, '/student/live'), /\/student\/lectures\/([^/?#]+)/)?.[1] ??
  firstMatch(await scrapeHrefs(seedPage, '/student/schedule'), /\/student\/lectures\/([^/?#]+)/)?.[1] ??
  firstMatch(await scrapeHrefs(seedPage, '/student/dashboard'), /\/student\/lectures\/([^/?#]+)/)?.[1] ??
  firstMatch(await scrapeHrefs(seedPage, '/student/calendar'), /\/student\/lectures\/([^/?#]+)/)?.[1] ??
  (PARAMS.offeringId
    ? firstMatch(await scrapeHrefs(seedPage, `/student/courses/${PARAMS.offeringId}`), /\/student\/lectures\/([^/?#]+)/)?.[1]
    : null) ??
  null;
seedHrefs.vision = await scrapeHrefs(seedPage, '/vision');
PARAMS.visionSlug = firstMatch(seedHrefs.vision, /^\/vision\/([^\/?#]+)$/)?.[1] ?? null;
seedHrefs.comp = await scrapeHrefs(seedPage, '/competitions');
PARAMS.compId = firstMatch(seedHrefs.comp, /^\/competitions\/([^/?#]+)/)?.[1] ?? null;
PARAMS.filename =
  firstMatch(await scrapeHrefs(seedPage, '/student/downloads'), /\/document\/([^/?#]+)/)?.[1] ??
  firstMatch(await scrapeHrefs(seedPage, '/student/library'), /\/document\/([^/?#]+)/)?.[1] ??
  firstMatch(await scrapeHrefs(seedPage, '/student/research'), /\/document\/([^/?#]+)/)?.[1] ??
  (PARAMS.offeringId
    ? firstMatch(await scrapeHrefs(seedPage, `/student/courses/${PARAMS.offeringId}`), /\/document\/([^/?#]+)/)?.[1]
    : null) ??
  null;
console.log('[b-verify] params:', JSON.stringify(PARAMS));
/* the authenticated session snapshot replayed into every stream */
const AUTH_STATE = await seedCtx.storageState();
console.log(
  `[b-verify] auth storageState: ${(AUTH_STATE.origins ?? []).map((o) => `${o.origin}:${o.localStorage.length} keys`).join(', ') || 'cookies:' + (AUTH_STATE.cookies ?? []).length}`
);

/* mark unresolved param routes N/A and drop them from measurement
   (every param route ends in its param segment, so an unresolved id
   leaves a trailing '/' — /document/ — which must NOT be measured) */
const measurable = [];
for (const r of ROUTES) {
  const p = slugPath(r.path, PARAMS);
  if (p.includes('{') || p.endsWith('/')) {
    r.cells = { na: `no fixture resolved for ${p}` };
    console.log(`[b-verify] N/A (no fixture): ${r.slug} → ${p}`);
  } else {
    r.cells = {};
    measurable.push(r);
  }
}
await seedCtx.close();

/* ── phase 2: the 5 streams — SEQUENTIAL (the free-tier RAM ceiling:
     5 parallel chromium contexts + fullPage shots crashed the browser
     with ERR_INSUFFICIENT_RESOURCES mid-run) ──────────────────────── */
const t0 = Date.now();
for (const vp of VIEWPORTS) {
  const shot = vp.tag === DARK_VP.tag;
  await runStream(vp, 'light', shot, measurable).catch((e) =>
    console.error('[b-verify] stream failed:', e)
  );
  console.log(`[b-verify] stream ${vp.tag}-light done +${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await runStream(DARK_VP, 'dark', true, measurable).catch((e) =>
  console.error('[b-verify] stream failed:', e)
);
console.log(`[b-verify] streams done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

/* ── the 2MB dark-shot rule ───────────────────────────────────────── */
const kb = (f) => statSync(path.join(OUT, f)).size;
let darkFiles = [];
for (const r of ROUTES) {
  const dl = r.cells?.['390x844-dark']?.shot;
  if (dl) darkFiles.push(dl.file);
}
const totalBytes = (names) => names.reduce((s, f) => s + kb(f), 0);
let allShots = readdirSync(OUT).filter((f) => f.endsWith('.jpg'));
let shotsTotal = totalBytes(allShots);
const droppedDark = [];
if (shotsTotal > 2 * 1024 * 1024) {
  for (const r of ROUTES) {
    const dl = r.cells?.['390x844-dark']?.shot;
    if (dl && !isConverted(r.family)) {
      try {
        unlinkSync(path.join(OUT, dl.file));
      } catch {}
      r.cells['390x844-dark'].shotDropped = true;
      droppedDark.push(r.slug);
    }
  }
  allShots = readdirSync(OUT).filter((f) => f.endsWith('.jpg'));
  shotsTotal = totalBytes(allShots);
}
console.log(
  `[b-verify] shots: ${allShots.length} files, ${(shotsTotal / 1024).toFixed(0)}KB` +
    (droppedDark.length ? `, dark dropped for ${droppedDark.length} r319-family routes` : '')
);

/* ── verdicts + report ────────────────────────────────────────────── */
const CELL_TAGS = [
  '390x844-light',
  '768x1024-light',
  '1024x768-light',
  '1440x900-light',
  '390x844-dark',
];
const defects = [];
let greenCells = 0;
let totalCells = 0;

for (const r of ROUTES) {
  if (r.cells?.na) {
    results.push({ slug: r.slug, path: r.path, family: r.family, na: r.cells.na });
    continue;
  }
  let routeGreen = 0;
  let routeTotal = 0;
  const routeDefects = [];
  const routeInfo = [];
  const cellOut = {};
  for (const tag of CELL_TAGS) {
    const c = r.cells[tag];
    if (!c) {
      cellOut[tag] = { missing: true };
      routeDefects.push(`${tag}: missing cell`);
      continue;
    }
    const d = [];
    if (c.error) d.push(`nav-error: ${c.error}`);
    if (c.h1 !== 1) d.push(`h1-count=${c.h1}`);
    if (c.scrollWidth > c.innerWidth) d.push(`overflow: scrollWidth ${c.scrollWidth} > ${c.innerWidth}`);
    if (c.consoleErrors > 0) d.push(`console-errors=${c.consoleErrors}`);
    if (c.failedRequests > 0) d.push(`failed-requests=${c.failedRequests}`);
    const hard = d.some((x) => !x.startsWith('info-'));
    if (hard) exitDefects++;
    if (hard) routeDefects.push(`${tag}: ${d.filter((x) => !x.startsWith('info-')).join('; ')}`);
    else routeGreen++;
    if (c.h1px != null && c.h1px > 32) routeInfo.push(`${tag}: h1px=${c.h1px}`);
    routeTotal++;
    cellOut[tag] = {
      h1: c.h1,
      h1px: c.h1px,
      scrollWidth: c.scrollWidth,
      innerWidth: c.innerWidth,
      overflow: c.scrollWidth > c.innerWidth,
      consoleErrors: c.consoleErrors ?? null,
      failedRequests: c.failedRequests ?? null,
      root: c.root ?? null,
      url: c.url,
      failedSamples: c.failedSamples ?? null,
      consoleSamples: c.consoleSamples ?? null,
      shot: c.shot ? { file: c.shot.file, kb: +(c.shot.bytes / 1024).toFixed(1) } : (c.shotDropped ? 'dropped-2mb-rule' : null),
    };
    for (const x of d) defects.push({ route: r.slug, tag, defect: x, hard });
  }
  greenCells += routeGreen;
  totalCells += routeTotal;
  results.push({
    slug: r.slug,
    path: r.path,
    family: r.family,
    cellsGreen: `${routeGreen}/${routeTotal}`,
    verdict: routeDefects.length ? 'DEFECT-listed' : 'GREEN',
    info: routeInfo,
    defects: routeDefects,
    cells: cellOut,
  });
}

const coverage = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  rubric: {
    h1: 'count === 1, computed px recorded (≤32 inner; dashboard judged later)',
    overflow: 'documentElement.scrollWidth ≤ innerWidth',
    consoleErrors: 'page.on(console) type=error per route load',
    failedRequests: 'page.on(requestfailed) per route load',
    root: 'opt-in class .r319s-page|.r321x-page|.r321m-page|.r321p-page|.r321c-page',
    roundedScan: 'N/A — skipped per instruction',
  },
  params: PARAMS,
  themeNotes,
  headline: {
    routes: results.filter((r) => !r.na).length,
    routesNA: results.filter((r) => r.na).map((r) => r.slug),
    greenCells,
    totalCells,
    redirects: REDIRECTS.map((r) => ({ from: r.path, cells: r.cells })),
    shots: { files: allShots.length, totalKB: Math.round(shotsTotal / 1024) },
    droppedDark,
  },
  routes: results,
};
writeFileSync(path.join(OUT, 'coverage.json'), JSON.stringify(coverage, null, 1));

/* coverage.md — the §B table */
const md = [];
md.push('# R321 c1 §B coverage sweep — Bverify rubric matrix');
md.push('');
md.push(`- base: \`${BASE}\` (vite preview of the local dist) · generated ${coverage.generatedAt}`);
md.push(`- headline: **${greenCells} green / ${totalCells} cells** — ${results.filter((r) => !r.na).length} routes × ${CELL_TAGS.length} cells (4 viewports light + 390 dark)${coverage.headline.routesNA.length ? `; N/A: ${coverage.headline.routesNA.join(', ')}` : ''}`);
md.push(`- shots: ${allShots.length} jpegs, ${(shotsTotal / 1024).toFixed(0)}KB total${droppedDark.length ? ` (dark dropped for ${droppedDark.length} r319-family routes under the 2MB rule; dark kept for the converted families)` : ''}`);
md.push(`- rounded-corner/shadow scan: **N/A** (skipped per instruction)`);
md.push('');
md.push('| route | family | root | cells green/total | verdict | defects |');
md.push('|---|---|---|---|---|---|');
for (const r of results) {
  if (r.na) {
    md.push(`| \`${r.path}\` | ${r.family} | — | — | N/A | ${r.na} |`);
    continue;
  }
  const roots = new Set(Object.values(r.cells).map((c) => c.root).filter(Boolean));
  md.push(
    `| \`${r.path}\` | ${r.family} | ${roots.size ? [...roots].join('+') : '⚠ none'} | ${r.cellsGreen} | ${r.verdict} | ${r.defects.length ? r.defects.join(' · ').replace(/\|/g, '/') : ''} |`
  );
}
md.push('');
md.push('## redirects');
for (const rd of REDIRECTS) {
  const lands = Object.entries(rd.cells || {})
    .map(([t, c]) => `${t}→${c.url}${c.redirectOK ? '' : ' ✗'}`)
    .join(' · ');
  md.push(`- \`${rd.path}\` → \`${rd.family}\`: ${lands || 'not measured'}`);
}
md.push('');
md.push('## defect list (route · viewport · defect)');
if (!defects.length) md.push('- none');
for (const d of defects) md.push(`- ${d.route} · ${d.tag} · ${d.defect}`);
md.push('');
md.push('## h1 px > 32 (recorded, judged later — the dashboard belt is exempt)');
const h1pxRows = [];
for (const r of results) {
  if (r.na) continue;
  for (const [tag, c] of Object.entries(r.cells)) {
    if (c.h1px != null && c.h1px > 32) h1pxRows.push(`${r.slug}@${tag}: ${c.h1px}px`);
  }
}
md.push(h1pxRows.length ? h1pxRows.map((x) => `- ${x}`).join('\n') : '- none');
md.push('');
md.push('## root opt-in class per family');
const fam = {};
for (const r of results) {
  if (r.na) continue;
  for (const c of Object.values(r.cells)) {
    const k = `${r.family} → ${c.root ?? 'none'}`;
    fam[k] = (fam[k] ?? 0) + 1;
  }
}
for (const [k, v] of Object.entries(fam)) md.push(`- ${k} (${v} cells)`);
writeFileSync(path.join(OUT, 'coverage.md'), md.join('\n') + '\n');

console.log(`[b-verify] headline: ${greenCells}/${totalCells} green cells across ${results.filter((r) => !r.na).length} routes`);
console.log(`[b-verify] exit-defects (console/overflow/h1count/nav-error): ${exitDefects}`);
await browser.close();
process.exit(exitDefects > 0 ? 1 : 0);
