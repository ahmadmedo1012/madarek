/**
 * Shared timezone-safe date helpers — the single source of truth for
 * calendar-day concepts (audit 15-h P1-1/P1-2, campaign 3 wave 16).
 *
 * THE PLATFORM'S TIMEZONE MODEL (documented here once, enforced by helpers):
 *
 * · The server runs with `TZ=UTC` (declared in render.yaml). Instants are
 *   always UTC; Prisma stores TIMESTAMP(3) UTC instants.
 * · DATE-ONLY concepts — attendance roll-call days, agenda weekday labels,
 *   month buckets — are anchored to one of two calendars:
 *     - the *data* calendar: UTC days (attendance day-keys must be stable
 *       regardless of who computes them — FE sends `utcDayKey` dates,
 *       auto-attendance buckets `utcDayKey(now)`, seed writes
 *       `utcDayKey(...)`; the `@@unique(offeringId, date)` constraint
 *       lives on this calendar);
 *     - the *audience* calendar: Africa/Tripoli civil days (Libya = UTC+2,
 *       no DST since 2013) — used ONLY for display labels («اليوم»,
 *       «غداً») so a Libyan student's dashboard never disagrees with
 *       their wall clock.
 * · Use `timeZone: 'Africa/Tripoli'` (not a hardcoded +2 offset) so a
 *   future DST return widens nothing silently.
 */

/** Audience timezone for calendar-day display labels (Libya). */
export const AUDIENCE_TZ = 'Africa/Tripoli';

/**
 * The UTC-midnight instant of the calendar day (UTC) containing `input`.
 * Accepts a Date or an ISO string; `new Date('2026-09-25')` already
 * parses to UTC midnight, so this both normalizes and validates.
 */
export function utcDayStart(input: Date | string): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) throw new TypeError(`utcDayStart: invalid date ${String(input)}`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** The 'YYYY-MM-DD' UTC calendar-day key of `input` (attendance day-key). */
export function utcDayKey(input: Date | string): string {
  return utcDayStart(input).toISOString().slice(0, 10);
}

const tripoliKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AUDIENCE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The 'YYYY-MM-DD' civil-day key of `input` in Africa/Tripoli — the
 * audience calendar. Use for display labels («اليوم/غداً»), never for
 * stored day-keys.
 */
export function tripoliDayKey(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) throw new TypeError(`tripoliDayKey: invalid date ${String(input)}`);
  return tripoliKeyFormatter.format(d);
}

/**
 * Weekday (0=Sunday … 6=Saturday) of the Africa/Tripoli civil day
 * containing `input`. Mirrors `Date#getDay` semantics so agenda code can
 * drop it in as `tripoliDayDow(now)` wherever it used `now.getDay()`.
 */
export function tripoliDayDow(input: Date | string): number {
  const key = tripoliDayKey(input);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  // Constructed in UTC from civil date parts — getDay is then the civil weekday.
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
