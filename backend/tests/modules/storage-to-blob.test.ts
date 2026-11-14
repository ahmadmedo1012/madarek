/**
 * R352 K5 — storage-to-blob.mjs contract tests.
 *
 * The migration script's LAWS, pinned (vitest, no DB, no network — the
 * collaborators are injected fakes; see runMigration's signature):
 *   1. planRow: missing head → upload; size mismatch → upload; exact
 *      size match → skip.
 *   2. shouldRun gates: preview builds skip; no token skips; production
 *      with a token runs.
 *   3. runMigration happy path: rows missing in Blob get uploaded +
 *      verified; rows already in Blob are skipped; a zero-row table is
 *      a no-op; failures fail (exitCode 1) and never delete anything.
 *   4. Just-in-time byte fetching: the runner never selects all bytes
 *      up front (the one-row-at-a-time memory law).
 */
import { describe, expect, it, afterEach } from 'vitest';
import {
  planRow,
  shouldRun,
  runMigration,
  type MigrationRow,
  type BlobHeadInfo,
  type MigrationPrisma,
  type MigrationBlob,
} from '../../scripts/storage-to-blob.mjs';

type TestRow = MigrationRow & { bytes: Buffer };

function fakePrisma(rows: TestRow[]): MigrationPrisma & {
  state: { listedKeys: string[] | null; fetchedKeys: string[] };
} {
  const state = { listedKeys: null as string[] | null, fetchedKeys: [] as string[] };
  return {
    state,
    binaryObject: {
      findMany: async ({ select }: { select?: Record<string, boolean> } = {}) => {
        if (select && 'bytes' in select) throw new Error('findMany must never select bytes (memory law)');
        state.listedKeys = rows.map((r: TestRow) => r.key);
        return rows.map(({ key, size }: TestRow) => ({ key, size }));
      },
      findUnique: async ({ where, select }: { where: { key: string }; select: { bytes: boolean; size: boolean } }) => {
        if (!select || !select.bytes) throw new Error('findUnique must select bytes');
        state.fetchedKeys.push(where.key);
        const row = rows.find((r: TestRow) => r.key === where.key);
        return row ? { bytes: row.bytes, size: row.size } : null;
      },
    },
  };
}

function fakeBlob(
  headMap: Map<string, BlobHeadInfo>,
  putLog: Array<{ key: string; bytes: number }> = [],
): MigrationBlob & { putLog: Array<{ key: string; bytes: number }> } {
  return {
    putLog,
    head: async (key: string) => headMap.get(key) ?? null,
    put: async (key: string, bytes: Buffer) => {
      putLog.push({ key, bytes: bytes.length });
      headMap.set(key, { size: bytes.length });
    },
  };
}

const PROD_ENV = { VERCEL_ENV: 'production', BLOB_READ_WRITE_TOKEN: 'tok' };

describe('planRow', () => {
  it('missing head → upload', () => {
    expect(planRow({ key: 'a', size: 10 }, null)).toBe('upload');
  });
  it('size mismatch → upload', () => {
    expect(planRow({ key: 'a', size: 10 }, { size: 9 })).toBe('upload');
    expect(planRow({ key: 'a', size: 10 }, { size: 11 })).toBe('upload');
  });
  it('exact size match → skip', () => {
    expect(planRow({ key: 'a', size: 10 }, { size: 10 })).toBe('skip');
  });
});

describe('shouldRun gates', () => {
  it('preview builds skip', () => {
    const r = shouldRun({ VERCEL_ENV: 'preview', BLOB_READ_WRITE_TOKEN: 'tok' });
    expect(r.run).toBe(false);
    expect(r.reason).toMatch(/preview/);
  });
  it('missing token skips', () => {
    const r = shouldRun({ VERCEL_ENV: 'production' });
    expect(r.run).toBe(false);
    expect(r.reason).toMatch(/BLOB_READ_WRITE_TOKEN/);
  });
  it('production with a token runs', () => {
    expect(shouldRun(PROD_ENV).run).toBe(true);
  });
});

