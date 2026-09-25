/**
 * Backend unit test — governance guards in `backend/src/lib/governance.ts`
 * (wave 12-4: admin governance P0s).
 *
 * Locks the shared semantics the ADMIN and OWNER user-management paths
 * must agree on:
 *  1. last-active-OWNER protection (demotion + deactivation lockout),
 *  2. faculty governance scope (scopeFacultyId list filter + write
 *     predicate),
 *  3. TEACHER-promotion provisioning planning.
 *
 * DB-free: prisma is mocked; every decision helper is pure.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { count: vi.fn(), findUnique: vi.fn() },
    teacherProfile: { create: vi.fn() },
  },
}));

import { prisma } from '../../src/db.js';
import {
  TEACHER_DEFAULT_SPECIALTY,
  assertNotLastActiveOwner,
  assertWithinScope,
  buildScopedUserWhere,
  buildTeacherProvision,
  getGovernanceScope,
  isLastActiveOwner,
  isUserWithinScope,
  loadGovernanceTarget,
  planTeacherProvisioning,
  requiresLastOwnerGuard,
} from '../../src/lib/governance';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Last-active-OWNER guard ────────────────────────────────────────

describe('isLastActiveOwner (pure count decision)', () => {
  it('zero other active owners → this target is the last one', () => {
    expect(isLastActiveOwner(0)).toBe(true);
  });

  it('any other active owner → not the last one', () => {
    expect(isLastActiveOwner(1)).toBe(false);
    expect(isLastActiveOwner(7)).toBe(false);
  });
});

describe('requiresLastOwnerGuard (pure applicability decision)', () => {
  it('fires for demoting an OWNER to any other role (audit 11-c P0-1)', () => {
    expect(requiresLastOwnerGuard({ targetRole: Role.OWNER, newRole: Role.STUDENT })).toBe(true);
    expect(requiresLastOwnerGuard({ targetRole: Role.OWNER, newRole: Role.TEACHER })).toBe(true);
    expect(requiresLastOwnerGuard({ targetRole: Role.OWNER, newRole: Role.ADMIN })).toBe(true);
  });

  it('does not fire for re-assigning OWNER (blocked upstream as promotion)', () => {
    expect(requiresLastOwnerGuard({ targetRole: Role.OWNER, newRole: Role.OWNER })).toBe(false);
  });

  it('does not fire for role changes of non-OWNER targets', () => {
    expect(requiresLastOwnerGuard({ targetRole: Role.STUDENT, newRole: Role.TEACHER })).toBe(false);
    expect(requiresLastOwnerGuard({ targetRole: Role.ADMIN, newRole: Role.STUDENT })).toBe(false);
  });

  it('fires for deactivating an OWNER (audit 11-c P0-2)', () => {
    expect(requiresLastOwnerGuard({ targetRole: Role.OWNER, newIsActive: false })).toBe(true);
  });

  it('does not fire for re-activating an OWNER or deactivating other roles', () => {
    expect(requiresLastOwnerGuard({ targetRole: Role.OWNER, newIsActive: true })).toBe(false);
    expect(requiresLastOwnerGuard({ targetRole: Role.ADMIN, newIsActive: false })).toBe(false);
    expect(requiresLastOwnerGuard({ targetRole: Role.STUDENT, newIsActive: false })).toBe(false);
  });

  it('does not fire when neither a role nor a status is being changed', () => {
    expect(requiresLastOwnerGuard({ targetRole: Role.OWNER })).toBe(false);
  });
});

describe('assertNotLastActiveOwner (mocked prisma)', () => {
  it('rejects with 409 CONFLICT when the target is the last active OWNER', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    await expect(assertNotLastActiveOwner('owner-1')).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });

  it('passes when at least one other active OWNER exists', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    await expect(assertNotLastActiveOwner('owner-1')).resolves.toBeUndefined();
  });

  it('counts ONLY other active owners (role + isActive + id exclusion)', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(2);

    await assertNotLastActiveOwner('owner-1');

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { role: Role.OWNER, isActive: true, id: { not: 'owner-1' } },
    });
  });

  it('uses the passed transaction client, not the shared prisma client', async () => {
    const tx = {
      user: { count: vi.fn().mockResolvedValue(1) },
    } as unknown as Prisma.TransactionClient;

    await assertNotLastActiveOwner('owner-1', tx);

    expect(tx.user.count).toHaveBeenCalledWith({
      where: { role: Role.OWNER, isActive: true, id: { not: 'owner-1' } },
    });
    expect(prisma.user.count).not.toHaveBeenCalled();
  });
});

// ── Faculty governance scope ───────────────────────────────────────

describe('isUserWithinScope (pure predicate)', () => {
  it('university-wide actor (null scope) reaches every role', () => {
    expect(isUserWithinScope(null, { role: Role.OWNER, studentFacultyId: null, teacherFacultyId: null })).toBe(true);
    expect(isUserWithinScope(null, { role: Role.ADMIN, studentFacultyId: null, teacherFacultyId: null })).toBe(true);
    expect(isUserWithinScope(null, { role: Role.STUDENT, studentFacultyId: 'f-other', teacherFacultyId: null })).toBe(true);
  });

  it('scoped actor reaches a student of their faculty only', () => {
    const target = (facultyId: string | null) => ({ role: Role.STUDENT, studentFacultyId: facultyId, teacherFacultyId: null });
    expect(isUserWithinScope('f-1', target('f-1'))).toBe(true);
    expect(isUserWithinScope('f-1', target('f-2'))).toBe(false);
    expect(isUserWithinScope('f-1', target(null))).toBe(false);
  });

  it('scoped actor reaches a teacher homed in their faculty only', () => {
    const target = (facultyId: string | null) => ({ role: Role.TEACHER, studentFacultyId: null, teacherFacultyId: facultyId });
    expect(isUserWithinScope('f-1', target('f-1'))).toBe(true);
    expect(isUserWithinScope('f-1', target('f-2'))).toBe(false);
    expect(isUserWithinScope('f-1', target(null))).toBe(false);
  });

  it('scoped actor NEVER reaches platform-governance roles (OWNER/ADMIN/QUALITY)', () => {
    for (const role of [Role.OWNER, Role.ADMIN, Role.QUALITY]) {
      expect(isUserWithinScope('f-1', { role, studentFacultyId: 'f-1', teacherFacultyId: 'f-1' })).toBe(false);
    }
  });
});

describe('assertWithinScope', () => {
  it('throws 403 FORBIDDEN for an out-of-scope target', () => {
    expect(() =>
      assertWithinScope('f-1', { role: Role.STUDENT, studentFacultyId: 'f-2', teacherFacultyId: null }),
    ).toThrowError(expect.objectContaining({ code: 'FORBIDDEN', status: 403 }));
  });

  it('passes silently for an in-scope target', () => {
    expect(() =>
      assertWithinScope('f-1', { role: Role.STUDENT, studentFacultyId: 'f-1', teacherFacultyId: null }),
    ).not.toThrow();
  });
});

describe('buildScopedUserWhere (pure list filter)', () => {
  it('university-wide actor → base filter returned unchanged', () => {
    const base = { role: Role.STUDENT };
    expect(buildScopedUserWhere(null, base)).toBe(base);
    expect(buildScopedUserWhere(null)).toEqual({});
  });

  it('scoped actor → base AND-ed with the faculty filter', () => {
    const where = buildScopedUserWhere('f-1', { role: Role.STUDENT });

    expect(where).toEqual({
      AND: [
        { role: Role.STUDENT },
        {
          OR: [
            { role: Role.STUDENT, studentProfile: { facultyId: 'f-1' } },
            { role: Role.TEACHER, teacherProfile: { department: { facultyId: 'f-1' } } },
          ],
        },
      ],
    });
  });

  it('faculty filter mirrors the write predicate — governance roles never match', () => {
    const where = buildScopedUserWhere('f-1');
    const scopeBranch = (where as { AND: Prisma.UserWhereInput[] }).AND[1]!.OR!;

    // Only STUDENT and TEACHER branches exist; no branch can match an
    // OWNER/ADMIN/QUALITY row.
    expect(scopeBranch.map((b) => (b as { role: Role }).role)).toEqual([Role.STUDENT, Role.TEACHER]);
  });
});

describe('getGovernanceScope (mocked prisma)', () => {
  it('reads role + scopeFacultyId fresh from the actor row', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: Role.ADMIN,
      scopeFacultyId: 'f-1',
    } as never);

    await expect(getGovernanceScope('admin-1')).resolves.toBe('f-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      select: { role: true, scopeFacultyId: true },
    });
  });

  it('ADMIN without a scope is university-wide (null)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null } as never);
    await expect(getGovernanceScope('admin-1')).resolves.toBeNull();
  });

  it('scope binds ADMIN/QUALITY only — every other role is university-wide even with a stray value', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: Role.OWNER, scopeFacultyId: 'f-1' } as never);
    await expect(getGovernanceScope('owner-1')).resolves.toBeNull();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: Role.TEACHER, scopeFacultyId: 'f-1' } as never);
    await expect(getGovernanceScope('teacher-1')).resolves.toBeNull();
  });

  it('QUALITY carries its faculty scope', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: Role.QUALITY, scopeFacultyId: 'f-2' } as never);
    await expect(getGovernanceScope('quality-1')).resolves.toBe('f-2');
  });

  it('unknown actor → university-wide (auth middleware owns authentication)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(getGovernanceScope('ghost')).resolves.toBeNull();
  });
});

describe('loadGovernanceTarget (mocked prisma)', () => {
  it('returns null for a missing user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(loadGovernanceTarget('ghost')).resolves.toBeNull();
  });

  it('maps profile rows into the faculty scope tuple', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'student-1',
      role: Role.STUDENT,
      isActive: true,
      studentProfile: { facultyId: 'f-1' },
      teacherProfile: null,
    } as never);

    await expect(loadGovernanceTarget('student-1')).resolves.toEqual({
      id: 'student-1',
      role: Role.STUDENT,
      isActive: true,
      studentFacultyId: 'f-1',
      teacherFacultyId: null,
    });
  });

  it('resolves a teacher’s faculty through their home department', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'teacher-1',
      role: Role.TEACHER,
      isActive: false,
      studentProfile: null,
      teacherProfile: { department: { facultyId: 'f-2' } },
    } as never);

    await expect(loadGovernanceTarget('teacher-1')).resolves.toEqual({
      id: 'teacher-1',
      role: Role.TEACHER,
      isActive: false,
      studentFacultyId: null,
      teacherFacultyId: 'f-2',
    });
  });
});

// ── TEACHER-promotion provisioning ─────────────────────────────────

describe('planTeacherProvisioning (pure plan)', () => {
  it('STUDENT→TEACHER without a profile provisions using the student’s department', () => {
    expect(
      planTeacherProvisioning({
        newRole: Role.TEACHER,
        oldRole: Role.STUDENT,
        hasTeacherProfile: false,
        studentDepartmentId: 'd-1',
      }),
    ).toEqual({ kind: 'create', departmentId: 'd-1' });
  });

  it('an explicit departmentId wins over the student profile’s department', () => {
    expect(
      planTeacherProvisioning({
        newRole: Role.TEACHER,
        oldRole: Role.STUDENT,
        hasTeacherProfile: false,
        explicitDepartmentId: 'd-explicit',
        studentDepartmentId: 'd-student',
      }),
    ).toEqual({ kind: 'create', departmentId: 'd-explicit' });
  });

  it('promotion without any resolvable home department is an error (parity with the OWNER path)', () => {
    expect(
      planTeacherProvisioning({
        newRole: Role.TEACHER,
        oldRole: Role.QUALITY,
        hasTeacherProfile: false,
      }),
    ).toEqual({ kind: 'missing-department' });
  });

  it('a non-student can still be promoted with an explicit departmentId', () => {
    expect(
      planTeacherProvisioning({
        newRole: Role.TEACHER,
        oldRole: Role.QUALITY,
        hasTeacherProfile: false,
        explicitDepartmentId: 'd-2',
      }),
    ).toEqual({ kind: 'create', departmentId: 'd-2' });
  });

  it('already a teacher → nothing to provision (idempotent role re-assignment)', () => {
    expect(
      planTeacherProvisioning({ newRole: Role.TEACHER, oldRole: Role.TEACHER, hasTeacherProfile: true }),
    ).toEqual({ kind: 'none' });
  });

  it('a demoted-then-re-promoted teacher keeps their persisted profile', () => {
    expect(
      planTeacherProvisioning({
        newRole: Role.TEACHER,
        oldRole: Role.STUDENT,
        hasTeacherProfile: true,
        studentDepartmentId: 'd-1',
      }),
    ).toEqual({ kind: 'none' });
  });

  it('demotions and non-teacher promotions need nothing', () => {
    expect(
      planTeacherProvisioning({ newRole: Role.STUDENT, oldRole: Role.TEACHER, hasTeacherProfile: true }),
    ).toEqual({ kind: 'none' });
    expect(
      planTeacherProvisioning({ newRole: Role.ADMIN, oldRole: Role.STUDENT, hasTeacherProfile: false }),
    ).toEqual({ kind: 'none' });
  });
});

describe('buildTeacherProvision (transaction step)', () => {
  it('creates the TeacherProfile with the planned department and given specialty', async () => {
    const tx = { teacherProfile: { create: vi.fn() } } as unknown as Prisma.TransactionClient;
    const step = buildTeacherProvision('user-1', { kind: 'create', departmentId: 'd-1' }, 'هندسة البرمجيات');

    await step(tx);

    expect(tx.teacherProfile.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', specialty: 'هندسة البرمجيات', departmentId: 'd-1' },
    });
  });

  it('falls back to the placeholder specialty when none is given', async () => {
    const tx = { teacherProfile: { create: vi.fn() } } as unknown as Prisma.TransactionClient;
    const step = buildTeacherProvision('user-1', { kind: 'create', departmentId: 'd-1' });

    await step(tx);

    expect(tx.teacherProfile.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', specialty: TEACHER_DEFAULT_SPECIALTY, departmentId: 'd-1' },
    });
    expect(TEACHER_DEFAULT_SPECIALTY).toBe('غير محدد');
  });
});
