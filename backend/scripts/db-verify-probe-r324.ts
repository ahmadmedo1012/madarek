/**
 * r324 P7.0 — DB verification probe (run against the live local PG).
 * Prints parseable lines: IDX_*, USER_*, TRGM_*.
 */
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const p = new PrismaClient();

  const idx = (await p.$queryRawUnsafe(
    "SELECT indexname FROM pg_indexes WHERE tablename='AiKnowledgeChunk'",
  )) as Array<{ indexname: string }>;
  console.log('IDX_COUNT=' + idx.length + ' names=' + idx.map((r) => r.indexname).join(','));

  const users = (await p.$queryRawUnsafe(
    'SELECT count(*)::int AS n FROM "User"',
  )) as Array<{ n: number }>;
  console.log('USER_COUNT=' + users[0].n);

  const byRole = (await p.$queryRawUnsafe(
    'SELECT role, count(*)::int AS n FROM "User" GROUP BY role ORDER BY role',
  )) as Array<{ role: string; n: number }>;
  console.log('ROLES=' + byRole.map((r) => r.role + ':' + r.n).join(' '));

  const ext = (await p.$queryRawUnsafe(
    "SELECT count(*)::int AS n FROM pg_extension WHERE extname='pg_trgm'",
  )) as Array<{ n: number }>;
  console.log('TRGM=' + ext[0].n);

  const migrations = (await p.$queryRawUnsafe(
    "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3",
  )) as Array<{ migration_name: string }>;
  console.log('LAST_MIGRATIONS=' + migrations.map((m) => m.migration_name).join(' | '));

  await p.$disconnect();
}

void main();

