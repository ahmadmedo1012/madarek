/**
 * Milestones module — `POST /api/v1/me/milestones/:id/fire`.
 *
 * Implements T129 of specs/012-design-graphics-uplift/tasks.md.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Server-to-server use only. Service hooks (submission service,
 * enrollment service, exam-window cron) call this with an internal
 * service token; client requests with a user JWT are rejected (the
 * client never fires its own milestones — the trigger conditions are
 * server-side academic data).
 *
 * The atomic UPDATE uses array_append guarded by NOT (... = ANY ...)
 * so concurrent fires of the same id collapse to a single entry.
 *
 * Milestone IDs (V1 fixed catalogue per Q4 of the clarifications):
 *   - first-assignment-complete
 *   - first-course-complete
 *   - exam-window-opens:<windowId>
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { validate } from '../../http/validate.js';
import { AppError } from '../../lib/errors.js';

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
    if (!MILESTONE_ID_PATTERN.test(id)) {
      throw AppError.badRequest('Unknown milestone id');
    }
    const { userId } = req.body as z.infer<typeof fireBodySchema>;

    // Atomic conditional append. Returns the post-write row.
    // Postgres `array_append` + `= ANY` is the documented contract.
    const rows = (await prisma.$queryRawUnsafe(
      `UPDATE "User"
       SET "firedMilestones" = array_append("firedMilestones", $1)
       WHERE "id" = $2
         AND NOT ($1 = ANY ("firedMilestones"))
       RETURNING "firedMilestones"`,
      id,
      userId,
    )) as Array<{ firedMilestones: string[] }>;

    if (rows.length === 0) {
      // Either the user doesn't exist OR the id was already present.
      // Probe to disambiguate.
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { firedMilestones: true },
      });
      if (!existing) throw AppError.notFound('User not found');
      res.json({
        data: {
          fired: false,
          firedMilestones: existing.firedMilestones,
        },
      });
      return;
    }

    await prisma.auditLog.create({
      data: {
        action: 'milestone.fire',
        resourceType: 'User',
        resourceId: userId,
        metadata: { milestoneId: id },
      },
    });

    res.json({
      data: {
        fired: true,
        firedMilestones: rows[0]!.firedMilestones,
      },
    });
  } catch (e) {
    next(e);
  }
});
