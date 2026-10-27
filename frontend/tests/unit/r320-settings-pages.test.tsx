/**
 * Backend… no — FRONTEND unit test — R320 cycle-3: the ANY-AUTHED
 * settings door + the routed error sheets (PAGES-GAP P2-1…P2-5).
 *
 * Pins:
 *  1. NAV wiring — every role carries exactly ONE /settings row, one
 *     label cross-role («إعدادات الحساب»), the ADMIN platform row is
 *     re-titled «إعدادات المنصّة», and no icon collides inside any
 *     role's nav (UserCog vs the platform Settings).
 *  2. SettingsPage — the seven §B2 sections, the theme group, the
 *     change-password form (EVERY role's door — teachers had none),
 *     the HONEST seats (قريبًا — never a fake toggle), and the
 *     data-seat's real channels (/contact, /legal/privacy).
 *  3. The error sheets — /500, /403, /maintenance render the designed
 *     grammar (code eyebrow + Arabic title + the primary way home);
 *     the 403's way-back follows ROLE_HOME; maintenance states its
 *     disabled-by-default story honestly.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/hooks/useAuth', () => {
  const meState = {
    data: {
      id: 'u-1',
      email: 'teacher@test.ly',
      firstName: 'سالم',
      lastName: 'البوسيفي',
      role: 'TEACHER',
      themePreference: 'SYSTEM',
      currentInstitution: { id: 'inst-1', name: 'جامعة مدارك التجريبية' },
    },
    isPending: false,
  };
  return { useMe: () => meState };
});

import {
  STUDENT_NAV,
  TEACHER_NAV,
  ADMIN_NAV,
  QUALITY_NAV,
  OWNER_NAV,
  ROLE_HOME,
} from '../../src/lib/nav';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import SettingsPage from '../../src/pages/SettingsPage';
import Error500Page from '../../src/pages/Error500Page';
import Error403Page from '../../src/pages/Error403Page';
import MaintenancePage from '../../src/pages/MaintenancePage';

const allItems = (nav: typeof STUDENT_NAV) => nav.flatMap((g) => g.items);

const QUERY_CLIENT = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const TEACHER_USER: AuthUser = {
  id: 'u-1',
  email: 'teacher@test.ly',
  firstName: 'سالم',
  lastName: 'البوسيفي',
  role: 'TEACHER',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: TEACHER_USER });
});

/* ── 1 · nav wiring ─────────────────────────────────────────────── */

describe('R320 cycle-3 — the settings door in every nav', () => {
  const navs = { STUDENT_NAV, TEACHER_NAV, ADMIN_NAV, QUALITY_NAV, OWNER_NAV };

  it('every role carries exactly ONE /settings row', () => {
    for (const [name, nav] of Object.entries(navs)) {
      const rows = allItems(nav).filter((i) => i.to === '/settings');
      expect(rows, `${name}`).toHaveLength(1);
      expect(rows[0]!.label, `${name} one label cross-role`).toBe('إعدادات الحساب');
    }
  });

  it('the ADMIN platform row is re-titled and does NOT collide with the account door', () => {
    const platform = allItems(ADMIN_NAV).filter((i) => i.to === '/admin/settings');
    expect(platform).toHaveLength(1);
    expect(platform[0]!.label).toBe('إعدادات المنصّة');
    // The two settings seats carry DIFFERENT icons inside the same nav.
    const account = allItems(ADMIN_NAV).find((i) => i.to === '/settings')!;
    expect(account.icon).not.toBe(platform[0]!.icon);
  });

  it('no icon collides inside any role nav (the unique-icon rule survives the adds)', () => {
    for (const [name, nav] of Object.entries(navs)) {
      const icons = allItems(nav).map((i) => i.icon);
      expect(new Set(icons).size, `${name}`).toBe(icons.length);
    }
  });
});

/* ── 2 · the settings sheet ─────────────────────────────────────── */

