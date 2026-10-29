/**
 * r323 B4 — the demo cohort («حذف بيانات العرض»): the registrar's
 * one-action removal of the pilot's sample students.
 *
 * The cohort is flagged by its email domain (@demo.madarek.ly — set
 * by prisma/seed-pilot.ts and by NOTHING else), so the sweep can never
 * touch a real account: the WHERE clause reads the domain, not a flag
 * column that could drift.
 *
 * The removal is a HARD delete in dependency order inside ONE
 * transaction: every required-FK child table is cleared by
 * userId/studentId first (the demo cohort is fresh, so most are
 * no-ops — the list is exhaustive anyway so an activity-rich demo
 * account deletes as cleanly as a fresh one), then the profiles and
 * memberships, then the users. Any FK restrict error aborts the whole
 * transaction — a half-swept cohort is worse than none.
 */
import { type Prisma, type PrismaClient } from '@prisma/client';

export const DEMO_EMAIL_SUFFIX = '@demo.madarek.ly';

/** The demo users' ids — the ONLY selector the sweep may use. */
export async function demoCohortIds(prisma: PrismaClient | Prisma.TransactionClient): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Preview for the confirm dialog: how many, and how much activity
 *  would go with them. */
export async function demoCohortStats(prisma: PrismaClient) {
  const ids = await demoCohortIds(prisma);
  if (ids.length === 0) return { students: 0, enrollments: 0, grades: 0, watchEvents: 0, submissions: 0 };
  const [enrollments, grades, watchEvents, submissions] = await Promise.all([
    prisma.enrollment.count({ where: { studentId: { in: ids } } }),
    prisma.grade.count({ where: { studentId: { in: ids } } }),
    prisma.watchEvent.count({ where: { studentId: { in: ids } } }),
    prisma.submission.count({ where: { studentId: { in: ids } } }),
  ]);
  return { students: ids.length, enrollments, grades, watchEvents, submissions };
}

/** The ordered sweep. Returns the deleted-user count. */
export async function removeDemoCohort(prisma: PrismaClient): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const ids = await demoCohortIds(tx);
    if (ids.length === 0) return 0;
    const uid = { in: ids };
    const sid = { in: ids };

    // 1. the demo students' own social/authoring rows (and the rows
    //    hanging off them — a demo post's OTHERS' comments go too).
    const demoPosts = await tx.post.findMany({ where: { authorId: uid }, select: { id: true } });
    const postIds = { in: demoPosts.map((p) => p.id) };
    if (demoPosts.length > 0) {
      await tx.postComment.deleteMany({ where: { OR: [{ authorId: uid }, { postId: postIds }] } });
      await tx.postReaction.deleteMany({ where: { OR: [{ userId: uid }, { postId: postIds }] } });
      await tx.post.deleteMany({ where: { authorId: uid } });
    } else {
      await tx.postComment.deleteMany({ where: { authorId: uid } });
      await tx.postReaction.deleteMany({ where: { userId: uid } });
    }

    // 2. academic activity (most are empty for a fresh cohort).
    await tx.examAnswer.deleteMany({ where: { attempt: { studentId: sid } } });
    await tx.examAttempt.deleteMany({ where: { studentId: sid } });
    await tx.paperAnnotation.deleteMany({ where: { authorId: uid } });
    await tx.researchPaper.deleteMany({ where: { studentId: sid } });
    await tx.checkpointAnswer.deleteMany({ where: { studentId: sid } });
    await tx.watchEvent.deleteMany({ where: { studentId: sid } });
    await tx.studentMastery.deleteMany({ where: { studentId: sid } });
    await tx.submission.deleteMany({ where: { studentId: sid } });
    await tx.grade.deleteMany({ where: { studentId: sid } });
    await tx.attendanceRecord.deleteMany({ where: { studentId: sid } });
    await tx.enrollment.deleteMany({ where: { studentId: sid } });

    // 3. training / campus / library / labs / achievements.
    await tx.trainingEnrollment.deleteMany({ where: { userId: uid } });
    await tx.userBadge.deleteMany({ where: { userId: uid } });
    await tx.pointsLedger.deleteMany({ where: { userId: uid } });
    await tx.userAchievement.deleteMany({ where: { userId: uid } });
    await tx.userSkill.deleteMany({ where: { userId: uid } });
    await tx.certificate.deleteMany({ where: { userId: uid } });
    await tx.labSession.deleteMany({ where: { userId: uid } });
    await tx.moocEnrollment.deleteMany({ where: { userId: uid } });
    await tx.jobApplication.deleteMany({ where: { userId: uid } });
    await tx.loan.deleteMany({ where: { userId: uid } });
    await tx.studyRoomMember.deleteMany({ where: { userId: uid } });
    await tx.eventRSVP.deleteMany({ where: { userId: uid } });
    await tx.competitionEntry.deleteMany({ where: { userId: uid } });

    // 4. comms + auth plumbing.
    await tx.message.deleteMany({ where: { OR: [{ fromUserId: uid }, { toUserId: uid }] } });
    await tx.notification.deleteMany({ where: { userId: uid } });
    await tx.inviteUse.deleteMany({ where: { userId: uid } });
    await tx.passwordResetToken.deleteMany({ where: { userId: uid } });
    // userPermission: userId is Cascade; grantedById is optional (SET NULL).
    await tx.aiConversation.deleteMany({ where: { userId: uid } }); // messages cascade

    // 5. profiles + memberships + the users themselves.
    await tx.studentProfile.deleteMany({ where: { userId: uid } });
    await tx.membership.deleteMany({ where: { userId: uid } });
    const users = await tx.user.deleteMany({ where: { id: uid } });
    return users.count;
  });
}
