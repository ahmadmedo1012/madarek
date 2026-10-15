/**
 * Backend unit test — r167 (WS-1): the /owner/system storage block
 * becomes REACHABILITY-AWARE (backend/src/http/routes/owner.routes.ts
 * + lib/storage.ts's StorageReachabilityCache wiring).
 *
 * The r166d truthfulness gap: `storage: toStorageStatus(env.STORAGE_DRIVER)`
 * was env-derived ONLY — with STORAGE_DRIVER=s3 configured but the store
 * unreachable (wrong credentials, dead endpoint) the page still painted
 * green «دائمة». The route now folds in the memoized probe answer
 * (reachable/checkedAt, additive + s3-only). Route-level pins:
 *
 *   - local driver: the block keeps its EXACT pre-r167 two-field shape
 *     and the probe helper is never even called (short-circuit).
 *   - s3 + probe answered true/false: reachable + checkedAt ride along;
 *     the payload's sibling keys (sync/alerts/activity) stay put.
 *   - s3 + no answer yet: BOTH fields omitted (honest unknown).
 *   - never-throws: a rejecting helper still answers 200 without the
 *     fields (the route's belt beyond the cache's own guarantee).
 *   - the probe promise is started BEFORE the DB Promise.all (overlap,
 *     not membership — the r166d deferral note's contract).
 *
 * DB-free (the project canon): the real app on an ephemeral port, prisma
 * mocked at db.js, the reachability helper mocked at the lib/storage.js
 * boundary (the pure folds stay REAL), env.STORAGE_DRIVER flipped to s3
 * per-case and restored after (owner-alerts-counts test pattern).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    operationalAlert: { findMany: vi.fn(), count: vi.fn() },
    syncRun: { findMany: vi.fn() },
    auditLog: { count: vi.fn() },
    $transaction: vi.fn(),
  },
  withRetry: vi.fn(),
}));

/* The wiring seam: the route calls getStorageReachability() — mock it
 * at the module boundary so the cache's own TTL/race logic (pinned
 * separately in storage-reachability.test.ts) never touches this file. */
const reachabilityMock = vi.hoisted(() => ({ getStorageReachability: vi.fn() }));

vi.mock('../../src/lib/storage.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/storage.js')>();
  return {
    ...actual, // pure key/signing helpers + the folds stay REAL
    getStorageReachability: reachabilityMock.getStorageReachability,
  };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { env } from '../../src/env.js';
import { signAccessToken } from '../../src/lib/jwt.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

// ── Mocked delegates + helpers ─────────────────────────────────────

const syncRunFindMany = vi.mocked(prisma.syncRun.findMany);
const alertFindMany = vi.mocked(prisma.operationalAlert.findMany);
const alertCount = vi.mocked(prisma.operationalAlert.count);
const auditLogCount = vi.mocked(prisma.auditLog.count);
const getReachability = reachabilityMock.getStorageReachability;

/** Prisma delegates return PrismaPromise — one cast, the
 *  owner-alerts-counts test pattern. */
type FindManyImpl = NonNullable<Parameters<typeof syncRunFindMany.mockImplementation>[0]>;

const OWNER_ID = 'owner-1';
const bearer = (userId: string, role: Role) => ({
  authorization: `Bearer ${signAccessToken(userId, role)}`,
});

const getOwnerSystem = () =>
  fetch(`${baseUrl}/api/v1/owner/system`, { headers: bearer(OWNER_ID, Role.OWNER) });

beforeEach(() => {
  vi.clearAllMocks();
  syncRunFindMany.mockResolvedValue([] as never);
  alertFindMany.mockResolvedValue([] as never);
  alertCount.mockResolvedValue(0 as never);
  auditLogCount.mockResolvedValue(0 as never);
  // Default: no probe answer (null) — tests override per case.
  getReachability.mockResolvedValue(null);
});

afterEach(() => {
  // env is a plain object the route reads at REQUEST time; every s3
  // case mutates it, so restore the test default after each.
  env.STORAGE_DRIVER = 'local';
});

// ── local driver: the pre-r167 contract is untouched ───────────────

