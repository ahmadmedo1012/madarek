# Feature Specification: Visual Uplift — Premium Product Quality

**Feature Branch**: `002-visual-uplift`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Major visual and experiential upgrade of the entire Madrak platform so the result is dramatically more beautiful, modern, polished, coherent, and globally competitive — premium product feel inspired by Notion, Linear, Stripe, Framer, Samsung; still academic, university-centered, credible, role-aware, intelligent."

## Overview

`001-premium-motion-system` shipped the canonical motion + interaction tokens,
the primitives (`PageTransition`, `Reveal`, `AnimatedNumber`, `Skeleton`,
`Button`, `Input`), and the reduced-motion + RTL guarantees. Tokens are in
place. What ships now must use them at the **composition** layer:
re-balance every primary surface so it visibly reads as world-class —
hierarchy, density, white space, type rhythm, chart treatment, mobile
intent, icon discipline.

This feature is not a token redesign. It is a deliberate, visible quality
pass on top of the foundation: **make the difference obvious to a returning
user** within five seconds of opening any primary route.

It does not change business logic, permissions, route structure, or the
`001-*` token contracts. It changes how those tokens are composed on screen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Homepage that earns the room (Priority: P1)

A first-time visitor lands on the homepage and within five seconds knows
exactly what Madrak is, who it's for, and what to do next. The hero is
unmistakable on a 360 px phone and on a 27" monitor. Sections breathe.
Motion is calm but unmistakably present. Type rhythm reads like a
considered editorial layout — not a marketing template. Numbers from the
University of Zawia ground the page in real institutional weight. The
primary call-to-action is one of the boldest elements on the page.

**Why this priority**: The homepage is the single highest-leverage surface
for credibility. If it doesn't feel premium in five seconds, nothing
downstream recovers the impression.

**Independent Test**: Open the homepage on a fresh session at 360 px,
768 px, 1280 px, and 4 K. Within five seconds, identify (a) what Madrak
does, (b) who it's for, (c) the primary action. Verify on both LTR and
RTL. Check first-paint motion is calm, not theatrical.

**Acceptance Scenarios**:

1. **Given** a new visitor at any supported size, **When** the page loads,
   **Then** the hero headline + supporting line + primary CTA fit in the
   first viewport without horizontal scroll.
2. **Given** a returning in-session visit, **When** the page renders,
   **Then** intro motion does not replay (FR-029 from `001-*`).
3. **Given** the visitor scrolls, **When** they pass each section,
   **Then** sections reveal once with the platform's standard reveal
   motion and the page reads as a clear narrative arc, not a wall of
   tiles.
4. **Given** the visitor reaches a proof-point statistic, **When** the
   number enters view, **Then** it animates from zero to the real
   University of Zawia value using `AnimatedNumber`.
5. **Given** the visitor uses a phone, **When** they read the page,
   **Then** every line wraps cleanly with no overflow, no clipping, and
   touch targets are ≥ 44×44 CSS px.

### User Story 2 — Dashboard that respects the user (Priority: P1)

A faculty member opens their dashboard. KPI tiles read like a financial
product, not a school project: bold numbers, calm labels, tabular
alignment, deliberate spacing, restrained color. Charts feel native to
the page, not pasted in. Hover, focus, and pressed states are
unmistakable. Loading is a skeleton matching the final layout, not a
spinner. Empty states are warm, not blank. Repeat across student, dean,
admin, quality, owner.

**Why this priority**: Dashboards are where roles spend most of their
day. Composition quality here is the difference between "looks fine" and
"feels professional."

**Independent Test**: Open the student, faculty, dean, admin, quality
assurance, and owner dashboards. For each, validate hierarchy reads
top-to-bottom, KPI tiles are visually consistent across roles, charts
sit naturally inside their cards, and loading/empty/error states match
the final layout.

**Acceptance Scenarios**:

1. **Given** any dashboard, **When** it renders, **Then** the headline
   number on each KPI tile is the most prominent element of that tile;
   labels and deltas read as supporting type.
