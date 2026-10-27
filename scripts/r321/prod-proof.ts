/**
 * R321 §A10 — THE PRODUCTION PROOF HARNESS.
 *
 * After every deploy (and now, to open the ratchet), run this against
 * PRODUCTION and archive `audits/evidence/r321/prod/`. Five phases:
 *
 *   1. health     GET /api/v1/health (the honest JSON: buildId +
 *                dbLatencyMs + env) and GET /health (the SPA fallback)
 *                → record the served buildId + latencies.
 *   2. accounts  ALL 10 documented accounts (shared/testAccounts.ts):
 *                (a) API POST /api/v1/auth/login → 200 + accessToken;
 *                (b) UI login at 390×844 (locale ar, light, dsf 2,
 *                chromium) → the role's home route + visible h1 +
 *                screenshot (jpg ≤150 KB). The registrar goes through
 *                THE DEMO PANEL one-tap flow (تعبئة → دخول) exactly
 *                like scripts/r320/login-proof.ts; the panel itself is
 *                proven first (reopen chip → 10 rows). Logins spaced
 *                ≥500 ms (the auth limiter counts failures only, but
 *                be gentle anyway).
 *   3. pages     every public route of the R321 gate list
 *                (scripts/r321/sweep-r321.mjs ROUTES — 19): HTTP 200 +
 *                visible h1 + ZERO console errors + ZERO failed
 *                requests; per-route rows in proof.json.
 *   4. statics   /robots.txt (200 + contains "Sitemap"), /sitemap.xml
 *                (200 + parses as XML + ≥1 <url>), /manifest.webmanifest
 *                (200 + parses as JSON).
 *   5. landing   docH at 390×844 and 1440×900 with the intro-skip
 *                sessionStorage key (scripts/r320/docH-ratchet-probe.mjs
 *                protocol: NO reducedMotion override) + one honest
 *                scroll-perf row per viewport: a rAF frame-time loop
 *                sampled while dispatching 8 wheel scrolls; record
 *                frames sampled, count >33 ms, p95 ms, max ms.
 *
 * Output: proof.json (machine rows) + proof.md (human PASS/FAIL table
 * per phase + honest notes) + jpg shots — exit non-zero on any FAIL.
 *
 * Run (from the repo root):
 *   npx tsx scripts/r321/prod-proof.ts \
 *     [--base https://madarek.onrender.com] \
 *     [--out audits/evidence/r321/prod] \
 *     [--phases health,accounts,pages,statics,landing]
 *
 * Honest notes baked into the report:
 *   - The BROWSER leg is CHROMIUM-only here: WebKit does not launch in
 *     this container (missing system libs, no sudo) — the WebKit leg
 *     runs in CI (tests/e2e ios-webkit job), noted in proof.md.
 *   - The entrance/intro gate is skipped via the same sessionStorage
 *     key every e2e fixture seeds (`madarek-intro-skip=1`) so h1
 *     assertions measure the page, not the loader.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page, Response } from 'playwright-core';

import { TEST_ACCOUNTS, type TestAccount } from '../../shared/testAccounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/* ── CLI ─────────────────────────────────────────────────────────── */
const argv = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  argv.set(process.argv[i]!.replace(/^--/, ''), process.argv[i + 1]!);
}
const BASE = (argv.get('base') ?? 'https://madarek.onrender.com').replace(/\/$/, '');
const OUT_DIR = path.isAbsolute(argv.get('out') ?? '')
  ? (argv.get('out') as string)
  : path.join(REPO_ROOT, argv.get('out') ?? path.join('audits', 'evidence', 'r321', 'prod'));
const PHASES = new Set(
  (argv.get('phases') ?? 'health,accounts,pages,statics,landing').split(',').map((p) => p.trim()),
);

/* ── shared constants ────────────────────────────────────────────── */
/** The standard e2e fixture key that skips the entrance/intro gate
 * (scripts/r320/docH-ratchet-probe.mjs). The callback must stay an
 * INLINE argument — tsx (esbuild keepNames) wraps named function
 * expressions with a `__name` helper that is undefined in the browser
 * once Playwright serializes the callback (measured). */
async function seedIntroSkip(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('madarek-intro-skip', '1');
    } catch {
      /* storage unavailable */
    }
  });
}

/** The R321 gate's public route list (scripts/r321/sweep-r321.mjs ROUTES). */
const PUBLIC_ROUTES: readonly [name: string, route: string][] = [
  ['landing', '/'],
  ['legal-privacy', '/legal/privacy'],
  ['legal-terms', '/legal/terms'],
  ['legal-cookies', '/legal/cookies'],
  ['legal-accessibility', '/legal/accessibility'],
  ['legal-security', '/legal/security'],
  ['legal-data', '/legal/data'],
  ['about', '/about'],
  ['help', '/help'],
  ['contact', '/contact'],
  ['auth', '/auth'],
  ['forgot-password', '/auth/forgot-password'],
  ['colleges', '/colleges'],
  ['campus', '/campus'],
  ['capabilities', '/capabilities'],
  ['not-found', '/404'],
  ['forbidden', '/403'],
  ['server-error', '/500'],
  ['maintenance', '/maintenance'],
];

/** login-proof.ts's mapping — TEACHER covers head/dean/vicedean (their
 * role IS TEACHER; the position only changes what the dashboard shows). */
