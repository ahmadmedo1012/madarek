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
