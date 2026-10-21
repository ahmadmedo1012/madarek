/**
 * R305-A5 agent 2-c — the Heron pass over the schedule/deadline family.
 *
 * Focused pins for what the r305-c redesign changed, so the visual
 * contract cannot silently drift (every behavioural contract the page
 * suites already pin — calendar data semantics, matrix links/aria,
 * r164-e verdict mapping, results grade band — stays untouched):
 *
 *  1. /student/calendar — today stays the ONE emphasized cell
 *     (data-today + the sheet's accent-wash rule), the weekend takes
 *     its quiet ink step (data-weekend, presentational only), and the
 *     legend opens with the Heron micro-label.
 *  2. /student/matrix — every cell's status rides the shared
 *     .r305s-chip register (tone on the DOT per level, status WORD in
 *     the body, tabular % beside it) while the r164d gap links and the
 *     cell aria contract stay exactly as pinned.
 *  3. /student/schedule — day sections carry .schedule-day (the
 *     hairline-carried ledger chrome) and the header meta counts the
 *     week's real slot load.
 *  4. /student/results — the summary strip is the page's ONE deep band
 *     (eyebrow + StatLine inside .results-summary.r305s-band--deep,
 *     pending mirror included), with the canonical band tones intact.
 *  5. /student/online-exams — the list's attempt/window states render
 *     as shared chips: verdict tones projected onto chip tones, window
 *     chips info/neutral, score rides the mono bdi inside the chip.
 *  6. Stylesheet source pins — the family sheet exists, is imported by
 *     exactly the four owned page files, sits in @layer pages, and
 *     carries the load-bearing rules (today wash, deep-band ink
 *     re-derivation, schedule ledger rules).
 *
 * Mock/setup patterns reuse the page suites: the hoisted-mocks +
 * importOriginal partial mock (ResultsPage-timeline), the exam fixture
 * shape (OnlineExamsPages), and the Tripoli-anchored calendar fixtures
 * (CalendarPage.test). react-chartjs-2 is stubbed (jsdom, no canvas).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import StudentCalendarPage from '../../src/pages/student/CalendarPage';
import MatrixPage from '../../src/pages/student/MatrixPage';
import { SchedulePage, ResultsPage } from '../../src/pages/student/MorePages';
import OnlineExamsPage from '../../src/pages/exams/OnlineExamsPages';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(resolve(here, '../..', p), 'utf8');

/* jsdom has no canvas — stub the chart component (QualityDashboard /
 * ResultsPage-timeline pattern). */
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Radar: () => <div data-testid="chart-radar" />,
}));

