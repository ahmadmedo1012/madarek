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

/**
 * Cap for every social list read — a growing platform must not turn these
 * into unbounded scans (audit 11-c P2-14). This is the file's single feed
 * cap: the announcements feed previously used a private `take: 30` next to
 * this 50, two caps for the same feed concept (audit 15-i P1-4).
 */
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
 * View rule for one competition entry (audit 5-A12 P1-1): the organizer
 * sees every full row; the entry's AUTHOR sees their own full row — the
 * edit flow («تعديل مشاركتي») needs body/fileUrl, and without them the
 * modal opens empty and a blind submit silently overwrites the entry
 * (the upsert on competitionId_userId keeps no history). Everyone else
 * gets the summary projection. The full row keeps `userId`, so the FE
 * can match the viewer's own entry exactly instead of by name.
 */
export function entryViewForViewer<
  T extends CompetitionEntryPublicView & { userId: string },
>(entry: T, viewer: { isOrganizer: boolean; viewerId: string }): T | CompetitionEntryPublicView {
  return viewer.isOrganizer || entry.userId === viewer.viewerId ? entry : toPublicEntryView(entry);
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
 * Statuses from which closing (→ CLOSED) is a legal claim — OPEN only.
 * Close previously wrote unconditionally, so a stale organizer UI could
 * regress a JUDGED competition back to CLOSED, after which
 * `isScoreLocked(CLOSED) === false` and final scores became writable
 * again (audit 15-b P2-1). JUDGED is terminal. Exported for unit tests.
 */
export const CLOSABLE_COMPETITION_STATUSES = ['OPEN'] as const;

/** Statuses from which judging (CLOSED → JUDGED) is a legal claim. */
export const JUDGEABLE_COMPETITION_STATUSES = ['CLOSED'] as const;

/** Pure transition decision backing the close route's conditional claim. */
export function isCompetitionClosable(status: CompetitionStatus): boolean {
  return (CLOSABLE_COMPETITION_STATUSES as readonly CompetitionStatus[]).includes(status);
}

/** Pure transition decision backing the judge route's conditional claim. */
export function isCompetitionJudgeable(status: CompetitionStatus): boolean {
  return (JUDGEABLE_COMPETITION_STATUSES as readonly CompetitionStatus[]).includes(status);
}

/** Permitted announcement targets for one author — `'any'` (oversight
 *  roles) or the explicit allowlist of target ids (TEACHER/STUDENT own
 *  scopes). Shape of the wave-12-4 forgery guard, extracted pure so the
 *  permission matrix is unit-testable (audit 15-i TOP-7). */
export interface AnnouncementTargetPermissions {
  faculty: 'any' | readonly string[];
  department: 'any' | readonly string[];
  offering: 'any' | readonly string[];
}

/** Arabic labels for the announcement scopes (D17-3 message policy —
 * user-facing error text names the scope in Arabic, never the raw enum). */
const ANNOUNCEMENT_SCOPE_LABEL_AR: Record<Exclude<AnnouncementScope, 'PLATFORM'>, string> = {
  FACULTY: 'هذه الكلّيّة',
  DEPARTMENT: 'هذا القسم',
  OFFERING: 'هذا المقرر',
};

/**
 * Pure half of the scopeId forgery guard: is `scopeId` inside the author's
 * permitted targets for `scope`? Throws FORBIDDEN when it is not. The
 * existence of the target row is the handler's half (DB read, stays there).
 * PLATFORM addresses the whole platform — there is no target to forge, so
 * any stray scopeId is ignored.
 */
export function assertScopeTargetPermitted(
  scope: AnnouncementScope,
  scopeId: string,
  permitted: AnnouncementTargetPermissions,
): void {
  if (scope === 'PLATFORM') return;
  const allow: 'any' | readonly string[] =
    scope === 'FACULTY' ? permitted.faculty
    : scope === 'DEPARTMENT' ? permitted.department
    : permitted.offering;
  if (allow !== 'any' && !allow.includes(scopeId)) {
    throw AppError.forbidden(`لا يمكنك النشر إلى ${ANNOUNCEMENT_SCOPE_LABEL_AR[scope]}`);
  }
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
        take: SOCIAL_LIST_TAKE,
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
      take: SOCIAL_LIST_TAKE,
    });

    res.json({ data: announcements });
  } catch (e) { next(e); }
});

