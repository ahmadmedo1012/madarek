/**
 * filterColleges — pure, synchronous filter for the gallery.
 *
 * See specs/004-colleges-gallery/contracts/gallery-state.md
 * and specs/004-colleges-gallery/data-model.md.
 *
 * No DOM, no network, no React. Trivially testable in isolation.
 */

export type CityName =
  | 'الزاوية'
  | 'العجيلات'
  | 'زوارة'
  | 'أبو عيسى'
  | 'ناصر'
  | 'مناطق أخرى';

export type FilterState = {
  query: string;
  campus: CityName | null;
};

export type FilterResult<T> = {
  byCampus: Map<CityName, T[]>;
  total: number;
};

/** Canonical campus order — main campus first, orphans last. */
export const CAMPUS_ORDER: ReadonlyArray<CityName> = [
  'الزاوية',
  'العجيلات',
  'زوارة',
  'أبو عيسى',
  'ناصر',
  'مناطق أخرى',
];

/** Strip Arabic diacritics + tatweel for diacritic-insensitive search. */
function normalizeArabic(s: string): string {
  // NFD normalization splits composed Arabic into base + diacritics; then we
  // drop diacritic codepoints (U+064B–U+065F) and tatweel (U+0640).
  return s.normalize('NFD').replace(/[ً-ٟـ]/g, '');
}

/** Lowercase English / Latin for case-insensitive search. */
function normalizeEnglish(s: string): string {
  return s.toLowerCase();
}

/** Normalize an unknown city name to a canonical CityName, or fall back. */
function normalizeCity(city: string | null | undefined): CityName {
  const known = (CAMPUS_ORDER as ReadonlyArray<string>).indexOf(city ?? '');
  return known >= 0 ? (CAMPUS_ORDER[known]!) : 'مناطق أخرى';
}

/**
 * The minimum shape filterColleges needs from a college.
 * Generic so it works against `CollegeListItem` from CollegePages.tsx
 * without importing that interface here.
 */
export type FilterableCollege = {
  city: string;
  name: string;
  nameEn?: string | null;
};

/**
 * Filter + group colleges by campus.
 *
 * @param list  - the full college list (cached from /api/colleges)
 * @param state - current filter state
 * @returns     - { byCampus: Map<CityName, T[]> in canonical order, total }
 */
export function filterColleges<T extends FilterableCollege>(
  list: ReadonlyArray<T>,
  state: FilterState,
): FilterResult<T> {
  const trimmedQuery = state.query.trim();
  const queryAr = trimmedQuery ? normalizeArabic(trimmedQuery) : '';
  const queryEn = trimmedQuery ? normalizeEnglish(trimmedQuery) : '';

  // 1 + 2: campus + query filter in a single pass.
  const survivors: T[] = [];
  for (const c of list) {
    const cityNorm = normalizeCity(c.city);
    if (state.campus !== null && cityNorm !== state.campus) continue;

    if (trimmedQuery) {
      const arHit = normalizeArabic(c.name).includes(queryAr);
      const enHit = c.nameEn ? normalizeEnglish(c.nameEn).includes(queryEn) : false;
      if (!arHit && !enHit) continue;
    }

    survivors.push(c);
  }

  // 3 + 4 + 5: group by city, preserve canonical order, drop empty groups.
  const byCampus = new Map<CityName, T[]>();
  // Seed map in canonical order so iteration order is predictable.
  for (const city of CAMPUS_ORDER) byCampus.set(city, []);
  for (const c of survivors) {
    const city = normalizeCity(c.city);
    byCampus.get(city)!.push(c);
  }
  // Drop empty groups.
  for (const [city, items] of byCampus) {
    if (items.length === 0) byCampus.delete(city);
  }

  return { byCampus, total: survivors.length };
}
