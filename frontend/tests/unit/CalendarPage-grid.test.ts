/**
 * r164-c — the student calendar's pure math (frontend/src/lib/calendar.ts).
 *
 * DB-free / render-free pins, mirroring the agenda chronology suite's
 * style (DashboardPage-agenda.test.ts):
 *  · tripoliDayKey / tripoliTime / tripoliToday — the FRONTEND mirror
 *    of backend/src/lib/dates.ts: the same instants the backend suite
 *    (tests/modules/dates.test.ts) pins, so the two implementations
 *    cannot drift apart (the normalize-mirror contract).
 *  · monthGrid — the 42-cell Sunday-first grid: leading spillover,
 *    month lengths, leap February, consecutive unique keys.
 *  · monthTitleAr / civilKeyOf / civilDayParts — the label + key
 *    round-trip, including the impossible-date guard.
 *  · classEventsFromSchedule / datedEvents / examEvents / eventsByDay —
 *    the four wire sources folded onto audience-calendar day buckets,
 *    with the deterministic in-day sort.
 */
import { describe, expect, it } from 'vitest';
import {
  tripoliDayKey,
  tripoliTime,
  tripoliToday,
  civilKeyOf,
  civilDayParts,
  monthGrid,
  monthTitleAr,
  classEventsFromSchedule,
  datedEvents,
  examEvents,
  eventsByDay,
} from '../../src/lib/calendar';

describe('tripoliDayKey — the audience-calendar mirror (backend dates.test.ts parity)', () => {
  it('maps the same instants the backend suite pins (UTC+2, no DST)', () => {
    // 22:30Z is already the next civil day in Tripoli (00:30).
    expect(tripoliDayKey('2026-09-25T22:30:00Z')).toBe('2026-09-26');
    expect(tripoliDayKey('2026-09-25T10:00:00Z')).toBe('2026-09-25');
    // 21:59:59Z = 23:59:59 Tripoli — the LAST instant of the civil day.
    expect(tripoliDayKey('2026-09-25T21:59:59Z')).toBe('2026-09-25');
  });

  it('accepts Date inputs and throws TypeError on garbage, like the backend copy', () => {
    expect(tripoliDayKey(new Date('2026-09-25T10:00:00Z'))).toBe('2026-09-25');
    expect(() => tripoliDayKey('garbage')).toThrow(TypeError);
    expect(() => tripoliDayKey(new Date('invalid'))).toThrow(TypeError);
  });
});

describe('tripoliTime / tripoliToday / civilKeyOf', () => {
  it('renders the Tripoli wall clock (24h, Latin digits — bdi-wrapped upstream)', () => {
    expect(tripoliTime('2026-01-15T23:30:00Z')).toBe('01:30');
    expect(tripoliTime('2026-01-15T10:05:00Z')).toBe('12:05');
  });

  it('tripoliToday reads the LIBYAN day, not the device day', () => {
    // 23:30Z on Jan 15 → Jan 16 in Tripoli.
    expect(tripoliToday(new Date('2026-01-15T23:30:00Z'))).toEqual({ year: 2026, month: 0, day: 16 });
    expect(tripoliToday(new Date('2026-01-15T10:00:00Z'))).toEqual({ year: 2026, month: 0, day: 15 });
  });

  it('civilKeyOf is the monthGrid key format (round-trips through civilDayParts)', () => {
    const key = civilKeyOf({ year: 2026, month: 0, day: 9 });
    expect(key).toBe('2026-01-09');
    expect(civilDayParts(key)).toEqual({ year: 2026, month: 0, day: 9 });
  });

  it('civilDayParts rejects malformed and impossible dates', () => {
    expect(civilDayParts('2026-02-31')).toBeNull(); // Feb 31 → Mar 3
    expect(civilDayParts('2026-13-01')).toBeNull();
    expect(civilDayParts('not-a-key')).toBeNull();
    expect(civilDayParts('2026-1-9')).toBeNull(); // must be zero-padded
  });
});