export const createAnnouncementSchema = z
  .object({
    scope: z.nativeEnum(AnnouncementScope),
    scopeId: z.string().cuid().optional(),
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(3).max(4000),
    pinned: z.boolean().default(false),
    iconEmoji: z.string().trim().max(8).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    // A non-PLATFORM announcement needs a target id. Previously enforced
    // only inside the handler, so the rule was invisible to schema tests
    // and missed the fast-fail validation path (audit 15-i TOP-7 / §5-3).
    // PLATFORM ignores scopeId (a stray one is inert — no feed read looks
    // at scopeId for PLATFORM rows).
    if (v.scope !== 'PLATFORM' && !v.scopeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeId'],
        message: 'scopeId required for non-platform scope',
      });
    }
  });

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
      // (scopeId-required-for-non-PLATFORM now lives in the schema's
      // superRefine — fail-fast and unit-tested.)
      if (body.scope === 'PLATFORM') {
        await assertCapability(req.user!.id, req.user!.role, 'ANNOUNCE_PLATFORM');
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
        let permitted: AnnouncementTargetPermissions;
        if (role === Role.ADMIN || role === Role.QUALITY || role === Role.OWNER) {
          permitted = { faculty: 'any', department: 'any', offering: 'any' };
        } else if (role === Role.TEACHER) {
          const tp = await prisma.teacherProfile.findUnique({
            where: { userId: uid },
            select: { departmentId: true, department: { select: { facultyId: true } } },
          });
          const own = await prisma.courseOffering.findMany({
            where: { teacherId: uid },
            select: { id: true },
          });
          permitted = {
            faculty: tp?.department.facultyId ? [tp.department.facultyId] : [],
            department: tp ? [tp.departmentId] : [],
            offering: own.map((o) => o.id),
          };
        } else {
          // STUDENT (or unusual grant) — own faculty/department/enrolled offerings.
          const sp = await prisma.studentProfile.findUnique({
            where: { userId: uid },
            select: { facultyId: true, departmentId: true },
          });
          const enr = await prisma.enrollment.findMany({
            where: { studentId: uid },
            select: { offeringId: true },
          });
          permitted = {
            faculty: sp?.facultyId ? [sp.facultyId] : [],
            department: sp?.departmentId ? [sp.departmentId] : [],
            offering: enr.map((e) => e.offeringId),
          };
        }

        // Existence half of the guard (DB reads — 404 before 403, so a
        // nonexistent target is not leaked as "exists but forbidden").
        if (body.scope === 'FACULTY') {
          const faculty = await prisma.faculty.findUnique({
            where: { id: body.scopeId },
            select: { id: true },
          });
          if (!faculty) throw AppError.notFound('الكلّيّة غير موجودة');
        } else if (body.scope === 'DEPARTMENT') {
          const dept = await prisma.department.findUnique({
            where: { id: body.scopeId },
            select: { id: true },
          });
          if (!dept) throw AppError.notFound('القسم غير موجود');
        } else if (body.scope === 'OFFERING') {
          const offering = await prisma.courseOffering.findUnique({
            where: { id: body.scopeId },
            select: { id: true },
          });
          if (!offering) throw AppError.notFound('المقرر المطلوب غير موجود');
        }

        // Permission half (pure, unit-tested — audit 15-i TOP-7).
        assertScopeTargetPermitted(body.scope, body.scopeId, permitted);
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
    if (!c) throw AppError.notFound('المسابقة غير موجودة');
    // Entry visibility (5-A12 P1-1): organizers see all full rows; an
    // entrant sees their OWN full row (the edit flow needs body/fileUrl —
    // a blind resubmit would overwrite it); everyone else gets the
    // summary projection with bodies hidden.
    const isOrg = c.organizerId === req.user!.id;
    res.json({
      data: {
        ...c,
        entries: c.entries.map((e) => entryViewForViewer(e, { isOrganizer: isOrg, viewerId: req.user!.id })),
      },
    });
  } catch (e) { next(e); }
});

const createCompSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(4000),
  category: z.string().trim().max(40),
  prize: z.string().trim().max(200).optional(),
  deadline: z.coerce.date(),
  iconEmoji: z.string().trim().max(8).optional(),
  themeColor: z.string().trim().max(20).optional(),
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
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(4000),
  fileUrl: z.string().trim().max(500).optional(),
}).strict();

