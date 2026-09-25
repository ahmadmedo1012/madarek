import { Router } from 'express';
import { Role, AnnouncementScope, CompetitionStatus } from '@prisma/client';
import { prisma } from '../../db.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
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
 *
 * Auth policy:
 *   - GET /colleges, GET /colleges/leaderboard are PUBLIC (audit
 *     4-A14 P1-2): the landing popover and the public gallery deep-link
 *     guests into both surfaces, so an auth wall dead-ends the marketing
 *     funnel with a retryable 401. The leaderboard is aggregate-only
 *     (college-level numbers, zero PII) — safe to open as-is.
 *   - GET /colleges/:id is public WITH PII narrowing: the bundle's
 *     topStudents carry student names (personal data), so unauthenticated
 *     requests get them through `anonymizeGuestUser` (given name + family
 *     initial); authenticated users keep the full names. Staff figures
 *     (leadership, announcement authors, live-session teachers) are
 *     university officials — their names are public information and are
 *     not narrowed.
 *   - Other authenticated routes elsewhere register auth middleware locally.
 */
const router = Router();

/**
 * GET /colleges  (PUBLIC)
 * Light list for the public index / homepage popover: name, emoji, city,
 * department / student / teacher / course counts. No PII; safe to expose.
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

// ── Leaderboard metric rollup (pure, unit-tested) ──────────────────
//
// The leaderboard compares faculties on seven metrics. Fetching them
// per-faculty meant 7 queries × every college (~176 with the 25-college
// registry — audit 11-c P1-6); the route now runs ONE aggregate per METRIC
// (groupBy) and folds the groups onto faculty ids in memory. The helpers
// below are that fold, kept pure so the null/zero/unattributable semantics
// are unit-testable without a DB.

/** Normalized per-faculty student aggregates — every aggregate null collapses to 0. */
export interface StudentAggregate {
  studentCount: number;
  totalXp: number;
  avgXp: number;
  avgGpa: number;
}

/**
 * Normalize one `studentProfile.groupBy(['facultyId'])` group. GPA averages
 * arrive as Prisma Decimal (null when the faculty has no students); `avgXp`
 * keeps the rounded-integer contract the frontend table renders.
 */
export function normalizeStudentAggregate(group: {
  _count: { _all: number };
  _sum: { totalXp: number | null };
  _avg: { totalXp: number | null; gpa: { toString(): string } | null };
}): StudentAggregate {
  return {
    studentCount: group._count._all,
    totalXp: group._sum.totalXp ?? 0,
    avgXp: Math.round(group._avg.totalXp ?? 0),
    avgGpa: group._avg.gpa ? Number(group._avg.gpa.toString()) : 0,
  };
}

/**
 * Fold counts keyed by K into counts keyed by F. Keys the resolver cannot
 * attribute (undefined) are dropped: a research paper with no offering, an
 * attempt on a template with no offering, or a lab session by a user with
 * no student profile belongs to no college and must count toward none —
 * the previous per-faculty relation filters skipped exactly these rows.
 */
export function rollupCounts<K, F>(
  countsByKey: ReadonlyMap<K, number>,
  resolve: (key: K) => F | undefined,
): Map<F, number> {
  const totals = new Map<F, number>();
  for (const [key, count] of countsByKey) {
    const target = resolve(key);
    if (target === undefined) continue;
    totals.set(target, (totals.get(target) ?? 0) + count);
  }
  return totals;
}

/**
 * One leaderboard row: faculty identity + the seven comparison metrics.
 * A faculty absent from a metric's rollup gets 0 — identical to what the
 * per-faculty `count()` calls of the N+1 version produced for empty faculties.
 */
export function buildLeaderboardRow(
  faculty: { id: string; name: string; iconEmoji: string | null; city: string },
  metrics: {
    students: StudentAggregate | undefined;
    teacherCount: number | undefined;
    publishedPapers: number | undefined;
    examAttempts: number | undefined;
    labSessions: number | undefined;
    completedEnrollments: number | undefined;
  },
) {
  return {
    id: faculty.id,
    name: faculty.name,
    iconEmoji: faculty.iconEmoji,
    city: faculty.city,
    studentCount: metrics.students?.studentCount ?? 0,
    teacherCount: metrics.teacherCount ?? 0,
    totalXp: metrics.students?.totalXp ?? 0,
    avgXp: metrics.students?.avgXp ?? 0,
    avgGpa: metrics.students?.avgGpa ?? 0,
    publishedPapers: metrics.publishedPapers ?? 0,
    examAttempts: metrics.examAttempts ?? 0,
    labSessions: metrics.labSessions ?? 0,
    completedEnrollments: metrics.completedEnrollments ?? 0,
  };
}

