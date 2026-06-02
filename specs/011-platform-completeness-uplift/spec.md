# Feature Specification: Platform Completeness Uplift

**Feature Branch**: `011-platform-completeness-uplift`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "@madarek_audit_report00.md — comprehensive UX/UI audit (SkyClaw AI Agent, 2026-06-02) identifying gaps between Madarek's promised landing page experience and the delivered experience. Critical findings: (1) inner application routes (`/dashboard`, `/courses`, `/faculties`) return the landing page rather than functional pages; (2) Render free-tier cold starts produce 30–60s first-load waits with the generic Render splash; (3) no observable scroll animations, micro-interactions, or branded loading states; (4) static Oasis AI demo on the landing page; (5) hamburger-only navigation with no breadcrumbs, no global search, no sticky header; (6) no notification center; (7) no dark mode; (8) WCAG 2.1 AA accessibility unverified (contrast risk on cream/gold, no skip-link, focus indicators undocumented); (9) Arabic-only UI with no English option; (10) discussion forums absent. This feature responds to the audit by closing the launch-blocking gaps and lifting visible polish to a level comparable to Idraak / Canvas / Notion."

## Overview

This feature is a **multi-track uplift** that layers on the existing foundation (`001-premium-motion-system`, `002-visual-uplift`, `003-motion-graphics-layer`, `004-colleges-gallery`). It does not redesign those layers — it composes them into a fully usable platform shell and fills the working-application gaps the audit flagged.

The audit's single most severe finding is that the inner application is not functional today: `/dashboard`, `/courses`, and `/faculties` all serve the marketing landing page. Until that is fixed, no other polish matters. Every story below is sequenced to that reality: the P1 stories make the platform usable; the P2 stories make it predictable, inclusive, and findable; the P3 stories make it feel premium.

Discussion forums, certificate generation, native mobile apps, virtual labs (Cisco/Arduino/AR/VR), and live-video integrations are recognized as valuable in the audit but are **out of scope for this feature** and tracked as separate future work (see Out of Scope).

## Clarifications

### Session 2026-06-02

1. Q: Authentication method for v1 → A: University email + password, managed by Madarek. Greenfield — there is no pre-existing login mechanism in the platform today, so this feature ships the first authentication system rather than integrating with one.
2. Q: Notification email digest in v1? → A: In-app channel only ships in v1. Email-digest preference controls remain visible in the preferences UI as disabled "coming soon" controls; actual email delivery is deferred to a future feature.
3. Q: Concurrent-user scalability target for v1 → A: 2,000 concurrent users sustained, 5,000 concurrent users at burst peak (exam windows). Sized to ~5–10% of the audited ~48K-registered base, with headroom for growth.
4. Q: Session lifetime → A: 12-hour absolute lifetime by default; opt-in "remember me" extends to 30 days; sensitive routes (active exam pages, grade entry, password change, account-settings changes) enforce a 30-minute idle timeout requiring re-authentication.
5. Q: Global search matching semantics → A: Substring matching with Arabic-aware normalization (diacritic / تشكيل folding, alif and hamza folding, tolerance for the ال definite-article prefix) and typo-tolerant fuzzy matching for queries of 4 characters or more, case-insensitive across both languages. Search scope covers entity titles and names (course title, faculty name, lecture title) — not full content body, which is deferred.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Student can actually use the platform end-to-end (Priority: P1)

A student visits Madarek, logs in with their university credentials, lands on a personal dashboard that summarizes their term, opens a course, watches or reads a lecture, submits an assignment, and later returns to see the grade. Today, all of these inner routes serve the landing page — the platform's promised value cannot be delivered without this story.

**Why this priority**: Without a working core flow, the platform is a marketing site. The audit calls this "the single most important finding." Every other improvement compounds on top of a working core; nothing meaningful compounds on top of a non-functional one.

**Independent Test**: Sign in as a seeded student account, navigate to dashboard → enrolled course → a lecture item → an assignment, upload a file, log out, log back in, and confirm the submission and any posted grade are visible. The flow must succeed without the user ever seeing the marketing landing page after login.

**Acceptance Scenarios**:

