/**
 * r165a — assessment cache-freshness contract pins.
 *
 * Two mutations write data OTHER surfaces read from a 60s-stale cache
 * (and the app turns refetchOnWindowFocus off globally), so each used
 * to leave its target surface lying until the stale window lapsed:
 *   1. useSubmitAssignment → ['me','results'] — the submit-success
 *      modal links straight to /student/results («تابع حالة التقييم
 *      ودرجتك من صفحة النتائج»), but the fresh submission never
 *      appeared in «تسليمات بانتظار التقييم» for up to 60s. The
 *      grade-side twin (useGradeSubmission) already invalidated this
 *      key — the submit side now matches it.
 *   2. useFinishExam → ['me','dashboard'] — the server's dashboard
 *      agenda excludes finished exam attempts, but the agenda caches
 *      for 60s, so a just-finished exam kept advertising itself on
 *      the student's home. Same one-line pattern useSubmitAssignment
 *      ships.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../src/lib/api', () => {
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: { post, get: vi.fn(async () => ({ data: [] })), patch: vi.fn(async () => ({ data: {} })), delete: vi.fn(async () => ({ data: {} })) },
    unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> => p.then((r) => r.data),
  };
});

import { useSubmitAssignment, useFinishExam } from '../../src/hooks/useResources';
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
  // generic MockInstance type (same idiom as useResources-contracts).
  const invalidatedKeys = () =>
    invalidate.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
  return { invalidatedKeys, wrapper };
}

describe('r165a — useSubmitAssignment invalidation map', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { id: 's1', status: 'SUBMITTED' } });
  });

  it('refreshes the results page the success modal links to, plus both dashboards', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useSubmitAssignment('off-1', 'asg-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ textAnswer: 'إجابتي' });
    });

    expect(post).toHaveBeenCalledWith(
      '/offerings/off-1/assignments/asg-1/submit',
      { textAnswer: 'إجابتي' },
    );
    const keys = invalidatedKeys();
    expect(keys).toContainEqual(['me', 'dashboard']);
    expect(keys).toContainEqual(['teacher', 'dashboard']);
    // r165a pin: the modal links to /student/results — the fresh
    // submission must appear in «تسليمات بانتظار التقييم» immediately,
    // not after useStudentResults' 60s stale window.
    expect(keys).toContainEqual(['me', 'results']);
  });
});

describe('r165a — useFinishExam invalidation map', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { score: 7, maxScore: 10, status: 'GRADED', needsManual: 0, passed: true } });
  });

  it('refreshes the exams list AND the dashboard agenda a finished exam leaves', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useFinishExam(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('att-1');
    });

    expect(post).toHaveBeenCalledWith('/exams/attempts/att-1/submit', {});
    const keys = invalidatedKeys();
    expect(keys).toContainEqual(['exams', 'me']);
    // r165a pin: the agenda (60s staleTime, no refetchOnWindowFocus)
    // must stop advertising the just-finished exam immediately.
    expect(keys).toContainEqual(['me', 'dashboard']);
  });
});
