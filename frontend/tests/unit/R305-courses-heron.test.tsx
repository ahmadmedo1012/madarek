/**
 * R305-A5 (task 2-b) — the Heron pass over the student courses family:
 *   /student/courses · /student/catalog · /student/courses/:offeringId
 *   /student/lectures/:lectureId
 *
 * What is pinned here (visual/structural only — the Heron contract, on
 * top of the logic contracts the older suites already own):
 *
 *   1. CoursesPage rows — the quiet metadata line rides the foundation
 *      meta-row (.r305s-meta-row with technical -sep hairlines, the code
 *      bidi-isolated mono), and the upcoming-assignments due state rides
 *      the foundation status chip (.r305s-chip + semantic dot tone) with
 *      the ONE تسليم action beside it.
 *   2. CourseDetailPage — the continue strip is the foundation one-action
 *      rail (.r305s-next + family anchor) carrying an .r305s-eyebrow
 *      micro-label and exactly ONE CTA; the done state swaps the eyebrow
 *      honestly and keeps the no-dead-CTA contract; the curriculum
 *      sections ride the foundation kicker headings (h2 + counted note).
 *   3. LecturePlayerPage — the now-playing block is the page's ONE deep
 *      band, its secondary runs ride .r305s-band-secondary, and the
 *      r168a heading-outline source contract (h1 / h2 «داخل المحاضرة» /
 *      h3 sections) survives byte-for-byte; the watch-progress helpers
 *      (the page's real logic surface) still behave.
 *   4. Family-sheet discipline — r305-student-courses.css is @layer
 *      pages, consumes var()/color-mix() only, keeps type/radius on the
 *      token ladder, and introduces no unguarded :hover; all four pages
 *      import the foundation + family sheets.
 *
 * Mock/setup patterns are the existing page suites' (CoursesPage-summary
 * for the hook-boundary mocks, CourseDetailPage for importOriginal +
 * the OfferingFull shape, r168a for the source-level pins).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StudentCoursesPage from '../../src/pages/student/CoursesPage';
import CourseDetailPage from '../../src/pages/student/CourseDetailPage';
import { isWatchComplete, resolveReportTotalSec } from '../../src/pages/student/LecturePlayerPage';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJsx = (src: string) =>
  stripComments(src).replace(/\{\/\*[\s\S]*?\*\//g, '');

/* ── shared fixtures ─────────────────────────────────────────────── */

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