const ROLE_HOME: Record<TestAccount['role'], string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER: '/owner/dashboard',
};

/** The BOARD's protected Heron ladder — informational drift note only. */
const HERON_DOC_H: Record<number, number> = { 1440: 12355, 390: 11441 };

const MIN_LOGIN_GAP_MS = 500; // ≥500 ms between logins (be gentle)
const SHOT_MAX_BYTES = 150_000;

const slug = (email: string) => email.replace(/@test\.ly$/, '');

/* ── row types ───────────────────────────────────────────────────── */
interface HealthRow {
  endpoint: string;
  httpStatus: number;
  latencyMs: number | null;
  ok?: boolean;
  dbLatencyMs?: number;
  env?: string;
  buildId?: string;
  contentType?: string;
  error?: string;
  pass: boolean;
}
interface PanelCheck {
  openByDefault: boolean;
  reopened: boolean;
  rows: number | null;
  reopenedRows: number | null;
  screenshot: string | null;
  error?: string;
  pass: boolean;
}
interface AccountRow {
  job: string;
  email: string;
  role: TestAccount['role'];
  position?: string;
  scoped?: boolean;
  apiStatus: number;
  apiToken: boolean;
  apiMs: number | null;
  routeReached: string | null;
  routeExpected: string;
  h1: string | null;
  tourDismissed: boolean;
  consoleErrors: number;
  pageErrors: number;
  failedRequests: number;
  screenshot: string | null;
  shotBytes: number | null;
  shotQuality: number | null;
  error?: string;
  pass: boolean;
}
interface PageRow {
  name: string;
  route: string;
  httpStatus: number | null;
  h1: string | null;
  title: string | null;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  ms: number | null;
  error?: string;
  pass: boolean;
}
interface StaticCheck {
  file: string;
  httpStatus: number;
  bytes: number;
  checks: { name: string; pass: boolean; detail: string }[];
  pass: boolean;
}
interface ScrollPerf {
  wheelScrolls: number;
  framesSampled: number;
  framesOver33: number;
  pctOver33: number | null;
  p95Ms: number | null;
  maxMs: number | null;
}
interface LandingRow {
  viewport: string;
  width: number;
  height: number;
  docH: number | null;
  heronDocH: number | null;
  heronDriftPct: number | null;
  scroll: ScrollPerf | null;
  screenshot: string | null;
  shotBytes: number | null;
  error?: string;
  pass: boolean;
}
interface Proof {
  target: string;
  runAt: string;
  harness: string;
  buildId: string | null;
  engine: { name: string; version: string };
  health: HealthRow[];
  accounts: { panel: PanelCheck | null; rows: AccountRow[]; passed: number; total: number };
  pages: { rows: PageRow[]; passed: number; total: number };
  statics: StaticCheck[];
  landing: LandingRow[];
  /** Data-driven honest observations discovered by THIS run (no fixes
   * here — they feed the cycle report as tickets/confirmations). */
  observations: string[];
  summary: { overall: 'PASS' | 'FAIL'; fails: { phase: string; key: string; reason: string }[] };
}

/* ── helpers ─────────────────────────────────────────────────────── */
function p95(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.95 * sorted.length) - 1));
  return Math.round(sorted[idx]! * 10) / 10;
}

/** JPEG screenshot with an enforced ≤150 KB budget (auto quality step-down,
 * then css-scale as the last resort) — never a raw PNG dump. */
async function shoot(page: Page, file: string): Promise<{ name: string; bytes: number; quality: number }> {
  let quality = 70;
  for (;;) {
    await page.screenshot({ path: file, type: 'jpeg', quality });
    const bytes = fs.statSync(file).size;
    if (bytes <= SHOT_MAX_BYTES || quality <= 40) return { name: path.basename(file), bytes, quality };
    quality -= 10;
  }
}

/** One 390×844 context per the accounts contract (locale ar, light, dsf 2). */
async function phoneContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ar',
    colorScheme: 'light',
    deviceScaleFactor: 2,
  });
  await seedIntroSkip(ctx);
  return ctx;
}

/** Collect console errors, page errors and failed requests on a page. */
function attachCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 200)));
  page.on('requestfailed', (req) =>
    failedRequests.push(`${req.method()} ${req.url().replace(BASE, '')} ${req.failure()?.errorText ?? ''}`.slice(0, 200)),
  );
  page.on('response', (res: Response) => {
    if (res.status() >= 400) {
      failedRequests.push(`${res.request().method()} ${res.url().replace(BASE, '')} → ${res.status()}`.slice(0, 200));
    }
  });
  return { consoleErrors, pageErrors, failedRequests };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function timedFetch(url: string, init?: RequestInit): Promise<{ res: Response | null; ms: number; error?: string }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), ...init });
    return { res, ms: Date.now() - t0 };
  } catch (err) {
    return { res: null, ms: Date.now() - t0, error: (err as Error).message };
  }
}

