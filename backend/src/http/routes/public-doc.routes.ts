/**
 * r357 L2 — the signed-URL consumer for student documents.
 *
 * WHY a dedicated router: the signed URL carries NO session (a new
 * tab, a preview pane) — but profiles.routes/search.routes mount at
 * the bare /api/v1 with a router-wide authMiddleware, so ANY
 * unauthenticated path under /api/v1 hits their 401 first. This router
 * mounts BEFORE them (app.ts) and exposes exactly ONE route:
 *
 *   GET /api/v1/files/documents/:id?exp=…&sig=…
 *
 * The HMAC (lib/doc-urls.ts, keyed by JWT_ACCESS_SECRET) is the ONLY
 * trust — 5-minute TTL, constant-time compare, no session, no cookie.
 */
import { Router } from 'express';
import { prisma } from '../../db.js';
import { AppError } from '../../lib/errors.js';
import { verifyDocSignature } from '../../lib/doc-urls.js';
import { getStorage } from '../../lib/storage.js';
import { env } from '../../env.js';

const router = Router();

router.get('/documents/:id', async (req, res, next) => {
  try {
    const verdict = verifyDocSignature(
      env.JWT_ACCESS_SECRET,
      req.params.id!,
      Number(req.query.exp),
      typeof req.query.sig === 'string' ? req.query.sig : '',
    );
    if (!verdict.ok) {
      throw new AppError('FORBIDDEN', 'رابط الوثيقة غير صالح أو منتهي — اطلب رابطًا جديدًا', 403);
    }
    const row = await prisma.studentDocument.findUnique({ where: { id: req.params.id } });
    if (!row) throw AppError.notFound('الوثيقة غير موجودة');
    const buf = await getStorage().get(row.storageKey);
    if (!buf) throw AppError.notFound('الوثيقة غير موجودة');
    res.setHeader('Content-Type', row.contentType);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.titleAr)}`);
    res.end(buf);
  } catch (e) { next(e); }
});

export default router;
