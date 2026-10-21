/**
 * 16-E10 — ResearchReviewPage tests (15-e P1-6 discard guard + 15-j
 * P0-1 error-language de-leak at page level).
 *
 * r304 — the review surface is a DOCUMENT/REVIEW SPLIT, not a modal:
 * the queue is a list of selectable rows (priority = oldest wait
 * first, wait age pinned per row) and the review workspace renders
 * beside it (mobile recomposes the same workspace into a bottom
 * Sheet). The discard contract survives the recomposition — it now
 * guards the SELECTION: switching papers while the grade draft is
 * edited routes through the «تعديلات غير محفوظة» confirm; a clean
 * switch happens directly. The other pins carry over verbatim:
 *   1. the grade fields live inside a real <form> — a submit event
 *      (Enter) saves the grade; in GRADED mode Enter no-ops BY DESIGN
 *      (publishing is an explicit click, never an implicit submit
 *      away from the public archive),
 *   2. a failed grade save shows the Arabic fallback — the backend's
 *      English message never renders raw (15-j P0-1),
 *   3. the feedback textarea mirrors the backend's 4000-char cap
 *      (r165b),
 *   4. every queue state renders in its own section with a live
 *      affordance (r164f), the KPI strip counts all three honestly.
 *
 * Data hooks are mocked at the useResources boundary; apiErrorMessage
 * stays the REAL re-export (spread from the actual module) so the
 * language guard is exercised end-to-end.
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

/* A second pending paper — the selection-switch guard needs somewhere
 * to switch TO. */
const PAPER_2 = {
  ...PAPER,
  id: 'p2',
  title: 'أنماط التصميم في تطبيقات الويب',
};

/* r157 / 6A8 — a graded paper riding the queue (RESEARCH_QUEUE_STATUSES
 * includes GRADED now): the publish loop's reachable target. */
const GRADED_PAPER = {
  ...PAPER,
  id: 'p3',
  status: 'GRADED',
  grade: 17,
  feedback: 'بحث متين منهجياً.',
  gradedAt: '2026-03-12T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ResearchReviewPage />
    </MemoryRouter>,
  );
}

/** The queue row's accessible name (title + status — the triage row
 * reads as one utterance). */
const queueRow = (title: string, status: string) =>
  screen.getByRole('button', { name: `${title} — ${status}` });

/** Select a paper in the queue and wait for the workspace to show it. */
async function selectPaper(title: string, status: string) {
  fireEvent.click(queueRow(title, status));
  await screen.findByRole('heading', { name: title });
}

afterEach(() => {
  mocks.queue = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
  mocks.grade = { isPending: false, mutateAsync: vi.fn() };
  mocks.publish = { isPending: false, mutateAsync: vi.fn() };
  mocks.annotations = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
});

describe('ReviewWorkspace — the selection discard guard (15-e P1-6, r304 recomposition)', () => {
  it('switches between papers directly when the draft is clean — no blocking confirm', async () => {
    mocks.queue.data = [PAPER, PAPER_2];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    fireEvent.click(queueRow(PAPER_2.title, 'بانتظار التقييم'));
    await screen.findByRole('heading', { name: PAPER_2.title });
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
  });

  it('a dirty draft routes the switch through the confirm; «متابعة التحرير» keeps the draft and the selection', async () => {
    mocks.queue.data = [PAPER, PAPER_2];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مراجعة أولية للبحث' } });
    fireEvent.click(queueRow(PAPER_2.title, 'بانتظار التقييم'));

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    // The draft is still seated in the workspace…
    expect(screen.getByLabelText('ملاحظات للطالب')).toHaveValue('مراجعة أولية للبحث');
    // …and the selection never moved.
    expect(screen.getByRole('heading', { name: PAPER.title })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    });
    // Still on the first paper, draft intact.
    expect(screen.getByRole('heading', { name: PAPER.title })).toBeInTheDocument();
    expect(screen.getByLabelText('ملاحظات للطالب')).toHaveValue('مراجعة أولية للبحث');
  });

  it('explicit discard («التخلّي عن التعديلات») performs the switch — the draft is abandoned, not silently kept', async () => {
    mocks.queue.data = [PAPER, PAPER_2];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مسودة' } });
    fireEvent.click(queueRow(PAPER_2.title, 'بانتظار التقييم'));

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    fireEvent.click(screen.getByRole('button', { name: 'التخلّي عن التعديلات' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    });
    // The switch landed: the workspace now shows the other paper, with
    // its own (empty) draft — not the abandoned one.
    expect(screen.getByRole('heading', { name: PAPER_2.title })).toBeInTheDocument();
    expect(screen.getByLabelText('ملاحظات للطالب')).toHaveValue('');
  });
});

