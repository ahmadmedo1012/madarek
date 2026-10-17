import { Prisma, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from './errors.js';

/**
 * Shared governance guards for the user-management surfaces
 * (`users.routes.ts`, `permissions.routes.ts`, and the OWNER console
 * in `owner.routes.ts` — all three surfaces share this module since
 * 13-1, so the ADMIN and OWNER semantics can never diverge).
 *
 * Three concerns live here:
 *  1. Last-active-OWNER protection — demoting or deactivating the only
 *     active OWNER locks the platform out of its master governance role
 *     (OWNER is invitation-only and cannot be re-minted via any API).
 *  2. Faculty governance scope (`User.scopeFacultyId`) — a scoped
 *     ADMIN/QUALITY governs only the users of their own faculty.
 *  3. TEACHER-promotion provisioning — a promoted user must leave the
 *     role change with a TeacherProfile, or every teacher surface 404s.
 *
 * The decision logic is split into pure, unit-testable helpers; the
 * DB-backed wrappers stay thin so all three surfaces share one
 * semantic (previously the ADMIN and OWNER paths diverged — audit 11-c
 * P0-1/P0-2).
 */

// ── 1. Last-active-OWNER guard ─────────────────────────────────────

/**
 * Pure count decision: with `otherActiveOwners` ACTIVE OWNER rows
 * remaining after excluding the target, is the target the last one?
 */
export function isLastActiveOwner(otherActiveOwners: number): boolean {
  return otherActiveOwners === 0;
}

/**
 * Pure policy decision: does a pending mutation need the
 * last-active-owner guard? The guard applies only to targets that
 * currently hold the OWNER role, and only when the mutation would
 * strip that status —
 *  - a role change in any direction away from OWNER (demotion), or
 *  - a status change that sets `isActive: false` (deactivation).
 * Re-assigning OWNER (blocked upstream as "promotion") and
 * re-activation are not guard cases.
 */
export function requiresLastOwnerGuard(change: {
  targetRole: Role;
  /** Present on role changes. */
  newRole?: Role;
  /** Present on status changes. */
  newIsActive?: boolean;
}): boolean {
  if (change.targetRole !== Role.OWNER) return false;
  if (change.newRole !== undefined) return change.newRole !== Role.OWNER;
  if (change.newIsActive !== undefined) return change.newIsActive === false;
  return false;
}

/**
 * TOCTOU serialization for the last-owner guard, shared by ALL FOUR
 * guarded mutations (owner console role change + status toggle,
 * `PATCH /users/:id` deactivation, `POST /admin/users/:id/role`).
 *
 * The guard's count in `assertNotLastActiveOwner` is a plain read, and
 * a plain SELECT is never blocked by another transaction's row locks
 * under Read-Committed — so two concurrent demotions/deactivations of
 * the last two active OWNERs (via different surfaces; a lock taken on
 * one surface never protects another) could both pass the count and
 * commit, permanently locking the platform out of its master
 * governance role (OWNER is invitation-only, seed-only recovery).
 *
 * Locking every active OWNER row FOR UPDATE inside the mutation
 * transaction closes the window: the second transaction blocks on the
 * first's row locks, then its count sees the post-commit state (one
 * owner already gone) and rejects with 409. Must run inside the SAME
 * transaction as the mutation and immediately BEFORE
 * `assertNotLastActiveOwner`. (Audit 15-b P1-1 — promotes the 13-1
 * OWNER-console fix to every surface; `ORDER BY id` keeps the lock
 * acquisition order deterministic across transactions.)
 */
export function lockActiveOwnerRows(tx: Prisma.TransactionClient): Promise<unknown> {
  return tx.$queryRaw`SELECT id FROM "User" WHERE "role" = 'OWNER' AND "isActive" = true ORDER BY id FOR UPDATE`;
}

/**
 * Throw 409 when the target is the last ACTIVE OWNER. 409, not 403:
 * the request is understood and valid, but applying it would leave the
 * platform in an unusable state. Pass the surrounding transaction
 * client so the count sees the same snapshot as the mutation (and a
 * crash between check and write is impossible).
 *
 * Concurrency contract (audit 15-b P1-1): the count alone is a plain
 * read two concurrent demotions can both pass under Read-Committed.
 * Every caller must run `lockActiveOwnerRows(tx)` inside the SAME
 * transaction immediately before this guard — all four guarded
 * mutations (owner role, owner status, users PATCH, permissions role)
 * do, which closes the residual this helper used to document as
 * accepted.
 */
export async function assertNotLastActiveOwner(
  targetId: string,
  client: Prisma.TransactionClient = prisma,
): Promise<void> {
  const otherActiveOwners = await client.user.count({
    where: { role: Role.OWNER, isActive: true, id: { not: targetId } },
  });
  if (isLastActiveOwner(otherActiveOwners)) {
    throw AppError.conflict(
      'لا يمكن خفض دور أو تعطيل آخر مالك نشط للمنصة',
    );
  }
}

// ── 2. Faculty governance scope (scopeFacultyId) ───────────────────

/**
 * Target summary a scope decision needs. Faculty association is
 * profile-based: students via `studentProfile.facultyId`, teachers via
 * `teacherProfile.department.facultyId`.
 */
export interface GovernanceScopeTarget {
  role: Role;
  studentFacultyId: string | null;
  teacherFacultyId: string | null;
}

/**
 * Pure scope predicate. `actorScopeFacultyId === null` means
 * university-wide (OWNER, unscoped ADMIN) — everything is in scope.
 *
 * For a faculty-scoped actor:
 *  - STUDENT  → in scope iff their home faculty matches;
 *  - TEACHER  → in scope iff their home department's faculty matches;
 *  - OWNER / ADMIN / QUALITY → NEVER in scope: platform-governance
 *    accounts are university-level, and letting a faculty admin
 *    demote/deactivate/override them would defeat the scope model
 *    entirely.
 */
export function isUserWithinScope(
  actorScopeFacultyId: string | null,
  target: GovernanceScopeTarget,
): boolean {
  if (actorScopeFacultyId === null) return true;
  if (target.role === Role.OWNER || target.role === Role.ADMIN || target.role === Role.QUALITY) {
    return false;
  }
  if (target.role === Role.STUDENT) return target.studentFacultyId === actorScopeFacultyId;
  return target.teacherFacultyId === actorScopeFacultyId;
}

/** Scope predicate as a guard — 403 when the target is out of faculty. */
export function assertWithinScope(
  actorScopeFacultyId: string | null,
  target: GovernanceScopeTarget,
): void {
  if (!isUserWithinScope(actorScopeFacultyId, target)) {
    throw AppError.forbidden('هذا المستخدم خارج نطاق الكلّيّة التي تديرها');
  }
}

/**
 * Pure list-filter builder: constrains a user-list query to the
 * actor's faculty. University-wide actors get the base filter back
 * unchanged; scoped actors get it AND-ed with
 * "STUDENT of faculty X or TEACHER homed in faculty X" — mirroring
 * `isUserWithinScope` (platform-governance roles never match).
 *
 * r178 (multi-institution): an optional `institutionId` ANDs a
 * membership-scope filter ("has an ACTIVE membership in that
 * institution") on top. The faculty filter reads the PLURAL profile
 * relations (profiles are per-membership since r178) with `some`
 * semantics identical to the old singular filter.
 *
 * r179 (phase-5) — semantics change at the ROUTE layer: the
 * `institutionId` argument is no longer optional-in-practice for
 * institutional callers. ADMIN/QUALITY user-listing routes must
 * resolve their DB-verified context (`resolveCallerInstitutionScope`)
 * and 403 INSTITUTION_CONTEXT_REQUIRED without one — they pass it
 * here, and the membership filter pins the list to their
 * institution. OWNER (platform role, no membership) passes nothing
 * and keeps the platform-wide list. This builder never falls back to
 * anything on its own — an absent `institutionId` means the CALLER
 * chose the platform-wide view.
 */
export function buildScopedUserWhere(
  actorScopeFacultyId: string | null,
  base: Prisma.UserWhereInput = {},
  institutionId?: string | null,
): Prisma.UserWhereInput {
  const scopes: Prisma.UserWhereInput[] = [base];
  if (institutionId) {
    scopes.push({ memberships: { some: { institutionId, isActive: true } } });
  }
  if (actorScopeFacultyId !== null) {
    scopes.push({
      OR: [
        { role: Role.STUDENT, studentProfiles: { some: { facultyId: actorScopeFacultyId } } },
        { role: Role.TEACHER, teacherProfiles: { some: { department: { facultyId: actorScopeFacultyId } } } },
      ],
    });
  }
  if (scopes.length === 1) return base;
  return { AND: scopes };
}

/**
 * Resolve the acting user's governance scope. Scope is an
 * ADMIN/QUALITY concept (schema: "NULL = university-wide; set =
 * scoped to that faculty only") — every other role, OWNER included,
 * is university-wide by definition, even if a stray scopeFacultyId
 * value were ever written to the row.
 */
export async function getGovernanceScope(actorId: string): Promise<string | null> {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true, scopeFacultyId: true },
  });
  if (!actor || (actor.role !== Role.ADMIN && actor.role !== Role.QUALITY)) return null;
  return actor.scopeFacultyId ?? null;
}

