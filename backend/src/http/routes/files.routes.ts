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

/**
 * Serve a file from /storage/papers/.
 * Auth-required. Path traversal is blocked by basename + dir-pin check.
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
    // Reject anything that smells like traversal.
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw AppError.badRequest('Invalid filename');
    }
    if (!filename.toLowerCase().endsWith('.pdf')) {
      throw AppError.badRequest('Only PDF files are served from this endpoint');
    }

    // ── Access gate: resolve the file to its paper row(s) ──────────
    const uid = req.user!.id;
    const role = req.user!.role;
    const isOversight = role === Role.ADMIN || role === Role.OWNER || role === Role.QUALITY;
    if (!isOversight) {
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
      if (!accessible) throw AppError.notFound('File not found');
    }

    const safeName = path.basename(filename);
    const filePath = path.resolve(STORAGE_ROOT, 'papers', safeName);

    // Pin to the storage/papers directory.
    const expectedDir = path.resolve(STORAGE_ROOT, 'papers');
    if (!filePath.startsWith(expectedDir + path.sep)) {
      throw AppError.badRequest('Invalid path');
    }

    if (!existsSync(filePath)) {
      throw AppError.notFound('File not found');
    }
    const stat = statSync(filePath);
    if (!stat.isFile()) {
      throw AppError.badRequest('Not a file');
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
