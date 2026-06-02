# Feature Specification: Design, Theming & Graphics Uplift — World-Class Tier

**Feature Branch**: `012-design-graphics-uplift`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "نريد تحسين التصميم والثيمات بشكل اكبر واضافة الحيوية والجرافيكس للموقع بشكل كامل ليكون على مستوى احترافي عالمي"

## Overview

Madrak's foundation is in place across four prior features:

1. `001-premium-motion-system` — motion + interaction tokens, reduced-motion / RTL guarantees, primitives (`PageTransition`, `Reveal`, `AnimatedNumber`, `Skeleton`, `Button`, `Input`).
2. `002-visual-uplift` — typography roles, chart palette, icon discipline, density rhythm, sidebar/topbar polish.
3. `003-motion-graphics-layer` — calm decorative motion: hero ambient, pointer-glow, fade-up reveals, scroll accents, brand-mark intro.
4. `011-platform-completeness-uplift` — locale, search, notifications, session policy parity.

What this feature ships is the **next altitude**: a deliberate tier-jump in (a) design-system depth — full dark mode, role/college accent expressions, surface depth, glass/frost where appropriate; (b) bespoke graphics — hand-crafted illustration scenes for onboarding, empty, success, error, and marketing surfaces; (c) cinematic liveliness — section-level scroll storytelling, hero scenes, native-feeling chart treatments — all inside the same governance the prior features established (no infinite loops, no theatrics, full reduced-motion parity, RTL parity).

The aim is one outcome: **a returning user, opening Madrak after a week away, sees something measurably more designed than they remember — and a first-time visitor compares Madrak favourably with Notion, Linear, Stripe, and Framer within five seconds.** No business logic, no permissions, no route changes — only how surfaces look, theme, illustrate, and move.

This feature does NOT redesign the tokens or primitives shipped in `001-*` / `002-*` / `003-*`. It composes new themes, illustrations, and scene-level motion on top.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Light, dark, and contextual themes that feel native (Priority: P1)

A user opens Madrak in the evening and the platform is in a calm, considered dark theme — not a colour-inverted clone, but a designed dark surface system with its own elevation hierarchy, its own accent saturation, its own chart palette tuned for dark backgrounds. They toggle to light and the change is instant, with no flicker, no broken contrast, no "oh that didn't get themed" leak. A faculty member sees a subtle role-tinted accent on their dashboard chrome; a student sees a different accent; a college page picks up the college's identity colour from `001-*` profiles into the chrome. None of the accents shout — they tint.

**Why this priority**: Theming is the single most-asked-for missing feature for any product that wants to read as world-class. A platform without a real dark mode in 2026 reads as unfinished. Role/college accent tinting gives the platform an *identity layer* without redesigning anything.

**Independent Test**: Open every primary route (homepage, login, student dashboard, faculty dashboard, dean dashboard, admin dashboard, course detail, college page, settings, notifications) in light mode. Toggle to dark. Visit each route again. Verify: zero unthemed surfaces, zero broken contrast (WCAG AA on body text, AAA on numbers), charts render correctly in both, role/college accent is visible but never overpowers content.

**Acceptance Scenarios**:

1. **Given** a user toggles theme from light to dark, **When** the toggle fires, **Then** every surface, border, shadow, chart, illustration, and icon repaints with no flicker and no untokenised colour leaks through.
2. **Given** dark mode is active, **When** a chart renders, **Then** the chart palette uses the dark-tuned variant (not light colours on a dark background) and gridlines/axis labels meet WCAG AA contrast.
3. **Given** a user has OS-level theme preference set, **When** they first land, **Then** the platform respects the OS preference; if the user explicitly chooses a theme, that choice persists across sessions and overrides OS.
4. **Given** a faculty member opens their dashboard, **When** the page renders, **Then** chrome (sidebar active state, topbar accent, KPI tile rim) carries a faculty-role accent; a student's view of the same components carries a student accent — both within the canonical palette, never breaking contrast.
5. **Given** a user navigates to a college page, **When** the page renders, **Then** the college's identity colour from `001-*` tints the page's accent surfaces (header glow, breadcrumb, primary CTA outline) without changing core content colour.
6. **Given** reduced-motion is active, **When** the user toggles theme, **Then** the cross-fade between themes is replaced by an instant repaint.