1. **Given** a registered student with valid credentials, **When** they sign in, **Then** they are routed to a personal dashboard that shows at minimum their enrolled courses, upcoming deadlines, and recent grades — not the marketing landing page.
2. **Given** a signed-in student on the dashboard, **When** they open an enrolled course, **Then** they see the course's lecture list, assignment list, and current grade summary on a dedicated course page.
3. **Given** a student viewing a lecture item, **When** the lecture is video, audio, PDF, or HTML, **Then** the content plays or renders inline without navigating away from the platform shell.
4. **Given** a student on an open assignment, **When** they upload one or more allowed files within size limits, **Then** the submission is recorded with a server-side timestamp and is visible from both the assignment page and the course's submissions list.
5. **Given** a student who has submitted an assignment, **When** the professor enters a grade, **Then** the grade and any feedback comment are visible to the student on the assignment page and reflected in the course grade summary.
6. **Given** a signed-in student, **When** they sign out and sign back in, **Then** their dashboard reflects all prior submissions, grades, and notifications without state loss.
7. **Given** a public visitor (not signed in), **When** they request `/dashboard`, `/courses`, or `/courses/:id`, **Then** they are redirected to the login screen with the original URL preserved as a return target.

---

### User Story 2 — First load is fast and never shows the generic Render splash (Priority: P1)

A first-time visitor opens madarek.onrender.com after a period of inactivity and sees a branded loading state in under three seconds, with the landing page itself becoming interactive in under five seconds on a typical broadband connection. They never see the white "INCOMING HTTP REQUEST DETECTED" Render placeholder.

**Why this priority**: The audit captured a 30–60 second cold-start with the unbranded Render splash. That destroys credibility for an institutional platform on the first impression and dwarfs every other UX improvement. Fixing this is mechanical but launch-blocking.

**Independent Test**: From a cold cache (incognito), navigate to the production URL after the platform has been idle for at least an hour. Time from request to first branded paint, and request to Time-to-Interactive. Confirm no third-party splash screen appears at any point during the load.

**Acceptance Scenarios**:

1. **Given** a cold visitor on a typical broadband connection (≥10 Mbps), **When** they request the home page, **Then** the first content paint shows Madarek-branded content within 3 seconds and the page is interactive within 5 seconds.
2. **Given** a cold visitor, **When** the page is loading, **Then** any visible loading state uses Madarek's branding (logo, palette, motion vocabulary), not the hosting provider's default splash.
3. **Given** a returning visitor with a warm cache, **When** they request any page, **Then** the page is interactive within 1.5 seconds.
4. **Given** the back-end is processing a request that exceeds 500ms, **When** the visitor is waiting, **Then** a branded skeleton screen mimics the page's actual layout rather than a generic spinner.

---

### User Story 3 — Persistent platform shell with predictable navigation (Priority: P2)

Once signed in, a user always knows where they are and where they can go. A horizontal navigation bar shows the primary destinations on desktop, breadcrumbs show the path on every inner page, the header sticks to the top during scroll, and a global search input — placed in the header — finds courses, lectures, and resources. On mobile, the same destinations are reachable via a hamburger menu.

**Why this priority**: The current platform uses a hamburger menu on desktop, has no breadcrumbs, no sticky header, and no global search. Discoverability and orientation collapse the moment the platform has more than a handful of pages. This is the foundation for every subsequent inner page.

**Independent Test**: Sign in and navigate four levels deep (Home → Faculty → Course → Lecture). At every level, verify the horizontal nav is visible (desktop ≥1024px), breadcrumbs accurately reflect the path, the header remains visible during long scroll, and a search query for a known lecture title returns the lecture as a result and routes to it on click.

**Acceptance Scenarios**:

1. **Given** a desktop user (viewport ≥1024px) on any inner page, **When** the page loads, **Then** a horizontal navigation bar in the header shows at least: Home, Courses, Faculties, Notifications, Profile — without requiring a hamburger toggle.
2. **Given** a mobile user (viewport <768px) on any inner page, **When** they tap the hamburger menu, **Then** the same destinations are reachable through the menu drawer.
3. **Given** a user on a page nested below Home (e.g., Course → Lecture), **When** the page renders, **Then** breadcrumbs reflect the path with each level clickable to navigate up.
4. **Given** a user scrolling a long page, **When** they scroll past the hero/banner, **Then** the header (with logo, nav, search, profile) remains pinned to the top of the viewport.
5. **Given** a user types a query into the global search input, **When** they pause typing for 250ms or press Enter, **Then** matching courses, faculties, and lecture titles appear in a results panel and selecting one routes to the corresponding page.
6. **Given** a search returns no matches, **When** the user reviews the results panel, **Then** an empty-state message is shown in the user's selected interface language.

