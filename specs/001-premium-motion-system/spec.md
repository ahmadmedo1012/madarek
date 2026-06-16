# Feature Specification: Premium Experience & Motion System

**Feature Branch**: `001-premium-motion-system`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Create a comprehensive specification for a Premium Experience & Motion System for Madrak. The goal is to elevate Madrak from a functional university platform into a world-class educational product experience."

## Overview

This feature does not introduce new business logic. It defines the **perceived-quality
layer** of Madrak — the motion system, interaction states, transitions, loading
behavior, scroll storytelling, college visual identity, and homepage narrative —
so that every existing role (student, faculty, department head, dean,
administrator, quality assurance, platform owner) experiences the same calm,
premium, world-class product feel across desktop, tablet, and mobile.

The output is a unified motion + interaction system implemented through shared
tokens, applied consistently across the platform, accessible to all users
(including those with reduced-motion preferences), and respectful of the
performance budget.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Motion & Interaction Foundation (Priority: P1)

A platform owner inspects every screen of Madrak — login, homepage, student
dashboard, dean dashboard, college pages — and sees one consistent visual
language: the same hover lift, the same focus ring style, the same easing curve
on every transition, the same loading skeleton style, and the same disabled-state
treatment. Nothing feels "from a different product." A user with
`prefers-reduced-motion` enabled sees the same surfaces with motion replaced by
instant or very subtle fades, and the platform remains fully usable.

**Why this priority**: Without a foundation of shared tokens and reduced-motion
handling, every later story would invent its own language and the platform
would drift back into inconsistency. This is also a constitutional NON-NEGOTIABLE
(Principle I + II).

**Independent Test**: Open any 5 routes across 3 different roles. Hover, focus,
and click on interactive elements. Confirm visual language is identical. Toggle
OS reduced-motion. Confirm motion is suppressed but functionality intact.

**Acceptance Scenarios**:

1. **Given** a user lands on any route, **When** they hover any primary
   interactive element (button, card, nav item), **Then** the response uses
   the platform's standard hover treatment (elevation, color shift, or scale)
   from the shared motion tokens — no route uses a custom-rolled hover.
2. **Given** a user navigates with the keyboard, **When** they Tab through
   any page, **Then** every focusable element shows a clearly visible focus
   ring of consistent color, thickness, and offset across the entire platform.
3. **Given** a user has `prefers-reduced-motion: reduce` enabled at the OS
   level, **When** they use the platform, **Then** decorative motion is
   removed or reduced to a 0–80ms fade, while functional feedback (focus,
   selected, error) remains visible.
4. **Given** any developer adds a new screen, **When** they need a
   transition, hover, or animation, **Then** they consume the canonical
   motion tokens — adding a new ad-hoc duration or easing is a review block.

---

### User Story 2 - Page & Navigation Transitions (Priority: P1)

A student moves between Home → My Courses → Course Detail → Assignment. Each
transition feels intentional: a smooth fade-and-slight-lift on route change,
the persistent navigation rail or header stays anchored without flicker, and
the active nav item moves with a subtle indicator instead of jumping. Back
navigation feels symmetric. On a slow network, the transition still completes
gracefully and never traps the user in a half-rendered state.

**Why this priority**: Page and navigation transitions are the single most
visible perceived-quality cue. They are touched on every interaction and set
the baseline of "this feels premium."

**Independent Test**: Click through a 5-route flow on desktop and mobile.
Confirm transitions are smooth, the active nav indicator animates rather than
snaps, and there is no layout shift, flash of unstyled content, or stuck
spinner during navigation.

**Acceptance Scenarios**:

1. **Given** a user clicks an in-app link, **When** the new route loads,
   **Then** the outgoing content fades/slides out and the incoming content
   fades/slides in within the platform's transition duration budget, with no
   visible content jump.
2. **Given** a user changes the active section in the side navigation,
   **When** the new section becomes active, **Then** the active indicator
   animates smoothly to its new position rather than disappearing and
   reappearing.
