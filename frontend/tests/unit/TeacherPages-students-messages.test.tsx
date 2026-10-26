/**
 * r164-h — StudentsList / Messages coherence.
 *
 * 1. StudentsList rows are doors: the student's name links to the
 *    offering's intelligence deep dive (the risk context), and the new
 *    «المخاطرة» column wears the SAME risk vocabulary the intelligence
 *    page's risk rows use — a teacher scanning the roster sees WHO
 *    needs the tap before tapping.
 * 2. Messages read-state: the row-level unread marker (isUnreadIncoming
 *    — incoming AND readAt null) rides the same brand-Badge grammar the
 *    alerts log uses; the /messages backend already projects the full
 *    Message row (readAt included) — the shared interface just never
 *    declared it (widened locally in TeacherPages).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudentsListPage, MessagesPage, isUnreadIncoming } from '../../src/pages/teacher/TeacherPages';
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
  /* r170a: the compose mutation — MessagesPage renders the compose
   * modal on demand, so the shared useResources mock needs the key. */
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
  useTeacherStudents: () => ({
    data: mocks.students,
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

const student = (id: string, name: string, riskLevel: string) => ({
  studentId: id,
  name,
  universityId: '123456',
  avatarInitials: null,
  avatarColor: null,
  attendancePct: 92,
  absences: 1,
  lateCount: 0,
  avgGrade: 84,
  watchPct: 10,
  riskScore: 40,
  riskLevel,
  signals: [],
  suggestion: '',
});

const message = (overrides?: Record<string, unknown>) => ({
  id: 'm1',
  body: 'مرحباً أستاذ، لدي سؤال عن الواجب.',
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  fromUser: { id: 's1', firstName: 'آمنة', lastName: 'العبيدي', avatarColor: null },
  toUser: { id: 't1', firstName: 'سالم', lastName: 'الطاهر', avatarColor: null },
  ...overrides,
});

beforeEach(() => {
  mocks.offerings = [OFFERING];
  mocks.students = [];
  mocks.messages = { pages: {}, total: 0, totalPages: 1, unread: 0 };
  mocks.markAll = { mutate: vi.fn(), isPending: false, isError: false, error: null };
  mocks.send = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
});

afterEach(() => {
  act(() => { useAuthStore.setState({ user: null }); });
});

/* ── Pure decision ──────────────────────────────────────────── */

describe('isUnreadIncoming — the row-level unread marker (r164-h)', () => {
  it('incoming + readAt null → unread', () => {
    expect(isUnreadIncoming(message({ readAt: null }), 't1')).toBe(true);
    expect(isUnreadIncoming({ toUser: { id: 't1' }, readAt: null }, 't1')).toBe(true);
  });

  it('incoming but already read → not unread', () => {
    expect(isUnreadIncoming(message({ readAt: '2026-03-01T09:00:00Z' }), 't1')).toBe(false);
  });

  it('sent rows never carry the marker (readAt is the recipient\'s)', () => {
    expect(isUnreadIncoming(message({ readAt: null, fromUser: { id: 't1', firstName: 'سالم', lastName: 'الطاهر', avatarColor: null }, toUser: { id: 's1', firstName: 'آمنة', lastName: 'العبيدي', avatarColor: null } }), 't1')).toBe(false);
  });

  it('no session → no marker (never a false positive during logout races)', () => {
    expect(isUnreadIncoming(message({ readAt: null }), null)).toBe(false);
  });
});

/* ── StudentsList coherence ──────────────────────────────────── */

describe('StudentsListPage — rows link to the risk context (r164-h)', () => {
  it('the student\'s name is ONE tap from the offering\'s intelligence deep dive', () => {
    mocks.students = [student('st1', 'آمنة العبيدي', 'AT_RISK'), student('st2', 'خالد المصري', 'OK')];

    render(<MemoryRouter><StudentsListPage /></MemoryRouter>);

    // Every row's name cell links into the SAME offering's intelligence
    // page (where that student's risk row lives).
    const links = document.querySelectorAll('a[href="/teacher/intelligence/off1"]');
    expect(links).toHaveLength(2);
    expect(screen.getByText('آمنة العبيدي')).toBeInTheDocument();
  });

  it('the «المخاطرة» column wears the intelligence page\'s risk vocabulary', () => {
    mocks.students = [student('st1', 'آمنة العبيدي', 'AT_RISK'), student('st2', 'خالد المصري', 'CRITICAL')];

    render(<MemoryRouter><StudentsListPage /></MemoryRouter>);

    // The same labels TeacherIntelligencePage's risk rows render —
    // one vocabulary across the roster and the risk panel.
    expect(screen.getByText('في خطر')).toBeInTheDocument();
    expect(screen.getByText('حرج')).toBeInTheDocument();
    // The column header exists (screen-reader + stacked-table label).
    expect(screen.getByText('المخاطرة')).toBeInTheDocument();
  });
});

/* ── Messages read-state ─────────────────────────────────────── */

describe('MessagesPage — read-state visibility (r164-h)', () => {
  it('unread incoming rows wear the §B2 UNREAD mono chip — read rows and sent rows never do (R319 c3-S2 override)', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    mocks.messages = {
      pages: {
        1: [
          message({ id: 'm1', readAt: null }),
          message({ id: 'm2', readAt: '2026-03-01T09:00:00Z' }),
          message({
            id: 'm3',
            readAt: null,
            fromUser: { id: 't1', firstName: 'سالم', lastName: 'الطاهر', avatarColor: null },
            toUser: { id: 's1', firstName: 'آمنة', lastName: 'العبيدي', avatarColor: null },
          }),
        ],
      },
      total: 3,
      totalPages: 1,
      unread: 1,
    };

    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    /* R319 override (c3-S2): the shared inbox's read-state rides the
       §B2 mono chip register — UNREAD — for BOTH roles. */
    expect(screen.getAllByText('UNREAD')).toHaveLength(1);
    // All three rows rendered (the read + sent rows stay unbadged).
    expect(screen.getAllByText(/لدي سؤال عن الواجب/)).toHaveLength(3);
  });

  it('a fully read inbox renders no badges (the mark-all affordance stays hidden too)', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    mocks.messages = {
      pages: { 1: [message({ id: 'm2', readAt: '2026-03-01T09:00:00Z' })] },
      total: 1,
      totalPages: 1,
      unread: 0,
    };

    render(<MemoryRouter><MessagesPage /></MemoryRouter>);

    expect(screen.queryByText('UNREAD')).toBeNull();
    expect(screen.queryByRole('button', { name: /تعليم الكل كمقروء/ })).toBeNull();
  });
});
