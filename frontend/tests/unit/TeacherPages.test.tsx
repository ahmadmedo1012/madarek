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
import { AttendancePage, AssignmentsPage, MaterialsPage, MessagesPage, GradesPage, StudentsListPage, TeacherSchedulePage, queueDueLabel } from '../../src/pages/teacher/TeacherPages';
import { useAuthStore } from '../../src/stores/auth.store';
import { useToastStore } from '../../src/lib/toast';
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
  /* r157 / 6A8 — the pending-submissions queue the AssignmentsPage
   * consumes (its own endpoint, not the 6-row dashboard feed). */
  pending: {
    data: [] as unknown[],
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
  /* r157 / 6A9 — the post-grade queue invalidation (GradeSubmissionModal
   * calls useQueryClient; the stub exposes one asserted spy). */
  invalidate: vi.fn(),
  /* r157 / 6A9 — the messages mark-all-read mutation. */
  markAll: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
  /* r144 — the authoring mutations (AssignmentFormModal /
   * MaterialFormModal). */
  createAssignment: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  createMaterial: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  /* P3 — the direct-PDF material upload (MaterialFormModal file mode). */
  uploadMaterial: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  messages: {
    pages: {} as Record<number, Array<Record<string, unknown>>>,
    total: 0,
    totalPages: 1,
    unread: 0,
    calls: [] as Array<[number, number]>,
  },
  /* r180-F2 — GradesPage's semester-grade entry pair: the offering
   * grades read (prefills) + the bulk upsert mutation. */
  offeringGrades: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  upsertGrades: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null as unknown,
  },
}));

