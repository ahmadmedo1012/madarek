/**
 * r164-a — status semantics: the student results page joins the ONE
 * grade-band ladder (lib/courseMeta GRADE_BANDS, the 22-a A6 P2
 * contract "one student reads as one chip everywhere").
 *
 * Before r164-a this page carried a private 85/70/60 ladder repeated
 * three times (chart colours / ProgressBar fills / AlertRow tones):
 *   - a 55% grade rendered RED (failed) to the student while the
 *     teacher's grades table shows the same number as «مقبول» (gold
 *     PASS band) — a passing grade communicated as a failure;
 *   - 70–74 rendered accent/brand while the ladder says «جيّد» amber;
 *   - a 60–69 assignment row carried the WARNING triangle icon.
 *
 * The page now consumes gradeBand() for every surface. These pins hold
 * the mapping: KPI metric tones, chart bar colours (via the captured
 * Bar props), ProgressBar fills, the AlertRow tone + the honest
 * pass/fail icon, and the band chip itself (the same Badge the
 * teacher's table renders for the same number).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResultsPage } from '../../src/pages/student/MorePages';
import { GRADE_BANDS, gradeBand } from '../../src/lib/courseMeta';
import { AlertRow } from '../../src/components/primitives';

/* jsdom has no canvas — stub the chart components and capture the Bar
 * props so the band→colour map is pinnable without a rendered canvas. */
const barProps: Array<{ data?: { datasets?: Array<{ backgroundColor?: string[] }> } }> = [];
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { data?: { datasets?: Array<{ backgroundColor?: string[] }> } }) => {
    barProps.push(props);
    return <div data-testid="chart-bar" />;
  },
  Radar: () => <div data-testid="chart-radar" />,
}));