---

### User Story 2 — Homepage that competes with the best public software pages (Priority: P1)

A first-time visitor reaches the homepage. The hero is no longer just "headline + CTA on a gradient" — it's a small, considered scene: a hand-crafted illustration of an academic moment (lecture hall, library, graduation, code-on-a-laptop) layered with the ambient motion from `003-*`. As they scroll, each narrative section is anchored by its own bespoke scene — not stock icons, not Lottie packs, but a small library of original SVG-based illustrations that share a colour palette, a stroke weight, and a perspective. Numbers from the University of Zawia animate in. A subtle parallax adds depth on scroll without making content move out from under their cursor. The page reads like a flagship public software product page.

**Why this priority**: The homepage is the single highest-leverage public surface for credibility. A scenes-based homepage is the difference between "good university platform" and "world-class educational product."

**Independent Test**: Open the homepage at 360 px, 768 px, 1280 px, 4 K, both LTR and RTL, light and dark. Confirm each section has an original scene illustration, scenes share visual language, parallax is gentle (≤ 8 px translation), reduced-motion freezes scenes, page weight stays within budget.

**Acceptance Scenarios**:

1. **Given** the homepage loads, **When** the hero paints, **Then** a bespoke illustration scene is part of the hero composition, sharing palette, stroke, and perspective with all other homepage scenes.
2. **Given** the visitor scrolls, **When** each narrative section enters view, **Then** that section's scene illustration is anchored visually (not a generic icon), and reveals once with the canonical reveal motion.
3. **Given** a parallax effect is active on a section, **When** the user scrolls, **Then** parallax movement on any element is bounded within the platform's parallax budget and never causes content to leave the safe area.
4. **Given** reduced-motion is active, **When** the visitor scrolls, **Then** all parallax and ambient motion is suppressed; scenes render in their final state.
5. **Given** the page is rendered in RTL, **When** scenes contain directional content (a reader, a pointer, a chart axis), **Then** scenes are mirrored or composed to read correctly in RTL.
6. **Given** the page is in dark mode, **When** the visitor lands, **Then** scene illustrations use their dark-tuned variant (not the same SVG with inverted colours) and read with the same warmth as the light version.

---

### User Story 3 — Dashboards with surface depth and charts that look custom-made (Priority: P1)

A faculty member opens their dashboard. KPI tiles now read with a real surface system: subtle layered shadows, a faint top-edge highlight that hints at depth, a frosted-glass effect on overlay elements, and a soft inner border that distinguishes the card from its background in both light and dark themes. Charts no longer look like a chart library with brand colours — they have rounded line caps, custom gradient fills under area charts, designed tooltips with type and shadow, axis ticks that fade at the edges, and animated transitions between states. Empty cards have a small bespoke illustration instead of a flat icon.

**Why this priority**: Dashboards are where roles spend most of their day. Surface depth + native-feeling charts is the difference between "looks fine" and "feels like a financial product."

**Independent Test**: Open student, faculty, dean, admin, quality-assurance, and owner dashboards. Inspect every tile, chart, overlay, and empty state. Confirm: surfaces have visible depth, no flat-on-flat rectangles, every chart uses the designed treatment (no library defaults), empty states show a bespoke illustration, all of the above hold in dark mode.

**Acceptance Scenarios**:

