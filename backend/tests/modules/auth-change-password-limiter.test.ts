/**
 * Backend unit test — r170c: POST /auth/change-password is brute-force
 * guarded PER USER (10 failed attempts / 15 min), not per IP.
 *
 * The mismatch being pinned: auth.service.ts changePassword documented
 * "Rate limiting (route limiter) is the brute-force guard here" — a
 * per-user route limiter — but the route had wired the IP-keyed
 * `authRateLimiter`. The attack that difference matters for: a stolen
 * access token guessing the CURRENT password (session → credential
 * escalation). An IP cap is the weaker bound — fan-out across source
 * IPs, or a proxy topology where req.ip is shared/rotated (verified on
 * Render by the r170c probes: 12 client-spoofed XFF logins → no 429),
 * lets the guessing continue. A user-keyed bucket cannot be rotated.
 *
 * Route-level harness (auth-rotation.test.ts pattern): real createApp
 * on an ephemeral port, db.js + password.js mocked, jsonwebtoken REAL
 * (test-mode secrets) — so the full middleware stack (authMiddleware →
 * changePasswordRateLimiter → validate → service) runs exactly as in
 * production wiring.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { User } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed'),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    loginEvent: { create: vi.fn(async () => ({})) },
    researchPaper: { findFirst: vi.fn() },
    material: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { verifyPassword } from '../../src/lib/password.js';
import { signAccessToken } from '../../src/lib/jwt.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const userFindUnique = vi.mocked(prisma.user.findUnique);
const userUpdateMany = vi.mocked(prisma.user.updateMany);
const passwordVerify = vi.mocked(verifyPassword);

/** House typing pattern (enrollments-scope.test.ts): the delegate's impl
 *  signature, so the dispatcher below stays fully type-checked. */
type UserFindUniqueImpl = NonNullable<Parameters<typeof userFindUnique.mockImplementation>[0]>;

const makeUser = (id: string, tokenVersion = 0): User =>
  ({
    id,
    email: `${id}@zu.edu.ly`,
    passwordHash: 'stored-hash',
    role: 'STUDENT',
    firstName: 'مستخدم',
    lastName: 'اختبار',
    avatarColor: '#4F8EF7',
    avatarInitials: 'مأ',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    tokenVersion,
    scopeFacultyId: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: null,
    onboardingCompletedAt: null,
    firedMilestones: [],
    createdAt: new Date(),
  }) as unknown as User;

const WRONG_CURRENT = { currentPassword: 'wrong-current-password', newPassword: 'CorrectHorse-2026!' };
const RIGHT_CURRENT = { currentPassword: 'real-current-password', newPassword: 'CorrectHorse-2026!' };

const changePassword = (userId: string, body: unknown, extraHeaders: Record<string, string> = {}) =>
  fetch(`${baseUrl}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${signAccessToken(userId, 'STUDENT')}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  passwordVerify.mockResolvedValue(false);
  userFindUnique.mockImplementation(
    (async ({ where }: { where: { id: string } }) => makeUser(where.id)) as unknown as UserFindUniqueImpl,
  );
});

describe('POST /auth/change-password — per-user brute-force limiter (r170c)', () => {
  it('10 wrong-current-password attempts pass (401), the 11th is a 429 envelope in Arabic', async () => {
    for (let i = 1; i <= 10; i += 1) {
      const res = await changePassword('victim-user', WRONG_CURRENT);
      expect(res.status).toBe(401);
    }
    const eleventh = await changePassword('victim-user', WRONG_CURRENT);
    expect(eleventh.status).toBe(429);
    const body = (await eleventh.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(body.error.message).toBe('محاولات كثيرة لتغيير كلمة المرور — انتظر قليلاً ثم أعد المحاولة');
  });

  it('the bucket is keyed on the USER: rotating a spoofed X-Forwarded-For does NOT reset it', async () => {
    // 10 failures with a DIFFERENT spoofed XFF per request (each would be
    // a distinct req.ip under trust proxy = 1 direct exposure — the
    // verified local bypass shape). An IP-keyed limiter never trips.
    for (let i = 1; i <= 10; i += 1) {
      const res = await changePassword('xff-victim', WRONG_CURRENT, {
        'x-forwarded-for': `10.90.${i}.${i}`,
      });
      expect(res.status).toBe(401);
    }
    const eleventh = await changePassword('xff-victim', WRONG_CURRENT, {
      'x-forwarded-for': '10.90.99.99',
    });
    expect(eleventh.status).toBe(429);
  });

  it('a DIFFERENT user from the same source IP is not collateral damage (not IP-keyed)', async () => {
    // 'victim-user' burned their bucket in the first test — same test
    // process, same limiter instance, same client IP. Another user
    // still gets their own verdict (401 wrong password, NOT 429).
    const res = await changePassword('bystander-user', WRONG_CURRENT);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('unauthenticated requests never reach the limiter — 12 token-less calls stay plain 401', async () => {
    for (let i = 1; i <= 12; i += 1) {
      const res = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(WRONG_CURRENT),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('UNAUTHENTICATED');
    }
    // And they burned nothing: the authenticated user's next attempt
    // still gets a SERVICE verdict, not the limiter's.
    const authed = await changePassword('fresh-user-2', WRONG_CURRENT);
    expect(authed.status).toBe(401);
    expect(((await authed.json()) as { error: { code: string } }).error.code).toBe('INVALID_CREDENTIALS');
  });

  it('skipSuccessfulRequests: honest successful changes are free — 15 in a row, never 429', async () => {
    passwordVerify.mockResolvedValue(true);
    userUpdateMany.mockResolvedValue({ count: 1 } as never);
    for (let i = 1; i <= 15; i += 1) {
      const res = await changePassword('honest-user', RIGHT_CURRENT);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data?: unknown; error?: { code: string } };
      expect(body.error).toBeUndefined();
    }
  });
});