describe('runMigration', () => {
  afterEach(() => {
    process.exitCode = 0; // the script sets exitCode on failure — reset between cases
  });

  it('zero rows is a no-op', async () => {
    const prisma = fakePrisma([]);
    const blob = fakeBlob(new Map(), []);
    const out = await runMigration({ prisma, blob, envSlice: PROD_ENV });
    expect(out).toMatchObject({ skipped: false, rows: 0, migrated: 0, failed: 0 });
  });

  it('uploads missing rows + verifies, skips already-migrated, never deletes', async () => {
    const rows = [
      { key: 'papers/one.pdf', size: 5, bytes: Buffer.from('hello') },
      { key: 'papers/two.pdf', size: 4, bytes: Buffer.from('bye!') },
    ];
    const headMap = new Map([['papers/two.pdf', { size: 4 }]]); // two already migrated
    const putLog: Array<{ key: string; bytes: number }> = [];
    const prisma = fakePrisma(rows);
    const blob = fakeBlob(headMap, putLog);
    const out = await runMigration({ prisma, blob, envSlice: PROD_ENV });

    expect(out).toMatchObject({ rows: 2, migrated: 1, alreadyMigrated: 1, failed: 0 });
    expect(putLog).toEqual([{ key: 'papers/one.pdf', bytes: 5 }]);
    // just-in-time fetch: only the row that needed upload had its bytes read
    expect(prisma.state.fetchedKeys).toEqual(['papers/one.pdf']);
    expect(prisma.state.listedKeys).toEqual(['papers/one.pdf', 'papers/two.pdf']);
  });

  it('a size-mismatched Blob object gets re-uploaded', async () => {
    const rows = [{ key: 'papers/stale.pdf', size: 7, bytes: Buffer.from('current') }];
    const headMap = new Map([['papers/stale.pdf', { size: 3 }]]); // stale/different bytes
    const putLog: Array<{ key: string; bytes: number }> = [];
    const out = await runMigration({ prisma: fakePrisma(rows), blob: fakeBlob(headMap, putLog), envSlice: PROD_ENV });
    expect(out).toMatchObject({ rows: 1, migrated: 1, alreadyMigrated: 0, failed: 0 });
    expect(putLog).toEqual([{ key: 'papers/stale.pdf', bytes: 7 }]);
  });

  it('a failed upload fails the build (exitCode) and reports honestly', async () => {
    const rows: TestRow[] = [
      { key: 'papers/ok.pdf', size: 3, bytes: Buffer.from('abc') },
      { key: 'papers/bad.pdf', size: 3, bytes: Buffer.from('xyz') },
    ];
    const headMap = new Map<string, BlobHeadInfo>();
    const blob: MigrationBlob = {
      head: async (key: string) => headMap.get(key) ?? null,
      put: async (key: string, bytes: Buffer) => {
        if (key === 'papers/bad.pdf') throw new Error('blob 500');
        headMap.set(key, { size: bytes.length });
      },
    };
    const out = await runMigration({ prisma: fakePrisma(rows), blob, envSlice: PROD_ENV });
    expect(out).toMatchObject({ rows: 2, migrated: 1, failed: 1 });
    expect(out.failures?.[0]).toMatchObject({ key: 'papers/bad.pdf' });
    expect(out.failures?.[0]?.error).toMatch(/blob 500/);
    expect(process.exitCode).toBe(1);
  });

  it('a row that vanishes between listing and fetch reports, never crashes', async () => {
    const prisma: MigrationPrisma = {
      binaryObject: {
        findMany: async () => [{ key: 'papers/gone.pdf', size: 3 }],
        findUnique: async () => null,
      },
    };
    const out = await runMigration({ prisma, blob: fakeBlob(new Map(), []), envSlice: PROD_ENV });
    expect(out).toMatchObject({ rows: 1, migrated: 0, failed: 1 });
    expect(out.failures?.[0]?.error).toMatch(/vanish/);
  });

  it('post-upload verification failure fails the build', async () => {
    const rows: TestRow[] = [{ key: 'papers/lying.pdf', size: 9, bytes: Buffer.from('123456789') }];
    const blob: MigrationBlob = {
      head: async () => null, // always missing → plan=upload; verify also null → verify fail
      put: async () => {},
    };
    const out = await runMigration({ prisma: fakePrisma(rows), blob, envSlice: PROD_ENV });
    expect(out.failed).toBe(1);
    expect(out.failures?.[0]?.error).toMatch(/verification failed/);
    expect(process.exitCode).toBe(1);
  });

  it('preview env skips before touching the DB', async () => {
    let touched = false;
    const prisma: MigrationPrisma = {
      binaryObject: {
        findMany: async () => {
          touched = true;
          return [];
        },
        // The gate skips BEFORE findMany; this stub exists only to
        // satisfy the model interface (it must never run — asserted
        // by touched === false below).
        findUnique: async () => {
          throw new Error('findUnique must never run in the preview gate');
        },
      },
    };
    const out = await runMigration({ prisma, blob: fakeBlob(new Map(), []), envSlice: { VERCEL_ENV: 'preview', BLOB_READ_WRITE_TOKEN: 'tok' } });
    expect(out.skipped).toBe(true);
    expect(out.reason).toMatch(/preview/);
    expect(touched).toBe(false);
  });
});
