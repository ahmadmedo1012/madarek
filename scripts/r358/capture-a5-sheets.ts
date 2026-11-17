/**
 * R358-UI A5 — real-app contact-sheet capture for the aesthetic review.
 *
 * WHAT: logs one session per role against the REAL local stack (a
 * built-app preview server + the seeded dev API), walks the exact page
 * set the committed A5-before sheets cover, and composes the matching
 * A5-after contact sheets (3 pages × 4 variants = 12 cells per sheet;
 * sheet 08 mirrors the truncated 7-cell before layout). Every page is
 * captured at 1440×900 and 390×844 in BOTH themes (the site's own
 * `madarek-theme` localStorage flip — the same seeding the audit sweep
 * uses) as full-page screenshots.
 *
 * HOW TO RUN (the documented procedure):
 *   1. npm install
 *   2. local stack (see docs/06 for the portable PG recipe):
 *        bash tools/boot-pg.sh
 *        DATABASE_URL=postgresql://madarek@127.0.0.1:5433/madarek \
 *          npm run db:deploy && npm run db:seed
 *        DATABASE_URL=postgresql://madarek@127.0.0.1:5433/madarek \
 *          npm run build -w backend && node backend/dist/server.js &
 *   3. npm run build -w frontend
 *   4. cd frontend && npx vite preview --port 4173 --strictPort &
 *   5. npx tsx scripts/r358/capture-a5-sheets.ts \
 *        --base http://localhost:4173 \
 *        --out docs/redesign/r358-ui/evidence/web \
 *        [--cells /tmp/r358-a5-cells]
 *
 * localhost by construction — the script can never point at a
 * production base (guarded below), and the shared @test.ly accounts are
 * imported from the ONE canonical table (shared/testAccounts), never
 * forked here.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TEST_ACCOUNTS, TEST_PASSWORD, type TestAccountRole } from '../../shared/testAccounts';

/* ── args ──────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const base = arg('--base', 'http://localhost:4173').replace(/\/$/, '');
const outDir = arg('--out', 'docs/redesign/r358-ui/evidence/web');
const cellsDir = arg('--cells', '/tmp/r358-a5-cells');

if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(base)) {
  throw new Error(`--base must be a loopback dev URL (got ${base}) — this capture is local-only.`);
}

/* ── the A5 sheet plan — mirrors A5-before-01..08 exactly ──────────── */
type Role = TestAccountRole | null;
interface Cell {
  label: string;
  route: string;
  role: Role;
}
interface Sheet {
  file: string;
  cells: Cell[];
}

const SHEETS: Sheet[] = [
  { file: 'A5-after-01.png', cells: [
    { label: 'auth', route: '/auth', role: null },
    { label: 'landing', route: '/', role: null },
    { label: 'owner-0', route: '/owner/dashboard', role: 'OWNER' },
  ] },
  { file: 'A5-after-02.png', cells: [
    { label: 'owner-1', route: '/owner/users', role: 'OWNER' },
    { label: 'owner-2', route: '/owner/realtime', role: 'OWNER' },
    { label: 'owner-3', route: '/owner/governance', role: 'OWNER' },
  ] },
  { file: 'A5-after-03.png', cells: [
    { label: 'quality-0', route: '/quality/dashboard', role: 'QUALITY' },
    { label: 'quality-1', route: '/quality/courses', role: 'QUALITY' },
    { label: 'quality-2', route: '/quality/curriculum', role: 'QUALITY' },
  ] },
  { file: 'A5-after-04.png', cells: [
    { label: 'quality-3', route: '/quality/reports', role: 'QUALITY' },
    { label: 'registrar-0', route: '/admin/dashboard', role: 'ADMIN' },
    { label: 'registrar-1', route: '/admin/teachers', role: 'ADMIN' },
  ] },
  { file: 'A5-after-05.png', cells: [
    { label: 'registrar-2', route: '/admin/faculties', role: 'ADMIN' },
    { label: 'registrar-3', route: '/admin/reports', role: 'ADMIN' },
    { label: 'student-0', route: '/student/dashboard', role: 'STUDENT' },
  ] },
  { file: 'A5-after-06.png', cells: [
    { label: 'student-1', route: '/student/courses', role: 'STUDENT' },
    { label: 'student-2', route: '/student/schedule', role: 'STUDENT' },
    { label: 'student-3', route: '/achievements', role: 'STUDENT' },
  ] },
  { file: 'A5-after-07.png', cells: [
    { label: 'teacher-0', route: '/teacher/dashboard', role: 'TEACHER' },
    { label: 'teacher-1', route: '/teacher/schedule', role: 'TEACHER' },
    { label: 'teacher-2', route: '/teacher/students', role: 'TEACHER' },
  ] },
  { file: 'A5-after-08.png', cells: [
    { label: 'teacher-3', route: '/teacher/grades', role: 'TEACHER' },
    { label: 'auth', route: '/auth', role: null },
    { label: 'auth', route: '/auth', role: null },
    { label: 'auth', route: '/auth', role: null },
  ] },
];

const VARIANTS = [
  { key: 'dark-1440', mode: 'dark', width: 1440, height: 900 },
  { key: 'dark-390', mode: 'dark', width: 390, height: 844 },
  { key: 'light-1440', mode: 'light', width: 1440, height: 900 },
  { key: 'light-390', mode: 'light', width: 390, height: 844 },
];

