/**
 * Milestones service — `fireMilestone(userId, id)`.
 *
 * Internal helper for service hooks (submission, enrollment,
 * exam-window cron) to atomically append a milestone id to the
 * user's firedMilestones array. Same write semantics as the
 * server-to-server endpoint in router.ts (idempotent, atomic via
 * array_append + NOT (= ANY ...)), but skips the HTTP boundary so
 * services don't need to spin up a fetch client.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Returns:
 *   { fired: true,  firedMilestones }  → id was newly appended
 *   { fired: false, firedMilestones }  → id already present (no-op)
 *
 * Throws AppError.notFound if the user does not exist.
 *
 * Audit log: emitted only on the `fired: true` branch — repeat
 * fires of the same id by the same hook never duplicate.
 *
 * Trigger site wiring (deferred — the originating service flows
 * are not yet in the project):
 *   - first-assignment-complete: call after Submission.status first
 *     transitions to SUBMITTED for a user (in submissions service).
 *   - first-course-complete: call after Enrollment.status first
 *     transitions to COMPLETED (in enrollments service).
 *   - exam-window-opens:<windowId>: call inside the exam-window
 *     cron tick for each enrolled user not already in
 *     firedMilestones (id keyed per window).
 */
import { prisma } from '../../db.js';
import { AppError } from '../../lib/errors.js';
import { MILESTONE_ID_PATTERN } from './router.js';

export interface FireMilestoneResult {
  fired: boolean;
  firedMilestones: string[];
}

export async function fireMilestone(
  userId: string,
  milestoneId: string,
): Promise<FireMilestoneResult> {
  if (!MILESTONE_ID_PATTERN.test(milestoneId)) {
    throw AppError.badRequest('Unknown milestone id');
  }

  const rows = (await prisma.$queryRawUnsafe(
    `UPDATE "User"
     SET "firedMilestones" = array_append("firedMilestones", $1)
     WHERE "id" = $2
       AND NOT ($1 = ANY ("firedMilestones"))
     RETURNING "firedMilestones"`,
    milestoneId,
    userId,
  )) as Array<{ firedMilestones: string[] }>;

  if (rows.length === 0) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { firedMilestones: true },
    });
    if (!existing) throw AppError.notFound('User not found');
    return { fired: false, firedMilestones: existing.firedMilestones };
  }

  await prisma.auditLog.create({
    data: {
      action: 'milestone.fire',
      resourceType: 'User',
      resourceId: userId,
      metadata: { milestoneId },
    },
  });

  return { fired: true, firedMilestones: rows[0]!.firedMilestones };
}