2. **Given** a chart is present, **When** it renders, **Then** axis
   labels, gridlines, tooltips, and legend use the platform's typography
   and color tokens — no chart-library defaults leak through.
3. **Given** the dashboard is loading, **When** the user lands, **Then**
   a layout-shape-preserving skeleton renders within the perceptual
   instant; CLS ≤ 0.05 when content swaps in.
4. **Given** any dashboard region has no data, **When** the empty state
   renders, **Then** it is visually distinct from the skeleton and
   includes a suggested action or a clear "all caught up" affirmation.
5. **Given** the user hovers a KPI tile or list row, **When** the
   pointer enters, **Then** the tile lifts subtly using the canonical
   `--state-card-hover-*` tokens; no layout shift.

### User Story 3 — Typography that earns the page (Priority: P1)

Every page reads as if a typographer designed it. Headlines have a
clear, deliberate scale; body copy sits on a comfortable line height;
labels and numbers feel intentionally separate type roles, not the same
text at different sizes. Arabic and English render with locale-correct
numerals, no typographic clashes, and a unified rhythm.

**Why this priority**: Bad typography reads as "amateur" before any
single element does. Good typography reads as "considered" before any
content is parsed.

**Independent Test**: Open homepage, student dashboard, course detail,
college page, auth page. Read each as continuous prose. Confirm the
type system feels consistent (size scale, weights, line height, letter
spacing) across all five. Verify Arabic + English render with no fallback
font flashes and locale-correct numerals.

**Acceptance Scenarios**:

1. **Given** any primary surface, **When** rendered in Arabic and English,
   **Then** the same content slot uses the same typographic role
   (display / headline / body / label / metric) with role-appropriate
   weight + size + line height.
2. **Given** numeric content (KPIs, dates, percentages), **When**
   rendered, **Then** Arabic-Indic numerals appear in Arabic locales
   and tabular alignment is used wherever digits change in place.
3. **Given** body text, **When** rendered at any breakpoint,
   **Then** line length stays within a comfortable measure (45–80
   characters); long Arabic or English lines never run edge-to-edge on
   wide screens.

### User Story 4 — Charts and metrics that feel native (Priority: P2)

Where charts exist, they feel like part of Madrak — not third-party
defaults. Axis labels share the platform's type. Gridlines are a token,
not a hardcoded gray. Series colors come from a categorical palette
defined once and reused everywhere. Tooltips look like the rest of the
product. Numbers in tables and tiles align on a tabular grid.

**Why this priority**: Charts are visual nouns; if their treatment looks
"off-brand" they undercut everything around them. They are also the
single biggest "obviously third-party" risk surface.

**Independent Test**: Open every chart-bearing route (student dashboard,
teacher intelligence, dean overview, owner analytics, college pages).
Confirm: typography matches, axis/grid colors come from tokens, series
colors come from the canonical palette, tooltips use the platform's
card style, all numbers use tabular figures.

**Acceptance Scenarios**:

1. **Given** any chart, **When** it renders, **Then** axis labels and
   tooltip text use the platform's font family, weight, and size tokens.
2. **Given** charts of the same kind across roles, **When** compared,
   **Then** they use the same series-color palette in the same order
   for the same semantic categories.
3. **Given** a chart at a small breakpoint, **When** rendered, **Then**
   it remains readable: labels do not collide, the legend reflows
   appropriately, and the chart adapts rather than horizontally scrolls.

### User Story 5 — Mobile that feels designed (Priority: P1)

A student on a 360 px phone uses Madrak as their primary interface. No
horizontal scroll. No clipped text. No overlapping elements. Bottom
navigation is reachable with one thumb. Sidebar opens as a calm drawer,
not a jolt. Tables collapse to readable card lists. Charts adapt to the
viewport, not horizontal scroll. Touch targets are ≥ 44×44.

