/**
 * 16-E10 — ResearchReviewPage tests (15-e P1-6 discard guard + 15-j
 * P0-1 error-language de-leak at page level).
 *
 * The review modal is one of the three longest unsaved-prose surfaces
 * (a teacher's full write-up of a student paper): Esc / ✕ / إلغاء /
 * overlay click used to destroy the draft instantly. These tests pin
 * the useDiscardGuard wiring:
 *   1. a clean modal closes directly — no blocking confirm,
 *   2. a dirty modal routes the close affordances through the
 *      «تعديلات غير محفوظة» confirm; «متابعة التحرير» keeps the draft,
 *      «التخلّي عن التعديلات» closes,
 *   3. Esc dismisses one layer at a time (confirm first, modal after),
 *   4. a failed grade save shows the Arabic fallback — the backend's
 *      English message never renders raw (15-j P0-1).
 *
 * Data hooks are mocked at the useResources boundary; apiErrorMessage
 * stays the REAL re-export (spread from the actual module) so the
 * language guard is exercised end-to-end. Flow pattern follows
 * CurriculumAuthoringPanel's dirty-close suite.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResearchReviewPage from '../../src/pages/teacher/ResearchReviewPage';

const mocks = vi.hoisted(() => ({
  queue: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null,
    refetch: () => undefined,
  },
  grade: { isPending: false, mutateAsync: vi.fn() },
  publish: { isPending: false, mutateAsync: vi.fn() },
  profile: { data: null, isPending: false, isError: false, error: null, refetch: () => undefined },
  annotations: { data: [], isPending: false, isError: false, error: null, refetch: () => undefined },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useResearchQueue: () => mocks.queue,
    useGradePaper: () => mocks.grade,
    usePublishPaper: () => mocks.publish,
    useMyTeacherProfile: () => mocks.profile,
    useAnnotations: () => mocks.annotations,
  };
});

vi.mock('../../src/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const PAPER = {
  id: 'p1',
  title: 'أثر الذكاء الاصطناعي على التعليم العالي',
  status: 'CHECKS_PASSED',
  plagiarismPct: 8,
  aiContentPct: 12,
  uploadedAt: '2026-03-10T09:00:00.000Z',
  student: { id: 's1', firstName: 'سالم', lastName: 'الطاهر' },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ResearchReviewPage />
    </MemoryRouter>,
  );
}

async function openModal() {
  fireEvent.click(await screen.findByRole('button', { name: 'مراجعة وتقييم' }));
  await screen.findByRole('dialog', { name: 'مراجعة بحث' });
}

afterEach(() => {
  mocks.queue = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
  mocks.grade = { isPending: false, mutateAsync: vi.fn() };
  mocks.publish = { isPending: false, mutateAsync: vi.fn() };
  mocks.annotations = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
});

describe('ReviewModal — discard guard (15-e P1-6)', () => {
  it('closes a clean modal directly — no blocking confirm', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await openModal();

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'مراجعة بحث' })).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
  });

  it('a dirty modal routes إلغاء through the discard confirm; «متابعة التحرير» keeps the draft', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await openModal();

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مراجعة أولية للبحث' } });
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    expect(screen.getByLabelText('ملاحظات للطالب')).toHaveValue('مراجعة أولية للبحث');

    fireEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    });
    // The review modal is still open with the draft intact.
    expect(screen.getByRole('dialog', { name: 'مراجعة بحث' })).toBeInTheDocument();
    expect(screen.getByLabelText('ملاحظات للطالب')).toHaveValue('مراجعة أولية للبحث');
  });

  it('Esc on a dirty modal opens the confirm; the next Esc cancels the discard only', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await openModal();

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مسودة' } });
    fireEvent.keyDown(document, { key: 'Escape' });

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    expect(screen.getByRole('dialog', { name: 'مراجعة بحث' })).toBeInTheDocument();

    // One Esc dismisses ONE layer — the confirm, not the review modal
    // (whose own Esc is locked while the confirm is stacked).
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    });
    expect(screen.getByRole('dialog', { name: 'مراجعة بحث' })).toBeInTheDocument();
  });

  it('explicit discard («التخلّي عن التعديلات») closes the modal', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await openModal();

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مسودة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' })); // the ✕ affordance

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    fireEvent.click(screen.getByRole('button', { name: 'التخلّي عن التعديلات' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'مراجعة بحث' })).toBeNull();
    });
  });
});

describe('ReviewModal — error language (15-j P0-1)', () => {
  it('a failed grade save shows the Arabic fallback — the English API message never renders raw', async () => {
    mocks.queue.data = [PAPER];
    mocks.grade.mutateAsync.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'CONFLICT', message: 'Already submitted' } } },
    });
    renderPage();
    await openModal();

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مراجعة أولية' } });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد التقييم' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('تعذَّر حفظ التقييم — تحقّق من اتصالك ثم أعد المحاولة.');
    expect(alert).not.toHaveTextContent('Already submitted');
    // The modal stays open — the failure is never silent and the draft
    // is never destroyed by it.
    expect(screen.getByRole('dialog', { name: 'مراجعة بحث' })).toBeInTheDocument();
  });
});
