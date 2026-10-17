/**
 * Backend unit test — faculty governance scope on the ADMIN enrollment
 * surfaces in `backend/src/http/routes/enrollments.routes.ts`
 * (r155a — audit finding 1).
 *
 * The route file previously gated GET /, GET /offerings, POST / and
 * DELETE /:id on requireRole(ADMIN, OWNER) alone — no faculty-scope
 * enforcement, while the sibling admin surfaces (users, permissions,
 * admin-extras) enforce "what you cannot govern, you do not list".
 *
 * Two layers, both DB-free:
 *  1. pure where-builders / predicate exported from the route module;
 *  2. the REAL app (createApp, ephemeral port — the pattern of
 *     colleges-public-access.test.ts / catalog-faculties-public.test.ts)
 *     with prisma mocked and JWTs signed via signAccessToken, covering:
 *       - scoped ADMIN cannot list / enroll / drop out-of-faculty;
 *       - OWNER bypasses the scope entirely;
 *       - unscoped ADMIN keeps full access.
 *
 * The mocked prisma dispatches user.findUnique by id so
 * getGovernanceScope / loadGovernanceTarget resolve per-actor and
 * per-student rows; $transaction hands the callback the same mocked
 * client so the POST/DELETE transaction bodies run for the happy paths.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn() },
    membership: { findFirst: vi.fn() },
    enrollment: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
    courseOffering: { findMany: vi.fn(), findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  // Defensive: other modules in the app graph import withRetry from db.js.
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { buildScopedUserWhere } from '../../src/lib/governance.js';
import {
  buildScopedEnrollmentWhere,
  buildScopedOfferingWhere,
  isOfferingWithinScope,
} from '../../src/http/routes/enrollments.routes.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

// ── Fixtures ─────────────────────────────────────────────────────────
const F1 = 'faculty-1';
const F2 = 'faculty-2';
/* r179: the single test institution — every institutional caller's
 * DB-verified context (the seeded world's offering/student rows all
 * live in it; a second institution id would be "foreign"). */
const INSTITUTION = 'inst-r179-scope';
const SCOPED_ADMIN = 'admin-scoped-1';
const UNSCOPED_ADMIN = 'admin-unscoped-1';
const OWNER = 'owner-1';
// cuid-shaped (the enroll zod schema validates both ids as cuids).
const STUDENT_IN_F1 = 'ckxxxxxxxxxxxxxxxxxxxxs1';
const STUDENT_IN_F2 = 'ckxxxxxxxxxxxxxxxxxxxxs2';
const OFFERING_F1 = 'ckxxxxxxxxxxxxxxxxxxxxo1';
const OFFERING_F2 = 'ckxxxxxxxxxxxxxxxxxxxxo2';

const userFindUnique = vi.mocked(prisma.user.findUnique);
const membershipFindFirst = vi.mocked(prisma.membership.findFirst);
const enrollmentFindMany = vi.mocked(prisma.enrollment.findMany);
const enrollmentFindUnique = vi.mocked(prisma.enrollment.findUnique);
const enrollmentCreate = vi.mocked(prisma.enrollment.create);
const enrollmentDelete = vi.mocked(prisma.enrollment.delete);
const offeringFindMany = vi.mocked(prisma.courseOffering.findMany);
const offeringFindUnique = vi.mocked(prisma.courseOffering.findUnique);
const auditLogCreate = vi.mocked(prisma.auditLog.create);
const transaction = vi.mocked(prisma.$transaction);
const queryRaw = vi.mocked(prisma.$queryRaw);

/**
 * Prisma delegates return PrismaPromise (branded via Symbol.toStringTag)
 * — a plain async function can never satisfy that structurally, so mock
 * implementations need one cast (the zu-sync-run.test.ts pattern).
 * Everything inside the impl stays fully type-checked.
 */
type UserFindUniqueImpl = NonNullable<Parameters<typeof userFindUnique.mockImplementation>[0]>;
type TransactionImpl = NonNullable<Parameters<typeof transaction.mockImplementation>[0]>;

/** user.findUnique dispatch: actor rows for getGovernanceScope, full
 *  profile rows for loadGovernanceTarget / the POST student check.
 *  r178: profiles are per-membership — the route select returns
 *  ARRAYS (take: 1), so the mocked rows ship the plural shapes. */