**Why this priority**: A meaningful share of University of Zawia
students will use Madrak primarily on mid-range phones. "Looks fine on
desktop" is not enough.

**Independent Test**: Walk login → student dashboard → course detail →
assignment → profile on a 360 px viewport. Verify zero overflow, zero
clipping, no overlapping elements, all CTAs reachable, drawer opens
calmly, tables read as lists, charts fit.

**Acceptance Scenarios**:

1. **Given** any primary route at 360 px, **When** rendered, **Then**
   horizontal scroll is absent on the document and on every interactive
   region.
2. **Given** a table that would exceed the viewport, **When** rendered
   on mobile, **Then** it collapses to a vertically stacked list with
   the same data hierarchy.
3. **Given** the sidebar/drawer pattern, **When** opened on mobile,
   **Then** it animates in from the trailing edge, dims the background,
   and traps focus until dismissed.
4. **Given** any tappable element, **When** measured, **Then** its
   effective hit area is ≥ 44×44 CSS px.

### User Story 6 — Lucide-only icon discipline (Priority: P2)

Every icon across the platform is a Lucide glyph. No emoji. No SVG
stragglers from earlier iterations. No mixed icon sets. Icons share a
single stroke weight, sit on the same baseline, and respect a single
sizing scale.

**Why this priority**: Mixed icon sets are the single most common
"feels patched" tell. Eliminating them is high-impact, low-controversy.

**Independent Test**: Spider every page; collect every distinct icon
glyph. Verify each is exported by `lucide-react`. Catalog any emoji or
non-Lucide SVG; either replace with a Lucide equivalent or document an
explicit exception.

**Acceptance Scenarios**:

1. **Given** any user-facing surface, **When** an icon appears, **Then**
   it is a Lucide glyph at one of the canonical sizes (14 / 16 / 18 /
   20 / 24 px).
2. **Given** the codebase, **When** scanned for emoji in user-facing
   strings or JSX, **Then** any remaining emoji is on a documented
   exception list.

### User Story 7 — Sidebar, topbar, and overlay polish (Priority: P2)

Sidebar, topbar, dropdowns, modals, and toasts feel like one family.
The sidebar's active indicator slides between items rather than popping.
The topbar gains a subtle elevation only after scroll. Dropdowns
animate from their trigger, not from off-screen. Modals enter with a
calm scrim and a measured spring. Toasts stack with rhythm, not chaos.

**Why this priority**: Chrome elements are touched on every interaction;
their quality compounds across the session.

**Independent Test**: Open and close the sidebar (mobile + desktop),
trigger every dropdown in the topbar (notifications, profile, search,
language), open and close a modal, fire three toasts in succession.
Verify motion is consistent, scrims behave, focus traps and returns
correctly, and reduced-motion suppresses decorative motion.

**Acceptance Scenarios**:

1. **Given** the sidebar's active item changes, **When** the new item
   becomes active, **Then** the active indicator transitions smoothly
   between positions rather than disappearing and reappearing.
2. **Given** a modal is open, **When** the user presses Escape or
   clicks the scrim, **Then** the modal closes with the canonical
   close motion and focus returns to the trigger.
3. **Given** several toasts fire in succession, **When** rendered,
   **Then** they stack with consistent gap and exit independently
   without visual collision.

### User Story 8 — Cross-page consistency audit (Priority: P3)

A reviewer can pick any two unrelated pages and feel they were designed
in the same week, by the same team, against the same system. Spacing
rhythm, type rhythm, card treatment, button treatment, focus states,
and motion behavior are indistinguishable except where the role's
content semantically demands a difference.

**Why this priority**: Catches the residual "patched" feeling that no
single page-level fix can address.

**Independent Test**: Reviewer opens two unrelated routes side by side
and validates the system reads as one product across them.

**Acceptance Scenarios**:

1. **Given** two unrelated routes, **When** compared visually,
   **Then** card padding, border radius, hover lift, focus ring, and
   motion durations are identical.
