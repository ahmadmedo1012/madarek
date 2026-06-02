# Phase 0 — Research: Colleges Gallery

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)
**Spec**: [spec.md](./spec.md)

This document resolves the open technical decisions from the Technical
Context. Goal: enter Phase 1 with no `NEEDS CLARIFICATION` markers.

---

## R-001 — Filter strategy: client-side or server-side?

**Decision**: **Client-side.** All ~26 colleges are already fetched in
a single `/api/colleges` call. Filtering happens entirely in the
browser via `Array.filter()`. No new endpoints, no new query params
on the API.

**Rationale**:
1. Dataset is tiny (~26 colleges, < 5 KB JSON). Server-side filtering
   would add network round-trips with zero perceptual benefit.
2. The existing `useQuery` already caches the full list with
   `staleTime: 5 * 60_000`. Filtering is just a `useMemo` over the
   cached array.
3. URL-state filter (FR-017) lets us share filtered views without
   the API changing.

**Alternatives considered**:
- **Server-side query params**: would require API changes;
  zero-value at this dataset size.
- **Hybrid (server caches list, client filters)**: that's what we
  have already.

---

## R-002 — URL state shape

**Decision**: Two query params:
- `?q=<search>` — URL-encoded search string
- `?campus=<city>` — URL-encoded city slug (Arabic city name); empty
  / absent means "all campuses"

`useSearchParams` from `react-router-dom` is the read/write source.
Empty values strip the param entirely so the URL stays clean
(`/colleges` not `/colleges?q=&campus=`).

**Rationale**:
1. `useSearchParams` is already in the dependency tree; zero new
   imports.
2. Two params cover every filter combination the spec requires.
3. URL becomes shareable without further work (FR-017).

**Alternatives considered**:
- **Path segments** (`/colleges/الزاوية`): conflicts with
  `/colleges/<id>` route. Rejected.
- **Single combined param** (`?filter=q:هندس|campus:الزاوية`):
  unparseable at a glance. Rejected.

---

## R-003 — Search debounce

**Decision**: 100 ms debounce via a small `useDebouncedValue<T>`
hook. The input is controlled (immediate visual feedback as you
type), but the filter result is computed off the debounced value.

**Rationale**:
1. 100 ms is below the perceptual instant threshold from `001-*`,
   so the user never feels lag.
2. Avoids re-rendering the grid on every keystroke for slow
   typists.
3. URL is updated on the debounced value, not the live one — so
   the back button doesn't accumulate intermediate states.

**Alternatives considered**:
- **No debounce**: works fine at 26 items but sets a bad pattern.
- **300 ms**: standard for autocomplete; too slow here because the
  filter is local.

---

## R-004 — Search match algorithm

**Decision**: Substring match with normalization:
- Arabic input → strip diacritics + tatweel (kashida) before compare.
- English input → `String.prototype.toLowerCase()` before compare.
- Match against both `name` (Arabic) and `nameEn` (English) of each
  college.
- Result: a college matches if either name contains the normalized
  query as a substring.

Implementation lives in a pure function `filterColleges(list, query,
campus)` — testable in isolation.

**Rationale**:
1. Substring is what visitors expect ("هندس" → matches "كلية الهندسة"
   and "كلية هندسة الموارد"). No need for fuzzy matching.
2. Diacritic-insensitivity lets users type without the marks (FR-014).
3. Pure function = trivial unit tests.

**Alternatives considered**:
- **Fuzzy match (Levenshtein, fuse.js)**: bundle cost; over-matches
  on small dataset.
- **Tokenized match**: marginal benefit at this scale.

---

## R-005 — Campus filter chip strip on mobile

**Decision**: Horizontally-scrolling chip strip with
`scroll-snap-type: x mandatory` and a sticky position at the top of
the gallery (`position: sticky; top: var(--topbar-h);`). On desktop
the chips wrap as a wrap-flex.

**Rationale**:
1. 6 campus chips + "all" = 7. Fits two rows on mobile but feels
   crowded. Horizontal scroll keeps the strip on one line.
2. Sticky-on-mobile keeps filters reachable without thumb travel
   to the top of the page on long-scroll.
3. `scroll-snap` provides the native carousel feel without a
   carousel library.

**Alternatives considered**:
- **Modal filter sheet**: heavier, fewer chip-strip wins.
- **Dropdown select**: hides the structure that the user came to
  see.

---

## R-006 — Identity profile accent on cards

**Decision**: A 3 px accent stripe on the leading edge (inset-inline-
start) of each college card, applied via the existing `data-college=
"<slug>"` mechanism from `001-*`. Cards without a profile get a
neutral hairline (`var(--rule)`) — never invented color.

**Rationale**:
1. Reuses the `001-*` College Identity contract — zero new tokens.
2. Leading-edge stripe is the calmest accent treatment (vs. full
   border or top stripe); reads as "tagged" not "themed."
