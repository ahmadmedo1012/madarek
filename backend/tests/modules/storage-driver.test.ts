/**
 * Backend unit test — the LocalDriver byte-level roundtrip + driver
 * selection of `backend/src/lib/storage.ts` (P3-BE, real uploads).
 *
 * The DB-free proof that the storage abstraction actually stores and
 * returns bytes: put → stat → get byte-equal → getRange slice
 * byte-equal → missing key null, all inside os.tmpdir (never the real
 * backend/storage tree). The s3 driver is pinned by selection only —
 * no network in unit tests (its signing math is pinned by
 * storage-sigv4.test.ts).
 */
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  LocalDriver,
  PostgresDriver,
  S3Driver,
  buildDriver,
  getStorage,
  type StorageDriver,
} from '../../src/lib/storage.js';

// Scratch roots live under os.tmpdir() and are left for the OS to reap —
// tests never touch the real backend/storage tree.
async function freshRoot(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'madarek-storage-'));
}

const PDF_BYTES = Buffer.from('%PDF-1.7\nfake pdf payload \u00ff\u00fe\u0001\u0002 — bytes that are NOT utf8-roundtrip-safe', 'latin1');

describe('LocalDriver roundtrip (byte-level proof)', () => {
  it('put → stat → get returns the exact bytes', async () => {
    const driver = new LocalDriver(await freshRoot());
    await driver.put('papers/cku5c2x9p0000roundtrip.pdf', PDF_BYTES);

    const info = await driver.stat('papers/cku5c2x9p0000roundtrip.pdf');
    expect(info).toEqual({ size: PDF_BYTES.length });

    const got = await driver.get('papers/cku5c2x9p0000roundtrip.pdf');
    expect(got).not.toBeNull();
    expect(got!.equals(PDF_BYTES)).toBe(true); // byte-equal, not just length
  });

  it('creates namespace directories on demand (materials/)', async () => {
    const driver = new LocalDriver(await freshRoot());
    await driver.put('materials/c0001.pdf', PDF_BYTES);
    const got = await driver.get('materials/c0001.pdf');
    expect(got!.equals(PDF_BYTES)).toBe(true);
  });

  it('getRange returns the exact inclusive slice', async () => {
    const driver = new LocalDriver(await freshRoot());
    await driver.put('papers/r.pdf', PDF_BYTES);
    const start = 9;
    const end = 20;
    const slice = await driver.getRange('papers/r.pdf', start, end);
    expect(slice!.equals(PDF_BYTES.subarray(start, end + 1))).toBe(true);
    // The full-file window is the whole buffer.
    const all = await driver.getRange('papers/r.pdf', 0, PDF_BYTES.length - 1);
    expect(all!.equals(PDF_BYTES)).toBe(true);
  });

  it('missing keys: get/stat/getRange → null, never throw', async () => {
    const driver = new LocalDriver(await freshRoot());
    expect(await driver.get('papers/missing.pdf')).toBeNull();
    expect(await driver.stat('papers/missing.pdf')).toBeNull();
    expect(await driver.getRange('papers/missing.pdf', 0, 10)).toBeNull();
  });

  it('getRange rejects out-of-bounds windows (null, not a truncated lie)', async () => {
    const driver = new LocalDriver(await freshRoot());
    await driver.put('papers/r.pdf', PDF_BYTES);
    expect(await driver.getRange('papers/r.pdf', PDF_BYTES.length, PDF_BYTES.length + 5)).toBeNull();
    expect(await driver.getRange('papers/r.pdf', 5, 4)).toBeNull(); // end < start
    expect(await driver.getRange('papers/r.pdf', -1, 4)).toBeNull();
    // A window that runs past EOF clamps (honest partial slice).
    const tail = await driver.getRange('papers/r.pdf', PDF_BYTES.length - 3, PDF_BYTES.length + 100);
    expect(tail!.equals(PDF_BYTES.subarray(PDF_BYTES.length - 3))).toBe(true);
  });

  it('rejects invalid keys (traversal / unknown namespace) before touching the disk', async () => {
    const driver = new LocalDriver(await freshRoot());
    await expect(driver.put('papers/../escape.pdf', PDF_BYTES)).rejects.toThrow(/invalid storage key/);
    await expect(driver.get('/papers/absolute.pdf')).rejects.toThrow(/invalid storage key/);
    await expect(driver.stat('uploads/other.pdf')).rejects.toThrow(/invalid storage key/);
    // Nothing was created outside the root despite the attempts:
    expect(await driver.stat('papers/escape.pdf')).toBeNull();
  });
});

