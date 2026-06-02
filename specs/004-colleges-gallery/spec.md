# Feature Specification: Colleges Gallery — Discoverable, Organized, Beautiful

**Feature Branch**: `004-colleges-gallery`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "اريد اضافة لما انقر على الكليات يظهر لي كل الكليات التي بالجامعة كاضافة منظمة وجميلة" (When I click on Colleges, show me all the colleges in the university as an organized and beautiful addition).

## Overview

Today the homepage shows a static badge "أكثر من 25 كلّيّة" — informative
but not actionable. The `/colleges` route exists with a working
city-grouped index, but it isn't reachable from the homepage as a
deliberate discovery moment. This feature closes that loop:

1. The "أكثر من 25 كلّيّة" badge on the homepage becomes a clickable
   discovery anchor that leads visitors to a beautiful gallery of
   every college.
2. The gallery itself is upgraded from a flat city-grouped list into
   an organized, filterable, visually-rich experience that lets a
   visitor scan ~26 colleges in seconds and dive into any one with
   a single tap.
3. The gallery uses real University of Zawia structure
   (الزاوية / العجيلات / زوارة / أبو عيسى / ناصر / مناطق أخرى) and
   real college data — never synthetic.

This feature is presentation-and-discovery only. It does not change
how college data is sourced, the college detail page contract, or
the `001-*` / `002-*` foundation. It uses the existing motion
primitives, type roles, and chart palette.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — From homepage to "all colleges" in one tap (Priority: P1)

A first-time visitor lands on the Madrak homepage, sees the hero
"أكثر من 25 كلّيّة" badge, taps it, and lands on a gallery showing
every college in the University of Zawia organized by campus and
visually distinct. The journey is one tap, takes < 2 seconds on a
typical connection, and feels like a deliberate part of the homepage
narrative — not a hidden link.

**Why this priority**: The homepage today tells visitors the
university is large, but doesn't show them. A clickable, polished
gallery turns a claim into evidence — the single most high-leverage
homepage moment for building credibility.

**Independent Test**: From a fresh session, click the "أكثر من 25
كلّيّة" badge on the homepage. Confirm one tap → gallery loaded
with all colleges visible. Confirm the gallery feels like an
intentional destination (not a fallback list).

**Acceptance Scenarios**:

1. **Given** a visitor lands on the homepage, **When** they encounter
   the "أكثر من 25 كلّيّة" element, **Then** it is clearly
   identifiable as actionable (cursor change, hover state) and
   announces itself to assistive technology as a link.
2. **Given** the visitor taps the badge, **When** the gallery loads,
   **Then** the gallery's first viewport shows the page title,
   campus filter, and at least the first row of colleges within
   2 seconds on a typical connection.
3. **Given** the visitor lands on the gallery, **When** they read it,
   **Then** they understand at a glance: total count, campus
   structure, and that each card is itself a link into a college's
   page.

---

### User Story 2 — Gallery feels designed, not listed (Priority: P1)

A student opens the gallery. Each college card has a clear name,
city tag, headline counts (departments, students, faculty, courses),
a soft hover lift, and a calm reveal as it scrolls into view. Cards
are grouped by campus with a campus header that names the campus and
shows its college count. The whole page reads like a curated catalog,
not a database dump.

**Why this priority**: The gallery is the only place where the full
institution is on display. A flat list reads as "table of contents";
a designed gallery reads as "campus tour."

**Independent Test**: Open `/colleges` on desktop and mobile.
Confirm campus headers, card grid, hover behavior, scroll-reveal,
and overall composition feel polished — not template.

**Acceptance Scenarios**:

1. **Given** the gallery renders, **When** the user scrolls,
   **Then** each campus group reveals once with the canonical
   reveal motion from `001-*` and stops.
2. **Given** the user hovers a college card on a pointer device,
   **When** the cursor enters, **Then** the card lifts subtly
   using `--state-card-hover-*` tokens with no layout shift.
3. **Given** the gallery has been seen in this session, **When**
   the visitor returns to the page, **Then** the reveal cascade
   collapses to instant placement — no theatrical replay.
4. **Given** any college has an Identity Profile (from `001-*`
   College Identity), **When** its card renders, **Then** the
   card surfaces a subtle accent (a small color bar / accent
   border) drawn from the identity profile.

---

### User Story 3 — Find any college in seconds (Priority: P1)

