#!/usr/bin/env node
/**
 * dev-full.mjs — R319 §C1-B: `npm run dev:full` — the WHOLE local stack
 * in one command:
 *
 *   1. [pg]  embedded PostgreSQL on :5433 (booted via local-db.mjs when
 *            not already running; left alone when it is)
 *   2. [db]  prisma migrate deploy + seed against backend/.env.local
 *            (idempotent — the r183 established-db guard makes the seed
 *            a no-op on an already-seeded database)
 *   3. [api] backend dev server  → http://localhost:4000 (PORT override
 *            via MADAREK_API_PORT; env: backend/.env.local + inline)
 *   4. [web] frontend Vite dev   → http://localhost:5173 (override via
 *            MADAREK_WEB_PORT)
 *
 * Ctrl-C (SIGINT/SIGTERM) tears everything down in reverse; the embedded
 * postgres is stopped ONLY when dev-full itself booted it (a database
 * you started separately stays up). Children run in their own process
 * groups so the whole tree (npm → sh → tsx/vite → node) gets the signal.
 *
 * Skip knobs: MADAREK_SKIP_SEED=1 (migrate only), MADAREK_SKIP_DB=1
 * (assume an already-migrated database).
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

import { isPortOpen, readEnvFile, REPO_ROOT } from './local-db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
void __dirname;

const API_PORT = Number(process.env.MADAREK_API_PORT || 4000);
const WEB_PORT = Number(process.env.MADAREK_WEB_PORT || 5173);
const PG_PORT = Number(process.env.MADAREK_PG_PORT || 5433);
const ENV_FILE = path.join(REPO_ROOT, 'backend', '.env.local');

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const PREFIX = {
  pg: paint('36', '[pg] '),
  db: paint('35', '[db] '),
  api: paint('33', '[api]'),
  web: paint('32', '[web]'),
  sys: paint('1', '[dev:full]'),
};
const log = (...args) => console.log(PREFIX.sys, ...args);

/* ── prefixed child runner ────────────────────────────────────────── */

/**
 * Spawn a command whose stdout/stderr stream through line-prefixes.
 * Returns the child handle (own process group, so the whole tree can be
 * signalled at shutdown). `pipePrefix` may be null → inherit stdio.
 */
function spawnPrefixed(prefix, command, args, opts = {}) {
  const child = spawn(command, args, {
    cwd: REPO_ROOT,
    env: opts.env ?? process.env,
    stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    detached: true, // own process group — signal the tree, not just npm
  });
  if (!opts.inherit) {
    for (const stream of [child.stdout, child.stderr]) {
      if (!stream) continue;
      readline.createInterface({ input: stream }).on('line', (line) => {
        console.log(`${prefix} ${line}`);
      });
    }
  }
  return child;
}

/** Run a prefixed command to completion; resolves with its exit code. */
function runPrefixed(prefix, command, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawnPrefixed(prefix, command, args, opts);
    child.on('error', (err) => {
      console.error(PREFIX.sys, `✖ failed to spawn ${command}:`, err.message);
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 0));
  });
}

async function waitFor(fn, label, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function waitForHttpOk(url, label, timeoutMs) {
  const ok = await waitFor(async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }, label, timeoutMs);
  if (!ok) throw new Error(`${label} did not answer ${url} within ${Math.round(timeoutMs / 1000)}s`);
  return true;
}

/* ── orchestration ────────────────────────────────────────────────── */

const children = []; // long-running: [api], [web]
let weStartedPg = false;
let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('');
  log(`received ${signal} — tearing the stack down…`);

  // Children first, in reverse order, whole process groups at a time.
  for (const child of [...children].reverse()) {
    if (child.exitCode !== null) continue;
    try {
      process.kill(-child.pid, 'SIGINT');
    } catch {
      /* group already gone */
    }
  }
  const deadline = Date.now() + 8000;
  while (children.some((c) => c.exitCode === null) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const child of children) {
    if (child.exitCode !== null) continue;
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }

  // Only stop the database when dev-full itself booted it.
  if (weStartedPg) {
    await runPrefixed(PREFIX.pg, process.execPath, ['scripts/r319/local-db.mjs', 'stop'], {
      inherit: true,
    });
  } else {
    log('embedded postgres was already running — leaving it up (stop it with: npm run db:local -- stop)');
  }
  log(exitCode === 0 ? 'stack down. بياناتك محفوظة في .local/pgdata' : `stack down (exit ${exitCode})`);
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// A terminal hangup (closed tab, dropped ssh) must not orphan the
// children — default SIGHUP action is instant death with no cleanup,
// which is exactly the leak this script exists to prevent.
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Orphan watchdog: `npm run dev:full` wraps this script in npm → sh; if
// that wrapper dies without forwarding the signal (npm swallows a
// kill -INT aimed at it alone), we get reparented to init (ppid 1) —
// detect it and tear the children down instead of leaking them. A real
// terminal Ctrl-C signals the whole foreground group, so this is purely
// the belt for non-terminal signal paths.
const parentPid = process.ppid;
setInterval(() => {
  if (shuttingDown) return;
  if (process.ppid === 1 || process.ppid !== parentPid) {
    log('orphaned (parent exited) — shutting the stack down');
    void shutdown('orphaned');
  }
}, 2000).unref();

