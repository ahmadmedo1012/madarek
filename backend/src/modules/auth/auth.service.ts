import { AcademicRank, Role, type User } from '@prisma/client';
import { prisma } from '../../db.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';
import { decideRefresh, interpretRevocationBump } from './rotation.js';
import { LOCK_DURATION_MS, MAX_FAILED_LOGINS, shouldLock } from './lockout.js';
import { passwordSchema } from './auth.dto.js';

/**
 * Login-attempt context captured by the route layer for telemetry.
 * Optional so programmatic/service-level callers stay ergonomic.
 */
export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Login telemetry — the writer side of /owner/login-analytics.
// The OWNER dashboard always showed zeros because NOTHING ever inserted
// LoginEvent rows. These writes are BEST-EFFORT: a telemetry failure
// must never break authentication itself.
// ─────────────────────────────────────────────────────────────────────
const writeLoginEvent = async (event: {
  email: string;
  success: boolean;
  reason?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> => {
  try {
    await prisma.loginEvent.create({
      data: {
        email: event.email,
        success: event.success,
        reason: event.reason ?? null,
        userId: event.userId ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err }, 'loginEvent telemetry write failed (non-blocking)');
  }
};

/**
 * Timing-equalization hash. When the user doesn't exist we still run a
 * real argon2 verification against this fixed hash so the "unknown
 * identifier" path costs the same ~100ms as the "wrong password" path.
 * Without it, response-time deltas let attackers enumerate which emails
 * are registered. Computed once at module load with the same argon2
 * parameters as real password hashes. Also burned on the ACCOUNT_LOCKED
 * path so lock state isn't timing-visible either.
 */
const DUMMY_HASH_PROMISE = hashPassword('madarek-timing-equalizer-no-account');

/** Burn one dummy-hash argon2 verify; never changes the rejection path. */
const burnDummyVerify = async (password: string): Promise<void> => {
  try {
    await verifyPassword(await DUMMY_HASH_PROMISE, password);
  } catch {
    // Even a broken dummy hash must not change the rejection path.
  }
};

const arabicInitials = (firstName: string, lastName: string) => {
  const f = firstName.trim()[0] ?? '';
  const l = lastName.trim()[0] ?? '';
  return (f + l).slice(0, 2);
};

const sanitize = (u: User) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  firstName: u.firstName,
  lastName: u.lastName,
  avatarColor: u.avatarColor,
  avatarInitials: u.avatarInitials,
  scopeFacultyId: u.scopeFacultyId ?? null,
  // 012-design-graphics-uplift — presentation preferences (no PII).
  themePreference: u.themePreference,
  themePreferenceUpdatedAt: u.themePreferenceUpdatedAt,
  onboardingCompletedAt: u.onboardingCompletedAt,
  firedMilestones: u.firedMilestones,
  createdAt: u.createdAt,
});

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  // Profile fields:
  facultyId?: string;
  departmentId?: string;
  universityId?: string;
  year?: number;
  specialty?: string;
  // Prisma enum union — the DTO's z.enum validates the same members, so
  // no cast is needed when writing TeacherProfile.rank.
  rank?: AcademicRank;
}

export const registerUser = async (input: RegisterInput) => {
  // Defensive guard: even if the DTO drifted, never let public registration mint
  // ADMIN / QUALITY / OWNER accounts. Those are invitation-only.
  if (input.role !== Role.STUDENT && input.role !== Role.TEACHER) {
    throw AppError.forbidden('This role is invitation-only. Contact an administrator.');
  }

  const existing = await prisma.user.findUnique({
    // create() below lowercases the email — the duplicate pre-check must
    // compare against the SAME casing or "A@x.com" slips past "a@x.com".
    where: { email: input.email.toLowerCase() },
  });
  if (existing) throw AppError.conflict('Email already registered');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarInitials: arabicInitials(input.firstName, input.lastName),
        avatarColor: '#4F8EF7',
      },
    });

    if (input.role === Role.STUDENT) {
      if (!input.facultyId || !input.departmentId || !input.universityId) {
        throw AppError.badRequest('Student profile requires facultyId, departmentId, universityId');
      }
      await tx.studentProfile.create({
        data: {
          userId: created.id,
          universityId: input.universityId,
          facultyId: input.facultyId,
          departmentId: input.departmentId,
          year: input.year ?? 1,
        },
      });
    }
    if (input.role === Role.TEACHER) {
      if (!input.departmentId || !input.specialty) {
        throw AppError.badRequest('Teacher profile requires departmentId and specialty');
      }
      // Note: `position` (Dean / Dept Head / Associate Dean) is intentionally
      // NOT settable via self-serve registration. Appointments are made by an
      // administrator, never claimed at signup.
      await tx.teacherProfile.create({
        data: {
          userId: created.id,
          specialty: input.specialty,
          rank: input.rank ?? 'LECTURER',
          departmentId: input.departmentId,
        },
      });
    }
    return created;
  });

  return issueTokens(user);
};

