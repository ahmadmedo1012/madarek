/**
 * R305-A5 (task 2-d) — the Heron pass over the student supplemental
 * family: /student/profile · /student/messages · /student/mooc ·
 * /student/jobs · /student/labs · /student/live · /student/payment ·
 * /student/map · /student/webinars · /student/gamification ·
 * /student/skills · /student/alerts · /student/ar · /student/social ·
 * /student/downloads · /student/university · /training + /achievements
 *
 * What is pinned here (visual/structural only — the Heron contract, on
 * top of the behaviour contracts the older suites already own):
 *
 *   1. ProfilePage — the page's ONE deep band is the identity hero
 *      (avatar + eyebrow + name + verified state + the completeness
 *      meter); the 5-D1 % readout rides the band's own ink class.
 *   2. GamificationPage — the level statement rides the ONE deep band
 *      with the tier orb inside it; achievements + leaderboard demote to
 *      kicker-headed page-surface sections (no card wall); the gold
 *      discipline: the sheet never consumes var(--gold) (it stays on
 *      training.css's achievement anatomy) and the UniversityInfo
 *      membership rows no longer wear gold.
 *   3. AchievementsPage — the KPI strip rides the .r305a-strip deep
 *      register around the shared StatStrip (values stay band-neutral).
 *   4. AlertsPage — ROLE-NEUTRAL de-boxing: the notification list leaves
 *      its Card for a kicker-headed section on the page surface (the
 *      same markup serves /admin/alerts, /teacher/alerts,
 *      /quality/notifications, /owner/notifications), with the sheet's
 *      np-list margin fix so the hairline rows meet the kicker.
 *   5. LabsPage — the catalog is ONE kicker-headed section holding every
 *      honest state; card metadata rides the meta-row register with the
 *      D17-2 counted noun; the runner's session status rides the chip.
 *   6. MessagesPage — the thin shell gains the two sheet imports and the
 *      shared inbox's honest empty state keeps serving it.
 *   7. Family-sheet discipline — r305-student-supplemental.css is
 *      @layer pages, consumes var()/color-mix() only, keeps
 *      type/radius/spacing on the token ladder, guards its single :hover
 *      behind (hover:hover) and (pointer:fine), and keeps the
 *      reduced-motion belt; ALL eleven touched pages import the
 *      foundation + family sheets.
 *
 * Mock/setup patterns are the existing suites' (AlertsPage-mark-read for
 * the hoisted feed/mutation shapes + QueryClient wrapper,
 * StudentMessagesPage for the auth-store seeding, R305-courses-heron for
 * the source-level sheet pins).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ProfilePage from '../../src/pages/student/ProfilePage';
import LabsPage from '../../src/pages/student/LabsPage';
import { StudentMessagesPage } from '../../src/pages/student/MessagesPage';
import { AlertsPage, GamificationPage } from '../../src/pages/student/MorePages';
import { AchievementsPage } from '../../src/pages/student/TrainingPages';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJsx = (src: string) =>
  stripComments(src).replace(/\{\/\*[\s\S]*?\*\//g, '');

/* ── shared mocks (one useResources boundary, importOriginal spread) ── */

