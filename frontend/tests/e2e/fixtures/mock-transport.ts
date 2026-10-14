/**
 * mock-transport — a hermetic stand-in for the Express API, installed
 * at the Playwright transport layer (r164-k / Agent K).
 *
 * WHY page.route and not a local server: this sandbox (and any CI
 * runner without a seeded PostgreSQL) cannot boot the backend, but the
 * Vite dev server + the real built SPA are fully available. Installing
 * context.route on the /api/ glob fulfils every XHR the app makes BEFORE
 * it reaches the network (the /api vite proxy is never consulted), so
 * the specs exercise the real router, real hooks, real stores, real
 * render trees — only the transport is fixed.
 *
 * Contract fidelity:
 *   - responses use the real envelopes (`{ data }` / `{ error }`, see
 *     api-fixtures.ts) so axios + unwrap() + authErrorView behave
 *     exactly as against the live backend;
 *   - the login endpoint is DYNAMIC (success / 401 INVALID_CREDENTIALS
 *     / 429 TOO_MANY_REQUESTS lockout) and flips the transport's
 *     session role, so /auth/me answers for whoever just logged in;
 *   - every unmatched /api/** call answers 501 MOCK_NOT_IMPLEMENTED
 *     with a console line — a missing fixture is loud, never a silent
 *     success (the tests assert real rendered content, so a missing
 *     payload fails visibly rather than passing vacuously).
 *
 * The same installer powers the DB-less surface-inventory capture
 * (tests/audit/surface-inventory.spec.ts, AUDIT_API_MOCK=1).
 */
import type { BrowserContext, Page, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DB_OFFERING_LECTURES,
  ENROLLMENTS,
  FACULTIES,
  LECTURE_DETAIL,
  LOCKED_EMAIL,
  LOGIN_FAILED_MESSAGE,
  LOGIN_LOCKED_MESSAGE,
  MY_EXAMS,
  MY_PROFILE,
  NOTIFICATIONS,
  OFFERING_FULL,
  OFFERING_ID,
  OFFERING_LECTURES,
  RESUME,
  SEARCH_RESULTS,
  STUDENT_DASHBOARD,
  STUDENT_USER,
  TEACHER_USER,
  UNREAD_COUNT,
  VALID_LOGIN,
  meProfile,
  type FixtureUser,
} from './api-fixtures';

/* ── envelope helpers (the real backend's shapes) ──────────────── */

function ok(data: unknown): Record<string, unknown> {
  return { data };
}

function fail(code: string, message: string): Record<string, unknown> {
  return { error: { code, message } };
}

/** Success envelope with pagination meta sibling (lib/pagination). */
function pageOf(rows: unknown[], extraMeta: Record<string, number>): Record<string, unknown> {
  return { data: rows, meta: { page: 1, total: rows.length, totalPages: 1, ...extraMeta } };
}

/* ── route table ───────────────────────────────────────────────── */

/**
 * The shared 1-second test clip (media/lecture.mp4, generated with
 * ffmpeg — a REAL playable MP4) served for every /media/ request so
 * the lecture player's <video> can load metadata. The specs assert
 * the player wiring (element + chapters), not playback quality.
 */
const LECTURE_MP4 = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'media/lecture.mp4'),
);

/** A single mock route: method + path pattern + static payload. */
export interface MockRouteDef {
  method: string;
  /** e.g. '/lectures/:lectureId' — ':param' matches one segment. */
  path: string;
  /** Optional required query params (others are ignored). */
  query?: Record<string, string | number>;
  status?: number;
  /** Static JSON body (already enveloped by the caller). */
  json?: unknown;
}

