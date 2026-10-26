/**
 * auth-storage — R319 §C1-B: REAL-API storage states for the five demo
 * roles (student / teacher / admin / quality / owner).
 *
 * The hermetic suite (fixtures/mock-transport.ts + fixtures/e2e.ts)
 * fulfils every /api/ call from a fixture corpus — perfect for CI, but
 * it can never prove the real stack. This module is the other half:
 * given the LOCAL STACK running (`npm run dev:full`), it logs in through
 * the REAL POST /auth/login, takes the live payload and builds the exact
 * Playwright `storageState` the app boots from:
 *
 *   - `mdrk-auth` localStorage in the zustand persist shape
 *     (stores/auth.store.ts — safeSessionStorage JSON.stringify's
 *     `{ state, version }`; partialize keeps { user, accessToken,
 *     memberships, currentInstitution, membershipRole }), so the SPA
 *     starts reload-style signed-in with a REAL access token;
 *   - `user` is the login response's user object VERBATIM (it carries
 *     the r178 institution context fields the hooks re-read through
 *     extractSessionExtras), and `version` is 1 — the CURRENT persist
 *     version, no migrate needed;
 *   - the refresh cookie is deliberately NOT carried: the access token
 *     lives 15 minutes, which is ample for a spec, and cookie juggling
 *     would pin these states to one browser profile.
 *
 * Seeded test accounts (R320 §C — the single source of truth is the
 * repo-root shared/testAccounts.ts, physically
 * backend/src/modules/auth/test-accounts.data.ts; one easy account per
 * job on the @test.ly domain, password 12345678). This fixture derives
 * the five STACK roles from that table by job label so it can never
 * drift from the seeder.
 *
 * Env knobs:
 *   MADAREK_E2E_API_URL   API origin the login POSTs to
 *                         (default http://localhost:4000)
 *   MADAREK_E2E_BASE_URL  frontend origin the storageState seeds
 *                         (default http://localhost:5173 — MUST match
 *                         the page origin or the state won't apply)
 */
import type { Browser } from '@playwright/test';

// R320 §C — the shared test-account table. NOTE: Playwright's TS
// loader cannot follow the repo-root shared/testAccounts.ts RE-EXPORT
// chain (it transpiles the shim to CJS and named exports vanish —
// verified empirically), so Playwright-consumed fixtures import the
// PHYSICAL table module directly; vite/vitest consumers use the
// @shared alias.
import { TEST_PASSWORD, testAccountForJob } from '../../../../backend/src/modules/auth/test-accounts.data';

/**
 * Playwright's `storageState` option shape (`{ cookies, origins }` —
 * playwright-core types.d.ts). @playwright/test exports no NAMED
 * `StorageState` type (TS2614), so this derives it from
 * `Browser.newContext`'s own parameter — it can never drift from the
 * installed Playwright version.
 */
export type StorageStateOption = NonNullable<
  NonNullable<Parameters<Browser['newContext']>[0]>['storageState']
>;

export type StackRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/** The shared table's job labels for the five stack roles (R320 §C —
 * the labels match frontend/src/lib/nav.ts ROLE_LABELS' established
 * wording: أخصائي جودة / مالك المنصة). */
const STACK_JOBS: Record<StackRole, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'المسجل العام',
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

/** Demo credentials — derived from the shared test-account table
 * (backend/prisma/seed.ts + ensureTestAccounts keep the DB in sync
 * with exactly these rows). */
export const DEMO_PASSWORD = TEST_PASSWORD;

export const DEMO_ACCOUNTS: Record<StackRole, string> = {
  STUDENT: testAccountForJob(STACK_JOBS.STUDENT)!.email,
  TEACHER: testAccountForJob(STACK_JOBS.TEACHER)!.email,
  ADMIN: testAccountForJob(STACK_JOBS.ADMIN)!.email,
  QUALITY: testAccountForJob(STACK_JOBS.QUALITY)!.email,
  OWNER: testAccountForJob(STACK_JOBS.OWNER)!.email,
};

export const STACK_ROLES: readonly StackRole[] = [
  'STUDENT',
  'TEACHER',
  'ADMIN',
  'QUALITY',
  'OWNER',
];

const API_BASE = (process.env.MADAREK_E2E_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
export const WEB_ORIGIN = (process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173').replace(
  /\/+$/,
  '',
);

/** r178 membership summary (auth.service.ts buildMembershipSummaries). */
export interface MembershipSummary {
  institutionId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  role: StackRole | string;
  isActive: boolean;
}

export interface InstitutionSummary {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}

/** The login response's `data` payload (issueTokens shape, auth.service.ts). */
export interface LoginSession {
  user: {
    id: string;
    email: string;
    role: StackRole | string;
    firstName: string;
    lastName: string;
    avatarColor?: string | null;
    avatarInitials?: string | null;
    scopeFacultyId?: string | null;
    memberships?: MembershipSummary[];
    currentInstitution?: InstitutionSummary | null;
    membershipRole?: StackRole | string | null;
    [key: string]: unknown;
  };
  accessToken: string;
}

/** POST /auth/login against the real local API. Throws with the status
 * code when the stack is down or the credentials are wrong — specs want
 * a loud failure, never a silently-guest page. */
export async function loginRole(role: StackRole): Promise<LoginSession> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: DEMO_ACCOUNTS[role], password: DEMO_PASSWORD }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `real-API login failed for ${role} (${DEMO_ACCOUNTS[role]}): HTTP ${res.status} ${body.slice(0, 200)}` +
        (res.status === 401
          ? ' — is the database seeded? (npm run dev:full does migrate+seed)'
          : ' — is the local stack up? (npm run dev:full)'),
    );
  }
  const { data } = (await res.json()) as { data: LoginSession };
  if (!data?.accessToken || !data?.user) {
    throw new Error(`real-API login returned no session for ${role}`);
  }
  return data;
}

/** The `mdrk-auth` value the zustand persist store would have written —
 * same shape as fixtures/mock-transport.ts authStorageJson, but with the
 * REAL token, the REAL user payload and the CURRENT persist version 1
 * (no migrate on hydration). */
export function authStorageJson(session: LoginSession): string {
  const { user, accessToken } = session;
  return JSON.stringify({
    state: {
      user,
      accessToken,
      memberships: user.memberships ?? [],
      currentInstitution: user.currentInstitution ?? null,
      membershipRole: user.membershipRole ?? null,
    },
    version: 1,
  });
}

/**
 * Full Playwright storageState for a role: logs in through the real API
 * and seeds `mdrk-auth` on the frontend origin. Use it with
 * `browser.newContext({ storageState })` (NOT the hermetic fixtures/e2e
 * context — that one installs the mock transport) or
 * `test.use({ storageState })`.
 */
export async function storageStateForRole(role: StackRole): Promise<StorageStateOption> {
  const session = await loginRole(role);
  return {
    cookies: [],
    origins: [
      {
        origin: WEB_ORIGIN,
        localStorage: [{ name: 'mdrk-auth', value: authStorageJson(session) }],
      },
    ],
  };
}
