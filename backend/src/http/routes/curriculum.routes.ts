import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertOwnsOffering } from '../../lib/permissions.js';

/**
 * Curriculum authoring — lectures, chapters, checkpoints.
 *
 * Contract:
 *   POST   /api/v1/offerings/:offeringId/lectures        (TEACHER/ADMIN/OWNER)
 *   PATCH  /api/v1/lectures/:id                          (TEACHER/ADMIN/OWNER)
 *   DELETE /api/v1/lectures/:id                          (TEACHER/ADMIN/OWNER)
 *   POST   /api/v1/lectures/:lectureId/chapters          (TEACHER/ADMIN/OWNER)
 *   PATCH  /api/v1/chapters/:id                          (TEACHER/ADMIN/OWNER)
 *   DELETE /api/v1/chapters/:id                          (TEACHER/ADMIN/OWNER)
 *   POST   /api/v1/lectures/:lectureId/checkpoints       (TEACHER/ADMIN/OWNER)
 *   PATCH  /api/v1/checkpoints/:id                       (TEACHER/ADMIN/OWNER)
 *   DELETE /api/v1/checkpoints/:id                       (TEACHER/ADMIN/OWNER)
 *
 * Every route is guarded by `requireRole(TEACHER, ADMIN, OWNER)` plus
 * `assertOwnsOffering` on the parent offering (ADMIN via
 * CURRICULUM_EDIT_ANY, OWNER bypass, TEACHER via CURRICULUM_EDIT_OWN on
 * their own offering). Reads stay in the existing endpoints
 * (learning.routes.ts) — correctIndex is never exposed on a read.
 *
 * Model invariants honoured (prisma/schema.prisma):
 *  - Lecture has no isPublished/publishedAt flag → no publish semantics.
 *  - LectureChapter.endSec is required (not optional) in the model.
 *  - LectureCheckpoint uses `question` (not `prompt`) and requires
 *    `triggerSec`; there is no chapterId column on checkpoints.
 *  - FK cascade rules: LectureChapter/LectureCheckpoint cascade with
 *    their lecture; WatchEvent→Lecture is the default RESTRICT — lecture
 *    deletion is refused (409) when students have watch history.
 */

const router = Router();
router.use(authMiddleware);

// ─── Pure logic (exported for DB-free unit tests) ─────────────────

/** Lecture videos may be an external https URL or a file served by our own files API. */
export const CURRICULUM_MEDIA_URL_PATTERN = /^https:\/\/|^\/api\/v1\/files\/papers\//;

/** Upper bound for durationSec / triggerSec: one full day. */
export const MAX_MEDIA_SEC = 86_400;

/**
 * Auto-ordinal for "append to the end" writes: max+1, or 1 for an empty
 * set (matches the 1-based ordinal convention used by the seed).
 */
export function nextOrdinal(maxOrdinal: number | null): number {
  return (maxOrdinal ?? 0) + 1;
}

/**
 * A timestamp is within a lecture's duration. durationSec <= 0 means
 * "unknown/unset" (the model default) — no upper bound is enforced then.
 */
export function withinLectureDuration(sec: number, durationSec: number): boolean {
  return durationSec <= 0 || sec <= durationSec;
}

/**
 * Merged chapter time window after a PATCH: the effective (existing ⊕
 * patch) window must still satisfy endSec > startSec.
 */
export function chapterWindowValid(
  existing: { startSec: number; endSec: number },
  patch: { startSec?: number; endSec?: number },
): boolean {
  const startSec = patch.startSec ?? existing.startSec;
  const endSec = patch.endSec ?? existing.endSec;
  return endSec > startSec;
}

/**
 * Effective correctIndex after a checkpoint PATCH: the patched index if
 * provided, otherwise the existing one — re-validated against the
 * EFFECTIVE option list (patched options when present). Returns null
 * when the effective index points outside the effective options; the
 * handler turns that into a 400.
 */
export function resolveCorrectIndex(
  existing: { options: ReadonlyArray<string>; correctIndex: number },
  patch: { options?: ReadonlyArray<string>; correctIndex?: number },
): number | null {
  const options = patch.options ?? existing.options;
  const correctIndex = patch.correctIndex ?? existing.correctIndex;
  return Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length
    ? correctIndex
    : null;
}

// ─── Schemas ──────────────────────────────────────────────────────

const lectureFields = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    videoUrl: z
      .string()
      .max(500)
      .refine((s) => CURRICULUM_MEDIA_URL_PATTERN.test(s), {
        message: 'videoUrl must start with https:// or /api/v1/files/papers/',
      }),
    durationSec: z.number().int().min(1).max(MAX_MEDIA_SEC).optional(),
    ordinal: z.number().int().min(0).max(500).optional(),
  })
  .strict();

