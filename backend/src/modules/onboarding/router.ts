/**
 * Onboarding module — `POST /api/v1/me/onboarding/complete`.
 *
 * Implements T125 of specs/012-design-graphics-uplift/tasks.md.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Behaviour:
 *   - Idempotent. If `onboardingCompletedAt` is already set, returns
 *     the existing timestamp without overwriting (preserves the
 *     "first completion" timestamp for audit purposes).
 *   - Writes a single audit-log entry per write — repeat calls don't
 *     log duplicates.
 *   - Returns the timestamp the SPA should reflect.
 */
import { Router } from 'express';
import { prisma } from '../../db.js';
import { authMiddleware } from '../../http/middleware/auth.js';
import { AppError } from '../../lib/errors.js';

export const onboardingRouter = Router();
onboardingRouter.use(authMiddleware);

onboardingRouter.post('/complete', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    if (!existing) throw AppError.notFound('User not found');

    if (existing.onboardingCompletedAt) {
      // Idempotent: do not overwrite the first-completion timestamp
      // and do not emit a duplicate audit entry.
      res.json({ data: { onboardingCompletedAt: existing.onboardingCompletedAt } });
      return;
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: now },
        select: { onboardingCompletedAt: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'onboarding.complete',
          resourceType: 'User',
          resourceId: userId,
          userId,
          metadata: { completedAt: now.toISOString() },
        },
      });
      return u;
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});
