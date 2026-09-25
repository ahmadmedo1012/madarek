import { Router } from 'express';
import { Role, AttendanceStatus, SubmissionStatus, Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../../lib/errors.js';

/**
 * Student dashboard aggregate — Phase 7.
 *
 * One endpoint, one round-trip: greeting context, KPI numbers, term progress,
 * GPA, and a unified agenda combining (today/tomorrow schedule slots,
 * upcoming assignments, upcoming live sessions). Replaces the hardcoded
 * agenda + 92% attendance + 3.8 GPA placeholders that lived in the page.
 */
const router = Router();
router.use(authMiddleware);
// IMPORTANT: do NOT gate the whole router by role.
// The endpoints in this file are personal-data endpoints (/me/dashboard,
// /me/results, /me/materials, /me/lab-sessions). Each one handles a missing
// student profile gracefully (returns an empty/preview shape), so any
// authenticated user can hit them without a 403. The previous
// `requireRole(STUDENT, ADMIN, OWNER)` was producing 403s for TEACHER and
// QUALITY users whenever something — a notification dropdown probe, a
// query-cache prefetch, a stale tab — tried to read these endpoints.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Canonical attendance percentage — audit 11-d P1-5/P2-2 (wave 13-6).
 * Mirrors the semantics of `attendancePct()` in teacher.routes.ts and the
 * copy in teacher-dashboard.routes.ts:
 *
 *   pct = round(100 × (PRESENT + 0.5·LATE) / (PRESENT + LATE + ABSENT))
 *
 * · LATE earns half credit (this dashboard used to give it full credit —
 *   a student saw different attendance numbers for the same course on
 *   different pages).
 * · EXCUSED marks are removed from the denominator — an excused absence
 *   neither credits nor penalizes.
 * · null when there is nothing countable (the KPI renders "—"; the
 *   teacher-side risk math in teacher.routes.ts uses the neutral 100
 *   empty state instead — different consumers, different convention).
 *
 * Takes groupBy status counts. Deliberately duplicated across the two
 * dashboard route files — both copies run the same table in
 * tests/modules/dashboard-logic.test.ts; folding into src/lib is the
 * audit P2-20 consolidation wave's job (keeps wave-13 batches
 * file-disjoint).
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
  return Math.round(((present + late * 0.5) / denominator) * 100);
}

/** Term anchors — fixed for now per the institutional academic calendar.
 *  Easy to swap to a database lookup once /admin/terms is wired.
 *  Pure (takes `now`) and exported for DB-free unit tests. */
export function currentTerm(now = new Date()): { code: string; startsAt: Date; endsAt: Date } {
  // Anchor: a generic two-semester cycle. The fall term runs Sep 10 –
  // Jan 15 (of the next calendar year), the spring term Feb 5 – Jun 15.
  const y = now.getFullYear();
  const fallStart = new Date(y, 8, 10);   // ~Sep 10
  const fallEnd = new Date(y + 1, 0, 15); // ~Jan 15
  const springStart = new Date(y, 1, 5);  // ~Feb 5
  const springEnd = new Date(y, 5, 15);   // ~Jun 15
  if (now >= fallStart && now <= fallEnd) {
    return { code: `${y}-FALL`, startsAt: fallStart, endsAt: fallEnd };
  }
  if (now >= springStart && now <= springEnd) {
    return { code: `${y}-SPRING`, startsAt: springStart, endsAt: springEnd };
  }
  // Off-cycle — return whichever term just ended (audit 11-d P2-1: the
  // old `now > fallEnd` test could never be true inside year y, so the
  // summer window fell through to a term that had ended ~5 months
  // earlier instead of the just-finished spring):
  //  · Jun 16 – Sep 9 (summer break) → this year's spring term
  //  · Jan 1 – Feb 4 (winter break)  → last year's fall term
  return now > springEnd
    ? { code: `${y}-SPRING`, startsAt: springStart, endsAt: springEnd }
    : { code: `${y - 1}-FALL`, startsAt: new Date(y - 1, 8, 10), endsAt: new Date(y, 0, 15) };
}

/**
 * GET /me/results — every grade the student has, rolled up per course
 * with a weighted percentage. Replaces the hardcoded 5-row RESULTS array
 * that lived in the frontend.
 *
 * Graded assignment submissions are folded into the same weighted rollup
 * (audit 11-d P1-6, read side): grading a submission only ever wrote the
 * Submission row, so teacher-graded assignment work was silently missing
 * from these numbers. `breakdown` stays Grade-table-only (officially
 * recorded kinds); recent graded submissions surface in recentAssignments.
 */