---

### User Story 4 — Unified notification center (Priority: P2)

Students, professors, administrators, and quality-assurance users see a single notification surface (header bell with unread badge + a notifications page) that aggregates events relevant to their role: new lecture uploads, assignment deadlines, grade postings, and announcements. They can mark notifications read, mark all read, and configure which channels (in-app, email digest) deliver each event type.

**Why this priority**: The audit lists this as high-priority because users miss deadlines and grade releases without it. It directly supports retention and sits on top of US1's working core flow.

**Independent Test**: As a seeded student, trigger four notification types from another account or seed (lecture upload, deadline within 24 hours, grade posted, announcement). Confirm each appears in-app within seconds, that the bell badge reflects the unread count, that opening the notifications page lists them in reverse-chronological order, and that "mark all read" zeroes the badge.

**Acceptance Scenarios**:

1. **Given** a signed-in user with at least one unread notification, **When** the platform shell renders, **Then** a bell icon in the header shows a numeric unread count badge.
2. **Given** a user clicks the bell, **When** the notifications panel opens, **Then** the most recent notifications are visible with title, time, and a route to the related entity (course, assignment, grade).
3. **Given** a user is on the dedicated notifications page, **When** they click "mark all read", **Then** every visible notification is marked read and the unread badge becomes zero.
4. **Given** a user opens notification preferences, **When** they toggle channels (in-app on/off, email digest daily/weekly/off) per event category, **Then** the preference is persisted and respected for subsequent notifications.
5. **Given** a relevant event occurs (e.g., a professor posts a grade), **When** the affected student is signed in, **Then** the in-app notification appears in their bell within 30 seconds without a manual page refresh.

---

### User Story 5 — Accessibility compliance to WCAG 2.1 AA (Priority: P2)

The platform meets WCAG 2.1 Level AA for every page in scope: keyboard-only users can complete every primary task; screen-reader users hear meaningful labels and order; color contrast is verified across light and dark themes; a "skip to main content" link is the first focusable element; focus indicators are visible and on-brand; the document declares `lang` and `dir` correctly; images and icons have descriptive alternatives.

**Why this priority**: The audit flags this as both a legal/ethical baseline and a credibility issue for an official university platform. The cream-on-cream and gold-on-cream contrast risks are immediate failure modes; everything else compounds the risk.

**Independent Test**: Run automated audits (Lighthouse, axe DevTools, WAVE) against representative pages — landing, login, dashboard, course, lecture, assignment, notifications — with both light and dark themes. Manually walk the same pages keyboard-only and with a screen reader (NVDA or VoiceOver). Zero WCAG 2.1 AA violations across the automated audits and zero blockers in manual testing.

**Acceptance Scenarios**:

1. **Given** any page in scope rendered in light or dark theme, **When** scanned by Lighthouse and axe DevTools, **Then** it produces zero WCAG 2.1 AA violations.
2. **Given** a keyboard-only user, **When** they Tab through any primary task flow (login, submit assignment, mark notification read), **Then** focus moves in a logical reading order and no element is reachable only by mouse.
3. **Given** a keyboard user on any page, **When** they press Tab as the very first interaction, **Then** the first focused control is a "Skip to main content" link that, when activated, moves focus into the main landmark.
4. **Given** any focusable element, **When** it has keyboard focus, **Then** a visible focus indicator with at least 3:1 contrast against its background is rendered.
5. **Given** any text in the interface, **When** measured against its background, **Then** contrast is at least 4.5:1 for normal text and 3:1 for large text in both light and dark themes.
6. **Given** the document, **When** inspected, **Then** the root element declares the active language (`lang="ar"` or `lang="en"`) and the matching direction (`dir="rtl"` or `dir="ltr"`).
7. **Given** any informational image or icon button, **When** inspected, **Then** it has descriptive alternative text or an `aria-label`; purely decorative imagery is marked `aria-hidden`.
8. **Given** a modal or drawer is open (e.g., login modal, mobile menu), **When** the user presses Tab, **Then** focus is trapped inside the modal until it is dismissed, and focus returns to the trigger on close.

