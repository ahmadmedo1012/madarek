/**
 * Type declarations for scripts/db-ops-lib.mjs (r166c).
 *
 * The runtime module is plain dependency-free .mjs (node: builtins
 * only — the smoke-deploy rule), but backend/tests/modules/db-ops.test.ts
 * imports it to pin the guard logic, and `npm run typecheck:tests -w
 * backend` (tsconfig.test.json, moduleResolution "Bundler") resolves
 * this adjacent .d.mts. Keep both files in sync — the unit tests pin
 * the behavior, this file only describes it.
 */

export interface PgUrlValidation {
  ok: boolean;
  url?: URL;
  error?: string;
}

export interface EnvUrlResolution {
  ok: boolean;
  url?: string;
  error?: string;
}

export interface ParsedOpsArgs {
  values: Record<string, string>;
  flags: Set<string>;
  errors: string[];
  help: boolean;
}

export interface GuardResult {
  ok: boolean;
  error?: string;
  warned?: boolean;
}

export declare function redactUrl(rawUrl: string): string;
export declare function isPgUrl(raw: unknown): boolean;
export declare function validatePgUrl(rawUrl: string): PgUrlValidation;

export declare function parseOpsArgs(
  argv: string[],
  opts?: { valueOpts?: string[]; flagOpts?: string[] },
): ParsedOpsArgs;

export declare function resolveEnvUrl(envObj: Record<string, string | undefined>, varName: string): EnvUrlResolution;

export declare function sameDatabase(a: string, b: string): boolean;

export declare function liveRestoreGuard(opts: {
  targetUrl: string;
  liveUrl: string | undefined;
  confirmLiveRestore?: boolean;
}): GuardResult;

export declare function requireYesInProduction(nodeEnv: string | undefined, yesFlag: boolean): GuardResult;

export declare function findBinary(
  name: string,
  opts?: { pathEnv?: string; exists?: (p: string) => boolean },
): string | null;

export declare function missingBinaryMessage(tool: string): string;

export declare function buildBackupCommand(opts: { binary: string; url: string; outFile: string }): string[];
export declare function buildRestoreCommand(opts: { binary: string; url: string; dumpFile: string }): string[];
export declare function displayCommand(argv: string[]): string;

export declare function timestampSlug(now?: Date): string;
export declare function slugifyLabel(label: string): string;
export declare function defaultBackupPath(now?: Date, label?: string): string;

export declare function sha256File(file: string): Promise<string>;
export declare function humanSize(bytes: number): string;

// ─── r167: post-restore verification (db:verify) ───────────────────

export interface VerifyQuery {
  key: 'tables' | 'migrations' | 'last_migration' | 'roles' | 'counts';
  sql: string;
  label: string;
}

/** The exact read-only query set db-verify runs (docs/12 §3 items 1–4). */
export declare const VERIFY_QUERIES: readonly VerifyQuery[];

export interface VerifySummary {
  level: 'PASS' | 'WARN' | 'FAIL';
  findings: string[];
}

/** Pure verdict from measured restore facts. */
export declare function summarizeVerify(measurements: {
  tables: number;
  migrations: number;
  users: number;
  ownerCount: number;
}): VerifySummary;