export const createLectureBodySchema = lectureFields;
export const updateLectureBodySchema = lectureFields.partial();

const chapterFields = z
  .object({
    title: z.string().trim().min(1).max(200),
    // Model invariant: endSec is required (LectureChapter.endSec Int).
    startSec: z.number().int().min(0).max(MAX_MEDIA_SEC),
    endSec: z.number().int().min(0).max(MAX_MEDIA_SEC),
    conceptId: z.string().min(1).max(100).optional(),
  })
  .strict();

export const createChapterBodySchema = chapterFields.refine(
  (b) => b.endSec > b.startSec,
  { message: 'endSec must be greater than startSec' },
);
// PATCH semantics: `conceptId: null` explicitly CLEARS the concept tag
// (previously there was no way to un-tag a chapter — omitted meant
// unchanged and null was a 400); omitting the field still means
// unchanged. Create keeps the non-nullable shape.
export const updateChapterBodySchema = chapterFields
  .partial()
  .extend({ conceptId: z.string().min(1).max(100).nullable().optional() });

const checkpointFields = z
  .object({
    // Model field is `question` (the spec's "prompt"); triggerSec is required.
    triggerSec: z.number().int().min(0).max(MAX_MEDIA_SEC),
    question: z.string().trim().min(1).max(1000),
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
    correctIndex: z.number().int().min(0),
    conceptId: z.string().min(1).max(100).optional(),
    explanation: z.string().trim().max(2000).optional(),
  })
  .strict();

export const createCheckpointBodySchema = checkpointFields.refine(
  (b) => b.correctIndex < b.options.length,
  { message: 'correctIndex must point at one of the options' },
);
// PATCH semantics: `conceptId: null` explicitly CLEARS the concept tag;
// omitting the field still means unchanged (same as chapters — create
// keeps the non-nullable shape).
export const updateCheckpointBodySchema = checkpointFields
  .partial()
  .extend({ conceptId: z.string().min(1).max(100).nullable().optional() });

// ─── Helpers ──────────────────────────────────────────────────────

/** Prisma Json → string[] (corrupt shapes collapse to []). */
function jsonToStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((o) => typeof o === 'string') ? (value as string[]) : [];
}

/**
 * conceptId (when supplied) must exist AND belong to the offering's
 * course — otherwise answering the checkpoint would update mastery for
 * an unrelated course's concept.
 */
async function assertConceptForCourse(conceptId: string, courseId: string): Promise<void> {
  const concept = await prisma.knowledgeConcept.findUnique({
    where: { id: conceptId },
    select: { courseId: true },
  });
  if (!concept) throw AppError.notFound('المفهوم المعرفي غير موجود');
  if (concept.courseId !== courseId) {
    throw AppError.badRequest('المفهوم المختار لا ينتمي إلى مقرر هذه المحاضرة');
  }
}

// ─── Lectures ─────────────────────────────────────────────────────

router.post(
  '/offerings/:offeringId/lectures',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(createLectureBodySchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.offeringId!;
      const body = req.body as z.infer<typeof createLectureBodySchema>;

      await assertOwnsOffering(offeringId, req.user!.id, req.user!.role);

      // Aggregate + create inside one transaction so concurrent creates
      // read the same ordinal max (ties are still possible but harmless —
      // the index is non-unique and ordering just needs stability).
      const lecture = await prisma.$transaction(async (tx) => {
        const agg = await tx.lecture.aggregate({
          where: { offeringId },
          _max: { ordinal: true },
        });
        return tx.lecture.create({
          data: {
            offeringId,
            title: body.title,
            description: body.description ?? null,
            videoUrl: body.videoUrl,
            durationSec: body.durationSec ?? 0,
            ordinal: body.ordinal ?? nextOrdinal(agg._max.ordinal),
          },
        });
      });

      logger.info({ lectureId: lecture.id, offeringId, userId: req.user!.id }, 'curriculum: lecture created');
      res.status(201).json({ data: lecture });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/lectures/:id',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(updateLectureBodySchema),
  async (req, res, next) => {
    try {
      const lectureId = req.params.id!;
      const body = req.body as z.infer<typeof updateLectureBodySchema>;

      const stub = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: { offeringId: true },
      });
      if (!stub) throw AppError.notFound('المحاضرة غير موجودة');
      await assertOwnsOffering(stub.offeringId, req.user!.id, req.user!.role);

      // The Lecture model carries no isPublished/publishedAt flag, so a
      // partial field update is all this endpoint does.
      const updated = await prisma.lecture.update({
        where: { id: lectureId },
        data: {
          title: body.title,
          description: body.description,
          videoUrl: body.videoUrl,
          durationSec: body.durationSec,
          ordinal: body.ordinal,
        },
      });

      logger.info({ lectureId, userId: req.user!.id }, 'curriculum: lecture updated');
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/lectures/:id',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const lectureId = req.params.id!;

      const stub = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: { offeringId: true },
      });
      if (!stub) throw AppError.notFound('المحاضرة غير موجودة');
      await assertOwnsOffering(stub.offeringId, req.user!.id, req.user!.role);

      // FK audit (schema.prisma @relation onDelete):
      //  - LectureChapter.lecture    → Cascade (auto-deleted by the DB)
      //  - LectureCheckpoint.lecture → Cascade (auto-deleted by the DB)
      //  - WatchEvent.lecture        → default RESTRICT — student watch
      //    history blocks deletion. We do NOT fight the FK or silently
      //    destroy learning history: surface a 409 instead.
      await prisma.$transaction(async (tx) => {
        const watchCount = await tx.watchEvent.count({ where: { lectureId } });
        if (watchCount > 0) {
          throw AppError.conflict('لا يمكن حذف المحاضرة: لديها سجل مشاهدات لطلاب مسجّلين');
        }
        await tx.lecture.delete({ where: { id: lectureId } });
      });

      logger.info({ lectureId, userId: req.user!.id }, 'curriculum: lecture deleted');
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Chapters ─────────────────────────────────────────────────────

