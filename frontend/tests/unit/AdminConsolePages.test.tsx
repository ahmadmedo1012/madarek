/**
 * 5-B4 — admin console craft pins (audit 5-A8 §5/§6, P1-3, P2-1, P2-3).
 *
 * 1. MetricCard navigable variant (P1-3): `to` renders a router <Link>,
 *    `onClick` a <button> (aria-pressed passthrough), and the default
 *    form stays the plain non-interactive <div> every other consumer
 *    mounts — the variant is additive by construction, not convention.
 * 2. AdminDashboardPage (§6 steps 1/3/5): the «يحتاج انتباهك» action
 *    strip renders one row per actionable count and disappears when
 *    nothing needs attention; the four KPI tiles navigate (§5 rows
 *    1-4); a single-faculty student distribution degrades to the honest
 *    stat + drill link instead of a one-bar chart (§6 step 5).
 * 3. AdminReportsPage (§6 step 2 + §5 row 8): the analysis fold —
 *    trend bars ⇄ table via a URL-driven toggle; the papers register
 *    consumes GET /admin/papers (status pills, meta pagination footer);
 *    ?status= lands pre-filtered.
 * 4. AdminAnalysisPage redirects to /admin/reports?trend=table (old
 *    bookmarks keep working while the nav item is retired).
 * 5. AdminCoursesPage (P2-1): server-side q/facultyId filters + the
 *    meta-driven pagination footer — the KPI/subtitle read meta.total,
 *    never data.length.
 * 6. AdminFacultiesPage (P2-3): search + city filter + departments
 *    collapsed behind an aria-expanded row head.
 * 7. AdminDigitalPage (§6 step 4): the four single-stat cards fold into
 *    ONE «تبنّي المكوّنات» register.
 *
 * lib/api is mocked at the module boundary (the 16-E5 pattern) — timers
 * stay real so the 300ms debounce fires inside waitFor's act scope.
 */
import { beforeAll, describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Bar: () => <div data-testid="chart-bar" />,
}));

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: {} }));
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: { get, post },
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

import { MetricCard } from '../../src/components/primitives';
import {
  AdminDashboardPage,
  AdminFacultiesPage,
  AdminReportsPage,
  AdminCoursesPage,
} from '../../src/pages/admin/AdminPages';
import { AdminAnalysisPage, AdminDigitalPage } from '../../src/pages/admin/AdminExtraPages';
import { AdminSyncPage } from '../../src/pages/admin/AdminSyncPage';
import { api } from '../../src/lib/api';

const getMock = api.get as unknown as Mock;

/* ── Factories ─────────────────────────────────────────────────── */

const STATS = { totalStudents: 120, totalTeachers: 12, totalCourses: 6, totalEnrollments: 90 };

const facultyRow = (id: string, name: string, over: Partial<{
  studentCount: number; courseCount: number; teacherCount: number; city: string;
  departments: Array<{ id: string; name: string; students: number; teachers: number; courses: number }>;
}> = {}) => ({
  id,
  name,
  nameEn: null,
  iconEmoji: null,
  city: 'الزاوية',
  departmentCount: (over.departments ?? []).length,
  studentCount: 0,
  teacherCount: 0,
  courseCount: 0,
  departments: [],
  ...over,
});

// 9 faculties (> 8) so the dashboard's distribution drops zero-student
// rows exactly as the 25-faculty production data does — with only f1
// carrying students the chart degrades to the honest single-faculty form.
const FACULTIES = [
  facultyRow('f1', 'كلية الهندسة', {
    studentCount: 30, courseCount: 4, teacherCount: 5, city: 'الزاوية',
    departments: [{ id: 'd1', name: 'قسم الحاسوب', students: 30, teachers: 5, courses: 4 }],
  }),
  facultyRow('f2', 'كلية الطب', { city: 'طرابلس', departments: [{ id: 'd2', name: 'الجراحة', students: 0, teachers: 0, courses: 0 }] }),
  facultyRow('f3', 'كلية القانون'),
  facultyRow('f4', 'كلية الآداب'),
  facultyRow('f5', 'كلية العلوم'),
  facultyRow('f6', 'كلية الاقتصاد'),
  facultyRow('f7', 'كلية التربية'),
  facultyRow('f8', 'كلية الهندسة النفطية'),
  facultyRow('f9', 'كلية تقنية المعلومات'),
];

