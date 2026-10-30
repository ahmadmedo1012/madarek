/**
 * API contract suite (P6.3) — additive-only response contract for the
 * owner's Expo mobile client.
 *
 * HOW IT WORKS
 * ------------
 * The REAL Express app is built in-process (createApp()) and booted on an
 * ephemeral loopback port (app.listen(0) + fetch — Express has no
 * `app.inject()`; this is the closest no-external-network equivalent).
 * Every request therefore exercises the full middleware chain (helmet,
 * cors, compression, rate limiters, auth, error handler) exactly like
 * production dispatch.
 *
 * For each covered route the suite asserts, against the committed
 * `snapshot.json`:
 *   1. the response STATUS is unchanged, and
 *   2. every snapshot-recorded TOP-LEVEL field is still present at the
 *      three levels a mobile client actually consumes:
 *        · the envelope          (`data` / `data, meta` / `error`)
 *        · the payload object    (keys of `data`, when it is an object)
 *        · the list item         (keys of `data[0]`, when `data` is an array)
 *      Missing / renamed fields → FAIL. Newly ADDED fields → PASS
 *      (additive-only contract, by design).
 *
 * The snapshot `shape` values (recursive `{'[]': …}` / scalar-type tree)
 * are the OBSERVED shapes of real responses against the seeded dev DB
 * (DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev) — the
 * same file feeds docs/api/openapi.json via `npm run api:openapi`.
 * Regenerate after an intentional additive change:
 *
 *   cd backend && DATABASE_URL=… UPDATE_SNAPSHOT=1 npx vitest run tests/contract
 *
 * DB POLICY (mirrors AGENTS.md §5.2 — `npm test` stays runnable DB-free):
 * the suite PROBES the database once at load; with no reachable DB the
 * whole suite is SKIPPED (green), never failed. Point DATABASE_URL at the
 * seeded dev DB to run it for real.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db';
import { createApp } from '../../src/app';

// ── Snapshot file + shape grammar (shared with generate-openapi.ts) ──
const SNAPSHOT_PATH = path.resolve(__dirname, 'snapshot.json');

/** Recursive observed shape: 'string' | 'number' | 'boolean' | 'null' |
 *  'empty' | nested object | { '[]': elementShape } — generated from a
 *  real response body by shapeOf() below. */
type Shape = string | { [key: string]: Shape };

const scalarShape = (v: unknown): Shape => {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'empty';
  }
};

const shapeOf = (v: unknown): Shape => {
  if (Array.isArray(v)) return { '[]': v.length > 0 ? shapeOf(v[0]) : 'empty' };
  if (v !== null && typeof v === 'object') {
    const out: { [key: string]: Shape } = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = shapeOf(val);
    return out;
  }
  return scalarShape(v);
};

const isObj = (s: Shape | undefined): s is { [key: string]: Shape } =>
  typeof s === 'object' && s !== null && !('[]' in s);
const isList = (s: Shape | undefined): s is { '[]': Shape } =>
  typeof s === 'object' && s !== null && '[]' in s;
const keysOf = (s: Shape | undefined): string[] => (isObj(s) ? Object.keys(s) : []);

interface SnapshotRoute {
  status: number;
  shape: Shape;
}
type Snapshot = Record<string, SnapshotRoute>;

// ── DB probe — skip (never fail) when no reachable database ────────
let dbUp = false;
let dbProbeError = '';
try {
  await Promise.race([
    prisma.$queryRaw`SELECT 1`.then(() => {
      dbUp = true;
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('db probe timeout')), 5_000)),
  ]);
} catch (err) {
  dbProbeError = err instanceof Error ? err.message : String(err);
}

const d = describe.skipIf(!dbUp);

// ── Contract table — fixed execution order (logout LAST: it bumps the
//    student's tokenVersion and revokes the captured refresh cookie). ──
type Actor = 'public' | 'student' | 'teacher';
interface ContractRoute {
  key: string; // 'METHOD /api/v1/…' — snapshot key AND vitest title
  actor: Actor;
  op?: 'login' | 'refresh' | 'logout';
  body?: Record<string, unknown>;
}

const DEMO_PASSWORD = '12345678'; // BOARD §C test accounts (test-accounts.data.ts)

