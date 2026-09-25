/**
 * 23-b — exam moderation disclosure semantics (audit 4-A8 P3-6).
 *
 * The per-row «مراجعة» disclosure had aria-expanded but no
 * aria-controls, no region announcement, and no Escape path — a
 * keyboard reviewer could open a panel and never close it without
 * reaching for the mouse. These tests pin the 23-b wiring:
 *   1. the toggle carries aria-controls → the panel it reveals, and
 *      the panel is a labelled role="region" (its open state is
 *      announced by the expanded/controls pair);
 *   2. Escape closes the open panel and returns focus to its toggle;
 *   3. while the reject ConfirmDialog (22-d) is stacked, Escape is
 *      owned by the dialog — the panel must NOT also close underneath
 *      it (the overlayStack global-shortcut guard idiom).
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

describe('ExamModerationPage — disclosure keyboard semantics (A8 P3-6)', () => {
  it('wires the toggle to the panel: aria-controls + labelled role=region', async () => {
    renderPage();

    const toggle = await screen.findByRole('button', { name: 'مراجعة' });
    fireEvent.click(toggle);

    // The toggle now announces what it controls (and that it is open).
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'moderation-panel-tpl-1');

    // The revealed surface is a named region — the disclosure open
    // state is announced instead of silently inserting DOM.
    const panel = document.getElementById('moderation-panel-tpl-1');
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('aria-label', 'مراجعة اختبار نهائي — قواعد البيانات');
  });

  it('Escape closes the open panel and returns focus to its toggle', async () => {
    renderPage();

    const toggle = await screen.findByRole('button', { name: 'مراجعة' });
    fireEvent.click(toggle);
    expect(screen.getByLabelText('ملاحظات المراجعة للمؤلف')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByLabelText('ملاحظات المراجعة للمؤلف')).toBeNull();
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Focus lands back on the toggle — the keyboard user continues
    // from the row they just closed instead of being dropped.
    expect(toggle).toHaveFocus();
  });

  it('Escape over the stacked reject dialog cancels the dialog only — the panel stays open', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));
    fireEvent.click(screen.getByRole('button', { name: /^رفض$/ }));
    await screen.findByRole('dialog', { name: 'رفض قالب الاختبار' });

    // One Esc dismisses ONE layer: the dialog (which owns the key
    // while the overlay stack is non-empty), not the panel under it.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'رفض قالب الاختبار' })).toBeNull();
    });
    expect(screen.getByLabelText('ملاحظات المراجعة للمؤلف')).toBeInTheDocument();
    expect(mocks.moderate).not.toHaveBeenCalled();

    // The next Esc (stack now empty) is the panel's again.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByLabelText('ملاحظات المراجعة للمؤلف')).toBeNull();
    });
  });
});
