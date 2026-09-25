/**
 * Backend unit test — `completeOnboarding` from
 * `backend/src/modules/onboarding/service.ts` (11-a test-gap #5: the
 * onboarding idempotency contract had zero coverage while living
 * inline in the router).
 *
 * DB-free with a mocked Prisma client. Pins the contract from
 * specs/012-design-graphics-uplift/contracts/onboarding-milestone.md:
 *   - first completion writes the timestamp AND exactly one audit row
 *     (in the same transaction, via a conditional updateMany)
 *   - repeat calls return the EXISTING timestamp and write nothing
 *   - a lost race (concurrent completion) returns the winner's
 *     timestamp without a second audit row
 *   - unknown users surface a clean 404, not a Prisma error
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db.js', () => {
  const prismaMock = {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  return {
    prisma: {
      ...prismaMock,
      // Interactive transactions hand the SAME mocked delegates to the
      // callback (the tx client and the root client share the mock).
      $transaction: vi.fn(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
      ),
    },
  };
});

import { prisma } from '../../src/db.js';
import { completeOnboarding } from '../../src/modules/onboarding/service';
import { AppError } from '../../src/lib/errors';

const findUnique = vi.mocked(prisma.user.findUnique);
const updateMany = vi.mocked(prisma.user.updateMany);
const auditCreate = vi.mocked(prisma.auditLog.create);
const transaction = vi.mocked(prisma.$transaction);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('completeOnboarding — first completion', () => {
  it('writes the timestamp and exactly one audit row inside one transaction', async () => {
    findUnique.mockResolvedValue({ onboardingCompletedAt: null } as never);
    updateMany.mockResolvedValue({ count: 1 });

    const result = await completeOnboarding('user-1');

    expect(result.onboardingCompletedAt).toBeInstanceOf(Date);

    // The write is conditional — only lands while the column is NULL.
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledTimes(1);
    const write = updateMany.mock.calls[0]![0];
    expect(write.where).toEqual({ id: 'user-1', onboardingCompletedAt: null });
    expect((write.data as { onboardingCompletedAt: Date }).onboardingCompletedAt).toBe(
      result.onboardingCompletedAt,
    );

    // Audit row: same transaction, action + ISO timestamp metadata.
    expect(auditCreate).toHaveBeenCalledTimes(1);
    const auditData = auditCreate.mock.calls[0]![0].data as {
      action: string;
      resourceId: string;
      userId: string;
      metadata: unknown;
    };
    expect(auditData.action).toBe('onboarding.complete');
    expect(auditData.resourceId).toBe('user-1');
    expect(auditData.userId).toBe('user-1');
    expect(auditData.metadata).toEqual({
      completedAt: result.onboardingCompletedAt.toISOString(),
    });
  });
});

describe('completeOnboarding — idempotent repeats', () => {
  it('returns the existing first-completion timestamp without a second write', async () => {
    const firstCompletion = new Date('2025-06-01T00:00:00.000Z');
    findUnique.mockResolvedValue({ onboardingCompletedAt: firstCompletion } as never);

    const result = await completeOnboarding('user-1');

    expect(result.onboardingCompletedAt).toBe(firstCompletion);
    expect(transaction).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});

describe('completeOnboarding — concurrent-completion race', () => {
  it('returns the winner’s timestamp and writes no second audit row', async () => {
    const winnerTimestamp = new Date('2025-06-01T00:00:00.000Z');
    // Pre-check sees NULL; the conditional write loses (count 0);
    // the re-read sees the concurrent winner's value.
    findUnique
      .mockResolvedValueOnce({ onboardingCompletedAt: null } as never)
      .mockResolvedValueOnce({ onboardingCompletedAt: winnerTimestamp } as never);
    updateMany.mockResolvedValue({ count: 0 });

    const result = await completeOnboarding('user-1');

    expect(result.onboardingCompletedAt).toBe(winnerTimestamp);
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('surfaces a clean 404 when the row vanished mid-race', async () => {
    findUnique
      .mockResolvedValueOnce({ onboardingCompletedAt: null } as never)
      .mockResolvedValueOnce(null as never);
    updateMany.mockResolvedValue({ count: 0 });

    const err = await completeOnboarding('user-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(404);
    expect((err as AppError).code).toBe('NOT_FOUND');
  });

  it('fails loud on an impossible state instead of fabricating a timestamp', async () => {
    // count 0 AND the re-read still NULL — cannot happen against a
    // consistent DB; the service must not invent a completion date.
    findUnique
      .mockResolvedValueOnce({ onboardingCompletedAt: null } as never)
      .mockResolvedValueOnce({ onboardingCompletedAt: null } as never);
    updateMany.mockResolvedValue({ count: 0 });

    const err = await completeOnboarding('user-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(500);
    expect((err as AppError).code).toBe('INTERNAL');
  });
});

describe('completeOnboarding — unknown user', () => {
  it('rejects with a clean 404 before any write', async () => {
    findUnique.mockResolvedValue(null as never);

    const err = await completeOnboarding('ghost').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(404);
    expect(transaction).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