router.post('/competitions/:id/enter', validate(enterCompSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const entry = await prisma.$transaction(async (tx) => {
      // Serialize per competition (the RSVP pattern below): under plain
      // READ COMMITTED the old pre-read → upsert pair let an entry land in
      // a competition that closed mid-request (audit 15-b P2-1). The row
      // lock makes the status/deadline re-check authoritative — a close or
      // judge claim either committed before us (we re-read its outcome) or
      // waits and re-evaluates its own status condition after we commit.
      const rows = await tx.$queryRaw<
        Array<{ id: string; status: CompetitionStatus; deadline: Date }>
      >`SELECT id, status, deadline FROM "Competition" WHERE id = ${req.params.id} FOR UPDATE`;
      const comp = rows[0];
      if (!comp) throw AppError.notFound('المسابقة غير موجودة');
      if (comp.status !== 'OPEN') throw new AppError('BAD_REQUEST', 'أُغلقت المسابقة أمام المشاركات', 400);
      if (comp.deadline < new Date()) throw new AppError('BAD_REQUEST', 'Competition deadline has passed', 400);

      return tx.competitionEntry.upsert({
        where: { competitionId_userId: { competitionId: comp.id, userId } },
        update: { title: req.body.title, body: req.body.body, fileUrl: req.body.fileUrl ?? null },
        create: {
          competitionId: comp.id,
          userId,
          title: req.body.title,
          body: req.body.body,
          fileUrl: req.body.fileUrl ?? null,
        },
      });
    });
    res.status(201).json({ data: entry });
  } catch (e) { next(e); }
});

