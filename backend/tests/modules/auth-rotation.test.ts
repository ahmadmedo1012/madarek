/**
 * Backend unit test — refresh rotation & revocation semantics (D3),
 * password policy, and JWT hardening (wave 12-3).
 *
 * DB-free: prisma and argon2 are mocked; jsonwebtoken runs REAL
 * sign/verify against the deterministic test-mode secrets from env.ts.
 *
 * D3 invariants locked here:
 *  - a NORMAL refresh never bumps tokenVersion (multi-device survival);
 *  - every bump that remains (logout, change-password) is an ATOMIC
 *    conditional updateMany({ where: { id, tokenVersion: expected } });
 *  - count === 0 ('superseded') is handled: no-op for logout, re-auth
 *    for change-password.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'new-hash'),
  verifyPassword: vi.fn(async () => true),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    loginEvent: { create: vi.fn(async () => ({})) },
  },
}));

import { prisma } from '../../src/db.js';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';
import { env } from '../../src/env.js';
import {
  parseDurationMs,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/lib/jwt.js';
import { changePassword, logoutUser, refreshTokens } from '../../src/modules/auth/auth.service';
import { decideRefresh, interpretRevocationBump } from '../../src/modules/auth/rotation';
import { MAX_FAILED_LOGINS, shouldLock } from '../../src/modules/auth/lockout';
import { isCommonPassword } from '../../src/modules/auth/password-policy';
import {
  changePasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
} from '../../src/modules/auth/auth.dto';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'user@zu.edu.ly',
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────
// Pure rotation decisions (D3)
// ─────────────────────────────────────────────────────────────────────
describe('decideRefresh — pure rotation decision', () => {
  it('issues for an active user whose token version matches', () => {
    expect(decideRefresh({ isActive: true, tokenVersion: 4 }, 4)).toEqual({ outcome: 'issue' });
  });

  it('reauths with reason=revoked on a version mismatch', () => {
    expect(decideRefresh({ isActive: true, tokenVersion: 5 }, 4)).toEqual({
      outcome: 'reauth',
      reason: 'revoked',
    });
  });

  it('reauths with reason=inactive for deactivated users', () => {
    expect(decideRefresh({ isActive: false, tokenVersion: 4 }, 4)).toEqual({
      outcome: 'reauth',
      reason: 'inactive',
    });
  });

  it('reauths with reason=no-user for deleted users', () => {
    expect(decideRefresh(null, 4)).toEqual({ outcome: 'reauth', reason: 'no-user' });
  });
});

describe('interpretRevocationBump — atomic-bump result interpretation', () => {
  it("maps count > 0 to 'revoked'", () => {
    expect(interpretRevocationBump(1)).toBe('revoked');
  });

  it("maps count === 0 to 'superseded' (concurrent writer won)", () => {
    expect(interpretRevocationBump(0)).toBe('superseded');
  });
});

describe('shouldLock — lockout threshold', () => {
  it('locks only at MAX_FAILED_LOGINS or beyond', () => {
    expect(shouldLock(MAX_FAILED_LOGINS - 1)).toBe(false);
    expect(shouldLock(MAX_FAILED_LOGINS)).toBe(true);
    expect(shouldLock(MAX_FAILED_LOGINS + 3)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// refreshTokens — D3: normal refresh must NOT bump tokenVersion
// ─────────────────────────────────────────────────────────────────────
describe('refreshTokens — multi-device survival (D3)', () => {
  it('issues fresh tokens at the SAME version and never writes to the user row', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ tokenVersion: 4 }));

    const { user, accessToken, refreshToken } = await refreshTokens(signRefreshToken('user-1', 4));

    // Same version re-issued — this is the D3 invariant: bumping here is
    // what used to force-logout every other device within one access TTL.
    expect(verifyRefreshToken(refreshToken)).toMatchObject({ sub: 'user-1', ver: 4, type: 'refresh' });
    expect(verifyAccessToken(accessToken)).toMatchObject({ sub: 'user-1', type: 'access' });
    expect(user.id).toBe('user-1');
    // No bump, no counter touch — the refresh path is read-only on the row.
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a revoked (stale-version) token with the distinct revoked message', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ tokenVersion: 5 }));

    await expect(refreshTokens(signRefreshToken('user-1', 4))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
      message: 'انتهت صلاحية هذه الجلسة — سجّل الدخول من جديد',
    });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('rejects inactive users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ isActive: false }));

    await expect(refreshTokens(signRefreshToken('user-1', 0))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });

  it('rejects unknown users and garbage tokens', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(refreshTokens(signRefreshToken('ghost', 0))).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    await expect(refreshTokens('not-a-jwt')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'جلسة غير صالحة — سجّل الدخول من جديد',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// logoutUser — atomic revocation bump
// ─────────────────────────────────────────────────────────────────────
describe('logoutUser — atomic conditional bump', () => {
  it('bumps via updateMany conditioned on the version the decision was based on', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ tokenVersion: 3 } as User);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });

    await logoutUser('user-1');

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', tokenVersion: 3 },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it("treats count === 0 as success — a concurrent writer's bump already revoked every token", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ tokenVersion: 3 } as User);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });

    await expect(logoutUser('user-1')).resolves.toBeUndefined();
  });

  it('no-ops for unknown users (nothing to revoke)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(logoutUser('ghost')).resolves.toBeUndefined();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// changePassword — revocation event with hash update in ONE atomic write
// ─────────────────────────────────────────────────────────────────────
describe('changePassword', () => {
  const NEW_PASSWORD = 'Mahabbah-Wataniya-2026';

  it('verifies the current password, updates hash + bumps version atomically, and re-issues this device', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(makeUser({ tokenVersion: 2 })) // pre-change read
      .mockResolvedValueOnce(makeUser({ tokenVersion: 3 })); // post-bump read
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });

    const result = await changePassword('user-1', 'OldPass!2026', NEW_PASSWORD);

    expect(verifyPassword).toHaveBeenCalledWith('real-hash', 'OldPass!2026');
    expect(hashPassword).toHaveBeenCalledWith(NEW_PASSWORD);
    // ONE write carries BOTH the new hash and the revocation bump, gated
    // on the version the current-password check was made against.
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', tokenVersion: 2 },
      data: { passwordHash: 'new-hash', tokenVersion: { increment: 1 } },
    });
    // This device continues seamlessly on the post-bump version; every
    // other device's refresh cookie died with the bump.
    expect(verifyRefreshToken(result.refreshToken)).toMatchObject({ sub: 'user-1', ver: 3 });
    expect(result.user.id).toBe('user-1');
  });

  it('rejects a wrong current password without touching the row', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser());
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await expect(changePassword('user-1', 'wrong-current', NEW_PASSWORD)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
      message: 'كلمة المرور الحالية غير صحيحة',
    });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('re-auths (does NOT retry) when a concurrent writer moved the version', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ tokenVersion: 2 }));
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 });

    await expect(changePassword('user-1', 'OldPass!2026', NEW_PASSWORD)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });

  it('enforces the shared password policy even for programmatic callers', async () => {
    await expect(changePassword('user-1', 'OldPass!2026', 'password')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
    });
    // Rejected before any DB or argon2 work.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalledWith('password');
  });

  it('rejects inactive or unknown users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(makeUser({ isActive: false }));
    await expect(changePassword('user-1', 'x', NEW_PASSWORD)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    await expect(changePassword('ghost', 'x', NEW_PASSWORD)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Password policy (shared by register + change-password)
// ─────────────────────────────────────────────────────────────────────
describe('password policy', () => {
  it('isCommonPassword matches exactly, case-insensitively', () => {
    expect(isCommonPassword('password')).toBe(true);
    expect(isCommonPassword('PaSsWoRd')).toBe(true);
    expect(isCommonPassword('password123')).toBe(true);
    expect(isCommonPassword('12345678')).toBe(true);
    expect(isCommonPassword('Password12345')).toBe(false); // not in the list
    expect(isCommonPassword('Madarek2026!')).toBe(false);
  });

  it('passwordSchema accepts the D1 demo password and strong passphrases', () => {
    expect(passwordSchema.safeParse('Madarek2026!').success).toBe(true);
    expect(passwordSchema.safeParse('Mahabbah-Wataniya-2026').success).toBe(true);
  });

  it('passwordSchema rejects short, over-long, and common passwords', () => {
    expect(passwordSchema.safeParse('Ab1!xyz').success).toBe(false); // 7 chars
    expect(passwordSchema.safeParse('a'.repeat(73)).success).toBe(false);
    expect(passwordSchema.safeParse('password123').success).toBe(false);
    expect(passwordSchema.safeParse('letmein123').success).toBe(false);
  });

  it('register and change-password share the exact same policy field', () => {
    const registerPassword = registerSchema.shape.password;
    const changePasswordNew = changePasswordSchema.shape.newPassword;
    // Both must accept/reject identically — one policy, no drift.
    for (const candidate of ['Madarek2026!', 'password', 'Ab1!xyz', 'x'.repeat(72)]) {
      expect(registerPassword.safeParse(candidate).success).toBe(
        changePasswordNew.safeParse(candidate).success,
      );
    }
  });

  it('changePasswordSchema is strict and requires both fields', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'Madarek2026!' })
        .success,
    ).toBe(true);
    expect(
      changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'Madarek2026!' }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'Madarek2026!',
        evil: 1,
      }).success,
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Auth-route input sanitizer trims
// ─────────────────────────────────────────────────────────────────────
describe('auth DTO sanitizer trims', () => {
  it('loginSchema trims the identifier (email or reg-number)', () => {
    const parsed = loginSchema.parse({ email: '  user@zu.edu.ly \n', password: 'pw' });
    expect(parsed.email).toBe('user@zu.edu.ly');
  });

  it('registerSchema trims + lowercases the email and trims names', () => {
    const parsed = registerSchema.parse({
      email: '  New.Student@ZU.edu.ly ',
      password: 'Madarek2026!',
      firstName: '  أحمد ',
      lastName: 'المستخدم  ',
      role: 'STUDENT',
    });
    expect(parsed.email).toBe('new.student@zu.edu.ly');
    expect(parsed.firstName).toBe('أحمد');
    expect(parsed.lastName).toBe('المستخدم');
  });
});

// ─────────────────────────────────────────────────────────────────────
// JWT hardening
// ─────────────────────────────────────────────────────────────────────
describe('JWT — sign/verify round trips', () => {
  it('round-trips an access token with its role claim intact', () => {
    const token = signAccessToken('user-1', 'STUDENT');
    expect(verifyAccessToken(token)).toEqual({ sub: 'user-1', role: 'STUDENT', type: 'access' });
  });

  it('round-trips a refresh token with its version claim intact', () => {
    const token = signRefreshToken('user-1', 9);
    expect(verifyRefreshToken(token)).toEqual({ sub: 'user-1', ver: 9, type: 'refresh' });
  });
});

describe('JWT — token-type discrimination', () => {
  it('rejects an access-type payload at the refresh verifier (same secret)', () => {
    const forged = jwt.sign(
      { sub: 'user-1', role: 'STUDENT', type: 'access' },
      env.JWT_REFRESH_SECRET,
      { algorithm: 'HS256' },
    );
    expect(() => verifyRefreshToken(forged)).toThrow('Wrong token type');
  });

  it('rejects a refresh-type payload at the access verifier (same secret)', () => {
    const crossTyped = jwt.sign(
      { sub: 'user-1', ver: 1, type: 'refresh' },
      env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256' },
    );
    expect(() => verifyAccessToken(crossTyped)).toThrow('Wrong token type');
  });

  it('rejects refresh tokens presented where an access token is expected (cross-secret)', () => {
    expect(() => verifyAccessToken(signRefreshToken('user-1', 1))).toThrow();
  });
});

describe('JWT — algorithm pinning', () => {
  it('rejects a token signed with HS384 even though the secret is valid', () => {
    const hs384 = jwt.sign({ sub: 'user-1', type: 'access' }, env.JWT_ACCESS_SECRET, {
      algorithm: 'HS384',
    });
    expect(() => verifyAccessToken(hs384)).toThrow();
  });

  it('rejects an unsigned (alg: none) token', () => {
    const unsigned = jwt.sign({ sub: 'user-1', type: 'access' }, null, { algorithm: 'none' });
    expect(() => verifyAccessToken(unsigned)).toThrow();
  });
});

describe('JWT — expiry handling', () => {
  it('enforces exp and surfaces TokenExpiredError for expired tokens', async () => {
    const expired = jwt.sign({ sub: 'user-1', type: 'access' }, env.JWT_ACCESS_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1ms',
    });
    await sleep(10);
    let error: unknown;
    try {
      verifyAccessToken(expired);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe('TokenExpiredError');
  });
});

describe('parseDurationMs — cookie maxAge / TTL alignment helper', () => {
  it('parses the production TTL strings', () => {
    expect(parseDurationMs('15m')).toBe(15 * 60 * 1000);
    expect(parseDurationMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('parses seconds and hours', () => {
    expect(parseDurationMs('30s')).toBe(30_000);
    expect(parseDurationMs('12h')).toBe(12 * 3_600_000);
  });

  it('throws on malformed input (fail fast at boot)', () => {
    expect(() => parseDurationMs('7days')).toThrow();
    expect(() => parseDurationMs('')).toThrow();
    expect(() => parseDurationMs('-15m')).toThrow();
  });
});
