/**
 * WS-F6 — Quality dashboard honesty tests.
 *
 * 1. The "مؤشرات الجودة الأساسية" KPI bars must derive from the real
 *    /quality/overview + /quality/engagement payloads — the old
 *    hardcoded 68/82/91 bars (رقمنة المقررات / استجابة الأساتذة /
 *    جاهزية المنصة) presented numbers no API provides.
 * 2. The dashboard's alerts card must render /quality/alerts data
 *    (the old card was three static AlertRows) and link to the full
 *    page.
 * 3. The engagement page must not carry the fabricated
 *    "إجابة نقاط التفاعل" 62% bar.
 * 4. The professors table satisfaction cell must use the AA-safe
 *    gold-ink text token (gold fill colour was 2.20:1 on light).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  QualityDashboardPage,
  QualityEngagementPage,
  QualityProfessorsPage,
} from '../../src/pages/quality/QualityPages';

// jsdom has no canvas — stub the chart components.
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
  Bar: () => <div data-testid="chart-bar" />,
}));

const FIXTURES: Record<string, unknown> = {};

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve({ data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

const OVERVIEW = {
  users: { STUDENT: 300, TEACHER: 25 },
  courses: 40,
  offerings: 30,
  lectures: 500,
  attendance: { PRESENT: 800, LATE: 50, ABSENT: 50 },
  papers: { UPLOADED: 2, GRADED: 5, PUBLISHED: 3 },
};
const ENGAGEMENT = {
  attendance: { presentRate: 90, lateRate: 5, absentRate: 5, total: 900 },
  videos: { totalLectures: 500, totalEvents: 120, completionRate: 66.5, completedLectures: 40 },
  enrollments: 240,
  totalStudents: 300,
  papersByStatus: {},
  weeklyActive: [10, 20, 30, 40, 50, 60, 70],
  weeklyActiveEstimated: false,
};
const ALERTS = {
  alerts: [
    {
      id: 'att-1',
      severity: 'critical',
      category: 'attendance',
      title: 'غياب جماعيّ بنسبة 30٪',
      description: 'مقرر تجريبي (CS101) — 30 غياب من 100 جلسة آخر 30 يوماً',
      occurredAt: new Date().toISOString(),
    },
  ],
  counts: { critical: 1, warning: 0, info: 0, total: 1 },
};
const PROFESSORS = [
  {
    id: 't1',
    firstName: 'سالم',
    lastName: 'الطاهر',
    avatarInitials: null,
    avatarColor: null,
    rank: 'PROFESSOR',
    specialty: 'شبكات',
    faculty: 'كلية الهندسة',
    department: 'قسم الحاسوب',
    offerings: 2,
    totals: { enrollments: 90, materials: 12, lectures: 30, assignments: 4, attendance: 20 },
    satisfaction: 4.2,
    responseHours: 6,
    compliance: 80,
  },
];

function renderPage(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  FIXTURES['/quality/overview'] = OVERVIEW;
  FIXTURES['/quality/engagement'] = ENGAGEMENT;
  FIXTURES['/quality/alerts'] = ALERTS;
  FIXTURES['/quality/professors'] = PROFESSORS;
});

describe('QualityDashboardPage — real payload, no fabricated KPIs', () => {
  it('derives every KPI bar from the API payloads', async () => {
    renderPage(<QualityDashboardPage />);

    // presentRate (engagement payload) — 90
    const attendance = await screen.findByRole('progressbar', { name: 'معدل الحضور التراكمي' });
    expect(attendance).toHaveAttribute('aria-valuenow', '90');

    // completionRate (engagement payload) — 66.5
    expect(screen.getByRole('progressbar', { name: 'معدل إكمال المحاضرات' }))
      .toHaveAttribute('aria-valuenow', '66.5');

    // enrollments ÷ totalStudents = 240/300 → 80
    expect(screen.getByRole('progressbar', { name: 'معدل تسجيل الطلاب في المقررات' }))
      .toHaveAttribute('aria-valuenow', '80');

    // papers GRADED+PUBLISHED ÷ total = 8/10 → 80
    expect(screen.getByRole('progressbar', { name: 'نسبة البحوث المكتملة التقييم' }))
      .toHaveAttribute('aria-valuenow', '80');

    // The fabricated bars are gone — their labels must not render.
    expect(screen.queryByText('رقمنة المقررات')).toBeNull();
    expect(screen.queryByText('استجابة الأساتذة')).toBeNull();
    expect(screen.queryByText('جاهزية المنصة')).toBeNull();
  });

  it('renders real /quality/alerts rows and links to the full page', async () => {
    renderPage(<QualityDashboardPage />);

    expect(await screen.findByText('غياب جماعيّ بنسبة 30٪')).toBeInTheDocument();
    expect(screen.getByText(/CS101/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /عرض كل التنبيهات/ });
    expect(link).toHaveAttribute('href', '/quality/alerts');

    // The three static rows the old card shipped are gone.
    expect(screen.queryByText('6 أساتذة لم يسجّلوا الحضور')).toBeNull();
  });

  it('shows the empty state when the alerts query returns none', async () => {
    FIXTURES['/quality/alerts'] = { alerts: [], counts: { critical: 0, warning: 0, info: 0, total: 0 } };
    renderPage(<QualityDashboardPage />);

    expect(await screen.findByText('لا توجد تنبيهات')).toBeInTheDocument();
  });
});

describe('QualityEngagementPage — fabricated interaction bar removed', () => {
  it('has no "إجابة نقاط التفاعل" progressbar (no API field backs it)', async () => {
    renderPage(<QualityEngagementPage />);

    await screen.findByRole('progressbar', { name: 'معدل إكمال المحاضرات' });
    expect(screen.queryByRole('progressbar', { name: 'إجابة نقاط التفاعل' })).toBeNull();
    // The remaining bars are all payload-derived.
    expect(screen.getByRole('progressbar', { name: 'نسبة الغياب' }))
      .toHaveAttribute('aria-valuenow', '5');
  });
});

describe('QualityProfessorsPage — gold text uses the ink token', () => {
  it('renders the satisfaction cell with var(--gold-ink)', async () => {
    renderPage(<QualityProfessorsPage />);

    await screen.findByText(/سالم/);
    const cells = Array.from(document.querySelectorAll<HTMLElement>('.tbl-num'));
    const satCell = cells.find((c) => c.style.color.includes('gold-ink'));
    expect(satCell).toBeDefined();
    expect(satCell!.style.color).toBe('var(--gold-ink, var(--c-yellow-deep))');
    expect(satCell!.textContent).toContain('4.2');
  });
});
