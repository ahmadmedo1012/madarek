/**
 * Backend unit test — the two r165c fixes on
 * `backend/src/http/routes/exams.routes.ts`:
 *
 *  1. POST /exams/attempts/:attemptId/grade — the SUBMITTED → GRADED
 *     finalization must notify the student INSIDE the grade
 *     transaction (the submissions.routes.ts «تم تصحيح تكليفك»
 *     pattern). Before r165c the transaction wrote GRADED + the
 *     answer verdicts with ZERO notifications: the student's card
 *     said «بانتظار التصحيح اليدوي … ستتمكّن من مراجعة أسئلتك بعد
 *     اكتمال التصحيح» and nothing ever signaled completion — the
 *     verdict only surfaced if the student happened to revisit after
 *     the cache window.
 *  2. POST /exams/attempts/:id/submit — a submit hitting a row the
 *     expiry sweep already flipped to EXPIRED used to be told
 *     «تم تسليم هذه المحاولة مسبقاً» — factually wrong (an EXPIRED
 *     attempt was never submitted and will never be graded). EXPIRED
 *     now gets the terminal «انتهى وقت هذه المحاولة» (the copy the
 *     expiry path already uses); SUBMITTED keeps the
 *     already-submitted conflict copy.
 *
 * DB-free (AGENTS.md §5.2): the REAL app (createApp, ephemeral port —
 * the enrollments-scope.test.ts pattern) with prisma mocked and JWTs
 * signed via signAccessToken. `$transaction` hands the callback a tx
 * client whose `notification.create` is a DISTINCT spy from the outer
 * prisma mock, so the tests prove the notification rides the grade
 * transaction (not a post-commit side effect).
 *
 * The deep link pinned below (`/student/online-exams`) is the real
 * student exam-verdict surface, registered in frontend/src/App.tsx
 * (next to its `/student/online-exams/:id` detail route) — verified
 * there before choosing it.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { AttemptStatus, NotificationType, Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    examAttempt: { findUnique: vi.fn(), updateMany: vi.fn() },
    examAnswer: { update: vi.fn() },
    notification: { create: vi.fn() },
    courseOffering: { findUnique: vi.fn() },
    userPermission: { findMany: vi.fn() },
    rolePermission: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  // Defensive: other modules in the app graph import withRetry from db.js.
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
// Exported from the module under test (the grace window the expiry
// fixtures respect) — the route module is prisma-mocked like app.js.
import { SUBMIT_GRACE_MS } from '../../src/http/routes/exams.routes.js';

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

// ── Fixtures ─────────────────────────────────────────────────────────

const TEACHER_ID = 'teacher-exam-1';
const STUDENT_ID = 'student-exam-1';
const OFFERING_ID = 'offering-exam-1';
// cuid-shaped: the manual-grade zod schema validates answerId as a cuid.
const ANSWER_ID = 'ckxxxxxxxxxxxxxxxxxxxxa1';
const QUESTION_ID = 'question-exam-1';

const GRADE_ATTEMPT_ID = 'attempt-grade-1';
const SUBMIT_ATTEMPT_ID = 'attempt-submit-1';
const TEMPLATE_TITLE = 'اختبار قواعد البيانات';

type AttemptRow = {
  id: string;
  templateId: string;
  studentId: string;
  status: AttemptStatus;
  score: number | null;
  maxScore: number;
  startedAt: Date;
  submittedAt: Date | null;
  expiresAt: Date;
  template: Record<string, unknown>;
  answers: Array<Record<string, unknown>>;
};

/** A parked-for-manual-grading attempt: one essay answer, no verdict. */
const submittedAttempt = (): AttemptRow => ({
  id: GRADE_ATTEMPT_ID,
  templateId: 'template-exam-1',
  studentId: STUDENT_ID,
  status: AttemptStatus.SUBMITTED,
  score: null,
  maxScore: 20,
  startedAt: new Date('2026-07-01T09:00:00.000Z'),
  submittedAt: new Date('2026-07-01T09:40:00.000Z'),
  expiresAt: new Date('2026-07-01T10:00:00.000Z'),
  template: {
    id: 'template-exam-1',
    offeringId: OFFERING_ID,
    authorId: TEACHER_ID,
    title: TEMPLATE_TITLE,
    passingScore: 50,
    questions: [
      { questionId: QUESTION_ID, pointsOverride: null, question: { points: 8 } },
    ],
  },
  answers: [
    {
      id: ANSWER_ID,
      attemptId: GRADE_ATTEMPT_ID,
      questionId: QUESTION_ID,
      isCorrect: null,
      awardedPoints: 0,
      answerText: 'جواب السؤال الأول',
      choiceIndex: null,
      question: { points: 8 },
    },
  ],
});

// ── Mock wiring ──────────────────────────────────────────────────────