router.post(
  '/lectures/:lectureId/chapters',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(createChapterBodySchema),
  async (req, res, next) => {
    try {
      const lectureId = req.params.lectureId!;
      const body = req.body as z.infer<typeof createChapterBodySchema>;

      const lecture = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: {
          offeringId: true,
          durationSec: true,
          offering: { select: { courseId: true } },
        },
      });
      if (!lecture) throw AppError.notFound('المحاضرة غير موجودة');
      await assertOwnsOffering(lecture.offeringId, req.user!.id, req.user!.role);

      if (
        !withinLectureDuration(body.startSec, lecture.durationSec) ||
        !withinLectureDuration(body.endSec, lecture.durationSec)
      ) {
        throw AppError.badRequest('حدود الفصل خارج مدة المحاضرة');
      }
      if (body.conceptId) await assertConceptForCourse(body.conceptId, lecture.offering.courseId);

      const chapter = await prisma.$transaction(async (tx) => {
        const agg = await tx.lectureChapter.aggregate({
          where: { lectureId },
          _max: { ordinal: true },
        });
        return tx.lectureChapter.create({
          data: {
            lectureId,
            title: body.title,
            startSec: body.startSec,
            endSec: body.endSec,
            conceptId: body.conceptId ?? null,
            ordinal: nextOrdinal(agg._max.ordinal),
          },
        });
      });

      logger.info({ chapterId: chapter.id, lectureId, userId: req.user!.id }, 'curriculum: chapter created');
      res.status(201).json({ data: chapter });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/chapters/:id',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(updateChapterBodySchema),
  async (req, res, next) => {
    try {
      const chapterId = req.params.id!;
      const body = req.body as z.infer<typeof updateChapterBodySchema>;

      const chapter = await prisma.lectureChapter.findUnique({
        where: { id: chapterId },
        include: {
          lecture: {
            select: { offeringId: true, durationSec: true, offering: { select: { courseId: true } } },
          },
        },
      });
      if (!chapter) throw AppError.notFound('الفصل غير موجود');
      await assertOwnsOffering(chapter.lecture.offeringId, req.user!.id, req.user!.role);

      // Merged (existing ⊕ patch) window must stay coherent.
      if (!chapterWindowValid(chapter, body)) {
        throw AppError.badRequest('يجب أن تأتي نهاية الفصل بعد بدايته');
      }
      const startSec = body.startSec ?? chapter.startSec;
      const endSec = body.endSec ?? chapter.endSec;
      if (
        !withinLectureDuration(startSec, chapter.lecture.durationSec) ||
        !withinLectureDuration(endSec, chapter.lecture.durationSec)
      ) {
        throw AppError.badRequest('حدود الفصل خارج مدة المحاضرة');
      }
      if (body.conceptId) await assertConceptForCourse(body.conceptId, chapter.lecture.offering.courseId);

      // conceptId: null clears the tag; undefined leaves it untouched
      // (updateChapterBodySchema PATCH semantics).
      const updated = await prisma.lectureChapter.update({
        where: { id: chapterId },
        data: {
          title: body.title,
          startSec: body.startSec,
          endSec: body.endSec,
          conceptId: body.conceptId,
        },
      });

      logger.info({ chapterId, userId: req.user!.id }, 'curriculum: chapter updated');
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/chapters/:id',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const chapterId = req.params.id!;

      // No table references a chapter (concept links are SetNull-side),
      // so a plain delete is safe after the ownership guard.
      const chapter = await prisma.lectureChapter.findUnique({
        where: { id: chapterId },
        select: { lecture: { select: { offeringId: true } } },
      });
      if (!chapter) throw AppError.notFound('الفصل غير موجود');
      await assertOwnsOffering(chapter.lecture.offeringId, req.user!.id, req.user!.role);

      await prisma.lectureChapter.delete({ where: { id: chapterId } });

      logger.info({ chapterId, userId: req.user!.id }, 'curriculum: chapter deleted');
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Checkpoints ──────────────────────────────────────────────────

router.post(
  '/lectures/:lectureId/checkpoints',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(createCheckpointBodySchema),
  async (req, res, next) => {
    try {
      const lectureId = req.params.lectureId!;
      const body = req.body as z.infer<typeof createCheckpointBodySchema>;

      const lecture = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: {
          offeringId: true,
          durationSec: true,
          offering: { select: { courseId: true } },
        },
      });
      if (!lecture) throw AppError.notFound('المحاضرة غير موجودة');
      await assertOwnsOffering(lecture.offeringId, req.user!.id, req.user!.role);

      if (!withinLectureDuration(body.triggerSec, lecture.durationSec)) {
        throw AppError.badRequest('موضع السؤال خارج مدة المحاضرة');
      }
      if (body.conceptId) await assertConceptForCourse(body.conceptId, lecture.offering.courseId);

      const checkpoint = await prisma.lectureCheckpoint.create({
        data: {
          lectureId,
          conceptId: body.conceptId ?? null,
          triggerSec: body.triggerSec,
          question: body.question,
          options: body.options,
          correctIndex: body.correctIndex,
          explanation: body.explanation ?? null,
        },
      });

      logger.info({ checkpointId: checkpoint.id, lectureId, userId: req.user!.id }, 'curriculum: checkpoint created');
      res.status(201).json({ data: checkpoint });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/checkpoints/:id',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(updateCheckpointBodySchema),
  async (req, res, next) => {
    try {
      const checkpointId = req.params.id!;
      const body = req.body as z.infer<typeof updateCheckpointBodySchema>;

      const cp = await prisma.lectureCheckpoint.findUnique({
        where: { id: checkpointId },
        include: {
          lecture: {
            select: { offeringId: true, durationSec: true, offering: { select: { courseId: true } } },
          },
        },
      });
      if (!cp) throw AppError.notFound('السؤال التفاعلي غير موجود');
      await assertOwnsOffering(cp.lecture.offeringId, req.user!.id, req.user!.role);

      if (body.triggerSec !== undefined && !withinLectureDuration(body.triggerSec, cp.lecture.durationSec)) {
        throw AppError.badRequest('موضع السؤال خارج مدة المحاضرة');
      }
      if (body.conceptId) await assertConceptForCourse(body.conceptId, cp.lecture.offering.courseId);

      // When options and/or correctIndex change, the EFFECTIVE index must
      // still point inside the EFFECTIVE option list.
      let correctIndex: number | undefined;
      if (body.correctIndex !== undefined || body.options !== undefined) {
        const resolved = resolveCorrectIndex(
          { options: jsonToStringArray(cp.options), correctIndex: cp.correctIndex },
          body,
        );
        if (resolved === null) {
          throw AppError.badRequest('الإجابة الصحيحة لم تعد ضمن الخيارات الجديدة — أعد تحديدها');
        }
        correctIndex = resolved;
      }

      // conceptId: null clears the tag; undefined leaves it untouched
      // (updateCheckpointBodySchema PATCH semantics).
      const updated = await prisma.lectureCheckpoint.update({
        where: { id: checkpointId },
        data: {
          conceptId: body.conceptId,
          triggerSec: body.triggerSec,
          question: body.question,
          options: body.options,
          correctIndex,
          explanation: body.explanation,
        },
      });

      logger.info({ checkpointId, userId: req.user!.id }, 'curriculum: checkpoint updated');
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/checkpoints/:id',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const checkpointId = req.params.id!;

      // No table references a checkpoint (answers only bump StudentMastery
      // keyed by concept), so a plain delete is safe after the guard.
      const cp = await prisma.lectureCheckpoint.findUnique({
        where: { id: checkpointId },
        select: { lecture: { select: { offeringId: true } } },
      });
      if (!cp) throw AppError.notFound('السؤال التفاعلي غير موجود');
      await assertOwnsOffering(cp.lecture.offeringId, req.user!.id, req.user!.role);

      await prisma.lectureCheckpoint.delete({ where: { id: checkpointId } });

      logger.info({ checkpointId, userId: req.user!.id }, 'curriculum: checkpoint deleted');
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