/** Target row + scope tuple for the write guards. */
export interface GovernanceTarget extends GovernanceScopeTarget {
  id: string;
  isActive: boolean;
}

/**
 * Load a user with exactly the fields the governance guards need
 * (role, active flag, faculty association). Returns null when the
 * user does not exist — callers turn that into a clean 404.
 *
 * r178: profiles are per-membership, so the faculty association
 * resolves through the target's profile in a given institution.
 * r179 (phase-5) — the legacy fallback is GONE: without an
 * `institutionId` the target's profiles are NOT read at all
 * (studentFacultyId/teacherFacultyId come back null). ADMIN/QUALITY
 * governance-write callers MUST pass their DB-verified institution
 * context (the routes enforce 403 INSTITUTION_CONTEXT_REQUIRED
 * without one — an unscoped governance write is a cross-institution
 * escalation); OWNER passes null legitimately (their governance
 * decisions never depend on the faculty-scope predicate —
 * `getGovernanceScope` resolves them university-wide).
 */
export async function loadGovernanceTarget(
  userId: string,
  institutionId: string | null,
): Promise<GovernanceTarget | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      // r179: no legacy fallback — without an institutionId NO
      // profile is read (take: 0), so the scope tuple carries honest
      // nulls instead of an oldest-profile guess.
      studentProfiles: {
        where: institutionId ? { institutionId } : { id: { in: [] } },
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: { facultyId: true },
      },
      teacherProfiles: {
        where: institutionId ? { membership: { institutionId } } : { id: { in: [] } },
        take: 1,
        orderBy: { createdAt: 'asc' },
        select: { department: { select: { facultyId: true } } },
      },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    isActive: user.isActive,
    studentFacultyId: user.studentProfiles[0]?.facultyId ?? null,
    teacherFacultyId: user.teacherProfiles[0]?.department.facultyId ?? null,
  };
}