/** A person projection that carries a real name (user select shape). */
interface PersonName {
  firstName: string;
  lastName: string;
}

/**
 * Guest-safe projection of a person's name (audit 4-A14 P1-2): keeps the
 * given name, reduces the family name to its first letter + full stop
 * («أحمد المهدي» → «أحمد م.»). The Arabic definite article «ال» is
 * stripped first — most family names carry it and the bare alif it
 * leaves behind identifies nobody («أحمد ا.»). Pure so the narrowing
 * contract is unit-testable without a DB (colleges-public-access.test.ts).
 * Keys the caller passes in (id, avatarColor, …) pass through untouched.
 */
export function anonymizeGuestUser<U extends PersonName>(user: U): U {
  // Strip a leading «ال» only when a stem of ≥2 characters remains
  // (never strips a name that IS just «ال…»-plus-one-letter).
  const stem = user.lastName.trim().replace(/^ال(?=.{2})/, '');
  const initial = stem.charAt(0);
  return { ...user, lastName: initial ? `${initial}.` : '' };
}

/**
 * GET /colleges/leaderboard  (PUBLIC — aggregate-only, no PII)
 * Inter-college comparison — sub-project C.
 *
 * For each faculty, aggregates the metrics that meaningfully compare colleges:
 * student count, teacher count, total student XP, published research papers,
 * exam attempts, and lab sessions. Returns one row per faculty + rank-per-metric
 * so the frontend can render medals without recomputing.
 */
