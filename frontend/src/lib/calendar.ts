/**
 * r164-c — the student calendar's pure math (the Canvas one-view spine).
 *
 * THE AUDIENCE-CALENDAR MIRROR: backend/src/lib/dates.ts declares the
 * platform's dual-calendar model — instants are UTC (Prisma TIMESTAMP),
 * while DATE-ONLY concepts for DISPLAY anchor to Africa/Tripoli civil
 * days (Libya = UTC+2, no DST since 2013). This module is the frontend
 * mirror of `tripoliDayKey`: same `en-CA` formatting trick, same
 * `timeZone: 'Africa/Tripoli'` token — never a hardcoded +2 offset, so
 * a future DST return widens both sides together. Like the normalize
 * mirror (modules/search), the two implementations are pinned by
 * mirrored unit tests.
 *
 * Everything here is pure (dates in, plain data out) so the grid math,
 * the day bucketing and the schedule expansion are testable without a
 * server (tests/unit/CalendarPage-grid.test.ts).
 */

/** Audience timezone for calendar-day display labels (Libya) — mirrors
 *  backend/src/lib/dates.ts AUDIENCE_TZ. */
export const AUDIENCE_TZ = 'Africa/Tripoli';

const tripoliKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AUDIENCE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The 'YYYY-MM-DD' civil-day key of `input` in Africa/Tripoli — the
 * audience calendar. Use for display bucketing («اليوم», calendar
 * cells), never for stored day-keys (the data calendar is UTC — see
 * dates.ts). Throws on an unparsable input, exactly like the backend
 * copy, so a malformed wire date fails loudly instead of bucketing to
 * a wrong day.
 */
export function tripoliDayKey(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) throw new TypeError(`tripoliDayKey: invalid date ${String(input)}`);
  return tripoliKeyFormatter.format(d);
}

const tripoliTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: AUDIENCE_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** The 'HH:MM' wall-clock of an instant in Africa/Tripoli (24h, Latin
 *  digits — the platform numeric convention; the caller bdi-wraps it). */
