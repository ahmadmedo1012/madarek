/**
 * r164-e — the student-side assessment-loop timeline (ResultsPage).
 *
 * The loop author→attempt→submit→grade→feedback→result must be
 * traceable from the student's side: submitted (timestamp) → awaiting
 * grading → graded (score + teacher feedback inline) → link back to
 * the submission context. These pins hold the contract:
 *   1. submissionStatusAr — one label/tone/hint mapping for every
 *      submission status the wire can carry (RETURNED has no writer
 *      today; its honest label renders on day one of any future
 *      return transition).
 *   2. The awaiting-grading card: submitted work had NO student surface
 *      before r164-e (it silently dropped out of the agenda and never
 *      reached the graded feed). Now it renders with its own timestamp,
 *      the status chip, the what-happens-next hint and a link back to
 *      the course context.
 *   3. The graded feed: score AND ceiling (the pct alone hid the
 *      rubric), the teacher's feedback inline, both timeline
 *      timestamps, and the link back to the course.
 *   4. Honest empty state when nothing awaits grading.
 *   5. A pre-r164-e payload (no pendingSubmissions / no feedback
 *      fields) degrades to the legacy rendering without crashing.
 *
 * useStudentResults is mocked at the useResources boundary (the
 * MorePages-downloads pattern); react-chartjs-2 is stubbed because
 * jsdom has no canvas (the QualityDashboard pattern).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultsPage } from '../../src/pages/student/MorePages';
import {
  submissionStatusAr,
  type StudentResults,
  type SubmissionStatusFE,
} from '../../src/hooks/useResources';

// jsdom has no canvas — stub the chart component the way page tests do.
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Radar: () => <div data-testid="chart-radar" />,
}));

const mocks = vi.hoisted(() => ({
  results: {
    data: null as StudentResults | null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useStudentResults: () => mocks.results,
  };
});

const HOUR_AGO = new Date(Date.now() - 3_600_000).toISOString();
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 86_400_000).toISOString();
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();

function resultsFixture(over: Partial<StudentResults> = {}): StudentResults {
  return {
    headline: {
      avgGradePct: 80,
      highest: { courseName: 'قواعد البيانات', gradePct: 80 },
      lowest: { courseName: 'قواعد البيانات', gradePct: 80 },
      courseCount: 1,
    },
    courses: [{
      offeringId: 'off-1',
      term: '2026-SPRING',
      courseCode: 'CS201',
      courseName: 'قواعد البيانات',
      themeColor: null,
      gradePct: 80,
      breakdown: [],
    }],
    recentAssignments: [{
      id: 'sub-graded-1',
      title: 'واجب تحليل الخوارزميات',
      type: 'HOMEWORK',
      offeringId: 'off-1',
      gradePct: 80,
      gradedAt: YESTERDAY,
      grade: 8,
      maxScore: 10,
      feedback: 'راجع الحالة الحدّية الثالثة.',
      submittedAt: TWO_DAYS_AGO,
    }],
    pendingSubmissions: [{
      id: 'sub-await-1',
      title: 'مشروع قاعدة البيانات',
      type: 'PROJECT',
      offeringId: 'off-1',
      courseCode: 'CS201',
      courseName: 'قواعد البيانات',
      status: 'SUBMITTED',
      late: false,
      submittedAt: HOUR_AGO,
    }],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ResultsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── 1. submissionStatusAr — the one label contract ─────────── */
describe('submissionStatusAr (r164-e label contract)', () => {
  it('maps every wire status to a label + tone + what-happens-next hint', () => {
    const cases: Array<[SubmissionStatusFE, string, 'green' | 'amber' | 'red' | 'brand']> = [
      ['SUBMITTED', 'بانتظار التقييم', 'amber'],
      ['LATE', 'متأخر — بانتظار التقييم', 'amber'],
      ['GRADED', 'مُقيَّم', 'green'],
      ['RETURNED', 'أعاده الأستاذ', 'red'],
      ['DRAFT', 'مسوّدة', 'brand'],
    ];
    for (const [status, label, color] of cases) {
      const st = submissionStatusAr(status);
      expect(st.label).toBe(label);
      expect(st.color).toBe(color);
      // The hint is the timeline's next-step affordance — never empty.
      expect(st.hint.trim().length).toBeGreaterThan(5);
    }
  });

  it('the awaiting hints promise the notification, not a fabricated grade', () => {
    expect(submissionStatusAr('SUBMITTED').hint).toContain('إشعار');
    expect(submissionStatusAr('LATE').hint).toContain('إشعار');
  });
});

