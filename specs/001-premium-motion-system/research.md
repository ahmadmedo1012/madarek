# Phase 0 — Research: Premium Experience & Motion System

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)
**Spec**: [spec.md](./spec.md)

This document resolves the open technical questions implied by the Technical
Context in `plan.md` and records the rationale behind each choice. The goal is
to land Phase 1 design with no remaining `NEEDS CLARIFICATION` markers.

---

## R-001 — Animation engine choice

**Question**: What renders the platform's motion — a runtime library
(framer-motion, motion-one, GSAP) or platform primitives (CSS transitions,
CSS animations, Web Animations API, View Transitions API)?

**Decision**: Platform primitives only.
- CSS transitions and animations for hover/focus, skeleton shimmer, and reveal
  keyframes.
- View Transitions API (`document.startViewTransition`) for route-level cross-
  fades on browsers that support it (Chrome/Edge ≥ 111, Safari ≥ 18).
- CSS class-based fallback (200 ms cross-fade keyframe) on browsers without
  View Transitions.
- IntersectionObserver for reveal triggers and counter activation.
- `requestAnimationFrame` for the `AnimatedNumber` counter integrator.

**Rationale**:
1. Constitutional bundle budget (≤ 8 KB gzip add for the motion system).
   framer-motion is ~50 KB gzip; motion-one is ~7 KB but still lands a
   runtime dependency we don't otherwise need.
2. Tokens already live in CSS; CSS-driven motion keeps the source of truth
   in one layer and avoids JS/CSS divergence.
3. View Transitions API delivers the "premium native" feel for free where
   supported and degrades to a CSS cross-fade where not — no library
   needed.
4. Reduced-motion is a CSS media query; platform primitives respect it
   automatically when authored against `prefers-reduced-motion`.

**Alternatives considered**:
- **framer-motion**: best DX but bundle cost violates Principle VI.
- **motion-one**: smaller, but still a runtime dependency for behavior the
  platform ships natively.
- **GSAP**: licensing + size disqualify it for an open educational platform.

---

## R-002 — Page transitions

**Question**: How are route-to-route transitions delivered without remounting
the persistent shell (header + side navigation)?

**Decision**: Wrap the route outlet (not the shell) in a `<PageTransition>`
component:
- On supporting browsers, `<PageTransition>` calls `document.startViewTransition`
  on `useLocation` change with a 320 ms cross-fade + 8 px upward translate.
- On non-supporting browsers, it applies a CSS class to the outlet that
  triggers the same cross-fade keyframe.
- The shell itself is mounted once at the application root (already the case
  in `AppShell.tsx`) and never participates in the transition.
- Active-nav indicator uses a shared layout pattern: a single absolutely-
  positioned indicator element whose `transform: translateY(...)` and
  `height` animate via CSS transition between active items — no per-item
  show/hide.

**Rationale**:
1. Aligns with FR-005, FR-006, FR-007 directly.
2. Keeps shell state (open menus, scroll position of side nav) intact across
   navigation by design.
3. Indicator-as-shared-layout avoids the "two indicators briefly visible"
   flicker.

**Alternatives considered**:
- **AnimatePresence + motion components** (framer-motion): same outcome but
  fails the bundle budget.
- **Mounting two route trees and cross-fading**: doubles render cost on slow
  devices; rejected.

---

## R-003 — Skeleton + loading taxonomy

**Question**: What is the canonical taxonomy of loading states, and where in
the component tree does each live?

**Decision**: Three categories, each with one canonical primitive:
1. **Page-level skeleton** — `<PageSkeleton />` (extends the existing one in
   `States.tsx`) renders a rough page silhouette; appears within 100 ms of
   route mount when route data is in flight.
2. **Region-level skeleton** — `<Skeleton variant="card|chart|list|kpi" />`
   renders inside data-bound regions whose request hasn't resolved within
   the perceptual-instant threshold (200 ms).
3. **Action-level loader** — in-button spinner or inline progress within the
   target element; reserved for user-initiated actions (form submit, save).
   Global page spinners are forbidden except during full-page hard reloads.

