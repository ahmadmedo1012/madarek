# Contract: Motion React Primitives

**Date**: 2026-06-02
**Owner**: `frontend/src/components/motion/`

The motion primitives are the **only** sanctioned way to deliver page
transitions, scroll reveals, animated counters, and skeletons in Madrak.
Pages and components MUST consume these primitives rather than rolling
their own equivalents.

## File Layout

```
frontend/src/components/motion/
├── PageTransition.tsx
├── Reveal.tsx                    (exports Reveal + RevealGroup)
├── AnimatedNumber.tsx
├── Skeleton.tsx                  (exports Skeleton + SkeletonGroup)
└── useReducedMotion.ts
```

---

## `PageTransition`

Wraps the route outlet to provide a consistent cross-fade + small-lift on
every navigation. Mounted once at the application shell level.

### API

```ts
type PageTransitionProps = {
  children: React.ReactNode;
  /** Override the default transition name (rare). */
  transitionName?: string;
};

export function PageTransition(props: PageTransitionProps): JSX.Element;
```

### Behavior

- On `useLocation` change, calls `document.startViewTransition(...)` if the
  API is available. The new route renders inside the transition closure.
- On unsupported browsers, falls back to a CSS class
  (`is-route-transitioning`) on the outlet that triggers
  `--motion-duration-page` cross-fade keyframes from `motion.css`.
- MUST NOT remount the persistent shell (header, side navigation, footer).
  Place `<PageTransition>` *inside* the shell, around the route outlet only.
- Honors `prefers-reduced-motion` via `useReducedMotion()` — collapses to
  an 80 ms fade.
- Cancels in-flight transitions cleanly when navigation happens during a
  transition (Edge Case).

### Usage

```tsx
// in AppShell.tsx
<Shell>
  <Sidebar />
  <Main>
    <PageTransition>
      <Outlet />
    </PageTransition>
  </Main>
</Shell>
```

---

## `Reveal` and `RevealGroup`

Reveal a section once when it enters the viewport. Group siblings to
stagger their entrance.

### API

```ts
type RevealProps = {
  children: React.ReactNode;
  /** Element to render. Default: 'div'. */
  as?: keyof JSX.IntrinsicElements;
  /** Reveal distance. Default: 'medium'. */
  distance?: 'small' | 'medium' | 'large';
  /** Direction. Default: 'up'. */
  direction?: 'up' | 'down' | 'logical-start' | 'logical-end';
  /** IntersectionObserver threshold. Default: 0. */
  threshold?: number;
  /** Set automatically by RevealGroup; do not pass manually. */
  staggerIndex?: number;
  /** Class forwarding. */
  className?: string;
};

export function Reveal(props: RevealProps): JSX.Element;

type RevealGroupProps = {
  children: React.ReactNode;
  /** Override per-step delay. Default: var(--motion-stagger-step). */
  staggerStep?: string;
  /** Override max staggered children. Default: var(--motion-stagger-cap). */
  staggerCap?: number;
};

export function RevealGroup(props: RevealGroupProps): JSX.Element;
```

### Behavior

- `Reveal` initializes with `data-revealed="false"`. On first viewport entry,
  switches to `data-revealed="true"` and disconnects its observer (one-shot,
  per FR-021).
- On mount, if the bounding rect is already inside the viewport, sets
  `data-revealed="true"` synchronously and skips the keyframe (FR-023).
- `RevealGroup` enumerates direct `Reveal` children at render time and
  passes a derived `staggerIndex` to each, capped at `var(--motion-stagger-cap)`.
- CSS keyframe lives in `motion.css`; this component only sets attributes
  and CSS custom properties (`--reveal-index`, `--reveal-distance`,
  `--reveal-direction`).
- Honors reduced-motion: sets `data-revealed="true"` immediately.

### Usage

```tsx
<RevealGroup>
  <Reveal><Hero /></Reveal>
  <Reveal distance="large"><Statistics /></Reveal>
  <Reveal><CallToAction /></Reveal>
</RevealGroup>
```

---

## `AnimatedNumber`

