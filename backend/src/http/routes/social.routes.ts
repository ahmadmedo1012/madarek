import { Router } from 'express';
import { z } from 'zod';
import { AnnouncementScope, CompetitionStatus, Prisma, RsvpStatus, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertCapability } from '../../lib/permissions.js';

const router = Router();
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────
// Pure logic — DB-free, unit-tested in tests/modules/social-logic.test.ts
// ─────────────────────────────────────────────────────────────────

/** Cap for every social list read — a growing platform must not turn these into unbounded scans (audit 11-c P2-14). */
const SOCIAL_LIST_TAKE = 50;

/** Facts about one caller, as needed to build their announcement-feed scope filter. */
export interface AnnouncementScopeFacts {
  /** STUDENT's faculty id (StudentProfile.facultyId), if the profile has one. */
  studentFacultyId: string | null;
  /** STUDENT's department id, if the profile has one. */
  studentDepartmentId: string | null;
  /** Offerings the STUDENT is enrolled in. */
  enrolledOfferingIds: readonly string[];
  /** TEACHER's faculty id (derived from their home department), if any. */
  teacherFacultyId: string | null;
  /** TEACHER's home department id, if they have a profile. */
  teacherDepartmentId: string | null;
  /** Offerings the TEACHER teaches. */
  taughtOfferingIds: readonly string[];
}

/**
 * Build the OR-conditions matching announcements visible to one caller:
 * PLATFORM always, plus their own FACULTY / DEPARTMENT / OFFERING scopes.
 * Pure extraction of the feed's previous inline construction.
 */
export function buildAnnouncementScopeConditions(facts: AnnouncementScopeFacts): Prisma.AnnouncementWhereInput[] {
  const conditions: Prisma.AnnouncementWhereInput[] = [{ scope: 'PLATFORM' }];
  if (facts.studentFacultyId) conditions.push({ scope: 'FACULTY', scopeId: facts.studentFacultyId });
  if (facts.studentDepartmentId) conditions.push({ scope: 'DEPARTMENT', scopeId: facts.studentDepartmentId });
  if (facts.enrolledOfferingIds.length > 0) {
    conditions.push({ scope: 'OFFERING', scopeId: { in: [...facts.enrolledOfferingIds] } });
  }
  if (facts.teacherFacultyId) conditions.push({ scope: 'FACULTY', scopeId: facts.teacherFacultyId });
  if (facts.teacherDepartmentId) conditions.push({ scope: 'DEPARTMENT', scopeId: facts.teacherDepartmentId });
  if (facts.taughtOfferingIds.length > 0) {
    conditions.push({ scope: 'OFFERING', scopeId: { in: [...facts.taughtOfferingIds] } });
  }
  return conditions;
}

/**
 * Announcements with no expiry, or one still in the future. Applied to EVERY
 * feed read (oversight and scoped): expiresAt previously existed only on the
 * write path, so expired announcements rendered forever (audit 11-c P2-14).
 * Expired rows stay in the DB for history — they just leave the feeds.
 */
