import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import {
  detectTranscriptFormat,
  srtToVtt,
  transcriptHasCues,
  transcriptKeyFor,
  transcriptServingPathFor,
} from '../../modules/ai/transcript.js';
import {
  STT_MAX_UPLOAD_BYTES,
  buildTranscriptionRequest,
  buildVttFromSegments,
  isSttConfigured,
  mimeForFilename,
  parseSttResponse,
  sttConfigFrom,
} from '../../modules/ai/stt.js';
import { env } from '../../env.js';
import { assertOwnsOffering } from '../../lib/permissions.js';
import { assertOfferingInCallerInstitution } from '../../lib/profile-scoping.js';

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

/**
 * Lecture videos may be an external https URL, a file served by our own
 * files API, or a same-origin static asset shipped with the frontend build
 * (root-relative path, e.g. "/lectures/se301-01.mp4" — the self-hosted
 * sample lectures). Protocol-relative "//evil.com" stays rejected: only a
 * root-relative path with a safe first segment is same-origin.
 */
// r142: single source of truth moved to lib/sanctioned-url.ts — these
// re-exports keep the historical names (tests + sibling routes import
// them from here).
export {
  isSanctionedMediaUrl,
  SANCTIONED_FILES_API_PATTERN as CURRICULUM_MEDIA_FILES_API_PATTERN,
  SAME_ORIGIN_STATIC_PATTERN as CURRICULUM_MEDIA_SAME_ORIGIN_PATTERN,
} from '../../lib/sanctioned-url.js';
import { isSanctionedMediaUrl } from '../../lib/sanctioned-url.js';
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
      .refine((s) => isSanctionedMediaUrl(s), {
        message: 'videoUrl must start with https:// or / (same-origin asset), or be /api/v1/files/papers/',
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
// `ordinal` (5-B6 hand-off #2): lets the FE authoring UI reorder chapters
// via neighbor-swap — same convention the lecture reorder uses.
export const updateChapterBodySchema = chapterFields
  .partial()
  .extend({
    conceptId: z.string().min(1).max(100).nullable().optional(),
    ordinal: z.number().int().min(0).max(500).optional(),
  });

// ─── Atomic reorder (r152b A5 P2) ─────────────────────────────────
// The old reorder contract was "client sends two PATCHes that swap the
// neighbors' ordinals" — a partial failure leaves two rows sharing one
// ordinal and (with no unique constraint and no read tiebreaker) the
// student-visible order silently shuffles. The FE now sends the FULL
// ordered id list once; the server rewrites every ordinal 0..n-1 inside
// a single transaction, which also heals any pre-existing duplicate
// ordinals on the offering.
export const reorderBodySchema = z
  .object({
    ids: z.array(z.string().min(1).max(64)).min(1).max(500),
  })
  .strict()
  .refine((b) => new Set(b.ids).size === b.ids.length, {
    message: 'ids must not contain duplicates',
  });

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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned
      // (write mode — 403 for a foreign institution's curriculum).
      await assertOfferingInCallerInstitution(offeringId, req.user!, 'write');

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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(stub.offeringId, req.user!, 'write');

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

// Atomic full-list lecture reorder (r152b A5 P2) — replaces the FE's
// two-PATCH neighbor swap. See reorderBodySchema for the contract.
router.post(
  '/offerings/:offeringId/lectures/reorder',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(reorderBodySchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.offeringId!;
      const { ids } = req.body as z.infer<typeof reorderBodySchema>;

      await assertOwnsOffering(offeringId, req.user!.id, req.user!.role);
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned
      // (write mode — 403 for a foreign institution's curriculum).
      await assertOfferingInCallerInstitution(offeringId, req.user!, 'write');

      const written = await prisma.$transaction(async (tx) => {
        const rows = await tx.lecture.findMany({
          where: { offeringId },
          select: { id: true },
        });
        const known = new Set(rows.map((r) => r.id));
        if (rows.length !== ids.length || ids.some((id) => !known.has(id))) {
          throw AppError.badRequest(
            'قائمة الترتيب يجب أن تطابق محاضرات المقرر الحالية بالكامل',
          );
        }
        await Promise.all(
          ids.map((id, ordinal) =>
            tx.lecture.update({ where: { id }, data: { ordinal } }),
          ),
        );
        return ids.length;
      });

      logger.info(
        { offeringId, count: written, userId: req.user!.id },
        'curriculum: lectures reordered',
      );
      res.json({ data: { ok: true, count: written } });
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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(stub.offeringId, req.user!, 'write');

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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(lecture.offeringId, req.user!, 'write');

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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(chapter.lecture.offeringId, req.user!, 'write');

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
          // 5-B6 hand-off #2 — chapter reorder (neighbor-swap from the FE).
          ordinal: body.ordinal,
        },
      });

      logger.info({ chapterId, userId: req.user!.id }, 'curriculum: chapter updated');
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// Atomic full-list chapter reorder (r152b A5 P2) — same contract as the
// lecture reorder above; heals duplicate ordinals on the lecture.
router.post(
  '/lectures/:lectureId/chapters/reorder',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(reorderBodySchema),
  async (req, res, next) => {
    try {
      const lectureId = req.params.lectureId!;
      const { ids } = req.body as z.infer<typeof reorderBodySchema>;

      const lecture = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: { offeringId: true },
      });
      if (!lecture) throw AppError.notFound('المحاضرة غير موجودة');
      await assertOwnsOffering(lecture.offeringId, req.user!.id, req.user!.role);
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(lecture.offeringId, req.user!, 'write');

      const written = await prisma.$transaction(async (tx) => {
        const rows = await tx.lectureChapter.findMany({
          where: { lectureId },
          select: { id: true },
        });
        const known = new Set(rows.map((r) => r.id));
        if (rows.length !== ids.length || ids.some((id) => !known.has(id))) {
          throw AppError.badRequest(
            'قائمة الترتيب يجب أن تطابق فصول المحاضرة الحالية بالكامل',
          );
        }
        await Promise.all(
          ids.map((id, ordinal) =>
            tx.lectureChapter.update({ where: { id }, data: { ordinal } }),
          ),
        );
        return ids.length;
      });

      logger.info(
        { lectureId, count: written, userId: req.user!.id },
        'curriculum: chapters reordered',
      );
      res.json({ data: { ok: true, count: written } });
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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(chapter.lecture.offeringId, req.user!, 'write');

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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(lecture.offeringId, req.user!, 'write');

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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(cp.lecture.offeringId, req.user!, 'write');

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
      // r179 (phase-5): the ADMIN ownership bypass is institution-pinned.
      await assertOfferingInCallerInstitution(cp.lecture.offeringId, req.user!, 'write');

      await prisma.lectureCheckpoint.delete({ where: { id: checkpointId } });

      logger.info({ checkpointId, userId: req.user!.id }, 'curriculum: checkpoint deleted');
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

/* r323 B2.3 — the STT GENERATION path. The teacher asks the platform
 * to transcribe the lecture's audio/video through an OpenAI-compatible
 * /audio/transcriptions endpoint (env: STT_API_URL / STT_API_KEY /
 * STT_MODEL — Groq Whisper, OpenAI, local Whisper servers). The job
 * walks Lecture.transcriptStatus QUEUED → RUNNING → DONE|FAILED and
 * lands the VTT in the same storage seat the upload path uses.
 * Fire-and-forget async: the route returns 202 immediately and the
 * status endpoint (below) is the truth. */

const sttDebounceMs = 1500; // the status poll's friendliness floor (UI hint only)

router.post(
  '/lectures/:id/transcript/generate',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const lectureId = req.params.id!;
      const lecture = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: { id: true, offeringId: true, videoUrl: true, transcriptStatus: true },
      });
      if (!lecture) throw AppError.notFound('المحاضرة غير موجودة');
      await assertOwnsOffering(lecture.offeringId, req.user!.id, req.user!.role);

      if (!isSttConfigured(env)) {
        throw AppError.conflict(
          'تحويل الكلام إلى نص غير مهيأ على المنصة — أضف STT_API_URL و STT_API_KEY في متغيرات البيئة، أو ارفع ملف نصوص SRT/VTT يدويًا.',
        );
      }
      if (lecture.transcriptStatus === 'QUEUED' || lecture.transcriptStatus === 'RUNNING') {
        throw AppError.conflict('هناك عملية تحويل جارية لهذه المحاضرة بالفعل.');
      }

      await prisma.lecture.update({
        where: { id: lectureId },
        data: { transcriptStatus: 'QUEUED', transcriptError: null },
      });

      // fire-and-forget — every failure lands in transcriptError, never
      // in the request path (the 202 answers before the download even
      // starts; the status route is the single source of truth).
      void (async () => {
        try {
          await prisma.lecture.update({ where: { id: lectureId }, data: { transcriptStatus: 'RUNNING' } });
          await runSttJob(lectureId, lecture.videoUrl);
        } catch (err) {
          logger.error({ lectureId, err }, 'curriculum: stt job failed');
          await prisma.lecture.update({
            where: { id: lectureId },
            data: {
              transcriptStatus: 'FAILED',
              transcriptError: err instanceof Error ? err.message : 'فشل غير معروف',
            },
          }).catch(() => null);
        }
      })();

      res.status(202).json({ data: { status: 'QUEUED', pollAfterMs: sttDebounceMs } });
    } catch (e) { next(e); }
  },
);

