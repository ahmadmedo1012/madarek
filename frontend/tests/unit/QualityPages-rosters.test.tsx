/**
 * Wave 22-d — quality rosters honesty + responsive-collapse tests
 * (audit 4-A8 P1-1, P2-4, P3-5).
 *
 * 1. P1-1: both quality rosters (courses + professors) carry the shared
 *    .tbl-stack mobile pattern with per-cell data-labels — they used to
 *    be the only authed rosters without it (524px sideways scroll at
 *    390px).
 * 2. P2-4: the invented «الجودة %» column is renamed «اكتمال المحتوى»,
 *    its weights ship in the header tooltip, and a zero-content
 *    offering renders the NEUTRAL «لا محتوى بعد» badge — the danger
 *    register no longer fires on "no data yet".
 * 3. P3-5: the dashboard alerts card's error path offers an in-place
 *    retry + a link to /quality/alerts (it used to tell the user to
 *    reload the page).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  QualityDashboardPage,
  QualityCoursesPage,
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
const COURSES = [
  {
    id: 'off-empty',
    term: '2024-2025/1',
    course: { id: 'c1', name: 'مقرّر بلا محتوى', code: 'CS000' },
    teacher: { id: 't1', firstName: 'سالم', lastName: 'الطاهر' },
    _count: { enrollments: 12, lectures: 0, materials: 0, assignments: 0 },
  },
  {
    id: 'off-rich',
    term: '2024-2025/1',
    course: { id: 'c2', name: 'مقرّر مكتمل', code: 'CS101' },
    teacher: { id: 't2', firstName: 'خالد', lastName: 'العمروني' },
    _count: { enrollments: 40, lectures: 5, materials: 4, assignments: 2 },
  },
];
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
  FIXTURES['/quality/professors'] = PROFESSORS;
  FIXTURES['/quality/courses'] = COURSES;
  delete FIXTURES['/quality/alerts'];
});

describe('QualityCoursesPage — mobile collapse + honest completion (A8 P1-1, P2-4)', () => {
  it('tags the roster with tbl-stack and labels every cell', async () => {
    renderPage(<QualityCoursesPage />);
    await screen.findByText('مقرّر مكتمل');

    const table = document.querySelector('table.table.tbl-stack');
    expect(table).not.toBeNull();
    // 7 columns × 2 rows — every td carries its column name.
    const cells = Array.from(table!.querySelectorAll('td'));
    expect(cells).toHaveLength(14);
    for (const td of cells) {
      expect(td.getAttribute('data-label')).toBeTruthy();
    }
    expect(cells.some((td) => td.getAttribute('data-label') === 'اكتمال المحتوى')).toBe(true);
  });

  it('renames the invented «الجودة» column and surfaces the weights in the header tooltip', async () => {
    renderPage(<QualityCoursesPage />);
    await screen.findByText('مقرّر مكتمل');

    expect(screen.queryByText('الجودة')).toBeNull();
    const header = screen.getByText('اكتمال المحتوى', { selector: 'th' });
    expect(header.getAttribute('title')).toContain('20');
    expect(header.getAttribute('title')).toContain('10');
  });

  it('renders a NEUTRAL «لا محتوى بعد» for zero-content offerings — never a red 0%', async () => {
    renderPage(<QualityCoursesPage />);
    await screen.findByText('مقرّر مكتمل');

    expect(screen.getByText('لا محتوى بعد')).toBeInTheDocument();
    expect(screen.queryByText('0%')).toBeNull();
    // The rich offering keeps its colored percentage.
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('QualityProfessorsPage — mobile collapse (A8 P1-1)', () => {
  it('tags the 8-column roster with tbl-stack and labels every cell', async () => {
    renderPage(<QualityProfessorsPage />);
    await screen.findByText(/سالم/);

    const table = document.querySelector('table.table.tbl-stack');
    expect(table).not.toBeNull();
    const cells = Array.from(table!.querySelectorAll('td'));
    expect(cells).toHaveLength(8);
    for (const td of cells) {
      expect(td.getAttribute('data-label')).toBeTruthy();
    }
    expect(cells.some((td) => td.getAttribute('data-label') === 'الملفات المرفوعة')).toBe(true);
    expect(cells.some((td) => td.getAttribute('data-label') === 'الالتزام')).toBe(true);
  });
});

describe('QualityDashboardPage — alerts card error path retries in place (A8 P3-5)', () => {
  it('offers an in-place retry and a link to /quality/alerts instead of "reload the page"', async () => {
    // /quality/alerts is absent from FIXTURES → the mocked api rejects →
    // the card's error path renders (the other queries resolve).
    renderPage(<QualityDashboardPage />);

    expect(await screen.findByText('تعذّر تحميل التنبيهات')).toBeInTheDocument();
    expect(screen.queryByText(/حدّث الصفحة/)).toBeNull();

    const retry = screen.getByRole('button', { name: /إعادة المحاولة/ });
    expect(retry).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'صفحة التنبيهات' });
    expect(link).toHaveAttribute('href', '/quality/alerts');
  });
});
