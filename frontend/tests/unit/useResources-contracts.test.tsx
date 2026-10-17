/**
 * 16-E2 — useResources contract pins.
 *
 * 1. StartExamResponse discriminated union (15-c P1-3): the backend
 *    ships three disjoint start payloads with no tag of their own;
 *    tagStartExamResponse attaches the `type` discriminant
 *    (fresh | resumed | alreadyAttempted). The terminal shape must
 *    never grow questions / expiresAt / durationMin / title — the old
 *    flat interface declared them on every response, so any consumer
 *    reading r.questions before the alreadyAttempted check could crash.
 * 2. useGradeSubmission invalidation map (15-d P1-3): grading refreshes
 *    the student results key always, and the Intelligence page's
 *    students + analytics keys when the hook knows the offering.
 * 3. useMarkAllNotifsRead (15-d P1-2): ONE POST /notifications/read-all
 *    and ONE ['notifications'] invalidation — the panel's old per-item
 *    loop fired up to 6 PATCHes and a refetch storm per click.
 * 4. useFinishExam verdict honesty (15-c P1-1, 16-E1 hand-off): the
 *    backend withholds the verdict (passed: null) while manual grading
 *    pends; the hook type is boolean | null and null flows through.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../src/lib/api', () => {
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: { post, get: vi.fn(async () => ({ data: [] })), patch: vi.fn(async () => ({ data: {} })), delete: vi.fn(async () => ({ data: {} })) },
    unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> => p.then((r) => r.data),
  };
});

import {
  tagStartExamResponse,
  useGradeSubmission,
  useMarkAllNotifsRead,
  useFinishExam,
  useApplyJob,
  useCreateAssignment,
  useCreateMaterial,
  useGradePaper,
  usePublishPaper,
  useAiChat,
  useAiConversations,
  useDeleteAiConversation,
  fetchAiConversationMessages,
  useUpsertOfferingGrades,
  useOfferingGrades,
  normalizeOfferingGradeRow,
  type StartExamResponse,
} from '../../src/hooks/useResources';
import { api } from '../../src/lib/api';

const post = api.post as unknown as Mock;

function makeClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  // Keys captured through a closure so the spy keeps its inferred
  // generic MockInstance type (passing it around as `Mock` widens the
  // invalidateQueries signature and fails typecheck:tests).
  const invalidatedKeys = () =>
    invalidate.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
  return { invalidatedKeys, wrapper };
}

/* ── 1. StartExamResponse discriminated union ─────────────────── */

const baseStartOkWire = {
  attemptId: 'a1',
  expiresAt: '2026-03-01T10:00:00.000Z',
  durationMin: 30,
  title: 'اختبار الشبكات',
  questions: [
    { id: 'q1', type: 'MCQ' as const, prompt: 'سؤال اختيار من متعدد', choices: ['أ', 'ب'], points: 5 },
    { id: 'q2', type: 'SHORT' as const, prompt: 'سؤال قصير', choices: null, points: 5 },
  ],
};

