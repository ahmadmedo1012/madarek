/**
 * Wave 22-d — exam moderation reject-confirmation tests (audit 4-A8 P2-3).
 *
 * «رفض» removes the template from the moderation queue with a single
 * click and no undo. The fix gates the destructive leg behind the
 * platform's ConfirmDialog (the same primitive the owner console and
 * the exam-taker submit flow use):
 *   - clicking «رفض» opens the dialog and fires NO mutation;
 *   - cancelling keeps the row in the queue (mutation still unfired);
 *   - confirming runs the moderation with approve: false (note intact);
 *   - «اعتماد» stays instant (the safe/default outcome) — approve
 *     fires without any dialog.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExamModerationPage } from '../../src/pages/exams/OnlineExamsPages';

const mocks = vi.hoisted(() => ({
  queue: [] as Array<Record<string, unknown>>,
  moderate: vi.fn(async () => ({})),
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
  useModerateExam: () => ({ mutateAsync: mocks.moderate, isPending: false }),
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queue = [
    {
      id: 'tpl-1',
      title: 'اختبار نهائي — قواعد البيانات',
      kind: 'FINAL',
      durationMin: 60,
      createdAt: new Date().toISOString(),
      offering: { course: { name: 'قواعد البيانات' } },
      author: { firstName: 'سالم', lastName: 'الطاهر' },
      _count: { questions: 12 },
    },
  ];
});

describe('ExamModerationPage — reject is confirmed before it fires (A8 P2-3)', () => {
  it('opens the review panel and shows the confirm dialog on «رفض» — no mutation yet', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));
    // Panel open: the note textarea is the review surface.
    expect(screen.getByLabelText('ملاحظات المراجعة للمؤلف')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^رفض$/ }));
    expect(await screen.findByText('رفض قالب الاختبار')).toBeInTheDocument();
    expect(screen.getByText(/لا يمكن التراجع عن هذا القرار/)).toBeInTheDocument();
    expect(mocks.moderate).not.toHaveBeenCalled();
  });

  it('cancelling keeps the row in the queue and never fires the mutation', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));
    fireEvent.click(screen.getByRole('button', { name: /^رفض$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة القالب' }));

    await waitFor(() => expect(screen.queryByText('رفض قالب الاختبار')).toBeNull());
    expect(mocks.moderate).not.toHaveBeenCalled();
    // The template is still in the queue.
    expect(screen.getByText('اختبار نهائي — قواعد البيانات')).toBeInTheDocument();
  });

  it('confirming runs the moderation with approve: false and the panel note', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));
    fireEvent.change(screen.getByLabelText('ملاحظات المراجعة للمؤلف'), {
      target: { value: 'أسئلة خارج المقرر' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^رفض$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'رفض القالب' }));

    await waitFor(() => expect(mocks.moderate).toHaveBeenCalledTimes(1));
    expect(mocks.moderate).toHaveBeenCalledWith({
      id: 'tpl-1',
      approve: false,
      note: 'أسئلة خارج المقرر',
    });
  });

  it('«اعتماد» stays instant — no dialog, direct mutation with approve: true', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد' }));

    await waitFor(() => expect(mocks.moderate).toHaveBeenCalledTimes(1));
    expect(mocks.moderate).toHaveBeenCalledWith({ id: 'tpl-1', approve: true, note: undefined });
    expect(screen.queryByText('رفض قالب الاختبار')).toBeNull();
  });
});
