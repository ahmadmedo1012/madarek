/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/teacher.routes.ts` (wave 13-5, extended
 * 16-B5).
 *
 * DB-free, mirroring learning-logic.test.ts. Locks the unified KPI
 * semantics that used to drift between /students, /analytics and
 * /risks (audit 11-d P1-4/P1-5/P1-6):
 *  - attendance formula (LATE = half credit, EXCUSED excluded, empty
 *    course = neutral 100),
 *  - risk assessment with ONE empty-state semantics (nothing graded
 *    and no roll-calls = NEUTRAL/OK, never CRITICAL),
 *  - grade aggregation over Grade-table rows AND GRADED submissions,
 *  - the governance-scope decision matrix for POST /admin/users/:id/
 *    scope (12-4 hand-off #1 — the self-escalation guard),
 *  - course-level grade aggregates for the analytics surface (audit
 *    15-i TOP-14 — the deliberate {0,0} empty state and the ≥50
 *    inclusive pass mark),
 *  - the leadership-seat anchor map behind POST /admin/teachers/:id/
 *    position's FOR UPDATE serialization (audit 15-b P2-2).
 *
 * Route-level integration (auth gates, assertOwnsOffering, roll-call
 * transactions, the seat FOR UPDATE lock itself) needs a DB harness
 * the project does not have.
 */
import { describe, expect, it } from 'vitest';
import { AttendanceStatus, Prisma, Role } from '@prisma/client';
import { AppError } from '../../src/lib/errors';
import {
  assessStudentRisk,
  assertCanAssignScope,
  assignPositionSchema,
  assignScopeSchema,
  attendancePct,
  classifyRisk,
  courseGradeStats,
  gradePct,
  gradePctsByStudent,
  meanPct,
  seatLockTarget,
  watchPctOf,
} from '../../src/http/routes/teacher.routes';

const { PRESENT, LATE, ABSENT, EXCUSED } = AttendanceStatus;

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

describe('attendancePct (unified formula — audit 11-d P1-5 + P2-2)', () => {
  it('empty course is neutral 100, never mass absence', () => {
    expect(attendancePct([], 0)).toBe(100);
  });

  it('all present is 100', () => {
    expect(attendancePct([PRESENT, PRESENT, PRESENT], 3)).toBe(100);
  });

  it('LATE earns half credit (not full, not zero)', () => {
    // 3 present + 2 late of 5 → (3 + 0.5·2)/5 = 80
    expect(attendancePct([PRESENT, PRESENT, PRESENT, LATE, LATE], 5)).toBe(80);
    // only late → exactly 50 — pins the half-credit policy
    expect(attendancePct([LATE, LATE], 2)).toBe(50);
  });

  it('absences count against the student', () => {
    // 2 present + 2 absent + 1 late of 5 → (2 + 0.5)/5 = 50
    expect(attendancePct([PRESENT, PRESENT, ABSENT, ABSENT, LATE], 5)).toBe(50);
  });

  it('EXCUSED is removed from the denominator, not counted against', () => {
    // 3 present + 1 excused of 4 marks → 3/(4−1) = 100
    expect(attendancePct([PRESENT, PRESENT, PRESENT, EXCUSED], 4)).toBe(100);
    // every mark excused → nothing countable → neutral 100
    expect(attendancePct([EXCUSED, EXCUSED], 2)).toBe(100);
  });

  it('excused sessions drop out of a per-student session denominator', () => {
    // Student marked in 3 of 5 sessions (2 unmarked), one of which is
    // excused → counted = 5−1 = 4, present = 2 → 50.
    expect(attendancePct([PRESENT, PRESENT, EXCUSED], 5)).toBe(50);
  });

  it('rounds to whole percent', () => {
    expect(attendancePct([PRESENT], 3)).toBe(33);
    expect(attendancePct([PRESENT, PRESENT], 3)).toBe(67);
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

describe('assertCanAssignScope (12-4 hand-off #1 — self-escalation guard)', () => {
  const otherAdmin = { targetId: 'admin-2', targetRole: Role.ADMIN };
  const otherQuality = { targetId: 'quality-1', targetRole: Role.QUALITY };

  it('refuses a self-scope-change even for a university-wide actor', () => {
    expect(() =>
      assertCanAssignScope({ actorId: 'admin-1', actorScopeFacultyId: null, targetId: 'admin-1', targetRole: Role.ADMIN }),
    ).toThrowError('You cannot change your own governance scope');
  });

  it('refuses a self-scope-change for a scoped actor (widening OR narrowing)', () => {
    expect(() =>
      assertCanAssignScope({ actorId: 'admin-1', actorScopeFacultyId: 'f1', targetId: 'admin-1', targetRole: Role.ADMIN }),
    ).toThrowError('You cannot change your own governance scope');
  });

  it('a faculty-scoped actor cannot rewrite an ADMIN scope', () => {
    expect(() =>
      assertCanAssignScope({ actorId: 'admin-1', actorScopeFacultyId: 'f1', ...otherAdmin }),
    ).toThrowError(AppError);
  });

  it('a faculty-scoped actor cannot rewrite a QUALITY scope', () => {
    expect(() =>
      assertCanAssignScope({ actorId: 'admin-1', actorScopeFacultyId: 'f1', ...otherQuality }),
    ).toThrowError(AppError);
  });

  it('a university-wide actor may set another ADMIN scope', () => {
    expect(() =>
      assertCanAssignScope({ actorId: 'admin-1', actorScopeFacultyId: null, ...otherAdmin }),
    ).not.toThrow();
  });

  it('a university-wide actor may set another QUALITY scope', () => {
    expect(() =>
      assertCanAssignScope({ actorId: 'admin-1', actorScopeFacultyId: null, ...otherQuality }),
    ).not.toThrow();
  });

  it('violations are 403 FORBIDDEN AppErrors (not 400s or 500s)', () => {
    try {
      assertCanAssignScope({ actorId: 'admin-1', actorScopeFacultyId: 'f1', ...otherAdmin });
      expect.unreachable('guard must throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      const err = e as AppError;
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    }
  });
});

describe('assignScopeSchema', () => {
  it('accepts a university-wide reset', () => {
    expect(assignScopeSchema.safeParse({ scopeFacultyId: null }).success).toBe(true);
  });

  it('accepts a faculty cuid', () => {
    expect(assignScopeSchema.safeParse({ scopeFacultyId: 'cabcdefgh12345678' }).success).toBe(true);
  });

  it('rejects non-cuid strings, numbers and unknown keys', () => {
    expect(assignScopeSchema.safeParse({ scopeFacultyId: 'not-a-cuid' }).success).toBe(false);
    expect(assignScopeSchema.safeParse({ scopeFacultyId: 123 }).success).toBe(false);
    expect(assignScopeSchema.safeParse({ scopeFacultyId: null, extra: 1 }).success).toBe(false);
    expect(assignScopeSchema.safeParse({}).success).toBe(false);
  });
});

describe('courseGradeStats (analytics surface — audit 15-i TOP-14)', () => {
  it('empty course → {avg: 0, passRate: 0} — the analytics card shows 0, not "—" (deliberate policy, unlike the dashboards\' null)', () => {
    expect(courseGradeStats([])).toEqual({ avg: 0, passRate: 0 });
    // an all-null course (only unset/÷0 artifacts — gradePct → null)
    // is the same empty state, never NaN
    expect(courseGradeStats([null, null])).toEqual({ avg: 0, passRate: 0 });
  });

  it('pass mark is ≥ 50 INCLUSIVE — exactly 50 passes', () => {
    expect(courseGradeStats([50])).toEqual({ avg: 50, passRate: 100 });
    expect(courseGradeStats([49, 50])).toEqual({ avg: 50, passRate: 50 });
    expect(courseGradeStats([49])).toEqual({ avg: 49, passRate: 0 });
  });

  it('mixed nulls are filtered — they neither poison the mean nor dilute the pass rate', () => {
    expect(courseGradeStats([null, 80, 20])).toEqual({ avg: 50, passRate: 50 });
    expect(courseGradeStats([100, null, null])).toEqual({ avg: 100, passRate: 100 });
  });

  it('averages and rounds like the roster mean (meanPct semantics)', () => {
    expect(courseGradeStats([80])).toEqual({ avg: 80, passRate: 100 });
    expect(courseGradeStats([10, 20, 30])).toEqual({ avg: 20, passRate: 0 });
    // avg 125/3 → 42, passRate 2/3 → 67 — both round half-up
    expect(courseGradeStats([50, 55, 20])).toEqual({ avg: 42, passRate: 67 });
  });
});

describe('assignPositionSchema (leadership appointment — discriminated union)', () => {
  const cuid = 'cabcdefgh12345678';

  it('accepts each appointment shape and the clear shape', () => {
    expect(assignPositionSchema.safeParse({ position: 'DEAN', positionFacultyId: cuid }).success).toBe(true);
    expect(assignPositionSchema.safeParse({ position: 'ASSOCIATE_DEAN', positionFacultyId: cuid }).success).toBe(true);
    expect(assignPositionSchema.safeParse({ position: 'DEPARTMENT_HEAD', positionDepartmentId: cuid }).success).toBe(true);
    expect(assignPositionSchema.safeParse({ position: null }).success).toBe(true);
  });

  it('rejects a seat without its anchor id or with a non-cuid anchor', () => {
    expect(assignPositionSchema.safeParse({ position: 'DEAN' }).success).toBe(false);
    expect(assignPositionSchema.safeParse({ position: 'DEPARTMENT_HEAD' }).success).toBe(false);
    expect(assignPositionSchema.safeParse({ position: 'DEAN', positionFacultyId: 'not-a-cuid' }).success).toBe(false);
  });

  it('rejects the wrong anchor kind for a position (DEAN takes a faculty, not a department)', () => {
    expect(assignPositionSchema.safeParse({ position: 'DEAN', positionDepartmentId: cuid }).success).toBe(false);
    expect(assignPositionSchema.safeParse({ position: 'DEPARTMENT_HEAD', positionFacultyId: cuid }).success).toBe(false);
  });

  it('rejects unknown positions', () => {
    expect(assignPositionSchema.safeParse({ position: 'RECTOR' }).success).toBe(false);
    expect(assignPositionSchema.safeParse({}).success).toBe(false);
  });
});

describe('seatLockTarget (leadership-seat serialization — audit 15-b P2-2)', () => {
  it('DEAN and ASSOCIATE_DEAN seats anchor to the Faculty row — one lock per faculty', () => {
    expect(seatLockTarget({ position: 'DEAN', positionFacultyId: 'cfaculty0001' }))
      .toEqual({ table: 'Faculty', id: 'cfaculty0001' });
    expect(seatLockTarget({ position: 'ASSOCIATE_DEAN', positionFacultyId: 'cfaculty0001' }))
      .toEqual({ table: 'Faculty', id: 'cfaculty0001' });
  });

  it('DEPARTMENT_HEAD seats anchor to the Department row', () => {
    expect(seatLockTarget({ position: 'DEPARTMENT_HEAD', positionDepartmentId: 'cdepartment01' }))
      .toEqual({ table: 'Department', id: 'cdepartment01' });
  });

  it('clearing a position holds no seat — nothing to lock, no conflict possible', () => {
    expect(seatLockTarget({ position: null })).toBeNull();
  });

  it('agrees with the schema: every appointable body anchors to exactly one row', () => {
    const dean = assignPositionSchema.parse({ position: 'DEAN', positionFacultyId: 'cfaculty0001' });
    const assoc = assignPositionSchema.parse({ position: 'ASSOCIATE_DEAN', positionFacultyId: 'cfaculty0002' });
    const head = assignPositionSchema.parse({ position: 'DEPARTMENT_HEAD', positionDepartmentId: 'cdepartment01' });
    expect(seatLockTarget(dean)).toEqual({ table: 'Faculty', id: 'cfaculty0001' });
    expect(seatLockTarget(assoc)).toEqual({ table: 'Faculty', id: 'cfaculty0002' });
    expect(seatLockTarget(head)).toEqual({ table: 'Department', id: 'cdepartment01' });
    expect(seatLockTarget(assignPositionSchema.parse({ position: null }))).toBeNull();
  });
});
