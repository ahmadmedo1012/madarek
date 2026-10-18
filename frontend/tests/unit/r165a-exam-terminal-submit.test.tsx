/**
 * r165a — a terminal submit answer must never leave a zombie exam.
 *
 * The audited defect: when the (auto-)submit request hit an attempt the
 * backend had already closed — expired while the tab was hidden (403
 * «انتهى وقت هذه المحاولة») or already submitted elsewhere (409 «تم
 * تسليم هذه المحاولة مسبقاً») — submitAttempt's catch only painted the
 * error: the attempt stayed mounted with the timer frozen at 00:00,
 * questions still editable, beforeunload still armed, and the
 * active-attempt screen had NO exit. Retrying earned the factually
 * wrong «تم تسليم مسبقاً» for an EXPIRED attempt.
 *
 * Pins:
 *   1. isTerminalSubmitError branches — the submit route's two exact
 *      terminal wire truths vs network faults / server 5xx / other
 *      backend answers (the answer-route's «انتهت هذه المحاولة», the
 *      ownership forbidden) vs malformed payloads.
 *   2. A terminal auto-submit at 00:00 tears the zombie down (interval
 *      + beforeunload retired, questions unmounted), re-reads the
 *      exams list, and lands the honest expired end screen with its
 *      «العودة للقائمة» exit.
 *   3. A terminal 409 on a manual submit settles on the done state
 *      speaking the refetched SUBMITTED truth (provisional score +
 *      awaiting chip), never the zombie.
 *   4. A network error keeps the honest retry path exactly as before
 *      (attempt stays mounted, error painted, no list refetch) — and
 *      the live error state now carries the «كل الاختبارات» exit link
 *      the rest of the flow always had.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExamTakerPage, isTerminalSubmitError } from '../../src/pages/exams/OnlineExamsPages';

interface AttemptFixture {
  id: string;
  status: string;
  score: number | null;
  maxScore: number;
  submittedAt: string | null;
}
interface ExamFixture {
  id: string;
  title: string;
  kind: string;
  durationMin: number;
  questionCount: number;
  passingScore: number;
  openAt: string | null;
  closeAt: string | null;
  courseName: string | null;
  courseIcon: string | null;
  facultyName: string | null;
  myAttempt: AttemptFixture | null;
}

const mocks = vi.hoisted(() => ({
  exams: [] as ExamFixture[],
  start: vi.fn(),
  finish: vi.fn(),
  answer: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyExams: () => ({
    data: mocks.exams,
    isPending: false,
    isError: false,
    error: null,
    refetch: mocks.refetch,
  }),
  useStartExam: () => ({ mutateAsync: mocks.start, isPending: false }),
  useSubmitAnswer: () => ({ mutateAsync: mocks.answer, isPending: false }),
  useFinishExam: () => ({ mutateAsync: mocks.finish, isPending: false }),
  useExamReview: () => ({ data: null, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useExamModerationQueue: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useModerateExam: () => ({ mutateAsync: vi.fn() }),
  useExamTemplate: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

/** An axios-shaped rejection carrying the backend's error envelope
 *  ({ error: { code, message } }) — the shape apiErrorDetailRaw reads. */
function wireError(message: string, status: number): unknown {
  return { response: { status, data: { error: { code: 'CODE', message } } } };
}

function examFixture(over: Partial<ExamFixture> = {}): ExamFixture {
  return {
    id: 'e1',
    title: 'اختبار الشبكات',
    kind: 'QUIZ',
    durationMin: 30,
    questionCount: 2,
    passingScore: 50,
    openAt: null,
    closeAt: null,
    courseName: 'شبكات الحاسوب',
    courseIcon: null,
    facultyName: null,
    myAttempt: null,
    ...over,
  };
}