1. **Given** any dashboard tile renders, **When** the user looks at it, **Then** it has a designed surface (shadow stack + soft inner border + optional top-edge highlight) that distinguishes it from the page background in both themes.
2. **Given** a chart renders, **When** it appears, **Then** it uses the platform's custom chart treatment (rounded caps, gradient area fills, designed tooltips, fading-edge axis) — no chart-library defaults are visible.
3. **Given** the user hovers a chart data point, **When** the cursor enters, **Then** a designed tooltip with the platform's typography, shadow, and rounded corners appears and tracks the cursor smoothly.
4. **Given** a dashboard region has no data, **When** the empty state renders, **Then** it shows a bespoke small-scene illustration (not a stock icon), a warm copy line, and a clear next action.
5. **Given** an overlay (modal, sheet, popover) opens, **When** it appears, **Then** the surface uses a frosted-glass treatment in both themes that maintains text contrast above the glass.

---

### User Story 4 — A coherent illustration system across the product (Priority: P1)

A user encounters a 404 page, then a logout-success screen, then an onboarding step, then an exam-locked notice, then a "no notifications yet" empty state, then a course "you finished this section" milestone. Every illustration in those moments belongs to one family: same stroke weight, same character archetype (if any), same palette, same perspective. None feels like clip-art. None feels like an AI-generated image stuck on a page. The illustrations are recognisably *Madrak*. They render crisply in light and dark and at any DPI.

**Why this priority**: A consistent illustration family is the cheapest, most-visible signal of design maturity. It is also the thing freshest visitors notice first when comparing Madrak against tier-1 software.

**Independent Test**: Walk through every illustrated surface in the app (target list ≥ 12 surfaces: 404, 500, auth-locked, session-expired, no-notifications, no-courses, onboarding-welcome, onboarding-roles, milestone-section-complete, milestone-course-complete, search-empty, success-after-submit). Open each in light and dark, LTR and RTL. Confirm one visual family across all.

**Acceptance Scenarios**:

1. **Given** any illustrated surface renders, **When** it is viewed alongside any other illustrated surface in the platform, **Then** stroke weight, palette, perspective, and character treatment match — no surface looks "from a different product."
2. **Given** dark mode is active, **When** any illustration renders, **Then** it uses its dark-tuned variant — never the light SVG laid over a dark background.
3. **Given** an illustration includes directional content, **When** rendered in RTL, **Then** it is mirrored or re-composed to read correctly without breaking semantics (e.g. the direction of an arrow remains "forward").
4. **Given** the platform adds a new illustrated surface in the future, **When** the surface is reviewed, **Then** it is built from the documented illustration system (palette, stroke, primitives) and is rejected at review if it diverges.
5. **Given** a screen reader is active, **When** an illustration carries informational meaning, **Then** it has accessible alt text; when purely decorative, it is hidden from the accessibility tree.

---

### User Story 5 — Scroll narrative on the homepage and key landing surfaces (Priority: P2)

A visitor scrolls the homepage end-to-end. The page reads as a curated journey: each section is introduced by a small accent (an underline that draws itself, a number that ticks up, a scene that paints in, a quote that fades), and the transitions between sections feel like chapters in a story rather than like a list of cards. The same treatment applies to a college landing page and a faculty's "about" page. Once a chapter has played, it never replays.

**Why this priority**: Scroll narrative is what separates "page" from "experience." Without it, the homepage works; with it, the homepage feels designed.

**Independent Test**: Scroll the homepage, the colleges-gallery landing, and a single college page end-to-end on desktop and mobile. Confirm each section has a one-shot accent fire, accents do not replay on scroll-back, and no animation is running while the page is idle.

**Acceptance Scenarios**:

1. **Given** a section enters the viewport, **When** the threshold is crossed, **Then** the section's narrative accent fires once, completes within the canonical reveal duration, and stops.
2. **Given** the visitor scrolls back to a section already played, **When** it re-enters the viewport, **Then** the accent does not replay — the section renders in its final state.
3. **Given** the viewport is idle, **When** the user is reading, **Then** no narrative animation is running.
4. **Given** reduced-motion is active, **When** the visitor scrolls, **Then** narrative accents render in their final state without playing.
5. **Given** the visitor is on RTL, **When** narrative accents draw or slide directionally, **Then** the direction is mirrored to read correctly.

