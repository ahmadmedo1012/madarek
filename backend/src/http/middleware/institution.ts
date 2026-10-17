import type { RequestHandler } from 'express';
import type { Institution, InstitutionStatus, Membership, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { AppError } from '../../lib/errors.js';

/**
 * r178 (multi-institution foundation) — institution context resolution.
 *
 * Two exports:
 *  - `resolveMemberships(userId)` — lightweight active-membership list
 *    (institution basics included). Reused by login / me /
 *    select-institution to build the session payload.
 *  - `requireInstitution` — route middleware (use AFTER authMiddleware)
 *    that re-resolves the caller's membership from the DB. NEVER trust
 *    the token's role/inst alone: a membership revoked or an
 *    institution suspended AFTER the token was minted must take effect
 *    on the very next request.
 */

/** Institution basics carried on every membership summary (no internals). */
export interface InstitutionBasics {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  status: InstitutionStatus;
}

/** An ACTIVE membership of an ACTIVE institution (+ institution basics). */
export type ActiveMembership = {
  id: string;
  userId: string;
  institutionId: string;
  role: Role;
  isActive: boolean;
  institution: InstitutionBasics;
};

/**
 * Active memberships (institution ACTIVE) for a user, oldest first.
 * This is the login/me/select-institution context source: revoked
 * memberships and memberships of suspended institutions are invisible
 * to session resolution (they can neither be auto-selected nor listed
 * as switch targets).
 */
export const resolveMemberships = (userId: string): Promise<ActiveMembership[]> =>
  prisma.membership.findMany({
    where: { userId, isActive: true, institution: { status: 'ACTIVE' } },
    select: {
      id: true,
      userId: true,
      institutionId: true,
      role: true,
      isActive: true,
      institution: { select: { id: true, name: true, nameEn: true, slug: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  }) as Promise<ActiveMembership[]>;

/**
 * Route middleware — require a valid institution context.
 *
 * Preconditions (enforced here, in order):
 *  1. authMiddleware ran (req.user present) — 401 otherwise.
 *  2. req.user.institutionId is non-null — 403 INSTITUTION_CONTEXT_REQUIRED
 *     (the client must call POST /auth/select-institution first).
 *  3. The DB confirms an ACTIVE membership in an ACTIVE institution for
 *     the token's user + institutionId — 403 INSTITUTION_CONTEXT_INVALID
 *     otherwise (revoked membership, suspended institution, or a forged
 *     inst claim).
 *
 * On success attaches `req.membership` (with institution), `req.institution`,
 * and the membership-scoped `req.studentProfile` / `req.teacherProfile`
 * (null when the membership has no such profile — profiles hang OFF the
 * membership since r178, so there is at most one of each).
 */
export const requireInstitution: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.user) return next(AppError.unauthenticated());
    const { institutionId } = req.user;
    if (institutionId === null || institutionId === undefined) {
      return next(
        new AppError(
          'INSTITUTION_CONTEXT_REQUIRED',
          'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
          403,
        ),
      );
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: req.user.id,
        institutionId,
        isActive: true,
        institution: { status: 'ACTIVE' },
      },
      include: {
        institution: true,
        studentProfiles: true,
        teacherProfiles: true,
      },
    });

    if (!membership) {
      return next(
        new AppError('INSTITUTION_CONTEXT_INVALID', 'عضوية المؤسسة غير نشطة أو غير صالحة', 403),
      );
    }

    // membershipId is @unique on both profile models → at most one each.
    const studentProfile = membership.studentProfiles[0] ?? null;
    const teacherProfile = membership.teacherProfiles[0] ?? null;
    const { institution } = membership;

    req.membership = membership as Membership & { institution: Institution };
    req.institution = institution;
    req.studentProfile = studentProfile;
    req.teacherProfile = teacherProfile;
    next();
  } catch (e) {
    next(e);
  }
};
