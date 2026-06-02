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
 * Verify the request carries a valid internal service token. The
 * env var INTERNAL_SERVICE_TOKEN is required for the endpoint to
 * accept the call; if it's not set, every request is rejected so
 * the endpoint cannot be inadvertently exposed.
 */
function isAuthorisedService(req: { header(name: string): string | undefined }): boolean {
  const expected = env.INTERNAL_SERVICE_TOKEN;
  if (!expected) return false;
  const header = req.header('x-internal-service-token');
  if (!header) return false;
  // Constant-time compare to avoid timing leaks.
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

milestonesRouter.post('/:id/fire', validate(fireBodySchema), async (req, res, next) => {
  try {
    if (!isAuthorisedService(req)) throw AppError.forbidden('Service token required');
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
