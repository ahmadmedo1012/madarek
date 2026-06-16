import { Router } from 'express';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

/**
 * GET /search/global?q=...
 *
 * Cross-cutting search across courses, lectures, research papers, and training tracks.
 * Returns at most 5 hits per category. Designed for autocomplete dropdown — fast,
 * tolerant, and limited in scope.
 *
 * Permission model: respects the user's role.
 *  - STUDENT/TEACHER: only their own offerings/lectures
 *  - ADMIN/QUALITY: everything
 */
router.get('/search/global', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      res.json({ data: { courses: [], lectures: [], papers: [], tracks: [] } });
      return;
    }

    const userId = req.user!.id;
    const role = req.user!.role;

    const ic = (s: string) => ({ contains: s, mode: 'insensitive' as const });

    // Scope: which offerings is this user related to?
    const offeringFilter =
      role === 'TEACHER'
        ? { teacherId: userId }
        : role === 'STUDENT'
          ? { enrollments: { some: { studentId: userId } } }
          : {};

    // Course offerings (matched on course name + code)
    const courses = await prisma.courseOffering.findMany({
      where: {
        ...offeringFilter,
        OR: [
          { course: { name: ic(q) } },
          { course: { code: ic(q) } },
        ],
      },
      include: {
        course: { select: { name: true, code: true, iconEmoji: true, themeColor: true } },
      },
      take: 5,
    });

    // Lectures (within scope)
    const lectures = await prisma.lecture.findMany({
      where: {
        OR: [
          { title: ic(q) },
          { description: ic(q) },
        ],
        offering: offeringFilter,
      },
      include: {
        offering: {
          select: {
            id: true,
            course: { select: { name: true, iconEmoji: true } },
          },
        },
      },
      orderBy: { ordinal: 'asc' },
      take: 5,
    });

    // Published research papers (anyone authenticated can search the library)
    const papers = await prisma.researchPaper.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: ic(q) },
          { abstract: ic(q) },
        ],
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    });

    // Training tracks
    const tracks = await prisma.trainingTrack.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: ic(q) },
          { titleEn: ic(q) },
          { summary: ic(q) },
        ],
      },
      take: 5,
    });

    res.json({
      data: {
        courses: courses.map((o) => ({
          id: o.id,
          title: o.course.name,
          subtitle: `${o.course.code} · ${o.term}`,
          iconEmoji: o.course.iconEmoji,
          themeColor: o.course.themeColor,
          href:
            role === 'TEACHER' ? `/teacher/intelligence/${o.id}` :
            role === 'STUDENT' ? `/student/courses/${o.id}` :
            `/admin/courses`,
        })),
        lectures: lectures.map((l) => ({
          id: l.id,
          title: l.title,
          subtitle: l.offering.course.name,
          iconEmoji: l.offering.course.iconEmoji,
          href: role === 'TEACHER' ? `/teacher/intelligence/${l.offering.id}` : `/student/lectures/${l.id}`,
        })),
        papers: papers.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: `بحث منشور · ${p.student.firstName} ${p.student.lastName}`,
          iconEmoji: '📄',
          href: `/document/${p.id}`,
        })),
        tracks: tracks.map((t) => ({
          id: t.id,
          slug: t.slug,
          title: t.title,
          subtitle: t.summary.slice(0, 80),
          iconEmoji: t.iconEmoji,
          themeColor: t.themeColor,
          href: `/training/${t.slug}`,
        })),
      },
    });
  } catch (e) { next(e); }
});

export default router;
