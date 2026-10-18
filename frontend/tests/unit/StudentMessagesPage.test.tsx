/**
 * r171a — the student messages inbox (the DM lifecycle's student half).
 *
 * The backend messaging API has been role-agnostic since r157/r170a,
 * but students had NO inbox: they received DMs whose notification
 * carried link:null ("until an inbox exists for them"). The student
 * page now rides the shared components/messages pair — the SAME inbox
 * the teacher page renders, with the student's honest recipient pool.
 *
 * Layers pinned here:
 *   1. INBOX — rows render from the mocked useMyMessages (incoming +
 *      sent), the unread incoming row wears the brand badge, the sent
 *      row carries the «أنت:» prefix and NO reply door (the backend
 *      400s self-shaped replies).
 *   2. REPLY — the incoming row's «ردّ» door opens the compose modal
 *      preset with the sender as recipient.
 *   3. RECIPIENT POOL — the enrolled-teachers optgroup derives from the
 *      mocked useMyEnrollments, with teachers DEDUPED by id across
 *      offerings sharing a teacher (the course detail is the first
 *      shared enrollment's); the loading state shows a pending option;
 *      an empty pool + no correspondents surfaces the honest hint.
 *   4. ARIA CONTRACT — a blank submit surfaces BOTH field-level errors
 *      (aria-invalid + aria-describedby → the role=alert message).
 *   5. NAV — '/student/messages' is a STUDENT_NAV destination.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudentMessagesPage } from '../../src/pages/student/MessagesPage';
import { STUDENT_NAV } from '../../src/lib/nav';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  enrollments: [] as unknown[],
  enrollmentsPending: false,
  enrollmentsError: false,
  messages: {
    pages: {} as Record<number, Array<Record<string, unknown>>>,
    total: 0,
    totalPages: 1,
    unread: 0,
  },
  markAll: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
  send: { mutateAsync: vi.fn(), isPending: false, isError: false, error: null as unknown },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyEnrollments: () => ({
    data: mocks.enrollmentsPending || mocks.enrollmentsError ? undefined : mocks.enrollments,
    isPending: mocks.enrollmentsPending,
    isError: mocks.enrollmentsError,
    error: null,
    refetch: vi.fn(),
  }),
  useMyMessages: (page: number, limit: number) => ({
    data: {
      data: mocks.messages.pages[page] ?? [],
      meta: {
        total: mocks.messages.total,
        page,
        limit,
        totalPages: mocks.messages.totalPages,
        unread: mocks.messages.unread,
      },
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMarkAllMessagesRead: () => mocks.markAll,
  useSendMessage: () => mocks.send,
  apiErrorMessage: (error: unknown, fallback: string) => {
    const msg = (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message;
    return typeof msg === 'string' && /[\u0600-\u06FF]/.test(msg) ? msg : fallback;
  },
}));

const STUDENT: AuthUser = {
  id: 's1',
  email: 'amna@zu.edu.ly',
  firstName: 'آمنة',
  lastName: 'العبيدي',
  role: 'STUDENT',
};

const user = (id: string, firstName: string, lastName: string) => ({
  id, firstName, lastName, avatarColor: null,
});

const message = (overrides?: Record<string, unknown>) => ({
  id: 'm1',
  body: 'مرحباً، لدي سؤال عن موعد الاختبار.',
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  fromUser: user('t1', 'سالم', 'الطاهر'),
  toUser: user('s1', 'آمنة', 'العبيدي'),
  ...overrides,
});

/** One enrolled offering — the GET /enrollments/me row shape
 * (MyEnrollment: offering.teacher + offering.course are projected). */
const enrollment = (
  offeringId: string,
  courseName: string,
  teacher: { id: string; firstName: string; lastName: string },
) => ({
  id: `enr-${offeringId}`,
  progressPct: 10,
  offering: {
    id: offeringId,
    course: { id: `c-${offeringId}`, code: 'SE101', name: courseName, iconEmoji: null, themeColor: null, credits: 3 },
    teacher,
    schedule: [],
  },
});

beforeEach(() => {
  mocks.enrollments = [
    // TWO offerings sharing teacher t1 → ONE pickable person (dedupe);
    // the course detail is the FIRST shared enrollment's.
    enrollment('off1', 'هندسة البرمجيات', { id: 't1', firstName: 'سالم', lastName: 'الطاهر' }),
    enrollment('off2', 'قواعد البيانات', { id: 't1', firstName: 'سالم', lastName: 'الطاهر' }),
    enrollment('off3', 'شبكات الحاسوب', { id: 't2', firstName: 'منصور', lastName: 'الفيتوري' }),
  ];
  mocks.enrollmentsPending = false;
  mocks.enrollmentsError = false;
  mocks.messages = { pages: {}, total: 0, totalPages: 1, unread: 0 };
  mocks.markAll = { mutate: vi.fn(), isPending: false, isError: false, error: null };
  mocks.send = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
});

afterEach(() => {
  act(() => { useAuthStore.setState({ user: null }); });
});

/* ── Inbox rows ─────────────────────────────────────────────── */

