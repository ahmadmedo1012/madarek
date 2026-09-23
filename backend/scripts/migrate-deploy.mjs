#!/usr/bin/env node
/**
 * Resilient `prisma migrate deploy` for Render → Neon.
 *
 * Two-URL strategy:
 *   - DATABASE_URL (runtime):  Neon pooler URL (PgBouncer) for live API traffic.
 *   - Migration URL:            Either DIRECT_DATABASE_URL (preferred when set)
 *                              OR the runtime pooler URL with `pgbouncer=true`
 *                              + `connection_limit=1`.
 *
 * Pipeline:
 *   1. Build candidate URL list (DIRECT_DATABASE_URL, derived direct, pooler fallback).
 *   2. For each candidate:
 *        a. DNS lookup (log resolved IPs).
 *        b. Raw TCP connect test (log success / failure + error).
 *        c. Try `SELECT 1` up to 8 times (5s apart) with `connect_timeout=30`.
 *      First candidate that responds wins.
 *   3. Run `prisma migrate deploy` against the winning URL.
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
import { promises as dns } from 'node:dns';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log('[migrate-deploy]', ...args);

// ─── URL candidates ──────────────────────────────────────────────

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
  if (/-pooler\./.test(runtimeParsed.hostname)) {
    const derived = new URL(runtimeUrl);
    derived.hostname = derived.hostname.replace(/-pooler(?=\.|$)/, '');
    derived.searchParams.delete('pgbouncer');
    derived.searchParams.delete('connection_limit');
    derived.searchParams.delete('pool_timeout');
    // Long connect_timeout — Neon cold-start can take 20-30s.
    derived.searchParams.set('connect_timeout', '30');
    candidates.push({ url: derived.toString(), label: 'derived direct (stripped -pooler)' });
  }

  // 3. Fall back: use the runtime pooler URL as-is, but force pgbouncer=true
  //    + connection_limit=1 so Prisma Migrate gets a dedicated session.
  const poolerFallback = new URL(runtimeUrl);
  poolerFallback.searchParams.set('pgbouncer', 'true');
  poolerFallback.searchParams.set('connection_limit', '1');
  poolerFallback.searchParams.set('connect_timeout', '30');
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

function parseHostPort(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return { host: u.hostname, port: Number(u.port) || 5432 };
  } catch {
    return { host: '', port: 5432 };
  }
}

// ─── DNS + TCP diagnostics ──────────────────────────────────────
//   Before we even try Prisma, do a raw DNS lookup and TCP connect
//   test. This tells us:
//     - DNS resolves? (catches misconfigured DATABASE_URL hostname)
//     - TCP connects? (catches firewall / suspended Neon / network issues)
//   Prisma's error message is generic ("Can't reach database server")
//   — these diagnostics tell us WHY.

async function diagDns(hostname) {
  try {
    const records = await dns.resolve4(hostname);
    return { ok: true, ips: records };
  } catch (err) {
    return { ok: false, error: err.code || err.message };
  }
}

async function diagTcp(host, port, { timeoutMs = 10_000 } = {}) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port }, () => {
      sock.end();
      resolve({ ok: true, ms: 0 });
    });
    sock.setTimeout(timeoutMs);
    sock.on('timeout', () => {
      sock.destroy(new Error('TCP timeout'));
    });
    sock.on('error', (err) => {
      resolve({ ok: false, error: err.code || err.message });
    });
  });
}

// ─── Error classification ──────────────────────────────────────

const PERMANENT_PRISMA_CODES = new Set(['P1003', 'P1004', 'P1010']);
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P1018']);

const PERMANENT_ERROR_PATTERNS = [
  /password authentication failed/i,
  /no password supplied/i,
  /database .* does not exist/i,
  /role .* does not exist/i,
  /SSL connection.*required/i,
  /certificate verify failed/i,
  /hostname\/IP does not match certificate/i,
];

const TRANSIENT_ERROR_PATTERNS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /EPIPE/i,
  /EAI_AGAIN/i,
  /server closed the connection unexpectedly/i,
  /terminating connection/i,
  /connection.*timed out/i,
];

function classifyError(err) {
  if (err?.code && typeof err.code === 'string') {
    if (PERMANENT_PRISMA_CODES.has(err.code)) {
      return { kind: 'permanent', message: `[${err.code}] ${err.message ?? ''}` };
    }
    if (TRANSIENT_PRISMA_CODES.has(err.code)) {
      return { kind: 'transient', message: `[${err.code}] ${err.message ?? ''}` };
    }
  }

  const msg = String(err?.message ?? err?.toString?.() ?? err);
  if (PERMANENT_ERROR_PATTERNS.some((p) => p.test(msg))) {
    return { kind: 'permanent', message: msg };
  }
  if (TRANSIENT_ERROR_PATTERNS.some((p) => p.test(msg))) {
    return { kind: 'transient', message: msg };
  }

  if (/can't reach database server/i.test(msg)) {
    const hostMatch = msg.match(/at\s+[`'"]?(.+?):(\d+)[`'"]?/);
    if (hostMatch) {
      const host = hostMatch[1].replace(/[`'"\[\]]/g, '');
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host)) {
        return { kind: 'permanent', message: `${msg} (loopback host — config error, will not retry)` };
      }
    }
    return { kind: 'transient', message: msg };
  }

  return { kind: 'transient', message: msg };
}

// ─── Probe a single candidate ──────────────────────────────────

async function probeCandidate({ url, label }, { wakeAttempts = 8, delayMs = 5000 } = {}) {
  const { host, port } = parseHostPort(url);

  // ── DNS diagnostic ─────────────────────────────────────────────
  log(`\n▶ ${label}`);
  log(`  URL: ${redactUrl(url)}`);
  log(`  DNS lookup for ${host}...`);
  const dnsResult = await diagDns(host);
  if (dnsResult.ok) {
    log(`  ✅ DNS resolved: ${dnsResult.ips.join(', ')}`);
  } else {
    log(`  ❌ DNS failed: ${dnsResult.error}`);
    log(`  ⛔ Skipping this candidate — DNS resolution failed.`);
    return false;
  }

  // ── TCP diagnostic ─────────────────────────────────────────────
  log(`  TCP connect to ${host}:${port}...`);
  const tcpResult = await diagTcp(host, port, { timeoutMs: 15_000 });
  if (tcpResult.ok) {
    log(`  ✅ TCP connect succeeded`);
  } else {
    log(`  ❌ TCP connect failed: ${tcpResult.error}`);
    log(`  ⛔ Skipping this candidate — TCP connection refused/unreachable.`);
    log(`     Possible causes:`);
    log(`       - Neon project is suspended (revive in Neon dashboard)`);
    log(`       - Neon IP allow-list excludes Render's egress IP`);
    log(`       - Network/firewall block between Render and Neon`);
    log(`       - Neon project was deleted or renamed`);
    return false;
  }

  // ── Prisma SELECT 1 wake loop ──────────────────────────────────
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });

  try {
    for (let i = 1; i <= wakeAttempts; i++) {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        log(`  ✅ DB awake (SELECT 1 succeeded, attempt ${i}/${wakeAttempts})`);
        return true;
      } catch (err) {
        const cls = classifyError(err);
        log(`  ⏳ wake attempt ${i}/${wakeAttempts} failed [${cls.kind}]: ${cls.message}`);
        if (cls.kind === 'permanent') {
          log(`  ⛔ permanent error — skipping this candidate.`);
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

// Resolve the backend package root (where prisma/schema.prisma lives).
// __dirname is backend/scripts/, so backend/ is one level up.
const BACKEND_ROOT = path.resolve(__dirname, '..');

async function runMigrate(targetUrl, label, { attempts = 3, delayMs = 5000, stepTimeoutMs = 180_000 } = {}) {
  const prismaBin = resolvePrismaBinary();
  // Always pass --schema explicitly so cwd doesn't matter. This makes
  // the script work whether it's invoked from backend/, repo root,
  // or any other directory (Render build runs it from backend/ but
  // local dev may run it from elsewhere).
  const schemaPath = path.join(BACKEND_ROOT, 'prisma', 'schema.prisma');
  const cmd = prismaBin
    ? [prismaBin, 'migrate', 'deploy', '--schema', schemaPath]
    : ['prisma', 'migrate', 'deploy', '--schema', schemaPath];

  if (!prismaBin) {
    log('⚠️  Local prisma binary not found; falling back to `npx prisma`.');
  }
  log(`   schema: ${schemaPath}`);

  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    log(`🚀 migrate deploy via ${label} (attempt ${i}/${attempts})`);
    try {
      execFileSync(cmd[0], cmd.slice(1), {
        stdio: 'inherit',
        timeout: stepTimeoutMs,
        cwd: BACKEND_ROOT,
        env: {
          ...process.env,
          DATABASE_URL: targetUrl,
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
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(`runtime DB: ${redactUrl(runtimeUrl)}`);
    log(`trying ${candidates.length} candidate(s) for migration DB`);
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let winner = null;
    for (const c of candidates) {
      const ok = await probeCandidate(c);
      if (ok) {
        winner = c;
        break;
      }
    }

    if (!winner) {
      log('\n💥 None of the candidate URLs reached the database.');
      log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      log('DIAGNOSTICS SUMMARY:');
      log('  All candidates failed DNS or TCP connect or SELECT 1.');
      log('');
      log('ACTION REQUIRED:');
      log('  1. Check Neon dashboard — is the project active?');
      log('     https://console.neon.tech → select project → check status');
      log('     If suspended, click "Resume" or run any query to wake it.');
      log('');
      log('  2. Check Neon IP allow-list (Pro plans):');
      log('     Neon dashboard → Settings → IP Allow-list');
      log('     Render egress IPs vary — consider allowing 0.0.0.0/0');
      log('     or remove the allow-list during build.');
      log('');
      log('  3. Verify DATABASE_URL is current:');
      log('     Neon dashboard → Connection Details → copy pooled URL');
      log('     Update Render Environment tab with the new value.');
      log('');
      log('  4. Test connectivity from Render shell:');
      log('     Once the service is deployed, open Render shell and run:');
      log('       nc -zv pooler-endpoint.example.neon.tech 5432');
      log('');
      log('  5. Check Neon status page:');
      log('     https://neon.statuspage.io/');
      log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