describe('tagStartExamResponse — StartExamResponse union (15-c P1-3)', () => {
  it('tags a fresh start (the 201 shape) and carries no resume keys', () => {
    const out = tagStartExamResponse(baseStartOkWire);
    expect(out).toEqual({ ...baseStartOkWire, type: 'fresh' });
    expect('resumed' in out).toBe(false);
    expect('attempt' in out).toBe(false);
    expect('status' in out).toBe(false);
  });

  it('drops a stray wire-only flag (resumed: false stays a fresh start)', () => {
    const out = tagStartExamResponse({ ...baseStartOkWire, resumed: false });
    expect(out.type).toBe('fresh');
    expect('resumed' in out).toBe(false);
  });

  it('tags a resume and preserves the saved answers + the original deadline', () => {
    const saved = {
      id: 'a1',
      status: 'IN_PROGRESS',
      expiresAt: baseStartOkWire.expiresAt,
      answers: [
        { questionId: 'q1', value: 1 },
        { questionId: 'q2', value: 'الإجابة المحفوظة' },
      ],
    };
    const out = tagStartExamResponse({ ...baseStartOkWire, resumed: true, attempt: saved });
    expect(out.type).toBe('resumed');
    expect(out).toMatchObject({
      resumed: true,
      attempt: saved,
      questions: baseStartOkWire.questions,
      expiresAt: baseStartOkWire.expiresAt,
    });
  });

  it('tags the terminal payload WITHOUT inventing questions, expiry, duration or title', () => {
    const out = tagStartExamResponse({ attemptId: 'a9', status: 'GRADED', alreadyAttempted: true });
    expect(out).toEqual({
      type: 'alreadyAttempted',
      attemptId: 'a9',
      status: 'GRADED',
      alreadyAttempted: true,
    });
    // The lie the old flat type told: these fields were declared on the
    // terminal shape even though the backend never sends them there.
    expect('questions' in out).toBe(false);
    expect('expiresAt' in out).toBe(false);
    expect('durationMin' in out).toBe(false);
    expect('title' in out).toBe(false);
  });

  it('discriminates exhaustively on `type` (a switch narrows every member)', () => {
    // This function only compiles because the union discriminates on
    // `type` — the resumed branch reaches .attempt and the terminal
    // branch reaches .status without casts.
    const label = (r: StartExamResponse): string => {
      switch (r.type) {
        case 'fresh': return 'بداية جديدة';
        case 'resumed': return r.attempt.status;
        case 'alreadyAttempted': return r.status;
      }
    };
    expect(label(tagStartExamResponse(baseStartOkWire))).toBe('بداية جديدة');
    expect(
      label(
        tagStartExamResponse({
          ...baseStartOkWire,
          resumed: true,
          attempt: { id: 'a1', status: 'IN_PROGRESS', expiresAt: baseStartOkWire.expiresAt, answers: [] },
        }),
      ),
    ).toBe('IN_PROGRESS');
    expect(label(tagStartExamResponse({ attemptId: 'a9', status: 'EXPIRED', alreadyAttempted: true }))).toBe('EXPIRED');
  });

  it('keeps the raw alreadyAttempted flag branchable (the OnlineExamsPages pattern)', () => {
    // The exam taker guards with `if (r.alreadyAttempted)` BEFORE
    // touching questions — the flag must stay present on every member
    // and truthiness must separate the terminal payload from a start.
    const terminal = tagStartExamResponse({ attemptId: 'a9', status: 'SUBMITTED', alreadyAttempted: true });
    const fresh = tagStartExamResponse(baseStartOkWire);
    expect(terminal.alreadyAttempted).toBe(true);
    expect(fresh.alreadyAttempted).toBeUndefined();
    expect(Boolean(terminal.alreadyAttempted)).toBe(true);
    expect(Boolean(fresh.alreadyAttempted)).toBe(false);
  });
});

/* ── 2. useGradeSubmission invalidation map ───────────────────── */

describe('useGradeSubmission invalidation map (15-d P1-3)', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { id: 's1', status: 'GRADED', grade: 8 } });
  });

  it('refreshes both dashboards + the student results key; no offering keys without offeringId', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useGradeSubmission('sub-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ grade: 8, feedback: 'أحسنت' });
    });

    expect(post).toHaveBeenCalledWith('/submissions/sub-1/grade', { grade: 8, feedback: 'أحسنت' });
    const keys = invalidatedKeys();
    expect(keys).toContainEqual(['teacher', 'dashboard']);
    expect(keys).toContainEqual(['me', 'dashboard']);
    expect(keys).toContainEqual(['me', 'results']);
    // r164-e: the Assignments page's «جميع الواجبات» list renders the
    // per-assignment submission counts from this key (60s staleTime) —
    // a landed grade must refresh them on the very page it landed on.
    expect(keys).toContainEqual(['teacher', 'me', 'assignments']);
    expect(keys.some((k) => k[0] === 'teacher' && k[1] === 'offering')).toBe(false);
  });

  it('with offeringId, also refreshes the Intelligence page students + analytics keys', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useGradeSubmission('sub-1', 'off-7'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ grade: 8 });
    });

    const keys = invalidatedKeys();
    expect(keys).toContainEqual(['me', 'results']);
    expect(keys).toContainEqual(['teacher', 'offering', 'off-7', 'students']);
    expect(keys).toContainEqual(['teacher', 'offering', 'off-7', 'analytics']);
    // The offering keys are targeted — no blanket ['teacher','offering']
    // prefix nuke of every offering's caches.
    expect(keys).not.toContainEqual(['teacher', 'offering']);
  });
});