Skeleton shimmer is a single CSS keyframe driven by token `--skeleton-shimmer`,
respecting reduced-motion (collapses to a static muted block).

The "still loading" reassurance cue (FR Edge Case) appears after 4 seconds
as a small inline text label — never another spinner.

**Rationale**:
1. Three categories cover every observed loading scenario in the existing
   pages without overlap.
2. Variant-driven skeleton keeps shape parity with the final layout (FR-014,
   FR-015) without bespoke skeletons per page.

**Alternatives considered**:
- **Single universal `<Skeleton>` with arbitrary children**: works but
  invites layout-shift bugs because consumers must re-author the silhouette
  per region.
- **Suspense boundaries with a global spinner**: rejected — generic spinners
  signal anxiety, not premium quality.

---

## R-004 — Reveal triggers and IntersectionObserver strategy

**Question**: How are scroll reveals coordinated so they fire once per
element, stagger correctly, and don't fire for content already above the
fold?

**Decision**: A single `<Reveal>` wrapper component:
- Uses `IntersectionObserver` with `rootMargin: '0px 0px -10% 0px'` and
  `threshold: 0`.
- On first intersection, applies the `data-revealed` attribute and removes
  the observer (one-shot).
- On mount, if the element is already in the viewport (computed via
  `getBoundingClientRect()` against `window.innerHeight`), the
  `data-revealed` attribute is set synchronously so no animation plays —
  this satisfies FR-023.
- Stagger is a CSS-level concern: parent `<RevealGroup>` sets a
  `--reveal-stagger-step` custom property, and each child consumes
  `animation-delay: calc(var(--reveal-stagger-step) * var(--reveal-index))`.
- The component honors `prefers-reduced-motion` by applying `data-revealed`
  immediately and skipping the keyframe.

**Rationale**:
1. One observer per element, removed after first hit — bounded memory.
2. CSS-driven stagger keeps the reveal logic declarative and testable.
3. Above-the-fold detection runs once, on mount, before any keyframe binds.

**Alternatives considered**:
- **Single shared observer**: micro-optimization, adds complexity for the
  common case. Re-evaluate if instrumented profiling shows observer
  overhead.

---

## R-005 — Animated counter behavior

**Question**: Counter animation timing, easing, mid-flight retargeting, and
locale-aware number formatting for Arabic.

