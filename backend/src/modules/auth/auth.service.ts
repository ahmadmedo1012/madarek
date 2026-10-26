import { AcademicRank, Role, type User } from '@prisma/client';
import { prisma } from '../../db.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';
import { decideRefresh, interpretRevocationBump } from './rotation.js';
import { lockDurationFor, MAX_FAILED_LOGINS, shouldLock } from './lockout.js';
import { passwordSchema } from './auth.dto.js';
import { resolveMemberships, type ActiveMembership } from '../../http/middleware/institution.js';

/**
 * Login-attempt context captured by the route layer for telemetry.
 * Optional so programmatic/service-level callers stay ergonomic.
 */
export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────────────────────────────────
// r178 (multi-institution) — session institution context.
//
// The access token's `inst` claim is resolved from the user's ACTIVE
// memberships (ACTIVE institutions only): exactly ONE membership →
// auto-selected; zero or several → null and the client must call
// POST /auth/select-institution. Revocation takes effect on the next
// token mint (login/refresh/select) because the context is always
// re-resolved from the DB, never cached in the token beyond the TTL.
// ─────────────────────────────────────────────────────────────────────

/** Wire shape of one selectable membership (auth session payload). */
export interface MembershipSummary {
  institutionId: string;
  name: string;
  nameEn: string | null;
  slug: string;
  role: Role;
  isActive: boolean;
}

/** Wire shape of the currently selected institution (auth session payload). */
export interface CurrentInstitutionInfo {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
}

const buildMembershipSummaries = (memberships: readonly ActiveMembership[]): MembershipSummary[] =>
  memberships.map((m) => ({
    institutionId: m.institutionId,
    name: m.institution.name,
    nameEn: m.institution.nameEn,
    slug: m.institution.slug,
    role: m.role,
    isActive: m.isActive,
  }));

/**
 * Resolve the session's institution context: exactly one ACTIVE
 * membership (ACTIVE institution) → that institution (auto-select);
 * zero or several → null (client must select). Shared by login,
 * refresh and change-password — every token mint re-resolves from the
 * DB, so a membership revoked or an institution suspended after mint
 * takes effect at the NEXT mint.
 */
const resolveDefaultContext = async (
  userId: string,
): Promise<{ institutionId: string | null; memberships: ActiveMembership[] }> => {
  const memberships = await resolveMemberships(userId);
  const institutionId = memberships.length === 1 ? memberships[0]!.institutionId : null;
  return { institutionId, memberships };
};

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

/** 2-letter initials for the avatar bubble (Arabic-friendly). */
export const arabicInitials = (firstName: string, lastName: string) => {
  const f = firstName.trim()[0] ?? '';
  const l = lastName.trim()[0] ?? '';
  return (f + l).slice(0, 2);
};

