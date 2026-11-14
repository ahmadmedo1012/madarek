/**
 * Backend unit pins for scripts/db-diagnostics.mjs (R352 K1/T).
 *
 * DB-free (injected fake prisma + captured write): the env gate, the
 * extension-gated section plan, and the honest-failure path (a failed
 * section records, never crashes the build — diagnostics must never
 * be load-bearing).
 */
import { describe, expect, it } from 'vitest';
import { shouldDiagnose, planSections, runDiagnostics } from '../../scripts/db-diagnostics.mjs';

describe('shouldDiagnose (the env gate)', () => {
  it('runs only with MADAREK_DB_DIAGNOSTICS=1', () => {
    expect(shouldDiagnose({ MADAREK_DB_DIAGNOSTICS: '1' })).toBe(true);
    expect(shouldDiagnose({ MADAREK_DB_DIAGNOSTICS: '0' })).toBe(false);
    expect(shouldDiagnose({ MADAREK_DB_DIAGNOSTICS: '' })).toBe(false);
    expect(shouldDiagnose({})).toBe(false);
  });
  it('every other build (unset) is a no-op — zero noise by construction', () => {
    expect(shouldDiagnose(process.env)).toBe(false);
  });
});

describe('planSections (the extension gate)', () => {
  it('includes pg_stat_statements sections only when the extension is installed', () => {
    const withPgss = planSections('plpgsql, pg_stat_statements, pgcrypto');
    const without = planSections('plpgsql');
    const namesWith = withPgss.map((q) => q.section);
    const namesWithout = without.map((q) => q.section);
    expect(namesWith).toContain('slow queries (pg_stat_statements top 15 by total_exec_time)');
    expect(namesWithout).not.toContain('slow queries (pg_stat_statements top 15 by total_exec_time)');
    // the extension-free sections survive both plans
    for (const must of ['migrations ledger', 'table sizes (top 12)', 'BinaryObject (the storage migration feed)']) {
      expect(namesWith).toContain(must);
      expect(namesWithout).toContain(must);
    }
  });
  it('an empty/absent extension list degrades to the extension-free plan', () => {
    expect(planSections('').length).toBeGreaterThan(0);
    expect(planSections(null).every((q) => !q.requiresExtension)).toBe(true);
  });
});

describe('runDiagnostics (injected collaborators)', () => {
  it('a failed section records honestly, never crashes', async () => {
    const lines: string[] = [];
    const prisma = {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('pg_extension')) return [{ installed: 'plpgsql' }];
        if (sql.includes('_prisma_migrations')) return [{ applied: 44, last: '2026-11-14' }];
        throw new Error('boom (simulated section failure)');
      },
    };
    const out = await runDiagnostics({
      prisma: prisma as never,
      envSlice: { MADAREK_DB_DIAGNOSTICS: '1' },
      write: (...a: unknown[]) => lines.push(String(a[1] ?? a[0])),
    });
    expect(out.ran).toBe(true);
    expect(out.sections['migrations ledger']).toEqual([{ applied: 44, last: '2026-11-14' }]);
    expect((out.sections['table sizes (top 12)'] as { error: string }).error).toMatch(/boom/);
    expect(lines.some((l) => l.includes('FAILED'))).toBe(true);
  });

  it('the gate off means no DB touch at all', async () => {
    let touched = false;
    const prisma = {
      $queryRawUnsafe: async () => {
        touched = true;
        return [];
      },
    };
    const out = await runDiagnostics({ prisma: prisma as never, envSlice: {}, write: () => {} });
    expect(out.ran).toBe(false);
    expect(touched).toBe(false);
  });
});
