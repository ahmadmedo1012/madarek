import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
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
 *  GET  /training/tracks/:slug                 single published track with lessons + my progress
 *  POST /training/tracks/:slug/enroll          enroll the current user (published tracks only)
 *  POST /training/lessons/:lessonId/complete   mark lesson done (idempotent), award points
 *  GET  /training/me                           summary for current user (level, points, badges, certs)
 *  GET  /training/me/badges                    full badge list for current user
 *  GET  /training/me/certificates              certificates earned via training
 *  GET  /training/leaderboard                  top 20 by total points
 *
 * Unpublished tracks are drafts: read, enrollment and lesson completion
 * all 404 (the catalog already lists published tracks only) — draft content
 * must never leak, and must never award points/badges/certificates.
 */

// ─── Pure logic (exported for DB-free unit tests) ─────────────────
const POINTS_PER_LEVEL = 500;

export function levelFor(points: number): { level: number; tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'; toNext: number; pctIntoLevel: number } {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const into = points % POINTS_PER_LEVEL;
  const toNext = POINTS_PER_LEVEL - into;
  const tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' =
    level >= 8 ? 'PLATINUM' : level >= 5 ? 'GOLD' : level >= 3 ? 'SILVER' : 'BRONZE';
  return { level, tier, toNext, pctIntoLevel: Math.round((into / POINTS_PER_LEVEL) * 100) };
}

/**
 * D8 short-answer gate: an answer passes ONLY on an exact match after
 * normalization (trim + case-fold + collapsing separator noise such as
 * commas, Arabic comma, dots, dashes, quotes and repeated spaces).
 * Never a substring `includes` in either direction — that let a
 * one-character answer farm lesson points, track badges, certificates
 * and leaderboard rank.
 */
