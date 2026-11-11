/**
 * Backend route test — r349-P2: the people surface in
 * `backend/src/http/routes/profiles.routes.ts` (mounted at the bare
 * /api/v1 prefix): GET/PATCH /me/profile (the extended self view + the
 * contact-lane self edit), GET/PATCH /people/:id (privacy-shaped staff
 * read + registrar edit — BOTH audited), GET /directory (filters,
 * pagination, formula-injection-safe exports), and POST
 * /people/:id/contact-request (the PRIVATE-phone door: rate gate,
 * 24h per-target dedup via the audit trail, notification to the owner).
 *
 * DB-free (the me-messages-link.test.ts pattern): the REAL app
 * (createApp, ephemeral port) with prisma mocked and a JWT signed via
 * signAccessToken(userId, role, institutionId). The privacy MATRIX
 * itself is pinned cell-by-cell in
 * src/lib/profiles/__tests__/privacy.test.ts; these tests pin the
 * ROUTE contracts: scoping, audit trails, dedup, and export escaping.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn() },
    studentProfile: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    teacherProfile: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    enrollment: { findFirst: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn() },
    notification: { create: vi.fn() },
    fieldValue: { findMany: vi.fn() },
  },
  // withRetry executes its callback once on the happy path (db.ts):
  // the mock must run the query, not swallow it.
  withRetry: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

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

// ── Mock wiring ──────────────────────────────────────────────────────

const membershipFindFirst = vi.mocked(prisma.membership.findFirst);
const userFindUnique = vi.mocked(prisma.user.findUnique);
const studentFindFirst = vi.mocked(prisma.studentProfile.findFirst);
const studentFindUnique = vi.mocked(prisma.studentProfile.findUnique);
const studentUpdate = vi.mocked(prisma.studentProfile.update);
const enrollmentFindFirst = vi.mocked(prisma.enrollment.findFirst);
const auditCreate = vi.mocked(prisma.auditLog.create);
const auditFindFirst = vi.mocked(prisma.auditLog.findFirst);
const notificationCreate = vi.mocked(prisma.notification.create);
const fieldValueFindMany = vi.mocked(prisma.fieldValue.findMany);

/** A PrismaPromise-shaped mock impl (the enrollments-scope pattern). */
function prismaFn<T>(impl: () => T): () => Promise<T> {
  const fn = vi.fn(async () => impl()) as unknown as () => Promise<T>;
  return fn;
}

const INST = 'inst-madarek-demo';

const studentRow = {
  id: 'sp1', userId: 'u-student', institutionId: INST, universityId: 'UM-2024-00001',
  nameAr: 'محمد علي سالم عمر', nameEn: 'Mohamed Ali',
  fatherName: 'علي', grandfatherName: 'سالم', motherName: 'فاطمة',
  dateOfBirth: new Date('2006-04-01'), birthPlace: 'طرابلس', gender: 'MALE',
  city: 'طرابلس', address: 'شارع عمران', profileImageUrl: null,
  studentPhone: '0912345678', studentPhoneNormalized: '218912345678',
  studentPhoneVisibility: 'INSTITUTION_STAFF', additionalPhone: null,
  guardianName: 'علي سالم', guardianRelationship: 'أب',
  guardianPhone: '0925556666', guardianPhoneNormalized: '218925556666',
  guardianPhoneVisibility: 'INSTITUTION_STAFF',
  emergencyContactName: 'سميرة', emergencyContactPhone: '0911112222',
  nationalId: '119012345678', nationalIdHash: 'a'.repeat(64),
  stage: null, grade: null, section: null, previousSchool: null,
  transferStatus: 'مستجد', studyType: 'MORNING', enrollmentStatus: 'ACTIVE',
  secondarySchool: 'ثانوية طرابلس', secondarySchoolBranch: 'علمي',
  secondarySchoolPercent: { toNumber: () => 88.5 }, admissionYear: 2024,
  year: 1, gpa: 3.2, totalXp: 100, level: 2,
  faculty: { id: 'f1', name: 'كلية تقنية المعلومات', nameEn: 'IT' },
  department: { id: 'd1', name: 'نظم حاسوبية', nameEn: 'CS' },
};

const userRow = {
  id: 'u-student', email: 'student@test.ly', firstName: 'محمد', lastName: 'علي',
  role: 'STUDENT', avatarColor: null, avatarInitials: 'مح',
  emailVerifiedAt: null, createdAt: new Date('2024-01-01'),
  studentProfiles: [studentRow],
  teacherProfiles: [],
};