/* ── phase 1 · health ────────────────────────────────────────────── */
async function phaseHealth(proof: Proof): Promise<void> {
  const rows: HealthRow[] = [];

  // The real deployment identifier: /api/v1/health (JSON, no rate limit).
  {
    const { res, ms, error } = await timedFetch(`${BASE}/api/v1/health`);
    let row: HealthRow = {
      endpoint: '/api/v1/health',
      httpStatus: res?.status ?? 0,
      latencyMs: ms,
      error,
      pass: false,
    };
    if (res) {
      row.contentType = res.headers.get('content-type') ?? undefined;
      try {
        const body = (await res.json()) as {
          ok?: boolean;
          dbLatencyMs?: number;
          env?: string;
          buildId?: string;
        };
        row.ok = body.ok;
        row.dbLatencyMs = body.dbLatencyMs;
        row.env = body.env;
        row.buildId = body.buildId;
      } catch (err) {
        row.error = `body not JSON: ${(err as Error).message}`;
      }
    }
    row.pass = row.httpStatus === 200 && row.ok === true && typeof row.buildId === 'string' && !!row.buildId;
    if (row.buildId) proof.buildId = row.buildId;
    rows.push(row);
  }

  // The brief's literal GET /health — the SPA fallback (HTML shell).
  {
    const { res, ms, error } = await timedFetch(`${BASE}/health`);
    const row: HealthRow = {
      endpoint: '/health',
      httpStatus: res?.status ?? 0,
      latencyMs: ms,
      contentType: res?.headers.get('content-type') ?? undefined,
      error,
      pass: res?.status === 200,
    };
    rows.push(row);
  }

  proof.health = rows;
}

/* ── phase 2 · accounts ──────────────────────────────────────────── */
async function checkDemoPanel(browser: Browser): Promise<PanelCheck> {
  /* The panel itself on the target env — login-proof.ts's §C-4/§C-7
   * leg, ADAPTED to the r321 §A8 default: the panel is now OPEN BY
   * DEFAULT (r320 served it closed with a reopen chip). The check
   * proves: 10 rows render, and the close → chip → REOPEN cycle works
   * — whichever default the deploy serves. */
  const ctx = await phoneContext(browser);
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await Promise.race([
      page.locator('.auth-demo-row').first().waitFor({ state: 'visible', timeout: 20_000 }),
      page.locator('.auth-demo-hint-reopen').waitFor({ state: 'visible', timeout: 20_000 }),
    ]).catch(() => undefined); // hydrate race — then branch
    const rows = page.locator('.auth-demo-row');
    const chip = page.locator('.auth-demo-hint-reopen');
    const openByDefault = await rows.first().isVisible().catch(() => false);
    if (!openByDefault) {
      await chip.waitFor({ state: 'visible', timeout: 20_000 });
      await chip.click();
    }
    await rows.first().waitFor({ state: 'visible', timeout: 10_000 });
    const count = await rows.count();

    /* close → the chip returns → reopen → rows again. */
    let reopened = false;
    let reopenedRows: number | null = null;
    const close = page.locator('.auth-demo-hint-close');
    if (await close.isVisible().catch(() => false)) {
      await close.click();
      await chip.waitFor({ state: 'visible', timeout: 10_000 });
      await chip.click();
      await rows.first().waitFor({ state: 'visible', timeout: 10_000 });
      reopenedRows = await rows.count();
      reopened = reopenedRows === count;
    }

    await rows.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const shot = await shoot(page, path.join(OUT_DIR, 'demo-panel-390.jpg'));
    return {
      openByDefault,
      reopened,
      rows: count,
      reopenedRows,
      screenshot: shot.name,
      pass: count === 10 && reopened && reopenedRows === 10,
    };
  } catch (err) {
    return { openByDefault: false, reopened: false, rows: null, reopenedRows: null, screenshot: null, error: (err as Error).message, pass: false };
  } finally {
    await ctx.close();
  }
}

async function apiLogin(account: TestAccount): Promise<Pick<AccountRow, 'apiStatus' | 'apiToken' | 'apiMs' | 'error'> & { ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: account.password }),
      signal: AbortSignal.timeout(20_000),
    });
    let token = false;
    if (res.ok) {
      const body = (await res.json()) as { data?: { accessToken?: string } };
      token = typeof body.data?.accessToken === 'string' && body.data.accessToken.length > 20;
    }
    return {
      apiStatus: res.status,
      apiToken: token,
      apiMs: Date.now() - t0,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { apiStatus: 0, apiToken: false, apiMs: Date.now() - t0, error: (err as Error).message };
  }
}