router.get(
  '/lectures/:id/transcript/status',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const lecture = await prisma.lecture.findUnique({
        where: { id: req.params.id! },
        select: { transcriptStatus: true, transcriptError: true, transcriptUrl: true },
      });
      if (!lecture) throw AppError.notFound('المحاضرة غير موجودة');
      res.json({ data: lecture });
    } catch (e) { next(e); }
  },
);

/** The worker: storage get → size gate → multipart POST → normalise →
 * VTT → storage put + DONE. Exported for the pure tests. */
export async function runSttJob(lectureId: string, videoUrl: string): Promise<void> {
  const cfg = sttConfigFrom(env);
  if (!cfg) throw new Error('stt: not configured');
  const { getStorage } = await import('../../lib/storage.js');
  const storage = getStorage();

  // the lecture serves under /files/lectures/… — resolve the storage key
  // from the serving path (the same reversal the range-stream route uses).
  const key = videoUrl.replace(/^.*\/files\/lectures\//, '').split('?')[0]!;
  const bytes = await storage.get(key);
  if (!bytes) throw new Error('تعذّر قراءة ملف المحاضرة من التخزين.');
  if (bytes.length > STT_MAX_UPLOAD_BYTES) {
    throw new Error(
      `حجم ملف المحاضرة (${Math.round(bytes.length / (1024 * 1024))} ميغابايت) يتجاوز حد مزوّد التحويل (25 ميغابايت) — ارفع نسخة صوتية مقتضبة ثم أعد المحاولة.`,
    );
  }
  const filename = key.split('/').pop() || 'lecture.mp4';
  const { url, body, headers } = buildTranscriptionRequest(cfg, {
    bytes, filename, mime: mimeForFilename(filename),
  });
  const resp = await fetch(url, { method: 'POST', headers, body });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`رفض مزوّد التحويل الطلب (${resp.status}): ${text.slice(0, 200)}`);
  }
  const json: unknown = await resp.json();
  // the provider's verbose_json carries durationSec; pass it for the
  // bare-text fallback's cue end.
  const durationSec = (json as { duration?: number }).duration;
  const segments = parseSttResponse(json, durationSec);
  if (segments.length === 0) throw new Error('لم يُعثر على أي كلام في الملف.');
  const vtt = buildVttFromSegments(segments);
  await storage.put(transcriptKeyFor(lectureId), Buffer.from(vtt, 'utf8'));
  await prisma.lecture.update({
    where: { id: lectureId },
    data: { transcriptStatus: 'DONE', transcriptError: null, transcriptUrl: transcriptServingPathFor(lectureId) },
  });
  logger.info({ lectureId, cues: segments.length }, 'curriculum: stt done');
}

