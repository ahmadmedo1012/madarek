import { Router } from 'express';
import { Role, AnnouncementScope, CompetitionStatus } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../../lib/errors.js';

/**
 * College surface — sub-project B.
 *
 * Each Faculty in the schema is a "college" in product terms. These endpoints
 * return the data needed to render an index of colleges and a per-college
 * overview (departments, leadership, top students, announcements, events,
 * competitions, live sessions).
 *
 * Designed as bundled aggregate reads — one round-trip per page — to keep
 * the UI snappy and avoid a waterfall of small fetches.
 */
const router = Router();
router.use(authMiddleware);

/**
 * GET /colleges
 * Light list for the index page: name, emoji, department / student / teacher counts.
 */
router.get('/colleges', async (_req, res, next) => {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: {
        departments: {
          select: {
            id: true,
            _count: { select: { students: true, teachers: true, courses: true } },
          },
        },
      },
    });
    const data = faculties.map((f) => {
      const studentCount = f.departments.reduce((s, d) => s + d._count.students, 0);
      const teacherCount = f.departments.reduce((s, d) => s + d._count.teachers, 0);
      const courseCount = f.departments.reduce((s, d) => s + d._count.courses, 0);
      return {
        id: f.id,
        name: f.name,
        nameEn: f.nameEn,
        iconEmoji: f.iconEmoji,
        city: f.city,
        departmentCount: f.departments.length,
        studentCount,
        teacherCount,
        courseCount,
      };
    });
    res.json({ data });
  } catch (e) { next(e); }
});

/**
 * GET /colleges/leaderboard
 * Inter-college comparison — sub-project C.
 *
 * For each faculty, aggregates the metrics that meaningfully compare colleges:
 * student count, teacher count, total student XP, published research papers,
 * exam attempts, and lab sessions. Returns one row per faculty + rank-per-metric
 * so the frontend can render medals without recomputing.
 */
router.get('/colleges/leaderboard', async (_req, res, next) => {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: {
        departments: { select: { id: true } },
      },
    });

    const rows = await Promise.all(
      faculties.map(async (f) => {
        const departmentIds = f.departments.map((d) => d.id);

        const [
          studentCount,
          teacherCount,
          xpAgg,
          publishedPapers,
          examAttempts,
          labSessions,
          completedEnrollments,
        ] = await Promise.all([
          prisma.studentProfile.count({ where: { facultyId: f.id } }),
          prisma.teacherProfile.count({ where: { departmentId: { in: departmentIds } } }),
          prisma.studentProfile.aggregate({
            where: { facultyId: f.id },
            _sum: { totalXp: true },
            _avg: { totalXp: true, gpa: true },
          }),
          prisma.researchPaper.count({
            where: {
              status: 'PUBLISHED',
              offering: { course: { departmentId: { in: departmentIds } } },
            },
          }),
          prisma.examAttempt.count({
            where: {
              template: { offering: { course: { departmentId: { in: departmentIds } } } },
            },
          }),
          prisma.labSession.count({
            where: {
              user: { studentProfile: { facultyId: f.id } },
            },
          }),
          prisma.enrollment.count({
            where: {
              student: { studentProfile: { facultyId: f.id } },
              progressPct: { gte: 100 },
            },
          }),
        ]);

        return {
          id: f.id,
          name: f.name,
          iconEmoji: f.iconEmoji,
          city: f.city,
          studentCount,
          teacherCount,
          totalXp: xpAgg._sum?.totalXp ?? 0,
          avgXp: Math.round(xpAgg._avg?.totalXp ?? 0),
          avgGpa: xpAgg._avg?.gpa ? Number(xpAgg._avg.gpa.toString()) : 0,
          publishedPapers,
          examAttempts,
          labSessions,
          completedEnrollments,
        };
      }),
    );

    // Helper: rank in descending order; ties get the same rank.
    const rankBy = (rs: { id: string }[], values: Record<string, number>): Record<string, number> => {
      const sorted = [...rs].sort((a, b) => (values[b.id] ?? 0) - (values[a.id] ?? 0));
      const rankMap: Record<string, number> = {};
      let prev: number | null = null;
      let rank = 0;
      sorted.forEach((r, i) => {
        const v = values[r.id] ?? 0;
        if (v !== prev) { rank = i + 1; prev = v; }
        rankMap[r.id] = rank;
      });
      return rankMap;
    };

    const ranks = {
      totalXp: rankBy(rows, Object.fromEntries(rows.map((r) => [r.id, r.totalXp]))),
      avgGpa: rankBy(rows, Object.fromEntries(rows.map((r) => [r.id, r.avgGpa]))),
      publishedPapers: rankBy(rows, Object.fromEntries(rows.map((r) => [r.id, r.publishedPapers]))),
      examAttempts: rankBy(rows, Object.fromEntries(rows.map((r) => [r.id, r.examAttempts]))),
      labSessions: rankBy(rows, Object.fromEntries(rows.map((r) => [r.id, r.labSessions]))),
      completedEnrollments: rankBy(rows, Object.fromEntries(rows.map((r) => [r.id, r.completedEnrollments]))),
    };

    res.json({
      data: {
        colleges: rows.map((r) => ({
          ...r,
          ranks: {
            totalXp: ranks.totalXp[r.id],
            avgGpa: ranks.avgGpa[r.id],
            publishedPapers: ranks.publishedPapers[r.id],
            examAttempts: ranks.examAttempts[r.id],
            labSessions: ranks.labSessions[r.id],
            completedEnrollments: ranks.completedEnrollments[r.id],
          },
        })),
      },
    });
  } catch (e) { next(e); }
});