// GradeSubmissionModal uses useQueryClient for the post-save queue
// invalidation — stub the client (the hooks themselves are mocked at
// the useResources boundary, so no QueryClientProvider is mounted).
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  };
});

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
  usePendingSubmissions: () => mocks.pending,
  useMarkAllMessagesRead: () => mocks.markAll,
  useTeacherAssignments: () => ({
    data: mocks.assignments,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  /* r144 — MaterialsPage's read model (the page renders its table off
   * it; empty is fine for the modal-only assertions here). */
  useTeacherMaterials: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGradeSubmission: () => mocks.grade,
  useCreateAssignment: () => mocks.createAssignment,
  useCreateMaterial: () => mocks.createMaterial,
  useUploadMaterialFile: () => mocks.uploadMaterial,
  /* r180-F2 — the semester-grade entry pair GradesPage now consumes. */
  useOfferingGrades: () => mocks.offeringGrades,
  useUpsertOfferingGrades: () => mocks.upsertGrades,
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
          // r157 / 6A9 — the teacher inbox consumes the unread count.
          unread: mocks.messages.unread,
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

/* r157 / 6A8 — queue rows (GET /teacher/me/pending-submissions), the
 * payload shape the AssignmentsPage consumes now. The old FEED_*
 * fixtures were dashboard feed items (6-row window + «سلّم»-prefixed
 * titles); the queue row carries the assignment title/maxScore as
 * real fields. */
const QUEUE_SUBMISSION = {
  id: 'sub1',
  submittedAt: new Date(Date.now() - 3_600_000).toISOString(),
  status: 'SUBMITTED',
  textAnswer: null,
  fileUrl: null,
  student: { firstName: 'آمنة', lastName: 'العبيدي', avatarInitials: null, avatarColor: null },
  assignment: {
    title: 'مشروع UML',
    type: 'PROJECT',
    maxScore: 10,
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    offering: { course: { code: 'SE101', name: 'هندسة البرمجيات' } },
  },
};

/* 5-B6 (A7 P1-2): the queue row carries the student's answer — the
 * projection the backend ships. Used by the answer-surface tests. */
const QUEUE_SUBMISSION_WITH_ANSWER = {
  ...QUEUE_SUBMISSION,
  textAnswer: 'حللت التمرين بالاعتماد على نمط المراقب، والرسم في الصفحة الثانية.',
  fileUrl: '/api/v1/files/papers/hw1-answer.pdf',
};

/* A second pending submission on a DIFFERENT assignment — drives the
 * grouping (two groups) and the «تقييم التالي» flow. */
const QUEUE_SUBMISSION_2 = {
  ...QUEUE_SUBMISSION,
  id: 'sub2',
  submittedAt: new Date(Date.now() - 1_800_000).toISOString(),
  assignment: {
    title: 'تمرين الشبكات',
    type: 'HOMEWORK',
    maxScore: 20,
    dueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    offering: { course: { code: 'SE101', name: 'هندسة البرمجيات' } },
  },
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
  mocks.messages.unread = 0;
  mocks.messages.calls = [];
}

/* r157 / 6A8 — the seeds feed the QUEUE mock now (the dashboard feed
 * no longer drives the grading queue; it stays mocked for the other
 * pages). */
function seedGradeFeed() {
  mocks.pending = { data: [QUEUE_SUBMISSION], isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.assignments = [ASSIGNMENT];
}

/** 5-B6 (A7 P1-2/P2-2): the queue row with the student's answer
 *  projected — the payload shape the backend ships. */
function seedGradeFeedWithAnswer() {
  mocks.pending = { data: [QUEUE_SUBMISSION_WITH_ANSWER], isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.assignments = [ASSIGNMENT];
}

/** Two pending submissions on two assignments — grouping + next-flow. */
function seedGradeFeedMulti() {
  mocks.pending = { data: [QUEUE_SUBMISSION, QUEUE_SUBMISSION_2], isPending: false, isError: false, error: null, refetch: vi.fn() };
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
  // 4C-c: the queue row's action reads «تصحيح» (the grading-queue verb).
  fireEvent.click(await screen.findByRole('button', { name: 'تصحيح' }));
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
  mocks.pending = { data: [], isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.assignments = [];
  mocks.grade = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
  mocks.invalidate = vi.fn();
  mocks.markAll = { mutate: vi.fn(), isPending: false, isError: false, error: null };
  mocks.createAssignment = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
  mocks.createMaterial = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
  mocks.uploadMaterial = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
  mocks.messages = { pages: {}, total: 0, totalPages: 1, unread: 0, calls: [] };
  /* r180-F2 — GradesPage's semester-grade entry pair (same reset
   * convention as every other mock above). */
  mocks.offeringGrades = { data: [], isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.upsertGrades = { mutateAsync: vi.fn(), isPending: false, isError: false, isSuccess: false, error: null };
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
    // A late queue row: status LATE rides as its own field (16-B1).
    mocks.pending = {
      data: [{ ...QUEUE_SUBMISSION, status: 'LATE' }],
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
    mocks.pending = {
      data: [{ ...QUEUE_SUBMISSION, textAnswer: null, fileUrl: 'https://cdn.example.com/hw.pdf' }],
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

    fireEvent.click(screen.getAllByRole('button', { name: 'تصحيح' })[0]!);
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
    mocks.pending = { data: [], isPending: false, isError: false, error: null, refetch: vi.fn() };
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
    mocks.pending = {
      data: [
        // Two submissions on the SAME assignment → one group, 2 rows
        QUEUE_SUBMISSION,
        { ...QUEUE_SUBMISSION, id: 'sub3' },
      ],
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
    // …and two grade buttons for the two student rows (4C-c: «تصحيح»)
    expect(screen.getAllByRole('button', { name: 'تصحيح' })).toHaveLength(2);
  });
});

/* ── r157 / 6A8 — the queue is the QUEUE endpoint, not the 6-row feed ── */
describe('NeedsReviewCard — the pending-submissions queue (r157 / 6A8)', () => {
  it('renders 8 pending submissions — beyond the old 6-row dashboard feed window', async () => {
    // THE regression: the queue used to derive from the dashboard feed
    // (take: 6), so the 7th and 8th pending submission never rendered
    // anywhere. The page consumes usePendingSubmissions now — every row
    // of the (100-row) queue is gradeable.
    mocks.pending = {
      data: Array.from({ length: 8 }, (_, i) => ({
        ...QUEUE_SUBMISSION,
        id: `sub-${i + 1}`,
        student: { firstName: 'طالب', lastName: `رقم ${i + 1}`, avatarInitials: null, avatarColor: null },
      })),
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

    // 8 rows → 8 grade buttons (the old feed window capped at 6);
    // 4C-c: the row action reads «تصحيح».
    expect(await screen.findAllByRole('button', { name: 'تصحيح' })).toHaveLength(8);
    // The subtitle counts the full queue honestly.
    expect(screen.getByText('8 تسليمات بانتظار درجتك')).toBeInTheDocument();
  });

  it('a landed save invalidates the queue key — the graded row drops without a refetch wait', async () => {
    seedGradeFeed();
    mocks.grade.mutateAsync.mockResolvedValueOnce({ id: 'sub1', status: 'GRADED' });
    await openGradeModal();

    fireEvent.change(screen.getByLabelText('الدرجة (من 0 إلى 10)'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));
    await screen.findByText('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.');

    // GradeSubmissionModal refreshes ['teacher','me','pending-submissions']
    // after the save (useGradeSubmission only covers the dashboards).
    expect(mocks.invalidate).toHaveBeenCalledWith({
      queryKey: ['teacher', 'me', 'pending-submissions'],
    });
  });
});

describe('MessagesPage — zero-case meta (5-B6 / A7 P2-1 · R319 c3-S2)', () => {
  it('renders no count + the hatched empty cell instead of «0 رسالة»', () => {
    mocks.messages.pages = { 1: [] };
    mocks.messages.total = 0;
    mocks.messages.totalPages = 1;
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    /* R319 override (c3-S2): the log's heading joined the §B2 title-bar
       register — the count meta renders ONLY when a count exists, so the
       zero case shows the hatched EmptyCell (no fabricated «0», the same
       honesty the old «لا رسائل» subtitle carried). */
    expect(screen.getByText('لا توجد رسائل بعد')).toBeInTheDocument();
    expect(screen.queryByText('0 رسالة')).toBeNull();
    expect(screen.queryByText('لا رسائل')).toBeNull();
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

/* ── r157 / 6A9 — the teacher inbox unread surface ── */
describe('MessagesPage — unread count + mark-all-read (r157 / 6A9 · R319 c3-S2)', () => {
  it('unread > 0: the bar meta carries the mono count + UNREAD chip and «تعليم الكل كمقروء» fires the sweep', () => {
    seedMessages();
    // 3 of the 45 are incoming + unread (the server meta contract).
    mocks.messages.unread = 3;
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    /* R319 override (c3-S2): the unread share rode the Card subtitle
       («45 رسالة · 3 رسائل غير مقروءة»); it now rides the §B2 title
       bar's mono meta — the tabular total + the UNREAD n chip — with
       the countAr phrase kept for assistive tech. */
    expect(screen.getByText('UNREAD 3')).toBeInTheDocument();
    const barMeta = document.querySelector('.r319s-bar-meta');
    expect(barMeta).not.toBeNull();
    expect(barMeta!.textContent).toContain('45');
    expect(screen.getByText('45 رسالة')).toBeInTheDocument(); // the sr-only countAr phrase
    // …and the action exists.
    const markAll = screen.getByRole('button', { name: 'تعليم الكل كمقروء' });
    fireEvent.click(markAll);
    expect(mocks.markAll.mutate).toHaveBeenCalledTimes(1);
  });

  it('unread = 0: the sweep button hides — no dead affordance on a read inbox', () => {
    seedMessages();
    mocks.messages.unread = 0;
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    renderMessages();

    // The bar meta stays the plain count (no UNREAD summary chip — the
    // fixture's rows keep their own honest per-row chips)…
    expect(screen.queryByText(/^UNREAD \d+$/)).toBeNull();
    expect(screen.getByText('45 رسالة')).toBeInTheDocument(); // the sr-only countAr phrase
    // …and the button never renders (hidden at unread = 0).
    expect(screen.queryByRole('button', { name: 'تعليم الكل كمقروء' })).toBeNull();
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

    /* r183-B8 (A7 finding 2): the h1 follows the nav/topbar name
     * «الرسائل» — the old «صندوق الرسائل» was surface-name drift
     * (two names for one surface). */
    expect(screen.getByRole('heading', { level: 1, name: 'الرسائل' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'صندوق الرسائل' })).toBeNull();
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

/* ─── r180-F2 — the semester-grade entry half ──────────────────────
 * POST /offerings/:id/grades shipped backend-only until now; the page
 * answered with the honest «قيد التطوير» card. These pins hold the
 * contract the entry card promises: the placeholder is RETIRED (the
 * real card + its six-kind selector render), the payload carries ONLY
 * the rows the teacher actually filled (empty rows never zero a stored
 * grade), and a bad score is blocked inline with the grading modal's
 * copy instead of reaching the wire. */
describe('r180-F2 — GradesPage semester-grade entry', () => {
  beforeEach(() => {
    mocks.offerings = [OFFERING];
    mocks.students = [STUDENT, { ...STUDENT, studentId: 'st2', name: 'ليلى بن عامر', universityId: '223344' }];
    mocks.offeringGrades.data = [];
    mocks.upsertGrades.mutateAsync.mockReset();
    mocks.upsertGrades.mutateAsync.mockResolvedValue({});
    useToastStore.setState({ items: [] });
    act(() => { useAuthStore.setState({ user: TEACHER }); });
  });

  it('replaces the «قيد التطوير» dead-end with the real entry card', () => {
    const { unmount } = render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    );
    // The honest placeholder line is retired…
    expect(screen.queryByText(/قيد التطوير/)).toBeNull();
    // …the entry card, its kind selector and its save button are real.
    expect(screen.getByText('إدخال الدرجات الفصليّة')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'نوع التقييم' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ الدرجات' })).toBeInTheDocument();
    // The six GradeKind labels ride the selector.
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['واجب', 'اختبار قصير 1', 'اختبار قصير 2', 'نصفي', 'مشروع', 'نهائي']),
    );
    unmount();
  });

  it('saves ONLY the filled rows — empty rows never ride the payload', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    );
    // Two roster rows, ONE score filled (the FIRST student's).
    const scores = screen.getAllByPlaceholderText('0 – 100');
    expect(scores).toHaveLength(2);
    fireEvent.change(scores[0]!, { target: { value: '85' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجات' }));

    await waitFor(() => {
      expect(mocks.upsertGrades.mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(mocks.upsertGrades.mutateAsync).toHaveBeenCalledWith({
      grades: [{
        studentId: 'st1',
        kind: 'HOMEWORK',
        score: 85,
        maxScore: 100,
        weight: 10,
        feedback: undefined,
      }],
    });
    // The save landed — the drafts clear (the row reads empty again,
    // its truth now the invalidated grades read) and the Arabic toast
    // confirms it.
    await waitFor(() => {
      expect(scores[0]).toHaveValue(null);
    });
    const items = useToastStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ variant: 'success', message: 'حُفظت الدرجات وستظهر لطلاب المقرّر فوراً.' });
    unmount();
  });

  it('blocks a score above the column ceiling inline — the wire never sees it', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    );
    const scores = screen.getAllByPlaceholderText('0 – 100');
    fireEvent.change(scores[0]!, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجات' }));

    await waitFor(() => {
      expect(screen.getByText('الدرجة يجب ألّا تتجاوز 100.')).toBeInTheDocument();
    });
    expect(screen.getByText('صحّح الصفوف المعلَّمة قبل الحفظ.')).toBeInTheDocument();
    expect(mocks.upsertGrades.mutateAsync).not.toHaveBeenCalled();
    unmount();
  });

  it('prefills a stored grade for the picked kind (an upsert overwrites it)', () => {
    mocks.offeringGrades.data = [{
      id: 'g1',
      offeringId: 'off1',
      studentId: 'st1',
      kind: 'MIDTERM',
      score: 47,
      maxScore: 50,
      weight: 30,
      feedback: 'راجع الفصل الثاني',
      recordedAt: '2026-01-01T00:00:00.000Z',
      student: { id: 'st1', firstName: 'آمنة', lastName: 'العبيدي' },
    }];
    const { unmount } = render(
      <MemoryRouter>
        <GradesPage />
      </MemoryRouter>,
    );
    // HOMEWORK (the default) has no stored rows — every score input
    // starts empty…
    for (const input of screen.getAllByPlaceholderText('0 – 100')) {
      expect(input).toHaveValue(null);
    }
    // …switch to MIDTERM: the stored score AND feedback prefill their row.
    fireEvent.change(screen.getByRole('combobox', { name: 'نوع التقييم' }), { target: { value: 'MIDTERM' } });
    expect(screen.getByDisplayValue('47')).toBeInTheDocument();
    expect(screen.getByDisplayValue('راجع الفصل الثاني')).toBeInTheDocument();
    // The column's scale adopts the stored rows' (50/30), not the 100/10
    // defaults — a re-save never rewrites the stored denominator.
    expect(screen.getByLabelText('الدرجة العظمى')).toHaveValue(50);
    expect(screen.getByLabelText('الوزن (% من الدرجات)')).toHaveValue(30);
    unmount();
  });
});

/* ─── r144 — the teaching loop's authoring half (T1-h F1/F2) ──────
 * AssignmentsPage and MaterialsPage gained their creation affordances
 * (POST /offerings/:id/{assignments,materials} shipped backend-only
 * until now). These pins hold the contract the modals promise:
 * validation blocks bad input inline, a landed save closes the modal,
 * and the empty-state copy points at the button that exists. */
describe('r144 — AssignmentFormModal + MaterialFormModal (authoring half)', () => {
  it('AssignmentsPage renders the «واجب جديد» affordance the copy points at', () => {
    mocks.offerings = [OFFERING];
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /واجب جديد/ })).toBeInTheDocument();
    unmount();
  });

  it('AssignmentFormModal carries the sibling datetime pattern — hint, dir="ltr", Arabic echo (r183-B8 / A7 P3-1)', async () => {
    mocks.offerings = [OFFERING];
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /واجب جديد/ }));
    await screen.findByRole('dialog', { name: 'إنشاء واجب جديد' });

    // Empty state: the same calendar hint the three exam-authoring
    // siblings carry (ExamAuthorPages «يفتح في / يغلق في»)…
    expect(
      screen.getByText('اختر من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'),
    ).toBeInTheDocument();
    // …the control is dir="ltr" like its siblings (datetime-local
    // must not be bidi-scrambled by the RTL modal)…
    const due = screen.getByLabelText(/الموعد النهائي للتسليم/);
    expect(due).toHaveAttribute('dir', 'ltr');
    // …and picking a value swaps the hint for the verifiable echo.
    fireEvent.change(due, { target: { value: '2026-12-01T23:59' } });
    expect(screen.getByText(/^المحدَّد: /)).toBeInTheDocument();
    expect(
      screen.queryByText('اختر من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'),
    ).toBeNull();
    unmount();
  });

  it('AssignmentFormModal validates before submitting — empty due date blocks with an Arabic message', async () => {
    mocks.offerings = [OFFERING];
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /واجب جديد/ }));

    const dialog = await screen.findByRole('dialog', { name: 'إنشاء واجب جديد' });
    expect(dialog).toBeInTheDocument();

    // Fill title but leave the due date empty → the submit must be
    // blocked inline, not sent to the backend.
    fireEvent.change(screen.getByLabelText(/العنوان/), { target: { value: 'واجب الأسبوع الأول' } });
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الواجب' }));

    await waitFor(() => {
      expect(screen.getByText('حدّد الموعد النهائي للتسليم.')).toBeInTheDocument();
    });
    expect(mocks.createAssignment.mutateAsync).not.toHaveBeenCalled();
    unmount();
  });

  it('AssignmentFormModal submits the backend contract and closes on success', async () => {
    mocks.offerings = [OFFERING];
    mocks.createAssignment.mutateAsync.mockResolvedValueOnce({});
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /واجب جديد/ }));
    await screen.findByRole('dialog', { name: 'إنشاء واجب جديد' });

    fireEvent.change(screen.getByLabelText(/العنوان/), { target: { value: 'واجب الأسبوع الأول' } });
    fireEvent.change(screen.getByLabelText(/الموعد النهائي للتسليم/), { target: { value: '2026-12-01T23:59' } });
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الواجب' }));

    await waitFor(() => {
      expect(mocks.createAssignment.mutateAsync).toHaveBeenCalledTimes(1);
    });
    const call = mocks.createAssignment.mutateAsync.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.offeringId).toBe('off1');
    expect(call.title).toBe('واجب الأسبوع الأول');
    expect(call.type).toBe('HOMEWORK');
    expect(call.maxScore).toBe(100);
    // The wire contract is an ISO date, not the datetime-local string.
    expect(String(call.dueAt)).toMatch(/^2026-12-01T/);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'إنشاء واجب جديد' })).toBeNull();
    });
    unmount();
  });

  it('MaterialFormModal rejects a non-https link inline (the r142 backend guard, mirrored client-side)', async () => {
    mocks.offerings = [OFFERING];
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <MaterialsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /إضافة مادة/ }));
        // P3: link mode is the SECOND channel now — switch to it before
    // filling the by-link form (file mode is the default).
    fireEvent.click(screen.getByRole('button', { name: 'رابط خارجي' }));
    await screen.findByRole('dialog', { name: 'إضافة مادة تعليمية' });

    fireEvent.change(screen.getByLabelText(/اسم المادة/), { target: { value: 'شرائح الأسبوع الثالث' } });
    fireEvent.change(screen.getByLabelText(/الرابط \(https\)/), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة المادة' }));

    await waitFor(() => {
      expect(screen.getByText('الرابط يجب أن يبدأ بـ https://')).toBeInTheDocument();
    });
    expect(mocks.createMaterial.mutateAsync).not.toHaveBeenCalled();
    unmount();
  });

  it('MaterialFormModal submits the backend contract and closes on success', async () => {
    mocks.offerings = [OFFERING];
    mocks.createMaterial.mutateAsync.mockResolvedValueOnce({});
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const { unmount } = render(
      <MemoryRouter>
        <MaterialsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /إضافة مادة/ }));
        // P3: link mode is the SECOND channel now — switch to it before
    // filling the by-link form (file mode is the default).
    fireEvent.click(screen.getByRole('button', { name: 'رابط خارجي' }));
    await screen.findByRole('dialog', { name: 'إضافة مادة تعليمية' });

    fireEvent.change(screen.getByLabelText(/اسم المادة/), { target: { value: 'شرائح الأسبوع الثالث' } });
    fireEvent.change(screen.getByLabelText(/الرابط \(https\)/), { target: { value: 'https://cdn.example.com/lec3.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة المادة' }));

    await waitFor(() => {
      expect(mocks.createMaterial.mutateAsync).toHaveBeenCalledTimes(1);
    });
    const call = mocks.createMaterial.mutateAsync.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.offeringId).toBe('off1');
    expect(call.type).toBe('PDF');
    expect(call.url).toBe('https://cdn.example.com/lec3.pdf');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'إضافة مادة تعليمية' })).toBeNull();
    });
    unmount();
  });
});