const ROUTES: ContractRoute[] = [
  // Public surface — anonymous reachability is itself mobile contract.
  { key: 'GET /api/v1/health', actor: 'public' },
  { key: 'GET /api/v1/colleges', actor: 'public' },
  { key: 'GET /api/v1/courses', actor: 'public' },
  { key: 'GET /api/v1/ai/config', actor: 'public' },
  // Student session (student@test.ly).
  {
    key: 'POST /api/v1/auth/login',
    actor: 'student',
    op: 'login',
    body: { email: 'student@test.ly', password: DEMO_PASSWORD },
  },
  { key: 'GET /api/v1/auth/me', actor: 'student' },
  { key: 'GET /api/v1/me/dashboard', actor: 'student' },
  { key: 'GET /api/v1/notifications', actor: 'student' },
  { key: 'GET /api/v1/enrollments/me', actor: 'student' },
  { key: 'GET /api/v1/me/theme', actor: 'student' },
  { key: 'GET /api/v1/announcements/feed', actor: 'student' },
  // Refresh — the rotation contract (sliding session, cookie-carried).
  { key: 'POST /api/v1/auth/refresh', actor: 'student', op: 'refresh' },
  // Teacher surface (teacher@test.ly).
  {
    key: 'POST /api/v1/auth/login',
    actor: 'teacher',
    op: 'login',
    body: { email: 'teacher@test.ly', password: DEMO_PASSWORD },
  },
  { key: 'GET /api/v1/teacher/dashboard', actor: 'teacher' },
  { key: 'GET /api/v1/teacher/me/offerings', actor: 'teacher' },
  // Logout LAST — bumps tokenVersion, revoking every captured cookie.
  { key: 'POST /api/v1/auth/logout', actor: 'student', op: 'logout' },
];

// Login/refresh rows are actor-qualified in the snapshot (two logins share
// one path) — this is the snapshot key for a table row.
const snapshotKey = (r: ContractRoute): string =>
  r.op === 'login' || r.op === 'refresh' ? `${r.key}#${r.actor}` : r.key;

// ── Harness state ────────────────────────────────────────────────────
let server: Server | undefined;
let base = '';
const tokens: Record<'student' | 'teacher', string> = { student: '', teacher: '' };
const refreshCookies: Record<'student' | 'teacher', string> = { student: '', teacher: '' };

const UPDATE = process.env.UPDATE_SNAPSHOT === '1';

/** UPDATE_SNAPSHOT=1 may record a FIRST snapshot — absent file → empty base.
 *  File format: `{ routes: { 'METHOD /api/v1/…': { status, shape } } }` —
 *  the same file is consumed by backend/scripts/generate-openapi.ts. */
const loadSnapshot = (): Snapshot => {
  if (UPDATE && !existsSync(SNAPSHOT_PATH)) return {};
  const parsed = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as { routes?: Snapshot };
  return parsed.routes ?? {};
};

