# Feature Specification: Motion Graphics & Animated Visual Enhancement

**Feature Branch**: `003-motion-graphics-layer`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Add elegant, lively, premium motion graphics and subtle animated visual elements across the product to make the experience feel more alive, modern, and polished without becoming distracting or noisy."

## Overview

Madrak's foundation is in place: `001-premium-motion-system` shipped the
**functional** motion (page transitions, focus rings, reveals, counters,
skeletons) and `002-visual-uplift` shipped the **composition** layer
(typography roles, section rhythm, chart palette, chrome polish, icon
discipline). What's missing is the **decorative / atmospheric** layer —
the ambient motion graphics, hover micro-interactions beyond the
functional minimum, scroll-linked accents, and brand-led visual moments
that make the product feel *alive* without telling the user to look at
anything.

This spec defines that layer. It is governed by one rule above all
others: **motion that doesn't help the user understand the UI must
either stop, hide, or fade when the user isn't looking at it.** No
infinite loops as a feature. No "wow" effects. No animation as
decoration that competes with content.

The output is a small, restrained set of motion-graphic patterns
applied to specific surfaces, with a strict disallowed-patterns list,
budget for GPU/CPU cost, and reduced-motion + visibility-pause
guarantees.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Hero feels alive on first paint (Priority: P1)

A first-time visitor lands on the homepage. Within the first second,
the hero conveys "premium product, considered" through a calm,
slow-drifting background gradient or mesh — not a static block of
color. The motion is so subtle a screenshot wouldn't show it; it's
felt, not seen. The motion pauses when the visitor scrolls past the
hero, when the tab loses focus, and when reduced-motion is on.

**Why this priority**: The first second of the homepage is the highest-
leverage moment in the product. Static heroes read as "template";
restrained living heroes read as "considered."

**Independent Test**: Open the homepage on a fresh session at desktop,
tablet, mobile. Confirm a calm ambient motion in the hero. Scroll
past the hero — motion stops. Switch tabs — motion stops. Toggle
reduced-motion — motion stops.

**Acceptance Scenarios**:

1. **Given** a fresh session on the homepage, **When** the page paints,
   **Then** the hero shows a calm, slow ambient motion within 200 ms
   that does not draw the eye away from the headline or CTA.
2. **Given** the visitor scrolls past the hero, **When** the hero
   exits the viewport, **Then** the ambient motion pauses (no GPU
   work).
3. **Given** the visitor switches browser tabs, **When** the
   `visibilitychange` event fires hidden, **Then** all ambient motion
   on the page pauses.
4. **Given** reduced-motion is active, **When** the homepage loads,
   **Then** the hero renders a static gradient — no ambient motion.

### User Story 2 — Cards and tiles respond as if they were physical (Priority: P1)

A faculty member hovers a KPI tile. Beyond the canonical lift +
shadow from `001-*`, the tile gains a subtle pointer-following glow:
a soft highlight that moves with the cursor across the tile's surface,
suggesting depth. On touch devices the glow is replaced with a soft
press-down. The effect is consistent across every card surface in the
product. Reduced-motion suppresses the glow but keeps the lift.

**Why this priority**: Card hover is the most-touched interaction in
the product. The functional lift alone reads as "well-built"; the
glow reads as "considered."

**Independent Test**: On the student/faculty/admin dashboards, hover a
KPI tile, list row, and college card. Confirm the glow follows the
pointer smoothly. Touch a tile on mobile — confirm a press-down
instead. Toggle reduced-motion — confirm only the lift.

**Acceptance Scenarios**:

1. **Given** a pointer device, **When** the user hovers a card or tile,
   **Then** a soft glow tracks the cursor position across the card's
   surface using GPU-friendly properties only (no layout shift).
2. **Given** a touch device, **When** the user taps a card, **Then**
   the press-down state replaces the glow.
3. **Given** the cursor leaves the card, **When** the pointer exits,
   **Then** the glow fades within the platform's micro-motion duration.
4. **Given** reduced-motion is active, **When** the user hovers,
   **Then** only the canonical lift + shadow render — no glow.

### User Story 3 — Content appears, never blinks in (Priority: P1)

