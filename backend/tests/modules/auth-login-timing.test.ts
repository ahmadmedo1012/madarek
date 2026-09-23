/**
 * Backend unit test — login timing-equalization branch + LoginEvent
 * telemetry in `backend/src/modules/auth/auth.service.ts`.
 *
 * DB-free: prisma and argon2 are mocked. Guards two regressions:
 *  1. unknown-identifier logins must burn the same argon2 work as
 *     wrong-password logins (anti user-enumeration timing side-channel),
 *  2. every login outcome writes a LoginEvent row (the feed behind
 *     /owner/login-analytics) and a telemetry failure never blocks auth.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'dummy-hash-for-tests'),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    loginEvent: { create: vi.fn(async () => ({})) },
  },
}));

import { prisma } from '../../src/db.js';
import { verifyPassword } from '../../src/lib/password.js';
import { loginUser } from '../../src/modules/auth/auth.service';

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

  it('writes an ACCOUNT_LOCKED row and skips password verification entirely', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(loginUser('locked@zu.edu.ly', 'pw')).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    });

    expect(verifyPassword).not.toHaveBeenCalled();
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
