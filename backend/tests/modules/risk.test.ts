/**
 * Backend unit test — the shared attendance/risk model in
 * `backend/src/lib/risk.ts` (audit 11-d P2-20, wave 14-3).
 *
 * The lib consolidates the THREE implementations waves 13-5/13-6 left
 * pinned across route files (teacher.routes.ts' status-array variant +
 * the two dashboard route files' status-counts copies). This suite pins
 * the CANONICAL formula in one consolidated table, covering every case
 * the route-level suites pinned (teacher-logic.test.ts,
 * dashboard-logic.test.ts ×2 route copies):
 *
 *   pct = round(100 × (PRESENT + 0.5·LATE) / (PRESENT + LATE + ABSENT))
 *
 * · LATE earns half credit — not full (old dashboards) and not zero
 *   (old course analytics).
 * · EXCUSED is excluded from the denominator — never credits, never
 *   penalizes.
 * · The empty state is a POLICY the two wrappers own explicitly:
 *   teacher risk math → neutral 100; dashboard display → null ("—").
 *
 * Beyond attendance, the suite pins the rest of the lib's surface —
 * the risk model (assessStudentRisk: risk = 40%·attendance + 40%·grade
 * + 20%·watch, ONE neutral empty-state semantics) and the grade
 * helpers it owns. The route-level suites keep pinning their re-export
 * shims; this suite pins the lib directly.
 *
 * DB-free, mirroring tests/modules/governance.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { AttendanceStatus, Prisma } from '@prisma/client';
import {
  assessStudentRisk,
  attendancePct,
  attendancePctFromStatusCounts,
  classifyRisk,
  gradePct,
  gradePctsByStudent,
  meanPct,
  watchPctOf,
} from '../../src/lib/risk';

const { PRESENT, LATE, ABSENT, EXCUSED } = AttendanceStatus;

/** Expand roll-call counts into the status-array variant's input. */
const expand = (p: number, l: number, a: number, e: number): AttendanceStatus[] => [
  ...Array.from({ length: p }, () => PRESENT),
  ...Array.from({ length: l }, () => LATE),
  ...Array.from({ length: a }, () => ABSENT),
  ...Array.from({ length: e }, () => EXCUSED),
];

/** Build the status-counts variant's input (groupBy shape: one row per
 *  status, zero-count rows omitted). */
const toCounts = (p: number, l: number, a: number, e: number): Array<{ status: AttendanceStatus; count: number }> => {
  const rows: Array<{ status: AttendanceStatus; count: number }> = [];
  if (p > 0) rows.push({ status: PRESENT, count: p });
  if (l > 0) rows.push({ status: LATE, count: l });
  if (a > 0) rows.push({ status: ABSENT, count: a });
  if (e > 0) rows.push({ status: EXCUSED, count: e });
  return rows;
};