describe('buildDriver (env selection — the pure factory)', () => {
  it('defaults to LocalDriver and honors STORAGE_DIR (absolute path)', async () => {
    const root = await freshRoot();
    const byDefault = buildDriver({ STORAGE_DRIVER: 'local', S3_REGION: 'auto' });
    expect(byDefault).toBeInstanceOf(LocalDriver);

    const withDir = buildDriver({ STORAGE_DRIVER: 'local', STORAGE_DIR: root, S3_REGION: 'auto' }) as LocalDriver;
    expect(withDir).toBeInstanceOf(LocalDriver);
    expect(withDir.root).toBe(path.resolve(root));
    // And it really reads/writes that root:
    await withDir.put('papers/x.pdf', PDF_BYTES);
    const probe = new LocalDriver(path.resolve(root));
    expect((await probe.get('papers/x.pdf'))!.equals(PDF_BYTES)).toBe(true);
  });

  it('selects S3Driver when the s3 env slice is complete', () => {
    const driver = buildDriver({
      STORAGE_DRIVER: 's3',
      S3_ENDPOINT: 'https://storage.example.com',
      S3_REGION: 'auto',
      S3_BUCKET: 'madarek-files',
      S3_ACCESS_KEY_ID: 'test-example-access-key',
      S3_SECRET_ACCESS_KEY: 'test-example-secret-key-not-real-000',
    });
    expect(driver).toBeInstanceOf(S3Driver);
  });

  it('throws naming exactly the missing s3 vars (defense under env.ts fail-closed)', () => {
    expect(() => buildDriver({ STORAGE_DRIVER: 's3', S3_REGION: 'auto' })).toThrow(
      /S3_ENDPOINT.*S3_BUCKET.*S3_ACCESS_KEY_ID.*S3_SECRET_ACCESS_KEY/,
    );
    expect(() =>
      buildDriver({
        STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'https://storage.example.com',
        S3_REGION: 'auto',
        S3_BUCKET: 'madarek-files',
      }),
    ).toThrow(/S3_ACCESS_KEY_ID/);
  });

  it('r175: selects PostgresDriver when the binaryObject model is wired', () => {
    const driver = buildDriver({ STORAGE_DRIVER: 'postgres', S3_REGION: 'auto' }, { binaryObject: fakeBinaryObject() });
    expect(driver).toBeInstanceOf(PostgresDriver);
  });

  it('r175: postgres WITHOUT the wired model fails closed — never silently degrades to local', () => {
    expect(() => buildDriver({ STORAGE_DRIVER: 'postgres', S3_REGION: 'auto' })).toThrow(
      /STORAGE_DRIVER=postgres requires the prisma binaryObject model/,
    );
  });
});

// ─── PostgresDriver (r175 — BYTEA rows behind the same contract) ────

/** In-memory fake of the prisma `binaryObject` model surface — the same
 * duck-typed seam the driver consumes in production, so the unit suite
 * proves the CONTRACT (keys, null semantics, inclusive ranges, byte
 * integrity, overwrite-on-reput) without a database. */
function fakeBinaryObject() {
  const rows = new Map<string, { bytes: Uint8Array; size: number }>();
  return {
    rows,
    async upsert(args: {
      where: { key: string };
      create: { key: string; bytes: Uint8Array; size: number };
      update: { bytes: Uint8Array; size: number };
    }) {
      rows.set(args.where.key, { bytes: args.create.bytes, size: args.create.size });
      return {} as never;
    },
    async findUnique(args: { where: { key: string }; select: { bytes: boolean; size: boolean } }) {
      const row = rows.get(args.where.key);
      if (row === undefined) return null;
      const out: { bytes?: Uint8Array; size?: number } = {};
      if (args.select.bytes) out.bytes = row.bytes;
      if (args.select.size) out.size = row.size;
      return out;
    },
  };
}

