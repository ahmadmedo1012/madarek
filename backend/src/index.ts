import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { prisma } from './db.js';
import { startScheduler, stopScheduler } from './scheduler.js';

/**
 * Graceful-shutdown horizon. server.close() can stay pending forever on a
 * hung keep-alive socket; the platform (Render) escalates from SIGTERM to
 * SIGKILL shortly after — force-exit before that happens.
 */
const SHUTDOWN_FORCE_EXIT_MS = 10_000;

async function main() {
  // Seatbelt (11-a P2-16b): the two JWT secrets must differ. Token
  // type-confusion is additionally blocked by payload type claims, but
  // identical secrets still collapse the access/refresh trust boundary.
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    logger.warn('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical — generate two different secrets');
  }

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

  let shutdownStarted = false;
  const shutdown = (signal: string) => {
    // A second signal during the drain changes nothing — the force-exit
    // fallback below is already armed.
    if (shutdownStarted) return;
    shutdownStarted = true;
    logger.info({ signal }, 'Shutting down…');
    stopScheduler();

    // Stop accepting new connections and drop idle keep-alive sockets so
    // close() only waits for genuinely in-flight requests.
    server.close(() => {
      // A failing $disconnect must not swallow the exit path (11-a
      // P2-15): once HTTP has drained, exit cleanly either way.
      prisma
        .$disconnect()
        .catch((err) => logger.error({ err }, 'Prisma $disconnect failed during shutdown'))
        .finally(() => process.exit(0));
    });
    server.closeIdleConnections();

    const forceExit = setTimeout(() => {
      logger.warn('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_FORCE_EXIT_MS);
    forceExit.unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  // Deliberate log-don't-exit: a stray fire-and-forget rejection (e.g. a
  // telemetry write) must not become a full outage. If a rejection ever
  // indicates real state corruption, revisit this policy.
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

void main();