describe('canonical attendance formula (audit 11-d P1-5/P2-2, consolidated by P2-20)', () => {
  // Every case the three route-local suites pinned, expressed once as a
  // full roll-call (p present · l late · a absent · e excused) and run
  // through BOTH wrappers. A fully-marked roll-call gives the two
  // variants identical inputs — same marks, same denominator.
  const table: Array<{ name: string; p: number; l: number; a: number; e: number; expected: number }> = [
    { name: 'all present → 100', p: 3, l: 0, a: 0, e: 0, expected: 100 },
    { name: '3 present + 2 late of 5 → 80 (LATE earns half credit, not full, not zero)', p: 3, l: 2, a: 0, e: 0, expected: 80 },
    { name: '5 present + 5 late → 75', p: 5, l: 5, a: 0, e: 0, expected: 75 },
    { name: 'all late → 50 (the half-credit pin)', p: 0, l: 4, a: 0, e: 0, expected: 50 },
    { name: 'all absent → 0', p: 0, l: 0, a: 7, e: 0, expected: 0 },
    { name: '2 present + 2 absent + 1 late of 5 → 50', p: 2, l: 1, a: 2, e: 0, expected: 50 },
    { name: '3 present + 1 excused of 4 → 100 (EXCUSED removed from the denominator)', p: 3, l: 0, a: 0, e: 1, expected: 100 },
    { name: 'excused marks do not dilute real absences (9P + 1A + 5E → 90)', p: 9, l: 0, a: 1, e: 5, expected: 90 },
    { name: 'mixed roll-call 6P + 2L + 2A → 70', p: 6, l: 2, a: 2, e: 0, expected: 70 },
    { name: 'rounds down (1 of 3 present → 33)', p: 1, l: 0, a: 2, e: 0, expected: 33 },
    { name: 'rounds up (2 of 3 present → 67)', p: 2, l: 0, a: 1, e: 0, expected: 67 },
  ];

  describe('attendancePct (status-array variant — teacher roster/analytics/risk math)', () => {
    for (const row of table) {
      it(`${row.name} → ${row.expected}`, () => {
        expect(attendancePct(expand(row.p, row.l, row.a, row.e), row.p + row.l + row.a + row.e)).toBe(row.expected);
      });
    }
  });

  describe('attendancePctFromStatusCounts (status-counts variant — dashboard KPIs)', () => {
    for (const row of table) {
      it(`${row.name} → ${row.expected}`, () => {
        expect(attendancePctFromStatusCounts(toCounts(row.p, row.l, row.a, row.e))).toBe(row.expected);
      });
    }
  });

  it('the two wrappers agree on every fully-marked roll-call — ONE formula', () => {
    for (const row of table) {
      const fromArray = attendancePct(expand(row.p, row.l, row.a, row.e), row.p + row.l + row.a + row.e);
      const fromCounts = attendancePctFromStatusCounts(toCounts(row.p, row.l, row.a, row.e));
      expect(fromArray).toBe(fromCounts);
      expect(fromCounts).toBe(row.expected);
    }
  });
});

describe('empty-state policies (nothing countable yet)', () => {
  it('teacher risk math is neutral: empty course → 100, never mass absence', () => {
    expect(attendancePct([], 0)).toBe(100);
  });

  it('teacher risk math: every mark excused → neutral 100', () => {
    expect(attendancePct([EXCUSED, EXCUSED], 2)).toBe(100);
  });

  it('dashboard display shows an honest gap: no records → null ("—")', () => {
    expect(attendancePctFromStatusCounts([])).toBeNull();
  });

  it('dashboard display: only excused records → null', () => {
    expect(attendancePctFromStatusCounts([{ status: EXCUSED, count: 5 }])).toBeNull();
  });

  it('the SAME all-excused roll-call maps to both policies — 100 for risk math, null for display', () => {
    // One source of truth, two named conventions: the risk model must
    // not score an excused-only student as absent, and the KPI must not
    // fabricate a 100% attendance figure out of nothing.
    expect(attendancePct([EXCUSED, EXCUSED], 2)).toBe(100);
    expect(attendancePctFromStatusCounts([{ status: EXCUSED, count: 2 }])).toBeNull();
  });
});

describe('attendancePct: unmarked sessions are missed opportunities (per-student session denominator)', () => {
  it('a student marked in 3 of 5 sessions, one excused, scores over 4 — not 3', () => {
    // [P,P,E] with opportunities = the offering's 5 sessions:
    // counted = 5−1 = 4, present = 2 → 50. The two unmarked sessions
    // count against the student. The status-counts variant has no such
    // notion — it only ever sees recorded marks.
    expect(attendancePct([PRESENT, PRESENT, EXCUSED], 5)).toBe(50);
  });
});

describe('classifyRisk', () => {
  it('maps the score bands', () => {
    expect(classifyRisk(100)).toBe('OK');
    expect(classifyRisk(80)).toBe('OK');
    expect(classifyRisk(79)).toBe('WATCH');
    expect(classifyRisk(65)).toBe('WATCH');
    expect(classifyRisk(64)).toBe('AT_RISK');
    expect(classifyRisk(45)).toBe('AT_RISK');
    expect(classifyRisk(44)).toBe('CRITICAL');
    expect(classifyRisk(0)).toBe('CRITICAL');
  });
});

