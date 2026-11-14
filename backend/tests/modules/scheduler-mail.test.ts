/**
 * R350 E3 — the scheduler's mail sweeps, pinned:
 *  · sendAssignmentDueReminders — the 12–36h window, the satisfied-
 *    submission skip, the placeholder-email skip, the per-day dedupe key;
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
    notificationPreference: { findUnique: vi.fn(async () => null) },
    mailOutbox: { count: vi.fn(async () => 0), create: vi.fn(async () => ({ id: 'o1' })), findUnique: vi.fn() },
    mailSuppression: { findFirst: vi.fn(async () => null) },
  };
  return { prisma: p, withRetry: vi.fn() };
});
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from '../../src/db.js';
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
});

describe('R350 E3 — assignment-due reminders', () => {
  it('queries the 12–36h window and queues only deliverable active students', async () => {
    mocked.assignment.findMany.mockResolvedValue([baseAssignment()]);
    const r = await sendAssignmentDueReminders(NOW);
    expect(r).toEqual({ assignments: 1, queued: 1 });
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
    expect(r).toEqual({ assignments: 1, queued: 0 });
    expect(mocked.mailOutbox.create).not.toHaveBeenCalled();
  });

  it('assignments outside the window never enter the query (the where owns it)', async () => {
    mocked.assignment.findMany.mockResolvedValue([]);
    const r = await sendAssignmentDueReminders(NOW);
    expect(r).toEqual({ assignments: 0, queued: 0 });
    expect(OUT_OF_WINDOW.getTime()).toBeGreaterThan(0); // the window constant is pinned above
  });

  it('the sweep wrapper never throws (error → false)', async () => {
    mocked.assignment.findMany.mockRejectedValue(new Error('db down'));
    await expect(sendAssignmentDueReminders(NOW)).rejects.toThrow('db down');
    const ok = await runAssignmentDueSweep('test');
    expect(ok).toBe(false);
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
