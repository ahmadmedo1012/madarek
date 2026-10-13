import path from 'node:path';
import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';
import {
  buildStorageKey,
  generateStorageId,
  getStorage,
  paperFilenameToFileUrl,
} from '../../lib/storage.js';

const router = Router();

router.use(authMiddleware);

// ─── Pure guard layer (tests/modules/files-guard.test.ts) ──────────

/**
 * Traversal shape gate: `..` (relative escape) plus `/` and `\\`
 * (absolute or nested paths). Deliberately over-broad — a benign
 * `my..notes.pdf` is rejected too; for a file-serving endpoint the
 * safe side is the right side. NOTE on encoding: this gate sees the
 * DECODED param — express decodes route params before the handler
 * runs, so an encoded `%2e%2e` attack arrives here as a literal `..`
 * and is caught. The function never decodes anything itself
 * (double-decoding would be the bug).
 */
export function containsTraversalPatterns(filename: string): boolean {
  return filename.includes('..') || filename.includes('/') || filename.includes('\\');
}

/** The endpoint serves papers only — extension gate, case-insensitive. */
export function isPdfFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

/** Aggregate filename gate: no traversal shape AND a .pdf extension. */
export function isSafePaperFilename(filename: string): boolean {
  return !containsTraversalPatterns(filename) && isPdfFilename(filename);
}

/**
 * Role gate for the DB access check: oversight roles may fetch any
 * paper without a matching paper row. QUALITY mirrors the
 * paper-annotation route's oversight model (audit 11-b P2-5): a role
 * that can read annotations on any paper can also fetch the artifact
 * it audits. The same trio gates material serving — oversight is
 * role-shaped, not namespace-shaped.
 */
export function isPaperOversightRole(role: Role): boolean {
  return role === Role.ADMIN || role === Role.OWNER || role === Role.QUALITY;
}

/**
 * Directory pin: the resolved file path must sit DIRECTLY inside
 * `<storageRoot>/papers`. Comparing against `expectedDir + path.sep`
 * (not a bare `startsWith(expectedDir)`) is what rejects sibling
 * directories like `storage/papers-evil/` — the classic prefix-check
 * bug. `resolved` must be a normalized absolute path: this function
 * does not normalize and judges the literal string, so an un-normalized
 * `..` segment fails conservatively.
 *
 * Since the storage abstraction landed, the live serving path no longer
 * builds local paths here — the pin is enforced one layer down (LocalDriver
 * resolves `<root>/<namespace>/<filename>` and rejects anything outside
 * `root + path.sep`; storageKeyIsValid rejects traversal keys first).
 * The function remains the pure, test-pinned statement of those
 * semantics (tests/modules/files-guard.test.ts).
 */
export function isWithinPapersDir(resolved: string, storageRoot: string): boolean {
  const expectedDir = path.resolve(storageRoot, 'papers');
  return resolved.startsWith(expectedDir + path.sep);
}

// ─── Upload guard layer (tests/modules/upload-guard.test.ts) ──────

/** Hard ceiling for one uploaded PDF — matches the express.raw limit. */
export const MAX_UPLOAD_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Magic-byte gate: every PDF starts with the literal `%PDF-` header.
 * Content-Type alone is client-controlled and happily lies; the first
 * five bytes cannot. latin1 so the byte comparison is exact.
 */