---

### User Story 6 — Dark mode (Priority: P2)

A user can switch between light and dark themes from the header or settings, and the platform respects `prefers-color-scheme` on first visit. The dark theme preserves Madarek's identity (warm dark surfaces with adjusted gold accents), maintains WCAG AA contrast, and persists across sessions.

**Why this priority**: An expected feature for a modern student-facing platform; the audit explicitly calls it out and it has near-zero scope creep when paired with US5's contrast work.

**Independent Test**: Open the platform in a fresh browser profile with system dark mode set; confirm the platform loads in dark theme. Toggle to light from the header; reload; confirm the explicit preference persists. Visit each in-scope page in both themes and confirm no contrast or readability regressions.

**Acceptance Scenarios**:

1. **Given** a first-time visitor with system `prefers-color-scheme: dark`, **When** they open the platform, **Then** the platform renders in dark theme without flash-of-incorrect-theme.
2. **Given** a user with no explicit preference, **When** their system theme changes during a session, **Then** the platform follows the system preference.
3. **Given** a user picks a theme explicitly (light or dark), **When** they navigate or revisit the platform, **Then** the chosen theme persists across pages and sessions until they change it.
4. **Given** the dark theme is active, **When** any page is inspected, **Then** all text and interactive elements meet WCAG 2.1 AA contrast.
5. **Given** any decorative motion or animation, **When** rendered in dark theme, **Then** it preserves the brand identity profile defined in `001-premium-motion-system` without visual bugs (e.g., no light-theme assets bleeding through).

---

### User Story 7 — English-language UI option (Priority: P3)

A user can switch the interface between Arabic (default, RTL) and English (LTR) from a language switcher in the header or settings. The choice persists across sessions, the document direction and `lang` attribute update accordingly, and translated copy appears for every static UI string. User-generated content (course names, lecture titles, assignment text) is shown in its original language regardless of the UI language.

**Why this priority**: The audit calls this out as a gap relative to Idraak, important for international students and English-taught courses. It is genuinely independent of the rest and can ship after the launch-blocking work.

**Independent Test**: Start with Arabic UI; switch to English; confirm every visible static string changes; confirm `dir` becomes `ltr` and `lang` becomes `en`; confirm a course taught in Arabic still shows its Arabic title; reload and confirm English persists; switch back to Arabic and confirm full RTL restoration.

**Acceptance Scenarios**:

1. **Given** a user toggles the language to English, **When** any in-scope page renders, **Then** every static UI string (labels, buttons, navigation, error messages, dates, numbers) appears in English with `dir="ltr"` and `lang="en"`.
2. **Given** the user has selected English, **When** they reload or revisit, **Then** the language persists across sessions.
3. **Given** the user is in English mode, **When** they view a course originally created in Arabic, **Then** the course's content (title, description, lecture text) is shown in its original language; only the UI chrome is translated.
4. **Given** a user switches between languages, **When** the switch happens, **Then** the page reflows correctly for the new direction with no clipped, mirrored, or untranslated UI strings remaining.

---

### User Story 8 — Premium motion polish across landing and inner shell (Priority: P3)

The landing page and platform shell carry the visible signature of the existing motion foundation (`001-premium-motion-system`). Sections fade and translate in on scroll, statistic counters animate up from zero on first reveal, cards lift on hover with subtle elevation change, page transitions are smooth rather than jarring, branded skeleton screens replace blank loading states, and the Oasis AI showcase on the landing page becomes an interactive mini-demo (visitors can type a question and see a response). All motion respects `prefers-reduced-motion`.

**Why this priority**: The audit's "Notion-inspired interaction" gap. Important for perceived quality and conversion on the landing page, but it must not block the launch-critical work in US1–US6.

