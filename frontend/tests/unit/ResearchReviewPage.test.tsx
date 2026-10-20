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
 *
 * r157 / 6A8 additions — the publish loop's missing half: GRADED papers
 * render in their own queue card (purple tone + «نشر في المكتبة» CTA)
 * and the review modal is form-wrapped (Enter submits the grade; in
 * GRADED mode Enter no-ops BY DESIGN — publishing is an explicit
 * footer action, never an implicit submit away from the public archive).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

/* r157 / 6A8 — a graded paper riding the queue (RESEARCH_QUEUE_STATUSES
 * includes GRADED now): the publish loop's reachable target. */
const GRADED_PAPER = {
  ...PAPER,
  id: 'p2',
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

/* ── r157 / 6A8 — GRADED rides the queue; the publish loop is reachable ── */
describe('ResearchReviewPage — the GRADED queue card (r157 / 6A8)', () => {
  it('a GRADED paper renders the «مُقيَّمة — جاهزة للنشر» card with the purple badge, the publish CTA and an honest KPI', () => {
    mocks.queue.data = [GRADED_PAPER];
    renderPage();

    // The card (label per the queue grammar)…
    expect(screen.getByText('مُقيَّمة — جاهزة للنشر')).toBeInTheDocument();
    // …the purple status badge…
    const badge = screen.getByText('مُقيَّم').closest('.badge');
    expect(badge).not.toBeNull();
    // …the row CTA that makes publishing reachable…
    expect(screen.getByRole('button', { name: 'نشر في المكتبة' })).toBeInTheDocument();
    // …and the KPI finally counts something (the queue used to exclude
    // GRADED, so «جاهزة للنشر» was forever 0). R190 D-2 re-pin: the KPI
    // trio is the ledger stat strip now (mono .stat-label over
    // .stat-value inside .stat-cell) — the icon-card .metric tile it
    // pinned was the retired template anatomy.
    expect(screen.getByText('جاهزة للنشر', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
    // The score travels on the row: «الدرجة: 17 / 20» (the numbers ride
    // <bdi> children — match the whole meta span).
    expect(
      screen.getByText((_c, el) =>
        el instanceof HTMLElement
        && (el.textContent ?? '').replace(/\s+/g, ' ').trim() === 'الدرجة: 17 / 20'),
    ).toBeInTheDocument();
  });

  it('the row CTA opens the review modal in graded mode — score read-only, publish explicit', () => {
    mocks.queue.data = [GRADED_PAPER];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'نشر في المكتبة' }));
    const dialog = screen.getByRole('dialog', { name: 'مراجعة بحث' });
    expect(dialog).toBeInTheDocument();

    // Graded mode: the score box is disabled (read-only)…
    expect(screen.getByLabelText('الدرجة (من 20)')).toBeDisabled();
    // …the grade submit button is gone…
    expect(screen.queryByRole('button', { name: 'تأكيد التقييم' })).toBeNull();
    // …and the modal's own explicit publish action is present (scoped to
    // the dialog — the ROW CTA shares the name by design).
    expect(within(dialog).getByRole('button', { name: 'نشر في المكتبة' })).toBeInTheDocument();
  });
});

/* ── r157 / 6A9 — the review modal's form contract ── */
describe('ReviewModal — form contract (r157 / 6A9)', () => {
  it('the fields live inside a real form — a submit event saves the grade (Enter)', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'مراجعة وتقييم' }));

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
    fireEvent.click(screen.getByRole('button', { name: 'نشر في المكتبة' }));
    await screen.findByRole('dialog', { name: 'مراجعة بحث' });

    const form = screen.getByLabelText('الدرجة (من 20)').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    // Enter in graded mode fires NOTHING — neither a re-grade…
    expect(mocks.grade.mutateAsync).not.toHaveBeenCalled();
    // …nor a publish to the public archive (the explicit footer button
    // is the only path).
    expect(mocks.publish.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'مراجعة بحث' })).toBeInTheDocument();
  });
});

