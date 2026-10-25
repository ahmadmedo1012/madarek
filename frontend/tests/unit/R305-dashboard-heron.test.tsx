/**
 * R305-A5 — the dashboard's Heron visual pass (Agent 2-a family pins).
 *
 * The r220–r285 composition (TodayList-first, momentum StatLine,
 * continue-learning hero, gaps rail, week ledger) is data-frozen; the
 * R305 pass re-skins it in the Heron register. These pins hold the
 * VISUAL CONTRACT at the DOM level so a later "simplify" cannot
 * quietly drop it:
 *
 *  1. THE ONE NEXT ACTION — the hero band rides the deep surface
 *     (.r305s-band--deep + .dash-hero-deep), its micro-label «أكمل من
 *     حيث توقفت» lifts into the .r305s-eyebrow register, and the page
 *     carries EXACTLY ONE accent CTA (the hero's .btn.accent).
 *  2. EDITORIAL SECTIONS — اليوم / مقرّراتك / فجوات يُنصح بسدّها /
 *     أسبوعك القادم each open with the .r305s-kicker register (h2 +
 *     hairline); the momentum strip rides the .r305s-rule-labeled
 *     annotated divider (a metadata band, not a boxed section).
 *  3. STATUS CHIPS FROM REAL DATA — the week ledger's مباشر/اختبار/
 *     تسليم and the gaps rail's «لا توصية بعد» ride the .r305s-chip
 *     anatomy (tone only on the dot; gold never touches deliverables).
 *  4. THE PENDING MIRROR — the loading skeleton carries the SAME deep
 *     band classes and the SAME labeled-rule anatomy as the resolved
 *     page (r172b loading-closure, re-mirrored for the Heron pass).
 *  5. SOURCE HYGIENE — the page imports both sheets, and every :hover
 *     rule the family sheet authors sits inside the
 *     (hover:hover) and (pointer:fine) guard.
 *
 * Fixtures ride the SAME lib/api module-boundary mock the r172b
 * loading-closure spec uses (URL-keyed table, unwrap passthrough) —
 * no fabricated UI state: every chip/count/countAr string below is
 * computed by the page from these payloads.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { FIXTURES, PENDING } = vi.hoisted(() => ({
  FIXTURES: {} as Record<string, unknown>,
  PENDING: new Set<string>(),
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      if (PENDING.has(url)) return new Promise(() => {});
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve({ data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

import StudentDashboardPage from '../../src/pages/student/DashboardPage';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── Fixtures: real payload shapes (hooks/resources/student.ts) ──── */

const now = new Date();
const iso = (d: Date) => d.toISOString();
const hoursFromNow = (h: number) => iso(new Date(Date.now() + h * 3600_000));
const noonToday = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return iso(d);
};

const DASHBOARD = {
  profile: {
    year: 3,
    gpa: 3.42,
    totalXp: 1250,
    level: 4,
    facultyName: 'كلية علوم الحاسوب',
    departmentName: 'قسم البرمجيات',
  },
  kpi: {
    courseCount: 2,
    attendancePct: 87.5,
    pendingAssignmentsCount: 1,
    totalXp: 1250,
    rank: 6,
    cohortSize: 40,
  },
  term: {
    code: '2026-SPRING',
    startsAt: iso(new Date(now.getFullYear(), 0, 5)),
    endsAt: iso(new Date(now.getFullYear(), 4, 20)),
    progressPct: 38,
  },
  progress: { avgEnrollmentProgressPct: 55 },
  agenda: {
    classes: [{
      id: 's1', offeringId: 'o1',
      courseName: 'قواعد البيانات المتقدّمة', courseCode: 'CS301',
      startTime: '09:00', endTime: '10:30', room: 'قاعة 12', when: 'today',
    }],
    assignments: [{
      id: 'a1', offeringId: 'o1', title: 'واجب الجداول المرجعية',
      type: 'HOMEWORK', dueAt: hoursFromNow(26),
      courseName: 'قواعد البيانات المتقدّمة', courseCode: 'CS301',
    }],
    live: [
      {
        id: 'lv1', title: 'مراجعة ما قبل الاختبار', scheduledAt: noonToday(),
        status: 'SCHEDULED',
        offering: { course: { name: 'قواعد البيانات المتقدّمة', code: 'CS301' } },
      },
      {
        id: 'lv2', title: 'ورشة تحسين الاستعلامات', scheduledAt: hoursFromNow(50),
        status: 'SCHEDULED',
        offering: { course: { name: 'قواعد البيانات المتقدّمة', code: 'CS301' } },
      },
    ],
    exams: [{
      id: 'ex1', title: 'الاختبار النصفي', kind: 'MIDTERM',
      openAt: null, closeAt: null, whenAt: hoursFromNow(72), phase: 'closes',
      courseName: null, courseCode: 'CS301', facultyName: null,
    }],
  },
};

