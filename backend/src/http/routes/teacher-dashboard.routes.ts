import { Router } from 'express';
import { Role, AttendanceStatus, SubmissionStatus, ResearchPaperStatus, Prisma, AssignmentType } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { attendancePctFromStatusCounts } from '../../lib/risk.js';

/**
 * Teacher dashboard aggregate — Phase 7.
 *
 * Replaces the hardcoded FEED / KPI / 6-week trend that lived in the page
 * with real values derived from the teacher's offerings:
 *  · KPI strip — student count, avg grade, attendance %, "needs review" total
 *  · 6-week trend — weekly avg grade + weekly avg attendance
 *  · Activity feed — pending submissions, pending papers, attendance gaps
 *
 * Scalar aggregates run as groupBy/count queries (audit 11-d P1-11) — no
 * unbounded row sets are pulled into JS to compute averages.
 */
const router = Router();
router.use(authMiddleware);
router.use(requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER));

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// ─── Canonical attendance % (src/lib/risk.ts) ──────────────────────
// round(100 × (PRESENT + 0.5·LATE) / (PRESENT + LATE + ABSENT)) —
// LATE = half credit, EXCUSED excluded from the denominator, null when
// nothing is countable (the KPI renders "—"). This used to be a
// deliberate route-local duplicate; the audit P2-20 consolidation
// (wave 14-3) moved it to src/lib/risk.ts, shared with
// student-dashboard.routes.ts and teacher.routes.ts' risk math.
// Re-exported here because tests/modules/dashboard-logic.test.ts
// imports this module's copy.
export { attendancePctFromStatusCounts };

/** Per-assignment graded-submission rollup produced by the groupBy
 *  queries below: Σ grade points + row count per assignment. */
export interface SubmissionGradeGroup {
  assignmentId: string;
  sumGrade: number;
  count: number;
}

/**
 * Average graded-submission percentage from per-assignment sums — audit
 * 11-d P1-11 (wave 13-6). Mathematically identical to averaging
 * grade/maxScore·100 over the individual rows (Σᵢ gᵢ/mᵢ·100 ==
 * Σₐ sumGradeₐ/mₐ·100) but computed from groupBy results instead of
 * loading every submission into JS. Assignments with maxScore ≤ 0 are
 * skipped, mirroring the old per-row filter. Exported for DB-free tests.
 */
export function avgGradePctFromGroups(
  groups: ReadonlyArray<SubmissionGradeGroup>,
  maxScoreByAssignment: ReadonlyMap<string, number>,
): number | null {
  let pctSum = 0;
  let submissions = 0;
  for (const group of groups) {
    const maxScore = maxScoreByAssignment.get(group.assignmentId);
    if (!maxScore || maxScore <= 0) continue;
    pctSum += (group.sumGrade / maxScore) * 100;
    submissions += group.count;
  }
  return submissions > 0 ? Math.round(pctSum / submissions) : null;
}

/** groupBy row → SubmissionGradeGroup (Decimal sum → number). */
const toGradeGroup = (group: {
  assignmentId: string;
  _sum: { grade: Prisma.Decimal | null };
  _count: { assignmentId: number };
}): SubmissionGradeGroup => ({
  assignmentId: group.assignmentId,
  sumGrade: group._sum.grade === null ? 0 : Number(group._sum.grade.toString()),
  count: group._count.assignmentId,
});

/**
 * Papers that wait on the teacher: uploaded but not yet scanned, or
 * finished automatic checks (passed or failed) and awaiting grading.
 * SCANNING is excluded — the machine is mid-flight, nothing is actionable
 * yet. One set for BOTH the needsReview KPI and the feed (audit 11-d
 * P2-5: they used to count different state sets — CHECKS_FAILED showed in
 * the feed but was not counted; SCANNING was counted but never shown).
 */
const PAPERS_AWAITING_TEACHER: ResearchPaperStatus[] = [
  ResearchPaperStatus.UPLOADED,
  ResearchPaperStatus.CHECKS_PASSED,
  ResearchPaperStatus.CHECKS_FAILED,
];

