/**
 * DB integration — r179d (phase-5): university-sync institution
 * isolation, against a REAL disposable Postgres through the REAL app
 * (createApp().listen(0)), the REAL PrismaClient singleton and the
 * REAL runSync — no mocks (the integration canon). Every scenario
 * asserts BOTH the HTTP envelope and the database state.
 *
 *   S1  runSync(A) updates A's facts and NEVER touches B's (values,
 *       isStale, row counts, run history) — the composite
 *       (institutionId, key) upserts and scoped stale-marking.
 *   S2  POST /admin/sync/trigger: B's admin (institution with NO
 *       configured source) gets an honest 400; A's admin triggers
 *       A's sync; contextless admin → 403 INSTITUTION_CONTEXT_REQUIRED;
 *       forged context → 403 INSTITUTION_CONTEXT_INVALID; OWNER
 *       triggers the default showcase or an explicit institution.
 *   S3  GET /admin/sync: scoped views (A admin sees only A's runs +
 *       facts; B admin sees B's empty view), OWNER platform-wide +
 *       ?institution filter, non-OWNER pivot rejected.
 *   S4  GET /university/facts: PUBLIC (anonymous), exactly ONE
 *       institution per request (?institution=slug, default the
 *       showcase), never blended, unknown slug 404s.
 *
 * The showcase institution is seeded with the FIXED id + slug that
 * prisma/seed.ts uses, so the in-code registry
 * (INSTITUTION_SYNC_CONFIGS: zawia-showcase → static-markdown)
 * resolves for it; the second institution (random slug) is the "no
 * configured source" case.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { runSync } from '../../src/lib/zu-sync/index.js';
import { STATIC_FACTS } from '../../src/lib/zu-sync/static-source.js';
import { bearer, db, seedMembership, seedUser, truncateAll, uniqueSuffix } from './helpers.js';

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

beforeEach(async () => {
  await truncateAll(db());
});

// ── Fixture world ───────────────────────────────────────────────────

interface World {
  alpha: { id: string; slug: string; name: string };
  beta: { id: string; slug: string; name: string };
  adminA: { id: string };
  adminB: { id: string };
  qualityA: { id: string };
  owner: { id: string };
}

/**
 * Two institutions with OVERLAPPING fact keys (name.ar exists in both,
 * with different values) + an out-of-source key on each side (the
 * stale-marking isolation proof) + role users with memberships.
 */
async function seedWorld(): Promise<World> {
  const prisma = db();
  // alpha mirrors prisma/seed.ts: the FIXED showcase id + slug — the
  // registry's configured source applies to it.
  const alpha = await prisma.institution.create({
    data: { id: 'inst-zawia-showcase', name: 'جامعة الزاوية', slug: 'zawia-showcase' },
  });
  const beta = await prisma.institution.create({
    data: { name: 'مؤسسة الأندلس التجريبية', slug: `alandalus-${uniqueSuffix()}` },
  });

  await prisma.universityFact.create({
    data: {
      institutionId: alpha.id, key: 'name.ar', value: 'قيمة جامعة الزاوية القديمة',
      category: 'identity', source: 'manual', isStale: true,
    },
  });
  // A key NOT in STATIC_FACTS — A's own orphan (stale after A's sync).
  await prisma.universityFact.create({
    data: {
      institutionId: alpha.id, key: 'a.ghost', value: 'حقل مهجور',
      category: 'general', source: 'manual',
    },
  });
  await prisma.universityFact.create({
    data: {
      institutionId: beta.id, key: 'name.ar', value: 'بيانات الأندلس',
      category: 'identity', source: 'manual',
    },
  });
  // Also NOT in STATIC_FACTS — a naive global stale-marking would flag
  // it after A's sync; the institution-scoped one must not.
  await prisma.universityFact.create({
    data: {
      institutionId: beta.id, key: 'b.custom', value: 'خاص بالأندلس',
      category: 'general', source: 'manual',
    },
  });

  const adminA = await seedUser({ role: Role.ADMIN });
  await seedMembership(adminA.id, alpha.id, Role.ADMIN);
  const adminB = await seedUser({ role: Role.ADMIN });
  await seedMembership(adminB.id, beta.id, Role.ADMIN);
  const qualityA = await seedUser({ role: Role.QUALITY });
  await seedMembership(qualityA.id, alpha.id, Role.QUALITY);
  const owner = await seedUser({ role: Role.OWNER });

  return { alpha, beta, adminA, adminB, qualityA, owner };
}

