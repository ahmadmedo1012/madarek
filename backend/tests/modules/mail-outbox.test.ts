/**
 * R350 E2 — the transactional-mail outbox, pinned.
 *
 * The law (backend/src/lib/mail-outbox.ts):
 *  · queueMail — caps refuse BEFORE the insert; a replayed dedupeKey
 *    never double-queues (P2002 → the existing row).
 *  · drainOutbox — compare-and-swap claim; suppression consult before
 *    every send; success → sent; failure → backoff (1m/5m/30m/2h/6h)
 *    then dead-letter `failed`; provider=none parks rows back in
 *    queued (the honest off — the backlog waits for the provider).
 *  · nextAttemptDelayMs — the pure backoff schedule.
 *
 * DB-free: the prisma registry is mocked per the ai-chat-routes pattern.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    mailOutbox: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    mailSuppression: { findFirst: vi.fn() },
  };
  return { prisma: p, withRetry: vi.fn() };
});

// The provider layer: controllable provider state (the honest-off default
// must PARK rows, not send them — the send-path tests flip the provider on).
// vi.hoisted: the factory is hoisted above every import.
const mailState = vi.hoisted(() => ({ provider: 'none' as string, apiKey: undefined as string | undefined }));
vi.mock('../../src/lib/mail.js', () => ({
  mailConfig: mailState,
  sendMail: vi.fn(),
  renderResetEmail: vi.fn(),
  renderInviteEmail: vi.fn(),
  renderEmailShell: vi.fn(),
  brevoSender: vi.fn(),
  resolveMailConfig: vi.fn(),
}));

import { prisma } from '../../src/db.js';
import {
  drainOutbox,
  nextAttemptDelayMs,
  queueMail,
  MAX_ATTEMPTS,
  RECIPIENT_DAILY_CAP,
} from '../../src/lib/mail-outbox.js';

const mocked = prisma as unknown as {
  mailOutbox: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  mailSuppression: { findFirst: ReturnType<typeof vi.fn> };
};

const MSG = { to: 'a@b.c', template: 'reset-password', subject: 'س', html: '<p>س</p>', text: 'س' };

beforeEach(() => {
  vi.clearAllMocks();
  mocked.mailOutbox.count.mockResolvedValue(0);
  mailState.provider = 'none';
  mailState.apiKey = undefined;
});

describe('R350 E2 — nextAttemptDelayMs (the pure schedule)', () => {
  it('schedules 1m → 5m → 30m → 2h → 6h then dead-letters', () => {
    expect(nextAttemptDelayMs(0)).toBe(0);
    expect(nextAttemptDelayMs(1)).toBe(60_000);
    expect(nextAttemptDelayMs(2)).toBe(5 * 60_000);
    expect(nextAttemptDelayMs(3)).toBe(30 * 60_000);
    expect(nextAttemptDelayMs(4)).toBe(2 * 60 * 60_000);
    expect(nextAttemptDelayMs(5)).toBe(6 * 60 * 60_000);
    expect(nextAttemptDelayMs(6)).toBeNull();
    expect(nextAttemptDelayMs(MAX_ATTEMPTS)).toBeNull();
  });
});

describe('R350 E2 — queueMail', () => {
  it('inserts the rendered message and reports the row id', async () => {
    mocked.mailOutbox.create.mockResolvedValue({ id: 'outbox_1' });
    const r = await queueMail(MSG);
    expect(r).toEqual({ ok: true, id: 'outbox_1', deduped: false });
    expect(mocked.mailOutbox.create).toHaveBeenCalledOnce();
  });

  it('refuses past the per-recipient daily cap (flood guard)', async () => {
    mocked.mailOutbox.count.mockResolvedValue(RECIPIENT_DAILY_CAP);
    const r = await queueMail(MSG);
    expect(r).toEqual({ ok: false, reason: 'cap-recipient' });
    expect(mocked.mailOutbox.create).not.toHaveBeenCalled();
  });

  it('refuses past the per-institution daily cap', async () => {
    mocked.mailOutbox.count.mockImplementation((args: { where?: { to?: string; institutionId?: string } }) =>
      Promise.resolve(args?.where?.institutionId ? 500 : 0),
    );
    const r = await queueMail({ ...MSG, institutionId: 'inst-1' });
    expect(r).toEqual({ ok: false, reason: 'cap-institution' });
    expect(mocked.mailOutbox.create).not.toHaveBeenCalled();
  });

  it('a replayed dedupeKey dedupes instead of double-queueing', async () => {
    const dup = Object.assign(new Error('unique'), { code: 'P2002' });
    mocked.mailOutbox.create.mockRejectedValueOnce(dup);
    mocked.mailOutbox.findUnique.mockResolvedValue({ id: 'existing' });
    const r = await queueMail({ ...MSG, dedupeKey: 'reset:a@b.c:tok' });
    expect(r).toEqual({ ok: true, id: 'existing', deduped: true });
  });
});

describe('R350 E2 — drainOutbox', () => {
  const ROW = { id: 'row1', to: 'a@b.c', subject: 'س', html: '<p>س</p>', text: 'س', attempts: 0 };

  it('provider=none parks due rows back in queued (the honest off)', async () => {
    mocked.mailOutbox.findMany.mockResolvedValue([ROW]);
    mocked.mailOutbox.updateMany.mockResolvedValue({ count: 1 });
    mocked.mailSuppression.findFirst.mockResolvedValue(null);
    const send = vi.fn();
    const r = await drainOutbox({ send });
    expect(r).toMatchObject({ picked: 1, skippedProviderOff: 1, sent: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(mocked.mailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'queued' }) }),
    );
  });

  it('claims via compare-and-swap, sends, marks sent', async () => {
    mailState.provider = 'resend';
    mailState.apiKey = 're_test';
    mocked.mailOutbox.findMany.mockResolvedValue([ROW]);
    mocked.mailOutbox.updateMany.mockResolvedValue({ count: 1 });
    mocked.mailSuppression.findFirst.mockResolvedValue(null);
    mocked.mailOutbox.update.mockResolvedValue({});
    const send = vi.fn().mockResolvedValue(true);
    const r = await drainOutbox({ send });
    expect(r).toMatchObject({ picked: 1, sent: 1, failed: 0, suppressed: 0 });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.c' }));
    expect(mocked.mailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'sent' }) }),
    );
  });

  it('a suppressed address never reaches the provider', async () => {
    mailState.provider = 'resend';
    mailState.apiKey = 're_test';
    mocked.mailOutbox.findMany.mockResolvedValue([ROW]);
    mocked.mailOutbox.updateMany.mockResolvedValue({ count: 1 });
    mocked.mailSuppression.findFirst.mockResolvedValue({ type: 'hard_bounce' });
    const send = vi.fn();
    const r = await drainOutbox({ send });
    expect(r).toMatchObject({ picked: 1, suppressed: 1 });
    expect(send).not.toHaveBeenCalled();
    expect(mocked.mailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'suppressed' }) }),
    );
  });

  it('a send failure backs off with the schedule and requeues', async () => {
    mailState.provider = 'resend';
    mailState.apiKey = 're_test';
    mocked.mailOutbox.findMany.mockResolvedValue([ROW]);
    mocked.mailOutbox.updateMany.mockResolvedValue({ count: 1 });
    mocked.mailSuppression.findFirst.mockResolvedValue(null);
    const send = vi.fn().mockResolvedValue(false);
    const r = await drainOutbox({ send });
    expect(r).toMatchObject({ picked: 1, failed: 1 });
    expect(mocked.mailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'queued', attempts: 1, nextAttemptAt: expect.any(Date) }),
      }),
    );
  });

  it('the exhausted schedule dead-letters into failed', async () => {
    mailState.provider = 'resend';
    mailState.apiKey = 're_test';
    mocked.mailOutbox.findMany.mockResolvedValue([{ ...ROW, attempts: 6 }]);
    mocked.mailOutbox.updateMany.mockResolvedValue({ count: 1 });
    mocked.mailSuppression.findFirst.mockResolvedValue(null);
    const send = vi.fn().mockResolvedValue(false);
    const r = await drainOutbox({ send });
    expect(r).toMatchObject({ picked: 1, failed: 1 });
    expect(mocked.mailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });

  it('a row another drain claimed is skipped, not double-sent', async () => {
    mocked.mailOutbox.findMany.mockResolvedValue([ROW]);
    mocked.mailOutbox.updateMany.mockResolvedValue({ count: 0 }); // lost the CAS race
    const send = vi.fn();
    const r = await drainOutbox({ send });
    expect(r.picked).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });
});
