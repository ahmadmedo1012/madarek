/**
 * r172b — loading-state closure (one loading owner, geometry closure).
 *
 * The CLS lab (Playwright, 900ms delayed APIs, 6 runs per route — kept
 * outside the repo in the probes workspace) measured the cold-load
 * window of every reference dashboard and found three structural
 * liars: the generic PageSkeleton had no slot for the action strips
 * (admin 217px late insertion → CLS 0.066, owner 0.183), none for the
 * student's ResumeHero (KPI row pushed 233px → CLS 0.023), and the
 * premium hero pair's boxes didn't match the CardSkeletons below it.
 * After the fix every route's worst CLS ≤ 0.0079 (budget 0.009) with
 * ONE loading owner (skeletons only — zero spinners, zero splash after
 * first paint).
 *
 * These pins hold the SOURCE contracts the lab measured:
 *   1. Student pending mirror — the real welcome header + a
 *      .dash-resume slot at the loaded hero's footprint (176) + the
 *      KPI strip + the .dash-hero-row premium pair + below-fold slots.
 *   2. KpiSkeleton anatomy — 4 .metric tiles, the value bar at 28px
 *      (the 2px row-height delta the lab caught), aria-busy semantics.
 *   3. StripSkeleton — the real Card anatomy with the static strip
 *      identity as text + N row placeholders (the slot the resolved
 *      strip will occupy).
 *   4. Admin pending mirror — real h1 + strip slot + KPI + charts row
 *      slots; no spinner, no splash.
 *   5. Admin ActionStrip pending — the strip itself renders its
 *      StripSkeleton while its three background reads pend.
 *   6. Owner pending mirror — real h1 + the REAL pending live-status
 *      band + strip slot + KPI + charts pair + below-fold slots.
 *   7. OwnerActionStrip education pending — a skeleton card, never a
 *      silent null.
 *   8. index.html source contract — the parse-time html{min-height:100%}
 *      rule (the document element stays full-height; the lab's html
 *      rect is 800→800 after it).
 *   9. Zero spinners / zero splash in every pending state pinned here
 *      (the one-loading-owner rule).
 *
 * lib/api is mocked at the module boundary (the 16-E5 pattern) with a
 * URL-keyed fixture table; PENDING_URLS answer a never-settling
 * promise so the pages hold their isPending state. react-chartjs-2 is
 * stubbed (jsdom has no canvas) like every dashboard spec.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="chart-doughnut" />,
  Bar: () => <div data-testid="chart-bar" />,
  Line: () => <div data-testid="chart-line" />,
}));

const { FIXTURES, PENDING } = vi.hoisted(() => ({
  FIXTURES: {} as Record<string, unknown>,
  PENDING: new Set<string>(),
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      if (PENDING.has(url)) return new Promise(() => {});
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve({ data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

import { StripSkeleton, KpiSkeleton, ListSkeleton, TableSkeleton } from '../../src/components/primitives/States';
import { AdminDashboardPage } from '../../src/pages/admin/AdminPages';
import { OwnerDashboardPage } from '../../src/pages/owner/OwnerDashboardPage';
import StudentDashboardPage from '../../src/pages/student/DashboardPage';

const NEVER = Symbol('never-resolving');

function setFixtures(map: Record<string, unknown>) {
  FIXTURES['/me/dashboard'] = NEVER;
  for (const [k, v] of Object.entries(map)) FIXTURES[k] = v;
}

function pendingUrls(...urls: string[]) {
  PENDING.clear();
  for (const u of urls) PENDING.add(u);
}

function renderPage(element: JSX.Element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  FIXTURES['/me/dashboard'] = NEVER;
  pendingUrls('/me/dashboard');
});

/* ── 1 · Student pending mirror ─────────────────────────────────── */