/* ── 2/3. the awaiting-grading card ─────────────────────────── */
describe('ResultsPage — تسليمات بانتظار التقييم (the timeline middle step)', () => {
  beforeEach(() => {
    mocks.results.data = resultsFixture();
  });

  it('renders the submitted row: chip + hint + timestamp + course context + link back', () => {
    renderPage();

    expect(screen.getByText('تسليمات بانتظار التقييم')).toBeTruthy();
    expect(screen.getByText('تسليم واحد بانتظار التقييم')).toBeTruthy();
    expect(screen.getByText('مشروع قاعدة البيانات')).toBeTruthy();
    // The status chip (SUBMITTED) — the loop's current state.
    expect(screen.getByText('بانتظار التقييم')).toBeTruthy();
    // The what-happens-next hint rides the row.
    expect(screen.getByText(/وصلت إجابتك إلى قائمة تصحيح أستاذ المقرّر/)).toBeTruthy();
    // The submission timestamp (timeline step 1) with the full datetime
    // on the title attribute.
    expect(screen.getByTitle(new Date(HOUR_AGO).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }))).toBeTruthy();
    // The course context the submission belongs to (also appears in
    // the KPI strip + chart table — at least the pending row's line).
    expect(screen.getAllByText(/قواعد البيانات/).length).toBeGreaterThanOrEqual(1);
    // The link back to the submission context — the pending row and
    // the graded row each carry one; both must point at the course.
    const links = screen.getAllByRole('link', { name: 'المقرّر' });
    expect(links.length).toBe(2);
    expect(links.every((l) => l.getAttribute('href') === '/student/courses/off-1')).toBe(true);
  });

  it('a LATE submission carries its own chip, never a title suffix (the 16-B1 contract)', () => {
    mocks.results.data = resultsFixture({
      pendingSubmissions: [{
        id: 'sub-await-2',
        title: 'مشروع قاعدة البيانات',
        type: 'PROJECT',
        offeringId: 'off-1',
        courseCode: 'CS201',
        courseName: 'قواعد البيانات',
        status: 'LATE',
        late: true,
        submittedAt: HOUR_AGO,
      }],
    });
    renderPage();

    expect(screen.getByText('متأخر — بانتظار التقييم')).toBeTruthy();
    // The title stays untampered — no «(متأخر)» string-matching hacks.
    expect(screen.getByText('مشروع قاعدة البيانات')).toBeTruthy();
  });

  it('honest empty state when nothing awaits grading', () => {
    mocks.results.data = resultsFixture({ pendingSubmissions: [] });
    renderPage();

    expect(screen.getByText('لا شيء بانتظار تقييم الأستاذ حالياً')).toBeTruthy();
    expect(screen.getByText(/سيصلك إشعار لحظة رصد أي درجة جديدة/)).toBeTruthy();
  });
});

/* ── 4. the graded feed — the timeline's final step ─────────── */
describe('ResultsPage — آخر الواجبات المقيَّمة (score + feedback + context link)', () => {
  beforeEach(() => {
    mocks.results.data = resultsFixture();
  });

  it('renders the full graded verdict: score AND ceiling, feedback inline, both timestamps, link back', () => {
    renderPage();

    // Score + ceiling (the pct alone hid the rubric) — the pct also
    // rides the KPI strip + the chart's sr-only table, so both are
    // matched as sets.
    expect(screen.getByText('8 / 10')).toBeTruthy();
    expect(screen.getAllByText('80%').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/واجب تحليل الخوارزميات/)).toBeTruthy();
    // …the teacher's feedback, inline…
    expect(screen.getByText(/ملاحظة الأستاذ: راجع الحالة الحدّية الثالثة\./)).toBeTruthy();
    // …the timeline's two steps (submitted → graded) — both the
    // pending row and the graded row carry a «سلّمته» line.
    expect(screen.getAllByText(/سلّمته/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/قُيِّم/)).toBeTruthy();
    // …and the way back to the submission context.
    const links = screen.getAllByRole('link', { name: 'المقرّر' });
    expect(links.some((l) => l.getAttribute('href') === '/student/courses/off-1')).toBe(true);
  });

  it('a graded row without feedback degrades to the grading time alone — no empty feedback slot', () => {
    mocks.results.data = resultsFixture({
      recentAssignments: [{
        id: 'sub-graded-2',
        title: 'واجب بدون ملاحظات',
        type: 'QUIZ',
        offeringId: 'off-1',
        gradePct: 100,
        gradedAt: YESTERDAY,
        grade: 5,
        maxScore: 5,
        feedback: null,
        submittedAt: TWO_DAYS_AGO,
      }],
    });
    renderPage();

    expect(screen.getByText(/واجب بدون ملاحظات/)).toBeTruthy();
    expect(screen.queryByText(/ملاحظة الأستاذ/)).toBeNull();
    expect(screen.getByText(/قُيِّم/)).toBeTruthy();
  });
});

/* ── 5. pre-r164-e payload — additive fields absent ─────────── */
describe('ResultsPage — legacy payload degradation', () => {
  it('no pendingSubmissions / feedback / score fields → legacy rendering, no crash', () => {
    mocks.results.data = {
      headline: resultsFixture().headline,
      courses: resultsFixture().courses,
      recentAssignments: [{
        id: 'sub-legacy-1',
        title: 'واجب قديم',
        type: 'HOMEWORK',
        offeringId: 'off-1',
        gradePct: 70,
        gradedAt: YESTERDAY,
      }],
    };
    renderPage();

    // The awaiting card degrades to the honest empty copy…
    expect(screen.getByText('لا شيء بانتظار تقييم الأستاذ حالياً')).toBeTruthy();
    // …and the graded row falls back to the pct-only title.
    expect(screen.getByText('واجب قديم — 70%')).toBeTruthy();
    expect(screen.queryByText(/ملاحظة الأستاذ/)).toBeNull();
  });
});