// ── 3. TEACHER-promotion provisioning ──────────────────────────────

/**
 * Placeholder specialty written when promoting without an explicit
 * one — an admin fills the real specialty via the teacher
 * verification flow. Never invented data beyond this.
 */
export const TEACHER_DEFAULT_SPECIALTY = 'غير محدد';

export type TeacherProvisionPlan =
  | { kind: 'none' }
  | { kind: 'create'; departmentId: string }
  | { kind: 'missing-department' };

/**
 * Pure provisioning decision for a role change (mirrors the OWNER
 * path): a user promoted TO teacher that isn't one already and has no
 * TeacherProfile needs one provisioned. Home department = explicit
 * `departmentId` ?? the student profile's department; without either,
 * the promotion cannot proceed (the profile would be unusable).
 * Demotions and already-provisioned users need nothing — profile rows
 * persist so a demoted-then-re-promoted teacher keeps their data.
 */
export function planTeacherProvisioning(input: {
  newRole: Role;
  oldRole: Role;
  hasTeacherProfile: boolean;
  explicitDepartmentId?: string | null;
  studentDepartmentId?: string | null;
}): TeacherProvisionPlan {
  if (input.newRole !== Role.TEACHER || input.oldRole === Role.TEACHER || input.hasTeacherProfile) {
    return { kind: 'none' };
  }
  const departmentId = input.explicitDepartmentId ?? input.studentDepartmentId ?? null;
  if (!departmentId) return { kind: 'missing-department' };
  return { kind: 'create', departmentId };
}

