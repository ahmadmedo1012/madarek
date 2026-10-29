import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { AppError } from '../../lib/errors.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { getEffectiveCapabilities, assertOfferingAccess, assertOwnsOffering } from '../../lib/permissions.js';
import { utcDayStart } from '../../lib/dates.js';
import {
  canJoin,
  canTransition,
  defaultJoinUrlFor,
  transitionError,
  type LiveStatus,
} from '../../modules/live/core.js';

/**
 * r323 B2.4 — live sessions & webinars (Jitsi default).
 *
 * The LiveSession model existed; it had NO routes while the frontend
 * (hooks/resources/live.ts + TeacherLivePage + student LivePage) was
 * already wired to this contract — this router IS that contract:
 *
 *   GET  /live/sessions                 — the CALLER's list: students see
 *                                         their active enrollments' sessions,
 *                                         teachers see their own (the
 *                                         CURRICULUM_EDIT_ANY bypass sees all)
 *   POST /live/sessions                 — teacher schedules; a pasted joinUrl
 *                                         wins, else the Jitsi room is
 *                                         generated (meet.jit.si default,
 *                                         the owner's brief)
 *   POST /live/sessions/:id/lifecycle   — teacher: {action: START|END|
 *                                         CANCEL} (+ optional recordingUrl
 *                                         attach once ENDED)
 *   POST /live/sessions/:id/join        — student join hook: opens 10 min
 *                                         early, records attendance ONCE
 *                                         (the composite unique makes a
 *                                         second join a no-op) — rides the
 *                                         EXISTING AttendanceSession/Record
 *                                         tables so the registrar's reports
 *                                         see live joins as PRESENT rows
 *
 * Mounted at /api/v1 (see app.ts).
 */

const router = Router();

const createSessionBody = z.object({
  offeringId: z.string().min(6),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  topic: z.string().trim().max(200).optional(),
  scheduledAt: z.coerce.date(),
  joinUrl: z.string().trim().url().max(500).optional(),
});

const lifecycleBody = z.object({
  action: z.enum(['START', 'END', 'CANCEL']),
  recordingUrl: z.string().trim().url().max(500).optional(),
});

const sessionInclude = {
  offering: { select: { id: true, course: { select: { name: true, code: true, iconEmoji: true, themeColor: true } } } },
  teacher: { select: { firstName: true, lastName: true, avatarInitials: true, avatarColor: true } },
} as const;

function serialize(s: {
  id: string; offeringId: string; teacherId: string; title: string;
  description: string | null; topic: string | null; scheduledAt: Date;
  startedAt: Date | null; endedAt: Date | null; status: LiveStatus;
  joinUrl: string | null; recordingUrl: string | null;
}) {
  return {
    ...s,
    scheduledAt: s.scheduledAt.toISOString(),
    startedAt: s.startedAt?.toISOString() ?? null,
    endedAt: s.endedAt?.toISOString() ?? null,
  };
}

/** The caller-scoped where: students → their ACTIVE enrollments;
 * teachers → their own offerings; the CURRICULUM_EDIT_ANY bypass → all. */
async function callerSessionWhere(userId: string, role: Role) {
  if (role === Role.STUDENT) {
    return {
      offering: { enrollments: { some: { studentId: userId, status: 'active' as const } } },
    } as const;
  }
  const caps = await getEffectiveCapabilities(userId, role);
  if (caps.has('CURRICULUM_EDIT_ANY')) return {} as const;
  return { teacherId: userId } as const;
}

router.get('/live/sessions', authMiddleware, async (req, res, next) => {
  try {
    const where = await callerSessionWhere(req.user!.id, req.user!.role);
    const sessions = await prisma.liveSession.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: sessionInclude,
      take: 100,
    });
    res.json({ data: sessions.map(serialize) });
  } catch (e) { next(e); }
});

