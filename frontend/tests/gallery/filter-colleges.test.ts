import { describe, expect, it } from 'vitest';
import { filterColleges, type FilterableCollege } from '../../src/pages/colleges/filter-colleges';

// r188: the fixture uses the fictional demo campuses (حرم المعرفة ·
// حرم الابتكار · حرم البيان) + an orphan city for the «مناطق أخرى»
// bucket — same grouping behavior, synthetic registry.
const colleges: FilterableCollege[] = [
  { city: 'حرم المعرفة', name: 'كلية الهندسة', nameEn: 'College of Engineering' },
  { city: 'حرم المعرفة', name: 'كلية الطب البشري', nameEn: 'Faculty of Human Medicine' },
  { city: 'حرم المعرفة', name: 'كلية تقنية المعلومات', nameEn: 'College of IT' },
  { city: 'حرم الابتكار', name: 'كلية العلوم', nameEn: 'College of Sciences' },
  { city: 'حرم الابتكار', name: 'كلية الاقتصاد', nameEn: 'College of Economics' },
  { city: 'حرم البيان', name: 'كلية الآداب', nameEn: 'College of Arts' },
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
    expect(keys[0]).toBe('حرم المعرفة');
    expect(keys[1]).toBe('حرم الابتكار');
    expect(keys[2]).toBe('حرم البيان');
    expect(keys[keys.length - 1]).toBe('مناطق أخرى');
  });

  it('groups orphan cities into "مناطق أخرى"', () => {
    const out = filterColleges(colleges, { query: '', campus: null });
    const others = out.byCampus.get('مناطق أخرى');
    expect(others?.length).toBe(1);
    expect(others?.[0]?.name).toBe('كلية هندسة الموارد الطبيعية');
  });

  it('drops empty groups', () => {
    const out = filterColleges(colleges, { query: '', campus: 'حرم المعرفة' });
    expect(out.byCampus.has('حرم الابتكار')).toBe(false);
    expect(out.byCampus.has('حرم البيان')).toBe(false);
    expect(out.byCampus.has('حرم المعرفة')).toBe(true);
  });

  it('filters by campus', () => {
    const out = filterColleges(colleges, { query: '', campus: 'حرم الابتكار' });
    expect(out.total).toBe(2);
    expect(out.byCampus.get('حرم الابتكار')?.length).toBe(2);
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
      { city: 'حرم المعرفة', name: 'كلية الهَنْـدَسة', nameEn: null },
    ];
    const out = filterColleges(list, { query: 'هندس', campus: null });
    expect(out.total).toBe(1);
  });

  /* r146 (T1-c F8): the canonical fold closes the inconsistency with
   * /search/global — a user typing the colloquial spelling «هندسه»
   * (ة→ه) now finds كلية الهندسة on the gallery too, not only in the
   * global search; and alif-maqsura ى in a name matches a query typed
   * with plain ي. The page-local normalizer this suite used to pin
   * folded diacritics only. */
  it('r146 — colloquial ة→ه and ى→ي spellings match via the canonical fold (parity with /search/global)', () => {
    const list: FilterableCollege[] = [
      { city: 'حرم المعرفة', name: 'كلية الهندسة', nameEn: null },
      { city: 'حرم المعرفة', name: 'كلية التقنى الطبية', nameEn: null },
    ];
    // ة typed as ه…
    expect(filterColleges(list, { query: 'هندسه', campus: null }).total).toBe(1);
    // ى in the name matched by a query typed with plain ي.
    expect(filterColleges(list, { query: 'التقني', campus: null }).total).toBe(1);
  });

  it('English match is case-insensitive', () => {
    const out = filterColleges(colleges, { query: 'engineering', campus: null });
    // "College of Engineering" + "Natural Resources Engineering"
    expect(out.total).toBe(2);
  });

  it('English match works with mixed case', () => {
    const out = filterColleges(colleges, { query: 'ECONOM', campus: null });
    expect(out.total).toBe(1);
    expect(out.byCampus.get('حرم الابتكار')?.[0]?.nameEn).toContain('Economics');
  });

  it('combines campus filter with search (logical AND)', () => {
    const out = filterColleges(colleges, { query: 'هندس', campus: 'حرم المعرفة' });
    expect(out.total).toBe(1);
    expect(out.byCampus.get('حرم المعرفة')?.[0]?.name).toBe('كلية الهندسة');
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