describe('StudentMessagesPage — inbox rows (r171a)', () => {
  it('renders incoming + sent rows from useMyMessages; unread incoming wears the brand badge', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.messages = {
      pages: {
        1: [
          message({ id: 'm1', readAt: null }),
          message({ id: 'm2', readAt: '2026-03-01T09:00:00Z' }),
          message({
            id: 'm3',
            readAt: null,
            fromUser: user('s1', 'آمنة', 'العبيدي'),
            toUser: user('t1', 'سالم', 'الطاهر'),
          }),
        ],
      },
      total: 3,
      totalPages: 1,
      unread: 1,
    };
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    // All three rows render; the other party names them.
    expect(screen.getAllByText(/سالم الطاهر/)).toHaveLength(3);
    // Exactly ONE unread badge (the unread incoming row).
    expect(screen.getAllByText('غير مقروءة')).toHaveLength(1);
    // The sent row carries the «أنت:» prefix.
    expect(screen.getByText(/أنت: مرحباً، لدي سؤال عن موعد الاختبار/)).toBeInTheDocument();
  });

  it('sent rows get NO reply door (the backend 400s self-shaped replies)', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.messages = {
      pages: {
        1: [
          message({
            id: 'm1',
            fromUser: user('s1', 'آمنة', 'العبيدي'),
            toUser: user('t1', 'سالم', 'الطاهر'),
            readAt: null,
          }),
        ],
      },
      total: 1,
      totalPages: 1,
      unread: 0,
    };
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    expect(screen.queryAllByRole('button', { name: /ردّ/ })).toHaveLength(0);
  });
});

/* ── Reply ──────────────────────────────────────────────────── */

describe('StudentMessagesPage — reply (r171a)', () => {
  it('the incoming row\'s «ردّ» door opens the compose preset with the sender as recipient', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.messages = {
      pages: { 1: [message({ id: 'm1', readAt: null })] },
      total: 1,
      totalPages: 1,
      unread: 1,
    };
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'ردّ على رسالة سالم الطاهر' }));

    expect(screen.getByRole('dialog', { name: 'ردّ على رسالة' })).toBeInTheDocument();
    const select = screen.getByLabelText('المستلِم') as HTMLSelectElement;
    expect(select.value).toBe('t1');
  });
});

/* ── Compose + the honest recipient pool ────────────────────── */

describe('StudentMessagesPage — compose recipients (r171a)', () => {
  it('the enrolled-teachers optgroup rides the recipient select, DEDUPED across offerings sharing a teacher', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    const select = screen.getByLabelText('المستلِم') as HTMLSelectElement;

    // The optgroup exists with its honest label…
    const group = Array.from(select.options)
      .map((o) => o.closest('optgroup'))
      .find((g) => g?.label === 'أساتذة مقرّراتي');
    expect(group).toBeDefined();

    // …and holds exactly ONE option per teacher id: t1 twice-enrolled →
    // once, with the FIRST shared enrollment's course as the detail.
    const t1Options = Array.from(select.options).filter((o) => o.value === 't1');
    expect(t1Options).toHaveLength(1);
    expect(t1Options[0]?.textContent).toBe('سالم الطاهر · هندسة البرمجيات');

    const t2Options = Array.from(select.options).filter((o) => o.value === 't2');
    expect(t2Options).toHaveLength(1);
    expect(t2Options[0]?.textContent).toBe('منصور الفيتوري · شبكات الحاسوب');
  });

  it('while enrollments load, the recipient select carries the pending option', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.enrollmentsPending = true;
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    expect(screen.getByText('جارٍ تحميل أساتذة مقرّراتك…')).toBeInTheDocument();
  });

  it('no enrolled teachers + no correspondents → the honest empty-pool hint on the recipient field', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.enrollments = [];
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    expect(screen.getByText(/لا يوجد مستلمون متاحون بعد/)).toBeInTheDocument();
  });

  it('a filled draft sends the TRIMMED body to the picked teacher and closes the modal', async () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    fireEvent.change(screen.getByLabelText('المستلِم'), { target: { value: 't1' } });
    fireEvent.change(screen.getByLabelText('نص الرسالة'), { target: { value: '  سؤال عن الواجب الثاني  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الرسالة' }));

    await waitFor(() => {
      expect(mocks.send.mutateAsync).toHaveBeenCalledWith({ toUserId: 't1', body: 'سؤال عن الواجب الثاني' });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('blank submit → both field errors via the FormField ARIA contract (aria-invalid + described-by the alert)', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    render(<MemoryRouter><StudentMessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الرسالة' }));

    const recipientError = screen.getByText('اختر مستلِماً أولاً.');
    const bodyError = screen.getByText('نص الرسالة مطلوب.');
    expect(recipientError).toHaveAttribute('role', 'alert');
    expect(bodyError).toHaveAttribute('role', 'alert');

    const select = screen.getByLabelText('المستلِم');
    const textarea = screen.getByLabelText('نص الرسالة');
    expect(select.getAttribute('aria-describedby')).toContain(recipientError.id);
    expect(textarea.getAttribute('aria-describedby')).toContain(bodyError.id);

    // Nothing was sent.
    expect(mocks.send.mutateAsync).not.toHaveBeenCalled();
  });
});

/* ── Nav coverage ───────────────────────────────────────────── */

describe('nav — the student inbox has a sidebar home (r171a)', () => {
  // r183-B7: the group was re-cut from «حسابي والخدمات» to «حسابي» —
  // the university-services items moved to the collapsed «خدمات
  // الجامعة» group (A4 P2-3 drawer budget). The inbox placement
  // contract is unchanged.
  it("'/student/messages' is a STUDENT_NAV destination in «حسابي», between profile and alerts", () => {
    const group = STUDENT_NAV.find((g) => g.label === 'حسابي');
    expect(group).toBeDefined();
    const tos = group!.items.map((i) => i.to);
    expect(tos).toContain('/student/messages');
    // The brief's placement: between /student/profile and /student/alerts.
    expect(tos.indexOf('/student/profile')).toBe(tos.indexOf('/student/messages') - 1);
    expect(tos.indexOf('/student/messages')).toBe(tos.indexOf('/student/alerts') - 1);
    // The label IS the route's title source (AppShell NAV_TITLES).
    expect(group!.items.find((i) => i.to === '/student/messages')?.label).toBe('الرسائل');
  });
});
