# Contract: Gallery State

**Date**: 2026-06-02
**Owner**: `frontend/src/pages/colleges/CollegePages.tsx` + `frontend/src/hooks/useUrlQueryState.ts`

This contract defines the gallery's filter state shape, the URL
serialization, and the public surface of the supporting hooks +
pure functions. Any consumer of the gallery state — tests,
analytics, or future pages — relies on these names and shapes.

## Filter State (TypeScript shape)

```ts
export type FilterState = {
  /** Live search string, trimmed by the consumer. */
  query: string;
  /** Campus filter; null = "all campuses". */
  campus: CityName | null;
};

export type CityName =
  | 'الزاوية'
  | 'العجيلات'
  | 'زوارة'
  | 'أبو عيسى'
  | 'ناصر'
  | 'مناطق أخرى';
```

`CityName` is a stable union; orphan / unknown city names returned
by the API normalize to `'مناطق أخرى'` at filter time.

## URL Serialization

| Filter State                              | URL                                        |
|-------------------------------------------|--------------------------------------------|
| `{ query: '',     campus: null }`         | `/colleges`                                |
| `{ query: 'هندس', campus: null }`         | `/colleges?q=%D9%87%D9%86%D8%AF%D8%B3`     |
| `{ query: '',     campus: 'الزاوية' }`    | `/colleges?campus=%D8%A7%D9%84%D8%B2%D8%A7%D9%88%D9%8A%D8%A9` |
| `{ query: 'هندس', campus: 'العجيلات' }`   | `/colleges?q=%D9%87%D9%86%D8%AF%D8%B3&campus=%D8%A7%D9%84%D8%B9%D8%AC%D9%8A%D9%84%D8%A7%D8%AA` |

Empty / null values strip the param entirely. Round-trip:
`urlToState(stateToUrl(s)) === s` for every valid state.

## Public Hook: `useUrlQueryState`

```ts
/**
 * Two-way binding between the URL search params and Filter State.
 * Reads from useSearchParams; writes back via setSearchParams
 * with `replace: false` so history accumulates only intentional
 * navigation, not every keystroke.
 */
export function useUrlQueryState(): {
  state: FilterState;
  setQuery: (q: string) => void;
  setCampus: (c: CityName | null) => void;
  clear: () => void;
};
```

### Behavior

- `state` is derived from `useSearchParams()`; reading is constant-
  time.
- `setQuery` and `setCampus` write a new URL. The URL update is
  deferred via `useDebouncedValue<string>` for `setQuery` (100 ms)
  to avoid history spam during typing.
- `clear()` strips both params and lands on `/colleges` cleanly.
- Hook is SSR-safe: returns a default state if no router context
  is present (defensive only — the component lives under
  `<BrowserRouter>`).

## Pure Function: `filterColleges`

```ts
/**
 * Pure, synchronous filter over the cached colleges list.
 * Called inside a useMemo on every render of CollegesIndexPage.
 */
export function filterColleges(
  list: CollegeListItem[],
  state: FilterState,
): FilterResult;

export type FilterResult = {
  byCampus: Map<CityName, CollegeListItem[]>;
  total: number;
};
```

### Behavior

1. Apply campus filter (drop colleges whose `city !== state.campus`
   when `state.campus !== null`).
2. Apply query filter (substring match on normalized Arabic + English
   names).
3. Group survivors by `city`, normalizing unknown cities to
   `'مناطق أخرى'`.
4. Order groups: الزاوية → العجيلات → زوارة → أبو عيسى → ناصر →
   مناطق أخرى.
5. Drop empty groups.
6. Return `byCampus` (Map preserves insertion order) and `total`.

### Normalization rules

```ts
// Arabic: strip diacritics + tatweel
const normAr = (s: string) =>
  s.normalize('NFD').replace(/[ً-ٟـ]/g, '');

// English: lowercase
const normEn = (s: string) => s.toLowerCase();
```

A college matches a query `q` if either:
- `normAr(c.name).includes(normAr(q))`, or
- `normEn(c.nameEn ?? '').includes(normEn(q))`.

## DOM Contract: Card Accent

The college card surfaces an identity-profile accent via:

```tsx
<Link
  to={`/colleges/${c.id}`}
  className="college-card"
  data-college-accent={accent ?? undefined}
  style={accent ? { ['--college-accent']: accent } as React.CSSProperties : undefined}
>
  ...
</Link>
```

CSS:

```css
.college-card[data-college-accent] {
  border-inline-start: 3px solid var(--college-accent, var(--rule));
}
```

When the profile is absent, neither the attribute nor the inline
custom property is set; the rule does not match; the card falls
back to its default border treatment.

## DOM Contract: Toolbar

```tsx
<div className="gallery-toolbar" role="search">
  <label className="visually-hidden" htmlFor="gallery-search">ابحث عن كلية</label>
  <input
    id="gallery-search"
    type="search"
    className="input gallery-search-input"
    placeholder="ابحث عن كلية…"
    value={query}
    onChange={e => setQuery(e.target.value)}
    aria-controls="gallery-results"
  />
  <div className="gallery-chip-strip" role="tablist" aria-label="فلترة حسب الحرم">
    {chips.map(chip => (
      <button
        key={chip.value ?? 'all'}
        role="tab"
        aria-selected={state.campus === chip.value}
        className={`chip${state.campus === chip.value ? ' chip-on' : ''}`}
        onClick={() => setCampus(chip.value)}
      >{chip.label}</button>
    ))}
  </div>
</div>
<div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
  {`${total} نتيجة`}
</div>
<div id="gallery-results">{/* the campus-grouped grid */}</div>
```

## Versioning

This contract is **v1.0.0**.

- Adding an optional field to `FilterState`: MINOR.
- Renaming `query` / `campus`: MAJOR.
- Adding a new campus to `CityName`: MINOR.
- Changing the URL param names: MAJOR.