describe('watchPctOf', () => {
  it('is 0 when there is nothing to measure', () => {
    expect(watchPctOf(0, 0)).toBe(0);
    expect(watchPctOf(120, 0)).toBe(0);
  });

  it('computes and rounds the watched share', () => {
    expect(watchPctOf(120, 600)).toBe(20);
    expect(watchPctOf(900, 1000)).toBe(90);
    expect(watchPctOf(549, 1000)).toBe(55); // 54.9 → 55
    expect(watchPctOf(0, 600)).toBe(0); // real signal: nothing watched
  });
});

describe('gradePct', () => {
  it('computes the percentage score', () => {
    expect(gradePct(80, 100)).toBe(80);
    expect(gradePct(15, 30)).toBe(50);
    expect(gradePct(0, 100)).toBe(0); // a zero grade is a real signal
  });

  it('returns null for artifacts carrying no signal', () => {
    expect(gradePct(null, 100)).toBeNull();
    expect(gradePct(50, 0)).toBeNull(); // ÷0 guard
    expect(gradePct(50, -10)).toBeNull();
    expect(gradePct(Number.NaN, 100)).toBeNull();
    expect(gradePct(Number.POSITIVE_INFINITY, 100)).toBeNull();
  });
});

describe('meanPct', () => {
  it('is null when nothing was graded (each surface picks its empty semantics)', () => {
    expect(meanPct([])).toBeNull();
  });

  it('averages and rounds', () => {
    expect(meanPct([80])).toBe(80);
    expect(meanPct([50, 55])).toBe(53); // 52.5 → 53
    expect(meanPct([10, 20, 30])).toBe(20);
  });
});

describe('gradePctsByStudent (audit 11-d P1-6 read side)', () => {
  it('merges Grade-table rows and GRADED submissions per student', () => {
    const byStudent = gradePctsByStudent({
      grades: [{ studentId: 's1', score: 80, maxScore: 100 }],
      assignments: [{ maxScore: 50, submissions: [{ studentId: 's1', grade: 25 }] }],
    });
    expect(byStudent.get('s1')).toEqual([80, 50]);
  });

  it('assignment-only work still reaches the aggregation', () => {
    const byStudent = gradePctsByStudent({
      grades: [],
      assignments: [{ maxScore: 40, submissions: [{ studentId: 's2', grade: 30 }] }],
    });
    expect(byStudent.get('s2')).toEqual([75]);
  });

  it('skips signal-less artifacts instead of poisoning the average', () => {
    const byStudent = gradePctsByStudent({
      grades: [
        { studentId: 's1', score: 90, maxScore: 100 },
        { studentId: 's1', score: 50, maxScore: 0 }, // ÷0 artifact
      ],
      assignments: [
        {
          maxScore: 100,
          submissions: [
            { studentId: 's1', grade: null }, // graded row without a grade
            { studentId: 's1', grade: 60 },
          ],
        },
      ],
    });
    expect(byStudent.get('s1')).toEqual([90, 60]);
  });

  it('accepts Prisma.Decimal scores (the Prisma include shape)', () => {
    const byStudent = gradePctsByStudent({
      grades: [{ studentId: 's1', score: new Prisma.Decimal('17.5'), maxScore: 25 }],
      assignments: [],
    });
    expect(byStudent.get('s1')).toEqual([70]);
  });

  it('empty offering → empty map', () => {
    expect(gradePctsByStudent({ grades: [], assignments: [] }).size).toBe(0);
  });
});

