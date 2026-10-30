/**
 * live.ts — r325 P4(a): the REAL-STACK fixtures for the FLOWS.md
 * rehearsal specs (tests/r325/flows/flow-*.spec.ts, `--project=flows`).
 *
 * These specs are the opposite of the hermetic `e2e` project: every
 * assertion walks the LIVE local stack (`npm run dev:full` — Vite :5173
 * + backend :4000 + seeded Postgres) with REAL clicks. The only API
 * calls allowed are SETUP (seed lookup / pre-state), clearly commented
 * at each call site; the assertions themselves are always UI-driven.
 *
 * Session cache (the auth-limiter contract): AUTH_RATE is 10 failed
 * logins / 15 min / IP and `skipSuccessfulRequests` keeps honest
 * logins free — but a full flows run still needs ~8 roles across
 * parallel workers, so `sessionForRole` memoizes the real POST
 * /auth/login response per role: in-memory per worker process, plus a
 * file cache in os.tmpdir() shared across workers (10-minute TTL —
 * under the 15-minute access-token life; a stale/expired file is
 * transparently re-logged). No other module here touches the limiter.
 *
 * Grammar inherited from tests/e2e/fixtures/auth-storage.ts (r319 §C1-B):
 * the zustand persist key `mdrk-auth` is seeded on the WEB origin with
 * the REAL login payload, so the SPA boots reload-style signed-in.
 *
 * HOW TO RUN
 * ──────────
 *   cd frontend
 *   MADAREK_E2E_BASE_URL=http://localhost:5173 \
 *   MADAREK_E2E_EXECUTABLE=/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome \
 *     npx playwright test --project=flows
 *
 * EVIDENCE: every spec ends with `flowShot(page, 'flow-XX-…')` writing
 * the final state into audits/evidence/r325/flows/ (that tree is
 * tracked — the r304..r324 precedent).
 */
import type { Browser, Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The PHYSICAL test-account table (Playwright's TS loader cannot follow
// the repo-root shared/testAccounts.ts re-export shim — see the
// auth-storage.ts header for the verified reason). One table, no copy.
import { TEST_PASSWORD, testAccountForJob } from '../../../../../backend/src/modules/auth/test-accounts.data';

export const API_BASE = (process.env.MADAREK_E2E_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
export const WEB_ORIGIN = (process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

export type FlowRole =
  | 'STUDENT' | 'STUDENT2' | 'TEACHER' | 'HEAD' | 'DEAN' | 'VICEDEAN'
  | 'ADMIN' | 'FACULTY' | 'QUALITY' | 'OWNER';

/** Job label per role — keys into the shared @test.ly table. */
const FLOW_JOBS: Record<FlowRole, string> = {
  STUDENT: 'طالب',
  STUDENT2: 'طالب ثانٍ (للرسائل/المجتمع)',
  TEACHER: 'أستاذ',
  HEAD: 'رئيس قسم',
  DEAN: 'عميد',
  VICEDEAN: 'نائب عميد',
  ADMIN: 'المسجل العام',
  FACULTY: 'مسجل كلية (نطاق كلية)',
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

export const FLOW_PASSWORD = TEST_PASSWORD;

export const flowEmail = (role: FlowRole): string =>
  testAccountForJob(FLOW_JOBS[role])!.email;

/** The login response's `data` payload (issueTokens shape). */
export interface FlowSession {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    memberships?: Array<{ institutionId: string; name: string; slug: string; role: string }>;
    currentInstitution?: { id: string; name: string; slug: string } | null;
    [key: string]: unknown;
  };
  accessToken: string;
}

/* ── the session cache (login-limiter contract, see header) ──────── */

const SESSION_TTL_MS = 10 * 60 * 1000; // access token lives 15 min — cache 10

const memoryCache = new Map<string, FlowSession>();

const cacheFile = (): string =>
  join(tmpdir(), `madarek-flows-sessions-${new Date().toISOString().slice(0, 10)}.json`);

function readCacheFile(): Record<string, { at: number; session: FlowSession }> {
  try {
    return JSON.parse(readFileSync(cacheFile(), 'utf8'));
  } catch {
    return {};
  }
}

/** REAL POST /auth/login — throws loudly (status + body head) so a down
 * stack or an unseeded DB fails the spec at setup, never as a silent
 * guest page. Cached per role (memory + tmpfile shared across workers). */
export async function sessionForRole(role: FlowRole): Promise<FlowSession> {
  const memo = memoryCache.get(role);
  if (memo) return memo;

  const disk = readCacheFile()[role];
  if (disk && Date.now() - disk.at < SESSION_TTL_MS) {
    memoryCache.set(role, disk.session);
    return disk.session;
  }

  const email = flowEmail(role);
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: FLOW_PASSWORD }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `real-API login failed for ${role} (${email}): HTTP ${res.status} ${body.slice(0, 200)}` +
        (res.status === 401 ? ' — is the database seeded? (npm run db:seed)' : ' — is the local stack up? (npm run dev:full)'),
    );
  }
  const { data } = (await res.json()) as { data: FlowSession };
  if (!data?.accessToken || !data?.user) {
    throw new Error(`real-API login returned no session for ${role}`);
  }
  memoryCache.set(role, data);
  const all = readCacheFile();
  all[role] = { at: Date.now(), session: data };
  try {
    writeFileSync(cacheFile(), JSON.stringify(all), { mode: 0o600 });
  } catch {
    /* tmpfile cache is best-effort — memory still holds the session */
  }
  return data;
}

/** The `mdrk-auth` zustand-persist value (auth-storage.ts authStorageJson
 * shape — persist version 1, the REAL user + token). */
export function authStorageJson(session: FlowSession): string {
  const { user, accessToken } = session;
  return JSON.stringify({
    state: {
      user,
      accessToken,
      memberships: user.memberships ?? [],
      currentInstitution: user.currentInstitution ?? null,
      membershipRole: (user as { membershipRole?: string | null }).membershipRole ?? null,
    },
    version: 1,
  });
}

/** A signed-in REAL-stack page for `role`: cached session → storageState
 * context → the intro-loader skip key → the page. Caller closes it. */
export async function flowPage(browser: Browser, role: FlowRole): Promise<{ page: Page; close: () => Promise<void> }> {
  const session = await sessionForRole(role);
  const context = await browser.newContext({
    baseURL: WEB_ORIGIN,
    locale: 'ar',
    colorScheme: 'light',
    viewport: { width: 1280, height: 800 },
    storageState: {
      cookies: [],
      origins: [
        { origin: WEB_ORIGIN, localStorage: [{ name: 'mdrk-auth', value: authStorageJson(session) }] },
      ],
    },
  });
  const page = await context.newPage();
  // The R318 entrance loader replays on every full page load — seed the
  // skip key first (same init script the e2e fixture factory uses).
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('madarek-intro-skip', '1');
    } catch {
      /* storage unavailable — the page stands complete anyway */
    }
  });
  /* close() is GUARDED: on this box browserContext.close() itself has
   * hung past the test timeout (found live in the F9/F12 rehearsals —
   * the test body was GREEN, the context teardown never returned).
   * 8 s ceiling; a hung context dies with the worker's browser anyway. */
  const close = async (): Promise<void> => {
    await Promise.race([
      context.close(),
      new Promise<void>((r) => setTimeout(r, 8_000)),
    ]);
  };
  return { page, close };
}

