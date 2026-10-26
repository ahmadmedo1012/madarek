/**
 * R320 §C — the honest local login proof (the §C-7 bar).
 *
 * For EVERY documented test account (shared/testAccounts.ts):
 *   (a) API login — POST /api/v1/auth/login → expect 200 + accessToken;
 *   (b) UI login at 390px — fill email + password on /auth, submit,
 *       wait for the role's home route, screenshot → audits/evidence/
 *       r320/accounts/<job-slug>.jpg (≤150 KB).
 *
 * Stack contract (boot it first — see docs/redesign/r319/STACK.md):
 *   MADAREK_TEST_ACCOUNTS=1 MADAREK_API_PORT=4253 MADAREK_WEB_PORT=4254
 *   MADAREK_PG_PORT=5434 …  (the seed + boot ensure create the accounts)
 *
 * Run:  npx tsx scripts/r320/login-proof.ts \
 *         --api http://localhost:4253 --web http://localhost:4254
 *
 * Notes:
 *   - The auth rate limiter only counts FAILED attempts
 *     (skipSuccessfulRequests) — the 20 successful logins here never
 *     trip it.
 *   - The R318 entrance loader is skipped via the same sessionStorage
 *     key the e2e fixtures seed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

import { TEST_ACCOUNTS, type TestAccount } from '../../shared/testAccounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'audits', 'evidence', 'r320', 'accounts');

const argv = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  argv.set(process.argv[i]!.replace(/^--/, ''), process.argv[i + 1]!);
}
const API = argv.get('api') ?? 'http://localhost:4253';
const WEB = argv.get('web') ?? 'http://localhost:4254';

const ROLE_HOME: Record<TestAccount['role'], string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER: '/owner/dashboard',
};

const slug = (email: string) => email.replace(/@test\.ly$/, '');

interface Row {
  job: string;
  email: string;
  role: TestAccount['role'];
  apiStatus: number;
  apiToken: boolean;
  routeReached: string | null;
  screenshot: string | null;
  error?: string;
}

async function apiLogin(account: TestAccount): Promise<Pick<Row, 'apiStatus' | 'apiToken' | 'error'>> {
  try {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: account.password }),
      signal: AbortSignal.timeout(15_000),
    });
    let token = false;
    if (res.ok) {
      const body = (await res.json()) as { data?: { accessToken?: string } };
      token = typeof body.data?.accessToken === 'string' && body.data.accessToken.length > 20;
    }
    return { apiStatus: res.status, apiToken: token, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { apiStatus: 0, apiToken: false, error: (err as Error).message };
  }
}

async function uiLogin(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  account: TestAccount,
): Promise<Pick<Row, 'routeReached' | 'screenshot' | 'error'>> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ar',
    colorScheme: 'light',
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('madarek-intro-skip', '1');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto(`${WEB}/auth`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill(account.email);
    await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(account.password);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    const expected = ROLE_HOME[account.role];
    const pattern = new RegExp(
      expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?|$)',
    );
    await page.waitForURL(pattern, { timeout: 45_000 });
    // The page must actually render (its H1), not just route.
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(600); // let the dashboard settle for the shot

    const shot = path.join(OUT_DIR, `${slug(account.email)}.jpg`);
    await page.screenshot({ path: shot, type: 'jpeg', quality: 72, fullPage: false });
    return { routeReached: new URL(page.url()).pathname, screenshot: path.basename(shot), error: undefined };
  } catch (err) {
    // Best-effort failure screenshot for the evidence dir.
    try {
      await page.screenshot({
        path: path.join(OUT_DIR, `${slug(account.email)}-FAIL.jpg`),
        type: 'jpeg',
        quality: 60,
      });
    } catch {
      /* page may be gone */
    }
    return { routeReached: null, screenshot: null, error: (err as Error).message };
  } finally {
    await context.close();
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows: Row[] = [];

  const browser = await chromium.launch();
  try {
    for (const account of TEST_ACCOUNTS) {
      const api = await apiLogin(account);
      const ui = await uiLogin(browser, account);
      rows.push({
        job: account.job,
        email: account.email,
        role: account.role,
        apiStatus: api.apiStatus,
        apiToken: api.apiToken,
        routeReached: ui.routeReached,
        screenshot: ui.screenshot,
        error: api.error ?? ui.error,
      });
      console.log(
        `${ui.routeReached && api.apiToken ? '✅' : '❌'} ${account.job} <${account.email}> api=${api.apiStatus}` +
          ` token=${api.apiToken} route=${ui.routeReached ?? '—'}${ui.error ? ` err=${ui.error.slice(0, 120)}` : ''}`,
      );
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'proof.json'), JSON.stringify(rows, null, 2));
  const fails = rows.filter((r) => r.apiStatus !== 200 || !r.apiToken || !r.routeReached);
  console.log(`\n${rows.length - fails.length}/${rows.length} accounts fully proven (API 200 + token + role home).`);
  if (fails.length) process.exitCode = 1;
}

void main();