describe('assessStudentRisk (audit 11-d P1-4 — unified empty-state semantics)', () => {
  it('a brand-new course student is NEUTRAL (80, OK), never CRITICAL', () => {
    // No sessions (attendance 100), nothing graded (grade factor 100),
    // no lectures at all (watch factor 0, signal silent) →
    // 0.4·100 + 0.4·100 + 0.2·0 = 80. The old /students default
    // (grade factor 0) scored this exact student 40 → CRITICAL on the
    // roster while /risks said OK.
    const r = assessStudentRisk({
      attendancePct: 100,
      watchedSec: 0,
      watchTotalSec: 0,
      gradePcts: [],
      absences: 0,
    });
    expect(r.riskScore).toBe(80);
    expect(r.riskLevel).toBe('OK');
    expect(r.watchPct).toBe(0);
    expect(r.signals).toEqual([]);
    expect(r.suggestion).toBe('الأداء مستقر — استمر في المتابعة الدورية');
  });

  it('ungraded student never gets a false low-grades signal or suggestion', () => {
    const r = assessStudentRisk({
      attendancePct: 40,
      watchedSec: 0,
      watchTotalSec: 600,
      gradePcts: [],
      absences: 1,
    });
    // 0.4·40 + 0.4·100 + 0.2·0 = 56 → AT_RISK via attendance only
    expect(r.riskScore).toBe(56);
    expect(r.riskLevel).toBe('AT_RISK');
    expect(r.signals).toEqual(['حضور منخفض', 'متابعة ضعيفة']);
    expect(r.suggestion).not.toContain('درجاته أقل');
    expect(r.suggestion).toContain('حضوره منخفض');
  });

  it('watch signal stays silent when the course has no lectures', () => {
    // Watchable content is what makes watchPct=0 a signal — a
    // lecture-less course must not tell students to open the platform.
    const r = assessStudentRisk({
      attendancePct: 100,
      watchedSec: 0,
      watchTotalSec: 0,
      gradePcts: [90],
      absences: 0,
    });
    // 0.4·100 + 0.4·90 + 0.2·0 = 76; grades ≥ 50 → no grade signal
    expect(r.riskScore).toBe(76);
    expect(r.signals).toEqual([]); // 90 ≥ 50, no lectures → silent
    expect(r.suggestion).not.toContain('يفتح المنصة');
  });

  it('real low grades drive the score and the signal', () => {
    const r = assessStudentRisk({
      attendancePct: 100,
      watchedSec: 1000,
      watchTotalSec: 1000,
      gradePcts: [40],
      absences: 0,
    });
    // 40 + 16 + 20 = 76 → WATCH
    expect(r.riskScore).toBe(76);
    expect(r.riskLevel).toBe('WATCH');
    expect(r.signals).toEqual(['درجات منخفضة']);
    expect(r.suggestion).toContain('جلسة دعم');
  });

  it('averages multiple graded artifacts', () => {
    const r = assessStudentRisk({
      attendancePct: 100,
      watchedSec: 1000,
      watchTotalSec: 1000,
      gradePcts: [60, 80],
      absences: 0,
    });
    // 40 + 0.4·70 + 20 = 88 → OK
    expect(r.riskScore).toBe(88);
    expect(r.riskLevel).toBe('OK');
  });

  it('CRITICAL remains reachable for genuinely failing students', () => {
    const r = assessStudentRisk({
      attendancePct: 0,
      watchedSec: 0,
      watchTotalSec: 600,
      gradePcts: [10],
      absences: 5,
    });
    // 0 + 4 + 0 = 4
    expect(r.riskScore).toBe(4);
    expect(r.riskLevel).toBe('CRITICAL');
  });

  it('repeated absences add their signal and suggestion', () => {
    const r = assessStudentRisk({
      attendancePct: 55,
      watchedSec: 0,
      watchTotalSec: 600,
      gradePcts: [],
      absences: 3,
    });
    // 22 + 40 + 0 = 62 → AT_RISK
    expect(r.riskLevel).toBe('AT_RISK');
    expect(r.signals).toContain('غياب متكرر');
    expect(r.suggestion).toContain('غاب 3 مرات');
  });

  it('emits all four signals in a fixed order when everything is wrong', () => {
    const r = assessStudentRisk({
      attendancePct: 50,
      watchedSec: 300,
      watchTotalSec: 1000,
      gradePcts: [40],
      absences: 4,
    });
    expect(r.signals).toEqual(['حضور منخفض', 'درجات منخفضة', 'متابعة ضعيفة', 'غياب متكرر']);
    // 20 + 16 + 6 = 42 → CRITICAL
    expect(r.riskLevel).toBe('CRITICAL');
  });

  it('composes multi-issue suggestions with the Arabic separator', () => {
    const r = assessStudentRisk({
      attendancePct: 50,
      watchedSec: 300,
      watchTotalSec: 1000,
      gradePcts: [40],
      absences: 0,
    });
    expect(r.suggestion).toContain(' · ');
  });
});