/* ── 3. useMarkAllNotifsRead — the single bulk call ───────────── */

describe('useMarkAllNotifsRead (15-d P1-2)', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { updated: 9 } });
  });

  it('posts /notifications/read-all exactly once and invalidates the notifications family once', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useMarkAllNotifsRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    const bulkCalls = post.mock.calls.filter((c) => c[0] === '/notifications/read-all');
    expect(bulkCalls).toHaveLength(1);
    expect(bulkCalls[0]![1]).toEqual({});

    // One invalidation covering the list + the unread-count poll —
    // the old per-item loop invalidated once per PATCH (≤6 storms).
    expect(invalidatedKeys().filter((k) => k[0] === 'notifications')).toEqual([
      ['notifications'],
    ]);
  });
});

/* ── 4. useFinishExam — the withheld verdict flows through ────── */

describe('useFinishExam verdict honesty (15-c P1-1)', () => {
  beforeEach(() => {
    post.mockReset();
    // needsManual > 0 → the backend answers passed: null (no verdict
    // while a teacher still has to grade the essays).
    post.mockResolvedValue({
      data: { score: 7, maxScore: 10, status: 'SUBMITTED', needsManual: 2, passed: null },
    });
  });

  it('resolves passed: null untouched (null is a value, not a failed exam)', async () => {
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useFinishExam(), { wrapper });

    await act(async () => {
      const out = await result.current.mutateAsync('att-1');
      expect(out).toEqual({
        score: 7,
        maxScore: 10,
        status: 'SUBMITTED',
        needsManual: 2,
        passed: null,
      });
    });

    expect(post).toHaveBeenCalledWith('/exams/attempts/att-1/submit', {});
  });
});

/* ── r153g — cross-surface freshness invalidation pins ──────────────
 * Three mutations write data that OTHER surfaces read from cache;
 * each used to leave those surfaces stale until a later mount's 30s
 * stale window lapsed:
 *   1. useApplyJob → ['jobs'] (the payload carries appliedJobIds —
 *      the «تمّ التقديم» badge was remount-fiction).
 *   2. useCreateAssignment / useCreateMaterial → the targeted
 *      ['offerings', id, 'full'] (the student course detail embeds
 *      both lists).
 *   3. useGradePaper / usePublishPaper → ['admin', 'papers'] (the
 *      admin research drill-down's status column).
 */
