/**
 * R350 S3 — the discovery engine's EIGHT new record kinds, pinned
 * through the REAL app (mocked prisma, real JWTs):
 *
 *  · the default envelope carries all fifteen categories;
 *  · a STUDENT query: lectures/materials/papers/tracks/books/jobs/
 *    events ride their href matrix, and the question bank is EMPTY
 *    (the scope nulls the whole category — the staff-only law);
 *  · a TEACHER query: the approved question bank answers with the
 *    120-char prompt clip + the /teacher/exams href;
 *  · expired jobs never surface (the unexpired filter).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p = {
    user: { findMany: vi.fn(async () => []) },
    institution: { findMany: vi.fn(async () => []) },
    faculty: { findMany: vi.fn(async () => []) },
    department: { findMany: vi.fn(async () => []) },
    courseOffering: { findMany: vi.fn(async () => []) },
    announcement: { findMany: vi.fn(async () => []) },
    lecture: { findMany: vi.fn(async () => []) },
    material: { findMany: vi.fn(async () => []) },
    researchPaper: { findMany: vi.fn(async () => []) },
    trainingTrack: { findMany: vi.fn(async () => []) },
    book: { findMany: vi.fn(async () => []) },
    job: { findMany: vi.fn(async () => []) },
    campusEvent: { findMany: vi.fn(async () => []) },
    question: { findMany: vi.fn(async () => []) },
    enrollment: { findMany: vi.fn(async () => []) },
    studentProfile: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) },
    teacherProfile: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) },
    membership: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => ({ id: 'm-1', institutionId: 'inst-1', isActive: true })) },
  };
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { prisma } from '../../src/db.js';

let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let baseUrl: string;

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const mocked = prisma as unknown as {
  lecture: { findMany: ReturnType<typeof vi.fn> };
  material: { findMany: ReturnType<typeof vi.fn> };
  researchPaper: { findMany: ReturnType<typeof vi.fn> };
  trainingTrack: { findMany: ReturnType<typeof vi.fn> };
  book: { findMany: ReturnType<typeof vi.fn> };
  job: { findMany: ReturnType<typeof vi.fn> };
  campusEvent: { findMany: ReturnType<typeof vi.fn> };
  question: { findMany: ReturnType<typeof vi.fn> };
  enrollment: { findMany: ReturnType<typeof vi.fn> };
  faculty: { findMany: ReturnType<typeof vi.fn> };
};

const INST = 'inst-1';

beforeEach(() => {
  vi.clearAllMocks();
});

const get = (path: string, userId: string, role: Role) =>
  fetch(`${baseUrl}/api/v1${path}`, {
    headers: { authorization: `Bearer ${signAccessToken(userId, role, INST)}` },
  });

type DiscoverBody = {
  data: {
    categories: Record<string, { items: { id: string; kind: string; titleAr: string; href: string | null }[]; total: number }>;
    tookMs: number;
  };
};

async function discover(userId: string, role: Role, q = 'شبكات'): Promise<DiscoverBody['data']> {
  const res = await get(`/search/discover?q=${encodeURIComponent(q)}`, userId, role);
  expect(res.status).toBe(200);
  return ((await res.json()) as DiscoverBody).data;
}

describe('R350 S3 — GET /search/discover: the new record kinds', () => {
  it('the default envelope carries all fifteen categories', async () => {
    const data = await discover('admin_1', Role.ADMIN);
    expect(Object.keys(data.categories).sort()).toEqual([
      'announcements', 'books', 'courses', 'departments', 'events',
      'faculties', 'institutions', 'jobs', 'lectures', 'materials',
      'papers', 'questions', 'students', 'teachers', 'tracks',
    ].sort());
  });

  it('STUDENT: the new kinds ride their href matrix; the question bank is EMPTY (the staff-only law)', async () => {
    mocked.lecture.findMany.mockResolvedValue([{ id: 'lec_1', offeringId: 'off_1', title: 'مقدمة في الشبكات' }]);
    mocked.material.findMany.mockResolvedValue([{ id: 'mat_1', offeringId: 'off_1', name: 'ملف الشبكات' }]);
    mocked.researchPaper.findMany.mockResolvedValue([{ id: 'paper_1', title: 'أمن الشبكات', fileUrl: 'https://f.example.com/papers/net-sec.pdf' }]);
    mocked.trainingTrack.findMany.mockResolvedValue([{ id: 'track_1', slug: 'net', title: 'مسار الشبكات', titleEn: 'Networking' }]);
    mocked.book.findMany.mockResolvedValue([{ id: 'book_1', title: 'كتاب الشبكات', author: 'مؤلف' }]);
    mocked.job.findMany.mockResolvedValue([{ id: 'job_1', title: 'مهندس شبكات', company: 'شركة' }]);
    mocked.campusEvent.findMany.mockResolvedValue([{ id: 'ev_1', title: 'ملتقى الشبكات', location: 'قاعة كبرى' }]);
    mocked.question.findMany.mockResolvedValue([{ id: 'q_1', prompt: 'ما هي الشبكات؟', category: { title: 'أساسيات' } }]);

    const data = await discover('student_1', Role.STUDENT);
    expect(data.categories.lectures!.items).toHaveLength(1);
    expect(data.categories.lectures!.items[0]).toMatchObject({ kind: 'lecture', href: '/student/lectures/lec_1' });
    expect(data.categories.materials!.items[0]).toMatchObject({ kind: 'material', href: '/student/courses/off_1' });
    expect(data.categories.papers!.items[0]).toMatchObject({
      kind: 'paper',
      href: '/document/net-sec.pdf?paper=paper_1',
    });
    expect(data.categories.tracks!.items[0]).toMatchObject({ kind: 'track', href: '/training/net' });
    expect(data.categories.books!.items[0]).toMatchObject({ kind: 'book', href: '/student/library' });
    expect(data.categories.jobs!.items[0]).toMatchObject({ kind: 'job', href: '/student/jobs' });
    expect(data.categories.events!.items[0]).toMatchObject({ kind: 'event', href: '/community' });
    // THE LAW: a student NEVER sees the question bank — the scope
    // nulls the category, the scan never runs, the envelope is empty.
    expect(data.categories.questions!.items).toHaveLength(0);
    expect(mocked.question.findMany).not.toHaveBeenCalled();
  });

  it('TEACHER: the approved question bank answers (the 120-char clip + the bank href)', async () => {
    const longPrompt = 'شبكات ' + 'ما '.repeat(100); // >120 chars AND matches the query — must clip to 120 + …
    mocked.question.findMany.mockResolvedValue([{ id: 'q_1', prompt: longPrompt, category: { title: 'أساسيات' } }]);
    mocked.enrollment.findMany.mockResolvedValue([]);
    mocked.faculty.findMany.mockResolvedValue([]);

    const data = await discover('teacher_1', Role.TEACHER);
    expect(data.categories.questions!.items).toHaveLength(1);
    const q = data.categories.questions!.items[0]!;
    expect(q.kind).toBe('question');
    expect(q.href).toBe('/teacher/exams');
    expect(q.titleAr.length).toBe(121); // 120 + the ellipsis char
    expect(q.titleAr.endsWith('…')).toBe(true);
  });

  it('expired jobs never surface (the unexpired filter rides the scan where)', async () => {
    mocked.job.findMany.mockImplementation(async (args: { where?: { AND?: unknown[] } }) => {
      // pin the shape: the scan's AND carries the expiry OR clause
      const and = (args as { where?: { AND?: Record<string, unknown>[] } }).where?.AND ?? [];
      const hasExpiry = JSON.stringify(and).includes('expiresAt');
      expect(hasExpiry).toBe(true);
      return [{ id: 'job_1', title: 'مهندس شبكات', company: 'شركة' }];
    });
    const data = await discover('admin_1', Role.ADMIN);
    expect(data.categories.jobs!.items).toHaveLength(1);
  });
});