router.post('/competitions/:id/close', requireCapability('COMPETITIONS_RUN'), async (req, res, next) => {
  try {
    const comp = await prisma.competition.findUnique({ where: { id: req.params.id } });
    if (!comp) throw AppError.notFound('المسابقة غير موجودة');
    if (req.user!.role !== Role.OWNER && comp.organizerId !== req.user!.id) throw AppError.forbidden('هذه المسابقة ليست من تنظيمك');
    // Conditional claim (audit 15-b P2-1): only an OPEN competition may
    // close. The write previously had no status guard at all, so a stale
    // organizer UI could regress a JUDGED competition to CLOSED — after
    // which isScoreLocked(CLOSED) is false and final scores became
    // writable again. JUDGED is terminal.
    const claimed = await prisma.competition.updateMany({
      where: { id: comp.id, status: { in: [...CLOSABLE_COMPETITION_STATUSES] } },
      data: { status: 'CLOSED' },
    });
    if (claimed.count === 0) {
      const current = await prisma.competition.findUnique({
        where: { id: comp.id },
        select: { status: true },
      });
      throw AppError.conflict(
        current?.status === CompetitionStatus.JUDGED
          ? 'سبق تحكيم هذه المسابقة — لا يمكن إغلاقها مرة أخرى'
          : 'لم تعد المسابقة مفتوحة',
      );
    }
    // Read the row back — updateMany returns only a count, and the response
    // keeps the full-row shape the unconditional update used to return.
    const updated = await prisma.competition.findUnique({ where: { id: comp.id } });
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
      if (!comp) throw AppError.notFound('المسابقة غير موجودة');
      if (req.user!.role !== Role.OWNER && comp.organizerId !== req.user!.id) throw AppError.forbidden('هذه المسابقة ليست من تنظيمك');

      const entry = await prisma.competitionEntry.findUnique({ where: { id: req.params.entryId } });
      if (!entry || entry.competitionId !== comp.id) throw AppError.notFound('المشاركة غير موجودة');

      // JUDGED is the final state — scores are locked once judging
      // completes (audit 11-c P2-14: they previously stayed writable).
      if (isScoreLocked(comp.status)) {
        throw AppError.conflict('سبق تحكيم هذه المسابقة — النتائج نهائية');
      }

      // Conditional claim: the guard above is a plain read, so judging
      // could commit between it and the write. The claim re-checks the
      // parent status atomically with the write — a score can no longer
      // land on a JUDGED competition (the "locked scores stay locked"
      // invariant of audit 15-b P2-1).
      const claimed = await prisma.competitionEntry.updateMany({
        where: {
          id: entry.id,
          competition: { status: { not: CompetitionStatus.JUDGED } },
        },
        data: { score: req.body.score },
      });
      if (claimed.count === 0) {
        throw AppError.conflict('سبق تحكيم هذه المسابقة — النتائج نهائية');
      }
      // The claim wrote exactly the validated score — the response keeps
      // the {id, score} shape the unconditional update returned.
      res.json({ data: { id: entry.id, score: req.body.score } });
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
      if (!comp) throw AppError.notFound('المسابقة غير موجودة');
      if (req.user!.role !== Role.OWNER && comp.organizerId !== req.user!.id) throw AppError.forbidden('هذه المسابقة ليست من تنظيمك');
      if (comp.status !== 'CLOSED') {
        throw new AppError('BAD_REQUEST', 'Competition must be closed before judging', 400);
      }
      if (!canFinalizeJudging(comp.entries)) {
        throw new AppError('BAD_REQUEST', 'No entry has been scored yet', 400);
      }

      // Conditional claim (audit 15-b P2-1): judging claims exactly CLOSED.
      // A concurrent finalize (double-click racing the first, or a close
      // landing between the read above and this write) can no longer be
      // leapfrogged — JUDGED is reached exactly once, from CLOSED.
      // Accepted micro-window: a score CLEARED in the same instant judging
      // finalizes can leave a JUDGED competition with no scored entry —
      // locked either way; the precondition above is the UX guard, the
      // claim is the integrity guard.
      const claimed = await prisma.competition.updateMany({
        where: { id: comp.id, status: { in: [...JUDGEABLE_COMPETITION_STATUSES] } },
        data: { status: 'JUDGED' },
      });
      if (claimed.count === 0) {
        const current = await prisma.competition.findUnique({
          where: { id: comp.id },
          select: { status: true },
        });
        throw AppError.conflict(
          current?.status === CompetitionStatus.JUDGED
            ? 'سبق تحكيم هذه المسابقة'
            : 'يجب إغلاق المسابقة قبل تحكيمها',
        );
      }
      // Read the row back — full-row shape, same as close.
      const updated = await prisma.competition.findUnique({ where: { id: comp.id } });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

// ════════════════════════════════════════════════════════════════
//  Events
// ════════════════════════════════════════════════════════════════

/**
 * Merge the viewer's own RSVP rows into event list rows (audit 5-A12
 * P2-2 — the `viewerReacted` pattern applied to events): each row gains
 * an additive `myRsvp` (the viewer's current status) or null when they
 * never answered, so the pressed state survives reload instead of being
 * session-local. Pure + exported for unit tests.
 */
export function eventsWithMyRsvp<
  T extends { id: string },
>(events: readonly T[], myRsvps: ReadonlyArray<{ eventId: string; status: RsvpStatus }>): Array<T & { myRsvp: RsvpStatus | null }> {
  const statusByEvent = new Map(myRsvps.map((r) => [r.eventId, r.status]));
  return events.map((e) => ({ ...e, myRsvp: statusByEvent.get(e.id) ?? null }));
}

router.get('/events', async (req, res, next) => {
  try {
    const now = new Date();
    const events = await prisma.campusEvent.findMany({
      where: { endsAt: { gte: now } },
      include: {
        organizer: { select: { firstName: true, lastName: true, role: true } },
        // 5-A12 P2-1: only GOING RSVPs hold a seat, so only they count
        // against capacity — the unfiltered count turned every «لن أحضر»
        // decline into an occupied seat («10 / 10» on an event nobody
        // attends). Filtered relation counts are GA since Prisma 4.16.
        _count: { select: { rsvps: { where: { status: 'GOING' } } } },
      },
      orderBy: { startsAt: 'asc' },
      take: SOCIAL_LIST_TAKE,
    });
    // 5-A12 P2-2: the viewer's own answers, merged additively above.
    const myRsvps = events.length
      ? await prisma.eventRSVP.findMany({
          where: { eventId: { in: events.map((e) => e.id) }, userId: req.user!.id },
          select: { eventId: true, status: true },
        })
      : [];
    res.json({ data: eventsWithMyRsvp(events, myRsvps) });
  } catch (e) { next(e); }
});

export const createEventSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(4000),
    location: z.string().trim().max(200),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.number().int().min(1).max(10_000).default(100),
    iconEmoji: z.string().trim().max(8).optional(),
    themeColor: z.string().trim().max(20).optional(),
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
    if (!event) throw AppError.notFound('الفعالية غير موجودة');
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
        throw AppError.conflict('اكتمل العدد في هذه الفعالية');
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
