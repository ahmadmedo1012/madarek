/**
 * DB integration — r171b: POST /api/v1/messages atomicity against a REAL
 * disposable Postgres. This is the evidence the documented gap asked
 * for (docs/16: «تبقى فجوة: اختبارات تكامل/DB (منطق المعاملات والأقفال)»)
 * and what unit tests with `vi.mock('../../src/db.js')` can NEVER prove:
 * the `$transaction(message.create + notification.create)` either lands
 * BOTH rows or NEITHER.
 *
 * App boot follows the project's route-test pattern
 * (owner-system-storage.test.ts): createApp().listen(0) + real fetch —
 * but WITHOUT vi.mock: real authMiddleware (real HS256 token), real
 * zod validate, real per-user rate limiter, real prisma.
 *
 * Pinned contract (me.routes.ts POST /messages):
 *   1. success → 201; Message row AND Notification row exist; the
 *      notification deep link follows the role's real inbox route:
 *      '/teacher/messages' for a TEACHER recipient, '/student/messages'
 *      for a STUDENT (r171a — the r155a null ceiling closed), null for
 *      roles without an inbox SPA route (a dead deep link is worse
 *      than none; pinned exactly as the code behaves, see the route
 *      comment).
 *   2. self-DM      → 400, zero rows (no message, no notification).
 *   3. inactive rcpt→ 400, zero rows.
 *   4. unknown cuid → 404, zero rows.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { bearer, db, seedInstitution, seedMembership, seedUser, truncateAll, unknownCuid } from './helpers.js';

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
  const tables = await truncateAll(db());
  expect(tables).toBeGreaterThan(70); // the full migrated schema is present
});

/** r179: the send-time guard requires the sender's verified institution
 * context — every sender fixture below carries an ACTIVE membership and
 * signs with the inst claim. */
const postMessage = (senderId: string, institutionId: string, body: unknown) =>
  fetch(`${baseUrl}/api/v1/messages`, {
    method: 'POST',
    headers: { ...bearer(senderId, Role.STUDENT, institutionId), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

interface ErrorEnvelope {
  error: { code: string; message: string };
}

describe('POST /api/v1/messages — atomic message + notification (real DB)', () => {
  it('teacher recipient: ONE transaction lands BOTH the Message row and the Notification row, link /teacher/messages', async () => {
    const sender = await seedUser({ firstName: 'سالم' });
    const recipient = await seedUser({ role: Role.TEACHER, firstName: 'أمينة' });
    const inst = await seedInstitution();
    await seedMembership(sender.id, inst.id, Role.STUDENT);
    await seedMembership(recipient.id, inst.id, Role.TEACHER);

    const res = await postMessage(sender.id, inst.id, {
      toUserId: recipient.id,
      body: 'مرحبًا أستاذة، سؤال عن الواجب الثالث',
    });
    expect(res.status).toBe(201);
    const payload = (await res.json()) as { data: { id: string; fromUserId: string; toUserId: string; body: string } };
    expect(payload.data.fromUserId).toBe(sender.id);
    expect(payload.data.toUserId).toBe(recipient.id);

    const prisma = db();
    // BOTH rows — the whole point of the $transaction.
    const message = await prisma.message.findUnique({ where: { id: payload.data.id } });
    expect(message).not.toBeNull();
    expect(message?.body).toBe('مرحبًا أستاذة، سؤال عن الواجب الثالث');

    const notification = await prisma.notification.findFirst({ where: { userId: recipient.id } });
    expect(notification).not.toBeNull();
    expect(notification?.type).toBe('SOCIAL');
    expect(notification?.title).toBe('رسالة جديدة من سالم');
    expect(notification?.body).toBe('مرحبًا أستاذة، سؤال عن الواجب الثالث');
    expect(notification?.link).toBe('/teacher/messages');
    expect(notification?.readAt).toBeNull();

    // Exactly one of each — no duplicate side effects.
    expect(await prisma.message.count()).toBe(1);
    expect(await prisma.notification.count()).toBe(1);
    // The sender hears nothing — the notification is recipient-only.
    expect(await prisma.notification.count({ where: { userId: sender.id } })).toBe(0);
  });

  it('student recipient: the notification deep link points at the student inbox (r171a: /student/messages exists — the r155a null ceiling is closed)', async () => {
    const sender = await seedUser();
    const recipient = await seedUser({ role: Role.STUDENT });
    const inst = await seedInstitution();
    await seedMembership(sender.id, inst.id, Role.STUDENT);
    await seedMembership(recipient.id, inst.id, Role.STUDENT);

    const res = await postMessage(sender.id, inst.id, { toUserId: recipient.id, body: 'سلام' });
    expect(res.status).toBe(201);

    const notification = await db().notification.findFirst({ where: { userId: recipient.id } });
    expect(notification).not.toBeNull();
    expect(notification?.link).toBe('/student/messages');
    expect(await db().message.count()).toBe(1);
  });

  it('self-DM → 400 + NOT ONE row is created (no message, no notification)', async () => {
    const sender = await seedUser();
    // Self-DM is rejected BEFORE the institution gate (order pin).
    const res = await postMessage(sender.id, 'inst-unused', { toUserId: sender.id, body: 'رسالة لنفسي' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('لا يمكنك إرسال رسالة إلى نفسك');

    const prisma = db();
    expect(await prisma.message.count()).toBe(0);
    expect(await prisma.notification.count()).toBe(0);
  });

  it('inactive recipient → 400 + zero rows', async () => {
    const sender = await seedUser();
    const recipient = await seedUser({ isActive: false });
    const inst = await seedInstitution();
    await seedMembership(sender.id, inst.id, Role.STUDENT);

    const res = await postMessage(sender.id, inst.id, { toUserId: recipient.id, body: 'هل أنت هناك؟' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('حساب المستلم غير نشط حالياً');

    const prisma = db();
    expect(await prisma.message.count()).toBe(0);
    expect(await prisma.notification.count()).toBe(0);
  });

  it('unknown recipient cuid → 404 + zero rows (no P2003 500 — the pre-validation pin)', async () => {
    const sender = await seedUser();
    const inst = await seedInstitution();
    await seedMembership(sender.id, inst.id, Role.STUDENT);

    const res = await postMessage(sender.id, inst.id, { toUserId: unknownCuid(), body: 'إلى مجهول' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('المستلم غير موجود');

    const prisma = db();
    expect(await prisma.message.count()).toBe(0);
    expect(await prisma.notification.count()).toBe(0);
  });
});
