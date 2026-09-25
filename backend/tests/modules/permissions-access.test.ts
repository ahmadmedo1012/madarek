/**
 * Backend unit test — `assertOfferingAccess` decision logic in
 * `backend/src/lib/permissions.ts` (audit 11-a P1-2 / 11-b P2-4 hand-off).
 *
 * Two layers, both DB-free:
 *  - `decideOfferingAccess` — the pure role matrix, extracted from the
 *    guard precisely so these semantics are testable.
 *  - `assertOfferingAccess` — the DB-bound wrapper, exercised against a
 *    mocked Prisma client. Pins the query contract the matrix relies on:
 *    ONLY enrollments with `status: 'active'` grant a student read
 *    access (the platform-wide convention — matching learning.routes,
 *    student/teacher dashboards and submissions.routes), and a missing
 *    offering 404s without leaking existence.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    courseOffering: {
      findUnique: vi.fn(),
    },
  },
}));

import { assertOfferingAccess, decideOfferingAccess } from '../../src/lib/permissions';
import { prisma } from '../../src/db.js';

const findUnique = vi.mocked(prisma.courseOffering.findUnique);

/**
 * Build the mocked `findUnique` payload. The enrollments array mirrors
 * what Prisma returns AFTER the server-side `where: { status: 'active' }`
 * filter — an empty array is exactly what a dropped/completed enrollment
 * yields.
 */
const offeringRow = (teacherId: string, enrollments: Array<{ id: string }> = []) =>
  ({ teacherId, enrollments }) as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('decideOfferingAccess — pure role matrix', () => {
  const facts = { exists: true, taughtBy: false, activelyEnrolled: false };

  it('a missing offering is not_found for every non-bypass role (no existence leak)', () => {
    for (const role of [Role.TEACHER, Role.STUDENT, Role.QUALITY] as const) {
      expect(decideOfferingAccess(role, { ...facts, exists: false })).toBe('not_found');
    }
  });

  it('TEACHER is allowed only for an offering they teach', () => {
    expect(decideOfferingAccess(Role.TEACHER, { ...facts, taughtBy: true })).toBe('ok');
    expect(decideOfferingAccess(Role.TEACHER, { ...facts, taughtBy: false })).toBe('forbidden');
  });

  it("a TEACHER enrolled in a colleague's offering gains no read access", () => {
    // Enrollment rows only open the STUDENT path, never the TEACHER path.
    expect(
      decideOfferingAccess(Role.TEACHER, { ...facts, taughtBy: false, activelyEnrolled: true }),
    ).toBe('forbidden');
  });

  it('STUDENT is allowed only with an ACTIVE enrollment', () => {
    expect(decideOfferingAccess(Role.STUDENT, { ...facts, activelyEnrolled: true })).toBe('ok');
    expect(decideOfferingAccess(Role.STUDENT, { ...facts, activelyEnrolled: false })).toBe('forbidden');
  });

  it('QUALITY reads any existing offering (oversight role) without enrollment or teaching link', () => {
    expect(decideOfferingAccess(Role.QUALITY, facts)).toBe('ok');
  });
});

describe('assertOfferingAccess — DB-bound wrapper (mocked prisma)', () => {
  it('ADMIN bypasses the check without querying the DB', async () => {
    await assertOfferingAccess('offering-1', 'user-1', Role.ADMIN);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('OWNER bypasses the check without querying the DB', async () => {
    await assertOfferingAccess('offering-1', 'user-1', Role.OWNER);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("resolves for the TEACHER who teaches the offering", async () => {
    findUnique.mockResolvedValue(offeringRow('teacher-1'));
    await expect(
      assertOfferingAccess('offering-1', 'teacher-1', Role.TEACHER),
    ).resolves.toBeUndefined();
  });

  it("rejects a TEACHER who does not teach the offering", async () => {
    findUnique.mockResolvedValue(offeringRow('teacher-1'));
    await expect(
      assertOfferingAccess('offering-1', 'teacher-2', Role.TEACHER),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('resolves for a STUDENT with an active enrollment', async () => {
    findUnique.mockResolvedValue(offeringRow('teacher-1', [{ id: 'enr-1' }]));
    await expect(
      assertOfferingAccess('offering-1', 'student-1', Role.STUDENT),
    ).resolves.toBeUndefined();
  });

  it('rejects a STUDENT whose only enrollment is non-active (filtered out server-side)', async () => {
    // The `where: { status: 'active' }` clause means a dropped/completed
    // enrollment row is NOT returned — the student sees 403, not content.
    findUnique.mockResolvedValue(offeringRow('teacher-1', []));
    await expect(
      assertOfferingAccess('offering-1', 'student-1', Role.STUDENT),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('rejects a STUDENT with no enrollment row at all', async () => {
    findUnique.mockResolvedValue(offeringRow('teacher-1', []));
    await expect(
      assertOfferingAccess('offering-1', 'student-2', Role.STUDENT),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('resolves for QUALITY with no enrollment and no teaching link', async () => {
    findUnique.mockResolvedValue(offeringRow('teacher-1', []));
    await expect(
      assertOfferingAccess('offering-1', 'quality-1', Role.QUALITY),
    ).resolves.toBeUndefined();
  });

  it('404s (does not 403) when the offering does not exist', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      assertOfferingAccess('offering-1', 'student-1', Role.STUDENT),
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('queries ONLY for an active enrollment row — pins the status filter (P1-2 fix)', async () => {
    findUnique.mockResolvedValue(offeringRow('teacher-1', []));
    // Outcome is irrelevant here; the query shape is the contract.
    await assertOfferingAccess('offering-1', 'student-1', Role.STUDENT).catch(() => {});

    expect(findUnique).toHaveBeenCalledTimes(1);
    const arg = findUnique.mock.calls[0]![0] as { where: unknown; select: unknown };
    expect(arg.where).toEqual({ id: 'offering-1' });
    expect(arg.select).toEqual({
      teacherId: true,
      enrollments: {
        where: { studentId: 'student-1', status: 'active' },
        take: 1,
        select: { id: true },
      },
    });
  });
});