describe('r172b §1 — student dashboard pending mirror', () => {
  it('renders the masthead, the TODAY-ledger slot, the momentum ring slot, the stat strip and the below-fold list slots', () => {
    const { container } = renderPage(<StudentDashboardPage />);

    /* R189 re-pin — the ledger anatomy: masthead (h1 + pending
       subtitle) → TODAY ledger slot → momentum ring slot → stat strip
       → week-list slots. Every slot renders the resolved section's
       class, so the pending → resolved handoff moves nothing (the
       r172b mirror contract, re-mirrored for «سجلّ مدارك»). */
    const header = container.querySelector('header.page-header');
    expect(header).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'لوحة التحكم' })).toBeTruthy();
    expect(screen.getByText(/جارٍ تحضير لوحتك/)).toBeTruthy();

    // Momentum slot — the ring row's own footprint (112px ring + bars).
    const momentum = container.querySelectorAll('section.momentum.dash-resume-pending');
    expect(momentum.length).toBeGreaterThanOrEqual(1);
    for (const m of Array.from(momentum)) {
      expect((m as HTMLElement).getAttribute('aria-busy')).toBe('true');
      expect(m.querySelector('.skeleton')).not.toBeNull();
    }

    // The stat strip — 4 typographic cells.
    expect(container.querySelectorAll('.stat-strip .stat-cell')).toHaveLength(4);

    // The list slots — the TODAY ledger + week ledger placeholders.
    const listSlots = container.querySelectorAll('.flex-col .flex.items-center');
    expect(listSlots.length).toBeGreaterThanOrEqual(6);
  });

  it('pins ONE loading owner: zero spinners and zero hydration splash in the pending window', () => {
    const { container } = renderPage(<StudentDashboardPage />);
    expect(container.querySelectorAll('.spinner')).toHaveLength(0);
    expect(container.querySelectorAll('.hydration-splash')).toHaveLength(0);
  });
});

/* ── 2 · KpiSkeleton anatomy ────────────────────────────────────── */

describe('r172b §2 — KpiSkeleton geometry pin', () => {
  it('renders 4 metric tiles whose value bar is 28px (the 2px delta the CLS lab caught)', () => {
    const { container } = render(<KpiSkeleton />);
    const grid = container.querySelector('.grid-4');
    expect(grid).not.toBeNull();
    expect((grid as HTMLElement).getAttribute('aria-busy')).toBe('true');
    const tiles = container.querySelectorAll('.metric');
    expect(tiles).toHaveLength(4);
    for (const tile of Array.from(tiles)) {
      const bars = tile.querySelectorAll('.skeleton') as NodeListOf<HTMLElement>;
      expect(bars).toHaveLength(3);
      // label 11 / value 28 / change 11 — the real MetricCard's
      // .metric-head column measures 84px; the old 26px value bar
      // left every dashboard 2px short at the handoff.
      expect(bars[1]?.style.height).toBe('28px');
    }
  });
});

/* ── 3 · StripSkeleton contract ─────────────────────────────────── */

describe('r172b §3 — StripSkeleton (the action-strip slot)', () => {
  it('rides the real Card anatomy with the static strip identity as text + N row placeholders', () => {
    const { container } = render(
      <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" rows={1} />,
    );
    const card = container.querySelector('.card');
    expect(card).not.toBeNull();
    expect((card as HTMLElement).getAttribute('aria-busy')).toBe('true');
    // The same header path the resolved strip's Card renders — the
    // height is CSS-driven by identical classes, not magic numbers.
    expect(container.querySelector('.card-header .card-title-block .card-title')).not.toBeNull();
    expect(container.querySelector('.card-header .card-title-block .card-subtitle')).not.toBeNull();
    expect(screen.getByText('يحتاج انتباهك')).toBeTruthy();
    const rows = container.querySelectorAll('.flex-col.gap-2 .skeleton') as NodeListOf<HTMLElement>;
    expect(rows).toHaveLength(1);
    // 81px — the real alert row's measured height.
    expect(rows[0]?.style.height).toBe('81px');
  });
});

/* ── 4/5 · Admin pending mirror + strip's own pending state ─────── */