router.get('/colleges/leaderboard', async (_req, res, next) => {
  try {
    // Constant query count per request (~10), independent of college count.
    // Relation-keyed metrics (papers by offering, attempts by template,
    // labs/completions by user) are resolved to department/faculty ids in a
    // second, constant round of lookups and folded in memory. Counting
    // semantics are byte-identical to the previous per-faculty queries.
    const [
      faculties,
      studentGroups,
      teacherGroups,
      paperGroups,
      attemptGroups,
      labGroups,
      completionGroups,
    ] = await Promise.all([
      prisma.faculty.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          iconEmoji: true,
          city: true,
          departments: { select: { id: true } },
        },
      }),
      // Students + XP/GPA aggregates, keyed by home faculty.
      prisma.studentProfile.groupBy({
        by: ['facultyId'],
        _count: { _all: true },
        _sum: { totalXp: true },
        _avg: { totalXp: true, gpa: true },
      }),
      // Teacher profiles, keyed by home department.
      prisma.teacherProfile.groupBy({
        by: ['departmentId'],
        _count: { _all: true },
      }),
      // Published research papers, keyed by offering (resolved to the
      // offering's course department below — papers without an offering
      // stay unattributable, as before).
      prisma.researchPaper.groupBy({
        by: ['offeringId'],
        where: { status: 'PUBLISHED' },
        _count: { _all: true },
      }),
      // Exam attempts, keyed by template (resolved to the template's
      // offering → course department below).
      prisma.examAttempt.groupBy({
        by: ['templateId'],
        _count: { _all: true },
      }),
      // Lab sessions, keyed by user (resolved to the student's home faculty).
      prisma.labSession.groupBy({
        by: ['userId'],
        _count: { _all: true },
      }),
      // Completed enrollments, keyed by student (resolved to home faculty).
      prisma.enrollment.groupBy({
        by: ['studentId'],
        where: { progressPct: { gte: 100 } },
        _count: { _all: true },
      }),
    ]);

    // Resolve the relation-keyed groups — three constant lookups bounded by
    // the distinct keys in the group results (an empty `in: []` matches
    // nothing and is harmless).
    const paperOfferingIds = [
      ...new Set(paperGroups.flatMap((g) => (g.offeringId ? [g.offeringId] : []))),
    ];
    const attemptTemplateIds = [...new Set(attemptGroups.map((g) => g.templateId))];
    const activityUserIds = [
      ...new Set([
        ...labGroups.map((g) => g.userId),
        ...completionGroups.map((g) => g.studentId),
      ]),
    ];

    const [paperOfferings, attemptTemplates, activityUsers] = await Promise.all([
      prisma.courseOffering.findMany({
        where: { id: { in: paperOfferingIds } },
        select: { id: true, course: { select: { departmentId: true } } },
      }),
      prisma.examTemplate.findMany({
        where: { id: { in: attemptTemplateIds } },
        select: { id: true, offering: { select: { course: { select: { departmentId: true } } } } },
      }),
      // One lookup resolves BOTH lab users and enrollment students to
      // their home faculty.
      prisma.user.findMany({
        where: { id: { in: activityUserIds } },
        select: { id: true, studentProfile: { select: { facultyId: true } } },
      }),
    ]);

    const deptToFaculty = new Map(
      faculties.flatMap((f) => f.departments.map((d) => [d.id, f.id] as const)),
    );
    const offeringToDept = new Map(paperOfferings.map((o) => [o.id, o.course.departmentId] as const));
    const templateToDept = new Map(attemptTemplates.map((t) => [t.id, t.offering?.course.departmentId] as const));
    const userToFaculty = new Map(activityUsers.map((u) => [u.id, u.studentProfile?.facultyId] as const));

    const studentsByFaculty = new Map(
      studentGroups.map((g) => [g.facultyId, normalizeStudentAggregate(g)] as const),
    );
    const teachersByFaculty = rollupCounts(
      new Map(teacherGroups.map((g) => [g.departmentId, g._count._all] as const)),
      (departmentId) => deptToFaculty.get(departmentId),
    );
    const papersByFaculty = rollupCounts(
      new Map(paperGroups.map((g) => [g.offeringId, g._count._all] as const)),
      (offeringId) => {
        if (offeringId === null) return undefined;
        const departmentId = offeringToDept.get(offeringId);
        return departmentId === undefined ? undefined : deptToFaculty.get(departmentId);
      },
    );
    const attemptsByFaculty = rollupCounts(
      new Map(attemptGroups.map((g) => [g.templateId, g._count._all] as const)),
      (templateId) => {
        const departmentId = templateToDept.get(templateId);
        return departmentId === undefined ? undefined : deptToFaculty.get(departmentId);
      },
    );
    const labsByFaculty = rollupCounts(
      new Map(labGroups.map((g) => [g.userId, g._count._all] as const)),
      (userId) => userToFaculty.get(userId) ?? undefined,
    );
    const completionsByFaculty = rollupCounts(
      new Map(completionGroups.map((g) => [g.studentId, g._count._all] as const)),
      (studentId) => userToFaculty.get(studentId) ?? undefined,
    );

    const rows = faculties.map((f) =>
      buildLeaderboardRow(
        { id: f.id, name: f.name, iconEmoji: f.iconEmoji, city: f.city },
        {
          students: studentsByFaculty.get(f.id),
          teacherCount: teachersByFaculty.get(f.id),
          publishedPapers: papersByFaculty.get(f.id),
          examAttempts: attemptsByFaculty.get(f.id),
          labSessions: labsByFaculty.get(f.id),
          completedEnrollments: completionsByFaculty.get(f.id),
        },
      ),
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
 * GET /colleges/:id  (public with PII narrowing — see the auth-policy
 * note at the top of this file)
 * Per-college overview bundle. Single response with everything the page renders.
 */
router.get('/colleges/:id', optionalAuthMiddleware, async (req, res, next) => {
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
    if (!faculty) throw AppError.notFound('الكلّيّة غير موجودة');

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

      // 2) Top students by XP within this faculty. userId tiebreak: with
      // many equal-XP students (e.g. a fresh cohort at 0 XP) an unbounded
      // tie order makes the take-8 subset flicker between requests.
      prisma.studentProfile.findMany({
        where: { facultyId: id },
        orderBy: [{ totalXp: 'desc' }, { userId: 'asc' }],
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

    // Guest narrowing (audit 4-A14 P1-2): anonymous visitors keep the
    // bundle — the section survives the public funnel — but student
    // names are projected to given name + family initial. Authenticated
    // users (any role) keep the full names.
    const isGuest = !req.user;
    const topStudentsOut = isGuest
      ? topStudents.map((s) => ({ ...s, user: anonymizeGuestUser(s.user) }))
      : topStudents;

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
        topStudents: topStudentsOut,
        announcements,
        upcomingEvents,
        upcomingLive,
        activeCompetitions,
      },
    });
  } catch (e) { next(e); }
});

export default router;
