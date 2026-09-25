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
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AttendancePage, AssignmentsPage, MessagesPage } from '../../src/pages/teacher/TeacherPages';
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
});
