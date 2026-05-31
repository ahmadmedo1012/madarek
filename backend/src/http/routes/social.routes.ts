import { Router } from 'express';
import { z } from 'zod';
import { AnnouncementScope, CompetitionStatus, RsvpStatus } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
//  Announcements
// ════════════════════════════════════════════════════════════════

/** GET /announcements/feed — visible to current user (scoped) */
router.get('/announcements/feed', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    // Admin and Quality see everything (oversight).
    if (role === 'ADMIN' || role === 'QUALITY') {
      const all = await prisma.announcement.findMany({
        include: { author: { select: { firstName: true, lastName: true, avatarColor: true, avatarInitials: true, role: true } } },
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: 30,
      });
      res.json({ data: all });
      return;
    }

    // Build scope filter for student/teacher.
    const profile = role === 'STUDENT' ? await prisma.studentProfile.findUnique({
      where: { userId },
      select: { facultyId: true, departmentId: true },
    }) : null;
    const enrollments = role === 'STUDENT' ? await prisma.enrollment.findMany({
      where: { studentId: userId }, select: { offeringId: true },
    }) : [];
    const offeringIds = enrollments.map((e) => e.offeringId);

    const teacherProfile = role === 'TEACHER' ? await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { departmentId: true, department: { select: { facultyId: true } } },
    }) : null;
    const teacherOfferings = role === 'TEACHER' ? await prisma.courseOffering.findMany({
      where: { teacherId: userId }, select: { id: true },
    }) : [];

    const scopeOR: Array<Record<string, unknown>> = [{ scope: 'PLATFORM' }];
    if (profile) {
      if (profile.facultyId) scopeOR.push({ scope: 'FACULTY', scopeId: profile.facultyId });
      if (profile.departmentId) scopeOR.push({ scope: 'DEPARTMENT', scopeId: profile.departmentId });
      if (offeringIds.length) scopeOR.push({ scope: 'OFFERING', scopeId: { in: offeringIds } });
    }
    if (teacherProfile) {
      if (teacherProfile.department.facultyId) scopeOR.push({ scope: 'FACULTY', scopeId: teacherProfile.department.facultyId });
      scopeOR.push({ scope: 'DEPARTMENT', scopeId: teacherProfile.departmentId });
      if (teacherOfferings.length) scopeOR.push({ scope: 'OFFERING', scopeId: { in: teacherOfferings.map((o) => o.id) } });
    }

    const announcements = await prisma.announcement.findMany({
      where: { OR: scopeOR },
      include: {
        author: { select: { firstName: true, lastName: true, avatarColor: true, avatarInitials: true, role: true } },
      },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: 30,
    });

    res.json({ data: announcements });
  } catch (e) { next(e); }
});

const createAnnouncementSchema = z.object({
  scope: z.nativeEnum(AnnouncementScope),
  scopeId: z.string().cuid().optional(),
  title: z.string().min(3).max(200),
  body: z.string().min(3).max(4000),
  pinned: z.boolean().default(false),
  iconEmoji: z.string().max(8).optional(),
  expiresAt: z.coerce.date().optional(),
}).strict();

router.post(
  '/announcements',
  requireCapability('ANNOUNCE_FACULTY', 'ANNOUNCE_PLATFORM'),
  validate(createAnnouncementSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createAnnouncementSchema>;
      // PLATFORM scope requires ANNOUNCE_PLATFORM specifically
      if (body.scope === 'PLATFORM') {
        // Re-check (the middleware allows either)
        const { assertCapability } = await import('../../lib/permissions.js');
        await assertCapability(req.user!.id, req.user!.role, 'ANNOUNCE_PLATFORM');
      }
      // For non-platform scopes, scopeId is required
      if (body.scope !== 'PLATFORM' && !body.scopeId) {
        throw new AppError('BAD_REQUEST', 'scopeId required for non-platform scope', 400);
      }
      const created = await prisma.announcement.create({
        data: {
          authorId: req.user!.id,
          scope: body.scope,
          scopeId: body.scopeId ?? null,
          title: body.title,
          body: body.body,
          pinned: body.pinned,
          iconEmoji: body.iconEmoji ?? null,
          expiresAt: body.expiresAt ?? null,
        },
      });
      res.status(201).json({ data: created });
    } catch (e) { next(e); }
  },
);

// ════════════════════════════════════════════════════════════════
//  Competitions
// ════════════════════════════════════════════════════════════════

router.get('/competitions', async (_req, res, next) => {
  try {
    const competitions = await prisma.competition.findMany({
      include: {
        organizer: { select: { firstName: true, lastName: true, role: true } },
        _count: { select: { entries: true } },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    });
    res.json({ data: competitions });
  } catch (e) { next(e); }
});

router.get('/competitions/:id', async (req, res, next) => {
  try {
    const c = await prisma.competition.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: { select: { firstName: true, lastName: true, role: true } },
        entries: {
          include: { user: { select: { firstName: true, lastName: true, avatarColor: true, avatarInitials: true } } },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });
    if (!c) throw AppError.notFound('Competition not found');
    // Hide entry bodies from non-organizers (only show summary)
    const isOrg = c.organizerId === req.user!.id;
    res.json({
      data: {
        ...c,
        entries: c.entries.map((e) => isOrg ? e : { id: e.id, title: e.title, user: e.user, submittedAt: e.submittedAt, score: e.score }),
      },
    });
  } catch (e) { next(e); }
});

const createCompSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(4000),
  category: z.string().max(40),
  prize: z.string().max(200).optional(),
  deadline: z.coerce.date(),
  iconEmoji: z.string().max(8).optional(),
  themeColor: z.string().max(20).optional(),
}).strict();

