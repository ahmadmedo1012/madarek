/**
 * DB integration — r171b: the last-active-OWNER governance guard
 * (lib/governance.ts) against a REAL disposable Postgres — the locks
 * half of the documented gap (docs/16: «منطق المعاملات والأقفال»).
 *
 * Part 1 (route-level, the owner console): POST /api/v1/owner/users/:id/role
 * and PATCH /api/v1/owner/users/:id/status through the REAL app
 * (createApp().listen(0), real authMiddleware + requireRole(OWNER)):
 *   - 2 active owners → demoting one SUCCEEDS (200) and writes the
 *     AuditLog ROLE_CHANGE row in the SAME transaction;
 *   - the surviving owner is now the LAST ACTIVE owner → a further
 *     demotion/deactivation is rejected 409, role untouched, NO audit
 *     row (the whole transaction rolled back);
 *   - self-demotion and promotion-to-OWNER are 403;
 *   - STUDENT→TEACHER promotion provisions the TeacherProfile inside
 *     the same transaction (audit metadata teacherProfileProvisioned)
 *     and a demotion back KEEPS the profile (documented semantics).
 *
 * Part 2 (lock-level): lockActiveOwnerRows' SELECT … FOR UPDATE inside
 * the mutation transaction is the TOCTOU fix (audit 15-b P1-1) — two
 * CONCURRENT demotions of the last two active owners would both pass
 * a plain count under Read-Committed. This test runs both transactions
 * literally concurrently and proves the second one BLOCKS on the row
 * locks, then re-reads the post-commit state and rejects 409 — so
 * exactly one OWNER survives.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/lib/errors.js';
import { assertNotLastActiveOwner, lockActiveOwnerRows } from '../../src/lib/governance.js';
import { bearer, db, seedUser, truncateAll, uniqueSuffix } from './helpers.js';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Prisma Json → plain record (AuditLog.metadata), type-narrowed. */
function jsonRecord(value: Prisma.JsonValue): Record<string, unknown> {
  expect(typeof value).toBe('object');
  expect(value).not.toBeNull();
  return value as Record<string, unknown>;
}

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(async () => {
  await truncateAll(db());
});

const changeRole = (actorId: string, targetId: string, role: Role) =>
  fetch(`${baseUrl}/api/v1/owner/users/${targetId}/role`, {
    method: 'POST',
    headers: { ...bearer(actorId, Role.OWNER), 'content-type': 'application/json' },
    body: JSON.stringify({ role }),
  });