/** Row of the pending-submissions feed query below — the select is kept
 * in sync with this shape (test factories in dashboard-logic.test.ts
 * build it DB-free). */
export interface PendingSubmissionFeedRow {
  id: string;
  submittedAt: Date;
  status: SubmissionStatus;
  /** Student's actual answer — 5-B6 P1-2: the grading modal renders the
   * content it grades. Nullable: assignments may be file-only/text-only. */
  textAnswer: string | null;
  fileUrl: string | null;
  student: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null };
  assignment: {
    title: string;
    type: AssignmentType;
    offering: { course: { code: string; name: string } };
  };
}

/**
 * Feed item for one pending submission. `late` (audit 15-a P0-1 follow-up,
 * 16-B1 hand-off) lets the FE badge late work WITHOUT touching `title` —
 * TeacherPages derives the grade modal's maxScore by stripping the
 * «سلّم / سلّم/ت» prefix and matching the remainder BY TITLE, so the
 * marker must travel as its own field, never as a title suffix.
 *
 * `actionTo` values are TEACHER-AREA paths (`/teacher/…`) — the FE renders
 * them verbatim into <Link to>, so an unprefixed path 404s (audit 5-A4
 * P1-1 / 5-A7 P1-1: '/grades' '/research' '/attendance' landed on the
 * designed 404 page). Pinned by dashboard-logic tests.
 */
export const TEACHER_FEED_ACTIONS = {
  grades: '/teacher/grades',
  research: '/teacher/research',
  attendance: '/teacher/attendance',
} as const;

export function submissionFeedItem(s: PendingSubmissionFeedRow): {
  kind: 'submissions';
  id: string;
  author: PendingSubmissionFeedRow['student'];
  meta: string;
  when: Date;
  title: string;
  actionTo: string;
  late: boolean;
  /** 5-B6 P1-2 — dormant-until-now answer fields, now projected so the
   * FE grading modal can show what it grades. */
  textAnswer: string | null;
  fileUrl: string | null;
} {
  return {
    kind: 'submissions',
    id: `s-${s.id}`,
    author: s.student,
    meta: `${s.assignment.offering.course.name} · ${s.assignment.offering.course.code}`,
    when: s.submittedAt,
    title: `سلّم${s.assignment.type === AssignmentType.EXAM ? '/ت' : ''} ${s.assignment.title}`,
    actionTo: TEACHER_FEED_ACTIONS.grades,
    late: s.status === SubmissionStatus.LATE,
    textAnswer: s.textAnswer,
    fileUrl: s.fileUrl,
  };
}

/** Row of the pending-papers feed query below — kept in sync with the
 * select (DB-free test factories build it; the Decimal-typed scan
 * percentages only ever feed the title string, so tests may pass
 * numbers). */
export interface ResearchPaperFeedRow {
  id: string;
  title: string;
  status: ResearchPaperStatus;
  plagiarismPct: Prisma.Decimal | number | null;
  aiContentPct: Prisma.Decimal | number | null;
  uploadedAt: Date;
  student: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null };
  offering: { course: { code: string } } | null;
}

/** Feed item for one paper awaiting the teacher (audit 11-d P2-5 set). */
export function researchFeedItem(p: ResearchPaperFeedRow): {
  kind: 'research';
  id: string;
  author: ResearchPaperFeedRow['student'];
  meta: string;
  when: Date;
  title: string;
  actionTo: string;
} {
  return {
    kind: 'research',
    id: `p-${p.id}`,
    author: p.student,
    meta: p.offering ? `بحث · ${p.offering.course.code}` : 'بحث',
    when: p.uploadedAt,
    title: `«${p.title}» — ${p.status === ResearchPaperStatus.UPLOADED
      ? 'لم يُفحص بعد — بانتظار فحص الانتحال'
      : p.status === ResearchPaperStatus.CHECKS_PASSED
        ? `اجتاز الفحص (انتحال ${p.plagiarismPct ?? '—'}%، AI ${p.aiContentPct ?? '—'}%)`
        : 'فشل في فحص الانتحال — يحتاج توجيهاً'}`,
    actionTo: TEACHER_FEED_ACTIONS.research,
  };
}

