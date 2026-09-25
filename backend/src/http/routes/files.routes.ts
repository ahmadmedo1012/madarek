import path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../../lib/errors.js';

const router = Router();

router.use(authMiddleware);

// Resolve storage relative to the backend package, not the working directory.
// In dev: backend/storage/. In prod: dist is one level deeper, so up-2.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname is .../backend/dist/http/routes (prod) or .../backend/src/http/routes (dev)
const STORAGE_ROOT = path.resolve(__dirname, '../../../storage');

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
 * it audits.
 */
export function isPaperOversightRole(role: Role): boolean {
  return role === Role.ADMIN || role === Role.OWNER || role === Role.QUALITY;
}

/**
 * Directory pin: the resolved file path must sit DIRECTLY inside
 * `<storageRoot>/papers`. Comparing against `expectedDir + path.sep`
 * (not a bare `startsWith(expectedDir)`) is what rejects sibling
 * directories like `storage/papers-evil/` — the classic prefix-check
 * bug. `resolved` must be a normalized absolute path (the route always
 * passes `path.resolve` output): this function does not normalize and
 * judges the literal string, so an un-normalized `..` segment fails
 * conservatively.
 */
export function isWithinPapersDir(resolved: string, storageRoot: string): boolean {
  const expectedDir = path.resolve(storageRoot, 'papers');
  return resolved.startsWith(expectedDir + path.sep);
}

/**
 * Serve a file from /storage/papers/.
 * Auth-required. Path traversal is blocked by basename + dir-pin check.
 * The filename / role / directory gates are extracted as pure functions
 * below and pinned DB-free by tests/modules/files-guard.test.ts
 * (audit 15-i TOP-6, wave 16-B11).
 *
 * Access gate (previously ANY authenticated user could read ANY paper PDF):
 * the filename is resolved through the ResearchPaper table — access is
 * granted when the paper is PUBLISHED, the requester is the paper's owner
 * (student) or its reviewer, or the requester is ADMIN/OWNER/QUALITY
 * (oversight). QUALITY matches the paper-annotation route's model: a role
 * that can read annotations on any paper can also fetch the artifact it
 * audits.
 * A local file with no matching paper row is an orphan and is not served.
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

    const safeName = path.basename(filename);
    const filePath = path.resolve(STORAGE_ROOT, 'papers', safeName);

    // Pin to the storage/papers directory.
    if (!isWithinPapersDir(filePath, STORAGE_ROOT)) {
      throw AppError.badRequest('مسار غير صالح');
    }

    if (!existsSync(filePath)) {
      throw AppError.notFound('الملف غير موجود');
    }
    const stat = statSync(filePath);
    if (!stat.isFile()) {
      throw AppError.badRequest('المسار المطلوب ليس ملفاً');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size.toString());
    res.setHeader('Cache-Control', 'private, max-age=3600');
    // Range support: express's sendFile honors Range headers automatically.
    res.sendFile(filePath, (err) => {
      if (err) next(err);
    });
  } catch (e) { next(e); }
});

export default router;
