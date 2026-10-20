/**
 * r173a — the courses header weight (the r171 VLM deferred note).
 *
 * The VLM read /student/courses's opening as heavier than the page's
 * content rhythm: under an h1+subtitle header sat a four-MetricCard
 * KPI strip (four icon wells + 28px values) before the light glass
 * thumb-card grid. The stats now ride ONE light text-muted line —
 * the same counts object, zero data-logic change.
 *
 * Layers pinned here:
 *   1. SETTLED — the header keeps exactly h1 + one subtitle line; NO
 *      metric tiles render; the single summary line carries the same
 *      counted totals (zero buckets stay off the line — the filter
 *      pills below already own the per-bucket counts); the pills keep
 *      their counts (data logic untouched).
 *   2. PENDING — the mirror is the summary line's own box (a 20px
 *      skeleton in the same .courses-summary slot) + the course grid
 *      skeleton: one loading owner, and the KpiSkeleton died with the
 *      strip it mirrored.
 *   3. 0% AFFORDANCE INTEGRATION — a zero-progress course card shows
 *      the ProgressBar 0% starting-edge marker (the primitive's own
 *      contract is pinned in Tabs-ProgressBar.test.tsx).
 *   4. CSS — student.css's .courses-summary recipe is source-pinned
 *      (the MetricCard-tone readStyle pattern).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

import StudentCoursesPage from '../../src/pages/student/CoursesPage';

const STYLES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const studentCss = readFileSync(path.join(STYLES_DIR, 'student.css'), 'utf-8');

const mocks = vi.hoisted(() => ({
  enrollments: [] as unknown[],
  enrollmentsPending: false,
  dashboard: { agenda: { assignments: [] } },
  lectures: [] as unknown[],
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyEnrollments: () => ({
    data: mocks.enrollmentsPending ? undefined : mocks.enrollments,
    isPending: mocks.enrollmentsPending,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useStudentDashboard: () => ({
    data: mocks.dashboard,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfferingLectures: () => ({
    data: mocks.lectures,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

/** The GET /enrollments/me row shape (MyEnrollment). */
const enrollment = (id: string, progressPct: number) => ({
  id,
  progressPct,
  offering: {
    id: `off-${id}`,
    course: {
      id: `c-${id}`,
      code: `CS-${id}`,
      name: `مقرّر ${id}`,
      iconEmoji: null,
      themeColor: null,
      credits: 3,
    },
    teacher: { id: 't1', firstName: 'سالم', lastName: 'الطاهر' },
    schedule: [],
  },
});

beforeEach(() => {
  mocks.enrollments = [
    enrollment('a', 100), // مكتملة
    enrollment('b', 62),  // قيد التقدّم
    enrollment('c', 15),  // قيد التقدّم + بحاجة إلى اهتمام
  ];
  mocks.enrollmentsPending = false;
  mocks.dashboard = { agenda: { assignments: [] } };
  mocks.lectures = [];
});

function renderPage() {
  return render(<MemoryRouter><StudentCoursesPage /></MemoryRouter>);
}

/* ── 1 · Settled: the light header rhythm ───────────────────────── */

