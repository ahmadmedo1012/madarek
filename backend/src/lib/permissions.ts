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
 *    role-defaults (DEFAULT_ROLE_CAPABILITIES)
 *  + RolePermission rows for the role (DB layer, 30s-cached)
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
  OWNER: [
    // Platform owner — Master Control Panel role.
    // Holds the full capability set; nothing is implicitly restricted.
    'RESEARCH_GRADE_OWN',
    'RESEARCH_GRADE_ANY',
    'RESEARCH_PUBLISH',
    'EXAMS_AUTHOR',
    'EXAMS_MODERATE',
    'EXAMS_TAKE',
    'CURRICULUM_EDIT_OWN',
    'CURRICULUM_EDIT_ANY',
    'USERS_MANAGE',
    'ROLES_ASSIGN',
    'TEACHERS_VERIFY',
    'QUALITY_VIEW',
    'QUALITY_REPORT',
    'ANNOUNCE_PLATFORM',
    'ANNOUNCE_FACULTY',
    'COMPETITIONS_RUN',
    'EVENTS_RUN',
  ],
};

// ─────────────────────────────────────────────────────────────────
// RolePermission DB layer
//
// The `RolePermission` table is the operator-editable extension of
// DEFAULT_ROLE_CAPABILITIES. Until now it was seeded but never read —
// grants added there had zero effect. Effective caps are now:
//
//     effective = (DEFAULT_ROLE_CAPABILITIES[role] ∪ RolePermission rows for role)
//               + UserPermission grants
//               − UserPermission revokes
//
// A short in-process cache (global, 30s TTL) avoids one RolePermission
// query per `requireCapability` check. Nothing in the app writes
// RolePermission at runtime (it is changed by operators/seed), so a
// 30s staleness window is acceptable. `clearRolePermissionCache()` is
// exported for tests and for future write paths.
// ─────────────────────────────────────────────────────────────────
const ROLE_PERMISSION_CACHE_TTL_MS = 30_000;

interface RolePermissionRow {
  role: Role;
  capability: Capability;
}

interface RolePermissionCache {
  rows: RolePermissionRow[];
  fetchedAt: number;
}

let rolePermissionCache: RolePermissionCache | null = null;
let rolePermissionFetch: Promise<RolePermissionRow[]> | null = null;

async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  try {
    return await prisma.rolePermission.findMany({
      select: { role: true, capability: true },
    });
  } catch {
    // Table empty / unreachable (e.g. transient DB blip) → pure fallback.
    return [];
  }
}

async function getRolePermissions(): Promise<RolePermissionRow[]> {
  const now = Date.now();
  if (rolePermissionCache && now - rolePermissionCache.fetchedAt < ROLE_PERMISSION_CACHE_TTL_MS) {
    return rolePermissionCache.rows;
  }
  // Coalesce concurrent misses into one query (no stampede).
  if (!rolePermissionFetch) {
    rolePermissionFetch = fetchRolePermissions().finally(() => {
      rolePermissionFetch = null;
    });
  }
  const rows = await rolePermissionFetch;
  rolePermissionCache = { rows, fetchedAt: Date.now() };
  return rows;
}

/** Test/utility hook — drop the in-process RolePermission cache. */
export function clearRolePermissionCache(): void {
  rolePermissionCache = null;
}

/**
 * Pure merge of the three capability layers. Exported so the merge
 * semantics are unit-testable without a DB.
 */
export function mergeCapabilities(
  role: Role,
  dbRoleRows: RolePermissionRow[],
  userOverrides: ReadonlyArray<{ capability: Capability; grant: boolean }>,
): Set<Capability> {
  const caps = new Set<Capability>(DEFAULT_ROLE_CAPABILITIES[role]);
  for (const row of dbRoleRows) {
    if (row.role === role) caps.add(row.capability);
  }
  for (const o of userOverrides) {
    if (o.grant) caps.add(o.capability);
    else caps.delete(o.capability);
  }
  return caps;
}

/**
 * Compute the effective capability set for a user.
 * One query per call for user overrides + a 30s-cached role table read.
 */
