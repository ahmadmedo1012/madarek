#!/usr/bin/env node
/**
 * local-db.mjs — R319 §C1-B: the local database lifecycle for the full
 * local stack (embedded PostgreSQL 16, no Docker).
 *
 *   node scripts/r319/local-db.mjs start    boot PG on :5433 (idempotent),
 *                                            create db `madarek_dev`,
 *                                            write backend/.env.local ONCE
 *   node scripts/r319/local-db.mjs stop     clean shutdown (pg_ctl -m fast)
 *   node scripts/r319/local-db.mjs status   port + datadir + env-file report
 *
 * Design notes:
 *
 *   - Binaries come from `embedded-postgres` (root devDependency), whose
 *     platform package `@embedded-postgres/linux-x64` ships initdb /
 *     pg_ctl / postgres. We deliberately drive the RAW binaries via
 *     pg_ctl instead of the EmbeddedPostgres wrapper class: the wrapper
 *     registers an async-exit-hook that KILLS the cluster when the
 *     driving script exits, while pg_ctl daemonises postgres so the
 *     database SURVIVES this script (dev:full, prisma and curl all talk
 *     to it afterwards). Same pattern as the r166c tools/boot-pg.sh, now
 *     node-only and wired into the repo's dev scripts.
 *
 *   - `--auth=trust` + user `postgres`: local-only, bound to 127.0.0.1,
 *     no password in any URL. NEVER a production posture.
 *
 *   - backend/.env.local is written ONLY IF ABSENT (gitignored): it pins
 *     DATABASE_URL + two random local-only JWT secrets so tokens stay
 *     stable across restarts. dotenv picks it up via DOTENV_CONFIG_PATH
 *     (see dev-full.mjs); `npm run dev -w backend` alone needs
 *     `DOTENV_CONFIG_PATH=.env.local` (documented in STACK.md).
 *
 *   - The @embedded-postgres/linux-x64 postinstall (hydrate-symlinks.js)
 *     re-creates the native/lib *.so symlinks npm can strip; this script
 *     re-hydrates them idempotently itself so the stack works even where
 *     install scripts are blocked (this sandbox blocks them by default).
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

/* ── configuration (env-overridable, local-only defaults) ─────────── */
const PG_PORT = Number(process.env.MADAREK_PG_PORT || 5433);
const PG_HOST = '127.0.0.1';
const PG_USER = 'postgres';
const DB_NAME = process.env.MADAREK_DB_NAME || 'madarek_dev';
const DATA_DIR = path.join(REPO_ROOT, '.local', 'pgdata');
const LOG_FILE = path.join(REPO_ROOT, '.local', 'pg.log');
const ENV_FILE = path.join(REPO_ROOT, 'backend', '.env.local');
export const DATABASE_URL =
  process.env.MADAREK_DATABASE_URL || `postgresql://${PG_USER}@localhost:${PG_PORT}/${DB_NAME}`;

const log = (...args) => console.log('[local-db]', ...args);
const die = (msg) => {
  console.error(`[local-db] ✖ ${msg}`);
  process.exit(1);
};

/* ── embedded-postgres binaries ───────────────────────────────────── */

/**
 * Resolve initdb / pg_ctl / postgres from the platform package the
 * `embedded-postgres` dependency installed. `embedded-postgres/dist/binary.js`
 * does the same dynamic-import dance; importing the platform package
 * directly keeps this script dependency-free beyond what npm already put
 * in node_modules (throws a clear message on unsupported platforms).
 */
async function resolveBinaries() {
  const mod = await import('@embedded-postgres/linux-x64');
  return { initdb: mod.initdb, pgCtl: mod.pg_ctl, postgres: mod.postgres };
}

/** Re-create the native/lib *.so symlinks from the package's manifest
 * (idempotent — mirrors scripts/hydrate-symlinks.js, which npm may have
 * blocked via the install-scripts policy). */