async function uiLogin(browser: Browser, account: TestAccount): Promise<Pick<AccountRow, 'routeReached' | 'h1' | 'tourDismissed' | 'consoleErrors' | 'pageErrors' | 'failedRequests' | 'screenshot' | 'shotBytes' | 'shotQuality' | 'error'>> {
  const ctx = await phoneContext(browser);
  const page = await ctx.newPage();
  const col = attachCollectors(page);
  try {
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    if (account.email === 'registrar@test.ly') {
      /* THE demo-panel one-tap flow (login-proof.ts): تعبئة fills both
       * fields, the same button flips to دخول and submits. r321 §A8
       * made the panel OPEN BY DEFAULT, so the r320 "click the reopen
       * chip first" step only runs when the deploy serves the panel
       * closed (both behaviours proven here). Wait for the hydrate
       * first (race: rows OR chip), then branch. */
      const rows = page.locator('.auth-demo-row');
      const chip = page.locator('.auth-demo-hint-reopen');
      await Promise.race([
        rows.first().waitFor({ state: 'visible', timeout: 20_000 }),
        chip.waitFor({ state: 'visible', timeout: 20_000 }),
      ]).catch(() => undefined);
      if (!(await rows.first().isVisible().catch(() => false))) {
        await chip.click();
      }
      const fill = page.locator(
        `.auth-demo-row:has(bdi:text-is("${account.email}")) .auth-demo-fill`,
      );
      await fill.first().waitFor({ state: 'visible', timeout: 10_000 });
      await fill.click();
      await page.getByRole('button', { name: `دخول بحساب ${account.job}` }).click();
    } else {
      await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill(account.email);
      await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(account.password);
      await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    }

    const expected = ROLE_HOME[account.role];
    const pattern = new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?|$)');
    await page.waitForURL(pattern, { timeout: 60_000 });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
    const h1 = (await page.locator('h1').first().textContent())?.trim() ?? null;

    /* Best-effort onboarding-tour dismissal so the home screenshot shows
     * the dashboard, not the veil (r320 did this on production too). */
    let tourDismissed = false;
    const skip = page.locator('.onboarding-flow-skip');
    try {
      if (await skip.count()) {
        await skip.first().click({ timeout: 3000 });
        await page.waitForTimeout(600);
        tourDismissed = true;
      }
    } catch {
      /* tour is informational, never fatal */
    }
    await page.waitForTimeout(600); // let the dashboard settle for the shot

    const shot = await shoot(page, path.join(OUT_DIR, `${slug(account.email)}.jpg`));
    return {
      routeReached: new URL(page.url()).pathname,
      h1,
      tourDismissed,
      consoleErrors: col.consoleErrors.length,
      pageErrors: col.pageErrors.length,
      failedRequests: col.failedRequests.length,
      screenshot: shot.name,
      shotBytes: shot.bytes,
      shotQuality: shot.quality,
      error: undefined,
    };
  } catch (err) {
    try {
      await page.screenshot({ path: path.join(OUT_DIR, `${slug(account.email)}-FAIL.jpg`), type: 'jpeg', quality: 60 });
    } catch {
      /* page may be gone */
    }
    return {
      routeReached: null,
      h1: null,
      tourDismissed: false,
      consoleErrors: col.consoleErrors.length,
      pageErrors: col.pageErrors.length,
      failedRequests: col.failedRequests.length,
      screenshot: null,
      shotBytes: null,
      shotQuality: null,
      error: (err as Error).message,
    };
  } finally {
    await ctx.close();
  }
}

async function phaseAccounts(proof: Proof, browser: Browser): Promise<void> {
  const panel = await checkDemoPanel(browser);
  console.log(
    `${panel.pass ? '✅' : '❌'} demo panel: openByDefault=${panel.openByDefault} rows=${panel.rows ?? '—'} ` +
      `reopen→rows=${panel.reopenedRows ?? '—'}${panel.error ? ` err=${panel.error.slice(0, 100)}` : ''}`,
  );

  const rows: AccountRow[] = [];
  let lastLogin = 0;
  for (const account of TEST_ACCOUNTS) {
    const now = Date.now();
    if (now - lastLogin < MIN_LOGIN_GAP_MS) await sleep(MIN_LOGIN_GAP_MS - (now - lastLogin));
    lastLogin = Date.now();

    const api = await apiLogin(account);
    lastLogin = Date.now(); // the API login counts as a login attempt

    const now2 = Date.now();
    if (now2 - lastLogin < MIN_LOGIN_GAP_MS) await sleep(MIN_LOGIN_GAP_MS - (now2 - lastLogin));
    lastLogin = Date.now();
    const ui = await uiLogin(browser, account);
    lastLogin = Date.now();

    const pass = api.apiStatus === 200 && api.apiToken && !!ui.routeReached && !!ui.h1;
    rows.push({
      job: account.job,
      email: account.email,
      role: account.role,
      position: account.position,
      scoped: account.scoped,
      apiStatus: api.apiStatus,
      apiToken: api.apiToken,
      apiMs: api.apiMs,
      routeReached: ui.routeReached,
      routeExpected: ROLE_HOME[account.role],
      h1: ui.h1,
      tourDismissed: ui.tourDismissed,
      consoleErrors: ui.consoleErrors,
      pageErrors: ui.pageErrors,
      failedRequests: ui.failedRequests,
      screenshot: ui.screenshot,
      shotBytes: ui.shotBytes,
      shotQuality: ui.shotQuality,
      error: api.error ?? ui.error,
      pass,
    });
    console.log(
      `${pass ? '✅' : '❌'} ${account.job} <${account.email}> api=${api.apiStatus}(${api.apiMs}ms) ` +
        `token=${api.apiToken} route=${ui.routeReached ?? '—'} h1="${ui.h1?.slice(0, 30) ?? '—'}" ` +
        `${ui.error ? `err=${ui.error.slice(0, 100)}` : ''}`,
    );
  }
  proof.accounts = {
    panel,
    rows,
    passed: rows.filter((r) => r.pass).length,
    total: rows.length,
  };
}