**Independent Test**: With `prefers-reduced-motion: no-preference`, scroll the landing page and visit two inner pages; observe scroll-triggered reveals, hover elevation, count-up on stat cards, and skeleton screens during simulated network latency. Type a question into the Oasis demo on the landing page and confirm a response appears. Then enable `prefers-reduced-motion: reduce` and confirm motion is suppressed or simplified to non-vestibular alternatives.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls the landing page, **When** a section enters the viewport, **Then** its content fades and translates upward subtly (≤200ms duration, ≤20px translate, ≤100ms stagger between sibling cards).
2. **Given** the landing page renders, **When** statistic counters are first revealed, **Then** each counter animates from zero to its target value over no more than 1.5 seconds.
3. **Given** a desktop user hovers a feature card, **When** the cursor enters the card, **Then** elevation, shadow, or border respond within 150ms with a non-jarring transition.
4. **Given** a navigation between two routes inside the platform, **When** the new route mounts, **Then** the transition is a coherent fade or slide rather than a hard cut, completing within 250ms.
5. **Given** the platform is loading data for an inner page, **When** the user is waiting, **Then** a branded skeleton mimicking the actual layout is shown rather than a generic spinner.
6. **Given** a visitor on the landing page Oasis section, **When** they type a question into the demo input and submit, **Then** a response appears with realistic timing, and at least one pre-programmed sample exchange plays automatically before any user input to demonstrate capability.
7. **Given** a user with `prefers-reduced-motion: reduce`, **When** any of the above motion would otherwise play, **Then** motion is replaced with instant or near-instant state changes (no translate, no count-up, no transition longer than 80ms).

### Edge Cases

1. Cold-start fallback — a back-end cold start that takes longer than 5 seconds must still show the branded loading skeleton and a status hint, not a blank or third-party splash.
2. Auth session expiry mid-task — if a session expires while the student is mid-submission, the upload preserves locally and the user is re-prompted to authenticate, then submission resumes; data is not silently lost.
3. Large file submission — uploads above the configured per-file size limit are rejected with a clear error before transfer begins, not after.
4. Notification flood — a sudden burst of notifications (e.g., bulk grade posting for an entire class) must not freeze the UI; the bell badge caps at "99+" visually and the list paginates.
5. Search with no results — the global search must show a useful empty state in the user's selected language with at least one suggested action.
6. Search with exact-match Arabic + diacritics — a search query with or without Arabic diacritics, with the ال definite-article prefix included or omitted, with hamza/alif spelling variants, and with or without RTL/LTR mixing, returns the same matches.
7. Theme + language combinations — every combination of {light, dark} × {ar, en} must render correctly without text clipping, mirror bugs, or contrast failures.
8. Reduced-motion + dark mode — the simplified motion fallback must still be visually coherent in dark theme.
9. Right-to-left transitions — page transitions, drawer slide-ins, and toast notifications must originate from the correct edge in RTL mode.
10. Tab/focus inside dialogs — opening a modal (login, settings, search results) must trap focus and restore it on close to the originating control.
11. Public-route deep-link — an unauthenticated request to a deep inner URL preserves the URL across the login round trip and resumes there after success.
12. Partial offline — a brief network drop during navigation should surface a toast or banner rather than dumping the user back to a generic error.

## Requirements *(mandatory)*

### Functional Requirements — Working core (US1)

- **FR-001**: System MUST authenticate users via university email address + password (managed by Madarek), produce a session with a 12-hour absolute lifetime by default, optionally extendable to 30 days when the user opts in to a "remember me" persistent session at login. Sensitive routes (active exam pages, grade entry, password change, account-settings changes) MUST additionally enforce a 30-minute idle timeout after which the user is re-prompted for credentials before the action proceeds. The system MUST support password reset via email-link verification. SSO/SAML integration with the university identity provider is explicitly deferred to a future feature.
- **FR-002**: System MUST route signed-in users to a personal dashboard at `/dashboard` that surfaces enrolled courses, upcoming deadlines, and recent grades — not the marketing landing page.
- **FR-003**: System MUST list a student's enrolled courses on a dedicated authenticated route distinct from the public `/colleges` discovery surface.
- **FR-004**: System MUST render each course at a dedicated route showing lecture list, assignment list, and current grade summary.
- **FR-005**: System MUST render each lecture item with its declared content type (video, audio, PDF, HTML) inline within the platform shell.
- **FR-006**: System MUST allow students to upload one or more files to an open assignment within the configured size and type limits and persist a server-side submission timestamp.
- **FR-007**: System MUST allow professors to enter grades and feedback against a submission, and MUST surface those grades and feedback to the affected student.
- **FR-008**: System MUST redirect unauthenticated requests for any authenticated route to the login screen, preserving the original URL as a return target.
- **FR-009**: System MUST sign users out cleanly such that subsequent requests to authenticated routes are redirected to login.

