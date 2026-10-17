/**
 * Backend unit test — r180 (academic supply chain): POST /admin/faculties
 * and POST /admin/departments in backend/src/http/routes/catalog.routes.ts
 * — the "new institution bootstrap dead-end" fix.
 *
 * Before r180 the catalog surface only READ faculties/departments: an
 * institution created by the OWNER could never grow an academic
 * structure through the API. This suite pins the create contract:
 *  · ADMIN create is scoped to their DB-verified institution context
 *    (403 INSTITUTION_CONTEXT_REQUIRED without one, 403
 *    INSTITUTION_CONTEXT_INVALID on a stale/revoked claim — the r179
 *    phase-5 fail-closed rules);
 *  · OWNER create REQUIRES an explicit ?institutionSlug= (400 when
 *    missing/unknown — an owner console never auto-selects);
 *  · a department create whose faculty belongs to ANOTHER institution
 *    is a 403, never a cross-institution write;
 *  · the @@unique collisions (P2002: faculty (institutionId, name,
 *    city) / department (facultyId, name)) answer 409 with the
 *    surface-specific Arabic copy, not the generic envelope;
 *  · the create lands WITH its AuditLog row (FACULTY_CREATED /
 *    DEPARTMENT_CREATED, institution-scoped) in the same transaction;
 *  · the public GET /faculties stays bounded (take: 500 — r180).
 *
 * DB-free (project canon): prisma is mocked at db.js; the REAL app on
 * an ephemeral port with signed role+inst JWTs (the social-routes /
 * ai-chat-routes pattern).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Prisma, Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    membership: { findFirst: vi.fn() },
    institution: { findUnique: vi.fn() },
    faculty: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    department: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    // Defensive: the error handler's 5xx alert feed (no 5xx is expected
    // in this suite — a 500 here should FAIL the test, not the mock).
    operationalAlert: { create: vi.fn(async () => ({})) },
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

const ADMIN_ID = 'admin-a1';
const OWNER_ID = 'owner-o1';
const STUDENT_ID = 'student-s1';
const INST_A = 'inst-a';
const INST_B = 'inst-b';
const SLUG_A = 'zawia-showcase';
// cuid-shaped (the zod schema rejects anything else before the handler
// runs — the IDs must pass z.string().cuid()).
const FACULTY_A = 'cfaculty0000000000000001';
// The faculty mock row the department guard resolves (INST_A chain).
const FACULTY_A_ROW = { id: FACULTY_A, name: 'كلية العلوم', institutionId: INST_A };
// The faculty row the transactional create returns (institution
// basics included — the wire contract the FE tables group by).
const CREATED_FACULTY = {
  id: 'fac-new-1',
  name: 'كلية الهندسة',
  nameEn: 'Faculty of Engineering',
  iconEmoji: '🏗️',
  city: 'الزاوية',
  institutionId: INST_A,
  institution: { id: INST_A, name: 'جامعة الزاوية', nameEn: 'University of Zawia', slug: SLUG_A },
};
const CREATED_DEPARTMENT = {
  id: 'dep-new-1',
  name: 'قسم الهندسة المدنية',
  nameEn: 'Civil Engineering Dept',
  facultyId: FACULTY_A,
  faculty: { id: FACULTY_A, name: 'كلية العلوم', city: 'الزاوية' },
};

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('unique constraint violated', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });

const bearerFor = (userId: string, role: Role, institutionId: string | null) => ({
  authorization: `Bearer ${signAccessToken(userId, role, institutionId)}`,
});
const jsonHeaders = { 'content-type': 'application/json' };

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  // resolveCallerInstitutionScope re-verifies the token's inst claim:
  // an institutionId in the where resolves (ACTIVE membership), none
  // of the caller's business otherwise.
  vi.mocked(prisma.membership.findFirst).mockImplementation(
    (async (args: unknown) => {
      const where = (args as { where?: { institutionId?: string } } | undefined)?.where;
      return where?.institutionId ? { institutionId: where.institutionId } : null;
    }) as never,
  );
});

const post = (path: string, headers: Record<string, string>, body: unknown) =>
  fetch(`${baseUrl}${path}`, { method: 'POST', headers: { ...headers, ...jsonHeaders }, body: JSON.stringify(body) });
const get = (path: string, headers: Record<string, string>) =>
  fetch(`${baseUrl}${path}`, { headers });

// ── POST /admin/faculties ──────────────────────────────────────────

describe('POST /api/v1/admin/faculties — institution-scoped create (r180)', () => {
  it('ADMIN happy path: 201, created row with institution basics, audit FACULTY_CREATED in the same transaction', async () => {
    vi.mocked(prisma.faculty.create).mockResolvedValue(CREATED_FACULTY as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const res = await post(
      '/api/v1/admin/faculties',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      // Whitespace on purpose — the schema trims before the write.
      { name: '  كلية الهندسة  ', nameEn: 'Faculty of Engineering', iconEmoji: '🏗️', city: ' الزاوية ' },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: typeof CREATED_FACULTY };
    expect(body.data).toEqual(CREATED_FACULTY);

    // The create carries the VERIFIED institution + trimmed fields.
    expect(prisma.faculty.create).toHaveBeenCalledWith({
      data: {
        name: 'كلية الهندسة',
        nameEn: 'Faculty of Engineering',
        iconEmoji: '🏗️',
        city: 'الزاوية',
        institutionId: INST_A,
      },
      include: { institution: { select: { id: true, name: true, nameEn: true, slug: true } } },
    });
    // The audit row lands inside the SAME transaction, scoped to the
    // same institution, naming the created row.
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: ADMIN_ID,
        institutionId: INST_A,
        action: 'FACULTY_CREATED',
        resourceType: 'Faculty',
        resourceId: 'fac-new-1',
        metadata: { name: 'كلية الهندسة', city: 'الزاوية' },
      }),
    });
  });

  it('a contextless ADMIN is 403 INSTITUTION_CONTEXT_REQUIRED (fail closed, nothing written)', async () => {
    const res = await post(
      '/api/v1/admin/faculties',
      bearerFor(ADMIN_ID, Role.ADMIN, null),
      { name: 'كلية الهندسة', city: 'الزاوية' },
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(prisma.faculty.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('a stale/revoked inst claim is 403 INSTITUTION_CONTEXT_INVALID (downgrading to "no context" would widen access)', async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null as never);

    const res = await post(
      '/api/v1/admin/faculties',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: 'كلية الهندسة', city: 'الزاوية' },
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INSTITUTION_CONTEXT_INVALID');
    expect(prisma.faculty.create).not.toHaveBeenCalled();
  });

  it('OWNER without ?institutionSlug= is 400 (never auto-selects an institution)', async () => {
    const res = await post(
      '/api/v1/admin/faculties',
      bearerFor(OWNER_ID, Role.OWNER, null),
      { name: 'كلية الهندسة', city: 'طرابلس' },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
    // Clear, actionable Arabic copy naming the missing parameter.
    expect(body.error.message).toContain('institutionSlug');
    expect(prisma.institution.findUnique).not.toHaveBeenCalled();
    expect(prisma.faculty.create).not.toHaveBeenCalled();
  });

  it('OWNER with an UNKNOWN slug is 400 with the institution-not-found copy', async () => {
    vi.mocked(prisma.institution.findUnique).mockResolvedValue(null as never);

    const res = await post(
      '/api/v1/admin/faculties?institutionSlug=no-such-inst',
      bearerFor(OWNER_ID, Role.OWNER, null),
      { name: 'كلية الهندسة', city: 'طرابلس' },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('المؤسسة المحددة غير موجودة أو غير نشطة');
    expect(prisma.faculty.create).not.toHaveBeenCalled();
  });

  it('OWNER with a valid slug creates INSIDE that institution (201 + audit carries it)', async () => {
    vi.mocked(prisma.institution.findUnique).mockResolvedValue({ id: INST_B, status: 'ACTIVE' } as never);
    vi.mocked(prisma.faculty.create).mockResolvedValue({
      ...CREATED_FACULTY,
      institutionId: INST_B,
      institution: { ...CREATED_FACULTY.institution, id: INST_B },
    } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const res = await post(
      '/api/v1/admin/faculties?institutionSlug=alandalus-demo',
      bearerFor(OWNER_ID, Role.OWNER, null),
      { name: 'كلية الهندسة', city: 'طرابلس' },
    );
    expect(res.status).toBe(201);
    expect(prisma.institution.findUnique).toHaveBeenCalledWith({
      where: { slug: 'alandalus-demo' },
      select: { id: true, status: true },
    });
    expect(prisma.faculty.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ institutionId: INST_B, city: 'طرابلس' }) }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: OWNER_ID, institutionId: INST_B, action: 'FACULTY_CREATED' }),
    });
  });

  it('P2002 (duplicate @@unique(institutionId, name, city)) → 409 with the faculty-specific Arabic copy', async () => {
    vi.mocked(prisma.faculty.create).mockRejectedValue(p2002());

    const res = await post(
      '/api/v1/admin/faculties',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: 'كلية العلوم', city: 'الزاوية' },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBe('توجد كلية بهذا الاسم في هذه المدينة لدى مؤسستك بالفعل');
    // The rolled-back transaction leaves no audit row either.
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('body validation: a missing city is 400 VALIDATION_ERROR (city is part of the unique key)', async () => {
    const res = await post(
      '/api/v1/admin/faculties',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: 'كلية الهندسة' },
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    expect(prisma.faculty.create).not.toHaveBeenCalled();
  });

  it('role gate: a STUDENT token never reaches the handler (403, nothing written)', async () => {
    const res = await post(
      '/api/v1/admin/faculties',
      bearerFor(STUDENT_ID, Role.STUDENT, INST_A),
      { name: 'كلية الهندسة', city: 'الزاوية' },
    );
    expect(res.status).toBe(403);
    expect(prisma.faculty.create).not.toHaveBeenCalled();
  });
});

// ── POST /admin/departments ────────────────────────────────────────

describe('POST /api/v1/admin/departments — faculty-chain-guarded create (r180)', () => {
  it('ADMIN happy path: 201, created row with faculty basics, audit DEPARTMENT_CREATED', async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue(FACULTY_A_ROW as never);
    vi.mocked(prisma.department.create).mockResolvedValue(CREATED_DEPARTMENT as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const res = await post(
      '/api/v1/admin/departments',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: ' قسم الهندسة المدنية ', nameEn: 'Civil Engineering Dept', facultyId: FACULTY_A },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: typeof CREATED_DEPARTMENT };
    expect(body.data).toEqual(CREATED_DEPARTMENT);

    // The chain guard resolved the faculty first…
    expect(prisma.faculty.findUnique).toHaveBeenCalledWith({
      where: { id: FACULTY_A },
      select: { id: true, name: true, institutionId: true },
    });
    // …and the create is a trimmed write inside that faculty.
    expect(prisma.department.create).toHaveBeenCalledWith({
      data: { name: 'قسم الهندسة المدنية', nameEn: 'Civil Engineering Dept', facultyId: FACULTY_A },
      include: { faculty: { select: { id: true, name: true, city: true } } },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: ADMIN_ID,
        institutionId: INST_A,
        action: 'DEPARTMENT_CREATED',
        resourceType: 'Department',
        resourceId: 'dep-new-1',
        metadata: { name: 'قسم الهندسة المدنية', facultyId: FACULTY_A },
      }),
    });
  });

  it('a FOREIGN faculty (another institution) is 403, never a cross-institution write', async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue({
      ...FACULTY_A_ROW,
      institutionId: INST_B,
    } as never);

    const res = await post(
      '/api/v1/admin/departments',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: 'قسم الهندسة المدنية', facultyId: FACULTY_A },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toBe('هذه الكلية تنتمي إلى مؤسسة أخرى');
    expect(prisma.department.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('a MISSING faculty id is 404 (not a silent empty create)', async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue(null as never);

    const res = await post(
      '/api/v1/admin/departments',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: 'قسم الهندسة المدنية', facultyId: 'cfaculty0000000000000002' },
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('الكلية المحددة غير موجودة');
    expect(prisma.department.create).not.toHaveBeenCalled();
  });

  it('OWNER without ?institutionSlug= is 400 (same explicit-slug contract as faculties)', async () => {
    const res = await post(
      '/api/v1/admin/departments',
      bearerFor(OWNER_ID, Role.OWNER, null),
      { name: 'قسم الهندسة المدنية', facultyId: FACULTY_A },
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('BAD_REQUEST');
    expect(prisma.department.create).not.toHaveBeenCalled();
  });

  it('OWNER WITH a slug still cannot write into a foreign faculty (403)', async () => {
    vi.mocked(prisma.institution.findUnique).mockResolvedValue({ id: INST_B, status: 'ACTIVE' } as never);
    // The slug resolved INST_B, the faculty belongs to INST_A.
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue(FACULTY_A_ROW as never);

    const res = await post(
      '/api/v1/admin/departments?institutionSlug=alandalus-demo',
      bearerFor(OWNER_ID, Role.OWNER, null),
      { name: 'قسم الهندسة المدنية', facultyId: FACULTY_A },
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('FORBIDDEN');
    expect(prisma.department.create).not.toHaveBeenCalled();
  });

  it('P2002 (duplicate @@unique(facultyId, name)) → 409 with the department-specific Arabic copy', async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue(FACULTY_A_ROW as never);
    vi.mocked(prisma.department.create).mockRejectedValue(p2002());

    const res = await post(
      '/api/v1/admin/departments',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: 'قسم الرياضيات', facultyId: FACULTY_A },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBe('يوجد قسم بهذا الاسم في هذه الكلية بالفعل');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('body validation: a non-cuid facultyId is 400 VALIDATION_ERROR before any DB read', async () => {
    const res = await post(
      '/api/v1/admin/departments',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
      { name: 'قسم الهندسة المدنية', facultyId: 'not-a-cuid' },
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    expect(prisma.faculty.findUnique).not.toHaveBeenCalled();
  });
});

// ── GET /faculties (public) — the r180 bound ───────────────────────

describe('GET /api/v1/faculties — bounded listing (r180)', () => {
  it('the public findMany carries take: 500 (no unbounded payload)', async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([] as never);

    const res = await get('/api/v1/faculties', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(200);
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 }),
    );
  });
});
