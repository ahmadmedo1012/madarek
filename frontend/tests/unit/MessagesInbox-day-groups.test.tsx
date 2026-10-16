/**
 * r173a — messages temporal grouping (the r171 VLM deferred note).
 *
 * The inbox rendered one flat 30-row run; the rows now run under
 * day-group headers. Two layers pinned here:
 *   1. PURE — groupMessagesByDay: the اليوم / أمس / هذا الأسبوع /
 *      dated-label boundaries on LOCAL calendar days, the Sunday-start
 *      week (Date#getDay 0 = الأحد), first-appearance group order
 *      (never re-sorted), same-day rows sharing one group, and label
 *      determinism. Clock conventions follow format.test.ts: the
 *      suite runs TZ=UTC and fixtures sit at noon UTC so the calendar
 *      day is stable.
 *   2. RENDER — the shared MessagesInbox inserts the header rows:
 *      aria-hidden (presentational organization — never joins row
 *      semantics), the ROW pins stay byte-identical (same count, same
 *      name/badge queries), pagination still renders, and the CSS
 *      half of the contract (components.css .msg-day-group) is
 *      source-pinned like MetricCard-tone's readStyle pattern.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

import {
  groupMessagesByDay,
  MessagesInbox,
} from '../../src/components/messages/MessagesInbox';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const STYLES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const componentsCss = readFileSync(path.join(STYLES_DIR, 'components.css'), 'utf-8');

/* ── Fixtures: the format.test.ts fixed-clock convention ────────── */

// Wednesday, noon UTC — a mid-week vantage where "this week" has
// real members on both sides of أمس.
const NOW_WED = new Date('2026-03-18T12:00:00Z');
// Sunday, noon UTC — the week-seam edge case: the Arabic week began
// TODAY, so this-week holds only today and yesterday (Saturday)
// already took أمس.
const NOW_SUN = new Date('2026-03-15T12:00:00Z');

const row = (id: string, createdAt: string) => ({ id, createdAt });

/* ── 1 · Pure helper ────────────────────────────────────────────── */