describe('r172b §4 — admin dashboard pending mirror', () => {
  beforeEach(() => {
    pendingUrls('/admin/stats', '/admin/faculties', '/admin/reports', '/admin/courses', '/admin/sync', '/admin/papers');
  });

  it('renders the real header + strip slot + KPI + charts-row slots (no generic PageSkeleton shape)', () => {
    const { container } = renderPage(<AdminDashboardPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'لوحة الإدارة' })).toBeTruthy();
    // The strip slot carries the real strip identity.
    expect(screen.getByText('يحتاج انتباهك')).toBeTruthy();
    // R189 re-pin: the KPI band is the typographic stat strip.
    expect(container.querySelectorAll('.stat-strip .stat-cell')).toHaveLength(4);
    // The charts row — same grid + margin as the resolved page, two
    // card slots.
    const charts = container.querySelector('.grid-2-1');
    expect(charts).not.toBeNull();
    expect((charts as HTMLElement).querySelectorAll(':scope > .card')).toHaveLength(2);
  });

  it('pins ONE loading owner: zero spinners, zero splash', () => {
    const { container } = renderPage(<AdminDashboardPage />);
    expect(container.querySelectorAll('.spinner')).toHaveLength(0);
    expect(container.querySelectorAll('.hydration-splash')).toHaveLength(0);
  });

  it("§5 — the ActionStrip's own pending state is the same StripSkeleton (never a silent null)", () => {
    // Page-level queries ANSWER; only the strip's three background
    // reads pend — the resolved page must render the strip skeleton in
    // the slot the page skeleton reserved.
    pendingUrls('/admin/courses', '/admin/sync', '/admin/papers');
    setFixtures({
      '/admin/stats': { totalStudents: 420, totalTeachers: 28, totalCourses: 12, totalEnrollments: 860 },
      '/admin/faculties': [],
      '/admin/reports': {
        headline: { totalPapers: 0, publishedPapers: 0, totalUsers: 449, activeStudents: 391 },
        paperTrend: [], topCourses: [],
      },
    });
    const { container } = renderPage(<AdminDashboardPage />);
    // The resolved dashboard (its real charts row proves it) with the
    // strip still pending → the skeleton card, not a null hole.
    expect(screen.getByText('إحصائيات حيّة عن طلاب وأساتذة المنصّة.')).toBeTruthy();
    expect(screen.getByText('توزّع الطلاب حسب الكلّيّة')).toBeTruthy();
    expect(screen.getByText('مؤشرات سريعة')).toBeTruthy();
    const strip = container.querySelector('.stat-strip')?.previousElementSibling;
    expect(strip).not.toBeNull();
    const stripEl = strip as HTMLElement;
    expect(stripEl.classList.contains('card')).toBe(true);
    expect(stripEl.getAttribute('aria-busy')).toBe('true');
    expect(within(stripEl).getByText('يحتاج انتباهك')).toBeTruthy();
  });
});

/* ── 6/7 · Owner pending mirror + strip's education pending ─────── */

describe('r172b §6 — owner dashboard pending mirror', () => {
  beforeEach(() => {
    pendingUrls('/owner/stats', '/owner/realtime', '/owner/education');
  });

  it('renders the real header + the REAL pending live-status band + strip slot + KPI + charts pair', () => {
    const { container } = renderPage(<OwnerDashboardPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'لوحة التحكم الرئيسية' })).toBeTruthy();
    // The band is the real component's pending markup — identical box
    // to what the resolved page shows while alerts pend.
    const band = container.querySelector('.owner-live-status.is-pending');
    expect(band).not.toBeNull();
    expect(within(band as HTMLElement).getByText('جارٍ جلب حالة التنبيهات…')).toBeTruthy();
    // Strip slot + KPI + charts pair + the two below-fold card slots
    // (strip + CardSkeleton ×2 are the page's direct .card children).
    expect(screen.getByText('يحتاج انتباهك')).toBeTruthy();
    // r253 re-pin: the KPI band is the patterns StatLine shape, and
    // the page frame is the patterns PageFrame (.pf-page).
    expect(container.querySelectorAll('.pf-statline .pf-stat')).toHaveLength(4);
    const charts = container.querySelector('.grid-2-1');
    expect(charts).not.toBeNull();
    expect((charts as HTMLElement).querySelectorAll(':scope > .card')).toHaveLength(2);
    expect(container.querySelectorAll('.pf-page > .card')).toHaveLength(3);
  });

  it("§7 — OwnerActionStrip renders its skeleton while education pends (never a silent null)", () => {
    pendingUrls('/owner/education');
    setFixtures({
      '/owner/stats': {
        totalUsers: 5, students: 1, teachers: 1, admins: 1, quality: 1, owners: 1,
        totalCourses: 6, totalOfferings: 6, totalEnrollments: 6, recentAuditLogs: 21,
      },
      '/owner/realtime': { activeSessions: 3, aiRequestsPerMin: 0, liveBroadcasts: 0, activeExams: 0 },
    });
    FIXTURES['/owner/alerts'] = [];
    FIXTURES['/owner/activity'] = { data: [], meta: { page: 1, limit: 8, total: 0, totalPages: 1 } };
    const { container } = renderPage(<OwnerDashboardPage />);
    // Resolved page (real KPI value proves it) + pending education →
    // the strip skeleton sits between the band and the KPI row
    // (r253 re-pin: the KPI placeholder is the .pf-statline shape).
    expect(screen.getByText('لوحة التحكم الرئيسية')).toBeTruthy();
    const strip = container.querySelector('.pf-statline')?.previousElementSibling;
    expect(strip).not.toBeNull();
    const stripEl = strip as HTMLElement;
    expect(stripEl.getAttribute('aria-busy')).toBe('true');
    expect(within(stripEl).getByText('يحتاج انتباهك')).toBeTruthy();
  });
});