router.get('/me/results', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const grades = await prisma.grade.findMany({
      where: { studentId: userId },
      include: {
        offering: {
          select: {
            id: true, term: true,
            course: { select: { id: true, code: true, name: true, themeColor: true } },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    });

    interface CourseRow {
      offeringId: string;
      term: string;
      courseCode: string;
      courseName: string;
      themeColor: string | null;
      weightedSum: number;
      weightTotal: number;
      breakdown: Array<{ kind: string; score: number; maxScore: number; weight: number; feedback: string | null }>;
    }
    const byOffering = new Map<string, CourseRow>();
    for (const g of grades) {
      const pct = g.maxScore > 0 ? Number(g.score.toString()) / g.maxScore * 100 : 0;
      let row = byOffering.get(g.offeringId);
      if (!row) {
        row = {
          offeringId: g.offeringId,
          term: g.offering.term,
          courseCode: g.offering.course.code,
          courseName: g.offering.course.name,
          themeColor: g.offering.course.themeColor,
          weightedSum: 0,
          weightTotal: 0,
          breakdown: [],
        };
        byOffering.set(g.offeringId, row);
      }
      row.weightedSum += pct * g.weight;
      row.weightTotal += g.weight;
      row.breakdown.push({
        kind: g.kind,
        score: Number(g.score.toString()),
        maxScore: g.maxScore,
        weight: g.weight,
        feedback: g.feedback,
      });
    }

    // Graded assignment submissions (audit 11-d P1-6): one query feeds
    // both the rollup fold below and the recent feed — bounded by the
    // student's own submission count.
    const gradedSubs = await prisma.submission.findMany({
      where: { studentId: userId, status: SubmissionStatus.GRADED, grade: { not: null } },
      orderBy: { gradedAt: 'desc' },
      select: {
        id: true,
        gradedAt: true,
        grade: true,
        assignment: {
          select: {
            title: true, type: true, weight: true, maxScore: true, offeringId: true,
            offering: { select: { term: true, course: { select: { code: true, name: true, themeColor: true } } } },
          },
        },
      },
    });

    // Fold each graded submission into its course's weighted rollup with
    // the same arithmetic the Grade rows use: score/maxScore as pct,
    // weighted by the assignment's weight. A course graded only through
    // submissions now shows up instead of being invisible.
    for (const s of gradedSubs) {
      if (s.grade === null) continue; // defensive — the where already filters
      const pct = s.assignment.maxScore > 0
        ? Number(s.grade.toString()) / s.assignment.maxScore * 100
        : 0;
      let row = byOffering.get(s.assignment.offeringId);
      if (!row) {
        row = {
          offeringId: s.assignment.offeringId,
          term: s.assignment.offering.term,
          courseCode: s.assignment.offering.course.code,
          courseName: s.assignment.offering.course.name,
          themeColor: s.assignment.offering.course.themeColor,
          weightedSum: 0,
          weightTotal: 0,
          breakdown: [],
        };
        byOffering.set(s.assignment.offeringId, row);
      }
      row.weightedSum += pct * s.assignment.weight;
      row.weightTotal += s.assignment.weight;
    }

    const courses = Array.from(byOffering.values()).map((r) => ({
      offeringId: r.offeringId,
      term: r.term,
      courseCode: r.courseCode,
      courseName: r.courseName,
      themeColor: r.themeColor,
      gradePct: r.weightTotal > 0 ? Math.round(r.weightedSum / r.weightTotal) : null,
      breakdown: r.breakdown,
    })).sort((a, b) => (b.gradePct ?? -1) - (a.gradePct ?? -1));

    // Secondary "what was just returned to me" feed — the 20 most recent
    // of the same graded submissions folded into the rollup above.
    const recentAssignments = gradedSubs.slice(0, 20).map((s) => ({
      id: s.id,
      title: s.assignment.title,
      type: s.assignment.type,
      offeringId: s.assignment.offeringId,
      gradePct: s.assignment.maxScore > 0
        ? Math.round((Number(s.grade!.toString()) / s.assignment.maxScore) * 100)
        : 0,
      gradedAt: s.gradedAt,
    }));

    const valid = courses.filter((c): c is typeof c & { gradePct: number } => c.gradePct !== null);
    const avg = valid.length > 0 ? Math.round(valid.reduce((a, c) => a + c.gradePct, 0) / valid.length) : null;
    const top = valid.length > 0 ? valid.reduce((a, c) => (c.gradePct > a.gradePct ? c : a)) : null;
    const low = valid.length > 0 ? valid.reduce((a, c) => (c.gradePct < a.gradePct ? c : a)) : null;

    res.json({
      data: {
        headline: {
          avgGradePct: avg,
          highest: top ? { courseName: top.courseName, gradePct: top.gradePct } : null,
          lowest: low ? { courseName: low.courseName, gradePct: low.gradePct } : null,
          courseCount: courses.length,
        },
        courses,
        recentAssignments,
      },
    });
  } catch (e) { next(e); }
});

/**
 * GET /me/materials — every material across the student's active enrolments,
 * sorted by upload date. Backs the "Downloads" page.
 */
router.get('/me/materials', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const enrolments = await prisma.enrollment.findMany({
      where: { studentId: userId, status: 'active' },
      select: { offeringId: true },
    });
    const offeringIds = enrolments.map((e) => e.offeringId);
    if (offeringIds.length === 0) {
      res.json({ data: [] });
      return;
    }

    const materials = await prisma.material.findMany({
      where: { offeringId: { in: offeringIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, name: true, type: true, url: true,
        sizeBytes: true, createdAt: true,
        offering: { select: { course: { select: { code: true, name: true } } } },
      },
    });
    res.json({
      data: materials.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        url: m.url,
        sizeBytes: Number(m.sizeBytes),
        createdAt: m.createdAt,
        course: m.offering.course,
      })),
    });
  } catch (e) { next(e); }
});

