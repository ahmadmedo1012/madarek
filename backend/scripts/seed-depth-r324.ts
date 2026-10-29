import { PrismaClient } from '@prisma/client';
async function main(): Promise<void> {
  const p = new PrismaClient();
  for (const [label, q] of [
    ['institutions', 'SELECT count(*)::int AS n FROM "Institution"'],
    ['colleges', 'SELECT count(*)::int AS n FROM "College"'],
    ['courses', 'SELECT count(*)::int AS n FROM "Course"'],
    ['chapters', 'SELECT count(*)::int AS n FROM "Chapter"'],
    ['lectures', 'SELECT count(*)::int AS n FROM "Lecture"'],
    ['enrollments', 'SELECT count(*)::int AS n FROM "Enrollment"'],
    ['assignments', 'SELECT count(*)::int AS n FROM "Assignment"'],
    ['liveSessions', 'SELECT count(*)::int AS n FROM "LiveSession"'],
    ['announcements', 'SELECT count(*)::int AS n FROM "Announcement"'],
    ['knowledgeChunks', 'SELECT count(*)::int AS n FROM "AiKnowledgeChunk"'],
    ['inviteCodes', 'SELECT count(*)::int AS n FROM "InviteCode"'],
  ] as const) {
    try {
      const r = (await p.$queryRawUnsafe(q)) as Array<{ n: number }>;
      console.log(label.toUpperCase() + '=' + r[0].n);
    } catch (e) {
      console.log(label.toUpperCase() + '=ERR ' + (e as Error).message.slice(0, 60));
    }
  }
  await p.$disconnect();
}
void main();
