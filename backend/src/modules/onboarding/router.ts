/**
 * Onboarding module — `POST /api/v1/me/onboarding/complete`.
 *
 * Implements T125 of specs/012-design-graphics-uplift/tasks.md.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Behaviour (delegated to ./service.ts — the logic is unit-tested
 * there without a server):
 *   - Idempotent. If `onboardingCompletedAt` is already set, returns
 *     the existing timestamp without overwriting (preserves the
 *     "first completion" timestamp for audit purposes).
 *   - Writes a single audit-log entry per write — repeat calls don't
 *     log duplicates.
 *   - Returns the timestamp the SPA should reflect.
 */
import { Router } from 'express';
import { authMiddleware } from '../../http/middleware/auth.js';
import { completeOnboarding } from './service.js';

export const onboardingRouter = Router();
onboardingRouter.use(authMiddleware);

onboardingRouter.post('/complete', async (req, res, next) => {
  try {
    const result = await completeOnboarding(req.user!.id);
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});