async function main() {
  /* 1 ── embedded postgres (idempotent) ─────────────────────────── */
  const pgWasUp = await isPortOpen(PG_PORT, '127.0.0.1');
  if (!pgWasUp) {
    log(`booting embedded postgres on :${PG_PORT} …`);
    const code = await runPrefixed(PREFIX.pg, process.execPath, ['scripts/r319/local-db.mjs', 'start'], {
      inherit: true,
    });
    if (code !== 0) throw new Error('local-db start failed');
    weStartedPg = true;
  } else {
    log(`embedded postgres already up on :${PG_PORT}`);
  }

  /* 2 ── env from backend/.env.local ────────────────────────────── */
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(`${path.relative(REPO_ROOT, ENV_FILE)} missing — run: node scripts/r319/local-db.mjs start`);
  }
  const localEnv = readEnvFile(ENV_FILE);
  // Belt AND suspenders: the values ride inline (dotenv never overrides
  // existing vars) AND DOTENV_CONFIG_PATH points env.ts's `dotenv/config`
  // at the same file for anyone who imports env.ts in a fresh process.
  const childEnv = {
    ...process.env,
    ...localEnv,
    DOTENV_CONFIG_PATH: ENV_FILE,
  };
  for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!childEnv[key]) throw new Error(`${key} missing — regenerate backend/.env.local`);
  }

  /* 3 ── migrations (+ seed) ────────────────────────────────────── */
  if (process.env.MADAREK_SKIP_DB !== '1') {
    log('applying prisma migrations (db:deploy)…');
    let code = await runPrefixed(PREFIX.db, 'npm', ['run', 'db:deploy'], { env: childEnv });
    if (code !== 0) throw new Error('db:deploy failed');
    if (process.env.MADAREK_SKIP_SEED === '1') {
      log('seed skipped (MADAREK_SKIP_SEED=1)');
    } else {
      log('seeding (db:seed — no-op once established)…');
      code = await runPrefixed(PREFIX.db, 'npm', ['run', 'db:seed'], { env: childEnv });
      if (code !== 0) throw new Error('db:seed failed');
    }
  } else {
    log('migrate + seed skipped (MADAREK_SKIP_DB=1)');
  }

  /* 4 ── backend dev server ─────────────────────────────────────── */
  log(`starting backend on :${API_PORT} …`);
  const api = spawnPrefixed(`${PREFIX.api}`, 'npm', ['run', 'dev', '-w', 'backend'], {
    env: { ...childEnv, PORT: String(API_PORT) },
  });
  children.push(api);
  api.on('close', (code) => {
    if (!shuttingDown && code !== null) {
      log(`✖ backend exited (code ${code}) — shutting the stack down`);
      void shutdown(`api-exit-${code}`, 1);
    }
  });
  await waitForHttpOk(`http://localhost:${API_PORT}/api/v1/health`, 'backend', 90_000);
  log(`✅ api      → http://localhost:${API_PORT}/api/v1  (health ok)`);

  /* 5 ── frontend dev server ────────────────────────────────────── */
  log(`starting frontend on :${WEB_PORT} …`);
  const webArgs = ['run', 'dev', '-w', 'frontend'];
  if (process.env.MADAREK_WEB_PORT) webArgs.push('--', '--port', String(WEB_PORT));
  // R320 §C — a custom MADAREK_API_PORT must flow into the Vite /api
  // proxy too: the dev proxy defaults to :4000, so a stack booted on
  // (say) :4253 would 500 every browser API call. Pass the live API
  // origin unless the operator explicitly pointed VITE_API_TARGET at a
  // remote API (the documented remote-iteration override).
  const webEnv = process.env.VITE_API_TARGET
    ? process.env
    : { ...process.env, VITE_API_TARGET: `http://localhost:${API_PORT}` };
  const web = spawnPrefixed(`${PREFIX.web}`, 'npm', webArgs, { env: webEnv });
  children.push(web);
  web.on('close', (code) => {
    if (!shuttingDown && code !== null) {
      log(`✖ frontend exited (code ${code}) — shutting the stack down`);
      void shutdown(`web-exit-${code}`, 1);
    }
  });
  // Vite binds to [::1] on IPv6-preferring hosts and 127.0.0.1 elsewhere
  // — probe `localhost` (OS resolution) first, then both literals.
  const webUp = await waitFor(
    async () =>
      (await isPortOpen(WEB_PORT, 'localhost')) ||
      (await isPortOpen(WEB_PORT, '127.0.0.1')) ||
      (await isPortOpen(WEB_PORT, '::1')),
    'vite',
    60_000,
  );
  if (!webUp) throw new Error(`vite never listened on :${WEB_PORT}`);
  log(`✅ web      → http://localhost:${WEB_PORT}`);

  /* 6 ── summary ────────────────────────────────────────────────── */
  console.log('');
  log(paint('1', '✅ full local stack is up'));
  log(`   web  http://localhost:${WEB_PORT}   · api http://localhost:${API_PORT}/api/v1   · pg :${PG_PORT}`);
  log('   test logins (seeded locally — one easy account per job, @test.ly / 12345678):');
  log('   student@ · student2@ · teacher@ · head@ · dean@ · vicedean@ · registrar@ · faculty@ · quality@ · owner@test.ly');
  log('   the full table: shared/testAccounts.ts · Ctrl-C stops everything. Docs: docs/redesign/r319/STACK.md');
  console.log('');
}

main().catch((err) => {
  console.error(PREFIX.sys, '✖', err.message);
  void shutdown('startup-failure', 1);
});