describe('r153g — cross-surface invalidations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useApplyJob invalidates the jobs family once', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useApplyJob(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('job-9');
    });

    const jobs = invalidatedKeys().filter((k) => k[0] === 'jobs');
    expect(jobs).toHaveLength(1);
    expect(post).toHaveBeenCalledWith('/jobs/job-9/apply');
  });

  it('useCreateAssignment refreshes the offering-full projection for THAT offering', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useCreateAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ offeringId: 'off-7', title: 'واجب 1', type: 'HOMEWORK', dueAt: '2026-11-01T23:59:00.000Z', maxScore: 10 });
    });

    const full = invalidatedKeys().filter((k) => k[0] === 'offerings' && k[2] === 'full');
    expect(full).toEqual([['offerings', 'off-7', 'full']]);
    // the teacher-side families refresh too (pre-existing contract)
    expect(invalidatedKeys().some((k) => k[0] === 'teacher' && k[1] === 'dashboard')).toBe(true);
  });

  it('useCreateMaterial refreshes the same offering-full projection', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useCreateMaterial(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ offeringId: 'off-3', name: 'شرح الفصل الثاني', type: 'PDF', url: 'https://x.example/p.pdf' });
    });

    expect(invalidatedKeys()).toContainEqual(['offerings', 'off-3', 'full']);
  });

  it('useGradePaper and usePublishPaper both refresh the admin papers register', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    const grade = renderHook(() => useGradePaper(), { wrapper });
    await act(async () => {
      await grade.result.current.mutateAsync({ id: 'res-1', grade: 88 });
    });
    const publish = renderHook(() => usePublishPaper(), { wrapper });
    await act(async () => {
      await publish.result.current.mutateAsync('res-1');
    });

    const adminPapers = invalidatedKeys().filter((k) => k[0] === 'admin' && k[1] === 'papers');
    expect(adminPapers).toHaveLength(2);
  });
});

/* ── r164g — AI conversation hooks (list / switch / clear) ──────────
 * The sidebar's freshness contract: a successful chat turn may have
 * CREATED a conversation, and a delete removes one — both refresh the
 * ONE ['ai','conversations'] key. A FAILED turn wrote nothing
 * server-side (the route's writes are one post-reply transaction), so
 * it must NOT touch the cache while the page keeps the exchange in the
 * log with its retry affordance.
 */
describe('r164g — AI conversation hooks', () => {
  const get = api.get as unknown as Mock;
  const del = api.delete as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({ data: { conversationId: 'c1', reply: 'جواب' } });
    del.mockResolvedValue({ data: { ok: true } });
  });

  it('useAiConversations reads GET /ai/conversations through the envelope', async () => {
    const { wrapper } = makeClient();
    const rows = [{ id: 'c1', title: 'عنوان', createdAt: '2026-01-01T00:00:00.000Z' }];
    get.mockResolvedValueOnce({ data: rows });
    const { result } = renderHook(() => useAiConversations(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/ai/conversations');
    expect(result.current.data).toEqual(rows);
  });

  it('useAiChat posts /ai/chat and refreshes the conversations family on success', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useAiChat(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ message: 'سؤال' });
    });
    expect(post).toHaveBeenCalledWith('/ai/chat', { message: 'سؤال' });
    expect(invalidatedKeys().filter((k) => k[0] === 'ai')).toEqual([['ai', 'conversations']]);
  });

  it('useAiChat failure leaves the conversations cache untouched (the failed turn wrote nothing)', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    post.mockRejectedValueOnce(new Error('provider down'));
    const { result } = renderHook(() => useAiChat(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ message: 'سؤال' }).catch(() => undefined);
    });
    expect(invalidatedKeys().filter((k) => k[0] === 'ai')).toEqual([]);
  });

  it('useDeleteAiConversation calls DELETE /ai/conversations/:id and refreshes the list', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useDeleteAiConversation(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('c1');
    });
    expect(del).toHaveBeenCalledWith('/ai/conversations/c1');
    expect(invalidatedKeys().filter((k) => k[0] === 'ai')).toEqual([['ai', 'conversations']]);
  });

  it('fetchAiConversationMessages reads the stored transcript through the envelope', async () => {
    const rows = [
      { id: 'm1', role: 'USER' as const, content: 'سؤال', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'm2', role: 'ASSISTANT' as const, content: 'جواب', createdAt: '2026-01-01T00:00:01.000Z' },
    ];
    get.mockResolvedValueOnce({ data: rows });
    const out = await fetchAiConversationMessages('c1');
    expect(get).toHaveBeenCalledWith('/ai/conversations/c1/messages');
    expect(out).toEqual(rows);
  });
});