3. **Given** a slow network, **When** the next route's data is still loading,
   **Then** the transition completes to a skeleton state immediately and the
   final content fills in without re-running the transition.
4. **Given** a user taps the browser back button or in-app back, **When**
   they return to the previous route, **Then** scroll position is
   restored.

---

### User Story 3 - Dashboard Interactions, Hover & Focus States (Priority: P1)

A faculty member opens their dashboard. KPI cards lift slightly on hover with
a calm, consistent motion. Buttons show a clear pressed state. Form inputs
indicate focus, validation, and loading without jumping the layout. Dropdowns,
menus, and tooltips appear with a coordinated micro-animation. Disabled
elements are unmistakably disabled. Every interactive element gives feedback
within a perceptual instant.

**Why this priority**: Dashboards are where roles spend most of their time.
Interaction quality here disproportionately drives the sense of "this product
respects me."

**Independent Test**: On the faculty, dean, and admin dashboards, exercise
every interactive component (button, card, input, dropdown, tab, modal
trigger) with mouse, touch, and keyboard. Confirm hover, focus, pressed,
disabled, and loading states are all visible, distinct, and consistent.

**Acceptance Scenarios**:

1. **Given** a user hovers a KPI card, dashboard tile, or list row, **When**
   the pointer enters, **Then** the element lifts subtly (shadow + scale or
   translate) using the standard hover token within the platform's micro-motion
   duration.
2. **Given** a user focuses a form input via keyboard, **When** the input
   receives focus, **Then** a focus ring appears without shifting surrounding
   layout, and the label/helper text remains stable.
3. **Given** a user submits a form, **When** the request is in flight,
   **Then** the submit button shows an in-button loading indicator (not a
   global spinner), the button is non-clickable, and form fields are
   visually marked as locked.
4. **Given** an action is unavailable, **When** the user encounters the
   element, **Then** it has an unambiguous disabled treatment (reduced
   opacity + cursor change + no hover lift) and a tooltip or label explains
   why.

---

### User Story 4 - Loading States & Skeleton System (Priority: P2)

A student opens the analytics tab on their dashboard. Instead of a blank screen
or a generic spinner, they see a skeleton that mirrors the final layout —
chart placeholders, KPI shapes, list rows — with a calm shimmer. When data
arrives, content swaps in without jolting the layout. If data is empty, an
intentional empty state appears (illustration + message + suggested action)
rather than a raw "no data" message.

**Why this priority**: Loading is the single most visible *failure mode* of
perceived quality. A premium loading system erases the feeling of waiting and
prevents layout shift.

**Independent Test**: Throttle the network to 3G. Open 3 data-heavy routes
across 2 roles. Confirm skeletons appear immediately, match the final layout's
shape, transition cleanly to real content, and that empty states are
distinct from loading states.

**Acceptance Scenarios**:

1. **Given** any route or component loads data, **When** the request takes
   longer than the perceptual instant threshold, **Then** a skeleton matching
   the final layout's rough shape appears within that threshold.
2. **Given** a skeleton is showing, **When** real data arrives, **Then** the
   skeleton cross-fades to content with no measurable layout shift (CLS ≈ 0).
3. **Given** a request returns no data, **When** the empty state shows,
   **Then** it is visually distinct from the skeleton and includes a message
   plus a suggested next action (or a clear "nothing to do" affirmation).
4. **Given** a request fails, **When** the error state shows, **Then** it
   communicates what happened, what the user can do, and offers a retry —
   never a silent blank pane.

---

### User Story 5 - Animated Statistics & Scroll-Based Reveal (Priority: P2)

A dean opens the college overview and watches headline numbers (total
students, faculty, programs, satisfaction score) count up smoothly from zero
to their real value. As they scroll the page, sections fade and rise into view
with a calm cadence — never all at once, never staggered to the point of
distraction. The motion always points forward (revealing the page) and never
loops or competes for attention.

