/**
 * Backend unit test — pure logic from the dashboard route pair
 * `backend/src/http/routes/teacher-dashboard.routes.ts` +
 * `backend/src/http/routes/student-dashboard.routes.ts`
 * (audit 11-d §12-D, wave 13-6).
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
 *
 * Integration coverage (auth gate, ownership, query shapes, feed assembly)
 * needs a DB harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import { AttendanceStatus } from '@prisma/client';
import {
  attendancePctFromStatusCounts as teacherAttendancePct,
  avgGradePctFromGroups,
} from '../../src/http/routes/teacher-dashboard.routes';
import {
  attendancePctFromStatusCounts as studentAttendancePct,
  currentTerm,
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
