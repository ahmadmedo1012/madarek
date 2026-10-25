/**
 * R319 (c2-G1) — §B2 component pins: the student dashboard's sheet
 * material, one describe per component.
 *
 * The §B2 contract each block holds:
 *  · SectionBar — `[02] اليوم ─── 03`: mono gutter index (aria-hidden,
 *    LTR), the section's semantic h2, the hairline rule, quiet meta.
 *  · RulerGauge — the semester ruler's WEEK MATH (W09/15 from the
 *    term's own start/end), one tick per week, the API % clamped and
 *    printed as quiet mono meta.
 *  · CourseBar — the end-tick AT the exact (clamped) value; mono code
 *    and percentage.
 *  · StatusChip — the tone register + dueChip's honest deadline
 *    labels; orange is LIVE-only (the tone class), Latin runs LTR.
 *  · WeekStrip — 7 cells in the app's Sunday-first order, the current
 *    day inked exactly once (aria-current="date"), Latin mono dates.
 *  · EmptyCell — the hatched reserved region + label + note + ONE
 *    action.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  SectionBar, BarCount, RulerGauge, semesterWeeks, CourseBar,
  StatusChip, dueChip, STATUS_CHIP_TONES, WeekStrip, EmptyCell,
} from '../../components/student';

/* ── SectionBar ─────────────────────────────────────────────────── */