const dispatchUser = userFindUnique.mockImplementation(
  (async ({ where }: { where: { id: string } }) => {
    switch (where.id) {
      case SCOPED_ADMIN:
        return { id: SCOPED_ADMIN, role: Role.ADMIN, scopeFacultyId: F1 };
      case UNSCOPED_ADMIN:
        return { id: UNSCOPED_ADMIN, role: Role.ADMIN, scopeFacultyId: null };
      case OWNER:
        return { id: OWNER, role: Role.OWNER, scopeFacultyId: null };
      case STUDENT_IN_F1:
        return {
          id: STUDENT_IN_F1,
          role: Role.STUDENT,
          isActive: true,
          studentProfiles: [{ facultyId: F1 }],
          teacherProfiles: [],
        };
      case STUDENT_IN_F2:
        return {
          id: STUDENT_IN_F2,
          role: Role.STUDENT,
          isActive: true,
          studentProfiles: [{ facultyId: F2 }],
          teacherProfiles: [],
        };
      default:
        return null;
    }
  }) as unknown as UserFindUniqueImpl,
);

/* r179: the caller-context verification dispatch — the admins' own
 * lookups resolve to the test institution; a STUDENT_IN_F1 lookup
 * resolves when (and only when) the test wants the student to be a
 * member of the caller's institution (both POST halves). */
const dispatchMembership = membershipFindFirst.mockImplementation(
  (async ({ where }: { where: { userId?: string; institutionId?: string } }) => {
    if (where?.userId && where.userId !== SCOPED_ADMIN && where.userId !== UNSCOPED_ADMIN && where.userId !== OWNER) {
      // The target-student membership probe (POST enroll's second half).
      return studentIsMember ? { id: 'membership-student', institutionId: INSTITUTION } : null;
    }
    // The caller's own context verification.
    return { institutionId: INSTITUTION };
  }) as unknown as Parameters<typeof membershipFindFirst.mockImplementation>[0],
);
let studentIsMember = true;

/** The enroll/seat/drop transactions receive the same mocked client —
 *  every tx.* delegate is a vi.fn() the tests configure. */
const passthroughTransaction = transaction.mockImplementation(
  (async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)) as unknown as TransactionImpl,
);

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations, but re-asserting the shared
  // defaults keeps the suite order-proof.
  dispatchUser.mockClear();
  dispatchMembership.mockClear();
  passthroughTransaction.mockClear();
  studentIsMember = true;
  queryRaw.mockResolvedValue([] as never);
  enrollmentFindMany.mockResolvedValue([] as never);
  vi.mocked(prisma.enrollment.count).mockResolvedValue(0 as never); // r176d: the paginated broad listing
  offeringFindMany.mockResolvedValue([] as never);
  enrollmentFindUnique.mockResolvedValue(null as never);
  offeringFindUnique.mockResolvedValue(null as never);
});

/* r179: institutional callers sign with the inst claim (DB-verified by
 * the membership mock); OWNER signs contextless. */
const bearer = (userId: string, role: Role, institutionId: string | null = INSTITUTION) => ({
  authorization: `Bearer ${signAccessToken(userId, role, institutionId)}`,
});

const get = (path: string, userId: string, role: Role, institutionId: string | null = INSTITUTION) =>
  fetch(`${baseUrl}/api/v1${path}`, { headers: bearer(userId, role, institutionId) });

const post = (
  path: string,
  userId: string,
  role: Role,
  bodyOrInstitution: unknown = INSTITUTION,
  maybeBody?: unknown,
) => {
  // Two call shapes kept: (path, id, role, body) and the explicit
  // contextless form (path, id, role, null, body).
  const institutionId = bodyOrInstitution === null ? null : INSTITUTION;
  const body = maybeBody ?? bodyOrInstitution;
  return fetch(`${baseUrl}/api/v1${path}`, {
    headers: { ...bearer(userId, role, institutionId), 'content-type': 'application/json' },
    method: 'POST',
    body: JSON.stringify(body),
  });
};

const del = (path: string, userId: string, role: Role, institutionId: string | null = INSTITUTION) =>
  fetch(`${baseUrl}/api/v1${path}`, { headers: bearer(userId, role, institutionId), method: 'DELETE' });

// ── Pure where-builders / predicate ──────────────────────────────────

