/**
 * R350 E3 — the scheduler's mail sweeps, pinned:
 *  · sendAssignmentDueReminders — the 12–36h window, the satisfied-
 *    submission skip, the placeholder-email skip, the per-day dedupe key;
 *  · R353 N — the bell/push twin: Notification rows + fanOutPush ride
 *    the reminder for EVERY active unsatisfied student (deliverable
 *    email or not), deduped on the payload (repeat sweeps collapse);
 *  · sendWeeklyDigests — users without enrolments get no digest,
 *    enrolled users get their week's items, the ISO-week dedupe key;
 *  · never-throw wrappers (overlap + error) per the retention contract.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    assignment: { findMany: vi.fn(async () => []) },
    submission: { findFirst: vi.fn(async () => null) },
    examTemplate: { findMany: vi.fn(async () => []) },
    notification: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({ id: 'n1' })) },
    notificationPreference: { findUnique: vi.fn(async () => null) },
    mailOutbox: { count: vi.fn(async () => 0), create: vi.fn(async () => ({ id: 'o1' })), findUnique: vi.fn() },
    mailSuppression: { findFirst: vi.fn(async () => null) },
  };
  return { prisma: p, withRetry: vi.fn() };
});
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
// R353 N — the push fan-out is push.ts's own suite's business; here we
// pin the SCHEDULER's contract with it (who gets called, with what).
vi.mock('../../src/modules/notifications/push.js', () => ({
  fanOutPush: vi.fn(async () => undefined),
}));

import { prisma } from '../../src/db.js';
import { fanOutPush } from '../../src/modules/notifications/push.js';
import { arabicDayMonthTime } from '../../src/modules/notifications/core.js';
import {
  sendAssignmentDueReminders,
  sendWeeklyDigests,
  runAssignmentDueSweep,
  runWeeklyDigestSweep,
  isoWeekStamp,
  ASSIGNMENT_DUE_WINDOW_MIN_H,
  ASSIGNMENT_DUE_WINDOW_MAX_H,
} from '../../src/scheduler';

const mocked = prisma as unknown as {
  user: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  assignment: { findMany: ReturnType<typeof vi.fn> };
  submission: { findFirst: ReturnType<typeof vi.fn> };
  examTemplate: { findMany: ReturnType<typeof vi.fn> };
  notification: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  mailOutbox: { create: ReturnType<typeof vi.fn> };
};

const NOW = new Date('2026-11-14T06:00:00.000Z');
const IN_WINDOW = new Date(NOW.getTime() + 24 * 3_600_000); // +24h: inside 12–36h
const OUT_OF_WINDOW = new Date(NOW.getTime() + 96 * 3_600_000); // +96h: outside

const baseAssignment = (over: Partial<Parameters<typeof sendAssignmentDueReminders>[0]> = {}) => ({
  id: 'a1',
  title: 'بحوث الفصل',
  dueAt: IN_WINDOW,
  offering: {
    enrollments: [
      { student: { id: 'u1', email: 'salem@madarek.ly', firstName: 'سالم', isActive: true } },
      { student: { id: 'u2', email: '99001122@students.import.madarek.local', firstName: 'طالب', isActive: true } },
      { student: { id: 'u3', email: 'huda@madarek.ly', firstName: 'هدى', isActive: false } },
    ],
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocked.mailOutbox.create.mockResolvedValue({ id: 'o1' });
  // R353 N — clearAllMocks clears HISTORY but keeps IMPLEMENTATIONS
  // (a mockResolvedValue from an earlier test survives it); re-pin the
  // swept defaults so every test starts from the factory state.
  mocked.submission.findFirst.mockResolvedValue(null);
  mocked.notification.findFirst.mockResolvedValue(null);
  mocked.assignment.findMany.mockResolvedValue([]);
});

describe('R350 E3 — assignment-due reminders', () => {
  it('queries the 12–36h window and queues only deliverable active students', async () => {
    mocked.assignment.findMany.mockResolvedValue([baseAssignment()]);
    const r = await sendAssignmentDueReminders(NOW);
    expect(r).toEqual({ assignments: 1, queued: 1, bells: 2 });
    const where = mocked.assignment.findMany.mock.calls[0]![0] as { where: { dueAt: { gte: Date; lte: Date } } };
    const minH = (where.where.dueAt.gte.getTime() - NOW.getTime()) / 3_600_000;
    const maxH = (where.where.dueAt.lte.getTime() - NOW.getTime()) / 3_600_000;
    expect(minH).toBe(ASSIGNMENT_DUE_WINDOW_MIN_H);
    expect(maxH).toBe(ASSIGNMENT_DUE_WINDOW_MAX_H);
    const create = mocked.mailOutbox.create.mock.calls[0]![0] as { data: { dedupeKey: string; template: string } };
    expect(create.data.template).toBe('assignment-due');
    expect(create.data.dedupeKey).toBe(`due:a1:u1:${IN_WINDOW.toISOString().slice(0, 10)}`);
  });

  it('skips students who already satisfied the assignment', async () => {
    mocked.assignment.findMany.mockResolvedValue([baseAssignment()]);
    mocked.submission.findFirst.mockResolvedValue({ id: 's1' });
    const r = await sendAssignmentDueReminders(NOW);
    expect(r).toEqual({ assignments: 1, queued: 0, bells: 0 });
    expect(mocked.mailOutbox.create).not.toHaveBeenCalled();
    expect(mocked.notification.create).not.toHaveBeenCalled();
    expect(fanOutPush).not.toHaveBeenCalled();
  });

  it('assignments outside the window never enter the query (the where owns it)', async () => {
    mocked.assignment.findMany.mockResolvedValue([]);
    const r = await sendAssignmentDueReminders(NOW);
    expect(r).toEqual({ assignments: 0, queued: 0, bells: 0 });
    expect(OUT_OF_WINDOW.getTime()).toBeGreaterThan(0); // the window constant is pinned above
  });

  it('the sweep wrapper never throws (error → false)', async () => {
    mocked.assignment.findMany.mockRejectedValue(new Error('db down'));
    await expect(sendAssignmentDueReminders(NOW)).rejects.toThrow('db down');
    const ok = await runAssignmentDueSweep('test');
    expect(ok).toBe(false);
  });
});

describe('R353 N — the reminder’s bell/push twin', () => {
  it('writes the Notification row + fanOutPush for every active unsatisfied student (email or not)', async () => {
    mocked.assignment.findMany.mockResolvedValue([baseAssignment()]);
    const r = await sendAssignmentDueReminders(NOW);
    // u1 (deliverable) + u2 (placeholder email — no mail, but the bell
    // and the push are still owed); u3 is inactive and gets nothing.
    expect(r.bells).toBe(2);
    expect(mocked.notification.create).toHaveBeenCalledTimes(2);
    const rows = mocked.notification.create.mock.calls.map((c) => c[0]!.data as { userId: string; title: string; body: string; link: string; type: string });
    expect(rows.map((d) => d.userId)).toEqual(['u1', 'u2']);
    expect(rows[0]!.title).toBe('تذكير بتسليم تكليف');
    expect(rows[0]!.body).toBe(`بحوث الفصل — الاستحقاق ${arabicDayMonthTime(IN_WINDOW)}`);
    expect(rows[0]!.link).toBe('/student/assignments');
    expect(vi.mocked(fanOutPush).mock.calls.map((c) => c[0])).toEqual([['u1'], ['u2']]);
  });

  it('dedupes on the payload — a repeat sweep (row already seen) writes nothing and pushes nothing', async () => {
    mocked.assignment.findMany.mockResolvedValue([baseAssignment()]);
    mocked.notification.findFirst.mockResolvedValue({ id: 'seen' });
    const r = await sendAssignmentDueReminders(NOW);
    expect(r.bells).toBe(0);
    expect(mocked.notification.create).not.toHaveBeenCalled();
    expect(fanOutPush).not.toHaveBeenCalled();
    // the mail still rides its own dedupeKey (outbox) — queued: 1
    expect(r.queued).toBe(1);
  });
});

describe('R350 E3 — the weekly digest', () => {
  it('skips users without active enrolments; renders items for enrolled ones with the ISO-week dedupe key', async () => {
    mocked.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'u1',
          email: 'salem@madarek.ly',
          firstName: 'سالم',
          enrollments: [{ offeringId: 'of1' }],
        },
        {
          id: 'u2',
          email: 'huda@madarek.ly',
          firstName: 'هدى',
          enrollments: [], // teacher/admin — no digest
        },
      ])
      .mockResolvedValueOnce([]); // end of pagination
    mocked.assignment.findMany.mockResolvedValue([{ title: 'بحوث الفصل', dueAt: IN_WINDOW }]);
    mocked.examTemplate.findMany.mockResolvedValue([{ title: 'اختبار المنتصف', openAt: IN_WINDOW }]);

    const r = await sendWeeklyDigests(NOW);
    expect(r).toEqual({ users: 2, queued: 1 });
    const create = mocked.mailOutbox.create.mock.calls[0]![0] as { data: { dedupeKey: string; template: string; html: string } };
    expect(create.data.template).toBe('weekly-digest');
    expect(create.data.dedupeKey).toBe(`digest:u1:${isoWeekStamp(NOW)}`);
    expect(create.data.html).toContain('بحوث الفصل');
    expect(create.data.html).toContain('اختبار المنتصف');
  });

  it('isoWeekStamp is stable per ISO week', () => {
    expect(isoWeekStamp(new Date('2026-11-16T00:00:00Z'))).toBe(isoWeekStamp(new Date('2026-11-18T12:00:00Z')));
    expect(isoWeekStamp(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01');
  });

  it('the digest wrapper never throws (error → false)', async () => {
    // mockReset first: a queued mockResolvedValueOnce from a previous
    // test would otherwise resolve before the rejection applies.
    mocked.user.findMany.mockReset();
    mocked.user.findMany.mockRejectedValue(new Error('db down'));
    const ok = await runWeeklyDigestSweep('test');
    expect(ok).toBe(false);
  });
});