const RESUME = {
  mode: 'continue',
  progressPct: 42,
  watchedSec: 760,
  lecture: {
    id: 'l9',
    title: 'الفهارس وخطة التنفيذ',
    durationSec: 1140,
    ordinal: 3,
    course: { id: 'c1', name: 'قواعد البيانات المتقدّمة', code: 'CS301', themeColor: null },
    offeringId: 'o1',
  },
};

const ENROLLMENTS = [
  {
    id: 'e1', progressPct: 64,
    offering: {
      id: 'o1',
      course: { id: 'c1', code: 'CS301', name: 'قواعد البيانات المتقدّمة', themeColor: null },
      teacher: { id: 't1', firstName: 'سامي', lastName: 'الدرّاسي' },
      schedule: [],
    },
  },
  {
    id: 'e2', progressPct: 12,
    offering: {
      id: 'o2',
      course: { id: 'c2', code: 'AI210', name: 'مقدمة في الذكاء الاصطناعي', themeColor: null },
      teacher: { id: 't2', firstName: 'منى', lastName: 'الفيتوري' },
      schedule: [],
    },
  },
];

const GAPS = [
  {
    conceptId: 'g1', conceptName: 'الفهارس المركّبة', courseId: 'c1',
    courseName: 'قواعد البيانات المتقدّمة', courseColor: null, level: 0.35,
    recommendedLectureId: 'l5', recommendedLectureTitle: 'تحسين الاستعلامات',
  },
  {
    conceptId: 'g2', conceptName: 'صيغ التطبيع', courseId: 'c1',
    courseName: 'قواعد البيانات المتقدّمة', courseColor: null, level: 0.52,
    recommendedLectureId: null, recommendedLectureTitle: null,
  },
];

function setFixtures(map: Record<string, unknown>) {
  for (const [k, v] of Object.entries(map)) FIXTURES[k] = v;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  PENDING.clear();
  setFixtures({
    '/me/dashboard': DASHBOARD,
    '/me/resume': RESUME,
    '/training/catalog': [],
    '/enrollments/me': ENROLLMENTS,
    '/me/gaps': GAPS,
  });
});

/* ── 1 · The ONE next action: deep band + eyebrow + one accent CTA ── */