describe('StudentCoursesPage — the light single-line summary (r173a)', () => {
  it('renders NO metric tiles — the four-MetricCard KPI strip is gone', () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('.metric')).toHaveLength(0);
    expect(container.querySelectorAll('.grid-4')).toHaveLength(0);
  });

  it('the header keeps exactly h1 + one subtitle line (r221 re-pin: the patterns PageHeader)', () => {
    renderPage();
    const header = document.querySelector('header.pf-page-header') as HTMLElement;
    expect(header).not.toBeNull();
    expect(within(header).getByRole('heading', { level: 1, name: 'مقرّراتي الدراسية' }));
    expect(header.textContent).toContain('جميع المقرّرات التي سجّلت فيها هذا الفصل');
    // The header block carries nothing else — no stats, no chips.
    expect(header.querySelectorAll('p, .badge, .pill, .metric')).toHaveLength(1);
  });

  it('the SAME counts ride one light line: counted total + non-zero buckets only', () => {
    const { container } = renderPage();
    // 3 enrollments → counted plural; done 1, active 2, attention 1;
    // every bucket is non-zero here so all three ride the line.
    // (textContent: the counted noun + digits live in bdi children,
    // which getNodeText-based queries can't see across.)
    const summary = container.querySelector('.courses-summary') as HTMLElement;
    expect(summary.textContent).toBe(
      '3 مقرّرات مسجَّلة · مكتملة 1 · قيد التقدّم 2 · بحاجة إلى اهتمام 1',
    );
  });

  it('a zero bucket stays OFF the line (the filter pills below already own it)', () => {
    mocks.enrollments = [enrollment('a', 100), enrollment('b', 62)];
    const { container } = renderPage();
    // attention = 0 → the phrase must not render; done/active ride.
    const summary = container.querySelector('.courses-summary') as HTMLElement;
    expect(summary.textContent).toBe('مقرّران مسجّلان · مكتملة 1 · قيد التقدّم 1');
  });

  it('the filter pills keep their per-bucket counts — data logic untouched', () => {
    renderPage();
    const pills = screen.getByRole('group', { name: 'تصفية المقرّرات حسب الحالة' });
    expect(within(pills).getByText('الكل')).toBeInTheDocument();
    // The pills' own counts, in FILTERS order (all/active/done/attention):
    // 3 / 2 / 1 / 1 — the same counts object the old KPI strip read.
    const pillCounts = Array.from(pills.querySelectorAll('.courses-filter-count')).map(
      (el) => el.textContent,
    );
    expect(pillCounts).toEqual(['3', '2', '1', '1']);
  });
});

/* ── 2 · Pending: the summary-line mirror ───────────────────────── */

describe('StudentCoursesPage — pending mirror (r173a)', () => {
  it('the line\'s own box + the grid skeleton; zero metric tiles, zero spinners', () => {
    mocks.enrollmentsPending = true;
    const { container } = renderPage();

    const summary = container.querySelector('.courses-summary');
    expect(summary).not.toBeNull();
    expect((summary as HTMLElement).getAttribute('aria-busy')).toBe('true');
    expect((summary as HTMLElement).querySelector('.skeleton')).not.toBeNull();

    // The row-list skeleton owns the list area (r221: the row list
    // replaced the card grid — its skeleton mirrors the pf-row shape).
    expect(container.querySelector('.pf-row[aria-hidden="true"]')).not.toBeNull();
    // The one-loading-owner rule.
    expect(container.querySelectorAll('.metric')).toHaveLength(0);
    expect(container.querySelectorAll('.spinner')).toHaveLength(0);
  });
});

/* ── 3 · The 0% affordance on a real course card ────────────────── */

describe('StudentCoursesPage — a 0% course shows the progress affordance (r173a)', () => {
  it('the zero card\'s track carries the starting-edge marker; the 62% card\'s does not', () => {
    mocks.enrollments = [enrollment('zero', 0), enrollment('b', 62)];
    const { container } = renderPage();

    const marks = container.querySelectorAll('.progress-zero-mark');
    expect(marks).toHaveLength(1);
    // The marker sits inside a progressbar at the honest zero.
    const track = marks[0]!.closest('.progress-track') as HTMLElement;
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuenow')).toBe('0');
    // The 62% card renders no marker — the fill owns the track.
    const fills = container.querySelectorAll('.progress-fill');
    expect(fills).toHaveLength(2);
  });
});

/* ── 4 · CSS source pin ─────────────────────────────────────────── */

describe('student.css — the .courses-summary recipe (r173a)', () => {
  it('consumes the AA muted ink for the line (no new colors)', () => {
    expect(studentCss).toMatch(/\.courses-summary\s*\{[^}]*color:\s*var\(--text-muted\)/s);
    expect(studentCss).toMatch(/\.courses-summary bdi\s*\{[^}]*font-family:\s*var\(--font-mono\)/s);
  });
});
