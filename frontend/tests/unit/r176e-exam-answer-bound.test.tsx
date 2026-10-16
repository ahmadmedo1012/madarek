/**
 * Frontend unit — r176e/D-01: the exam answer bound, pinned at the
 * behavior (mirrors the OnlineExamsPages.test.tsx harness shape).
 *
 * The backend caps answerText at 4000 (exams.routes.ts z.string()
 * .max(4000)); the textarea now mirrors it (maxLength + a near-limit
 * counter) AND an over-bound answer never fires the wire save — the
 * honest bound chip replaces the doomed «تعذَّر الحفظ» connectivity lie
 * (which could ride Promise.allSettled into a submit that silently
 * dropped the essay).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  exams: [] as Array<Record<string, unknown>>,
  start: vi.fn(),
  finish: vi.fn(),
  answer: vi.fn(),
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyExams: () => ({ data: mocks.exams, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useStartExam: () => ({ mutateAsync: mocks.start, isPending: false }),
  useSubmitAnswer: () => ({ mutateAsync: mocks.answer, isPending: false }),
  useFinishExam: () => ({ mutateAsync: mocks.finish, isPending: false }),
  useExamReview: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useExamModerationQueue: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useModerateExam: () => ({ mutateAsync: vi.fn() }),
  useExamTemplate: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import { ExamTakerPage } from '../../src/pages/exams/OnlineExamsPages';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

const STUDENT: AuthUser = {
  id: 'u1', role: 'STUDENT', email: 's@test.dev',
  firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج',
};

const ESSAY_EXAM = [
  {
    id: 'e1', title: 'اختبار مقالي', kind: 'EXAM', durationMin: 30, questionCount: 1,
    passingScore: 50, openAt: null, closeAt: null, courseName: 'مقرر', courseIcon: null,
    facultyName: null, myAttempt: null,
  },
];
const ESSAY_PAYLOAD = {
  attemptId: 'a1', expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), durationMin: 30,
  title: 'اختبار مقالي',
  questions: [{ id: 'q1', type: 'ESSAY', prompt: 'اشرح بالتفصيل', choices: null, points: 10 }],
};

async function startEssayExam() {
  mocks.start.mockResolvedValue(ESSAY_PAYLOAD);
  mocks.answer.mockResolvedValue(undefined);
  render(
    <MemoryRouter initialEntries={['/student/online-exams/e1']}>
      <Routes>
        <Route path="/student/online-exams/:id" element={<ExamTakerPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => screen.getByRole('button', { name: 'بدء الاختبار' }));
  fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
  await waitFor(() => screen.getByPlaceholderText('اكتب إجابتك هنا…'));
}

describe('D-01 — the exam answer bound (4000, mirrored from the backend)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: STUDENT });
    mocks.exams.length = 0;
    mocks.exams.push(...ESSAY_EXAM);
    mocks.start.mockClear();
    mocks.answer.mockClear();
    mocks.finish.mockClear();
  });
  afterEach(() => cleanup());

  it('the textarea carries maxLength=4000 (the backend answerText bound)', async () => {
    await startEssayExam();
    const textarea = screen.getByPlaceholderText('اكتب إجابتك هنا…') as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(4000);
  });

  it('a counter appears in the last 400 chars of a long draft', async () => {
    await startEssayExam();
    const textarea = screen.getByPlaceholderText('اكتب إجابتك هنا…') as HTMLTextAreaElement;
    expect(screen.queryByText(/\/4000/)).toBeNull();
    fireEvent.change(textarea, { target: { value: 'أ'.repeat(3700) } });
    expect(screen.getByText('3700/4000')).toBeTruthy();
  });

  it('an over-bound answer NEVER fires the wire save — the honest bound chip replaces the connectivity lie', async () => {
    await startEssayExam();
    const textarea = screen.getByPlaceholderText('اكتب إجابتك هنا…') as HTMLTextAreaElement;
    // Programmatic oversize (maxLength clamps typed input, not setValue).
    fireEvent.change(textarea, { target: { value: 'أ'.repeat(4100) } });
    fireEvent.blur(textarea);
    await waitFor(() => expect(screen.getByText(/الإجابة أطول من الحد/)).toBeTruthy());
    // The doomed request never left the browser.
    expect(mocks.answer).not.toHaveBeenCalled();
  });
});
