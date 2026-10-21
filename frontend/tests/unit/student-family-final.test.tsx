/**
 * r299 (final visual workstream C) — the student-learning family joins
 * the frozen patterns contract, and the two settled-state defects the
 * browser/axe inspection caught are pinned so they cannot return:
 *
 *  1. MatrixPage / CalendarPage / SchedulePage ride PageFrame +
 *     PageHeader (the same h1 anatomy the dashboard and courses pages
 *     carry) — the legacy .page/.page-title/.filter-pill grammar and
 *     the training.css cross-family import are gone.
 *  2. The matrix's priority gaps are ROWS of the pattern RowList —
 *     the whole row is the link where a recommendation exists (the
 *     r164d سدّ الفجوة contract, strengthened: row + cell agree).
 *  3. The player's side panel is a labelled REGION (section), never a
 *     complementary landmark nested inside main (axe
 *     landmark-complementary-is-top-level fired at every width/theme).
 *  4. The calendar's out-of-month numerals keep their ink (muted
 *     tier) instead of the opacity 0.35 dim that measured 2.31:1 —
 *     pinned at the stylesheet source the way icon-well-contrast
 *     pins its tier (jsdom cannot compute resolved contrast).
 *  5. SchedulePage's day groups are SectionHeader + RowList rows (the
 *     manual first/last-row borderRadius patch inside Card flush is
 *     gone — the RowList owns its row surface).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import MatrixPage from '../../src/pages/student/MatrixPage';
import StudentCalendarPage from '../../src/pages/student/CalendarPage';
import { SchedulePage } from '../../src/pages/student/MorePages';

const here = dirname(fileURLToPath(import.meta.url));
const studentCss = readFileSync(
  resolve(here, '../../src/styles/student.css'), 'utf8',
);

/* ── the shared mock state (MatrixPage-links mock shape + the
      calendar/schedule queries) ─────────────────────────────────── */

