#!/usr/bin/env node
/**
 * Resilient `prisma migrate deploy` for Render → Neon.
 *
 * Two-URL strategy:
 *   - DATABASE_URL (runtime):  Neon **pooler** URL (PgBouncer) for live API traffic.
 *   - Migration URL:           Either DIRECT_DATABASE_URL (preferred when set)
 *                              OR the runtime pooler URL with `pgbouncer=true`
 *                              + `connection_limit=1` (works on Neon pooler).
 *
 * Why fallback to pooler?
 *   Neon's direct (non-pooled) endpoint may be unreachable in some configurations
 *   (suspended project, network policies, IP allow-list, certain plans).
 *   Prisma Migrate *can* run through PgBouncer on Neon as long as we set
 *   `connection_limit=1` so the migration gets a dedicated session that
 *   doesn't get reused mid-transaction. Without this fallback, deploys
 *   fail with "Can't reach database server" against the direct endpoint.
 *
 * Pipeline:
 *   1. Build a list of candidate migration URLs:
 *        a. DIRECT_DATABASE_URL (if set)
 *        b. Derived direct URL (strip `-pooler` + pgbouncer params)
 *        c. The original DATABASE_URL as-is (pooler, with pgbouncer=true + connection_limit=1)
 *   2. For each candidate, try `SELECT 1` to wake the DB.
 *      First one that succeeds wins.
 *   3. Run `prisma migrate deploy` against the winning URL.
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

// ─── URL candidates ──────────────────────────────────────────────
//   Build an ordered list of URLs to try for the migration step.
//   Each candidate carries a label so logs make it clear which one
//   worked (or which all failed).

function buildCandidates() {
  const runtimeUrl = process.env.DATABASE_URL?.trim();
  if (!runtimeUrl) {
    throw new Error('DATABASE_URL is required for database deployment.');
  }

  let runtimeParsed;
  try {
    runtimeParsed = new URL(runtimeUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }
  if (!/^postgres(?:ql)?:$/.test(runtimeParsed.protocol)) {
    throw new Error(
      `Unsupported DATABASE_URL protocol "${runtimeParsed.protocol}". Expected postgresql:// or postgres://.`,
    );
  }

  const candidates = [];

  // 1. DIRECT_DATABASE_URL — if the operator explicitly sets it, trust them.
  const configuredDirect = process.env.DIRECT_DATABASE_URL?.trim();
  if (configuredDirect) {
    candidates.push({ url: configuredDirect, label: 'DIRECT_DATABASE_URL' });
  }

  // 2. Derived direct URL — strip `-pooler` from hostname, drop pgbouncer params.
  //    Only meaningful if the runtime URL actually has `-pooler`.
  if (/-pooler\./.test(runtimeParsed.hostname)) {
    const derived = new URL(runtimeUrl);
    derived.hostname = derived.hostname.replace(/-pooler(?=\.|$)/, '');
    derived.searchParams.delete('pgbouncer');
    derived.searchParams.delete('connection_limit');
    derived.searchParams.delete('pool_timeout');
    candidates.push({ url: derived.toString(), label: 'derived direct (stripped -pooler)' });
  }

  // 3. Fall back: use the runtime pooler URL as-is, but force pgbouncer=true
  //    + connection_limit=1 so Prisma Migrate gets a dedicated session.
  //    This works on Neon because PgBouncer in transaction-pooling mode
  //    still allows DDL when connection_limit=1.
  const poolerFallback = new URL(runtimeUrl);
  poolerFallback.searchParams.set('pgbouncer', 'true');
  poolerFallback.searchParams.set('connection_limit', '1');
  // Also set `connect_timeout` so we fail fast if Neon is asleep.
  if (!poolerFallback.searchParams.has('connect_timeout')) {
    poolerFallback.searchParams.set('connect_timeout', '30');
  }
  candidates.push({ url: poolerFallback.toString(), label: 'pooler fallback (pgbouncer=true, connection_limit=1)' });

  return { runtimeUrl, candidates };
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

// ─── Probe a single candidate ──────────────────────────────────
//   Tries a `SELECT 1` against the candidate URL. Returns true on success.
//   Retries up to `wakeAttempts` times on transient errors.
//   Permanent errors fail immediately.

async function probeCandidate({ url, label }, { wakeAttempts = 5, delayMs = 4000 } = {}) {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });

  try {
    for (let i = 1; i <= wakeAttempts; i++) {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        log(`✅ ${label}: DB awake (attempt ${i}/${wakeAttempts})`);
        return true;
      } catch (err) {
        const cls = classifyError(err);
        log(`⏳ ${label}: wake attempt ${i}/${wakeAttempts} failed [${cls.kind}]: ${cls.message}`);
        if (cls.kind === 'permanent') {
          log(`⛔ ${label}: permanent error — skipping this candidate.`);
          return false;
        }
        if (i < wakeAttempts) {
          await sleep(delayMs);
        }
      }
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
  return false;
}

// ─── Run migrate ────────────────────────────────────────────────
//   Resolve the local Prisma CLI binary directly to avoid `npx`
//   overhead and network probes on every retry.
function resolvePrismaBinary() {
  const candidates = [
    path.resolve(__dirname, '..', 'node_modules', '.bin', 'prisma'),
    path.resolve(__dirname, '..', '..', 'node_modules', '.bin', 'prisma'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

async function runMigrate(targetUrl, label, { attempts = 3, delayMs = 5000, stepTimeoutMs = 180_000 } = {}) {
  const prismaBin = resolvePrismaBinary();
  const cmd = prismaBin
    ? [prismaBin, 'migrate', 'deploy']
    : ['prisma', 'migrate', 'deploy'];

  if (!prismaBin) {
    log('⚠️  Local prisma binary not found; falling back to `npx prisma`.');
  }

  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    log(`🚀 migrate deploy via ${label} (attempt ${i}/${attempts})`);
    try {
      execFileSync(cmd[0], cmd.slice(1), {
        stdio: 'inherit',
        timeout: stepTimeoutMs,
        env: {
          ...process.env,
          // Override DATABASE_URL ONLY for this child process.
          DATABASE_URL: targetUrl,
          // Prisma 5.x reads DIRECT_DATABASE_URL if set; point it at
          // the same URL so schema-level `directUrl` resolves correctly.
          DIRECT_DATABASE_URL: targetUrl,
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
    const { runtimeUrl, candidates } = buildCandidates();
    log(`runtime DB: ${redactUrl(runtimeUrl)}`);
    log(`trying ${candidates.length} candidate(s) for migration DB:`);
    for (const c of candidates) {
      log(`   • ${c.label}: ${redactUrl(c.url)}`);
    }

    // Probe each candidate in order. First that responds to SELECT 1 wins.
    let winner = null;
    for (const c of candidates) {
      log(`\n▶ probing ${c.label}...`);
      const ok = await probeCandidate(c);
      if (ok) {
        winner = c;
        break;
      }
    }

    if (!winner) {
      log('\n💥 None of the candidate URLs reached the database.');
      log('  This usually means:');
      log('   - Neon project is suspended (revive it in the Neon dashboard)');
      log('   - IP allow-list excludes Render\'s egress IP');
      log('   - DATABASE_URL points at the wrong host');
      log('   - Network connectivity issue between Render and Neon');
      process.exit(1);
    }

    log(`\n✅ selected migration DB: ${winner.label}`);
    await runMigrate(winner.url, winner.label);

    process.exit(0);
  } catch (err) {
    log('💥 deploy failed:', err?.message ?? err);
    process.exit(1);
  }
})();
