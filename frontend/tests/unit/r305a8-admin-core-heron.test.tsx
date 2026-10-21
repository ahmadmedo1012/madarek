/**
 * R305-A8 — admin core Heron transformation regression pins.
 *
 * The visual pass on AdminPages.tsx (dashboard, faculties roster,
 * reports/analysis + papers register, courses) is a marker + hierarchy
 * change, and every pin here binds to THAT contract — never to a
 * styling accident:
 *
 *  1. The scoped sheet rides the module: `r305-admin-owner.css` is
 *     imported directly AFTER `admin.css` (later import wins the
 *     @layer pages tie), and every page-root branch — the resolved
 *     render AND each early return (pending mirror, error wall) —
 *     carries the `.r305ao` marker the sheet scopes under.
 *  2. The destructive verb stands apart: the courses row delete
 *     renders with the standalone `.r305ao-btn-danger` Heron danger
 *     fill, and the accessible ConfirmDialog flow behind it is
 *     untouched (the r153i contract — never a silent success).
 *  3. The real pages still render real data: the dashboard's action
 *     strip, the faculties roster, the papers register and the courses
 *     table all resolve through the same lib/api boundary the
 *     AdminConsolePages suite pins — the Heron pass changed no data
 *     flow, so the resolved states mount.
 *
 * lib/api is mocked at the module boundary (the 16-E5 pattern);
 * react-chartjs-2 is stubbed (no canvas in jsdom).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Bar: () => <div data-testid="chart-bar" />,
}));

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: {} }));
  const post = vi.fn(async () => ({ data: {} }));
  const patch = vi.fn(async () => ({ data: {} }));
  const del = vi.fn(async () => ({ data: {} }));
  return {
    api: { get, post, patch, delete: del },
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

import {
  AdminDashboardPage,
  AdminFacultiesPage,
  AdminReportsPage,
  AdminCoursesPage,
} from '../../src/pages/admin/AdminPages';
import { api } from '../../src/lib/api';

const getMock = api.get as unknown as Mock;

/* ── Fixtures (the AdminConsolePages shapes, trimmed) ──────────── */

const STATS = { totalStudents: 120, totalTeachers: 12, totalCourses: 6, totalEnrollments: 90 };

const FACULTIES = [
  {
    id: 'f1', name: 'كلية الهندسة', nameEn: null, iconEmoji: null, city: 'الزاوية',
    departmentCount: 1, studentCount: 30, teacherCount: 5, courseCount: 4,
    departments: [{ id: 'd1', name: 'قسم الحاسوب', students: 30, teachers: 5, courses: 4 }],
  },
  {
    id: 'f2', name: 'كلية القانون', nameEn: null, iconEmoji: null, city: 'طرابلس',
    departmentCount: 0, studentCount: 0, teacherCount: 0, courseCount: 0,
    departments: [],
  },
];

const REPORTS = {
  headline: { totalPapers: 5, publishedPapers: 3, totalUsers: 40, activeStudents: 20 },
  paperTrend: [
    { month: 'أبريل', submitted: 1, graded: 0, published: 0 },
    { month: 'مايو', submitted: 2, graded: 1, published: 1 },
  ],
  topCourses: [{ code: 'CS101', name: 'مقدمة في الحاسوب', enrollments: 40, lectures: 5 }],
};

const COURSES = [
  {
    id: 'c1', code: 'CS101', name: 'مقدمة في الحاسوب', credits: 3, themeColor: null,
    faculty: 'كلية الهندسة', facultyEmoji: null, department: 'قسم الحاسوب',
    departmentId: 'd1', offeringCount: 1, conceptCount: 4, totalEnrollments: 10,
    // Zero-content — the dashboard's action strip builds its «مقرّرات
    // بلا محتوى تعليميّ» row from exactly this shape.
    totalLectures: 0, totalMaterials: 0, recentOfferings: [],
  },
  {
    id: 'c2', code: 'CS201', name: 'هندسة البرمجيات', credits: 3, themeColor: null,
    faculty: 'كلية الهندسة', facultyEmoji: null, department: 'قسم الحاسوب',
    departmentId: 'd1', offeringCount: 2, conceptCount: 4, totalEnrollments: 8,
    totalLectures: 6, totalMaterials: 3, recentOfferings: [],
  },
];