/**
 * GET /me/lab-sessions — student's lab session history with simple aggregates.
 */
router.get('/me/lab-sessions', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    // Counts come from count() queries — the old shape derived active/
    // completed/total from the take:50 slice, freezing `total` at 50 past
    // the 50th session (audit 11-d P1-9). `recent` only ever rendered 10
    // rows, so the fetch takes exactly 10.
    const [active, completed, recentSessions] = await Promise.all([
      prisma.labSession.count({ where: { userId, completedAt: null } }),
      prisma.labSession.count({ where: { userId, completedAt: { not: null } } }),
      prisma.labSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: { lab: { select: { id: true, name: true } } },
      }),
    ]);
    res.json({
      data: {
        active,
        completed,
        total: active + completed,
        recent: recentSessions.map((s) => ({
          id: s.id,
          experimentName: s.experimentName,
          progressPct: s.progressPct,
          score: s.score ? Number(s.score.toString()) : null,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          lab: s.lab,
        })),
      },
    });
  } catch (e) { next(e); }
});

router.get('/me/dashboard', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const term = currentTerm();
    const now = new Date();
    const horizon = new Date(now.getTime() + WEEK_MS);

    // ── Profile + active enrollments ──────────────────────────
    const [profile, enrollments] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId },
        select: {
          gpa: true, totalXp: true, level: true, year: true, facultyId: true,
          faculty: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: { studentId: userId, status: 'active' },
        select: {
          id: true,
          progressPct: true,
          offering: {
            select: {
              id: true,
              term: true,
              course: { select: { id: true, code: true, name: true, themeColor: true } },
              schedule: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true } },
            },
          },
        },
      }),
    ]);

    // Non-students (TEACHER / ADMIN / OWNER / QUALITY) can hit this endpoint
    // without a student profile of their own (previewing the dashboard layout
    // or hit by a stale tab / cache prefetch). Return a graceful empty-shell
    // response instead of a 404 — the frontend renders an empty-state inside
    // the dashboard rather than the global error page.
    if (!profile) {
      const role = req.user!.role;
      if (role !== Role.STUDENT) {
        res.json({
          data: {
            preview: true,
            profile: null,
            kpi: { courseCount: 0, attendancePct: null, pendingAssignmentsCount: 0, totalXp: 0, level: 0, rank: 0, cohortSize: 0 },
            term: { code: term.code, startsAt: term.startsAt, endsAt: term.endsAt, progressPct: 0 },
            progress: { avgEnrollmentProgressPct: 0 },
            agenda: { classes: [], assignments: [], live: [] },
          },
        });
        return;
      }
      throw AppError.notFound('Student profile not found');
    }

    const offeringIds = enrollments.map((e) => e.offering.id);
    const courseCount = enrollments.length;
    const avgProgressPct = enrollments.length
      ? Math.round(enrollments.reduce((s, e) => s + e.progressPct, 0) / enrollments.length)
      : 0;

    // ── Attendance % (whole-history; one groupBy per status) ──
    const attByStatus = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentId: userId },
      _count: { status: true },
    });
    const attendancePct = attendancePctFromStatusCounts(
      attByStatus.map((g) => ({ status: g.status, count: g._count.status })),
    );

    // ── Pending assignments — due within the week, not yet submitted ──
    // One predicate feeds BOTH the agenda list (take: 6) and the uncapped
    // KPI count — the count used to be `list.length`, so a student with 9
    // assignments due this week saw "6" on the KPI card (audit 11-d P1-8).
    const pendingAssignmentsWhere = {
      offeringId: { in: offeringIds },
      dueAt: { gte: now, lte: horizon },
      // Exclude assignments the student has already submitted.
      submissions: {
        none: {
          studentId: userId,
          status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED, SubmissionStatus.RETURNED] },
        },
      },
    } satisfies Prisma.AssignmentWhereInput;
    const [upcomingAssignments, pendingAssignmentsCount] = await Promise.all([
      prisma.assignment.findMany({
        where: pendingAssignmentsWhere,
        orderBy: { dueAt: 'asc' },
        take: 6,
        select: {
          id: true, title: true, type: true, dueAt: true,
          // offeringId lets the frontend submit directly
          // (POST /offerings/:offeringId/assignments/:id/submit) without
          // the per-offering assignment useQueries round-trips.
          offeringId: true,
          offering: { select: { course: { select: { name: true, code: true } } } },
        },
      }),
      prisma.assignment.count({ where: pendingAssignmentsWhere }),
    ]);

    // ── Upcoming live sessions for enrolled offerings ─────────
    const upcomingLive = await prisma.liveSession.findMany({
      where: {
        offeringId: { in: offeringIds },
        scheduledAt: { gte: now, lte: horizon },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 4,
      select: {
        id: true, title: true, scheduledAt: true, status: true, offeringId: true,
        offering: { select: { course: { select: { name: true, code: true } } } },
      },
    });

    // ── Today / tomorrow class slots from schedule ────────────
    const todayDow = now.getDay();
    const tomorrowDow = (todayDow + 1) % 7;
    const todayClasses: Array<{ id: string; offeringId: string; courseName: string; courseCode: string; startTime: string; endTime: string; room: string | null; when: 'today' | 'tomorrow' }> = [];
    for (const e of enrollments) {
      for (const slot of e.offering.schedule) {
        if (slot.dayOfWeek === todayDow || slot.dayOfWeek === tomorrowDow) {
          todayClasses.push({
            id: slot.id,
            offeringId: e.offering.id,
            courseName: e.offering.course.name,
            courseCode: e.offering.course.code,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
            when: slot.dayOfWeek === todayDow ? 'today' : 'tomorrow',
          });
        }
      }
    }
    todayClasses.sort((a, b) =>
      a.when === b.when ? a.startTime.localeCompare(b.startTime) : a.when === 'today' ? -1 : 1,
    );

    // ── XP rank within faculty (for "place X in your batch") ──
    // Two indexed counts instead of loading every profile in the faculty
    // to filter in JS (audit 11-d P1-11). Same semantics as before:
    // rank = number of peers strictly ahead + 1.
    const [peersAhead, cohortSize] = await Promise.all([
      prisma.studentProfile.count({
        where: { facultyId: profile.facultyId, totalXp: { gt: profile.totalXp } },
      }),
      prisma.studentProfile.count({ where: { facultyId: profile.facultyId } }),
    ]);
    const rank = peersAhead + 1;

    // ── Term progress fraction ────────────────────────────────
    const termTotalMs = term.endsAt.getTime() - term.startsAt.getTime();
    const elapsedMs = Math.max(0, Math.min(termTotalMs, now.getTime() - term.startsAt.getTime()));
    const termProgressPct = termTotalMs > 0 ? Math.round((elapsedMs / termTotalMs) * 100) : 0;

    res.json({
      data: {
        profile: {
          year: profile.year,
          gpa: Number(profile.gpa.toString()),
          totalXp: profile.totalXp,
          level: profile.level,
          facultyName: profile.faculty?.name ?? null,
          departmentName: profile.department?.name ?? null,
        },
        kpi: {
          courseCount,
          attendancePct,
          pendingAssignmentsCount,
          totalXp: profile.totalXp,
          rank,
          cohortSize,
        },
        term: {
          code: term.code,
          startsAt: term.startsAt,
          endsAt: term.endsAt,
          progressPct: termProgressPct,
        },
        progress: {
          avgEnrollmentProgressPct: avgProgressPct,
        },
        agenda: {
          classes: todayClasses,
          assignments: upcomingAssignments.map((a) => ({
            id: a.id,
            offeringId: a.offeringId,
            title: a.title,
            type: a.type,
            dueAt: a.dueAt,
            courseName: a.offering.course.name,
            courseCode: a.offering.course.code,
          })),
          live: upcomingLive,
        },
      },
    });
  } catch (e) { next(e); }
});

export default router;
