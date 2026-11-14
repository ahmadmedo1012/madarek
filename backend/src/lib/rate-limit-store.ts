/**
 * R351 X2c — the Postgres-backed rate-limit store.
 *
 * On a single long-lived process, express-rate-limit's memory store was
 * correct. Vercel Fluid runs CONCURRENT function instances (the X1
 * burst proved scale-out), so per-instance memory under-counts by the
 * instance count — exactly the brute-force weakening the r170c hardening
 * closed. This store moves the fixed-window counters into Postgres:
 *
 *   · one row per (limiter prefix : limiter key : window index);
 *   · incr = a single INSERT … ON CONFLICT DO UPDATE … RETURNING round
 *     trip (atomic; pooler-safe — no advisory locks, no sessions);
 *   · decrement = GREATEST(count-1, 0) (skipSuccessfulRequests calls it
 *     on every successful auth-limited request);
 *   · resetKey = drop every window row for that key (ban-unban etc.);
 *   · fail-OPEN with a throttled error log: if the DB is unreachable the
 *     API stays servable — the 429 layers are guards, not the product
 *     (the auth lockout table still hard-blocks brute force in the DB
 *     it shares with this store — fail-open here can never bypass that).
 *
 * Cost: one extra same-region round trip per limiter hit (~5-8 ms on
 * Neon fra1, measured in the X1 gate). RATE_LIMIT_STORE=memory restores
 * the old store globally (documented escape hatch for Neon-hours-critical
 * phases; never silent — the admin ops page will show which store runs).
 */
import type { Store } from 'express-rate-limit';

import { prisma } from '../db.js';
import { logger } from '../logger.js';

/** Structural slice (the pruneLoginEvents pattern — unit-testable). */
export interface RateLimitClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

export interface PrismaRateLimitStoreOptions {
  /** Limiter name — the row-key prefix ('global', 'auth', 'route', …). */
  prefix: string;
  /** Window length in ms (the fixed-window size). */
  windowMs: number;
}

/** How long a prune keeps rows beyond the largest window (15 min + 60 s
 *  factory windows ⇒ 25 h is generous dead-weight headroom). */
export const RATE_LIMIT_PRUNE_AFTER_MS = 25 * 3_600_000;

/** Fail-open log throttle: at most one error line per minute per store. */
const FAIL_OPEN_LOG_INTERVAL_MS = 60_000;

export class PrismaRateLimitStore implements Store {
  private readonly keyPrefix: string;
  private readonly windowMs: number;
  private readonly client: RateLimitClient;
  private lastFailOpenLogAt = 0;

  constructor(options: PrismaRateLimitStoreOptions, client: RateLimitClient = prisma) {
    this.keyPrefix = options.prefix;
    this.windowMs = options.windowMs;
    this.client = client;
  }

  private rowKey(key: string, now: number): { rowKey: string; windowIndex: number } {
    const windowIndex = Math.floor(now / this.windowMs);
    return { rowKey: `${this.keyPrefix}:${key}:${windowIndex}`, windowIndex };
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const { rowKey, windowIndex } = this.rowKey(key, now);
    try {
      const rows = await this.client.$queryRaw<Array<{ count: number }>>`
        INSERT INTO "RateLimitHit" ("key", "windowStart", "count", "updatedAt")
        VALUES (${rowKey}, ${new Date(windowIndex * this.windowMs)}, 1, now())
        ON CONFLICT ("key") DO UPDATE
          SET "count" = "RateLimitHit"."count" + 1, "updatedAt" = now()
        RETURNING "count"`;
      return {
        totalHits: rows[0]?.count ?? 1,
        resetTime: new Date((windowIndex + 1) * this.windowMs),
      };
    } catch (err) {
      this.failOpen(err, 'increment');
      return { totalHits: 0, resetTime: new Date(now + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    const { rowKey } = this.rowKey(key, Date.now());
    try {
      await this.client.$executeRaw`
        UPDATE "RateLimitHit" SET "count" = GREATEST("count" - 1, 0), "updatedAt" = now()
        WHERE "key" = ${rowKey}`;
    } catch (err) {
      this.failOpen(err, 'decrement');
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await this.client.$executeRaw`
        DELETE FROM "RateLimitHit" WHERE "key" LIKE ${`${this.keyPrefix}:${key}:%`}`;
    } catch (err) {
      this.failOpen(err, 'resetKey');
    }
  }

  private failOpen(err: unknown, op: string): void {
    const now = Date.now();
    if (now - this.lastFailOpenLogAt > FAIL_OPEN_LOG_INTERVAL_MS) {
      this.lastFailOpenLogAt = now;
      logger.error({ err, op, prefix: this.keyPrefix }, 'rate-limit-store: DB unavailable — failing OPEN (guards degraded, API stays up)');
    }
  }
}

/** The daily tick's prune: drop rows no window can read again. */
export async function pruneRateLimitHits(
  client: RateLimitClient = prisma,
  now: Date = new Date(),
): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - RATE_LIMIT_PRUNE_AFTER_MS);
  const deleted = await client.$executeRaw`
    DELETE FROM "RateLimitHit" WHERE "updatedAt" < ${cutoff}`;
  return { deleted };
}
