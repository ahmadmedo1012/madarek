import { describe, expect, it } from 'vitest';
import { filterColleges, type FilterableCollege } from '../../src/pages/colleges/filter-colleges';

const colleges: FilterableCollege[] = [
  { city: 'الزاوية', name: 'كلية الهندسة', nameEn: 'College of Engineering' },
  { city: 'الزاوية', name: 'كلية الطب البشري', nameEn: 'Faculty of Human Medicine' },
  { city: 'الزاوية', name: 'كلية تقنية المعلومات', nameEn: 'College of IT' },
  { city: 'العجيلات', name: 'كلية العلوم', nameEn: 'College of Sciences' },
  { city: 'العجيلات', name: 'كلية الاقتصاد', nameEn: 'College of Economics' },
  { city: 'زوارة', name: 'كلية الآداب', nameEn: 'College of Arts' },
  { city: 'بئر الغنم', name: 'كلية هندسة الموارد الطبيعية', nameEn: 'Natural Resources Engineering' },
];

describe('filterColleges', () => {
  it('returns empty result for empty input', () => {
    const out = filterColleges([], { query: '', campus: null });
    expect(out.byCampus.size).toBe(0);
    expect(out.total).toBe(0);
  });

  it('returns full list grouped by canonical campus order when no filters', () => {
    const out = filterColleges(colleges, { query: '', campus: null });
    expect(out.total).toBe(7);
    const keys = Array.from(out.byCampus.keys());
    expect(keys[0]).toBe('الزاوية');
    expect(keys[1]).toBe('العجيلات');
    expect(keys[2]).toBe('زوارة');
    expect(keys[keys.length - 1]).toBe('مناطق أخرى');
  });

  it('groups orphan cities into "مناطق أخرى"', () => {
    const out = filterColleges(colleges, { query: '', campus: null });
    const others = out.byCampus.get('مناطق أخرى');
    expect(others?.length).toBe(1);
    expect(others?.[0]?.name).toBe('كلية هندسة الموارد الطبيعية');
  });

  it('drops empty groups', () => {
    const out = filterColleges(colleges, { query: '', campus: 'الزاوية' });
    expect(out.byCampus.has('العجيلات')).toBe(false);
    expect(out.byCampus.has('زوارة')).toBe(false);
    expect(out.byCampus.has('الزاوية')).toBe(true);
  });

  it('filters by campus', () => {
    const out = filterColleges(colleges, { query: '', campus: 'العجيلات' });
    expect(out.total).toBe(2);
    expect(out.byCampus.get('العجيلات')?.length).toBe(2);
  });

  it('Arabic substring match (no diacritics typed)', () => {
    const out = filterColleges(colleges, { query: 'هندس', campus: null });
    // matches both "كلية الهندسة" and "كلية هندسة الموارد الطبيعية"
    expect(out.total).toBe(2);
  });

  it('Arabic substring match strips tatweel + diacritics', () => {
    // "الهَنْـدَسة" — with explicit fatha + sukun + tatweel — should still match
    // since both query and target are normalized.
    const list: FilterableCollege[] = [
      { city: 'الزاوية', name: 'كلية الهَنْـدَسة', nameEn: null },
    ];
    const out = filterColleges(list, { query: 'هندس', campus: null });
    expect(out.total).toBe(1);
  });

  it('English match is case-insensitive', () => {
    const out = filterColleges(colleges, { query: 'engineering', campus: null });
    // "College of Engineering" + "Natural Resources Engineering"
    expect(out.total).toBe(2);
  });

  it('English match works with mixed case', () => {
    const out = filterColleges(colleges, { query: 'ECONOM', campus: null });
    expect(out.total).toBe(1);
    expect(out.byCampus.get('العجيلات')?.[0]?.nameEn).toContain('Economics');
  });

  it('combines campus filter with search (logical AND)', () => {
    const out = filterColleges(colleges, { query: 'هندس', campus: 'الزاوية' });
    expect(out.total).toBe(1);
    expect(out.byCampus.get('الزاوية')?.[0]?.name).toBe('كلية الهندسة');
  });

  it('returns zero total when query matches nothing', () => {
    const out = filterColleges(colleges, { query: 'xyzzy', campus: null });
    expect(out.total).toBe(0);
    expect(out.byCampus.size).toBe(0);
  });

  it('treats whitespace-only query as no filter', () => {
    const out = filterColleges(colleges, { query: '   ', campus: null });
    expect(out.total).toBe(7);
  });

  it('handles colleges with null nameEn', () => {
    const list: FilterableCollege[] = [
      { city: 'الزاوية', name: 'كلية الصيدلة', nameEn: null },
      { city: 'الزاوية', name: 'كلية التمريض', nameEn: undefined },
    ];
    const out = filterColleges(list, { query: 'صيدل', campus: null });
    expect(out.total).toBe(1);
    // English query against null nameEn is fine — Arabic name doesn't match either.
    const enOut = filterColleges(list, { query: 'pharm', campus: null });
    expect(enOut.total).toBe(0);
  });
});
