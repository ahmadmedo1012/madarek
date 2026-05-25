import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { prisma } from './db.js';
import { startScheduler, stopScheduler } from './scheduler.js';

async function main() {
  // Verify DB connectivity at boot — fail fast.
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.fatal({ err }, '❌ Failed to connect to database');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 ZU Platform API listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });

  // Start the daily university-data sync ticker
  startScheduler();
  logger.info('🗓️  Scheduler started (daily sync)');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down…');
    stopScheduler();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

void main();