### Functional Requirements — Performance & loading (US2)

- **FR-010**: System MUST eliminate the third-party hosting splash screen from any user-visible loading path.
- **FR-011**: System MUST render a branded loading state (logo, palette, motion identity) within 3 seconds of a cold request on a typical broadband connection (≥10 Mbps).
- **FR-012**: System MUST become interactive within 5 seconds for cold visits and 1.5 seconds for warm visits at the same connection profile.
- **FR-013**: System MUST serve the marketing landing page from edge cache with no origin cold-start dependency on the first paint.
- **FR-014**: System MUST display a branded skeleton screen mimicking the destination layout when a back-end response exceeds 500ms.

### Functional Requirements — Platform shell & navigation (US3)

- **FR-015**: System MUST render a horizontal navigation bar at viewport widths ≥1024px that exposes the primary destinations without requiring a hamburger toggle.
- **FR-016**: System MUST collapse to a hamburger drawer at viewport widths <768px, with the same destinations reachable.
- **FR-017**: System MUST render breadcrumbs on every inner page reflecting the navigation path, with each prior level clickable.
- **FR-018**: System MUST keep the header visible (sticky) during long-scroll pages.
- **FR-019**: System MUST expose a global search input in the header that returns matches across course titles, faculty names, and lecture titles, with debounced query handling (≥250ms idle window before issuing the query) and an empty-state message when no results match. Matching MUST be case-insensitive across both supported languages and apply Arabic-aware normalization: diacritics (تشكيل) folded, alif and hamza variants folded to a canonical form, and the ال definite-article prefix tolerated whether or not the user types it. Queries of 4 characters or more MUST also accept single-character typo / transposition tolerance (Levenshtein distance 1). Full-text search across lecture content body is explicitly deferred.
- **FR-020**: System MUST distinguish primary calls-to-action ("Start free", "Login") visually so new and returning users do not confuse them.

### Functional Requirements — Notifications (US4)

- **FR-021**: System MUST surface a notification bell in the header with an unread-count badge for signed-in users.
- **FR-022**: System MUST aggregate events relevant to the user's role (lecture upload, deadline approaching, grade posted, announcement) into a unified notifications surface.
- **FR-023**: Users MUST be able to open a dedicated notifications page that lists notifications in reverse-chronological order with mark-read, mark-all-read, and delete actions.
- **FR-024**: Users MUST be able to set per-category in-app notification preferences (on/off), and the system MUST respect those preferences. The preferences UI MUST also surface email-digest controls (daily / weekly / off) visibly but disabled with a "coming soon" indicator; actual email delivery is deferred to a future feature.
- **FR-025**: System MUST deliver in-app notifications to a signed-in user's session within 30 seconds of the originating event without requiring a manual page refresh.
- **FR-026**: System MUST cap visible unread badges at "99+" and paginate the notification list to avoid UI freeze during bursts.

### Functional Requirements — Accessibility (US5)

- **FR-027**: System MUST meet WCAG 2.1 Level AA on every in-scope page in both light and dark themes, verified by automated audits (Lighthouse, axe DevTools, WAVE).
- **FR-028**: System MUST expose a "Skip to main content" link as the first focusable element on every page, routing focus to the primary `<main>` landmark on activation.
- **FR-029**: System MUST render visible focus indicators with at least 3:1 contrast against the immediate background on every focusable element.
- **FR-030**: System MUST provide descriptive alternative text or `aria-label` for every informational image and icon-only button; decorative imagery MUST be marked `aria-hidden`.
- **FR-031**: System MUST trap keyboard focus inside open modals and drawers and restore focus to the trigger on close.
- **FR-032**: System MUST set `lang` and `dir` on the document root to match the active language.
- **FR-033**: System MUST support full keyboard operability for every primary task flow (login, submit assignment, mark notification read, open course, switch theme, switch language).