/* ── r157 / 6A8 — GRADED rides the queue; the publish loop is reachable ── */
describe('ResearchReviewPage — the GRADED queue section (r157 / 6A8)', () => {
  it('a GRADED paper renders the «مُقيَّمة — جاهزة للنشر» section with the gold badge, the publish CTA in the workspace and an honest KPI', async () => {
    mocks.queue.data = [GRADED_PAPER];
    renderPage();

    // The section (label per the queue grammar)…
    expect(screen.getByText('مُقيَّمة — جاهزة للنشر')).toBeInTheDocument();
    // …the status badge on the row…
    const badge = screen.getByText('مُقيَّم').closest('.badge');
    expect(badge).not.toBeNull();
    // …and the KPI finally counts something (the queue used to exclude
    // GRADED, so «جاهزة للنشر» was forever 0).
    expect(screen.getByText('جاهزة للنشر', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
    // The score travels on the row (the mono chip: «17/20»).
    expect(
      screen.getByText((_c, el) =>
        el instanceof HTMLElement
        && (el.textContent ?? '').replace(/\s+/g, '') === '17/20'),
    ).toBeInTheDocument();

    // Selecting the row surfaces the workspace publish CTA.
    await selectPaper(GRADED_PAPER.title, 'مُقيَّم');
    expect(screen.getByRole('button', { name: 'نشر في المكتبة' })).toBeInTheDocument();
  });

  it('the workspace opens in graded mode — score read-only, publish explicit', async () => {
    mocks.queue.data = [GRADED_PAPER];
    renderPage();
    await selectPaper(GRADED_PAPER.title, 'مُقيَّم');

    // Graded mode: the score box is disabled (read-only)…
    expect(screen.getByLabelText('الدرجة (من 20)')).toBeDisabled();
    // …the grade submit button is gone…
    expect(screen.queryByRole('button', { name: 'تأكيد التقييم' })).toBeNull();
    // …and the explicit publish action is present.
    expect(screen.getByRole('button', { name: 'نشر في المكتبة' })).toBeInTheDocument();
  });
});

/* ── r157 / 6A9 — the review form contract (carried into the split) ── */
describe('ReviewWorkspace — form contract (r157 / 6A9)', () => {
  it('the fields live inside a real form — a submit event saves the grade (Enter)', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    const score = screen.getByLabelText('الدرجة (من 20)') as HTMLInputElement;
    const form = score.closest('form');
    expect(form).not.toBeNull();

    fireEvent.change(score, { target: { value: '18' } });
    fireEvent.submit(form!);

    // The Enter path lands the grade with the typed score.
    expect(mocks.grade.mutateAsync).toHaveBeenCalledWith({ id: 'p1', grade: 18, feedback: undefined });
  });

  it('GRADED mode: a submit event no-ops BY DESIGN — publish is an explicit click, never an Enter', async () => {
    mocks.queue.data = [GRADED_PAPER];
    renderPage();
    await selectPaper(GRADED_PAPER.title, 'مُقيَّم');

    const form = screen.getByLabelText('الدرجة (من 20)').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    // Enter in graded mode fires NOTHING — neither a re-grade…
    expect(mocks.grade.mutateAsync).not.toHaveBeenCalled();
    // …nor a publish to the public archive (the explicit button is the
    // only path).
    expect(mocks.publish.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'نشر في المكتبة' })).toBeInTheDocument();
  });
});