async function call(
  method: 'GET' | 'POST',
  pathName: string,
  opts: { actor?: Actor; body?: Record<string, unknown>; cookie?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.actor && opts.actor !== 'public' && tokens[opts.actor]) {
    headers.Authorization = `Bearer ${tokens[opts.actor]}`;
  }
  if (opts.cookie) headers.Cookie = opts.cookie;
  return fetch(`${base}${pathName}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
}

const refreshCookieFrom = (res: Response): string => {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith('mdrk_refresh='));
  if (!raw) throw new Error('login/refresh response carried no mdrk_refresh Set-Cookie');
  return raw.slice(0, raw.indexOf(';'));
};

d('API contract (additive-only, mobile client)', () => {
  let snapshot: Snapshot;

  beforeAll(async () => {
    snapshot = loadSnapshot(); // loaded ONCE — route its mutate in place
    const app = createApp();
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 30_000);

  afterAll(async () => {
    server?.closeAllConnections?.();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    await prisma.$disconnect();
  });

  it('snapshot covers exactly the contract table (no stale entries)', () => {
    if (UPDATE) return; // recording replaces the snapshot wholesale
    const expected = new Set(ROUTES.map(snapshotKey));
    const stale = Object.keys(snapshot).filter((k) => !expected.has(k));
    expect(
      stale,
      'snapshot entries no longer in the contract table — remove them (or re-record with UPDATE_SNAPSHOT=1)',
    ).toEqual([]);
    const missing = [...expected].filter((k) => !(k in snapshot));
    expect(
      missing,
      'contract table rows missing from snapshot.json — re-record with UPDATE_SNAPSHOT=1',
    ).toEqual([]);
  });

  for (const route of ROUTES) {
    it(route.key, async () => {
      const entry = snapshot[snapshotKey(route)];
      if (!entry && !UPDATE) {
        throw new Error(`snapshot.json has no entry for ${snapshotKey(route)}`);
      }

      const res = await call(
        route.key.startsWith('POST') ? 'POST' : 'GET',
        route.key.slice(route.key.indexOf(' ') + 1),
        {
          actor: route.actor,
          body: route.body,
          cookie: route.op === 'refresh' ? refreshCookies.student : undefined,
        },
      );

      // Body first — 204/empty responses have no JSON to parse. In a
      // recording run (or a brand-new table row) the OBSERVED shape replaces
      // the stored one; a verify run asserts against the COMMITTED entry.
      const text = await res.text();
      const body: Record<string, unknown> | null =
        text === '' ? null : (JSON.parse(text) as Record<string, unknown>);
      const shape = body === null ? 'empty' : shapeOf(body);
      if (UPDATE || !entry) snapshot[snapshotKey(route)] = { status: res.status, shape };

      expect(res.status, `${route.key} status drifted`).toBe(
        snapshot[snapshotKey(route)]!.status,
      );

      // Empty body (204 logout) — assert emptiness and stop.
      if (body === null) {
        expect(text, `${route.key} was expected to answer an empty body`).toBe('');
        return;
      }

      const committed = snapshot[snapshotKey(route)]!;

      // ── Additive-only assertions: snapshot keys ⊆ observed keys ──
      const expectSubset = (snapKeys: string[], actual: object, level: string) => {
        const missing = snapKeys.filter((k) => !(k in actual));
        expect(
          missing,
          `${route.key} [${level}] — field(s) REMOVED or RENAMED from the committed contract`,
        ).toEqual([]);
      };

      // 1. envelope top level ({data} / {data, meta} / {error} …)
      expectSubset(keysOf(committed.shape), body, 'envelope');

      // 2. payload object (keys of data, when data is an object)
      const dataShape = isObj(committed.shape) ? committed.shape['data'] : undefined;
      if (isObj(dataShape) && body['data'] !== null && typeof body['data'] === 'object') {
        expectSubset(keysOf(dataShape), body['data'] as object, 'data');
      }

      // 3. list items (keys of data[0], when data is a non-empty array)
      if (
        isList(dataShape) &&
        isObj(dataShape['[]']) &&
        Array.isArray(body['data']) &&
        body['data'].length > 0
      ) {
        expectSubset(keysOf(dataShape['[]']), body['data'][0] as object, 'data[0] (list item)');
      }

      // meta keys when snapshotted ({page, limit, total, …})
      const metaShape = isObj(committed.shape) ? committed.shape['meta'] : undefined;
      if (isObj(metaShape) && body['meta'] !== null && typeof body['meta'] === 'object') {
        expectSubset(keysOf(metaShape), body['meta'] as object, 'meta');
      }

      // ── Session plumbing for the later rows ──
      if (route.op === 'login' || route.op === 'refresh') {
        const actor = route.actor as 'student' | 'teacher';
        const data = body['data'] as { accessToken?: string };
        if (typeof data?.accessToken === 'string') tokens[actor] = data.accessToken;
        refreshCookies[actor] = refreshCookieFrom(res);
      }
    });
  }

  it('UPDATE_SNAPSHOT run persisted the re-recorded snapshot', () => {
    if (!UPDATE) return; // no-op in verify mode
    snapshot ??= {};
    const ordered: Snapshot = {};
    for (const key of Object.keys(snapshot).sort()) ordered[key] = snapshot[key]!;
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify({ routes: ordered }, null, 2)}\n`, 'utf8');
  });
});

if (!dbUp) {
  // Honest skip note in default `npm test` runs (AGENTS.md §5.2 keeps the
  // default suite DB-free): the contract gate needs the seeded dev DB.
  it.skip(
    `contract suite skipped — no reachable database (${dbProbeError || 'DATABASE_URL not pointed at the seeded dev DB'})`,
    () => {},
  );
}