const examAttemptFindUnique = vi.mocked(prisma.examAttempt.findUnique);
const examAttemptUpdateMany = vi.mocked(prisma.examAttempt.updateMany);
const examAnswerUpdate = vi.mocked(prisma.examAnswer.update);
const outerNotificationCreate = vi.mocked(prisma.notification.create);
const courseOfferingFindUnique = vi.mocked(prisma.courseOffering.findUnique);
const userPermissionFindMany = vi.mocked(prisma.userPermission.findMany);
const rolePermissionFindMany = vi.mocked(prisma.rolePermission.findMany);
const transaction = vi.mocked(prisma.$transaction);

/**
 * Prisma delegates return PrismaPromise (branded via Symbol.toStringTag)
 * — a plain async function can never satisfy that structurally, so mock
 * implementations need one cast (the enrollments-scope.test.ts pattern).
 * Everything inside the impl stays fully type-checked.
 */
type AttemptFindUniqueImpl = NonNullable<Parameters<typeof examAttemptFindUnique.mockImplementation>[0]>;
type UpdateManyImpl = NonNullable<Parameters<typeof examAttemptUpdateMany.mockImplementation>[0]>;
type TransactionImpl = NonNullable<Parameters<typeof transaction.mockImplementation>[0]>;

/** The stored attempt row — findUnique dispatches it, tests set it. */
let attemptRow: AttemptRow | null = null;
const dispatchAttempt = examAttemptFindUnique.mockImplementation(
  (async () => attemptRow) as unknown as AttemptFindUniqueImpl,
);

/**
 * The claim models a real updateMany: it only matches when the stored
 * row still carries the status the claim pins (optimistic claim), and
 * it applies the write so the in-transaction read-back observes the
 * finalized row (updateMany returns no row).
 */
const claimAttemptImpl = (async (args: {
  where?: { id?: string; status?: string };
  data?: { status?: string; score?: number };
}) => {
  if (attemptRow && args.where?.status === attemptRow.status) {
    attemptRow = {
      ...attemptRow,
      status: (args.data?.status as AttemptStatus) ?? attemptRow.status,
      score: args.data?.score ?? attemptRow.score,
    };
    return { count: 1 };
  }
  return { count: 0 };
}) as unknown as UpdateManyImpl;

/** A DISTINCT notification.create spy for the transaction client —
 *  proves the notification rides the grade transaction itself. */
const txNotificationCreate = vi.fn();

/** tx client: shares the outer delegates for the row writes, carries
 *  its own notification.create spy. */
const txClient = {
  examAttempt: { updateMany: examAttemptUpdateMany, findUnique: examAttemptFindUnique },
  examAnswer: { update: examAnswerUpdate },
  notification: { create: txNotificationCreate },
};

const passthroughTransaction = transaction.mockImplementation(
  (async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient)) as unknown as TransactionImpl,
);

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations, but re-asserting the shared
  // defaults keeps the suite order-proof (tests may override).
  dispatchAttempt.mockClear();
  passthroughTransaction.mockClear();
  attemptRow = null;
  examAttemptUpdateMany.mockImplementation(claimAttemptImpl);
  userPermissionFindMany.mockResolvedValue([] as never);
  rolePermissionFindMany.mockResolvedValue([] as never);
  // assertOwnsOffering (TEACHER path): the offering is theirs.
  courseOfferingFindUnique.mockResolvedValue({ teacherId: TEACHER_ID } as never);
});

const bearer = (userId: string, role: Role) => ({ authorization: `Bearer ${signAccessToken(userId, role)}` });