const mocks = vi.hoisted(() => ({
  matrix: [] as Array<Record<string, unknown>>,
  gaps: [] as Array<Record<string, unknown>>,
  enrollments: [] as Array<Record<string, unknown>>,
  dashboard: { agenda: { classes: [], assignments: [], live: [], exams: [] } } as Record<string, unknown> | null,
  // Typed by the ExamFixture interface below (same pattern as
  // OnlineExamsPages.test.tsx — interfaces carry no implicit index
  // signature, so Record<string, unknown> would reject the fixtures).
  exams: [] as ExamFixture[],
  results: { data: null as unknown, isPending: false, isError: false, error: null, refetch: vi.fn() },
  start: vi.fn(),
  finish: vi.fn(),
  answer: vi.fn(),
  review: { data: null as unknown, isPending: false, isError: false, error: null, refetch: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    // Matrix
    useMatrix: () => ({ data: mocks.matrix, isPending: false, isError: false, error: null, refetch: vi.fn() }),
    useGaps: () => ({ data: mocks.gaps, isPending: false, isError: false, error: null, refetch: vi.fn() }),
    // Calendar + schedule
    useMyEnrollments: () => ({ data: mocks.enrollments, isPending: false, isError: false, error: null, refetch: vi.fn() }),
    useStudentDashboard: () => ({ data: mocks.dashboard, isPending: false, isError: false, error: null, refetch: vi.fn() }),
    // Calendar + exam list (the same hook both pages read)
    useMyExams: () => ({ data: mocks.exams, isPending: false, isError: false, error: null, refetch: vi.fn() }),
    // Results
    useStudentResults: () => mocks.results,
    // Exam taker hooks (imported by the module; the list tests never fire them)
    useStartExam: () => ({ mutateAsync: mocks.start, isPending: false }),
    useSubmitAnswer: () => ({ mutateAsync: mocks.answer, isPending: false }),
    useFinishExam: () => ({ mutateAsync: mocks.finish, isPending: false }),
    useExamReview: () => ({ ...mocks.review }),
    useExamModerationQueue: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
    useModerateExam: () => ({ mutateAsync: vi.fn() }),
    useExamTemplate: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mocks.matrix = [];
  mocks.gaps = [];
  mocks.enrollments = [];
  mocks.dashboard = { agenda: { classes: [], assignments: [], live: [], exams: [] } };
  mocks.exams = [];
  mocks.results = { data: null, isPending: false, isError: false, error: null, refetch: vi.fn() };
});

/* ── 1 · /student/calendar — the quiet month instrument ──────────── */

describe('R305 calendar — today is the ONE emphasized cell, weekend goes quiet', () => {
  it("today's cell carries data-today; Friday/Saturday cells carry the weekend step", () => {
    const { container } = render(
      <MemoryRouter>
        <StudentCalendarPage />
      </MemoryRouter>,
    );

    // Exactly one today cell (the month grid's single emphasized cell).
    const todayCells = container.querySelectorAll('.cal-cell[data-today="true"]');
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0]!.getAttribute('aria-label')).toContain('اليوم');

    // The weekend ink step is presentational metadata: every Friday and
    // Saturday in the 42-cell grid carries it (dow 5/6 on the 0=Sunday
    // contract), in-month or not — the CSS scopes the visual to in-month.
    const weekendCells = container.querySelectorAll('.cal-cell[data-weekend="true"]');
    expect(weekendCells.length).toBeGreaterThanOrEqual(8); // ≥ 2 per week × 6 rows
  });

  it('the legend opens with the Heron micro-label and keeps the four kind chips', () => {
    render(
      <MemoryRouter>
        <StudentCalendarPage />
      </MemoryRouter>,
    );

    const legend = screen.getByLabelText('مفتاح الرموز');
    expect(legend.querySelector('.r305s-eyebrow')?.textContent).toBe('أنواع المواعيد');
    for (const label of ['حصص ومحاضرات', 'واجبات', 'اختبارات', 'بث مباشر']) {
      expect(legend.textContent).toContain(label);
    }
  });

  it('stylesheet: today rides the accent wash + copper edge (the ONE emphasized cell)', () => {
    const sheet = read('src/styles/r305-student-schedule.css');
    const rule = sheet.match(/\.cal-cell\[data-today='true'\]\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toContain('color-mix(in srgb, var(--accent) 7%, var(--surface))');
    expect(rule![0]).toContain('border-color: var(--accent)');
    // The weekend step is INK, never opacity (the r299 AA ruling), and
    // it carries the :not([data-today]) guard — when today itself lands
    // on a Friday/Saturday, the filled accent numeral must win (the
    // weekend rule out-specifies the today numeral rule, so without the
    // guard the muted ink would swallow the ONE emphasized cell).
    const weekend = sheet.match(
      /\.cal-cell\[data-in-month='true'\]\[data-weekend='true'\]:not\(\[data-today='true'\]\) \.cal-day-num\s*\{[^}]*\}/,
    );
    expect(weekend).not.toBeNull();
    expect(weekend![0]).toContain('color: var(--text-muted)');
    expect(weekend![0]).toContain('var(--fw-regular)');
    expect(weekend![0]).not.toContain('opacity');
  });
});

/* ── 2 · /student/matrix — chip statuses, same data semantics ────── */

const matrixConcept = (over: Record<string, unknown>) => ({
  id: 'k0', name: 'مفهوم', level: 0, attempts: 0, ...over,
});
const matrixCourse = (concepts: Array<Record<string, unknown>>) => ({
  courseId: 'c1', courseCode: 'CS301', courseName: 'شبكات الحاسوب',
  themeColor: null, offeringId: 'off1', concepts,
});