const mocks = vi.hoisted(() => ({
  matrix: [] as Array<Record<string, unknown>>,
  gaps: [] as Array<Record<string, unknown>>,
  enrollments: [] as Array<Record<string, unknown>>,
  dashboard: null as Record<string, unknown> | null,
  exams: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMatrix: () => ({
    data: mocks.matrix,
    isPending: !mocks.matrix,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGaps: () => ({
    data: mocks.gaps,
    isPending: !mocks.gaps,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMyEnrollments: () => ({
    data: mocks.enrollments,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useStudentDashboard: () => ({
    data: mocks.dashboard,
    isPending: !mocks.dashboard,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMyExams: () => ({
    data: mocks.exams,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const RESOLVED_DASHBOARD = {
  profile: { year: 3, gpa: 3.4, totalXp: 100, level: 5, facultyName: 'كلية الهندسة', departmentName: 'الحاسوب' },
  kpi: { courseCount: 1, attendancePct: null, pendingAssignmentsCount: 0, totalXp: 100, rank: 1, cohortSize: 1 },
  term: { code: '2026S', startsAt: new Date().toISOString(), endsAt: new Date().toISOString(), progressPct: 10 },
  progress: { avgEnrollmentProgressPct: 0 },
  agenda: { classes: [], assignments: [], live: [], exams: [] },
};

function renderMatrix() {
  return render(<MemoryRouter><MatrixPage /></MemoryRouter>);
}

function renderCalendar() {
  return render(<MemoryRouter><StudentCalendarPage /></MemoryRouter>);
}

function renderSchedule() {
  return render(<MemoryRouter><SchedulePage /></MemoryRouter>);
}

beforeEach(() => {
  mocks.matrix = [];
  mocks.gaps = [];
  mocks.enrollments = [];
  mocks.dashboard = RESOLVED_DASHBOARD;
  mocks.exams = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── 1. the pattern family headers ─────────────────────────────── */

describe('r299 — the student-learning family rides the patterns contract', () => {
  it('MatrixPage opens with the pattern h1 + description + counted meta (no legacy .page-title)', () => {
    mocks.matrix = [
      {
        courseId: 'c1', courseCode: 'CS301', courseName: 'شبكات الحاسوب',
        themeColor: null, offeringId: 'off1',
        concepts: [
          { id: 'k1', name: 'التحكم بالازدحام', level: 0.5, attempts: 4 },
          { id: 'k2', name: 'توجيه المسار', level: 0.2, attempts: 2 },
          { id: 'k3', name: 'مقابض الإرسال', level: 0.95, attempts: 5 },
        ],
      },
    ];
    const { container } = renderMatrix();

    // ONE semantic h1 on the pattern title, with the page's real copy.
    const h1 = screen.getByRole('heading', { level: 1, name: 'المصفوفة التعليمية' });
    expect(h1).toHaveClass('pf-page-title');
    expect(screen.getByText(/خريطة معرفيّة شخصيّة/)).toBeInTheDocument();
    // the meta line counts the real payload (3 concepts, 1 course).
    expect(screen.getByText(/مفاهيم مُقاسة عبر مقرّر واحد/)).toBeInTheDocument();
    // the legacy grammar is gone from this route.
    expect(container.querySelector('.page-title')).toBeNull();
    expect(container.querySelector('.page-header')).toBeNull();
    expect(container.querySelector('.page')).toBeNull();
  });

  it('CalendarPage (resolved) opens with the pattern h1 + description; the grid stays the interactive surface', () => {
    const { container } = renderCalendar();

    const h1 = screen.getByRole('heading', { level: 1, name: 'التقويم الأكاديمي' });
    expect(h1).toHaveClass('pf-page-title');
    expect(screen.getByText(/كل مواعيدك في نظرة واحدة/)).toBeInTheDocument();
    // the month grid contract the page is known for is untouched.
    expect(container.querySelectorAll('.cal-grid button.cal-cell')).toHaveLength(42);
    expect(container.querySelector('.page')).toBeNull();
  });

  it('SchedulePage renders day groups as SectionHeader + RowList rows with the slot facts', () => {
    // One enrollment carrying two slots on two different weekdays —
    // every day group renders with its real rows (time + course +
    // room + teacher).
    const today = new Date().getDay();
    mocks.enrollments = [
      {
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
      },
    ];
    const { container } = renderSchedule();

    // the pattern header
    const h1 = screen.getByRole('heading', { level: 1, name: 'الجدول الدراسي' });
    expect(h1).toHaveClass('pf-page-title');

    // today's group is first and badged…
    expect(screen.getByText('اليوم')).toBeInTheDocument();
    // …its rows ride the RowList surface with the slot facts.
    const rows = container.querySelectorAll('.pf-rowlist .pf-row');
    expect(rows.length).toBe(2);
    expect(screen.getAllByText('شبكات الحاسوب')).toHaveLength(2); // one row per day
    expect(screen.getByText(/قاعة A2 · ليلى الفيتوري/)).toBeInTheDocument();
    // the time is the leading mono run of the row.
    expect(container.querySelector('.pf-row .pf-row-leading .font-mono')).not.toBeNull();
    // the legacy Card-flush row patch (manual borderRadius) is gone.
    expect(container.querySelector('.page')).toBeNull();
    expect(container.querySelector('.card')).toBeNull();
  });
});

/* ── 2. the matrix gaps rows — RowList, whole-row links ────────── */

describe('r299 — the matrix priority gaps ride the RowList anatomy', () => {
  it('a recommended gap renders ONE row link whose whole line is the سدّ الفجوة affordance', () => {
    mocks.gaps = [
      {
        conceptId: 'k-weak', conceptName: 'التحكم بالازدحام', courseId: 'c1',
        courseName: 'شبكات الحاسوب', courseColor: null, level: 0.45,
        recommendedLectureId: 'lec9', recommendedLectureTitle: 'محاضرة الازدحام',
      },
    ];
    const { container } = renderMatrix();

    const rowLink = container.querySelector('a.pf-row-link');
    expect(rowLink).not.toBeNull();
    expect(rowLink).toHaveAttribute('href', '/student/lectures/lec9');
    // the chip rides INSIDE the link (rich label, no nested control).
    expect(rowLink?.textContent).toContain('سدّ الفجوة');
    // the row carries the concept + the honest current level.
    expect(rowLink?.textContent).toContain('التحكم بالازدحام');
    expect(rowLink?.textContent).toContain('45%');
  });

  it('a gap with no recommendation stays an honest non-link row with «لا توصية»', () => {
    mocks.gaps = [
      {
        conceptId: 'k-none', conceptName: 'مفهوم بلا فصول', courseId: 'c1',
        courseName: 'شبكات الحاسوب', courseColor: null, level: 0.3,
        recommendedLectureId: null, recommendedLectureTitle: null,
      },
    ];
    const { container } = renderMatrix();

    expect(container.querySelector('a.pf-row-link')).toBeNull();
    expect(screen.getByText('لا توصية')).toBeInTheDocument();
  });

  it('the level filter rides FilterBar pills with pressed state and live counts', () => {
    mocks.matrix = [
      {
        courseId: 'c1', courseCode: 'CS301', courseName: 'شبكات الحاسوب',
        themeColor: null, offeringId: 'off1',
        concepts: [
          { id: 'k1', name: 'مقابض الإرسال', level: 0.95, attempts: 5 },
          { id: 'k2', name: 'التحكم بالازدحام', level: 0.5, attempts: 4 },
          { id: 'k3', name: 'توجيه المسار', level: 0.2, attempts: 2 },
          { id: 'k4', name: 'خوارزمية الجوار', level: 0, attempts: 0 },
        ],
      },
    ];
    const { container } = renderMatrix();

    const pills = container.querySelectorAll('.matrix-filter .pill');
    // الكل + the five level buckets — same voice as the courses filter.
    expect(pills.length).toBe(6);
    const all = pills[0]!;
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(all.textContent).toContain('4');
    // a zero-count bucket (no جيد-level concept) is disabled, still honest.
    const goodPill = Array.from(pills).find((p) => p.textContent?.includes('جيد'));
    expect(goodPill).toBeDisabled();
    // …and a live bucket counts its real concepts.
    const weakPill = Array.from(pills).find((p) => p.textContent?.includes('يحتاج مراجعة'));
    expect(weakPill?.textContent).toContain('1');
    // the training.css filter-pill family no longer feeds this page.
    expect(container.querySelector('.filter-pill')).toBeNull();
  });
});

/* ── 3. the player panel — region, not complementary ───────────── */

describe('r299 — the lecture side panel is a labelled region', () => {
  it('the panel is <section aria-label> (region), never <aside> (complementary) inside main', () => {
    // The settled-state axe finding: <aside class="lecture-aside">
    // inside the shell's main landmark tripped
    // landmark-complementary-is-top-level on every player render at
    // every width and theme before r299. The structural half is
    // pinned at the page source (the jsdom player suite holds the
    // behavioural half); the panel keeps its class + aria-label.
    const page = readFileSync(
      resolve(here, '../../src/pages/student/LecturePlayerPage.tsx'), 'utf8',
    );
    expect(page).not.toMatch(/<aside[^>]*lecture-aside/);
    expect(page).toMatch(/<section[^>]*lecture-aside[^>]*aria-label="محتويات المحاضرة"/);
    // the CSS still owns the panel's layout under its class name.
    expect(studentCss).toMatch(/\.lecture-aside/);
  });
});

/* ── 4. the calendar ink — stylesheet drift pins ───────────────── */

describe('r299 — the calendar out-of-month numerals keep AA ink', () => {
  it('the out-of-month rule sets muted INK, not an opacity dim (axe measured 2.31:1)', () => {
    // The settled-state axe finding: .cal-cell[data-in-month='false']
    // { opacity: .35 } put the 13px numeral at 2.31:1 in light. The
    // fix is ink on the numeral (≥4.5:1 in both themes); opacity-as-
    // secondary-text must not return to this rule.
    const rule = studentCss.match(/\.cal-cell\[data-in-month='false'\]\s*\.cal-day-num\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toContain('color: var(--text-muted)');
    const dimRule = studentCss.match(/\.cal-cell\[data-in-month='false'\]\s*\{[^}]*opacity/);
    expect(dimRule).toBeNull();
  });

  it('the pending mirror holds the month footprint without being the interactive grid', () => {
    expect(studentCss).toMatch(/\.cal-grid-skel\s*\{/);
    expect(studentCss).toMatch(/\.cal-cell-skel\s*\{/);
  });
});

/* ── 5. the matrix filter family — stylesheet drift pin ────────── */

describe('r299 — the matrix filter owns its pill container in student.css', () => {
  it('the .matrix-filter grammar mirrors the courses filter contract', () => {
    expect(studentCss).toMatch(/\.matrix-filter\s*\{/);
    expect(studentCss).toMatch(/\.matrix-filter-count\s*\{/);
    expect(studentCss).toMatch(/\.pill\.on \.matrix-filter-count\s*\{\s*color:\s*inherit/);
    // the pills join the ≤920px 44px touch floor the courses filter
    // rides (measured 37px without it on a 390px phone).
    expect(studentCss).toMatch(/\.matrix-filter \.pill,\n/);
    // the retired gap-row stagger family is really gone (its consumer
    // moved to the shared RowList — the dashboard's gaps rows carry
    // no entrance stagger either; one voice).
    expect(studentCss).not.toMatch(/matrix-gap-list/);
    expect(studentCss).not.toMatch(/matrix-gap-in/);
  });
});