export const sanitizeUser = (u: User) => ({
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
  // r178: the institution the account registers into (self-serve is
  // still STUDENT/TEACHER only — the Membership carries that role).
  institutionId: string;
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
    throw AppError.forbidden('هذا النوع من الحسابات يتطلب دعوة من إدارة المنصّة');
  }

  const existing = await prisma.user.findUnique({
    // create() below lowercases the email — the duplicate pre-check must
    // compare against the SAME casing or "A@x.com" slips past "a@x.com".
    where: { email: input.email.toLowerCase() },
  });
  if (existing) throw AppError.conflict('البريد الإلكتروني مسجّل مسبقاً');

  const passwordHash = await hashPassword(input.password);

  const { user: created, membership, institution } = await prisma.$transaction(async (tx) => {
    // The whole academic chain must resolve INSIDE the requested
    // institution: department → faculty → institution (r178 — a
    // cross-institution fork of the scope predicates is exactly the
    // r152b bug class, lifted one level). Validated BEFORE any write:
    // the transaction stays read-only until every guard passes.
    const institutionRow = await tx.institution.findUnique({
      where: { id: input.institutionId },
    });
    if (!institutionRow || institutionRow.status !== 'ACTIVE') {
      throw AppError.badRequest('المؤسسة غير موجودة أو غير مفعّلة — تحقّق من اختيار المؤسسة');
    }

    let facultyIdVerified: string | undefined;
    if (input.role === Role.STUDENT) {
      if (!input.facultyId || !input.departmentId || !input.universityId) {
        throw AppError.badRequest('بيانات الطالب غير مكتملة — الكلية والقسم والرقم الجامعي مطلوبة');
      }
      /* r152b (A5 P3) + r178: both FKs were individually valid but nothing
       * checked the PAIR — a cross-faculty student profile forked the two
       * scope predicates (buildScopedUserWhere matches students by
       * studentProfile.facultyId alone). r178 adds the third link: the
       * faculty must belong to the REGISTERED institution. */
      const faculty = await tx.faculty.findUnique({
        where: { id: input.facultyId },
        select: { institutionId: true },
      });
      if (!faculty || faculty.institutionId !== input.institutionId) {
        throw AppError.badRequest('الكلّيّة المحددة لا تنتمي إلى هذه المؤسسة');
      }
      const dept = await tx.department.findUnique({
        where: { id: input.departmentId },
        select: { facultyId: true },
      });
      if (!dept || dept.facultyId !== input.facultyId) {
        throw AppError.badRequest('القسم المختار لا ينتمي إلى الكلّيّة المحددة');
      }
      facultyIdVerified = input.facultyId;
    } else {
      // TEACHER — same chain, walked upward from the department (r178):
      // the department's faculty must belong to the registered institution.
      if (!input.departmentId || !input.specialty) {
        throw AppError.badRequest('بيانات الأستاذ غير مكتملة — القسم والتخصص مطلوبان');
      }
      const dept = await tx.department.findUnique({
        where: { id: input.departmentId },
        select: { facultyId: true },
      });
      if (!dept) throw AppError.badRequest('القسم المختار غير موجود');
      const faculty = await tx.faculty.findUnique({
        where: { id: dept.facultyId },
        select: { institutionId: true },
      });
      if (!faculty || faculty.institutionId !== input.institutionId) {
        throw AppError.badRequest('قسم التخصص لا ينتمي إلى هذه المؤسسة');
      }
      facultyIdVerified = dept.facultyId;
    }
    // Every guard passed — the transaction may now write. (The verified
    // chain lives on in the profile rows below.)
    void facultyIdVerified;

    const createdUser = await tx.user.create({
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

    // The Membership is the effective institution role source (r178);
    // the profile hangs OFF the membership.
    const membershipRow = await tx.membership.create({
      data: {
        userId: createdUser.id,
        institutionId: input.institutionId,
        role: input.role,
        isActive: true,
      },
    });

    if (input.role === Role.STUDENT) {
      // Duplicate reg-number WITHIN the institution → P2002 on the
      // scoped unique (institutionId, universityId) → 409 envelope.
      await tx.studentProfile.create({
        data: {
          userId: createdUser.id,
          membershipId: membershipRow.id,
          institutionId: input.institutionId,
          universityId: input.universityId!,
          facultyId: input.facultyId!,
          departmentId: input.departmentId!,
          year: input.year ?? 1,
        },
      });
    } else {
      // Note: `position` (Dean / Dept Head / Associate Dean) is intentionally
      // NOT settable via self-serve registration. Appointments are made by an
      // administrator, never claimed at signup.
      await tx.teacherProfile.create({
        data: {
          userId: createdUser.id,
          membershipId: membershipRow.id,
          specialty: input.specialty!,
          rank: input.rank ?? 'LECTURER',
          departmentId: input.departmentId!,
        },
      });
    }
    return { user: createdUser, membership: membershipRow, institution: institutionRow };
  });

  // Token minted WITH the registered institution's context (exactly the
  // one membership the account now holds).
  return issueTokens(created, input.institutionId, [
    {
      id: membership.id,
      userId: created.id,
      institutionId: input.institutionId,
      role: membership.role,
      isActive: membership.isActive,
      institution: {
        id: institution.id,
        name: institution.name,
        nameEn: institution.nameEn,
        slug: institution.slug,
        status: institution.status,
      },
    },
  ]);
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
 *     lockDurationFor(email) — the full policy for real accounts, the
 *     60 s demo backoff for @test.ly — once the live count reaches
 *     MAX_FAILED_LOGINS.
 *   - On locked account: burns the same argon2 work as the other
 *     failure paths so lock state isn't timing-visible. (The 429 status
 *     itself still discloses "identifier exists AND is locked" — an
 *     accepted tradeoff, because a genuinely locked-out user needs the
 *     explanation; the argon2 burn removes the silent timing oracle.)
 *   - On unknown identifier: burns equal argon2 work (timing
 *     equalization) so identifier enumeration via response time is
 *     not possible.
 *   - On success: resets the failure counters.
 *
 * r178: a reg-number is unique PER INSTITUTION — the same number can
 * exist in several institutions. >1 hit without an `institutionSlug`
 * hint → 400 REG_NUMBER_AMBIGUOUS (login by email or pass the slug).
 * The access token's institution context is resolved from ACTIVE
 * memberships: exactly one → auto-selected, else null (select-institution).
 */
export const loginUser = async (
  email: string,
  password: string,
  ctx: LoginContext = {},
  institutionSlug?: string,
) => {
  // Identifier may be an email OR a university registration number.
  // We discriminate by '@' presence — emails always contain it, reg-numbers don't.
  const identifier = email.trim();
  let user;
  if (identifier.includes('@')) {
    user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  } else {
    // Reg-number path: find profiles by universityId. institutionSlug
    // (when given) narrows to that institution — the disambiguation
    // handle for numbers registered in several institutions.
    const profiles = await prisma.studentProfile.findMany({
      where: {
        universityId: identifier,
        ...(institutionSlug ? { institution: { slug: institutionSlug } } : {}),
      },
      include: { user: true },
    });
    if (profiles.length > 1) {
      await writeLoginEvent({
        email: identifier,
        success: false,
        reason: 'REG_NUMBER_AMBIGUOUS',
        ...ctx,
      });
      throw new AppError(
        'REG_NUMBER_AMBIGUOUS',
        'الرقم الجامعي مسجّل في أكثر من مؤسسة — سجّل الدخول بالبريد الإلكتروني أو حدّد المؤسسة',
        400,
      );
    }
    user = profiles[0]?.user ?? null;
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
    throw AppError.tooMany('الحساب مقفل مؤقتاً — حاول مرة أخرى بعد قليل');
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
        // R320 §C: the lock length is per-account — @test.ly demo
        // accounts take the 60 s backoff (lockout.ts lockDurationFor),
        // every real account keeps the full 15-minute policy.
        data: { lockedUntil: new Date(Date.now() + lockDurationFor(user.email)) },
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
    throw AppError.forbidden('هذا الحساب معطّل — تواصل مع إدارة المنصّة');
  }

  // Reset failure counters
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
  // Success LoginEvent — fires AFTER the counters reset so the
  // analytics dashboard shows the user as fully logged in. Best-effort.
  await writeLoginEvent({ email: identifier, success: true, userId: user.id, ...ctx });

  // r178: resolve the institution context (single active membership →
  // auto-select; multiple/none → null + the client picks).
  const { institutionId, memberships } = await resolveDefaultContext(user.id);
  return issueTokens(user, institutionId, memberships);
};

/**
 * r178: explicitly select the institution context (multi-membership
 * users). Server-side verification of an ACTIVE membership in an
 * ACTIVE institution — the token never grants what the DB denies.
 * Same refresh version (no bump: selecting is not a revocation event).
 */
export const selectInstitution = async (userId: string, institutionId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw AppError.unauthenticated();
  const memberships = await resolveMemberships(userId);
  const membership = memberships.find((m) => m.institutionId === institutionId);
  if (!membership) {
    throw new AppError('INSTITUTION_CONTEXT_INVALID', 'عضوية المؤسسة غير نشطة أو غير صالحة', 403);
  }
  return issueTokens(user, membership.institutionId, memberships);
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
 * r178: the institution context is RE-RESOLVED by the same rules as
 * login (single active membership → auto-select; several → null, the
 * client re-selects; revoked/suspended → gone). The refresh payload
 * carries no inst claim, so this is the only coherent semantics — and
 * it means membership revocation takes effect at refresh time too.
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
    throw AppError.unauthenticated('جلسة غير صالحة — سجّل الدخول من جديد');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw AppError.unauthenticated();
  const decision = decideRefresh(user, payload.ver);
  if (decision.outcome === 'reauth') {
    // Keep the distinct message: the SPA treats a revoked session as a
    // hard logout (drop to the login screen) vs a generic 401. The wire
    // discriminator is the code field; the message stays human-readable
    // Arabic (D17-3).
    throw decision.reason === 'revoked'
      ? AppError.unauthenticated('انتهت صلاحية هذه الجلسة — سجّل الدخول من جديد')
      : AppError.unauthenticated();
  }
  const { institutionId, memberships } = await resolveDefaultContext(user.id);
  return issueTokens(user, institutionId, memberships);
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
 * The institution context of the re-issued tokens follows the same
 * resolution rules as refresh (r178).
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
    throw AppError.badRequest('كلمة المرور لا تستوفي الشروط المطلوبة', policy.error.flatten());
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw AppError.unauthenticated();

  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) {
    // Rate limiting (route limiter) is the brute-force guard here; the
    // login lockout counters intentionally stay untouched.
    throw AppError.invalidCredentials('كلمة المرور الحالية غير صحيحة');
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
    throw AppError.unauthenticated('تغيّرت الجلسة من جهاز آخر — سجّل الدخول من جديد');
  }

  // Re-read for the fresh version (the bump is atomic, but another
  // revocation could still land before we issue; that token would 401
  // on its next refresh — acceptable and documented).
  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  if (!updated) throw AppError.unauthenticated();
  const { institutionId, memberships } = await resolveDefaultContext(updated.id);
  return issueTokens(updated, institutionId, memberships);
};

/**
 * GET /auth/me payload. r178: the memberships list + current context
 * ride along, and the profiles are scoped to the CURRENT membership
 * (resolved from the token's institutionId against the DB) — never the
 * user's profile-array heads (a user may study in one institution and
 * teach in another).
 */
export const getCurrentUser = async (userId: string, institutionId: string | null) => {
  type MembershipWithProfiles = ActiveMembership & {
    studentProfiles: unknown[];
    teacherProfiles: unknown[];
  };
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      scopeFaculty: true,
      memberships: {
        where: { isActive: true, institution: { status: 'ACTIVE' } },
        include: {
          institution: { select: { id: true, name: true, nameEn: true, slug: true, status: true } },
          studentProfiles: { include: { faculty: true, department: true } },
          teacherProfiles: {
            include: {
              department: true,
              positionFaculty: true,
              positionDepartment: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!u) throw AppError.notFound('المستخدم غير موجود');
  const memberships = u.memberships as unknown as MembershipWithProfiles[];
  const current = institutionId
    ? (memberships.find((m) => m.institutionId === institutionId) ?? null)
    : null;
  return {
    ...sanitizeUser(u),
    scopeFaculty: u.scopeFaculty
      ? { id: u.scopeFaculty.id, name: u.scopeFaculty.name }
      : null,
    memberships: buildMembershipSummaries(memberships),
    currentInstitution: current
      ? {
          id: current.institution.id,
          name: current.institution.name,
          nameEn: current.institution.nameEn,
          slug: current.institution.slug,
        }
      : null,
    membershipRole: current ? current.role : null,
    // Profiles of the CURRENT membership only (stale/revoked context →
    // null; requireInstitution 403s institution-scoped routes anyway).
    studentProfile: current ? (current.studentProfiles[0] ?? null) : null,
    teacherProfile: current ? (current.teacherProfiles[0] ?? null) : null,
  };
};

/**
 * Mint a fresh session for `user` in the given institution context.
 * r178: `institutionId` (null = no context — the client must select)
 * lands in the access token's `inst` claim; the user payload carries
 * the selectable memberships + the current institution + the
 * membership-derived role.
 */
const issueTokens = (
  user: User,
  institutionId: string | null,
  memberships: readonly ActiveMembership[] = [],
) => {
  const accessToken = signAccessToken(user.id, user.role, institutionId);
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);
  const current = institutionId
    ? (memberships.find((m) => m.institutionId === institutionId) ?? null)
    : null;
  return {
    user: {
      ...sanitizeUser(user),
      memberships: buildMembershipSummaries(memberships),
      currentInstitution: current
        ? {
            id: current.institution.id,
            name: current.institution.name,
            nameEn: current.institution.nameEn,
            slug: current.institution.slug,
          }
        : null,
      membershipRole: current ? current.role : null,
    },
    accessToken,
    refreshToken,
  };
};