**Decision**: `<AnimatedNumber value={n} />`
- Duration band: 700 ms (within the spec's 600–900 ms window).
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (decelerate / ease-out — the
  platform's existing `--ease-out` token).
- Driver: `requestAnimationFrame`; on each frame, interpolates from
  `previousValue` to `value`.
- Retargeting: when `value` prop changes mid-animation, the integrator
  smoothly retargets from current displayed value to the new value,
  resetting `start` to `now` and `from` to current — never restarts from
  zero (FR-019).
- Number formatting: `Intl.NumberFormat(locale, options)` where `locale` is
  read from the existing i18n layer. Arabic locales use Arabic-Indic
  numerals when the surrounding context expects them; English locales use
  Western numerals.
- Reduced-motion: renders the formatted target value immediately on mount
  and on each `value` change (FR-020).
- Activation gate: counter only starts when the element first enters the
  viewport (composes with the IntersectionObserver pattern from R-004).

**Rationale**:
1. RAF + interpolation is < 1 KB of code and gives full control over
   retargeting and locale formatting.
2. `Intl.NumberFormat` is platform-native and already correct for both
   Arabic and English locales.

**Alternatives considered**:
- **CSS @property + counter() trick**: cute, but `Intl.NumberFormat` cannot
  participate, so Arabic-Indic numerals can't render correctly. Rejected.

---

## R-006 — Reduced-motion strategy

**Question**: How is `prefers-reduced-motion` evaluated, propagated to
React, and re-evaluated on navigation?

**Decision**: A single `useReducedMotion()` hook:
- Subscribes to `window.matchMedia('(prefers-reduced-motion: reduce)')` via
  `addEventListener('change', ...)` so OS-level changes propagate without
  a reload (Edge Case).
- Re-evaluates on every navigation by being read inside primitives that
  participate in motion (`<PageTransition>`, `<Reveal>`, `<AnimatedNumber>`).
- CSS counterpart: a single `@media (prefers-reduced-motion: reduce)` block
  in `motion.css` overrides every motion token's duration to `0ms` (or
  ≤ 80 ms for fades that must stay perceivable to keep transitional
  affordance).

**Rationale**:
1. Belt-and-braces (JS hook + CSS media query) means a single feature can
   never become motion-positive by accident.
2. Re-evaluation per navigation satisfies the Edge Case requirement.

---

## R-007 — RTL parity for directional motion

**Question**: How do we ensure slides, drawer entrances, and indicator
movements mirror correctly in Arabic (RTL)?

**Decision**:
- All directional CSS uses **logical properties**: `inset-inline-start`,
  `inset-inline-end`, `margin-inline-start`, `transform: translateX(...)`
  with values expressed as `var(--motion-distance-medium)` and a paired
  RTL override via `[dir="rtl"]` selectors that flip the sign.
- Where inline `transform` cannot use logical units, a `--motion-direction`
  custom property (`1` for LTR, `-1` for RTL) multiplies the distance:
  `transform: translateX(calc(var(--motion-direction) * var(--motion-distance-medium)));`
- The motion vocabulary is documented in *logical* terms: "enter from
  trailing edge", "indicator moves toward content" — never "from right".

**Rationale**:
1. Logical properties + a direction multiplier is the smallest, most
   robust way to make every motion RTL-correct without per-component RTL
   forks.

---

## R-008 — College identity profile data shape

**Question**: How is the College Identity Profile represented and surfaced?

**Decision**:
- **Authoritative shape** (typed, frontend):
  ```ts
  type CollegeIdentityProfile = {
    accent: string;                  // brand hex; validated for AA contrast
    accentAccessible?: string;       // optional override for fail cases
    heroImage: { src: string; alt: string };
    icon: string;                    // lucide-react icon name
    motif?: { src: string; alt: string };
    namedTokens?: Record<string, string>; // optional per-college token nudges
  };
  ```
- **Surface**: rendered as CSS custom properties scoped to the college
  page root: `--college-accent`, `--college-accent-fg`, etc. Components on
  the college page consume these without hardcoded values.
- **Source of truth (this PR)**: a static `colleges.config.ts` file
  containing one entry per real University of Zawia college. Long-term
  follow-up: move to backend `College` table columns (out of scope for
  this PR; captured as a backend task).
- **Contrast validation**: a build-time script
  (`scripts/validate-college-identity.ts`) computes WCAG contrast for
  every accent against the platform background, verifies asset existence,
  lucide icon validity, and slug match; failures fail the build and route
  the identity to `accentAccessible` (or to a documented fallback color).

**Rationale**:
1. Static config gives us a one-PR path to identity coverage; backend
   migration can land later without changing the frontend contract.
2. CSS custom properties scoped per-page keep the identity local — no
   risk of bleeding into the shared shell.

---

## R-009 — Performance verification approach

**Question**: How do we verify the constitutional 60 fps + ≤ 0.05 CLS
+ ≤ 8 KB gzip add targets without wiring full RUM?

**Decision**:
- **Bundle**: `vite build` with `--report` (or `rollup-plugin-visualizer`)
  on PR; CI compares the gzipped size of the student dashboard chunk pre/
  post and blocks if delta > 8 KB.
- **CLS / smoothness**: Lighthouse CI run against a representative profile
  (mid-tier mobile, Slow 4G) for the homepage, student dashboard, and
  one college page; thresholds enforced.
- **Manual**: Chrome Performance tab profile of a representative journey
  (login → student dashboard → course → assignment) on the reference
  device; jank events ≥ 1/sec block release.

**Rationale**:
1. The platform doesn't yet need full RUM for this feature; deterministic
   budgets in CI catch the realistic regressions.
2. Lighthouse CI integrates cleanly with the existing Render deploy.

---

## R-010 — Token namespace and existing-token reconciliation

**Question**: The existing `tokens.css` already defines `--t-micro`,
`--t-fast`, `--t-base`, `--t-slow`, `--t-slower`, `--t-cinema`, plus
several `--ease-*` curves. Do we replace or extend?

**Decision**: **Extend**, add a parallel **semantic** layer, deprecate
generic names gradually.
- Keep raw tokens (`--t-fast`, `--ease-out`) as the foundation.
- Add semantic aliases mapped to them:
  - `--motion-duration-micro` → `var(--t-micro)`
  - `--motion-duration-short` → `var(--t-fast)`
  - `--motion-duration-medium` → `var(--t-base)`
  - `--motion-duration-long` → `var(--t-slow)`
  - `--motion-duration-page` → 320 ms (new)
  - `--motion-duration-stat` → 700 ms (new)
  - `--motion-ease-standard` → `var(--ease)`
  - `--motion-ease-decelerate` → `var(--ease-out)`
  - `--motion-ease-accelerate` → `var(--ease-in)`
  - `--motion-ease-emphasized` → `var(--ease-soft)`
  - `--motion-distance-small` / `-medium` / `-large` (new)
  - `--motion-stagger-step` (new — single canonical value, ~60 ms)
  - `--motion-direction` (1 or -1, switched by `[dir="rtl"]`)
- Interaction tokens are net-new under `--state-*` namespace
  (`--state-hover-elevation`, `--state-focus-ring`, `--state-pressed-scale`,
  etc.).
- Existing components migrate to semantic names lazily; the audit (Phase 2
  / `/speckit-tasks`) tracks the migration. Raw tokens are not deleted in
  this PR.

**Rationale**:
1. A clean break would touch hundreds of files; the constitutional consistency
   goal is achievable through gradual migration without churn.
2. Semantic names are what consumers should reach for; raw tokens become
   implementation detail.

---

## R-011 — Accessibility verification pipeline

**Question**: How do we keep the WCAG AA promise per FR/NFR-005 without
manual every-PR audits?

**Decision**:
- **Automated**: integrate `@axe-core/react` in development to surface
  violations in the dev console; add a Storybook (or component-explorer)
  axe-runner against each motion primitive. CI runs Lighthouse a11y on
  representative routes.
- **Manual smoke per PR**: each new interactive component requires a
  keyboard-only walk-through and a screen-reader announcement check
  (NVDA on Windows, VoiceOver on macOS) — captured in the PR description.
- **Reduced-motion check**: a single Cypress (or Playwright) test toggles
  the emulated `prefers-reduced-motion: reduce` and asserts that the
  homepage hero reveal does not run; this single test gates the whole
  reduced-motion guarantee.

**Rationale**:
1. Automation catches regressions; manual smokes catch the things axe can't
   see (focus order quality, screen-reader phrasing).
2. One reduced-motion E2E test is high-leverage — covers the hardest-to-
   regress path with a single CI signal.

---

## Summary of decisions

| ID    | Decision                                                                  |
|-------|---------------------------------------------------------------------------|
| R-001 | Platform primitives only (CSS + View Transitions API + IntersectionObserver) |
| R-002 | `<PageTransition>` wraps route outlet, shell mounts once, indicator shared-layout |
| R-003 | Three loading categories: page-skeleton, region-skeleton, action-loader   |
| R-004 | Single `<Reveal>` + `<RevealGroup>` with one-shot IntersectionObserver    |
| R-005 | RAF-driven `<AnimatedNumber>` with mid-flight retargeting + Intl formatting |
| R-006 | `useReducedMotion()` hook + CSS media query, both belt-and-braces         |
| R-007 | Logical CSS + `--motion-direction` multiplier for RTL parity              |
| R-008 | Static `colleges.config.ts` for now; backend migration tracked separately |
| R-009 | CI bundle diff + Lighthouse CI thresholds + manual reference-device profile |
| R-010 | Extend semantic token layer, keep raw tokens, migrate consumers gradually |
| R-011 | axe-core in dev, Lighthouse in CI, manual a11y smokes per PR, one reduced-motion E2E |

All `NEEDS CLARIFICATION` markers from the Technical Context are resolved.
Ready for Phase 1.