const toggleStatus = (actorId: string, targetId: string, isActive: boolean) =>
  fetch(`${baseUrl}/api/v1/owner/users/${targetId}/status`, {
    method: 'PATCH',
    headers: { ...bearer(actorId, Role.OWNER), 'content-type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });

describe('owner console governance route (real app + real DB)', () => {
  it('with 2 active owners: demoting one succeeds, writes the AuditLog row, and bumps tokenVersion', async () => {
    const prisma = db();
    const actor = await seedUser({ role: Role.OWNER, firstName: 'مالك-أ' });
    const target = await seedUser({ role: Role.OWNER, firstName: 'مالك-ب' });

    const res = await changeRole(actor.id, target.id, Role.ADMIN);
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { data: { id: string; role: Role } };
    expect(payload.data).toEqual({ id: target.id, role: Role.ADMIN });

    // The mutation AND its audit row landed together.
    const demoted = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(demoted.role).toBe(Role.ADMIN);
    expect(demoted.tokenVersion).toBe(1); // refresh tokens revoked by the bump
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'ROLE_CHANGE', resourceType: 'User', resourceId: target.id },
    });
    expect(audit.userId).toBe(actor.id);
    const meta = jsonRecord(audit.metadata);
    expect(meta.oldRole).toBe(Role.OWNER);
    expect(meta.newRole).toBe(Role.ADMIN);
    expect(meta.source).toBe('owner');
    expect(meta.teacherProfileProvisioned).toBeUndefined();
    expect(await prisma.user.count({ where: { role: Role.OWNER, isActive: true } })).toBe(1);
  });

  it('demoting the LAST ACTIVE owner → 409, role untouched, NO audit row (full rollback)', async () => {
    const prisma = db();
    const actor = await seedUser({ role: Role.OWNER, isActive: false, firstName: 'مالك-خامل' });
    const target = await seedUser({ role: Role.OWNER, firstName: 'مالك-أخير' });
    // actor is an INACTIVE owner: its JWT still carries role=OWNER (access
    // tokens are role-claim based; deactivation revokes refresh only —
    // the documented D3 token-version trade-off), which is exactly the
    // arrangement that leaves `target` as the platform's only ACTIVE
    // owner while a real OWNER-role caller drives the route.

    const res = await changeRole(actor.id, target.id, Role.ADMIN);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBe('لا يمكن خفض دور أو تعطيل آخر مالك نشط للمنصة');

    // Nothing changed — guard, mutation and audit rolled back together.
    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(untouched.role).toBe(Role.OWNER);
    expect(untouched.isActive).toBe(true);
    expect(untouched.tokenVersion).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'ROLE_CHANGE' } })).toBe(0);
  });

  it('DEACTIVATING the last active owner → 409 (same guard on the status route)', async () => {
    const prisma = db();
    const actor = await seedUser({ role: Role.OWNER, isActive: false });
    const target = await seedUser({ role: Role.OWNER });

    const res = await toggleStatus(actor.id, target.id, false);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toBe('لا يمكن خفض دور أو تعطيل آخر مالك نشط للمنصة');

    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(untouched.isActive).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: 'STATUS_CHANGE' } })).toBe(0);
  });

  it('self-demotion → 403, and promotion TO owner is impossible through the API', async () => {
    const prisma = db();
    const actor = await seedUser({ role: Role.OWNER });
    const other = await seedUser({ role: Role.STUDENT });

    const self = await changeRole(actor.id, actor.id, Role.ADMIN);
    expect(self.status).toBe(403);
    const selfBody = (await self.json()) as { error: { code: string; message: string } };
    expect(selfBody.error.message).toBe('لا يمكنك تغيير دورك بنفسك');

    const promote = await changeRole(actor.id, other.id, Role.OWNER);
    expect(promote.status).toBe(403);
    const promoteBody = (await promote.json()) as { error: { code: string; message: string } };
    expect(promoteBody.error.message).toBe('لا يمكن منح دور المالك عبر النظام — تواصل مع الدعم الفني');

    expect(await prisma.user.count({ where: { role: Role.OWNER } })).toBe(1);
  });

  it('promote STUDENT→TEACHER then demote back: profile provisioned+retained, two audit rows', async () => {
    const prisma = db();
    const actor = await seedUser({ role: Role.OWNER });
    const student = await seedUser({ role: Role.STUDENT });
    const faculty = await prisma.faculty.create({ data: { name: `كلية ${uniqueSuffix()}` } });
    const department = await prisma.department.create({
      data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
    });
    await prisma.studentProfile.create({
      data: { userId: student.id, universityId: `U-${uniqueSuffix()}`, facultyId: faculty.id, departmentId: department.id },
    });

    // Promote: the TeacherProfile is created in the SAME transaction,
    // defaulting to the student's own department (planTeacherProvisioning).
    const promote = await changeRole(actor.id, student.id, Role.TEACHER);
    expect(promote.status).toBe(200);
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: student.id } });
    expect(profile).not.toBeNull();
    expect(profile?.departmentId).toBe(department.id);
    expect(profile?.specialty).toBe('غير محدد'); // TEACHER_DEFAULT_SPECIALTY
    const promoteAudit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'ROLE_CHANGE', resourceId: student.id },
    });
    const promoteMeta = jsonRecord(promoteAudit.metadata);
    expect(promoteMeta.oldRole).toBe(Role.STUDENT);
    expect(promoteMeta.newRole).toBe(Role.TEACHER);
    expect(promoteMeta.teacherProfileProvisioned).toBe(true);

    // Demote back: succeeds, and the TeacherProfile is intentionally
    // RETAINED (a re-promotion keeps the teacher's data).
    const demote = await changeRole(actor.id, student.id, Role.STUDENT);
    expect(demote.status).toBe(200);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).toMatchObject({
      role: Role.STUDENT,
      tokenVersion: 2,
    });
    expect(await prisma.teacherProfile.findUnique({ where: { userId: student.id } })).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: 'ROLE_CHANGE', resourceId: student.id } })).toBe(2);
  });
});