A student opens the analytics tab. The skeleton shimmer ends, and the
real content **fades up** into place — not just cross-fades, but a
gentle 6 px upward translate paired with the fade. KPI tiles cascade
in over 240 ms with a 60 ms stagger. The effect is soft enough that a
returning visit doesn't feel like a presentation; a first visit feels
like the page is settling in.

**Why this priority**: The skeleton-to-content moment happens dozens
of times per session. The current cross-fade is correct; the fade-up
adds the perceived premium feel without any extra wait time.

**Independent Test**: Throttle the network to 3G. Open the student
dashboard, course detail, and a chart-bearing route. Confirm content
appears with a gentle fade-up + stagger. CLS stays ≤ 0.05.

**Acceptance Scenarios**:

1. **Given** any data-bound region is loading, **When** the data
   resolves and the skeleton swaps for content, **Then** the content
   fades in with a small upward translate within the canonical reveal
   duration.
2. **Given** a grid of tiles, **When** they appear after loading,
   **Then** they stagger in by the canonical stagger step.
3. **Given** Cumulative Layout Shift is measured, **When** content
   replaces a skeleton, **Then** CLS is ≤ 0.05.
4. **Given** a returning in-session visit, **When** the content
   reloads, **Then** the cascade is shorter (single fade, no stagger)
   so the page feels familiar, not theatrical.

### User Story 4 — Section accents draw the eye gently as you scroll (Priority: P2)

A visitor scrolls the homepage. As each narrative section enters the
viewport, a small decorative accent — a soft underline that draws
itself, a subtle parallax on a hero image, a tiny floating motif that
drifts a few pixels — punctuates the section. The accents stop the
moment they've fired; nothing loops. The page reads as a curated
journey, not a cycling animation reel.

**Why this priority**: Scroll-linked accents are the difference
between "page" and "experience." Without them, the homepage works;
with them, it feels designed.

**Independent Test**: Scroll the homepage end-to-end on desktop and
mobile. Confirm each section's accent fires once and stops. Scroll
back — accents do not replay. No accent runs while idle.

**Acceptance Scenarios**:

1. **Given** a section enters the viewport, **When** the threshold is
   crossed, **Then** the section's accent (underline draw, parallax
   shift, motif drift) plays once and ends.
2. **Given** the user scrolls away and back, **When** the section
   re-enters the viewport, **Then** the accent does not replay.
3. **Given** the viewport is idle, **When** the user is reading,
   **Then** no accent is animating.
4. **Given** reduced-motion is active, **When** sections enter the
   viewport, **Then** accents render in their final state without
   playing.

### User Story 5 — Empty and success states have a small, kind moment (Priority: P2)

A student finishes the last task on their list. Instead of a blank
content area, an empty state appears with a small motion accent — a
checkmark drawing itself, a leaf gently settling, a sun rising one
degree — that lasts < 800 ms total and never repeats. The same
treatment applies to "no notifications", "completed all courses",
"submitted successfully" surfaces. The motion is celebratory but
restrained — never confetti, never bouncing.

**Why this priority**: Empty + success surfaces are emotional moments
that the platform currently treats as void. A small animated moment
turns "blank" into "complete."

**Independent Test**: Trigger an empty state (clear the inbox), a
success state (submit a form), and a "completed all" state (finish a
training track). Confirm each plays a single, short, restrained
motion accent and stops.

**Acceptance Scenarios**:

1. **Given** an empty / success / completed state renders, **When**
   the surface mounts, **Then** a single motion accent plays for
   ≤ 800 ms and then settles.
2. **Given** the user revisits the same empty / success state in the
   same session, **When** it remounts, **Then** the accent does not
   replay.
3. **Given** reduced-motion is active, **When** the state mounts,
   **Then** the illustration renders in its final state.

### User Story 6 — Sidebar, topbar, and overlays move like one product (Priority: P2)

The sidebar opens (mobile) with a calm slide and a soft scrim fade.
Dropdowns scale from their trigger origin. Modals enter with a calm
spring on the panel and a fade on the scrim. Toasts slide in from
the trailing edge with a subtle bounce-in (≤ 1.05× overshoot). All
chrome motion shares one easing family. Closing reverses the entrance
with a tighter, faster curve so dismissal feels immediate.

**Why this priority**: Chrome is touched on every interaction. A
unified motion family across drawer/dropdown/modal/toast is the
quietest way to read as "one product."