function authHeaders(userId: string, role: Role, institutionId: string | null = INST) {
  return { Authorization: `Bearer ${signAccessToken(userId, role, institutionId)}` };
}

async function json(path: string, init: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body, res };
}

beforeEach(() => {
  vi.clearAllMocks();
  membershipFindFirst.mockReset();
  userFindUnique.mockReset();
  studentFindFirst.mockReset();
  studentFindUnique.mockReset();
  studentUpdate.mockReset();
  enrollmentFindFirst.mockReset();
  auditCreate.mockReset();
  auditFindFirst.mockReset();
  notificationCreate.mockReset();
  fieldValueFindMany.mockReset();
  // Default: a valid institution context for whoever asks.
  membershipFindFirst.mockImplementation(async () => ({ institutionId: INST }) as never);
  fieldValueFindMany.mockImplementation(async () => [] as never);
  auditCreate.mockImplementation(async () => ({}) as never);
});

/* ── GET /me/profile — the extended self view ─────────────────────── */

describe('r349-P2 GET /me/profile', () => {
  it('returns the legacy contract keys UNCHANGED plus the shaped self view', async () => {
    userFindUnique.mockImplementation(async () => userRow as never);
    const { status, body } = await json('/api/v1/me/profile', {
      headers: authHeaders('u-student', Role.STUDENT),
    });
    expect(status).toBe(200);
    expect(body.data.firstName).toBe('محمد');
    expect(body.data.student.universityId).toBe('UM-2024-00001');
    expect(body.data.student.faculty.name).toBe('كلية تقنية المعلومات');
    // the P2 extension (additive key, self lens):
    expect(body.data.student.profile.phone).toEqual({
      access: 'VISIBLE', display: '0912345678', canRequestContact: false,
    });
    expect(body.data.student.profile.nationalId).toEqual({
      access: 'VISIBLE', value: '119012345678',
    });
    expect(body.data.student.profile.academic.studyType).toBe('MORNING');
  });

  it('STUDENT without an institution context → 403 INSTITUTION_CONTEXT_REQUIRED', async () => {
    const { status, body } = await json('/api/v1/me/profile', {
      headers: authHeaders('u-student', Role.STUDENT, null),
    });
    expect(status).toBe(403);
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });
});

/* ── PATCH /me/profile — the contact-lane self edit ───────────────── */

