import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

/**
 * Self-Development module — training tracks, lessons, badges, points.
 *
 *  GET  /training/catalog                      list all published tracks (with progress for current user)
 *  GET  /training/tracks/:slug                 single track with lessons + my progress
 *  POST /training/tracks/:slug/enroll          enroll the current user
 *  POST /training/lessons/:lessonId/complete   mark lesson done (idempotent), award points
 *  GET  /training/me                           summary for current user (level, points, badges, certs)
 *  GET  /training/me/badges                    full badge list for current user
 *  GET  /training/me/certificates              certificates earned via training
 *  GET  /training/leaderboard                  top 20 by total points
 */

// ─── Helpers ──────────────────────────────────────────────────────
const POINTS_PER_LEVEL = 500;

function levelFor(points: number): { level: number; tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'; toNext: number; pctIntoLevel: number } {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const into = points % POINTS_PER_LEVEL;
  const toNext = POINTS_PER_LEVEL - into;
  const tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' =
    level >= 8 ? 'PLATINUM' : level >= 5 ? 'GOLD' : level >= 3 ? 'SILVER' : 'BRONZE';
  return { level, tier, toNext, pctIntoLevel: Math.round((into / POINTS_PER_LEVEL) * 100) };
}

async function totalPointsFor(userId: string): Promise<number> {
  const agg = await prisma.pointsLedger.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

async function awardPoints(userId: string, points: number, reason: string, refType?: string, refId?: string) {
  await prisma.pointsLedger.create({
    data: { userId, points, reason, refType: refType ?? null, refId: refId ?? null },
  });
}

async function awardBadgeBySlug(userId: string, slug: string) {
  const badge = await prisma.badge.findUnique({ where: { slug } });
  if (!badge) return null;
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return null;
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
  return badge;
}

// ─── Catalog ─────────────────────────────────────────────────────
router.get('/training/catalog', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const tracks = await prisma.trainingTrack.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
      include: { lessons: { select: { id: true } } },
    });
    const enrollments = await prisma.trainingEnrollment.findMany({
      where: { userId },
      include: { progresses: { select: { lessonId: true } } },
    });
    const enrollMap = new Map(enrollments.map((e) => [e.trackId, e]));
    res.json({
      data: tracks.map((t) => {
        const enr = enrollMap.get(t.id);
        const totalLessons = t.lessons.length;
        const completed = enr ? enr.progresses.length : 0;
        return {
          id: t.id,
          slug: t.slug,
          title: t.title,
          titleEn: t.titleEn,
          summary: t.summary,
          category: t.category,
          level: t.level,
          iconEmoji: t.iconEmoji,
          themeColor: t.themeColor,
          estMinutes: t.estMinutes,
          pointsAward: t.pointsAward,
          totalLessons,
          enrolled: !!enr,
          completedLessons: completed,
          isCompleted: !!enr?.completedAt,
          progressPct: totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100),
        };
      }),
    });
  } catch (e) { next(e); }
});

// ─── Single track ────────────────────────────────────────────────
router.get('/training/tracks/:slug', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const track = await prisma.trainingTrack.findUnique({
      where: { slug: req.params.slug },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });
    if (!track) throw new AppError('NOT_FOUND', 'Track not found', 404);

    const enrollment = await prisma.trainingEnrollment.findUnique({
      where: { userId_trackId: { userId, trackId: track.id } },
      include: { progresses: { select: { lessonId: true } } },
    });
    const completedSet = new Set(enrollment?.progresses.map((p) => p.lessonId) ?? []);

    res.json({
      data: {
        id: track.id,
        slug: track.slug,
        title: track.title,
        titleEn: track.titleEn,
        summary: track.summary,
        category: track.category,
        level: track.level,
        iconEmoji: track.iconEmoji,
        themeColor: track.themeColor,
        estMinutes: track.estMinutes,
        pointsAward: track.pointsAward,
        enrolled: !!enrollment,
        isCompleted: !!enrollment?.completedAt,
        completedAt: enrollment?.completedAt ?? null,
        lessons: track.lessons.map((l) => ({
          id: l.id,
          order: l.order,
          title: l.title,
          summary: l.summary,
          contentMarkdown: l.contentMarkdown,
          estMinutes: l.estMinutes,
          pointsAward: l.pointsAward,
          quizQuestion: l.quizQuestion,
          // Don't leak the answer to the client — it gets validated server-side on completion
          isCompleted: completedSet.has(l.id),
        })),
      },
    });
  } catch (e) { next(e); }
});

