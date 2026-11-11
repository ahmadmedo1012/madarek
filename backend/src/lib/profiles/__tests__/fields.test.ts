/**
 * master-E1 — the pure custom-field service (validateFieldValue +
 * mapImportHeader) for the structured field system. DB-free: every case
 * exercises src/lib/profiles/fields.ts against the type shapes, the
 * controlled-JSON definition guards, and the mission §9.4 import
 * aliases the schools/universities spreadsheets actually carry.
 */
import { describe, expect, it } from 'vitest';
import type { CustomFieldDefinitionInput } from '../fields.js';
import { mapImportHeader, validateFieldValue } from '../fields.js';

function def(overrides: Partial<CustomFieldDefinitionInput>): CustomFieldDefinitionInput {
  return {
    key: 'test-field',
    labelAr: 'حقل الاختبار',
    labelEn: 'Test field',
    entity: 'STUDENT',
    type: 'TEXT',
    required: false,
    ...overrides,
  };
}

describe('master-E1 validateFieldValue — required / empty handling', () => {
  it('rejects a missing value on a required field with an Arabic message', () => {
    const r = validateFieldValue(def({ required: true }), undefined);
    expect(r).toEqual({ ok: false, errorAr: '«حقل الاختبار» حقل مطلوب' });
    expect(validateFieldValue(def({ required: true }), '   ')).toEqual({
      ok: false,
      errorAr: '«حقل الاختبار» حقل مطلوب',
    });
  });

  it('accepts a missing value on an optional field as an empty shape', () => {
    expect(validateFieldValue(def({}), null)).toEqual({ ok: true, normalized: {} });
    expect(validateFieldValue(def({ type: 'MULTI_SELECT' }), [])).toEqual({ ok: true, normalized: {} });
  });
});

describe('master-E1 validateFieldValue — TEXT', () => {
  it('trims and stores into valueText only', () => {
    expect(validateFieldValue(def({}), '  محمد الأمين  ')).toEqual({
      ok: true,
      normalized: { valueText: 'محمد الأمين' },
    });
  });

  it('enforces min/max as string-length bounds', () => {
    const d = def({ validation: { min: 3, max: 5 } });
    expect(validateFieldValue(d, 'abc').ok).toBe(true);
    expect(validateFieldValue(d, 'ab')).toMatchObject({ ok: false });
    expect(validateFieldValue(d, 'abcdef')).toMatchObject({ ok: false });
  });

  it('enforces the pattern rule', () => {
    const d = def({ validation: { pattern: '^[A-Z]{2}-[0-9]{4}$' } });
    expect(validateFieldValue(d, 'AB-2026')).toMatchObject({ ok: true });
    expect(validateFieldValue(d, 'AB-26')).toMatchObject({ ok: false });
  });

  it('rejects non-string values', () => {
    expect(validateFieldValue(def({}), 42)).toMatchObject({ ok: false });
  });
});

describe('master-E1 validateFieldValue — NUMBER', () => {
  it('accepts numbers and numeric strings (incl. Arabic-Indic digits)', () => {
    expect(validateFieldValue(def({ type: 'NUMBER' }), 4.5)).toEqual({
      ok: true,
      normalized: { valueNumber: 4.5 },
    });
    expect(validateFieldValue(def({ type: 'NUMBER' }), ' 12.75 ')).toEqual({
      ok: true,
      normalized: { valueNumber: 12.75 },
    });
    expect(validateFieldValue(def({ type: 'NUMBER' }), '١٢')).toEqual({
      ok: true,
      normalized: { valueNumber: 12 },
    });
  });

  it('rejects non-numeric input and enforces numeric bounds', () => {
    const d = def({ type: 'NUMBER', validation: { min: 0, max: 100 } });
    expect(validateFieldValue(d, 'ليس رقمًا')).toMatchObject({ ok: false });
    expect(validateFieldValue(d, -1)).toMatchObject({ ok: false });
    expect(validateFieldValue(d, 101)).toMatchObject({ ok: false });
    expect(validateFieldValue(d, 100)).toMatchObject({ ok: true });
  });
});

