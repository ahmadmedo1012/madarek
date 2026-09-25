/**
 * 13-15 — lib/courseMeta.ts pins.
 *
 * ASSIGNMENT_KIND_LABEL is the wave 13-15 fold of the identical label
 * maps that lived as TYPE_LABELS (CourseDetailPage, CoursesPage) and
 * ASSIGNMENT_LABEL (DashboardPage); MATERIAL_TYPE_LABEL is the 14-2
 * fold of the identical map that lived as MATERIAL_TYPE_LABEL
 * (TeacherPages) and MATERIAL_LABELS (CourseDetailPage); these pins
 * hold the exact Arabic labels. The courseTint/courseIcon assertions
 * pin the pre-existing wave 9-a contract alongside them.
 */
import { describe, expect, it } from 'vitest';
import { BookOpen, Cog } from 'lucide-react';
import {
  ASSIGNMENT_KIND_LABEL,
  courseIcon,
  courseTint,
  DEFAULT_COURSE_TINT,
  gradeBand,
  GRADE_BANDS,
  MATERIAL_TYPE_LABEL,
} from '../../src/lib/courseMeta';

describe('ASSIGNMENT_KIND_LABEL (folded from TYPE_LABELS / ASSIGNMENT_LABEL)', () => {
  it('holds the exact Arabic labels for every assignment kind', () => {
    expect(ASSIGNMENT_KIND_LABEL).toEqual({
      HOMEWORK: 'واجب',
      QUIZ: 'اختبار قصير',
      PROJECT: 'مشروع',
      EXAM: 'اختبار',
    });
    expect(Object.keys(ASSIGNMENT_KIND_LABEL).sort()).toEqual([
      'EXAM', 'HOMEWORK', 'PROJECT', 'QUIZ',
    ]);
  });
});

describe('MATERIAL_TYPE_LABEL (folded from TeacherPages / CourseDetailPage)', () => {
  it('holds the exact labels for every material format (Latin codes stay Latin)', () => {
    expect(MATERIAL_TYPE_LABEL).toEqual({
      PDF: 'PDF',
      PPT: 'PPT',
      DOC: 'DOC',
      ZIP: 'ZIP',
      VIDEO: 'فيديو',
      IMAGE: 'صورة',
      OTHER: 'ملف',
    });
    expect(Object.keys(MATERIAL_TYPE_LABEL).sort()).toEqual([
      'DOC', 'IMAGE', 'OTHER', 'PDF', 'PPT', 'VIDEO', 'ZIP',
    ]);
  });
});

describe('courseTint (wave 9-a contract)', () => {
  it('falls back to the default tint for missing theme colors', () => {
    expect(DEFAULT_COURSE_TINT).toBe('#3D6BD6');
    expect(courseTint(undefined)).toBe(DEFAULT_COURSE_TINT);
    expect(courseTint(null)).toBe(DEFAULT_COURSE_TINT);
  });

  it('passes the API theme color through untouched', () => {
    expect(courseTint('#ABC123')).toBe('#ABC123');
  });
});

describe('courseIcon (wave 9-a contract)', () => {
  it('maps Arabic subject names to their subject icon', () => {
    expect(courseIcon('برمجة الحاسوب')).toBe(Cog);
  });

  it('falls back to the book icon for unmatched subjects', () => {
    expect(courseIcon('تاريخ ليبيا الحديث')).toBe(BookOpen);
  });
});

/* 22-a (A6 P2) — the ONE grade-band taxonomy. The thresholds keep the
 * grades page's original ladder (the most granular of the three
 * vocabularies it replaces); the pins hold the exact labels so the
 * three consuming surfaces can never drift apart again. */
describe('gradeBand / GRADE_BANDS (A6 P2 — one taxonomy, three surfaces)', () => {
  it('resolves every boundary of the ladder to its band', () => {
    expect(gradeBand(100).key).toBe('EXCELLENT');
    expect(gradeBand(85).key).toBe('EXCELLENT');
    expect(gradeBand(84).key).toBe('VERY_GOOD');
    expect(gradeBand(75).key).toBe('VERY_GOOD');
    expect(gradeBand(74).key).toBe('GOOD');
    expect(gradeBand(65).key).toBe('GOOD');
    expect(gradeBand(64).key).toBe('PASS');
    expect(gradeBand(50).key).toBe('PASS');
    expect(gradeBand(49).key).toBe('WEAK');
    expect(gradeBand(0).key).toBe('WEAK');
  });

  it('holds the exact shared labels, colors and ranges', () => {
    expect(GRADE_BANDS).toEqual([
      { key: 'EXCELLENT', label: 'ممتاز',     color: 'green', barColor: 'var(--success)', range: '85 فأعلى',  min: 85 },
      { key: 'VERY_GOOD', label: 'جيّد جدّاً', color: 'brand', barColor: 'var(--accent)',  range: '75–84',     min: 75 },
      { key: 'GOOD',      label: 'جيّد',      color: 'amber', barColor: 'var(--warning)', range: '65–74',     min: 65 },
      { key: 'PASS',      label: 'مقبول',     color: 'gold',  barColor: 'var(--gold)',    range: '50–64',     min: 50 },
      { key: 'WEAK',      label: 'ضعيف',      color: 'red',   barColor: 'var(--danger)',  range: 'أقلّ من 50', min: 0 },
    ]);
  });

  it('is ordered best → weak with contiguous, gap-free thresholds', () => {
    for (let i = 1; i < GRADE_BANDS.length; i++) {
      expect(GRADE_BANDS[i]!.min).toBeLessThan(GRADE_BANDS[i - 1]!.min);
      // Each band's floor is exactly one mark below the previous floor
      // — no grade falls between two bands.
      expect(gradeBand(GRADE_BANDS[i - 1]!.min - 1).key).toBe(GRADE_BANDS[i]!.key);
    }
    expect(GRADE_BANDS[GRADE_BANDS.length - 1]!.min).toBe(0);
  });
});