const REPORTS = {
  headline: { totalPapers: 5, publishedPapers: 3, totalUsers: 40, activeStudents: 20 },
  paperTrend: [
    { month: 'أبريل', submitted: 1, graded: 0, published: 0 },
    { month: 'مايو', submitted: 2, graded: 1, published: 1 },
  ],
  topCourses: [{ code: 'CS101', name: 'مقدمة في الحاسوب', enrollments: 40, lectures: 5 }],
};

const courseRow = (id: string, code: string, name: string, over: Partial<{
  totalLectures: number; totalMaterials: number;
}> = {}) => ({
  id,
  code,
  name,
  credits: 3,
  themeColor: null,
  faculty: 'كلية الهندسة',
  facultyEmoji: null,
  department: 'قسم الحاسوب',
  offeringCount: 1,
  conceptCount: 4,
  totalEnrollments: 10,
  totalLectures: 5,
  totalMaterials: 2,
  recentOfferings: [],
  ...over,
});

const paperRow = (id: string, title: string, status: string) => ({
  id,
  title,
  status,
  plagiarismPct: 12,
  aiContentPct: 3,
  uploadedAt: '2025-05-01T00:00:00.000Z',
  student: { id: 's1', firstName: 'أحمد', lastName: 'زكريا', avatarInitials: null, avatarColor: null },
  reviewer: null,
  offering: { course: { name: 'مقدمة في الحاسوب', code: 'CS101' } },
});

interface CallConfig { params?: Record<string, unknown> }

/** All GET /admin/courses request params, in call order. */
const coursesCalls = (): Array<Record<string, unknown>> =>
  getMock.mock.calls
    .filter((c) => c[0] === '/admin/courses')
    .map((c) => (c[1] as CallConfig | undefined)?.params ?? {});

/** All GET /admin/papers request params, in call order. */
const papersCalls = (): Array<Record<string, unknown>> =>
  getMock.mock.calls
    .filter((c) => c[0] === '/admin/papers')
    .map((c) => (c[1] as CallConfig | undefined)?.params ?? {});

/**
 * Installs a param-aware GET router. `courses` / `papers` receive the
 * request params and return the {data, meta} envelope (the hooks read
 * res.data.data + res.data.meta directly); everything else is a plain
 * unwrap body.
 */
function installApi(over: {
  courses?: (params: Record<string, unknown>) => { data: unknown[]; meta: unknown };
  papers?: (params: Record<string, unknown>) => { data: unknown[]; meta: unknown };
  zeroContentCourses?: boolean;
  staleCount?: number;
  gradedTotal?: number;
  sync?: {
    staleCount: number; latestRun: unknown; runHistory: unknown[]; factCount: number;
    categories: Array<{ category: string; count: number; items: Array<{ key: string; value: string; source: string; isStale: boolean; syncedAt: string }> }>;
  };
} = {}) {
  const {
    zeroContentCourses = true,
    staleCount = 0,
    gradedTotal = 2,
    sync,
  } = over;
  const allCourses = [
    courseRow('c1', 'CS101', 'مقدمة في الحاسوب', zeroContentCourses ? { totalLectures: 0, totalMaterials: 0 } : {}),
    courseRow('c2', 'CS201', 'هندسة البرمجيات'),
    courseRow('c3', 'CS301', 'قواعد البيانات'),
    courseRow('c4', 'CS401', 'الذكاء الاصطناعي'),
    courseRow('c5', 'CS501', 'أمن المعلومات'),
    courseRow('c6', 'CS601', 'شبكات الحاسوب'),
  ];
  const coursesHandler = over.courses ?? ((params: Record<string, unknown>) => {
    const page = (params.page as number) ?? 1;
    const limit = (params.limit as number) ?? 20;
    const q = params.q as string | undefined;
    const facultyId = params.facultyId as string | undefined;
    let rows = allCourses;
    if (facultyId) rows = rows.filter((c) => (facultyId === 'f1' ? c.code === 'CS101' : false));
    if (q === 'zzz') rows = [];
    const start = (page - 1) * limit;
    const slice = rows.slice(start, start + limit);
    return { data: slice, meta: { page, limit, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / limit)) } };
  });
  const papersHandler = over.papers ?? ((params: Record<string, unknown>) => {
    const status = params.status as string | undefined;
    if (status === 'GRADED') {
      return { data: [paperRow('p1', 'بحث أول', 'GRADED')], meta: { page: 1, limit: 20, total: gradedTotal, totalPages: 1 } };
    }
    const rows = status === 'PUBLISHED'
      ? [paperRow('p3', 'بحث منشور أول', 'PUBLISHED')]
      : [paperRow('p1', 'بحث مقيَّم أول', 'GRADED'), paperRow('p2', 'بحث مقيَّم ثانٍ', 'GRADED')];
    const total = status === 'PUBLISHED' ? 3 : 5;
    return { data: rows, meta: { page: 1, limit: 20, total, totalPages: 1 } };
  });
  getMock.mockImplementation(async (url: string, cfg?: CallConfig) => {
    const params = cfg?.params ?? {};
    switch (url) {
      case '/admin/stats':
        return { data: { data: STATS } };
      case '/admin/faculties':
        return { data: { data: FACULTIES } };
      case '/admin/reports':
        return { data: { data: REPORTS } };
      case '/faculties':
        return { data: { data: FACULTIES } };
      case '/admin/courses':
        return { data: coursesHandler(params) };
      case '/admin/papers':
        return { data: papersHandler(params) };
      case '/admin/sync':
        return {
          data: {
            data: sync ?? {
              staleCount,
              latestRun: null,
              runHistory: [],
              factCount: 8,
              categories: [
                { category: 'identity', count: 2, items: [{ key: 'name', value: 'الجامعة', source: 'static-markdown', isStale: false, syncedAt: '2025-05-01T00:00:00.000Z' }] },
                { category: 'contact', count: 2, items: [{ key: 'email', value: 'info@zu.edu.ly', source: 'static-markdown', isStale: true, syncedAt: '2025-01-01T00:00:00.000Z' }] },
              ],
            },
          },
        };
      case '/admin/digital':
        return {
          data: {
            data: {
              totalUsers: 40, activeUsers: 16, adoptionPct: 40, onlineExams: 2,
              examAttempts: 7, labSessions: 3, moocEnrollments: 11, researchPapers: 5,
              liveSessions: 4, materialsUploaded: 25,
            },
          },
        };
      default:
        return { data: {} };
    }
  });
}