describe('PostgresDriver roundtrip (byte-level proof over the model seam)', () => {
  it('put → stat → get returns the exact bytes (both namespaces)', async () => {
    const fake = fakeBinaryObject();
    const driver = new PostgresDriver(fake);
    await driver.put('papers/cku5c2x9p0000pgroundtrip.pdf', PDF_BYTES);
    await driver.put('materials/c0002pg.pdf', PDF_BYTES);

    expect(await driver.stat('papers/cku5c2x9p0000pgroundtrip.pdf')).toEqual({ size: PDF_BYTES.length });
    const got = await driver.get('papers/cku5c2x9p0000pgroundtrip.pdf');
    expect(got).not.toBeNull();
    expect(got!.equals(PDF_BYTES)).toBe(true); // byte-equal, not just length
    expect((await driver.get('materials/c0002pg.pdf'))!.equals(PDF_BYTES)).toBe(true);
  });

  it('re-put on the same key REPLACES the bytes (upsert semantics, like the other drivers)', async () => {
    const driver = new PostgresDriver(fakeBinaryObject());
    await driver.put('papers/replace.pdf', PDF_BYTES);
    const REPLACEMENT = Buffer.from('%PDF-1.4\nreplacement payload \u00ff\u00fe\u0001', 'latin1');
    await driver.put('papers/replace.pdf', REPLACEMENT);
    const got = await driver.get('papers/replace.pdf');
    expect(got!.equals(REPLACEMENT)).toBe(true);
    expect(await driver.stat('papers/replace.pdf')).toEqual({ size: REPLACEMENT.length });
  });

  it('getRange returns the exact inclusive slice, clamps past-EOF, nulls out-of-bounds', async () => {
    const driver = new PostgresDriver(fakeBinaryObject());
    await driver.put('papers/r.pdf', PDF_BYTES);
    const start = 9;
    const end = 20;
    expect((await driver.getRange('papers/r.pdf', start, end))!.equals(PDF_BYTES.subarray(start, end + 1))).toBe(true);
    const all = await driver.getRange('papers/r.pdf', 0, PDF_BYTES.length - 1);
    expect(all!.equals(PDF_BYTES)).toBe(true);
    // Past EOF clamps (honest partial slice):
    const tail = await driver.getRange('papers/r.pdf', PDF_BYTES.length - 3, PDF_BYTES.length + 100);
    expect(tail!.equals(PDF_BYTES.subarray(PDF_BYTES.length - 3))).toBe(true);
    // Out-of-bounds windows are null, never a truncated lie:
    expect(await driver.getRange('papers/r.pdf', PDF_BYTES.length, PDF_BYTES.length + 5)).toBeNull();
    expect(await driver.getRange('papers/r.pdf', 5, 4)).toBeNull();
    expect(await driver.getRange('papers/r.pdf', -1, 4)).toBeNull();
  });

  it('missing keys: get/stat/getRange → null, never throw', async () => {
    const driver = new PostgresDriver(fakeBinaryObject());
    expect(await driver.get('papers/missing.pdf')).toBeNull();
    expect(await driver.stat('papers/missing.pdf')).toBeNull();
    expect(await driver.getRange('papers/missing.pdf', 0, 10)).toBeNull();
  });

  it('invalid keys throw the same shape-gate error the other drivers throw', async () => {
    const driver = new PostgresDriver(fakeBinaryObject());
    for (const bad of ['../escape.pdf', 'papers/nested/deep.pdf', 'papers/nope.txt', 'evil\\name.pdf', 'papers/\u0000.pdf']) {
      await expect(driver.put(bad, PDF_BYTES)).rejects.toThrow(/invalid storage key/);
      await expect(driver.get(bad)).rejects.toThrow(/invalid storage key/);
      await expect(driver.stat(bad)).rejects.toThrow(/invalid storage key/);
    }
  });

  it('stat never reads the bytes (selects size only) — a row with an unusable size throws', async () => {
    const fake = fakeBinaryObject();
    const driver = new PostgresDriver(fake);
    await driver.put('papers/s.pdf', PDF_BYTES);
    // Corrupt the row's size (contract break): stat must surface it as
    // an error, never a guessed number.
    fake.rows.set('papers/s.pdf', { bytes: PDF_BYTES, size: -1 as unknown as number });
    await expect(driver.stat('papers/s.pdf')).rejects.toThrow(/unusable size/);
  });

  it('a model failure on put propagates (callers map to 500 — never a fake success)', async () => {
    const fake = fakeBinaryObject();
    fake.upsert = async () => {
      throw new Error('simulated DB write failure');
    };
    const driver = new PostgresDriver(fake);
    await expect(driver.put('papers/f.pdf', PDF_BYTES)).rejects.toThrow('simulated DB write failure');
  });
});

describe('getStorage (memoized process-env driver)', () => {
  it('resolves the local driver under the test env and memoizes the instance', () => {
    const a: StorageDriver = getStorage();
    expect(a).toBeInstanceOf(LocalDriver);
    expect(getStorage()).toBe(a); // memoized — one driver per process
  });
});
