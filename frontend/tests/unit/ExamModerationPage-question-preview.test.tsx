/**
 * r155b — ExamModerationPage question preview.
 *
 * The review panel for PENDING_REVIEW templates showed metadata + the
 * note textarea + approve/reject only — the reviewer decided BLIND.
 * The panel now fetches the template (useExamTemplate — the same GET
 * /exams/templates/:id the author detail page reads; the backend
 * serves the answer key to QUALITY holding EXAMS_MODERATE) and
 * renders the ordered questions before the decision buttons.
 *
 * Pins:
 *   1. opening a row's panel fetches the template by that row's id;
 *   2. each question renders prompt + type/difficulty badges + the
 *      released answer key (marked) — the moderation row grammar;
 *   3. the approve/reject flow itself is untouched (buttons present,
 *      no mutation fired by opening the panel);
 *   4. a failed preview surfaces an honest retryable error, never an
 *      empty-as-success state.
 *   5. 6A9-finding-8 (r157): the third KPI is «أسئلة بانتظار الفحص» —
 *      the sum of _count.questions over the pending queue rows, '…'
 *      while loading, '—' on error. The invented static «نموذج الجودة:
 *      رؤية 2024–2028» tile is gone; no decision timestamps exist in
 *      the page payload (PENDING queue only), so none were invented.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExamModerationPage } from '../../src/pages/exams/OnlineExamsPages';

const mocks = vi.hoisted(() => ({
  queue: [] as Array<Record<string, unknown>>,
  // 6A9-finding-8: the KPI derives from the queue query itself — the
  // pending / error flags are controllable so every KPI state is
  // pinnable.
  queuePending: false,
  queueError: false,
  moderate: vi.fn(async () => ({})),
  template: {
    data: null as Record<string, unknown> | null,
    isPending: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  templateCalls: vi.fn(),
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyExams: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useStartExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitAnswer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useFinishExam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExamModerationQueue: () => ({
    data: mocks.queue,
    isPending: mocks.queuePending,
    isError: mocks.queueError,
    error: mocks.queueError ? new Error('network') : null,
    refetch: vi.fn(),
  }),
  useModerateExam: () => ({ mutateAsync: mocks.moderate, isPending: false }),
  // r155b: the preview's data source — a spy so the fetched id is
  // assertable (the page must ask for the OPEN row's template).
  useExamTemplate: (id: string | undefined) => {
    mocks.templateCalls(id);
    return mocks.template;
  },
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const QUEUE_ITEM = {
  id: 'tpl-1',
  title: 'اختبار نهائي — قواعد البيانات',
  kind: 'FINAL',
  durationMin: 60,
  createdAt: new Date().toISOString(),
  offering: { course: { name: 'قواعد البيانات' } },
  author: { firstName: 'سالم', lastName: 'الطاهر' },
  _count: { questions: 2 },
};

const TEMPLATE_DETAIL = {
  id: 'tpl-1',
  title: 'اختبار نهائي — قواعد البيانات',
  questions: [
    {
      id: 'eq-1',
      order: 1,
      pointsOverride: null,
      question: {
        id: 'q-1',
        type: 'MCQ',
        prompt: 'ما أمر SQL الذي يسترجع الصفوف من جدول؟',
        choices: ['SELECT', 'INSERT', 'DROP'],
        correctAnswer: 0,
        difficulty: 'EASY',
        points: 5,
        isApproved: true,
        moderationNote: null,
        tags: [],
        category: { title: 'قواعد البيانات' },
      },
    },
    {
      id: 'eq-2',
      order: 2,
      pointsOverride: 10,
      question: {
        id: 'q-2',
        type: 'SHORT',
        prompt: 'عدّد مستويات عزل المعاملات.',
        choices: null,
        correctAnswer: 'READ COMMITTED و REPEATABLE READ و SERIALIZABLE…',
        difficulty: 'HARD',
        points: 8,
        isApproved: false,
        moderationNote: 'الصياغة تحتاج توحيد المصطلحات.',
        tags: [],
        category: { title: 'قواعد البيانات' },
      },
    },
  ],
};

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
  mocks.queue = [QUEUE_ITEM];
  mocks.queuePending = false;
  mocks.queueError = false;
  mocks.template.data = TEMPLATE_DETAIL;
  mocks.template.isPending = false;
  mocks.template.isError = false;
  mocks.template.error = null;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ExamModerationPage — question preview (r155b)', () => {
  it('fetches the OPEN row template by id and renders its questions with the released key', async () => {
    renderPage();

    // Closed state: the panel (and its fetch) does not exist yet.
    expect(mocks.templateCalls).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));

    // The preview asked for THIS row's template id.
    expect(mocks.templateCalls).toHaveBeenCalledWith('tpl-1');

    // Question rows — the moderation row grammar: prompt, type and
    // difficulty badges, per-question points.
    expect(screen.getByText('ما أمر SQL الذي يسترجع الصفوف من جدول؟')).toBeInTheDocument();
    expect(screen.getByText('اختيار من متعدد')).toBeInTheDocument();
    expect(screen.getByText('صعب')).toBeInTheDocument();
    expect(screen.getByText('عدّد مستويات عزل المعاملات.')).toBeInTheDocument();

    // The answer key the backend releases to EXAMS_MODERATE holders —
    // marked, so the reviewer sees what they are approving.
    expect(screen.getByText(/الإجابة الصحيحة: SELECT/)).toBeInTheDocument();
    expect(screen.getByText(/الإجابة النموذجية: READ COMMITTED/)).toBeInTheDocument();

    // A suspended bank question inside the template is flagged, with
    // its moderation note — exactly what the reviewer must weigh.
    expect(screen.getByText('موقوف')).toBeInTheDocument();
    expect(screen.getByText(/الصياغة تحتاج توحيد المصطلحات/)).toBeInTheDocument();
  });

  it('the decision flow is untouched — note surface + approve/reject, no mutation on open', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));

    expect(screen.getByLabelText('ملاحظات المراجعة للمؤلف')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اعتماد' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^رفض$/ })).toBeInTheDocument();
    // Opening the panel and reading must never fire a decision.
    expect(mocks.moderate).not.toHaveBeenCalled();
  });

  it('a failed preview is an honest, retryable error — never an empty-as-success list', async () => {
    mocks.template.isError = true;
    mocks.template.error = new Error('network');
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('تعذَّر تحميل أسئلة القالب');
    // The retry is wired to the preview's own query.
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(mocks.template.refetch).toHaveBeenCalledTimes(1);
  });

  it('a template with no questions says so instead of rendering a silent void', async () => {
    mocks.template.data = { ...TEMPLATE_DETAIL, questions: [] };
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'مراجعة' }));

    expect(await screen.findByText('لا أسئلة في هذا القالب')).toBeInTheDocument();
  });

  it('the third KPI is the queue’s own question count — honest in every state, «نموذج الجودة» gone (6A9-finding-8)', () => {
    // Two pending templates — 3 + 5 questions awaiting review.
    mocks.queue = [
      { ...QUEUE_ITEM, _count: { questions: 3 } },
      {
        ...QUEUE_ITEM,
        id: 'tpl-2',
        title: 'اختبار قصير — الشبكات',
        kind: 'QUIZ',
        durationMin: 30,
        offering: null,
        _count: { questions: 5 },
      },
    ];
    const loaded = renderPage();

    // The KPI is the sum over the pending queue rows — scoped to the
    // tile so the other KPIs' values never collide with it.
    const loadedTile = screen.getByText('أسئلة بانتظار الفحص').closest('.metric') as HTMLElement;
    expect(within(loadedTile).getByText('8')).toBeInTheDocument();
    // The invented static tile is gone — no «نموذج الجودة», no vision.
    expect(screen.queryByText('نموذج الجودة')).toBeNull();
    expect(screen.queryByText('رؤية 2024–2028')).toBeNull();
    loaded.unmount();

    // '…' while the queue itself is loading — never a fake zero.
    mocks.queuePending = true;
    const pending = renderPage();
    const pendingTile = screen.getByText('أسئلة بانتظار الفحص').closest('.metric') as HTMLElement;
    expect(within(pendingTile).getByText('…')).toBeInTheDocument();
    pending.unmount();

    // '—' when the queue request failed.
    mocks.queuePending = false;
    mocks.queueError = true;
    renderPage();
    const errorTile = screen.getByText('أسئلة بانتظار الفحص').closest('.metric') as HTMLElement;
    expect(within(errorTile).getByText('—')).toBeInTheDocument();
  });
});
