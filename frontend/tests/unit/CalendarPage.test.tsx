/**
 * r164-c — /student/calendar page behavior (jsdom, hooks mocked).
 *
 * The one-calendar view composes three EXISTING endpoints client-side
 * (enrollments schedule · dashboard agenda · online-exams list) — this
 * suite pins the page contract with mocked query results:
 *  · loading skeleton / error retry (the shared States grammar);
 *  · the 42-cell month grid: today highlight, dots, Arabic month title;
 *  · the selected-day event list — every row links to its SOURCE page
 *    (course / exam taker / broadcast), exam rows carry the phase chip;
 *  · month navigation (السابق / التالي) re-renders the grid + title;
 *  · the empty month (fresh student — no schedule, no deadlines);
 *  · day selection: clicking a cell swaps the detail list.
 *
 * Clock: the runner pins TZ=UTC (the platform's server model); the
 * fixtures are anchored on TODAY'S Tripoli civil day via lib/calendar
 * helpers, so the suite is deterministic at any hour of any day.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentCalendarPage from '../../src/pages/student/CalendarPage';
import {
  tripoliToday,
  civilKeyOf,
  monthTitleAr,
} from '../../src/lib/calendar';
import { WEEKDAY_NAMES_AR } from '../../src/lib/format';

// ── The mocked query results (reshaped per test in beforeEach) ──────
const mocks = vi.hoisted(() => ({
  enrollments: [] as Array<Record<string, unknown>>,
  dashboard: null as Record<string, unknown> | null,
  exams: [] as Array<Record<string, unknown>>,
  enrollmentsPending: false,
  dashboardPending: false,
  examsPending: false,
  dashboardError: false,
  refetch: { enrollments: vi.fn(), dashboard: vi.fn(), exams: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyEnrollments: () => ({
    data: mocks.enrollments,
    isPending: mocks.enrollmentsPending,
    isError: false,
    error: null,
    refetch: mocks.refetch.enrollments,
  }),
  useStudentDashboard: () => ({
    data: mocks.dashboard,
    isPending: mocks.dashboardPending,
    isError: mocks.dashboardError,
    error: mocks.dashboardError ? new Error('boom') : null,
    refetch: mocks.refetch.dashboard,
  }),
  useMyExams: () => ({
    data: mocks.exams,
    isPending: mocks.examsPending,
    isError: false,
    error: null,
    refetch: mocks.refetch.exams,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentCalendarPage />
    </MemoryRouter>,
  );
}

// Fixtures anchored on the audience calendar: 10:00Z is always the same
// civil day in Tripoli (12:00 local), so events land exactly on today.
const today = () => tripoliToday();
const todayKey = () => civilKeyOf(today());
const tomorrow = () => {
  const t = new Date(Date.parse(`${todayKey()}T12:00:00Z`) + 86400000);
  return tripoliToday(t);
};
const tomorrowKey = () => civilKeyOf(tomorrow());

function fullDataFixtures() {
  const dowToday = new Date(Date.parse(`${todayKey()}T12:00:00Z`)).getUTCDay();
  mocks.enrollments = [
    {
      id: 'enr1',
      progressPct: 40,
      offering: {
        id: 'off1',
        room: 'قاعة 3',
        course: { id: 'cs1', code: 'CS301', name: 'شبكات الحاسوب' },
        teacher: { id: 't1', firstName: 'أحمد', lastName: 'المهدي' },
        schedule: [{ id: 's1', dayOfWeek: dowToday, startTime: '09:00', endTime: '10:30', room: 'قاعة 3' }],
      },
    },
  ];
  mocks.dashboard = {
    agenda: {
      classes: [],
      assignments: [
        {
          id: 'asg1',
          offeringId: 'off1',
          title: 'تقرير الفصل الأول',
          type: 'HOMEWORK',
          dueAt: `${todayKey()}T10:00:00.000Z`,
          courseName: 'شبكات الحاسوب',
          courseCode: 'CS301',
        },
      ],
      live: [
        {
          id: 'live1',
          title: 'مراجعة الاختبار',
          scheduledAt: `${todayKey()}T14:00:00.000Z`,
          status: 'SCHEDULED',
          offering: { course: { name: 'شبكات الحاسوب', code: 'CS301' } },
        },
      ],
      exams: [],
    },
  };
  mocks.exams = [
    {
      id: 'ex1',
      title: 'قواعد البيانات',
      kind: 'FINAL',
      durationMin: 90,
      questionCount: 20,
      passingScore: 50,
      openAt: `${todayKey()}T06:00:00.000Z`,   // 08:00 Tripoli
      closeAt: `${tomorrowKey()}T18:00:00.000Z`, // 20:00 Tripoli
      courseName: 'قواعد البيانات',
      courseIcon: null,
      facultyName: null,
      myAttempt: null,
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enrollments = [];
  mocks.dashboard = { agenda: { classes: [], assignments: [], live: [], exams: [] } };
  mocks.exams = [];
  mocks.enrollmentsPending = false;
  mocks.dashboardPending = false;
  mocks.examsPending = false;
  mocks.dashboardError = false;
});

describe('StudentCalendarPage — loading / error shells', () => {
  it('renders the page skeleton while the three sources load', () => {
    mocks.enrollmentsPending = true;
    mocks.dashboardPending = true;
    mocks.examsPending = true;
    const { container } = renderPage();
    expect(container.querySelector('.page[aria-busy="true"]')).toBeTruthy();
    expect(screen.getByText('جارٍ جمع مواعيدك…')).toBeTruthy();
    // No grid while loading.
    expect(container.querySelector('.cal-grid')).toBeNull();
  });

  it('renders the Arabic error state with a retry when a source fails', () => {
    mocks.dashboardError = true;
    renderPage();
    expect(screen.getByText('تعذَّر تحميل التقويم الأكاديمي')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(mocks.refetch.enrollments).toHaveBeenCalled();
    expect(mocks.refetch.dashboard).toHaveBeenCalled();
    expect(mocks.refetch.exams).toHaveBeenCalled();
  });
});

describe('StudentCalendarPage — the month grid with real-ish data', () => {
  beforeEach(fullDataFixtures);

  it('renders the Arabic month title, the legend, and 42 cells with today highlighted', () => {
    const { container } = renderPage();
    const t = today();
    expect(screen.getByText(monthTitleAr(t.year, t.month))).toBeTruthy();
    // Legend — one entry per event kind.
    for (const label of ['حصص ومحاضرات', 'واجبات', 'اختبارات', 'بث مباشر']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    const cells = container.querySelectorAll('.cal-cell');
    expect(cells.length).toBe(42);
    // Today: filled numeral treatment + «اليوم» in its accessible name.
    const todayCell = container.querySelector('.cal-cell[data-today="true"]');
    expect(todayCell).toBeTruthy();
    expect(todayCell!.getAttribute('aria-label')).toContain('اليوم');
    // 4 kinds land on today (class + assignment + exam-open + live).
    expect(todayCell!.querySelectorAll('.cal-dot').length).toBe(4);
  });

  it('the selected day\'s events render as links to their SOURCE pages', () => {
    const { container } = renderPage();
    const detail = container.querySelector('.cal-detail')! as HTMLElement;
    // Sorted by Tripoli wall-clock: exam-open 08:00 · class 09:00 ·
    // assignment 12:00 · live 16:00.
    const rows = detail.querySelectorAll('.cal-event-row');
    expect(rows.length).toBe(4);
    const hrefs = Array.from(rows).map((r) => (r as HTMLAnchorElement).getAttribute('href'));
    expect(hrefs).toEqual([
      '/student/online-exams/ex1',
      '/student/courses/off1',
      '/student/courses/off1',
      '/student/live',
    ]);
    // Row copy: the exam kind label + title, the phase chip, the
    // assignment kind label, the broadcast prefix.
    expect(within(detail).getByText('نهائي: قواعد البيانات')).toBeTruthy();
    expect(within(detail).getByText('يفتح')).toBeTruthy();
    expect(within(detail).getByText('واجب: تقرير الفصل الأول')).toBeTruthy();
    expect(within(detail).getByText('بث مباشر: مراجعة الاختبار')).toBeTruthy();
  });

  it('clicking another day swaps the detail list (the exam deadline row)', () => {
    const { container } = renderPage();
    const tm = tomorrow();
    // The tomorrow cell's accessible name is `${weekday} ${day}`.
    const name = new RegExp(`^${WEEKDAY_NAMES_AR[new Date(Date.parse(`${tomorrowKey()}T12:00:00Z`)).getUTCDay()]} ${tm.day}( |$)`);
    const tomorrowCell = screen.getAllByRole('button', { name }).find(
      (b) => b.getAttribute('aria-label')?.includes('حدث'),
    )!;
    fireEvent.click(tomorrowCell);
    const detail = container.querySelector('.cal-detail')! as HTMLElement;
    const rows = detail.querySelectorAll('.cal-event-row');
    expect(rows.length).toBe(1);
    expect((rows[0] as HTMLAnchorElement).getAttribute('href')).toBe('/student/online-exams/ex1');
    expect(within(detail).getByText('آخر تسليم')).toBeTruthy();
    // The clicked cell is the selected one.
    expect(tomorrowCell.getAttribute('data-selected')).toBe('true');
  });

  it('month navigation moves the title and the grid', () => {
    renderPage();
    const t = today();
    const next = new Date(Date.UTC(t.year, t.month + 1, 1));
    fireEvent.click(screen.getByRole('button', { name: 'الشهر التالي' }));
    expect(screen.getByText(monthTitleAr(next.getUTCFullYear(), next.getUTCMonth()))).toBeTruthy();
    // Back again — the original month title returns.
    fireEvent.click(screen.getByRole('button', { name: 'الشهر السابق' }));
    expect(screen.getByText(monthTitleAr(t.year, t.month))).toBeTruthy();
  });
});

describe('StudentCalendarPage — the empty month (fresh student)', () => {
  it('renders the honest «شهر هادئ» empty state — no schedule, no deadlines', () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('.cal-cell').length).toBe(42); // grid still renders
    expect(screen.getByText('شهر هادئ')).toBeTruthy();
    expect(screen.getByText(/لا مواعيد في/)).toBeTruthy();
    // No event rows, no dots (the legend's dots are the key, not events).
    expect(container.querySelector('.cal-event-row')).toBeNull();
    expect(container.querySelector('.cal-cell .cal-dot')).toBeNull();
  });
});