describe('master-E1 validateFieldValue — DATE', () => {
  it('accepts Date instances, ISO strings and YYYY-MM-DD', () => {
    const d = def({ type: 'DATE' });
    const r1 = validateFieldValue(d, new Date('2026-09-01T00:00:00Z'));
    expect(r1).toEqual({ ok: true, normalized: { valueDate: new Date('2026-09-01T00:00:00Z') } });
    expect(validateFieldValue(d, '2026-09-01')).toMatchObject({ ok: true });
    expect(validateFieldValue(d, 'not a date')).toMatchObject({ ok: false });
  });

  it('enforces epoch-ms min/max bounds', () => {
    const min = Date.UTC(2000, 0, 1);
    const max = Date.UTC(2030, 11, 31);
    const d = def({ type: 'DATE', validation: { min, max } });
    expect(validateFieldValue(d, '2010-06-15')).toMatchObject({ ok: true });
    expect(validateFieldValue(d, '1999-01-01')).toMatchObject({ ok: false });
    expect(validateFieldValue(d, '2035-01-01')).toMatchObject({ ok: false });
  });
});

describe('master-E1 validateFieldValue — BOOLEAN', () => {
  it('accepts booleans and the Arabic/Latin truth tokens', () => {
    const d = def({ type: 'BOOLEAN' });
    expect(validateFieldValue(d, true)).toEqual({ ok: true, normalized: { valueBoolean: true } });
    expect(validateFieldValue(d, false)).toEqual({ ok: true, normalized: { valueBoolean: false } });
    expect(validateFieldValue(d, 'نعم')).toEqual({ ok: true, normalized: { valueBoolean: true } });
    expect(validateFieldValue(d, 'لا')).toEqual({ ok: true, normalized: { valueBoolean: false } });
    expect(validateFieldValue(d, 'FALSE')).toEqual({ ok: true, normalized: { valueBoolean: false } });
    expect(validateFieldValue(d, 'ربما')).toMatchObject({ ok: false });
  });
});

describe('master-E1 validateFieldValue — SELECT', () => {
  const d = def({ type: 'SELECT', options: ['علوم', 'آداب', 'رياضة'] });

  it('accepts a member of the options list (trimmed)', () => {
    expect(validateFieldValue(d, ' علوم ')).toEqual({
      ok: true,
      normalized: { valueSelect: 'علوم' },
    });
  });

  it('rejects a non-member with the allowed values in the message', () => {
    const r = validateFieldValue(d, 'فنون');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorAr).toContain('علوم');
  });

  it('surfaces a broken definition (options not a clean string[])', () => {
    expect(validateFieldValue(def({ type: 'SELECT', options: 'علوم' }), 'علوم')).toMatchObject({ ok: false });
    expect(validateFieldValue(def({ type: 'SELECT', options: [] }), 'علوم')).toMatchObject({ ok: false });
    expect(validateFieldValue(def({ type: 'SELECT', options: ['a', 'a'] }), 'a')).toMatchObject({ ok: false });
  });
});

describe('master-E1 validateFieldValue — MULTI_SELECT', () => {
  const d = def({ type: 'MULTI_SELECT', options: ['كرة القدم', 'سباحة', 'شطرنج'] });

  it('accepts arrays and comma-separated strings (Arabic and Latin commas)', () => {
    expect(validateFieldValue(d, ['سباحة', 'كرة القدم'])).toEqual({
      ok: true,
      normalized: { valueMultiSelect: ['سباحة', 'كرة القدم'] },
    });
    expect(validateFieldValue(d, 'سباحة، شطرنج')).toEqual({
      ok: true,
      normalized: { valueMultiSelect: ['سباحة', 'شطرنج'] },
    });
    const r = validateFieldValue(d, 'كرة القدم,سباحة');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toEqual({ valueMultiSelect: ['كرة القدم', 'سباحة'] });
  });

  it('dedupes preserving first-seen order', () => {
    expect(validateFieldValue(d, 'سباحة، سباحة، شطرنج')).toEqual({
      ok: true,
      normalized: { valueMultiSelect: ['سباحة', 'شطرنج'] },
    });
  });

  it('rejects any non-member value and non-list input', () => {
    expect(validateFieldValue(d, 'ملاكمة')).toMatchObject({ ok: false });
    expect(validateFieldValue(d, 'سباحة، ملاكمة')).toMatchObject({ ok: false });
    expect(validateFieldValue(d, 7)).toMatchObject({ ok: false });
  });

  it('treats an all-blank cell as missing (required → error)', () => {
    const req = def({ type: 'MULTI_SELECT', required: true, options: ['سباحة'] });
    expect(validateFieldValue(req, ' ، ')).toEqual({ ok: false, errorAr: '«حقل الاختبار» حقل مطلوب' });
  });
});

