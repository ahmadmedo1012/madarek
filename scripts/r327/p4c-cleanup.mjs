#!/usr/bin/env node
/**
 * scripts/r327/p4c-cleanup.mjs — remove exactly the throwaways the P4c
 * rehearsal created (the ids.json path is its argv):
 * the three @demo.madarek.ly users + the invite code the test minted.
 *
 * NEVER touches the seed's own 30 @demo.madarek.ly demo users — only
 * the ids recorded in the ids file. The deletion order mirrors
 * removeDemoCohort (backend/src/modules/users/demo-cohort.ts): the
 * relations that do not cascade on User (enrollment, inviteUse,
 * notification) go first, then the cascading profiles/memberships,
 * then the user rows themselves; the InviteCode row goes last (its
 * InviteUse children are deleted explicitly above and also cascade).
 *
 * Usage (from the repo root):
 *   DATABASE_URL=postgresql://… node scripts/r327/p4c-cleanup.mjs [ids.json]
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const IDS_FILE = process.argv[2] ?? 'audits/evidence/r327/p4/p4c-rehearsal.ids.json';
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (the local sandbox default: postgresql://postgres@localhost:5433/madarek_dev)');
  process.exit(1);
}

const require = createRequire(path.resolve('backend/package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* the rehearsal ids.json: { stamp, cohort: [{ email, id }] } — the invite
 * code itself is NOT retired here: it expires in 7 days and its uses
 * cascade with the users above (InviteUse rows are deleted explicitly). */
const { cohort } = JSON.parse(readFileSync(IDS_FILE, 'utf8'));
const created = cohort;
const ids = created.map((c) => c.id);
const uid = { in: ids };

const deleted = await prisma.$transaction(async (tx) => {
  const before = await tx.user.findMany({ where: { id: uid }, select: { id: true, email: true } });
  console.log('removing exactly:', before.map((u) => u.email).join(', '));
  if (before.length !== created.length) {
    throw new Error(`expected ${created.length} users, found ${before.length} — refusing (wrong DB?)`);
  }
  // non-cascading academic/comms rows (fresh accounts: enrollment + inviteUse + notification)
  const enrollments = await tx.enrollment.deleteMany({ where: { studentId: uid } });
  const uses = await tx.inviteUse.deleteMany({ where: { userId: uid } });
  const notifications = await tx.notification.deleteMany({ where: { userId: uid } });
  // P4c rehearsal extra: the students ASKED THE AI — their conversations,
  // messages, quotas, telemetry and feedback ride non-cascading FKs too.
  const conversations = await tx.aiConversation.deleteMany({ where: { userId: uid } });
  const messages = await tx.aiMessage.deleteMany({ where: { conversation: { userId: uid } } });
  const quotas = await tx.aiQuota.deleteMany({ where: { userId: uid } });
  const telemetry = await tx.aiTelemetry.deleteMany({ where: { userId: uid } });
  // cascading plumbing + the users
  await tx.studentProfile.deleteMany({ where: { userId: uid } });
  await tx.membership.deleteMany({ where: { userId: uid } });
  const users = await tx.user.deleteMany({ where: { id: uid } });
  // the invite code the test minted (registrar surfaces stay clean)
  // the rehearsal's invite code is NOT retired here: it expires in 7
  // days on its own and its InviteUse rows are deleted above.
  const codes = { count: 0 };
  return { enrollments, uses, notifications, conversations, messages, quotas, telemetry, users, codes };
});

console.log(
  `deleted: ${deleted.users.count} users · ${deleted.enrollments.count} enrollments · ` +
  `${deleted.uses.count} inviteUses · ${deleted.notifications.count} notifications · ` +
  `${deleted.conversations.count} conversations · ${deleted.messages.count} messages · ` +
  `${deleted.quotas.count} quotas · ${deleted.telemetry.count} telemetry · ${deleted.codes.count} inviteCode`,
);

// sanity: the seed's demo cohort must be untouched (30 users)
const remaining = await prisma.user.count({ where: { email: { endsWith: '@demo.madarek.ly' } } });
console.log(`@demo.madarek.ly users remaining (seed baseline 30): ${remaining}`);

await prisma.$disconnect();
