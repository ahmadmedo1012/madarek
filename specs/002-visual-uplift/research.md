# Phase 0 — Research: Visual Uplift

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)
**Spec**: [spec.md](./spec.md)

This document resolves the open technical questions implied by the
plan's Technical Context. The goal is to land Phase 1 design with no
remaining `NEEDS CLARIFICATION` markers.

---

## R-001 — Type system: extend or replace?

**Decision**: **Extend.** Add a *role-locked* semantic layer
(`--type-display`, `--type-headline`, `--type-body`, `--type-label`,
`--type-metric`) on top of the existing `--fs-*` raw scale. The semantic
roles bundle font-family + size + weight + line-height + letter-spacing
so consumers reach for the role, not the raw size.

**Rationale**:
1. The raw scale (`--fs-mega`, `--fs-display-xl`, `--fs-h1`, …) is
   already used across hundreds of CSS rules. A clean break would touch
   far more than this feature warrants.
2. Roles are what consumers should compose against. The raw scale stays
   as the implementation foundation; the role tokens are the contract.
3. The role abstraction also pins line-height, weight, and letter
   spacing — places where the current code drifts the most. Pinning
   them per role is the quality lever this spec needs.

**Alternatives considered**:
- **Replace the raw scale**: too disruptive; multiplies the diff size
  ~10×.
- **Per-page typography**: fights the constitutional consistency goal.

---

## R-002 — Chart palette: extend the existing five-color set or build a new eight?

**Decision**: Extend. Add `--chart-6`, `--chart-7`, `--chart-8` to
`tokens.css`, document the canonical ordering, and update
`chartPalette()` in `chartTheme.ts` to read all eight. The first five
remain identical to today's values so existing charts keep their
appearance.

**Rationale**:
1. Five colors saturate before reaching role-rich charts (e.g., owner
   analytics breaks down ≥ 6 categories). Eight is a documented
   industry sweet spot (Tableau, Observable, Material).
2. Backward-compatible — existing charts render unchanged on day one;
   the new slots are opt-in for new chart instances or recolored
   intentionally.
3. The cycle order is documented so series of size 9..N reuse predictably
   (modulo 8) rather than randomizing.

**Alternatives considered**:
- **Generate palette algorithmically (e.g., HSL evenly-spaced)**: looks
  flat in real charts; saturates on background colors. Rejected.
- **Use a third-party palette utility**: bundle cost. Rejected.

---

## R-003 — Tabular numerals: opt-in or by default for digit-bearing contexts?

**Decision**: **Default for known digit-bearing contexts**. Add a
`.tabular-nums` utility class consumed by KPIs, table cells, counters,
percentages. Apply via element attribute (`data-tabular-nums`) where
generated dynamically (e.g., chart axis ticks).

**Rationale**:
1. `font-variant-numeric: tabular-nums` is free but only matters where
   digits change in place. Applying everywhere undoes the proportional
   feel of body type.
2. Centralizing through a class lets us audit adoption with
   `git grep "tabular-nums"`.

**Alternatives considered**:
- **Set on `:root`**: kills proportional digits in body copy.
- **Set on every element programmatically**: brittle.

---

## R-004 — Mobile table-to-list collapse: pure CSS or component pattern?

**Decision**: **Component pattern with CSS support.** Add a
`<ResponsiveTable>` primitive to `frontend/src/components/primitives/`
that exposes `columns: ColumnDef[]` and `rows: Row[]`. The primitive
renders as a `<table>` at ≥ 768 px and as a card list at < 768 px.

**Rationale**:
1. CSS-only column hiding leaves orphaned headers and breaks reading
   order. The card list needs proper key:value pairing per row, which
   requires JSX, not just CSS.
2. A primitive lets every page adopt the canonical mobile pattern
   without re-authoring.
3. It composes with the existing `Skeleton` primitive's `list-row`
   variant for the loading state.

**Alternatives considered**:
- **Tailwind-style "stack on mobile" CSS-only**: silent ARIA breakage
  in screen readers. Rejected.
- **Library (TanStack Table)**: bundle cost, opinionated. Not needed.

---

## R-005 — Sidebar shared-layout active indicator

**Decision**: A single absolutely-positioned indicator `<span>` inside
the active nav group whose `top` and `height` transition between active
items via CSS. Position is computed from the active `<NavLink>`'s
`offsetTop` + `offsetHeight` and stored on the nav group's element via
inline `style`. Updates on `useLocation()` change.

**Rationale**:
1. The current per-item `madarek-nav-pop` keyframe is calm but a
   true sliding indicator is the premium signature for this kind of
   chrome (Linear, Notion, Stripe sidebars).
2. The current pop-in still fires on the new active item, even with
   the shared indicator — so we keep both behaviors composable.
3. Implementation is ~30 lines, no new dependency.

**Alternatives considered**:
- **CSS-only via `:has()` + sibling selectors**: shaky cross-browser
  for the height-change case. Rejected.
- **Framer Motion's layoutId**: bundle cost. Rejected.

---

## R-006 — Mobile drawer focus trap

**Decision**: Use the native `<dialog>` element via React for the
mobile drawer + modals. `dialog.showModal()` provides focus trap,
backdrop, and Escape-to-close for free. Style the backdrop via
`::backdrop` selector.

