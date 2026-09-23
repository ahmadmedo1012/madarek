#!/usr/bin/env node
/**
 * Resilient `prisma migrate deploy` for Render → Neon.
 *
 * Neon exposes pooled (`-pooler`) and direct PostgreSQL endpoints.
 * Prisma Client should use the pooled endpoint at runtime, while
 * Prisma Migrate should use the direct endpoint. Render only needs
 * DATABASE_URL: when it points at a Neon pooler, this script derives
 * the corresponding direct URL for the migration phase.
 *
 * This script:
 *   1. Resolves a direct Neon URL from DIRECT_DATABASE_URL (optional)
 *      or derives it from DATABASE_URL by removing the `-pooler` suffix.
 *   2. Wakes the database with a cheap SELECT 1 (up to 18 attempts × 8s).
 *   3. Runs `prisma migrate deploy` (up to 4 attempts × 10s) using
 *      the direct URL only for this build-time migration process.
 *   4. Exits non-zero only if every attempt fails.
 *
 * The running application still receives the original DATABASE_URL.
 * Idempotent — once migrations are applied, subsequent runs are a no-op.
 */

import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log('[migrate-deploy]', ...args);

function resolveDatabaseUrls() {
  const runtimeUrl = process.env.DATABASE_URL?.trim();
  const configuredDirectUrl = process.env.DIRECT_DATABASE_URL?.trim();

  if (!runtimeUrl) {
    throw new Error('DATABASE_URL is required for database deployment.');
  }

  if (configuredDirectUrl) {
    return {
      runtimeUrl,
      directUrl: configuredDirectUrl,
      source: 'DIRECT_DATABASE_URL',
    };
  }

  let url;

  try {
    url = new URL(runtimeUrl);
  } catch {
    throw new Error(
      'DATABASE_URL is not a valid PostgreSQL connection URL.',
    );
  }

  if (!/^postgres(?:ql)?:$/.test(url.protocol)) {
    throw new Error(
      `Unsupported DATABASE_URL protocol "${url.protocol}". Expected postgresql:// or postgres://.`,
    );
  }

  // Neon pooled endpoints use the "-pooler" suffix in the hostname.
  // When the URL is already direct, this is a no-op.
  url.hostname = url.hostname.replace(/-pooler(?=\.|$)/, '');

  // PgBouncer-specific settings should not be carried into a
  // direct Prisma Migrate connection.
  url.searchParams.delete('pgbouncer');

  return {
    runtimeUrl,
    directUrl: url.toString(),
    source: 'derived from DATABASE_URL',
  };
}

function redactUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    if (url.password) {
      url.password = '***';
    }

    if (url.username) {
      url.username = '***';
    }

    return url.toString();
  } catch {
    return '<invalid-url>';
  }
}

async function wakeDb(
  directUrl,
  { attempts = 18, delayMs = 8000 } = {},
) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
  });

  let lastErr;

  try {
    for (let i = 1; i <= attempts; i++) {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');

        log(`✅ DB awake (attempt ${i}/${attempts})`);
        return;
      } catch (err) {
        lastErr = err;

        log(
          `⏳ wake attempt ${i}/${attempts} failed: ${
            err?.message ?? err
          }`,
        );

        if (i < attempts) {
          await sleep(delayMs);
        }
      }
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  throw lastErr;
}

async function runMigrate(
  directUrl,
  { attempts = 4, delayMs = 10000 } = {},
) {
  let lastErr;

  for (let i = 1; i <= attempts; i++) {
    try {
      log(`🚀 migrate deploy (attempt ${i}/${attempts})`);

      // Prisma reads the datasource URL from DATABASE_URL.
      // Override it only inside this child process so migrations
      // use the direct Neon endpoint.
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: directUrl,
        },
      });

      log('✅ migrations applied');
      return;
    } catch (err) {
      lastErr = err;

      log(
        `❌ migrate attempt ${i}/${attempts} failed (status ${
          err?.status ?? '—'
        })`,
      );

      if (i < attempts) {
        log(
          `   retrying in ${delayMs / 1000}s...`,
        );

        await sleep(delayMs);
      }
    }
  }

  throw lastErr;
}

(async () => {
  try {
    const {
      runtimeUrl,
      directUrl,
      source,
    } = resolveDatabaseUrls();

    log(`runtime DB: ${redactUrl(runtimeUrl)}`);
    log(
      `migration DB: ${redactUrl(directUrl)} (${source})`,
    );

    await wakeDb(directUrl);
    await runMigrate(directUrl);

    // Keep the parent process environment unchanged.
    // Render continues using the original pooled DATABASE_URL
    // for the running application.
    process.exit(0);
  } catch (err) {
    log(
      '💥 deploy failed:',
      err?.message ?? err,
    );

    process.exit(1);
  }
})();