---

### User Story 6 — Onboarding and milestone moments feel like small films (Priority: P2)

A new student completes signup. Instead of being dropped on an empty dashboard, they see a brief, optional, three-frame scene-illustration sequence introducing what Madrak does for them — each frame is the platform's bespoke illustration style, each transition is the canonical scene transition, and a "skip" control is always visible. When they later complete their first assignment, a small celebratory moment plays once: a confetti-free flourish, a milestone scene, a single line of warm copy.

**Why this priority**: Onboarding and milestones are the two emotional peaks of any product session. A designed first run + designed milestones disproportionately drive perceived quality.

**Independent Test**: Trigger the new-user onboarding flow on a fresh account. Trigger one milestone (first-assignment-complete). Confirm both are scene-illustrated, both honour the skip control, both fire once per session per scope, both honour reduced-motion.

**Acceptance Scenarios**:

1. **Given** a brand-new user enters the platform for the first time, **When** they reach the dashboard, **Then** they see a brief onboarding scene sequence built from the bespoke illustration family with a visible skip control.
2. **Given** a user completes a milestone (first assignment, first course completion, exam window opens), **When** the milestone fires, **Then** a small celebratory scene plays once, completes within the canonical reveal duration plus a one-second hold, and never replays for the same milestone.
3. **Given** the user has skipped onboarding once, **When** they sign in again, **Then** onboarding does not auto-play; it is reachable from settings/help.
4. **Given** reduced-motion is active, **When** an onboarding or milestone scene fires, **Then** the scene renders to its final state without animation; the skip control remains.

---

### User Story 7 — Surface depth, glass, and elevation as a system (Priority: P2)

A user opens a sheet, then a modal, then a popover, then a dropdown, then a toast, then a notification panel. Every overlay surface uses one designed elevation system: a documented shadow stack, an optional frosted-glass treatment for surfaces that overlap content, a documented z-order hierarchy, and consistent corner radii. None of the overlays look "default." None of the shadows are flat. In dark mode, elevation is conveyed primarily by lighter surface fill, not by heavier shadows.

**Why this priority**: Inconsistent elevation is a tell that a product was assembled rather than designed. Getting elevation right across every overlay surface is a one-time investment with permanent perceived-quality benefit.

**Independent Test**: Trigger every overlay type the platform supports (sheet, modal, popover, dropdown, toast, notification panel, command palette if present, lightbox if present). Confirm one shared elevation language, glass treatment renders correctly, z-order is sane, dark-mode elevation reads via fill rather than shadow.

**Acceptance Scenarios**:

1. **Given** any overlay surface opens, **When** it appears, **Then** it uses the platform's shared elevation tokens (shadow stack + radius + optional glass) — no overlay invents its own.
2. **Given** an overlay overlaps content, **When** it renders, **Then** glass treatment maintains AA text contrast above the blurred background.
3. **Given** dark mode is active, **When** an overlay opens, **Then** elevation is conveyed primarily by a lighter surface fill; shadow is reduced to keep dark surfaces from feeling muddy.
4. **Given** multiple overlays could co-exist (toast + modal + tooltip), **When** they render together, **Then** z-order is documented and predictable, and the user can dismiss the topmost without affecting the others.

---

### User Story 8 — Themed governance & cross-route parity (Priority: P3)

A platform owner runs a one-pass sweep across every route in the platform — public, authenticated, role dashboards, settings, error pages — in light, dark, LTR, RTL, at three viewports. Every surface honours the design system: tokens used everywhere, no inline colour, no hard-coded shadows, no off-palette accents, no off-family illustrations. A single page-by-page inventory exists that names every surface, its theme variant, its illustration (if any), and its motion treatment. New surfaces shipped after this feature follow the same inventory pattern by default.

