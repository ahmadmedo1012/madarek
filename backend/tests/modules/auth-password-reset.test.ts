/**
 * Backend belt — R320 §D (c2-FLOW): the forgot/reset-password flow.
 *
 * Pins the service contract of password-reset.service.ts + the two
 * routes' no-oracle envelopes (PAGES-GAP.md §5):
 *
 *  MINT (requestPasswordReset):
 *   - unknown email → null + NO writes + the same-cost crypto/DB visit
 *     (the anti-enumeration mechanism, not just the envelope);
 *   - known email → raw 43-char base64url token, ONE live token per
 *     user (prior outstanding killed first), ONLY the sha-256 hex
 *     persisted (never the raw credential), +30min TTL.
 *
 *  RESET (resetPassword):
 *   - weak password → the REAL policy refusal BEFORE the claim (a weak
 *     password cannot burn a valid token — claim never runs);
 *   - unknown / expired / used → the SAME generic refusal (no
 *     token-oracle) via the atomic CAS claim (updateMany count 0);
 *   - success → argon2 hash + tokenVersion bump + failedLoginCount /
 *     lockedUntil cleared in ONE conditional write, then every OTHER
 *     token row deleted (an old link is not a second door);
 *   - superseded once → one bounded re-read retry;
 *   - superseded twice → honest internal error (token stays spent).
 *
 *  ROUTES (real createApp, full middleware stack):
 *   - POST /auth/forgot-password: byte-identical generic 200 for known
 *     and unknown emails; devInbox {mode:'test', url} ONLY for an
 *     existing @test.ly account (a real-domain account never leaks a
 *     link, an unknown @test.ly answers link-less); the URL carries the
 *     validated request Origin; 400 VALIDATION_ERROR on a bad body.
 *   - POST /auth/reset-password: dead token → 400 with the generic
 *     Arabic refusal; live token → 200 {ok:true}.
 *
 * Harness: the house route-level pattern (auth-change-password-limiter
 * .test.ts) — db.js + password.js mocked, app + limiters REAL, so the
 * limiter stack runs exactly as in production wiring.
 *
 * Limiter budgets (one shared in-process app): the IP-keyed
 * forgotPasswordRateLimiter counts EVERY request (10/15min) — this belt
 * spends 5; the per-email bucket (3/15min) — every request uses a
 * DISTINCT email; resetPasswordRateLimiter skips successes (failures
 * only, 2 spent).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { User, PasswordResetToken } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed-new-password'),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    passwordResetToken: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    membership: { findMany: vi.fn(async () => []) },
    loginEvent: { create: vi.fn(async () => ({})) },
  },
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import {
  hashResetToken,
  mintResetTokenValue,
  requestPasswordReset,
  resetPassword,
  RESET_TOKEN_REFUSAL,
  TOKEN_TTL_MS,
} from '../../src/modules/auth/password-reset.service.js';

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
const tokenFindUnique = vi.mocked(prisma.passwordResetToken.findUnique);
const tokenCreate = vi.mocked(prisma.passwordResetToken.create);
const tokenUpdateMany = vi.mocked(prisma.passwordResetToken.updateMany);
const tokenDeleteMany = vi.mocked(prisma.passwordResetToken.deleteMany);

type UserFindUniqueImpl = NonNullable<Parameters<typeof userFindUnique.mockImplementation>[0]>;

const makeUser = (id: string, email: string, tokenVersion = 0): User =>
  ({
    id,
    email,
    passwordHash: 'stored-hash',
    role: 'STUDENT',
    firstName: 'مستخدم',
    lastName: 'اختبار',
    avatarColor: '#4F8EF7',
    avatarInitials: 'مأ',
    isActive: true,
    failedLoginCount: 3,
    lockedUntil: new Date('2030-01-01T00:00:00Z'),
    tokenVersion,
    scopeFacultyId: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: null,
    onboardingCompletedAt: null,
    firedMilestones: [],
    createdAt: new Date(),
  }) as unknown as User;

const makeTokenRow = (userId: string, tokenHash: string): PasswordResetToken =>
  ({
    id: 'tok-row-1',
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    usedAt: null,
    createdAt: new Date(),
  }) as unknown as PasswordResetToken;

const STRONG = 'CorrectHorse-2026!';

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}/api/v1${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  tokenCreate.mockResolvedValue(makeTokenRow('user-1', 'x'));
  tokenUpdateMany.mockResolvedValue({ count: 1 });
  tokenDeleteMany.mockResolvedValue({ count: 0 });
  userUpdateMany.mockResolvedValue({ count: 1 });
});

describe('token primitives', () => {
  it('mintResetTokenValue → exactly 43 base64url chars (32 bytes of entropy)', () => {
    for (let i = 0; i < 8; i += 1) {
      const t = mintResetTokenValue();
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
    expect(new Set([mintResetTokenValue(), mintResetTokenValue()]).size).toBe(2);
  });

  it('hashResetToken → sha-256 hex of the raw token (64 chars), stable', () => {
    expect(hashResetToken('abc')).toBe(hashResetToken('abc'));
    expect(hashResetToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashResetToken('abc')).not.toBe(hashResetToken('abd'));
    // The documented vector: sha-256('abc') — pins the algorithm itself.
    expect(hashResetToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('requestPasswordReset (mint)', () => {
  it('unknown email → null, NO writes, and the same-cost same-table visit (anti-enumeration mechanism)', async () => {
    userFindUnique.mockResolvedValue(null);
    tokenFindUnique.mockResolvedValue(null);

    const out = await requestPasswordReset('ghost@example.com');

    expect(out).toBeNull();
    // The equal-cost visit: the unknown path STILL generated a token,
    // hashed it, and made the same-table unique-index lookup.
    expect(tokenFindUnique).toHaveBeenCalledTimes(1);
    expect(tokenFindUnique.mock.calls[0]![0]).toEqual({
      where: { tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/) },
    });
    // No side effects: nothing created, nothing invalidated.
    expect(tokenCreate).not.toHaveBeenCalled();
    expect(tokenUpdateMany).not.toHaveBeenCalled();
    expect(tokenDeleteMany).not.toHaveBeenCalled();
  });

  it('known email → raw token returned; ONE live token (prior outstanding killed FIRST); only the sha-256 hex persisted; +30min TTL', async () => {
    userFindUnique.mockResolvedValue(makeUser('user-1', 'a@test.ly'));

    const raw = await requestPasswordReset('  A@Test.LY ');

    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Email normalized before lookup (trim + lowercase).
    expect(userFindUnique).toHaveBeenCalledWith({ where: { email: 'a@test.ly' } });
    // Order: kill outstanding BEFORE mint — a stale link can never beat
    // the newest request.
    expect(tokenUpdateMany.mock.calls[0]![0]).toMatchObject({
      where: { userId: 'user-1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(tokenCreate).toHaveBeenCalledTimes(1);
    const created = tokenCreate.mock.calls[0]![0].data as {
      userId: string; tokenHash: string; expiresAt: Date;
    };
    expect(created.userId).toBe('user-1');
    // ONLY the digest is stored — never the raw credential.
    expect(created.tokenHash).toBe(hashResetToken(raw as string));
    expect(created.tokenHash).not.toBe(raw);
    expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now() + TOKEN_TTL_MS - 5_000);
    expect(created.expiresAt.getTime()).toBeLessThan(Date.now() + TOKEN_TTL_MS + 5_000);
  });
});

describe('resetPassword (claim)', () => {
  const raw = mintResetTokenValue();
  const tokenHash = hashResetToken(raw);

  it('weak password → the REAL policy refusal BEFORE the claim (a weak password cannot burn a valid token)', async () => {
    await expect(resetPassword(raw, 'short')).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    });
    // The claim never ran — the token is NOT spent on a policy failure.
    expect(tokenUpdateMany).not.toHaveBeenCalled();
    expect(userUpdateMany).not.toHaveBeenCalled();
  });

  it('dead token (unknown / expired / used) → the claim CAS returns 0 → ONE generic refusal (no token-oracle)', async () => {
    tokenUpdateMany.mockResolvedValue({ count: 0 });

    await expect(resetPassword(raw, STRONG)).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: RESET_TOKEN_REFUSAL,
    });
    // The CAS where-clause pins the atomic single-use contract.
    const where = tokenUpdateMany.mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.tokenHash).toBe(tokenHash);
    expect(where.usedAt).toBeNull();
    expect(where.expiresAt).toMatchObject({ gt: expect.any(Date) });
    // No user write, no purge — the refusal is total.
    expect(userUpdateMany).not.toHaveBeenCalled();
    expect(tokenDeleteMany).not.toHaveBeenCalled();
  });

  it('success → argon2 hash + tokenVersion bump + counters cleared in ONE conditional write; every OTHER token row deleted', async () => {
    tokenUpdateMany.mockResolvedValue({ count: 1 });
    tokenFindUnique.mockResolvedValue(makeTokenRow('user-1', tokenHash));
    userFindUnique.mockImplementation(
      (async ({ where }: { where: { id: string } }) =>
        makeUser(where.id, 'a@test.ly', 4)) as unknown as UserFindUniqueImpl,
    );

    await resetPassword(raw, STRONG);

    expect(userUpdateMany).toHaveBeenCalledTimes(1);
    const write = userUpdateMany.mock.calls[0]![0];
    // D3 revocation event: the write is conditional on the read version.
    expect(write.where).toEqual({ id: 'user-1', tokenVersion: 4 });
    expect(write.data).toEqual({
      passwordHash: 'hashed-new-password',
      tokenVersion: { increment: 1 },
      failedLoginCount: 0,
      lockedUntil: null,
    });
    // Old links die with the password they were minted for.
    expect(tokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', NOT: { tokenHash } },
    });
  });

  it('deactivated account behind a live token → the SAME generic refusal (no oracle, no write)', async () => {
    tokenUpdateMany.mockResolvedValue({ count: 1 });
    tokenFindUnique.mockResolvedValue(makeTokenRow('user-1', tokenHash));
    const dead = makeUser('user-1', 'a@test.ly');
    dead.isActive = false;
    userFindUnique.mockResolvedValue(dead);

    await expect(resetPassword(raw, STRONG)).rejects.toMatchObject({
      status: 400,
      message: RESET_TOKEN_REFUSAL,
    });
    expect(userUpdateMany).not.toHaveBeenCalled();
  });

  it('superseded ONCE → the bounded re-read retry wins on the fresh version', async () => {
    tokenUpdateMany.mockResolvedValue({ count: 1 });
    tokenFindUnique.mockResolvedValue(makeTokenRow('user-1', tokenHash));
    // The concurrent-writer simulation: the version the service first
    // reads is 4; a racing revocation moves it to 5 between our read
    // and write; the retry re-reads the FRESH 5 and wins.
    let read = 0;
    userFindUnique.mockImplementation(
      (async ({ where }: { where: { id: string } }) => {
        read += 1;
        return makeUser(where.id, 'a@test.ly', read === 1 ? 4 : 5);
      }) as unknown as UserFindUniqueImpl,
    );
    userUpdateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await resetPassword(raw, STRONG);

    expect(userUpdateMany).toHaveBeenCalledTimes(2);
    expect(userUpdateMany.mock.calls[0]![0].where).toEqual({ id: 'user-1', tokenVersion: 4 });
    expect(userUpdateMany.mock.calls[1]![0].where).toEqual({ id: 'user-1', tokenVersion: 5 });
    expect(tokenDeleteMany).toHaveBeenCalledTimes(1);
  });

  it('superseded TWICE → the honest internal error (token stays spent, password unchanged)', async () => {
    tokenUpdateMany.mockResolvedValue({ count: 1 });
    tokenFindUnique.mockResolvedValue(makeTokenRow('user-1', tokenHash));
    userFindUnique.mockImplementation(
      (async ({ where }: { where: { id: string } }) =>
        makeUser(where.id, 'a@test.ly', 4)) as unknown as UserFindUniqueImpl,
    );
    // Both attempts lose — a concurrent writer keeps winning.
    userUpdateMany.mockResolvedValue({ count: 0 });

    await expect(resetPassword(raw, STRONG)).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL',
    });
    expect(userUpdateMany).toHaveBeenCalledTimes(2);
    // The purge never ran — the failure state is honest and minimal.
    expect(tokenDeleteMany).not.toHaveBeenCalled();
  });
});

describe('POST /auth/forgot-password (route envelope)', () => {
  it('unknown email → the generic 200 envelope, byte-identical shape, NO devInbox', async () => {
    userFindUnique.mockResolvedValue(null);
    tokenFindUnique.mockResolvedValue(null);

    const res = await post('/auth/forgot-password', { email: 'ghost-1@example.com' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { message: string; devInbox?: unknown } };
    expect(body.data.message).toBe('إذا كان البريد مسجلًا فستصلك رسالة خلال دقائق');
    expect(body.data.devInbox).toBeUndefined();
  });

  it('known @test.ly account → devInbox {mode:"test"} with the reset link on the validated Origin', async () => {
    userFindUnique.mockResolvedValue(makeUser('user-1', 'student@test.ly'));

    const res = await post(
      '/auth/forgot-password',
      { email: 'student@test.ly' },
      { origin: 'https://madarek.example.org/' },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { message: string; devInbox?: { mode: string; url: string } };
    };
    expect(body.data.devInbox).toBeDefined();
    expect(body.data.devInbox?.mode).toBe('test');
    // Trailing slash on the Origin is normalised away; the raw token
    // rides the query string URL-encoded.
    expect(body.data.devInbox?.url).toMatch(
      /^https:\/\/madarek\.example\.org\/auth\/reset-password\?token=[A-Za-z0-9_-]{43}$/,
    );
  });

  it('known REAL-domain account → generic 200, NO devInbox (the link can never leak for a real user)', async () => {
    userFindUnique.mockResolvedValue(makeUser('user-2', 'real@zu.edu.ly'));

    const res = await post('/auth/forgot-password', { email: 'real@zu.edu.ly' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { message: string; devInbox?: unknown } };
    expect(body.data.message).toBe('إذا كان البريد مسجلًا فستصلك رسالة خلال دقائق');
    expect(body.data.devInbox).toBeUndefined();
  });

  it('unknown @test.ly address → link-less generic 200 (the exists-gate beats the domain-gate)', async () => {
    userFindUnique.mockResolvedValue(null);
    tokenFindUnique.mockResolvedValue(null);

    const res = await post('/auth/forgot-password', { email: 'nobody@test.ly' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { devInbox?: unknown } };
    expect(body.data.devInbox).toBeUndefined();
  });

  it('invalid body → 400 VALIDATION_ERROR (the envelope contract)', async () => {
    const res = await post('/auth/forgot-password', { email: 'not-an-email' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/reset-password (route envelope)', () => {
  const raw = mintResetTokenValue();
  const tokenHash = hashResetToken(raw);

  it('dead token → 400 BAD_REQUEST with the generic Arabic refusal (no token-oracle at the HTTP edge)', async () => {
    tokenUpdateMany.mockResolvedValue({ count: 0 });

    const res = await post('/auth/reset-password', { token: raw, password: STRONG });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe(RESET_TOKEN_REFUSAL);
  });

  it('live token → 200 {ok:true} (the full happy path through the real middleware stack)', async () => {
    tokenUpdateMany.mockResolvedValue({ count: 1 });
    tokenFindUnique.mockResolvedValue(makeTokenRow('user-1', tokenHash));
    userFindUnique.mockImplementation(
      (async ({ where }: { where: { id: string } }) =>
        makeUser(where.id, 'student@test.ly', 2)) as unknown as UserFindUniqueImpl,
    );

    const res = await post('/auth/reset-password', { token: raw, password: 'AnotherHorse-2026!' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ok: boolean } };
    expect(body.data.ok).toBe(true);
    // The session-revoking user write actually ran.
    expect(userUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('short token (<43) → 400 VALIDATION_ERROR before the service ever sees it', async () => {
    const res = await post('/auth/reset-password', { token: 'too-short', password: STRONG });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(tokenUpdateMany).not.toHaveBeenCalled();
  });
});
