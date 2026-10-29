/**
 * r323 B3.3 — notifications (fire layer: audience resolution + the
 * write). The pure payloads live in core.ts; this owns the honesty:
 *
 *  - notifyOfferingStudentsTx — INSIDE the caller's transaction, so
 *    the academic write and its tell land (or roll back) together.
 *  - notifyOfferingStudents / notifyAnnouncementScope — the degraded
 *    twins for flows whose primary write is already committed (the
 *    PDF-bytes upload, the two-write live schedule): a notification
 *    failure logs a warning and NEVER 500s the completed event.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import type { NotificationPayload } from './core.js';

type NotifyTx = Pick<Prisma.TransactionClient, 'enrollment' | 'notification' | 'user'>;

/** The offering's ACTIVE students receive the payload — createMany
 *  (one round-trip for the whole roster), author excluded upstream
 *  where the caller knows them. Returns the recipient count. */
export async function notifyOfferingStudentsTx(
  tx: NotifyTx,
  offeringId: string,
  payload: NotificationPayload,
): Promise<number> {
  const students = await tx.enrollment.findMany({
    where: { offeringId, status: 'active' },
    select: { studentId: true },
  });
  if (students.length === 0) return 0;
  await tx.notification.createMany({
    data: students.map((s) => ({ userId: s.studentId, ...payload })),
  });
  return students.length;
}

/** The degraded twin — its own transaction, failure = warn, never a
 *  thrown error into a caller whose real write already succeeded. */
export async function notifyOfferingStudents(
  offeringId: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    await prisma.$transaction((tx) => notifyOfferingStudentsTx(tx, offeringId, payload));
  } catch (e) {
    logger.warn({ err: e, offeringId, title: payload.title }, 'notify: degraded (offering fire failed)');
  }
}

type AnnounceTx = Pick<Prisma.TransactionClient, 'user' | 'enrollment' | 'notification'>;

/** The announcement audience: PLATFORM = every active member of the
 *  author's institution; FACULTY/DEPARTMENT = the students (profile)
 *  AND the teachers (department) inside it; OFFERING = the active
 *  enrollments. The author never notifies themselves. Returns the
 *  recipient count. */
export async function notifyAnnouncementScopeTx(
  tx: AnnounceTx,
  params: {
    scope: 'PLATFORM' | 'FACULTY' | 'DEPARTMENT' | 'OFFERING';
    scopeId: string | null;
    authorId: string;
    institutionId: string | null;
  },
  payload: NotificationPayload,
): Promise<number> {
  const { scope, scopeId, authorId, institutionId } = params;
  const activeMembership = {
    memberships: { some: { isActive: true, ...(institutionId ? { institutionId } : {}) } },
  };

  let ids: string[];
  if (scope === 'OFFERING' && scopeId) {
    const rows = await tx.enrollment.findMany({
      where: { offeringId: scopeId, status: 'active', studentId: { not: authorId } },
      select: { studentId: true },
    });
    ids = rows.map((r) => r.studentId);
  } else if (scope === 'FACULTY' && scopeId) {
    const rows = await tx.user.findMany({
      where: {
        AND: [
          activeMembership,
          { id: { not: authorId } },
          {
            OR: [
              { studentProfiles: { some: { facultyId: scopeId } } },
              { teacherProfiles: { some: { department: { facultyId: scopeId } } } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    ids = rows.map((r) => r.id);
  } else if (scope === 'DEPARTMENT' && scopeId) {
    const rows = await tx.user.findMany({
      where: {
        AND: [
          activeMembership,
          { id: { not: authorId } },
          {
            OR: [
              { studentProfiles: { some: { departmentId: scopeId } } },
              { teacherProfiles: { some: { departmentId: scopeId } } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    ids = rows.map((r) => r.id);
  } else {
    // PLATFORM (or a malformed scope/scopeId pair — the route already
    // validated them): the author's institution, everyone active.
    const rows = await tx.user.findMany({
      where: { AND: [activeMembership, { id: { not: authorId } }] },
      select: { id: true },
    });
    ids = rows.map((r) => r.id);
  }

  if (ids.length === 0) return 0;
  await tx.notification.createMany({ data: ids.map((userId) => ({ userId, ...payload })) });
  return ids.length;
}
