/**
 * Backend integration test — r170b author dead-end closure on
 * `backend/src/http/routes/exams.routes.ts`:
 *
 *  1. PATCH /exams/templates/:id — author-only edit of the safe fields
 *     with the honest state machine: DRAFT/PENDING_REVIEW edit in place,
 *     an edit after a moderation verdict (APPROVED or REJECTED) resets
 *     the row to PENDING_REVIEW and clears the verdict fields, and a
 *     PUBLISHED/CLOSED row is locked (409).
 *  2. POST /exams/templates/:id/clone — deep copy of the template +
 *     its question links (same questionId/order/pointsOverride), author
 *     = cloner, title prefixed «نسخة من …», window (openAt/closeAt) and
 *     moderation verdict NOT copied, PUBLISHED sources cloneable.
 *  3. The authz matrix around both: non-author teacher 403, student
 *     403 at the capability door, ADMIN/OWNER oversight edit, and the
 *     clone reach mirroring the GET detail's answer-key matrix.
 *
 * DB-free (AGENTS.md §5.2): the REAL app (createApp, ephemeral port —
 * the exams-grade-submit.test.ts pattern) with prisma mocked and JWTs
 * signed via signAccessToken. The strict-schema pin (status in the
 * PATCH body → 400) proves the author can never write the moderation
 * fields by hand — the state machine is the only path that touches
 * them.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { ExamStatus, Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    examTemplate: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    userPermission: { findMany: vi.fn() },
    rolePermission: { findMany: vi.fn() },
  },
  // Defensive: other modules in the app graph import withRetry from db.js.
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import {
  decideTemplateCloneAccess,
  decideTemplateEdit,
  updateTemplateSchema,
} from '../../src/http/routes/exams.routes.js';

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

const TEACHER_ID = 'teacher-r170b';
const OTHER_TEACHER_ID = 'teacher-r170b-other';
const STUDENT_ID = 'student-r170b';
const ADMIN_ID = 'admin-r170b';
const OWNER_ID = 'owner-r170b';
const QUALITY_ID = 'quality-r170b';
const TEMPLATE_ID = 'template-r170b-1';

const MODERATOR_ID = 'quality-moderator';

type TemplateRow = {
  id: string;
  title: string;
  kind: 'QUIZ';
  description: string | null;
  durationMin: number;
  passingScore: number;
  randomized: boolean;
  status: ExamStatus;
  authorId: string;
  moderatedById: string | null;
  moderationNote: string | null;
  openAt: Date | null;
  closeAt: Date | null;
  offeringId: string | null;
  facultyId: string | null;
  questions?: Array<{ questionId: string; order: number; pointsOverride: number | null }>;
};

const baseTemplate = (overrides: Partial<TemplateRow> = {}): TemplateRow => ({
  id: TEMPLATE_ID,
  title: 'اختبار موحد — أساسيات هندسة البرمجيات',
  kind: 'QUIZ',
  description: 'وصف تجريبي',
  durationMin: 60,
  passingScore: 60,
  randomized: true,
  status: ExamStatus.PENDING_REVIEW,
  authorId: TEACHER_ID,
  moderatedById: null,
  moderationNote: null,
  openAt: null,
  closeAt: null,
  offeringId: null,
  facultyId: null,
  ...overrides,
});

// ── Mock wiring ──────────────────────────────────────────────────────

const examTemplateFindUnique = vi.mocked(prisma.examTemplate.findUnique);
const examTemplateUpdateMany = vi.mocked(prisma.examTemplate.updateMany);
const examTemplateCreate = vi.mocked(prisma.examTemplate.create);
const userPermissionFindMany = vi.mocked(prisma.userPermission.findMany);
const rolePermissionFindMany = vi.mocked(prisma.rolePermission.findMany);

/** Prisma delegates return PrismaPromise — the one-cast mock idiom
 *  (the enrollments-scope.test.ts / exams-grade-submit.test.ts pattern). */
type FindUniqueImpl = NonNullable<Parameters<typeof examTemplateFindUnique.mockImplementation>[0]>;
type UpdateManyImpl = NonNullable<Parameters<typeof examTemplateUpdateMany.mockImplementation>[0]>;
type CreateImpl = NonNullable<Parameters<typeof examTemplateCreate.mockImplementation>[0]>;

