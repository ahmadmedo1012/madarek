/**
 * Backend unit test — r323 B1.1: the DB-backed cost-control helpers
 * (lib/ai/quota.ts) — day/month keys, the AI_DAILY_LIMIT_DEFAULT parse,
 * the daily ask-counter consumption (CAS roll-over + increment + limit
 * rejection) and the monthly budget write — all against a FAKE store
 * (DB-free house canon).
 */
import { describe, expect, it } from 'vitest';
import {
  AI_DAILY_LIMIT_DEFAULT,
  AI_DAILY_LIMIT_MAX,
  aiDayKey,
  aiMonthKey,
  consumeDailyAskQuota,
  parseAiDailyLimit,
  recordMonthlyUsage,
  type AiQuotaStore,
} from '../../src/lib/ai/quota.js';

// ─── Pure: keys + limit parse ──────────────────────────────────────

describe('aiDayKey / aiMonthKey (UTC keys)', () => {
  it('dayKey is YYYY-MM-DD on the UTC calendar', () => {
    // 23:30 UTC → the same UTC day regardless of any local TZ.
    expect(aiDayKey(new Date('2026-10-29T23:30:00Z'))).toBe('2026-10-29');
    expect(aiDayKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
  });

  it('monthKey is YYYY-MM (the budget row rolls over monthly)', () => {
    expect(aiMonthKey(new Date('2026-10-29T23:30:00Z'))).toBe('2026-10');
    expect(aiMonthKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
  });
});

describe('parseAiDailyLimit (defensive AI_DAILY_LIMIT_DEFAULT parse)', () => {
  it('undefined / garbage / zero / negative → the default 25', () => {
    for (const raw of [undefined, '', 'abc', '0', '-3']) {
      expect(parseAiDailyLimit(raw)).toBe(AI_DAILY_LIMIT_DEFAULT);
    }
  });

  it('parseInt truncation is acceptable for a leading-number paste (2.5.1 → 2)', () => {
    expect(parseAiDailyLimit('2.5.1')).toBe(2);
  });

  it('a valid value passes through; above the clamp it is capped', () => {
    expect(parseAiDailyLimit('10')).toBe(10);
    expect(parseAiDailyLimit('1')).toBe(1);
    expect(parseAiDailyLimit(String(AI_DAILY_LIMIT_MAX + 500))).toBe(AI_DAILY_LIMIT_MAX);
  });

  it('the default IS 25 (the mission spec) and the clamp is 1000', () => {
    expect(AI_DAILY_LIMIT_DEFAULT).toBe(25);
    expect(AI_DAILY_LIMIT_MAX).toBe(1000);
  });
});

// ─── consumeDailyAskQuota (fake store) ─────────────────────────────

/** A fake AiQuota store that behaves like the real single-row-per-user
 * table: upsert increments the (only) row, create seeds it. */
function fakeQuotaStore(seed: { dayKey: string; used: number } | null) {
  let row = seed;
  const updateManyCalls: Array<Record<string, unknown>> = [];
  const upsertCalls: Array<Record<string, unknown>> = [];
  const store: AiQuotaStore = {
    aiQuota: {
      async updateMany(args) {
        updateManyCalls.push(args as unknown as Record<string, unknown>);
        // Honor the WHERE clause like the real store: only a STALE-day
        // row is reset (dayKey ≠ the `not:` value).
        if (row && row.dayKey !== args.where.dayKey.not) {
          row = { ...row, dayKey: args.data.dayKey, used: args.data.used };
          return { count: 1 };
        }
        return { count: 0 };
      },
      async upsert(args) {
        upsertCalls.push(args as unknown as Record<string, unknown>);
        if (!row) row = { ...args.create };
        else row = { ...row, used: row.used + 1 };
        return { used: row.used };
      },
    },
  };
  return {
    store,
    row: () => row,
    updateManyCalls,
    upsertCalls,
  };
}

const NOW = new Date('2026-10-29T12:00:00Z');
const TODAY = '2026-10-29';

describe('consumeDailyAskQuota (fake store)', () => {
  it('a fresh user creates the row at used=1 and stays allowed', async () => {
    const fake = fakeQuotaStore(null);
    const state = await consumeDailyAskQuota(fake.store, 'u1', { now: NOW, limit: 25 });
    expect(state).toEqual({ allowed: true, used: 1, remaining: 24, limit: 25 });
    expect(fake.row()).toMatchObject({ userId: 'u1', dayKey: TODAY, used: 1 });
  });

  it('each ask increments the SAME-day row (used grows, remaining shrinks)', async () => {
    const fake = fakeQuotaStore({ dayKey: TODAY, used: 2 });
    const state = await consumeDailyAskQuota(fake.store, 'u1', { now: NOW, limit: 25 });
    expect(state.used).toBe(3);
    expect(state.remaining).toBe(22);
    expect(state.allowed).toBe(true);
  });

  it('a stale dayKey is CAS-reset to today BEFORE the increment (the roll-over)', async () => {
    const fake = fakeQuotaStore({ dayKey: '2026-10-28', used: 25 });
    const state = await consumeDailyAskQuota(fake.store, 'u1', { now: NOW, limit: 25 });
    // The reset wiped yesterday's counter: this ask is #1 of the new day.
    expect(state).toEqual({ allowed: true, used: 1, remaining: 24, limit: 25 });
    expect(fake.updateManyCalls[0]).toMatchObject({
      where: { userId: 'u1', dayKey: { not: TODAY } },
      data: { dayKey: TODAY, used: 0 },
    });
  });

  it('the ask that crosses the limit is REJECTED (used > limit → 429 upstream)', async () => {
    const fake = fakeQuotaStore({ dayKey: TODAY, used: 24 });
    const state = await consumeDailyAskQuota(fake.store, 'u1', { now: NOW, limit: 25 });
    expect(state.used).toBe(25);
    expect(state.allowed).toBe(true); // ask #25 is the last allowed one
    const next = await consumeDailyAskQuota(fake.store, 'u1', { now: NOW, limit: 25 });
    expect(next.used).toBe(26);
    expect(next.allowed).toBe(false);
    expect(next.remaining).toBe(0);
  });

  it('the limit defaults from the AI_DAILY_LIMIT_DEFAULT env when opts omit it', async () => {
    process.env.AI_DAILY_LIMIT_DEFAULT = '2';
    try {
      const fake = fakeQuotaStore({ dayKey: TODAY, used: 2 });
      const state = await consumeDailyAskQuota(fake.store, 'u1', { now: NOW });
      expect(state.used).toBe(3);
      expect(state.allowed).toBe(false);
      expect(state.limit).toBe(2);
    } finally {
      delete process.env.AI_DAILY_LIMIT_DEFAULT;
    }
  });
});

// ─── recordMonthlyUsage (fake store) ───────────────────────────────

/** The upsert argument shape, structurally — keeps the fake honest
 * without dragging prisma types into the test. */
interface BudgetUpsertArgs {
  where: { monthKey: string };
  create: { monthKey: string; usedTokens: number; estimatedCostMicros: number };
  update: { usedTokens: { increment: number } };
}

function fakeBudgetStore(upsertCalls: Array<Record<string, unknown>>) {
  return {
    aiBudget: {
      async upsert(args: BudgetUpsertArgs) {
        upsertCalls.push(args as unknown as Record<string, unknown>);
        return {};
      },
    },
  };
}

describe('recordMonthlyUsage (fake store)', () => {
  it('a fresh month creates the row with the REAL tokens (estimatedCostMicros stays the honest 0)', async () => {
    const upsertCalls: Array<Record<string, unknown>> = [];
    await recordMonthlyUsage(fakeBudgetStore(upsertCalls), 137, NOW);
    expect(upsertCalls[0]).toMatchObject({
      where: { monthKey: '2026-10' },
      create: { monthKey: '2026-10', usedTokens: 137, estimatedCostMicros: 0 },
      update: { usedTokens: { increment: 137 } },
    });
  });

  it('local mode records 0 tokens honestly (a real row of zeros, not a skipped write)', async () => {
    const upsertCalls: Array<Record<string, unknown>> = [];
    await recordMonthlyUsage(fakeBudgetStore(upsertCalls), 0, NOW);
    expect(upsertCalls[0]).toMatchObject({
      create: { usedTokens: 0, estimatedCostMicros: 0 },
      update: { usedTokens: { increment: 0 } },
    });
  });
});