router.post('/competitions', requireCapability('COMPETITIONS_RUN'), validate(createCompSchema), async (req, res, next) => {
  try {
    const created = await prisma.competition.create({
      data: { ...req.body, organizerId: req.user!.id },
    });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

const enterCompSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(4000),
  fileUrl: z.string().max(500).optional(),
}).strict();

router.post('/competitions/:id/enter', validate(enterCompSchema), async (req, res, next) => {
  try {
    const comp = await prisma.competition.findUnique({ where: { id: req.params.id } });
    if (!comp) throw AppError.notFound('Competition not found');
    if (comp.status !== 'OPEN') throw new AppError('BAD_REQUEST', 'مسابقة مغلقة', 400);
    if (comp.deadline < new Date()) throw new AppError('BAD_REQUEST', 'انتهى الموعد النهائي', 400);

    const entry = await prisma.competitionEntry.upsert({
      where: { competitionId_userId: { competitionId: comp.id, userId: req.user!.id } },
      update: { title: req.body.title, body: req.body.body, fileUrl: req.body.fileUrl ?? null },
      create: {
        competitionId: comp.id,
        userId: req.user!.id,
        title: req.body.title,
        body: req.body.body,
        fileUrl: req.body.fileUrl ?? null,
      },
    });
    res.status(201).json({ data: entry });
  } catch (e) { next(e); }
});

router.post('/competitions/:id/close', requireCapability('COMPETITIONS_RUN'), async (req, res, next) => {
  try {
    const comp = await prisma.competition.findUnique({ where: { id: req.params.id } });
    if (!comp) throw AppError.notFound('Competition not found');
    if (comp.organizerId !== req.user!.id) throw AppError.forbidden('Not your competition');
    const updated = await prisma.competition.update({
      where: { id: comp.id },
      data: { status: 'CLOSED' as CompetitionStatus },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

/**
 * Set / update an entry score. Only the organizer can score entries.
 * Score range: 0-100. Pass null to clear a score.
 */
const scoreEntrySchema = z.object({
  score: z.number().int().min(0).max(100).nullable(),
}).strict();

router.post(
  '/competitions/:id/entries/:entryId/score',
  requireCapability('COMPETITIONS_RUN'),
  validate(scoreEntrySchema),
  async (req, res, next) => {
    try {
      const comp = await prisma.competition.findUnique({ where: { id: req.params.id! } });
      if (!comp) throw AppError.notFound('Competition not found');
      if (comp.organizerId !== req.user!.id) throw AppError.forbidden('Not your competition');

      const entry = await prisma.competitionEntry.findUnique({ where: { id: req.params.entryId! } });
      if (!entry || entry.competitionId !== comp.id) throw AppError.notFound('Entry not found');

      const updated = await prisma.competitionEntry.update({
        where: { id: entry.id },
        data: { score: req.body.score },
        select: { id: true, score: true },
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

/**
 * Mark the competition as JUDGED — final state. Requires the competition
 * to be CLOSED first and at least one entry to be scored.
 */
router.post(
  '/competitions/:id/judge',
  requireCapability('COMPETITIONS_RUN'),
  async (req, res, next) => {
    try {
      const comp = await prisma.competition.findUnique({
        where: { id: req.params.id! },
        include: { entries: { select: { score: true } } },
      });
      if (!comp) throw AppError.notFound('Competition not found');
      if (comp.organizerId !== req.user!.id) throw AppError.forbidden('Not your competition');
      if (comp.status !== 'CLOSED') {
        throw new AppError('BAD_REQUEST', 'يجب إغلاق المسابقة أوّلاً قبل التحكيم', 400);
      }
      const scoredCount = comp.entries.filter((e) => e.score !== null).length;
      if (scoredCount === 0 && comp.entries.length > 0) {
        throw new AppError('BAD_REQUEST', 'لم تُقَيَّم أي مشاركة بعد', 400);
      }

      const updated = await prisma.competition.update({
        where: { id: comp.id },
        data: { status: 'JUDGED' as CompetitionStatus },
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

// ════════════════════════════════════════════════════════════════
//  Events
// ════════════════════════════════════════════════════════════════

router.get('/events', async (_req, res, next) => {
  try {
    const now = new Date();
    const events = await prisma.campusEvent.findMany({
      where: { endsAt: { gte: now } },
      include: {
        organizer: { select: { firstName: true, lastName: true, role: true } },
        _count: { select: { rsvps: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
    res.json({ data: events });
  } catch (e) { next(e); }
});

const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(4000),
  location: z.string().max(200),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.number().int().min(1).max(10_000).default(100),
  iconEmoji: z.string().max(8).optional(),
  themeColor: z.string().max(20).optional(),
}).strict();

router.post('/events', requireCapability('EVENTS_RUN'), validate(createEventSchema), async (req, res, next) => {
  try {
    const created = await prisma.campusEvent.create({
      data: { ...req.body, organizerId: req.user!.id },
    });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

const rsvpSchema = z.object({
  status: z.nativeEnum(RsvpStatus),
}).strict();

router.post('/events/:id/rsvp', validate(rsvpSchema), async (req, res, next) => {
  try {
    const event = await prisma.campusEvent.findUnique({ where: { id: req.params.id } });
    if (!event) throw AppError.notFound('Event not found');
    const rsvp = await prisma.eventRSVP.upsert({
      where: { eventId_userId: { eventId: event.id, userId: req.user!.id } },
      update: { status: req.body.status },
      create: { eventId: event.id, userId: req.user!.id, status: req.body.status },
    });
    res.json({ data: rsvp });
  } catch (e) { next(e); }
});

export default router;