const fact = (institutionId: string, key: string) =>
  db().universityFact.findUnique({ where: { institutionId_key: { institutionId, key } } });

const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}${path}`, { headers });

const post = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}${path}`, { method: 'POST', headers });

interface ErrorEnvelope {
  error: { code: string; message: string };
}

// ── S1 — runSync isolation (direct call, real DB) ──────────────────

describe('S1 — runSync(institution A) never touches institution B', () => {
  it('updates A\'s facts (value + stale flag + missing rows) and leaves B byte-for-byte intact', async () => {
    const { alpha, beta } = await seedWorld();

    const result = await runSync({ institutionId: alpha.id, source: 'static-markdown' });

    expect(result.status).toBe('SUCCESS');
    expect(result.factsAdded).toBe(STATIC_FACTS.length - 1); // name.ar existed (stale) → updated
    expect(result.factsUpdated).toBe(1);

    // A's overlapping key: refreshed + un-staled.
    const aName = await fact(alpha.id, 'name.ar');
    expect(aName?.value).toBe('جامعة الزاوية');
    expect(aName?.isStale).toBe(false);

    // A's own orphan (not in the source) IS stale-marked — scoped to A.
    const aGhost = await fact(alpha.id, 'a.ghost');
    expect(aGhost?.isStale).toBe(true);

    // A now holds every source fact + its orphan.
    expect(await db().universityFact.count({ where: { institutionId: alpha.id } })).toBe(
      STATIC_FACTS.length + 1,
    );

    // B is untouched: same key, its own value, never stale-marked.
    const bName = await fact(beta.id, 'name.ar');
    expect(bName?.value).toBe('بيانات الأندلس');
    expect(bName?.isStale).toBe(false);
    const bCustom = await fact(beta.id, 'b.custom');
    expect(bCustom?.isStale).toBe(false);
    expect(await db().universityFact.count({ where: { institutionId: beta.id } })).toBe(2);

    // Run history carries the institution: A has exactly one row, B none.
    expect(await db().syncRun.count({ where: { institutionId: alpha.id } })).toBe(1);
    expect(await db().syncRun.count({ where: { institutionId: beta.id } })).toBe(0);
  });

  it('a run for B (explicit source) mirrors the guarantee: B updates, A untouched', async () => {
    const { alpha, beta } = await seedWorld();

    await runSync({ institutionId: beta.id, source: 'static-markdown' });

    // B got the source facts + its own orphans stale-marked.
    const bName = await fact(beta.id, 'name.ar');
    expect(bName?.value).toBe('جامعة الزاوية');
    expect(await fact(beta.id, 'b.custom')).toMatchObject({ isStale: true });
    // A kept its seeded value and flags.
    expect(await fact(alpha.id, 'name.ar')).toMatchObject({
      value: 'قيمة جامعة الزاوية القديمة',
      isStale: true,
    });
    expect(await db().syncRun.count({ where: { institutionId: beta.id } })).toBe(1);
    expect(await db().syncRun.count({ where: { institutionId: alpha.id } })).toBe(0);
  });
});

// ── S2 — POST /admin/sync/trigger ──────────────────────────────────

