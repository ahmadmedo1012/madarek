/**
 * Type declarations for backend/scripts/storage-to-blob.mjs (R352 K5).
 *
 * The runtime module is plain .mjs (Prisma + @vercel/blob only), but
 * backend/tests/modules/storage-to-blob.test.ts imports it to pin the
 * migration's decision laws, and `npm run typecheck:tests -w backend`
 * (tsconfig.test.json, moduleResolution "Bundler") resolves this
 * adjacent .d.mts (the db-ops-lib.d.mts pattern). Keep both files in
 * sync — the unit tests pin the behavior, this file only describes it.
 */

/** One BinaryObject row as the migration sees it (listing shape). */
export interface MigrationRow {
  key: string;
  size: number;
}

/** The Blob side of planRow: what a blobHead call returns (or null). */
export interface BlobHeadInfo {
  size: number;
}

/** 'upload' — Blob is missing the object or holds a different size;
 *  'skip' — Blob already serves exactly this object (byte length). */
export type RowPlan = 'upload' | 'skip';

export declare function planRow(row: MigrationRow, head: BlobHeadInfo | null): RowPlan;

export interface ShouldRunGate {
  run: boolean;
  reason: string;
}

/** The build-level gate: preview builds and token-less builds skip. */
export declare function shouldRun(envSlice: Record<string, string | undefined>): ShouldRunGate;

export interface MigrationFailure {
  key: string;
  error: string;
}

export interface MigrationSummary {
  skipped: boolean;
  reason?: string;
  rows?: number;
  migrated?: number;
  alreadyMigrated?: number;
  failed?: number;
  /** Present on the failure path (failed > 0); the gated-out and
   *  zero-rows paths carry none — tests optional-chain it. */
  failures?: MigrationFailure[];
}

/** The collaborators the tests inject (the prisma binaryObject model
 *  shape + the two @vercel/blob functions the driver uses). */
export interface MigrationPrisma {
  binaryObject: {
    findMany(args?: { select?: Record<string, boolean> }): Promise<MigrationRow[]>;
    findUnique(args: { where: { key: string }; select: { bytes: true; size: true } }): Promise<{ bytes: Buffer; size: number } | null>;
  };
}

export interface MigrationBlob {
  head(key: string): Promise<BlobHeadInfo | null>;
  put(key: string, bytes: Buffer): Promise<void>;
}

export declare function runMigration(deps?: {
  prisma?: MigrationPrisma;
  blob?: MigrationBlob;
  envSlice?: Record<string, string | undefined>;
}): Promise<MigrationSummary>;
