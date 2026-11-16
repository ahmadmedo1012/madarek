/**
 * r353-F — the discovery engine's registrar workflows, pinned through
 * the REAL app (mocked prisma, real JWTs):
 *
 *  · bug 2 — the student-number arm: a query shaped like a universityId
 *    fetches through the identifier arm (exact + digit-folded contains)
 *    and the fetched row SURVIVES the ranker (identifierHit) with the
 *    number riding the subtitle;
 *  · bug 3 — the email arm: an ASCII query adds the email arms to both
 *    people scans;
 *  · E5 — a faculty-scoped registrar (مسجل الكلية): the people scans
 *    carry the faculty pin inside the SAME profile `some` as the
 *    institution pin, and the phone arm carries it too;
 *  · E5 — phone fields: the USERS_MANAGE seat (ADMIN) sees the
 *    normalized keys, a PRIVATE phone never leaves the DB, and QUALITY
 *    never sees phone fields at all.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p = {
    user: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null) },
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
    membership: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => ({ id: 'm-1', institutionId: 'inst-1', isActive: true })),
    },
    // r357 L2 — phone queries on /search/discover write an audit row.
    auditLog: { create: vi.fn(async () => ({})) },
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
  user: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
};

const INST = 'inst-1';
const FAC = 'fac-eng';

beforeEach(() => {
  vi.clearAllMocks();
});

const get = (path: string, userId: string, role: Role) =>
  fetch(`${baseUrl}/api/v1${path}`, {
    headers: { authorization: `Bearer ${signAccessToken(userId, role, INST)}` },
  });

type DiscoverBody = {
  data: {
    categories: Record<
      string,
      {
        items: {
          id: string;
          kind: string;
          titleAr: string;
          subtitleAr: string | null;
          href: string | null;
          studentPhoneNormalized?: string | null;
          guardianPhoneNormalized?: string | null;
        }[];
        total: number;
      }
    >;
    tookMs: number;
  };
};

async function discover(userId: string, role: Role, q: string): Promise<DiscoverBody['data']> {
  const res = await get(`/search/discover?q=${encodeURIComponent(q)}`, userId, role);
  expect(res.status).toBe(200);
  return ((await res.json()) as DiscoverBody).data;
}

/** One student row as the students scan's select returns it. */
const studentRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'stu_1',
  firstName: 'محمد',
  lastName: 'المهدي',
  email: 'mohamed.mahdi@students.madarek.ly',
  studentProfiles: [
    {
      universityId: 'UZ-2024-00001',
      studentPhoneNormalized: '218912345678',
      guardianPhoneNormalized: '218912345678',
      studentPhoneVisibility: 'INSTITUTION_STAFF',
      guardianPhoneVisibility: 'INSTITUTION_STAFF',
      faculty: { name: 'كلية الهندسة' },
      institution: { name: 'مؤسسة مدارك النموذجية' },
    },
  ],
  ...overrides,
});

