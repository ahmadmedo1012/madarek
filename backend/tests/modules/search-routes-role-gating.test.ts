/**
 * Backend unit test — role gating of training-track hits in the global
 * search route `backend/src/http/routes/search.routes.ts` (r165e).
 *
 * The tracks mapping used to emit `href: /training/${slug}` for EVERY
 * role, but /training/:slug sits in the STUDENT-only allow block of
 * frontend/src/App.tsx — a TEACHER/ADMIN/QUALITY/OWNER clicking (or
 * Enter-ing) a «مسارات تدريب» row was Navigate-replaced to their own
 * dashboard by AppShell's ProtectedRoute with zero feedback (the same
 * dead-click class r155c/r156 closed for course and lecture hits).
 *
 * Two layers, both DB-free:
 *  1. the REAL app (createApp, ephemeral port — the pattern of
 *     tests/modules/enrollments-scope.test.ts) with prisma mocked and
 *     JWTs signed via signAccessToken: the four candidate scans return
 *     the SAME fixture rows for every role, and the suite pins that
 *     STUDENT — and only STUDENT — receives track rows with /training/
 *     hrefs, while the other result categories for the same query are
 *     unchanged (course href matrix, paper viewer href, r156 lecture
 *     suppression intact);
 *  2. the route's trackHitHref is DB-free testable — its pure 5-role
 *     pins live beside courseHitHref/lectureHitHref in
 *     tests/modules/visibility-logic.test.ts.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    courseOffering: { findMany: vi.fn() },
    lecture: { findMany: vi.fn() },
    researchPaper: { findMany: vi.fn() },
    trainingTrack: { findMany: vi.fn() },
  },
  // Defensive: other modules in the app graph import withRetry from db.js.
  withRetry: vi.fn(),
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

// ── Fixtures ─────────────────────────────────────────────────────────
// One row per result family, all matching the same query «شبكات» —
// returned identically to every role (the DB scans are role-agnostic;
// only the href mapping gates).
const QUERY = 'شبكات';
const PATH = `/search/global?q=${encodeURIComponent(QUERY)}`;

const offeringFindMany = vi.mocked(prisma.courseOffering.findMany);
const lectureFindMany = vi.mocked(prisma.lecture.findMany);
const paperFindMany = vi.mocked(prisma.researchPaper.findMany);
const trackFindMany = vi.mocked(prisma.trainingTrack.findMany);

beforeEach(() => {
  vi.clearAllMocks();
  offeringFindMany.mockResolvedValue([
    {
      id: 'off_1',
      term: 'خريف 2025',
      course: { name: 'أساسيات الشبكات', code: 'CS101', iconEmoji: '🌐', themeColor: '#0ea5e9' },
    },
  ] as never);
  lectureFindMany.mockResolvedValue([
    {
      id: 'lec_1',
      title: 'مقدمة في الشبكات',
      description: null,
      ordinal: 1,
      offering: { id: 'off_1', course: { name: 'أساسيات الشبكات', iconEmoji: '🌐' } },
    },
  ] as never);
  paperFindMany.mockResolvedValue([
    {
      id: 'paper_1',
      title: 'أمن الشبكات',
      abstract: null,
      fileUrl: 'https://files.example.com/papers/network-security.pdf',
      student: { firstName: 'أحمد', lastName: 'المبروك' },
    },
  ] as never);
  trackFindMany.mockResolvedValue([
    {
      id: 'track_1',
      slug: 'network-fundamentals',
      title: 'مسار الشبكات',
      titleEn: 'Network Fundamentals',
      summary: 'مسار تدريبي في أساسيات الشبكات',
      iconEmoji: '🛰️',
      themeColor: '#6366f1',
      order: 1,
      isPublished: true,
    },
  ] as never);
});

const get = (userId: string, role: Role) =>
  fetch(`${baseUrl}/api/v1${PATH}`, {
    headers: { authorization: `Bearer ${signAccessToken(userId, role, null)}` },
  });

type SearchBody = {
  data: {
    courses: Array<{ id: string; href: string }>;
    lectures: Array<{ id: string; href: string }>;
    papers: Array<{ id: string; href: string }>;
    tracks: Array<{ id: string; slug: string; href: string }>;
  };
};

const search = async (userId: string, role: Role): Promise<SearchBody['data']> => {
  const res = await get(userId, role);
  expect(res.status).toBe(200);
  const json = (await res.json()) as SearchBody;
  return json.data;
};

// ── Training-track hits: STUDENT keeps them, everyone else gets none ──

describe('GET /api/v1/search/global — training-track hits (r165e role gating)', () => {
  it('STUDENT gets the track row with a /training/ href (the catalog page they can open)', async () => {
    const data = await search('student_1', Role.STUDENT);
    expect(data.tracks).toHaveLength(1);
    expect(data.tracks[0]).toMatchObject({
      id: 'track_1',
      slug: 'network-fundamentals',
      title: 'مسار الشبكات',
      href: '/training/network-fundamentals',
    });
  });

  it('TEACHER gets ZERO track rows for the same query (the old href would silently bounce them home)', async () => {
    const data = await search('teacher_1', Role.TEACHER);
    expect(data.tracks).toEqual([]);
    // The candidate scan itself is role-agnostic — gating happens at
    // mapping time, exactly like the r156 lecture suppression.
    expect(trackFindMany).toHaveBeenCalledTimes(1);
  });

  it.each([Role.ADMIN, Role.QUALITY, Role.OWNER] as const)(
    '%s gets ZERO track rows for the same query',
    async (role) => {
      const data = await search(`${role.toLowerCase()}_1`, role);
      expect(data.tracks).toEqual([]);
    },
  );
});

// ── The other result categories are unchanged for the same query ────

describe('GET /api/v1/search/global — other categories unchanged (r165e scope pin)', () => {
  it('STUDENT: courses/lectures/papers keep their pre-r165e hrefs', async () => {
    const data = await search('student_1', Role.STUDENT);
    expect(data.courses).toEqual([
      expect.objectContaining({ id: 'off_1', href: '/student/courses/off_1' }),
    ]);
    expect(data.lectures).toEqual([
      expect.objectContaining({ id: 'lec_1', href: '/student/lectures/lec_1' }),
    ]);
    expect(data.papers).toEqual([
      expect.objectContaining({
        id: 'paper_1',
        href: '/document/network-security.pdf?paper=paper_1',
      }),
    ]);
  });

  it('TEACHER: course/lecture deep links + paper viewer href byte-identical', async () => {
    const data = await search('teacher_1', Role.TEACHER);
    expect(data.courses).toEqual([
      expect.objectContaining({ id: 'off_1', href: '/teacher/intelligence/off_1' }),
    ]);
    expect(data.lectures).toEqual([
      expect.objectContaining({ id: 'lec_1', href: '/teacher/intelligence/off_1' }),
    ]);
    expect(data.papers).toEqual([
      expect.objectContaining({
        id: 'paper_1',
        href: '/document/network-security.pdf?paper=paper_1',
      }),
    ]);
  });

  it('QUALITY: course oversight surface + paper viewer, lectures still suppressed (r156 intact)', async () => {
    const data = await search('quality_1', Role.QUALITY);
    expect(data.courses).toEqual([
      expect.objectContaining({ id: 'off_1', href: '/quality/courses' }),
    ]);
    expect(data.lectures).toEqual([]);
    expect(data.papers).toEqual([
      expect.objectContaining({
        id: 'paper_1',
        href: '/document/network-security.pdf?paper=paper_1',
      }),
    ]);
  });
});