describe('r349-P2 PATCH /me/profile', () => {
  it('updates the phone pair (display+normalized) and audits FIELD NAMES only', async () => {
    studentFindFirst.mockImplementation(async () => ({ id: 'sp1' }) as never);
    studentUpdate.mockImplementation(async () => ({ id: 'sp1', updatedAt: new Date() }) as never);
    const { status, body } = await json('/api/v1/me/profile', {
      method: 'PATCH',
      headers: { ...authHeaders('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentPhone: '091 999 8877', city: 'الزاوية' }),
    });
    expect(status).toBe(200);
    expect(studentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sp1' },
      data: expect.objectContaining({
        studentPhone: '091 999 8877',
        studentPhoneNormalized: '218919998877',
        city: 'الزاوية',
      }),
    }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'profile.self-update',
        resourceType: 'StudentProfile',
        resourceId: 'sp1',
        // zod re-orders keys to schema order — the SET is the contract:
        metadata: expect.objectContaining({
          fields: expect.arrayContaining(['studentPhone', 'city']),
        }),
      }),
    }));
    expect(body.data.id).toBe('sp1');
  });

  it('an unparseable phone → 400, nothing stored, nothing audited', async () => {
    studentFindFirst.mockImplementation(async () => ({ id: 'sp1' }) as never);
    const { status } = await json('/api/v1/me/profile', {
      method: 'PATCH',
      headers: { ...authHeaders('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentPhone: 'not-a-phone' }),
    });
    expect(status).toBe(400);
    expect(studentUpdate).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('a staff-only field in the body → 400 (strict schema rejects it)', async () => {
    const { status } = await json('/api/v1/me/profile', {
      method: 'PATCH',
      headers: { ...authHeaders('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: '119012345678' }),
    });
    expect(status).toBe(400);
  });
});

/* ── GET /people/:id — the privacy-shaped staff read ──────────────── */

describe('r349-P2 GET /people/:id', () => {
  it('STUDENT caller → 403 (students never read people)', async () => {
    const { status } = await json('/api/v1/people/sp1', {
      headers: authHeaders('u-student', Role.STUDENT),
    });
    expect(status).toBe(403);
  });

  it('TEACHER with the student on their roster → shaped view + PII read audit', async () => {
    studentFindUnique.mockImplementation(async () => studentRow as never);
    enrollmentFindFirst.mockImplementation(async () => ({ id: 'e1' }) as never);
    userFindUnique.mockImplementation(async () => ({
      id: 'u-student', firstName: 'محمد', lastName: 'علي', email: 'student@test.ly',
      avatarColor: null, avatarInitials: 'مح', isActive: true,
    }) as never);
    const { status, body } = await json('/api/v1/people/sp1', {
      headers: authHeaders('u-teacher', Role.TEACHER),
    });
    expect(status).toBe(200);
    expect(body.data.kind).toBe('student');
    expect(body.data.phone.display).toBe('0912345678');
    // TEACHER never sees the national id — not even masked:
    expect(body.data.nationalId).toEqual({ access: 'HIDDEN', value: null });
    expect(body.data.nationalIdPresent).toBe(true);
    expect(body.data.guardian.phone.display).toBe('0925556666');
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'people.read',
        resourceType: 'StudentProfile',
        resourceId: 'sp1',
        metadata: expect.objectContaining({
          sawStudentPhone: true, sawGuardianPhone: true, sawNationalId: false,
        }),
      }),
    }));
  });

  it('TEACHER with a NON-roster student → 404 (never leak existence)', async () => {
    studentFindUnique.mockImplementation(async () => studentRow as never);
    enrollmentFindFirst.mockImplementation(async () => null as never);
    const { status } = await json('/api/v1/people/sp1', {
      headers: authHeaders('u-teacher', Role.TEACHER),
    });
    expect(status).toBe(404);
  });

  it('cross-institution profile id → 404 for every staff role', async () => {
    studentFindUnique.mockImplementation(async () => ({ ...studentRow, institutionId: 'inst-other' }) as never);
    for (const role of [Role.TEACHER, Role.ADMIN, Role.QUALITY]) {
      const { status } = await json('/api/v1/people/sp1', {
        headers: authHeaders('u-staff', role),
      });
      expect(status).toBe(404);
    }
  });

  it('QUALITY caller → masked nationalId + audit with the access level', async () => {
    studentFindUnique.mockImplementation(async () => studentRow as never);
    userFindUnique.mockImplementation(async () => ({
      id: 'u-student', firstName: 'محمد', lastName: 'علي', email: 'student@test.ly',
      avatarColor: null, avatarInitials: 'مح', isActive: true,
    }) as never);
    const { status, body } = await json('/api/v1/people/sp1', {
      headers: authHeaders('u-quality', Role.QUALITY),
    });
    expect(status).toBe(200);
    expect(body.data.nationalId).toEqual({ access: 'MASKED', value: '1••••••••78' });
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'people.read',
        metadata: expect.objectContaining({ nationalIdAccess: 'MASKED' }),
      }),
    }));
  });
});

/* ── PATCH /people/:id — the registrar edit ───────────────────────── */

describe('r349-P2 PATCH /people/:id', () => {
  it('ADMIN sets the nationalId PAIR (raw + hash) and audits field names', async () => {
    studentFindUnique.mockImplementation(async () => ({ id: 'sp1', institutionId: INST }) as never);
    studentUpdate.mockImplementation(async () => ({ id: 'sp1', updatedAt: new Date() }) as never);
    const { status } = await json('/api/v1/people/sp1', {
      method: 'PATCH',
      headers: { ...authHeaders('u-admin', Role.ADMIN), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nationalId: '١١٩٠ ١٢٣٤ ٥٦٧٨', // Eastern-Arabic + separators → folded
        studyType: 'EVENING',
        enrollmentStatus: 'SUSPENDED',
      }),
    });
    expect(status).toBe(200);
    const data = studentUpdate.mock.calls[0][0].data;
    expect(data.nationalId).toBe('119012345678');
    expect(data.nationalIdHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.studyType).toBe('EVENING');
    expect(data.enrollmentStatus).toBe('SUSPENDED');
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'people.update',
        metadata: { fields: ['nationalId', 'studyType', 'enrollmentStatus'] },
      }),
    }));
  });

  it('QUALITY cannot edit (registrar lane is ADMIN/OWNER)', async () => {
    const { status } = await json('/api/v1/people/sp1', {
      method: 'PATCH',
      headers: { ...authHeaders('u-quality', Role.QUALITY), 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'بنغازي' }),
    });
    expect(status).toBe(403);
  });

  it('a malformed nationalId → 400, nothing written', async () => {
    studentFindUnique.mockImplementation(async () => ({ id: 'sp1', institutionId: INST }) as never);
    const { status } = await json('/api/v1/people/sp1', {
      method: 'PATCH',
      headers: { ...authHeaders('u-admin', Role.ADMIN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: '123' }),
    });
    expect(status).toBe(400);
    expect(studentUpdate).not.toHaveBeenCalled();
  });
});