**Independent Test**: Open + close sidebar (mobile), every topbar
dropdown, a modal, and fire 3 toasts. Confirm the motion family is
consistent; confirm dismissal is faster than entrance.

**Acceptance Scenarios**:

1. **Given** a chrome surface opens, **When** it animates in, **Then**
   it uses one of the canonical entrance curves (decelerate or
   emphasized) within the canonical medium duration band.
2. **Given** a chrome surface closes, **When** it animates out,
   **Then** it uses the accelerate curve and a shorter duration so
   dismissal is brisker than entrance.
3. **Given** reduced-motion is active, **When** any chrome surface
   opens or closes, **Then** the motion collapses to a fade ≤ 80 ms.

### User Story 7 — Brand mark introduces itself, once per session (Priority: P2)

On the very first paint of a session — homepage or first
authenticated route — the Madrak brand mark performs a single
introduction motion: the "م" letter draws or fades in with a tiny
companion accent. It runs once per session and never again. Returning
visits see a static mark.

**Why this priority**: A signature brand moment per session is a
quiet flex; running it on every page load reads as desperate.

**Independent Test**: Open a fresh session — confirm the mark
animates once. Navigate to other routes — confirm it stays static.
Open a new session (incognito) — confirm it animates again.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** the brand mark first appears,
   **Then** a single ≤ 600 ms introduction animation plays.
2. **Given** the same session continues, **When** the brand mark
   appears on subsequent routes, **Then** it renders static — no
   animation.
3. **Given** reduced-motion is active, **When** any session starts,
   **Then** the brand mark renders static.

### User Story 8 — Motion graphics governance (Priority: P3)

A reviewer can spot disallowed motion patterns at a glance — looping
decorations that don't pause when out of view, motion that competes
with text, hover effects that loop while idle, parallax that runs on
mobile, particle systems on dashboards. The platform makes these
patterns hard to introduce by accident.

**Why this priority**: Without an explicit "don't" list, the easiest-
to-overdo layer in the product will get overdone.

**Independent Test**: Pick three random pages. Verify against the
disallowed-patterns checklist below. Verify no infinite-loop
animations run while the user is reading. Verify no motion plays in
the background tab.

**Acceptance Scenarios**:

1. **Given** any page is open, **When** the user is reading
   (no interaction, no scroll), **Then** no decorative motion is
   playing.
2. **Given** the tab is hidden, **When** any motion would otherwise
   loop, **Then** it pauses.
3. **Given** the codebase is audited, **When** motion graphics are
   reviewed, **Then** every animation either binds to user input,
   binds to a one-shot lifecycle event, or is the documented hero
   ambient (paused per US1).

### Edge Cases

- A user on a low-end device (Android Go, iPhone SE 1st gen): motion
  graphics MUST gracefully simplify or disable when the device class
  is detected as constrained (heuristic: low-end CPU / RAM / `effectiveType`).
- A user opens many tabs and keeps Madrak in the background: ambient
  motion MUST pause via Page Visibility API; resume when foregrounded.
- A user scrolls past the hero and quickly back: the hero ambient must
  resume from its current phase (not restart from t=0) to avoid a
  visible re-glide.
- A returning visitor in the same session: brand-mark intro and
  homepage hero intro do NOT replay (carries `001-*` SC-010).
- A user with `prefers-reduced-data`: ambient motion MUST simplify
  (e.g., static gradient instead of mesh). Where supported.
- A keyboard-only user: pointer-glow is suppressed (no pointer);
  focus ring + canonical lift are the entire feedback.
- A right-to-left layout: directional decorative motion mirrors;
  non-directional accents (mark intro, success illustrations) render
  identically.
- An animated section accent below the fold: pre-renders in final
  state, never plays — accent triggers are inside-viewport-only.

## Requirements *(mandatory)*

### Functional Requirements

**Where motion graphics MAY appear**

- **FR-001**: System MUST limit ambient (always-running) motion to a
  documented allowlist — homepage hero only.
- **FR-002**: System MUST place pointer-glow / sheen on cards, tiles,
  and list rows — never on text blocks, body content, navigation
  items, or form fields.
- **FR-003**: System MUST place skeleton-to-content fade-up cascade
  on every data-bound region whose loading state uses `Skeleton`.