**Why this priority**: Animated stats and scroll reveals are the strongest
storytelling tools the platform has. They turn dashboards into narratives and
landing pages into experiences. They are also the most easily abused.

**Independent Test**: Load the homepage and a college overview page. Confirm
counters animate once, in a single direction, within a bounded duration. Scroll
through the page; confirm reveals fire once per element, are subtle, and stop
firing after the user has passed them.

**Acceptance Scenarios**:

1. **Given** a page contains a numeric headline statistic, **When** the
   statistic enters the viewport, **Then** it counts from zero (or from its
   previous value on update) to the target within the platform's animated-stat
   duration band, with an ease-out curve.
2. **Given** a section enters the viewport while scrolling, **When** the
   reveal threshold is crossed, **Then** the section fades + lifts in once,
   and never replays on subsequent scrolls past it.
3. **Given** multiple elements share a section, **When** they reveal,
   **Then** they stagger by a small, fixed delay so the eye reads them in
   order — but the entire section completes within an upper-bound duration.
4. **Given** a user has reduced-motion preference, **When** counters or
   reveals would fire, **Then** counters render the final value immediately
   and reveals collapse to a 0–80ms fade.

---

### User Story 6 - College Page Visual Identity System (Priority: P2)

A student visiting the College of Engineering page sees an identity that feels
unmistakably "engineering" — its own accent color, its own header imagery, its
own iconography — while still feeling 100% like Madrak. They visit the College
of Medicine page and see a different but equally cohesive identity. The shared
chrome (header, navigation, footer, typography) is unchanged. Every college,
including new ones added later, gets a coherent identity from a single
configuration entry — not bespoke design work each time.

**Why this priority**: Colleges are the primary "brand surface" inside the
university. Generic college pages flatten the institution; identity-rich pages
create pride. Doing this systematically (not one-off) is what makes it
maintainable.

**Independent Test**: Configure the identity for two colleges. Visit each
college page on desktop and mobile. Confirm each feels distinct (color, hero,
icons) but the shared chrome, motion, and interaction patterns are identical.
Add a third college with only a config change; confirm a coherent identity
results without bespoke styling.

**Acceptance Scenarios**:

1. **Given** a college has an identity profile (accent color, hero image,
   icon, optional motif), **When** the college page renders, **Then** the
   accent color is consistently applied to category-relevant elements (links,
   tab indicators, section headers) without overriding system-level colors
   (success/warning/error).
2. **Given** the platform contains many colleges, **When** any college page
   renders, **Then** the page uses the same layout grid, the same component
   set, and the same motion behavior as every other college page.
3. **Given** a new college is added, **When** an administrator provides only
   the identity profile fields, **Then** the resulting page is coherent and
   premium-looking with no additional design work.
4. **Given** a college's accent color has insufficient contrast against the
   background, **When** the system detects this, **Then** it falls back to
   an accessible variant or a documented override and never produces text
   that fails contrast.

---

### User Story 7 - Homepage Storytelling (Priority: P2)

A first-time visitor lands on Madrak's homepage. The hero communicates the
University of Zawia's mission and Madrak's role within seconds, with a calm
motion that draws the eye toward the primary call-to-action. As they scroll,
they encounter a clear narrative: who Madrak serves (roles), what it
delivers (academic, administrative, AI-assisted experiences), proof points
(real numbers from the university), and a final call to action. Each section
has its own moment without competing with the next. The page works on a 360px
phone as well as on a 4K monitor.

**Why this priority**: The homepage is the single highest-leverage surface
for first impressions and institutional buy-in. It is also the most legible
test of whether the motion + identity system has reached "world-class."

**Independent Test**: Open the homepage on a fresh session at desktop, tablet,
and mobile sizes. Read the page top-to-bottom. Confirm a clear narrative
arc, no section steals attention, the primary call-to-action is unambiguous,
all motion is calm, and the page meets the platform's performance budget.

**Acceptance Scenarios**:

1. **Given** a first-time visitor lands on the homepage, **When** the hero
   loads, **Then** the headline, supporting line, and primary call-to-action
   are visible within the first viewport on every supported device size.
2. **Given** the visitor scrolls, **When** they pass each narrative section,
   **Then** the section reveals once with the platform's standard reveal
   motion and never replays.
3. **Given** the homepage shows university statistics, **When** they enter
   the viewport, **Then** they animate from zero to the real University of
   Zawia values (Principle III) — not synthetic placeholders.
4. **Given** a returning visitor lands on the homepage, **When** they have
   already seen reveal animations in this session, **Then** subsequent
   in-session visits do not replay the full intro motion (calm, not
   theatrical).

---

### User Story 8 - Cross-Role Consistency (Priority: P3)

A user who holds two roles (e.g., faculty member who is also a department
head) switches between role contexts. Every interaction pattern they learned
in one role transfers identically to the other: the same shortcuts, the same
hover/focus behavior, the same loading skeletons, the same modal dismissal.
Nothing in the role switch suggests they are using a different product.

**Why this priority**: Role-aware consistency prevents cognitive load for
multi-role users (common in universities) and is a quiet but durable signal
of system quality.

**Independent Test**: With a multi-role test account, switch between two role
contexts and exercise comparable actions (open a list, edit a record, submit
a form) in each. Confirm the interaction language is identical and only the
*content* and *permissions* differ.

**Acceptance Scenarios**:

1. **Given** a multi-role user switches roles, **When** they perform a
   structurally similar action (e.g., open a list of items), **Then** the
   layout, motion, hover, focus, loading, and empty-state treatments are
   identical across roles.
2. **Given** a developer builds a new role-specific dashboard, **When** they
   apply the platform's standard dashboard primitives, **Then** the result
   is automatically consistent with existing dashboards — no role-specific
   re-implementation of patterns.

---

### Edge Cases

- A page exceeds its data fetch beyond a reasonable wait. Skeleton MUST
  remain calm (no looping shimmer that becomes anxiety-inducing) and a soft
  "still loading" cue MUST appear after 4 seconds.
- A user with reduced-motion enabled mid-session: motion preferences MUST
  be re-evaluated on each navigation, not cached at app boot.
- A college page is configured with a missing or invalid hero image: the
  system MUST fall back to a default identity treatment that still feels
  premium.
- A user on a very low-end device: the platform MUST detect or gracefully
  degrade so animations do not drop below the perceived-fluid threshold.
- An animated counter receives an updated target value mid-animation: the
  counter MUST re-target smoothly from current value to new target, not
  restart from zero.
- A user navigates rapidly (multiple route changes within the transition
  duration): the system MUST cancel the in-flight transition cleanly and
  start the new one without flicker or stuck content.
- Right-to-left (Arabic) layouts: every directional motion (slide, indicator
  movement) MUST mirror correctly in RTL.
- Scroll reveal triggers near the page bottom may never enter the viewport
  on a very tall screen — they MUST render in their final state on initial
  load if they are above the fold for the current viewport.

## Requirements *(mandatory)*

### Functional Requirements

**Motion Foundation**

- **FR-001**: System MUST define and expose a canonical set of motion design
  tokens covering durations (micro, short, medium, long, page-transition),
  easing curves (standard, accelerate, decelerate, emphasized), and
  distance/displacement amounts.
- **FR-002**: System MUST define and expose a canonical set of interaction
  state tokens covering hover, focus, pressed, selected, disabled, and
  loading treatments for each interactive primitive (button, link, card,
  input, row, tab).
- **FR-003**: All UI components MUST consume motion and interaction tokens
  rather than defining ad-hoc values. The platform MUST treat any new
  hardcoded duration, easing, or interaction-state value introduced in a
  component as a review-blocking violation.
- **FR-004**: System MUST honor `prefers-reduced-motion` at runtime: when
  the preference is "reduce", decorative motion (slides, scales, parallax,
  counters, scroll reveals) MUST be suppressed or collapsed to a fade
  ≤ 80ms; functional motion (focus indicators, error highlights, modal
  open/close intent) MUST remain perceivable.

