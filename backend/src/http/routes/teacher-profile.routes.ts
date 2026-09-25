import { Router } from 'express';
import { z } from 'zod';
import { LiveSessionStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertOwnsOffering } from '../../lib/permissions.js';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
//  Teacher profile — full academic record
// ════════════════════════════════════════════════════════════════

/** GET /me/teacher-profile — full self profile for the logged-in teacher */
// Roles aligned with PATCH: TEACHER/OWNER. ADMIN was allowed to READ but
// has no teacher profile (404 every time) and the write side 403s them —
// an incoherent split.
router.get('/me/teacher-profile', requireRole(Role.TEACHER, Role.OWNER), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatarColor: true, avatarInitials: true } },
        department: { include: { faculty: { select: { name: true } } } },
      },
    });
    if (!profile) {
      // Return 404 without crashing — admins logging in won't have one
      throw AppError.notFound('No teacher profile for this user');
    }

    // Courses currently taught + simple workload metric
    const offerings = await prisma.courseOffering.findMany({
      where: { teacherId: userId },
      include: {
        course: { select: { id: true, code: true, name: true, iconEmoji: true, themeColor: true, credits: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEnrolled = offerings.reduce((sum, o) => sum + o._count.enrollments, 0);
    const totalCredits = offerings.reduce((sum, o) => sum + (o.course.credits ?? 3), 0);

    res.json({
      data: {
        userId: profile.userId,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        email: profile.user.email,
        avatarColor: profile.user.avatarColor,
        avatarInitials: profile.user.avatarInitials,
        specialty: profile.specialty,
        rank: profile.rank,
        bio: profile.bio,
        degreeLevel: profile.degreeLevel,
        yearsExperience: profile.yearsExperience,
        certifications: profile.certifications ?? [],
        publications: profile.publications ?? [],
        awards: profile.awards ?? [],
        profileImageUrl: profile.profileImageUrl,
        officeLocation: profile.officeLocation,
        officeHours: profile.officeHours,
        websiteUrl: profile.websiteUrl,
        subjectKeywords: profile.subjectKeywords,
        verifiedAt: profile.verifiedAt,
        department: profile.department.name,
        faculty: profile.department.faculty.name,
        courses: offerings.map((o) => ({
          offeringId: o.id,
          code: o.course.code,
          name: o.course.name,
          iconEmoji: o.course.iconEmoji,
          themeColor: o.course.themeColor,
          credits: o.course.credits,
          enrolled: o._count.enrollments,
          term: o.term,
        })),
        workload: {
          courseCount: offerings.length,
          totalCredits,
          totalEnrolled,
        },
      },
    });
  } catch (e) { next(e); }
});

// Year bound evaluated at VALIDATION time, not at module load — a server
// running across New Year must keep validating against the new year
// (audit 11-d P2-18). One year ahead stays allowed (announced,
// forthcoming publications/awards).
const profileYearSchema = z
  .number()
  .int()
  .min(1950)
  .refine((year) => year <= new Date().getFullYear() + 1, {
    message: 'year is too far in the future',
  });

const updateProfileSchema = z.object({
  bio: z.string().max(2000).nullable().optional(),
  officeLocation: z.string().max(200).nullable().optional(),
  officeHours: z.string().max(200).nullable().optional(),
  websiteUrl: z.string().max(300).nullable().optional(),
  publications: z.array(z.object({
    title: z.string().min(2).max(300),
    venue: z.string().max(200).optional(),
    year: profileYearSchema,
    url: z.string().max(500).optional(),
  })).max(50).optional(),
  awards: z.array(z.object({
    title: z.string().min(2).max(200),
    year: profileYearSchema,
    issuer: z.string().max(200).optional(),
  })).max(30).optional(),
}).strict();

/** PATCH /me/teacher-profile — self-service update (bio + contact + lists) */
router.patch('/me/teacher-profile', requireRole(Role.TEACHER, Role.OWNER), validate(updateProfileSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof updateProfileSchema>;
    const updated = await prisma.teacherProfile.update({
      where: { userId: req.user!.id },
      data: {
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.officeLocation !== undefined ? { officeLocation: body.officeLocation } : {}),
        ...(body.officeHours !== undefined ? { officeHours: body.officeHours } : {}),
        ...(body.websiteUrl !== undefined ? { websiteUrl: body.websiteUrl } : {}),
        ...(body.publications !== undefined ? { publications: body.publications } : {}),
        ...(body.awards !== undefined ? { awards: body.awards } : {}),
      },
      select: { userId: true, updatedAt: true },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Live streaming — teacher controls + student watch list
// ════════════════════════════════════════════════════════════════

/** GET /live/sessions — visibility scoped to role */
router.get('/live/sessions', async (req, res, next) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.id;

    // Teacher → sessions on the offerings they teach (same offering-scoped
    //   model as the write guards below — an OWNER/ADMIN-created session on
    //   their offering is theirs to run too, so it must be theirs to see).
    // Student → sessions for offerings they're ACTIVELY enrolled in.
    // Admin/Quality → all.
    let where: Prisma.LiveSessionWhereInput = {};
    if (role === Role.TEACHER) {
      where = { offering: { teacherId: userId } };
    } else if (role === Role.STUDENT) {
      const enr = await prisma.enrollment.findMany({
        where: { studentId: userId, status: 'active' },
        select: { offeringId: true },
      });
      where = { offeringId: { in: enr.map((e) => e.offeringId) } };
    }

    // Rank-ordered fetch: one bounded bucket per status. A single
    // `take: 50, orderBy scheduledAt desc` could drop LIVE rows when 50
    // newer-scheduled historical sessions exist, and SQL cannot order by
    // enum rank without a raw query. Each bucket keeps its own meaningful
    // order — LIVE/SCHEDULED soonest first, ENDED/CANCELLED most recent
    // first — so no in-memory re-sort is needed either.
    const include: Prisma.LiveSessionInclude = {
      offering: { select: { id: true, course: { select: { name: true, code: true, iconEmoji: true, themeColor: true } } } },
      teacher: { select: { firstName: true, lastName: true, avatarInitials: true, avatarColor: true } },
    };
    const [live, scheduled, ended, cancelled] = await Promise.all([
      prisma.liveSession.findMany({ where: { ...where, status: 'LIVE' }, include, orderBy: { scheduledAt: 'asc' }, take: 50 }),
      prisma.liveSession.findMany({ where: { ...where, status: 'SCHEDULED' }, include, orderBy: { scheduledAt: 'asc' }, take: 50 }),
      prisma.liveSession.findMany({ where: { ...where, status: 'ENDED' }, include, orderBy: { scheduledAt: 'desc' }, take: 50 }),
      prisma.liveSession.findMany({ where: { ...where, status: 'CANCELLED' }, include, orderBy: { scheduledAt: 'desc' }, take: 50 }),
    ]);

    // What's LIVE now first, then what's SCHEDULED next (soonest first),
    // then ENDED/CANCELLED history (most recent first).
    res.json({ data: [...live, ...scheduled, ...ended, ...cancelled] });
  } catch (e) { next(e); }
});

const createSessionSchema = z.object({
  offeringId: z.string().cuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  topic: z.string().max(200).optional(),
  scheduledAt: z.coerce.date(),
  joinUrl: z.string().max(500).optional(),
}).strict();

// Small grace so "starts now" survives client clock skew and the
// datetime picker's minute resolution — anything further in the past
// is a mistyped date, not a schedule.
const SCHEDULED_AT_PAST_GRACE_MS = 5 * 60 * 1000;

router.post('/live/sessions', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), validate(createSessionSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSessionSchema>;

    // Offering-scoped ownership — the same guard every other offering
    // write uses (OWNER bypass / ADMIN via CURRICULUM_EDIT_ANY / TEACHER
    // own-only) and a 404 on a missing offering. The previous inline
    // `teacherId !== user` check 403'd admins who can author this
    // offering's curriculum — an inconsistent admin model (audit 11-d
    // P2-11b).
    await assertOwnsOffering(body.offeringId, req.user!.id, req.user!.role);

    if (body.scheduledAt.getTime() < Date.now() - SCHEDULED_AT_PAST_GRACE_MS) {
      throw AppError.badRequest('موعد الجلسة لا يمكن أن يكون في الماضي');
    }

    const session = await prisma.liveSession.create({
      data: {
        offeringId: body.offeringId,
        // Attributed to the acting user. For TEACHERs (the common case)
        // that is also the offering's teacher; an OWNER/ADMIN acting on a
        // colleague's offering keeps their own attribution.
        teacherId: req.user!.id,
        title: body.title,
        description: body.description ?? null,
        topic: body.topic ?? null,
        scheduledAt: body.scheduledAt,
        joinUrl: body.joinUrl ?? null,
        status: 'SCHEDULED',
      },
    });
    res.status(201).json({ data: session });
  } catch (e) { next(e); }
});

const lifecycleSchema = z.object({
  action: z.enum(['START', 'END', 'CANCEL']),
}).strict();

export type LiveSessionAction = z.infer<typeof lifecycleSchema>['action'];

// A session can only move FORWARD through its lifecycle:
//   SCHEDULED → LIVE (START) | CANCELLED (CANCEL)
//   LIVE      → ENDED (END)  | CANCELLED (CANCEL)
// ENDED/CANCELLED are terminal. Previously every action applied to every
// status — END a never-started session, re-START an ENDED one (resetting
// startedAt), START a CANCELLED one (audit 11-d P2-11a).
// Exported + pinned DB-free (audit 15-i TOP-3, wave 16-B10) — session
// states are broadcast to student LIVE lists, so an accidental map edit
// that resurrects cancelled sessions must fail a test, not production.
export const LIVE_SESSION_TRANSITIONS: Record<LiveSessionStatus, Partial<Record<LiveSessionAction, LiveSessionStatus>>> = {
  SCHEDULED: { START: 'LIVE', CANCEL: 'CANCELLED' },
  LIVE: { END: 'ENDED', CANCEL: 'CANCELLED' },
  ENDED: {},
  CANCELLED: {},
};

/** The next status for `action` from `status`, or null when the move is illegal (terminal/backwards). */
export function nextLiveSessionStatus(status: LiveSessionStatus, action: LiveSessionAction): LiveSessionStatus | null {
  return LIVE_SESSION_TRANSITIONS[status][action] ?? null;
}

// Arabic labels for the teacher-facing conflict messages (the UI shows
// server error text verbatim).
const LIVE_ACTION_LABEL: Record<LiveSessionAction, string> = {
  START: 'بدء',
  END: 'إنهاء',
  CANCEL: 'إلغاء',
};
const LIVE_STATUS_LABEL: Record<LiveSessionStatus, string> = {
  SCHEDULED: 'مجدولة',
  LIVE: 'مباشرة',
  ENDED: 'منتهية',
  CANCELLED: 'ملغاة',
};

/**
 * The 409 body for an illegal lifecycle move — the teacher UI shows this
 * text verbatim, so the Arabic action/status labels are the contract
 * (audit 15-i TOP-3; pinned by visibility-logic.test.ts).
 */
export function liveTransitionConflictMessage(status: LiveSessionStatus, action: LiveSessionAction): string {
  return `لا يمكن ${LIVE_ACTION_LABEL[action]} جلسة ${LIVE_STATUS_LABEL[status]}`;
}

router.post('/live/sessions/:id/lifecycle', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), validate(lifecycleSchema), async (req, res, next) => {
  try {
    const session = await prisma.liveSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw AppError.notFound();

    // Offering-scoped ownership, same as create (see above).
    await assertOwnsOffering(session.offeringId, req.user!.id, req.user!.role);

    const action = (req.body as z.infer<typeof lifecycleSchema>).action;
    const nextStatus = nextLiveSessionStatus(session.status, action);
    if (!nextStatus) {
      throw AppError.conflict(liveTransitionConflictMessage(session.status, action));
    }

    // Conditional claim: the flip only applies while the row is still in
    // the status we read. A concurrent lifecycle action on the same
    // session loses the race and 409s instead of double-flipping (e.g.
    // START landing after CANCEL used to resurrect a cancelled session).
    const claim = await prisma.liveSession.updateMany({
      where: { id: session.id, status: session.status },
      data: {
        status: nextStatus,
        ...(action === 'START' ? { startedAt: new Date() } : {}),
        ...(action === 'END' ? { endedAt: new Date() } : {}),
      },
    });
    if (claim.count === 0) {
      throw AppError.conflict('تغيّرت حالة الجلسة — حدّث الصفحة ثم أعد المحاولة');
    }

    // updateMany returns no row — read back the persisted state.
    const updated = await prisma.liveSession.findUnique({ where: { id: session.id } });
    if (!updated) throw AppError.internal(); // unreachable barring a mid-request cascade delete
    res.json({ data: updated });
  } catch (e) { next(e); }
});

export default router;