// ─── Enroll ──────────────────────────────────────────────────────
router.post('/training/tracks/:slug/enroll', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const track = await prisma.trainingTrack.findUnique({ where: { slug: req.params.slug } });
    if (!track) throw new AppError('NOT_FOUND', 'Track not found', 404);
    const enrollment = await prisma.trainingEnrollment.upsert({
      where: { userId_trackId: { userId, trackId: track.id } },
      update: {},
      create: { userId, trackId: track.id },
    });
    res.status(201).json({ data: { id: enrollment.id, trackId: track.id, startedAt: enrollment.startedAt } });
  } catch (e) { next(e); }
});

// ─── Complete a lesson ───────────────────────────────────────────
const completeLessonSchema = z.object({
  // Optional quiz answer; if track requires one, server checks vs stored answer (case-insensitive).
  quizAnswer: z.string().max(500).optional(),
}).strict();

router.post(
  '/training/lessons/:lessonId/complete',
  validate(completeLessonSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const lessonId = req.params.lessonId;
      const lesson = await prisma.trainingLesson.findUnique({
        where: { id: lessonId },
        include: { track: true },
      });
      if (!lesson) throw new AppError('NOT_FOUND', 'Lesson not found', 404);

      // Validate quiz answer if the lesson defines one
      if (lesson.quizAnswer) {
        const submitted = (req.body.quizAnswer ?? '').toString().trim().toLowerCase();
        const expected = lesson.quizAnswer.trim().toLowerCase();
        if (!submitted) throw new AppError('BAD_REQUEST', 'يجب الإجابة على السؤال أولاً', 400);
        // Tolerant matching: compare alphanumeric tokens
        const norm = (s: string) => s.replace(/[\s,،.\-_/'"]+/g, ' ').trim();
        if (!norm(submitted).includes(norm(expected)) && !norm(expected).includes(norm(submitted))) {
          throw new AppError('BAD_REQUEST', 'الإجابة غير صحيحة، حاول مجدداً', 400);
        }
      }

      // Find or create the enrollment
      const enrollment = await prisma.trainingEnrollment.upsert({
        where: { userId_trackId: { userId, trackId: lesson.trackId } },
        update: {},
        create: { userId, trackId: lesson.trackId },
      });

      // Idempotent complete
      const existing = await prisma.lessonProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
      });
      const newlyCompleted = !existing;

      const newBadges: Array<{ slug: string; title: string; iconEmoji: string }> = [];

      if (newlyCompleted) {
        await prisma.lessonProgress.create({
          data: { enrollmentId: enrollment.id, lessonId: lesson.id, pointsAwarded: lesson.pointsAward },
        });
        await awardPoints(userId, lesson.pointsAward, 'lesson_completed', 'TrainingLesson', lesson.id);

        // First-step badge — first ever lesson completion
        const totalCompleted = await prisma.lessonProgress.count({
          where: { enrollment: { userId } },
        });
        if (totalCompleted === 1) {
          const b = await awardBadgeBySlug(userId, 'badge-first-step');
          if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
        }

        // Track-completion check
        const totalLessons = await prisma.trainingLesson.count({ where: { trackId: lesson.trackId } });
        const completedLessons = await prisma.lessonProgress.count({
          where: { enrollmentId: enrollment.id },
        });
        if (completedLessons === totalLessons && !enrollment.completedAt) {
          await prisma.trainingEnrollment.update({
            where: { id: enrollment.id },
            data: { completedAt: new Date() },
          });
          await awardPoints(userId, lesson.track.pointsAward, 'track_completed', 'TrainingTrack', lesson.trackId);

          // Award the track's badge (if any)
          const trackBadge = await prisma.badge.findFirst({ where: { trackId: lesson.trackId } });
          if (trackBadge) {
            const b = await awardBadgeBySlug(userId, trackBadge.slug);
            if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
          }

          // Issue completion certificate
          await prisma.certificate.create({
            data: {
              userId,
              title: lesson.track.title,
              issuer: 'منصة جامعة الزاوية للتعليم الذكي',
              issuedAt: new Date(),
              hours: Math.max(1, Math.round(lesson.track.estMinutes / 60)),
              status: 'COMPLETED',
              trackId: lesson.trackId,
            },
          });

          // Total-tracks-completed badges
          const completedTracks = await prisma.trainingEnrollment.count({
            where: { userId, completedAt: { not: null } },
          });
          if (completedTracks >= 5) {
            const b = await awardBadgeBySlug(userId, 'badge-zu-pioneer');
            if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
          }
          // 3 in different categories → polymath
          const distinctCats = await prisma.trainingEnrollment.findMany({
            where: { userId, completedAt: { not: null } },
            include: { track: { select: { category: true } } },
          });
          const cats = new Set(distinctCats.map((e) => e.track.category));
          if (cats.size >= 3) {
            const b = await awardBadgeBySlug(userId, 'badge-polymath');
            if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
          }
        }
      }

      const totalPoints = await totalPointsFor(userId);
      const lvl = levelFor(totalPoints);

      res.json({
        data: {
          newlyCompleted,
          pointsAwarded: newlyCompleted ? lesson.pointsAward : 0,
          totalPoints,
          level: lvl,
          newBadges,
        },
      });
    } catch (e) { next(e); }
  },
);

