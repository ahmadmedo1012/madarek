/**
 * Backend unit test — pure logic from the dashboard route pair
 * `backend/src/http/routes/teacher-dashboard.routes.ts` +
 * `backend/src/http/routes/student-dashboard.routes.ts`
 * (audit 11-d §12-D, wave 13-6; rollup suite added 15-i TOP-2, wave 16).
 *
 * DB-free, mirroring tests/modules/learning-logic.test.ts:
 *  · currentTerm — academic-calendar windows, including the P2-1 off-cycle
 *    fix (summer reports the just-finished SPRING, not last year's FALL).
 *  · attendancePctFromStatusCounts — the canonical attendance formula
 *    (P1-5/P2-2): LATE earns half credit, EXCUSED is excluded from the
 *    denominator, null when nothing is countable. Both route files' copies
 *    run the same table so the unification cannot drift.
 *  · avgGradePctFromGroups — the groupBy rollup must reproduce the
 *    per-submission average it replaced (P1-11) and skip maxScore ≤ 0.
 *  · rollupCourseGrades + resultsHeadline — the /me/results weighted
 *    rollup, the student transcript (15-i TOP-2): weight normalization,
 *    submission-only courses, the Prisma-Decimal toString() path, the
 *    maxScore-0 fold, null-gradePct exclusion, nulls-last sort.
 *
 * Integration coverage (auth gate, ownership, query shapes, feed assembly)
 * needs a DB harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import { AttendanceStatus, Prisma } from '@prisma/client';
import {
  attendancePctFromStatusCounts as teacherAttendancePct,
  avgGradePctFromGroups,
} from '../../src/http/routes/teacher-dashboard.routes';
import {
  attendancePctFromStatusCounts as studentAttendancePct,
  currentTerm,
  rollupCourseGrades,
  resultsHeadline,
  type GradeRollupRow,
  type GradedSubmissionRollupRow,
} from '../../src/http/routes/student-dashboard.routes';

const count = (status: AttendanceStatus, n: number) => ({ status, count: n });

describe('currentTerm (audit 11-d P2-1 — off-cycle windows)', () => {
  it('maps each calendar window to its term code', () => {
    expect(currentTerm(new Date(2025, 8, 10))).toMatchObject({ code: '2025-FALL' });   // fall opens
    expect(currentTerm(new Date(2025, 11, 20))).toMatchObject({ code: '2025-FALL' });  // late fall (fall spans the year boundary)
    expect(currentTerm(new Date(2026, 0, 5))).toMatchObject({ code: '2025-FALL' });    // winter break → the fall that just ended
    expect(currentTerm(new Date(2026, 1, 5))).toMatchObject({ code: '2026-SPRING' });  // spring opens
    expect(currentTerm(new Date(2026, 4, 30))).toMatchObject({ code: '2026-SPRING' }); // mid-spring
    expect(currentTerm(new Date(2026, 5, 15))).toMatchObject({ code: '2026-SPRING' }); // spring closes
    expect(currentTerm(new Date(2026, 5, 16))).toMatchObject({ code: '2026-SPRING' }); // summer → just-finished spring (the P2-1 fix)
    expect(currentTerm(new Date(2026, 8, 9))).toMatchObject({ code: '2026-SPRING' });  // last day before fall
    expect(currentTerm(new Date(2026, 8, 10))).toMatchObject({ code: '2026-FALL' });   // new fall opens
  });

  it('anchors the off-cycle fall window to the real previous-fall dates', () => {
    const t = currentTerm(new Date(2026, 0, 5));
    expect(t.startsAt).toEqual(new Date(2025, 8, 10));
    expect(t.endsAt).toEqual(new Date(2026, 0, 15));
  });

  it('anchors the summer window to the just-finished spring dates', () => {
    const t = currentTerm(new Date(2026, 7, 1));
    expect(t.code).toBe('2026-SPRING');
    expect(t.startsAt).toEqual(new Date(2026, 1, 5));
    expect(t.endsAt).toEqual(new Date(2026, 5, 15));
  });
});

describe('attendancePctFromStatusCounts (canonical formula, audit 11-d P1-5/P2-2)', () => {
  const table: Array<{
    name: string;
    counts: Array<{ status: AttendanceStatus; count: number }>;
    expected: number | null;
  }> = [
    { name: 'all present → 100', counts: [count(AttendanceStatus.PRESENT, 10)], expected: 100 },
    { name: 'late earns half credit (dashboards used to give it full credit)', counts: [count(AttendanceStatus.PRESENT, 5), count(AttendanceStatus.LATE, 5)], expected: 75 },
    { name: 'all late → 50', counts: [count(AttendanceStatus.LATE, 4)], expected: 50 },
    { name: 'all absent → 0', counts: [count(AttendanceStatus.ABSENT, 7)], expected: 0 },
    { name: 'excused excluded from the denominator (used to penalize)', counts: [count(AttendanceStatus.PRESENT, 3), count(AttendanceStatus.EXCUSED, 1)], expected: 100 },
    { name: 'excused marks do not dilute real absences', counts: [count(AttendanceStatus.PRESENT, 9), count(AttendanceStatus.ABSENT, 1), count(AttendanceStatus.EXCUSED, 5)], expected: 90 },
    { name: 'mixed roll-call', counts: [count(AttendanceStatus.PRESENT, 6), count(AttendanceStatus.LATE, 2), count(AttendanceStatus.ABSENT, 2)], expected: 70 },
    { name: 'no records → null', counts: [], expected: null },
    { name: 'only excused records → null', counts: [count(AttendanceStatus.EXCUSED, 5)], expected: null },
  ];

  // Both route files must keep semantically identical copies (the lib
  // extraction is deferred to the audit P2-20 consolidation wave).
  const copies = [
    ['teacher-dashboard', teacherAttendancePct],
    ['student-dashboard', studentAttendancePct],
  ] as const;

  for (const [label, attendancePct] of copies) {
    describe(label, () => {
      for (const row of table) {
        it(`${row.name} → ${row.expected}`, () => {
          expect(attendancePct(row.counts)).toBe(row.expected);
        });
      }
    });
  }
});

describe('avgGradePctFromGroups (groupBy rollup, audit 11-d P1-11)', () => {
  it('reproduces the per-submission average it replaced', () => {
    // Old query rows: assignment A (max 50): grades 40, 45 → 80%, 90%;
    // assignment B (max 20): grade 10 → 50%. Per-row avg = (80+90+50)/3 ≈ 73.
    const groups = [
      { assignmentId: 'A', sumGrade: 85, count: 2 }, // 85/50·100 = 170 (== 80+90)
      { assignmentId: 'B', sumGrade: 10, count: 1 }, // 10/20·100 = 50
    ];
    const maxScores = new Map([
      ['A', 50],
      ['B', 20],
    ]);
    expect(avgGradePctFromGroups(groups, maxScores)).toBe(73);
  });

  it('weights each submission equally across assignments (as the old per-row math did)', () => {
    // Two submissions on A (50% each) + one on B (100%) → (50+50+100)/3 ≈ 67.
    const groups = [
      { assignmentId: 'A', sumGrade: 200, count: 2 }, // two 100s on max 200 → 50% each
      { assignmentId: 'B', sumGrade: 30, count: 1 },  // 30/30 → 100%
    ];
    const maxScores = new Map([
      ['A', 200],
      ['B', 30],
    ]);
    expect(avgGradePctFromGroups(groups, maxScores)).toBe(67);
  });

  it('skips assignments with maxScore ≤ 0 (old per-row filter)', () => {
    const groups = [
      { assignmentId: 'A', sumGrade: 30, count: 1 },
      { assignmentId: 'zero', sumGrade: 99, count: 3 },
    ];
    const maxScores = new Map([
      ['A', 40],
      ['zero', 0],
    ]);
    expect(avgGradePctFromGroups(groups, maxScores)).toBe(75); // only A: 30/40
  });

  it('returns null with no graded submissions', () => {
    expect(avgGradePctFromGroups([], new Map())).toBeNull();
  });

  it('returns null when every assignment has maxScore ≤ 0', () => {
    const groups = [{ assignmentId: 'z', sumGrade: 10, count: 2 }];
    expect(avgGradePctFromGroups(groups, new Map([['z', 0]]))).toBeNull();
  });
});

// ─── /me/results weighted rollup (audit 15-i TOP-2) ──────────────
// Row factories shaped like the two query results the handler passes in —
// plain numbers stand in for Prisma Decimal (the fold only calls
// toString(), and Number satisfies that), plus one real-Decimal case.
const offeringFor = (code: string) => ({
  term: '2026-SPRING',
  course: { code, name: `مقرّر ${code}`, themeColor: null },
});

const gradeRow = (args: {
  offeringId: string;
  code: string;
  kind?: string;
  score: number | Prisma.Decimal;
  maxScore: number;
  weight: number;
}): GradeRollupRow => ({
  offeringId: args.offeringId,
  kind: args.kind ?? 'HOMEWORK',
  score: args.score,
  maxScore: args.maxScore,
  weight: args.weight,
  feedback: null,
  offering: offeringFor(args.code),
});

const gradedSub = (args: {
  offeringId: string;
  code: string;
  grade: number | Prisma.Decimal | null;
  maxScore: number;
  weight: number;
}): GradedSubmissionRollupRow => ({
  grade: args.grade,
  assignment: {
    weight: args.weight,
    maxScore: args.maxScore,
    offeringId: args.offeringId,
    offering: offeringFor(args.code),
  },
});

describe('rollupCourseGrades (/me/results weighted rollup, audit 15-i TOP-2)', () => {
  it('normalizes by weight: 80%×w10 + 50%×w5 → 70', () => {
    const courses = rollupCourseGrades([
      gradeRow({ offeringId: 'o1', code: 'CS101', kind: 'MIDTERM', score: 80, maxScore: 100, weight: 10 }),
      gradeRow({ offeringId: 'o1', code: 'CS101', kind: 'PROJECT', score: 10, maxScore: 20, weight: 5 }),
    ], []);
    expect(courses).toHaveLength(1);
    expect(courses[0]?.gradePct).toBe(70); // (800 + 250) / 15
  });

  it('weightTotal 0 → gradePct null; the course still appears, sorted last', () => {
    const courses = rollupCourseGrades([
      gradeRow({ offeringId: 'zero', code: 'CS101', score: 90, maxScore: 100, weight: 0 }),
      gradeRow({ offeringId: 'real', code: 'CS102', score: 50, maxScore: 100, weight: 10 }),
    ], []);
    expect(courses.map((c) => c.offeringId)).toEqual(['real', 'zero']);
    expect(courses[0]?.gradePct).toBe(50);
    expect(courses[1]?.gradePct).toBeNull();
  });

  it('a course graded only through submissions appears (audit 11-d P1-6 fold-in)', () => {
    const courses = rollupCourseGrades([], [
      gradedSub({ offeringId: 'o9', code: 'MA201', grade: 15, maxScore: 30, weight: 20 }),
    ]);
    expect(courses).toHaveLength(1);
    expect(courses[0]).toMatchObject({ offeringId: 'o9', courseCode: 'MA201', gradePct: 50 });
    // breakdown stays Grade-table-only — submissions never enter it
    expect(courses[0]?.breakdown).toEqual([]);
  });

  it('merges Grade rows and graded submissions for the same offering under one arithmetic', () => {
    // 80%×w10 (Grade row) + 100%×w10 (submission) → (800 + 1000) / 20 = 90
    const courses = rollupCourseGrades(
      [gradeRow({ offeringId: 'o1', code: 'CS101', score: 80, maxScore: 100, weight: 10 })],
      [gradedSub({ offeringId: 'o1', code: 'CS101', grade: 50, maxScore: 50, weight: 10 })],
    );
    expect(courses[0]?.gradePct).toBe(90);
    expect(courses[0]?.breakdown).toHaveLength(1); // only the Grade row
  });

  it('reads scores through the Prisma Decimal toString() path', () => {
    const courses = rollupCourseGrades([
      gradeRow({ offeringId: 'o1', code: 'CS101', score: new Prisma.Decimal('17.5'), maxScore: 20, weight: 10 }),
    ], []);
    expect(courses[0]?.gradePct).toBe(88); // 17.5/20 = 87.5 → Math.round
    expect(courses[0]?.breakdown[0]?.score).toBe(17.5);
  });

  it('pins the maxScore-0 fold: 0 pct contribution, weight still counted', () => {
    // 100%×w10 + a maxScore-0 artifact ×w10 → 1000/20 = 50. The guard
    // keeps score/0 (Infinity) out of the fold; the row still dilutes by
    // its weight — the historical arithmetic, now pinned.
    const courses = rollupCourseGrades([
      gradeRow({ offeringId: 'o1', code: 'CS101', score: 100, maxScore: 100, weight: 10 }),
      gradeRow({ offeringId: 'o1', code: 'CS101', kind: 'QUIZ_1', score: 5, maxScore: 0, weight: 10 }),
    ], []);
    expect(courses[0]?.gradePct).toBe(50);
  });

  it('sorts by gradePct descending with null-gradePct courses last', () => {
    const courses = rollupCourseGrades([
      gradeRow({ offeringId: 'mid', code: 'CS101', score: 50, maxScore: 100, weight: 10 }),
      gradeRow({ offeringId: 'top', code: 'CS102', score: 100, maxScore: 100, weight: 10 }),
      gradeRow({ offeringId: 'empty', code: 'CS103', score: 100, maxScore: 100, weight: 0 }),
    ], []);
    expect(courses.map((c) => c.offeringId)).toEqual(['top', 'mid', 'empty']);
  });

  it('skips null-grade submissions defensively (the where already filters)', () => {
    const courses = rollupCourseGrades([], [
      gradedSub({ offeringId: 'o1', code: 'CS101', grade: null, maxScore: 100, weight: 10 }),
    ]);
    expect(courses).toEqual([]);
  });
});

describe('resultsHeadline (avg/highest/lowest exclude null-gradePct courses)', () => {
  it('computes avg/highest/lowest over graded courses only', () => {
    const courses = rollupCourseGrades([
      gradeRow({ offeringId: 'a', code: 'CS101', score: 100, maxScore: 100, weight: 10 }),
      gradeRow({ offeringId: 'b', code: 'CS102', score: 50, maxScore: 100, weight: 10 }),
      gradeRow({ offeringId: 'c', code: 'CS103', score: 100, maxScore: 100, weight: 0 }), // gradePct null
    ], []);
    expect(resultsHeadline(courses)).toEqual({
      avgGradePct: 75, // (100 + 50) / 2 — the null course never dilutes
      highest: { courseName: 'مقرّر CS101', gradePct: 100 },
      lowest: { courseName: 'مقرّر CS102', gradePct: 50 },
      courseCount: 3, // …but it is still counted as a course
    });
  });

  it('empty course list → null avg/highest/lowest, courseCount 0', () => {
    expect(resultsHeadline([])).toEqual({
      avgGradePct: null,
      highest: null,
      lowest: null,
      courseCount: 0,
    });
  });

  it('a null-gradePct-only list never produces avg/highest/lowest', () => {
    const courses = rollupCourseGrades([
      gradeRow({ offeringId: 'a', code: 'CS101', score: 100, maxScore: 100, weight: 0 }),
    ], []);
    expect(resultsHeadline(courses)).toEqual({
      avgGradePct: null,
      highest: null,
      lowest: null,
      courseCount: 1,
    });
  });
});
