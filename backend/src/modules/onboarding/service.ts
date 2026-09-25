/**
 * Onboarding service — set `User.onboardingCompletedAt` (idempotent).
 *
 * Extracted from the router (T125) so the idempotency contract is
 * unit-testable without a server (the router was previously the only
 * home of this logic — audit 11-a test-gap #5).
 *
 * Contract (specs/012-design-graphics-uplift/contracts/onboarding-milestone.md):
 *  - Idempotent. If `onboardingCompletedAt` is already set, return the
 *    existing timestamp WITHOUT overwriting (the first-completion
 *    timestamp is the audit-relevant one) and WITHOUT a second
 *    audit-log row.
 *  - The completion write and its audit row land in ONE transaction,
 *    and the write is conditional (`onboardingCompletedAt: null`) so
 *    two concurrent completions cannot both win — the loser returns
 *    the winner's timestamp (same semantics as a repeat call).
 */
import { prisma } from '../../db.js';
import { AppError } from '../../lib/errors.js';

export interface CompleteOnboardingResult {
  onboardingCompletedAt: Date;
}

export async function completeOnboarding(userId: string): Promise<CompleteOnboardingResult> {
  // Fast path: a repeat call never opens a transaction.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });
  if (!existing) throw AppError.notFound('User not found');
  if (existing.onboardingCompletedAt) {
    return { onboardingCompletedAt: existing.onboardingCompletedAt };
  }

  const now = new Date();
  const won = await prisma.$transaction(async (tx) => {
    // Conditional write: only lands while the column is still NULL.
    // A concurrent completion that got there first makes this a no-op,
    // which is exactly the "already completed" semantics.
    const res = await tx.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: now },
    });
    if (res.count === 0) return false;
    await tx.auditLog.create({
      data: {
        action: 'onboarding.complete',
        resourceType: 'User',
        resourceId: userId,
        userId,
        metadata: { completedAt: now.toISOString() },
      },
    });
    return true;
  });

  if (won) return { onboardingCompletedAt: now };

  // Lost a race (or the row vanished between the pre-check and the
  // write) — re-read for the authoritative first-completion timestamp.
  const reread = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });
  if (!reread) throw AppError.notFound('User not found');
  if (!reread.onboardingCompletedAt) {
    // Unreachable with a consistent database: the conditional write
    // reports zero rows only when the column is already set. Fail loud
    // rather than fabricate a completion timestamp.
    throw AppError.internal('Onboarding completion state is inconsistent');
  }
  return { onboardingCompletedAt: reread.onboardingCompletedAt };
}