/* ── phase 3 · public pages ──────────────────────────────────────── */
async function phasePages(proof: Proof, browser: Browser): Promise<void> {
  const rows: PageRow[] = [];
  for (const [name, route] of PUBLIC_ROUTES) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'ar',
      colorScheme: 'light',
    });
    await seedIntroSkip(ctx);
    const page = await ctx.newPage();
    const col = attachCollectors(page);
    const row: PageRow = {
      name,
      route,
      httpStatus: null,
      h1: null,
      title: null,
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
      ms: null,
      pass: false,
    };
    const t0 = Date.now();
    try {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      row.httpStatus = res ? res.status() : null;
      await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
      row.h1 = (await page.locator('h1').first().textContent())?.trim() ?? null;
      row.title = await page.title();
      // best-effort settle: let hydration finish so console/network
      // failures are actually heard (never fatal if it never idles).
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(800);
    } catch (err) {
      row.error = (err as Error).message;
    }
    row.ms = Date.now() - t0;
    row.consoleErrors = col.consoleErrors;
    row.pageErrors = col.pageErrors;
    row.failedRequests = col.failedRequests;
    row.pass =
      row.httpStatus === 200 &&
      !!row.h1 &&
      row.consoleErrors.length === 0 &&
      row.pageErrors.length === 0 &&
      row.failedRequests.length === 0;
    rows.push(row);
    await ctx.close();
    console.log(
      `${row.pass ? '✅' : '❌'} ${route} (${row.httpStatus ?? '—'}, ${row.ms}ms) h1="${row.h1?.slice(0, 24) ?? '—'}" ` +
        `console=${row.consoleErrors.length} page=${row.pageErrors.length} failed=${row.failedRequests.length}` +
        `${row.error ? ` err=${row.error.slice(0, 80)}` : ''}`,
    );
  }
  proof.pages = { rows, passed: rows.filter((r) => r.pass).length, total: rows.length };
}

/* ── phase 4 · static files ──────────────────────────────────────── */
async function phaseStatics(proof: Proof, browser: Browser): Promise<void> {
  const out: StaticCheck[] = [];

  /* robots.txt — 200 + contains "Sitemap" */
  {
    const { res, ms, error } = await timedFetch(`${BASE}/robots.txt`);
    const checks: StaticCheck['checks'] = [];
    let body = '';
    if (res && res.ok) body = await res.text();
    checks.push({ name: 'http 200', pass: res?.status === 200, detail: `${res?.status ?? 0} (${ms}ms)` });
    checks.push({ name: 'contains "Sitemap"', pass: body.includes('Sitemap'), detail: body.includes('Sitemap') ? 'found' : 'absent' });
    out.push({
      file: '/robots.txt',
      httpStatus: res?.status ?? 0,
      bytes: Buffer.byteLength(body),
      checks,
      pass: checks.every((c) => c.pass),
    });
    if (error) out[out.length - 1]!.checks.push({ name: 'fetch', pass: false, detail: error });
  }

  /* sitemap.xml — 200 + parses as XML + ≥1 <url> (DOMParser, a real parse) */
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const { res, ms } = await timedFetch(`${BASE}/sitemap.xml`);
    const checks: StaticCheck['checks'] = [];
    let body = '';
    if (res && res.ok) body = await res.text();
    checks.push({ name: 'http 200', pass: res?.status === 200, detail: `${res?.status ?? 0} (${ms}ms)` });
    let parsed: { parserError: string | null; urls: number } = { parserError: 'not fetched', urls: 0 };
    if (body) {
      parsed = await page.evaluate((xml: string) => {
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const pe = doc.querySelector('parsererror');
        return {
          parserError: pe ? (pe.textContent ?? 'parsererror').slice(0, 120) : null,
          urls: doc.getElementsByTagName('url').length,
        };
      }, body);
    }
    checks.push({ name: 'parses as XML', pass: !parsed.parserError, detail: parsed.parserError ?? 'valid' });
    checks.push({ name: '≥1 <url>', pass: parsed.urls >= 1, detail: `${parsed.urls} <url>` });
    out.push({
      file: '/sitemap.xml',
      httpStatus: res?.status ?? 0,
      bytes: Buffer.byteLength(body),
      checks,
      pass: checks.every((c) => c.pass),
    });
    await ctx.close();
  }

  /* manifest.webmanifest — 200 + parses as JSON */
  {
    const { res, ms } = await timedFetch(`${BASE}/manifest.webmanifest`);
    const checks: StaticCheck['checks'] = [];
    let body = '';
    if (res && res.ok) body = await res.text();
    checks.push({ name: 'http 200', pass: res?.status === 200, detail: `${res?.status ?? 0} (${ms}ms)` });
    let jsonOk = false;
    let jsonDetail = 'not fetched';
    try {
      const parsed = JSON.parse(body) as { name?: string; short_name?: string };
      jsonOk = true;
      jsonDetail = `name="${parsed.name ?? '—'}" short_name="${parsed.short_name ?? '—'}"`;
    } catch (err) {
      jsonDetail = `JSON.parse: ${(err as Error).message}`;
    }
    checks.push({ name: 'parses as JSON', pass: jsonOk, detail: jsonDetail });
    out.push({
      file: '/manifest.webmanifest',
      httpStatus: res?.status ?? 0,
      bytes: Buffer.byteLength(body),
      checks,
      pass: checks.every((c) => c.pass),
    });
  }

  proof.statics = out;
  for (const s of out) console.log(`${s.pass ? '✅' : '❌'} ${s.file}: ${s.checks.map((c) => `${c.pass ? 'ok' : 'FAIL'} ${c.name}`).join(' · ')}`);
}