const PAPERS = [
  {
    id: 'p1', title: 'بحث مقيَّم أول', status: 'GRADED', plagiarismPct: 12, aiContentPct: 3,
    uploadedAt: '2025-05-01T00:00:00.000Z',
    student: { id: 's1', firstName: 'أحمد', lastName: 'زكريا', avatarInitials: null, avatarColor: null },
    reviewer: null,
    offering: { course: { name: 'مقدمة في الحاسوب', code: 'CS101' } },
  },
];

/** Param-aware GET router — the {data, meta} envelope for the paged
 *  rosters, the plain unwrap body for everything else. */
function installApi() {
  getMock.mockImplementation(async (url: string, cfg?: { params?: Record<string, unknown> }) => {
    const params = cfg?.params ?? {};
    switch (url) {
      case '/admin/stats':
        return { data: { data: STATS } };
      case '/admin/faculties':
      case '/faculties':
        return { data: { data: FACULTIES } };
      case '/admin/reports':
        return { data: { data: REPORTS } };
      case '/admin/courses': {
        const page = (params.page as number) ?? 1;
        const limit = (params.limit as number) ?? 20;
        const slice = COURSES.slice((page - 1) * limit, page * limit);
        return {
          data: {
            data: slice,
            meta: { page, limit, total: COURSES.length, totalPages: 1 },
          },
        };
      }
      case '/admin/papers': {
        const gradedOnly = params.status === 'GRADED';
        const total = gradedOnly ? 2 : 5;
        return {
          data: {
            data: PAPERS,
            // totalPages 2 so the register's pagination footer mounts
            // (it renders only when totalPages > 1 — the same gate the
            // AdminConsolePages suite pins).
            meta: { page: 1, limit: 20, total, totalPages: 2 },
          },
        };
      }
      case '/admin/sync':
        return { data: { data: { staleCount: 0, latestRun: null, runHistory: [], factCount: 0, categories: [] } } };
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

/** The page root: the marker lives on the .page frame itself. */
const markedRoot = (container: HTMLElement) => {
  const root = container.querySelector('.r305ao');
  expect(root, 'no .r305ao marker anywhere in the rendered page').not.toBeNull();
  expect(root).toHaveClass('page');
  // The marker is the ROOT, not a nested chip: its parent is the test
  // container (providers render no DOM), so the scoped sheet reaches
  // every section below it.
  expect(root!.parentElement).toBe(container);
  return root!;
};

// jsdom ships no scrollIntoView — the reports register's landing scroll
// calls it when ?status= is present (browser API stub, not app code).
beforeAll(() => {
  const proto = Element.prototype as Element & { scrollIntoView?: (o?: object) => void };
  proto.scrollIntoView = vi.fn();
});

beforeEach(() => {
  getMock.mockReset();
});

/* ── 1. The scoped sheet rides the module ──────────────────────── */

describe('R305-A8 — the scoped Heron sheet wiring (source pins)', () => {
  const src = () =>
    readFileSync(resolvePath(__dirname, '../../src/pages/admin/AdminPages.tsx'), 'utf8');

  it('r305-admin-owner.css is imported directly after admin.css (later import wins the layer tie)', () => {
    const source = src();
    const adminAt = source.indexOf("import '../../styles/admin.css'");
    const heronAt = source.indexOf("import '../../styles/r305-admin-owner.css'");
    expect(adminAt).toBeGreaterThan(-1);
    expect(heronAt).toBeGreaterThan(adminAt);
  });

  it('every page-root branch carries the marker — no bare .page root survives', () => {
    const source = src();
    // Ten roots: the dashboard's pending/error/resolved trio, the
    // faculties trio, the reports trio, and the courses root.
    expect(source.match(/className="page r305ao"/g)).toHaveLength(10);
    // The unscoped bare root must never come back (the sheet cannot
    // reach a page whose root lost the marker).
    expect(source).not.toContain('className="page"');
  });
});

/* ── 2. Every exported page root mounts with the marker ────────── */

describe('R305-A8 — the r305ao marker on every admin core page root', () => {
  it('AdminDashboardPage (resolved): the marker rides the .page frame', async () => {
    installApi();
    const { container } = renderPage(<AdminDashboardPage />);
    await screen.findByText('مؤشرات سريعة');
    markedRoot(container);
  });

  it('AdminDashboardPage (pending mirror): the skeleton branch keeps the marker', () => {
    // Nothing ever resolves — the page holds its aria-busy mirror.
    getMock.mockImplementation(() => new Promise(() => undefined));
    const { container } = renderPage(<AdminDashboardPage />);
    expect(screen.getByText('لوحة الإدارة')).toBeInTheDocument();
    const root = container.querySelector('.r305ao');
    expect(root).not.toBeNull();
    expect(root).toHaveClass('page');
    expect(root).toHaveAttribute('aria-busy', 'true');
  });

  it('AdminDashboardPage (error): the chrome-kept error branch keeps the marker', async () => {
    getMock.mockImplementation(async () => { throw new Error('ADMIN_STATS_FAILED'); });
    const { container } = renderPage(<AdminDashboardPage />);
    await screen.findByText('تعذَّر تحميل هذا القسم');
    markedRoot(container);
  });

  it('AdminFacultiesPage (resolved): the roster root carries the marker', async () => {
    installApi();
    const { container } = renderPage(<AdminFacultiesPage />);
    await screen.findByText('كلية الهندسة');
    markedRoot(container);
  });

  it('AdminFacultiesPage (pending): the skeleton branch keeps the marker', () => {
    getMock.mockImplementation(() => new Promise(() => undefined));
    const { container } = renderPage(<AdminFacultiesPage />);
    // h1 + the current-page breadcrumb share the label — the heading is
    // the page's one semantic h1.
    expect(screen.getByRole('heading', { name: 'الكلّيّات والأقسام' })).toBeInTheDocument();
    const root = container.querySelector('.r305ao');
    expect(root).not.toBeNull();
    expect(root).toHaveClass('page');
  });

  it('AdminReportsPage (resolved): the reports + papers register root carries the marker', async () => {
    installApi();
    const { container } = renderPage(<AdminReportsPage />);
    await screen.findByText('سجلّ البحوث');
    markedRoot(container);
  });

  it('AdminReportsPage (pending): the skeleton branch keeps the marker', () => {
    getMock.mockImplementation(() => new Promise(() => undefined));
    const { container } = renderPage(<AdminReportsPage />);
    // h1 + the current-page breadcrumb share the label — the heading is
    // the page's one semantic h1.
    expect(screen.getByRole('heading', { name: 'التقارير المؤسسية' })).toBeInTheDocument();
    const root = container.querySelector('.r305ao');
    expect(root).not.toBeNull();
    expect(root).toHaveClass('page');
  });

  it('AdminCoursesPage (resolved): the roster root carries the marker', async () => {
    installApi();
    const { container } = renderPage(<AdminCoursesPage />);
    await screen.findByText('CS101');
    markedRoot(container);
  });
});

/* ── 3. The destructive verb stands apart (logic untouched) ────── */

describe('R305-A8 — the courses delete action rides the Heron danger class', () => {
  it('the row delete button carries .r305ao-btn-danger and the ConfirmDialog flow behind it is intact', async () => {
    installApi();
    renderPage(<AdminCoursesPage />);
    await screen.findByText('CS101');

    const del = screen.getByRole('button', { name: 'حذف مقدمة في الحاسوب' });
    // The Heron standalone danger fill (scoped sheet §9)…
    expect(del).toHaveClass('r305ao-btn-danger');
    // …on the SAME ghost danger variant the r168a pin owns…
    expect(del).toHaveClass('btn');
    expect(del).toHaveClass('ghost');
    expect(del).toHaveClass('danger');

    // …and the accessible destructive flow is untouched: the click
    // opens the ConfirmDialog (focus-trapped, named by its heading) —
    // never an immediate delete.
    fireEvent.click(del);
    expect(await screen.findByRole('heading', { name: 'حذف المقرّر' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حذف نهائي' })).toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

/* ── 4. The resolved pages still speak to the real data flow ───── */

describe('R305-A8 — the Heron pass changed no data flow', () => {
  it('the dashboard action strip still builds from real counts and drills by URL', async () => {
    installApi();
    renderPage(<AdminDashboardPage />);
    // f1 carries a zero-content course (totalLectures 0 + totalMaterials 0)
    // → the strip renders the row with its deep link.
    const row = await screen.findByText('مقرّرات بلا محتوى تعليميّ');
    expect(row.closest('a')!.getAttribute('href')).toBe('/admin/courses');
  });

  it('the papers register still paginates through TablePaginationFooter', async () => {
    installApi();
    renderPage(<AdminReportsPage />);
    await screen.findByText('سجلّ البحوث');
    // total=5 (few form) over a 2-page mock → the footer reads the
    // counted papers noun.
    expect(screen.getByText(/الصفحة 1 من 2 · 5 أوراق/)).toBeInTheDocument();
  });
});