/**
 * r179 (phase-5): resolve the institution a TEACHER promotion should
 * provision in — fail-closed, no oldest-membership guess.
 *
 *  1. Caller WITH an institution context (ADMIN/QUALITY — the route
 *     has already DB-verified it): the target MUST hold an ACTIVE
 *     membership in THAT institution, otherwise 400 with a clear
 *     Arabic message (an admin promotes "their" user where they both
 *     belong — never a cross-institution escalation).
 *  2. Caller WITHOUT a context (platform OWNER): the target must have
 *     EXACTLY ONE active membership in an ACTIVE institution — zero
 *     memberships is a clean 400, and more than one is an ambiguous
 *     400 that names the membership count honestly (the OWNER must
 *     pick the institution explicitly instead of the platform
 *     silently choosing the oldest row).
 *
 * Always returns a validated institution id or throws 400 — the
 * legacy `null` return ("no institution, route decides") is gone;
 * the provisioning routes no longer need their null branch.
 */
export async function resolveProvisionInstitution(
  preferredInstitutionId: string | null | undefined,
  targetUserId: string,
): Promise<string> {
  if (typeof preferredInstitutionId === 'string' && preferredInstitutionId.length > 0) {
    const inCallerInstitution = await prisma.membership.findFirst({
      where: {
        userId: targetUserId,
        institutionId: preferredInstitutionId,
        isActive: true,
        institution: { status: 'ACTIVE' },
      },
      select: { institutionId: true },
    });
    if (!inCallerInstitution) {
      throw AppError.badRequest(
        'المستخدم المحدد ليس عضواً نشطاً في مؤسستك — لا يمكن ترقيته إلى أستاذ خارج مؤسستك',
      );
    }
    return inCallerInstitution.institutionId;
  }
  // Platform (OWNER) path — exactly one active membership or a 400.
  const memberships = await prisma.membership.findMany({
    where: { userId: targetUserId, isActive: true, institution: { status: 'ACTIVE' } },
    select: { institutionId: true },
    orderBy: { createdAt: 'asc' },
  });
  if (memberships.length === 0) {
    throw AppError.badRequest(
      'المستخدم المحدد لا ينتمي إلى أي مؤسسة نشطة — لا يمكن ترقيته إلى أستاذ',
    );
  }
  if (memberships.length > 1) {
    throw AppError.badRequest(
      `المستخدم المحدد لديه ${memberships.length} عضويات نشطة — حدّد المؤسسة التي تريد الترقية فيها`,
    );
  }
  return memberships[0]!.institutionId;
}

/**
 * Build the transaction step that creates the TeacherProfile. Returned
 * as a closure over a transaction client so the route can run it
 * inside the same `$transaction` as the role update (never a role
 * change without its profile, or vice versa).
 *
 * r178: the profile is per-MEMBERSHIP — the step first ensures a
 * TEACHER membership in the target institution (upsert on
 * userId+institutionId: creates it, or heals the role of an existing
 * membership to mirror the promotion), validates that the home
 * department belongs to the same institution (the chain invariant
 * registration enforces), then links the profile to the membership.
 */
export function buildTeacherProvision(
  userId: string,
  plan: { kind: 'create'; departmentId: string; institutionId: string },
  specialty?: string,
): (tx: Prisma.TransactionClient) => Promise<unknown> {
  return async (tx) => {
    const membership = await tx.membership.upsert({
      where: { userId_institutionId: { userId, institutionId: plan.institutionId } },
      create: { userId, institutionId: plan.institutionId, role: Role.TEACHER },
      update: { role: Role.TEACHER },
    });
    const department = await tx.department.findUnique({
      where: { id: plan.departmentId },
      select: { id: true, faculty: { select: { institutionId: true } } },
    });
    if (!department || department.faculty.institutionId !== plan.institutionId) {
      throw AppError.badRequest('القسم الأكاديمي المحدد لا ينتمي إلى مؤسسة المستخدم');
    }
    return tx.teacherProfile.create({
      data: {
        userId,
        membershipId: membership.id,
        specialty: specialty ?? TEACHER_DEFAULT_SPECIALTY,
        departmentId: plan.departmentId,
      },
    });
  };
}