**Why this priority**: Without an inventory and a governance pass, the uplift drifts back to inconsistency within two release cycles. Governance is the cheapest insurance.

**Independent Test**: Run an automated and human inventory across every route. Confirm an artefact exists listing each surface and its theme/illustration/motion treatment. Confirm zero off-token colours, zero off-family illustrations, zero ad-hoc shadows.

**Acceptance Scenarios**:

1. **Given** any new surface is added after this feature ships, **When** it enters review, **Then** it is rejected if it uses an inline colour, an ad-hoc shadow, an off-family illustration, or an ad-hoc motion duration.
2. **Given** the inventory artefact is updated, **When** a reviewer scans it, **Then** every route in the platform is listed with its theme variant, illustration list, and motion treatment.
3. **Given** the inventory shows a drift (a surface not on the documented theme), **When** the next maintenance cycle runs, **Then** the drift is reconciled or the inventory is updated.

---

### Edge Cases

- A user toggles theme mid-page-transition. The transition completes in the *origin* theme, then the new theme paints — never a mid-transition theme change that looks broken.
- A user disables JavaScript. Themes still work via OS-level preference and CSS; bespoke illustrations and scenes render in their final state without motion. Core content remains usable.
- A user is on a low-end device or a 2G connection. Bespoke illustrations are inlined or progressively loaded; the page degrades to a content-first state without scenes if their cost would exceed the page budget.
- A user has a print-to-PDF workflow. Print stylesheets ensure surfaces, illustrations, and charts render legibly on paper (light theme, no glass, no decorative motion).
- A college's identity colour fails contrast against the chrome. The platform falls back to a contrast-safe accent tint instead of the raw college colour.
- A user has high-contrast OS preference. The platform offers (or auto-applies) a high-contrast variant where shadows are stronger, glass is removed, illustrations use solid fills.
- A locale change happens (Arabic ↔ English) mid-page. Scenes that contain directional content re-mirror; illustrations carrying text swap to the locale variant; chart axes flip if needed.
- An illustration asset fails to load. The surface degrades to a clean, designed empty fallback (icon + copy) within the same family, never to a broken image icon.
- A user has both reduced-motion and dark mode and a college-themed page. All three constraints compose without one of them breaking another.
- A returning visitor in the same session opens the homepage. Onboarding does not re-trigger; the brand-mark intro from `003-*` does not replay; scene reveals stay subtle (no theatrical re-runs).

## Requirements *(mandatory)*

### Functional Requirements — Theming

- **FR-001**: System MUST ship a fully-designed dark-mode theme that covers every surface, illustration, chart, and overlay in the platform.
- **FR-002**: System MUST respect the user's OS-level theme preference on first visit and persist a user-chosen theme override across sessions.
- **FR-003**: System MUST switch between light and dark themes within a perceptual instant, without flicker, untokenised colour leaks, or layout shift.
- **FR-004**: System MUST tint chrome and accent surfaces with a role-aware accent (one accent per role: student, faculty, department head, dean, admin, quality assurance, owner) without changing content colour or breaking contrast.
- **FR-005**: System MUST tint a college landing page's chrome with the college's identity colour from `001-*` profiles, falling back to a safe accent if the college colour fails contrast.
- **FR-006**: System MUST offer a high-contrast variant (or honour OS-level high-contrast preference) where shadows are strengthened, glass is removed, and illustrations use solid fills.

### Functional Requirements — Illustration System

- **FR-007**: System MUST ship a documented bespoke illustration family (palette, stroke weight, perspective, character archetype, motif library) used across every illustrated surface.
- **FR-008**: System MUST render every illustration with a documented dark-mode variant — no light SVG inverted onto dark.
- **FR-009**: System MUST render every illustration with a documented RTL variant or be composed to read correctly without mirroring.
- **FR-010**: System MUST cover at minimum the following surfaces with bespoke scene illustrations: 404, 500, auth-locked, session-expired, no-notifications, no-courses, no-search-results, onboarding-welcome, onboarding-role-intro, milestone-section-complete, milestone-course-complete, success-after-submit, error-recoverable.
- **FR-011**: System MUST gracefully degrade when an illustration asset fails to load — falling back to a within-family icon + copy state, never a broken-image icon.
- **FR-012**: System MUST attach accessible alt text to informational illustrations and hide decorative illustrations from the accessibility tree.