/* ── 8 · index.html source contract ─────────────────────────────── */

describe('r172b §8 — the parse-time html height rule', () => {
  it("index.html carries the inline html{min-height:100%} style before the stylesheet links", () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    const styleMatch = html.match(/<style>html\s*\{\s*min-height:\s*100%\s*\}<\/style>/);
    expect(styleMatch).not.toBeNull();
    // It must apply at parse time — before the vite module scripts can
    // inject the real stylesheet.
    const styleIdx = html.indexOf('<style>html');
    const firstScriptIdx = html.indexOf('<script');
    expect(styleIdx).toBeGreaterThan(-1);
    expect(firstScriptIdx).toBeGreaterThan(-1);
    expect(styleIdx).toBeLessThan(firstScriptIdx);
  });
});

/* ── r176f · E-01/E-07 — the GENERIC primitives finally calibrated ── */

describe('r176f §E-01 — ListSkeleton/TableSkeleton anatomy pins (non-dashboard closure)', () => {
  it('ListSkeleton rows match the .list-row anatomy: 32px avatar + title/sub bars at sp-3/4 padding', () => {
    const { container } = render(<ListSkeleton rows={2} />);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    const rows = (container.firstChild as HTMLElement).children;
    expect(rows).toHaveLength(2);
    for (const row of Array.from(rows)) {
      const bars = row.querySelectorAll('.skeleton') as NodeListOf<HTMLElement>;
      // avatar circle (32×32) + title + sub + trailing chip
      expect(bars[0]?.style.width).toBe('32px');
      expect(bars[0]?.style.height).toBe('32px');
      expect(bars[1]?.style.height).toBe('12px'); // title line
      expect(bars[2]?.style.height).toBe('10px'); // sub line
      expect(bars[3]?.style.width).toBe('40px');
      // The real .list-row padding (sp-3/sp-4), not the old sp-2.
      expect(row).toHaveStyle({ padding: 'var(--sp-3) var(--sp-4)' });
    }
  });

  it('TableSkeleton renders a thead-shaped header row + %-based widths (E-07: no slivers at 360px)', () => {
    const { container } = render(<TableSkeleton rows={2} cols={4} />);
    const rows = Array.from((container.firstChild as HTMLElement).children);
    // 1 thead-shaped bar + 2 body rows.
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toHaveStyle({ minHeight: '44px' });
      const bars = row.querySelectorAll('.skeleton') as NodeListOf<HTMLElement>;
      expect(bars).toHaveLength(4);
      // Percent widths flex with the viewport instead of collapsing.
      expect(bars[0]?.style.width).toBe('18%');
      expect(bars[3]?.style.width).toBe('12%');
    }
  });
});
