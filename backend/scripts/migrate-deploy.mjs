#!/usr/bin/env node
/**
 * Resilient `prisma migrate deploy` for Render → Neon.
 *
 * Why this exists: Neon's pooler can take 5-15s to wake from idle.
 * `prisma migrate deploy` immediately tries to acquire a Postgres
 * advisory lock with a 10s timeout — which fails (P1002) if the
 * pooler hasn't opened a backend yet. We've hit this twice locally.
 *
 * This script:
 *   1. Wakes the DB with a cheap SELECT 1 (up to 6 attempts × 5s)
 *   2. Runs `prisma migrate deploy` (up to 3 attempts × 7s)
 *   3. Exits non-zero only if every attempt fails
 *
 * Both phases retry on transient errors. Idempotent — once migrations
 * are applied, subsequent runs are a no-op.
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log('[migrate-deploy]', ...args);

async function wakeDb({ attempts = 6, delayMs = 5000 } = {}) {
  const prisma = new PrismaClient();
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      log(`✅ DB awake (attempt ${i}/${attempts})`);
      await prisma.$disconnect();
      return;
    } catch (err) {
      lastErr = err;
      log(`⏳ wake attempt ${i}/${attempts} failed: ${err?.message ?? err}`);
      if (i < attempts) await sleep(delayMs);
    }
  }
  await prisma.$disconnect().catch(() => {});
  throw lastErr;
}

async function runMigrate({ attempts = 3, delayMs = 7000 } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      log(`🚀 migrate deploy (attempt ${i}/${attempts})`);
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env },
      });
      log('✅ migrations applied');
      return;
    } catch (err) {
      lastErr = err;
      log(`❌ migrate attempt ${i}/${attempts} failed (status ${err?.status ?? '—'})`);
      if (i < attempts) {
        log(`   retrying in ${delayMs / 1000}s...`);
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

(async () => {
  try {
    await wakeDb();
    await runMigrate();
    process.exit(0);
  } catch (err) {
    log('💥 deploy failed:', err?.message ?? err);
    process.exit(1);
  }
})();