describe('ReviewWorkspace — FormField migration (23-b, 21-b hand-off)', () => {
  it('keeps the three review fields label-wired through the shared primitive', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    // All three controls stay associated with their visible labels
    // (the primitive injects the ids — the hand-rolled useId wiring is
    // gone) and typing still drives the state.
    const score = screen.getByLabelText('الدرجة (من 20)') as HTMLInputElement;
    expect(score).toHaveValue(15);
    fireEvent.change(score, { target: { value: '18' } });
    expect(screen.getByLabelText('الدرجة (من 20)')).toHaveValue(18);
    // The derived rating reactively follows the score.
    expect((screen.getByLabelText('التقدير') as HTMLInputElement).value).toBe('ممتاز');
    expect(screen.getByLabelText('ملاحظات للطالب')).toBeInTheDocument();
  });
});

describe('ReviewWorkspace — error language (15-j P0-1)', () => {
  it('a failed grade save shows the Arabic fallback — the English API message never renders raw', async () => {
    mocks.queue.data = [PAPER];
    mocks.grade.mutateAsync.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'CONFLICT', message: 'Already submitted' } } },
    });
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مراجعة أولية' } });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد التقييم' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('تعذَّر حفظ التقييم — تحقّق من اتصالك ثم أعد المحاولة.');
    expect(alert).not.toHaveTextContent('Already submitted');
    // The workspace stays put — the failure is never silent and the
    // draft is never destroyed by it.
    expect(screen.getByRole('heading', { name: PAPER.title })).toBeInTheDocument();
    expect(screen.getByLabelText('ملاحظات للطالب')).toHaveValue('مراجعة أولية');
  });
});

/* ───────────────────────────────────────────────
 * r164f — review-loop state coherence pins. The queue (backend
 * RESEARCH_QUEUE_STATUSES) carries exactly three states and the page
 * renders each in its own section with a live affordance — nothing
 * rides the queue invisibly, no state renders without its action:
 *   · CHECKS_PASSED → «بانتظار تقييمك» + amber «بانتظار التقييم» + the
 *     selectable row that surfaces the grading workspace;
 *   · CHECKS_FAILED → the honest «رفضها الفحص التجريبي (محاكاة)»
 *     section (simulation label intact) + a selectable row (annotations
 *     stay reachable even for a failed paper);
 *   · GRADED → the r157 publish section (pinned above).
 * The KPI strip must reflect all three counts, never a masked 0.
 * ─────────────────────────────────────────────── */
