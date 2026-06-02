# Quickstart — Adopting the Colleges Gallery

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)

The fastest path from "I'm working on the colleges gallery or
homepage hero" to "my change ships and is consistent." Builds on the
foundation from `001-*` (motion primitives) and `002-*` (type roles +
chart palette).

---

## Where things live

```
frontend/src/pages/LandingPage.tsx              ← homepage hero badge → /colleges
frontend/src/pages/colleges/CollegePages.tsx    ← CollegesIndexPage + filter state
frontend/src/styles/colleges.css                ← card + grid + toolbar rules
frontend/src/hooks/useUrlQueryState.ts          ← URL ↔ state hook
frontend/src/data/colleges.config.ts            ← identity profiles (from 001-*)
specs/004-colleges-gallery/                     ← spec, plan, contracts
```

---

## Three things you'll do all the time

### 1. Make a homepage element link to the gallery

```tsx
// before
<span className="landing-hero-eyebrow">أكثر من 25 كلّيّة</span>

// after
<Link to="/colleges" className="landing-hero-eyebrow landing-hero-eyebrow--linked">
  <span>أكثر من 25 كلّيّة</span>
  <Icon icon={ArrowLeft} size={12} />
</Link>
```

Use `react-router-dom`'s `<Link>` so the gallery loads as a
client-side transition (`PageTransition` from `001-*` does the
cross-fade). Inherit the eyebrow's existing typography; the
`--linked` modifier just adds the trailing arrow + hover underline.

### 2. Filter the gallery via URL state

Inside `CollegesIndexPage`:

```tsx
import { useUrlQueryState } from '@/hooks/useUrlQueryState';
import { filterColleges } from './filter-colleges';

const { state, setQuery, setCampus, clear } = useUrlQueryState();
const data = collegesQuery.data ?? [];
const { byCampus, total } = useMemo(
  () => filterColleges(data, state),
  [data, state],
);
```

`useUrlQueryState` keeps `?q=…&campus=…` in sync. Reading is
constant-time; writing debounces by 100 ms inside the hook.

### 3. Apply an identity-profile accent to a card

```tsx
import { getCollegeIdentity } from '@/data/colleges.config';

const profile = getCollegeIdentity(college.id);
const accent = profile?.accent ?? null;

<Link
  to={`/colleges/${college.id}`}
  className="college-card"
  data-college-accent={accent ?? undefined}
  style={accent ? { ['--college-accent' as string]: accent } : undefined}
>
  ...
</Link>
```

The CSS rule already exists in `colleges.css`:

```css
.college-card[data-college-accent] {
  border-inline-start: 3px solid var(--college-accent, var(--rule));
}
```

Cards without a profile fall back to the neutral hairline. Never
invent an accent.

---

## Three things you must NOT do

1. Don't replace `CollegesIndexPage` — extend it. The existing
   city-grouped render is the foundation.
2. Don't paginate or "load more" the colleges. ~26 items load in
   a single payload; FR-005 forbids hiding any.
3. Don't add a server-side filter param. Filtering is client-side
   over the cached list (R-001).

---

## How to verify your change

1. **URL state round-trip**: type `هندس` in search, verify the URL
   becomes `/colleges?q=…`. Navigate away and back via browser
   back; verify the search box and result are restored.
2. **Filter combinations**: search `هندس` + tap `العجيلات` chip;
   confirm only colleges in العجيلات whose name contains "هندس".
3. **Empty state**: type `xyzzy` (no match); confirm a clear-
   filters action appears and clears both filters on click.
4. **Mobile**: 360 px viewport. Confirm chip strip scrolls
   horizontally inside itself, sticky-positioned at top of gallery
   while the rest of the page scrolls.
5. **Reduced motion**: DevTools → Rendering → emulate
   `prefers-reduced-motion: reduce`. Reload `/colleges`. Confirm
   no reveal animation runs; cards appear in final state.
6. **RTL**: switch to Arabic; confirm chip strip scrolls correctly
   and the leading-edge accent is on the right side of the card.
7. **Keyboard**: Tab from URL bar through search → chips → first
   card → last card. Confirm visible focus ring at every step.
8. **Accessibility**: filter the list; confirm an aria-live status
   reads `N نتيجة` after the result count changes (test with
   VoiceOver / NVDA).

---

## Common questions

| Question | Answer / Where to look |
|----------|------------------------|
| "Where do I add a new college?" | Backend `College` record. The gallery picks it up automatically — SC-010. |
| "How do I add a new campus?" | Add the city name to `CityName` union in the contract. Update the canonical order in `filterColleges`. Done. |
| "How do I change the count format?" | The cards already use `toLocaleString('ar-LY')`; for new locales, switch via the existing i18n pattern. |
| "What if a college is in a city that's not in our list?" | The filter normalizes to `'مناطق أخرى'`. No code change needed. |
| "Can I add advanced filters (program, year founded)?" | Out of scope for 004. UX-002 caps the interface at search + campus. |

---

## Commands you'll run locally

```bash
# Dev (frontend)
npm run dev:web

# Type-check
npm run -w frontend typecheck

# Unit tests (filter + URL hook)
npm run -w frontend test

# Build (verifies bundle budget)
npm run build

# Token discipline gates
npm run check:motion-tokens
npm run check:icons
```

---

## Reading order if you want the full picture

1. `spec.md` — what we're building and why.
2. `plan.md` — how it fits into the codebase.
3. `research.md` — why each decision (R-001..R-011).
4. `data-model.md` — Filter State, URL Query State, Filtered Result.
5. `contracts/gallery-state.md` — the public surface.

That's the whole gallery system.
