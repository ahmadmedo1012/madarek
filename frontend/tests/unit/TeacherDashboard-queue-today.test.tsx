/**
 * r164-h — the teacher home's daily-work trio.
 *
 * 1. Pending-grading queue card — the dashboard aggregate's new
 *    `pendingGrading` rollup renders per-assignment counts with direct
 *    links into the ONE surface that walks the full grading queue
 *    (/teacher/assignments); the empty state names the win, not the
 *    void: «لا انتظار — كل التسليمات مُقيَّمة».
 * 2. Today strip — todaySlots()/slotPhase() compose the client-side
 *    today strip from /me/offerings' schedule (dayOfWeek 0=Sunday, the
 *    Date#getDay() convention), sorted by start time; the card links
 *    into /teacher/schedule.
 * 3. At-risk shortcuts — topRisks() caps the worst-first /teacher/risks
 *    rows at 3; each row is ONE tap from the offering's intelligence
 *    deep dive (/teacher/intelligence/:offeringId).
 *
 * Pure-function + render pins, mirroring TeacherDashboard-trend.test.ts
 * (jsdom has no canvas — the chart component is stubbed; the trend
 * fixture stays below the 2-point drawability floor so the stub never
 * even mounts).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  TeacherDashboardPage,
  todaySlots,
  slotPhase,
  topRisks,
  AT_RISK_SHORTCUT_TAKE,
  type TodaySlot,
} from '../../src/pages/teacher/TeacherDashboardPage';
import type { TeacherOffering, TeacherRiskRow } from '../../src/hooks/useResources';

// jsdom has no canvas — stub the chart component (see header note).
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
}));

const mocks = vi.hoisted(() => ({
  dashboard: {
    data: null as unknown,
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  offerings: [] as unknown[],
  risks: {
    data: null as unknown,
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useTeacherDashboard: () => mocks.dashboard,
  useTeacherOfferings: () => ({
    data: mocks.offerings,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useTeacherRisks: () => mocks.risks,
}));

const offering = (schedule: TeacherOffering['schedule'], id = 'off1', name = 'هندسة البرمجيات'): TeacherOffering => ({
  id,
  term: '2026-1',
  room: 'قاعة 12',
  capacity: 40,
  course: { id: 'c1', code: 'SE101', name, iconEmoji: null, themeColor: null, credits: 3 },
  _count: { enrollments: 2, assignments: 1, lectures: 4, examTemplates: 0 },
  schedule,
});

const slot = (id: string, dayOfWeek: number, startTime: string, endTime: string, room: string | null) => ({
  id, dayOfWeek, startTime, endTime, room,
});

const DASH = (pendingGrading: unknown[], needsReview = 0) => ({
  kpi: { studentCount: 2, avgGradePct: null, attendancePct: null, needsReview },
  pendingGrading,
  // All-null trend → below the 2-point floor → the empty-state branch,
  // no canvas (the stub stays unmounted).
  trend: [{ week: 'أسبوع 1', avgGradePct: null, attendancePct: null }],
  feed: [],
});

const QUEUE_ENTRY = (overrides?: Record<string, unknown>) => ({
  assignmentId: 'a1',
  title: 'واجب UML',
  type: 'HOMEWORK',
  course: { code: 'SE101', name: 'هندسة البرمجيات' },
  count: 2,
  oldestSubmittedAt: '2026-03-01T08:00:00Z',
  actionTo: '/teacher/assignments',
  ...overrides,
});

const riskRow = (studentId: string, offeringId: string, level: TeacherRiskRow['riskLevel'], score: number): TeacherRiskRow => ({
  studentId,
  name: `طالب ${studentId}`,
  avatarInitials: null,
  avatarColor: null,
  offeringId,
  courseName: 'هندسة البرمجيات',
  courseIcon: null,
  courseColor: null,
  riskScore: score,
  riskLevel: level,
  signals: [],
  suggestion: '',
});

const renderDashboard = () => render(
  <MemoryRouter><TeacherDashboardPage /></MemoryRouter>,
);

beforeEach(() => {
  mocks.dashboard = { data: null, isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.offerings = [];
  mocks.risks = { data: null, isPending: false, isError: false, error: null, refetch: vi.fn() };
});

/* ── Pure decisions ─────────────────────────────────────────── */