/* ── r180-F2 — the semester-grade entry pair (POST /offerings/:id/grades
 * shipped backend-only until GradesPage grew its consumer). The write
 * half must refresh the entry grid's own read (the prefills) plus the
 * same teacher families useRecordAttendance ships — a landed Grade row
 * feeds the roster avgGrade, analytics, risks and the dashboard. The
 * read half normalizes prisma's stringified Decimal score to a number
 * before any consumer reads it (the grid's inputs work in numbers). */
describe('r180-F2 — offering grades entry pair', () => {
  const get = api.get as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({ data: [{ id: 'g1' }] });
  });

  it('useUpsertOfferingGrades posts the grades body to the offering and refreshes the grades read + teacher families', async () => {
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useUpsertOfferingGrades('off-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        grades: [
          { studentId: 'st-1', kind: 'MIDTERM', score: 78.5, maxScore: 100, weight: 30, feedback: 'أحسنت' },
          { studentId: 'st-2', kind: 'MIDTERM', score: 64 },
        ],
      });
    });

    expect(post).toHaveBeenCalledWith('/offerings/off-1/grades', {
      grades: [
        { studentId: 'st-1', kind: 'MIDTERM', score: 78.5, maxScore: 100, weight: 30, feedback: 'أحسنت' },
        { studentId: 'st-2', kind: 'MIDTERM', score: 64 },
      ],
    });
    // The entry grid's own read (prefills)…
    expect(invalidatedKeys()).toContainEqual(['teacher', 'offering', 'off-1', 'grades']);
    // …and the same families useRecordAttendance invalidates.
    expect(invalidatedKeys()).toContainEqual(['teacher', 'offering', 'off-1', 'students']);
    expect(invalidatedKeys()).toContainEqual(['teacher', 'offering', 'off-1', 'analytics']);
    expect(invalidatedKeys()).toContainEqual(['teacher', 'risks']);
    expect(invalidatedKeys()).toContainEqual(['teacher', 'dashboard']);
    // Targeted keys only — no blanket ['teacher'] or ['teacher','offering'] prefix nuke.
    expect(invalidatedKeys()).not.toContainEqual(['teacher']);
    expect(invalidatedKeys()).not.toContainEqual(['teacher', 'offering']);
  });

  it('useOfferingGrades reads the offering grades and normalizes the stringified Decimal score', async () => {
    const { wrapper } = makeClient();
    // Prisma's Decimal serializes to a JSON string on the wire.
    get.mockResolvedValueOnce({
      data: [
        { id: 'g1', offeringId: 'off-1', studentId: 'st-1', kind: 'MIDTERM', score: '78.50', maxScore: 100, weight: 30, feedback: null, recordedAt: '2026-01-01T00:00:00.000Z', student: { id: 'st-1', firstName: 'آمنة', lastName: 'العبيدي' } },
        { id: 'g2', offeringId: 'off-1', studentId: 'st-2', kind: 'HOMEWORK', score: '12', maxScore: 20, weight: 10, feedback: 'راجع الفصل الأول', recordedAt: '2026-01-02T00:00:00.000Z', student: { id: 'st-2', firstName: 'ليلى', lastName: 'بن عامر' } },
      ],
    });
    const { result } = renderHook(() => useOfferingGrades('off-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/offerings/off-1/grades');
    expect(result.current.data?.map((g) => typeof g.score)).toEqual(['number', 'number']);
    expect(result.current.data?.[0]).toMatchObject({ score: 78.5, kind: 'MIDTERM' });
    expect(result.current.data?.[1]).toMatchObject({ score: 12, feedback: 'راجع الفصل الأول' });
  });

  it('normalizeOfferingGradeRow keeps a numeric score untouched (defensive wire shapes)', () => {
    expect(normalizeOfferingGradeRow({ id: 'g3', offeringId: 'o', studentId: 's', kind: 'FINAL', score: 99, maxScore: 100, weight: 40, feedback: null, recordedAt: '2026-01-01T00:00:00.000Z', student: { id: 's', firstName: 'أ', lastName: 'ب' } }))
      .toMatchObject({ score: 99, kind: 'FINAL' });
  });
});