function renderPage(ui: React.ReactElement, initialEntry = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// jsdom ships no scrollIntoView — stub the browser API (not app code):
// the reports register's landing scroll + KPI act-scroll call it.
beforeAll(() => {
  const proto = Element.prototype as Element & { scrollIntoView?: (o?: object) => void };
  proto.scrollIntoView = vi.fn();
});

beforeEach(() => {
  getMock.mockReset();
});

/* ── 1. MetricCard navigable variant (5-A8 P1-3) ───────────────── */

describe('MetricCard — additive navigable variant', () => {
  it('renders the plain <div> (no metric-link class, not focusable) when no to/onClick is given', () => {
    renderPage(<div><MetricCard label="الطلاب" value="120" /></div>);
    const el = document.querySelector('.metric');
    expect(el).not.toBeNull();
    expect(el!.tagName).toBe('DIV');
    expect(el!.classList.contains('metric-link')).toBe(false);
  });

  it('renders a router link with the go-chevron when `to` is given', () => {
    renderPage(<div><MetricCard label="الطلاب" value="120" to="/admin/students" actionHint="عرض قائمة الطلاب" /></div>);
    const link = document.querySelector('a.metric-link');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/admin/students');
    expect(link!.getAttribute('title')).toBe('عرض قائمة الطلاب');
    expect(link!.querySelector('.metric-go')).not.toBeNull();
  });

  it('renders a button with aria-pressed passthrough when `onClick` is given', () => {
    const onClick = vi.fn();
    renderPage(<div><MetricCard label="بحاجة لمتابعة" value="2" onClick={onClick} pressed actionHint="تصفية" /></div>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

/* ── 2. AdminDashboardPage (5-A8 §6 steps 1/3/5) ───────────────── */

/** The KPI link whose tile carries `label` (the strip becomes the map). */
const kpiLinkByLabel = (label: string) => {
  const el = Array.from(document.querySelectorAll('a.metric-link'))
    .find((a) => a.textContent?.includes(label));
  expect(el, `no metric-link tile carries «${label}»`).toBeDefined();
  return el!;
};

describe('AdminDashboardPage — action strip + navigable KPIs (§6 steps 1/3)', () => {
  it('renders the action strip rows from real counts, each linking to its surface', async () => {
    installApi({ zeroContentCourses: true, staleCount: 3, gradedTotal: 2 });
    renderPage(<AdminDashboardPage />);

    // Zero-content courses row → /admin/courses
    const coursesRow = await screen.findByText('مقرّرات بلا محتوى تعليميّ');
    expect(coursesRow.closest('a')!.getAttribute('href')).toBe('/admin/courses');
    // Stale sync fields row → /admin/sync
    const syncRow = screen.getByText('حقول بيانات جامعية قديمة');
    expect(syncRow.closest('a')!.getAttribute('href')).toBe('/admin/sync');
    // Graded-papers row → the register, pre-filtered (§5 landing craft)
    const papersRow = screen.getByText('بحوث مقيَّمة بانتظار النشر');
    expect(papersRow.closest('a')!.getAttribute('href')).toBe('/admin/reports?status=GRADED');
    expect(screen.getByText('يحتاج انتباهك')).toBeInTheDocument();
  });

  it('hides the strip entirely when nothing needs attention', async () => {
    installApi({ zeroContentCourses: false, staleCount: 0, gradedTotal: 0 });
    renderPage(<AdminDashboardPage />);

    // Wait for the page itself (KPIs + quick stats) — then the strip,
    // whose three sources all resolve to zero counts, must be absent.
    await screen.findByText('مؤشرات سريعة');
    await waitFor(() => {
      expect(screen.queryByText('يحتاج انتباهك')).toBeNull();
    });
  });

  it('makes the four KPI tiles navigate (§5 rows 1-4) — no dead ends', async () => {
    installApi();
    renderPage(<AdminDashboardPage />);
    await screen.findByText('لوحة الإدارة');

    expect(kpiLinkByLabel('الكلّيّات').getAttribute('href')).toBe('/admin/faculties');
    expect(kpiLinkByLabel('الطلاب').getAttribute('href')).toBe('/admin/students');
    expect(kpiLinkByLabel('هيئة التدريس').getAttribute('href')).toBe('/admin/teachers');
    expect(kpiLinkByLabel('المقرّرات').getAttribute('href')).toBe('/admin/courses');
  });

  it('degrades a single-faculty student distribution to the honest stat + drill link (§6 step 5)', async () => {
    installApi();
    renderPage(<AdminDashboardPage />);
    await screen.findByText('لوحة الإدارة');

    // Only كلية الهندسة has students → one bar would carry no signal.
    expect(await screen.findByText(/كلّيّة واحدة فقط لديها طلاب مسجَّلون/)).toBeInTheDocument();
    const drill = screen.getByRole('link', { name: /عرض طلاب الكلّيّة/ });
    expect(drill.getAttribute('href')).toBe('/admin/students?facultyId=f1');
  });

  it('links the quick-stat papers pair to the register pre-filtered (P3-2)', async () => {
    installApi();
    renderPage(<AdminDashboardPage />);
    await screen.findByText('لوحة الإدارة');

    const stat = Array.from(document.querySelectorAll('a.admin-stat-row'))
      .find((a) => a.textContent?.includes('بحوث منشورة'));
    expect(stat).toBeDefined();
    expect(stat!.getAttribute('href')).toBe('/admin/reports?status=PUBLISHED');
  });
});

/* ── 3. AdminReportsPage (§6 step 2 + §5 row 8) ────────────────── */

describe('AdminReportsPage — papers register + the analysis fold', () => {
  it('renders the papers register with status pills and meta-driven pagination footer', async () => {
    installApi({
      papers: () => ({
        data: [paperRow('p1', 'بحث مقيَّم أول', 'GRADED'), paperRow('p2', 'بحث مقيَّم ثانٍ', 'GRADED')],
        meta: { page: 1, limit: 20, total: 22, totalPages: 2 },
      }),
    });
    renderPage(<AdminReportsPage />);

    expect(await screen.findByText('بحث مقيَّم أول')).toBeInTheDocument();
    expect(screen.getByText(/الصفحة 1 من 2/)).toBeInTheDocument();

    // التالي requests page 2 from the server (meta pagination, not a slice).
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));
    await waitFor(() => {
      expect(papersCalls().some((p) => p.page === 2)).toBe(true);
    });
  });

  it('lands pre-filtered with ?status= (the pill arrives pressed)', async () => {
    installApi();
    renderPage(<AdminReportsPage />, '/admin/reports?status=PUBLISHED');

    await screen.findByText('بحث منشور أول');
    const publishedPill = screen.getByRole('button', { name: 'منشورة' });
    expect(publishedPill.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'الكل' }).getAttribute('aria-pressed')).toBe('false');
    // The register query itself carries the status (5-B1's endpoint).
    expect(papersCalls().some((p) => p.status === 'PUBLISHED')).toBe(true);
  });

  it('folds the analysis table view into the trend card (§6 step 2) — toggle, not a third page', async () => {
    installApi();
    renderPage(<AdminReportsPage />);

    await screen.findByText('حركة البحوث العلمية');
    expect(document.querySelector('table.trend-table')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'جدول' }));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'جدول' }).getAttribute('aria-selected')).toBe('true');
    });
    expect(document.querySelector('table.trend-table')).not.toBeNull();
    expect(within(document.querySelector('table.trend-table') as HTMLElement).getAllByRole('row'))
      .toHaveLength(REPORTS.paperTrend.length + 1); // header + 2 months

    fireEvent.click(screen.getByRole('tab', { name: 'أعمدة' }));
    await waitFor(() => {
      expect(document.querySelector('table.trend-table')).toBeNull();
    });
  });

  it('makes the papers KPIs act on the register (button + pre-filtered landing)', async () => {
    installApi();
    renderPage(<AdminReportsPage />);

    await screen.findByText('حركة البحوث العلمية');
    const published = screen.getByRole('button', { name: /بحوث منشورة/ });
    fireEvent.click(published);
    await waitFor(() => {
      expect(papersCalls().some((p) => p.status === 'PUBLISHED')).toBe(true);
    });
    expect(screen.getByRole('button', { name: 'منشورة' }).getAttribute('aria-pressed')).toBe('true');
  });
});

