import path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
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
 * In a future iteration, we'll gate access by paper.status and ownership.
 * For now: any authenticated user can read any paper PDF, mirroring how
 * the published library works.
 */
router.get('/papers/:filename', (req, res, next) => {
  try {
    const filename = req.params.filename!;
    // Reject anything that smells like traversal.
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw AppError.badRequest('Invalid filename');
    }
    if (!filename.toLowerCase().endsWith('.pdf')) {
      throw AppError.badRequest('Only PDF files are served from this endpoint');
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