/* ───────────────────────────────────────────────
 * P3 — MaterialFormModal's file mode: the direct PDF upload channel
 * (POST /offerings/:id/materials/file, raw body). The mode switch (Pill
 * pair, aria-pressed) picks the channel; file mode shows a real picker
 * whose name auto-fills the «اسم المادة» field, locks the type to a
 * static PDF chip, validates caps client-side, and lands through the
 * upload hook (toast + close).
 * ─────────────────────────────────────────────── */
describe('P3 — MaterialFormModal file mode (direct PDF upload)', () => {
  beforeEach(() => {
    mocks.offerings = [OFFERING];
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    useToastStore.setState({ items: [] });
  });

  function openModal() {
    render(
      <MemoryRouter>
        <MaterialsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /إضافة مادة/ }));
    return screen.findByRole('dialog', { name: 'إضافة مادة تعليمية' });
  }

  it('renders the two-channel switch with aria-pressed — file mode is the default', async () => {
    await openModal();
    const filePill = screen.getByRole('button', { name: 'ملف PDF' });
    const linkPill = screen.getByRole('button', { name: 'رابط خارجي' });
    expect(filePill.getAttribute('aria-pressed')).toBe('true');
    expect(linkPill.getAttribute('aria-pressed')).toBe('false');
    // File mode (default) shows a real PDF picker; the link field is absent.
    expect(screen.getByLabelText('ملف PDF')).toBeInstanceOf(HTMLInputElement);
    expect(screen.queryByLabelText(/الرابط/)).toBeNull();
  });

  it('picking a file auto-fills اسم المادة from the file name (still editable)', async () => {
    await openModal();
    const picker = screen.getByLabelText('ملف PDF') as HTMLInputElement;
    fireEvent.change(picker, { target: { files: [new File(['%PDF-1.4'], 'محاضرة_الأسبوع_الثالث.pdf', { type: 'application/pdf' })] } });
    const name = screen.getByLabelText(/اسم المادة/) as HTMLInputElement;
    // Derived from the file name, .pdf extension dropped.
    expect(name.value).toBe('محاضرة_الأسبوع_الثالث');
    // Still editable — a manual keystroke wins over the auto-fill.
    fireEvent.change(name, { target: { value: 'محاضرة معدلة' } });
    expect((screen.getByLabelText(/اسم المادة/) as HTMLInputElement).value).toBe('محاضرة معدلة');
  });

  it('rejects a non-PDF file client-side — the Arabic error lands BEFORE any request', async () => {
    await openModal();
    const picker = screen.getByLabelText('ملف PDF') as HTMLInputElement;
    fireEvent.change(picker, { target: { files: [new File(['x'], 'slides.txt', { type: 'text/plain' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة المادة' }));

    await waitFor(() => {
      expect(screen.getByText('الملف يجب أن يكون بصيغة PDF فقط.')).toBeInTheDocument();
    });
    expect(mocks.uploadMaterial.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.createMaterial.mutateAsync).not.toHaveBeenCalled();
  });

  it('submits through the upload hook and closes + toasts on success', async () => {
    mocks.uploadMaterial.mutateAsync.mockResolvedValueOnce({});
    await openModal();
    const picker = screen.getByLabelText('ملف PDF') as HTMLInputElement;
    fireEvent.change(picker, { target: { files: [new File(['%PDF-1.4'], 'lecture-03.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة المادة' }));

    await waitFor(() => {
      expect(mocks.uploadMaterial.mutateAsync).toHaveBeenCalledTimes(1);
    });
    const call = mocks.uploadMaterial.mutateAsync.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.offeringId).toBe('off1');
    expect(call.name).toBe('lecture-03');
    expect(call.file).toBeInstanceOf(File);
    // The by-link mutation never fires in file mode.
    expect(mocks.createMaterial.mutateAsync).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'إضافة مادة تعليمية' })).toBeNull();
    });
    const items = useToastStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ variant: 'success', message: 'أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.' });
  });

  it('link mode keeps the by-link form exactly (type select + https field)', async () => {
    await openModal();
    fireEvent.click(screen.getByRole('button', { name: 'رابط خارجي' }));
    await waitFor(() => {
      expect(screen.queryByLabelText('ملف PDF')).toBeNull();
    });
    const typeSelect = screen.getByLabelText('النوع') as HTMLSelectElement;
    expect(typeSelect.value).toBe('PDF');
    expect(screen.getByLabelText(/الرابط \(https\)/)).toBeInstanceOf(HTMLInputElement);
  });
});

