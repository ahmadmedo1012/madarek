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
import { fanOutPush } from './push.js';

type NotifyTx = Pick<Prisma.TransactionClient, 'enrollment' | 'notification' | 'user'>;

/** The offering's ACTIVE students receive the payload — createMany
 *  (one round-trip for the whole roster), author excluded upstream
 *  where the caller knows them. Returns the recipient IDS (R327 C3:
 *  the caller pushes them post-commit; count = ids.length). */
export async function notifyOfferingStudentsTx(
  tx: NotifyTx,
  offeringId: string,
  payload: NotificationPayload,
): Promise<string[]> {
  const students = await tx.enrollment.findMany({
    where: { offeringId, status: 'active' },
    select: { studentId: true },
  });
  if (students.length === 0) return [];
  const ids = students.map((s) => s.studentId);
  await tx.notification.createMany({
    data: ids.map((userId) => ({ userId, ...payload })),
  });
  return ids;
}

/** The degraded twin — its own transaction, failure = warn, never a
 *  thrown error into a caller whose real write already succeeded.
 *  R327 C3: after the commit lands, the push fan-out rides the same
 *  payload (best-effort, PUSH_ENABLED-gated, never fails the event). */
export async function notifyOfferingStudents(
  offeringId: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    const ids = await prisma.$transaction((tx) => notifyOfferingStudentsTx(tx, offeringId, payload));
    await fanOutPush(ids, payload);
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
): Promise<string[]> {
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

  if (ids.length === 0) return [];
  await tx.notification.createMany({ data: ids.map((userId) => ({ userId, ...payload })) });
  return ids;
}