export function quizAnswerMatches(submitted: string, expected: string): boolean {
  const norm = (s: string) => s.replace(/[\s,،.\-_/'"]+/g, ' ').trim().toLowerCase();
  const normalizedExpected = norm(expected);
  if (!normalizedExpected) return false; // a blank key can never be satisfied
  return norm(submitted) === normalizedExpected;
}

/** Minimal user shape leaderboard rows are built from (matches the route's prisma select). */
export interface LeaderboardUserRow {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor: string | null;
  avatarInitials: string | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  avatarColor: string | null;
  avatarInitials: string | null;
  points: number;
  level: ReturnType<typeof levelFor>;
}

/**
 * Build leaderboard rows from pre-sorted (points-desc) ledger sums.
 * Entries whose user no longer resolves are skipped defensively (the FK
 * should prevent orphans, but a stale row must not crash the route with
 * a TypeError → 500) and ranks stay contiguous after a skip.
 */
export function buildLeaderboardRows(
  entries: ReadonlyArray<{ userId: string; totalPoints: number | null }>,
  users: ReadonlyArray<LeaderboardUserRow>,
): LeaderboardRow[] {
  const userMap = new Map(users.map((u) => [u.id, u]));
  const rows: LeaderboardRow[] = [];
  for (const entry of entries) {
    const u = userMap.get(entry.userId);
    if (!u) continue;
    const points = entry.totalPoints ?? 0;
    rows.push({
      rank: rows.length + 1,
      userId: entry.userId,
      name: `${u.firstName} ${u.lastName}`,
      avatarColor: u.avatarColor,
      avatarInitials: u.avatarInitials,
      points,
      level: levelFor(points),
    });
  }
  return rows;
}

// ─── DB helpers ───────────────────────────────────────────────────
async function totalPointsFor(userId: string): Promise<number> {
  const agg = await prisma.pointsLedger.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

async function awardPoints(tx: Prisma.TransactionClient, userId: string, points: number, reason: string, refType?: string, refId?: string) {
  await tx.pointsLedger.create({
    data: { userId, points, reason, refType: refType ?? null, refId: refId ?? null },
  });
}

async function awardBadgeBySlug(tx: Prisma.TransactionClient, userId: string, slug: string) {
  const badge = await tx.badge.findUnique({ where: { slug } });
  if (!badge) return null;
  const existing = await tx.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return null;
  await tx.userBadge.create({ data: { userId, badgeId: badge.id } });
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
    if (!track || !track.isPublished) {
      // Draft tracks 404 exactly like unknown slugs — unpublished content
      // (full lesson contentMarkdown) must not be readable via a guessed slug.
      throw AppError.notFound('Track not found');
    }

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
    if (!track || !track.isPublished) {
      // Cannot enroll into a draft track — same 404 as an unknown slug.
      throw AppError.notFound('Track not found');
    }
    const enrollment = await prisma.trainingEnrollment.upsert({
      where: { userId_trackId: { userId, trackId: track.id } },
      update: {},
      create: { userId, trackId: track.id },
    });
    res.status(201).json({ data: { id: enrollment.id, trackId: track.id, startedAt: enrollment.startedAt } });
  } catch (e) { next(e); }
});

// ─── Complete a lesson ───────────────────────────────────────────
export const completeLessonSchema = z.object({
  // Optional quiz answer; if the lesson defines one, the server checks it
  // against the stored answer with an exact (case-insensitive,
  // separator-normalized) match — see quizAnswerMatches (D8).
  quizAnswer: z.string().max(500).optional(),
}).strict();

router.post(
  '/training/lessons/:lessonId/complete',
  validate(completeLessonSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const lessonId = req.params.lessonId;
      const body = req.body as z.infer<typeof completeLessonSchema>;
      const lesson = await prisma.trainingLesson.findUnique({
        where: { id: lessonId },
        include: { track: true },
      });
      if (!lesson) throw AppError.notFound('Lesson not found');
      // A lesson of an unpublished track cannot be completed — that path
      // awards points, badges and a completion certificate (audit 11-d P1-7).
      if (!lesson.track.isPublished) throw AppError.notFound('Lesson not found');

      // Validate quiz answer if the lesson defines one
      if (lesson.quizAnswer) {
        const submitted = (body.quizAnswer ?? '').trim();
        if (!submitted) throw AppError.badRequest('يجب الإجابة على السؤال أولاً');
        // Exact match after normalization (D8): a substring — e.g. a single
        // character of the model answer — must never pass, because points,
        // badges, certificates and leaderboard rank all sit behind this gate.
        if (!quizAnswerMatches(submitted, lesson.quizAnswer)) {
          throw AppError.badRequest('الإجابة غير صحيحة، حاول مجدداً');
        }
      }

      // Everything from the enrollment upsert through badges/certificate
      // runs in ONE interactive transaction — a crash mid-flow used to
      // leave half-awarded state (points without progress, etc.).
      // Idempotency is preserved: an existing lessonProgress row is a no-op.
      const newBadges: Array<{ slug: string; title: string; iconEmoji: string }> = [];
      let newlyCompleted = false;

      await prisma.$transaction(async (tx) => {
        // Find or create the enrollment
        const enrollment = await tx.trainingEnrollment.upsert({
          where: { userId_trackId: { userId, trackId: lesson.trackId } },
          update: {},
          create: { userId, trackId: lesson.trackId },
        });

        // Idempotent complete
        const existing = await tx.lessonProgress.findUnique({
          where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
        });
        if (existing) return;
        newlyCompleted = true;

        await tx.lessonProgress.create({
          data: { enrollmentId: enrollment.id, lessonId: lesson.id, pointsAwarded: lesson.pointsAward },
        });
        await awardPoints(tx, userId, lesson.pointsAward, 'lesson_completed', 'TrainingLesson', lesson.id);

        // First-step badge — first ever lesson completion
        const totalCompleted = await tx.lessonProgress.count({
          where: { enrollment: { userId } },
        });
        if (totalCompleted === 1) {
          const b = await awardBadgeBySlug(tx, userId, 'badge-first-step');
          if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
        }

        // Track-completion check
        const totalLessons = await tx.trainingLesson.count({ where: { trackId: lesson.trackId } });
        const completedLessons = await tx.lessonProgress.count({
          where: { enrollmentId: enrollment.id },
        });
        if (completedLessons === totalLessons && !enrollment.completedAt) {
          await tx.trainingEnrollment.update({
            where: { id: enrollment.id },
            data: { completedAt: new Date() },
          });
          await awardPoints(tx, userId, lesson.track.pointsAward, 'track_completed', 'TrainingTrack', lesson.trackId);

          // Award the track's badge (if any)
          const trackBadge = await tx.badge.findFirst({ where: { trackId: lesson.trackId } });
          if (trackBadge) {
            const b = await awardBadgeBySlug(tx, userId, trackBadge.slug);
            if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
          }

          // Issue completion certificate
          await tx.certificate.create({
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
          const completedTracks = await tx.trainingEnrollment.count({
            where: { userId, completedAt: { not: null } },
          });
          if (completedTracks >= 5) {
            const b = await awardBadgeBySlug(tx, userId, 'badge-zu-pioneer');
            if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
          }
          // 3 in different categories → polymath
          const distinctCats = await tx.trainingEnrollment.findMany({
            where: { userId, completedAt: { not: null } },
            include: { track: { select: { category: true } } },
          });
          const cats = new Set(distinctCats.map((e) => e.track.category));
          if (cats.size >= 3) {
            const b = await awardBadgeBySlug(tx, userId, 'badge-polymath');
            if (b) newBadges.push({ slug: b.slug, title: b.title, iconEmoji: b.iconEmoji });
          }
        }
      });

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
    res.json({
      data: buildLeaderboardRows(
        top.map((t) => ({ userId: t.userId, totalPoints: t._sum.points })),
        users,
      ),
    });
  } catch (e) { next(e); }
});

export default router;
