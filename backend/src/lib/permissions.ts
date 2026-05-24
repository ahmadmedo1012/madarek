import { Capability, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from './errors.js';

/**
 * Default capabilities granted to each role.
 *
 * Important governance rule (per spec):
 *  - ADMIN does NOT auto-inherit teacher-only or quality-only capabilities.
 *  - QUALITY has oversight (read + report + moderation), not admin power.
 *  - TEACHER acts only on their own offerings (own = grade/curriculum scope).
 *
 * Effective capability set =
 *    role-defaults
 *  + UserPermission grants
 *  − UserPermission revokes
 */
export const DEFAULT_ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  STUDENT: [
    'EXAMS_TAKE',
  ],
  TEACHER: [
    'RESEARCH_GRADE_OWN',
    'RESEARCH_PUBLISH',
    'EXAMS_AUTHOR',
    'CURRICULUM_EDIT_OWN',
    'ANNOUNCE_FACULTY',
    'COMPETITIONS_RUN',
    'EVENTS_RUN',
  ],
  ADMIN: [
    'USERS_MANAGE',
    'ROLES_ASSIGN',
    'TEACHERS_VERIFY',
    'ANNOUNCE_PLATFORM',
    'ANNOUNCE_FACULTY',
    'COMPETITIONS_RUN',
    'EVENTS_RUN',
    'CURRICULUM_EDIT_ANY',
    'RESEARCH_PUBLISH',
    // NOTE: No RESEARCH_GRADE_OWN/ANY — admins shouldn't grade by default.
    //       No EXAMS_AUTHOR/MODERATE — separate capability grant required.
    //       No QUALITY_VIEW — separate role.
  ],
  QUALITY: [
    'QUALITY_VIEW',
    'QUALITY_REPORT',
    'EXAMS_MODERATE',
    'ANNOUNCE_FACULTY',
    // NOTE: NO USERS_MANAGE, NO ROLES_ASSIGN — quality is oversight, not control.
  ],
};

/**
 * Compute the effective capability set for a user.
 * Cached per-request would be ideal, but for now we do one DB call per check.
 */
export async function getEffectiveCapabilities(userId: string, role: Role): Promise<Set<Capability>> {
  const overrides = await prisma.userPermission.findMany({
    where: { userId },
    select: { capability: true, grant: true },
  });
  const caps = new Set<Capability>(DEFAULT_ROLE_CAPABILITIES[role]);
  for (const o of overrides) {
    if (o.grant) caps.add(o.capability);
    else caps.delete(o.capability);
  }
  return caps;
}

/**
 * Throw if the user lacks ALL of the listed capabilities.
 * (any-of semantics — possessing one is enough)
 */
export async function assertCapability(
  userId: string,
  role: Role,
  ...required: Capability[]
): Promise<void> {
  const caps = await getEffectiveCapabilities(userId, role);
  for (const r of required) if (caps.has(r)) return;
  throw AppError.forbidden(`Missing capability: ${required.join(' or ')}`);
}

/**
 * Resource ownership helpers — these return without throwing if access OK.
 */
export async function assertOwnsResearchPaper(paperId: string, userId: string, role: Role): Promise<void> {
  const caps = await getEffectiveCapabilities(userId, role);
  if (caps.has('RESEARCH_GRADE_ANY')) return;
  if (!caps.has('RESEARCH_GRADE_OWN')) throw AppError.forbidden('Cannot grade research papers');

  const paper = await prisma.researchPaper.findUnique({
    where: { id: paperId },
    select: {
      offeringId: true,
      offering: { select: { teacherId: true } },
    },
  });
  if (!paper) throw AppError.notFound('Paper not found');
  // No offering linked → orphaned paper, only ADMIN with GRADE_ANY can touch
  if (!paper.offering) throw AppError.forbidden('Paper not linked to your offering');
  if (paper.offering.teacherId !== userId) {
    throw AppError.forbidden('You do not teach the offering this paper belongs to');
  }
}

export async function assertOwnsOffering(offeringId: string, userId: string, role: Role): Promise<void> {
  const caps = await getEffectiveCapabilities(userId, role);
  if (caps.has('CURRICULUM_EDIT_ANY')) return;
  if (!caps.has('CURRICULUM_EDIT_OWN')) throw AppError.forbidden('Cannot edit curriculum');
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: { teacherId: true },
  });
  if (!offering) throw AppError.notFound('Offering not found');
  if (offering.teacherId !== userId) throw AppError.forbidden('Not your offering');
}