export async function getEffectiveCapabilities(userId: string, role: Role): Promise<Set<Capability>> {
  const [dbRoleRows, overrides] = await Promise.all([
    getRolePermissions(),
    prisma.userPermission.findMany({
      where: { userId },
      select: { capability: true, grant: true },
    }),
  ]);
  return mergeCapabilities(role, dbRoleRows, overrides);
}

/**
 * Throw unless the user has ANY of the listed capabilities
 * (any-of semantics — possessing one is enough).
 *
 * The thrown message names the missing capabilities: they are part of the
 * operator-facing permissions surface (RolePermission/UserPermission rows,
 * /permissions routes), not internal identifiers.
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
 *
 * OWNER (platform master) bypasses ownership checks entirely. Any
 * resource-level "you don't own this" guards would otherwise produce
 * sporadic 403s for the platform owner browsing the same pages a teacher
 * or admin can browse without issue.
 */
export async function assertOwnsResearchPaper(paperId: string, userId: string, role: Role): Promise<void> {
  if (role === Role.OWNER) return;
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
  if (role === Role.OWNER) return;
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

/** Facts about one offering + caller, as needed by the access decision. */
export interface OfferingAccessFacts {
  /** The offering row exists (a missing row 404s for every non-bypass role). */
  exists: boolean;
  /** The offering is taught by the calling user (teacher path). */
  taughtBy: boolean;
  /** The caller has an enrollment row with status 'active' (student path). */
  activelyEnrolled: boolean;
}

/** Outcome of `decideOfferingAccess` — mapped to AppError by the wrapper. */
export type OfferingAccessDecision = 'ok' | 'not_found' | 'forbidden';

/**
 * Pure access decision for a CourseOffering, factored out of
 * `assertOfferingAccess` so the role matrix is unit-testable without a DB.
 *
 * Semantics (mirrors the platform-wide enrollment convention — only
 * `status: 'active'` rows grant content access, never dropped/completed
 * leftovers):
 *   - offering missing → 'not_found' (never leak existence)
 *   - TEACHER → allowed iff they teach the offering
 *   - STUDENT → allowed iff actively enrolled
 *   - QUALITY → allowed (oversight role, read-only)
 *
 * Precondition: ADMIN/OWNER bypass entirely in `assertOfferingAccess`
 * (they are allowed without touching the DB) and never reach this.
 */
export function decideOfferingAccess(role: Role, facts: OfferingAccessFacts): OfferingAccessDecision {
  if (!facts.exists) return 'not_found';
  if (role === Role.TEACHER) return facts.taughtBy ? 'ok' : 'forbidden';
  if (role === Role.STUDENT) return facts.activelyEnrolled ? 'ok' : 'forbidden';
  if (role === Role.QUALITY) return 'ok'; // oversight role — read-only
  return 'forbidden';
}

/**
 * Resource-level read access guard for a CourseOffering.
 *
 * Allowed if ANY of:
 *   - role is ADMIN or OWNER (oversight — bypasses the DB check entirely)
 *   - role is TEACHER and the offering is taught by this user
 *   - role is STUDENT and the user is actively enrolled (status 'active')
 *     in the offering
 *   - role is QUALITY (oversight — read-only)
 *
 * Throws AppError.notFound if the offering doesn't exist (don't leak existence)
 * and AppError.forbidden if the caller has no business reading it.
 *
 * Use this for any endpoint that returns offering content
 * (lectures, materials, assignments, watch-event writes, checkpoint
 * answers, etc.). Without it, any authenticated user can read any
 * course's full content — an IDOR.
 */
export async function assertOfferingAccess(offeringId: string, userId: string, role: Role): Promise<void> {
  if (role === Role.ADMIN || role === Role.OWNER) return;
  // Only teacherId + the caller's ACTIVE enrollment existence feed the
  // decision — fetch exactly that, filtered server-side by status.
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: {
      teacherId: true,
      enrollments: { where: { studentId: userId, status: 'active' }, take: 1, select: { id: true } },
    },
  });
  const decision = decideOfferingAccess(role, {
    exists: offering !== null,
    taughtBy: offering?.teacherId === userId,
    activelyEnrolled: (offering?.enrollments.length ?? 0) > 0,
  });
  if (decision === 'not_found') throw AppError.notFound('Offering not found');
  if (decision === 'forbidden') throw AppError.forbidden('You do not have access to this offering');
}

