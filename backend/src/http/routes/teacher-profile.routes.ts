import { Router } from 'express';
import { z } from 'zod';
import { LiveSessionStatus, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireInstitution } from '../middleware/institution.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { isSanctionedMediaUrl } from '../../lib/sanctioned-url.js';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
//  Teacher profile — full academic record
// ════════════════════════════════════════════════════════════════

/** GET /me/teacher-profile — full self profile for the logged-in teacher */
// Roles aligned with PATCH: TEACHER/OWNER. ADMIN was allowed to READ but
// has no teacher profile (404 every time) and the write side 403s them —
// an incoherent split.
//
// r179 (phase-5): the profile is per-MEMBERSHIP — requireInstitution
// both DB-verifies the caller's membership context AND pre-resolves
// the profile for it (the same contract PATCH below has held since
// r178). The legacy oldest-profile fallback for a contextless session
// is GONE: the caller must have selected an institution first (403
// INSTITUTION_CONTEXT_REQUIRED).
router.get(
  '/me/teacher-profile',
  requireRole(Role.TEACHER, Role.OWNER),
  requireInstitution,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const profile = req.teacherProfile;
      if (!profile) {
        // Return 404 without crashing — admins logging in won't have one
        throw AppError.notFound('لا يوجد ملف أكاديمي للأستاذ لهذا المستخدم');
      }
      const [profileUser, profileDepartment] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, email: true, avatarColor: true, avatarInitials: true },
        }),
        prisma.department.findUnique({
          where: { id: profile.departmentId },
          include: { faculty: { select: { name: true } } },
        }),
      ]);
      if (!profileUser || !profileDepartment) {
        throw AppError.notFound('لا يوجد ملف أكاديمي للأستاذ لهذا المستخدم');
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
        name: `${profileUser.firstName} ${profileUser.lastName}`,
        firstName: profileUser.firstName,
        lastName: profileUser.lastName,
        email: profileUser.email,
        avatarColor: profileUser.avatarColor,
        avatarInitials: profileUser.avatarInitials,
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
        department: profileDepartment.name,
        faculty: profileDepartment.faculty.name,
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

export const updateProfileSchema = z.object({
  bio: z.string().trim().max(2000).nullable().optional(),
  officeLocation: z.string().trim().max(200).nullable().optional(),
  officeHours: z.string().trim().max(200).nullable().optional(),
  websiteUrl: z.string().trim().max(300).nullable().optional(),
  publications: z.array(z.object({
    title: z.string().trim().min(2).max(300),
    venue: z.string().trim().max(200).optional(),
    year: profileYearSchema,
    // r142 (T1a-02): was a free-form string — publications are rendered
    // as <a href> on the public profile; scheme-guarded now.
    url: z.string().trim().max(500)
      .refine((s) => isSanctionedMediaUrl(s), {
        message: 'url must start with https:// or /api/v1/files/papers/ or be a safe same-origin path',
      })
      .optional(),
  })).max(50).optional(),
  awards: z.array(z.object({
    title: z.string().trim().min(2).max(200),
    year: profileYearSchema,
    issuer: z.string().trim().max(200).optional(),
  })).max(30).optional(),
}).strict();

/** PATCH /me/teacher-profile — self-service update (bio + contact + lists) */
// r178: the update needs the institution context — the profile being
// patched is per-membership, and requireInstitution both DB-verifies the
// caller's membership AND pre-resolves the profile for it (the mission's
// teacher-profile-update flow). A contextless session must select an
// institution first (403 INSTITUTION_CONTEXT_REQUIRED).
router.patch(
  '/me/teacher-profile',
  requireRole(Role.TEACHER, Role.OWNER),
  requireInstitution,
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof updateProfileSchema>;
      // The membership-scoped profile (requireInstitution attached it).
      if (!req.teacherProfile) {
        throw AppError.notFound('لا يوجد ملف أكاديمي للأستاذ لهذا المستخدم');
      }
      const updated = await prisma.teacherProfile.update({
        where: { id: req.teacherProfile.id },
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
  },
);

// ════════════════════════════════════════════════════════════════
//  Live streaming — the pure lifecycle contract ONLY (R354 E2).
// ════════════════════════════════════════════════════════════════
// R354 E2 finding: the three /live/sessions* route handlers that
// lived here were SHADOWED dead code — live.routes.ts is mounted
// FIRST (app.ts line 324 vs this router's line 382), so Express never
// dispatched to these copies (which had also drifted from the live
// ones' guards). The dead handlers are deleted; the PURE exports
// below stay — visibility-logic.test.ts pins them and the live router
// reuses the same transition contract via modules/live/core.js.

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

export default router;
