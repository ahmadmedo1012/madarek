/**
 * R351 X2b — the tick core, unit-tested without a database (the
 * pruneLoginEvents pattern: a structural client fake + injected jobs).
 *
 * Pins:
 *  · the CAS claim — exactly one winner per window, pooler-safe;
 *  · the P2002 race on first-ever create (loser still loses the CAS);
 *  · real DB errors from create FAIL the tick (never silently skip);
 *  · runTick runs only claimed slots, records durations/summaries,
 *    survives a throwing job, and never rejects.
 */
import { describe, it, expect, vi } from 'vitest';

import { claimTickSlot, runTick, TICK_SLOTS, type TickClient, type TickJobs } from '../../src/lib/tick.js';

interface Row {
  lastRunAt: Date;
}

/** In-memory TickRun table implementing exactly the claim's contract. */
function makeClient(rows: Record<string, Row> = {}) {
  const create = vi.fn(async ({ data }: { data: { key: string; lastRunAt: Date } }) => {
    if (data.key in rows) {
      const err = new Error('Unique constraint failed');
      (err as { code?: string }).code = 'P2002';
      throw err;
    }
    rows[data.key] = { lastRunAt: data.lastRunAt };
    return { key: data.key };
  });
  const updateMany = vi.fn(
    async ({
      where,
      data,
    }: {
      where: { key: string; lastRunAt: { lt: Date } };
      data: { lastRunAt: Date };
    }) => {
      const row = rows[where.key];
      if (!row || !(row.lastRunAt < where.lastRunAt.lt)) return { count: 0 };
      row.lastRunAt = data.lastRunAt;
      return { count: 1 };
    },
  );
  const update = vi.fn(async () => ({}));
  return { client: { tickRun: { create, updateMany, update } } as unknown as TickClient, create, updateMany, update, rows };
}

describe('claimTickSlot', () => {
  it('first claim wins (lazy create + CAS)', async () => {
    const { client } = makeClient();
    const now = new Date('2026-11-14T10:00:00Z');
    await expect(claimTickSlot(client, 'tick', TICK_SLOTS.tick, now)).resolves.toBe(true);
  });

  it('a second claim inside the window skips', async () => {
    const { client } = makeClient();
    const t0 = new Date('2026-11-14T10:00:00Z');
    await claimTickSlot(client, 'tick', TICK_SLOTS.tick, t0);
    await expect(claimTickSlot(client, 'tick', TICK_SLOTS.tick, new Date(t0.getTime() + 10_000))).resolves.toBe(false);
  });

  it('a claim after the window elapses wins again', async () => {
    const { client } = makeClient();
    const t0 = new Date('2026-11-14T10:00:00Z');
    await claimTickSlot(client, 'tick', TICK_SLOTS.tick, t0);
    await expect(
      claimTickSlot(client, 'tick', TICK_SLOTS.tick, new Date(t0.getTime() + TICK_SLOTS.tick + 1_000)),
    ).resolves.toBe(true);
  });

  it('the P2002 race on the lazy create still decides via the CAS', async () => {
    const { client } = makeClient({ tick: { lastRunAt: new Date('2026-11-14T09:00:00Z') } });
    // Row pre-exists → create throws P2002 → the CAS still matches the
    // stale lastRunAt → this claimer wins.
    await expect(claimTickSlot(client, 'tick', TICK_SLOTS.tick, new Date('2026-11-14T10:00:00Z'))).resolves.toBe(true);
  });

  it('a real DB error on create rejects (never a silent skip)', async () => {
    const client = {
      tickRun: {
        create: vi.fn(async () => {
          throw new Error('connection refused');
        }),
        updateMany: vi.fn(async () => ({ count: 0 })),
        update: vi.fn(async () => ({})),
      },
    } as unknown as TickClient;
    await expect(claimTickSlot(client, 'tick', TICK_SLOTS.tick)).rejects.toThrow('connection refused');
  });
});

describe('runTick', () => {
  const jobs = (impl: Partial<TickJobs> = {}): TickJobs => ({
    tick: impl.tick ?? vi.fn(async () => ({ picked: 0 })),
    'tick-daily': impl['tick-daily'] ?? vi.fn(async () => ({ daily: true })),
    'tick-weekly': impl['tick-weekly'] ?? vi.fn(async () => ({ weekly: true })),
  });

  it('runs only claimed slots and stamps duration + summary', async () => {
    const { client, update } = makeClient({
      // Only the fast slot is due; daily/weekly ran recently.
      tick: { lastRunAt: new Date('2026-11-14T09:00:00Z') },
      'tick-daily': { lastRunAt: new Date('2026-11-14T09:59:00Z') },
      'tick-weekly': { lastRunAt: new Date('2026-11-14T09:59:00Z') },
    });
    const j = jobs({ tick: vi.fn(async () => ({ picked: 3, sent: 3 })) });
    const report = await runTick(client, j, 'test', new Date('2026-11-14T10:00:00Z'));

    const tickSlot = report.slots.find((s) => s.key === 'tick')!;
    expect(tickSlot.ran).toBe(true);
    expect(tickSlot.summary).toEqual({ picked: 3, sent: 3 });
    expect(typeof tickSlot.durationMs).toBe('number');
    expect(report.slots.find((s) => s.key === 'tick-daily')!.ran).toBe(false);
    expect(report.slots.find((s) => s.key === 'tick-weekly')!.ran).toBe(false);
    expect(j['tick-daily']).not.toHaveBeenCalled();
    // The diagnostics stamp recorded the summary of the winning slot.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'tick' }, data: expect.objectContaining({ lastSummary: { picked: 3, sent: 3 } }) }),
    );
  });

  it('a throwing job records the error and never rejects the tick', async () => {
    const { client } = makeClient({
      tick: { lastRunAt: new Date('2026-11-14T09:00:00Z') },
      'tick-daily': { lastRunAt: new Date('2026-11-13T00:00:00Z') },
      'tick-weekly': { lastRunAt: new Date('2026-11-01T00:00:00Z') },
    });
    const j = jobs({
      tick: vi.fn(async () => {
        throw new Error('drain exploded');
      }),
    });
    const report = await runTick(client, j, 'test', new Date('2026-11-14T10:00:00Z'));
    const tickSlot = report.slots.find((s) => s.key === 'tick')!;
    expect(tickSlot.ran).toBe(true);
    expect(tickSlot.error).toBe('drain exploded');
    // The other slots still ran.
    expect(report.slots.find((s) => s.key === 'tick-daily')!.ran).toBe(true);
    expect(report.slots.find((s) => s.key === 'tick-weekly')!.ran).toBe(true);
  });

  it('records a claim failure without rejecting', async () => {
    const client = {
      tickRun: {
        create: vi.fn(async () => {
          throw new Error('db down');
        }),
        updateMany: vi.fn(async () => ({ count: 0 })),
        update: vi.fn(async () => ({})),
      },
    } as unknown as TickClient;
    const report = await runTick(client, jobs(), 'test');
    expect(report.slots.every((s) => s.error === 'claim-failed' && !s.ran)).toBe(true);
  });
});