export function tripoliTime(input: Date | string): string {
  return tripoliTimeFormatter.format(typeof input === 'string' ? new Date(input) : input);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** A civil date in the audience calendar (month is 0-based, Date-style). */
export interface CivilDate {
  year: number;
  month: number; // 0 = January … 11 = December
  day: number;
}

/** Today's civil date in Africa/Tripoli (NOT the local device day — a
 *  student in a UTC-5 browser must still see the Libyan day). */
export function tripoliToday(now: Date = new Date()): CivilDate {
  // The key is always 'YYYY-MM-DD' (en-CA numeric formatter) — the
  // split guarantees three parts; the non-null asserts mirror that.
  const [y, m, d] = tripoliDayKey(now).split('-').map(Number) as [number, number, number];
  return { year: y, month: m - 1, day: d };
}

/** The 'YYYY-MM-DD' civil-day key of a CivilDate (the monthGrid cell
 *  key format — tripoliToday + civilKeyOf = today's cell key). */
export function civilKeyOf(date: CivilDate): string {
  return `${date.year}-${pad2(date.month + 1)}-${pad2(date.day)}`;
}

// ─── Month grid ────────────────────────────────────────────────────

/** One cell of the month grid. */
export interface CalendarCell {
  /** Civil 'YYYY-MM-DD' day key — the bucket key events map onto. */
  key: string;
  /** Day-of-week, 0 = Sunday … 6 = Saturday — the WEEKDAY_NAMES_AR
   *  index and the schedule slots' `dayOfWeek` contract. */
  dow: number;
  /** Day-of-month numeral (1..31) — the grid's big number. */
  day: number;
  /** False on the leading/trailing spillover days of adjacent months. */
  inMonth: boolean;
}

/**
 * The 42-cell (6 week × 7 day) month grid, Sunday-first, starting from
 * the Sunday of the week containing the 1st. Fixed 6 rows keep the
 * layout stable across months (a 5-row month would resize the page).
 * Pure UTC date math — civil keys carry no timezone, only the bucket.
 */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const cells: CalendarCell[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 42; i++) {
    cells.push({
      key: `${cursor.getUTCFullYear()}-${pad2(cursor.getUTCMonth() + 1)}-${pad2(cursor.getUTCDate())}`,
      dow: cursor.getUTCDay(),
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === month,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
}

const monthTitleFormatter = new Intl.DateTimeFormat('ar-LY', { month: 'long', year: 'numeric' });

/** The grid header title, e.g. «يناير 2026» (ar-LY, Latin digits). */
export function monthTitleAr(year: number, month: number): string {
  // Mid-month noon UTC: no timezone math can push this into a neighbor.
  return monthTitleFormatter.format(new Date(Date.UTC(year, month, 15, 12)));
}

/** Parse a civil 'YYYY-MM-DD' key back to its parts (null when the key
 *  is malformed — callers render an honest empty state, never a crash). */
export function civilDayParts(key: string): CivilDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const sanity = new Date(Date.UTC(year, month, day));
  if (sanity.getUTCFullYear() !== year || sanity.getUTCMonth() !== month || sanity.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

// ─── Event model ───────────────────────────────────────────────────

export type CalendarEventKind = 'class' | 'assignment' | 'exam' | 'live';

export interface CalendarEvent {
  kind: CalendarEventKind;
  /** Stable react key; unique within its source list. */
  id: string;
  title: string;
  /** The audience-calendar day bucket this event lands in. */
  dayKey: string;
  /** Tripoli 'HH:MM' display time; null = no wall-clock moment. */
  time: string | null;
  /** The SPA route the event deep-links to (its source page). */
  to: string;
  /** Exam-window events only: which edge of the window this row marks. */
  phase?: 'opens' | 'closes';
}

/** Structural subset of MyEnrollment the schedule expansion reads. */
export interface ScheduleSourceInput {
  offeringId: string;
  courseName: string;
  slots: Array<{ dayOfWeek: number; startTime: string }>;
}

/**
 * Expand the weekly recurring schedule slots onto the visible grid —
 * one class event per in-month cell whose weekday matches the slot's
 * `dayOfWeek`. A month view of a weekly timetable is exactly this
 * cross product; off-month spillover cells are excluded so adjacent
 * months never double-render their own occurrences.
 */
export function classEventsFromSchedule(
  sources: readonly ScheduleSourceInput[],
  cells: readonly CalendarCell[],
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const cell of cells) {
    if (!cell.inMonth) continue;
    for (const src of sources) {
      for (const slot of src.slots) {
        if (slot.dayOfWeek !== cell.dow) continue;
        events.push({
          kind: 'class',
          id: `c-${src.offeringId}-${cell.key}`,
          title: src.courseName,
          dayKey: cell.key,
          time: slot.startTime,
          to: `/student/courses/${src.offeringId}`,
        });
      }
    }
  }
  return events;
}

/** Structural input of datedEvents — one wire row with an instant. */
export interface DatedEventInput {
  id: string;
  title: string;
  at: string; // ISO instant
  to: string;
}

/** Bucket one-off instants (assignment dueAt, live scheduledAt) into
 *  audience-calendar days with their Tripoli wall-clock time. */
export function datedEvents(
  items: readonly DatedEventInput[],
  kind: CalendarEventKind,
): CalendarEvent[] {
  return items.map((it) => ({
    kind,
    id: `${kind}-${it.id}`,
    title: it.title,
    dayKey: tripoliDayKey(it.at),
    time: tripoliTime(it.at),
    to: it.to,
  }));
}

/** Structural input of examEvents — the /exams/me row subset. */
export interface ExamEventInput {
  id: string;
  title: string;
  openAt: string | null;
  closeAt: string | null;
}

/**
 * Exam windows become up to two events each — the opening edge
 * («يفتح باب الاختبار») and the submission deadline («آخر موعد
 * للتسليم»). Both edges carry their Tripoli time; templates without a
 * window edge simply contribute no event for that edge. Attempt state
 * is deliberately NOT filtered here: the calendar is a view of facts
 * (a GRADED exam's window still happened), unlike the dashboard
 * agenda, which is a to-act-on list.
 */
export function examEvents(exams: readonly ExamEventInput[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const e of exams) {
    if (e.openAt) {
      events.push({
        kind: 'exam',
        id: `exam-open-${e.id}`,
        title: e.title,
        dayKey: tripoliDayKey(e.openAt),
        time: tripoliTime(e.openAt),
        to: `/student/online-exams/${e.id}`,
        phase: 'opens',
      });
    }
    if (e.closeAt) {
      events.push({
        kind: 'exam',
        id: `exam-close-${e.id}`,
        title: e.title,
        dayKey: tripoliDayKey(e.closeAt),
        time: tripoliTime(e.closeAt),
        to: `/student/online-exams/${e.id}`,
        phase: 'closes',
      });
    }
  }
  return events;
}

/**
 * Fold events into per-day buckets, each sorted by wall-clock time
 * (earliest first; timeless events last), then id — deterministic for
 * tests and stable across re-renders.
 */
export function eventsByDay(
  events: readonly CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const bucket = map.get(ev.dayKey);
    if (bucket) bucket.push(ev);
    else map.set(ev.dayKey, [ev]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.id.localeCompare(b.id));
  }
  return map;
}