/* ── phase 5 · landing docH + scroll-perf ─────────────────────────── */
async function phaseLanding(proof: Proof, browser: Browser): Promise<void> {
  const rows: LandingRow[] = [];
  for (const [w, h] of [[390, 844], [1440, 900]] as const) {
    // The honest docH-ratchet protocol: NO reducedMotion override.
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ar', colorScheme: 'light' });
    await seedIntroSkip(ctx);
    const page = await ctx.newPage();
    const row: LandingRow = {
      viewport: `${w}x${h}`,
      width: w,
      height: h,
      docH: null,
      heronDocH: HERON_DOC_H[w] ?? null,
      heronDriftPct: null,
      scroll: null,
      screenshot: null,
      shotBytes: null,
      pass: false,
    };
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
      await page.waitForTimeout(1200);
      row.docH = await page.evaluate(() => document.documentElement.scrollHeight);
      if (row.heronDocH) row.heronDriftPct = Math.round(((row.docH - row.heronDocH) / row.heronDocH) * 1000) / 10;
      const shot = await shoot(page, path.join(OUT_DIR, `landing-${w}.jpg`));
      row.screenshot = shot.name;
      row.shotBytes = shot.bytes;

      /* scroll-perf: rAF frame-time loop while 8 wheel scrolls land.
       * Evaluated as a STRING IIFE — immune to tsx's `__name` wrapping
       * (esbuild keepNames injects `__name(...)` around named function
       * expressions AND declarations, which is undefined in the browser
       * once Playwright serializes a callback — measured). */
      await page.evaluate(`(() => {
        window.scrollTo(0, 0);
        window.__ft = [];
        window.__rafOn = true;
        const loop = (t) => {
          if (!window.__rafOn) return;
          window.__ft.push(t);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      })()`);
      await page.mouse.move(Math.floor(w / 2), Math.floor(h / 2));
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, 600);
        await sleep(120);
      }
      await sleep(1200); // trailing long frames land here
      const stamps = (await page.evaluate(`(() => {
        window.__rafOn = false;
        return window.__ft;
      })()`)) as number[];
      const deltas: number[] = [];
      for (let i = 1; i < stamps.length; i++) deltas.push(Math.round((stamps[i]! - stamps[i - 1]!) * 10) / 10);
      const sorted = [...deltas].sort((a, b) => a - b);
      const over = deltas.filter((d) => d > 33).length;
      row.scroll = {
        wheelScrolls: 8,
        framesSampled: deltas.length,
        framesOver33: over,
        pctOver33: deltas.length ? Math.round((over / deltas.length) * 1000) / 10 : null,
        p95Ms: p95(sorted),
        maxMs: sorted.length ? sorted[sorted.length - 1]! : null,
      };
      row.pass = row.docH > 0 && !!row.scroll && row.scroll.framesSampled > 20;
    } catch (err) {
      row.error = (err as Error).message;
    }
    rows.push(row);
    await ctx.close();
    console.log(
      `${row.pass ? '✅' : '❌'} landing ${row.viewport}: docH=${row.docH ?? '—'}` +
        (row.heronDocH ? ` (Heron ${row.heronDocH}, ${row.heronDriftPct}%)` : '') +
        ` · scroll frames=${row.scroll?.framesSampled ?? '—'} >33ms=${row.scroll?.framesOver33 ?? '—'}` +
        ` (${row.scroll?.pctOver33 ?? '—'}%) p95=${row.scroll?.p95Ms ?? '—'}ms max=${row.scroll?.maxMs ?? '—'}ms` +
        `${row.error ? ` err=${row.error.slice(0, 100)}` : ''}`,
    );
  }
  proof.landing = rows;
}