describe('R305 matrix — cell statuses ride the shared chip register', () => {
  it('each level renders its status chip with the matching tone dot class + the tabular %', () => {
    mocks.matrix = [matrixCourse([
      matrixConcept({ id: 'k-strong', name: 'مقابض الإرسال', level: 0.95, attempts: 5 }),
      matrixConcept({ id: 'k-good', name: 'نوافذ الانزلاق', level: 0.7, attempts: 3 }),
      matrixConcept({ id: 'k-weak', name: 'التحكم بالازدحام', level: 0.5, attempts: 4 }),
      matrixConcept({ id: 'k-poor', name: 'توجيه المسار', level: 0.2, attempts: 2 }),
      matrixConcept({ id: 'k-untouched', name: 'خوارزمية الجوار', level: 0, attempts: 0 }),
    ])];
    const { container } = render(
      <MemoryRouter>
        <MatrixPage />
      </MemoryRouter>,
    );

    const chipTone = (name: string) =>
      Array.from(container.querySelectorAll('.matrix-cell .r305s-chip'))
        .find((c) => c.textContent?.includes(name));

    expect(chipTone('إتقان')).toHaveClass('r305s-chip--success');
    expect(chipTone('جيد')).toHaveClass('r305s-chip--accent');
    expect(chipTone('يحتاج مراجعة')).toHaveClass('r305s-chip--warning');
    expect(chipTone('ضعف')).toHaveClass('r305s-chip--danger');
    // Untouched: the resting chip (no tone modifier) — neutral dot.
    const untouched = chipTone('لم يُختبر');
    expect(untouched).toBeTruthy();
    expect(untouched!.className).toBe('r305s-chip matrix-status-chip');

    // Every chip carries its tone DOT + the status WORD (never hue alone).
    for (const chip of container.querySelectorAll('.matrix-cell .r305s-chip')) {
      expect(chip.querySelector('.r305s-chip-dot')).not.toBeNull();
      expect(chip.textContent!.trim().length).toBeGreaterThan(1);
    }
    // The tabular % rides the meta row beside the chip.
    expect(container.querySelector('.matrix-cell .matrix-meta-pct')?.textContent).toBe('95%');
  });

  it('the r164d gap-cell link contract and the cell aria contract survive the re-skin', () => {
    mocks.matrix = [matrixCourse([
      matrixConcept({ id: 'k-weak', name: 'التحكم بالازدحام', level: 0.5, attempts: 4 }),
    ])];
    mocks.gaps = [{
      conceptId: 'k-weak', conceptName: 'التحكم بالازدحام', courseId: 'c1',
      courseName: 'شبكات الحاسوب', courseColor: null, level: 0.5,
      recommendedLectureId: 'lec-weak', recommendedLectureTitle: 'محاضرة الازدحام',
    }];
    render(
      <MemoryRouter>
        <MatrixPage />
      </MemoryRouter>,
    );

    const cellLink = document.querySelector('a.matrix-cell.lvl-weak');
    expect(cellLink).toHaveAttribute('href', '/student/lectures/lec-weak');
    // aria still names the ACTION with the concept (MatrixPage-links pin).
    expect(cellLink!.getAttribute('aria-label')).toContain('سدّ فجوة: التحكم بالازدحام');
  });
});

/* ── 3 · /student/schedule — the hairline-carried week ledger ────── */

describe('R305 schedule — day sections + the honest week load', () => {
  it('day sections carry .schedule-day and the header meta counts the slots', () => {
    const today = new Date().getDay();
    mocks.enrollments = [{
      id: 'enr1',
      progressPct: 0,
      offering: {
        id: 'off1',
        course: { id: 'c1', name: 'شبكات الحاسوب', code: 'CS301' },
        teacher: { id: 't1', firstName: 'ليلى', lastName: 'الفيتوري' },
        schedule: [
          { id: 's1', dayOfWeek: today, startTime: '09:00', endTime: '10:30', room: 'قاعة A2' },
          { id: 's2', dayOfWeek: (today + 2) % 7, startTime: '11:00', endTime: '12:30', room: 'قاعة B1' },
        ],
      },
    }];
    const { container } = render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('section.schedule-day')).toHaveLength(2);
    // The meta line speaks the REAL slot count (countAr dual form).
    expect(screen.getByText('حصتان أسبوعياً')).toBeTruthy();
    // The rows keep the r299 RowList anatomy with the slot facts.
    expect(container.querySelectorAll('.pf-rowlist .pf-row')).toHaveLength(2);
  });

  it('stylesheet: the ledger rules exist (between days + kicker hairline in each header)', () => {
    const sheet = read('src/styles/r305-student-schedule.css');
    expect(sheet).toMatch(/\.schedule-day \+ \.schedule-day\s*\{[^}]*border-block-start:\s*1px solid var\(--surface-divider\)/);
    expect(sheet).toMatch(/\.schedule-day \.pf-section-header::after\s*\{[^}]*background:\s*var\(--surface-divider\)/);
  });
});

