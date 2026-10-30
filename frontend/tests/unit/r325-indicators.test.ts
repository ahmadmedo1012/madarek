/**
 * R325 P2.5 — the indicator language's PURE MATH pins.
 *
 * The seven instruments (components/patterns/indicators.tsx) keep every
 * quantization/normalization exported as pure functions so the
 * arithmetic is pinned WITHOUT rendering — the same discipline the
 * r319 semester ruler set with `semesterWeeks`. These pins hold the
 * honest-edges contract: junk never becomes a fake reading.
 */
import { describe, expect, it } from 'vitest';
import {
  clampPct,
  masteryLevel,
  watchState,
  segmentsFromCounts,
  attendanceMark,
  gradeBands,
  groupSlotsByDay,
  type SegmentState,
} from '../../src/components/patterns/indicators';

describe('r325 indicators — clampPct', () => {
  it('clamps into [0,100] and reads junk as 0 (the honest empty ruler)', () => {
    expect(clampPct(0)).toBe(0);
    expect(clampPct(42)).toBe(42);
    expect(clampPct(87.5)).toBe(87.5);
    expect(clampPct(-3)).toBe(0);
    expect(clampPct(150)).toBe(100);
    expect(clampPct(Number.NaN)).toBe(0);
    expect(clampPct(Number.POSITIVE_INFINITY)).toBe(100);
    expect(clampPct(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('r325 indicators — masteryLevel (0–1 fraction → 0–4 cells)', () => {
  it('quantizes round-half-up, clamped', () => {
    expect(masteryLevel(0)).toBe(0);
    expect(masteryLevel(0.1)).toBe(0); // 0.4 → 0
    expect(masteryLevel(0.125)).toBe(1); // 0.5 rounds up
    expect(masteryLevel(0.35)).toBe(1); // the gaps fixture's own datum
    expect(masteryLevel(0.52)).toBe(2);
    expect(masteryLevel(0.7)).toBe(3);
    expect(masteryLevel(0.8)).toBe(3);
    expect(masteryLevel(0.875)).toBe(4); // 3.5 rounds up — full mastery
    expect(masteryLevel(1)).toBe(4);
  });

  it('clamps out-of-range fractions and reads junk as untouched', () => {
    expect(masteryLevel(-0.2)).toBe(0);
    expect(masteryLevel(1.4)).toBe(4);
    expect(masteryLevel(Number.NaN)).toBe(0);
    expect(masteryLevel(Number.POSITIVE_INFINITY)).toBe(4);
  });
});

describe('r325 indicators — watchState (a lecture as a segment)', () => {
  it('completed wins over any watched count', () => {
    expect(watchState(0, 600, true)).toBe('full');
    expect(watchState(10, 600, true)).toBe('full');
  });

  it('begun-but-not-finished reads partial; untouched reads empty', () => {
    expect(watchState(120, 600)).toBe('partial');
    expect(watchState(599, 600)).toBe('partial');
    expect(watchState(0, 600)).toBe('empty');
    expect(watchState(-5, 600)).toBe('empty');
  });

  it('reaching the total reads full even without the completion flag', () => {
    expect(watchState(600, 600)).toBe('full');
    expect(watchState(900, 600)).toBe('full');
  });

  it('junk totals with any watched seconds stay partial (never a fake full)', () => {
    expect(watchState(120, Number.NaN)).toBe('partial');
    expect(watchState(120, 0)).toBe('partial');
    expect(watchState(0, Number.NaN)).toBe('empty');
  });
});

describe('r325 indicators — segmentsFromCounts', () => {
  it('orders the run full → partial → empty', () => {
    expect(segmentsFromCounts(6, 2, 1)).toEqual<SegmentState[]>([
      'full', 'full', 'partial', 'empty', 'empty', 'empty',
    ]);
  });

  it('clamps counts that overshoot the total (a poisoned payload cannot invent segments)', () => {
    expect(segmentsFromCounts(3, 5, 5)).toEqual<SegmentState[]>([
      'full', 'full', 'full',
    ]);
    expect(segmentsFromCounts(3, 1, 9)).toEqual<SegmentState[]>([
      'full', 'partial', 'partial',
    ]);
  });

  it('floors junk/negative totals to an empty run', () => {
    expect(segmentsFromCounts(Number.NaN, 2)).toEqual<SegmentState[]>([]);
    expect(segmentsFromCounts(-4, 2)).toEqual<SegmentState[]>([]);
    expect(segmentsFromCounts(0, 0, 0)).toEqual<SegmentState[]>([]);
  });
});

describe('r325 indicators — attendanceMark', () => {
  it('maps the AttendanceStatus wire enum onto the three visual marks', () => {
    expect(attendanceMark('PRESENT')).toBe('present');
    expect(attendanceMark('LATE')).toBe('late');
    expect(attendanceMark('ABSENT')).toBe('absent');
    // EXCUSED joins ABSENT — the row is presence-shaped and an excused
    // absence is honestly «not present».
    expect(attendanceMark('EXCUSED')).toBe('absent');
    // Junk is absent — never a silent present.
    expect(attendanceMark('SOMETHING_ELSE')).toBe('absent');
  });
});

describe('r325 indicators — gradeBands (six equal bands over [0,100])', () => {
  it('buckets the edges: 50 opens the second band, 90 the last', () => {
    const { counts } = gradeBands([0, 49.9, 50, 59.9, 60, 69.9, 70, 79.9, 80, 89.9, 90, 100]);
    expect(counts).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it('marks the student\u2019s own band from the headline average', () => {
    const { counts, ownIndex } = gradeBands([55, 72, 81, 93], 74);
    expect(counts).toEqual([0, 1, 0, 1, 1, 1]); // 55 · 72 · 81 · 93
    expect(ownIndex).toBe(3); // 74 → 70–79
  });

  it('clamps out-of-range scores before bucketing; junk drops out', () => {
    const { counts, ownIndex } = gradeBands([120, -10, Number.NaN], Number.NaN);
    expect(counts).toEqual([1, 0, 0, 0, 0, 1]); // -10 → 0-band, 120 → 90+
    expect(ownIndex).toBeNull();
  });

  it('nothing graded → all-zero counts and no own band', () => {
    const { counts, ownIndex } = gradeBands([]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
    expect(ownIndex).toBeNull();
  });
});

describe('r325 indicators — groupSlotsByDay (Sunday-first columns)', () => {
  it('buckets schedule slots onto the 0=Sunday…6=Saturday contract', () => {
    const slots = [
      { dayOfWeek: 0, id: 'sun' },
      { dayOfWeek: 3, id: 'wed-a' },
      { dayOfWeek: 3, id: 'wed-b' },
      { dayOfWeek: 6, id: 'sat' },
    ];
    const cols = groupSlotsByDay(slots);
    expect(cols).toHaveLength(7);
    expect(cols[0]?.map((s) => s.id)).toEqual(['sun']);
    expect(cols[3]?.map((s) => s.id)).toEqual(['wed-a', 'wed-b']);
    expect(cols[6]?.map((s) => s.id)).toEqual(['sat']);
    expect(cols[1]).toEqual([]);
  });

  it('drops junk days (a poisoned payload never invents an eighth day)', () => {
    const slots = [
      { dayOfWeek: 7, id: 'overflow' },
      { dayOfWeek: -1, id: 'underflow' },
      { dayOfWeek: Number.NaN, id: 'junk' },
      { dayOfWeek: 2.9, id: 'fractional' },
    ];
    const cols = groupSlotsByDay(slots);
    expect(cols.flat()).toEqual([{ dayOfWeek: 2.9, id: 'fractional' }]);
    expect(cols[2]?.[0]?.id).toBe('fractional');
  });
});