### Functional Requirements — Surface Depth & Charts

- **FR-013**: System MUST apply one shared elevation language (shadow stack, radius, optional glass, z-order) to every overlay surface (modal, sheet, popover, dropdown, toast, notification panel, command palette, lightbox).
- **FR-014**: System MUST convey elevation in dark mode primarily through lighter surface fill, with shadow contribution reduced.
- **FR-015**: System MUST replace chart-library default visuals with the platform's custom chart treatment: rounded line caps, gradient area fills, designed tooltips with platform typography, fading-edge axis labels, smooth between-state transitions.
- **FR-016**: System MUST apply glass/frosted treatment only on surfaces that overlap content; the underlying text contrast above glass MUST meet AA minimum.

### Functional Requirements — Scroll Narrative & Onboarding

- **FR-017**: System MUST run a one-shot section-narrative accent for each homepage and key landing-page section that fires once when the section enters view and never replays.
- **FR-018**: System MUST keep all decorative narrative motion silent when the viewport is idle.
- **FR-019**: System MUST provide a brief, scene-illustrated, three-to-five-frame onboarding sequence for first-time users with a visible skip control on every frame.
- **FR-020**: System MUST persist the onboarding-completed state per user and never auto-trigger onboarding twice.
- **FR-021**: System MUST fire a one-shot milestone scene for documented milestones (first-assignment-complete, first-course-complete, exam-window-opens) without ever replaying for the same milestone.

### Non-Functional Requirements

- **NFR-001**: All illustrations and scenes MUST honour the existing performance budget — page weight added by this feature MUST NOT exceed the documented budget per route.
- **NFR-002**: Theme switch MUST complete within the platform's micro-motion duration, with zero CLS during the switch.
- **NFR-003**: Every theme variant (light, dark, high-contrast) MUST meet WCAG AA on body text and AAA on numeric KPI values.
- **NFR-004**: Every illustrated surface MUST render to its final state on `prefers-reduced-motion: reduce` without motion.
- **NFR-005**: Every illustrated and themed surface MUST render correctly in RTL.
- **NFR-006**: All overlay glass treatments MUST degrade gracefully on browsers/devices that do not support backdrop-filter — to a solid-fill surface with the same contrast guarantees.

### Disallowed Patterns *(mandatory list)*

1. ممنوع إضافة أي حركة لانهائية جديدة على سطح سبق وتحرك في `003-*` — هذه الميزة لا تضيف motion دائم.
2. ممنوع وميض أو رفرفة أو إعادة طلاء على مرحلتين عند تبديل الثيم.
3. ممنوع أي لون خارج التوكنز، أو ظل ad-hoc، أو رسم خارج عائلة الإلستريشن.
4. ممنوع استخدام clip-art أو صورة Stock أو صورة AI كسطح دائم — فقط رسوم Bespoke من العائلة الموثقة.
5. ممنوع أي حركة جرافيكية تسحب الانتباه عن المحتوى أثناء القراءة.
6. ممنوع تطبيق Glass على سطح غير شفاف أو سطح لا يتقاطع مع المحتوى.
7. ممنوع أي مشاهد مسرحية في الجلسات المتكررة — مشاهد الـ onboarding، مشاهد المعالم، ومقدّمة العلامة كل واحدة منها تشتغل مرة واحدة per scope ولا تعاد لنفس المستخدم/المعلَم.

### Key Entities