/* ── 4 · /student/results — the ONE deep band ────────────────────── */

const resultsFixture = () => ({
  headline: {
    avgGradePct: 70,
    highest: { courseName: 'الذكاء الاصطناعيّ', gradePct: 90 },
    lowest: { courseName: 'الشبكات', gradePct: 40 },
    courseCount: 2,
  },
  courses: [
    { offeringId: 'o1', term: 't', courseCode: 'CS301', courseName: 'الذكاء الاصطناعيّ', themeColor: null, gradePct: 90, breakdown: [] },
    { offeringId: 'o2', term: 't', courseCode: 'CS210', courseName: 'الشبكات', themeColor: null, gradePct: 40, breakdown: [] },
  ],
  recentAssignments: [],
  pendingSubmissions: [],
});

describe('R305 results — the summary strip is the ONE deep band', () => {
  it('the StatLine rides .results-summary.r305s-band--deep with its eyebrow, tones intact', () => {
    mocks.results = { data: resultsFixture(), isPending: false, isError: false, error: null, refetch: vi.fn() };
    const { container } = render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>,
    );

    const band = container.querySelector('.results-summary.r305s-band--deep');
    expect(band).not.toBeNull();
    expect(band!.querySelector('.r305s-eyebrow')?.textContent).toBe('ملخّص الدرجات');
    // The canonical r164-a tones survive INSIDE the band (the sheet only
    // re-derives their ink toward the band's fg pole — never the mapping).
    expect(band!.querySelector('.pf-stat.positive .pf-stat-value')?.textContent).toContain('90');
    expect(band!.querySelector('.pf-stat.danger .pf-stat-value')?.textContent).toContain('40');
    // Exactly ONE deep band on the page.
    expect(container.querySelectorAll('.r305s-band--deep')).toHaveLength(1);
  });

  it('the pending mirror lives inside the same band (loading-closure footprint)', () => {
    mocks.results = { data: null, isPending: true, isError: false, error: null, refetch: vi.fn() };
    const { container } = render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>,
    );
    expect(container.querySelector('.results-summary.r305s-band--deep .pf-statline[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelector('.results-summary .r305s-eyebrow')?.textContent).toBe('ملخّص الدرجات');
  });

  it('stylesheet: the band re-derives the PATTERN inks via scoped tokens (cascade-proof)', () => {
    const sheet = read('src/styles/r305-student-schedule.css');
    /* patterns.css (the StatLine owner) is UNLAYERED — unlayered author
     * styles beat @layer pages at any specificity, so a color override
     * on .pf-stat-* here would be dead CSS. The band therefore re-derives
     * the TOKENS the pattern rules resolve (--text + the four -ink tones
     * toward --neutral-0, the theme-flipping band fg pole) — inheritance
     * feeds the winning rules instead of fighting them. */
    const band = sheet.match(/\.results-summary\s*\{[^}]*\}/);
    expect(band).not.toBeNull();
    expect(band![0]).toContain('--text: var(--neutral-0)');
    expect(band![0]).toContain('--text-muted: color-mix(in srgb, var(--neutral-0) 62%, var(--neutral-900))');
    expect(band![0]).toContain('--success-ink: color-mix(in srgb, var(--success) 62%, var(--neutral-0))');
    expect(band![0]).toContain('--danger-ink: color-mix(in srgb, var(--danger) 62%, var(--neutral-0))');
    expect(band![0]).toContain('--accent-ink: color-mix(in srgb, var(--accent) 62%, var(--neutral-0))');
    // No layered color override on the pattern's own classes — that is
    // the exact shape the cascade silently kills.
    expect(sheet).not.toMatch(/\.results-summary \.pf-stat[^{]*\{[^}]*color:/);
  });
});

/* ── 5 · /student/online-exams — window/verdict chips ────────────── */

