/**
 * r164-j — notification tone unification + bell a11y pins.
 *
 * Cross-agent finding (lead's r164 gap matrix): the notification SYSTEM
 * type rendered the NEUTRAL well inside the topbar inbox
 * (NotificationDropdown TYPE_TONE) while the /alerts page coded the
 * SAME type amber (MorePages toneFor). One event, two meanings — the
 * unification keeps MorePages' semantics (SYSTEM is a warning-ish
 * system notice) and this file pins both sides of the contract:
 *
 * Part 1 (jsdom) — component behavior:
 *   - every notification type renders its tone class on the row
 *   - the bell's accessible name carries the counted Arabic unread
 *     total (0 → «الإشعارات»)
 *   - new unread arrivals are announced by a polite role=status
 *     region (WCAG 2.2 §4.1.3) — attribute mutations on aria-label
 *     are never announced; growth talks, decreases stay silent
 *
 * Part 2 (fs, landing-scrollspy-grain pattern) — disk contracts:
 *   - both surfaces keep the SYSTEM→amber/warn mapping (drift fails)
 *   - the tone-warn well consumes the WCAG-pinned warning tokens and
 *     the dead tone-neutral rule is gone (no producer since r164-j)
 *   - the panel's touch-floor band covers close/action/view-all
 *   - the toast RM override keeps the duration token (animationend
 *     drives the delayed unmount — `animation: none` would hang it)
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* ── Part 1 mocks: mutable unread + a four-type inbox ────────────── */
const state = vi.hoisted(() => ({
  unread: 2,
  list: [
    { id: 'n1', type: 'URGENT',   title: 'إشعار عاجل',  body: null, readAt: null, createdAt: new Date().toISOString() },
    { id: 'n2', type: 'ACADEMIC', title: 'إشعار أكاديمي', body: null, readAt: null, createdAt: new Date().toISOString() },
    { id: 'n3', type: 'SYSTEM',   title: 'إشعار نظام',  body: null, readAt: null, createdAt: new Date().toISOString() },
    { id: 'n4', type: 'SOCIAL',   title: 'إشعار اجتماعي', body: null, readAt: null, createdAt: new Date().toISOString() },
  ] as Array<{ id: string; type: 'URGENT' | 'ACADEMIC' | 'SYSTEM' | 'SOCIAL'; title: string; body: string | null; readAt: string | null; createdAt: string }>,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useUnreadNotifications: () => ({ data: state.unread }),
  useNotifications: () => ({ data: state.list, isPending: false, isError: false }),
  useMarkNotifRead: () => ({ mutate: vi.fn() }),
  useMarkAllNotifsRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { NotificationDropdown } from '../../src/components/layout/NotificationDropdown';

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationDropdown alertsPath="/student/alerts" />
    </MemoryRouter>,
  );
}

const openPanel = () => {
  fireEvent.click(screen.getByRole('button', { name: /إشعار/ }));
  expect(screen.getByRole('dialog', { name: 'الإشعارات' })).toBeInTheDocument();
};

describe('NotificationDropdown — SYSTEM tone unification (r164-j)', () => {
  it('maps every type to its semantic tone: SYSTEM is WARN, not neutral', () => {
    renderBell();
    openPanel();
    const expected: Record<string, string> = {
      'إشعار عاجل': 'tone-danger',
      'إشعار أكاديمي': 'tone-accent',
      'إشعار نظام': 'tone-warn',
      'إشعار اجتماعي': 'tone-success',
    };
    for (const [title, tone] of Object.entries(expected)) {
      expect(screen.getByRole('button', { name: new RegExp(title) })).toHaveClass(tone);
    }
  });
});

describe('NotificationDropdown — bell a11y (r164-j)', () => {
  it('the accessible name carries the counted Arabic unread total', () => {
    state.unread = 2;
    renderBell();
    // arUnit(2) → dual form
    expect(screen.getByRole('button', { name: 'إشعاران غير مقروءان' })).toBeInTheDocument();
  });

  it('zero unread names the bell «الإشعارات»', () => {
    state.unread = 0;
    renderBell();
    expect(screen.getByRole('button', { name: 'الإشعارات' })).toBeInTheDocument();
  });

  it('new unread arrivals are announced by the polite status region (§4.1.3)', () => {
    state.unread = 2;
    const { rerender } = renderBell();
    const status = screen.getByRole('status');
    // Initial mount value is skipped — a stale count never talks.
    expect(status).toHaveTextContent('');

    state.unread = 3; // one new arrival
    rerender(
      <MemoryRouter>
        <NotificationDropdown alertsPath="/student/alerts" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('لديك الآن 3 إشعارات غير مقروءة');

    state.unread = 1; // user reads the inbox down — silent
    rerender(
      <MemoryRouter>
        <NotificationDropdown alertsPath="/student/alerts" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('لديك الآن 3 إشعارات غير مقروءة');

    state.unread = 5; // growth talks again
    rerender(
      <MemoryRouter>
        <NotificationDropdown alertsPath="/student/alerts" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('لديك الآن 5 إشعارات غير مقروءة');
  });
});

/* ── Part 2: disk contracts ──────────────────────────────────────── */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

describe('notification tone + touch + RM contracts on disk (r164-j)', () => {
  const dropdownSrc = stripComments(read('src/components/layout/NotificationDropdown.tsx'));
  const moreSrc = stripComments(read('src/pages/student/MorePages.tsx'));
  const notifCss = stripComments(read('src/styles/notifications.css'));
  const layoutCss = stripComments(read('src/styles/layout.css'));

  it('both surfaces keep SYSTEM on the warning side — tone drift fails here', () => {
    // Inbox (this round's fix): tone-warn well.
    expect(dropdownSrc).toMatch(/SYSTEM:\s*'tone-warn'/);
    expect(dropdownSrc).not.toMatch(/tone-neutral/);
    // /alerts page (the semantics winner): amber.
    expect(moreSrc).toMatch(/if \(type === 'SYSTEM'\) return 'amber';/);
  });

  it('the tone-warn well consumes the WCAG-pinned warning tokens', () => {
    expect(notifCss).toMatch(
      /\.notif-item\.tone-warn\s+\.notif-item-icon\s*\{[^}]*--warning-soft[^}]*--warning-ink[^}]*\}/,
    );
    // The dead neutral well left with SYSTEM's move — no producer, no rule.
    expect(notifCss).not.toMatch(/tone-neutral/);
  });

  it('the panel chrome carries 44px hit floors on both touch proxies', () => {
    expect(notifCss).toMatch(
      /@media \(max-width: 920px\), \(hover: none\)\s*\{[^}]*\.notif-panel-close \{ min-inline-size: 44px; min-block-size: 44px; \}[^}]*\.notif-panel-action \{ min-block-size: 44px; \}[^}]*\.notif-panel-viewall \{ min-block-size: 44px; \}/,
    );
  });

  it('the layout chrome carries the (hover: none) input-capability floor (r164-j)', () => {
    // The one block that reaches touch tablets in the ≥921px desktop
    // band — every selector floored at 44px, pointer-fine untouched.
    const block = layoutCss.match(/@media \(hover: none\)\s*\{([\s\S]*?)\n  \}/);
    expect(block).not.toBeNull();
    for (const sel of [
      '.icon-btn',
      '.sidebar .nav-item',
      '.theme-toggle-option',
      '.sidebar-collapse-btn',
      '.sidebar-tour-trigger',
      '.topbar-notif',
      '.topbar-user-trigger',
    ]) {
      const re = new RegExp(
        `${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*44px[^}]*\\}`,
      );
      expect(block![1], `${sel} floored`).toMatch(re);
    }
  });

  it('the toast RM override keeps the duration token — never animation:none', () => {
    // The animationend listener drives useDelayedUnmount; `animation:
    // none` in the RM belt would never fire it and strand the closing
    // toast. (The drag-suspension `animation: none` outside the RM
    // block is a different, legitimate mechanism.)
    const rmToastRule = notifCss.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.toast-stack \.toast,\s*\.toast-stack \.toast\[data-closing="true"\]\s*\{[^}]*\}/,
    );
    expect(rmToastRule).not.toBeNull();
    expect(rmToastRule![0]).toMatch(/animation-duration:\s*var\(--motion-duration-short\)/);
    expect(rmToastRule![0]).not.toMatch(/animation:\s*none/);
  });
});