/* ── report ──────────────────────────────────────────────────────── */
function renderMd(proof: Proof): string {
  const L: string[] = [];
  const shotTotal = fs
    .readdirSync(OUT_DIR)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
    .reduce((n, f) => n + fs.statSync(path.join(OUT_DIR, f)).size, 0);

  L.push(`# R321 §A10 — Production proof — ${proof.target}`, '');
  L.push(
    `**Run:** ${proof.runAt} · **buildId proven:** \`${proof.buildId ?? 'unknown'}\` · ` +
      `**engine:** ${proof.engine.name} ${proof.engine.version} (playwright-core) · ` +
      `**harness:** \`${proof.harness}\``,
    '',
  );
  L.push(`**Overall: ${proof.summary.overall}** — ${proof.summary.fails.length} FAIL row(s).`, '');

  /* phase 1 */
  L.push('## 1 · Health', '');
  L.push('| endpoint | status | latency | db | env | buildId | result |');
  L.push('|---|---|---|---|---|---|---|');
  for (const h of proof.health) {
    L.push(
      `| ${h.endpoint} | ${h.httpStatus} | ${h.latencyMs} ms | ${h.dbLatencyMs ?? '—'} | ${h.env ?? '—'} | ` +
        `\`${h.buildId ?? '—'}\` | ${h.pass ? 'PASS' : 'FAIL'}${h.error ? ` (${h.error.slice(0, 60)})` : ''} |`,
    );
  }
  L.push('');

  /* phase 2 */
  L.push('## 2 · Accounts (all 10, API + UI @390)', '');
  const panel = proof.accounts.panel;
  if (panel) {
    L.push(
      `Demo panel: ${panel.pass ? 'PASS' : 'FAIL'} — openByDefault=${panel.openByDefault} ` +
        `rows=${panel.rows ?? '—'} · close→chip→reopen cycle: ${panel.reopened ? 'works' : 'FAILED'} ` +
        `(reopen→rows=${panel.reopenedRows ?? '—'})${panel.screenshot ? ` · ${panel.screenshot}` : ''}` +
        `${panel.error ? ` · err=${panel.error.slice(0, 80)}` : ''}`,
      '',
    );
    L.push(
      '> NOTE (recorded, not fixed here): since r321 §A8 the demo panel ' +
      'is open BY DEFAULT on every build that does not set ' +
      '`VITE_SHOW_TEST_ACCOUNTS=0` — production included: every visitor ' +
      'sees the 10 demo credentials expanded.',
      '',
    );
  }
  L.push('| job | email | role | API | token | api ms | route | h1 | shot | result |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of proof.accounts.rows) {
    const roleDetail = r.position ? `${r.role} · ${r.position}` : r.role;
    L.push(
      `| ${r.job} | ${r.email} | ${roleDetail} | ${r.apiStatus} | ${r.apiToken ? '✓' : '✗'} | ${r.apiMs ?? '—'} | ` +
        `${r.routeReached ?? '—'} | ${r.h1?.slice(0, 40) ?? '—'} | ${r.screenshot ?? '—'} | ${r.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  L.push(
    '',
    `**${proof.accounts.passed}/${proof.accounts.total} accounts fully proven** (API 200 + token + role home + h1). ` +
      `Logins spaced ≥${MIN_LOGIN_GAP_MS} ms; the auth limiter counts failures only.`,
    '',
  );

  /* phase 3 */
  L.push('## 3 · Public pages (the R321 gate list, @390)', '');
  L.push('| route | http | h1 | ms | console | page | failed | result |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of proof.pages.rows) {
    L.push(
      `| ${r.route} | ${r.httpStatus ?? '—'} | ${r.h1?.slice(0, 40) ?? '—'} | ${r.ms ?? '—'} | ` +
        `${r.consoleErrors.length} | ${r.pageErrors.length} | ${r.failedRequests.length} | ${r.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  L.push('', `**${proof.pages.passed}/${proof.pages.total} public pages clean** (200 + h1 + zero console errors + zero failed requests).`, '');

  /* phase 4 */
  L.push('## 4 · Static files', '');
  L.push('| file | http | bytes | checks | result |');
  L.push('|---|---|---|---|---|');
  for (const s of proof.statics) {
    L.push(
      `| ${s.file} | ${s.httpStatus} | ${s.bytes} | ${s.checks.map((c) => `${c.pass ? '✓' : '✗'} ${c.name} (${c.detail})`).join(' · ')} | ${s.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  L.push('');

  /* phase 5 */
  L.push('## 5 · Landing docH + scroll-perf (intro skipped, no RM override)', '');
  L.push('| viewport | docH | vs Heron | frames | >33 ms | % >33 | p95 ms | max ms | shot | result |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of proof.landing) {
    L.push(
      `| ${r.viewport} | ${r.docH ?? '—'} | ${r.heronDocH ? `${r.heronDriftPct}%` : '—'} | ` +
        `${r.scroll?.framesSampled ?? '—'} | ${r.scroll?.framesOver33 ?? '—'} | ${r.scroll?.pctOver33 ?? '—'}% | ` +
        `${r.scroll?.p95Ms ?? '—'} | ${r.scroll?.maxMs ?? '—'} | ${r.screenshot ?? '—'} | ${r.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  L.push(
    '',
    'Protocol: 8 wheel scrolls of 600 px at ~120 ms spacing from the top of `/`, ' +
      'frame deltas sampled via a rAF loop (`scripts/r320/docH-ratchet-probe.mjs` intro-skip key; ' +
      'NO reducedMotion override — the honest R319 protocol). Numbers are raw and ' +
      'honest — they feed the cycle report (§A1 desktop perf ticket owns the target).',
    '',
  );

  /* tickets */
  if (proof.summary.fails.length) {
    L.push('## Discovered tickets (FAIL rows — recorded, NOT fixed here)', '');
    for (const f of proof.summary.fails) L.push(`- **[${f.phase}] ${f.key}** — ${f.reason}`);
    L.push('');
  } else {
    L.push('## Discovered tickets', '', 'None — zero FAIL rows this run.', '');
  }

  /* observations */
  if (proof.observations.length) {
    L.push('## Observations (data-driven, recorded — not fixed here)', '');
    for (const o of proof.observations) L.push(`- ${o}`);
    L.push('');
  }

  /* honest notes */
  L.push('## Honest notes', '');
  L.push(
    `- **WebKit leg = CI**: this harness runs chromium only — WebKit does not ` +
      `launch in this container (missing system libs, no sudo). The iOS/WebKit ` +
      `leg runs in CI (\`e2e-ios\` job, pinned ubuntu-24.04).`,
  );
  L.push(
    `- The entrance/intro loader is skipped via the standard e2e fixture key ` +
      `(\`sessionStorage madarek-intro-skip=1\`) on every page so h1 assertions ` +
      `measure the page, not the loader gate.`,
  );
  L.push(
    `- UI logins: fresh context per account (390×844, locale ar, light, ` +
      `deviceScaleFactor 2); the registrar goes through the demo panel one-tap ` +
      `flow (تعبئة → دخول); the onboarding tour is best-effort dismissed ` +
      `before each home screenshot (recorded per row).`,
  );
  L.push(
    `- Screenshots: JPEG, quality auto-stepped to keep each ≤150 KB; evidence ` +
      `dir total ${(shotTotal / 1024).toFixed(0)} KB (budget 2 MB). No raw PNG dumps.`,
  );
  L.push(
    `- docH drift vs the BOARD's Heron column is informational here (the §A2 ` +
      `ratchet gates the local build; production serves its own deploy).`,
  );
  return L.join('\n') + '\n';
}

/* ── main ────────────────────────────────────────────────────────── */
async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const proof: Proof = {
    target: BASE,
    runAt: new Date().toISOString(),
    harness: 'scripts/r321/prod-proof.ts',
    buildId: null,
    engine: { name: 'chromium', version: browser.version() },
    health: [],
    accounts: { panel: null, rows: [], passed: 0, total: 0 },
    pages: { rows: [], passed: 0, total: 0 },
    statics: [],
    landing: [],
    observations: [],
    summary: { overall: 'FAIL', fails: [] },
  };

  try {
    if (PHASES.has('health')) await phaseHealth(proof);
    if (PHASES.has('accounts')) await phaseAccounts(proof, browser);
    if (PHASES.has('pages')) await phasePages(proof, browser);
    if (PHASES.has('statics')) await phaseStatics(proof, browser);
    if (PHASES.has('landing')) await phaseLanding(proof, browser);
  } finally {
    await browser.close();
  }

  /* summary + data-driven observations */
  const fails: Proof['summary']['fails'] = [];
  for (const h of proof.health) if (!h.pass) fails.push({ phase: 'health', key: h.endpoint, reason: `${h.httpStatus} ${h.error ?? 'not ok'}` });
  if (proof.accounts.panel && !proof.accounts.panel.pass)
    fails.push({
      phase: 'accounts',
      key: 'demo-panel',
      reason: `rows=${proof.accounts.panel.rows} reopened=${proof.accounts.panel.reopenedRows}`,
    });
  for (const r of proof.accounts.rows)
    if (!r.pass) fails.push({ phase: 'accounts', key: r.email, reason: `api=${r.apiStatus} token=${r.apiToken} route=${r.routeReached} ${r.error ?? ''}`.trim() });
  for (const r of proof.pages.rows)
    if (!r.pass)
      fails.push({
        phase: 'pages',
        key: r.route,
        reason: `http=${r.httpStatus} h1=${r.h1 ? 'yes' : 'NO'} console=${r.consoleErrors.length} page=${r.pageErrors.length} failed=${r.failedRequests.length} ${r.error ?? ''}`.trim(),
      });
  for (const s of proof.statics) if (!s.pass) fails.push({ phase: 'statics', key: s.file, reason: s.checks.filter((c) => !c.pass).map((c) => `${c.name} (${c.detail})`).join(', ') });
  for (const r of proof.landing) if (!r.pass) fails.push({ phase: 'landing', key: r.viewport, reason: `${r.error ?? 'incomplete'} docH=${r.docH}` });
  proof.summary = { overall: fails.length ? 'FAIL' : 'PASS', fails };

  /* observations are DATA-DRIVEN from this run — honest, never fixes */
  if (proof.accounts.panel?.openByDefault) {
    proof.observations.push(
      '**Demo panel open-by-default on PRODUCTION** (r321 §A8 semantic): every ' +
      'visitor sees the 10 demo credentials expanded. §A8 asked for ' +
      '"open by default in development" — the owner should decide whether ' +
      'production should ship collapsed-with-chip (build with ' +
      '`VITE_SHOW_TEST_ACCOUNTS=0`) — RECORDED, not fixed here.',
    );
  }
  const desktop = proof.landing.find((l) => l.width === 1440);
  if (desktop?.scroll && desktop.scroll.pctOver33 !== null && desktop.scroll.pctOver33 > 2) {
    proof.observations.push(
      `**§A1 (desktop perf) confirmed OPEN on production**: ${desktop.scroll.pctOver33}% frames >33 ms ` +
      `(p95 ${desktop.scroll.p95Ms} ms · max ${desktop.scroll.maxMs} ms over ` +
      `${desktop.scroll.framesSampled} frames) vs the ≤2 % target — the cycle-1 ` +
      'A1 work continues; these rows are the honest production baseline.',
    );
  }
  const drifts = proof.landing.filter((l) => l.heronDriftPct !== null).map((l) => Math.abs(l.heronDriftPct!));
  if (drifts.length && drifts.every((d) => d <= 1.5)) {
    proof.observations.push(
      `**§A2 (docH ratchet) holds on production** for this deploy: both viewports ` +
      `inside ±1.5% of Heron (${proof.landing.map((l) => `${l.viewport}: ${l.docH} (${l.heronDriftPct}%)`).join(' · ')}).`,
    );
  }

  fs.writeFileSync(path.join(OUT_DIR, 'proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'proof.md'), renderMd(proof));

  console.log(`\nbuildId proven: ${proof.buildId ?? 'unknown'}`);
  console.log(
    `accounts ${proof.accounts.passed}/${proof.accounts.total} · pages ${proof.pages.passed}/${proof.pages.total} · ` +
      `statics ${proof.statics.filter((s) => s.pass).length}/${proof.statics.length} · landing ${proof.landing.filter((l) => l.pass).length}/${proof.landing.length}`,
  );
  console.log(`overall ${proof.summary.overall} → ${path.relative(REPO_ROOT, OUT_DIR)}/proof.md`);
  if (fails.length) process.exitCode = 1;
}

void main();
