/**
 * r157 (W2-F9 / 6A9) — TeacherLivePage pins.
 *
 * The live control center's two honest-count surfaces:
 *  1. the «جلسات قادمة» subtitle rides countAr grammar — the old
 *     `${n} جلسة مجدولة` template broke at 0 («0 جلسة مجدولة») and at 2
 *     («2 جلسة مجدولة»); the zero case names the reality.
 *  2. the past-sessions list is capped at 10 rows — the cap itself is
 *     old, but it was SILENT: the disclosure «أحدث 10 جلسات من أصل N»
 *     now says how much is hidden (the truncation-disclosure rule).
 *
 * Hooks are mocked at the useResources boundary (the TeacherPages
 * pattern); no lifecycle action is fired by these read-only pins.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from '@testing-library/react';
import TeacherLivePage from '../../src/pages/teacher/TeacherLivePage';
import { useAuthStore } from '../../src/stores/auth.store';
import type { LiveSessionRow } from '../../src/hooks/useResources';

const mocks = vi.hoisted(() => ({
  offerings: [] as unknown[],
  sessions: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  create: { mutateAsync: vi.fn(), isPending: false, isError: false, error: null as unknown },
  cycle: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown, variables: undefined as unknown },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useTeacherOfferings: () => ({
      data: mocks.offerings,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useLiveSessions: () => mocks.sessions,
    useCreateLiveSession: () => mocks.create,
    useLifecycleLiveSession: () => mocks.cycle,
  };
});

function session(n: number, status: LiveSessionRow['status']): LiveSessionRow {
  return {
    id: `s${n}`,
    offeringId: 'off1',
    teacherId: 't1',
    title: `جلسة ${n}`,
    description: null,
    topic: null,
    scheduledAt: new Date(Date.now() - n * 3_600_000).toISOString(),
    startedAt: null,
    endedAt: null,
    status,
    joinUrl: null,
    recordingUrl: null,
    offering: {
      id: 'off1',
      course: { name: 'هندسة البرمجيات', code: 'SE101', iconEmoji: null, themeColor: null },
    },
    teacher: { firstName: 'سالم', lastName: 'الطاهر', avatarInitials: null, avatarColor: null },
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherLivePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.offerings = [];
  mocks.sessions = { data: [], isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.create = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
  mocks.cycle = { mutate: vi.fn(), isPending: false, isError: false, error: null, variables: undefined };
});

afterEach(() => {
  cleanup();
  act(() => { useAuthStore.setState({ user: null }); });
});

describe('TeacherLivePage — countAr scheduled-subtitle (r157 / 6A9)', () => {
  it('zero scheduled sessions → «لا جلسات مجدولة» — never «0 جلسة مجدولة»', () => {
    mocks.sessions.data = [];
    renderPage();

    expect(screen.getByText('لا جلسات مجدولة')).toBeInTheDocument();
    expect(screen.queryByText(/0 جلسة/)).toBeNull();
  });

  it('two scheduled sessions → the dual form «جلستان مجدولتان»', () => {
    mocks.sessions.data = [session(1, 'SCHEDULED'), session(2, 'SCHEDULED')];
    renderPage();

    expect(screen.getByText('جلستان مجدولتان')).toBeInTheDocument();
  });

  it('five scheduled sessions → the plural form «5 جلسات مجدولة»', () => {
    mocks.sessions.data = Array.from({ length: 5 }, (_, i) => session(i + 1, 'SCHEDULED'));
    renderPage();

    expect(screen.getByText('5 جلسات مجدولة')).toBeInTheDocument();
  });
});

describe('TeacherLivePage — past-sessions truncation disclosure (r157 / 6A9)', () => {
  it('12 past sessions → 10 rows render + the honest «أحدث 10 جلسات من أصل 12» line', () => {
    mocks.sessions.data = Array.from({ length: 12 }, (_, i) => session(i + 1, i % 3 === 0 ? 'CANCELLED' : 'ENDED'));
    renderPage();

    // The card renders exactly 10 rows (the cap)…
    expect(screen.getAllByText(/^جلسة \d+$/)).toHaveLength(10);
    // …and names what is hidden — the old silent slice(0, 10) is gone.
    expect(
      screen.getByText((_c, el) =>
        el instanceof HTMLElement
        && (el.textContent ?? '').replace(/\s+/g, ' ').trim() === 'أحدث 10 جلسات من أصل 12'),
    ).toBeInTheDocument();
  });
});
