import type { Role, StudentProfile, TeacherProfile } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from './errors.js';

/**
 * r179 (phase-5 data isolation) — institution-scoped profile and
 * ownership-chain resolution for the academic domain routes.
 *
 * StudentProfile/TeacherProfile hang off a Membership since r178 (a
 * user may hold profiles in several institutions), so every profile
 * read had to become a resolution. r178 shipped that with a legacy
 * fallback: a caller WITHOUT an institution context got the user's
 * OLDEST active profile — a blind guess that silently widens access
 * the moment a user holds two profiles. Phase 5 removes the guess:
 *
 *  1. `resolveStudentProfile` / `resolveTeacherProfile` now REQUIRE an
 *     institution id. A missing/empty context throws 403
 *     INSTITUTION_CONTEXT_REQUIRED — callers must resolve a VERIFIED
 *     context first (`resolveCallerInstitutionScope` re-verifies the
 *     token's `inst` claim against the DB; `requireInstitution` checks
 *     it for whole routes). There is NO oldest-profile fallback.
 *  2. Platform views whose caller genuinely has no context (OWNER
 *     console) must say WHICH institution they are looking at:
 *     `resolvePlatformStudentProfile` / `resolvePlatformTeacherProfile`
 *     take an explicit institution id — never a guess.
 *  3. `resolveCallerInstitutionScope` stays the claim re-verifier
 *     (throws 403 INSTITUTION_CONTEXT_INVALID on forged/stale claims).
 *  4. `assertOfferingInCallerInstitution` guards the
 *     CourseOffering → Course → institutionId ownership chain for the
 *     oversight roles whose per-row guards bypass ownership
 *     (ADMIN/QUALITY): a foreign-institution offering id is a 404 on
 *     reads (never leak existence) and a 403 on writes.
 */

/** Prisma client subset — satisfied by both `prisma` and a transaction client. */
type ProfileClient = Pick<typeof prisma, 'studentProfile' | 'teacherProfile'>;

/**
 * An institution id as passed by callers. REQUIRED for
 * `resolveStudentProfile`/`resolveTeacherProfile`: null/undefined
 * throws (fail-closed). The type stays permissive ONLY so that call
 * sites passing `req.user!.institutionId` (string | null) keep
 * compiling — the runtime contract is a verified non-empty string.
 */
export type InstitutionContext = string | null | undefined;

/** The shared fail-closed error for a missing institution context. */
export function institutionContextRequiredError(): AppError {
  return new AppError(
    'INSTITUTION_CONTEXT_REQUIRED',
    'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
    403,
  );
}

/** Fail-closed coercion: a context must be a non-empty string. */
function requireInstitutionId(institutionId: InstitutionContext): string {
  if (typeof institutionId !== 'string' || institutionId.length === 0) {
    throw institutionContextRequiredError();
  }
  return institutionId;
}

/**
 * Resolve a user's StudentProfile IN a verified institution. The
 * context is REQUIRED — no legacy oldest-profile fallback exists
 * anymore (r179/phase-5); a missing context throws 403
 * INSTITUTION_CONTEXT_REQUIRED, a forged/stale claim must be caught
 * by `resolveCallerInstitutionScope` BEFORE it reaches here.
 */
