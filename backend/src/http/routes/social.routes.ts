import { Router } from 'express';
import { z } from 'zod';
import { AnnouncementScope, CompetitionStatus, Prisma, RsvpStatus, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { isSanctionedMediaUrl } from '../../lib/sanctioned-url.js';
import { assertCapability } from '../../lib/permissions.js';
import { resolveStudentProfile, resolveTeacherProfile } from '../../lib/profile-scoping.js';

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

/**
 * r179 (phase-5): OR-conditions matching announcements whose SCOPED
 * target lives inside ONE institution, plus PLATFORM (global by
 * design — visible to every authed user). The oversight
 * (ADMIN/QUALITY) feed filter: a FACULTY/DEPARTMENT/OFFERING row of
 * ANOTHER institution never enters the OR, so it never reaches the
 * caller. Pure mirror of buildAnnouncementScopeConditions (the
 * own-scope variant) — unit-tested in social-logic.test.ts.
 */
export function institutionAnnouncementConditions(scope: {
  facultyIds: readonly string[];
  departmentIds: readonly string[];
  offeringIds: readonly string[];
}): Prisma.AnnouncementWhereInput[] {
  const conditions: Prisma.AnnouncementWhereInput[] = [{ scope: 'PLATFORM' }];
  if (scope.facultyIds.length > 0) {
    conditions.push({ scope: 'FACULTY', scopeId: { in: [...scope.facultyIds] } });
  }
  if (scope.departmentIds.length > 0) {
    conditions.push({ scope: 'DEPARTMENT', scopeId: { in: [...scope.departmentIds] } });
  }
  if (scope.offeringIds.length > 0) {
    conditions.push({ scope: 'OFFERING', scopeId: { in: [...scope.offeringIds] } });
  }
  return conditions;
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

/* r179 (phase-5): the verified institution-context gate for every
 * institution-scoped social surface — a contextless institutional
 * caller (STUDENT/TEACHER/ADMIN/QUALITY) gets 403
 * INSTITUTION_CONTEXT_REQUIRED (fail closed: POST
 * /auth/select-institution first; NO default institution, never the
 * legacy oldest-profile fallback), and a stale/forged claim surfaces
 * resolveCallerInstitutionScope's 403 INSTITUTION_CONTEXT_INVALID.
 * OWNER is handled by the CALLERS (platform-wide oversight, no
 * membership by design). */
async function requireSocialInstitution(userId: string, claim: string | null): Promise<string> {
  const institutionId = await resolveCallerInstitutionScope(userId, claim);
  if (!institutionId) {
    throw new AppError(
      'INSTITUTION_CONTEXT_REQUIRED',
      'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
      403,
    );
  }
  return institutionId;
}

/** GET /announcements/feed — visible to current user (scoped) */
router.get('/announcements/feed', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const now = new Date();

    // r179 (phase-5): the feed is institution-scoped. OWNER keeps the
    // PLATFORM-WIDE view (the create path and lib/permissions.ts both
    // treat OWNER as oversight; the platform owner holds no membership
    // so there is no context to scope by — audit 11-c P1-3's fix kept
    // them out of the scoped branch).
    if (role === Role.OWNER) {
      const all = await prisma.announcement.findMany({
        where: unexpiredAnnouncementFilter(now),
        include: { author: { select: { firstName: true, lastName: true, avatarColor: true, avatarInitials: true, role: true } } },
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: SOCIAL_LIST_TAKE,
      });
      res.json({ data: all });
      return;
    }

    // r179 (phase-5): ADMIN/QUALITY are INSTITUTIONAL roles — their
    // oversight view covers THEIR institution's scoped announcements
    // + PLATFORM rows only (previously every institution's scoped rows
    // leaked into any admin's feed). Contextless → 403 fail-closed.
    if (role === Role.ADMIN || role === Role.QUALITY) {
      const institutionId = await requireSocialInstitution(userId, req.user!.institutionId);
      const faculties = await prisma.faculty.findMany({
        where: { institutionId },
        select: { id: true, departments: { select: { id: true } } },
      });
      const offerings = await prisma.courseOffering.findMany({
        where: { course: { institutionId } },
        select: { id: true },
      });
      const mine = await prisma.announcement.findMany({
        where: {
          AND: [
            {
              OR: institutionAnnouncementConditions({
                facultyIds: faculties.map((f) => f.id),
                departmentIds: faculties.flatMap((f) => f.departments.map((d) => d.id)),
                offeringIds: offerings.map((o) => o.id),
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
      res.json({ data: mine });
      return;
    }

    // Build scope filter for student/teacher.
    // r179 (phase-5): the caller's VERIFIED institution context is
    // required (fail-closed — the r178 legacy profile fallback would
    // have built the scope from ANOTHER institution's profile), and
    // every contributing read is scoped to it: the profile resolves
    // IN the institution, enrollments/taught offerings are filtered
    // through the offering→course→institution chain so another
    // institution's rows can never widen the OFFERING scope.
    const institutionId = await requireSocialInstitution(userId, req.user!.institutionId);
    const profile = role === Role.STUDENT ? await resolveStudentProfile(userId, institutionId) : null;
    // r155a (audit finding 5): only ACTIVE enrollments contribute
    // OFFERING-scoped announcements (the platform-wide 'active'
    // convention — see lib/permissions.ts decideOfferingAccess).
    const enrollments = role === Role.STUDENT ? await prisma.enrollment.findMany({
      where: {
        studentId: userId,
        status: 'active',
        offering: { course: { institutionId } },
      },
      select: { offeringId: true },
    }) : [];

    const teacherProfile = role === Role.TEACHER
      ? await resolveTeacherProfile(userId, institutionId)
      : null;
    const teacherDepartment = teacherProfile
      ? await prisma.department.findUnique({
          where: { id: teacherProfile.departmentId },
          select: { facultyId: true },
        })
      : null;
    const teacherOfferings = role === Role.TEACHER ? await prisma.courseOffering.findMany({
      where: { teacherId: userId, course: { institutionId } },
      select: { id: true },
    }) : [];

    const announcements = await prisma.announcement.findMany({
      where: {
        AND: [
          {
            OR: buildAnnouncementScopeConditions({
              studentFacultyId: profile?.facultyId ?? null,
              studentDepartmentId: profile?.departmentId ?? null,
              enrolledOfferingIds: enrollments.map((e) => e.offeringId),
              teacherFacultyId: teacherDepartment?.facultyId ?? null,
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
      // r179 (phase-5): the target must ALSO live inside the author's
      // VERIFIED institution context — a FACULTY/DEPARTMENT/OFFERING
      // scope reaches only that institution's users, so authoring into
      // a foreign institution's target is a 404 (same envelope as a
      // nonexistent id — no existence leak). OWNER stays platform-wide.
      if (body.scope !== 'PLATFORM' && body.scopeId) {
        const role = req.user!.role;
        const uid = req.user!.id;
        const authorInstitutionId =
          role === Role.OWNER ? null : await requireSocialInstitution(uid, req.user!.institutionId);

        // Permitted target ids per role. ADMIN/QUALITY (ANNOUNCE_FACULTY
        // holders) may target any EXISTING faculty/department/offering
        // OF THEIR INSTITUTION (the existence half below enforces it);
        // TEACHER/STUDENT are limited to their own scopes.
        let permitted: AnnouncementTargetPermissions;
        if (role === Role.ADMIN || role === Role.QUALITY || role === Role.OWNER) {
          permitted = { faculty: 'any', department: 'any', offering: 'any' };
        } else if (role === Role.TEACHER) {
          // r179: per-membership profile resolved in the caller's
          // VERIFIED institution context; taught offerings are scoped
          // through the course→institution chain.
          const tp = await resolveTeacherProfile(uid, authorInstitutionId!);
          const tpDepartment = tp
            ? await prisma.department.findUnique({
                where: { id: tp.departmentId },
                select: { facultyId: true },
              })
            : null;
          const own = await prisma.courseOffering.findMany({
            where: { teacherId: uid, course: { institutionId: authorInstitutionId! } },
            select: { id: true },
          });
          permitted = {
            faculty: tpDepartment?.facultyId ? [tpDepartment.facultyId] : [],
            department: tp ? [tp.departmentId] : [],
            offering: own.map((o) => o.id),
          };
        } else {
          // STUDENT (or unusual grant) — own faculty/department/enrolled
          // offerings, all resolved inside the verified institution.
          const sp = await resolveStudentProfile(uid, authorInstitutionId!);
          const enr = await prisma.enrollment.findMany({
            where: {
              studentId: uid,
              offering: { course: { institutionId: authorInstitutionId! } },
            },
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
        // r179: the lookup carries the author's institution — a FOREIGN
        // target id simply does not resolve → 404.
        if (body.scope === 'FACULTY') {
          const faculty = authorInstitutionId
            ? await prisma.faculty.findFirst({
                where: { id: body.scopeId, institutionId: authorInstitutionId },
                select: { id: true },
              })
            : await prisma.faculty.findUnique({
                where: { id: body.scopeId },
                select: { id: true },
              });
          if (!faculty) throw AppError.notFound('الكلّيّة غير موجودة');
        } else if (body.scope === 'DEPARTMENT') {
          const dept = authorInstitutionId
            ? await prisma.department.findFirst({
                where: { id: body.scopeId, faculty: { institutionId: authorInstitutionId } },
                select: { id: true },
              })
            : await prisma.department.findUnique({
                where: { id: body.scopeId },
                select: { id: true },
              });
          if (!dept) throw AppError.notFound('القسم غير موجود');
        } else if (body.scope === 'OFFERING') {
          const offering = authorInstitutionId
            ? await prisma.courseOffering.findFirst({
                where: { id: body.scopeId, course: { institutionId: authorInstitutionId } },
                select: { id: true },
              })
            : await prisma.courseOffering.findUnique({
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

/* r179 (phase-5): the competitions list is institution-scoped —
 * institutional callers (verified context required, 403 fail-closed
 * without one) see THEIR institution's competitions only. OWNER keeps
 * the platform-wide oversight view (no membership by design). */
router.get('/competitions', async (req, res, next) => {
  try {
    const institutionId = req.user!.role === Role.OWNER
      ? null
      : await requireSocialInstitution(req.user!.id, req.user!.institutionId);
    const competitions = await prisma.competition.findMany({
      where: institutionId ? { institutionId } : undefined,
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

/* r179 (phase-5): a competition id of ANOTHER institution is a 404
 * (the same envelope as a nonexistent id) for institutional callers;
 * OWNER's platform-wide oversight keeps reading any row. */
router.get('/competitions/:id', async (req, res, next) => {
  try {
    const institutionId = req.user!.role === Role.OWNER
      ? null
      : await requireSocialInstitution(req.user!.id, req.user!.institutionId);
    const c = await prisma.competition.findFirst({
      where: { id: req.params.id, ...(institutionId ? { institutionId } : {}) },
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
    /* r179 (phase-5) minimal lead fix: competitions are created INSIDE
     * the caller's verified institution context — no context, no
     * create (fail closed, never a default institution). */
    const institutionId = await requireSocialInstitution(req.user!.id, req.user!.institutionId);
    const created = await prisma.competition.create({
      data: { ...body, organizerId: req.user!.id, institutionId },
    });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

export const enterCompSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(4000),
  // r142 (T1a-01): was a free-form string — a javascript:/data: URL
  // could be stored and rendered as an <a href>. Scheme-guarded now
  // (defense-in-depth under the CSP pin).
  fileUrl: z.string().trim().max(500)
    .refine((s) => isSanctionedMediaUrl(s), {
      message: 'fileUrl must start with https:// or /api/v1/files/papers/ or be a safe same-origin path',
    })
    .optional(),
}).strict();

router.post('/competitions/:id/enter', validate(enterCompSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    // r179 (phase-5): entering is an institution-scoped write — the
    // caller's VERIFIED context is required (403 fail-closed) and a
    // competition of ANOTHER institution is a 404, never an entry.
    const institutionId = await requireSocialInstitution(userId, req.user!.institutionId);
    const entry = await prisma.$transaction(async (tx) => {
      // Serialize per competition (the RSVP pattern below): under plain
      // READ COMMITTED the old pre-read → upsert pair let an entry land in
      // a competition that closed mid-request (audit 15-b P2-1). The row
      // lock makes the status/deadline re-check authoritative — a close or
      // judge claim either committed before us (we re-read its outcome) or
      // waits and re-evaluates its own status condition after we commit.
      // r179: institutionId rides the locked read — a foreign id is
      // checked under the SAME lock (no TOCTOU between a scoped pre-read
      // and the locked row).
      const rows = await tx.$queryRaw<
        Array<{ id: string; institutionId: string; status: CompetitionStatus; deadline: Date }>
      >`SELECT id, "institutionId", status, deadline FROM "Competition" WHERE id = ${req.params.id} FOR UPDATE`;
      const comp = rows[0];
      if (!comp || comp.institutionId !== institutionId) throw AppError.notFound('المسابقة غير موجودة');
      if (comp.status !== 'OPEN') throw new AppError('BAD_REQUEST', 'أُغلقت المسابقة أمام المشاركات', 400);
      if (comp.deadline < new Date()) throw new AppError('BAD_REQUEST', 'انتهى موعد التسليم في هذه المسابقة', 400);

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
        throw new AppError('BAD_REQUEST', 'يجب إغلاق المسابقة قبل تحكيمها', 400);
      }
      if (!canFinalizeJudging(comp.entries)) {
        throw new AppError('BAD_REQUEST', 'لم تُقيّم أي مشاركة بعد', 400);
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

/* r179 (phase-5): the events list is institution-scoped — institutional
 * callers (verified context required, 403 fail-closed without one) see
 * THEIR institution's events only; OWNER keeps the platform-wide
 * oversight view. */
router.get('/events', async (req, res, next) => {
  try {
    const now = new Date();
    const institutionId = req.user!.role === Role.OWNER
      ? null
      : await requireSocialInstitution(req.user!.id, req.user!.institutionId);
    const events = await prisma.campusEvent.findMany({
      where: { endsAt: { gte: now }, ...(institutionId ? { institutionId } : {}) },
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
    /* r179 (phase-5) minimal lead fix: events are created INSIDE the
     * caller's verified institution context — fail closed without one. */
    const institutionId = await requireSocialInstitution(req.user!.id, req.user!.institutionId);
    const created = await prisma.campusEvent.create({
      data: { ...body, organizerId: req.user!.id, institutionId },
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
    // r179 (phase-5): an RSVP is an institution-scoped write — the
    // caller's VERIFIED context is required (403 fail-closed) and an
    // event of ANOTHER institution is a 404 (same envelope as a
    // nonexistent id — no cross-institution existence leak).
    const institutionId = await requireSocialInstitution(userId, req.user!.institutionId);
    const event = await prisma.campusEvent.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!event) throw AppError.notFound('الفعالية غير موجودة');
    // r152b (A5 P3): the read side filters endsAt >= now — a past event
    // must not accept new RSVPs or status flips that would mutate
    // historical seat counts. Small grace window absorbs clock skew.
    if (event.endsAt.getTime() < Date.now() - 60_000) {
      throw AppError.badRequest('انتهت هذه الفعالية — لا يمكن تعديل الحجز');
    }
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

// ════════════════════════════════════════════════════════════════
//  Study rooms (r180)
// ════════════════════════════════════════════════════════════════

/* r180: غرف الدراسة تصبح حقيقية — كانت موجودة في schema.prisma منذ
 * r179 (مع institutionId) بلا أي مسارات تخدمها. هي سطح «جدولة
 * وعضوية» داخل المؤسسة الواحدة (لا محادثة هنا عمدًا): القائمة
 * تنحصر في مؤسسة المستدعِي المتحقَّق منها، والإنشاء يربط الغرفة
 * بمؤسسة المنشئ ويجعله أول عضو، والانضمام/المغادرة يقعان داخل
 * حدود المؤسسة فقط — معرّف غرفة مؤسسة أخرى = 404 (بلا تسريب
 * وجود، كنمط rsvp/enter في هذا الملف). الحذف والتعديل والمحادثة
 * خارج نطاق r180 عن قصد. */

/** Row the study-room list reads — the viewer's OWN membership rows ride
 * `members` (the posts feed's filtered `reactions` → `viewerReacted`
 * pattern, and the events list's `myRsvp` twin). */
export interface StudyRoomListItem {
  id: string;
  name: string;
  topic: string | null;
  createdAt: Date;
  owner: { id: string; firstName: string; lastName: string; avatarInitials: string | null };
  _count: { members: number };
  members: ReadonlyArray<{ userId: string }>;
}

/**
 * Project one list row: drop the viewer-membership helper rows and
 * surface the additive `isMember` flag — the «أنا عضو» state must
 * survive reload from the server, not live only in client memory
 * (the `viewerReacted`/`myRsvp` precedent of this file). Pure +
 * exported for unit tests.
 */
export function studyRoomListItem(
  row: StudyRoomListItem,
): Omit<StudyRoomListItem, 'members'> & { isMember: boolean } {
  const { members: _viewerRows, ...room } = row;
  return { ...room, isMember: _viewerRows.length > 0 };
}

/* GET /study-rooms — غرف مؤسسة المستدعِي (المسار نفسه لكل الأدوار
 * المؤسسية STUDENT/TEACHER/ADMIN/QUALITY عبر requireSocialInstitution
 * — 403 fail-closed بلا سياق). OWNER يبقى بنظارة شاملة كعادات
 * قوائم هذا الملف (المسابقات/الفعاليات). */
router.get('/study-rooms', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const institutionId = req.user!.role === Role.OWNER
      ? null
      : await requireSocialInstitution(userId, req.user!.institutionId);
    const rooms = await prisma.studyRoom.findMany({
      where: institutionId ? { institutionId } : undefined,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarInitials: true } },
        _count: { select: { members: true } },
        // عضوية المستدعِي نفسه فقط — تُغذّي isMember في الإسقاط أعلاه.
        members: { where: { userId }, select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: SOCIAL_LIST_TAKE,
    });
    res.json({ data: rooms.map(studyRoomListItem) });
  } catch (e) { next(e); }
});

export const createStudyRoomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  topic: z.string().trim().max(300).optional(),
}).strict();

router.post('/study-rooms', validate(createStudyRoomSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createStudyRoomSchema>;
    // مثل بقية إنشاءات هذا الملف (r179): سياق مؤسسة متحقَّق منه وإلا
    // 403 INSTITUTION_CONTEXT_REQUIRED — لا مؤسسة افتراضية أبدًا.
    const institutionId = await requireSocialInstitution(req.user!.id, req.user!.institutionId);
    // الغرفة + عضوية المنشئ (أول عضو) في معاملة واحدة — نفس أسلوب
    // $transaction في هذا الملف: لا غرفة تبقى بلا منشئ عضو فيها إذا
    // فشل النصف الثاني.
    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.studyRoom.create({
        data: {
          name: body.name,
          topic: body.topic ?? null,
          ownerId: req.user!.id,
          institutionId,
        },
      });
      await tx.studyRoomMember.create({
        data: { roomId: created.id, userId: req.user!.id },
      });
      return created;
    });
    res.status(201).json({ data: room });
  } catch (e) { next(e); }
});

/* POST /study-rooms/:id/join — الانضمام لغرفة مؤسستك فقط. */
router.post('/study-rooms/:id/join', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    // كتابة مؤسسية: سياق متحقَّق منه (403 fail-closed) — مثل rsvp/enter.
    const institutionId = await requireSocialInstitution(userId, req.user!.institutionId);
    // البحث يحمل مؤسسة المستدعِي: غرفة مؤسسة أخرى لا تُحلّ أصلًا →
    // 404 بنفس مغلّف المعرّف غير الموجود (بلا تسريب وجود).
    const room = await prisma.studyRoom.findFirst({
      where: { id: req.params.id, institutionId },
      select: { id: true },
    });
    if (!room) throw AppError.notFound('غرفة الدراسة غير موجودة');
    const existing = await prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
      select: { roomId: true },
    });
    if (existing) throw AppError.conflict('أنت عضو في هذه الغرفة بالفعل');
    try {
      const membership = await prisma.studyRoomMember.create({
        data: { roomId: room.id, userId },
      });
      res.status(201).json({ data: membership });
    } catch (e) {
      // P2002 = انضمام متزامن أنشأ الصف قبل الفحص أعلاه — 409، النمط
      // نفسه المستخدم في enroll المساقات المفتوحة (catalog.routes).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw AppError.conflict('أنت عضو في هذه الغرفة بالفعل');
      }
      throw e;
    }
  } catch (e) { next(e); }
});

/* POST /study-rooms/:id/leave — المغادرة. مالك الغرفة لا يغادرها
 * (400 — الحذف خارج نطاق r180، فلا مخرج آخر هنا وهذا متعمَّد
 * وموثَّق بصدق). ليس عضوًا → 404. */
router.post('/study-rooms/:id/leave', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const institutionId = await requireSocialInstitution(userId, req.user!.institutionId);
    const room = await prisma.studyRoom.findFirst({
      where: { id: req.params.id, institutionId },
      select: { id: true, ownerId: true },
    });
    if (!room) throw AppError.notFound('غرفة الدراسة غير موجودة');
    if (room.ownerId === userId) {
      throw AppError.badRequest('مالك الغرفة لا يغادرها');
    }
    const membership = await prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
      select: { roomId: true },
    });
    if (!membership) throw AppError.notFound('أنت لست عضوًا في هذه الغرفة');
    await prisma.studyRoomMember.delete({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    res.json({ data: { roomId: room.id, left: true } });
  } catch (e) { next(e); }
});

export default router;