- **FR-004**: System MUST attach scroll-linked decorative accents
  (underline draw, parallax, motif drift) to homepage marketing
  sections only — not to in-product surfaces (dashboards, lists,
  forms).
- **FR-005**: System MUST attach success / empty / completed motion
  accents only to surfaces whose semantic type is `success`,
  `empty`, or `completed`.
- **FR-006**: System MUST run the brand-mark intro once per session
  on the very first paint that contains it.

**Where motion graphics MUST NOT appear**

- **FR-007**: System MUST NOT animate body text, paragraphs, or
  primary CTAs in a way that competes for attention with content.
- **FR-008**: System MUST NOT loop decorative motion on dashboards,
  list views, detail pages, or forms.
- **FR-009**: System MUST NOT use particle systems, confetti,
  bouncing illustrations > 1.05× overshoot, or auto-rotating
  carousels.
- **FR-010**: System MUST NOT use parallax on mobile breakpoints
  (< 768 px viewport width).
- **FR-011**: System MUST NOT animate the page background while the
  user is interacting with content (scroll, type, hover).

**Motion style**

- **FR-012**: System MUST animate decorative motion exclusively via
  GPU-friendly properties (`transform`, `opacity`, `filter`) — never
  layout-affecting properties.
- **FR-013**: System MUST cap decorative-motion peak amplitude at
  ≤ 6 px translation, ≤ 1.02× scale, ≤ 8 deg rotation. Larger
  motion is reserved for functional motion (page transitions,
  skeleton-to-content cascade).
- **FR-014**: System MUST cap decorative-motion duration: micro-
  interactions ≤ 200 ms, ambient-loop period ≥ 8 s (slow), one-shot
  illustrations ≤ 800 ms.
- **FR-015**: System MUST consume canonical motion easings from
  `001-*` (`--motion-ease-standard | -decelerate | -accelerate |
  -emphasized`); never define new easing curves for decorative motion.

**Lifecycle and pause rules**

- **FR-016**: System MUST pause every ambient or scroll-linked
  decorative motion when the page's `document.visibilityState` is
  `hidden`.
- **FR-017**: System MUST resume ambient motion in-place (not from
  t=0) when visibility returns.
- **FR-018**: System MUST pause ambient motion when the host element
  is fully outside the viewport (intersection ratio = 0).
- **FR-019**: System MUST not run any decorative motion while the
  user is actively typing in an input or editor.
- **FR-020**: System MUST detect or heuristically infer constrained
  devices (low memory, low CPU, slow network, data-saver) and
  simplify or disable decorative motion accordingly.

**Reduced-motion + a11y**

- **FR-021**: System MUST suppress decorative motion 100% when
  `prefers-reduced-motion: reduce` is active. Functional motion
  inherits its existing reduced-motion behavior from `001-*`.
- **FR-022**: System MUST render the final state of every decorative
  motion when reduced-motion is active — never an unfinished
  animation.
- **FR-023**: System MUST keep decorative motion entirely
  non-blocking for keyboard, screen-reader, and assistive
  technologies. No focus, no role, no aria-live attached to
  decorative motion graphics.

**Per-component motion**

- **FR-024**: Buttons gain a subtle press depth (translateY +
  scale 0.98) on `:active`; no other decorative motion.
- **FR-025**: Cards / tiles / rows gain a pointer-glow that tracks
  the cursor on `pointer:fine`; suppressed on touch and keyboard
  focus.
- **FR-026**: Tabs animate the active indicator using the canonical
  shared-layout pattern from `001-*` (no replacement).
- **FR-027**: Charts cascade their series in once on first paint
  (line draws, bars rise, doughnut sweeps) — never on subsequent
  data updates within the same session.
- **FR-028**: Counters use `AnimatedNumber` from `001-*` (no
  replacement).

**Per-page motion**

- **FR-029**: Homepage MUST present the hero ambient motion (US1),
  per-section scroll accents (US4), and proof-point counter
  cascade (existing). No other ambient motion on the homepage.
- **FR-030**: Dashboards MUST limit motion to: page transition
  (from `001-*`), skeleton-to-content cascade (US3), pointer-glow
  on tiles (US2), and chart cascade-on-first-paint (FR-027).