/**
 * Login a user by email OR university registration number.
 *
 * Side-effects:
 *   - Writes a LoginEvent row (success or failure) so the owner
 *     dashboard's login-analytics card isn't permanently zero.
 *     The LoginEvent is written best-effort: if the DB write fails,
 *     the login itself still succeeds (we don't want logging to
 *     block auth).
 *   - On failed password: increments failedLoginCount ATOMICALLY (the
 *     authoritative post-increment value is read back — racing logins
 *     each count exactly once) and locks the account for
 *     LOCK_DURATION_MS once the live count reaches MAX_FAILED_LOGINS.
 *   - On locked account: burns the same argon2 work as the other
 *     failure paths so lock state isn't timing-visible. (The 429 status
 *     itself still discloses "identifier exists AND is locked" — an
 *     accepted tradeoff, because a genuinely locked-out user needs the
 *     explanation; the argon2 burn removes the silent timing oracle.)
 *   - On unknown identifier: burns equal argon2 work (timing
 *     equalization) so identifier enumeration via response time is
 *     not possible.
 *   - On success: resets the failure counters.
 */
export const loginUser = async (
  email: string,
  password: string,
  ctx: LoginContext = {},
) => {
  // Identifier may be an email OR a university registration number.
  // We discriminate by '@' presence — emails always contain it, reg-numbers don't.
  const identifier = email.trim();
  let user;
  if (identifier.includes('@')) {
    user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  } else {
    // Reg-number path: look up StudentProfile.universityId, return its parent User.
    const profile = await prisma.studentProfile.findUnique({
      where: { universityId: identifier },
      include: { user: true },
    });
    user = profile?.user ?? null;
  }
  if (!user) {
    // Burn the same argon2 work a real password check would cost so a
    // timing side-channel can't reveal which identifiers exist.
    await burnDummyVerify(password);
    await writeLoginEvent({ email: identifier, success: false, reason: 'USER_NOT_FOUND', ...ctx });
    throw AppError.invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    // Timing-equalize the locked path too: skipping argon2 here made the
    // 429 ~100ms faster than a wrong-password 401, revealing both that
    // the identifier exists AND that it is locked (audit 11-c P2-1).
    await burnDummyVerify(password);
    await writeLoginEvent({
      email: identifier,
      success: false,
      reason: 'ACCOUNT_LOCKED',
      userId: user.id,
      ...ctx,
    });
    throw AppError.tooMany('Account temporarily locked. Try again later.');
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    // Atomic failure accounting (see modules/auth/lockout.ts for the
    // guarantee level). The increment is atomic in SQL and the value
    // read back is authoritative, so racing failures can no longer
    // under-count their way past the lock threshold.
    const { failedLoginCount: failed } = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (shouldLock(failed)) {
      // Re-check the threshold against the LIVE row (not our possibly
      // stale read): concurrent failures converge on locking, and a
      // concurrent SUCCESSFUL login (which resets the counter) makes
      // this condition miss — correctly leaving the account unlocked.
      await prisma.user.updateMany({
        where: { id: user.id, failedLoginCount: { gte: MAX_FAILED_LOGINS } },
        data: { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
      });
    }
    await writeLoginEvent({
      email: identifier,
      success: false,
      reason: 'INVALID_PASSWORD',
      userId: user.id,
      ...ctx,
    });
    throw AppError.invalidCredentials();
  }

  if (!user.isActive) {
    await writeLoginEvent({
      email: identifier,
      success: false,
      reason: 'ACCOUNT_DISABLED',
      userId: user.id,
      ...ctx,
    });
    throw AppError.forbidden('Account disabled');
  }

  // Reset failure counters
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
  // Success LoginEvent — fires AFTER the counters reset so the
  // analytics dashboard shows the user as fully logged in. Best-effort.
  await writeLoginEvent({ email: identifier, success: true, userId: user.id, ...ctx });

  return issueTokens(user);
};

/**
 * Refresh the session from a refresh token.
 *
 * D3 (BINDING): a normal refresh does NOT bump tokenVersion. The version
 * is one user-level counter shared by every device; bumping it here would
 * invalidate every other device's 7-day cookie within one access-TTL
 * (~15 min) — the old multi-device forced-logout bug. The re-issued
 * refresh token carries the SAME version (sliding session, not one-time
 * rotation). Revocation happens ONLY via explicit version bumps — see
 * logoutUser / changePassword — which are atomic conditionals.
 *
 * Honest tradeoff: the PREVIOUS refresh token stays valid until its own
 * 7-day expiry (no blacklisting). Per-session revocation would need a
 * RefreshToken table — schema change, reported to the orchestrator.
 */
export const refreshTokens = async (refreshToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthenticated('Invalid refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw AppError.unauthenticated();
  const decision = decideRefresh(user, payload.ver);
  if (decision.outcome === 'reauth') {
    // Keep the distinct message: the SPA treats "revoked" as a hard
    // logout (drop to the login screen) vs a generic 401.
    throw decision.reason === 'revoked'
      ? AppError.unauthenticated('Refresh token revoked')
      : AppError.unauthenticated();
  }
  return issueTokens(user);
};

/**
 * Logout = revoke every refresh token for the user (all devices).
 *
 * D3 revocation event: the bump is an ATOMIC CONDITIONAL on the version
 * our decision was based on. count === 0 means a concurrent writer
 * (password change, role change, deactivation, another logout) already
 * moved tokenVersion — which itself revokes every token — so the
 * revocation goal is already achieved and we no-op.
 */
export const logoutUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  if (!user) return;
  const result = await prisma.user.updateMany({
    where: { id: userId, tokenVersion: user.tokenVersion },
    data: { tokenVersion: { increment: 1 } },
  });
  if (interpretRevocationBump(result.count) === 'superseded') {
    // A concurrent writer (password change, role change, deactivation,
    // another logout) already moved tokenVersion — which itself revokes
    // every token. The logout goal is already achieved; logout must
    // never fail because someone else revoked first.
    logger.debug({ userId }, 'logout revocation superseded by a concurrent writer');
  }
};

/**
 * Change the authenticated user's password.
 *
 * Revocation event per D3: the hash update AND the tokenVersion bump
 * happen in ONE atomic conditional write, so a password change can never
 * land without revoking every session (and a concurrent revocation can
 * never be silently overwritten). count === 0 → a concurrent writer won
 * → the change did NOT apply → the client must re-authenticate.
 *
 * On success a fresh session is issued for THIS device (new access token
 * + new refresh cookie); every OTHER device is logged out by the bump.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  // Defense-in-depth: the route DTO enforces the same policy; this guard
  // keeps programmatic callers (scripts, future admin flows) honest.
  const policy = passwordSchema.safeParse(newPassword);
  if (!policy.success) {
    throw AppError.badRequest('Password does not meet the policy', policy.error.flatten());
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw AppError.unauthenticated();

  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) {
    // Rate limiting (route limiter) is the brute-force guard here; the
    // login lockout counters intentionally stay untouched.
    throw AppError.invalidCredentials('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);
  const result = await prisma.user.updateMany({
    where: { id: user.id, tokenVersion: user.tokenVersion },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  if (interpretRevocationBump(result.count) === 'superseded') {
    // A concurrent revocation moved the version between our read and
    // write. Our change did not apply — do NOT retry blindly (the
    // current-password check was made against the pre-concurrent state).
    // Surface re-authentication per D3.
    throw AppError.unauthenticated('Session changed concurrently. Please sign in again.');
  }

  // Re-read for the fresh version (the bump is atomic, but another
  // revocation could still land before we issue; that token would 401
  // on its next refresh — acceptable and documented).
  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  if (!updated) throw AppError.unauthenticated();
  return issueTokens(updated);
};

export const getCurrentUser = async (userId: string) => {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: { include: { faculty: true, department: true } },
      teacherProfile: {
        include: {
          department: true,
          positionFaculty: true,
          positionDepartment: true,
        },
      },
      scopeFaculty: true,
    },
  });
  if (!u) throw AppError.notFound('User not found');
  return {
    ...sanitize(u),
    scopeFaculty: u.scopeFaculty
      ? { id: u.scopeFaculty.id, name: u.scopeFaculty.name }
      : null,
    studentProfile: u.studentProfile,
    teacherProfile: u.teacherProfile,
  };
};

const issueTokens = (user: User) => {
  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);
  return { user: sanitize(user), accessToken, refreshToken };
};