**Page & Navigation Transitions**

- **FR-005**: System MUST animate route-to-route navigation with a
  consistent transition pattern (cross-fade with optional small lift),
  bounded by the page-transition token, on all in-app links.
- **FR-006**: System MUST preserve the persistent shell (header, side
  navigation, footer) across route transitions without remount-induced
  flicker.
- **FR-007**: System MUST animate active-navigation indicators (sidebar
  rail, top tabs, breadcrumbs) between positions rather than snapping.
- **FR-008**: System MUST restore scroll position on browser back
  navigation. Restoration of transient UI state (open menus, expanded
  rows, active filters) is out of scope for this feature and tracked as
  a follow-up.

**Dashboard, Hover, Focus, Loading**

- **FR-009**: System MUST render a visible focus ring on every focusable
  element using the focus token, on every page, in every role context, in
  both LTR and RTL.
- **FR-010**: System MUST render a hover state on every interactive element
  on pointer devices, using the hover token, with no layout shift.
- **FR-011**: System MUST render a pressed state on every interactive
  element on pointer and touch devices.
- **FR-012**: System MUST render an unambiguous disabled state on
  unavailable elements and prevent hover/pressed feedback for them.
- **FR-013**: System MUST render a per-action loading state (e.g.,
  in-button spinner, inline progress) for any user-initiated action that
  exceeds the perceptual-instant threshold; global page spinners are
  reserved for full-page loads.

**Skeletons & Empty/Error States**

- **FR-014**: System MUST display a skeleton state matching the rough
  layout shape of any data-loading region whose load exceeds the perceptual
  instant threshold.
- **FR-015**: System MUST cross-fade skeletons to real content with no
  measurable cumulative layout shift.
- **FR-016**: System MUST provide a distinct, intentional empty state
  (illustration or icon, message, suggested action) for any data region
  that legitimately has no items.
- **FR-017**: System MUST provide a distinct, actionable error state
  (message, retry, or guidance) for any data region whose request failed.

**Animated Statistics**

- **FR-018**: System MUST animate numeric headline statistics from a
  starting value (zero or previous) to the target value when the statistic
  first enters the viewport, using the animated-stat duration band and an
  ease-out curve.
- **FR-019**: System MUST re-target an animated statistic smoothly when its
  underlying value changes mid-animation, without restarting from zero.
- **FR-020**: System MUST NOT animate counters when reduced-motion is
  active; the final value MUST render immediately instead.

**Scroll-Based Reveals**

- **FR-021**: System MUST reveal sections via fade + small upward
  translation when they enter the viewport, once per element per page
  load.
- **FR-022**: System MUST stagger sibling element reveals by a small fixed
  delay, with an upper-bound total section duration.
- **FR-023**: System MUST render any reveal-eligible element that is above
  the fold on initial page load in its final state immediately, without
  triggering a reveal animation.

**College Visual Identity**

- **FR-024**: System MUST support a per-college identity profile
  consisting of accent color, hero imagery, icon, and optional motif,
  declared as data — not as bespoke styling per college.
- **FR-025**: System MUST render college pages using the platform's
  shared layout, components, and motion, with the identity profile
  applied as accent layers only.
- **FR-026**: System MUST validate accent-color contrast and fall back to
  a documented accessible variant when contrast fails.

**Homepage Storytelling**

- **FR-027**: System MUST present a homepage with a hero, role-narrative
  section(s), proof-point statistics, and a primary call-to-action,
  ordered to support a clear top-to-bottom narrative arc.
- **FR-028**: System MUST source homepage statistics from authoritative
  University of Zawia data (no synthetic placeholders).
- **FR-029**: System MUST suppress repeat full-intro animation for
  returning visitors within the same session.

**Cross-Role Consistency**

