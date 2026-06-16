# Quickstart — Adopting the Premium Experience & Motion System

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)

This is the fastest path from "I'm working on a Madrak page" to "my page is
on-brand, accessible, and motion-correct." Read it once; you will not need
to read it again.

---

## Where things live

```
frontend/src/components/motion/      ← motion primitives (you import from here)
frontend/src/styles/tokens.css       ← motion + interaction tokens (you reference these in CSS)
frontend/src/styles/motion.css       ← keyframes, focus-ring, skeleton shimmer
frontend/src/data/colleges.config.ts ← college identity profiles
specs/001-premium-motion-system/     ← this spec, plan, contracts
```

---

## Five things you'll do all the time

### 1. Animate a number on a dashboard

```tsx
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';

<AnimatedNumber value={kpi.totalStudents} tabular />
```

The counter starts when the element enters the viewport, retargets smoothly
on data updates, formats with the current locale (Arabic-Indic numerals
in Arabic), and snaps to the value when reduced-motion is on. You don't
do anything else.

### 2. Reveal sections as they scroll into view

```tsx
import { Reveal, RevealGroup } from '@/components/motion/Reveal';

<RevealGroup>
  <Reveal><Hero /></Reveal>
  <Reveal distance="large"><Stats /></Reveal>
  <Reveal><CallToAction /></Reveal>
</RevealGroup>
```

Reveals fire once per element. Above-the-fold content renders revealed.
Reduced-motion bypasses the keyframe.

### 3. Show a skeleton instead of a blank pane

```tsx
import { Skeleton, SkeletonGroup } from '@/components/motion/Skeleton';

{isLoading ? (
  <SkeletonGroup>
    <Skeleton variant="kpi" />
    <Skeleton variant="kpi" />
    <Skeleton variant="chart" height="240px" />
  </SkeletonGroup>
) : (
  <Content data={data} />
)}
```

Pick the variant that roughly matches your final layout. The skeleton
keeps CLS ≈ 0 when data swaps in.

### 4. Make a button feel right

You don't do anything in JSX — the platform's `<Button>` (and any other
primitive in `frontend/src/components/primitives/`) already consumes
the interaction-state tokens. If you're styling a custom interactive
element, follow this pattern:

```css
.my-thing {
  transition:
    transform var(--motion-duration-short) var(--motion-ease-standard),
    box-shadow var(--motion-duration-short) var(--motion-ease-standard);
}
.my-thing:hover {
  transform: translateY(var(--state-card-hover-translate));
  box-shadow: var(--state-card-hover-elevation);
}
.my-thing:focus-visible {
  outline: none;
  box-shadow: var(--state-focus-ring);
}
.my-thing:active {
  transform: scale(var(--state-card-pressed-scale));
}
.my-thing[disabled],
.my-thing[aria-disabled="true"] {
  opacity: var(--state-card-disabled-opacity);
  pointer-events: none;
  cursor: not-allowed;
}
```

### 5. Style something that needs the college's accent

If the page is rendered under a college route, a `data-college="<slug>"`
attribute is set on the page root and `--college-accent` (and friends)
are scoped to it. Just consume the variable:

```css
.college-hero h1 {
  color: var(--college-accent-fg);
  border-bottom: 3px solid var(--college-accent);
}
```

Don't reach for the hex value. Don't reach for the slug.

---

## Five things you must NOT do

1. Do not introduce a new animation library (framer-motion, motion-one,
   GSAP). Bundle budget violation per Principle VI.
2. Do not write raw durations (`200ms`, `0.3s`) or raw easings
   (`ease-in-out`, `cubic-bezier(...)`) in CSS or inline styles. Use
   `--motion-duration-*` and `--motion-ease-*` tokens.
3. Do not write a custom hover/focus/pressed treatment for a primitive
   that already has one. Extend the token if missing; do not fork.
4. Do not mount route content outside `<PageTransition>`. The shell
   stays put; the outlet animates.
5. Do not animate two elements competing for attention in the same
   viewport. One focal motion at a time.

---

## How to verify your change is on-brand

1. **Visual**: open the route in the browser, hover and tab through
   every interactive element. Compare against the same gestures on
   `/student/dashboard` and `/owner/colleges`. They should feel
   identical.
2. **Reduced motion**: in DevTools, Rendering panel, set
   "Emulate CSS media feature prefers-reduced-motion" → "reduce". Reload.
   No motion should play; counters should snap; reveals should appear
   already-revealed.
3. **RTL**: switch the platform language to Arabic. Confirm directional
   motion (drawers, indicators, slides) mirrors correctly.
4. **Keyboard**: tab through the page from the URL bar. Every focusable
   element shows the focus ring. No tab traps.
5. **Mobile**: in DevTools, switch to a 360 px viewport. Confirm layout
   holds, motion is calm, no horizontal scroll.

---

## When you hit a question

| Question | Answer / Where to look |
|----------|------------------------|
| "What duration should this transition use?" | Match the closest semantic in `contracts/motion-tokens.md`. If none fits, that's a token gap — flag it in PR. |
| "I need a new interaction-state treatment." | Propose extending `contracts/interaction-tokens.md`. Don't fork in your component. |
| "I'm adding a new college." | Follow `contracts/college-identity-profile.md` § Adding a New College. No code change required. |
| "My counter restarts from zero on every render." | You're remounting the component. Memoize the parent or move state higher. |
| "My reveal fires twice." | You probably wrapped a `<Reveal>` around a route boundary that remounts. Place reveals inside the route, not around it. |
| "Reduced-motion isn't suppressing my animation." | Confirm your CSS uses `--motion-duration-*`, not raw values. Raw values bypass the reduced-motion override. |
| "How do I know my change passed the bundle budget?" | The CI build report posts the gzipped delta on the PR. > 8 KB add fails the gate. |

---

## Commands you'll run locally

```bash
# Dev server (frontend)
npm run dev:web

# Type-check the frontend
npm run -w frontend typecheck

# Build (verifies bundle budget locally)
npm run build

# Validate college identity profiles (when you add or edit one)
npm run -w frontend validate:colleges    # script added in tasks phase
```

---

## What this feature deliberately does NOT change

- Business logic, permissions, route structure: untouched.
- Backend schemas: untouched (a follow-up may move College Identity
  fields to the database; tracked separately).
- The existing `tokens.css` and `polish.css` files: extended, not
  replaced. Old code still works during gradual migration.
- The way you author pages (React + react-router-dom + react-query):
  unchanged. The motion primitives plug in as components.

---

## Reading order if you want the full picture

1. `spec.md` — what we're building and why.
2. `plan.md` — how it fits into the codebase.
3. `research.md` — why we made each technical call.
4. `data-model.md` — the design data you'll touch.
5. `contracts/motion-tokens.md` — the canonical token list.
6. `contracts/interaction-tokens.md` — the canonical interaction tokens.
7. `contracts/motion-primitives.tsx.md` — the React API surface.
8. `contracts/college-identity-profile.md` — per-college identity.

That's the whole system.
