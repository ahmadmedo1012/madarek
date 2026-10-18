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
 *
 * r183-B5 additions (A8 wave-A P2-2 recurrence — the silent-capped
 * rosters): server-side search wiring (the debounced `q` rides the
 * request; the param-aware mock proves the term left the client), the
 * honest meta.total count line + «تُعرض أول N» cap note, and the
 * no-matches empty state with its clear affordance. Timers stay real
 * so the 300ms debounce fires inside waitFor's act (the
 * AdminGovernancePages pattern).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    // 5-B4: param-aware — the ?metric= drill (5-B1's endpoint) keys its
    // fixture as `${url}?${params}`; paramless calls keep the bare url.
    // r183-B5: envelope fixtures ({ data, meta }) ride the response body
    // directly (the page-level hooks read res.data — the r165g mock
    // shape); legacy bare fixtures keep the unwrap-compatible double
    // wrap, so both generations of hooks resolve from one mock.
    get: (url: string, opts?: { params?: Record<string, unknown> }) => {
      const params = opts?.params;
      const key = params && Object.keys(params).length > 0
        ? `${url}?${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}`
        : url;
      const data = FIXTURES[key];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${key}`));
      const isEnvelope =
        typeof data === 'object' && data !== null && !Array.isArray(data)
        && 'data' in data && 'meta' in data;
      return Promise.resolve(isEnvelope ? { data } : { data: { data } });
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

function renderPage(ui: React.ReactElement, initialEntry = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  FIXTURES['/quality/overview'] = OVERVIEW;
  FIXTURES['/quality/engagement'] = ENGAGEMENT;
  FIXTURES['/quality/professors'] = PROFESSORS;
  FIXTURES['/quality/courses'] = COURSES;
  delete FIXTURES['/quality/alerts'];
  delete FIXTURES['/quality/courses?q=مقدمة'];
  delete FIXTURES['/quality/professors?q=الطاهر'];
  delete FIXTURES['/quality/professors?q=لا-أحد'];
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

describe('QualityCoursesPage — ?metric= drill-down (5-B4, 5-A8 §5 row 11)', () => {
  it('lands pre-filtered: metric column, honest «لا بيانات» for null metrics, reset affordance', async () => {
    FIXTURES['/quality/courses?metric=attendance'] = [
      {
        ...COURSES[0],
        metrics: { attendanceRate: 100, completionRate: null },
      },
      {
        ...COURSES[1],
        metrics: { attendanceRate: null, completionRate: 40 },
      },
    ];
    renderPage(<QualityCoursesPage />, '/quality/courses?metric=attendance');

    // The subtitle names the drill; the metric column rides the roster.
    expect(await screen.findByText(/مقرّر مكتمل/)).toBeInTheDocument();
    expect(screen.getByText(/من الأدنى أولا/)).toBeInTheDocument();
    expect(screen.getByText('معدل الحضور', { selector: 'th' })).toBeInTheDocument();

    // 100% for the counted offering (metric + completion columns); an
    // honest neutral «لا بيانات» for the null one (never a fake 0/100%).
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getByText('لا بيانات')).toBeInTheDocument();

    // The reset affordance returns to the full roster (no metric param).
    fireEvent.click(screen.getByRole('button', { name: /عرض الجدول الكامل/ }));
    await waitFor(() => {
      expect(screen.queryByText('معدل الحضور', { selector: 'th' })).toBeNull();
    });
  });
});

describe('QualityProfessorsPage — «بحاجة لمتابعة» filters the roster (5-B4, 5-A8 §5 row 12)', () => {
  it('the KPI acts as a toggle: compliance < 50% roster, badge, and back', async () => {
    FIXTURES['/quality/professors'] = [
      PROFESSORS[0], // سالم — compliance 80
      {
        ...PROFESSORS[0],
        id: 't2',
        firstName: 'خالد',
        lastName: 'العمروني',
        compliance: 40,
      },
    ];
    renderPage(<QualityProfessorsPage />);

    // KPI counts the low-compliance teacher and renders as a BUTTON
    // (the old tile was a terminal stat). The value is a <CountIn>
    // count-UP animation — the button mounts as soon as data lands but
    // the digit may still read the pre-tick value, so await the settle
    // (this was the campaign's one flaky assertion: findByRole resolved
    // mid-animation and intermittently read '0').
    const toggle = await screen.findByRole('button', { name: /بحاجة لمتابعة/ });
    await waitFor(() => {
      expect(toggle.textContent).toContain('1');
    });

    fireEvent.click(toggle);
    expect(await screen.findByText(/خالد/)).toBeInTheDocument();
    expect(screen.queryByText(/سالم/)).toBeNull();
    expect(screen.getByText('مصفّى: التزام أقلّ من 50%')).toBeInTheDocument();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    // And back — the full roster returns.
    fireEvent.click(screen.getByRole('button', { name: /عرض جميع الأساتذة/ }));
    await waitFor(() => {
      expect(screen.getByText(/سالم/)).toBeInTheDocument();
    });
  });
});

/* r183-B5 — the silent-capped rosters became searchable + honestly
 * counted: the debounced `q` rides the request server-side (the
 * param-aware mock resolves ONLY the keyed fixture, so a passing test
 * proves the term left the client), and meta.total drives the count
 * line with a «تُعرض أول N» cap note when take truncates the list. */
describe('QualityCoursesPage — server-side search + honest total (r183-B5)', () => {
  it('sends the debounced term server-side (q param), shows the matched total, and clears back', async () => {
    FIXTURES['/quality/courses?q=مقدمة'] = { data: [COURSES[1]], meta: { total: 1 } };
    renderPage(<QualityCoursesPage />);
    await screen.findByText('مقرّر بلا محتوى'); // the full roster rendered

    // Type → 300ms debounce → ONE server call carrying q (the keyed
    // fixture is the proof — the bare fixture still holds the full list).
    // Await the searched state POSITIVELY: the key-change refetch passes
    // through the pending skeleton, so "old row gone" alone would pass
    // mid-flight.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'مقدمة' } });
    expect(await screen.findByText('مقرّر واحد مطابقة للبحث', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('مقرّر مكتمل')).toBeInTheDocument();
    expect(screen.queryByText('مقرّر بلا محتوى')).toBeNull();

    // The clear affordance returns the full roster (no q param) — the
    // rows-state clear is the input itself (the AdminCoursesPage
    // contract: the dedicated clear button lives in the empty state).
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    await waitFor(
      () => expect(screen.getByText('مقرّر بلا محتوى')).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it('zero matches → the honest empty state with the clear affordance (not a bare table)', async () => {
    FIXTURES['/quality/courses?q=لا-شيء'] = { data: [], meta: { total: 0 } };
    renderPage(<QualityCoursesPage />);
    await screen.findByText('مقرّر بلا محتوى');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'لا-شيء' } });
    expect(await screen.findByText('لا نتائج مطابقة', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('لم نجد مقرّراً يطابق البحث — جرّب كلمة أوسع أو امسح البحث.')).toBeInTheDocument();
  });

  it('shows the meta.total count line and the honest «تُعرض أول N» cap note when take truncates', async () => {
    // 2 visible rows, 62 in the institution — the old page silently
    // pretended 2 was the whole story.
    FIXTURES['/quality/courses'] = { data: COURSES, meta: { total: 62 } };
    renderPage(<QualityCoursesPage />);
    await screen.findByText('مقرّر مكتمل');

    expect(screen.getByText(/62 مقرّراً/)).toBeInTheDocument();
    expect(screen.getByText(/تُعرض أول 2/)).toBeInTheDocument();
  });
});

describe('QualityProfessorsPage — server-side search + honest total (r183-B5)', () => {
  it('sends the debounced term server-side (q param) and clears back', async () => {
    FIXTURES['/quality/professors?q=الطاهر'] = { data: PROFESSORS, meta: { total: 1 } };
    renderPage(<QualityProfessorsPage />);
    await screen.findByText(/سالم/);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'الطاهر' } });
    await waitFor(
      () => expect(screen.getByText('أستاذ واحد مطابقة للبحث')).toBeInTheDocument(),
      { timeout: 2000 },
    );

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    await waitFor(
      () => expect(screen.queryByText('مطابقة للبحث')).toBeNull(),
      { timeout: 2000 },
    );
  });

  it('zero matches → the honest empty state (the KPI band stays above it)', async () => {
    FIXTURES['/quality/professors?q=لا-أحد'] = { data: [], meta: { total: 0 } };
    renderPage(<QualityProfessorsPage />);
    await screen.findByText(/سالم/);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'لا-أحد' } });
    expect(await screen.findByText('لا نتائج مطابقة', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /مسح البحث/ })).toBeInTheDocument();
    // Chrome honesty: the KPI strip and h1 stay (r157 discipline).
    expect(screen.getByRole('heading', { level: 1, name: 'تقييم الأساتذة' })).toBeInTheDocument();
  });

  it('shows the meta.total count line with the cap note when take truncates', async () => {
    FIXTURES['/quality/professors'] = { data: PROFESSORS, meta: { total: 104 } };
    renderPage(<QualityProfessorsPage />);
    await screen.findByText(/سالم/);

    expect(screen.getByText(/104 أستاذاً/)).toBeInTheDocument();
    expect(screen.getByText(/تُعرض أول 1/)).toBeInTheDocument();
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

/* r157 (6A9 #5) REGRESSION PIN — early-error returns keep the page chrome.
 *
 * QualityDashboardPage and QualityProfessorsPage used to early-return a
 * bare <ErrorState/> on a failed primary query — an API blip stripped
 * the h1 (which page am I on?) and offered a retry on a chrome-less
 * wall. Both now wrap .page + header + h1 around the error card, so
 * the chrome stays ABOVE the retry button. QualityCoursesPage keeps
 * its in-page ternary BELOW the header (chrome by construction — its
 * roster tests above already pin the header's presence).
 */
describe('QualityDashboardPage / QualityProfessorsPage — error states keep the page chrome (r157, 6A9 #5)', () => {
  it('dashboard error: the h1 «لوحة الجودة» stays above the retry', async () => {
    delete FIXTURES['/quality/overview']; // → the mocked api rejects
    renderPage(<QualityDashboardPage />);

    // Await the error settle (the pending skeleton carries the same
    // h1 — the retry button is the error-state marker).
    const retry = await screen.findByRole('button', { name: /إعادة المحاولة/ });
    // r183-B6 (A4 P3-7): the h1 moved from «مركز ضمان الجودة» to
    // «لوحة الجودة» — it must equal resolveTitle('/quality/dashboard')
    // (the nav label the topbar and document.title already carry).
    const h1 = screen.getByRole('heading', { level: 1, name: 'لوحة الجودة' });
    // DOM order: the header (h1) renders before the retry button.
    expect(
      h1.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('professors error: the h1 «تقييم الأساتذة» stays above the retry', async () => {
    delete FIXTURES['/quality/professors'];
    renderPage(<QualityProfessorsPage />);

    const retry = await screen.findByRole('button', { name: /إعادة المحاولة/ });
    const h1 = screen.getByRole('heading', { level: 1, name: 'تقييم الأساتذة' });
    expect(
      h1.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
