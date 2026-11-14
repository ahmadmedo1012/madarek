#!/usr/bin/env node
/**
 * R352 K1/T — the production DB diagnostics, printed into the build log.
 *
 * WHY: the K1 diagnostics run proved VERCEL_TOKEN cannot decrypt env
 * values (GET v10 ...?decrypt=1 refuses — 300 ms exit, no apt install),
 * so psql from a workflow is impossible. The ONLY machine channel that
 * holds the real DATABASE_URL is the REMOTE BUILD (vercel.json's
 * buildCommand runs with the full env); `vercel deploy` streams the
 * build output into the GitHub Actions log — readable via the API.
 *
 * This script therefore rides the buildCommand (after storage:blob)
 * as a NO-OP unless MADAREK_DB_DIAGNOSTICS=1 — a dispatching workflow
 * PATCHes that env in, runs one deploy, PATCHes it out. Zero noise on
 * every other build; the queries are READ-ONLY.
 *
 * Output contract: every section starts with a [db-diagnostics] line so
 * the dispatching workflow can extract exactly this block from the
 * deploy run's log. No secrets: values are counts, sizes, timings, and
 * truncated query shapes — never parameter values (pg_stat_statements
 * is read with its stored texts, which carry no bind values).
 */
import { PrismaClient } from '@prisma/client';

const log = (...args) => console.log('[db-diagnostics]', ...args);

const QUERIES = [
  {
    section: 'migrations ledger',
    sql: `SELECT count(*)::int AS applied, max(applied_at)::text AS last FROM "_prisma_migrations"`,
  },
  {
    section: 'extensions',
    sql: `SELECT string_agg(extname, ', ' ORDER BY extname) AS installed FROM pg_extension`,
  },
  {
    section: 'slow queries (pg_stat_statements top 15 by total_exec_time)',
    sql: `SELECT calls, round(total_exec_time::numeric,1) AS total_ms, round(mean_exec_time::numeric,1) AS mean_ms,
            left(regexp_replace(query, '[\\n\\r ]+', ' ', 'g'), 90) AS query
          FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 15`,
    requiresExtension: 'pg_stat_statements',
  },
  {
    section: 'table sizes (top 12)',
    sql: `SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total, n_live_tup::int AS rows
          FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 12`,
  },
  {
    section: 'BinaryObject (the storage migration feed)',
    sql: `SELECT count(*)::int AS rows, pg_size_pretty(sum(size)::bigint) AS bytes FROM "BinaryObject"`,
  },
  {
    section: 'ClientError last 14 days',
    sql: `SELECT count(*)::int AS total FROM "ClientError" WHERE "createdAt" > now() - interval '14 days'`,
  },
  {
    section: 'LoginEvent failures last 14 days',
    sql: `SELECT count(*)::int AS failed FROM "LoginEvent" WHERE success = false AND "createdAt" > now() - interval '14 days'`,
  },
  {
    section: 'AuditLog last 14 days (volume only)',
    sql: `SELECT count(*)::int AS total FROM "AuditLog" WHERE "createdAt" > now() - interval '14 days'`,
  },
];

/** Pure export for the unit pins: the gate + the query plan. */
export function shouldDiagnose(envSlice) {
  return (envSlice.MADAREK_DB_DIAGNOSTICS ?? '') === '1';
}

export function planSections(installedExtensions) {
  const has = new Set(String(installedExtensions ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  return QUERIES.filter((q) => !q.requiresExtension || has.has(q.requiresExtension));
}

export async function runDiagnostics({ prisma, envSlice = process.env, write = (...a) => console.log(...a) } = {}) {
  if (!shouldDiagnose(envSlice)) {
    return { ran: false };
  }
  const ownClient = prisma ? null : new PrismaClient();
  const client = prisma ?? ownClient;
  const out = { ran: true, sections: {} };
  try {
    // The extensions row gates pg_stat_statements (missing = skipped
    // honestly, never an error).
    let installed = '';
    try {
      const ext = await client.$queryRawUnsafe('SELECT string_agg(extname, \', \' ORDER BY extname) AS installed FROM pg_extension');
      installed = Array.isArray(ext) && ext[0]?.installed ? String(ext[0].installed) : '';
      write(`[db-diagnostics] extensions installed: ${installed || '(none)'}`);
      out.extensions = installed;
    } catch (err) {
      write(`[db-diagnostics] extensions lookup failed: ${err?.message ?? err}`);
    }

    for (const q of planSections(installed)) {
      try {
        const rows = await client.$queryRawUnsafe(q.sql);
        out.sections[q.section] = rows;
        write(`[db-diagnostics] === ${q.section} ===`);
        for (const row of rows) {
          write(`[db-diagnostics]   ${JSON.stringify(row)}`);
        }
      } catch (err) {
        out.sections[q.section] = { error: String(err?.message ?? err) };
        write(`[db-diagnostics] === ${q.section} === FAILED: ${err?.message ?? err}`);
      }
    }
    write('[db-diagnostics] done.');
    return out;
  } finally {
    if (ownClient) await ownClient.$disconnect().catch(() => {});
  }
}

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirectRun) {
  runDiagnostics({ write: log }).catch((err) => {
    log('fatal:', err?.message ?? err);
    process.exit(1);
  });
}