3. Profiles are gradually being filled in; this design degrades
   gracefully when a profile is absent.

**Alternatives considered**:
- **Full background tint**: too dominant; competes with text
  contrast.
- **Top stripe**: works visually but conflicts with hover-lift
  shadow direction.

---

## R-007 — Skeleton shape

**Decision**: Skeleton renders 6 campus header placeholders + a
3-row × 3-col card grid placeholder. Uses `<Skeleton>` primitive
from `001-*` with `variant="kpi"` for cards (close enough to the
final card aspect) and `variant="text"` for the headers.

**Rationale**:
1. Matches the gallery's actual shape: campus header → grid → next
   campus.
2. Uses existing primitive; no new variant needed.
3. CLS ≈ 0 because skeleton card height ≈ real card height.

**Alternatives considered**:
- **Single page-level spinner**: fails FR-019 (mirror layout).
- **Bespoke skeleton**: reinvents the existing primitive.

---

## R-008 — Homepage badge upgrade

**Decision**: Convert the existing `<span>أكثر من 25 كلّيّة</span>`
inside the hero into a `<Link to="/colleges">` consuming the
existing `landing-hero-eyebrow` styles plus a new `--linked` modifier
that adds underline-on-hover + a trailing arrow icon (`Icon icon={ArrowLeft}`
mirrored in RTL). Focus ring inherits from the universal
`:focus-visible` rule shipped in `001-*`.

**Rationale**:
1. Smallest possible change to LandingPage.tsx.
2. The existing eyebrow class is already used by other hero pills;
   the modifier opt-in keeps non-link pills static.
3. `react-router-dom`'s `Link` handles client-side navigation
   without page reload — the gallery loads fast.

**Alternatives considered**:
- **`<a href>` raw**: triggers full page reload; rejected.
- **Adding the link to the entire badge area as a wrapper**: harder
  to apply hover styles cleanly.

---

## R-009 — Number formatting

**Decision**: Counts already render as `c.studentCount.toLocaleString
('ar-LY')` etc. Keep that pattern; add `.tabular-nums` class
(from `002-*`) to the count chips so column widths stay aligned at a
glance.

**Rationale**: Existing implementation is correct; adding
`.tabular-nums` is a 1-line change with high visible benefit.

---

## R-010 — `aria-live` filter announcement

**Decision**: A single visually-hidden `<div role="status" aria-live=
"polite" aria-atomic="true">` rendered once at the top of the gallery,
updated whenever the filter result count changes. Text:
`{count} نتيجة` in Arabic / `{count} results` in English.

**Rationale**:
1. Standard pattern; one node, one update.
2. `polite` doesn't interrupt the user's typing.
3. Tied to the same `useMemo` that produces the filtered list, so
   it can never get out of sync.

**Alternatives considered**:
- **Per-card `aria-live`**: chaos; excessive announcements.
- **Toast on filter change**: noisy.

---

## R-011 — College count for the homepage badge (FR-004)

**Decision**: Keep the marketing-friendly "أكثر من 25 كلّيّة" string
literal but add an inline comment `// real UoZ count: 26 (2026-06).
Marketing string intentionally rounds down for resilience.` This
satisfies FR-004's "documented as such in code" branch.

**Rationale**:
1. Dynamic count requires a render-time fetch on the public hero,
   adding network cost for one number that doesn't change weekly.
2. "أكثر من 25" is correct as long as the real number stays ≥ 26;
   updating the comment when the count drifts is a one-line PR.

**Alternatives considered**:
- **Server-rendered with the real count**: out of scope for a CSR
  app; unnecessary complexity.
- **`<AnimatedNumber value={collegeCount} />`**: requires the API
  to load on the public hero; would slow first-paint.

---

## Summary of decisions

| ID    | Decision                                                                  |
|-------|---------------------------------------------------------------------------|
| R-001 | Client-side filtering over the cached `/api/colleges` payload             |
| R-002 | `?q=…&campus=…` via `useSearchParams`; empty values strip the param       |
| R-003 | 100 ms debounce on search via `useDebouncedValue<T>`                      |
| R-004 | Substring match + Arabic diacritic stripping + English lowercasing        |
| R-005 | Horizontal chip strip with scroll-snap, sticky on mobile                  |
| R-006 | 3 px leading-edge accent stripe via `data-college` + `--college-accent`   |
| R-007 | `Skeleton` primitive with variant="kpi" for cards + variant="text" for headers |
| R-008 | `<Link to="/colleges">` modifier on the existing `landing-hero-eyebrow`   |
| R-009 | Keep `toLocaleString('ar-LY')`; add `.tabular-nums` to count chips        |
| R-010 | One `aria-live="polite"` status node tied to filtered-count changes       |
| R-011 | Static "أكثر من 25 كلّيّة" with inline-comment justification              |

All `NEEDS CLARIFICATION` markers from the Technical Context are
resolved. Ready for Phase 1.
