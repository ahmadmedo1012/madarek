import { Prisma, PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * Prisma client — single instance across the process.
 * In dev, hot-reload (tsx watch) can leak clients without the `globalThis` cache.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Prisma "known request error" codes that are transient connection problems:
 *   - P1017 — server closed the connection (Neon drops idle connections)
 *   - P1001 — can't reach the database server
 *   - P1002 — server reached, but timed out during the handshake
 * (Per the Prisma 5 error reference these are the connection-transient set.)
 */
const TRANSIENT_CONNECTION_CODES = new Set(['P1017', 'P1001', 'P1002']);

/**
 * Run a Prisma operation with one transparent retry on transient
 * connection errors. Neon's serverless Postgres occasionally drops idle
 * connections; Prisma surfaces those as P1017/P1001/P1002. The first retry
 * almost always succeeds.
 *
 * We deliberately do NOT `$disconnect()` / `$connect()` around the retry:
 * `prisma` is a process-wide singleton shared by every in-flight request,
 * so a forced disconnect would kill all of their queries and turn one
 * transient blip into a burst of failures (which could itself trigger
 * more retries → more disconnects). Prisma re-establishes the connection
 * lazily on the next query, so simply re-running the operation is enough.
 *
 * Important: we DON'T retry on:
 *   - P1003 (DB doesn't exist) — permanent, retrying wastes time
 *   - P1004 / P1010 (auth failures) — permanent
 *   - P2002 (unique violation) — application logic, not transient
 *   - P2025 (record not found) — application logic, not transient
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      retries > 0 &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      TRANSIENT_CONNECTION_CODES.has(err.code)
    ) {
      // The client reconnects itself on the next attempt.
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}
