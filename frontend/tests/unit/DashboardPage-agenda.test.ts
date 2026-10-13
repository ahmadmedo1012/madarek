/**
 * r158 (6A14 P2) — agenda chronology pins.
 *
 * The dashboard agenda used to concatenate its three sources BY KIND
 * (classes block, then assignments, then live), with a comment claiming
 * "sorted by recency" — a live broadcast could render below tomorrow's
 * class. The page now gives every AgendaItem a numeric whenMs and sorts
 * the merged stream ascending by it:
 *   - classes: classWhenMs() anchors today/tomorrow to the slot's own
 *     startTime (malformed time → end-of-day, never NaN)
 *   - assignments/live: safeMs() parses the ISO date (malformed →
 *     MAX_SAFE_INTEGER, sorts last)
 *
 * These five pins hold the pure contract the page's merge consumes.
 */
import { describe, expect, it } from 'vitest';
import { classWhenMs, safeMs } from '../../src/pages/student/DashboardPage';

// A fixed "now" so today/tomorrow anchoring is deterministic (local
// midnight, 10:00 — the helpers only read the DATE of `now`).
const NOW = new Date(2026, 0, 15, 10, 0, 0, 0);
const midnight = (dayOffset: number) => new Date(2026, 0, 15 + dayOffset).setHours(0, 0, 0, 0);

describe('classWhenMs — class slots', () => {
  it('PIN 1: a today slot always sorts before a tomorrow slot', () => {
    // Tomorrow starts EARLIER in the day — chronology still demands
    // today first. This is the exact lie the old kind-concatenation told.
    const todayLate = classWhenMs({ when: 'today', startTime: '22:00' }, NOW);
    const tomorrowEarly = classWhenMs({ when: 'tomorrow', startTime: '08:00' }, NOW);
    expect(todayLate).toBe(midnight(0) + 22 * 3600_000);
    expect(tomorrowEarly).toBe(midnight(1) + 8 * 3600_000);
    expect(todayLate).toBeLessThan(tomorrowEarly);
  });

  it('PIN 2: same-day slots order by their own start time', () => {
    const first = classWhenMs({ when: 'today', startTime: '09:30' }, NOW);
    const second = classWhenMs({ when: 'today', startTime: '14:15' }, NOW);
    expect(first).toBe(midnight(0) + 9 * 3600_000 + 30 * 60_000);
    expect(second).toBe(midnight(0) + 14 * 3600_000 + 15 * 60_000);
    expect(first).toBeLessThan(second);
  });

  it('PIN 3: a malformed time anchors to END-OF-DAY of the same day (never NaN)', () => {
    for (const malformed of ['', 'abc', '9', '09:70', '25:00', '09:']) {
      const t = classWhenMs({ when: 'today', startTime: malformed }, NOW);
      // End-of-day of TODAY — after every well-formed today slot…
      expect(t).toBe(midnight(0) + 23 * 3600_000 + 59 * 60_000 + 59_999);
      expect(t).toBeGreaterThan(classWhenMs({ when: 'today', startTime: '22:00' }, NOW));
      // …but still before tomorrow's earliest slot.
      expect(t).toBeLessThan(classWhenMs({ when: 'tomorrow', startTime: '00:00' }, NOW));
      expect(Number.isNaN(t)).toBe(false);
    }
  });
});

describe('safeMs — ISO dates (assignments + live)', () => {
  it('PIN 4: a malformed ISO sorts LAST (MAX_SAFE_INTEGER)', () => {
    expect(safeMs('not-a-date')).toBe(Number.MAX_SAFE_INTEGER);
    expect(safeMs('')).toBe(Number.MAX_SAFE_INTEGER);
    // No parseable ISO exceeds MAX_SAFE (Date's own ceiling is below it),
    // so a far-future valid date still sorts before a malformed one.
    const farFuture = safeMs(new Date(275000, 0, 1).toISOString());
    expect(farFuture).toBeGreaterThan(0);
    expect(farFuture).toBeLessThan(safeMs('garbage'));
    // And a valid near date reads as its own epoch millis.
    const valid = new Date(2026, 0, 15, 12, 0, 0).toISOString();
    expect(safeMs(valid)).toBe(new Date(2026, 0, 15, 12, 0, 0).getTime());
  });
});

describe('the merged agenda stream (page merge, ascending whenMs)', () => {
  it('PIN 5: mixed kinds interleave chronologically, not by kind', () => {
    // Mirrors the page's composition: classes carry classWhenMs(c),
    // assignments/live carry safeMs(iso) — then the merged array is
    // sorted ascending by whenMs (equal keys keep per-kind order).
    const day = (h: number, m = 0) => new Date(2026, 0, 15, h, m, 0, 0);
    const merged = [
      { kind: 'class', whenMs: classWhenMs({ when: 'today', startTime: '10:00' }, NOW) },
      { kind: 'class', whenMs: classWhenMs({ when: 'tomorrow', startTime: '09:00' }, NOW) },
      { kind: 'assign', whenMs: safeMs(day(12).toISOString()) },
      { kind: 'assign', whenMs: safeMs(day(23, 30).toISOString()) },
      { kind: 'live', whenMs: safeMs(day(11).toISOString()) },
    ].sort((a, b) => a.whenMs - b.whenMs);

    expect(merged.map((i) => i.kind)).toEqual([
      'class',  // today 10:00
      'live',   // today 11:00 — interleaves BETWEEN the classes/assigns
      'assign', // today 12:00
      'assign', // today 23:30
      'class',  // tomorrow 09:00 — the OLD render put every class above it
    ]);
  });
});
