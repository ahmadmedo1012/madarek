/**
 * master-F1 — the import row-validation contract.
 *
 * Pins the mission's honesty rules: emailless students are IMPORTABLE
 * (the §8.6 institutional identity), a shared family phone is a WARNING
 * (siblings, not duplicates), in-file duplicate reg-numbers/emails are
 * ERRORS, school mode relaxes faculty/department to warnings, and
 * phones normalize through E1's phones.ts.
 */
import { describe, expect, it } from 'vitest';
import { buildColumnMap } from '../mapping.js';
import { validateRows } from '../validate.js';

const STUDENT_HEADERS = [
  'الاسم الكامل',
  'رقم القيد',
  'رقم الهاتف',
  'رقم ولي الأمر',
  'الكلية',
  'القسم',
  'السنة الدراسية',
  'الصف',
];

function validate(grid: string[][], mode: 'UNIVERSITY' | 'SCHOOL' = 'UNIVERSITY') {
  const map = buildColumnMap(STUDENT_HEADERS);
  return validateRows(grid, map, { entity: 'STUDENT', mode });
}

describe('master-F1 validate — the honest row contract', () => {
  it('a complete university row passes with normalized phone', () => {
    const r = validate([['أحمد المهدي', 'CS-2026-001', '0912345678', '0919876543', 'كلية العلوم', 'قسم الحاسوب', '2', '']]);
    expect(r.counts.ok).toBe(1);
    const row = r.rows[0]!;
    expect(row.status).toBe('ok');
    const mapped = row.mapped as { studentPhone?: string; studentPhoneNormalized?: string; guardianPhone?: string; guardianPhoneNormalized?: string };
    expect(mapped.studentPhone).toBe('0912345678');
    expect(mapped.studentPhoneNormalized).toBe('218912345678');
    expect(mapped.guardianPhoneNormalized).toBe('218919876543');
    expect(mapped.guardianPhone).toBe('0919876543');
  });

  it('an emailless row is importable (the institutional identity)', () => {
    const r = validate([['سالم القذافي', 'CS-2026-002', '', '', 'كلية العلوم', 'قسم الرياضيات', '1', '']]);
    expect(r.counts.ok).toBe(1);
    expect(r.rows[0]!.errorsAr).toEqual([]);
  });

  it('a missing name or reg-number is an error', () => {
    const r = validate([
      ['', 'CS-2026-003', '', '', 'كلية العلوم', 'قسم الحاسوب', '1', ''],
      ['بلا رقم', '', '', '', 'كلية العلوم', 'قسم الحاسوب', '1', ''],
    ]);
    expect(r.counts.error).toBe(2);
    expect(r.rows[0]!.errorsAr.length).toBeGreaterThan(0);
    expect(r.rows[1]!.errorsAr.length).toBeGreaterThan(0);
  });

  it('the SAME phone shared by two students is a warning (siblings), not an error', () => {
    const r = validate([
      ['الأخ الأول', 'CS-2026-010', '0915550000', '', 'كلية العلوم', 'قسم الحاسوب', '1', ''],
      ['الأخ الثاني', 'CS-2026-011', '0915550000', '', 'كلية العلوم', 'قسم الحاسوب', '1', ''],
    ]);
    expect(r.counts.ok).toBe(2);
    expect(r.duplicateReport.sharedPhones).toHaveLength(1);
    expect(r.duplicateReport.sharedPhones[0]!.lines).toEqual([1, 2]);
  });

  it('in-file duplicate reg-numbers are errors with both lines listed', () => {
    const r = validate([
      ['الطالب أ', 'DUP-1', '', '', 'كلية العلوم', 'قسم الحاسوب', '1', ''],
      ['الطالب ب', 'DUP-1', '', '', 'كلية العلوم', 'قسم الحاسوب', '1', ''],
    ]);
    expect(r.counts.error).toBeGreaterThanOrEqual(1);
    expect(r.duplicateReport.regNumbers).toHaveLength(1);
    expect(r.duplicateReport.regNumbers[0]!.lines).toEqual([1, 2]);
  });

  it('school mode: missing faculty/department is a warning, not an error', () => {
    const r = validate([['تلميذ المرحلة', 'SCH-001', '0912345678', '', '', '', '', 'الخامس']], 'SCHOOL');
    expect(r.counts.ok).toBe(1);
    expect(r.rows[0]!.warningsAr.length).toBeGreaterThanOrEqual(1);
    expect(r.rows[0]!.errorsAr).toEqual([]);
  });

  it('an invalid year is an error in university mode', () => {
    const r = validate([['طالب', 'CS-2026-020', '', '', 'كلية العلوم', 'قسم الحاسوب', '12', '']]);
    expect(r.counts.error).toBe(1);
  });
});
