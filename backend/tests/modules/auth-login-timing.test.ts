/**
 * Backend unit test — login timing-equalization branch, LoginEvent
 * telemetry, and lockout failure-accounting in
 * `backend/src/modules/auth/auth.service.ts`.
 *
 * DB-free: prisma and argon2 are mocked. Guards three regressions:
 *  1. unknown-identifier logins must burn the same argon2 work as
 *     wrong-password logins (anti user-enumeration timing side-channel),
 *  2. every login outcome writes a LoginEvent row (the feed behind
 *     /owner/login-analytics) and a telemetry failure never blocks auth,
 *  3. failed-password accounting is race-hardened: atomic increment +
 *     authoritative read-back + lock write conditioned on the LIVE
 *     counter (wave 12-3 — the old read-modify-write under-counted
 *     racing logins and could keep a targeted account unlocked).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'dummy-hash-for-tests'),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    loginEvent: { create: vi.fn(async () => ({})) },
  },
}));

import { prisma } from '../../src/db.js';
import { verifyPassword } from '../../src/lib/password.js';
import { loginUser } from '../../src/modules/auth/auth.service';
import { MAX_FAILED_LOGINS } from '../../src/modules/auth/lockout';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'locked@zu.edu.ly',
    passwordHash: 'real-hash',
    role: 'STUDENT',
    firstName: 'أحمد',
    lastName: 'المستخدم',
    avatarColor: '#4F8EF7',
    avatarInitials: 'أم',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    tokenVersion: 0,
    scopeFacultyId: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: null,
    onboardingCompletedAt: null,
    firedMilestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as User;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loginUser — timing equalization (dummy hash)', () => {
  it('runs a real argon2 verify against the dummy hash when the user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      loginUser('ghost@zu.edu.ly', 'wrong-password', { ip: '10.0.0.9', userAgent: 'vitest' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });

    // The anti-enumeration invariant: same argon2 work as a real check.
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith('dummy-hash-for-tests', 'wrong-password');
  });

  it('still rejects (not crashes) when even the dummy-hash verify throws', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(verifyPassword).mockRejectedValueOnce(new Error('argon2 exploded'));

    await expect(loginUser('ghost@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('burns the same dummy-hash work on the ACCOUNT_LOCKED path (wave 12-3: lock state must not be timing-visible)', async () => {
    // Intentional behavior change this wave (audit 11-c P2-1): the locked
    // path used to skip argon2 entirely, making the 429 ~100 ms faster
    // than a wrong-password 401 — a timing oracle for "identifier exists
    // AND is locked". It now burns the dummy hash like every other
    // rejection path.
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(loginUser('locked@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });

    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith('dummy-hash-for-tests', 'pw');
    // The dummy burn must never leak into a state change.
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});

describe('loginUser — LoginEvent telemetry', () => {
  it('writes a USER_NOT_FOUND failure row with ip/userAgent and no userId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(loginUser('ghost@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(prisma.loginEvent.create).toHaveBeenCalledWith({
      data: {
        email: 'ghost@zu.edu.ly',
        success: false,
        reason: 'USER_NOT_FOUND',
        userId: null,
        ip: null,
        userAgent: null,
      },
    });
  });

  it('writes an ACCOUNT_LOCKED row (without attempting a real password check)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(loginUser('locked@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });

    // Only the dummy-hash burn happened — never the real hash.
    expect(verifyPassword).not.toHaveBeenCalledWith('real-hash', 'pw');
    expect(prisma.loginEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, reason: 'ACCOUNT_LOCKED', userId: 'user-1' }),
      }),
    );
  });

  it('never lets a telemetry write failure block the login outcome', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.loginEvent.create).mockRejectedValueOnce(new Error('telemetry table missing'));

    await expect(loginUser('ghost@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});

describe('loginUser — lockout failure accounting (wave 12-3 race hardening)', () => {
  it('increments failedLoginCount atomically and reads the authoritative value back', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ failedLoginCount: 2 }));
    // The DB is the source of truth under concurrency: the mock stands in
    // for "the row now says 3" no matter how many callers raced to 2.
    vi.mocked(prisma.user.update).mockResolvedValue({ failedLoginCount: 3 } as User);

    await expect(loginUser('locked@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    // 3 < MAX_FAILED_LOGINS → no lock write.
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.loginEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, reason: 'INVALID_PASSWORD', userId: 'user-1' }),
      }),
    );
  });

  it('locks once the authoritative post-increment count reaches the threshold', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ failedLoginCount: MAX_FAILED_LOGINS - 1 }),
    );
    vi.mocked(prisma.user.update).mockResolvedValue({ failedLoginCount: MAX_FAILED_LOGINS } as User);

    await expect(loginUser('locked@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      // The lock condition re-checks the LIVE counter (never the caller's
      // possibly-stale read) so concurrent failures converge on locking.
      where: { id: 'user-1', failedLoginCount: { gte: MAX_FAILED_LOGINS } },
      data: { lockedUntil: expect.any(Date) },
    });
    const calls = vi.mocked(prisma.user.updateMany).mock.calls as unknown as Array<
      [{ data: { lockedUntil: Date } }]
    >;
    expect(calls[0]?.[0].data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it('counts each racing failure exactly once — the counter never comes from a local read', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ failedLoginCount: MAX_FAILED_LOGINS - 3 }),
    );
    // Simulate the lost-update the old code produced: three parallel calls
    // each computed the same next value locally. The new code must derive
    // its decision from the DB's returned value, not from user.failedLoginCount.
    vi.mocked(prisma.user.update).mockResolvedValue({ failedLoginCount: MAX_FAILED_LOGINS } as User);

    await expect(loginUser('locked@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
  });
});
