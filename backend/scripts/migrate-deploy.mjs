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
 * Pipeline:
 *   1. Resolve a direct Neon URL from DIRECT_DATABASE_URL (optional)
 *      or derive it from DATABASE_URL by stripping the `-pooler`
 *      hostname suffix + the `pgbouncer` / `connection_limit`
 *      query params (PgBouncer-specific, unsafe for direct connections).
 *   2. Wake the database with a cheap SELECT 1, retrying only on
 *      transient errors. Permanent failures (DNS, auth, refused)
 *      fail fast — no point retrying those.
 *   3. Run `prisma migrate deploy` against the direct URL.
 *      A spawn timeout guards against Neon TCP hangs.
 *
 * The running application still receives the original DATABASE_URL —
 * we never mutate `process.env` in the parent process.
 * Idempotent: once migrations are applied, subsequent runs are a no-op.
 */

import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log('[migrate-deploy]', ...args);

// ─── URL resolution ────────────────────────────────────────────
//   Neon pooled endpoints:   ep-<name>-pooler.region.aws.neon.tech
//   Neon direct endpoints:   ep-<name>.region.aws.neon.tech
//
//   The `-pooler` token sits between the endpoint slug and the
//   region, always followed by `.` (Neon's hostname grammar never
//   allows it to be at the end of the FQDN).

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
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }

  if (!/^postgres(?:ql)?:$/.test(url.protocol)) {
    throw new Error(
      `Unsupported DATABASE_URL protocol "${url.protocol}". Expected postgresql:// or postgres://.`,
    );
  }

  // Only strip `-pooler` when it's clearly the Neon pooler suffix
  // (preceded by anything, followed by `.` or end of hostname).
  // A non-Neon hostname without `-pooler` is a no-op.
  url.hostname = url.hostname.replace(/-pooler(?=\.|$)/, '');

  // PgBouncer-specific params must not be carried into a direct
  // Prisma Migrate connection — Prisma needs its own pool.
  // `connection_limit` is interpreted by PgBouncer only and is
  // meaningless (and at worst confusing) for a direct connection.
  url.searchParams.delete('pgbouncer');
  url.searchParams.delete('connection_limit');
  // `pool_timeout` is also PgBouncer-only.
  url.searchParams.delete('pool_timeout');

  return {
    runtimeUrl,
    directUrl: url.toString(),
    source: 'derived from DATABASE_URL',
  };
}

function redactUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.password) url.password = '***';
    if (url.username) url.username = '***';
    return url.toString();
  } catch {
    return '<invalid-url>';
  }
}

// ─── Error classification ──────────────────────────────────────
//   Only retry on transient / likely-recoverable failures.
//   Permanent failures (auth, DNS, refused, SSL config) fail-fast
//   so Render doesn't burn minutes retrying something that will
//   never succeed.

// Prisma P-codes (subset relevant to connect / wake):
//   P1001 = "Can't reach database server" — network/DNS/refused/hang
//   P1002 = Timed out — transient
//   P1003 = Database doesn't exist — permanent
//   P1004 = Database access denied — permanent (auth)
//   P1010 = Access denied — permanent (auth)
//   P1017 = Server closed the connection — transient
//   P1018 = Internal Client timeout — transient
const PERMANENT_PRISMA_CODES = new Set(['P1003', 'P1004', 'P1010']);
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P1018']);

const PERMANENT_ERROR_PATTERNS = [
  /password authentication failed/i,
  /no password supplied/i,
  /database .* does not exist/i,
  /role .* does not exist/i,
  /SSL connection.*required/i,         // misconfigured TLS
  /certificate verify failed/i,
  /hostname\/IP does not match certificate/i,
];

const TRANSIENT_ERROR_PATTERNS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /EPIPE/i,
  /EAI_AGAIN/i,           // temporary DNS failure
  /server closed the connection unexpectedly/i,
  /terminating connection/i,
  /connection.*timed out/i,
];