A faculty member visits the gallery to find "كلية الهندسة". They
type three letters into a search field, and the matching colleges
filter live. They tap a campus filter ("الزاوية") and only colleges
on that campus show. Search and campus filter compose. Clearing the
filters returns to the full gallery.

**Why this priority**: With 26+ colleges across 6 campuses, scanning
top-to-bottom doesn't scale. Search + campus filter is the minimum
viable way to make the gallery actually useful for repeat visitors.

**Independent Test**: Open the gallery. Type "هندس" in search —
verify only matching colleges show. Tap "العجيلات" filter — verify
only colleges in العجيلات show. Combine both — verify intersection.
Clear — verify all return.

**Acceptance Scenarios**:

1. **Given** the search field is empty and no campus filter is
   active, **When** the gallery renders, **Then** every college
   is visible.
2. **Given** the user types into search, **When** characters are
   entered, **Then** the visible cards filter live (debounce ≤
   100 ms) by Arabic + English name match.
3. **Given** the user taps a campus filter chip, **When** active,
   **Then** only colleges in that campus show; the chip's active
   state is unmistakable.
4. **Given** filters return zero results, **When** the empty state
   appears, **Then** it shows a helpful message and a "clear
   filters" action.
5. **Given** the user clears all filters, **When** they tap the
   clear action or empty the search field, **Then** the full
   gallery returns instantly.

---

### User Story 4 — Each campus is its own visual section (Priority: P2)

A student scrolls the gallery. Each campus section has a small
section header showing the campus name, college count, and a
distinguishing visual treatment (subtle band background or accent
hairline) so it's clear they've moved between sections. The order
follows the real campus structure with the main campus first.

**Why this priority**: Without visual separation, the gallery reads
as one long list. With it, the city-grouped structure becomes a
narrative.

**Independent Test**: Scroll the gallery from top to bottom on
desktop and mobile. Confirm each campus section is visually
distinct without being noisy. Confirm campus order: الزاوية،
العجيلات، زوارة، أبو عيسى، ناصر، مناطق أخرى.

**Acceptance Scenarios**:

1. **Given** the gallery renders multiple campuses, **When** the
   user scrolls between them, **Then** the boundary between two
   campuses is unambiguous from typography and spacing alone.
2. **Given** the campus order, **When** the gallery loads,
   **Then** الزاوية renders first; orphan or unknown cities sort
   to "مناطق أخرى" at the end.
3. **Given** a campus has only one college, **When** rendered,
   **Then** the campus section still shows the header (name +
   count) without looking awkward.

---

### User Story 5 — College card surfaces just enough (Priority: P2)

Each college card shows: Arabic name (largest), English name (if
present, smaller), campus tag, four headline counts (departments,
students, faculty, courses), and an accent stripe drawn from the
college's identity profile (when set). Counts are tabular numerals.
Hovering the card reveals a subtle "→ زيارة الصفحة" affordance.
Tapping the card opens the college's detail page.

**Why this priority**: The card is the gallery's atom. Too much,
and the grid feels noisy; too little, and visitors can't compare
colleges. The right surface is "scan + commit."

**Independent Test**: Compare two colleges' cards. Confirm at a
glance which is larger (student count) and which is more diverse
(department count). Tap a card — land on its detail page.

**Acceptance Scenarios**:

1. **Given** a college card renders, **When** the user reads it,
   **Then** the Arabic name is the most prominent element, with
   campus + counts as supporting type.
2. **Given** a card has any null or zero count, **When** rendered,
   **Then** the card displays "—" for missing data rather than
   "0" for unknown values; "0" only renders when the count is
   genuinely zero (per Principle III: never invent data).
3. **Given** a college has an Identity Profile in
   `colleges.config.ts`, **When** the card renders, **Then** an
   accent stripe (top or leading edge) uses the profile's accent
   color.
4. **Given** the user taps any card, **When** the tap completes,
   **Then** the user navigates to that college's detail page.

---

### User Story 6 — Mobile gallery is intentional, not compressed (Priority: P1)

A student on a 360 px phone opens the gallery. Cards stack
single-column with the same hierarchy as desktop. Search and
campus filters are within thumb reach. Touch targets are ≥ 44×44.
No horizontal scroll. Campus headers stay legible.

**Why this priority**: The majority of student traffic is mobile.
Compressed-desktop gallery fails them.

