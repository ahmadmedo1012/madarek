/**
 * Backend unit test — r181 (phase-8 owner setup): the OWNER console's
 * institution-scoped read surfaces in backend/src/http/routes/.
 *
 * The r180 academic-supply-chain round shipped OWNER write paths for
 * faculties/departments (?institutionSlug=) but the console's two READ
 * surfaces stayed platform-wide or ADMIN-shaped, so an owner-side
 * institution setup page had no scoped data sources:
 *  · GET /admin/courses now honors ?institutionSlug= for OWNER callers
 *    (the public GET /courses `in`-list convention — an unknown or
 *    suspended slug matches NOTHING, never a silent fall-back to the
 *    platform-wide catalogue; ADMIN callers keep their DB-verified
 *    scope and the param is ignored for them);
 *  · GET /owner/users now honors ?institutionSlug= — the roster
 *    narrows to users holding an ACTIVE membership in that
 *    institution (unknown/suspended slug matches nothing), powering
 *    the offering-create teacher picker without inventing a
 *    membership context for the OWNER.
 *
 * DB-free (project canon): prisma is mocked at db.js; the REAL app on
 * an ephemeral port with signed role+inst JWTs (the
 * catalog-structure-create pattern).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    membership: { findFirst: vi.fn() },
    institution: { findMany: vi.fn(), findUnique: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
    course: { findMany: vi.fn(), count: vi.fn() },
    // Defensive: the error handler's 5xx alert feed (no 5xx is expected
    // in this suite — a 500 here should FAIL the test, not the mock).
    operationalAlert: { create: vi.fn(async () => ({})) },
  };
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

const OWNER_ID = 'owner-o1';
const ADMIN_ID = 'admin-a1';
const INST_A = 'inst-a';
const INST_B = 'inst-b';
const SLUG_A = 'zawia-showcase';
const SLUG_B = 'alandalus-demo';

const bearerFor = (userId: string, role: Role, institutionId: string | null) => ({
  authorization: `Bearer ${signAccessToken(userId, role, institutionId)}`,
});

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(() => {
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
  // resolveCallerInstitutionScope re-verifies the token's inst claim:
  // an institutionId in the where resolves (ACTIVE membership), none
  // of the caller's business otherwise.
  vi.mocked(prisma.membership.findFirst).mockImplementation(
    (async (args: unknown) => {
      const where = (args as { where?: { institutionId?: string } } | undefined)?.where;
      return where?.institutionId ? { institutionId: where.institutionId } : null;
    }) as never,
  );
  // The institution slug resolution: SLUG_A/SLUG_B are ACTIVE rows;
  // anything else (or a deliberately suspended row) matches nothing.
  vi.mocked(prisma.institution.findMany).mockImplementation(
    (async (args: unknown) => {
      const where = (args as { where?: { slug?: string; status?: string } } | undefined)?.where;
      if (where?.slug === SLUG_A) return [{ id: INST_A }];
      if (where?.slug === SLUG_B) return [{ id: INST_B }];
      return [];
    }) as never,
  );
});

const get = (path: string, headers: Record<string, string>) =>
  fetch(`${baseUrl}${path}`, { headers });

describe('GET /api/v1/admin/courses?institutionSlug= (r181 — OWNER narrowing)', () => {
  it('scopes the OWNER listing to the resolved ACTIVE institution', async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.course.count).mockResolvedValue(0 as never);

    const res = await get(
      '/api/v1/admin/courses?institutionSlug=zawia-showcase',
      bearerFor(OWNER_ID, Role.OWNER, null),
    );

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.course.findMany).mock.calls[0]?.[0] as {
      where?: { institutionId?: { in?: string[] } };
    };
    expect(where?.where?.institutionId).toEqual({ in: [INST_A] });
  });

  it('an unknown slug matches NOTHING — never a silent platform-wide fall-back', async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.course.count).mockResolvedValue(0 as never);

    const res = await get(
      '/api/v1/admin/courses?institutionSlug=no-such-institution',
      bearerFor(OWNER_ID, Role.OWNER, null),
    );

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.course.findMany).mock.calls[0]?.[0] as {
      where?: { institutionId?: { in?: string[] } };
    };
    expect(where?.where?.institutionId).toEqual({ in: [] });
  });

  it('OWNER without a slug keeps the platform-wide catalogue (no institution filter)', async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.course.count).mockResolvedValue(0 as never);

    const res = await get('/api/v1/admin/courses', bearerFor(OWNER_ID, Role.OWNER, null));

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.course.findMany).mock.calls[0]?.[0] as {
      where?: { institutionId?: unknown };
    };
    expect(where?.where?.institutionId).toBeUndefined();
  });

  it('ADMIN callers keep their DB-verified scope; a sent slug is ignored for them', async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.course.count).mockResolvedValue(0 as never);

    const res = await get(
      '/api/v1/admin/courses?institutionSlug=alandalus-demo',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_B),
    );

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.course.findMany).mock.calls[0]?.[0] as {
      where?: { institutionId?: string };
    };
    // The ADMIN's OWN verified context wins — not the client-supplied
    // slug (a foreign slug must not widen or shift an admin's scope).
    expect(where?.where?.institutionId).toBe(INST_B);
  });
});

describe('GET /api/v1/owner/users?institutionSlug= (r181 — membership-scoped roster)', () => {
  it('narrows the roster to ACTIVE memberships in the resolved institution', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never);

    const res = await get(
      '/api/v1/owner/users?institutionSlug=zawia-showcase',
      bearerFor(OWNER_ID, Role.OWNER, null),
    );

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as {
      where?: { memberships?: { some?: { institutionId?: { in?: string[] }; isActive?: boolean } } };
    };
    expect(where?.where?.memberships?.some?.institutionId).toEqual({ in: [INST_A] });
    expect(where?.where?.memberships?.some?.isActive).toBe(true);
  });

  it('an unknown/suspended slug matches nothing (empty roster, never the platform roster)', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never);

    const res = await get(
      '/api/v1/owner/users?institutionSlug=no-such-institution',
      bearerFor(OWNER_ID, Role.OWNER, null),
    );

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as {
      where?: { memberships?: { some?: { institutionId?: { in?: string[] } } } };
    };
    expect(where?.where?.memberships?.some?.institutionId).toEqual({ in: [] });
  });

  it('no slug keeps the platform-wide roster (the OwnerUsersPage contract, unchanged)', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never);

    const res = await get('/api/v1/owner/users', bearerFor(OWNER_ID, Role.OWNER, null));

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as {
      where?: { memberships?: unknown };
    };
    expect(where?.where?.memberships).toBeUndefined();
  });

  it('role + institutionSlug compose (the offering teacher picker query)', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never);

    /* limit=200 — the picker window cap the /admin/users roster shares
     * (r181: the FE picker sends it; the route must accept the same
     * hard cap its ADMIN twin does, else the picker 400s empty). */
    const res = await get(
      '/api/v1/owner/users?role=TEACHER&institutionSlug=zawia-showcase&limit=200',
      bearerFor(OWNER_ID, Role.OWNER, null),
    );

    expect(res.status).toBe(200);
    const where = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as {
      where?: {
        role?: Role;
        memberships?: { some?: { institutionId?: { in?: string[] } } };
      };
    };
    expect(where?.where?.role).toBe(Role.TEACHER);
    expect(where?.where?.memberships?.some?.institutionId).toEqual({ in: [INST_A] });
  });

  it('stays OWNER-only — an ADMIN bearer is rejected at the router guard', async () => {
    const res = await get(
      '/api/v1/owner/users?institutionSlug=zawia-showcase',
      bearerFor(ADMIN_ID, Role.ADMIN, INST_A),
    );

    expect(res.status).toBe(403);
  });

  /* r183-B5 (A9 wave-A P2 — the directory's institution scope): the
   * roster's select now carries the ACTIVE memberships + institution
   * identity, so the OwnerUsersPage «المؤسسات» column reads real data
   * (additive field — the r178 courseInstitutionSelect convention). */
  it('ships the ACTIVE memberships + institution identity in every roster row', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never);

    const res = await get('/api/v1/owner/users', bearerFor(OWNER_ID, Role.OWNER, null));

    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as {
      select?: {
        memberships?: {
          where?: { isActive?: boolean };
          select?: unknown;
          orderBy?: unknown;
        };
      };
    };
    // ACTIVE memberships only (revoked rows stay out — the institutions
    // console owns that view), deterministic chip order, and the exact
    // institution projection the frontend column consumes.
    expect(args?.select?.memberships?.where).toEqual({ isActive: true });
    expect(args?.select?.memberships?.orderBy).toEqual([{ institution: { name: 'asc' } }]);
    expect(args?.select?.memberships?.select).toEqual({
      institution: { select: { id: true, name: true, slug: true, status: true } },
    });
  });
});