Smoothly animates a numeric value from a previous to a current value when
the element first enters the viewport, then on each subsequent value change.

### API

```ts
type AnimatedNumberProps = {
  value: number;
  /** BCP-47 locale; defaults to current i18n locale. */
  locale?: string;
  /** Intl.NumberFormat options. */
  format?: Intl.NumberFormatOptions;
  /** Override duration in ms. Default: var(--motion-duration-stat). */
  durationMs?: number;
  /** Render with a fixed width to avoid layout shift across digits. */
  tabular?: boolean;
  /** Class forwarding. */
  className?: string;
  /** Test hook. */
  'data-testid'?: string;
};

export function AnimatedNumber(props: AnimatedNumberProps): JSX.Element;
```

### Behavior

- Activation gate: counter does not start until the element first enters
  the viewport (composes with the same IntersectionObserver pattern).
- On first activation, animates from `0` (or from `previousValue` if the
  element was already revealed and value changed) to `value` over the
  given duration with `--motion-ease-decelerate`.
- Mid-flight retarget: when `value` prop changes during an active
  animation, smoothly retargets from the current displayed value — never
  restarts from zero (FR-019).
- Formats output via `Intl.NumberFormat(locale, format)`.
- Reduced-motion: renders the formatted target value immediately, both on
  first display and on subsequent value changes (FR-020).
- `tabular={true}` adds `font-variant-numeric: tabular-nums` to prevent
  the digit-width jitter visible on most fonts during count-up.

### Usage

```tsx
<AnimatedNumber value={totalStudents} tabular />
<AnimatedNumber value={satisfactionScore} format={{ style: 'percent', maximumFractionDigits: 1 }} />
```

---

## `Skeleton` and `SkeletonGroup`

Render a layout-shape-preserving placeholder while data is loading.

### API

```ts
type SkeletonProps = {
  /** Variant determines the shape preset. */
  variant?: 'text' | 'kpi' | 'card' | 'chart' | 'list-row' | 'avatar';
  /** Override width (e.g., '60%'). */
  width?: string;
  /** Override height. */
  height?: string;
  /** Number of repeated rows for 'text' / 'list-row'. Default: 1. */
  rows?: number;
  /** Class forwarding. */
  className?: string;
};

export function Skeleton(props: SkeletonProps): JSX.Element;

type SkeletonGroupProps = {
  children: React.ReactNode;
  className?: string;
};

export function SkeletonGroup(props: SkeletonGroupProps): JSX.Element;
```

### Behavior

- Renders a calm shimmer animation using `--motion-duration-skeleton`.
- Reduced-motion: shimmer is replaced by a static muted block (no animation).
- After 4 seconds, an inline "still loading…" cue appears as a subtle
  caption below the skeleton group.
- Skeleton MUST roughly match the final layout's outer dimensions to keep
  CLS ≈ 0 when real content swaps in.

### Usage

```tsx
{isLoading ? (
  <SkeletonGroup>
    <Skeleton variant="kpi" />
    <Skeleton variant="kpi" />
    <Skeleton variant="chart" height="240px" />
  </SkeletonGroup>
) : (
  <DashboardContent data={data} />
)}
```

---

## `useReducedMotion`

The single source of truth for reduced-motion in JS.

### API

```ts
export function useReducedMotion(): boolean;
```

### Behavior

- Subscribes to `window.matchMedia('(prefers-reduced-motion: reduce)')`
  via `addEventListener('change', ...)`.
- Returns `true` when the preference is "reduce", `false` otherwise.
- SSR-safe: returns `false` during server rendering, hydrates to the
  correct value on the client.
- Re-evaluates on subscription change so OS-level toggles propagate
  without page reload.

### Usage

```tsx
const reduced = useReducedMotion();
return reduced ? <StaticHero /> : <AnimatedHero />;
```

---

## Out of Scope (this PR)

- A general-purpose `<Motion>` component covering arbitrary timeline
  composition. The four primitives above cover every use case in the spec.
- Custom keyframe authoring per page. Pages MUST compose with the existing
  primitives.
- Animation orchestration libraries (framer-motion, motion-one). Disallowed
  per R-001.