- **FR-030**: System MUST apply the same motion and interaction tokens
  across every role's surfaces (student, faculty, department head, dean,
  administrator, quality assurance, platform owner).
- **FR-031**: System MUST expose dashboard, list, detail, modal, and form
  primitives that role-specific surfaces consume rather than re-implement.

**Bilingual & RTL**

- **FR-032**: System MUST mirror directional motion (slides, indicator
  movements, drawer entrances) in RTL contexts so that motion semantics
  remain consistent with reading direction.
- **FR-033**: System MUST verify visual consistency (focus, hover, motion)
  in both Arabic (RTL) and English (LTR) on every surface.

### Non-Functional Requirements

- **NFR-001 (Performance — Smoothness)**: All motion MUST sustain
  effectively-fluid frame pacing on representative mid-range mobile
  hardware (target: 60 fps; jank budget: ≤ 1 dropped frame per second
  during transitions on the reference device).
- **NFR-002 (Performance — Layout Stability)**: Cumulative Layout Shift
  on every primary route MUST remain ≤ 0.05.
- **NFR-003 (Performance — Time to Interactive)**: First meaningful
  paint of the homepage and student dashboard MUST occur within the
  perceptual-instant threshold on a representative mid-tier device on a
  typical broadband connection.
- **NFR-004 (Performance — Bundle)**: Adding the motion system MUST NOT
  push the student dashboard route's bundle beyond the constitutional
  budget (250 KB gzipped, per Principle VI).
- **NFR-005 (Accessibility — WCAG 2.1 AA)**: Every interactive state
  (hover, focus, selected, error, disabled) MUST meet AA color-contrast
  requirements and remain perceivable to keyboard and screen-reader users.
- **NFR-006 (Accessibility — Reduced Motion)**: Reduced-motion preference
  MUST be respected for 100% of decorative motion across the platform.
- **NFR-007 (Consistency)**: 100% of motion durations and easings used in
  shipped code MUST resolve to the canonical motion tokens; ad-hoc values
  are zero-tolerance.
- **NFR-008 (Resilience)**: Motion features MUST degrade gracefully when
  the user's device, browser, or connection cannot support them — never
  blocking content, never trapping the user.
- **NFR-009 (Maintainability)**: Adding a new role surface or a new college
  MUST require zero modifications to the motion system — only data /
  configuration.
- **NFR-010 (Internationalization)**: 100% of motion behaviors MUST be
  verified in both Arabic (RTL) and English (LTR).

### UX Requirements

- **UX-001**: Motion is calm and serves comprehension — never decorative
  for its own sake. The default heuristic: if removing the motion would
  not change a user's understanding of the action, the motion is too loud.
- **UX-002**: Every action receives perceptible feedback within the
  perceptual-instant threshold; longer actions transition into a loading
  state within the same window.
- **UX-003**: Empty, loading, and error states are never afterthoughts;
  each is an intentional, branded surface.
- **UX-004**: First-impression surfaces (homepage, college landing) lead
  the eye toward the primary action without requiring a tutorial.
- **UX-005**: The platform never animates the same element twice in a way
  that competes for attention; one focal motion at a time per viewport.

### Motion Requirements

- **M-001**: Duration system MUST include at minimum: micro (≤ 100 ms,
  state change), short (100–200 ms, hover/focus), medium (200–300 ms,
  drawer/menu), long (300–450 ms, page transition), and animated-stat
  (≈ 600–900 ms, counters/progress reveals).
- **M-002**: Easing system MUST include at minimum: standard (in-out for
  most transitions), decelerate (entering content), accelerate (exiting
  content), and emphasized (high-attention moments).
- **M-003**: Distance/displacement tokens MUST define small (4–8 px),
  medium (12–24 px), and large (40–64 px) translations for reveal and
  transition motion.
- **M-004**: Stagger delay between sibling reveals MUST resolve to a
  single canonical token (e.g., ~40–80 ms) — not chosen per-screen.