- **Theme**: Light, Dark, High-Contrast. Each is a complete, designed system covering surface, accent, chart palette, illustration variant, and elevation behaviour.
- **Role Accent**: A documented accent expression for each role (student, faculty, department head, dean, admin, quality assurance, owner) that tints chrome without changing content colour.
- **College Accent**: A college's identity colour (from `001-*`) projected into the chrome of that college's pages, with contrast-safe fallback.
- **Illustration Family**: A documented palette, stroke weight, perspective, and motif library shared by every illustrated surface; ships in light + dark + high-contrast variants and LTR/RTL where directional.
- **Scene**: A composite illustration used in onboarding, milestones, hero, or empty states; every scene is built from the Illustration Family.
- **Elevation Language**: A documented shadow stack, radius scale, glass treatment, and z-order hierarchy applied to every overlay surface.
- **Custom Chart Treatment**: A documented chart visual style (rounded caps, gradient fills, designed tooltips, fading-edge axis) that replaces all chart-library defaults.
- **Surface Inventory**: A platform-wide artefact listing every route's theme variant, illustration, and motion treatment, used as the governance reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning user comparing Madrak before and after this feature identifies dark mode, role/college accents, and bespoke illustrations as new visible improvements within one minute of using the platform.
- **SC-002**: 100% of routes in the platform render in both light and dark themes with zero untokenised colour leaks and zero broken-contrast surfaces (independent inventory pass).
- **SC-003**: Theme switch completes within the platform's micro-motion duration with zero CLS measured across 5 sample pages.
- **SC-004**: At minimum 12 documented surfaces ship with bespoke scene illustrations; every other illustrated surface in the platform belongs to the same family on visual review.
- **SC-005**: First-time visitors to the homepage report (in 5-second user-test interviews) that Madrak feels comparable to or better than at least three of: Notion, Linear, Stripe, Framer, Apple Education, Coursera.
- **SC-006**: 100% of onboarding completions, milestone fires, and brand-mark intros are observed to fire once per scope across a multi-session test (no replays).
- **SC-007**: Page-weight increase from this feature stays within the per-route budget defined by the prior performance work; no route's First Contentful Paint regresses by more than 5%.
- **SC-008**: WCAG AA on body text and AAA on numeric KPIs holds across light, dark, and high-contrast themes on 100% of audited surfaces.
- **SC-009**: Zero off-token colour, ad-hoc shadow, or off-family illustration is found in a post-feature inventory of every route.
- **SC-010**: Reduced-motion users see all illustrations, scenes, and theme switches in their final-state form with no motion, while losing zero content or functionality.

## Assumptions

- The existing `001-*` motion tokens, `002-*` typography roles + chart palette, and `003-*` decorative motion patterns remain the canonical foundation and are NOT redesigned by this feature.
- Themes ship as a curated set: Light + Dark + optional High-Contrast. A user-customisable colour-picker theme engine is OUT of scope for v1.
- Bespoke illustrations are produced as inline SVG (or equivalent vector format) so they theme via tokens and respect the performance budget; raster (PNG/JPG) is allowed only for photography on marketing surfaces, not for product illustrations.
- Role accent expressions reuse one accent slot per role; they do not introduce new accent palettes per page.
- Seasonal / contextual moments (Ramadan, graduation week, exam season) are OUT of scope for v1; the architecture leaves room for them but no seasonal overrides ship in this feature.
- Sound and haptic feedback are OUT of scope for v1.
- Animated 3D, WebGL scenes, video backgrounds, and Lottie packs are OUT of scope; the visual language is SVG-based with the existing motion primitives.
- The illustration family is producible within the project's existing design capacity; a documented illustration system + a starter set of 12 surfaces is the v1 target, with more surfaces added incrementally.
- The platform's existing performance, accessibility, RTL, and reduced-motion guarantees from `001-*` / `002-*` / `003-*` are preserved without exception by this feature.
- The University of Zawia institutional context (logo, identity colour, statistics) remains the homepage's grounding reference.