describe('R319 · SectionBar — the mono-indexed title bar', () => {
  it('renders the [02] gutter index (LTR, aria-hidden) + the section h2 + rule + meta', () => {
    const { container } = render(
      <SectionBar index="02" title="اليوم" meta={<BarCount n={3} srLabel="3 التزامات اليوم" />} />,
    );
    const bar = container.querySelector('.r319s-bar');
    expect(bar).not.toBeNull();
    const index = bar?.querySelector('.r319s-bar-index');
    expect(index?.textContent).toBe('[02]');
    expect(index?.getAttribute('dir')).toBe('ltr');
    expect(index?.getAttribute('aria-hidden')).toBe('true');
    // The section stays the semantic h2 (the PageHeader contract: one
    // h1 per route, sections answer with h2s).
    const h2 = bar?.querySelector('h2.r319s-bar-title');
    expect(h2?.textContent).toBe('اليوم');
    expect(bar?.querySelector('.r319s-bar-rule')).not.toBeNull();
    expect(bar?.querySelector('.r319s-bar-meta')).not.toBeNull();
  });

  it('BarCount prints the tabular datum for sighted readers and countAr for assistive tech', () => {
    const { container } = render(<BarCount n={3} srLabel="3 التزامات اليوم" />);
    const visible = container.querySelector('.r319s-count');
    expect(visible?.textContent).toBe('03');
    expect(visible?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.sr-only')?.textContent).toBe('3 التزامات اليوم');
  });
});

/* ── RulerGauge ─────────────────────────────────────────────────── */

describe('R319 · RulerGauge — the semester week math (W09/15)', () => {
  // 2026-01-04 → 2026-04-19 = 105 days = exactly 15 weeks;
  // 2026-03-01 is day 56 → week 9 → W09/15.
  const STARTS = '2026-01-04T00:00:00Z';
  const ENDS = '2026-04-19T00:00:00Z';
  const NOW = new Date('2026-03-01T12:00:00Z');

  it('computes the 1-based week index from the term\u2019s own dates', () => {
    expect(semesterWeeks(STARTS, ENDS, NOW)).toEqual({ week: 9, totalWeeks: 15 });
  });

  it('renders the mono W09/15 head, one tick per week, and the API % as quiet meta', () => {
    const { container } = render(
      <RulerGauge startsAt={STARTS} endsAt={ENDS} progressPct={60} now={NOW} />,
    );
    expect(container.querySelector('.r319s-ruler-head')?.textContent).toBe('W09/15');
    expect(container.querySelectorAll('.r319s-ruler-tick')).toHaveLength(15);
    // The meter contract: the same reading for assistive tech.
    const meter = container.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-valuetext')).toBe('W09/15 · 60%');
    expect(meter?.getAttribute('aria-valuenow')).toBe('60');
    expect(container.querySelector('.r319s-ruler-pct')?.textContent).toBe('60%');
    expect(container.querySelector('.r319s-ruler-meta')?.textContent).toContain('من الفصل مضى');
  });

  it('clamps honestly: before the term → W01, past the end → the last week, degenerate → a 1-week ruler', () => {
    expect(semesterWeeks(STARTS, ENDS, new Date('2025-12-01T00:00:00Z')).week).toBe(1);
    expect(semesterWeeks(STARTS, ENDS, new Date('2026-06-01T00:00:00Z'))).toEqual({ week: 15, totalWeeks: 15 });
    expect(semesterWeeks('2026-01-04T00:00:00Z', '2026-01-04T00:00:00Z', NOW)).toEqual({ week: 1, totalWeeks: 1 });
    expect(semesterWeeks('not-a-date', ENDS, NOW)).toEqual({ week: 1, totalWeeks: 1 });
  });

  it('clamps a poisoned progressPct into [0,100]', () => {
    const { container } = render(
      <RulerGauge startsAt={STARTS} endsAt={ENDS} progressPct={150} now={NOW} />,
    );
    expect(container.querySelector('.r319s-ruler-pct')?.textContent).toBe('100%');
    expect(container.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('100');
  });
});

/* ── CourseBar ──────────────────────────────────────────────────── */

describe('R319 · CourseBar — the per-course hairline with the end-tick', () => {
  it('seats the end-tick and the ink fill exactly at the value, mono code + pct at the ends', () => {
    const { container } = render(<CourseBar code="CS-201" pct={62} />);
    expect(container.querySelector('.r319s-coursebar-tick')?.getAttribute('style')).toContain('62%');
    expect(container.querySelector('.r319s-coursebar-fill')?.getAttribute('style')).toContain('62%');
    expect(container.querySelector('.r319s-coursebar-code')?.textContent).toBe('CS-201');
    expect(container.querySelector('.r319s-coursebar-pct')?.textContent).toBe('62%');
    expect(container.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('62');
  });

  it('clamps poisoned payloads — never a 150%-wide fill or a negative width', () => {
    const { container } = render(<CourseBar pct={150} />);
    expect(container.querySelector('.r319s-coursebar-tick')?.getAttribute('style')).toContain('100%');
    const { container: neg } = render(<CourseBar pct={-20} />);
    expect(neg.querySelector('.r319s-coursebar-tick')?.getAttribute('style')).toContain('0%');
  });
});

/* ── StatusChip ─────────────────────────────────────────────────── */

describe('R319 · StatusChip — the mono status register', () => {
  it('maps every day-count to the honest deadline label (the formatDue arithmetic)', () => {
    expect(dueChip(-2)).toEqual({ label: 'OVERDUE', tone: 'due' });
    expect(dueChip(0)).toEqual({ label: 'DUE TODAY', tone: 'due' });
    expect(dueChip(3)).toEqual({ label: 'DUE 3D', tone: 'due' });
    expect(dueChip(9)).toEqual({ label: 'DUE 9D', tone: 'due' });
    expect(dueChip(30)).toEqual({ label: 'DUE', tone: 'due' });
  });

  it('renders every tone of the register as a square mono chip, LTR-isolated', () => {
    for (const tone of STATUS_CHIP_TONES) {
      const { container } = render(<StatusChip label="LIVE" tone={tone} />);
      const chip = container.querySelector(`.r319s-chip.r319s-chip--${tone}`);
      expect(chip, `tone ${tone} must render its class`).not.toBeNull();
      expect(chip?.getAttribute('dir')).toBe('ltr');
      expect(chip?.textContent).toBe('LIVE');
    }
  });

  it('orange is LIVE ONLY — no other tone carries the live class', () => {
    const { container } = render(<StatusChip label="DUE 3D" tone="due" />);
    expect(container.querySelector('.r319s-chip')?.className).not.toContain('--live');
  });
});

/* ── WeekStrip ──────────────────────────────────────────────────── */

describe('R319 · WeekStrip — the 7-cell week row, current day inked', () => {
  it('2026-03-15 (a Sunday) → 7 Sunday-first cells, exactly cell 0 inked, dates 15–21', () => {
    const { container } = render(<WeekStrip now={new Date('2026-03-15T10:00:00Z')} />);
    const cells = [...container.querySelectorAll('.r319s-weekcell')];
    expect(cells).toHaveLength(7);
    const inked = cells.filter((c) => c.className.includes('r319s-weekcell--today'));
    expect(inked).toHaveLength(1);
    const inkedCell = inked[0] as HTMLElement;
    expect(inkedCell).toBe(cells[0]); // Sunday-first — WEEKDAY_NAMES_AR[0]
    expect(inkedCell.getAttribute('aria-current')).toBe('date');
    // The inked day carries the sr-only «اليوم» marker.
    expect(inkedCell.querySelector('.sr-only')?.textContent).toBe('اليوم');
    // Latin mono dates, the one-numeral convention.
    expect(cells.map((c) => c.querySelector('.r319s-weekcell-date')?.textContent))
      .toEqual(['15', '16', '17', '18', '19', '20', '21']);
  });

  it('a mid-week `now` inks exactly its own cell (Wednesday → index 3)', () => {
    const { container } = render(<WeekStrip now={new Date('2026-03-18T08:00:00Z')} />);
    const cells = [...container.querySelectorAll('.r319s-weekcell')];
    const inked = cells.filter((c) => c.className.includes('r319s-weekcell--today'));
    expect(inked).toHaveLength(1);
    expect(inked[0]).toBe(cells[3]);
  });
});

/* ── EmptyCell ──────────────────────────────────────────────────── */

describe('R319 · EmptyCell — the hatched empty state', () => {
  it('renders the hatch cell (aria-hidden) + the honest label + note + ONE action', () => {
    const { container } = render(
      <EmptyCell
        label="لا مقرّرات بعد"
        note="لم تُسجَّل في مقرّرات هذا الفصل بعد."
        action={<a href="/student/catalog">دليل المقرّرات</a>}
      />,
    );
    const empty = container.querySelector('.r319s-empty');
    expect(empty).not.toBeNull();
    const hatch = empty?.querySelector('.r319s-empty-hatch');
    expect(hatch).not.toBeNull();
    expect(hatch?.getAttribute('aria-hidden')).toBe('true');
    expect(empty?.querySelector('.r319s-empty-label')?.textContent).toBe('لا مقرّرات بعد');
    expect(empty?.querySelector('.r319s-empty-note')?.textContent)
      .toBe('لم تُسجَّل في مقرّرات هذا الفصل بعد.');
    expect(empty?.querySelectorAll('.r319s-empty-action a')).toHaveLength(1);
  });
});
