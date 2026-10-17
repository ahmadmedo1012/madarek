/**
 * Backend unit test — r171a: the DM notification deep-link mapping in
 * `backend/src/http/routes/me.routes.ts` POST /messages (mounted at
 * /api/v1/messages — the me router mounts at the bare /api/v1 prefix
 * with its own root-level paths, like /notifications).
 *
 * Until r171a the recipient-side notification carried
 * `link: recipient.role === Role.TEACHER ? '/teacher/messages' : null`
 * — students received DMs with NO deep link because no student inbox
 * existed. r171a ships /student/messages (frontend/src/pages/student/
 * MessagesPage.tsx, STUDENT-guarded in App.tsx), so the mapping now
 * answers: TEACHER → '/teacher/messages', STUDENT → '/student/messages',
 * every other role → null (a dead deep link is worse than none).
 *
 * r179 (phase-5): the DM send-time institution guard — the sender's
 * verified context is REQUIRED (403 INSTITUTION_CONTEXT_REQUIRED
 * without one) and the recipient must hold an ACTIVE membership in the
 * sender's institution (403 otherwise — cross-institution DM is
 * disabled). Both membership.findFirst calls are mocked.
 *
 * DB-free (the exams-grade-submit.test.ts pattern): the REAL app
 * (createApp, ephemeral port) with prisma mocked and a JWT signed via
 * signAccessToken; `$transaction` hands the callback a tx client whose
 * message.create / notification.create are DISTINCT spies, so the pin
 * proves the notification rides the same transaction as the message
 * (not a post-commit side effect).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { NotificationType, Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  // Defensive: other modules in the app graph import withRetry from db.js.
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

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

// ── Mock wiring ──────────────────────────────────────────────────────

const userFindUnique = vi.mocked(prisma.user.findUnique);
const membershipFindFirst = vi.mocked(prisma.membership.findFirst);
const transaction = vi.mocked(prisma.$transaction);

/**
 * Prisma delegates return PrismaPromise (branded via Symbol.toStringTag)
 * — a plain async function can never satisfy that structurally, so mock
 * implementations need one cast (the enrollments-scope.test.ts pattern).
 * Everything inside the impl stays fully type-checked.
 */
type UserFindUniqueImpl = NonNullable<Parameters<typeof userFindUnique.mockImplementation>[0]>;
type TransactionImpl = NonNullable<Parameters<typeof transaction.mockImplementation>[0]>;

/** The r179 sender institution — the token's inst claim, DB-verified
 * by the mocked membership.findFirst below. */
const INSTITUTION = 'inst-r179-messages';

/** One recipient row per test — { id, firstName, isActive, role } is the
 * route's own select shape for the recipient probe. */
let recipientRow: { id: string; firstName: string; isActive: boolean; role: Role } | null = null;
/** The sender probe's shape: { firstName } (the notification title needs it). */
let senderRow: { firstName: string } | null = { firstName: 'آمنة' };

const dispatchUser = userFindUnique.mockImplementation(
  (async (args: { where?: { id?: string } }) => {
    const id = args.where?.id;
    if (id && recipientRow && id === recipientRow.id) return recipientRow;
    return senderRow;
  }) as unknown as UserFindUniqueImpl,
);

/** r179: does the RECIPIENT hold an active membership in the sender's
 * institution? Default true (same-institution DM). */
let recipientIsMember = true;

/* r179: both the sender's context verification (select institutionId)
 * and the recipient's same-institution check (select id) ride
 * membership.findFirst — the dispatch answers per `recipientIsMember`. */
const dispatchMembership = membershipFindFirst.mockImplementation(
  (async (args: { where?: { userId?: string; institutionId?: string } }) => {
    const userId = args.where?.userId;
    if (userId && recipientRow && userId === recipientRow.id) {
      return recipientIsMember ? { id: 'membership-recipient', institutionId: INSTITUTION } : null;
    }
    // The sender's own context verification.
    return { id: 'membership-sender', institutionId: INSTITUTION };
  }) as unknown as Parameters<typeof membershipFindFirst.mockImplementation>[0],
);

/** DISTINCT spies for the transaction client — proves both writes ride
 * the SAME transaction. */
const txMessageCreate = vi.fn();
const txNotificationCreate = vi.fn();
const txClient = {
  message: { create: txMessageCreate },
  notification: { create: txNotificationCreate },
};

const passthroughTransaction = transaction.mockImplementation(
  (async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient)) as unknown as TransactionImpl,
);

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations, but re-asserting the shared
  // defaults keeps the suite order-proof (tests may override).
  dispatchUser.mockClear();
  dispatchMembership.mockClear();
  passthroughTransaction.mockClear();
  senderRow = { firstName: 'آمنة' };
  recipientRow = null;
  recipientIsMember = true;
});

