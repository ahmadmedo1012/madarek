/**
 * Backend regression test — public GET /faculties (audit 4-A13 P0-1).
 *
 * The route's own section comment always said "public catalog", but TWO
 * ordering layers swallowed it and every ANONYMOUS visitor of
 * /auth/register got a 401 — the faculties select never rendered and
 * self-serve registration was impossible:
 *   1. inside the catalog router: the route was declared BELOW the
 *      router-level `router.use(authMiddleware)`;
 *   2. at the app level: meRoutes (broad `/api/v1` mount + router-level
 *      authMiddleware) is registered before catalogRoutes, so even a
 *      router-internal fix never ran for anonymous requests.
 *
 * This suite pins the fix through the REAL app (createApp, ephemeral
 * port) so BOTH layers are exercised exactly as in production:
 *   - GET /faculties with NO authorization header → 200 + the
 *     page-shaped { data: [...] } envelope,
 *   - the projection is PII-safe: names/ids/emoji/city only — no
 *     nameEn/createdAt/facultyId leaks (and the prisma call itself is
 *     asserted to carry the narrow select),
 *   - the auth gate still guards the REST of the catalog router
 *     (library) and the role-guarded admin surface — anonymous
 *     requests there stay 401 in the standard error envelope.
 *
 * DB-free: prisma is mocked (the pattern of auth-login-timing /
 * governance tests); only faculty.findMany is ever reached.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('../../src/db.js', () => ({
  prisma: {
    faculty: { findMany: vi.fn() },
  },
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';

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

beforeEach(() => {
  vi.clearAllMocks();
});

const get = (path: string) => fetch(`${baseUrl}${path}`);

describe('GET /api/v1/faculties — public catalog (audit 4-A13 P0-1)', () => {
  beforeEach(() => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([
      {
        id: 'fac-1',
        name: 'كلية الآداب',
        iconEmoji: '📚',
        city: 'الزاوية',
        departments: [
          { id: 'dep-1', name: 'قسم اللغة العربية' },
          { id: 'dep-2', name: 'قسم التاريخ' },
        ],
      },
    ] as never);
  });

  it('answers 200 WITHOUT an authorization header (anonymous register funnel)', async () => {
    const res = await get('/api/v1/faculties');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('ships the register-page shape: faculty {id,name,iconEmoji,city,departments[{id,name}]}', async () => {
    const res = await get('/api/v1/faculties');
    const body = (await res.json()) as { data: Array<Record<string, unknown>> };
    const faculty = body.data[0]!;
    expect(faculty).toEqual({
      id: 'fac-1',
      name: 'كلية الآداب',
      iconEmoji: '📚',
      city: 'الزاوية',
      departments: [
        { id: 'dep-1', name: 'قسم اللغة العربية' },
        { id: 'dep-2', name: 'قسم التاريخ' },
      ],
    });
    // PII/narrowness guard — toEqual above already fails on extra keys,
    // but the exact-key list is the contract, spelled out:
    expect(Object.keys(faculty).sort()).toEqual(['city', 'departments', 'iconEmoji', 'id', 'name']);
    const departments = faculty.departments as Array<object>;
    expect(Object.keys(departments[0]!).sort()).toEqual(['id', 'name']);
  });

  it('queries with the PII-safe projection (no full-row include)', async () => {
    await get('/api/v1/faculties');
    expect(prisma.faculty.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          name: true,
          iconEmoji: true,
          city: true,
          departments: { select: { id: true, name: true } },
        },
      }),
    );
  });
});

describe('the auth gate still guards everything else in the catalog router', () => {
  it('anonymous GET /api/v1/library/books stays 401 with the standard envelope', async () => {
    const res = await get('/api/v1/library/books');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHENTICATED');
    // The handler never ran — no catalog query was issued.
    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
  });

  it('anonymous GET /api/v1/admin/faculties stays 401 (role-guarded surface untouched)', async () => {
    const res = await get('/api/v1/admin/faculties');
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');
  });

  it('anonymous /me routes (the router that used to shadow /faculties) stay 401', async () => {
    const res = await get('/api/v1/notifications');
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');
  });
});