/** The stored template row — findUnique dispatches it, tests set it. */
let templateRow: TemplateRow | null = null;
const dispatchTemplate = examTemplateFindUnique.mockImplementation(
  (async () => templateRow) as unknown as FindUniqueImpl,
);

/** A faithful updateMany: the claim only matches while the row still
 *  carries the status the route read (optimistic claim), and the write
 *  applies so the re-read observes the mutated row. */
const claimTemplateImpl = (async (args: {
  where?: { id?: string; status?: string };
  data?: Record<string, unknown>;
}) => {
  if (templateRow && args.where?.id === templateRow.id && args.where?.status === templateRow.status) {
    templateRow = { ...templateRow, ...args.data } as TemplateRow;
    return { count: 1 };
  }
  return { count: 0 };
}) as unknown as UpdateManyImpl;

/** The stored clone result — create echoes it. */
let createdClone: Record<string, unknown> | null = null;
const dispatchCreate = examTemplateCreate.mockImplementation(
  (async () => createdClone) as unknown as CreateImpl,
);

beforeEach(() => {
  vi.clearAllMocks();
  dispatchTemplate.mockClear();
  dispatchCreate.mockClear();
  templateRow = null;
  createdClone = null;
  examTemplateUpdateMany.mockImplementation(claimTemplateImpl);
  userPermissionFindMany.mockResolvedValue([] as never);
  rolePermissionFindMany.mockResolvedValue([] as never);
});

const bearer = (userId: string, role: Role) => ({ authorization: `Bearer ${signAccessToken(userId, role)}` });

const patch = (path: string, userId: string, role: Role, body: unknown) =>
  fetch(`${baseUrl}/api/v1${path}`, {
    headers: { ...bearer(userId, role), 'content-type': 'application/json' },
    method: 'PATCH',
    body: JSON.stringify(body),
  });

const post = (path: string, userId: string, role: Role, body: unknown = {}) =>
  fetch(`${baseUrl}/api/v1${path}`, {
    headers: { ...bearer(userId, role), 'content-type': 'application/json' },
    method: 'POST',
    body: JSON.stringify(body),
  });

// ── Pure decision pins ───────────────────────────────────────────────

describe('decideTemplateEdit (r170b state machine)', () => {
  it('DRAFT / PENDING_REVIEW → editable, status unchanged', () => {
    expect(decideTemplateEdit(ExamStatus.DRAFT)).toEqual({ ok: true, nextStatus: null, resetsModeration: false });
    expect(decideTemplateEdit(ExamStatus.PENDING_REVIEW)).toEqual({ ok: true, nextStatus: null, resetsModeration: false });
  });

  it('APPROVED / REJECTED → editable but the verdict is invalidated (reset to PENDING_REVIEW)', () => {
    expect(decideTemplateEdit(ExamStatus.APPROVED)).toEqual({ ok: true, nextStatus: ExamStatus.PENDING_REVIEW, resetsModeration: true });
    expect(decideTemplateEdit(ExamStatus.REJECTED)).toEqual({ ok: true, nextStatus: ExamStatus.PENDING_REVIEW, resetsModeration: true });
  });

  it('PUBLISHED / CLOSED → locked with the authored conflict copy', () => {
    const published = decideTemplateEdit(ExamStatus.PUBLISHED);
    expect(published.ok).toBe(false);
    if (!published.ok) expect(published.conflictMessage).toBe('قالبًا منشورًا لا يمكن تحريره');
    const closed = decideTemplateEdit(ExamStatus.CLOSED);
    expect(closed.ok).toBe(false);
    if (!closed.ok) expect(closed.conflictMessage).toBe('هذا القالب مُغلق ولا يمكن تحريره');
  });
});

