/**
 * 12-10 — Exam taker + list resume behavior (WAVE-12 D5 contract).
 *
 * 1. restoreSavedAnswers: the D5 wire shape → taker form state (object,
 *    raw-number and raw-string values; empty text stays unanswered).
 * 2. A resumed start renders a LIVE exam — saved answers restored into
 *    radios / textareas, timer showing the true remaining time — never
 *    the "already taken" terminal UI.
 * 3. alreadyAttempted (GRADED / EXPIRED per D5) keeps the terminal UI.
 * 4. The countdown auto-submits exactly once at 00:00 (regression pin
 *    for the audit-verified double-submit guard).
 * 5. The countdown interval is not recreated on unrelated re-renders
 *    (audit 11-f P2-3 — the deps no longer include the finish mutation).
 * 6. A failed autosave surfaces the sticky warning chip and a
 *    successful save clears it (audit-verified-clean pin).
 * 7. List page: an IN_PROGRESS attempt stays resumable (linked card);
 *    GRADED attempts stay static history.
 * 8. The entry screen offers honest resume copy when the list already
 *    knows the attempt is live.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OnlineExamsPage, { ExamTakerPage, restoreSavedAnswers } from '../../src/pages/exams/OnlineExamsPages';

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
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyExams: () => ({
    data: mocks.exams,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useStartExam: () => ({ mutateAsync: mocks.start, isPending: false }),
  useSubmitAnswer: () => ({ mutateAsync: mocks.answer, isPending: false }),
  // Fresh object per render — exactly like the real useMutation result —
  // so the interval-deps assertion (P2-3) stays meaningful.
  useFinishExam: () => ({ mutateAsync: mocks.finish, isPending: false }),
  useExamModerationQueue: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useModerateExam: () => ({ mutateAsync: vi.fn() }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

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

describe('restoreSavedAnswers (D5 wire shape → form state)', () => {
  it('restores the raw values the backend actually sends (choiceIndex | answerText)', () => {
    expect(
      restoreSavedAnswers([
        { questionId: 'q1', value: 1 },
        { questionId: 'q2', value: 'الجواب المحفوظ' },
        { questionId: 'q3', value: 0 },
      ]),
    ).toEqual({
      q1: { choiceIndex: 1 },
      q2: { answerText: 'الجواب المحفوظ' },
      q3: { choiceIndex: 0 },
    });
  });

  it('also restores object values (defensive: { choiceIndex, answerText })', () => {
    expect(
      restoreSavedAnswers([
        { questionId: 'q1', value: { choiceIndex: 1 } },
        { questionId: 'q2', value: { answerText: 'الجواب المحفوظ' } },
      ]),
    ).toEqual({
      q1: { choiceIndex: 1 },
      q2: { answerText: 'الجواب المحفوظ' },
    });
  });

  it('skips null values and blank text so they keep counting as unanswered', () => {
    expect(
      restoreSavedAnswers([
        { questionId: 'q1', value: null },
        { questionId: 'q2', value: { choiceIndex: null, answerText: null } },
        { questionId: 'q3', value: '' },
        { questionId: 'q4', value: '   ' },
        { questionId: 'q5', value: { answerText: '   ' } },
      ]),
    ).toEqual({});
  });
});

describe('ExamTakerPage resume (D5)', () => {
  beforeEach(() => {
    mocks.exams = [];
    mocks.start.mockReset();
    mocks.finish.mockReset();
    mocks.answer.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a live resumed exam — answers + remaining time restored, never the terminal UI', async () => {
    vi.useFakeTimers();
    // 9:30 left of the original 30:00 — the deadline is NOT renewed.
    // Wire shape mirrors the backend D5 implementation exactly:
    // answers: [{ questionId, value: choiceIndex | answerText }].
    const expiresAt = new Date(Date.now() + 9 * 60_000 + 30_000).toISOString();
    mocks.start.mockResolvedValue(
      startedPayload({
        expiresAt,
        resumed: true,
        attempt: {
          id: 'a1',
          status: 'IN_PROGRESS',
          expiresAt,
          answers: [
            { questionId: 'q1', value: 1 },
            { questionId: 'q2', value: 'الإجابة المحفوظة' },
          ],
        },
      }),
    );

    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });

    // Live exam bar — not the entry prompt, not the terminal state.
    expect(screen.getByText('اختبار الشبكات', { selector: 'h1' })).toBeTruthy();
    expect(screen.queryByText('هل أنت مستعد للبدء؟')).toBeNull();
    expect(screen.queryByText('لقد أكملت هذا الاختبار مسبقاً')).toBeNull();

    // Saved answers restored into the form.
    expect(screen.getByRole('radio', { name: 'الخيار الثاني' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'الخيار الأول' })).not.toBeChecked();
    expect(screen.getByPlaceholderText('اكتب إجابتك هنا…')).toHaveValue('الإجابة المحفوظة');

    // Timer shows the true remaining time (09:30), not a fresh 30:00.
    expect(screen.getByText('09:30')).toBeTruthy();
  });

  it('keeps the terminal "already taken" UI for alreadyAttempted (GRADED / EXPIRED)', async () => {
    mocks.exams = [
      examFixture({
        myAttempt: { id: 'a1', status: 'GRADED', score: 80, maxScore: 100, submittedAt: '2026-01-02T00:00:00.000Z' },
      }),
    ];
    mocks.start.mockResolvedValue({ attemptId: 'a1', status: 'GRADED', alreadyAttempted: true });

    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });

    expect(screen.getByText('لقد أكملت هذا الاختبار مسبقاً')).toBeTruthy();
    expect(screen.getByText('80 / 100')).toBeTruthy();
    expect(screen.getByText('ناجح')).toBeTruthy();
    expect(screen.queryByPlaceholderText('اكتب إجابتك هنا…')).toBeNull();
  });

  it('auto-submits exactly once when the countdown reaches 00:00', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload({ expiresAt: new Date(Date.now() + 3_000).toISOString() }));
    mocks.finish.mockResolvedValue({ score: 3, maxScore: 10, status: 'GRADED', needsManual: 0, passed: false });

    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });
    expect(screen.getByText('00:03')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(mocks.finish).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2_000); // 00:00 → auto-submit fires
    });
    expect(mocks.finish).toHaveBeenCalledTimes(1);
    expect(mocks.finish).toHaveBeenCalledWith('a1');

    await act(async () => {
      vi.advanceTimersByTime(5_000); // further ticks must not re-submit
    });
    expect(mocks.finish).toHaveBeenCalledTimes(1);

    // The real result screen renders with the real score.
    expect(screen.getByText('الاختبار انتهى')).toBeTruthy();
    expect(screen.getByText('3 / 10')).toBeTruthy();
  });

  it('does not recreate the countdown interval on unrelated re-renders (P2-3)', async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    mocks.start.mockResolvedValue(startedPayload());

    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    // A re-render caused by an answer edit…
    fireEvent.change(screen.getByPlaceholderText('اكتب إجابتك هنا…'), { target: { value: 'جواب جزئي' } });
    // …and a re-render caused by a countdown tick.
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
  });

  it('surfaces a failed autosave and clears the chip once a save succeeds', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });

    mocks.answer.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الأول' }));
    });
    expect(screen.getByText('تعذَّر حفظ آخر إجابة — أعد تحديدها')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الثاني' }));
    });
    expect(screen.queryByText('تعذَّر حفظ آخر إجابة — أعد تحديدها')).toBeNull();
  });

  it('offers honest resume copy when the list already knows the attempt is live', () => {
    mocks.exams = [
      examFixture({
        myAttempt: { id: 'a1', status: 'IN_PROGRESS', score: null, maxScore: 10, submittedAt: null },
      }),
    ];

    renderTaker();

    expect(screen.getByRole('button', { name: 'متابعة الاختبار' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'بدء الاختبار' })).toBeNull();
    expect(screen.getByText('متابعة الاختبار', { selector: 'h2' })).toBeTruthy();
    expect(screen.getByText(/الوقت لم يتوقف منذ البدء/)).toBeTruthy();
  });
});

describe('OnlineExamsPage list (D5 reachability)', () => {
  beforeEach(() => {
    mocks.exams = [];
  });

  it('keeps an IN_PROGRESS attempt resumable — a linked card, not dead history', () => {
    mocks.exams = [
      examFixture({ id: 'fresh', title: 'اختبار جديد' }),
      examFixture({
        id: 'live',
        title: 'اختبار قيد الأداء',
        myAttempt: { id: 'a-live', status: 'IN_PROGRESS', score: null, maxScore: 10, submittedAt: null },
      }),
      examFixture({
        id: 'done',
        title: 'اختبار منتهٍ',
        myAttempt: { id: 'a-done', status: 'GRADED', score: 8, maxScore: 10, submittedAt: '2026-01-02T00:00:00.000Z' },
      }),
    ];

    render(
      <MemoryRouter>
        <OnlineExamsPage />
      </MemoryRouter>,
    );

    // The live attempt links into the taker (the resume path back from
    // a mid-exam reload)…
    const liveCard = screen.getByRole('link', { name: /محاولة قيد التقدم/ });
    expect(liveCard.getAttribute('href')).toBe('/student/online-exams/live');

    // …the graded attempt stays a static history card, and an
    // untouched exam links exactly as before.
    expect(screen.queryByRole('link', { name: /اختبار منتهٍ/ })).toBeNull();
    expect(screen.getByRole('link', { name: /اختبار جديد/ })).toBeTruthy();
    expect(screen.getByText('اختبار منتهٍ')).toBeTruthy();
  });
});
