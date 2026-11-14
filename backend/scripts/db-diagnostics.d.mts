/**
 * Type declarations for backend/scripts/db-diagnostics.mjs (R352 K1/T).
 *
 * The tests (backend/tests/modules/db-diagnostics.test.ts) import the
 * pure gates; tsconfig.test.json (moduleResolution "Bundler") resolves
 * this adjacent .d.mts — the db-ops-lib.d.mts pattern. Keep in sync.
 */

export interface DiagnosticQuery {
  section: string;
  sql: string;
  requiresExtension?: string;
}

export interface DiagnosticsOutput {
  ran: boolean;
  extensions?: string;
  sections: Record<string, unknown>;
}

export declare function shouldDiagnose(envSlice: Record<string, string | undefined>): boolean;
export declare function planSections(installedExtensions: string | null | undefined): DiagnosticQuery[];
export declare function runDiagnostics(deps?: {
  prisma?: { $queryRawUnsafe(sql: string): Promise<unknown[]> };
  envSlice?: Record<string, string | undefined>;
  write?: (...args: unknown[]) => void;
}): Promise<DiagnosticsOutput>;