2. **Given** the same component used on two routes, **When** compared,
   **Then** it renders identically modulo content.

### Edge Cases

- A page contains a chart whose series exceeds the canonical palette
  length: the platform MUST cycle the palette in a documented order
  rather than randomizing.
- A user with reduced-motion enabled MUST see no decorative motion on
  any surface introduced by this uplift; existing reduced-motion
  guarantees from `001-*` propagate.
- A 4 K display must not feel "stretched" — content max-widths cap at
  reasonable measures and gutters scale.
- A 360 px phone whose system font is small (~13 px base) must still
  render readable body text.
- An emoji that is part of *user-supplied content* (notification body,
  message) is allowed; only platform chrome icons are constrained to
  Lucide.
- A new role surface added later MUST inherit the visual system without
  bespoke CSS.
- An RTL surface must mirror every directional motion (drawer, slide,
  active indicator) — verified per surface.

## Requirements *(mandatory)*

### Functional Requirements

**Audit + Baseline**

- **FR-001**: System MUST perform a Playwright-driven visual audit
  of every primary route at 360 px, 768 px, 1280 px, and 4 K, in both
  LTR and RTL, and produce a per-route findings list before any
  composition change ships.
- **FR-002**: System MUST capture before/after screenshots of every
  surface materially changed by this uplift; both states MUST be
  archivable and reviewable.

**Homepage**

- **FR-003**: System MUST present a hero whose headline, supporting
  line, and primary call-to-action fit the first viewport at every
  supported breakpoint, in both LTR and RTL.
- **FR-004**: System MUST render proof-point statistics using
  `AnimatedNumber` (from `001-*`) sourced from authoritative University
  of Zawia data — no synthetic placeholders.
- **FR-005**: System MUST suppress the full intro motion on returning
  in-session visits (carries `001-*` SC-010).
- **FR-006**: System MUST tighten section rhythm so every primary
  section has consistent vertical padding from a single token (not
  ad-hoc per section).

**Typography**

- **FR-007**: System MUST establish a documented type scale (display,
  headline, body, label, metric) with explicit weight + line height +
  letter spacing for each role, applied consistently across surfaces.
- **FR-008**: System MUST apply tabular numerals to every digit-bearing
  context where digits update in place (KPIs, counters, percentages,
  table cells).
- **FR-009**: System MUST cap body line length to a comfortable measure
  on wide screens (≤ 80 ch) and prevent edge-to-edge runs in both LTR
  and RTL.

**Cards, Buttons, Tables, Dashboards**

- **FR-010**: System MUST treat every dashboard KPI tile so the headline
  number is the most prominent element of the tile (size + weight),
  with labels and deltas as supporting type.
- **FR-011**: System MUST apply the canonical `--state-card-*` and
  `--state-button-*` interaction tokens to every primitive instance
  with no ad-hoc overrides.
- **FR-012**: System MUST render data tables with consistent row height,
  column alignment (text leading, numbers tabular trailing), and a
  unified header treatment across every role.
- **FR-013**: System MUST collapse data tables that exceed the mobile
  viewport into a vertically stacked card-list pattern with the same
  data hierarchy.

**Charts and Metrics**

- **FR-014**: System MUST style charts with platform tokens — typography
  for axis labels and tooltips, the platform's grid color, and a single
  canonical categorical palette for series colors.
- **FR-015**: System MUST define a categorical palette of at least eight
  colors with documented ordering for chart series; the palette cycles
  predictably when series exceed its length.
- **FR-016**: System MUST present every chart with consistent padding
  inside its card so the chart never bleeds to the card edge.
- **FR-017**: System MUST show a chart-shaped skeleton during the
  chart's loading state; never a generic spinner inside a chart card.

**Mobile**

- **FR-018**: System MUST verify and resolve every horizontal-overflow,
  clipping, and overlap regression at 360 px on every primary route.
- **FR-019**: System MUST guarantee touch-target hit areas of ≥ 44×44
  CSS pixels on every interactive element.
