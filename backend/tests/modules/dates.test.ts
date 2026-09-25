/**
 * Backend unit test — the shared timezone-safe date helpers in
 * `backend/src/lib/dates.ts` (audit 15-h P1-1/P1-2, campaign 3 wave 16).
 *
 * Pins the platform timezone model:
 *   · date-only data keys are UTC calendar days (attendance @@unique lives here);
 *   · display weekday labels use the Africa/Tripoli civil day (Libya UTC+2,
 *     no DST since 2013), so 22:00–24:00 UTC (= 00:00–02:00 Libyan) already
 *     belongs to the NEXT civil day for the audience while the UTC day key
 *     has not flipped yet.
 *   · invalid input throws (guards FE-sent garbage from producing NaN keys).
 */
import { describe, expect, it } from 'vitest';
import { AUDIENCE_TZ, tripoliDayDow, tripoliDayKey, utcDayKey, utcDayStart } from '../../src/lib/dates.js';

describe('utcDayStart / utcDayKey (data calendar)', () => {
  it('normalizes an ISO date string to UTC midnight', () => {
    expect(utcDayStart('2026-09-25').toISOString()).toBe('2026-09-25T00:00:00.000Z');
    expect(utcDayKey('2026-09-25')).toBe('2026-09-25');
  });

  it('truncates an instant with a time component to its UTC day', () => {
    // 23:59 UTC on the 25th is still the 25th UTC day…
    expect(utcDayKey('2026-09-25T23:59:59.999Z')).toBe('2026-09-25');
    // …one millisecond later flips.
    expect(utcDayKey('2026-09-26T00:00:00.000Z')).toBe('2026-09-26');
  });

  it('accepts Date objects and returns the same key as the equivalent string', () => {
    expect(utcDayKey(new Date('2026-01-31T12:34:56Z'))).toBe('2026-01-31');
  });

  it('round-trips: utcDayStart → utcDayKey → utcDayStart', () => {
    const a = utcDayStart('2026-03-01T05:00:00Z');
    expect(utcDayKey(a)).toBe('2026-03-01');
    expect(utcDayStart(utcDayKey(a)).getTime()).toBe(a.getTime());
  });

  it('throws a TypeError on invalid input instead of producing NaN', () => {
    expect(() => utcDayStart('not-a-date')).toThrow(TypeError);
    expect(() => utcDayKey('')).toThrow(TypeError);
  });
});

describe('tripoliDayKey / tripoliDayDow (audience calendar)', () => {
  it('exposes the audience timezone constant', () => {
    expect(AUDIENCE_TZ).toBe('Africa/Tripoli');
  });

  it('22:30 UTC is already the next Libyan civil day (UTC+2)', () => {
    // 2026-09-25 22:30 UTC == 2026-09-26 00:30 in Tripoli.
    expect(tripoliDayKey('2026-09-25T22:30:00Z')).toBe('2026-09-26');
    // …while the UTC data key is still the 25th — the two calendars
    // legitimately disagree for 2h every night.
    expect(utcDayKey('2026-09-25T22:30:00Z')).toBe('2026-09-25');
  });

  it('before 22:00 UTC both calendars agree', () => {
    expect(tripoliDayKey('2026-09-25T10:00:00Z')).toBe('2026-09-25');
    expect(tripoliDayKey('2026-09-25T21:59:59Z')).toBe('2026-09-25');
  });

  it('returns civil weekday matching the Tripoli day, not the UTC day', () => {
    // 2026-09-26 is a Saturday. At 2026-09-25T22:30Z the UTC weekday is
    // still Friday(5), but Tripoli is already Saturday(6).
    expect(new Date('2026-09-25T22:30:00Z').getUTCDay()).toBe(5);
    expect(tripoliDayDow('2026-09-25T22:30:00Z')).toBe(6);
    // Sunday check: 2026-09-27 → 0.
    expect(tripoliDayDow('2026-09-27T09:00:00Z')).toBe(0);
  });

  it('throws a TypeError on invalid input', () => {
    expect(() => tripoliDayKey('garbage')).toThrow(TypeError);
    expect(() => tripoliDayDow(new Date('invalid'))).toThrow(TypeError);
  });
});