export function isPdfMagicBytes(body: Buffer): boolean {
  return body.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** Size gate: non-empty and within the 20 MB cap (0 → rejected as 413). */
export function isUploadSizeOk(length: number): boolean {
  return Number.isInteger(length) && length > 0 && length <= MAX_UPLOAD_PDF_BYTES;
}

/**
 * Single-range parser for the serving routes.
 *  - `null` → no Range header / malformed / multi-range: serve the full
 *    body as 200 (single-range support only, honestly).
 *  - `'unsatisfiable'` → a well-formed range beyond the file: 416.
 *  - `{ start, end }` → inclusive window clamped to size-1.
 * Suffix form `bytes=-N` means "last N bytes"; `bytes=-0` is unsatisfiable.
 */
export function parseRangeHeader(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | 'unsatisfiable' {
  if (typeof header !== 'string') return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (match === null) return null;
  const [, startRaw = '', endRaw = ''] = match;
  if (startRaw === '' && endRaw === '') return null; // 'bytes=-' is malformed
  if (startRaw === '') {
    const suffix = Number(endRaw);
    if (suffix <= 0) return 'unsatisfiable';
    const start = Math.max(0, size - suffix);
    const end = size - 1;
    if (end < start) return null; // only reachable for a zero-length file
    return { start, end };
  }
  const start = Number(startRaw);
  if (start < 0 || start >= size) return 'unsatisfiable';
  const end = endRaw === '' ? size - 1 : Math.min(Number(endRaw), size - 1);
  if (end < start) return null; // malformed ordering — ignore, serve full
  return { start, end };
}

// ─── Serving through the storage abstraction ──────────────────────

/**
 * Serve one PDF (papers or materials namespace) from the storage driver.
 * stat → 404 when absent; single-range requests get 206 + Content-Range;
 * everything else is a full 200. A driver failure (e.g. S3 transport)
 * throws and maps to 500 through the error handler — never a fake 404.
 */
async function servePdfFromStorage(
  req: Request,
  res: Response,
  key: string,
): Promise<void> {
  const storage = getStorage();
  const info = await storage.stat(key);
  if (info === null) throw AppError.notFound('الملف غير موجود');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');

  const range = parseRangeHeader(req.headers.range, info.size);
  if (range === 'unsatisfiable') {
    res.setHeader('Content-Range', `bytes */${info.size}`);
    res.status(416).end();
    return;
  }
  const slice = range === null ? await storage.get(key) : await storage.getRange(key, range.start, range.end);
  if (slice === null) throw AppError.notFound('الملف غير موجود');
  if (range !== null) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${info.size}`);
  }
  // Buffer length (not stat.size) — the truth about the bytes actually
  // served if the object changed between stat and read.
  res.setHeader('Content-Length', String(slice.length));
  res.end(slice);
}

// ─── POST /papers — STUDENT-only research-paper PDF upload ────────

/** 10 uploads / min / user — same factory shape as the scan/chat routes. */
const paperUploadLimiter = createRouteLimiter({ max: 10 });

/**
 * Upload a research-paper PDF as a RAW application/pdf body (no
 * multipart dependency — express.raw buffers the bytes, 20 MB cap).
 *
 * Guards, in order: role (STUDENT only — 403 before a byte is read),
 * Buffer.isBuffer (a mismatched Content-Type leaves req.body as the
 * express.json leftover {}), size (413), then the %PDF- magic bytes.
 * Responds 201 with the fileUrl the paper row should store.
 *
 * NO ResearchPaper row is created here, on purpose: the row is minted
 * by the existing POST /api/v1/me/research with this fileUrl. Until
 * then the uploaded bytes are an inert orphan — the serving gate below
 * 404s any filename without an authorizing paper row, so an orphan can
 * never be read. (A storage put failure is a 500; the bytes are the
 * only side effect and no row references them.)
 */
router.post(
  '/papers',
  requireRole(Role.STUDENT),
  paperUploadLimiter,
  express.raw({ type: 'application/pdf', limit: '20mb' }),
  async (req, res, next) => {
    try {
      const body = req.body;
      if (!Buffer.isBuffer(body)) {
        throw AppError.badRequest('أرسل ملف PDF واحدًا بترميز application/pdf');
      }
      if (!isUploadSizeOk(body.length)) {
        throw new AppError('PAYLOAD_TOO_LARGE', 'حجم الملف يتجاوز الحد المسموح (20 ميجابايت)', 413);
      }
      if (!isPdfMagicBytes(body)) {
        throw AppError.badRequest('الملف المرفق ليس ملف PDF صالحاً');
      }
      const filename = `${generateStorageId()}.pdf`;
      const key = buildStorageKey('papers', filename);
      try {
        await getStorage().put(key, body);
      } catch (err) {
        logger.error({ err, key }, 'paper PDF upload: storage put failed');
        throw AppError.internal('تعذّر حفظ الملف — حاول مرة أخرى');
      }
      res.status(201).json({ data: { fileUrl: paperFilenameToFileUrl(filename) } });
    } catch (e) {
      next(e);
    }
  },
);

// ─── GET /papers/:filename — serve research PDFs (gated) ──────────

/**
 * Serve a paper PDF from the storage abstraction (local disk or
 * S3-compatible object store — the driver is env-selected, local keeps
 * the exact `backend/storage/papers/` layout).
 * Auth-required. Path traversal is blocked by the filename gates; the
 * directory pin lives inside LocalDriver now (see isWithinPapersDir).
 * The filename / role gates are extracted as pure functions above and
 * pinned DB-free by tests/modules/files-guard.test.ts (audit 15-i
 * TOP-6, wave 16-B11).
 *
 * Access gate (unchanged — previously ANY authenticated user could read
 * ANY paper PDF): the filename is resolved through the ResearchPaper
 * table — access is granted when the paper is PUBLISHED, the requester
 * is the paper's owner (student) or its reviewer, or the requester is
 * ADMIN/OWNER/QUALITY (oversight). QUALITY matches the
 * paper-annotation route's model: a role that can read annotations on
 * any paper can also fetch the artifact it audits.
 * A stored file with no matching paper row is an orphan and is not served.
 */
router.get('/papers/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename!;
    // Reject anything that smells like traversal. The aggregate gate is
    // isSafePaperFilename; the two checks stay split so each rejection
    // carries its own message.
    if (containsTraversalPatterns(filename)) {
      throw AppError.badRequest('اسم الملف غير صالح');
    }
    if (!isPdfFilename(filename)) {
      throw AppError.badRequest('تُقدَّم الملفات من هذه الخدمة بصيغة PDF فقط');
    }

    // ── Access gate: resolve the file to its paper row(s) ──────────
    const uid = req.user!.id;
    const role = req.user!.role;
    if (!isPaperOversightRole(role)) {
      // The grant predicate lives inside the query (was: fetch up to 10
      // matching rows and check in memory — a filename shared by >10 papers
      // could push the authorizing row past the take window and 404 a file
      // the user is entitled to). findFirst stops at the first row that
      // both matches the filename AND grants access, no matter how many
      // non-granting papers share it.
      const accessible = await prisma.researchPaper.findFirst({
        where: {
          fileUrl: { endsWith: `/${filename}` },
          OR: [{ status: 'PUBLISHED' }, { studentId: uid }, { reviewerId: uid }],
        },
        select: { id: true },
      });
      if (!accessible) throw AppError.notFound('الملف غير موجود');
    }

    await servePdfFromStorage(req, res, buildStorageKey('papers', filename));
  } catch (e) { next(e); }
});

// ─── GET /materials/:filename — serve material PDFs (gated) ───────

/**
 * Serve a course-material PDF uploaded via
 * POST /api/v1/offerings/:id/materials/file.
 *
 * Same filename gates as papers (traversal + .pdf). Access gate: the
 * filename is resolved through the Material table (url endsWith) with
 * the grant predicate inside the query — allowed when the requester
 * teaches the material's offering, or is actively enrolled in it, or
 * is ADMIN/OWNER/QUALITY oversight (isPaperOversightRole — the same
 * trio, mirroring the papers gate). A material row with no stored
 * bytes (row created, put failed and cleanup raced) 404s honestly
 * through the same stat probe.
 */
router.get('/materials/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename!;
    if (containsTraversalPatterns(filename)) {
      throw AppError.badRequest('اسم الملف غير صالح');
    }
    if (!isPdfFilename(filename)) {
      throw AppError.badRequest('تُقدَّم الملفات من هذه الخدمة بصيغة PDF فقط');
    }

    const uid = req.user!.id;
    const role = req.user!.role;
    if (!isPaperOversightRole(role)) {
      const accessible = await prisma.material.findFirst({
        where: {
          url: { endsWith: `/${filename}` },
          OR: [
            { offering: { teacherId: uid } },
            { offering: { enrollments: { some: { studentId: uid, status: 'active' } } } },
          ],
        },
        select: { id: true },
      });
      if (!accessible) throw AppError.notFound('الملف غير موجود');
    }

    await servePdfFromStorage(req, res, buildStorageKey('materials', filename));
  } catch (e) { next(e); }
});

export default router;