- **FR-020**: System MUST deliver a mobile drawer (sidebar) that
  enters from the trailing edge, dims background, traps focus, and
  closes on Escape, scrim click, or canonical close button.
- **FR-021**: System MUST scale charts and KPI tiles to remain readable
  at 360 px without horizontal scroll.

**Sidebar / Topbar / Overlays**

- **FR-022**: System MUST render the sidebar's active indicator as a
  shared element that animates between active items rather than
  per-item show/hide.
- **FR-023**: System MUST elevate the topbar with a subtle shadow only
  after the content scrolls; the topbar is flush at scrollTop = 0.
- **FR-024**: System MUST animate dropdowns and popovers from their
  trigger origin with a measured open/close motion.
- **FR-025**: System MUST animate modal entrance/exit with the
  canonical scrim + spring; trap focus while open and return focus to
  the trigger on close.
- **FR-026**: System MUST stack toasts with consistent gap and exit
  toasts independently without visual collision.

**Iconography**

- **FR-027**: System MUST use Lucide icons exclusively in user-facing
  chrome and components; emoji and non-Lucide SVGs MUST appear only
  in user-supplied content or on a documented exception list.
- **FR-028**: System MUST normalize icon sizes to a canonical scale
  (14 / 16 / 18 / 20 / 24 px) and stroke weight; per-instance overrides
  require justification.

**Cross-Page Consistency**

- **FR-029**: System MUST render the same primitive (button, card, row,
  modal) identically across roles modulo content; role-specific styling
  is forbidden except where semantically required.
- **FR-030**: System MUST verify that any new role surface added in the
  future inherits the visual system without bespoke CSS.

**Reduced-Motion / RTL / a11y**

- **FR-031**: System MUST honor `prefers-reduced-motion` on every new
  motion introduced by this uplift; the existing reduced-motion override
  from `001-*` propagates without regression.
- **FR-032**: System MUST verify every directional motion mirrors
  correctly in RTL.
- **FR-033**: System MUST preserve the WCAG 2.1 AA contrast and focus
  guarantees from `001-*`; no surface drops below AA on text or focus
  ring.

### Non-Functional Requirements

- **NFR-001 (Visible Improvement)**: A side-by-side comparison of any
  primary route before and after this uplift MUST register a meaningful
  visual change to a representative reviewer (not a barely-perceptible
  tweak). Verified via blind review (n ≥ 5).
- **NFR-002 (Performance — Smoothness)**: Every motion remains
  effectively-fluid on the reference mid-tier mobile device (60 fps
  target; ≤ 1 dropped frame/sec during transitions).
- **NFR-003 (Performance — CLS)**: CLS ≤ 0.05 on every primary route
  in production analytics.
- **NFR-004 (Performance — Bundle)**: This uplift MUST NOT push the
  student-dashboard route bundle beyond the constitutional 250 KB
  gzipped budget; net add over the post-`001-*` baseline ≤ 12 KB
  gzipped.
- **NFR-005 (Accessibility)**: Zero WCAG 2.1 AA regressions introduced;
  axe runs on every PR find no new critical violations.
- **NFR-006 (Consistency)**: 100% token adoption — no raw motion or
  state values are introduced by this uplift; existing `001-*` lint
  gate continues to pass.
- **NFR-007 (Maintainability)**: Adding a new role surface, a new
  college page, or a new dashboard requires zero modification to the
  type system, motion tokens, interaction tokens, or chart palette —
  only data + composition.
- **NFR-008 (Audit Reproducibility)**: The Playwright audit MUST be
  re-runnable; every captured screenshot is regenerable from the
  documented Playwright script without manual setup.

### UX Requirements

- **UX-001**: Every surface reads as "considered" — visible composition
  decisions about hierarchy, density, and rhythm, not the default of
  a CSS framework.
- **UX-002**: Motion is calm and serves comprehension. The default rule
  carries from `001-*`: if removing motion would not change a user's
  understanding, the motion is too loud.
