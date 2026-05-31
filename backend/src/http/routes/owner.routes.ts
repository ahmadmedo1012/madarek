import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole(Role.OWNER));

// ── GET /owner/stats — platform-wide statistics ──────────────────
router.get('/owner/stats', async (_req, res, next) => {
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
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'QUALITY' } }),
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
  '/owner/users',
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
  '/owner/activity',
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
const changeRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

router.post(
  '/owner/users/:id/role',
  validate(changeRoleSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body as { role: Role };

      // Self-demotion guard
      if (id === req.user!.id) {
        throw AppError.forbidden('Cannot change your own role');
      }

      // OWNER promotion guard
      if (role === Role.OWNER) {
        throw AppError.forbidden('Cannot promote to OWNER via API');
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw AppError.notFound('User not found');

      const oldRole = user.role;

      const updated = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, role: true },
      });

      // Audit logging
      await prisma.auditLog.create({
        data: {
          action: 'ROLE_CHANGE',
          resourceType: 'User',
          resourceId: id,
          userId: req.user!.id,
          metadata: { oldRole, newRole: role },
        },
      });

      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── PATCH /owner/users/:id/status — toggle isActive ──────────────
const toggleStatusSchema = z.object({
  isActive: z.boolean(),
});

router.patch(
  '/owner/users/:id/status',
  validate(toggleStatusSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body as { isActive: boolean };

      // Self-deactivation guard
      if (id === req.user!.id) {
        throw AppError.forbidden('Cannot deactivate your own account');
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw AppError.notFound('User not found');

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: { id: true, isActive: true },
      });

      // Audit logging
      await prisma.auditLog.create({
        data: {
          action: 'STATUS_CHANGE',
          resourceType: 'User',
          resourceId: id,
          userId: req.user!.id,
          metadata: { isActive },
        },
      });

      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/education — aggregate for the Education page ────
router.get('/owner/education', async (_req, res, next) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [totalCourses, totalOfferings, teachers, totalEnrollments] = await Promise.all([
      prisma.course.count(),
      prisma.courseOffering.count(),
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.enrollment.count(),
    ]);
    const avgEnrolment = totalOfferings > 0 ? +(totalEnrollments / totalOfferings).toFixed(1) : 0;

    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: { departments: { select: { _count: { select: { courses: true } } } } },
    });
    const byFaculty = faculties
      .map((f) => ({
        name: f.name,
        courseCount: f.departments.reduce((s, d) => s + d._count.courses, 0),
      }))
      .sort((a, b) => b.courseCount - a.courseCount)
      .slice(0, 8);

    const courses = await prisma.course.findMany({
      include: {
        department: { select: { faculty: { select: { name: true } } } },
        offerings: { select: { _count: { select: { enrollments: true } } } },
      },
    });
    const topCourses = courses
      .map((c) => ({
        code: c.code,
        name: c.name,
        facultyName: c.department.faculty.name,
        enrolled: c.offerings.reduce((s, o) => s + o._count.enrollments, 0),
      }))
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, 8);

    const teacherOfferings = await prisma.courseOffering.groupBy({
      by: ['teacherId'],
      _count: { teacherId: true },
    });
    const buckets = { one: 0, two: 0, three: 0, fourPlus: 0 };
    for (const t of teacherOfferings) {
      const n = t._count.teacherId;
      if (n === 1) buckets.one++;
      else if (n === 2) buckets.two++;
      else if (n === 3) buckets.three++;
      else if (n >= 4) buckets.fourPlus++;
    }
    const teachingTeacherCount = teacherOfferings.length;
    const idle = Math.max(0, teachers - teachingTeacherCount);
    const workloadBuckets = { idle, one: buckets.one, two: buckets.two, three: buckets.three, fourPlus: buckets.fourPlus };

    const allRecent = await prisma.attendanceRecord.findMany({
      where: { session: { date: { gte: sixMonthsAgo } } },
      select: { status: true, session: { select: { date: true } } },
    });
    const monthLabel = (d: Date) => d.toLocaleDateString('ar-LY', { month: 'long' });
    const attendanceTrend: Array<{ month: string; attendancePct: number | null; samples: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const inMonth = allRecent.filter((r) => r.session.date >= start && r.session.date < end);
      const present = inMonth.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      attendanceTrend.push({
        month: monthLabel(start),
        attendancePct: inMonth.length > 0 ? Math.round((present / inMonth.length) * 100) : null,
        samples: inMonth.length,
      });
    }

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
router.get('/owner/system', async (_req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      recentSyncRuns,
      lastSyncEntry,
      openAlerts,
      criticalAlertCount,
      auditCountLast7Days,
    ] = await Promise.all([
      // Last 10 sync runs derived from AuditLog (action prefixed with "sync.")
      prisma.auditLog.findMany({
        where: { action: { startsWith: 'sync.' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, action: true, createdAt: true, metadata: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.auditLog.findFirst({
        where: { action: { startsWith: 'sync.' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, action: true },
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

    res.json({
      data: {
        sync: {
          lastRunAt: lastSyncEntry?.createdAt ?? null,
          recent: recentSyncRuns.map((r) => ({
            id: r.id,
            action: r.action,
            at: r.createdAt,
            actor: r.user ? `${r.user.firstName} ${r.user.lastName}` : 'النظام',
            metadata: r.metadata as unknown,
          })),
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
router.get('/owner/realtime', async (_req, res, next) => {
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
router.get('/owner/ai-metrics', async (_req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totals, byFeatureRaw, trendRecords, successCount] = await Promise.all([
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
      prisma.aiTelemetry.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
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

    // Bucket trend records by date
    const trendMap = new Map<string, number>();
    for (const record of trendRecords) {
      const dateKey = record.createdAt.toISOString().slice(0, 10);
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
    }
    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

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
router.get('/owner/alerts', async (_req, res, next) => {
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
router.post('/owner/alerts/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const alert = await prisma.operationalAlert.findUnique({ where: { id } });
    if (!alert) throw AppError.notFound('Alert not found');

    const updated = await prisma.operationalAlert.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedBy: req.user!.id },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ALERT_RESOLVED',
        resourceType: 'OperationalAlert',
        resourceId: id,
        userId: req.user!.id,
        metadata: { severity: alert.severity, title: alert.title },
      },
    });

    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/login-analytics — login event aggregates ──────────
router.get('/owner/login-analytics', async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, successCount, failureCount, loginRecords, topReasonsRaw] =
      await Promise.all([
        prisma.loginEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.loginEvent.count({ where: { createdAt: { gte: thirtyDaysAgo }, success: true } }),
        prisma.loginEvent.count({ where: { createdAt: { gte: thirtyDaysAgo }, success: false } }),
        prisma.loginEvent.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true, success: true },
        }),
        prisma.loginEvent.groupBy({
          by: ['reason'],
          where: { createdAt: { gte: thirtyDaysAgo }, success: false, reason: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { reason: 'desc' } },
          take: 10,
        }),
      ]);

    // Bucket login records by date into { date, success, failure }
    const dailyMap = new Map<string, { success: number; failure: number }>();
    for (const record of loginRecords) {
      const dateKey = record.createdAt.toISOString().slice(0, 10);
      const bucket = dailyMap.get(dateKey) || { success: 0, failure: 0 };
      if (record.success) {
        bucket.success += 1;
      } else {
        bucket.failure += 1;
      }
      dailyMap.set(dateKey, bucket);
    }
    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, success: counts.success, failure: counts.failure }));

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
router.get('/owner/settings', async (_req, res, next) => {
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
const upsertSettingSchema = z.object({
  value: z.string(),
  category: z.string().optional(),
});

router.put(
  '/owner/settings/:key',
  validate(upsertSettingSchema),
  async (req, res, next) => {
    try {
      const key = req.params.key!;
      const { value, category } = req.body as { value: string; category?: string };

      const data = await prisma.platformSetting.upsert({
        where: { key },
        create: { key, value, category: category || 'general', updatedBy: req.user!.id },
        update: { value, ...(category ? { category } : {}), updatedBy: req.user!.id },
      });

      await prisma.auditLog.create({
        data: {
          action: 'SETTING_UPDATED',
          resourceType: 'PlatformSetting',
          resourceId: key,
          userId: req.user!.id,
          metadata: { key, value, category },
        },
      });

      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/feature-flags — all feature flags ─────────────────
router.get('/owner/feature-flags', async (_req, res, next) => {
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
const toggleFlagSchema = z.object({
  enabled: z.boolean(),
});

router.put(
  '/owner/feature-flags/:slug',
  validate(toggleFlagSchema),
  async (req, res, next) => {
    try {
      const { slug } = req.params;
      const { enabled } = req.body as { enabled: boolean };

      const flag = await prisma.featureFlag.findUnique({ where: { slug } });
      if (!flag) throw AppError.notFound('Feature flag not found');

      const data = await prisma.featureFlag.update({
        where: { slug },
        data: { enabled, updatedBy: req.user!.id },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FEATURE_FLAG_TOGGLED',
          resourceType: 'FeatureFlag',
          resourceId: slug,
          userId: req.user!.id,
          metadata: { slug, enabled, previousState: flag.enabled },
        },
      });

      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/governance — governance overview metrics ───────────
router.get('/owner/governance', async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [permissionChanges, roleChanges, newUsersThisMonth, recentUsers] = await Promise.all([
      prisma.userPermission.count({
        where: { grantedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.auditLog.count({
        where: { action: 'ROLE_CHANGE', createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true },
      }),
    ]);

    // Bucket users by week
    const weeklyMap = new Map<string, number>();
    for (const user of recentUsers) {
      const date = user.createdAt;
      // Get ISO week start (Monday)
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const weekKey = d.toISOString().slice(0, 10);
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
    }
    const weeklyGrowth = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

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