describe('lockActiveOwnerRows — SELECT … FOR UPDATE serialization (TOCTOU fix)', () => {
  it('two concurrent last-owner demotions: the second BLOCKS, then rejects 409 — one owner survives', async () => {
    const prisma = db();
    const ownerA = await seedUser({ role: Role.OWNER, firstName: 'مالك-1' });
    const ownerB = await seedUser({ role: Role.OWNER, firstName: 'مالك-2' });
    // Interactive transactions default to a 5s timeout — the deliberate
    // lock hold below needs headroom, and so does the blocked second
    // transaction.
    const txOptions = { timeout: 15_000, maxWait: 10_000 };

    let releaseT1!: () => void;
    const holdT1 = new Promise<void>((resolve) => {
      releaseT1 = resolve;
    });
    let t1Locked = false;

    // T1: lock every active owner row, HOLD the locks, then demote A.
    const t1 = prisma.$transaction(
      async (tx) => {
        await lockActiveOwnerRows(tx);
        t1Locked = true;
        await holdT1;
        await tx.user.update({
          where: { id: ownerA.id },
          data: { role: Role.ADMIN, tokenVersion: { increment: 1 } },
        });
      },
      txOptions,
    );

    // Bounded wait until T1 provably holds the locks.
    const deadline = Date.now() + 5_000;
    while (!t1Locked && Date.now() < deadline) {
      await sleep(25);
    }
    expect(t1Locked).toBe(true);

    // T2: the competing demotion of B (guard + count in ITS transaction).
    let t2Outcome: { ok: boolean; error?: unknown } | undefined;
    const t2 = (async () => {
      try {
        await prisma.$transaction(
          async (tx) => {
            await lockActiveOwnerRows(tx); // ← must block on T1's row locks
            // Only reachable AFTER T1 committed:
            await assertNotLastActiveOwner(ownerB.id, tx);
          },
          txOptions,
        );
        t2Outcome = { ok: true };
      } catch (e) {
        t2Outcome = { ok: false, error: e };
      }
    })();

    // THE lock evidence: while T1 holds the FOR UPDATE locks, T2 cannot
    // even get past its locking SELECT (never mind the count).
    await sleep(500);
    expect(t2Outcome).toBeUndefined();

    releaseT1();
    await t1; // T1 commits — ownerA is demoted.

    await t2;
    expect(t2Outcome?.ok).toBe(false);
    const guardError = t2Outcome?.error;
    expect(guardError).toBeInstanceOf(AppError);
    const conflict = guardError as AppError;
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe('CONFLICT');
    expect(conflict.message).toBe('لا يمكن خفض دور أو تعطيل آخر مالك نشط للمنصة');

    // Post-serialization: exactly ONE owner remains — the platform can
    // never end up with zero active owners through concurrent demotions.
    const survivors = await prisma.user.findMany({
      where: { role: Role.OWNER },
      select: { id: true, isActive: true },
    });
    expect(survivors).toEqual([{ id: ownerB.id, isActive: true }]);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: ownerA.id } })).toMatchObject({
      role: Role.ADMIN,
    });
  });
});