interface ExamFixture {
  id: string; title: string; kind: string; durationMin: number; questionCount: number;
  passingScore: number; openAt: string | null; closeAt: string | null;
  courseName: string | null; courseIcon: string | null; facultyName: string | null;
  myAttempt: { id: string; status: string; score: number | null; maxScore: number; submittedAt: string | null } | null;
}

const examFixture = (over: Partial<ExamFixture> = {}): ExamFixture => ({
  id: 'e1', title: 'اختبار الشبكات', kind: 'QUIZ', durationMin: 30, questionCount: 2,
  passingScore: 50, openAt: null, closeAt: null,
  courseName: 'شبكات الحاسوب', courseIcon: null, facultyName: null, myAttempt: null,
  ...over,
});

describe('R305 online-exams — the list states ride the shared chip register', () => {
  it('a SUBMITTED attempt renders the awaiting chip (warning) with its mono provisional score', () => {
    mocks.exams = [examFixture({
      passingScore: 60,
      myAttempt: { id: 'a-sub', status: 'SUBMITTED', score: 3, maxScore: 10, submittedAt: '2026-06-01T09:00:00.000Z' },
    })];
    const { container } = render(
      <MemoryRouter>
        <OnlineExamsPage />
      </MemoryRouter>,
    );

    const chip = container.querySelector('.oex-row-chips .r305s-chip--warning');
    expect(chip).not.toBeNull();
    expect(chip!.querySelector('.r305s-chip-dot')).not.toBeNull();
    expect(chip!.textContent).toContain('بانتظار التصحيح اليدوي');
    expect(chip!.querySelector('bdi.font-mono')?.textContent).toBe('3 / 10');
  });

  it('a GRADED attempt renders the final verdict chip (success) — one mapping, new register', () => {
    mocks.exams = [examFixture({
      myAttempt: { id: 'a-done', status: 'GRADED', score: 8, maxScore: 10, submittedAt: '2026-01-02T00:00:00.000Z' },
    })];
    const { container } = render(
      <MemoryRouter>
        <OnlineExamsPage />
      </MemoryRouter>,
    );

    const chip = container.querySelector('.oex-row-chips .r305s-chip--success');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('ناجح');
  });

  it('window chips: upcoming reads info, closed reads the resting neutral chip', () => {
    mocks.exams = [
      examFixture({
        id: 'later', title: 'اختبار لاحق',
        openAt: new Date(Date.now() + 86_400_000).toISOString(), closeAt: null,
      }),
      examFixture({
        id: 'shut', title: 'اختبار مغلق',
        openAt: new Date(Date.now() - 172_800_000).toISOString(),
        closeAt: new Date(Date.now() - 3_600_000).toISOString(),
      }),
    ];
    const { container } = render(
      <MemoryRouter>
        <OnlineExamsPage />
      </MemoryRouter>,
    );

    const chips = Array.from(container.querySelectorAll('.oex-row-chips .r305s-chip'));
    const upcoming = chips.find((c) => c.textContent?.includes('يفتح'));
    expect(upcoming).toHaveClass('r305s-chip--info');
    const closed = chips.find((c) => c.textContent?.includes('أغلق باب التسليم'));
    expect(closed).toBeTruthy();
    // Closed is terminal-fact, not a tone: the resting chip (no modifier).
    expect(closed!.className).toBe('r305s-chip');
  });
});

/* ── 6 · stylesheet wiring — the family sheet and its consumers ──── */

describe('R305 schedule family sheet — wiring + gate shape', () => {
  const PAGES = [
    'src/pages/student/CalendarPage.tsx',
    'src/pages/student/MatrixPage.tsx',
    'src/pages/student/MorePages.tsx',
    'src/pages/exams/OnlineExamsPages.tsx',
  ];

  it('the foundation + family sheet are imported by every owned page (and only there)', () => {
    const sheet = read('src/styles/r305-student-schedule.css');
    for (const p of PAGES) {
      const src = read(p);
      expect(src).toContain("import '../../styles/r305-student.css';");
      expect(src).toContain("import '../../styles/r305-student-schedule.css';");
    }
    // No other page module pulls the schedule family sheet.
    for (const other of ['src/pages/student/DashboardPage.tsx', 'src/pages/student/CoursesPage.tsx']) {
      expect(read(other)).not.toContain('r305-student-schedule.css');
    }
    // The sheet sits in the pages layer with the rest of the family.
    expect(sheet).toMatch(/@layer pages \{/);
  });
});