router.post(
  '/live/sessions',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(createSessionBody),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSessionBody>;
      await assertOwnsOffering(body.offeringId, req.user!.id, req.user!.role);

      const created = await prisma.liveSession.create({
        data: {
          offeringId: body.offeringId,
          teacherId: req.user!.id,
          title: body.title,
          description: body.description ?? null,
          topic: body.topic ?? null,
          scheduledAt: body.scheduledAt,
          joinUrl: body.joinUrl ?? null,
          status: 'SCHEDULED',
        },
        include: sessionInclude,
      });
      // the Jitsi default — one honest backfill write when the teacher
      // didn't paste an external provider link.
      const session = body.joinUrl
        ? created
        : await prisma.liveSession.update({
            where: { id: created.id },
            data: { joinUrl: defaultJoinUrlFor(created.id) },
            include: sessionInclude,
          });
      logger.info({ sessionId: session.id, offeringId: body.offeringId, userId: req.user!.id }, 'live: scheduled');
      res.status(201).json({ data: serialize(session) });
    } catch (e) { next(e); }
  },
);

router.post(
  '/live/sessions/:id/lifecycle',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(lifecycleBody),
  async (req, res, next) => {
    try {
      const id = req.params.id!;
      const body = req.body as z.infer<typeof lifecycleBody>;
      const session = await prisma.liveSession.findUnique({ where: { id } });
      if (!session) throw AppError.notFound('الحصة المباشرة غير موجودة');
      await assertOwnsOffering(session.offeringId, req.user!.id, req.user!.role);

      // the post-session recording attach rides the same endpoint
      if (body.recordingUrl !== undefined) {
        if (session.status !== 'ENDED') {
          throw AppError.conflict('يرتبط رابط التسجيل بحصة منتهية.');
        }
        const updated = await prisma.liveSession.update({
          where: { id }, data: { recordingUrl: body.recordingUrl }, include: sessionInclude,
        });
        return res.json({ data: serialize(updated) });
      }

      const target: LiveStatus =
        body.action === 'START' ? 'LIVE' : body.action === 'END' ? 'ENDED' : 'CANCELLED';
      if (!canTransition(session.status as LiveStatus, target)) {
        throw AppError.conflict(transitionError(session.status as LiveStatus, target));
      }
      const now = new Date();
      const data =
        target === 'LIVE' ? { status: target, startedAt: session.startedAt ?? now }
        : target === 'ENDED' ? { status: target, endedAt: now }
        : { status: target };
      const updated = await prisma.liveSession.update({ where: { id }, data, include: sessionInclude });
      logger.info({ sessionId: id, from: session.status, to: target }, 'live: lifecycle');
      return res.json({ data: serialize(updated) });
    } catch (e) { next(e); }
  },
);

router.post('/live/sessions/:id/join', authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id!;
    const session = await prisma.liveSession.findUnique({ where: { id } });
    if (!session) throw AppError.notFound('الحصة المباشرة غير موجودة');
    await assertOfferingAccess(session.offeringId, req.user!.id, req.user!.role);

    const verdict = canJoin(session.status as LiveStatus, session.scheduledAt);
    if (!verdict.ok) throw AppError.conflict(verdict.reason!);

    // attendance auto-record — the UTC day-bucket convention (lib/dates.ts,
    // audit 15-h P1-1) keeps the join in the SAME AttendanceSession the
    // registrar's manual rolls and the watch-event auto-attendance use.
    const att = await prisma.attendanceSession.upsert({
      where: { offeringId_date: { offeringId: session.offeringId, date: utcDayStart(new Date()) } },
      create: { offeringId: session.offeringId, date: utcDayStart(new Date()), topic: `حصة مباشرة — ${session.title}` },
      update: {},
    });
    await prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: att.id, studentId: req.user!.id } },
      create: { sessionId: att.id, studentId: req.user!.id, status: 'PRESENT', notes: 'انضمام تلقائي — حصة مباشرة' },
      update: {}, // never overwrite a teacher's manual mark
    });

    res.json({ data: { session: serialize(session), attendanceRecorded: true } });
  } catch (e) { next(e); }
});

export default router;
