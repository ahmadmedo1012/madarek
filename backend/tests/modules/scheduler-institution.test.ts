/**
 * Backend unit test — the r179d (phase-5) per-institution scheduled-sync
 * decision from `backend/src/scheduler.ts`, DB-free per the repo canon:
 *
 *  1. `planScheduledSyncs` (PURE): only institutions with a CONFIGURED
 *     source get a scheduled sync; an institution without a source
 *     (e.g. a second demo institution) is never synced; a configured
 *     institution missing from the live directory is skipped; matching
 *     is by id OR slug; the planned id is the LIVE row id.
 *  2. the REAL registry contract (lib/zu-sync): exactly one configured
 *     institution — the r188 demo tenant (madarek-demo) with the static-markdown source.
 *  3. `runScheduledSyncs` (mocked directory + mocked runSync): syncs
 *     each configured institution with its own source, one failing
 *     institution never aborts the rest, a directory failure plans
 *     nothing and never rejects.
 *
 * zu-sync is partially mocked: the REAL registry/config lookup stays
 * (importActual) and only `runSync` is replaced — the runner tests
 * observe exactly which institutions the scheduler would touch.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { InstitutionSyncConfig } from '../../src/lib/zu-sync/index.js';

vi.mock('../../src/db.js', () => ({
  prisma: {
    institution: { findMany: vi.fn() },
  },
}));
vi.mock('../../src/lib/zu-sync/index.js', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/lib/zu-sync/index.js')
  >();
  return { ...actual, runSync: vi.fn() };
});
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { planScheduledSyncs, runScheduledSyncs } from '../../src/scheduler';
import {
  runSync,
  INSTITUTION_SYNC_CONFIGS,
  findInstitutionSyncConfig,
  PUBLIC_FACTS_DEFAULT_SLUG,
  DEFAULT_SYNC_INSTITUTION_ID,
} from '../../src/lib/zu-sync/index.js';
import { prisma } from '../../src/db.js';

const runSyncMock = vi.mocked(runSync);
const institutionFindMany = vi.mocked(prisma.institution.findMany);

const ZAWIA = { id: DEFAULT_SYNC_INSTITUTION_ID, slug: 'madarek-demo' };
const OTHER = { id: 'inst-other', slug: 'other-demo' };

beforeEach(() => {
  vi.clearAllMocks();
});

// ── planScheduledSyncs — the pure per-institution decision ─────────

describe('planScheduledSyncs — pure decision', () => {
  const configA: InstitutionSyncConfig = {
    institutionId: 'inst-a',
    institutionSlug: 'inst-a-slug',
    source: 'static-markdown',
  };

  it('plans ONLY the institutions with a configured source', () => {
    const plan = planScheduledSyncs([configA], [
      { id: 'inst-a', slug: 'inst-a-slug' },
      { id: 'inst-b', slug: 'inst-b-slug' },
    ]);
    expect(plan).toEqual([{ institutionId: 'inst-a', source: 'static-markdown' }]);
  });

  it('NEVER plans an institution without a configured source (no global default)', () => {
    const plan = planScheduledSyncs([configA], [{ id: 'inst-b', slug: 'inst-b-slug' }]);
    expect(plan).toEqual([]);
  });

  it('skips a configured institution whose row is absent from the live directory', () => {
    // e.g. a fresh/disposable DB that has not seeded the showcase row —
    // the plan must not reference a missing row (syncRun.create FK).
    const plan = planScheduledSyncs([configA], [{ id: 'inst-b', slug: 'inst-b-slug' }]);
    expect(plan).toEqual([]);
  });

  it('matches by slug when the live id differs from the registry literal', () => {
    const plan = planScheduledSyncs([configA], [{ id: 'cuid-live', slug: 'inst-a-slug' }]);
    expect(plan).toEqual([{ institutionId: 'cuid-live', source: 'static-markdown' }]);
  });

  it('plans the LIVE row id, never the config literal id', () => {
    const plan = planScheduledSyncs([configA], [{ id: 'cuid-live', slug: 'inst-a-slug' }]);
    expect(plan[0]!.institutionId).toBe('cuid-live');
    expect(plan[0]!.institutionId).not.toBe(configA.institutionId);
  });

  it('an empty registry plans nothing', () => {
    expect(planScheduledSyncs([], [ZAWIA, OTHER])).toEqual([]);
  });

  it('keeps registry order across several configured institutions', () => {
    const configB: InstitutionSyncConfig = {
      institutionId: 'inst-b',
      institutionSlug: 'inst-b-slug',
      source: 'live-http',
    };
    const plan = planScheduledSyncs([configA, configB], [
      { id: 'inst-b', slug: 'inst-b-slug' },
      { id: 'inst-a', slug: 'inst-a-slug' },
    ]);
    expect(plan).toEqual([
      { institutionId: 'inst-a', source: 'static-markdown' },
      { institutionId: 'inst-b', source: 'live-http' },
    ]);
  });
});

// ── the real registry contract (r179d) ──────────────────────────────

describe('the real INSTITUTION_SYNC_CONFIGS registry', () => {
  it('configures exactly ONE institution: the demo tenant (madarek-demo) with the static-markdown source', () => {
    expect(INSTITUTION_SYNC_CONFIGS).toEqual([
      { institutionId: 'inst-zawia-showcase', institutionSlug: 'madarek-demo', source: 'static-markdown' },
    ]);
  });

  it('findInstitutionSyncConfig resolves the showcase by id OR slug, and any other institution to null', () => {
    expect(findInstitutionSyncConfig({ id: 'inst-zawia-showcase', slug: 'whatever' })).not.toBeNull();
    expect(findInstitutionSyncConfig({ id: 'cuid-x', slug: 'madarek-demo' })).not.toBeNull();
    // The demo source is NOT a global source for every university:
    expect(findInstitutionSyncConfig({ id: 'cuid-x', slug: 'alandalus-demo' })).toBeNull();
    expect(findInstitutionSyncConfig({ id: 'cuid-x', slug: 'other' })).toBeNull();
  });

  it('the public facts default is the showcase slug', () => {
    expect(PUBLIC_FACTS_DEFAULT_SLUG).toBe('madarek-demo');
  });
});

// ── runScheduledSyncs — the runner against a mocked directory ──────

describe('runScheduledSyncs', () => {
  it('runs a guarded sync for every configured institution with its own source', async () => {
    institutionFindMany.mockResolvedValue([ZAWIA, OTHER] as never);
    runSyncMock.mockResolvedValue({
      runId: 'r1', status: 'SUCCESS', factsAdded: 38, factsUpdated: 0,
      durationMs: 5, errorMsg: null, notes: null,
    });

    const plan = await runScheduledSyncs('test');

    expect(plan).toEqual([{ institutionId: ZAWIA.id, source: 'static-markdown' }]);
    // ONLY the configured institution — OTHER is never synced.
    expect(runSyncMock).toHaveBeenCalledTimes(1);
    expect(runSyncMock).toHaveBeenCalledWith({ institutionId: ZAWIA.id, source: 'static-markdown' });
  });

  it('skips unconfigured institutions entirely (real registry, directory without the showcase)', async () => {
    institutionFindMany.mockResolvedValue([OTHER] as never);

    const plan = await runScheduledSyncs('test');

    expect(plan).toEqual([]);
    expect(runSyncMock).not.toHaveBeenCalled();
  });

  it('one institution\'s failure does not abort the rest of the plan', async () => {
    institutionFindMany.mockResolvedValue([
      { id: 'inst-a', slug: 'a-slug' },
      { id: 'inst-b', slug: 'b-slug' },
    ] as never);
    const configs: InstitutionSyncConfig[] = [
      { institutionId: 'inst-a', institutionSlug: 'a-slug', source: 'static-markdown' },
      { institutionId: 'inst-b', institutionSlug: 'b-slug', source: 'static-markdown' },
    ];
    runSyncMock
      .mockRejectedValueOnce(new Error('fk violation for inst-a'))
      .mockResolvedValueOnce({
        runId: 'r-b', status: 'SUCCESS', factsAdded: 1, factsUpdated: 0,
        durationMs: 5, errorMsg: null, notes: null,
      });

    const plan = await runScheduledSyncs('test', prisma, configs);

    // Both institutions were planned and ATTEMPTED — b ran after a threw.
    expect(plan).toHaveLength(2);
    expect(runSyncMock).toHaveBeenCalledTimes(2);
    expect(runSyncMock).toHaveBeenNthCalledWith(1, { institutionId: 'inst-a', source: 'static-markdown' });
    expect(runSyncMock).toHaveBeenNthCalledWith(2, { institutionId: 'inst-b', source: 'static-markdown' });
  });

  it('answers an empty plan and never rejects when the directory load fails', async () => {
    institutionFindMany.mockRejectedValue(new Error('db down'));

    await expect(runScheduledSyncs('test')).resolves.toEqual([]);
    expect(runSyncMock).not.toHaveBeenCalled();
  });

  it('reads only ACTIVE institutions from the directory', async () => {
    institutionFindMany.mockResolvedValue([]);
    await runScheduledSyncs('test');
    expect(institutionFindMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      select: { id: true, slug: true },
    });
  });
});