/**
 * GET /colleges/:id
 * Per-college overview bundle. Single response with everything the page renders.
 */
router.get('/colleges/:id', async (req, res, next) => {
  try {
    const id = req.params.id!;
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: {
        departments: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            _count: { select: { students: true, teachers: true, courses: true } },
          },
        },
      },
    });
    if (!faculty) throw AppError.notFound('College not found');

    const departmentIds = faculty.departments.map((d) => d.id);
    const now = new Date();

    // Run aggregates in parallel — the bundle should be ~one DB round trip in wall time.
    const [
      leadership,
      topStudents,
      announcements,
      upcomingEvents,
      upcomingLive,
      activeCompetitions,
      teacherCount,
      studentCount,
    ] = await Promise.all([
      // 1) Leadership: dean(s), associate dean(s), department heads of this faculty.
      prisma.teacherProfile.findMany({
        where: {
          OR: [
            { positionFacultyId: id },
            { positionDepartmentId: { in: departmentIds } },
          ],
        },
        select: {
          position: true,
          appointedAt: true,
          user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarInitials: true } },
          positionDepartment: { select: { id: true, name: true } },
          positionFaculty: { select: { id: true, name: true } },
        },
        orderBy: { appointedAt: 'asc' },
      }),

      // 2) Top students by XP within this faculty.
      prisma.studentProfile.findMany({
        where: { facultyId: id },
        orderBy: { totalXp: 'desc' },
        take: 8,
        select: {
          totalXp: true,
          level: true,
          year: true,
          department: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarInitials: true } },
        },
      }),

      // 3) Recent announcements pinned at this faculty (or its departments).
      prisma.announcement.findMany({
        where: {
          OR: [
            { scope: AnnouncementScope.FACULTY, scopeId: id },
            { scope: AnnouncementScope.DEPARTMENT, scopeId: { in: departmentIds } },
          ],
        },
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: 6,
        select: {
          id: true, title: true, body: true, pinned: true, iconEmoji: true,
          publishedAt: true, scope: true,
          author: { select: { firstName: true, lastName: true } },
        },
      }),

      // 4) Upcoming events — campus-wide for now (no faculty FK on CampusEvent).
      // Filter by organizers from this faculty's leadership / teachers as an approximation.
      prisma.campusEvent.findMany({
        where: { startsAt: { gte: now } },
        orderBy: { startsAt: 'asc' },
        take: 4,
        select: {
          id: true, title: true, location: true, startsAt: true, endsAt: true,
          capacity: true, iconEmoji: true,
          _count: { select: { rsvps: true } },
        },
      }),

      // 5) Upcoming live sessions on offerings in this faculty's departments.
      prisma.liveSession.findMany({
        where: {
          offering: { course: { departmentId: { in: departmentIds } } },
          status: { in: ['SCHEDULED', 'LIVE'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true, title: true, topic: true, scheduledAt: true, status: true,
          teacher: { select: { firstName: true, lastName: true } },
          offering: { select: { course: { select: { name: true, code: true } } } },
        },
      }),

      // 6) Active competitions — the schema has no faculty FK; show all OPEN ones
      // and let the frontend label them as "platform-wide".
      prisma.competition.findMany({
        where: { status: CompetitionStatus.OPEN, deadline: { gte: now } },
        orderBy: { deadline: 'asc' },
        take: 4,
        select: {
          id: true, title: true, category: true, prize: true, deadline: true,
          iconEmoji: true, themeColor: true,
          _count: { select: { entries: true } },
        },
      }),

      prisma.user.count({
        where: {
          role: Role.TEACHER,
          teacherProfile: { departmentId: { in: departmentIds } },
        },
      }),
      prisma.user.count({
        where: {
          role: Role.STUDENT,
          studentProfile: { facultyId: id },
        },
      }),
    ]);

    res.json({
      data: {
        id: faculty.id,
        name: faculty.name,
        nameEn: faculty.nameEn,
        iconEmoji: faculty.iconEmoji,
        city: faculty.city,
        stats: {
          studentCount,
          teacherCount,
          departmentCount: faculty.departments.length,
          courseCount: faculty.departments.reduce((s, d) => s + d._count.courses, 0),
        },
        departments: faculty.departments.map((d) => ({
          id: d.id, name: d.name,
          studentCount: d._count.students,
          teacherCount: d._count.teachers,
          courseCount: d._count.courses,
        })),
        leadership: leadership.map((l) => ({
          position: l.position,
          appointedAt: l.appointedAt,
          user: l.user,
          department: l.positionDepartment,
          faculty: l.positionFaculty,
        })),
        topStudents,
        announcements,
        upcomingEvents,
        upcomingLive,
        activeCompetitions,
      },
    });
  } catch (e) { next(e); }
});

export default router;