// ─── My summary ──────────────────────────────────────────────────
router.get('/training/me', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const [points, badges, certs, enrollments, completedTracks] = await Promise.all([
      totalPointsFor(userId),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      }),
      prisma.certificate.count({ where: { userId, trackId: { not: null } } }),
      prisma.trainingEnrollment.count({ where: { userId } }),
      prisma.trainingEnrollment.count({ where: { userId, completedAt: { not: null } } }),
    ]);
    const lvl = levelFor(points);
    res.json({
      data: {
        points,
        level: lvl,
        badgeCount: badges.length,
        certificateCount: certs,
        tracksEnrolled: enrollments,
        tracksCompleted: completedTracks,
        recentBadges: badges.slice(0, 6).map((ub) => ({
          slug: ub.badge.slug,
          title: ub.badge.title,
          iconEmoji: ub.badge.iconEmoji,
          rarity: ub.badge.rarity,
          earnedAt: ub.earnedAt,
        })),
      },
    });
  } catch (e) { next(e); }
});

// ─── My badges (full list incl. locked ones) ─────────────────────
router.get('/training/me/badges', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const allBadges = await prisma.badge.findMany({
      orderBy: [{ trackId: { sort: 'asc', nulls: 'first' } }, { rarity: 'asc' }],
    });
    const earned = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    });
    const earnedMap = new Map(earned.map((b) => [b.badgeId, b.earnedAt]));
    res.json({
      data: allBadges.map((b) => ({
        slug: b.slug,
        title: b.title,
        description: b.description,
        iconEmoji: b.iconEmoji,
        themeColor: b.themeColor,
        rarity: b.rarity,
        earnedAt: earnedMap.get(b.id) ?? null,
        isEarned: earnedMap.has(b.id),
      })),
    });
  } catch (e) { next(e); }
});

// ─── My training certificates ────────────────────────────────────
router.get('/training/me/certificates', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const certs = await prisma.certificate.findMany({
      where: { userId, trackId: { not: null } },
      include: { track: { select: { slug: true, iconEmoji: true, themeColor: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    res.json({
      data: certs.map((c) => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issuedAt: c.issuedAt,
        hours: c.hours,
        status: c.status,
        trackSlug: c.track?.slug ?? null,
        iconEmoji: c.track?.iconEmoji ?? null,
        themeColor: c.track?.themeColor ?? null,
      })),
    });
  } catch (e) { next(e); }
});

// ─── Leaderboard ─────────────────────────────────────────────────
router.get('/training/leaderboard', async (req, res, next) => {
  try {
    const top = await prisma.pointsLedger.groupBy({
      by: ['userId'],
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 20,
    });
    if (top.length === 0) {
      res.json({ data: [] });
      return;
    }
    const users = await prisma.user.findMany({
      where: { id: { in: top.map((t) => t.userId) } },
      select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarInitials: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    res.json({
      data: top.map((t, i) => {
        const u = userMap.get(t.userId)!;
        const points = t._sum.points ?? 0;
        return {
          rank: i + 1,
          userId: t.userId,
          name: `${u.firstName} ${u.lastName}`,
          avatarColor: u.avatarColor,
          avatarInitials: u.avatarInitials,
          points,
          level: levelFor(points),
        };
      }),
    });
  } catch (e) { next(e); }
});

export default router;
