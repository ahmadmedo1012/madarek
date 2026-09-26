/**
 * 16-E6 — TeacherPages pins.
 *
 * 1. AttendancePage — the roll-call reaches the 4th AttendanceStatus
 *    (EXCUSED / «بعذر» — audit 15-a P1-7): the toggle marks
 *    aria-pressed, the save sends the status to the (already-accepting)
 *    backend, and the session stats count it as its own bucket.
 * 2. AttendancePage — roll-call date guard (audit 15-h P1-6): a cleared
 *    <input type="date"> blocks the save with an inline Arabic message
 *    instead of throwing RangeError inside the handler; a picked date
 *    still ships as a UTC-midnight ISO (the wire contract the backend's
 *    utcDayStart normalization pairs with).
 * 3. GradeSubmissionModal — the discard guard (audit 15-e P1-6), driven
 *    through AssignmentsPage's real feed → modal flow: clean closes are
 *    immediate, dirty closes route through the «تعديلات غير محفوظة»
 *    confirm (draft intact, Esc cancels the discard only), and a landed
 *    save closes freely — the draft is no longer unsaved.
 * 4. MessagesPage — server-side pagination (audit 15-d P2-7): every row
 *    of the fetched page renders (the old `.slice(0, 30)` over a 50-row
 *    fetch is gone), the pager walks real server pages, and single-page
 *    results hide the pager.
 * 5. 5-B6 (audit 5-A7): the answer surface in GradeSubmissionModal
 *    (textAnswer block + /document/ file link, P1-2), the <form> +
 *    «تقييم التالي» grading-throughput flow (P2-2), queue grouping with
 *    per-assignment ceilings, and the countAr zero-cases (P2-1).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AttendancePage, AssignmentsPage, MessagesPage, GradesPage, StudentsListPage, TeacherSchedulePage, feedToPending } from '../../src/pages/teacher/TeacherPages';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  offerings: [] as unknown[],
  students: [] as unknown[],
  record: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null as unknown,
  },
  dashboard: {
    data: null as unknown,
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  assignments: [] as unknown[],
  grade: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  messages: {
    pages: {} as Record<number, Array<Record<string, unknown>>>,
    total: 0,
    totalPages: 1,
    calls: [] as Array<[number, number]>,
  },
}));

// Only the hooks the rendered pages call are mocked; everything else the
// TeacherPages module pulls from useResources (materials/analytics/research
// hooks, apiErrorMessage) is either stubbed or never reached by these pages.
vi.mock('../../src/hooks/useResources', () => ({
  useTeacherOfferings: () => ({
    data: mocks.offerings,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useTeacherStudents: () => ({
    data: mocks.students,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRecordAttendance: () => mocks.record,
  useTeacherDashboard: () => mocks.dashboard,
  useTeacherAssignments: () => ({
    data: mocks.assignments,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGradeSubmission: () => mocks.grade,
  useMyMessages: (page: number, limit: number) => {
    mocks.messages.calls.push([page, limit]);
    return {
      data: {
        data: mocks.messages.pages[page] ?? [],
        meta: {
          total: mocks.messages.total,
          page,
          limit,
          totalPages: mocks.messages.totalPages,
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const TEACHER: AuthUser = {
  id: 't1',
  email: 'salim@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الطاهر',
  role: 'TEACHER',
};

const OFFERING = {
  id: 'off1',
  term: '2026-1',
  room: 'قاعة 12',
  capacity: 40,
  course: {
    id: 'c1',
    code: 'SE101',
    name: 'هندسة البرمجيات',
    iconEmoji: null,
    themeColor: null,
    credits: 3,
  },
  _count: { enrollments: 2, assignments: 1, lectures: 4, examTemplates: 0 },
  schedule: [],
};

const STUDENT = {
  studentId: 'st1',
  name: 'آمنة العبيدي',
  universityId: '123456',
  avatarInitials: null,
  avatarColor: null,
  attendancePct: 92,
  absences: 1,
  lateCount: 0,
  avgGrade: 84,
  watchPct: 10,
  riskScore: 12,
  riskLevel: 'OK',
  signals: [],
  suggestion: '',
};

const FEED_SUBMISSION = {
  kind: 'submissions',
  id: 's-sub1',
  author: { firstName: 'آمنة', lastName: 'العبيدي', avatarInitials: null, avatarColor: null },
  meta: 'هندسة البرمجيات · SE101',
  when: new Date(Date.now() - 3_600_000).toISOString(),
  title: 'سلّم مشروع UML',
  actionTo: '/grades',
};

/* 5-B6 (A7 P1-2): the feed item carries the student's answer — the
 * projection the backend hand-off adds. Used by the answer-surface
 * tests below. */