/** Build the standard route table for the seeded session role. */
export function standardRoutes(): MockRouteDef[] {
  return [
    { method: 'GET', path: '/health', json: ok({ status: 'ok' }) },
    { method: 'GET', path: '/auth/me', json: ok(meProfile(STUDENT_USER)) },
    { method: 'POST', path: '/auth/logout', json: ok({ ok: true }) },
    { method: 'POST', path: '/auth/register', json: ok({ user: STUDENT_USER, accessToken: 'e2e-token' }) },
    { method: 'GET', path: '/faculties', json: ok(FACULTIES) },

    { method: 'GET', path: '/me/dashboard', json: ok(STUDENT_DASHBOARD) },
    { method: 'GET', path: '/me/resume', json: ok(RESUME) },
    { method: 'GET', path: '/me/profile', json: ok(MY_PROFILE) },
    { method: 'PUT', path: '/me/theme', json: ok({ ok: true }) },
    { method: 'POST', path: '/me/onboarding/complete', json: ok({ onboardingCompletedAt: new Date(0).toISOString() }) },

    { method: 'GET', path: '/enrollments/me', json: ok(ENROLLMENTS) },
    { method: 'GET', path: `/offerings/${OFFERING_ID}/full`, json: ok(OFFERING_FULL) },
    { method: 'GET', path: `/offerings/${OFFERING_ID}/lectures`, json: ok(OFFERING_LECTURES) },
    { method: 'GET', path: '/offerings/offr_e2e_databases/lectures', json: ok(DB_OFFERING_LECTURES) },
    { method: 'GET', path: '/lectures/:lectureId', json: ok(LECTURE_DETAIL) },
    { method: 'POST', path: '/lectures/:lectureId/watch', json: ok({ completed: false, watchedSec: 10, totalSec: 720 }) },
    { method: 'POST', path: '/lectures/:lectureId/checkpoints/:checkpointId/answer', json: ok({ correct: true, correctIndex: 0 }) },

    { method: 'GET', path: '/exams/me', json: ok(MY_EXAMS) },

    // Notifications: one route serves both the unread poll
    // (?limit=1 reads meta.unread) and the 50-item panel list.
    { method: 'GET', path: '/notifications', json: pageOf(NOTIFICATIONS, { unread: UNREAD_COUNT, limit: 50 }) },
    { method: 'PATCH', path: '/notifications/:id/read', json: ok({ ok: true }) },
    { method: 'POST', path: '/notifications/read-all', json: ok({ updated: UNREAD_COUNT }) },

    { method: 'GET', path: '/search/global', json: ok(SEARCH_RESULTS) },
  ];
}

/* ── login handler (dynamic) ───────────────────────────────────── */

/**
 * The login endpoint is answered from the request body so specs can
 * drive success / wrong-password / lockout through the real form.
 * A successful login flips `sessionRole` — subsequent /auth/me calls
 * answer for the logged-in user, exactly like the live backend.
 */
async function handleLogin(route: Route, session: { user: FixtureUser | null }): Promise<void> {
  // request.postDataJSON() is synchronous in Playwright and throws on
  // an empty/non-JSON body — it never returns a promise, so no .catch.
  const body = readPostJson(route);
  const email = body.email;
  const password = body.password;

  if (email === LOCKED_EMAIL) {
    await fulfillJson(route, 429, fail('TOO_MANY_REQUESTS', LOGIN_LOCKED_MESSAGE));
    return;
  }
  if (email === VALID_LOGIN.email && password === VALID_LOGIN.password) {
    session.user = STUDENT_USER;
    await fulfillJson(route, 200, ok({ user: STUDENT_USER, accessToken: 'e2e-token-student' }));
    return;
  }
  await fulfillJson(route, 401, fail('INVALID_CREDENTIALS', LOGIN_FAILED_MESSAGE));
}

/* ── matching ──────────────────────────────────────────────────── */

/** Synchronous request-body JSON reader (throws on empty/non-JSON). */
function readPostJson(route: Route): { email?: string; password?: string } {
  try {
    const data = route.request().postDataJSON();
    return data && typeof data === 'object' ? (data as { email?: string; password?: string }) : {};
  } catch {
    return {};
  }
}

