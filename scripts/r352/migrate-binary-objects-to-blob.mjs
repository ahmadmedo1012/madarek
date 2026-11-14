#!/usr/bin/env node
/**
 * R352 K5 — the one-off BinaryObject → Vercel Blob migration.
 *
 * Why: production ran STORAGE_DRIVER=postgres (BYTEA rows in the
 * primary DB — the pilot trade-off). The Blob store is now connected
 * (tadmora-private-files, store_gPYrMJGN3z5BZemw) and the driver flip
 * (STORAGE_DRIVER=vercel-blob) must not orphan the files already
 * stored in Postgres. This script copies every BinaryObject row into
 * Blob under the SAME canonical key (the driver serves both through
 * identical StorageDriver.get calls), verifies each object with a
 * head() probe, and LEAVES the Postgres rows in place (the belt until
 * the flip is verified in production; rows are dropped later by hand).
 *
 * Usage (from the repo root — needs DATABASE_URL + BLOB_READ_WRITE_TOKEN):
 *   node scripts/r352/migrate-binary-objects-to-blob.mjs
 *
 * Idempotent: re-running overwrites (allowOverwrite: true) and re-verifies.
 */
import { Client } from 'pg';
import { put, head } from '@vercel/blob';

const dbUrl = process.env.DATABASE_URL;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!dbUrl || !blobToken) {
  console.error('R352 K5: DATABASE_URL and BLOB_READ_WRITE_TOKEN are both required.');
  process.exit(1);
}

const mask = (url) => {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return '(unparseable)';
  }
};

const run = async () => {
  // channel_binding=require breaks some client builds; the pooler path
  // this script targets works without it.
  const client = new Client({ connectionString: dbUrl.replace('channel_binding=require', '') });
  await client.connect();
  console.log(`[r352-k5] connected: ${mask(dbUrl)}`);

  const { rows } = await client.query('SELECT key, bytes, size FROM "BinaryObject" ORDER BY key');
  console.log(`[r352-k5] BinaryObject rows: ${rows.length} (${rows.reduce((a, r) => a + Number(r.size), 0)} bytes)`);

  let migrated = 0;
  let verified = 0;
  const failures = [];
  for (const row of rows) {
    try {
      await put(row.key, Buffer.from(row.bytes), {
        access: 'private',
        token: blobToken,
        allowOverwrite: true,
        addRandomSuffix: false,
      });
      migrated += 1;
      const info = await head(row.key, { token: blobToken });
      if (info && info.size === Number(row.size)) {
        verified += 1;
        console.log(`[r352-k5] ✓ ${row.key} (${row.size} B, head-verified)`);
      } else {
        failures.push(`${row.key}: head mismatch (${info?.size} vs ${row.size})`);
        console.error(`[r352-k5] ✗ ${row.key}: head mismatch`);
      }
    } catch (err) {
      failures.push(`${row.key}: ${err.message}`);
      console.error(`[r352-k5] ✗ ${row.key}: ${err.message}`);
    }
  }

  await client.end();
  console.log(`[r352-k5] done: migrated ${migrated}/${rows.length}, verified ${verified}/${rows.length}, failures ${failures.length}`);
  if (failures.length > 0) {
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
};

run().catch((err) => {
  console.error('[r352-k5] FATAL:', err.message);
  process.exit(1);
});