describe('todaySlots — the today strip composition', () => {
  // 2026-03-04 is a Wednesday (getDay() === 3).
  const NOW = new Date(2026, 2, 4, 10, 0);

  it('keeps only today\'s dayOfWeek, across offerings, sorted by start time', () => {
    const slots = todaySlots([
      offering([
        slot('s2', 3, '11:00', '12:30', 'قاعة ب'),
        slot('s1', 3, '08:00', '09:30', 'قاعة أ'),
        slot('s3', 2, '07:00', '08:30', 'قاعة أمس'),
      ]),
      offering([slot('x1', 4, '09:00', '10:30', null)], 'off2', 'قواعد البيانات'),
    ], NOW);
    expect(slots.map((s) => s.key)).toEqual(['off1:s1', 'off1:s2']);
    expect(slots[0]).toMatchObject({
      courseName: 'هندسة البرمجيات',
      courseCode: 'SE101',
      startTime: '08:00',
      endTime: '09:30',
      room: 'قاعة أ',
    });
  });

  it('falls back to the offering\'s room when the slot carries none (the weekly page\'s rule)', () => {
    const slots = todaySlots([offering([slot('s1', 3, '08:00', '09:30', null)])], NOW);
    expect(slots[0]!.room).toBe('قاعة 12');
  });

  it('an empty schedule (or a weekday with nothing) yields the honest empty strip', () => {
    expect(todaySlots([offering([])], NOW)).toEqual([]);
  });

  it('malformed times degrade to 0 minutes — never a NaN sort', () => {
    const slots = todaySlots([offering([slot('bad', 3, 'oops', 'x', null), slot('ok', 3, '08:00', '09:00', null)])], NOW);
    // 'oops' → 0 minutes sorts first; the strip still renders both.
    expect(slots.map((s) => s.startTime)).toEqual(['oops', '08:00']);
  });
});

describe('slotPhase — the strip\'s now markers', () => {
  const s: TodaySlot = {
    key: 'k', offeringId: 'off1', courseName: 'ك', courseCode: 'C1',
    room: null, startTime: '09:00', endTime: '10:30',
  };

  it('inside the window → ongoing', () => {
    expect(slotPhase(s, new Date(2026, 2, 4, 10, 0))).toBe('ongoing');
  });

  it('the exact start minute is ongoing; the exact end minute is done (inclusive edges)', () => {
    expect(slotPhase(s, new Date(2026, 2, 4, 9, 0))).toBe('ongoing');
    expect(slotPhase(s, new Date(2026, 2, 4, 10, 30))).toBe('done');
  });

  it('before the window → upcoming; after → done', () => {
    expect(slotPhase(s, new Date(2026, 2, 4, 8, 59))).toBe('upcoming');
    expect(slotPhase(s, new Date(2026, 2, 4, 10, 31))).toBe('done');
  });
});

describe('topRisks — the at-risk shortcut cap', () => {
  it('takes exactly AT_RISK_SHORTCUT_TAKE worst-first rows (the endpoint already sorts)', () => {
    const rows = [1, 2, 3, 4, 5].map((i) => riskRow(`s${i}`, 'off1', 'AT_RISK', 60 - i));
    expect(topRisks(rows)).toHaveLength(AT_RISK_SHORTCUT_TAKE);
    expect(topRisks(rows).map((r) => r.studentId)).toEqual(['s1', 's2', 's3']);
  });

  it('fewer rows than the cap pass through untouched (never padded, never null)', () => {
    const rows = [riskRow('s1', 'off1', 'CRITICAL', 10)];
    expect(topRisks(rows)).toEqual(rows);
    expect(topRisks([])).toEqual([]);
  });
});

/* ── Render pins ────────────────────────────────────────────── */