function hydrateLibSymlinks(nativeDir) {
  const manifest = path.join(nativeDir, 'pg-symlinks.json');
  if (!fs.existsSync(manifest)) return;
  let links = [];
  try {
    links = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  } catch {
    return;
  }
  for (const { source, target } of links) {
    const absTarget = path.join(nativeDir, target);
    const absSource = path.join(nativeDir, source);
    if (fs.existsSync(absTarget)) continue;
    try {
      fs.symlinkSync(path.relative(path.dirname(absTarget), absSource), absTarget);
      log(`hydrated lib symlink ${target}`);
    } catch {
      /* best-effort — the binary itself reports anything truly missing */
    }
  }
}

/* ── port / readiness probes ──────────────────────────────────────── */

export function isPortOpen(port, host = PG_HOST, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    sock.setTimeout(timeoutMs, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, label, attempts = 40, delayMs = 500) {
  for (let i = 1; i <= attempts; i++) {
    if (await isPortOpen(port)) return;
    if (i % 10 === 0) log(`waiting for ${label} … (${i}/${attempts})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  die(`${label} never came up — see ${path.relative(REPO_ROOT, LOG_FILE)}`);
}

/* ── .env.local (written once, local-only secrets) ────────────────── */

function ensureEnvFile() {
  if (fs.existsSync(ENV_FILE)) {
    log(`env file present: ${path.relative(REPO_ROOT, ENV_FILE)}`);
    return;
  }
  // Long random LOCAL-ONLY secrets (crypto.randomBytes hex). Never
  // production values — this file never leaves the machine (gitignored).
  const lines = [
    '# R319 local stack (scripts/r319/local-db.mjs) — LOCAL DEV ONLY, never commit.',
    '# Generated once; delete the file to rotate the local JWT secrets.',
    `DATABASE_URL=${DATABASE_URL}`,
    `JWT_ACCESS_SECRET=${crypto.randomBytes(48).toString('hex')}`,
    `JWT_REFRESH_SECRET=${crypto.randomBytes(48).toString('hex')}`,
    '',
  ];
  fs.mkdirSync(path.dirname(ENV_FILE), { recursive: true });
  fs.writeFileSync(ENV_FILE, lines.join('\n'), { mode: 0o600 });
  log(`wrote ${path.relative(REPO_ROOT, ENV_FILE)} (DATABASE_URL + fresh local JWT secrets)`);
}

/** Minimal KEY=VALUE parser (comments + blank lines skipped) — used by
 * dev-full.mjs to pass the local env to every child process. */
export function readEnvFile(file = ENV_FILE) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

/* ── pg driver (a dependency of embedded-postgres) ────────────────── */

async function withPgClient(fn) {
  const pg = (await import('pg')).default;
  const client = new pg.Client({ host: PG_HOST, port: PG_PORT, user: PG_USER, database: 'postgres' });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function ensureDatabase() {
  const { rows } = await withPgClient((c) =>
    c.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]),
  );
  if (rows.length > 0) {
    log(`database exists: ${DB_NAME}`);
    return;
  }
  await withPgClient((c) => c.query(`CREATE DATABASE ${c.escapeIdentifier(DB_NAME)}`));
  log(`created database: ${DB_NAME}`);
}

/* ── commands ─────────────────────────────────────────────────────── */

async function start() {
  fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  const { initdb, pgCtl, postgres } = await resolveBinaries();
  const nativeDir = path.dirname(path.dirname(initdb)); // …/native/bin → …/native
  hydrateLibSymlinks(nativeDir);
  void postgres;

  // Already running? Idempotent no-op (dev:full calls start every time).
  if (await isPortOpen(PG_PORT)) {
    log(`already running on ${PG_HOST}:${PG_PORT} — leaving it alone`);
    ensureEnvFile();
    log('ready. Next: npm run dev:full  (migrate + seed + api + web)');
    return;
  }

  // Fresh datadir → initdb (UTF8 encoding for Arabic content, C collation
  // for deterministic sorting; trust auth — localhost-only listener).
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    log(`initialising data dir ${path.relative(REPO_ROOT, DATA_DIR)} (initdb, UTF8, trust)…`);
    const res = spawnSync(initdb, [
      '-D', DATA_DIR,
      '-U', PG_USER,
      '--auth=trust',
      '--encoding=UTF8',
      '--no-locale',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    if (res.status !== 0) {
      die(`initdb failed: ${res.stderr?.toString().trim().split('\n').slice(-5).join('\n')}`);
    }
  }

  // pg_ctl daemonises postgres (survives this script) — log to .local/pg.log.
  log(`starting postgres on ${PG_HOST}:${PG_PORT} …`);
  const res = spawnSync(pgCtl, [
    '-D', DATA_DIR,
    '-l', LOG_FILE,
    '-o', `-p ${PG_PORT} -c listen_addresses=${PG_HOST}`,
    'start',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (res.status !== 0) {
    // Most common cause: a stale postmaster.pid from an unclean shutdown.
    const tail = fs.existsSync(LOG_FILE)
      ? fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').slice(-8).join('\n')
      : '(no log file)';
    die(`pg_ctl start failed:\n${res.stderr?.toString().trim()}\n${tail}`);
  }
  await waitForPort(PG_PORT, `postgres :${PG_PORT}`);

  await ensureDatabase();
  ensureEnvFile();
  log(`✅ postgres up on ${PG_HOST}:${PG_PORT} · db=${DB_NAME} · ${DATABASE_URL}`);
  log('next: npm run dev:full  (migrate + seed + api + web)');
}

async function stop() {
  const { pgCtl } = await resolveBinaries();
  if (!(await isPortOpen(PG_PORT))) {
    log(`nothing listening on :${PG_PORT} — already stopped`);
    return;
  }
  log('stopping postgres (pg_ctl -m fast)…');
  const res = spawnSync(pgCtl, ['-D', DATA_DIR, '-m', 'fast', 'stop'], { stdio: 'pipe' });
  if (res.status !== 0) {
    die(`pg_ctl stop failed: ${res.stderr?.toString().trim()}`);
  }
  for (let i = 0; i < 20 && (await isPortOpen(PG_PORT)); i++) {
    await new Promise((r) => setTimeout(r, 250));
  }
  log(`✅ postgres stopped (data preserved in ${path.relative(REPO_ROOT, DATA_DIR)})`);
}

async function status() {
  const up = await isPortOpen(PG_PORT);
  const initialised = fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
  const envPresent = fs.existsSync(ENV_FILE);
  const url = readEnvFile().DATABASE_URL;
  log(`port ${PG_PORT}:          ${up ? 'LISTENING' : 'down'}`);
  log(`data dir:            ${initialised ? path.relative(REPO_ROOT, DATA_DIR) : '(not initialised)'}`);
  log(`backend/.env.local:  ${envPresent ? 'present' : 'absent (run: local-db start)'}`);
  log(`DATABASE_URL:        ${url ?? DATABASE_URL}`);
  process.exitCode = up ? 0 : 1;
}

/* ── entry ────────────────────────────────────────────────────────── */

/**
 * CLI entry guard: local-db.mjs is ALSO a library (dev-full.mjs imports
 * isPortOpen / readEnvFile / REPO_ROOT). Without this guard the import
 * would execute the CLI body — `process.argv[2] || 'start'` — and boot
 * postgres as a side effect of `npm run dev:full`'s module loading
 * (found live in the r319-B verification: dev-full's own start() then
 * saw the port already up and refused to stop the database on teardown).
 * Run the commands only when this file is the executed script.
 */
function invokedAsCli() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (invokedAsCli()) {
  const command = process.argv[2] || 'start';
  if (command === 'start') await start();
  else if (command === 'stop') await stop();
  else if (command === 'status') await status();
  else {
    console.error('usage: node scripts/r319/local-db.mjs <start|stop|status>');
    process.exit(1);
  }
}