**Independent Test**: At 360 px viewport, walk the gallery from
top to bottom. Search, filter, tap a card. Confirm no overflow,
all controls reachable with one thumb.

**Acceptance Scenarios**:

1. **Given** a 360 px viewport, **When** the gallery renders,
   **Then** college cards stack single-column with no horizontal
   scroll.
2. **Given** the same viewport, **When** the user reaches for the
   campus filter chips, **Then** the chip strip horizontally
   scrolls within itself (carousel-style) without affecting the
   page; sticky-positioned at the top of the gallery while
   scrolling.
3. **Given** any tap target on the gallery, **When** measured,
   **Then** its effective hit area is ≥ 44×44 CSS px.

---

### User Story 7 — Empty / loading / error states match the gallery's quality (Priority: P2)

When the gallery is loading, a skeleton matching the gallery's
layout shape renders within 100 ms. When the API fails, an error
state with retry appears. When all colleges are filtered out, an
empty state with a "clear filters" action appears. None of these
states drop the visual quality of the gallery.

**Why this priority**: Loading and error states are the gallery's
failure modes. They are seen on every cold load and every flaky
network — they need to feel as intentional as the populated state.

**Independent Test**: Throttle network to 3G and load the gallery —
confirm skeleton matches the final layout. Force an error (DevTools
network throttle) — confirm retry-able error state. Type a
nonsense search — confirm empty state with clear-filters action.

**Acceptance Scenarios**:

1. **Given** the gallery is loading, **When** the page first
   paints, **Then** a skeleton consisting of campus headers + card
   grid placeholders renders within 100 ms.
2. **Given** the gallery API call fails, **When** the error state
   shows, **Then** the user sees a clear message and a retry
   button that re-invokes the fetch.
3. **Given** the active filters return zero results, **When** the
   empty state shows, **Then** it differs visually from the
   skeleton and exposes a "clear filters" action.

---

### Edge Cases

- A college with very long Arabic name: card MUST wrap gracefully
  on two lines max; the campus tag and counts MUST stay aligned.
- A campus with only one college: the campus section MUST still
  render with header + single card.
- A campus with > 10 colleges: cards MUST grid-flow naturally; no
  fixed-row constraints.
- A college with no Identity Profile yet: the accent stripe MUST
  fall back to a neutral platform accent — never invented.
- A college with all zero counts: "—" for unknown, "0" for genuine
  zero (e.g., a brand-new college not yet seeded). Visual treatment
  matches.
- Search input contains a mix of Arabic + English: matching MUST
  be diacritic-insensitive in Arabic and case-insensitive in
  English.
- The visitor disables JavaScript: the gallery degrades to the
  current city-grouped server-rendered list (acceptable fallback —
  JS is required for filtering only).
- Reduced-motion: scroll-reveal collapses to instant placement;
  hover lift remains; no decorative motion plays.