/* cell order inside a sheet = the before-sheet order:
   page1(d,d390,l,l390), page2(…), page3(…) — row-major 3×4. */

/* ── sessions ──────────────────────────────────────────────────────── */
function emailFor(role: Exclude<Role, null>): string {
  const acct = TEST_ACCOUNTS.find((a) => a.role === role && !a.scoped && !a.position);
  if (!acct) throw new Error(`no plain @test.ly account for ${role}`);
  return acct.email;
}

type Session = { user: unknown; accessToken: string };
const sessions = new Map<Exclude<Role, null>, Session>();

async function login(base: string, role: Exclude<Role, null>): Promise<Session> {
  const cached = sessions.get(role);
  if (cached) return cached;
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: emailFor(role), password: TEST_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`login failed for ${role} (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { data: Session };
  sessions.set(role, body.data);
  return body.data;
}

/* ── capture ───────────────────────────────────────────────────────── */
async function main(): Promise<void> {
  const browser = await chromium.launch();
  mkdirSync(cellsDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  interface Shot { file: string; label: string }
  const shots = new Map<string, Shot>(); // `${label}-${variantKey}` → shot

  async function captureCell(cell: Cell, v: (typeof VARIANTS)[number]): Promise<Shot> {
    const key = `${cell.label}-${v.key}`;
    const cached = shots.get(key);
    if (cached) return cached; // S8 reuses S1's auth cells

    const session = cell.role ? await login(base, cell.role) : null;
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 1,
      locale: 'ar',
    });
    await context.addInitScript(
      ([sessionArg, mode]) => {
        try {
          localStorage.setItem(
            'madarek-theme',
            JSON.stringify({ state: { mode, modeUpdatedAt: Date.now() }, version: 2 }),
          );
          sessionStorage.setItem('madarek-intro-skip', '1');
        } catch { /* storage unavailable */ }
        if (sessionArg) {
          try {
            localStorage.setItem(
              'mdrk-auth',
              JSON.stringify({
                state: { user: sessionArg.user, accessToken: sessionArg.accessToken },
                version: 0,
              }),
            );
          } catch { /* ditto */ }
        }
      },
      [session, v.mode] as const,
    );
    const page = await context.newPage();
    await page.goto(base + cell.route, { waitUntil: 'load', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    // let entrance animations + skeletons settle (Heron rhythm ≪ 1s)
    await page.waitForTimeout(2_000);
    // The first-run onboarding tour («أهلاً بك في مدارك») mounts late
    // (after /auth/me resolves) and is session state, not page anatomy —
    // the before sheets captured it dismissed. Escape = skip (the
    // Modal's own contract), retry until the layer is really gone.
    for (let i = 0; i < 4; i++) {
      const flow = page.locator('.onboarding-flow');
      // eslint-disable-next-line no-await-in-loop
      if (!(await flow.isVisible().catch(() => false))) break;
      // eslint-disable-next-line no-await-in-loop
      await page.keyboard.press('Escape');
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(400);
    // viewport capture — the before sheets' framing (fullPage turns the
    // horizontal-journey landing into a 6000px strip)
    const file = path.join(cellsDir, `${key}.png`);
    await page.screenshot({ path: file, fullPage: false });
    await context.close();
    const shot = { file, label: key };
    shots.set(key, shot);
    return shot;
  }

  for (const sheet of SHEETS) {
    for (const cell of sheet.cells) {
      for (const v of VARIANTS) {
        await captureCell(cell, v);
      }
    }
  }

  await browser.close();

  /* ── compose the contact sheets ────────────────────────────────────── */
  const CELL_W = 456;
  const CELL_H = 319;
  const IMG_W = 440;
  const IMG_H = 272;

  function dataUrl(file: string): string {
    return `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  }

  for (const sheet of SHEETS) {
    const cells: string[] = [];
    for (const cell of sheet.cells) {
      for (const v of VARIANTS) {
        const shot = await captureCell(cell, v);
        cells.push(
          `<figure><img src="${dataUrl(shot.file)}" alt="${shot.label}">` +
            `<figcaption>${shot.label}</figcaption></figure>`,
        );
      }
    }
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#efe9da;font:12px system-ui;color:#4b4a45}
      .grid{display:grid;grid-template-columns:repeat(3,${CELL_W}px);grid-auto-rows:${CELL_H}px;gap:0;width:${CELL_W * 3}px}
      figure{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:6px}
      img{max-width:${IMG_W}px;max-height:${IMG_H}px;object-fit:contain;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18)}
      figcaption{letter-spacing:.02em}
    </style><div class="grid">${cells.join('')}</div>`;
    const composeDir = path.join(cellsDir, 'compose');
    mkdirSync(composeDir, { recursive: true });
    const htmlFile = path.join(composeDir, sheet.file.replace('.png', '.html'));
    writeFileSync(htmlFile, html, 'utf8');

    const browser2 = await chromium.launch();
    const page = await browser2.newPage({ viewport: { width: CELL_W * 3, height: CELL_H * 4 } });
    await page.goto('file://' + htmlFile, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const out = path.join(outDir, sheet.file);
    await page.screenshot({ path: out, fullPage: false });
    await browser2.close();
    console.log('wrote', out);
  }

  console.log(`done — ${shots.size} unique cells → sheets in ${outDir}`);
  }

  main().catch((e)=>{ console.error(e); process.exit(1); });