describe('ResearchReviewPage — queue state coherence (r164f)', () => {
  it('every queue state renders in its own section with a live affordance — nothing hidden', async () => {
    mocks.queue.data = [
      PAPER,                                  // CHECKS_PASSED
      { ...PAPER, id: 'p4', status: 'CHECKS_FAILED', plagiarismPct: 31.2, aiContentPct: 40 },
      GRADED_PAPER,                           // GRADED
    ];
    renderPage();

    // The three sections, one per state… (the section title selector —
    // the same words also label the KPI cell above)
    expect(screen.getByText('بانتظار تقييمك', { selector: '.pf-section-title' })).toBeInTheDocument();
    expect(screen.getByText('رفضها الفحص التجريبي (محاكاة)')).toBeInTheDocument();
    expect(screen.getByText('مُقيَّمة — جاهزة للنشر')).toBeInTheDocument();

    // …the pending row's amber badge with the shared label…
    const pendingBadge = screen.getByText('بانتظار التقييم').closest('.badge');
    expect(pendingBadge?.className).toContain('amber');

    // …and the failed row is still selectable (the teacher can open the
    // workspace and read/write margin notes on a failed paper).
    fireEvent.click(queueRow(PAPER.title, 'بانتظار التقييم'));
    await screen.findByRole('heading', { name: PAPER.title });
    fireEvent.click(queueRow(PAPER.title, 'تعذّر اجتياز الفحص'));
    await screen.findByRole('heading', { name: PAPER.title });

    // The KPI strip counts all three states honestly (selector: the
    // label also appears on the failed row's badge — pick the stat
    // cell's own label).
    expect(screen.getByText('بانتظار تقييمك', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
    expect(screen.getByText('تعذّر اجتياز الفحص', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
    expect(screen.getByText('جاهزة للنشر', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
  });

  it('the workspace scan facts keep the simulation label (honesty badge, never real detection)', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    // «محاكاة» rides the workspace's scan cells next to the percentages.
    expect(screen.getByText('محاكاة')).toBeInTheDocument();
  });
});

/* ───────────────────────────────────────────────
 * r165b — the feedback textarea mirrors the backend's 4000-char cap.
 * gradePaperSchema (learning.routes.ts) pins feedback at
 * z.string().trim().max(4000); the textarea had NO maxLength, so a
 * full write-up POSTed past the client and failed with a misleading
 * connectivity error. The sibling GradeSubmissionModal caps the same
 * way (maxLength={2000} against its own backend limit) — this pins
 * the identical idiom at the research surface.
 * ─────────────────────────────────────────────── */
describe('ReviewWorkspace — feedback length cap (r165b)', () => {
  it('caps the notes textarea at the backend limit (maxlength=4000)', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    // The rendered attribute is the contract: the browser stops user
    // input at exactly the server's max, so no 4000+ draft can ever be
    // typed, POSTed, and rejected as a bogus «check your connection».
    const notes = screen.getByLabelText('ملاحظات للطالب') as HTMLTextAreaElement;
    expect(notes).toHaveAttribute('maxlength', '4000');
  });

  it('a saved feedback at exactly the cap loads verbatim (the cap governs input, not display)', async () => {
    mocks.queue.data = [{ ...GRADED_PAPER, feedback: 'ب'.repeat(4_000) }];
    renderPage();
    await selectPaper(GRADED_PAPER.title, 'مُقيَّم');

    const notes = screen.getByLabelText('ملاحظات للطالب') as HTMLTextAreaElement;
    expect(notes).toHaveValue('ب'.repeat(4_000));
    expect(notes).toHaveAttribute('maxlength', '4000');
  });
});

/* r304 — the split's triage grammar: the wait age rides every pending
 * row (priority reads without opening anything), and the review
 * document/feedback controls stay distinct (the reader link is its own
 * affordance beside the grade actions). */
describe('ResearchReviewPage — the split triage grammar (r304)', () => {
  it('pending rows carry the honest wait age; the workspace keeps document reading separate from grading', async () => {
    mocks.queue.data = [{ ...PAPER, fileUrl: '/files/papers/p1.pdf' }];
    renderPage();

    // The wait chip reads the same instant the annotations panel does
    // (timeAgoAr) — priority without a click. Scoped to the queue row's
    // wait chip («بانتظار …» also labels the section title + the badge).
    const chip = screen.getByText((_c, el) =>
      el instanceof HTMLElement
      && el.classList.contains('rs-wait')
      && (el.textContent ?? '').startsWith('بانتظار'));
    expect(chip).toBeInTheDocument();

    await selectPaper(PAPER.title, 'بانتظار التقييم');
    // Distinct controls: the grade verb vs the document verb.
    expect(screen.getByRole('button', { name: 'تأكيد التقييم' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /قراءة البحث وكتابة ملاحظات/ })).toBeInTheDocument();
    // The margin-notes territory exists (empty state, honest count).
    expect(screen.getByText(/ملاحظات على البحث/)).toBeInTheDocument();
    // The queue stays visible beside the workspace (the split).
    expect(queueRow(PAPER.title, 'بانتظار التقييم')).toBeInTheDocument();
  });
});
