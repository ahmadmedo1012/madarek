/**
 * lib/ai/quota.ts — r323 B1.1 DB-backed cost control for the AI
 * assistant (a sibling module of lib/ai.ts — lib/ai.ts itself stays
 * DB-free by contract, so the quota store lives here).
 *
 * Three tables (schema.prisma, r323 B1.1 migration):
 *  · AiQuota   — one row per USER: the CURRENT UTC day's ask counter
 *                (`dayKey` 'YYYY-MM-DD', `used`). The day roll-over is
 *                a CAS reset (updateMany where dayKey ≠ today → 0), so
 *                a row is never read-modify-written across statements.
 *  · AiBudget  — one row per MONTH: the platform-wide token counter
 *                (`monthKey` 'YYYY-MM', `usedTokens` from the
 *                provider's REAL usage block only — local mode adds 0;
 *                `estimatedCostMicros` stays 0 until a real price
 *                table exists — an honest zero, never fabricated).
 *  · AiFeedback — one rating per user per assistant answer (the route
 *                upserts; 1 helpful / -1 not helpful, SMALLINT).
 *
 * Daily limit: AI_DAILY_LIMIT_DEFAULT (default 25, clamp 1..1000).
 * Read straight from process.env here — env.ts is boot-frozen for the
 * known vars and this knob is route-level cost control; the parse is
 * defensive (a garbage value degrades to the default, never 0/unbounded).
 *
 * Pure helpers (day/month keys, limit parse) and the store-facing
 * functions are separated so tests pin the logic against a fake store
 * (no DB, house canon).
 */

/** The default per-user daily ask quota (the mission's 25). */
export const AI_DAILY_LIMIT_DEFAULT = 25;
/** Upper clamp — a fat-fingered paste must not open an unbounded tap. */
export const AI_DAILY_LIMIT_MAX = 1_000;
/** The env knob the operator sets (documented in .env.example / render.yaml). */
export const AI_DAILY_LIMIT_ENV = 'AI_DAILY_LIMIT_DEFAULT';

/** UTC day key — the backend's timezone model computes date keys on
 * the UTC calendar (lib/dates.ts canon; Render pins TZ=UTC). */
export function aiDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** UTC month key for the global budget counter. */
export function aiMonthKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** Parse AI_DAILY_LIMIT_DEFAULT defensively: non-numeric / < 1 → the
 * default; > 1000 → the clamp. Never throws, never returns 0. */
export function parseAiDailyLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return AI_DAILY_LIMIT_DEFAULT;
  return Math.min(n, AI_DAILY_LIMIT_MAX);
}

/** The quota state a chat turn rides (remaining = limit − used, floored
 * at 0; `allowed` false ⇒ the route rejects with 429 before any
 * provider call). */
export interface AiQuotaState {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
}

/**
 * The structural Prisma subset this module needs — the real client
 * satisfies it; tests pass a fake (DB-free canon).
 */
export interface AiQuotaStore {
  aiQuota: {
    updateMany(args: {
      where: { userId: string; dayKey: { not: string } };
      data: { dayKey: string; used: number };
    }): Promise<{ count: number }>;
    upsert(args: {
      where: { userId: string };
      create: { userId: string; dayKey: string; used: number };
      update: { used: { increment: number } };
    }): Promise<{ used: number }>;
  };
}

/**
 * Consume ONE ask from the caller's daily quota: reset a stale-day row
 * (CAS), upsert-increment the counter, then judge. The increment
 * happens BEFORE the judgment — each accepted ASK counts (a rejected
 * over-limit attempt also consumed its increment; the row resets at
 * the UTC boundary). Concurrent asks can overshoot by one — the cost
 * of staying race-free without a serializable transaction on a
 * single-row counter.
 */
export async function consumeDailyAskQuota(
  store: AiQuotaStore,
  userId: string,
  opts?: { now?: Date; limit?: number },
): Promise<AiQuotaState> {
  const limit = opts?.limit ?? parseAiDailyLimit(process.env[AI_DAILY_LIMIT_ENV]);
  const today = aiDayKey(opts?.now);
  // Yesterday's counter must not leak into today (the row is per-USER,
  // the day is a column — this CAS reset is the roll-over).
  await store.aiQuota.updateMany({
    where: { userId, dayKey: { not: today } },
    data: { dayKey: today, used: 0 },
  });
  const row = await store.aiQuota.upsert({
    where: { userId },
    create: { userId, dayKey: today, used: 1 },
    update: { used: { increment: 1 } },
  });
  const used = row.used;
  return { allowed: used <= limit, used, remaining: Math.max(0, limit - used), limit };
}

/** The structural Prisma subset for the monthly budget counter. */
export interface AiBudgetStore {
  aiBudget: {
    upsert(args: {
      where: { monthKey: string };
      create: { monthKey: string; usedTokens: number; estimatedCostMicros: number };
      update: { usedTokens: { increment: number } };
    }): Promise<unknown>;
  };
}

/**
 * Record one turn's REAL token usage into the month's budget row
 * (inputTokens + outputTokens from the provider's usage block — 0 in
 * local mode; the row is created with honest zeros either way).
 * estimatedCostMicros stays 0: there is no price table yet, and an
 * estimate would be fabrication (the same ruling as token counts).
 */
export async function recordMonthlyUsage(
  store: AiBudgetStore,
  tokens: number,
  now: Date = new Date(),
): Promise<void> {
  const monthKey = aiMonthKey(now);
  await store.aiBudget.upsert({
    where: { monthKey },
    create: { monthKey, usedTokens: tokens, estimatedCostMicros: 0 },
    update: { usedTokens: { increment: tokens } },
  });
}