function classifyError(err) {
  // First: explicit Prisma P-codes (these are authoritative).
  if (err?.code && typeof err.code === 'string') {
    if (PERMANENT_PRISMA_CODES.has(err.code)) {
      return { kind: 'permanent', message: `[${err.code}] ${err.message ?? ''}` };
    }
    if (TRANSIENT_PRISMA_CODES.has(err.code)) {
      return { kind: 'transient', message: `[${err.code}] ${err.message ?? ''}` };
    }
  }

  // Then: underlying socket / OS errors via message pattern.
  const msg = String(err?.message ?? err?.toString?.() ?? err);
  if (PERMANENT_ERROR_PATTERNS.some((p) => p.test(msg))) {
    return { kind: 'permanent', message: msg };
  }
  if (TRANSIENT_ERROR_PATTERNS.some((p) => p.test(msg))) {
    return { kind: 'transient', message: msg };
  }

  // P1001 with a localhost / loopback hostname is permanent: the user
  // almost certainly has a misconfigured DATABASE_URL. Retrying wastes
  // minutes. On Neon / managed Postgres, P1001 is treated as transient
  // (cold-start wake-up).
  if (/can't reach database server/i.test(msg)) {
    // Message looks like: "Can't reach database server at `localhost:5432`"
    // Strip non-alphanumerics (backticks, brackets) before matching.
    const hostMatch = msg.match(/at\s+[`'"]?(.+?):(\d+)[`'"]?/);
    if (hostMatch) {
      const host = hostMatch[1].replace(/[`'"\[\]]/g, '');
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host)) {
        return { kind: 'permanent', message: `${msg} (loopback host — config error, will not retry)` };
      }
    }
    return { kind: 'transient', message: msg };
  }

  // Unknown error — be conservative: treat as transient so we retry
  // before giving up. Neon cold-start quirks sometimes surface as
  // exotic errors that resolve on retry.
  return { kind: 'transient', message: msg };
}

// ─── Wake DB ────────────────────────────────────────────────────
async function wakeDb(directUrl, { attempts = 18, delayMs = 8000 } = {}) {
  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
    log: ['error'],
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
        const cls = classifyError(err);
        log(`⏳ wake attempt ${i}/${attempts} failed [${cls.kind}]: ${cls.message}`);

        if (cls.kind === 'permanent') {
          // No point retrying — fail immediately.
          log('⛔ Permanent DB error — aborting wake loop.');
          throw err;
        }
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

// ─── Run migrate ────────────────────────────────────────────────
//   Resolve the local Prisma CLI binary directly to avoid `npx`
//   overhead and network probes on every retry.
function resolvePrismaBinary() {
  // Look upward from this script for the workspace's prisma CLI.
  // backend/scripts/migrate-deploy.mjs → backend/node_modules/.bin/prisma
  //                                 →  ../../node_modules/.bin/prisma (workspace root)
  const candidates = [
    path.resolve(__dirname, '..', 'node_modules', '.bin', 'prisma'),
    path.resolve(__dirname, '..', '..', 'node_modules', '.bin', 'prisma'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

async function runMigrate(directUrl, { attempts = 4, delayMs = 10000, stepTimeoutMs = 120_000 } = {}) {
  const prismaBin = resolvePrismaBinary();
  const cmd = prismaBin
    ? [prismaBin, 'migrate', 'deploy']
    : ['prisma', 'migrate', 'deploy'];

  if (!prismaBin) {
    log('⚠️  Local prisma binary not found; falling back to `npx prisma`.');
  }

  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    log(`🚀 migrate deploy (attempt ${i}/${attempts})`);
    try {
      // execFileSync with timeout — if Prisma hangs (Neon TCP stall),
      // we abort and can retry instead of hanging the whole build.
      execFileSync(cmd[0], cmd.slice(1), {
        stdio: 'inherit',
        timeout: stepTimeoutMs,
        env: {
          ...process.env,
          // Override DATABASE_URL ONLY for this child process.
          DATABASE_URL: directUrl,
          // Prisma 5.x reads `DIRECT_DATABASE_URL` if set; clear it
          // so it doesn't override our resolved direct URL.
          DIRECT_DATABASE_URL: directUrl,
        },
      });
      log('✅ migrations applied');
      return;
    } catch (err) {
      lastErr = err;
      const cls = classifyError(err);
      log(`❌ migrate attempt ${i}/${attempts} failed [${cls.kind}]: ${cls.message}`);

      if (cls.kind === 'permanent') {
        log('⛔ Permanent migration error — aborting retry loop.');
        throw err;
      }
      if (i < attempts) {
        log(`   retrying in ${delayMs / 1000}s...`);
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

// ─── Main ───────────────────────────────────────────────────────
(async () => {
  try {
    const { runtimeUrl, directUrl, source } = resolveDatabaseUrls();
    log(`runtime DB: ${redactUrl(runtimeUrl)}`);
    log(`migration DB: ${redactUrl(directUrl)} (${source})`);

    await wakeDb(directUrl);
    await runMigrate(directUrl);

    process.exit(0);
  } catch (err) {
    log('💥 deploy failed:', err?.message ?? err);
    process.exit(1);
  }
})();