- The "أكثر من 25 كلّيّة" badge on the homepage is seen by a user
  who has visited `/colleges` already in this session: the badge
  remains active and clickable (it isn't dismissed) — the click
  is the standard navigation, not a one-shot.
- The visitor is logged in: tapping the badge takes them to
  `/colleges` whether or not they're authenticated — the gallery
  is publicly visible.

## Requirements *(mandatory)*

### Functional Requirements

**Homepage Discovery**

- **FR-001**: System MUST render the "أكثر من 25 كلّيّة" element on
  the homepage hero as an actionable link to `/colleges`.
- **FR-002**: System MUST give the badge a hover state (cursor +
  visual cue) and a focus ring consistent with the platform's
  canonical interactive tokens.
- **FR-003**: System MUST surface a hint affordance ("→") next to
  the badge text indicating it is a link.
- **FR-004**: System MUST source the count value (currently "أكثر
  من 25") from the real University of Zawia college count when
  available; if the count is hard-coded for marketing, it MUST be
  documented as such in code.

**Gallery Page**

- **FR-005**: System MUST present every college in the canonical
  data source on `/colleges` — never paginated, never hidden behind
  "load more."
- **FR-006**: System MUST group colleges by campus with the campus
  order: الزاوية, العجيلات, زوارة, أبو عيسى, ناصر, مناطق أخرى.
  Unknown / orphan campuses sort into "مناطق أخرى" at the end.
- **FR-007**: System MUST render each campus group with a header
  showing campus name + college count.
- **FR-008**: System MUST render each college as a card showing:
  Arabic name, English name (if present), campus tag, and four
  count chips: departments, students, faculty, courses.
- **FR-009**: System MUST display tabular numerals for all numeric
  counts on cards.
- **FR-010**: System MUST display "—" instead of "0" when a count
  is genuinely unknown / unseeded; "0" renders only when the count
  is verifiably zero (Principle III).
- **FR-011**: System MUST surface a college's Identity-Profile
  accent on its card when a profile exists; fall back to a neutral
  platform accent when not.
- **FR-012**: System MUST link each card to `/colleges/<id>`; the
  whole card MUST be the click target.

**Search and Filter**

- **FR-013**: System MUST provide a search input that filters
  colleges by Arabic name and English name, live, with ≤ 100 ms
  debounce.
- **FR-014**: System MUST treat Arabic search as diacritic-
  insensitive and English search as case-insensitive.
- **FR-015**: System MUST provide campus filter chips: one chip
  per campus + an "all" chip. Tapping a chip applies its filter;
  tapping "all" clears the campus filter.
- **FR-016**: System MUST compose search and campus filter (logical
  AND).
- **FR-017**: System MUST persist active filters in the URL query
  string (`?q=...&campus=...`) so a filtered view is shareable.
- **FR-018**: System MUST display a "clear filters" action that
  resets both search and campus filter.

**Loading / Empty / Error**

- **FR-019**: System MUST render a skeleton state that mirrors the
  gallery's layout (campus headers + card grid) within 100 ms of
  page mount when the data is not yet resolved.
- **FR-020**: System MUST render an error state with a retry
  action when the API call fails.
- **FR-021**: System MUST render an empty state distinct from the
  skeleton when active filters return zero results, with a
  "clear filters" action.
- **FR-022**: System MUST render a "no colleges yet" empty state
  distinct from the filtered-empty state when the canonical data
  source has zero entries.

**Mobile**

- **FR-023**: System MUST stack college cards single-column at
  viewport widths < 640 px.
- **FR-024**: System MUST keep search input and campus chip strip
  reachable at 360 px without horizontal scroll on the document;
  the chip strip MAY scroll horizontally within itself.
- **FR-025**: System MUST keep search + filter sticky at the top
  of the gallery while scrolling on mobile so both stay in thumb
  reach.
- **FR-026**: System MUST guarantee touch-target hit areas of
  ≥ 44×44 CSS pixels on every interactive element.

**Motion + Accessibility (inherits 001-* and 002-*)**

- **FR-027**: System MUST animate each campus section's reveal
  via the canonical `Reveal` primitive (one-shot, above-the-fold
  detection, reduced-motion bypass).
- **FR-028**: System MUST honor `prefers-reduced-motion: reduce`
  for every motion introduced; functional motion (focus ring,
  hover lift) remains visible.
- **FR-029**: System MUST mirror directional motion in RTL.
- **FR-030**: System MUST keep the gallery fully keyboard-navigable;
  Tab order: search → campus chips → first card → … → last card.
- **FR-031**: System MUST announce filter changes to assistive
  technology via an `aria-live="polite"` region (e.g., "12 college
  results").

### Non-Functional Requirements

- **NFR-001 (Performance — Time to interactive)**: The gallery
  reaches first interactive within 2 seconds on a typical
  broadband connection on the reference device.
- **NFR-002 (Performance — Layout Stability)**: CLS ≤ 0.05 on
  the gallery route; the skeleton-to-content swap must not push
  surrounding content.
- **NFR-003 (Performance — Bundle)**: Adding the gallery upgrade
  MUST add ≤ 6 KB gzipped to the gallery route over the current
  baseline.
- **NFR-004 (Accessibility — WCAG AA)**: Every interactive
  element on the gallery passes WCAG 2.1 AA color-contrast and
  focus-visible requirements.
- **NFR-005 (Internationalization)**: The gallery renders
  identically in LTR and RTL (English locale and Arabic locale)
  with no layout regressions.
- **NFR-006 (Resilience)**: The gallery degrades gracefully when
  the data source is partially populated (some campuses missing),
  has empty fields (no English name), or returns a single
  college.
- **NFR-007 (Maintainability)**: Adding a new college to the
  data source MUST cause it to appear in the gallery
  automatically — no gallery-page code change required.

### UX Requirements

- **UX-001**: The gallery reads as a curated catalog, not a
  database dump.
- **UX-002**: Search + campus filter is the only "interface" the
  visitor needs to learn — no advanced filters, no sorting menu,
  no faceted search panel.
- **UX-003**: Every campus's identity is legible from typography
  and spacing alone — accent treatments are reinforcement, not
  the primary signal.
- **UX-004**: The card surfaces just enough to compare colleges
  at a glance; everything else lives on the detail page.
- **UX-005**: Empty / loading / error states have the same visual
  care as the populated state.

### Visual Requirements

- **V-001**: Campus headers consume the canonical
  `--type-headline-*` role tokens (from `002-*`).
- **V-002**: College card name consumes `--type-headline-size-sm`;
  campus tag consumes `--type-label-*`; counts consume
  `--type-metric-size` with `.tabular-nums`.
- **V-003**: The gallery's vertical rhythm uses
  `--section-pad-y-narrow` (from `002-*`) between campus groups.
- **V-004**: Cards consume the canonical `--state-card-*`
  interaction tokens (from `001-*`); no per-card styling drift.
- **V-005**: The accent stripe on identity-profile cards uses
  the existing `--college-accent` custom property (from `001-*`
  Identity Profile contract).
- **V-006**: Search input and filter chips consume the canonical
  `--state-input-*` and button tokens; no bespoke styling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Discovery)**: ≥ 70% of first-time homepage visitors
  who interact with any element interact with the "أكثر من 25
  كلّيّة" badge / link within their first session, measurable
  via analytics on the badge's click event.
- **SC-002 (Time-to-find)**: A visitor can find any specific
  college (using its Arabic or English name) within 5 seconds via
  search in task-based testing (≥ 90% success rate).
- **SC-003 (Comprehension)**: ≥ 90% of visitors correctly identify
  the total college count, the largest campus, and the campus
  structure within 10 seconds of arriving at the gallery, in
  task-based testing.
- **SC-004 (Mobile excellence)**: Zero open horizontal-overflow,
  clipping, or overlap defects on `/colleges` at 360 px after
  this feature ships.
- **SC-005 (Performance)**: First-contentful render of the
  gallery within 1.5 s on the reference mid-tier device on a
  typical broadband connection; CLS ≤ 0.05 in production
  analytics.
- **SC-006 (Reduced-motion honor)**: 100% of decorative motion
  on the gallery is suppressed under `prefers-reduced-motion:
  reduce`.
- **SC-007 (RTL parity)**: Every visual + motion behavior
  verified in LTR is also verified in RTL; zero RTL-specific
  defects open at release.
- **SC-008 (Real-data integrity)**: Zero synthetic / placeholder
  colleges shipped — every entry traces to canonical University
  of Zawia data (Principle III).
- **SC-009 (Identity adoption)**: When a college Identity Profile
  is added in `colleges.config.ts`, its card surface MUST reflect
  the accent within one PR — no gallery code change required.
- **SC-010 (Auto-update)**: When a new college is added to the
  canonical data source, it appears in the gallery on the next
  load with zero gallery-code change.

## Assumptions

- The existing `/api/colleges` endpoint and `CollegeListItem` type
  are stable and continue to be the data source. This feature
  does not change them.
- The existing `CollegesIndexPage` in `frontend/src/pages/colleges/
  CollegePages.tsx` is the foundation; this feature upgrades it
  in place rather than replacing it.
- The College Identity Profile system from `001-*` is the source
  for accent colors when a profile exists.
- The motion primitives (`Reveal`, `RevealGroup`, `Skeleton`),
  type-role tokens, state tokens, and chart palette from `001-*`
  + `002-*` are stable and consumed by this feature without
  redesign.
- The homepage badge "أكثر من 25 كلّيّة" is currently a static span;
  upgrading it to a link is a small composition change in
  `LandingPage.tsx`.
- "Real college count" for FR-004 means: a build-time or runtime
  value derived from the canonical data source's length, OR an
  intentional marketing minimum ("أكثر من 25") with an inline
  comment justifying the choice. Either is acceptable; ad-hoc
  numbers are not.
- This feature does not alter the college detail page (`/colleges/<id>`).
- This feature does not introduce a new role surface, navigation
  area, or permission model; all colleges are publicly browsable
  per the existing route.
- The "feels designed" qualifier is verified via the same blind
  reviewer flow as `002-*` SC-001 — not via subjective live demo.
