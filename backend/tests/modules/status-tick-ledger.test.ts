/**
 * R352 K4 — GET /api/v1/status carries the tick ledger freshness.
 *
 * The tick-watch workflow (and any operator) answers «when did the
 * platform last tick?» from status.tick.fastAt; a forced tick's effect
 * must be observable on the next read. This suite pins:
 *   - the three slot timestamps surface as ISO strings,
 *   - a missing row degrades to null (never throws, never blocks the
 *     rest of the status body),
 *   - a ledger read failure (timeout/error) degrades the whole tick
 *     field to nulls — the route still answers 200 with db/buildId.
 *
 * DB-free: prisma is mocked (the catalog-faculties-public pattern);
 * $queryRaw (the SELECT 1) and tickRun.findMany are the only reaches.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('../../src/db.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    tickRun: { findMany: vi.fn() },
  },
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
});

const get = () => fetch(`${baseUrl}/api/v1/status`);

describe('GET /api/v1/status — the tick ledger field (R352 K4)', () => {
  it('surfaces the three slot timestamps as ISO strings', async () => {
    vi.mocked(prisma.tickRun.findMany).mockResolvedValue([
      { key: 'tick', lastRunAt: new Date('2026-11-14T12:00:00Z') },
      { key: 'tick-daily', lastRunAt: new Date('2026-11-14T06:00:00Z') },
      { key: 'tick-weekly', lastRunAt: new Date('2026-11-08T06:00:00Z') },
    ] as never);

    const res = await get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { tick: Record<string, string | null> } };
    expect(body.data.tick).toEqual({
      fastAt: '2026-11-14T12:00:00.000Z',
      dailyAt: '2026-11-14T06:00:00.000Z',
      weeklyAt: '2026-11-08T06:00:00.000Z',
    });
  });

  it('degrades a missing slot row to null (never throws)', async () => {
    vi.mocked(prisma.tickRun.findMany).mockResolvedValue([
      { key: 'tick', lastRunAt: new Date('2026-11-14T12:00:00Z') },
    ] as never);

    const res = await get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { tick: Record<string, string | null> } };
    expect(body.data.tick).toEqual({
      fastAt: '2026-11-14T12:00:00.000Z',
      dailyAt: null,
      weeklyAt: null,
    });
  });

  it('a ledger read failure still answers 200 with the tick field nulled', async () => {
    vi.mocked(prisma.tickRun.findMany).mockRejectedValue(new Error('tick status timeout'));

    const res = await get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ok: boolean; tick: Record<string, string | null> } };
    expect(body.data.ok).toBe(true);
    expect(body.data.tick).toEqual({ fastAt: null, dailyAt: null, weeklyAt: null });
  });
});
