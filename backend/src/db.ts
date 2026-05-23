import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * Prisma client — single instance across the process.
 * In dev, hot-reload (tsx watch) can leak clients without the `globalThis` cache.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
