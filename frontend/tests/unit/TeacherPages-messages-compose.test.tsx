/**
 * r170a — MessagesPage compose + reply (closing the read-only gap the
 * subtitle used to confess: «الردّ والإنشاء غير متاحَين بعد»).
 *
 * Layers pinned here:
 *   1. PURE DECISIONS — validateMessageDraft mirrors the backend zod
 *      contract (recipient cuid required, body 1–4000 AFTER trim);
 *      sendErrorMessage maps 429 (the limiter's Latin-only default) to
 *      Arabic while letting the route's own Arabic 400/404 copy ride
 *      verbatim; collectCorrespondents builds the inbox-side recipient
 *      pool (incoming → sender, sent → recipient, deduped, self and
 *      no-session excluded) — the honest scope documented in
 *      TeacherPages (no fabricated user directory).
 *   2. MODAL WIRING — «رسالة جديدة» opens the shared Modal; a blank
 *      submit surfaces BOTH field-level errors with the FormField ARIA
 *      contract (aria-invalid + aria-describedby → the role=alert
 *      message); a filled draft calls useSendMessage with the TRIMMED
 *      body; the reply button prefills the sender; sent rows get no
 *      reply door; Escape closes and returns focus to the opener.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  MessagesPage,
  validateMessageDraft,
  sendErrorMessage,
  collectCorrespondents,
  MESSAGE_MAX_CHARS,
} from '../../src/pages/teacher/TeacherPages';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  offerings: [] as unknown[],
  students: [] as unknown[],
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
  useTeacherOfferings: () => ({
    data: mocks.offerings,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  /* Mirror the REAL hook's enabled gate: no offering chosen → no roster
   * (data undefined) — the student optgroup must not appear before the
   * teacher picks a course. */
  useTeacherStudents: (offeringId?: string) => ({
    data: offeringId ? mocks.students : undefined,
    isPending: false,
    isError: false,
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
  course: { id: 'c1', code: 'SE101', name: 'هندسة البرمجيات', iconEmoji: null, themeColor: null, credits: 3 },
  _count: { enrollments: 2, assignments: 1, lectures: 4, examTemplates: 0 },
  schedule: [],
};

const ROSTER_STUDENT = {
  studentId: 'st1',
  name: 'أحمد الزروق',
  universityId: '123456',
  avatarInitials: null,
  avatarColor: null,
  attendancePct: 92,
  absences: 1,
  lateCount: 0,
  avgGrade: 84,
  watchPct: 10,
  riskScore: 40,
  riskLevel: 'OK',
  signals: [],
  suggestion: '',
};

const user = (id: string, firstName: string, lastName: string) => ({
  id, firstName, lastName, avatarColor: null,
});

const message = (overrides?: Record<string, unknown>) => ({
  id: 'm1',
  body: 'مرحباً أستاذ، لدي سؤال عن الواجب.',
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  fromUser: user('s1', 'آمنة', 'العبيدي'),
  toUser: user('t1', 'سالم', 'الطاهر'),
  ...overrides,
});

beforeEach(() => {
  mocks.offerings = [OFFERING];
  mocks.students = [ROSTER_STUDENT];
  mocks.messages = { pages: {}, total: 0, totalPages: 1, unread: 0 };
  mocks.markAll = { mutate: vi.fn(), isPending: false, isError: false, error: null };
  mocks.send = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
});

afterEach(() => {
  act(() => { useAuthStore.setState({ user: null }); });
});

/* ── Pure decisions ──────────────────────────────────────────── */

describe('validateMessageDraft — the zod contract mirrored client-side', () => {
  it('blank form → BOTH errors (recipient first-class, not an afterthought)', () => {
    expect(validateMessageDraft('', '')).toEqual({
      recipient: 'اختر مستلِماً أولاً.',
      body: 'نص الرسالة مطلوب.',
    });
  });

  it('whitespace-only body fails the min — the backend trims before validating', () => {
    expect(validateMessageDraft('s1', '   \n\t  ')).toEqual({ body: 'نص الرسالة مطلوب.' });
  });

  it('exactly MESSAGE_MAX_CHARS trimmed passes; one more fails with the cap named', () => {
    const at = 'ا'.repeat(MESSAGE_MAX_CHARS);
    expect(validateMessageDraft('s1', at)).toEqual({});
    expect(validateMessageDraft('s1', ` ${at} `)).toEqual({}); // trim-aware
    expect(validateMessageDraft('s1', `${at}ا`).body).toBe('الرسالة طويلة — الحد الأقصى 4000 حرف.');
  });

  it('MESSAGE_MAX_CHARS pins the backend cap (sendMessageSchema max)', () => {
    expect(MESSAGE_MAX_CHARS).toBe(4000);
  });
});

describe('sendErrorMessage — status → Arabic copy mapping', () => {
  it('429 (the per-user limiter) gets its own Arabic line — the limiter default is Latin-only', () => {
    expect(sendErrorMessage({ response: { status: 429, data: { error: { message: 'Too many requests.' } } } }))
      .toBe('طلبات إرسال كثيرة — انتظر قليلاً ثم أعد المحاولة.');
  });

  it('the route\'s own Arabic 400 message rides verbatim (self-send)', () => {
    expect(sendErrorMessage({ response: { status: 400, data: { error: { message: 'لا يمكنك إرسال رسالة إلى نفسك' } } } }))
      .toBe('لا يمكنك إرسال رسالة إلى نفسك');
  });

  it('the route\'s 404 message rides verbatim', () => {
    expect(sendErrorMessage({ response: { status: 404, data: { error: { message: 'المستلم غير موجود' } } } }))
      .toBe('المستلم غير موجود');
  });

  it('Latin-only bodies and network failures fall back to the Arabic connectivity line', () => {
    expect(sendErrorMessage({ response: { status: 500, data: { error: { message: 'Internal error' } } } }))
      .toBe('تعذَّر إرسال الرسالة — تحقّق من اتصالك ثم أعد المحاولة.');
    expect(sendErrorMessage(new Error('network down')))
      .toBe('تعذَّر إرسال الرسالة — تحقّق من اتصالك ثم أعد المحاولة.');
  });
});

describe('collectCorrespondents — the inbox-side recipient pool', () => {
  it('incoming rows yield the SENDER; sent rows yield the RECIPIENT; duplicates merge', () => {
    const pool = collectCorrespondents([
      message({ id: 'm1' }), // incoming from s1
      message({ id: 'm2', readAt: null }), // incoming from s1 again → dedup
      message({ id: 'm3', fromUser: user('t1', 'سالم', 'الطاهر'), toUser: user('a1', 'المسجل', 'العام') }), // sent → a1 — R320 override: the ADMIN correspondent is «المسجل العام» (§B rename)
    ], 't1');
    expect(pool).toEqual([
      { id: 's1', name: 'آمنة العبيدي' },
      { id: 'a1', name: 'المسجل العام' },
    ]);
  });

  it('no session (logout race with stale cache) → empty pool, never the teacher\'s own name', () => {
    expect(collectCorrespondents([message()], null)).toEqual([]);
  });

  it('self-DM rows (backend-blocked, defensively) never enter the pool', () => {
    expect(collectCorrespondents([
      message({ fromUser: user('t1', 'سالم', 'الطاهر'), toUser: user('t1', 'سالم', 'الطاهر') }),
    ], 't1')).toEqual([]);
  });
});

/* ── Compose modal wiring ───────────────────────────────────── */

describe('MessagesPage — compose (r170a)', () => {
  it('"رسالة جديدة" opens the modal; Escape closes it and returns focus to the opener', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    const opener = screen.getByRole('button', { name: 'رسالة جديدة' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'رسالة جديدة' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('blank submit → both field errors via the FormField ARIA contract (aria-invalid + described-by the alert)', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

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
    // The counter hint stays associated alongside the error.
    expect(textarea.getAttribute('aria-describedby')).toBeTruthy();

    // Nothing was sent.
    expect(mocks.send.mutateAsync).not.toHaveBeenCalled();
  });

  it('a filled draft sends the TRIMMED body to the picked recipient and closes the modal', async () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    mocks.messages = {
      pages: { 1: [message({ id: 'm1', readAt: null })] },
      total: 1,
      totalPages: 1,
      unread: 1,
    };
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    fireEvent.change(screen.getByLabelText('المستلِم'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('نص الرسالة'), { target: { value: '  نص الرسالة المُرسَلة  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الرسالة' }));

    await waitFor(() => {
      expect(mocks.send.mutateAsync).toHaveBeenCalledWith({ toUserId: 's1', body: 'نص الرسالة المُرسَلة' });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('the roster path: picking an offering lists its students; picking one sends to the studentId', async () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    // Empty inbox → the honest no-recipients hint rides the field.
    expect(screen.getByText(/لا يوجد مستلمون متاحون بعد/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('المقرّر (لاختيار أحد طلابك)'), { target: { value: 'off1' } });
    const recipient = screen.getByLabelText('المستلِم') as HTMLSelectElement;
    const studentOption = Array.from(recipient.options).find((o) => o.value === 'st1');
    expect(studentOption).toBeDefined();
    expect(studentOption?.textContent).toContain('أحمد الزروق');
    expect(studentOption?.closest('optgroup')?.label).toBe('طلاب هندسة البرمجيات');

    fireEvent.change(recipient, { target: { value: 'st1' } });
    fireEvent.change(screen.getByLabelText('نص الرسالة'), { target: { value: 'تذكير بالموعد' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الرسالة' }));

    await waitFor(() => {
      expect(mocks.send.mutateAsync).toHaveBeenCalledWith({ toUserId: 'st1', body: 'تذكير بالموعد' });
    });
  });

  it('the body is capped at 4000 client-side and the counter rides the field', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    const textarea = screen.getByLabelText('نص الرسالة');
    expect(textarea).toHaveAttribute('maxlength', '4000');

    fireEvent.change(textarea, { target: { value: 'خمسة' } });
    // 'خمسة' is 4 characters — the counter is a live length, not a word
    // meaning. It rides the FormField hint <p>, whose nested <bdi> runs
    // (4 / 4000) are invisible to getByText's direct-text matcher — so
    // assert on the hint node's own textContent.
    const hints = [...document.querySelectorAll('.form-field-hint')].map((h) => h.textContent);
    expect(hints).toContain('4 / 4000 حرف');
  });

  it('a server 429 renders the Arabic rate-limit line; a 400 renders the route\'s own Arabic message', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    mocks.send = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: true,
      error: { response: { status: 429, data: { error: { message: 'Too many requests.' } } } },
    };
    const { rerender } = render(<MemoryRouter><MessagesPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'رسالة جديدة' }));
    expect(screen.getByText('طلبات إرسال كثيرة — انتظر قليلاً ثم أعد المحاولة.')).toBeInTheDocument();

    mocks.send = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: true,
      error: { response: { status: 400, data: { error: { message: 'لا يمكنك إرسال رسالة إلى نفسك' } } } },
    };
    rerender(<MemoryRouter><MessagesPage /></MemoryRouter>);
    expect(screen.getByText('لا يمكنك إرسال رسالة إلى نفسك')).toBeInTheDocument();
  });
});

/* ── Reply wiring ───────────────────────────────────────────── */

describe('MessagesPage — reply (r170a)', () => {
  it('incoming rows carry a «ردّ» door that prefills the sender as recipient', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    mocks.messages = {
      pages: { 1: [message({ id: 'm1', readAt: null })] },
      total: 1,
      totalPages: 1,
      unread: 1,
    };
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    const replyBtn = screen.getByRole('button', { name: 'ردّ على رسالة آمنة العبيدي' });
    fireEvent.click(replyBtn);

    const dialog = screen.getByRole('dialog', { name: 'ردّ على رسالة' });
    expect(dialog).toBeInTheDocument();
    // The offering selector stays out of a reply (nothing to discover).
    expect(screen.queryByLabelText('المقرّر (لاختيار أحد طلابك)')).toBeNull();
    const select = screen.getByLabelText('المستلِم') as HTMLSelectElement;
    expect(select.value).toBe('s1');
  });

  it('sent rows get NO reply door (the backend 400s self-shaped replies)', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    mocks.messages = {
      pages: { 1: [message({ id: 'm1', fromUser: user('t1', 'سالم', 'الطاهر'), toUser: user('s1', 'آمنة', 'العبيدي'), readAt: null })] },
      total: 1,
      totalPages: 1,
      unread: 0,
    };
    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    expect(screen.queryAllByRole('button', { name: /ردّ/ })).toHaveLength(0);
  });
});
