/**
 * 22-a (A6 P2) — the dashboard trend drawability floor.
 *
 * The 6-week /teacher/dashboard window comes back with 5/6 weeks null
 * server-side early in a term; the old rendering drew the canvas
 * anyway and a single non-null point painted one floating dot that
 * read as a rendering bug (VLM flagged it on desktop, mobile AND
 * dark). trendCoverage() is the pure gate the page consumes: a series
 * needs ≥2 non-null points before the chart draws; below the floor
 * the card renders the platform empty-state grammar (and keeps the
 * sr-only data table).
 */
import { describe, expect, it } from 'vitest';
import { trendCoverage } from '../../src/pages/teacher/TeacherDashboardPage';

type Week = { week: string; avgGradePct: number | null; attendancePct: number | null };

const w = (week: string, avgGradePct: number | null, attendancePct: number | null): Week => ({
  week,
  avgGradePct,
  attendancePct,
});

describe('trendCoverage — the 2-point drawability floor (A6 P2 / 22-a)', () => {
  it('refuses to draw the one-dot case: 5/6 weeks null, one week recorded', () => {
    // The exact production shape the audit shot: only week 6 has data.
    const coverage = trendCoverage([
      w('الأسبوع 1', null, null),
      w('الأسبوع 2', null, null),
      w('الأسبوع 3', null, null),
      w('الأسبوع 4', null, null),
      w('الأسبوع 5', null, null),
      w('الأسبوع 6', 100, 100),
    ]);
    expect(coverage.drawable).toBe(false);
    expect(coverage.weeksRecorded).toBe(1);
  });

  it('refuses an all-null window (the honest zero state)', () => {
    const coverage = trendCoverage([
      w('الأسبوع 1', null, null),
      w('الأسبوع 2', null, null),
    ]);
    expect(coverage.drawable).toBe(false);
    expect(coverage.weeksRecorded).toBe(0);
  });

  it('draws once any single series carries two non-null points', () => {
    const coverage = trendCoverage([
      w('الأسبوع 1', 70, null),
      w('الأسبوع 2', 80, null),
      w('الأسبوع 3', null, null),
    ]);
    expect(coverage.drawable).toBe(true);
    expect(coverage.weeksRecorded).toBe(2);
  });

  it('still refuses when the points are split across the two series', () => {
    // One grade week + one attendance week ≠ a drawable trend line —
    // each series still has a single point.
    const coverage = trendCoverage([
      w('الأسبوع 1', 70, null),
      w('الأسبوع 2', null, 90),
    ]);
    expect(coverage.drawable).toBe(false);
    expect(coverage.weeksRecorded).toBe(2);
  });

  it('draws a fully populated window', () => {
    const coverage = trendCoverage([
      w('الأسبوع 1', 70, 90),
      w('الأسبوع 2', 75, 92),
    ]);
    expect(coverage.drawable).toBe(true);
    expect(coverage.weeksRecorded).toBe(2);
  });
});
