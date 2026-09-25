/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/colleges.routes.ts` (audit 11-c P1-6).
 *
 * The inter-college leaderboard moved from 7 queries per faculty
 * (~176 per request on the 25-college registry) to ONE aggregate per
 * metric (groupBy) folded onto faculty ids in memory. These tests lock
 * the fold semantics the rewrite must preserve exactly:
 *  - counts sum across every key that resolves to the same faculty,
 *  - keys that cannot be attributed (paper without an offering, lab
 *    session by a non-student, …) count toward NO faculty,
 *  - faculties missing from a rollup default to 0,
 *  - Decimal/null aggregates normalize to plain numbers,
 *  - the wire row keeps the exact field set the frontend table renders.
 *
 * DB-free: the helpers are pure. The route's Prisma queries themselves
 * need a DB harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import {
  buildLeaderboardRow,
  normalizeStudentAggregate,
  rollupCounts,
} from '../../src/http/routes/colleges.routes';

// ── rollupCounts ───────────────────────────────────────────────────

describe('rollupCounts (groupBy results → per-faculty totals)', () => {
  it('sums every key that resolves to the same faculty', () => {
    // Two departments of faculty A, one of faculty B.
    const deptToFaculty = new Map([
      ['dept-a1', 'faculty-a'],
      ['dept-a2', 'faculty-a'],
      ['dept-b1', 'faculty-b'],
    ]);
    const teachersByDept = new Map([['dept-a1', 3], ['dept-a2', 4], ['dept-b1', 5]]);
    expect(
      rollupCounts(teachersByDept, (deptId) => deptToFaculty.get(deptId)),
    ).toEqual(new Map([['faculty-a', 7], ['faculty-b', 5]]));
  });

  it('drops keys the resolver cannot attribute (they belong to no college)', () => {
    // Papers keyed by offering; one offering is unresolvable, one paper
    // has no offering at all (null key), one resolves normally.
    const offeringToFaculty = new Map([['offering-1', 'faculty-a']]);
    const papersByOffering = new Map<string | null, number>([
      ['offering-1', 2],
      ['offering-unknown', 9], // offering row absent (not in any faculty)
      [null, 11], // research paper without an offering
    ]);
    expect(
      rollupCounts(papersByOffering, (offeringId) =>
        offeringId === null ? undefined : offeringToFaculty.get(offeringId),
      ),
    ).toEqual(new Map([['faculty-a', 2]]));
  });

  it('drops non-student users when rolling user-keyed counts up to faculties', () => {
    // The lab-session fold: a user without a student profile (null) and a
    // user missing from the resolution map count toward nothing.
    const userToFaculty = new Map([
      ['user-student', 'faculty-a'],
      ['user-teacher', null],
    ]);
    const labsByUser = new Map([['user-student', 4], ['user-teacher', 6], ['user-ghost', 7]]);
    expect(
      rollupCounts(labsByUser, (userId) => userToFaculty.get(userId) ?? undefined),
    ).toEqual(new Map([['faculty-a', 4]]));
  });

  it('chains resolvers for relation-keyed metrics (template → offering dept → faculty)', () => {
    const deptToFaculty = new Map([['dept-a', 'faculty-a']]);
    const templateToDept = new Map([
      ['tpl-with-offering', 'dept-a'],
      ['tpl-no-offering', undefined],
    ]);
    const attemptsByTemplate = new Map([['tpl-with-offering', 10], ['tpl-no-offering', 20]]);
    expect(
      rollupCounts(attemptsByTemplate, (templateId) => {
        const dept = templateToDept.get(templateId);
        return dept === undefined ? undefined : deptToFaculty.get(dept);
      }),
    ).toEqual(new Map([['faculty-a', 10]]));
  });

  it('returns an empty map for an empty rollup input', () => {
    expect(rollupCounts(new Map(), () => 'x')).toEqual(new Map());
  });
});

// ── normalizeStudentAggregate ──────────────────────────────────────

describe('normalizeStudentAggregate (group → wire numbers)', () => {
  it('normalizes a full group (Decimal-like gpa via toString)', () => {
    expect(
      normalizeStudentAggregate({
        _count: { _all: 120 },
        _sum: { totalXp: 34_500 },
        _avg: { totalXp: 287.4, gpa: { toString: () => '2.75' } },
      }),
    ).toEqual({ studentCount: 120, totalXp: 34_500, avgXp: 287, avgGpa: 2.75 });
  });

  it('rounds avgXp to the integer contract the leaderboard table renders', () => {
    const r = normalizeStudentAggregate({
      _count: { _all: 2 },
      _sum: { totalXp: 501 },
      _avg: { totalXp: 250.5, gpa: { toString: () => '3.00' } },
    });
    expect(r.avgXp).toBe(251); // Math.round, not truncate
  });

  it('collapses every null aggregate to 0 (faculty group with zero-XP students)', () => {
    expect(
      normalizeStudentAggregate({
        _count: { _all: 40 },
        _sum: { totalXp: null },
        _avg: { totalXp: null, gpa: null },
      }),
    ).toEqual({ studentCount: 40, totalXp: 0, avgXp: 0, avgGpa: 0 });
  });

  it('keeps a decimal 0.00 gpa on the number path (Decimal instances are truthy objects)', () => {
    const r = normalizeStudentAggregate({
      _count: { _all: 3 },
      _sum: { totalXp: 0 },
      _avg: { totalXp: 0, gpa: { toString: () => '0.00' } },
    });
    expect(r.avgGpa).toBe(0);
    expect(r.totalXp).toBe(0);
  });
});

// ── buildLeaderboardRow ────────────────────────────────────────────

describe('buildLeaderboardRow (wire shape + zero defaults)', () => {
  const faculty = { id: 'f1', name: 'كلية الهندسة', iconEmoji: '🏗️', city: 'الزاوية' };

  it('emits the exact field set the frontend LeaderboardCollege type consumes', () => {
    const row = buildLeaderboardRow(faculty, {
      students: { studentCount: 90, totalXp: 12_000, avgXp: 133, avgGpa: 2.9 },
      teacherCount: 12,
      publishedPapers: 7,
      examAttempts: 340,
      labSessions: 56,
      completedEnrollments: 23,
    });
    expect(Object.keys(row)).toEqual([
      'id', 'name', 'iconEmoji', 'city',
      'studentCount', 'teacherCount',
      'totalXp', 'avgXp', 'avgGpa',
      'publishedPapers', 'examAttempts', 'labSessions', 'completedEnrollments',
    ]);
    expect(row).toEqual({
      id: 'f1', name: 'كلية الهندسة', iconEmoji: '🏗️', city: 'الزاوية',
      studentCount: 90, teacherCount: 12,
      totalXp: 12_000, avgXp: 133, avgGpa: 2.9,
      publishedPapers: 7, examAttempts: 340, labSessions: 56, completedEnrollments: 23,
    });
  });

  it('defaults every missing metric to 0 — a faculty absent from all rollups', () => {
    // Empty college: the N+1 version's per-faculty count() calls returned
    // 0s; the rollup version returns "no entry" — the row must be identical.
    expect(
      buildLeaderboardRow({ id: 'f2', name: 'كلية جديدة', iconEmoji: null, city: 'صبراتة' }, {
        students: undefined,
        teacherCount: undefined,
        publishedPapers: undefined,
        examAttempts: undefined,
        labSessions: undefined,
        completedEnrollments: undefined,
      }),
    ).toEqual({
      id: 'f2', name: 'كلية جديدة', iconEmoji: null, city: 'صبراتة',
      studentCount: 0, teacherCount: 0,
      totalXp: 0, avgXp: 0, avgGpa: 0,
      publishedPapers: 0, examAttempts: 0, labSessions: 0, completedEnrollments: 0,
    });
  });

  it('mixes present and missing metrics without leakage between faculties', () => {
    const row = buildLeaderboardRow(faculty, {
      students: { studentCount: 5, totalXp: 100, avgXp: 20, avgGpa: 1.5 },
      teacherCount: 2,
      publishedPapers: undefined,
      examAttempts: 4,
      labSessions: undefined,
      completedEnrollments: undefined,
    });
    expect(row.studentCount).toBe(5);
    expect(row.teacherCount).toBe(2);
    expect(row.publishedPapers).toBe(0);
    expect(row.examAttempts).toBe(4);
    expect(row.labSessions).toBe(0);
    expect(row.completedEnrollments).toBe(0);
  });
});
