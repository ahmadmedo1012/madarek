/**
 * r157 (F8) — WebinarsPage LIVE join actions.
 *
 * The live-session rows were pure display: a LIVE row carried the
 * «مباشر الآن» badge but no way to actually join. Now every LIVE row
 * carries a join action:
 *   1. external joinUrl (http/https) → an anchor opening a new tab
 *      (target=_blank rel="noreferrer") — the same contract as
 *      LivePage's join button;
 *   2. no joinUrl (or a non-external one) → the internal /student/live
 *      Link, where the in-app live page actually runs;
 *   3. passive rows (SCHEDULED/upcoming) get NO join action — they are
 *      not live yet, and a join affordance that cannot join is a dead
 *      control.
 *
 * useCampusEvents/useLiveSessions mocked at the useResources boundary
 * (the MorePages-social pattern).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WebinarsPage from '../../src/pages/student/WebinarsPage';
import type { LiveSessionRow } from '../../src/hooks/useResources';

const mocks = vi.hoisted(() => ({
  live: {
    data: [] as LiveSessionRow[],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  events: {
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useLiveSessions: () => mocks.live,
    useCampusEvents: () => mocks.events,
  };
});

function sessionFixture(over: Partial<LiveSessionRow> & { id: string; title: string; status: LiveSessionRow['status'] }): LiveSessionRow {
  return {
    offeringId: 'off1',
    teacherId: 't1',
    description: null,
    topic: null,
    scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
    startedAt: null,
    endedAt: null,
    joinUrl: null,
    recordingUrl: null,
    offering: { id: 'off1', course: { name: 'هندسة البرمجيات', code: 'SE301', iconEmoji: null, themeColor: null } },
    teacher: { firstName: 'سالم', lastName: 'القاسمي', avatarInitials: null, avatarColor: null },
    ...over,
  } as LiveSessionRow;
}

/** The row container that carries a session title. */
function rowOf(title: string): HTMLElement {
  return screen.getByText(title).closest('.webinar-row') as HTMLElement;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WebinarsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WebinarsPage — LIVE rows join action (r157)', () => {
  beforeEach(() => {
    mocks.live.data = [
      sessionFixture({ id: 's1', title: 'مراجعة قبل الامتحان — خارجي', status: 'LIVE', joinUrl: 'https://meet.example-platform.edu/j/123456' }),
      sessionFixture({ id: 's2', title: 'استكمال فصل الشبكات — داخلي', status: 'LIVE', joinUrl: null }),
      sessionFixture({ id: 's3', title: 'ورشة قواعد البيانات القادمة', status: 'SCHEDULED', joinUrl: 'https://meet.example-platform.edu/j/999' }),
    ];
    mocks.live.isPending = false;
    mocks.live.isError = false;
  });

  it('a LIVE row with an external joinUrl joins via a new-tab anchor (target=_blank rel=noreferrer)', () => {
    renderPage();

    const join = within(rowOf('مراجعة قبل الامتحان — خارجي')).getByRole('link', { name: 'انضمام' });
    expect(join.getAttribute('href')).toBe('https://meet.example-platform.edu/j/123456');
    expect(join.getAttribute('target')).toBe('_blank');
    expect(join.getAttribute('rel')).toBe('noreferrer');
  });

  it('a LIVE row without joinUrl joins via the internal /student/live route', () => {
    renderPage();

    const join = within(rowOf('استكمال فصل الشبكات — داخلي')).getByRole('link', { name: 'انضمام' });
    // In-app router link — no new-tab attributes.
    expect(join.getAttribute('href')).toBe('/student/live');
    expect(join.getAttribute('target')).toBeNull();
    expect(join.getAttribute('rel')).toBeNull();
  });

  it('passive (upcoming) rows carry NO join action — only the two LIVE rows do', () => {
    renderPage();

    // The upcoming session's row has no join link of either kind…
    expect(within(rowOf('ورشة قواعد البيانات القادمة')).queryByRole('link', { name: 'انضمام' })).toBeNull();
    // …and exactly two join actions exist on the page (the two LIVE rows).
    expect(screen.getAllByRole('link', { name: 'انضمام' })).toHaveLength(2);
  });
});