describe('ReviewModal — FormField migration (23-b, 21-b hand-off)', () => {
  it('keeps the three review fields label-wired through the shared primitive', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await openModal();

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

/* ───────────────────────────────────────────────
 * r164f — review-loop state coherence pins. The queue (backend
 * RESEARCH_QUEUE_STATUSES) carries exactly three states and the page
 * renders each in its own card with a live action — nothing rides the
 * queue invisibly, no state renders without its affordance:
 *   · CHECKS_PASSED → «قائمة المراجعة» + amber «بانتظار التقييم» + the
 *     review CTA that opens the grading modal;
 *   · CHECKS_FAILED → the honest «رفضها الفحص التجريبي (محاكاة)» card
 *     (simulation label intact) + a reviewable row (annotations stay
 *     reachable even for a failed paper);
 *   · GRADED → the r157 publish card (pinned above).
 * The KPI strip must reflect all three counts, never a masked 0.
 * ─────────────────────────────────────────────── */
describe('ResearchReviewPage — queue state coherence (r164f)', () => {
  it('every queue state renders in its own card with a live action — nothing hidden', async () => {
    mocks.queue.data = [
      PAPER,                                  // CHECKS_PASSED
      { ...PAPER, id: 'p3', status: 'CHECKS_FAILED', plagiarismPct: 31.2, aiContentPct: 40 },
      GRADED_PAPER,                           // GRADED
    ];
    renderPage();

    // The three cards, one per state…
    expect(screen.getByText('قائمة المراجعة')).toBeInTheDocument();
    expect(screen.getByText('رفضها الفحص التجريبي (محاكاة)')).toBeInTheDocument();
    expect(screen.getByText('مُقيَّمة — جاهزة للنشر')).toBeInTheDocument();

    // …the pending row's amber badge with the shared label…
    const pendingBadge = screen.getByText('بانتظار التقييم').closest('.badge');
    expect(pendingBadge?.className).toContain('amber');

    // …and the failed row still carries its review CTA (the teacher can
    // open the modal and read/write margin notes on a failed paper).
    const failedCtas = await screen.findAllByRole('button', { name: 'مراجعة وتقييم' });
    expect(failedCtas).toHaveLength(2); // the pending row + the failed row

    // The KPI strip counts all three states honestly (selector: the
    // label also appears on the failed row's badge — pick the stat
    // cell's own label). R190 D-2 re-pin: .stat-strip anatomy.
    expect(screen.getByText('بانتظار تقييمك', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
    expect(screen.getByText('تعذّر اجتياز الفحص', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
    expect(screen.getByText('جاهزة للنشر', { selector: '.pf-stat-label' }).closest('.pf-stat')).toHaveTextContent('1');
  });

  it('the pending row scan meta keeps the simulation label (honesty badge, never real detection)', () => {
    mocks.queue.data = [PAPER];
    renderPage();

    // «محاكاة» rides the row meta next to the percentages.
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
describe('ReviewModal — feedback length cap (r165b)', () => {
  it('caps the notes textarea at the backend limit (maxlength=4000)', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await openModal();

    // The rendered attribute is the contract: the browser stops user
    // input at exactly the server's max, so no 4000+ draft can ever be
    // typed, POSTed, and rejected as a bogus «check your connection».
    const notes = screen.getByLabelText('ملاحظات للطالب') as HTMLTextAreaElement;
    expect(notes).toHaveAttribute('maxlength', '4000');
  });

  it('a saved feedback at exactly the cap loads verbatim (the cap governs input, not display)', async () => {
    mocks.queue.data = [{ ...GRADED_PAPER, feedback: 'ب'.repeat(4_000) }];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'نشر في المكتبة' }));
    await screen.findByRole('dialog', { name: 'مراجعة بحث' });

    const notes = screen.getByLabelText('ملاحظات للطالب') as HTMLTextAreaElement;
    expect(notes).toHaveValue('ب'.repeat(4_000));
    expect(notes).toHaveAttribute('maxlength', '4000');
  });
});
