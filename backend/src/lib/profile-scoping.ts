import type { StudentProfile, TeacherProfile } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from './errors.js';

/**
 * r178 (multi-institution foundation) — membership-scoped profile
 * resolution for the existing domain routes.
 *
 * StudentProfile/TeacherProfile hang off a Membership since r178 (a
 * user may hold profiles in several institutions), so every legacy
 * `user.studentProfile` / `findUnique({ where: { userId } })` read had
 * to become a resolution. Two rules cover the domain routes:
 *
 *  1. WITH an institution context (the token's `inst` claim, or
 *     `req.membership` when `requireInstitution` ran): resolve the
 *     profile FOR THAT institution only — null when the user holds no
 *     profile there.
 *  2. WITHOUT a context (public/legacy paths): the legacy fallback —
 *     the user's oldest profile whose membership is active in an
 *     ACTIVE institution. TODO(r179/phase-5): full data isolation
 *     replaces these fallbacks with hard institution scoping.
 *
 * `requireInstitution` (http/middleware/institution.ts) remains the
 * authority for routes the mission hard-scopes; these helpers cover
 * the read/legacy surfaces that must keep answering contextless
 * callers (OWNER, public pages) without guessing.
 */

/** Prisma client subset — satisfied by both `prisma` and a transaction client. */
type ProfileClient = Pick<typeof prisma, 'studentProfile' | 'teacherProfile'>;

/** An institution id from a request context — null/undefined = legacy fallback. */
export type InstitutionContext = string | null | undefined;

/**
 * Resolve a user's StudentProfile. Institution-scoped when a context is
 * supplied; otherwise the user's oldest profile under an ACTIVE
 * membership of an ACTIVE institution (legacy fallback).
 */
export function resolveStudentProfile(
  userId: string,
  institutionId: InstitutionContext = null,
  client: ProfileClient = prisma,
): Promise<StudentProfile | null> {
  return client.studentProfile.findFirst({
    where: institutionId
      ? { userId, institutionId, membership: { isActive: true } }
      : { userId, membership: { isActive: true, institution: { status: 'ACTIVE' } } },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Resolve a user's TeacherProfile (the institution is reached through
 * the membership — the model carries no denormalized institutionId).
 * Institution-scoped when a context is supplied; otherwise the legacy
 * fallback described in the module docblock.
 */
export function resolveTeacherProfile(
  userId: string,
  institutionId: InstitutionContext = null,
  client: ProfileClient = prisma,
): Promise<TeacherProfile | null> {
  return client.teacherProfile.findFirst({
    where: institutionId
      ? { userId, membership: { institutionId, isActive: true } }
      : { userId, membership: { isActive: true, institution: { status: 'ACTIVE' } } },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * DB-verified institution scope for the CALLER's token context.
 *
 * Returns the institution id when the caller's token carries an `inst`
 * claim AND the DB confirms an ACTIVE membership in an ACTIVE
 * institution for it (the same re-resolution `requireInstitution`
 * performs — the claim is never trusted alone); returns null when the
 * caller has no context claim (OWNER / platform-level / a
 * multi-membership session that has not selected one — those keep the
 * legacy, institution-unscoped behavior until Phase 5).
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