describe('master-E1 validateFieldValue — controlled validation JSON', () => {
  it('rejects unknown keys or wrong-typed rules in validation', () => {
    expect(validateFieldValue(def({ validation: { regex: 'x' } }), 'قيمة')).toMatchObject({ ok: false });
    expect(validateFieldValue(def({ validation: { min: '3' } }), 'قيمة')).toMatchObject({ ok: false });
  });

  it('rejects an invalid regex pattern in the definition', () => {
    expect(validateFieldValue(def({ validation: { pattern: '[' } }), 'قيمة')).toMatchObject({ ok: false });
  });
});

describe('master-E1 mapImportHeader — the §9.4 alias table', () => {
  it('maps every canonical alias', () => {
    const cases: Array<[string, string]> = [
      ['الاسم', 'nameAr'],
      ['اسم الطالب', 'nameAr'],
      ['الاسم الكامل', 'nameAr'],
      ['اسم التلميذ', 'nameAr'],
      ['الرقم الدراسي', 'universityId'],
      ['رقم القيد', 'universityId'],
      ['الرقم الجامعي', 'universityId'],
      ['رقم الهاتف', 'studentPhone'],
      ['هاتف الطالب', 'studentPhone'],
      ['رقم ولي الأمر', 'guardianPhone'],
      ['القسم', 'department'],
      ['التخصص', 'department'],
      ['الصف', 'grade'],
      ['الفصل', 'section'],
      ['السنة الدراسية', 'year'],
    ];
    for (const [header, expected] of cases) {
      expect(mapImportHeader(header), header).toBe(expected);
    }
  });

  it('folds Arabic variants: hamza seats, taa marbuta, diacritics, spacing', () => {
    expect(mapImportHeader('إسم الطالب')).toBe('nameAr'); // إ→ا
    expect(mapImportHeader('  اسم   الطالب  ')).toBe('nameAr'); // spacing
    expect(mapImportHeader('رقم ولي الامر')).toBe('guardianPhone'); // أ→ا
    expect(mapImportHeader('السنه الدراسيه')).toBe('year'); // ة→ه
    expect(mapImportHeader('اَلْقَسَم')).toBe('department'); // diacritics
  });

  it('returns null for empty and unrecognized headers', () => {
    expect(mapImportHeader('')).toBeNull();
    expect(mapImportHeader('   ')).toBeNull();
    expect(mapImportHeader('الطول بالسنتيمتر')).toBeNull();
    expect(mapImportHeader('Random Column')).toBeNull();
  });

  it('routes institution-specific headers to their custom-field key', () => {
    const custom = [
      { key: 'bus-number', labelAr: 'رقم الحافلة', importKeyAr: 'باص المدرسة', importKeyEn: 'Bus No' },
      { key: 'prev-school', labelAr: 'المدرسة السابقة', importKeyAr: null, importKeyEn: null },
    ];
    expect(mapImportHeader('باص المدرسة', custom)).toEqual({ custom: 'bus-number' });
    expect(mapImportHeader('Bus No', custom)).toEqual({ custom: 'bus-number' });
    expect(mapImportHeader('رقم الحافلة', custom)).toEqual({ custom: 'bus-number' }); // label fallback
    expect(mapImportHeader('المدرسة السابقة', custom)).toEqual({ custom: 'prev-school' });
  });

  it('never lets a custom field shadow a canonical alias', () => {
    const custom = [{ key: 'evil', labelAr: 'الاسم الكامل', importKeyAr: null, importKeyEn: null }];
    expect(mapImportHeader('الاسم الكامل', custom)).toBe('nameAr');
  });
});
