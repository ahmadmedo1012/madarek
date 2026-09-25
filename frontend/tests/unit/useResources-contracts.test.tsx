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
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../src/lib/api', () => {
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: { post, get: vi.fn(async () => ({ data: [] })), patch: vi.fn(async () => ({ data: {} })) },
    unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> => p.then((r) => r.data),
  };
});

import {
  tagStartExamResponse,
  useGradeSubmission,
  useMarkAllNotifsRead,
  useFinishExam,
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