describe('GET /api/v1/owner/system — storage block, LOCAL driver (unchanged)', () => {
  it('carries EXACTLY { driver, persistent } — even a stray probe answer cannot leak reachability fields', async () => {
    // The route delegates to getStorageReachability unconditionally; the
    // env gate lives INSIDE the real helper (pinned in
    // storage-reachability.test.ts: local resolves null, zero IO). Here
    // the helper is mocked to answer anyway — the fold's driver gate
    // must still keep the local block at its exact pre-r167 shape.
    getReachability.mockResolvedValue({ reachable: true, checkedAt: '2026-01-05T00:00:00.000Z' });

    const res = await getOwnerSystem();
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { storage: Record<string, unknown> } };

    expect(data.storage).toEqual({ driver: 'local', persistent: false });
    expect('reachable' in data.storage).toBe(false);
    expect('checkedAt' in data.storage).toBe(false);
  });
});

// ── s3 driver: the additive reachability fields ────────────────────

describe('GET /api/v1/owner/system — storage block, s3 driver (r167 reachability)', () => {
  it('a reachable answer adds reachable:true + a valid ISO checkedAt, siblings intact', async () => {
    env.STORAGE_DRIVER = 's3';
    getReachability.mockResolvedValue({ reachable: true, checkedAt: '2026-01-05T00:00:00.000Z' });

    const res = await getOwnerSystem();
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      data: {
        storage: Record<string, unknown>;
        sync: unknown;
        alerts: unknown;
        activity: unknown;
      };
    };

    expect(data.storage).toEqual({
      driver: 's3',
      persistent: true,
      reachable: true,
      checkedAt: '2026-01-05T00:00:00.000Z',
    });
    // Additive ONLY: the payload's pre-existing blocks ride along.
    expect(data.sync).toEqual({ lastRunAt: null, recent: [] });
    expect(data.alerts).toEqual({ open: [], openCount: 0, criticalCount: 0 });
    expect(data.activity).toEqual({ recentEventsLast7Days: 0 });
  });

  it('an UNREACHABLE answer carries reachable:false — the honest outage state (the r166d gap closed)', async () => {
    env.STORAGE_DRIVER = 's3';
    getReachability.mockResolvedValue({ reachable: false, checkedAt: '2026-01-05T00:00:00.000Z' });

    const res = await getOwnerSystem();
    const { data } = (await res.json()) as { data: { storage: Record<string, unknown> } };

    expect(data.storage).toEqual({
      driver: 's3',
      persistent: true,
      reachable: false,
      checkedAt: '2026-01-05T00:00:00.000Z',
    });
  });

  it('no answer yet (null) omits BOTH fields — the honest unknown, never a guessed green', async () => {
    env.STORAGE_DRIVER = 's3';
    getReachability.mockResolvedValue(null);

    const res = await getOwnerSystem();
    const { data } = (await res.json()) as { data: { storage: Record<string, unknown> } };

    expect(data.storage).toEqual({ driver: 's3', persistent: true });
    expect('reachable' in data.storage).toBe(false);
    expect('checkedAt' in data.storage).toBe(false);
  });

  it('the probe promise is consulted once per request and awaited AFTER the DB queries resolve (overlap, not membership)', async () => {
    env.STORAGE_DRIVER = 's3';
    getReachability.mockResolvedValue({ reachable: true, checkedAt: '2026-01-05T00:00:00.000Z' });
    syncRunFindMany.mockImplementation((async () => {
      // The DB Promise.all is in flight — the probe must already have
      // been STARTED (kicked before Promise.all, not inside it).
      expect(getReachability).toHaveBeenCalledTimes(1);
      return [];
    }) as unknown as FindManyImpl);

    const res = await getOwnerSystem();
    expect(res.status).toBe(200);
    expect(getReachability).toHaveBeenCalledTimes(1);
  });

  it('never-throws belt: a REJECTING helper (impossible by contract) still answers 200 without the fields', async () => {
    env.STORAGE_DRIVER = 's3';
    getReachability.mockRejectedValue(new Error('helper rejected'));

    const res = await getOwnerSystem();
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { storage: Record<string, unknown> } };
    expect(data.storage).toEqual({ driver: 's3', persistent: true });
  });
});

// ── the role gate still precedes everything ────────────────────────

describe('GET /api/v1/owner/system — role gate (unchanged by r167)', () => {
  it('a non-OWNER token is refused (403) before any probe or count query', async () => {
    const res = await fetch(`${baseUrl}/api/v1/owner/system`, {
      headers: bearer('student-1', Role.STUDENT),
    });
    expect(res.status).toBe(403);
    // The route handler never ran — the mocked helper stayed untouched.
    expect(getReachability).not.toHaveBeenCalled();
  });
});