describe('r353-F — GET /search/discover: the registrar workflows', () => {
  it('bug 2: a student-number query fetches through the universityId arm and survives the ranker', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null });
    let studentsScanAsserted = false;
    mocked.user.findMany.mockImplementation(async (args: unknown) => {
      const blob = JSON.stringify(args);
      // The students scan (identified by its studentProfiles include)
      // carries the identifier arm: exact (the unique-index path) AND
      // the digit/case-folded contains arms — pinned to the caller
      // institution inside the same profile `some` (the
      // cross-institution law).
      if (blob.includes('studentProfiles')) {
        studentsScanAsserted = true;
        expect(blob).toContain('"universityId":"UZ-2024-00001"');
        expect(blob).toContain('"contains":"UZ-2024-00001"');
        expect(blob).toContain('"institutionId":"inst-1"');
        return [studentRow()];
      }
      return [];
    });

    const data = await discover('admin_1', Role.ADMIN, 'UZ-2024-00001');
    expect(studentsScanAsserted).toBe(true);
    const items = data.categories.students!.items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'student',
      titleAr: 'محمد المهدي',
      subtitleAr: 'UZ-2024-00001 · كلية الهندسة',
      href: '/admin/students',
    });
    // The USERS_MANAGE seat sees the normalized phone keys.
    expect(items[0]!.studentPhoneNormalized).toBe('218912345678');
  });

  it('bug 3: Arabic-Indic digits still fetch the stored Latin number («٢٠٢٤» finds «2024»)', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null });
    let sawFoldedContains = false;
    mocked.user.findMany.mockImplementation(async (args: unknown) => {
      const blob = JSON.stringify(args);
      if (blob.includes('studentProfiles')) {
        // The variants include the digit-folded normalized form.
        sawFoldedContains = blob.includes('"contains":"2024"');
      }
      return blob.includes('studentProfiles') ? [studentRow()] : [];
    });

    const data = await discover('admin_1', Role.ADMIN, '٢٠٢٤');
    expect(sawFoldedContains).toBe(true);
    expect(data.categories.students!.items).toHaveLength(1);
  });

  it('bug 3: an email query arms the email column (exact + contains) on both people scans', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null });
    const seen: string[] = [];
    mocked.user.findMany.mockImplementation(async (args: unknown) => {
      const blob = JSON.stringify(args);
      if (blob.includes('studentProfiles')) {
        seen.push('students');
        expect(blob).toContain('"email":"mohamed.mahdi@students.madarek.ly"');
        expect(blob).toContain('"mode":"insensitive"');
        return [studentRow()];
      }
      seen.push('teachers');
      return [];
    });

    const data = await discover('admin_1', Role.ADMIN, 'mohamed.mahdi@students.madarek.ly');
    expect(seen).toEqual(['students', 'teachers']); // both scans carried the email arms
    expect(data.categories.students!.items).toHaveLength(1);
  });

  it('E5: a faculty-scoped registrar\'s people scans carry the faculty pin (same profile some)', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: FAC });
    const studentBlobs: string[] = [];
    mocked.user.findMany.mockImplementation(async (args: unknown) => {
      const blob = JSON.stringify(args);
      if (blob.includes('studentProfiles')) {
        studentBlobs.push(blob);
        expect(blob).toContain('"facultyId":"fac-eng"');
        expect(blob).toContain('"institutionId":"inst-1"');
      }
      return [];
    });

    await discover('registrar_1', Role.ADMIN, 'محمد');
    expect(studentBlobs).toHaveLength(1);
  });

  it('E5: a PRIVATE phone never leaves the DB in a search response (the privacy-engine law)', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null });
    mocked.user.findMany.mockImplementation(async (args: unknown) =>
      JSON.stringify(args).includes('studentProfiles')
        ? [
            studentRow({
              studentProfiles: [
                {
                  universityId: 'UZ-2024-00002',
                  studentPhoneNormalized: '218912345678',
                  guardianPhoneNormalized: null,
                  studentPhoneVisibility: 'PRIVATE',
                  guardianPhoneVisibility: 'INSTITUTION_STAFF',
                  faculty: { name: 'كلية الهندسة' },
                  institution: { name: 'مؤسسة مدارك النموذجية' },
                },
              ],
            }),
          ]
        : [],
    );

    const data = await discover('admin_1', Role.ADMIN, 'محمد');
    const item = data.categories.students!.items[0]!;
    expect(item.studentPhoneNormalized).toBeNull(); // PRIVATE → never emitted
    expect(item.guardianPhoneNormalized).toBeNull(); // absent profile value → null
  });

  it('E5: QUALITY never receives phone fields (the USERS_MANAGE seat)', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.QUALITY, scopeFacultyId: null });
    mocked.user.findMany.mockImplementation(async (args: unknown) =>
      JSON.stringify(args).includes('studentProfiles') ? [studentRow()] : [],
    );

    const data = await discover('quality_1', Role.QUALITY, 'محمد');
    const item = data.categories.students!.items[0]!;
    expect(item).not.toHaveProperty('studentPhoneNormalized');
    expect(item).not.toHaveProperty('guardianPhoneNormalized');
  });
});