- **FR-031**: Detail pages, forms, and list views MUST limit motion
  to: page transition, hover/focus tokens, and skeleton-to-content.
  No ambient, no scroll-linked accents.
- **FR-032**: Auth pages MUST be motion-quiet: only canonical
  hover/focus/loading and the brand-mark intro (once per session).

### Non-Functional Requirements

- **NFR-001 (Calm-while-idle)**: Zero decorative motion runs while
  the user is idle (no input, no scroll, no hover) on any in-product
  surface. Verified by 5 s static-screenshot capture comparison.
- **NFR-002 (Performance — Idle CPU/GPU)**: When the user is idle
  on a primary route, GPU activity attributable to motion graphics
  MUST be ≤ 1% on the reference mid-tier mobile device.
- **NFR-003 (Performance — Smoothness)**: All decorative motion
  sustains effectively-fluid pacing on the reference device (60 fps
  target; ≤ 1 dropped frame/second during any active motion).
- **NFR-004 (Performance — Bundle)**: This layer adds ≤ 8 KB
  gzipped to the student dashboard route over the post-`002-*`
  baseline. Lottie animations (if any) lazy-load and fall outside
  the initial chunk.
- **NFR-005 (Performance — Layout Stability)**: CLS ≤ 0.05 on every
  primary route remains unchanged.
- **NFR-006 (Accessibility — Reduced Motion)**: 100% of decorative
  motion suppressed under `prefers-reduced-motion: reduce`.
- **NFR-007 (Accessibility — Contrast)**: Decorative motion never
  reduces contrast of foreground text below WCAG AA. Ambient
  gradients and pointer-glows MUST be measured for contrast under
  worst-case overlap.
- **NFR-008 (Battery)**: Ambient motion respects the Page Visibility
  API and the heuristic constrained-device gate so background-tab
  battery cost is zero and constrained-device cost is minimized.
- **NFR-009 (Maintainability)**: Adding a new decorative-motion
  pattern requires a documented entry in the motion-graphics
  contract, never a one-off implementation per page.
- **NFR-010 (Internationalization)**: 100% of directional decorative
  motion verified in both LTR and RTL.

### UX Requirements

- **UX-001**: Motion is *felt, not seen*. The default heuristic: if
  a screenshot would show the motion, it's too large or too fast.
- **UX-002**: Ambient motion never moves at a constant speed; it
  drifts, eases, breathes — speed varies within the cycle.
- **UX-003**: Hover feedback feels instant (≤ 100 ms), but the glow
  itself smooths via the canonical short duration.
- **UX-004**: Returning-in-session visits feel familiar, not
  theatrical (intro motions don't replay).
- **UX-005**: When in doubt about whether a motion belongs, default
  to *no motion*. Decorative motion is a privilege, not a default.

### Motion Requirements

- **M-001**: Decorative motion MUST consume the canonical
  `--motion-duration-*`, `--motion-ease-*`, `--motion-distance-*`,
  and `--motion-stagger-*` tokens from `001-*`. No new motion
  tokens are added by this layer.
- **M-002**: Ambient-motion period (hero gradient, mark intro
  companion drift) MUST be ≥ 8 s and use `--motion-ease-standard`.
- **M-003**: Pointer-glow MUST be implemented as a pseudo-element
  + GPU-only properties. Cursor coordinates feed in via CSS custom
  properties, not direct style mutation per frame.
- **M-004**: Skeleton-to-content cascade MUST use
  `--motion-duration-reveal` + `--motion-ease-decelerate` +
  `--motion-stagger-step` (no new values).
- **M-005**: Section accents MUST trigger from
  `IntersectionObserver` once-per-element, with the rule from
  `001-*` Reveal: render-final-on-load if above the fold.

### Disallowed Motion Patterns *(mandatory list)*

The following are forbidden by this contract:

| Pattern                                     | Why it's banned                                  |
|---------------------------------------------|--------------------------------------------------|
| Auto-rotating carousels                     | Steals attention; rarely re-engaged              |
| Continuous-loop decorations on dashboards   | Reads as anxious, not premium                    |
| Particle systems / floating-orb backgrounds | Too easy to overdo; high GPU cost                |
| Confetti, bouncing illustrations, mascots   | Childish; fails academic-credibility test        |
| Parallax on mobile                          | Performance cost + small viewport defeats effect |
| Motion that overlays text                   | Reduces readability + contrast                   |
| Hover effects that animate after pointer-leave (looping shimmer/pulse) | Reads as decorative-not-functional |
| Decorative motion bound to `setInterval`    | No visibility/intersection awareness             |
| Multiple competing motions in one viewport  | Splits attention; UX-005 violation               |
| Background-tab animations                   | Wastes battery; violates NFR-008                 |
| Animation as a substitute for clear copy    | Fails accessibility floor                        |
| Animations that exceed FR-013 amplitude     | Reads as gimmicky                                |

A PR that introduces any of the above MUST justify the exception in
the PR description AND get explicit governance review.

### Key Entities

- **Decorative-Motion Pattern**: A named, contract-bound piece of
  motion (e.g., `pointer-glow`, `hero-ambient`, `section-underline-draw`).
  Each pattern declares its surface, lifecycle (one-shot / hover /
  ambient), amplitude, duration, easing, pause-rules, and
  reduced-motion fallback.
- **Pause Trigger**: A documented event that pauses ambient motion —
  page visibility change, intersection-ratio = 0, idle keyboard
  input, low-end-device gate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Premium Perception)**: In a comparative review with the
  pre-`003-*` state (≥ 5 reviewers, blind), ≥ 80% identify the
  post-`003-*` state as "feels alive / premium / considered" — and
  none identify it as "distracting / busy / over-animated."
