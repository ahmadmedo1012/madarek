import { Router } from 'express';
import { Role, SyncRunStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';
import {
  assertNotLastActiveOwner,
  buildTeacherProvision,
  lockActiveOwnerRows,
  planTeacherProvisioning,
  requiresLastOwnerGuard,
} from '../../lib/governance.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole(Role.OWNER));

// ── GET /owner/stats — platform-wide statistics ──────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalUsers,
      students,
      teachers,
      admins,
      quality,
      owners,
      totalCourses,
      totalOfferings,
      totalEnrollments,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { role: Role.QUALITY } }),
      prisma.user.count({ where: { role: Role.OWNER } }),
      prisma.course.count(),
      prisma.courseOffering.count(),
      prisma.enrollment.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.json({
      data: {
        totalUsers,
        students,
        teachers,
        admins,
        quality,
        owners,
        totalCourses,
        totalOfferings,
        totalEnrollments,
        recentAuditLogs,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/users — paginated user list ───────────────────────
router.get(
  '/users',
  validate(paginationSchema.extend({ role: z.nativeEnum(Role).optional() }), 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q, role } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        role?: Role;
      };
      const where = {
        ...(role ? { role } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                { firstName: { contains: q, mode: 'insensitive' as const } },
                { lastName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            avatarColor: true,
            avatarInitials: true,
            isActive: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/activity — paginated audit log ────────────────────
router.get(
  '/activity',
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.auditLog.count(),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

// ── POST /owner/users/:id/role — change user role ────────────────
/**
 * Optional provisioning payload for TEACHER promotions:
 * a TeacherProfile needs a home department; we default to the student's
 * current department when promoting STUDENT→TEACHER, but allow an explicit
 * override for every other promotion path.
 */
export const changeRoleSchema = z
  .object({
    role: z.nativeEnum(Role),
    departmentId: z.string().cuid().optional(),
    specialty: z.string().min(2).max(120).optional(),
  })
  .strict();

export const toggleStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const upsertSettingSchema = z
  .object({
    // Caps match the :key param's rigor — without them a single 1 MB
    // JSON body becomes a 1 MB setting row (audit 11-c P2-15).
    value: z.string().max(2000),
    category: z.string().max(40).optional(),
  })
  .strict();

export const toggleFlagSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

/** Platform-setting key: lowercase identifier-ish tokens only. */
export const settingKeySchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9_.:-]+$/i, 'Setting key must be alphanumeric/dot/dash/colon/underscore');

/**
 * Last-active-OWNER protection is shared with the admin governance
 * paths via `lib/governance.ts` (assertNotLastActiveOwner decides,
 * requiresLastOwnerGuard says when it applies) — the ADMIN and OWNER
 * paths can no longer diverge on this semantics (audit 11-c P0-1).
 *
 * TOCTOU serialization for that guard is shared too: the promoted
 * `lockActiveOwnerRows` (governance.ts, audit 15-b P1-1) locks every
 * active OWNER row FOR UPDATE inside the mutation transaction, before
 * the guard's count — so the ADMIN paths and this console serialize
 * against each other instead of only against themselves.
 */

router.post(
  '/users/:id/role',
  validate(changeRoleSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id!;
      const { role, departmentId, specialty } = req.body as {
        role: Role;
        departmentId?: string;
        specialty?: string;
      };

      // Self-demotion guard
      if (id === req.user!.id) {
        throw AppError.forbidden('Cannot change your own role');
      }

      // OWNER promotion guard
      if (role === Role.OWNER) {
        throw AppError.forbidden('Cannot promote to OWNER via API');
      }

      const user = await prisma.user.findUnique({
        where: { id },
        include: { studentProfile: { select: { departmentId: true } }, teacherProfile: { select: { userId: true } } },
      });
      if (!user) throw AppError.notFound('User not found');

      const oldRole = user.role;

      // ── Profile provisioning for TEACHER promotions ────────────
      // Shared semantics with the admin path (lib/governance.ts): a
      // STUDENT→TEACHER promotion previously left the user with NO
      // TeacherProfile, so every teacher surface 404'd. The profile is
      // created in the SAME transaction as the role change; demotions
      // keep profile data intact (read routes 403 non-teachers) — no
      // dangling state is created either way.
      const provisionPlan = planTeacherProvisioning({
        newRole: role,
        oldRole,
        hasTeacherProfile: Boolean(user.teacherProfile),
        explicitDepartmentId: departmentId ?? null,
        studentDepartmentId: user.studentProfile?.departmentId ?? null,
      });
      if (provisionPlan.kind === 'missing-department') {
        throw AppError.badRequest(
          'Promotion to TEACHER requires a home department — pass departmentId (or promote from a student profile that has one)',
        );
      }
      const teacherProvision =
        provisionPlan.kind === 'create' ? buildTeacherProvision(id, provisionPlan, specialty) : null;

      // Role + guard + provisioning + audit atomically; tokenVersion
      // bump kills the target's outstanding refresh tokens so stale
      // JWTs with the old role can't be refreshed back into use. The
      // last-owner guard runs INSIDE the transaction, after the owner
      // row locks — demoting/modifying the sole active OWNER would
      // lock the platform out of its master governance role.
      const updated = await prisma.$transaction(async (tx) => {
        if (requiresLastOwnerGuard({ targetRole: oldRole, newRole: role })) {
          await lockActiveOwnerRows(tx);
          await assertNotLastActiveOwner(id, tx);
        }
        const u = await tx.user.update({
          where: { id },
          data: { role, tokenVersion: { increment: 1 } },
          select: { id: true, role: true },
        });
        if (teacherProvision) await teacherProvision(tx);
        await tx.auditLog.create({
          data: {
            action: 'ROLE_CHANGE',
            resourceType: 'User',
            resourceId: id,
            userId: req.user!.id,
            metadata: {
              oldRole,
              newRole: role,
              source: 'owner',
              ...(teacherProvision ? { teacherProfileProvisioned: true } : {}),
            },
          },
        });
        return u;
      });

      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── PATCH /owner/users/:id/status — toggle isActive ──────────────

router.patch(
  '/users/:id/status',
  validate(toggleStatusSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id!;
      const { isActive } = req.body as { isActive: boolean };

      // Self-deactivation guard — re-activation stays allowed: an
      // OWNER re-activating their own previously deactivated account
      // is a recovery, not a lockout risk (same shape as
      // users.routes.ts). Blocking every self status change made
      // recovery impossible (audit 11-c P2-15).
      if (!isActive && id === req.user!.id) {
        throw AppError.forbidden('Cannot deactivate your own account');
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, isActive: true },
      });
      if (!user) throw AppError.notFound('User not found');

      // Guard + mutation + audit atomically. Deactivating the last
      // active OWNER = governance lockout, so the guard (and its row
      // locks) share the mutation's transaction (audit 11-c P2-15
      // TOCTOU). The tokenVersion bump on deactivation kills the
      // target's refresh tokens: a deactivated account must not keep a
      // live 7-day session (parity with users.routes.ts — activation
      // revokes nothing, so a re-activation is not a logout event).
      const deactivatesOwner = requiresLastOwnerGuard({
        targetRole: user.role,
        newIsActive: isActive,
      });
      const updated = await prisma.$transaction(async (tx) => {
        if (deactivatesOwner) {
          await lockActiveOwnerRows(tx);
          await assertNotLastActiveOwner(id, tx);
        }
        const u = await tx.user.update({
          where: { id },
          data: {
            isActive,
            ...(isActive ? {} : { tokenVersion: { increment: 1 } }),
          },
          select: { id: true, isActive: true },
        });
        await tx.auditLog.create({
          data: {
            action: 'STATUS_CHANGE',
            resourceType: 'User',
            resourceId: id,
            userId: req.user!.id,
            metadata: { isActive },
          },
        });
        return u;
      });

      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/education — aggregate for the Education page ────

/** Top-course row shape (SQL aggregation over Course→Offering→Enrollment). */
interface TopCourseRow {
  code: string;
  name: string;
  facultyName: string;
  enrolled: number;
}

/** Row shape of the per-month attendance SQL aggregation. */
export interface AttendanceMonthRow {
  month: Date;
  samples: number;
  present: number;
}

/** ar-LY calendar month name for a bucket start (Education page labels). */
const monthLabel = (d: Date) => d.toLocaleDateString('ar-LY', { month: 'long' });

/**
 * Pure transform: fold the SQL per-month attendance aggregates into the
 * fixed 6-bucket trend the Education page renders (the current month
 * plus the five before it — always six entries, oldest first). A month
 * with no records keeps `attendancePct: null` so the chart renders a
 * gap, not a fake 0%. Rows are normalized to their UTC month start —
 * exactly what the SQL date_trunc('month', …) grouping produces.
 */
export function buildAttendanceTrend(
  now: Date,
  rows: AttendanceMonthRow[],
): Array<{ month: string; attendancePct: number | null; samples: number }> {
  const byMonthStart = new Map<number, AttendanceMonthRow>();
  for (const row of rows) {
    const m = new Date(row.month);
    byMonthStart.set(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1), row);
  }
  const trend: Array<{ month: string; attendancePct: number | null; samples: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const row = byMonthStart.get(start.getTime());
    trend.push({
      month: monthLabel(start),
      attendancePct:
        row && row.samples > 0 ? Math.round((row.present / row.samples) * 100) : null,
      samples: row?.samples ?? 0,
    });
  }
  return trend;
}

/**
 * Pure transform: fold the per-teacher offering counts (SQL groupBy
 * rows) into the workload distribution. `teacherCount` is the total
 * TEACHER-role count — teachers with zero offerings form the idle
 * bucket, clamped at 0 for the anomalous case of offerings held by
 * non-teacher rows.
 */
export function bucketTeacherWorkload(
  offeringsPerTeacher: number[],
  teacherCount: number,
): { idle: number; one: number; two: number; three: number; fourPlus: number } {
  const buckets = { idle: 0, one: 0, two: 0, three: 0, fourPlus: 0 };
  for (const n of offeringsPerTeacher) {
    if (n === 1) buckets.one += 1;
    else if (n === 2) buckets.two += 1;
    else if (n === 3) buckets.three += 1;
    else if (n >= 4) buckets.fourPlus += 1;
  }
  buckets.idle = Math.max(0, teacherCount - offeringsPerTeacher.length);
  return buckets;
}

/**
 * Everything heavy is aggregated in SQL: the previous implementation
 * hydrated the ENTIRE Course table (with per-offering enrollment
 * counts) plus every AttendanceRecord of the last six months on each
 * request to bucket them in JS (audit 11-c P1-7 — the worst page in
 * the platform on day one of real usage).
 */
router.get('/education', async (_req, res, next) => {
  try {
    const now = new Date();
    // Six calendar months INCLUDING the current one. UTC month starts
    // so the JS bucket keys match the SQL date_trunc('month', …).
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [
      totalCourses,
      totalOfferings,
      teachers,
      totalEnrollments,
      faculties,
      topCourses,
      teacherOfferings,
      attendanceRows,
    ] = await Promise.all([
      prisma.course.count(),
      prisma.courseOffering.count(),
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.enrollment.count(),
      prisma.faculty.findMany({
        orderBy: { name: 'asc' },
        include: { departments: { select: { _count: { select: { courses: true } } } } },
      }),
      // Top 8 courses by total enrolments across their offerings,
      // aggregated in SQL (LEFT JOINs keep zero-enrolment courses
      // rankable, matching the previous in-memory semantics; the code
      // tiebreaker replaces the previous unspecified order).
      prisma.$queryRaw<TopCourseRow[]>`
        SELECT c."code" AS "code",
               c."name" AS "name",
               f."name" AS "facultyName",
               COUNT(e."id")::int AS "enrolled"
        FROM "Course" c
        JOIN "Department" d ON d."id" = c."departmentId"
        JOIN "Faculty" f ON f."id" = d."facultyId"
        LEFT JOIN "CourseOffering" o ON o."courseId" = c."id"
        LEFT JOIN "Enrollment" e ON e."offeringId" = o."id"
        GROUP BY c."id", c."code", c."name", f."name"
        ORDER BY "enrolled" DESC, c."code" ASC
        LIMIT 8`,
      prisma.courseOffering.groupBy({
        by: ['teacherId'],
        _count: { teacherId: true },
      }),
      // Per-month attendance aggregates (PRESENT|LATE counts as
      // attended) — the six-month trend without hydrating records.
      prisma.$queryRaw<AttendanceMonthRow[]>`
        SELECT date_trunc('month', s."date") AS "month",
               COUNT(*)::int AS "samples",
               COUNT(*) FILTER (WHERE r."status" IN ('PRESENT', 'LATE'))::int AS "present"
        FROM "AttendanceRecord" r
        JOIN "AttendanceSession" s ON s."id" = r."sessionId"
        WHERE s."date" >= ${sixMonthsAgo}
        GROUP BY 1`,
    ]);

    const avgEnrolment = totalOfferings > 0 ? +(totalEnrollments / totalOfferings).toFixed(1) : 0;

    const byFaculty = faculties
      .map((f) => ({
        name: f.name,
        courseCount: f.departments.reduce((s, d) => s + d._count.courses, 0),
      }))
      .sort((a, b) => b.courseCount - a.courseCount)
      .slice(0, 8);

    const workloadBuckets = bucketTeacherWorkload(
      teacherOfferings.map((t) => t._count.teacherId),
      teachers,
    );

    const attendanceTrend = buildAttendanceTrend(now, attendanceRows);

    res.json({
      data: {
        totals: { totalCourses, totalOfferings, teachers, avgEnrolment },
        byFaculty,
        topCourses,
        workloadBuckets,
        attendanceTrend,
      },
    });
  } catch (e) { next(e); }
});

// ── GET /owner/system — operational telemetry for the System page ─

/** Row shape the sync feed needs from the SyncRun table (a full row). */
export interface SyncRunFeedRow {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  status: SyncRunStatus;
  source: string;
  factsAdded: number;
  factsUpdated: number;
  errorMsg: string | null;
  durationMs: number | null;
  notes: string | null;
}

/**
 * Feed entry the System page consumes — shape-compatible with the
 * previous AuditLog-derived feed (`useOwner.ts` OwnerSystem.sync.recent
 * pins id / action / at / actor / metadata).
 */
export interface SyncFeedEntry {
  id: string;
  action: string;
  at: Date;
  actor: string;
  metadata: {
    status: SyncRunStatus;
    source: string;
    factsAdded: number;
    factsUpdated: number;
    durationMs: number | null;
    completedAt: Date | null;
    errorMsg: string | null;
    notes: string | null;
  };
}

/**
 * Actor shown for every run: syncs are system-initiated (the scheduler
 * tick or the overlap-guarded manual trigger) — SyncRun carries no
 * user attribution, and the manual trigger's label is not persisted.
 */
export const SYNC_FEED_ACTOR = 'النظام';

/**
 * Map a SyncRun status onto the sync-feed action vocabulary. The
 * System page's label map knows exactly three actions — 'sync.run',
 * 'sync.partial', 'sync.failed' — so the feed derives `action` from
 * the REAL run status instead of the AuditLog 'sync.' prefix no code
 * path ever writes (audit 15-a P1-5):
 *  - SUCCESS → 'sync.run'   (every run is a full sync — runSync has
 *    no partial semantics)
 *  - FAILED  → 'sync.failed'
 *  - PARTIAL → 'sync.partial' (enum value reserved; runSync never
 *    writes it today)
 *  - RUNNING → 'sync.partial' — an in-flight run is neither a success
 *    nor a failure; the amber not-complete rendering is the honest
 *    interim state (bounded: syncs complete in seconds, and the
 *    stale-run reaper auto-fails orphaned RUNNING rows after 15 min).
 */
export function syncRunAction(status: SyncRunStatus): 'sync.run' | 'sync.partial' | 'sync.failed' {
  switch (status) {
    case SyncRunStatus.SUCCESS:
      return 'sync.run';
    case SyncRunStatus.FAILED:
      return 'sync.failed';
    default:
      return 'sync.partial';
  }
}

/**
 * Pure transform: SyncRun row → System-page feed entry. `at` is the
 * run's start (the admin sync view orders by startedAt too), and
 * `metadata` carries the run's outcome detail for diagnosis.
 */
export function toSyncFeedEntry(run: SyncRunFeedRow): SyncFeedEntry {
  return {
    id: run.id,
    action: syncRunAction(run.status),
    at: run.startedAt,
    actor: SYNC_FEED_ACTOR,
    metadata: {
      status: run.status,
      source: run.source,
      factsAdded: run.factsAdded,
      factsUpdated: run.factsUpdated,
      durationMs: run.durationMs,
      completedAt: run.completedAt,
      errorMsg: run.errorMsg,
      notes: run.notes,
    },
  };
}

router.get('/system', async (_req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [recentSyncRuns, openAlerts, criticalAlertCount, auditCountLast7Days] = await Promise.all([
      // Last 10 REAL sync runs from the SyncRun table the scheduler
      // and the guarded manual trigger write (audit 15-a P1-5). The
      // previous feed was derived from AuditLog rows with an action
      // prefixed 'sync.' — an action string no code path ever writes
      // (syncs record themselves as SyncRun rows, not audit rows), so
      // lastRunAt was permanently null and recent permanently empty
      // while real runs existed. Ordered by startedAt desc — [0] is
      // the latest run, which is what lastRunAt reports.
      prisma.syncRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.operationalAlert.findMany({
        where: { resolvedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, severity: true, category: true, title: true, message: true,
          createdAt: true, metadata: true,
        },
      }),
      prisma.operationalAlert.count({
        where: { resolvedAt: null, severity: { in: ['critical', 'error'] } },
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    const lastSyncRun = recentSyncRuns[0] ?? null;

    res.json({
      data: {
        sync: {
          lastRunAt: lastSyncRun?.startedAt ?? null,
          recent: recentSyncRuns.map(toSyncFeedEntry),
        },
        alerts: {
          open: openAlerts,
          openCount: openAlerts.length,
          criticalCount: criticalAlertCount,
        },
        activity: {
          recentEventsLast7Days: auditCountLast7Days,
        },
      },
    });
  } catch (e) { next(e); }
});

// ── GET /owner/realtime — live metrics snapshot ──────────────────
router.get('/realtime', async (_req, res, next) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [activeSessions, recentAiMessages, liveBroadcasts, activeExams] = await Promise.all([
      prisma.liveSession.count({ where: { status: { in: ['SCHEDULED', 'LIVE'] } } }),
      prisma.aiMessage.count({ where: { createdAt: { gte: fiveMinAgo } } }),
      prisma.liveSession.count({ where: { status: 'LIVE' } }),
      prisma.examAttempt.count({ where: { status: 'IN_PROGRESS' } }),
    ]);

    res.json({
      data: {
        activeSessions,
        aiRequestsPerMin: Math.round(recentAiMessages / 5),
        liveBroadcasts,
        activeExams,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/ai-metrics — AI telemetry aggregates ──────────────
router.get('/ai-metrics', async (_req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totals, byFeatureRaw, trend, successCount] = await Promise.all([
      prisma.aiTelemetry.aggregate({
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
        _avg: { latencyMs: true },
      }),
      prisma.aiTelemetry.groupBy({
        by: ['feature'],
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      // Daily request counts aggregated in SQL — the previous version
      // hydrated every 7-day telemetry row just to bucket it by day in
      // JS (same unbounded-load defect class as login-analytics,
      // audit 11-c P1-8). Already the exact response shape.
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT to_char("createdAt", 'YYYY-MM-DD') AS "date", COUNT(*)::int AS "count"
        FROM "AiTelemetry"
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY 1
        ORDER BY 1`,
      prisma.aiTelemetry.count({ where: { success: true } }),
    ]);

    const totalCount = totals._count._all;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    // Transform byFeature into { feature, count, tokens }[]
    const byFeature = byFeatureRaw.map((f) => ({
      feature: f.feature,
      count: f._count._all,
      tokens: (f._sum.inputTokens || 0) + (f._sum.outputTokens || 0),
    }));

    res.json({
      data: {
        totalRequests: totalCount,
        totalTokens: (totals._sum.inputTokens || 0) + (totals._sum.outputTokens || 0),
        successRate,
        avgLatencyMs: totals._avg.latencyMs || 0,
        byFeature,
        trend,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/alerts — unresolved operational alerts ────────────
router.get('/alerts', async (_req, res, next) => {
  try {
    const data = await prisma.operationalAlert.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ── POST /owner/alerts/:id/resolve — resolve an alert ────────────
router.post('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const alert = await prisma.operationalAlert.findUnique({ where: { id } });
    if (!alert) throw AppError.notFound('Alert not found');
    // Idempotency guard: re-resolving would silently overwrite the
    // original resolution timestamp and resolver with no new
    // information (audit 11-c P2-15).
    if (alert.resolvedAt) {
      throw AppError.conflict('Alert is already resolved');
    }

    // Resolution + audit atomically — a crash between the two must
    // not leave a resolved alert with no trail (audit 11-c P2-9).
    const updated = await prisma.$transaction(async (tx) => {
      const a = await tx.operationalAlert.update({
        where: { id },
        data: { resolvedAt: new Date(), resolvedBy: req.user!.id },
      });
      await tx.auditLog.create({
        data: {
          action: 'ALERT_RESOLVED',
          resourceType: 'OperationalAlert',
          resourceId: id,
          userId: req.user!.id,
          metadata: { severity: alert.severity, title: alert.title },
        },
      });
      return a;
    });

    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/login-analytics — login event aggregates ──────────

/** Row shape of the per-day login SQL aggregation (UTC day buckets). */
interface LoginDailyRow {
  date: string;
  success: number;
  failure: number;
}

router.get('/login-analytics', async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // One SQL aggregation replaces three COUNT queries plus a full
    // 30-day row hydration: LoginEvent is attacker-inflatable (every
    // failed login attempt writes a row), so this page must never
    // materialize the rows (audit 11-c P1-8). Day buckets are UTC
    // (to_char on a timestamp column renders the stored UTC value),
    // identical to the previous toISOString().slice(0, 10) keys.
    const [daily, topReasonsRaw] = await Promise.all([
      prisma.$queryRaw<LoginDailyRow[]>`
        SELECT to_char("createdAt", 'YYYY-MM-DD') AS "date",
               COUNT(*) FILTER (WHERE "success")::int AS "success",
               COUNT(*) FILTER (WHERE NOT "success")::int AS "failure"
        FROM "LoginEvent"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY 1
        ORDER BY 1`,
      prisma.loginEvent.groupBy({
        by: ['reason'],
        where: { createdAt: { gte: thirtyDaysAgo }, success: false, reason: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { reason: 'desc' } },
        take: 10,
      }),
    ]);

    // Totals fold the same daily buckets — success is a non-nullable
    // boolean, so success + failure partitions the window exactly
    // like the previous three COUNT queries did.
    const total = daily.reduce((s, r) => s + r.success + r.failure, 0);
    const successCount = daily.reduce((s, r) => s + r.success, 0);
    const failureCount = daily.reduce((s, r) => s + r.failure, 0);

    // Transform topReasons from Prisma groupBy shape
    const topReasons = topReasonsRaw.map((r) => ({
      reason: r.reason as string,
      count: r._count._all,
    }));

    res.json({
      data: {
        total,
        successCount,
        failureCount,
        daily,
        topReasons,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/settings — all platform settings ──────────────────
router.get('/settings', async (_req, res, next) => {
  try {
    const data = await prisma.platformSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ── PUT /owner/settings/:key — upsert a platform setting ─────────

router.put(
  '/settings/:key',
  validate(upsertSettingSchema),
  async (req, res, next) => {
    try {
      const key = req.params.key!;
      // Upserting an unvalidated key would let callers CREATE arbitrary
      // junk rows (the upsert's create branch has no other gate).
      const parsedKey = settingKeySchema.safeParse(key);
      if (!parsedKey.success) {
        throw AppError.badRequest('Invalid setting key', parsedKey.error.flatten());
      }
      const { value, category } = req.body as { value: string; category?: string };

      // Upsert + audit atomically — a crash between the two must not
      // leave a silent setting change with no trail (audit 11-c P2-9).
      const data = await prisma.$transaction(async (tx) => {
        const s = await tx.platformSetting.upsert({
          where: { key },
          create: { key, value, category: category || 'general', updatedBy: req.user!.id },
          update: { value, ...(category ? { category } : {}), updatedBy: req.user!.id },
        });
        await tx.auditLog.create({
          data: {
            action: 'SETTING_UPDATED',
            resourceType: 'PlatformSetting',
            resourceId: key,
            userId: req.user!.id,
            metadata: { key, value, category },
          },
        });
        return s;
      });

      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/feature-flags — all feature flags ─────────────────
router.get('/feature-flags', async (_req, res, next) => {
  try {
    const data = await prisma.featureFlag.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ── PUT /owner/feature-flags/:slug — toggle a feature flag ───────

router.put(
  '/feature-flags/:slug',
  validate(toggleFlagSchema),
  async (req, res, next) => {
    try {
      const { slug } = req.params;
      const { enabled } = req.body as { enabled: boolean };

      const flag = await prisma.featureFlag.findUnique({ where: { slug } });
      if (!flag) throw AppError.notFound('Feature flag not found');

      // Toggle + audit atomically; previousState comes from the same
      // read that proved the flag exists (audit 11-c P2-9).
      const data = await prisma.$transaction(async (tx) => {
        const f = await tx.featureFlag.update({
          where: { slug },
          data: { enabled, updatedBy: req.user!.id },
        });
        await tx.auditLog.create({
          data: {
            action: 'FEATURE_FLAG_TOGGLED',
            resourceType: 'FeatureFlag',
            resourceId: slug,
            userId: req.user!.id,
            metadata: { slug, enabled, previousState: flag.enabled },
          },
        });
        return f;
      });

      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/governance — governance overview metrics ───────────
router.get('/governance', async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [permissionChanges, roleChanges, newUsersThisMonth, weeklyGrowth] = await Promise.all([
      prisma.userPermission.count({
        where: { grantedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.auditLog.count({
        where: { action: 'ROLE_CHANGE', createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Weekly signup buckets aggregated in SQL — date_trunc('week')
      // is ISO Monday-start, matching the previous JS bucketing,
      // without hydrating every 8-week signup row (same unbounded-load
      // defect class as login-analytics, audit 11-c P1-8).
      prisma.$queryRaw<{ week: string; count: number }[]>`
        SELECT to_char(date_trunc('week', "createdAt"), 'YYYY-MM-DD') AS "week", COUNT(*)::int AS "count"
        FROM "User"
        WHERE "createdAt" >= ${eightWeeksAgo}
        GROUP BY 1
        ORDER BY 1`,
    ]);

    res.json({
      data: {
        permissionChanges,
        roleChanges,
        newUsersThisMonth,
        weeklyGrowth,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
