/**
 * Backend unit test — the r179d (phase-5) institution scoping of the
 * sync routes (`backend/src/http/routes/sync.routes.ts`), DB-free
 * through the REAL app (createApp, ephemeral port — the pattern of
 * tests/modules/colleges-public-access.test.ts) with prisma and the
 * scheduler's guard mocked and JWTs signed via signAccessToken.
 *
 *   GET /university/facts — PUBLIC (no auth): exactly ONE institution's
 *     facts via ?institution=slug, default the showcase; unknown slug
 *     404s; institutions are never blended.
 *   GET /admin/sync — ADMIN/QUALITY see THEIR verified institution's
 *     runs + facts; a contextless institutional caller 403s
 *     INSTITUTION_CONTEXT_REQUIRED; ?institution is OWNER-only
 *     (non-OWNER → 403); OWNER defaults to the platform-wide view and
 *     may narrow with ?institution=slug (unknown → 404).
 *   POST /admin/sync/trigger — ADMIN triggers THEIR institution (an
 *     institution without a configured source → honest 400; contextless
 *     → 403; forged context → INSTITUTION_CONTEXT_INVALID); OWNER
 *     triggers any institution explicitly or the showcase default;
 *     the overlap answer is 409.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { SyncResult } from '../../src/lib/zu-sync/index.js';

vi.mock('../../src/scheduler.js', () => ({
  runSyncGuarded: vi.fn(),
}));
vi.mock('../../src/db.js', () => ({
  prisma: {
    institution: { findUnique: vi.fn(), findMany: vi.fn() },
    membership: { findFirst: vi.fn() },
    syncRun: { findFirst: vi.fn(), findMany: vi.fn() },
    universityFact: { findMany: vi.fn(), count: vi.fn() },
    rolePermission: { findMany: vi.fn() },
    userPermission: { findMany: vi.fn() },
  },
  // Defensive: other modules in the app graph import withRetry from db.js.
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { runSyncGuarded } from '../../src/scheduler.js';
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

// ── Fixtures ────────────────────────────────────────────────────────

const ZAWIA = { id: 'inst-zawia-showcase', slug: 'zawia-showcase', name: 'جامعة الزاوية' };
const OTHER = { id: 'inst-other', slug: 'other-demo', name: 'مؤسسة أخرى' };

const FACT_ROWS = [
  {
    institutionId: ZAWIA.id, key: 'name.ar', value: 'جامعة الزاوية',
    category: 'identity', source: 'zu.edu.ly:about', isStale: false, syncedAt: new Date(),
  },
  {
    institutionId: OTHER.id, key: 'name.ar', value: 'قيمة الأندلس',
    category: 'identity', source: 'manual', isStale: true, syncedAt: new Date(),
  },
];

const RUN_ROWS = [
  {
    id: 'run-zawia-1', institutionId: ZAWIA.id, startedAt: new Date(), completedAt: new Date(),
    status: 'SUCCESS', source: 'static-markdown', factsAdded: 38, factsUpdated: 0,
    durationMs: 12, errorMsg: null, notes: null, institution: ZAWIA,
  },
];

const institutionFindUnique = vi.mocked(prisma.institution.findUnique);
const institutionFindMany = vi.mocked(prisma.institution.findMany);
const membershipFindFirst = vi.mocked(prisma.membership.findFirst);
const syncRunFindFirst = vi.mocked(prisma.syncRun.findFirst);
const syncRunFindMany = vi.mocked(prisma.syncRun.findMany);
const factFindMany = vi.mocked(prisma.universityFact.findMany);
const factCount = vi.mocked(prisma.universityFact.count);
const rolePermissionFindMany = vi.mocked(prisma.rolePermission.findMany);
const userPermissionFindMany = vi.mocked(prisma.userPermission.findMany);
const runSyncGuardedMock = vi.mocked(runSyncGuarded);

const syncSuccess = (runId: string): SyncResult => ({
  runId, status: 'SUCCESS', factsAdded: 38, factsUpdated: 0,
  durationMs: 12, errorMsg: null, notes: null,
});

beforeEach(() => {
  vi.clearAllMocks();

  // Capability layers: empty DB layers → pure role-default capabilities
  // (ADMIN: USERS_MANAGE, QUALITY: QUALITY_VIEW, OWNER: everything).
  rolePermissionFindMany.mockResolvedValue([]);
  userPermissionFindMany.mockResolvedValue([]);

  // resolveCallerInstitutionScope: an ACTIVE membership exists for the
  // two fixture institutions; any other inst claim resolves to null
  // (→ INSTITUTION_CONTEXT_INVALID — the forged/stale case).
  membershipFindFirst.mockImplementation((async ({ where }: {
    where: { userId: string; institutionId: string };
  }) =>
    where.institutionId === ZAWIA.id || where.institutionId === OTHER.id
      ? { institutionId: where.institutionId }
      : null
  ) as unknown as NonNullable<Parameters<typeof membershipFindFirst.mockImplementation>[0]>);

  institutionFindUnique.mockImplementation((async ({ where }: {
    where: { id?: string; slug?: string };
  }) => {
    if (where.slug === ZAWIA.slug || where.id === ZAWIA.id) return ZAWIA;
    if (where.slug === OTHER.slug || where.id === OTHER.id) return OTHER;
    return null;
  }) as unknown as NonNullable<Parameters<typeof institutionFindUnique.mockImplementation>[0]>);

  // Platform-wide OWNER directory.
  institutionFindMany.mockResolvedValue([ZAWIA, OTHER] as never);

  factFindMany.mockImplementation((async ({ where }: { where?: { institutionId?: string } }) =>
    where?.institutionId
      ? FACT_ROWS.filter((f) => f.institutionId === where.institutionId)
      : FACT_ROWS
  ) as unknown as NonNullable<Parameters<typeof factFindMany.mockImplementation>[0]>);

  factCount.mockImplementation((async ({ where }: { where?: { institutionId?: string; isStale?: boolean } }) => {
    let rows = where?.institutionId
      ? FACT_ROWS.filter((f) => f.institutionId === where.institutionId)
      : FACT_ROWS;
    if (where?.isStale) rows = rows.filter((f) => f.isStale);
    return rows.length;
  }) as unknown as NonNullable<Parameters<typeof factCount.mockImplementation>[0]>);

  const runsFor = (institutionId?: string) =>
    institutionId ? RUN_ROWS.filter((r) => r.institutionId === institutionId) : RUN_ROWS;
  syncRunFindFirst.mockImplementation((async ({ where }: { where?: { institutionId?: string } }) =>
    runsFor(where?.institutionId)[0] ?? null
  ) as unknown as NonNullable<Parameters<typeof syncRunFindFirst.mockImplementation>[0]>);
  syncRunFindMany.mockImplementation((async ({ where }: { where?: { institutionId?: string } }) =>
    runsFor(where?.institutionId)
  ) as unknown as NonNullable<Parameters<typeof syncRunFindMany.mockImplementation>[0]>);

  runSyncGuardedMock.mockResolvedValue({ ran: true, result: syncSuccess('run-new') });
});

const get = (path: string, token?: string) =>
  fetch(`${baseUrl}${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : undefined);

const post = (path: string, token?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });

// ── GET /university/facts — PUBLIC, one institution, never blended ──

describe('GET /api/v1/university/facts — public per-institution facts', () => {
  it('answers 200 WITHOUT an authorization header (public landing feed)', async () => {
    const res = await get('/api/v1/university/facts');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { institution: { slug: string }; categories: Record<string, Record<string, string>> };
    };
    expect(body.data.institution.slug).toBe('zawia-showcase');
    expect(body.data.categories.identity!['name.ar']).toBe('جامعة الزاوية');
    // No auth → no membership re-resolution ever runs on this path.
    expect(membershipFindFirst).not.toHaveBeenCalled();
  });

  it('serves ?institution=other-demo with ONLY that institution\'s facts', async () => {
    const res = await get('/api/v1/university/facts?institution=other-demo');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { institution: { slug: string }; categories: Record<string, Record<string, string>> };
    };
    expect(body.data.institution.slug).toBe('other-demo');
    expect(body.data.categories.identity!['name.ar']).toBe('قيمة الأندلس');
    // The fact query is filtered to that institution — never a blend.
    expect(factFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: OTHER.id } }),
    );
  });

  it('404s an unknown institution slug', async () => {
    const res = await get('/api/v1/university/facts?institution=ghost');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });
});

// ── GET /admin/sync — the scoped admin/quality view ────────────────

describe('GET /api/v1/admin/sync — ADMIN/QUALITY institution-scoped view', () => {
  it('shows the caller\'s institution facts + runs (context re-verified)', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', ZAWIA.id);
    const res = await get('/api/v1/admin/sync', token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        institution: { slug: string } | null;
        hasSyncSource: boolean | null;
        latestRun: { institutionId: string } | null;
        factCount: number;
        staleCount: number;
        categories: Array<{ items: Array<{ key: string; value: string }> }>;
      };
    };
    expect(body.data.institution!.slug).toBe('zawia-showcase');
    expect(body.data.hasSyncSource).toBe(true);
    expect(body.data.factCount).toBe(1);
    expect(body.data.staleCount).toBe(0);
    // Runs + facts are filtered to the caller's institution only.
    expect(syncRunFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: ZAWIA.id } }),
    );
    expect(factFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: ZAWIA.id } }),
    );
    expect(body.data.categories[0]!.items[0]!.value).toBe('جامعة الزاوية');
  });

  it('a contextless ADMIN gets 403 INSTITUTION_CONTEXT_REQUIRED (no institution guessing)', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', null);
    const res = await get('/api/v1/admin/sync', token);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'INSTITUTION_CONTEXT_REQUIRED',
    );
    // Nothing institution-scoped ran for a contextless caller.
    expect(factFindMany).not.toHaveBeenCalled();
    expect(syncRunFindFirst).not.toHaveBeenCalled();
  });

  it('a forged/stale institution claim gets 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', 'inst-forged');
    const res = await get('/api/v1/admin/sync', token);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'INSTITUTION_CONTEXT_INVALID',
    );
  });

  it('a non-OWNER passing ?institution is rejected (no institution pivoting)', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', ZAWIA.id);
    const res = await get('/api/v1/admin/sync?institution=other-demo', token);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('FORBIDDEN');
    expect(factFindMany).not.toHaveBeenCalled();
  });

  it('QUALITY (QUALITY_VIEW) reads their institution\'s view', async () => {
    const token = signAccessToken('quality-1', 'QUALITY', ZAWIA.id);
    const res = await get('/api/v1/admin/sync', token);
    expect(res.status).toBe(200);
    expect(factFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: ZAWIA.id } }),
    );
  });

  it('STUDENT is rejected by the capability gate', async () => {
    const token = signAccessToken('student-1', 'STUDENT', ZAWIA.id);
    const res = await get('/api/v1/admin/sync', token);
    expect(res.status).toBe(403);
  });
});

// ── GET /admin/sync — the OWNER oversight views ─────────────────────

describe('GET /api/v1/admin/sync — OWNER views', () => {
  it('default: platform-wide (all institutions\' facts + per-institution summary)', async () => {
    const token = signAccessToken('owner-1', 'OWNER', null);
    const res = await get('/api/v1/admin/sync', token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        institution: null;
        institutions: Array<{
          slug: string; factCount: number; staleCount: number; hasSyncSource: boolean;
        }>;
        factCount: number;
        categories: Array<{ items: Array<{ institutionSlug: string | null }> }>;
      };
    };
    expect(body.data.institution).toBeNull();
    // Unfiltered run/fact queries (the platform-wide oversight view).
    expect(factFindMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ where: { institutionId: expect.any(String) } }),
    );
    // The per-institution switchboard: both institutions, with the
    // showcase flagged as the only one with a configured source.
    expect(body.data.institutions).toEqual([
      { id: ZAWIA.id, name: ZAWIA.name, slug: ZAWIA.slug, factCount: 1, staleCount: 0, hasSyncSource: true },
      { id: OTHER.id, name: OTHER.name, slug: OTHER.slug, factCount: 1, staleCount: 1, hasSyncSource: false },
    ]);
    // Platform-wide fact items carry their institution slug.
    const slugs = body.data.categories[0]!.items.map((i) => i.institutionSlug).sort();
    expect(slugs).toEqual(['other-demo', 'zawia-showcase']);
  });

  it('?institution=slug narrows the view to that institution', async () => {
    const token = signAccessToken('owner-1', 'OWNER', null);
    const res = await get('/api/v1/admin/sync?institution=other-demo', token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { institution: { slug: string }; hasSyncSource: boolean } };
    expect(body.data.institution.slug).toBe('other-demo');
    expect(body.data.hasSyncSource).toBe(false);
    expect(factFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { institutionId: OTHER.id } }),
    );
  });

  it('?institution=ghost 404s', async () => {
    const token = signAccessToken('owner-1', 'OWNER', null);
    const res = await get('/api/v1/admin/sync?institution=ghost', token);
    expect(res.status).toBe(404);
  });
});

// ── POST /admin/sync/trigger — institution-scoped trigger ───────────

describe('POST /api/v1/admin/sync/trigger', () => {
  it('an ADMIN with a configured institution triggers THEIR sync with its source', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', ZAWIA.id);
    const res = await post('/api/v1/admin/sync/trigger', token);
    expect(res.status).toBe(200);
    expect(runSyncGuardedMock).toHaveBeenCalledTimes(1);
    expect(runSyncGuardedMock).toHaveBeenCalledWith('admin-trigger', {
      institutionId: ZAWIA.id,
      source: 'static-markdown',
    });
    const body = (await res.json()) as { data: { runId: string; status: string } };
    expect(body.data.runId).toBe('run-new');
  });

  it('an ADMIN of an institution WITHOUT a configured source gets an honest 400', async () => {
    const token = signAccessToken('admin-2', 'ADMIN', OTHER.id);
    const res = await post('/api/v1/admin/sync/trigger', token);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
    // D17-3: honest Arabic message — no source configured for this
    // institution (the Zawia source is not a global default).
    expect(body.error.message).toContain('لا يوجد مصدر مزامنة');
    expect(runSyncGuardedMock).not.toHaveBeenCalled();
  });

  it('a contextless ADMIN gets 403 INSTITUTION_CONTEXT_REQUIRED', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', null);
    const res = await post('/api/v1/admin/sync/trigger', token);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'INSTITUTION_CONTEXT_REQUIRED',
    );
    expect(runSyncGuardedMock).not.toHaveBeenCalled();
  });

  it('a forged institution claim gets 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', 'inst-forged');
    const res = await post('/api/v1/admin/sync/trigger', token);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'INSTITUTION_CONTEXT_INVALID',
    );
  });

  it('OWNER default triggers the showcase institution\'s sync', async () => {
    const token = signAccessToken('owner-1', 'OWNER', null);
    const res = await post('/api/v1/admin/sync/trigger', token);
    expect(res.status).toBe(200);
    expect(institutionFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'zawia-showcase' } }),
    );
    expect(runSyncGuardedMock).toHaveBeenCalledWith('admin-trigger', {
      institutionId: ZAWIA.id,
      source: 'static-markdown',
    });
  });

  it('OWNER ?institution=slug triggers that institution (400 when it has no source)', async () => {
    const token = signAccessToken('owner-1', 'OWNER', null);
    const res = await post('/api/v1/admin/sync/trigger?institution=other-demo', token);
    expect(res.status).toBe(400);
    expect(runSyncGuardedMock).not.toHaveBeenCalled();
  });

  it('OWNER ?institution=ghost 404s', async () => {
    const token = signAccessToken('owner-1', 'OWNER', null);
    const res = await post('/api/v1/admin/sync/trigger?institution=ghost', token);
    expect(res.status).toBe(404);
    expect(runSyncGuardedMock).not.toHaveBeenCalled();
  });

  it('an in-flight sync for the same institution answers 409 (overlap guard)', async () => {
    runSyncGuardedMock.mockResolvedValueOnce({ ran: false, reason: 'overlap' });
    const token = signAccessToken('admin-1', 'ADMIN', ZAWIA.id);
    const res = await post('/api/v1/admin/sync/trigger', token);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('CONFLICT');
  });

  it('STUDENT is rejected by the capability gate', async () => {
    const token = signAccessToken('student-1', 'STUDENT', ZAWIA.id);
    const res = await post('/api/v1/admin/sync/trigger', token);
    expect(res.status).toBe(403);
    expect(runSyncGuardedMock).not.toHaveBeenCalled();
  });
});
