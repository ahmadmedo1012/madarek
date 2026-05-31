import { Router } from 'express';
import { Role, AttendanceStatus, SubmissionStatus, ResearchPaperStatus } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { AppError } from '../../lib/errors.js';

/**
 * Teacher dashboard aggregate — Phase 7.
 *
 * Replaces the hardcoded FEED / KPI / 6-week trend that lived in the page
 * with real values derived from the teacher's offerings:
 *  · KPI strip — student count, avg grade, attendance %, "needs review" total
 *  · 6-week trend — weekly avg grade + weekly avg attendance
 *  · Activity feed — pending submissions, pending papers, attendance gaps
 */
const router = Router();
router.use(authMiddleware);
router.use(requireRole(Role.TEACHER, Role.ADMIN));

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * GET /teacher/me/materials — every material the teacher has ever uploaded,
 * across all of their offerings, sorted newest first.
 */
router.get('/teacher/me/materials', async (req, res, next) => {
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
router.get('/teacher/me/assignments', async (req, res, next) => {
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

router.get('/teacher/dashboard', async (req, res, next) => {
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

    // ── Distinct enrolled students across offerings ──────────
    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId: { in: offeringIds }, status: 'active' },
      select: { studentId: true },
    });
    const studentCount = new Set(enrollments.map((e) => e.studentId)).size;

    // ── Attendance % across all sessions in the teacher's offerings ──
    const [presentish, totalAttendance] = await Promise.all([
      prisma.attendanceRecord.count({
        where: {
          session: { offeringId: { in: offeringIds } },
          status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
        },
      }),
      prisma.attendanceRecord.count({
        where: { session: { offeringId: { in: offeringIds } } },
      }),
    ]);
    const attendancePct = totalAttendance > 0 ? Math.round((presentish / totalAttendance) * 100) : null;

    // ── Average grade across submissions and exam attempts ──
    const gradedSubmissions = await prisma.submission.findMany({
      where: {
        assignment: { offeringId: { in: offeringIds } },
        status: SubmissionStatus.GRADED,
        grade: { not: null },
      },
      select: { grade: true, gradedAt: true, assignment: { select: { maxScore: true } } },
    });
    const allGrades = gradedSubmissions
      .filter((s) => s.grade !== null && s.assignment.maxScore > 0)
      .map((s) => Number(s.grade!.toString()) / s.assignment.maxScore * 100);
    const avgGradePct = allGrades.length
      ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
      : null;

    // ── "Needs review" — pending submissions + pending papers ─
    const [pendingSubmissions, pendingPapers] = await Promise.all([
      prisma.submission.count({
        where: {
          assignment: { offeringId: { in: offeringIds } },
          status: SubmissionStatus.SUBMITTED,
        },
      }),
      prisma.researchPaper.count({
        where: {
          offeringId: { in: offeringIds },
          status: { in: [ResearchPaperStatus.UPLOADED, ResearchPaperStatus.SCANNING, ResearchPaperStatus.CHECKS_PASSED] },
        },
      }),
    ]);
    const needsReview = pendingSubmissions + pendingPapers;

    // ── 6-week trend: avg grade + avg attendance per week ──
    const now = new Date();
    const sixWeeksAgo = new Date(now.getTime() - 6 * WEEK_MS);

    const [weekGrades, weekAttendance] = await Promise.all([
      prisma.submission.findMany({
        where: {
          assignment: { offeringId: { in: offeringIds } },
          status: SubmissionStatus.GRADED,
          gradedAt: { gte: sixWeeksAgo },
          grade: { not: null },
        },
        select: { grade: true, gradedAt: true, assignment: { select: { maxScore: true } } },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          session: { offeringId: { in: offeringIds }, date: { gte: sixWeeksAgo } },
        },
        select: {
          status: true,
          session: { select: { date: true } },
        },
      }),
    ]);

    const trend: Array<{ week: string; avgGradePct: number | null; attendancePct: number | null }> = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * WEEK_MS);
      const end = new Date(now.getTime() - i * WEEK_MS);
      const wgs = weekGrades.filter((s) => s.gradedAt && s.gradedAt >= start && s.gradedAt < end && s.assignment.maxScore > 0);
      const wgPct = wgs.length
        ? Math.round(wgs.reduce((a, s) => a + Number(s.grade!.toString()) / s.assignment.maxScore * 100, 0) / wgs.length)
        : null;
      const was = weekAttendance.filter((a) => a.session.date >= start && a.session.date < end);
      const wPresent = was.filter((a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
      const wAttPct = was.length ? Math.round((wPresent / was.length) * 100) : null;
      trend.push({
        week: `أسبوع ${6 - i}`,
        avgGradePct: wgPct,
        attendancePct: wAttPct,
      });
    }

    // ── Activity feed — real items, sorted by recency ──
    const [recentSubs, recentPapers, lowAttendanceStudents] = await Promise.all([
      // Pending submissions waiting for grading
      prisma.submission.findMany({
        where: {
          assignment: { offeringId: { in: offeringIds } },
          status: SubmissionStatus.SUBMITTED,
        },
        orderBy: { submittedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          submittedAt: true,
          student: { select: { firstName: true, lastName: true, avatarInitials: true, avatarColor: true } },
          assignment: {
            select: {
              title: true, type: true,
              offering: { select: { course: { select: { code: true, name: true } } } },
            },
          },
        },
      }),
      // Papers that finished automatic checks but await teacher grading
      prisma.researchPaper.findMany({
        where: {
          offeringId: { in: offeringIds },
          status: { in: [ResearchPaperStatus.CHECKS_PASSED, ResearchPaperStatus.CHECKS_FAILED] },
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
          session: { offeringId: { in: offeringIds }, date: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
          status: AttendanceStatus.ABSENT,
        },
        _count: { studentId: true },
        having: { studentId: { _count: { gte: 3 } } },
        orderBy: { _count: { studentId: 'desc' } },
        take: 4,
      }),
    ]);

    // Resolve student names for the absent-students bucket.
    const absentStudentIds = lowAttendanceStudents.map((g) => g.studentId);
    const absentStudents = absentStudentIds.length
      ? await prisma.user.findMany({
          where: { id: { in: absentStudentIds } },
          select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true },
        })
      : [];

    const feed = [
      ...recentSubs.map((s) => ({
        kind: 'submissions' as const,
        id: `s-${s.id}`,
        author: s.student,
        meta: `${s.assignment.offering.course.name} · ${s.assignment.offering.course.code}`,
        when: s.submittedAt,
        title: `سلّم${s.assignment.type === 'EXAM' ? '/ت' : ''} ${s.assignment.title}`,
        actionTo: '/teacher/grades',
      })),
      ...recentPapers.map((p) => ({
        kind: 'research' as const,
        id: `p-${p.id}`,
        author: p.student,
        meta: p.offering ? `بحث · ${p.offering.course.code}` : 'بحث',
        when: p.uploadedAt,
        title: `«${p.title}» — ${p.status === ResearchPaperStatus.CHECKS_PASSED
          ? `اجتاز الفحص (انتحال ${p.plagiarismPct ?? '—'}٪، AI ${p.aiContentPct ?? '—'}٪)`
          : 'فشل في فحص الانتحال — يحتاج توجيهاً'}`,
        actionTo: '/teacher/research',
      })),
      ...lowAttendanceStudents.map((g) => {
        const u = absentStudents.find((s) => s.id === g.studentId);
        return {
          kind: 'attendance' as const,
          id: `att-${g.studentId}`,
          author: u ?? null,
          meta: 'تنبيه حضور',
          when: now,
          title: `${g._count.studentId} غيابات في آخر 30 يوماً — ${u ? `${u.firstName} ${u.lastName}` : 'طالب'} يحتاج متابعة`,
          actionTo: '/teacher/attendance',
        };
      }),
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