describe('S2 — POST /api/v1/admin/sync/trigger (institution rules)', () => {
  it('an admin of an institution WITHOUT a configured source gets an honest 400 (nothing runs)', async () => {
    const { beta, adminB } = await seedWorld();

    const res = await post('/api/v1/admin/sync/trigger', bearer(adminB.id, Role.ADMIN, beta.id));

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('BAD_REQUEST');
    // D17-3: honest Arabic message — no source configured for THIS
    // institution (the Zawia source is not a global default).
    expect(body.error.message).toContain('لا يوجد مصدر مزامنة');
    // No run row was ever created for B.
    expect(await db().syncRun.count({ where: { institutionId: beta.id } })).toBe(0);
  });

  it("the showcase admin triggers THEIR institution's sync (200 + DB writes scoped to A)", async () => {
    const { alpha, beta, adminA } = await seedWorld();

    const res = await post('/api/v1/admin/sync/trigger', bearer(adminA.id, Role.ADMIN, alpha.id));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string; factsAdded: number } };
    expect(body.data.status).toBe('SUCCESS');
    expect(body.data.factsAdded).toBe(STATIC_FACTS.length - 1);

    // DB state: A synced, B untouched.
    expect(await fact(alpha.id, 'name.ar')).toMatchObject({ value: 'جامعة الزاوية', isStale: false });
    expect(await fact(beta.id, 'name.ar')).toMatchObject({ value: 'بيانات الأندلس', isStale: false });
    expect(await db().syncRun.count({ where: { institutionId: alpha.id } })).toBe(1);
  });

  it('a contextless admin gets 403 INSTITUTION_CONTEXT_REQUIRED (no guessing)', async () => {
    const { adminA } = await seedWorld();
    const res = await post('/api/v1/admin/sync/trigger', bearer(adminA.id, Role.ADMIN, null));
    expect(res.status).toBe(403);
    expect(((await res.json()) as ErrorEnvelope).error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('a forged/stale institution claim (no membership) gets 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const { beta, adminA } = await seedWorld();
    // adminA holds no membership in beta — a signed token with that
    // claim simulates a forged/stale context exactly (our own secret).
    const res = await post('/api/v1/admin/sync/trigger', bearer(adminA.id, Role.ADMIN, beta.id));
    expect(res.status).toBe(403);
    expect(((await res.json()) as ErrorEnvelope).error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });

  it('OWNER triggers the default showcase institution; an explicit unconfigured one 400s', async () => {
    const { alpha, beta, owner } = await seedWorld();

    const resDefault = await post('/api/v1/admin/sync/trigger', bearer(owner.id, Role.OWNER));
    expect(resDefault.status).toBe(200);
    expect(await db().syncRun.count({ where: { institutionId: alpha.id } })).toBe(1);

    const resExplicit = await post(
      `/api/v1/admin/sync/trigger?institution=${beta.slug}`,
      bearer(owner.id, Role.OWNER),
    );
    expect(resExplicit.status).toBe(400);
    expect(((await resExplicit.json()) as ErrorEnvelope).error.message).toContain('لا يوجد مصدر مزامنة');
  });
});

// ── S3 — GET /admin/sync (scoped views) ────────────────────────────

describe('S3 — GET /api/v1/admin/sync (scoped views)', () => {
  it("ADMIN/QUALITY see THEIR institution's runs + facts only", async () => {
    const { alpha, beta, adminA, adminB, qualityA } = await seedWorld();
    await runSync({ institutionId: alpha.id, source: 'static-markdown' });

    // A's admin: A's runs + facts (A's facts now include the source set).
    const resA = await get('/api/v1/admin/sync', bearer(adminA.id, Role.ADMIN, alpha.id));
    expect(resA.status).toBe(200);
    const a = (await resA.json()) as {
      data: {
        institution: { slug: string };
        hasSyncSource: boolean;
        factCount: number;
        runHistory: Array<{ institutionId: string }>;
        categories: Array<{ items: Array<{ value: string; institutionSlug?: string }> }>;
      };
    };
    expect(a.data.institution.slug).toBe('zawia-showcase');
    expect(a.data.hasSyncSource).toBe(true);
    expect(a.data.factCount).toBe(STATIC_FACTS.length + 1);
    expect(a.data.runHistory).toHaveLength(1);
    expect(a.data.runHistory.every((r) => r.institutionId === alpha.id)).toBe(true);
    // A's scoped items never carry another institution's values.
    const values = a.data.categories.flatMap((c) => c.items.map((i) => i.value));
    expect(values).not.toContain('بيانات الأندلس');

    // B's admin: B's view (their 2 seeded facts, no run history).
    const resB = await get('/api/v1/admin/sync', bearer(adminB.id, Role.ADMIN, beta.id));
    expect(resB.status).toBe(200);
    const b = (await resB.json()) as {
      data: { institution: { slug: string }; hasSyncSource: boolean; factCount: number; runHistory: unknown[] };
    };
    expect(b.data.institution.slug).toBe(beta.slug);
    expect(b.data.hasSyncSource).toBe(false);
    expect(b.data.factCount).toBe(2);
    expect(b.data.runHistory).toHaveLength(0);

    // QUALITY (QUALITY_VIEW) reads the same scoped view.
    const resQ = await get('/api/v1/admin/sync', bearer(qualityA.id, Role.QUALITY, alpha.id));
    expect(resQ.status).toBe(200);
    expect(((await resQ.json()) as { data: { institution: { slug: string } } }).data.institution.slug).toBe(
      'zawia-showcase',
    );
  });

  it('a contextless admin gets 403; a non-OWNER cannot pivot with ?institution', async () => {
    const { beta, adminA } = await seedWorld();

    const resContextless = await get('/api/v1/admin/sync', bearer(adminA.id, Role.ADMIN, null));
    expect(resContextless.status).toBe(403);
    expect(((await resContextless.json()) as ErrorEnvelope).error.code).toBe(
      'INSTITUTION_CONTEXT_REQUIRED',
    );

    const resPivot = await get(
      `/api/v1/admin/sync?institution=${beta.slug}`,
      bearer(adminA.id, Role.ADMIN, 'inst-zawia-showcase'),
    );
    expect(resPivot.status).toBe(403);
    expect(((await resPivot.json()) as ErrorEnvelope).error.code).toBe('FORBIDDEN');
  });

  it('OWNER: platform-wide by default (both institutions + per-institution summary), ?institution narrows', async () => {
    const { alpha, beta, owner } = await seedWorld();
    await runSync({ institutionId: alpha.id, source: 'static-markdown' });

    const resWide = await get('/api/v1/admin/sync', bearer(owner.id, Role.OWNER));
    expect(resWide.status).toBe(200);
    const wide = (await resWide.json()) as {
      data: {
        institution: null;
        institutions: Array<{ slug: string; hasSyncSource: boolean; factCount: number }>;
        runHistory: Array<{ institutionId: string }>;
        categories: Array<{ items: Array<{ institutionSlug: string | null }> }>;
      };
    };
    expect(wide.data.institution).toBeNull();
    // The per-institution switchboard: showcase configured, the other not.
    const summary = Object.fromEntries(wide.data.institutions.map((i) => [i.slug, i]));
    expect(summary['zawia-showcase']!.hasSyncSource).toBe(true);
    expect(summary[beta.slug]!.hasSyncSource).toBe(false);
    expect(summary['zawia-showcase']!.factCount).toBe(STATIC_FACTS.length + 1);
    expect(summary[beta.slug]!.factCount).toBe(2);
    // Platform-wide run history + per-fact institution attribution.
    expect(wide.data.runHistory).toHaveLength(1);
    const factSlugs = wide.data.categories.flatMap((c) => c.items.map((i) => i.institutionSlug));
    expect(factSlugs).toContain('zawia-showcase');
    expect(factSlugs).toContain(beta.slug);

    const resNarrow = await get(
      `/api/v1/admin/sync?institution=${beta.slug}`,
      bearer(owner.id, Role.OWNER),
    );
    expect(resNarrow.status).toBe(200);
    const narrow = (await resNarrow.json()) as { data: { institution: { slug: string }; factCount: number } };
    expect(narrow.data.institution.slug).toBe(beta.slug);
    expect(narrow.data.factCount).toBe(2);

    const resGhost = await get('/api/v1/admin/sync?institution=ghost', bearer(owner.id, Role.OWNER));
    expect(resGhost.status).toBe(404);
  });
});

// ── S4 — GET /university/facts (public, one institution) ───────────

describe('S4 — GET /api/v1/university/facts (public, never blended)', () => {
  it('anonymous: ?institution=slug serves exactly that institution\'s facts', async () => {
    const { beta } = await seedWorld();

    const res = await get(`/api/v1/university/facts?institution=${beta.slug}`); // NO auth header
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        institution: { slug: string };
        categories: Record<string, Record<string, string>>;
      };
    };
    expect(body.data.institution.slug).toBe(beta.slug);
    expect(body.data.categories.identity!['name.ar']).toBe('بيانات الأندلس');
    // Only B's two keys — nothing of A's, no blend.
    const keys = Object.values(body.data.categories).flatMap((c) => Object.keys(c));
    expect(keys.sort()).toEqual(['b.custom', 'name.ar']);
  });

  it('anonymous default serves the showcase institution\'s facts after a sync', async () => {
    const { alpha } = await seedWorld();
    await runSync({ institutionId: alpha.id, source: 'static-markdown' });

    const res = await get('/api/v1/university/facts');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { institution: { slug: string }; categories: Record<string, Record<string, string>> };
    };
    expect(body.data.institution.slug).toBe('zawia-showcase');
    expect(body.data.categories.identity!['name.ar']).toBe('جامعة الزاوية');
    // Never B's values.
    const values = Object.values(body.data.categories).flatMap((c) => Object.values(c));
    expect(values).not.toContain('بيانات الأندلس');
    expect(values).not.toContain('خاص بالأندلس');
  });

  it('an unknown institution slug 404s (anonymous)', async () => {
    const res = await get('/api/v1/university/facts?institution=ghost');
    expect(res.status).toBe(404);
    expect(((await res.json()) as ErrorEnvelope).error.code).toBe('NOT_FOUND');
  });
});