describe('buildScopedEnrollmentWhere (pure list filter)', () => {
  it('a specific student pins the filter (scope was asserted up front)', () => {
    expect(buildScopedEnrollmentWhere(F1, STUDENT_IN_F2)).toEqual({ studentId: STUDENT_IN_F2 });
    expect(buildScopedEnrollmentWhere(null, STUDENT_IN_F2)).toEqual({ studentId: STUDENT_IN_F2 });
    // r179: an institution context never widens a specific-student pin
    // (the route verifies the target's membership separately).
    expect(buildScopedEnrollmentWhere(F1, STUDENT_IN_F2, INSTITUTION)).toEqual({ studentId: STUDENT_IN_F2 });
  });

  it('university-wide actor listing all, no institution → unscoped base', () => {
    expect(buildScopedEnrollmentWhere(null)).toEqual({});
  });

  it('scoped actor listing all → student filter mirrors buildScopedUserWhere', () => {
    expect(buildScopedEnrollmentWhere(F1)).toEqual({ student: buildScopedUserWhere(F1) });
  });

  it('r179: institution-only listing → the membership filter on the student', () => {
    expect(buildScopedEnrollmentWhere(null, undefined, INSTITUTION)).toEqual({
      student: buildScopedUserWhere(null, {}, INSTITUTION),
    });
    // The membership filter is honestly present…
    expect(JSON.stringify(buildScopedEnrollmentWhere(null, undefined, INSTITUTION))).toContain(
      `"institutionId":"${INSTITUTION}"`,
    );
  });

  it('r179: faculty scope + institution compose on the student filter', () => {
    const where = buildScopedEnrollmentWhere(F1, undefined, INSTITUTION);
    expect(where).toEqual({ student: buildScopedUserWhere(F1, {}, INSTITUTION) });
    // Both scopes ride the AND — faculty + membership.
    const json = JSON.stringify(where);
    expect(json).toContain(`"institutionId":"${INSTITUTION}"`);
    expect(json).toContain('"facultyId"');
  });
});

describe('buildScopedOfferingWhere (pure picker filter)', () => {
  it('university-wide actor, no institution → unscoped base', () => {
    expect(buildScopedOfferingWhere(null)).toEqual({});
  });

  it('scoped actor → course→department→facultyId chain', () => {
    expect(buildScopedOfferingWhere(F1)).toEqual({
      course: { department: { facultyId: F1 } },
    });
  });

  it('r179: institution context ANDs the Course.institutionId chain (alone)', () => {
    expect(buildScopedOfferingWhere(null, INSTITUTION)).toEqual({
      course: { institutionId: INSTITUTION },
    });
  });

  it('r179: institution context + faculty scope compose on one course filter', () => {
    expect(buildScopedOfferingWhere(F1, INSTITUTION)).toEqual({
      course: { department: { facultyId: F1 }, institutionId: INSTITUTION },
    });
  });
});

describe('isOfferingWithinScope (pure predicate)', () => {
  it('university-wide actor reaches every faculty (and null chains)', () => {
    expect(isOfferingWithinScope(null, F1)).toBe(true);
    expect(isOfferingWithinScope(null, F2)).toBe(true);
    expect(isOfferingWithinScope(null, null)).toBe(true);
  });

  it('scoped actor reaches only their own faculty', () => {
    expect(isOfferingWithinScope(F1, F1)).toBe(true);
    expect(isOfferingWithinScope(F1, F2)).toBe(false);
    expect(isOfferingWithinScope(F1, null)).toBe(false);
  });
});

// ── GET /enrollments — list ──────────────────────────────────────────

describe('GET /api/v1/enrollments (scoped admin vs owner vs contextless admin)', () => {
  it('scoped ADMIN listing an out-of-faculty student → 403 FORBIDDEN (assert, never a silent empty list)', async () => {
    const res = await get(`/enrollments?studentId=${STUDENT_IN_F2}`, SCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('scoped ADMIN listing an in-faculty student → 200, filter pinned to the student', async () => {
    const res = await get(`/enrollments?studentId=${STUDENT_IN_F1}`, SCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(200);
    expect(enrollmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: STUDENT_IN_F1 } }),
    );
  });

  it('scoped ADMIN listing all → where clause composes faculty scope + institution membership (the shared helper)', async () => {
    const res = await get('/enrollments', SCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(200);
    expect(enrollmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildScopedEnrollmentWhere(F1, undefined, INSTITUTION),
      }),
    );
  });

  it('OWNER bypasses the scope — any student, plain filter', async () => {
    const res = await get(`/enrollments?studentId=${STUDENT_IN_F2}`, OWNER, Role.OWNER, null);
    expect(res.status).toBe(200);
    expect(enrollmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: STUDENT_IN_F2 } }),
    );
  });

  it('r179: a contextless ADMIN (no inst claim) → 403 INSTITUTION_CONTEXT_REQUIRED, never the platform-wide list', async () => {
    const res = await get(`/enrollments?studentId=${STUDENT_IN_F2}`, UNSCOPED_ADMIN, Role.ADMIN, null);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(enrollmentFindMany).not.toHaveBeenCalled();
  });

  it('r179: an institutional ADMIN listing all → the institution membership filter (no faculty scope)', async () => {
    const res = await get('/enrollments', UNSCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(200);
    expect(enrollmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildScopedEnrollmentWhere(null, undefined, INSTITUTION),
      }),
    );
  });
});