describe('groupMessagesByDay — boundaries (r173a)', () => {
  it('اليوم: same local calendar day — midnight inclusive, and future clock-skew lands honestly in today', () => {
    const groups = groupMessagesByDay(
      [row('a', '2026-03-18T00:00:00Z'), row('b', '2026-03-18T23:59:59Z'), row('c', '2026-03-18T13:00:00Z')],
      NOW_WED,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'today', label: 'اليوم' });
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('أمس: the whole calendar day before today (not a rolling 24h window)', () => {
    const groups = groupMessagesByDay(
      [row('a', '2026-03-17T00:00:00Z'), row('b', '2026-03-17T23:59:59Z')],
      NOW_WED,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'yesterday', label: 'أمس' });
  });

  it('هذا الأسبوع: the Sunday-start week\'s remaining days, LUMPED into one group', () => {
    // NOW_WED is Wednesday 2026-03-18 → the week began Sunday 2026-03-15.
    const groups = groupMessagesByDay(
      [row('mon', '2026-03-16T12:00:00Z'), row('sun', '2026-03-15T12:00:00Z')],
      NOW_WED,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: 'this-week', label: 'هذا الأسبوع' });
    expect(groups[0]!.rows).toHaveLength(2);
  });

  it('older rows: one ar-LY dated group per day (the app\'s formatDateWithYearAr option set)', () => {
    const groups = groupMessagesByDay(
      [row('sat', '2026-03-14T23:59:59Z'), row('old1', '2026-03-05T10:00:00Z'), row('old2', '2026-03-05T08:00:00Z')],
      NOW_WED,
    );
    expect(groups.map((g) => g.label)).toEqual(['14 مارس 2026', '5 مارس 2026']);
    // Same-day rows share ONE header.
    expect(groups[1]!.rows.map((r) => r.id)).toEqual(['old1', 'old2']);
    // Machine keys are stable per-day, never shown.
    expect(groups[1]!.key).toBe('date:2026-03-05');
  });

  it('the week seam on a Sunday: this-week holds only today — yesterday took أمس and older rows fall to dated labels', () => {
    const groups = groupMessagesByDay(
      [row('today', '2026-03-15T08:00:00Z'), row('sat', '2026-03-14T20:00:00Z'), row('fri', '2026-03-13T12:00:00Z')],
      NOW_SUN,
    );
    expect(groups.map((g) => g.label)).toEqual(['اليوم', 'أمس', '13 مارس 2026']);
    expect(groups.some((g) => g.key === 'this-week')).toBe(false);
  });

  it('group order follows FIRST APPEARANCE (server order is never re-sorted)', () => {
    const groups = groupMessagesByDay(
      [row('old', '2026-03-05T10:00:00Z'), row('now', '2026-03-18T10:00:00Z')],
      NOW_WED,
    );
    expect(groups.map((g) => g.label)).toEqual(['5 مارس 2026', 'اليوم']);
  });

  it('empty input → no groups', () => {
    expect(groupMessagesByDay([], NOW_WED)).toEqual([]);
  });

  it('deterministic: the same (rows, now) produce the identical grouping twice', () => {
    const rows = [
      row('a', '2026-03-18T09:00:00Z'),
      row('b', '2026-03-17T09:00:00Z'),
      row('c', '2026-03-16T09:00:00Z'),
      row('d', '2026-03-05T09:00:00Z'),
    ];
    expect(groupMessagesByDay(rows, NOW_WED)).toEqual(groupMessagesByDay(rows, NOW_WED));
  });

  it('the default `now` reads the system clock (the fixed-clock path the page itself uses)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_WED);
    try {
      const groups = groupMessagesByDay([row('a', '2026-03-18T10:00:00Z')]);
      expect(groups[0]).toMatchObject({ key: 'today', label: 'اليوم' });
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ── 2 · Rendering ──────────────────────────────────────────────── */

const mocks = vi.hoisted(() => ({
  messages: {
    pages: {} as Record<number, Array<Record<string, unknown>>>,
    total: 0,
    totalPages: 1,
    unread: 0,
  },
  markAll: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
}));

vi.mock('../../src/hooks/useResources', () => ({
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
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
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

const message = (id: string, createdAt: string, overrides?: Record<string, unknown>) => ({
  id,
  body: `نص الرسالة ${id}`,
  createdAt,
  fromUser: user('t1', 'سالم', 'الطاهر'),
  toUser: user('s1', 'آمنة', 'العبيدي'),
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_WED);
});

afterEach(() => {
  vi.useRealTimers();
  act(() => { useAuthStore.setState({ user: null }); });
});

describe('MessagesInbox — day-group headers in the rendered list (r173a)', () => {
  it('inserts one aria-hidden header per group, between the rows; row pins and pagination stay intact', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.messages = {
      pages: {
        1: [
          message('m1', '2026-03-18T09:00:00Z', { readAt: null }),
          message('m2', '2026-03-18T07:00:00Z', { readAt: '2026-03-18T08:00:00Z' }),
          message('m3', '2026-03-17T10:00:00Z', { readAt: '2026-03-17T11:00:00Z' }),
          message('m4', '2026-03-16T10:00:00Z', { readAt: '2026-03-16T11:00:00Z' }),
          message('m5', '2026-03-05T10:00:00Z', { readAt: '2026-03-05T11:00:00Z' }),
          message('m6', '2026-03-05T08:00:00Z', { readAt: '2026-03-05T09:00:00Z' }),
        ],
      },
      total: 35,
      totalPages: 2,
      unread: 1,
    };
    const { container } = render(
      <MemoryRouter>
        <MessagesInbox title="صندوق الرسائل" subtitle="فرعي" renderCompose={() => null} />
      </MemoryRouter>,
    );

    // The four groups in server order: اليوم / أمس / هذا الأسبوع / date.
    const headers = Array.from(container.querySelectorAll<HTMLElement>('.msg-day-group'));
    expect(headers.map((h) => h.textContent)).toEqual(
      ['اليوم', 'أمس', 'هذا الأسبوع', '5 مارس 2026'],
    );
    // Presentational organization only — every header is aria-hidden,
    // so none of them can join the rows' text/role semantics.
    for (const h of headers) {
      expect(h.getAttribute('aria-hidden')).toBe('true');
    }

    // The ROW contract is byte-identical: same row count, same names,
    // the one unread badge, no reply doors lost.
    expect(container.querySelectorAll('.list-row')).toHaveLength(6);
    expect(screen.getAllByText(/سالم الطاهر/)).toHaveLength(6);
    expect(screen.getAllByText('غير مقروءة')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /ردّ على رسالة/ })).toHaveLength(6);

    // Pagination still rides its own block below the groups (the
    // bdi digits ride the span's children — textContent sees them).
    const pager = screen.getByText(/الصفحة/).closest('div');
    expect(pager).not.toBeNull();
    expect((pager as HTMLElement).textContent).toContain('الصفحة 1 من 2');
  });

  it('an inbox entirely inside today renders exactly ONE header (no per-row noise)', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.messages = {
      pages: {
        1: [
          message('m1', '2026-03-18T09:00:00Z', { readAt: null }),
          message('m2', '2026-03-18T07:30:00Z', { readAt: null }),
        ],
      },
      total: 2,
      totalPages: 1,
      unread: 2,
    };
    const { container } = render(
      <MemoryRouter>
        <MessagesInbox title="صندوق الرسائل" subtitle="فرعي" renderCompose={() => null} />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('.msg-day-group')).toHaveLength(1);
    expect(container.querySelectorAll('.list-row')).toHaveLength(2);
  });
});

/* ── 3 · The CSS half of the contract (source-pinned) ───────────── */

describe('components.css — the .msg-day-group recipe (r173a)', () => {
  it('consumes the AA label ink and the canonical hairline — no new colors', () => {
    // The label ink: --text-secondary (8.44:1 light / 9.28:1 dark —
    // the same AA step the ProgressBar % readout consumes).
    expect(componentsCss).toMatch(/\.msg-day-group\s*\{[^}]*color:\s*var\(--text-secondary\)/s);
    // The trailing hairline rides --rule (the canonical hairline family).
    expect(componentsCss).toMatch(/\.msg-day-group::after\s*\{[^}]*background:\s*var\(--rule\)/s);
  });
});