const post = (path: string, userId: string, role: Role, body?: unknown) =>
  fetch(`${baseUrl}/api/v1${path}`, {
    headers: { ...bearer(userId, role), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

// ── POST /exams/attempts/:attemptId/grade — finalize + notify ────────

describe('POST /api/v1/exams/attempts/:attemptId/grade (r165c — graded verdict reaches the student)', () => {
  it('finalizing a SUBMITTED attempt creates the student notification inside the transaction', async () => {
    attemptRow = submittedAttempt();

    const res = await post(`/exams/attempts/${GRADE_ATTEMPT_ID}/grade`, TEACHER_ID, Role.TEACHER, {
      answers: [{ answerId: ANSWER_ID, isCorrect: true }],
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: unknown };
    // 8 of 20 → 40% < passingScore 50 → not passed (pins the formula,
    // not just a truthy flag).
    expect(json.data).toEqual({ score: 8, maxScore: 20, status: 'GRADED', passed: false });

    // The verdict write itself is unchanged by r165c.
    expect(examAnswerUpdate).toHaveBeenCalledWith({
      where: { id: ANSWER_ID },
      data: { isCorrect: true, awardedPoints: 8, feedback: null },
    });

    // THE r165c pin: exactly one notification, addressed to the attempt's
    // student, ACADEMIC (the assignment-grading type), carrying the final
    // score/ceiling/template title, deep-linking the student's real
    // exams page.
    expect(txNotificationCreate).toHaveBeenCalledTimes(1);
    expect(txNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: STUDENT_ID,
        type: NotificationType.ACADEMIC,
        icon: '📝',
        title: 'تم تصحيح اختبارك',
        body: `حصلت على 8 من 20 في «${TEMPLATE_TITLE}»`,
        link: '/student/online-exams',
      },
    });
    // The notification is written through the transaction client (never
    // a post-commit side effect that a crash could orphan).
    expect(outerNotificationCreate).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
    // Ordering: the notification rides the transaction — its invocation
    // index is strictly after the $transaction call (times(1) above
    // guarantees both indexes exist).
    const txCallIndex = transaction.mock.invocationCallOrder[0];
    const notifCallIndex = txNotificationCreate.mock.invocationCallOrder[0];
    expect(typeof txCallIndex).toBe('number');
    expect(typeof notifCallIndex).toBe('number');
    expect((txCallIndex as number) < (notifCallIndex as number)).toBe(true);
  });

  it('an already-GRADED attempt → 409, no transaction, no duplicate notification', async () => {
    attemptRow = { ...submittedAttempt(), status: AttemptStatus.GRADED, score: 8 };

    const res = await post(`/exams/attempts/${GRADE_ATTEMPT_ID}/grade`, TEACHER_ID, Role.TEACHER, {
      answers: [{ answerId: ANSWER_ID, isCorrect: true }],
    });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('CONFLICT');
    expect(transaction).not.toHaveBeenCalled();
    expect(txNotificationCreate).not.toHaveBeenCalled();
    expect(examAnswerUpdate).not.toHaveBeenCalled();
  });

  it('a lost claim race (row flipped between read and claim) → 409, no verdict write, no notification', async () => {
    attemptRow = submittedAttempt();
    // The concurrent grader already claimed the row: the claim matches
    // zero rows.
    examAttemptUpdateMany.mockResolvedValue({ count: 0 } as never);

    const res = await post(`/exams/attempts/${GRADE_ATTEMPT_ID}/grade`, TEACHER_ID, Role.TEACHER, {
      answers: [{ answerId: ANSWER_ID, isCorrect: true }],
    });
    expect(res.status).toBe(409);
    // The notification sits AFTER the claim guard inside the
    // transaction — a lost race never leaves an orphan notification.
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txNotificationCreate).not.toHaveBeenCalled();
    expect(examAnswerUpdate).not.toHaveBeenCalled();
  });
});

// ── POST /exams/attempts/:id/submit — terminal status copy ───────────

describe('POST /api/v1/exams/attempts/:id/submit (r165c — truthful terminal copy)', () => {
  const submitAttempt = (status: AttemptStatus): AttemptRow => ({
    id: SUBMIT_ATTEMPT_ID,
    templateId: 'template-exam-1',
    studentId: STUDENT_ID,
    status,
    score: null,
    maxScore: 20,
    startedAt: new Date('2026-07-01T09:00:00.000Z'),
    submittedAt: null,
    // Hard past the grace window — irrelevant for the status gate (it
    // throws first), kept so the fixture is a truthful EXPIRED row.
    expiresAt: new Date(Date.now() - SUBMIT_GRACE_MS - 60_000),
    template: { id: 'template-exam-1', offeringId: OFFERING_ID, authorId: TEACHER_ID, title: TEMPLATE_TITLE, questions: [] },
    answers: [],
  });

  it('an EXPIRED attempt (expiry-swept, never submitted) → 403 «انتهى وقت هذه المحاولة», never «already submitted»', async () => {
    attemptRow = submitAttempt(AttemptStatus.EXPIRED);

    const res = await post(`/exams/attempts/${SUBMIT_ATTEMPT_ID}/submit`, STUDENT_ID, Role.STUDENT);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('FORBIDDEN');
    // The same terminal copy the expiry path uses — the blanket 409
    // «تم تسليم هذه المحاولة مسبقاً» claimed a submission that never
    // happened and a verdict that will never exist.
    expect(json.error.message).toBe('انتهى وقت هذه المحاولة');
    expect(json.error.message).not.toBe('تم تسليم هذه المحاولة مسبقاً');
    // The status gate fires before the expiry sweep / any transaction.
    expect(transaction).not.toHaveBeenCalled();
    expect(examAttemptUpdateMany).not.toHaveBeenCalled();
  });

  it('a SUBMITTED attempt keeps the 409 already-submitted copy', async () => {
    attemptRow = submitAttempt(AttemptStatus.SUBMITTED);

    const res = await post(`/exams/attempts/${SUBMIT_ATTEMPT_ID}/submit`, STUDENT_ID, Role.STUDENT);
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('CONFLICT');
    expect(json.error.message).toBe('تم تسليم هذه المحاولة مسبقاً');
    expect(transaction).not.toHaveBeenCalled();
  });
});