export function resolveStudentProfile(
  userId: string,
  institutionId: InstitutionContext,
  client: ProfileClient = prisma,
): Promise<StudentProfile | null> {
  const inst = requireInstitutionId(institutionId);
  return client.studentProfile.findFirst({
    where: { userId, institutionId: inst, membership: { isActive: true } },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Resolve a user's TeacherProfile (the institution is reached through
 * the membership — the model carries no denormalized institutionId).
 * Same REQUIRED-context contract as `resolveStudentProfile`: no
 * oldest-profile fallback, 403 on a missing context.
 */
export function resolveTeacherProfile(
  userId: string,
  institutionId: InstitutionContext,
  client: ProfileClient = prisma,
): Promise<TeacherProfile | null> {
  const inst = requireInstitutionId(institutionId);
  return client.teacherProfile.findFirst({
    where: { userId, membership: { institutionId: inst, isActive: true } },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Platform view of a user's StudentProfile — for callers with NO
 * membership context (the OWNER console). The institution is EXPLICIT
 * (validated by the caller — typically via an ?institution= slug the
 * route resolved to an existing institution); it is never guessed from
 * the user's profile history.
 */
export function resolvePlatformStudentProfile(
  userId: string,
  institutionId: string,
  client: ProfileClient = prisma,
): Promise<StudentProfile | null> {
  return resolveStudentProfile(userId, institutionId, client);
}

/**
 * Platform view of a user's TeacherProfile — the explicit-institution
 * twin of `resolvePlatformStudentProfile` (OWNER console surfaces).
 */
export function resolvePlatformTeacherProfile(
  userId: string,
  institutionId: string,
  client: ProfileClient = prisma,
): Promise<TeacherProfile | null> {
  return resolveTeacherProfile(userId, institutionId, client);
}

/**
 * DB-verified institution scope for the CALLER's token context.
 *
 * Returns the institution id when the caller's token carries an `inst`
 * claim AND the DB confirms an ACTIVE membership in an ACTIVE
 * institution for it (the same re-resolution `requireInstitution`
 * performs — the claim is never trusted alone); returns null when the
 * caller has no context claim (OWNER / platform-level / a
 * multi-membership session that has not selected one yet — those
 * callers must NOT be handed institution-scoped data without an
 * explicit institution parameter).
 *
 * A context claim that does NOT resolve (revoked membership, suspended
 * institution, forged claim) throws 403 INSTITUTION_CONTEXT_INVALID —
 * downgrading it to "no context" would silently widen access.
 */
export async function resolveCallerInstitutionScope(
  userId: string,
  institutionId: InstitutionContext,
): Promise<string | null> {
  if (typeof institutionId !== 'string' || institutionId.length === 0) return null;
  const membership = await prisma.membership.findFirst({
    where: { userId, institutionId, isActive: true, institution: { status: 'ACTIVE' } },
    select: { institutionId: true },
  });
  if (!membership) {
    throw new AppError('INSTITUTION_CONTEXT_INVALID', 'عضوية المؤسسة غير نشطة أو غير صالحة', 403);
  }
  return membership.institutionId;
}

/**
 * r179 (phase-5): the CourseOffering ownership-chain guard for
 * oversight roles. `assertOfferingAccess` / `assertOwnsOffering`
 * bypass the per-row ownership checks for ADMIN and QUALITY —
 * correct within one institution, but a cross-institution offering
 * id must never slip through that bypass.
 *
 * Semantics:
 *  - OWNER: no-op (platform-wide oversight by design).
 *  - STUDENT/TEACHER: no-op (their access is already pinned to rows
 *    they own — an enrollment or a teaching assignment — which is a
 *    stronger per-row guarantee than institution membership).
 *  - ADMIN/QUALITY: the caller's DB-verified institution context is
 *    REQUIRED (403 INSTITUTION_CONTEXT_REQUIRED without one), and the
 *    offering's Course → institutionId chain must match it:
 *    `mode: 'read'` → 404 on a foreign offering (never leak
 *    existence), `mode: 'write'` → 403 (the write is understood but
 *    out of scope).
 */
export async function assertOfferingInCallerInstitution(
  offeringId: string,
  user: { id: string; role: Role; institutionId: string | null },
  mode: 'read' | 'write' = 'write',
): Promise<void> {
  if (user.role === 'OWNER' || user.role === 'STUDENT' || user.role === 'TEACHER') return;
  const scope = await resolveCallerInstitutionScope(user.id, user.institutionId);
  if (!scope) throw institutionContextRequiredError();
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: { course: { select: { institutionId: true } } },
  });
  // A missing offering 404s in the caller's own guards — never here.
  if (!offering) return;
  if (offering.course.institutionId !== scope) {
    throw mode === 'read'
      ? AppError.notFound('المقرر المطلوب غير موجود')
      : AppError.forbidden('هذا المقرر ينتمي إلى مؤسسة أخرى');
  }
}