// ── GET /enrollments/offerings — picker ──────────────────────────────

describe('GET /api/v1/enrollments/offerings (picker scoping)', () => {
  it('scoped ADMIN sees only their-faculty offerings — inside their institution (r179 composed filter)', async () => {
    const res = await get('/enrollments/offerings', SCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(200);
    expect(offeringFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { course: { department: { facultyId: F1 }, institutionId: INSTITUTION } },
      }),
    );
  });

  it('OWNER sees the whole picker (unscoped where)', async () => {
    const res = await get('/enrollments/offerings', OWNER, Role.OWNER, null);
    expect(res.status).toBe(200);
    expect(offeringFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('r179: a contextless ADMIN → 403 INSTITUTION_CONTEXT_REQUIRED (no picker at all)', async () => {
    const res = await get('/enrollments/offerings', UNSCOPED_ADMIN, Role.ADMIN, null);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });
});

// ── POST /enrollments — enroll ───────────────────────────────────────

describe('POST /api/v1/enrollments (both halves of the enrollment asserted)', () => {
  it('scoped ADMIN cannot enroll an out-of-faculty student → 403, no write', async () => {
    const res = await post('/enrollments', SCOPED_ADMIN, Role.ADMIN, {
      studentId: STUDENT_IN_F2,
      offeringId: OFFERING_F1,
    });
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('FORBIDDEN');
    // Rejected before the transaction — no seat ever locked/written.
    expect(transaction).not.toHaveBeenCalled();
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it('scoped ADMIN cannot enroll into an out-of-faculty offering → 403 (student half passes)', async () => {
    offeringFindUnique.mockResolvedValue({
      id: OFFERING_F2,
      capacity: 30,
      _count: { enrollments: 5 },
      course: { institutionId: INSTITUTION, department: { facultyId: F2 } },
    } as never);
    const res = await post('/enrollments', SCOPED_ADMIN, Role.ADMIN, {
      studentId: STUDENT_IN_F1,
      offeringId: OFFERING_F2,
    });
    expect(res.status).toBe(403);
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it('r179: a foreign-institution offering → 403 (the Course→institutionId chain)', async () => {
    offeringFindUnique.mockResolvedValue({
      id: OFFERING_F1,
      capacity: 30,
      _count: { enrollments: 5 },
      course: { institutionId: 'inst-foreign-r179', department: { facultyId: F1 } },
    } as never);
    const res = await post('/enrollments', UNSCOPED_ADMIN, Role.ADMIN, {
      studentId: STUDENT_IN_F1,
      offeringId: OFFERING_F1,
    });
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('FORBIDDEN');
    expect(json.error.message).toBe('هذا المقرر ينتمي إلى مؤسسة أخرى');
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it('r179: a student who is not a member of the caller’s institution → 403', async () => {
    offeringFindUnique.mockResolvedValue({
      id: OFFERING_F1,
      capacity: 30,
      _count: { enrollments: 5 },
      course: { institutionId: INSTITUTION, department: { facultyId: F1 } },
    } as never);
    studentIsMember = false;
    const res = await post('/enrollments', UNSCOPED_ADMIN, Role.ADMIN, {
      studentId: STUDENT_IN_F1,
      offeringId: OFFERING_F1,
    });
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('FORBIDDEN');
    expect(json.error.message).toBe('الطالب المحدد ليس عضواً في مؤسستك');
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it('r179: a contextless ADMIN → 403 INSTITUTION_CONTEXT_REQUIRED before any check', async () => {
    const res = await post('/enrollments', UNSCOPED_ADMIN, Role.ADMIN, null, {
      studentId: STUDENT_IN_F1,
      offeringId: OFFERING_F1,
    });
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('scoped ADMIN enrolls an in-faculty, in-institution student into an in-faculty offering → 201', async () => {
    offeringFindUnique.mockResolvedValue({
      id: OFFERING_F1,
      capacity: 30,
      _count: { enrollments: 5 },
      course: { institutionId: INSTITUTION, department: { facultyId: F1 } },
    } as never);
    enrollmentCreate.mockResolvedValue({
      id: 'enr-new',
      studentId: STUDENT_IN_F1,
      offeringId: OFFERING_F1,
    } as never);

    const res = await post('/enrollments', SCOPED_ADMIN, Role.ADMIN, {
      studentId: STUDENT_IN_F1,
      offeringId: OFFERING_F1,
    });
    expect(res.status).toBe(201);
    expect(enrollmentCreate).toHaveBeenCalledWith({
      data: { studentId: STUDENT_IN_F1, offeringId: OFFERING_F1 },
    });
    // The governance-visible seat change keeps its audit row.
    expect(auditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('OWNER enrolls any student (no scope assertions on the path)', async () => {
    offeringFindUnique.mockResolvedValue({
      id: OFFERING_F2,
      capacity: 30,
      _count: { enrollments: 5 },
      course: { department: { facultyId: F2 } },
    } as never);
    enrollmentCreate.mockResolvedValue({
      id: 'enr-owner',
      studentId: STUDENT_IN_F2,
      offeringId: OFFERING_F2,
    } as never);

    const res = await post('/enrollments', OWNER, Role.OWNER, {
      studentId: STUDENT_IN_F2,
      offeringId: OFFERING_F2,
    });
    expect(res.status).toBe(201);
  });
});

// ── DELETE /enrollments/:id — drop ───────────────────────────────────

describe('DELETE /api/v1/enrollments/:id (scope asserted before the transaction)', () => {
  const enrollmentRow = (studentId: string) => ({
    id: 'enr-1',
    studentId,
    offeringId: OFFERING_F1,
    status: 'active',
    progressPct: 40,
  });

  it('scoped ADMIN cannot drop an out-of-faculty student’s enrollment → 403, no delete', async () => {
    enrollmentFindUnique.mockResolvedValue({
      ...enrollmentRow(STUDENT_IN_F2),
      // r179: the pre-read resolves the offering→course→institution chain.
      offering: { course: { institutionId: INSTITUTION } },
      student: {
        role: Role.STUDENT,
        // r178: per-membership plural shapes.
        studentProfiles: [{ facultyId: F2 }],
        teacherProfiles: [],
      },
    } as never);

    const res = await del('/enrollments/enr-1', SCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
    expect(enrollmentDelete).not.toHaveBeenCalled();
  });

  it('r179: a foreign-institution enrollment → 403, no delete (the chain check)', async () => {
    enrollmentFindUnique.mockResolvedValue({
      ...enrollmentRow(STUDENT_IN_F1),
      offering: { course: { institutionId: 'inst-foreign-r179' } },
      student: {
        role: Role.STUDENT,
        studentProfiles: [{ facultyId: F1 }],
        teacherProfiles: [],
      },
    } as never);

    const res = await del('/enrollments/enr-1', UNSCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('FORBIDDEN');
    expect(enrollmentDelete).not.toHaveBeenCalled();
  });

  it('r179: a contextless ADMIN → 403 INSTITUTION_CONTEXT_REQUIRED before the pre-read', async () => {
    const res = await del('/enrollments/enr-1', UNSCOPED_ADMIN, Role.ADMIN, null);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(enrollmentDelete).not.toHaveBeenCalled();
  });

  it('scoped ADMIN drops an in-faculty, in-institution enrollment → 200 { ok: true }', async () => {
    enrollmentFindUnique.mockResolvedValue({
      ...enrollmentRow(STUDENT_IN_F1),
      offering: { course: { institutionId: INSTITUTION } },
      student: {
        role: Role.STUDENT,
        // r178: per-membership plural shapes.
        studentProfiles: [{ facultyId: F1 }],
        teacherProfiles: [],
      },
    } as never);
    enrollmentDelete.mockResolvedValue(enrollmentRow(STUDENT_IN_F1) as never);

    const res = await del('/enrollments/enr-1', SCOPED_ADMIN, Role.ADMIN);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { ok: boolean } };
    expect(json.data).toEqual({ ok: true });
    expect(auditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('OWNER bypasses the drop scope', async () => {
    enrollmentDelete.mockResolvedValue(enrollmentRow(STUDENT_IN_F2) as never);

    const res = await del('/enrollments/enr-1', OWNER, Role.OWNER, null);
    expect(res.status).toBe(200);
    // No scope pre-read happens at all for a university-wide actor.
    expect(enrollmentFindUnique).not.toHaveBeenCalled();
    expect(enrollmentDelete).toHaveBeenCalledWith({ where: { id: 'enr-1' } });
  });
});