/* ── SETUP-only API helpers (never used for assertions) ──────────── */

/** Authenticated GET for SETUP reads (seed lookup, pre-state). */
export async function apiGet<T>(role: FlowRole, path: string): Promise<T> {
  const session = await sessionForRole(role);
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { authorization: `Bearer ${session.accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`SETUP GET ${path} failed for ${role}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Authenticated POST for SETUP writes (pre-state an assertion then
 * exercises through the UI). Every call site comments WHY it is setup. */
export async function apiPost<T>(role: FlowRole, path: string, body: unknown): Promise<T> {
  const session = await sessionForRole(role);
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`SETUP POST ${path} failed for ${role}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/* ── evidence ────────────────────────────────────────────────────── */

/** Final-state screenshot into audits/evidence/r325/flows/ (playwright
 * runs from frontend/ — the audits tree is the repo root's). Returns
 * the written path so a run log can pin it. */
export async function flowShot(page: Page, name: string): Promise<string> {
  const dir = '../audits/evidence/r325/flows';
  mkdirSync(dir, { recursive: true });
  const path = `${dir}/${name}.png`;
  /* The screenshot is AUXILIARY evidence — every assertion has already
   * passed by the time a shot is taken. Two live failure modes forced
   * the belt: (1) the default timeout is 0 (none) — /owner/system's
   * never-settling main thread hung the F9 rehearsal 260 s AT the shot;
   * (2) even with a screenshot timeout the wedged renderer can starve
   * the driver's rejection, so the wall-clock Promise.race below is the
   * real ceiling. A miss degrades to a console warn, never a failure. */
  await Promise.race([
    page.screenshot({ path, fullPage: false, animations: 'disabled', timeout: 10_000 }),
    new Promise<void>((r) => setTimeout(r, 12_000)),
  ]).catch((e: unknown) => console.warn(`[flowShot] ${name} skipped: ${String(e).slice(0, 120)}`));
  return path;
}

/** A minimal but REAL one-page PDF (the %PDF- magic both the client
 * sniff and the server's files.routes gate require) — the F11 fixture. */
export function minimalPdf(title: string): Buffer {
  const text = title.slice(0, 40).replace(/[()\\]/g, ' ');
  const stream = `BT /F1 18 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${stream.length + 1} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const o of objects) {
    offsets.push(body.length);
    body += `${o}\n`;
  }
  const xref = body.length;
  body += `xref\n0 6\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

/** 'YYYY-MM-DDTHH:mm' in the RUNNER's local wall clock — the value a
 * datetime-local input expects (the browser shares the runner TZ here). */
export function localDateTimeInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 'YYYY-MM-DD' — the attendance date input's value shape. */
export function localDayInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Unique-per-run suffix (email-safe) so re-runs never collide on the
 * natural keys the demo stack pins (bulk-import emails, titles…). */
export const runTag = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