/* ── E (workstream 3-a): the queue sub-line's overdue copy + the
 * assignments ratio badge's deadline awareness ─────────────────── */
describe('queueDueLabel — the queue sub-line due copy (E / 3-a)', () => {
  it('flips the verb for an overdue group: «استحقّ منذ يومين» — never the contradictory «يستحقّ انتهى منذ يومين»', () => {
    const overdue = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(queueDueLabel(overdue)).toBe('استحقّ منذ يومين');
    expect(queueDueLabel(overdue)).not.toContain('انتهى');
  });

  it('keeps the present tense for future dates — today, tomorrow, counted days, calendar date', () => {
    expect(queueDueLabel(new Date().toISOString())).toBe('يستحقّ اليوم');
    expect(queueDueLabel(new Date(Date.now() + 86_400_000).toISOString())).toBe('يستحقّ غداً');
    expect(queueDueLabel(new Date(Date.now() + 3 * 86_400_000).toISOString())).toBe('يستحقّ بعد 3 أيام');
    // ≥7 days out, the calendar date rides the same present-tense prefix.
    const far = queueDueLabel(new Date(Date.now() + 10 * 86_400_000).toISOString());
    expect(far.startsWith('يستحقّ ')).toBe(true);
    expect(far).not.toContain('منذ');
  });
});

