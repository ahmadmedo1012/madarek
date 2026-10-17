/**
 * Backend unit test — r179b (phase-5): the institution gate layer of
 * `backend/src/http/routes/files.routes.ts` — the pure decision
 * matrix, the institution-aware where builders, and the
 * scope-resolution wrapper — all DB-free (the repo canon: pure
 * decisions tested directly, IO mocked at the boundary).
 *
 * What the layer encodes (the r179 shared contract, applied to files
 * and persistent storage):
 *  · Only the platform OWNER oversees file bytes across institutions
 *    (deliberate, platform-wide — never an auto-selected institution).
 *  · ADMIN/QUALITY oversight is INSTITUTION-BOUND: their gates require
 *    an authorizing row in the caller's VERIFIED institution.
 *  · STUDENT/TEACHER keep the per-row grant predicate (PUBLISHED /
 *    owner / reviewer for papers; teacher / active enrollment for
 *    materials) — now constrained to the caller's institution.
 *  · A contextless institutional caller is fail-closed: 403
 *    INSTITUTION_CONTEXT_REQUIRED, never a fallback membership.
 *  · A forged/stale inst claim is 403 INSTITUTION_CONTEXT_INVALID
 *    (resolveCallerInstitutionScope's DB re-verification).
 *
 * The ROUTE-level conversations (order vs shape gates, storage IO)
 * are pinned by files-serving.test.ts / files-filename-control.test.ts;
 * the real-DB two-institution matrix by
 * tests/integration/files-institution-isolation.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    membership: { findFirst: vi.fn() },
  },
  withRetry: vi.fn(),
}));

import { prisma } from '../../src/db.js';
import {
  accessibleMaterialWhere,
  accessiblePaperWhere,
  decideFileInstitutionGate,
  requireFileInstitutionScope,
} from '../../src/http/routes/files.routes.js';

const membershipFindFirst = vi.mocked(prisma.membership.findFirst);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── The pure decision matrix ─────────────────────────────────────

describe('decideFileInstitutionGate (role × context matrix)', () => {
  it('OWNER is platform-wide — with OR without a context claim', () => {
    expect(decideFileInstitutionGate(Role.OWNER, null)).toBe('platform_wide');
    expect(decideFileInstitutionGate(Role.OWNER, 'inst-a')).toBe('platform_wide');
  });

  it('every institutional role without a verified context fails closed', () => {
    for (const role of [Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.QUALITY]) {
      expect(decideFileInstitutionGate(role, null)).toBe('context_required');
    }
  });

  it('every institutional role WITH a verified context is institution-scoped', () => {
    for (const role of [Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.QUALITY]) {
      expect(decideFileInstitutionGate(role, 'inst-a')).toBe('institution_scoped');
    }
  });
});

// ─── The papers where builder ─────────────────────────────────────

describe('accessiblePaperWhere (papers grant predicate, institution-bound)', () => {
  const FILE = 'cku5r179b0001paper.pdf';

  it('STUDENT: institution + the PUBLISHED/owner/reviewer grant, all inside one predicate', () => {
    expect(accessiblePaperWhere(FILE, Role.STUDENT, 'stu-1', 'inst-a')).toEqual({
      fileUrl: { endsWith: `/${FILE}` },
      institutionId: 'inst-a',
      OR: [{ status: 'PUBLISHED' }, { studentId: 'stu-1' }, { reviewerId: 'stu-1' }],
    });
  });

  it('TEACHER: the same shape — the reviewer branch is how a teacher reaches a paper', () => {
    expect(accessiblePaperWhere(FILE, Role.TEACHER, 'tea-1', 'inst-b')).toEqual({
      fileUrl: { endsWith: `/${FILE}` },
      institutionId: 'inst-b',
      OR: [{ status: 'PUBLISHED' }, { studentId: 'tea-1' }, { reviewerId: 'tea-1' }],
    });
  });

  it('ADMIN/QUALITY oversight: institution-bound, NO per-row grant', () => {
    for (const role of [Role.ADMIN, Role.QUALITY]) {
      expect(accessiblePaperWhere(FILE, role, 'adm-1', 'inst-a')).toEqual({
        fileUrl: { endsWith: `/${FILE}` },
        institutionId: 'inst-a',
      });
    }
  });

  it('the institution rides in EVERY branch — an institution-B caller never matches an institution-A row', () => {
    // The structural pin behind the cross-institution 404: whatever the
    // grant branch, institutionId is a top-level AND, so a row in
    // another institution matches nothing and serving answers the
    // uniform 404 (no existence oracle).
    const studentWhere = accessiblePaperWhere(FILE, Role.STUDENT, 'stu-1', 'inst-b');
    expect(studentWhere.institutionId).toBe('inst-b');
    const adminWhere = accessiblePaperWhere(FILE, Role.ADMIN, 'adm-1', 'inst-b');
    expect(adminWhere.institutionId).toBe('inst-b');
  });
});

// ─── The materials where builder ──────────────────────────────────

describe('accessibleMaterialWhere (materials grant predicate, chain-bound)', () => {
  const FILE = 'cku5r179b0002material.pdf';

  it('STUDENT: the full ownership chain + teacher/active-enrollment grant in one predicate', () => {
    expect(accessibleMaterialWhere(FILE, Role.STUDENT, 'stu-1', 'inst-a')).toEqual({
      url: { endsWith: `/${FILE}` },
      offering: {
        course: { department: { faculty: { institutionId: 'inst-a' } } },
        OR: [
          { teacherId: 'stu-1' },
          { enrollments: { some: { studentId: 'stu-1', status: 'active' } } },
        ],
      },
    });
  });

  it('TEACHER: the same chain + grant shape (the teacherId branch is the teacher rule)', () => {
    const where = accessibleMaterialWhere(FILE, Role.TEACHER, 'tea-1', 'inst-a');
    expect(where.offering).toEqual({
      course: { department: { faculty: { institutionId: 'inst-a' } } },
      OR: [
        { teacherId: 'tea-1' },
        { enrollments: { some: { studentId: 'tea-1', status: 'active' } } },
      ],
    });
  });

  it('ADMIN/QUALITY oversight: the chain comparison alone — no per-row grant', () => {
    for (const role of [Role.ADMIN, Role.QUALITY]) {
      expect(accessibleMaterialWhere(FILE, role, 'adm-1', 'inst-a')).toEqual({
        url: { endsWith: `/${FILE}` },
        offering: {
          course: { department: { faculty: { institutionId: 'inst-a' } } },
        },
      });
    }
  });

  it('walks the frozen-schema chain exactly: Material → offering → course → department → faculty → institution', () => {
    // Material carries NO denormalized institutionId (frozen schema) —
    // the pin keeps the chain walk from drifting into a wrong hop.
    const where = accessibleMaterialWhere(FILE, Role.STUDENT, 'stu-1', 'inst-x');
    expect(where.offering).toHaveProperty('course.department.faculty.institutionId', 'inst-x');
  });
});

// ─── The scope-resolution wrapper (membership IO mocked) ──────────

describe('requireFileInstitutionScope (resolve + verify + decide)', () => {
  it('returns null for a claimless OWNER (platform-wide — the row gate is skipped)', async () => {
    await expect(requireFileInstitutionScope('owner-1', Role.OWNER, null)).resolves.toBeNull();
    expect(membershipFindFirst).not.toHaveBeenCalled();
  });

  it('returns the VERIFIED institution for an institutional caller with a resolving claim', async () => {
    membershipFindFirst.mockResolvedValue({ institutionId: 'inst-a' } as never);

    await expect(
      requireFileInstitutionScope('stu-1', Role.STUDENT, 'inst-a'),
    ).resolves.toBe('inst-a');
    expect(membershipFindFirst).toHaveBeenCalledWith({
      where: {
        userId: 'stu-1',
        institutionId: 'inst-a',
        isActive: true,
        institution: { status: 'ACTIVE' },
      },
      select: { institutionId: true },
    });
  });

  it('throws 403 INSTITUTION_CONTEXT_REQUIRED for a contextless institutional caller — no fallback lookup', async () => {
    await expect(requireFileInstitutionScope('stu-1', Role.STUDENT, null)).rejects.toMatchObject({
      code: 'INSTITUTION_CONTEXT_REQUIRED',
      status: 403,
    });
    // The contract forbids an oldest-membership fallback: with no claim
    // there is nothing to re-verify, so the lookup never runs.
    expect(membershipFindFirst).not.toHaveBeenCalled();
  });

  it('throws 403 INSTITUTION_CONTEXT_INVALID for a forged/stale claim (revoked membership)', async () => {
    membershipFindFirst.mockResolvedValue(null);

    await expect(
      requireFileInstitutionScope('stu-1', Role.STUDENT, 'inst-forged'),
    ).rejects.toMatchObject({ code: 'INSTITUTION_CONTEXT_INVALID', status: 403 });
  });

  it('rejects with the shared Arabic context wording (D17-3 user-facing copy)', async () => {
    await expect(requireFileInstitutionScope('tea-1', Role.TEACHER, null)).rejects.toMatchObject({
      message: 'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
    });
  });
});