describe('R305 — the hero band (the ONE next action)', () => {
  it('rides the deep band with the eyebrow register and the display course name', async () => {
    const { container } = renderPage();
    const band = await screen.findByText('أكمل من حيث توقفت');
    // The micro-label lifts into the shared eyebrow register…
    expect(band.className).toContain('r305s-eyebrow');
    // …inside the Heron deep band (theme-reactive ink/paper inversion).
    const hero = band.closest('.dash-resume-card') as HTMLElement;
    expect(hero).not.toBeNull();
    expect(hero.className).toContain('r305s-band--deep');
    expect(hero.className).toContain('dash-hero-deep');
    // The course name is the band's display line.
    const name = hero.querySelector('.dash-resume-course-name');
    expect(name?.textContent).toBe('قواعد البيانات المتقدّمة');
    // The honest progress readout stays (quiet but precise).
    expect(screen.getByRole('progressbar', { name: 'تقدّم مشاهدة المحاضرة: 42%' })).toBeTruthy();
    expect(container).toBeTruthy();
  });

  it('carries EXACTLY ONE accent CTA — every other action is ghost/outline/chip', async () => {
    const { container } = renderPage();
    await screen.findByText('أكمل من حيث توقفت');
    const accents = container.querySelectorAll('a.btn.accent');
    expect(accents).toHaveLength(1);
    expect(accents[0]?.getAttribute('href')).toBe('/student/lectures/l9');
    expect(accents[0]?.textContent).toContain('متابعة المشاهدة');
    // The section actions stay quiet ghosts.
    /* R319 override (c2-G1): the kicker-action seat became the §B2
       SectionBar's action slot (.r319s-bar-action) — same ghost
       buttons, same quiet register, new title-bar grammar. */
    const ghosts = container.querySelectorAll('.r319s-bar-action .btn.ghost');
    expect(ghosts.length).toBeGreaterThanOrEqual(3);
  });

  it('the side note is the meta-row register: code + clock from real data', async () => {
    const { container } = renderPage();
    await screen.findByText('أكمل من حيث توقفت');
    const row = container.querySelector('.dash-resume-side-note');
    expect(row?.className).toContain('r305s-meta-row');
    // CS301 (mono) + 1140s → 19:00 — the real media duration, bidi-isolated.
    expect(row?.querySelector('.font-mono')?.textContent).toBe('CS301');
    expect(row?.textContent).toContain('19:00');
    expect(row?.querySelector('.r305s-meta-sep')).not.toBeNull();
  });
});

/* ── 2 · Editorial sections: kicker register over every block ────── */

describe('R305 — the section kicker register', () => {
  /* R319 override (c2-G1): every titled section opens with the §B2
     SectionBar — the mono-indexed title bar — instead of the R305
     kicker. The h2 contract (one h1 per route, sections answer with
     h2s) and the title strings are unchanged; the register is the
     sheet's: [nn] gutter index + title + hairline rule. */
  it('اليوم / مقرّراتك / فجوات يُنصح بسدّها / أسبوعك القادم each open with a SectionBar h2', async () => {
    const { container } = renderPage();
    await screen.findByText('أكمل من حيث توقفت');
    for (const title of ['اليوم', 'مقرّراتك', 'فجوات يُنصح بسدّها', 'أسبوعك القادم']) {
      const h = screen.getByRole('heading', { level: 2, name: title });
      expect(h.className).toContain('r319s-bar-title');
      const bar = h.closest('.r319s-bar');
      expect(bar).not.toBeNull();
      // The mono gutter index rides every titled section (aria-hidden,
      // LTR Latin).
      const idx = bar?.querySelector('.r319s-bar-index');
      expect(idx?.textContent).toMatch(/^\[\d{2}\]$/);
      expect(idx?.getAttribute('aria-hidden')).toBe('true');
    }
    // The masthead stays the page's only h1 (the PageHeader contract).
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toBe('لوحة التحكم');
  });

  it('the اليوم bar counts the actable rows from the real agenda (mono datum + countAr)', async () => {
    const { container } = renderPage();
    // 1 class + 1 live (noon today) + 1 actable exam = 3 → the 3–10 plural form.
    /* R319 override (c2-G1): the count is now the SectionBar's quiet
       mono meta — the sheet prints the tabular `03` for sighted
       readers and keeps the countAr phrase for assistive tech. */
    await screen.findByText('3 التزامات اليوم');
    const count = container.querySelector('.r319s-bar .r319s-count');
    expect(count?.textContent).toBe('03');
    expect(count?.getAttribute('aria-hidden')).toBe('true');
  });

  it('the momentum strip rides the labeled rule (metadata band, not a boxed section)', async () => {
    renderPage();
    const rule = await screen.findByText('زخم الفصل');
    expect(rule.className).toContain('r305s-rule-labeled');
    const strip = rule.closest('.dash-momentum');
    expect(strip?.querySelector('.pf-statline')).not.toBeNull();
  });
});

/* ── 3 · Status chips computed from the real payloads ─────────────── */