/* ── GET /directory — filters, exports ────────────────────────────── */

describe('r349-P2 GET /directory', () => {
  it('TEACHER kind=student is roster-pinned (enrollments in own offerings)', async () => {
    const findMany = prismaFn(() => [studentRow]);
    vi.mocked(prisma.studentProfile.findMany).mockImplementation(findMany as never);
    vi.mocked(prisma.studentProfile.count).mockImplementation(prismaFn(() => 1) as never);
    const { status, body } = await json('/api/v1/directory?kind=student', {
      headers: authHeaders('u-teacher', Role.TEACHER),
    });
    expect(status).toBe(200);
    const where = (prisma.studentProfile.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(where.institutionId).toBe(INST);
    expect(where.user).toEqual({
      enrollments: {
        some: {
          offering: {
            teacherId: 'u-teacher',
            course: { department: { faculty: { institutionId: INST } } },
          },
        },
      },
    });
    expect(body.meta.total).toBe(1);
    expect(body.data[0].phone.display).toBe('0912345678');
  });

  it('csv export escapes formula-injection cells and is audited', async () => {
    const evilRow = {
      ...studentRow,
      nameAr: '=SUM(A1:A9)',
      nameEn: '+cmd',
      universityId: '-91',
    };
    vi.mocked(prisma.studentProfile.findMany).mockImplementation(prismaFn(() => [evilRow]) as never);
    const res = await fetch(`${baseUrl}/api/v1/directory?kind=student&format=csv`, {
      headers: authHeaders('u-admin', Role.ADMIN),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    // BOM check at the BYTE level (fetch's text() strips a leading BOM):
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    const csv = new TextDecoder('utf-8').decode(bytes.subarray(3));
    expect(csv).toContain("'=SUM(A1:A9)");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'-91");
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'directory.export',
        metadata: expect.objectContaining({ format: 'csv', rows: 1 }),
      }),
    }));
  });

  it('STUDENT → 403 on the directory surface', async () => {
    const { status } = await json('/api/v1/directory', {
      headers: authHeaders('u-student', Role.STUDENT),
    });
    expect(status).toBe(403);
  });
});

/* ── POST /people/:id/contact-request — the PRIVATE door ──────────── */

describe('r349-P2 POST /people/:id/contact-request', () => {
  const privateRow = {
    ...studentRow,
    studentPhoneVisibility: 'PRIVATE',
    guardianPhoneVisibility: 'PRIVATE',
  };

  it('creates the owner notification + audit row, returns 201', async () => {
    studentFindUnique.mockImplementation(async () => privateRow as never);
    auditFindFirst.mockImplementation(async () => null as never);
    userFindUnique.mockImplementation(async () => ({ firstName: 'سالم', lastName: 'الفيتوري' }) as never);
    notificationCreate.mockImplementation(async () => ({}) as never);
    const { status, body } = await json('/api/v1/people/sp1/contact-request', {
      method: 'POST',
      headers: { ...authHeaders('u-teacher', Role.TEACHER), 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'guardian', message: 'بخصوص غياب اليوم' }),
    });
    expect(status).toBe(201);
    expect(body.data).toEqual({ sent: true, channel: 'guardian' });
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u-student',
        type: 'SYSTEM',
        title: 'طلب وسيلة تواصل',
        link: '/student/profile',
      }),
    }));
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'people.contact-request',
        resourceId: 'sp1',
        metadata: { channel: 'guardian' },
      }),
    }));
  });

  it('a request on a STAFF-VISIBLE phone → 400 (the door is for private phones only)', async () => {
    studentFindUnique.mockImplementation(async () => studentRow as never);
    const { status } = await json('/api/v1/people/sp1/contact-request', {
      method: 'POST',
      headers: { ...authHeaders('u-teacher', Role.TEACHER), 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'student' }),
    });
    expect(status).toBe(400);
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it('24h per-target dedup: a recent audit row → 429, no duplicate notification', async () => {
    studentFindUnique.mockImplementation(async () => privateRow as never);
    auditFindFirst.mockImplementation(async () => ({ id: 'recent' }) as never);
    const { status } = await json('/api/v1/people/sp1/contact-request', {
      method: 'POST',
      headers: { ...authHeaders('u-teacher', Role.TEACHER), 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'student' }),
    });
    expect(status).toBe(429);
    expect(notificationCreate).not.toHaveBeenCalled();
  });
});