describe('R320 cycle-3 — SettingsPage (any-authed)', () => {
  it('renders the seven §B2 sections with the mono indexes', () => {
    render(
      <QueryClientProvider client={QUERY_CLIENT}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const bars = screen.getAllByRole('heading', { level: 2 });
    const titles = bars.map((b) => b.textContent);
    expect(titles).toEqual(
      expect.arrayContaining([
        'المظهر',
        'تغيير كلمة المرور',
        'معلومات الحساب والتحقق',
        'الإشعارات',
        'اللغة والأرقام',
        'الجلسات والأجهزة',
        'بياناتي',
      ]),
    );
    expect(bars).toHaveLength(7);
  });

  it('carries the theme group and the change-password form (the teacher gap closed)', () => {
    render(
      <QueryClientProvider client={QUERY_CLIENT}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('group', { name: 'السمة' })).toBeInTheDocument();
    // The r180-F4 form — previously ONLY the student profile mounted it.
    expect(screen.getByLabelText('كلمة المرور الحالية')).toBeInTheDocument();
    expect(screen.getByLabelText('كلمة المرور الجديدة')).toBeInTheDocument();
    expect(screen.getByLabelText('تأكيد كلمة المرور الجديدة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تغيير كلمة المرور' })).toBeInTheDocument();
  });

  it('renders the honest seats — قريبًا, never a fake toggle — and the real channels', () => {
    render(
      <QueryClientProvider client={QUERY_CLIENT}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const soon = screen.getAllByText('قريبًا');
    expect(soon.length).toBeGreaterThanOrEqual(2); // notifications + sessions
    // No notification-preference controls pretend to exist.
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    // The data seat's channels are real routes.
    expect(screen.getByRole('link', { name: /صفحة التواصل/ })).toHaveAttribute(
      'href',
      '/contact',
    );
    expect(screen.getByRole('link', { name: /سياسة الخصوصية/ })).toHaveAttribute(
      'href',
      '/legal/privacy',
    );
  });

  it('prints the honest account facts from /auth/me (no raw ids, no invented data)', () => {
    render(
      <QueryClientProvider client={QUERY_CLIENT}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('سالم البوسيفي')).toBeInTheDocument();
    expect(screen.getByText('teacher@test.ly')).toBeInTheDocument();
    expect(screen.getByText('أستاذ')).toBeInTheDocument(); // roleLabel(TEACHER)
    expect(screen.getByText('جامعة مدارك التجريبية')).toBeInTheDocument();
    // The verification story is honest (no fake verified badge).
    expect(screen.getByText(/التحقق بالبريد قيد الإطلاق/)).toBeInTheDocument();
  });
});

/* ── 3 · the routed error sheets ────────────────────────────────── */

describe('R320 cycle-3 — the routed error sheets (P2-3/4/5)', () => {
  const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it('/500 renders the designed grammar with one primary way home', () => {
    mount(<Error500Page />);
    // R321 §A5 re-pin: the em-dash is NBSP-glued to the word before it
    // (it can never start its own line; text-wrap:balance pairs it).
    expect(
      screen.getByRole('heading', { level: 1, name: 'خللٌ من جانبنا\u00A0— لا من جانبك' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ERR [500]')).toBeInTheDocument();
    const home = screen.getByRole('link', { name: 'العودة إلى الرئيسية' });
    expect(home).toHaveAttribute('href', '/');
    // Exactly ONE primary action (the way home) — no fake retry.
    expect(document.querySelectorAll('.nf-actions .btn.primary')).toHaveLength(1);
  });

  it('R321 §A5 — the code reads ONCE: no duplicate normalised text, no code in the coordinates line', () => {
    const { container } = render(
      <MemoryRouter>
        <Error500Page />
      </MemoryRouter>,
    );
    // the coordinates line carries the page's own word, never the code
    expect(container.querySelector('.nf-coords')?.textContent).toContain('SERVER FAULT');
    expect(container.querySelector('.nf-coords')?.textContent).not.toContain('500');
    // the visible eyebrow is the ONE carrier (aria-hidden removed — the
    // R320 sr-only twin put the same string in innerText twice)
    const eyebrow = container.querySelector('.nf-eyebrow');
    expect(eyebrow).not.toBeNull();
    expect(eyebrow?.hasAttribute('aria-hidden')).toBe(false);
    expect(container.querySelectorAll('.nf-scene .sr-only')).toHaveLength(0);
    // normalised-text sweep: no two visible text nodes with the same
    // normalised text inside the scene (the §A5 gate rule, unit-seated)
    const normalise = (s: string) => s.replace(/[\s\p{P}\p{S}]+/gu, '').trim();
    const seen = new Map<string, number>();
    container
      .querySelectorAll('.nf-scene *')
      .forEach((el) =>
        [...el.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim())
          .forEach((n) => {
            const key = normalise(n.textContent || '');
            seen.set(key, (seen.get(key) || 0) + 1);
          }),
      );
    const dupes = [...seen.entries()].filter(([, n]) => n > 1);
    expect(dupes).toEqual([]);
  });

  it('R321 §A6 — the corner plus-marks carry no text (innerText stays clean)', () => {
    const { container } = render(
      <MemoryRouter>
        <Error500Page />
      </MemoryRouter>,
    );
    const marks = [...container.querySelectorAll('.nf-mark')];
    expect(marks).toHaveLength(4);
    // the glyph is CSS ::before content — the DOM text stays empty
    marks.forEach((m) => expect((m.textContent || '').trim()).toBe(''));
  });

  it('/403 way-back follows ROLE_HOME for the signed-in role', () => {
    mount(<Error403Page />);
    expect(screen.getByRole('heading', { level: 1, name: 'هذه الصفحة خارج نطاق صلاحياتك' })).toBeInTheDocument();
    const mine = screen.getByRole('link', { name: 'لوحتي' });
    expect(mine).toHaveAttribute('href', ROLE_HOME.TEACHER);
  });

  it('/maintenance ships with its honest disabled-by-default story', () => {
    mount(<MaintenancePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'مدارك في صيانة قصيرة' })).toBeInTheDocument();
    expect(screen.getByText('MM [01]')).toBeInTheDocument();
    expect(screen.getByText(/لا تُفتح تلقائيًا في الوضع الحالي/)).toBeInTheDocument();
  });
});