describe('decideTemplateCloneAccess (r170b clone reach = the answer-key matrix)', () => {
  const template = { authorId: TEACHER_ID };

  it('source author (TEACHER), ADMIN and OWNER may clone', () => {
    expect(decideTemplateCloneAccess({ id: TEACHER_ID, role: Role.TEACHER }, template, false)).toBe(true);
    expect(decideTemplateCloneAccess({ id: ADMIN_ID, role: Role.ADMIN }, template, false)).toBe(true);
    expect(decideTemplateCloneAccess({ id: OWNER_ID, role: Role.OWNER }, template, false)).toBe(true);
  });

  it('QUALITY clones only while holding EXAMS_MODERATE (the canSeeAnswers twin rule)', () => {
    expect(decideTemplateCloneAccess({ id: QUALITY_ID, role: Role.QUALITY }, template, true)).toBe(true);
    expect(decideTemplateCloneAccess({ id: QUALITY_ID, role: Role.QUALITY }, template, false)).toBe(false);
  });

  it('non-author teachers and students may NOT clone (the key cannot be laundered through a clone)', () => {
    expect(decideTemplateCloneAccess({ id: OTHER_TEACHER_ID, role: Role.TEACHER }, template, true)).toBe(false);
    expect(decideTemplateCloneAccess({ id: STUDENT_ID, role: Role.STUDENT }, template, true)).toBe(false);
  });
});

describe('updateTemplateSchema (strict — moderation fields are never author-writable)', () => {
  it('parses a partial edit and coerces openAt/closeAt dates', () => {
    const parsed = updateTemplateSchema.safeParse({
      title: 'عنوان معدَّل',
      durationMin: 90,
      openAt: '2026-11-01T09:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe('عنوان معدَّل');
      expect(parsed.data.durationMin).toBe(90);
      expect(parsed.data.openAt).toBeInstanceOf(Date);
    }
  });

  it('null clears the nullable fields (description / window)', () => {
    const parsed = updateTemplateSchema.safeParse({ description: null, closeAt: null });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description).toBeNull();
      expect(parsed.data.closeAt).toBeNull();
    }
  });

  it('rejects status/authorId/moderatedById in the body (400 at the door)', () => {
    expect(updateTemplateSchema.safeParse({ status: 'APPROVED' }).success).toBe(false);
    expect(updateTemplateSchema.safeParse({ authorId: TEACHER_ID }).success).toBe(false);
    expect(updateTemplateSchema.safeParse({ moderatedById: MODERATOR_ID }).success).toBe(false);
  });

  it('enforces the field bounds the create schema carries', () => {
    expect(updateTemplateSchema.safeParse({ title: 'قص' }).success).toBe(false);
    expect(updateTemplateSchema.safeParse({ durationMin: 4 }).success).toBe(false);
    expect(updateTemplateSchema.safeParse({ durationMin: 481 }).success).toBe(false);
    expect(updateTemplateSchema.safeParse({ passingScore: 101 }).success).toBe(false);
  });
});

// ── PATCH /exams/templates/:id — the wire contract ───────────────────