### Functional Requirements — Dark mode (US6)

- **FR-034**: System MUST honor `prefers-color-scheme` on first visit when no explicit user choice has been set.
- **FR-035**: Users MUST be able to set an explicit theme (light or dark) from a control reachable in the header or settings, and that choice MUST persist across pages and sessions.
- **FR-036**: System MUST avoid flash-of-incorrect-theme during initial render.
- **FR-037**: System MUST maintain WCAG 2.1 AA contrast across the dark theme for all interactive and informational text.

### Functional Requirements — Internationalization (US7)

- **FR-038**: System MUST support an English (`en`, `dir="ltr"`) UI alongside the default Arabic (`ar`, `dir="rtl"`) UI.
- **FR-039**: Users MUST be able to switch the interface language from a control reachable in the header or settings, and that choice MUST persist across sessions.
- **FR-040**: System MUST translate every static UI string (labels, buttons, navigation, error messages, system date and number formatting) for both supported languages.
- **FR-041**: System MUST display user-generated content (course titles, lecture text, announcements) in its original language regardless of the UI language.

### Functional Requirements — Motion polish (US8)

- **FR-042**: System MUST animate landing-page sections into view on scroll using the identity profile defined in `001-premium-motion-system` (subtle fade + translate; ≤200ms duration; ≤20px translate; ≤100ms stagger between siblings).
- **FR-043**: System MUST animate first-revealed statistic counters from zero to the target value over no more than 1.5 seconds.
- **FR-044**: System MUST respond to hover on cards and buttons with a non-jarring elevation, shadow, or border change within 150ms.
- **FR-045**: System MUST transition between platform routes with a coherent fade or slide of no more than 250ms duration.
- **FR-046**: System MUST replace the static Oasis AI mockup with an interactive mini-demo: at least one pre-programmed sample exchange plays automatically, and visitors can submit a free-form question and receive a response within the demo widget.
- **FR-047**: System MUST honor `prefers-reduced-motion: reduce` by replacing animations with instant or near-instant state changes (no translate, no count-up, ≤80ms transitions).

### Key Entities *(include if feature involves data)*

- **User Session**: A signed-in user's authenticated state, including identifier, role (student / professor / admin / quality), language preference, theme preference, and notification channel preferences.
- **Enrollment**: Association of a student to a course, with role-scoped permissions and grade visibility.
- **Course**: An academic unit holding lecture items, assignments, announcements, and a grade book.
- **Lecture Item**: A unit of content within a course (video, audio, PDF, HTML), with declared type and access rules.
- **Assignment**: A submission target with an open/close window, allowed file types and sizes, and one submission per student (or as configured).
- **Submission**: A student's uploaded files for an assignment, with server-side timestamp and reference to any grade.
- **Grade**: A graded outcome posted against a submission, with feedback text, visible to the affected student.
- **Notification**: A role-scoped event (lecture upload, deadline approaching, grade posted, announcement) with read/unread state and a route to the related entity.
- **Notification Preference**: Per-user, per-category channel selection (in-app, email digest cadence).
- **Search Index Entry**: A queryable record (course, faculty, lecture title) with a route to navigate to the underlying entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new student can sign in, open an enrolled course, and submit one assignment in under 3 minutes on first attempt.
- **SC-002**: 95% of cold visits to the landing page reach Time-to-Interactive in under 5 seconds; 95% of warm visits reach it in under 1.5 seconds.
- **SC-003**: 0% of user-visible loading paths display a third-party hosting splash screen.
- **SC-004**: Lighthouse, axe DevTools, and WAVE report zero WCAG 2.1 AA violations across every in-scope page in both light and dark themes.
- **SC-005**: A keyboard-only user can complete every primary task (login, submit assignment, mark notification read, switch theme, switch language) without reaching for a mouse.
- **SC-006**: 100% of static UI strings are translated for both Arabic and English; 0 untranslated strings detected by automated extraction.
- **SC-007**: 90% of test users find a known course or lecture using the global search within 10 seconds.
- **SC-008**: 90% of test users locate the notification center on first attempt; mean time to find an unread grade is under 30 seconds.
- **SC-009**: Bug reports tagged "navigation" or "I don't know where I am" decrease by at least 60% relative to the audit baseline within the first month after launch.
- **SC-010**: 100% of in-scope pages render correctly across {light, dark} × {ar, en} without contrast failures, text clipping, or mirror bugs.
- **SC-011**: 100% of motion respects `prefers-reduced-motion: reduce` (no transition exceeds 80ms when reduced motion is requested).
- **SC-012**: Visitors who interact with the Oasis demo on the landing page convert to "Start free" sign-up clicks at a rate at least 25% higher than visitors who do not, in A/B comparison.
- **SC-013**: Mean cold-start time observed by visitors drops from 30–60 seconds (audit baseline) to under 5 seconds.
- **SC-014**: System sustains 2,000 concurrent active users without latency or error-rate regression beyond SC-002 and SC-013 thresholds, and absorbs a 5,000 concurrent-user burst peak (e.g., simultaneous exam start across multiple faculties) without dropping requests or producing user-visible errors above 1%.

