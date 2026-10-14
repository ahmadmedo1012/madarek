/**
 * r165a — the quality reviewer's note is capped at the backend's
 * moderateSchema (exams.routes.ts: note trim().max(500)) exactly like
 * the teacher-side twin (ExamAuthorPages TemplateModerationPanel):
 * the quality queue's textarea had no maxLength, so a >500-char note
 * sailed past the client and failed server-side with a misleading
 * connectivity error («تعذَّر تنفيذ القرار — تحقّق من اتصالك»).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExamModerationPage } from '../../src/pages/exams/OnlineExamsPages';

const mocks = vi.hoisted(() => ({
  queue: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyExams: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useStartExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitAnswer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFinishExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExamModerationQueue: () => ({
    data: mocks.queue,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useModerateExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  // The preview is not under test — stubbed pending-free so the panel
  // renders the note surface (same idiom as -disclosure/-confirm).
  useExamTemplate: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExamModerationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const QUEUE_ITEM = {
  id: 'tpl-1',
  title: 'اختبار نهائي — قواعد البيانات',
  kind: 'FINAL',
  durationMin: 60,
  createdAt: new Date().toISOString(),
  offering: { course: { name: 'قواعد البيانات' } },
  author: { firstName: 'سالم', lastName: 'الطاهر' },
  _count: { questions: 12 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queue = [QUEUE_ITEM];
});

describe('ExamModerationPage — review note cap (r165a)', () => {
  it('caps the review note at the backend\'s 500 chars, matching the author-side twin', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));
    const note = screen.getByLabelText('ملاحظات المراجعة للمؤلف');

    // The twin (TemplateModerationPanel) ships exactly maxLength={500}
    // with no counter — this surface matches it; the browser enforces
    // the cap at typing time so the decision never fails server-side
    // on a too-long note.
    expect(note).toHaveAttribute('maxlength', '500');
  });
});
