/**
 * Backend regression test — public college funnel (audit 4-A14 P1-2,
 * fixed in wave 22-d).
 *
 * The landing popover + public gallery deep-link GUESTS into
 * /colleges/:id and /colleges/leaderboard; both used to sit behind
 * authMiddleware, so an anonymous visitor hit a retryable 401 wall
 * («يلزم تسجيل الدخول») whose retry could never succeed — a dead-end
 * in the marketing funnel.
 *
 * This suite pins the fix through the REAL app (createApp, ephemeral
 * port — the same pattern as catalog-faculties-public.test.ts, so the
 * app-level mount ordering is exercised exactly as in production):
 *   - anonymous GET /colleges/leaderboard → 200 (aggregate-only, no PII);
 *   - anonymous GET /colleges/:id → 200 WITH the guest narrowing:
 *     topStudents names are projected to given name + family initial,
 *     while leadership (university officials) keeps full names;
 *   - an authenticated request keeps the FULL student names;
 *   - an unknown college id still 404s with the standard envelope;
 *   - the auth gate still guards the rest of the API surface
 *     (anonymous /me routes and role-guarded admin routes stay 401 —
 *     opening the college funnel widened exactly two routes).
 *
 * Plus pure unit tests for `anonymizeGuestUser` (the narrowing
 * contract — no DB needed).
 *
 * DB-free: prisma is mocked; only the colleges-route queries are ever
 * reached for the 200 paths.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('../../src/db.js', () => ({
  prisma: {
    // r179 (phase-5): the colleges surfaces resolve the target
    // institution (?institution=slug / authed context / showcase
    // default) before listing faculties.
    institution: { findUnique: vi.fn() },
    // GET /colleges/:id
    faculty: { findUnique: vi.fn(), findMany: vi.fn() },
    teacherProfile: { findMany: vi.fn(), groupBy: vi.fn() },
    studentProfile: { findMany: vi.fn(), groupBy: vi.fn() },
    announcement: { findMany: vi.fn() },
    campusEvent: { findMany: vi.fn() },
    liveSession: { findMany: vi.fn() },
    competition: { findMany: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
    // GET /colleges/leaderboard
    researchPaper: { groupBy: vi.fn() },
    examAttempt: { groupBy: vi.fn() },
    labSession: { groupBy: vi.fn() },
    enrollment: { groupBy: vi.fn() },
    courseOffering: { findMany: vi.fn() },
    examTemplate: { findMany: vi.fn() },
  },
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { anonymizeGuestUser } from '../../src/http/routes/colleges.routes';

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

beforeEach(() => {
  vi.clearAllMocks();
  // r179 (phase-5): the default target resolves — an ACTIVE showcase
  // institution row (both the anonymous and the contextless-authed
  // paths land on it).
  vi.mocked(prisma.institution.findUnique).mockResolvedValue({
    id: 'inst-showcase',
    status: 'ACTIVE',
  } as never);
});

const get = (path: string, token?: string) =>
  fetch(`${baseUrl}${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : undefined);

// ── anonymizeGuestUser (pure narrowing contract) ───────────────────

describe('anonymizeGuestUser — guest name projection (4-A14 P1-2)', () => {
  it('keeps the given name and reduces the family name to its initial', () => {
    expect(
      anonymizeGuestUser({ id: 'u1', firstName: 'أحمد', lastName: 'المهدي', avatarColor: null, avatarInitials: null }),
    ).toEqual({ id: 'u1', firstName: 'أحمد', lastName: 'م.', avatarColor: null, avatarInitials: null });
  });

  it('passes every other key through untouched (projection, not reconstruction)', () => {
    const out = anonymizeGuestUser({ id: 'u2', firstName: 'سارة', lastName: 'الطاهر', extra: 'kept' });
    expect(out.id).toBe('u2');
    expect(out.firstName).toBe('سارة');
    expect(out.extra).toBe('kept');
  });

  it('collapses an empty / whitespace family name to an empty string (no lone dot)', () => {
    expect(anonymizeGuestUser({ firstName: 'أحمد', lastName: '' }).lastName).toBe('');
    expect(anonymizeGuestUser({ firstName: 'أحمد', lastName: '   ' }).lastName).toBe('');
  });

  it('never widens: the anonymized family name is at most two characters', () => {
    for (const lastName of ['المهدي', 'بن عمران', 'ع', 'Abdulaziz']) {
      const { lastName: out } = anonymizeGuestUser({ firstName: 'x', lastName });
      expect(out.length).toBeLessThanOrEqual(2);
    }
  });
});

// ── GET /colleges/:id — public with PII narrowing ──────────────────

const FACULTY_ID = 'fac-arts';

function mockDetailBundle() {
  vi.mocked(prisma.faculty.findUnique).mockResolvedValue({
    id: FACULTY_ID,
    name: 'كلية الآداب',
    nameEn: 'Faculty of Arts',
    iconEmoji: '📚',
    city: 'الزاوية',
    // r179 (phase-5): the bundle's events/competitions are scoped to
    // the faculty's institution — the mock carries it like the real
    // include does.
    institution: { id: 'inst-showcase', name: 'جامعة مدارك التجريبية', nameEn: 'Madarek Demo University', slug: 'madarek-demo' },
    departments: [
      { id: 'dep-1', name: 'قسم اللغة العربية', _count: { students: 40, teachers: 3, courses: 6 } },
    ],
  } as never);
  vi.mocked(prisma.teacherProfile.findMany).mockResolvedValue([
    {
      position: 'DEAN',
      appointedAt: new Date('2024-01-01'),
      user: { id: 'dean-1', firstName: 'خالد', lastName: 'العمروني', avatarColor: null, avatarInitials: null },
      positionDepartment: null,
      positionFaculty: { id: FACULTY_ID, name: 'كلية الآداب' },
    },
  ] as never);
  vi.mocked(prisma.studentProfile.findMany).mockResolvedValue([
    {
      totalXp: 900,
      level: 4,
      year: 3,
      department: { id: 'dep-1', name: 'قسم اللغة العربية' },
      user: { id: 'stu-1', firstName: 'أحمد', lastName: 'المهدي', avatarColor: null, avatarInitials: null },
    },
    {
      totalXp: 500,
      level: 2,
      year: 2,
      department: { id: 'dep-1', name: 'قسم اللغة العربية' },
      user: { id: 'stu-2', firstName: 'سارة', lastName: 'الطاهر', avatarColor: null, avatarInitials: null },
    },
  ] as never);
  vi.mocked(prisma.announcement.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.campusEvent.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.liveSession.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.competition.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.user.count).mockResolvedValue(0);
}

describe('GET /api/v1/colleges/:id — guest funnel open with PII narrowing', () => {
  beforeEach(mockDetailBundle);

  it('answers 200 WITHOUT an authorization header (was the 401 dead-end)', async () => {
    const res = await get(`/api/v1/colleges/${FACULTY_ID}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe('كلية الآداب');
  });

  it('anonymizes student family names for guests (given name + initial only)', async () => {
    const res = await get(`/api/v1/colleges/${FACULTY_ID}`);
    const body = (await res.json()) as {
      data: { topStudents: Array<{ user: { firstName: string; lastName: string } }> };
    };
    const names = body.data.topStudents.map((s) => `${s.user.firstName} ${s.user.lastName}`);
    expect(names).toEqual(['أحمد م.', 'سارة ط.']);
  });

  it('keeps leadership (university officials) at full name for guests', async () => {
    const res = await get(`/api/v1/colleges/${FACULTY_ID}`);
    const body = (await res.json()) as {
      data: { leadership: Array<{ user: { firstName: string; lastName: string } }> };
    };
    expect(body.data.leadership[0]!.user.lastName).toBe('العمروني');
  });

  it('keeps FULL student names for authenticated users (any role)', async () => {
    const token = signAccessToken('stu-1', 'STUDENT', null);
    const res = await get(`/api/v1/colleges/${FACULTY_ID}`, token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { topStudents: Array<{ user: { lastName: string } }> };
    };
    expect(body.data.topStudents.map((s) => s.user.lastName)).toEqual(['المهدي', 'الطاهر']);
  });

  it('still 404s an unknown college id with the standard envelope', async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue(null as never);
    const res = await get('/api/v1/colleges/nope');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });
});

// ── GET /colleges/leaderboard — public aggregate ───────────────────

function mockLeaderboardBundle() {
  vi.mocked(prisma.faculty.findMany).mockResolvedValue([
    { id: FACULTY_ID, name: 'كلية الآداب', iconEmoji: '📚', city: 'الزاوية', departments: [{ id: 'dep-1' }] },
  ] as never);
  vi.mocked(prisma.studentProfile.groupBy).mockResolvedValue([
    {
      facultyId: FACULTY_ID,
      _count: { _all: 40 },
      _sum: { totalXp: 4_000 },
      _avg: { totalXp: 100, gpa: { toString: () => '3.10' } },
    },
  ] as never);
  vi.mocked(prisma.teacherProfile.groupBy).mockResolvedValue([
    { departmentId: 'dep-1', _count: { _all: 3 } },
  ] as never);
  vi.mocked(prisma.researchPaper.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.examAttempt.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.labSession.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.enrollment.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.examTemplate.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
}

describe('GET /api/v1/colleges/leaderboard — public aggregate (was 401)', () => {
  beforeEach(mockLeaderboardBundle);

  it('answers 200 WITHOUT an authorization header and ships college rows', async () => {
    const res = await get('/api/v1/colleges/leaderboard');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { colleges: Array<{ id: string; studentCount: number; ranks: Record<string, number> }> };
    };
    expect(body.data.colleges).toHaveLength(1);
    expect(body.data.colleges[0]!.id).toBe(FACULTY_ID);
    expect(body.data.colleges[0]!.studentCount).toBe(40);
    expect(body.data.colleges[0]!.ranks.totalXp).toBe(1);
  });

  it('returns the identical aggregate for an authenticated user (no per-role variance)', async () => {
    const token = signAccessToken('stu-1', 'STUDENT', null);
    const [anon, authed] = await Promise.all([
      get('/api/v1/colleges/leaderboard'),
      get('/api/v1/colleges/leaderboard', token),
    ]);
    expect(anon.status).toBe(200);
    expect(authed.status).toBe(200);
    expect(await anon.json()).toEqual(await authed.json());
  });
});

// ── the auth gate still guards everything else ─────────────────────

describe('widening the college funnel did not open anything else', () => {
  it('anonymous /me routes stay 401', async () => {
    const res = await get('/api/v1/notifications');
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');
  });

  it('anonymous role-guarded admin routes stay 401', async () => {
    const res = await get('/api/v1/admin/students');
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');
  });

  it('no college query runs for the still-guarded routes', async () => {
    await get('/api/v1/notifications');
    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
    expect(prisma.faculty.findUnique).not.toHaveBeenCalled();
  });
});

// ── r179 (phase-5): institution-aware public colleges surfaces ─────

describe('GET /api/v1/colleges(+/leaderboard) — institution-aware listing (r179)', () => {
  it('the anonymous default resolves the SHOWCASE institution and filters faculties by it', async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([] as never);
    await get('/api/v1/colleges');
    // The target institution row resolved by slug (the showcase default)…
    expect(prisma.institution.findUnique).toHaveBeenCalledWith({
      where: { slug: 'madarek-demo' },
      select: { id: true, status: true },
    });
    // …and the faculty listing is scoped to the resolved institution id.
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: 'inst-showcase' } }),
    );
  });

  it('?institution=slug wins: the target resolves by that slug', async () => {
    vi.mocked(prisma.institution.findUnique).mockResolvedValue({
      id: 'inst-alandalus',
      status: 'ACTIVE',
    } as never);
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([] as never);
    await get('/api/v1/colleges?institution=alandalus-demo');
    expect(prisma.institution.findUnique).toHaveBeenCalledWith({
      where: { slug: 'alandalus-demo' },
      select: { id: true, status: true },
    });
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: 'inst-alandalus' } }),
    );
  });

  it('an authed caller WITH an institution context gets THEIR institution (not the showcase)', async () => {
    vi.mocked(prisma.institution.findUnique).mockResolvedValue({
      id: 'inst-mine',
      status: 'ACTIVE',
    } as never);
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([] as never);
    const token = signAccessToken('stu-9', 'STUDENT', 'inst-mine');
    await get('/api/v1/colleges', token);
    expect(prisma.institution.findUnique).toHaveBeenCalledWith({
      where: { id: 'inst-mine' },
      select: { id: true, status: true },
    });
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: 'inst-mine' } }),
    );
  });

  it('an UNKNOWN explicit ?institution= slug is a 404 (fail closed)', async () => {
    vi.mocked(prisma.institution.findUnique).mockResolvedValue(null as never);
    const res = await get('/api/v1/colleges?institution=nope');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('a SUSPENDED explicit target is a 404; the implicit showcase default degrades to the empty listing', async () => {
    vi.mocked(prisma.institution.findUnique).mockResolvedValue({
      id: 'inst-suspended',
      status: 'SUSPENDED',
    } as never);
    const suspended = await get('/api/v1/colleges?institution=suspended-inst');
    expect(suspended.status).toBe(404);

    vi.mocked(prisma.institution.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([] as never);
    const degraded = await get('/api/v1/colleges');
    expect(degraded.status).toBe(200);
    expect(((await degraded.json()) as { data: unknown[] }).data).toEqual([]);
    // No faculty query ran — the empty listing is the graceful default.
    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
  });

  it('the leaderboard resolves the SAME target and scopes its faculty set', async () => {
    mockLeaderboardBundle();
    await get('/api/v1/colleges/leaderboard');
    expect(prisma.institution.findUnique).toHaveBeenCalledWith({
      where: { slug: 'madarek-demo' },
      select: { id: true, status: true },
    });
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: 'inst-showcase' } }),
    );
  });
});

describe('GET /api/v1/colleges/:id — bundle scoped to the faculty\'s institution (r179)', () => {
  it('the bundle\'s events and competitions filter by the faculty\'s institutionId', async () => {
    mockDetailBundle();
    await get(`/api/v1/colleges/${FACULTY_ID}`);
    expect(prisma.campusEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ institutionId: 'inst-showcase' }) }),
    );
    expect(prisma.competition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ institutionId: 'inst-showcase' }) }),
    );
  });
});
