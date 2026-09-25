import { AttendanceStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/**
 * Shared attendance + academic-risk model — the single source of truth
 * for the formulas that used to be triplicated across
 * `teacher.routes.ts` (status-array variant, wave 13-5) and the two
 * dashboard route files (status-counts variant, wave 13-6). Extraction
 * per audit 11-d P2-20 (consolidation wave 14-3).
 *
 * CANONICAL attendance percentage — ONE formula everywhere:
 *
 *   pct = round(100 × (PRESENT + 0.5·LATE) / (PRESENT + LATE + ABSENT))
 *
 * · LATE earns half credit (the dashboards used to give it full credit;
 *   course analytics used to give it none — wave 13 unified all
 *   surfaces).
 * · EXCUSED marks are removed from the denominator — an excused absence
 *   neither credits nor penalizes.
 * · The empty state (nothing countable — a brand-new course) is a
 *   POLICY, not an accident. Two named wrappers keep each consumer
 *   group's exact convention:
 *     - `attendancePct` (teacher risk math): neutral 100 — a course
 *       with no roll-calls never reads as mass absence.
 *     - `attendancePctFromStatusCounts` (dashboard display): null — the
 *       KPI renders "—" instead of a fabricated 100%.
 *
 * The rest of the module is the teacher risk model (risk =
 * 40%·attendance + 40%·grade + 20%·watch, audit 11-d P1-4) with ONE
 * empty-state semantics: nothing graded and no roll-calls is NEUTRAL
 * (score 80, OK), never CRITICAL.
 */

/** Risk band of a composite risk score. */
export type RiskLevel = 'OK' | 'WATCH' | 'AT_RISK' | 'CRITICAL';

/** Band boundaries: ≥80 OK · ≥65 WATCH · ≥45 AT_RISK · else CRITICAL. */
export function classifyRisk(score: number): RiskLevel {
  if (score >= 80) return 'OK';
  if (score >= 65) return 'WATCH';
  if (score >= 45) return 'AT_RISK';
  return 'CRITICAL';
}

/** The canonical ratio both attendance wrappers share. */
function attendanceRatio(present: number, late: number, denominator: number): number {
  return Math.round(((present + late * 0.5) / denominator) * 100);
}

// ── Attendance: two named wrappers, one formula ────────────────────

/**
 * Attendance percentage from a per-student (or course-wide) status
 * array — the teacher-surface variant (roster, analytics, risk math).
 *
 *   pct = (PRESENT + 0.5·LATE) / (opportunities − EXCUSED)
 *
 * `opportunities` is the total number of countable marks — per student
 * it is the offering's session count (unmarked sessions count as missed
 * opportunities), course-wide it is the total record count. The empty
 * state (nothing countable yet — a brand-new course) is 100: the
 * platform's neutral convention, so a course with no roll-calls never
 * reads as mass absence.
 */
export function attendancePct(statuses: ReadonlyArray<AttendanceStatus>, opportunities: number): number {
  let present = 0;
  let late = 0;
  let excused = 0;
  for (const status of statuses) {
    if (status === AttendanceStatus.PRESENT) present += 1;
    else if (status === AttendanceStatus.LATE) late += 1;
    else if (status === AttendanceStatus.EXCUSED) excused += 1;
  }
  const counted = opportunities - excused;
  if (counted <= 0) return 100;
  return attendanceRatio(present, late, counted);
}

/**
 * Attendance percentage from groupBy status counts — the dashboard
 * variant (teacher-dashboard KPI/trend, student-dashboard KPI). Same
 * formula, but null when nothing is countable: the dashboards' display
 * convention (the KPI renders "—"), whereas the teacher risk math uses
 * the neutral 100 empty state (`attendancePct` above).
 */
export function attendancePctFromStatusCounts(
  countsByStatus: Array<{ status: AttendanceStatus; count: number }>,
): number | null {
  let present = 0;
  let late = 0;
  let absent = 0;
  for (const { status, count } of countsByStatus) {
    if (status === AttendanceStatus.PRESENT) present = count;
    else if (status === AttendanceStatus.LATE) late = count;
    else if (status === AttendanceStatus.ABSENT) absent = count;
    // EXCUSED — deliberately not accumulated.
  }
  const denominator = present + late + absent;
  if (denominator === 0) return null;
  return attendanceRatio(present, late, denominator);
}

// ── Watch-through ──────────────────────────────────────────────────

/**
 * Watch-through percentage of a lecture set: round(watched/total).
 * 0 whenever there is nothing watchable (totalSec ≤ 0) or nothing
 * watched — the two states are indistinguishable at this layer; the
 * risk assessment separates them via `watchTotalSec`.
 */
export function watchPctOf(watchedSec: number, totalSec: number): number {
  return totalSec > 0 ? Math.round((watchedSec / totalSec) * 100) : 0;
}

// ── Grades ─────────────────────────────────────────────────────────

/**
 * Percentage score of one graded artifact (a Grade-table row or a
 * GRADED submission). Returns null when the artifact carries no
 * signal — unset grade or a non-positive maxScore — so ÷0 → NaN can
 * never poison an average.
 */
export function gradePct(score: number | null, maxScore: number): number | null {
  if (score === null || !(maxScore > 0) || !Number.isFinite(score)) return null;
  return (score / maxScore) * 100;
}

/**
 * Mean percentage of a list of scores, rounded; null when nothing was
 * graded yet — each surface picks its own empty-state semantics (risk
 * scoring treats "no grades" as neutral, displays show 0).
 */
export function meanPct(pcts: ReadonlyArray<number>): number | null {
  if (pcts.length === 0) return null;
  return Math.round(pcts.reduce((sum, x) => sum + x, 0) / pcts.length);
}

/**
 * Per-student percentage scores of every graded artifact (audit 11-d
 * P1-6, read side): Grade-table rows AND teacher-graded submissions —
 * assignment grading only writes `Submission.grade`, so ignoring
 * submissions silently omitted all assignment work from the roster,
 * analytics and risk scoring.
 */
export function gradePctsByStudent(input: {
  grades: ReadonlyArray<{ studentId: string; score: number | Prisma.Decimal; maxScore: number }>;
  assignments: ReadonlyArray<{
    maxScore: number;
    submissions: ReadonlyArray<{ studentId: string; grade: number | Prisma.Decimal | null }>;
  }>;
}): Map<string, number[]> {
  const byStudent = new Map<string, number[]>();
  const push = (studentId: string, pct: number | null) => {
    if (pct === null) return;
    const cur = byStudent.get(studentId);
    if (cur) cur.push(pct);
    else byStudent.set(studentId, [pct]);
  };
  for (const g of input.grades) push(g.studentId, gradePct(Number(g.score), g.maxScore));
  for (const a of input.assignments) {
    for (const s of a.submissions) push(s.studentId, gradePct(s.grade === null ? null : Number(s.grade), a.maxScore));
  }
  return byStudent;
}

// ── Risk model ─────────────────────────────────────────────────────

/**
 * Suggestion text for the risk cards. `avgGrade` is the risk-model
 * value (neutral 100 when nothing is graded yet) and `watchPct` is
 * null when the course has nothing watchable — an ungraded student
 * must not be told their grades are below 50%, nor a lecture-less
 * course told to open the platform more.
 */
function suggestionFor(row: { attendancePct: number; avgGrade: number; watchPct: number | null; absences: number }): string {
  const issues: string[] = [];
  if (row.attendancePct < 60) issues.push('حضوره منخفض — تواصل معه قبل المحاضرة القادمة');
  if (row.avgGrade < 50) issues.push('درجاته أقل من 50% — اقترح جلسة دعم فردية');
  if (row.watchPct !== null && row.watchPct < 40) issues.push('متابعة المحاضرات المسجَّلة ضعيفة — تأكد أنه يفتح المنصة');
  if (row.absences >= 3) issues.push(`غاب ${row.absences} مرات متتالية — قد يكون انقطع عن الدراسة`);
  if (issues.length === 0) return 'الأداء مستقر — استمر في المتابعة الدورية';
  return issues.join(' · ');
}

/**
 * Unified risk assessment (audit 11-d P1-4): risk = 40%·attendance +
 * 40%·grade + 20%·watch, with ONE empty-state semantics — a student
 * with nothing graded and no roll-calls is NEUTRAL (score 80, OK),
 * never CRITICAL. Previously /students defaulted the grade factor to
 * 0 (every new-course student flagged CRITICAL) while /risks
 * defaulted it to 100 — the same student was labeled differently per
 * page.
 */
export interface StudentRiskInput {
  attendancePct: number;
  /** Cumulative watched/total seconds of this student's lecture-view
   *  events in the offering. totalSec = 0 → the course has nothing
   *  watchable yet: the watch signal and suggestion stay silent (a
   *  brand-new course must not read as weak follow-through) and the
   *  watch factor is 0. */
  watchedSec: number;
  watchTotalSec: number;
  /** Percentage scores of every graded artifact for this student
   *  (Grade table + GRADED submissions). Empty = nothing graded yet. */
  gradePcts: ReadonlyArray<number>;
  absences: number;
}

export interface StudentRiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  /** Watch-through percentage as displayed (0 when nothing watchable). */
  watchPct: number;
  signals: string[];
  suggestion: string;
}

export function assessStudentRisk(input: StudentRiskInput): StudentRiskAssessment {
  const hasGrades = input.gradePcts.length > 0;
  const avgGrade = meanPct(input.gradePcts) ?? 100; // neutral: no grades yet ≠ failing
  const watchPct = watchPctOf(input.watchedSec, input.watchTotalSec);
  const hasWatchableContent = input.watchTotalSec > 0;
  const riskScore = Math.round(0.4 * input.attendancePct + 0.4 * avgGrade + 0.2 * watchPct);
  const signals: string[] = [];
  if (input.attendancePct < 60) signals.push('حضور منخفض');
  if (hasGrades && avgGrade < 50) signals.push('درجات منخفضة');
  if (hasWatchableContent && watchPct < 40) signals.push('متابعة ضعيفة');
  if (input.absences >= 3) signals.push('غياب متكرر');
  return {
    riskScore,
    riskLevel: classifyRisk(riskScore),
    watchPct,
    signals,
    suggestion: suggestionFor({
      attendancePct: input.attendancePct,
      avgGrade,
      watchPct: hasWatchableContent ? watchPct : null,
      absences: input.absences,
    }),
  };
}