describe('PATCH /api/v1/exams/templates/:id', () => {
  it('the author edits a PENDING_REVIEW template in place — status untouched, only the sent fields written', async () => {
    templateRow = baseTemplate({ status: ExamStatus.PENDING_REVIEW });

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, {
      title: 'اختبار موحد — معدَّل',
      description: 'وصف جديد',
      durationMin: 75,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { title: string; durationMin: number; status: ExamStatus } };
    expect(json.data.title).toBe('اختبار موحد — معدَّل');
    expect(json.data.durationMin).toBe(75);
    expect(json.data.status).toBe(ExamStatus.PENDING_REVIEW);

    // The claim write carries ONLY the three sent fields — no status,
    // no moderation fields (nothing to reset in PENDING_REVIEW).
    expect(examTemplateUpdateMany).toHaveBeenCalledWith({
      where: { id: TEMPLATE_ID, status: ExamStatus.PENDING_REVIEW },
      data: { title: 'اختبار موحد — معدَّل', description: 'وصف جديد', durationMin: 75 },
    });
  });

  it('editing an APPROVED template resets it to PENDING_REVIEW and clears the stale verdict (moderation invalidated)', async () => {
    templateRow = baseTemplate({
      status: ExamStatus.APPROVED,
      moderatedById: MODERATOR_ID,
      moderationNote: 'تمت الموافقة — أسئلة متوازنة',
    });

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, { title: 'نسخة محسَّنة' });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { status: ExamStatus; moderatedById: string | null; moderationNote: string | null } };
    expect(json.data.status).toBe(ExamStatus.PENDING_REVIEW);
    expect(json.data.moderatedById).toBeNull();
    expect(json.data.moderationNote).toBeNull();
  });

  it('editing a REJECTED template resubmits it to the queue (the fix-and-resubmit loop)', async () => {
    templateRow = baseTemplate({
      status: ExamStatus.REJECTED,
      moderatedById: MODERATOR_ID,
      moderationNote: 'المدة قصيرة لمستوى الأسئلة',
    });

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, { durationMin: 90 });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { status: ExamStatus; durationMin: number } };
    expect(json.data.status).toBe(ExamStatus.PENDING_REVIEW);
    expect(json.data.durationMin).toBe(90);
  });

  it('a PUBLISHED template is locked — 409 with the authored Arabic copy', async () => {
    templateRow = baseTemplate({ status: ExamStatus.PUBLISHED });

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, { title: 'محاولة تحرير منشور' });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('CONFLICT');
    expect(json.error.message).toBe('قالبًا منشورًا لا يمكن تحريره');
    expect(examTemplateUpdateMany).not.toHaveBeenCalled();
  });

  it('a non-author teacher gets 403 — the edit is author-scoped', async () => {
    templateRow = baseTemplate();

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, OTHER_TEACHER_ID, Role.TEACHER, { title: 'تدخّل أستاذ آخر' });
    expect(res.status).toBe(403);
    expect(examTemplateUpdateMany).not.toHaveBeenCalled();
  });

  it('a student is stopped at the capability door (no EXAMS_AUTHOR) — 403', async () => {
    templateRow = baseTemplate();

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, STUDENT_ID, Role.STUDENT, { title: 'تدخّل طالب' });
    expect(res.status).toBe(403);
    expect(examTemplateUpdateMany).not.toHaveBeenCalled();
  });

  it('ADMIN/OWNER oversight may edit (the assertOwnsOffering bypass pattern)', async () => {
    templateRow = baseTemplate({ status: ExamStatus.PENDING_REVIEW });

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, OWNER_ID, Role.OWNER, { durationMin: 45 });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { durationMin: number } };
    expect(json.data.durationMin).toBe(45);
  });

  it('status in the body is a 400 — the state machine is the only status writer', async () => {
    templateRow = baseTemplate();

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, { status: 'APPROVED' });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(examTemplateUpdateMany).not.toHaveBeenCalled();
  });

  it('window ordering is validated on the MERGED values — a new closeAt before the stored openAt is a 400', async () => {
    templateRow = baseTemplate({ openAt: new Date('2026-11-01T10:00:00.000Z'), closeAt: new Date('2026-11-01T12:00:00.000Z') });

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, {
      closeAt: '2026-11-01T09:00:00.000Z',
    });
    expect(res.status).toBe(400);
    expect(examTemplateUpdateMany).not.toHaveBeenCalled();
  });

  it('a moderation decision landing mid-edit is not leapfrogged — the claim 409s', async () => {
    templateRow = baseTemplate({ status: ExamStatus.APPROVED });
    // Simulate quality flipping the row between the route's read and its
    // claim write: the claim's status pin no longer matches.
    examTemplateUpdateMany.mockImplementation((async () => ({ count: 0 })) as unknown as UpdateManyImpl);

    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, { title: 'تعديل متأخر' });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: { message: string } };
    expect(json.error.message).toBe('تغيّرت حالة القالب — حدّث الصفحة ثم أعد المحاولة');
  });

  it('an unknown template id is a 404', async () => {
    templateRow = null;
    const res = await patch(`/exams/templates/${TEMPLATE_ID}`, TEACHER_ID, Role.TEACHER, { title: 'قالب غير موجود' });
    expect(res.status).toBe(404);
  });
});

// ── POST /exams/templates/:id/clone — the wire contract ──────────────