// ── Fixtures ─────────────────────────────────────────────────────────

// cuid-shaped: sendMessageSchema validates toUserId as a cuid.
const RECIPIENT_STUDENT = 'ckr171astudentrecipient';
const RECIPIENT_TEACHER = 'ckr171ateacherrecipient01';
const RECIPIENT_ADMIN = 'ckr171aadminrecipient0001';
const BODY = 'سؤال عن موعد المحاضرة القادمة';

const recipient = (id: string, role: Role) => ({
  id,
  firstName: 'سالم',
  isActive: true,
  role,
});

/** POST /api/v1/messages as the given sender. Distinct sender ids per
 * call keep the per-user 30/min limiter's buckets isolated. */
const postMessage = (senderId: string, role: Role, toUserId: string, institutionId: string | null = INSTITUTION) =>
  fetch(`${baseUrl}/api/v1/messages`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${signAccessToken(senderId, role, institutionId)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ toUserId, body: BODY }),
  });

// ── The r171a mapping ────────────────────────────────────────────────

describe('POST /api/v1/messages — DM notification deep-link mapping (r171a)', () => {
  it('a STUDENT recipient → notification rides the transaction with link /student/messages', async () => {
    recipientRow = recipient(RECIPIENT_STUDENT, Role.STUDENT);

    const res = await postMessage('sender-r171a-student', Role.STUDENT, RECIPIENT_STUDENT);
    expect(res.status).toBe(201);

    // The message and its notification are ONE transaction — the pin
    // from the r170a route contract, held here alongside the link.
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txMessageCreate).toHaveBeenCalledWith({
      data: { fromUserId: 'sender-r171a-student', toUserId: RECIPIENT_STUDENT, body: BODY },
    });
    expect(txNotificationCreate).toHaveBeenCalledTimes(1);
    expect(txNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: RECIPIENT_STUDENT,
        type: NotificationType.SOCIAL,
        icon: '💬',
        title: 'رسالة جديدة من آمنة',
        body: BODY,
        link: '/student/messages',
      },
    });
    // Ordering: the notification rides the transaction (its invocation
    // index is strictly after the $transaction call).
    const txCallIndex = transaction.mock.invocationCallOrder[0];
    const notifCallIndex = txNotificationCreate.mock.invocationCallOrder[0];
    expect(typeof txCallIndex).toBe('number');
    expect(typeof notifCallIndex).toBe('number');
    expect((txCallIndex as number) < (notifCallIndex as number)).toBe(true);
  });

  it('a TEACHER recipient → link /teacher/messages (the r155a behavior, held)', async () => {
    recipientRow = recipient(RECIPIENT_TEACHER, Role.TEACHER);

    const res = await postMessage('sender-r171a-teacher', Role.STUDENT, RECIPIENT_TEACHER);
    expect(res.status).toBe(201);

    expect(txNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ link: '/teacher/messages' }) }),
    );
  });

  it('a role with no inbox (ADMIN) → link null — a dead deep link is worse than none', async () => {
    recipientRow = recipient(RECIPIENT_ADMIN, Role.ADMIN);

    const res = await postMessage('sender-r171a-admin', Role.STUDENT, RECIPIENT_ADMIN);
    expect(res.status).toBe(201);

    expect(txNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ link: null }) }),
    );
  });
});

// ── The r179 send-time institution guard ────────────────────────────

describe('POST /api/v1/messages — r179 send-time institution guard', () => {
  it('a contextless sender → 403 INSTITUTION_CONTEXT_REQUIRED, no write', async () => {
    recipientRow = recipient(RECIPIENT_TEACHER, Role.TEACHER);

    const res = await postMessage('sender-r179a-ctx', Role.STUDENT, RECIPIENT_TEACHER, null);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(txMessageCreate).not.toHaveBeenCalled();
  });

  it('a recipient outside the sender’s institution → 403, no message written', async () => {
    recipientRow = recipient(RECIPIENT_TEACHER, Role.TEACHER);
    recipientIsMember = false;

    const res = await postMessage('sender-r179a-foreign', Role.STUDENT, RECIPIENT_TEACHER);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string; message: string } };
    // 403 FORBIDDEN with the clear Arabic cross-institution DM message.
    expect(json.error.code).toBe('FORBIDDEN');
    expect(json.error.message).toContain('داخل مؤسستك فقط');
    expect(transaction).not.toHaveBeenCalled();
    expect(txMessageCreate).not.toHaveBeenCalled();
  });
});
