/**
 * 12-10 / 16-E1 — Exam taker + list behavior.
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
 *    successful save of that question clears it (audit-verified-clean
 *    pin, updated for the 16-E1 per-question copy).
 * 7. List page: an IN_PROGRESS attempt stays resumable (linked card);
 *    GRADED attempts stay static history.
 * 8. The entry screen offers honest resume copy when the list already
 *    knows the attempt is live.
 * 9. 16-E1 / 15-e P0-1: submit flushes in-flight answer saves before
 *    finishing — and stops waiting after SUBMIT_FLUSH_MS so a hung
 *    save cannot block the submit.
 * 10. 16-E1 / 15-e P0-2: a manual submit settles the attempt — the
 *     interval and beforeunload listener retire with it and the
 *     deadline passing on the result screen never re-fires finish.
 * 11. 16-E1 / 15-e P1-1: save failures are tracked per question — a
 *     success on another question never clears the failing one's chip.
 * 12. 16-E1 / 15-c P1-1: passed === null renders the neutral
 *     «بانتظار التصحيح اليدوي» badge, never «لم يجتز».
 * 13. 5-A6 P2-2: the question map — answered/failed dots, answered
 *     subline, inline submit count, jump-to-card + focus, and the
 *     IntersectionObserver-tracked current-position ring.
 * 14. 5-A6 P2-4 → 5-D3 (5-B3 hand-off #1): the review endpoint ships —
 *     a GRADED result/deep-link offers the collapsible «مراجعة الأسئلة»
 *     (my answer, released key, verdict chips); a SUBMITTED result keeps
 *     the honest «بعد اكتمال التصحيح» promise instead of a dead toggle.
 * 13. 16-E1 / 15-g P1-5: the answer textarea and the MCQ choice group
 *     carry accessible names tied to the question prompt.
 * 14. 16-E1 / 15-h P1-5: exam windows are visible — the list groups
 *     open / not-yet-open / closed exams, the cards carry window chips,
 *     and the start path speaks the backend's Arabic window guards
 *     (17-b D17-3) with the real opening date when the list knows it.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OnlineExamsPage, {
  ExamTakerPage, restoreSavedAnswers, examWindowState, SUBMIT_FLUSH_MS,
} from '../../src/pages/exams/OnlineExamsPages';

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
  review: { data: null as unknown, isPending: false, isError: false, error: null, refetch: vi.fn() },
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
  // 5-D3 (5-B3 hand-off #1): the post-grading review read — a fresh
  // object per render, mirroring the real useQuery result shape.
  useExamReview: (_attemptId: string, _enabled: boolean) => ({ ...mocks.review }),
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

  it('pre-empts the done state from the list payload — no false «بدء الاختبار» offered (5-A6 P1-1)', () => {
    mocks.exams = [
      examFixture({
        myAttempt: { id: 'a1', status: 'GRADED', score: 80, maxScore: 100, submittedAt: '2026-01-02T00:00:00.000Z' },
      }),
    ];

    renderTaker();

    // The honest terminal screen renders immediately — the list payload
    // already knows the attempt is finished, so no begin action is ever
    // offered for the server to refuse.
    expect(screen.getByText('لقد أكملت هذا الاختبار مسبقاً')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'بدء الاختبار' })).toBeNull();
    expect(screen.getByText('80 / 100')).toBeTruthy();
    expect(screen.getByText('ناجح')).toBeTruthy();
    expect(screen.queryByPlaceholderText('اكتب إجابتك هنا…')).toBeNull();
  });

  it('pre-empts a SUBMITTED attempt with the awaiting-grading copy, never a fake score', () => {
    mocks.exams = [
      examFixture({
        myAttempt: { id: 'a2', status: 'SUBMITTED', score: null, maxScore: 10, submittedAt: '2026-01-02T00:00:00.000Z' },
      }),
    ];

    renderTaker();

    expect(screen.getByText('لقد أكملت هذا الاختبار مسبقاً')).toBeTruthy();
    expect(screen.getByText(/النتيجة قيد الاحتساب/)).toBeTruthy();
    // No fabricated score while the teacher's grading pends.
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull();
  });

  it('keeps the terminal "already taken" UI for a server-side alreadyAttempted the list could not pre-empt', async () => {
    // Deep link the list knows nothing about (fresh cache / other
    // template) — the begin path still surfaces the server truth.
    mocks.exams = [];
    mocks.start.mockResolvedValue({ attemptId: 'a1', status: 'GRADED', alreadyAttempted: true });

    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });

    expect(screen.getByText('لقد أكملت هذا الاختبار مسبقاً')).toBeTruthy();
    expect(screen.getByText(/لا يمكن إعادة المحاولة بعد التسليم/)).toBeTruthy();
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

  it('surfaces a failed autosave and clears the chip once that question saves again', async () => {
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
    expect(screen.getByText('تعذَّر حفظ إجابة السؤال 1 — أعد الإجابة عليه')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الثاني' }));
    });
    expect(screen.queryByText(/تعذَّر حفظ/)).toBeNull();
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

describe('Exam taker ergonomics (5-A6 P2-2/P2-3)', () => {
  beforeEach(() => {
    mocks.exams = [];
    mocks.start.mockReset();
    mocks.finish.mockReset();
    mocks.answer.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the question map with live answered states, the answered subline and the inline submit count', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });

    // One dot per question, all initially unanswered.
    const map = screen.getByRole('navigation', { name: 'خريطة الأسئلة' });
    expect(within(map).getAllByRole('button')).toHaveLength(2);
    expect(within(map).getByRole('button', { name: 'السؤال 1 من 2 — بدون إجابة' })).toBeTruthy();
    expect(within(map).getByRole('button', { name: 'السؤال 2 من 2 — بدون إجابة' })).toBeTruthy();
    expect(screen.getByText(/سؤال · أُجيب عن/)).toBeTruthy();

    // Answer Q1 → its dot flips to answered, the count follows, the
    // positive save micro-state appears at Q1's footer (P2-3) and the
    // submit status names what is still missing inline (P2-2).
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الأول' }));
    });
    expect(within(map).getByRole('button', { name: 'السؤال 1 من 2 — مُجاب' })).toBeTruthy();
    expect(within(map).getByRole('button', { name: 'السؤال 2 من 2 — بدون إجابة' })).toBeTruthy();
    expect(screen.getByText('محفوظة')).toBeTruthy();
    expect(screen.getByText('سؤال واحد بدون إجابة')).toBeTruthy();
  });

  it('jumps from the map — scrollIntoView lands on the card and focus moves with it', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    // jsdom ships no scrollIntoView — stub the browser API (not app code).
    const proto = Element.prototype as Element & { scrollIntoView?: (o?: object) => void };
    const scrollIntoView = vi.fn();
    proto.scrollIntoView = scrollIntoView;
    try {
      renderTaker();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
      });

      fireEvent.click(screen.getByRole('button', { name: 'السؤال 2 من 2 — بدون إجابة' }));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(document.activeElement?.id).toBe('exam-q-q2');
    } finally {
      delete proto.scrollIntoView;
    }
  });

  it('marks the save-failed question in the map dot and at its card footer', async () => {
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
    // Footer chip at the point of action (P2-3)…
    expect(screen.getByText('تعذَّر الحفظ')).toBeTruthy();
    // …and the map dot names the failure (P2-2).
    expect(screen.getByRole('button', { name: 'السؤال 1 من 2 — تعذَّر الحفظ' })).toBeTruthy();
  });

  it('rings the map dot of the question on screen and retires it on unmount (5-A6 P2-2)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());

    // jsdom ships no IntersectionObserver — stub the browser API (not app
    // code) and capture the callback so the test can act as the scroller.
    const disconnect = vi.fn();
    const instances: Array<IntersectionObserverCallback> = [];
    class IntersectionObserverStub {
      constructor(cb: IntersectionObserverCallback) {
        instances.push(cb);
      }
      observe() {}
      disconnect() { disconnect(); }
    }
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
    try {
      renderTaker();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
      });
      expect(instances).toHaveLength(1);

      // The observer is only the trigger — the decision reads live card
      // rects. Q1 scrolled out above the band, Q2's header inside it.
      const q1 = document.getElementById('exam-q-q1');
      const q2 = document.getElementById('exam-q-q2');
      expect(q1 && q2).toBeTruthy();
      const rect = (top: number, bottom: number) => ({
        top, bottom, left: 0, right: 390, width: 390, height: bottom - top, x: 0, y: top,
        toJSON: () => ({}),
      }) as DOMRect;
      (q1 as HTMLElement).getBoundingClientRect = () => rect(-400, -200);
      (q2 as HTMLElement).getBoundingClientRect = () => rect(200, 500);
      await act(async () => {
        instances[0]([] as IntersectionObserverEntry[], {} as IntersectionObserver);
      });

      const dot2 = screen.getByRole('button', { name: 'السؤال 2 من 2 — بدون إجابة' });
      expect(dot2.getAttribute('aria-current')).toBe('true');
      expect(dot2.className).toContain('current');
      const dot1 = screen.getByRole('button', { name: 'السؤال 1 من 2 — بدون إجابة' });
      expect(dot1.getAttribute('aria-current')).toBeNull();
      expect(dot1.className).not.toContain('current');
    } finally {
      vi.unstubAllGlobals();
    }
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

describe('ExamTakerPage submit & autosave integrity (16-E1)', () => {
  beforeEach(() => {
    mocks.exams = [];
    mocks.start.mockReset();
    mocks.finish.mockReset();
    mocks.answer.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function startExam() {
    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
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

  it('submit awaits in-flight answer saves before finishing (15-e P0-1)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    mocks.finish.mockResolvedValue({ score: 7, maxScore: 10, status: 'GRADED', needsManual: 0, passed: true });

    await startExam();

    // An answer save that never settles on its own (hung mobile network).
    let settle: (() => void) | undefined;
    mocks.answer.mockImplementation(
      () => new Promise<void>((resolve) => { settle = resolve; }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الأول' }));
    });
    expect(settle).toBeDefined();

    // Manual submit through the confirm dialog: the finish request must
    // NOT fire while the answer save is still in flight.
    await confirmSubmit();
    expect(mocks.finish).not.toHaveBeenCalled();

    // The save settles → the finish fires strictly after it.
    await act(async () => {
      settle!();
    });
    expect(mocks.finish).toHaveBeenCalledTimes(1);
    expect(mocks.finish).toHaveBeenCalledWith('a1');
    expect(screen.getByText('مبروك — لقد اجتزت الاختبار!')).toBeTruthy();
  });

  it('submit stops waiting for a hung save after the flush timeout (15-e P0-1)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    mocks.finish.mockResolvedValue({ score: 7, maxScore: 10, status: 'GRADED', needsManual: 0, passed: true });

    await startExam();

    // A save that never settles at all.
    mocks.answer.mockImplementation(() => new Promise<void>(() => {}));
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الأول' }));
    });

    await confirmSubmit();
    expect(mocks.finish).not.toHaveBeenCalled();

    // The bounded flush gives up after SUBMIT_FLUSH_MS and finishes.
    await act(async () => {
      vi.advanceTimersByTime(SUBMIT_FLUSH_MS);
    });
    expect(mocks.finish).toHaveBeenCalledTimes(1);
    expect(mocks.finish).toHaveBeenCalledWith('a1');
  });

  it('a manual submit settles the attempt — no second finish, timer + beforeunload torn down (15-e P0-2)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    mocks.finish.mockResolvedValue({ score: 8, maxScore: 10, status: 'GRADED', needsManual: 0, passed: true });
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    await startExam();
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    await confirmSubmit();
    expect(mocks.finish).toHaveBeenCalledTimes(1);
    expect(screen.getByText('مبروك — لقد اجتزت الاختبار!')).toBeTruthy();

    // The countdown interval and the beforeunload listener retired with
    // the attempt…
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(removeListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    // …so the deadline passing while the student reads the result can
    // never re-fire finish.
    await act(async () => {
      vi.advanceTimersByTime(31 * 60_000);
    });
    expect(mocks.finish).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });

  it('tracks save failures per question — a success elsewhere never clears the chip (15-e P1-1)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());

    await startExam();

    // Q1 (MCQ) fails to save.
    mocks.answer.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الأول' }));
    });
    expect(screen.getByText('تعذَّر حفظ إجابة السؤال 1 — أعد الإجابة عليه')).toBeTruthy();

    // Q2 (short answer) saves fine — Q1's failure must persist.
    await act(async () => {
      fireEvent.blur(screen.getByPlaceholderText('اكتب إجابتك هنا…'));
    });
    expect(screen.getByText('تعذَّر حفظ إجابة السؤال 1 — أعد الإجابة عليه')).toBeTruthy();

    // Re-answering Q1 succeeds — now the chip clears.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'الخيار الثاني' }));
    });
    expect(screen.queryByText(/تعذَّر حفظ/)).toBeNull();
  });

  it('renders the neutral awaiting-manual-grading badge when passed is null (15-c P1-1)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload({ expiresAt: new Date(Date.now() + 3_000).toISOString() }));
    mocks.finish.mockResolvedValue({ score: 4, maxScore: 10, status: 'SUBMITTED', needsManual: 2, passed: null });

    await startExam();
    await act(async () => {
      vi.advanceTimersByTime(5_000); // 00:00 → auto-submit fires
    });
    expect(mocks.finish).toHaveBeenCalledTimes(1);

    expect(screen.getByText('تم تسليم اختبارك')).toBeTruthy();
    expect(screen.getByText('بانتظار التصحيح اليدوي')).toBeTruthy();
    expect(screen.queryByText('لم يجتز')).toBeNull();
    expect(screen.queryByText('ناجح')).toBeNull();
  });

  it('offers the per-question review on a GRADED result — a toggle, then my answer + the released key (5-D3 / 5-B3 hand-off #1)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    mocks.finish.mockResolvedValue({ score: 7, maxScore: 10, status: 'GRADED', needsManual: 0, passed: true });
    mocks.review = {
      data: {
        attemptId: 'a1',
        templateTitle: 'اختبار الشبكات',
        score: 7,
        maxScore: 10,
        submittedAt: '2026-06-01T09:40:00.000Z',
        questions: [
          {
            questionId: 'q1', type: 'MCQ', prompt: 'سؤال اختيار من متعدد',
            choices: ['الخيار الأول', 'الخيار الثاني'], points: 5,
            myChoiceIndex: 0, myAnswerText: null, isCorrect: false, awardedPoints: 0, feedback: null,
            correctAnswer: 1,
          },
          {
            questionId: 'q2', type: 'SHORT', prompt: 'سؤال قصير',
            choices: null, points: 5,
            myChoiceIndex: null, myAnswerText: 'جوابي', isCorrect: true, awardedPoints: 5, feedback: null,
            correctAnswer: 'الجواب النموذجي',
          },
        ],
      },
      isPending: false, isError: false, error: null, refetch: vi.fn(),
    };

    await startExam();
    await confirmSubmit();

    expect(screen.getByText('مبروك — لقد اجتزت الاختبار!')).toBeTruthy();
    // Collapsed by default — the verdict stays the moment.
    const toggle = screen.getByRole('button', { name: 'مراجعة الأسئلة' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // My wrong MCQ pick, its released key, and the SHORT model answer.
    expect(screen.getByText('خاطئة')).toBeTruthy();
    expect(screen.getByText('الخيار الأول')).toBeTruthy();
    expect(screen.getByText('الخيار الثاني')).toBeTruthy();
    expect(screen.getByText('جوابي')).toBeTruthy();
    expect(screen.getByText('الجواب النموذجي')).toBeTruthy();
  });

  it('keeps the honest awaiting-note while manual grading pends — no dead review toggle (5-D3)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());
    mocks.finish.mockResolvedValue({ score: 4, maxScore: 10, status: 'SUBMITTED', needsManual: 2, passed: null });

    await startExam();
    await act(async () => {
      vi.advanceTimersByTime(30 * 60_000 + 5_000); // 00:00 → auto-submit
    });

    expect(screen.getByText('بانتظار التصحيح اليدوي')).toBeTruthy();
    expect(screen.getByText('ستتمكّن من مراجعة أسئلتك بعد اكتمال التصحيح اليدوي.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'مراجعة الأسئلة' })).toBeNull();
  });

  it('deep-link done-state on a GRADED attempt offers the same review toggle (5-D3)', async () => {
    mocks.exams = [examFixture({
      myAttempt: { id: 'att-done', status: 'GRADED', score: 7, maxScore: 10, submittedAt: '2026-06-01T09:40:00.000Z' },
    })];

    renderTaker();

    expect(await screen.findByText('لقد أكملت هذا الاختبار مسبقاً')).toBeTruthy();
    const toggle = screen.getByRole('button', { name: 'مراجعة الأسئلة' });
    expect(toggle).toHaveAttribute('aria-controls', 'exam-review-att-done');
  });

  it('deep-link done-state on an EXPIRED attempt keeps the honest promise, never a dead toggle (5-D3)', async () => {
    mocks.exams = [examFixture({
      myAttempt: { id: 'att-exp', status: 'EXPIRED', score: null, maxScore: 10, submittedAt: null },
    })];

    renderTaker();

    expect(await screen.findByText('لقد أكملت هذا الاختبار مسبقاً')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'مراجعة الأسئلة' })).toBeNull();
  });

  it('names the answer fields after their question prompts (15-g P1-5)', async () => {
    vi.useFakeTimers();
    mocks.start.mockResolvedValue(startedPayload());

    await startExam();

    expect(screen.getByRole('radiogroup', { name: /سؤال اختيار من متعدد/ })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /سؤال قصير/ })).toBeTruthy();
  });

  it('speaks the server’s window guards in Arabic on the start path (15-h P1-5)', async () => {
    mocks.exams = [examFixture({ closeAt: new Date(Date.now() - 3_600_000).toISOString() })];
    // The exact Arabic string the backend start route raises since 17-b
    // (exams.routes.ts D17-3) — rendered verbatim by the fall-through.
    mocks.start.mockRejectedValueOnce({ response: { data: { error: { message: 'أغلق باب التسليم لهذا الاختبار' } } } });

    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });

    expect(screen.getByText('أغلق باب التسليم لهذا الاختبار')).toBeTruthy();
    // The specific guard won — not the generic refusal fallback.
    expect(screen.queryByText(/تحقّق من اتصالك/)).toBeNull();
  });

  it('adds the real opening time to the not-open-yet copy (15-h P1-5)', async () => {
    mocks.exams = [examFixture({ openAt: new Date(Date.now() + 86_400_000).toISOString() })];
    // The exact Arabic string the backend start route raises since 17-b
    // (exams.routes.ts D17-3) — the branch enriches it with openAt.
    mocks.start.mockRejectedValueOnce({ response: { data: { error: { message: 'لم يفتح باب هذا الاختبار بعد' } } } });

    renderTaker();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بدء الاختبار' }));
    });

    expect(screen.getByText(/لم يفتح باب هذا الاختبار بعد — يفتح /)).toBeTruthy();
    // The enriched copy won — not the generic refusal fallback.
    expect(screen.queryByText(/تحقّق من اتصالك/)).toBeNull();
  });
});

describe('exam window visibility (15-h P1-5)', () => {
  beforeEach(() => {
    mocks.exams = [];
  });

  it('examWindowState mirrors the server start rule', () => {
    const now = Date.now();
    expect(examWindowState({ openAt: null, closeAt: null }, now)).toBe('open');
    expect(examWindowState({ openAt: new Date(now + 3_600_000).toISOString(), closeAt: null }, now)).toBe('upcoming');
    expect(examWindowState({ openAt: null, closeAt: new Date(now - 3_600_000).toISOString() }, now)).toBe('closed');
    expect(
      examWindowState(
        { openAt: new Date(now - 7_200_000).toISOString(), closeAt: new Date(now + 7_200_000).toISOString() },
        now,
      ),
    ).toBe('open');
  });

  it('groups windowed exams — available now / not available / history — with honest chips', () => {
    mocks.exams = [
      examFixture({
        id: 'open',
        title: 'اختبار مفتوح',
        openAt: new Date(Date.now() - 3_600_000).toISOString(),
        closeAt: new Date(Date.now() + 3_600_000).toISOString(),
      }),
      examFixture({
        id: 'later',
        title: 'اختبار لاحق',
        openAt: new Date(Date.now() + 86_400_000).toISOString(),
        closeAt: null,
      }),
      examFixture({
        id: 'shut',
        title: 'اختبار مغلق',
        openAt: new Date(Date.now() - 172_800_000).toISOString(),
        closeAt: new Date(Date.now() - 3_600_000).toISOString(),
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

    // The open-window exam stays linked under "available" and shows its
    // close deadline.
    expect(screen.getByRole('link', { name: /اختبار مفتوح/ })).toBeTruthy();
    expect(screen.getByText(/يغلق /)).toBeTruthy();

    // Not-yet-open and closed exams keep their own dated group, carry
    // their schedule chips, and are not presented as startable links.
    expect(screen.getByText('اختبارات غير متاحة الآن')).toBeTruthy();
    expect(screen.getByText(/يفتح /)).toBeTruthy();
    expect(screen.getByText('أغلق باب التسليم')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /اختبار لاحق/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /اختبار مغلق/ })).toBeNull();

    // History is untouched.
    expect(screen.queryByRole('link', { name: /اختبار منتهٍ/ })).toBeNull();
    expect(screen.getByText('اختبار منتهٍ')).toBeTruthy();
  });
});