describe('monthGrid — the 42-cell Sunday-first grid', () => {
  it('always renders 42 unique consecutive keys starting on a Sunday', () => {
    for (const [year, month] of [[2026, 0], [2026, 1], [2024, 1], [2026, 11], [2025, 7]] as const) {
      const cells = monthGrid(year, month);
      expect(cells).toHaveLength(42);
      expect(new Set(cells.map((c) => c.key)).size).toBe(42);
      // Column i (0..6) is weekday i — the grid is Sunday-first by
      // construction; dow repeats 0..6 across each of the 6 rows.
      expect(cells.map((c) => c.dow)).toEqual([...Array(6).keys()].flatMap(() => [0, 1, 2, 3, 4, 5, 6]));
      // Keys advance exactly one civil day per cell.
      const first = Date.parse(`${cells[0]!.key}T00:00:00Z`);
      const last = Date.parse(`${cells[41]!.key}T00:00:00Z`);
      expect(last - first).toBe(41 * 86400000);
    }
  });

  it('January 2026: Thursday the 1st → the grid starts Sun Dec 28 2025', () => {
    const cells = monthGrid(2026, 0);
    expect(cells[0]).toMatchObject({ key: '2025-12-28', dow: 0, day: 28, inMonth: false });
    expect(cells[4]).toMatchObject({ key: '2026-01-01', dow: 4, day: 1, inMonth: true });
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it('leap February 2024 carries 29 in-month days', () => {
    const cells = monthGrid(2024, 1);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(29);
    expect(cells.some((c) => c.key === '2024-02-29' && c.inMonth)).toBe(true);
  });

  it('monthTitleAr renders the ar-LY long month + Latin year', () => {
    expect(monthTitleAr(2026, 0)).toBe('يناير 2026');
    expect(monthTitleAr(2026, 11)).toBe('ديسمبر 2026');
  });
});

describe('the four event sources → audience-day buckets', () => {
  const january = monthGrid(2026, 0); // Jan 2026, 1st = Thursday

  it('classEventsFromSchedule expands weekly slots onto every matching in-month weekday', () => {
    const events = classEventsFromSchedule(
      [
        {
          offeringId: 'off1',
          courseName: 'شبكات الحاسوب',
          // dayOfWeek 3 = Wednesday (WEEKDAY_NAMES_AR / Date#getDay contract)
          slots: [{ dayOfWeek: 3, startTime: '09:00' }],
        },
      ],
      january,
    );
    // Jan 2026 Wednesdays: 7, 14, 21, 28.
    expect(events.map((e) => e.dayKey)).toEqual(['2026-01-07', '2026-01-14', '2026-01-21', '2026-01-28']);
    expect(events[0]).toMatchObject({
      kind: 'class',
      time: '09:00',
      to: '/student/courses/off1',
      title: 'شبكات الحاسوب',
    });
  });

  it('datedEvents bucket one-off instants with their Tripoli time', () => {
    const events = datedEvents(
      [{ id: 'a1', title: 'واجب: الفصل الأول', at: '2026-01-15T23:30:00Z', to: '/student/courses/off1' }],
      'assignment',
    );
    // 23:30Z is Jan 16 in Tripoli — the AUDIENCE day, not the UTC day.
    expect(events[0]).toMatchObject({
      kind: 'assignment',
      id: 'assignment-a1',
      dayKey: '2026-01-16',
      time: '01:30',
      to: '/student/courses/off1',
    });
  });

  it('examEvents emit both window edges (opens + closes) with phase tags', () => {
    const events = examEvents([
      { id: 'x1', title: 'اختبار نهائي: قواعد البيانات', openAt: '2026-01-10T06:00:00Z', closeAt: '2026-01-20T18:00:00Z' },
    ]);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ phase: 'opens', dayKey: '2026-01-10', time: '08:00', to: '/student/online-exams/x1' });
    expect(events[1]).toMatchObject({ phase: 'closes', dayKey: '2026-01-20', time: '20:00', to: '/student/online-exams/x1' });
  });

  it('exam window edges without a date contribute no event', () => {
    expect(examEvents([{ id: 'x1', title: 't', openAt: null, closeAt: null }])).toEqual([]);
    expect(examEvents([{ id: 'x2', title: 't', openAt: '2026-01-10T06:00:00Z', closeAt: null }])).toHaveLength(1);
  });

  it('eventsByDay sorts each day by wall-clock time, then id (deterministic)', () => {
    const byDay = eventsByDay([
      { kind: 'assignment', id: 'b', title: 'b', dayKey: '2026-01-15', time: '14:00', to: '/x' },
      { kind: 'class', id: 'a', title: 'a', dayKey: '2026-01-15', time: '09:00', to: '/x' },
      { kind: 'exam', id: 'c', title: 'c', dayKey: '2026-01-15', time: '09:00', to: '/x' },
      { kind: 'live', id: 'd', title: 'd', dayKey: '2026-01-16', time: '20:00', to: '/x' },
    ]);
    expect([...byDay.keys()]).toEqual(['2026-01-15', '2026-01-16']);
    expect(byDay.get('2026-01-15')!.map((e) => e.id)).toEqual(['a', 'c', 'b']); // 09:00, 09:00 (id tiebreak), 14:00
    expect(byDay.get('2026-01-16')!.map((e) => e.id)).toEqual(['d']);
  });
});