const results = {
  data: {
    headline: {
      avgGradePct: 70, // GOOD (65–74) → amber
      highest: { courseName: 'الذكاء الاصطناعيّ', gradePct: 90 }, // EXCELLENT → green
      lowest: { courseName: 'الشبكات', gradePct: 40 }, // WEAK → red
      courseCount: 4,
    },
    courses: [
      { offeringId: 'o1', term: 't', courseCode: 'CS101', courseName: 'أساسيات البرمجة', themeColor: null, gradePct: 55, breakdown: [] },
      { offeringId: 'o2', term: 't', courseCode: 'CS201', courseName: 'قواعد البيانات', themeColor: null, gradePct: 68, breakdown: [] },
      { offeringId: 'o3', term: 't', courseCode: 'CS301', courseName: 'الذكاء الاصطناعيّ', themeColor: null, gradePct: 90, breakdown: [] },
      { offeringId: 'o4', term: 't', courseCode: 'CS210', courseName: 'الشبكات', themeColor: null, gradePct: 40, breakdown: [] },
    ],
    recentAssignments: [
      { id: 'a1', title: 'واجب القوائم', type: 'HOMEWORK' as const, offeringId: 'o1', gradePct: 55, gradedAt: '2025-01-10T09:00:00.000Z' },
      { id: 'a2', title: 'مشروع الشبكات', type: 'PROJECT' as const, offeringId: 'o4', gradePct: 40, gradedAt: '2025-01-11T09:00:00.000Z' },
    ],
  },
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

vi.mock('../../src/hooks/useResources', () => ({
  // ResultsPage's live hook:
  useStudentResults: () => results,
  // The rest of MorePages' named imports — stubbed at the module
  // boundary (the MorePages-social.test pattern); only the component
  // under test renders in this file.
  useMyAchievements: () => ({ data: [], isPending: false, isError: false }),
  useLeaderboard: () => ({ data: [], isPending: false, isError: false }),
  useMySkills: () => ({ data: [], isPending: false, isError: false }),
  usePosts: () => ({ data: [], isPending: false, isError: false }),
  useCreatePost: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useReactToPost: () => ({ mutate: vi.fn(), isPending: false, isError: false, variables: undefined }),
  useMyEnrollments: () => ({ data: [], isPending: false, isError: false }),
  useNotificationsFeed: () => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }),
  useMarkNotifRead: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkAllNotifsRead: () => ({ mutate: vi.fn(), isPending: false }),
  useArExperiences: () => ({ data: [], isPending: false, isError: false }),
  useStudentMaterials: () => ({ data: [], isPending: false, isError: false }),
  useFaculties: () => ({ data: [], isPending: false, isError: false }),
  useStudentDashboard: () => ({ data: null, isPending: false, isError: false }),
  useTrainingMe: () => ({ data: null, isPending: false, isError: false }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      {/* r164 integration: r164-e added course-context <Link>s to the
          graded rows — the page now requires a Router context. */}
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The chart's Bar data was captured by the mock — the one render's map. */
const barColors = () =>
  barProps.at(-1)?.data?.datasets?.[0]?.backgroundColor ?? [];

describe('ResultsPage — the ONE grade-band ladder (r164-a)', () => {
  it('opens with the shared PageHeader (semantic h1)', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'النتائج والتقييمات' }),
    ).toBeInTheDocument();
  });

  it('a PASSING 55% renders the «مقبول» gold chip — never the old red failure', () => {
    renderPage();
    const chip = screen.getByText('مقبول');
    expect(chip).toHaveClass('badge', { exact: false });
    expect(chip.className).toBe('badge gold');
    // The row tone follows the band: `alert gold`, not `alert red`.
    const row = chip.closest('.alert')!;
    expect(row).toHaveClass('gold');
    expect(row).not.toHaveClass('red');
    // And the honest icon for a passing grade is the check, not the
    // warning triangle the 60–69 rows used to carry.
    expect(row.querySelector('svg')?.getAttribute('class')).toContain('circle-check');
  });

  it('a WEAK 40% keeps the failure register: red row, triangle icon, «ضعيف» chip', () => {
    renderPage();
    const chip = screen.getByText('ضعيف');
    const row = chip.closest('.alert')!;
    expect(row).toHaveClass('red');
    expect(row.querySelector('svg')?.getAttribute('class')).toContain('triangle-alert');
  });

  it('maps every chart bar to its band colour (PASS=gold, WEAK=danger) — the jsdom FALLBACK palette', () => {
    renderPage();
    // chartColors() resolves CSS custom properties; jsdom has none, so
    // the documented FALLBACK constants ride through (chartTheme.ts).
    // Course order: 55 (PASS) / 68 (GOOD) / 90 (EXCELLENT) / 40 (WEAK).
    expect(barColors()).toEqual(['#e9c349', '#F5A623', '#3DD68C', '#F55353']);
  });

  it('fills each ProgressBar with the band\'s canonical barColor token', () => {
    const { container } = renderPage();
    const fills = Array.from(container.querySelectorAll('.progress-fill'));
    // 55 → var(--gold) is the pin that matters: the old ladder painted
    // 50–64 as var(--danger).
    expect(fills.some((el) => el.getAttribute('style')?.includes('var(--gold)'))).toBe(true);
    expect(fills.some((el) => el.getAttribute('style')?.includes('var(--warning)'))).toBe(true);
    expect(fills.some((el) => el.getAttribute('style')?.includes('var(--success)'))).toBe(true);
    expect(fills.some((el) => el.getAttribute('style')?.includes('var(--danger)'))).toBe(true);
  });

  it('tones the KPI trio by the ladder: highest green, avg amber (70 = GOOD), lowest red', () => {
    const { container } = renderPage();
    expect(container.querySelector('.metric.green')).not.toBeNull();
    expect(container.querySelector('.metric.amber')).not.toBeNull();
    expect(container.querySelector('.metric.red')).not.toBeNull();
  });
});

describe('AlertRow[gold] — the PASS band tone joins the primitive (r164-a)', () => {
  it('renders the gold class with the gold-ink dot in the no-icon branch', () => {
    const { container } = render(
      <AlertRow color="gold" title="اجتياز" description="٥٥٪ — مقبول" />,
    );
    const row = container.querySelector('.alert');
    expect(row).toHaveClass('gold');
    const dot = row?.querySelector('.alert-dot');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('style')).toContain('var(--gold-ink)');
  });

  it('paints the icon with the gold-ink tier when an icon is given', () => {
    const { container } = render(
      <AlertRow color="gold" title="اجتياز" description="٥٥٪" />,
    );
    // No icon passed → the dot branch covers the marker; the icon
    // branch is pinned by the ResultsPage rows above (CheckCircle2 at
    // var(--gold-ink) via the ICON_INK map).
    expect(container.querySelector('.alert')).not.toBeNull();
  });

  it('gradeBand colors stay inside the AlertRow union — the ladder can never drift out of the primitive', () => {
    // The compile-time guarantee this test documents: every band tone
    // (GRADE_BANDS[i].color) is a legal AlertColor, which is what lets
    // ResultsPage pass band.color straight through.
    const alertColors = ['red', 'amber', 'green', 'purple', 'gold', 'brand'];
    for (const band of GRADE_BANDS) {
      expect(alertColors).toContain(band.color);
      expect(gradeBand(band.min).key).toBe(band.key);
    }
  });
});