## Assumptions

1. The student MVP flow (US1) targets students first; professor and administrator tools beyond grade entry are deferred to a follow-on feature.
2. Authentication is greenfield — Madarek does not currently have a working login flow, so v1 ships email + password managed entirely by Madarek (per Clarification 1). University SSO/SAML is out of scope for this feature.
3. File submission size and type limits are configurable per assignment by professors; sensible defaults (e.g., 50 MB per file, common document and code formats) are applied when not configured.
4. Notification delivery latency is "soft real-time" (target ≤30s) using whatever transport the platform already runs; no hard real-time SLA is required for v1.
5. The motion identity, type roles, chart palette, and decorative motion are sourced from `001-premium-motion-system`, `002-visual-uplift`, and `003-motion-graphics-layer` and are not redesigned in this feature.
6. Dark theme is a tone-shifted version of the existing cream/gold identity, not a separate brand.
7. English UI is a translation layer; the underlying data and content remain authoritative in their original language.
8. Hosting is upgraded or migrated as needed to deliver SC-002 and SC-013; the specific provider choice (Render paid, Vercel, university infrastructure) is a planning-phase decision and does not change the user-facing requirements here.
9. The 26-faculty grid and any other content catalogs continue to use the responsive strategy already defined in `004-colleges-gallery`.
10. The Oasis interactive demo on the landing page is constrained to a small set of pre-programmed sample exchanges and a tightly bounded free-form prompt path; full Oasis capability remains gated to authenticated sessions.

## Out of Scope

The following items appear in the audit but are explicitly **out of scope** for this feature and tracked as future work:

1. Discussion forums per course and per lecture (substantial standalone feature: data model, moderation, real-time updates).
2. Native mobile apps (React Native or Flutter).
3. Live video integration (BigBlueButton, Zoom).
4. Virtual labs (Cisco, Arduino, AR/VR).
5. Plagiarism + AI-generated content detection.
6. Verified certificate generation system.
7. Quality-assurance portal and institutional reporting tools.
8. Achievements & badges gamification system.
9. Content partnerships and external course catalog ingestion.
10. Blog / news section.
11. Languages beyond Arabic and English in v1 of i18n.
12. Email-digest delivery for notifications (preference UI controls ship in v1 but are disabled; the actual email channel is deferred per Clarification 2).

## Dependencies

1. `001-premium-motion-system` — motion + interaction tokens, identity profiles. Used by US8 for all motion budgets.
2. `002-visual-uplift` — type roles, chart palette, icon discipline. Used across the platform shell and dark-mode translation.
3. `003-motion-graphics-layer` — decorative motion (spec only at audit time). Used opportunistically by US8 where appropriate.
4. `004-colleges-gallery` — discoverable colleges surface; authenticated course list (US1) is a sibling, not a replacement, and the public colleges surface continues to power discovery.
5. The audit report itself: `madarek_audit_report00.md` (committed at the project root).