/** groupBy row of the absence-alert query (3+ absences / 30 days). */
export interface AbsenceAlertGroup {
  studentId: string;
  _count: { studentId: number };
}

/** Feed item for one absence alert (3+ recent absences). */
export function attendanceAlertFeedItem(
  g: AbsenceAlertGroup,
  student: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null } | null | undefined,
  lastAbsenceAt: Date,
): {
  kind: 'attendance';
  id: string;
  author: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null } | null;
  meta: string;
  when: Date;
  title: string;
  actionTo: string;
} {
  return {
    kind: 'attendance',
    id: `att-${g.studentId}`,
    author: student ?? null,
    meta: 'تنبيه حضور',
    when: lastAbsenceAt,
    title: `${g._count.studentId} غيابات في آخر 30 يوماً — ${student ? `${student.firstName} ${student.lastName}` : 'طالب'} يحتاج متابعة`,
    actionTo: TEACHER_FEED_ACTIONS.attendance,
  };
}

/**
 * GET /teacher/me/materials — every material the teacher has ever uploaded,
 * across all of their offerings, sorted newest first.
 */
router.get('/me/materials', async (req, res, next) => {
  try {
    const teacherId = req.user!.id;
    const offeringIds = (await prisma.courseOffering.findMany({
      where: { teacherId }, select: { id: true },
    })).map((o) => o.id);
    if (offeringIds.length === 0) {
      res.json({ data: [] });
      return;
    }
    const materials = await prisma.material.findMany({
      where: { offeringId: { in: offeringIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, name: true, type: true, url: true, sizeBytes: true,
        downloads: true, views: true, createdAt: true,
        offering: { select: { course: { select: { code: true, name: true } } } },
      },
    });
    res.json({
      data: materials.map((m) => ({
        id: m.id, name: m.name, type: m.type, url: m.url,
        sizeBytes: Number(m.sizeBytes),
        downloads: m.downloads, views: m.views,
        createdAt: m.createdAt,
        course: m.offering.course,
      })),
    });
  } catch (e) { next(e); }
});

/**
 * GET /teacher/me/assignments — every assignment across all of the
 * teacher's offerings, with submission count vs enrolment count.
 */
router.get('/me/assignments', async (req, res, next) => {
  try {
    const teacherId = req.user!.id;
    const offerings = await prisma.courseOffering.findMany({
      where: { teacherId },
      select: { id: true, _count: { select: { enrollments: true } } },
    });
    const offeringIds = offerings.map((o) => o.id);
    if (offeringIds.length === 0) {
      res.json({ data: [] });
      return;
    }
    const enrolByOffering = new Map(offerings.map((o) => [o.id, o._count.enrollments]));

    const assignments = await prisma.assignment.findMany({
      where: { offeringId: { in: offeringIds } },
      orderBy: [{ dueAt: 'asc' }],
      take: 100,
      select: {
        id: true, title: true, type: true, dueAt: true, weight: true, maxScore: true,
        offeringId: true,
        offering: { select: { course: { select: { code: true, name: true } } } },
        _count: { select: { submissions: true } },
      },
    });

    res.json({
      data: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        dueAt: a.dueAt,
        weight: a.weight,
        maxScore: a.maxScore,
        course: a.offering.course,
        submissions: a._count.submissions,
        enrolled: enrolByOffering.get(a.offeringId) ?? 0,
      })),
    });
  } catch (e) { next(e); }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const teacherId = req.user!.id;

    // ── Offerings the teacher owns ───────────────────────────
    const offerings = await prisma.courseOffering.findMany({
      where: { teacherId },
      select: {
        id: true,
        course: { select: { id: true, code: true, name: true } },
      },
    });
    const offeringIds = offerings.map((o) => o.id);

    if (offeringIds.length === 0) {
      res.json({
        data: {
          kpi: { studentCount: 0, avgGradePct: null, attendancePct: null, needsReview: 0 },
          trend: [],
          feed: [],
        },
      });
      return;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    // ── 6-week trend windows, oldest → newest (labels: أسبوع 1 … أسبوع 6) ──
    const trendWeeks = Array.from({ length: 6 }, (_, idx) => {
      const weeksAgo = 5 - idx;
      return {
        label: `أسبوع ${6 - weeksAgo}`,
        start: new Date(now.getTime() - (weeksAgo + 1) * WEEK_MS),
        end: new Date(now.getTime() - weeksAgo * WEEK_MS),
      };
    });

    // ── All scalar aggregates in one parallel round (audit 11-d P1-11:
    //    groupBy/count instead of loading every graded submission the
    //    teacher ever graded, and every 6-week attendance record, into JS) ──
    const [
      enrollments,
      kpiGradeGroups,
      weeklyPairs,
      kpiAttendanceGroups,
      pendingSubmissions,
      pendingPapers,
    ] = await Promise.all([
      // Distinct enrolled students across offerings
      prisma.enrollment.findMany({
        where: { offeringId: { in: offeringIds }, status: 'active' },
        select: { studentId: true },
      }),
      // All-time graded-submission rollup per assignment → KPI avg grade
      prisma.submission.groupBy({
        by: ['assignmentId'],
        where: {
          assignment: { offeringId: { in: offeringIds } },
          status: SubmissionStatus.GRADED,
          grade: { not: null },
        },
        _sum: { grade: true },
        _count: { assignmentId: true },
      }),
      // Per trend week: graded-submission rollup + attendance status counts
      Promise.all(trendWeeks.map(async (week) => {
        const [gradeGroups, attendanceGroups] = await Promise.all([
          prisma.submission.groupBy({
            by: ['assignmentId'],
            where: {
              assignment: { offeringId: { in: offeringIds } },
              status: SubmissionStatus.GRADED,
              gradedAt: { gte: week.start, lt: week.end },
              grade: { not: null },
            },
            _sum: { grade: true },
            _count: { assignmentId: true },
          }),
          prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: {
              session: { offeringId: { in: offeringIds }, date: { gte: week.start, lt: week.end } },
            },
            _count: { status: true },
          }),
        ]);
        return { label: week.label, gradeGroups, attendanceGroups };
      })),
      // All-time attendance status counts → KPI attendance %
      prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: { session: { offeringId: { in: offeringIds } } },
        _count: { status: true },
      }),
      // "Needs review" — pending submissions. SUBMITTED + LATE (audit
      // 15-a P0-1): submissions.routes.ts writes LATE for anything after
      // dueAt, so a SUBMITTED-only filter silently hid late work from the
      // teacher's entire grading-discovery surface — it never got graded.
      prisma.submission.count({
        where: {
          assignment: { offeringId: { in: offeringIds } },
          status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.LATE] },
        },
      }),
      // …+ papers awaiting the teacher (same set as the feed — P2-5)
      prisma.researchPaper.count({
        where: { offeringId: { in: offeringIds }, status: { in: PAPERS_AWAITING_TEACHER } },
      }),
    ]);

    // ── maxScore lookup shared by both grade rollups (bounded by the
    //    teacher's assignment count, not their submission count) ──
    const assignmentIds = new Set<string>();
    for (const group of kpiGradeGroups) assignmentIds.add(group.assignmentId);
    for (const week of weeklyPairs) {
      for (const group of week.gradeGroups) assignmentIds.add(group.assignmentId);
    }
    const assignmentRows = assignmentIds.size > 0
      ? await prisma.assignment.findMany({
          where: { id: { in: [...assignmentIds] } },
          select: { id: true, maxScore: true },
        })
      : [];
    const maxScoreByAssignment = new Map(assignmentRows.map((a) => [a.id, a.maxScore]));

    // ── KPI strip ────────────────────────────
    const studentCount = new Set(enrollments.map((e) => e.studentId)).size;
    const attendancePct = attendancePctFromStatusCounts(
      kpiAttendanceGroups.map((g) => ({ status: g.status, count: g._count.status })),
    );
    const avgGradePct = avgGradePctFromGroups(kpiGradeGroups.map(toGradeGroup), maxScoreByAssignment);
    const needsReview = pendingSubmissions + pendingPapers;

    // ── 6-week trend: avg grade + avg attendance per week ──
    const trend = weeklyPairs.map((week) => ({
      week: week.label,
      avgGradePct: avgGradePctFromGroups(week.gradeGroups.map(toGradeGroup), maxScoreByAssignment),
      attendancePct: attendancePctFromStatusCounts(
        week.attendanceGroups.map((g) => ({ status: g.status, count: g._count.status })),
      ),
    }));

    // ── Activity feed — real items, sorted by recency ──
    const [recentSubs, recentPapers, lowAttendanceStudents] = await Promise.all([
      // Pending submissions waiting for grading — SUBMITTED + LATE, the
      // exact set the needsReview KPI counts above (audit 15-a P0-1).
      prisma.submission.findMany({
        where: {
          assignment: { offeringId: { in: offeringIds } },
          status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.LATE] },
        },
        orderBy: { submittedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          submittedAt: true,
          // Feeds the `late` flag on the feed item (16-B1 hand-off).
          status: true,
          // 5-B6 P1-2 — the answer the modal grades (file- or text-only OK).
          textAnswer: true,
          fileUrl: true,
          student: { select: { firstName: true, lastName: true, avatarInitials: true, avatarColor: true } },
          assignment: {
            select: {
              title: true, type: true,
              offering: { select: { course: { select: { code: true, name: true } } } },
            },
          },
        },
      }),
      // Papers awaiting the teacher — unscanned or finished checks. Same
      // state set as the needsReview KPI above (audit 11-d P2-5).
      prisma.researchPaper.findMany({
        where: {
          offeringId: { in: offeringIds },
          status: { in: PAPERS_AWAITING_TEACHER },
        },
        orderBy: { uploadedAt: 'desc' },
        take: 4,
        select: {
          id: true, title: true, status: true, plagiarismPct: true, aiContentPct: true, uploadedAt: true,
          student: { select: { firstName: true, lastName: true, avatarInitials: true, avatarColor: true } },
          offering: { select: { course: { select: { code: true } } } },
        },
      }),
      // Students with 3+ recent absences (last 30 days, in this teacher's offerings)
      prisma.attendanceRecord.groupBy({
        by: ['studentId'],
        where: {
          session: { offeringId: { in: offeringIds }, date: { gte: thirtyDaysAgo } },
          status: AttendanceStatus.ABSENT,
        },
        _count: { studentId: true },
        having: { studentId: { _count: { gte: 3 } } },
        orderBy: { _count: { studentId: 'desc' } },
        take: 4,
      }),
    ]);

    // Resolve student names + most-recent-absence dates for the alert
    // bucket. The real date stamps each alert with honest recency (audit
    // 11-d P2-6 — `when: now` made absence alerts permanently outrank
    // genuinely fresh submissions and papers in the recency sort below).
    const absentStudentIds = lowAttendanceStudents.map((g) => g.studentId);
    const [absentStudents, lastAbsenceEntries] = await Promise.all([
      absentStudentIds.length
        ? prisma.user.findMany({
            where: { id: { in: absentStudentIds } },
            select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true },
          })
        : [],
      Promise.all(lowAttendanceStudents.map(async (g) => {
        const latest = await prisma.attendanceRecord.findFirst({
          where: {
            studentId: g.studentId,
            status: AttendanceStatus.ABSENT,
            session: { offeringId: { in: offeringIds }, date: { gte: thirtyDaysAgo } },
          },
          orderBy: { session: { date: 'desc' } },
          select: { session: { select: { date: true } } },
        });
        return [g.studentId, latest?.session.date ?? now] as const;
      })),
    ]);
    const lastAbsenceAt = new Map(lastAbsenceEntries);

    const feed = [
      ...recentSubs.map(submissionFeedItem),
      ...recentPapers.map(researchFeedItem),
      ...lowAttendanceStudents.map((g) => attendanceAlertFeedItem(
        g,
        absentStudents.find((s) => s.id === g.studentId),
        lastAbsenceAt.get(g.studentId) ?? now,
      )),
    ].sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, 12);

    res.json({
      data: {
        kpi: { studentCount, avgGradePct, attendancePct, needsReview },
        trend,
        feed,
      },
    });
  } catch (e) { next(e); }
});

export default router;