const FEED_SUBMISSION_WITH_ANSWER = {
  ...FEED_SUBMISSION,
  textAnswer: 'حللت التمرين بالاعتماد على نمط المراقب، والرسم في الصفحة الثانية.',
  fileUrl: '/api/v1/files/papers/hw1-answer.pdf',
};

/* A second pending submission on a DIFFERENT assignment — drives the
 * grouping (two groups) and the «تقييم التالي» flow. */
const FEED_SUBMISSION_2 = {
  kind: 'submissions',
  id: 's-sub2',
  author: { firstName: 'آمنة', lastName: 'العبيدي', avatarInitials: null, avatarColor: null },
  meta: 'هندسة البرمجيات · SE101',
  when: new Date(Date.now() - 1_800_000).toISOString(),
  title: 'سلّم تمرين الشبكات',
  actionTo: '/grades',
};

const ASSIGNMENT = {
  id: 'a1',
  title: 'مشروع UML',
  type: 'PROJECT',
  dueAt: new Date(Date.now() + 86_400_000).toISOString(),
  weight: 1,
  maxScore: 10,
  course: { code: 'SE101', name: 'هندسة البرمجيات' },
  submissions: 1,
  enrolled: 2,
};

const ASSIGNMENT_2 = {
  id: 'a2',
  title: 'تمرين الشبكات',
  type: 'HOMEWORK',
  dueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  weight: 1,
  maxScore: 20,
  course: { code: 'SE101', name: 'هندسة البرمجيات' },
  submissions: 1,
  enrolled: 2,
};

function messageRow(id: string, body: string) {
  return {
    id,
    body,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    fromUser: { id: 'u1', firstName: 'ليلى', lastName: 'بن عامر', avatarColor: null },
    toUser: { id: 't1', firstName: 'سالم', lastName: 'الطاهر', avatarColor: null },
  };
}

function seedMessages() {
  const p1 = Array.from({ length: 30 }, (_, i) => messageRow(`m${i + 1}`, `رسالة ${i + 1}`));
  const p2 = Array.from({ length: 15 }, (_, i) => messageRow(`m${31 + i}`, `رسالة ${31 + i}`));
  mocks.messages.pages = { 1: p1, 2: p2 };
  mocks.messages.total = 45;
  mocks.messages.totalPages = 2;
  mocks.messages.calls = [];
}

