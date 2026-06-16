# Phase 1 — Data Model: Colleges Gallery

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)

Composition feature; no database tables. The "data" is filter state +
URL state. Three logical entities: **Filter State**, **URL Query
State**, **Filtered Result**. The college data shape itself is the
existing `CollegeListItem` from the API and is unchanged.

---

## 1. Filter State

The in-memory state of the gallery's controls.

### Fields

| Field      | Type                                | Required | Notes |
|------------|-------------------------------------|----------|-------|
| `query`    | string                              | yes      | Live search string. Trimmed before use. |
| `campus`   | string \| null                      | yes      | City name (Arabic). `null` = "all campuses". |

### Validation Rules

- `query` may be any Unicode string. Empty string and whitespace-
  only strings are equivalent to "no search."
- `campus`, if non-null, MUST match one of the canonical campus
  names. Unknown values are normalized to `null` ("all").

### Example

```ts
{ query: 'هندس', campus: 'الزاوية' }
{ query: '',     campus: null      }
```

---

## 2. URL Query State

The serialized form of Filter State for the URL.

### Fields

| Param      | Type             | Notes |
|------------|------------------|-------|
| `q`        | URI-encoded text | Empty value → param stripped from URL |
| `campus`   | URI-encoded text | Empty / "all" → param stripped from URL |

### Serialization Rules

- `state.query.trim() === ''` → omit `q` param.
- `state.campus === null` → omit `campus` param.
- Both omitted → URL is exactly `/colleges`.

### Example URLs

```
/colleges
/colleges?q=هندس
/colleges?campus=الزاوية
/colleges?q=هندس&campus=الزاوية
```

### Round-trip Guarantee

`urlToState(stateToUrl(state))` MUST equal `state` for every valid
state — no information is lost in the URL. Verified by unit test.

---

## 3. Filtered Result

The output of `filterColleges(list, state)`. A pure function over
the cached `CollegeListItem[]` and the current Filter State.

### Function Signature

```ts
filterColleges(
  list: CollegeListItem[],
  state: FilterState,
): { byCampus: Map<string, CollegeListItem[]>; total: number }
```

### Behavior

- Returns the colleges grouped by campus (`byCampus`) and a flat
  total count (`total`).
- Group keys preserve the canonical campus order (Setup-time
  constant): الزاوية → العجيلات → زوارة → أبو عيسى → ناصر →
  مناطق أخرى.
- Empty groups are removed (a campus that filters to zero colleges
  is not rendered).
- `total` is the sum of all `byCampus` group sizes.

### Filter Pipeline

For each college in `list`:

1. **Campus filter**: if `state.campus !== null`, drop colleges
   whose `city !== state.campus`.
2. **Query filter**: if `state.query.trim() !== ''`:
   - Normalize the query (Arabic: strip diacritics + tatweel;
     English: lowercase).
   - Normalize the college's `name` and `nameEn` the same way.
   - Keep the college if either normalized name contains the
     normalized query as a substring.
3. Group the surviving colleges by `city`, applying the canonical
   order. Unknown / orphan cities sort into "مناطق أخرى" at the end.

### Validation Rules

- `filterColleges` is **pure** — no DOM, no network, no React.
- `filterColleges([], state)` returns `{ byCampus: new Map(), total: 0 }`.
- `filterColleges(list, { query: '', campus: null })` returns the
  full list grouped — same shape the gallery uses today.

---

## 4. Identity-Profile Accent Resolution

Per FR-011, each card surfaces an accent stripe when a profile
exists. The data resolution is:

```ts
function getAccentForCollege(college: CollegeListItem): string | null {
  // college.id may be a UUID; we map by slug if a slug-bearing
  // profile exists in colleges.config.ts. If not, return null.
  const profile = getCollegeIdentity(college.slug ?? college.id);
  return profile?.accent ?? null;
}
```

**Note**: Today `CollegeListItem` exposes `id` and `name`; whether a
`slug` field exists in the API payload is checked at implementation
time. If absent, the lookup uses `id` and the `colleges.config.ts`
matches by id. Either path satisfies FR-011.

### Card Surface Rule

```css
.college-card[data-college-accent] {
  border-inline-start: 3px solid var(--college-accent, var(--rule));
}
```

When the accent is null, `--college-accent` is unset and the
fallback `var(--rule)` (a neutral hairline) is used. Never
invented.

---

## 5. Skeleton Shape (composition contract)

The skeleton state mirrors the gallery's layout:

- 1 `<header>`-shaped block (page title + subtitle text-skeletons)
- 6 campus blocks, each with:
  - 1 `<header>` text-skeleton (campus name + count)
  - 6 card-skeletons (`<Skeleton variant="kpi" />`) in the same
    grid as real cards

Render time MUST be ≤ 100 ms after page mount (FR-019). CLS ≤ 0.05
when content swaps in (NFR-002).

---

## 6. Live-Region Announcement

A single hidden status node:

```html
<div role="status" aria-live="polite" aria-atomic="true" class="visually-hidden">
  {arabic ? `${total} نتيجة` : `${total} results`}
</div>
```

Updated only when `total` changes (computed via React's natural
re-render — no extra mechanism). Polite announcements never
interrupt user typing.
