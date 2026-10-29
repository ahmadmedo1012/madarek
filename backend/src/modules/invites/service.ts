/**
 * r323 B3.1 — invite codes (service layer: prisma + the consume/write
 * paths). The pure layer (core.ts) owns the grammar; this owns the
 * transactional honesty.
 */
import { Role, Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { AppError } from '../../lib/errors.js';
import { evaluateInvite, generateInviteCode, inviteScopeOf } from './core.js';

export interface CreateInviteInput {
  role: 'STUDENT' | 'TEACHER';
  offeringId?: string;
  departmentId?: string;
  facultyId?: string;
  expiresInDays: number;
  maxUses: number;
}

/** Exactly one scope — the honest-target rule. */
export async function createInvite(createdById: string, input: CreateInviteInput) {
  const scopes = [input.offeringId, input.departmentId, input.facultyId].filter(Boolean);
  if (scopes.length !== 1) {
    throw AppError.badRequest('حدّد هدفًا واحدًا للكود: مقررًا أو قسمًا أو كلية.');
  }
  if (input.expiresInDays < 1 || input.expiresInDays > 90) {
    throw AppError.badRequest('مدة الصلاحية: يوم واحد إلى 90 يومًا.');
  }
  if (input.maxUses < 1 || input.maxUses > 500) {
    throw AppError.badRequest('أقصى عدد للاستخدام: 1 إلى 500.');
  }

  // the creator must own the offering when the scope is one (the same
  // assertOwnsOffering contract the curriculum router rides).
  if (input.offeringId) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: input.offeringId },
      select: { teacherId: true },
    });
    if (!offering) throw AppError.notFound('المقرر غير موجود');
    const caps = await prisma.user.findUnique({ where: { id: createdById }, select: { role: true } });
    if (caps?.role === Role.TEACHER && offering.teacherId !== createdById) {
      throw AppError.forbidden('أنت لا تدرّس هذا المقرر');
    }
  }

  // collision-safe: cuid-level uniqueness is not needed — the 8-char
  // space is huge; three retries make a coincidence impossible in practice.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateInviteCode();
    try {
      return await prisma.inviteCode.create({
        data: {
          code,
          role: input.role,
          offeringId: input.offeringId ?? null,
          departmentId: input.departmentId ?? null,
          facultyId: input.facultyId ?? null,
          createdById,
          expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000),
          maxUses: input.maxUses,
        },
        include: {
          offering: { select: { id: true, course: { select: { code: true, name: true } } } },
          department: { select: { id: true, name: true } },
          faculty: { select: { id: true, name: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
  throw AppError.conflict('تعذّر توليد كود فريد — أعد المحاولة.');
}

/** The PUBLIC pre-submit validation (register page hint). */
export async function validateInvitePublic(code: string, role: string) {
  const row = await prisma.inviteCode.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: {
      id: true, code: true, role: true, offeringId: true, departmentId: true,
      facultyId: true, expiresAt: true, maxUses: true, usedCount: true,
      offering: { select: { course: { select: { code: true, name: true } } } },
      department: { select: { name: true } },
      faculty: { select: { name: true } },
    },
  });
  const verdict = evaluateInvite(row ? { ...row, role: row.role as 'STUDENT' | 'TEACHER' } : null, role);
  if (!verdict.ok) throw AppError.badRequest(verdict.reason);
  const scope = inviteScopeOf(row!);
  const label =
    scope?.kind === 'offering' ? `مقرر ${row!.offering!.course.code} — ${row!.offering!.course.name}`
    : scope?.kind === 'department' ? `قسم ${row!.department!.name}`
    : scope?.kind === 'faculty' ? `كلية ${row!.faculty!.name}`
    : null;
  return { valid: true as const, role: row!.role, scopeLabel: label };
}

/** The consume: MUST be called after the account exists (register flow
 * orders it). Idempotent per (code, user); enrolls into the scoped
 * offering when the scope is one. */
export async function consumeInvite(code: string, userId: string) {
  const row = await prisma.inviteCode.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: {
      id: true, code: true, role: true, offeringId: true, expiresAt: true,
      maxUses: true, usedCount: true,
    },
  });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const verdict = evaluateInvite(
    row
      ? {
          ...row,
          role: row.role as 'STUDENT' | 'TEACHER',
          departmentId: null as string | null,
          facultyId: null as string | null,
        }
      : null,
    user?.role ?? '',
  );
  if (!verdict.ok) throw AppError.badRequest(verdict.reason);

  return prisma.$transaction(async (tx) => {
    // the counted claim: only when under the cap (the where-guard makes
    // a concurrent over-consume lose the update and 409 honestly).
    const claimed = await tx.inviteCode.updateMany({
      where: { id: row!.id, usedCount: { lt: row!.maxUses } },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw AppError.conflict('استُنفد هذا الكود للتو — جرّب كودًا آخر.');
    }
    await tx.inviteUse.create({ data: { codeId: row!.id, userId } }); // unique → repeat joins no-op
    if (row!.offeringId) {
      await tx.enrollment.upsert({
        where: { studentId_offeringId: { studentId: userId, offeringId: row!.offeringId } },
        create: { offeringId: row!.offeringId, studentId: userId, status: 'active' },
        update: { status: 'active' },
      });
    }
    return { enrolled: Boolean(row!.offeringId) };
  });
}

export async function listInvites(createdById: string) {
  return prisma.inviteCode.findMany({
    where: { createdById },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      offering: { select: { course: { select: { code: true, name: true } } } },
      department: { select: { name: true } },
      faculty: { select: { name: true } },
    },
  });
}

export async function revokeInvite(id: string, userId: string, role: Role) {
  const row = await prisma.inviteCode.findUnique({ where: { id }, select: { createdById: true } });
  if (!row) throw AppError.notFound('الكود غير موجود');
  if (role !== Role.OWNER && row.createdById !== userId) {
    throw AppError.forbidden('لا تملك إلغاء هذا الكود');
  }
  await prisma.inviteCode.delete({ where: { id } });
}
