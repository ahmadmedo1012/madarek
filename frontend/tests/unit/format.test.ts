/**
 * 13-15 — lib/format.ts pins (audit 11-f P2-1 / D13).
 *
 * The helpers folded in wave 13-15 were moved VERBATIM from the pages
 * that owned them; these tests pin the exact contracts so a future edit
 * can't silently change rendered copy:
 *  - arUnit: the 3-form counted-noun contract (0 → counted plural,
 *    11+ → singular again) — deliberately NOT countAr's 4-form one.
 *  - timeAgoAr: the sub-minute "الآن" window (a full 60 s, vs
 *    formatRelativeAr's 30 s rounding) + short-date fallback past the
 *    week mark.
 *  - formatDateAr / formatDateWithYearAr / formatDateTimeAr: the ar-LY
 *    locale + option pins, "—" for missing values.
 *  - formatMmSs: the m:ss media clock ("61:01" past the hour — NOT
 *    curriculumValidation.formatSec's h:mm:ss promotion).
 *  - WEEKDAY_NAMES_AR: the Sunday-first Date#getDay() order.
 *
 * Date fixtures are pinned at noon UTC so the calendar day is stable
 * for any |UTC offset| ≤ 12 h (the suite runs with TZ=UTC).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  arUnit,
  countAr,
  formatDateAr,
  formatDateWithYearAr,
  formatDateTimeAr,
  formatMmSs,
  formatRelativeAr,
  formatRelativeArShort,
  timeAgoAr,
  WEEKDAY_NAMES_AR,
} from '../../src/lib/format';

const NOW = new Date('2026-03-15T12:00:00Z'); // a Sunday, noon UTC
const ago = (sec: number) => new Date(NOW.getTime() - sec * 1000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('countAr (wave 9-a, 4-form contract)', () => {
  const forms: [string, string, string, string] = ['كتاب', 'كتابان', 'كتب', 'كتاباً'];

  it('renders singular for 1 and dual for 2', () => {
    expect(countAr(1, forms)).toBe('كتاب');
    expect(countAr(2, forms)).toBe('كتابان');
  });

  it('renders the counted plural for 3–10', () => {
    expect(countAr(3, forms)).toBe('3 كتب');
    expect(countAr(10, forms)).toBe('10 كتب');
  });

  it('renders the many form for 11+ AND for 0 (the arUnit difference)', () => {
    expect(countAr(11, forms)).toBe('11 كتاباً');
    expect(countAr(0, forms)).toBe('0 كتاباً');
  });
});

describe('arUnit (3-form contract, folded from MorePages + CommunityPages)', () => {
  const forms: [string, string, string] = ['مشترك', 'مشتركان', 'مشتركين'];

  it('renders singular for 1, dual for 2, counted plural for 3–10', () => {
    expect(arUnit(1, ...forms)).toBe('مشترك');
    expect(arUnit(2, ...forms)).toBe('مشتركان');
    expect(arUnit(3, ...forms)).toBe('3 مشتركين');
    expect(arUnit(10, ...forms)).toBe('10 مشتركين');
  });

  it('reuses the singular for 11+ (Arabic number grammar)', () => {
    expect(arUnit(11, ...forms)).toBe('11 مشترك');
    expect(arUnit(27, ...forms)).toBe('27 مشترك');
  });

  it('renders the counted plural for 0 — NOT countAr’s many form', () => {
    expect(arUnit(0, ...forms)).toBe('0 مشتركين');
  });
});

describe('timeAgoAr (folded from MorePages)', () => {
  it('treats the whole first minute as "الآن" (60 s window)', () => {
    expect(timeAgoAr(ago(5))).toBe('الآن');
    expect(timeAgoAr(ago(59))).toBe('الآن');
  });

  it('uses counted plurals: dual, plural, then singular again for 11+', () => {
    expect(timeAgoAr(ago(90))).toBe('منذ دقيقتين');
    expect(timeAgoAr(ago(5 * 60))).toBe('منذ 5 دقائق');
    expect(timeAgoAr(ago(11 * 60))).toBe('منذ 11 دقيقة');
    expect(timeAgoAr(ago(2 * 3600))).toBe('منذ ساعتين');
    expect(timeAgoAr(ago(5 * 3600))).toBe('منذ 5 ساعات');
    expect(timeAgoAr(ago(26 * 3600))).toBe('منذ يوم');
    expect(timeAgoAr(ago(3 * 86_400))).toBe('منذ 3 أيام');
  });

  it('falls back to a short ar-LY date past the week mark', () => {
    const iso = ago(8 * 86_400);
    expect(timeAgoAr(iso)).toBe(
      new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' }),
    );
  });
});

describe('formatRelativeAr / formatRelativeArShort (wave 9-a, contrast pins)', () => {
  it('formatRelativeAr switches to "منذ دقيقة" at 30 s — the window timeAgoAr does not have', () => {
    expect(formatRelativeAr(ago(20))).toBe('الآن');
    expect(formatRelativeAr(ago(45))).toBe('منذ دقيقة');
  });

  it('formatRelativeArShort keeps plain numerals with no counted plurals', () => {
    expect(formatRelativeArShort(ago(90))).toBe('منذ 2 دقيقة');
    expect(formatRelativeArShort(ago(3 * 3600))).toBe('منذ 3 ساعة');
    expect(formatRelativeArShort(ago(3 * 86_400))).toBe('منذ 3 يوم');
  });
});

describe('formatDateAr (folded from CourseDetailPage + ResearchReviewPage)', () => {
  it('renders "—" for missing values', () => {
    expect(formatDateAr(null)).toBe('—');
    expect(formatDateAr(undefined)).toBe('—');
    expect(formatDateAr('')).toBe('—');
  });

  it('renders the short ar-LY date (day + month)', () => {
    expect(formatDateAr('2026-03-12T12:00:00Z')).toBe('12 مارس');
  });
});

describe('formatDateWithYearAr (folded from ResearchPage)', () => {
  it('renders "—" for missing values', () => {
    expect(formatDateWithYearAr(null)).toBe('—');
    expect(formatDateWithYearAr(undefined)).toBe('—');
  });

  it('renders the short ar-LY date with the year', () => {
    expect(formatDateWithYearAr('2026-03-12T12:00:00Z')).toBe('12 مارس 2026');
  });
});

describe('formatDateTimeAr (folded from CollegePages, twin of OwnerSystemPage’s copy)', () => {
  it('renders ar-LY medium date + short time with the exact option set', () => {
    const iso = '2026-03-12T19:30:00Z';
    expect(formatDateTimeAr(iso)).toBe(
      new Date(iso).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }),
    );
  });
});

describe('formatMmSs (folded from LecturePlayerPage)', () => {
  it('zero-pads both segments', () => {
    expect(formatMmSs(0)).toBe('00:00');
    expect(formatMmSs(9)).toBe('00:09');
    expect(formatMmSs(59)).toBe('00:59');
    expect(formatMmSs(60)).toBe('01:00');
    expect(formatMmSs(754)).toBe('12:34');
    expect(formatMmSs(3599)).toBe('59:59');
  });

  it('keeps rolling minutes past the hour — NOT h:mm:ss (formatSec’s contract)', () => {
    expect(formatMmSs(3661)).toBe('61:01');
  });

  it('floors fractional seconds like the former local fmtTime', () => {
    expect(formatMmSs(754.9)).toBe('12:34');
  });
});

describe('WEEKDAY_NAMES_AR (folded from DAYS / DAY_NAMES / WEEKDAYS)', () => {
  it('is the Sunday-first Arabic week in Date#getDay() order', () => {
    expect(WEEKDAY_NAMES_AR).toEqual([
      'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت',
    ]);
    expect(WEEKDAY_NAMES_AR[NOW.getDay()]).toBe('الأحد'); // NOW is a Sunday
  });
});