const mocks = vi.hoisted(() => ({
  enrollments: [] as unknown[],
  dashboard: { agenda: { assignments: [] as unknown[] } },
  lectures: [] as unknown[],
  offering: null as Record<string, unknown> | null,
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useMyEnrollments: () => ({
      data: mocks.enrollments,
      isPending: false,
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
    useOfferingFull: () => ({
      data: mocks.offering,
      isPending: !mocks.offering,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

/** The GET /enrollments/me row shape (MyEnrollment), as in CoursesPage-summary. */
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

/** The GET /offerings/:id/full shape, as in CourseDetailPage.test. */
const baseOffering = () => ({
  id: 'off1',
  term: 'الخريف',
  room: 'قاعة أ',
  course: {
    id: 'c1',
    name: 'شبكات الحاسوب',
    code: 'CS301',
    iconEmoji: null,
    themeColor: null,
    description: null,
    credits: 3,
    department: { id: 'd1', name: 'علوم الحاسوب', faculty: { id: 'f1', name: 'تقنية المعلومات' } },
  },
  teacher: { id: 't1', firstName: 'أحمد', lastName: 'الألفي', avatarInitials: null, avatarColor: null },
  schedule: [],
  materials: [],
  assignments: [],
  lectures: [],
  _count: { enrollments: 30 },
});

const lecture = (over: Record<string, unknown>) => ({
  id: 'l1',
  offeringId: 'off1',
  title: 'محاضرة',
  description: null,
  ordinal: 1,
  durationSec: 600,
  videoUrl: 'https://cdn.example.com/l.mp4',
  posterUrl: null,
  createdAt: iso(-30),
  _count: { chapters: 0, checkpoints: 0 },
  watchEvents: [] as Array<{ watchedSec: number; totalSec: number; completed: boolean }>,
  answeredCheckpoints: 0,
  ...over,
});

beforeEach(() => {
  mocks.enrollments = [];
  mocks.dashboard = { agenda: { assignments: [] } };
  mocks.lectures = [];
  mocks.offering = null;
});

/* ── 1 · CoursesPage — Heron row anatomy ─────────────────────────── */

describe('R305 courses — the course row rides the foundation meta-row', () => {
  it('code · teacher · lecture count render as .r305s-meta-row with technical separators', () => {
    mocks.enrollments = [enrollment('a', 62)];
    mocks.lectures = [{ id: 'lec1' }, { id: 'lec2' }, { id: 'lec3' }];
    const { container } = render(<MemoryRouter><StudentCoursesPage /></MemoryRouter>);

    const metaRow = container.querySelector('.pf-row-meta .r305s-meta-row');
    expect(metaRow).not.toBeNull();
    // The code stays bidi-isolated mono — never a bare digit run in RTL.
    const code = metaRow!.querySelector('bdi.font-mono');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('CS-a');
    // Three metadata items ⇒ two technical separators (hairline elements,
    // not '·' text opacity).
    expect(metaRow!.querySelectorAll('.r305s-meta-sep')).toHaveLength(2);
    expect(metaRow!.textContent).toContain('د. سالم الطاهر');
    expect(metaRow!.textContent).toContain('3 محاضرات');
  });

  it('the zero-content course keeps its honest line inside the same meta-row', () => {
    mocks.enrollments = [enrollment('z', 0)];
    mocks.lectures = [];
    const { container } = render(<MemoryRouter><StudentCoursesPage /></MemoryRouter>);
    const metaRow = container.querySelector('.pf-row-meta .r305s-meta-row') as HTMLElement;
    expect(metaRow.textContent).toContain('بانتظار محتوى المقرّر');
  });
});

describe('R305 courses — the upcoming-assignments due chips', () => {
  it('the due state rides the foundation chip with a semantic dot tone; the تسليم action stays the one verb', () => {
    mocks.dashboard = {
      agenda: {
        assignments: [
          { id: 'a1', type: 'ESSAY', title: 'واجب متأخر', courseName: 'شبكات', courseCode: 'CS301', dueAt: iso(-3), offeringId: 'off1' },
          { id: 'a2', type: 'QUIZ', title: 'واجب قريب', courseName: 'شبكات', courseCode: 'CS301', dueAt: iso(1), offeringId: 'off1' },
          { id: 'a3', type: 'ESSAY', title: 'واجب بعيد', courseName: 'شبكات', courseCode: 'CS301', dueAt: iso(9), offeringId: 'off1' },
        ],
      },
    };
    const { container } = render(<MemoryRouter><StudentCoursesPage /></MemoryRouter>);

    const chips = Array.from(container.querySelectorAll('.pf-row-trailing .r305s-chip'));
    expect(chips).toHaveLength(3);
    expect(chips[0]!.classList.contains('r305s-chip--danger')).toBe(true);   // فات الموعد
    expect(chips[1]!.classList.contains('r305s-chip--warning')).toBe(true);  // يستحق قريباً
    expect(chips[2]!.classList.contains('r305s-chip--success')).toBe(true);  // متبقّي وقت
    // Each chip carries its tone dot + the honest label.
    expect(chips.every((c) => c.querySelector('.r305s-chip-dot') !== null)).toBe(true);
    expect(chips.map((c) => c.textContent)).toEqual(['فات الموعد', 'يستحق قريباً', 'متبقّي وقت']);
    // The ONE clear action per row survives (the due chip is quiet chrome).
    expect(screen.getAllByRole('button', { name: /تسليم/ })).toHaveLength(3);
  });
});

/* ── 2 · CourseDetailPage — the one-action rail + kicker sections ── */

function renderCourse() {
  return render(
    <MemoryRouter initialEntries={['/student/courses/off1']}>
      <Routes>
        <Route path="/student/courses/:offeringId" element={<CourseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('R305 course detail — the continue strip is the Heron next-rail', () => {
  it('the strip carries the foundation rail + an eyebrow micro-label and exactly ONE CTA', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      lecture({ id: 'l1', ordinal: 1, title: 'المقدمة', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lecture({ id: 'l2', ordinal: 2, title: 'الطبقة الناقلة' }),
    ];
    const { container } = renderCourse();

    const strip = container.querySelector('.r305c-continue.r305s-next');
    expect(strip).not.toBeNull();
    // The eyebrow classifies the moment — the next step.
    const eyebrow = strip!.querySelector('.r305s-eyebrow');
    expect(eyebrow).not.toBeNull();
    expect(eyebrow!.textContent).toBe('الخطوة التالية');
    // ONE next action rides the rail (r164d: the first unfinished lecture).
    const links = strip!.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute('href')).toBe('/student/lectures/l2');
    expect(screen.getByRole('link', { name: /التالي/ })).toBe(links[0]);
  });

  it('the done state swaps the eyebrow honestly and keeps the no-dead-CTA contract', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      lecture({ id: 'l1', ordinal: 1, watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lecture({
        id: 'l2', ordinal: 2,
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { chapters: 0, checkpoints: 2 }, answeredCheckpoints: 2,
      }),
    ];
    const { container } = renderCourse();

    const strip = container.querySelector('.r305c-continue.r305s-next') as HTMLElement;
    expect(strip.querySelector('.r305s-eyebrow')!.textContent).toBe('اكتمل المنهج');
    expect(strip.querySelectorAll('a')).toHaveLength(0);
    expect(screen.getByText('أنهيت محاضرات المقرّر')).toBeInTheDocument();
  });
});

describe('R305 course detail — the curriculum sections ride the kicker headings', () => {
  it('each section keeps its h2 as .r305s-kicker-title; the counted note rides the metric-label voice', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      lecture({ id: 'l1', ordinal: 1, watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lecture({ id: 'l2', ordinal: 2 }),
    ];
    renderCourse();

    const titles = Array.from(document.querySelectorAll('h2.r305s-kicker-title')).map((h) => h.textContent);
    expect(titles).toEqual(['المحاضرات', 'المواد المرفقة', 'الجدول الأسبوعي', 'الواجبات']);
    // The lectures kicker carries the counted note (the counted Arabic
    // plural — محاضرتين — never a bare numeral).
    const lecKicker = document.querySelector('.course-lectures .r305s-kicker') as HTMLElement;
    expect(lecKicker.querySelector('.r305s-metric-label')!.textContent).toContain('أكملت 1 من محاضرتين');
  });
});

/* ── 3 · LecturePlayerPage — the deep now-playing band ───────────── */

describe('R305 player — the now-playing block is the page’s ONE deep band', () => {
  it('the band classes + band-secondary runs are pinned at source; the r168a heading outline survives', () => {
    const page = stripJsx(read('src/pages/student/LecturePlayerPage.tsx'));
    // The deep band wraps the meta block (and ONLY it — one --deep band
    // per view, the Heron restraint).
    expect(page).toContain('className="lecture-meta r305s-band r305s-band--deep r305c-now"');
    expect(page.match(/r305s-band--deep/g)?.length).toBe(1);
    // The secondary runs re-derive from the band ink.
    expect(page.match(/r305s-band-secondary/g)?.length).toBe(2);
    // r168a re-pin: h1 lecture title · h2 panel · h3 sections — unchanged.
    expect(page).toContain('<h1 className="lecture-meta-title">');
    expect(page).toContain('<h2 className="lecture-panel-title">داخل المحاضرة</h2>');
    expect(page).toContain('<h3 className="lecture-panel-sec-title">');
    expect(page).toContain('فصول المحاضرة</h3>');
    // The r299 landmark contract (labelled section, never aside) holds.
    expect(page).toMatch(/<section[^>]*lecture-aside[^>]*aria-label="محتويات المحاضرة"/);
  });

  it('the watch-progress logic the band surrounds is untouched (the helpers still rule)', () => {
    // The 95% completion share and the real-media-duration resolution —
    // the same contracts LecturePlayerPage.test pins behaviourally.
    expect(isWatchComplete(949, 1000)).toBe(false);
    expect(isWatchComplete(950, 1000)).toBe(true);
    expect(resolveReportTotalSec(718.4, 2700)).toBe(718);
    expect(resolveReportTotalSec(Number.NaN, 2700)).toBe(2700);
  });
});

/* ── 4 · Family-sheet discipline ─────────────────────────────────── */

describe('R305 courses — the family sheet obeys the gate contract', () => {
  const sheet = read('src/styles/r305-student-courses.css');

  it('is a @layer pages sheet consuming var()/color-mix() only — zero raw color literals', () => {
    expect(sheet).toMatch(/@layer pages \{/);
    expect(sheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(sheet).not.toMatch(/\brgba?\(/);
    expect(sheet).not.toMatch(/\bhsla?\(/);
  });

  it('keeps type/radius/spacing on the token ladder (no raw px in those axes)', () => {
    const body = stripComments(sheet);
    expect(body).not.toMatch(/font-size:\s*(?!var\()\S/);
    expect(body).not.toMatch(/border-[a-z-]*radius:\s*(?!var\()[^;]*\d/);
    expect(body).not.toMatch(/(?:padding|margin|gap)[a-z-]*:\s*[^;]*\dpx/);
  });

  it('introduces no unguarded :hover and keeps the reduced-motion belt', () => {
    const body = stripComments(sheet);
    expect(body).not.toMatch(/:hover/);
    expect(body).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('all four pages import the foundation + family sheets', () => {
    for (const file of ['CoursesPage', 'CatalogPage', 'CourseDetailPage', 'LecturePlayerPage']) {
      const src = read(`src/pages/student/${file}.tsx`);
      expect(src).toContain("import '../../styles/r305-student.css';");
      expect(src).toContain("import '../../styles/r305-student-courses.css';");
    }
  });
});