- **UX-003**: Empty, loading, and error states are intentional surfaces
  with the same visual care as the populated state.
- **UX-004**: First impressions land in five seconds: any new visitor on
  the homepage can identify what Madrak is, who it's for, and the
  primary action.
- **UX-005**: Mobile is intentional — never a compressed desktop. Tables
  become lists; charts adapt; drawers replace sidebars.

### Visual / Composition Requirements

- **V-001**: Type scale documented and applied: display, headline, body,
  label, metric — each with role-locked weight, size band, line height,
  and letter spacing.
- **V-002**: Vertical rhythm: every primary section uses one of two
  documented vertical-padding tokens. No ad-hoc section spacing.
- **V-003**: Card treatment: a single canonical card primitive serves
  every dashboard tile, list row, and content card; variants come from
  documented modifiers, not bespoke styles.
- **V-004**: Number presentation: tabular alignment everywhere digits
  update in place; locale-correct numerals; consistent unit placement.
- **V-005**: Categorical palette: a single, named, ordered palette of
  ≥ 8 colors used by every chart in the platform.
- **V-006**: Icon hygiene: Lucide-only in chrome and components; canonical
  size scale; one stroke weight across the platform.
- **V-007**: Mobile drawer pattern is canonical and shared by every
  surface that needs a slide-in panel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Visible Improvement)**: In a blind side-by-side review
  (n ≥ 5 representative users), ≥ 80% identify the post-uplift screens
  as "noticeably more polished" — not "about the same."
- **SC-002 (Premium Perception)**: In the comparative usability study
  carried over from `001-*` (≥ 12 users across ≥ 3 roles), ≥ 90% rate
  Madrak as "feels premium" or "feels world-class" (lifted from the
  85% target in `001-*` SC-005).
- **SC-003 (Homepage Comprehension)**: ≥ 90% of first-time visitors
  identify Madrak's purpose and primary action within 5 seconds in
  task-based testing.
- **SC-004 (Token Adoption Stays at 100%)**: The `check:motion-tokens`
  CI gate continues to pass; no new ad-hoc durations, easings, or
  state values appear in shipped code.
- **SC-005 (Icon Discipline)**: Zero non-Lucide icons remain in the
  platform's chrome and components; any exceptions are documented.
- **SC-006 (Mobile Coverage)**: Zero open horizontal-overflow / clipping
  / overlap defects on any primary route at 360 px after the uplift
  ships.
- **SC-007 (Stability)**: Cumulative Layout Shift ≤ 0.05 on every
  primary route post-uplift (carried from `001-*` NFR-002, no
  regression introduced).
- **SC-008 (RTL Parity)**: Every motion or composition change verified
  in LTR is also verified in RTL; zero RTL-specific defects open at
  release.
- **SC-009 (a11y Floor)**: Zero new WCAG 2.1 AA violations introduced.
- **SC-010 (Consistency Audit)**: Two unrelated routes selected at
  random share identical card padding, radius, hover lift, focus ring,
  and motion durations on inspection.

## Assumptions

- The motion system, interaction tokens, and primitives shipped in
  `001-premium-motion-system` are stable and the foundation for this
  uplift; this spec does not redesign them.
- The University of Zawia data layer carries the institutional
  numbers and college metadata used by the homepage and college pages
  (Principle III).
- The reference mid-tier mobile device for performance verification is
  consistent with the device class in `001-*`.
- Existing role taxonomy (student, faculty, department head, dean,
  administrator, quality assurance, platform owner) is the full set in
  scope; no new roles are introduced.
- Where primary surfaces use a third-party chart library, integration
  happens through token-driven theming — not by replacing the library.
- "Premium product" reference points are Notion / Linear / Stripe /
  Framer / Samsung; the uplift takes inspiration but never imitates
  trade dress.
- The Playwright audit runs against the staging deployment on Render;
  no production-data access is required.