function startedPayload(over: Record<string, unknown> = {}) {
  return {
    attemptId: 'a1',
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    durationMin: 30,
    title: 'اختبار الشبكات',
    questions: [
      { id: 'q1', type: 'MCQ', prompt: 'سؤال اختيار من متعدد', choices: ['الخيار الأول', 'الخيار الثاني'], points: 5 },
      { id: 'q2', type: 'SHORT', prompt: 'سؤال قصير', choices: null, points: 5 },
    ],
    ...over,
  };
}

function renderTaker(examId = 'e1') {
  return render(
    <MemoryRouter initialEntries={[`/student/online-exams/${examId}`]}>
      <Routes>
        <Route path="/student/online-exams/:id" element={<ExamTakerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/* ── 1. isTerminalSubmitError — the decision logic ────────────── */

describe('isTerminalSubmitError (r165a)', () => {
  it('the submit route\'s two terminal wire truths are terminal', () => {
    // 409: the attempt left IN_PROGRESS (already submitted/graded, or a
    // concurrent submit won the claim) — a retry can never change that.
    expect(isTerminalSubmitError(wireError('تم تسليم هذه المحاولة مسبقاً', 409))).toBe(true);
    // 403: the 60s grace passed, the server flipped the attempt to
    // EXPIRED — it will never accept an answer again.
    expect(isTerminalSubmitError(wireError('انتهى وقت هذه المحاولة', 403))).toBe(true);
  });

  it('network faults and server 5xx stay on the honest retry path', () => {
    expect(isTerminalSubmitError(new Error('offline'))).toBe(false);
    expect(isTerminalSubmitError(wireError('خطأ داخلي في الخادم', 500))).toBe(false);
  });

  it('other backend answers never masquerade as terminal', () => {
    // Ownership forbidden (submit route, default AppError message).
    expect(isTerminalSubmitError(wireError('لا تملك صلاحية تنفيذ هذا الإجراء', 403))).toBe(false);
    // The ANSWER route's expiry message — a different string from a
    // different endpoint; the submit-side helper must not borrow it.
    expect(isTerminalSubmitError(wireError('انتهت هذه المحاولة', 403))).toBe(false);
  });

  it('a malformed or empty payload never trips the terminal path', () => {
    expect(isTerminalSubmitError(null)).toBe(false);
    expect(isTerminalSubmitError(undefined)).toBe(false);
    expect(isTerminalSubmitError({ response: { data: {} } })).toBe(false);
  });
});

/* ── 2-4. ExamTakerPage — zombie teardown vs honest retry ─────── */

describe('ExamTakerPage terminal submit answers (r165a)', () => {
  beforeEach(() => {
    mocks.exams = [];
    mocks.start.mockReset();
    mocks.finish.mockReset();
    mocks.answer.mockReset();
    mocks.refetch.mockReset();
    mocks.refetch.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function startExam() {
    renderTaker();
    await act(async () => {
      // «متابعة الاختبار» when the stale list already knows the
      // attempt is live, «بدء الاختبار» on a plain deep link.
      fireEvent.click(screen.getByRole('button', { name: /^(?:متابعة الاختبار|بدء الاختبار)$/ }));
    });
  }

  async function confirmSubmit() {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تسليم الاختبار' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تسليم نهائي' }));
    });
  }

  it('an attempt that expired while the tab was away ends on the honest expired screen — no zombie', async () => {
    vi.useFakeTimers();
    // The stale list still says IN_PROGRESS — the resume truth at start
    // time (the expiry happened while the tab was hidden).
    mocks.exams = [examFixture({
      myAttempt: { id: 'a1', status: 'IN_PROGRESS', score: null, maxScore: 10, submittedAt: null },
    })];
    mocks.start.mockResolvedValue(startedPayload({ expiresAt: new Date(Date.now() + 3_000).toISOString() }));
    // The terminal answer: the backend flipped the attempt to EXPIRED
    // (the 60s grace passed). The list re-read lands that truth.
    mocks.finish.mockRejectedValue(wireError('انتهى وقت هذه المحاولة', 403));
    mocks.refetch.mockImplementation(() => {
      mocks.exams = [examFixture({
        myAttempt: { id: 'a1', status: 'EXPIRED', score: null, maxScore: 10, submittedAt: null },
      })];
      return Promise.resolve(undefined);
    });
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    await startExam();
    expect(screen.getByText('سؤال اختيار من متعدد')).toBeTruthy();

    // 00:00 while the tab was away → the auto-submit finds the attempt
    // already closed server-side.
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });

    // The zombie is torn down: the questions unmount, the countdown
    // interval and the beforeunload warning retire with the attempt.
    expect(screen.queryByText('سؤال اختيار من متعدد')).toBeNull();
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    // The honest expired end screen — re-read from the server, with
    // its exit; one submit, no retry storm on a dead attempt.
    expect(mocks.finish).toHaveBeenCalledTimes(1);
    expect(mocks.refetch).toHaveBeenCalled();
    expect(screen.getByText('انتهت مدة هذه المحاولة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'العودة للقائمة' })).toBeTruthy();

    clearIntervalSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });

  it('a 409 already-submitted answer settles on the done state speaking the refetched truth', async () => {
    vi.useFakeTimers();
    // Deep-link start: the list knows nothing yet (no pre-empt).
    mocks.exams = [];
    mocks.start.mockResolvedValue(startedPayload());
    // The attempt was submitted on another tab/device — this submit
    // loses the IN_PROGRESS claim. The list re-read lands the real
    // SUBMITTED state with its provisional score.
    mocks.finish.mockRejectedValue(wireError('تم تسليم هذه المحاولة مسبقاً', 409));
    mocks.refetch.mockImplementation(() => {
      mocks.exams = [examFixture({
        myAttempt: { id: 'a1', status: 'SUBMITTED', score: 7, maxScore: 10, submittedAt: '2026-01-01T00:00:00.000Z' },
      })];
      return Promise.resolve(undefined);
    });

    await startExam();
    await confirmSubmit();

    expect(mocks.finish).toHaveBeenCalledTimes(1);
    expect(mocks.refetch).toHaveBeenCalled();
    // The done screen with the real provisional score, the neutral
    // awaiting chip, and the exit — never the zombie.
    expect(screen.getByText('لقد أكملت هذا الاختبار مسبقاً')).toBeTruthy();
    expect(screen.getByText('بانتظار التصحيح اليدوي')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'العودة للقائمة' })).toBeTruthy();
    expect(screen.queryByText('سؤال اختيار من متعدد')).toBeNull();
  });

  it('a network failure keeps the live retry path — and now offers the way out', async () => {
    vi.useFakeTimers();
    mocks.exams = [];
    mocks.start.mockResolvedValue(startedPayload());
    mocks.finish.mockRejectedValueOnce(new Error('offline'));

    await startExam();
    await confirmSubmit();

    // The honest error paints and the attempt STAYS mounted — a
    // network fault is retryable, only terminal answers settle it.
    expect(screen.getByText('تعذَّر تسليم الاختبار — حاول مرة أخرى.')).toBeTruthy();
    expect(screen.getByText('سؤال اختيار من متعدد')).toBeTruthy();
    // No list re-read was forced (nothing changed server-side).
    expect(mocks.refetch).not.toHaveBeenCalled();
    // r165a: the one live screen that had no exit now carries the same
    // back-link every other screen of this flow has — «العودة إلى X»
    // grammar since r183-B6 (A4 P3-6, the three back-link text rules).
    expect(screen.getByRole('link', { name: 'العودة إلى الاختبارات' })).toBeTruthy();

    // The retry succeeds → the real result screen.
    mocks.finish.mockResolvedValueOnce({ score: 8, maxScore: 10, status: 'GRADED', needsManual: 0, passed: true });
    await confirmSubmit();
    expect(mocks.finish).toHaveBeenCalledTimes(2);
    expect(screen.getByText('مبروك — لقد اجتزت الاختبار!')).toBeTruthy();
  });
});