/* ── 4. AdminAnalysisPage — the redirect ───────────────────────── */

describe('AdminAnalysisPage — folds into /admin/reports (§6 step 2)', () => {
  it('redirects to the reports table view so old bookmarks keep working', async () => {
    let captured = '';
    const Probe = () => {
      const loc = useLocation();
      captured = loc.pathname + loc.search;
      return <div>probe</div>;
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin/analysis']}>
          <Routes>
            <Route path="/admin/analysis" element={<AdminAnalysisPage />} />
            <Route path="/admin/reports" element={<Probe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('probe');
    expect(captured).toBe('/admin/reports?trend=table');
  });
});

/* ── 5. AdminCoursesPage (5-A8 P2-1) ───────────────────────────── */

describe('AdminCoursesPage — server-side filters + meta pagination (P2-1)', () => {
  it('reads the roster total from meta (never data.length) and renders the roster', async () => {
    installApi();
    renderPage(<AdminCoursesPage />);

    await screen.findByText('مقدمة في الحاسوب');
    // 6 courses at limit 20 → the subtitle names the meta total.
    expect(screen.getByText(/6 مقرّرات في الجامعة/)).toBeInTheDocument();
  });

  it('sends q and facultyId server-side (debounced), and paginates via meta', async () => {
    installApi({
      courses: (params) => {
        const page = (params.page as number) ?? 1;
        const limit = (params.limit as number) ?? 20;
        const total = params.q === 'zzz' ? 0 : params.facultyId ? 1 : 22;
        const rows = params.q === 'zzz' ? [] : params.facultyId
          ? [courseRow('c1', 'CS101', 'مقدمة في الحاسوب')]
          : [courseRow('c1', 'CS101', 'مقدمة في الحاسوب'), courseRow('c2', 'CS201', 'هندسة البرمجيات')];
        return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
      },
    });
    renderPage(<AdminCoursesPage />);
    await screen.findByText('مقدمة في الحاسوب');

    // Server-side search (debounce fires inside waitFor's act scope).
    fireEvent.change(screen.getByLabelText('البحث في المقرّرات'), { target: { value: 'zzz' } });
    await screen.findByText('لا توجد نتائج');
    await waitFor(() => {
      expect(coursesCalls().some((p) => p.q === 'zzz')).toBe(true);
    });

    // The reset affordance clears the search server-side.
    // The reset clears the search server-side (last call carries no q).
    fireEvent.click(screen.getByRole('button', { name: /مسح البحث والفلتر/ }));
    await waitFor(() => {
      expect(coursesCalls().at(-1)?.q).toBeUndefined();
    });

    // Faculty filter goes server-side too (the old pills counted a subset).
    fireEvent.change(screen.getByLabelText('تصفية حسب الكلّيّة'), { target: { value: 'f1' } });
    await waitFor(() => {
      expect(coursesCalls().at(-1)?.facultyId).toBe('f1');
    });
  });

  it('renders the meta pagination footer and requests page 2', async () => {
    installApi({
      courses: (params) => {
        const page = (params.page as number) ?? 1;
        const rows = page === 1
          ? [courseRow('c1', 'CS101', 'مقدمة في الحاسوب'), courseRow('c2', 'CS201', 'هندسة البرمجيات')]
          : [courseRow('c3', 'CS301', 'قواعد البيانات')];
        return { data: rows, meta: { page, limit: 20, total: 22, totalPages: 2 } };
      },
    });
    renderPage(<AdminCoursesPage />);

    expect(await screen.findByText(/الصفحة 1 من 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));
    await screen.findByText('قواعد البيانات');
    expect(coursesCalls().some((p) => p.page === 2)).toBe(true);
  });
});

/* ── 6. AdminFacultiesPage (5-A8 P2-3) ─────────────────────────── */

describe('AdminFacultiesPage — retrieval affordances (P2-3)', () => {
  it('collapses departments behind an aria-expanded row head', async () => {
    installApi();
    renderPage(<AdminFacultiesPage />);
    await screen.findByText('كلية الهندسة');

    const head = screen.getByRole('button', { name: /كلية الهندسة/ });
    expect(head.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('قسم الحاسوب')).toBeNull();

    fireEvent.click(head);
    expect(head.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('قسم الحاسوب')).toBeInTheDocument();
  });

  it('filters client-side by name and resets from the empty state', async () => {
    installApi();
    renderPage(<AdminFacultiesPage />);
    await screen.findByText('كلية الهندسة');

    fireEvent.change(screen.getByLabelText('البحث في الكلّيّات'), { target: { value: 'الهندسة' } });
    expect(screen.getByText('كلية الهندسة')).toBeInTheDocument();
    expect(screen.queryByText('كلية الطب')).toBeNull();
    expect(screen.getByText(/بعد التصفيّة/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('البحث في الكلّيّات'), { target: { value: 'zzz' } });
    expect(await screen.findByText('لا توجد نتائج مطابقة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /مسح البحث والتصفيّة/ }));
    await waitFor(() => {
      expect(screen.getByText('كلية الهندسة')).toBeInTheDocument();
      expect(screen.getByText('كلية الطب')).toBeInTheDocument();
    });
  });
});

/* ── 7. AdminSyncPage (§5 row 10 — client-side drill) ──────────── */

describe('AdminSyncPage — «حقول قديمة» drills into the first stale category', () => {
  it('the stale KPI opens the FIRST stale category (skipping fresh ones)', async () => {
    installApi({
      sync: {
        staleCount: 1,
        latestRun: null,
        runHistory: [],
        factCount: 4,
        categories: [
          { category: 'identity', count: 2, items: [{ key: 'name', value: 'الجامعة', source: 'static-markdown', isStale: false, syncedAt: '2025-05-01T00:00:00.000Z' }] },
          { category: 'contact', count: 2, items: [{ key: 'email', value: 'info@zu.edu.ly', source: 'static-markdown', isStale: true, syncedAt: '2025-01-01T00:00:00.000Z' }] },
        ],
      },
    });
    renderPage(<AdminSyncPage />);

    // The stale tile acts (a button) — click opens the first STALE category.
    const tile = await screen.findByRole('button', { name: /حقول مُزامنة/ });
    fireEvent.click(tile);
    const heads = Array.from(document.querySelectorAll('.category-row-head'));
    const contact = heads.find((h) => h.textContent.includes('بيانات التواصل'));
    expect(contact!.getAttribute('aria-expanded')).toBe('true');
    const identity = heads.find((h) => h.textContent.includes('هوية الجامعة'));
    expect(identity!.getAttribute('aria-expanded')).toBe('false');
    // The stale fact row carries its «قديم» badge.
    expect(await screen.findByText('قديم')).toBeInTheDocument();
  });
});

/* ── 8. AdminDigitalPage (§6 step 4) ───────────────────────────── */

describe('AdminDigitalPage — one adoption register (§6 step 4)', () => {
  it('folds the four single-stat cards into one «تبنّي المكوّنات» table', async () => {
    installApi();
    renderPage(<AdminDigitalPage />);

    expect(await screen.findByText('تبنّي المكوّنات')).toBeInTheDocument();
    expect(screen.getByText('محاولات أداء')).toBeInTheDocument();
    expect(screen.getByText('جلسات بثّ مباشر')).toBeInTheDocument();
    expect(screen.getByText('أوراق علميّة في النظام')).toBeInTheDocument();
    // KPI strip keeps its pair of headline adoption metrics.
    expect(screen.getByText('نسبة التبنّي')).toBeInTheDocument();
  });
});
