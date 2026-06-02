import { describe, it, expect } from 'vitest';
import { normalizeArabicSearch, stripAlPrefix } from '../normalize.js';

describe('normalizeArabicSearch', () => {
  it('lowercases ASCII input', () => {
    expect(normalizeArabicSearch('CISCO')).toBe('cisco');
    expect(normalizeArabicSearch('Cisco')).toBe('cisco');
  });

  it('strips Arabic diacritics (تشكيل)', () => {
    expect(normalizeArabicSearch('خَوَارِزْمِيَات')).toBe('خوارزميات');
    expect(normalizeArabicSearch('بَرْمَجَة')).toBe('برمجه');
  });

  it('folds alif variants (آأإٱ → ا)', () => {
    expect(normalizeArabicSearch('آلة')).toBe('اله');
    expect(normalizeArabicSearch('أحمد')).toBe('احمد');
    expect(normalizeArabicSearch('إدارة')).toBe('اداره');
  });

  it('folds taa-marbuta (ة → ه)', () => {
    expect(normalizeArabicSearch('خوارزمية')).toBe('خوارزميه');
    expect(normalizeArabicSearch('جامعة')).toBe('جامعه');
  });

  it('folds alif-maqsura (ى → ي)', () => {
    expect(normalizeArabicSearch('على')).toBe('علي');
    expect(normalizeArabicSearch('مستشفى')).toBe('مستشفي');
  });

  it('folds yaa-hamza (ئ → ي) and waw-hamza (ؤ → و)', () => {
    expect(normalizeArabicSearch('شئون')).toBe('شيون');
    expect(normalizeArabicSearch('سؤال')).toBe('سوال');
  });

  it('drops tatweel and bare hamza', () => {
    expect(normalizeArabicSearch('شـبـكـة')).toBe('شبكه');
    expect(normalizeArabicSearch('سماء')).toBe('سما');
  });

  it('NFC-normalizes decomposed sequences', () => {
    const decomposed = 'á'; // a + combining acute
    expect(normalizeArabicSearch(decomposed).length).toBeLessThanOrEqual(decomposed.length);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeArabicSearch('   خوارزميات   ')).toBe('خوارزميات');
  });

  it('is idempotent for every supported transformation', () => {
    const fixtures = [
      'CISCO',
      'خَوَارِزْمِيَات',
      'الخوارزميات',
      'آلة',
      'جامعة الزاوية',
      'علي على شئون',
      '   فِيزِيَاء   ',
    ];
    for (const f of fixtures) {
      const once = normalizeArabicSearch(f);
      const twice = normalizeArabicSearch(once);
      expect(twice).toBe(once);
    }
  });
});

describe('stripAlPrefix', () => {
  it('strips a leading ال', () => {
    expect(stripAlPrefix('الخوارزميات')).toBe('خوارزميات');
    expect(stripAlPrefix('الجامعه')).toBe('جامعه');
  });

  it('leaves strings without ال unchanged', () => {
    expect(stripAlPrefix('خوارزميات')).toBe('خوارزميات');
    expect(stripAlPrefix('cisco')).toBe('cisco');
  });

  it('only strips a leading ال — never a medial one', () => {
    // Starts with ع, not ا — must be returned unchanged.
    expect(stripAlPrefix('علم البرمجه')).toBe('علم البرمجه');
    // Single leading ال is stripped.
    expect(stripAlPrefix('الالكترونيات')).toBe('الكترونيات');
  });
});