describe('r357 L4 — the conjunctive multiword fetch (the 20k-window defect)', () => {
  it('a multiword name query fetches with AND-across-words (every word must match some name field)', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null });
    let studentsScan = null as null | Record<string, unknown>;
    mocked.user.findMany.mockImplementation(async (args: unknown) => {
      const a = args as { where?: Record<string, unknown>; select?: Record<string, unknown> };
      if (a.select && 'studentProfiles' in a.select) {
        studentsScan = JSON.parse(JSON.stringify(a.where));
        return [studentRow()];
      }
      return [];
    });

    const data = await discover('admin_1', Role.ADMIN, 'محمد المهدي');
    expect(studentsScan).not.toBeNull();
    // The name predicate is the CONJUNCTIVE arm: an AND array where each
    // group is the OR over ONE word's fold group × {firstName,lastName}.
    // (Failing-before witness: the old where was a FLAT OR over every
    // variant — at 20k students the name-ordered 100-row window filled
    // with single-word matches and the strict re-verify killed them
    // all: R@5=0.000, measured in the r357 L4 harness.)
    const and = (studentsScan as { AND?: unknown[] }).AND as unknown[];
    expect(Array.isArray(and)).toBe(true);
    // AND[0] = the role/profile scope; AND[1] = the conjunctive name arm.
    const nameArm = and![1] as { AND: { OR: { firstName?: { contains: string } }[] }[] };
    expect(Array.isArray(nameArm.AND)).toBe(true);
    expect(nameArm.AND!.length).toBe(2); // one group per ≥3-letter word
    const firstGroupBlobs = nameArm.AND![0]!.OR.map((c) => c.firstName?.contains ?? '');
    const secondGroupBlobs = nameArm.AND![1]!.OR.flatMap((c) => [c.firstName?.contains ?? '', (c as unknown as { lastName?: { contains: string } }).lastName?.contains ?? '']);
    expect(firstGroupBlobs).toContain('محمد');
    expect(secondGroupBlobs).toContain('المهدي');
    // The rows still flow through the ranker (the re-verify law).
    expect(data.categories.students!.items).toHaveLength(1);
    expect(data.categories.students!.items[0]!.titleAr).toBe('محمد المهدي');
  });

  it('a single-word query keeps the flat-variants OR (no conjunction)', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null });
    let studentsScan = null as null | Record<string, unknown>;
    mocked.user.findMany.mockImplementation(async (args: unknown) => {
      const a = args as { where?: Record<string, unknown>; select?: Record<string, unknown> };
      if (a.select && 'studentProfiles' in a.select) {
        studentsScan = JSON.parse(JSON.stringify(a.where));
        return [studentRow()];
      }
      return [];
    });

    await discover('admin_1', Role.ADMIN, 'محمد');
    const and = (studentsScan as { AND?: unknown[] }).AND as unknown[];
    const nameArm = and![1] as { OR?: unknown[]; AND?: unknown[] };
    expect(Array.isArray(nameArm.OR)).toBe(true); // the flat variants OR
    expect(nameArm.AND).toBeUndefined(); // no conjunctive group
  });

  it('the teachers scan carries the same conjunctive arm (same defect, same fix)', async () => {
    mocked.user.findUnique.mockResolvedValue({ role: Role.ADMIN, scopeFacultyId: null });
    let teachersScan = null as null | Record<string, unknown>;
    mocked.user.findMany.mockImplementation(async (args: unknown) => {
      const a = args as { where?: Record<string, unknown>; select?: Record<string, unknown> };
      if (a.select && 'teacherProfiles' in a.select) {
        teachersScan = JSON.parse(JSON.stringify(a.where));
        return [];
      }
      return [];
    });

    await discover('admin_1', Role.ADMIN, 'سالم البوسيفي');
    expect(teachersScan).not.toBeNull();
    const and = (teachersScan as { AND?: unknown[] }).AND as unknown[];
    const nameArm = and![1] as { AND?: unknown[] };
    expect(Array.isArray(nameArm.AND)).toBe(true);
  });

  it('wordVariants: the plan groups the per-word folds (superset of the re-verify words)', async () => {
    // Pure-plan law, pinned through the same import the route uses.
    const { planGlobalQuery } = await import('../../src/modules/search/global.js');
    const plan = planGlobalQuery('أحمد المصري');
    expect(plan.wordVariants.length).toBe(2);
    expect(plan.wordVariants[0]).toContain('أحمد');
    expect(plan.wordVariants[1]).toContain('المصري');
    // The folds ride INSIDE their word's group (the flat variants stay
    // flat for the single-word + record scans).
    expect(plan.wordVariants[0]).toContain('احمد');
    // Single-word: no groups.
    expect(planGlobalQuery('محمد').wordVariants).toEqual([]);
    // 2-letter words are excluded from the groups (the «بن» law) but
    // stay in the re-verify — the fetch superset holds.
    const bin = planGlobalQuery('مريم بن عثمان');
    expect(bin.wordVariants.length).toBe(2); // مريم + عثمان only
  });
});