function seedGradeFeed() {
  mocks.dashboard = {
    data: {
      kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 1 },
      trend: [],
      feed: [FEED_SUBMISSION],
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.assignments = [ASSIGNMENT];
}

/** 5-B6 (A7 P1-2/P2-2): the queue with the student's answer projected
 *  — the payload shape the backend hand-off ships. */
function seedGradeFeedWithAnswer() {
  mocks.dashboard = {
    data: {
      kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 1 },
      trend: [],
      feed: [FEED_SUBMISSION_WITH_ANSWER],
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.assignments = [ASSIGNMENT];
}

/** Two pending submissions on two assignments — grouping + next-flow. */
function seedGradeFeedMulti() {
  mocks.dashboard = {
    data: {
      kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 2 },
      trend: [],
      feed: [FEED_SUBMISSION, FEED_SUBMISSION_2],
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.assignments = [ASSIGNMENT, ASSIGNMENT_2];
}

function renderAttendance() {
  return render(
    <MemoryRouter>
      <AttendancePage />
    </MemoryRouter>,
  );
}

async function openGradeModal() {
  render(
    <MemoryRouter>
      <AssignmentsPage />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'تقييم' }));
  return screen.findByRole('dialog', { name: 'تقييم تسليم مشروع UML' });
}

function renderMessages() {
  return render(
    <MemoryRouter>
      <MessagesPage />
    </MemoryRouter>,
  );
}

/** The page indicator's text spans <bdi> children — match the whole span. */
function expectPageIndicator(text: string) {
  expect(
    screen.getByText((_content, el) =>
      el instanceof HTMLElement
      && el.tagName === 'SPAN'
      && (el.textContent ?? '').replace(/\s+/g, ' ').trim() === text,
    ),
  ).toBeInTheDocument();
}

beforeEach(() => {
  mocks.offerings = [];
  mocks.students = [];
  mocks.record = { mutate: vi.fn(), isPending: false, isError: false, isSuccess: false, error: null };
  mocks.dashboard = { data: null, isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.assignments = [];
  mocks.grade = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
  mocks.messages = { pages: {}, total: 0, totalPages: 1, calls: [] };
});

afterEach(() => {
  // Store writes outside act scope would warn — the panel from the
  // finished test is still mounted here (setup.ts cleanup runs after
  // file-level hooks).
  act(() => { useAuthStore.setState({ user: null }); });
});

describe('AttendancePage — EXCUSED roll-call option (15-a P1-7)', () => {
  it('offers the fourth AttendanceStatus (بعذر) beside the three reachable ones', () => {
    mocks.offerings = [OFFERING];
    mocks.students = [STUDENT];
    renderAttendance();

    const excused = screen.getByRole('button', { name: 'بعذر' });
    expect(excused).toHaveAttribute('data-tone', 'brand');
    // PRESENT stays the implicit default until the teacher picks otherwise
    expect(screen.getByRole('button', { name: 'حاضر' })).toHaveAttribute('aria-pressed', 'true');
    expect(excused).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks a student EXCUSED, counts the bucket, and sends the status on save', () => {
    mocks.offerings = [OFFERING];
    mocks.students = [STUDENT];
    renderAttendance();

    fireEvent.click(screen.getByRole('button', { name: 'بعذر' }));
    expect(screen.getByRole('button', { name: 'بعذر' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'حاضر' })).toHaveAttribute('aria-pressed', 'false');

    // The session-stats card counts بعذر as its own bucket
    expect(screen.getByText('بعذر (1)')).toBeInTheDocument();
    expect(screen.getByText('الحضور (0)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'حفظ السجلّ' }));
    expect(mocks.record.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.record.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        offeringId: 'off1',
        records: [{ studentId: 'st1', status: 'EXCUSED' }],
      }),
    );
  });
});

describe('AttendancePage — roll-call date guard (15-h P1-6)', () => {
  it('blocks the save with an inline Arabic message when the date is cleared', () => {
    mocks.offerings = [OFFERING];
    mocks.students = [STUDENT];
    renderAttendance();

    fireEvent.change(screen.getByLabelText('تاريخ الجلسة'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ السجلّ' }));

    // The old code threw RangeError inside the handler — the save silently
    // did nothing. Now: a role=alert message and no mutation.
    expect(screen.getByRole('alert')).toHaveTextContent('حدّد تاريخ الجلسة قبل الحفظ.');
    expect(mocks.record.mutate).not.toHaveBeenCalled();

    // The invalid state is announced on the input itself
    expect(screen.getByLabelText('تاريخ الجلسة')).toHaveAttribute('aria-invalid', 'true');
  });

  it('ships a picked date as a UTC-midnight ISO (the wire contract stays intact)', () => {
    mocks.offerings = [OFFERING];
    mocks.students = [STUDENT];
    renderAttendance();

    fireEvent.change(screen.getByLabelText('تاريخ الجلسة'), { target: { value: '2026-03-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ السجلّ' }));

    expect(mocks.record.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-03-05T00:00:00.000Z' }),
    );
  });

  it('defaults the input to the client-local day key', () => {
    mocks.offerings = [OFFERING];
    mocks.students = [STUDENT];
    renderAttendance();

    const input = screen.getByLabelText('تاريخ الجلسة') as HTMLInputElement;
    // Format + local-day pin. (On a UTC-TZ runner the old UTC-slice default
    // computes the same string — the local-day distinction is only live for
    // non-UTC clients; this at least pins the shape and non-emptiness.)
    const d = new Date();
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(input.value).toBe(local);
  });
});

describe('GradeSubmissionModal — discard guard (15-e P1-6)', () => {
  it('closes a clean modal immediately — no discard confirm', async () => {
    seedGradeFeed();
    await openGradeModal();

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تقييم تسليم مشروع UML' })).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
  });

  it('routes a dirty close through the discard confirm — draft intact, Esc cancels the discard only', async () => {
    seedGradeFeed();
    await openGradeModal();

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب (اختياري)'), {
      target: { value: 'إجابة جيّدة لكن تحتاج توثيقاً أوسع' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    // The draft survives behind the confirm — never silently dropped
    expect(screen.getByLabelText('ملاحظات للطالب (اختياري)')).toHaveValue('إجابة جيّدة لكن تحتاج توثيقاً أوسع');

    // Esc while the confirm is stacked cancels the discard only — the
    // grading modal (Esc-locked underneath) stays open
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    });
    expect(screen.getByRole('dialog', { name: 'تقييم تسليم مشروع UML' })).toBeInTheDocument();

    // Esc on the dirty form modal routes into the confirm as well
    fireEvent.keyDown(document, { key: 'Escape' });
    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    fireEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    });
    expect(screen.getByRole('dialog', { name: 'تقييم تسليم مشروع UML' })).toBeInTheDocument();

    // Explicit discard is the only way out with a dirty draft
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    fireEvent.click(screen.getByRole('button', { name: 'التخلّي عن التعديلات' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تقييم تسليم مشروع UML' })).toBeNull();
    });
  });

  it('saves the grade and closes freely once the save lands (no post-save confirm)', async () => {
    seedGradeFeed();
    mocks.grade.mutateAsync.mockResolvedValueOnce({ id: 'sub1', status: 'GRADED' });
    await openGradeModal();

    fireEvent.change(screen.getByLabelText('الدرجة (من 0 إلى 10)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('ملاحظات للطالب (اختياري)'), { target: { value: 'أحسنت' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));

    await waitFor(() => {
      expect(mocks.grade.mutateAsync).toHaveBeenCalledWith({ grade: 8, feedback: 'أحسنت' });
    });
    expect(await screen.findByText('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.')).toBeInTheDocument();

    // A landed save makes the draft "saved" — closing must not prompt.
    // (Header ✕ and the footer button share the name إغلاق here; both
    // route through the same guarded close — click the first.)
    const closeButtons = screen.getAllByRole('button', { name: 'إغلاق' });
    fireEvent.click(closeButtons[0]!);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تقييم تسليم مشروع UML' })).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
  });
});

/* 23-b (21-b hand-off, A9 P2-4) — the grade modal rides the shared
 * FormField primitive: the validation error now reaches the control
 * itself (aria-invalid + aria-describedby → the alert), not only a
 * loose role=alert paragraph under the form. */
describe('GradeSubmissionModal — FormField aria wiring (23-b)', () => {
  it('marks the score input aria-invalid and describes it by the alert on a failed submit', async () => {
    seedGradeFeed();
    await openGradeModal();

    const score = screen.getByLabelText('الدرجة (من 0 إلى 10)');
    expect(score).not.toHaveAttribute('aria-invalid');

    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('أدخل درجة صحيحة.');
    expect(score).toHaveAttribute('aria-invalid', 'true');
    expect(score.getAttribute('aria-describedby')).toContain(alert.id);

    // An out-of-range value keeps the control invalid (the message
    // swaps to the bound check).
    fireEvent.change(score, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));
    const rangeAlert = await screen.findByRole('alert');
    expect(rangeAlert).toHaveTextContent('الدرجة يجب ألّا تتجاوز 10.');
    expect(screen.getByLabelText('الدرجة (من 0 إلى 10)')).toHaveAttribute('aria-invalid', 'true');

    // A valid value lands the save — the error surface unmounts with
    // the form (success card replaces it).
    fireEvent.change(screen.getByLabelText('الدرجة (من 0 إلى 10)'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));
    expect(await screen.findByText('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps both field labels htmlFor-wired through the primitive', async () => {
    seedGradeFeed();
    await openGradeModal();

    const feedback = screen.getByLabelText('ملاحظات للطالب (اختياري)') as HTMLTextAreaElement;
    fireEvent.change(feedback, { target: { value: 'أحسنت' } });
    expect(screen.getByLabelText('ملاحظات للطالب (اختياري)')).toHaveValue('أحسنت');
  });
});

describe('NeedsReviewCard — the late-submission chip (18-G feed flag, 18-F2 consumption)', () => {
  it('badges a LATE submission «متأخر» beside the title — never inside it', () => {
    // A late submission: the same shape the dashboard now serves, with
    // the marker on its own field.
    mocks.dashboard = {
      data: {
        kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 1 },
        trend: [],
        feed: [{ ...FEED_SUBMISSION, late: true }],
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.assignments = [ASSIGNMENT];
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    // The chip renders beside the title…
    expect(screen.getByText('متأخر')).toBeInTheDocument();
    // …and the title itself stays byte-stable — the grade modal's
    // maxScore lookup matches assignments BY the stripped title
    // (the 16-B1 hazard the flag exists to avoid).
    expect(screen.getByText('مشروع UML')).toBeInTheDocument();
    expect(screen.queryByText('مشروع UML متأخر')).toBeNull();
  });

  it('an on-time submission carries no chip', () => {
    seedGradeFeed();
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('مشروع UML')).toBeInTheDocument();
    expect(screen.queryByText('متأخر')).toBeNull();
  });
});

/* ── 5-B6 (audit 5-A7 P1-2): the answer the teacher is grading ── */
describe('GradeSubmissionModal — the answer surface (5-B6 / A7 P1-2)', () => {
  it('renders the student text answer readably and links the file to the in-app viewer', async () => {
    seedGradeFeedWithAnswer();
    await openGradeModal();

    // The answer block: labelled, with the student's actual text
    expect(screen.getByText('إجابة الطالب')).toBeInTheDocument();
    expect(
      screen.getByText('حللت التمرين بالاعتماد على نمط المراقب، والرسم في الصفحة الثانية.'),
    ).toBeInTheDocument();

    // The file link mirrors the research flow: /document/ viewer with
    // the assignment title + a back path to the assignments page.
    const fileLink = screen.getByRole('link', { name: 'فتح الملف في العارض' });
    expect(fileLink.getAttribute('href')).toContain('/document/hw1-answer.pdf');
    expect(fileLink.getAttribute('href')).toContain(
      `title=${encodeURIComponent('مشروع UML')}`,
    );
    expect(fileLink.getAttribute('href')).toContain(
      `back=${encodeURIComponent('/teacher/assignments')}`,
    );
  });

  it('renders nothing extra when the feed item carries no answer fields', async () => {
    seedGradeFeed();
    await openGradeModal();

    // The pre-hand-off payload (no textAnswer/fileUrl): no answer
    // block, and — critically — no fabricated "empty answer" message.
    expect(screen.queryByText('إجابة الطالب')).toBeNull();
    expect(screen.queryByRole('link', { name: 'فتح الملف في العارض' })).toBeNull();
    // The grading fields still work
    expect(screen.getByLabelText('الدرجة (من 0 إلى 10)')).toBeInTheDocument();
  });

  it('links an external https file to a new tab instead of the viewer', async () => {
    mocks.dashboard = {
      data: {
        kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 1 },
        trend: [],
        feed: [{ ...FEED_SUBMISSION, textAnswer: null, fileUrl: 'https://cdn.example.com/hw.pdf' }],
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.assignments = [ASSIGNMENT];
    await openGradeModal();

    const external = screen.getByRole('link', { name: 'فتح الملف الخارجي' });
    expect(external).toHaveAttribute('href', 'https://cdn.example.com/hw.pdf');
    expect(external).toHaveAttribute('target', '_blank');
  });
});

/* ── 5-B6 (audit 5-A7 P2-2): form + «تقييم التالي» throughput ── */
describe('GradeSubmissionModal — form + next-submission flow (5-B6 / A7 P2-2)', () => {
  it('wraps the fields in a real form — submit event saves the grade', async () => {
    seedGradeFeed();
    mocks.grade.mutateAsync.mockResolvedValueOnce({ id: 'sub1', status: 'GRADED' });
    await openGradeModal();

    const score = screen.getByLabelText('الدرجة (من 0 إلى 10)') as HTMLInputElement;
    const form = score.closest('form');
    expect(form).not.toBeNull();

    fireEvent.change(score, { target: { value: '8' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mocks.grade.mutateAsync).toHaveBeenCalledWith({ grade: 8, feedback: undefined });
    });
    expect(await screen.findByText('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.')).toBeInTheDocument();
  });

  it('grades one submission, then «تقييم التالي» opens the next one with a fresh draft', async () => {
    seedGradeFeedMulti();
    mocks.grade.mutateAsync.mockResolvedValue({ id: 'sub', status: 'GRADED' });
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    // Two groups: one per assignment, each with its own ceiling chip
    expect(await screen.findByText('مشروع UML')).toBeInTheDocument();
    expect(screen.getByText('تمرين الشبكات')).toBeInTheDocument();
    // One pending submission per group → two «تسليم واحد» count chips
    expect(screen.getAllByText('تسليم واحد')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'تقييم' })[0]!);
    await screen.findByRole('dialog', { name: 'تقييم تسليم مشروع UML' });

    fireEvent.change(screen.getByLabelText('الدرجة (من 0 إلى 10)'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));

    // Done state offers the next pending submission (auto-focused)
    const next = await screen.findByRole('button', { name: 'تقييم التالي' });
    expect(next).toHaveFocus();
    fireEvent.click(next);

    // The second modal opens on the OTHER assignment — fresh score box
    // (jest-dom reads an empty <input type="number"> as value null)
    const second = await screen.findByRole('dialog', { name: 'تقييم تسليم تمرين الشبكات' });
    expect(second).toBeInTheDocument();
    expect(screen.getByLabelText('الدرجة (من 0 إلى 20)')).toHaveValue(null);
  });

  it('hides «تقييم التالي» when this was the last pending submission', async () => {
    seedGradeFeed();
    mocks.grade.mutateAsync.mockResolvedValueOnce({ id: 'sub1', status: 'GRADED' });
    await openGradeModal();

    fireEvent.change(screen.getByLabelText('الدرجة (من 0 إلى 10)'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));
    await screen.findByText('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.');

    expect(screen.queryByRole('button', { name: 'تقييم التالي' })).toBeNull();
  });
});

/* ── 5-B6 (audit 5-A7 P2-1): countAr zero-cases ── */
describe('NeedsReviewCard — queue zero-case + grouping (5-B6 / A7 P2-1)', () => {
  it('renders the honest zero subtitle instead of «0 تسليماً بانتظار درجتك»', () => {
    mocks.dashboard = {
      data: { kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 0 }, trend: [], feed: [] },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.assignments = [ASSIGNMENT];
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('لا تسليمات بانتظار درجتك')).toBeInTheDocument();
    expect(screen.queryByText(/0 تسليم/)).toBeNull();
  });

  it('groups same-assignment submissions under one header with a shared ceiling', () => {
    mocks.dashboard = {
      data: {
        kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 2 },
        trend: [],
        // Two submissions on the SAME assignment → one group, 2 rows
        feed: [FEED_SUBMISSION, { ...FEED_SUBMISSION, id: 's-sub3' }],
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.assignments = [ASSIGNMENT];
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('مشروع UML')).toBeInTheDocument();
    // The group carries the ceiling chip and the counted total. The
    // chip's text spans a <bdi> child — match the whole badge (the
    // page-indicator matcher pattern).
    expect(
      screen.getByText((_c, el) =>
        el instanceof HTMLElement
        && el.classList.contains('badge')
        && (el.textContent ?? '').replace(/\s+/g, ' ').trim() === 'الدرجة من 10'),
    ).toBeInTheDocument();
    expect(screen.getByText('تسليمان')).toBeInTheDocument();
    // …and two grade buttons for the two student rows
    expect(screen.getAllByRole('button', { name: 'تقييم' })).toHaveLength(2);
  });
});

describe('MessagesPage — zero-case subtitle (5-B6 / A7 P2-1)', () => {
  it('renders «لا رسائل» instead of «0 رسالة»', () => {
    mocks.messages.pages = { 1: [] };
    mocks.messages.total = 0;
    mocks.messages.totalPages = 1;
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    expect(screen.getByText('لا رسائل')).toBeInTheDocument();
    expect(screen.queryByText('0 رسالة')).toBeNull();
  });

  it('clamps a long body to one line with the full text on the title attribute (5-B6 craft)', () => {
    const longBody = 'هذه رسالة طويلة جداً يتجاوز نصّها سطراً واحداً في سجلّ الصندوق، والنسخة الكاملة تظهر عند الوقوف على السطر بالمؤشّر.';
    mocks.messages.pages = { 1: [messageRow('m1', longBody)] };
    mocks.messages.total = 1;
    mocks.messages.totalPages = 1;
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    // One-line clamp (no wrapped prose ragging the log) + the no-truncation-
    // without-tooltip rule: the full body rides the row's title. The CSS
    // clamp itself is hover-gated (title tooltips never open on touch —
    // phones keep the full wrapping body); the class + title are the
    // unconditional contract this pins.
    const body = screen.getByTitle(longBody);
    expect(body).toHaveClass('msg-body');
    expect(body).toHaveTextContent(longBody);
  });
});

/* ── 5-B6 (audit 5-A7 P2-1): the remaining zero-cases, platform-wide ── */
describe('AssignmentsPage + TeacherSchedulePage — countAr zero-cases (5-B6 / A7 P2-1)', () => {
  it('renders «لا تسليمات بعد» on an assignment with no submissions — never «0 تسليماً»', () => {
    mocks.dashboard = {
      data: { kpi: { studentCount: 2, avgGradePct: 70, attendancePct: 90, needsReview: 0 }, trend: [], feed: [] },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.assignments = [{ ...ASSIGNMENT, submissions: 0 }];
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('لا تسليمات بعد')).toBeInTheDocument();
    expect(screen.queryByText('0 تسليماً')).toBeNull();
  });

  it('renders «لا طلاب مسجَّلين» on an empty scheduled slot — never «0 طالباً»', () => {
    mocks.offerings = [{
      ...OFFERING,
      _count: { ...OFFERING._count, enrollments: 0 },
      schedule: [{ dayOfWeek: 3, startTime: '09:00', endTime: '10:40', room: 'قاعة 12' }],
    }];
    render(
      <MemoryRouter>
        <TeacherSchedulePage />
      </MemoryRouter>,
    );

    // The slot line carries the room prefix — match the whole sub-line
    // (the page-indicator matcher pattern).
    expect(
      screen.getByText((_c, el) =>
        el instanceof HTMLElement
        && el.classList.contains('list-row-sub')
        && (el.textContent ?? '').replace(/\s+/g, ' ').trim() === 'قاعة 12 · لا طلاب مسجَّلين',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('0 طالباً')).toBeNull();
  });
});

describe('MessagesPage — server-side pagination (15-d P2-7)', () => {
  it('renders every row of the fetched page — no client-side slice', () => {
    seedMessages();
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    expect(screen.getByText('رسالة 1')).toBeInTheDocument();
    expect(screen.getByText('رسالة 30')).toBeInTheDocument();
    // Page 2's rows only arrive when the server is asked for page 2
    expect(screen.queryByText('رسالة 31')).toBeNull();
    // The hook is called with the page + the 30-row page size
    const calls = mocks.messages.calls;
    expect(calls[calls.length - 1]).toEqual([1, 30]);
  });

  it('walks server pages through the pager and back', () => {
    seedMessages();
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    const prev = screen.getByRole('button', { name: 'الصفحة السابقة' });
    const next = screen.getByRole('button', { name: 'الصفحة التالية' });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    const calls = mocks.messages.calls;
    expect(calls[calls.length - 1]).toEqual([2, 30]);
    expect(screen.getByText('رسالة 31')).toBeInTheDocument();
    expect(screen.getByText('رسالة 45')).toBeInTheDocument();
    expect(screen.queryByText('رسالة 1')).toBeNull();
    expectPageIndicator('الصفحة 2 من 2 · 45 رسالة');
    expect(next).toBeDisabled();
    expect(prev).toBeEnabled();

    fireEvent.click(prev);
    const callsAfterBack = mocks.messages.calls;
    expect(callsAfterBack[callsAfterBack.length - 1]).toEqual([1, 30]);
    expect(screen.getByText('رسالة 1')).toBeInTheDocument();
  });

  it('hides the pager when the server reports a single page', () => {
    mocks.messages.pages = { 1: [messageRow('m1', 'السلام عليكم')] };
    mocks.messages.total = 1;
    mocks.messages.totalPages = 1;
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    expect(screen.getByText('السلام عليكم')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'الصفحة السابقة' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'الصفحة التالية' })).toBeNull();
  });

  /* 22-a (A6 P2) — the honest read-only retitle: the old subtitle
   * promised «محادثاتك المباشرة» while no compose/reply affordance
   * exists anywhere in the FE. */
  it('titles the page as a read-only message log — no live-conversations promise', () => {
    seedMessages();
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    expect(screen.getByRole('heading', { level: 1, name: 'صندوق الرسائل' })).toBeInTheDocument();
    // The over-promising subtitle and the redundant «الرسائل الأخيرة»
    // card title (A6 P3) are both gone.
    expect(screen.queryByText('محادثاتك المباشرة عبر المنصّة.')).toBeNull();
    expect(screen.queryByText('الرسائل الأخيرة')).toBeNull();
    // The card carries the real count instead of a duplicate title.
    expect(screen.getByText('45 رسالة')).toBeInTheDocument();
  });
});

/* 22-a (A6 P2) — ONE grade taxonomy across the teacher surfaces: the
 * same student renders the same gradeBand chip on the grades table and
 * the students table (the old private vocabularies said «جيّد جدّاً» on
 * /grades but «متفوّق» on /students for an 84). */
describe('GradesPage + StudentsListPage — one student, one band chip (22-a / A6 P2)', () => {
  it('renders the same gradeBand chip and the % unit on both tables', () => {
    mocks.offerings = [OFFERING];
    mocks.students = [{ ...STUDENT, avgGrade: 84 }];
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    );
    // 84 → the shared «جيّد جدّاً» band (not the old students-page
    // «متفوّق»), with the % unit the attendance column always had.
    expect(screen.getByText('جيّد جدّاً')).toBeInTheDocument();
    expect(screen.getByText('84%')).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <StudentsListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('جيّد جدّاً')).toBeInTheDocument();
    expect(screen.getByText('84%')).toBeInTheDocument();
    // The column is «التقدير» like the grades table — the old
    // «الحالة» header named a vocabulary that no longer exists.
    expect(screen.getByRole('columnheader', { name: 'التقدير' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'الحالة' })).toBeNull();
  });

  it('moves the course picker into the page header — no heavy one-select Card', () => {
    mocks.offerings = [OFFERING];
    mocks.students = [STUDENT];
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    );
    // The select lives in the page header (A6 P3)…
    expect(
      screen.getByRole('combobox', { name: 'المقرّر' }),
    ).toBeInTheDocument();
    // …and the old full-Card wrapper is gone.
    expect(screen.queryByText('اختر المقرّر لعرض درجاته')).toBeNull();
    unmount();
  });
});