describe('TeacherDashboardPage — the daily-work trio (r164-h)', () => {
  it('renders the pending-grading queue: per-assignment counts + direct links into /teacher/assignments', () => {
    const todayDow = new Date().getDay();
    mocks.dashboard.data = DASH([
      QUEUE_ENTRY(),
      QUEUE_ENTRY({ assignmentId: 'a2', title: 'مشروع الفصل', type: 'PROJECT', count: 1, oldestSubmittedAt: null }),
    ]);
    mocks.offerings = [offering([slot('s1', todayDow, '08:00', '09:30', 'قاعة 12')])];
    mocks.risks.data = [riskRow('s1', 'off1', 'AT_RISK', 55)];

    renderDashboard();

    // The queue card + its entries.
    expect(screen.getByText('طابور التصحيح')).toBeInTheDocument();
    expect(screen.getByText('واجب UML')).toBeInTheDocument();
    expect(screen.getByText('مشروع الفصل')).toBeInTheDocument();
    // 2 entry rows + the section's «ابدأ التصحيح» CTA land on the
    // ONE surface that walks the full grading queue. r242 adds a 4th:
    // the StatLine's «بحاجة تقييم» stat links into the same queue
    expect(document.querySelectorAll('a[href="/teacher/assignments"]')).toHaveLength(4);
  });

  it('empty queue → the win, not the void: «لا انتظار — كل التسليمات مُقيَّمة»', () => {
    mocks.dashboard.data = DASH([]);
    mocks.offerings = [offering([])];
    mocks.risks.data = [];

    renderDashboard();

    expect(screen.getByText('لا انتظار — كل التسليمات مُقيَّمة')).toBeInTheDocument();
  });

  it('renders the today strip from the schedule — today\'s slot only, linking into /teacher/schedule', () => {
    const todayDow = new Date().getDay();
    mocks.dashboard.data = DASH([]);
    mocks.offerings = [offering([
      slot('today', todayDow, '08:00', '09:30', 'قاعة 12'),
      slot('tomorrow', (todayDow + 1) % 7, '14:00', '15:30', 'قاعة أخرى'),
    ])];
    mocks.risks.data = [];

    renderDashboard();

    expect(screen.getByText('محاضرات اليوم')).toBeInTheDocument();
    // The today slot's time range rides the row (bdi).
    expect(screen.getByText('08:00 — 09:30')).toBeInTheDocument();
    // A slot on another weekday never leaks into today's strip.
    expect(screen.queryByText('14:00 — 15:30')).toBeNull();
    // The slot row + the «الجدول الأسبوعيّ» action both link to the
    // weekly schedule page.
    expect(document.querySelectorAll('a[href="/teacher/schedule"]')).toHaveLength(2);
  });

  it('no slots today → the honest empty strip', () => {
    const todayDow = new Date().getDay();
    mocks.dashboard.data = DASH([]);
    mocks.offerings = [offering([slot('other-day', (todayDow + 2) % 7, '08:00', '09:30', null)])];
    mocks.risks.data = [];

    renderDashboard();

    expect(screen.getByText('لا محاضرات اليوم')).toBeInTheDocument();
  });

  it('renders at-risk shortcuts: top 3 rows, each ONE tap from the intelligence deep dive', () => {
    mocks.dashboard.data = DASH([]);
    mocks.offerings = [offering([])];
    mocks.risks.data = [
      riskRow('s1', 'off1', 'CRITICAL', 20),
      riskRow('s2', 'off2', 'AT_RISK', 40),
      riskRow('s3', 'off1', 'AT_RISK', 50),
      riskRow('s4', 'off3', 'WATCH', 70),
    ];

    renderDashboard();

    // Exactly the worst three — the fourth never renders.
    expect(document.querySelectorAll('a[href="/teacher/intelligence/off1"]')).toHaveLength(2);
    expect(document.querySelectorAll('a[href="/teacher/intelligence/off2"]')).toHaveLength(1);
    expect(screen.queryByText('طالب s4')).toBeNull();
    // The card's own CTA reaches the full list (not deep-linked).
    expect(document.querySelector('a[href="/teacher/intelligence"]')).not.toBeNull();
    // The worst row wears its level chip (the shared vocabulary).
    expect(screen.getByText('حرج')).toBeInTheDocument();
  });

  it('no at-risk students → «جميع طلابك في وضع جيد»', () => {
    mocks.dashboard.data = DASH([]);
    mocks.offerings = [offering([])];
    mocks.risks.data = [];

    renderDashboard();

    expect(screen.getByText('جميع طلابك في وضع جيد')).toBeInTheDocument();
  });
});