- **SC-002 (Calm-while-idle)**: On any primary route, with the user
  idle for 5 s, zero decorative motion plays. Verified via static
  screenshot diff.
- **SC-003 (Background-tab silence)**: With the tab hidden for 5 s,
  zero motion-driven CPU work occurs. Verified by frame-rate
  profiling on the reference device.
- **SC-004 (Reduced-motion honor)**: 100% of decorative motion
  suppressed under `prefers-reduced-motion: reduce`. Verified by
  the existing reduced-motion E2E gate from `001-*`.
- **SC-005 (Performance budgets)**: 60 fps sustained, CLS ≤ 0.05,
  bundle add ≤ 8 KB gzip. Verified per-PR.
- **SC-006 (Returning-visitor calm)**: Brand-mark intro and hero
  ambient intro do not replay on subsequent in-session visits.
  Verified via session-storage gate.
- **SC-007 (Disallowed-pattern absence)**: A code audit finds zero
  instances of the disallowed patterns table. Verified by review
  + lint.
- **SC-008 (RTL parity)**: All directional decorative motion
  verified in both LTR and RTL with no regression.
- **SC-009 (Constrained-device behavior)**: On the reference
  low-end profile (effective slow 4G + low memory), decorative
  motion gracefully simplifies or disables; the page remains
  fluid.
- **SC-010 (Body-text protection)**: Zero decorative motion
  overlaps body text in a way that reduces contrast below WCAG
  AA at any animation phase.

## Assumptions

- The motion + interaction tokens, primitives (`Reveal`, `Skeleton`,
  `AnimatedNumber`, `PageTransition`, `useReducedMotion`), and the
  type-role + chart-palette layer from `001-*` and `002-*` are
  stable. This spec extends them at the *decorative* layer only.
- Reference mid-tier mobile hardware = the device class established
  by `001-*` (Snapdragon 6-class, 4 GB RAM Android).
- Reference low-end profile for SC-009 = effective Slow 4G +
  Network Information API hint of low-bandwidth or `prefers-reduced-data`.
- All decorative motion is implemented in CSS or with the existing
  `useReducedMotion()` hook + IntersectionObserver — no new runtime
  animation library is introduced (consistent with `001-*` R-001).
- Lottie JSON, where used at all, is loaded only on the surface
  that consumes it (not in the base bundle). Whether to use Lottie
  vs. CSS keyframes for empty/success illustrations is left to
  planning per case.
- This spec deliberately does not create new components; it adds
  motion behavior to existing ones. Any new primitive (e.g., a
  `<PointerGlow>` wrapper) is justified in planning, not declared
  here.
- "Once per session" semantics use the existing
  `madarek.intro.seen` sessionStorage flag from `001-*` for the
  homepage hero, and a new `madarek.brand-mark.seen` flag for the
  brand mark.