describe('POST /api/v1/exams/templates/:id/clone', () => {
  it('the author of a PUBLISHED template clones it: deep question copy, fresh author + queue entry, window dropped', async () => {
    templateRow = baseTemplate({
      status: ExamStatus.PUBLISHED,
      moderatedById: MODERATOR_ID,
      moderationNote: 'تمت الموافقة',
      openAt: new Date('2026-10-01T09:00:00.000Z'),
      closeAt: new Date('2026-10-01T11:00:00.000Z'),
      questions: [
        { questionId: 'question-a', order: 1, pointsOverride: null },
        { questionId: 'question-b', order: 2, pointsOverride: 5 },
      ],
    });

    const res = await post(`/exams/templates/${TEMPLATE_ID}/clone`, TEACHER_ID, Role.TEACHER);
    expect(res.status).toBe(201);

    // THE deep-copy pin: one create, carrying the source's question
    // links verbatim (same bank questions, same order, same per-question
    // pointsOverride) — authored by the cloner, back in the moderation
    // queue, with the schedule window and the source's verdict dropped.
    expect(examTemplateCreate).toHaveBeenCalledTimes(1);
    expect(examTemplateCreate).toHaveBeenCalledWith({
      data: {
        offeringId: null,
        facultyId: null,
        title: `نسخة من ${templateRow.title}`,
        kind: 'QUIZ',
        description: 'وصف تجريبي',
        durationMin: 60,
        passingScore: 60,
        randomized: true,
        status: 'PENDING_REVIEW',
        authorId: TEACHER_ID,
        questions: {
          create: [
            { questionId: 'question-a', order: 1, pointsOverride: null },
            { questionId: 'question-b', order: 2, pointsOverride: 5 },
          ],
        },
      },
      include: { questions: { include: { question: true } } },
    });
  });

  it('a long source title is capped at the create schema cap (200 chars)', async () => {
    const longTitle = 'ع'.repeat(200);
    templateRow = baseTemplate({ title: longTitle, questions: [] });

    await post(`/exams/templates/${TEMPLATE_ID}/clone`, TEACHER_ID, Role.TEACHER);
    const call = examTemplateCreate.mock.calls[0]![0] as { data: { title: string } };
    expect(call.data.title).toBe(`نسخة من ${longTitle}`.slice(0, 200));
    expect(call.data.title.length).toBe(200);
  });

  it('a non-author teacher (a template reader WITHOUT key reach) gets 403', async () => {
    templateRow = baseTemplate();

    const res = await post(`/exams/templates/${TEMPLATE_ID}/clone`, OTHER_TEACHER_ID, Role.TEACHER);
    expect(res.status).toBe(403);
    expect(examTemplateCreate).not.toHaveBeenCalled();
  });

  it('a student is stopped at the capability door — 403', async () => {
    templateRow = baseTemplate();

    const res = await post(`/exams/templates/${TEMPLATE_ID}/clone`, STUDENT_ID, Role.STUDENT);
    expect(res.status).toBe(403);
    expect(examTemplateCreate).not.toHaveBeenCalled();
  });

  it('QUALITY holding EXAMS_MODERATE may clone (the canSeeAnswers twin rule)', async () => {
    templateRow = baseTemplate({ questions: [] });
    // QUALITY's default capabilities include EXAMS_MODERATE but NOT
    // EXAMS_AUTHOR — the route door needs an explicit user grant (the
    // operator action permissions.ts documents), the same way an admin
    // reaches this route.
    userPermissionFindMany.mockImplementation(
      (async (args: { where?: { userId?: string } }) =>
        args.where?.userId === QUALITY_ID
          ? [{ capability: 'EXAMS_AUTHOR' as const, grant: true }]
          : []) as unknown as Parameters<typeof userPermissionFindMany.mockImplementation>[0],
    );
    const res = await post(`/exams/templates/${TEMPLATE_ID}/clone`, QUALITY_ID, Role.QUALITY);
    expect(res.status).toBe(201);
    expect(examTemplateCreate).toHaveBeenCalledTimes(1);
  });

  it('an unknown template id is a 404', async () => {
    templateRow = null;
    const res = await post(`/exams/templates/${TEMPLATE_ID}/clone`, TEACHER_ID, Role.TEACHER);
    expect(res.status).toBe(404);
  });
});
