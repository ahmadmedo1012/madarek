#!/usr/bin/env node
/**
 * R352 K5 — the postgres → Vercel Blob storage migration (per build).
 *
 * WHY: production runs STORAGE_DRIVER=postgres — uploaded PDFs ride the
 * application database as BYTEA (BinaryObject rows), the Render-era
 * pilot trade-off. The X2d client-direct Blob transport exists and the
 * team Blob store is connected (BLOB_READ_WRITE_TOKEN auto-provisioned);
 * the flip to STORAGE_DRIVER=vercel-blob needs every existing object to
 * ALREADY live in Blob at boot time — a half-migrated flip would 404
 * files that exist in the database.
 *
 * LAW (the K1 repair-baseline pattern): this rides EVERY remote build,
 * gates itself, and is a no-op on a healthy/migrated deployment:
 *   0 rows in BinaryObject            → "nothing to migrate", exit 0.
 *   row already in Blob (size match)  → skip (alreadyMigrated).
 *   row missing / size differs        → upload → verify (blobHead) → count.
 *   any per-row upload failure        → exit 1 (the build fails, the
 *                                       deployment never goes live with a
 *                                       partial migration — fail-closed).
 *
 * Memory law: one row's bytes in memory at a time (findUnique per key
 * just-in-time), never the whole table — a future 500-row table must
 * not OOM a 1 GB build.
 *
 * Rows are NEVER deleted here: until the driver actually flips, the
 * running app still serves them from postgres; after the flip they are
 * the pre-flip backup and get swept by a later round (documented in
 * docs/redesign/r352/RESUME.md).
 *
 * Env gates (all defensive, never a crash):
 *   VERCEL_ENV=preview → skip (preview databases must never write into
 *   the production Blob store).
 *   No BLOB_READ_WRITE_TOKEN → skip honestly (local/dev builds).
 */
import { PrismaClient } from '@prisma/client';
import { put as blobPut, head as blobHead } from '@vercel/blob';

const log = (...args) => console.log('[storage-to-blob]', ...args);

// ─── Pure decision core (unit-tested) ─────────────────────────────

/**
 * What to do with one BinaryObject row given its current Blob state.
 *   'upload' — Blob is missing the object or holds a different size.
 *   'skip'   — Blob already serves exactly this object (byte length).
 */
export function planRow(row, head) {
  if (!head) return 'upload';
  if (typeof head.size !== 'number' || head.size !== row.size) return 'upload';
  return 'skip';
}

/** The build-level gate: should this build even try? */
export function shouldRun(envSlice) {
  if (envSlice.VERCEL_ENV === 'preview') {
    return { run: false, reason: 'VERCEL_ENV=preview — preview builds never touch the production Blob store' };
  }
  if (!envSlice.BLOB_READ_WRITE_TOKEN) {
    return { run: false, reason: 'no BLOB_READ_WRITE_TOKEN — local/dev builds skip honestly' };
  }
  return { run: true, reason: '' };
}

// ─── The migration (injectable collaborators for tests) ───────────

export async function runMigration({ prisma, blob, envSlice = process.env } = {}) {
  const b = blob ?? { put: blobPut, head: blobHead };
  const gate = shouldRun(envSlice);
  if (!gate.run) {
    log(`skip: ${gate.reason}`);
    return { skipped: true, reason: gate.reason };
  }

  const ownClient = prisma ? null : new PrismaClient();
  const client = prisma ?? ownClient;
  try {
    const rows = await client.binaryObject.findMany({ select: { key: true, size: true } });
    if (rows.length === 0) {
      log('nothing to migrate (0 BinaryObject rows) — no-op');
      return { skipped: false, rows: 0, migrated: 0, alreadyMigrated: 0, failed: 0 };
    }

    log(`migrating ${rows.length} BinaryObject row(s) → Vercel Blob (private)`);
    let migrated = 0;
    let alreadyMigrated = 0;
    const failures = [];

    for (const row of rows) {
      try {
        const head = await b.head(row.key);
        if (planRow(row, head) === 'skip') {
          alreadyMigrated += 1;
          log(`  ✓ ${row.key} (${row.size} B) already in Blob — skip`);
          continue;
        }
        // Just-in-time byte fetch: ONE row in memory at a time.
        const full = await client.binaryObject.findUnique({
          where: { key: row.key },
          select: { bytes: true, size: true },
        });
        if (full === null) {
          throw new Error('row vanished between listing and fetch (concurrent write?) — rerun picks it up');
        }
        if (full.size !== row.size) {
          throw new Error(`row size moved between listing and fetch (${row.size} → ${full.size}) — rerun picks it up`);
        }
        await b.put(row.key, full.bytes);
        const verify = await b.head(row.key);
        if (planRow(row, verify) !== 'skip') {
          throw new Error(`post-upload verification failed: head.size=${verify?.size} ≠ row.size=${row.size}`);
        }
        migrated += 1;
        log(`  ↑ ${row.key} (${row.size} B) uploaded + verified`);
      } catch (err) {
        failures.push({ key: row.key, error: String(err?.message ?? err) });
        log(`  ✗ ${row.key}: ${err?.message ?? err}`);
      }
    }

    const summary = { skipped: false, rows: rows.length, migrated, alreadyMigrated, failed: failures.length, failures };
    if (failures.length > 0) {
      log(`FAILED: ${failures.length}/${rows.length} row(s) — failing the build (a partial migration must never go live)`);
      process.exitCode = 1;
    } else {
      log(`done: ${migrated} migrated, ${alreadyMigrated} already in Blob, 0 failures`);
    }
    return summary;
  } finally {
    if (ownClient) await ownClient.$disconnect().catch(() => {});
  }
}

// ─── CLI entry (only when executed directly) ──────────────────────

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirectRun) {
  runMigration().catch((err) => {
    log('fatal:', err?.message ?? err);
    process.exit(1);
  });
}
