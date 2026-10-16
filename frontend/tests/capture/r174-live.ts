/**
 * r174-live.ts — production verification against the live deployment:
 * real login (runtime-supplied credentials), real dashboard, DOM probe
 * of the fixed doughnut + mobile screenshot.
 *
 * r175 harness rules (the r174 defects, fixed):
 *  · Credentials are RUNTIME inputs — SMOKE_EMAIL + SMOKE_PASSWORD
 *    (the documented smoke-deploy.mjs convention). No demo values are
 *    hardcoded and none are guessed: without BOTH variables the
 *    authenticated check reports BLOCKED and exits 2 without sending
 *    a single login request.
 *  · ONE login attempt per invocation: the form is filled and the
 *    submit button is clicked exactly once (no Enter+click double
 *    submission). A failed attempt is reported honestly — no second
 *    try, no API fallback that would double the attempts.
 *  · Authentication is verified by IDENTITY, not by injection: the
 *    token the app itself persisted is read back and validated against
 *    GET /api/v1/auth/me (role must echo SMOKE_ROLE, default STUDENT).
 *  · Route, page content, console errors and failed /api requests are
 *    all checked; the probe fails (exit 1) when any of them breaks.
 *
 * Deterministic + parameterized for release verification:
 *   BASE_URL   (default https://madarek.onrender.com)
 *   SMOKE_EMAIL / SMOKE_PASSWORD / SMOKE_ROLE (default STUDENT)
 *   CAPTURE_DIR (default /tmp/r174-captures)
 * Exit codes: 0 pass · 1 fail · 2 authenticated check BLOCKED (no creds).
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'https://madarek.onrender.com';
const CAPTURE_DIR = process.env.CAPTURE_DIR ?? '/tmp/r174-captures';
const SMOKE_ROLE = process.env.SMOKE_ROLE ?? 'STUDENT';
const DASHBOARD_PATH = SMOKE_ROLE === 'STUDENT' ? '/student/dashboard' : `/${SMOKE_ROLE.toLowerCase()}/dashboard`;

interface AuthStore {
  state?: { user?: { role?: string }; accessToken?: string };
}

function credsState() {
  const email = typeof process.env.SMOKE_EMAIL === 'string' ? process.env.SMOKE_EMAIL.trim() : '';
  const password = typeof process.env.SMOKE_PASSWORD === 'string' ? process.env.SMOKE_PASSWORD : '';
  if (email.length > 0 && password.length > 0) return { kind: 'ready' as const, email, password };
  if (email.length > 0 || password.length > 0) return { kind: 'half' as const };
  return { kind: 'absent' as const };
}

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

async function main(): Promise<void> {
  const creds = credsState();
  if (creds.kind !== 'ready') {
    console.log(
      `AUTH CHECK: BLOCKED — ${
        creds.kind === 'half'
          ? 'SMOKE_EMAIL و SMOKE_PASSWORD يجب أن يُزوَّدا معًا / both are required together'
          : 'بلا SMOKE_EMAIL/SMOKE_PASSWORD — لا محاولة دخول تخمينية / no credentials supplied, no speculative login'
      }`,
    );
    process.exit(2);
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  const failedApi: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('response', (res) => {
    if (res.url().startsWith(BASE) && res.url().includes('/api/') && res.status() >= 400) {
      failedApi.push(`${res.status()} ${new URL(res.url()).pathname}`);
    }
  });

  // 1. Real login through the real form — exactly ONE submission.
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('#auth-email').first();
  const passInput = page.locator('#auth-password').first();
  await emailInput.waitFor({ state: 'visible', timeout: 20_000 });
  await emailInput.fill(creds.email);
  await passInput.fill(creds.password);
  const submit = page.locator('button[type="submit"]').first();
  await submit.click(); // the ONE login attempt — no Enter, no second click

  // 2. Wait for the app to accept the session (the store persists the
  //    token on success). Timeout ⇒ one honest failed attempt.
  let auth: AuthStore | null = null;
  try {
    auth = await page.waitForFunction(
      () => {
        const raw = localStorage.getItem('mdrk-auth');
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw) as AuthStore;
          return parsed.state?.accessToken ? parsed : null;
        } catch {
          return null;
        }
      },
      { timeout: 20_000, pollInterval: 250 },
    ).then((h) => h.jsonValue() as Promise<AuthStore>);
  } catch {
    const shown = await page
      .locator('.alert, [role="alert"], .form-error')
      .first()
      .textContent()
      .catch(() => null);
    console.log(`LOGIN: FAIL (one attempt, ${maskEmail(creds.email)}) — page message: ${shown ?? '(none rendered)'}`);
    await browser.close();
    process.exit(1);
  }
  const token = auth.state?.accessToken ?? '';
  const storeRole = auth.state?.user?.role ?? null;

  // 3. Identity verification: the token itself must satisfy /auth/me and
  //    echo the expected role. A localStorage value alone proves nothing.
  const meRes = await ctx.request.get(`${BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let meRole: string | null = null;
  if (meRes.ok()) {
    const meBody = (await meRes.json().catch(() => null)) as { data?: { role?: string } } | null;
    meRole = meBody?.data?.role ?? null;
  }
  const identityOk = meRes.status() === 200 && meRole === SMOKE_ROLE && storeRole === SMOKE_ROLE;
  console.log(
    `LOGIN: ${identityOk ? 'OK' : 'FAIL'} (one attempt, ${maskEmail(creds.email)}) · /me HTTP ${meRes.status()} · role=${meRole ?? 'missing'} (expected ${SMOKE_ROLE}${storeRole ? `, store=${storeRole}` : ''})`,
  );

  // 4. The real dashboard.
  await page.goto(`${BASE}${DASHBOARD_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const probe = await page.evaluate(() => {
    const el = document.querySelector('.dash-doughnut') as HTMLElement | null;
    const url = location.href;
    const greeting = document.querySelector('.page-title')?.textContent?.slice(0, 40) ?? null;
    if (!el) return { url, greeting, doughnut: 'NOT FOUND' as const };
    const cs = getComputedStyle(el);
    return {
      url,
      greeting,
      doughnut: {
        background: cs.backgroundImage.slice(0, 60),
        opacity: cs.opacity,
        borderRadius: cs.borderRadius,
        overflow: cs.overflow,
        center: el.querySelector('.dash-doughnut-center')?.textContent ?? null,
      },
      kpiCount: document.querySelectorAll('.grid-4 .metric').length,
    };
  });
  console.log('LIVE PROBE:', JSON.stringify(probe, null, 1));
  await mkdir(CAPTURE_DIR, { recursive: true });
  await page.screenshot({ path: `${CAPTURE_DIR}/LIVE-student-dashboard-m390.png`, fullPage: true });
  console.log('CONSOLE ERRORS:', consoleErrors.length > 0 ? consoleErrors.slice(0, 5) : 'none');
  console.log('FAILED API:', failedApi.length > 0 ? failedApi.slice(0, 10) : 'none');

  const onDashboard = new URL(page.url()).pathname === DASHBOARD_PATH;
  const contentOk = typeof probe.greeting === 'string' && probe.greeting.length > 0;
  const doughnutOk = probe.doughnut !== 'NOT FOUND';
  const clean = consoleErrors.length === 0 && failedApi.length === 0;
  const pass = identityOk && onDashboard && contentOk && doughnutOk && clean;
  console.log(`RESULT: ${pass ? 'PASS' : 'FAIL'} (identity·route·content·doughnut·clean console)`);
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
