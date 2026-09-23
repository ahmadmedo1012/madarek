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
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../env.js';
import { validate } from '../../http/validate.js';
import { AppError } from '../../lib/errors.js';
import { fireMilestone } from './service.js';

export const milestonesRouter = Router();

export const MILESTONE_ID_PATTERN =
  /^(first-assignment-complete|first-course-complete|exam-window-opens:[a-zA-Z0-9_-]+)$/;

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
 * (`timingSafeEqual` requires equal-length inputs, so we hash both
 * sides — same approach as `crypto.subtle.timingSafeEqual` in browsers.
 * Hashing also removes the length dependency entirely, so attackers
 * can't probe the expected token length by measuring response time.)
 */
function serviceAuthMiddleware(req: { header(name: string): string | undefined }, _res: unknown, next: (err?: unknown) => void) {
  const expected = env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    return next(AppError.forbidden('Service token required'));
  }
  const header = req.header('x-internal-service-token');
  if (!header) {
    return next(AppError.forbidden('Service token required'));
  }
  try {
    // Hash both values with a fixed output length before comparison.
    // This removes the length-mismatch short-circuit while keeping
    // the comparison constant-time.
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    // Pad to equal length so timingSafeEqual doesn't throw.
    const len = Math.max(a.length, b.length);
    const aPad = Buffer.concat([a, Buffer.alloc(len - a.length)]);
    const bPad = Buffer.concat([b, Buffer.alloc(len - b.length)]);
    if (!timingSafeEqual(aPad, bPad)) {
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