export function unexpiredAnnouncementFilter(now: Date): Prisma.AnnouncementWhereInput {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

/** Entry fields safe for non-organizer viewing — bodies and files stay organizer-only. */
export interface CompetitionEntryPublicView {
  id: string;
  title: string;
  user: { firstName: string; lastName: string; avatarColor: string | null; avatarInitials: string | null };
  submittedAt: Date;
  score: number | null;
}

/** Project a full entry down to the non-organizer view (drops body/fileUrl). */
export function toPublicEntryView(entry: CompetitionEntryPublicView): CompetitionEntryPublicView {
  return { id: entry.id, title: entry.title, user: entry.user, submittedAt: entry.submittedAt, score: entry.score };
}

/**
 * JUDGED is the competition's final state — entry scores lock once judging
 * completes (audit 11-c P2-14: they previously stayed writable forever).
 */
export function isScoreLocked(status: CompetitionStatus): boolean {
  return status === 'JUDGED';
}

/**
 * Judging requires at least one scored entry — unless the competition
 * received no entries at all, in which case finalizing the empty set is fine.
 */
export function canFinalizeJudging(entries: ReadonlyArray<{ score: number | null }>): boolean {
  return entries.length === 0 || entries.some((e) => e.score !== null);
}

/**
 * Pure capacity decision for an RSVP write: only a transition INTO 'GOING'
 * from a non-GOING state consumes a new seat — a user already GOING keeps
 * their seat, and MAYBE/NO never touch capacity.
 */
export function rsvpWouldExceedCapacity(
  requested: RsvpStatus,
  currentStatus: RsvpStatus | null,
  goingCount: number,
  capacity: number,
): boolean {
  return requested === 'GOING' && currentStatus !== 'GOING' && goingCount >= capacity;
}

// ════════════════════════════════════════════════════════════════
//  Announcements
// ════════════════════════════════════════════════════════════════

/** GET /announcements/feed — visible to current user (scoped) */
router.get('/announcements/feed', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const now = new Date();

    // Oversight roles see every live announcement. OWNER belongs here too:
    // the create path and lib/permissions.ts both treat OWNER as oversight,
    // but the feed previously dropped them into the scoped branch with no
    // student/teacher profile — leaving them only PLATFORM rows
    // (audit 11-c P1-3).
    if (role === Role.ADMIN || role === Role.QUALITY || role === Role.OWNER) {
      const all = await prisma.announcement.findMany({
        where: unexpiredAnnouncementFilter(now),
        include: { author: { select: { firstName: true, lastName: true, avatarColor: true, avatarInitials: true, role: true } } },
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: 30,
      });
      res.json({ data: all });
      return;
    }

    // Build scope filter for student/teacher.
    const profile = role === Role.STUDENT ? await prisma.studentProfile.findUnique({
      where: { userId },
      select: { facultyId: true, departmentId: true },
    }) : null;
    const enrollments = role === Role.STUDENT ? await prisma.enrollment.findMany({
      where: { studentId: userId }, select: { offeringId: true },
    }) : [];

    const teacherProfile = role === Role.TEACHER ? await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { departmentId: true, department: { select: { facultyId: true } } },
    }) : null;
    const teacherOfferings = role === Role.TEACHER ? await prisma.courseOffering.findMany({
      where: { teacherId: userId }, select: { id: true },
    }) : [];

    const announcements = await prisma.announcement.findMany({
      where: {
        AND: [
          {
            OR: buildAnnouncementScopeConditions({
              studentFacultyId: profile?.facultyId ?? null,
              studentDepartmentId: profile?.departmentId ?? null,
              enrolledOfferingIds: enrollments.map((e) => e.offeringId),
              teacherFacultyId: teacherProfile?.department.facultyId ?? null,
              teacherDepartmentId: teacherProfile?.departmentId ?? null,
              taughtOfferingIds: teacherOfferings.map((o) => o.id),
            }),
          },
          unexpiredAnnouncementFilter(now),
        ],
      },
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
      // PLATFORM scope requires ANNOUNCE_PLATFORM specifically. Re-check:
      // the route middleware above admits either ANNOUNCE_FACULTY or
      // ANNOUNCE_PLATFORM; only the latter may address the whole platform.
      if (body.scope === 'PLATFORM') {
        await assertCapability(req.user!.id, req.user!.role, 'ANNOUNCE_PLATFORM');
      }
      // For non-platform scopes, scopeId is required
      if (body.scope !== 'PLATFORM' && !body.scopeId) {
        throw new AppError('BAD_REQUEST', 'scopeId required for non-platform scope', 400);
      }

      // scopeId forgery guard: the target must EXIST and be inside the
      // author's permitted scopes. Previously any cuid passed through,
      // so a teacher could announce into any faculty/department/offering.
      if (body.scope !== 'PLATFORM' && body.scopeId) {
        const role = req.user!.role;
        const uid = req.user!.id;

        // Permitted target ids per role. ADMIN/QUALITY (ANNOUNCE_FACULTY
        // holders) may target any EXISTING faculty/department/offering;
        // TEACHER/STUDENT are limited to their own scopes.
        let permittedFaculty: 'any' | string[];
        let permittedDepartments: 'any' | string[];
        let permittedOfferings: 'any' | string[];
        if (role === Role.ADMIN || role === Role.QUALITY || role === Role.OWNER) {
          permittedFaculty = 'any';
          permittedDepartments = 'any';
          permittedOfferings = 'any';
        } else if (role === Role.TEACHER) {
          const tp = await prisma.teacherProfile.findUnique({
            where: { userId: uid },
            select: { departmentId: true, department: { select: { facultyId: true } } },
          });
          permittedFaculty = tp?.department.facultyId ? [tp.department.facultyId] : [];
          permittedDepartments = tp ? [tp.departmentId] : [];
          const own = await prisma.courseOffering.findMany({
            where: { teacherId: uid },
            select: { id: true },
          });
          permittedOfferings = own.map((o) => o.id);
        } else {
          // STUDENT (or unusual grant) — own faculty/department/enrolled offerings.
          const sp = await prisma.studentProfile.findUnique({
            where: { userId: uid },
            select: { facultyId: true, departmentId: true },
          });
          permittedFaculty = sp?.facultyId ? [sp.facultyId] : [];
          permittedDepartments = sp?.departmentId ? [sp.departmentId] : [];
          const enr = await prisma.enrollment.findMany({
            where: { studentId: uid },
            select: { offeringId: true },
          });
          permittedOfferings = enr.map((e) => e.offeringId);
        }

        if (body.scope === 'FACULTY') {
          const faculty = await prisma.faculty.findUnique({
            where: { id: body.scopeId },
            select: { id: true },
          });
          if (!faculty) throw AppError.notFound('Faculty not found');
          if (permittedFaculty !== 'any' && !permittedFaculty.includes(body.scopeId)) {
            throw AppError.forbidden('You cannot announce to this faculty');
          }
        } else if (body.scope === 'DEPARTMENT') {
          const dept = await prisma.department.findUnique({
            where: { id: body.scopeId },
            select: { id: true },
          });
          if (!dept) throw AppError.notFound('Department not found');
          if (permittedDepartments !== 'any' && !permittedDepartments.includes(body.scopeId)) {
            throw AppError.forbidden('You cannot announce to this department');
          }
        } else if (body.scope === 'OFFERING') {
          const offering = await prisma.courseOffering.findUnique({
            where: { id: body.scopeId },
            select: { id: true, teacherId: true },
          });
          if (!offering) throw AppError.notFound('Offering not found');
          if (permittedOfferings !== 'any' && !permittedOfferings.includes(body.scopeId)) {
            throw AppError.forbidden('You cannot announce to this offering');
          }
        }
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
      // Postgres orders native enums by DECLARATION order — the migration
      // creates CompetitionStatus as ('OPEN', 'CLOSED', 'JUDGED') — so
      // status asc surfaces actionable competitions first (OPEN, then
      // CLOSED-under-judging, then JUDGED archive); deadline asc breaks
      // ties within each status.
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take: SOCIAL_LIST_TAKE,
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
          take: SOCIAL_LIST_TAKE,
        },
      },
    });
    if (!c) throw AppError.notFound('Competition not found');
    // Hide entry bodies from non-organizers (only show summary)
    const isOrg = c.organizerId === req.user!.id;
    res.json({
      data: {
        ...c,
        entries: c.entries.map((e) => (isOrg ? e : toPublicEntryView(e))),
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
    const body = req.body as z.infer<typeof createCompSchema>;
    const created = await prisma.competition.create({
      data: { ...body, organizerId: req.user!.id },
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
    if (comp.status !== 'OPEN') throw new AppError('BAD_REQUEST', 'Competition is closed for entries', 400);
    if (comp.deadline < new Date()) throw new AppError('BAD_REQUEST', 'Competition deadline has passed', 400);

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
    if (req.user!.role !== Role.OWNER && comp.organizerId !== req.user!.id) throw AppError.forbidden('Not your competition');
    const updated = await prisma.competition.update({
      where: { id: comp.id },
      data: { status: 'CLOSED' },
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
      const comp = await prisma.competition.findUnique({ where: { id: req.params.id } });
      if (!comp) throw AppError.notFound('Competition not found');
      if (req.user!.role !== Role.OWNER && comp.organizerId !== req.user!.id) throw AppError.forbidden('Not your competition');

      const entry = await prisma.competitionEntry.findUnique({ where: { id: req.params.entryId } });
      if (!entry || entry.competitionId !== comp.id) throw AppError.notFound('Entry not found');

      // JUDGED is the final state — scores are locked once judging
      // completes (audit 11-c P2-14: they previously stayed writable).
      if (isScoreLocked(comp.status)) {
        throw AppError.conflict('Competition already judged — scores are final');
      }

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
        where: { id: req.params.id },
        include: { entries: { select: { score: true } } },
      });
      if (!comp) throw AppError.notFound('Competition not found');
      if (req.user!.role !== Role.OWNER && comp.organizerId !== req.user!.id) throw AppError.forbidden('Not your competition');
      if (comp.status !== 'CLOSED') {
        throw new AppError('BAD_REQUEST', 'Competition must be closed before judging', 400);
      }
      if (!canFinalizeJudging(comp.entries)) {
        throw new AppError('BAD_REQUEST', 'No entry has been scored yet', 400);
      }

      const updated = await prisma.competition.update({
        where: { id: comp.id },
        data: { status: 'JUDGED' },
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
      take: SOCIAL_LIST_TAKE,
    });
    res.json({ data: events });
  } catch (e) { next(e); }
});

export const createEventSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(4000),
    location: z.string().max(200),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.number().int().min(1).max(10_000).default(100),
    iconEmoji: z.string().max(8).optional(),
    themeColor: z.string().max(20).optional(),
  })
  .strict()
  .refine((v) => v.endsAt > v.startsAt, {
    message: 'endsAt must be after startsAt',
  });

