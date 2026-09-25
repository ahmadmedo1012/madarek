/**
 * Milestones module — `POST /api/v1/me/milestones/:id/fire`.
 *
 * Implements T129 of specs/012-design-graphics-uplift/tasks.md.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Server-to-server use only. Service hooks call `fireMilestone()`
 * directly (in-process, see ./service.ts) — this HTTP endpoint
 * exists for out-of-process callers (workers, ops scripts) that
 * need to fire a milestone without the user's JWT.
 *
 * Namespace caveat (11-a P2-20): the path lives under the
 * user-namespace `/me/…` prefix even though authentication is a
 * service token, never a user session. Renaming to
 * `/internal/milestones` would break the wire contract for existing
 * callers for zero behavioral gain — a future API version may move
 * it; until then this comment is the map.
 *
 * Authorisation: an internal service token in the
 * `x-internal-service-token` header. When INTERNAL_SERVICE_TOKEN
 * env is unset, every call is rejected (fail-closed).
 *
 * Milestone IDs (V1 fixed catalogue per Q4 of the clarifications):
 *   - first-assignment-complete
 *   - first-course-complete
 *   - exam-window-opens:<windowId>
 */
import { Router } from 'express';
import { z } from 'zod';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../../env.js';
import { validate } from '../../http/validate.js';
import { AppError } from '../../lib/errors.js';
import { fireMilestone } from './service.js';

export const milestonesRouter = Router();

// The id catalogue lives in ./service.ts (its only other consumer);
// re-exported here so the public surface of the module — and the
// pinned contract test — stays unchanged.
export { MILESTONE_ID_PATTERN } from './service.js';

const fireBodySchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

/**
 * Service-token auth middleware.
 *
 *  - If INTERNAL_SERVICE_TOKEN is unset → reject every request (fail-closed).
 *  - Otherwise require `x-internal-service-token` to match it.
 *
 * Uses `crypto.timingSafeEqual`, which is the only Node-native way to
 * compare secrets without leaking length / character info via timing.
 * (`timingSafeEqual` requires equal-length inputs, so both sides are
 * hashed to fixed-length SHA-256 digests first — same approach as
 * `crypto.subtle.timingSafeEqual` in browsers. Hashing also removes
 * the length dependency entirely, so attackers can't probe the
 * expected token length by measuring response time.)
 *
 * Exported for unit testing (same pattern as theme/router.ts's
 * themePutBodySchema) — `tests/modules/milestones-service-auth.test.ts`
 * drives it with fake req/next without booting a server.
 */
export function serviceAuthMiddleware(req: { header(name: string): string | undefined }, _res: unknown, next: (err?: unknown) => void) {
  const expected = env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    return next(AppError.forbidden('Service token required'));
  }
  const header = req.header('x-internal-service-token');
  if (!header) {
    return next(AppError.forbidden('Service token required'));
  }
  try {
    // SHA-256 both values → fixed-length digests → the comparison is
    // constant-time AND independent of either side's length.
    const a = createHash('sha256').update(header, 'utf8').digest();
    const b = createHash('sha256').update(expected, 'utf8').digest();
    if (!timingSafeEqual(a, b)) {
      return next(AppError.forbidden('Service token required'));
    }
    next();
  } catch {
    next(AppError.forbidden('Service token required'));
  }
}

milestonesRouter.post('/:id/fire', serviceAuthMiddleware as import('express').RequestHandler, validate(fireBodySchema), async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    // Defer to the in-process helper so the HTTP path and the
    // direct-import path share semantics (atomicity, audit,
    // idempotence). The helper validates id format and throws on
    // malformed input — surfaced as a 400 by the error handler.
    const { userId } = req.body as z.infer<typeof fireBodySchema>;
    const result = await fireMilestone(userId, id);
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});