**Rationale**:
1. Native dialog handles a11y correctly (focus trap, focus return,
   Escape, role announcement) without a focus-trap library.
2. `::backdrop` is a CSS pseudo-element — no React state needed for
   the scrim.
3. Bundle cost: zero.

**Alternatives considered**:
- **`@radix-ui/react-dialog`**: ~10 KB gzip, would mostly duplicate
  what native dialog now does. Rejected unless audit reveals a hard
  blocker.
- **Custom focus trap**: error-prone; native is the right primitive.

---

## R-007 — Playwright audit script

**Decision**: Single Playwright spec at
`frontend/tests/visual/audit.spec.ts` that:
1. Reads a route list from `tests/visual/routes.ts` (~25 representative
   routes).
2. For each route × breakpoint (360 / 768 / 1280 / 4K) × direction
   (LTR / RTL):
   - Navigates to the route.
   - Waits for the network to be idle.
   - Captures a full-page screenshot under
     `frontend/tests/visual/__captures__/<route>--<bp>--<dir>.png`.
3. Runs simple invariant assertions: no horizontal scroll on
   `<html>`, no element with `getBoundingClientRect().right >
   window.innerWidth`, focus ring visible after Tab on at least one
   interactive element.

**Rationale**:
1. Playwright is the industry-standard tool the user explicitly named
   in the request.
2. Captures are checked in as a baseline (or stored as artifacts in CI)
   so reviewers see before/after deltas.
3. Invariants run as part of the audit, gating regressions.

**Alternatives considered**:
- **Storybook + Chromatic**: heavyweight install for a one-off audit.
- **Manual DevTools sweep**: not reproducible; spec FR-001 demands
  reproducibility.

---

## R-008 — Lucide-only enforcement

**Decision**: A grep-based pre-commit check in
`scripts/check-icons.sh` that fails when:
1. Any `*.tsx` / `*.ts` file outside an allowlist contains an emoji
   character (Unicode ranges: emoji presentation, dingbats, misc
   symbols, supplemental symbols).
2. Any non-Lucide SVG appears in `frontend/src/components/` or
   `frontend/src/pages/` (allowlist: `Icon.tsx`, `EmojiIcon.tsx`,
   `LibyaFlag.tsx`).

The allowlist covers: user-supplied content stores, the brand-mark
glyph, the LibyaFlag SVG.

**Rationale**:
1. Mirrors the `check-motion-tokens.sh` pattern from `001-*`. Cheap,
   deterministic, no install.
2. Allowlist approach lets the EmojiIcon primitive remain available
   for legitimate user-supplied emoji rendering (notifications,
   messages) while preventing it from leaking into chrome.

---

## R-009 — Visible-improvement verification (NFR-001 / SC-001)

**Decision**: Reviewer-facing artifact bundle:
1. `tests/visual/__captures__/` contains baseline (`002-visual-uplift`
   pre-merge) + after captures.
2. A small `scripts/visual-diff.html` page renders side-by-side
   before/after for the ~25 audit routes × 4 breakpoints.
3. The visible-improvement review (≥ 5 reviewers, blind) consumes
   this artifact bundle.

**Rationale**:
1. Reproducible artifact rather than a subjective live demo.
2. Lightweight — no Storybook, no Chromatic. Just static HTML over the
   Playwright captures.

---

## R-010 — Section rhythm tokens

**Decision**: Add `--section-pad-y-narrow` and `--section-pad-y-wide`
in `tokens.css`. Every primary section uses one of the two — never an
ad-hoc value.

**Rationale**:
1. The existing `--section-gap` is one token used everywhere; rhythm
   needs at least two tiers (narrow for editorial, wide for hero/CTA).
2. Two tokens is the smallest set that lets us audit "is this section
   in rhythm?" at a glance via grep.

---

## R-011 — Topbar scrolled elevation

**Decision**: A single CSS rule:
`.has-shell .main:has(.content[data-scrolled="true"]) .topbar { box-shadow: var(--shadow-1); }`
where `data-scrolled` is set by the existing scroll handler in
`AppShell.tsx`. No new state.

**Rationale**: Reuses existing state; zero JS additions.

---

## Summary of decisions

| ID    | Decision                                                                  |
|-------|---------------------------------------------------------------------------|
| R-001 | Extend type system with role-locked tokens; keep raw `--fs-*` scale       |
| R-002 | Extend chart palette to 8 colors; first 5 unchanged                       |
| R-003 | Tabular-nums via shared `.tabular-nums` utility class                     |
| R-004 | `<ResponsiveTable>` primitive (table → card list at < 768 px)             |
| R-005 | Sidebar: shared-layout sliding indicator (~30 LOC, no library)            |
| R-006 | Mobile drawer + modals: native `<dialog>` element                         |
| R-007 | Single Playwright audit script + checked-in captures                      |
| R-008 | `scripts/check-icons.sh` grep gate; small allowlist                       |
| R-009 | Visible-improvement artifact: side-by-side capture HTML                    |
| R-010 | Two section-padding tokens (narrow / wide)                                |
| R-011 | Topbar scrolled-elevation via existing `data-scrolled` attribute          |

All `NEEDS CLARIFICATION` markers from the Technical Context are
resolved. Ready for Phase 1.