router.post('/events', requireCapability('EVENTS_RUN'), validate(createEventSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createEventSchema>;
    const created = await prisma.campusEvent.create({
      data: { ...body, organizerId: req.user!.id },
    });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

export const rsvpSchema = z.object({
  status: z.nativeEnum(RsvpStatus),
}).strict();

router.post('/events/:id/rsvp', validate(rsvpSchema), async (req, res, next) => {
  try {
    const { status } = req.body as z.infer<typeof rsvpSchema>;
    const userId = req.user!.id;
    const event = await prisma.campusEvent.findUnique({ where: { id: req.params.id } });
    if (!event) throw AppError.notFound('Event not found');
    // Capacity check + upsert in one transaction, serialized per event via
    // SELECT … FOR UPDATE on the parent row (same pattern as POST
    // /enrollments). Without the row lock, two concurrent GOING rsvps can
    // both pass the count check and oversell the event (audit 11-c P2-14).
    // Only GOING RSVPs count against capacity, and a user already GOING
    // may switch status freely.
    const rsvp = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "CampusEvent" WHERE id = ${event.id} FOR UPDATE`;
      const [goingCount, mine] = await Promise.all([
        tx.eventRSVP.count({ where: { eventId: event.id, status: 'GOING' } }),
        tx.eventRSVP.findUnique({
          where: { eventId_userId: { eventId: event.id, userId } },
          select: { status: true },
        }),
      ]);
      if (rsvpWouldExceedCapacity(status, mine?.status ?? null, goingCount, event.capacity)) {
        throw AppError.conflict('Event is at capacity');
      }
      return tx.eventRSVP.upsert({
        where: { eventId_userId: { eventId: event.id, userId } },
        update: { status },
        create: { eventId: event.id, userId, status },
      });
    });
    res.json({ data: rsvp });
  } catch (e) { next(e); }
});

export default router;