describe('AssignmentsPage — the ratio badge keys off the deadline (E / 3-a)', () => {
  it('a future-due assignment with a low ratio renders NEUTRAL — low uptake is not a problem yet', () => {
    mocks.assignments = [{
      ...ASSIGNMENT,
      submissions: 1,
      enrolled: 4, // 25% — the old ratio-only tone map painted this red
      dueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    }];
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    const ratio = screen.getByText('25%');
    expect(ratio).toHaveClass('badge');
    // NEUTRAL: no tone class rides the badge (Badge with no color).
    expect(ratio.classList.contains('red')).toBe(false);
    expect(ratio.classList.contains('amber')).toBe(false);
    expect(ratio.classList.contains('green')).toBe(false);
  });

  it('overdue keeps the strict mapping; due today is urgent; a healthy future ratio stays green', () => {
    mocks.assignments = [
      { ...ASSIGNMENT, id: 'late', title: 'واجب متأخر', submissions: 1, enrolled: 4, dueAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
      { ...ASSIGNMENT, id: 'today', title: 'واجب اليوم', submissions: 2, enrolled: 4, dueAt: new Date().toISOString() },
      { ...ASSIGNMENT, id: 'early', title: 'واجب مبكر', submissions: 3, enrolled: 4, dueAt: new Date(Date.now() + 5 * 86_400_000).toISOString() },
    ];
    render(
      <MemoryRouter>
        <AssignmentsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('25%')).toHaveClass('red');   // overdue + low uptake → strict red
    expect(screen.getByText('50%')).toHaveClass('amber'); // due today counts as urgent
    expect(screen.getByText('75%')).toHaveClass('green'); // future + healthy → green either way
  });
});