const mocks = vi.hoisted(() => ({
  // alerts
  feed: {
    data: undefined as { pages: Array<Record<string, unknown>> } | undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  },
  markRead: { mutate: vi.fn(), isPending: false, variables: undefined as string | undefined },
  markAllRead: { mutate: vi.fn(), isPending: false },
  // profile
  profile: null as Record<string, unknown> | null,
  enrollments: [] as unknown[],
  achievements: [] as unknown[],
  research: [] as unknown[],
  // gamification + achievements
  dashboard: null as Record<string, unknown> | null,
  leaderboard: [] as unknown[],
  trainingMe: null as Record<string, unknown> | null,
  badges: [] as unknown[],
  certs: [] as unknown[],
  // labs
  labs: [] as unknown[],
  labStats: null as Record<string, unknown> | null,
  // messages
  messages: { pages: {} as Record<number, Array<Record<string, unknown>>>, total: 0, totalPages: 1, unread: 0 },
  markAllMessages: { mutate: vi.fn(), isPending: false, isError: false, error: null as unknown },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  const q = (data: unknown) => ({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  return {
    ...actual,
    // alerts (AlertsPage-mark-read shapes)
    useNotificationsFeed: () => mocks.feed,
    useMarkNotifRead: () => mocks.markRead,
    useMarkAllNotifsRead: () => mocks.markAllRead,
    // profile
    useMyProfile: () => q(mocks.profile),
    useMyEnrollments: () => q(mocks.enrollments),
    useMyAchievements: () => q(mocks.achievements),
    useMyResearch: () => q(mocks.research),
    // gamification
    useStudentDashboard: () => q(mocks.dashboard),
    useLeaderboard: () => q(mocks.leaderboard),
    useTrainingMe: () => q(mocks.trainingMe),
    // achievements
    useMyBadges: () => q(mocks.badges),
    useMyTrainingCerts: () => q(mocks.certs),
    useTrainingLeaderboard: () => q(mocks.leaderboard),
    // labs
    useLabs: () => q(mocks.labs),
    useMyLabSessions: () => q(mocks.labStats),
    useCompleteLabSession: () => ({ mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn() }),
    // messages
    useMyMessages: (page: number, limit: number) => ({
      data: {
        data: mocks.messages.pages[page] ?? [],
        meta: { page, limit, total: mocks.messages.total, totalPages: mocks.messages.totalPages, unread: mocks.messages.unread },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useMarkAllMessagesRead: () => mocks.markAllMessages,
  };
});

const STUDENT: AuthUser = {
  id: 's1',
  email: 'amna@zu.edu.ly',
  firstName: 'آمنة',
  lastName: 'العبيدي',
  role: 'STUDENT',
};

const lab = (over: Record<string, unknown>) => ({
  id: 'lab1',
  name: 'معمل الشبكات',
  platform: 'Cisco Packet Tracer',
  category: 'net',
  iconEmoji: null,
  totalExperiments: 3,
  themeColor: null,
  ...over,
});

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.profile = { emailVerifiedAt: new Date().toISOString() };
  mocks.enrollments = [];
  mocks.achievements = [];
  mocks.research = [];
  mocks.dashboard = { kpi: { totalXp: 320, rank: 3, cohortSize: 30 } };
  mocks.leaderboard = [];
  mocks.trainingMe = null;
  mocks.badges = [];
  mocks.certs = [];
  mocks.labs = [];
  mocks.labStats = { active: 0, completed: 0, total: 0, recent: [] };
  mocks.messages = { pages: {}, total: 0, totalPages: 1, unread: 0 };
  mocks.markAllMessages = { mutate: vi.fn(), isPending: false, isError: false, error: null };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.setState({ user: null });
});

/* ── 1 · ProfilePage — the deep identity hero band ───────────────── */

describe('R305 profile — the identity hero is the page’s ONE deep band', () => {
  it('avatar + eyebrow + name + verified state + meter share the auto-inverting ground', () => {
    useAuthStore.setState({ user: STUDENT });
    mocks.research = [{ id: 'p1', status: 'PUBLISHED' }];
    const { container } = renderPage(<ProfilePage />);

    const band = container.querySelector('.r305s-band--deep.r305p-hero');
    expect(band).not.toBeNull();
    // ONE deep band per page — the Heron restraint.
    expect(container.querySelectorAll('.r305s-band--deep')).toHaveLength(1);
    // The eyebrow classifies the band as the account block.
    expect(band!.querySelector('.r305s-eyebrow')!.textContent).toBe('الملف الشخصي');
    // Identity: the name at the section register + the bidi-isolated mono email.
    expect(band!.querySelector('.r305p-hero-name')!.textContent).toBe('آمنة العبيدي');
    const mail = band!.querySelector('.r305p-hero-mail bdi.font-mono');
    expect(mail).not.toBeNull();
    expect(mail!.textContent).toBe('amna@zu.edu.ly');
    // The verified state survives on the band (real signal — emailVerifiedAt).
    expect(screen.getByText('موثَّق')).toBeInTheDocument();

    // The completeness meter: 40 (account) + 20 (verified) + 10 (research) = 70%,
    // the % readout riding the band's own ink (.r305p-hero-meter-value), the
    // semantic progress rail (graphic, redundant with the %) still inside.
    const meter = band!.querySelector('.r305p-hero-meter');
    expect(meter).not.toBeNull();
    expect(meter!.querySelector('.r305p-hero-meter-head')!.textContent).toContain('اكتمال الملف');
    expect(meter!.querySelector('.r305p-hero-meter-value')!.textContent).toBe('70%');
    expect(meter!.querySelector('.progress')).not.toBeNull();
  });

  it('the unverified email keeps the honest amber badge on the band', () => {
    useAuthStore.setState({ user: STUDENT });
    mocks.profile = {};
    renderPage(<ProfilePage />);
    expect(screen.getByText('البريد غير موثَّق')).toBeInTheDocument();
  });
});

/* ── 2 · GamificationPage — the deep level band + kicker sections ── */

describe('R305 gamification — the level statement is the ONE deep band', () => {
  it('the tier orb + eyebrow live inside the deep band; achievements/leaderboard demote to kicker sections', () => {
    mocks.trainingMe = {
      points: 320,
      level: { level: 4, tier: 'BRONZE', toNext: 80, pctIntoLevel: 40 },
      badgeCount: 2,
      certificateCount: 1,
      tracksEnrolled: 1,
      tracksCompleted: 0,
      recentBadges: [],
    };
    const { container } = renderPage(<GamificationPage />);

    const band = container.querySelector('.r305s-band--deep');
    expect(band).not.toBeNull();
    expect(container.querySelectorAll('.r305s-band--deep')).toHaveLength(1);
    // The level anatomy rides the band's own register (r305g-level).
    const level = band!.querySelector('.r305g-level');
    expect(level).not.toBeNull();
    expect(level!.querySelector('.tier-orb')).not.toBeNull();
    expect(level!.querySelector('.r305s-eyebrow')!.textContent).toBe('مستوى التقدّم');
    // The band holds NO stat strip — the KPI line stays on the page surface.
    expect(band!.querySelector('.stat-strip')).toBeNull();

    // The two lists demote from boxed cards to kicker-headed sections.
    // (N4 re-pin: the kicker titles ride h2 — h1 → h2 sections, no level skip.)
    const kickerTitles = Array.from(container.querySelectorAll('h2.r305s-kicker-title')).map((h) => h.textContent);
    expect(kickerTitles).toEqual(['الإنجازات المحققة', 'لوحة المتصدرين']);
  });

  it('the empty-training state is honest inside the same band (no fabricated tier)', () => {
    const { container } = renderPage(<GamificationPage />);
    const level = container.querySelector('.r305s-band--deep .r305g-level');
    expect(level!.textContent).toContain('لم يبدأ مسار التطوير الذاتي بعد');
  });

  it('the gold discipline: the sheet never consumes var(--gold); UniversityInfo membership rows lost the gold badge', () => {
    const sheet = stripComments(read('src/styles/r305-student-supplemental.css'));
    expect(sheet).not.toContain('var(--gold)');
    expect(sheet).not.toContain('r305s-chip--gold');
    // The institutional classifications are NOT achievements — neutral chips.
    const more = stripJsx(read('src/pages/student/MorePages.tsx'));
    const universitySrc = more.slice(more.indexOf('function UniversityInfoPage'));
    expect(universitySrc).not.toContain('color="gold"');
  });
});

/* ── 3 · AchievementsPage — the gold register rides the deep strip ── */

describe('R305 achievements — the KPI strip wears the deep register around the shared StatStrip', () => {
  it('the strip wrapper carries .r305a-strip and the stat cells keep their real sources', () => {
    mocks.trainingMe = {
      points: 320,
      level: { level: 4, tier: 'BRONZE', toNext: 80, pctIntoLevel: 40 },
      badgeCount: 2,
      certificateCount: 1,
      tracksEnrolled: 1,
      tracksCompleted: 0,
      recentBadges: [],
    };
    const { container } = renderPage(<AchievementsPage />);

    const strip = container.querySelector('.r305a-strip');
    expect(strip).not.toBeNull();
    // The shared StatStrip anatomy is intact inside it (components.css owns it;
    // the family sheet only re-inks label/value/trend onto the deep ground).
    const statStrip = strip!.querySelector('.stat-strip');
    expect(statStrip).not.toBeNull();
    expect(statStrip!.getAttribute('aria-label')).toBe('ملخّص نقاطك');
    const labels = Array.from(statStrip!.querySelectorAll('.stat-label')).map((l) => l.textContent);
    expect(labels).toEqual(['مجموع النقاط', 'الأوسمة المحقّقة', 'الشهادات']);
    expect(statStrip!.querySelectorAll('.stat-value')).toHaveLength(3);
    // Gold stays OFF the strip's type — the values are band-neutral ink
    // (no gold chip/tone is mounted anywhere in the strip).
    expect(strip!.querySelectorAll('.r305s-chip--gold, [style*="--gold"]')).toHaveLength(0);
  });

  it('the pending/error/empty states stay honest (no strip without data)', () => {
    const { container } = renderPage(<AchievementsPage />);
    // me = null → the strip renders nothing (no fabricated zeros).
    expect(container.querySelector('.r305a-strip')).toBeNull();
    // The badges tab keeps its honest empty state.
    expect(screen.getByText('لا توجد أوسمة بعد')).toBeInTheDocument();
  });
});

/* ── 4 · AlertsPage — the ROLE-NEUTRAL de-boxed register ─────────── */

function notifFixture(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'n1',
    type: 'ACADEMIC',
    title: 'محاضرة غداً في القاعة B2',
    body: 'تذكير بمحاضرة الشبكات.',
    readAt: null,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    ...over,
  };
}

describe('R305 alerts — the notification list de-boxes onto the page surface (role-neutral)', () => {
  beforeEach(() => {
    mocks.feed.data = {
      pages: [
        {
          data: [notifFixture(), notifFixture({ id: 'n2', type: 'SYSTEM', title: 'تحديث نظام الصلاحيات', readAt: new Date().toISOString() })],
          meta: { page: 1, limit: 30, total: 2, totalPages: 1, unread: 1 },
        },
      ],
    };
  });

  it('rows live in the .r305p-alerts section under the shared kicker — no Card box around them', () => {
    const { container } = renderPage(<AlertsPage />);

    const section = container.querySelector('section.r305p-alerts');
    expect(section).not.toBeNull();
    expect(section!.getAttribute('aria-label')).toBe('سجل الإشعارات');
    // The kicker classifies the block (h2 «آخر الإشعارات»).
    expect(section!.querySelector('.r305s-kicker h2.r305s-kicker-title')!.textContent).toBe('آخر الإشعارات');
    // The hairline rows sit DIRECTLY on the page surface — the np-row's
    // ancestors contain no .card box any more.
    const row = section!.querySelector('.np-row');
    expect(row).not.toBeNull();
    expect(row!.closest('.card')).toBeNull();
    // Read/unread semantics untouched (the older suites' contract).
    expect(section!.querySelectorAll('.np-row.unread')).toHaveLength(1);
    expect(section!.querySelectorAll('.np-row')).toHaveLength(2);
  });

  it('the markup is role-neutral: the component takes no props and the section is static', () => {
    const src = stripJsx(read('src/pages/student/MorePages.tsx'));
    const alertsSrc = src.slice(src.indexOf('export function AlertsPage()'), src.indexOf('function ArVrPage'));
    // No props parameter — the SAME component serves /student/alerts,
    // /admin/alerts, /teacher/alerts, /quality/notifications,
    // /owner/notifications; nothing below branches on the caller.
    expect(alertsSrc).toMatch(/export function AlertsPage\(\)/);
    // The de-boxed section is the only np-list home in the component.
    expect(alertsSrc.match(/r305p-alerts/g)?.length).toBe(1);
    // The sheet's one scope fix: the old negative start margin dies
    // inside the section so the rows meet the kicker.
    expect(read('src/styles/r305-student-supplemental.css'))
      .toContain('.r305p-alerts .np-list { margin-block-start: 0; }');
  });
});

/* ── 5 · LabsPage — the kicker-headed catalog section ────────────── */

describe('R305 labs — the catalog is ONE editorial section with honest states', () => {
  it('the kicker heading wraps loading/error/empty/resolved; resolved rows ride the meta-row register', () => {
    mocks.labs = [
      lab({ id: 'lab1', name: 'معمل الشبكات', category: 'net', totalExperiments: 3 }),
      lab({ id: 'lab2', name: 'معمل الأحياء', category: 'bio', platform: null, totalExperiments: 5 }),
    ];
    const { container } = renderPage(<LabsPage />);

    // The section exists with the kicker h2 (a real heading, not a card title).
    const section = container.querySelector('section[aria-label="دليل المعامل"]');
    expect(section).not.toBeNull();
    expect(section!.querySelector('.r305s-kicker h2.r305s-kicker-title')!.textContent).toBe('دليل المعامل');

    // Card metadata: platform + counted noun ride .r305s-meta-row with the
    // technical separator — the D17-2 counted plural (3 → تجارب), never a
    // bare numeral + fixed noun.
    const metaRows = section!.querySelectorAll('.thumb-card-body .r305s-meta-row');
    expect(metaRows).toHaveLength(2);
    expect(metaRows[0]!.querySelectorAll('.r305s-meta-sep')).toHaveLength(1);
    expect(metaRows[0]!.querySelector('bdi')!.textContent).toBe('Cisco Packet Tracer');
    expect(metaRows[0]!.textContent).toContain('3 تجارب');
    // The honest dash for a null platform survives the register swap.
    expect(metaRows[1]!.querySelector('bdi')!.textContent).toBe('—');

    // ONE emphasized action per card: the scripted lab runs (primary),
    // the unscripted one is an honest disabled «قريباً».
    const primaryBtns = screen.getAllByRole('button', { name: 'ابدأ تجربة' });
    expect(primaryBtns).toHaveLength(1);
    const soon = screen.getByRole('button', { name: 'قريباً' });
    expect(soon).toBeDisabled();
  });

  it('the empty state stays inside the same section — no honest state escapes the kicker', () => {
    const { container } = renderPage(<LabsPage />);
    // With the hooks resolving to an empty catalog, the honest empty state
    // shows INSIDE the section (the pending/error branches share its shape:
    // the skeleton mirrors the resolved grid, the error/empty are Cards in
    // the same slot — nothing renders outside the kicker's region).
    const section = container.querySelector('section[aria-label="دليل المعامل"]');
    expect(section).not.toBeNull();
    expect(screen.getByText('لا معامل متاحة')).toBeInTheDocument();
  });

  it('the runner’s session status rides the shared chip register; the page imports both sheets', () => {
    const src = stripJsx(read('src/pages/student/LabsPage.tsx'));
    // The hero status chip (semantic success dot + neutral well).
    expect(src).toContain('r305s-chip r305s-chip--success');
    expect(src).toContain('جلسة نشطة');
    // The old Badge grammar is gone from the page.
    expect(src).not.toMatch(/\bBadge\b/);
    // Import contract: foundation + family sheets, in order.
    expect(src.indexOf("import '../../styles/r305-student.css';")).toBeGreaterThan(-1);
    expect(src.indexOf("import '../../styles/r305-student-supplemental.css';"))
      .toBeGreaterThan(src.indexOf("import '../../styles/r305-student.css';"));
  });
});

/* ── 6 · MessagesPage — the thin shell + the shared inbox ────────── */

describe('R305 messages — the shell rides the pinned shared inbox', () => {
  it('the honest empty state serves /student/messages (no fabricated rows)', () => {
    useAuthStore.setState({ user: STUDENT });
    renderPage(<StudentMessagesPage />);

    expect(screen.getByText('لا توجد رسائل بعد')).toBeInTheDocument();
    expect(screen.getByText('لا رسائل')).toBeInTheDocument();
    // No pager for an empty box.
    expect(screen.queryByText(/الصفحة/)).toBeNull();
  });

  it('the page imports the foundation + family sheets and touches no inbox markup', () => {
    const src = read('src/pages/student/MessagesPage.tsx');
    expect(src).toContain("import '../../styles/r305-student.css';");
    expect(src).toContain("import '../../styles/r305-student-supplemental.css';");
    // The page stays a thin shell — title, subtitle, compose discovery.
    expect(src).toContain('title="الرسائل"');
    expect(src).toContain('renderCompose=');
    // No wrapper markup forks the teacher/student inbox anatomy.
    expect(src).not.toContain('className=');
  });
});

/* ── 7 · Family-sheet discipline ─────────────────────────────────── */

describe('R305 supplemental — the family sheet obeys the gate contract', () => {
  const sheet = read('src/styles/r305-student-supplemental.css');

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

  it('guards its :hover behind (hover:hover) and (pointer:fine) and keeps the reduced-motion belt', () => {
    const body = stripComments(sheet);
    const hoverTotal = body.match(/:hover/g)?.length ?? 0;
    expect(hoverTotal).toBeGreaterThan(0);
    const mediaMatch = body.match(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n  \}/);
    expect(mediaMatch).not.toBeNull();
    const guarded = mediaMatch![0].match(/:hover/g)?.length ?? 0;
    expect(guarded).toBe(hoverTotal);
    expect(body).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('all eleven touched pages import the foundation + family sheets', () => {
    const pages = [
      'CampusMapPage', 'JobsPage', 'LivePage', 'MoocPage', 'MorePages',
      'PaymentPage', 'ProfilePage', 'TrainingPages', 'WebinarsPage',
      'MessagesPage', 'LabsPage',
    ];
    for (const file of pages) {
      const src = read(`src/pages/student/${file}.tsx`);
      expect(src, file).toContain("import '../../styles/r305-student.css';");
      expect(src, file).toContain("import '../../styles/r305-student-supplemental.css';");
    }
  });

  it('MorePages carries the documented r305-c+d import block (the merge-conflict protocol region)', () => {
    const src = read('src/pages/student/MorePages.tsx');
    // R305-FINAL integrator note (handoff N1): the duplicated
    // r305-student.css import from the two agent blocks was collapsed
    // into one labeled region — the three family sheets remain imported
    // in the pinned order, above the components.
    expect(src).toContain(
      '/* ── r305-c (schedule family) + r305-d (supplemental family) imports —',
    );
    expect(src).toMatch(
      /\/\* ── r305-c \(schedule family\) \+ r305-d \(supplemental family\) imports —[\s\S]*?── \*\/\nimport '\.\.\/\.\.\/styles\/r305-student\.css';\nimport '\.\.\/\.\.\/styles\/r305-student-schedule\.css';\nimport '\.\.\/\.\.\/styles\/r305-student-supplemental\.css';/,
    );
  });
});