describe('R305 — the chip register on statuses', () => {
  /* R319 override (c2-G1): the agenda's kind chips are the §B2 mono
     StatusChip register now — [LIVE] (orange, the ONE signal state) /
     the honest DUE label / [CLASS] quiet — square mono chips beside
     each row's Arabic meta sentence. The tone discipline carries over:
     LIVE is the only orange; deliverables stay neutral ink. */
  it('the week ledger rides the mono status chips (live→[LIVE] orange, deliverable→DUE nD neutral)', async () => {
    const { container } = renderPage();
    await screen.findByText('أكمل من حيث توقفت');
    // The +50h live broadcast lands in the week ledger → [LIVE], the
    // one orange (live-tone) state.
    const liveChip = container.querySelector('.week-item .r319s-chip--live');
    expect(liveChip?.textContent).toBe('LIVE');
    expect(liveChip?.getAttribute('dir')).toBe('ltr');
    // The +26h assignment lands in the week ledger → the honest
    // deadline label (round(26/24) = 1 day out) in neutral ink.
    const deliverChip = [...container.querySelectorAll('.week-item .r319s-chip--due')]
      .find((c) => c.textContent?.startsWith('DUE'));
    expect(deliverChip?.textContent).toBe('DUE 1D');
    expect(deliverChip?.className).not.toContain('--live');
  });

  it('a gap with no recommendation renders the honest metadata chip', async () => {
    const { container } = renderPage();
    const chip = await screen.findByText('لا توصية بعد');
    expect(chip.className).toContain('r305s-chip');
    // …and the recommended gap's mastery level is the mono register
    // (the same real payload: level 0.35 → 35%, western digits from
    // formatInt, never reformatted by the page).
    const pct = container.querySelector('.dash-gap-pct');
    expect(pct?.textContent).toBe('35%');
  });
});

/* ── 4 · The pending mirror keeps the Heron anatomy ───────────────── */

describe('R305 — the pending mirror', () => {
  it('the hero skeleton slot carries the SAME deep-band classes; the momentum mirror keeps the labeled rule', async () => {
    PENDING.add('/me/dashboard');
    const { container } = renderPage();
    const skel = container.querySelector('.stu-hero-skel');
    expect(skel).not.toBeNull();
    expect(skel?.className).toContain('r305s-band--deep');
    expect(skel?.className).toContain('dash-hero-deep');
    const momentum = container.querySelector('.dash-momentum');
    expect(momentum?.getAttribute('aria-busy')).toBe('true');
    expect(momentum?.querySelector('.r305s-rule-labeled')?.textContent).toBe('زخم الفصل');
    expect(momentum?.querySelectorAll('.pf-stat')).toHaveLength(4);
    // The identity contract survives the mirror (r168a re-pin).
    expect(screen.getByRole('heading', { level: 1, name: 'لوحة التحكم' })).toBeTruthy();
  });
});

/* ── 5 · Source pins: the import convention + the hover guard ─────── */

describe('R305 — source hygiene pins', () => {
  it('the page imports the shared foundation and its family sheet', () => {
    const page = stripComments(read('src/pages/student/DashboardPage.tsx'));
    expect(page).toContain("import '../../styles/r305-student.css';");
    expect(page).toContain("import '../../styles/r305-student-dashboard.css';");
  });

  it('every :hover the family sheet authors sits inside the (hover)+(pointer) guard', () => {
    const css = stripComments(read('src/styles/r305-student-dashboard.css'));
    const totalHovers = (css.match(/:hover/g) ?? []).length;
    expect(totalHovers).toBeGreaterThan(0);
    const guarded = css.match(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n  \}/g) ?? [];
    const guardedHovers = (guarded.join('\n').match(/:hover/g) ?? []).length;
    expect(guardedHovers).toBe(totalHovers);
  });

  it('the deep-band inks derive from the band fg/ground pair (color-mix, no raw colors)', () => {
    const css = stripComments(read('src/styles/r305-student-dashboard.css'));
    expect(css).toMatch(
      /\.dash-hero-deep \.dash-resume-eyebrow \{[^}]*color:\s*color-mix\(in srgb, var\(--neutral-0\) 85%, var\(--neutral-900\)\)/,
    );
    // No raw literals anywhere in the family sheet (the color gate's
    // own contract, pinned here for the deep-band derivations).
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgb\(/);
    expect(css).not.toMatch(/hsl\(/);
  });
});