- **M-005**: One motion vocabulary MUST cover both LTR and RTL by
  expressing direction in logical terms ("toward content" / "away from
  content") rather than literal left/right.
- **M-006**: All motion tokens MUST have a paired reduced-motion fallback
  that is either zero-duration or a fade ≤ 80 ms.

### Key Entities

- **Motion Token**: A named, semantic unit of motion (duration, easing,
  distance, stagger). Identified by purpose ("page-transition",
  "hover-lift") rather than raw value, so the system can evolve without
  rewriting consumers.
- **Interaction State Token**: A named, semantic unit of visual feedback
  (hover, focus, pressed, selected, disabled, loading) per primitive
  (button, card, input, row, tab).
- **College Identity Profile**: Per-college data record holding accent
  color, hero image reference, icon reference, optional motif, and
  optional alternate accessible-contrast accent. Drives college pages
  without bespoke code.
- **Reveal Trigger**: Configuration on a content section declaring it
  participates in scroll-reveal motion, including stagger group and
  threshold.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Consistency)**: A platform-wide audit finds zero ad-hoc
  motion durations or easings outside the canonical tokens (target:
  100% token adoption in shipped code).
- **SC-002 (Smoothness)**: On the reference mid-tier mobile device, every
  primary surface (homepage, student dashboard, faculty dashboard, dean
  dashboard, college page) sustains effectively-fluid motion with the
  defined jank budget across a representative interaction journey.
- **SC-003 (Stability)**: Cumulative Layout Shift on every primary route
  is ≤ 0.05 measured in production analytics.
- **SC-004 (Accessibility)**: 100% of decorative motion is verified to
  collapse correctly when reduced-motion is enabled. Automated and manual
  audits find zero WCAG 2.1 AA violations introduced by the motion
  system.
- **SC-005 (Perceived Quality)**: In a comparative usability study (n ≥ 12
  representative users across at least 3 roles), at least 85% rate Madrak
  as "feels premium" or "feels world-class" on a five-point quality scale,
  with motion and polish cited as top reasons.
- **SC-006 (Time to Confidence)**: First-time homepage visitors can
  identify Madrak's purpose and primary action within 10 seconds in
  task-based testing (≥ 90% success rate).
- **SC-007 (Adoption Velocity)**: Adding a new college or role surface
  takes ≤ 1 day of design + implementation effort and produces a result
  that passes the consistency audit on first review.
- **SC-008 (Loading Coverage)**: All known data-bound regions across the
  platform implement either a skeleton or a per-action loading indicator;
  global page spinners are restricted to full-page hard loads and forbidden
  for in-app actions by lint. Verified by code audit at release.
- **SC-009 (RTL Parity)**: Every motion behavior verified in LTR is also
  verified in RTL; zero RTL-specific regressions are open at release.
- **SC-010 (Returning-Visitor Calm)**: Returning visitors within the same
  session see no replays of full hero/intro motion (verifiable by session
  analytics or instrumented test).

## Assumptions

- The platform's existing role taxonomy (student, faculty, department
  head, dean, administrator, quality assurance, platform owner) is the
  full set in scope; no new role surfaces are introduced by this
  specification.
- The University of Zawia academic data layer (colleges, programs, and
  statistics) is available as the authoritative source per Principle III;
  this specification does not redefine that data.
- Existing business logic, permissions, and route structure remain
  unchanged; this specification touches the perceived-quality layer only.
- Mid-tier mobile reference device for performance targets is consistent
  with the device class typical for University of Zawia students; exact
  reference SKU is set at planning time.
- "Perceptual-instant threshold" follows established industry guidance
  (~100 ms for direct feedback, ~200 ms before a loading state is
  required) and will be expressed as concrete values in `/speckit-plan`.
- Design tokens are applied through the existing `design-system/`
  directory established by the constitution; this spec does not propose
  a new token system, only extends the canonical one.
- The platform's existing internationalization layer already supports
  RTL/LTR; this specification builds on it and does not redesign it.