function pathSegments(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

/** Matches and captures `:param` segments; null = no match. */
function matchPath(pattern: string[], actual: string[]): Record<string, string> | null {
  if (pattern.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]!;
    const a = actual[i]!;
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

/* ── installer ─────────────────────────────────────────────────── */

export interface InstallMockApiOptions {
  /** Session user answering /auth/me before any login (null = guest). */
  sessionUser?: FixtureUser | null;
  /** Per-test routes; matched BEFORE the standard table. */
  overrides?: MockRouteDef[];
  /** Replace the standard table entirely (default: standardRoutes()). */
  routes?: MockRouteDef[];
}

/**
 * Installs the mock transport on a BrowserContext (all pages) or a
 * single Page. Returns the mutable session (post-login role flips).
 */
export async function installMockApi(
  target: BrowserContext | Page,
  options: InstallMockApiOptions = {},
): Promise<void> {
  const session = { user: options.sessionUser ?? null };
  const overrideRoutes = options.overrides ?? [];
  const baseRoutes = options.routes ?? standardRoutes();
  // /auth/me is dynamic: it must answer for the session user (seeded
  // OR just-logged-in), so it never comes from the static tables.
  const staticRoutes = [...overrideRoutes, ...baseRoutes].filter(
    (r) => !(r.method === 'GET' && r.path === '/auth/me'),
  );

  await target.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());

    // Only paths under /api/v1 are ours; anything else /api-ish still
    // falls through to the 501 below (loud, never silent).
    const apiMatch = url.pathname.match(/^\/api(?:\/v1)?(\/.*)$/);
    const apiPath = apiMatch ? apiMatch[1]! : url.pathname;
    const segments = pathSegments(apiPath);

    // Dynamic auth endpoints.
    if (method === 'POST' && url.pathname.endsWith('/auth/login')) {
      await handleLogin(route, session);
      return;
    }
    if (method === 'GET' && url.pathname.endsWith('/auth/me')) {
      if (session.user) {
        await fulfillJson(route, 200, ok(meProfile(session.user)));
      } else {
        await fulfillJson(route, 401, fail('UNAUTHENTICATED', 'جلسة غير صالحة'));
      }
      return;
    }
    if (method === 'POST' && url.pathname.endsWith('/auth/refresh')) {
      // A refresh only fires after a non-auth 401 — none of the mocks
      // produce one, but answer honestly if something asks.
      await fulfillJson(route, 401, fail('SESSION_EXPIRED', 'انتهت صلاحية الجلسة'));
      return;
    }

    // Lecture media: the shared test clip (see LECTURE_MP4).
    if (method === 'GET' && segments[0] === 'media') {
      await route.fulfill({ status: 200, contentType: 'video/mp4', body: LECTURE_MP4 });
      return;
    }

    // Static tables (overrides first).
    for (const def of staticRoutes) {
      if (def.method.toUpperCase() !== method) continue;
      const params = matchPath(pathSegments(def.path), segments);
      if (params === null) continue;
      let queryOk = true;
      for (const [key, value] of Object.entries(def.query ?? {})) {
        if (url.searchParams.get(key) !== String(value)) {
          queryOk = false;
          break;
        }
      }
      if (!queryOk) continue;
      await fulfillJson(route, def.status ?? 200, def.json ?? ok(null));
      return;
    }

    // Loud 501: a missing fixture must never read as a silent success.
    console.error(
      `[mock-transport] no fixture for ${method} ${url.pathname}${url.search} — answering 501`,
    );
    await fulfillJson(
      route,
      501,
      fail('MOCK_NOT_IMPLEMENTED', `mock transport has no fixture for ${method} ${url.pathname}`),
    );
  });
}

/* ── auth-state bootstrapping (the real store substrate) ────────── */

/**
 * localStorage payload exactly as zustand's persist middleware writes
 * it for `mdrk-auth` (stores/auth.store.ts — safeSessionStorage
 * JSON.stringify's { state, version }). Seeding this BEFORE any app
 * script boots the app fully signed-in, reload-style.
 */
export function authStorageJson(user: FixtureUser, token: string): string {
  return JSON.stringify({ state: { user, accessToken: token }, version: 0 });
}

/** localStorage payload for `madarek-theme` (theme.store.ts v2). */
export function themeStorageJson(mode: 'light' | 'dark'): string {
  return JSON.stringify({ state: { mode, modeUpdatedAt: 0 }, version: 2 });
}

/**
 * Seeds the auth store (and optionally a theme) via init script —
 * runs before any app module on every navigation in the context.
 * ONE-SHOT: a seed only writes when its key is ABSENT, so a reload
 * AFTER an in-test mutation (theme toggle, login) keeps what the app
 * itself persisted — an unconditional re-seed on every load would
 * erase it. A null user seeds only the theme (guest + persisted theme).
 */
export async function seedSession(
  target: BrowserContext | Page,
  user: FixtureUser | null,
  opts: { token?: string; theme?: 'light' | 'dark' } = {},
): Promise<void> {
  const authJson = user ? authStorageJson(user, opts.token ?? 'e2e-token-student') : null;
  const themeJson = opts.theme ? themeStorageJson(opts.theme) : null;
  await target.addInitScript(
    ([auth, theme]) => {
      if (auth) {
        try {
          if (localStorage.getItem('mdrk-auth') === null) {
            localStorage.setItem('mdrk-auth', auth);
          }
        } catch { /* storage unavailable — app falls back to guest */ }
      }
      if (theme) {
        try {
          if (localStorage.getItem('madarek-theme') === null) {
            localStorage.setItem('madarek-theme', theme);
          }
        } catch { /* same probe-guard story as the auth store */ }
      }
    },
    [authJson, themeJson] as const,
  );
}

export { STUDENT_USER, TEACHER_USER };
