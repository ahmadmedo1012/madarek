import { Router } from 'express';
import { z } from 'zod';
import { LiveSessionStatus, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
//  Teacher profile — full academic record
// ════════════════════════════════════════════════════════════════

/** GET /me/teacher-profile — full self profile for the logged-in teacher */
router.get('/me/teacher-profile', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
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

const updateProfileSchema = z.object({
  bio: z.string().max(2000).nullable().optional(),
  officeLocation: z.string().max(200).nullable().optional(),
  officeHours: z.string().max(200).nullable().optional(),
  websiteUrl: z.string().max(300).nullable().optional(),
  publications: z.array(z.object({
    title: z.string().min(2).max(300),
    venue: z.string().max(200).optional(),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
    url: z.string().max(500).optional(),
  })).max(50).optional(),
  awards: z.array(z.object({
    title: z.string().min(2).max(200),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
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

    // Teacher → their own sessions
    // Student → sessions for offerings they're enrolled in
    // Admin/Quality → all
    let where: Record<string, unknown> = {};
    if (role === Role.TEACHER) {
      where = { teacherId: userId };
    } else if (role === Role.STUDENT) {
      const enr = await prisma.enrollment.findMany({
        where: { studentId: userId },
        select: { offeringId: true },
      });
      where = { offeringId: { in: enr.map((e) => e.offeringId) } };
    }

    const sessions = await prisma.liveSession.findMany({
      where,
      include: {
        offering: { select: { id: true, course: { select: { name: true, code: true, iconEmoji: true, themeColor: true } } } },
        teacher: { select: { firstName: true, lastName: true, avatarInitials: true, avatarColor: true } },
      },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'desc' }],
      take: 50,
    });

    res.json({ data: sessions });
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

router.post('/live/sessions', requireRole(Role.TEACHER, Role.OWNER), validate(createSessionSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSessionSchema>;
    // Verify the offering is one this teacher actually teaches
    const offering = await prisma.courseOffering.findUnique({ where: { id: body.offeringId } });
    if (!offering) throw AppError.notFound('Offering not found');
    if (req.user!.role !== Role.OWNER && offering.teacherId !== req.user!.id) throw AppError.forbidden('Not your offering');

    const session = await prisma.liveSession.create({
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
    });
    res.status(201).json({ data: session });
  } catch (e) { next(e); }
});

const lifecycleSchema = z.object({
  action: z.enum(['START', 'END', 'CANCEL']),
}).strict();

router.post('/live/sessions/:id/lifecycle', requireRole(Role.TEACHER, Role.OWNER), validate(lifecycleSchema), async (req, res, next) => {
  try {
    const session = await prisma.liveSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw AppError.notFound();
    if (req.user!.role !== Role.OWNER && session.teacherId !== req.user!.id) throw AppError.forbidden('Not your session');

    let nextStatus: LiveSessionStatus = 'SCHEDULED';
    let extraFields: Record<string, unknown> = {};
    switch (req.body.action) {
      case 'START':
        nextStatus = 'LIVE';
        extraFields = { startedAt: new Date() };
        break;
      case 'END':
        nextStatus = 'ENDED';
        extraFields = { endedAt: new Date() };
        break;
      case 'CANCEL':
        nextStatus = 'CANCELLED';
        break;
    }

    const updated = await prisma.liveSession.update({
      where: { id: session.id },
      data: { status: nextStatus, ...extraFields },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

export default router;
