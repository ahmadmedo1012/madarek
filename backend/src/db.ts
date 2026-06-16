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
 * Run a Prisma operation with one transparent retry on transient
 * connection errors. Neon's serverless Postgres occasionally drops idle
 * connections; Prisma surfaces those as P1017/P1001/P1002. The first retry
 * reopens the connection and almost always succeeds.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      retries > 0 &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === 'P1017' || err.code === 'P1001' || err.code === 'P1002')
    ) {
      // Force a reconnect and retry once.
      await prisma.$disconnect();
      await prisma.$connect();
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}
