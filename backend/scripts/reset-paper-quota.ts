/**
 * reset-paper-quota.ts — r325 P4(a) SETUP tool for the F11 rehearsal.
 *
 * WHY IT EXISTS (found live, 2026-10-30): the per-user paper quota
 * (files.routes.ts USER_PAPER_QUOTA_BYTES) charges EVERY stored paper at
 * the 20 MB worst-case cap, so a student holds at most 10 papers — and
 * ResearchPaper has NO delete route by design (the dedupe guard's
 * header documents the permanence). The rehearsal uploads one paper per
 * run, so the fourth run hits «تجاوزت حصة التخزين الخاصة بك» (413) and
 * the flow can never pass again — for the rehearsal AND for a real
 * pilot running the same week-in-a-day twice.
 *
 * WHAT IT DOES: deletes the student's ResearchPaper rows (their stored
 * PDF bytes become orphans — the serving gate 404s any filename without
 * an authorizing paper row, so an orphan is inert; the bytes leak is
 * the documented price of quota hygiene until the delete route ships).
 * The demo cohort's rows stay untouched (different student ids).
 *
 * RUN: DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev \
 *      npx tsx scripts/r325/reset-paper-quota.ts [email]
 * (invoked by tests/r325/flows/flow-11-research.spec.ts SETUP — never
 * by product code.)
 */
import { PrismaClient } from '@prisma/client';

const email = process.argv[2] ?? 'student@test.ly';
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({ where: { email }, select: { id: true, firstName: true } });
  if (!user) {
    console.error(`[reset-paper-quota] no user ${email} — is the DB seeded?`);
    process.exit(1);
  }
  const del = await prisma.researchPaper.deleteMany({ where: { studentId: user.id } });
  console.log(`[reset-paper-quota] ${email} (${user.firstName}): deleted ${del.count} paper row(s) — quota headroom restored`);
}

main()
  .catch((e: unknown) => {
    console.error('[reset-paper-quota] failed:', String(e).slice(0, 300));
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