export default router;

/* r323 B2.3 — the lecture transcript (SRT/VTT) ingest. The owning
 * teacher pastes the captions text; the platform converts SRT→VTT,
 * validates it parses to ≥1 cue, stores it in the lectures namespace,
 * and stamps Lecture.transcriptUrl (the player's <track> and the
 * knowledge indexer read the same bytes). Idempotent: a re-upload
 * REPLACES the file. Bounded at 2 MiB — a 3-hour lecture's captions
 * never approach it. */
const transcriptBodySchema = z.object({
  content: z.string().min(1).max(2 * 1024 * 1024),
});

router.put(
  '/lectures/:id/transcript',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(transcriptBodySchema),
  async (req, res, next) => {
    try {
      const lectureId = req.params.id!;
      const { content } = req.body as z.infer<typeof transcriptBodySchema>;

      const lecture = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: { id: true, offeringId: true },
      });
      if (!lecture) throw AppError.notFound('المحاضرة غير موجودة');
      await assertOwnsOffering(lecture.offeringId, req.user!.id, req.user!.role);
      await assertOfferingInCallerInstitution(lecture.offeringId, req.user!, 'write');

      const format = detectTranscriptFormat(content);
      if (format === null) {
        throw AppError.badRequest('الملف ليس بصيغة SRT أو VTT صالحة');
      }
      const vtt = srtToVtt(content);
      if (!transcriptHasCues(vtt)) {
        throw AppError.badRequest('لم يُعثر على أي توقيت صالح في الملف');
      }

      const { getStorage } = await import('../../lib/storage.js');
      await getStorage().put(transcriptKeyFor(lectureId), Buffer.from(vtt, 'utf8'));
      const updated = await prisma.lecture.update({
        where: { id: lectureId },
        data: { transcriptUrl: transcriptServingPathFor(lectureId) },
        select: { id: true, transcriptUrl: true },
      });

      logger.info({ lectureId, userId: req.user!.id, format }, 'curriculum: transcript stored');
      res.status(201).json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);
