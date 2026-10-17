/**
 * Backend unit test — r179 (phase-5): the SOCIAL surfaces are
 * institution-scoped (backend/src/http/routes/social.routes.ts + the
 * posts family in catalog.routes.ts).
 *
 * DB-free (the project canon): prisma mocked at db.js; the REAL app on
 * an ephemeral port with signed role+inst JWTs (the ai-chat-routes
 * pattern). What this pins:
 *  · announcements feed: a contextless institutional caller is 403
 *    fail-closed; STUDENT/TEACHER scope reads (profile resolution,
 *    enrollments, taught offerings) carry the VERIFIED institution;
 *    ADMIN/QUALITY oversight covers THEIR institution's scoped rows +
 *    PLATFORM only; OWNER stays platform-wide.
 *  · announcements create: the scopeId target is looked up INSIDE the
 *    author's institution — a foreign faculty id is a 404 (never a
 *    cross-institution announcement).
 *  · competitions: list scoped by institution; a foreign id is a 404
 *    on detail AND on enter (the locked read carries institutionId).
 *  · events: list scoped; a foreign RSVP is a 404.
 *  · posts (catalog.routes.ts — the surface the phase-5 map placed in
 *    social): feed + create + react scoped; a foreign post id 404s.
 *
 * The pure announcement-condition builders are pinned separately in
 * social-logic.test.ts (institutionAnnouncementConditions).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    membership: { findFirst: vi.fn() },
    announcement: { findMany: vi.fn() },
    faculty: { findMany: vi.fn(), findFirst: vi.fn() },
    department: { findUnique: vi.fn(), findFirst: vi.fn() },
    courseOffering: { findMany: vi.fn(), findFirst: vi.fn() },
    enrollment: { findMany: vi.fn() },
    studentProfile: { findFirst: vi.fn() },
    teacherProfile: { findFirst: vi.fn() },
    competition: { findMany: vi.fn(), findFirst: vi.fn() },
    competitionEntry: { upsert: vi.fn() },
    campusEvent: { findMany: vi.fn(), findFirst: vi.fn() },
    eventRSVP: { count: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    post: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
    postReaction: { upsert: vi.fn(), deleteMany: vi.fn() },
    // assertCapability (announcements create) — role defaults apply when
    // both permission layers read empty.
    rolePermission: { findMany: vi.fn() },
    userPermission: { findMany: vi.fn() },
    operationalAlert: { create: vi.fn() },
    $queryRaw: vi.fn(),
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

const STUDENT_ID = 'student-s1';
const TEACHER_ID = 'teacher-t1';
const ADMIN_ID = 'admin-a1';
const OWNER_ID = 'owner-o1';
const INST_A = 'inst-a';
const INST_B = 'inst-b';
const FACULTY_A = 'cfaca0000000000000000001';
const DEPARTMENT_A = 'cdepa0000000000000000001';

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
  // The caller's institution context resolves (ACTIVE membership) for
  // whichever institution the token claims.
  vi.mocked(prisma.membership.findFirst).mockImplementation(
    (async (args: unknown) => {
      const where = (args as { where?: { institutionId?: string } } | undefined)?.where;
      return where?.institutionId ? { institutionId: where.institutionId } : null;
    }) as never,
  );
  vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.userPermission.findMany).mockResolvedValue([] as never);
});

const get = (path: string, headers: Record<string, string>) =>
  fetch(`${baseUrl}${path}`, { headers });
const post = (path: string, headers: Record<string, string>, body: unknown) =>
  fetch(`${baseUrl}${path}`, { method: 'POST', headers: { ...headers, ...jsonHeaders }, body: JSON.stringify(body) });

// ── Announcements feed ─────────────────────────────────────────────

describe('GET /api/v1/announcements/feed — institution scoping (r179)', () => {
  it('a contextless STUDENT is 403 INSTITUTION_CONTEXT_REQUIRED (fail closed, no legacy profile fallback)', async () => {
    const res = await get('/api/v1/announcements/feed', bearerFor(STUDENT_ID, Role.STUDENT, null));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    // The legacy fallback would have resolved the oldest profile and
    // built a scope from ANOTHER institution — nothing ran.
    expect(prisma.studentProfile.findFirst).not.toHaveBeenCalled();
  });

  it('a STUDENT\'s scope facts resolve INSIDE the verified institution (scoped enrollment read)', async () => {
    vi.mocked(prisma.studentProfile.findFirst).mockResolvedValue({
      facultyId: FACULTY_A,
      departmentId: DEPARTMENT_A,
    } as never);
    vi.mocked(prisma.enrollment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);

    const res = await get('/api/v1/announcements/feed', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(200);
    // The profile resolution carries the VERIFIED institution id…
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: STUDENT_ID, institutionId: INST_A }) }),
    );
    // …and the OFFERING-scope read filters through the course chain.
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: STUDENT_ID,
          offering: { course: { institutionId: INST_A } },
        }),
      }),
    );
    // The feed read itself is a scoped OR (PLATFORM + own scopes only).
    const where = vi.mocked(prisma.announcement.findMany).mock.calls[0]![0] as { where: { AND: Array<{ OR: unknown[] }> } };
    expect(where.where.AND[0]!.OR).toEqual([
      { scope: 'PLATFORM' },
      { scope: 'FACULTY', scopeId: FACULTY_A },
      { scope: 'DEPARTMENT', scopeId: DEPARTMENT_A },
    ]);
  });

  it('an ADMIN\'s oversight covers THEIR institution\'s scoped rows + PLATFORM only', async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([
      { id: FACULTY_A, departments: [{ id: DEPARTMENT_A }] },
    ] as never);
    vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);

    const res = await get('/api/v1/announcements/feed', bearerFor(ADMIN_ID, Role.ADMIN, INST_A));
    expect(res.status).toBe(200);
    // The institution's id-sets are read scoped…
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: INST_A } }),
    );
    expect(prisma.courseOffering.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { course: { institutionId: INST_A } } }),
    );
    // …and the feed OR admits PLATFORM + THIS institution's targets.
    const where = vi.mocked(prisma.announcement.findMany).mock.calls[0]![0] as { where: { AND: Array<{ OR: unknown[] }> } };
    expect(where.where.AND[0]!.OR).toEqual([
      { scope: 'PLATFORM' },
      { scope: 'FACULTY', scopeId: { in: [FACULTY_A] } },
      { scope: 'DEPARTMENT', scopeId: { in: [DEPARTMENT_A] } },
    ]);
  });

  it('OWNER keeps the platform-wide feed (no institution context by design)', async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);
    const res = await get('/api/v1/announcements/feed', bearerFor(OWNER_ID, Role.OWNER, null));
    expect(res.status).toBe(200);
    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] },
      }),
    );
    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
  });
});

// ── Announcements create ───────────────────────────────────────────

describe('POST /api/v1/announcements — scopeId target inside the author\'s institution (r179)', () => {
  const facultyAnnouncement = (scopeId: string) => ({
    scope: 'FACULTY',
    scopeId,
    title: 'إعلان اختبارات منتصف الفصل',
    body: 'تبدأ اختبارات منتصف الفصل الأسبوع القادم وفق الجدول المعلن.',
  });

  it('a FACULTY-scoped announcement for a FOREIGN faculty id is a 404', async () => {
    // The scoped lookup (id + the author's institution) does not
    // resolve a foreign faculty → 404, never a cross-institution write.
    vi.mocked(prisma.faculty.findFirst).mockResolvedValue(null as never);
    const res = await post(
      '/api/v1/announcements',
      bearerFor(TEACHER_ID, Role.TEACHER, INST_A),
      facultyAnnouncement('cfacb0000000000000000009'),
    );
    expect(res.status).toBe(404);
    expect(prisma.announcement.findMany).not.toHaveBeenCalled();
  });

  it('a contextless TEACHER cannot author a scoped announcement (403 fail closed)', async () => {
    const res = await post(
      '/api/v1/announcements',
      bearerFor(TEACHER_ID, Role.TEACHER, null),
      facultyAnnouncement(FACULTY_A),
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('the teacher\'s permitted offerings are read through the course→institution chain', async () => {
    vi.mocked(prisma.teacherProfile.findFirst).mockResolvedValue({
      departmentId: DEPARTMENT_A,
    } as never);
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      facultyId: FACULTY_A,
    } as never);
    vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.faculty.findFirst).mockResolvedValue({ id: FACULTY_A } as never);
    // The permission half rejects: the teacher's own faculty list does
    // not include this OTHER faculty of the same institution — the
    // forgery guard still applies INSIDE the institution.
    const res = await post(
      '/api/v1/announcements',
      bearerFor(TEACHER_ID, Role.TEACHER, INST_A),
      facultyAnnouncement('cfac20000000000000000002'),
    );
    expect(res.status).toBe(403);
    expect(prisma.courseOffering.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: TEACHER_ID, course: { institutionId: INST_A } } }),
    );
  });
});

// ── Competitions ───────────────────────────────────────────────────

describe('GET/POST /api/v1/competitions* — institution scoping (r179)', () => {
  it('the list is scoped to the caller\'s verified institution', async () => {
    vi.mocked(prisma.competition.findMany).mockResolvedValue([] as never);
    const res = await get('/api/v1/competitions', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(200);
    expect(prisma.competition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: INST_A } }),
    );
  });

  it('a contextless caller cannot list competitions (403 fail closed)', async () => {
    const res = await get('/api/v1/competitions', bearerFor(STUDENT_ID, Role.STUDENT, null));
    expect(res.status).toBe(403);
    expect(prisma.competition.findMany).not.toHaveBeenCalled();
  });

  it('OWNER keeps the platform-wide list (no institution filter)', async () => {
    vi.mocked(prisma.competition.findMany).mockResolvedValue([] as never);
    const res = await get('/api/v1/competitions', bearerFor(OWNER_ID, Role.OWNER, null));
    expect(res.status).toBe(200);
    expect(prisma.competition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('a competition id from ANOTHER institution is a 404 on detail', async () => {
    vi.mocked(prisma.competition.findFirst).mockResolvedValue(null as never);
    const res = await get('/api/v1/competitions/comp-foreign', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(404);
    expect(prisma.competition.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'comp-foreign', institutionId: INST_A } }),
    );
  });

  it('entering a foreign institution\'s competition is a 404 (institution rides the locked read)', async () => {
    // The locked row exists but belongs to institution B → 404, no entry.
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { id: 'comp-b-1', institutionId: INST_B, status: 'OPEN', deadline: new Date(Date.now() + 86_400_000) },
    ] as never);
    const res = await post(
      '/api/v1/competitions/comp-b-1/enter',
      bearerFor(STUDENT_ID, Role.STUDENT, INST_A),
      { title: 'مشاركة خارج المؤسسة', body: 'محاولة مشاركة في مسابقة مؤسسة أخرى غير مؤسستي الحالية.' },
    );
    expect(res.status).toBe(404);
    expect(prisma.competitionEntry.upsert).not.toHaveBeenCalled();
  });
});

// ── Events ──────────────────────────────────────────────────────────

describe('GET/POST /api/v1/events* — institution scoping (r179)', () => {
  it('the list is scoped to the caller\'s verified institution', async () => {
    vi.mocked(prisma.campusEvent.findMany).mockResolvedValue([] as never);
    const res = await get('/api/v1/events', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(200);
    expect(prisma.campusEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ institutionId: INST_A, endsAt: expect.objectContaining({ gte: expect.any(Date) }) }),
      }),
    );
  });

  it('an RSVP against ANOTHER institution\'s event is a 404 (no cross-institution write)', async () => {
    vi.mocked(prisma.campusEvent.findFirst).mockResolvedValue(null as never);
    const res = await post(
      '/api/v1/events/event-b-1/rsvp',
      bearerFor(STUDENT_ID, Role.STUDENT, INST_A),
      { status: 'GOING' },
    );
    expect(res.status).toBe(404);
    expect(prisma.campusEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'event-b-1', institutionId: INST_A } }),
    );
    expect(prisma.eventRSVP.upsert).not.toHaveBeenCalled();
  });
});

// ── Posts (catalog.routes.ts — the community feed surface) ─────────

describe('/api/v1/posts* — institution scoping (r179)', () => {
  it('the feed is scoped: the listing query filters by the caller\'s institution', async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.post.count).mockResolvedValue(0 as never);
    const res = await get('/api/v1/posts?page=1&limit=10', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(200);
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ institutionId: INST_A }) }),
    );
    expect(prisma.post.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ institutionId: INST_A }) }),
    );
  });

  it('a contextless caller cannot read the feed (403 fail closed)', async () => {
    const res = await get('/api/v1/posts?page=1&limit=10', bearerFor(STUDENT_ID, Role.STUDENT, null));
    expect(res.status).toBe(403);
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it('a post is created INSIDE the caller\'s verified institution', async () => {
    vi.mocked(prisma.post.create).mockResolvedValue({} as never);
    const res = await post(
      '/api/v1/posts',
      bearerFor(STUDENT_ID, Role.STUDENT, INST_A),
      { body: 'منشور داخل مؤسستي' },
    );
    expect(res.status).toBe(201);
    expect(prisma.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ authorId: STUDENT_ID, institutionId: INST_A }),
    });
  });

  it('reacting to ANOTHER institution\'s post is a 404 (no cross-institution reaction)', async () => {
    vi.mocked(prisma.post.findFirst).mockResolvedValue(null as never);
    const res = await post(
      '/api/v1/posts/post-b-1/react',
      bearerFor(STUDENT_ID, Role.STUDENT, INST_A),
      { kind: 'like' },
    );
    expect(res.status).toBe(404);
    expect(prisma.post.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'post-b-1', institutionId: INST_A } }),
    );
    expect(prisma.postReaction.upsert).not.toHaveBeenCalled();
  });
});
