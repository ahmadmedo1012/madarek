import { Router } from 'express';
import { Role, AttendanceStatus, SubmissionStatus } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
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
router.use(requireRole(Role.STUDENT));

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Term anchors — fixed for now per the institutional academic calendar.
 *  Easy to swap to a database lookup once /admin/terms is wired. */
function currentTerm(): { code: string; startsAt: Date; endsAt: Date } {
  // Anchor: a generic two-semester cycle. The fall term runs Sep-Jan.
  const now = new Date();
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
  // Off-cycle (summer / winter break) — return whichever term is closest in past.
  return now > fallEnd
    ? { code: `${y}-SPRING`, startsAt: springStart, endsAt: springEnd }
    : { code: `${y - 1}-FALL`, startsAt: new Date(y - 1, 8, 10), endsAt: new Date(y, 0, 15) };
}

/**
 * GET /me/results — every grade the student has, rolled up per course
 * with a weighted percentage. Replaces the hardcoded 5-row RESULTS array
 * that lived in the frontend.
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

    const courses = Array.from(byOffering.values()).map((r) => ({
      offeringId: r.offeringId,
      term: r.term,
      courseCode: r.courseCode,
      courseName: r.courseName,
      themeColor: r.themeColor,
      gradePct: r.weightTotal > 0 ? Math.round(r.weightedSum / r.weightTotal) : null,
      breakdown: r.breakdown,
    })).sort((a, b) => (b.gradePct ?? -1) - (a.gradePct ?? -1));

    // Recent graded submissions — separate from Grade table, useful as a
    // secondary "what was just returned to me" feed.
    const subs = await prisma.submission.findMany({
      where: { studentId: userId, status: 'GRADED', grade: { not: null } },
      include: {
        assignment: { select: { offeringId: true, maxScore: true, title: true, type: true } },
      },
      orderBy: { gradedAt: 'desc' },
      take: 20,
    });
    const recentAssignments = subs.map((s) => ({
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

    if (!profile) throw AppError.notFound('Student profile not found');

    const offeringIds = enrollments.map((e) => e.offering.id);
    const courseCount = enrollments.length;
    const avgProgressPct = enrollments.length
      ? Math.round(enrollments.reduce((s, e) => s + e.progressPct, 0) / enrollments.length)
      : 0;

    // ── Attendance % (whole-history; trivial enough to recompute) ──
    const [presentish, totalAttendance] = await Promise.all([
      prisma.attendanceRecord.count({
        where: { studentId: userId, status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] } },
      }),
      prisma.attendanceRecord.count({ where: { studentId: userId } }),
    ]);
    const attendancePct = totalAttendance > 0 ? Math.round((presentish / totalAttendance) * 100) : null;

    // ── Pending assignments — due in the future, not yet submitted ──
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        offeringId: { in: offeringIds },
        dueAt: { gte: now, lte: horizon },
        // Exclude assignments the student has already submitted.
        submissions: {
          none: {
            studentId: userId,
            status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED, SubmissionStatus.RETURNED] },
          },
        },
      },
      orderBy: { dueAt: 'asc' },
      take: 6,
      select: {
        id: true, title: true, type: true, dueAt: true,
        offering: { select: { course: { select: { name: true, code: true } } } },
      },
    });
    const pendingAssignmentsCount = upcomingAssignments.length;

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
        id: true, title: true, scheduledAt: true, status: true,
        offering: { select: { course: { select: { name: true, code: true } } } },
      },
    });

    // ── Today / tomorrow class slots from schedule ────────────
    const todayDow = now.getDay();
    const tomorrowDow = (todayDow + 1) % 7;
    const todayClasses: Array<{ id: string; courseName: string; courseCode: string; startTime: string; endTime: string; room: string | null; when: 'today' | 'tomorrow' }> = [];
    for (const e of enrollments) {
      for (const slot of e.offering.schedule) {
        if (slot.dayOfWeek === todayDow || slot.dayOfWeek === tomorrowDow) {
          todayClasses.push({
            id: slot.id,
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
    const facultyPeers = await prisma.studentProfile.findMany({
      where: { facultyId: profile.facultyId },
      select: { totalXp: true },
    });
    const myXp = profile.totalXp;
    const rank = facultyPeers.filter((p) => p.totalXp > myXp).length + 1;
    const cohortSize = facultyPeers.length;

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
